# Prueba de restauración del respaldo (Windows)

Objetivo: comprobar que el respaldo nocturno se puede **restaurar completo**, no solo abrir.
Se restaura en el proyecto de pruebas **`dentalflow-demo`** (Supabase), **nunca en producción
(`DENTALFLOW`)**. Repetir cada 3 meses. Ver también `RESPALDO.md`.

Dónde está cada cosa:
- **GitHub, repositorio `dentalflow`** → pestaña **Actions** de la barra superior: aquí se
  descarga el respaldo. (Los "Actions" dentro de *Settings* son configuración: no se tocan.)
- **Supabase, proyecto `dentalflow-demo`**: aquí se restaura.
- **Supabase, proyecto `DENTALFLOW`**: producción. Solo se lee para comparar.

## 1. Descargar el respaldo
1. GitHub → `dentalflow` → **Actions** (barra superior) → a la izquierda **Respaldo de la base**.
2. Pulsar la ejecución más reciente con ✓ verde (la de arriba). Cada ejecución es una copia
   completa; las rojas fallaron y no tienen copia. Se guardan 30 días.
3. Bajar hasta **Artifacts** → **respaldo-base** → se descarga un `.zip`.

## 2. Preparar la carpeta
1. Crear `C:\respaldo-prueba` y descomprimir ahí el `.zip` (sale `dentalflow-AAAA-MM-DD.dump.age`).
2. Copiar ahí la llave `llave-respaldo.txt` desde el USB.
3. Abrir **PowerShell** en esa carpeta (Explorador → clic derecho en un espacio vacío →
   *Abrir en Terminal*).

## 3. Instalar las herramientas (una sola vez)
```powershell
winget install FiloSottile.age
winget install PostgreSQL.PostgreSQL.17
```
Cerrar y volver a abrir PowerShell. En cada PowerShell nuevo, agregar las herramientas de
PostgreSQL al PATH y comprobar:
```powershell
$env:Path += ";C:\Program Files\PostgreSQL\17\bin"
age --version
pg_restore --version   # debe decir 17.x
```

## 4. Abrir el respaldo
```powershell
age --decrypt -i llave-respaldo.txt -o respaldo.dump dentalflow-AAAA-MM-DD.dump.age
```
No muestra nada si sale bien, y aparece `respaldo.dump`. **Ese archivo tiene datos reales sin
cifrar**: se borra al terminar (paso 8).

## 5. Conectar con `dentalflow-demo`
1. Supabase → proyecto **`dentalflow-demo`** (comprobar el nombre arriba) → botón **Connect**
   → **Session pooler** → copiar la cadena `postgresql://postgres.otyshxghiqdtodzrwpjo:...`.
2. Cambiar `[YOUR-PASSWORD]` por la contraseña de la base de **demo**. Si no se sabe:
   *Project Settings → Database → Reset database password* (de demo, no de producción).
   Usar una contraseña solo con letras y números para no tener que escapar símbolos.
3. En PowerShell:
```powershell
$DEMO = "postgresql://postgres.otyshxghiqdtodzrwpjo:CONTRASEÑA@....pooler.supabase.com:5432/postgres"
psql $DEMO -c "select current_database(), count(*) as usuarios from auth.users;"
```
La cadena **debe contener `otyshxghiqdtodzrwpjo`** (demo). Si contiene `ytoxbvfxjbomqjjshumd`,
es producción: parar.

## 6. Restaurar
Primero se vacían los usuarios y el historial de migraciones de demo (solo hay cuentas de
prueba), para que no choquen con los del respaldo. **Borra para siempre los datos de demo.**
```powershell
psql $DEMO -c "truncate auth.users cascade; truncate supabase_migrations.schema_migrations;"

pg_restore -d $DEMO --data-only --disable-triggers --schema=auth respaldo.dump
pg_restore -d $DEMO --clean --if-exists --no-owner --schema=public respaldo.dump
pg_restore -d $DEMO --data-only --schema=supabase_migrations respaldo.dump
```
Errores esperados que se pueden ignorar: `duplicate key` en `auth.schema_migrations` (las
versiones internas de Supabase Auth ya existen en demo). Cualquier otro error: copiarlo y
anotarlo aquí.

## 7. Comprobar
Correr esta consulta en el **SQL Editor** de producción y en el de demo. Los números deben
coincidir (o casi, si hubo movimiento después de la hora del respaldo):
```sql
select (select count(*) from patients)         as pacientes,
       (select count(*) from appointments)     as citas,
       (select count(*) from clinical_entries) as registros,
       (select count(*) from audit_log)        as auditoria,
       (select count(*) from auth.users)       as usuarios;
```

## 8. Al terminar
1. Borrar `respaldo.dump` y el `.zip` de la computadora (y vaciar la papelera).
   La llave vuelve solo al USB.
2. Demo ahora tiene **datos reales de pacientes**: no darle acceso a nadie. Si no se va a usar,
   dejar que Supabase lo pause.
3. Anotar en `RESPALDO.md` la fecha de la prueba y el resultado.
