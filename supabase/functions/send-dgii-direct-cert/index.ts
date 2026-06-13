import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function cleanUrl(url: string): string {
  return String(url || "").trim().replace(/\/+$/, "");
}

function buildEndpointCandidates(
  baseUrl: string,
  ambiente: "test" | "prod",
): string[] {
  const base = cleanUrl(baseUrl);
  if (!base) return [];

  const endpoints: string[] = [];
  endpoints.push(`${base}/${ambiente}/api/test-body-direct-cert`);

  // Compatibilidad: algunos servidores esperan /ecf/api/<ambiente>/api/...
  if (!/\/api$/i.test(base)) {
    endpoints.push(`${base}/api/${ambiente}/api/test-body-direct-cert`);
  }

  return Array.from(new Set(endpoints));
}

function normalizeAmbiente(value: unknown): "test" | "prod" {
  const raw = String(value || "test").trim().toLowerCase();
  return raw === "prod" ? "prod" : "test";
}

function normalizeRnc(value: unknown): string {
  return String(value || "").replace(/[^0-9]/g, "");
}

function isMissingColumnError(error: unknown, column: string): boolean {
  const col = String(column || "").trim().toLowerCase();
  const msg = String((error as any)?.message || "").toLowerCase();
  return (
    msg.includes(`could not find the '${col}' column`) ||
    msg.includes(`column "${col}"`) ||
    msg.includes(col)
  );
}

function isMissingTableError(error: unknown): boolean {
  const code = String((error as any)?.code || "").trim();
  const msg = String((error as any)?.message || "").toLowerCase();
  return code === "42P01" || code === "PGRST205" ||
    msg.includes("does not exist") || msg.includes("not exist") ||
    msg.includes("could not find the table");
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
    const scenarios = Array.isArray(body?.scenarios) ? body.scenarios : [];
    if (!scenarios.length) {
      return jsonResponse(400, {
        ok: false,
        message: "Debes enviar al menos un escenario en scenarios[].",
      });
    }

    const schema = String(
      body?.schema || Deno.env.get("APP_SCHEMA") || "myappdb",
    ).trim() || "myappdb";

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) {
      throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
    }

    const db = createClient(supabaseUrl, serviceRole, {
      db: { schema },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let { data: cfg, error: cfgError } = await db
      .from("configuracion_global")
      .select(
        "id,dgii_base_url,dgii_ambiente,certificado_p12_base64,certificado_password"
      )
      .eq("id", 1)
      .maybeSingle();

    if (cfgError && isMissingColumnError(cfgError, "dgii_ambiente")) {
      const legacy = await db
        .from("configuracion_global")
        .select(
          "id,dgii_base_url,certificado_p12_base64,certificado_password"
        )
        .eq("id", 1)
        .maybeSingle();

      cfg = legacy.data ? { ...legacy.data, dgii_ambiente: "test" } : null;
      cfgError = legacy.error;
    }

    if (cfgError) {
      throw new Error(`No se pudo leer configuracion_global: ${cfgError.message}`);
    }

    const dgiiBaseUrl = cleanUrl(cfg?.dgii_base_url || "");
    let dgiiAmbiente = normalizeAmbiente(cfg?.dgii_ambiente);
    const certB64 = String(cfg?.certificado_p12_base64 || "").trim();
    const certPassword = String(cfg?.certificado_password || "").trim();

    if (!dgiiBaseUrl) {
      return jsonResponse(422, {
        ok: false,
        message: "No hay dgii_base_url configurado en configuración global.",
      });
    }
    if (!certB64 && !certPassword) {
      return jsonResponse(422, {
        ok: false,
        message:
          "No hay certificado o contraseña configurados en Mantenimiento > Firma digital DGII.",
      });
    }
    if (!certB64) {
      return jsonResponse(422, {
        ok: false,
        message:
          "No hay certificado .p12 configurado en Mantenimiento > Firma digital DGII.",
      });
    }
    if (!certPassword) {
      return jsonResponse(422, {
        ok: false,
        message:
          "El certificado está cargado, pero falta su contraseña en Mantenimiento > Firma digital DGII.",
      });
    }

    const rncBody = normalizeRnc(body?.rncEmisor);
    const rncScenario = normalizeRnc(scenarios?.[0]?.RNCEmisor);
    const certRnc = rncBody || rncScenario;
    if (!certRnc) {
      return jsonResponse(422, {
        ok: false,
        message: "No se encontró RNC emisor para enviar a DGII.",
      });
    }

    let empresaAmbiente: any = null;
    const { data: empresasRows, error: empresasError } = await db
      .from("empresas")
      .select("cod_empre,nom_empre,rnc_empre")
      .limit(2000);

    if (empresasError) {
      throw new Error(`No se pudo leer empresas: ${empresasError.message}`);
    }

    const empresa = (empresasRows || []).find((row: any) =>
      normalizeRnc(row?.rnc_empre) === certRnc
    );

    if (empresa?.cod_empre) {
      const { data: cfgEmpresa, error: cfgEmpresaError } = await db
        .from("configuracion_dgii_empresa")
        .select("cod_empre,dgii_ambiente,activo")
        .eq("cod_empre", empresa.cod_empre)
        .maybeSingle();

      if (cfgEmpresaError && !isMissingTableError(cfgEmpresaError)) {
        throw new Error(
          `No se pudo leer configuracion_dgii_empresa: ${cfgEmpresaError.message}`,
        );
      }

      if (cfgEmpresa?.activo !== false && cfgEmpresa?.dgii_ambiente) {
        empresaAmbiente = cfgEmpresa;
        dgiiAmbiente = normalizeAmbiente(cfgEmpresa.dgii_ambiente);
      }
    }

    const payload = { scenarios };
    const endpointCandidates = buildEndpointCandidates(dgiiBaseUrl, dgiiAmbiente);
    if (!endpointCandidates.length) {
      return jsonResponse(422, {
        ok: false,
        message: "No hay endpoint DGII válido configurado.",
      });
    }

    let upstreamBody: any = null;
    let endpoint = endpointCandidates[0];
    let finalStatus = 500;
    const tried: Array<{ endpoint: string; status: number; details: any }> = [];
    let ok = false;

    for (const candidate of endpointCandidates) {
      endpoint = candidate;
      const upstream = await fetch(candidate, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cert-p12-b64": certB64,
          "x-cert-password": certPassword,
          "x-cert-rnc": certRnc,
        },
        body: JSON.stringify(payload),
      });

      finalStatus = upstream.status;
      const rawText = await upstream.text();
      try {
        upstreamBody = rawText ? JSON.parse(rawText) : {};
      } catch {
        upstreamBody = { raw: rawText };
      }

      if (upstream.ok) {
        ok = true;
        break;
      }

      tried.push({
        endpoint: candidate,
        status: upstream.status,
        details: upstreamBody,
      });

      // Si no es 404, no seguir intentando rutas alternativas.
      if (upstream.status !== 404) {
        break;
      }
    }

    if (!ok) {
      return jsonResponse(502, {
        ok: false,
        message: `DGII proxy respondió HTTP ${finalStatus}`,
        details: upstreamBody,
        endpoint,
        ambiente: dgiiAmbiente,
        empresa: empresa?.cod_empre || null,
        ambiente_origen: empresaAmbiente ? "empresa" : "global",
        endpoints_intentados: tried,
      });
    }

    return jsonResponse(200, {
      ok: true,
      message: "Envío DGII procesado.",
      data: upstreamBody,
      endpoint,
      ambiente: dgiiAmbiente,
      empresa: empresa?.cod_empre || null,
      ambiente_origen: empresaAmbiente ? "empresa" : "global",
    });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      message: "Error enviando comprobante a DGII.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
