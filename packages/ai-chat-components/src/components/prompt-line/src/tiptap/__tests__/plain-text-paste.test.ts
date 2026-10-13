/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from '@open-wc/testing';
import { Editor } from '@tiptap/core';
import DocumentNode from '@tiptap/extension-document';
import ParagraphNode from '@tiptap/extension-paragraph';
import TextNode from '@tiptap/extension-text';

import { PlainTextPaste } from '../plain-text-paste.js';

function makeEditor(content = '') {
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const editor = new Editor({
    element: mount,
    extensions: [DocumentNode, ParagraphNode, TextNode, PlainTextPaste],
    content,
  });
  return {
    editor,
    cleanup: () => {
      editor.destroy();
      mount.remove();
    },
  };
}

function paste(editor: Editor, text: string) {
  const clipboardData = new DataTransfer();
  clipboardData.setData('text/plain', text);
  const event = new ClipboardEvent('paste', {
    clipboardData,
    bubbles: true,
    cancelable: true,
  });
  editor.view.dom.dispatchEvent(event);
}

function paragraphs(editor: Editor): string[] {
  const result: string[] = [];
  editor.state.doc.forEach((node) => result.push(node.textContent));
  return result;
}

describe('PlainTextPaste', () => {
  it('pastes into an empty editor without adding an empty line above', () => {
    const { editor, cleanup } = makeEditor();
    editor.commands.focus();
    paste(editor, 'hello');
    expect(paragraphs(editor)).to.deep.equal(['hello']);
    cleanup();
  });

  it('pastes inline at the cursor inside existing text', () => {
    const { editor, cleanup } = makeEditor('<p>abcd</p>');
    editor.commands.setTextSelection(3);
    paste(editor, 'XY');
    expect(paragraphs(editor)).to.deep.equal(['abXYcd']);
    cleanup();
  });

  it('splits multi-line text into paragraphs joined to the surrounding text', () => {
    const { editor, cleanup } = makeEditor('<p>abcd</p>');
    editor.commands.setTextSelection(3);
    paste(editor, 'one\r\n\ntwo');
    expect(paragraphs(editor)).to.deep.equal(['abone', '', 'twocd']);
    cleanup();
  });

  it('replaces the selected text', () => {
    const { editor, cleanup } = makeEditor('<p>abcd</p>');
    editor.commands.setTextSelection({ from: 2, to: 4 });
    paste(editor, 'Z');
    expect(paragraphs(editor)).to.deep.equal(['aZd']);
    cleanup();
  });
});
