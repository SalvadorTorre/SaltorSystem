import { Injectable } from "@angular/core";
import { ModeloUsuario, ModeloUsuarioData } from ".";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable({
  providedIn: "root"
})
export class ServicioUsuario {
  constructor(private supabase: SupabaseService) {}

  private get client(): any {
    return this.supabase.client as any;
  }

  private get db(): any {
    const client = this.supabase.client;
    if (!client) {
      throw new Error("Supabase no está configurado");
    }
    const anyClient = client as any;
    if (typeof anyClient?.schema === "function") {
      try {
        return anyClient.schema(this.supabase.schema);
      } catch {
        return anyClient;
      }
    }
    return anyClient;
  }

  private normalizarUsuario(row: any): any {
    if (!row) return row;
    return {
      ...row,
      codUsuario: row.codusuario ?? row.codUsuario ?? null,
      idUsuario: row.idusuario ?? row.idUsuario ?? "",
      claveUsuario: row.claveusuario ?? row.claveUsuario ?? "",
      nombreUsuario: row.nombreusuario ?? row.nombreUsuario ?? "",
      metaVenta: row.metaventa ?? row.metaVenta ?? 0,
      claveCorreo: row.clavecorreo ?? row.claveCorreo ?? "",
      idtipoUsuario: row.idtipousuario ?? row.idtipoUsuario ?? null,
      sucursalid: row.sucursalid ?? null,
      cod_empre: row.cod_empre ?? ""
    };
  }

  private mapearPayloadUsuario(input: any): any {
    return {
      idusuario: input?.idUsuario ?? input?.idusuario ?? null,
      claveusuario: input?.claveUsuario ?? input?.claveusuario ?? null,
      nombreusuario: input?.nombreUsuario ?? input?.nombreusuario ?? null,
      nivel: input?.nivel ?? null,
      metaventa: input?.metaVenta ?? input?.metaventa ?? 0,
      correo: input?.correo ?? null,
      clavecorreo: input?.claveCorreo ?? input?.clavecorreo ?? null,
      sucursalid: input?.sucursalid ?? input?.sucursal ?? null,
      idtipousuario: input?.idtipoUsuario ?? input?.idtipousuario ?? null,
      idpermiso: input?.idpermiso ?? null,
      cod_empre: input?.cod_empre ?? null,
      auth_user_id: input?.auth_user_id ?? null
    };
  }

  private sanitizeEmail(email: any): string {
    const raw = String(email ?? '').trim().toLowerCase();
    if (!raw) return '';
    if (!raw.includes('@')) return '';
    return raw;
  }

  private buildAuthEmail(input: any): string {
    const correo = this.sanitizeEmail(input?.correo);
    if (correo) return correo;
    const idUsuario = String(input?.idUsuario ?? input?.idusuario ?? '')
      .trim()
      .toLowerCase();
    if (!idUsuario) return '';
    return `${idUsuario}@saltorsystem.local`;
  }

  private buildAuthPassword(input: any): string {
    const clave = String(input?.claveUsuario ?? input?.claveusuario ?? '').trim();
    const id = String(input?.idUsuario ?? input?.idusuario ?? '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const prefix = id || 'USUARIO';
    const generated = `${prefix}#${clave}#SS`;
    return generated.length >= 8 ? generated : generated.padEnd(8, 'X');
  }

  private normalizeKey(text: any): string {
    return String(text ?? '').trim().toLowerCase();
  }

  private firstRow<T = any>(data: T[] | null | undefined): T | null {
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    return data[0] ?? null;
  }

  private traducirError(error: any, fallback = 'Ocurrió un error al procesar la solicitud'): string {
    const raw = String(
      error?.message ||
      error?.error_description ||
      error?.details ||
      error?.hint ||
      error?.error?.message ||
      ''
    ).trim();
    if (!raw) return fallback;

    const msg = raw.toLowerCase();
    if (msg.includes('password should be at least') || msg.includes('password must be at least')) {
      return 'La clave no cumple los requisitos internos de seguridad.';
    }
    if (msg.includes('email rate limit')) {
      return 'Límite de correos alcanzado en Auth. Intenta de nuevo en unos minutos.';
    }
    if (msg.includes('duplicate key value') || msg.includes('already exists')) {
      if (msg.includes('idusuario') || msg.includes('usuario')) return 'Ese nombre de usuario ya existe.';
      if (msg.includes('claveusuario') || msg.includes('clave')) return 'Esa clave ya existe.';
      if (msg.includes('correo') || msg.includes('email')) return 'Ese correo ya está en uso.';
      return 'Ya existe un registro con esos datos.';
    }
    if (msg.includes('invalid login credentials')) {
      return 'Usuario o clave inválidos.';
    }
    if (msg.includes('invalid api key')) {
      return 'La configuración de Supabase no es válida.';
    }
    if (msg.includes('network') || msg.includes('fetch failed')) {
      return 'No se pudo conectar con Supabase. Verifica la conexión.';
    }
    if (msg.includes('row-level security') || msg.includes('permission denied')) {
      return 'No tienes permisos para realizar esta operación.';
    }
    if (msg.includes('schema') && msg.includes('invalid')) {
      return 'El esquema configurado en Supabase no es válido.';
    }

    return raw;
  }

  private async validarDuplicadosUsuario(input: any): Promise<void> {
    const idUsuario = this.normalizeKey(input?.idUsuario ?? input?.idusuario);
    const clave = String(input?.claveUsuario ?? input?.claveusuario ?? '').trim();
    if (!idUsuario) {
      throw new Error('El usuario es requerido');
    }
    if (!clave) {
      throw new Error('La clave de usuario es requerida');
    }
    if (clave.length !== 4) {
      throw new Error('La clave debe tener exactamente 4 caracteres');
    }

    const { data: byIdRows, error: byIdError } = await this.db
      .from('usuario')
      .select('codusuario,idusuario')
      .ilike('idusuario', idUsuario)
      .limit(1);
    if (byIdError) throw byIdError;
    const byId = this.firstRow(byIdRows);
    if (byId) {
      throw new Error('El código de usuario ya existe');
    }

    const { data: byClaveRows, error: byClaveError } = await this.db
      .from('usuario')
      .select('codusuario')
      .eq('claveusuario', clave)
      .limit(1);
    if (byClaveError) throw byClaveError;
    const byClave = this.firstRow(byClaveRows);
    if (byClave) {
      throw new Error('La clave de usuario ya está en uso');
    }
  }

  private async crearAuthUser(input: any): Promise<{ authUserId: string; authEmail: string }> {
    const client = this.client;
    if (!client?.functions?.invoke) {
      throw new Error('Cliente Supabase Functions no disponible');
    }

    const authEmail = this.buildAuthEmail(input);
    const password = this.buildAuthPassword(input);
    const idUsuario = String(input?.idUsuario ?? input?.idusuario ?? '').trim();
    const nombreUsuario = String(input?.nombreUsuario ?? input?.nombreusuario ?? '').trim();

    if (!authEmail) {
      throw new Error('No se pudo generar un correo para Supabase Auth');
    }
    const { data, error } = await client.functions.invoke(
      'create-confirmed-platform-user',
      {
        body: {
          email: authEmail,
          password,
          idUsuario,
          nombreUsuario,
        },
      }
    );

    if (error) {
      const e: any = error;
      let details =
        e?.context?.statusText || e?.message || 'No se pudo crear el usuario en Supabase Auth';
      const ctx = e?.context;
      if (ctx && typeof ctx?.json === 'function') {
        try {
          const body = await ctx.json();
          const bodyMsg =
            body?.message ||
            body?.details ||
            body?.error?.message ||
            null;
          if (bodyMsg) details = String(bodyMsg);
        } catch {
          // Sin parse de body, usamos details por defecto.
        }
      }
      throw new Error(this.traducirError(details, 'No se pudo crear el usuario en Supabase Auth'));
    }

    if (!data?.ok) {
      throw new Error(
        this.traducirError(
          data?.message || data?.details || 'No se pudo crear el usuario en Supabase Auth',
          'No se pudo crear el usuario en Supabase Auth'
        )
      );
    }

    const authUserId = String(data?.data?.authUserId || '').trim();
    const resolvedEmail = String(data?.data?.authEmail || authEmail).trim();
    if (!authUserId) {
      throw new Error('Supabase Auth no devolvió id de usuario');
    }

    return { authUserId, authEmail: resolvedEmail };
  }

  // Fallback legacy (no recomendado): dispara envío de email y puede topar rate limit.
  private async crearAuthUserLegacySignUp(input: any): Promise<{ authUserId: string; authEmail: string }> {
    const client = this.client;
    if (!client?.auth) {
      throw new Error('Cliente Supabase Auth no disponible');
    }

    const authEmail = this.buildAuthEmail(input);
    const password = this.buildAuthPassword(input);
    const idUsuario = String(input?.idUsuario ?? input?.idusuario ?? '').trim();
    const nombreUsuario = String(input?.nombreUsuario ?? input?.nombreusuario ?? '').trim();

    const { data, error } = await client.auth.signUp({
      email: authEmail,
      password,
      options: {
        emailRedirectTo: undefined,
        data: {
          idusuario: idUsuario,
          nombreusuario: nombreUsuario,
        },
      },
    });

    if (error) {
      throw new Error(this.traducirError(error, 'No se pudo crear el usuario en Supabase Auth'));
    }

    const authUserId = String(data?.user?.id || '').trim();
    if (!authUserId) {
      throw new Error('Supabase Auth no devolvió id de usuario');
    }

    return { authUserId, authEmail };
  }

  buscarTodosUsuario(pageIndex: number, pageSize: number, codigo?: string, descripcion?: string): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;

    return from((async () => {
      let query = this.db
        .from("usuario")
        .select("*")
        .order("codusuario", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (codigo) {
        const cod = Number(codigo);
        if (!Number.isNaN(cod)) {
          query = query.eq("codusuario", cod);
        }
      }

      if (descripcion) {
        const q = `%${descripcion}%`;
        query = query.or(`idusuario.ilike.${q},nombreusuario.ilike.${q}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        data: rows.map((row: any) => this.normalizarUsuario(row))
      }))
    );
  }

  guardarUsuario(usuario: ModeloUsuarioData): Observable<any> {
    return from((async () => {
      try {
        await this.validarDuplicadosUsuario(usuario);
        const { authUserId, authEmail } = await this.crearAuthUser(usuario);

        const payload = this.mapearPayloadUsuario({
          ...usuario,
          auth_user_id: authUserId,
          correo: this.sanitizeEmail((usuario as any)?.correo) || authEmail,
        });
        const { data, error } = await this.db
          .from("usuario")
          .insert(payload)
          .select("*")
          .single();
        if (error) throw error;
        return data;
      } catch (error: any) {
        throw new Error(this.traducirError(error, 'No se pudo crear el usuario'));
      }
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        message: "Usuario creado",
        data: this.normalizarUsuario(row)
      }))
    );
  }

  editarUsuario(codUsuario: number, usuario: ModeloUsuario): Observable<any> {
    return from((async () => {
      const payload = this.mapearPayloadUsuario(usuario);
      const { data: rows, error } = await this.db
        .from("usuario")
        .update(payload)
        .eq("codusuario", codUsuario)
        .select("*")
        .limit(1);
      if (error) throw error;
      return this.firstRow(rows);
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        message: "Usuario actualizado",
        data: row ? this.normalizarUsuario(row) : null
      }))
    );
  }

  eliminarUsuario(codUsuario: number): Observable<any> {
    return from((async () => {
      const { error } = await this.db
        .from("usuario")
        .delete()
        .eq("codusuario", codUsuario);
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({
        status: "success",
        code: 200,
        message: "Usuario eliminado"
      }))
    );
  }

  buscarUsuario(claveUsuario: number): Observable<any> {
    return from((async () => {
      const { data: rows, error } = await this.db
        .from("usuario")
        .select("*")
        .eq("codusuario", claveUsuario)
        .limit(1);
      if (error) throw error;
      return this.firstRow(rows);
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: row ? this.normalizarUsuario(row) : null
      }))
    );
  }

  buscartodoUsuario(claveUsuario: number): Observable<ModeloUsuario> {
    return this.buscarUsuario(claveUsuario) as Observable<ModeloUsuario>;
  }

  buscarUsuarioPorClave(claveUsuario: string): Observable<any> {
    return from((async () => {
      const { data: rows, error } = await this.db
        .from("usuario")
        .select("*")
        .ilike("idusuario", claveUsuario)
        .limit(1);
      if (error) throw error;
      return this.firstRow(rows);
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: row ? this.normalizarUsuario(row) : null
      }))
    );
  }

  buscarUsuarioPorId(idUsuario: string): Observable<any> {
    return this.buscarUsuarioPorClave(idUsuario).pipe(
      map((res: any) => {
        const row = res?.data;
        return {
          ...res,
          data: row ? [row] : []
        };
      })
    );
  }

  buscarUsuarioPorCodigoVendedor(codigo: string): Observable<any> {
    return from((async () => {
      const raw = String(codigo || '').trim();
      if (!raw) return null;

      // 1) Prioridad: claveusuario (código corto del vendedor)
      const { data: byClaveRows, error: errClave } = await this.db
        .from("usuario")
        .select("*")
        .eq("claveusuario", raw)
        .limit(1);
      if (errClave) throw errClave;
      const byClave = this.firstRow(byClaveRows);
      if (byClave) return byClave;

      // 2) Fallback: codusuario numérico
      if (/^\d+$/.test(raw)) {
        const { data: byCodRows, error: errCod } = await this.db
          .from("usuario")
          .select("*")
          .eq("codusuario", Number(raw))
          .limit(1);
        if (errCod) throw errCod;
        const byCod = this.firstRow(byCodRows);
        if (byCod) return byCod;
      }

      // 3) Fallback: idusuario
      const { data: byIdUsuarioRows, error: errIdUsuario } = await this.db
        .from("usuario")
        .select("*")
        .ilike("idusuario", raw)
        .limit(1);
      if (errIdUsuario) throw errIdUsuario;
      const byIdUsuario = this.firstRow(byIdUsuarioRows);
      return byIdUsuario || null;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: row ? this.normalizarUsuario(row) : null
      }))
    );
  }

  buscarUsuariosChoferes(pageIndex: number, pageSize: number, termino?: string): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    const q = String(termino || '').trim();

    return from((async () => {
      let query = this.db
        .from('usuario')
        .select('*', { count: 'exact' })
        .eq('idtipousuario', 8)
        .order('nombreusuario', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (q) {
        query = query.or(
          `nombreusuario.ilike.%${q}%,idusuario.ilike.%${q}%,claveusuario.ilike.%${q}%`
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        rows: (data || []).map((row: any) => this.normalizarUsuario(row)),
        total: Number(count ?? 0),
      };
    })()).pipe(
      map((result: { rows: any[]; total: number }) => ({
        status: 'success',
        code: 200,
        data: result.rows.map((row: any) => this.mapUsuarioChofer(row)),
        pagination: {
          total: result.total,
          page: pageIndex,
          pageSize,
        },
      }))
    );
  }

  buscarUsuarioChoferPorCodigo(codigo: string | number): Observable<any> {
    const raw = String(codigo || '').trim();
    return from((async () => {
      if (!raw) return null;

      let row: any = null;
      if (/^\d+$/.test(raw)) {
        const { data: byCodRows, error: byCodError } = await this.db
          .from('usuario')
          .select('*')
          .eq('idtipousuario', 8)
          .eq('codusuario', Number(raw))
          .limit(1);
        if (byCodError) throw byCodError;
        row = this.firstRow(byCodRows);
      }

      if (!row) {
        const { data: byClaveRows, error: byClaveError } = await this.db
          .from('usuario')
          .select('*')
          .eq('idtipousuario', 8)
          .eq('claveusuario', raw)
          .limit(1);
        if (byClaveError) throw byClaveError;
        row = this.firstRow(byClaveRows);
      }

      if (!row) {
        const { data: byIdRows, error: byIdError } = await this.db
          .from('usuario')
          .select('*')
          .eq('idtipousuario', 8)
          .ilike('idusuario', raw)
          .limit(1);
        if (byIdError) throw byIdError;
        row = this.firstRow(byIdRows);
      }

      return row ? this.normalizarUsuario(row) : null;
    })()).pipe(
      map((row: any) => ({
        status: 'success',
        code: 200,
        data: row ? this.mapUsuarioChofer(row) : null,
      }))
    );
  }

  private mapUsuarioChofer(row: any): any {
    const usuario = this.normalizarUsuario(row);
    return {
      ...usuario,
      codChofer: Number(usuario?.codUsuario || 0),
      nomChofer: String(usuario?.nombreUsuario || usuario?.idUsuario || ''),
      cedChofer: '',
      statusChofer: true,
      claveUsuario: String(usuario?.claveUsuario || ''),
    };
  }

  existeUsuarioPorId(idUsuario: string): Observable<boolean> {
    return from((async () => {
      const id = String(idUsuario || '').trim();
      if (!id) return false;
      const { data: rows, error } = await this.db
        .from('usuario')
        .select('codusuario')
        .ilike('idusuario', id)
        .limit(1);
      if (error) throw error;
      return !!this.firstRow(rows);
    })());
  }

  existeClaveUsuario(claveUsuario: string): Observable<boolean> {
    return from((async () => {
      const clave = String(claveUsuario || '').trim();
      if (!clave) return false;
      const { data: rows, error } = await this.db
        .from('usuario')
        .select('codusuario')
        .eq('claveusuario', clave)
        .limit(1);
      if (error) throw error;
      return !!this.firstRow(rows);
    })());
  }
}
