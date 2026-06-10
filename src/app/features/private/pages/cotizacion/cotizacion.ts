// import { Inventario } from './../mantenimientos/pages/inventario-page/inventario';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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
  firstValueFrom,
  switchMap,
  tap,
} from 'rxjs';
import Swal from 'sweetalert2';
// import { ModeloUsuarioData } from 'src/app/core/services/mantenimientos/usuario';
// import { ModeloRncData } from 'src/app/core/services/mantenimientos/rnc';
import { ServicioRnc } from 'src/app/core/services/mantenimientos/rnc/rnc.service';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
import { ServicioCotizacion } from 'src/app/core/services/cotizaciones/cotizacion/cotizacion.service';
import {
  CotizacionModelData,
  detCotizacionData,
} from 'src/app/core/services/cotizaciones/cotizacion';
import { ServiciodetCotizacion } from 'src/app/core/services/cotizaciones/detcotizacion/detcotizacion.service';
import { ServicioCliente } from 'src/app/core/services/mantenimientos/clientes/cliente.service';
import { HttpInvokeService } from 'src/app/core/services/http-invoke.service';
import {
  ModeloCliente,
  ModeloClienteData,
} from 'src/app/core/services/mantenimientos/clientes';
import { interfaceDetalleModel } from 'src/app/core/services/cotizaciones/cotizacion/cotizacion';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import { ServicioItbis } from 'src/app/core/services/mantenimientos/itbis/itbis.service';
import {
  ModeloInventario,
  ModeloInventarioData,
} from 'src/app/core/services/mantenimientos/inventario';
import { PrintingService } from 'src/app/core/services/utils/printing.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
declare var $: any;

@Component({
  selector: 'Cotizacion',
  templateUrl: './cotizacion.html',
  styleUrls: ['./cotizacion.css'],
})
export class Cotizacion implements OnInit {
  @ViewChild('inputCodmerc') inputCodmerc!: ElementRef; // Para manejar el foco
  @ViewChild('descripcionInput') descripcionInput!: ElementRef; // Para manejar el foco
  @ViewChild('Tabladetalle') Tabladetalle!: ElementRef;
  @ViewChild('input5') vendedorInput!: ElementRef<HTMLInputElement>; // Referencia al input de ct_codvend
  totalItems = 0;
  pageSize = 10;
  currentPage = 1;
  maxPagesToShow = 5;
  txtdescripcion: string = '';
  txtcodigo = '';
  txtfecha: string = '';
  descripcion: string = '';
  codigo: string = '';
  fecha: string = '';
  cotizacionNumero: string = '';
  mensaje: string = '';
  factura: string = '';
  cotizacionData: any = null; // objeto con la factura que devuelve el backend
  private descripcionBuscar = new BehaviorSubject<string>('');
  private codigoBuscar = new BehaviorSubject<string>('');
  private fechaBuscar = new BehaviorSubject<string>('');
  habilitarFormulario: boolean = false;
  tituloModalCotizacion!: string;
  formularioCotizacion!: FormGroup;
  formulariodetCotizacion!: FormGroup;
  modoedicionCotizacion: boolean = false;
  cotizacionid!: string;
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
  clientesNombreCache = new Map<string, string>();

  private codigoSubject = new BehaviorSubject<string>('');
  private nomclienteSubject = new BehaviorSubject<string>('');

  isDisabled: boolean = true;
  form: FormGroup;
  constructor(
    private fb: FormBuilder,
    private servicioCotizacion: ServicioCotizacion,
    private servicioCliente: ServicioCliente,
    private serviciodetCotizacion: ServiciodetCotizacion,
    private http: HttpInvokeService,
    private servicioInventario: ServicioInventario,
    private ServicioUsuario: ServicioUsuario,
    private ServicioRnc: ServicioRnc,
    private printingService: PrintingService,
    private servicioItbis: ServicioItbis,
  ) {
    this.form = this.fb.group({
      ct_codvend: ['', Validators.required], // El campo es requerido
      // Otros campos...
    });

    this.crearFormularioCotizacion();
    console.log('formulario', this.formularioCotizacion.value);

    this.nomclienteSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((nomcliente) => {
          this.txtdescripcion = nomcliente;
          return this.servicioCotizacion.buscarCotizacion(
            this.currentPage,
            this.pageSize,
            this.codigo,
            this.txtdescripcion,
          );
        }),
      )
      .subscribe((response) => {
        this.cotizacionList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = response.pagination.page;
      });

    // Búsqueda por código
    this.codigoBuscar
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((codigo) => {
          this.txtcodigo = codigo;
          return this.servicioCotizacion.buscarCotizacion(
            this.currentPage,
            this.pageSize,
            this.txtcodigo,
            this.txtdescripcion,
            this.txtfecha,
          );
        }),
      )
      .subscribe((response) => {
        this.cotizacionList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = response.pagination.page;
      });

    // Búsqueda por fecha
    this.fechaBuscar
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((fecha) => {
          this.txtfecha = fecha;
          return this.servicioCotizacion.buscarCotizacion(
            this.currentPage,
            this.pageSize,
            this.txtcodigo,
            this.txtdescripcion,
            this.txtfecha,
          );
        }),
      )
      .subscribe((response) => {
        this.cotizacionList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = response.pagination.page;
      });
  }

  agregarCotizacion() {
    this.formularioCotizacion.disable();
  }

  crearformulariodetCotizacion() {
    this.formulariodetCotizacion = this.fb.group({
      dc_codcoti: [''],
      dc_codmerc: [''],
      dc_descrip: [''],
      dc_canmerc: [''],
      dc_premerc: [''],
      dc_valmerc: [''],
      dc_unidad: [''],
      dc_costmer: [''],
      dc_codclie: [''],
      dc_status: [''],
    });
  }
  @ViewChild('buscarcodmercInput') buscarcodmercElement!: ElementRef;
  buscarNombre = new FormControl();
  resultadoNombre: ModeloClienteData[] = [];
  selectedIndex = 0;
  buscarcodmerc = new FormControl();
  buscardescripcionmerc = new FormControl();
  // buscarcodmercElement = new FormControl();
  nativeElement = new FormControl();
  resultadoCodmerc: ModeloInventarioData[] = [];
  selectedIndexcodmerc = 0;
  resultadodescripcionmerc: ModeloInventarioData[] = [];
  selectedIndexcoddescripcionmerc = 0;
  seleccionarCotizacion(cotizacion: any) {
    this.selectedCotizacion = cotizacion;
  }

  ngOnInit(): void {
    this.buscarTodasCotizacion(1);
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
            !this.isEditing,
        ),
        switchMap((query: string) =>
          this.http.GetRequest<ModeloInventario>(
            `/productos-buscador/${query}`,
          ),
        ),
      )
      .subscribe((results: ModeloInventario) => {
        console.log(results.data);
        if (results) {
          if (Array.isArray(results.data) && results.data.length) {
            // Aquí ordenamos los resultados por el campo 'nombre' (puedes cambiar el campo según tus necesidades)
            this.resultadoCodmerc = results.data.sort((a, b) => {
              return a.in_codmerc.localeCompare(b.in_codmerc, undefined, {
                numeric: true,
                sensitivity: 'base',
              });
            });
            // Aquí seleccionamos automáticamente el primer ítem
            this.selectedIndex = -1;

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
            query !== '' &&
            !this.cancelarBusquedaDescripcion &&
            !this.isEditing,
        ),
        switchMap((query: string) =>
          this.http.GetRequest<ModeloInventario>(
            `/productos-buscador-desc/${query}`,
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
          console.log('2');
        }
      });
    this.buscarNombre.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap(() => {
          this.resultadoNombre = [];
        }),
        filter((query: string) => query !== ''),
        switchMap((query: string) =>
          this.http.GetRequest<ModeloCliente>(`/cliente-nombre/${query}`),
        ),
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
      ct_telclie: [''],
      ct_dirclie: [''],
      ct_correo: [''],
      ct_codvend: ['', Validators.required],
      ct_nomvend: [''],
      ct_status: [''],
      ct_codzona: [''],
    });

    console.log(this.formularioCotizacion.value);
  }
  habilitarFormularioEmpresa() {
    this.habilitarFormulario = false;
  }

  nuevaCotizacion() {
    this.modoedicionCotizacion = false;
    this.tituloModalCotizacion = 'Nueva Cotizacion';
    $('#modalcotizacion').modal('show');
    this.habilitarFormulario = true;
    this.formularioCotizacion.get('ct_codcoti')!.disable();
    this.formularioCotizacion.get('ct_feccoti')!.disable();
    this.formularioCotizacion.get('ct_nomvend')!.disable();
    setTimeout(() => {
      $('#input1').focus();
    }, 500); // Asegúrate de que el tiempo sea suficiente para que el modal se abra completamente
  }

  cerrarModalCotizacion() {
    this.habilitarFormulario = false;
    this.formularioCotizacion.reset();
    this.modoedicionCotizacion = false;
    this.modoconsultaCotizacion = false;
    this.mensagePantalla = false;
    $('#modalcotizacion').modal('hide');
    this.crearFormularioCotizacion();
    // this.buscarTodasCotizacion(1);
    this.limpiarTabla();
    this.limpiarCampos();
    this.habilitarIcono = true;
    const inputs = document.querySelectorAll('.seccion-productos input');
    inputs.forEach((input) => {
      (input as HTMLInputElement).disabled = false;
    });
  }

  editardetCotizacion(detcotizacion: detCotizacionData) {
    this.cotizacionid = detcotizacion.dc_codcoti;
  }
  editarCotizacion(Cotizacion: CotizacionModelData) {
    this.cotizacionid = Cotizacion.ct_codcoti;
    this.modoedicionCotizacion = true;
    this.formularioCotizacion.patchValue(Cotizacion);
    this.tituloModalCotizacion = 'Editando Cotizacion';
    $('#modalcotizacion').modal('show');
    this.habilitarFormulario = true;
    // Desactivar edición del código del vendedor en modo edición
    this.formularioCotizacion.get('ct_codvend')!.disable();
    const inputs = document.querySelectorAll('.seccion-productos input');
    inputs.forEach((input) => {
      (input as HTMLInputElement).disabled = true;
    });
    // Limpiar los items antes de agregar los nuevos
    this.items = [];
    this.servicioCotizacion
      .buscarCotizacionDetalle(Cotizacion.ct_codcoti)
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
          const cantidad = item.dc_canmerc;
          const precio = item.dc_premerc;
          const totalItem = cantidad * precio;
          this.items.push({
            producto: producto,
            cantidad: cantidad,
            precio: precio,
            total: totalItem,
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
      });
  }

  buscarTodasCotizacion(page: number) {
    this.servicioCotizacion
      .buscarTodasCotizacion(page, this.pageSize)
      .subscribe((response) => {
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
    this.habilitarIcono = false;

    const inputs = document.querySelectorAll('.seccion-productos input');
    inputs.forEach((input) => {
      (input as HTMLInputElement).disabled = true;
    });

    // Limpiar los items antes de agregar los nuevos
    this.items = [];

    this.servicioCotizacion
      .buscarCotizacionDetalle(Cotizacion.ct_codcoti)
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

          const cantidad = item.dc_canmerc;
          const precio = item.dc_premerc;
          const totalItem = cantidad * precio;

          this.items.push({
            producto: producto,
            cantidad: cantidad,
            precio: precio,
            total: totalItem,
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
      });
  }

  async generarPDF(Cotizacion: CotizacionModelData) {
    const codigo = String(Cotizacion?.ct_codcoti || '').trim();
    if (!codigo) {
      Swal.fire({
        icon: 'warning',
        title: 'A V I S O',
        text: 'Debe seleccionar una cotizacion valida para generar el PDF.',
      });
      return;
    }

    try {
      const detalleResponse = await firstValueFrom(
        this.servicioCotizacion.buscarCotizacionDetalle(codigo),
      );
      const detalle = Array.isArray(detalleResponse?.data)
        ? detalleResponse.data
        : [];
      const pdfBlob = this.crearCotizacionA4Pdf(Cotizacion, detalle);
      const isDesktop =
        typeof window !== 'undefined' && !!window.electronAPI?.isDesktop;

      if (!isDesktop) {
        await this.printingService.printBlob(pdfBlob, 'reporte');
        Swal.fire({
          icon: 'info',
          title: 'PDF generado',
          text: 'El navegador no permite guardar directamente en C:\\cotizacion. Se abrio el PDF para imprimir.',
        });
        return;
      }

      const filepath = await this.printingService.savePdfBlobToDesktop(
        pdfBlob,
        `cotizacion-${codigo}.pdf`,
        'C:\\cotizacion',
      );

      Swal.fire({
        icon: 'success',
        title: 'PDF creado',
        text: `El archivo PDF fue creado correctamente.\nUbicacion: ${filepath}`,
      });
    } catch (error: any) {
      console.error('Error generando PDF de cotizacion:', error);
      Swal.fire({
        icon: 'error',
        title: 'A V I S O',
        text:
          error?.error?.message ||
          error?.message ||
          'No se pudo generar el PDF de la cotizacion.',
      });
    }
    return;

    console.log('No. Cotizacion', Cotizacion);
    if (!Cotizacion.ct_codcoti || Cotizacion.ct_codcoti.trim() === '') {
      alert('Debe ingresar un número de cotizacion');
      return;
    }
    //   console.log('Buscando cotizacion con número:', this.cotizacionNumero);
    // this.servicioCotizacion
    //     .buscarCotizacionDetalle(Cotizacion.ct_codcoti)
    //     .subscribe((response) => {

    this.servicioCotizacion
      .getByNumero(Cotizacion.ct_codcoti)
      .subscribe((response) => {
        this.cotizacionData = response.data;
        console.log(this.cotizacionData.length);
        if (response) {
          this.cotizacionData = response; // 🔹 aquí está la cotizacion completa
          console.log('cotizacionData', this.cotizacionData);
          this.mensaje = '';
          //  this.generarPDF();
        } else {
          this.cotizacionData = null;
          this.mensaje = 'No se encontró una cotizacion con ese número';
        }
      });
  }
  async imprimirCotizacion(cotizacion: CotizacionModelData) {
    if (!cotizacion?.ct_codcoti || !String(cotizacion.ct_codcoti).trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'A V I S O',
        text: 'Debe seleccionar una cotizacion valida para imprimir.',
      });
      return;
    }

    try {
      const [detalleResponse, itbisRows] = await Promise.all([
        firstValueFrom(this.servicioCotizacion.buscarCotizacionDetalle(cotizacion.ct_codcoti)),
        firstValueFrom(this.servicioItbis.buscarTodos()),
      ]);
      const detalle = Array.isArray(detalleResponse?.data) ? detalleResponse.data : [];
      const itbisGeneral =
        (itbisRows || []).find(
          (row: any) => String(row?.codigo || '').trim().toUpperCase() === 'ITBIS-01',
        ) ||
        (itbisRows || []).find(
          (row: any) => String(row?.nivel || '').trim().toLowerCase() === 'general',
        ) ||
        { codigo: 'ITBIS-01', porcentaje: 18, porcentaje_menos: 15.2542 };

      await this.printingService.imprimirCotizacion80mm(
        cotizacion,
        detalle,
        itbisGeneral,
      );
    } catch (error: any) {
      console.error('Error imprimiendo cotizacion:', error);
      Swal.fire({
        icon: 'error',
        title: 'A V I S O',
        text:
          error?.error?.message ||
          error?.message ||
          'No se pudo imprimir la cotizacion.',
      });
    }
  }

  eliminarCotizacion(CotizacionId: string) {
    Swal.fire({
      title: '¿Está seguro de eliminar este Cotizacion?',
      text: '¡No podrá revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si, eliminar!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.servicioCotizacion
          .eliminarCotizacion(CotizacionId)
          .subscribe((response) => {
            Swal.fire({
              title: 'Excelente!',
              text: 'Empresa eliminado correctamente.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false,
            });
            this.buscarTodasCotizacion(this.currentPage);
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
    const raw = inputElement.value?.trim();
    const formatted = this.formatFechaFiltro(raw);
    this.txtfecha = formatted;
    this.fechaBuscar.next(formatted);
  }

  private extraerMensajeError(error: any): string {
    return String(
      error?.error?.message ||
        error?.error?.error ||
        error?.message ||
        error?.details ||
        error?.hint ||
        error?.error ||
        'No se pudo guardar la cotizacion.',
    );
  }

  private detalleCotizacionPayload(cotizacion: any): any[] {
    return (this.items || []).map((item: any) => {
      const producto = item?.producto || {};
      const cantidad = Number(item?.cantidad ?? item?.dc_canmerc ?? 0);
      const precio = Number(item?.precio ?? item?.dc_premerc ?? 0);
      const total = Number(item?.total ?? item?.dc_valmerc ?? cantidad * precio);

      return {
        dc_codcoti: cotizacion?.ct_codcoti || '',
        dc_codmerc: producto?.in_codmerc ?? item?.dc_codmerc ?? '',
        dc_descrip: producto?.in_desmerc ?? item?.dc_descrip ?? '',
        dc_canmerc: cantidad,
        dc_premerc: precio,
        dc_valmerc: total,
        dc_unidad: producto?.in_unidad ?? item?.dc_unidad ?? '',
        dc_costmer: producto?.in_cosmerc ?? item?.dc_costmer ?? 0,
        dc_codclie: cotizacion?.ct_codclie ?? item?.dc_codclie ?? '',
        dc_status: item?.dc_status ?? 'A',
      };
    });
  }

  guardarCotizacion() {
    const date = new Date();
    this.formularioCotizacion.get('ct_valcoti')?.patchValue(this.totalGral);
    this.formularioCotizacion.get('ct_itbis')?.patchValue(this.totalItbis);
    // Refrescar estado de validación
    this.formularioCotizacion.markAllAsTouched();
    this.formularioCotizacion.updateValueAndValidity();
    const cotizacionPayload = this.formularioCotizacion.getRawValue();
    const payload = {
      // Incluir valores de controles deshabilitados
      cotizacion: cotizacionPayload,
      detalle: this.detalleCotizacionPayload(cotizacionPayload),
      idCotizacion: cotizacionPayload.ct_codcoti,
    };

    if (this.formularioCotizacion.valid) {
      if (this.modoedicionCotizacion) {
        const cotizacionEdit = this.formularioCotizacion.getRawValue();
        const payloadEdit = {
          cotizacion: cotizacionEdit,
          detalle: this.detalleCotizacionPayload(cotizacionEdit),
          idCotizacion: this.cotizacionid,
        };
        this.servicioCotizacion
          .editarCotizacion(this.cotizacionid, payloadEdit as any)
          .subscribe({
            next: (response) => {
              Swal.fire({
                title: 'Excelente!',
                text: 'Cotizacion editada correctamente.',
                icon: 'success',
                timer: 3000,
                showConfirmButton: false,
              });
              this.buscarCotizacion(this.currentPage);
              this.formularioCotizacion.reset();
              this.crearFormularioCotizacion();
              $('#modalcotizacion').modal('hide');
            },
            error: (err) => {
              console.error('Error editando cotizacion:', err);
              Swal.fire({
                icon: 'error',
                title: 'A V I S O',
                text: this.extraerMensajeError(err),
              });
            },
          });
      } else {
        if (this.formularioCotizacion.valid) {
          this.servicioCotizacion.guardarCotizacion(payload).subscribe({
            next: (response) => {
              Swal.fire({
                title: 'Excelente!',
                text: 'Cotizacion creada correctamente.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
              });
              this.buscarCotizacion(this.currentPage);
              this.formularioCotizacion.reset();
              this.crearFormularioCotizacion();
              this.formularioCotizacion.enable();
              $('#modalcotizacion').modal('hide');
            },
            error: (err) => {
              console.error('Error creando cotizacion:', err);
              Swal.fire({
                icon: 'error',
                title: 'A V I S O',
                text: this.extraerMensajeError(err),
              });
            },
          });
        } else {
          console.log(this.formularioCotizacion.value);
        }
      }
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'La cotización no fue guardada. Verifique los campos requeridos (por ejemplo, Vendedor).',
      });
      // Enfocar automáticamente el campo de vendedor si está vacío/invalid
      const vendCtrl = this.formularioCotizacion.get('ct_codvend');
      if (vendCtrl && vendCtrl.invalid) {
        vendCtrl.markAsTouched();
        // Asegurar que el input exista antes de enfocar
        setTimeout(() => {
          this.vendedorInput?.nativeElement?.focus();
          this.vendedorInput?.nativeElement?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }, 0);
      }
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
    // Mantener filtros actuales en la paginación
    this.servicioCotizacion
      .buscarCotizacion(
        this.currentPage,
        this.pageSize,
        this.txtcodigo,
        this.txtdescripcion,
        this.txtfecha,
      )
      .subscribe((response) => {
        this.cotizacionList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = page;
        this.formularioCotizacion.reset();
      });
  }

  // Wrapper para ejecutar la consulta con los filtros actuales
  buscarCotizacion(page: number) {
    this.currentPage = page;
    this.servicioCotizacion
      .buscarCotizacion(
        this.currentPage,
        this.pageSize,
        this.txtcodigo,
        this.txtdescripcion,
        this.txtfecha,
      )
      .subscribe((response) => {
        this.cotizacionList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = response.pagination.page ?? page;
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
      (_, i) => startPage + i,
    );
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
      this.subTotal += total - itbis;
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
    this.totalItbis = 0; // Reiniciar el total del ITBIS
    this.subTotal = 0; // Reiniciar el subtotal
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
  }
  actualizarTotales() {
    this.totalGral = this.items.reduce((sum, item) => sum + item.total, 0);
    this.totalItbis = this.items.reduce(
      (sum, item) => sum + item.total * 0.18,
      0,
    );
    this.subTotal = this.items.reduce(
      (sum, item) => sum + (item.total - item.total * 0.18),
      0,
    );
  }

  buscarPorCodigo(codigo: string) {}

  nombreClientePorCodigo(codCliente: string | null | undefined): string {
    if (!codCliente) return '';
    const cached = this.clientesNombreCache.get(codCliente);
    if (cached) return cached;
    this.servicioCliente.buscarCliente(Number(codCliente)).subscribe((res) => {
      const nombre = res?.data?.cl_nomClie || '';
      this.clientesNombreCache.set(codCliente, nombre);
    });
    return '';
  }

  buscarClienteporNombre() {
    this.servicioCliente
      .buscarporNombre(this.formularioCotizacion.get('ct_nomclie')!.value)
      .subscribe((response) => {
        console.log(response);
      });
  }

  formatofecha(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Los meses son 0-indexados, se agrega 1 y se llena con ceros
    const day = date.getDate().toString().padStart(2, '0'); // Se llena con ceros si es necesario
    return `${day}/${month}/${year}`;
  }

  // Normaliza diferentes formatos a dd/mm/aaaa para filtros y despliegue
  formatFechaFiltro(fechaInput: any): string {
    if (!fechaInput && fechaInput !== 0) return '';
    // Si ya es Date
    if (fechaInput instanceof Date && !isNaN(fechaInput.getTime())) {
      const yyyy = fechaInput.getFullYear();
      const mm = (fechaInput.getMonth() + 1).toString().padStart(2, '0');
      const dd = fechaInput.getDate().toString().padStart(2, '0');
      return `${dd}/${mm}/${yyyy}`;
    }
    // Si es número (timestamp)
    if (typeof fechaInput === 'number') {
      const d = new Date(fechaInput);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = (d.getMonth() + 1).toString().padStart(2, '0');
        const dd = d.getDate().toString().padStart(2, '0');
        return `${dd}/${mm}/${yyyy}`;
      }
    }
    // Si es string
    if (typeof fechaInput === 'string') {
      let v = fechaInput.trim();
      // Quitar hora si viene en ISO: yyyy-mm-ddTHH:mm:ssZ
      if (v.includes('T')) v = v.split('T')[0];
      // Quitar hora si viene con espacio: dd/mm/yyyy HH:mm
      if (v.includes(' ')) v = v.split(' ')[0];
      // Caso: yyyy-mm-dd
      const iso = /^\d{4}-\d{2}-\d{2}$/;
      if (iso.test(v)) {
        const [yyyy, mm, dd] = v.split('-');
        return `${dd}/${mm}/${yyyy}`;
      }
      // Caso: yyyy/mm/dd
      const isoSlash = /^\d{4}\/\d{2}\/\d{2}$/;
      if (isoSlash.test(v)) {
        const [yyyy, mm, dd] = v.split('/');
        return `${dd}/${mm}/${yyyy}`;
      }
      // Caso: dd/mm/yyyy ya correcto
      const dmy = /^\d{2}\/\d{2}\/\d{4}$/;
      if (dmy.test(v)) return v;
      // Intento genérico: separar por / o - y reorganizar
      const parts = v.split(/[\/-]/);
      if (parts.length === 3) {
        const idxYear = parts.findIndex((p) => p.length === 4);
        if (idxYear === 0) {
          const [yyyy, mm, dd] = parts;
          if (mm.length === 2 && dd.length === 2) return `${dd}/${mm}/${yyyy}`;
        } else if (idxYear === 2) {
          const [dd, mm, yyyy] = parts;
          if (dd.length === 2 && mm.length === 2) return `${dd}/${mm}/${yyyy}`;
        }
      }
      // Último intento: usar Date.parse
      const parsed = new Date(v);
      if (!isNaN(parsed.getTime())) {
        const yyyy = parsed.getFullYear();
        const mm = (parsed.getMonth() + 1).toString().padStart(2, '0');
        const dd = parsed.getDate().toString().padStart(2, '0');
        return `${dd}/${mm}/${yyyy}`;
      }
      return v; // Devolver original si no se puede normalizar
    }
    return '';
  }

  cargarDatosCliente(cliente: ModeloClienteData) {
    this.resultadoNombre = [];
    this.buscarNombre.reset();
    if (cliente.cl_nomClie !== '') {
      console.log('dd');
      this.formularioCotizacion.patchValue({
        ct_codclie: cliente.cl_codClie,
        ct_nomclie: cliente.cl_nomClie,
        ct_rnc: cliente.cl_rnc,
        ct_telclie: cliente.cl_telClie,
        ct_dirclie: cliente.cl_dirClie,
        ct_codzona: cliente.cl_codZona,
      });
    }
  }

  handleKeydown(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadoNombre.length - 1; // Ajustamos el límite máximo

    if (key === 'ArrowDown') {
      console.log('paso 56');

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
      event.preventDefault();
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
    this.formularioCotizacion.patchValue({
      dc_codmerc: inventario.in_codmerc,
      dc_desmerc: inventario.in_desmerc,
      dc_canmerc: inventario.in_canmerc,
      dc_premerc: inventario.in_premerc,
      dc_cosmerc: inventario.in_cosmerc,
      dc_unidad: inventario.in_unidad,
    });
    $('#input8').focus();
    $('#input8').select();
  }

  handleKeydownInventario(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadoCodmerc.length - 1;
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
          this.resultadoCodmerc[this.selectedIndexcodmerc],
        );
      }
      event.preventDefault();
    }
  }

  handleKeydownInventariosdesc(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadodescripcionmerc.length - 1;
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
          this.resultadodescripcionmerc[this.selectedIndexcoddescripcionmerc],
        );
      }
      event.preventDefault();
    }
  }

  onEnter(cantidad: number, precio: number) {
    const total = cantidad * precio;
    this.totalGral += total;
    const itbis = total * 0.18;
    this.totalItbis += itbis;
    this.subTotal += total - itbis;
    this.items.push({ producto: this.productoselect, cantidad, precio, total });
    this.productoselect;
  }

  buscarUsuario(event: Event, nextElement: HTMLInputElement | null): void {
    event.preventDefault();
    const claveUsuario = this.formularioCotizacion.get('ct_codvend')?.value;
    if (claveUsuario) {
      this.ServicioUsuario.buscarUsuarioPorClave(claveUsuario).subscribe(
        (usuario) => {
          if (usuario.data.length) {
            this.formularioCotizacion.patchValue({
              ct_nomvend: usuario.data[0].idUsuario,
            });
            nextElement?.focus();
            console.log(usuario.data[0].idUsuario);
            this.mensagePantalla = true;
            Swal.fire({
              icon: 'error',
              title: 'A V I S O',
              text: 'Codigo de usuario invalido.',
            }).then(() => {
              this.mensagePantalla = false;
            });
            return;
            console.log('Vendedor no encontrado');
          }
        },
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
    const rnc = this.formularioCotizacion.get('ct_rnc')?.value;
    if (rnc) {
      if (rnc.length === 9 || rnc.length === 11) {
        this.ServicioRnc.buscarRncPorrncId(rnc).subscribe((rnc) => {
          console.log(rnc.data);
          if (rnc.data) {
            this.formularioCotizacion.patchValue({
              ct_nomclie: rnc.data.rason,
            });
            nextElement?.focus();
            console.log(rnc.data[0].rason);
          } else {
            this.mensagePantalla = true;

            Swal.fire({
              icon: 'error',
              title: 'A V I S O',
              text: 'Rnc invalido.',
            }).then(() => {
              this.mensagePantalla = false;
            });
            return;
          }
        });
      } else {
        this.mensagePantalla = true;
        Swal.fire({
          icon: 'error',
          title: 'A V I S O',
          text: 'Rnc invalido.',
        }).then(() => {
          this.mensagePantalla = false;
        });
        return;
      }
      this.mensagePantalla = false;
    } else {
      nextElement?.focus();
    }
    this.mensagePantalla = false;
  }

  moveFocuscodmerc(event: KeyboardEvent, nextInput: HTMLInputElement) {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault(); // Previene el comportamiento predeterminado de Enter
      // const currentControl = this.formularioCotizacion.get('ct_codvend');
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
          $('#input8').focus();
          $('#input8').select();
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
          $('#input8').focus();
          $('#input8').select();
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
        $('#input9').focus();
        $('#input9').select();
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

  submitForm(): void {
    if (this.mensagePantalla && this.form.invalid) {
      console.log(this.mensagePantalla);
      console.log(this.form.invalid);
    } else {
      console.log(this.mensagePantalla);
      console.log(this.form.invalid);
      this.cerrarModalCotizacion();
    }
  }

  generatePDF(cotizacion: CotizacionModelData) {
    console.log(cotizacion);
    this.servicioCotizacion
      .buscarCotizacionDetalle(cotizacion.ct_codcoti)
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
          const cantidad = item.dc_canmerc;
          const precio = item.dc_premerc;
          const totalItem = cantidad * precio;
          this.items.push({
            producto: producto,
            cantidad: cantidad,
            precio: precio,
            total: totalItem,
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
        doc.text('COTIZACION', 105, 70, { align: 'center' });

        // Detalles de la cotización
        doc.setFontSize(10);
        doc.text(`No. ${cotizacion.ct_codcoti}`, 14, 80);
        doc.text(`Fecha: ${cotizacion.ct_feccoti}`, 14, 85);
        doc.text(`Vendedido por: ${cotizacion.ct_nomvend}`, 14, 90);

        // Cliente
        doc.setFontSize(12);
        doc.text('CLIENTE', 14, 100);
        doc.setFontSize(10);
        doc.text(cotizacion.ct_nomclie, 14, 106);

        // Tabla de descripción de productos
        autoTable(doc, {
          head: [['Cantidad', 'Descripción', 'Precio Unitario', 'Total']],
          body: response.data.map((item: any) => [
            parseInt(item.dc_canmerc),
            item.dc_descrip,
            formatCurrency(parseFloat(item.dc_premerc)),
            formatCurrency(item.dc_premerc * item.dc_canmerc),
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
        doc.text(
          'Estos Precios Estan Sujetos a Cambio Sin Previo Aviso',
          105,
          finalY + 40,
          { align: 'center' },
        );
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
        this.printingService.printBlob(pdfBlob, 'reporte');
      });
  }

  // Método para convertir a mayúsculas en tiempo real
  private crearCotizacionA4Pdf(
    cotizacion: CotizacionModelData,
    detalle: any[],
  ): Blob {
    const formatCurrency = (value: any) =>
      Number(value || 0).toLocaleString('es-DO', {
        style: 'currency',
        currency: 'DOP',
      });
    const formatText = (value: any) => String(value ?? '');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgWidth = 20;
    const imgHeight = 20;
    const imgX = (pageWidth - imgWidth) / 2;

    try {
      doc.addImage('assets/logo2.png', 'PNG', imgX, 10, imgWidth, imgHeight);
    } catch (error) {
      console.warn('No se pudo agregar el logo al PDF de cotizacion:', error);
    }

    doc.setFontSize(16);
    doc.text('CENTRAL HIERRO, SRL', 105, 40, { align: 'center' });
    doc.setFontSize(10);
    doc.text('#172 Esq. Albert Thomas', 105, 47, { align: 'center' });
    doc.text('809-384-2000, 809-384-200', 105, 52, { align: 'center' });
    doc.text('1-30-29922-6', 105, 57, { align: 'center' });

    doc.setFontSize(14);
    doc.text('COTIZACION', 105, 70, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`No. ${formatText(cotizacion.ct_codcoti)}`, 14, 80);
    doc.text(`Fecha: ${this.formatFechaFiltro(cotizacion.ct_feccoti)}`, 14, 85);
    doc.text(`Vendido por: ${formatText(cotizacion.ct_nomvend)}`, 14, 90);

    doc.setFontSize(12);
    doc.text('CLIENTE', 14, 100);
    doc.setFontSize(10);
    doc.text(formatText(cotizacion.ct_nomclie), 14, 106);
    doc.text(`RNC: ${formatText(cotizacion.ct_rnc)}`, 14, 111);
    doc.text(`Telefono: ${formatText(cotizacion.ct_telclie)}`, 14, 116);
    doc.text(`Direccion: ${formatText(cotizacion.ct_dirclie)}`, 14, 121);

    let subtotal = 0;
    const body = (detalle || []).map((item: any) => {
      const cantidad = Number(item?.dc_canmerc || 0);
      const precio = Number(item?.dc_premerc || 0);
      const total = cantidad * precio;
      subtotal += total;

      return [
        cantidad.toString(),
        formatText(item?.dc_descrip),
        formatCurrency(precio),
        formatCurrency(total),
      ];
    });
    const itbis = Number(cotizacion.ct_itbis || 0);
    const totalGeneral =
      Number(cotizacion.ct_valcoti || 0) || subtotal + itbis;

    autoTable(doc, {
      head: [['Cantidad', 'Descripcion', 'Precio Unitario', 'Total']],
      body,
      startY: 130,
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 130;

    doc.setFontSize(12);
    doc.text('Subtotal:', 118, finalY + 10);
    doc.setFontSize(10);
    doc.text(formatCurrency(subtotal), 160, finalY + 10);
    doc.setFontSize(12);
    doc.text('ITBIS:', 118, finalY + 16);
    doc.setFontSize(10);
    doc.text(formatCurrency(itbis), 160, finalY + 16);
    doc.setFontSize(12);
    doc.text('TOTAL A PAGAR:', 118, finalY + 22);
    doc.setFontSize(14);
    doc.text(formatCurrency(totalGeneral), 160, finalY + 22);

    doc.setFontSize(12);
    doc.text(
      'Estos Precios Estan Sujetos a Cambio Sin Previo Aviso',
      105,
      finalY + 40,
      { align: 'center' },
    );
    doc.setFontSize(14);
    doc.text('WWW.GRUPOHIERRO.COM', 105, finalY + 47, { align: 'center' });
    doc.setFontSize(12);
    doc.text('*** Gracias por Preferirnos ***', 105, finalY + 55, {
      align: 'center',
    });

    return doc.output('blob');
  }

  onUpperCase(fieldName: string, value: string): void {
    if (value) {
      const upperValue = value.toUpperCase();
      this.formularioCotizacion.patchValue(
        {
          [fieldName]: upperValue,
        },
        { emitEvent: false },
      );
    }
  }
}

function then(arg0: () => void) {
  throw new Error('Function not implemented.');
}
