import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';
import { ModeloFpagoData } from 'src/app/core/services/mantenimientos/fpago';
import Swal from 'sweetalert2';

@Component({
  selector: 'fpago',
  templateUrl: './fpago.html',
  styleUrls: ['./fpago.css']
})
export class Fpago implements OnInit {
  formulario!: FormGroup;
  lista: ModeloFpagoData[] = [];
  habilitarFormulario: boolean = false;
  modoEdicion: boolean = false;
  tituloModal: string = 'Nueva Forma de Pago';
  currentPage = 1;
  pageSize = 20;
  loading = false;
  filtroDesc = '';

  constructor(private fb: FormBuilder, private servicioFpago: ServicioFpago) {}

  ngOnInit(): void {
    this.formulario = this.fb.group({
      fp_codfpago: [null],
      fp_descfpago: ['', [Validators.required, Validators.minLength(2)]],
    });
    // Código autoincrementable: mantener deshabilitado en el formulario
    this.formulario.get('fp_codfpago')?.disable();
    this.cargarLista(this.currentPage);
  }

  cargarLista(page: number) {
    this.loading = true;
    const filtro = this.filtroDesc?.trim();
    this.servicioFpago.buscarTodosFpago(page, this.pageSize, filtro ? filtro : undefined).subscribe({
      next: (resp) => {
        this.lista = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar formas de pago.' });
      }
    });
  }

  buscar() {
    this.currentPage = 1;
    this.cargarLista(this.currentPage);
  }

  limpiarBusqueda() {
    this.filtroDesc = '';
    this.buscar();
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
      this.cargarLista(this.currentPage);
    }
  }

  nextPage() {
    if (this.lista.length === this.pageSize) {
      this.currentPage += 1;
      this.cargarLista(this.currentPage);
    }
  }

  nuevo() {
    this.formulario.reset({ fp_codfpago: null, fp_descfpago: '' });
    this.modoEdicion = false;
    this.habilitarFormulario = true;
    this.tituloModal = 'Nueva Forma de Pago';
  }

  editar(item: ModeloFpagoData) {
    this.formulario.reset(item);
    this.modoEdicion = true;
    this.habilitarFormulario = true;
    this.tituloModal = 'Editar Forma de Pago';
  }

  cancelar() {
    this.habilitarFormulario = false;
    this.formulario.reset({ fp_codfpago: null, fp_descfpago: '' });
  }

  guardar() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const payload = this.formulario.getRawValue();
    const desc = (payload.fp_descfpago || '').trim();

    if (!this.modoEdicion) {
      this.servicioFpago.guardarFpago({ fp_descfpago: desc }).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Guardado', text: 'Forma de pago creada.' });
          this.habilitarFormulario = false;
          this.cargarLista(this.currentPage);
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar.' })
      });
    } else {
      this.servicioFpago.editarFpago(payload.fp_codfpago, { fp_descfpago: desc }).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Forma de pago actualizada.' });
          this.habilitarFormulario = false;
          this.cargarLista(this.currentPage);
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar.' })
      });
    }
  }

  eliminar(item: ModeloFpagoData) {
    Swal.fire({
      icon: 'warning',
      title: 'Eliminar',
      text: `¿Eliminar "${item.fp_descfpago}"?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.servicioFpago.eliminarfpago(item.fp_codfpago).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Eliminado', text: 'Forma de pago eliminada.' });
            this.cargarLista(this.currentPage);
          },
          error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar.' })
        });
      }
    });
  }
}
