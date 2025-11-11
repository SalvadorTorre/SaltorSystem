import { Component } from '@angular/core';
import { Encf, EncfModel } from './encf-modelo';

@Component({
  selector: 'app-encf',
  templateUrl: './encf.html',
  styleUrls: ['./encf.css']
})
export class EncfComponent {
  encf: Encf = new EncfModel();
  listaEncf: Encf[] = [];
  editIndex: number = -1;

  guardarEncf() {
    if (!this.encf.codempr || !this.encf.tipoencf || !this.encf.fechaencf) {
      alert('Debe completar los campos requeridos: Empresa, Tipo y Fecha.');
      return;
    }

    const data = { ...this.encf };
    if (this.editIndex >= 0) {
      this.listaEncf[this.editIndex] = data;
    } else {
      // Generar ID simple para el ejemplo
      const nextId = (this.listaEncf[this.listaEncf.length - 1]?.id ?? 0) + 1;
      data.id = nextId;
      this.listaEncf.push(data);
    }
    this.limpiarFormulario();
  }

  limpiarFormulario() {
    this.encf = new EncfModel();
    this.editIndex = -1;
  }

  editar(item: Encf) {
    const idx = this.listaEncf.findIndex(n => n === item);
    this.editIndex = idx;
    this.encf = { ...item };
  }

  eliminar(item: Encf) {
    if (confirm('¿Seguro que desea eliminar este registro?')) {
      this.listaEncf = this.listaEncf.filter(n => n !== item);
      if (this.editIndex >= 0 && this.listaEncf[this.editIndex]?.id === item.id) {
        this.limpiarFormulario();
      }
    }
  }
}