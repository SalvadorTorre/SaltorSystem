import { Component, NgModule, OnInit, ViewChild, ElementRef, ɵNG_COMP_DEF, HostListener, ViewChildren, QueryList,} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormControl, FormGroup, Validators, } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, from, skip, switchMap, tap,} from 'rxjs';
import Swal from 'sweetalert2';
import { ServicioRnc } from 'src/app/core/services/mantenimientos/rnc/rnc.service';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { FacturacionModelData, detFacturaData,} from 'src/app/core/services/facturacion/factura';
import { ServicioCliente } from 'src/app/core/services/mantenimientos/clientes/cliente.service';
import { HttpInvokeService } from 'src/app/core/services/http-invoke.service';
import { ModeloClienteData } from 'src/app/core/services/mantenimientos/clientes';
import { FacturaDetalleModel, interfaceDetalleModel } from 'src/app/core/services/facturacion/factura/factura';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import { ServicioSector } from 'src/app/core/services/mantenimientos/sector/sector.service';
import { ModeloSectorData } from 'src/app/core/services/mantenimientos/sector';
import { ModeloFpagoData } from 'src/app/core/services/mantenimientos/fpago';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';
import { ModeloFentregaData } from 'src/app/core/services/mantenimientos/fentrega';
import { ServicioFentrega } from 'src/app/core/services/mantenimientos/fentrega/fentrega.service';
import { ModeloInventarioData } from 'src/app/core/services/mantenimientos/inventario';
import jsPDF from 'jspdf';
import { HttpClient } from '@angular/common/http';
import autoTable from 'jspdf-autotable';
import { disableDebugTools } from '@angular/platform-browser';
import { ServicioNcf } from 'src/app/core/services/mantenimientos/ncf/ncf.service';
import { ModeloNcfData } from 'src/app/core/services/mantenimientos/ncf';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import * as html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';

declare var $: any;

@Component({
  selector: 'cobrofact',
  templateUrl: './cobrofact.html',
  styleUrls: ['./cobrofact.css'],
})
export class CobroFact implements OnInit {
  @ViewChild('inputCodmerc') inputCodmerc!: ElementRef; // Para manejar el foco
  @ViewChild('descripcionInput') descripcionInput!: ElementRef; // Para manejar el foco
  @ViewChild('Tabladetalle') Tabladetalle!: ElementRef;
  @ViewChildren('filaSeleccionada') filas!: QueryList<ElementRef>;
  @ViewChild('contenedorScroll') contenedorScroll!: ElementRef;
  @ViewChild('valorPagadoInput') valorPagadoInput!: ElementRef;
  @ViewChild('facturaRef', { static: false }) facturaRef!: ElementRef;
  facturaData: any = null;      // objeto con la factura que devuelve el backend
  mensaje: string = '';
  facturas: any[] = []; // ✅ Declaración de la propiedad
  botonEditar = true; // Empieza deshabilitado
  botonImprimir = true; // Empieza deshabilitado
  botonaddItems = true; // Empieza deshabilitado
  chekpagada = true; // Empieza deshabilitado
  chekPagado = false;
  txtcambio = true;
  txtvalPagado = true;
  totalItems = 1000;
  modoEdicion = false;
  pageSize = 6;
  fentrega = '';
  ftipoPago = '';
  currentPage = 1;
  maxPagesToShow = 5;
  valorpagado: number = 0;
  valCambio: number = 0;
  facturaSelecionada: any = null;
  DatosSeleccionado!: FacturacionModelData;
  codFacturaselecte = ' ';
  txtdescripcion: string = '';
  descripcionFormaPago: string = '';
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
  facturacionid!: string;
  modoconsultaFacturacion: boolean = false;
  facturacionList: FacturacionModelData[] = [];
  factura!:FacturacionModelData;

  detFacturaList: detFacturaData[] = [];
  selectedFacturacion: any = null;
  items: interfaceDetalleModel[] = [];
  ncflist: ModeloNcfData[] = [];
  selectedItem: any = null;
  valorPagado: number = 0;
  valorPagadoFormateado: string = '0,00';
  cambio: number = 0;

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
  fecacttxt: any;
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
  // Referencia a la ventana de impresión para evitar bloqueos de pop-ups
  private printWindow: Window | null = null;
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
  habilitarCantidad: boolean = false;

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
  facturaElement: any;
  formasPago: any;

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
    private ServicioInventario: ServicioInventario,
    private ServicioUsuario: ServicioUsuario,
    private ServicioRnc: ServicioRnc,
    private ServicioSector: ServicioSector,
    private servicioFpago: ServicioFpago,
    private servicioFentrega: ServicioFentrega,
    private servicioNcf: ServicioNcf,
    private http: HttpClient
  ) {
    this.form = this.fb.group({
      fa_codVend: ['', Validators.required], // El campo es requerido
      // Otros campos...
    });

    this.crearFormularioFacturacion();
  }

  @ViewChild('buscarcodmercInput') buscarcodmercElement!: ElementRef;
  buscarNombre = new FormControl();
  resultadoNombre: ModeloClienteData[] = [];
  resultadoSector: ModeloSectorData[] = [];
  resultadoFpago: ModeloFpagoData[] = [];
  resultadoFentrega: ModeloFentregaData[] = [];
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
  seleccionarFacturacion(facturacion: any) {
    this.selectedFacturacion = facturacion;
  }

  ngOnInit(): void {
    this.buscarFacturasNoImpresas();
    this.obtenerNcf();
    this.obtenerfpago();
    this.obtenerFentrega();
  }
  obtenerfpago() {
    this.servicioFpago.obtenerTodosFpago().subscribe((response) => {
      this.resultadoFpago = response.data;
    });
  }
  obtenerFentrega() {
    this.servicioFentrega.obtenerTodosFentrega().subscribe((response) => {
      this.resultadoFentrega = response.data || [];
    });
  }
  obtenerNcf() {
    this.servicioNcf.buscarTodosNcf().subscribe((response) => {
      this.ncflist = response.data;
    });
  }

  crearFormularioFacturacion() {
    const fechaActual = new Date();
    const fechaActualStr = this.formatofecha(fechaActual);
    this.formularioFacturacion = this.fb.group({
      fa_codFact: [{ value: '', disabled: true }],
      fa_fecFact: [{ value: fechaActualStr, disabled: true }],
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
      fa_ncfFact: [{ value: '', disabled: true }],
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
    this.botonImprimir = true; // Deshabilita el botón
    this.chekPagado = false;
    this.chekpagada = true;
    this.productoselect;
    this.codmerc = '';
    this.descripcionmerc = '';
    this.preciomerc = 0;
    this.cantidadmerc = 0;
    this.isEditing = false;
    this.items = []; // Limpiar el array de items
    this.totalGral = 0; // Reiniciar el total general
    this.totalItbis = 0; // Reiniciar el total del ITBIS
    this.subTotal = 0; // Reiniciar el subtotal
    this.totalcosto = 0;
    this.costoGral = 0;
    this.factxt = 0;
    this.habilitarCampos = false;
    this.habilitarCantidad = false;
    this.valorPagado = 0;
    this.cambio = 0;
    this.valCambio = 0;
    this.fentrega = '';
    this.ftipoPago = '';
    // volver a ejecutar la lógica de inicio
    this.buscarFacturasNoImpresas();
    this.obtenerNcf();
    this.obtenerfpago();
    this.actualizarTotales();
    $('#input1').focus();
    $('#input1').select();
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
    this.servicioFacturacion
      .buscarFacturaDetalle(Factura.fa_codFact)
      .subscribe((response) => {
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
            costo: this.costotxt,
            fa_codFact: Factura.fa_codFact,
            fa_fecFact: Factura.fa_fecFact,
            fa_nomClie: Factura.fa_nomClie,
            fa_valFact: Factura.fa_valFact,
            fa_impresa: Factura.fa_impresa === null ? 'N' : 'S',
            fa_envio: Factura.fa_envio,
            fa_fpago: Factura.fa_fpago,
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
  buscarFacturasNoImpresas() {
    this.servicioFacturacion.obtenerFacturasNoImpresas().subscribe((resp) => {
      console.log('Facturas recibidas:', resp.data);
      this.facturacionList = resp.data;
    });
  }

  consultarFacturacion(factura: FacturacionModelData) {
    this.modoconsultaFacturacion = true;
    this.formularioFacturacion.reset();
    this.crearFormularioFacturacion();
    this.formularioFacturacion.patchValue(factura);
    this.tituloModalFacturacion = 'Consulta Factura';
    // $('#modalfacturacion').modal('show');
    this.habilitarFormulario = true;
    this.formularioFacturacion.disable();
    this.codFacturaselecte = factura.fa_codFact;
    console.log('ff', factura);
    this.habilitarIcono = false;
    this.botonEditar = false; // Habilita el botón
    this.chekpagada = false; // Habilita el botón
    this.fentrega = factura.fa_envio || '';
    this.DatosSeleccionado = factura;
    // Usa el código numérico de forma de pago, pero almacénalo como string
    // para mantener el tipo declarado de ftipoPago.
    this.ftipoPago = String((factura as any).fa_codfpago ?? 1);
    // this.botonImprimir = true; // Deshabilita el botón

    const inputs = document.querySelectorAll('.seccion-productos input');
    inputs.forEach((input) => {
      (input as HTMLInputElement).disabled = true;
    });
    // Limpiar los items antes de agregar los nuevos
    this.totalItbis = 0;

    this.items = [];
    this.servicioFacturacion
      .buscarFacturaDetalle(factura.fa_codFact)
      .subscribe((response) => {
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
            fecfactActual: new Date(),
            costo: this.costotxt,
            fa_codFact: factura.fa_codFact,
            fa_fecFact: factura.fa_fecFact,
            fa_nomClie: factura.fa_nomClie,
            fa_valFact: factura.fa_valFact,
            fa_impresa: factura.fa_impresa === null ? 'N' : 'S',
            fa_envio: factura.fa_envio,
            fa_fpago: factura.fa_fpago,
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
        this.factxt =
          ((factura.fa_valFact - factura.fa_cosFact) * 100) /
          factura.fa_cosFact;
        this.actualizarTotales();
        console.log(factura.fa_valFact);
        console.log(factura.fa_cosFact);

        this.formularioFacturacion.patchValue({
          fa_fpago: factura.fa_fpago,
          fa_codfpago: (factura as any).fa_codfpago ?? this.ftipoPago,
        });
        // Consultar la descripción de forma de pago

        this.servicioFpago
          // Consulta por ID (código numérico) para evitar errores en backend
          .obtenerFpagoPorId(String(this.ftipoPago))
          .subscribe((response) => {
            const formaPago = response.data?.[0]; // Accede al primer elemento del array
            this.descripcionFormaPago = formaPago
              ? formaPago.fp_descfpago
              : 'Desconocido';
          });
      });
  }

  formatofecha(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Los meses son 0-indexados, se agrega 1 y se llena con ceros
    const day = date.getDate().toString().padStart(2, '0'); // Se llena con ceros si es necesario
    return `${day}/${month}/${year}`;
  }

  crearformulariodetFactura() {
    this.formulariodetFactura = this.fb.group({
      df_codFact: [''],
      df_fecFact: [''],
      df_codMerc: [''],
      df_desMerc: [''],
      df_canMerc: [''],
      df_preMerc: [''],
      df_valMerc: [''],
      df_unidad: [''],
      df_cosMerc: [''],
      df_codClie: [''],
      df_status: [''],
    });
  }

  convertToUpperCase(event: Event): void {
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.toUpperCase();
    if (start !== null && end !== null) {
      input.setSelectionRange(start, end);
    }
  }

  moveFocus(
    event: KeyboardEvent,
    nextElement: HTMLInputElement | HTMLSelectElement
  ) {
    if (event.key === 'Enter' && nextElement) {
      event.preventDefault(); // Evita el comportamiento predeterminado del Enter
      nextElement.focus(); // Enfoca el siguiente campo
    }
  }

  mostrarMensajeError(mensaje: string): void {
    this.mensagePantalla = true;

    Swal.fire({
      icon: 'error',
      title: 'A V I S O',
      text: mensaje,
    }).then(() => {
      this.mensagePantalla = false;
    });
  }

  moveFocusFpago(
    event: Event,
    nextInput: HTMLInputElement | HTMLSelectElement
  ) {
    // KeyboardEvent, element: HTMLInputElement | HTMLSelectElement
    event.preventDefault();
    if (event.target instanceof HTMLSelectElement) {
      if (!event.target.value) {
        this.mensagePantalla = true;
        Swal.fire({
          icon: 'error',
          title: 'A V I S O',
          text: 'Por favor complete el campo Tipo de Pago.',
        }).then(() => {
          this.mensagePantalla = false;
        });
      } else {
        nextInput.focus(); // Si es válido, mueve el foco al siguiente input
      }
    }
  }

  actualizarCalculo() {
    this.protxt = ((this.preciomerc - this.costotxt) * 100) / this.costotxt; // Aquí puedes hacer cualquier cálculo
  }

  recalcularTotales() {
    this.totalGral = 0;
    this.totalItbis = 0;
    this.subTotal = 0;

    for (const item of this.items) {
      const itbis = (item.total * 0.18) / 1.18; // si total incluye ITBIS
      const subtotal = item.total - itbis;

      this.totalItbis += itbis;
      this.subTotal += subtotal;
      this.totalGral += item.total;
    }
  }

  actualizarTotales() {
    this.totalGral = this.items.reduce((sum, item) => sum + item.total, 0);
    this.totalItbis = this.items.reduce(
      (sum, item) => sum + item.total * 0.18,
      0
    );
    this.subTotal = this.items.reduce(
      (sum, item) => sum + (item.total - item.total * 0.18),
      0
    );
    this.totalcosto = this.items.reduce(
      (sum, item) => sum + this.costotxt * item.cantidad,
      0
    );
    const formatCurrency = (value: number) =>
      value.toLocaleString('es-DO', {
        style: 'currency',
        currency: 'DOP',
      });
    this.subtotaltxt = formatCurrency(this.subTotal);
    this.itbitxt = formatCurrency(this.totalItbis);
    this.totalgraltxt = formatCurrency(this.totalGral);
  }
  guardarFacturacion() {
    const codFact = this.formularioFacturacion.get('fa_codFact')?.value;

    // Asignar totales al formulario
    this.formularioFacturacion.patchValue({
      fa_valFact: this.totalGral,
      fa_itbiFact: this.totalItbis,
      fa_cosFact: this.totalcosto,
      fa_subFact: this.subTotal,
    });
    this.formularioFacturacion.get('fa_valFact')?.patchValue(this.totalGral);
    this.formularioFacturacion.get('fa_itbiFact')?.patchValue(this.totalItbis);
    this.formularioFacturacion.get('fa_cosFact')?.patchValue(this.totalcosto);
    this.formularioFacturacion.get('fa_subFact')?.patchValue(this.subTotal);

    this.formularioFacturacion.get('fa_tipoNcf')!.enable();
    this.formularioFacturacion.get('fa_codFact')!.enable();
    this.formularioFacturacion.get('fa_fecFact')!.enable();
    this.formularioFacturacion.get('fa_nomVend')!.enable();
    this.formularioFacturacion.get('fa_ncfFact')!.enable();
    this.formularioFacturacion.get('fa_fpago')!.enable();
    const payload = {
      factura: this.formularioFacturacion.value,
      detalle: this.items,
    };

    if (this.formularioFacturacion.valid) {
      if (codFact) {
        // 🔁 Modo edición
        this.servicioFacturacion
          .editarFacturacion(payload)
          .subscribe((response) => {
            Swal.fire({
              title: 'Actualizado!',
              text: 'Factura modificada correctamente.',
              icon: 'success',
              timer: 1000,
              showConfirmButton: false,
            });
            this.refrescarFormulario();
          });
      } else {
        // 🆕 Modo creación
        this.servicioFacturacion
          .guardarFacturacion(payload)
          .subscribe((response) => {
            Swal.fire({
              title: 'Excelente!',
              text: 'Factura creada correctamente.',
              icon: 'success',
              timer: 1000,
              showConfirmButton: false,
            });
            this.refrescarFormulario();
          });
      }
    } else {
      alert('Esta Factura no fue guardada');
    }
  }

  refrescarFormulario() {
    this.buscarFacturasNoImpresas();
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
    this.protxt =
      ((this.selectedItem.total - this.selectedItem.costo) * 100) /
      this.selectedItem.costo;
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
    const tableBody: HTMLElement | null = document.querySelector(
      '.table-responsive tbody'
    );
    const rows = tableBody?.querySelectorAll('tr');
    if (rows && rows[index]) {
      (rows[index] as HTMLElement).scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }

  seleccionarFactura(factura: any, index: number) {
    this.consultarFacturacion(factura); // ✅ Llamada automática
    this.codFacturaselecte = factura.fa_codFact;

    this.factura = factura;

    setTimeout(() => {
      const fila = this.filas.toArray()[index];
      const contenedor = this.contenedorScroll.nativeElement;

      if (fila && contenedor) {
        const filaOffsetTop = fila.nativeElement.offsetTop;
        const filaHeight = fila.nativeElement.offsetHeight;
        const contenedorScrollTop = contenedor.scrollTop;
        const contenedorHeight = contenedor.offsetHeight;

        // Si la fila está fuera del área visible, hacer scroll
        if (
          filaOffsetTop < contenedorScrollTop ||
          filaOffsetTop + filaHeight > contenedorScrollTop + contenedorHeight
        ) {
          contenedor.scrollTop =
            filaOffsetTop - contenedorHeight / 2 + filaHeight / 2;
        }
      }
    }, 0);
  }

  @HostListener('document:keydown.arrowdown', ['$event'])
  handleArrowDown(event: KeyboardEvent) {
    if (this.selectedIndex < this.facturacionList.length - 1) {
      this.selectedIndex++;
      this.facturaSelecionada = this.facturacionList[this.selectedIndex];
      this.consultarFacturacion(this.facturaSelecionada); // ✅
      event.preventDefault();
    }
  }

  @HostListener('document:keydown.arrowup', ['$event'])
  handleArrowUp(event: KeyboardEvent) {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      this.facturaSelecionada = this.facturacionList[this.selectedIndex];
      this.consultarFacturacion(this.facturaSelecionada); // ✅
      event.preventDefault();
    }
  }
  onInputPagado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valPagado = parseFloat(input.value) || 0;

    const valFactura =
      parseFloat(this.formularioFacturacion.get('fa_valFact')?.value) || 0;

    const cambio = valPagado - valFactura;

    // Actualiza el valor en el formulario reactivo
    this.formularioFacturacion.patchValue({
      valpagado: valPagado,
      valcambio: cambio > 0 ? cambio : 0, // si es negativo, pones 0 o lo que prefieras
    });
  }

  toggleCheckPagado() {
    // si está marcado y hacen clic => lo desmarco, pero NO habilito input
    if (this.chekPagado) {
      this.chekPagado = false;
      this.txtvalPagado = true; // sigue deshabilitado
      this.valorPagado = 0;
      this.cambio = 0;
      this.valCambio = 0;
    } else {
      // si no está marcado, lo marco y habilito input
      this.chekPagado = true;
      this.txtvalPagado = false;
      setTimeout(() => {
        if (this.valorPagadoInput) {
          this.valorPagadoInput.nativeElement.focus();
          this.valorPagadoInput.nativeElement.select();
        }
      }, 0);
    }
  }

  onValorPagadoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.valorPagado = parseFloat(input.value) || 0;
    const valFactura = this.formularioFacturacion.get('fa_valFact')?.value || 0;
    this.valCambio = this.valorPagado - valFactura;
    if (this.valCambio > 0) {
      this.botonImprimir = false;
    } else {
      this.botonImprimir = true;
    }
  }

  onValorPagadoFormatted(event: Event): void {
    const input = (event.target as HTMLInputElement).value;

    // Remplaza la coma por punto para parsear
    const valorNumerico = parseFloat(input.replace(',', '.')) || 0;

    this.valorPagado = valorNumerico;
    this.valorPagadoFormateado = this.formatearNumero(valorNumerico);

    const valFactura =
      parseFloat(this.formularioFacturacion.get('fa_valFact')?.value) || 0;
    const cambioCalc = valorNumerico - valFactura;
    this.cambio = cambioCalc > 0 ? cambioCalc : 0;
  }

  formatearNumero(valor: number): string {
    return valor
      .toFixed(2) // "1234.56"
      .replace('.', ',') // "1234,56"
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // separador de miles
  }
  buscarFactura() {
    // Preabrir ventana en el gesto de clic para permitir impresión controlada en ventana
    try {
      this.printWindow = window.open('', '_blank');
    } catch (e) {
      this.printWindow = null;
    }
    this.servicioFacturacion.getByNumero(this.formularioFacturacion.get('fa_codFact')?.value).subscribe((response) => {
      if (response) {
      this.facturaData = response; // 🔹 aquí está la factura completa
      console.log("facturaData", this.facturaData);
        this.mensaje = '';
        const numero = this.formularioFacturacion.get('fa_codFact')?.value;
        // Cargar detalles antes de generar el PDF para evitar documento vacío
        this.servicioFacturacion.buscarFacturaDetalle(numero).subscribe((det) => {
          try {
            const detalles = det?.data || [];
            // Asignar detalles dentro del objeto correcto según la forma de respuesta
            if ((this.facturaData as any)?.data) {
              ((this.facturaData as any).data as any).detalles = detalles;
            } else {
              (this.facturaData as any).detalles = detalles;
            }
            console.log('Detalles cargados:', Array.isArray(detalles) ? detalles.length : 0);
          } catch (e) {
            console.warn('No se pudieron asignar detalles a facturaData', e);
          }
          this.generarPDF();
          // Marcar como impresa DESPUÉS de haber generado el PDF para evitar pisar facturaData
          this.marcarImpresa();
        }, (err) => {
          console.warn('No se pudieron obtener detalles, imprimiendo encabezado y totales.', err);
          this.generarPDF();
          this.marcarImpresa();
        });
      } else {
        this.facturaData = null;
        this.mensaje = 'No se encontró una factura con ese número';
      }
    });
  }
  marcarImpresa() {
    const numero = this.formularioFacturacion.get('fa_codFact')?.value;
    console.log("numero", numero); 
    console.log("this.ftipoPago", this.ftipoPago);
    this.servicioFacturacion
    .marcarImpresa(numero, { fa_fpago: this.ftipoPago,
      fa_envio: this.fentrega })
    .subscribe({next: (res: any) => {
      console.log("✅ Respuesta backend:", res);
        // No pisar this.facturaData aquí para evitar perder los detalles cargados
        console.log("Factura marcada como impresa ✅");
        this.mensaje = '';
        // this.generarPDF();
      },
      error: (err) => {
        console.error("Error marcando factura ❌", err);
        this.mensaje = 'No se pudo actualizar la factura';
      }
    });
}



generarPDF() {
  if (!this.DatosSeleccionado) {
    alert("Debe buscar una factura primero");
    return;
  }

  // Utilidad para soportar campos con múltiples entradas en formato "Clave[1]", "Clave[2]", etc.
  const appendIndexed = (obj: any, key: string, values: any[] | any) => {
    const arr = Array.isArray(values) ? values : [values];
    arr.forEach((v, i) => {
      obj[`${key}[${i + 1}]`] = v;
    });
  };

  // Construcción base del payload (campos unitarios)
  
  const payload: any = {
    Version: "1.0",
    TipoeCF: this.DatosSeleccionado.fa_tipoNcf,
    ENCF: "E320000000040",
    IndicadorMontoGravado: "0",
    TipoIngresos: "01",
    TipoPago: "1",
    RNCEmisor: "132177975",
    RazonSocialEmisor: localStorage.getItem('empresa') || '',
    NombreComercial: "DOCUMENTOS ELECTRONICOS DE 02",
    DireccionEmisor: "AVE. ISABEL AGUIAR NO. 269, ZONA INDUSTRIAL DE HERRERA",
    Municipio: "010100",
    Provincia: "010000",
    CorreoEmisor: "DOCUMENTOSELECTRONICOSDE0612345678969789+9000000000000000000000000000001@123.COM",
    WebSite: "www.facturaelectronica.com",
    CodigoVendedor: "AA0000000100000000010000000002000000000300000000050000000006",
    NumeroFacturaInterna: "123456789016",
    NumeroPedidoInterno: "123456789016",
    ZonaVent: "NORTE",
    FechaEmision: "01-04-2020",
    RNCComprador: "131880681",
    RazonSocialComprador: "DOCUMENTOS ELECTRONICOS DE 03",
    ContactoComprador: "MARCOS LATIPLOL",
    CorreoComprador: "MARCOSLATIPLOL@KKKK.COM",
    DireccionComprador: "CALLE JACINTO DE LA CONCHA FELIZ ESQUINA 27 DE FEBRERO,FRENTE A DOMINO",
    MunicipioComprador: "010100",
    ProvinciaComprador: "010000",
    FechaEntrega: "10-10-2020",
    FechaOrdenCompra: "10-11-2018",
    NumeroOrdenCompra: "4500352238",
    CodigoInternoComprador: "10633440",
    MontoGravadoTotal: "350765.00",
    MontoGravadoI1: "269805.00",
    MontoGravadoI2: "80190.00",
    MontoGravadoI3: "770.00",
    MontoExento: "1625.00",
    ITBIS1: "18",
    ITBIS2: "16",
    ITBIS3: "0",
    TotalITBIS: this.DatosSeleccionado.fa_itbiFact,
    TotalITBIS1: "48564.90",
    TotalITBIS2: "12830.40",
    TotalITBIS3: "0.00",
    MontoTotal: "413785.30",
    MontoPeriodo: "413785.30",
    ValorPagar: "413785.30",
  };

  // Campos con múltiples entradas
  // Forma de pago y montos (si hay múltiples, se agregan todas)
  appendIndexed(payload, 'FormaPago', this.DatosSeleccionado.fa_fpago ? [this.DatosSeleccionado.fa_fpago] : []);
  appendIndexed(payload, 'MontoPago', this.DatosSeleccionado.fa_valFact ? [this.DatosSeleccionado.fa_valFact] : []);

  // Teléfonos del emisor (ejemplo con dos teléfonos)
  appendIndexed(payload, 'TelefonoEmisor', ["809-472-7676", "809-491-1918"]);

  // Detalle de ítems según los productos cargados en la factura (this.items)
  const numeroLinea = this.items.map((_, idx) => String(idx + 1));
  const indicadorFacturacion = this.items.map((_, idx) => String(idx + 1)); // Placeholder
  const nombreItem = this.items.map((it) => (it?.producto?.in_desmerc ?? ''));
  const indicadorBienoServicio = this.items.map(() => '1'); // Placeholder
  const cantidadItem = this.items.map((it) => Number(it.cantidad).toFixed(2));
  const unidadMedida = this.items.map(() => '43'); // Placeholder o derive si está disponible
  const precioUnitarioItem = this.items.map((it) => Number(it.precio).toFixed(4));
  const montoItem = this.items.map((it) => Number(it.total).toFixed(2));

  appendIndexed(payload, 'NumeroLinea', numeroLinea);
  appendIndexed(payload, 'IndicadorFacturacion', indicadorFacturacion);
  appendIndexed(payload, 'NombreItem', nombreItem);
  appendIndexed(payload, 'IndicadorBienoServicio', indicadorBienoServicio);
  appendIndexed(payload, 'CantidadItem', cantidadItem);
  appendIndexed(payload, 'UnidadMedida', unidadMedida);
  appendIndexed(payload, 'PrecioUnitarioItem', precioUnitarioItem);
  appendIndexed(payload, 'MontoItem', montoItem);

  // A partir de aquí se usa el payload construido dinámicamente
  console.log("this.facturaData", this.DatosSeleccionado);
  // Normalizar posibles formas de respuesta del backend (puede venir en response o response.data)
  const f: any = (this.DatosSeleccionado as any)?.data ?? this.DatosSeleccionado;
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    // Ajuste para impresora POS (80mm). Usa 80mm de ancho.
    format: [80, 297]  // ancho 80mm, alto ajustable
  });
  
  // Formateador para pesos dominicanos (DOP)
  const formatoMoneda = new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Encabezado ---
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(payload.RazonSocialEmisor, pageWidth / 2, 5, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
   doc.text('FACTURA', pageWidth / 2, 10, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  const codFact = f.fa_codFact ?? f.codFact ?? this.formularioFacturacion.get('fa_codFact')?.value ?? '';
  const fecFact = f.fa_fecFact ?? f.fecFact ?? '';
  const nomClie = f.fa_nomClie ?? f.nomClie ?? '';
  const rnc = f.fa_rncFact ?? f.rnc ?? 'N/A';
  const dirClie = f.fa_dirClie ?? f.dirClie ?? f.direccion ?? '';
  const telClie = f.fa_telClie ?? f.telClie ?? f.telefono ?? '';
  const nomVend = f.fa_nomVend ?? f.nomVend ?? f.vendedor ?? '';

  doc.text(`Factura No: ${String(codFact)}`, 2, 20);
  doc.text(`Fecha: ${String(fecFact)}`, 2, 25);
  doc.text(`Cliente: ${String(nomClie)}`, 2, 30);
  doc.text(`RNC: ${String(rnc)}`, 2, 35);
  doc.text(`Dirección: ${String(dirClie)}`, 2, 40);
  doc.text(`Teléfono: ${String(telClie)}`, 2, 45);
  doc.text(`Vendedor: ${String(nomVend)}`, 2, 50);

  // --- Tabla de productos ---
  const tableColumn = ['Cant.', 'Precio', 'Itbis', 'Total', ''];
  const tableRows: any[] = [];
  const detalles: any[] = Array.isArray((f as any).detalles) ? (f as any).detalles : [];
  detalles.forEach((item: any) => {
    // Primera fila → cantidad, precio, total
    tableRows.push([
      { content: item.df_canMerc, styles: { halign: 'right' } },
      { content: item.df_preMerc, styles: { halign: 'right' } },
      { content: item.df_itbiMerc || '0.00', styles: { halign: 'right' } },
      { content: item.df_valMerc, styles: { halign: 'right' } },
      '' // vacío para cuadrar colSpan
    ]);
    
    // Segunda fila → descripción y código
    tableRows.push([
      {
        content: `${item.df_desMerc} (${item.df_codMerc})`,
        colSpan: 5, // ocupa todo el ancho de la tabla
        styles: { halign: 'left', fontStyle: 'italic' }
      }
    ]);
  });
  if (detalles.length === 0) {
    tableRows.push([
      { content: '', styles: { halign: 'right' } },
      { content: '', styles: { halign: 'right' } },
      { content: '', styles: { halign: 'right' } },
      { content: '', styles: { halign: 'right' } },
      ''
    ]);
    tableRows.push([
      {
        content: `Sin detalle de productos cargados`,
        colSpan: 5,
        styles: { halign: 'left', fontStyle: 'italic' }
      }
    ]);
  }

  // Generar tabla con líneas en encabezado, principio y final
  autoTable(doc, {
    startY: 52,
    head: [tableColumn],
    body: tableRows,
    theme: 'plain', // Usamos 'plain' para controlar manualmente las líneas
    
    headStyles: {
      fontSize: 7,
      textColor: 0, 
      fontStyle: 'bold', 
      fillColor: false,
      lineColor: [0, 0, 0],
      lineWidth: { top: 0.3, right: 0, bottom: 0.3, left: 0 }, // 👈 solo línea abajo
    },

    bodyStyles: { 
      fontSize: 7,
      lineWidth: 0, // Sin bordes automáticos
      cellPadding: { top: 0.5, bottom: 0.5 }
    },
    
    margin: { left: 2 },
    
    // Función para dibujar líneas personalizadas
    // didDrawCell: (data: any) => {
    //   // Línea al principio de la tabla (encima del header)
    //   if (data.row.section === 'head' && data.row.index === 0 && data.column.index === 0) {
    //     doc.setDrawColor(0);
    //     doc.setLineWidth(0.3);
    //     doc.line(
    //       data.table.startX,
    //       data.cell.y, // parte superior del header
    //       data.table.startX + data.table.width,
    //       data.cell.y
    //     );
    //   }
      
    //   // Línea debajo del encabezado
    //   if (data.row.section === 'head' && data.column.index === 0) {
    //     doc.setDrawColor(0);
    //     doc.setLineWidth(0.3);
    //     doc.line(
    //       data.table.startX,
    //       data.cell.y + data.cell.height, // parte de abajo del header
    //       data.table.startX + data.table.width,
    //       data.cell.y + data.cell.height
    //     );
    //   }
      
    //   // Línea al final de la tabla (después del último row del body)
    //   if (data.row.section === 'body' 
    //       && data.row.index === data.table.body.length - 1 // última fila
    //       && data.column.index === data.table.body[0].length - 1) { // última columna
    //     doc.setDrawColor(0);
    //     doc.setLineWidth(0.3);
    //     doc.line(
    //       data.table.startX,
    //       data.cell.y + data.cell.height, // parte de abajo del último item
    //       data.table.startX + data.table.width,
    //       data.cell.y + data.cell.height
    //     );
    //   }
    // },

    columnStyles: {
      0: { cellWidth: 12, halign: 'left' },
      1: { cellWidth: 12, halign: 'right' },
      2: { cellWidth: 15, halign: 'right' },
      3: { cellWidth: 15, halign: 'right' },
      4: { cellWidth: 10, halign: 'right' }
    }
  });

  // Obtener la posición final de la tabla desde el doc
  const finalY = (doc as any).lastAutoTable.finalY || 70;

  // --- Totales ---
  doc.setFontSize(7);
  const subFact = f.fa_subFact ?? f.subTotal ?? f.subfact ?? 0;
  const itbiFact = f.fa_itbiFact ?? f.itbis ?? f.itbi ?? 0;
  const valFact = f.fa_valFact ?? f.valFact ?? f.total ?? 0;

  doc.text(`Subtotal:`, 5, finalY + 7);
  doc.text(formatoMoneda.format(Number(subFact)), 17, finalY + 7);
  doc.text('ITBIS:', 5, finalY + 10);
  doc.text(formatoMoneda.format(Number(itbiFact)), 17, finalY + 10);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', 5, finalY + 13);
  doc.text(formatoMoneda.format(Number(valFact)), 17, finalY + 13);
  doc.setFont('helvetica', 'normal');

  // --- Pie de página ---
  doc.text(`Recibido Conforme`, pageWidth / 2, 290, { align: 'center' });
  // const pageCount = doc.getNumberOfPages();
  // for (let i = 1; i <= pageCount; i++) {
  //   doc.setPage(i);
  //   doc.setFontSize(6);
  //   doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
  // }

  // --- Imprimir en impresora POS ---
  // Envía el documento al diálogo de impresión del navegador
  // para que el usuario seleccione la impresora de punto de venta.
  (doc as any).autoPrint();
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  // Si tenemos una ventana preabierta, incrustamos el PDF y disparamos print ahí
  if (this.printWindow && !this.printWindow.closed) {
    const w = this.printWindow;
    try {
      w.document.open();
      w.document.write(`<!doctype html><html><head><title>Imprimir</title></head>
        <body style="margin:0">
          <embed id="pdfEmbed" type="application/pdf" src="${pdfUrl}" style="width:100%;height:100vh" />
          <script>
            const doPrint = () => { try { window.focus(); window.print(); } catch(e) { console.log(e); } };
            // Espera pequeña para que el visor PDF cargue contenido
            window.addEventListener('load', () => setTimeout(doPrint, 400));
          </script>
        </body></html>`);
      w.document.close();
    } catch (e) {
      console.warn('No se pudo escribir en la ventana de impresión, se usa iframe oculto.', e);
      this.imprimirEnIframeOculto(pdfUrl);
    }
    // Limpieza diferida
    setTimeout(() => {
      try { URL.revokeObjectURL(pdfUrl); } catch {}
      this.limpia();
    }, 1200);
  } else {
    // Fallback: imprime en iframe oculto si no hay ventana
    this.imprimirEnIframeOculto(pdfUrl);
  }
}

private imprimirEnIframeOculto(pdfUrl: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      // Dar un respiro al visor PDF antes de imprimir
      setTimeout(() => iframe.contentWindow?.print(), 400);
    } finally {
      setTimeout(() => {
        document.body.removeChild(iframe);
        try { URL.revokeObjectURL(pdfUrl); } catch {}
        this.limpia();
      }, 1400);
    }
  };
  iframe.src = pdfUrl;
}





  generarFacturaPDF() {
    const opt = {
      margin: 5,
      filename: `Factura_${
        this.formularioFacturacion.get('fa_codFact')?.value
      }.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    //Mostrar temporalmente la factura para que se renderice correctamente
    const facturaDiv = this.facturaElement.nativeElement as HTMLElement;
    facturaDiv.style.display = 'block';

    const element = this.facturaRef.nativeElement;
    html2pdf().from(element).set(opt).save();

    setTimeout(() => {
      html2pdf()
        .from(facturaDiv)
        .set(opt)
        .save()
        .then(() => {
          facturaDiv.style.display = 'none';
        });
    }, 100);
  }

  imprimirFactura() {
    this.formularioFacturacion.get('fa_codFact')?.enable();
    var paylod = {
      fa_codFact: this.formularioFacturacion.get('fa_codFact')?.value,
      fa_impresa: 'S',
      fa_envio: this.formularioFacturacion.get('fa_envio')?.value,
      fa_fpago: this.formularioFacturacion.get('fa_fpago')?.value,
    };
    console.log('Imprimiendo factura con payload:', paylod);

    const original = this.facturaRef.nativeElement;
    const numeroFactura = this.formularioFacturacion.get('fa_codFact')?.value;
    // ✅ Clonar y mostrar fuera del viewport
    const clone = original.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.top = '0';
    clone.style.left = '-9999px';
    clone.style.display = 'block';
    document.body.appendChild(clone);

    this.servicioFacturacion.marcarFacturaComoImpresa(paylod).subscribe(() => {
      console.log('Factura actualizada correctamente.');

      setTimeout(() => {
        html2canvas(clone).then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`${numeroFactura}.pdf`);

          // ❌ Quitar el clonF
          document.body.removeChild(clone);
          this.limpia();
          console.log('Payload:', paylod);

          // actualiza
          const formaPago =
            this.formularioFacturacion.get('fa_fpago')?.value || 1; // Por defecto 1
        });
      }, 100);
    });

    // Esperar a que el DOM procese
  }
}
