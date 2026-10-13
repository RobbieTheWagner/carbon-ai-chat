/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Tiptap plain-text-paste extension. Intercepts paste/drop events,
 * extracts plain text, and inserts it as paragraph nodes split on
 * newlines. Schema-agnostic — only requires `paragraph` and `text`
 * nodes.
 */

import { Extension } from '@tiptap/core';
import { Fragment, Slice, type Schema } from '@tiptap/pm/model';
import { Plugin } from '@tiptap/pm/state';

/**
 * Builds a slice of one paragraph per line, open on both ends so the first
 * line joins the paragraph before the cursor and the last line joins the
 * text after it. A closed list of paragraphs would instead be placed beside
 * the cursor's paragraph, leaving an empty line above text pasted into an
 * empty editor and splitting existing text around inline pastes.
 */
function textToSlice(schema: Schema, text: string): Slice {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const paragraphs = lines.map((line) =>
    schema.nodes.paragraph.create(
      null,
      line.length === 0 ? null : schema.text(line)
    )
  );
  return new Slice(Fragment.from(paragraphs), 1, 1);
}

function createPastePlugin(): Plugin {
  return new Plugin({
    props: {
      handlePaste(view, event, _slice) {
        const text = event.clipboardData?.getData('text/plain');
        if (text == null) {
          return false;
        }

        const tr = view.state.tr.replaceSelection(
          textToSlice(view.state.schema, text)
        );
        view.dispatch(tr.scrollIntoView());
        return true;
      },

      handleDrop(view, event, _slice, moved) {
        // Allow internal drag-and-drop (moved content within the editor)
        if (moved) {
          return false;
        }

        // Block external drops to prevent rich content
        const text = event.dataTransfer?.getData('text/plain');
        if (!text) {
          return true; // block the drop
        }

        const pos = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });
        if (!pos) {
          return true;
        }

        const tr = view.state.tr.replace(
          pos.pos,
          pos.pos,
          textToSlice(view.state.schema, text)
        );
        view.dispatch(tr.scrollIntoView());
        event.preventDefault();
        return true;
      },
    },
  });
}

export const PlainTextPaste = Extension.create({
  name: 'carbonPlainTextPaste',

  addProseMirrorPlugins() {
    return [createPastePlugin()];
  },
});
