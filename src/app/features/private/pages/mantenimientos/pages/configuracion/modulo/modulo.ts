import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ModuloModel, Modulo } from './modelo';

@Component({
  selector: 'app-config-modulo',
  templateUrl: './modulo.html',
  styleUrls: ['./modulo.css']
})
export class ModuloPage {
  modulos: Modulo[] = [];
  filtro = '';

  // modelo para el formulario de nuevo módulo
  nuevo: Partial<Modulo> = {
    descmodulo: '',
    scceso: 'N',
    lectura: 'N',
    permisos: []
  };

  constructor() {
    this.modulos = [
      new ModuloModel({ idmodulo: 1, descmodulo: 'Inventario', scceso: 'S', lectura: 'S' }),
      new ModuloModel({ idmodulo: 2, descmodulo: 'Ventas', scceso: 'S', lectura: 'N' }),
      new ModuloModel({ idmodulo: 3, descmodulo: 'Reportes', scceso: 'N', lectura: 'S' })
    ];
  }

  get listaFiltrada(): Modulo[] {
    const q = this.filtro.trim().toLowerCase();
    if (!q) return this.modulos;
    return this.modulos.filter(m =>
      (m.idmodulo + '').includes(q) ||
      (m.descmodulo || '').toLowerCase().includes(q) ||
      (m.scceso || '').toLowerCase().includes(q) ||
      (m.lectura || '').toLowerCase().includes(q)
    );
  }

  crearModulo(form: NgForm) {
    if (!form.valid) return;

    const desc = (this.nuevo.descmodulo || '').trim();
    if (!desc || desc.length > 30) return;
    const scc = (this.nuevo.scceso || 'N').toUpperCase();
    const lec = (this.nuevo.lectura || 'N').toUpperCase();
    if (!['S','N'].includes(scc) || !['S','N'].includes(lec)) return;

    const nextId = this.modulos.length ? Math.max(...this.modulos.map(m => m.idmodulo)) + 1 : 1;
    const nuevoModulo = new ModuloModel({
      idmodulo: nextId,
      descmodulo: desc,
      scceso: scc,
      lectura: lec,
      permisos: []
    });

    this.modulos = [nuevoModulo, ...this.modulos];
    // reset form
    this.nuevo = { descmodulo: '', scceso: 'N', lectura: 'N', permisos: [] };
    form.resetForm({ descmodulo: '', scceso: 'N', lectura: 'N' });
  }
}