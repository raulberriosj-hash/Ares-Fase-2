/**
 * types.js — Modelos de datos para los componentes compuestos de ARES.
 *
 * Solo JSDoc typedefs — no hay runtime aquí, es documentación de tipos para
 * editores/herramientas (no hay TypeScript en el proyecto).
 *
 * Convención: cualquier campo marcado "DATA-INPUT" no tiene una fuente de
 * datos real confirmada todavía (no hay tabla de sistemas de origen definida
 * en INVENTORY.md) — representa datos que en producción vendrían de un
 * backend/API, y hoy se pasan como prop sin que exista ese contrato.
 */

/* ============================================================
   Sub-tipos compartidos
   ============================================================ */

/**
 * @typedef {'pon-loss'|'cto-indisponible'|'gasp'} ProblemaTipo
 */

/**
 * @typedef {'pendiente'|'aprobada'|'rechazada'|'en-curso'} IncidenteEstado
 */

/**
 * @typedef {Object} VnoAfectado
 * @property {string} carrier - DATA-INPUT. Uno de los 4 VNOs: "Telefónica", "Entel", "ClaroVTR", "DirecTV".
 * @property {string} codigo - DATA-INPUT. Código real de la VNO en CMDB, ej. "CS1135202".
 * @property {number} count - DATA-INPUT. Cantidad de casos de ese carrier.
 */

/**
 * @typedef {Object} Responsable
 * @property {string} iniciales - DATA-INPUT. Ej. "RB". Mostradas en el avatar.
 * @property {string} nombre - DATA-INPUT. Ej. "Raúl Berríos".
 * @property {string} [rol] - DATA-INPUT. Ej. "Trabajador NOC".
 */

/**
 * @typedef {Object} IncidentSummary
 * Resumen compacto de una incidencia — el mismo bloque de datos se repite
 * dentro de ares-incident-row y dentro de los 3 modales de gestión
 * (asignación, validación, liberar)
 * @property {string} id - DATA-INPUT. Ej. "INC0270808".
 * @property {IncidenteEstado} estado
 * @property {ProblemaTipo} tipoIncidente
 * @property {string} fechaInicioReal - DATA-INPUT. Formateada, ej. "22/08/2026".
 * @property {string} fechaCreacion - DATA-INPUT. Formateada, ej. "21/08/2026".
 * @property {number} afectacionTotal - DATA-INPUT. Ej. 431.
 * @property {number} afectacionReales - DATA-INPUT. Ej. 346.
 * @property {number} alarmasTotal - DATA-INPUT. Ej. 15.
 * @property {number} alarmasAbiertas - DATA-INPUT. Ej. 9.
 * @property {VnoAfectado[]} vnos - DATA-INPUT.
 * @property {boolean} [masDe24Horas] - DATA-INPUT. Alimenta el KPI "Inc con más de 24 horas".
 * @property {boolean} [enTerreno] - DATA-INPUT. Alimenta el KPI "Inc en terreno".
 * @property {string} [olt] - DATA-INPUT. Ej. "OLT-VALPO-CERRO". Fase 2: la fila de
 *   bandeja muestra el OLT en la columna donde antes iban los chips de VNO.
 * @property {'consolidacion'|'individual'} [agrupacion] - Fase 2. "consolidacion" =
 *   incidencia padre que agrupa hijas correlacionadas (fila expandible);
 *   "individual" = no agrupa nada. Si no viene, ares-incident-row lo deduce de
 *   si `hijas` trae elementos.
 * @property {IncidenciaCorrelacionada[]} [hijas] - DATA-INPUT. Fase 2. Solo cuando
 *   `agrupacion` es "consolidacion".
 */

/**
 * @typedef {Object} IncidenciaCorrelacionada
 * Incidencia HIJA dentro de una consolidación. Nuevo en Fase 2.
 * Consumido por <ares-correlated-row>.
 * @property {string} id - DATA-INPUT. Ej. "INC0270808".
 * @property {ProblemaTipo} tipoIncidente - DATA-INPUT.
 * @property {string} olt - DATA-INPUT. Ej. "OLT-VALPO-CERRO".
 * @property {string} puerto - DATA-INPUT. Ej. "PON 0/4/2".
 * @property {number} [confiabilidad] - DATA-INPUT. Score 0–100 de qué tan segura es
 *   la correlación propuesta. Si no viene, no se muestra el tag.
 *   Los umbrales de color están en ares-confiabilidad-tag (DISEÑO-PENDIENTE, ver
 *   DIFF-FASE2.md P2). Origen probable: el motor de correlación, no ServiceNow.
 */

/**
 * @typedef {Object} IncidentDetalle
 * Superset de IncidentSummary usado por gestion-incidencia.html
 * (`incidenteDetalle`, ver mock-data-gestion.js / `resolverDatosIncidencia()`).
 * Incluye todos los campos de IncidentSummary más:
 * @property {string} olt - DATA-INPUT. Ej. "OLT-VALPO-CERRO".
 * @property {string} ubicacion - DATA-INPUT. Ej. "Valparaíso".
 * @property {boolean} puedeGestionar - DATA-INPUT. Determina si `<ares-validation-bar>`
 *   se muestra (vía atributo, no vía `.data` — ver ValidationBarData). true solo
 *   si la incidencia está "en-curso" Y asignada al usuario actual — un compañero
 *   puede ver el detalle pero no gestionarla.
 * @property {{fabricante: string, label: string}[]} gestores - DATA-INPUT. Desglose de
 *   evidencia capturada por fabricante/integración.
 * @property {number} evidenciaCapturadas - DATA-INPUT. Debe coincidir con la cantidad real
 *   de alarmas con `evidenciaDisponible: true`.
 * @property {number} evidenciaSinCapturar - DATA-INPUT. Ídem, debe coincidir con
 *   `evidenciaDisponible: false`.
 * @property {string} evidenciaCobertura - DATA-INPUT. Formateada como porcentaje, ej. "92%".
 * @property {{olt: string, cap: string, fibraTroncal: string, slots: string, puertosPon: number}} rutaFisica - DATA-INPUT.
 * @property {{creacion: string, inicioReal: string, alarmaMasReciente: string, creadoPor: string, correlacion: string}} origen - DATA-INPUT.
 */

/* ============================================================
   <ares-alarm-row>
   ============================================================ */

/**
 * @typedef {'dyinggasp'|'inconsistency'|'different-integration'} AlarmFlagType
 */

/**
 * @typedef {Object} AlarmRowData
 * @property {string} id - DATA-INPUT. Ej. "ALARM00202234". Origen: sistema de alarmas (BluePlanet).
 * @property {string} creado - DATA-INPUT. Fecha de creación formateada, ej. "11/08/08 12:43".
 * @property {'abierto'|'cerrado'} estado
 * @property {string} estadoFecha - DATA-INPUT. Fecha asociada al estado, ej. "22/08/2026 11:34".
 * @property {string} ciAfectado - DATA-INPUT. Ej. "GPON 0/4/3 1/1/13".
 * @property {AlarmFlagType[]} flags - 0, 1 o más flags simultáneos (no son mutuamente excluyentes — INVENTORY.md, casos límite).
 * @property {string} [creadorAlarma] - DATA-INPUT. Solo relevante si `flags` incluye "different-integration" —
 *   qué integración creó la alarma en vez de BluePlanet (ver ares-tooltip-flag.js, atributo `creador`).
 * @property {boolean} evidenciaDisponible - false → botón de evidencia en estado disabled (caso límite: evidencia faltante).
 */

/* ============================================================
   <ares-incident-row>
   ============================================================ */

/**
 * @typedef {'pendiente'|'en-curso'|'historico'} IncidentRowVariante
 * Determina alto, qué botones se muestran y si aparece el responsable —
 * NO determina el `estado` del badge (historico puede ser aprobada o
 * rechazada; se pasa por separado en IncidentSummary.estado).
 */

/**
 * @typedef {Object} IncidentRowData
 * @property {IncidentSummary} incidencia
 * @property {Responsable} [responsable] - Solo se usa/renderiza cuando variante es "en-curso" o "historico".
 * @property {boolean} [esPropia] - true si es la incidencia que el usuario actual tiene asignada — avatar celeste y label "Tu Incidencia" en vez de "Responsable".
 */

/* ============================================================
   <ares-kpi-bar-detallada> / <ares-kpi-bar-resumen>
   ============================================================ */

/**
 * @typedef {Object} KpiBarDetalladaData
 * Tarjeta de "VNOs Afectadas" — lista de chips por carrier.
 * @property {VnoAfectado[]} vnos - DATA-INPUT.
 */

/**
 * @typedef {Object} KpiBarResumenData
 * Tarjeta genérica de estadística (título + valor).
 * @property {string} titulo - Ej. "Afectación total". No es DATA-INPUT: es config de qué stat se muestra.
 * @property {string} valor - DATA-INPUT. Ej. "1.984 Afectados".
 */

/* ============================================================
   <ares-validation-bar> — barra "Validación de consolidación"
   ============================================================ */

/**
 * @typedef {Object} ValidationBarData
 * @property {number} alarmasCount - DATA-INPUT. Ej. 60. Se usa en la variante
 *   "evidencias" ("60 alarmas · Nada se escribe...").
 * @property {number} [incCorrelacionadasCount] - DATA-INPUT. Ej. 5. Requerido
 *   solo en la variante "correlacion" ("5 INC correlacionadas · ...").
 *
 * Nota: la visibilidad de la barra no se controla vía `.data`. Depende de dos
 * atributos del elemento:
 *   - `puede-gestionar` (booleano), calculado en IncidentDetalle.puedeGestionar;
 *   - `variante` ("evidencias" | "correlacion"), que en Fase 2 depende de en
 *     qué etapa del flujo está la incidencia. En los estados terminales no se
 *     renderiza la barra sino un <ares-notification-banner>.
 */

/* ============================================================
   <ares-assignment-modal> — cubre Modal_confirma_asignacion /
   Modal_cambio_asignacion
   ============================================================ */

/**
 * @typedef {'confirmar'|'cambio'} AssignmentModalModo
 */

/**
 * @typedef {Object} AssignmentModalData
 * @property {AssignmentModalModo} modo
 * @property {IncidentSummary} incidenciaNueva - La incidencia que se está por tomar.
 * @property {IncidentSummary} [incidenciaActual] - Solo requerido cuando modo="cambio": la incidencia que el usuario ya tiene tomada y que volverá a pendientes.
 */

/* ============================================================
   <ares-validation-modal> — cubre Modal_aprobar / Modal_rechazar
   ============================================================ */

/**
 * @typedef {'aprobar'|'rechazar'} ValidationModalAccion
 */

/**
 * @typedef {Object} ValidationModalData
 * @property {ValidationModalAccion} accion
 * @property {IncidentSummary} incidencia
 */

/* ============================================================
   <ares-release-modal> — cubre Modal_liberar
   ============================================================ */

/**
 * @typedef {Object} ReleaseModalData
 * @property {IncidentSummary} incidencia
 */

/* ============================================================
   <ares-evidence-modal> — cubre Modal_imagen_evidencia
   ============================================================ */

/**
 * @typedef {Object} EvidenceModalData
 * @property {string} alarmaId - DATA-INPUT. Ej. "ALARM00202229".
 * @property {string} [imagenUrl] - DATA-INPUT. Si no se provee, se muestra el placeholder.
 */

/* ============================================================
   <ares-sidebar>
   ============================================================ */

/**
 * @typedef {Object} SidebarData
 * @property {boolean} expandido
 */
