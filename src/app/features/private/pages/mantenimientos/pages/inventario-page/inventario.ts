import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { ModeloGrupoMercanciasData } from 'src/app/core/services/mantenimientos/grupomerc';
import { ServicioGrupoMercancias } from 'src/app/core/services/mantenimientos/grupomerc/grupomerc.service';
import { ModeloInventarioData } from 'src/app/core/services/mantenimientos/inventario';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
declare var $: any;
import Swal from 'sweetalert2';


@Component({
  selector: 'Inventario',
  templateUrl: './inventario.html',
  styleUrls: ['./inventario.css']
})
export class Inventario implements OnInit {
  habilitarBusqueda: boolean = false;
  tituloModalProducto!: string;
  formularioInventario!: FormGroup;
  invenarioList: ModeloInventarioData[] = [];
  grupomercList: ModeloGrupoMercanciasData[] = [];
  maxChars: number = 30;
  remainingChars: number = this.maxChars;

  totalItems = 0;
  pageSize = 8;
  currentPage = 1;
  maxPagesToShow = 5;

  codigo: string = '';
  descripcion: string = '';
  codigoInput: string = '';
  modoEdicionProducto = false;
  modoConsultaProducto = false;
  productoEditId: number | null = null;

  private codigoSubject = new BehaviorSubject<string>('');
  private descripcionSubject = new BehaviorSubject<string>('');

  constructor(private fb: FormBuilder, private servicioInventario: ServicioInventario, private servicioGrupmerc: ServicioGrupoMercancias) {
    this.crearFormularioInventario();
    this.codigoSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(codigo => {
        this.codigo = codigo;
        return this.servicioInventario.obtenerTodosInventario(this.currentPage, this.pageSize, this.codigo, this.descripcion);
      })
    ).subscribe(response => {
      this.invenarioList = response?.data || [];
      this.totalItems = Number(response?.pagination?.total ?? this.invenarioList.length);
      this.currentPage = Number(response?.pagination?.page ?? this.currentPage);
    });

    this.descripcionSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(descripcion => {
        console.log('descripcion', descripcion);
        this.descripcion = descripcion;
        return this.servicioInventario.obtenerTodosInventario(this.currentPage, this.pageSize, this.codigo, this.descripcion);
      })
    ).subscribe(response => {
      this.invenarioList = response?.data || [];
      this.totalItems = Number(response?.pagination?.total ?? this.invenarioList.length);
      this.currentPage = Number(response?.pagination?.page ?? this.currentPage);
    });
  }

  ngOnInit(): void {
    this.obtenerTodosInventario(1);
    this.obtenerTodosGrupoMercancias();
    this.formularioInventario.get('in_desmerc')!.valueChanges.subscribe(value => {
      this.updateCharCount();
    });
  }

  onCodigoInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.codigoSubject.next(inputElement.value.toUpperCase());
  }

  clearInput(): void {
    this.codigoInput = '';
  }

  onDescripcionInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.descripcionSubject.next(inputElement.value.toUpperCase());
  }

  updateCharCount() {
    const currentLength = String(this.formularioInventario.get('in_desmerc')?.value || '').length;
    this.remainingChars = this.maxChars - currentLength;
  }


  crearFormularioInventario() {
    this.formularioInventario = this.fb.group({
      id: [null],
      in_codmerc: [""],
      in_desmerc: [""],
      in_grumerc: [""],
      in_tipoproduct: [""],
      in_canmerc: [""],
      in_caninve: [""],
      in_fecinve: [""],
      in_eximini: [""],
      in_cosmerc: [""],
      in_premerc: [""],
      in_precmin: [""],
      in_costpro: [""],
      in_ucosto: [""],
      in_porgana: [""],
      in_peso: [""],
      in_longitud: [""],
      in_unidad: [""],
      in_medida: [""],
      in_fecmodif: [""],
      in_amacen: [""],
      in_imagen: [""],
      in_status: [""],
      in_minvent: [""],
    });
  }

  habilitarBuscador() {
    this.habilitarBusqueda = false;
  }

  nuevoProducto() {
    this.tituloModalProducto = 'Agregar Producto';
    this.modoEdicionProducto = false;
    this.modoConsultaProducto = false;
    this.productoEditId = null;
    this.formularioInventario.enable();
    this.formularioInventario.reset({
      id: null,
      in_status: 'A',
      in_tipoproduct: 'H'
    });
    this.updateCharCount();
    $('#modalProducto').modal('show');
  }

  editarProducto(invetario: ModeloInventarioData) {
    this.tituloModalProducto = 'Editar Producto';
    this.modoEdicionProducto = true;
    this.modoConsultaProducto = false;
    this.formularioInventario.enable();
    this.productoEditId = Number((invetario as any)?.id || 0) || null;
    this.formularioInventario.patchValue(invetario);
    this.updateCharCount();
    $('#modalProducto').modal('show');
  }

  consultarProducto(Inventario: ModeloInventarioData) {
    this.tituloModalProducto = 'Consulta Inventario';
    this.modoEdicionProducto = false;
    this.modoConsultaProducto = true;
    this.productoEditId = Number((Inventario as any)?.id || 0) || null;
    this.formularioInventario.patchValue(Inventario);
    this.formularioInventario.disable();
    this.updateCharCount();
    $('#modalProducto').modal('show');
  };

  cerrarModalProducto(): void {
    this.formularioInventario.reset({
      id: null,
      in_status: 'A',
      in_tipoproduct: 'H'
    });
    this.formularioInventario.enable();
    this.modoEdicionProducto = false;
    this.modoConsultaProducto = false;
    this.productoEditId = null;
    this.updateCharCount();
    $('#modalProducto').modal('hide');
  }

  onSubmitInventario() {
    if (this.modoConsultaProducto) {
      return;
    }

    if (this.formularioInventario.valid) {
      const payload = this.formularioInventario.getRawValue();
      const codigo = String(payload?.in_codmerc || '').trim();
      if (!codigo) {
        Swal.fire({ title: 'Código requerido', text: 'Debe ingresar el código del producto.', icon: 'warning' });
        return;
      }

      const request$ = this.modoEdicionProducto
        ? this.servicioInventario.editarInventario(codigo, {
            ...payload,
            id: this.productoEditId
          } as any)
        : this.servicioInventario.guardarInventario(payload);

      request$.subscribe({
        next: () => {
          Swal.fire({
            title: "Excelente!",
            text: this.modoEdicionProducto ? "Producto actualizado correctamente." : "Producto guardado correctamente.",
            icon: "success",
            timer: 3000,
            showConfirmButton: false,
          });
          this.obtenerTodosInventario(1);
          this.cerrarModalProducto();
        },
        error: (err) => {
          const msg = (err?.message || err?.error?.message || 'No se pudo guardar el producto').toString();
          Swal.fire({ title: 'Error', text: msg, icon: 'error' });
        }
      });
    } else {
      alert("Formulario invalido");
    }
  }

  obtenerTodosInventario(page: number) {
    this.servicioInventario.obtenerTodosInventario(page, this.pageSize).subscribe(response => {
      this.invenarioList = response?.data || [];
      this.totalItems = Number(response?.pagination?.total ?? this.invenarioList.length);
      this.currentPage = Number(response?.pagination?.page ?? page);
    }
    );
  }

  obtenerTodosGrupoMercancias() {
    this.servicioGrupmerc.obtenerTodosGrupoMercancias().subscribe(response => {
      this.grupomercList = response?.data || [];
    });
  }

  eliminarProducto(choferId: any) {
    const codigo = String(choferId || '').trim();
    if (!codigo) {
      return;
    }
    Swal.fire({
      title: '¿Está seguro de eliminar este producto?',
      text: "¡No podrá revertir esto!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si, eliminar!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.servicioInventario.borrarDeInventario(codigo).subscribe(response => {
          Swal.fire(
            {
              title: "Excelente!",
              text: "Producto eliminado correctamente.",
              icon: "success",
              timer: 3000,
              showConfirmButton: false,
            }
          )
          this.obtenerTodosInventario(this.currentPage);
        });
      }
    })
  }

  changePage(page: number) {
    const maxPage = this.totalPages;
    if (page < 1 || page > maxPage || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    // Trigger a new search with the current codigo and descripcion
    const codigo = this.codigoSubject.getValue();
    const descripcion = this.descripcionSubject.getValue();
    this.servicioInventario.obtenerTodosInventario(this.currentPage, this.pageSize, codigo, descripcion)
      .subscribe(response => {
        this.invenarioList = response?.data || [];
        this.totalItems = Number(response?.pagination?.total ?? this.invenarioList.length);
        this.currentPage = Number(response?.pagination?.page ?? page);
      });
  }


  get totalPages() {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pages(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    const maxPagesToShow = this.maxPagesToShow;

    if (totalPages <= maxPagesToShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }
}
