/**
 * mock-data-bandeja.js
 *
 * DATA-INPUT — sistema real que reemplaza este mock: ServiceNow (incidentes,
 * estado, responsable) + CMDB (VNOs/carriers afectados) + Databricks
 * (agregados de afectación/alarmas para el KPI bar).
 *
 * UN SOLO arreglo de incidencias — cada tab de bandeja.html se obtiene
 * filtrando este mismo arreglo por su etapa de gestión (ver etapaDeGestion()
 * en estado-store.js). Fase 2 agregó a cada incidencia, sobre los objetos
 * que ya existían, los campos `olt`, `agrupacion` e `hijas`.
 *
 * "finalizada" no se genera acá: en Fase 2 ese estado ya no existe (ver
 * ares-status-badge.js y DIFF-FASE2.md, E4).
 *
 * `masDe24Horas` y `enTerreno` son DATA-INPUT sin fuente real confirmada
 * todavía — probablemente requieran un campo nuevo en ServiceNow.
 */

const TIPOS = ['pon-loss', 'cto-indisponible', 'gasp'];
const CARRIERS = ['Telefónica', 'Entel', 'ClaroVTR', 'DirecTV'];
/* DATA-INPUT — origen: CMDB / OSP (inventario de red).
   Debe coincidir EXACTAMENTE con OLTS en mock-data-gestion.js: la misma
   incidencia se muestra en la fila de la bandeja y en su detalle, y ambos
   documentos regeneran el OLT desde el mismo seed. Si las listas divergen,
   la fila y el detalle muestran OLTs distintos para el mismo incidente. */
const OLTS = ['OLT-VALPO-CERRO', 'OLT-STGO-CENTRO', 'OLT-CONCE-NORTE', 'OLT-ANTOF-SUR'];
// DATA-INPUT
const RESPONSABLES = [
  { iniciales: 'RB', nombre: 'Raúl Berríos', rol: 'Trabajador NOC' },
  { iniciales: 'MF', nombre: 'Marcela Fuentes', rol: 'Trabajador NOC' },
  { iniciales: 'JS', nombre: 'Javier Soto', rol: 'Supervisor NOC' },
  { iniciales: 'CP', nombre: 'Camila Pizarro', rol: 'Trabajador NOC' },
];

function pad(n) {
  return String(n).padStart(2, '0');
}

function fecha(diaOffset) {
  const base = new Date(2026, 7, 22); // 22/08/2026, coherente con las capturas de Figma
  base.setDate(base.getDate() - diaOffset);
  return `${pad(base.getDate())}/${pad(base.getMonth() + 1)}/${base.getFullYear()}`;
}

function vnosPara(seed) {
  const n = 2 + (seed % 3); // 2 a 4 carriers afectados
  const out = [];
  for (let i = 0; i < n; i++) {
    const carrier = CARRIERS[(seed + i) % CARRIERS.length];
    out.push({ carrier, count: 1 + ((seed + i * 7) % 4) });
  }
  return out;
}

/**
 * Fase 2 — incidencias HIJAS de una consolidación.
 *
 * DATA-INPUT: en producción las entrega el motor de correlación junto con su
 * score de confianza; no salen de ServiceNow. Acá se derivan del seed para
 * que cada consolidación tenga el mismo set entre recargas.
 *
 * Los valores de `confiabilidad` se reparten a propósito en las 3 bandas de
 * color de ares-confiabilidad-tag (alto / medio / bajo) para que las tres se
 * puedan ver sin tener que buscarlas.
 */
function hijasPara(seed, oltPadre) {
  const n = 2 + (seed % 11); // 2 a 12 hijas
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = seed + i * 3;
    out.push({
      // seed*20+i no colisiona entre padres porque i siempre es < 20.
      id: `INC027${String(1000 + seed * 20 + i).padStart(4, '0')}`,
      tipoIncidente: TIPOS[s % TIPOS.length],
      olt: oltPadre,
      puerto: `PON 0/${s % 8}/${s % 4}`,
      confiabilidad: [95, 88, 72, 61, 45, 38, 12][s % 7],
    });
  }
  return out;
}

function incidenciaBase(index, estado) {
  const seed = index + 1;
  const afectacionTotal = 120 + (seed * 37) % 900;
  const olt = OLTS[seed % OLTS.length];
  /* ~2 de cada 3 son consolidación, para que ambas variantes de fila
     (expandible / individual) convivan en todos los tabs. */
  const agrupacion = seed % 3 !== 0 ? 'consolidacion' : 'individual';

  return {
    id: `INC02708${String(30 + seed).padStart(2, '0')}`,
    estado,
    tipoIncidente: TIPOS[seed % TIPOS.length],
    fechaInicioReal: fecha(seed % 10),
    fechaCreacion: fecha((seed % 10) + 1),
    afectacionTotal,
    afectacionReales: Math.round(afectacionTotal * (0.65 + (seed % 4) * 0.05)),
    alarmasTotal: 4 + (seed % 20),
    alarmasAbiertas: 1 + (seed % 9),
    vnos: vnosPara(seed),
    masDe24Horas: seed % 11 === 0,
    enTerreno: seed % 13 === 0,
    // --- Fase 2 ---
    olt, // DATA-INPUT — reemplaza a los chips de VNO en la fila (ver DIFF-FASE2.md, M3)
    agrupacion, // "consolidacion" (agrupa hijas) | "individual"
    hijas: agrupacion === 'consolidacion' ? hijasPara(seed, olt) : [],
  };
}

/**
 * Estado terminal de una incidencia ya gestionada (tab Histórico).
 *
 * Una incidencia INDIVIDUAL no tiene correlación que validar, así que solo
 * puede cerrarse en la etapa de evidencia. Una CONSOLIDACIÓN puede cerrarse
 * por rechazo de evidencia (no llegó a la segunda etapa) o por el resultado
 * de la correlación. Ver etapaDeGestion() en estado-store.js.
 */
function estadoCerrado(seed, agrupacion) {
  if (agrupacion === 'individual') {
    return seed % 4 === 0 ? 'evidencia-rechazada' : 'evidencia-aprobada';
  }
  const ciclo = seed % 3;
  if (ciclo === 0) return 'evidencia-rechazada';
  if (ciclo === 1) return 'correlacion-aprobada';
  return 'correlacion-rechazada';
}

const mockDataBandeja = [];

// --- Pendientes: 6 incidencias (badge/subtítulo se calculan en bandeja.html, no acá) ---
for (let i = 0; i < 6; i++) {
  mockDataBandeja.push(incidenciaBase(i, 'pendiente'));
}

/* --- En curso: 8 incidencias, todas con responsable asignado ---
   Fase 2: no todas están en la misma etapa. Las consolidaciones marcadas
   como 'evidencia-aprobada' quedan en "correlacion-pendiente" (ver
   etapaDeGestion), que es lo que hace visible la barra morada de
   correlación en la pantalla de gestión. */
for (let i = 6; i < 14; i++) {
  const inc = incidenciaBase(i, 'en-curso');
  if (inc.agrupacion === 'consolidacion' && i % 4 === 0) {
    inc.estado = 'evidencia-aprobada';
  }
  inc.responsable = RESPONSABLES[i % RESPONSABLES.length];
  mockDataBandeja.push(inc);
}

// --- Histórico: 31 incidencias (volumen real para probar la lista larga) ---
for (let i = 14; i < 45; i++) {
  const seed = i + 1;
  const agrupacion = seed % 3 !== 0 ? 'consolidacion' : 'individual';
  const inc = incidenciaBase(i, estadoCerrado(seed, agrupacion));
  inc.responsable = RESPONSABLES[i % RESPONSABLES.length];
  mockDataBandeja.push(inc);
}

/**
 * Aplica overrides de estado guardados en sessionStorage (ver
 * estado-store.js) — así una incidencia tomada/liberada/gestionada en
 * gestion-incidencia.html se ve reflejada acá.
 */
mockDataBandeja.forEach((inc, i) => {
  const estadoGuardado = leerEstadoGuardado(inc.id);
  if (!estadoGuardado || estadoGuardado === inc.estado) return;
  inc.estado = estadoGuardado;
  if (estadoGuardado === 'pendiente') {
    delete inc.responsable;
  } else if (!inc.responsable) {
    inc.responsable = RESPONSABLES[i % RESPONSABLES.length];
  }
});

/**
 * Estado del usuario actual (sesión NOC). DATA-INPUT — vendría de la
 * sesión autenticada, no de este mock. El banner "Tu Incidencia en Curso"
 * se muestra independiente del tab activo.
 *
 * `incidenciaActivaId` se resuelve desde sessionStorage (ver
 * estado-store.js) para sobrevivir a la navegación con gestion-incidencia.html.
 */
const _activaGuardada = leerIncidenciaActivaGuardada();
let _incidenciaActivaInicial;
if (_activaGuardada !== null) {
  _incidenciaActivaInicial = _activaGuardada || null;
} else {
  const primeraEnCurso = mockDataBandeja.find((i) => i.estado === 'en-curso');
  _incidenciaActivaInicial = primeraEnCurso?.id ?? null;
  // El responsable de fábrica viene del ciclo RESPONSABLES[i % 4] y no
  // necesariamente coincide con currentUser — se corrige acá para que la
  // incidencia activa por defecto muestre al usuario actual como responsable.
  if (primeraEnCurso) primeraEnCurso.responsable = RESPONSABLES[0];
  guardarIncidenciaActiva(_incidenciaActivaInicial);
}

const currentUser = {
  responsable: RESPONSABLES[0],
  incidenciaActivaId: _incidenciaActivaInicial,
};
