import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModeloRncData } from 'src/app/core/services/mantenimientos/rnc';
import {
  ImportTaskState,
  ServicioRnc,
} from 'src/app/core/services/mantenimientos/rnc/rnc.service';
import { firstValueFrom } from 'rxjs';
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
  importState: ImportTaskState | null = null;
  private lastHandledFinishedAt: number | null = null;

  // Pagination
  page: number = 1;
  limit: number = 20;
  totalItems: number = 0;
  limits: number[] = [10, 20, 50, 100];

  constructor(private fb: FormBuilder, private servicioRnc: ServicioRnc) {
    this.crearFormulario();
  }

  ngOnInit(): void {
    this.servicioRnc.importState$.subscribe((state) => {
      this.importState = state;
      this.isLoadingImport = state.running;
      this.gestionarNotificacionFinal(state);
    });
    this.servicioRnc.sincronizarImportacionServidorActiva();
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

  private gestionarNotificacionFinal(state: ImportTaskState): void {
    if (state.running || !state.finishedAt || state.success === null) return;
    if (this.lastHandledFinishedAt === state.finishedAt) return;
    this.lastHandledFinishedAt = state.finishedAt;

    if (state.success) {
      this.page = 1;
      this.obtenerRnc();
      Swal.fire({
        icon: 'success',
        title: 'Importación completada',
        text: `Insertados: ${state.inserted.toLocaleString()} | Errores: ${state.errors.toLocaleString()}`,
        toast: true,
        position: 'top-end',
        timer: 5000,
        showConfirmButton: false,
      });
      return;
    }

    const msg = String(state.message || '');
    const isDownloadIssue =
      msg.toLowerCase().includes('cors') ||
      msg.toLowerCase().includes('failed to fetch') ||
      msg.toLowerCase().includes('no se pudo descargar');

    if (isDownloadIssue) {
      Swal.fire({
        icon: 'warning',
        title: 'No se pudo descargar automáticamente',
        text: msg,
        showCancelButton: true,
        confirmButtonText: 'Cargar ZIP manual',
        cancelButtonText: 'Cerrar',
      }).then(async (result) => {
        if (result.isConfirmed) {
          await this.intentarImportacionManual();
        }
      });
      return;
    }

    Swal.fire('Error', msg || 'Hubo un error al importar los datos', 'error');
  }

  get descripcionImportacion(): string {
    const state = this.importState;
    if (!state || !state.running) return '';
    const phaseMap: Record<string, string> = {
      descargando: 'Descargando ZIP de DGII',
      descomprimiendo: 'Descomprimiendo archivo',
      parseando: 'Leyendo y validando registros',
      limpiando: 'Vaciando tabla de RNC',
      insertando: 'Insertando registros',
      completado: 'Completado',
    };
    const phaseLabel = phaseMap[state.phase] || 'Procesando';
    const pct =
      state.total > 0
        ? `${((state.processed / state.total) * 100).toFixed(1)}%`
        : '...';
    return `${phaseLabel} · ${pct} · ${state.processed.toLocaleString()} / ${state.total.toLocaleString()}`;
  }

  private async solicitarArchivoZip(): Promise<File | null> {
    return await new Promise<File | null>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.zip,application/zip,application/x-zip-compressed';
      input.onchange = () => {
        resolve(input.files?.[0] || null);
      };
      input.click();
    });
  }

  private async intentarImportacionManual(): Promise<void> {
    const respuesta = await Swal.fire({
      icon: 'info',
      title: 'Descarga directa bloqueada',
      text: 'El navegador bloqueó la lectura del ZIP por CORS. Selecciona el archivo RNC_CONTRIBUYENTES.zip para continuar.',
      showCancelButton: true,
      confirmButtonText: 'Seleccionar ZIP',
      cancelButtonText: 'Cancelar',
    });

    if (!respuesta.isConfirmed) return;

    const file = await this.solicitarArchivoZip();
    if (!file) {
      Swal.fire('Cancelado', 'No se seleccionó ningún archivo ZIP.', 'info');
      return;
    }

    try {
      this.isLoadingImport = true;
      const response = await firstValueFrom(
        this.servicioRnc.importarDgiiDesdeArchivo(file)
      );
      this.isLoadingImport = false;
      const resumen = response?.data || {};
      this.page = 1;
      this.obtenerRnc();
      Swal.fire(
        'Éxito',
        `Importación completada.\nInsertados: ${Number(
          resumen.insertados || 0
        ).toLocaleString()}\nErrores: ${Number(
          resumen.errores || 0
        ).toLocaleString()}`,
        'success'
      );
    } catch (error: any) {
      this.isLoadingImport = false;
      Swal.fire(
        'Error',
        error?.message || 'No se pudo importar el archivo ZIP seleccionado.',
        'error'
      );
    }
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
        (async () => {
          try {
            this.servicioRnc.solicitarPermisoNotificaciones();
            const started = await this.servicioRnc.iniciarImportacionDgiiEnSegundoPlano();
            if (!started) {
              Swal.fire(
                'Importación en curso',
                'Ya hay una importación de RNC ejecutándose en servidor.',
                'info'
              );
              return;
            }
            Swal.fire({
              icon: 'info',
              title: 'Importación iniciada',
              text: 'La importación se está ejecutando en servidor. Te notificaremos al finalizar.',
              toast: true,
              position: 'top-end',
              timer: 4000,
              showConfirmButton: false,
            });
          } catch (error: any) {
            Swal.fire(
              'Error',
              error?.message || 'No se pudo iniciar la importación en servidor.',
              'error'
            );
          }
        })();
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

  claseEstado(status: string | null): string {
    const s = String(status || '').toUpperCase();
    if (!s) return 'badge rounded-pill text-bg-secondary';
    if (s.includes('ACT')) return 'badge rounded-pill text-bg-success';
    if (s.includes('SUSP') || s.includes('INHAB')) {
      return 'badge rounded-pill text-bg-warning';
    }
    return 'badge rounded-pill text-bg-secondary';
  }
}
