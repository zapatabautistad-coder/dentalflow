#!/usr/bin/env bash
# Enciende Docker al empezar una sesión de Claude Code en la nube, para las
# pruebas E2E contra Supabase local. En la PC (sin dockerd) no hace nada.
command -v dockerd >/dev/null 2>&1 || exit 0
docker ps >/dev/null 2>&1 && exit 0
nohup dockerd >/tmp/dockerd.log 2>&1 &
for _ in $(seq 1 30); do docker ps >/dev/null 2>&1 && exit 0; sleep 1; done
exit 0
