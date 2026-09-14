import { sanitizeEmailHtml } from './sanitize-email-html';

describe('sanitizeEmailHtml', () => {
  it('conserva formato básico de texto y links', () => {
    const html = '<p>Hola <b>mundo</b>, <i>bienvenido</i></p><a href="https://eduapp.co">link</a>';
    expect(sanitizeEmailHtml(html)).toBe(html);
  });

  it('conserva tablas', () => {
    const html = '<table><tr><td>Celda</td></tr></table>';
    expect(sanitizeEmailHtml(html)).toBe(html);
  });

  it('conserva imágenes con src/alt/width/height', () => {
    const html = '<img src="https://eduapp.co/logo.png" alt="Logo" width="100" height="50">';
    // sanitize-html normaliza tags autocontenidos a la forma "<img ... />".
    expect(sanitizeEmailHtml(html)).toBe(
      '<img src="https://eduapp.co/logo.png" alt="Logo" width="100" height="50" />',
    );
  });

  it('conserva estilos inline seguros', () => {
    const html = '<span style="color:red;font-size:14px;text-align:center">Texto</span>';
    expect(sanitizeEmailHtml(html)).toBe(html);
  });

  it('elimina <script>', () => {
    expect(sanitizeEmailHtml('<p>Hola</p><script>alert(1)</script>')).toBe('<p>Hola</p>');
  });

  it('elimina <iframe>', () => {
    expect(sanitizeEmailHtml('<iframe src="https://evil.com"></iframe><p>Hola</p>')).toBe('<p>Hola</p>');
  });

  it('elimina atributos on* (event handlers)', () => {
    expect(sanitizeEmailHtml('<img src="x.png" onerror="alert(1)">')).toBe('<img src="x.png" />');
  });

  it('elimina hrefs javascript:', () => {
    expect(sanitizeEmailHtml('<a href="javascript:alert(1)">click</a>')).toBe('<a>click</a>');
  });

  it('elimina <form>', () => {
    expect(sanitizeEmailHtml('<form action="/x"><input></form><p>Hola</p>')).toBe('<p>Hola</p>');
  });
});
