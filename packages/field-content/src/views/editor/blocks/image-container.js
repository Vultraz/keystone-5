/** @jsx jsx */
import { jsx } from '@emotion/core';
import { useMemo } from 'react';
import insertImages from 'slate-drop-or-paste-images';
import imageExtensions from 'image-extensions';
import { findNode } from 'slate-react';
import { Block } from 'slate';
import { BlockMenuItem } from '../block-menu-item';

export const type = 'image-container';

const getFiles = () =>
  new Promise(resolve => {
    let input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => resolve([...input.files]);
    input.click();
  });

const insertImageBlockFromFile = (blocks, editor, file) => {
  const reader = new FileReader();
  reader.onload = event => insertImageBlock(blocks, editor, file, event.target.result);
  reader.readAsDataURL(file);
};

const insertImageBlock = (blocks, editor, file, src) => {
  editor.insertBlock({
    type,
    nodes: [
      Block.create({
        type: blocks.image.type,
        data: { file, src },
      }),
    ],
  });
};

export function Sidebar({ blocks, editor }) {
  const icon = (
    <svg width={16} height={16} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
      <path d="M480 416v16c0 26.51-21.49 48-48 48H48c-26.51 0-48-21.49-48-48V176c0-26.51 21.49-48 48-48h16v208c0 44.112 35.888 80 80 80h336zm96-80V80c0-26.51-21.49-48-48-48H144c-26.51 0-48 21.49-48 48v256c0 26.51 21.49 48 48 48h384c26.51 0 48-21.49 48-48zM256 128c0 26.51-21.49 48-48 48s-48-21.49-48-48 21.49-48 48-48 48 21.49 48 48zm-96 144l55.515-55.515c4.686-4.686 12.284-4.686 16.971 0L272 256l135.515-135.515c4.686-4.686 12.284-4.686 16.971 0L512 208v112H160v-48z" />
    </svg>
  );
  return (
    <BlockMenuItem
      icon={icon}
      text="Insert Image"
      insertBlock={() => {
        getFiles().then(files => {
          files.forEach(file => insertImageBlockFromFile(blocks, editor, file));
        });
      }}
    />
  );
}

function getImageStyle(alignment) {
  if (alignment === 'left') {
    return {
      float: 'left',
      marginRight: '10px',
      width: '50%',
    };
  } else if (alignment === 'right') {
    return {
      float: 'right',
      marginLeft: '10px',
      width: '50%',
    };
  } else {
    return {
      display: 'block',
      margin: '0px auto',
      width: '100%',
    };
  }
}

export function Node({ attributes, children, editor, blocks, node }) {
  const alignment = node.data.get('alignment');
  return (
    <figure
      css={{ display: 'flex', flexDirection: 'column', ...getImageStyle(alignment) }}
      {...attributes}
    >
      <blocks.image.ImageAlignmentContext.Provider
        value={useMemo(() => {
          return {
            alignment,
            onAlignmentChange(newAlignment) {
              editor.setNodeByKey(node.key, {
                data: node.data.set('alignment', newAlignment),
              });
            },
          };
        }, [node.key, alignment, editor, node.data])}
      >
        {children}
      </blocks.image.ImageAlignmentContext.Provider>
    </figure>
  );
}

export let getSchema = ({ blocks: { image, caption } }) => ({
  nodes: [
    {
      match: [{ type: image.type }],
      min: 1,
      max: 1,
    },
    {
      match: [{ type: caption.type }],
      min: 1,
      max: 1,
    },
  ],
  normalize(editor, error) {
    switch (error.code) {
      case 'child_min_invalid': {
        if (error.index === 0) {
          // the image has been deleted so we also want to delete the image-container
          editor.removeNodeByKey(error.node.key);
        }
        if (error.index === 1) {
          // the caption has been deleted
          // the user probably doesn't want to delete the image
          // they probably just wanted to remove everything in the caption
          // so the caption gets removed,  we insert another caption
          editor.insertNodeByKey(error.node.key, 1, Block.create('caption'));
        }
        return;
      }
      case 'node_data_invalid': {
        if (error.key === 'alignment') {
          editor.setNodeByKey(error.node.key, {
            data: error.node.data.set('alignment', 'center'),
          });
        }
        return;
      }
    }
    console.log(error);
  },
  data: {
    alignment(value) {
      switch (value) {
        case 'center':
        case 'left':
        case 'right': {
          return true;
        }
      }
      return false;
    },
  },
});

export const getPlugins = ({ blocks }) => [
  insertImages({
    extensions: imageExtensions,
    insertImage: insertImageBlockFromFile.bind(null, blocks),
  }),
  {
    onDragStart(event, editor, next) {
      const { value } = editor;
      const { document } = value;
      const node = findNode(event.target, editor);
      if (node.type === blocks.image.type) {
        const ancestors = document.getAncestors(node.key);
        let imgContainer = ancestors.get(ancestors.size - 1);
        if (imgContainer.type === type) {
          editor.moveToRangeOfNode(imgContainer);
        }
      }

      next();
    },
  },
];
