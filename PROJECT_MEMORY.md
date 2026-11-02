# 🩰 PROJECT_MEMORY - VULPIARE

Memoria persistente del proyecto para seguimiento de arquitectura, decisiones y estado de desarrollo.

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
      - Botón de réplica individual y modal de réplica por lote de todos los gastos recurrentes hacia cualquier mes futuro.
    - **Navbar y Menú Gestiones**:
      - Modal "¿Qué deseas gestionar hoy?" ampliado a 5 opciones con sus respectivos iconos y estilos: Gestión de Alumnas, Gestión de Profesores, Gestión de Aranceles (ABM Pagos), Reportes de Ingresos y Balance, y Gastos Fijos del Estudio.

---

## 🧪 Verificación y Estado
- **Vite & TypeScript Frontend**: Compilación 100% exitosa (`tsc && vite build`).
- **Backend TypeScript**: Validación estricta sin errores (`tsc --noEmit`).
- **Tests Vitest Backend**: 8/8 tests unitarios de trazabilidad, excedentes, modificación y anulación a 0 aprobados en `backend/src/__tests__/payments.spec.ts`.
- **Tests Vitest Frontend**: 15/15 tests de integración aprobados en `frontend/src/__tests__/` (incluyendo flujo de navegación, trazabilidad de pagos, portal alumna, gastos fijos y reporte de ingresos con vista anual y paginación de gráficos).
