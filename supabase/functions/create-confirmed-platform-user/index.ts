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

function cleanString(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function cleanNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function buildUsuarioPayload(input: any, authUserId: string, authEmail: string): Record<string, unknown> | null {
  if (!input || typeof input !== "object") return null;

  return {
    idusuario: cleanString(input.idusuario ?? input.idUsuario),
    claveusuario: cleanString(input.claveusuario ?? input.claveUsuario),
    nombreusuario: cleanString(input.nombreusuario ?? input.nombreUsuario),
    nivel: cleanNumber(input.nivel),
    metaventa: cleanString(input.metaventa ?? input.metaVenta) ?? "0.00",
    correo: normalizeEmail(input.correo) || authEmail,
    clavecorreo: cleanString(input.clavecorreo ?? input.claveCorreo) ?? "",
    sucursalid: cleanNumber(input.sucursalid ?? input.sucursal),
    idtipousuario: cleanNumber(input.idtipousuario ?? input.idtipoUsuario),
    idpermiso: cleanNumber(input.idpermiso) ?? 1,
    cod_empre: cleanString(input.cod_empre),
    auth_user_id: authUserId,
  };
}

async function upsertUsuarioRow(
  adminClient: any,
  usuarioPayload: Record<string, unknown> | null,
): Promise<any | null> {
  if (!usuarioPayload) return null;

  const idusuario = cleanString(usuarioPayload.idusuario);
  if (!idusuario) {
    throw new Error("El usuario es requerido para crear myappdb.usuario.");
  }

  const { data: existingRows, error: existingError } = await adminClient
    .from("usuario")
    .select("codusuario,idusuario,auth_user_id")
    .ilike("idusuario", idusuario)
    .limit(1);

  if (existingError) throw existingError;

  const existing = Array.isArray(existingRows) ? existingRows[0] : null;
  if (existing?.codusuario) {
    const { data, error } = await adminClient
      .from("usuario")
      .update({
        ...usuarioPayload,
        idusuario: existing.idusuario,
      })
      .eq("codusuario", existing.codusuario)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await adminClient
    .from("usuario")
    .insert(usuarioPayload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function findAuthUserByEmail(adminClient: any, email: string): Promise<any | null> {
  const target = normalizeEmail(email);
  if (!target) return null;

  let page = 1;
  const perPage = 1000;
  while (page <= 20) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;

    const users = Array.isArray(data?.users) ? data.users : [];
    const found = users.find((user: any) => normalizeEmail(user?.email) === target);
    if (found) return found;
    if (users.length < perPage) return null;
    page += 1;
  }

  return null;
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
    const usuarioInput = body?.usuario;

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
    const dbSchema = Deno.env.get("SUPABASE_DB_SCHEMA") || "myappdb";

    if (!supabaseUrl || !serviceRole) {
      throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
    }

    const adminClient = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: dbSchema },
    });

    let createdNewAuthUser = false;
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
        const existingUser = await findAuthUserByEmail(adminClient, email);
        const existingUserId = String(existingUser?.id || "").trim();

        if (!existingUserId) {
          return jsonResponse(409, {
            ok: false,
            message: "Ese correo ya está registrado en Auth, pero no se pudo recuperar el usuario existente.",
            details: message,
          });
        }

        const { data: updated, error: updateError } =
          await adminClient.auth.admin.updateUserById(existingUserId, {
            password,
            email_confirm: true,
            user_metadata: {
              ...(existingUser?.user_metadata || {}),
              idusuario: idUsuario,
              nombreusuario: nombreUsuario,
            },
          });

        if (updateError) {
          return jsonResponse(409, {
            ok: false,
            message: "Ese correo ya está registrado en Auth y no pudo sincronizarse.",
            details: String(updateError?.message || message),
          });
        }

        const authUserId = String(updated?.user?.id || existingUserId).trim();
        const authEmail = String(updated?.user?.email || existingUser?.email || email).trim();
        const usuario = await upsertUsuarioRow(
          adminClient,
          buildUsuarioPayload(usuarioInput, authUserId, authEmail),
        );

        return jsonResponse(200, {
          ok: true,
          message: "Usuario auth existente reutilizado correctamente.",
          data: {
            authUserId,
            authEmail,
            existing: true,
            usuario,
          },
        });
      }

      return jsonResponse(400, {
        ok: false,
        message: "No se pudo crear el usuario en Auth.",
        details: message,
      });
    }

    createdNewAuthUser = true;
    const authUserId = String(data?.user?.id || "").trim();
    const authEmail = String(data?.user?.email || email).trim();

    if (!authUserId) {
      return jsonResponse(500, {
        ok: false,
        message: "Auth no devolvió un user id.",
      });
    }

    try {
      const usuario = await upsertUsuarioRow(
        adminClient,
        buildUsuarioPayload(usuarioInput, authUserId, authEmail),
      );

      return jsonResponse(200, {
        ok: true,
        message: "Usuario auth creado correctamente.",
        data: {
          authUserId,
          authEmail,
          usuario,
        },
      });
    } catch (insertError) {
      if (createdNewAuthUser) {
        await adminClient.auth.admin.deleteUser(authUserId).catch(() => undefined);
      }

      return jsonResponse(500, {
        ok: false,
        message: "Auth fue creado, pero no se pudo crear el usuario en myappdb.usuario.",
        details: insertError instanceof Error ? insertError.message : String(insertError),
      });
    }
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      message: "Error creando usuario confirmado en Auth.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
