import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'Despacho',
  templateUrl: './despacho.html',
  styleUrls: ['./despacho.css']
})
export class Despacho {
formularioDespacho!: FormGroup;

}
//  imprimirFactura() {
//   // Implementación de la lógica para imprimir la factura
//   console.log('Imprimiendo factura...');
//   }