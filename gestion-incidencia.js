/**
 * gestion-incidencia.js — ensambla gestion-incidencia.html usando los
 * componentes de Fase 3/4 (sin modificarlos) sobre mock-data-gestion.js.
 *
 * A diferencia de bandeja.html, acá la tabla de alarmas SÍ pagina
 * (10 filas por página) — fiel al caso real de Figma con 60 alarmas / 6
 * páginas (ver INVENTORY.md, caso límite "Alarma masiva").
 */

const PAGE_SIZE = 10;
// Fase 2: las hijas correlacionadas tienen su propia tabla paginada.
const CORRELACIONADAS_POR_PAGINA = 5;
const state = {
  pagina: 1,
  filtro: 'todas',
  busqueda: '',
  correlacionadas: { pagina: 1, busqueda: '' },
};

/* ============================================================
   Resolución de la incidencia a mostrar según ?id= de la URL.
   `resolverDatosIncidencia()` (mock-data-gestion.js) genera detalle +
   alarmas reales para cualquier id real de la bandeja; si no hay id
   reconocible usa el incidente de demostración fijo.
   ============================================================ */
const { incidenteDetalle, alarmas: mockDataGestion } = resolverDatosIncidencia(
  new URLSearchParams(window.location.search).get('id')
);

/* ============================================================
   ares-validation-bar — soporta ambos casos (con/sin barra) desde el
   mismo archivo vía el atributo puede-gestionar. Por defecto usa
   incidenteDetalle.puedeGestionar; se puede forzar con ?gestionar=false
   en la URL para probar el otro caso sin tocar el mock.
   ============================================================ */
function resolverPuedeGestionar() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('gestionar')) {
    return params.get('gestionar') !== 'false';
  }
  return incidenteDetalle.puedeGestionar;
}

/**
 * Fase 2 — qué variante de barra corresponde según la etapa del flujo:
 *   evidencia-pendiente    → barra teal   ("Aprobar Evidencias")
 *   correlacion-pendiente  → barra morada ("Aprobar correlación de Incidentes")
 * Ver etapaDeGestion() en estado-store.js y DIFF-FASE2.md, N3/M2.
 */
function varianteBarra() {
  return etapaDeGestion(incidenteDetalle) === 'correlacion-pendiente' ? 'correlacion' : 'evidencias';
}

function renderValidationBar() {
  const bar = document.getElementById('validationBar');
  // Una incidencia ya cerrada nunca muestra barra, aunque fuera del usuario.
  const puedeGestionar = resolverPuedeGestionar() && estaEnGestion(incidenteDetalle);
  bar.setAttribute('variante', varianteBarra());
  bar.toggleAttribute('puede-gestionar', puedeGestionar);
  bar.data = {
    alarmasCount: mockDataGestion.filter((a) => a.estado === 'abierto').length,
    incCorrelacionadasCount: (incidenteDetalle.hijas || []).length,
  };
}

/**
 * Fase 2 — banner de resultado. Aparece exactamente cuando la barra
 * desaparece, salvo en el paso intermedio (evidencia aprobada + correlación
 * pendiente), donde conviven: el banner explica qué pasó y la barra pide la
 * siguiente decisión.
 */
function renderNotificationBanner() {
  const banner = document.getElementById('notifBanner');
  const { estado, agrupacion } = incidenteDetalle;

  let tipo = null;
  if (estado === 'evidencia-aprobada') {
    tipo = agrupacion === 'consolidacion' ? 'evidencia-aprobada-correlacion-pendiente' : 'evidencia-aprobada';
  } else if (['evidencia-rechazada', 'correlacion-aprobada', 'correlacion-rechazada'].includes(estado)) {
    tipo = estado;
  }

  if (!tipo) {
    banner.hidden = true;
    banner.removeAttribute('tipo');
    return;
  }
  banner.hidden = false;
  banner.setAttribute('tipo', tipo);
}

/* ============================================================
   Modales — evidencia (por alarma) y validación (aprobar/rechazar)
   ============================================================ */
function abrirModalValidacion(accion) {
  const modal = document.getElementById('validationModal');
  modal.setAttribute('accion', accion);
  // La variante decide si el modal habla de Evidencias o de Correlación.
  modal.setAttribute('variante', varianteBarra());
  modal.data = { accion, incidencia: incidenteDetalle };
  modal.toggleAttribute('open', true);
}

function abrirModalEvidencia(alarmaId) {
  const alarma = mockDataGestion.find((a) => a.id === alarmaId);
  if (!alarma) return;
  const modal = document.getElementById('evidenceModal');
  modal.data = { alarmaId: alarma.id, imagenUrl: alarma.imagenUrl };
  modal.toggleAttribute('open', true);
}

function initModales() {
  const evidenceModal = document.getElementById('evidenceModal');
  const validationModal = document.getElementById('validationModal');

  evidenceModal.addEventListener('ares-cancel', () => evidenceModal.toggleAttribute('open', false));

  validationModal.addEventListener('ares-cancel', () => validationModal.toggleAttribute('open', false));
  validationModal.addEventListener('ares-confirmar', (e) => {
    /* Fase 2 — el resultado depende de QUÉ etapa se estaba validando.
       Aprobar la evidencia de una consolidación NO cierra el caso: lo pasa
       a la etapa de correlación, así que la pantalla se re-renderiza con la
       barra morada y el banner intermedio en vez de quedarse sin barra. */
    const aprobado = e.detail.accion === 'aprobar';
    const etapa = varianteBarra();
    incidenteDetalle.estado =
      etapa === 'correlacion'
        ? aprobado
          ? 'correlacion-aprobada'
          : 'correlacion-rechazada'
        : aprobado
          ? 'evidencia-aprobada'
          : 'evidencia-rechazada';

    guardarEstadoIncidencia(incidenteDetalle.id, incidenteDetalle.estado);

    // La incidencia deja de ser "la activa" del usuario solo si ya cerró.
    incidenteDetalle.puedeGestionar = estaEnGestion(incidenteDetalle);
    if (!incidenteDetalle.puedeGestionar && leerIncidenciaActivaGuardada() === incidenteDetalle.id) {
      guardarIncidenciaActiva(null);
    }

    document.getElementById('tituloEstado').setAttribute('status', incidenteDetalle.estado);
    renderValidationBar();
    renderNotificationBanner();
    validationModal.toggleAttribute('open', false);
  });

  document.getElementById('validationBar').addEventListener('ares-aprobar-consolidacion', () =>
    abrirModalValidacion('aprobar')
  );
  document.getElementById('validationBar').addEventListener('ares-rechazar-consolidacion', () =>
    abrirModalValidacion('rechazar')
  );

  document.getElementById('alarmList').addEventListener('ares-ver-evidencia', (e) => abrirModalEvidencia(e.detail.id));
}

/* ============================================================
   Header + stats
   ============================================================ */
function renderHeader() {
  document.getElementById('tituloId').textContent = incidenteDetalle.id;
  document.getElementById('tituloEstado').setAttribute('status', incidenteDetalle.estado);

  /* Fase 2 — rol de la incidencia dentro de la correlación, y breadcrumb al
     padre cuando se está viendo una hija (ver DIFF-FASE2.md, M6).

     DISEÑO-PENDIENTE: el Figma rotula "Incidencia Padre" incluso en la
     pantalla de una incidencia individual (que no agrupa nada) — ver
     P9. Acá se rotula según el dato real: solo una consolidación es padre. */
  const rol = incidenteDetalle.esHija
    ? 'Incidencia Hija'
    : incidenteDetalle.agrupacion === 'consolidacion'
      ? 'Incidencia Padre'
      : 'Incidencia Individual';
  document.getElementById('tituloRol').textContent = rol;

  const bc = document.getElementById('breadcrumbPadre');
  const bcFlecha = document.getElementById('breadcrumbFlecha');
  if (incidenteDetalle.esHija && incidenteDetalle.padreId) {
    bc.hidden = false;
    bcFlecha.hidden = false;
    document.getElementById('breadcrumbId').textContent = incidenteDetalle.padreId;
    bc.href = `gestion-incidencia.html?id=${encodeURIComponent(incidenteDetalle.padreId)}`;
  } else {
    bc.hidden = true;
    bcFlecha.hidden = true;
  }
  document.getElementById('topbarOlt').textContent = incidenteDetalle.olt;
  document.getElementById('topbarUbicacion').textContent = incidenteDetalle.ubicacion;
  document.getElementById('topbarTipo').setAttribute('tipo', incidenteDetalle.tipoIncidente);

  document.getElementById('statAfectacionTotal').textContent = `${incidenteDetalle.afectacionTotal.toLocaleString('es-CL')} UIC`;
  document.getElementById('statAfectacionReal').textContent = `${incidenteDetalle.afectacionReales.toLocaleString('es-CL')} UIC`;
  const pct = Math.round((incidenteDetalle.afectacionReales / incidenteDetalle.afectacionTotal) * 100);
  document.getElementById('statAfectacionPct').textContent = `${pct}% de la afectación total`;

  document.getElementById('statAlarmas').textContent = `${incidenteDetalle.alarmasAbiertas} Abiertas`;
  const pctAlarmas = Math.round((incidenteDetalle.alarmasAbiertas / incidenteDetalle.alarmasTotal) * 100);
  document.getElementById('statAlarmasPct').textContent = `${pctAlarmas}% del total`;

  const statVnos = document.getElementById('statVnos');
  incidenteDetalle.vnos.forEach((v) => {
    const chip = document.createElement('span');
    chip.className = 'vno-chip';
    const label = document.createElement('span');
    label.textContent = `${v.carrier} · `;
    const count = document.createElement('b');
    count.textContent = String(v.count);
    chip.appendChild(label);
    chip.appendChild(count);
    statVnos.appendChild(chip);
  });
}

function renderEvidencia() {
  document.getElementById('evidenciaTotalBadge').textContent = incidenteDetalle.evidenciaCapturadas + incidenteDetalle.evidenciaSinCapturar;
  document.getElementById('evCapturadas').textContent = incidenteDetalle.evidenciaCapturadas;
  document.getElementById('evSinCapturar').textContent = incidenteDetalle.evidenciaSinCapturar;
  document.getElementById('evCobertura').textContent = incidenteDetalle.evidenciaCobertura;
  document.getElementById('evGestoresCount').textContent = incidenteDetalle.gestores.length;

  const gestorRow = document.getElementById('gestorRow');
  incidenteDetalle.gestores.forEach((g) => {
    const el = document.createElement('ares-gestor-badge');
    el.setAttribute('fabricante', g.fabricante);
    el.textContent = g.label;
    gestorRow.appendChild(el);
  });
}

function renderVnos() {
  document.getElementById('vnosCountBadge').textContent = incidenteDetalle.vnos.length;
  const list = document.getElementById('vnoList');
  let suma = 0;
  incidenteDetalle.vnos.forEach((v) => {
    suma += v.count;
    const item = document.createElement('div');
    item.className = 'vno-item';
    item.innerHTML = `<div><div class="name">${v.codigo}</div><div class="carrier">${v.carrier}</div></div><span class="uic">${v.count} UIC</span>`;
    list.appendChild(item);
  });
  document.getElementById('vnoSumaUic').textContent = suma.toLocaleString('es-CL');
}

function renderInfoPanels() {
  const rf = incidenteDetalle.rutaFisica;
  document.getElementById('rutaFisicaList').innerHTML = `
    <div class="row"><span>OLT</span><span>${rf.olt}</span></div>
    <div class="row"><span>CAP</span><span>${rf.cap}</span></div>
    <div class="row"><span>Fibra troncal</span><span>${rf.fibraTroncal}</span></div>
    <div class="row"><span>SLOTs afectados</span><span>${rf.slots}</span></div>
    <div class="row"><span>Puertos PON</span><span>${rf.puertosPon} puertos</span></div>
  `;
  const or = incidenteDetalle.origen;
  document.getElementById('origenList').innerHTML = `
    <div class="row"><span>Creación</span><span>${or.creacion}</span></div>
    <div class="row"><span>Inicio Real</span><span>${or.inicioReal}</span></div>
    <div class="row"><span>Alarma más reciente</span><span>${or.alarmaMasReciente}</span></div>
    <div class="row"><span>Creado por</span><span>${or.creadoPor}</span></div>
    <div class="row"><span>Correlación</span><span>${or.correlacion}</span></div>
  `;
}

/* ============================================================
   Fase 2 — Incidencias Correlacionadas (solo si es consolidación)
   ============================================================ */
function correlacionadasFiltradas() {
  const hijas = incidenteDetalle.hijas || [];
  const t = state.correlacionadas.busqueda.trim().toLowerCase();
  if (!t) return hijas;
  return hijas.filter((h) => h.id.toLowerCase().includes(t));
}

function renderCorrelacionadas() {
  const panel = document.getElementById('panelCorrelacionadas');
  const hijas = incidenteDetalle.hijas || [];

  // Una incidencia individual o una hija no agrupan nada: la sección no existe.
  if (incidenteDetalle.agrupacion !== 'consolidacion' || hijas.length === 0) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  document.getElementById('correlacionadasBadge').textContent = hijas.length;

  const filtradas = correlacionadasFiltradas();
  const lista = document.getElementById('correlacionadasList');
  const pag = document.getElementById('correlacionadasPag');
  lista.innerHTML = '';

  if (filtradas.length === 0) {
    const vacio = document.createElement('div');
    vacio.className = 'empty-state';
    vacio.textContent = 'Ninguna incidencia correlacionada coincide con la búsqueda.';
    lista.appendChild(vacio);
    pag.hidden = true;
    return;
  }

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / CORRELACIONADAS_POR_PAGINA));
  state.correlacionadas.pagina = Math.min(state.correlacionadas.pagina, totalPaginas);
  const inicio = (state.correlacionadas.pagina - 1) * CORRELACIONADAS_POR_PAGINA;

  filtradas.slice(inicio, inicio + CORRELACIONADAS_POR_PAGINA).forEach((hija) => {
    const fila = document.createElement('ares-correlated-row');
    // En esta tabla las hijas se listan planas, sin colgar de un padre visible.
    fila.setAttribute('sin-conector', '');
    fila.data = hija;
    lista.appendChild(fila);
  });

  pag.hidden = totalPaginas === 1;
  pag.setAttribute('total-paginas', totalPaginas);
  pag.setAttribute('pagina', state.correlacionadas.pagina);
}

/* ============================================================
   Alarmas — filtro + búsqueda + PAGINACIÓN real (10/página)
   ============================================================ */
function alarmasFiltradas() {
  let subset = mockDataGestion;
  if (state.filtro === 'sin-evidencia') {
    subset = subset.filter((a) => !a.evidenciaDisponible);
  } else if (state.filtro === 'descartadas') {
    // Fase 2 — filtro nuevo. Ver mock-data-gestion.js (campo `descartada`).
    subset = subset.filter((a) => a.descartada);
  } else if (state.filtro !== 'todas') {
    subset = subset.filter((a) => a.estado === state.filtro);
  }
  if (state.busqueda) {
    const t = state.busqueda.toLowerCase();
    subset = subset.filter((a) => a.id.toLowerCase().includes(t));
  }
  return subset;
}

function renderAlarmas() {
  document.getElementById('alarmasTotalBadge').textContent = mockDataGestion.length;

  const filtradas = alarmasFiltradas();
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  state.pagina = Math.min(state.pagina, totalPaginas);
  const inicio = (state.pagina - 1) * PAGE_SIZE;
  const pagina = filtradas.slice(inicio, inicio + PAGE_SIZE);

  const list = document.getElementById('alarmList');
  list.innerHTML = '';
  if (filtradas.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No hay alarmas que coincidan con el filtro/búsqueda.';
    list.appendChild(empty);
  } else {
    pagina.forEach((alarma) => {
      const row = document.createElement('ares-alarm-row');
      row.data = alarma;
      list.appendChild(row);
    });
  }

  /* La paginación manual que vivía acá se extrajo a <ares-pagination>
     (Fase 2: el mismo control se usa en 4 lugares). Mismo comportamiento. */
  const pag = document.getElementById('alarmPag');
  pag.hidden = filtradas.length === 0;
  pag.setAttribute('total-paginas', totalPaginas);
  pag.setAttribute('pagina', state.pagina);
}

document.querySelectorAll('#alarmFilters button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#alarmFilters button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');
    state.filtro = btn.dataset.filtro;
    state.pagina = 1;
    renderAlarmas();
  });
});

document.getElementById('alarmSearch').addEventListener('input', (e) => {
  state.busqueda = e.target.value;
  state.pagina = 1;
  renderAlarmas();
});

document.getElementById('alarmPag').addEventListener('ares-cambio-pagina', (e) => {
  state.pagina = e.detail.pagina;
  renderAlarmas();
});

/* Fase 2 — buscador y paginación de las incidencias correlacionadas. */
document.getElementById('correlacionadasSearch').addEventListener('input', (e) => {
  state.correlacionadas.busqueda = e.target.value;
  state.correlacionadas.pagina = 1;
  renderCorrelacionadas();
});

document.getElementById('correlacionadasPag').addEventListener('ares-cambio-pagina', (e) => {
  state.correlacionadas.pagina = e.detail.pagina;
  renderCorrelacionadas();
});

// El detalle de una hija es esta misma pantalla, en su variante "hija".
document.getElementById('correlacionadasList').addEventListener('ares-detalles-hija', (e) => {
  window.location.href = `gestion-incidencia.html?id=${encodeURIComponent(e.detail.id)}`;
});

document.getElementById('btnVolver').addEventListener('click', () => {
  window.location.href = 'bandeja.html';
});

document.getElementById('sidebar').addEventListener('ares-nav-incidentes', () => {
  window.location.href = 'bandeja.html';
});

/* ============================================================
   Init
   ============================================================ */
renderHeader();
renderNotificationBanner();
renderCorrelacionadas();
renderEvidencia();
renderVnos();
renderInfoPanels();
renderAlarmas();
renderValidationBar();
initModales();
