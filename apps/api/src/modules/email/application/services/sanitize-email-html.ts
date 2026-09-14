import sanitizeHtml from 'sanitize-html';

const ALLOWED_STYLE_PROPERTIES = [
  'color',
  'background-color',
  'font-size',
  'font-weight',
  'text-align',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'border',
  'border-radius',
];

/**
 * Perfil "email-safe": suficiente para plantillas transaccionales (texto,
 * listas, links, tablas, imágenes, estilos inline básicos) sin abrir
 * <script>/<iframe>/<form> ni atributos `on*`/`javascript:` — riesgos que
 * no tienen ningún caso de uso legítimo en un cuerpo de email.
 */
export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 's',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'hr',
      'ul', 'ol', 'li', 'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'style'],
      img: ['src', 'alt', 'width', 'height', 'style'],
      '*': ['style'],
    },
    allowedStyles: {
      '*': Object.fromEntries(
        ALLOWED_STYLE_PROPERTIES.map((prop) => [prop, [/^[\w\s#%.,()-]+$/]]),
      ),
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}
