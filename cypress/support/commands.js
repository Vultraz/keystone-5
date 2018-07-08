// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })
const gql = require('graphql-tag');
const { createApolloFetch } = require('apollo-fetch');
const memoize = require('fast-memoize');

const getApollo = memoize(function createApollo(uri) {
  return createApolloFetch({ uri });
});

/**
 * Uploads a file to an input
 * @memberOf Cypress.Chainable#
 * @name upload_file
 * @function
 * @param {String} selector - element to target
 * @param {String} fileUrl - The file url to upload
 * @param {String} type - content type of the uploaded file
 *
 * Adapted from https://github.com/cypress-io/cypress/issues/170#issuecomment-389837191
 *
 * Usage:
 * // Dynamically create a file, or save one into the fixtures folder, your call
 * cy.writeFile('cypress/fixtures/notice.pdf', 'Hi, this content is created by cypress!')
 * cy.upload_file('input[name=file1]', 'notice.pdf')
 */
Cypress.Commands.add('upload_file', (selector, fileUrl, type = '') =>
  cy.get(selector).then(subject =>
    cy.window().then(appWindow =>
      cy
        .fixture(fileUrl, 'base64')
        .then(Cypress.Blob.base64StringToBlob)
        .then(blob => {
          const el = subject[0];
          const nameSegments = fileUrl.split('/');
          const name = nameSegments[nameSegments.length - 1];
          // `File` is different from appWindow.File (the one in the app's iframe).
          // Need to access the application's instance of `File` so the types match elsewhere.
          const testFile = new appWindow.File([blob], name, { type });
          const dataTransfer = new appWindow.DataTransfer();
          dataTransfer.items.add(testFile);
          el.files = dataTransfer.files;
          subject.trigger('change');
          return subject;
        })
    )
  )
);

Cypress.Commands.add('graphql_query', (uri, queryString) => {
  // Convert the string to an ast
  const query = gql(queryString);

  // Then pass it through to the window context for execution.
  // Why execute it from the window context? Because that's where the cookies,
  // etc, are.
  // Why not read the cookies, and execute it from within the test? Because
  // the cookies are HTTP-only, so they're not accessible via JavaScript.
  return cy.window()
    .then(win =>
      // NOTE: __APOLLO_CLIENT__ is only available in dev mode
      // (process.env.NODE_ENV !== 'production'), so this may error at some
      // point. If so, we need another way of attaching a global graphql query
      // lib to the window from within the app for testing.
      // eslint-disable-next-line no-underscore-dangle
      win.__APOLLO_CLIENT__.query({ query })
        .then(result => {
          console.log('Fetched data:', result);
          return result;
        }).catch(error => {
          console.error('Query error:', error);
          if (error.graphQLErrors) {
            return { errors: error.graphQLErrors };
          } else {
            return { errors: [error] };
          }
        })
    );
});

Cypress.Commands.add('loginToKeystone', (email, password, PORT) => {
  cy.visit(`http://localhost:${PORT}/admin`);

  cy
    .get('input[name="username"]')
    .clear({ force: true })
    .type(email, { force: true });

  cy
    .get('[name="password"]')
    .clear({ force: true })
    .type(password, { force: true });

  cy.get('button[type="submit"]').click();
});
