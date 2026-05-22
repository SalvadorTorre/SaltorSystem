import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { unzipSync } from "npm:fflate@0.8.2";

type ParsedRow = {
  rnc: string;
  rason: string;
  status: string;
};

type JobStatus = "pending" | "running" | "success" | "error";
type ImportPhase =
  | "descargando"
  | "descomprimiendo"
  | "parseando"
  | "limpiando"
  | "insertando"
  | "completado";

type JobRow = {
  id: string;
  status: JobStatus;
  phase: ImportPhase;
  processed: number;
  total: number;
  inserted: number;
  errors: number;
  message: string | null;
  source_url: string | null;
  requested_by: string | null;
  schema_name: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DGII_ZIP_URL =
  "https://dgii.gov.do/app/WebApps/Consultas/RNC/RNC_CONTRIBUYENTES.zip";

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function normalizeText(input: string): string {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function detectDelimiter(sampleLine: string): string {
  const candidates = [",", ";", "|", "\t"];
  let best = ",";
  let maxCount = -1;
  for (const c of candidates) {
    const count = sampleLine.split(c).length - 1;
    if (count > maxCount) {
      maxCount = count;
      best = c;
    }
  }
  return best;
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

function pickColumn(
  headers: string[],
  candidates: string[],
  fallback: number,
): number {
  const normalized = headers.map((h) => normalizeText(h));
  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];
    if (candidates.some((c) => h.includes(c))) return i;
  }
  return fallback;
}

function decodeBytes(bytes: Uint8Array): string {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (utf8.includes("\uFFFD")) {
    return new TextDecoder("windows-1252", { fatal: false }).decode(bytes);
  }
  return utf8;
}

function extractRncTextFromZip(zipBytes: Uint8Array): string {
  const entries = unzipSync(zipBytes);
  const fileNames = Object.keys(entries).filter((name) =>
    !name.endsWith("/") && !name.includes("__MACOSX")
  );
  if (!fileNames.length) {
    throw new Error("El ZIP de DGII está vacío.");
  }

  const preferred = fileNames.find((name) =>
      /rnc/i.test(name) && /\.(csv|txt)$/i.test(name)
    ) ||
    fileNames.find((name) => /\.(csv|txt)$/i.test(name)) ||
    fileNames[0];

  const bytes = entries[preferred];
  if (!bytes || !bytes.length) {
    throw new Error("No se pudo leer el archivo de RNC dentro del ZIP.");
  }

  return decodeBytes(bytes);
}

function mapLineToRow(
  cols: string[],
  rncIdx: number,
  razonIdx: number,
  statusIdx: number,
): ParsedRow | null {
  const rawRnc = String(cols[rncIdx] ?? cols[0] ?? "").trim();
  const cleanRnc = rawRnc.replace(/[^\d]/g, "");
  if (!cleanRnc || cleanRnc.length < 8) return null;

  const rason = String(cols[razonIdx] ?? cols[1] ?? "").trim();
  if (!rason) return null;

  const statusRaw = String(cols[statusIdx] ?? "").trim();
  const status = statusRaw ? statusRaw.toUpperCase() : "ACTIVO";

  return { rnc: cleanRnc, rason, status };
}

function isMissingRelationError(error: unknown, relation: string): boolean {
  const rel = String(relation || "").trim().toLowerCase();
  const msg = String((error as any)?.message || "").toLowerCase();
  return msg.includes("relation") && msg.includes(rel);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isStaleRunningJob(row: Partial<JobRow> | null): boolean {
  if (!row) return false;
  if (row.status !== "running" && row.status !== "pending") return false;

  const startRef = String(row.started_at || row.created_at || "").trim();
  if (!startRef) return false;
  const startedMs = new Date(startRef).getTime();
  if (!Number.isFinite(startedMs)) return false;

  const ageMs = Date.now() - startedMs;
  // 10 minutos sin completar se considera colgado.
  return ageMs > 10 * 60 * 1000;
}

function toJobDto(row: JobRow | null): any {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    phase: row.phase,
    processed: Number(row.processed || 0),
    total: Number(row.total || 0),
    inserted: Number(row.inserted || 0),
    errors: Number(row.errors || 0),
    message: row.message || "",
    sourceUrl: row.source_url || "",
    requestedBy: row.requested_by || "",
    schema: row.schema_name || "",
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
    running: row.status === "pending" || row.status === "running",
    success: row.status === "success"
      ? true
      : row.status === "error"
      ? false
      : null,
  };
}

async function getDb(schema: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRole, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function updateJob(
  db: any,
  jobId: string,
  patch: Partial<JobRow>,
): Promise<void> {
  const payload: any = { ...patch };
  const { error } = await db
    .from("rnc_import_job")
    .update(payload)
    .eq("id", jobId);
  if (error) {
    console.error("No se pudo actualizar rnc_import_job", error);
  }
}

async function runImportJob(
  schema: string,
  jobId: string,
  sourceUrl: string,
  batchSize: number,
): Promise<void> {
  const db = await getDb(schema);

  const report = async (
    phase: ImportPhase,
    patch?: Partial<JobRow>,
  ) => {
    await updateJob(db, jobId, {
      phase,
      ...patch,
    });
  };

  try {
    await updateJob(db, jobId, {
      status: "running",
      started_at: new Date().toISOString(),
      phase: "descargando",
      message: "Descargando ZIP de DGII...",
      processed: 0,
      total: 0,
      inserted: 0,
      errors: 0,
    });

    const response = await fetch(sourceUrl, {
      method: "GET",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "accept": "*/*",
        "referer": "https://dgii.gov.do/",
      },
    });

    if (!response.ok) {
      throw new Error(`DGII respondió HTTP ${response.status}`);
    }

    const zipBytes = new Uint8Array(await response.arrayBuffer());
    if (!zipBytes.length) {
      throw new Error("El ZIP descargado desde DGII está vacío.");
    }

    await report("descomprimiendo", {
      message: "Descomprimiendo archivo...",
    });

    const rawText = extractRncTextFromZip(zipBytes);
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => !!l);

    if (!lines.length) {
      throw new Error("No se encontraron líneas válidas en el archivo DGII.");
    }

    await report("parseando", {
      total: lines.length,
      message: "Parseando registros del padrón DGII...",
    });

    const delimiter = detectDelimiter(lines[0]);
    const firstRow = parseDelimitedLine(lines[0], delimiter);
    const firstNorm = firstRow.map((f) => normalizeText(f));
    const hasHeader =
      firstNorm.some((f) => f.includes("rnc") || f.includes("cedula")) &&
      firstNorm.some(
        (f) =>
          f.includes("razon") ||
          f.includes("nombre") ||
          f.includes("social"),
      );

    const headerRow = hasHeader ? firstRow : [];
    const startIndex = hasHeader ? 1 : 0;
    const rncIdx = hasHeader
      ? pickColumn(headerRow, ["rnc", "cedula", "documento"], 0)
      : 0;
    const razonIdx = hasHeader
      ? pickColumn(
        headerRow,
        ["razon social", "razon", "nombre", "social"],
        1,
      )
      : 1;
    const statusIdx = hasHeader
      ? pickColumn(headerRow, ["status", "estado", "situacion"], 2)
      : 2;

    await report("limpiando", {
      message: "Vaciando tabla de RNC...",
    });

    const clear = await db.from("rnc").delete().neq("id", 0);
    if (clear.error) {
      throw new Error(`No se pudo limpiar ${schema}.rnc: ${clear.error.message}`);
    }

    let processed = 0;
    let inserted = 0;
    let discarded = 0;

    const seen = new Set<string>();
    const batch: ParsedRow[] = [];

    const flushBatch = async () => {
      if (!batch.length) return;
      const payload = batch.splice(0, batch.length);
      const { error } = await db
        .from("rnc")
        .upsert(payload, { onConflict: "rnc" });
      if (error) {
        throw new Error(`Error insertando lote en ${schema}.rnc: ${error.message}`);
      }
      inserted += payload.length;
      await report("insertando", {
        processed,
        total: Math.max(0, lines.length - startIndex),
        inserted,
        errors: discarded,
        message: "Insertando registros...",
      });
    };

    const totalWork = Math.max(0, lines.length - startIndex);
    await report("insertando", {
      total: totalWork,
      processed: 0,
      inserted: 0,
      errors: 0,
      message: "Insertando registros...",
    });

    for (let i = startIndex; i < lines.length; i++) {
      const cols = parseDelimitedLine(lines[i], delimiter);
      const row = mapLineToRow(cols, rncIdx, razonIdx, statusIdx);

      if (!row || seen.has(row.rnc)) {
        discarded++;
        processed++;
        if (processed % 1000 === 0) {
          await report("insertando", {
            processed,
            total: totalWork,
            inserted,
            errors: discarded,
            message: "Insertando registros...",
          });
        }
        continue;
      }

      seen.add(row.rnc);
      processed++;
      batch.push(row);

      if (batch.length >= batchSize) {
        await flushBatch();
      }
    }

    await flushBatch();

    await updateJob(db, jobId, {
      status: "success",
      phase: "completado",
      processed,
      total: totalWork,
      inserted,
      errors: discarded,
      message: "Importación completada.",
      finished_at: new Date().toISOString(),
    });
  } catch (error) {
    await updateJob(db, jobId, {
      status: "error",
      phase: "completado",
      message: error instanceof Error ? error.message : String(error),
      finished_at: new Date().toISOString(),
    });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, {
      ok: false,
      message: "Método no permitido. Usa POST.",
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "start").trim().toLowerCase();
    const schema = String(body?.schema || Deno.env.get("APP_SCHEMA") || "").trim();
    if (!schema) {
      return jsonResponse(422, {
        ok: false,
        message:
          "Debes indicar el schema en body.schema o en el secret APP_SCHEMA.",
      });
    }
    const sourceUrl = String(body?.url || Deno.env.get("DGII_RNC_URL") || DGII_ZIP_URL);
    const batchSize = Math.min(
      5000,
      Math.max(200, Number(body?.batchSize || 2000)),
    );

    const db = await getDb(schema);

    if (action === "status") {
      const requestedJobId = String(body?.jobId || "").trim();
      let query = db.from("rnc_import_job").select("*").limit(1);

      if (requestedJobId) {
        query = query.eq("id", requestedJobId);
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query.maybeSingle();
      if (error) {
        if (isMissingRelationError(error, "rnc_import_job")) {
          return jsonResponse(200, {
            ok: false,
            message:
              `Falta la tabla ${schema}.rnc_import_job. Ejecuta la migración migrate_rnc_import_job.sql.`,
          });
        }
        throw new Error(`No se pudo consultar el estado del job: ${error.message}`);
      }

      let row = (data || null) as JobRow | null;
      if (isStaleRunningJob(row)) {
        await updateJob(db, String(row?.id || ""), {
          status: "error",
          phase: "completado",
          finished_at: new Date().toISOString(),
          message:
            "Job detenido por timeout/recurso. Inicia una nueva importación.",
        });
        const refreshed = await db
          .from("rnc_import_job")
          .select("*")
          .eq("id", String(row?.id || ""))
          .maybeSingle();
        if (!refreshed.error) {
          row = (refreshed.data || null) as JobRow | null;
        }
      }

      return jsonResponse(200, {
        ok: true,
        message: row ? "Estado del job obtenido." : "No hay jobs de importación.",
        data: {
          job: toJobDto(row),
        },
      });
    }

    if (action !== "start") {
      return jsonResponse(200, {
        ok: false,
        message: "Acción no válida. Usa action=start o action=status.",
      });
    }

    const active = await db
      .from("rnc_import_job")
      .select("*")
      .in("status", ["pending", "running"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (active.error) {
      if (isMissingRelationError(active.error, "rnc_import_job")) {
        return jsonResponse(200, {
          ok: false,
          message:
            `Falta la tabla ${schema}.rnc_import_job. Ejecuta la migración migrate_rnc_import_job.sql.`,
        });
      }
      throw new Error(`No se pudo validar jobs activos: ${active.error.message}`);
    }

    if (active.data && isStaleRunningJob(active.data as JobRow)) {
      await updateJob(db, String((active.data as JobRow).id || ""), {
        status: "error",
        phase: "completado",
        finished_at: new Date().toISOString(),
        message:
          "Job detenido por timeout/recurso. Inicia una nueva importación.",
      });
    } else if (active.data) {
      return jsonResponse(200, {
        ok: true,
        message: "Ya existe una importación ejecutándose en servidor.",
        data: {
          started: false,
          jobId: active.data.id,
          job: toJobDto(active.data as JobRow),
        },
      });
    }

    const jobId = crypto.randomUUID();
    const requestedBy = String(body?.requestedBy || "sistema").trim() || "sistema";

    const created = await db
      .from("rnc_import_job")
      .insert({
        id: jobId,
        status: "pending",
        phase: "descargando",
        processed: 0,
        total: 0,
        inserted: 0,
        errors: 0,
        message: "Job creado en servidor.",
        source_url: sourceUrl,
        requested_by: requestedBy,
        schema_name: schema,
      })
      .select("*")
      .maybeSingle();

    if (created.error) {
      if (isMissingRelationError(created.error, "rnc_import_job")) {
        return jsonResponse(200, {
          ok: false,
          message:
            `Falta la tabla ${schema}.rnc_import_job. Ejecuta la migración migrate_rnc_import_job.sql.`,
        });
      }
      throw new Error(`No se pudo crear el job: ${created.error.message}`);
    }

    const runPromise = runImportJob(schema, jobId, sourceUrl, batchSize);
    const edgeRuntime = (globalThis as any).EdgeRuntime;
    if (edgeRuntime && typeof edgeRuntime.waitUntil === "function") {
      edgeRuntime.waitUntil(runPromise);
    } else {
      runPromise.catch((e) => {
        console.error("Error ejecutando job RNC", e);
      });
    }

    await sleep(50);

    return jsonResponse(200, {
      ok: true,
      message: "Job de importación iniciado en servidor.",
      data: {
        started: true,
        jobId,
        job: toJobDto((created.data || null) as JobRow | null),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse(500, {
      ok: false,
      message: "Error manejando job de importación RNC.",
      details: message,
    });
  }
});
