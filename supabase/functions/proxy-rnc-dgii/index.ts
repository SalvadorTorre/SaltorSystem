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
    const sourceUrl = String(body?.url || DGII_ZIP_URL);

    const upstream = await fetch(sourceUrl, {
      method: "GET",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "accept": "*/*",
        "referer": "https://dgii.gov.do/",
      },
    });

    if (!upstream.ok || !upstream.body) {
      return jsonResponse(502, {
        ok: false,
        message: `DGII respondió HTTP ${upstream.status}`,
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type":
          upstream.headers.get("content-type") ||
          "application/x-zip-compressed",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      message: "No se pudo obtener el ZIP de DGII desde el proxy.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
