'use client';

import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// 'quill' es una dependencia transitiva de react-quill (no hoisteada por
// pnpm bajo apps/web), así que no se puede importar su tipo `Sources`
// directamente — se replica acá (son los 3 valores fijos que Quill emite).
type QuillChangeSource = 'user' | 'api' | 'silent';

export interface QuillEditorHandle {
  getSelection(focus?: boolean): { index: number; length: number } | null;
  getLength(): number;
  insertText(index: number, text: string, source?: string): void;
  setSelection(index: number, length: number, source?: string): void;
}

/**
 * `next/dynamic` (ver template-body-editor.tsx) no reenvía `ref` — su
 * `LoadableComponent` es una función plana, así que `ref={...}` puesto
 * directo sobre el resultado de `dynamic()` nunca llega a `ReactQuill`
 * (confirmado leyendo next/dist/shared/lib/lazy-dynamic/loadable.js). Este
 * archivo es lo que se carga dinámicamente: acá el `ref` va directo sobre
 * `ReactQuill` (un componente de clase real, sin problema), y se expone la
 * instancia real de Quill hacia afuera vía el prop `onReady`, que sí viaja
 * sin problemas a través de `next/dynamic`.
 */
export default function QuillEditorLazy({
  value,
  onChange,
  onReady,
  modules,
}: {
  value: string;
  onChange: (html: string) => void;
  onReady: (editor: QuillEditorHandle) => void;
  modules: Record<string, unknown>;
}) {
  return (
    <ReactQuill
      ref={(instance) => {
        if (instance) onReady(instance.getEditor());
      }}
      theme="snow"
      modules={modules}
      value={value}
      onChange={(content, _delta, source: QuillChangeSource) => {
        // Al montar (o al recibir un `value` externo con markup que no
        // puede representar, ej. tablas) Quill re-normaliza el HTML a su
        // propio modelo y dispara este onChange con source 'api', no
        // 'user'. Propagar ese valor pisaría el HTML original con la
        // versión "achatada" sin que el usuario haya tocado nada.
        if (source === 'user') onChange(content);
      }}
    />
  );
}
