'use client';

import { useEffect } from 'react';

/**
 * Calculadora interna de proyección financiera por colegio (ingresos,
 * costos, margen). Vive en una ruta sin enlace visible — ver el punto de
 * entrada oculto en el footer de `landing-page.tsx` — no está pensada para
 * visitantes del sitio, solo para uso interno/comercial.
 */
export function FinancialModelCalculator() {
  useEffect(() => {
    const ids = [
      'estudiantes', 'matricula', 'pension', 'pagos', 'precioSub', 'implementacion',
      'adopcionY1', 'adopcionRen', 'takeRate', 'comisionPasarela', 'infraUsd', 'tasaCambio',
      'colegiosInfra', 'csmMes', 'colegiosPorCsm', 'costoImpl',
    ];

    const el: Record<string, HTMLInputElement> = {};
    ids.forEach((id) => {
      el[id] = document.getElementById(id) as HTMLInputElement;
      el[id + 'R'] = document.getElementById(id + '-r') as HTMLInputElement;
    });
    const quienPasarela = document.getElementById('quienPasarela') as HTMLSelectElement;

    function fmt(n: number): string {
      const sign = n < 0 ? '-' : '';
      return sign + '$' + Math.round(Math.abs(n)).toLocaleString('es-CO');
    }
    function fmtPct(n: number): string {
      return n.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
    }
    function num(id: string): number {
      return parseFloat(el[id].value) || 0;
    }

    function flash(elem: HTMLElement) {
      elem.classList.remove('flash');
      void elem.offsetWidth;
      elem.classList.add('flash');
      setTimeout(() => elem.classList.remove('flash'), 500);
    }

    function setVal(id: string, text: string) {
      const target = document.getElementById(id) as HTMLElement;
      if (target.textContent !== text) {
        target.textContent = text;
        flash(target);
      }
    }

    function compute() {
      const estudiantes = num('estudiantes');
      const matricula = num('matricula');
      const pension = num('pension');
      const pagos = num('pagos');
      const precioSub = num('precioSub');
      const implementacion = num('implementacion');
      const adopcionY1 = num('adopcionY1') / 100;
      const adopcionRen = num('adopcionRen') / 100;
      const takeRate = num('takeRate') / 100;
      const comisionPasarela = num('comisionPasarela') / 100;
      const infraUsd = num('infraUsd');
      const tasaCambio = num('tasaCambio');
      const colegiosInfra = Math.max(1, num('colegiosInfra'));
      const csmMes = num('csmMes');
      const colegiosPorCsm = Math.max(1, num('colegiosPorCsm'));
      const costoImpl = num('costoImpl');
      const quien = quienPasarela.value;

      const volEstudiante = matricula + pension * pagos;
      const volTotal = estudiantes * volEstudiante;

      const ingSub = estudiantes * precioSub;
      const ingTakeY1 = volTotal * adopcionY1 * takeRate;
      const ingTakeRen = volTotal * adopcionRen * takeRate;
      const ingY1 = ingSub + implementacion + ingTakeY1;
      const ingRen = ingSub + ingTakeRen;

      const infraTotalPlataforma = infraUsd * 12 * tasaCambio;
      const costoInfra = infraTotalPlataforma / colegiosInfra;
      const costoSoporte = (csmMes * 12) / colegiosPorCsm;

      const pspY1 = quien === 'plataforma' ? volTotal * adopcionY1 * comisionPasarela : 0;
      const pspRen = quien === 'plataforma' ? volTotal * adopcionRen * comisionPasarela : 0;

      const costY1 = costoInfra + costoSoporte + costoImpl + pspY1;
      const costRen = costoInfra + costoSoporte + pspRen;

      const ganY1 = ingY1 - costY1;
      const ganRen = ingRen - costRen;
      const margY1 = ingY1 !== 0 ? (ganY1 / ingY1) * 100 : 0;
      const margRen = ingRen !== 0 ? (ganRen / ingRen) * 100 : 0;

      setVal('d-volEst', fmt(volEstudiante));
      setVal('d-volTotal', fmt(volTotal));

      setVal('r-subY1', fmt(ingSub));
      setVal('r-subRen', fmt(ingSub));
      setVal('r-implY1', fmt(implementacion));
      setVal('r-takeY1', fmt(ingTakeY1));
      setVal('r-takeRen', fmt(ingTakeRen));
      setVal('r-ingY1', fmt(ingY1));
      setVal('r-ingRen', fmt(ingRen));

      setVal('r-infraY1', fmt(costoInfra));
      setVal('r-infraRen', fmt(costoInfra));
      setVal('r-soporteY1', fmt(costoSoporte));
      setVal('r-soporteRen', fmt(costoSoporte));
      setVal('r-costoImplY1', fmt(costoImpl));
      setVal('r-pspY1', fmt(pspY1));
      setVal('r-pspRen', fmt(pspRen));
      setVal('r-costY1', fmt(costY1));
      setVal('r-costRen', fmt(costRen));

      setVal('r-ganY1', fmt(ganY1));
      setVal('r-ganRen', fmt(ganRen));
      setVal('r-margY1', fmtPct(margY1));
      setVal('r-margRen', fmtPct(margRen));

      const ganY1El = document.getElementById('r-ganY1') as HTMLElement;
      const ganRenEl = document.getElementById('r-ganRen') as HTMLElement;
      ganY1El.style.color = ganY1 < 0 ? 'var(--negative)' : 'var(--positive)';
      ganRenEl.style.color = ganRen < 0 ? 'var(--negative)' : 'var(--positive)';

      const pspNote = document.getElementById('pspNote') as HTMLElement;
      if (quien === 'plataforma') {
        pspNote.textContent =
          '⚠ La plataforma absorbe ' + fmtPct(comisionPasarela * 100) +
          ' de comisión sobre lo procesado — esto reduce directamente tu ganancia neta (ver fila "Comisión pasarela" abajo).';
        pspNote.classList.add('warn');
      } else if (quien === 'colegio') {
        pspNote.textContent = 'El colegio recibe menos neto de su matrícula/pensión — no afecta tu costo, pero es fricción de venta.';
        pspNote.classList.remove('warn');
      } else {
        pspNote.textContent = 'La familia ve un recargo visible al pagar en línea — ni el colegio ni tu margen se ven afectados.';
        pspNote.classList.remove('warn');
      }
    }

    function syncPair(id: string) {
      const onInput = () => {
        el[id + 'R'].value = el[id].value;
        compute();
      };
      const onRangeInput = () => {
        el[id].value = el[id + 'R'].value;
        compute();
      };
      el[id].addEventListener('input', onInput);
      el[id + 'R'].addEventListener('input', onRangeInput);
    }
    ids.forEach(syncPair);
    quienPasarela.addEventListener('change', compute);

    compute();
  }, []);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
      />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="fm-page">
        <header className="fm-masthead">
          <p className="fm-eyebrow">Modelo de negocio · EduApp</p>
          <h1>Proyección financiera por colegio</h1>
          <p className="fm-subtitle">
            Mueve cualquier supuesto — matrícula, pensión, adopción de pagos, costos de infraestructura — y el
            balance de ingresos, costos y ganancia se recalcula al instante. Cifras en pesos colombianos (COP).
          </p>
        </header>

        <div className="fm-workspace">
          <aside className="fm-controls" aria-label="Supuestos editables">
            <section className="fm-control-group">
              <h2>Colegio</h2>
              <div className="fm-field">
                <label htmlFor="estudiantes">Número de estudiantes</label>
                <div className="fm-field-row">
                  <input type="range" id="estudiantes-r" min="50" max="3000" step="10" defaultValue="500" />
                  <div className="fm-num-wrap">
                    <input type="number" id="estudiantes" min="1" defaultValue="500" />
                  </div>
                </div>
              </div>
              <div className="fm-field">
                <label htmlFor="matricula">Matrícula promedio / estudiante</label>
                <div className="fm-field-row">
                  <input type="range" id="matricula-r" min="100000" max="1200000" step="5000" defaultValue="411000" />
                  <div className="fm-num-wrap">
                    <span>$</span>
                    <input type="number" id="matricula" min="0" defaultValue="411000" />
                  </div>
                </div>
                <span className="fm-hint">Promedio jardín/sexto — incluye el ítem de plataforma</span>
              </div>
              <div className="fm-field">
                <label htmlFor="pension">Pensión promedio / mes</label>
                <div className="fm-field-row">
                  <input type="range" id="pension-r" min="100000" max="1200000" step="5000" defaultValue="369900" />
                  <div className="fm-num-wrap">
                    <span>$</span>
                    <input type="number" id="pension" min="0" defaultValue="369900" />
                  </div>
                </div>
              </div>
              <div className="fm-field">
                <label htmlFor="pagos">Pagos de pensión / año</label>
                <div className="fm-field-row">
                  <input type="range" id="pagos-r" min="1" max="12" step="1" defaultValue="10" />
                  <div className="fm-num-wrap">
                    <input type="number" id="pagos" min="1" max="12" defaultValue="10" />
                  </div>
                </div>
              </div>
            </section>

            <section className="fm-control-group">
              <h2>Suscripción</h2>
              <div className="fm-field">
                <label htmlFor="precioSub">Precio / estudiante / año</label>
                <div className="fm-field-row">
                  <input type="range" id="precioSub-r" min="10000" max="150000" step="1000" defaultValue="65000" />
                  <div className="fm-num-wrap">
                    <span>$</span>
                    <input type="number" id="precioSub" min="0" defaultValue="65000" />
                  </div>
                </div>
                <span className="fm-hint">Techo presupuestado por el colegio: $69.000</span>
              </div>
              <div className="fm-field">
                <label htmlFor="implementacion">Implementación (único, año 1)</label>
                <div className="fm-field-row">
                  <input type="range" id="implementacion-r" min="0" max="10000000" step="100000" defaultValue="3000000" />
                  <div className="fm-num-wrap">
                    <span>$</span>
                    <input type="number" id="implementacion" min="0" defaultValue="3000000" />
                  </div>
                </div>
              </div>
            </section>

            <section className="fm-control-group">
              <h2>Pagos en línea</h2>
              <div className="fm-field">
                <label htmlFor="adopcionY1">Adopción de pagos — año 1</label>
                <div className="fm-field-row">
                  <input type="range" id="adopcionY1-r" min="0" max="100" step="1" defaultValue="50" />
                  <div className="fm-num-wrap">
                    <input type="number" id="adopcionY1" min="0" max="100" defaultValue="50" />
                    <span style={{ padding: '0 .5rem 0 0' }}>%</span>
                  </div>
                </div>
              </div>
              <div className="fm-field">
                <label htmlFor="adopcionRen">Adopción de pagos — renovación</label>
                <div className="fm-field-row">
                  <input type="range" id="adopcionRen-r" min="0" max="100" step="1" defaultValue="75" />
                  <div className="fm-num-wrap">
                    <input type="number" id="adopcionRen" min="0" max="100" defaultValue="75" />
                    <span style={{ padding: '0 .5rem 0 0' }}>%</span>
                  </div>
                </div>
              </div>
              <div className="fm-field">
                <label htmlFor="takeRate">Take rate propio (sobre lo procesado)</label>
                <div className="fm-field-row">
                  <input type="range" id="takeRate-r" min="0" max="5" step="0.1" defaultValue="0.7" />
                  <div className="fm-num-wrap">
                    <input type="number" id="takeRate" min="0" max="20" step="0.1" defaultValue="0.7" />
                    <span style={{ padding: '0 .5rem 0 0' }}>%</span>
                  </div>
                </div>
              </div>
              <div className="fm-field">
                <label htmlFor="quienPasarela">¿Quién asume la comisión de la pasarela?</label>
                <select id="quienPasarela" defaultValue="familia">
                  <option value="familia">Familia (recargo visible)</option>
                  <option value="colegio">Colegio</option>
                  <option value="plataforma">Plataforma (nosotros)</option>
                </select>
              </div>
              <div className="fm-field">
                <label htmlFor="comisionPasarela">Comisión real de la pasarela</label>
                <div className="fm-field-row">
                  <input type="range" id="comisionPasarela-r" min="0" max="6" step="0.1" defaultValue="3" />
                  <div className="fm-num-wrap">
                    <input type="number" id="comisionPasarela" min="0" max="20" step="0.1" defaultValue="3" />
                    <span style={{ padding: '0 .5rem 0 0' }}>%</span>
                  </div>
                </div>
                <span className="fm-hint">Solo impacta tu costo si la asume la plataforma</span>
              </div>
              <p className="fm-psp-note" id="pspNote" />
            </section>

            <section className="fm-control-group">
              <h2>Costos operativos</h2>
              <div className="fm-field">
                <label htmlFor="infraUsd">Infraestructura — toda la plataforma</label>
                <div className="fm-field-row">
                  <input type="range" id="infraUsd-r" min="100" max="5000" step="50" defaultValue="500" />
                  <div className="fm-num-wrap">
                    <span>US$</span>
                    <input type="number" id="infraUsd" min="0" defaultValue="500" />
                  </div>
                </div>
                <span className="fm-hint">Por mes — Postgres, hosting, storage, notificaciones</span>
              </div>
              <div className="fm-field">
                <label htmlFor="tasaCambio">Tasa de cambio COP/USD</label>
                <div className="fm-field-row">
                  <input type="range" id="tasaCambio-r" min="3000" max="5500" step="50" defaultValue="4100" />
                  <div className="fm-num-wrap">
                    <span>$</span>
                    <input type="number" id="tasaCambio" min="0" defaultValue="4100" />
                  </div>
                </div>
              </div>
              <div className="fm-field">
                <label htmlFor="colegiosInfra">Colegios que comparten la infraestructura</label>
                <div className="fm-field-row">
                  <input type="range" id="colegiosInfra-r" min="1" max="200" step="1" defaultValue="10" />
                  <div className="fm-num-wrap">
                    <input type="number" id="colegiosInfra" min="1" defaultValue="10" />
                  </div>
                </div>
                <span className="fm-hint">El margen mejora con escala sin tocar precio</span>
              </div>
              <div className="fm-field">
                <label htmlFor="csmMes">Costo de soporte / CSM</label>
                <div className="fm-field-row">
                  <input type="range" id="csmMes-r" min="1000000" max="10000000" step="100000" defaultValue="4500000" />
                  <div className="fm-num-wrap">
                    <span>$</span>
                    <input type="number" id="csmMes" min="0" defaultValue="4500000" />
                  </div>
                </div>
                <span className="fm-hint">Por mes, cargado — se reparte entre colegios abajo</span>
              </div>
              <div className="fm-field">
                <label htmlFor="colegiosPorCsm">Colegios atendidos por CSM</label>
                <div className="fm-field-row">
                  <input type="range" id="colegiosPorCsm-r" min="1" max="100" step="1" defaultValue="40" />
                  <div className="fm-num-wrap">
                    <input type="number" id="colegiosPorCsm" min="1" defaultValue="40" />
                  </div>
                </div>
              </div>
              <div className="fm-field">
                <label htmlFor="costoImpl">Implementación — costo real (labor)</label>
                <div className="fm-field-row">
                  <input type="range" id="costoImpl-r" min="0" max="10000000" step="100000" defaultValue="2000000" />
                  <div className="fm-num-wrap">
                    <span>$</span>
                    <input type="number" id="costoImpl" min="0" defaultValue="2000000" />
                  </div>
                </div>
              </div>
            </section>
          </aside>

          <main className="fm-ledger-wrap">
            <div className="fm-derived">
              <div className="fm-stat">
                <span className="fm-k">Volumen anual / estudiante</span>
                <span className="fm-v" id="d-volEst">—</span>
              </div>
              <div className="fm-stat">
                <span className="fm-k">Volumen total del colegio</span>
                <span className="fm-v" id="d-volTotal">—</span>
              </div>
            </div>

            <div className="fm-ledger-scroll">
              <div className="fm-ledger">
                <div className="fm-ledger-header">
                  <span>&nbsp;</span>
                  <span className="fm-yr">
                    Año 1<small>2027</small>
                  </span>
                  <span className="fm-yr">
                    Renovación<small>2028+</small>
                  </span>
                </div>

                <div className="fm-ledger-section">
                  <h3>Ingresos</h3>
                  <div className="fm-row">
                    <span className="fm-label">Suscripción</span>
                    <span className="fm-val" id="r-subY1" />
                    <span className="fm-val" id="r-subRen" />
                  </div>
                  <div className="fm-row">
                    <span className="fm-label">Implementación</span>
                    <span className="fm-val" id="r-implY1" />
                    <span className="fm-val fm-dash" id="r-implRen">—</span>
                  </div>
                  <div className="fm-row">
                    <span className="fm-label">Take rate — pagos en línea</span>
                    <span className="fm-val" id="r-takeY1" />
                    <span className="fm-val" id="r-takeRen" />
                  </div>
                  <div className="fm-row fm-subtotal">
                    <span className="fm-label">Total ingresos</span>
                    <span className="fm-val" id="r-ingY1" />
                    <span className="fm-val" id="r-ingRen" />
                  </div>
                </div>

                <div className="fm-ledger-section">
                  <h3>Costos</h3>
                  <div className="fm-row">
                    <span className="fm-label">Infraestructura (asignada)</span>
                    <span className="fm-val" id="r-infraY1" />
                    <span className="fm-val" id="r-infraRen" />
                  </div>
                  <div className="fm-row">
                    <span className="fm-label">Soporte / CSM (asignado)</span>
                    <span className="fm-val" id="r-soporteY1" />
                    <span className="fm-val" id="r-soporteRen" />
                  </div>
                  <div className="fm-row">
                    <span className="fm-label">Implementación (labor)</span>
                    <span className="fm-val" id="r-costoImplY1" />
                    <span className="fm-val fm-dash" id="r-costoImplRen">—</span>
                  </div>
                  <div className="fm-row">
                    <span className="fm-label">Comisión pasarela</span>
                    <span className="fm-val" id="r-pspY1" />
                    <span className="fm-val" id="r-pspRen" />
                  </div>
                  <div className="fm-row fm-subtotal">
                    <span className="fm-label">Total costos</span>
                    <span className="fm-val" id="r-costY1" />
                    <span className="fm-val" id="r-costRen" />
                  </div>
                </div>

                <div className="fm-ledger-total">
                  <div className="fm-row fm-total">
                    <span className="fm-label">Ganancia neta</span>
                    <span className="fm-val" id="r-ganY1" />
                    <span className="fm-val" id="r-ganRen" />
                  </div>
                  <div className="fm-row fm-margin">
                    <span className="fm-label">Margen neto</span>
                    <span className="fm-val" id="r-margY1" />
                    <span className="fm-val" id="r-margRen" />
                  </div>
                </div>
              </div>
            </div>

            <footer className="fm-note">
              Modelo ilustrativo — cifras derivadas de la conversación sobre el colegio de referencia (500
              estudiantes, promedio jardín/sexto grado). Ajusta cualquier supuesto a la izquierda para ver el
              efecto en tiempo real.
            </footer>
          </main>
        </div>
      </div>
    </>
  );
}

const CSS = `
  .fm-page{
    --fm-bg:#f6f4ee; --fm-surface:#fffefb; --fm-surface-2:#efebe0;
    --fm-ink:#181a2b; --fm-ink-muted:#63667c; --fm-ink-faint:#9598a8;
    --fm-border:#ddd7c8; --fm-border-strong:#c9c1ac;
    --fm-accent:#a8761f; --fm-accent-soft:#f1e2c3;
    --positive:#2f6f4f; --negative:#a8442a; --negative-soft:#f5e4de;
    --shadow: 0 1px 2px rgba(24,26,43,.05), 0 8px 24px -12px rgba(24,26,43,.18);
    --font-display:'Fraunces', ui-serif, Georgia, serif;
    --font-body:'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif;
    --font-mono:'IBM Plex Mono', ui-monospace, 'SF Mono', monospace;
    background:var(--fm-bg); color:var(--fm-ink); font-family:var(--font-body);
    max-width:1180px; margin:0 auto; padding:2.75rem 1.5rem 4rem; min-height:100vh;
  }
  @media (prefers-color-scheme: dark){
    .fm-page{
      --fm-bg:#13141f; --fm-surface:#1b1c2c; --fm-surface-2:#232538;
      --fm-ink:#ece9de; --fm-ink-muted:#a2a4bc; --fm-ink-faint:#6d6f89;
      --fm-border:#33354d; --fm-border-strong:#454869;
      --fm-accent:#dcaa4f; --fm-accent-soft:#332a17;
      --positive:#59b98b; --negative:#e08064; --negative-soft:#3a2320;
      --shadow: 0 1px 2px rgba(0,0,0,.3), 0 12px 32px -14px rgba(0,0,0,.6);
    }
  }
  .fm-page *{box-sizing:border-box;}
  .fm-masthead{border-bottom:1px solid var(--fm-border-strong); padding-bottom:1.5rem; margin-bottom:2rem;}
  .fm-eyebrow{font-weight:600; font-size:.75rem; letter-spacing:.11em; text-transform:uppercase; color:var(--fm-accent); margin:0 0 .6rem;}
  .fm-masthead h1{font-family:var(--font-display); font-weight:600; font-size:clamp(1.7rem,3.4vw,2.5rem); line-height:1.12; margin:0 0 .6rem; text-wrap:balance; letter-spacing:-.01em;}
  .fm-subtitle{font-size:.95rem; color:var(--fm-ink-muted); max-width:52ch; line-height:1.55; margin:0;}
  .fm-workspace{display:grid; grid-template-columns:320px minmax(0,1fr); gap:2rem; align-items:start;}
  @media (max-width:900px){ .fm-workspace{grid-template-columns:1fr;} }
  .fm-controls{display:flex; flex-direction:column; gap:1.5rem; position:sticky; top:1.5rem;}
  @media (max-width:900px){ .fm-controls{position:static;} }
  .fm-control-group{background:var(--fm-surface); border:1px solid var(--fm-border); border-radius:10px; padding:1.15rem 1.25rem 1.35rem; box-shadow:var(--shadow);}
  .fm-control-group h2{font-weight:700; font-size:.7rem; letter-spacing:.1em; text-transform:uppercase; color:var(--fm-ink-faint); margin:0 0 1rem;}
  .fm-field{margin-bottom:1.05rem;}
  .fm-field:last-child{margin-bottom:0;}
  .fm-field label{display:block; font-size:.8125rem; color:var(--fm-ink); font-weight:500; margin-bottom:.4rem;}
  .fm-hint{display:block; font-size:.72rem; color:var(--fm-ink-faint); font-weight:400; margin-top:.2rem;}
  .fm-field-row{display:flex; align-items:center; gap:.65rem;}
  .fm-field-row input[type="range"]{flex:1; accent-color:var(--fm-accent); height:4px;}
  .fm-num-wrap{display:flex; align-items:center; flex-shrink:0; border:1px solid var(--fm-border-strong); border-radius:6px; background:var(--fm-surface-2); overflow:hidden;}
  .fm-num-wrap span{font-family:var(--font-mono); font-size:.75rem; color:var(--fm-ink-faint); padding:0 0 0 .45rem;}
  .fm-num-wrap input[type="number"]{width:5.4rem; font-family:var(--font-mono); font-size:.8125rem; font-variant-numeric:tabular-nums; text-align:right; border:none; background:transparent; color:var(--fm-ink); padding:.4rem .5rem .4rem .25rem;}
  select{width:100%; font-family:var(--font-body); font-size:.8125rem; color:var(--fm-ink); background:var(--fm-surface-2); border:1px solid var(--fm-border-strong); border-radius:6px; padding:.55rem .6rem;}
  .fm-psp-note{font-size:.76rem; line-height:1.5; margin:.7rem 0 0; padding:.55rem .7rem; border-radius:6px; background:var(--fm-surface-2); color:var(--fm-ink-muted);}
  .fm-psp-note.warn{background:var(--negative-soft); color:var(--negative);}
  .fm-ledger-wrap{background:var(--fm-surface); border:1px solid var(--fm-border); border-radius:12px; box-shadow:var(--shadow); overflow:hidden;}
  .fm-derived{display:flex; flex-wrap:wrap; gap:1.75rem; padding:1.1rem 1.5rem; background:var(--fm-surface-2); border-bottom:1px solid var(--fm-border);}
  .fm-k{display:block; font-size:.68rem; letter-spacing:.08em; text-transform:uppercase; color:var(--fm-ink-faint); margin-bottom:.25rem;}
  .fm-v{font-family:var(--font-mono); font-size:1rem; font-weight:600; font-variant-numeric:tabular-nums;}
  .fm-ledger-scroll{overflow-x:auto;}
  .fm-ledger{min-width:520px; padding:0 1.5rem 1.5rem;}
  .fm-ledger-header{display:grid; grid-template-columns:1fr 11rem 11rem; gap:.5rem; padding:1.15rem 0 .6rem;}
  .fm-ledger-header span:first-child{font-size:.7rem; letter-spacing:.08em; text-transform:uppercase; color:var(--fm-ink-faint); font-weight:700; align-self:end;}
  .fm-yr{font-family:var(--font-display); font-size:1.05rem; font-weight:600; text-align:right; color:var(--fm-ink);}
  .fm-yr small{display:block; font-family:var(--font-body); font-size:.68rem; font-weight:500; letter-spacing:.03em; color:var(--fm-ink-faint); text-transform:none;}
  .fm-ledger-section{border-top:1px solid var(--fm-border); padding:.9rem 0 .35rem;}
  .fm-ledger-section h3{font-size:.72rem; letter-spacing:.09em; text-transform:uppercase; color:var(--fm-ink-faint); font-weight:700; margin:0 0 .5rem;}
  .fm-row{display:grid; grid-template-columns:1fr 11rem 11rem; gap:.5rem; padding:.42rem 0; align-items:baseline;}
  .fm-label{font-size:.875rem; color:var(--fm-ink-muted);}
  .fm-val{font-family:var(--font-mono); font-size:.875rem; text-align:right; font-variant-numeric:tabular-nums; color:var(--fm-ink); transition:background-color .5s ease;}
  .fm-val.fm-dash{color:var(--fm-ink-faint);}
  .fm-subtotal{border-top:1px dashed var(--fm-border-strong); margin-top:.15rem; padding-top:.55rem;}
  .fm-subtotal .fm-label{color:var(--fm-ink); font-weight:600;}
  .fm-subtotal .fm-val{font-weight:600;}
  .fm-ledger-total{border-top:2px solid var(--fm-ink); margin-top:.4rem; padding-top:.7rem;}
  .fm-total .fm-label{font-family:var(--font-display); font-size:1.05rem; font-weight:600; color:var(--fm-ink);}
  .fm-total .fm-val{font-family:var(--font-mono); font-size:1.15rem; font-weight:700;}
  .fm-margin{padding-top:0;}
  .fm-margin .fm-label{font-size:.78rem; color:var(--fm-ink-faint);}
  .fm-margin .fm-val{font-size:.85rem; font-weight:600; color:var(--positive);}
  .flash{background-color:var(--fm-accent-soft) !important; border-radius:4px;}
  .fm-note{font-size:.75rem; color:var(--fm-ink-faint); line-height:1.6; padding:1.1rem 1.5rem 0; border-top:1px solid var(--fm-border); margin-top:.5rem;}
  @media (max-width:560px){ .fm-yr small{display:none;} }
`;
