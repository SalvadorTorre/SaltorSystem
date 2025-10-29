import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Permiso, PermisoModel } from './modelo';
import { ModuloModel, Modulo } from '../modulo/modelo';

@Component({
  selector: 'app-config-permiso',
  templateUrl: './permiso.html',
  styleUrls: ['./permiso.css']
})
export class PermisoPage {
  permisos: Permiso[] = [];
  modulos: Modulo[] = [];
  filtro = '';

  actual: Partial<Permiso> = { idusuario: '', idmodulo: undefined, acceso: 'N', lectura: 'N' };
  editIndex = -1;

  constructor() {
    // Datos de ejemplo de módulos (podrían venir de un servicio)
    this.modulos = [
      new ModuloModel({ idmodulo: 1, descmodulo: 'Inventario', scceso: 'S', lectura: 'S' }),
      new ModuloModel({ idmodulo: 2, descmodulo: 'Ventas', scceso: 'S', lectura: 'N' }),
      new ModuloModel({ idmodulo: 3, descmodulo: 'Reportes', scceso: 'N', lectura: 'S' })
    ];

    // Datos de ejemplo de permisos
    this.permisos = [
      new PermisoModel({ idpermiso: 1, idusuario: 'USR001', idmodulo: 1, acceso: 'S', lectura: 'S' }),
      new PermisoModel({ idpermiso: 2, idusuario: 'USR002', idmodulo: 2, acceso: 'S', lectura: 'N' }),
      new PermisoModel({ idpermiso: 3, idusuario: 'USR003', idmodulo: 3, acceso: 'N', lectura: 'S' }),
    ];
  }

  descModulo(id?: number): string {
    if (!id) return '-';
    const m = this.modulos.find(x => x.idmodulo === id);
    return m?.descmodulo || '-';
  }

  get listaFiltrada(): Permiso[] {
    const q = this.filtro.trim().toLowerCase();
    if (!q) return this.permisos;
    return this.permisos.filter(p => {
      const modulo = this.modulos.find(m => m.idmodulo === p.idmodulo)?.descmodulo || '';
      return (p.idpermiso + '').includes(q)
        || (p.idusuario || '').toLowerCase().includes(q)
        || (p.acceso || '').toLowerCase().includes(q)
        || (p.lectura || '').toLowerCase().includes(q)
        || modulo.toLowerCase().includes(q);
    });
  }

  abrirModalNuevo() {
    this.editIndex = -1;
    this.actual = { idusuario: '', idmodulo: undefined, acceso: 'N', lectura: 'N' };
  }

  abrirModalEditar(p: Permiso, idx: number) {
    this.editIndex = idx;
    this.actual = { ...p };
  }

  guardarPermiso(form: NgForm) {
    if (!form.valid) return;
    const idusuario = (this.actual.idusuario || '').trim();
    const acceso = (this.actual.acceso || 'N').toUpperCase();
    const lectura = (this.actual.lectura || 'N').toUpperCase();
    const idmodulo = this.actual.idmodulo;

    if (!idusuario || idusuario.length > 10) return;
    if (!['S','N'].includes(acceso) || !['S','N'].includes(lectura)) return;
    if (!idmodulo) return;

    if (this.editIndex >= 0) {
      const edit = this.permisos[this.editIndex];
      edit.idusuario = idusuario;
      edit.idmodulo = idmodulo;
      edit.acceso = acceso;
      edit.lectura = lectura;
    } else {
      const nextId = this.permisos.length ? Math.max(...this.permisos.map(x => x.idpermiso)) + 1 : 1;
      const nuevo = new PermisoModel({
        idpermiso: nextId,
        idusuario,
        idmodulo,
        acceso,
        lectura,
      });
      this.permisos = [nuevo, ...this.permisos];
    }

    // Reset
    this.editIndex = -1;
    this.actual = { idusuario: '', idmodulo: undefined, acceso: 'N', lectura: 'N' };
    form.resetForm({ idusuario: '', idmodulo: undefined, acceso: 'N', lectura: 'N' });
  }
}