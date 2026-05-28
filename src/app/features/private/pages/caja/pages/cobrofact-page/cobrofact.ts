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
// import { HttpInvokeService } from 'src/app/core/services/http-invoke.service';
import { ModeloClienteData } from 'src/app/core/services/mantenimientos/clientes';
import { interfaceDetalleModel } from 'src/app/core/services/facturacion/factura/factura';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import { ServicioSector } from 'src/app/core/services/mantenimientos/sector/sector.service';
import { ModeloSectorData } from 'src/app/core/services/mantenimientos/sector';
import { ModeloFpagoData } from 'src/app/core/services/mantenimientos/fpago';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';
import { ModeloFentregaData } from 'src/app/core/services/mantenimientos/fentrega';
import { ServicioFentrega } from 'src/app/core/services/mantenimientos/fentrega/fentrega.service';
import { ModeloInventarioData } from 'src/app/core/services/mantenimientos/inventario';
import { ServicioNcf } from 'src/app/core/services/mantenimientos/ncf/ncf.service';
import { ModeloNcfData } from 'src/app/core/services/mantenimientos/ncf';
import { PrintingService } from 'src/app/core/services/utils/printing.service';
import { ServicioConfiguracionGlobal } from 'src/app/core/services/mantenimientos/configuracion-global/configuracion-global.service';
import { ServicioSalidafactura } from 'src/app/core/services/almacen/salidafactura/salidafactura.service';
import { ServicioOrigenPago } from 'src/app/core/services/mantenimientos/origenpago/origenpago.service';

declare var $: any;

type FacturaCajaRow = FacturacionModelData & {
  caja_status?: string;
  caja_pendiente_pago?: boolean;
};

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
  origenPagoSeleccionado = '';
  confirmacionPago = '';
  notaPago = '';
  currentPage = 1;
  maxPagesToShow = 5;
  valorpagado: number = 0;
  valCambio: number = 0;
  facturaSelecionada: any = null;
  DatosSeleccionado!: FacturacionModelData;
  bloquearReimpresion = false;
  permitirImpresion = false;
  nomChoferSalida: string = '';
  codFacturaselecte = ' ';
  txtdescripcion: string = '';
  descripcionFormaPago: string = '';
  resultadoOrigenPago: any[] = [];
  cargandoOrigenPago = false;
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
  facturacionList: FacturaCajaRow[] = [];
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

  get hayFacturaSeleccionada(): boolean {
    return !!String(this.formularioFacturacion?.get('fa_codFact')?.value || '').trim();
  }

  get esEntregaEnvio(): boolean {
    const codigo = Number(this.fentrega);
    if (codigo === 1) return true;

    const entrega = this.resultadoFentrega.find(
      (item) => Number(item.idfentrega) === codigo,
    );
    const descripcion = String(entrega?.desentrega || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
    return descripcion === 'envio';
  }

  get facturaEstaImpresa(): boolean {
    const valorFormulario = this.formularioFacturacion?.get('fa_impresa')?.value;
    const valorFactura = (this.DatosSeleccionado as any)?.fa_impresa;
    return (
      this.normalizeImpresa(valorFormulario) === 'S' ||
      this.normalizeImpresa(valorFactura) === 'S'
    );
  }

  get facturaEstaPagada(): boolean {
    const valorFormulario = this.formularioFacturacion?.get('fa_fpago')?.value;
    const valorFactura = (this.DatosSeleccionado as any)?.fa_fpago;
    const pago = this.normalizeImpresa(valorFormulario || valorFactura);
    return pago === 'S' || pago === 'P';
  }

  private aplicarEstadoPagoUi(factura: any): void {
    const estaPagada = this.normalizeImpresa(factura?.fa_fpago) === 'S' ||
      this.normalizeImpresa(factura?.fa_fpago) === 'P';
    if (!estaPagada) return;

    this.chekPagado = true;
    this.txtvalPagado = true;
    const total = Number(factura?.fa_valFact || this.formularioFacturacion?.get('fa_valFact')?.value || 0);
    this.valorPagado = total;
    this.valCambio = 0;
  }

  private getIdSalidaFromFactura(factura: any): string {
    const raw =
      factura?.idsalida ??
      factura?.idSalida ??
      factura?.IdSalida ??
      factura?.fa_idsalida ??
      factura?.fa_idSalida ??
      '';
    return String(raw ?? '').trim();
  }

  private aplicarDatosSalidaFactura(factura: any): string {
    const idSalida = this.getIdSalidaFromFactura(factura);
    const faSalida = factura?.fa_salida ?? factura?.faSalida ?? factura?.fa_Salida;

    if (idSalida || faSalida !== undefined) {
      this.formularioFacturacion.patchValue(
        {
          idsalida: idSalida,
          ...(faSalida !== undefined ? { fa_salida: faSalida } : {}),
        },
        { emitEvent: false },
      );
    }

    if (factura && Object.keys(factura).length) {
      this.DatosSeleccionado = {
        ...(this.DatosSeleccionado || {}),
        ...factura,
        idsalida: idSalida || (this.DatosSeleccionado as any)?.idsalida,
      } as any;
      this.facturaSelecionada = this.DatosSeleccionado;
    }

    if (idSalida) {
      this.cargarChoferDeSalida(idSalida);
    }

    return idSalida;
  }

  private completarDatosSalidaFactura(factura: any): void {
    const codFact = String(factura?.fa_codFact || '').trim();
    if (!codFact) return;

    this.servicioFacturacion.getByNumero(codFact).subscribe({
      next: (resp: any) => {
        const facturaCompleta = resp?.data || resp || {};
        const idSalida = this.aplicarDatosSalidaFactura(facturaCompleta);
        if (!idSalida) {
          this.buscarSalidaPorDetalle(codFact);
        }
      },
      error: () => this.buscarSalidaPorDetalle(codFact),
    });
  }

  private buscarSalidaPorDetalle(codFact: string): void {
    this.servicioSalidaFactura.obtenerSalidaPorFactura(codFact).subscribe({
      next: (resp: any) => {
        const data = resp?.data || resp || null;
        if (!data) return;

        const idSalida = String(
          data?.idsalida ||
            data?.codSalida ||
            data?.salida?.codSalida ||
            data?.detalle?.codSalida ||
            data?.detalle?.idsalida ||
            '',
        ).trim();

        if (!idSalida) return;

        this.formularioFacturacion.patchValue(
          {
            idsalida: idSalida,
            fa_salida: this.formularioFacturacion.get('fa_salida')?.value || 'S',
          },
          { emitEvent: false },
        );
        this.DatosSeleccionado = {
          ...(this.DatosSeleccionado || {}),
          idsalida: idSalida,
          fa_salida: (this.DatosSeleccionado as any)?.fa_salida || 'S',
        } as any;
        this.facturaSelecionada = this.DatosSeleccionado;
        this.cargarChoferDeSalida(idSalida);
      },
      error: (err: any) => {
        console.warn('No se pudo consultar la salida de la factura', err);
      },
    });
  }

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
    private servicioConfiguracionGlobal: ServicioConfiguracionGlobal,
    private printingService: PrintingService,
    private servicioSalidaFactura: ServicioSalidafactura,
    private servicioOrigenPago: ServicioOrigenPago,
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
    this.obtenerOrigenPago();
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
  obtenerOrigenPago() {
    this.cargandoOrigenPago = true;
    this.servicioOrigenPago.obtenerTodosOrigenPago().subscribe({
      next: (response) => {
        this.resultadoOrigenPago = response.data || [];
        this.cargandoOrigenPago = false;
      },
      error: (err) => {
        console.error('Error cargando origenes de pago', err);
        this.resultadoOrigenPago = [];
        this.cargandoOrigenPago = false;
      },
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
      fa_origenpago: [''],
      fa_confirpago: [''],
      fa_notapago: [''],
      fa_envio: [{ value: '', disabled: true }],
      fa_ncfFact: [{ value: '', disabled: true }],
      fa_tipoNcf: [{ value: '', disabled: true }],
      fa_contacto: [{ value: '', disabled: true }],
      fa_despacho: [{ value: '', disabled: true }],
      fa_reimpresa: [{ value: '', disabled: true }],
      fa_entrega: [{ value: '', disabled: true }],
      fa_impresa: [{ value: '', disabled: true }],
      fa_facturada: [{ value: '', disabled: true }],
      fa_salida: [{ value: '', disabled: true }],
      idsalida: [{ value: '', disabled: true }],
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
    this.origenPagoSeleccionado = '';
    this.confirmacionPago = '';
    this.notaPago = '';
    this.bloquearReimpresion = false;
    this.permitirImpresion = false;
    this.nomChoferSalida = '';
    this.facturaSelecionada = null;
    this.DatosSeleccionado = undefined as any;
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
    this.facturaSelecionada = Factura;
    this.modoedicionFacturacion = true;
    this.formularioFacturacion.patchValue(Factura);
    this.DatosSeleccionado = Factura;
    this.fentrega = String((Factura as any).fa_envio ?? '');
    this.ftipoPago = String((Factura as any).fa_codfpago ?? 1);
    this.cargarDatosOrigenPago(Factura);
    const idSalida = this.getIdSalidaFromFactura(Factura);
    this.formularioFacturacion.patchValue(
      { idsalida: idSalida },
      { emitEvent: false },
    );
    this.bloquearReimpresion = this.esPendientePago(Factura);
    this.permitirImpresion =
      !this.bloquearReimpresion &&
      Number((Factura as any)?.fa_envio) === 1 &&
      this.normalizeImpresa((Factura as any)?.fa_impresa) === 'N';
    this.aplicarEstadoPagoUi(Factura);
    this.cargarChoferDeSalida(idSalida);
    this.completarDatosSalidaFactura(Factura);
    if (this.bloquearReimpresion) {
      this.chekPagado = false;
      this.txtvalPagado = true;
      this.valorPagado = 0;
      this.valCambio = 0;
    }
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
    this.servicioFacturacion.obtenerFacturasNoImpresas().subscribe({
      next: (resp) => {
        console.log('Facturas recibidas:', resp.data);
        const rows = Array.isArray(resp?.data) ? resp.data : [];
        this.facturacionList = rows
          .filter((row: any) => this.cumpleFiltroListaCaja(row))
          .map((row: any) => ({
            ...(row as any),
            caja_pendiente_pago: this.esPendientePago(row),
            caja_status: this.statusCaja(row),
          }));
      },
      error: (err) => {
        console.error('Error cargando facturas de caja:', err);
        this.facturacionList = [];
        Swal.fire('Error', this.extraerMensajeError(err), 'error');
      },
    });
  }

  consultarFacturacion(factura: FacturacionModelData) {
    this.modoconsultaFacturacion = true;
    this.formularioFacturacion.reset();
    this.crearFormularioFacturacion();
    this.formularioFacturacion.patchValue(factura);
    const idSalida = this.getIdSalidaFromFactura(factura);
    this.formularioFacturacion.patchValue(
      { idsalida: idSalida },
      { emitEvent: false },
    );
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
    this.facturaSelecionada = factura;
    this.cargarDatosOrigenPago(factura);
    this.bloquearReimpresion = this.esPendientePago(factura);
    this.permitirImpresion =
      !this.bloquearReimpresion &&
      Number((factura as any)?.fa_envio) === 1 &&
      this.normalizeImpresa((factura as any)?.fa_impresa) === 'N';
    this.aplicarEstadoPagoUi(factura);
    this.cargarChoferDeSalida(idSalida);
    this.completarDatosSalidaFactura(factura);
    if (this.bloquearReimpresion) {
      this.chekPagado = false;
      this.txtvalPagado = true;
      this.valorPagado = 0;
      this.valCambio = 0;
    }
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
        'cantidad-' + index,
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

  private formatearFechaDgii(input: any): string {
    if (!input) {
      const now = new Date();
      const d = String(now.getDate()).padStart(2, '0');
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const y = now.getFullYear();
      return `${d}-${m}-${y}`;
    }

    const source = String(input).trim();
    const onlyDate = source.length >= 10 ? source.substring(0, 10) : source;
    const iso = onlyDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      return `${iso[3]}-${iso[2]}-${iso[1]}`;
    }
    const dmy = onlyDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmy) {
      return `${dmy[1]}-${dmy[2]}-${dmy[3]}`;
    }
    const dt = new Date(source);
    if (!isNaN(dt.getTime())) {
      const d = String(dt.getDate()).padStart(2, '0');
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const y = dt.getFullYear();
      return `${d}-${m}-${y}`;
    }
    return onlyDate;
  }

  private normalizarRespuestaDgii(raw: any): any {
    const pick = (...values: any[]): string | null => {
      for (const value of values) {
        if (value === null || value === undefined) continue;
        const text = String(value).trim();
        if (text) return text;
      }
      return null;
    };

    const root = raw?.data && typeof raw.data === 'object' ? raw.data : raw;
    const payload =
      root?.data && typeof root.data === 'object' ? root.data : root;
    const firstResult =
      Array.isArray(payload?.results) && payload.results.length
        ? payload.results[0]
        : null;
    const nested =
      (firstResult && typeof firstResult === 'object' && firstResult) ||
      (payload?.result && typeof payload.result === 'object' && payload.result) ||
      payload;

    const xmls = nested?.xmls && typeof nested.xmls === 'object' ? nested.xmls : {};
    const rfceInfo =
      nested?.rfceInfo && typeof nested.rfceInfo === 'object' ? nested.rfceInfo : {};
    const ecfInfo =
      nested?.ecfInfo && typeof nested.ecfInfo === 'object' ? nested.ecfInfo : {};
    const responseRFCE =
      nested?.responseRFCE && typeof nested.responseRFCE === 'object'
        ? nested.responseRFCE
        : {};
    const dgiiResponse =
      responseRFCE?.dgiiResponse && typeof responseRFCE.dgiiResponse === 'object'
        ? responseRFCE.dgiiResponse
        : {};

    const qrLink = pick(
      nested?.qr_link,
      nested?.qrUrl,
      nested?.qrLink,
      nested?.urlQr,
      nested?.qr,
      nested?.link_original,
      rfceInfo?.link_original,
      rfceInfo?.qrUrl,
      ecfInfo?.qrUrl,
      responseRFCE?.qrUrl
    );
    const codigoSeguridad = pick(
      nested?.codseguridad,
      nested?.codigoSeguridadeCF,
      nested?.codigoSeguridad,
      nested?.securityCode,
      rfceInfo?.codigoSeguridad,
      rfceInfo?.codigoSeguridadeCF,
      responseRFCE?.codigoSeguridad,
      responseRFCE?.codigoSeguridadeCF
    );
    const fechaFirma = pick(
      nested?.fec_firma,
      nested?.fechaHoraFirmaRFCE,
      nested?.fechaHoraFirma,
      nested?.fechaFirma,
      nested?.fecha_firma,
      rfceInfo?.fechaHoraFirma
    );
    const estadoDgii = pick(
      nested?.estado_dgii,
      nested?.rfceEstado,
      nested?.estado,
      dgiiResponse?.estado,
      nested?.status,
      nested?.estadoEnvio
    );

    return {
      ...nested,
      estado_dgii: estadoDgii,
      codseguridad: codigoSeguridad,
      qr_link: qrLink,
      qrUrl: qrLink,
      link_original: qrLink,
      fec_firma: fechaFirma,
      signatureDateTime: fechaFirma,
      ecf: nested?.ecf ?? xmls?.ecf ?? null,
      rfce: nested?.rfce ?? xmls?.rfce ?? null,
      estado_envio_dgii: pick(
        nested?.estado_envio_dgii,
        nested?.estadoEnvio,
        nested?.rfceEstado,
        dgiiResponse?.estado,
        nested?.status
      ),
    };
  }

  private extraerMensajeError(error: any): string {
    const msg =
      error?.error?.message ||
      error?.error?.details ||
      error?.message ||
      error?.statusText ||
      'No se pudo generar el comprobante electrónico.';
    return String(msg);
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
    const fechaEmision = this.formatearFechaDgii(factura.fa_fecFact);
    const montoTotal = Number(factura.fa_valFact || 0);
    const totalItbis = Number(factura.fa_itbiFact || 0);
    const montoGravado = Number(factura.fa_subFact || 0);
    const montoExento = Math.max(0, montoTotal - montoGravado - totalItbis);
    const rncEmisorLimpio = rncEmisor.replace(/-/g, '');

    // 2. Construir el escenario base
    const scenario: any = {
      Version: '1.0',
      RNCEmisor: rncEmisorLimpio,
      RazonSocialEmisor: razonSocialEmisor,
      RncComprador: String(factura.fa_rncFact || '')
        .trim()
        .replace(/-/g, ''),
      RazonSocialComprador: String(factura.fa_nomClie || '').trim(),
      ENCF: encf,
      TipoeCF: tipoeCF,
      FechaEmision: fechaEmision,
      MontoExento: montoExento.toFixed(2),
      MontoGravadoTotal: montoGravado.toFixed(2),
      TotalITBIS: totalItbis.toFixed(2),
      MontoTotal: montoTotal.toFixed(2),
      TipoIngresos: '01',
      TipoPago: String((factura as any).fa_codfpago || factura.fa_fpago || '1'),
      RegimenPagos: '0',
      IndicadorMontoGravado: '1',
      CasoPrueba: `${rncEmisorLimpio}${encf}`,
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
      scenario[`IndicadorBienoServicio[${i}]`] = '1';
      scenario[`CantidadItem[${i}]`] = cantidad.toFixed(2);
      scenario[`PrecioUnitarioItem[${i}]`] = precio.toFixed(2);
      scenario[`MontoItem[${i}]`] = total.toFixed(2);
      scenario[`MontoITBIS[${i}]`] = itbis.toFixed(2);
      scenario[`TasaITBIS[${i}]`] = 0.18;
      scenario[`IndicadorFacturacion[${i}]`] = '1';
    });

    scenario['FormaPago[1]'] = String((factura as any).fa_codfpago || factura.fa_fpago || '1');
    scenario['MontoPago[1]'] = montoTotal.toFixed(2);

    // Retornar el objeto escenario directamente, sin envolverlo en un array
    return scenario;
  }

  async imprimirFactura(facturaActual?: FacturacionModelData) {
    this.formularioFacturacion.get('fa_codFact')?.enable();

    // Preparar datos de la factura
    const facturaData =
      facturaActual || this.DatosSeleccionado || this.formularioFacturacion.value;
    const datosLocalesImpresion = {
      ...this.formularioFacturacion.getRawValue(),
      ...(this.DatosSeleccionado || {}),
      ...(facturaData || {}),
      fa_codFact:
        facturaData?.fa_codFact ||
        this.formularioFacturacion.get('fa_codFact')?.value ||
        '',
      barcodeValue:
        facturaData?.fa_codFact ||
        this.formularioFacturacion.get('fa_codFact')?.value ||
        '',
    };

    // Construir payload DGII
    let dgiiData: any = {};
    try {
      dgiiData = this.buildDGIIRequest(facturaData, this.items);
    } catch (error) {
      console.error('Error construyendo datos DGII', error);
      Swal.fire('Error', 'Error construyendo datos para DGII', 'error');
      return;
    }

    const rncEmisor = String(localStorage.getItem('rnc_empresa') || '')
      .trim()
      .replace(/-/g, '');
    if (!rncEmisor) {
      Swal.fire(
        'Configuración incompleta',
        'No se encontró el RNC emisor activo en la sesión.',
        'warning'
      );
      return;
    }

    // Mostrar Loading
    Swal.fire({
      title: 'Procesando...',
      text: 'Generando comprobante electrónico...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    // Envío server-side (Edge Function) para evitar CORS en navegador.
    this.servicioConfiguracionGlobal.enviarDgiiDirectCert([dgiiData], rncEmisor).subscribe(
      (response: any) => {
        console.log('Respuesta DGII:', response);
        const payloadDgii = this.normalizarRespuestaDgii(
          response?.data ?? response
        );
        payloadDgii.fa_status = 'F';

        // Actualizar mensaje de loading
        Swal.update({
          text: 'Actualizando datos de factura...',
        });

        // Llamar a nuestro backend para guardar los datos DGII
        this.servicioFacturacion
          .actualizarDatosDgii(facturaData.fa_codFact, payloadDgii)
          .subscribe({
            next: (res) => {
              console.log('Datos DGII guardados correctamente', res);
              this.DatosSeleccionado = {
                ...(this.DatosSeleccionado || {}),
                ...(res?.data || {}),
                fa_status: payloadDgii.fa_status,
              };
              this.formularioFacturacion.patchValue(
                { fa_status: payloadDgii.fa_status },
                { emitEvent: false },
              );
              Swal.close();
              this.buscarFacturasNoImpresas();

              // Combinar respuesta con datos de factura para impresión
              const datosParaImprimir = {
                ...facturaData,
                ...(res?.data || {}),
                ...datosLocalesImpresion,
                ...payloadDgii,
              };
              this.printingService.imprimirFactura80mm(
                datosParaImprimir,
                this.items,
              );
            },
            error: (err) => {
              console.error('Error guardando datos DGII', err);
              Swal.fire(
                'Error',
                'Se generó el comprobante pero falló al guardar los datos en el sistema.',
                'warning',
              ).then(() => {
                // Opcional: imprimir de todos modos o detenerse
                // Por seguridad, imprimimos para que no se pierda el comprobante generado
                const datosParaImprimir = {
                  ...datosLocalesImpresion,
                  ...payloadDgii,
                };
                this.printingService.imprimirFactura80mm(
                  datosParaImprimir,
                  this.items,
                );
              });
            },
          });
      },
      (error) => {
        console.error('Error obteniendo datos DGII:', error);
        Swal.fire({
          title: 'DGII no respondió',
          text: `${this.extraerMensajeError(error)}. Se imprimirá con los datos locales de la factura.`,
          icon: 'warning',
        }).then(() => {
          this.printingService.imprimirFactura80mm(
            datosLocalesImpresion,
            this.items,
          );
        });
      },
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

  onTipoPagoChange() {
    this.formularioFacturacion.patchValue(
      { fa_codfpago: this.ftipoPago },
      { emitEvent: false },
    );
    if (this.esPagoDiferenteEfectivo()) {
      this.abrirModalOrigenPago();
    } else {
      this.origenPagoSeleccionado = '';
      this.confirmacionPago = '';
      this.notaPago = '';
      this.formularioFacturacion.patchValue(
        { fa_origenpago: '', fa_confirpago: '', fa_notapago: '' },
        { emitEvent: false },
      );
    }
  }

  onEntregaChange() {
    this.formularioFacturacion.patchValue(
      { fa_envio: this.fentrega },
      { emitEvent: false },
    );
    this.actualizarPermisoImpresion();
  }

  private actualizarPermisoImpresion() {
    this.permitirImpresion =
      this.hayFacturaSeleccionada &&
      !this.bloquearReimpresion &&
      this.esEntregaEnvio &&
      this.normalizeImpresa((this.DatosSeleccionado as any)?.fa_impresa) === 'N';
  }

  private cargarDatosOrigenPago(factura: any): void {
    this.origenPagoSeleccionado = String((factura as any)?.fa_origenpago || '').trim();
    this.confirmacionPago = String((factura as any)?.fa_confirpago || '').trim();
    this.notaPago = String((factura as any)?.fa_notapago || '').trim();
  }

  private descripcionTipoPagoActual(): string {
    const actual = String(this.ftipoPago || '').trim();
    const fpago = this.resultadoFpago.find(
      (item) => String(item.fp_codfpago ?? '').trim() === actual,
    );
    return String(fpago?.fp_descfpago || '').trim();
  }

  esPagoDiferenteEfectivo(): boolean {
    if (!this.ftipoPago) return false;
    const descripcion = this.descripcionTipoPagoActual()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
    return descripcion ? descripcion !== 'efectivo' : String(this.ftipoPago).trim() !== '1';
  }

  private abrirModalOrigenPago(): void {
    if (this.resultadoOrigenPago.length === 0 && !this.cargandoOrigenPago) {
      this.obtenerOrigenPago();
    }
    setTimeout(() => $('#modalOrigenPago').modal('show'), 0);
  }

  guardarOrigenPagoModal(): void {
    if (!this.origenPagoSeleccionado) {
      Swal.fire('Aviso', 'Seleccione el origen de pago.', 'warning');
      return;
    }

    this.formularioFacturacion.patchValue(
      {
        fa_origenpago: this.origenPagoSeleccionado,
        fa_confirpago: this.confirmacionPago,
        fa_notapago: this.notaPago,
      },
      { emitEvent: false },
    );
    $('#modalOrigenPago').modal('hide');
  }

  private validarOrigenPagoSiAplica(): boolean {
    if (!this.esPagoDiferenteEfectivo()) return true;
    if (this.origenPagoSeleccionado) return true;

    Swal.fire('Aviso', 'Debe indicar el origen de pago.', 'warning').then(() => {
      this.abrirModalOrigenPago();
    });
    return false;
  }

  selectRow(index: number) {
    this.selectedRow = index;
  }

  guardarPagoEntrega() {
    this.formularioFacturacion.get('fa_codFact')?.enable();
    const cod = this.formularioFacturacion.get('fa_codFact')?.value;
    if (!cod) {
      Swal.fire('Aviso', 'Seleccione una factura primero.', 'warning');
      return;
    }

    const total = Number(this.formularioFacturacion.get('fa_valFact')?.value || 0);
    if (this.chekPagado && this.valorPagado < total) {
      Swal.fire(
        'Aviso',
        'El valor pagado debe ser igual o mayor al valor de la factura.',
        'warning',
      );
      return;
    }
    if (!this.validarOrigenPagoSiAplica()) return;

    const payload = {
      fa_codFact: this.formularioFacturacion.get('fa_codFact')?.value,
      fa_envio: this.fentrega,
      fa_codfpago: this.ftipoPago,
      fa_fpago: this.chekPagado ? 'S' : 'N',
      fa_origenpago: this.origenPagoSeleccionado,
      fa_confirpago: this.confirmacionPago,
      fa_notapago: this.notaPago,
    };

    this.servicioFacturacion.actualizarPagoEntregaCaja(payload).subscribe({
      next: (resp: any) => {
        const facturaActualizada = resp?.data || {
          ...(this.DatosSeleccionado || {}),
          fa_envio: this.fentrega,
          fa_codfpago: this.ftipoPago,
          fa_fpago: payload.fa_fpago,
          fa_origenpago: payload.fa_origenpago,
          fa_confirpago: payload.fa_confirpago,
          fa_notapago: payload.fa_notapago,
        };
        this.DatosSeleccionado = facturaActualizada;
        this.formularioFacturacion.patchValue(
          {
            fa_envio: this.fentrega,
            fa_codfpago: this.ftipoPago,
            fa_fpago: payload.fa_fpago,
            fa_origenpago: payload.fa_origenpago,
            fa_confirpago: payload.fa_confirpago,
            fa_notapago: payload.fa_notapago,
          },
          { emitEvent: false },
        );
        Swal.fire({
          icon: 'success',
          title: 'Guardado',
          text: 'Factura guardada correctamente',
          timer: 1500,
        });
        this.buscarFacturasNoImpresas();
      },
      error: (err) => {
        console.error('Error guardando pago y entrega:', err);
        Swal.fire('Error', this.extraerMensajeError(err), 'error');
      },
    });
  }

  imprimirConduceFactura() {
    if (!this.hayFacturaSeleccionada) {
      Swal.fire('Aviso', 'Seleccione una factura primero.', 'warning');
      return;
    }
    if (!this.esEntregaEnvio) {
      Swal.fire('Aviso', 'El conduce solo aplica para entrega por envio.', 'warning');
      return;
    }
    if (!this.validarOrigenPagoSiAplica()) return;

    const cod = this.formularioFacturacion.get('fa_codFact')?.value;
    const payload = {
      fa_codFact: cod,
      fa_impresa: 'S',
      fa_status: 'C',
      fa_envio: this.fentrega,
      fa_codfpago: this.ftipoPago,
      fa_fpago: this.normalizeImpresa((this.DatosSeleccionado as any)?.fa_fpago) || 'N',
      fa_origenpago: this.origenPagoSeleccionado,
      fa_confirpago: this.confirmacionPago,
      fa_notapago: this.notaPago,
    };

    const facturaData = {
      ...(this.DatosSeleccionado || {}),
      ...this.formularioFacturacion.getRawValue(),
      fa_envio: this.fentrega,
      fa_codfpago: this.ftipoPago,
      fa_impresa: 'S',
      fa_status: 'C',
      fa_origenpago: this.origenPagoSeleccionado,
      fa_confirpago: this.confirmacionPago,
      fa_notapago: this.notaPago,
    };

    this.servicioFacturacion.marcarFacturaComoImpresa(payload).subscribe({
      next: (resp: any) => {
        const facturaActualizada = {
          ...facturaData,
          ...(resp?.data || {}),
          fa_impresa: 'S',
          fa_status: 'C',
        };
        this.DatosSeleccionado = facturaActualizada;
        this.formularioFacturacion.patchValue(
          {
            fa_impresa: 'S',
            fa_status: 'C',
            fa_envio: this.fentrega,
            fa_codfpago: this.ftipoPago,
          },
          { emitEvent: false },
        );
        this.buscarFacturasNoImpresas();
        this.printingService.imprimirConduceFactura80mm(
          facturaActualizada,
          this.items,
        );
      },
      error: (err) => {
        console.error('Error marcando conduce:', err);
        Swal.fire('Error', this.extraerMensajeError(err), 'error');
      },
    });
  }

  private isBlankField(value: any): boolean {
    return value === null || value === undefined || String(value).trim() === '';
  }

  private normalizeImpresa(value: any): string {
    return String(value ?? '').trim().toUpperCase();
  }

  private normalizarStatusFactura(value: any): string {
    return String(value ?? '').trim().toUpperCase();
  }

  private esPendientePago(factura: any): boolean {
    return (
      this.normalizeImpresa(factura?.fa_impresa) === 'S' &&
      this.normalizeImpresa(factura?.fa_fpago) === 'N'
    );
  }

  private statusCaja(factura: any): string {
    const statusFactura = this.normalizarStatusFactura(factura?.fa_status);
    const fpago = this.normalizeImpresa(factura?.fa_fpago);

    if (statusFactura === 'F' && fpago === 'N') return 'Pend. pago';
    if (statusFactura !== 'C') return '';
    if (this.normalizeImpresa(factura?.fa_impresa) !== 'S') return '';

    if (fpago === 'S' || fpago === 'P') return 'Factura pagada';
    if (fpago === 'N' || fpago === '') return 'Pend. pago';
    return '';
  }

  claseStatusCaja(factura: any): string {
    const status = this.statusCaja(factura);
    if (status === 'Factura pagada') return 'bg-success';
    if (status === 'Pend. pago') return 'bg-danger';
    return 'bg-secondary';
  }

  private cumpleFiltroListaCaja(factura: any): boolean {
    const statusFactura = this.normalizarStatusFactura(factura?.fa_status);
    const fpago = this.normalizeImpresa(factura?.fa_fpago);

    return (
      this.normalizeImpresa(factura?.fa_impresa) === 'N' ||
      this.esPendientePago(factura) ||
      statusFactura === 'C' ||
      (statusFactura === 'F' && fpago === 'N')
    );
  }

  private cargarChoferDeSalida(idsalida: any) {
    const cod = String(idsalida ?? '').trim();
    if (!cod) {
      this.nomChoferSalida = '';
      return;
    }

    this.servicioSalidaFactura.obtenerPorCodigoSalida(cod).subscribe({
      next: (resp: any) => {
        const data = resp?.data ?? resp;
        this.nomChoferSalida = String(data?.nomChofer ?? data?.nomchofer ?? '').trim();
      },
      error: () => {
        this.nomChoferSalida = '';
      },
    });
  }

  marcarImpresa() {
    this.buscarFactura();
  }

  buscarFactura() {
    if (this.bloquearReimpresion) return;

    const cod = this.formularioFacturacion.get('fa_codFact')?.value;
    if (!cod) {
      Swal.fire('Aviso', 'Seleccione una factura primero.', 'warning');
      return;
    }
    if (!this.validarOrigenPagoSiAplica()) return;

    // Guardar estado antes de imprimir:
    // - fa_impresa siempre 'S'
    // - fa_fpago 'S' si se marcó Factura Pagada, si no 'N'
    const payload: any = {
      fa_codFact: cod,
      fa_impresa: 'S',
      fa_fpago: this.chekPagado ? 'S' : 'N',
      fa_envio: this.fentrega,
      fa_codfpago: this.ftipoPago,
      fa_origenpago: this.origenPagoSeleccionado,
      fa_confirpago: this.confirmacionPago,
      fa_notapago: this.notaPago,
    };

    this.servicioFacturacion.asignarEncfFactura(cod).subscribe({
      next: (encfResp: any) => {
        const facturaConEncf = {
          ...(this.DatosSeleccionado || {}),
          ...(encfResp?.data || {}),
        };
        this.DatosSeleccionado = facturaConEncf;
        this.formularioFacturacion.patchValue(
          {
            fa_ncfFact: facturaConEncf.fa_ncfFact,
            fa_tipoNcf: facturaConEncf.fa_tipoNcf,
            fa_fecNcf: facturaConEncf.fa_fecNcf,
          },
          { emitEvent: false },
        );

        this.servicioFacturacion.marcarFacturaComoImpresa(payload).subscribe({
          next: (resp: any) => {
            const facturaCobro = {
              ...facturaConEncf,
              ...(resp?.data || {}),
              fa_envio: this.fentrega,
              fa_codfpago: this.ftipoPago,
              fa_fpago: payload.fa_fpago,
              fa_origenpago: payload.fa_origenpago,
              fa_confirpago: payload.fa_confirpago,
              fa_notapago: payload.fa_notapago,
            };
            this.DatosSeleccionado = facturaCobro;
            this.formularioFacturacion.patchValue(
              {
                fa_ncfFact: facturaCobro.fa_ncfFact,
                fa_tipoNcf: facturaCobro.fa_tipoNcf,
                fa_envio: this.fentrega,
                fa_codfpago: this.ftipoPago,
                fa_fpago: payload.fa_fpago,
                fa_origenpago: payload.fa_origenpago,
                fa_confirpago: payload.fa_confirpago,
                fa_notapago: payload.fa_notapago,
              },
              { emitEvent: false },
            );
            this.buscarFacturasNoImpresas();
            this.imprimirFactura(facturaCobro);
          },
          error: (err) => {
            console.error('Error guardando factura antes de imprimir:', err);
            Swal.fire('Error', this.extraerMensajeError(err), 'error');
          },
        });
      },
      error: (err) => {
        console.error('Error generando ENCF antes de enviar DGII:', err);
        Swal.fire('Error', this.extraerMensajeError(err), 'error');
      },
    });
  }
}
