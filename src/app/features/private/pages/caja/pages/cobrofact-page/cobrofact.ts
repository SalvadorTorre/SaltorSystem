import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
  ViewChildren,
  QueryList,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import Swal from 'sweetalert2';
import { ServicioRnc } from 'src/app/core/services/mantenimientos/rnc/rnc.service';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import {
  FacturacionModelData,
  detFacturaData,
} from 'src/app/core/services/facturacion/factura';
import { ServicioCliente } from 'src/app/core/services/mantenimientos/clientes/cliente.service';
import { HttpInvokeService } from 'src/app/core/services/http-invoke.service';
import { ModeloClienteData } from 'src/app/core/services/mantenimientos/clientes';
import {
  FacturaDetalleModel,
  interfaceDetalleModel,
} from 'src/app/core/services/facturacion/factura/factura';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import { ServicioSector } from 'src/app/core/services/mantenimientos/sector/sector.service';
import { ModeloSectorData } from 'src/app/core/services/mantenimientos/sector';
import { ModeloFpagoData } from 'src/app/core/services/mantenimientos/fpago';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';
import { ModeloFentregaData } from 'src/app/core/services/mantenimientos/fentrega';
import { ServicioFentrega } from 'src/app/core/services/mantenimientos/fentrega/fentrega.service';
import { ModeloInventarioData } from 'src/app/core/services/mantenimientos/inventario';
import { HttpClient } from '@angular/common/http';
import { ServicioNcf } from 'src/app/core/services/mantenimientos/ncf/ncf.service';
import { ModeloNcfData } from 'src/app/core/services/mantenimientos/ncf';
import { PrintingService } from 'src/app/core/services/utils/printing.service';

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
  facturaData: any = null; // objeto con la factura que devuelve el backend
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
  factura!: FacturacionModelData;

  detFacturaList: detFacturaData[] = [];
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
    private http: HttpClient,
    private printingService: PrintingService
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

  // --- Funciones para manejar la edición en línea ---
  iniciarEdicion(index: number, item: any) {
    this.index_item = index;
    this.itemToEdit = { ...item }; // Clonar el item para no modificar directamente
    this.isEditing = true;
    this.habilitarCantidad = true;
    // this.cantidadform.setValue(item.cantidad);
    // this.precioform.setValue(item.precio);
    this.cantidadmerc = item.cantidad;
    this.preciomerc = item.precio;

    // Enfocar el input de cantidad
    setTimeout(() => {
      const input = document.getElementById(
        'cantidad-' + index
      ) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
  }

  guardarEdicion(index: number) {
    if (this.index_item === index) {
      const item = this.items[index];
      // Validar que la cantidad y precio sean válidos
      if (this.cantidadmerc <= 0 || this.preciomerc <= 0) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'La cantidad y el precio deben ser mayores a 0',
        });
        return;
      }
      // Actualizar el item
      item.cantidad = this.cantidadmerc;
      item.precio = this.preciomerc;
      item.total = item.cantidad * item.precio;
      // Recalcular totales
      this.actualizarTotales();
      this.isEditing = false;
      this.itemToEdit = null;
      this.index_item = -1;
      this.habilitarCantidad = false;
      this.cantidadmerc = 0;
      this.preciomerc = 0;
    }
  }

  cancelarEdicion() {
    this.isEditing = false;
    this.itemToEdit = null;
    this.index_item = -1;
    this.habilitarCantidad = false;
    this.cantidadmerc = 0;
    this.preciomerc = 0;
  }

  // --- Funciones para manejar teclas ---
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'F2') {
      this.limpia();
    }
    if (event.key === 'F4') {
      this.guardarFacturacion();
    }
    if (event.key === 'F7') {
      this.buscarProducto();
    }
    if (event.key === 'F8') {
      this.buscarCliente();
    }
    if (event.key === 'F9') {
      this.buscarVendedor();
    }
    if (event.key === 'F10') {
      this.buscarFormaPago();
    }
  }

  buscarProducto() {
    // Lógica para abrir modal de búsqueda de producto
    $('#modalbuscarproducto').modal('show');
  }
  buscarCliente() {
    // Lógica para abrir modal de búsqueda de cliente
    $('#modalbuscarcliente').modal('show');
  }
  buscarVendedor() {
    // Lógica para abrir modal de búsqueda de vendedor
    $('#modalbuscarvendedor').modal('show');
  }
  buscarFormaPago() {
    // Lógica para abrir modal de búsqueda de forma de pago
    $('#modalbuscarformapago').modal('show');
  }

  actualizarTotales() {
    this.subTotal = this.items.reduce((acc, item) => acc + item.total, 0);
    this.totalItbis = this.items.reduce((acc, item) => {
      // Calcular ITBIS por item
      // Asumiendo que item.producto.in_itbis indica si paga ITBIS
      // y que la tasa es 18%
      // Ajustar según lógica real
      const itbis = item.producto?.in_itbis ? item.total * 0.18 : 0;
      return acc + itbis;
    }, 0);
    this.totalGral = this.subTotal + this.totalItbis;
  }

  guardarFacturacion() {
    // Implementar lógica de guardado
    console.log('Guardando facturación...');
  }

  /**
   * Construye el payload para el servicio de DGII (QR/eCF)
   * basado en la factura seleccionada y los items cargados.
   */
  private buildDGIIRequest(factura: FacturacionModelData, items: any[]): any {
    // 1. Obtener datos de cabecera
    const encf = String(factura.fa_ncfFact || '').trim();
    let tipoeCF = '';
    if (encf.length >= 3 && encf.startsWith('E')) {
      tipoeCF = encf.substring(1, 3);
    }

    const rncEmisor = localStorage.getItem('rnc_empresa') || '';
    const razonSocialEmisor = localStorage.getItem('nombre_empresa') || '';

    // Normalizar fecha
    const fechaEmision = factura.fa_fecFact
      ? String(factura.fa_fecFact).substring(0, 10)
      : new Date().toISOString().split('T')[0];

    // 2. Construir el escenario base
    const scenario: any = {
      Version: '1.0',
      RNCEmisor: rncEmisor.replace(/-/g, ''),
      RazonSocialEmisor: razonSocialEmisor,
      RncComprador: String(factura.fa_rncFact || '')
        .trim()
        .replace(/-/g, ''),
      RazonSocialComprador: String(factura.fa_nomClie || '').trim(),
      ENCF: encf,
      TipoeCF: tipoeCF,
      FechaEmision: fechaEmision,
      MontoTotal: factura.fa_valFact,
      TotalITBIS: factura.fa_itbiFact,
      MontoGravadoTotal: factura.fa_subFact,
      TipoIngresos: '01',
      TipoPago: String(factura.fa_fpago || '1'),
      RegimenPagos: '0',
      IndicadorMontoGravado: '1',
    };

    // 3. Agregar items
    items.forEach((item, index) => {
      const i = index + 1;
      // Normalizar campos según vengan de 'items' (modelo local) o 'detalles' (backend)
      const nombre = item.producto?.in_desmerc || item.df_desMerc || '';
      const cantidad = Number(item.cantidad || item.df_canMerc || 0);
      const precio = Number(item.precio || item.df_preMerc || 0);
      const total = Number(item.total || item.df_valMerc || 0);
      // Calcular o usar ITBIS
      const itbis = item.df_itbiMerc ? Number(item.df_itbiMerc) : total * 0.18;

      scenario[`NumeroLinea[${i}]`] = i;
      scenario[`NombreItem[${i}]`] = nombre;
      scenario[`CantidadItem[${i}]`] = cantidad.toFixed(2);
      scenario[`PrecioUnitarioItem[${i}]`] = precio.toFixed(2);
      scenario[`MontoItem[${i}]`] = total.toFixed(2);
      scenario[`MontoITBIS[${i}]`] = itbis.toFixed(2);
      scenario[`TasaITBIS[${i}]`] = 0.18;
      scenario[`IndicadorFacturacion[${i}]`] = '1';
    });

    return { scenarios: [scenario] };
  }

  imprimirFactura() {
    this.formularioFacturacion.get('fa_codFact')?.enable();

    // Preparar datos de la factura
    const facturaData =
      this.DatosSeleccionado || this.formularioFacturacion.value;

    // Construir payload DGII
    let dgiiData: any = {};
    try {
      dgiiData = this.buildDGIIRequest(facturaData, this.items);
    } catch (error) {
      console.error('Error construyendo datos DGII', error);
    }

    // URL del endpoint externo
    const url =
      'https://ecfrecepcion.starsoftdominicana.com/ecf/api/test/api/generate-xml-no-send';

    // Realizar POST
    this.http.post(url, dgiiData).subscribe(
      (response: any) => {
        console.log('Respuesta DGII:', response);

        // Combinar respuesta con datos de factura para impresión
        // Se asume que response trae campos necesarios (ej. qrCode, secCode, etc.)
        const datosParaImprimir = { ...facturaData, ...response };

        this.printingService.imprimirFactura80mm(datosParaImprimir, this.items);
      },
      (error) => {
        console.error('Error obteniendo datos DGII:', error);
        // En caso de error, imprimir solo con datos locales
        this.printingService.imprimirFactura80mm(facturaData, this.items);
      }
    );
  }

  toggleCheckPagado() {
    this.chekPagado = !this.chekPagado;
    if (this.chekPagado) {
      this.valorPagado =
        this.formularioFacturacion.get('fa_valFact')?.value || 0;
      this.txtvalPagado = false;
      this.actualizarCambio();
    } else {
      this.valorPagado = 0;
      this.txtvalPagado = true;
      this.valCambio = 0;
    }
  }

  onValorPagadoChange(event: any) {
    const valor = parseFloat(event.target.value);
    this.valorPagado = isNaN(valor) ? 0 : valor;
    this.actualizarCambio();
  }

  actualizarCambio() {
    const total = this.formularioFacturacion.get('fa_valFact')?.value || 0;
    this.valCambio = this.valorPagado - total;
    if (this.valCambio < 0) this.valCambio = 0;
  }

  selectRow(index: number) {
    this.selectedRow = index;
  }

  marcarImpresa() {
    this.formularioFacturacion.get('fa_codFact')?.enable();
    var paylod = {
      fa_codFact: this.formularioFacturacion.get('fa_codFact')?.value,
      fa_impresa: 'S',
      fa_envio: this.formularioFacturacion.get('fa_envio')?.value,
      fa_fpago: this.formularioFacturacion.get('fa_fpago')?.value,
    };

    this.servicioFacturacion.marcarFacturaComoImpresa(paylod).subscribe(() => {
      Swal.fire({
        icon: 'success',
        title: 'Guardado',
        text: 'Factura guardada correctamente',
        timer: 1500,
      });
      this.limpia();
    });
  }

  buscarFactura() {
    this.imprimirFactura();
  }
}
