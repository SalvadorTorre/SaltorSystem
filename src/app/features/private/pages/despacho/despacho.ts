import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModeloDespachadorData } from 'src/app/core/services/mantenimientos/despachadores';
import { ServicioDespachador } from 'src/app/core/services/mantenimientos/despachadores/despachador.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { interfaceDetalleModel } from 'src/app/core/services/facturacion/factura/factura';
import { Despachadores } from 'src/app/core/services/mantenimientos/despachadores/despachadores';

@Component({
  selector: 'Despacho',
  templateUrl: './despacho.html',
  styleUrls: ['./despacho.css']
})

export class Despacho {
  form = this.fb.group({
    despachadorCodigo: ['', Validators.required],
    despachadorNombre: [{ value: '', disabled: true }],
    numeroFactura: ['', Validators.required],
    fa_envio: [''],
    fa_fpago: ['']
  });

  despachador?: Despachadores[] = [];
  factura: interfaceDetalleModel[] = [];
  errorMsg = '';
  loading = { desp: false, fac: false };

  @ViewChild('numeroFacturaInput') numeroFacturaInput!: ElementRef<HTMLInputElement>;
  @ViewChild('facturaRef') facturaRef!: ElementRef<HTMLElement>;

  constructor(
    private fb: FormBuilder,
    private servicioDespachador: ServicioDespachador,
    private servicioFactuacion: ServicioFacturacion
  ) { }

  buscarDespachador(): void {
    this.errorMsg = '';
    const codigo = (this.form.get('despachadorCodigo')!.value || '').toString().trim();
    if (!codigo) { this.errorMsg = 'Digite el código de despachador.'; return; }

    this.loading.desp = true;
    this.servicioDespachador.getByCodigo(codigo).subscribe((res) => {
      this.despachador = res;
      this.form.patchValue({ despachadorNombre: res.nomDesp });
      this.loading.desp = false;
      // pasar foco al campo de factura
      setTimeout(() => this.numeroFacturaInput?.nativeElement.focus(), 0);
    });
  }

  buscarFactura(): void {
    this.errorMsg = '';
    const numero = (this.form.get('numeroFactura')!.value || '').toString().trim();
    if (!numero) { this.errorMsg = 'Digite el número de factura.'; return; }

    this.loading.fac = true;
    this.servicioFactuacion.getByNumero(numero).subscribe((res) => {
      this.factura = res;
      this.loading.fac = false;
    });
  }

  generarFactura(): void {
    if (!this.factura) { this.errorMsg = 'Primero busque la factura.'; return; }

    // --- Generar PDF a partir de un div (usa tus libs ya instaladas) ---
    const original = this.facturaRef.nativeElement;
    const clone = original.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.top = '0';
    clone.style.left = '-9999px';
    clone.style.display = 'block';
    document.body.appendChild(clone);

    // @ts-ignore (asume html2canvas y jsPDF están disponibles)
    setTimeout(() => {
      html2canvas(clone).then((canvas: HTMLCanvasElement) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${this.factura[0].fa_codFact}.pdf`);
        document.body.removeChild(clone);

        // (Opcional) Marcar como impresa
        const fa_envio = this.form.get('fa_envio')!.value || '';
        const fa_fpago = this.form.get('fa_fpago')!.value || '';
        const codFact = this.factura[0].fa_codFact ?? '';
        this.servicioFactuacion.marcarImpresa(codFact, { fa_envio, fa_fpago })
          .subscribe({ next: () => console.log('Factura marcada como impresa') });
      });
    }, 50);
  }
}
