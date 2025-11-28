import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

interface Movimiento {
  fecha: string;
  producto: string;
  tipo: string;
  cantidad: number;
}

@Component({
  selector: 'app-movimiento-producto',
  templateUrl: './movproducto.html',
  styleUrls: ['./movproducto.css']
})
export class MovimientoProducto {
  title = 'Movimientos de Productos';
  filtroForm: FormGroup;
  movimientos: Movimiento[] = [];
  resultados: Movimiento[] = [];

  constructor(private fb: FormBuilder) {
    // inicializa el formulario
    this.filtroForm = this.fb.group({
      fecha: [''],
      producto: [''],
      tipo: ['']
    });

    // datos de ejemplo
    this.movimientos = [
      { fecha: '2025-09-18', producto: 'Producto A', tipo: 'Entrada', cantidad: 100 },
      { fecha: '2025-09-18', producto: 'Producto B', tipo: 'Salida', cantidad: 20 },
      { fecha: '2025-09-17', producto: 'Producto A', tipo: 'Salida', cantidad: 15 },
      { fecha: '2025-09-16', producto: 'Producto C', tipo: 'Entrada', cantidad: 50 }
    ];

    this.resultados = [...this.movimientos];
  }

  filtrar() {
    const { fecha, producto, tipo } = this.filtroForm.value;

    this.resultados = this.movimientos.filter(mov => {
      const coincideFecha = fecha ? mov.fecha === fecha : true;
      const coincideProducto = producto ? mov.producto.toLowerCase().includes(producto.toLowerCase()) : true;
      const coincideTipo = tipo ? mov.tipo === tipo : true;

      return coincideFecha && coincideProducto && coincideTipo;
    });
  }

  limpiar() {
    this.filtroForm.reset();
    this.resultados = [...this.movimientos];
  }
}
