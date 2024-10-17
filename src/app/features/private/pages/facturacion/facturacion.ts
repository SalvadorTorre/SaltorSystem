import { ServicioFacturacion } from 'src/app/core/services/Facturacion/factura/factura.service';
import { Inventario } from './../mantenimientos/pages/inventario-page/inventario';
import { Component, NgModule, OnInit, ViewChild, ElementRef, ɵNG_COMP_DEF } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, from, switchMap, tap } from 'rxjs';
import Swal from 'sweetalert2';
import { ModeloUsuarioData } from 'src/app/core/services/mantenimientos/usuario';
import { ModeloRncData } from 'src/app/core/services/mantenimientos/rnc';
import { ServicioRnc } from 'src/app/core/services/mantenimientos/rnc/rnc.service';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { FacturacionModelData, detFacturaData } from 'src/app/core/services/facturacion/factura';
import { ServicioCliente } from 'src/app/core/services/mantenimientos/clientes/cliente.service';
import { HttpInvokeService } from 'src/app/core/services/http-invoke.service';
import { ModeloCliente, ModeloClienteData } from 'src/app/core/services/mantenimientos/clientes';
import { FacturaDetalleModel, interfaceDetalleModel } from 'src/app/core/services/facturacion/factura/factura';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import { ModeloInventario, ModeloInventarioData } from 'src/app/core/services/mantenimientos/inventario';
import { Usuario } from '../mantenimientos/pages/usuario-page/usuario';
declare var $: any;

@Component({
  selector: 'facturacion',
  templateUrl: './facturacion.html',
  styleUrls: ['./facturacion.css']
})


export class Facturacion implements OnInit {
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
  totalGral: number = 0;
  totalItbis: number = 0;
  subTotal: number = 0;
  static detFactura: detFacturaData[];
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


  private codigoSubject = new BehaviorSubject<string>('');
  private nomclienteSubject = new BehaviorSubject<string>('');

  isDisabled: boolean = true;
  form: FormGroup ;
  constructor(
    private fb: FormBuilder,
    private servicioFacturacion: ServicioFacturacion,
    private servicioCliente: ServicioCliente,
    private http: HttpInvokeService,
    private servicioInventario: ServicioInventario,
    private ServicioUsuario: ServicioUsuario,
    private ServicioRnc: ServicioRnc
  ) {
    this.form = this.fb.group({
      fa_codVend: ['', Validators.required], // El campo es requerido
      // Otros campos...
    });

    this.crearFormularioFacturacion();
    console.log(this.formularioFacturacion.value);

    this.nomclienteSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(nomcliente => {
        this.txtdescripcion = nomcliente;
        return this.servicioFacturacion.buscarFacturacion(this.currentPage, this.pageSize, this.codigo, this.txtdescripcion);
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
  selectedIndex = 1;
  buscarcodmerc = new FormControl();
  buscardescripcionmerc = new FormControl();
  // buscarcodmercElement = new FormControl();
  nativeElement = new FormControl();
  resultadoCodmerc: ModeloInventarioData[] = [];
  selectedIndexcodmerc = 1;
  resultadodescripcionmerc: ModeloInventarioData[] = [];
  selectedIndexcoddescripcionmerc = 1;
  seleccionarFacturacion(facturacion: any) { this.selectedFacturacion = facturacion; }


  ngOnInit(): void {
    this.buscarTodasFacturacion(1);
    // this.buscarcodmerc.valueChanges.pipe(
    //   debounceTime(50),
    //   distinctUntilChanged(),
    //   tap(() => {
    //     this.resultadoCodmerc = [];
    //   }),
    //   filter((query: string) => query.trim() !== '' && !this.cancelarBusquedaCodigo && !this.isEditing),
    //   switchMap((query: string) => this.http.GetRequest<ModeloInventario>(`/productos-buscador/${query}`))
    // ).subscribe((results: ModeloInventario) => {
    //   console.log(results.data);
    //   if (results) {
    //     if (Array.isArray(results.data) && results.data.length) {
    //       // Aquí ordenamos los resultados por el campo 'nombre' (puedes cambiar el campo según tus necesidades)
    //       this.resultadoCodmerc = results.data.sort((a, b) => {
    //         return a.in_codmerc.localeCompare(b.in_codmerc, undefined, { numeric: true, sensitivity: 'base' });
    //       });
    //       // Aquí seleccionamos automáticamente el primer ítem
    //       this.selectedIndex = -1;

    //       this.codnotfound = false;
    //     } else {
    //       this.codnotfound = true;
    //       return;
    //     }
    //   } else {
    //     this.resultadoCodmerc = [];
    //     this.codnotfound = false;

    //     return;
    //   }

    // });

    // this.buscardescripcionmerc.valueChanges.pipe(
    //   debounceTime(50),
    //   distinctUntilChanged(),
    //   tap(() => {
    //     this.resultadodescripcionmerc = [];
    //   }),
    //   filter((query: string) => query !== '' && !this.cancelarBusquedaDescripcion && !this.isEditing),
    //   switchMap((query: string) => this.http.GetRequest<ModeloInventario>(`/productos-buscador-desc/${query}`))
    // ).subscribe((results: ModeloInventario) => {
    //   console.log(results.data);
    //   if (results) {
    //     if (Array.isArray(results.data) && results.data.length) {
    //       this.resultadodescripcionmerc = results.data;
    //       this.desnotfound = false;
    //     }
    //     else {
    //       this.desnotfound = true;
    //     }
    //   } else {
    //     this.resultadodescripcionmerc = [];
    //     this.desnotfound = false;
    //   }

    // });
    this.buscarNombre.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      tap(() => {
        this.resultadoNombre = [];
      }),
      filter((query: string) => query !== ''),
      switchMap((query: string) => this.http.GetRequest<ModeloCliente>(`/cliente-nombre/${query}`))
    ).subscribe((results: ModeloCliente) => {
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



  crearFormularioFacturacion() {
      const fechaActual = new Date();
      const fechaActualStr = this.formatofecha(fechaActual);
      this.formularioFacturacion = this.fb.group({
        fa_codFact: [''],
        fa_fecFact: [fechaActualStr],
        fa_valFact: [''],
        fa_itbiFact: [''],
        fa_codClie: [''],
        fa_cosfact:[''],
        fa_nomClie: [''],
        fa_rncFact: [''],
        fa_telClie: [''],
        fa_dirClie: [''],
        fa_correo: [''],
        fa_codVend: ['', Validators.required],
        fa_nomVend: [''],
        fa_status: [''],
        fa_codZona: [''],
        fa_fpago:[''],
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

        dc_codcoti: ['',],
        dc_codmerc: ['',],
        dc_descrip: ['',],
        dc_canmerc: ['',],
        dc_premerc: ['',],
        dc_valmerc: ['',],
        dc_unidad: ['',],
        dc_costmer: ['',],
        dc_codclie: ['',],
        dc_status: ['',],

      });
    }

    buscarTodasFacturacion(page: number) {
      this.servicioFacturacion.buscarTodasFacturacion(page, this.pageSize).subscribe(response => {
        console.log(response);
        this.facturacionList = response.data;
      });
    }


    buscarRnc(event: Event, nextElement: HTMLInputElement | null): void {
      event.preventDefault();
      const rnc = this.formularioFacturacion.get('fa_rncFact')?.value;
      if (rnc) {
        if (rnc.length === 9 || rnc.length === 11) {
          this.ServicioRnc.buscarRncPorId(rnc).subscribe(
            (rnc) => {
              console.log(rnc.data);
              if (rnc.data.length) {
                this.formularioFacturacion.patchValue({ fa_nomClie: rnc.data[0].rason });
                nextElement?.focus()
              } else {
                this.mensagePantalla = true;

                Swal.fire({
                  icon: "error",
                  title: "A V I S O",
                  text: 'Rnc invalido.',
                }).then(() => { this.mensagePantalla = false });
                return;
              }
            }
          );
        }
        else {
          this.mensagePantalla = true;
          Swal.fire({
            icon: "error",
            title: "A V I S O",
            text: 'Rnc invalido.',

          }).then(() => { this.mensagePantalla = false });
          return;
        }
        this.mensagePantalla = false;
      }
      else {
        nextElement?.focus()
      }
      this.mensagePantalla = false;
    }
}
