import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServicioRecibo, ReciboData } from 'src/app/core/services/caja/recibo/recibo.service';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';
import { ModeloFpagoData } from 'src/app/core/services/mantenimientos/fpago';
import Swal from 'sweetalert2';
import { PrintingService } from 'src/app/core/services/utils/printing.service';
import { ElementRef } from '@angular/core';

@Component({
  selector: 'app-recibo-ingreso',
  templateUrl: './reciboingreso.html',
  styleUrls: ['./reciboingreso.css']
})
export class ReciboIngresoComponent implements OnInit {
  reciboForm: FormGroup;
  listaRecibos: ReciboData[] = [];
  listaFpago: ModeloFpagoData[] = [];

  constructor(
    private fb: FormBuilder,
    private reciboService: ServicioRecibo,
    private fpagoService: ServicioFpago,
    private printing: PrintingService
  ) {
    this.reciboForm = this.fb.group({
      fecha: [new Date().toISOString().split('T')[0], Validators.required],
      cantidad: [null, [Validators.required, Validators.min(0.01)]],
      nombre: ['', Validators.required],
      concepto: ['', Validators.required],
      fpago: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarFormasPago();
    this.cargarRecibos();
  }

  cargarFormasPago() {
    this.fpagoService.obtenerTodosFpago().subscribe({
      next: (res: any) => {
        // Ajustar según la estructura de respuesta de fpagoService
        this.listaFpago = res.data || res;
      },
      error: (err) => console.error('Error cargando formas de pago', err)
    });
  }

  cargarRecibos() {
    this.reciboService.obtenerRecibos().subscribe({
      next: (res) => {
        // Asegurar que sea array
        const data = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        this.listaRecibos = data as ReciboData[];
        // Ordenar por ID descendente si es posible
        this.listaRecibos.sort((a, b) => (b.id || 0) - (a.id || 0));
      },
      error: (err) => {
        console.error('Error cargando recibos', err);
        Swal.fire('Error', 'No se pudieron cargar los recibos', 'error');
      }
    });
  }

  guardarRecibo() {
    const v = this.reciboForm.getRawValue();
    const cantidadNum = Number(v.cantidad);
    if (!v.nombre || String(v.nombre).trim() === '') {
      Swal.fire('Validación', 'El nombre del cliente es obligatorio', 'warning');
      const el = document.getElementById('nombre') as HTMLInputElement | null;
      el?.focus();
      return;
    }
    if (!v.concepto || String(v.concepto).trim() === '') {
      Swal.fire('Validación', 'El concepto es obligatorio', 'warning');
      const el = document.getElementById('concepto') as HTMLTextAreaElement | null;
      el?.focus();
      return;
    }
    if (v.fpago === null || v.fpago === undefined || v.fpago === '') {
      Swal.fire('Validación', 'Debe seleccionar la forma de pago', 'warning');
      const el = document.getElementById('fpago') as HTMLSelectElement | null;
      el?.focus();
      return;
    }
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      Swal.fire('Validación', 'La cantidad debe ser mayor que 0', 'warning');
      const el = document.getElementById('cantidad') as HTMLInputElement | null;
      el?.focus();
      return;
    }

    const data: ReciboData = {
      ...this.reciboForm.value,
      cantidad: cantidadNum,
      nombre: String(v.nombre).toUpperCase(),
      concepto: String(v.concepto).toUpperCase()
    };
    
    // Asegurar que cantidad es número
    data.fpago = Number(data.fpago);

    this.reciboService.crearRecibo(data).subscribe({
      next: (res) => {
        const saved: ReciboData = Array.isArray((res as any)?.data)
          ? (res as any).data[0]
          : ((res as any)?.data || data);
        Swal.fire({
          title: 'Éxito',
          text: 'Recibo guardado. ¿Desea imprimirlo ahora?',
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Sí, Imprimir',
          cancelButtonText: 'No'
        }).then((r) => {
          if (r.isConfirmed) {
            this.imprimirRecibo(saved);
          }
          this.limpiarFormulario();
          this.cargarRecibos();
        });
      },
      error: (err) => {
        console.error('Error guardando recibo', err);
        Swal.fire('Error', 'Hubo un problema al guardar el recibo', 'error');
      }
    });
  }

  eliminarRecibo(id: number) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "No podrás revertir esto",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminarlo'
    }).then((result) => {
      if (result.isConfirmed) {
        this.reciboService.eliminarRecibo(id).subscribe({
          next: () => {
            Swal.fire('Eliminado!', 'El recibo ha sido eliminado.', 'success');
            this.cargarRecibos();
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', 'No se pudo eliminar el recibo', 'error');
          }
        });
      }
    });
  }

  limpiarFormulario() {
    this.reciboForm.reset({
      fecha: new Date().toISOString().split('T')[0],
      cantidad: null,
      nombre: '',
      concepto: '',
      fpago: null
    });
  }

  getNombreFpago(id: number): string {
    const fp = this.listaFpago.find(f => f.fp_codfpago === id);
    return fp ? fp.fp_descfpago : 'Desconocido';
  }

  imprimirRecibo(recibo: ReciboData): void {
    try {
      const fpName = this.getNombreFpago(Number(recibo.fpago));
      this.printing.imprimirReciboIngreso80mm(recibo, fpName);
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudo imprimir el recibo', 'error');
    }
  }

  toUpperInput(event: Event, controlName: keyof ReciboData): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!input) return;
    const upper = (input.value || '').toUpperCase();
    if (upper !== input.value) {
      input.value = upper;
    }
    const ctrl = this.reciboForm.get(String(controlName));
    if (ctrl && ctrl.value !== upper) {
      ctrl.patchValue(upper, { emitEvent: false });
    }
  }

  actualizar(): void {
    this.limpiarFormulario();
    this.cargarRecibos();
    setTimeout(() => {
      const el = document.getElementById('nombre') as HTMLInputElement | null;
      el?.focus();
      if (el && el.select) {
        try { el.select(); } catch {}
      }
    }, 0);
  }

  onEnterFocusNext(event: Event): void {
    event.preventDefault();
    const el = event.target as HTMLElement;
    if (!el) return;
    const form = el.closest('form');
    if (!form) return;
    const focusables = Array.from(form.querySelectorAll<HTMLElement>('input, select, textarea'))
      .filter(e =>
        !e.hasAttribute('disabled') &&
        (e as HTMLInputElement).type !== 'hidden' &&
        e.tabIndex !== -1
      );
    const idx = focusables.indexOf(el);
    const next = focusables[idx + 1];
    if (next) {
      next.focus();
      if ((next as HTMLInputElement).select) {
        try { (next as HTMLInputElement).select(); } catch {}
      }
    }
  }
}
