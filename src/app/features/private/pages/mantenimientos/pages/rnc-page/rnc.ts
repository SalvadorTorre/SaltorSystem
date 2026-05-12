import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModeloRncData } from 'src/app/core/services/mantenimientos/rnc';
import { ServicioRnc } from 'src/app/core/services/mantenimientos/rnc/rnc.service';
declare var $: any;
import Swal from 'sweetalert2';

@Component({
  selector: 'Rnc',
  templateUrl: './rnc.html',
  styleUrls: ['./rnc.css'],
})
export class Rnc implements OnInit {
  rncList: ModeloRncData[] = [];
  formulariornc!: FormGroup;
  tituloModalrnc: string = '';
  modoedicionRnc: boolean = false;
  selectedRncId!: number;
  filtro: string = '';
  isLoadingImport: boolean = false;

  // Pagination
  page: number = 1;
  limit: number = 20;
  totalItems: number = 0;
  limits: number[] = [10, 20, 50, 100];

  constructor(private fb: FormBuilder, private servicioRnc: ServicioRnc) {
    this.crearFormulario();
  }

  ngOnInit(): void {
    this.obtenerRnc();
  }

  crearFormulario() {
    this.formulariornc = this.fb.group({
      id: [''],
      rnc: ['', Validators.required],
      rason: ['', Validators.required],
      status: [''],
    });
  }

  obtenerRnc() {
    this.servicioRnc
      .buscarTodosRnc(this.page, this.limit, this.filtro)
      .subscribe(
        (response) => {
          if (response && response.data && response.data.data) {
            this.rncList = response.data.data;
            this.totalItems = response.data.pagination?.total || 0;
          } else {
            this.rncList = [];
            this.totalItems = 0;
          }
        },
        (error) => {
          console.error(error);
        }
      );
  }

  filtrar() {
    this.page = 1; // Reset to first page on search
    this.obtenerRnc();
  }

  limpiarFiltro() {
    this.filtro = '';
    this.filtrar();
  }

  cambiarPagina(newPage: number) {
    if (newPage >= 1 && (this.totalItems === 0 || newPage <= this.totalPages)) {
      this.page = newPage;
      this.obtenerRnc();
    }
  }

  cambiarLimite() {
    this.page = 1;
    this.obtenerRnc();
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.limit);
  }

  importarDesdeDgii() {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción borrará todos los datos existentes y los reemplazará con la nueva importación. ¿Deseas continuar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, importar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        // Show loading modal
        Swal.fire({
          title: 'Importando datos...',
          html: 'Por favor espere, esto puede tardar unos momentos.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        this.servicioRnc.importarDgii().subscribe(
          () => {
            Swal.close(); // Close loading
            this.obtenerRnc();
            Swal.fire(
              'Éxito',
              'Importación completada exitosamente',
              'success'
            );
          },
          (error) => {
            Swal.close(); // Close loading
            console.error(error);
            Swal.fire('Error', 'Hubo un error al importar los datos', 'error');
          }
        );
      }
    });
  }

  nuevo() {
    this.modoedicionRnc = false;
    this.tituloModalrnc = 'Nuevo RNC';
    this.formulariornc.reset();
    this.formulariornc.get('rnc')?.enable();
    $('#modalrnc').modal('show');
  }

  editar(rnc: ModeloRncData) {
    this.modoedicionRnc = true;
    this.tituloModalrnc = 'Editar RNC';
    this.selectedRncId = rnc.id;

    this.formulariornc.patchValue({
      id: rnc.id,
      rnc: rnc.rnc,
      rason: rnc.rason,
      status: rnc.status,
    });

    // RNC should be readonly or disabled if we only allow editing reason
    this.formulariornc.get('rnc')?.disable();

    $('#modalrnc').modal('show');
  }

  guardar() {
    if (this.formulariornc.valid) {
      const formValue = this.formulariornc.getRawValue();

      if (this.modoedicionRnc) {
        const rncData = {
          rason: formValue.rason,
        };
        this.servicioRnc.editarRnc(this.selectedRncId, rncData).subscribe(
          () => {
            Swal.fire('Éxito', 'RNC actualizado correctamente', 'success');
            $('#modalrnc').modal('hide');
            this.obtenerRnc();
          },
          (error) => {
            Swal.fire('Error', 'No se pudo actualizar el RNC', 'error');
          }
        );
      } else {
        const rncData: any = {
          rnc: formValue.rnc,
          rason: formValue.rason,
          status: 'ACTIVO', // Default status for new records
        };
        this.servicioRnc.guardaRnc(rncData).subscribe(
          () => {
            Swal.fire('Éxito', 'RNC creado correctamente', 'success');
            $('#modalrnc').modal('hide');
            this.obtenerRnc();
          },
          (error) => {
            Swal.fire('Error', 'No se pudo crear el RNC', 'error');
          }
        );
      }
    }
  }

  cerrarModal() {
    $('#modalrnc').modal('hide');
    this.formulariornc.reset();
  }
}
