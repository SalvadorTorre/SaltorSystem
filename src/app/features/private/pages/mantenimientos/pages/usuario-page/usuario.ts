import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
import { ModeloUsuarioData } from 'src/app/core/services/mantenimientos/usuario';
import {
  AccionCatalogoPermiso,
  PermisoMatrizFila,
  ServicioPermiso
} from 'src/app/core/services/mantenimientos/permiso/permiso.service';
import { ServicioModulo } from 'src/app/core/services/mantenimientos/modulo/modulo.service';
import { Permiso, PermisoModel } from 'src/app/features/private/pages/mantenimientos/pages/configuracion/permiso/modelo';
import Swal from 'sweetalert2';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';
import { ServicioTipousuario } from 'src/app/core/services/mantenimientos/tipousuario/tipousuario.service';
import { ServicioEmpresa } from 'src/app/core/services/mantenimientos/empresas/empresas.service';
import { ServicioChofer } from 'src/app/core/services/mantenimientos/choferes/choferes.service';
import { forkJoin, of } from 'rxjs';
declare var $: any;

@Component({
  selector: 'Usuario',
  templateUrl: './usuario.html',
  styleUrls: ['./usuario.css']
})
export class Usuario implements OnInit {
  // Usuarios
  usuarios: ModeloUsuarioData[] = [];
  filtroUsuario = '';
  selectedUsuario: ModeloUsuarioData | null = null;

  // Permisos del usuario seleccionado
  permisos: Permiso[] = [];
  modulos: any[] = [];
  sucursales: any[] = [];
  empresas: any[] = [];
  tipousuarios: any[] = [];
  actual: Partial<Permiso> = new PermisoModel();
  editIndex = -1;
  // Edición/creación de usuarios
  editableUsuario: Partial<ModeloUsuarioData> = {};
  nuevoUsuario: Partial<ModeloUsuarioData> = {};
  // Detalles de tipo seleccionado para nuevo usuario
  detallesTipoSeleccionado: any[] = [];
  accionesPermisosCatalogo: AccionCatalogoPermiso[] = [];
  permisosMatrizNuevoUsuario: PermisoMatrizFila[] = [];
  usernameExiste = false;
  claveExiste = false;
  usernameMensaje = '';
  claveMensaje = '';
  validandoUsername = false;
  validandoClave = false;
  private usernameDebounce: any;
  private claveDebounce: any;
  editUsernameExiste = false;
  editClaveExiste = false;
  editUsernameMensaje = '';
  editClaveMensaje = '';
  validandoEditUsername = false;
  validandoEditClave = false;
  private editUsernameDebounce: any;
  private editClaveDebounce: any;

  // Toast SweetAlert para mensajes no bloqueantes
  Toast = Swal.mixin({
    toast: true,
    position: 'bottom-start',
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: false
  });

  constructor(
    private usuarioSrv: ServicioUsuario,
    private permisoSrv: ServicioPermiso,
    private moduloSrv: ServicioModulo,
    private sucSrv: ServicioSucursal,
    private tipoSrv: ServicioTipousuario,
    private empresaSrv: ServicioEmpresa,
    private choferSrv: ServicioChofer,
  ) {}

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarModulos();
    this.cargarEmpresas();
    this.cargarSucursales();
    this.cargarTipousuarios();
  }

  // Helper centralizado para toasts con posición móvil y tiempos por tipo
  private fireToast(opts: { title: string; icon: 'success' | 'error' | 'warning' | 'info'; timer?: number; timerProgressBar?: boolean }): void {
    const isMobile = (typeof window !== 'undefined') && window.innerWidth <= 576;
    const position = isMobile ? 'bottom-end' : 'bottom-start';
    const timer = typeof opts.timer === 'number' ? opts.timer : (opts.icon === 'success' ? 4000 : 5000);
    const timerProgressBar = typeof opts.timerProgressBar === 'boolean' ? opts.timerProgressBar : (opts.icon === 'success');
    this.Toast.fire({
      title: opts.title,
      icon: opts.icon as any,
      position,
      timer,
      timerProgressBar
    });
  }

  private traducirError(rawMessage: any, fallback = 'Ocurrió un error'): string {
    const raw = String(rawMessage || '').trim();
    if (!raw) return fallback;
    const msg = raw.toLowerCase();
    if (msg.includes('password should be at least') || msg.includes('password must be at least')) {
      return 'La clave no cumple los requisitos internos de seguridad.';
    }
    if (msg.includes('already exists') || msg.includes('duplicate key')) {
      return 'Ya existe un registro con esos datos.';
    }
    if (msg.includes('invalid login credentials')) {
      return 'Usuario o clave inválidos.';
    }
    if (msg.includes('fetch failed') || msg.includes('network')) {
      return 'No se pudo conectar con el servidor.';
    }
    if (msg.includes('invalid api key')) {
      return 'Configuración inválida de Supabase.';
    }
    return raw;
  }

  get usuariosFiltrados(): ModeloUsuarioData[] {
    const q = this.filtroUsuario.trim().toLowerCase();
    if (!q) return this.usuarios;
    return this.usuarios.filter(u =>
      String(u.idUsuario || '').toLowerCase().includes(q)
      || String(u.codUsuario || '').toLowerCase().includes(q)
      || String(u.nombreUsuario || '').toLowerCase().includes(q)
    );
  }

  private unwrapList(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data?.items)) return res.data.items;
    return [];
  }

  cargarUsuarios(): void {
    this.usuarioSrv.buscarTodosUsuario(1, 200).subscribe({
      next: (res) => { this.usuarios = this.unwrapList(res); },
      error: () => { this.usuarios = []; }
    });
  }

  cargarModulos(): void {
    this.moduloSrv.obtenerTodosModulo().subscribe({
      next: (res) => { this.modulos = this.unwrapList(res); },
      error: () => { this.modulos = []; }
    });
  }

  cargarSucursales(): void {
    this.sucSrv.buscarTodasSucursal().subscribe({
      next: (res) => { this.sucursales = this.unwrapList(res); },
      error: () => { this.sucursales = []; }
    });
  }

  cargarEmpresas(): void {
    this.empresaSrv.buscarTodasEmpresa(1, 500).subscribe({
      next: (res) => { this.empresas = this.unwrapList(res); },
      error: () => { this.empresas = []; }
    });
  }

  cargarTipousuarios(): void {
    this.tipoSrv.obtenerTodosTipousuario().subscribe({
      next: (res) => { this.tipousuarios = this.unwrapList(res); },
      error: () => { this.tipousuarios = []; }
    });
  }

  private construirPlantillaPermisosNuevoUsuario(): void {
    forkJoin({
      accionesRes: this.permisoSrv.obtenerAccionesCatalogo(),
      recursosRes: this.permisoSrv.obtenerRecursosCatalogo(),
    }).subscribe({
      next: ({ accionesRes, recursosRes }) => {
        this.accionesPermisosCatalogo = this.unwrapList(accionesRes);
        const recursos = this.unwrapList(recursosRes);
        const actionKeys = this.accionesPermisosCatalogo.map((a: any) => String(a?.accion_key || '').trim()).filter(Boolean);
        this.permisosMatrizNuevoUsuario = recursos.map((r: any) => {
          const acciones: Record<string, boolean> = {};
          actionKeys.forEach((k: string) => acciones[k] = false);
          return {
            codusuario: null,
            recurso_key: String(r?.recurso_key || '').trim() || null,
            idmodulo: Number(r?.idmodulo || 0) || null,
            pantalla_nombre: r?.pantalla_nombre || r?.descmodulo || r?.descModulo || '-',
            modulo_nombre: r?.modulo_nombre || r?.modulo_key || 'General',
            acciones,
            modo: r?.recurso_key ? 'v2' : 'legacy',
          } as PermisoMatrizFila;
        });
      },
      error: () => {
        this.accionesPermisosCatalogo = [
          { accion_key: 'acceso', descripcion: 'Acceso', orden: 10 },
          { accion_key: 'lectura', descripcion: 'Lectura', orden: 20 },
        ];
        this.permisosMatrizNuevoUsuario = this.modulos.map((m: any) => ({
          codusuario: null,
          idmodulo: Number(m?.idmodulo || 0) || null,
          pantalla_nombre: m?.descmodulo || '-',
          modulo_nombre: 'Legacy',
          acciones: { acceso: false, lectura: false },
          modo: 'legacy',
        }));
      }
    });
  }

  private aplicarPermisosTipoSeleccionadoEnMatriz(detalles: any[]): void {
    if (!Array.isArray(detalles) || !detalles.length || !this.permisosMatrizNuevoUsuario.length) return;
    detalles.forEach((d: any) => {
      const idmod = Number(d?.idmodulo || 0);
      if (!idmod) return;
      const fila = this.permisosMatrizNuevoUsuario.find((f: PermisoMatrizFila) => Number(f?.idmodulo || 0) === idmod);
      if (!fila) return;
      if (Object.prototype.hasOwnProperty.call(fila.acciones, 'acceso')) {
        fila.acciones['acceso'] = String(d?.acceso || 'N').toUpperCase() === 'S';
      }
      if (Object.prototype.hasOwnProperty.call(fila.acciones, 'lectura')) {
        fila.acciones['lectura'] = String(d?.lectura || 'N').toUpperCase() === 'S';
      }
      if (Object.prototype.hasOwnProperty.call(fila.acciones, 'ver')) {
        const acceso = String(d?.acceso || 'N').toUpperCase() === 'S';
        const lectura = String(d?.lectura || 'N').toUpperCase() === 'S';
        fila.acciones['ver'] = acceso || lectura;
      }
    });
  }

  private hayPermisosSeleccionados(filas: PermisoMatrizFila[]): boolean {
    return (filas || []).some((f: PermisoMatrizFila) =>
      Object.values(f?.acciones || {}).some((v: any) => !!v)
    );
  }

  get totalRecursosPermisosNuevoUsuario(): number {
    return Array.isArray(this.permisosMatrizNuevoUsuario) ? this.permisosMatrizNuevoUsuario.length : 0;
  }

  get totalAccionesActivasNuevoUsuario(): number {
    return (this.permisosMatrizNuevoUsuario || []).reduce((acc: number, fila: PermisoMatrizFila) => {
      return acc + this.contarAccionesActivas(fila);
    }, 0);
  }

  get totalRecursosActivosNuevoUsuario(): number {
    return (this.permisosMatrizNuevoUsuario || []).filter((fila: PermisoMatrizFila) =>
      this.contarAccionesActivas(fila) > 0
    ).length;
  }

  contarAccionesActivas(fila?: PermisoMatrizFila | null): number {
    return Object.values(fila?.acciones || {}).filter((valor: any) => !!valor).length;
  }

  tieneAccionActiva(fila?: PermisoMatrizFila | null): boolean {
    return this.contarAccionesActivas(fila) > 0;
  }

  alternarFilaPermisos(fila: PermisoMatrizFila, activo: boolean): void {
    Object.keys(fila?.acciones || {}).forEach((key: string) => {
      fila.acciones[key] = activo;
    });
  }

  alternarTodosPermisosNuevoUsuario(activo: boolean): void {
    (this.permisosMatrizNuevoUsuario || []).forEach((fila: PermisoMatrizFila) => {
      this.alternarFilaPermisos(fila, activo);
    });
  }

  limpiarPermisosNuevoUsuario(): void {
    this.alternarTodosPermisosNuevoUsuario(false);
  }

  reAplicarPlantillaTipoNuevoUsuario(): void {
    this.limpiarPermisosNuevoUsuario();
    this.aplicarPermisosTipoSeleccionadoEnMatriz(this.detallesTipoSeleccionado);
  }

  descModulo(id?: number): string {
    if (!id) return '-';
    const m = this.modulos.find((x: any) => x?.idmodulo === id);
    return m?.descmodulo || '-';
  }

  descTipoUsuario(id?: number): string {
    if (!id) return '-';
    const tipo = this.tipousuarios.find((t: any) => Number(t?.id ?? t?.idtipoUsuario ?? t?.codigo) === Number(id));
    return tipo?.descripcion || tipo?.desc || `Tipo ${id}`;
  }

  descSucursalUsuario(usuario?: Partial<ModeloUsuarioData> | null): string {
    if (!usuario) return '-';
    const sucId = Number((usuario as any)?.sucursalid ?? usuario?.sucursal);
    const sucursal = this.sucursales.find((s: any) => Number(s?.cod_sucursal) === sucId);
    if (sucursal) {
      return `${sucursal?.nom_sucursal || 'Sucursal'} (${sucursal?.cod_sucursal})`;
    }
    const info = (usuario as any)?.sucursalInfo;
    if (Array.isArray(info) && info.length) {
      const first = info[0];
      return first?.nom_sucursal || first?.descripcion || (sucId ? `Sucursal ${sucId}` : '-');
    }
    if (info && typeof info === 'object') {
      return info?.nom_sucursal || info?.descripcion || (sucId ? `Sucursal ${sucId}` : '-');
    }
    return sucId ? `Sucursal ${sucId}` : '-';
  }

  descEmpresaUsuario(usuario?: Partial<ModeloUsuarioData> | null): string {
    if (!usuario) return '-';
    const empresa = String((usuario as any)?.empresa || '').trim();
    if (empresa) return empresa;
    const info = (usuario as any)?.empresaInfo;
    if (Array.isArray(info) && info.length) {
      const first = info[0];
      return first?.nom_empre || first?.descripcion || first?.nombre || ((usuario as any)?.cod_empre ? `Empresa ${(usuario as any)?.cod_empre}` : '-');
    }
    if (info && typeof info === 'object') {
      return info?.nom_empre || info?.descripcion || info?.nombre || ((usuario as any)?.cod_empre ? `Empresa ${(usuario as any)?.cod_empre}` : '-');
    }
    return (usuario as any)?.cod_empre ? `Empresa ${(usuario as any)?.cod_empre}` : '-';
  }

  estadoBooleano(valor: any): string {
    return this.esVerdadero(valor) ? 'Sí' : 'No';
  }

  claseEstadoBooleano(valor: any): string {
    return this.esVerdadero(valor) ? 'badge text-bg-success' : 'badge text-bg-secondary';
  }

  estadoConfigurado(valor: any): string {
    return String(valor || '').trim() ? 'Configurada' : 'No definida';
  }

  claseEstadoConfigurado(valor: any): string {
    return String(valor || '').trim() ? 'badge text-bg-success' : 'badge text-bg-warning';
  }

  private esVerdadero(valor: any): boolean {
    if (typeof valor === 'boolean') return valor;
    if (typeof valor === 'number') return valor === 1;
    if (typeof valor === 'string') {
      const v = valor.trim().toUpperCase();
      return ['S', 'SI', 'TRUE', '1', 'Y', 'YES'].includes(v);
    }
    return false;
  }

  abrirPermisosUsuario(u: ModeloUsuarioData): void {
    this.selectedUsuario = u;
    this.actual = new PermisoModel({ codusuario: Number(u.codUsuario) || undefined });
    this.editIndex = -1;
    // Cargar todos los permisos y filtrar por usuario (hasta tener endpoint dedicado)
    this.permisoSrv.obtenerTodosPermiso().subscribe({
      next: (res) => {
        const all = this.unwrapList(res);
        const cod = Number(u.codUsuario);
        this.permisos = all.filter((p: any) => Number(p?.codusuario) === cod);
        $('#modalPermisosUsuario').modal('show');
      },
      error: () => {
        this.permisos = [];
        $('#modalPermisosUsuario').modal('show');
      }
    });
  }

  // --- Acciones a nivel de usuario ---
  consultarUsuario(u: ModeloUsuarioData): void {
    this.selectedUsuario = u;
    this.actual = new PermisoModel({ codusuario: Number(u.codUsuario) || undefined });
    this.editIndex = -1;
    this.permisoSrv.obtenerTodosPermiso().subscribe({
      next: (res) => {
        const all = this.unwrapList(res);
        const cod = Number(u.codUsuario);
        this.permisos = all.filter((p: any) => Number(p?.codusuario) === cod);
        $('#modalConsultaUsuario').modal('show');
      },
      error: () => {
        this.permisos = [];
        $('#modalConsultaUsuario').modal('show');
      }
    });
  }

  abrirEditarUsuario(u: ModeloUsuarioData): void {
    const sucursalid = Number((u as any)?.sucursalid ?? (u as any)?.sucursal ?? 0) || undefined;
    const suc = this.sucursales.find((s: any) => Number(s?.cod_sucursal) === Number(sucursalid));
    const codEmpre = String((u as any)?.cod_empre || suc?.cod_empre || '').trim();
    const emp = this.empresas.find((e: any) => String(e?.cod_empre || '').trim() === codEmpre);
    this.selectedUsuario = u;
    // Crear copia editable con campos comunes
    this.editableUsuario = {
      codUsuario: u.codUsuario,
      idUsuario: u.idUsuario,
      nombreUsuario: u.nombreUsuario,
      claveUsuario: u.claveUsuario,
      nivel: u.nivel,
      correo: u.correo,
      claveCorreo: (u as any).claveCorreo,
      idtipoUsuario: Number((u as any).idtipoUsuario || 0) || undefined,
      cod_empre: codEmpre || undefined,
      empresa: emp?.nom_empre || u.empresa || '',
      sucursalid,
      sucursal: sucursalid,
    };
    this.resetValidacionesEditarUsuario();
    $('#modalEditarUsuario').modal('show');
  }

  private resetValidacionesEditarUsuario(): void {
    this.editUsernameExiste = false;
    this.editClaveExiste = false;
    this.editUsernameMensaje = '';
    this.editClaveMensaje = '';
    this.validandoEditUsername = false;
    this.validandoEditClave = false;
    if (this.editUsernameDebounce) clearTimeout(this.editUsernameDebounce);
    if (this.editClaveDebounce) clearTimeout(this.editClaveDebounce);
  }

  onEditarIdUsuarioInput(value: string): void {
    const upper = String(value || '').toUpperCase().trim();
    (this.editableUsuario as any).idUsuario = upper;

    this.editUsernameExiste = false;
    this.editUsernameMensaje = '';
    this.validandoEditUsername = false;
    if (this.editUsernameDebounce) clearTimeout(this.editUsernameDebounce);

    if (!upper) return;

    const original = String(this.selectedUsuario?.idUsuario || '').trim().toUpperCase();
    if (upper === original) return;

    const codActual = Number(this.selectedUsuario?.codUsuario || 0);
    const existeLocal = this.usuarios.some((u) => {
      const cod = Number(u?.codUsuario || 0);
      const id = String(u?.idUsuario || '').trim().toUpperCase();
      return cod !== codActual && id === upper;
    });
    if (existeLocal) {
      this.editUsernameExiste = true;
      this.editUsernameMensaje = 'Ese nombre de usuario ya existe.';
      return;
    }

    this.validandoEditUsername = true;
    this.editUsernameDebounce = setTimeout(() => {
      this.usuarioSrv.existeUsuarioPorId(upper).subscribe({
        next: (existe: boolean) => {
          this.validandoEditUsername = false;
          this.editUsernameExiste = !!existe;
          this.editUsernameMensaje = existe ? 'Ese nombre de usuario ya existe.' : '';
        },
        error: () => {
          this.validandoEditUsername = false;
          this.editUsernameMensaje = 'No se pudo validar el nombre de usuario.';
        }
      });
    }, 250);
  }

  onEditarClaveUsuarioInput(value: string): void {
    const clave = String(value || '').slice(0, 4);
    (this.editableUsuario as any).claveUsuario = clave;

    this.editClaveExiste = false;
    this.editClaveMensaje = '';
    this.validandoEditClave = false;
    if (this.editClaveDebounce) clearTimeout(this.editClaveDebounce);

    if (!clave) return;
    if (clave.length < 4) {
      this.editClaveMensaje = 'La clave debe tener 4 caracteres.';
      return;
    }

    const original = String((this.selectedUsuario as any)?.claveUsuario || '').trim();
    if (clave === original) return;

    const codActual = Number(this.selectedUsuario?.codUsuario || 0);
    const existeLocal = this.usuarios.some((u: any) => {
      const cod = Number(u?.codUsuario || 0);
      const claveUsr = String(u?.claveUsuario || '').trim();
      return cod !== codActual && claveUsr === clave;
    });
    if (existeLocal) {
      this.editClaveExiste = true;
      this.editClaveMensaje = 'Esa clave ya existe.';
      return;
    }

    this.validandoEditClave = true;
    this.editClaveDebounce = setTimeout(() => {
      this.usuarioSrv.existeClaveUsuario(clave).subscribe({
        next: (existe: boolean) => {
          this.validandoEditClave = false;
          this.editClaveExiste = !!existe;
          this.editClaveMensaje = existe ? 'Esa clave ya existe.' : '';
        },
        error: () => {
          this.validandoEditClave = false;
          this.editClaveMensaje = 'No se pudo validar la clave.';
        }
      });
    }, 250);
  }

  guardarEdicionUsuario(form: NgForm): void {
    if (!this.selectedUsuario) {
      this.fireToast({ title: 'Usuario no seleccionado', icon: 'warning' });
      return;
    }
    if (!form.valid) {
      this.fireToast({ title: 'Formulario inválido', icon: 'warning' });
      return;
    }
    const id = Number(this.selectedUsuario.codUsuario);
    const payload: any = { ...(this.editableUsuario as any) };
    payload.idUsuario = String(payload.idUsuario || '').trim().toUpperCase();
    payload.claveUsuario = String(payload.claveUsuario || '');

    if (payload.claveUsuario.length !== 4) {
      this.fireToast({ title: 'La clave debe tener exactamente 4 caracteres', icon: 'warning' });
      return;
    }
    if (this.editUsernameExiste || this.editClaveExiste || this.validandoEditUsername || this.validandoEditClave) {
      this.fireToast({ title: 'Corrige usuario/clave antes de guardar', icon: 'warning' });
      return;
    }

    payload.nombreUsuario = String(payload.nombreUsuario || '').trim();
    payload.cod_empre = String(payload.cod_empre || '').trim() || null;
    payload.idtipoUsuario = Number(payload.idtipoUsuario || 0) || null;

    const sucursalid = Number(payload.sucursalid ?? payload.sucursal ?? 0) || null;
    payload.sucursalid = sucursalid;
    payload.sucursal = sucursalid;

    if (!payload.cod_empre && sucursalid) {
      const suc = this.sucursales.find((s: any) => Number(s?.cod_sucursal) === Number(sucursalid));
      if (suc?.cod_empre) {
        payload.cod_empre = String(suc.cod_empre);
      }
    }

    const originalId = String(this.selectedUsuario.idUsuario || '').trim().toUpperCase();
    const originalClave = String((this.selectedUsuario as any).claveUsuario || '').trim();
    const cambioUsuario = payload.idUsuario !== originalId;
    const cambioClave = payload.claveUsuario !== originalClave;

    forkJoin([
      cambioUsuario ? this.usuarioSrv.existeUsuarioPorId(payload.idUsuario) : of(false),
      cambioClave ? this.usuarioSrv.existeClaveUsuario(payload.claveUsuario) : of(false),
    ]).subscribe({
      next: ([existeId, existeClave]) => {
        if (existeId) {
          this.editUsernameExiste = true;
          this.editUsernameMensaje = 'Ese nombre de usuario ya existe.';
          this.fireToast({ title: 'Ese nombre de usuario ya existe', icon: 'warning' });
          return;
        }
        if (existeClave) {
          this.editClaveExiste = true;
          this.editClaveMensaje = 'Esa clave ya existe.';
          this.fireToast({ title: 'Esa clave ya existe', icon: 'warning' });
          return;
        }

        this.usuarioSrv.editarUsuario(id, payload as any).subscribe({
          next: () => {
            this.cargarUsuarios();
            $('#modalEditarUsuario').modal('hide');
            this.fireToast({ title: 'Usuario actualizado', icon: 'success' });
          },
          error: () => {
            this.fireToast({ title: 'Error al actualizar usuario', icon: 'error' });
          }
        });
      },
      error: () => {
        this.fireToast({ title: 'No se pudo validar duplicados en servidor', icon: 'error' });
      }
    });
  }

  abrirNuevoUsuario(): void {
    this.nuevoUsuario = {
      codUsuario: undefined,
      idUsuario: '',
      claveUsuario: '',
      nombreUsuario: '',
      nivel: 1,
      correo: '',
      claveCorreo: '',
      idtipoUsuario: undefined,
      sucursalid: undefined,
      cod_empre: undefined,
      empresa: '',
    } as any;
    this.detallesTipoSeleccionado = [];
    this.accionesPermisosCatalogo = [];
    this.permisosMatrizNuevoUsuario = [];
    this.resetValidacionesNuevoUsuario();
    this.construirPlantillaPermisosNuevoUsuario();
    $('#modalNuevoUsuario').modal('show');
  }

  private resetValidacionesNuevoUsuario(): void {
    this.usernameExiste = false;
    this.claveExiste = false;
    this.usernameMensaje = '';
    this.claveMensaje = '';
    this.validandoUsername = false;
    this.validandoClave = false;
    if (this.usernameDebounce) clearTimeout(this.usernameDebounce);
    if (this.claveDebounce) clearTimeout(this.claveDebounce);
  }

  onNuevoIdUsuarioInput(value: string): void {
    const upper = String(value || '').toUpperCase().trim();
    (this.nuevoUsuario as any).idUsuario = upper;

    this.usernameExiste = false;
    this.usernameMensaje = '';
    this.validandoUsername = false;
    if (this.usernameDebounce) clearTimeout(this.usernameDebounce);

    if (!upper) return;

    const existeLocal = this.usuarios.some(
      (u) => String(u?.idUsuario || '').trim().toUpperCase() === upper
    );
    if (existeLocal) {
      this.usernameExiste = true;
      this.usernameMensaje = 'Ese nombre de usuario ya existe.';
      return;
    }

    this.validandoUsername = true;
    this.usernameDebounce = setTimeout(() => {
      this.usuarioSrv.existeUsuarioPorId(upper).subscribe({
        next: (existe: boolean) => {
          this.validandoUsername = false;
          this.usernameExiste = !!existe;
          this.usernameMensaje = existe ? 'Ese nombre de usuario ya existe.' : '';
        },
        error: () => {
          this.validandoUsername = false;
          this.usernameMensaje = 'No se pudo validar el nombre de usuario.';
        }
      });
    }, 250);
  }

  onNuevoClaveUsuarioInput(value: string): void {
    const clave = String(value || '').slice(0, 4);
    (this.nuevoUsuario as any).claveUsuario = clave;

    this.claveExiste = false;
    this.claveMensaje = '';
    this.validandoClave = false;
    if (this.claveDebounce) clearTimeout(this.claveDebounce);

    if (!clave) return;
    if (clave.length < 4) {
      this.claveMensaje = 'La clave debe tener 4 caracteres.';
      return;
    }

    const existeLocal = this.usuarios.some(
      (u) => String((u as any)?.claveUsuario || '').trim() === clave
    );
    if (existeLocal) {
      this.claveExiste = true;
      this.claveMensaje = 'Esa clave ya existe.';
      return;
    }

    this.validandoClave = true;
    this.claveDebounce = setTimeout(() => {
      this.usuarioSrv.existeClaveUsuario(clave).subscribe({
        next: (existe: boolean) => {
          this.validandoClave = false;
          this.claveExiste = !!existe;
          this.claveMensaje = existe ? 'Esa clave ya existe.' : '';
        },
        error: () => {
          this.validandoClave = false;
          this.claveMensaje = 'No se pudo validar la clave.';
        }
      });
    }, 250);
  }

  onTipoUsuarioChange(idtipo: number | undefined): void {
    this.detallesTipoSeleccionado = [];
    if (!idtipo) return;
    this.tipoSrv.buscarTipousuario(Number(idtipo)).subscribe({
      next: (res: any) => {
        const tipo = Array.isArray(res?.data) ? res.data[0] : (res?.data ?? res);
        this.detallesTipoSeleccionado = Array.isArray(tipo?.dtipousuarios) ? tipo.dtipousuarios : [];
        this.aplicarPermisosTipoSeleccionadoEnMatriz(this.detallesTipoSeleccionado);
      },
      error: () => {
        this.detallesTipoSeleccionado = [];
      }
    });
  }

  guardarNuevoUsuario(form: NgForm): void {
    if (!form.valid) {
      this.fireToast({ title: 'Formulario inválido', icon: 'warning' });
      return;
    }
    const idNuevoForm = String((this.nuevoUsuario as any)?.idUsuario || '')
      .trim()
      .toUpperCase();
    (this.nuevoUsuario as any).idUsuario = idNuevoForm;
    const claveNueva = String((this.nuevoUsuario as any)?.claveUsuario || '');

    if (claveNueva.length !== 4) {
      this.fireToast({ title: 'La clave debe tener exactamente 4 caracteres', icon: 'warning' });
      return;
    }
    if (this.usernameExiste || this.claveExiste || this.validandoUsername || this.validandoClave) {
      this.fireToast({ title: 'Corrige usuario/clave antes de guardar', icon: 'warning' });
      return;
    }

    // Validación de duplicado: por codUsuario o idUsuario
    const codNuevo = Number((this.nuevoUsuario as any)?.codUsuario);
    const idNuevo = idNuevoForm.toLowerCase();
    const existeUsuario = this.usuarios.some(u => Number(u?.codUsuario) === codNuevo || String(u?.idUsuario || '').trim().toLowerCase() === idNuevo);
    if (existeUsuario) {
      this.fireToast({ title: 'Usuario duplicado', icon: 'warning' });
      return;
    }
    const existeClave = this.usuarios.some(
      (u) => String((u as any)?.claveUsuario || '').trim() === claveNueva
    );
    if (existeClave) {
      this.fireToast({ title: 'Esa clave ya existe', icon: 'warning' });
      return;
    }
    const payload: any = { ...(this.nuevoUsuario as any) };
    payload.idUsuario = String(payload.idUsuario || '').trim();
    payload.nombreUsuario = String(payload.nombreUsuario || '').trim();
    payload.cod_empre = String(payload.cod_empre || '').trim() || null;
    payload.idtipoUsuario = Number(payload.idtipoUsuario || 0) || null;
    const sucursalid = Number(payload.sucursalid ?? payload.sucursal ?? 0) || null;
    payload.sucursalid = sucursalid;
    payload.sucursal = sucursalid;

    if (!payload.cod_empre && sucursalid) {
      const suc = this.sucursales.find((s: any) => Number(s?.cod_sucursal) === Number(sucursalid));
      if (suc?.cod_empre) {
        payload.cod_empre = String(suc.cod_empre);
      }
    }

    forkJoin([
      this.usuarioSrv.existeUsuarioPorId(idNuevoForm),
      this.usuarioSrv.existeClaveUsuario(claveNueva),
    ]).subscribe({
      next: ([existeId, existeClaveSrv]) => {
        if (existeId) {
          this.usernameExiste = true;
          this.usernameMensaje = 'Ese nombre de usuario ya existe.';
          this.fireToast({ title: 'Ese nombre de usuario ya existe', icon: 'warning' });
          return;
        }
        if (existeClaveSrv) {
          this.claveExiste = true;
          this.claveMensaje = 'Esa clave ya existe.';
          this.fireToast({ title: 'Esa clave ya existe', icon: 'warning' });
          return;
        }

        this.usuarioSrv.guardarUsuario(payload as any).subscribe({
          next: (res) => {
            // Intentar obtener el codUsuario creado
            const nuevoCod = Number(res?.data?.codUsuario ?? res?.codUsuario ?? (Array.isArray(res?.data) ? res.data[0]?.codUsuario : undefined));
            const continuar = (cod: number | undefined) => {
              const empresaScope = String(payload?.cod_empre || '').trim() || null;
              const sucursalScope = Number(payload?.sucursalid || 0) || null;
              if (!cod || isNaN(cod)) {
                // Buscar por idUsuario si no vino el id
                const clave = String((this.nuevoUsuario as any)?.idUsuario || '');
                this.usuarioSrv.buscarUsuarioPorClave(clave).subscribe({
                  next: (buscado) => {
                    const usuarioEncontrado = Array.isArray(buscado?.data) ? buscado.data[0] : (buscado?.data ?? buscado);
                    const codEncontrado = Number(usuarioEncontrado?.codUsuario);
                    if (codEncontrado) {
                      this.finalizarCreacionNuevoUsuario(codEncontrado, payload, empresaScope, sucursalScope);
                    } else {
                      this.fireToast({ title: 'Usuario creado (sin permisos por tipo)', icon: 'info' });
                      this.cargarUsuarios();
                      $('#modalNuevoUsuario').modal('hide');
                      this.fireToast({ title: 'Usuario creado', icon: 'success' });
                    }
                  },
                  error: () => {
                    this.cargarUsuarios();
                    $('#modalNuevoUsuario').modal('hide');
                    this.fireToast({ title: 'Usuario creado (no se pudieron cargar permisos)', icon: 'warning' });
                  }
                });
              } else {
                this.finalizarCreacionNuevoUsuario(cod, payload, empresaScope, sucursalScope);
              }
            };
            continuar(nuevoCod);
          },
          error: (error: any) => {
            const msg = this.traducirError(
              error?.error?.message ||
              error?.message ||
              'Error al crear usuario'
            );
            this.fireToast({ title: msg, icon: 'error' });
          }
        });
      },
      error: () => {
        this.fireToast({ title: 'No se pudo validar duplicados en servidor', icon: 'error' });
      }
    });
  }

  private finalizarCreacionNuevoUsuario(
    codusuario: number,
    payload: any,
    empresaScope?: string | null,
    sucursalScope?: number | null,
  ): void {
    const persistirYSalir = () => {
      this.persistirPermisosSeleccionados(codusuario, empresaScope, sucursalScope);
      this.cargarUsuarios();
      $('#modalNuevoUsuario').modal('hide');
      this.fireToast({ title: 'Usuario creado', icon: 'success' });
    };

    if (!this.esTipoChofer(payload?.idtipoUsuario)) {
      persistirYSalir();
      return;
    }

    this.choferSrv.guardarChofer({
      codChofer: codusuario,
      nomChofer: payload?.nombreUsuario,
      cedChofer: '',
      statusChofer: true,
      claveUsuario: payload?.claveUsuario,
    }).subscribe({
      next: () => {
        this.fireToast({ title: 'Chofer creado desde usuario', icon: 'success' });
        persistirYSalir();
      },
      error: () => {
        persistirYSalir();
        this.fireToast({ title: 'Usuario creado, pero no se pudo crear el chofer', icon: 'warning' });
      }
    });
  }

  private esTipoChofer(idtipo: any): boolean {
    if (Number(idtipo) === 8) return true;

    const tipo = this.tipousuarios.find(
      (t: any) => Number(t?.id ?? t?.idtipoUsuario ?? t?.codigo) === Number(idtipo),
    );
    const descripcion = String(tipo?.descripcion || tipo?.desc || tipo?.nombre || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
    return descripcion === 'CHOFER';
  }

  private persistirPermisosDesdeDetalles(codusuario: number): void {
    if (!codusuario || !Array.isArray(this.detallesTipoSeleccionado) || this.detallesTipoSeleccionado.length === 0) {
      return;
    }
    const llamadas = this.detallesTipoSeleccionado.map((d: any) => {
      const payload: Partial<Permiso> = {
        codusuario,
        idmodulo: Number(d?.idmodulo),
        acceso: String(d?.acceso || 'N').toUpperCase(),
        lectura: String(d?.lectura || 'N').toUpperCase(),
      };
      return this.permisoSrv.guardarPermiso(payload);
    });
    forkJoin(llamadas).subscribe({
      next: () => {
        this.fireToast({ title: 'Permisos aplicados por tipo de usuario', icon: 'success' });
      },
      error: () => {
        this.fireToast({ title: 'Error aplicando permisos por tipo', icon: 'error' });
      }
    });
  }

  private persistirPermisosSeleccionados(
    codusuario: number,
    codEmpre?: string | null,
    sucursalid?: number | null
  ): void {
    if (!codusuario) return;

    const filas = Array.isArray(this.permisosMatrizNuevoUsuario)
      ? this.permisosMatrizNuevoUsuario
      : [];

    if (!this.hayPermisosSeleccionados(filas)) {
      // Fallback para compatibilidad con el detalle heredado del tipo.
      this.persistirPermisosDesdeDetalles(codusuario);
      return;
    }

    this.permisoSrv.guardarMatrizPermisosUsuario(codusuario, filas, codEmpre, sucursalid).subscribe({
      next: () => {
        this.fireToast({ title: 'Permisos del usuario guardados', icon: 'success' });
      },
      error: () => {
        // fallback legacy para no perder la creación de usuario
        this.persistirPermisosDesdeDetalles(codusuario);
        this.fireToast({ title: 'No se pudo guardar la matriz de permisos, se aplicó plantilla básica', icon: 'warning' });
      }
    });
  }

  get sucursalesFiltradasNuevo(): any[] {
    const codEmpre = String((this.nuevoUsuario as any)?.cod_empre || '').trim();
    if (!codEmpre) return this.sucursales;
    return this.sucursales.filter((s: any) => String(s?.cod_empre || '').trim() === codEmpre);
  }

  get sucursalesFiltradasEdicion(): any[] {
    const codEmpre = String((this.editableUsuario as any)?.cod_empre || '').trim();
    if (!codEmpre) return this.sucursales;
    return this.sucursales.filter((s: any) => String(s?.cod_empre || '').trim() === codEmpre);
  }

  onEmpresaChange(codEmpre: string | undefined, modo: 'nuevo' | 'editar' = 'nuevo'): void {
    const codigo = String(codEmpre || '').trim();
    const target: any = modo === 'nuevo' ? this.nuevoUsuario : this.editableUsuario;
    target.cod_empre = codigo || undefined;
    const empresa = this.empresas.find((e: any) => String(e?.cod_empre || '').trim() === codigo);
    target.empresa = empresa?.nom_empre || '';

    const sucursalidActual = Number(target?.sucursalid ?? target?.sucursal ?? 0) || 0;
    if (sucursalidActual) {
      const suc = this.sucursales.find((s: any) => Number(s?.cod_sucursal) === sucursalidActual);
      if (!suc || String(suc?.cod_empre || '').trim() !== codigo) {
        target.sucursalid = undefined;
        target.sucursal = undefined;
      }
    }
  }

  onSucursalChange(sucursalId: number | undefined, modo: 'nuevo' | 'editar' = 'nuevo'): void {
    if (!sucursalId) { return; }
    const s = this.sucursales.find((x: any) => Number(x?.cod_sucursal) === Number(sucursalId));
    const target: any = modo === 'nuevo' ? this.nuevoUsuario : this.editableUsuario;
    if (s) {
      target.sucursalid = sucursalId;
      target.sucursal = sucursalId; // compatibilidad
      target.cod_empre = s.cod_empre ?? target.cod_empre;
      // Buscar nombre de la empresa por código y reflejarlo en el formulario
      if (s.cod_empre) {
        const empresa = this.empresas.find((e: any) => String(e?.cod_empre || '').trim() === String(s.cod_empre).trim());
        target.empresa = String(empresa?.nom_empre || '').trim();
      } else {
        target.empresa = '';
      }
    }
  }

  eliminarUsuario(u: ModeloUsuarioData): void {
    if (!u || !u.codUsuario) {
      this.fireToast({ title: 'Usuario inválido', icon: 'error' });
      return;
    }
    const id = Number(u.codUsuario);
    Swal.fire({
      title: 'Eliminar usuario',
      text: `¿Eliminar usuario ${u.nombreUsuario} (${u.idUsuario})?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.usuarioSrv.eliminarUsuario(id).subscribe({
        next: () => {
          this.cargarUsuarios();
          this.fireToast({ title: 'Usuario eliminado', icon: 'success' });
        },
        error: () => {
          this.cargarUsuarios();
          this.fireToast({ title: 'Error al eliminar', icon: 'error' });
        }
      });
    });
  }

  cerrarModalPermisosUsuario(): void {
    $('#modalPermisosUsuario').modal('hide');
    this.selectedUsuario = null;
    this.permisos = [];
    this.actual = new PermisoModel();
    this.editIndex = -1;
  }

  abrirNuevoPermiso(): void {
    if (!this.selectedUsuario) return;
    this.editIndex = -1;
    this.actual = new PermisoModel({ codusuario: Number(this.selectedUsuario.codUsuario) });
  }

  abrirEditarPermiso(p: Permiso, idx: number): void {
    this.editIndex = idx;
    this.actual = new PermisoModel({
      idpermiso: p.idpermiso,
      codusuario: p.codusuario,
      idmodulo: p.idmodulo,
      acceso: p.acceso,
      lectura: p.lectura,
    });
  }

  guardarPermiso(form: NgForm): void {
    if (!form.valid) {
      this.fireToast({ title: 'Formulario inválido', icon: 'warning' });
      return;
    }
    if (!this.selectedUsuario) {
      this.fireToast({ title: 'Usuario no seleccionado', icon: 'warning' });
      return;
    }
    const payload: Partial<Permiso> = {
      codusuario: Number(this.selectedUsuario.codUsuario),
      idmodulo: this.actual.idmodulo,
      acceso: this.actual.acceso,
      lectura: this.actual.lectura,
    };
    console.log('Guardar permiso', payload);
    if (!payload.idmodulo) {
      this.fireToast({ title: 'Módulo requerido', icon: 'warning' });
      return;
    }
    // Validación de duplicado al crear: mismo usuario + módulo
    if (this.editIndex < 0) {
      const userId = Number(this.selectedUsuario.codUsuario);
      const modId = Number(this.actual.idmodulo);
      const existe = this.permisos.some((p: any) => Number(p?.codusuario) === userId && Number(p?.idmodulo) === modId);
      if (existe) {
        this.fireToast({ title: 'Permiso duplicado', icon: 'warning' });
        return;
      }
    }
    if (this.editIndex >= 0 && this.actual.idpermiso) {
      this.permisoSrv.editarPermiso(this.actual.idpermiso, payload).subscribe({
        next: () => {
          this.refrescarListaTrasCambio();
          this.fireToast({ title: 'Permiso actualizado', icon: 'success' });
        },
        error: () => {
          this.refrescarListaTrasCambio();
          this.fireToast({ title: 'Error al actualizar', icon: 'error' });
        }
      });
    } else {
      this.permisoSrv.guardarPermiso(payload).subscribe({
        next: () => {
          this.refrescarListaTrasCambio();
          this.fireToast({ title: 'Permiso creado', icon: 'success' });
        },
        error: () => {
          this.refrescarListaTrasCambio();
          this.fireToast({ title: 'Error al crear', icon: 'error' });
        }
      });
    }
  }

  eliminarPermiso(p: Permiso): void {
    if (!p?.idpermiso) {
      this.fireToast({ title: 'Permiso inválido', icon: 'error' });
      return;
    }
    Swal.fire({
      title: 'Eliminar permiso',
      text: '¿Desea eliminar este permiso?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.permisoSrv.eliminarPermiso(p.idpermiso).subscribe({
        next: () => {
          this.refrescarListaTrasCambio();
          this.fireToast({ title: 'Permiso eliminado', icon: 'success' });
        },
        error: () => {
          this.refrescarListaTrasCambio();
          this.fireToast({ title: 'Error al eliminar', icon: 'error' });
        }
      });
    });
  }

  private refrescarListaTrasCambio(): void {
    if (!this.selectedUsuario) return;
    this.permisoSrv.obtenerTodosPermiso().subscribe({
      next: (res) => {
        const all = this.unwrapList(res);
        const cod = Number(this.selectedUsuario!.codUsuario);
        this.permisos = all.filter((p: any) => Number(p?.codusuario) === cod);
      },
      error: () => { this.permisos = []; }
    });
    this.editIndex = -1;
    this.actual = new PermisoModel({ codusuario: Number(this.selectedUsuario.codUsuario) });
  }
}
