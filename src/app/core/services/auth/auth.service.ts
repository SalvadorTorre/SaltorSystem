import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { HttpInvokeService } from '../http-invoke.service';
import { SupabaseService } from '../supabase/supabase.service';
import type { SupabaseClient } from '@supabase/supabase-js';

type AppRole = 'root' | 'admin' | 'vendedor';

interface LoginResponseData {
  usuario: any;
  token: string;
  sucursal: any;
  empresa: any;
  role?: AppRole;
  source?: 'backend' | 'supabase' | 'supabase-table';
}

interface LoginResponse {
  status: string;
  code: number;
  message: string;
  data: LoginResponseData;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private loggedIn!: boolean;

  constructor(
    private http: HttpInvokeService,
    private supabaseService: SupabaseService,
  ) {}

  isLoggedIn(): boolean {
    return !!localStorage.getItem('authToken');
  }

  login(loginData: any): Observable<LoginResponse> {
    return this.http
      .PostRequest<LoginResponse, any>('/usuario-login', loginData)
      .pipe(
        tap((response: any) => {
          console.log(response.data);
          if (response.status === 'success' && response.data) {
            const userData = response;
            console.log(userData.data.sucursal);
            localStorage.setItem('authToken', userData.data.token);
            localStorage.setItem(
              'username',
              userData.data.usuario.nombreUsuario,
            );

            // --- GUARDADO DE DATOS DE EMPRESA Y SUCURSAL ---
            // Guardamos los objetos completos para uso general
            localStorage.setItem(
              'sucursal',
              JSON.stringify(userData.data.sucursal),
            );
            localStorage.setItem(
              'empresa',
              JSON.stringify(userData.data.empresa),
            );

            // Guardamos datos específicos de la empresa para fácil acceso (impresión, headers, etc.)
            const emp = userData.data.empresa;
            if (emp && typeof emp === 'object') {
              localStorage.setItem('nombre_empresa', emp.nom_empre || '');
              localStorage.setItem('direccion_empresa', emp.dir_empre || '');
              localStorage.setItem('telefono_empresa', emp.tel_empre || '');
              localStorage.setItem('rnc_empresa', emp.rnc_empre || '');
              localStorage.setItem('cod_empre', emp.cod_empre || '');
              localStorage.setItem('letra_empre', emp.letra_empre || '');
              // Guardar logo u otros datos si vienen
              if (emp.logo) localStorage.setItem('logo_empresa', emp.logo);
            } else if (typeof emp === 'string') {
              // Fallback si el backend envía solo el nombre
              localStorage.setItem('nombre_empresa', emp);
            }

            localStorage.setItem(
              'codigousuario',
              userData.data.usuario.codUsuario,
            );
            localStorage.setItem(
              'idSucursal',
              userData.data.usuario.sucursalid,
            );
            localStorage.setItem(
              'codigoempresa',
              userData.data.usuario.cod_empre,
            );

            this.loggedIn = true;
          }
        }),
        catchError((error) => {
          this.loggedIn = false;
          return of(error);
        }),
      );
  }

  private async loginWithSupabase(loginData: any): Promise<LoginResponse> {
    try {
      const client = this.supabaseService.client;
      if (!client) {
        throw new Error('Supabase no está configurado');
      }

      const identifier = String(loginData?.username || '')
        .trim()
        .toLowerCase();
      const password = String(loginData?.userpassword || '');
      if (!identifier || !password) {
        throw new Error('Credenciales incompletas');
      }

      const email = await this.resolveEmailForSupabase(client, identifier);
      const { data: authData, error: authError } =
        await client.auth.signInWithPassword({
          email,
          password,
        });

      let usuarioRaw: any | null = null;
      let token = '';
      let source: 'supabase' | 'supabase-table' = 'supabase';

      if (!authError && authData?.session?.access_token) {
        token = authData.session.access_token;
        usuarioRaw = await this.fetchSupabaseUsuario(client, email, identifier);
        source = 'supabase';
      } else {
        // Fallback temporal: permite iniciar con usuarios creados desde mantenimiento
        // que aún no existen en auth.users.
        usuarioRaw = await this.validateUsuarioCredentials(
          client,
          identifier,
          password,
        );
        if (!usuarioRaw) {
          throw authError || new Error('No fue posible iniciar sesión');
        }
        token = `local-${Date.now()}-${usuarioRaw?.codusuario ?? usuarioRaw?.codUsuario ?? 'user'}`;
        source = 'supabase-table';
      }

      if (!usuarioRaw) {
        throw new Error('No se encontró el usuario en myappdb.usuario');
      }

      const usuario = this.normalizeUsuarioPayload(usuarioRaw);
      const [sucursal, empresa, roleDesc] = await Promise.all([
        this.fetchSupabaseSucursal(client, usuario.sucursalid),
        this.fetchSupabaseEmpresa(client, usuario.cod_empre),
        this.fetchRoleDescription(client, usuario.idtipoUsuario),
      ]);

      const role = this.resolveRoleFromUsuario(usuario, roleDesc);
      const payload: LoginResponseData = {
        usuario,
        token,
        sucursal: sucursal || null,
        empresa: empresa || null,
        role,
        source,
      };

      this.persistSession(payload);

      return {
        status: 'success',
        code: 200,
        message: 'Inicio de sesión correcto',
        data: payload,
      };
    } catch (error: any) {
      throw new Error(this.translateAuthError(error));
    }
  }

  private async validateUsuarioCredentials(
    client: SupabaseClient,
    identifier: string,
    password: string,
  ): Promise<any | null> {
    const id = String(identifier || '').trim();
    const pass = String(password || '');
    if (!id || !pass) return null;

    const table = this.table(client, 'usuario');

    const { data: byUser, error: byUserError } = await table
      .select('*')
      .ilike('idusuario', id)
      .limit(5);
    if (byUserError) throw byUserError;

    const { data: byMail, error: byMailError } = await this.table(
      client,
      'usuario',
    )
      .select('*')
      .ilike('correo', id)
      .limit(5);
    if (byMailError) throw byMailError;

    const candidates = [...(byUser || []), ...(byMail || [])];
    if (!candidates.length) return null;

    const match = candidates.find((u: any) => {
      const stored = String(u?.claveusuario ?? u?.claveUsuario ?? '');
      return stored === pass;
    });

    return match || null;
  }

  private async resolveEmailForSupabase(
    client: SupabaseClient,
    identifier: string,
  ): Promise<string> {
    if (identifier.includes('@')) {
      return identifier;
    }

    const data = await this.firstRow(
      this.table(client, 'usuario')
        .select('correo,idusuario')
        .ilike('idusuario', identifier),
    );

    const correo = String(data?.correo || '')
      .trim()
      .toLowerCase();
    if (correo) {
      return correo;
    }

    const normalizedId = String(data?.idusuario || identifier || '')
      .trim()
      .toLowerCase();
    if (!normalizedId) {
      throw new Error('No se encontró usuario para Supabase Auth');
    }
    // Fallback para cuentas creadas con username sin correo visible en tabla usuario.
    return `${normalizedId}@saltorsystem.local`;
  }

  private async fetchSupabaseUsuario(
    client: SupabaseClient,
    email: string,
    identifier: string,
  ): Promise<any | null> {
    const byEmail = await this.firstRow(
      this.table(client, 'usuario').select('*').eq('correo', email),
    );
    if (byEmail) return byEmail;

    const byId = await this.firstRow(
      this.table(client, 'usuario').select('*').ilike('idusuario', identifier),
    );
    return byId || null;
  }

  private async fetchSupabaseEmpresa(
    client: SupabaseClient,
    codEmpre: string,
  ): Promise<any | null> {
    const code = String(codEmpre || '').trim();
    if (!code) return null;
    return await this.firstRow(
      this.table(client, 'empresas').select('*').eq('cod_empre', code),
    );
  }

  private async fetchSupabaseSucursal(
    client: SupabaseClient,
    sucursalId: number | null,
  ): Promise<any | null> {
    const id = Number(sucursalId);
    if (!id) return null;
    return await this.firstRow(
      this.table(client, 'sucursales').select('*').eq('cod_sucursal', id),
    );
  }

  private async fetchRoleDescription(
    client: SupabaseClient,
    idTipoUsuario: number | null,
  ): Promise<string> {
    const id = Number(idTipoUsuario);
    if (!id) return '';
    const data = await this.firstRow(
      this.table(client, 'tipousuario').select('descripcion').eq('id', id),
    );

    return String(data?.descripcion || '').trim();
  }

  private normalizeUsuarioPayload(usuario: any): any {
    const source = usuario || {};
    return {
      ...source,
      codUsuario: source.codUsuario ?? source.codusuario ?? '',
      idUsuario: source.idUsuario ?? source.idusuario ?? '',
      nombreUsuario: source.nombreUsuario ?? source.nombreusuario ?? '',
      claveUsuario: source.claveUsuario ?? source.claveusuario ?? '',
      metaVenta: source.metaVenta ?? source.metaventa ?? '',
      claveCorreo: source.claveCorreo ?? source.clavecorreo ?? '',
      idtipoUsuario:
        source.idtipoUsuario ??
        source.idtipousuario ??
        source.idTipoUsuario ??
        null,
      sucursalid: source.sucursalid ?? source.sucursalId ?? null,
      cod_empre: source.cod_empre ?? source.codEmpre ?? '',
    };
  }

  private table(client: SupabaseClient, name: string): any {
    const anyClient = client as any;
    if (typeof anyClient?.schema === 'function') {
      try {
        return anyClient.schema(this.supabaseService.schema).from(name);
      } catch {
        return anyClient.from(name);
      }
    }
    return anyClient.from(name);
  }

  private async firstRow(query: any): Promise<any | null> {
    const { data, error } = await query.limit(1);
    if (error) throw error;
    if (Array.isArray(data) && data.length) return data[0];
    return null;
  }

  private persistSession(payload: LoginResponseData): void {
    const usuario = this.normalizeUsuarioPayload(payload.usuario);
    const empresa = payload.empresa;
    const sucursal = payload.sucursal;

    localStorage.setItem('authToken', String(payload.token || ''));
    localStorage.setItem(
      'username',
      String(usuario.nombreUsuario || usuario.idUsuario || 'Usuario'),
    );

    localStorage.setItem('sucursal', JSON.stringify(sucursal || {}));
    localStorage.setItem('empresa', JSON.stringify(empresa || {}));

    if (empresa && typeof empresa === 'object') {
      localStorage.setItem('nombre_empresa', String(empresa.nom_empre || ''));
      localStorage.setItem(
        'direccion_empresa',
        String(empresa.dir_empre || ''),
      );
      localStorage.setItem('telefono_empresa', String(empresa.tel_empre || ''));
      localStorage.setItem('rnc_empresa', String(empresa.rnc_empre || ''));
      localStorage.setItem('cod_empre', String(empresa.cod_empre || ''));
      localStorage.setItem('letra_empre', String(empresa.letra_empre || ''));
      if (empresa.logo)
        localStorage.setItem('logo_empresa', String(empresa.logo));
    } else if (typeof empresa === 'string') {
      localStorage.setItem('nombre_empresa', empresa);
    }

    localStorage.setItem('codigousuario', String(usuario.codUsuario || ''));
    localStorage.setItem('idSucursal', String(usuario.sucursalid || ''));
    localStorage.setItem('codigoempresa', String(usuario.cod_empre || ''));

    const appRole = this.resolveRoleFromUsuario(usuario, payload.role);
    localStorage.setItem('role', appRole);
    localStorage.setItem('dashboardRole', appRole);

    this.loggedIn = true;
  }

  private resolveRoleFromUsuario(usuario: any, roleHint = ''): AppRole {
    const candidates = [
      roleHint,
      usuario?.role,
      usuario?.rol,
      usuario?.tipoUsuario,
      usuario?.tipousuario,
      usuario?.descripcionRol,
    ]
      .map((x) => this.normalizeRoleLabel(String(x || '')))
      .filter((x) => !!x) as AppRole[];

    if (candidates.length) return candidates[0];

    const idTipo = Number(
      usuario?.idtipoUsuario ?? usuario?.idtipousuario ?? 0,
    );
    if (idTipo === 1) return 'root';
    if (idTipo === 2) return 'admin';

    return 'vendedor';
  }

  private normalizeRoleLabel(raw: string): AppRole | null {
    const value = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

    if (!value) return null;
    if (
      value.includes('root') ||
      value.includes('super') ||
      value.includes('computo') ||
      value.includes('gerente')
    ) {
      return 'root';
    }
    if (value.includes('admin')) return 'admin';
    if (value.includes('vendedor') || value.includes('venta'))
      return 'vendedor';
    return null;
  }

  private translateAuthError(error: any): string {
    const raw = String(
      error?.message ||
        error?.error_description ||
        error?.details ||
        error?.hint ||
        error?.error?.message ||
        '',
    ).trim();
    if (!raw)
      return 'No fue posible iniciar sesión. Verifica usuario y contraseña.';

    const msg = raw.toLowerCase();
    if (msg.includes('invalid login credentials')) {
      return 'Usuario o clave inválidos.';
    }
    if (msg.includes('email not confirmed')) {
      return 'La cuenta no está confirmada.';
    }
    if (msg.includes('invalid api key')) {
      return 'Configuración inválida de Supabase.';
    }
    if (msg.includes('fetch failed') || msg.includes('network')) {
      return 'No se pudo conectar con el servidor.';
    }
    if (msg.includes('credentials') && msg.includes('incomplete')) {
      return 'Debes completar usuario y clave.';
    }
    return raw;
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('sucursal');
    localStorage.removeItem('empresa');
    this.loggedIn = false;
    console.log(this.isLoggedIn());
  }

  getUsername(): string | null {
    return localStorage.getItem('username');
  }

  getName(): string | null {
    return localStorage.getItem('name');
  }

  getUserId(): string | null {
    return localStorage.getItem('userId');
  }
}
