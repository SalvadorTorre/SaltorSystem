import { Component, NgModule, OnInit, ɵNG_COMP_DEF } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, switchMap, tap } from 'rxjs';
import Swal from 'sweetalert2';
import { ModeloUsuarioData } from 'src/app/core/services/mantenimientos/usuario';
import { ModeloRncData } from 'src/app/core/services/mantenimientos/rnc';
import { ServicioRnc } from 'src/app/core/services/mantenimientos/rnc/rnc.service';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
import { ServicioCotizacion } from 'src/app/core/services/cotizaciones/cotizacion/cotizacion.service';
import { CotizacionModelData, detCotizacionData } from 'src/app/core/services/cotizaciones/cotizacion';
import { ServiciodetCotizacion } from 'src/app/core/services/cotizaciones/detcotizacion/detcotizacion.service';
import { ServicioCliente } from 'src/app/core/services/mantenimientos/clientes/cliente.service';
import { HttpInvokeService } from 'src/app/core/services/http-invoke.service';
import { ModeloCliente, ModeloClienteData } from 'src/app/core/services/mantenimientos/clientes';
import { CotizacionDetalleModel, interfaceDetalleModel } from 'src/app/core/services/cotizaciones/cotizacion/cotizacion';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import { ModeloInventario, ModeloInventarioData } from 'src/app/core/services/mantenimientos/inventario';
import { Usuario } from '../mantenimientos/pages/usuario-page/usuario';
declare var $: any;

@NgModule({
  declarations: [
    // Otros componentes
  ],
  imports: [
    FormsModule,
    // Otros módulos
  ],
})
export class AppModule { }
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
  items: interfaceDetalleModel[] = [];
  totalGral: number = 0;
  totalItbis: number = 0;
  subTotal: number = 0;
  static detCotizacion: detCotizacionData[];
  codmerc: string = '';
  descripcionmerc: string = '';
  cantidadmerc: number = 0;
  preciomerc: number = 0;
  productoselect!: ModeloInventarioData;
  precioform = new FormControl();
  cantidadform = new FormControl();
  isEditing: boolean = false;
  itemToEdit: any = null;
  form: FormGroup;
  constructor(
    private fb: FormBuilder,
    private servicioCotizacion: ServicioCotizacion,
    private servicioCliente: ServicioCliente,
    private serviciodetCotizacion: ServiciodetCotizacion,
    private http: HttpInvokeService,
    private servicioInventario: ServicioInventario,
    private ServicioUsuario: ServicioUsuario,
    private ServicioRnc: ServicioRnc
  ) {

    this.form = this.fb.group({
      ct_codvend: ['', Validators.required], // El campo es requerido
      // Otros campos...
    });

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
  resultadoNombre: ModeloClienteData[] = [];
  selectedIndex = 1;
  buscarcodmerc = new FormControl();
  buscardescripcionmerc = new FormControl();

  resultadoCodmerc: ModeloInventarioData[] = [];
  selectedIndexcodmerc = 1;
  resultadodescripcionmerc: ModeloInventarioData[] = [];
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
      filter((query: string) => query !== '' && !this.cancelarBusquedaCodigo),
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
      filter((query: string) => query !== '' && !this.cancelarBusquedaDescripcion),
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
      ct_telclie: ['', Validators.pattern(/^\(\d{3}\) \d{3}-\d{4}$/)],
      ct_dirclie: [''],
      ct_correo: [''],
      ct_codvend: ['', Validators.required],
      ct_nomvend: [''],
      ct_status: [''],
      ct_codzona: [''],

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
  consultarCotizacion(Cotizacion: CotizacionModelData) {
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
      this.cotizacionid = `${date.getFullYear()}00000${this.cotizacionList.length + 1}`;

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
  agregaItem(event: Event) {
    event.preventDefault();
    if (this.isEditing) {
      console.log("editando")
      // Actualizar el ítem existente
      this.itemToEdit.producto = this.productoselect;
      this.itemToEdit.codmerc = this.codmerc;
      this.itemToEdit.descripcionmerc = this.descripcionmerc;
      this.itemToEdit.precio = this.preciomerc;
      this.itemToEdit.cantidad = this.cantidadmerc;
      this.itemToEdit.total = this.cantidadmerc * this.preciomerc;

      // Actualizar los totales
      this.actualizarTotales();

      // Restablecer el estado de edición
      this.isEditing = false;
      this.itemToEdit = null;
    } else {

    if (!this.productoselect || this.cantidadmerc <= 0 || this.preciomerc <= 0) {
      Swal.fire({
        icon: "error",
        title: "A V I S O",
        text: 'Por favor complete todos los campos requeridos antes de agregar el ítem.',
      });
      return;
    }
    const total = this.cantidadmerc * this.preciomerc;
    this.totalGral += total;
    const itbis = total * 0.18;
    this.totalItbis += itbis;
    this.subTotal += total - itbis;
    this.items.push({
      producto: this.productoselect, cantidad: this.cantidadmerc, precio: this.preciomerc, total

    })

    this.cancelarBusquedaDescripcion = false;
    this.cancelarBusquedaCodigo = false;


  }
  this.limpiarCampos();

  }
  limpiarCampos(){
    //Limpia campo
    this.productoselect;
    this.codmerc = ""
    this.descripcionmerc = ""
    this.preciomerc = 0;
    this.cantidadmerc = 0;
    this.isEditing = false;
    //this.itemToEdit = null;
  }

   // (Opcional) Función para eliminar un ítem de la tabla
  borarItem(item: any) {
    const index = this.items.indexOf(item);
    if (index > -1) {
      this.totalGral -= item.total;

      // Calcular el itbis del ítem eliminado y restarlo del total itbis
      const itbis = item.total * 0.18;
      this.totalItbis -= itbis;

      // Restar el subtotal del ítem eliminado
      this.subTotal -= (item.total - itbis);

      // Eliminar el ítem de la lista
      this.items.splice(index, 1);
    }
  }

  editarItem(item: any) {
    const index = this.items.indexOf(item);
    console.log("editando")
    if (index > -1) {
      this.isEditing = true;
      this.itemToEdit = item;

      this.productoselect = item.producto;
      this.codmerc = item.codmerc;
      this.descripcionmerc = item.descripcionmerc;
      this.preciomerc = item.preciomerc
      this.cantidadmerc = item.cantidadmerc
    }
  }
  actualizarTotales(){
    this.totalGral = this.items.reduce((sum, item) => sum + item.total, 0);
    this.totalItbis = this.items.reduce((sum, item) => sum + (item.total * 0.18), 0);
    this.subTotal = this.items.reduce((sum, item) => sum + (item.total - (item.total * 0.18)), 0);
  }

  buscarPorCodigo(codigo: string) {

  }

  buscarClienteporNombre() {
    this.servicioCliente.buscarporNombre(this.formularioCotizacion.get("ct_nomclie")!.value).subscribe(response => {
      console.log(response);
    });
  }

  formatofecha(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Los meses son 0-indexados, se agrega 1 y se llena con ceros
    const day = date.getDate().toString().padStart(2, '0'); // Se llena con ceros si es necesario
    return `${day}/${month}/${year}`;
  }

  cargarDatosCliente(cliente: ModeloClienteData) {
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

  cancelarBusquedaDescripcion: boolean = false;
  cancelarBusquedaCodigo: boolean = false;

  cargarDatosInventario(inventario: ModeloInventarioData) {
    console.log(inventario);
    this.resultadoCodmerc = [];
    this.resultadodescripcionmerc = [];
    //this.buscarcodmerc.reset();
    this.codmerc = inventario.in_codmerc;
    this.descripcionmerc = inventario.in_desmerc;
    this.productoselect = inventario;
    this.cancelarBusquedaDescripcion = true;
    this.cancelarBusquedaCodigo = true;
    this.formularioCotizacion.patchValue({
      dc_codmerc: inventario.in_codmerc,
      dc_desmerc: inventario.in_desmerc,
      dc_canmerc: inventario.in_canmerc,
      dc_premerc: inventario.in_premerc,
      dc_cosmerc: inventario.in_cosmerc,
      dc_unidad: inventario.in_unidad,

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



  // onEnter(event: KeyboardEvent) {
  //   const button = document.getElementById('myButton') as HTMLElement;
  //   button.click(); // Simula el clic del botón
  // }
  onEnter(cantidad: number, precio: number) {
    const total = cantidad * precio;
    this.totalGral += total;
    const itbis = total * 0.18;
    this.totalItbis += itbis;
    this.subTotal += total - itbis;

    this.items.push({ producto: this.productoselect, cantidad, precio, total });
    this.productoselect;

  }

  moveFocusin(event: KeyboardEvent, nextInput: HTMLInputElement) {
    if (event.key === 'Enter') {
      event.preventDefault(); // Previene el comportamiento predeterminado de Enter
      const currentControl = this.formularioCotizacion.get('ct_codvend');
      if (currentControl?.invalid) {
        currentControl.markAsTouched(); // Marca el campo como tocado para mostrar errores
        //   alert('El campo "Vendedor" es obligatorio.'); // Muestra el mensaje de error
        Swal.fire({
          icon: "info",
          title: "A V I S O",
          text: 'El campo "Vendedor" es obligatorio.',
        });
      } else {
        nextInput.focus(); // Si es válido, mueve el foco al siguiente input
      }
    }
  }
  // buscarCodgomerc(): void {
  //   const claveUsuario = this.formularioCotizacion.get('codmerc')?.value;
  //   if (codmerc) {
  //     this.ServicioUsuario.buscarUsuarioPorClave(codmerc).subscribe(
  //       (usuario) => {
  //         if (inventario.data.length) {
  //           this.formularioCotizacion.patchValue({ ct_nomvend: usuario.data[0].idUsuario });
  //           console.log(usuario.data[0].idUsuario);
  //         } else {
  //           console.log('Vendedor no encontrado');
  //         }
  //       },
  //       (error) => {
  //         Swal.fire({
  //           icon: "error",
  //           title: "A V I S O",
  //           text: 'Codigo de usuarioinvalido.',
  //         });
  //         return;
  //         // console.error('Error al buscar el vendedor', claveUsuario,error);
  //       }
  //     );
  //   }
  //   else {
  //     Swal.fire({
  //       icon: "error",
  //       title: "A V I S O",
  //       text: 'Codigo de usuarioinvalido.',
  //     });
  //     return;

  //   }

  // }

  buscarUsuario(): void {
    const claveUsuario = this.formularioCotizacion.get('ct_codvend')?.value;
    if (claveUsuario) {
      this.ServicioUsuario.buscarUsuarioPorClave(claveUsuario).subscribe(
        (usuario) => {
          if (usuario.data.length) {
            this.formularioCotizacion.patchValue({ ct_nomvend: usuario.data[0].idUsuario });
            console.log(usuario.data[0].idUsuario);
          } else {
            console.log('Vendedor no encontrado');
          }
        },
        (error) => {
          Swal.fire({
            icon: "error",
            title: "A V I S O",
            text: 'Codigo de usuarioinvalido.',
          });
          return;
          // console.error('Error al buscar el vendedor', claveUsuario,error);
        }
      );
    }
    else {
      Swal.fire({
        icon: "error",
        title: "A V I S O",
        text: 'Codigo de usuarioinvalido.',
      });
      return;

    }

  }
  buscarRnc(): void {
    const rnc = this.formularioCotizacion.get('ct_rnc')?.value;
    if (rnc) {
      if (rnc.length === 9 || rnc.length === 11) {
        this.ServicioRnc.buscarRncPorId(rnc).subscribe(
          (rnc) => {
            console.log(rnc.data);
            if (rnc.data.length) {
              this.formularioCotizacion.patchValue({ ct_nomclie: rnc.data[0].rason });
              console.log(rnc.data[0].rason);
            } else {
              Swal.fire({
                icon: "error",
                title: "A V I S O",
                text: 'Rnc invalido.',
              });
              return;
            }
          }
        );
      }
      else {
        Swal.fire({
          icon: "error",
          title: "A V I S O",
          text: 'Rnc invalido.',
        });
        return;
      }
    }

  }



  moveFocusdesc(event: KeyboardEvent, nextInput: HTMLInputElement) {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault(); // Previene el comportamiento predeterminado de Enter
      // const currentControl = this.formularioCotizacion.get('ct_codvend');
      if (!this.descripcionmerc) {
        Swal.fire({
          icon: "info",
          title: "A V I S O",
          text: 'Por favor complete el campo descripcion  es requeridos.',
        });
        return;
      }
      else {
        nextInput.focus(); // Si es válido, mueve el foco al siguiente input
      }
    }


  }

  moveFocuscant(event: Event, nextInput: HTMLInputElement) {
    event.preventDefault();

    if (!this.productoselect || this.cantidadmerc <= 0) {
      Swal.fire({
        icon: "error",
        title: "A V I S O",
        text: 'Por favor complete todos los campos requeridos antes de agregar el ítem.',
      });
      return;
    }
    else {
      nextInput.focus(); // Si es válido, mueve el foco al siguiente input
    }
  }

  moveFocusnomclie(event: Event, nextInput: HTMLInputElement) {
    event.preventDefault();
    console.log(nextInput);
    if (event.target instanceof HTMLInputElement) {
      if (!event.target.value) {
        Swal.fire({
          icon: "error",
          title: "A V I S O",
          text: 'Por favor complete el campo Nombre del Cliente Para Poder continual.',
        });
        return;
      }
      else {
        nextInput.focus(); // Si es válido, mueve el foco al siguiente input
      }
    }
  }



}



