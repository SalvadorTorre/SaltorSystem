
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServicioRecibo, ReciboData } from 'src/app/core/services/caja/recibo/recibo.service';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';
import { ModeloFpagoData } from 'src/app/core/services/mantenimientos/fpago';
import Swal from 'sweetalert2';

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
    private fpagoService: ServicioFpago
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
    if (this.reciboForm.invalid) {
      this.reciboForm.markAllAsTouched();
      return;
    }

    const data: ReciboData = this.reciboForm.value;
    
    // Asegurar que cantidad es número
    data.cantidad = Number(data.cantidad);
    data.fpago = Number(data.fpago);

    this.reciboService.crearRecibo(data).subscribe({
      next: (res) => {
        Swal.fire('Éxito', 'Recibo guardado correctamente', 'success');
        this.limpiarFormulario();
        this.cargarRecibos();
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
}
