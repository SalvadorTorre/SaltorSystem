import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ServicioTipousuario } from 'src/app/core/services/mantenimientos/tipousuario/tipousuario.service';
import { ServicioModulo } from 'src/app/core/services/mantenimientos/modulo/modulo.service';

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

  constructor(
    private tipoSrv: ServicioTipousuario,
    private moduloSrv: ServicioModulo,
  ) {}

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
      error: () => {
        this.tipos = [];
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
      error: () => {
        this.detalles = [];
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
    this.cargarDetalles();
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
    if (this.editTipoIndex >= 0) {
      const edit = this.tipos[this.editTipoIndex];
      this.tipoSrv.editarTipousuario(edit.id, payload).subscribe({
        next: () => {
          edit.descripcion = payload.descripcion;
          this.cargarTipos();
        },
        error: () => {}
      });
    } else {
      this.tipoSrv.guardarTipousuario(payload).subscribe({
        next: () => {
          this.cargarTipos();
        },
        error: () => {}
      });
    }
    this.editTipoIndex = -1;
    this.actualTipo = { descripcion: '' };
    form.resetForm({ descripcion: '' });
  }

  eliminarTipo(t: any): void {
    if (!t || !t.id) return;
    this.tipoSrv.eliminarTipousuario(t.id).subscribe({
      next: () => {
        if (this.seleccionado?.id === t.id) {
          this.seleccionado = null;
          this.detalles = [];
        }
        this.cargarTipos();
      },
      error: () => {}
    });
  }

  // Detalle de TipoUsuario: acciones
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
        },
        error: () => {}
      });
    } else {
      this.tipoSrv.agregarDetalle(idtipousuario, payload).subscribe({
        next: () => {
          this.refrescarSeleccionado();
        },
        error: () => {}
      });
    }

    this.editDetIndex = -1;
    this.actualDet = { idmodulo: undefined, acceso: 'N', lectura: 'N' };
    form.resetForm({ idmodulo: undefined, acceso: 'N', lectura: 'N' });
  }

  eliminarDet(d: any): void {
    if (!d || !d.id) return;
    this.tipoSrv.eliminarDetalle(d.id).subscribe({
      next: () => {
        this.refrescarSeleccionado();
      },
      error: () => {}
    });
  }
}