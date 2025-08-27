import { Component, NgModule, OnInit, ViewChild, ElementRef, ɵNG_COMP_DEF } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, switchMap, tap } from 'rxjs';
import Swal from 'sweetalert2';
import { ServicioChofer } from 'src/app/core/services/mantenimientos/choferes/choferes.service';
import { ServicioSalidafactura } from 'src/app/core/services/almacen/salidafactura/salidafactura.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { HttpInvokeService } from 'src/app/core/services/http-invoke.service';
import { SalidafacturaModelData } from 'src/app/core/services/almacen/salidafactura/index'; // <-- Add this import
declare var $: any;


@Component({
  selector: 'Salidafactua',
  templateUrl: './salidafactura.html',
  styleUrls: ['./salidafactura.css']
})

export class RutaSalidafactura implements OnInit {
  pageSize = 8;
  currentPage = 1;
  maxPagesToShow = 5;
  codigo: string = '';
  fecha: string = '';
  txtnumfact: string = '';
  txtnumsalida: string = '';
  habilitarFormulario: boolean = false;
  tituloModalSalidafactura!: string;
  formularioSalidafactura!: FormGroup;
  formulariodetSalidafactura!: FormGroup;
  modoedicionSalidafactura: boolean = false;
  Salidafacturaid!: string
  modoconsultaSalidafactura: boolean = false;
  //  SalidafacturaList: SalidafacturaModelData[] = [];
  // detSalidafacturaList: detSalidafacturaData[] = [];
  selectedSalidafactura: any = null;
  SalidafacturaList: any[] = []; // Add this line to declare the property
  // items: interfaceDetalleModel[] = [];
  // static detSalidafactura: detSalidafacturaData[];
  codFact: string = '';
  mensagePantalla: boolean = false;
  habilitarCampos: boolean = false;

  form: FormGroup;
  constructor(
    private fb: FormBuilder,
    private servicioSalidafactura: ServicioSalidafactura,
    private servicioChofer: ServicioChofer,
    private servicioFacturacion: ServicioFacturacion,
    private http: HttpInvokeService,
  ) {
    this.form = this.fb.group({
      me_codvend: ['', Validators.required], // El campo es requerido
      // Otros campos...
    });

    this.crearFormularioSalidafactura();
  }
  ngOnInit(): void {
    // Inicializa la búsqueda de todas las Salidafactura al cargar el componente
    this.buscarTodasSalidafactura(this.currentPage);
  }

  buscarTodasSalidafactura(page: number) {
    this.servicioSalidafactura.buscarTodasSalidafactura(page, this.pageSize).subscribe(response => {
      this.SalidafacturaList = response.data;
      // Si hay paginación, puedes actualizar currentPage aquí si es necesario
    });
  }

  crearFormularioSalidafactura() {
    const fechaActual = new Date();
    const fechaActualStr = this.formatofecha(fechaActual);
    this.formularioSalidafactura = this.fb.group({

      codSalida: [''],
      fecSalida: [''],
      valSalida: [''],
      horaSalida: [''],
      nomChofer: [''],
      codChofer: [''],
      canFactura: [''],
      valPagado: [''],
      valDevolucion: [''],
      cedChofer: [''],
      status: [''],
      envia: [''],
      preparado: [''],

    });

  }
  habilitarFormularioEmpresa() {
    this.habilitarFormulario = false;
  }
  formatofecha(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Los meses son 0-indexados, se agrega 1 y se llena con ceros
    const day = date.getDate().toString().padStart(2, '0'); // Se llena con ceros si es necesario
    return `${day}/${month}/${year}`;
  }
  nuevaSalidafactura() {
    this.modoedicionSalidafactura = false;
    this.tituloModalSalidafactura = 'Nueva Entrada Mercancias';
    $('#modalSalidafactura').modal('show');
    this.habilitarFormulario = true;
    this.formularioSalidafactura.get('me_codEntr')!.disable();
    this.formularioSalidafactura.get('me_fecEntr')!.disable();
    this.formularioSalidafactura.get('me_nomVend')!.disable();
    setTimeout(() => {
      $('#input1').focus();
    }, 500); // Asegúrate de que el tiempo sea suficiente para que el modal se abra completamente
  }

  limpiaBusqueda() {
    this.txtnumfact = '';
    this.txtnumsalida = '';
    // this.buscarTodasSalidafactura(1);
  }
  consultarSalidaFactura(Salidafactura: SalidafacturaModelData) {
    this.modoconsultaSalidafactura = true;
    this.formularioSalidafactura.patchValue(Salidafactura);
    this.formularioSalidafactura.disable();
    this.tituloModalSalidafactura = 'Consultando Salida Factura';
    const inputs = document.querySelectorAll('.seccion-productos input');
    inputs.forEach((input) => {
      (input as HTMLInputElement).disabled = true;
    });



    // this.servicioSalidafactura.buscarSalidafacturaDetalle(Salidafactura.me_codEntr).subscribe(response => {
    //   let subtotal = 0;
    //   let itbis = 0;
    //   let totalGeneral = 0;
    //   const itbisRate = 0.18; // Ejemplo: 18% de ITBIS

    //   console.log(response);


    // });
  }


}
















// export class RutaSalidafactura implements OnInit {
//   @ViewChild('inputCodmerc') inputCodmerc!: ElementRef; // Para manejar el foco
//   @ViewChild('descripcionInput') descripcionInput!: ElementRef; // Para manejar el foco
//   @ViewChild('Tabladetalle') Tabladetalle!: ElementRef;
//   totalItems = 0;
//   pageSize = 8;
//   currentPage = 1;
//   maxPagesToShow = 5;
//   txtdescripcion: string = '';
//   txtcodigo = '';
//   txtfecha: string = '';
//   descripcion: string = '';
//   codigo: string = '';
//   fecha: string = '';
//   private descripcionBuscar = new BehaviorSubject<string>('');
//   private codigoBuscar = new BehaviorSubject<string>('');
//   private fechaBuscar = new BehaviorSubject<string>('');
//   habilitarFormulario: boolean = false;
//   tituloModalSalidafactura!: string;
//   formularioSalidafactura!: FormGroup;
//   formulariodetSalidafactura!: FormGroup;
//   modoedicionSalidafactura: boolean = false;
//   Salidafacturaid!: string
//   modoconsultaSalidafactura: boolean = false;
//   //  SalidafacturaList: SalidafacturaModelData[] = [];
//   // detSalidafacturaList: detSalidafacturaData[] = [];
//   selectedSalidafactura: any = null;
//   SalidafacturaList: any[] = []; // Add this line to declare the property
//   // items: interfaceDetalleModel[] = [];
//   totalGral: number = 0;
//   totalItbis: number = 0;
//   subTotal: number = 0;
//   // static detSalidafactura: detSalidafacturaData[];
//   codmerc: string = '';
//   descripcionmerc: string = '';
//   cantidadmerc: number = 0;
//   preciomerc: number = 0;
//   precioform = new FormControl();
//   cantidadform = new FormControl();
//   isEditing: boolean = false;
//   itemToEdit: any = null;
//   index_item!: number;
//   codnotfound: boolean = false;
//   desnotfound: boolean = false;
//   mensagePantalla: boolean = false;
//   codmerVacio: boolean = false;
//   desmerVacio: boolean = false;
//   habilitarCampos: boolean = false;
//   sucursales = [];
//   sucursalSeleccionada: any = null;
//   habilitarIcono: boolean = true;


//   private codigoSubject = new BehaviorSubject<string>('');
//   private nomsuplidorSubject = new BehaviorSubject<string>('');

//   isDisabled: boolean = true;
//   form: FormGroup;
//   constructor(
//     private fb: FormBuilder,
//     private servicioSalidafactura: ServicioSalidafactura,
//     private servicioChofer: ServicioChofer,
//     private servicioFacturacion: ServicioFacturacion,
//     private http: HttpInvokeService,
//   ) {

//     this.form = this.fb.group({
//       me_codvend: ['', Validators.required], // El campo es requerido
//       // Otros campos...
//     });

//     this.crearFormularioSalidafactura();

//     this.nomsuplidorSubject.pipe(
//       debounceTime(500),
//       distinctUntilChanged(),
//       switchMap(nomsuplidor => {
//         this.txtdescripcion = nomsuplidor;
//         return this.servicioSalidafactura.buscarSalidafactura(this.currentPage, this.pageSize, this.codigo, this.txtdescripcion);
//       })
//     ).subscribe(response => {
//       this.SalidafacturaList = response.data;
//       this.totalItems = response.pagination.total;
//       this.currentPage = response.pagination.page;
//     });




//   }

//   agregarSalidafactura() {
//     this.formularioSalidafactura.disable();

//   }

//   crearformulariodetSalidafactura() {
//     this.formulariodetSalidafactura = this.fb.group({
//       codsalida: ['',],
//       codFact: ['',],
//       fecFact: [new Date],
//       valFact: ['',],
//       valAbono: ['',],
//       devolucion: ['',],
//       valDevolucion: ['',],
//       entregada: ['',],
//       pagado: ['',],
//       status: ['',],
//       imp: ['',],
//       codChofer: ['',],
//       nomChofer: ['',],

//     });
//   }
//   @ViewChild('buscarcodfacturaInput') buscarcodfacturaElement!: ElementRef;
//   buscarChofer = new FormControl();
//   // resultadoChofer: ModeloChoferData[] = [];
//   selectedIndex = 1;
//   buscarcodmerc = new FormControl();
//   buscardescripcionmerc = new FormControl();
//   // buscarcodmercElement = new FormControl();
//   nativeElement = new FormControl();
//   seleccionarSalidafactura(salidafactura: any) { this.selectedSalidafactura = salidafactura; }


//   ngOnInit(): void {
//     this.buscarTodasSalidafactura(1);
//     this.buscarcodmerc.valueChanges.pipe(
//       debounceTime(50),
//       distinctUntilChanged(),
//       tap(() => {
//         this.resultadoCodmerc = [];
//       }),
//       filter((query: string) => query.trim() !== '' && !this.cancelarBusquedaCodigo && !this.isEditing),
//       switchMap((query: string) => this.http.GetRequest<ModeloInventario>(`/productos-buscador/${query}`))
//     ).subscribe((results: ModeloInventario) => {
//       console.log(results.data);
//       if (results) {
//         if (Array.isArray(results.data) && results.data.length) {
//           // Aquí ordenamos los resultados por el campo 'nombre' (puedes cambiar el campo según tus necesidades)
//           this.resultadoCodmerc = results.data.sort((a, b) => {
//             return a.in_codmerc.localeCompare(b.in_codmerc, undefined, { numeric: true, sensitivity: 'base' });
//           });
//           // Aquí seleccionamos automáticamente el primer ítem
//           this.selectedIndex = -1;

//           this.codnotfound = false;
//         } else {
//           this.codnotfound = true;
//           return;
//         }
//       } else {
//         this.resultadoCodmerc = [];
//         this.codnotfound = false;

//         console.log("paso blanco")
//         return;
//       }

//     });

//     this.buscardescripcionmerc.valueChanges.pipe(
//       debounceTime(50),
//       distinctUntilChanged(),
//       tap(() => {
//         this.resultadodescripcionmerc = [];
//       }),
//       filter((query: string) => query !== '' && !this.cancelarBusquedaDescripcion && !this.isEditing),
//       switchMap((query: string) => this.http.GetRequest<ModeloInventario>(`/productos-buscador-desc/${query}`))
//     ).subscribe((results: ModeloInventario) => {
//       console.log(results.data);
//       if (results) {
//         if (Array.isArray(results.data) && results.data.length) {
//           this.resultadodescripcionmerc = results.data;
//           this.desnotfound = false;
//         }
//         else {
//           this.desnotfound = true;
//         }
//       } else {
//         this.resultadodescripcionmerc = [];
//         this.desnotfound = false;
//         console.log("2")
//       }

//     });


//     this.buscarNombre.valueChanges.pipe(
//       debounceTime(500),
//       distinctUntilChanged(),
//       tap(() => {
//         this.resultadoNombre = [];
//       }),
//       filter((query: string) => query !== ''),
//       switchMap((query: string) => this.http.GetRequest<ModeloSuplidor>(`/suplidor-nombre/${query}`))
//     ).subscribe((results: ModeloSuplidor) => {
//       console.log(results);
//       if (results) {
//         if (Array.isArray(results.data)) {
//           this.resultadoNombre = results.data;
//         }
//       } else {
//         this.resultadoNombre = [];
//       }

//     });
//   }


//   crearFormularioSalidafactura() {
//     const fechaActual = new Date();
//     const fechaActualStr = this.formatofecha(fechaActual);
//     this.formularioSalidafactura = this.fb.group({
//       me_codEntr: [''],
//       me_fecEntr: [fechaActualStr],
//       me_valEntr: [''],
//       me_codSupl: [''],
//       me_nomSupl: [''],
//       me_facSupl: [''],
//       me_fecSupl: [''],
//       me_rncSupl: [0],
//       me_codVend: ['', Validators.required],
//       me_nomVend: [''],
//       me_status: [''],
//       me_nota: [''],
//       chofer: [''],
//       vendedor: [''],
//       despachado: [''],
//     });

//   }
//   habilitarFormularioEmpresa() {
//     this.habilitarFormulario = false;
//   }

//   nuevaSalidafactura() {
//     this.modoedicionSalidafactura = false;
//     this.tituloModalSalidafactura = 'Nueva Entrada Mercancias';
//     $('#modalSalidafactura').modal('show');
//     this.habilitarFormulario = true;
//     this.formularioSalidafactura.get('me_codEntr')!.disable();
//     this.formularioSalidafactura.get('me_fecEntr')!.disable();
//     this.formularioSalidafactura.get('me_nomVend')!.disable();
//     setTimeout(() => {
//       $('#input1').focus();
//     }, 500); // Asegúrate de que el tiempo sea suficiente para que el modal se abra completamente
//   }

//   cerrarModalSalidafactura() {
//     this.habilitarFormulario = false;
//     this.formularioSalidafactura.reset();
//     this.modoedicionSalidafactura = false;
//     this.modoconsultaSalidafactura = false;
//     this.mensagePantalla = false;
//     // this.buscarTodasSalidafactura(1);
//     this.limpiarTabla()
//     this.limpiarCampos()
//     this.crearFormularioSalidafactura();
//     $('#modalSalidafactura').modal('hide');
//     this.habilitarIcono = true;
//     const inputs = document.querySelectorAll('.seccion-productos input');
//     inputs.forEach((input) => {
//       (input as HTMLInputElement).disabled = false;
//     });
//   }

//   editardetSalidafactura(detSalidafactura: detSalidafacturaData) {
//     this.Salidafacturaid = detSalidafactura.de_codEntr;
//   }
//   editarSalidafactura(Salidafactura: SalidafacturaModelData) {
//     this.Salidafacturaid = Salidafactura.me_codEntr;
//     this.modoedicionSalidafactura = true;
//     this.formularioSalidafactura.patchValue(Salidafactura);
//     this.tituloModalSalidafactura = 'Editando Entrada Mercancias';
//     $('#modalSalidafactura').modal('show');
//     this.habilitarFormulario = true;
//     const inputs = document.querySelectorAll('.seccion-productos input');
//     inputs.forEach((input) => {
//       (input as HTMLInputElement).disabled = true;
//     });
//     // Limpiar los items antes de agregar los nuevos
//     this.items = [];
//     this.servicioSalidafactura.buscarSalidafacturaDetalle(Salidafactura.me_codEntr).subscribe(response => {
//       let subtotal = 0;
//       let itbis = 0;
//       let totalGeneral = 0;
//       const itbisRate = 0.18; // Ejemplo: 18% de ITBIS
//       response.data.forEach((item: any) => {
//         const producto: ModeloInventarioData = {
//           in_codmerc: item.dc_codmerc,
//           in_desmerc: item.dc_descrip,
//           in_grumerc: '',
//           in_tipoproduct: '',
//           in_canmerc: 0,
//           in_caninve: 0,
//           in_fecinve: null,
//           in_eximini: 0,
//           in_cosmerc: 0,
//           in_premerc: 0,
//           in_precmin: 0,
//           in_costpro: 0,
//           in_ucosto: 0,
//           in_porgana: 0,
//           in_peso: 0,
//           in_longitud: 0,
//           in_unidad: 0,
//           in_medida: 0,
//           in_longitu: 0,
//           in_fecmodif: null,
//           in_amacen: 0,
//           in_imagen: '',
//           in_status: '',
//           in_itbis: false,
//           in_minvent: 0,
//         };
//         const cantidad = item.de_canEntr;
//         const precio = item.de_preMerc;
//         const fechamerca = new Date()
//         const totalItem = cantidad * precio;
//         this.items.push({
//           producto: producto,
//           cantidad: cantidad,
//           precio: precio,
//           total: totalItem
//         });
//         // Calcular el subtotal
//         subtotal += totalItem;
//         // Calcular ITBIS solo si el producto tiene ITBIS
//         // if (item.dc_itbis) {
//         this.totalItbis += totalItem * itbisRate;
//         // }
//       });
//       // Calcular el total general (subtotal + ITBIS)
//       totalGeneral = subtotal + this.totalItbis;
//       // Asignar los totales a variables o mostrarlos en la interfaz
//       this.subTotal = subtotal;
//       this.totalItbis = this.totalItbis;
//       this.totalGral = totalGeneral;
//     });
//   }

//   buscarTodasSalidafactura(page: number) {
//     this.servicioSalidafactura.buscarTodasSalidafactura(page, this.pageSize).subscribe(response => {
//       this.SalidafacturaList = response.data;
//     });
//   }
//   consultarSalidafactura(Salidafactura: SalidafacturaModelData) {
//     this.modoconsultaSalidafactura = true;
//     this.formularioSalidafactura.patchValue(Salidafactura);
//     this.tituloModalSalidafactura = 'Consulta Entrada Mercancias';
//     $('#modalSalidafactura').modal('show');
//     this.habilitarFormulario = true;
//     this.formularioSalidafactura.disable();
//     this.habilitarIcono = false;

//     const inputs = document.querySelectorAll('.seccion-productos input');
//     inputs.forEach((input) => {
//       (input as HTMLInputElement).disabled = true;
//     });

//     // Limpiar los items antes de agregar los nuevos
//     this.items = [];

//     this.servicioSalidafactura.buscarSalidafacturaDetalle(Salidafactura.me_codEntr).subscribe(response => {
//       let subtotal = 0;
//       let itbis = 0;
//       let totalGeneral = 0;
//       const itbisRate = 0.18; // Ejemplo: 18% de ITBIS

//       console.log(response);

//       response.data.forEach((item: any) => {
//         const producto: ModeloInventarioData = {
//           in_codmerc: item.de_codMerc,
//           in_desmerc: item.de_desMerc,
//           in_grumerc: '',
//           in_tipoproduct: '',
//           in_canmerc: 0,
//           in_caninve: 0,
//           in_fecinve: null,
//           in_eximini: 0,
//           in_cosmerc: 0,
//           in_premerc: item.de_preMerc,
//           in_precmin: 0,
//           in_costpro: 0,
//           in_ucosto: 0,
//           in_porgana: 0,
//           in_peso: 0,
//           in_longitud: 0,
//           in_unidad: item.de_canEntr,
//           in_medida: 0,
//           in_longitu: 0,
//           in_fecmodif: null,
//           in_amacen: 0,
//           in_imagen: '',
//           in_status: '',
//           in_itbis: false,
//           in_minvent: 0,
//         };

//         const cantidad = item.de_canEntr;
//         const precio = item.de_preMerc;
//         const totalItem = cantidad * precio;

//         this.items.push({
//           producto: producto,
//           cantidad: cantidad,
//           precio: precio,
//           total: totalItem
//         });

//         // Calcular el subtotal
//         subtotal += totalItem;

//         // Calcular ITBIS solo si el producto tiene ITBIS
//         // if (item.dc_itbis) {
//         this.totalItbis += totalItem * itbisRate;
//         // }
//       });

//       // Calcular el total general (subtotal + ITBIS)
//       totalGeneral = subtotal + this.totalItbis;

//       // Asignar los totales a variables o mostrarlos en la interfaz
//       this.subTotal = subtotal;
//       this.totalItbis = this.totalItbis;
//       this.totalGral = totalGeneral;
//     });
//   }

//   eliminarSalidafactura(SalidafacturaId: string) {
//     Swal.fire({
//       title: '¿Está seguro de eliminar este Salidafactura?',
//       text: "¡No podrá revertir esto!",
//       icon: 'warning',
//       showCancelButton: true,
//       confirmButtonColor: '#3085d6',
//       cancelButtonColor: '#d33',
//       confirmButtonText: 'Si, eliminar!'
//     }).then((result) => {
//       if (result.isConfirmed) {
//         this.servicioSalidafactura.eliminarSalidafactura(SalidafacturaId).subscribe(response => {
//           Swal.fire(
//             {
//               title: "Excelente!",
//               text: "Empresa eliminado correctamente.",
//               icon: "success",
//               timer: 2000,
//               showConfirmButton: false,
//             }
//           )
//           this.buscarTodasSalidafactura(this.currentPage);
//         });
//       }
//     })
//   }

//   descripcionEntra(event: Event) {
//     const inputElement = event.target as HTMLInputElement;
//     this.nomsuplidorSubject.next(inputElement.value.toUpperCase());
//   }

//   codigoEntra(event: Event) {
//     const inputElement = event.target as HTMLInputElement;
//     this.codigoBuscar.next(inputElement.value.toUpperCase());
//   }
//   fechaEntra(event: Event) {
//     const inputElement = event.target as HTMLInputElement;
//     this.codigoBuscar.next(inputElement.value.toUpperCase());
//   }

//   guardarSalidafactura() {
//     const date = new Date();
//     this.formularioSalidafactura.get('me_valEntr')?.patchValue(this.totalGral);
//     this.formularioSalidafactura.get('me_itbis')?.patchValue(this.totalItbis);
//     this.formularioSalidafactura.get('me_codEntr')!.enable();
//     this.formularioSalidafactura.get('me_fecEntr')!.enable();
//     this.formularioSalidafactura.get('me_nomVend')!.enable();
//     // this.formularioSalidafactura.patchValue({ me_nomSupl: this.formularioSalidafactura.get('me_nomSupl')?.value })
//     const payload = {
//       Salidafacturaancias: this.formularioSalidafactura.value,
//       detalle: this.items,
//       idSalidafactura: this.formularioSalidafactura.get('me_codEntr')?.value,

//     };

//     console.log(payload);

//     if (this.formularioSalidafactura.valid) {
//       if (this.modoedicionSalidafactura) {
//         this.servicioSalidafactura.editarSalidafactura(this.Salidafacturaid, this.formularioSalidafactura.value).subscribe(response => {
//           Swal.fire({
//             title: "Excelente!",
//             text: "Salidafactura Editada correctamente.",
//             icon: "success",
//             timer: 5000,
//             showConfirmButton: false,
//           });
//           this.buscarTodasSalidafactura(1);
//           this.formularioSalidafactura.reset();
//           this.crearFormularioSalidafactura();
//           $('#modalSalidafactura').modal('hide');
//         });
//       }
//       else {

//         if (this.formularioSalidafactura.valid) {
//           this.servicioSalidafactura.guardarSalidafactura(payload).subscribe(response => {
//             Swal.fire({
//               title: "Excelente!",
//               text: "Entrada Mercancias creada correctamente.",
//               icon: "success",
//               timer: 1000,
//               showConfirmButton: false,
//             });
//             this.buscarTodasSalidafactura(1);
//             this.formularioSalidafactura.reset();
//             this.crearFormularioSalidafactura();
//             this.formularioSalidafactura.enable();
//             $('#modalSalidafactura').modal('hide');
//           });
//         } else {
//           console.log(this.formularioSalidafactura.value);
//         }

//       }
//     }
//     else {
//       alert("Entrada no fue Guardado");
//     }
//   }

//   convertToUpperCase(event: Event): void {
//     const input = event.target as HTMLInputElement;
//     const start = input.selectionStart;
//     const end = input.selectionEnd;
//     input.value = input.value.toUpperCase();
//     if (start !== null && end !== null) {
//       input.setSelectionRange(start, end);
//     }
//   }
//   moveFocus(event: KeyboardEvent, nextElement: HTMLInputElement | null): void {
//     if (event.key === 'Enter' && nextElement) {
//       event.preventDefault(); // Evita el comportamiento predeterminado del Enter
//       nextElement.focus(); // Enfoca el siguiente campo
//     }
//   }

//   changePage(page: number) {
//     this.currentPage = page;

//     this.servicioSalidafactura.buscarTodasSalidafactura(this.currentPage, this.pageSize)
//       .subscribe(response => {
//         this.SalidafacturaList = response.data;
//         this.totalItems = response.pagination.total;
//         this.currentPage = page;
//         this.formularioSalidafactura.reset();
//         console.log(this.currentPage);

//       });

//   }


//   get totalPages() {
//     // Asegúrate de que totalItems sea un número antes de calcular el total de páginas
//     return Math.ceil(this.totalItems / this.pageSize);
//   }

//   get pages(): number[] {
//     const totalPages = this.totalPages;
//     const currentPage = this.currentPage;
//     const maxPagesToShow = this.maxPagesToShow;

//     if (totalPages <= maxPagesToShow) {
//       return Array.from({ length: totalPages }, (_, i) => i + 1);
//     }

//     const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
//     const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

//     return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
//   }


//   limpiaBusqueda() {
//     this.txtdescripcion = '';
//     this.txtcodigo = '';
//     this.txtfecha = '';
//     this.buscarTodasSalidafactura(1);
//   }

//   // Array para almacenar los datos de la tabla


//   // Función para agregar un nuevo item a la tabla
//   agregaItem(event: Event) {
//     event.preventDefault();
//     if (this.isEditing) {
//       console.log("editando")
//       // Actualizar el ítem existente
//       this.itemToEdit.producto = this.productoselect;
//       this.itemToEdit.codmerc = this.codmerc;
//       this.itemToEdit.descripcionmerc = this.descripcionmerc;
//       this.itemToEdit.precio = this.preciomerc;
//       this.itemToEdit.cantidad = this.cantidadmerc;
//       this.itemToEdit.total = this.cantidadmerc * this.preciomerc;

//       // Actualizar los totales
//       this.actualizarTotales();

//       // Restablecer el estado de edición
//       this.isEditing = false;
//       this.itemToEdit = null;
//     } else {

//       if (!this.productoselect || this.cantidadmerc <= 0 || this.preciomerc <= 0) {
//         this.mensagePantalla = true;
//         Swal.fire({
//           icon: "error",
//           title: "A V I S O",
//           text: 'Por favor complete todos los campos requeridos antes de agregar el ítem.',
//         }).then(() => { this.mensagePantalla = false });
//         return;
//       }
//       const total = this.cantidadmerc * this.preciomerc;
//       this.totalGral += total;
//       const itbis = total * 0.18;
//       this.totalItbis += itbis;
//       this.subTotal += total - itbis;
//       this.items.push({
//         producto: this.productoselect, cantidad: this.cantidadmerc, precio: this.preciomerc, total
//       })

//       this.cancelarBusquedaDescripcion = false;
//       this.cancelarBusquedaCodigo = false;
//     }
//     this.limpiarCampos();
//   }

//   limpiarCampos() {
//     this.productoselect;
//     this.codmerc = ""
//     this.descripcionmerc = ""
//     this.preciomerc = 0;
//     this.cantidadmerc = 0;
//     this.isEditing = false;
//   }

//   limpiarTabla() {
//     this.items = [];          // Limpiar el array de items
//     this.totalGral = 0;       // Reiniciar el total general
//     this.totalItbis = 0;      // Reiniciar el total del ITBIS
//     this.subTotal = 0;        // Reiniciar el subtotal
//   }
//   // (Opcional) Función para eliminar un ítem de la tabla
//   borarItem(item: any) {
//     const index = this.items.indexOf(item);
//     if (index > -1) {
//       this.totalGral -= item.total;

//       // Calcular el itbis del ítem eliminado y restarlo del total itbis
//       const itbis = item.total * 0.18;
//       this.totalItbis -= itbis;

//       // Restar el subtotal del ítem eliminado
//       this.subTotal -= (item.total - itbis);

//       // Eliminar el ítem de la lista
//       this.items.splice(index, 1);
//     }
//   }

//   editarItem(item: any) {
//     this.index_item = this.items.indexOf(item);


//     this.isEditing = true;
//     this.itemToEdit = item;

//     this.productoselect = item.producto;
//     this.codmerc = item.producto.in_codmerc;
//     this.descripcionmerc = item.producto.in_desmerc;
//     this.preciomerc = item.precio
//     this.cantidadmerc = item.cantidad

//   }
//   actualizarTotales() {
//     this.totalGral = this.items.reduce((sum, item) => sum + item.total, 0);
//     this.totalItbis = this.items.reduce((sum, item) => sum + (item.total * 0.18), 0);
//     this.subTotal = this.items.reduce((sum, item) => sum + (item.total - (item.total * 0.18)), 0);
//   }

//   buscarPorCodigo(codigo: string) {

//   }

//   buscarSuplidorporNombre() {
//     this.servicioSuplidor.buscarporNombre(this.formularioSalidafactura.get("me_nomSupl")!.value).subscribe(response => {
//       console.log(response);
//     });
//   }

//   formatofecha(date: Date): string {
//     const year = date.getFullYear();
//     const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Los meses son 0-indexados, se agrega 1 y se llena con ceros
//     const day = date.getDate().toString().padStart(2, '0'); // Se llena con ceros si es necesario
//     return `${day}/${month}/${year}`;
//   }

//   cargarDatosSuplidor(suplidor: ModeloSuplidorData) {
//     console.log('Entro aquiiiii=--------------')
//     this.resultadoNombre = [];
//     this.buscarNombre.reset();
//     if (suplidor.su_nomSupl !== "") {
//       this.formularioSalidafactura.patchValue({
//         me_codSupl: suplidor.su_codSupl,
//         me_nomSupl: suplidor.su_nomSupl,
//         me_rncSupl: suplidor.su_rncSupl,
//       });
//     }

//   }

//   handleKeydown(event: KeyboardEvent): void {
//     const key = event.key;
//     const maxIndex = this.resultadoNombre.length - 1;  // Ajustamos el límite máximo

//     if (key === 'ArrowDown') {
//       console.log("paso 56");

//       // Mueve la selección hacia abajo
//       if (this.selectedIndex < maxIndex) {
//         this.selectedIndex++;
//       } else {
//         this.selectedIndex = 0;  // Vuelve al primer ítem
//       }
//       event.preventDefault();
//     } else if (key === 'ArrowUp') {
//       console.log("paso 677");

//       // Mueve la selección hacia arriba
//       if (this.selectedIndex > 0) {
//         this.selectedIndex--;
//       } else {
//         this.selectedIndex = maxIndex;  // Vuelve al último ítem
//       }
//       event.preventDefault();
//     } else if (key === 'Enter') {
//       // Selecciona el ítem actual
//       if (this.selectedIndex >= 0 && this.selectedIndex <= maxIndex) {
//         this.cargarDatosSuplidor(this.resultadoNombre[this.selectedIndex]);
//       }
//       event.preventDefault();
//     }
//   }

//   cancelarBusquedaDescripcion: boolean = false;
//   cancelarBusquedaCodigo: boolean = false;

//   cargarDatosInventario(inventario: ModeloInventarioData) {
//     console.log(inventario);
//     this.resultadoCodmerc = [];
//     this.resultadodescripcionmerc = [];
//     this.codmerc = inventario.in_codmerc;
//     this.preciomerc = inventario.in_premerc
//     this.descripcionmerc = inventario.in_desmerc;
//     this.productoselect = inventario;
//     this.cancelarBusquedaDescripcion = true;
//     this.cancelarBusquedaCodigo = true;
//     this.formularioSalidafactura.patchValue({
//       de_codmerc: inventario.in_codmerc,
//       de_desmerc: inventario.in_desmerc,
//       de_canmerc: inventario.in_canmerc,
//       de_premerc: inventario.in_premerc,
//       de_cosmerc: inventario.in_cosmerc,
//       de_unidad: inventario.in_unidad,
//     });
//     console.log("si")
//     $("#input10").focus();
//     $("#input10").select();
//   }
//   handleKeydownInventario(event: KeyboardEvent): void {
//     const key = event.key;
//     const maxIndex = this.resultadoCodmerc.length;
//     if (key === 'ArrowDown') {
//       console.log("paso");
//       this.selectedIndexcodmerc = this.selectedIndexcodmerc < maxIndex ? this.selectedIndexcodmerc + 1 : 0;
//       event.preventDefault();
//     }
//     else
//       if (key === 'ArrowUp') {
//         console.log("paso2");
//         this.selectedIndexcodmerc = this.selectedIndexcodmerc > 0 ? this.selectedIndexcodmerc - 1 : maxIndex;
//         event.preventDefault();
//       }
//       else if (key === 'Enter') {
//         if (this.selectedIndexcodmerc >= 0 && this.selectedIndexcodmerc <= maxIndex) {
//           this.cargarDatosInventario(this.resultadoCodmerc[this.selectedIndexcodmerc]);
//         }
//         event.preventDefault();
//       }
//   }
//   submitForm(): void {
//     if (this.mensagePantalla && this.form.invalid) {
//       console.log(this.mensagePantalla);
//       console.log(this.form.invalid);
//     } else {
//       console.log(this.mensagePantalla);
//       console.log(this.form.invalid);
//       this.cerrarModalSalidafactura()
//     }
//   }

//   onBlur(event: any): void {
//     const value = event.target.value;

//     // Si el valor no está vacío, lo asignamos al formControl
//     if (value && value.trim() !== '') {
//       this.formularioSalidafactura.get('me_nomSupl')!.setValue(value.trim());
//     }
//   }


// }

