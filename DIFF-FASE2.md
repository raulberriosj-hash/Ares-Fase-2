# DIFF-FASE2.md — ARES

Diagnóstico de qué cambió entre **Fase 1** (implementada) y **Fase 2** (Figma).
**No se escribió ni modificó código de componentes.** Este documento es solo el levantamiento.

| | |
|---|---|
| **Figma Fase 1** | [ARES](https://www.figma.com/design/4dMyRiM1uNDGjr7pbfMsJl/ARES?node-id=0-1) (`4dMyRiM1uNDGjr7pbfMsJl`) |
| **Figma Fase 2** | [ARES Fase 2](https://www.figma.com/design/FTOwcJzU7y9CgcKFFK8RVi/ARES-Fase-2?node-id=0-1) (`FTOwcJzU7y9CgcKFFK8RVi`) |
| **Código de referencia** | `/Users/raulberrios/Desktop/ARES` tal como quedó al cierre de Fase 1 |
| **Método** | `get_metadata` del archivo completo + inspección visual de las 14 pantallas y las 6 secciones de componentes, contrastado contra el código real (`components/*.js`, `bandeja.js`, `gestion-incidencia.js`, `tokens.css`, `types.js`) |

> ### ⚠️ Nota de método
>
> **`BUGS.md` no existe y `INVENTORY.md` quedó fuera del proyecto** (en `/Users/raulberrios/Desktop/INVENTORY.md`). Confirmado con el autor: **ambos se eliminaron a propósito durante la limpieza previa al handoff**, no se perdieron.
>
> Consecuencia práctica: este diagnóstico **no pudo contrastar el código contra las correcciones de QA de Fase 1**, porque ese registro ya no existe. Se verificó contra el **código fuente real**, que es la fuente de verdad disponible y de hecho la más confiable. `INVENTORY.md` se usó como referencia del Figma de Fase 1.
>
> Queda un riesgo abierto, no bloqueante: sin el registro de QA, Fase 2 puede volver a introducir bugs que ya se resolvieron una vez. Ver P17.

---

## Resumen ejecutivo

Fase 2 no es un ajuste cosmético: **introduce un modelo de datos nuevo (incidencias padre/hija correlacionadas con score de confiabilidad) y convierte la aprobación en un flujo de dos etapas** (primero Evidencia, después Correlación). Eso arrastra cambios en la máquina de estados, en la fila de bandeja, en la barra de acción y en la pantalla de detalle.

| Categoría | Cantidad |
|---|---|
| 🆕 NUEVO | 10 pantallas + 1 concepto de dominio + 16 componentes/secciones |
| 🔁 MODIFICADO | 13 elementos existentes |
| ➖ SIN CAMBIOS | 17 componentes |
| ❌ POSIBLEMENTE ELIMINADO | 6 (ninguno confirmado como pérdida real de función) |
| ❓ Preguntas abiertas | **16 abiertas** + 2 ya resueltas (P1, P17) |

**Los 3 cambios de mayor impacto en el código actual**, por si sirve para dimensionar:

1. `ares-status-badge` pasa de 4 a 6 estados **y los 4 actuales cambian de texto** → toca bandeja, gestión, modales e histórico a la vez.
2. `ares-incident-row` / `ares-incident-summary` se rediseñan por completo (fila alta con chips de VNO → fila compacta expandible con hijas).
3. `ares-validation-bar` pasa a tener 2 variantes con copy, color y semántica distintas, y deja de ser el único disparador de cierre del flujo.

---

## 🆕 NUEVO

### N1. Concepto de dominio: incidencias correlacionadas (padre / hija)

El cambio estructural de Fase 2. Una incidencia ahora es de uno de dos tipos:

- **Consolidación** — es una *Incidencia Padre* que agrupa N *Incidencias Hijas* correlacionadas. En la fila de bandeja se muestra como `Consolidación` + un badge con la cantidad (`6`), y la fila es **expandible**.
- **Individual** — no agrupa nada. En la fila se muestra como `Individual`, y el control de expandir aparece **deshabilitado** (un punto gris en lugar del chevron).

Cada incidencia hija trae un **score de confiabilidad** (`Confiabilidad 90%`) que indica qué tan segura es la correlación propuesta. Nada de esto existe en Fase 1: hoy `IncidentSummary` (`types.js`) no tiene ni tipo, ni padre, ni hijas, ni score.

### N2. Pantallas nuevas (10)

| Pantalla | Node ID | Qué es |
|---|---|---|
| `02_detalle_correlacion` | `2124:8811` | Detalle de una incidencia padre **en modo consulta** (sin barra de acción). Estado `Gestión Pendiente`. |
| `02_detalle_individual` | `2124:9013` | Ídem, para una incidencia individual (sin la sección "Incidencias Correlacionadas"). |
| `02_gestion_individual` | `2121:7984` | Gestión de una incidencia individual **con** barra de acción. Idéntica a la de correlación pero sin la sección de correlacionadas (de ahí 1303px vs 1738px de alto). |
| `02_detalles_correlacion_INC_hija` | `2124:9894` | Detalle de una incidencia **hija**, con breadcrumb `INC padre → INC hija` en el header. |
| `03_gestion_correlacion_evidencia_aprobada` | `2103:4206` | Evidencia ya aprobada, **correlación aún pendiente**. Banner morado + barra de acción morada de correlación. Es el paso intermedio del flujo de 2 etapas. |
| `03_gestion_correlacion_evidencia_rechazada` | `2103:4863` | Evidencia rechazada. Banner rojo, sin barra. |
| `03_gestion_individual_aprobada` | `2117:5328` | Equivalente para incidencia individual. |
| `03_gestion_individual_rechazada` | `2117:6558` | Equivalente para incidencia individual. |
| `04_gestion_correlacion_aprobada` | `2117:7379` | Estado terminal: correlación aprobada. Banner verde, sin barra. |
| `04_gestion_correlacion_rechazada` | `2117:6931` | Estado terminal: correlación rechazada. Banner rojo, sin barra. |

### N3. Flujo nuevo: aprobación en dos etapas

Fase 1 tenía una sola decisión (aprobar/rechazar consolidación) y ahí terminaba. Fase 2 encadena dos:

```
02_gestion_*  (Gestión en Curso)
      │  barra TEAL — "Validación de consolidación de Evidencias"
      │  [Rechazar] [✓ Aprobar Evidencias]
      │
      ├── rechazar ──▶ 03_*_evidencia_rechazada   (Evidencia Rechazada · terminal, sin barra)
      │
      └── aprobar  ──▶ 03_*_evidencia_aprobada    (Evidencia Aprobada · Correlación Pendiente)
                              │  banner morado informativo
                              │  barra MORADA — "Validación Incidencias Correlacionadas"
                              │  [Rechazar] [✓ Aprobar correlación de Incidentes]
                              │
                              ├── rechazar ──▶ 04_gestion_correlacion_rechazada  (terminal)
                              └── aprobar  ──▶ 04_gestion_correlacion_aprobada   (terminal)
```

En los 4 estados terminales la barra de acción **desaparece** y en su lugar aparece un banner de notificación arriba del contenido. Confirmado visualmente en `2103:4206` y `2117:7379`.

### N4. Componentes nuevos

| Componente | Node ID | Variantes | Qué controla |
|---|---|---|---|
| `Confiabilidad` | `2080:4335` | 3 (verde 90%, naranja 60%, rojo 1%) | Score de confianza de una incidencia hija. Texto fijo "Confiabilidad" + porcentaje. El color depende del valor; **los umbrales no están definidos** (→ P2). |
| `button/opentable` | `2047:3484` | Default, hover, pressed, focus, **disabled** | Chevron de expandir/colapsar la fila. `disabled` = fila `Individual`, que no tiene hijas. |
| `notifications` | `2117:5776` | 5 | Banner informativo del resultado de la gestión. Ver N5. |
| `tabla/row_desplegable_consolidacion_pendiente` | `2030:5048` | Default, hover, pressed, **focus** | Fila expandible de bandeja **Pendientes**. La variante `focus` (522px) es el estado **expandido**: lista las hijas con su Confiabilidad y **tiene su propia paginación anidada**. |
| `tabla/row_desplegable_consolidacion` | `2140:12117` | Default, hover, pressed, focus | Ídem, para En Curso / Histórico (sin botón "Tomar INC"). |
| `tabla/row_consolidacion_pendiente` | `2030:3383` | — | Fila de consolidación colapsada, tab Pendientes. |
| `tabla/row_consolidacion` | `2140:12410` | — | Fila de consolidación colapsada, otros tabs. |
| `tabla/row_individual_pendiente` | `2080:4368` | individual, hover | Fila de incidencia individual, tab Pendientes. |
| `tabla/row_individual_consolidacion` | `2189:4878` | individual, hover | Fila individual en contexto de consolidación. |
| `tabla/row_conssolidacion_individual` *(sic)* | `2030:4280` | — | Cuarta variante de fila. **Su diferencia con las anteriores no es evidente** (→ P13). |
| `tabla/row_detalles_indicencias_correlacionadas` *(sic)* | `2089:5030` | Default, hover | Fila de la tabla "Incidencias Correlacionadas" dentro del detalle. |
| `tabla/data` | `2055:3801` | — | Celda genérica de dato. |
| `ic/sub` | `2047:3405` | — | Conector de árbol (`└`) que precede a cada hija en la fila expandida. |
| `ic/alarm` | `2103:2771` | — | Ícono de sirena del título "Alarmas" y de la barra teal. |
| `si:ai-note-line` *(sic — nombre de librería externa, no sigue `ic/*`)* | `2103:2783` | — | Ícono de los modales de correlación y de la barra morada. |
| `cantidad_INC` | `2196:8280` | — | Badge numérico junto a "Consolidación". |

### N5. Banners de notificación (`notifications`, `2117:5776`)

Cinco variantes, todas con ícono + título + descripción, ancho completo, sobre el contenido:

| Variante | Color | Texto |
|---|---|---|
| `Correlación Rechazada` | rojo | "La correlación de Incidencias fue rechazada por un especialista, por lo que ahora deberá ser gestionada internamente a través de ServiceNow." |
| `Correlación Aprobada` | verde | "La correlación de Incidencias fue aprobada por un especialista y ha sido actualizada en ServiceNow." |
| `Evidencia Rechazada` | rojo | "La evidencia de esta Incidencia fue rechazada por un especialista, por lo que ahora deberá ser gestionada internamente a través de ServiceNow." |
| `Incidencia Aprobada` | verde | "La evidencia de esta Incidencia fue aprobada por un especialista y ha sido actualizada en ServiceNow." |
| `Evidencia Aprobada · Correlación Pendiente` | morado | "La evidencia de esta incidencia fue aprobada por un especialista y ya fue actualizada en ServiceNow. Ahora debes aprobar o rechazar la correlación de incidencias." |

### N6. Sección nueva: "Incidencias Correlacionadas" (detalle)

Bloque nuevo en las pantallas de gestión/detalle **de tipo correlación**, ubicado **arriba** de "Alarmas". Contiene: título + badge de cantidad (`6`), buscador `Buscar nº de INC...`, tabla con columnas `Número de alarma` / `Tipo` / `OLT` / `Puerto` + botón "Detalles" por fila, y **paginación propia** (`Página 1 de 6`).

⚠️ El encabezado de la primera columna dice **"Número de alarma"** pero el contenido son IDs de incidencia (`INC0270808`) → P7.

### N7. Modales nuevos (6)

La arquitectura de modales se duplicó para separar **correlación** de **individual**, y **evidencia** de **correlación**:

| Modal | Node ID |
|---|---|
| `modal_confirma_asignacion_consolidacion` | `2121:8501` |
| `modal_individual_evidencia_rechazar` | `2121:7862` |
| `modal_individual_evidencia_aprobar` | `2121:7876` |
| `modal_correlacion_rechazar` | `2103:4695` |
| `modal_correlacion_aprobar` | `2103:4709` |
| *(+ los 3 de Fase 1 renombrados — ver M11)* | |

Los de correlación usan el ícono `si:ai-note-line`; los de evidencia usan `boxicons:siren-alt`.

### N8. Paginación en la bandeja

Las 3 bandejas ahora paginan (`Página 1 de 2` en Pendientes, `Página 1 de 6` en En Curso e Histórico), con el mismo control numérico + flechas que ya usa la tabla de alarmas. En Fase 1 **ninguna bandeja paginaba**. Esto resuelve el caso límite que `INVENTORY.md` marcaba como "dos patrones distintos de lista larga conviven en el mismo sistema".

---

## 🔁 MODIFICADO

### M1. `estado/Incidencia` → `ares-status-badge` — de 4 a 6 estados, y los 4 actuales cambian de texto

**El cambio más transversal del diagnóstico.** Node `119:14559`.

| Fase 1 (código actual) | Fase 2 (Figma) | Color |
|---|---|---|
| `pendiente` → "Pendiente" | `pendiente` → **"Gestión Pendiente"** | morado (sin cambio de color) |
| `en-curso` → "En curso" | `en curso` → **"Gestión en Curso"** | naranja (sin cambio de color) |
| `aprobada` → "Aprobada" | se divide en **"Evidencia Aprobada"** y **"Correlación Aprobada"** | verde |
| `rechazada` → "Rechazada" | se divide en **"Evidencia Rechazada"** y **"Correlación Rechazada"** | rojo |
| `finalizada` *(en Figma F1, nunca implementada)* | **no existe** | — |

En el código, `components/ares-status-badge.js:14-19` define exactamente 4 labels y `types.js` declara `@typedef {'pendiente'|'aprobada'|'rechazada'|'en-curso'} IncidenteEstado`. Los 6 estados nuevos rompen ese typedef y afectan bandeja, histórico, detalle y los 3 modales que muestran `ares-incident-summary`.

### M2. Barra de validación → `Action bar container` (`2093:5293`) — 2 variantes

| | Fase 1 (`ares-validation-bar.js`) | Fase 2 |
|---|---|---|
| Variantes | 1 | **2** (`sonsolidacion` *(sic)* y `correlacion`) |
| Fondo | `var(--color-bg-inverse)` (azul-gris #101e29) | **teal oscuro** (evidencias) / **morado oscuro** (correlación) — ninguno de los dos es un token actual |
| Título | "Validación de consolidación" | "Validación de consolidación **de Evidencias**" / "Validación **Incidencias Correlacionadas**" |
| Subtítulo | "{n} alarmas · Nada se escribe en ServiceNow sin tu aprobación" | igual / "**{n} INC correlacionadas** · Nada se escribe…" |
| Botón primario | "✓ Aprobar consolidación" | "✓ Aprobar **Evidencias**" / "✓ Aprobar **correlación de Incidentes**" |
| Botón secundario | "Rechazar" | "Rechazar" *(sin cambios)* |

Además cambia **cuándo** se muestra: en Fase 1 dependía solo de `puedeGestionar`; ahora también depende de **en qué etapa del flujo** está la incidencia (evidencia pendiente → barra teal; evidencia aprobada → barra morada; terminal → sin barra).

### M3. Fila de bandeja → `ares-incident-row` + `ares-incident-summary` — rediseño completo

| | Fase 1 | Fase 2 |
|---|---|---|
| Alto | 148px (pendiente) / 274px (en curso, histórico) | **~78px**, uniforme en los 3 tabs |
| Control de expandir | no existe | **`button/opentable` a la izquierda del ID** (deshabilitado si es Individual) |
| Tipo de incidencia | no existe | **`Consolidación` + badge de cantidad** / **`Individual`**, bajo el ID |
| Estado | badge dentro de `ares-incident-summary` | **junto al tag de problema**, con punto de color |
| Chips de VNO | **sí** (`.vno-field` / `.vno-tags` en `ares-incident-summary.js:95-116`) | **no aparecen** — se reemplazan por `OLT OLT-VALPO-CERRO` |
| Afectación / alarmas | valor + subdetalle (`afectacionReales`, `alarmasAbiertas`) | solo `Afectación Total: 42` y `Alarmas Totales: 12`, con íconos |
| Fechas | `Inicio Real` arriba, `Creación` abajo | `Creación` arriba, `Inicio Real` abajo *(orden invertido)* |
| Responsable | avatar + nombre + rol | igual, pero movido a la derecha, antes del botón "Detalles" |

### M4. Filtros de la tabla de alarmas

`gestion-incidencia.html:506-512` define hoy 4 filtros. Figma Fase 2 define **5**:

| Fase 1 | Fase 2 |
|---|---|
| Todas | Todas |
| Abiertas | Abiertas |
| **Cerradas** | **Completas** ← cambio de texto |
| Sin evidencia | Sin evidencia |
| — | **Descartadas** ← nuevo |

⚠️ El badge de la fila sigue diciendo `cerrado` mientras el filtro dice `Completas` → P3. Y "Descartadas" no corresponde a ningún campo actual de `AlarmRowData` → P4.

### M5. Orden de las secciones del detalle

| Fase 1 (código) | Fase 2 (Figma) |
|---|---|
| 1. Evidencia | 1. **Incidencias Correlacionadas** *(nueva)* |
| 2. Alarmas | 2. Alarmas |
| | 3. **Evidencia** ← baja al final |

Verificado en `gestion-incidencia.html:454` (Evidencia) vs `:482` (Alarmas).

### M6. Header del detalle

- **Nuevo subtítulo bajo el ID**: `Incidencia Padre` o `Incidencia Hija`.
- **Nuevo breadcrumb** en la pantalla de hija (`2124:9894`): `INC0270781 / Incidencia Padre  →  INC0270781 / Incidencia Hija`.
- El estado junto al ID pasa a usar los textos nuevos de M1 (`Gestión en Curso`, `Evidencia Aprobada`, etc.).

### M7. Panel "VNOs Afectados"

- **Nuevo pill `✓ Capturado`** en el encabezado del panel.
- Cada VNO ahora tiene un **borde izquierdo de color** (acento morado).
- El badge de UIC pasa de teal a **morado con borde**.

> ⚠️ Solo los cambios **visuales** de arriba son válidos. Los **nombres de carrier** que se ven en este panel (y en el KPI "Casos VNOs") están desactualizados en el Figma — ver **P1**. Las VNOs reales son las 4 que ya tiene el código.

### M8. Panel "Ruta física · Raíz común"

Gana el mismo **pill `✓ Capturado`** en el encabezado. El contenido (OLT, CAP, Fibra troncal, SLOTs, Puertos PON) no cambia.

### M9. Panel "Origen del Incidente"

Gana una fila nueva: **`Correlación: OLT · SLOT · temporal`** — los criterios por los que el sistema correlacionó las incidencias. No existe en `IncidentDetalle.origen` (`types.js:77`).

### M10. Secciones "Alarmas" y "Evidencia"

Ambas ganan un **pill de estado de carga `⟳ Capturando...`** en el encabezado, junto al título. En Fase 1 el ícono `ic/loading` existía en la librería pero no estaba conectado a nada (el propio `INVENTORY.md` lo señalaba). Ahora tiene un lugar definido.

### M11. Modales renombrados (misma función, nombre nuevo)

| Fase 1 | Fase 2 | Node ID |
|---|---|---|
| `Modal_confirma_asignacion` | `modal_confirma_asignacion_individual` | `337:8743` |
| `Modal_rechazar` | `modal_correlacion_evidencia_rechazar` | `354:8987` |
| `Modal_aprobar` | `modal_correlacion_evidencia_aprobar` | `354:9053` |

Conservan su node ID, así que es renombre, no reemplazo. `Modal_cambio_asignacion` (`441:4275`), `Modal_liberar` (`337:8833`) y `Moda_imagen_evidencia` (`219:11051`) mantienen nombre.

### M12. `Problema tag` — nota de Fase 1 resuelta

La nota abierta #10 de `INVENTORY.md` ("falta variante con texto completo, ej. CTO Indisponible") **está resuelta**: `48:7254` ahora tiene `PON LOSS` / `CTO Indisponible` / `GASP`. El código ya renderizaba los textos correctos (`ares-problema-tag.js:13-17`), así que **no requiere cambio** — solo se deja constancia de que Figma se puso al día.

### M13. Histórico: de scroll infinito a paginado

El frame `01_Bandeja_historico` (`321:5774`) pasó de **2866px** de alto (31 filas, scroll continuo) a **1513px** con paginación `Página 1 de 6`. Es el mismo cambio de N8, pero se destaca aparte porque `INVENTORY.md` lo documentaba explícitamente como caso límite de Fase 1.

---

## ➖ SIN CAMBIOS

Confirmados presentes en ambas fases y sin diferencias detectadas. **No tocar.**

| Componente | Node ID |
|---|---|
| `Sidebar` (Default / Variant2) | `7:3` |
| `dyinggasp tooltip` | `263:2080` |
| `inconsistency tooltip` | `279:2287` |
| `different integration tooltip` | `279:2302` |
| `estados/alarma` (abierto / cerrado) | `227:11097` |
| `gestores cantidad` (nokia / uaa / huawei / sin respuesta) | `304:3000` |
| `TabBtn` | `132:14674` |
| `button/aprobar` | `64:7654` |
| `button/rechazar` | `64:7734` |
| `button/gestionar` | `64:7793` |
| `button/tomarINC` | `363:10504` |
| `button/detalles` | `113:14324` |
| `button/exit` | `288:2402` |
| `button/back` | `321:8695` |
| `button/searchbar` | `321:3086` |
| `button/open image` | `210:7067` |
| `tabla/alarma` | `300:2900` |
| `tabla/contenido/vno` | `64:7620` |
| `tabla/contenido/fechas` | `64:7595` |
| `tablacontenido/usuario` | `313:2256` |
| `indicador/incidencia` · `indicador/evidencia` · `indicador/vno` | `300:2962` · `210:6958` · `263:1998` |
| `barra indicadores bandeja` | `357:9628` |
| `Moda_imagen_evidencia` | `219:11051` |
| `Modal_liberar` | `337:8833` |
| `Modal_cambio_asignacion` | `441:4275` |

También sin cambios: el **banner "Tu Incidencia en Curso"** (mismo layout, mismo copy, botones `Liberar` + `Gestionar →`), la **topbar** (avatar de iniciales + nombre + rol), la **fila de columnas de la tabla de alarmas** (Número de alarma / Creado / Estado / CI afectado / Evidencia), la **posición de los flags al costado del ID de alarma**, y los **3 tipos de flag** (no se agregó ni quitó ninguno).

---

## ❌ POSIBLEMENTE ELIMINADO

Se verificó cada caso contra el archivo antes de listarlo. **Ninguno es una pérdida de función confirmada.**

### E1. `02_gestión incidentes` sin barra de validación (`354:9125`) — **reemplazado, no eliminado**

`get_metadata` sobre `354:9125` devuelve *"node not found"*: el nodo ya no existe. Pero su función (ver el detalle sin poder gestionar) **sobrevive repartida en 3 pantallas nuevas**: `02_detalle_correlacion`, `02_detalle_individual` y `02_detalles_correlacion_INC_hija`. Se trata de un reemplazo por algo más granular.

### E2. `tabla/contenido/cantidad` (`64:7605`) — **no encontrado, a confirmar**

`get_metadata` devuelve *"node not found"*. Probablemente absorbido por el nuevo `tabla/data` (`2055:3801`), que cumple el mismo rol de celda de dato, pero **no se pudo confirmar la equivalencia**.

### E3. Variantes de `tabla` por tab (`363:9996`, `363:9878`, `363:9939`) — **no encontradas, a confirmar**

Las 3 variantes de fila por tab de Fase 1 no aparecen en el árbol. El componente padre `tabla` (`363:9850`) sigue existiendo pero ya sin hijos listados. Lo más probable es que hayan sido **sustituidas por la nueva familia `tabla/row_*`** (8 componentes, ver N4), pero conviene confirmarlo antes de dar por muerto el componente viejo.

### E4. Estado `finalizada` — **eliminado de Figma, nunca estuvo en el código**

`INVENTORY.md` lo listaba entre las variantes de `estado/Incidencia`. En Fase 2 no aparece. **No impacta el código**: nunca se implementó (`ares-status-badge.js` solo tiene 4 estados y ninguno es `finalizada`). Queda como pregunta de diseño (→ P8).

### E5. Chips de VNO dentro de la fila de bandeja — **eliminados de la fila, no del sistema**

Las filas de Fase 2 ya no muestran chips de VNO; en su lugar muestran el OLT. Los VNOs siguen existiendo en el KPI del header ("VNOs Afectadas") y en el panel del detalle. El componente `tabla/contenido/vno` (`64:7620`) sigue en la librería.

### E6. Filtro "Cerradas" de la tabla de alarmas — **renombrado, probablemente**

Desaparece "Cerradas" y aparece "Completas" en la misma posición. Se asume renombre, pero el badge de estado de la fila **sigue diciendo `cerrado`**, lo que deja la duda de si son el mismo concepto (→ P3).

---

## ❓ Preguntas abiertas

Casos que **no se resolvieron por cuenta propia** porque la respuesta cambia la implementación.

### Sobre datos y reglas de negocio

**P1 — ✅ RESUELTA. Conflicto de VNOs: el Figma está desactualizado, el código está correcto.**

El Figma de Fase 2 sigue mostrando **5 carriers antiguos** (`Telefónica`, `Entel`, `Claro`, `VTR`, `GTD`) en el KPI de bandeja, en "Casos VNOs" y en "VNOs Afectados". **Confirmado con el autor: las únicas 4 VNOs que existen son `Telefónica`, `Entel`, `ClaroVTR`, `DirecTV`** — tal como ya están en el código (`mock-data-bandeja.js`, `mock-data-gestion.js`, `types.js:27`). El prototipo de Figma quedó sin actualizar.

**Qué implica:**
- **No hay ningún cambio de VNOs que implementar.** El código ya es correcto; no tocar.
- En todos los frames de Fase 2, los nombres de carrier deben leerse como **mock obsoleto, no como especificación**. Esto aplica a las 14 pantallas.
- Los cambios **visuales** del panel de VNOs (pill `✓ Capturado`, borde izquierdo de color, badge UIC morado) descritos en **M7 sí son reales** y siguen vigentes — lo único desactualizado son los nombres y la cantidad de carriers.
- Pendiente del lado de diseño: actualizar el Figma a las 4 VNOs reales para que el prototipo deje de contradecir al código.

**P2 — Umbrales de `Confiabilidad`.** El componente tiene 3 colores (verde 90%, naranja 60%, rojo 1%) pero no hay regla declarada. ¿Cuáles son los cortes (ej. ≥80 verde, 40-79 naranja, <40 rojo)? ¿El score lo entrega el backend ya calculado o se calcula en el cliente?

**P3 — "Completas" vs `cerrado`.** El filtro dice "Completas", el badge de la fila dice "cerrado", y `estados/alarma` (`227:11097`) mantiene las variantes `abierto`/`cerrado`. ¿Son el mismo estado con dos nombres, o "Completas" es un estado nuevo distinto de "cerrado"?

**P4 — Qué es una alarma "Descartada".** Filtro nuevo sin campo que lo respalde en `AlarmRowData`. ¿Es un estado nuevo de alarma, un flag booleano aparte, o el resultado de haber rechazado su evidencia?

**P5 — Alcance de "Tomar INC" sobre una consolidación.** Al tomar una incidencia padre, ¿se toman también todas las hijas? ¿Puede otro usuario tomar una hija por separado mientras el padre está tomado?

**P6 — Tamaño de página de la bandeja.** Pendientes dice "Página 1 de 2" y En Curso/Histórico "Página 1 de 6", pero ambas muestran 10 filas. ¿El page size es 10 y los totales del mock están mal, o el page size varía por tab?

### Sobre inconsistencias dentro del propio Figma

**P7 — Encabezado incorrecto.** En "Incidencias Correlacionadas", la primera columna se titula **"Número de alarma"** pero lista IDs de incidencia (`INC0270808`). ¿Debe decir "Número de incidencia"?

**P8 — `finalizada` eliminado a propósito.** ¿Se descartó el estado, o se perdió al reestructurar `estado/Incidencia`? (Ver E4 — no afecta el código actual, pero sí el modelo de estados.)

**P9 — `02_gestion_individual` dice "Incidencia Padre".** Una incidencia **individual** no debería rotularse como padre. ¿Es un error del frame, o "Incidencia Padre" es el rótulo por defecto de toda incidencia de primer nivel?

**P10 — Estado inconsistente entre las dos pantallas de gestión.** `02_gestion_correlacion_evidencia` muestra `Gestión en Curso`, pero `02_gestion_individual` muestra `Gestión Pendiente` — **ambas con la barra de acción visible**. ¿Cuál es el estado correcto para "tengo la barra y puedo gestionar"?

**P11 — Nombre de variante desalineado.** En `notifications`, la variante verde de evidencia se llama **"Incidencia Aprobada"**, mientras que en `estado/Incidencia` el estado equivalente se llama **"Evidencia Aprobada"**. ¿Se unifican?

**P12 — ¿Confiabilidad también en el detalle?** El score aparece **solo** en la fila expandida de la bandeja. La tabla "Incidencias Correlacionadas" del detalle (que lista exactamente las mismas hijas) **no lo muestra**. ¿Es intencional u omisión?

**P13 — Cuatro filas de tabla con nombres casi idénticos.** `tabla/row_consolidacion`, `tabla/row_consolidacion_pendiente`, `tabla/row_conssolidacion_individual` *(sic)* y `tabla/row_individual_consolidacion`. Sus diferencias no se deducen del nombre ni del render. Hace falta el mapeo explícito de cuál va en qué tab/estado antes de componentizarlas.

**P14 — Typos a corregir en Figma.** `Property 1=sonsolidacion` (`2093:5292`), `tabla/row_conssolidacion_individual` (`2030:4280`), `tabla/row_detalles_indicencias_correlacionadas` (`2089:5030`), `Moda_imagen_evidencia` (`219:11051`), y el ícono `si:ai-note-line` (`2103:2783`) que no sigue la convención `ic/*` que se unificó en Fase 1.

**P15 — Notas de Fase 1 que siguen abiertas.** Dos de las 5 notas pendientes de `INVENTORY.md` continúan sin resolver en Fase 2: los **dos componentes distintos llamados `KPIs bandeja`** (`357:9706` y `357:9607`), y la **desincronización de datos mock** en las bandejas (badge "Pendientes 6" + subtítulo "6 incidencias" pero 10 filas visibles y 2 páginas; "En Curso 8" pero 10 filas y 6 páginas).

**P16 — Inconsistencia de conteo de alarmas en el detalle.** El título dice "Alarmas **6**" y el KPI "**6** Abiertas · 7% del total", pero la barra de acción dice "**60** alarmas" y Evidencia suma 48 + 12 = **60**. ¿El "6" del título es un mock desactualizado?

### Surgidas al implementar las pantallas

**P19 — ¿"Consolidación · Evidencia Aprobada" es un caso cerrado o le falta una etapa?** El Figma muestra esa combinación como una fila del **Histórico**, pero por la lógica del flujo de dos etapas no debería estar cerrada: a una consolidación con la evidencia aprobada todavía le falta aprobar o rechazar la **correlación**. En el código se resolvió del lado semántico — esa combinación va al tab **En Curso**, y es justamente la que hace visible la barra morada. Si el criterio real es el del Figma, se cambia únicamente `etapaDeGestion()` en `estado-store.js`.

**P20 — ¿Una incidencia hija se puede gestionar por separado?** El Figma muestra la pantalla de la hija siempre sin barra de acción, así que se implementó con `puedeGestionar: false` fijo: la decisión se toma sobre el padre y la hija hereda su etapa. Falta confirmar que una hija nunca se aprueba/rechaza por su cuenta.

**P21 — ¿Las alarmas descartadas se restan de los totales?** El filtro "Descartadas" ya funciona sobre un campo `descartada` nuevo, pero no está definido si esas alarmas deben excluirse de "Alarmas Totales", del conteo de abiertas o de la cobertura de evidencia. Por ahora **no** se restan.

### Sobre el estado del repositorio

**P17 — ✅ RESUELTA (con un pendiente menor). `BUGS.md` se eliminó a propósito.**

Confirmado con el autor: `BUGS.md` e `INVENTORY.md` se eliminaron deliberadamente durante la limpieza previa al handoff. No se perdió nada por accidente.

**Queda un pendiente de documentación, no de código:** el `HANDOFF.md` todavía **promete en su intro un "estado de QA"** y lo referencia desde la sección 7 ("ver sección 8, D4"), pero esa sección nunca se escribió — el documento salta de la 7 directo a "8. Convenciones del proyecto". Es decir, hay dos referencias colgando a un contenido inexistente. Conviene decidir una de dos: escribir esa sección con lo que se recuerde del QA de Fase 1, o quitar las referencias para que el handoff no prometa algo que no entrega.

**P18 — Features de Fase 1 que Figma no representa.** Tres comportamientos implementados en Fase 1 no aparecen en los frames de Fase 2: el **avatar celeste** para incidencias propias, el label **"Tu Incidencia"** en vez de "Responsable", y el **subfiltro "Todas / Mis incidencias"** del tab En Curso. En el Figma de Fase 2 todos los avatares se ven grises y no hay subfiltro. ¿Se mantienen, o Fase 2 los deja fuera?

---

## Assets que habría que exportar

Íconos nuevos que no están en `icons/`: `ic/sub` (`2047:3405`), `ic/alarm` (`2103:2771`), `si:ai-note-line` (`2103:2783`), `cantidad_INC` (`2196:8280`).

## Tokens — ✅ resuelto

Los valores se obtuvieron de las variables del propio Figma (`get_variable_defs` sobre `2093:5293`), así que no hubo que estimarlos ni pedirlos:

| Fondo | Variable Figma | Valor | Estado |
|---|---|---|---|
| Barra de Evidencias (teal oscuro) | `corporate/950` | `#063646` | **Ya existía** en `tokens.css` como primitivo, sin token semántico que lo usara |
| Barra de Correlación (morado oscuro) | `support/950` | `#1e1650` | Nuevo — agregado |

Corrige lo que decía una versión anterior de esta sección: **no era cierto que ninguno de los dos existiera**. La paleta ya contemplaba el teal oscuro; solo le faltaba el token semántico. Agregados en Fase 2:

```css
--color-support-950: #1e1650;                              /* primitivo nuevo */
--color-bg-inverse-brand: var(--color-corporate-950);      /* barra evidencias */
--color-bg-inverse-support: var(--color-support-950);      /* barra correlación */
--color-success-50: #f0fdf4;                               /* primitivo nuevo */
--color-bg-success: var(--color-success-50);               /* banner aprobado */
```

El ícono del círculo de cada barra también sale de tokens existentes: `--color-bg-brand` (evidencias) y `--color-interactive-secondary` (correlación, `#6c63ff` = `Interactive/Secondary` en Figma).
