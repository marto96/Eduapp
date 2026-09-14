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
  html: 'HTML',
};

// Quill no tiene modelo de tabla: si el HTML la trae, la aplana a <p> y
// pierde toda la estructura/estilos de layout (ver template-body-editor.tsx
// del 2026-09-14). Detectarla acá evita ofrecer una pestaña que rompe el
// contenido apenas se monta.
const hasAdvancedHtml = (html: string) => /<table[\s>]/i.test(html);

export function TemplateBodyEditor({
  value,
  onChange,
  placeholders,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholders: string[];
}) {
  const [mode, setMode] = useState<EditorMode>(() => (hasAdvancedHtml(value) ? 'html' : 'visual'));
  const editorRef = useRef<QuillEditorHandle | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // No solo el estado inicial: si el usuario escribe una tabla a mano en
  // modo HTML, la pestaña visual debe quedar bloqueada de inmediato, sin
  // esperar a que la reabra.
  const isAdvanced = hasAdvancedHtml(value);
  const effectiveMode: EditorMode = isAdvanced ? 'html' : mode;

  const insertPlaceholder = (placeholder: string) => {
    if (effectiveMode === 'visual') {
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
          {(Object.keys(MODE_LABELS) as EditorMode[]).map((m) => {
            const disabled = m === 'visual' && isAdvanced;
            return (
              <button
                key={m}
                type="button"
                disabled={disabled}
                onClick={() => setMode(m)}
                title={disabled ? 'Esta plantilla usa HTML avanzado (tablas): el editor visual no lo soporta' : undefined}
                className={cn(
                  'rounded px-2 py-1 text-xs font-medium transition-colors',
                  disabled
                    ? 'cursor-not-allowed text-muted-foreground/50'
                    : effectiveMode === m
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {MODE_LABELS[m]}
              </button>
            );
          })}
        </div>
      </div>
      {isAdvanced && (
        <p className="text-xs text-muted-foreground">
          Esta plantilla usa HTML avanzado (tablas) para el diseño del correo — el editor visual lo aplanaría y
          perdería el formato, así que solo se puede editar en modo HTML.
        </p>
      )}
      {effectiveMode === 'visual' ? (
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
