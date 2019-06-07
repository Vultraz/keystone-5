/** @jsx jsx */

import { jsx } from '@emotion/core';
import { Component } from 'react';

import { FieldContainer, FieldLabel, FieldInput } from '@arch-ui/fields';
import { Input } from '@arch-ui/input';
import { ShieldIcon } from '@arch-ui/icons';
import { borderRadius, colors, gridSize } from '@arch-ui/theme';

import Preview from './preview';

export default class UrlField extends Component {
  onChange = event => {
    this.props.onChange(event.target.value);
  };
  render() {
    const { autoFocus, field, value: serverValue, error } = this.props;
    const value = serverValue && serverValue.originalUrl || '';
    const htmlID = `ks-input-${field.path}`;
    const canRead = !(error instanceof Error && error.name === 'AccessDeniedError');

    return (
      <FieldContainer>
        <FieldLabel
          htmlFor={htmlID}
          css={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          {field.label}{' '}
          {!canRead ? (
            <ShieldIcon title={error.message} css={{ color: colors.N20, marginRight: '1em' }} />
          ) : null}
        </FieldLabel>
        <FieldInput>
          <Input
            autoComplete="off"
            autoFocus={autoFocus}
            type="url"
            value={canRead ? value : undefined}
            placeholder={canRead ? undefined : error.message}
            onChange={this.onChange}
            id={htmlID}
          />
        </FieldInput>
        { serverValue && (
            <Preview data={serverValue}
    css={{
      backgroundColor: 'white',
      borderRadius,
      border: `1px solid ${colors.N20}`,
      marginTop: gridSize,
      padding: 4,
      width: 410, // 300px image + chrome
      boxSizing: 'border-box',
    }}
  />
        )}
      </FieldContainer>
    );
  }
}
