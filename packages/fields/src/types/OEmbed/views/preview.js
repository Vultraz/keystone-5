/** @jsx jsx */

import { jsx } from '@emotion/core';
import * as React from 'react';

const Preview = ({ data, ...props }) => {
  if (!data) {
    return null;
  }

  const titleDisplay =
    data.title || (data.author && data.author.name) || (data.provider && data.provider.name);

  return (
    <div css={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }} {...props}>
      <div
        css={{ minWidth: '100px', marginRight: '0.8em' }}
        dangerouslySetInnerHTML={{ __html: data.html }}
      />
      <div css={{ display: 'flex', flexDirection: 'column', whiteSpace: 'nowrap', overflow: 'hidden' }}>
        <span>{titleDisplay}</span>
        <a href={data.originalUrl} target="_blank">
          {data.originalUrl}
        </a>
      </div>
    </div>
  );
};

export default Preview;
