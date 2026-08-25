import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ServicioTipousuario } from 'src/app/core/services/mantenimientos/tipousuario/tipousuario.service';
import { ServicioModulo } from 'src/app/core/services/mantenimientos/modulo/modulo.service';
import {
  AccionCatalogoPermiso,
  PermisoMatrizFila,
  ServicioPermiso
} from 'src/app/core/services/mantenimientos/permiso/permiso.service';
import { AccessControlService } from 'src/app/core/services/access/access-control.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-config-tipousuario',
  templateUrl: './tipousuario.html',
  styleUrls: ['./tipousuario.css']
})
export class TipousuarioPage implements OnInit {
  tipos: any[] = [];
  detalles: any[] = [];
  modulos: any[] = [];

  filtroTipo = '';

  seleccionado: any | null = null;

  actualTipo: any = { descripcion: '' };
  editTipoIndex = -1;

  actualDet: any = { idmodulo: undefined, acceso: 'N', lectura: 'N' };
  editDetIndex = -1;

  // Matriz de permisos (v2) del tipo seleccionado
  modoPermisosTipo: 'v2' | 'tipo' | null = null;
  cargandoPermisosTipo = false;
  permisosTipoCargados = false;
  accionesPermisosCatalogoTipo: AccionCatalogoPermiso[] = [];
  permisosMatrizTipo: PermisoMatrizFila[] = [];
  gruposPermisosTipo: Array<{ nombre: string; filas: PermisoMatrizFila[] }> = [];
  grupoAccesoAbiertoTipo = '';
  filtroPermisosTipo = '';
  mostrarSoloActivosTipo = false;
  guardandoPermisosTipo = false;

  // Toast SweetAlert para mensajes no bloqueantes
  Toast = (Swal as any).mixin({
    toast: true,
    position: 'bottom-start',
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: false
  });

  constructor(
    private tipoSrv: ServicioTipousuario,
    private moduloSrv: ServicioModulo,
    private permisoSrv: ServicioPermiso,
    private accessControl: AccessControlService,
  ) {}

  private obtenerMensajeError(err: any): string {
    return (
      err?.error?.message
      || err?.message
      || err?.details
      || 'Error inesperado en tipo de usuario.'
    );
  }

  private cerrarModal(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    const bs = (window as any)?.bootstrap;
    if (!bs?.Modal) return;
    const instance = bs.Modal.getInstance(el) || new bs.Modal(el);
    instance.hide();
  }

  ngOnInit(): void {
    this.cargarTipos();
    this.cargarModulos();
  }

  private unwrapList(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data?.items)) return res.data.items;
    return [];
  }

  cargarTipos(): void {
    this.tipoSrv.obtenerTodosTipousuario().subscribe({
      next: (res) => {
        this.tipos = this.unwrapList(res);
      },
      error: (err) => {
        this.tipos = [];
        this.Toast.fire({ title: this.obtenerMensajeError(err), icon: 'error' as any });
      }
    });
  }

  cargarModulos(): void {
    this.moduloSrv.obtenerTodosModulo().subscribe({
      next: (res) => {
        this.modulos = this.unwrapList(res);
      },
      error: (err) => {
        this.modulos = [];
        this.Toast.fire({ title: this.obtenerMensajeError(err), icon: 'error' as any });
      }
    });
  }

  cargarDetalles(): void {
    if (!this.seleccionado?.id) {
      this.detalles = [];
      return;
    }
    this.tipoSrv.buscarTipousuario(Number(this.seleccionado.id)).subscribe({
      next: (res) => {
        const tipo = Array.isArray(res?.data) ? res.data[0] : (res?.data || res);
        this.seleccionado = tipo || this.seleccionado;
        this.detalles = (this.seleccionado?.dtipousuarios || []);
      },
      error: (err) => {
        this.detalles = [];
        this.Toast.fire({ title: this.obtenerMensajeError(err), icon: 'error' as any });
      }
    });
  }

  private refrescarSeleccionado(): void {
    if (!this.seleccionado?.id) return;
    this.cargarDetalles();
  }

  get tiposFiltrados(): any[] {
    const q = this.filtroTipo.trim().toLowerCase();
    if (!q) return this.tipos;
    return this.tipos.filter((t: any) => (String(t?.id || '')).includes(q) || (String(t?.descripcion || '')).toLowerCase().includes(q));
  }

  seleccionarTipo(t: any): void {
    this.seleccionado = t;
    this.cargarMatrizPermisosTipo();
  }

  descModulo(id?: number): string {
    if (!id) return '-';
    const m = this.modulos.find((x: any) => x?.idmodulo === id);
    return m?.descmodulo || '-';
  }

  // Tipo de Usuario: acciones
  abrirModalNuevoTipo(): void {
    this.editTipoIndex = -1;
    this.actualTipo = { descripcion: '' };
  }

  abrirModalEditarTipo(t: any, idx: number): void {
    this.editTipoIndex = idx;
    this.actualTipo = { descripcion: t?.descripcion };
  }

  guardarTipo(form: NgForm): void {
    if (!form.valid) return;
    const payload = { descripcion: this.actualTipo.descripcion };

    // Validación de duplicado al crear: misma descripción (case-insensitive)
    if (this.editTipoIndex < 0) {
      const desc = String(payload.descripcion || '').trim().toLowerCase();
      const existe = this.tipos.some((t: any) => String(t?.descripcion || '').trim().toLowerCase() === desc);
      if (existe) {
        this.Toast.fire({ title: 'Tipo de usuario duplicado', icon: 'warning' as any });
        return;
      }
    }

    if (this.editTipoIndex >= 0) {
      const edit = this.tipos[this.editTipoIndex];
      this.tipoSrv.editarTipousuario(edit.id, payload).subscribe({
        next: () => {
          edit.descripcion = payload.descripcion;
          this.cargarTipos();
          this.cerrarModal('tipoModal');
          this.Toast.fire({ title: 'Tipo actualizado', icon: 'success' as any, timer: 4000, timerProgressBar: true });
        },
        error: (err) => {
          this.Toast.fire({ title: this.obtenerMensajeError(err), icon: 'error' as any });
        }
      });
    } else {
      this.tipoSrv.guardarTipousuario(payload).subscribe({
        next: () => {
          this.cargarTipos();
          this.cerrarModal('tipoModal');
          this.Toast.fire({ title: 'Tipo creado', icon: 'success' as any, timer: 4000, timerProgressBar: true });
        },
        error: (err) => {
          const status = err?.status;
          if (status === 409) {
            this.Toast.fire({ title: 'Tipo ya existe', icon: 'warning' as any });
          } else this.Toast.fire({ title: this.obtenerMensajeError(err), icon: 'error' as any });
        }
      });
    }
    this.editTipoIndex = -1;
    this.actualTipo = { descripcion: '' };
    form.resetForm({ descripcion: '' });
  }

  eliminarTipo(t: any): void {
    if (!t || !t.id) return;
    Swal.fire({
      title: 'Eliminar tipo',
      text: `¿Eliminar el tipo "${t.descripcion}" (ID ${t.id})?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.tipoSrv.eliminarTipousuario(t.id).subscribe({
        next: () => {
          if (this.seleccionado?.id === t.id) {
            this.seleccionado = null;
            this.detalles = [];
            this.limpiarEstadoPermisosTipo();
          }
          this.cargarTipos();
          this.Toast.fire({ title: 'Tipo eliminado', icon: 'success' as any, timer: 4000, timerProgressBar: true });
        },
        error: () => {
          this.Toast.fire({ title: 'Error al eliminar tipo', icon: 'error' as any });
        }
      });
    });
  }

  // Detalle de TipoUsuario (fallback legacy, solo cuando no hay catálogo v2)
  abrirModalNuevoDet(): void {
    this.editDetIndex = -1;
    this.actualDet = { idmodulo: undefined, acceso: 'N', lectura: 'N' };
  }

  abrirModalEditarDet(d: any, idx: number): void {
    this.editDetIndex = idx;
    this.actualDet = { idmodulo: d?.idmodulo, acceso: d?.acceso || 'N', lectura: d?.lectura || 'N' };
  }

  guardarDet(form: NgForm): void {
    if (!form.valid || !this.seleccionado?.id) return;
    const idtipousuario = Number(this.seleccionado.id);
    const idmodulo = Number(this.actualDet.idmodulo);
    const acceso = (this.actualDet.acceso || 'N').toUpperCase();
    const lectura = (this.actualDet.lectura || 'N').toUpperCase();
    if (!idmodulo || isNaN(idmodulo)) return;
    if (!['S','N'].includes(acceso) || !['S','N'].includes(lectura)) return;

    const payload = { idtipousuario, idmodulo, acceso, lectura };

    if (this.editDetIndex >= 0) {
      const edit = this.detalles[this.editDetIndex];
      this.tipoSrv.editarDetalle(edit.id, payload).subscribe({
        next: () => {
          edit.idmodulo = idmodulo;
          edit.acceso = acceso;
          edit.lectura = lectura;
          this.refrescarSeleccionado();
          this.cerrarModal('detModal');
          this.Toast.fire({ title: 'Detalle actualizado', icon: 'success' as any, timer: 4000, timerProgressBar: true });
        },
        error: (err) => {
          this.Toast.fire({ title: this.obtenerMensajeError(err), icon: 'error' as any });
        }
      });
    } else {
      // Validación de duplicado al crear: mismo módulo ya asignado
      const existeDet = this.detalles.some((d: any) => Number(d?.idmodulo) === idmodulo);
      if (existeDet) {
        this.Toast.fire({ title: 'Módulo ya asignado a este tipo', icon: 'warning' as any });
        return;
      }
      this.tipoSrv.agregarDetalle(idtipousuario, payload).subscribe({
        next: () => {
          this.refrescarSeleccionado();
          this.cerrarModal('detModal');
          this.Toast.fire({ title: 'Módulo agregado al tipo', icon: 'success' as any, timer: 4000, timerProgressBar: true });
        },
        error: (err) => {
          const status = err?.status;
          if (status === 409) {
            this.Toast.fire({ title: 'Módulo duplicado para este tipo', icon: 'warning' as any });
          } else this.Toast.fire({ title: this.obtenerMensajeError(err), icon: 'error' as any });
        }
      });
    }

    this.editDetIndex = -1;
    this.actualDet = { idmodulo: undefined, acceso: 'N', lectura: 'N' };
    form.resetForm({ idmodulo: undefined, acceso: 'N', lectura: 'N' });
  }

  eliminarDet(d: any): void {
    if (!d || !d.id) return;
    Swal.fire({
      title: 'Eliminar módulo del tipo',
      text: '¿Desea eliminar este módulo del tipo de usuario?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.tipoSrv.eliminarDetalle(d.id).subscribe({
        next: () => {
          this.refrescarSeleccionado();
          this.Toast.fire({ title: 'Módulo eliminado del tipo', icon: 'success' as any, timer: 4000, timerProgressBar: true });
        },
        error: () => {
          this.Toast.fire({ title: 'Error al eliminar módulo', icon: 'error' as any });
        }
      });
    });
  }

  // --- Matriz de permisos (v2) por tipo de usuario ---

  private limpiarEstadoPermisosTipo(): void {
    this.modoPermisosTipo = null;
    this.permisosTipoCargados = false;
    this.accionesPermisosCatalogoTipo = [];
    this.permisosMatrizTipo = [];
    this.gruposPermisosTipo = [];
    this.grupoAccesoAbiertoTipo = '';
    this.filtroPermisosTipo = '';
    this.mostrarSoloActivosTipo = false;
  }

  cargarMatrizPermisosTipo(): void {
    if (!this.seleccionado?.id) {
      this.limpiarEstadoPermisosTipo();
      return;
    }
    this.cargandoPermisosTipo = true;
    this.permisosTipoCargados = false;
    this.grupoAccesoAbiertoTipo = '';
    this.filtroPermisosTipo = '';
    this.mostrarSoloActivosTipo = false;

    this.permisoSrv.obtenerMatrizPermisosTipoUsuario(Number(this.seleccionado.id)).subscribe({
      next: (res: any) => {
        const data = res?.data || {};
        this.modoPermisosTipo = data?.modo === 'v2' ? 'v2' : 'tipo';
        this.cargandoPermisosTipo = false;

        if (this.modoPermisosTipo === 'v2') {
          this.accionesPermisosCatalogoTipo = this.unwrapList(data?.acciones);
          this.permisosMatrizTipo = Array.isArray(data?.filas) ? data.filas : [];
          this.actualizarGruposPermisosTipo();
          this.permisosTipoCargados = true;
        } else {
          // Sin catálogo v2 disponible: usar el flujo clásico de módulos acceso/lectura.
          this.cargarDetalles();
        }
      },
      error: (err) => {
        this.cargandoPermisosTipo = false;
        this.modoPermisosTipo = null;
        this.Toast.fire({ title: this.obtenerMensajeError(err), icon: 'error' as any });
      }
    });
  }

  guardarPermisosTipo(): void {
    if (!this.seleccionado?.id) return;
    this.guardandoPermisosTipo = true;
    this.permisoSrv.guardarMatrizPermisosTipoUsuario(Number(this.seleccionado.id), this.permisosMatrizTipo).subscribe({
      next: () => {
        this.guardandoPermisosTipo = false;
        this.accessControl.reset();
        this.Toast.fire({ title: 'Permisos del tipo guardados. Los usuarios de este tipo los heredarán automáticamente.', icon: 'success' as any, timer: 6000, timerProgressBar: true });
        this.cargarMatrizPermisosTipo();
      },
      error: (err) => {
        this.guardandoPermisosTipo = false;
        this.Toast.fire({ title: this.obtenerMensajeError(err), icon: 'error' as any });
      }
    });
  }

  private normalizarTexto(valor: any): string {
    return String(valor || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .toLowerCase();
  }

  private get permisosMatrizTipoFiltrados(): PermisoMatrizFila[] {
    const filtro = this.normalizarTexto(this.filtroPermisosTipo);
    return (this.permisosMatrizTipo || []).filter((fila: PermisoMatrizFila) => {
      if (this.mostrarSoloActivosTipo && !this.tieneAccionActiva(fila)) {
        return false;
      }
      if (!filtro) return true;
      const texto = this.normalizarTexto(
        `${fila?.modulo_nombre || ''} ${fila?.pantalla_nombre || ''} ${fila?.recurso_key || ''}`
      );
      return texto.includes(filtro);
    });
  }

  private construirGruposPermisos(filasOrigen: PermisoMatrizFila[]): Array<{ nombre: string; filas: PermisoMatrizFila[] }> {
    const grupos = new Map<string, PermisoMatrizFila[]>();
    (filasOrigen || []).forEach((fila: PermisoMatrizFila) => {
      const nombre = String(fila?.modulo_nombre || 'General').trim() || 'General';
      if (!grupos.has(nombre)) {
        grupos.set(nombre, []);
      }
      grupos.get(nombre)!.push(fila);
    });
    return Array.from(grupos.entries())
      .map(([nombre, filas]) => ({
        nombre,
        filas: [...filas].sort((a: PermisoMatrizFila, b: PermisoMatrizFila) =>
          String(a?.pantalla_nombre || '').localeCompare(String(b?.pantalla_nombre || ''), 'es', { sensitivity: 'base' })
        ),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  }

  actualizarGruposPermisosTipo(): void {
    this.gruposPermisosTipo = this.construirGruposPermisos(this.permisosMatrizTipoFiltrados);
    if (!this.grupoAccesoAbiertoTipo && this.gruposPermisosTipo.length) {
      const activo = this.gruposPermisosTipo.find((grupo) => this.contarRecursosActivosGrupo(grupo.filas) > 0);
      this.grupoAccesoAbiertoTipo = activo?.nombre || this.gruposPermisosTipo[0].nombre;
    }
  }

  trackPermisoFila(index: number, fila: PermisoMatrizFila): string {
    return String(fila?.recurso_key || fila?.idmodulo || fila?.pantalla_nombre || index);
  }

  trackAccionPermiso(index: number, accion: AccionCatalogoPermiso): string {
    return String(accion?.accion_key || index);
  }

  trackGrupoPermiso(index: number, grupo: { nombre: string }): string {
    return String(grupo?.nombre || index);
  }

  descripcionAccionPermiso(accion: AccionCatalogoPermiso): string {
    const key = String(accion?.accion_key || '').trim().toLowerCase();
    const etiquetas: Record<string, string> = {
      ver: 'Consultar',
      acceso: 'Acceso',
      lectura: 'Solo consulta',
      crear: 'Insertar / Crear',
      editar: 'Editar',
      eliminar: 'Eliminar',
      guardar: 'Guardar',
    };
    return etiquetas[key] || String(accion?.descripcion || key || 'Acción');
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

  alternarGrupoPermisos(filas: PermisoMatrizFila[], activo: boolean): void {
    (filas || []).forEach((fila: PermisoMatrizFila) => this.alternarFilaPermisos(fila, activo));
  }

  aplicarConsultaGrupoPermisos(filas: PermisoMatrizFila[]): void {
    (filas || []).forEach((fila: PermisoMatrizFila) => {
      Object.keys(fila?.acciones || {}).forEach((key: string) => {
        const normalizada = this.normalizarTexto(key);
        fila.acciones[key] = ['ver', 'acceso', 'lectura', 'consultar'].includes(normalizada);
      });
    });
  }

  contarRecursosActivosGrupo(filas: PermisoMatrizFila[]): number {
    return (filas || []).filter((fila: PermisoMatrizFila) => this.tieneAccionActiva(fila)).length;
  }

  contarAccionesActivasGrupo(filas: PermisoMatrizFila[]): number {
    return (filas || []).reduce((total: number, fila: PermisoMatrizFila) => total + this.contarAccionesActivas(fila), 0);
  }

  resumenGrupoPermisos(filas: PermisoMatrizFila[]): string {
    const total = (filas || []).length;
    const activos = this.contarRecursosActivosGrupo(filas);
    if (!activos) return 'Sin acceso';
    if (activos === total) return 'Activo completo';
    return `${activos} de ${total} pantallas`;
  }

  abrirGrupoPermisos(nombre: string): void {
    this.grupoAccesoAbiertoTipo = this.grupoAccesoAbiertoTipo === nombre ? '' : nombre;
  }

  estaGrupoPermisoAbierto(nombre: string): boolean {
    return this.grupoAccesoAbiertoTipo === nombre;
  }

  alternarTodosPermisosTipo(activo: boolean): void {
    (this.permisosMatrizTipo || []).forEach((fila: PermisoMatrizFila) => {
      this.alternarFilaPermisos(fila, activo);
    });
    this.actualizarGruposPermisosTipo();
  }

  limpiarPermisosTipo(): void {
    this.alternarTodosPermisosTipo(false);
  }

  onCambioPermisoTipo(): void {
    if (this.mostrarSoloActivosTipo) {
      this.actualizarGruposPermisosTipo();
    }
  }

  get totalRecursosPermisosTipo(): number {
    return Array.isArray(this.permisosMatrizTipo) ? this.permisosMatrizTipo.length : 0;
  }

  get totalRecursosActivosTipo(): number {
    return (this.permisosMatrizTipo || []).filter((fila: PermisoMatrizFila) => this.tieneAccionActiva(fila)).length;
  }

  get totalAccionesActivasTipo(): number {
    return (this.permisosMatrizTipo || []).reduce((acc: number, fila: PermisoMatrizFila) => acc + this.contarAccionesActivas(fila), 0);
  }
}
