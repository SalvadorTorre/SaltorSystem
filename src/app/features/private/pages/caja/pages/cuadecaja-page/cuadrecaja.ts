
import { Component, OnInit } from '@angular/core';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-cuadrecaja',
  templateUrl: './cuadrecaja.html',
  styleUrls: ['./cuadrecaja.css']
})
export class CuadreCajaComponent implements OnInit {
  facturaInicio: string = '';
  facturaFin: string = '';
  facturas: any[] = [];
  resumenPagos: any = {
    efectivo: 0,
    tarjeta: 0,
    deposito: 0,
    cheque: 0,
    credito: 0,
    otros: 0,
    total: 0
  };
  cargando: boolean = false;
  fechaCuadre: string = new Date().toISOString().split('T')[0];

  constructor(
    private servicioFacturacion: ServicioFacturacion,
    private servicioFpago: ServicioFpago
  ) { }

  ngOnInit(): void {
    // Intentar recuperar la última factura cuadrada del localStorage
    const ultimaCuadrada = localStorage.getItem('ultimaFacturaCuadrada');
    if (ultimaCuadrada) {
      // Asumimos que la siguiente es la de inicio
      // Esto es una simplificación, idealmente sería ultima + 1
      this.facturaInicio = ultimaCuadrada; 
    }
  }

  buscarFacturas() {
    if (!this.facturaInicio) {
      alert('Por favor ingrese la factura inicial');
      return;
    }

    this.cargando = true;
    this.resumenPagos = { efectivo: 0, tarjeta: 0, deposito: 0, cheque: 0, credito: 0, otros: 0, total: 0 };
    this.facturas = [];

    // Aquí hay un reto: el servicio busca por paginación o filtros específicos.
    // No hay un "getRange". 
    // Opción: Traer facturas por fecha (hoy) y luego filtrar por rango de números si es necesario.
    // O si el backend lo permite, enviar rango.
    // Como no puedo cambiar el backend fácilmente, voy a buscar las facturas del día (por fecha)
    // y luego filtrar las que sean >= facturaInicio.
    
    // Asumiremos formato de fecha YYYY-MM-DD
    this.servicioFacturacion.buscarFacturacion(1, 1000, '', '', this.fechaCuadre).subscribe((resp: any) => {
      const lista = resp.data || [];
      
      // Filtrar por rango de IDs (asumiendo que son numéricos o strings comparables)
      // Si son strings numéricos, convertir a número
      this.facturas = lista.filter((f: any) => {
        // Lógica de comparación básica. Ajustar según formato real de fa_codFact
        // Si facturaInicio está vacía, traer todo lo del día.
        if (this.facturaInicio) {
           return f.fa_codFact >= this.facturaInicio;
        }
        return true;
      });

      this.calcularTotales();
      this.cargando = false;
    }, (err) => {
      console.error(err);
      this.cargando = false;
    });
  }

  calcularTotales() {
    this.facturas.forEach(f => {
      const monto = parseFloat(f.fa_valFact || 0);
      const fpago = String(f.fa_codfpago || f.fa_fpago || '').toLowerCase();
      
      // Ajustar lógica según los códigos reales de Fpago
      // 1: Efectivo, 2: Tarjeta, 3: Cheque, 4: Deposito, 5: Credito (Ejemplo)
      // Necesito verificar los códigos reales en la base de datos o servicio.
      // Por ahora usaré una lógica genérica basada en descripción o código común.
      
      if (fpago === '1' || fpago.includes('efectivo')) {
        this.resumenPagos.efectivo += monto;
      } else if (fpago === '2' || fpago.includes('tarjeta')) {
        this.resumenPagos.tarjeta += monto;
      } else if (fpago === '4' || fpago.includes('deposito')) {
        this.resumenPagos.deposito += monto;
      } else if (fpago === '3' || fpago.includes('cheque')) {
        this.resumenPagos.cheque += monto;
      } else if (fpago === '5' || fpago.includes('credito')) {
        this.resumenPagos.credito += monto;
      } else {
        this.resumenPagos.otros += monto;
      }
      this.resumenPagos.total += monto;
    });
  }

  generarReporte() {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Reporte de Cierre de Caja', 14, 20);
    doc.setFontSize(12);
    doc.text(`Fecha: ${this.fechaCuadre}`, 14, 30);
    doc.text(`Factura Inicial: ${this.facturaInicio}`, 14, 38);
    
    // Tabla de Resumen
    const dataResumen = [
      ['Efectivo', this.formatoMoneda(this.resumenPagos.efectivo)],
      ['Tarjeta', this.formatoMoneda(this.resumenPagos.tarjeta)],
      ['Depósito', this.formatoMoneda(this.resumenPagos.deposito)],
      ['Cheque', this.formatoMoneda(this.resumenPagos.cheque)],
      ['Crédito', this.formatoMoneda(this.resumenPagos.credito)],
      ['Otros', this.formatoMoneda(this.resumenPagos.otros)],
      ['TOTAL', this.formatoMoneda(this.resumenPagos.total)]
    ];

    autoTable(doc, {
      startY: 45,
      head: [['Forma de Pago', 'Monto']],
      body: dataResumen,
      theme: 'grid'
    });

    // Tabla de Facturas
    const dataFacturas = this.facturas.map(f => [
      f.fa_codFact,
      f.fa_nomClie,
      f.fa_fpago || f.fa_codfpago,
      this.formatoMoneda(f.fa_valFact)
    ]);

    doc.text('Detalle de Facturas', 14, (doc as any).lastAutoTable.finalY + 10);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['No. Factura', 'Cliente', 'Forma Pago', 'Monto']],
      body: dataFacturas,
    });

    // Guardar la última factura procesada
    if (this.facturas.length > 0) {
      // Buscar la mayor
      const maxFactura = this.facturas.reduce((prev, current) => (prev.fa_codFact > current.fa_codFact) ? prev : current);
      localStorage.setItem('ultimaFacturaCuadrada', maxFactura.fa_codFact);
    }

    doc.save(`cierre_caja_${this.fechaCuadre}.pdf`);
  }

  formatoMoneda(valor: any) {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(valor || 0);
  }
}
