import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { SupabaseClient } from '@supabase/supabase-js';
import { HttpInvokeService } from '../http-invoke.service';
import { SupabaseService } from '../supabase/supabase.service';

interface LoginResponseData {
  usuario: any;
  token: string;
  sucursal: any;
  empresa: any;
  role?: string;
  source?: 'legacy' | 'supabase';
}

interface LoginResponse {
  status: string;
  code: number;
  message: string;
  data: LoginResponseData | null;
}

type AppRole = 'root' | 'admin' | 'vendedor';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private loggedIn = false;

  constructor(
    private http: HttpInvokeService,
    private supabaseService: SupabaseService
  ) {}

  isLoggedIn(): boolean {
    return !!localStorage.getItem('authToken');
  }

  login(loginData: any): Observable<LoginResponse> {
    if (this.supabaseService.enabled) {
      return from(this.loginWithSupabase(loginData)).pipe(
        catchError((error) => throwError(() => error))
      );
    }
    return this.loginLegacy(loginData);
  }

  private loginLegacy(loginData: any): Observable<LoginResponse> {
    return this.http
      .PostRequest<LoginResponse, any>('/usuario-login', loginData)
      .pipe(
        tap((response: any) => {
          if (response?.status === 'success' && response?.data) {
            const payload: LoginResponseData = {
              usuario: this.normalizeUsuarioPayload(response.data.usuario),
              token: String(response.data.token || ''),
              sucursal: response.data.sucursal || null,
              empresa: response.data.empresa || null,
              role: this.resolveRoleFromUsuario(response.data.usuario),
              source: 'legacy',
            };
            this.persistSession(payload);
          }
        }),
        catchError((error) => {
          this.loggedIn = false;
          return of(error);
        })
      );
  }

  private async loginWithSupabase(loginData: any): Promise<LoginResponse> {
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

    if (authError || !authData?.session) {
      throw authError || new Error('No fue posible iniciar sesión');
    }

    const usuarioRaw = await this.fetchSupabaseUsuario(client, email, identifier);
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
      token: authData.session.access_token,
      sucursal: sucursal || null,
      empresa: empresa || null,
      role,
      source: 'supabase',
    };

    this.persistSession(payload);

    return {
      status: 'success',
      code: 200,
      message: 'Inicio de sesión correcto',
      data: payload,
    };
  }

  private async resolveEmailForSupabase(
    client: SupabaseClient,
    identifier: string
  ): Promise<string> {
    if (identifier.includes('@')) {
      return identifier;
    }

    const { data } = await this.table(client, 'usuario')
      .select('correo,idusuario')
      .ilike('idusuario', identifier)
      .limit(1)
      .maybeSingle();

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
    identifier: string
  ): Promise<any | null> {
    const byEmail = await this.table(client, 'usuario')
      .select('*')
      .eq('correo', email)
      .limit(1)
      .maybeSingle();
    if (byEmail?.data) return byEmail.data;

    const byId = await this.table(client, 'usuario')
      .select('*')
      .ilike('idusuario', identifier)
      .limit(1)
      .maybeSingle();
    return byId?.data || null;
  }

  private async fetchSupabaseEmpresa(
    client: SupabaseClient,
    codEmpre: string
  ): Promise<any | null> {
    const code = String(codEmpre || '').trim();
    if (!code) return null;
    const { data } = await this.table(client, 'empresas')
      .select('*')
      .eq('cod_empre', code)
      .limit(1)
      .maybeSingle();
    return data || null;
  }

  private async fetchSupabaseSucursal(
    client: SupabaseClient,
    sucursalId: number | null
  ): Promise<any | null> {
    const id = Number(sucursalId);
    if (!id) return null;
    const { data } = await this.table(client, 'sucursales')
      .select('*')
      .eq('cod_sucursal', id)
      .limit(1)
      .maybeSingle();
    return data || null;
  }

  private async fetchRoleDescription(
    client: SupabaseClient,
    idTipoUsuario: number | null
  ): Promise<string> {
    const id = Number(idTipoUsuario);
    if (!id) return '';
    const { data } = await this.table(client, 'tipousuario')
      .select('descripcion')
      .eq('id', id)
      .limit(1)
      .maybeSingle();

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

  private persistSession(payload: LoginResponseData): void {
    const usuario = this.normalizeUsuarioPayload(payload.usuario);
    const empresa = payload.empresa;
    const sucursal = payload.sucursal;

    localStorage.setItem('authToken', String(payload.token || ''));
    localStorage.setItem(
      'username',
      String(usuario.nombreUsuario || usuario.idUsuario || 'Usuario')
    );

    localStorage.setItem('sucursal', JSON.stringify(sucursal || {}));
    localStorage.setItem('empresa', JSON.stringify(empresa || {}));

    if (empresa && typeof empresa === 'object') {
      localStorage.setItem('nombre_empresa', String(empresa.nom_empre || ''));
      localStorage.setItem('direccion_empresa', String(empresa.dir_empre || ''));
      localStorage.setItem('telefono_empresa', String(empresa.tel_empre || ''));
      localStorage.setItem('rnc_empresa', String(empresa.rnc_empre || ''));
      localStorage.setItem('cod_empre', String(empresa.cod_empre || ''));
      localStorage.setItem('letra_empre', String(empresa.letra_empre || ''));
      if (empresa.logo) localStorage.setItem('logo_empresa', String(empresa.logo));
    } else if (typeof empresa === 'string') {
      localStorage.setItem('nombre_empresa', empresa);
    }

    localStorage.setItem('codigousuario', String(usuario.codUsuario || ''));
    localStorage.setItem('idSucursal', String(usuario.sucursalid || ''));
    localStorage.setItem('codigoempresa', String(usuario.cod_empre || ''));

    const appRole = this.resolveRoleFromUsuario(usuario, payload.role);
    localStorage.setItem('role', appRole);
    localStorage.setItem('dashboardRole', appRole === 'vendedor' ? 'vendedor' : 'admin');

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

    const idTipo = Number(usuario?.idtipoUsuario ?? usuario?.idtipousuario ?? 0);
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
    if (value.includes('vendedor') || value.includes('venta')) return 'vendedor';
    return null;
  }

  logout(): void {
    const client = this.supabaseService.client;
    if (client) {
      client.auth.signOut().catch(() => undefined);
    }

    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('sucursal');
    localStorage.removeItem('empresa');
    localStorage.removeItem('codigousuario');
    localStorage.removeItem('idSucursal');
    localStorage.removeItem('codigoempresa');
    localStorage.removeItem('nombre_empresa');
    localStorage.removeItem('direccion_empresa');
    localStorage.removeItem('telefono_empresa');
    localStorage.removeItem('rnc_empresa');
    localStorage.removeItem('cod_empre');
    localStorage.removeItem('letra_empre');
    localStorage.removeItem('logo_empresa');
    localStorage.removeItem('role');
    localStorage.removeItem('dashboardRole');
    this.loggedIn = false;
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
