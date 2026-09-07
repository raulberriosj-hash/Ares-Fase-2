/**
 * bandeja.js — ensambla bandeja.html usando los componentes de Fase 3/4
 * (sin modificarlos) sobre mock-data-bandeja.js.
 *
 * No hay recarga de página al cambiar de tab: todo vive en este documento,
 * el cambio de tab solo alterna qué <section> está visible y qué
 * subconjunto de `mockDataBandeja` se renderiza.
 */

/* ============================================================
   KPI bar — FIJO, no cambia por tab. Se calcula una sola vez sobre
   TODO mockDataBandeja (no sobre un subconjunto filtrado).
   ============================================================ */
function renderKpiRow() {
  const total = mockDataBandeja.length;
  const afectacionTotalSum = mockDataBandeja.reduce((sum, i) => sum + i.afectacionTotal, 0);
  const alarmasTotalSum = mockDataBandeja.reduce((sum, i) => sum + i.alarmasTotal, 0);
  const inc24hCount = mockDataBandeja.filter((i) => i.masDe24Horas).length;
  const enTerrenoCount = mockDataBandeja.filter((i) => i.enTerreno).length;

  const vnosMap = new Map();
  mockDataBandeja.forEach((inc) => {
    (inc.vnos || []).forEach((v) => {
      vnosMap.set(v.carrier, (vnosMap.get(v.carrier) || 0) + v.count);
    });
  });
  const vnosAgregados = Array.from(vnosMap, ([carrier, count]) => ({ carrier, count }));

  const kpiRow = document.getElementById('kpiRow');
  kpiRow.innerHTML = '';

  const resumenes = [
    { titulo: 'Afectación total', valor: `${afectacionTotalSum.toLocaleString('es-CL')} Afectados` },
    { titulo: 'Total alarmas', valor: `${alarmasTotalSum.toLocaleString('es-CL')} Afectados` },
    { titulo: 'Inc con más de 24 horas', valor: `${inc24hCount} Incidencias` },
    { titulo: 'Inc en terreno', valor: `${enTerrenoCount} Incidencias` },
  ];
  resumenes.forEach((r) => {
    const el = document.createElement('ares-kpi-bar-resumen');
    el.setAttribute('titulo', r.titulo);
    el.setAttribute('valor', r.valor);
    kpiRow.appendChild(el);
  });

  const detallada = document.createElement('ares-kpi-bar-detallada');
  detallada.data = { vnos: vnosAgregados };
  kpiRow.appendChild(detallada);
}

/* ============================================================
   Banner "Tu Incidencia en Curso" — depende de currentUser, no del tab.
   ============================================================ */
function renderBanner() {
  const banner = document.getElementById('banner');
  const activa = mockDataBandeja.find((i) => i.id === currentUser.incidenciaActivaId);
  if (!activa) {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;
  document.getElementById('bannerId').textContent = activa.id;
  document.getElementById('bannerTipo').setAttribute('tipo', activa.tipoIncidente);
  const totalVnos = (activa.vnos || []).reduce((s, v) => s + v.count, 0);
  document.getElementById('bannerVnos').textContent = totalVnos;

  document.getElementById('bannerLiberar').onclick = () => abrirModalLiberar(activa.id);
  document.getElementById('bannerGestionar').onclick = () => {
    window.location.href = `gestion-incidencia.html?id=${encodeURIComponent(activa.id)}`;
  };
}

/* ============================================================
   Mutaciones de mockDataBandeja/currentUser, persistidas vía
   estado-store.js (sessionStorage) para que gestion-incidencia.html vea
   el mismo estado al navegar.
   ============================================================ */
function liberarIncidencia(incidenciaId) {
  const inc = mockDataBandeja.find((i) => i.id === incidenciaId);
  if (!inc) return;
  inc.estado = 'pendiente';
  delete inc.responsable;
  guardarEstadoIncidencia(incidenciaId, 'pendiente');
  if (currentUser.incidenciaActivaId === incidenciaId) {
    currentUser.incidenciaActivaId = null;
    guardarIncidenciaActiva(null);
  }
}

function tomarIncidencia(incidenciaId) {
  const nueva = mockDataBandeja.find((i) => i.id === incidenciaId);
  if (!nueva) return;
  const actual = mockDataBandeja.find((i) => i.id === currentUser.incidenciaActivaId);
  if (actual) {
    actual.estado = 'pendiente';
    delete actual.responsable;
    guardarEstadoIncidencia(actual.id, 'pendiente');
  }
  nueva.estado = 'en-curso';
  nueva.responsable = currentUser.responsable;
  guardarEstadoIncidencia(nueva.id, 'en-curso');
  currentUser.incidenciaActivaId = nueva.id;
  guardarIncidenciaActiva(nueva.id);
}

/* ============================================================
   Modales — ares-assignment-modal (Tomar INC) y ares-release-modal
   (Liberar).
   ============================================================ */
function abrirModalTomarInc(incidenciaId) {
  const nueva = mockDataBandeja.find((i) => i.id === incidenciaId);
  if (!nueva) return;
  const actual = mockDataBandeja.find((i) => i.id === currentUser.incidenciaActivaId);
  const modal = document.getElementById('assignModal');
  const modo = actual ? 'cambio' : 'confirmar';
  modal.setAttribute('modo', modo);
  modal.data = { modo, incidenciaNueva: nueva, incidenciaActual: actual };
  modal.toggleAttribute('open', true);
}

function abrirModalLiberar(incidenciaId) {
  const incidencia = mockDataBandeja.find((i) => i.id === incidenciaId);
  if (!incidencia) return;
  const modal = document.getElementById('releaseModal');
  modal.data = { incidencia };
  modal.toggleAttribute('open', true);
}

function initModales() {
  const assignModal = document.getElementById('assignModal');
  const releaseModal = document.getElementById('releaseModal');

  assignModal.addEventListener('ares-cancel', () => assignModal.toggleAttribute('open', false));
  assignModal.addEventListener('ares-gestionar', (e) => {
    tomarIncidencia(e.detail.id);
    assignModal.toggleAttribute('open', false);
    window.location.href = `gestion-incidencia.html?id=${encodeURIComponent(e.detail.id)}`;
  });

  releaseModal.addEventListener('ares-cancel', () => releaseModal.toggleAttribute('open', false));
  releaseModal.addEventListener('ares-liberar', (e) => {
    liberarIncidencia(e.detail.id);
    releaseModal.toggleAttribute('open', false);
    renderBanner();
    renderTabCounts();
    renderPendientes();
    renderEnCurso();
  });
}

/* ============================================================
   Filtrado + render de cada panel
   ============================================================ */
/* Fase 2: las 3 bandejas ahora paginan (antes eran scroll continuo — ver
   DIFF-FASE2.md, N8/M13). Mismo tamaño de página que la tabla de alarmas. */
const PAGE_SIZE = 10;

const state = {
  tab: 'pendiente',
  enCursoFiltro: 'todas',
  historicoFiltro: 'todas',
  busqueda: { pendiente: '', 'en-curso': '', historico: '' },
  pagina: { pendiente: 1, 'en-curso': 1, historico: 1 },
  /* Ids de las consolidaciones desplegadas. Vive acá y no en el componente
     porque la fila se vuelve a crear en cada render (cambio de página,
     búsqueda, filtro) y el despliegue tiene que sobrevivir a eso. */
  expandidas: new Set(),
};

// Quita tildes/diacríticos para que la búsqueda no dependa de que el
// usuario escriba el acento exacto (ej. "telefonica" encuentra "Telefónica").
function normalizarTexto(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function coincideBusqueda(inc, termino) {
  if (!termino) return true;
  const t = normalizarTexto(termino);
  if (normalizarTexto(inc.id).includes(t)) return true;
  if ((inc.vnos || []).some((v) => normalizarTexto(v.carrier).includes(t))) return true;
  // Fase 2: el OLT es visible en la fila, así que también se puede buscar por él.
  if (inc.olt && normalizarTexto(inc.olt).includes(t)) return true;
  // ...y por el ID de una incidencia hija correlacionada.
  if ((inc.hijas || []).some((h) => normalizarTexto(h.id).includes(t))) return true;
  return false;
}

/* Los 3 tabs se filtran por ETAPA, no por `estado` suelto: en Fase 2 el
   mismo estado puede significar cosas distintas según si la incidencia es
   consolidación o individual (ver etapaDeGestion en estado-store.js). */
function filtrarPendientes() {
  return mockDataBandeja.filter(
    (i) => etapaDeGestion(i) === 'sin-tomar' && coincideBusqueda(i, state.busqueda.pendiente)
  );
}

function filtrarEnCurso() {
  let subset = mockDataBandeja.filter((i) => estaEnGestion(i));
  if (state.enCursoFiltro === 'mias') {
    subset = subset.filter((i) => i.id === currentUser.incidenciaActivaId);
  }
  return subset.filter((i) => coincideBusqueda(i, state.busqueda['en-curso']));
}

function filtrarHistorico() {
  let subset = mockDataBandeja.filter((i) => estaCerrada(i));
  /* El subfiltro agrupa por resultado, no por etapa: "Aprobadas" incluye
     tanto Evidencia Aprobada como Correlación Aprobada. */
  if (state.historicoFiltro === 'aprobadas') {
    subset = subset.filter((i) => i.estado.endsWith('-aprobada'));
  } else if (state.historicoFiltro === 'rechazadas') {
    subset = subset.filter((i) => i.estado.endsWith('-rechazada'));
  }
  return subset.filter((i) => coincideBusqueda(i, state.busqueda.historico));
}

// En curso: "propia" = LA incidencia que tengo tomada ahora mismo (única,
// determina también si puedo gestionarla). Histórico: ya no hay una
// incidencia "activa" (está cerrada), así que "propia" se basa en si yo
// fui el responsable asignado.
function esIncidenciaPropia(inc, variante) {
  if (variante === 'en-curso') return inc.id === currentUser.incidenciaActivaId;
  if (variante === 'historico') return inc.responsable?.nombre === currentUser.responsable.nombre;
  return false;
}

function irADetalle(id) {
  window.location.href = `gestion-incidencia.html?id=${encodeURIComponent(id)}`;
}

function renderLista(container, incidencias, variante, pagKey, pagEl) {
  container.innerHTML = '';

  if (incidencias.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No hay incidencias que coincidan con la búsqueda.';
    container.appendChild(empty);
    pagEl.hidden = true;
    return;
  }

  const totalPaginas = Math.max(1, Math.ceil(incidencias.length / PAGE_SIZE));
  // Si un filtro dejó menos páginas que la actual, no queda una página vacía.
  state.pagina[pagKey] = Math.min(state.pagina[pagKey], totalPaginas);
  const inicio = (state.pagina[pagKey] - 1) * PAGE_SIZE;

  incidencias.slice(inicio, inicio + PAGE_SIZE).forEach((inc) => {
    const row = document.createElement('ares-incident-row');
    row.setAttribute('variante', variante);
    row.data = { incidencia: inc, responsable: inc.responsable, esPropia: esIncidenciaPropia(inc, variante) };
    // Restituye el despliegue tras un re-render.
    row.toggleAttribute('expandido', state.expandidas.has(inc.id));

    row.addEventListener('ares-tomar-inc', (e) => abrirModalTomarInc(e.detail.id));
    row.addEventListener('ares-detalles', (e) => irADetalle(e.detail.id));
    // Una hija es una incidencia como cualquier otra: su detalle es la misma pantalla.
    row.addEventListener('ares-detalles-hija', (e) => irADetalle(e.detail.id));
    row.addEventListener('ares-toggle-expandir', (e) => {
      if (e.detail.expandido) state.expandidas.add(e.detail.id);
      else state.expandidas.delete(e.detail.id);
    });

    container.appendChild(row);
  });

  pagEl.hidden = false;
  pagEl.setAttribute('total-paginas', totalPaginas);
  pagEl.setAttribute('pagina', state.pagina[pagKey]);
}

function renderPendientes() {
  const data = filtrarPendientes();
  document.getElementById('subPendientes').textContent = `${data.length} incidencias en la cola de pendientes`;
  renderLista(document.getElementById('listPendientes'), data, 'pendiente', 'pendiente', document.getElementById('pagPendientes'));
}

function renderEnCurso() {
  const data = filtrarEnCurso();
  document.getElementById('subEnCurso').textContent = `${data.length} incidencias en curso en el equipo`;
  renderLista(document.getElementById('listEnCurso'), data, 'en-curso', 'en-curso', document.getElementById('pagEnCurso'));
}

function renderHistorico() {
  const data = filtrarHistorico();
  document.getElementById('subHistorico').textContent = `${data.length} incidencias resueltas registradas históricamente`;
  renderLista(document.getElementById('listHistorico'), data, 'historico', 'historico', document.getElementById('pagHistorico'));
}

/* ============================================================
   Badges de conteo en los tabs — siempre desde .filter(...).length
   ============================================================ */
function renderTabCounts() {
  document
    .getElementById('tabPendientes')
    .setAttribute('count', mockDataBandeja.filter((i) => etapaDeGestion(i) === 'sin-tomar').length);
  document.getElementById('tabEnCurso').setAttribute('count', mockDataBandeja.filter((i) => estaEnGestion(i)).length);
  document.getElementById('tabHistorico').setAttribute('count', mockDataBandeja.filter((i) => estaCerrada(i)).length);
}

/* ============================================================
   Cambio de tab — sin recarga de página
   ============================================================ */
function seleccionarTab(tab) {
  state.tab = tab;
  ['tabPendientes', 'tabEnCurso', 'tabHistorico'].forEach((id) => {
    const el = document.getElementById(id);
    el.toggleAttribute('active', el.dataset.estado === tab);
  });
  document.getElementById('panelPendientes').hidden = tab !== 'pendiente';
  document.getElementById('panelEnCurso').hidden = tab !== 'en-curso';
  document.getElementById('panelHistorico').hidden = tab !== 'historico';
}

document.getElementById('tabPendientes').addEventListener('click', () => seleccionarTab('pendiente'));
document.getElementById('tabEnCurso').addEventListener('click', () => seleccionarTab('en-curso'));
document.getElementById('tabHistorico').addEventListener('click', () => seleccionarTab('historico'));

document.querySelectorAll('#subfiltersHistorico .subfilter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#subfiltersHistorico .subfilter-btn').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');
    state.historicoFiltro = btn.dataset.filtro;
    state.pagina.historico = 1; // otro filtro = otra lista, volver al inicio
    renderHistorico();
  });
});

document.querySelectorAll('#subfiltersEnCurso .subfilter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#subfiltersEnCurso .subfilter-btn').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');
    state.enCursoFiltro = btn.dataset.filtro;
    state.pagina['en-curso'] = 1;
    renderEnCurso();
  });
});

/* Paginación de cada bandeja. ares-pagination es un componente controlado:
   avisa a qué página quiere ir y este shell decide y re-renderiza. */
[
  ['pagPendientes', 'pendiente', renderPendientes],
  ['pagEnCurso', 'en-curso', renderEnCurso],
  ['pagHistorico', 'historico', renderHistorico],
].forEach(([elId, pagKey, render]) => {
  document.getElementById(elId).addEventListener('ares-cambio-pagina', (e) => {
    state.pagina[pagKey] = e.detail.pagina;
    render();
  });
});

document.getElementById('sidebar').addEventListener('ares-nav-incidentes', () => {
  window.location.href = 'bandeja.html';
});

document.querySelectorAll('input[data-search]').forEach((input) => {
  input.addEventListener('input', () => {
    const key = input.dataset.search;
    state.busqueda[key] = input.value;
    state.pagina[key] = 1; // una búsqueda nueva siempre arranca en la página 1
    if (key === 'pendiente') renderPendientes();
    if (key === 'en-curso') renderEnCurso();
    if (key === 'historico') renderHistorico();
  });
});

/* ============================================================
   Init
   ============================================================ */
document.getElementById('topbarAvatar').textContent = currentUser.responsable.iniciales;
document.getElementById('topbarNombre').textContent = currentUser.responsable.nombre;
document.getElementById('topbarRol').textContent = currentUser.responsable.rol;

renderKpiRow();
renderBanner();
renderTabCounts();
renderPendientes();
renderEnCurso();
renderHistorico();
seleccionarTab('pendiente');
initModales();
