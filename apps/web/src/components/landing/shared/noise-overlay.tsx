/**
 * Textura de grano fija sobre toda la página — el detalle que hace que un
 * fondo plano se sienta "editorial premium" en vez de un degradado de CSS
 * genérico. SVG inline (sin pedir un archivo de imagen), muy baja opacidad,
 * `mix-blend-mode: overlay` para que se funda con lo que haya debajo, claro
 * u oscuro. `pointer-events-none` + `fixed` para no interferir con nada.
 */
export function NoiseOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] opacity-[0.05] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}
