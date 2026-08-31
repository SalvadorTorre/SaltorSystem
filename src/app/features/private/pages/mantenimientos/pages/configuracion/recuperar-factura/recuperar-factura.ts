import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import {
  FacturaRecuperacionPayload,
  RecuperarFacturaService,
} from 'src/app/core/services/mantenimientos/recuperar-factura/recuperar-factura.service';

@Component({
  selector: 'app-recuperar-factura',
  templateUrl: './recuperar-factura.html',
  styleUrls: ['./recuperar-factura.css'],
})
export class RecuperarFacturaPage implements OnInit {
  @ViewChild('numeroInput') numeroInput?: ElementRef<HTMLInputElement>;

  factura = this.nuevaFactura();
  guardando = false;

  constructor(private readonly recuperarSrv: RecuperarFacturaService) {}

  ngOnInit(): void {
    setTimeout(() => this.numeroInput?.nativeElement.focus());
  }

  async guardar(form: NgForm): Promise<void> {
    const numero = String(this.factura.numero || '').trim();
    const empresa = this.empresaActual();
    const sucursal = this.sucursalActual();

    if (!form.valid || !numero) {
      await Swal.fire('Datos incompletos', 'Digite el número de factura.', 'warning');
      return;
    }
    if (!empresa || !sucursal) {
      await Swal.fire('Sesión incompleta', 'No se encontró la empresa o sucursal del usuario conectado.', 'error');
      return;
    }

    this.guardando = true;
    try {
      const payload: FacturaRecuperacionPayload = {
        fa_codfact: numero,
        fa_fpago: 'S',
        fa_status: 'U',
        fa_impresa: 'S',
        fa_tiponcf: 32,
        fa_codempr: empresa,
        fa_codsucu: sucursal,
      };

      await firstValueFrom(this.recuperarSrv.guardar(payload));
      await Swal.fire('Factura recuperada', `La factura ${numero} fue agregada correctamente.`, 'success');
      this.limpiar(form);
    } catch (error: any) {
      await Swal.fire('Error', this.mensajeError(error), 'error');
    } finally {
      this.guardando = false;
    }
  }

  limpiar(form?: NgForm): void {
    this.factura = this.nuevaFactura();
    form?.resetForm({ ...this.factura });
    setTimeout(() => this.numeroInput?.nativeElement.focus());
  }

  private nuevaFactura() {
    return {
      numero: '',
    };
  }

  private empresaActual(): string {
    let empresa: any = null;
    try {
      empresa = JSON.parse(localStorage.getItem('empresa') || 'null');
    } catch {
      empresa = null;
    }
    return String(
      localStorage.getItem('codigoempresa') ||
      localStorage.getItem('cod_empre') ||
      empresa?.cod_empre ||
      '',
    ).trim();
  }

  sucursalActual(): number {
    const value = Number(localStorage.getItem('idSucursal') || 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  private mensajeError(error: any): string {
    if (String(error?.code || '') === '23505') return 'El número de factura ya existe.';
    return String(error?.message || error?.details || 'No se pudo recuperar la factura.');
  }
}
