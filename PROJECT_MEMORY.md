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

---

## 🧪 Verificación y Estado
- **Vite & TypeScript Frontend**: Compilación 100% exitosa (`tsc && vite build`).
- **Backend TypeScript**: Validación estricta sin errores (`tsc --noEmit`).
- **Tests Vitest Frontend**: 8/8 tests de integración ejecutados y aprobados (incluyendo flujos de `RegisterPaymentView`, `Navbar` y `PaymentControlView`).
