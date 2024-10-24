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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  subtotaltxt: string = '';
  itbitxt: string = '';
  totalgraltxt: string = '';
  descuentotxt: string = '';
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
  rncValue: string = '';
  cancelarBusquedaDescripcion: boolean = false;
  cancelarBusquedaCodigo: boolean = false;
  private codigoSubject = new BehaviorSubject<string>('');
  private nomclienteSubject = new BehaviorSubject<string>('');
selectedRow: number = -1; // Para rastrear la fila seleccionada

  isDisabled: boolean = true;
  form: FormGroup;
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
    this.buscarcodmerc.valueChanges.pipe(
      debounceTime(50),
      distinctUntilChanged(),
      tap(() => {
        this.resultadoCodmerc = [];
      }),
      filter((query: string) => query.trim() !== '' && !this.cancelarBusquedaCodigo && !this.isEditing),
      switchMap((query: string) => this.http.GetRequest<ModeloInventario>(`/productos-buscador/${query}`))
    ).subscribe((results: ModeloInventario) => {
      console.log(results.data);
      if (results) {
        if (Array.isArray(results.data) && results.data.length) {
          // Aquí ordenamos los resultados por el campo 'nombre' (puedes cambiar el campo según tus necesidades)
          this.resultadoCodmerc = results.data.sort((a, b) => {
            return a.in_codmerc.localeCompare(b.in_codmerc, undefined, { numeric: true, sensitivity: 'base' });
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

        return;
      }

    });


    this.buscardescripcionmerc.valueChanges.pipe(
      debounceTime(50),
      distinctUntilChanged(),
      tap(() => {
        this.resultadodescripcionmerc = [];
      }),
      filter((query: string) => query !== '' && !this.cancelarBusquedaDescripcion && !this.isEditing),
      switchMap((query: string) => this.http.GetRequest<ModeloInventario>(`/productos-buscador-desc/${query}`))
    ).subscribe((results: ModeloInventario) => {
      console.log(results.data);
      if (results) {
        if (Array.isArray(results.data) && results.data.length) {
          this.resultadodescripcionmerc = results.data;
          this.desnotfound = false;
        }
        else {
          this.desnotfound = true;
        }
      } else {
        this.resultadodescripcionmerc = [];
        this.desnotfound = false;
      }

    });

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
      fa_cosFact: [''],
      fa_nomClie: [''],
      fa_rncFact: [''],
      fa_telClie: [''],
      fa_telClie2: [''],
      fa_dirClie: [''],
      fa_correo: [''],
      fa_codVend: ['', Validators.required],
      fa_nomVend: [''],
      fa_status: [''],
      fa_sector: [''],
      fa_codZona: [''],
      fa_fpago: [''],
      fa_envio: [''],
      fa_ncfFact: [''],
      fa_tipoNcf: [''],
      fa_contacto:[''],

    });

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
    this.servicioFacturacion.buscarFacturaDetalle(Factura.fa_codFact).subscribe(response => {
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
        const cantidad  = item.df_canMerc;
        const precio    = item.df_preMerc;
        const totalItem = cantidad * precio;
        this.items.push({
          producto: producto,
          cantidad: cantidad,
          precio: precio,
          total: totalItem
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

  buscarTodasFactura(page: number) {
    this.servicioFacturacion.buscarTodasFacturacion(page, this.pageSize).subscribe(response => {
      console.log(response);
      this.facturacionList = response.data;
    });
  }
  consultarFacturacion(Factura: FacturacionModelData) {
    this.modoconsultaFacturacion = true;
    this.formularioFacturacion.patchValue(Factura);
    this.tituloModalFacturacion = 'Consulta Factura';
   // $('#modalfacturacion').modal('show');
    this.habilitarFormulario = true;
    this.formularioFacturacion.disable();
    this.habilitarIcono = false;

    const inputs = document.querySelectorAll('.seccion-productos input');
    inputs.forEach((input) => {
      (input as HTMLInputElement).disabled = true;
    });

    // Limpiar los items antes de agregar los nuevos
    this.items = [];


    this.servicioFacturacion.buscarFacturaDetalle(Factura.fa_codFact).subscribe(response => {
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

        const cantidad = item.df_canMerc;
        const precio = item.df_preMerc;
        const totalItem = cantidad * precio;

        this.items.push({
          producto: producto,
          cantidad: cantidad,
          precio: precio,
          total: totalItem
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

  eliminarFacturacion(facturacionId: string) {
    Swal.fire({
      title: '¿Está seguro de eliminar este Facturacion?',
      text: "¡No podrá revertir esto!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si, eliminar!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.servicioFacturacion.eliminarFacturacion(facturacionId).subscribe(response => {
          Swal.fire(
            {
              title: "Excelente!",
              text: "Empresa eliminado correctamente.",
              icon: "success",
              timer: 2000,
              showConfirmButton: false,
            }
          )
          this.buscarTodasFacturacion(this.currentPage);
        });
      }
    })
  }

  formatofecha(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Los meses son 0-indexados, se agrega 1 y se llena con ceros
    const day = date.getDate().toString().padStart(2, '0'); // Se llena con ceros si es necesario
    return `${day}/${month}/${year}`;
  }

  crearformulariodetFactura() {
    this.formulariodetFactura = this.fb.group({

      df_codFact: ['',],
      df_codMerc: ['',],
      df_desMerc: ['',],
      df_canMerc: ['',],
      df_preMerc: ['',],
      df_valMerc: ['',],
      df_unidad: ['',],
      df_costMer: ['',],
      df_codClie: ['',],
      df_status: ['',],

    });
  }

  buscarTodasFacturacion(page: number) {
    this.servicioFacturacion.buscarTodasFacturacion(page, this.pageSize).subscribe(response => {
      this.facturacionList = response.data;
    });
  }


  descripcionEntra(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.nomclienteSubject.next(inputElement.value.toUpperCase());
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

  moveFocuscodmerc(event: KeyboardEvent, nextInput: HTMLInputElement) {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault(); // Previene el comportamiento predeterminado de Enter
      // const currentControl = this.formularioFacturacion.get('ct_codvend');
      const currentInputValue = (event.target as HTMLInputElement).value.trim();
      if (currentInputValue === '') {
        this.codmerVacio = true;
      }
      else {
        this.codmerVacio = false;
      }
      if (!this.codnotfound === false) {
        console.log(this.codnotfound);
        this.mensagePantalla = true;
        Swal.fire({
          icon: "error",
          title: "A V I S O",
          text: 'Codigo invalido.',
          focusConfirm: true,
          allowEnterKey: true,
        }).then(() => { this.mensagePantalla = false });
        this.codmerVacio = false;
        this.codnotfound = false;
        this.codmerc = ""
        this.descripcionmerc = ""
        return;
      }
      else {
        if (this.codmerVacio === true) {
          nextInput.focus();
          this.codmerVacio = false;
          console.log("vedadero");
        }
        else {
          $("#input8").focus();
          $("#input8").select();
        }
        this.codmerVacio = false;
      }
    }
  }
  handleKeydownInventario(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadoCodmerc.length;
    if (key === 'ArrowDown') {
      console.log("paso");
      this.selectedIndexcodmerc = this.selectedIndexcodmerc < maxIndex ? this.selectedIndexcodmerc + 1 : 0;
      event.preventDefault();
    }
    else
      if (key === 'ArrowUp') {
        console.log("paso2");
        this.selectedIndexcodmerc = this.selectedIndexcodmerc > 0 ? this.selectedIndexcodmerc - 1 : maxIndex;
        event.preventDefault();
      }
      else if (key === 'Enter') {
        if (this.selectedIndexcodmerc >= 0 && this.selectedIndexcodmerc <= maxIndex) {
          this.cargarDatosInventario(this.resultadoCodmerc[this.selectedIndexcodmerc]);
        }
        event.preventDefault();
      }
  }
  cargarDatosInventario(inventario: ModeloInventarioData) {
    console.log(inventario);
    this.resultadoCodmerc = [];
    this.resultadodescripcionmerc = [];
    this.codmerc = inventario.in_codmerc;
    this.preciomerc = inventario.in_premerc
    this.descripcionmerc = inventario.in_desmerc;
    this.productoselect = inventario;
    this.cancelarBusquedaDescripcion = true;
    this.cancelarBusquedaCodigo = true;
    this.formularioFacturacion.patchValue({
      df_codMerc: inventario.in_codmerc,
      df_desMerc: inventario.in_desmerc,
      df_canMerc: inventario.in_canmerc,
      df_preMerc: inventario.in_premerc,
      df_cosMerc: inventario.in_cosmerc,
      df_unidad: inventario.in_unidad,
    });
    $("#input8").focus();
    $("#input8").select();
  }

  buscarRnc(event: Event, nextElement: HTMLInputElement | null): void {
    event.preventDefault();

    const rnc = this.formularioFacturacion.get('fa_rncFact')?.value;
    // const rnc = this.rncValue;
    console.log("VALOR", rnc);
    if (!rnc) {
      console.log('RNC no Ingresado');
      this.formularioFacturacion.patchValue({ fa_tipoNcf: "Consumidor Fina"});

      // Si no se ha ingresado un RNC, pasamos el foco al siguiente elemento
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
    this.ServicioRnc.buscarRncPorId(rnc).subscribe(
      (response) => {
        if (response?.data?.length) {
          // Si se encuentra el RNC, asignar el nombre del cliente
          const nombreEmpresa = response.data[0]?.rason;
          this.formularioFacturacion.patchValue({ fa_nomClie: nombreEmpresa });
          this.formularioFacturacion.patchValue({ fa_tipoNcf: "Factura con Valor Fiscal"});
         //nextElement?.focus();  // Pasar el foco al siguiente campo
          $("#input3").focus();
          $("#input3").select();
        } else {
          // Si no se encuentra el RNC, mostrar error
          console.log('RNC no encontrado.');
        }
      },
      (error) => {
        // Manejar errores de la llamada al servicio
        this.mostrarMensajeError('Error al buscar el RNC.');
      }
    );
  }

  mostrarMensajeError(mensaje: string): void {
    this.mensagePantalla = true;

    Swal.fire({
      icon: "error",
      title: "A V I S O",
      text: mensaje,
    }).then(() => { this.mensagePantalla = false });
  }
  handleKeydown(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadoNombre.length - 1;  // Ajustamos el límite máximo

    if (key === 'ArrowDown') {
      console.log("paso 56");

      // Mueve la selección hacia abajo
      if (this.selectedIndex < maxIndex) {
        this.selectedIndex++;
      } else {
        this.selectedIndex = 0;  // Vuelve al primer ítem
      }
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      console.log("paso 677");

      // Mueve la selección hacia arriba
      if (this.selectedIndex > 0) {
        this.selectedIndex--;
      } else {
        this.selectedIndex = maxIndex;  // Vuelve al último ítem
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
  handleKeydownInventariosdesc(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadodescripcionmerc.length;
    if (key === 'ArrowDown') {
      // Mueve la selección hacia abajo
      this.selectedIndexcoddescripcionmerc = this.selectedIndexcoddescripcionmerc < maxIndex ? this.selectedIndexcoddescripcionmerc + 1 : 0;
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      // Mueve la selección hacia arriba
      this.selectedIndexcoddescripcionmerc = this.selectedIndexcoddescripcionmerc > 0 ? this.selectedIndexcoddescripcionmerc - 1 : maxIndex;
      event.preventDefault();
    } else if (key === 'Enter') {
      // Selecciona el ítem actual
      if (this.selectedIndexcoddescripcionmerc >= 0 && this.selectedIndexcoddescripcionmerc <= maxIndex) {
        this.cargarDatosInventario(this.resultadodescripcionmerc[this.selectedIndexcoddescripcionmerc]);
      }
      event.preventDefault();
    }
  }
  moveFocusdesc(event: KeyboardEvent, nextInput: HTMLInputElement) {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault(); // Previene el comportamiento predeterminado de Enter
      const currentInputValue = (event.target as HTMLInputElement).value.trim();
      if (currentInputValue === '') {
        this.desmerVacio = true;
        console.log("vedadero");
      };

      if (!this.desnotfound === false) {
        this.mensagePantalla = true;
        Swal.fire({
          icon: "error",
          title: "A V I S O",
          text: 'Codigo invalido.',
        }).then(() => { this.mensagePantalla = false });
        this.desnotfound = true
        return;
      }
      else {
        if (this.desmerVacio === true) {
          this.mensagePantalla = true;
          Swal.fire({
            icon: "error",
            title: "A V I S O",
            text: 'Codigo invalido.',
          }).then(() => { this.mensagePantalla = false });
          this.desnotfound = true
          return;
          // nextInput.focus();
          // this.desmerVacio = false;
        }
        else {
          $("#input8").focus();
          $("#input8").select();
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
          icon: "error",
          title: "A V I S O",
          text: 'Por favor complete todos los campos requeridos antes de agregar el ítem.',
        }).then(() => { this.mensagePantalla = false });
        return;
      }
      else {
        // nextInput.focus();
        $("#input9").focus();
        $("#input9").select();
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
          icon: "error",
          title: "A V I S O",
          text: 'Por favor complete el campo Nombre del Cliente Para Poder continual.',
        }).then(() => { this.mensagePantalla = false });

      }
      else {
        nextInput.focus(); // Si es válido, mueve el foco al siguiente input
      }
    }
  }
  cargarDatosCliente(cliente: ModeloClienteData) {
    this.resultadoNombre = [];
    this.buscarNombre.reset();
    if (cliente.cl_nomClie !== "") {
      console.log(this.resultadoNombre)
      this.formularioFacturacion.patchValue({
        fa_codClie: cliente.cl_codClie,
        fa_nomClie: cliente.cl_nomClie,
        fa_rncFact: cliente.cl_rnc,
        fa_telClie: cliente.cl_telClie,
        fa_dirClie: cliente.cl_dirClie,
        fa_codZona: cliente.cl_codZona,
        fa_sector: cliente.cl_codSect,
      });
      console.log(cliente)
      console.log('Formulario actualizado:', this.formularioFacturacion.value);
    }
  }

  agregaItem(event: Event) {
    event.preventDefault();
    if (this.isEditing) {
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

      if (!this.productoselect || this.cantidadmerc <= 0 || this.preciomerc <= 0) {
        this.mensagePantalla = true;
        Swal.fire({
          icon: "error",
          title: "A V I S O",
          text: 'Por favor complete todos los campos requeridos antes de agregar el ítem.',
        }).then(() => { this.mensagePantalla = false });
        return;
      }
      const total = this.cantidadmerc * this.preciomerc;
      this.totalGral += total;
      const itbis = total * 0.18;
      this.totalItbis += itbis;
      this.subTotal += total - itbis;
      this.items.push({
        producto: this.productoselect, cantidad: this.cantidadmerc, precio: this.preciomerc, total

      })
      this.actualizarTotales();
      this.cancelarBusquedaDescripcion = false;
      this.cancelarBusquedaCodigo = false;
    }
    this.limpiarCampos();
  }

  limpiarCampos() {
    this.productoselect;
    this.codmerc = ""
    this.descripcionmerc = ""
    this.preciomerc = 0;
    this.cantidadmerc = 0;
    this.isEditing = false;
  }

  limpiarTabla() {
    this.items = [];          // Limpiar el array de items
    this.totalGral = 0;       // Reiniciar el total general
    this.totalItbis = 0;      // Reiniciar el total del ITBIS
    this.subTotal = 0;        // Reiniciar el subtotal
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
      this.subTotal -= (item.total - itbis);

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
    this.preciomerc = item.precio
    this.cantidadmerc = item.cantidad

  }
  actualizarTotales() {
    this.totalGral = this.items.reduce((sum, item) => sum + item.total, 0);
    this.totalItbis = this.items.reduce((sum, item) => sum + (item.total * 0.18), 0);
    this.subTotal = this.items.reduce((sum, item) => sum + (item.total - (item.total * 0.18)), 0);

    const formatCurrency = (value: number) => value.toLocaleString('es-DO', {
      style: 'currency',
      currency: 'DOP',
    });
    this.subtotaltxt=formatCurrency(this.subTotal);
    this.itbitxt=formatCurrency(this.totalItbis);
    this.totalgraltxt=formatCurrency(this.totalGral);

  }


  guardarFacturacion() { }

  navigateTable(event: KeyboardEvent) {
    const key = event.key;

    if (key === 'ArrowDown') {
      // Mueve hacia abajo en la tabla
      if (this.selectedRow < this.items.length - 1) {
        this.selectedRow++;
      }
    } else if (key === 'ArrowUp') {
      // Mueve hacia arriba en la tabla
      if (this.selectedRow > 0) {
        this.selectedRow--;
      }
    }
  }

  selectRow(index: number) {
    this.selectedRow = index; // Selecciona la fila cuando se hace clic
  }
    ngAfterViewInit() {
      // Establece el foco en la tabla cuando se cargue la vista
      this.Tabladetalle.nativeElement.focus();
    }




  generatePDF(factura: FacturacionModelData) {
    console.log(factura);
    this.servicioFacturacion.buscarFacturaDetalle(factura.fa_codFact).subscribe(response => {
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
          total: totalItem
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

      const formatCurrency = (value: number) => value.toLocaleString('es-DO', {
        style: 'currency',
        currency: 'DOP',
      });


      const doc = new jsPDF();

      const imgData = 'assets/logo2.png';  // Asegúrate de usar una ruta válida o base64

      const imgWidth = 20;  // Ancho de la imagen
      const imgHeight = 20;  // Alto de la imagen

      // Cálculo para centrar la imagen
      const pageWidth = doc.internal.pageSize.getWidth();
      const imgX = (pageWidth - imgWidth) / 2;  // Posición X centrada

      // Agregar el logo centrado
      doc.addImage(imgData, 'PNG', imgX, 10, imgWidth, imgHeight);  // (x, y, ancho, alto)


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
        head: [['Codigo', 'Descripción','Cantidad', 'Precio','Itbis', 'Total']],
        body: response.data.map((item: any) => [
          item.df_codMerc,
          item.df_desMerc,
          parseInt(item.df_canMerc),
          formatCurrency(parseFloat(item.df_preMerc)),
          formatCurrency((item.df_preMerc * item.df_canMerc)*18/100),
          formatCurrency(item.df_preMerc * item.df_canMerc)
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
      doc.text('*** Gracias por Preferirnos ***', 105, finalY + 55, { align: 'center' });

      // Guardar PDF
     // doc.save(`${cotizacion.ct_codcoti}.pdf`);
      const pdfBlob = doc.output('blob');

  // Crear un objeto URL para el Blob y abrirlo en una nueva pestaña
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
    });

  }




}
