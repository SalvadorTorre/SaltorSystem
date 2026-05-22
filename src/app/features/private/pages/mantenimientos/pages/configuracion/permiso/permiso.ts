import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ServicioPermiso } from 'src/app/core/services/mantenimientos/permiso/permiso.service';
import { ServicioModulo } from 'src/app/core/services/mantenimientos/modulo/modulo.service';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';

declare var $: any;

@Component({
  selector: 'app-config-permiso',
  templateUrl: './permiso.html',
  styleUrls: ['./permiso.css']
})
export class PermisoPage implements OnInit {
  permisos: any[] = [];
  modulos: any[] = [];
  usuarios: any[] = [];
  recursos: any[] = [];
  acciones: any[] = [];
  modo: 'v2' | 'legacy' = 'legacy';

  filtro = '';

  actual: any = this.buildActual();
  editando: any = null;
  guardando = false;

  constructor(
    private permisoSrv: ServicioPermiso,
    private moduloSrv: ServicioModulo,
    private usuarioSrv: ServicioUsuario,
  ) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  private buildActual(): any {
    return {
      idpermiso: null,
      codusuario: null,
      idmodulo: null,
      recurso_key: null,
      cod_empre: null,
      sucursalid: null,
      acciones: {}
    };
  }

  private unwrapList(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data?.items)) return res.data.items;
    return [];
  }

  cargarDatosIniciales(): void {
    forkJoin({
      accionesRes: this.permisoSrv.obtenerAccionesCatalogo(),
      recursosRes: this.permisoSrv.obtenerRecursosCatalogo(),
      modulosRes: this.moduloSrv.obtenerTodosModulo(),
      usuariosRes: this.usuarioSrv.buscarTodosUsuario(1, 500),
    }).subscribe({
      next: ({ accionesRes, recursosRes, modulosRes, usuariosRes }) => {
        this.acciones = this.unwrapList(accionesRes);
        this.recursos = this.unwrapList(recursosRes);
        this.modulos = this.unwrapList(modulosRes);
        this.usuarios = this.unwrapList(usuariosRes);
        this.cargarPermisos();
      },
      error: () => {
        this.acciones = [];
        this.recursos = [];
        this.modulos = [];
        this.usuarios = [];
        this.permisos = [];
      }
    });
  }

  cargarPermisos(): void {
    this.permisoSrv.obtenerListadoPermisosCrud().subscribe({
      next: (res) => {
        const payload = res?.data || {};
        this.modo = payload?.modo === 'v2' ? 'v2' : 'legacy';
        this.permisos = Array.isArray(payload?.rows) ? payload.rows : this.unwrapList(res);
        const accionesPayload = Array.isArray(payload?.acciones) ? payload.acciones : [];
        if (this.modo === 'v2' && accionesPayload.length) {
          this.acciones = accionesPayload;
        }
        if (this.modo !== 'v2' && !this.acciones.length) {
          this.acciones = [
            { accion_key: 'acceso', descripcion: 'Acceso', orden: 10 },
            { accion_key: 'lectura', descripcion: 'Lectura', orden: 20 },
          ];
        }
        if (this.modo !== 'v2') {
          this.permisos = (this.permisos || []).map((p: any) => ({
            ...p,
            acciones: {
              acceso: String(p?.acceso || 'N').toUpperCase() === 'S',
              lectura: String(p?.lectura || 'N').toUpperCase() === 'S',
            }
          }));
        }
      },
      error: () => {
        this.permisos = [];
      }
    });
  }

  nombreUsuario(codusuario?: number | string): string {
    const cod = Number(codusuario || 0);
    if (!cod) return '-';
    const u = this.usuarios.find((x: any) => Number(x?.codUsuario) === cod);
    if (!u) return `Usuario ${cod}`;
    return `${u?.nombreUsuario || '-'} (${u?.idUsuario || cod})`;
  }

  descModulo(id?: number): string {
    if (!id) return '-';
    const m = this.modulos.find((x: any) => Number(x?.idmodulo) === Number(id));
    return m?.descmodulo || '-';
  }

  descPantalla(p: any): string {
    if (this.modo === 'v2') return p?.pantalla_nombre || p?.recurso_key || '-';
    return this.descModulo(p?.idmodulo);
  }

  get listaFiltrada(): any[] {
    const q = this.filtro.trim().toLowerCase();
    if (!q) return this.permisos;
    return this.permisos.filter((p: any) => {
      const usuario = this.nombreUsuario(p?.codusuario ?? p?.idusuario).toLowerCase();
      const modulo = String(p?.modulo_nombre || this.descModulo(p?.idmodulo) || '').toLowerCase();
      const pantalla = this.descPantalla(p).toLowerCase();
      const empresa = String(p?.cod_empre || '').toLowerCase();
      const sucursal = String(p?.sucursalid || '').toLowerCase();
      return usuario.includes(q)
        || modulo.includes(q)
        || pantalla.includes(q)
        || empresa.includes(q)
        || sucursal.includes(q);
    });
  }

  private buildAccionesDefault(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    this.acciones.forEach((a: any) => {
      const key = String(a?.accion_key || '').trim();
      if (key) out[key] = false;
    });
    if (!Object.keys(out).length) {
      out['acceso'] = false;
      out['lectura'] = false;
    }
    return out;
  }

  abrirModalNuevo(): void {
    this.editando = null;
    this.actual = this.buildActual();
    this.actual.acciones = this.buildAccionesDefault();
  }

  abrirModalEditar(p: any): void {
    this.editando = p;
    const baseAcciones = this.buildAccionesDefault();
    const accionesActuales = { ...(p?.acciones || {}) };
    Object.keys(accionesActuales).forEach((k: string) => {
      baseAcciones[k] = !!accionesActuales[k];
    });

    this.actual = {
      idpermiso: p?.idpermiso ?? null,
      codusuario: Number(p?.codusuario ?? p?.idusuario ?? 0) || null,
      idmodulo: Number(p?.idmodulo || 0) || null,
      recurso_key: p?.recurso_key || null,
      cod_empre: p?.cod_empre || null,
      sucursalid: Number(p?.sucursalid || 0) || null,
      acciones: baseAcciones,
    };
  }

  private validarFormulario(): string | null {
    const cod = Number(this.actual?.codusuario || 0);
    if (!cod) return 'Debes seleccionar un usuario.';

    if (this.modo === 'v2') {
      const recurso = String(this.actual?.recurso_key || '').trim();
      if (!recurso) return 'Debes seleccionar una pantalla/recurso.';
      const hayAccion = Object.values(this.actual?.acciones || {}).some((v: any) => !!v);
      if (!hayAccion) return 'Debes seleccionar al menos una acción.';
      return null;
    }

    const idmod = Number(this.actual?.idmodulo || 0);
    if (!idmod) return 'Debes seleccionar un módulo.';
    return null;
  }

  guardarPermiso(form: NgForm): void {
    if (!form.valid) return;
    const errorValidacion = this.validarFormulario();
    if (errorValidacion) {
      alert(errorValidacion);
      return;
    }

    const payload: any = {
      idpermiso: this.actual?.idpermiso ?? null,
      codusuario: Number(this.actual?.codusuario || 0) || null,
      idusuario: Number(this.actual?.codusuario || 0) || null,
      idmodulo: Number(this.actual?.idmodulo || 0) || null,
      recurso_key: this.actual?.recurso_key || null,
      cod_empre: String(this.actual?.cod_empre || '').trim() || null,
      sucursalid: Number(this.actual?.sucursalid || 0) || null,
      acciones: { ...(this.actual?.acciones || {}) },
      acceso: this.actual?.acciones?.acceso ? 'S' : 'N',
      lectura: this.actual?.acciones?.lectura ? 'S' : 'N',
    };

    this.guardando = true;
    this.permisoSrv.guardarRegistroPermisoCrud(payload).subscribe({
      next: () => {
        this.guardando = false;
        this.cargarPermisos();
        this.editando = null;
        this.actual = this.buildActual();
        $('#permisoModal').modal('hide');
      },
      error: (err) => {
        this.guardando = false;
        alert(String(err?.message || 'No se pudo guardar el permiso.'));
      }
    });
  }

  eliminarPermiso(p: any): void {
    if (!confirm('¿Eliminar este permiso?')) return;
    this.permisoSrv.eliminarRegistroPermisoCrud(p).subscribe({
      next: () => {
        this.cargarPermisos();
      },
      error: (err) => {
        alert(String(err?.message || 'No se pudo eliminar el permiso.'));
      }
    });
  }
}
