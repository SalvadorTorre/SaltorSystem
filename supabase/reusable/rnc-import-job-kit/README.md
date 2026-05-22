# RNC Import Job Kit (Supabase)

Kit portable para importar el padrón DGII de RNC en segundo plano con estado de job.

## Contenido

- `sql/001_migrate_rnc_import_job.sql`
  - Crea la tabla `<APP_SCHEMA>.rnc_import_job`.
  - Crea índices y constraints.
  - Agrega permisos para `service_role`.
  - Incluye `NOTIFY pgrst, 'reload schema';` para refrescar cache.
- `functions/rnc-import-job/index.ts`
  - Edge Function con acciones:
    - `action=start` inicia job.
    - `action=status` consulta progreso/resultado.
  - Controla jobs colgados por timeout.
- `sql/002_optional_cron_daily.sql`
  - Ejemplo opcional para lanzar `action=start` cada día vía `pg_cron + pg_net`.

## Requisitos

- Proyecto Supabase activo.
- Tabla `<APP_SCHEMA>.rnc` existente (columnas: `id`, `rnc`, `rason`, `status`).
- Supabase CLI instalado para deploy de Edge Function.

## Instalación (otro proyecto)

### 1) SQL Editor

En el proyecto destino, abre SQL Editor y ejecuta completo:

- `sql/001_migrate_rnc_import_job.sql`

Antes de ejecutar, en ese SQL cambia:

- `v_schema := 'myappdb';` por tu schema real.

### 2) Copiar Edge Function

Copia `functions/rnc-import-job/index.ts` al proyecto destino en:

- `supabase/functions/rnc-import-job/index.ts`

### 3) Configurar secrets (CLI)

Ejemplo:

```bash
SUPABASE_ACCESS_TOKEN="<TU_ACCESS_TOKEN>" \
npx supabase secrets set APP_SCHEMA=<APP_SCHEMA> --project-ref <PROJECT_REF>
```

Opcional (si quieres otra URL fuente):

```bash
SUPABASE_ACCESS_TOKEN="<TU_ACCESS_TOKEN>" \
npx supabase secrets set DGII_RNC_URL="https://dgii.gov.do/app/WebApps/Consultas/RNC/RNC_CONTRIBUYENTES.zip" --project-ref <PROJECT_REF>
```

### 4) Deploy

```bash
SUPABASE_ACCESS_TOKEN="<TU_ACCESS_TOKEN>" \
npx supabase functions deploy rnc-import-job --project-ref <PROJECT_REF> --no-verify-jwt
```

## Probar rápido

Usa tu `ANON_KEY`:

### Iniciar job

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/rnc-import-job" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"action":"start","schema":"<APP_SCHEMA>","requestedBy":"admin"}'
```

### Consultar estado

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/rnc-import-job" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"action":"status","schema":"<APP_SCHEMA>"}'
```

## Respuesta esperada (status)

- `status`: `pending | running | success | error`
- `phase`: `descargando | descomprimiendo | parseando | limpiando | insertando | completado`
- `processed`, `total`, `inserted`, `errors`
- `message`

## Notas

- El job limpia `<APP_SCHEMA>.rnc` y vuelve a cargar todo desde DGII.
- Si el runtime queda colgado por recursos, el job se marca como error por timeout.
- Puedes relanzar `action=start` después de un `error`.
- Si prefieres automático, usa `002_optional_cron_daily.sql` (opcional).

## Solución de problemas

- Error de tabla no encontrada en schema cache:
  - Re-ejecuta `001_migrate_rnc_import_job.sql`.
- Error de recursos del worker:
  - Reintenta; el job detecta timeout y libera bloqueo.
- No avanza de fase:
  - Verifica conectividad de salida hacia la URL DGII desde Edge Runtime.
