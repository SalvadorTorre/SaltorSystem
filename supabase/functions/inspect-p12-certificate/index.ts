import forge from "npm:node-forge@1.3.1";

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

function normalizeBase64(input: string): string {
  return String(input || "")
    .replace(/^data:.*;base64,/, "")
    .replace(/\s+/g, "");
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
    const p12Base64 = normalizeBase64(String(body?.p12Base64 || ""));
    const password = String(body?.password || "");

    if (!p12Base64) {
      return jsonResponse(400, {
        ok: false,
        message: "Debes enviar el archivo .p12 en base64.",
      });
    }

    const der = forge.util.decode64(p12Base64);
    const asn1 = forge.asn1.fromDer(der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);

    const certBags = p12.getBags({
      bagType: forge.pki.oids.certBag,
    })[forge.pki.oids.certBag] || [];

    if (!certBags.length || !certBags[0]?.cert) {
      return jsonResponse(422, {
        ok: false,
        message: "No se encontró un certificado válido dentro del archivo .p12.",
      });
    }

    const cert = certBags[0].cert;
    const notAfter = cert.validity?.notAfter;
    const notBefore = cert.validity?.notBefore;

    const subjectCnField = cert.subject?.attributes?.find((a: any) => a?.name === "commonName");
    const issuerCnField = cert.issuer?.attributes?.find((a: any) => a?.name === "commonName");

    const subjectCn = String(subjectCnField?.value || "").trim();
    const issuerCn = String(issuerCnField?.value || "").trim();

    return jsonResponse(200, {
      ok: true,
      message: "Certificado leído correctamente.",
      data: {
        notBefore: notBefore ? new Date(notBefore).toISOString() : null,
        notAfter: notAfter ? new Date(notAfter).toISOString() : null,
        subjectCn: subjectCn || null,
        issuerCn: issuerCn || null,
      },
    });
  } catch (error) {
    return jsonResponse(422, {
      ok: false,
      message: "No se pudo leer el certificado. Verifica archivo o contraseña.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
