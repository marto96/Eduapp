'use client';

import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import type { QuillEditorHandle } from './quill-editor-lazy';
import { cn } from '@/lib/utils';

const QuillEditorLazy = dynamic(() => import('./quill-editor-lazy'), { ssr: false });

const QUILL_MODULES = {
  toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link'], ['clean']],
};

type EditorMode = 'visual' | 'html';

const MODE_LABELS: Record<EditorMode, string> = {
  visual: 'Editor visual',
  html: 'HTML crudo',
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
  const [mode, setMode] = useState<EditorMode>('visual');
  const editorRef = useRef<QuillEditorHandle | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const insertPlaceholder = (placeholder: string) => {
    if (mode === 'visual') {
      const editor = editorRef.current;
      if (!editor) return;
      const cursor = editor.getSelection(true);
      const index = cursor ? cursor.index : editor.getLength();
      editor.insertText(index, placeholder, 'user');
      editor.setSelection(index + placeholder.length, 0);
      return;
    }
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + placeholder + value.slice(end));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          {(Object.keys(MODE_LABELS) as EditorMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'rounded px-2 py-1 text-xs font-medium transition-colors',
                mode === m
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>
      {mode === 'visual' ? (
        <QuillEditorLazy
          value={value}
          onChange={onChange}
          modules={QUILL_MODULES}
          onReady={(editor) => {
            editorRef.current = editor;
          }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={12}
          spellCheck={false}
          className="w-full rounded border border-border bg-background p-3 font-mono text-xs outline-none focus:border-primary"
        />
      )}
    </div>
  );
}
