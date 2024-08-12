import { Cotizacion } from './cotizacion';
/*import { Component, OnInit, ɵNG_COMP_DEF } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import Swal from 'sweetalert2';
import { ServicioCotizacion } from 'src/app/core/services/cotizaciones/cotizacion/cotizacion.service';
import { CotizacionModelData, detCotizacionData } from 'src/app/core/services/cotizaciones/cotizacion';
declare var $: any;
@Component({
  selector: 'cotizacion',
  templateUrl: './cotizacion.html',
  styleUrls: ['./cotizacion.css']
})
export class Cotizacion {
}
*/
import { Component, OnInit, ɵNG_COMP_DEF } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import Swal from 'sweetalert2';
import { ServicioCotizacion } from 'src/app/core/services/cotizaciones/cotizacion/cotizacion.service';
import { CotizacionModelData, detCotizacionData } from 'src/app/core/services/cotizaciones/cotizacion';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';
declare var $: any;


@Component({
  selector: 'Empresas',
  templateUrl: './cotizacion.html',
  styleUrls: ['./cotizacion.css']
})
export class cotizacion implements OnInit {
  totalItems = 0;
  pageSize = 8;
  currentPage = 1;
  maxPagesToShow = 5;
  txtdescripcion: string = '';
  txtcodigo = '';
  txtfecha: string = '';
  descripcion: string = '';
  codigo: string = '';
  fecha: string = '';
  private descripcionBuscar = new BehaviorSubject<string>('');
  private codigoBuscar = new BehaviorSubject<string>('');
  private fechaBuscar = new BehaviorSubject<string>('');
  habilitarFormulario: boolean = false;
  tituloModalCotizacion!: string;
  formularioCotizacion!: FormGroup;
  formulariodetCotizacion!: FormGroup;
  modoedicionCotizacion: boolean = false;
  cotizacionid!: string
  modoconsultaCotizacion: boolean = false;
  cotizacionList: CotizacionModelData[] = [];
  detCotizacionList: detCotizacionData[] = [];
  selectedCotizacion: any = null;
  constructor(private fb: FormBuilder, private servicioCotizacion: ServicioCotizacion, private serviciodetCotizacion: ServiciodetCotizacion) {
    this.crearFormularioCotizacion();
    this.descripcionBuscar.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(nombre => {
        this.descripcion = nombre;
        return this.servicioCotizacion.buscarTodasCotizacion(this.currentPage, this.pageSize, this.descripcion);
      })
    )
      .subscribe(response => {
        this.cotizacionList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = response.pagination.page;
      });
    this.codigoBuscar.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(rnc => {
        this.codigo = rnc;
        return this.servicioCotizacion.buscarTodasCotizacion(this.currentPage, this.pageSize, this.descripcion);
      })
    )
      .subscribe(response => {
        this.cotizacionList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = response.pagination.page;
      });

  }

  agregarCotizacion() {
    this.formularioCotizacion.disable();

  }

  crearformulariodetCotizacion() {
    this.formulariodetCotizacion = this.fb.group({

      dc_codcoti: ['', Validators.required],
      dc_codmerc: ['',],
      dc_descrip: ['',],
      dc_canmerc: ['',],
      dc_premerc: ['',],
      dc_valmerc: ['',],
      dc_unidad:  ['',],
      dc_costmer: ['',],
      dc_codclie: ['',],
      dc_status:  ['',],


    });
  }

  seleccionarCotizacion(cotizacion: any) { this.selectedCotizacion = Cotizacion; }
  ngOnInit(): void { this.buscarTodasCotizacion(1); }

  crearFormularioCotizacion() {
    this.formularioCotizacion = this.fb.group({
    ct_codcoti: ['', Validators.required],
    ct_feccoti: ['', Validators.required],
    ct_valcoti: [''],
    ct_itbis:   [''],
    ct_codclie: [''],
    ct_nomclie: [''],
    ct_rnc:     [''],
    ct_telclie: [''],
    ct_dirclie: [''],
    ct_correo:  [''],
    ct_codvend: [''],
    ct_nomvend: [''],
    ct_nota:    [''],
    ct_status:  [''],

    });
  }

  habilitarFormularioEmpresa() {
    this.habilitarFormulario = false;
  }

  nuevaCotizacion() {
    this.modoedicionCotizacion = false;
    this.tituloModalCotizacion = 'Nueva Cotizacion';
    $('#modalcotizacion').modal('show');
    this.habilitarFormulario = true;
  }

  cerrarModalEmpresa() {
    this.habilitarFormulario = false;
    this.formularioCotizacion.reset();
    this.modoedicionCotizacion = false;
    this.modoconsultaCotizacion = false;
    $('#modalcotizacion').modal('hide');
    this.crearFormularioCotizacion();
    this.cotizacionList = []
  }


  editardetCotizacion(sucursal: detCotizacionData) {
    this.cotizacionid = detcotizacion.dc_codcoti;
    this.formularioCotizacion.patchValue(sucursal);

  }
  editarEmpresa(Cotizacion: CotizacionModelData) {
    this.cotizacionid = Cotizacion.ct_codcoti;
    this.modoedicionCotizacion = true;
    this.formularioCotizacion.patchValue(Cotizacion);
    this.tituloModalCotizacion = 'Editando Cotizacion';
    $('#modalcotizacion').modal('show');
    this.habilitarFormulario = true;
    this.detCotizacionList = Cotizacion.detCotizacion
  }

  buscarTodasEmpresa(page: number) {
    this.servicioCotizacion.buscarTodasCotizacion(page, this.pageSize).subscribe(response => {
      console.log(response);
      this.cotizacionList = response.data;
    });
  }
  consultarCotizacion(Cotizacion: CotizacionModelData) {
    this.tituloModalCotizacion = 'Consulta Cotizacion';
    this.formularioCotizacion.patchValue(Cotizacion);
    $('#modalempresa').modal('show');
    this.habilitarFormulario = true;
    this.modoconsultaCotizacion = true;
    this.formularioCotizacion.disable();
    this.detCotizacionList = Cotizacion.detCotizacion
  };

  consultarSucursal(Cotizacion: CotizacionModelData) {
    this.tituloModalCotizacion = 'Consulta Cotizacion';
    this.formularioCotizacion.patchValue(Cotizacion);

    this.habilitarFormulario = true;
    this.modoconsultaCotizacion = true;
    this.detCotizacionList = Cotizacion.detCotizacion
  };

  eliminarCotizacion(CotizacionEmpresa: string) {
    Swal.fire({
      title: '¿Está seguro de eliminar este Cotizacion?',
      text: "¡No podrá revertir esto!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si, eliminar!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.servicioCotizacion.eliminarCotizacion(Cotizacion).subscribe(response => {
          Swal.fire(
            {
              title: "Excelente!",
              text: "Empresa eliminado correctamente.",
              icon: "success",
              timer: 2000,
              showConfirmButton: false,
            }
          )
          this.buscarTodasCotizacion(this.currentPage);
        });
      }
    })
  }

  descripcionEntra(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.descripcionBuscar.next(inputElement.value.toUpperCase());
  }

  codigoEntra(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.codigoBuscar.next(inputElement.value.toUpperCase());
  }
  fechaEntra(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.codigoBuscar.next(inputElement.value.toUpperCase());
  }

  guardarCotizacion() {
    console.log(this.formularioCotizacion.value);
    if (this.formularioCotizacion.valid) {
      if (this.modoedicionCotizacion) {
        this.servicioCotizacion.editarCotizacion(this.cotizacionid, this.formularioCotizacion.value).subscribe(response => {
          Swal.fire({
            title: "Excelente!",
            text: "Cotizacion Editada correctamente.",
            icon: "success",
            timer: 5000,
            showConfirmButton: false,
          });
          this.buscarTodasCotizacion(1);
          this.formularioCotizacion.reset();
          this.crearFormularioCotizacion();
          $('#modalcotizacion').modal('hide');
        });
      }
      else {
        this.servicioCotizacion.guardarCotizacion(this.formularioCotizacion.value).subscribe(response => {
          Swal.fire
          ({
              title: "Cotizacion Guardada correctamente",
              text: "Desea Crear una Sucursal",
              icon: 'warning',
              timer: 5000,
              showConfirmButton: false,
          });
            this.buscarTodasCotizacion(1);
            this.formularioCotizacion.reset();
            this.crearFormularioCotizacion();
            this.formularioCotizacion.enable();
            $('#modalcotizacion').modal('hide');
        })

      }
    }
    else {
      alert("Esta Empresa no fue Guardado");
    }
  }

  convertToUpperCase(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.toUpperCase();
  }
  moveFocus(event: KeyboardEvent, nextElement: HTMLInputElement | null): void {
    if (event.key === 'Enter' && nextElement) {
      event.preventDefault(); // Evita el comportamiento predeterminado del Enter
      nextElement.focus(); // Enfoca el siguiente campo
    }
  }

  changePage(page: number) {
    this.currentPage = page;
    // Trigger a new search with the current codigo and descripcion
    const descripcion = this.descripcionBuscar.getValue();
    this.servicioCotizacion.buscarTodasCotizacion(this.currentPage, this.pageSize, descripcion)
      .subscribe(response => {
        this.cotizacionList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = page;
      });
  }


  get totalPages() {
    // Asegúrate de que totalItems sea un número antes de calcular el total de páginas
    return Math.ceil(this.totalItems / this.pageSize);
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
  limpiaBusqueda() {
    this.txtdescripcion = '';
    this.txtcodigo = '';
    this.txtfecha = '';
    this.buscarTodasCotizacion(1);
  }
}



