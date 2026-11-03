# 🩰 PROJECT_MEMORY - VULPIARE

Memoria persistente del proyecto para seguimiento de arquitectura, decisiones y estado de desarrollo.

---

## 🛡️ Hito Crítico: Aislamiento Total de Entornos (Dev vs Producción) & Cortafuegos de Seguridad
**Fecha**: 3 de Noviembre 2026

### 🚨 Diagnóstico de Causa Raíz
- **Problema previo:** develop y main compartían la misma cadena de conexión a Supabase (schema=public). Modificaciones, pruebas o ejecuciones de tests automáticos en local o develop impactaban de forma directa sobre la base de datos de producción utilizada por el cliente.
- **Verificación de Datos:** Se realizó auditoría directa y de solo lectura sobre Supabase confirmando que las **82 alumnas** y **808 registros de asistencia** están 100% seguros e intactos.

### 🔒 Medidas de Seguridad Implementadas
1. **Esquema Aislado dev en Supabase:**
   - Se creó y sincronizó el esquema PostgreSQL dev en Supabase.
   - Se clonaron de forma segura las 82 alumnas, 73 tutores, 808 asistencias, pagos y administradores como **espejo exacto** para pruebas.
   - El entorno local (backend/.env) quedó configurado permanentemente con schema=dev.
2. **Cortafuegos Inquebrantable de Tests (setup.ts & vitest.config.mts):**
   - Se implementó un cortafuegos en backend/src/__tests__/setup.ts que intercepta cada ejecución de pruebas.
   - Si DATABASE_URL o DIRECT_URL intenta conectarse a schema=public o a producción sin schema=dev, **la ejecución se aborta de inmediato con error fatal antes de ejecutar una sola consulta**.
   - Verificado con test real: 27/27 tests de backend pasan en dev y abortan de inmediato si se intenta apuntar a public.
3. **Flujo Estricto de Pase a Producción (Regla Obligatoria):**
   - **Regla 1:** Todo desarrollo, prueba y commit se realiza exclusivamente en la rama develop.
   - **Regla 2:** El deploy en Vercel Preview para develop se conecta al esquema dev.
   - **Regla 3:** El cliente valida en Preview sobre datos espejo.
   - **Regla 4:** **PROHIBIDO** hacer merge o push a main sin la confirmación explícita y por escrito del usuario (Aprobado para producción).

---

## 📅 Hito: Módulo de Control de Pagos, Registro de Pago Detallado y ABM Pagos (Rama `develop`)
**Fecha**: Noviembre 2026

### 🎯 Objetivos Implementados
1. **Simplificación de la Navbar & Selector de Gestiones**:
   - Pestaña unificada **"Gestiones"** en Navbar Desktop y Mobile.
   - Selector emergente modal con 3 opciones para Super Admin:
     1. *"Gestión de Alumnas"*
     2. *"Gestión de Profesores"*
     3. *"Gestión de Conceptos de Pago (ABM Pagos)"* (Aranceles, cuotas, matrículas y clases sueltas).
   - Acceso directo a la pestaña **"Control de Pagos"** (`payments`).

2. **Módulo de Control de Pagos (`PaymentControlView.tsx`)**:
   - Botón blanco superior **"+ Registrar Nuevo Pago"** que transiciona a `RegisterPaymentView`.
   - Exclusión de alumnas inactivas (solo `ACTIVE`).
   - Estados de cuota: "Al día", "Pendientes" (hasta el 10 del mes), "Vencidas" (con 10% de recargo automático).
   - Soporte para visualización de "Pago Parcial" con deuda restante.
   - Resumen mensual y mini modal de recaudación.

3. **Nueva Pantalla de Registro de Pago (`RegisterPaymentView.tsx` - `registrar_pago.html`)**:
   - **Buscador interactivo con lupa y autocompletado**: Permite escribir nombre, apellido o DNI para seleccionar la alumna activa de forma ágil.
   - **Conceptos de Pago dinámicos**: Se nutren del ABM de Conceptos de Pago (Cuota Mensual, Matrícula Anual, Clase Suelta, Pase Libre). Al seleccionarlos, autocompletan el monto esperado.
   - **Monto con botón de lápiz**: Permite editar el monto efectivamente cobrado. Si el monto recibido es menor al del concepto, se computa de forma automática como **"Pago Parcial"** y calcula la deuda restante.
   - **Medios de Pago estrictos**: Únicamente **Transferencia** (con Nro. de operación y subida de imagen de comprobante) o **Efectivo**.
   - **Recibo automático por WhatsApp**: Switch toggle que al confirmar genera y abre `https://wa.me/...` con el recibo oficial formateado y datos de la alumna y tutor.
   - **Sincronización inmediata**: Al confirmar, guarda en la base de datos y retorna a `Control de Pagos` con los cálculos y listas actualizados.

4. **ABM de Conceptos de Pago (`PaymentConceptsManagement.tsx`)**:
   - Vista para crear, listar, editar y eliminar conceptos de pago y sus importes esperados.

5. **Teléfono de Contacto en Alumnas (Opcional - WhatsApp para Pagos y Avisos)**:
   - Campo `phone` opcional (`String?`) sincronizado en PostgreSQL Supabase y Prisma (`db push` no destructivo).
   - Verificado con 80 alumnas intactas en base de datos.
   - Formulario de alta/edición de `StudentManagement.tsx` con campo opcional.
   - `PaymentControlView.tsx` y `RegisterPaymentView.tsx` toman prioritariamente el teléfono directo de la alumna o recurren al tutor autorizado.

6. **Backend, Prisma y Resiliencia**:
   - Modelos `PaymentRecord` y `PaymentConcept` en `schema.prisma`.
   - Rutas API en `/api/payments` y `/api/payments/concepts`.
   - Soporte para fallback local ante latencia de red en base de datos.

7. **Acumulación de Pagos Múltiples por Mes (Cuotas Saldadas con Pagos Parciales)**:
   - Removida restricción única rígida `[studentId, month]` y reemplazada por índice en `schema.prisma` y Supabase.
   - Soporte para múltiples pagos por alumna en el mismo mes (ej. $20.000 por transferencia + $2.000 en efectivo).
   - `PaymentControlView.tsx` y `RegisterPaymentView.tsx` acumulan todos los pagos del mes: cuando la suma alcanza o supera el valor del concepto, la cuota pasa automáticamente a estado "Al día" (saldada con deuda $0).
   - Cada pago conserva su propio método de pago, comprobante y fecha, garantizando métricas precisas de recaudación en Efectivo vs Transferencia.

8. **Acreditación Automática de Excedentes al Mes Siguiente**:
   - Cuando se ingresa un monto superior a la cuota o deuda pendiente del mes actual, el backend y el frontend distribuyen automáticamente el pago:
     - El mes actual se salda al 100% (deuda restante $0, estado "Al día").
     - El monto sobrante (excedente) se guarda y acredita de forma automática para el mes que le sigue (`getNextMonth(currentMonth)`) como saldo a favor / pago correspondiente a ese mes.
   - En la interfaz de `RegisterPaymentView.tsx`:
     - Badge dinámico "Pago con Excedente".
     - Alerta explicativa detallando cuánto cubre el mes corriente y qué monto se acredita para el próximo mes.
     - Recibo de WhatsApp formateado automáticamente especificando que el mes actual quedó saldado y el excedente acreditado para el mes siguiente.

9. **Trazabilidad Completa, Modificación, Anulación a $0 y Eliminación en Cascada de Excedentes**:
   - Vinculación explícita e indestructible entre pagos principales y sus créditos sobrantes mediante `[ORIGIN:<primary_id>]` y `operationNumber: SURPLUS:<primary_id>`.
   - **Eliminación en Cascada (`DELETE /api/payments/:id`)**: Si se anula o elimina un pago que generó excedente en el mes posterior, el excedente hijo se elimina automáticamente, volviendo ambos meses a $0 / impagos.
   - **Edición Quirúrgica (`PUT /api/payments/:id`)**:
     - Si se modifica el monto a un valor menor que la cuota (ej. $15.000): el mes actual queda como pago parcial y el excedente del mes siguiente se borra de inmediato (vuelve a 0).
     - Si se edita a $0: se anula el pago por completo y se elimina cualquier excedente.
     - Si se edita con otro excedente: se recalcula y ajusta el monto acreditado en el mes siguiente.
   - **Anulación Masiva de Cuota (`DELETE /api/payments/reset-month`)**: Botón rojo directo en el modal de `PaymentControlView.tsx` ("Anular todos los pagos de este mes (Volver a $0 / Impago)") para corregir errores humanos de selección de alumna en un solo clic.

10. **Portal Alumna: Estado de Clase, Cuotas, Trazabilidad e Historial Desplegable (`ParentPortal.tsx`)**:
    - Diseño adaptado a la estética y especificación de `portal_alumna_pagos_y_asistencias.html` / `portal_alumna_estado_de_pagos_y_asistencia.html`.
    - **Header y Perfil de Alumna**: Logo oficial de la app `/vulpiare_logo.png`, Turno oficial asignado, Nombre completo, DNI, avatar circular con gradiente e iniciales, fecha actual formateada en español y botón "Salir".
    - **Estado de la clase de hoy o más reciente**:
      - Si existe asistencia hoy: estado "¡PRESENTE en clase!" o "AUSENTE", hora de registro, horario del turno, docente a cargo, y detalle de retiro (persona autorizada o "Presente y listo - No requiere persona a cargo para retiro").
      - Si no existe hoy: muestra automáticamente la última clase registrada correspondiente a su turno (ayer o fecha anterior más reciente) con aviso de que la clase de hoy aún no ha sido registrada.
    - **Estado de Cuenta y Cuotas**:
      - Trazabilidad en tiempo real conectada a los pagos registrados.
      - Período en curso, concepto, valor regular ($22.000 o según arancel activo).
      - Estados dinámicos: "Cuota al día" (verde con fecha y medio de pago), "Pago Parcial" (monto abonado y restante a saldar), "Pendiente" (primeros 10 días) o "Vencida (+10% recargo)" (pasados los 10 días).
      - Banner de saldo a favor si el pago generó excedente acreditado al mes siguiente.
      - Botón "Ver Recibo Oficial" con modal emergente para previsualizar comprobantes cargados.
      - Tarjeta informativa de próximo vencimiento (1 al 10 del mes siguiente) con aclaración: *"Para informar pagos o consultas sobre facturación, comunicate con la profesora Victoria."*
    - **Historial de Cuotas (Agrupado por Mes)**:
      - Incluye todos los meses registrados (tanto el mes corriente abonado como meses anteriores y futuros con saldo a favor por excedente).
      - Muestra el mes que generó el excedente (Noviembre con cuota al día) y el mes beneficiario (Diciembre con saldo a favor).
      - Muestra las 2 cuotas más recientes en la vista principal con botón "Ver más" que despliega la pantalla completa con retorno.
    - **Historial de Asistencias**: Muestra las últimas 2 asistencias por defecto, con botón "Ver más" que despliega la pantalla completa de asistencias históricas y flechita de retorno.
    - **Exclusión Estricta**: Se omitió por completo el botón de WhatsApp y la tarjeta de secretaría / atención a familias según requerimiento.

---

## 11. Módulo Financiero del Super Admin: Reportes de Ingresos, Balance Neto, Analítica PostHog y Gastos Fijos con Réplica
- **Fecha**: Noviembre 2026.
- **Objetivo**: Integrar dentro del modal unificado de **Gestiones** dos nuevas herramientas financieras para el Super Admin:
  1. **Reportes de Ingresos y Balance**: Basado en `reportes_e_ingresos.html`, conectando pagos de alumnas y egresos operativos para calcular el balance neto real en tiempo real.
  2. **Control de Gastos Fijos**: Registro de egresos operativos (alquiler de gimnasio, servicios, seguros, mantenimiento) con adjuntos (imagen o PDF) y replicación mensual (individual y por lote recurrente).
  3. **Analítica y Telemetría PostHog**: Servicio desacoplado `frontend/src/services/analytics.ts` para capturar eventos de visualización de reportes, registro de gastos, réplicas y descargas de balances.

- **Detalles de Implementación**:
  - **Prisma & Base de Datos**:
    - Modelo `FixedExpense` creado en `backend/prisma/schema.prisma` y sincronizado en Supabase con `prisma db push` preservando la integridad absoluta de las 80 alumnas.
    - Soporte de campos: `title`, `amount`, `date` (YYYY-MM-DD), `month` (YYYY-MM), `category`, `receiptUrl` (Base64 imagen o PDF), `notes`, `isRecurring`, `recordedByAdminId`.
  - **Backend API (`backend/src/routes/expense.routes.ts`)**:
    - `GET /api/expenses?month=...`: Lista de gastos con soporte para persistencia local de contingencia (`data_expenses.json`).
    - `POST /api/expenses`: Creación de gastos fijos.
    - `PUT /api/expenses/:id`: Edición y actualización.
    - `DELETE /api/expenses/:id`: Eliminación de gastos.
    - `POST /api/expenses/:id/replicate`: Réplica individual de un gasto al mes siguiente u otro especificado.
    - `POST /api/expenses/replicate-month`: Réplica masiva de todos los gastos marcados como recurrentes de un mes de origen a un mes de destino.
  - **Frontend Components**:
    - `RevenueReportsView.tsx`:
      - Header banner con degradado Vulpiare y conmutador Mensual / Anual.
      - **Selector de Período Adaptativo**:
        - En vista **Mensual**: selector y flechas mes a mes (ej. "Noviembre 2026").
        - En vista **Anual**: selector y flechas año a año (ej. "Año 2026", "Año 2025") con comparativa vs año anterior.
        - **Eliminación del botón redundante de Gastos Fijos** dentro del período seleccionado (la gestión se realiza exclusivamente desde su propia pestaña en Gestiones).
      - 6 KPIs financieros en tiempo real: Ingresos Totales (con % vs mes o año anterior), Gastos Fijos, Balance Neto (`Total Ingresos - Total Gastos`), Cobros Hechos (% efectividad sobre alumnas activas), En Mora / Pendiente, Ticket Promedio.
      - **Gráfico de Evolución de Ingresos Avanzado**:
        - En vista **Mensual**: soporte de conmutador **6 Meses / 12 Meses**, y controles de navegación hacia meses anteriores y posteriores, con botón para volver al período actual.
        - En vista **Anual**: evolución de ingresos anuales históricos por año calendario (ej. 2022 a 2026) con controles de navegación para explorar bloques de años anteriores o siguientes.
        - Barras interactivas con tooltip exacto y selección al clic para cambiar el período en foco.
      - Desglose por Medio de Pago (Transferencia Bancaria vs Efectivo en Caja) con barras porcentuales.
      - Desglose por Concepto (Cuotas Mensuales, Matrículas Anuales, Clases Sueltas).
      - Acciones de exportación: Descarga CSV oficial para Excel (con nombre dinámico mensual o anual) y generación de PDF para impresión contable.
    - `FixedExpensesView.tsx`:
      - Tarjetas de resumen: Total Egresos, Cantidad de Conceptos y Gastos Recurrentes.
      - Selector de mes con flechitas y selector directo.
      - Modal de creación y edición con validación de montos, selección de fecha automática/manual, categoría y carga de comprobante con visor integrado (imágenes y PDFs).
      - **Flujo de Réplica Flexible y Granular**:
        - Botón superior **"Replicar Gastos"**: abre modal de selección granular donde el usuario elige a qué mes replicar y marca exactamente qué gastos desea replicar mediante checkboxes individuales.
        - Acciones rápidas: "Todos" (para replicar todo el mes en un clic), "Solo recurrentes" o "Ninguno".
        - **Ajuste de montos en vivo**: cada fila seleccionada permite editar el monto si para el nuevo período hubo variaciones (ej. aumento de alquiler o servicios).
        - Botón de réplica individual en cada fila de gasto con selector de mes de destino y campo de monto ajustable.
    - **Navbar y Menú Gestiones**:
      - Modal "¿Qué deseas gestionar hoy?" ampliado a 5 opciones con sus respectivos iconos y estilos: Gestión de Alumnas, Gestión de Profesores, Gestión de Aranceles (ABM Pagos), Reportes de Ingresos y Balance, y Gastos Fijos del Estudio.

---

## 🧪 Verificación y Estado
- **Vite & TypeScript Frontend**: Compilación 100% exitosa (`tsc && vite build`).
- **Backend TypeScript**: Validación estricta sin errores (`tsc --noEmit`).
- **Tests Vitest Backend**: 8/8 tests unitarios de trazabilidad, excedentes, modificación y anulación a 0 aprobados en `backend/src/__tests__/payments.spec.ts`.
- **Tests Vitest Frontend**: 17/17 tests de integración aprobados en `frontend/src/__tests__/` (incluyendo flujo de navegación, trazabilidad de pagos, portal alumna, gastos fijos con réplica granular y reportes de ingresos).

## 12. Control de Retiros ("Otro Adulto") y Portal Alumna Responsive ("Globos de Clase")
- **Fecha**: Noviembre 2026.
- **Objetivos y Mejoras Implementadas**:
  1. **Control de Retiros con Selección de "Otro Adulto" (PickupsView.tsx y pickup.routes.ts)**:
     - Agregada la opción **"➕ Otro adulto (ingresar datos)..."** dentro del desplegable de selección de autorizados en el Control de Retiros de administración.
     - Apertura automática de un modal emergente donde se ingresan los datos del adulto que retira a la alumna:
       - Nombre y Apellido (obligatorio).
       - Vínculo / Relación con la alumna (obligatorio, ej: Tía, Abuela, Hermano/a, Vecina).
       - DNI (opcional, con fallback seguro sin romper restricciones de base de datos).
       - Teléfono (opcional).
       - Notas u observaciones adicionales (opcional, ej: autorización previa por WhatsApp).
     - Si la alumna presente no cuenta con autorizados precargados en el sistema, se muestra un botón directo para registrar el retiro con otro adulto.
     - Backend (POST /api/pickups): recibe newAuthorizedPerson, crea el registro en AuthorizedPerson vinculado a la alumna y asocia el retiro (PickupRecord) con persistencia en Supabase.
  2. **Portal Alumna: Adaptabilidad Responsive de "Estado de la clase de hoy" (ParentPortal.tsx)**:
     - Reemplazada la disposición rígida de dos columnas fijas por grid-cols-1 sm:grid-cols-2.
     - En pantallas de teléfonos móviles o con espacio horizontal reducido, los "globos" informativos de **"Horario Asignado"** y **"Docente a Cargo"** se colocan limpiamente uno debajo del otro, evitando truncamientos incómodos de los nombres largos de turnos.
     - Incorporado flex-wrap en las cabeceras de estado (¡PRESENTE en clase!, hora, badge de última clase) para garantizar ajuste fluido sin desbordes.
  3. **Tests y Verificación**:
     - Test unitario frontend en components.spec.tsx validando la apertura del modal al seleccionar "Otro", completado de formulario y envío de savePickup con newAuthorizedPerson.
     - Test unitario backend en attendance_pickup.spec.ts validando la creación de AuthorizedPerson y registro de retiro con newAuthorizedPerson.
     - 18/18 tests frontend y 8/8 tests backend pasando exitosamente.


## 14. Hotfix en Producción: Pagos de Seguro/Inscripción, Turnos Múltiples por Día y Eliminación Definitiva de Gastos
- **Fecha**: Noviembre 2026.
- **Objetivos y Mejoras Implementadas**:
  1. **Seguro e Inscripciones vs Cuotas Mensuales**:
     - Función `isNonCuotaConcept`: detecta conceptos de seguro (`seguro`) e inscripción/matrícula (`inscrip`, `matrícula`, `matricula`).
     - `backend/src/routes/payment.routes.ts`:
       - `POST /api/payments`: al registrar seguro o inscripción, se almacena con `expectedAmount = parsedAmount`, `remainingDebt: 0` y `isPartial: false`. No modifica la deuda de la cuota mensual de la alumna ni crea registros de excedente de mes siguiente.
       - Al actualizar (`PUT`) o anular (`DELETE`) registros no-cuota, se manejan de forma aislada sin recalcular los saldos de cuotas.
     - `frontend/src/components/Admin/RegisterPaymentView.tsx`:
       - Input numérico de monto recibido directamente editable sin necesidad de activar edición manual previa.
       - Detección automática de no-cuota: elimina alertas falsas de "pago parcial de cuota" o "excedente detectado".
       - Recibo oficial de WhatsApp redactado con precisión ("Pago de [Concepto] registrado con éxito").
     - `frontend/src/components/Admin/PaymentControlView.tsx`:
       - Separación de `cuotaPayments` y `nonCuotaPayments`: el estado de cuota (Al día, Pago Parcial, Pendiente, Vencida) evalúa únicamente pagos de cuota.
       - Despliegue de badges específicos para pagos de Seguro (`🛡️ Seguro: $5.000`) e Inscripción (`📝 Inscripción: $20.000`) en la tarjeta de la alumna.
     - `frontend/src/components/Admin/RevenueReportsView.tsx`:
       - Renombrado "Matrículas" a "Inscripciones" en métricas, filtros y gráficos.
       - Incorporación de categoría y filtro dedicado para "Seguros Anuales".
  2. **Selección de Turnos Múltiples en el Mismo Día (e.g. Lunes mañana y Lunes tarde)**:
     - `frontend/src/components/Admin/StudentManagement.tsx`:
       - Migración del estado de cronograma de `Record<string, string>` a `ScheduleEntry[]` (`{ day, shift }[]`).
       - En la interfaz de alta/edición de alumnas, cada día despliega botones individuales para cada turno oficial disponible (ej. Lunes: `8 a 10`, `16:45 a 18`, `17:30 a 19`).
       - La administradora puede seleccionar turnos de mañana y tarde en el mismo día (ej. Lunes mañana + Lunes tarde).
       - Validación en backend (`validatePlanSchedule`) y frontend ajustada a la cantidad de clases semanales requerida por el plan.
  3. **Solución a Eliminación de Gastos Fijos (Persistencia en Supabase)**:
     - `backend/src/routes/expense.routes.ts`: `GET /` devuelve el resultado de `prisma.fixedExpense.findMany()` directamente, eliminando el fallback a `INITIAL_EXPENSES` cuando la lista de gastos en base de datos estaba vacía. Los conceptos eliminados permanecen borrados definitivamente sin resurrección visual.
- **Verificación**:
  - 26/26 tests backend aprobados.
  - 18/18 tests frontend aprobados.
  - Compilación de producción con Vite exitosa.
  - Desplegado y sincronizado en ramas `develop` y `main` (producción).


## 15. Trazabilidad y Detalle de Pagos de Seguro/Inscripciones en Reportes y Ficha de Alumna
- **Fecha**: Noviembre 2026.
- **Objetivos y Mejoras Implementadas**:
  1. **Reportes de Ingresos y Balance (`RevenueReportsView.tsx`)**:
     - Incorporada la nueva sección **"Registro Detallado de Pagos y Cobros"** que lista individualmente cada transacción del período seleccionado.
     - Al seleccionar el filtro de **"Seguros"** (o "Inscripciones", "Cuotas", etc.), muestra exactamente qué alumna pagó, el monto ($20.000), el medio de pago (`💵 Efectivo` o `💳 Transferencia`), fecha, quién lo cobró y observaciones/comprobantes.
     - Buscador reactivo integrado para buscar pagos por alumna, DNI o medio de pago.
     - Botón de anulación individual por si un cobro fue registrado por equivocación.
  2. **Control de Pagos (`PaymentControlView.tsx`)**:
     - Agregados filtros en chips para `🛡️ Seguro` y `📝 Inscripción` en la barra superior.
     - En la tarjeta de la alumna, el badge de pago de seguro o inscripción ahora detalla claramente el medio de pago (`💵 Efectivo en Caja` o `💳 Transferencia`), con acceso directo para ver comprobante o editar el pago.
  3. **Ficha de la Alumna (`StudentManagement.tsx`)**:
     - En el modal de **Historial** de cada alumna, se incorporaron dos pestañas conmutables:
       - `📅 Asistencias`: historial de asistencia y eliminación de asistencias erróneas.
       - `💳 Pagos y Seguros`: listado cronológico de todos los pagos registrados para esa alumna (Seguros, Cuotas, Inscripciones), con fecha, monto, concepto, medio de pago y notas.
- **Verificación**:
  - 26/26 tests backend aprobados.
  - 18/18 tests frontend aprobados.
  - Compilación de producción con Vite exitosa.
  - Desplegado y sincronizado en `develop` y `main` (producción).

## 16. Refactorización Modular del Portal de Alumna con Bottom Navigation Bar y Sistema de Recuperación de Clases
- **Fecha**: Noviembre 2026 (Rama `develop`).
- **Objetivos y Mejoras Implementadas**:
  1. **Configuración de Tailwind y PostCSS**:
     - `tailwind.config.js`: resuelve rutas con `path.resolve(__dirname, 'src/**/*.{js,ts,jsx,tsx}')` garantizando la compilación de clases utilitarias en cualquier entorno de ejecución.
     - `vite.config.ts`: configuración explícita de PostCSS enlazando `tailwindcss` y `autoprefixer`.
  2. **Arquitectura Modular del Portal de Alumna (3 Pestañas en `frontend/src/components/Parent/`)**:
     - **`ParentHeader.tsx`**: Encabezado superior con logo oficial de Vulpiare (`/vulpiare_logo.png`), badge "Portal Alumna", fecha actual formateada en español y botón "Salir".
     - **`BottomNav.tsx`**: Barra de navegación inferior fija (`fixed bottom-0 inset-x-0`) con efecto translúcido (`bg-white/95 backdrop-blur-md`), bordes redondeados y sombra suave. 3 pestañas táctiles:
       1. *Inicio* (icono `Home`)
       2. *Pagos* (icono `Wallet`)
       3. *Asistencias* (icono `Calendar`)
       - Pestaña activa en violeta de la marca (`text-purple-700 font-black`) con indicador superior de línea/píldora; inactivas en `text-slate-400`.
     - **`HomeTab.tsx` (Inicio)**:
       - Tarjeta principal de perfil de la alumna: badge de turno, nombre completo, DNI y avatar con iniciales y gradiente violeta/rosa.
       - **Grilla de Métricas Mensuales (3 tarjetas con fondos suaves y bordes redondeados)**:
         1. *Clases del mes* (`bg-purple-50`)
         2. *Clases asistidas* (`bg-emerald-50`)
         3. *Para recuperar* (`bg-rose-50`)
       - Aviso de vencimiento de recuperatorios en el mes corriente.
       - Botón destacado "Recuperar una clase" con icono `RotateCw` y gradiente violeta/rosa.
       - Sección interactiva "Estado de la clase de hoy" con globos apilados verticalmente en pantallas móviles (`grid-cols-1 sm:grid-cols-2`).
       - Accesos directos rápidos hacia *Pagos* y *Asistencias*.
     - **`PaymentsTab.tsx` (Pagos)**:
       - Optimización de espacio: se omite la tarjeta grande de perfil para priorizar el contenido financiero.
       - Estado de Cuenta y Cuotas: período en curso, cuota regular, monto abonado, deuda restante, banner de saldo a favor/excedente y aviso de próximo vencimiento con la profesora Victoria.
       - Historial completo de cuotas agrupadas cronológicamente por mes con medios de pago y botones para ver comprobantes.
     - **`AttendanceTab.tsx` (Asistencias)**:
       - Optimización de espacio: se omite la tarjeta grande de perfil.
       - Historial completo de asistencias: badges ¡PRESENTE! / AUSENTE / RECUPERATORIO, horario, docente a cargo y detalle de retiro por persona autorizada.
     - **`MakeupClassModal.tsx`**:
       - Modal intuitivo de 2 pasos sin tecnicismos:
         - *Paso 1: ¿A qué horario vas a asistir?*: Selección táctil entre turnos oficiales resaltando el turno elegido con borde violeta y tilde.
         - *Paso 2: ¿Qué día vas a ir?*: Selector inteligente que calcula automáticamente los días hábiles del mes que coinciden con los días del turno elegido.
         - Aviso claro: *"Al confirmar, la profesora verá a [Nombre de la alumna] en su lista de asistencia con la etiqueta RECUPERATORIO"*.
         - Botón de acción: "Confirmar clase".
     - **`ReceiptModal.tsx`**: Visualizador modal de comprobantes (imágenes y PDFs).
     - **`ParentPortal.tsx`**: Coordinador central de estado, datos y pestañas.
  3. **Backend y Persistencia**:
     - Modelo `AttendanceRecord` con estado `PENDING` en enum `AttendanceStatus` sincronizado en PostgreSQL Supabase mediante `prisma db push`.
     - Endpoint `POST /api/attendance/makeup-request`: agenda la clase recuperatoria con `isMakeup: true`, `status: 'PENDING'` y el turno seleccionado.
     - Sincronización en `AttendanceView.tsx`: la alumna con recuperatorio pendiente aparece automáticamente en la lista del turno y fecha con borde violeta (`border-purple-300`), fondo suave (`bg-purple-50/30`), badge **RECUPERATORIO** y leyenda indicando su turno habitual. La docente puede marcarle "Presente" al momento de ingresar.
- **Verificación**:
  - 18/18 tests unitarios e integración frontend aprobados.
  - 27/27 tests de integración backend aprobados.
  - Compilación de producción con Vite exitosa (`tsc && vite build`).
