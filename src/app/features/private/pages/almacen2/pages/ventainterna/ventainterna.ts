import {
  Component,
  NgModule,
  OnInit,
  OnDestroy,
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
  switchMap,
  tap,
} from 'rxjs';
import SweetAlert from 'sweetalert2';
const Swal = SweetAlert.mixin({
  focusConfirm: true,
  keydownListenerCapture: true,
  returnFocus: false,
});
import { ModeloUsuarioData } from 'src/app/core/services/mantenimientos/usuario';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
import { ServicioVentainterna } from 'src/app/core/services/almacen/ventainterna/ventainterna.service';
import {
  VentainternaModelData,
  detVentainternaData,
} from 'src/app/core/services/almacen/ventainterna';
//import { ServiciodetVentainterna } from 'src/app/core/services/almacen/detventainterna/detventainterna.service';
import { SucursalesData } from 'src/app/core/services/mantenimientos/sucursal';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';
import { EmpresaModelData } from 'src/app/core/services/mantenimientos/empresas';
import { ServicioEmpresa } from 'src/app/core/services/mantenimientos/empresas/empresas.service';
import {
  VentainternaDetalleModel,
  interfaceDetalleModel,
} from 'src/app/core/services/almacen/ventainterna/ventainterna';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import {
  ModeloInventario,
  ModeloInventarioData,
} from 'src/app/core/services/mantenimientos/inventario';
import { Inventario } from '../../../mantenimientos/pages/inventario-page/inventario';
import { PrintingService } from 'src/app/core/services/utils/printing.service';
import { SolicitudPrestamoService } from 'src/app/core/services/almacen/solicitudprestamo/solicitudprestamo.service';
import { ServicioProducto } from 'src/app/core/services/mantenimientos/producto/producto.service';
declare var $: any;
@Component({
  selector: 'Ventainterna',
  templateUrl: './ventainterna.html',
  styleUrls: ['./ventainterna.css'],
})
export class Ventainterna implements OnInit, OnDestroy {
  @ViewChild('inputCodmerc') inputCodmerc!: ElementRef; // Para manejar el foco
  @ViewChild('descripcionInput') descripcionInput!: ElementRef; // Para manejar el foco
  @ViewChild('Tabladetalle') Tabladetalle!: ElementRef;
  totalItems = 0;
  pageSize = 12;
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
  tituloModalVentainterna!: string;
  formularioVentainterna!: FormGroup;
  formulariodetVentainterna!: FormGroup;
  modoedicionVentainterna: boolean = false;
  ventainternaid!: string;
  modoconsultaVentainterna: boolean = false;
  ventainternaList: VentainternaModelData[] = [];
  detVentainternaList: detVentainternaData[] = [];
  selectedVentainterna: any = null;
  items: interfaceDetalleModel[] = [];
  totalGral: number = 0;
  totalItbis: number = 0;
  subTotal: number = 0;
  static detVentainterna: detVentainternaData[];
  codmerc: string = '';
  descripcionmerc: string = '';
  cantidadmerc: number = 0;
  preciomerc: number = 0;
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
  private originalVentainterna: VentainternaModelData | null = null;

  private codigoSubject = new BehaviorSubject<string>('');
  private nomclienteSubject = new BehaviorSubject<string>('');

  isDisabled: boolean = true;
  form: FormGroup;
  constructor(
    private fb: FormBuilder,
    private servicioVentainterna: ServicioVentainterna,
    private servicioSucursal: ServicioSucursal,
    private servicioEmpresa: ServicioEmpresa,
    private servicioInventario: ServicioInventario,
    private ServicioUsuario: ServicioUsuario,
    private printing: PrintingService,
    private solicitudPrestamoService: SolicitudPrestamoService,
    private servicioProducto: ServicioProducto
  ) {
    this.form = this.fb.group({
      fa_codvend: ['', Validators.required], // El campo es requerido
      // Otros campos...
    });

    this.crearFormularioVentainterna();
    console.log(this.formularioVentainterna.value);

    this.nomclienteSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((nomcliente) => {
          const trimmed = (nomcliente || '').toString().trim().toUpperCase();
          this.txtdescripcion = trimmed;
          if (trimmed.length > 0) {
            // Usa la ruta específica de cliente
            this.currentPage = 1;
            return this.servicioVentainterna.buscarVentainternaPorNombreCliente(trimmed);
          }
          // Sin valor: vuelve a la lista paginada sin filtros
          this.currentPage = 1;
          return this.servicioVentainterna.buscarTodasVentainterna(
            this.currentPage,
            this.pageSize
          );
        })
      )
      .subscribe((response) => {
        const data = response?.data;
        if (Array.isArray(data)) {
          this.ventainternaList = data;
          this.totalItems = response?.pagination?.total ?? data.length;
          this.currentPage = response?.pagination?.page ?? 1;
        } else if (data) {
          this.ventainternaList = [data];
          this.totalItems = this.ventainternaList.length;
          this.currentPage = 1;
        } else {
          this.ventainternaList = [];
          this.totalItems = 0;
          this.currentPage = 1;
        }
      });
    // (removida suscripción previa de nomcliente; ahora usamos la ruta específica de cliente)


    // Filtro reactivo por número (código) - usa lista con filtro "codigo"
      this.codigoBuscar
        .pipe(
          debounceTime(500),
          distinctUntilChanged(),
          switchMap((codigo) => {
            const trimmed = (codigo || '').toString().trim().toUpperCase();
            this.codigo = trimmed;
            if (trimmed.length > 0) {
              // Reinicia a la primera página al filtrar
              this.currentPage = 1;
              return this.servicioVentainterna.buscarVentainterna(
                this.currentPage,
                this.pageSize,
                this.codigo,
                this.txtdescripcion,
                this.fecha
              );
            }
            // Sin valor: vuelve a la lista paginada sin filtros
            this.currentPage = 1;
            return this.servicioVentainterna.buscarTodasVentainterna(
              this.currentPage,
              this.pageSize
            );
          })
        )
        .subscribe((response) => {
          const data = response?.data ?? [];
          this.ventainternaList = Array.isArray(data) ? data : [];
          this.totalItems = response?.pagination?.total ?? this.ventainternaList.length;
          this.currentPage = response?.pagination?.page ?? 1;
        });
    // (removed duplicate codigoBuscar subscription after adding exact-number search)

    // Filtro reactivo por fecha
    this.fechaBuscar
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((fecha) => {
          this.fecha = fecha;
          return this.servicioVentainterna.buscarVentainterna(
            this.currentPage,
            this.pageSize,
            this.codigo,
            this.txtdescripcion,
            this.fecha
          );
        })
      )
      .subscribe((response) => {
        this.ventainternaList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = response.pagination.page;
      });
  }
  imprimirVentainterna(ventainterna: VentainternaModelData): void {
    const fa: any = {
      ...ventainterna,
      fa_empresaCliente: this.empresaDeSucursalVenta(ventainterna),
    };
    this.servicioVentainterna.buscarVentainternaDetalle(fa.fa_codFact).subscribe((response) => {
      const raw = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : (Array.isArray(response?.detalle) ? response.detalle : []));
      const items = raw.map((d: any) => {
        const cantidad = Number(d.df_canMerc ?? d.df_canmerc ?? d.DF_CANMERC ?? d.dc_canmerc ?? d.DC_CANMERC ?? d.cantidad ?? 0);
        const precio = Number(d.df_preMerc ?? d.df_premerc ?? d.DF_PREMERC ?? d.dc_premerc ?? d.DC_PREMERC ?? d.precio ?? 0);
        const totalItem = Number(cantidad * precio);
        const des = d.df_desMerc ?? d.df_desmerc ?? d.DF_DESMERC ?? d.dc_descrip ?? d.DC_DESCRIP ?? d.in_desmerc ?? '';
        return { df_canPend: cantidad, df_desMerc: des, df_valMerc: totalItem, df_preMerc: precio };
   

      });
      this.printing.imprimirVentainterna80mm(fa, items);
    });
  }

  agregarVentainterna() {
    this.formularioVentainterna.disable();
  }

  crearformulariodetVentainterna() {
    this.formulariodetVentainterna = this.fb.group({
      df_codFact: [''],
      df_codMerc: [''],
      df_desMerc: [''],
      df_canmerc: [''],
      df_preMerc: [''],
      df_valMerc: [''],
      df_unidad: [''],
      df_cosMerc: [''],
      dF_codClie: [''],
      df_status: [''],
    });
  }
  @ViewChild('buscarcodmercInput') buscarcodmercElement!: ElementRef;
  buscarNombre = new FormControl();
  buscarSucursalCliente = new FormControl();
  resultadoNombre: SucursalesData[] = [];
  resultadoEmpresas: any[] = [];
  resultadoSucursalCliente: SucursalesData[] = [];
  resultadoSolicitud: any[] = [];
  selectedIndexSolicitud: number = 0;
  solicitudSeleccionadaCargada: any = null;
  private _cargandoSolicitudDetalle: boolean = false;
  private solicitudSearchSequence = 0;
  private _enterManejandoFoco: boolean = false;
  sucursalesCliente: SucursalesData[] = [];
  sucursalesEmpresa: SucursalesData[] = [];
  empresasCatalogo: EmpresaModelData[] = [];
  empresasAgrupadas: Array<{ cod_empre: string; nom_empre: string; sucursales: SucursalesData[] }> = [];
  nombreEmpresaPropietaria = '';
  mostrarSucursalCliente = false;
  empresaClienteSeleccionada: { cod_empre: string; nom_empre: string; sucursales: SucursalesData[] } | null = null;
  sucursalClienteSeleccionada: SucursalesData | null = null;
  selectedIndex = 1;
  selectedIndexEmpresa = 0;
  selectedIndexSucursalCliente = 0;
  buscarcodmerc = new FormControl();
  buscardescripcionmerc = new FormControl();
  // buscarcodmercElement = new FormControl();
  nativeElement = new FormControl();
  resultadoCodmerc: ModeloInventarioData[] = [];
  selectedIndexcodmerc = 1;
  resultadodescripcionmerc: ModeloInventarioData[] = [];
  selectedIndexcoddescripcionmerc = 1;
  seleccionarVentainterna(ventainterna: any) {
    this.selectedVentainterna = ventainterna;
  }

  ngOnInit(): void {
    document.addEventListener('keydown', this.capturarEnterMensaje, true);
    document.addEventListener('keydown', this.capturarEnterModalVentaInterna, true);
    this.buscarTodasVentainterna(1);
    this.cargarSucursalesEmpresa();
    this.buscarcodmerc.valueChanges
      .pipe(
        debounceTime(50),
        distinctUntilChanged(),
        tap(() => {
          this.resultadoCodmerc = [];
        }),
        filter(
          (query: string) =>
            query.trim() !== '' &&
            !this.cancelarBusquedaCodigo &&
            !this.isEditing
        ),
        switchMap((query: string) => {
          const q = query.trim().toUpperCase();
          return this.servicioInventario.buscarporCodigoMerc(q);
        })
      )
      .subscribe((results: ModeloInventario) => {
        console.log(results.data);
        if (results) {
          if (Array.isArray(results.data) && results.data.length) {
            // Ordenar por código
            this.resultadoCodmerc = results.data.sort((a, b) => {
              return a.in_codmerc.localeCompare(b.in_codmerc, undefined, {
                numeric: true,
                sensitivity: 'base',
              });
            });
            // Priorizar coincidencia exacta si existe
            const qUpper = String(this.buscarcodmerc.value || '').trim().toUpperCase();
            const exactIdx = this.resultadoCodmerc.findIndex((item) => String(item.in_codmerc || '').trim().toUpperCase() === qUpper);
            if (exactIdx >= 0) {
              // Solo selecciona el índice, espera Enter para cargar
              this.selectedIndexcodmerc = exactIdx;
            } else {
              // Seleccionar el primer elemento por defecto
              this.selectedIndexcodmerc = 0;
            }

            this.codnotfound = false;
          } else {
            this.codnotfound = true;
            return;
          }
        } else {
          this.resultadoCodmerc = [];
          this.codnotfound = false;

          console.log('paso blanco');
          return;
        }
      });

    this.buscardescripcionmerc.valueChanges
      .pipe(
        debounceTime(50),
        distinctUntilChanged(),
        tap(() => {
          this.resultadodescripcionmerc = [];
        }),
        filter(
          (query: string) =>
            query.trim() !== '' && !this.cancelarBusquedaDescripcion && !this.isEditing
        ),
        switchMap((query: string) => {
          const q = query.trim().toUpperCase();
          return this.servicioInventario.buscarPorDescripcionMerc(q);
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
          console.log('2');
        }
      });
    this.buscarNombre.valueChanges
      .pipe(
        debounceTime(150),
        distinctUntilChanged(),
        tap(() => {
          this.resultadoNombre = [];
          this.resultadoEmpresas = [];
        }),
        filter((query: string) => String(query || '').trim() !== '')
      )
      .subscribe((query: string) => {
        const q = String(query || '').trim().toUpperCase();
        this.resultadoEmpresas = this.empresasAgrupadas
          .filter((emp) =>
            `${emp.nom_empre || ''} ${emp.cod_empre || ''}`.toUpperCase().includes(q)
          )
          .slice(0, 50);
        this.selectedIndexEmpresa = 0;
      });
    this.buscarSucursalCliente.valueChanges
      .pipe(
        debounceTime(150),
        distinctUntilChanged(),
        tap(() => {
          this.resultadoSucursalCliente = [];
        })
      )
      .subscribe((query: string) => {
        const q = String(query || '').trim().toUpperCase();
        const base = this.sucursalesCliente.slice();
        if (!q || !this.mostrarSucursalCliente) {
          this.resultadoSucursalCliente = base.slice(0, 200);
        } else {
          this.resultadoSucursalCliente = base.filter((sucursal) =>
            `${sucursal.nom_sucursal || ''} ${sucursal.cod_sucursal || ''}`
              .toUpperCase()
              .includes(q)
          );
        }
        this.selectedIndexSucursalCliente = 0;
      });
    this.formularioVentainterna.get('fa_solicitud')?.valueChanges
      .pipe(
        debounceTime(200),
        distinctUntilChanged()
      )
      .subscribe((query: string) => this.buscarSolicitudesVentaInterna(query));
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.capturarEnterMensaje, true);
    document.removeEventListener('keydown', this.capturarEnterModalVentaInterna, true);
  }

  private readonly capturarEnterMensaje = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' || !SweetAlert.isVisible()) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const botonAceptar = SweetAlert.getConfirmButton();
    if (botonAceptar) {
      botonAceptar.focus();
      SweetAlert.clickConfirm();
    }
  };

  private readonly capturarEnterModalVentaInterna = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter') return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const modal = target.closest('#modalventainterna') as HTMLElement | null;
    if (!modal) return;

    const isInput =
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
    if (!isInput) return;

    const tipo = (target as HTMLInputElement).type?.toLowerCase() || '';
    if (tipo === 'submit' || tipo === 'button' || tipo === 'reset') return;

    if (target.tagName === 'TEXTAREA') return;

    event.preventDefault();
    const idInput = String(target.getAttribute('id') || '').trim();

    const focoInicial = document.activeElement;
    this._enterManejandoFoco = true;

    const ejecutarAntesDeSaltar = (): boolean | Promise<boolean> => {
      if (idInput === 'inputEmpresa' || idInput === 'input1') {
        const proxNombre = String(this.buscarNombre.value || '').trim();
        if (proxNombre) {
          const resultado = this.resultadoEmpresas?.[this.selectedIndexEmpresa] ?? null;
          if (resultado) {
            this.cargarDatosEmpresaCliente(resultado);
            return false;
          }
          const porNom = this.empresasAgrupadas.find(e =>
            String(e?.nom_empre || '').trim().toUpperCase() === proxNombre.toUpperCase() ||
            String(e?.cod_empre || '').trim().toUpperCase() === proxNombre.toUpperCase()
          );
          if (porNom) {
            this.cargarDatosEmpresaCliente(porNom);
            return false;
          }
        }
        return true;
      }
      if (idInput === 'inputSucursalCliente') {
        const q = String(this.buscarSucursalCliente.value || '').trim();
        if (q) {
          const resultado = this.resultadoSucursalCliente?.[this.selectedIndexSucursalCliente] ?? null;
          if (resultado) {
            this.cargarSucursalCliente(resultado as any);
            return false;
          }
          const porNom = this.sucursalesCliente.find(s =>
            String(s?.nom_sucursal || '').trim().toUpperCase() === q.toUpperCase() ||
            String(s?.cod_sucursal || '').trim() === q
          );
          if (porNom) {
            this.cargarSucursalCliente(porNom as any);
            return false;
          }
          if (this.sucursalesCliente.length === 1) {
            this.cargarSucursalCliente(this.sucursalesCliente[0] as any);
            return false;
          }
        }
        return true;
      }
      if (idInput === 'inputNoSolicitud' || idInput === 'input2') {
        const q = String(this.formularioVentainterna.get('fa_solicitud')?.value || '').trim();
        if (q && this.resultadoSolicitud?.length) {
          const idx = Number.isFinite(this.selectedIndexSolicitud) ? this.selectedIndexSolicitud : 0;
          const sel = this.resultadoSolicitud[idx] ?? this.resultadoSolicitud[0];
          if (sel) {
            this.cargarSolicitudVentaInterna(sel);
            return false;
          }
        }
        return true;
      }
      if (idInput === 'input3') {
        const siguiente = document.getElementById('input5') as HTMLInputElement | null;
        this.buscarUsuario(event, siguiente);
        return false;
      }
      if (idInput === 'input4') {
        const q = String(this.buscarcodmerc.value || this.codmerc || '').trim();
        const idx = Number.isFinite(this.selectedIndexcodmerc) ? this.selectedIndexcodmerc : 0;
        const sel = this.resultadoCodmerc?.[idx] ?? null;
        if (sel) {
          this.cargarDatosInventario(sel);
          return false;
        }
        const buscoDesc = this.resultadodescripcionmerc?.find(p =>
          String(p?.in_codmerc || '').trim().toUpperCase() === q.toUpperCase() ||
          String(p?.in_desmerc || '').trim().toUpperCase() === q.toUpperCase()
        );
        if (buscoDesc) {
          this.cargarDatosInventario(buscoDesc);
          return false;
        }
        if (q) {
          const porCod = (this.resultadoCodmerc || []).find(p =>
            String(p?.in_codmerc || '').trim().toUpperCase() === q.toUpperCase()
          );
          if (porCod) {
            this.cargarDatosInventario(porCod);
            return false;
          }
        }
        return true;
      }
      if (idInput === 'input5') {
        const q = String(this.buscardescripcionmerc.value || this.descripcionmerc || '').trim();
        const idx = Number.isFinite(this.selectedIndexcoddescripcionmerc) ? this.selectedIndexcoddescripcionmerc : 0;
        const sel = this.resultadodescripcionmerc?.[idx] ?? null;
        if (sel) {
          this.cargarDatosInventario(sel);
          return false;
        }
        if (q) {
          const busco = (this.resultadodescripcionmerc || this.resultadoCodmerc || []).find(p =>
            String(p?.in_desmerc || '').trim().toUpperCase() === q.toUpperCase() ||
            String(p?.in_codmerc || '').trim().toUpperCase() === q.toUpperCase()
          );
          if (busco) {
            this.cargarDatosInventario(busco);
            return false;
          }
        }
        return true;
      }
      if (idInput === 'input6') {
        return true;
      }
      if (idInput === 'input7') {
        this.agregaItem(event);
        return true;
      }
      return true;
    };

    const saltar = () => {
      setTimeout(() => {
        try {
          const focoCambio = document.activeElement;
          const elInicial = (focoInicial as HTMLElement | null)?.getAttribute('id') ||
            (focoInicial as HTMLElement | null)?.tagName || '__none__';
          const elAhora = (focoCambio as HTMLElement | null)?.getAttribute('id') ||
            (focoCambio as HTMLElement | null)?.tagName || '__none__';
          if (focoCambio && focoCambio !== focoInicial && elInicial !== elAhora) {
            return;
          }
          this.enfocarSiguienteEnModal(modal, target as HTMLElement);
        } finally {
          this._enterManejandoFoco = false;
        }
      }, 30);
    };

    try {
      const r = ejecutarAntesDeSaltar();
      if (typeof r === 'object' && r != null && typeof (r as any).then === 'function') {
        (r as Promise<boolean>).then(() => saltar(), () => saltar());
      } else {
        saltar();
      }
    } catch {
      saltar();
    }
  };

  private enfocarSiguienteEnModal(root: HTMLElement, current: HTMLElement): void {
    const SELECTOR = [
      'input:not([disabled]):not([type="hidden"]):not([readonly])',
      'select:not([disabled])',
      'textarea:not([disabled]):not([readonly])',
      'button:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const candidatos = Array.from(root.querySelectorAll<HTMLElement>(SELECTOR)).filter((el) => {
      if (!el.offsetParent && el !== document.activeElement) {
        if (el.style.display === 'none' || (el as HTMLElement).hidden) return false;
      }
      return !el.hasAttribute('disabled');
    });

    const pos = candidatos.indexOf(current);
    if (pos < 0) {
      const primero = candidatos[0];
      if (primero) this.enfocarElemento(primero);
      return;
    }
    const siguiente = candidatos[pos + 1] || candidatos[0];
    if (siguiente) this.enfocarElemento(siguiente);
  }

  private enfocarElemento(el: HTMLElement): void {
    setTimeout(() => {
      try {
        el.focus({ preventScroll: false });
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          (el as HTMLInputElement).select();
        }
      } catch {}
    }, 0);
  }

  crearFormularioVentainterna() {
    const fechaActual = new Date();
    const fechaActualStr = this.formatofecha(fechaActual);
    this.formularioVentainterna = this.fb.group({
      fa_codFact: [{ value: '', disabled: true }],
      fa_fecFact: [{ value: fechaActualStr, disabled: true }],
      fa_valFact: [''],
      fa_codClie: [''],
      fa_nomClie: [''],
      suculsar_clie: [''],
      fa_codVend: ['', Validators.required],
      fa_nomVend: [''],
      fa_solicitud: [''],
    });

    console.log(this.formularioVentainterna.value);
  }
  habilitarFormularioVentainterna() {
    this.habilitarFormulario = false;
  }

  nuevaVentainterna() {
    this.modoedicionVentainterna = false;
    this.modoconsultaVentainterna = false;
    this.ventainternaid = '';
    this.originalVentainterna = null;
    this.tituloModalVentainterna = 'Nueva Ventainterna';
    this.resultadoNombre = [];
    this.resultadoSucursalCliente = [];
    this.sucursalesCliente = [];
    this.mostrarSucursalCliente = false;
    this.empresaClienteSeleccionada = null;
    this.sucursalClienteSeleccionada = null;
    this.solicitudSeleccionadaCargada = null;
    this.resultadoSolicitud = [];
    this.nombreEmpresaPropietaria = '';
    this.buscarNombre.setValue('', { emitEvent: false });
    this.buscarSucursalCliente.setValue('', { emitEvent: false });

    this.crearFormularioVentainterna();

    $('#modalventainterna').modal('show');
    this.habilitarFormulario = true;
    this.formularioVentainterna.get('fa_codFact')!.disable();
    this.formularioVentainterna.get('fa_fecFact')!.disable();
    this.formularioVentainterna.get('fa_codVend')!.enable({ emitEvent: false });
    this.formularioVentainterna.get('fa_nomVend')!.disable({ emitEvent: false });
    setTimeout(() => {
      this.resultadoSolicitud = [];
      this.selectedIndexSolicitud = 0;
      const codVendInput = document.getElementById('input3') as HTMLInputElement | null;
      if (codVendInput) { codVendInput.focus(); codVendInput.select(); }
      else {
        const empresaInput = document.getElementById('input2') as HTMLInputElement | null;
        if (empresaInput) { empresaInput.focus(); empresaInput.select(); }
        else { $('#input1').focus(); }
      }
    }, 500);
  }

  cerrarModalVentainterna() {
    this.habilitarFormulario = false;
    this.formularioVentainterna.reset();
    this.resultadoNombre = [];
    this.resultadoSucursalCliente = [];
    this.sucursalesCliente = [];
    this.mostrarSucursalCliente = false;
    this.empresaClienteSeleccionada = null;
    this.buscarNombre.setValue('', { emitEvent: false });
    this.buscarSucursalCliente.setValue('', { emitEvent: false });
    this.modoedicionVentainterna = false;
    this.modoconsultaVentainterna = false;
    this.mensagePantalla = false;
    $('#modalventainterna').modal('hide');
    this.crearFormularioVentainterna();
    this.buscarTodasVentainterna(1);
    this.limpiarTabla();
    this.limpiarCampos();
    this.habilitarIcono = true;
    const inputs = document.querySelectorAll('.seccion-productos input');
    inputs.forEach((input) => {
      (input as HTMLInputElement).disabled = false;
    });
  }

  editardetVentainterna(detventainterna: detVentainternaData) {
    this.ventainternaid = detventainterna.df_codFact;
  }
  editarVentainterna(Ventainterna: VentainternaModelData) {
    this.ventainternaid = Ventainterna.fa_codFact;
    this.modoedicionVentainterna = true;
    this.modoconsultaVentainterna = false;
    this.originalVentainterna = Ventainterna;
    this.formularioVentainterna.patchValue(Ventainterna);
    this.buscarNombre.setValue(Ventainterna.fa_nomClie || '', { emitEvent: false });
    this.buscarSucursalCliente.setValue(Ventainterna.suculsar_clie || '', { emitEvent: false });
    const { empresa, sucursal } = this._restaurarSeleccionPorSucursalId(Ventainterna.fa_codClie);
    if (empresa) {
      this.empresaClienteSeleccionada = empresa;
      this.sucursalesCliente = (empresa.sucursales || []).slice().sort((a, b) =>
        String(a.nom_sucursal || '').localeCompare(String(b.nom_sucursal || ''), undefined, { numeric: true, sensitivity: 'base' })
      );
      this.sucursalClienteSeleccionada = sucursal;
      this.mostrarSucursalCliente = this.sucursalesCliente.length > 1;
      this.nombreEmpresaPropietaria = empresa.nom_empre || '';
      this.buscarNombre.setValue(empresa.nom_empre || '', { emitEvent: false });
      this.buscarSucursalCliente.setValue(Ventainterna.suculsar_clie || sucursal?.nom_sucursal || '', { emitEvent: false });
    } else {
      this.empresaClienteSeleccionada = null;
      this.sucursalClienteSeleccionada = null;
      this.sucursalesCliente = [];
      this.mostrarSucursalCliente = !!Ventainterna.suculsar_clie;
      this.nombreEmpresaPropietaria = this.empresaDeSucursalVenta(Ventainterna);
    }
    this.tituloModalVentainterna = 'Editando Ventainterna';
    $('#modalventainterna').modal('show');
    this.habilitarFormulario = true;
    this.formularioVentainterna.get('fa_codFact')?.disable();
    this.formularioVentainterna.get('fa_fecFact')?.disable();
    this.formularioVentainterna.get('fa_codVend')?.disable();
    setTimeout(() => { $('#input1').focus(); }, 300);
    // Limpiar los items antes de agregar los nuevos
    this.items = [];
    this.servicioVentainterna
      .buscarVentainternaDetalle(Ventainterna.fa_codFact)
      .subscribe((response) => {
        let subtotal = 0;
        const data = Array.isArray(response?.data)
          ? response.data
          : (Array.isArray(response) ? response : (Array.isArray(response?.detalle) ? response.detalle : []));
        data.forEach((d: any) => {
          const cod = d.df_codMerc ?? d.df_codmerc ?? d.DF_CODMERC ?? d.dc_codmerc ?? d.DC_CODMERC ?? d.in_codmerc ?? '';
          const des = d.df_desMerc ?? d.df_desmerc ?? d.DF_DESMERC ?? d.dc_descrip ?? d.DC_DESCRIP ?? d.in_desmerc ?? '';
          const cantidad = Number(d.df_canMerc ?? d.df_canmerc ?? d.DF_CANMERC ?? d.dc_canmerc ?? d.DC_CANMERC ?? d.cantidad ?? 0);
          const precio = Number(d.df_preMerc ?? d.df_premerc ?? d.DF_PREMERC ?? d.dc_premerc ?? d.DC_PREMERC ?? d.precio ?? 0);
          const totalItem = Number(d.df_valMerc ?? d.df_valmerc ?? d.DF_VALMERC ?? d.dc_total ?? d.DC_TOTAL ?? (cantidad * precio));
          const producto: ModeloInventarioData = {
            in_codmerc: cod,
            in_desmerc: des,
            in_grumerc: '',
            in_tipoproduct: '',
            in_canmerc: 0,
            in_caninve: 0,
            in_fecinve: null,
            in_eximini: 0,
            in_cosmerc: 0,
            in_premerc: 0,
            in_precmin: 0,
            in_costpro: 0,
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
          this.items.push({ producto, cantidad, precio, total: totalItem });
          subtotal += totalItem;
        });
        this.subTotal = subtotal;
        this.totalGral = subtotal;
        this.initTooltips();
      });
  }
 
  refrescarVentainterna(): void {
    this.limpiarTabla();
    this.totalItbis = 0;
    this.limpiarCampos();

    this.codnotfound = false;
    this.desnotfound = false;
    this.codmerVacio = false;
    this.desmerVacio = false;
    this.mensagePantalla = false;

    this.resultadoCodmerc = [];
    this.resultadodescripcionmerc = [];
    this.resultadoNombre = [];
    this.resultadoEmpresas = [];
    this.resultadoSucursalCliente = [];
    this.resultadoSolicitud = [];
    this.buscarcodmerc.setValue('', { emitEvent: false });
    this.buscardescripcionmerc.setValue('', { emitEvent: false });
    this.buscarNombre.setValue('', { emitEvent: false });
    this.buscarSucursalCliente.setValue('', { emitEvent: false });

    this.sucursalesCliente = [];
    this.mostrarSucursalCliente = false;
    this.empresaClienteSeleccionada = null;
    this.sucursalClienteSeleccionada = null;
    this.nombreEmpresaPropietaria = '';
    this.cancelarBusquedaCodigo = false;
    this.cancelarBusquedaDescripcion = false;

    this.selectedIndex = 1;
    this.selectedIndexEmpresa = 0;
    this.selectedIndexSucursalCliente = 0;
    this.selectedIndexcodmerc = 1;
    this.selectedIndexcoddescripcionmerc = 1;
    this.isEditing = false;
    this.itemToEdit = null;
    this.productoselect = null as any;

    this.crearFormularioVentainterna();
    this.formularioVentainterna.get('fa_codFact')?.disable();
    this.formularioVentainterna.get('fa_fecFact')?.disable();

    const base = this.originalVentainterna;
    if (base) {
      this.formularioVentainterna.patchValue(base, { emitEvent: false });
      this.buscarNombre.setValue(base.fa_nomClie || '', { emitEvent: false });
      this.buscarSucursalCliente.setValue(base.suculsar_clie || '', { emitEvent: false });
      const { empresa, sucursal } = this._restaurarSeleccionPorSucursalId(base.fa_codClie);
      if (empresa) {
        this.empresaClienteSeleccionada = empresa;
        this.sucursalesCliente = (empresa.sucursales || []).slice().sort((a, b) =>
          String(a.nom_sucursal || '').localeCompare(String(b.nom_sucursal || ''), undefined, { numeric: true, sensitivity: 'base' })
        );
        this.sucursalClienteSeleccionada = sucursal;
        this.mostrarSucursalCliente = this.sucursalesCliente.length > 1;
        this.nombreEmpresaPropietaria = empresa.nom_empre || '';
        this.buscarNombre.setValue(empresa.nom_empre || '', { emitEvent: false });
        this.buscarSucursalCliente.setValue(base.suculsar_clie || sucursal?.nom_sucursal || '', { emitEvent: false });
      } else {
        this.mostrarSucursalCliente = !!base.suculsar_clie;
      }

      if (this.modoedicionVentainterna) {
        this.formularioVentainterna.get('fa_codFact')?.disable();
        this.formularioVentainterna.get('fa_fecFact')?.disable();
        this.formularioVentainterna.get('fa_codVend')?.disable();
      } else if (this.modoconsultaVentainterna) {
        this.formularioVentainterna.disable({ emitEvent: false });
      } else {
        this.formularioVentainterna.get('fa_nomVend')?.disable();
      }

      this.servicioVentainterna.buscarVentainternaDetalle(base.fa_codFact).subscribe((response) => {
        let subtotal = 0;
        const data = Array.isArray(response?.data)
          ? response.data
          : (Array.isArray(response) ? response : (Array.isArray(response?.detalle) ? response.detalle : []));
        data.forEach((d: any) => {
          const cod = d.df_codMerc ?? d.df_codmerc ?? d.DF_CODMERC ?? d.dc_codmerc ?? d.DC_CODMERC ?? d.in_codmerc ?? '';
          const des = d.df_desMerc ?? d.df_desmerc ?? d.DF_DESMERC ?? d.dc_descrip ?? d.DC_DESCRIP ?? d.in_desmerc ?? '';
          const cantidad = Number(d.df_canMerc ?? d.df_canmerc ?? d.DF_CANMERC ?? d.dc_canmerc ?? d.DC_CANMERC ?? d.cantidad ?? 0);
          const precio = Number(d.df_preMerc ?? d.df_premerc ?? d.DF_PREMERC ?? d.dc_premerc ?? d.DC_PREMERC ?? d.precio ?? 0);
          const totalItem = Number(d.df_valMerc ?? d.df_valmerc ?? d.DF_VALMERC ?? d.dc_total ?? d.DC_TOTAL ?? (cantidad * precio));
          const producto: ModeloInventarioData = {
            in_codmerc: cod, in_desmerc: des, in_grumerc: '', in_tipoproduct: '', in_canmerc: 0,
            in_caninve: 0, in_fecinve: null, in_eximini: 0, in_cosmerc: 0, in_premerc: 0,
            in_precmin: 0, in_costpro: 0, in_ucosto: 0, in_porgana: 0, in_peso: 0, in_longitud: 0,
            in_unidad: 0, in_medida: 0, in_longitu: 0, in_fecmodif: null, in_amacen: 0, in_imagen: '',
            in_status: '', in_itbis: false, in_minvent: 0,
          };
          this.items.push({ producto, cantidad, precio, total: totalItem });
          subtotal += totalItem;
        });
        this.subTotal = subtotal;
        this.totalGral = subtotal;
        this.initTooltips();
      });
    } else {
      this.formularioVentainterna.patchValue({
        fa_codVend: '',
        fa_nomVend: '',
      }, { emitEvent: false });
      this.formularioVentainterna.get('fa_codVend')?.enable({ emitEvent: false });
      this.formularioVentainterna.get('fa_nomVend')?.disable({ emitEvent: false });
      this.tituloModalVentainterna = 'Nueva Ventainterna';
      this.modoedicionVentainterna = false;
      this.modoconsultaVentainterna = false;
      this.habilitarIcono = true;
      this.solicitudSeleccionadaCargada = null;
      this.resultadoSolicitud = [];
      this.selectedIndexSolicitud = 0;
    }

    setTimeout(() => {
      const modal = document.getElementById('modalventainterna');
      const inputs = modal?.querySelectorAll('.seccion-productos input') as NodeListOf<HTMLInputElement> | undefined;
      inputs?.forEach((input) => { input.disabled = this.modoconsultaVentainterna; });
      try {
        const empresaInput = document.getElementById('input2') as HTMLInputElement | null;
        if (empresaInput) {
          empresaInput.scrollIntoView({ block: 'nearest' });
          empresaInput.focus({ preventScroll: false });
          empresaInput.select();
        } else {
          $('#input1').focus();
        }
      } catch {}
    }, 280);
  }
  private initTooltips(): void {
    const elements = Array.prototype.slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const b = (window as any).bootstrap;
    if (b && b.Tooltip) {
      elements.forEach((el: any) => new b.Tooltip(el));
    }
  }

  buscarTodasVentainterna(page: number) {
    this.servicioVentainterna
      .buscarTodasVentainterna(page, this.pageSize)
      .subscribe({
        next: (response) => {
          const data = Array.isArray(response?.data) ? response.data : [];
          this.ventainternaList = data;
          this.totalItems = Number(response?.pagination?.total ?? data.length);
          this.currentPage = Number(response?.pagination?.page ?? page);
          this.initTooltips();
        },
        error: (error) => {
          console.error('[Ventainterna] No se pudo cargar el listado', error);
          this.ventainternaList = [];
          this.totalItems = 0;
          Swal.fire({
            title: 'Error cargando ventas internas',
            text: error?.message || error?.error?.message || 'No se pudo consultar la tabla de ventas internas.',
            icon: 'error',
            confirmButtonText: 'Aceptar',
          });
        },
      });
  }
  consultarVentainterna(Ventainterna: VentainternaModelData) {
    this.modoedicionVentainterna = false;
    this.modoconsultaVentainterna = true;
    this.ventainternaid = Ventainterna.fa_codFact;
    this.originalVentainterna = Ventainterna;
    this.formularioVentainterna.enable({ emitEvent: false });
    this.formularioVentainterna.patchValue(Ventainterna);
    this.buscarNombre.setValue(Ventainterna.fa_nomClie || '', { emitEvent: false });
    this.buscarSucursalCliente.setValue(Ventainterna.suculsar_clie || '', { emitEvent: false });
    const { empresa, sucursal } = this._restaurarSeleccionPorSucursalId(Ventainterna.fa_codClie);
    if (empresa) {
      this.empresaClienteSeleccionada = empresa;
      this.sucursalesCliente = (empresa.sucursales || []).slice().sort((a, b) =>
        String(a.nom_sucursal || '').localeCompare(String(b.nom_sucursal || ''), undefined, { numeric: true, sensitivity: 'base' })
      );
      this.sucursalClienteSeleccionada = sucursal;
      this.mostrarSucursalCliente = this.sucursalesCliente.length > 1;
      this.nombreEmpresaPropietaria = empresa.nom_empre || '';
      this.buscarNombre.setValue(empresa.nom_empre || '', { emitEvent: false });
      this.buscarSucursalCliente.setValue(Ventainterna.suculsar_clie || sucursal?.nom_sucursal || '', { emitEvent: false });
    } else {
      this.empresaClienteSeleccionada = null;
      this.sucursalClienteSeleccionada = null;
      this.sucursalesCliente = [];
      this.mostrarSucursalCliente = !!Ventainterna.suculsar_clie;
      this.nombreEmpresaPropietaria = this.empresaDeSucursalVenta(Ventainterna);
    }
    this.tituloModalVentainterna = 'Consulta Ventainterna';
    $('#modalventainterna').modal('show');
    this.habilitarFormulario = true;
    this.formularioVentainterna.disable();
    this.habilitarIcono = false;
    setTimeout(() => { $('#input1').focus(); }, 300);

    const inputs = document.querySelectorAll('.seccion-productos input');
    inputs.forEach((input) => {
      (input as HTMLInputElement).disabled = true;
    });

    // Limpiar los items antes de agregar los nuevos
    this.items = [];

    this.servicioVentainterna
      .buscarVentainternaDetalle(Ventainterna.fa_codFact)
      .subscribe((response) => {
        let subtotal = 0;
        let totalGeneral = 0;
        const data = Array.isArray(response?.data)
          ? response.data
          : (Array.isArray(response) ? response : (Array.isArray(response?.detalle) ? response.detalle : []));

        data.forEach((d: any) => {
          const cod = d.df_codMerc ?? d.df_codmerc ?? d.DF_CODMERC ?? d.dc_codmerc ?? d.DC_CODMERC ?? d.in_codmerc ?? '';
          const des = d.df_desMerc ?? d.df_desmerc ?? d.DF_DESMERC ?? d.dc_descrip ?? d.DC_DESCRIP ?? d.in_desmerc ?? '';
          const cantidad = Number(d.df_canMerc ?? d.df_canmerc ?? d.DF_CANMERC ?? d.dc_canmerc ?? d.DC_CANMERC ?? d.cantidad ?? 0);
          const precio = Number(d.df_preMerc ?? d.df_premerc ?? d.DF_PREMERC ?? d.dc_premerc ?? d.DC_PREMERC ?? d.precio ?? 0);
          const totalItem = Number(d.df_valMerc ?? d.df_valmerc ?? d.DF_VALMERC ?? d.dc_total ?? d.DC_TOTAL ?? (cantidad * precio));

          const producto: ModeloInventarioData = {
            in_codmerc: cod,
            in_desmerc: des,
            in_grumerc: '',
            in_tipoproduct: '',
            in_canmerc: 0,
            in_caninve: 0,
            in_fecinve: null,
            in_eximini: 0,
            in_cosmerc: 0,
            in_premerc: 0,
            in_precmin: 0,
            in_costpro: 0,
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

          this.items.push({
            producto,
            cantidad,
            precio,
            total: totalItem,
          });
          subtotal += totalItem;
        });

        totalGeneral = subtotal;
        this.subTotal = subtotal;
        this.totalGral = totalGeneral;
      });
  }

  eliminarVentainterna(VentainternaId: string) {
    Swal.fire({
      title: '¿Está seguro de eliminar este Ventainterna?',
      text: '¡No podrá revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si, eliminar!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.servicioVentainterna
          .eliminarVentainterna(VentainternaId)
          .subscribe((response) => {
            Swal.fire({
              title: 'Excelente!',
              text: 'Empresa eliminado correctamente.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false,
            });
            this.buscarTodasVentainterna(this.currentPage);
          });
      }
    });
  }

  descripcionEntra(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.nomclienteSubject.next(inputElement.value.toUpperCase());
  }

  codigoEntra(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.codigoBuscar.next(inputElement.value.toUpperCase());
  }
  fechaEntra(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.fechaBuscar.next(inputElement.value.trim());
  }

  guardarVentainterna() {
    const date = new Date();
    this.formularioVentainterna.get('fa_valFact')?.patchValue(this.totalGral);
    this.formularioVentainterna.get('fa_nomVend')!.enable();
    if (!this.modoedicionVentainterna) {
      const codigoActual = String(this.formularioVentainterna.getRawValue().fa_codFact || '').trim();
      const fechaActual = String(this.formularioVentainterna.getRawValue().fa_fecFact || '').trim();
      if (!fechaActual) {
        this.formularioVentainterna.patchValue(
          { fa_fecFact: this.formatofecha(date) },
          { emitEvent: false, onlySelf: true }
        );
      }
      if (!codigoActual) {
        this.formularioVentainterna.patchValue(
          { fa_codFact: '' },
          { emitEvent: false, onlySelf: true }
        );
      }
    }

    if (!this.items.length) {
      Swal.fire({
        title: 'Faltan productos',
        text: 'Debe agregar al menos un producto antes de guardar la venta interna.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    const sucObjRaw = localStorage.getItem('sucursal');
    const empObjRaw = localStorage.getItem('empresa');
    let sucursalId: number | undefined = undefined;
    let codEmpresa: string | undefined = undefined;
    try {
      if (sucObjRaw && sucObjRaw !== '[object Object]') {
        const s = JSON.parse(sucObjRaw);
        const suc = Array.isArray(s) ? s[0] : s;
        sucursalId = Number(suc?.cod_sucursal);
      }
    } catch {}
    if (!sucursalId || isNaN(sucursalId)) {
      const idS = Number(localStorage.getItem('idSucursal'));
      sucursalId = isNaN(idS) ? undefined : idS;
    }
    try {
      if (empObjRaw && empObjRaw !== '[object Object]') {
        const e = JSON.parse(empObjRaw);
        const emp = Array.isArray(e) ? e[0] : e;
        codEmpresa = String(emp?.cod_empre || '').trim() || undefined;
      }
    } catch {}
    if (!codEmpresa) {
      codEmpresa = (localStorage.getItem('codigoempresa') || localStorage.getItem('cod_empre') || '').trim() || undefined;
    }
    const codVendedor = String(this.formularioVentainterna.get('fa_codVend')?.value || '').trim();
    const nomVendedor = String(this.formularioVentainterna.get('fa_nomVend')?.value || '').trim();
    this.formularioVentainterna.patchValue({
      fa_codVend: codVendedor,
      fa_nomVend: nomVendedor,
    });

    const nombreEmpresaDigitada = String(
      this.buscarNombre.value || this.formularioVentainterna.get('fa_nomClie')?.value || ''
    ).trim();
    const sucursalClienteDigitada = String(
      this.buscarSucursalCliente.value || this.formularioVentainterna.get('suculsar_clie')?.value || ''
    ).trim();

    let empresaGrupo = this.empresaClienteSeleccionada;
    if (!empresaGrupo && nombreEmpresaDigitada) {
      const buscado = nombreEmpresaDigitada.trim().toUpperCase();
      empresaGrupo = this.empresasAgrupadas.find((emp) =>
        String(emp?.nom_empre || '').trim().toUpperCase() === buscado ||
        String(emp?.cod_empre || '').trim().toUpperCase() === buscado
      ) || null;
    }
    let sucursalParaGuardar: SucursalesData | null = this.sucursalClienteSeleccionada;
    if (empresaGrupo && !sucursalParaGuardar) {
      const buscado = sucursalClienteDigitada.trim().toUpperCase();
      if (buscado) {
        sucursalParaGuardar = empresaGrupo.sucursales.find((s) =>
          String(s?.nom_sucursal || '').trim().toUpperCase() === buscado ||
          String(s?.cod_sucursal || '').trim().toUpperCase() === buscado
        ) || null;
      }
      if (!sucursalParaGuardar && empresaGrupo.sucursales.length === 1) {
        sucursalParaGuardar = empresaGrupo.sucursales[0];
      }
      if (!sucursalParaGuardar) {
        const idGuardado = Number(this.formularioVentainterna.get('fa_codClie')?.value);
        if (isFinite(idGuardado) && idGuardado > 0) {
          sucursalParaGuardar =
            empresaGrupo.sucursales.find((s) => Number(s?.cod_sucursal) === idGuardado) ||
            this.sucursalesEmpresa.find((s) => Number(s?.cod_sucursal) === idGuardado) || null;
        }
      }
    }

    if (empresaGrupo) {
      this.empresaClienteSeleccionada = empresaGrupo;
      this.sucursalesCliente = empresaGrupo.sucursales;
      this.mostrarSucursalCliente = empresaGrupo.sucursales.length > 1;
      this.nombreEmpresaPropietaria = empresaGrupo.nom_empre || '';
      this.buscarNombre.setValue(empresaGrupo.nom_empre || '', { emitEvent: false });
      if (sucursalParaGuardar) {
        this.sucursalClienteSeleccionada = sucursalParaGuardar;
        this.formularioVentainterna.patchValue({
          fa_codClie: sucursalParaGuardar.cod_sucursal,
          fa_nomClie: sucursalParaGuardar.nom_sucursal,
          suculsar_clie: sucursalClienteDigitada || sucursalParaGuardar.nom_sucursal || '',
        });
        this.buscarSucursalCliente.setValue(sucursalClienteDigitada || sucursalParaGuardar.nom_sucursal || '', { emitEvent: false });
      } else {
        this.formularioVentainterna.patchValue({
          fa_codClie: empresaGrupo.sucursales[0]?.cod_sucursal || 0,
          fa_nomClie: empresaGrupo.sucursales[0]?.nom_sucursal || nombreEmpresaDigitada.toUpperCase(),
          suculsar_clie: sucursalClienteDigitada,
        });
      }
    } else if (nombreEmpresaDigitada) {
      this.empresaClienteSeleccionada = null;
      this.sucursalClienteSeleccionada = null;
      this.sucursalesCliente = [];
      this.mostrarSucursalCliente = false;
      this.formularioVentainterna.patchValue({
        fa_codClie: 0,
        fa_nomClie: nombreEmpresaDigitada.toUpperCase(),
        suculsar_clie: sucursalClienteDigitada || '',
      });
    }

    const base = this.formularioVentainterna.getRawValue();
    if (!String(base.fa_nomClie || '').trim()) {
      Swal.fire({
        title: 'Empresa requerida',
        text: 'Seleccione la empresa antes de guardar.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
      return;
    }
    if (this.mostrarSucursalCliente && !base.suculsar_clie) {
      Swal.fire({
        title: 'Sucursal requerida',
        text: 'Seleccione la sucursal de la empresa antes de guardar.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    const ventainternaExtendida: any = {
      ...base,
      fa_solicitud: String(base.fa_solicitud || '').trim() || null,
      fa_codVend: codVendedor || base.fa_codVend,
      fa_nomVend: nomVendedor || base.fa_nomVend,
      fa_codSucu: sucursalId,
      fa_codEmpr: codEmpresa
    };
    const payload = {
      ventainterna: ventainternaExtendida,
      detalle: this.items,
      idVentainterna: this.formularioVentainterna.get('fa_codFact')?.value,
    };

    const codigoOriginal = String(this.originalVentainterna?.fa_codFact || '').trim();
    const esEdicion = !this.modoconsultaVentainterna && !!codigoOriginal &&
      String(this.ventainternaid || '').trim() === codigoOriginal;

    if (this.formularioVentainterna.valid) {
      if (esEdicion) {
        const detallePayload = (this.items || []).map((it: any) => {
          const p: any = { ...(it?.producto || {}) };
          p.in_unidad = p?.in_unidad == null ? null : String(p.in_unidad);
          p.in_cosmerc = isFinite(Number(p?.in_cosmerc)) ? Number(p.in_cosmerc) : 0;
          return {
            total: isFinite(Number(it?.total)) ? Number(it.total) : (Number(it?.cantidad) * Number(it?.precio) || 0),
            cantidad: isFinite(Number(it?.cantidad)) ? Number(it.cantidad) : 0,
            precio: isFinite(Number(it?.precio)) ? Number(it.precio) : 0,
            producto: p,
          };
        });
        const baseEdit = this.formularioVentainterna.getRawValue();
        const ventainternaEditada: any = {
          ...baseEdit,
          fa_solicitud: String(baseEdit.fa_solicitud || '').trim() || null,
          fa_codVend: codVendedor || baseEdit.fa_codVend,
          fa_nomVend: nomVendedor || baseEdit.fa_nomVend,
          fa_codSucu: sucursalId,
          fa_codEmpr: codEmpresa,
        };
        const payloadEdit = {
          ventainterna: ventainternaEditada,
          detalle: detallePayload,
          idVentainterna: String(baseEdit.fa_codFact || ''),
        };
        this.servicioVentainterna
          .editarVentainterna(codigoOriginal, payloadEdit)
          .subscribe({
            next: (response) => {
              Swal.fire({
                title: 'Excelente!',
                text: 'Ventainterna Editada correctamente.',
                icon: 'success',
                timer: 2200,
                showConfirmButton: false,
              });
              this.formularioVentainterna.get('fa_codFact')?.disable({ emitEvent: false });
              this.formularioVentainterna.get('fa_fecFact')?.disable({ emitEvent: false });
              this.buscarTodasVentainterna(1);
              this.formularioVentainterna.disable({ emitEvent: false });
              setTimeout(() => this.cerrarModalVentainterna(), 250);
            },
            error: (err) => {
              this.formularioVentainterna.get('fa_codFact')?.disable({ emitEvent: false });
              this.formularioVentainterna.get('fa_fecFact')?.disable({ emitEvent: false });
              Swal.fire({
                title: 'Error guardando',
                text: err?.message || err?.error?.message || 'No se pudo guardar la venta interna.',
                icon: 'error',
                confirmButtonText: 'Aceptar',
              });
            },
          });
      } else {
        if (this.formularioVentainterna.valid) {
          const baseCreate = this.formularioVentainterna.getRawValue();
          const ventainternaNueva: any = {
            ...baseCreate,
            fa_solicitud: String(baseCreate.fa_solicitud || '').trim() || null,
            fa_codVend: codVendedor || baseCreate.fa_codVend,
            fa_nomVend: nomVendedor || baseCreate.fa_nomVend,
            fa_codSucu: sucursalId,
            fa_codEmpr: codEmpresa,
          };
          const payloadNuevo = {
            ventainterna: ventainternaNueva,
            detalle: this.items,
            idVentainterna: String(baseCreate.fa_codFact || ''),
          };
          this.servicioVentainterna
            .guardarVentainterna(payloadNuevo)
            .subscribe({
              next: (response) => {
                Swal.fire({
                  title: 'Excelente!',
                  text: 'Ventainterna creada correctamente.',
                  icon: 'success',
                  timer: 1400,
                  showConfirmButton: false,
                });
                this.formularioVentainterna.get('fa_codFact')?.disable({ emitEvent: false });
                this.formularioVentainterna.get('fa_fecFact')?.disable({ emitEvent: false });
                this.buscarTodasVentainterna(1);
                this.formularioVentainterna.disable({ emitEvent: false });
                setTimeout(() => {
                  this.originalVentainterna = null;
                  this.ventainternaid = '';
                  this.refrescarVentainterna();
                }, 200);
              },
              error: (err) => {
                this.formularioVentainterna.get('fa_codFact')?.disable({ emitEvent: false });
                this.formularioVentainterna.get('fa_fecFact')?.disable({ emitEvent: false });
                Swal.fire({
                  title: 'Error guardando',
                  text: err?.message || err?.error?.message || 'No se pudo guardar la venta interna.',
                  icon: 'error',
                  confirmButtonText: 'Aceptar',
                });
              },
            });
        } else {
          console.log(this.formularioVentainterna.value);
        }
      }
    } else {
      this.formularioVentainterna.markAllAsTouched();
      Swal.fire({
        title: 'Datos incompletos',
        text: 'Revise los campos requeridos antes de guardar.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
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
    this.servicioVentainterna
      .buscarTodasVentainterna(this.currentPage, this.pageSize)
      .subscribe((response) => {
        this.ventainternaList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = page;
        this.formularioVentainterna.reset();
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

    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );
  }
  limpiaBusqueda() {
    this.txtdescripcion = '';
    this.txtcodigo = '';
    this.txtfecha = '';
    this.buscarTodasVentainterna(1);
  }

  // Array para almacenar los datos de la tabla

  // Función para agregar un nuevo item a la tabla
  agregaItem(event: Event) {
    event.preventDefault();
    if (this.isEditing) {
      console.log('editando');
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
      if (
        !this.productoselect ||
        this.cantidadmerc <= 0 ||
        this.preciomerc <= 0
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
      const total = this.cantidadmerc * this.preciomerc;
      this.totalGral += total;
      const itbis = total * 0.18;
      this.totalItbis += itbis;
      this.subTotal += total;
      this.items.push({
        producto: this.productoselect,
        cantidad: this.cantidadmerc,
        precio: this.preciomerc,
        total,
      });

      this.cancelarBusquedaDescripcion = false;
      this.cancelarBusquedaCodigo = false;
    }
    this.limpiarCampos();
  }

  limpiarCampos() {
    this.productoselect;
    this.codmerc = '';
    this.descripcionmerc = '';
    this.preciomerc = 0;
    this.cantidadmerc = 0;
    this.isEditing = false;
  }

  limpiarTabla() {
    this.items = []; // Limpiar el array de items
    this.totalGral = 0; // Reiniciar el total general
    this.subTotal = 0; // Reiniciar el subtotal
  }
  // (Opcional) Función para eliminar un ítem de la tabla
  borarItem(item: any) {
    const index = this.items.indexOf(item);
    if (index > -1) {
      this.totalGral -= item.total;

      // Restar el subtotal del ítem eliminado
      this.subTotal -= item.total;

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
  }
  actualizarTotales() {
    this.totalGral = this.items.reduce((sum, item) => sum + item.total, 0);
    this.subTotal = this.items.reduce((sum, item) => sum + item.total, 0);
  }

  buscarPorCodigo(codigo: string) {}

  buscarClienteporNombre() {}

  cargarSucursalesEmpresa() {
    this.servicioEmpresa.buscarTodasEmpresa(1, 1000).subscribe({
      next: (response: any) => {
        this.empresasCatalogo = Array.isArray(response?.data) ? response.data : [];
        this._reconstruirEmpresasAgrupadas();
        if (this.empresaClienteSeleccionada) {
          this.nombreEmpresaPropietaria = this.empresaClienteSeleccionada.nom_empre || '';
        }
      },
      error: () => {
        this.empresasCatalogo = [];
        this._reconstruirEmpresasAgrupadas();
      },
    });
    this.servicioSucursal.buscarTodasSucursal().subscribe({
      next: (response: any) => {
        const data = response?.data;
        this.sucursalesEmpresa = Array.isArray(data) ? data : [];
        this._reconstruirEmpresasAgrupadas();
      },
      error: () => {
        this.sucursalesEmpresa = [];
        this._reconstruirEmpresasAgrupadas();
      },
    });
  }

  private _reconstruirEmpresasAgrupadas() {
    const mapCodEmpresa = new Map<string, { cod_empre: string; nom_empre: string; sucursales: SucursalesData[] }>();
    this.empresasCatalogo.forEach((emp) => {
      const cod = String((emp as any)?.cod_empre || '').trim().toUpperCase();
      if (!cod) return;
      if (!mapCodEmpresa.has(cod)) {
        mapCodEmpresa.set(cod, {
          cod_empre: String((emp as any)?.cod_empre || '').trim(),
          nom_empre: String((emp as any)?.nom_empre || cod).trim(),
          sucursales: [],
        });
      }
    });
    this.sucursalesEmpresa.forEach((suc) => {
      const cod = String(suc?.cod_empre || '').trim().toUpperCase();
      if (!cod) return;
      if (!mapCodEmpresa.has(cod)) {
        const nombreFallback = String((suc as any)?.nom_empre || this.obtenerNombreEmpresa(suc) || cod).trim();
        mapCodEmpresa.set(cod, {
          cod_empre: String(suc?.cod_empre || '').trim(),
          nom_empre: nombreFallback || cod,
          sucursales: [],
        });
      }
      mapCodEmpresa.get(cod)!.sucursales.push(suc);
    });
    this.empresasAgrupadas = Array.from(mapCodEmpresa.values()).sort((a, b) =>
      a.nom_empre.localeCompare(b.nom_empre, undefined, { numeric: true, sensitivity: 'base' })
    );
  }

  private _restaurarSeleccionPorSucursalId(codSucursal: any): {
    empresa: { cod_empre: string; nom_empre: string; sucursales: SucursalesData[] } | null;
    sucursal: SucursalesData | null;
  } {
    const id = Number(codSucursal);
    if (!isFinite(id) || !id) {
      return { empresa: null, sucursal: null };
    }
    const suc = this.sucursalesEmpresa.find((s) => Number(s?.cod_sucursal) === id) || null;
    if (!suc) {
      return { empresa: null, sucursal: null };
    }
    const codEmp = String(suc.cod_empre || '').trim().toUpperCase();
    let agrupada = this.empresasAgrupadas.find((e) => String(e.cod_empre || '').trim().toUpperCase() === codEmp);
    if (!agrupada) {
      agrupada = {
        cod_empre: String(suc.cod_empre || '').trim(),
        nom_empre: this.obtenerNombreEmpresa(suc) || String(suc.cod_empre || '').trim(),
        sucursales: [suc],
      };
    }
    return { empresa: agrupada, sucursal: suc };
  }

  obtenerNombreEmpresa(sucursal: SucursalesData | null | undefined): string {
    const codigo = String(sucursal?.cod_empre || '').trim().toUpperCase();
    if (!codigo) return '';
    const empresa = this.empresasCatalogo.find(
      (item) => String(item?.cod_empre || '').trim().toUpperCase() === codigo
    );
    return String(empresa?.nom_empre || codigo).trim();
  }

  private empresaDeSucursalVenta(venta: VentainternaModelData): string {
    const sucursal = this.sucursalesEmpresa.find(
      (item) => Number(item?.cod_sucursal) === Number(venta?.fa_codClie)
    );
    return this.obtenerNombreEmpresa(sucursal);
  }

  buscarSolicitudesVentaInterna(query: string) {
    const searchSequence = ++this.solicitudSearchSequence;
    const filtro = String(query || '').trim().toUpperCase();
    const sucursalLog = this.sucursalLogueada();
    const idSucursalLogueada = Number(sucursalLog?.id || 0);
    const idSucursalSeleccionada = this._obtenerIdSucursalClienteSeleccionada();

    if (
      !idSucursalLogueada || !Number.isFinite(idSucursalLogueada) || idSucursalLogueada <= 0 ||
      !idSucursalSeleccionada || !Number.isFinite(idSucursalSeleccionada) || idSucursalSeleccionada <= 0
    ) {
      this.resultadoSolicitud = [];
      this.selectedIndexSolicitud = 0;
      return;
    }

    const nombreSucursalSeleccionada = String(
      this.sucursalClienteSeleccionada?.nom_sucursal ||
      this.formularioVentainterna.get('suculsar_clie')?.value ||
      ''
    ).trim();

    this.solicitudPrestamoService
      .listarParaVentaInterna(
        idSucursalSeleccionada,
        idSucursalLogueada,
        nombreSucursalSeleccionada,
        filtro
      )
      .subscribe({
        next: (response: any) => {
          if (searchSequence !== this.solicitudSearchSequence) return;
          this.resultadoSolicitud = Array.isArray(response?.data) ? response.data : [];
          this.selectedIndexSolicitud = 0;
        },
        error: () => {
          if (searchSequence !== this.solicitudSearchSequence) return;
          this.resultadoSolicitud = [];
          this.selectedIndexSolicitud = 0;
        },
      });
  }

  private _obtenerIdSucursalClienteSeleccionada(): number | null {
    const porObj = Number(this.sucursalClienteSeleccionada?.cod_sucursal || 0);
    if (Number.isFinite(porObj) && porObj > 0) return porObj;
    if (this.empresaClienteSeleccionada?.sucursales?.length === 1) {
      const unico = Number(this.empresaClienteSeleccionada.sucursales[0].cod_sucursal || 0);
      return Number.isFinite(unico) && unico > 0 ? unico : null;
    }
    if ((this.empresaClienteSeleccionada?.sucursales?.length || 0) > 1) {
      return null;
    }
    const directo = Number(this.formularioVentainterna.get('fa_codClie')?.value || 0);
    if (Number.isFinite(directo) && directo > 0) return directo;
    return null;
  }

  private _obtenerSucursalOrigenParaSolicitudes(): number | null {
    return this._obtenerIdSucursalClienteSeleccionada();
  }

  cargarSolicitudVentaInterna(solicitud: any) {
    const numero = String(solicitud?.so_codsoli ?? solicitud?.so_numero ?? '').trim();
    this.resultadoSolicitud = [];
    this.solicitudSeleccionadaCargada = solicitud;
    this.formularioVentainterna.patchValue({ fa_solicitud: numero }, { emitEvent: false });
    this._cargarDetalleSolicitudYAgregarATabla(numero);
  }

  private _cargarDetalleSolicitudYAgregarATabla(numero: string): void {
    if (!numero || this._cargandoSolicitudDetalle) return;
    this._cargandoSolicitudDetalle = true;
    this.solicitudPrestamoService.buscar(numero).subscribe({
      next: (resp: any) => {
        try {
          const data = resp?.data;
          if (!data) return;
          const detalle: any[] = Array.isArray(data?.detsolicitud) ? data.detsolicitud : [];
          if (!detalle.length) {
            Swal.fire({
              icon: 'warning',
              title: 'Solicitud sin detalles',
              text: `La solicitud ${numero} no tiene líneas de productos que insertar.`,
              toast: true,
              position: 'top-end',
              timer: 1400,
              showConfirmButton: false,
            });
            return;
          }
          this._insertarDetalleSolicitudEnItems(detalle);
        } finally {
          this._cargandoSolicitudDetalle = false;
        }
      },
      error: (err: any) => {
        this._cargandoSolicitudDetalle = false;
        Swal.fire({
          icon: 'error',
          title: 'No se pudo cargar el detalle de la solicitud.',
          text: String(err?.message || err || ''),
        });
      },
    });
  }

  private _insertarDetalleSolicitudEnItems(detalleSolicitud: any[]): void {
    const codigosUnicos = Array.from(
      new Set(
        detalleSolicitud
          .map((d: any) => String(d?.ds_codmerc || '').trim())
          .filter((c: string) => !!c)
      )
    );

    const fallback = () => {
      this._agregarSolicitudItemsSinPrecio(detalleSolicitud);
    };

    if (!codigosUnicos.length) {
      fallback();
      return;
    }

    const productoPorCodigo = new Map<string, ModeloInventarioData>();
    let pendientes = codigosUnicos.length;
    let huboErrores = false;

    codigosUnicos.forEach((cod) => {
      this.servicioProducto.buscarProductosPorCodigo(cod).subscribe({
        next: (resp: any) => {
          try {
            const lista: any[] = Array.isArray(resp?.data) ? resp.data : [];
            const exacto = lista.find((p) => String(p?.in_codmerc || '').trim().toUpperCase() === cod.toUpperCase()) || lista[0];
            if (exacto) productoPorCodigo.set(cod.toUpperCase(), exacto as ModeloInventarioData);
          } finally {
            pendientes -= 1;
            if (pendientes <= 0) {
              if (huboErrores || !productoPorCodigo.size) {
                fallback();
              } else {
                this._agregarSolicitudItemsConPrecio(detalleSolicitud, productoPorCodigo);
              }
            }
          }
        },
        error: () => {
          huboErrores = true;
          pendientes -= 1;
          if (pendientes <= 0) fallback();
        },
      });
    });
  }

  private _agregarSolicitudItemsConPrecio(detalleSolicitud: any[], productoPorCodigo: Map<string, ModeloInventarioData>): void {
    const hayAntes = this.items.length;
    if (!hayAntes) { this.limpiarTabla(); }
    detalleSolicitud.forEach((d: any) => {
      const cod = String(d?.ds_codmerc || '').trim();
      if (!cod) return;
      const producto = productoPorCodigo.get(cod.toUpperCase()) || null;
      const cantidad = Number(d?.ds_canmerc ?? 0);
      if (!Number.isFinite(cantidad) || cantidad <= 0) return;
      const precio = Number(producto?.in_premerc ?? 0) || 0;
      if (!producto) {
        this._agregarSolicitudLineaFallback(d, cantidad, precio || 0);
        return;
      }
      const total = cantidad * precio;
      this.totalGral += total;
      this.totalItbis += total * 0.18;
      this.subTotal += total;
      this.items.push({ producto, cantidad, precio, total });
    });
    this.formularioVentainterna.get('fa_valFact')?.patchValue(this.totalGral);
    this._mostrarConfirmacionAgregadas(detalleSolicitud.length, this.items.length - hayAntes);
  }

  private _agregarSolicitudItemsSinPrecio(detalleSolicitud: any[]): void {
    const hayAntes = this.items.length;
    if (!hayAntes) { this.limpiarTabla(); }
    detalleSolicitud.forEach((d: any) => {
      const cantidad = Number(d?.ds_canmerc ?? 0);
      if (!Number.isFinite(cantidad) || cantidad <= 0) return;
      this._agregarSolicitudLineaFallback(d, cantidad, 0);
    });
    this.formularioVentainterna.get('fa_valFact')?.patchValue(this.totalGral);
    this._mostrarConfirmacionAgregadas(detalleSolicitud.length, this.items.length - hayAntes);
  }

  private _agregarSolicitudLineaFallback(d: any, cantidad: number, precio: number): void {
    const cod = String(d?.ds_codmerc || '').trim();
    const des = String(d?.ds_desmerc || '').trim();
    const unidadRaw = (d?.ds_unidad ?? 0) || '';
    const unidad = String(unidadRaw).trim() || '0';
    const producto: ModeloInventarioData = {
      in_codmerc: cod,
      in_desmerc: des,
      in_grumerc: '',
      in_tipoproduct: '',
      in_canmerc: 0,
      in_caninve: 0,
      in_fecinve: null,
      in_eximini: 0,
      in_cosmerc: 0,
      in_premerc: precio,
      in_precmin: 0,
      in_costpro: 0,
      in_ucosto: 0,
      in_porgana: 0,
      in_peso: 0,
      in_longitud: 0,
      in_unidad: isNaN(Number(unidad)) ? 0 : Number(unidad),
      in_medida: 0,
      in_longitu: 0,
      in_fecmodif: null,
      in_amacen: 0,
      in_imagen: '',
      in_status: '',
      in_itbis: false,
      in_minvent: 0,
    };
    const total = cantidad * precio;
    this.totalGral += total;
    this.totalItbis += total * 0.18;
    this.subTotal += total;
    this.items.push({ producto, cantidad, precio, total });
  }

  private _mostrarConfirmacionAgregadas(totalLineas: number, agregadas: number): void {
    Swal.fire({
      icon: 'success',
      title: `Solicitud importada`,
      text: `Se agregaron ${agregadas} de ${totalLineas} líneas a la venta interna.`,
      toast: true,
      position: 'top-end',
      timer: 1500,
      showConfirmButton: false,
    });
  }

  seleccionarSolicitudEnter(event: Event, nextElement: HTMLInputElement | null) {
    if (this.resultadoSolicitud.length > 0) {
      event.preventDefault();
      const idx = this.selectedIndexSolicitud >= 0 && this.selectedIndexSolicitud < this.resultadoSolicitud.length
        ? this.selectedIndexSolicitud
        : 0;
      this.cargarSolicitudVentaInterna(this.resultadoSolicitud[idx]);
      // Si hay algo después de No. Solicitud (input3 es Cod. Vend., que ya está en la
      // parte superior) mejor enfocar el siguiente input lógico: buscarcodmerc (input4)
      const codmercInput = document.getElementById('input4') as HTMLInputElement | null;
      if (codmercInput) { codmercInput.focus(); codmercInput.select(); return; }
      if (nextElement) {
        nextElement.focus();
        nextElement.select();
      }
      return;
    }
    if (nextElement) {
      nextElement.focus();
      nextElement.select();
    }
  }

  handleKeydownSolicitud(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadoSolicitud.length;
    if (key === 'ArrowDown') {
      this.selectedIndexSolicitud = maxIndex
        ? (this.selectedIndexSolicitud + 1) % maxIndex
        : 0;
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      if (maxIndex) {
        this.selectedIndexSolicitud = (this.selectedIndexSolicitud - 1 + maxIndex) % maxIndex;
      } else {
        this.selectedIndexSolicitud = 0;
      }
      event.preventDefault();
    } else if (key === 'Enter') {
      if (this.resultadoSolicitud.length > 0) {
        event.preventDefault();
        event.stopPropagation();
        const idx = this.selectedIndexSolicitud >= 0 && this.selectedIndexSolicitud < this.resultadoSolicitud.length
          ? this.selectedIndexSolicitud
          : 0;
        this.cargarSolicitudVentaInterna(this.resultadoSolicitud[idx]);
      }
    }
  }

  private sucursalLogueada(): { id: string; nombre: string } {
    let id = String(localStorage.getItem('idSucursal') || localStorage.getItem('sucursalid') || '').trim();
    let nombre = '';
    try {
      const raw = localStorage.getItem('sucursal');
      const parsed = raw && raw !== '[object Object]' ? JSON.parse(raw) : null;
      const sucursal = Array.isArray(parsed) ? parsed[0] : parsed;
      id = String(sucursal?.cod_sucursal ?? sucursal?.idSucursal ?? id ?? '').trim();
      nombre = String(sucursal?.nom_sucursal ?? sucursal?.descripcion ?? '').trim();
    } catch {}
    return { id, nombre };
  }

  formatofecha(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Los meses son 0-indexados, se agrega 1 y se llena con ceros
    const day = date.getDate().toString().padStart(2, '0'); // Se llena con ceros si es necesario
    return `${day}/${month}/${year}`;
  }

  cargarDatosEmpresaCliente(empresa: any) {
    this.resultadoNombre = [];
    this.resultadoEmpresas = [];
    this.resultadoSucursalCliente = [];
    this.sucursalesCliente = [];
    this.mostrarSucursalCliente = false;
    this.sucursalClienteSeleccionada = null;
    this.formularioVentainterna.patchValue({
      suculsar_clie: '',
      fa_solicitud: '',
    });
    this.resultadoSolicitud = [];

    const cod = String(empresa?.cod_empre || '').trim();
    const nom = String(empresa?.nom_empre || '').trim();
    if (!cod || !nom) return;

    const agrupada = this.empresasAgrupadas.find((e) => String(e.cod_empre || '').trim().toUpperCase() === cod.toUpperCase());
    this.empresaClienteSeleccionada = agrupada || { cod_empre: cod, nom_empre: nom, sucursales: [] };
    this.sucursalesCliente = (agrupada?.sucursales || [])
      .slice()
      .sort((a, b) => String(a.nom_sucursal || '').localeCompare(String(b.nom_sucursal || ''), undefined, { numeric: true, sensitivity: 'base' }));
    this.nombreEmpresaPropietaria = nom;

    this.formularioVentainterna.patchValue({
      fa_codClie: this.sucursalesCliente[0]?.cod_sucursal || 0,
      fa_nomClie: this.sucursalesCliente[0]?.nom_sucursal || nom,
      suculsar_clie: '',
      fa_solicitud: '',
    });
    this.buscarNombre.setValue(nom, { emitEvent: false });
    this.buscarSucursalCliente.setValue('', { emitEvent: false });
    this.resultadoSucursalCliente = this.sucursalesCliente.slice(0, 200);
    this.mostrarSucursalCliente = this.sucursalesCliente.length > 0;

    if (this.sucursalesCliente.length === 1) {
      this.cargarSucursalCliente(this.sucursalesCliente[0]);
      return;
    }
    if (this.mostrarSucursalCliente) {
      setTimeout(() => {
        const inputSuc = document.getElementById('inputSucursalCliente') as HTMLInputElement | null;
        if (inputSuc) { inputSuc.focus(); inputSuc.select(); }
      }, 50);
    }
  }

  cargarSucursalCliente(sucursal: SucursalesData) {
    const sucursalAnterior = Number(this.sucursalClienteSeleccionada?.cod_sucursal || 0);
    const sucursalNueva = Number(sucursal?.cod_sucursal || 0);
    this.resultadoSucursalCliente = [];
    this.sucursalClienteSeleccionada = sucursal || null;
    if (sucursalAnterior !== sucursalNueva) {
      this.solicitudSeleccionadaCargada = null;
      this.resultadoSolicitud = [];
      this.formularioVentainterna.patchValue({ fa_solicitud: '' }, { emitEvent: false });
    }
    if (sucursal?.nom_sucursal !== '') {
      this.formularioVentainterna.patchValue({
        fa_codClie: sucursal?.cod_sucursal ?? this.formularioVentainterna.get('fa_codClie')?.value,
        fa_nomClie: sucursal?.nom_sucursal ?? this.formularioVentainterna.get('fa_nomClie')?.value,
        suculsar_clie: sucursal?.nom_sucursal ?? '',
      });
      this.buscarSucursalCliente.setValue(sucursal?.nom_sucursal || '', { emitEvent: false });
    }
    // La sucursal ya está seleccionada: pre-cargar la lista de solicitudes
    // de ESA sucursal, para que al entrar al input No. Solicitud ya vea el dropdown.
    setTimeout(() => {
      this.buscarSolicitudesVentaInterna(this.formularioVentainterna.get('fa_solicitud')?.value || '');
      const solicitudInput = document.getElementById('inputNoSolicitud') as HTMLInputElement | null;
      if (solicitudInput) { solicitudInput.focus(); solicitudInput.select(); }
    }, 50);
  }

  handleKeydown(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = Math.max(this.resultadoEmpresas.length - 1, this.resultadoNombre.length - 1);

    if (key === 'ArrowDown') {
      if (this.selectedIndexEmpresa < maxIndex) {
        this.selectedIndexEmpresa++;
      } else {
        this.selectedIndexEmpresa = 0;
      }
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      if (this.selectedIndexEmpresa > 0) {
        this.selectedIndexEmpresa--;
      } else {
        this.selectedIndexEmpresa = maxIndex >= 0 ? maxIndex : 0;
      }
      event.preventDefault();
    } else if (key === 'Enter') {
      const resultado = this.resultadoEmpresas[this.selectedIndexEmpresa] ?? this.resultadoNombre[this.selectedIndexEmpresa];
      if (resultado) {
        this.cargarDatosEmpresaCliente(resultado);
      }
      event.preventDefault();
    }
  }

  handleKeydownSucursalCliente(event: KeyboardEvent) {
    const key = event.key;
    const maxIndex = this.resultadoSucursalCliente.length ? this.resultadoSucursalCliente.length - 1 : -1;

    if (key === 'ArrowDown') {
      if (maxIndex < 0) return;
      this.selectedIndexSucursalCliente =
        this.selectedIndexSucursalCliente < maxIndex ? this.selectedIndexSucursalCliente + 1 : 0;
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      if (maxIndex < 0) return;
      this.selectedIndexSucursalCliente =
        this.selectedIndexSucursalCliente > 0 ? this.selectedIndexSucursalCliente - 1 : maxIndex;
      event.preventDefault();
    } else if (key === 'Enter') {
      event.preventDefault();
      if (this.resultadoSucursalCliente[this.selectedIndexSucursalCliente]) {
        this.cargarSucursalCliente(this.resultadoSucursalCliente[this.selectedIndexSucursalCliente]);
        return;
      }
      const texto = String((event?.target as HTMLInputElement)?.value || '').trim().toUpperCase();
      const porNombre = texto
        ? this.sucursalesCliente.find((s) => String(s?.nom_sucursal || '').trim().toUpperCase() === texto)
        : undefined;
      const porCodigo = texto
        ? this.sucursalesCliente.find((s) => String(s?.cod_sucursal || '').trim().toUpperCase() === texto)
        : undefined;
      if (porNombre || porCodigo) {
        this.cargarSucursalCliente((porNombre || porCodigo) as SucursalesData);
        return;
      }
      if (this.sucursalesCliente.length >= 1) {
        this.cargarSucursalCliente(this.sucursalesCliente[0]);
      }
    }
  }

  cancelarBusquedaDescripcion: boolean = false;
  cancelarBusquedaCodigo: boolean = false;

  cargarDatosInventario(inventario: ModeloInventarioData) {
    console.log(inventario);
    this.resultadoCodmerc = [];
    this.resultadodescripcionmerc = [];
    this.codmerc = inventario.in_codmerc;
    this.preciomerc = inventario.in_premerc;
    this.descripcionmerc = inventario.in_desmerc;
    this.productoselect = inventario;
    this.cancelarBusquedaDescripcion = true;
    this.cancelarBusquedaCodigo = true;
    this.formularioVentainterna.patchValue({
      df_codMerc: inventario.in_codmerc,
      df_desMerc: inventario.in_desmerc,
      df_canMerc: inventario.in_canmerc,
      df_preMerc: inventario.in_premerc,
      df_cosMerc: inventario.in_cosmerc,
      df_unidad: inventario.in_unidad,
    });
    $('#input6').focus();
    $('#input6').select();
  }

  handleKeydownInventario(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadoCodmerc.length;
    if (key === 'ArrowDown') {
      console.log('paso');
      this.selectedIndexcodmerc =
        this.selectedIndexcodmerc < maxIndex
          ? this.selectedIndexcodmerc + 1
          : 0;
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      console.log('paso2');
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
      }
      event.preventDefault();
    }
  }

  handleKeydownInventariosdesc(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadodescripcionmerc.length;
    if (key === 'ArrowDown') {
      // Mueve la selección hacia abajo
      this.selectedIndexcoddescripcionmerc =
        this.selectedIndexcoddescripcionmerc < maxIndex
          ? this.selectedIndexcoddescripcionmerc + 1
          : 0;
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      // Mueve la selección hacia arriba
      this.selectedIndexcoddescripcionmerc =
        this.selectedIndexcoddescripcionmerc > 0
          ? this.selectedIndexcoddescripcionmerc - 1
          : maxIndex;
      event.preventDefault();
    } else if (key === 'Enter') {
      // Selecciona el ítem actual
      if (
        this.selectedIndexcoddescripcionmerc >= 0 &&
        this.selectedIndexcoddescripcionmerc <= maxIndex
      ) {
        this.cargarDatosInventario(
          this.resultadodescripcionmerc[this.selectedIndexcoddescripcionmerc]
        );
      }
      event.preventDefault();
    }
  }

  onEnter(cantidad: number, precio: number) {
    const total = cantidad * precio;
    this.totalGral += total;
    this.subTotal += total;
    this.items.push({ producto: this.productoselect, cantidad, precio, total });
    this.productoselect;
  }

  buscarUsuario(event: Event, nextElement: HTMLInputElement | null): void {
    event.preventDefault();
    const claveUsuario = String(this.formularioVentainterna.get('fa_codVend')?.value || '').trim();
    if (!claveUsuario) {
      this.mensagePantalla = true;
      Swal.fire({
        icon: 'error',
        title: 'A V I S O',
        text: 'Código de usuario inválido.',
      }).then(() => {
        this.mensagePantalla = false;
      });
      return;
    }

    const idsLogueados = this._idsUsuarioLogueadoNormalizados();
    const claveNorm = this._normalizarIdUsuario(claveUsuario);

    const coincideLogueado = idsLogueados.texto.has(claveNorm.texto) ||
      idsLogueados.numeros.has(claveNorm.numero);

    const setYSeguir = (cod: string, nom: string) => {
      this.formularioVentainterna.patchValue({
        fa_codVend: cod || claveUsuario,
        fa_nomVend: nom || idsLogueados.username || claveUsuario,
      });
      if (nextElement) {
        nextElement.focus();
        if (nextElement.tagName === 'INPUT') { try { (nextElement as HTMLInputElement).select(); } catch {} }
      }
    };

    if (coincideLogueado) {
      setYSeguir(idsLogueados.codVend || idsLogueados.codigoUsuario || idsLogueados.idUsuario || claveUsuario,
                 idsLogueados.username || idsLogueados.nombre || claveUsuario);
      return;
    }

    this.ServicioUsuario.buscarUsuarioPorClaveUsuario(String(claveUsuario)).subscribe(
      (res: any) => {
        const data = res?.data ?? null;
        const arr = Array.isArray(data) ? data : (data ? [data] : []);
        const usuario = arr[0] ?? data ?? null;

        const cod =
          String(usuario?.claveUsuario ?? usuario?.claveusuario ?? '').trim() ||
          String(usuario?.codVendedor ?? usuario?.cod_vendedor ?? usuario?.cod_vend ?? '').trim() ||
          String(usuario?.codigoUsuario ?? usuario?.codigo_usuario ?? '').trim() ||
          String(usuario?.idUsuario ?? usuario?.id_usuario ?? usuario?.id ?? '').trim();
        const nombre =
          String(usuario?.nombreUsuario ?? usuario?.nombre_usuario ?? '').trim() ||
          String(usuario?.nombre ?? usuario?.nomUsuario ?? usuario?.nom_usuario ?? '').trim() ||
          String(usuario?.idUsuario ?? usuario?.user ?? '').trim();

        if (cod || nombre) {
          setYSeguir(cod || claveUsuario, nombre || claveUsuario);
          return;
        }

        this.mensagePantalla = true;
        Swal.fire({
          icon: 'error',
          title: 'A V I S O',
          text: 'Código de usuario inválido.',
        }).then(() => {
          this.mensagePantalla = false;
        });
      },
      (_err) => {
        // Fallback final: si la API falla pero el código coincide con el usuario logueado, aceptarlo sin error
        if (coincideLogueado) {
          setYSeguir(idsLogueados.codVend || idsLogueados.codigoUsuario || idsLogueados.idUsuario || claveUsuario,
                     idsLogueados.username || idsLogueados.nombre || claveUsuario);
          return;
        }
        this.mensagePantalla = true;
        Swal.fire({
          icon: 'error',
          title: 'A V I S O',
          text: 'No se pudo buscar el vendedor.',
        }).then(() => {
          this.mensagePantalla = false;
        });
      },
    );
  }

  private _normalizarIdUsuario(v: any): { texto: string; numero: string } {
    const texto = String(v || '').trim().toUpperCase();
    const n = Number(String(v || '').trim());
    const numero = (isFinite(n) && texto !== '') ? String(n) : '';
    return { texto, numero };
  }

  private _idsUsuarioLogueadoNormalizados(): {
    texto: Set<string>; numeros: Set<string>;
    username: string; nombre: string; codVend: string; codigoUsuario: string; idUsuario: string;
  } {
    const texto = new Set<string>();
    const numeros = new Set<string>();
    let username = '';
    let nombre = '';
    let codVend = '';
    let codigoUsuario = '';
    let idUsuario = '';

    const agregar = (v: any) => {
      if (v == null) return;
      const s = String(v);
      if (!s.trim()) return;
      const n = this._normalizarIdUsuario(s);
      texto.add(n.texto);
      if (n.numero) numeros.add(n.numero);
    };

    const storageKeysPlanas = [
      'claveusuario', 'claveUsuario', 'clave_usuario',
      'codigousuario', 'codigoUsuario', 'cod_usuario',
      'codVendedor', 'codvendedor', 'cod_vendedor', 'cod_vend', 'codvend',
      'idusuario', 'idUsuario', 'id_usuario', 'userId', 'user_id',
      'username', 'usuario', 'user', 'name', 'nombre', 'nombreUsuario', 'nom_usuario',
    ];
    storageKeysPlanas.forEach((k) => {
      try { agregar(localStorage.getItem(k)); } catch {}
    });
    username = String(localStorage.getItem('username') || '').trim() ||
               String(localStorage.getItem('user') || '').trim() ||
               String(localStorage.getItem('nombre') || '').trim() ||
               String(localStorage.getItem('nombreUsuario') || '').trim();
    nombre = username;
    codigoUsuario = String(localStorage.getItem('codigousuario') || localStorage.getItem('codigoUsuario') || '').trim();
    codVend = String(localStorage.getItem('codVendedor') || localStorage.getItem('cod_vendedor') || '').trim() || codigoUsuario;
    idUsuario = String(localStorage.getItem('idusuario') || localStorage.getItem('idUsuario') || localStorage.getItem('userId') || '').trim();

    const jsonKeys = ['usuario', 'user', 'currentUser', 'sesion', 'session', 'auth', 'authUser'];
    jsonKeys.forEach((k) => {
      try {
        const raw = localStorage.getItem(k);
        if (!raw || raw === '[object Object]') return;
        const obj = JSON.parse(raw);
        if (!obj || typeof obj !== 'object') return;
        const fields = [
          'claveusuario', 'claveUsuario', 'clave_usuario',
          'codVendedor', 'cod_vendedor', 'cod_vend', 'codvend',
          'codigousuario', 'codigoUsuario', 'cod_usuario', 'codigo',
          'idusuario', 'idUsuario', 'id_usuario', 'userId', 'user_id', 'id',
          'username', 'user', 'usuario',
          'nombre', 'nombreUsuario', 'nomUsuario', 'nom_usuario', 'name',
        ];
        fields.forEach((f) => {
          const val = (obj as any)[f];
          agregar(val);
        });
      } catch {}
    });

    return { texto, numeros, username, nombre, codVend, codigoUsuario, idUsuario };
  }

  moveFocuscodmerc(event: KeyboardEvent, nextInput: HTMLInputElement) {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault(); // Previene el comportamiento predeterminado de Enter
      // const currentControl = this.formularioVentainterna.get('ct_codvend');
      const currentInputValue = (event.target as HTMLInputElement).value.trim();
      if (currentInputValue === '') {
        this.codmerVacio = true;
      } else {
        this.codmerVacio = false;
      }
      if (!this.codnotfound === false) {
        console.log(this.codnotfound);
        this.mensagePantalla = true;
        Swal.fire({
          icon: 'error',
          title: 'A V I S O',
          text: 'Codigo invalido.',
          focusConfirm: true,
          allowEnterKey: true,
        }).then(() => {
          this.mensagePantalla = false;
        });
        this.codmerVacio = false;
        this.codnotfound = false;
        this.codmerc = '';
        this.descripcionmerc = '';
        return;
      } else {
        if (this.codmerVacio === true) {
          nextInput.focus();
          this.codmerVacio = false;
          console.log('vedadero');
        } else {
          $('#input6').focus();
          $('#input6').select();
        }
        this.codmerVacio = false;
      }
    }
  }
  moveFocusdesc(event: KeyboardEvent, nextInput: HTMLInputElement) {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault(); // Previene el comportamiento predeterminado de Enter
      const currentInputValue = (event.target as HTMLInputElement).value.trim();
      if (currentInputValue === '') {
        this.desmerVacio = true;
        console.log('vedadero');
      }

      if (!this.desnotfound === false) {
        this.mensagePantalla = true;
        Swal.fire({
          icon: 'error',
          title: 'A V I S O',
          text: 'Codigo invalido.',
        }).then(() => {
          this.mensagePantalla = false;
        });
        this.desnotfound = true;
        return;
      } else {
        if (this.desmerVacio === true) {
          this.mensagePantalla = true;
          Swal.fire({
            icon: 'error',
            title: 'A V I S O',
            text: 'Codigo invalido.',
          }).then(() => {
            this.mensagePantalla = false;
          });
          this.desnotfound = true;
          return;
          // nextInput.focus();
          // this.desmerVacio = false;
        } else {
          $('#input6').focus();
          $('#input6').select();
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
          icon: 'error',
          title: 'A V I S O',
          text: 'Por favor complete todos los campos requeridos antes de agregar el ítem.',
        }).then(() => {
          this.mensagePantalla = false;
        });
        return;
      } else {
        // nextInput.focus();
        $('#input7').focus();
        $('#input7').select();
      }
    }
  }

  moveFocusnomclie(event: Event, nextInput: HTMLInputElement) {
    event.preventDefault();
    if (event.target instanceof HTMLInputElement) {
      const valor = String(event.target.value || '').trim();
      if (!valor) {
        this.mensagePantalla = true;
        Swal.fire({
          icon: 'error',
          title: 'A V I S O',
          text: 'Por favor complete el campo Empresa para poder continuar.',
        }).then(() => {
          this.mensagePantalla = false;
        });
        return;
      }
      const valorNorm = valor.toUpperCase();

      const indice = this.selectedIndexEmpresa >= 0 && this.selectedIndexEmpresa < this.resultadoEmpresas.length
        ? this.selectedIndexEmpresa
        : 0;

      const porResultado = this.resultadoEmpresas[indice];
      const porNombreCodigo = this.empresasAgrupadas.find((emp) => {
        return String(emp?.nom_empre || '').trim().toUpperCase() === valorNorm ||
          String(emp?.cod_empre || '').trim().toUpperCase() === valorNorm;
      });
      const seleccionada = porResultado || porNombreCodigo;

      if (seleccionada) {
        this.cargarDatosEmpresaCliente(seleccionada);
        return;
      }

      this.empresaClienteSeleccionada = null;
      this.sucursalClienteSeleccionada = null;
      this.sucursalesCliente = [];
      this.nombreEmpresaPropietaria = '';
      this.resultadoEmpresas = [];
      this.resultadoSucursalCliente = [];
      this.mostrarSucursalCliente = false;
      this.formularioVentainterna.patchValue({
        fa_codClie: 0,
        fa_nomClie: valor.toUpperCase(),
        suculsar_clie: '',
        fa_solicitud: '',
      });
      this.buscarNombre.setValue(valor.toUpperCase(), { emitEvent: false });

      const inputSuc = document.getElementById('inputSucursalCliente') as HTMLInputElement | null;
      if (inputSuc && this.mostrarSucursalCliente) {
        inputSuc.focus();
        inputSuc.select();
      } else if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  }

  submitForm(): void {
    if (this.mensagePantalla && this.form.invalid) {
      console.log(this.mensagePantalla);
      console.log(this.form.invalid);
    } else {
      console.log(this.mensagePantalla);
      console.log(this.form.invalid);
      this.cerrarModalVentainterna();
    }
  }

  onBlur(event: any): void {
    const value = String(event?.target?.value || '').trim();

    // Si el valor no está vacío, lo asignamos al formControl
    if (value) {
      this.formularioVentainterna.get('fa_nomClie')?.setValue(value, { emitEvent: false });
    }
  }
}

