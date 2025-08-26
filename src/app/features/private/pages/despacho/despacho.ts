import { Despacho } from './../../../../core/services/despacho/despacho.model';
import { Component } from '@angular/core';
import { DespachoService } from './../../../../core/services/despacho/despacho.service';
import { NgForm } from '@angular/forms';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'despacho',
  templateUrl: './despacho.html',
  styleUrls: ['./despacho.css']

})
export class DespachoComponent {
  cedula: string = '';
  despacho: Despacho | null = null;
  mensaje: string = '';

  constructor(private despachoService: DespachoService) { }

  buscarDespachador() {
    if (this.cedula.trim() === '') {
      alert('Debe ingresar una cédula');
      return;
    }
    console.log('Buscando despachador con cédula:', this.cedula);

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


  buscarFactura() {
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
