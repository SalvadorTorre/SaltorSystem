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
  switchMap,
  tap,
} from 'rxjs';
import Swal from 'sweetalert2';
import { ModeloUsuarioData } from 'src/app/core/services/mantenimientos/usuario';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
import { ServicioVentainterna } from 'src/app/core/services/almacen/ventainterna/ventainterna.service';
import {
  VentainternaModelData,
  detVentainternaData,
} from 'src/app/core/services/almacen/ventainterna';
//import { ServiciodetVentainterna } from 'src/app/core/services/almacen/detventainterna/detventainterna.service';
import { ServicioCliente } from 'src/app/core/services/mantenimientos/clientes/cliente.service';
import { HttpInvokeService } from 'src/app/core/services/http-invoke.service';
import {
  ModeloCliente,
  ModeloClienteData,
} from 'src/app/core/services/mantenimientos/clientes';
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
declare var $: any;
@Component({
  selector: 'Ventainterna',
  templateUrl: './ventainterna.html',
  styleUrls: ['./ventainterna.css'],
})
export class Ventainterna implements OnInit {
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

  private codigoSubject = new BehaviorSubject<string>('');
  private nomclienteSubject = new BehaviorSubject<string>('');

  isDisabled: boolean = true;
  form: FormGroup;
  constructor(
    private fb: FormBuilder,
    private servicioVentainterna: ServicioVentainterna,
    private servicioCliente: ServicioCliente,
    private http: HttpInvokeService,
    private servicioInventario: ServicioInventario,
    private ServicioUsuario: ServicioUsuario
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
          this.txtdescripcion = nomcliente;
          return this.servicioVentainterna.buscarVentainterna(
            this.currentPage,
            this.pageSize,
            this.codigo,
            this.txtdescripcion
          );
        })
      )
      .subscribe((response) => {
        this.ventainternaList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = response.pagination.page;
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
  seleccionarVentainterna(ventainterna: any) {
    this.selectedVentainterna = ventainterna;
  }

  ngOnInit(): void {
    this.buscarTodasVentainterna(1);
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
        switchMap((query: string) =>
          this.http.GetRequest<ModeloInventario>(`/productos-buscador/${query}`)
        )
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
            query !== '' && !this.cancelarBusquedaDescripcion && !this.isEditing
        ),
        switchMap((query: string) =>
          this.http.GetRequest<ModeloInventario>(
            `/productos-buscador-desc/${query}`
          )
        )
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
          this.http.GetRequest<ModeloCliente>(`/cliente-nombre/${query}`)
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
  }

  crearFormularioVentainterna() {
    const fechaActual = new Date();
    const fechaActualStr = this.formatofecha(fechaActual);
    this.formularioVentainterna = this.fb.group({
      fa_codFact: [''],
      fa_fecFact: [fechaActualStr],
      fa_valFact: [''],
      fa_codClie: [''],
      fa_nomClie: [''],
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
    this.tituloModalVentainterna = 'Nueva Ventainterna';
    $('#modalventainterna').modal('show');
    this.habilitarFormulario = true;
    this.formularioVentainterna.get('fa_codFact')!.disable();
    this.formularioVentainterna.get('fa_fecFact')!.disable();
    this.formularioVentainterna.get('fa_nomVend')!.disable();
    setTimeout(() => {
      $('#input1').focus();
    }, 500); // Asegúrate de que el tiempo sea suficiente para que el modal se abra completamente
  }

  cerrarModalVentainterna() {
    this.habilitarFormulario = false;
    this.formularioVentainterna.reset();
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
    this.formularioVentainterna.patchValue(Ventainterna);
    this.tituloModalVentainterna = 'Editando Ventainterna';
    $('#modalventainterna').modal('show');
    this.habilitarFormulario = true;
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
        });
        // Calcular el total general (subtotal + ITBIS)
        totalGeneral = subtotal;
        // Asignar los totales a variables o mostrarlos en la interfaz
        this.subTotal = subtotal;
        //this.totalItbis = this.totalItbis;
        this.totalGral = totalGeneral;
      });
  }

  buscarTodasVentainterna(page: number) {
    this.servicioVentainterna
      .buscarTodasVentainterna(page, this.pageSize)
      .subscribe((response) => {
        console.log(response);
        this.ventainternaList = response.data;
      });
  }
  consultarVentainterna(Ventainterna: VentainternaModelData) {
    this.modoconsultaVentainterna = true;
    this.formularioVentainterna.patchValue(Ventainterna);
    this.tituloModalVentainterna = 'Consulta Ventainterna';
    $('#modalventainterna').modal('show');
    this.habilitarFormulario = true;
    this.formularioVentainterna.disable();
    this.habilitarIcono = false;

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
        let itbis = 0;
        let totalGeneral = 0;
        // const itbisRate = 0.18; // Ejemplo: 18% de ITBIS

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
        });

        // Calcular el total general (subtotal + ITBIS)
        totalGeneral = subtotal;

        // Asignar los totales a variables o mostrarlos en la interfaz
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
    this.codigoBuscar.next(inputElement.value.toUpperCase());
  }

  guardarVentainterna() {
    const date = new Date();
    this.formularioVentainterna.get('fa_valFact')?.patchValue(this.totalGral);
    this.formularioVentainterna.get('fa_codFact')!.enable();
    this.formularioVentainterna.get('fa_fecFact')!.enable();
    this.formularioVentainterna.get('fa_nomVend')!.enable();
    const payload = {
      ventainterna: this.formularioVentainterna.value,
      detalle: this.items,
      idVentainterna: this.formularioVentainterna.get('fa_codFact')?.value,
    };

    if (this.formularioVentainterna.valid) {
      if (this.modoedicionVentainterna) {
        this.servicioVentainterna
          .editarVentainterna(
            this.ventainternaid,
            this.formularioVentainterna.value
          )
          .subscribe((response) => {
            Swal.fire({
              title: 'Excelente!',
              text: 'Ventainterna Editada correctamente.',
              icon: 'success',
              timer: 5000,
              showConfirmButton: false,
            });
            this.buscarTodasVentainterna(1);
            this.formularioVentainterna.reset();
            this.crearFormularioVentainterna();
            $('#modalventainterna').modal('hide');
          });
      } else {
        if (this.formularioVentainterna.valid) {
          this.servicioVentainterna
            .guardarVentainterna(payload)
            .subscribe((response) => {
              Swal.fire({
                title: 'Excelente!',
                text: 'Ventainterna creada correctamente.',
                icon: 'success',
                timer: 1000,
                showConfirmButton: false,
              });
              this.buscarTodasVentainterna(1);
              this.formularioVentainterna.reset();
              this.crearFormularioVentainterna();
              this.formularioVentainterna.enable();
              $('#modalventainterna').modal('hide');
            });
        } else {
          console.log(this.formularioVentainterna.value);
        }
      }
    } else {
      alert('Esta Empresa no fue Guardado');
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

  buscarClienteporNombre() {
    this.servicioCliente
      .buscarporNombre(this.formularioVentainterna.get('fa_nomClie')!.value)
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

  cargarDatosCliente(cliente: ModeloClienteData) {
    this.resultadoNombre = [];
    this.buscarNombre.reset();
    if (cliente.cl_nomClie !== '') {
      this.formularioVentainterna.patchValue({
        fa_codClie: cliente.cl_codClie,
        fa_nomClie: cliente.cl_nomClie,
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
    const claveUsuario = this.formularioVentainterna.get('fa_codVend')?.value;
    if (claveUsuario) {
      this.ServicioUsuario.buscarUsuarioPorClave(claveUsuario).subscribe(
        (usuario) => {
          if (usuario.data.length) {
            this.formularioVentainterna.patchValue({
              fa_nomVend: usuario.data[0].idUsuario,
            });
            nextElement?.focus();
            console.log(usuario.data[0].idUsuario);
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
            console.log('Vendedor no encontrado');
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
      this.cerrarModalVentainterna();
    }
  }

  onBlur(event: any): void {
    const value = event.target.value;

    // Si el valor no está vacío, lo asignamos al formControl
    if (value && value.trim() !== '') {
      this.formularioVentainterna.get('fae_nomClie')!.setValue(value.trim());
    }
  }
}
