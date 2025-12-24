import { Inventario } from './../mantenimientos/pages/inventario-page/inventario';
import {
  Component,
  NgModule,
  OnInit,
  ViewChild,
  ElementRef,
  ɵNG_COMP_DEF,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  from,
  switchMap,
  tap,
  catchError,
  of,
  map,
} from 'rxjs';
import Swal from 'sweetalert2';
import { ModeloUsuarioData } from 'src/app/core/services/mantenimientos/usuario';
import { ModeloRncData } from 'src/app/core/services/mantenimientos/rnc';
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
import {
  FacturaDetalleModel,
  interfaceDetalleModel,
} from 'src/app/core/services/facturacion/factura/factura';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import { ServicioSector } from 'src/app/core/services/mantenimientos/sector/sector.service';
import {
  ModeloSector,
  ModeloSectorData,
} from 'src/app/core/services/mantenimientos/sector';
import {
  ModeloFpago,
  ModeloFpagoData,
} from 'src/app/core/services/mantenimientos/fpago';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';
import {
  ModeloInventario,
  ModeloInventarioData,
} from 'src/app/core/services/mantenimientos/inventario';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { disableDebugTools } from '@angular/platform-browser';
import { ServicioNcf } from 'src/app/core/services/mantenimientos/ncf/ncf.service';
import { ModeloNcfData } from 'src/app/core/services/mantenimientos/ncf';
declare var $: any;

@Component({
  selector: 'facturacion',
  templateUrl: './facturacion.html',
  styleUrls: ['./facturacion.css'],
})
export class Facturacion implements OnInit {
  @ViewChild('inputCodmerc') inputCodmerc!: ElementRef; // Para manejar el foco
  @ViewChild('descripcionInput') descripcionInput!: ElementRef; // Para manejar el foco
  @ViewChild('Tabladetalle') Tabladetalle!: ElementRef;
  isDisabled: boolean = true;
  totalItems = 0;
  pageSize = 5;
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
  codmerVacio: boolean = false;
  desmerVacio: boolean = false;
  isLoading: boolean = false;

  habilitarCampos: boolean = false;

  sucursales = [];
  sucursalSeleccionada: any = null;
  habilitarIcono: boolean = true;
  rncValue: string = '';
  cancelarBusquedaDescripcion: boolean = false;
  cancelarBusquedaCodigo: boolean = false;
  private numfacturaSubject = new BehaviorSubject<string>('');
  private nomclienteSubject = new BehaviorSubject<string>('');
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
    private servicioNcf: ServicioNcf
  ) {
    this.form = this.fb.group({
      fa_codVend: ['', Validators.required], // El campo es requerido
      // Otros campos...
    });

    this.crearFormularioFacturacion();

    this.nomclienteSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((nomcliente) => {
          this.txtdescripcion = nomcliente;
          return this.servicioFacturacion.buscarFacturacion(
            this.currentPage,
            this.facturacionList.length,
            this.codigo,
            this.txtdescripcion
          );
        })
      )
      .subscribe((response) => {
        if (response && Array.isArray(response.data)) {
          this.facturacionList = response.data;
          this.totalItems = response.pagination?.total || 0;
          this.currentPage = response.pagination?.page || 1;
        } else {
          console.warn(
            'Respuesta de búsqueda por cliente no es válida:',
            response
          );
          this.facturacionList = [];
          this.totalItems = 0;
        }
      });

    this.numfacturaSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((codigo) => {
          this.txtFactura = codigo;
          return this.servicioFacturacion.buscarFacturacion(
            this.currentPage,
            this.facturacionList.length,
            this.codigo,
            this.txtdescripcion,
            this.txtFactura
          );
        })
      )
      .subscribe((response) => {
        if (response && Array.isArray(response.data)) {
          this.facturacionList = response.data;
          this.totalItems = response.pagination?.total || 0;
          this.currentPage = response.pagination?.page || 1;
        } else {
          console.warn(
            'Respuesta de búsqueda por número de factura no es válida:',
            response
          );
          this.facturacionList = [];
          this.totalItems = 0;
        }
      });
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
  selectedIndexfpago = 1;
  resultadodescripcionmerc: ModeloInventarioData[] = [];
  selectedIndexdescripcionmerc = 1;
  seleccionarFacturacion(facturacion: any) {
    this.selectedFacturacion = facturacion;
  }

  ngOnInit(): void {
    this.buscarTodasFacturacion();
    this.buscarcodmerc.valueChanges
      .pipe(
        tap((v) => {
          console.log('DEBUG: Input Code Change:', v);
          this.resultadoCodmerc = [];
        }),
        debounceTime(300),
        distinctUntilChanged(),
        filter((query: any) => (query || '').toString().trim() !== ''),
        tap((q) => console.log('DEBUG: Searching Code:', q)),
        switchMap((query: string) =>
          this.http
            .GetRequest<ModeloInventario>(
              `/productos-buscador/${encodeURIComponent(query)}`
            )
            .pipe(
              catchError((error) => {
                console.error('Error en búsqueda de código:', error);
                return of({ data: [] } as any); // Retorna estructura vacía válida
              })
            )
        ),
        map((response: any) => {
          if (response && Array.isArray(response.data)) {
            response.data = response.data.map((item: any) => {
              const newItem: any = {};
              Object.keys(item).forEach((key) => {
                newItem[key.toLowerCase()] = item[key];
              });
              return newItem;
            });
          }
          return response;
        })
      )
      .subscribe((results: ModeloInventario) => {
        console.log(results.data);
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
        const filterValue = value.toLowerCase();
        this.resultadoFpago = this.listaFpago.filter((option) =>
          option.fp_descfpago.toLowerCase().includes(filterValue)
        );
      }
      this.selectedIndexfpago = 0;
    });

    this.buscarEnvio.valueChanges.subscribe((value) => {
      if (!value) {
        this.resultadoEnvio = this.listaEnvio;
      } else {
        const filterValue = value.toLowerCase();
        this.resultadoEnvio = this.listaEnvio.filter((option) =>
          option.descripcion.toLowerCase().includes(filterValue)
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
        debounceTime(300),
        distinctUntilChanged(),
        filter((query: any) => (query || '').toString().trim() !== ''),
        tap((q) => console.log('DEBUG: Searching Desc:', q)),
        switchMap((query: string) =>
          this.http
            .GetRequest<ModeloInventario>(
              `/productos-buscador-desc/${encodeURIComponent(query)}`
            )
            .pipe(
              catchError((error) => {
                console.error('Error en búsqueda de descripción:', error);
                return of({ data: [] } as any);
              })
            )
        ),
        map((response: any) => {
          if (response && Array.isArray(response.data)) {
            response.data = response.data.map((item: any) => {
              const newItem: any = {};
              Object.keys(item).forEach((key) => {
                newItem[key.toLowerCase()] = item[key];
              });
              return newItem;
            });
          }
          return response;
        })
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
        filter((query: string) => query !== ''),
        switchMap((query: string) =>
          this.http.GetRequest<ModeloCliente>(`/cliente-nombre/${query}`).pipe(
            catchError((error) => {
              console.error('Error en búsqueda de cliente:', error);
              return of({ data: [] } as any);
            })
          )
        )
      )
      .subscribe((results: ModeloCliente) => {
        console.log(results.data);
        if (results) {
          if (Array.isArray(results.data)) {
            this.resultadoNombre = results.data;
          }
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
            })
          )
        )
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
      (val) => (this.codmerc = val || '')
    );
    this.buscardescripcionmerc.valueChanges.subscribe(
      (val) => (this.descripcionmerc = val || '')
    );
    this.cantidadform.valueChanges.subscribe(
      (val) => (this.cantidadmerc = Number(val) || 0)
    );
    this.precioform.valueChanges.subscribe(
      (val) => (this.preciomerc = Number(val) || 0)
    );

    // Asegurar que los campos de búsqueda estén habilitados
    this.buscarcodmerc.enable();
    this.buscardescripcionmerc.enable();

    // Gestionar estado de campos dependientes
    this.manageFieldsState();
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
  obtenerfpago() {
    this.servicioFpago.obtenerTodosFpago().subscribe((response) => {
      this.listaFpago = response.data; // Guardamos la lista completa
      // Si hay un valor seleccionado, intentamos setear el nombre en el input
      const currentId = this.formularioFacturacion.get('fa_codfpago')?.value;
      if (currentId) {
        const found = this.listaFpago.find((f) => f.fp_codfpago === currentId);
        if (found) {
          this.buscarFpago.setValue(found.fp_descfpago, { emitEvent: false });
        }
      }
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
      fa_nomClie: [''],
      fa_rncFact: [null],
      fa_telClie: [''],
      fa_dirClie: [''],
      fa_correo: [''],
      fa_codVend: ['', Validators.required],
      fa_nomVend: [''],
      fa_status: [''],
      fa_sector: [''],
      fa_codZona: [null],
      fa_desZona: [''],
      fa_fpago: [''],
      fa_codfpago: ['1'],
      fa_envio: [''],
      fa_ncfFact: [{ value: '', disabled: true }],
      fa_tipoNcf: [{ value: '32', disabled: true }],
      fa_contacto: [''],
    });
  }
  limpia(): void {
    //this.formularioFacturacion.reset();
    this.crearFormularioFacturacion();
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
    this.servicioFacturacion.buscarTodasFacturacion().subscribe((response) => {
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
  consultarFacturacion(factura: FacturacionModelData) {
    this.modoconsultaFacturacion = true;
    this.formularioFacturacion.reset();
    this.crearFormularioFacturacion();
    this.formularioFacturacion.patchValue(factura);
    // Asegurar formato de fecha dd/MM/yyyy al consultar
    const fechaFormateada = this.formatFecha((factura as any).fa_fecFact);
    this.formularioFacturacion.patchValue({ fa_fecFact: fechaFormateada });
    this.tituloModalFacturacion = 'Consulta Factura';
    // $('#modalfacturacion').modal('show');
    this.habilitarFormulario = true;
    this.formularioFacturacion.disable();
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
        const itbisRate = 0.18; // Ejemplo: 18% de ITBIS
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
      const s = String(input);
      // ISO o similar: yyyy-mm-dd...
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const d = new Date(s);
        if (!isNaN(d.getTime())) return this.formatofecha(d);
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
    this.servicioFacturacion.buscarTodasFacturacion().subscribe((response) => {
      console.log('buscarTodasFacturacion response:', response);
      if (response && Array.isArray(response.data)) {
        this.facturacionList = response.data;
      } else {
        console.warn('response.data is not an array:', response?.data);
        this.facturacionList = [];
      }
      console.log(this.facturacionList.length);
    });
  }

  buscaNombre(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.nomclienteSubject.next(inputElement.value.toUpperCase());
  }

  buscaFactura(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.numfacturaSubject.next(inputElement.value.toUpperCase());
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
    cantidadInput: HTMLInputElement
  ) {
    // Enter: buscar por cadena (prefijo). Si coincide o hay selección en grid -> ir a cantidad.
    // Si vacío -> ir a descripción. Si no hay coincidencias -> error y pasar a descripción.
    event.preventDefault();
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
      String(r.in_codmerc).toLowerCase().startsWith(queryLower)
    );
    if (candidatosLocales.length > 0) {
      this.cargarDatosInventario(candidatosLocales[0]);
      cantidadInput?.focus();
      cantidadInput?.select?.();
      this.codmerVacio = false;
      return;
    }

    // Fallback: consultar al backend con la cadena y aplicar startsWith
    this.http
      .GetRequest<ModeloInventario>(`/productos-buscador/${currentInputValue}`)
      .pipe(
        catchError((error) => {
          console.error('Error en búsqueda manual de código:', error);
          return of({ data: [] } as any);
        }),
        map((response: any) => {
          if (response && Array.isArray(response.data)) {
            response.data = response.data.map((item: any) => {
              const newItem: any = {};
              Object.keys(item).forEach((key) => {
                newItem[key.toLowerCase()] = item[key];
              });
              return newItem;
            });
          }
          return response;
        })
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
          this.resultadoCodmerc = ordenados;
          this.selectedIndexcodmerc = 0;
          const candidatos = ordenados.filter((r) =>
            String(r.in_codmerc).toLowerCase().startsWith(queryLower)
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
        this.mensagePantalla = true;
        Swal.fire({
          icon: 'error',
          title: 'A V I S O',
          text: 'Producto no encontrado.',
          focusConfirm: true,
          allowEnterKey: true,
          showConfirmButton: false,
          timer: 1200,
        }).then(() => {
          this.mensagePantalla = false;
          descripcionInput?.focus();
          descripcionInput?.select?.();
        });
        this.codmerc = '';
        this.descripcionmerc = '';
        this.codmerVacio = false;
      });
  }
  handleKeydownInventario(event: KeyboardEvent): void {
    console.log('handle');
    const key = event.key;
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
          this.resultadoCodmerc[this.selectedIndexcodmerc]
        );
        const qty = document.getElementById(
          'input15'
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
    this.preciomerc = getProp(inventario, 'in_premerc');
    this.tipomerc = getProp(inventario, 'in_tipoproduct');
    this.descripcionmerc = getProp(inventario, 'in_desmerc');

    // Sincronizar controles (fix ngModel warning)
    this.buscarcodmerc.setValue(this.codmerc, { emitEvent: false });
    this.buscardescripcionmerc.setValue(this.descripcionmerc, {
      emitEvent: false,
    });
    this.precioform.setValue(this.preciomerc, { emitEvent: false });
    this.cantidadform.setValue(0, { emitEvent: false }); // Reset cantidad logic if appropriate

    this.existenciatxt = getProp(inventario, 'in_canmerc');
    this.costotxt = getProp(inventario, 'in_cosmerc');
    this.medidatxt = getProp(inventario, 'in_medida');
    this.fecacttxt = getProp(inventario, 'in_fecmodif');

    const costo = Number(this.costotxt) || 0;

    this.atxt = costo + (costo * 5) / 100;
    this.btxt = costo + (costo * 7) / 100;
    this.ctxt = costo + (costo * 10) / 100;
    this.dtxt = costo + (costo * 12) / 100;
    this.etxt = costo + (costo * 14) / 100;
    this.ftxt = costo + (costo * 16) / 100;
    this.gtxt = costo + (costo * 18) / 100;
    this.htxt = costo + (costo * 20) / 100;

    // Calcular margen del producto actual
    if (costo > 0) {
      this.protxt = ((this.preciomerc - costo) * 100) / costo;
    } else {
      this.protxt = 0;
    }

    this.productoselect = inventario;
    this.cancelarBusquedaDescripcion = true;
    this.cancelarBusquedaCodigo = true;
    this.formularioFacturacion.patchValue({
      df_codMerc: this.codmerc,
      df_desMerc: this.descripcionmerc,
      df_tipomerc: this.tipomerc,
      df_canMerc: this.existenciatxt,
      df_preMerc: this.preciomerc,
      df_cosMerc: this.costotxt,
      df_unidad: getProp(inventario, 'in_unidad'),
    });
    // Si el usuario seleccionó desde el grid o validó el código, llevar el foco a Cantidad
    const qty = document.getElementById('input15') as HTMLInputElement | null;
    qty?.focus();
    qty?.select?.();
  }

  buscarUsuario(event: Event, nextElement: HTMLInputElement | null): void {
    event.preventDefault();
    const claveUsuario = this.formularioFacturacion.get('fa_codVend')?.value;
    if (claveUsuario) {
      this.ServicioUsuario.buscarUsuarioPorClave(claveUsuario).subscribe(
        (usuario) => {
          if (usuario.data.length) {
            this.formularioFacturacion.patchValue({
              fa_nomVend: usuario.data[0].idUsuario,
            });
            nextElement?.focus();
          } else {
            this.mensagePantalla = true;
            Swal.fire({
              icon: 'error',
              title: 'A V I S O',
              text: 'Codigo de usuario invalido.',
            }).then(() => {
              this.mensagePantalla = false;
            });
            return;
          }
        }
      );
    } else {
      this.mensagePantalla = true;
      Swal.fire({
        icon: 'error',
        title: 'A V I S O',
        text: 'Codigo de usuario invalido.',
      }).then(() => {
        this.mensagePantalla = false;
      });
      return;
    }
  }
  buscarRnc(event: Event, nextElement: HTMLInputElement | null): void {
    event.preventDefault();
    const rnc = this.formularioFacturacion.get('fa_rncFact')?.value;
    if (!rnc || rnc.trim() === '') {
      // Si no se ha ingresado un RNC, por defecto Tipo NCF = 32 (Consumidor Final)
      this.formularioFacturacion.patchValue({ fa_tipoNcf: '32' });
      this.formularioFacturacion.get('fa_tipoNcf')?.disable();
      // Pasamos el foco al siguiente elemento (Cliente)
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
    this.ServicioRnc.buscarRncPorrncId(rnc).subscribe((response) => {
      if (response?.data) {
        console.log(response.data);
        // Si se encuentra el RNC, asignar el nombre del cliente
        const nombreEmpresa = response.data.rason;

        //  const nombreEmpresa = response.data[0]?.rason;
        this.formularioFacturacion.patchValue({ fa_nomClie: nombreEmpresa });

        // MANTENIMIENTO: Todas las facturas son E32 por el momento, incluso con RNC.
        // Se mantiene deshabilitado el dropdown.
        this.formularioFacturacion.patchValue({ fa_tipoNcf: 32 });
        this.formularioFacturacion.get('fa_tipoNcf')?.disable();

        // this.ncflist = this.ncflist.filter((ncf) => ncf.codNcf !== 1);

        // Habilitar campos
        this.isDisabled = false;

        $('#input3').focus();
        $('#input3').select();
      } else {
        // Si no se encuentra el RNC, mostrar error
        this.mostrarMensajeError('RNC inválido.');
        console.log('RNC no encontrado.');
        this.isDisabled = true;
      }
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
          this.resultadodescripcionmerc[this.selectedIndexdescripcionmerc]
        );
        const qty = document.getElementById(
          'input15'
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
        this.mensagePantalla = true;
        Swal.fire({
          icon: 'error',
          title: 'A V I S O',
          text: 'Producto no encontrado.',
          focusConfirm: true,
          allowEnterKey: true,
          showConfirmButton: false,
          timer: 1200,
        }).then(() => {
          this.mensagePantalla = false;
          const input = event.target as HTMLInputElement;
          input?.focus();
          input?.select?.();
        });
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
        String(r.in_desmerc).toLowerCase().startsWith(queryLower)
      );
      if (candidatosLocales.length > 0) {
        this.cargarDatosInventario(candidatosLocales[0]);
        nextInput?.focus();
        nextInput?.select?.();
        this.desnotfound = false;
        this.desmerVacio = false;
        return;
      }

      // Fallback: consultar al backend con la cadena y aplicar startsWith
      this.http
        .GetRequest<ModeloInventario>(
          `/productos-buscador-desc/${encodeURIComponent(currentInputValue)}`
        )
        .pipe(
          catchError((error) => {
            console.error('Error en búsqueda manual de descripción:', error);
            return of({ data: [] } as any);
          })
        )
        .subscribe((results: ModeloInventario) => {
          if (results && Array.isArray(results.data) && results.data.length) {
            // Normalize data keys to lowercase to match template expectations
            const normalizedData = results.data.map((item: any) => {
              const newItem: any = {};
              Object.keys(item).forEach((key) => {
                newItem[key.toLowerCase()] = item[key];
              });
              return newItem;
            });

            const ordenados = normalizedData.sort((a, b) =>
              a.in_desmerc.localeCompare(b.in_desmerc, undefined, {
                sensitivity: 'base',
              })
            );
            this.resultadodescripcionmerc = ordenados;
            this.selectedIndexdescripcionmerc = 0;
            const candidatos = ordenados.filter((r) =>
              String(r.in_desmerc).toLowerCase().startsWith(queryLower)
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
          this.mensagePantalla = true;
          Swal.fire({
            icon: 'error',
            title: 'A V I S O',
            text: 'Producto no encontrado.',
            focusConfirm: true,
            allowEnterKey: true,
            showConfirmButton: false,
            timer: 1200,
          }).then(() => {
            this.mensagePantalla = false;
            const input = event.target as HTMLInputElement;
            input?.focus();
            input?.select?.();
          });
          this.desnotfound = true;
          this.desmerVacio = false;
        });
    }
  }
  moveFocusCantidad(event: KeyboardEvent, nextInput: HTMLInputElement) {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      if (!this.productoselect || this.cantidadmerc <= 0) {
        this.mensagePantalla = true;
        Swal.fire({
          icon: 'error',
          title: 'A V I S O',
          text: 'Por favor complete todos los campos requeridos antes de continuar.',
        }).then(() => {
          this.mensagePantalla = false;
        });
        return;
      }
      // Pasar a Precio (nextInput)
      nextInput?.focus();
      nextInput?.select?.();
    }
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
      this.mensagePantalla = true;
      Swal.fire({
        icon: 'error',
        title: 'A V I S O',
        text: 'Por favor complete todos los campos requeridos antes de agregar el ítem.',
      }).then(() => {
        this.mensagePantalla = false;
      });
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
  cargarDatosCliente(cliente: ModeloClienteData) {
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
          fa_sector: cliente.cl_codSect,
        },
        { emitEvent: false }
      );
      console.log(cliente);
      console.log('Formulario actualizado:', this.formularioFacturacion.value);
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
        fa_codfpago: fpago.fp_codfpago,
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

  agregaItem(event: Event) {
    event.preventDefault();
    if (
      !this.productoselect ||
      this.cantidadmerc <= 0 ||
      this.preciomerc <= 0 ||
      this.preciomerc <= this.productoselect.in_cosmerc
    ) {
      this.mensagePantalla = true;
      Swal.fire({
        icon: 'error',
        title: 'A V I S O',
        text: 'Por favor complete todos los campos requeridos antes de agregar el ítem.',
      }).then(() => {
        this.mensagePantalla = false;
      });
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
    } else {
      const total = this.cantidadmerc * this.preciomerc;
      this.totalGral += total;
      const itbis = total * 0.18;
      this.totalItbis += itbis;
      this.subTotal += total - itbis;
      const tcosto = this.costotxt * this.cantidadmerc;
      this.totalcosto += this.costotxt * this.cantidadmerc;
      this.factxt =
        ((this.totalGral - this.totalcosto) * 100) / this.totalcosto;
      this.protxt = ((this.preciomerc - this.costotxt) * 100) / this.costotxt;
      this.items.push({
        producto: this.productoselect,
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
      const itbis = item.total * 0.18;
      this.totalItbis -= itbis;

      // Restar el subtotal del ítem eliminado
      this.subTotal -= item.total - itbis;

      // Eliminar el ítem de la lista
      this.items.splice(index, 1);
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

    // Sincronizar controles
    this.buscarcodmerc.setValue(this.codmerc, { emitEvent: false });
    this.buscardescripcionmerc.setValue(this.descripcionmerc, {
      emitEvent: false,
    });
    this.precioform.setValue(this.preciomerc, { emitEvent: false });
    this.cantidadform.setValue(this.cantidadmerc, { emitEvent: false });
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
    facturaPayload.fa_codEmpr = localStorage.getItem('codigoempresa');
    facturaPayload.fa_codSucu = parseInt(
      localStorage.getItem('idSucursal') || '0'
    );
    // Convertir fa_tipoNcf a entero
    if (facturaPayload.fa_tipoNcf) {
      facturaPayload.fa_tipoNcf = parseInt(
        facturaPayload.fa_tipoNcf.toString(),
        10
      );
    }
    facturaPayload.fa_fecFact = this.toPrismaDate(facturaPayload.fa_fecFact);
    facturaPayload.fa_rncFact = facturaPayload.fa_rncFact || '';
    const datosParaGuardar = { factura: facturaPayload, detalle: this.items };
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
      this.isLoading = true;
      this.servicioFacturacion.guardarFacturacion(datosParaGuardar).subscribe(
        (response) => {
          this.isLoading = false;
          Swal.fire({
            title: 'Excelente!',
            text: 'Facturacion creada correctamente.',
            icon: 'success',
            timer: 1000,
            showConfirmButton: false,
          });

          this.buscarTodasFacturacion();
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
            text: 'Hubo un error al guardar la factura.',
          });
        }
      );
    } else {
      alert('Esta Factura no fue Guardada');
    }
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

  generatePDF(factura: FacturacionModelData) {
    console.log(factura);
    this.servicioFacturacion
      .buscarFacturaDetalle(factura.fa_codFact)
      .subscribe((response) => {
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
            formatCurrency((item.df_preMerc * item.df_canMerc * 18) / 100),
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
