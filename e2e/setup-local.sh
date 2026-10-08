#!/usr/bin/env bash
# Levanta (o reinicia) una copia LOCAL de Supabase para las pruebas E2E.
# Nunca toca producción. Requiere Docker. Uso: bash e2e/setup-local.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${E2E_SUPABASE_DIR:-$ROOT/.e2e-supabase}"

mkdir -p "$WORK/supabase/migrations"
cd "$WORK"
[ -f supabase/config.toml ] || npx -y supabase@latest init --force >/dev/null

# Migraciones de producción en orden; 005 y 006 nunca se ejecutan.
rm -f supabase/migrations/*.sql
cp "$ROOT/e2e/local/000_plataforma.sql" supabase/migrations/20260101000000_plataforma.sql
for f in "$ROOT"/supabase/migrations/*.sql; do
  b=$(basename "$f"); n=${b%%_*}
  case "$n" in 005|006) continue ;; esac
  cp "$f" "supabase/migrations/20260101000${n}_${b#*_}"
done

EXCLUDE=studio,imgproxy,edge-runtime,logflare,vector,supavisor,mailpit,realtime,storage-api,postgres-meta
if npx -y supabase@latest status >/dev/null 2>&1; then
  npx -y supabase@latest db reset >/dev/null
else
  npx -y supabase@latest start -x "$EXCLUDE" >/dev/null
fi

eval "$(npx -y supabase@latest status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"
for role in admin recepcion doctor enfermeria; do
  curl -sf -o /dev/null "$API_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$role@e2e.test\",\"password\":\"Prueba-E2e-2026!\",\"email_confirm\":true}"
done
DB=$(docker ps --format '{{.Names}}' | grep -m1 supabase_db)
docker exec -i "$DB" psql -U postgres -q -c \
  "update public.profiles p set role = split_part(u.email,'@',1)::public.user_role, full_name = 'E2E '||split_part(u.email,'@',1) from auth.users u where u.id = p.id;"

# Segunda clínica (B) con su admin, recepción y doctor, para 11-aislamiento-clinicas.
# Se crea después de los usuarios de A: con una sola clínica un usuario sin clínica
# cae en ella; con dos, la prueba verifica que falle.
docker exec -i "$DB" psql -U postgres -q -c \
  "insert into public.clinics (name) select 'Clínica B E2E' where not exists (select 1 from public.clinics where name = 'Clínica B E2E');"
CLINIC_B=$(docker exec -i "$DB" psql -U postgres -tA -c "select id from public.clinics where name = 'Clínica B E2E';")
for role in admin recepcion doctor; do
  curl -sf -o /dev/null "$API_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$role-b@e2e.test\",\"password\":\"Prueba-E2e-2026!\",\"email_confirm\":true,\"app_metadata\":{\"clinic_id\":\"$CLINIC_B\"}}"
done
docker exec -i "$DB" psql -U postgres -q -c \
  "update public.profiles p set role = split_part(split_part(u.email,'@',1),'-',1)::public.user_role, full_name = 'E2E '||split_part(u.email,'@',1) from auth.users u where u.id = p.id and u.email like '%-b@e2e.test';"

cat > "$ROOT/.env.e2e" <<ENV
NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
ENV
echo "Supabase local listo. Variables en .env.e2e"
