/**
 * Sincroniza myappdb.usuario con auth.users en Supabase.
 *
 * Qué hace:
 * 1) Lee usuarios de myappdb.usuario
 * 2) Busca/crea auth.users (por correo)
 * 3) Actualiza myappdb.usuario.auth_user_id
 * 4) Reporta usuarios con clave temporal
 *
 * Uso:
 * SUPABASE_URL="https://<project-ref>.supabase.co" \
 * SUPABASE_SERVICE_KEY="<service-role-key>" \
 * APP_SCHEMA="myappdb" \
 * RESET_PASSWORDS="false" \
 * node supabase/sync_auth_users_from_usuario.mjs
 */

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const APP_SCHEMA = process.env.APP_SCHEMA || "myappdb";
const RESET_PASSWORDS = String(process.env.RESET_PASSWORDS || "false")
  .trim()
  .toLowerCase() === "true";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Faltan variables: SUPABASE_URL y SUPABASE_SERVICE_KEY son obligatorias."
  );
  process.exit(1);
}

if (SUPABASE_SERVICE_KEY === "<TU_SERVICE_ROLE_KEY>") {
  console.error(
    "SUPABASE_SERVICE_KEY tiene placeholder. Debes usar la service_role real."
  );
  process.exit(1);
}

function mkHeaders({ schema, write = false } = {}) {
  const headers = {
    "Content-Type": "application/json",
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  };
  if (schema) {
    headers["Accept-Profile"] = schema;
    if (write) headers["Content-Profile"] = schema;
  }
  return headers;
}

async function req(method, path, { body, schema, write = false } = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: mkHeaders({ schema, write }),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} ${response.statusText}`);
    error.details = data;
    throw error;
  }
  return data;
}

function sanitizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return email.includes("@") ? email : "";
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function buildAuthEmail(row) {
  const byCorreo = sanitizeEmail(row?.correo);
  if (byCorreo) return byCorreo;
  const user = normalizeUsername(row?.idusuario);
  return user ? `${user}@saltorsystem.local` : "";
}

function looksLikeHash(value) {
  const raw = String(value || "");
  return raw.startsWith("$2a$") || raw.startsWith("$2b$") || raw.startsWith("$2y$");
}

function buildInternalPassword(username, plainPassword) {
  const id = String(username || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const prefix = id || "USUARIO";
  const generated = `${prefix}#${plainPassword}#SS`;
  return generated.length >= 8 ? generated : generated.padEnd(8, "X");
}

function buildAuthPassword(row) {
  const rawClave = String(row?.claveusuario ?? "").trim();
  const user = String(row?.idusuario ?? "").trim();

  if (!rawClave) {
    return {
      password: buildInternalPassword(user, "0000"),
      temporary: true,
      reason: "clave vacia",
    };
  }

  if (looksLikeHash(rawClave)) {
    return {
      password: buildInternalPassword(user, "0000"),
      temporary: true,
      reason: "clave hasheada no reutilizable",
    };
  }

  if (rawClave.length === 4) {
    return {
      password: buildInternalPassword(user, rawClave),
      temporary: false,
      reason: "clave 4 digitos mapeada",
    };
  }

  if (rawClave.length >= 8 && rawClave.length <= 64) {
    return {
      password: rawClave,
      temporary: false,
      reason: "clave directa",
    };
  }

  return {
    password: buildInternalPassword(user, rawClave.slice(0, 4).padEnd(4, "0")),
    temporary: true,
    reason: "clave atipica convertida",
  };
}

async function fetchAllAuthUsers() {
  let page = 1;
  const perPage = 1000;
  const users = [];
  while (true) {
    const res = await req(
      "GET",
      `/auth/v1/admin/users?page=${page}&per_page=${perPage}`
    );
    const chunk = Array.isArray(res?.users) ? res.users : [];
    users.push(...chunk);
    if (chunk.length < perPage) break;
    page += 1;
  }
  return users;
}

async function main() {
  const usuarios = await req(
    "GET",
    "/rest/v1/usuario?select=codusuario,idusuario,claveusuario,correo,auth_user_id&order=codusuario.asc",
    { schema: APP_SCHEMA }
  );

  if (!Array.isArray(usuarios) || usuarios.length === 0) {
    console.log(JSON.stringify({ ok: true, message: "No hay usuarios para sincronizar." }, null, 2));
    return;
  }

  const authUsers = await fetchAllAuthUsers();
  const authByEmail = new Map(
    authUsers
      .map((u) => [String(u?.email || "").trim().toLowerCase(), u])
      .filter(([email]) => !!email)
  );

  const report = {
    totalUsuarios: usuarios.length,
    linked: 0,
    createdAuth: 0,
    updatedAuthPassword: 0,
    alreadyLinked: 0,
    skipped: 0,
    tempPasswords: [],
    errors: [],
  };

  for (const row of usuarios) {
    const codusuario = Number(row?.codusuario || 0);
    const idusuario = String(row?.idusuario || "").trim();
    const currentAuthUserId = String(row?.auth_user_id || "").trim();
    const email = buildAuthEmail(row);

    if (!codusuario || !idusuario || !email) {
      report.skipped += 1;
      report.errors.push({
        codusuario,
        idusuario,
        reason: "faltan campos minimos (codusuario/idusuario/correo)",
      });
      continue;
    }

    const authPassword = buildAuthPassword(row);
    let authUser = authByEmail.get(email) || null;

    try {
      if (!authUser) {
        const created = await req("POST", "/auth/v1/admin/users", {
          body: {
            email,
            password: authPassword.password,
            email_confirm: true,
            user_metadata: {
              idusuario: idusuario.toUpperCase(),
            },
          },
        });
        authUser = created?.user || created || null;
        if (authUser?.email) {
          authByEmail.set(String(authUser.email).toLowerCase(), authUser);
        }
        report.createdAuth += 1;
      } else if (RESET_PASSWORDS) {
        await req("PUT", `/auth/v1/admin/users/${authUser.id}`, {
          body: {
            password: authPassword.password,
            user_metadata: {
              ...(authUser.user_metadata || {}),
              idusuario: idusuario.toUpperCase(),
            },
          },
        });
        report.updatedAuthPassword += 1;
      }

      const authUserId = String(authUser?.id || "").trim();
      if (!authUserId) {
        throw new Error("No se pudo obtener auth user id");
      }

      if (currentAuthUserId === authUserId) {
        report.alreadyLinked += 1;
      } else {
        await req(
          "PATCH",
          `/rest/v1/usuario?codusuario=eq.${codusuario}`,
          {
            schema: APP_SCHEMA,
            write: true,
            body: { auth_user_id: authUserId, correo: email },
          }
        );
        report.linked += 1;
      }

      if (authPassword.temporary) {
        report.tempPasswords.push({
          codusuario,
          idusuario,
          email,
          reason: authPassword.reason,
          suggestedPassword: authPassword.password,
        });
      }
    } catch (error) {
      report.errors.push({
        codusuario,
        idusuario,
        email,
        message: error?.message || String(error),
        details: error?.details || null,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: report.errors.length === 0,
        message:
          report.errors.length === 0
            ? "Sincronizacion completada."
            : "Sincronizacion completada con errores.",
        report,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error?.message || "Error en sincronizacion",
        details: error?.details || null,
      },
      null,
      2
    )
  );
  process.exit(1);
});
