import { Component } from '@angular/core';
import { DespachoService } from './despacho.service';
import { Despacho } from './despacho.model';

@Component({
  selector: 'despacho',
  templateUrl: './despacho.html',
  styleUrls: ['./despacho.css']

})
export class Despachocomponent {
  cedula: string = '';
  despacho: Despacho | null = null;
  mensaje: string = '';

  constructor(private despachoService: DespachoService) { }
  buscarDespachador() {
    if (!this.cedula) {
      this.mensaje = 'Debe ingresar una cédula';
      this.despacho = null;
      return;
    }

    this.despachoService.buscarPorCedula(this.cedula).subscribe({
      next: (data) => {
        if (data) {
          this.despacho = data;
          this.mensaje = '';
        } else {
          this.despacho = null;
          this.mensaje = 'No se encontró un despachador con esa cédula';
        }
      },
      error: () => {
        this.mensaje = 'Error en la búsqueda';
      }
    });
  }
}
