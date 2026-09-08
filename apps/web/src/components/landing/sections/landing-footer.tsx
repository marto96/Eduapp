import { Logo } from '../shared/logo';

export function LandingFooter() {
  return (
    <footer className="border-t border-[#e2e5f0] bg-white">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-8 px-5 py-11 sm:flex-row sm:px-8">
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Logo size={22} dot={7} radius={6} />
          <span className="text-sm font-semibold">Skolaria</span>
          <span className="ml-2 text-[13px] text-[#868ba3]">Gestión educativa integral · Bogotá, Colombia</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <a href="#modulos" className="text-[13px] text-[#6c7189]">
            Módulos
          </a>
          <a href="#seguridad" className="text-[13px] text-[#6c7189]">
            Tratamiento de datos
          </a>
          <a href="#demo" className="text-[13px] text-[#6c7189]">
            Contacto
          </a>
          <span className="text-[13px] text-[#a2a7bd]">
            © 2026{' '}
            <a
              href="/modelo-2027"
              target="_blank"
              rel="noopener noreferrer"
              aria-hidden="true"
              tabIndex={-1}
              className="select-none text-white no-underline hover:text-white"
            >
              .
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
