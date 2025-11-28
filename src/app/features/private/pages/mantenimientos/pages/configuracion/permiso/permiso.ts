import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ServicioPermiso } from 'src/app/core/services/mantenimientos/permiso/permiso.service';
import { ServicioModulo } from 'src/app/core/services/mantenimientos/modulo/modulo.service';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';

@Component({
  selector: 'app-config-permiso',
  templateUrl: './permiso.html',
  styleUrls: ['./permiso.css']
})
export class PermisoPage implements OnInit {
  permisos: any[] = [];
  modulos: any[] = [];
  usuarios: any[] = [];

  filtro = '';

  actual: any = { idusuario: '', idmodulo: undefined, acceso: 'N', lectura: 'N' };
  editIndex = -1;

  constructor(
    private permisoSrv: ServicioPermiso,
    private moduloSrv: ServicioModulo,
    private usuarioSrv: ServicioUsuario,
  ) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
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
    this.cargarPermisos();
    this.cargarModulos();
    this.cargarUsuarios();
  }

  cargarPermisos(): void {
    this.permisoSrv.obtenerTodosPermiso().subscribe({
      next: (res) => {
        this.permisos = this.unwrapList(res);
      },
      error: () => {
        this.permisos = [];
      }
    });
  }

  cargarModulos(): void {
    this.moduloSrv.obtenerTodosModulo().subscribe({
      next: (res) => {
        this.modulos = this.unwrapList(res);
      },
      error: () => {
        this.modulos = [];
      }
    });
  }

  cargarUsuarios(): void {
    // Trae la primera página con un tamaño grande para poblar el combo
    this.usuarioSrv.buscarTodosUsuario(1, 200).subscribe({
      next: (res) => {
        this.usuarios = this.unwrapList(res);
      },
      error: () => {
        this.usuarios = [];
      }
    });
  }

  descModulo(id?: number): string {
    if (!id) return '-';
    const m = this.modulos.find((x: any) => x?.idmodulo === id);
    return m?.descmodulo || '-';
  }

  nombreUsuario(idCodUsuario?: number | string): string {
    if (idCodUsuario === undefined || idCodUsuario === null || idCodUsuario === '') return '-';
    const cod = Number(idCodUsuario);
    const u = this.usuarios.find((x: any) => Number(x?.codUsuario) === cod);
    return u?.nombreUsuario || '-';
  }

  get listaFiltrada(): any[] {
    const q = this.filtro.trim().toLowerCase();
    if (!q) return this.permisos;
    return this.permisos.filter((p: any) => {
      const moduloDesc = this.descModulo(p?.idmodulo).toLowerCase();
      const usuarioNombre = this.nombreUsuario(p?.idusuario).toLowerCase();
      return (String(p?.idpermiso || '')).includes(q)
        || (String(p?.idusuario || '')).toLowerCase().includes(q)
        || usuarioNombre.includes(q)
        || (String(p?.acceso || '')).toLowerCase().includes(q)
        || (String(p?.lectura || '')).toLowerCase().includes(q)
        || moduloDesc.includes(q);
    });
  }

  abrirModalNuevo(): void {
    this.editIndex = -1;
    this.actual = { idusuario: '', idmodulo: undefined, acceso: 'N', lectura: 'N' };
  }

  abrirModalEditar(p: any, idx: number): void {
    this.editIndex = idx;
    // Clonar para no mutar directamente
    this.actual = { idusuario: p?.idusuario, idmodulo: p?.idmodulo, acceso: p?.acceso, lectura: p?.lectura };
  }

  guardarPermiso(form: NgForm): void {
    if (!form.valid) return;
    const idusuario = Number(this.actual.idusuario);
    const idmodulo = Number(this.actual.idmodulo);
    const acceso = (this.actual.acceso || 'N').toUpperCase();
    const lectura = (this.actual.lectura || 'N').toUpperCase();

    if (!idusuario || isNaN(idusuario)) return;
    if (!idmodulo || isNaN(idmodulo)) return;
    if (!['S', 'N'].includes(acceso) || !['S', 'N'].includes(lectura)) return;

    const payload = { idusuario, idmodulo, acceso, lectura };

    if (this.editIndex >= 0) {
      const edit = this.permisos[this.editIndex];
      this.permisoSrv.editarPermiso(edit.idpermiso, payload).subscribe({
        next: () => {
          // Actualiza localmente y recarga
          edit.idusuario = idusuario;
          edit.idmodulo = idmodulo;
          edit.acceso = acceso;
          edit.lectura = lectura;
          this.cargarPermisos();
        },
        error: () => {}
      });
    } else {
      this.permisoSrv.guardarPermiso(payload).subscribe({
        next: () => {
          this.cargarPermisos();
        },
        error: () => {}
      });
    }

    // Reset modal/form
    this.editIndex = -1;
    this.actual = { idusuario: '', idmodulo: undefined, acceso: 'N', lectura: 'N' };
    form.resetForm({ idusuario: '', idmodulo: undefined, acceso: 'N', lectura: 'N' });
  }

  eliminarPermiso(p: any): void {
    if (!p || !p.idpermiso) return;
    this.permisoSrv.eliminarPermiso(p.idpermiso).subscribe({
      next: () => {
        this.cargarPermisos();
      },
      error: () => {}
    });
  }
}