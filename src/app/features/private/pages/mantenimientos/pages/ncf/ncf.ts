// import { Component } from '@angular/core';

// @Component({
//   selector: 'ncf',
//   templateUrl: './ncf.html',
//   styleUrls: ['./ncf.css']
// })
// export class NcfComponent {

// }
// import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModuloNcf} from './ncf-modulo';
import { DatePipe } from '@angular/common';
//  import { ToastrService } from 'ngx-toastr';

// declare var bootstrap: any;

import { Component } from '@angular/core';

interface Ncf {
  empresa: string;
  tipo: string;
  secuenciaDesde: string;
  secuenciaHasta: string;
  cantidad: number;
  fechaVencimiento: string;
  alerta: number;
  estado: string;
}

@Component({
  selector: 'app-ncf',
  templateUrl: './ncf.html',
  styleUrls: ['./ncf.css']
})
export class NcfComponent {
  ncf: Ncf = this.getNuevoNcf();
  listaNcf: Ncf[] = [];

  guardarNcf() {
    if (!this.ncf.empresa || !this.ncf.tipo) {
      alert('Debe completar todos los campos obligatorios.');
      return;
    }

    const nuevo = { ...this.ncf };
    this.listaNcf.push(nuevo);
    this.limpiarFormulario();
  }

  limpiarFormulario() {
    this.ncf = this.getNuevoNcf();
  }

  editar(item: Ncf) {
    this.ncf = { ...item };
  }

  eliminar(item: Ncf) {
    if (confirm('¿Seguro que desea eliminar este registro?')) {
      this.listaNcf = this.listaNcf.filter(n => n !== item);
    }
  }

  private getNuevoNcf(): Ncf {
    return {
      empresa: '',
      tipo: '',
      secuenciaDesde: '',
      secuenciaHasta: '',
      cantidad: 0,
      fechaVencimiento: '',
      alerta: 0,
      estado: 'Activo'
    };
  }
}

