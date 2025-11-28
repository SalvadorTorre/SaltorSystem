import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
import { ModeloUsuarioData } from 'src/app/core/services/mantenimientos/usuario';
import { ServicioPermiso } from 'src/app/core/services/mantenimientos/permiso/permiso.service';
import { ServicioModulo } from 'src/app/core/services/mantenimientos/modulo/modulo.service';
import { Permiso, PermisoModel } from 'src/app/features/private/pages/mantenimientos/pages/configuracion/permiso/modelo';
import Swal from 'sweetalert2';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';
import { ServicioTipousuario } from 'src/app/core/services/mantenimientos/tipousuario/tipousuario.service';
import { forkJoin } from 'rxjs';
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
  tipousuarios: any[] = [];
  actual: Partial<Permiso> = new PermisoModel();
  editIndex = -1;
  // Edición/creación de usuarios
  editableUsuario: Partial<ModeloUsuarioData> = {};
  nuevoUsuario: Partial<ModeloUsuarioData> = {};
  // Detalles de tipo seleccionado para nuevo usuario
  detallesTipoSeleccionado: any[] = [];

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
  ) {}

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarModulos();
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

  cargarTipousuarios(): void {
    this.tipoSrv.obtenerTodosTipousuario().subscribe({
      next: (res) => { this.tipousuarios = this.unwrapList(res); },
      error: () => { this.tipousuarios = []; }
    });
  }

  descModulo(id?: number): string {
    if (!id) return '-';
    const m = this.modulos.find((x: any) => x?.idmodulo === id);
    return m?.descmodulo || '-';
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
    this.selectedUsuario = u;
    // Crear copia editable con campos comunes
    this.editableUsuario = {
      codUsuario: u.codUsuario,
      idUsuario: u.idUsuario,
      nombreUsuario: u.nombreUsuario,
      claveUsuario: u.claveUsuario,
      nivel: u.nivel,
      correo: u.correo,
      empresa: u.empresa,
      sucursal: u.sucursal,
    };
    $('#modalEditarUsuario').modal('show');
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
    this.usuarioSrv.editarUsuario(id, this.editableUsuario as any).subscribe({
      next: () => {
        this.cargarUsuarios();
        $('#modalEditarUsuario').modal('hide');
        this.fireToast({ title: 'Usuario actualizado', icon: 'success' });
      },
      error: () => {
        this.fireToast({ title: 'Error al actualizar usuario', icon: 'error' });
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
      idpermiso: undefined,
      cod_empre: '',
    } as any;
    this.detallesTipoSeleccionado = [];
    $('#modalNuevoUsuario').modal('show');
  }

  onTipoUsuarioChange(idtipo: number | undefined): void {
    this.detallesTipoSeleccionado = [];
    if (!idtipo) return;
    this.tipoSrv.buscarTipousuario(Number(idtipo)).subscribe({
      next: (res: any) => {
        const tipo = Array.isArray(res?.data) ? res.data[0] : (res?.data ?? res);
        this.detallesTipoSeleccionado = Array.isArray(tipo?.dtipousuarios) ? tipo.dtipousuarios : [];
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
    // Validación de duplicado: por codUsuario o idUsuario
    const codNuevo = Number((this.nuevoUsuario as any)?.codUsuario);
    const idNuevo = String((this.nuevoUsuario as any)?.idUsuario || '').trim().toLowerCase();
    const existeUsuario = this.usuarios.some(u => Number(u?.codUsuario) === codNuevo || String(u?.idUsuario || '').trim().toLowerCase() === idNuevo);
    if (existeUsuario) {
      this.fireToast({ title: 'Usuario duplicado', icon: 'warning' });
      return;
    }
    this.usuarioSrv.guardarUsuario(this.nuevoUsuario as any).subscribe({
      next: (res) => {
        // Intentar obtener el codUsuario creado
        const nuevoCod = Number(res?.data?.codUsuario ?? res?.codUsuario ?? (Array.isArray(res?.data) ? res.data[0]?.codUsuario : undefined));
        const continuar = (cod: number | undefined) => {
          if (!cod || isNaN(cod)) {
            // Buscar por idUsuario si no vino el id
            const clave = String((this.nuevoUsuario as any)?.idUsuario || '');
            this.usuarioSrv.buscarUsuarioPorClave(clave).subscribe({
              next: (buscado) => {
                const usuarioEncontrado = Array.isArray(buscado?.data) ? buscado.data[0] : (buscado?.data ?? buscado);
                const codEncontrado = Number(usuarioEncontrado?.codUsuario);
                if (codEncontrado) {
                  this.persistirPermisosDesdeDetalles(codEncontrado);
                } else {
                  this.fireToast({ title: 'Usuario creado (sin permisos por tipo)', icon: 'info' });
                }
                this.cargarUsuarios();
                $('#modalNuevoUsuario').modal('hide');
                this.fireToast({ title: 'Usuario creado', icon: 'success' });
              },
              error: () => {
                this.cargarUsuarios();
                $('#modalNuevoUsuario').modal('hide');
                this.fireToast({ title: 'Usuario creado (no se pudieron cargar permisos)', icon: 'warning' });
              }
            });
          } else {
            this.persistirPermisosDesdeDetalles(cod);
            this.cargarUsuarios();
            $('#modalNuevoUsuario').modal('hide');
            this.fireToast({ title: 'Usuario creado', icon: 'success' });
          }
        };
        continuar(nuevoCod);
      },
      error: () => {
        this.fireToast({ title: 'Error al crear usuario', icon: 'error' });
      }
    });
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

  onSucursalChange(sucursalId: number | undefined): void {
    if (!sucursalId) { return; }
    const s = this.sucursales.find((x: any) => Number(x?.cod_sucursal) === Number(sucursalId));
    if (s) {
      (this.nuevoUsuario as any).sucursalid = sucursalId;
      (this.nuevoUsuario as any).sucursal = sucursalId; // mantener compatibilidad con backend existente
      (this.nuevoUsuario as any).cod_empre = s.cod_empre ?? (this.nuevoUsuario as any).cod_empre;
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