const MEGAPLUS_ENDPOINT = "https://rnc.megaplus.com.do/api/consulta";
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1_000;

type CachedResponse = {
  body: string;
  expiresAt: number;
};

const responseCache = new Map<string, CachedResponse>();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSuccessfulLookup(status: number, body: string): boolean {
  if (status < 200 || status >= 300) return false;
  try {
    const parsed = JSON.parse(body);
    return parsed?.error !== true && !!(
      parsed?.nombre_razon_social ||
      parsed?.razon_social ||
      parsed?.nombre ||
      parsed?.cedula_rnc
    );
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse(405, { error: true, mensaje: "Método no permitido" });
  }

  const url = new URL(req.url);
  let rnc = url.searchParams.get("rnc") || "";
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    rnc = String(body?.rnc || rnc);
  }
  rnc = rnc.replace(/[^0-9]/g, "");

  if (!rnc) {
    return jsonResponse(400, { error: true, mensaje: "Parametro rnc requerido" });
  }

  const cached = responseCache.get(rnc);
  if (cached && cached.expiresAt > Date.now()) {
    return new Response(cached.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-RNC-Cache": "HIT",
      },
    });
  }

  let lastStatus = 502;
  let lastBody = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const upstream = await fetch(
        `${MEGAPLUS_ENDPOINT}?rnc=${encodeURIComponent(rnc)}`,
        {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        },
      );
      const body = await upstream.text();
      lastStatus = upstream.status;
      lastBody = body;

      if (isSuccessfulLookup(upstream.status, body)) {
        responseCache.set(rnc, {
          body,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return new Response(body, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RNC-Attempt": String(attempt),
          },
        });
      }
    } catch {
      lastStatus = 502;
    } finally {
      clearTimeout(timeoutId);
    }

    if (attempt < MAX_ATTEMPTS) {
      await wait(250 * attempt);
    }
  }

  if (lastBody) {
    return new Response(lastBody, {
      status: lastStatus,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return jsonResponse(502, {
    error: true,
    mensaje: "No se pudo consultar el registro de RNC despues de varios intentos",
  });
});
