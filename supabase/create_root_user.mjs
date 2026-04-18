/**
 * Crea/actualiza un usuario ROOT en Supabase Auth y en myappdb.usuario.
 *
 * Uso:
 * SUPABASE_URL="https://<project-ref>.supabase.co" \
 * SUPABASE_SERVICE_KEY="<service-role-key>" \
 * APP_SCHEMA="myappdb" \
 * ROOT_USERNAME="eliuortega" \
 * ROOT_PASSWORD="1807" \
 * ROOT_EMAIL="eliuortega@saltorsystem.local" \
 * ROOT_NAME="eliuortega" \
 * node supabase/create_root_user.mjs
 */

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const APP_SCHEMA = process.env.APP_SCHEMA || 'myappdb';

const ROOT_USERNAME = (process.env.ROOT_USERNAME || 'eliuortega').trim();
const ROOT_PASSWORD = String(process.env.ROOT_PASSWORD || '1807');
const ROOT_EMAIL = (
  process.env.ROOT_EMAIL || `${ROOT_USERNAME}@saltorsystem.local`
)
  .trim()
  .toLowerCase();
const ROOT_NAME = (process.env.ROOT_NAME || ROOT_USERNAME).trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    'Faltan variables: SUPABASE_URL y SUPABASE_SERVICE_KEY son obligatorias.'
  );
  process.exit(1);
}

if (SUPABASE_SERVICE_KEY === '<TU_SERVICE_ROLE_KEY>') {
  console.error(
    'SUPABASE_SERVICE_KEY tiene un placeholder. Debes reemplazarlo por la clave real.'
  );
  process.exit(1);
}

function mkHeaders({ schema, write = false, auth = true } = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    headers.apikey = SUPABASE_SERVICE_KEY;
    headers.Authorization = `Bearer ${SUPABASE_SERVICE_KEY}`;
  }

  if (schema) {
    headers['Accept-Profile'] = schema;
    if (write) headers['Content-Profile'] = schema;
  }

  return headers;
}

async function req(method, path, { body, schema, write = false, auth = true } = {}) {
  let response;
  try {
    response = await fetch(`${SUPABASE_URL}${path}`, {
      method,
      headers: mkHeaders({ schema, write, auth }),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    const reason = error?.cause || error;
    const extra = [
      reason?.code ? `code=${reason.code}` : '',
      reason?.syscall ? `syscall=${reason.syscall}` : '',
      reason?.hostname ? `hostname=${reason.hostname}` : '',
      reason?.message ? `detail=${reason.message}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const netError = new Error(
      `Network/Fetch error en ${method} ${path}${extra ? ` (${extra})` : ''}`
    );
    netError.details = {
      type: 'network_error',
      method,
      path,
      reason: reason?.message || String(reason || ''),
      code: reason?.code || null,
      syscall: reason?.syscall || null,
      hostname: reason?.hostname || null,
    };
    throw netError;
  }

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

async function ensureRootRole() {
  const found = await req(
    'GET',
    `/rest/v1/tipousuario?select=id,descripcion&id=eq.1&limit=1`,
    { schema: APP_SCHEMA }
  );

  if (!Array.isArray(found) || found.length === 0) {
    await req('POST', '/rest/v1/tipousuario', {
      schema: APP_SCHEMA,
      write: true,
      body: [{ id: 1, descripcion: 'ROOT' }],
    });
    return { id: 1, descripcion: 'ROOT' };
  }

  const role = found[0];
  if (String(role.descripcion || '').toUpperCase() !== 'ROOT') {
    await req('PATCH', '/rest/v1/tipousuario?id=eq.1', {
      schema: APP_SCHEMA,
      write: true,
      body: { descripcion: 'ROOT' },
    });
    role.descripcion = 'ROOT';
  }

  return role;
}

async function ensureEmpresaSucursal() {
  let empresas = await req(
    'GET',
    '/rest/v1/empresas?select=cod_empre,nom_empre&limit=1',
    { schema: APP_SCHEMA }
  );

  if (!Array.isArray(empresas) || empresas.length === 0) {
    await req('POST', '/rest/v1/empresas', {
      schema: APP_SCHEMA,
      write: true,
      body: [
        {
          cod_empre: 'EMP001',
          nom_empre: 'Empresa Principal',
          dir_empre: 'N/A',
          tel_empre: '000-000-0000',
          rnc_empre: '00000000000',
          letra_empre: 'A',
        },
      ],
    });

    empresas = await req(
      'GET',
      '/rest/v1/empresas?select=cod_empre,nom_empre&cod_empre=eq.EMP001&limit=1',
      { schema: APP_SCHEMA }
    );
  }

  const empresa = empresas[0];

  let sucursales = await req(
    'GET',
    `/rest/v1/sucursales?select=cod_sucursal,nom_sucursal,cod_empre&cod_empre=eq.${encodeURIComponent(
      empresa.cod_empre
    )}&limit=1`,
    { schema: APP_SCHEMA }
  );

  if (!Array.isArray(sucursales) || sucursales.length === 0) {
    await req('POST', '/rest/v1/sucursales', {
      schema: APP_SCHEMA,
      write: true,
      body: [
        {
          nom_sucursal: 'Principal',
          zona: 'N/A',
          cod_empre: empresa.cod_empre,
          dir_sucursal: 'N/A',
          tel_sucursal: '000-000-0000',
        },
      ],
    });

    sucursales = await req(
      'GET',
      `/rest/v1/sucursales?select=cod_sucursal,nom_sucursal,cod_empre&cod_empre=eq.${encodeURIComponent(
        empresa.cod_empre
      )}&limit=1`,
      { schema: APP_SCHEMA }
    );
  }

  return { empresa, sucursal: sucursales[0] };
}

async function ensureAuthUser() {
  try {
    const created = await req('POST', '/auth/v1/admin/users', {
      body: {
        email: ROOT_EMAIL,
        password: ROOT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          username: ROOT_USERNAME,
          idusuario: ROOT_USERNAME,
          app_role: 'root',
        },
      },
      auth: true,
    });
    return created.user || created;
  } catch (error) {
    const details = JSON.stringify(error.details || '').toLowerCase();
    if (!details.includes('already') && !details.includes('registered')) {
      throw error;
    }

    const list = await req('GET', '/auth/v1/admin/users?page=1&per_page=1000', {
      auth: true,
    });
    const existing = (list?.users || []).find(
      (u) => String(u.email || '').toLowerCase() === ROOT_EMAIL
    );
    if (!existing) throw error;

    await req('PUT', `/auth/v1/admin/users/${existing.id}`, {
      body: {
        password: ROOT_PASSWORD,
        user_metadata: {
          ...(existing.user_metadata || {}),
          username: ROOT_USERNAME,
          idusuario: ROOT_USERNAME,
          app_role: 'root',
        },
      },
      auth: true,
    });

    return existing;
  }
}

function rootPayload({ empresa, sucursal, authUserId, includeAuthUserId }) {
  const payload = {
    idusuario: ROOT_USERNAME,
    claveusuario: ROOT_PASSWORD,
    nombreusuario: ROOT_NAME,
    nivel: 99,
    metaventa: 0,
    correo: ROOT_EMAIL,
    clavecorreo: '',
    sucursalid: Number(sucursal.cod_sucursal),
    idtipousuario: 1,
    idpermiso: null,
    cod_empre: String(empresa.cod_empre),
  };
  if (includeAuthUserId) {
    payload.auth_user_id = authUserId || null;
  }
  return payload;
}

async function upsertAppUser({ empresa, sucursal, authUserId }) {
  const found = await req(
    'GET',
    `/rest/v1/usuario?select=codusuario,idusuario&idusuario=eq.${encodeURIComponent(
      ROOT_USERNAME
    )}&limit=1`,
    { schema: APP_SCHEMA }
  );

  const exists = Array.isArray(found) && found.length > 0;

  const persist = async (includeAuthUserId) => {
    const payload = rootPayload({
      empresa,
      sucursal,
      authUserId,
      includeAuthUserId,
    });

    if (exists) {
      await req(
        'PATCH',
        `/rest/v1/usuario?idusuario=eq.${encodeURIComponent(ROOT_USERNAME)}`,
        {
          schema: APP_SCHEMA,
          write: true,
          body: payload,
        }
      );
      return { action: 'updated', codusuario: found[0].codusuario };
    }

    const created = await req('POST', '/rest/v1/usuario', {
      schema: APP_SCHEMA,
      write: true,
      body: [payload],
    });
    return {
      action: 'created',
      codusuario: created?.[0]?.codusuario || null,
    };
  };

  try {
    return await persist(true);
  } catch (error) {
    const details = JSON.stringify(error.details || '').toLowerCase();
    if (!details.includes('auth_user_id')) throw error;
    return persist(false);
  }
}

async function main() {
  const role = await ensureRootRole();
  const { empresa, sucursal } = await ensureEmpresaSucursal();
  const authUser = await ensureAuthUser();
  const appUser = await upsertAppUser({
    empresa,
    sucursal,
    authUserId: authUser?.id || null,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        role,
        authUserId: authUser?.id || null,
        username: ROOT_USERNAME,
        email: ROOT_EMAIL,
        empresa,
        sucursal,
        appUser,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  const details = error?.details || null;
  const isInvalidSchema =
    details?.code === 'PGRST106' &&
    String(details?.message || '').toLowerCase().includes('invalid schema');

  const nextSteps = isInvalidSchema
    ? [
        `Expose el schema "${APP_SCHEMA}" en Supabase Dashboard -> API Settings -> Exposed schemas.`,
        'Incluye además permisos de schema/tablas para service_role (ver supabase/grant_myappdb_access.sql).',
        'Vuelve a ejecutar: ./supabase/create_root_user.sh',
      ]
    : undefined;

  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error?.message || 'Error',
        details,
        nextSteps,
      },
      null,
      2
    )
  );
  process.exit(1);
});
