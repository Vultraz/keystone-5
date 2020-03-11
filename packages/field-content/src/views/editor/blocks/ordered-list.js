import * as React from 'react';
import { ToolbarButton } from '../toolbar-components';
import { hasAncestorBlock, hasBlock } from '../utils';
import * as listItem from './list-item';
import { type as defaultType } from './paragraph';
import { ListOrderedIcon } from '@arch-ui/icons';
import { Transforms, Element, Node as SlateNode } from 'slate';

// duplicated logic for now, make some of this functionality happen in the schema instead soon
const handleListButtonClick = (editor, editorState, type) => {
  const isListItem = hasBlock(editorState, listItem.type);
  const isOrderedList = hasAncestorBlock(editorState, type);

  const otherListType = type === 'ordered-list' ? 'unordered-list' : 'ordered-list';

  if (isListItem && isOrderedList) {
    editor.setBlocks(defaultType);
    editor.unwrapBlock(type);
  } else if (isListItem) {
    editor.unwrapBlock(otherListType);
    editor.wrapBlock(type);
  } else {
    editor.setBlocks(listItem.type).wrapBlock(type);
  }
  editor.focus();
};

export const type = 'ordered-list';

export function ToolbarElement({ editor, editorState }) {
  return (
    <ToolbarButton
      label="Ordered List"
      icon={<ListOrderedIcon />}
      isActive={hasAncestorBlock(editorState, type)}
      onClick={() => {
        handleListButtonClick(editor, editorState, type);
      }}
    />
  );
}

export function Node({ attributes, children }) {
  return <ol {...attributes}>{children}</ol>;
}

export const getPlugins = () => [
  {
    onKeyDown(event, editor, next) {
      // make it so when you press enter in an empty list item,
      // the block type will change to a paragraph
      if (
        event.keyCode === 13 &&
        hasAncestorBlock(editor.value, type) &&
        editor.value.focusText.text === ''
      ) {
        editor.setBlocks(defaultType).unwrapBlock(type);
        return;
      }
      next();
    },
  },
];

export const getSchema = () => ({
  nodes: [
    {
      match: { type: listItem.type },
      min: 0,
    },
  ],
  normalize(editor, error) {
    switch (error.code) {
      case 'child_type_invalid': {
        editor.unwrapBlockByKey(error.node.key, type);
        return;
      }
    }
  },
});

const withOrderedListPlugin = editor => {
  const { normalizeNode } = editor;

  editor.normalizeNode = entry => {
    const [node, path] = entry;

    if (Element.isElement(node) && node.type === type) {
      for(const [child, childPath] of SlateNode.children(editor, path)) {
        if (child.type !== listItem.type) {
          // TODO: ensure works as expected
          Transforms.unwrapNodes(editor, { at: childPath });
          return;
        }
      }
    }

    normalizeNode(entry);
  };

  return editor;
};

export const getPluginsNew = () => [withOrderedListPlugin];
