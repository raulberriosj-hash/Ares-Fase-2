/**
 * estado-store.js — persistencia en sessionStorage compartida entre
 * bandeja.html y gestion-incidencia.html: ambas son documentos HTML
 * separados (sin SPA, sin backend) que regeneran su propio mock en cada
 * carga, así que el estado por incidencia y la incidencia activa del
 * usuario se guardan acá para que ambas pantallas lean la misma fuente
 * de verdad mientras dura la pestaña.
 *
 * DATA-INPUT: en producción este rol lo cumple el backend (ServiceNow).
 */

const ESTADO_STORE_KEY = 'ares-estados-incidencias';
const ACTIVA_STORE_KEY = 'ares-incidencia-activa';

function leerEstadosGuardados() {
  try {
    const raw = sessionStorage.getItem(ESTADO_STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function guardarEstadoIncidencia(id, estado) {
  try {
    const map = leerEstadosGuardados();
    map[id] = estado;
    sessionStorage.setItem(ESTADO_STORE_KEY, JSON.stringify(map));
  } catch (e) {
    /* sessionStorage no disponible (ej. modo privado) — se ignora. */
  }
}

function leerEstadoGuardado(id) {
  return leerEstadosGuardados()[id] || null;
}

function leerIncidenciaActivaGuardada() {
  try {
    return sessionStorage.getItem(ACTIVA_STORE_KEY);
  } catch (e) {
    return null;
  }
}

function guardarIncidenciaActiva(id) {
  try {
    sessionStorage.setItem(ACTIVA_STORE_KEY, id || '');
  } catch (e) {
    /* noop */
  }
}

/* ============================================================
   Etapa del flujo de Fase 2 — fuente de verdad ÚNICA
   ============================================================

   Fase 2 convirtió la aprobación en dos etapas (primero Evidencia, después
   Correlación). La etapa no es un campo aparte: se deduce del `estado` más
   el `agrupacion` de la incidencia. Vive acá porque la necesitan las dos
   pantallas — bandeja.html para decidir en qué tab va cada incidencia, y
   gestion-incidencia.html para decidir qué barra de acción y qué banner
   mostrar. Ver DIFF-FASE2.md, N3.

   Etapas:
     sin-tomar             nadie la tomó todavía        → tab Pendientes
     evidencia-pendiente   hay que validar la evidencia → tab En Curso, barra teal
     correlacion-pendiente evidencia OK, falta correlación → tab En Curso, barra morada
     cerrada               caso terminal                → tab Histórico, sin barra
*/
function etapaDeGestion(inc) {
  if (!inc) return 'cerrada';
  if (inc.estado === 'pendiente') return 'sin-tomar';
  if (inc.estado === 'en-curso') return 'evidencia-pendiente';

  /* Una CONSOLIDACIÓN con la evidencia aprobada todavía debe aprobar o
     rechazar la correlación de sus hijas: sigue en gestión, no es un caso
     cerrado. Una incidencia INDIVIDUAL no tiene correlación que validar,
     así que para ella "evidencia aprobada" sí es terminal.

     DISEÑO-PENDIENTE: el Figma de Fase 2 muestra en el Histórico una fila
     "Consolidación · Evidencia Aprobada", que por esta regla no debería
     estar cerrada todavía (le falta la etapa de correlación). Acá se
     resuelve del lado semántico — esa combinación va a En Curso. Confirmar
     con diseño; si el criterio real es el del Figma, se cambia solo esta
     función. Ver DIFF-FASE2.md, P19. */
  if (inc.estado === 'evidencia-aprobada' && inc.agrupacion === 'consolidacion') {
    return 'correlacion-pendiente';
  }

  return 'cerrada';
}

/** ¿La incidencia sigue requiriendo acción del NOC? (tab "En Curso") */
function estaEnGestion(inc) {
  const etapa = etapaDeGestion(inc);
  return etapa === 'evidencia-pendiente' || etapa === 'correlacion-pendiente';
}

/** ¿Es un caso cerrado? (tab "Histórico") */
function estaCerrada(inc) {
  return etapaDeGestion(inc) === 'cerrada' && inc.estado !== 'pendiente';
}
