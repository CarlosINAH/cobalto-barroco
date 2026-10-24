# Cobalto Barroco — Manual rápido y reporte de permisos

> Guía breve de la plataforma: qué ve cada quién y para qué sirve cada sección.
> Actualizado: octubre 2026.

La plataforma tiene **dos perfiles**:

- **Empleado** — el personal del taller. Entra a su espacio de trabajo.
- **Administración (admin)** — control total: dinero, personal, catálogos y configuración.

El perfil se decide al iniciar sesión. Si un empleado intenta abrir una pantalla
de administración, el sistema lo regresa automáticamente a su panel. No es solo
que el botón no aparezca: la pantalla está protegida en el servidor.

---

## Parte 1 — Reporte de visibilidad (quién ve qué)

### Resumen por sección

| Sección | Empleado | Administración |
|---|---|---|
| Panel general | ✅ Su espacio (saludo + accesos rápidos) | ✅ Tablero con indicadores y solicitudes |
| Calendario de empresa | ✅ Ver y editar eventos | ✅ Ver y editar eventos |
| Proyectos | ✅ Registrar y usar recetas — **sin montos** | ✅ Completo con presupuesto, cronograma y dinero |
| Materiales y recetas | ✅ **Solo lectura** | ✅ Editar todo el catálogo |
| Solicitud de material | ✅ Pedir material | ✅ Aprobar / rechazar |
| Mis habilidades | ✅ Ver las suyas | ✅ Editar las de todos + evaluación |
| Asistencia | ✅ Registrar entrada/salida | — |
| Archivos (Nube) | ✅ Su nube + compartidos **según permisos** | ✅ Todo |
| Papelera | ✅ Ver/restaurar lo suyo | ✅ Vaciar la papelera |
| Configuración | ✅ Su correo y teléfono | ✅ Configuración de la plataforma |
| Fichas de piezas | 🚧 En construcción | 🚧 En construcción |
| **Administración (dinero de obra)** | ❌ | ✅ |
| **Nómina de empresa** | ❌ | ✅ |
| **Gastos** | ❌ | ✅ |
| **Costos y P.U.** | ❌ | ✅ |
| **Constancias** | ❌ | ✅ |
| **Personal y permisos** | ❌ | ✅ |

### Datos sensibles que el empleado NUNCA ve

Esto está bloqueado en el servidor, no solo oculto en pantalla:

- **Dinero de los proyectos:** cliente, monto contratado, anticipo, egresos y
  utilidad. En su vista de Proyectos, el empleado solo recibe nombre, ubicación
  y estado.
- **Salarios y Precios Unitarios (P.U.):** las tarifas de mano de obra y el
  cálculo de precios no se envían a su pantalla.
- **Presupuestos y cotizaciones**, **nómina**, **gastos** y **movimientos de
  obra** (ingresos/egresos).
- **Evaluación de personal** (las cualidades con nivel 1–5 de cada quién).

### Qué sí puede hacer el empleado (aunque no maneje dinero)

- **Registrar proyectos** y anotar en ellos las **recetas** que use (como gasto
  de proceso), sin ver importes.
- **Consultar el catálogo** de materiales y recetas en solo lectura, con el
  costo de cada receta para referencia de preparación.
- **Pedir material**, que queda como solicitud pendiente para administración.
- **Subir, descargar o borrar archivos** compartidos — pero solo en las
  carpetas y con las acciones que administración le haya permitido.

### Cómo funcionan los permisos de archivos

Los **Archivos compartidos** usan un modelo tipo Windows, que decide la
plataforma (no el NAS):

- **Nivel por carpeta y por persona:** total, escritura, lectura o sin acceso.
- **"Todos los demás":** nivel por defecto para quien no esté en la lista.
- **El "ojito":** una carpeta sin acceso puede ocultarse por completo, o verse
  en gris con candado.
- **Acciones globales** por empleado: subir, descargar y borrar. Si no se toca
  nada, el empleado puede todo; se restringe solo a quien haga falta.

La **Nube personal** de cada quién es privada: usa su propia cuenta del NAS.

---

## Parte 2 — Manual rápido de las secciones nuevas

### Para administración

**Costos y P.U.** — El corazón del módulo de presupuestos. Cuatro pestañas:
- *Materiales:* catálogo de insumos, herramienta y equipo con su precio.
  Editable. Botón **Importar catálogos (JSON)** para cargar de golpe lo que
  salió de los Excel.
- *Salarios:* tarifa de mano de obra por rol (jornada, hora, semana, mes).
- *Recetas:* soluciones y mezclas, con su lista de componentes y costo por
  lote. Incluye calculadora: pones cuánto vas a preparar y da costo total y
  unitario.
- *Conceptos:* matrices de Precio Unitario (P.U.). El P.U. se calcula solo:
  costo directo × (1 + indirectos) × (1 + utilidad).

**Proyectos** — Cada obra con sub-pestañas que replican el Excel:
- *Presupuesto / Cotización:* conceptos con cantidad, subtotal, IVA 16% y total.
  Con botón para imprimir/PDF.
- *Cronograma:* reparte las jornadas por concepto en semanas según el tamaño de
  cuadrilla.
- *Administración:* ingresos y egresos de esa obra.
- *Nómina:* pagos por persona dentro del proyecto.
- *Balance:* presupuestado vs. real por rubro, con verde (ahorro) o rojo
  (sobrecosto).

**Administración** — Movimientos de dinero por obra (anticipos, finiquitos,
egresos, impuestos…).

**Nómina** — Pagos de la empresa (nómina administrativa), por persona y periodo.

**Gastos** — Gastos por proyecto o generales, con filtro por mes y categoría.

**Constancias** — Genera la constancia de trabajo en PDF con el formato de la
marca: nombre del participante, periodo y datos de la obra.

**Personal y permisos** — Alta y edición de empleados, sus habilidades, la
evaluación por cualidades, y los permisos de carpetas y acciones de archivos.

### Para el empleado

**Proyectos** — Registra tus obras y anota las recetas que uses en cada una. No
verás dinero; es para dejar constancia de tu trabajo y procesos.

**Materiales y recetas** — Consulta el catálogo del taller (solo lectura). En
recetas ves los componentes y el costo de preparación como referencia.

**Solicitud de material** — Pide lo que necesites; queda pendiente hasta que
administración lo apruebe o rechace.

**Asistencia** — Registra tu entrada y salida del día.

**Mis habilidades** — Consulta tus habilidades y tu evaluación.

**Archivos** — Tu Nube personal (privada) y los Archivos compartidos del equipo,
según los permisos que tengas en cada carpeta.

### En construcción

**Fichas de piezas (bienes muebles)** — Pendiente. El flujo previsto: eliges el
**tipo de bien**, marcas sus **materiales constitutivos** y se despliega el
**listado de deterioros** de ese bien para palomearlos. Queda a la espera de las
fichas de deterioros por cada tipo de bien.
