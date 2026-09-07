'use client';

import dynamic from 'next/dynamic';
import { useRef } from 'react';
import type { QuillEditorHandle } from './quill-editor-lazy';

const QuillEditorLazy = dynamic(() => import('./quill-editor-lazy'), { ssr: false });

const QUILL_MODULES = {
  toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link'], ['clean']],
};

export function TemplateBodyEditor({
  value,
  onChange,
  placeholders,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholders: string[];
}) {
  const editorRef = useRef<QuillEditorHandle | null>(null);

  const insertPlaceholder = (placeholder: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const cursor = editor.getSelection(true);
    const index = cursor ? cursor.index : editor.getLength();
    editor.insertText(index, placeholder, 'user');
    editor.setSelection(index + placeholder.length, 0);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {placeholders.map((placeholder) => (
          <button
            key={placeholder}
            type="button"
            onClick={() => insertPlaceholder(placeholder)}
            className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {placeholder}
          </button>
        ))}
      </div>
      <QuillEditorLazy
        value={value}
        onChange={onChange}
        modules={QUILL_MODULES}
        onReady={(editor) => {
          editorRef.current = editor;
        }}
      />
    </div>
  );
}
