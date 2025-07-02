import { Component, NgModule, OnInit, ViewChild, ElementRef, ɵNG_COMP_DEF } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, from, skip, switchMap, tap } from 'rxjs';
import Swal from 'sweetalert2';
import { ServicioRnc } from 'src/app/core/services/mantenimientos/rnc/rnc.service';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { FacturacionModelData, detFacturaData } from 'src/app/core/services/facturacion/factura';
import { ServicioCliente } from 'src/app/core/services/mantenimientos/clientes/cliente.service';
import { HttpInvokeService } from 'src/app/core/services/http-invoke.service';
import { ModeloCliente, ModeloClienteData } from 'src/app/core/services/mantenimientos/clientes';
import { interfaceDetalleModel } from 'src/app/core/services/facturacion/factura/factura';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import { ServicioSector } from 'src/app/core/services/mantenimientos/sector/sector.service';
import { ModeloSector, ModeloSectorData } from 'src/app/core/services/mantenimientos/sector';
import { ModeloFpagoData } from 'src/app/core/services/mantenimientos/fpago';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';
import { ModeloInventario, ModeloInventarioData } from 'src/app/core/services/mantenimientos/inventario';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { disableDebugTools } from '@angular/platform-browser';
import { ServicioNcf } from 'src/app/core/services/ncf/ncf.service';
import { ModeloNcfData } from 'src/app/core/services/ncf';
declare var $: any;

@Component({
  selector: 'controlfact',
  templateUrl: './controlfact.html',
  styleUrls: ['./controlfact.css']
})


export class ControlFact implements OnInit {
  @ViewChild('inputCodmerc') inputCodmerc!: ElementRef; // Para manejar el foco
  @ViewChild('descripcionInput') descripcionInput!: ElementRef; // Para manejar el foco
  @ViewChild('Tabladetalle') Tabladetalle!: ElementRef;
  botonEditar = true; // Empieza deshabilitado
  botonGuardar = true; // Empieza deshabilitado
  totalItems = 0;
  pageSize = 6;
  currentPage = 1;
  maxPagesToShow = 5;
  txtdescripcion: string = '';
  txtcodigo = '';
  // txtFecha: string = '';
  descripcion: string = '';
  codigo: string = '';
  fecha: string = '';
  private descripcionBuscar = new BehaviorSubject<string>('');
  private codigoBuscar = new BehaviorSubject<string>('');
  private fechaBuscar = new BehaviorSubject<string>('');
  habilitarFormulario: boolean = false;
  tituloModalFacturacion!: string;
  formularioFacturacion!: FormGroup;
  formulariodetFactura!: FormGroup;
  modoedicionFacturacion: boolean = false;
  facturacionid!: string
  modoconsultaFacturacion: boolean = false;
 facturacionList: FacturacionModelData[] = [];
  detFacturaList: detFacturaData[] = [];
  selectedFacturacion: any = null;
  items: interfaceDetalleModel[] = [];
  ncflist: ModeloNcfData[] = [];
  selectedItem: any = null;
  totalGral: number = 0;
  totalItbis: number = 0;
  totalcosto: number = 0;
  costoGral: number = 0;
  subTotal: number = 0;
  subtotaltxt: string = '';
  existenciatxt: any;
  existtxt: any;
  medidatxt: any;
  costotxt: any;
  totalcostotxt: any;
  fecacttxt:any;
  itbitxt: string = '';
  totalgraltxt: string = '';
  txtFactura: string = '';
  txtFecha: string = '';
  txtNombre: string = '';
  atxt: any;
  btxt: any;
  ctxt: any;
  dtxt: any;
  etxt: any;
  ftxt: any;
  gtxt: any;
  factxt: any;
  protxt: any;
  descuentotxt: string = '';
  tiponcf: string = 'Consumidor Final';
  static detFactura: detFacturaData[];
  codmerc: string = '';
  descripcionmerc: string = '';
  cantidadmerc: number = 0;
  preciomerc: number = 0;
  //fecfactActual: Date; // Agregar este campo para la fecha
  productoselect!: ModeloInventarioData;
  precioform = new FormControl();
  cantidadform = new FormControl();
  isEditing: boolean = false;
  itemToEdit: any = null;
  index_item!: number;
  codnotfound: boolean = false;
  desnotfound: boolean = false;
  mensagePantalla: boolean = false;
  codmerVacio: boolean = false;
  desmerVacio: boolean = false;
  habilitarCampos: boolean = false;

  sucursales = [];
  sucursalSeleccionada: any = null;
  habilitarIcono: boolean = true;
  rncValue: string = '';
  cancelarBusquedaDescripcion: boolean = false;
  cancelarBusquedaCodigo: boolean = false;
  private numfacturaSubject = new BehaviorSubject<string>('');
  private nomclienteSubject = new BehaviorSubject<string>('');
  selectedRow: number = 0; // Para rastrear la fila seleccionada

  isDisabled: boolean = true;
  form: FormGroup;

get totalPages() {
  return Math.ceil(this.facturacionList.length / this.pageSize);
}

get paginatedData() {
  const startIndex = (this.currentPage - 1) * this.pageSize;
  return this.facturacionList.slice(startIndex, startIndex + this.pageSize);
}

  constructor(
    private fb: FormBuilder,
    private servicioFacturacion: ServicioFacturacion,
    private servicioCliente: ServicioCliente,
    private http: HttpInvokeService,
    private ServicioInventario: ServicioInventario,
    private ServicioUsuario: ServicioUsuario,
    private ServicioRnc: ServicioRnc,
    private ServicioSector: ServicioSector,
    private servicioFpago: ServicioFpago,
    private servicioNcf: ServicioNcf,
  ) {
    this.form = this.fb.group({
      fa_codVend: ['', Validators.required], // El campo es requerido
      // Otros campos...
    });

    this.crearFormularioFacturacion();


    this.nomclienteSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(nomcliente => {
        this.txtdescripcion = nomcliente;
        return this.servicioFacturacion.buscarFacturacion(this.currentPage, this.facturacionList.length, this.codigo, this.txtdescripcion);
      })
    ).subscribe(response => {
      this.facturacionList = response.data;
      this.totalItems = response.pagination.total;
      this.currentPage = response.pagination.page;
    });

    this.numfacturaSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(codigo => {
        this.txtFactura = codigo;
        return this.servicioFacturacion.buscarFacturacion(this.currentPage, this.facturacionList.length, this.codigo, this.txtdescripcion, this.txtFactura);
      })
    ).subscribe(response => {
      this.facturacionList = response.data;
      this.totalItems = response.pagination.total;
      this.currentPage = response.pagination.page;
    });

  }

  @ViewChild('buscarcodmercInput') buscarcodmercElement!: ElementRef;
  buscarNombre = new FormControl();
  resultadoNombre: ModeloClienteData[] = [];
  resultadoSector: ModeloSectorData[] = [];
  resultadoFpago: ModeloFpagoData[] = [];
  buscarSector = new FormControl();
  buscarFpago = new FormControl();
  selectedIndex = 1;
  selectedIndexsector = 1;
  buscarcodmerc = new FormControl();
  buscardescripcionmerc = new FormControl();
  // buscarcodmercElement = new FormControl();
  nativeElement = new FormControl();
  resultadoCodmerc: ModeloInventarioData[] = [];
  selectedIndexcodmerc = 1;
  selectedIndexfpago = 1;
  resultadodescripcionmerc: ModeloInventarioData[] = [];
  selectedIndexdescripcionmerc = 1;
  seleccionarFacturacion(facturacion: any) { this.selectedFacturacion = facturacion; }


  ngOnInit(): void {
    this.buscarTodasFacturacion();
    // this.servicioFacturacion.buscarTodasFacturacion().subscribe(response => {
    //   console.log('DATOS EN RESPONSE.DATA', response.data);
    //   this.facturacionList = response.data;
    //   console.log('DATOS EN FACTURACIONLIST', this.facturacionList)
    //   console.log(this.facturacionList.length)

    // }, error => {
    // console.error('Error al obtener facturas:', error);
    // });
     // $("#input1").focus();
    // $("#input1").select()
    this.obtenerNcf();
    this.obtenerfpago();
    this.buscardescripcionmerc.valueChanges.pipe(
      debounceTime(50),
      distinctUntilChanged(),
      tap(() => {
        this.resultadodescripcionmerc = [];
      }),
      filter((query: string) => query !== '' && !this.cancelarBusquedaDescripcion && !this.isEditing),
      switchMap((query: string) => this.http.GetRequest<ModeloInventario>(`/productos-buscador-desc/${query}`))
    ).subscribe((results: ModeloInventario) => {
      console.log(results.data);
      if (results) {
        if (Array.isArray(results.data) && results.data.length) {
          this.resultadodescripcionmerc = results.data;
          this.desnotfound = false;
        }
        else {
          this.desnotfound = true;
        }
      } else {
        this.resultadodescripcionmerc = [];
        this.desnotfound = false;
      }

    });

  this.buscarNombre.valueChanges.pipe(
  skip(1), // ignora el primer valor emitido
  debounceTime(500),
  distinctUntilChanged(),
  filter((query: string) => !!query && query.trim() !== ''),
  tap(() => {
    this.facturacionList = [];
    console.log("sdasdsa ")
  }),
  switchMap((query: string) =>
    this.http.GetRequest<FacturacionModelData>(`/facturacion-numero?page=${0}&limit=${0}/&nomcliente=${query}`)
  )
).subscribe((results: FacturacionModelData) => {
  console.log(results);
  this.facturacionList = Array.isArray(results) ? results : [];
});
    this.buscarSector.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      tap(() => {
        this.resultadoSector = [];
      }),
      filter((query: string) => query !== ''),
      switchMap((query: string) => this.http.GetRequest<ModeloSector>(`/sector-nombre/${query}`))
    ).subscribe((results: ModeloSector) => {
      console.log(results.data);
      if (results) {
        if (Array.isArray(results.data)) {
          this.resultadoSector = results.data;
        }
      } else {
        this.resultadoSector = [];
      }

    });


  }
obtenerfpago() {
    this.servicioFpago.obtenerTodosFpago().subscribe(response => {
      this.resultadoFpago = response.data;
    });
  }
obtenerNcf() {
    this.servicioNcf.buscarTodosNcf().subscribe(response => {
      this.ncflist = response.data;
    });
  }

  crearFormularioFacturacion() {
    const fechaActual = new Date();
    const fechaActualStr = this.formatofecha(fechaActual);
    this.formularioFacturacion = this.fb.group({
        fa_codFact: [{ value: '', disabled: true }],
        fa_fecFact: [{value: fechaActualStr, disabled: true}],
        fa_valFact: [''],
        fa_subFact: [''],
        fa_itbiFact: [''],
        fa_codClie: [''],
        fa_cosFact: [''],
        fa_nomClie: [{ value: '', disabled: true }],
        fa_rncFact: [{ value: '', disabled: true }],
        fa_telClie: [{ value: '', disabled: true }],
        fa_telClie2: [{ value: '', disabled: true }],
        fa_dirClie: [{ value: '', disabled: true }],
        fa_correo: [{ value: '', disabled: true }],
        fa_codVend: [{ value: '', disabled: true }],
        fa_nomVend: [{ value: '', disabled: true }],
        fa_status: [''],
        fa_sector: [{ value: '', disabled: true }],
        fa_codZona: [null],
        fa_desZona: [''],
        fa_fpago: [{ value: '', disabled: true }],
        fa_codfpago: ['1'],
        fa_envio: [{ value: '', disabled: true }],
        fa_ncfFact: [{value:'', disabled: true }],
        fa_tipoNcf: [{ value: '', disabled: true }],
        fa_contacto: [{ value: '', disabled: true }],
        fa_despacho: [{ value: '', disabled: true }],
        fa_reimpresa: [{ value: '', disabled: true }],
        fa_entrega: [{ value: '', disabled: true }],
        fa_impresa: [{ value: '', disabled: true }],
        fa_facturada: [{ value: '', disabled: true }],
      });

  }
  limpia(): void {
    //this.formularioFacturacion.reset();
    this.crearFormularioFacturacion();
      this.txtdescripcion = '';
      this.txtFactura = '';
      this.txtFecha = '';
   //   this.buscarTodasFacturaciomtimbresobre tim0
    this.botonEditar = true; // Deshabilita de nuevo
    this.botonGuardar = true; // Habilita el botón
   this.productoselect;
   this.codmerc = ""
   this.descripcionmerc = ""
   this.preciomerc = 0;
   this.cantidadmerc = 0;
   this.isEditing = false;
   this.items = [];          // Limpiar el array de items
    this.totalGral = 0;       // Reiniciar el total general
    this.totalItbis = 0;      // Reiniciar el total del ITBIS
    this.subTotal = 0;        // Reiniciar el subtotal
    this.totalcosto = 0;
    this.costoGral = 0;
    this.factxt = 0;

  // volver a ejecutar la lógica de inicio
  this.ngOnInit();
    this.actualizarTotales()
    $("#input1").focus();
    $("#input1").select();

  }


  editardetFacturacion(detFactura: detFacturaData) {
    this.facturacionid = detFactura.df_codFact;
  }
  editarFacturacion(Factura: FacturacionModelData) {
    this.facturacionid = Factura.fa_codFact;
    this.modoedicionFacturacion = true;
    this.formularioFacturacion.patchValue(Factura);
    this.tituloModalFacturacion = 'Editando Facturacion';
    $('#modalfacturacion').modal('show');
    this.habilitarFormulario = true;
    const inputs = document.querySelectorAll('.seccion-productos input');
    inputs.forEach((input) => {
      (input as HTMLInputElement).disabled = true;
    });
    // Limpiar los items antes de agregar los nuevos
    this.items = [];
    this.servicioFacturacion.buscarFacturaDetalle(Factura.fa_codFact).subscribe(response => {
      let subtotal = 0;
      let itbis = 0;
      let totalGeneral = 0;
      const itbisRate = 0.18; // Ejemplo: 18% de ITBIS
      response.data.forEach((item: any) => {
        const producto: ModeloInventarioData = {
          in_codmerc: item.df_codMerc,
          in_desmerc: item.df_desMerc,
          in_grumerc: '',
          in_tipoproduct: '',
          in_canmerc: 0,
          in_caninve: 0,
          in_fecinve: null,
          in_eximini: 0,
          in_cosmerc: 0,
          in_premerc: 0,
          in_precmin: 0,
       //   in_costpro: 0,
          in_ucosto: 0,
          in_porgana: 0,
          in_peso: 0,
          in_longitud: 0,
          in_unidad: 0,
          in_medida: 0,
          in_longitu: 0,
          in_fecmodif: null,
          in_amacen: 0,
          in_imagen: '',
          in_status: '',
          in_itbis: false,
          in_minvent: 0,
        };
        const cantidad = item.df_canMerc;
        const precio = item.df_preMerc;
        const totalItem = cantidad * precio;
        this.items.push({
          producto: producto,
          cantidad: cantidad,
          precio: precio,
          total: totalItem,
          fecfactActual: new Date(),
          costo:this.costotxt

        });
        //fecfactActual: new Date(),
        // Calcular el subtotal
        subtotal += totalItem;
        // Calcular ITBIS solo si el producto tiene ITBIS
        // if (item.dc_itbis) {
        this.totalItbis += totalItem * itbisRate;
        // }
      });
      // Calcular el total general (subtotal + ITBIS)
      totalGeneral = subtotal + this.totalItbis;
      // Asignar los totales a variables o mostrarlos en la interfaz
      this.subTotal = subtotal;
      this.totalItbis = this.totalItbis;
      this.totalGral = totalGeneral;
    });
  }

  buscarTodasFactura(page: number) {
    this.servicioFacturacion.buscarTodasFacturacion().subscribe(response => {
      console.log(response);
      this.facturacionList = response.data;
      console.log(this.facturacionList.length)
    });
  }
  consultarFacturacion(factura: FacturacionModelData) {
    this.modoconsultaFacturacion = true;
    this.formularioFacturacion.reset()
    this.crearFormularioFacturacion()
    this.formularioFacturacion.patchValue(factura);
    this.tituloModalFacturacion = 'Consulta Factura';
     // $('#modalfacturacion').modal('show');
    this.habilitarFormulario = true;
    this.formularioFacturacion.disable();
    console.log("ff",factura)
    this.habilitarIcono = false;
    this.botonEditar = false; // Habilita el botón
    this.botonGuardar = true; // Habilita el botón

    const inputs = document.querySelectorAll('.seccion-productos input');
    inputs.forEach((input) => {(input as HTMLInputElement).disabled = true;
    });
    // Limpiar los items antes de agregar los nuevos
    this.totalItbis = 0;

    this.items = [];
    this.servicioFacturacion.buscarFacturaDetalle(factura.fa_codFact).subscribe(response => {
      let subtotal = 0;
      let itbis = 0;
      let totalGeneral = 0;
      let totalcosto = 0;
      const itbisRate = 0.18; // Ejemplo: 18% de ITBIS
      response.data.forEach((item: any) => {
        const producto: ModeloInventarioData = {
          in_codmerc: item.df_codMerc,
          in_desmerc: item.df_desMerc,
          in_grumerc: '',
          in_tipoproduct: '',
          in_canmerc: 0,
          in_caninve: 0,
          in_fecinve: null,
          in_eximini: 0,
          in_cosmerc: 0,
          in_premerc: 0,
          in_precmin: 0,
          //  in_costpro: 0,
          in_ucosto: 0,
          in_porgana: 0,
          in_peso: 0,
          in_longitud: 0,
          in_unidad: 0,
          in_medida: 0,
          in_longitu: 0,
          in_fecmodif: null,
          in_amacen: 0,
          in_imagen: '',
          in_status: '',
          in_itbis: false,
          in_minvent: 0,
        };
        const cantidad = item.df_canMerc;
        const precio = item.df_preMerc;
        const totalItem = cantidad * precio;
        const costoItem = item.df_cosMerc;
        this.items.push({
          producto: producto,
          cantidad: cantidad,
          precio: precio,
          total: totalItem,
          costo: costoItem,
          fecfactActual: new Date(),

          //costo:0
        });
        // Calcular el subtotal
        subtotal += costoItem;
        // Calcular ITBIS solo si el producto tiene ITBIS
        // if (item.dc_itbis) {
        this.totalItbis += totalItem * itbisRate;
      });
      // Calcular el total general (subtotal + ITBIS)
      totalGeneral = subtotal + this.totalItbis;
     // totalcosto += costoItem;
      // Asignar los totales a variables o mostrarlos en la interfaz
      this.subTotal = subtotal;
      this.totalItbis = this.totalItbis;
      this.totalGral = totalGeneral;
      this.factxt = (factura.fa_valFact - factura.fa_cosFact) * 100/ factura.fa_cosFact;
      this.actualizarTotales();
    });
  }

  eliminarFacturacion(facturacionId: string) {
    Swal.fire({
      title: '¿Está seguro de eliminar este Facturacion?',
      text: "¡No podrá revertir esto!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si, eliminar!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.servicioFacturacion.eliminarFacturacion(facturacionId).subscribe(response => {
          Swal.fire(
            {
              title: "Excelente!",
              text: "Factura eliminada correctamente.",
              icon: "success",
              timer: 2000,
              showConfirmButton: false,
            }
          )
          this.buscarTodasFacturacion();
        });
      }
    })
  }
 editarFactura() {
    console.log("Modo edición activado");
    this.botonEditar = true; // Deshabilita de nuevo
    this.botonGuardar = false; // Habilita el botón
   this.habilitarIcono = true;
   this.formularioFacturacion.enable();
   this.formularioFacturacion.get('fa_codFact')?.disable();
   this.formularioFacturacion.get('fa_fecFact')?.disable();
   this.formularioFacturacion.get('fa_ncfFact')?.disable();
   this.formularioFacturacion.get('fa_codVend')?.disable();
   this.formularioFacturacion.get('fa_nomVend')?.disable();
    this.formularioFacturacion.get('fa_entrega')?.disable();
    this.formularioFacturacion.get('fa_impresa')?.disable();
   this.formularioFacturacion.get('fa_facturada')?.disable();



  }
  formatofecha(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Los meses son 0-indexados, se agrega 1 y se llena con ceros
    const day = date.getDate().toString().padStart(2, '0'); // Se llena con ceros si es necesario
    return `${day}/${month}/${year}`;
  }

  crearformulariodetFactura() {
    this.formulariodetFactura = this.fb.group({

      df_codFact: ['',],
      df_fecFact: ['',],
      df_codMerc: ['',],
      df_desMerc: ['',],
      df_canMerc: ['',],
      df_preMerc: ['',],
      df_valMerc: ['',],
      df_unidad: ['',],
      df_cosMerc: ['',],
      df_codClie: ['',],
      df_status: ['',],
    });
  }

  buscarTodasFacturacion() {
    this.servicioFacturacion.buscarTodasFacturacion().subscribe(response => {
      this.facturacionList = response.data;
    });
  }
// buscarTodasFacturacion() {
//   this.servicioFacturacion.buscarTodasFacturacion().subscribe(data => {
//     this.facturacionList = data;
//     console.log(data);
//   });
// }





  buscaNombre(event: Event) {
    const c_nomClie = event.target as HTMLInputElement;
    this.nomclienteSubject.next(c_nomClie.value.toUpperCase());
  }

  buscaFactura(event: Event) {
    const c_codFact = event.target as HTMLInputElement;
    this.servicioFacturacion.buscarFacturacion(0, 0,c_codFact.value).subscribe((resultado)=>{
      this.facturacionList= resultado.data
    })
  }



  buscaFecha(event: Event) {
  const input = event.target as HTMLInputElement;
  const fechaStr = input.value; // ← ya es "2025-06-27"

  this.servicioFacturacion.buscarFacturacion(0, 0, "", "", fechaStr).subscribe((resultado) => {
    this.facturacionList = resultado.data;
  });
}
// buscaFecha(event: Event) {
//   const c_fecFact = event.target as HTMLInputElement;
//   const fechaStr = c_fecFact.value; // Ejemplo: "2025-06-27"

//   const [year, month, day] = fechaStr.split('-').map(Number); // divide manualmente
//   const fechaDate = new Date(year, month - 1, day); // Date en zona local

//   const fechaFormateada = this.formatofecha(fechaDate);

//   this.servicioFacturacion.buscarFacturacion(0, 0, "", "", fechaFormateada)
//     .subscribe((resultado) => {
//       this.facturacionList = resultado.data;
//     });
//}
  convertToUpperCase(event: Event): void {
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.toUpperCase();
    if (start !== null && end !== null) {
      input.setSelectionRange(start, end);
    }
  }

   moveFocus(event: KeyboardEvent, nextElement: HTMLInputElement | HTMLSelectElement) {
    if (event.key === 'Enter' && nextElement) {
      event.preventDefault(); // Evita el comportamiento predeterminado del Enter
      nextElement.focus(); // Enfoca el siguiente campo
    }
  }

  moveFocuscodmerc(event: KeyboardEvent, nextInput: HTMLInputElement) {
    console.log("move focus")
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault(); // Previene el comportamiento predeterminado de Enter
      // const currentControl = this.formularioFacturacion.get('ct_codvend');
      const currentInputValue = (event.target as HTMLInputElement).value.trim();
      if (currentInputValue === '') {
        this.codmerVacio = true;
        console.log("vacio")
      }
      else {
        this.codmerVacio = false;
      }
      if (!this.codnotfound === false) {
        console.log(this.codnotfound);
        this.mensagePantalla = true;
        Swal.fire({
          icon: "error",
          title: "A V I S O",
          text: 'Codigo invalido.',
          focusConfirm: true,
          allowEnterKey: true,
        }).then(() => { this.mensagePantalla = false });
        this.codmerVacio = false;
        this.codnotfound = false;
        this.codmerc = ""
        this.descripcionmerc = ""
        return;
      }
      else {
        if (this.codmerVacio === true) {
          nextInput.focus();
          this.codmerVacio = false;
          console.log("vedadero");
        }
        else {
          $("#input8").focus();
          $("#input8").select();
        }
        this.codmerVacio = false;
      }
    }
  }
  handleKeydownInventario(event: KeyboardEvent): void {
    console.log("handle")
    const key = event.key;
    const maxIndex = this.resultadoCodmerc.length - 1;
    if (this.resultadoCodmerc.length === 1) {
      this.selectedIndexcodmerc = 0;
      console.log("prueba")
    }

    if (key === 'ArrowDown') {
      this.selectedIndexcodmerc = this.selectedIndexcodmerc < maxIndex ? this.selectedIndexcodmerc + 1 : 0;
      event.preventDefault();
    }
    else
      if (key === 'ArrowUp') {
        this.selectedIndexcodmerc = this.selectedIndexcodmerc > 0 ? this.selectedIndexcodmerc - 1 : maxIndex;
        event.preventDefault();
      }
      else if (key === 'Enter') {
        if (this.selectedIndexcodmerc >= 0 && this.selectedIndexcodmerc <= maxIndex) {
          this.cargarDatosInventario(this.resultadoCodmerc[this.selectedIndexcodmerc]);
        }
        event.preventDefault();
      }
  }
  cargarDatosInventario(inventario: ModeloInventarioData) {
    console.log(inventario);
    this.resultadoCodmerc = [];
    this.resultadodescripcionmerc = [];
    this.codmerc = inventario.in_codmerc;
    this.preciomerc = inventario.in_premerc
    this.descripcionmerc = inventario.in_desmerc;
    this.existenciatxt = inventario.in_canmerc
    this.costotxt = inventario.in_cosmerc;
    this.medidatxt= inventario.in_medida;
    this.fecacttxt= inventario.in_fecmodif;
    this.atxt = Number(inventario.in_cosmerc) + (Number(inventario.in_cosmerc)  * 5)/ 100;
    this.btxt = Number(inventario.in_cosmerc) + (Number(inventario.in_cosmerc)  * 7)/100;
    this.ctxt = Number(inventario.in_cosmerc) + (Number(inventario.in_cosmerc)  * 10)/100;
    this.dtxt = Number(inventario.in_cosmerc) + (Number(inventario.in_cosmerc)  * 12)/100;
    this.etxt = Number(inventario.in_cosmerc) + (Number(inventario.in_cosmerc)  * 14)/100;
    this.ftxt = Number(inventario.in_cosmerc) + (Number(inventario.in_cosmerc)  * 16)/100;
    this.gtxt = Number(inventario.in_cosmerc) + (Number(inventario.in_cosmerc)  * 18)/100;

    this.productoselect = inventario;
    this.cancelarBusquedaDescripcion = true;
    this.cancelarBusquedaCodigo = true;
    this.formularioFacturacion.patchValue({
      df_codMerc: inventario.in_codmerc,
      df_desMerc: inventario.in_desmerc,
      df_canMerc: inventario.in_canmerc,
      df_preMerc: inventario.in_premerc,
      df_cosMerc: inventario.in_cosmerc,
      df_unidad: inventario.in_unidad,
    });
    $("#input8").focus();
    $("#input8").select();
  }

  buscarUsuario(event: Event, nextElement: HTMLInputElement | null): void {
    event.preventDefault();
    const claveUsuario = this.formularioFacturacion.get('fa_codVend')?.value;
    if (claveUsuario) {
      this.ServicioUsuario.buscarUsuarioPorClave(claveUsuario).subscribe(
        (usuario) => {
          if (usuario.data.length) {
            this.formularioFacturacion.patchValue({ fa_nomVend: usuario.data[0].idUsuario });
            nextElement?.focus()
          } else {
            this.mensagePantalla = true;
            Swal.fire({
              icon: "error",
              title: "A V I S O",
              text: 'Codigo de usuario invalido.',
            }).then(() => { this.mensagePantalla = false });
            return;
          }
        },
      );
    }
    else {
      this.mensagePantalla = true;
      Swal.fire({
        icon: "error",
        title: "A V I S O",
        text: 'Codigo de usuario invalido.',
      }).then(() => { this.mensagePantalla = false });
      return;
    }
  }
  buscarRnc(event: Event, nextElement: HTMLInputElement | null): void {
    event.preventDefault();
    const rnc = this.formularioFacturacion.get('fa_rncFact')?.value;
    if (!rnc) {
      this.obtenerNcf();
      this.formularioFacturacion.patchValue({ fa_tipoNcf: 1 });
      this.formularioFacturacion.get("fa_tipoNcf")?.disable();
      // Si no se ha ingresado un RNC, pasamos el foco al siguiente elemento
      console.log('RNC vacío.');
      console.log(this.formularioFacturacion.value);
      nextElement?.focus();
      return;
    }

    // Validar longitud del RNC
    if (rnc.length !== 9 && rnc.length !== 11) {
      this.mostrarMensajeError('RNC inválido.');
      console.log(rnc.length);
      return;
    }
    // Buscar RNC en el servicio
    this.ServicioRnc.buscarRncPorId(rnc).subscribe(
    (response) => {
    if (response?.data?.length) {
      // Si se encuentra el RNC, asignar el nombre del cliente
      const nombreEmpresa = response.data[0]?.rason;
      this.formularioFacturacion.patchValue({ fa_nomClie: nombreEmpresa });
      this.formularioFacturacion.patchValue({ fa_tipoNcf: 2 });
      this.formularioFacturacion.get("fa_tipoNcf")?.enable();
      this.ncflist = this.ncflist.filter(ncf => ncf.codNcf !== 1);
      $("#input3").focus();
      $("#input3").select();
    }
    else {
      // Si no se encuentra el RNC, mostrar error
      this.mostrarMensajeError('RNC inválido.');
      console.log('RNC no encontrado.');
    }
    }

  );
  }



  mostrarMensajeError(mensaje: string): void {
    this.mensagePantalla = true;

    Swal.fire({
      icon: "error",
      title: "A V I S O",
      text: mensaje,
    }).then(() => { this.mensagePantalla = false });
  }

  handleKeydown(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadoNombre.length - 1;  // Ajustamos el límite máximo
    if (this.resultadoNombre.length === 1) {
      this.selectedIndex = 0;
      console.log("prueba")
    }

    if (key === 'ArrowDown') {

      // Mueve la selección hacia abajo
      if (this.selectedIndex < maxIndex) {
        this.selectedIndex++;
      } else {
        this.selectedIndex = 0;  // Vuelve al primer ítem
      }
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      console.log("paso 677");

      // Mueve la selección hacia arriba
      if (this.selectedIndex > 0) {
        this.selectedIndex--;
      } else {
        this.selectedIndex = maxIndex;  // Vuelve al último ítem
      }
      event.preventDefault();
    } else if (key === 'Enter') {
      // Selecciona el ítem actual
      if (this.selectedIndex >= 0 && this.selectedIndex <= maxIndex) {
        this.cargarDatosCliente(this.resultadoNombre[this.selectedIndex]);
      }
      event.preventDefault();
    }
  }
  handleKeydownSector(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadoSector.length - 1;  // Ajustamos el límite máximo
    if (this.resultadoSector.length === 1) {
      this.selectedIndexsector = 0;
      console.log("prueba")
    }
    if (key === 'ArrowDown') {

      // Mueve la selección hacia abajo
      if (this.selectedIndexsector < maxIndex) {
        this.selectedIndex++;
      } else {
        this.selectedIndexsector = 0;  // Vuelve al primer ítem
      }
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      console.log("paso 677");

      // Mueve la selección hacia arriba
      if (this.selectedIndexsector > 0) {
        this.selectedIndex--;
      } else {
        this.selectedIndexsector = maxIndex;  // Vuelve al último ítem
      }
      event.preventDefault();
    } else if (key === 'Enter') {
      // Selecciona el ítem actual
      if (this.selectedIndexsector >= 0 && this.selectedIndexsector <= maxIndex) {
        this.cargarDatosSector(this.resultadoSector[this.selectedIndexsector]);
      }
      event.preventDefault();
    }
  }
  handleKeydownFpago(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadoFpago.length - 1;  // Ajustamos el límite máximo

    if (this.resultadoFpago.length === 1) {
      this.selectedIndexfpago = 0;
      console.log("prueba")
    }

    if (key === 'ArrowDown') {

      // Mueve la selección hacia abajo
      if (this.selectedIndexfpago < maxIndex) {
        this.selectedIndexfpago++;
      } else {
        this.selectedIndexfpago = 0;  // Vuelve al primer ítem
      }
      event.preventDefault();
    } else if (key === 'ArrowUp') {

      // Mueve la selección hacia arriba
      if (this.selectedIndexfpago > 0) {
        this.selectedIndexfpago--;
      } else {
        this.selectedIndexfpago = maxIndex;  // Vuelve al último ítem
      }
      event.preventDefault();
    } else if (key === 'Enter') {
      // Selecciona el ítem actual
      if (this.selectedIndex >= 0 && this.selectedIndexfpago <= maxIndex) {
        this.cargarDatosFpago(this.resultadoFpago[this.selectedIndexfpago]);
      }
      event.preventDefault();
    }
  }
  handleKeydownInventariosdesc(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadodescripcionmerc.length;
    if (this.resultadodescripcionmerc.length === 1) {
      this.selectedIndexdescripcionmerc = 0;
      console.log("prueba")
    }
    if (key === 'ArrowDown') {
      // Mueve la selección hacia abajo
      this.selectedIndexdescripcionmerc = this.selectedIndexdescripcionmerc < maxIndex ? this.selectedIndexdescripcionmerc + 1 : 0;
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      // Mueve la selección hacia arriba
      this.selectedIndexdescripcionmerc = this.selectedIndexdescripcionmerc > 0 ? this.selectedIndexdescripcionmerc - 1 : maxIndex;
      event.preventDefault();
    } else if (key === 'Enter') {
      // Selecciona el ítem actual
      if (this.selectedIndexdescripcionmerc >= 0 && this.selectedIndexdescripcionmerc <= maxIndex) {
        this.cargarDatosInventario(this.resultadodescripcionmerc[this.selectedIndexdescripcionmerc]);
      }
      event.preventDefault();
    }
  }
  moveFocusdesc(event: KeyboardEvent, nextInput: HTMLInputElement) {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault(); // Previene el comportamiento predeterminado de Enter
      const currentInputValue = (event.target as HTMLInputElement).value.trim();
      if (currentInputValue === '') {
        this.desmerVacio = true;
      };

      if (!this.desnotfound === false) {
        this.mensagePantalla = true;
        Swal.fire({
          icon: "error",
          title: "A V I S O",
          text: 'Codigo invalido.',
        }).then(() => { this.mensagePantalla = false });
        this.desnotfound = true
        return;
      }
      else {
        if (this.desmerVacio === true) {
          this.mensagePantalla = true;
          Swal.fire({
            icon: "error",
            title: "A V I S O",
            text: 'Codigo invalido.',
          }).then(() => { this.mensagePantalla = false });
          this.desnotfound = true
          return;
        }
        else {
          $("#input8").focus();
          $("#input8").select();
        }
        this.desmerVacio = false;
      }
    }
  }
  moveFocusCantidad(event: KeyboardEvent, nextInput: HTMLInputElement) {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      if (!this.productoselect || this.cantidadmerc <= 0) {
        this.mensagePantalla = true;
        Swal.fire({
          icon: "error",
          title: "A V I S O",
          text: 'Por favor complete todos los campos requeridos antes de agregar el ítem.',
        }).then(() => { this.mensagePantalla = false });
        return;
      }
      else {
        // nextInput.focus();
        $("#input9").focus();
        $("#input9").select();
      }
    }
  }
  moveFocusPrecio(event: KeyboardEvent, nextInput: HTMLInputElement) {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      if (!this.productoselect || this.preciomerc <= 0 || this.preciomerc <= this.productoselect.in_cosmerc) {
        this.mensagePantalla = true;
        Swal.fire({
          icon: "error",
          title: "A V I S O",
          text: 'Por favor complete todos los campos requeridos antes de agregar el ítem.',
        }).then(() => { this.mensagePantalla = false });
        return;
      }
      else {
        // nextInput.focus();
        $("#input13").focus();
        $("#input13").select();
      }
    }
  }
  moveFocusnomclie(event: Event, nextInput: HTMLInputElement) {
    event.preventDefault();
    console.log(nextInput);
    if (event.target instanceof HTMLInputElement) {
      if (!event.target.value) {
        this.mensagePantalla = true;
        Swal.fire({
          icon: "error",
          title: "A V I S O",
          text: 'Por favor complete el campo Nombre del Cliente Para Poder continual.',
        }).then(() => { this.mensagePantalla = false });

      }
      else {
        nextInput.focus(); // Si es válido, mueve el foco al siguiente input
      }
    }
  }
  cargarDatosCliente(cliente: ModeloClienteData) {
    this.resultadoNombre = [];
    this.buscarNombre.reset();
    if (cliente.cl_nomClie !== "") {
      console.log(this.resultadoNombre)
      this.formularioFacturacion.patchValue({
        fa_codClie: cliente.cl_codClie,
        fa_nomClie: cliente.cl_nomClie,
        fa_rncFact: cliente.cl_rnc,
        fa_telClie: cliente.cl_telClie,
        fa_dirClie: cliente.cl_dirClie,
        fa_codZona: cliente.cl_codZona,
        fa_sector: cliente.cl_codSect,
      });
      console.log(cliente)
      console.log('Formulario actualizado:', this.formularioFacturacion.value);
    }
  }

  cargarDatosSector(sector: ModeloSectorData) {
    this.resultadoNombre = [];
    this.buscarSector.reset();
    if (sector.se_desSect !== "") {
      console.log(this.resultadoSector)
      this.formularioFacturacion.patchValue({
        fa_codSect: sector.se_codSect,
        fa_sector: sector.se_desSect,
        fa_codZona: sector.se_codZona,
      });
      console.log(sector)
    }
  }
  cargarDatosFpago(fpago: ModeloFpagoData) {
    this.resultadoFpago = [];
    this.buscarFpago.reset();
    if (fpago.fp_descfpago !== "") {
      console.log(this.resultadoFpago)
      this.formularioFacturacion.patchValue({
        fa_fpago: fpago.fp_descfpago,
        fa_codfpago: fpago.fp_codfpago,
      });
    }
  }

  moveFocusFpago(event: Event, nextInput: HTMLInputElement | HTMLSelectElement) {
   // KeyboardEvent, element: HTMLInputElement | HTMLSelectElement
    event.preventDefault();
    if (event.target instanceof  HTMLSelectElement) {
      if (!event.target.value) {
        this.mensagePantalla = true;
        Swal.fire({
          icon: "error",
          title: "A V I S O",
          text: 'Por favor complete el campo Tipo de Pago.',
        }).then(() => { this.mensagePantalla = false });
      }
      else {
        nextInput.focus(); // Si es válido, mueve el foco al siguiente input
      }
    }
  }

  agregaItem(event: Event) {
    event.preventDefault();
    if (!this.productoselect || this.cantidadmerc <= 0 || this.preciomerc <= 0 || this.preciomerc <= this.productoselect.in_cosmerc) {
      this.mensagePantalla = true;
      Swal.fire({
        icon: "error",
        title: "A V I S O",
        text: 'Por favor complete todos los campos requeridos antes de agregar el ítem.',
      }).then(() => { this.mensagePantalla = false });
      return;
    }
    const fechaActual = new Date(); // Obtiene la fecha actual
    if (this.isEditing) {
      // Actualizar el ítem existente
      this.itemToEdit.producto = this.productoselect;
      this.itemToEdit.codmerc = this.codmerc;
      this.itemToEdit.descripcionmerc = this.descripcionmerc;
      this.itemToEdit.precio = this.preciomerc;
      this.itemToEdit.cantidad = this.cantidadmerc;
      this.itemToEdit.total = this.cantidadmerc * this.preciomerc;
      this.itemToEdit.totalcosto += this.costotxt * this.cantidadmerc;
      this.itemToEdit.fecfactActual = fechaActual; // Actualiza la fecha del ítem existente
      // Actualizar los totales
      this.actualizarTotales();
      // Restablecer el estado de edición
      this.isEditing = false;
      this.itemToEdit = null;
    }
    else {
      const total = this.cantidadmerc * this.preciomerc;
      this.totalGral += total;
      const itbis = total * 0.18;
      this.totalItbis += itbis;
      this.subTotal += total - itbis;
      const tcosto = this.costotxt * this.cantidadmerc;
      this.totalcosto += this.costotxt * this.cantidadmerc;
      this.factxt = (this.totalGral - this.totalcosto) * 100/ this.totalcosto;
      this.protxt = ( this.preciomerc - this.costotxt) * 100/ this.costotxt;
      this.items.push({
      producto: this.productoselect, cantidad: this.cantidadmerc, precio: this.preciomerc, total, costo: tcosto , fecfactActual: fechaActual, // Agrega la fecha actual al nuevo ítem
      })
      this.actualizarTotales();
      this.cancelarBusquedaDescripcion = false;
      this.cancelarBusquedaCodigo = false;
    }
    this.limpiarCampos();
  }
  actualizarCalculo() {
    this.protxt = (this.preciomerc - this.costotxt) * 100/ this.costotxt; // Aquí puedes hacer cualquier cálculo
  }
  limpiarCampos() {
    this.productoselect;
    this.codmerc = ""
    this.descripcionmerc = ""
    this.preciomerc = 0;
    this.cantidadmerc = 0;
    this.isEditing = false;
    this.existenciatxt= 0;
    this.costotxt= 0;
    this.medidatxt= 0;
    this.fecacttxt= " ";
    this.atxt =0;
    this.btxt =0;
    this.ctxt =0;
    this.dtxt =0;
    this.etxt =0;
    this.ftxt =0;
    this.gtxt =0;
    this.protxt =0;
  }

  limpiarTabla() {
    this.items = [];          // Limpiar el array de items
    this.totalGral = 0;       // Reiniciar el total general
    this.totalItbis = 0;      // Reiniciar el total del ITBIS
    this.subTotal = 0;        // Reiniciar el subtotal
  }

  // borarItem(item: any) {
  //   const index = this.items.indexOf(item);
  //   if (index > -1) {
  //     this.totalGral -= item.total;

  //     // Calcular el itbis del ítem eliminado y restarlo del total itbis
  //     const itbis = item.total * 0.18;
  //     this.totalItbis -= itbis;

  //     // Restar el subtotal del ítem eliminado
  //     this.subTotal -= (item.total - itbis);

  //     // Eliminar el ítem de la lista
  //     this.items.splice(index, 1);
  //   }
  // }
  borarItem(item: any) {
  const index = this.items.indexOf(item);
  if (index > -1) {
    this.items.splice(index, 1);
    this.items = [...this.items]; // 💡 TRUCO CLAVE
    this.recalcularTotales();
  }
}


recalcularTotales() {
  this.totalGral = 0;
  this.totalItbis = 0;
  this.subTotal = 0;

  for (const item of this.items) {
    const itbis = item.total * 0.18 / 1.18; // si total incluye ITBIS
    const subtotal = item.total - itbis;

    this.totalItbis += itbis;
    this.subTotal += subtotal;
    this.totalGral += item.total;
  }
}

  editarItem(item: any) {
    this.index_item = this.items.indexOf(item);


    this.isEditing = true;
    this.itemToEdit = item;

    this.productoselect = item.producto;
    this.codmerc = item.producto.in_codmerc;
    this.descripcionmerc = item.producto.in_desmerc;
    this.preciomerc = item.precio
    this.cantidadmerc = item.cantidad
    this.existenciatxt = item.producto.in_canmerc;
    this.costotxt = item.producto.in_cosmerc;
  }
  actualizarTotales() {
    this.totalGral  = this.items.reduce((sum, item) => sum + item.total, 0);
    this.totalItbis = this.items.reduce((sum, item) => sum + (item.total * 0.18), 0);
    this.subTotal   = this.items.reduce((sum, item) => sum + (item.total - (item.total * 0.18)), 0);
    this.totalcosto = this.items.reduce((sum, item) => sum + (this.costotxt * item.cantidad), 0);
    const formatCurrency = (value: number) => value.toLocaleString('es-DO', {
      style: 'currency',
      currency: 'DOP',
    });
    this.subtotaltxt = formatCurrency(this.subTotal);
    this.itbitxt = formatCurrency(this.totalItbis);
    this.totalgraltxt = formatCurrency(this.totalGral);

  }
  // guardarFacturacion() {
  //   const date = new Date();
  //   this.formularioFacturacion.get('fa_valFact')?.patchValue(this.totalGral);
  //   this.formularioFacturacion.get('fa_itbiFact')?.patchValue(this.totalItbis);
  //   this.formularioFacturacion.get('fa_cosFact')?.patchValue(this.totalcosto);
  //   this.formularioFacturacion.get('fa_subFact')?.patchValue(this.subTotal);
  //   this.formularioFacturacion.get("fa_tipoNcf")!.enable();
  //   this.formularioFacturacion.get('fa_codFact')!.enable();
  //   this.formularioFacturacion.get('fa_fecFact')!.enable();
  //   this.formularioFacturacion.get('fa_nomVend')!.enable();
  //   this.formularioFacturacion.get('fa_ncfFact')!.enable();
  //   const payload = {
  //     factura: this.formularioFacturacion.value,
  //     detalle: this.items,
  //   };
  //   if (this.formularioFacturacion.valid) {
  //     if (this.formularioFacturacion.valid) {
  //       this.servicioFacturacion.guardarFacturacion(payload).subscribe(response => {
  //         Swal.fire({
  //           title: "Excelente!",
  //           text: "Facturacion creada correctamente.",
  //           icon: "success",
  //           timer: 1000,
  //           showConfirmButton: false,
  //         });
  //         this.buscarTodasFacturacion();
  //         this.formularioFacturacion.reset();
  //         this.crearFormularioFacturacion();
  //         this.formularioFacturacion.enable();
  //         this.limpia();
  //       });
  //     } else {
  //   }
  //   }else {
  //     alert("Esta Factura no fue Guardado");
  //   }

  // }
  guardarFacturacion() {
  const codFact = this.formularioFacturacion.get('fa_codFact')?.value;

  // Asignar totales al formulario
  this.formularioFacturacion.patchValue({
    fa_valFact: this.totalGral,
    fa_itbiFact: this.totalItbis,
    fa_cosFact: this.totalcosto,
    fa_subFact: this.subTotal
  });
  this.formularioFacturacion.get('fa_valFact')?.patchValue(this.totalGral);
     this.formularioFacturacion.get('fa_itbiFact')?.patchValue(this.totalItbis);
     this.formularioFacturacion.get('fa_cosFact')?.patchValue(this.totalcosto);
     this.formularioFacturacion.get('fa_subFact')?.patchValue(this.subTotal);

  this.formularioFacturacion.get("fa_tipoNcf")!.enable();
    this.formularioFacturacion.get('fa_codFact')!.enable();
    this.formularioFacturacion.get('fa_fecFact')!.enable();
    this.formularioFacturacion.get('fa_nomVend')!.enable();
    this.formularioFacturacion.get('fa_ncfFact')!.enable();
  const payload = {
    factura: this.formularioFacturacion.value,
    detalle: this.items,
  };

  if (this.formularioFacturacion.valid) {
    if (codFact) {
      // 🔁 Modo edición
      this.servicioFacturacion.editarFacturacion(payload).subscribe(response => {
        Swal.fire({
          title: "Actualizado!",
          text: "Factura modificada correctamente.",
          icon: "success",
          timer: 1000,
          showConfirmButton: false,
        });
        this.refrescarFormulario();
      });
    } else {
      // 🆕 Modo creación
      this.servicioFacturacion.guardarFacturacion(payload).subscribe(response => {
        Swal.fire({
          title: "Excelente!",
          text: "Factura creada correctamente.",
          icon: "success",
          timer: 1000,
          showConfirmButton: false,
        });
        this.refrescarFormulario();
      });
    }
  } else {
    alert("Esta Factura no fue guardada");
  }
}

refrescarFormulario() {
  this.buscarTodasFacturacion();
  this.formularioFacturacion.reset();
  this.crearFormularioFacturacion();
  this.formularioFacturacion.enable();
  this.limpia();
}

  navigateTable(event: KeyboardEvent) {
    const key = event.key;

    if (key === 'ArrowDown') {
      // Mueve hacia abajo en la tabla
      if (this.selectedRow < this.items.length - 1) {
        this.selectedRow++;
        this.selectRow(this.selectedRow);
      }
    } else if (key === 'ArrowUp') {
      // Mueve hacia arriba en la tabla
      if (this.selectedRow > 0) {
        this.selectedRow--;
        this.selectRow(this.selectedRow);
      }
    }
  }

  selectRow(index: number) {
    this.selectedRow = index; // Selecciona la fila cuando se hace clic
    this.selectedItem = this.items[index];
    console.log(this.selectedItem);
    this.calcularPorcentaje();
  }

  calcularPorcentaje(): void {
      this.protxt  = (this.selectedItem.total - this.selectedItem.costo)*100/this.selectedItem.costo;
  }

  ngAfterViewInit() {
    // Establece el foco en la tabla cuando se cargue la vista
    this.Tabladetalle.nativeElement.focus();
  }

  formatNumber(value: any): string {
    let num = Number(value);
    if (isNaN(num)) {
      return ' ';
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: 2 });
  }


  generatePDF(factura: FacturacionModelData) {
    console.log(factura);
    this.servicioFacturacion.buscarFacturaDetalle(factura.fa_codFact).subscribe(response => {
      let subtotal = 0;
      let itbis = 0;
      let totalGeneral = 0;
      const itbisRate = 0.18; // Ejemplo: 18% de ITBIS
      response.data.forEach((item: any) => {
        const producto: ModeloInventarioData = {
          in_codmerc: item.dc_codmerc,
          in_desmerc: item.dc_descrip,
          in_grumerc: '',
          in_tipoproduct: '',
          in_canmerc: 0,
          in_caninve: 0,
          in_fecinve: null,
          in_eximini: 0,
          in_cosmerc: 0,
          in_premerc: 0,
          in_precmin: 0,
         // in_costpro: 0,
          in_ucosto: 0,
          in_porgana: 0,
          in_peso: 0,
          in_longitud: 0,
          in_unidad: 0,
          in_medida: 0,
          in_longitu: 0,
          in_fecmodif: null,
          in_amacen: 0,
          in_imagen: '',
          in_status: '',
          in_itbis: false,
          in_minvent: 0,
        };
        const cantidad = item.dc_canmerc;
        const precio = item.dc_premerc;
        const totalItem = cantidad * precio;
        this.items.push({
          producto: producto,
          cantidad: cantidad,
          precio: precio,
          total: totalItem,
          fecfactActual: new Date(),
          costo: 0,


        });
        // Calcular el subtotal
        subtotal += totalItem;
        // Calcular ITBIS solo si el producto tiene ITBIS
        // if (item.dc_itbis) {
        this.totalItbis += totalItem * itbisRate;
        // }

      });
      // Calcular el total general (subtotal + ITBIS)
      totalGeneral = subtotal + this.totalItbis;
      // Asignar los totales a variables o mostrarlos en la interfaz
      this.subTotal = subtotal;
      this.totalItbis = this.totalItbis;
      this.totalGral = totalGeneral;


      const formatCurrency = (value: number) => value.toLocaleString('es-DO', {
        style: 'currency',
        currency: 'DOP',
      });


      const doc = new jsPDF();

      const imgData = 'assets/logo2.png';  // Asegúrate de usar una ruta válida o base64

      const imgWidth = 20;  // Ancho de la imagen
      const imgHeight = 20;  // Alto de la imagen

      // Cálculo para centrar la imagen
      const pageWidth = doc.internal.pageSize.getWidth();
      const imgX = (pageWidth - imgWidth) / 2;  // Posición X centrada

      // Agregar el logo centrado
      doc.addImage(imgData, 'PNG', imgX, 10, imgWidth, imgHeight);  // (x, y, ancho, alto)


      // Título y detalles del negocio
      doc.setFontSize(16);
      doc.text('CENTRAL HIERRO, SRL', 105, 40, { align: 'center' });
      doc.setFontSize(10);
      doc.text('#172 Esq. Albert Thomas', 105, 47, { align: 'center' });
      doc.text('809-384-2000, 809-384-200', 105, 52, { align: 'center' });
      doc.text('1-30-29922-6', 105, 57, { align: 'center' });

      // Cotización
      doc.setFontSize(14);
      doc.text('FACTURA', 105, 70, { align: 'center' });

      // Detalles de la cotización
      doc.setFontSize(10);
      doc.text(`No. ${factura.fa_codFact}`, 14, 80);
      doc.text(`Fecha: ${factura.fa_fecFact}`, 14, 85);
      doc.text(`Vendedido por: ${factura.fa_nomVend}`, 14, 90);

      // Cliente
      doc.setFontSize(12);
      doc.text('CLIENTE', 14, 100);
      doc.setFontSize(10);
      doc.text(factura.fa_nomClie, 14, 106);

      // Tabla de descripción de productos
      autoTable(doc, {
        head: [['Codigo', 'Descripción', 'Cantidad', 'Precio', 'Itbis', 'Total']],
        body: response.data.map((item: any) => [
          item.df_codMerc,
          item.df_desMerc,
          parseInt(item.df_canMerc),
          formatCurrency(parseFloat(item.df_preMerc)),
          formatCurrency((item.df_preMerc * item.df_canMerc) * 18 / 100),
          formatCurrency(item.df_preMerc * item.df_canMerc)
        ]),
        startY: 115,
      });




      // Obtener la posición final de la tabla
      const finalY = (doc as any).lastAutoTable.finalY;

      // Agregar el subtotal, ITBIS y Total a Pagar como pie de página
      doc.setFontSize(12);
      doc.text(`Subtotal:`, 118, finalY + 10);
      doc.setFontSize(10);
      doc.text(`${formatCurrency(subtotal)} `, 160, finalY + 10);
      doc.setFontSize(12);
      doc.text(`ITBIS:`, 118, finalY + 16);
      doc.setFontSize(10);
      doc.text(`${formatCurrency(this.totalItbis)} `, 160, finalY + 16);
      doc.setFontSize(12);
      doc.text(`TOTAL A PAGAR: `, 118, finalY + 22);
      doc.setFontSize(14);
      doc.text(`${formatCurrency(totalGeneral)} `, 160, finalY + 22);

      doc.setFontSize(12);
      // Nota final
      // doc.text('Estos Precios Estan Sujetos a Cambio Sin Previo Aviso', 105, finalY + 40, { align: 'center' });
      doc.setFontSize(14);
      doc.text('WWW.GRUPOHIERRO.COM', 105, finalY + 47, { align: 'center' });
      doc.setFontSize(12);
      doc.text('*** Gracias por Preferirnos ***', 105, finalY + 55, { align: 'center' });

      // Guardar PDF
      // doc.save(`${cotizacion.ct_codcoti}.pdf`);
      const pdfBlob = doc.output('blob');

      // Crear un objeto URL para el Blob y abrirlo en una nueva pestaña
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
    });

  }


// Métodos para cambiar de página
goToFirstPage() {
  this.currentPage = 1;
}

goToLastPage() {
  this.currentPage = this.totalPages;
}

nextPage() {
  if (this.currentPage < this.totalPages) {
    this.currentPage++;
  }
}

prevPage() {
  if (this.currentPage > 1) {
    this.currentPage--;
  }
}

onTableKeydown(event: KeyboardEvent) {
    const max = this.paginatedData.length - 1;

    switch (event.key) {
      case 'ArrowDown':
        if (this.selectedRow < max) {
          this.selectedRow++;
          this.scrollToRow(this.selectedRow);
          this.consultarFacturacion(this.paginatedData[this.selectedRow]);
        }
        event.preventDefault();
        break;

      case 'ArrowUp':
        if (this.selectedRow > 0) {
          this.selectedRow--;
          this.scrollToRow(this.selectedRow);
          this.consultarFacturacion(this.paginatedData[this.selectedRow]);
        }
        event.preventDefault();
        break;

      case 'Enter':
        this.consultarFacturacion(this.paginatedData[this.selectedRow]);
        event.preventDefault();
        break;
    }
  }

  private scrollToRow(index: number) {
    // Opcional: centra la fila seleccionada en el scroll
    const tableBody: HTMLElement | null = document.querySelector('.table-responsive tbody');
    const rows = tableBody?.querySelectorAll('tr');
    if (rows && rows[index]) {
      (rows[index] as HTMLElement).scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }


}



