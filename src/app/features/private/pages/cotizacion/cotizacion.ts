import { Component, OnInit, ɵNG_COMP_DEF } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, switchMap, tap } from 'rxjs';
import Swal from 'sweetalert2';
import { ServicioCotizacion } from 'src/app/core/services/cotizaciones/cotizacion/cotizacion.service';
import { CotizacionModelData, detCotizacionData } from 'src/app/core/services/cotizaciones/cotizacion';
import { ServiciodetCotizacion } from 'src/app/core/services/cotizaciones/detcotizacion/detcotizacion.service';
import { ServicioCliente } from 'src/app/core/services/mantenimientos/clientes/cliente.service';
import { HttpInvokeService } from 'src/app/core/services/http-invoke.service';
import { ModeloCliente, ModeloClienteData } from 'src/app/core/services/mantenimientos/clientes';
import { CotizacionDetalleModel, interfaceDetalleModel } from 'src/app/core/services/cotizaciones/cotizacion/cotizacion';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import { ModeloInventario, ModeloInventarioData } from 'src/app/core/services/mantenimientos/inventario';
declare var $: any;


@Component({
  selector: 'Cotizacion',
  templateUrl: './cotizacion.html',
  styleUrls: ['./cotizacion.css']
})
export class Cotizacion implements OnInit {
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
  items:interfaceDetalleModel[] = [];
  totalGral:number = 0;
  totalItbis:number = 0;
  subTotal:number = 0;
  static detCotizacion: detCotizacionData[];
codmerc:string = '';

descripcionmerc:string = '';
productoselect!:ModeloInventarioData;

  constructor(
    private fb: FormBuilder,
    private servicioCotizacion: ServicioCotizacion,
    private servicioCliente:ServicioCliente,
    private serviciodetCotizacion: ServiciodetCotizacion,
    private http:HttpInvokeService,
    private servicioInventario: ServicioInventario
  ) {
    this.crearFormularioCotizacion();
    // this.descripcionBuscar.pipe(
    //   debounceTime(500),
    //   distinctUntilChanged(),
    //   switchMap(nombre => {
    //     this.descripcion = nombre;
    //     return this.servicioCotizacion.buscarTodasCotizacion(this.currentPage, this.pageSize, this.descripcion);
    //   })
    // )
    //   .subscribe(response => {
    //     this.cotizacionList = response.data;
    //     this.totalItems = response.pagination.total;
    //     this.currentPage = response.pagination.page;
    //   });
    // this.codigoBuscar.pipe(
    //   debounceTime(500),
    //   distinctUntilChanged(),
    //   switchMap(rnc => {
    //     this.codigo = rnc;
    //     return this.servicioCotizacion.buscarTodasCotizacion(this.currentPage, this.pageSize, this.descripcion);
    //   })
    // )
    //   .subscribe(response => {
    //     this.cotizacionList = response.data;
    //     this.totalItems = response.pagination.total;
    //     this.currentPage = response.pagination.page;
    //   });

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
      dc_unidad: ['',],
      dc_costmer: ['',],
      dc_codclie: ['',],
      dc_status: ['',],


    });
  }

  buscarNombre = new FormControl();
  resultadoNombre:ModeloClienteData[ ] = [] ;
  selectedIndex = 1;
  buscarcodmerc = new FormControl();
  buscardescripcionmerc = new FormControl();

  resultadoCodmerc:ModeloInventarioData[ ] = [] ;
  selectedIndexcodmerc = 1;
  resultadodescripcionmerc:ModeloInventarioData[ ] = [] ;
  selectedIndexcoddescripcionmerc = 1;
  seleccionarCotizacion(cotizacion: any) { this.selectedCotizacion = cotizacion; }
  ngOnInit(): void {
    this.buscarTodasCotizacion(1);


    this.buscarcodmerc.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      tap(() => {
        this.resultadoCodmerc = [];
      }),
      filter((query: string) => query !== ''),
      switchMap((query: string) => this.http.GetRequest<ModeloInventario>(`/productos-buscador/${query}`))
    ).subscribe((results: ModeloInventario) => {
      console.log(results.data);
      if (results) {
        if (Array.isArray(results.data)) {
          this.resultadoCodmerc = results.data;
        }
      } else {
        this.resultadoCodmerc = [];
      }

    });


    this.buscardescripcionmerc.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      tap(() => {
        this.resultadodescripcionmerc = [];
      }),
      filter((query: string) => query !== ''),
      switchMap((query: string) => this.http.GetRequest<ModeloInventario>(`/productos-buscador-desc/${query}`))
    ).subscribe((results: ModeloInventario) => {
      console.log(results.data);
      if (results) {
        if (Array.isArray(results.data)) {
          this.resultadodescripcionmerc = results.data;
        }
      } else {
        this.resultadodescripcionmerc = [];
      }

    });




    this.buscarNombre.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      tap(() => {
        this.resultadoNombre = [];
      }),
      filter((query: string) => query !== ''),
      switchMap((query: string) => this.http.GetRequest<ModeloCliente>(`/cliente-nombre/${query}`))
    ).subscribe((results: ModeloCliente) => {
      console.log(results.data);
      if (results) {
        if (Array.isArray(results.data)) {
          this.resultadoNombre = results.data;
        }
      } else {
        this.resultadoNombre = [];
      }

    });
   }

  crearFormularioCotizacion() {
    const fechaActual = new Date();
    const fechaActualStr = this.formatofecha(fechaActual);
    this.formularioCotizacion = this.fb.group({
      ct_codcoti: [''],
      ct_feccoti: [fechaActualStr],
      ct_valcoti: [''],
      ct_itbis: [''],
      ct_codclie: [''],
      ct_nomclie: [''],
      ct_rnc: [''],
      ct_telclie: ['',Validators.pattern(/^\(\d{3}\) \d{3}-\d{4}$/)],
      ct_dirclie: [''],
      ct_correo: [''],
      ct_codvend: [''],
      ct_nomvend: [''],
      ct_status: [''],
      ct_codzona : [''],

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

  cerrarModalCotizacion() {
    this.habilitarFormulario = false;
    this.formularioCotizacion.reset();
    this.modoedicionCotizacion = false;
    this.modoconsultaCotizacion = false;
    $('#modalcotizacion').modal('hide');
    this.crearFormularioCotizacion();
    this.buscarTodasCotizacion(1);
  }


  editardetCotizacion(detcotizacion: detCotizacionData) {
    this.cotizacionid = detcotizacion.dc_codcoti;
    this.formularioCotizacion.patchValue(detcotizacion);

  }
  editarCotizacion(Cotizacion: CotizacionModelData) {
    this.cotizacionid = Cotizacion.ct_codcoti;
    this.modoedicionCotizacion = true;
    this.formularioCotizacion.patchValue(Cotizacion);
    this.tituloModalCotizacion = 'Editando Cotizacion';
    $('#modalcotizacion').modal('show');
    this.habilitarFormulario = true;
    this.detCotizacionList = Cotizacion.detCotizacion
  }

  buscarTodasCotizacion(page: number) {
    this.servicioCotizacion.buscarTodasCotizacion(page, this.pageSize).subscribe(response => {
      console.log(response);
      this.cotizacionList = response.data;
    });
  }
  consultarCotizacion( Cotizacion: CotizacionModelData) {
    this.modoconsultaCotizacion = true;
    this.formularioCotizacion.patchValue(Cotizacion);
    this.tituloModalCotizacion = 'Consulta Cotizacion';
    $('#modalcotizacion').modal('show');
    this.habilitarFormulario = true;
    this.formularioCotizacion.disable();
    //this.detCotizacionList = Cotizacion.detCotizacion
  };


  eliminarCotizacion(Cotizacion: string) {
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
        this.servicioCotizacion.eliminarCotizacion(this.cotizacionid).subscribe(response => {
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
    const date = new Date();
this.buscarTodasCotizacion(1),
this.cotizacionid =`${date.getFullYear()}00000${this.cotizacionList.length + 1}`;

    this.formularioCotizacion.get('ct_valcoti')?.patchValue(this.totalGral);
    this.formularioCotizacion.get('ct_itbis')?.patchValue(this.totalItbis);

    this.formularioCotizacion.get('ct_codcoti')?.patchValue(this.cotizacionid);
    const payload = {
      cotizacion: this.formularioCotizacion.value,
      detalle: this.items,
      idCotizacion: this.formularioCotizacion.get('ct_codcoti')?.value,
    };

    console.log(payload);
    // if (this.formularioCotizacion.valid) {
    //   if (this.modoedicionCotizacion) {
    //     this.servicioCotizacion.editarCotizacion(this.cotizacionid, this.formularioCotizacion.value).subscribe(response => {
    //       Swal.fire({
    //         title: "Excelente!",
    //         text: "Cotizacion Editada correctamente.",
    //         icon: "success",
    //         timer: 5000,
    //         showConfirmButton: false,
    //       });
    //       this.buscarTodasCotizacion(1);
    //       this.formularioCotizacion.reset();
    //       this.crearFormularioCotizacion();
    //       $('#modalcotizacion').modal('hide');
    //     });
    //   }
    //   else {
    //     this.servicioCotizacion.guardarCotizacion(this.formularioCotizacion.value).subscribe(response => {
    //       Swal.fire
    //         ({
    //           title: "Cotizacion Guardada correctamente",
    //           text: "Desea Crear una Sucursal",
    //           icon: 'warning',
    //           timer: 5000,
    //           showConfirmButton: false,
    //         });
    //       this.buscarTodasCotizacion(1);
    //       this.formularioCotizacion.reset();
    //       this.crearFormularioCotizacion();
    //       this.formularioCotizacion.enable();
    //       $('#modalcotizacion').modal('hide');
    //     })

    //   }
    // }
    // else {
    //   alert("Esta Empresa no fue Guardado");
    // }
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
    this.servicioCotizacion.buscarTodasCotizacion(this.currentPage, this.pageSize)
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

  // Array para almacenar los datos de la tabla


  // Función para agregar un nuevo item a la tabla
  agregaItem( cantidad: number, precio: number) {
    const total = cantidad * precio;
    this.totalGral += total;
    const itbis = total * 0.18;
    this.totalItbis += itbis;
    this.subTotal = total - itbis;

    this.items.push({ producto: this.productoselect, cantidad, precio, total });
    this.productoselect ;

  }

  // (Opcional) Función para eliminar un ítem de la tabla
  borarItem(item:any) {
    const index = this.items.indexOf(item);
    if (index > -1) {
      this.items.splice(index, 1);
    }
  }


  buscarPorCodigo(codigo: string) {

  }

  buscarClienteporNombre(){
    this.servicioCliente.buscarporNombre(this.formularioCotizacion.get("ct_nomclie")!.value).subscribe(response => {
      console.log(response);
    });
  }

  formatofecha(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Los meses son 0-indexados, se agrega 1 y se llena con ceros
    const day = date.getDate().toString().padStart(2, '0'); // Se llena con ceros si es necesario
    return `${ day}/${month}/${year}`;
  }

  cargarDatosCliente(cliente:ModeloClienteData){
    console.log(cliente);
    this.resultadoNombre = [];
    this.buscarNombre.reset();
    this.formularioCotizacion.patchValue({
      ct_codclie: cliente.cl_codClie,
      ct_nomclie: cliente.cl_nomClie,
      ct_rnc: cliente.cl_rnc,
      ct_telclie: cliente.cl_telClie,
      ct_dirclie: cliente.cl_dirClie,
      ct_codzona: cliente.cl_codZona,

    });
  }

  handleKeydown(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadoNombre.length;

    if (key === 'ArrowDown') {
      // Mueve la selección hacia abajo
      this.selectedIndex = this.selectedIndex < maxIndex ? this.selectedIndex + 1 : 0;
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      // Mueve la selección hacia arriba
      this.selectedIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : maxIndex;
      event.preventDefault();
    } else if (key === 'Enter') {
      // Selecciona el ítem actual
      if (this.selectedIndex >= 0 && this.selectedIndex <= maxIndex) {
        this.cargarDatosCliente(this.resultadoNombre[this.selectedIndex]);
      }
      event.preventDefault();
    }
  }

  cargarDatosInventario(inventario:ModeloInventarioData){
    console.log(inventario);
    this.resultadoCodmerc = [];
    this.resultadodescripcionmerc = [];
    //this.buscarcodmerc.reset();
    this.codmerc=inventario.in_codmerc;
    this.descripcionmerc=inventario.in_desmerc;
    this.productoselect=inventario;
    this.formularioCotizacion.patchValue({
      dc_codmerc: inventario.in_codmerc,
      dc_desmerc: inventario.in_desmerc,
      dc_canmerc: inventario.in_canmerc,
      dc_premerc: inventario.in_premerc,
      dc_cosmerc: inventario.in_cosmerc,
      dc_unidad:  inventario.in_unidad,

    });
  }

  handleKeydownInventario(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadoCodmerc.length;

    if (key === 'ArrowDown') {
      // Mueve la selección hacia abajo
      this.selectedIndexcodmerc = this.selectedIndexcodmerc < maxIndex ? this.selectedIndexcodmerc + 1 : 0;
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      // Mueve la selección hacia arriba
      this.selectedIndexcodmerc = this.selectedIndexcodmerc > 0 ? this.selectedIndexcodmerc - 1 : maxIndex;
      event.preventDefault();
    } else if (key === 'Enter') {
      // Selecciona el ítem actual
      if (this.selectedIndexcodmerc >= 0 && this.selectedIndexcodmerc <= maxIndex) {
        this.cargarDatosInventario(this.resultadoCodmerc[this.selectedIndexcodmerc]);
      }
      event.preventDefault();
    }
}

handleKeydownInventariosdesc(event: KeyboardEvent): void {
  const key = event.key;
  const maxIndex = this.resultadodescripcionmerc.length;

  if (key === 'ArrowDown') {
    // Mueve la selección hacia abajo
    this.selectedIndexcoddescripcionmerc = this.selectedIndexcoddescripcionmerc < maxIndex ? this.selectedIndexcoddescripcionmerc + 1 : 0;
    event.preventDefault();
  } else if (key === 'ArrowUp') {
    // Mueve la selección hacia arriba
    this.selectedIndexcoddescripcionmerc = this.selectedIndexcoddescripcionmerc > 0 ? this.selectedIndexcoddescripcionmerc - 1 : maxIndex;
    event.preventDefault();
  } else if (key === 'Enter') {
    // Selecciona el ítem actual
    if (this.selectedIndexcoddescripcionmerc >= 0 && this.selectedIndexcoddescripcionmerc <= maxIndex) {
      this.cargarDatosInventario(this.resultadodescripcionmerc[this.selectedIndexcoddescripcionmerc]);
    }
    event.preventDefault();
  }
}



onEnter(event: KeyboardEvent) {
  const button = document.getElementById('myButton') as HTMLElement;
  button.click(); // Simula el clic del botón
}
}
