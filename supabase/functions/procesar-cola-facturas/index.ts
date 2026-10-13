import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function text(...values: unknown[]): string {
  for (const value of values) {
    const result = String(value ?? "").trim();
    if (result) return result;
  }
  return "";
}

function normalizeResult(raw: any) {
  const root = raw?.data ?? raw ?? {};
  const payload = root?.data ?? root;
  const first = Array.isArray(payload?.results) ? payload.results[0] : null;
  const result = first ?? payload?.result ?? payload ?? {};
  const dgii = result?.responseRFCE?.dgiiResponse ?? result?.responseXML?.dgiiResponse ?? {};
  const estado = text(result?.estado_dgii, result?.rfceEstado, result?.estado, dgii?.estado, result?.status).toUpperCase();
  return {
    estado_dgii: estado || null,
    estado_envio_dgii: estado || "PROCESADO",
    codseguridad: text(result?.codseguridad, result?.codigoSeguridad, dgii?.codigoSeguridad) || null,
    qr_link: text(result?.qr_link, result?.qrUrl, result?.urlConsulta) || null,
    fec_firma: text(result?.fec_firma, result?.fechaFirma) || null,
    dgii_track_id: text(result?.dgii_track_id, result?.trackId, dgii?.trackId) || null,
    dgii_codigo: text(result?.dgii_codigo, result?.codigo, dgii?.codigo) || null,
    dgii_error_message: text(result?.error, result?.message, result?.mensaje, dgii?.mensaje) || null,
    dgii_response_json: result,
    dgii_response_raw: raw,
  };
}

function classifyFailure(body: any) {
  const message = text(body?.message, body?.details?.message, body?.details, body?.error, body);
  const upper = `${message} ${JSON.stringify(body || {})}`.toUpperCase();
  if (/TIMEOUT|TARD[ÓO] DEMASIADO|ABORT|WORKERREQUESTCANCELLED/.test(upper)) {
    return { estado: "VERIFICAR", retry: false, message };
  }
  if (/RECHAZ|NO ACEPTAD|VALIDACI[ÓO]N|FORMATO INCORRECTO/.test(upper)) {
    return { estado: "RECHAZADO", retry: false, message };
  }
  // Una falla de red o del worker no demuestra que DGII no recibio el e-CF.
  // Nunca se reenvia automaticamente: primero debe verificarse su estado.
  return { estado: "VERIFICAR", retry: false, message };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response(405, { ok: false, message: "Metodo no permitido." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const schema = Deno.env.get("APP_SCHEMA") || "myappdb";
  if (!supabaseUrl || !serviceRole) {
    return response(500, { ok: false, message: "Falta la configuracion interna de Supabase." });
  }
  const admin = createClient(supabaseUrl, serviceRole, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = await req.json().catch(() => ({}));
    const limite = Math.min(Math.max(Number(body?.limite) || 5, 1), 20);
    const { data: jobs, error: claimError } = await admin.rpc("reclamar_cola_dgii", { p_limite: limite });
    if (claimError) throw claimError;

    const results: any[] = [];
    for (const job of jobs || []) {
      const endpoint = `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/send-dgii-direct-cert`;
      let httpStatus = 0;
      let resultBody: any = null;
      try {
        const upstream = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRole}`, apikey: serviceRole },
          body: JSON.stringify(job.payload),
        });
        httpStatus = upstream.status;
        const raw = await upstream.text();
        try { resultBody = raw ? JSON.parse(raw) : {}; } catch { resultBody = { raw }; }
        if (!upstream.ok || resultBody?.ok === false) {
          throw Object.assign(new Error(text(resultBody?.message, `HTTP ${httpStatus}`)), { resultBody });
        }

        const normalized = normalizeResult(resultBody);
        const dgiiState = text(normalized.estado_dgii).toUpperCase();
        const queueState = dgiiState.includes("CONDICIONAL") ? "ACEPTADO_CONDICIONAL"
          : dgiiState.includes("ACEPT") || dgiiState === "SUCCESS" ? "ACEPTADO"
          : dgiiState.includes("RECHAZ") ? "RECHAZADO" : "VERIFICAR";

        const { error: invoiceError } = await admin.from("factura").update({
          ...normalized,
          dgii_request_json: job.payload?.scenarios?.[0] ?? job.payload,
          dgii_updated_at: new Date().toISOString(),
          ...(queueState === "ACEPTADO" || queueState === "ACEPTADO_CONDICIONAL" ? { fa_status: "F" } : {}),
        }).eq("fa_codfact", job.fa_codfact).eq("fa_codempr", job.fa_codempr).eq("fa_codsucu", job.fa_codsucu);
        if (invoiceError) throw invoiceError;

        const { error: queueError } = await admin.from("cola_dgii").update({
          estado: queueState,
          ultimo_http_status: httpStatus,
          ultimo_error: normalized.dgii_error_message,
          respuesta: resultBody,
          bloqueado_hasta: null,
          actualizado_en: new Date().toISOString(),
          procesado_en: new Date().toISOString(),
        }).eq("id", job.id).eq("worker_id", job.worker_id);
        if (queueError) throw queueError;
        results.push({ id: job.id, factura: job.fa_codfact, estado: queueState });
      } catch (error: any) {
        const failureBody = error?.resultBody ?? resultBody ?? { message: error?.message || String(error) };
        const failure = classifyFailure(failureBody);
        const update: any = {
          estado: failure.estado,
          ultimo_http_status: httpStatus || null,
          ultimo_error: failure.message || error?.message || String(error),
          respuesta: failureBody,
          bloqueado_hasta: null,
          actualizado_en: new Date().toISOString(),
          procesado_en: failure.retry ? null : new Date().toISOString(),
        };
        await admin.from("cola_dgii").update(update).eq("id", job.id).eq("worker_id", job.worker_id);
        await admin.from("factura").update({
          estado_envio_dgii: failure.estado,
          dgii_error_message: update.ultimo_error,
          dgii_response_raw: failureBody,
          dgii_updated_at: new Date().toISOString(),
        }).eq("fa_codfact", job.fa_codfact).eq("fa_codempr", job.fa_codempr).eq("fa_codsucu", job.fa_codsucu);
        results.push({ id: job.id, factura: job.fa_codfact, estado: failure.estado });
      }
    }
    return response(200, { ok: true, procesadas: results.length, results });
  } catch (error) {
    return response(500, {
      ok: false,
      message: "No se pudo procesar la cola DGII.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
