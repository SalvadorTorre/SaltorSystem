const MEGAPLUS_ENDPOINT = "https://rnc.megaplus.com.do/api/consulta";

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

  try {
    const upstream = await fetch(
      `${MEGAPLUS_ENDPOINT}?rnc=${encodeURIComponent(rnc)}`,
      { headers: { Accept: "application/json" } },
    );
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return jsonResponse(502, {
      error: true,
      mensaje: "No se pudo consultar el registro de RNC",
    });
  }
});
