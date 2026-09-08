import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

let registered = false;

/**
 * Registra los plugins de GSAP una sola vez por sesión de página. Se llama
 * desde cada sección (idempotente) en vez de un único punto de entrada
 * global, porque las secciones son componentes cliente independientes y no
 * hay un layout compartido que garantice el orden de montaje.
 */
export function ensureGsapRegistered() {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger, useGSAP);
  registered = true;
}

export { gsap, ScrollTrigger, useGSAP };
