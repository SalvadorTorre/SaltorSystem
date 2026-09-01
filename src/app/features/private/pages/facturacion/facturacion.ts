import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
// import { FormsModule } from '@angular/forms';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  BehaviorSubject,
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  tap,
  catchError,
  of,
  map,
  firstValueFrom,
  Subscription,
  Subject,
  timeout,
  retry,
  finalize,
} from 'rxjs';
import Swal from 'sweetalert2';
// import { ModeloUsuarioData } from 'src/app/core/services/mantenimientos/usuario';
// import { ModeloRncData } from 'src/app/core/services/mantenimientos/rnc';
import { ServicioRnc } from 'src/app/core/services/mantenimientos/rnc/rnc.service';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import {
  FacturacionModelData,
  detFacturaData,
} from 'src/app/core/services/facturacion/factura';
import { ServicioCliente } from 'src/app/core/services/mantenimientos/clientes/cliente.service';
import { HttpInvokeService } from 'src/app/core/services/http-invoke.service';
import {
  ModeloCliente,
  ModeloClienteData,
} from 'src/app/core/services/mantenimientos/clientes';
import { interfaceDetalleModel } from 'src/app/core/services/facturacion/factura/factura';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import { ServicioSector } from 'src/app/core/services/mantenimientos/sector/sector.service';
import {
  ModeloSector,
  ModeloSectorData,
} from 'src/app/core/services/mantenimientos/sector';
import { ModeloFpagoData } from 'src/app/core/services/mantenimientos/fpago';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';
import {
  ModeloInventario,
  ModeloInventarioData,
} from 'src/app/core/services/mantenimientos/inventario';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as QRCode from 'qrcode';
// import { disableDebugTools } from '@angular/platform-browser';
import { ServicioNcf } from 'src/app/core/services/mantenimientos/ncf/ncf.service';
import { ModeloNcfData } from 'src/app/core/services/mantenimientos/ncf';
import { ServicioSalidafactura } from 'src/app/core/services/almacen/salidafactura/salidafactura.service';
import { ItbisData, ServicioItbis } from 'src/app/core/services/mantenimientos/itbis/itbis.service';
import { FacturaDgiiService } from 'src/app/core/services/facturacion/factura/factura-dgii.service';
declare var $: any;

interface ResumenConsultaFactura {
  pagada: boolean;
  documento: string;
  estadoDgii: string;
  claseEstadoDgii: string;
  pendiente: boolean;
  entregada: boolean;
  salida: boolean;
  codigoSalida: string;
  estadoSalida: string;
  chofer: string;
  choferAsignado: boolean;
  despachoForjas: boolean;
  despachoPatio: boolean;
}

@Component({
  selector: 'facturacion',
  templateUrl: './facturacion.html',
  styleUrls: ['./facturacion.css'],
})
export class Facturacion implements OnInit, OnDestroy {
  @ViewChild('inputCodmerc') inputCodmerc!: ElementRef; // Para manejar el foco
  @ViewChild('codigoInput') codigoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('descripcionInput') descripcionInput!: ElementRef; // Para manejar el foco
  @ViewChild('Tabladetalle') Tabladetalle?: ElementRef;
  isDisabled: boolean = true;
  totalItems = 0;
  pageSize = 5;
  readonly limiteFacturasInicial = 20;
  readonly limiteFacturasModalInicial = 10;
  readonly limiteFacturasBusqueda = 20;
  readonly minimoLetrasBusquedaNombreFactura = 4;
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
  facturacionid!: string;
  modoconsultaFacturacion: boolean = false;
  facturaConsultaSeleccionada: FacturacionModelData | null = null;
  facturacionList: FacturacionModelData[] = [];
  facturacionListBase: FacturacionModelData[] = [];
  cargandoFacturasModal = false;
  busquedaFacturaModalRealizada = false;
  detFacturaList: detFacturaData[] = [];
  selectedFacturacion: any = null;

  get filasVaciasBusquedaFactura(): number[] {
    // El mensaje de carga/sin resultados también ocupa una fila visual.
    const filasOcupadas = this.facturacionList.length > 0 ? this.facturacionList.length : 1;
    return Array.from({ length: Math.max(0, 7 - filasOcupadas) }, (_, index) => index);
  }

  items: interfaceDetalleModel[] = [];
  ncflist: ModeloNcfData[] = [];
  selectedItem: any = null;
  totalGral: number = 0;
  totalItbis: number = 0;
  totalcosto: number = 0;
  costoGral: number = 0;
  subTotal: number = 0;
  itbisActual: ItbisData | null = null;
  subtotaltxt: string = '';
  existenciatxt: any;
  existtxt: any;
  medidatxt: any;
  margenVentatxt: any;
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
  gtxt: any;
  htxt: any;
  factxt: any;
  protxt: any;
  descuentotxt: string = '';
  tiponcf: string = 'Consumidor Final';
  static detFactura: detFacturaData[];
  codmerc: string = '';
  tipomerc: string = '';
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
  private codigoVendedorValidado = '';
  private validandoVendedor = false;
  codmerVacio: boolean = false;
  desmerVacio: boolean = false;
  isLoading: boolean = false;
  clienteRncNoExiste: boolean = false;
  rncApiNombre: string = '';
  rncApiValor: string = '';
  resumenConsultaFactura: ResumenConsultaFactura | null = null;
  detallePendienteConsulta: any[] = [];
  cargandoDetallePendienteConsulta: boolean = false;
  facturaConsultaActual: string = '';
  enviandoFacturaConsultaDgii: boolean = false;
  clientePermiteCredito: boolean = false;
  esClienteCreditoSeleccionado: boolean = false;
  diasCreditoCliente: number = 0;
  limiteCreditoCliente: number = 0;
  saldoCreditoPendienteCliente: number = 0;

  habilitarCampos: boolean = false;

  sucursales = [];
  sucursalSeleccionada: any = null;
  habilitarIcono: boolean = true;
  rncValue: string = '';
  cancelarBusquedaDescripcion: boolean = false;
  cancelarBusquedaCodigo: boolean = false;
  private clienteSearchSubscription?: Subscription;
  private busquedaFacturaModalSubscription?: Subscription;
  private busquedaFacturaModal$ = new Subject<{
    codigo: string;
    nombre: string;
    fecha: string;
    mostrarAvisoNoEncontrado: boolean;
  }>();
  private facturaOriginalEdicion: Record<string, any> | null = null;
  private detalleOriginalEdicion = '';
  selectedRow: number = -1; // Para rastrear la fila seleccionada

  form: FormGroup;
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
    private servicioSalidaFactura: ServicioSalidafactura,
    private servicioItbis: ServicioItbis,
    private facturaDgiiService: FacturaDgiiService,
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
  listaFpago: ModeloFpagoData[] = []; // Lista completa de pagos para filtrar
  buscarSector = new FormControl();
  buscarFpago = new FormControl();

  // Entrega
  buscarEnvio = new FormControl();
  mostrarDropdownFpago = false;
  cargandoFpago = false;
  mostrarDropdownEnvio = false;
  private blurTimeoutFpago: any = null;
  private blurTimeoutEnvio: any = null;
  private modalDetalleProtegido = false;
  listaEnvio = [
    { codigo: '1', descripcion: 'Envío' },
    { codigo: '2', descripcion: 'Retiro Cliente' },
  ];
  resultadoEnvio: any[] = [];
  selectedIndexEnvio = 0;

  selectedIndex = 1;
  selectedIndexsector = 1;
  buscarcodmerc = new FormControl();
  buscardescripcionmerc = new FormControl();
  // buscarcodmercElement = new FormControl();
  nativeElement = new FormControl();
  resultadoCodmerc: ModeloInventarioData[] = [];
  selectedIndexcodmerc = 1;
  private ocultarResultadosCodmerc = false;
  selectedIndexfpago = 1;
  resultadodescripcionmerc: ModeloInventarioData[] = [];
  selectedIndexdescripcionmerc = 1;
  seleccionarFacturacion(facturacion: any) {
    this.selectedFacturacion = facturacion;
  }

  ngOnInit(): void {
    setTimeout(() => this.protegerModalDetalleDuranteAvisos(), 0);
    this.conectarBusquedaFacturaModal();
    this.buscarcodmerc.valueChanges
      .pipe(
        tap((v) => {
          console.log('DEBUG: Input Code Change:', v);
          this.ocultarResultadosCodmerc = false;
          this.resultadoCodmerc = [];
        }),
        debounceTime(300),
        distinctUntilChanged(),
        filter((query: any) => (query || '').toString().trim() !== ''),
        tap((q) => console.log('DEBUG: Searching Code:', q)),
        switchMap((query: string) =>
          this.ServicioInventario
            .buscarporCodigoMerc(query)
            .pipe(
              catchError((error) => {
                console.error('Error en búsqueda de código:', error);
                return of({ data: [] } as any); // Retorna estructura vacía válida
              }),
            ),
        ),
      )
      .subscribe((results: ModeloInventario) => {
        console.log(results.data);
        if (this.ocultarResultadosCodmerc) {
          this.resultadoCodmerc = [];
          return;
        }
        if (results) {
          if (Array.isArray(results.data) && results.data.length) {
            // Aquí ordenamos los resultados por el campo 'nombre' (puedes cambiar el campo según tus necesidades)
            this.resultadoCodmerc = results.data.sort((a: any, b: any) => {
              const valA = a.in_codmerc || '';
              const valB = b.in_codmerc || '';
              return valA.localeCompare(valB, undefined, {
                numeric: true,
                sensitivity: 'base',
              });
            });
            // Seleccionar automáticamente el primer resultado del buscador de código
            this.selectedIndexcodmerc = 0;

            this.codnotfound = false;
          } else {
            this.codnotfound = true;
            return;
          }
        } else {
          this.resultadoCodmerc = [];
          this.codnotfound = false;

          return;
        }
      });
    $('#input1').focus();
    $('#input1').select();
    this.obtenerNcf();
    this.obtenerfpago();

    // Subscripciones para buscadores locales
    this.buscarFpago.valueChanges.subscribe((value) => {
      if (!value) {
        this.resultadoFpago = this.listaFpago;
      } else {
        const filterValue = String(value).toLowerCase();
        this.resultadoFpago = this.listaFpago.filter((option) =>
          String(option.fp_descfpago || '').toLowerCase().includes(filterValue),
        );
      }
      this.selectedIndexfpago = 0;
    });

    this.buscarEnvio.valueChanges.subscribe((value) => {
      if (!value) {
        this.resultadoEnvio = this.listaEnvio;
      } else {
        const filterValue = String(value).toLowerCase();
        this.resultadoEnvio = this.listaEnvio.filter((option) =>
          String(option.descripcion || '').toLowerCase().includes(filterValue),
        );
      }
      this.selectedIndexEnvio = 0;
    });
    this.buscardescripcionmerc.valueChanges
      .pipe(
        tap((v) => {
          console.log('DEBUG: Input Desc Change:', v);
          this.resultadodescripcionmerc = [];
        }),
        map((query: any) => String(query || '').trim()),
        debounceTime(120),
        distinctUntilChanged(),
        filter((query: string) => query !== ''),
        tap((q) => console.log('DEBUG: Searching Desc:', q)),
        switchMap((query: string) =>
          this.ServicioInventario
            .buscarPorDescripcionMerc(query)
            .pipe(
              catchError((error) => {
                console.error('Error en búsqueda de descripción:', error);
                return of({ data: [] } as any);
              }),
            ),
        ),
      )
      .subscribe((results: ModeloInventario) => {
        console.log(results.data);
        if (results) {
          if (Array.isArray(results.data) && results.data.length) {
            this.resultadodescripcionmerc = results.data;
            this.desnotfound = false;
          } else {
            this.desnotfound = true;
          }
        } else {
          this.resultadodescripcionmerc = [];
          this.desnotfound = false;
        }
      });

    // Suscripción al campo fa_nomClie del formulario principal
    this.formularioFacturacion
      .get('fa_nomClie')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap(() => {
          this.resultadoNombre = [];
        }),
        filter((query: string) => String(query || '').trim() !== ''),
        switchMap((query: string) =>
          this.servicioCliente.buscarporNombre(query, true).pipe(
            catchError((error) => {
              console.error(
                'Error en búsqueda de cliente (Supabase):',
                error,
              );
              return of({ data: [] } as any);
            }),
          ),
        ),
      )
      .subscribe((results: ModeloCliente) => {
        if (results && Array.isArray(results.data)) {
          this.resultadoNombre = results.data;
        } else {
          this.resultadoNombre = [];
        }
      });

    this.buscarSector.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap(() => {
          this.resultadoSector = [];
        }),
        filter((query: string) => query !== ''),
        switchMap((query: string) =>
          this.http.GetRequest<ModeloSector>(`/sector-nombre/${query}`).pipe(
            catchError((error) => {
              console.error('Error en búsqueda de sector:', error);
              return of({ data: [] } as any);
            }),
          ),
        ),
      )
      .subscribe((results: ModeloSector) => {
        console.log(results.data);
        if (results) {
          if (Array.isArray(results.data)) {
            this.resultadoSector = results.data;
          }
        } else {
          this.resultadoSector = [];
        }
      });

    // Inicializar los totales visibles en la vista (0.00) al cargar
    this.actualizarTotales();

    // Sincronizar controles con propiedades (Reemplazo de [(ngModel)])
    this.buscarcodmerc.valueChanges.subscribe(
      (val) => (this.codmerc = val || ''),
    );
    this.buscardescripcionmerc.valueChanges.subscribe(
      (val) => (this.descripcionmerc = val || ''),
    );
    this.cantidadform.valueChanges.subscribe(
      (val) => (this.cantidadmerc = Number(val) || 0),
    );
    this.precioform.valueChanges.subscribe(
      (val) => (this.preciomerc = Number(val) || 0),
    );

    // Asegurar que los campos de búsqueda estén habilitados
    this.buscarcodmerc.enable();
    this.buscardescripcionmerc.enable();

    // Gestionar estado de campos dependientes
    this.manageFieldsState();
    this.sincronizarTipoNcfPorRnc();
  }

  manageFieldsState() {
    const rncControl = this.formularioFacturacion.get('fa_rncFact');
    const nombreControl = this.formularioFacturacion.get('fa_nomClie');

    const fieldsToManage = [
      'fa_dirClie',
      'fa_telClie',
      'fa_sector',
      'fa_correo',
      'fa_contacto',
      'fa_fpago',
      'fa_envio',
      'fa_codVend',
    ];

    const updateState = () => {
      const rnc = rncControl?.value;
      const nombre = nombreControl?.value;

      // Verificar si hay algún valor válido en RNC o Nombre
      const hasRnc =
        rnc !== null && rnc !== undefined && rnc.toString().trim() !== '';
      const hasNombre =
        nombre !== null &&
        nombre !== undefined &&
        nombre.toString().trim() !== '';

      const shouldEnable = hasRnc || hasNombre;

      fieldsToManage.forEach((fieldName) => {
        const control = this.formularioFacturacion.get(fieldName);
        if (control) {
          if (shouldEnable) {
            // Solo habilitar si estaba deshabilitado para evitar loops o eventos innecesarios
            if (control.disabled) {
              control.enable({ emitEvent: false });
            }
          } else {
            if (control.enabled) {
              control.disable({ emitEvent: false });
            }
          }
        }
      });
    };

    // Suscribirse a cambios
    rncControl?.valueChanges.subscribe(() => updateState());
    nombreControl?.valueChanges.subscribe(() => updateState());

    // Estado inicial
    updateState();
  }
  obtenerfpago(forceRefresh = false) {
    if (this.cargandoFpago) return;
    this.cargandoFpago = true;
    this.servicioFpago.obtenerTodosFpago(forceRefresh).pipe(
      timeout(15000),
      retry({ count: 1, delay: 500 }),
      catchError((error) => {
        console.error('Error cargando formas de pago:', error);
        return of({ data: this.listaFpago || [] } as any);
      }),
      finalize(() => this.cargandoFpago = false),
    ).subscribe((response) => {
      this.listaFpago = Array.isArray(response?.data) ? response.data : [];
      this.resultadoFpago = this.mostrarDropdownFpago ? [...this.listaFpago] : [];
      const currentId = this.formularioFacturacion.get('fa_codfpago')?.value;
      if (currentId) {
        const found = this.listaFpago.find(
          (f) => String(f.fp_codfpago) === String(currentId),
        );
        if (found) {
          this.buscarFpago.setValue(found.fp_descfpago, { emitEvent: false });
        }
      }
      this.sincronizarControlesPagoEntrega(this.formularioFacturacion.getRawValue());
    });
  }
  obtenerNcf() {
    this.servicioNcf.buscarTodosNcf().subscribe((response) => {
      this.ncflist = (response.data || []).filter((ncf: ModeloNcfData) =>
        Number(ncf.grupo) === 1
      );
      this.actualizarTipoNcfPorRnc(this.formularioFacturacion.get('fa_rncFact')?.value);
      this.actualizarItbisPorComprobante();
    });
  }

  private async actualizarItbisPorComprobante(): Promise<void> {
    const tipoNcf = this.formularioFacturacion?.get('fa_tipoNcf')?.value;
    const itbis = await this.obtenerItbisParaComprobante(tipoNcf, false);
    if (!itbis) return;
    this.itbisActual = itbis;
    this.formularioFacturacion.patchValue({ fa_tipoitbis: itbis.codigo }, { emitEvent: false });
    this.actualizarTotales();
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
      fa_nomClie: [''],
      fa_rncFact: [null],
      fa_telClie: [''],
      fa_dirClie: [''],
      fa_correo: [''],
      fa_codVend: ['', Validators.required],
      fa_nomVend: [''],
      fa_status: ['C'],
      fa_sector: [''],
      fa_codZona: [null],
      fa_desZona: [''],
      fa_fpago: [''],
      fa_codfpago: [''],
      fa_tipopago: [1],
      fa_expFact: [''],
      fa_envio: [''],
      fa_ncfFact: [{ value: '', disabled: true }],
      fa_tipoNcf: [{ value: '32', disabled: true }],
      fa_tipoitbis: [''],
      fa_contacto: [''],
    });

    this.formularioFacturacion.get('fa_tipoNcf')?.valueChanges.subscribe(() => {
      this.actualizarItbisPorComprobante();
    });
    this.conectarBusquedaCliente();
  }

  private normalizarFacturaParaFormulario(factura: any): any {
    if (!factura) return factura;
    return {
      ...factura,
      fa_codVend: String(factura?.fa_codVend ?? factura?.fa_codvend ?? '').trim(),
      fa_codfpago: String(factura?.fa_codfpago ?? '').trim(),
      fa_tipopago: Number(factura?.fa_tipopago ?? 1),
      fa_envio: String(factura?.fa_envio ?? '').trim(),
    };
  }

  private sincronizarControlesPagoEntrega(factura: any): void {
    const codPago = String(
      factura?.fa_codfpago ?? this.formularioFacturacion?.get('fa_codfpago')?.value ?? '',
    ).trim();
    const formaPago = this.listaFpago.find(
      (item) => String(item.fp_codfpago ?? '').trim() === codPago,
    );
    this.buscarFpago.setValue(
      formaPago?.fp_descfpago || codPago || '',
      { emitEvent: false },
    );

    const codEnvio = String(
      factura?.fa_envio ?? this.formularioFacturacion?.get('fa_envio')?.value ?? '',
    ).trim();
    const entrega = this.listaEnvio.find(
      (item) => String(item.codigo ?? '').trim() === codEnvio,
    );
    this.buscarEnvio.setValue(
      entrega?.descripcion || codEnvio || '',
      { emitEvent: false },
    );
  }

  private setControlesPagoEntregaActivos(activos: boolean): void {
    const accion = activos ? 'enable' : 'disable';
    this.buscarFpago[accion]({ emitEvent: false });
    this.buscarEnvio[accion]({ emitEvent: false });
    if (!activos) {
      this.mostrarDropdownFpago = false;
      this.mostrarDropdownEnvio = false;
      this.resultadoFpago = [];
      this.resultadoEnvio = [];
    }
  }

  private limpiarControlesPagoEntrega(): void {
    this.formularioFacturacion.patchValue(
      {
        fa_fpago: '',
        fa_codfpago: '',
        fa_tipopago: 1,
        fa_envio: '',
      },
      { emitEvent: false },
    );
    this.buscarFpago.setValue('', { emitEvent: false });
    this.buscarEnvio.setValue('', { emitEvent: false });
    this.resultadoFpago = [];
    this.resultadoEnvio = [];
    this.mostrarDropdownFpago = false;
    this.mostrarDropdownEnvio = false;
    this.selectedIndexfpago = 0;
    this.selectedIndexEnvio = 0;
    this.clientePermiteCredito = false;
    this.esClienteCreditoSeleccionado = false;
    this.diasCreditoCliente = 0;
    this.limiteCreditoCliente = 0;
    this.saldoCreditoPendienteCliente = 0;
  }

  private conectarBusquedaCliente(): void {
    this.clienteSearchSubscription?.unsubscribe();
    this.clienteSearchSubscription = this.formularioFacturacion
      .get('fa_nomClie')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap(() => {
          this.resultadoNombre = [];
        }),
        filter((query: string) => String(query || '').trim() !== ''),
        switchMap((query: string) =>
          this.servicioCliente.buscarporNombre(query, true).pipe(
            catchError((error) => {
              console.error('Error en busqueda de cliente (Supabase):', error);
              return of({ data: [] } as any);
            }),
          ),
        ),
      )
      .subscribe((results: ModeloCliente) => {
        this.resultadoNombre = results && Array.isArray(results.data)
          ? results.data
          : [];
      });
  }

  limpia(): void {
    //this.formularioFacturacion.reset();
    this.crearFormularioFacturacion();
    this.setControlesPagoEntregaActivos(true);
    this.limpiarControlesPagoEntrega();
    this.txtdescripcion = '';
    this.txtFactura = '';
    this.txtFecha = '';
    //   this.buscarTodasFacturaciomtimbresobre tim0
    this.productoselect;
    this.codmerc = '';
    this.descripcionmerc = '';
    this.preciomerc = 0;
    this.cantidadmerc = 0;

    // Sincronizar controles
    this.buscarcodmerc.setValue('', { emitEvent: false });
    this.buscardescripcionmerc.setValue('', { emitEvent: false });
    this.precioform.setValue(0, { emitEvent: false });
    this.cantidadform.setValue(0, { emitEvent: false });

    this.isEditing = false;
    this.items = []; // Limpiar el array de items
    this.totalGral = 0; // Reiniciar el total general
    this.totalItbis = 0; // Reiniciar el total del ITBIS
    this.subTotal = 0; // Reiniciar el subtotal
    this.totalcosto = 0;
    this.costoGral = 0;
    this.factxt = 0;
    this.modoconsultaFacturacion = false;
    this.modoedicionFacturacion = false;
    this.facturaConsultaSeleccionada = null;
    this.resumenConsultaFactura = null;
    this.detallePendienteConsulta = [];
    this.cargandoDetallePendienteConsulta = false;
    this.facturaConsultaActual = '';
    this.facturaOriginalEdicion = null;
    this.detalleOriginalEdicion = '';
    this.habilitarIcono = true;
    this.actualizarTotales();
    $('#input1').focus();
    $('#input1').select();
  }

  editardetFacturacion(detFactura: detFacturaData) {
    this.facturacionid = detFactura.df_codFact;
  }
  async editarFacturacion(Factura: FacturacionModelData) {
    this.facturacionid = Factura.fa_codFact;
    this.modoedicionFacturacion = true;
    this.modoconsultaFacturacion = false;
    Factura = this.normalizarFacturaParaFormulario(Factura) as FacturacionModelData;
    this.facturaConsultaSeleccionada = Factura;
    this.formularioFacturacion.enable();
    this.setControlesPagoEntregaActivos(true);
    this.formularioFacturacion.patchValue(Factura);
    this.sincronizarControlesPagoEntrega(Factura);
    await this.cargarItbisDeFactura(Factura);
    this.facturaOriginalEdicion = {
      ...this.formularioFacturacion.getRawValue(),
    };
    this.detalleOriginalEdicion = '';
    this.tituloModalFacturacion = 'Editando Facturacion';
    $('#modalfacturacion').modal('show');
    this.habilitarFormulario = true;
    this.habilitarIcono = true;
    // Limpiar los items antes de agregar los nuevos
    this.items = [];
    this.totalItbis = 0;
    this.servicioFacturacion
      .buscarFacturaDetalle(Factura.fa_codFact)
      .subscribe((response) => {
        let subtotal = 0;
        let itbis = 0;
        let totalGeneral = 0;
        const itbisRate = this.tasaItbisRestar();
        response.data.forEach((item: any) => {
          const tipoMercancia = String(
            item.df_tipoMerc ?? item.df_tipomerc ?? '',
          ).trim();
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
            in_tramo: tipoMercancia,
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
            costo: item.df_cosMerc,
            df_tipoMerc: tipoMercancia,
            df_tipomerc: tipoMercancia,
            df_codFact: item.df_codFact,
            __detalleExistente: true,
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
        this.actualizarTotales();
        this.detalleOriginalEdicion = this.serializarDetalleEdicion(this.items);
      });
  }

  buscarTodasFactura(page: number) {
    this.servicioFacturacion.buscarFacturacion(
      page || 1,
      this.limiteFacturasInicial,
      undefined,
      undefined,
      this.fechaHoyIso(),
      true,
      true,
    ).subscribe((response) => {
      console.log('buscarTodasFactura response:', response);
      if (response && Array.isArray(response.data)) {
        this.facturacionList = response.data;
      } else {
        console.warn('response.data is not an array:', response?.data);
        this.facturacionList = [];
      }
      console.log(this.facturacionList.length);
    });
  }

  async consultarFacturacion(factura: FacturacionModelData) {
    const codigoFactura = String(factura?.fa_codFact || '').trim();
    let encfConsulta = '';
    try {
      const response = codigoFactura
        ? await firstValueFrom(this.servicioFacturacion.getByNumero(codigoFactura))
        : null;
      const facturaCompleta = Array.isArray(response?.data)
        ? response.data[0] || {}
        : response?.data || response || {};
      encfConsulta = String(
        facturaCompleta?.fa_ncfFact ??
        facturaCompleta?.fa_ncffact ??
        (factura as any)?.fa_ncfFact ??
        (factura as any)?.fa_ncffact ??
        ''
      ).trim();

      factura = {
        ...factura,
        ...facturaCompleta,
        fa_ncfFact: encfConsulta,
      } as FacturacionModelData;
    } catch (error) {
      console.warn('No se pudo consultar factura.fa_ncffact:', error);
      encfConsulta = String((factura as any)?.fa_ncffact ?? '').trim();
      factura = {
        ...factura,
        fa_ncfFact: encfConsulta,
      } as FacturacionModelData;
    }
    factura = this.normalizarFacturaParaFormulario(factura) as FacturacionModelData;

    this.modoconsultaFacturacion = true;
    this.modoedicionFacturacion = false;
    this.facturaConsultaSeleccionada = factura;
    this.facturaConsultaActual = String(factura.fa_codFact || '').trim();
    this.detallePendienteConsulta = [];
    this.cargandoDetallePendienteConsulta = false;
    this.resumenConsultaFactura = this.crearResumenConsultaFactura(factura);
    this.cargarSalidaResumenConsulta(this.facturaConsultaActual);
    this.formularioFacturacion.reset();
    this.crearFormularioFacturacion();
    this.formularioFacturacion.patchValue(factura);
    this.sincronizarControlesPagoEntrega(factura);
    await this.cargarItbisDeFactura(factura);
    // Asegurar formato de fecha dd/MM/yyyy al consultar
    const fechaFormateada = this.formatFecha((factura as any).fa_fecFact);
    this.formularioFacturacion.patchValue({
      fa_fecFact: fechaFormateada,
      fa_ncfFact: encfConsulta,
    });
    this.sincronizarControlesPagoEntrega(this.formularioFacturacion.getRawValue());
    this.tituloModalFacturacion = 'Consulta Factura';
    // $('#modalfacturacion').modal('show');
    this.habilitarFormulario = true;
    this.formularioFacturacion.disable();
    this.setControlesPagoEntregaActivos(false);
    this.formularioFacturacion.get('fa_ncfFact')?.setValue(encfConsulta, {
      emitEvent: false,
    });
    console.log('ff', factura);
    this.habilitarIcono = false;
    const inputs = document.querySelectorAll('.seccion-productos input');
    inputs.forEach((input) => {
      (input as HTMLInputElement).disabled = true;
    });
    // Limpiar los items antes de agregar los nuevos
    this.items = [];
    this.servicioFacturacion
      .buscarFacturaDetalle(factura.fa_codFact)
      .subscribe((response) => {
        let subtotal = 0;
        let itbis = 0;
        let totalGeneral = 0;
        let totalcosto = 0;
        const itbisRate = this.tasaItbisRestar();
        console.log('faa', response.data);
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
        this.factxt =
          ((factura.fa_valFact - factura.fa_cosFact) * 100) /
          factura.fa_cosFact;
        this.actualizarTotales();
      });
  }

  get puedeEditarFacturaConsultada(): boolean {
    const factura = this.facturaConsultaSeleccionada;
    return Boolean(
      this.modoconsultaFacturacion &&
      factura &&
      this.normalizarBandera((factura as any).fa_impresa) === 'N' &&
      this.normalizarBandera((factura as any).fa_fpago) === 'N'
    );
  }

  activarEdicionFacturaConsultada(): void {
    if (!this.puedeEditarFacturaConsultada || !this.facturaConsultaSeleccionada) {
      return;
    }
    void this.editarFacturacion(this.facturaConsultaSeleccionada);
  }

  private crearResumenConsultaFactura(
    factura: FacturacionModelData,
  ): ResumenConsultaFactura {
    const salidaRegistrada =
      this.normalizarBandera(factura.fa_salida) === 'S' ||
      Boolean(String(factura.idsalida ?? '').trim());

    return {
      pagada: this.banderaConsulta(factura.fa_fpago, ['P']),
      documento: this.etiquetaDocumentoConsulta(factura.fa_status),
      estadoDgii: this.etiquetaEstadoDgii(
        (factura as any).estado_dgii || (factura as any).estado_envio_dgii,
      ),
      claseEstadoDgii: this.claseEstadoDgii(
        (factura as any).estado_dgii || (factura as any).estado_envio_dgii,
      ),
      pendiente: this.banderaConsulta(factura.fa_pendiente, ['P', 'S']),
      entregada: this.banderaConsulta(factura.fa_entrega),
      salida: salidaRegistrada,
      codigoSalida: '',
      estadoSalida: salidaRegistrada ? 'Registrada' : 'Sin salida',
      chofer: 'Sin chofer asignado',
      choferAsignado: false,
      despachoForjas: this.banderaConsulta(factura.fa_impalmaf),
      despachoPatio: this.banderaConsulta(factura.fa_impalmap),
    };
  }

  private cargarSalidaResumenConsulta(codFactura: string): void {
    if (!codFactura) return;

    this.servicioSalidaFactura.obtenerSalidaPorFactura(codFactura).subscribe({
      next: (response) => {
        if (
          !this.resumenConsultaFactura ||
          this.facturaConsultaActual !== codFactura
        ) {
          return;
        }

        const salida = response?.data?.salida;
        const detalle = response?.data?.detalle;
        const nombreChofer = String(
          salida?.nomChofer || detalle?.nomChofer || '',
        ).trim();
        const codigoSalida = String(
          salida?.codSalida || detalle?.codSalida || response?.data?.idsalida || '',
        ).trim();
        const estadoSalida = String(
          salida?.status || detalle?.status || '',
        ).trim();
        const tieneSalida = Boolean(salida || detalle || codigoSalida);

        this.resumenConsultaFactura = {
          ...this.resumenConsultaFactura,
          salida: tieneSalida,
          codigoSalida,
          estadoSalida: tieneSalida
            ? this.etiquetaEstadoSalidaConsulta(estadoSalida)
            : 'Sin salida',
          chofer: nombreChofer || 'Sin chofer asignado',
          choferAsignado: Boolean(nombreChofer),
        };
      },
      error: () => {
        if (
          this.resumenConsultaFactura &&
          this.facturaConsultaActual === codFactura
        ) {
          this.resumenConsultaFactura = {
            ...this.resumenConsultaFactura,
            estadoSalida:
              !this.resumenConsultaFactura.salida
                ? 'Sin salida'
                : 'Salida registrada',
          };
        }
      },
    });
  }

  verProductosPendientesConsulta(): void {
    const codFactura = String(this.facturaConsultaActual || '').trim();
    if (!codFactura) return;

    this.detallePendienteConsulta = [];
    this.cargandoDetallePendienteConsulta = true;
    $('#modalProductosPendientesFactura').modal('show');

    this.servicioFacturacion
      .buscarFacturaDetallePendiente(codFactura)
      .subscribe({
        next: (response) => {
          const detalle = Array.isArray(response?.data?.rows)
            ? response.data.rows
            : Array.isArray(response?.data)
              ? response.data
              : Array.isArray(response)
                ? response
                : [];

          this.detallePendienteConsulta = detalle.map((item: any) => ({
            codigo: item.df_codMerc ?? item.df_codmerc ?? '',
            descripcion: item.df_desMerc ?? item.df_desmerc ?? '',
            cantidad: Number(item.df_canMerc ?? item.df_canmerc ?? 0),
            unidad: String(item.df_unidad ?? ''),
            cantidadPendiente: Number(item.df_canpend ?? item.df_canPend ?? 0),
          }));
          this.cargandoDetallePendienteConsulta = false;
        },
        error: () => {
          this.cargandoDetallePendienteConsulta = false;
          $('#modalProductosPendientesFactura').modal('hide');
          Swal.fire({
            title: 'Error',
            text: 'No se pudieron consultar los productos pendientes.',
            icon: 'error',
          });
        },
      });
  }

  private etiquetaDocumentoConsulta(valor: any): string {
    const status = this.normalizarBandera(valor);
    if (status === 'C') return 'Conduce';
    if (status === 'F') return 'Factura';
    return status || 'Sin status';
  }

  get puedeGenerarPdfFacturaDgii(): boolean {
    const factura: any = this.facturaConsultaSeleccionada;
    if (!this.modoconsultaFacturacion || !factura) return false;

    const estado = String(
      factura.estado_dgii || factura.estado_envio_dgii || '',
    ).trim().toLowerCase();
    const tieneEvidenciaEnvio = Boolean(
      String(factura.dgii_track_id || '').trim() ||
      String(factura.codseguridad || '').trim() ||
      String(factura.qr_link || '').trim() ||
      String(factura.rfce || '').trim() ||
      String(factura.fec_firma || '').trim(),
    );

    return Boolean(
      tieneEvidenciaEnvio ||
      (estado && !estado.includes('sin enviar') && !estado.includes('no enviad')),
    );
  }

  get puedeEnviarFacturaConsultaDgii(): boolean {
    const factura: any = this.facturaConsultaSeleccionada;
    if (!this.modoconsultaFacturacion || !factura || this.enviandoFacturaConsultaDgii) {
      return false;
    }

    const tipoNcf = String(factura.fa_tipoNcf ?? factura.fa_tiponcf ?? '').trim();
    const estadoFactura = this.normalizarBandera(factura.fa_status);
    const estadoDgii = String(
      factura.estado_dgii || factura.estado_envio_dgii || '',
    ).trim().toLowerCase();
    const yaEnviada = Boolean(
      String(factura.dgii_track_id || '').trim() ||
      String(factura.codseguridad || '').trim() ||
      estadoDgii.includes('acept') ||
      estadoDgii.includes('enviad'),
    );

    return Boolean(
      tipoNcf === '31' &&
      estadoFactura === 'C' &&
      !yaEnviada &&
      this.facturaDgiiService.esAptaParaEnvio(factura)
    );
  }

  async enviarFacturaConsultaDgii(): Promise<void> {
    const factura: any = this.facturaConsultaSeleccionada;
    if (!factura || !this.puedeEnviarFacturaConsultaDgii) return;

    const codigo = String(factura.fa_codFact || factura.fa_codfact || '').trim();
    const confirmacion = await Swal.fire({
      title: 'Enviar factura a DGII',
      text: `Se enviará la factura ${codigo} y luego se imprimirá.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Enviar e imprimir',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;

    this.enviandoFacturaConsultaDgii = true;
    Swal.fire({
      title: 'Enviando factura a DGII',
      text: `Factura ${codigo}`,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const actualizada = await this.facturaDgiiService.procesar(
        factura,
        (mensaje) => {
          if (Swal.isVisible()) Swal.update({ text: mensaje });
        },
        { imprimir: true },
      );
      this.facturaConsultaSeleccionada = actualizada as FacturacionModelData;
      this.resumenConsultaFactura = this.crearResumenConsultaFactura(actualizada);
      await Swal.fire({
        title: 'Factura enviada',
        text: `La factura ${codigo} fue enviada a DGII e impresa.`,
        icon: 'success',
      });
    } catch (error: any) {
      const mensaje = String(
        error?.error?.message || error?.message || 'No se pudo enviar la factura a DGII.',
      );
      await Swal.fire({ title: 'Error', text: mensaje, icon: 'error' });
    } finally {
      this.enviandoFacturaConsultaDgii = false;
    }
  }

  private etiquetaEstadoDgii(valor: any): string {
    return String(valor || '').trim() || 'Sin enviar';
  }

  private claseEstadoDgii(valor: any): string {
    const estado = String(valor || '').trim().toLowerCase();
    if (estado.includes('acept')) return 'text-bg-success';
    if (estado.includes('rechaz') || estado.includes('error')) return 'text-bg-danger';
    if (estado.includes('pend')) return 'text-bg-warning';
    return 'text-bg-secondary';
  }

  private banderaConsulta(valor: any, adicionales: string[] = []): boolean {
    const bandera = this.normalizarBandera(valor);
    return bandera === 'S' || adicionales.includes(bandera);
  }

  private etiquetaEstadoSalidaConsulta(valor: any): string {
    const estado = this.normalizarBandera(valor);
    if (estado === 'P') return 'Pendiente';
    if (estado === 'S') return 'Con salida';
    if (estado === 'C') return 'Conduce';
    return estado || 'Registrada';
  }

  private normalizarBandera(valor: any): string {
    return String(valor ?? '').trim().toUpperCase();
  }

  eliminarFacturacion(facturacionId: string) {
    Swal.fire({
      title: '¿Está seguro de eliminar este Facturacion?',
      text: '¡No podrá revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si, eliminar!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.servicioFacturacion
          .eliminarFacturacion(facturacionId)
          .subscribe((response) => {
            Swal.fire({
              title: 'Excelente!',
              text: 'Empresa eliminado correctamente.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false,
            });
            this.buscarTodasFacturacion();
          });
      }
    });
  }

  formatofecha(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Los meses son 0-indexados, se agrega 1 y se llena con ceros
    const day = date.getDate().toString().padStart(2, '0'); // Se llena con ceros si es necesario
    return `${day}/${month}/${year}`;
  }

  formatFecha(input: string | Date | null | undefined): string {
    if (!input) return '';
    try {
      if (input instanceof Date) {
        return this.formatofecha(input);
      }
      const s = String(input).trim();
      // ISO o similar: yyyy-mm-dd...
      const isoDate = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoDate) {
        return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
      }
      // dd/mm/yyyy ya formateado
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        return s;
      }
      const d = new Date(s);
      if (!isNaN(d.getTime())) return this.formatofecha(d);
    } catch {}
    return String(input);
  }

  toPrismaDate(input: string | Date | null | undefined): string {
    // Devuelve 'YYYY-MM-DD' (compatible con Prisma/ISO date sin tiempo)
    if (!input) return '';
    if (input instanceof Date) {
      const y = input.getFullYear();
      const m = (input.getMonth() + 1).toString().padStart(2, '0');
      const d = input.getDate().toString().padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const s = String(input);
    // dd/MM/yyyy -> YYYY-MM-DD
    const m1 = s.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/);
    if (m1) {
      const d = m1[1].padStart(2, '0');
      const mo = m1[2].padStart(2, '0');
      const y = m1[3];
      return `${y}-${mo}-${d}`;
    }
    // yyyy-MM-dd -> mantener
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // Fallback: parsear y devolver YYYY-MM-DD
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const mo = (d.getMonth() + 1).toString().padStart(2, '0');
      const da = d.getDate().toString().padStart(2, '0');
      return `${y}-${mo}-${da}`;
    }
    return s;
  }

  private calcularFechaExpiracionCredito(
    fechaFactura: string | Date | null | undefined,
    diasCredito = 30,
  ): string {
    const fechaBase = this.toPrismaDate(fechaFactura);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaBase)) return '';

    const [year, month, day] = fechaBase.split('-').map(Number);
    const fecha = new Date(year, month - 1, day);
    fecha.setDate(fecha.getDate() + Math.max(Number(diasCredito || 0), 0));
    return this.toPrismaDate(fecha);
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
      df_tipomerc: [''],
    });
  }

  buscarTodasFacturacion() {
    this.servicioFacturacion.buscarFacturacion(
      1,
      this.limiteFacturasInicial,
      undefined,
      undefined,
      this.fechaHoyIso(),
      true,
      true,
    ).subscribe((response) => {
      console.log('buscarTodasFacturacion hoy response:', response);
      if (response && Array.isArray(response.data)) {
        this.facturacionListBase = response.data;
        this.facturacionList = [...this.facturacionListBase];
      } else {
        console.warn('response.data is not an array:', response?.data);
        this.facturacionListBase = [];
        this.facturacionList = [];
      }
      console.log(this.facturacionList.length);
    });
  }

  onOpenBuscarFacturaModal(): void {
    this.txtFactura = '';
    this.txtdescripcion = '';
    this.txtFecha = '';
    this.facturacionListBase = [];
    this.facturacionList = [];
    this.cargandoFacturasModal = true;
    this.busquedaFacturaModalRealizada = true;
    this.servicioFacturacion.buscarFacturacion(
      1,
      this.limiteFacturasModalInicial,
      undefined,
      undefined,
      undefined,
      true,
      true,
    ).pipe(
      catchError((error) => {
        console.error('Error cargando facturas iniciales del modal:', error);
        return of({ data: [] } as any);
      }),
    ).subscribe((response) => {
      const rows = Array.isArray(response?.data) ? response.data : [];
      this.facturacionListBase = rows;
      this.facturacionList = [...rows];
      this.cargandoFacturasModal = false;
    });
  }

  solicitarBusquedaFactura(): void {
    if (!this.tieneFacturaEnCurso()) {
      this.abrirModalBuscarFactura();
      return;
    }

    Swal.fire({
      title: 'Factura en curso',
      text: 'Ya tiene datos digitados en esta factura. Puede cancelarla para buscar otra factura o ignorar la busqueda.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Cancelar factura y buscar',
      cancelButtonText: 'Ignorar busqueda',
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }

      this.limpia();
      this.abrirModalBuscarFactura();
    });
  }

  buscaNombre(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.txtdescripcion = inputElement.value.toUpperCase();
    this.txtFactura = '';
    this.txtFecha = '';
    this.buscarFacturasModalPorFiltros(false, { nombre: this.txtdescripcion });
  }

  buscaFactura(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.txtFactura = inputElement.value.toUpperCase();
    this.txtdescripcion = '';
    this.txtFecha = '';
    this.buscarFacturasModalPorFiltros(false, { codigo: this.txtFactura });
  }

  buscaNombreEnter(event: Event) {
    event.preventDefault();
    const inputElement = event.target as HTMLInputElement;
    this.txtdescripcion = inputElement.value.toUpperCase();
    this.txtFactura = '';
    this.txtFecha = '';
    this.buscarFacturasModalPorFiltros(true, { nombre: this.txtdescripcion });
  }

  buscaFacturaEnter(event: Event) {
    event.preventDefault();
    const inputElement = event.target as HTMLInputElement;
    this.txtFactura = inputElement.value.toUpperCase();
    this.txtdescripcion = '';
    this.txtFecha = '';
    this.buscarFacturasModalPorFiltros(true, { codigo: this.txtFactura });
  }

  buscaFechaFacturaModal(): void {
    this.txtFactura = '';
    this.txtdescripcion = '';
    this.buscarFacturasModalPorFiltros(false);
  }

  buscaFechaFacturaModalEnter(event: Event): void {
    event.preventDefault();
    this.txtFactura = '';
    this.txtdescripcion = '';
    this.buscarFacturasModalPorFiltros(true);
  }

  private normalizarTextoBusquedaFactura(value: any): string {
    return String(value || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private normalizarFechaBusquedaFactura(value: any): string {
    if (!value) return '';
    if (value instanceof Date && !isNaN(value.getTime())) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    const texto = String(value).trim();
    const iso = texto.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];

    const ddmmyyyy = texto.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/);
    if (ddmmyyyy) {
      const d = ddmmyyyy[1].padStart(2, '0');
      const m = ddmmyyyy[2].padStart(2, '0');
      const y = ddmmyyyy[3];
      return `${y}-${m}-${d}`;
    }

    return '';
  }

  private fechaHoyIso(): string {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  buscarFacturasModalPorFiltros(
    mostrarAvisoNoEncontrado = false,
    overrides: { codigo?: string; nombre?: string; fecha?: string } = {},
  ): void {
    const codigo = String(overrides.codigo ?? this.txtFactura ?? '').trim();
    const nombre = String(overrides.nombre ?? this.txtdescripcion ?? '').trim();
    if (overrides.fecha !== undefined) this.txtFecha = overrides.fecha;
    const fecha = this.normalizarFechaBusquedaFactura(this.txtFecha);

    if (!codigo && !nombre && !fecha) {
      this.facturacionListBase = [];
      this.facturacionList = [];
      this.cargandoFacturasModal = false;
      this.busquedaFacturaModalRealizada = false;
      if (mostrarAvisoNoEncontrado) {
        Swal.fire(
          'Aviso',
          'Digite un numero, cliente o fecha para buscar la factura.',
          'info',
        );
      }
      return;
    }

    if (!codigo && !fecha && nombre && nombre.length < this.minimoLetrasBusquedaNombreFactura) {
      this.facturacionListBase = [];
      this.facturacionList = [];
      this.cargandoFacturasModal = false;
      this.busquedaFacturaModalRealizada = true;
      return;
    }

    this.cargandoFacturasModal = true;
    this.busquedaFacturaModalRealizada = true;
    this.facturacionListBase = [];
    this.facturacionList = [];
    this.busquedaFacturaModal$.next({
      codigo,
      nombre,
      fecha,
      mostrarAvisoNoEncontrado,
    });
  }

  private conectarBusquedaFacturaModal(): void {
    this.busquedaFacturaModalSubscription?.unsubscribe();
    this.busquedaFacturaModalSubscription = this.busquedaFacturaModal$
      .pipe(
        debounceTime(250),
        distinctUntilChanged((prev, curr) =>
          prev.codigo === curr.codigo &&
          prev.nombre === curr.nombre &&
          prev.fecha === curr.fecha &&
          prev.mostrarAvisoNoEncontrado === curr.mostrarAvisoNoEncontrado,
        ),
        switchMap((filtros) => {
          const nombreMuyCorto =
            !filtros.codigo &&
            !filtros.fecha &&
            !!filtros.nombre &&
            filtros.nombre.length < this.minimoLetrasBusquedaNombreFactura;
          if (nombreMuyCorto) {
            return of({
              response: { data: [] },
              filtros,
              error: null,
            });
          }
          return this.servicioFacturacion.buscarFacturacion(
            1,
            this.limiteFacturasBusqueda,
            filtros.codigo || undefined,
            filtros.nombre || undefined,
            filtros.fecha || undefined,
            true,
            true,
          ).pipe(
            map((response: any) => ({ response, filtros, error: null })),
            catchError((error) => {
              console.error('Error buscando facturas:', error);
              return of({ response: { data: [] }, filtros, error });
            }),
          );
        }),
      )
      .subscribe(({ response, filtros, error }) => {
        const rows = response?.data || [];
        this.facturacionListBase = rows;
        this.facturacionList = [...this.facturacionListBase];
        this.cargandoFacturasModal = false;

        if (filtros.mostrarAvisoNoEncontrado && (error || this.facturacionList.length === 0)) {
          Swal.fire(
            'Aviso',
            'No se encontro ninguna factura con los datos indicados.',
            'warning',
          );
        }
      });
  }

  ngOnDestroy(): void {
    this.clienteSearchSubscription?.unsubscribe();
    this.busquedaFacturaModalSubscription?.unsubscribe();
    try {
      $('#modalDetalleFactura').off('.facturacionDetalle');
    } catch {
      // El modal puede no estar montado durante la destrucción del componente.
    }
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

  moveFocus(event: Event, nextElement: HTMLInputElement | HTMLSelectElement) {
    const key = (event as KeyboardEvent).key;
    if (key !== 'Enter') {
      return;
    }
    if (nextElement) {
      (event as KeyboardEvent).preventDefault();
      nextElement.focus();
    }
  }

  moveFocuscodmerc(
    event: Event,
    descripcionInput: HTMLInputElement,
    cantidadInput: HTMLInputElement,
  ) {
    // Enter: buscar por cadena (prefijo). Si coincide o hay selección en grid -> ir a cantidad.
    // Si vacío -> ir a descripción. Si no hay coincidencias -> error y pasar a descripción.
    event.preventDefault();
    this.ocultarResultadosCodmerc = true;
    const currentInputValue = (event.target as HTMLInputElement).value.trim();

    if (currentInputValue === '') {
      this.codmerVacio = true;
      descripcionInput?.focus();
      descripcionInput?.select?.();
      return;
    }

    const queryLower = currentInputValue.toLowerCase();
    const maxIndex = this.resultadoCodmerc.length - 1;

    // Priorizar selección manual del grid
    if (
      this.selectedIndexcodmerc >= 0 &&
      this.selectedIndexcodmerc <= maxIndex
    ) {
      const seleccionadoGrid = this.resultadoCodmerc[this.selectedIndexcodmerc];
      if (seleccionadoGrid) {
        this.cargarDatosInventario(seleccionadoGrid);
        cantidadInput?.focus();
        cantidadInput?.select?.();
        this.codmerVacio = false;
        return;
      }
    }

    // Buscar por prefijo en resultados ya cargados
    const candidatosLocales = this.resultadoCodmerc.filter((r) =>
      String(r.in_codmerc).toLowerCase().startsWith(queryLower),
    );
    if (candidatosLocales.length > 0) {
      this.cargarDatosInventario(candidatosLocales[0]);
      cantidadInput?.focus();
      cantidadInput?.select?.();
      this.codmerVacio = false;
      return;
    }

    // Fallback: consultar productos2 con la cadena y aplicar startsWith
    this.ServicioInventario
      .buscarporCodigoMerc(currentInputValue)
      .pipe(
        catchError((error) => {
          console.error('Error en búsqueda manual de código:', error);
          return of({ data: [] } as any);
        }),
      )
      .subscribe((results: ModeloInventario) => {
        if (results && Array.isArray(results.data) && results.data.length) {
          const ordenados = results.data.sort((a: any, b: any) => {
            const valA = a.in_codmerc || '';
            const valB = b.in_codmerc || '';
            return valA.localeCompare(valB, undefined, {
              numeric: true,
              sensitivity: 'base',
            });
          });
          this.selectedIndexcodmerc = 0;
          const candidatos = ordenados.filter((r) =>
            String(r.in_codmerc).toLowerCase().startsWith(queryLower),
          );
          if (candidatos.length > 0) {
            this.cargarDatosInventario(candidatos[0]);
            cantidadInput?.focus();
            cantidadInput?.select?.();
            this.codmerVacio = false;
            return;
          }
        }
        // No existe: mostrar error y avanzar a Descripción
        void this.mostrarAvisoDetalle('Producto no encontrado.', descripcionInput);
        this.codmerc = '';
        this.descripcionmerc = '';
        this.codmerVacio = false;
      });
  }
  handleKeydownInventario(event: KeyboardEvent): void {
    console.log('handle');
    const key = event.key;
    if (key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.salirDetalleProducto();
      return;
    }

    const maxIndex = this.resultadoCodmerc.length - 1;
    if (this.resultadoCodmerc.length === 1) {
      this.selectedIndexcodmerc = 0;
      console.log('prueba');
    }

    if (key === 'ArrowDown') {
      this.selectedIndexcodmerc =
        this.selectedIndexcodmerc < maxIndex
          ? this.selectedIndexcodmerc + 1
          : 0;
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      this.selectedIndexcodmerc =
        this.selectedIndexcodmerc > 0
          ? this.selectedIndexcodmerc - 1
          : maxIndex;
      event.preventDefault();
    } else if (key === 'Enter') {
      if (
        this.selectedIndexcodmerc >= 0 &&
        this.selectedIndexcodmerc <= maxIndex
      ) {
        this.cargarDatosInventario(
          this.resultadoCodmerc[this.selectedIndexcodmerc],
        );
        const qty = document.getElementById(
          'input15',
        ) as HTMLInputElement | null;
        qty?.focus();
        qty?.select?.();
      }
      event.preventDefault();
    }
  }
  cargarDatosInventario(inventario: any) {
    console.log(inventario);
    this.resultadoCodmerc = [];
    this.resultadodescripcionmerc = [];

    // Helper to safely get property case-insensitively
    const getProp = (obj: any, key: string) =>
      obj[key] || obj[key.toUpperCase()] || obj[key.toLowerCase()];

    this.codmerc = getProp(inventario, 'in_codmerc');
    this.tipomerc = getProp(inventario, 'in_tramo');
    this.descripcionmerc = getProp(inventario, 'in_desmerc');
    this.costotxt = getProp(inventario, 'in_cosmerc');
    this.margenVentatxt = getProp(inventario, 'in_porgana');

    const costo = Number(this.costotxt) || 0;
    const margenVenta = Number(this.margenVentatxt) || 0;
    this.preciomerc = costo + (costo * margenVenta) / 100;

    // Sincronizar controles (fix ngModel warning)
    this.buscarcodmerc.setValue(this.codmerc, { emitEvent: false });
    this.buscardescripcionmerc.setValue(this.descripcionmerc, {
      emitEvent: false,
    });
    this.precioform.setValue(this.preciomerc, { emitEvent: false });
    this.cantidadform.setValue(0, { emitEvent: false }); // Reset cantidad logic if appropriate

    this.existenciatxt = 0;
    this.medidatxt = getProp(inventario, 'in_medida');
    this.fecacttxt = getProp(inventario, 'in_fecmodif');

    this.atxt = costo + (costo * 5) / 100;
    this.btxt = costo + (costo * 7) / 100;
    this.ctxt = costo + (costo * 10) / 100;
    this.dtxt = costo + (costo * 12) / 100;
    this.etxt = costo + (costo * 14) / 100;
    this.ftxt = costo + (costo * 16) / 100;
    this.gtxt = costo + this.calcularItbisSumando(costo);
    this.htxt = costo + (costo * 20) / 100;

    // Calcular margen del producto actual
    if (costo > 0) {
      this.protxt = ((this.preciomerc - costo) * 100) / costo;
    } else {
      this.protxt = 0;
    }

    this.productoselect = {
      ...inventario,
      in_tramo: this.tipomerc,
      in_canmerc: 0,
      in_premerc: this.preciomerc,
    };
    this.cargarExistenciaProducto(this.codmerc);
    this.cancelarBusquedaDescripcion = true;
    this.cancelarBusquedaCodigo = true;
    this.formularioFacturacion.patchValue({
      df_codMerc: this.codmerc,
      df_desMerc: this.descripcionmerc,
      df_tipomerc: this.tipomerc,
      df_canMerc: 0,
      df_preMerc: this.preciomerc,
      df_cosMerc: this.costotxt,
      df_unidad: getProp(inventario, 'in_unidad'),
    });
    // Si el usuario seleccionó desde el grid o validó el código, llevar el foco a Cantidad
    const qty = document.getElementById('input15') as HTMLInputElement | null;
    qty?.focus();
    qty?.select?.();
  }

  private cargarExistenciaProducto(codProducto: string): void {
    const codigo = String(codProducto || '').trim();
    const sucursal = Number(localStorage.getItem('idSucursal') || 0);

    if (!codigo || !sucursal) {
      this.existenciatxt = 0;
      return;
    }

    this.ServicioInventario
      .obtenerExistenciaPorProductoSucursal(codigo, sucursal)
      .pipe(
        catchError((error) => {
          console.error('Error consultando existencia del producto:', error);
          return of({ data: null } as any);
        }),
      )
      .subscribe((response: any) => {
        if (String(this.codmerc || '').trim() !== codigo) return;

        const existencia = Number(response?.data?.inv_existencia ?? 0);
        this.existenciatxt = Number.isFinite(existencia) ? existencia : 0;

        if (
          this.productoselect &&
          String(this.productoselect.in_codmerc || '').trim() === codigo
        ) {
          this.productoselect.in_canmerc = this.existenciatxt;
        }
      });
  }

  buscarUsuario(event: Event, nextElement: HTMLInputElement | null): void {
    event.preventDefault();
    void this.validarCodigoVendedor(true, nextElement);
  }

  onCodigoVendedorInput(): void {
    this.codigoVendedorValidado = '';
    this.formularioFacturacion.patchValue({ fa_nomVend: '' }, { emitEvent: false });
  }

  validarVendedorAlSalir(): void {
    const claveUsuario = String(
      this.formularioFacturacion.get('fa_codVend')?.value || '',
    ).trim();
    if (!claveUsuario || claveUsuario === this.codigoVendedorValidado || this.validandoVendedor) return;
    void this.validarCodigoVendedor(false, null);
  }

  private async validarCodigoVendedor(
    abrirDetalle: boolean,
    nextElement: HTMLInputElement | null,
  ): Promise<boolean> {
    const claveUsuario = String(
      this.formularioFacturacion.get('fa_codVend')?.value || '',
    ).trim();
    if (!claveUsuario) {
      this.codigoVendedorValidado = '';
      this.formularioFacturacion.patchValue({ fa_nomVend: '' }, { emitEvent: false });
      await Swal.fire({
        icon: 'error',
        title: 'A V I S O',
        text: 'Codigo de usuario invalido.',
        confirmButtonText: 'OK',
        focusConfirm: true,
      });
      return false;
    }

    this.formularioFacturacion.patchValue(
      { fa_codVend: claveUsuario },
      { emitEvent: false },
    );

    this.validandoVendedor = true;
    try {
      const usuarioResp = await firstValueFrom(
        this.ServicioUsuario.buscarUsuarioPorCodigoVendedor(claveUsuario),
      );
      const u = usuarioResp?.data;
      const nombreVendedor = String(u?.nombreUsuario || u?.idUsuario || '').trim();
      if (!u || !nombreVendedor) throw new Error('VENDEDOR_INVALIDO');

      this.codigoVendedorValidado = claveUsuario;
      this.formularioFacturacion.patchValue({ fa_nomVend: nombreVendedor });
      if (abrirDetalle) {
        this.abrirModalDetalle();
        nextElement?.focus();
      }
      return true;
    } catch {
      this.codigoVendedorValidado = '';
      this.formularioFacturacion.patchValue({ fa_nomVend: '' }, { emitEvent: false });
      await Swal.fire({
        icon: 'error',
        title: 'A V I S O',
        text: 'Codigo de usuario invalido.',
        confirmButtonText: 'OK',
        focusConfirm: true,
      });
      return false;
    } finally {
      this.validandoVendedor = false;
    }
  }
  buscarRnc(event: Event, nextElement: HTMLInputElement | null): void {
    event.preventDefault();
    const rncRaw = this.formularioFacturacion.get('fa_rncFact')?.value;
    const rnc = String(rncRaw || '').replace(/\D/g, '').trim();
    this.clienteRncNoExiste = false;
    this.rncApiNombre = '';
    this.rncApiValor = '';

    if (!rnc) {
      // Si no se ha ingresado un RNC, por defecto Tipo NCF = 32 (Consumidor Final)
      this.seleccionarTipoNcfConsumidorFinal();
      // Pasamos el foco al siguiente elemento (Cliente)
      nextElement?.focus();
      return;
    }

    // Validar longitud del RNC
    if (rnc.length !== 9 && rnc.length !== 11) {
      this.mostrarMensajeError('RNC inválido.');
      return;
    }

    this.formularioFacturacion.patchValue({ fa_rncFact: rnc }, { emitEvent: false });

    // Buscar RNC en el servicio
    this.ServicioRnc.buscarRncPorrncId(rnc).subscribe({
      next: (response) => {
        if (response?.data) {
          // Si se encuentra el RNC en API, asignar razón social
          const nombreEmpresa = String(response.data.rason || '').trim();
          if (!nombreEmpresa) {
            this.mostrarMensajeError('RNC no encontrado.');
            this.isDisabled = true;
            return;
          }

          this.rncApiNombre = nombreEmpresa;
          this.rncApiValor = rnc;
          this.formularioFacturacion.patchValue({
            fa_nomClie: nombreEmpresa,
            fa_codClie: '',
          });

          this.seleccionarTipoNcfRnc();

          // Habilitar campos
          this.isDisabled = false;
          this.validarClienteLocalPorRnc(rnc, nombreEmpresa, nextElement);
        } else {
          this.formularioFacturacion.patchValue({
            fa_nomClie: '',
            fa_codClie: '',
          });
          this.mostrarMensajeError('RNC no encontrado.');
          this.isDisabled = true;
        }
      },
      error: () => {
        this.formularioFacturacion.patchValue({
          fa_nomClie: '',
          fa_codClie: '',
        });
        this.mostrarMensajeError('RNC no encontrado.');
        this.isDisabled = true;
      },
    });
  }

  private validarClienteLocalPorRnc(
    rnc: string,
    nombreEmpresaApi: string,
    nextElement: HTMLInputElement | null,
  ): void {
    this.servicioCliente.buscarPorRnc(rnc, true).subscribe({
      next: (clienteResp) => {
        const cliente = clienteResp?.data as ModeloClienteData | null;
        if (cliente) {
          this.clienteRncNoExiste = false;
          this.cargarDatosCliente(cliente);
          this.formularioFacturacion.patchValue(
            { fa_nomClie: nombreEmpresaApi },
            { emitEvent: false },
          );
        } else {
          this.clienteRncNoExiste = true;
          this.formularioFacturacion.patchValue(
            {
              fa_codClie: '',
              fa_nomClie: nombreEmpresaApi,
            },
            { emitEvent: false },
          );
        }
        $('#input3').focus();
        $('#input3').select();
        nextElement?.focus();
      },
      error: (error) => {
        console.error('Error buscando cliente en Supabase por RNC:', error);
        this.clienteRncNoExiste = true;
        this.formularioFacturacion.patchValue(
          {
            fa_codClie: '',
            fa_nomClie: nombreEmpresaApi,
          },
          { emitEvent: false },
        );
        $('#input3').focus();
        $('#input3').select();
        nextElement?.focus();
      },
    });
  }


  private sincronizarTipoNcfPorRnc() {
    this.formularioFacturacion.get('fa_rncFact')?.valueChanges.subscribe((value) => {
      this.actualizarTipoNcfPorRnc(value);
    });
  }

  private normalizarRnc(value: any): string {
    const rnc = String(value || '').replace(/\D/g, '').trim();
    return rnc && !/^0+$/.test(rnc) ? rnc : '';
  }

  private actualizarTipoNcfPorRnc(value: any) {
    const rnc = this.normalizarRnc(value);
    if (rnc) {
      this.seleccionarTipoNcfRnc();
      return;
    }

    this.seleccionarTipoNcfConsumidorFinal();
  }

  private seleccionarTipoNcfRnc() {
    const tipoE31 = this.ncflist.find((ncf) =>
      String(ncf.tipo || '').trim().toUpperCase() === 'E31'
    );
    this.formularioFacturacion.patchValue(
      { fa_tipoNcf: String(tipoE31?.codigo || '31') },
      { emitEvent: false },
    );
    this.formularioFacturacion.get('fa_tipoNcf')?.enable();
  }

  private seleccionarTipoNcfConsumidorFinal() {
    const tipoE32 = this.ncflist.find((ncf) =>
      String(ncf.tipo || '').trim().toUpperCase() === 'E32'
    );
    this.formularioFacturacion.patchValue(
      { fa_tipoNcf: String(tipoE32?.codigo || '32') },
      { emitEvent: false },
    );
    this.formularioFacturacion.get('fa_tipoNcf')?.disable();
  }

  agregarRncComoCliente(): void {
    const rnc = String(this.rncApiValor || '').replace(/\D/g, '').trim();
    const nombre = String(this.rncApiNombre || '').trim();
    if (!rnc || !nombre) {
      this.mostrarMensajeError(
        'No hay un RNC válido consultado para agregar a clientes.',
      );
      return;
    }

    Swal.fire({
      title: 'Agregar a mis clientes',
      text: `¿Deseas agregar "${nombre}" a tu lista de clientes?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, agregar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const payload: ModeloClienteData = {
        cl_codClie: null as any,
        cl_nomClie: nombre,
        cl_dirClie:
          String(this.formularioFacturacion.get('fa_dirClie')?.value || '').trim() ||
          'SIN DIRECCIÓN',
        cl_codSect: null as any,
        cl_codZona: this.formularioFacturacion.get('fa_codZona')?.value || null,
        cl_telClie:
          String(this.formularioFacturacion.get('fa_telClie')?.value || '').trim() ||
          '',
        cl_tipo: 'RNC',
        cl_status: true,
        cl_rnc: Number(rnc),
        cl_codSucursal: String(localStorage.getItem('idSucursal') || '').trim(),
      };

      this.servicioCliente.guardarCliente(payload).subscribe({
        next: (saved) => {
          const nuevo = saved?.data as ModeloClienteData;
          if (nuevo) {
            this.clienteRncNoExiste = false;
            this.cargarDatosCliente(nuevo);
            this.formularioFacturacion.patchValue(
              { fa_nomClie: nombre },
              { emitEvent: false },
            );
          }
          Swal.fire({
            icon: 'success',
            title: 'Cliente agregado',
            text: 'El cliente fue agregado correctamente.',
            timer: 1400,
            showConfirmButton: false,
          });
        },
        error: (error) => {
          console.error('Error agregando cliente desde RNC:', error);
          Swal.fire({
            icon: 'error',
            title: 'No se pudo agregar',
            text: 'No fue posible guardar este cliente.',
          });
        },
      });
    });
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

  private async mostrarAvisoDetalle(
    mensaje: string,
    campo?: HTMLInputElement | null,
  ): Promise<void> {
    this.mensagePantalla = true;
    const confirmarConEnter = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || !Swal.isVisible()) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      Swal.clickConfirm();
    };
    try {
      await Swal.fire({
        icon: 'error',
        title: 'A V I S O',
        text: mensaje,
        confirmButtonText: 'OK',
        showConfirmButton: true,
        focusConfirm: true,
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: true,
        keydownListenerCapture: true,
        stopKeydownPropagation: true,
        returnFocus: false,
        didOpen: () => {
          // Bootstrap también escucha Enter en el modal. SweetAlert debe tomar
          // el foco y capturar la tecla antes de que llegue al modal de fondo.
          const enfocarOk = () => Swal.getConfirmButton()?.focus();
          enfocarOk();
          setTimeout(enfocarOk, 0);
          document.addEventListener('keydown', confirmarConEnter, true);
        },
        didClose: () => document.removeEventListener('keydown', confirmarConEnter, true),
      });
    } finally {
      document.removeEventListener('keydown', confirmarConEnter, true);
      this.mensagePantalla = false;
      setTimeout(() => {
        campo?.focus();
        campo?.select?.();
      }, 0);
    }
  }

  private extraerMensajeError(error: any): string {
    return String(
      error?.error?.message ||
        error?.message ||
        error?.details ||
        error?.hint ||
        error?.error ||
        'Hubo un error al guardar la factura.',
    );
  }

  handleKeydown(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadoNombre.length - 1; // Ajustamos el límite máximo
    if (this.resultadoNombre.length === 1) {
      this.selectedIndex = 0;
      console.log('prueba');
    }

    if (key === 'ArrowDown') {
      // Mueve la selección hacia abajo
      if (this.selectedIndex < maxIndex) {
        this.selectedIndex++;
      } else {
        this.selectedIndex = 0; // Vuelve al primer ítem
      }
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      console.log('paso 677');

      // Mueve la selección hacia arriba
      if (this.selectedIndex > 0) {
        this.selectedIndex--;
      } else {
        this.selectedIndex = maxIndex; // Vuelve al último ítem
      }
      event.preventDefault();
    } else if (key === 'Enter') {
      // Selecciona el ítem actual
      if (this.selectedIndex >= 0 && this.selectedIndex <= maxIndex) {
        this.cargarDatosCliente(this.resultadoNombre[this.selectedIndex]);
      }
      // Habilitar campos si hay un nombre de cliente
      const nombreCliente = this.formularioFacturacion.get('fa_nomClie')?.value;
      if (nombreCliente && nombreCliente.trim() !== '') {
        this.isDisabled = false;
      }
      event.preventDefault();
    }
  }
  handleKeydownSector(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadoSector.length - 1; // Ajustamos el límite máximo
    if (this.resultadoSector.length === 1) {
      this.selectedIndexsector = 0;
      console.log('prueba');
    }
    if (key === 'ArrowDown') {
      // Mueve la selección hacia abajo
      if (this.selectedIndexsector < maxIndex) {
        this.selectedIndex++;
      } else {
        this.selectedIndexsector = 0; // Vuelve al primer ítem
      }
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      console.log('paso 677');

      // Mueve la selección hacia arriba
      if (this.selectedIndexsector > 0) {
        this.selectedIndex--;
      } else {
        this.selectedIndexsector = maxIndex; // Vuelve al último ítem
      }
      event.preventDefault();
    } else if (key === 'Enter') {
      // Selecciona el ítem actual
      if (
        this.selectedIndexsector >= 0 &&
        this.selectedIndexsector <= maxIndex
      ) {
        this.cargarDatosSector(this.resultadoSector[this.selectedIndexsector]);
      }
      event.preventDefault();
    }
  }
  handleKeydownFpago(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadoFpago.length - 1; // Ajustamos el límite máximo

    if (this.resultadoFpago.length === 1) {
      this.selectedIndexfpago = 0;
    }

    if (key === 'ArrowDown') {
      // Mueve la selección hacia abajo
      if (this.selectedIndexfpago < maxIndex) {
        this.selectedIndexfpago++;
      } else {
        this.selectedIndexfpago = 0; // Vuelve al primer ítem
      }
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      // Mueve la selección hacia arriba
      if (this.selectedIndexfpago > 0) {
        this.selectedIndexfpago--;
      } else {
        this.selectedIndexfpago = maxIndex; // Vuelve al último ítem
      }
      event.preventDefault();
    } else if (key === 'Enter') {
      // Selecciona el ítem actual
      if (
        this.selectedIndexfpago >= 0 &&
        this.selectedIndexfpago <= maxIndex &&
        this.resultadoFpago.length > 0
      ) {
        this.cargarDatosFpago(this.resultadoFpago[this.selectedIndexfpago]);
      } else if (
        this.resultadoFpago.length === 0 &&
        this.formularioFacturacion.get('fa_codfpago')?.value
      ) {
        // Si no hay lista (ya seleccionado) y presiona enter, mover al siguiente
        const nextInput = document.getElementById('input11');
        if (nextInput) nextInput.focus();
      }
      event.preventDefault();
    }
  }
  handleKeydownInventariosdesc(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadodescripcionmerc.length;
    if (this.resultadodescripcionmerc.length === 1) {
      this.selectedIndexdescripcionmerc = 0;
      console.log('prueba');
    }
    if (key === 'ArrowDown') {
      // Mueve la selección hacia abajo
      this.selectedIndexdescripcionmerc =
        this.selectedIndexdescripcionmerc < maxIndex
          ? this.selectedIndexdescripcionmerc + 1
          : 0;
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      // Mueve la selección hacia arriba
      this.selectedIndexdescripcionmerc =
        this.selectedIndexdescripcionmerc > 0
          ? this.selectedIndexdescripcionmerc - 1
          : maxIndex;
      event.preventDefault();
    } else if (key === 'Enter') {
      // Selecciona el ítem actual
      if (
        this.selectedIndexdescripcionmerc >= 0 &&
        this.selectedIndexdescripcionmerc <= maxIndex
      ) {
        this.cargarDatosInventario(
          this.resultadodescripcionmerc[this.selectedIndexdescripcionmerc],
        );
        const qty = document.getElementById(
          'input15',
        ) as HTMLInputElement | null;
        qty?.focus();
        qty?.select?.();
      }
      event.preventDefault();
    }
  }
  moveFocusdesc(event: KeyboardEvent, nextInput: HTMLInputElement) {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      const currentInputValue = (event.target as HTMLInputElement).value.trim();

      if (currentInputValue === '') {
        this.desmerVacio = true;
        void this.mostrarAvisoDetalle(
          'Producto no encontrado.',
          event.target as HTMLInputElement,
        );
        this.desnotfound = true;
        return;
      }

      const queryLower = currentInputValue.toLowerCase();
      const maxIndex = this.resultadodescripcionmerc.length - 1;

      // Priorizar selección manual del grid
      if (
        this.selectedIndexdescripcionmerc >= 0 &&
        this.selectedIndexdescripcionmerc <= maxIndex
      ) {
        const seleccionadoGrid =
          this.resultadodescripcionmerc[this.selectedIndexdescripcionmerc];
        if (seleccionadoGrid) {
          this.cargarDatosInventario(seleccionadoGrid);
          nextInput?.focus();
          nextInput?.select?.();
          this.desnotfound = false;
          this.desmerVacio = false;
          return;
        }
      }

      // Buscar por prefijo en resultados ya cargados (por descripción)
      const candidatosLocales = this.resultadodescripcionmerc.filter((r) =>
        String(r.in_desmerc).toLowerCase().startsWith(queryLower),
      );
      if (candidatosLocales.length > 0) {
        this.cargarDatosInventario(candidatosLocales[0]);
        nextInput?.focus();
        nextInput?.select?.();
        this.desnotfound = false;
        this.desmerVacio = false;
        return;
      }

      // Fallback: consultar productos2 con la cadena y aplicar startsWith
      this.ServicioInventario
        .buscarPorDescripcionMerc(currentInputValue)
        .pipe(
          catchError((error) => {
            console.error('Error en búsqueda manual de descripción:', error);
            return of({ data: [] } as any);
          }),
        )
        .subscribe((results: ModeloInventario) => {
          if (results && Array.isArray(results.data) && results.data.length) {
            const ordenados = results.data.sort((a, b) =>
              a.in_desmerc.localeCompare(b.in_desmerc, undefined, {
                sensitivity: 'base',
              }),
            );
            this.resultadodescripcionmerc = ordenados;
            this.selectedIndexdescripcionmerc = 0;
            const candidatos = ordenados.filter((r) =>
              String(r.in_desmerc).toLowerCase().startsWith(queryLower),
            );
            if (candidatos.length > 0) {
              this.cargarDatosInventario(candidatos[0]);
              nextInput?.focus();
              nextInput?.select?.();
              this.desnotfound = false;
              this.desmerVacio = false;
              return;
            }
          }
          // No existe: mostrar error y mantener foco en descripción
          void this.mostrarAvisoDetalle(
            'Producto no encontrado.',
            event.target as HTMLInputElement,
          );
          this.desnotfound = true;
          this.desmerVacio = false;
        });
    }
  }
  moveFocusCantidad(event: KeyboardEvent, nextInput: HTMLInputElement) {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      if (!this.productoselect || this.cantidadmerc <= 0) {
        void this.mostrarAvisoDetalle(
          'Por favor complete todos los campos requeridos antes de continuar.',
          event.target as HTMLInputElement,
        );
        return;
      }
      // Pasar a Precio (nextInput)
      nextInput?.focus();
      nextInput?.select?.();
    }
  }

  seleccionarCantidadCompleta(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    // El siguiente ciclo evita que el clic del navegador coloque el cursor
    // despues de que el evento focus ya habia seleccionado el contenido.
    setTimeout(() => input.select(), 0);
  }

  moveFocusPrecio(event: Event, nextInput: HTMLInputElement) {
    const key = (event as KeyboardEvent).key;
    // Solo manejar Enter/Tab
    if (key !== 'Enter' && key !== 'Tab') return;
    event.preventDefault();

    // Validaciones básicas antes de continuar
    if (
      !this.productoselect ||
      this.preciomerc <= 0 ||
      this.preciomerc <= this.productoselect.in_cosmerc
    ) {
      void this.mostrarAvisoDetalle(
        'Por favor complete todos los campos requeridos antes de agregar el ítem.',
        event.target as HTMLInputElement,
      );
      return;
    }

    // Si se presiona Enter: agregar el ítem
    if (key === 'Enter') {
      this.agregaItem(event);
    }

    // Enfocar el código del producto usando la referencia recibida
    nextInput?.focus();
    nextInput?.select?.();
  }
  moveFocusnomclie(event: Event, nextInput: HTMLInputElement) {
    event.preventDefault();
    console.log(nextInput);
    if (event.target instanceof HTMLInputElement) {
      if (!event.target.value) {
        this.mensagePantalla = true;
        Swal.fire({
          icon: 'error',
          title: 'A V I S O',
          text: 'Por favor complete el campo Nombre del Cliente Para Poder continual.',
        }).then(() => {
          this.mensagePantalla = false;
        });
      } else {
        nextInput.focus(); // Si es válido, mueve el foco al siguiente input
      }
    }
  }
  async cargarDatosCliente(cliente: ModeloClienteData) {
    this.resultadoNombre = [];
    if (cliente.cl_nomClie !== '') {
      console.log(this.resultadoNombre);
      this.formularioFacturacion.patchValue(
        {
          fa_codClie: cliente.cl_codClie,
          fa_nomClie: cliente.cl_nomClie,
          fa_rncFact: cliente.cl_rnc,
          fa_telClie: cliente.cl_telClie,
          fa_dirClie: cliente.cl_dirClie,
          fa_codZona: cliente.cl_codZona,
          fa_sector: cliente.cl_sector || cliente.cl_codSect,
        },
        { emitEvent: false },
      );
      this.esClienteCreditoSeleccionado = String(cliente.cl_tipo || '').trim().toUpperCase() === 'C';
      this.clientePermiteCredito = this.esClienteCreditoSeleccionado;
      this.diasCreditoCliente = Math.max(Number(cliente.cl_diasCredito || 0), 0);
      this.limiteCreditoCliente = Math.max(Number(cliente.cl_limiteCredito || 0), 0);
      this.saldoCreditoPendienteCliente = 0;
      let tipoVenta = 1;
      if (this.clientePermiteCredito) {
        const creditoDisponible = await this.validarCreditoPendienteCliente(cliente);
        if (!creditoDisponible) {
          this.actualizarTipoVenta(1);
          this.actualizarTipoNcfPorRnc(cliente.cl_rnc);
          return;
        }
        const respuesta = await Swal.fire({
          title: '¿Tipo de venta?',
          text: `El cliente tiene crédito autorizado${this.diasCreditoCliente ? ` por ${this.diasCreditoCliente} días` : ''}.`,
          icon: 'question',
          showDenyButton: true,
          confirmButtonText: 'Crédito',
          denyButtonText: 'Contado',
          allowOutsideClick: false,
          allowEscapeKey: false,
        });
        tipoVenta = respuesta.isConfirmed ? 2 : 1;
      }
      this.actualizarTipoVenta(tipoVenta);
      this.actualizarTipoNcfPorRnc(cliente.cl_rnc);
      console.log(cliente);
      console.log('Formulario actualizado:', this.formularioFacturacion.value);
    }
  }

  async mostrarEstadoCuentaCliente(): Promise<void> {
    const codigoCliente = String(
      this.formularioFacturacion.get('fa_codClie')?.value || '',
    ).trim();
    const nombreCliente = String(
      this.formularioFacturacion.get('fa_nomClie')?.value || 'Cliente',
    ).trim();
    const nombreEmpresa = this.obtenerNombreEmpresaActiva();

    if (!codigoCliente || !this.esClienteCreditoSeleccionado) return;

    Swal.fire({
      title: 'Cargando estado de cuenta...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const respuesta: any = await firstValueFrom(
        this.servicioFacturacion.buscarCreditosPendientesCliente(codigoCliente),
      );
      const facturas = Array.isArray(respuesta?.data) ? respuesta.data : [];
      const hoy = this.fechaSinHora(new Date());
      const totalPendiente = facturas.reduce(
        (total: number, factura: any) =>
          total + Math.max(Number(factura?.fa_valFact ?? factura?.fa_valfact ?? 0), 0),
        0,
      );
      this.saldoCreditoPendienteCliente = totalPendiente;
      const disponible = this.limiteCreditoCliente > 0
        ? Math.max(this.limiteCreditoCliente - totalPendiente, 0)
        : 0;

      const filas = facturas.map((factura: any) => {
        const fecha = this.parseFechaLocal(factura?.fa_fecFact ?? factura?.fa_fecfact);
        const vencimiento = this.parseFechaLocal(factura?.fa_expFact ?? factura?.fa_expfact);
        const dias = fecha ? Math.max(0, this.diferenciaDias(fecha, hoy)) : 0;
        const vencida = vencimiento
          ? hoy.getTime() > vencimiento.getTime()
          : this.diasCreditoCliente > 0 && dias > this.diasCreditoCliente;
        const numero = this.escaparHtml(factura?.fa_codFact ?? factura?.fa_codfact ?? '');
        const fechaTexto = this.formatearFechaEstadoCuenta(fecha);
        const vencimientoTexto = this.formatearFechaEstadoCuenta(vencimiento);
        const valor = Math.max(Number(factura?.fa_valFact ?? factura?.fa_valfact ?? 0), 0);
        return `<tr>
          <td>${numero || '-'}</td>
          <td>${fechaTexto}</td>
          <td>${vencimientoTexto}</td>
          <td class="text-end">${dias}</td>
          <td>${vencida ? '<span class="badge bg-danger">Vencida</span>' : ''}</td>
          <td class="text-end fw-semibold">RD$${this.formatoImporteCredito(valor)}</td>
        </tr>`;
      }).join('');

      const contenido = `
        <div class="text-start mb-3">
          <div class="fw-bold text-primary">${this.escaparHtml(nombreEmpresa)}</div>
          <div class="fw-bold">${this.escaparHtml(nombreCliente)}</div>
          <small class="text-muted">Código: ${this.escaparHtml(codigoCliente)}</small>
        </div>
        <div class="table-responsive" style="max-height: 330px; overflow-y: auto;">
          <table class="table table-sm table-striped table-bordered align-middle mb-0">
            <thead class="table-light sticky-top">
              <tr><th>Factura</th><th>Fecha</th><th>Vence</th><th>Días</th><th>Estado</th><th class="text-end">Pendiente</th></tr>
            </thead>
            <tbody>${filas || '<tr><td colspan="6" class="text-center py-4 text-muted">El cliente no tiene facturas a crédito pendientes.</td></tr>'}</tbody>
          </table>
        </div>
        <div class="row g-2 mt-3 text-start">
          <div class="col-4"><small class="text-muted d-block">Límite</small><strong>RD$${this.formatoImporteCredito(this.limiteCreditoCliente)}</strong></div>
          <div class="col-4"><small class="text-muted d-block">Pendiente</small><strong class="text-danger">RD$${this.formatoImporteCredito(totalPendiente)}</strong></div>
          <div class="col-4"><small class="text-muted d-block">Disponible</small><strong class="text-success">RD$${this.formatoImporteCredito(disponible)}</strong></div>
        </div>`;

      const resultadoModal = await Swal.fire({
        title: 'Estado de cuenta',
        html: contenido,
        width: 900,
        confirmButtonText: 'Cerrar',
        showDenyButton: true,
        denyButtonText: '<i class="bi bi-file-earmark-pdf me-1"></i> Crear PDF',
        denyButtonColor: '#dc3545',
        focusConfirm: true,
      });
      if (resultadoModal.isDenied) {
        this.generarPdfEstadoCuenta(
          nombreEmpresa,
          nombreCliente,
          codigoCliente,
          facturas,
          totalPendiente,
          disponible,
        );
      }
    } catch (error) {
      console.error('No se pudo cargar el estado de cuenta:', error);
      await Swal.fire('Error', 'No se pudo cargar el estado de cuenta del cliente.', 'error');
    }
  }

  private obtenerNombreEmpresaActiva(): string {
    const nombreGuardado = String(localStorage.getItem('nombre_empresa') || '').trim();
    if (nombreGuardado) return nombreGuardado;
    try {
      const empresa = JSON.parse(localStorage.getItem('empresa') || '{}');
      return String(
        empresa?.nom_empre || empresa?.em_nomempre || empresa?.nombre || 'Empresa',
      ).trim();
    } catch {
      return 'Empresa';
    }
  }

  private generarPdfEstadoCuenta(
    nombreEmpresa: string,
    nombreCliente: string,
    codigoCliente: string,
    facturas: any[],
    totalPendiente: number,
    disponible: number,
  ): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
    const hoy = this.fechaSinHora(new Date());
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(nombreEmpresa || 'Empresa', 14, 16);
    doc.setFontSize(13);
    doc.text('Estado de cuenta', 14, 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Cliente: ${nombreCliente}`, 14, 31);
    doc.text(`Código: ${codigoCliente}`, 14, 37);
    doc.text(`Fecha: ${this.formatearFechaEstadoCuenta(hoy)}`, 220, 16);

    const cuerpo = facturas.map((factura: any) => {
      const fecha = this.parseFechaLocal(factura?.fa_fecFact ?? factura?.fa_fecfact);
      const vencimiento = this.parseFechaLocal(factura?.fa_expFact ?? factura?.fa_expfact);
      const dias = fecha ? Math.max(0, this.diferenciaDias(fecha, hoy)) : 0;
      const vencida = vencimiento
        ? hoy.getTime() > vencimiento.getTime()
        : this.diasCreditoCliente > 0 && dias > this.diasCreditoCliente;
      return [
        String(factura?.fa_codFact ?? factura?.fa_codfact ?? ''),
        this.formatearFechaEstadoCuenta(fecha),
        this.formatearFechaEstadoCuenta(vencimiento),
        String(dias),
        vencida ? 'Vencida' : '',
        `RD$${this.formatoImporteCredito(factura?.fa_valFact ?? factura?.fa_valfact ?? 0)}`,
      ];
    });

    autoTable(doc, {
      startY: 43,
      head: [['Factura', 'Fecha', 'Vence', 'Días', 'Estado', 'Pendiente']],
      body: cuerpo.length ? cuerpo : [['', '', '', '', 'Sin facturas pendientes', '']],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [13, 110, 253] },
      columnStyles: { 3: { halign: 'right' }, 5: { halign: 'right' } },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 55;
    doc.setFont('helvetica', 'bold');
    doc.text(`Límite: RD$${this.formatoImporteCredito(this.limiteCreditoCliente)}`, 14, finalY + 10);
    doc.text(`Total pendiente: RD$${this.formatoImporteCredito(totalPendiente)}`, 95, finalY + 10);
    doc.text(`Crédito disponible: RD$${this.formatoImporteCredito(disponible)}`, 185, finalY + 10);

    const nombreArchivo = `estado-cuenta-${codigoCliente || 'cliente'}.pdf`
      .replace(/[^a-zA-Z0-9._-]/g, '-');
    doc.save(nombreArchivo);
  }

  private formatearFechaEstadoCuenta(fecha: Date | null): string {
    if (!fecha) return '-';
    return new Intl.DateTimeFormat('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(fecha);
  }

  private escaparHtml(valor: any): string {
    return String(valor ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private async validarCreditoPendienteCliente(cliente: ModeloClienteData): Promise<boolean> {
    const codigoCliente = String(cliente?.cl_codClie || '').trim();
    if (!codigoCliente) {
      this.clientePermiteCredito = false;
      await Swal.fire('Aviso', 'No se pudo validar el código del cliente para autorizar crédito.', 'warning');
      return false;
    }

    try {
      const respuesta: any = await firstValueFrom(
        this.servicioFacturacion.buscarCreditosPendientesCliente(codigoCliente),
      );
      const facturas = Array.isArray(respuesta?.data) ? respuesta.data : [];
      this.saldoCreditoPendienteCliente = facturas.reduce(
        (total: number, factura: any) => total + Math.max(Number(factura?.fa_valFact ?? factura?.fa_valfact ?? 0), 0),
        0,
      );
      const hoy = this.fechaSinHora(new Date());
      const diasPermitidos = Math.max(Number(cliente?.cl_diasCredito || 0), 0);
      const vencidas = facturas
        .map((factura: any) => {
          const fechaFactura = this.parseFechaLocal(factura?.fa_fecFact ?? factura?.fa_fecfact);
          const fechaExpira = this.parseFechaLocal(factura?.fa_expFact ?? factura?.fa_expfact);
          if (!fechaFactura) return null;

          const diasTranscurridos = Math.max(0, this.diferenciaDias(fechaFactura, hoy));
          const diasEntreFacturaYExpiracion = fechaExpira
            ? Math.max(0, this.diferenciaDias(fechaFactura, fechaExpira))
            : diasTranscurridos;
          const vencioPorFecha = !!fechaExpira && hoy.getTime() > fechaExpira.getTime();
          const excedeDias = diasEntreFacturaYExpiracion > diasPermitidos;
          if (!vencioPorFecha && !excedeDias) return null;

          return {
            numero: String(factura?.fa_codFact ?? factura?.fa_codfact ?? '').trim(),
            dias: diasTranscurridos,
          };
        })
        .filter(Boolean) as Array<{ numero: string; dias: number }>;

      if (
        this.limiteCreditoCliente > 0 &&
        this.saldoCreditoPendienteCliente >= this.limiteCreditoCliente
      ) {
        this.clientePermiteCredito = false;
        await Swal.fire({
          icon: 'warning',
          title: 'Límite de crédito alcanzado',
          text: `El cliente tiene RD$${this.formatoImporteCredito(this.saldoCreditoPendienteCliente)} pendientes y su límite es RD$${this.formatoImporteCredito(this.limiteCreditoCliente)}.`,
          confirmButtonText: 'OK',
          focusConfirm: true,
        });
        return false;
      }

      if (!vencidas.length) return true;

      this.clientePermiteCredito = false;
      const detalle = vencidas
        .slice(0, 5)
        .map((factura) => `${factura.numero || 'S/N'} (${factura.dias} días)`)
        .join(', ');
      await Swal.fire({
        icon: 'warning',
        title: 'Crédito no disponible',
        text: `El cliente tiene factura(s) a crédito pendiente(s) fuera del plazo de ${diasPermitidos} días: ${detalle}.`,
        confirmButtonText: 'OK',
        focusConfirm: true,
      });
      return false;
    } catch (error) {
      console.error('No se pudo validar el crédito pendiente del cliente:', error);
      this.clientePermiteCredito = false;
      await Swal.fire(
        'Crédito no disponible',
        'No se pudieron validar las facturas pendientes del cliente. Solo se permitirá venta al contado.',
        'warning',
      );
      return false;
    }
  }

  private parseFechaLocal(value: any): Date | null {
    const texto = String(value || '').trim().slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
    if (!match) return null;
    const fecha = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(fecha.getTime()) ? null : this.fechaSinHora(fecha);
  }

  private fechaSinHora(fecha: Date): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  }

  private diferenciaDias(desde: Date, hasta: Date): number {
    const milisegundosDia = 24 * 60 * 60 * 1000;
    return Math.floor((hasta.getTime() - desde.getTime()) / milisegundosDia);
  }

  private formatoImporteCredito(valor: number): string {
    return new Intl.NumberFormat('es-DO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(valor || 0));
  }

  private async validarLimiteCreditoAntesGuardar(): Promise<boolean> {
    const codigoCliente = String(this.formularioFacturacion.get('fa_codClie')?.value || '').trim();
    if (!codigoCliente || this.limiteCreditoCliente <= 0) {
      await Swal.fire(
        'Crédito no disponible',
        'El cliente no tiene un límite de crédito válido configurado.',
        'warning',
      );
      return false;
    }

    try {
      const respuesta: any = await firstValueFrom(
        this.servicioFacturacion.buscarCreditosPendientesCliente(codigoCliente),
      );
      const codigoActual = String(this.formularioFacturacion.get('fa_codFact')?.value || '').trim();
      const facturas = (Array.isArray(respuesta?.data) ? respuesta.data : [])
        .filter((factura: any) =>
          !this.modoedicionFacturacion ||
          String(factura?.fa_codFact ?? factura?.fa_codfact ?? '').trim() !== codigoActual,
        );
      const saldoPendiente = facturas.reduce(
        (total: number, factura: any) => total + Math.max(Number(factura?.fa_valFact ?? factura?.fa_valfact ?? 0), 0),
        0,
      );
      const totalProyectado = saldoPendiente + Math.max(Number(this.totalGral || 0), 0);
      this.saldoCreditoPendienteCliente = saldoPendiente;

      if (totalProyectado <= this.limiteCreditoCliente) return true;

      await Swal.fire({
        icon: 'warning',
        title: 'Límite de crédito excedido',
        text: `Pendiente: RD$${this.formatoImporteCredito(saldoPendiente)}. Factura actual: RD$${this.formatoImporteCredito(this.totalGral)}. Total: RD$${this.formatoImporteCredito(totalProyectado)}. Límite: RD$${this.formatoImporteCredito(this.limiteCreditoCliente)}.`,
        confirmButtonText: 'OK',
        focusConfirm: true,
      });
      return false;
    } catch (error) {
      console.error('No se pudo validar el límite de crédito antes de guardar:', error);
      await Swal.fire(
        'Crédito no disponible',
        'No se pudo validar el límite de crédito. La factura no fue guardada.',
        'warning',
      );
      return false;
    }
  }

  cargarDatosSector(sector: ModeloSectorData) {
    this.resultadoNombre = [];
    this.buscarSector.reset();
    if (sector.se_desSect !== '') {
      console.log(this.resultadoSector);
      this.formularioFacturacion.patchValue({
        fa_codSect: sector.se_codSect,
        fa_sector: sector.se_desSect,
        fa_codZona: sector.se_codZona,
      });
      console.log(sector);
    }
  }
  cargarDatosFpago(fpago: ModeloFpagoData) {
    this.resultadoFpago = []; // Ocultar lista
    // this.buscarFpago.reset(); // No resetear, poner la descripción
    this.buscarFpago.setValue(fpago.fp_descfpago, { emitEvent: false });

    if (fpago.fp_descfpago !== '') {
      this.formularioFacturacion.patchValue({
        // fa_fpago: fpago.fp_descfpago, // Ya no se usa para el ID
        fa_codfpago: String(fpago.fp_codfpago),
      });

      // Mover foco al siguiente elemento si es necesario
      // Pero esto se llama desde Enter/Click.
      // Si es desde Enter en input, el preventDefault ya ocurrió.
      // Si queremos mover el foco, podemos hacerlo aquí.
      const nextInput = document.getElementById('input11'); // Entrega input ID
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  cargarDatosEnvio(envio: any) {
    this.resultadoEnvio = [];
    this.buscarEnvio.setValue(envio.descripcion, { emitEvent: false });
    this.formularioFacturacion.patchValue({ fa_envio: envio.codigo });

    // Mover foco al siguiente (Vendedor o Boton)
    const nextInput = document.getElementById('input12');
    if (nextInput) {
      nextInput.focus();
    }
  }

  onFocusFpago(): void {
    if (this.blurTimeoutFpago) clearTimeout(this.blurTimeoutFpago);
    this.mostrarDropdownFpago = true;
    if (!this.listaFpago.length) {
      this.obtenerfpago(true);
    } else if (!this.resultadoFpago.length) {
      this.resultadoFpago = [...this.listaFpago];
    }
    this.selectedIndexfpago = 0;
  }

  onBlurFpago(): void {
    if (this.blurTimeoutFpago) clearTimeout(this.blurTimeoutFpago);
    this.blurTimeoutFpago = setTimeout(() => {
      this.mostrarDropdownFpago = false;
    }, 150);
  }

  onFocusEnvio(): void {
    if (this.blurTimeoutEnvio) clearTimeout(this.blurTimeoutEnvio);
    this.mostrarDropdownEnvio = true;
    if (!this.resultadoEnvio.length) this.resultadoEnvio = this.listaEnvio;
    this.selectedIndexEnvio = 0;
  }

  onBlurEnvio(): void {
    if (this.blurTimeoutEnvio) clearTimeout(this.blurTimeoutEnvio);
    this.blurTimeoutEnvio = setTimeout(() => {
      this.mostrarDropdownEnvio = false;
    }, 150);
  }

  abrirModalDetalle(): void {
    try {
      this.protegerModalDetalleDuranteAvisos();
      const modalDetalle = $('#modalDetalleFactura');
      modalDetalle.one('shown.bs.modal', () => {
        const inputCodigo = this.codigoInput?.nativeElement;
        if (!inputCodigo || inputCodigo.disabled) return;

        inputCodigo.focus();
        inputCodigo.select();
      });
      modalDetalle.modal('show');
    } catch (e) {
      console.warn('No se pudo abrir #modalDetalleFactura:', e);
    }
  }

  private protegerModalDetalleDuranteAvisos(): void {
    if (this.modalDetalleProtegido) return;
    try {
      const modalDetalle = $('#modalDetalleFactura');
      if (!modalDetalle?.length) return;
      modalDetalle.on('hide.bs.modal.facturacionDetalle', (event: any) => {
        if (Swal.isVisible()) {
          event.preventDefault();
          event.stopImmediatePropagation?.();
          setTimeout(() => Swal.getConfirmButton()?.focus(), 0);
        }
      });
      this.modalDetalleProtegido = true;
    } catch (error) {
      console.warn('No se pudo proteger #modalDetalleFactura:', error);
    }
  }

  private abrirModalBuscarFactura(): void {
    this.onOpenBuscarFacturaModal();
    try {
      $('#modalBuscarFactura').modal('show');
    } catch (e) {
      console.warn('No se pudo abrir #modalBuscarFactura:', e);
    }
  }

  private tieneFacturaEnCurso(): boolean {
    const factura = this.formularioFacturacion?.getRawValue?.() || {};
    const camposCaptura = [
      factura.fa_rncFact,
      factura.fa_nomClie,
      factura.fa_codClie,
      factura.fa_telClie,
      factura.fa_dirClie,
      factura.fa_correo,
      factura.fa_codVend,
      factura.fa_nomVend,
      factura.fa_sector,
      factura.fa_contacto,
      factura.fa_envio,
      factura.fa_fpago,
    ];

    return this.items.length > 0 || camposCaptura.some((campo) => String(campo || '').trim() !== '');
  }

  handleKeydownEnvio(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadoEnvio.length - 1;

    if (key === 'ArrowDown') {
      if (this.selectedIndexEnvio < maxIndex) {
        this.selectedIndexEnvio++;
      } else {
        this.selectedIndexEnvio = 0;
      }
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      if (this.selectedIndexEnvio > 0) {
        this.selectedIndexEnvio--;
      } else {
        this.selectedIndexEnvio = maxIndex;
      }
      event.preventDefault();
    } else if (key === 'Enter') {
      if (this.selectedIndexEnvio >= 0 && this.selectedIndexEnvio <= maxIndex) {
        this.cargarDatosEnvio(this.resultadoEnvio[this.selectedIndexEnvio]);
      } else if (
        this.resultadoEnvio.length === 0 &&
        this.formularioFacturacion.get('fa_envio')?.value
      ) {
        // Si ya hay valor seleccionado y presionan enter, mover foco
        const nextInput = document.getElementById('input12');
        if (nextInput) nextInput.focus();
      }
      event.preventDefault();
    }
  }

  moveFocusFpago(event: any, nextInput: any) {
    // Deprecated logic mostly, logic moved to handleKeydownFpago or cargarDatosFpago
    // But keep for safety if used elsewhere
    event.preventDefault();
    if (nextInput) nextInput.focus();
  }

  private productoTieneTramoFacturable(): boolean {
    const tramo = String(
      this.tipomerc ||
      this.productoselect?.in_tramo ||
      (this.productoselect as any)?.IN_TRAMO ||
      '',
    ).trim().toUpperCase();

    return tramo === 'F' || tramo === 'H';
  }

  agregaItem(event: Event) {
    event.preventDefault();
    if (
      !this.productoselect ||
      this.cantidadmerc <= 0 ||
      this.preciomerc <= 0 ||
      this.preciomerc <= this.productoselect.in_cosmerc
    ) {
      void this.mostrarAvisoDetalle(
        'Por favor complete todos los campos requeridos antes de agregar el ítem.',
        event.target as HTMLInputElement,
      );
      return;
    }
    if (!this.productoTieneTramoFacturable()) {
      void this.mostrarAvisoDetalle(
        'Solo se pueden agregar productos con tramo F o H.',
        this.codigoInput?.nativeElement,
      );
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
      this.itemToEdit.costo = this.costotxt * this.cantidadmerc;
      this.itemToEdit.fecfactActual = fechaActual; // Actualiza la fecha del ítem existente
      this.itemToEdit.df_tipoMerc = this.tipomerc;
      // Actualizar los totales
      this.actualizarTotales();
      // Restablecer el estado de edición
      this.isEditing = false;
      this.itemToEdit = null;
    } else {
      const total = this.cantidadmerc * this.preciomerc;
      this.totalGral += total;
      const itbis = this.calcularItbisRestando(total);
      this.totalItbis += itbis;
      this.subTotal += total - itbis;
      const tcosto = this.costotxt * this.cantidadmerc;
      this.totalcosto += this.costotxt * this.cantidadmerc;
      this.factxt = this.calcularMargenFactura();
      this.protxt = ((this.preciomerc - this.costotxt) * 100) / this.costotxt;
      this.items.push({
        producto: this.productoselect,
        df_tipoMerc: this.tipomerc,
        cantidad: this.cantidadmerc,
        precio: this.preciomerc,
        total,
        costo: tcosto,
        fecfactActual: fechaActual, // Agrega la fecha actual al nuevo ítem
      });
      this.actualizarTotales();
      this.cancelarBusquedaDescripcion = false;
      this.cancelarBusquedaCodigo = false;
    }
    this.limpiarCampos();
  }
  actualizarCalculo() {
    const precio = Number(this.precioform.value) || 0;
    this.protxt = ((precio - this.costotxt) * 100) / this.costotxt; // Aquí puedes hacer cualquier cálculo
  }
  limpiarCampos() {
    this.productoselect;
    this.codmerc = '';
    this.descripcionmerc = '';
    this.preciomerc = 0;
    this.cantidadmerc = 0;

    // Sincronizar controles
    this.buscarcodmerc.setValue('', { emitEvent: false });
    this.buscardescripcionmerc.setValue('', { emitEvent: false });
    this.precioform.setValue(0, { emitEvent: false });
    this.cantidadform.setValue(0, { emitEvent: false });

    this.isEditing = false;
    this.existenciatxt = 0;
    this.costotxt = 0;
    this.medidatxt = 0;
    this.margenVentatxt = 0;
    this.tipomerc = '';
    this.fecacttxt = ' ';
    this.atxt = 0;
    this.btxt = 0;
    this.ctxt = 0;
    this.dtxt = 0;
    this.etxt = 0;
    this.ftxt = 0;
    this.gtxt = 0;
    this.htxt = 0;
    this.protxt = 0;
  }

  limpiarTabla() {
    this.items = []; // Limpiar el array de items
    this.totalGral = 0; // Reiniciar el total general
    this.totalItbis = 0; // Reiniciar el total del ITBIS
    this.subTotal = 0; // Reiniciar el subtotal
    this.actualizarTotales(); // Reflejar 0.00 en subtotaltxt, itbitxt y totalgraltxt
  }

  borarItem(item: any) {
    const index = this.items.indexOf(item);
    if (index > -1) {
      this.totalGral -= item.total;

      // Calcular el itbis del ítem eliminado y restarlo del total itbis
      const itbis = this.calcularItbisRestando(item.total);
      this.totalItbis -= itbis;

      // Restar el subtotal del ítem eliminado
      this.subTotal -= item.total - itbis;

      // Eliminar el ítem de la lista
      this.items.splice(index, 1);
      this.actualizarTotales();
    }
  }

  editarItem(item: any) {
    this.index_item = this.items.indexOf(item);

    this.isEditing = true;
    this.itemToEdit = item;

    this.productoselect = item.producto;
    this.codmerc = item.producto.in_codmerc;
    this.descripcionmerc = item.producto.in_desmerc;
    this.preciomerc = item.precio;
    this.cantidadmerc = item.cantidad;
    this.existenciatxt = item.producto.in_canmerc;
    this.costotxt = item.producto.in_cosmerc;
    this.margenVentatxt = item.producto.in_porgana;
    this.tipomerc = String(
      item.df_tipoMerc ??
        item.df_tipomerc ??
        item.producto?.in_tramo ??
        item.producto?.IN_TRAMO ??
        '',
    ).trim();

    // Sincronizar controles
    this.buscarcodmerc.setValue(this.codmerc, { emitEvent: false });
    this.buscardescripcionmerc.setValue(this.descripcionmerc, {
      emitEvent: false,
    });
    this.precioform.setValue(this.preciomerc, { emitEvent: false });
    this.cantidadform.setValue(this.cantidadmerc, { emitEvent: false });
  }
  actualizarTotales() {
    this.totalGral = this.items.reduce(
      (sum, item) => sum + this.totalFacturableItem(item),
      0,
    );
    this.totalItbis = this.items.reduce(
      (sum, item) =>
        sum + this.calcularItbisParaTotalFacturable(this.totalFacturableItem(item)),
      0,
    );
    this.subTotal = this.items.reduce(
      (sum, item) => {
        const totalItem = this.totalFacturableItem(item);
        return sum + (totalItem - this.calcularItbisParaTotalFacturable(totalItem));
      },
      0,
    );
    this.totalcosto = this.items.reduce(
      (sum, item) => sum + (Number(item.costo) || 0),
      0,
    );
    this.factxt = this.calcularMargenFactura();
    const formatCurrency = (value: number) =>
      value.toLocaleString('es-DO', {
        style: 'currency',
        currency: 'DOP',
      });
    this.subtotaltxt = formatCurrency(this.subTotal);
    this.itbitxt = formatCurrency(this.totalItbis);
    this.totalgraltxt = formatCurrency(this.totalGral);
  }

  salirDetalleProducto(): void {
    this.resultadoCodmerc = [];
    this.resultadodescripcionmerc = [];
    this.ocultarResultadosCodmerc = true;
    try {
      $('#modalDetalleFactura').modal('hide');
    } catch (e) {
      console.warn('No se pudo cerrar #modalDetalleFactura:', e);
    }
  }

  private calcularMargenFactura(): number {
    return this.totalGral > 0
      ? ((this.totalGral - this.totalcosto) * 100) / this.totalGral
      : 0;
  }

  private calcularItbisSumando(subtotal: number): number {
    return this.redondear(Number(subtotal || 0) * this.tasaItbisSumar());
  }

  private calcularItbisRestando(total: number): number {
    return this.redondear(Number(total || 0) * this.tasaItbisRestar());
  }

  private calcularItbisParaTotalFacturable(total: number): number {
    return this.esTipoNcf44() ? 0 : this.calcularItbisRestando(total);
  }

  private precioFacturableItem(item: interfaceDetalleModel): number {
    const precio = Number((item as any)?.precio ?? (item as any)?.df_preMerc ?? 0) || 0;
    if (!this.esTipoNcf44()) {
      return this.redondear(precio);
    }

    const descuentoItbis = precio * this.tasaItbisRestar();
    return this.redondear(Math.max(precio - descuentoItbis, 0));
  }

  private totalFacturableItem(item: interfaceDetalleModel): number {
    const cantidad = Number((item as any)?.cantidad ?? (item as any)?.df_canMerc ?? 0) || 0;
    return this.redondear(cantidad * this.precioFacturableItem(item));
  }

  private crearDetalleParaGuardar(): interfaceDetalleModel[] {
    if (!this.esTipoNcf44()) {
      return this.items;
    }

    return this.items.map((item) => ({
      ...item,
      precio: this.precioFacturableItem(item),
      total: this.totalFacturableItem(item),
    }));
  }

  private esTipoNcf44(): boolean {
    const controlValue = this.formularioFacturacion?.get('fa_tipoNcf')?.value;
    const rawValue = this.formularioFacturacion?.getRawValue?.()?.fa_tipoNcf;
    return Number(String(controlValue ?? rawValue ?? '').trim()) === 44;
  }

  private tasaItbisSumar(): number {
    const itbis: any = this.itbisActual || {};
    return Number(
      itbis?.porcentaje ??
        itbis?.itebis ??
        itbis?.itbis ??
        0
    ) / 100;
  }

  private tasaItbisRestar(): number {
    const itbis: any = this.itbisActual || {};
    const porcentaje = Number(
      itbis?.porcentaje ??
        itbis?.itebis ??
        itbis?.itbis ??
        0
    );
    const porcentajeMenos = Number(
      itbis?.porcentaje_menos ??
        itbis?.itbismeno ??
        itbis?.itbis_menos ??
        itbis?.porcentajemenos ??
        (porcentaje ? porcentaje / (1 + porcentaje / 100) : 0)
    );
    return porcentajeMenos / 100;
  }

  private redondear(value: number): number {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  private async cargarItbisDeFactura(factura: any): Promise<void> {
    const codigoItbis = String(factura?.fa_tipoitbis || '').trim();
    try {
      if (codigoItbis) {
        const lista = await firstValueFrom(this.servicioItbis.buscarTodos());
        const itbisPorCodigo = lista.find((row) =>
          String(row.codigo || '').trim().toLowerCase() === codigoItbis.toLowerCase()
        );
        if (itbisPorCodigo) {
          this.itbisActual = itbisPorCodigo;
          return;
        }
      }

      const itbisPorNivel = await this.obtenerItbisParaComprobante(factura?.fa_tipoNcf, false);
      if (itbisPorNivel) {
        this.itbisActual = itbisPorNivel;
      }
    } catch (error) {
      console.error('Error cargando ITBIS de factura:', error);
    }
  }

  cambiarTipoVenta(): void {
    const tipo = Number(this.formularioFacturacion.get('fa_tipopago')?.value || 1);
    this.actualizarTipoVenta(tipo);
  }

  private actualizarTipoVenta(tipo: number): void {
    const esCredito = tipo === 2 && this.clientePermiteCredito;
    const tipoVenta = esCredito ? 2 : 1;
    const vencimiento = esCredito
      ? this.calcularFechaExpiracionCredito(new Date(), this.diasCreditoCliente)
      : null;
    this.formularioFacturacion.patchValue(
      { fa_tipopago: tipoVenta, fa_expFact: vencimiento },
      { emitEvent: false },
    );
  }

  private async validarRncAntesDeGuardar(): Promise<boolean> {
    const rnc = String(
      this.formularioFacturacion.get('fa_rncFact')?.value || '',
    ).replace(/\D/g, '').trim();

    if (!rnc) return true;

    this.formularioFacturacion.patchValue(
      { fa_rncFact: rnc },
      { emitEvent: false },
    );

    if (rnc.length !== 9 && rnc.length !== 11) {
      await Swal.fire({
        icon: 'warning',
        title: 'RNC invalido',
        text: 'El RNC debe contener 9 u 11 digitos.',
        confirmButtonText: 'Aceptar',
      });
      this.enfocarCampoFactura('input1');
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.ServicioRnc.buscarRncPorrncId(rnc),
      );
      const nombreRnc = String(response?.data?.rason || '').trim();
      if (!response?.data || !nombreRnc) {
        await Swal.fire({
          icon: 'warning',
          title: 'RNC invalido',
          text: 'El RNC digitado no se encuentra registrado como valido.',
          confirmButtonText: 'Aceptar',
        });
        this.enfocarCampoFactura('input1');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error validando RNC antes de guardar:', error);
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo validar el RNC',
        text: 'Verifique el RNC o la conexion e intente nuevamente.',
        confirmButtonText: 'Aceptar',
      });
      this.enfocarCampoFactura('input1');
      return false;
    }
  }

  private async validarIdentificacionConsumidorFinalAltoMonto(): Promise<boolean> {
    const tipoNcf = Number(
      String(
        this.formularioFacturacion.get('fa_tipoNcf')?.value ??
        this.formularioFacturacion.getRawValue()?.fa_tipoNcf ??
        '',
      ).trim(),
    );
    const totalFactura = Math.max(Number(this.totalGral || 0), 0);
    if (tipoNcf !== 32 || totalFactura < 250000) return true;

    const identificacion = String(
      this.formularioFacturacion.get('fa_rncFact')?.value || '',
    ).replace(/\D/g, '').trim();
    if (identificacion && [9, 11].includes(identificacion.length)) return true;

    await Swal.fire({
      icon: 'warning',
      title: 'RNC o cédula requerido',
      text: 'Para continuar con una factura de consumidor final por RD$250,000 o más, debe agregar un RNC o una cédula válida para la DGII.',
      confirmButtonText: 'Aceptar',
      focusConfirm: true,
    });
    this.enfocarCampoFactura('input1');
    return false;
  }

  async guardarFacturacion() {
    if (this.isLoading) {
      return;
    }

    if (!(await this.validarCodigoVendedor(false, null))) {
      this.enfocarCampoFactura('input12');
      return;
    }

    if (!(await this.validarIdentificacionConsumidorFinalAltoMonto())) {
      return;
    }

    if (!(await this.validarRncAntesDeGuardar())) {
      return;
    }

    const formaPago = String(
      this.formularioFacturacion.get('fa_codfpago')?.value ?? '',
    ).trim();
    if (!formaPago) {
      await Swal.fire({
        icon: 'warning',
        title: 'Forma de pago requerida',
        text: 'Debe seleccionar la forma de pago antes de guardar la factura.',
        confirmButtonText: 'Aceptar',
      });
      this.enfocarCampoFactura('input9');
      return;
    }

    const formaEnvio = String(
      this.formularioFacturacion.get('fa_envio')?.value ?? '',
    ).trim();
    if (!formaEnvio) {
      await Swal.fire({
        icon: 'warning',
        title: 'Forma de envio requerida',
        text: 'Debe seleccionar la forma de envio antes de guardar la factura.',
        confirmButtonText: 'Aceptar',
      });
      this.enfocarCampoFactura('input11');
      return;
    }

    const tipoVentaActual = Number(
      this.formularioFacturacion.get('fa_tipopago')?.value ?? 1,
    );
    if (tipoVentaActual === 2 && !(await this.validarLimiteCreditoAntesGuardar())) {
      return;
    }

    this.isLoading = true;
    const date = new Date();
    this.formularioFacturacion.get('fa_valFact')?.patchValue(this.totalGral);
    this.formularioFacturacion.get('fa_itbiFact')?.patchValue(this.totalItbis);
    this.formularioFacturacion.get('fa_cosFact')?.patchValue(this.totalcosto);
    this.formularioFacturacion.get('fa_subFact')?.patchValue(this.subTotal);
    this.formularioFacturacion.get('fa_tipoNcf')!.enable();
    this.formularioFacturacion.get('fa_codFact')!.enable();
    this.formularioFacturacion.get('fa_fecFact')!.enable();
    this.formularioFacturacion.get('fa_nomVend')!.enable();
    this.formularioFacturacion.get('fa_ncfFact')!.enable();
    // Construir payload asegurando fecha en formato Prisma (YYYY-MM-DD)
    const facturaPayload = {
      ...this.formularioFacturacion.getRawValue(),
    } as any;
    facturaPayload.fa_status = 'C';
    facturaPayload.fa_tipopago = Number(facturaPayload.fa_tipopago) === 2 ? 2 : 1;
    if (!this.modoedicionFacturacion) {
      facturaPayload.fa_salida = 'N';
      facturaPayload.fa_impresa = 'N';
      facturaPayload.fa_reimpresa = 'N';
      facturaPayload.fa_entrega = 'N';
      facturaPayload.fa_impalmaf = 'N';
      facturaPayload.fa_impalmap = 'N';
      facturaPayload.fa_pendiente = 'N';
      facturaPayload.fa_despacho = 'N';
    }
    facturaPayload.fa_codEmpr = localStorage.getItem('codigoempresa');
    facturaPayload.fa_codSucu = parseInt(
      localStorage.getItem('idSucursal') || '0',
    );
    const tipoNcfSeleccionado = String(facturaPayload.fa_tipoNcf ?? '').trim();
    if (!tipoNcfSeleccionado) {
      this.isLoading = false;
      Swal.fire({
        icon: 'error',
        title: 'Tipo de comprobante requerido',
        text: 'Debe seleccionar el tipo de comprobante antes de guardar la factura.',
      });
      return;
    }
    // Convertir fa_tipoNcf a entero
    const tipoNcfNumero = parseInt(tipoNcfSeleccionado, 10);
    if (!Number.isFinite(tipoNcfNumero) || tipoNcfNumero <= 0) {
      this.isLoading = false;
      Swal.fire({
        icon: 'error',
        title: 'Tipo de comprobante invalido',
        text: 'El tipo de comprobante seleccionado no es valido.',
      });
      return;
    }
    facturaPayload.fa_tipoNcf = tipoNcfNumero;
    const itbisFactura = await this.obtenerItbisParaComprobante(facturaPayload.fa_tipoNcf, true);
    if (!itbisFactura) {
      this.isLoading = false;
      return;
    }
    this.itbisActual = itbisFactura;
    this.actualizarTotales();
    this.formularioFacturacion.get('fa_valFact')?.patchValue(this.totalGral);
    this.formularioFacturacion.get('fa_itbiFact')?.patchValue(this.totalItbis);
    this.formularioFacturacion.get('fa_subFact')?.patchValue(this.subTotal);
    facturaPayload.fa_valFact = this.totalGral;
    facturaPayload.fa_itbiFact = this.totalItbis;
    facturaPayload.fa_subFact = this.subTotal;
    facturaPayload.fa_tipoitbis = itbisFactura.codigo;
    this.formularioFacturacion.patchValue({ fa_tipoitbis: itbisFactura.codigo }, { emitEvent: false });
    facturaPayload.fa_fecFact = this.toPrismaDate(facturaPayload.fa_fecFact);
    if (Number(facturaPayload.fa_tipopago) === 2 && !this.modoedicionFacturacion) {
      facturaPayload.fa_expFact = this.calcularFechaExpiracionCredito(
        new Date(),
        this.diasCreditoCliente,
      );
      this.formularioFacturacion.patchValue(
        { fa_expFact: facturaPayload.fa_expFact },
        { emitEvent: false },
      );
    } else if (Number(facturaPayload.fa_tipopago) !== 2) {
      facturaPayload.fa_expFact = null;
      this.formularioFacturacion.patchValue(
        { fa_expFact: null },
        { emitEvent: false },
      );
    }
    facturaPayload.fa_rncFact = facturaPayload.fa_rncFact || '';
    const detalleParaGuardar = this.crearDetalleParaGuardar();
    const detalleModificado =
      this.modoedicionFacturacion &&
      this.serializarDetalleEdicion(detalleParaGuardar) !== this.detalleOriginalEdicion;
    const datosParaGuardar: any = {
      factura: facturaPayload,
      detalle: detalleParaGuardar,
    };
    if (this.modoedicionFacturacion) {
      const facturaCambios = this.construirCambiosFactura(facturaPayload);
      if (detalleModificado) {
        facturaCambios['fa_valFact'] = facturaPayload.fa_valFact;
        facturaCambios['fa_itbiFact'] = facturaPayload.fa_itbiFact;
        facturaCambios['fa_cosFact'] = this.totalcosto;
        facturaCambios['fa_subFact'] = facturaPayload.fa_subFact;
      }
      datosParaGuardar.facturaCambios = facturaCambios;
      datosParaGuardar.actualizarDetalle = detalleModificado;
    }
    console.log('Datos', datosParaGuardar);

    const codCliente = this.formularioFacturacion.get('fa_codClie')?.value;
    const nomCliente = this.formularioFacturacion.get('fa_nomClie')?.value;
    const rncFactura = this.formularioFacturacion.get('fa_rncFact')?.value;

    const tieneNombre = nomCliente && nomCliente.toString().trim() !== '';
    const tieneRnc = rncFactura && rncFactura.toString().trim() !== '';

    // Debe tener al menos un Nombre de Cliente O un RNC válido
    if (!tieneNombre && !tieneRnc) {
      this.isLoading = false;
      Swal.fire({
        icon: 'error',
        title: 'Error de validación',
        text: 'Debe ingresar un Nombre de Cliente o un RNC antes de facturar.',
      });
      return;
    }

    if (this.formularioFacturacion.valid) {
      const operacion = this.modoedicionFacturacion
        ? this.servicioFacturacion.editarFacturacion(datosParaGuardar)
        : this.servicioFacturacion.guardarFacturacion(datosParaGuardar);
      operacion.subscribe(
        (response) => {
          this.isLoading = false;
          Swal.fire({
            title: 'Excelente!',
            text: this.modoedicionFacturacion
              ? 'Facturacion actualizada correctamente.'
              : 'Facturacion creada correctamente.',
            icon: 'success',
            timer: 1000,
            showConfirmButton: false,
          });

          this.formularioFacturacion.reset();
          this.crearFormularioFacturacion();
          this.formularioFacturacion.enable();
          this.limpia();
        },
        (error) => {
          this.isLoading = false;
          console.error('Error al guardar facturación:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: this.extraerMensajeError(error),
          });
        },
      );
    } else {
      this.isLoading = false;
      alert('Esta Factura no fue Guardada');
    }
  }

  private enfocarCampoFactura(id: string): void {
    setTimeout(() => {
      const input = document.getElementById(id) as HTMLInputElement | null;
      input?.focus();
      input?.select();
    }, 0);
  }

  private construirCambiosFactura(actual: Record<string, any>): Record<string, any> {
    const original = this.facturaOriginalEdicion || {};
    const calculados = new Set([
      'fa_valFact',
      'fa_itbiFact',
      'fa_cosFact',
      'fa_subFact',
    ]);
    const cambios: Record<string, any> = {};

    Object.keys(this.formularioFacturacion.getRawValue()).forEach((campo) => {
      if (campo === 'fa_codFact' || calculados.has(campo)) return;
      const valorActual = actual[campo];
      const valorOriginal = original[campo];
      if (
        this.normalizarValorEdicion(campo, valorActual) !==
        this.normalizarValorEdicion(campo, valorOriginal)
      ) {
        cambios[campo] = valorActual;
      }
    });

    return cambios;
  }

  private normalizarValorEdicion(campo: string, valor: any): string {
    if (campo === 'fa_fecFact' || campo === 'fa_fecNcf' || campo === 'fa_expFact') {
      return this.toPrismaDate(valor);
    }

    const camposNumericos = new Set([
      'fa_tipoNcf',
      'fa_codClie',
      'fa_codZona',
      'fa_codSect',
      'fa_codfpago',
      'fa_envio',
      'fa_tipoFact',
      'fa_tipoRnc',
    ]);
    if (camposNumericos.has(campo)) {
      const numero = Number(valor);
      return Number.isFinite(numero) ? String(numero) : '';
    }

    return String(valor ?? '').trim();
  }

  private serializarDetalleEdicion(items: interfaceDetalleModel[]): string {
    return JSON.stringify(
      (items || []).map((item: any) => ({
        codigo: String(
          item?.producto?.in_codmerc ?? item?.df_codMerc ?? '',
        ).trim(),
        descripcion: String(
          item?.producto?.in_desmerc ?? item?.df_desMerc ?? '',
        ).trim(),
        cantidad: Number(item?.cantidad ?? item?.df_canMerc ?? 0) || 0,
        precio: Number(item?.precio ?? item?.df_preMerc ?? 0) || 0,
        total: Number(item?.total ?? item?.df_valMerc ?? 0) || 0,
        costo: Number(item?.costo ?? item?.df_cosMerc ?? 0) || 0,
        tipo: String(item?.df_tipoMerc ?? '').trim(),
      })),
    );
  }

  private async obtenerItbisParaComprobante(tipoNcf: any, mostrarAviso: boolean): Promise<ItbisData | null> {
    const tipoSeleccionado = this.ncflist.find((ncf) =>
      String(ncf.codigo).trim() === String(tipoNcf || '').trim()
    );
    const nivelItbis = String((tipoSeleccionado as any)?.nivel_itbis || '').trim();

    if (!nivelItbis) {
      if (mostrarAviso) {
        await Swal.fire({
          icon: 'warning',
          title: 'Nivel ITBIS no configurado',
          text: 'El tipo de comprobante seleccionado no tiene nivel_itbis configurado.',
        });
      }
      return null;
    }

    try {
      const itbis = await firstValueFrom(this.servicioItbis.buscarActivoPorNivel(nivelItbis));
      if (String(itbis?.codigo || '').trim()) return itbis;
    } catch (error) {
      console.error('Error buscando ITBIS por nivel:', error);
    }

    if (mostrarAviso) {
      await Swal.fire({
        icon: 'warning',
        title: 'ITBIS no encontrado',
        text: `No existe un ITBIS activo para el nivel ${nivelItbis}.`,
      });
    }
    return null;
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
    this.mostrarInformacionProductoSeleccionado(this.selectedItem);
  }

  calcularPorcentaje(): void {
    this.protxt =
      ((this.selectedItem.total - this.selectedItem.costo) * 100) /
      this.selectedItem.costo;
  }

  private mostrarInformacionProductoSeleccionado(item: any): void {
    const producto = item?.producto;
    const codigo = String(producto?.in_codmerc || '').trim();
    if (!producto || !codigo) return;

    this.aplicarInformacionProducto(producto, item);
    this.cargarExistenciaInformacionProducto(codigo);

    this.ServicioInventario.obtenerProductoPorId(codigo).subscribe({
      next: (response: any) => {
        if (
          this.selectedItem !== item ||
          String(this.selectedItem?.producto?.in_codmerc || '').trim() !== codigo
        ) {
          return;
        }

        const productoActualizado = response?.data;
        if (!productoActualizado) return;

        item.producto = {
          ...producto,
          ...productoActualizado,
          in_canmerc: producto.in_canmerc,
        };
        this.aplicarInformacionProducto(item.producto, item);
      },
      error: (error) => {
        console.error('Error consultando informacion del producto:', error);
      },
    });
  }

  private aplicarInformacionProducto(producto: any, item: any): void {
    const costoUnitario = this.obtenerCostoUnitarioProducto(producto, item);
    const precioUnitario = Number(item?.precio ?? producto?.in_premerc ?? 0) || 0;

    this.existenciatxt = Number(producto?.in_canmerc ?? 0) || 0;
    this.medidatxt = producto?.in_medida ?? producto?.media ?? '';
    this.margenVentatxt = Number(producto?.in_porgana ?? 0) || 0;
    this.fecacttxt = producto?.in_fecmodif ?? producto?.in_fecmodi ?? ' ';
    this.costotxt = costoUnitario;
    this.protxt =
      costoUnitario > 0
        ? ((precioUnitario - costoUnitario) * 100) / costoUnitario
        : 0;

    this.atxt = costoUnitario + (costoUnitario * 5) / 100;
    this.btxt = costoUnitario + (costoUnitario * 7) / 100;
    this.ctxt = costoUnitario + (costoUnitario * 10) / 100;
    this.dtxt = costoUnitario + (costoUnitario * 12) / 100;
    this.etxt = costoUnitario + (costoUnitario * 14) / 100;
    this.ftxt = costoUnitario + (costoUnitario * 16) / 100;
    this.gtxt = costoUnitario + this.calcularItbisSumando(costoUnitario);
    this.htxt = costoUnitario + (costoUnitario * 20) / 100;
  }

  private obtenerCostoUnitarioProducto(producto: any, item: any): number {
    const costoProducto = Number(producto?.in_cosmerc ?? producto?.in_costmer ?? 0);
    if (costoProducto > 0) return costoProducto;

    const costoItem = Number(item?.costo ?? 0);
    const cantidad = Number(item?.cantidad ?? 0);
    if (costoItem > 0 && cantidad > 0 && costoItem > Number(item?.precio ?? 0)) {
      return costoItem / cantidad;
    }

    return costoItem > 0 ? costoItem : 0;
  }

  private cargarExistenciaInformacionProducto(codProducto: string): void {
    const codigo = String(codProducto || '').trim();
    const sucursal = Number(localStorage.getItem('idSucursal') || 0);
    if (!codigo || !sucursal) return;

    this.ServicioInventario
      .obtenerExistenciaPorProductoSucursal(codigo, sucursal)
      .subscribe({
        next: (response: any) => {
          if (
            String(this.selectedItem?.producto?.in_codmerc || '').trim() !==
            codigo
          ) {
            return;
          }

          const existencia = Number(response?.data?.inv_existencia ?? 0);
          this.existenciatxt = Number.isFinite(existencia) ? existencia : 0;
          this.selectedItem.producto.in_canmerc = this.existenciatxt;
        },
        error: (error) => {
          console.error('Error consultando existencia del producto:', error);
        },
      });
  }

  ngAfterViewInit() {
    this.Tabladetalle?.nativeElement?.focus?.();
  }

  formatNumber(value: any): string {
    let num = Number(value);
    if (isNaN(num)) {
      return ' ';
    }
    return num.toLocaleString('es-DO', { minimumFractionDigits: 2 });
  }

  async generarPdfFacturaDgiiA4(): Promise<void> {
    const factura: any = this.facturaConsultaSeleccionada;
    if (!factura || !this.puedeGenerarPdfFacturaDgii) return;

    try {
      // La tasa debe corresponder al codigo guardado en factura.fa_tipoitbis.
      await this.cargarItbisDeFactura(factura);
      const tasaItbisMenos = this.tasaItbisRestar();
      const response = await firstValueFrom(
        this.servicioFacturacion.buscarFacturaDetalle(factura.fa_codFact),
      );
      const detalles = Array.isArray(response?.data) ? response.data : [];
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const moneda = new Intl.NumberFormat('es-DO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const numero = (valor: any): number => Number(valor) || 0;
      const texto = (valor: any, respaldo = '-'): string =>
        String(valor ?? '').trim() || respaldo;

      let empresa: any = {};
      try {
        const almacenada = localStorage.getItem('empresa');
        empresa = almacenada && almacenada !== '[object Object]'
          ? JSON.parse(almacenada)
          : {};
        if (Array.isArray(empresa)) empresa = empresa[0] || {};
      } catch {
        empresa = {};
      }

      const nombreEmpresa = texto(
        empresa?.nom_empre || empresa?.em_nomempre || empresa?.nombre,
        'CENTRO HIERRO MARCOS SRL',
      );
      const rncEmpresa = texto(
        empresa?.rnc_empre || empresa?.em_rnc || empresa?.rnc || localStorage.getItem('rnc_empresa'),
        '',
      );
      const direccionEmpresa = texto(
        empresa?.dir_empre || empresa?.em_direccion || empresa?.direccion || localStorage.getItem('direccion_empresa'),
        '',
      );
      const telefonoEmpresa = texto(
        empresa?.tel_empre || empresa?.em_telefono || empresa?.telefono || localStorage.getItem('telefono_empresa'),
        '',
      );
      const estadoDgii = texto(factura.estado_dgii || factura.estado_envio_dgii, 'Enviada');
      const encf = texto(factura.fa_ncfFact || factura.fa_ncffact);
      const qrLink = String(factura.qr_link || '').trim();

      try {
        doc.addImage('assets/logo2.png', 'PNG', 15, 12, 24, 24);
      } catch {
        // El documento sigue siendo valido si la empresa no tiene logo configurado.
      }

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(nombreEmpresa, 44, 18);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      if (rncEmpresa) doc.text(`RNC: ${rncEmpresa}`, 44, 24);
      if (direccionEmpresa) doc.text(doc.splitTextToSize(direccionEmpresa, 100), 44, 29);
      if (telefonoEmpresa) doc.text(`Tel.: ${telefonoEmpresa}`, 44, 38);

      doc.setFillColor(15, 118, 110);
      doc.roundedRect(145, 12, 50, 25, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('FACTURA', 170, 21, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`No. ${texto(factura.fa_codFact)}`, 170, 28, { align: 'center' });
      doc.text(`DGII: ${estadoDgii}`, 170, 33, { align: 'center', maxWidth: 46 });

      doc.setDrawColor(203, 213, 225);
      doc.line(15, 45, 195, 45);
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS FISCALES', 15, 52);
      doc.setFont('helvetica', 'normal');
      doc.text(`e-NCF: ${encf}`, 15, 58);
      doc.text(`Fecha: ${this.formatFecha(factura.fa_fecFact)}`, 110, 58);
      doc.text(`Codigo de seguridad: ${texto(factura.codseguridad)}`, 15, 64);
      doc.text(`Vendedor: ${texto(factura.fa_nomVend)}`, 110, 64);

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(15, 70, 180, 24, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('CLIENTE', 19, 77);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nombre: ${texto(factura.fa_nomClie)}`, 19, 83, { maxWidth: 105 });
      doc.text(`RNC/Cedula: ${texto(factura.fa_rncFact)}`, 130, 83);
      doc.text(`Direccion: ${texto(factura.fa_dirClie)}`, 19, 89, { maxWidth: 105 });
      doc.text(`Telefono: ${texto(factura.fa_telClie)}`, 130, 89);

      autoTable(doc, {
        startY: 100,
        margin: { left: 15, right: 15 },
        head: [['Codigo', 'Descripcion', 'Cant.', 'Precio', 'ITBIS', 'Total']],
        body: detalles.map((item: any) => {
          const cantidad = numero(item.df_canMerc);
          const precioConItbis = numero(item.df_preMerc);
          const precioSinItbis = this.redondear(
            precioConItbis - precioConItbis * tasaItbisMenos,
          );
          const totalConItbis = numero(item.df_valMerc) || cantidad * precioConItbis;
          const totalSinItbis = this.redondear(totalConItbis * (1 - tasaItbisMenos));
          const itbis = this.redondear(totalConItbis - totalSinItbis);
          return [
            texto(item.df_codMerc),
            texto(item.df_desMerc),
            moneda.format(cantidad),
            moneda.format(precioSinItbis),
            moneda.format(itbis),
            moneda.format(totalConItbis),
          ];
        }),
        theme: 'grid',
        headStyles: { fillColor: [15, 118, 110], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
        },
      });

      let finalY = Number((doc as any).lastAutoTable?.finalY || 105) + 8;
      if (finalY > 245) {
        doc.addPage('a4', 'portrait');
        finalY = 20;
      }
      const subtotal = numero(factura.fa_subFact);
      const itbis = numero(factura.fa_itbiFact);
      const total = numero(factura.fa_valFact) || subtotal + itbis;
      doc.setFontSize(10);
      doc.text('Subtotal:', 145, finalY, { align: 'right' });
      doc.text(`RD$ ${moneda.format(subtotal)}`, 195, finalY, { align: 'right' });
      doc.text('ITBIS:', 145, finalY + 6, { align: 'right' });
      doc.text(`RD$ ${moneda.format(itbis)}`, 195, finalY + 6, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('TOTAL:', 145, finalY + 14, { align: 'right' });
      doc.text(`RD$ ${moneda.format(total)}`, 195, finalY + 14, { align: 'right' });

      if (qrLink) {
        const qrData = await QRCode.toDataURL(qrLink, { width: 300, margin: 1 });
        const qrY = Math.min(finalY + 4, 247);
        doc.addImage(qrData, 'PNG', 15, qrY, 32, 32);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('Consulta y valida este comprobante en DGII', 15, qrY + 37);
      }

      const paginas = doc.getNumberOfPages();
      for (let pagina = 1; pagina <= paginas; pagina += 1) {
        doc.setPage(pagina);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Pagina ${pagina} de ${paginas}`, 195, 290, { align: 'right' });
      }

      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const ventana = window.open(pdfUrl, '_blank');
      if (!ventana) {
        doc.save(`Factura-${texto(factura.fa_codFact, 'DGII')}.pdf`);
      }
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
    } catch (error: any) {
      console.error('Error generando factura DGII en PDF A4:', error);
      await Swal.fire(
        'No se pudo crear el PDF',
        String(error?.message || 'Verifica los datos de la factura e intenta nuevamente.'),
        'error',
      );
    }
  }

  async generatePDF(factura: FacturacionModelData) {
    console.log(factura);
    await this.cargarItbisDeFactura(factura);
    this.servicioFacturacion
      .buscarFacturaDetalle(factura.fa_codFact)
      .subscribe((response) => {
        let subtotal = 0;
        let itbis = 0;
        let totalGeneral = 0;
        const itbisRate = this.tasaItbisRestar();
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

        const formatCurrency = (value: number) =>
          value.toLocaleString('es-DO', {
            style: 'currency',
            currency: 'DOP',
          });

        const doc = new jsPDF();

        const imgData = 'assets/logo2.png'; // Asegúrate de usar una ruta válida o base64

        const imgWidth = 20; // Ancho de la imagen
        const imgHeight = 20; // Alto de la imagen

        // Cálculo para centrar la imagen
        const pageWidth = doc.internal.pageSize.getWidth();
        const imgX = (pageWidth - imgWidth) / 2; // Posición X centrada

        // Agregar el logo centrado
        doc.addImage(imgData, 'PNG', imgX, 10, imgWidth, imgHeight); // (x, y, ancho, alto)

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
          head: [
            ['Codigo', 'Descripción', 'Cantidad', 'Precio', 'Itbis', 'Total'],
          ],
          body: response.data.map((item: any) => [
            item.df_codMerc,
            item.df_desMerc,
            parseInt(item.df_canMerc),
            formatCurrency(parseFloat(item.df_preMerc)),
            formatCurrency(this.calcularItbisRestando(item.df_preMerc * item.df_canMerc)),
            formatCurrency(item.df_preMerc * item.df_canMerc),
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
        doc.text('*** Gracias por Preferirnos ***', 105, finalY + 55, {
          align: 'center',
        });

        // Guardar PDF
        // doc.save(`${cotizacion.ct_codcoti}.pdf`);
        const pdfBlob = doc.output('blob');

        // Crear un objeto URL para el Blob y abrirlo en una nueva pestaña
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
      });
  }
}
