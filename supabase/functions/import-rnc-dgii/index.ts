import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { unzipSync } from "npm:fflate@0.8.2";

type ParsedRow = {
  rnc: string;
  rason: string;
  status: string;
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
    if (ch === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
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

async function importarRncDesdeZipBytes(
  zipBytes: Uint8Array,
  options: { truncate: boolean; batchSize: number; schema: string },
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }

  const db = createClient(supabaseUrl, serviceRole, {
    db: { schema: options.schema },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rawText = extractRncTextFromZip(zipBytes);
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => !!l);

  if (!lines.length) {
    throw new Error("No se encontraron líneas válidas en el archivo DGII.");
  }

  const delimiter = detectDelimiter(lines[0]);
  const firstRow = parseDelimitedLine(lines[0], delimiter);
  const firstNorm = firstRow.map((f) => normalizeText(f));
  const hasHeader =
    firstNorm.some((f) => f.includes("rnc") || f.includes("cedula")) &&
    firstNorm.some(
      (f) => f.includes("razon") || f.includes("nombre") || f.includes("social"),
    );

  const headerRow = hasHeader ? firstRow : [];
  const startIndex = hasHeader ? 1 : 0;
  const rncIdx = hasHeader
    ? pickColumn(headerRow, ["rnc", "cedula", "documento"], 0)
    : 0;
  const razonIdx = hasHeader
    ? pickColumn(headerRow, ["razon social", "razon", "nombre", "social"], 1)
    : 1;
  const statusIdx = hasHeader
    ? pickColumn(headerRow, ["status", "estado", "situacion"], 2)
    : 2;

  if (options.truncate) {
    const { error } = await db.from("rnc").delete().neq("id", 0);
    if (error) {
      throw new Error(`No se pudo limpiar myappdb.rnc: ${error.message}`);
    }
  }

  const seen = new Set<string>();
  const batch: ParsedRow[] = [];
  let totalFuente = 0;
  let insertados = 0;
  let descartados = 0;

  const flushBatch = async () => {
    if (!batch.length) return;
    const payload = batch.splice(0, batch.length);
    const { error } = await db.from("rnc").insert(payload);
    if (error) {
      throw new Error(`Error insertando lote en myappdb.rnc: ${error.message}`);
    }
    insertados += payload.length;
  };

  for (let i = startIndex; i < lines.length; i++) {
    const cols = parseDelimitedLine(lines[i], delimiter);
    const row = mapLineToRow(cols, rncIdx, razonIdx, statusIdx);
    if (!row) {
      descartados++;
      continue;
    }

    if (seen.has(row.rnc)) {
      descartados++;
      continue;
    }
    seen.add(row.rnc);

    totalFuente++;
    batch.push(row);
    if (batch.length >= options.batchSize) {
      await flushBatch();
    }
  }
  await flushBatch();

  return {
    totalFuente,
    insertados,
    errores: 0,
    descartados,
    schema: options.schema,
    batchSize: options.batchSize,
  };
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
    const schema = String(
      body?.schema || Deno.env.get("APP_SCHEMA") || "myappdb",
    ).trim() || "myappdb";
    const batchSize = Math.min(
      5000,
      Math.max(200, Number(body?.batchSize || 2000)),
    );
    const truncate = body?.truncate !== false;
    const sourceUrl = String(body?.url || Deno.env.get("DGII_RNC_URL") || DGII_ZIP_URL);

    const startedAt = Date.now();
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
      return jsonResponse(502, {
        ok: false,
        message: `DGII respondió HTTP ${response.status}`,
      });
    }

    const zipBytes = new Uint8Array(await response.arrayBuffer());
    if (!zipBytes.length) {
      return jsonResponse(422, {
        ok: false,
        message: "El ZIP descargado desde DGII está vacío.",
      });
    }

    const data = await importarRncDesdeZipBytes(zipBytes, {
      truncate,
      batchSize,
      schema,
    });

    return jsonResponse(200, {
      ok: true,
      message: "Base de datos de RNC actualizada exitosamente",
      data: {
        ...data,
        duracionMs: Date.now() - startedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse(500, {
      ok: false,
      message: "Error al importar padrón DGII",
      details: message,
    });
  }
});
