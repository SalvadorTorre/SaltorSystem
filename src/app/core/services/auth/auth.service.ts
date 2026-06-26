import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SupabaseService } from '../supabase/supabase.service';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AccessControlService } from '../access/access-control.service';

type AppRole = 'root' | 'admin' | 'vendedor';

interface LoginResponseData {
  usuario: any;
  token: string;
  sucursal: any;
  empresa: any;
  role?: AppRole;
  roleDescription?: string;
  source?: 'supabase';
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
  private readonly supabaseStorageKey = 'saltorsystem-auth-token';

  constructor(
    private supabaseService: SupabaseService,
    private accessControl: AccessControlService,
  ) {}

  isLoggedIn(): boolean {
    const token = String(localStorage.getItem('authToken') || '').trim();
    if (!token) {
      if (this.hasRecoverableSupabaseSession()) {
        void this.supabaseService.recoverSession();
        return true;
      }
      return false;
    }
    if (!this.isActiveJwt(token)) {
      if (this.hasRecoverableSupabaseSession()) {
        void this.supabaseService.recoverSession();
        return true;
      }
      this.clearSessionStorage();
      return false;
    }
    return true;
  }

  login(loginData: any): Observable<LoginResponse> {
    return from(this.loginWithSupabase(loginData)).pipe(
      catchError((error) => throwError(() => error)),
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
      const password = String(loginData?.userpassword || '').trim();
      if (!identifier || !password) {
        throw new Error('Credenciales incompletas');
      }

      const emails = await this.resolveEmailsForSupabase(client, identifier);
      const authData = await this.signInWithCandidates(
        client,
        emails,
        identifier,
        password,
      );

      if (!authData?.session?.access_token) {
        throw new Error('No fue posible iniciar sesión');
      }

      const token = authData.session.access_token;
      const usuarioRaw = await this.fetchSupabaseUsuario(client, authData.email, identifier);
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
        roleDescription: roleDesc || '',
        source: 'supabase',
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

  private buildInternalPassword(identifier: string, plainPassword: string): string {
    const id = String(identifier || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const prefix = id || 'USUARIO';
    const generated = `${prefix}#${plainPassword}#SS`;
    return generated.length >= 8 ? generated : generated.padEnd(8, 'X');
  }

  private async signInWithCandidates(
    client: SupabaseClient,
    emails: string[],
    identifier: string,
    plainPassword: string,
  ): Promise<any> {
    const internalPassword = this.buildInternalPassword(identifier, plainPassword);
    const candidates = Array.from(
      new Set([plainPassword, internalPassword].filter((x) => !!x)),
    );

    let lastError: any = null;
    for (const email of emails) {
      for (const candidate of candidates) {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password: candidate,
        });
        if (!error && data?.session) {
          return { ...data, email };
        }
        lastError = error || lastError;
      }
    }

    throw lastError || new Error('No fue posible iniciar sesión');
  }

  private async resolveEmailsForSupabase(
    client: SupabaseClient,
    identifier: string,
  ): Promise<string[]> {
    if (identifier.includes('@')) {
      return [identifier];
    }
    const normalizedId = String(identifier || '')
      .trim()
      .toLowerCase();
    if (!normalizedId) {
      throw new Error('No se encontró usuario para Supabase Auth');
    }

    const candidates: string[] = [];

    // Primero intenta el correo real guardado en usuario.
    try {
      const row = await this.firstRow(
        this.table(client, 'usuario')
          .select('correo,idusuario')
          .ilike('idusuario', normalizedId),
      );
      const correo = String(row?.correo || '')
        .trim()
        .toLowerCase();
      if (correo.includes('@')) {
        candidates.push(correo);
      }
    } catch {
      // Si falla consulta (schema cache/RLS), cae al alias interno.
    }

    // Alias actual y alias legado para usuarios creados antes de la migracion.
    candidates.push(
      `${normalizedId}@saltorsystem.local`,
      `${normalizedId}@usuario.saltorsystem.local`,
      `${normalizedId}@usuarios.saltorsystem.com`,
    );
    return Array.from(new Set(candidates));
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

    this.accessControl.reset();

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
    localStorage.setItem('claveusuario', String(usuario.claveUsuario || ''));
    localStorage.setItem('idusuario', String(usuario.idUsuario || ''));
    localStorage.setItem('idSucursal', String(usuario.sucursalid || ''));
    localStorage.setItem('codigoempresa', String(usuario.cod_empre || ''));
    localStorage.setItem('idtipousuario', String(usuario.idtipoUsuario || ''));

    const appRole = this.resolveRoleFromUsuario(usuario, payload.role);
    localStorage.setItem('role', appRole);
    localStorage.setItem('dashboardRole', appRole);
    localStorage.setItem(
      'roleDescription',
      String(payload.roleDescription || '').trim(),
    );

    this.loggedIn = true;
    void this.supabaseService.recoverSession();
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
    if (idTipo === 9) return 'admin';

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
    if (
      value.includes('admin') ||
      value.includes('cajero') ||
      value.includes('cajera') ||
      value.includes('caja') ||
      value.includes('cobro')
    ) {
      return 'admin';
    }
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
    if (
      msg.includes('fetch failed') ||
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('aborterror') ||
      msg.includes('timeout') ||
      msg.includes('timed out')
    ) {
      return 'No hay conexión con el servidor local. Verifique que Tailscale esté conectado.';
    }
    if (msg.includes('credentials') && msg.includes('incomplete')) {
      return 'Debes completar usuario y clave.';
    }
    return raw;
  }

  logout(): void {
    this.clearSessionStorage();
    this.accessControl.reset();
    this.loggedIn = false;
    console.log(this.isLoggedIn());
  }

  private clearSessionStorage(): void {
    const keys = [
      'authToken',
      'username',
      'sucursal',
      'empresa',
      'nombre_empresa',
      'direccion_empresa',
      'telefono_empresa',
      'rnc_empresa',
      'cod_empre',
      'letra_empre',
      'logo_empresa',
      'codigousuario',
      'idSucursal',
      'codigoempresa',
      'idtipousuario',
      'role',
      'dashboardRole',
      'roleDescription',
    ];
    keys.forEach((k) => localStorage.removeItem(k));
    this.supabaseService.clearAuthSession();
  }

  private isActiveJwt(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const payload = JSON.parse(atob(parts[1]));
      const exp = Number(payload?.exp || 0);
      if (!exp) return false;
      const now = Math.floor(Date.now() / 1000);
      return exp > now;
    } catch {
      return false;
    }
  }

  private hasRecoverableSupabaseSession(): boolean {
    try {
      const raw = localStorage.getItem(this.supabaseStorageKey);
      if (!raw) return false;

      const session = JSON.parse(raw);
      const refreshToken = String(
        session?.refresh_token ||
          session?.currentSession?.refresh_token ||
          session?.session?.refresh_token ||
          ''
      ).trim();

      return !!refreshToken;
    } catch {
      return false;
    }
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
