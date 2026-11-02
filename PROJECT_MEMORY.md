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

---

## 🧪 Verificación y Estado
- **Vite & TypeScript Frontend**: Compilación 100% exitosa (`tsc && vite build`).
- **Backend TypeScript**: Validación estricta sin errores (`tsc --noEmit`).
- **Tests Vitest Backend**: 8/8 tests unitarios de trazabilidad, excedentes, modificación y anulación a 0 aprobados en `backend/src/__tests__/payments.spec.ts`.
- **Tests Vitest Frontend**: 10/10 tests de integración aprobados en `frontend/src/__tests__/`.
