# Guía de Migraciones y Estrategia de Rollback de Base de Datos - VULPIARE

Este documento detalla el procedimiento seguro para aplicar cambios en el esquema de la base de datos PostgreSQL (Supabase) y la estrategia de rollback en caso de fallos.

---

## 1. Reglas de Oro
1. **Nunca ejecutar cambios destructivos directos** (`DROP TABLE`, `DROP COLUMN`) en `main` o producción sin backup previo.
2. **Desarrollar siempre en la rama `develop`** probando las migraciones localmente antes de desplegar.
3. **Evitar romper el contrato con la versión en producción**: Si agregás un campo nuevo, debe ser opcional (`?`) o tener un valor por defecto (`@default(...)`).

---

## 2. Flujo de Trabajo para Nuevas Migraciones

### Paso A: Modificar el esquema
Editar `backend/prisma/schema.prisma` agregando los nuevos campos, tablas o relaciones.

### Paso B: Generar la migración localmente
```bash
cd backend
npx prisma migrate dev --name descripcion_del_cambio
```
Esto creará una carpeta dentro de `backend/prisma/migrations/` con el script SQL generado.

### Paso C: Verificar los Tests y la Compilación
```bash
npm run typecheck
npm run test
```

---

## 3. Estrategia de Rollback

En caso de que una migración cause inconsistencias o errores en producción:

### Estrategia 1: Rollback mediante Esquema Declarativo (Recomendada)
1. Revertir los cambios en `backend/prisma/schema.prisma` al estado anterior.
2. Generar una migración de reversión:
   ```bash
   npx prisma migrate dev --name rollback_descripcion
   ```
3. Ejecutar los tests para verificar la estabilidad de la API.
4. Desplegar la migración de reversión a la rama `main`.

### Estrategia 2: Rollback manual mediante SQL
Si la migración fue aplicada pero falla la inicialización:
1. Conectarse a Supabase SQL Editor.
2. Ejecutar la sentencia SQL inversa (ej. `ALTER TABLE "Student" DROP COLUMN "columna_nueva";`).
3. Marcar la migración como resuelta en la tabla `_prisma_migrations`:
   ```sql
   DELETE FROM "_prisma_migrations" WHERE migration_name LIKE '%descripcion_del_cambio%';
   ```

### Estrategia 3: Supabase Point-in-Time Recovery (PITR)
En caso de pérdida catastrófica de datos durante una migración manual:
1. Acceder al Panel de Administración de Supabase (`taxecszkxqwtnxiglwbu`).
2. Ir a **Database -> Backups**.
3. Ejecutar Restore al timestamp exacto previo al despliegue.

---

## 4. Estructura de Tablas Actuales
- `AdminUser` (Docentes y SuperAdmin)
- `Student` (Alumnas y turnos)
- `AuthorizedPerson` (Personas autorizadas para retiros)
- `AttendanceRecord` (Asistencias diarias y estado en clase/retirada)
- `PickupRecord` (Registro histórico de retiros con horario y persona a cargo)
