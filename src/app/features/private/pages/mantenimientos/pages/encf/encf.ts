import { Component, OnInit } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import { map, switchMap, finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { Encf, EncfModel } from './encf-modelo';
import { ServicioEncf } from 'src/app/core/services/mantenimientos/encf/encf.service';
import { ServicioTiponcf, TiponcfData } from 'src/app/core/services/mantenimientos/tiponcf/tiponcf.service';
import { ServicioEmpresa } from 'src/app/core/services/mantenimientos/empresas/empresas.service';
import { EmpresaModelData } from 'src/app/core/services/mantenimientos/empresas';

@Component({
  selector: 'app-encf',
  templateUrl: './encf.html',
  styleUrls: ['./encf.css']
})
export class EncfComponent implements OnInit {
  encf: Encf = new EncfModel();
  listaEncf: Encf[] = [];
  editIndex: number = -1;
  page = 1;
  limit = 10;
  tiposNcf: TiponcfData[] = [];
  empresas: EmpresaModelData[] = [];
  guardando = false;
  // Filtros
  filtroCodempr: string = '';
  filtroTipo: string = '';
  filtroDescripcion: string = '';
  paginacion: { total: number; page: number; limit: number; totalPages: number } = { total: 0, page: 1, limit: this.limit, totalPages: 1 };

  constructor(
    private servicioEncf: ServicioEncf,
    private servicioTiponcf: ServicioTiponcf,
    private servicioEmpresa: ServicioEmpresa,
  ) {}

  ngOnInit(): void {
    this.cargarEncf();
    this.cargarTiposNcf();
    this.cargarEmpresas();
  }

  cargarEncf(): void {
    this.servicioEncf
      .listarEncf(this.page, this.limit, this.filtroCodempr || undefined, this.filtroDescripcion || undefined, this.filtroTipo || undefined)
      .subscribe({
        next: (resp) => {
          // El controlador obtenerEncf devuelve {status, code, message, data, pagination}
          // pero otros endpoints pueden devolver arrays simples. Adaptamos ambos casos.
          const data = Array.isArray(resp) ? resp : resp?.data;
          this.listaEncf = (data ?? []) as Encf[];
          const pag = Array.isArray(resp) ? null : resp?.pagination;
          if (pag) {
            this.paginacion = {
              total: Number(pag?.total || 0),
              page: Number(pag?.page || this.page),
              limit: Number(pag?.limit || this.limit),
              totalPages: Number(pag?.totalPages || 1)
            };
          } else {
            this.paginacion.page = this.page;
            this.paginacion.limit = this.limit;
            this.paginacion.total = this.listaEncf.length;
            this.paginacion.totalPages = Math.max(1, Math.ceil(this.paginacion.total / this.limit));
          }
        },
        error: (err) => {
          console.error('Error cargando ENCF', err);
        }
      });
  }

  cargarTiposNcf(): void {
    this.servicioTiponcf.obtenerTodos().subscribe({
      next: (resp) => {
        const data = Array.isArray(resp) ? resp : (resp as any)?.data;
        this.tiposNcf = data ?? [];
      },
      error: (err) => {
        console.error('Error cargando tipos NCF', err);
      }
    });
  }

  cargarEmpresas(): void {
    // Cargamos las empresas para el selector de empresa
    this.servicioEmpresa.buscarTodasEmpresa(1, 100).subscribe({
      next: (resp) => {
        this.empresas = resp?.data ?? [];
      },
      error: (err) => {
        console.error('Error cargando empresas', err);
      }
    });
  }

  tipoDescripcion(code?: string): string {
    if (!code) { return ''; }
    const t = this.tiposNcf.find(x => x.tipo === code);
    return t?.desNcf ?? code;
  }

  private existeDuplicado(codempr: string, tipoencf: string, currentId?: number): Observable<boolean> {
    return this.servicioEncf
      .listarEncf(1, 5, codempr, undefined, tipoencf)
      .pipe(
        map((resp: any) => {
          const data = Array.isArray(resp) ? resp : resp?.data;
          const items: Encf[] = (data ?? []) as Encf[];
          return items.some(x => x.codempr === codempr && x.tipoencf === tipoencf && (currentId ? x.id !== currentId : true));
        })
      );
  }

  aplicarFiltros(): void {
    this.page = 1;
    this.cargarEncf();
  }

  limpiarFiltros(): void {
    this.filtroCodempr = '';
    this.filtroTipo = '';
    this.filtroDescripcion = '';
    this.page = 1;
    this.cargarEncf();
  }

  cambiarPagina(page: number): void {
    if (page < 1 || page > (this.paginacion.totalPages || 1)) { return; }
    this.page = page;
    this.cargarEncf();
  }

  guardarEncf() {
    if (!this.encf.codempr || !this.encf.tipoencf || !this.encf.fechaencf) {
      Swal.fire({
        title: 'Formulario incompleto',
        text: 'Debe completar: Empresa, Tipo y Fecha.',
        icon: 'warning'
      });
      return;
    }

    const payload = {
      codempr: this.encf.codempr,
      cantencf: this.encf.cantencf,
      countencf: this.encf.countencf,
      alertaencf: this.encf.alertaencf,
      fechaencf: this.encf.fechaencf,
      hastaencf: this.encf.hastaencf,
      tipoencf: this.encf.tipoencf,
      desdeencf: this.encf.desdeencf,
    } as any;
    this.guardando = true;
    this.existeDuplicado(this.encf.codempr!, this.encf.tipoencf!, this.encf.id)
      .pipe(
        switchMap((duplicado) => {
          if (duplicado) {
            Swal.fire({
              title: 'Duplicado',
              text: 'Esta empresa ya tiene un ENCF con ese tipo.',
              icon: 'warning'
            });
            return EMPTY;
          }
          // Crear o actualizar según modo edición
          const esEdicion = this.editIndex >= 0 || !!this.encf.id;
          if (esEdicion && this.encf.id) {
            return this.servicioEncf.editarEncf(this.encf.id, payload);
          }
          return this.servicioEncf.crearEncf(payload);
        }),
        finalize(() => { this.guardando = false; })
      )
      .subscribe({
        next: () => {
          this.limpiarFormulario();
          this.cargarEncf();
          const esEdicion = this.editIndex < 0 ? false : true;
          Swal.fire({
            title: 'Excelente!',
            text: esEdicion ? 'ENCF actualizado correctamente.' : 'ENCF guardado correctamente.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
        },
        error: (err) => {
          if (err?.status === 409) {
            Swal.fire({
              title: 'Duplicado',
              text: 'La empresa ya posee este tipo ENCF.',
              icon: 'warning'
            });
          } else {
            console.error('Error al guardar ENCF', err);
            const msg = err?.error?.message || err?.message || 'Ocurrió un error al guardar el ENCF.';
            Swal.fire({ title: 'Error', text: msg, icon: 'error' });
          }
        }
      });
  }

  limpiarFormulario() {
    this.encf = new EncfModel();
    this.editIndex = -1;
  }

  editar(item: Encf) {
    const idx = this.listaEncf.findIndex(n => n === item);
    this.editIndex = idx;
    this.encf = { ...item };
  }

  eliminar(item: Encf) {
    if (!item?.id) { return; }
    Swal.fire({
      title: '¿Está seguro de eliminar este ENCF?',
      text: '¡No podrá revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.servicioEncf.eliminarEncf(item.id).subscribe({
          next: () => {
            Swal.fire({
              title: 'Excelente!',
              text: 'ENCF eliminado correctamente.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false,
            });
            this.limpiarFormulario();
            this.cargarEncf();
          },
          error: (err) => {
            const msg = err?.error?.message || err?.message || 'Error al eliminar el ENCF.';
            Swal.fire({ title: 'Error', text: msg, icon: 'error' });
          }
        });
      }
    });
  }
}