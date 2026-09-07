/**
 * mock-data-gestion.js
 *
 * DATA-INPUT — sistemas reales que reemplazan este mock:
 *  - Alarmas (id/creado/estado/CI afectado): sistema de alarmas
 *    (Nokia/Huawei vía BluePlanet) + OSP para la ruta física.
 *  - Cobertura de evidencia por fabricante (gestores): Nokia/Huawei/UAA
 *    directamente, "sin respuesta" cuando ninguno contesta.
 *  - VNOs afectados, código y UIC: CMDB.
 *  - Resumen de incidente (afectación/alarmas totales): Databricks.
 *  - Registro final aprobado/rechazado: ServiceNow.
 *
 * `resolverDatosIncidencia(id)` genera detalle + alarmas para cualquier
 * `id` real de mockDataBandeja (mismo id que llega por `?id=` desde
 * bandeja.html) — `incidenciaBaseDesdeSeed()` replica la fórmula de
 * `incidenciaBase()` en mock-data-bandeja.js para que el detalle coincida
 * con lo que la fila de la bandeja ya mostró. Si no llega un id
 * reconocible, se usa `INC0270781` como incidente de demostración fijo
 * con 60 alarmas curadas (caso límite "Alarma masiva", ver INVENTORY.md).
 */

const FLAG_TYPES = ['inconsistency', 'different-integration', 'dyinggasp'];
const CARRIERS = ['Telefónica', 'Entel', 'ClaroVTR', 'DirecTV'];
const TIPOS = ['pon-loss', 'cto-indisponible', 'gasp'];
// Debe coincidir EXACTAMENTE con OLTS en mock-data-bandeja.js (ver nota allá).
const OLTS = ['OLT-VALPO-CERRO', 'OLT-STGO-CENTRO', 'OLT-CONCE-NORTE', 'OLT-ANTOF-SUR'];
const UBICACIONES = ['Valparaíso', 'Santiago', 'Concepción', 'Antofagasta'];
const CREADO_POR = ['blueplanet.integration', 'nokia.nfmp', 'huawei.u2000'];
// Integraciones que NO son BluePlanet — usadas en el flag "different-integration" (quién creó la alarma).
const OTRAS_INTEGRACIONES = ['nokia.nfmp', 'huawei.u2000', 'osp.manual'];
const CORRELACIONES = ['OLT · SLOT · temporal', 'CI · VNO · temporal', 'OLT · PUERTO · temporal'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function horaAleatoria(seed) {
  const h = seed % 24;
  const m = (seed * 7) % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function horaConSegundos(seed) {
  return `${horaAleatoria(seed)}:${pad2((seed * 13) % 60)}`;
}

function fechaCreado(seed) {
  const dia = 8 + (seed % 20);
  return `11/08/${pad2(dia)} ${horaAleatoria(seed)}`;
}

function fechaEstado(seed) {
  return `22/08/2026 ${horaAleatoria(seed + 3)}`;
}

// Misma fórmula que fecha() en mock-data-bandeja.js (base 22/08/2026),
// para que fechaInicioReal/fechaCreacion del detalle coincidan con las que
// ya se vieron en la fila de la bandeja para el mismo id.
function fecha(diaOffset) {
  const base = new Date(2026, 7, 22);
  base.setDate(base.getDate() - diaOffset);
  return `${pad2(base.getDate())}/${pad2(base.getMonth() + 1)}/${base.getFullYear()}`;
}

function ciAfectado(seed) {
  // Varía el patrón GPON simulando distintos tipos de falla/ubicación física
  const slot = 4 + (seed % 4);
  const puerto = 1 + (seed % 5);
  const ont1 = 1 + (seed % 3);
  const ont2 = 10 + (seed % 20);
  return `GPON 0/${slot}/${puerto} ${ont1}/${ont2}`;
}

function alarmaId(incidentSeed, i) {
  return `ALARM${pad2(incidentSeed)}${String(2200 + i).padStart(4, '0')}`;
}

/**
 * Genera `total` alarmas para una incidencia, con exactamente `abiertas`
 * de ellas en estado "abierto" — así el conteo real de la tabla siempre
 * coincide con el stat "N Abiertas" del header.
 */
function generarAlarmas(total, abiertas, incidentSeed) {
  const out = [];
  for (let i = 0; i < total; i++) {
    const seed = i + 1;
    const estado = i < abiertas ? 'abierto' : 'cerrado';

    let flags = [];
    if (seed % 11 === 4) {
      // Caso límite: flags combinados en la misma fila (ver INVENTORY.md).
      flags = ['inconsistency', 'dyinggasp'];
    } else if (seed % 9 === 0) {
      flags = [FLAG_TYPES[(seed / 9) % FLAG_TYPES.length]];
    }

    const evidenciaDisponible = seed % 6 !== 0;

    out.push({
      id: alarmaId(incidentSeed, i),
      creado: fechaCreado(seed),
      estado,
      estadoFecha: fechaEstado(seed),
      ciAfectado: ciAfectado(seed),
      flags,
      creadorAlarma: flags.includes('different-integration')
        ? OTRAS_INTEGRACIONES[seed % OTRAS_INTEGRACIONES.length]
        : undefined,
      evidenciaDisponible,
      /* DATA-INPUT — Fase 2, alimenta el filtro "Descartadas".
         DISEÑO-PENDIENTE: el Figma agregó ese filtro pero no definió qué
         hace que una alarma quede descartada ni de qué sistema sale el dato
         (ver DIFF-FASE2.md, P4). Acá se modela como una marca aparte del
         estado abierto/cerrado, porque una alarma puede descartarse tanto
         abierta como cerrada. Tampoco está confirmado si las descartadas
         deben restarse de los totales; por ahora NO se restan. */
      descartada: seed % 13 === 0,
    });
  }
  return out;
}

// DATA-INPUT (CMDB) — código real de la VNO. Se genera determinísticamente
// acá; en el sistema real vendría de la ficha de la VNO en el CMDB.
function vnoCodigo(incidentSeed, i) {
  const n = 1000000 + ((incidentSeed * 97 + i * 733) % 9000000);
  return `CS${n}`;
}

function generarVnos(incidentSeed) {
  const n = 2 + (incidentSeed % 3); // 2 a 4 VNOs afectadas (solo hay 4 VNOs reales)
  const out = [];
  for (let i = 0; i < n; i++) {
    const carrier = CARRIERS[(incidentSeed + i) % CARRIERS.length];
    out.push({
      carrier,
      codigo: vnoCodigo(incidentSeed, i),
      count: 40 + ((incidentSeed + i * 53) % 400),
    });
  }
  return out;
}

// Distribuye el total de evidencia realmente capturada entre los 4 fabricantes.
function generarGestores(capturadas) {
  const fabricantes = [
    { fabricante: 'nokia', nombre: 'Nokia', peso: 0.55 },
    { fabricante: 'uaa', nombre: 'UAA', peso: 0.25 },
    { fabricante: 'huawei', nombre: 'Huawei', peso: 0.15 },
    { fabricante: 'sin-respuesta', nombre: 'Sin respuesta', peso: 0.05 },
  ];
  let restante = capturadas;
  return fabricantes.map((f, i) => {
    const esUltimo = i === fabricantes.length - 1;
    const cantidad = esUltimo ? restante : Math.min(restante, Math.round(capturadas * f.peso));
    restante -= cantidad;
    return { fabricante: f.fabricante, label: `${f.nombre} · ${cantidad}` };
  });
}

/**
 * Ids reales de bandeja.html tienen forma INC02708NN con NN=31..75 (ver
 * mock-data-bandeja.js, incidenciaBase — seed = NN - 30, 1..45). Se
 * invierte acá para recrear el mismo seed y así regenerar los mismos
 * datos base que ya se vieron en la fila de la bandeja.
 */
function seedFromId(id) {
  const m = /^INC02708(\d{2})$/.exec(id || '');
  if (!m) return null;
  const seed = Number(m[1]) - 30;
  if (seed < 1 || seed > 45) return null;
  return seed;
}

/* ============================================================
   Fase 2 — incidencias correlacionadas (padre / hija)
   ============================================================ */

/* Réplica intencional de hijasPara() en mock-data-bandeja.js: las dos
   pantallas son documentos separados que regeneran su propio mock, así que
   la fórmula tiene que coincidir para que el detalle muestre exactamente
   las mismas hijas que la fila de la bandeja ya listó. */
function hijasParaSeed(seed, oltPadre) {
  const n = 2 + (seed % 11);
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = seed + i * 3;
    out.push({
      id: `INC027${String(1000 + seed * 20 + i).padStart(4, '0')}`,
      tipoIncidente: TIPOS[s % TIPOS.length],
      olt: oltPadre,
      puerto: `PON 0/${s % 8}/${s % 4}`,
      confiabilidad: [95, 88, 72, 61, 45, 38, 12][s % 7],
    });
  }
  return out;
}

/**
 * Inverso de la fórmula de id de hijasParaSeed(): dado el id de una HIJA,
 * devuelve { seedPadre, indice }. Permite abrir el detalle de una hija
 * directamente por URL (?id=INC0271020) y reconstruir su breadcrumb.
 */
function hijaDesdeId(id) {
  const m = /^INC027(\d{4})$/.exec(id || '');
  if (!m) return null;
  const n = Number(m[1]);
  if (n < 1000) return null; // INC02708NN es un padre, no una hija
  const resto = n - 1000;
  const seedPadre = Math.floor(resto / 20);
  const indice = resto % 20;
  if (seedPadre < 1 || seedPadre > 45) return null;
  return { seedPadre, indice };
}

// Réplica intencional de estadoCerrado() en mock-data-bandeja.js.
function estadoCerradoDesdeSeed(seed, agrupacion) {
  if (agrupacion === 'individual') {
    return seed % 4 === 0 ? 'evidencia-rechazada' : 'evidencia-aprobada';
  }
  const ciclo = seed % 3;
  if (ciclo === 0) return 'evidencia-rechazada';
  if (ciclo === 1) return 'correlacion-aprobada';
  return 'correlacion-rechazada';
}

// Réplica intencional de incidenciaBase()/estado en mock-data-bandeja.js
// (mismos rangos: 1-6 pendiente, 7-14 en-curso, 15-45 aprobada/rechazada).
// El estado "de fábrica" se pisa con lo guardado en sessionStorage (ver
// estado-store.js) si existe, reflejando acciones tomadas en cualquiera
// de las 2 pantallas.
function incidenciaBaseDesdeSeed(seed) {
  const afectacionTotal = 120 + ((seed * 37) % 900);
  const id = `INC02708${String(30 + seed).padStart(2, '0')}`;
  const agrupacion = seed % 3 !== 0 ? 'consolidacion' : 'individual';

  let estado;
  if (seed <= 6) {
    estado = 'pendiente';
  } else if (seed <= 14) {
    /* Réplica del bucle "En curso" de mock-data-bandeja.js: algunas
       consolidaciones ya tienen la evidencia aprobada y están esperando la
       validación de correlación (etapa "correlacion-pendiente"). El índice
       del bucle allá es i = seed - 1. */
    const i = seed - 1;
    estado = agrupacion === 'consolidacion' && i % 4 === 0 ? 'evidencia-aprobada' : 'en-curso';
  } else {
    estado = estadoCerradoDesdeSeed(seed, agrupacion);
  }

  const estadoGuardado = leerEstadoGuardado(id);
  if (estadoGuardado) estado = estadoGuardado;

  return {
    id,
    estado,
    agrupacion,
    tipoIncidente: TIPOS[seed % TIPOS.length],
    afectacionTotal,
    afectacionReales: Math.round(afectacionTotal * (0.65 + (seed % 4) * 0.05)),
    alarmasTotalObjetivo: 4 + (seed % 20),
    alarmasAbiertasObjetivo: 1 + (seed % 9),
  };
}

function generarDatosIncidencia(id) {
  const seed = seedFromId(id);
  if (seed === null) return null;

  const base = incidenciaBaseDesdeSeed(seed);
  const abiertas = Math.min(base.alarmasAbiertasObjetivo, base.alarmasTotalObjetivo);
  const alarmas = generarAlarmas(base.alarmasTotalObjetivo, abiertas, seed);
  const capturadas = alarmas.filter((a) => a.evidenciaDisponible).length;
  const sinCapturar = alarmas.length - capturadas;
  const cobertura = alarmas.length ? Math.round((capturadas / alarmas.length) * 100) : 0;

  const incidenteDetalle = {
    id: base.id,
    estado: base.estado,
    tipoIncidente: base.tipoIncidente,
    fechaInicioReal: fecha(seed % 10),
    fechaCreacion: fecha((seed % 10) + 1),
    afectacionTotal: base.afectacionTotal,
    afectacionReales: base.afectacionReales,
    alarmasTotal: alarmas.length,
    alarmasAbiertas: alarmas.filter((a) => a.estado === 'abierto').length,
    vnos: generarVnos(seed),
    olt: OLTS[seed % OLTS.length],
    ubicacion: UBICACIONES[seed % UBICACIONES.length],
    // --- Fase 2 ---
    agrupacion: base.agrupacion,
    // Las hijas alimentan la sección "Incidencias Correlacionadas".
    hijas: base.agrupacion === 'consolidacion' ? hijasParaSeed(seed, OLTS[seed % OLTS.length]) : [],
    esHija: false,
    padreId: null,
    /* Solo se puede gestionar la incidencia que el usuario tiene asignada
       Y que además sigue requiriendo acción (etapa evidencia-pendiente o
       correlacion-pendiente). La de un compañero, o una ya cerrada, se ve
       en "Detalles" pero sin barra. Ver etapaDeGestion() en estado-store.js. */
    puedeGestionar:
      estaEnGestion({ estado: base.estado, agrupacion: base.agrupacion }) &&
      base.id === leerIncidenciaActivaGuardada(),
    gestores: generarGestores(capturadas),
    evidenciaCapturadas: capturadas,
    evidenciaSinCapturar: sinCapturar,
    evidenciaCobertura: `${cobertura}%`,
    rutaFisica: {
      olt: OLTS[seed % OLTS.length],
      cap: `CAP-${200 + seed}`,
      fibraTroncal: `F-${1000 + seed * 7}-A`,
      slots: `0/${4 + (seed % 4)} · 0/${5 + (seed % 3)}`,
      puertosPon: 4 + (seed % 8),
    },
    origen: {
      creacion: `${fecha((seed % 10) + 1)} ${horaConSegundos(seed)}`,
      inicioReal: `${fecha(seed % 10)} ${horaConSegundos(seed)}`,
      alarmaMasReciente: `${fecha(seed % 10)} ${horaConSegundos(seed + 5)}`,
      creadoPor: CREADO_POR[seed % CREADO_POR.length],
      correlacion: CORRELACIONES[seed % CORRELACIONES.length],
    },
  };

  return { incidenteDetalle, alarmas };
}

/**
 * Detalle de una incidencia HIJA (Fase 2).
 *
 * Es la misma pantalla de gestión, en su variante "hija": sin la sección
 * "Incidencias Correlacionadas" (una hija no agrupa a nadie) y con el
 * breadcrumb padre → hija en el header.
 *
 * DISEÑO-PENDIENTE: el Figma muestra la pantalla de la hija siempre sin
 * barra de acción, así que acá `puedeGestionar` es siempre false — la
 * decisión de aprobar/rechazar se toma sobre el padre, no sobre cada hija.
 * Falta confirmar si una hija podría gestionarse por separado.
 */
function generarDatosIncidenciaHija(id) {
  const ref = hijaDesdeId(id);
  if (!ref) return null;

  const { seedPadre, indice } = ref;
  const padre = incidenciaBaseDesdeSeed(seedPadre);
  if (padre.agrupacion !== 'consolidacion') return null;

  const oltPadre = OLTS[seedPadre % OLTS.length];
  const hija = hijasParaSeed(seedPadre, oltPadre)[indice];
  if (!hija) return null;

  // Una hija es un caso más chico que su padre: menos alarmas, menos afectación.
  const seed = seedPadre + indice * 3;
  const total = 3 + (seed % 8);
  const abiertas = Math.min(1 + (seed % 4), total);
  const alarmas = generarAlarmas(total, abiertas, seedPadre + 50 + indice);
  const capturadas = alarmas.filter((a) => a.evidenciaDisponible).length;
  const sinCapturar = alarmas.length - capturadas;
  const cobertura = alarmas.length ? Math.round((capturadas / alarmas.length) * 100) : 0;
  const afectacionTotal = 40 + ((seed * 17) % 260);

  const incidenteDetalle = {
    id: hija.id,
    estado: padre.estado, // la hija hereda la etapa del padre: se gestionan juntas
    tipoIncidente: hija.tipoIncidente,
    fechaInicioReal: fecha(seed % 10),
    fechaCreacion: fecha((seed % 10) + 1),
    afectacionTotal,
    afectacionReales: Math.round(afectacionTotal * 0.7),
    alarmasTotal: alarmas.length,
    alarmasAbiertas: alarmas.filter((a) => a.estado === 'abierto').length,
    vnos: generarVnos(seedPadre + indice),
    olt: hija.olt,
    ubicacion: UBICACIONES[seedPadre % UBICACIONES.length],
    // --- Fase 2 ---
    agrupacion: 'individual', // una hija no agrupa a nadie
    hijas: [],
    esHija: true,
    padreId: padre.id,
    confiabilidad: hija.confiabilidad, // DATA-INPUT — score con que se correlacionó
    puedeGestionar: false,
    gestores: generarGestores(capturadas),
    evidenciaCapturadas: capturadas,
    evidenciaSinCapturar: sinCapturar,
    evidenciaCobertura: `${cobertura}%`,
    rutaFisica: {
      olt: hija.olt,
      cap: `CAP-${200 + seedPadre}`,
      fibraTroncal: `F-${1000 + seedPadre * 7}-A`,
      slots: `0/${4 + (seed % 4)} · 0/${5 + (seed % 3)}`,
      puertosPon: 2 + (seed % 5),
    },
    origen: {
      creacion: `${fecha((seed % 10) + 1)} ${horaConSegundos(seed)}`,
      inicioReal: `${fecha(seed % 10)} ${horaConSegundos(seed)}`,
      alarmaMasReciente: `${fecha(seed % 10)} ${horaConSegundos(seed + 5)}`,
      creadoPor: CREADO_POR[seed % CREADO_POR.length],
      correlacion: CORRELACIONES[seedPadre % CORRELACIONES.length],
    },
  };

  return { incidenteDetalle, alarmas };
}

/**
 * Incidente de demostración fijo — se usa cuando no llega un `id`
 * reconocible por la URL. 60 alarmas curadas (caso límite "Alarma
 * masiva" de INVENTORY.md, con al menos 1 fila sin evidencia y 1 fila
 * con flags combinados).
 */
const mockDataGestionDefault = [];
for (let i = 0; i < 60; i++) {
  const seed = i + 1;
  const estado = seed % 20 < 13 ? 'abierto' : 'cerrado';

  let flags = [];
  if (seed === 4) {
    flags = ['inconsistency', 'dyinggasp'];
  } else if (seed % 9 === 0) {
    flags = [FLAG_TYPES[(seed / 9) % FLAG_TYPES.length]];
  }

  const evidenciaDisponible = !(seed === 4 || seed === 10 || seed % 17 === 0);

  mockDataGestionDefault.push({
    id: `ALARM002022${String(30 + seed).padStart(2, '0')}`,
    creado: fechaCreado(seed),
    estado,
    estadoFecha: fechaEstado(seed),
    ciAfectado: ciAfectado(seed),
    flags,
    creadorAlarma: flags.includes('different-integration')
      ? OTRAS_INTEGRACIONES[seed % OTRAS_INTEGRACIONES.length]
      : undefined,
    evidenciaDisponible,
    descartada: seed % 13 === 0, // DATA-INPUT — ver generarAlarmas()
  });
}

const capturadasDefault = mockDataGestionDefault.filter((a) => a.evidenciaDisponible).length;
const sinCapturarDefault = mockDataGestionDefault.length - capturadasDefault;
const coberturaDefault = Math.round((capturadasDefault / mockDataGestionDefault.length) * 100);

const incidenteDetalleDefault = {
  id: 'INC0270781',
  estado: 'en-curso',
  tipoIncidente: 'pon-loss',
  fechaInicioReal: '22/08/2026',
  fechaCreacion: '21/08/2026',
  afectacionTotal: 1850,
  afectacionReales: 1240,
  alarmasTotal: mockDataGestionDefault.length,
  alarmasAbiertas: mockDataGestionDefault.filter((a) => a.estado === 'abierto').length,
  vnos: [
    { carrier: 'Telefónica', codigo: vnoCodigo(81, 0), count: 350 },
    { carrier: 'Entel', codigo: vnoCodigo(81, 1), count: 450 },
    { carrier: 'ClaroVTR', codigo: vnoCodigo(81, 2), count: 290 },
    { carrier: 'DirecTV', codigo: vnoCodigo(81, 3), count: 150 },
  ],
  olt: 'OLT-VALPO-CERRO',
  ubicacion: 'Valparaíso',
  // --- Fase 2 ---
  // El incidente de demostración es una consolidación, para que la pantalla
  // por defecto muestre la sección "Incidencias Correlacionadas".
  agrupacion: 'consolidacion',
  hijas: hijasParaSeed(81, 'OLT-VALPO-CERRO'),
  esHija: false,
  padreId: null,
  // Por defecto pendiente de gestión (muestra ares-validation-bar). Se
  // puede forzar el otro caso con ?gestionar=false en la URL — ambos
  // casos viven en este mismo archivo, según lo pedido.
  puedeGestionar: true,
  gestores: [
    { fabricante: 'nokia', label: 'Nokia · 38' },
    { fabricante: 'uaa', label: 'UAA · 10' },
    { fabricante: 'huawei', label: 'Huawei · 6' },
    { fabricante: 'sin-respuesta', label: 'Sin respuesta · 1' },
  ],
  evidenciaCapturadas: capturadasDefault,
  evidenciaSinCapturar: sinCapturarDefault,
  evidenciaCobertura: `${coberturaDefault}%`,
  rutaFisica: {
    olt: 'OLT-VALPO-CERRO',
    cap: 'CAP-VAL-208',
    fibraTroncal: 'F-1180-A',
    slots: '0/4 · 0/5',
    puertosPon: 6,
  },
  origen: {
    creacion: '31/07/2026 13:41:12',
    inicioReal: '31/07/2026 13:41:12',
    alarmaMasReciente: '31/07/2026 13:52:04',
    creadoPor: 'blueplanet.integration',
    correlacion: 'OLT · SLOT · temporal',
  },
};

// Un estado guardado en sessionStorage pisa el "de fábrica".
const _estadoGuardadoDefault = leerEstadoGuardado(incidenteDetalleDefault.id);
if (_estadoGuardadoDefault) {
  incidenteDetalleDefault.estado = _estadoGuardadoDefault;
  incidenteDetalleDefault.puedeGestionar = estaEnGestion(incidenteDetalleDefault);
}

/**
 * Punto de entrada usado por gestion-incidencia.js. Recibe el `id` leído
 * de `?id=` en la URL y devuelve `{ incidenteDetalle, alarmas }` — real y
 * generado si el id es reconocible, o el incidente de demostración fijo
 * si no.
 */
function resolverDatosIncidencia(id) {
  // 1) ¿Es una incidencia padre de la bandeja? (INC02708NN)
  const generado = generarDatosIncidencia(id);
  if (generado) return generado;
  // 2) ¿Es una incidencia hija correlacionada? (INC027NNNN, Fase 2)
  const hija = generarDatosIncidenciaHija(id);
  if (hija) return hija;
  // 3) Si no, el incidente de demostración fijo.
  return { incidenteDetalle: incidenteDetalleDefault, alarmas: mockDataGestionDefault };
}
