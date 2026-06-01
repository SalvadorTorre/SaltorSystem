import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import {
  PermisoMatrizFila,
  ServicioPermiso,
} from '../mantenimientos/permiso/permiso.service';

type KnownRole = 'root' | 'admin' | 'vendedor';

interface DefaultPermissionTemplate {
  matchers: string[];
  allowAll?: boolean;
  allowedPaths: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AccessControlService {
  private readonly loaded$ = new BehaviorSubject<boolean>(false);
  private permisos: PermisoMatrizFila[] = [];
  private loadingPromise: Promise<void> | null = null;

  constructor(private readonly permisoSrv: ServicioPermiso) {}

  get isReady(): boolean {
    return this.loaded$.value;
  }

  async ensureLoaded(force = false): Promise<void> {
    if (this.loaded$.value && !force) return;
    if (this.loadingPromise && !force) return this.loadingPromise;

    this.loadingPromise = this.loadPermisos(force);
    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  reset(): void {
    this.permisos = [];
    this.loaded$.next(false);
    this.loadingPromise = null;
  }

  applyDefaultTemplate(
    filas: PermisoMatrizFila[],
    roleLabel: string,
  ): PermisoMatrizFila[] {
    const template = this.getDefaultTemplate(roleLabel);
    if (!template) return filas;

    return (filas || []).map((fila) => {
      const canView = template.allowAll
        ? true
        : this.templateAllowsPath(template, this.resolveRouteForPermiso(fila));

      const nextActions = { ...(fila?.acciones || {}) };
      Object.keys(nextActions).forEach((key) => {
        const normalized = this.normalizeLabel(key);
        nextActions[key] = canView
          ? ['ver', 'acceso', 'lectura'].includes(normalized)
          : false;
      });

      return {
        ...fila,
        acciones: nextActions,
      };
    });
  }

  canViewPath(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    if (!normalizedPath) return false;

    if (this.shouldBypassByRole()) {
      return true;
    }

    const allowed = this.getAllowedPermisos();
    if (!allowed.length) {
      return this.canViewByDefaultRole(normalizedPath);
    }

    return allowed.some((permiso) => {
      const ruta = this.resolveRouteForPermiso(permiso);
      if (!ruta) return false;
      return normalizedPath === ruta;
    });
  }

  canViewModule(modulePrefix: string): boolean {
    const normalizedPrefix = this.normalizePath(modulePrefix);
    if (!normalizedPrefix) return false;

    if (this.shouldBypassByRole()) {
      return true;
    }

    const allowed = this.getAllowedPermisos();
    if (!allowed.length) {
      return this.canViewByDefaultRole(normalizedPrefix, true);
    }

    return allowed.some((permiso) => {
      const ruta = this.resolveRouteForPermiso(permiso);
      return !!ruta && ruta.startsWith(normalizedPrefix);
    });
  }

  firstAllowedPathForModule(modulePrefix: string): string | null {
    const normalizedPrefix = this.normalizePath(modulePrefix);
    if (!normalizedPrefix) return null;

    if (this.shouldBypassByRole()) {
      return null;
    }

    const candidate = this.getAllowedPermisos()
      .map((permiso) => this.resolveRouteForPermiso(permiso))
      .filter((ruta): ruta is string => !!ruta)
      .find((ruta) => ruta.startsWith(normalizedPrefix));

    return candidate || null;
  }

  fallbackUrlForDeniedPath(path: string): string {
    const normalized = this.normalizePath(path);
    const modulePrefix = this.extractModulePrefix(normalized);
    const firstAllowed = modulePrefix
      ? this.firstAllowedPathForModule(modulePrefix)
      : null;
    return firstAllowed || '/private/home';
  }

  private async loadPermisos(force: boolean): Promise<void> {
    if (force) {
      this.permisos = [];
      this.loaded$.next(false);
    }

    const codusuario = Number(localStorage.getItem('codigousuario') || 0) || 0;
    const codEmpre =
      String(
        localStorage.getItem('codigoempresa') ||
          localStorage.getItem('cod_empre') ||
          '',
      ).trim() || null;
    const sucursalid = Number(localStorage.getItem('idSucursal') || 0) || null;

    if (!codusuario) {
      this.permisos = [];
      this.loaded$.next(true);
      return;
    }

    try {
      const response: any = await firstValueFrom(
        this.permisoSrv.obtenerMatrizPermisosUsuario(
          codusuario,
          codEmpre,
          sucursalid,
        ),
      );
      this.permisos = Array.isArray(response?.data?.filas)
        ? response.data.filas
        : [];
    } catch (error) {
      console.error('No se pudieron cargar los permisos del usuario actual', error);
      this.permisos = [];
    } finally {
      this.loaded$.next(true);
    }
  }

  private getAllowedPermisos(): PermisoMatrizFila[] {
    return this.permisos.filter((permiso) => this.hasViewAccess(permiso));
  }

  private hasViewAccess(permiso: PermisoMatrizFila): boolean {
    const acciones = permiso?.acciones || {};
    return !!(acciones['ver'] || acciones['acceso'] || acciones['lectura']);
  }

  private shouldBypassByRole(): boolean {
    const role = this.currentRole();
    const hasExplicitPermissions = this.getAllowedPermisos().length > 0;
    if (hasExplicitPermissions) {
      return false;
    }
    return role === 'root' || role === 'admin';
  }

  private canViewByDefaultRole(path: string, treatAsPrefix = false): boolean {
    const template = this.getDefaultTemplate(this.currentRoleLabel());
    if (!template) {
      return path === '/private/home';
    }
    if (template.allowAll) return true;
    return this.templateAllowsPath(template, path, treatAsPrefix);
  }

  private currentRole(): KnownRole {
    const raw = String(
      localStorage.getItem('role') ||
        localStorage.getItem('dashboardRole') ||
        'vendedor',
    )
      .trim()
      .toLowerCase();

    if (raw.includes('root')) return 'root';
    if (raw.includes('admin')) return 'admin';
    return 'vendedor';
  }

  private currentRoleLabel(): string {
    return String(
      localStorage.getItem('roleDescription') ||
        localStorage.getItem('role') ||
        localStorage.getItem('dashboardRole') ||
        'vendedor',
    ).trim();
  }

  private getDefaultTemplate(roleLabel: string): DefaultPermissionTemplate | null {
    const normalizedRole = this.normalizeLabel(roleLabel);
    const templates: DefaultPermissionTemplate[] = [
      {
        matchers: ['root', 'admin', 'computos', 'gerencia', 'supervisor'],
        allowAll: true,
        allowedPaths: [],
      },
      {
        matchers: ['cajera', 'caja', 'cobros'],
        allowedPaths: [
          '/private/home',
          '/private/caja',
          '/private/mantenimientos/cliente',
        ],
      },
      {
        matchers: ['vendedor', 'ventas', 'digitador'],
        allowedPaths: [
          '/private/home',
          '/private/facturacion',
          '/private/cotizacion',
          '/private/mantenimientos/cliente',
        ],
      },
      {
        matchers: ['despacho', 'despachador', 'desp hierro', 'despachoforjas', 'despacho forjas'],
        allowedPaths: [
          '/private/home',
          '/private/despacho',
          '/private/almacen',
        ],
      },
      {
        matchers: ['almacen', 'inventario', 'deposito'],
        allowedPaths: [
          '/private/home',
          '/private/almacen',
          '/private/mantenimientos/inventario',
          '/private/mantenimientos/inventario-sucursal',
          '/private/mantenimientos/suplidor',
          '/private/mantenimientos/grupo-mercancias',
        ],
      },
      {
        matchers: ['contabilidad', 'contable'],
        allowedPaths: [
          '/private/home',
          '/private/contabilidad',
          '/private/caja',
        ],
      },
      {
        matchers: ['chofer'],
        allowedPaths: ['/private/home'],
      },
    ];

    return templates.find((template) =>
      template.matchers.some((matcher) => normalizedRole.includes(this.normalizeLabel(matcher))),
    ) || null;
  }

  private templateAllowsPath(
    template: DefaultPermissionTemplate,
    path: string | null,
    treatAsPrefix = false,
  ): boolean {
    const normalizedPath = this.normalizePath(path || '');
    if (!normalizedPath) return false;
    return template.allowedPaths.some((allowedPath) => {
      const normalizedAllowed = this.normalizePath(allowedPath);
      if (treatAsPrefix) {
        return normalizedAllowed.startsWith(normalizedPath) || normalizedPath.startsWith(normalizedAllowed);
      }
      return normalizedPath === normalizedAllowed || normalizedPath.startsWith(`${normalizedAllowed}/`);
    });
  }

  private resolveRouteForPermiso(permiso: PermisoMatrizFila): string | null {
    const directRoute = this.normalizePath(permiso?.ruta || '');
    if (directRoute) return directRoute;

    const legacyLabel = this.normalizeLabel(
      permiso?.pantalla_nombre || permiso?.modulo_nombre || '',
    );
    if (!legacyLabel) return null;

    const legacyMap: Array<[string, string]> = [
      ['dashboard', '/private/home'],
      ['facturacion', '/private/facturacion'],
      ['cotizacion', '/private/cotizacion'],
      ['cobro factura', '/private/caja/CobroFact'],
      ['control salida', '/private/caja/ControlSalida'],
      ['cuadre caja', '/private/caja/cuadrecaja'],
      ['recibo ingreso', '/private/caja/reciboingreso'],
      ['caja', '/private/caja'],
      ['control factura', '/private/almacen/controlfact'],
      ['entrada mercancia', '/private/almacen/entradamerc'],
      ['venta interna', '/private/almacen/ventainterna'],
      ['pendiente entrega', '/private/almacen/pendiente'],
      ['salida factura', '/private/almacen/salidafactura'],
      ['devoluciones', '/private/almacen/devoluciones'],
      ['solicitud prestamo', '/private/almacen/solicitudprestamo'],
      ['almacen', '/private/almacen'],
      ['despacho', '/private/despacho'],
      ['facturas pendientes', '/private/contabilidad/facturas-pendientes'],
      ['contabilidad', '/private/contabilidad'],
      ['movimiento de productos', '/private/reporte/movproducto'],
      ['reportes', '/private/reporte'],
      ['inventario sucursal', '/private/mantenimientos/inventario-sucursal'],
      ['inventario', '/private/mantenimientos/inventario'],
      ['productos', '/private/mantenimientos/inventario'],
      ['clientes', '/private/mantenimientos/cliente'],
      ['sucursales', '/private/mantenimientos/sucursales'],
      ['suplidores', '/private/mantenimientos/suplidor'],
      ['zonas', '/private/mantenimientos/zona'],
      ['sectores', '/private/mantenimientos/sector'],
      ['usuarios', '/private/mantenimientos/usuario'],
      ['choferes', '/private/mantenimientos/choferes'],
      ['despachadores', '/private/mantenimientos/despachadores'],
      ['empresas', '/private/mantenimientos/Empresas'],
      ['grupo mercancias', '/private/mantenimientos/grupo-mercancias'],
      ['encf', '/private/mantenimientos/encf'],
      ['modulos', '/private/mantenimientos/modulo'],
      ['permisos', '/private/mantenimientos/permiso'],
      ['tipos de usuario', '/private/mantenimientos/tipousuario'],
      ['tipo de usuario', '/private/mantenimientos/tipousuario'],
      ['contadores factura', '/private/mantenimientos/contfactura'],
      ['tasa de itbis', '/private/mantenimientos/tasa-itbis'],
      ['forma entrega', '/private/mantenimientos/fentrega'],
      ['forma pago', '/private/mantenimientos/fpago'],
      ['rnc', '/private/mantenimientos/rnc'],
      ['configuracion global dgii', '/private/mantenimientos/configuracion-global'],
      ['mantenimientos', '/private/mantenimientos'],
    ];

    for (const [needle, route] of legacyMap) {
      if (legacyLabel.includes(needle)) {
        return route;
      }
    }

    return null;
  }

  private extractModulePrefix(path: string): string | null {
    const normalized = this.normalizePath(path);
    if (!normalized.startsWith('/private/')) return null;

    const parts = normalized.split('/').filter(Boolean);
    if (parts.length < 2) return '/private/home';
    if (parts.length === 2) return `/${parts.join('/')}`;
    return `/${parts[0]}/${parts[1]}`;
  }

  private normalizePath(path: string): string {
    const value = String(path || '').trim();
    if (!value) return '';
    return value.endsWith('/') && value.length > 1
      ? value.slice(0, -1)
      : value;
  }

  private normalizeLabel(label: string): string {
    return String(label || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
