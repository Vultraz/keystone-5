const { getType, pick, defaultObj, intersection } = require('@keystone-alpha/utils');

const validateGranularConfigTypes = (longHandAccess, validationError) => {
  const errors = Object.entries(longHandAccess)
    .map(([accessType, accessConfig]) => validationError(getType(accessConfig), accessType))
    .filter(error => error);

  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
};

const parseGranularAccessConfig = ({
  accessTypes,
  access,
  defaultAccess,
  onGranularParseError,
  validateGranularType,
}) => {
  const longHandAccess = pick(access, accessTypes);

  // An object was supplied, but it has the wrong keys (it's probably a
  // declarative access control config being used as a shorthand, which
  // isn't possible [due to `create` not supporting declarative config])
  if (Object.keys(longHandAccess).length === 0) {
    onGranularParseError();
  }
  // Construct an object with all keys
  const finalAccess = {
    ...defaultObj(accessTypes, defaultAccess),
    ...longHandAccess,
  };
  validateGranularConfigTypes(finalAccess, validateGranularType);

  return finalAccess;
};

const parseAccessCore = ({
  accessTypes,
  access,
  defaultAccess,
  onGranularParseError,
  validateGranularType,
}) => {
  const type = getType(access);
  switch (type) {
    case 'Boolean':
    case 'Function':
      return defaultObj(accessTypes, access);

    case 'Object':
      return parseGranularAccessConfig({
        accessTypes,
        access,
        defaultAccess,
        onGranularParseError,
        validateGranularType,
      });

    default:
      throw new Error(
        `Shorthand access must be specified as either a boolean or a function, received ${type}.`
      );
  }
};

const parseAccess = ({
  schemaNames,
  accessTypes,
  access,
  defaultAccess,
  onGranularParseError,
  validateGranularType,
}) => {
  // Check that none of the schemaNames match the accessTypes
  if (intersection(schemaNames, accessTypes).length > 0) {
    throw new Error(
      `${JSON.stringify(
        intersection(schemaNames, accessTypes)
      )} are reserved words and cannot be used as schema names.`
    );
  }

  const providedNameCount = intersection(Object.keys(access), schemaNames).length;
  const type = getType(access);
  if (type === 'Object' && providedNameCount === Object.keys(access).length) {
    // If all the keys are in schemaNames, parse each on their own
    return schemaNames.reduce(
      (acc, schemaName) => ({
        ...acc,
        [schemaName]: parseAccessCore({
          accessTypes,
          access: access.hasOwnProperty(schemaName) ? access[schemaName] : defaultAccess,
          defaultAccess,
          onGranularParseError,
          validateGranularType,
        }),
      }),
      {}
    );
  } else if (type === 'Object' && providedNameCount > 0) {
    // If some are in, and some are out, throw an error!
    throw new Error(
      `Invalid schema names: ${JSON.stringify(
        Object.keys(access).filter(k => !schemaNames.includes(k))
      )}`
    );
  } else {
    // Otherwise, treat it as common across all schemaNames
    const commonAccess = parseAccessCore({
      accessTypes,
      access,
      defaultAccess,
      onGranularParseError,
      validateGranularType,
    });
    return schemaNames.reduce((acc, schemaName) => ({ ...acc, [schemaName]: commonAccess }), {});
  }
};

module.exports = {
  parseListAccess({ listKey, defaultAccess, access = defaultAccess, schemaNames }) {
    const accessTypes = ['create', 'read', 'update', 'delete'];

    return parseAccess({
      schemaNames,
      accessTypes,
      access,
      defaultAccess,
      onGranularParseError: () => {
        throw new Error(
          `Must specify one of ${JSON.stringify(
            accessTypes
          )} access configs, but got ${JSON.stringify(
            Object.keys(access)
          )}. (Did you mean to specify a declarative access control config? This can be done on a granular basis only)`
        );
      },
      validateGranularType: (type, accessType) => {
        if (accessType === 'create') {
          if (!['Boolean', 'Function'].includes(type)) {
            return `Expected a Boolean, or Function for ${listKey}.access.${accessType}, but got ${type}. (NOTE: 'create' cannot have a Declarative access control config)`;
          }
        } else {
          if (!['Object', 'Boolean', 'Function'].includes(type)) {
            return `Expected a Boolean, Object, or Function for ${listKey}.access.${accessType}, but got ${type}`;
          }
        }
      },
    });
  },

  parseFieldAccess({ listKey, fieldKey, defaultAccess, access = defaultAccess, schemaNames }) {
    const accessTypes = ['create', 'read', 'update'];

    return parseAccess({
      schemaNames,
      accessTypes,
      access,
      defaultAccess,
      onGranularParseError: () => {
        throw new Error(
          `Must specify one of ${JSON.stringify(
            accessTypes
          )} access configs, but got ${JSON.stringify(
            Object.keys(access)
          )}. (Did you mean to specify a declarative access control config? This can be done on lists only)`
        );
      },
      validateGranularType: (type, accessType) => {
        if (!['Boolean', 'Function'].includes(type)) {
          return `Expected a Boolean or Function for ${listKey}.fields.${fieldKey}.access.${accessType}, but got ${type}. (NOTE: Fields cannot have declarative access control config)`;
        }
      },
    });
  },

  validateListAccessControl({ access, listKey, operation, authentication = {}, originalInput }) {
    // Either a boolean or an object describing a where clause
    let result;
    if (typeof access[operation] !== 'function') {
      result = access[operation];
    } else {
      result = access[operation]({
        authentication: authentication.item ? authentication : {},
        originalInput,
      });
    }

    const type = getType(result);

    if (!['Object', 'Boolean'].includes(type)) {
      throw new Error(
        `Must return an Object or Boolean from Imperative or Declarative access control function. Got ${type}`
      );
    }

    // Special case for 'create' permission
    if (operation === 'create' && type === 'Object') {
      throw new Error(
        `Expected a Boolean for ${listKey}.access.create(), but got Object. (NOTE: 'create' cannot have a Declarative access control config)`
      );
    }

    return result;
  },

  validateFieldAccessControl({
    access,
    listKey,
    fieldKey,
    originalInput,
    existingItem,
    operation,
    authentication = {},
  }) {
    let result;
    if (typeof access[operation] !== 'function') {
      result = access[operation];
    } else {
      result = access[operation]({
        authentication: authentication.item ? authentication : {},
        originalInput,
        existingItem,
      });
    }

    const type = getType(result);

    if (type !== 'Boolean') {
      throw new Error(
        `Must return a Boolean from ${listKey}.fields.${fieldKey}.access.${operation}(). Got ${type}`
      );
    }

    return result;
  },
};
