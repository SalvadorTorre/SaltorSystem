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

function normalizeEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function normalizePassword(value: unknown): string {
  return String(value || "").trim();
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
    const email = normalizeEmail(body?.email);
    const password = normalizePassword(body?.password);
    const idUsuario = String(body?.idUsuario || "").trim();
    const nombreUsuario = String(body?.nombreUsuario || "").trim();

    if (!email || !email.includes("@")) {
      return jsonResponse(422, {
        ok: false,
        message: "Debes enviar un correo válido.",
      });
    }

    if (!password || password.length < 8) {
      return jsonResponse(422, {
        ok: false,
        message: "La contraseña de auth debe tener al menos 8 caracteres.",
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRole) {
      throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
    }

    const adminClient = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        idusuario: idUsuario,
        nombreusuario: nombreUsuario,
      },
    });

    if (error) {
      const message = String(error?.message || "No se pudo crear usuario auth");
      const lower = message.toLowerCase();
      if (
        lower.includes("already") ||
        lower.includes("exists") ||
        lower.includes("registered")
      ) {
        return jsonResponse(409, {
          ok: false,
          message: "Ese correo ya está registrado en Auth.",
          details: message,
        });
      }

      return jsonResponse(400, {
        ok: false,
        message: "No se pudo crear el usuario en Auth.",
        details: message,
      });
    }

    const authUserId = String(data?.user?.id || "").trim();
    const authEmail = String(data?.user?.email || email).trim();

    if (!authUserId) {
      return jsonResponse(500, {
        ok: false,
        message: "Auth no devolvió un user id.",
      });
    }

    return jsonResponse(200, {
      ok: true,
      message: "Usuario auth creado correctamente.",
      data: {
        authUserId,
        authEmail,
      },
    });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      message: "Error creando usuario confirmado en Auth.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
