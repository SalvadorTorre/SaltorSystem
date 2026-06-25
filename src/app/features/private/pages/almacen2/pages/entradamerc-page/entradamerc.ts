
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { ServicioContFactura } from 'src/app/core/services/mantenimientos/contfactura/contfactura.service';
import { ServicioSuplidor } from 'src/app/core/services/mantenimientos/suplidor/suplidor.service';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import { ServicioProducto } from 'src/app/core/services/mantenimientos/producto/producto.service';
import { ServicioEntradamerc } from 'src/app/core/services/almacen/entradamerc/entradamerc.service';
import { ServiciodetEntradamerc } from 'src/app/core/services/almacen/detentradamerc/detentradamerc.service';
import { forkJoin, debounceTime, distinctUntilChanged } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { PrintingService } from 'src/app/core/services/utils/printing.service';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
import { ServicioRnc } from 'src/app/core/services/mantenimientos/rnc/rnc.service';
import Swal from 'sweetalert2';
declare var $: any;

export interface DetEntradaMerc {
  de_codEntr: string;
  de_codMerc: string;
  de_desMerc?: string;
  de_canEntr?: number; // Decimal in Prisma -> number in TS
  de_preMerc?: number;
  de_valEntr?: number;
  de_unidad?: string;
  de_cosMerc?: number;
  de_codSupl?: number;
  de_fecEntr?: Date | string;
  de_codEmpr?: string;
  de_codSucu?: number;
}

export interface EntradaMerc {
  me_codEntr: string;
  me_fecEntr?: Date | string;
  me_valEntr?: number;
  me_codSupl?: string;
  me_nomSupl?: string;
  me_facSupl?: string;
  me_fecSupl?: Date | string;
  me_status?: string;
  me_codVend?: string;
  me_nomVend?: string;
  imgfactura?: string;
  nota?: string;
  vendedor?: string;
  despachado?: string;
  chofer?: string;
  me_rncSupl?: number;
  me_ordencomp?: string;
  me_codEmpr?: string;
  me_codSucu?: number;
  detentradamerc: DetEntradaMerc[];
}

@Component({
  selector: 'app-entradamerc',
  templateUrl: './entradamerc.html',
  styleUrls: ['./entradamerc.css']
})
export class EntradaMercComponent implements OnInit, AfterViewInit {
  entradaForm: FormGroup;
  detalles: DetEntradaMerc[] = [];
  idSucursal: number = 1; // Default sucursal ID or retrieved from auth service
  suplidoresBusqueda: any[] = [];
  @ViewChild('inputRncSupl') inputRncSupl!: ElementRef<HTMLInputElement>;
  @ViewChild('inputNombreSupl') inputNombreSupl!: ElementRef<HTMLInputElement>;
  @ViewChild('inputCantidad') inputCantidad!: ElementRef<HTMLInputElement>;
  @ViewChild('inputCodigo') inputCodigo!: ElementRef<HTMLInputElement>;
  @ViewChild('inputDescripcion') inputDescripcion!: ElementRef<HTMLInputElement>;
  @ViewChild('inputPrecio') inputPrecio!: ElementRef<HTMLInputElement>;
  @ViewChild('inputPdfEntrada') inputPdfEntrada!: ElementRef<HTMLInputElement>;
  productosBusquedaCodigo: any[] = [];
  productosBusquedaDesc: any[] = [];
  Toast = (Swal as any).mixin({
    toast: false,
    position: 'center',
    showConfirmButton: true,
    confirmButtonText: 'Aceptar',
    timer: undefined,
    timerProgressBar: false,
    allowOutsideClick: true,
    width: '36rem',
    customClass: {
      popup: 'shadow-lg',
      title: 'fs-4',
      htmlContainer: 'fs-6'
    }
  });
//   page = 1;
// limit = 10;
// totalPages = 0;
  noWhitespaceValidator: ValidatorFn = (control: AbstractControl) => {
    const v = (control.value ?? '').toString().trim();
    return v.length === 0 ? { whitespace: true } : null;
  };
  selectedProducto: any = null;
  canPrint: boolean = false;
  lastSavedEntrada: any = null;
  lastSavedDetalle: any[] = [];
  totalItems = 0;
  pageSize = 8;
  currentPage = 1;
  maxPagesToShow = 5;
  consultaForm!: FormGroup;
  entradamercList: any[] = [];
  tituloModalEntradamerc: string = '';
  entradaSeleccionada: any = null;
  detalleConsulta: any[] = [];
  private ultimoRncBuscado: string = '';
  archivoPdfEntrada: File | null = null;
  nombrePdfEntrada: string = '';

  constructor(
    private fb: FormBuilder,
    private servicioContFactura: ServicioContFactura,
    private servicioSuplidor: ServicioSuplidor,
    private servicioInventario: ServicioInventario,
    private servicioProducto: ServicioProducto,
    private servicioEntradamerc: ServicioEntradamerc,
    private servicioDetEntrada: ServiciodetEntradamerc,
    private printing: PrintingService,
    private servicioUsuario: ServicioUsuario,
    private servicioRnc: ServicioRnc
  ) {
    this.entradaForm = this.fb.group({
      me_codEntr: [{value: '', disabled: true}, Validators.required],
      me_fecEntr: [{ value: this.fechaHoy(), disabled: true }],
      me_codSupl: [''],
      me_nomSupl: ['', [Validators.required, this.noWhitespaceValidator]],
      me_facSupl: [''],
      me_ordencomp: [''],
      me_fecSupl: [new Date().toISOString().split('T')[0]],
      me_status: [''],
      me_codVend: [''],
      me_nomVend: [{ value: '', disabled: true }],
      imgfactura: [''],
      nota: [''],
      vendedor: [''],
      despachado: [''],
      chofer: [''],
      me_rncSupl: [null],
      // Detalles form inputs (para agregar uno a uno)
      det_codMerc: [''],
      det_desMerc: ['', [Validators.required, this.noWhitespaceValidator]],
      det_canEntr: [0, [Validators.required, Validators.min(0.01)]],
      det_preMerc: [0, [Validators.required, Validators.min(0.01)]]
    });
    this.consultaForm = this.fb.group({
      codigo: [''],
      nomcliente: [''],
      fecha: ['']
    });
    this.setupAutoBuscarConsulta();
  }

  buscarVendedorPorCodigo(event: Event): void {
    event.preventDefault();
    const codVendCtrl = this.entradaForm.get('me_codVend');
    const codVendRaw = (codVendCtrl?.value ?? '').toString().trim();
    if (!codVendRaw) {
      this.Toast.fire({ title: 'Código de vendedor inválido', icon: 'warning' });
      return;
    }
    this.servicioUsuario.buscarUsuarioPorCodigoVendedor(codVendRaw).subscribe({
      next: (res: any) => {
        const usuario = res?.data ?? null;
        const nombre = usuario?.nombreUsuario || usuario?.idUsuario || '';
        if (!nombre) {
          this.Toast.fire({ title: 'Vendedor no encontrado', icon: 'warning' });
          return;
        }
        this.entradaForm.patchValue({ me_nomVend: nombre });
        const target = event.target as HTMLElement;
        this.focusNextFrom(target);
      },
      error: () => {
        this.Toast.fire({ title: 'No se pudo buscar el vendedor', icon: 'error' });
      }
    });
  }

  ngOnInit(): void {
    // no generar el código de entrada automáticamente al iniciar
  }

  ngAfterViewInit(): void {
    this.inputRncSupl?.nativeElement.focus();
  }

  private sucursalUsuario(): number {
    return Number(localStorage.getItem('idSucursal') || this.idSucursal || 1);
  }

  buscarRncSuplidor(event?: Event): void {
    event?.preventDefault();
    const rnc = String(this.entradaForm.get('me_rncSupl')?.value || '').replace(/\D/g, '').trim();

    if (!rnc) {
      this.ultimoRncBuscado = '';
      if (event) this.focusNext(event);
      return;
    }

    this.entradaForm.patchValue({ me_rncSupl: rnc }, { emitEvent: false });

    if (rnc.length !== 9 && rnc.length !== 11) {
      if (event) {
        this.Toast.fire({
          title: 'RNC invalido',
          text: 'El RNC debe tener 9 digitos o la cedula 11 digitos.',
          icon: 'warning'
        });
      }
      return;
    }

    if (!event && this.ultimoRncBuscado === rnc) return;
    this.ultimoRncBuscado = rnc;

    this.servicioRnc.buscarRncPorrncId(rnc).subscribe({
      next: (response: any) => {
        const row = this.extraerRncData(response);
        const razonSocial = String(row?.rason || row?.razon || row?.razon_social || '').trim();

        if (razonSocial) {
          this.entradaForm.patchValue({
            me_nomSupl: razonSocial.toUpperCase()
          });
          this.suplidoresBusqueda = [];
          if (event) this.focusNextFrom(event.target as HTMLElement);
          return;
        }

        if (event) {
          this.Toast.fire({
            title: 'RNC no encontrado',
            text: 'No se encontro razon social para ese RNC.',
            icon: 'info'
          });
        }
      },
      error: (err: any) => {
        console.error('Error consultando RNC suplidor:', err);
        if (event) {
          this.Toast.fire({
            title: 'No se pudo consultar el RNC',
            text: this.getErrorMessage(err),
            icon: 'error'
          });
        }
      }
    });
  }

  buscarSuplidor(force: boolean = false) {
    const nombre = (this.entradaForm.get('me_nomSupl')?.value || '').trim();
    if (nombre && (force ? nombre.length > 0 : nombre.length > 2)) {
      this.servicioSuplidor.buscarporNombre(nombre).subscribe({
        next: (response: any) => {
          if (response && response.data) {
            this.suplidoresBusqueda = response.data;
          } else {
            this.suplidoresBusqueda = [];
          }
        },
        error: () => {
          this.suplidoresBusqueda = [];
        }
      });
    } else {
      this.suplidoresBusqueda = [];
    }
  }

  seleccionarSuplidor(suplidor: any) {
    this.entradaForm.patchValue({
      me_codSupl: suplidor.su_codSupl,
      me_nomSupl: suplidor.su_nomSupl,
      me_rncSupl: suplidor.su_rncSupl
    });
    this.suplidoresBusqueda = [];
  }

  onEnter(event: Event) {
    event.preventDefault();
    this.buscarSuplidor(true);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const nombreCtrl = this.entradaForm.get('me_nomSupl');
      const nombre = ((nombreCtrl?.value || '') as string).trim();
      if (nombre.length === 0) {
        this.suplidoresBusqueda = [];
        this.Toast.fire({ title: 'Nombre de suplidor no puede estar en blanco', icon: 'warning' });
        this.inputNombreSupl?.nativeElement.focus();
        return;
      }
      this.servicioSuplidor.buscarporNombre(nombre).subscribe({
        next: (response: any) => {
          const lista = (response && response.data) ? response.data : [];
          this.suplidoresBusqueda = lista;
          if (lista.length === 1) {
            this.seleccionarSuplidor(lista[0]);
            this.focusNextFrom(this.inputNombreSupl?.nativeElement || null);
          } else if (lista.length > 1) {
            const exact = lista.find((s: any) => String(s.su_nomSupl).toLowerCase() === nombre.toLowerCase());
            if (exact) {
              this.seleccionarSuplidor(exact);
              this.focusNextFrom(this.inputNombreSupl?.nativeElement || null);
            }
            // si no hay coincidencia exacta, se deja la lista abierta para selección manual
          }
          // si no hubo selección automática, igualmente avanzamos y limpiamos sugerencias
          this.suplidoresBusqueda = [];
          this.focusNextFrom(this.inputNombreSupl?.nativeElement || null);
        },
        error: () => {
          this.suplidoresBusqueda = [];
          this.focusNextFrom(this.inputNombreSupl?.nativeElement || null);
        }
      });
    }
  }

  cargarSecuenciaEntrada() {
    const sucursalId = Number(localStorage.getItem('idSucursal') ?? this.idSucursal ?? 1);
    this.servicioContFactura.buscarPorSucursal(sucursalId).subscribe({
      next: (response: any) => {
        if (response && response.data && response.data.length > 0) {
          const contador = response.data[0];
          const siguienteNumero = (contador.contentrada || 0) + 1;
          const codigoGenerado = this.generarCodigoEntrada(sucursalId, siguienteNumero);
          
          this.entradaForm.patchValue({
            me_codEntr: codigoGenerado
          });
        }
      },
      error: (err: any) => {
        console.error('Error al cargar secuencia de entrada:', err);
      }
    });
  }

  generarCodigoEntrada(sucursal: number, numero: number): string {
    const anio = new Date().getFullYear().toString();
    const sucStrFull = String(sucursal);
    const sucStr = sucStrFull.length > 2 ? sucStrFull.slice(-2) : sucStrFull.padStart(2, '0');
    const seqStr = String(numero).padStart(4, '0');
    return `${anio}${sucStr}${seqStr}`;
  }

  agregarDetalle() {
    if (this.entradaForm.get('det_desMerc')?.invalid || this.entradaForm.get('det_canEntr')?.invalid || this.entradaForm.get('det_preMerc')?.invalid) {
      this.Toast.fire({ title: 'Descripción no puede ser vacía o espacios. Cantidad y Precio deben ser > 0', icon: 'warning' });
      if (this.entradaForm.get('det_desMerc')?.invalid) {
        this.inputDescripcion?.nativeElement.focus();
      } else if (this.entradaForm.get('det_canEntr')?.invalid) {
        this.inputCantidad?.nativeElement.focus();
      } else {
        this.inputPrecio?.nativeElement.focus();
      }
      return;
    }
    const detalle: DetEntradaMerc = {
      de_codEntr: this.entradaForm.get('me_codEntr')?.value,
      de_codMerc: this.entradaForm.get('det_codMerc')?.value,
      de_desMerc: this.entradaForm.get('det_desMerc')?.value,
      de_canEntr: Number(this.entradaForm.get('det_canEntr')?.value),
      de_preMerc: Number(this.entradaForm.get('det_preMerc')?.value),
      de_valEntr: Number(this.entradaForm.get('det_canEntr')?.value) * Number(this.entradaForm.get('det_preMerc')?.value),
      de_unidad: String(this.selectedProducto?.in_unidad ?? '').trim()
    };

    if (detalle.de_codMerc) {
      this.detalles.push(detalle);
      // Limpiar campos de detalle
      this.entradaForm.patchValue({
        det_codMerc: '',
        det_desMerc: '',
        det_canEntr: 0,
        det_preMerc: 0
      });
      this.entradaForm.get('det_codMerc')?.enable();
      this.entradaForm.get('det_desMerc')?.enable();
      this.inputCodigo?.nativeElement.focus();
    }
  }

guardarEntrada() {

  /* =====================================================
     1️⃣ VALIDACIONES BÁSICAS
  ===================================================== */
  if (!this.detalles.length) {
    this.Toast.fire({
      title: 'Debe agregar al menos un producto',
      icon: 'warning'
    });
    this.inputCodigo?.nativeElement.focus();
    return;
  }

  const meNomSupl = String(this.entradaForm.get('me_nomSupl')?.value || '').trim();
  if (!meNomSupl) {
    this.Toast.fire({
      title: 'El nombre del suplidor es obligatorio',
      icon: 'warning'
    });
    this.inputNombreSupl?.nativeElement.focus();
    return;
  }

  /* =====================================================
     2️⃣ ARMAR CABECERA
  ===================================================== */
  const formValue = this.entradaForm.getRawValue();

  const sucursalId = this.sucursalUsuario();
  const empresaCod = String(localStorage.getItem('codigoempresa') || '').trim();

    const entradamercancias = {
    me_codEntr: null, // ⛔ se genera en backend
    me_fecEntr: this.toIsoDate(formValue.me_fecEntr),
    me_valEntr: this.calcularTotal(),
    me_codSupl: this.toIntOrNull(formValue.me_codSupl),
    me_nomSupl: formValue.me_nomSupl,
    me_facSupl: formValue.me_facSupl,
    me_ordencomp: formValue.me_ordencomp,
    me_fecSupl: this.toIsoDate(formValue.me_fecSupl),
    me_status: formValue.me_status,
    me_codVend: formValue.me_codVend,
    me_nomVend: formValue.me_nomVend,
    imgfactura: formValue.imgfactura,
    archivoPdfEntrada: this.archivoPdfEntrada,
    nota: formValue.nota,
    vendedor: formValue.vendedor,
    despachado: formValue.despachado,
    chofer: formValue.chofer,
    me_rncSupl: this.toIntOrNull(formValue.me_rncSupl),
    me_codSucu: sucursalId,
    me_codEmpr: empresaCod
  };

  /* =====================================================
     3️⃣ ARMAR DETALLE
  ===================================================== */
  const detalle = this.detalles.map(d => ({
    producto: {
      in_codmerc: d.de_codMerc,
      in_desmerc: d.de_desMerc || '',
      in_unidad: String(d.de_unidad ?? '').trim()
    },
    cantidad: Number(d.de_canEntr || 0),
    precio: Number(d.de_preMerc || 0),
    total: Number(d.de_valEntr || 0)
  }));

  /* =====================================================
     4️⃣ VALIDAR PRODUCTOS EN CATÁLOGO
  ===================================================== */
  const codigos = [...new Set(detalle.map(d => d.producto.in_codmerc))];

  forkJoin(codigos.map(c => this.servicioProducto.buscarProductosPorCodigo(c)))
    .subscribe({
      next: (resp) => {

        const faltantes: string[] = [];

        resp.forEach((r: any, i: number) => {
          const data = Array.isArray(r?.data) ? r.data : [];
          if (!data.length) faltantes.push(codigos[i]);
        });

        if (faltantes.length) {
          this.Toast.fire({
            title: `Productos no encontrados: ${faltantes.join(', ')}`,
            icon: 'error'
          });
          return;
        }

        /* =====================================================
           5️⃣ GUARDAR EN BACKEND
        ===================================================== */
        this.servicioEntradamerc
          .guardarEntradamerc({ entradamercancias, detalle })
          .subscribe({
            next: (res: any) => {

              const codigoGenerado = res?.data?.nuevoCodigo;

              if (!codigoGenerado) {
                this.Toast.fire({
                  title: 'No se recibió el código de entrada',
                  icon: 'warning'
                });
                return;
              }

              /* =====================================================
                 6️⃣ MOSTRAR CÓDIGO EN FRONTEND
              ===================================================== */
              this.entradaForm.patchValue({
                me_codEntr: codigoGenerado,
                imgfactura: res?.data?.entrada?.imgfactura || res?.data?.entrada?.IMGFACTURA || formValue.imgfactura
              });

              /* =====================================================
                 7️⃣ PREPARAR IMPRESIÓN
              ===================================================== */
              this.canPrint = true;

              this.lastSavedEntrada = {
                ...entradamercancias,
                ...(res?.data?.entrada || {}),
                me_codEntr: codigoGenerado
              };

              this.lastSavedDetalle = detalle;

              this.Toast.fire({
                title: 'Entrada guardada correctamente',
                icon: 'success'
              });
            },
            error: (err: any) => {
              console.error('Error guardando entrada en Supabase:', err);
              this.Toast.fire({
                title: 'Error guardando la entrada',
                text: this.getErrorMessage(err),
                icon: 'error'
              });
            }
          });
      },
      error: (err: any) => {
        console.error('Error validando productos:', err);
        this.Toast.fire({
          title: 'Error validando productos',
          text: this.getErrorMessage(err),
          icon: 'error'
        });
      }
    });
}

  calcularTotal(): number {
    return this.detalles.reduce((acc, curr) => acc + (curr.de_valEntr || 0), 0);
  }

  eliminarDetalle(index: number) {
    this.detalles.splice(index, 1);
  }
 
  editarDetalle(index: number) {
    const item = this.detalles[index];
    if (!item) return;
    this.entradaForm.patchValue({
      det_codMerc: item.de_codMerc,
      det_desMerc: item.de_desMerc || '',
      det_canEntr: item.de_canEntr || 0,
      det_preMerc: item.de_preMerc || 0
    });
    this.entradaForm.get('det_codMerc')?.disable();
    this.entradaForm.get('det_desMerc')?.disable();
    this.detalles.splice(index, 1);
    this.inputCantidad?.nativeElement.focus();
  }

  private getFocusableElements(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>('input.enter-next, textarea.enter-next, select.enter-next, button.enter-next'));
  }

  focusNext(event: Event) {
    event.preventDefault();
    const current = event.target as HTMLElement;
    const elements = this.getFocusableElements();
    const idx = elements.indexOf(current);
    if (idx >= 0 && idx + 1 < elements.length) {
      elements[idx + 1].focus();
    }
  }

  private focusNextFrom(el: HTMLElement | null) {
    const elements = this.getFocusableElements();
    if (!el) return;
    const idx = elements.indexOf(el);
    if (idx >= 0 && idx + 1 < elements.length) {
      elements[idx + 1].focus();
    }
  }

  onKeyDownCodigo(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const codigo = (this.entradaForm.get('det_codMerc')?.value || '').trim();
      if (codigo.length === 0) {
        this.productosBusquedaCodigo = [];
        this.entradaForm.get('det_desMerc')?.enable();
        this.focusNext(event);
        return;
      }
      this.servicioProducto.buscarProductosPorCodigo(codigo).subscribe({
        next: (response: any) => {
          const lista = (response && response.data) ? response.data : [];
          this.productosBusquedaCodigo = lista;
          if (lista.length === 0) {
            this.Toast.fire({ title: 'Código no encontrado', icon: 'warning' });
            this.entradaForm.get('det_desMerc')?.enable();
            this.inputCodigo?.nativeElement.focus();
            return;
          }
          if (lista.length === 1) {
            this.seleccionarProducto(lista[0], 'codigo');
            this.productosBusquedaCodigo = [];
            this.inputCantidad?.nativeElement.focus();
          } else {
            const exact = lista.find((p: any) => String(p.in_codmerc).toLowerCase() === codigo.toLowerCase());
            if (exact) {
              this.seleccionarProducto(exact, 'codigo');
              this.productosBusquedaCodigo = [];
              this.inputCantidad?.nativeElement.focus();
            }
          }
        },
        error: () => {
          this.productosBusquedaCodigo = [];
          this.Toast.fire({ title: 'No se pudo buscar el producto por código', icon: 'error' });
          this.inputCodigo?.nativeElement.focus();
        }
      });
    }
  }

  onKeyDownDescripcion(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const desc = (this.entradaForm.get('det_desMerc')?.value || '').trim();
      if (desc.length === 0) {
        this.productosBusquedaDesc = [];
        this.focusNext(event);
        return;
      }
      this.servicioProducto.buscarProductosPorDescripcion(desc).subscribe({
        next: (response: any) => {
          const lista = (response && response.data) ? response.data : [];
          this.productosBusquedaDesc = lista;
          if (lista.length > 0) {
            const lower = desc.toLowerCase();
            const exact = lista.find((p: any) => String(p.in_desmerc).toLowerCase() === lower);
            const starts = lista.find((p: any) => String(p.in_desmerc).toLowerCase().startsWith(lower));
            const elegido = exact || starts || lista[0];
            this.seleccionarProducto(elegido, 'descripcion');
            this.productosBusquedaDesc = [];
            this.inputCantidad?.nativeElement.focus();
          }
        },
        error: () => {
          this.productosBusquedaDesc = [];
          this.focusNext(event);
        }
      });
    }
  }

  buscarProductoPorCodigo() {
    const codigo = (this.entradaForm.get('det_codMerc')?.value || '').trim();
    if (codigo.length > 1) {
      this.servicioProducto.buscarProductosPorCodigo(codigo).subscribe({
        next: (response: any) => {
          const lista = (response && response.data) ? response.data : [];
          this.productosBusquedaCodigo = lista;
        },
        error: () => {
          this.productosBusquedaCodigo = [];
        }
      });
    } else {
      this.productosBusquedaCodigo = [];
      this.entradaForm.get('det_desMerc')?.enable();
    }
  }

  buscarProductoPorDescripcion() {
    const desc = (this.entradaForm.get('det_desMerc')?.value || '').trim();
    if (desc.length > 2) {
      this.servicioProducto.buscarProductosPorDescripcion(desc).subscribe({
        next: (response: any) => {
          const lista = (response && response.data) ? response.data : [];
          this.productosBusquedaDesc = lista;
        },
        error: () => {
          this.productosBusquedaDesc = [];
        }
      });
    } else {
      this.productosBusquedaDesc = [];
    }
  }

  seleccionarProducto(producto: any, source: 'codigo' | 'descripcion' = 'codigo') {
    this.entradaForm.patchValue({
      det_codMerc: producto.in_codmerc,
      det_desMerc: producto.in_desmerc,
      det_preMerc: Number(producto.in_premerc || 0)
    });
    this.selectedProducto = producto;
    if (source === 'codigo') {
      this.entradaForm.get('det_desMerc')?.disable();
      this.inputCantidad?.nativeElement.focus();
    }
  }
 
  onEnterPrecio(event: Event) {
    event.preventDefault();
    this.agregarDetalle();
  }
 
  private toIsoDate(d: string | Date | null | undefined): string | null {
    if (!d) return null;
    const date = typeof d === 'string' ? new Date(d) : new Date(d);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }
 
  private toIntOrNull(v: any): number | null {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    const i = Math.trunc(n);
    if (i !== n) return null;
    if (i < -2147483648 || i > 2147483647) return null;
    return i;
  }

  private getErrorMessage(err: any): string {
    const raw =
      err?.message ||
      err?.error?.message ||
      err?.details ||
      err?.hint ||
      (typeof err === 'string' ? err : '');
    const msg = String(raw || '').trim();
    return msg || 'Revise la conexion con Supabase y las columnas de la tabla entradamerc.';
  }

  private fechaHoy(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private extraerRncData(response: any): any {
    const data = response?.data;
    if (Array.isArray(data)) return data[0] || null;
    if (Array.isArray(data?.data)) return data.data[0] || null;
    return data || null;
  }

  refrescarFormulario() {
    this.canPrint = false;
    this.lastSavedEntrada = null;
    this.lastSavedDetalle = [];
    this.detalles = [];
    this.suplidoresBusqueda = [];
    this.productosBusquedaCodigo = [];
    this.productosBusquedaDesc = [];
    this.selectedProducto = null;
    this.ultimoRncBuscado = '';
    this.archivoPdfEntrada = null;
    this.nombrePdfEntrada = '';
    if (this.inputPdfEntrada?.nativeElement) {
      this.inputPdfEntrada.nativeElement.value = '';
    }
    this.entradaForm.reset({
      me_codEntr: '',
      me_fecEntr: this.fechaHoy(),
      me_codSupl: '',
      me_nomSupl: '',
      me_facSupl: '',
      me_ordencomp: '',
      me_fecSupl: new Date().toISOString().split('T')[0],
      me_status: '',
      me_codVend: '',
      me_nomVend: '',
      imgfactura: '',
      nota: '',
      vendedor: '',
      despachado: '',
      chofer: '',
      me_rncSupl: null,
      det_codMerc: '',
      det_desMerc: '',
      det_canEntr: 0,
      det_preMerc: 0
    });
    this.entradaForm.get('me_codEntr')?.disable();
    this.entradaForm.get('me_fecEntr')?.disable();
    this.entradaForm.get('det_codMerc')?.enable();
    this.entradaForm.get('det_desMerc')?.enable();
    this.inputRncSupl?.nativeElement.focus();
  }

  imprimirEntrada() {
    if (!this.canPrint || !this.lastSavedEntrada) {
      this.Toast.fire({ title: 'No hay entrada para imprimir', icon: 'warning' });
      return;
    }
    const codigo = this.lastSavedEntrada?.me_codEntr || this.lastSavedEntrada?.me_codentr || '';
    if (codigo) {
      this.servicioEntradamerc.buscarEntradamerc(1, 1, codigo).subscribe((resp: any) => {
        const arr = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
        const header = arr.length > 0 ? this.normalizarEntradaParaImpresion(arr[0]) : this.lastSavedEntrada;
        header.me_codEntr = String(arr[0]?.me_codEntr ?? arr[0]?.me_codentr ?? codigo);
        this.servicioEntradamerc.buscarEntradamercDetalle(codigo).subscribe({
          next: (dres: any) => {
            const raw = Array.isArray(dres?.data) ? dres.data : (Array.isArray(dres) ? dres : []);
            const items = raw.map((d: any) => ({
              de_codMerc: d.dc_codmerc ?? d.de_codMerc ?? d.in_codmerc ?? '',
              de_desMerc: d.dc_descrip ?? d.de_desMerc ?? d.in_desmerc ?? '',
              de_canEntr: Number(d.dc_cantidad ?? d.de_canEntr ?? 0),
              de_preMerc: Number(d.dc_precio ?? d.de_preMerc ?? 0),
              de_valEntr: Number(d.dc_total ?? d.de_valEntr ?? 0)
            }));
            this.printing.imprimirEntrada80mm(header, items);
              this.refrescarFormulario();
          },
          error: () => {
            this.printing.imprimirEntrada80mm(header, this.lastSavedDetalle || []);
              this.refrescarFormulario();
          }
        });
      }, () => {
        this.servicioEntradamerc.buscarEntradamercDetalle(codigo).subscribe({
          next: (dres: any) => {
            const raw = Array.isArray(dres?.data) ? dres.data : (Array.isArray(dres) ? dres : []);
            const items = raw.map((d: any) => ({
              de_codMerc: d.dc_codmerc ?? d.de_codMerc ?? d.in_codmerc ?? '',
              de_desMerc: d.dc_descrip ?? d.de_desMerc ?? d.in_desmerc ?? '',
              de_canEntr: Number(d.dc_cantidad ?? d.de_canEntr ?? 0),
              de_preMerc: Number(d.dc_precio ?? d.de_preMerc ?? 0),
              de_valEntr: Number(d.dc_total ?? d.de_valEntr ?? 0)
            }));
            this.printing.imprimirEntrada80mm(this.lastSavedEntrada, items);
              this.refrescarFormulario();
          },
          error: () => {
            this.printing.imprimirEntrada80mm(this.lastSavedEntrada, this.lastSavedDetalle);
              this.refrescarFormulario();
          }
        });
      });
    } else {
      this.printing.imprimirEntrada80mm(this.lastSavedEntrada, this.lastSavedDetalle);
        this.refrescarFormulario();
    }
  }

  private refrescarPantalla() {
    this.canPrint = false;
    this.lastSavedEntrada = null;
    this.lastSavedDetalle = [];
    this.selectedProducto = null;
    this.archivoPdfEntrada = null;
    this.nombrePdfEntrada = '';
    if (this.inputPdfEntrada?.nativeElement) {
      this.inputPdfEntrada.nativeElement.value = '';
    }
    this.detalles = [];
    this.entradaForm.patchValue({
      me_codEntr: '',
      det_codMerc: '',
      det_desMerc: '',
      det_canEntr: 0,
      det_preMerc: 0
    });
    this.entradaForm.get('det_codMerc')?.enable();
    this.entradaForm.get('det_desMerc')?.enable();
    this.inputCodigo?.nativeElement.focus();
  }

  seleccionarPdfEntrada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.archivoPdfEntrada = null;
      this.nombrePdfEntrada = '';
      this.entradaForm.patchValue({ imgfactura: '' });
      input.value = '';
      this.Toast.fire({
        title: 'Archivo invalido',
        text: 'Solo puede seleccionar archivos PDF.',
        icon: 'warning'
      });
      return;
    }

    this.archivoPdfEntrada = file;
    this.nombrePdfEntrada = file.name;
    this.entradaForm.patchValue({ imgfactura: file.name });
  }

  abrirSelectorPdfEntrada(): void {
    this.inputPdfEntrada?.nativeElement.click();
  }
 
  toUpper(controlName: string, event?: Event) {
    const ctrl = this.entradaForm.get(controlName);
    const target = event?.target as HTMLInputElement | HTMLTextAreaElement | undefined;
    const raw = (ctrl?.value ?? '').toString();
    const upper = raw.toUpperCase();
    if (target) {
      target.value = upper;
    }
    if (ctrl && raw !== upper) {
      ctrl.setValue(upper, { emitEvent: false });
    }
  }

  abrirConsultaEntradas() {
    this.tituloModalEntradamerc = 'Consulta Entradas';
    this.cargarEntradasListado(1);
    $('#modalEntradamerc').modal('show');
  }

  cargarEntradas(page: number) {
  const { codigo, nomcliente, fecha } = this.consultaForm.getRawValue();

  const cod = String(codigo || '').trim();
  const nom = String(nomcliente || '').trim();
  const fec = String(fecha || '').trim();

  // ⛔ Protección total: no llamar backend si no hay filtros válidos
  if (
    (!cod || cod.length < 3) &&
    (!nom || nom.length < 3) &&
    !fec
  ) {
    this.cargarEntradasListado(1);
    return;
  }

  this.currentPage = page;

  this.servicioEntradamerc
    .buscarEntradamerc(
      this.currentPage,
      100, // cuando hay filtro traemos más
        cod || undefined,
        nom || undefined,
        fec || undefined,
        this.sucursalUsuario()
      )
    .subscribe({
      next: (response: any) => {
        this.entradamercList = Array.isArray(response?.data) ? response.data : [];
        this.totalItems =
          response?.pagination?.total ?? this.entradamercList.length;
      },
      error: () => {
        // ⛔ nunca romper la UI
        this.entradamercList = [];
        this.totalItems = 0;
      }
    });
}


//   cargarEntradas(page: number) {
//   this.currentPage = page;

//   const { codigo, nomcliente, fecha } = this.consultaForm.getRawValue();
//   const hasFilter = !!((codigo && codigo.trim()) || (nomcliente && nomcliente.trim()) || (fecha && fecha.trim()));
//   const effectiveLimit = hasFilter ? 100 : this.pageSize;

//   this.servicioEntradamerc
//     .buscarEntradamerc(
//       this.currentPage,
//       effectiveLimit,
//       codigo?.trim() || undefined,
//       nomcliente?.trim() || undefined,
//       fecha?.trim() || undefined
//     )
//     .subscribe(
//       (response: any) => {
//         this.entradamercList = response.data || [];
//         this.totalItems = response.pagination?.total ?? this.entradamercList.length; // ✅ FIX
//       },
//       () => {
//         this.cargarEntradasListado(1);
//       }
//     );
// }


 cargarEntradasListado(page: number) {
  this.currentPage = page;

  this.servicioEntradamerc
    .buscarTodasEntradamerc(this.currentPage, this.pageSize, this.sucursalUsuario())
    .subscribe(
      (response: any) => {
        this.entradamercList = response.data || [];
        this.totalItems = response.pagination?.total ?? 0; // ✅ FIX
      },
      () => {
        this.entradamercList = [];
        this.totalItems = 0;
      }
    );
}


  buscarEntradas() {
    const { codigo, nomcliente, fecha } = this.consultaForm.getRawValue();
    if ((codigo && codigo.trim()) || (nomcliente && nomcliente.trim()) || (fecha && fecha.trim())) {
      this.cargarEntradas(1);
    } else {
      this.cargarEntradasListado(1);
    }
  }

  private tieneFiltroConsulta(): boolean {
    const { codigo, nomcliente, fecha } = this.consultaForm.getRawValue();
    return !!((codigo && codigo.trim()) || (nomcliente && nomcliente.trim()) || (fecha && fecha.trim()));
  }

  // get totalPages(): number {
  //   const pages = Math.ceil((this.totalItems || 0) / (this.pageSize || 1));
  //   return Math.max(1, pages);
  // }
get totalPages(): number {
  return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
}

  get pagesToShow(): number[] {
    const total = this.totalPages;
    const maxShow = Math.max(1, this.maxPagesToShow || 5);
    let start = Math.max(1, this.currentPage - Math.floor(maxShow / 2));
    let end = Math.min(total, start + maxShow - 1);
    if ((end - start + 1) < maxShow) {
      start = Math.max(1, end - maxShow + 1);
    }
    const pages: number[] = [];
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }

  irAPagina(page: number) {
    const p = Math.min(Math.max(1, page), this.totalPages);
    this.currentPage = p;
    if (this.tieneFiltroConsulta()) {
      this.cargarEntradas(p);
    } else {
      this.cargarEntradasListado(p);
    }
  }

  paginaAnterior() {
    if (this.currentPage > 1) this.irAPagina(this.currentPage - 1);
  }


  paginaSiguiente() {
    if (this.currentPage < this.totalPages) this.irAPagina(this.currentPage + 1);
  }

  private aplicarFiltroLocal(items: any[], codigo: string, nomcliente: string, fecha: string): any[] {
    const c = (codigo || '').toLowerCase();
    const n = (nomcliente || '').toLowerCase();
    const f = (fecha || '');
    return items.filter((e: any) => {
      const cod = String(e.me_codEntr ?? e.me_codentr ?? '').toLowerCase();
      const nom = String(e.me_nomSupl ?? e.me_nomsupl ?? '').toLowerCase();
      const fec = String(e.me_fecEntr ?? e.me_fecentr ?? '');
      const byCod = c ? cod.includes(c) : true;
      const byNom = n ? nom.includes(n) : true;
      const byFec = f ? fec.startsWith(f) : true;
      return byCod && byNom && byFec;
    });
  }

  
  refrescarModalConsulta() {
    this.consultaForm.reset({ codigo: '', nomcliente: '', fecha: '' });
    this.entradaSeleccionada = null;
    this.detalleConsulta = [];
    this.cargarEntradasListado(1);
  }

  private setupAutoBuscarConsulta() {
  const codigoCtrl = this.consultaForm.get('codigo');
  const nomCtrl = this.consultaForm.get('nomcliente');
  const fechaCtrl = this.consultaForm.get('fecha');

  const ejecutarBusqueda = () => {
    const { codigo, nomcliente, fecha } = this.consultaForm.getRawValue();

    const cod = String(codigo || '').trim();
    const nom = String(nomcliente || '').trim();
    const fec = String(fecha || '').trim();

    const hayFiltro =
      (cod && cod.length >= 3) ||
      (nom && nom.length >= 3) ||
      !!fec;

    if (hayFiltro) {
      this.cargarEntradas(1);
    } else {
      this.cargarEntradasListado(1);
    }
  };

  codigoCtrl?.valueChanges
    .pipe(debounceTime(400), distinctUntilChanged())
    .subscribe(() => ejecutarBusqueda());

  nomCtrl?.valueChanges
    .pipe(debounceTime(400), distinctUntilChanged())
    .subscribe(() => ejecutarBusqueda());

  fechaCtrl?.valueChanges
    .pipe(debounceTime(400), distinctUntilChanged())
    .subscribe(() => ejecutarBusqueda());
}


  // private setupAutoBuscarConsulta() {
  //   const codigoCtrl = this.consultaForm.get('codigo');
  //   const nomCtrl = this.consultaForm.get('nomcliente');
  //   const fechaCtrl = this.consultaForm.get('fecha');
  //   codigoCtrl?.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((v) => {
  //     const s = String(v || '').trim();
  //     if (s.length >= 3) {
  //       this.cargarEntradas(1);
  //     } else {
  //       this.cargarEntradasListado(1);
  //     }
  //   });
  //   nomCtrl?.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((v) => {
  //     const s = String(v || '').trim();
  //     if (s.length >= 3) {
  //       this.cargarEntradas(1);
  //     } else {
  //       this.cargarEntradasListado(1);
  //     }
  //   });
  //   fechaCtrl?.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((v) => {
  //     const s = String(v || '').trim();
  //     if (s) {
  //       this.cargarEntradas(1);
  //     } else {
  //       this.cargarEntradasListado(1);
  //     }
  //   });
  // }

  verDetalleEntrada(entrada: any) {
    this.entradaSeleccionada = entrada;
    const codigo = entrada?.me_codEntr || entrada?.me_codentr || '';
    if (!codigo) {
      this.detalleConsulta = [];
      return;
    }
    this.servicioEntradamerc.buscarEntradamercDetalle(`${codigo}?limit=9999`).subscribe((res: any) => {
      const raw = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : (Array.isArray(res?.detalle) ? res.detalle : []));
      this.detalleConsulta = raw.map((d: any) => ({
        de_codMerc: d.dc_codmerc ?? d.DC_CODMERC ?? d.de_codMerc ?? d.DE_CODMERC ?? d.in_codmerc ?? '',
        de_desMerc: d.dc_descrip ?? d.DC_DESCRIP ?? d.de_desMerc ?? d.DE_DESMERC ?? d.in_desmerc ?? '',
        de_canEntr: Number(d.dc_cantidad ?? d.DC_CANTIDAD ?? d.de_canEntr ?? d.DE_CANENTR ?? 0),
        de_preMerc: Number(d.dc_precio ?? d.DC_PRECIO ?? d.de_preMerc ?? d.DE_PREMERC ?? 0),
        de_valEntr: Number(d.dc_total ?? d.DC_TOTAL ?? d.de_valEntr ?? d.DE_VALENTR ?? (((d.dc_cantidad ?? d.DC_CANTIDAD ?? 0) * (d.dc_precio ?? d.DC_PRECIO ?? 0)) || 0))
      }));
    }, () => {
      this.detalleConsulta = [];
    });
  }

  private normalizarEntradaParaImpresion(e: any) {
    return {
      me_codEntr: e?.me_codEntr ?? e?.me_codentr ?? '',
      me_fecEntr: e?.me_fecEntr ?? e?.me_fecentr ?? null,
      me_nomSupl: e?.me_nomSupl ?? e?.me_nomsupl ?? '',
      me_facSupl: e?.me_facSupl ?? e?.me_facsupl ?? '',
      me_ordencomp: e?.me_ordencomp ?? e?.ME_ORDENCOMP ?? '',
      me_fecSupl: e?.me_fecSupl ?? e?.me_fecsupl ?? null,
      me_rncSupl: e?.me_rncSupl ?? e?.me_rncsupl ?? null,
      me_status: e?.me_status ?? e?.ME_STATUS ?? '',
      me_nomVend: e?.me_nomVend ?? e?.ME_NOMVEND ?? e?.me_nomvend ?? '',
      vendedor: e?.me_vendedor ?? e?.ME_VENDEDOR ?? e?.vendedor ?? '',
      despachado: e?.me_despachado ?? e?.ME_DESPACHADO ?? e?.despachado ?? '',
      chofer: e?.me_chofer ?? e?.ME_CHOFER ?? e?.chofer ?? '',
      nota: e?.nota ?? e?.ME_NOTA ?? e?.me_nota ?? ''
    };
  }

  imprimirEntradaConsulta() {
    if (!this.entradaSeleccionada) {
      this.Toast.fire({ title: 'Seleccione una entrada para imprimir', icon: 'warning' });
      return;
    }
    const header = this.normalizarEntradaParaImpresion(this.entradaSeleccionada);
    const items = this.detalleConsulta || [];
    this.printing.imprimirEntrada80mm(header, items);
  }
}
