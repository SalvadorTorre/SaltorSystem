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
  rncValue: string = '';
  cancelarBusquedaDescripcion: boolean = false;
  cancelarBusquedaCodigo: boolean = false;
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
        fa_cosFact:[''],
        fa_nomClie: [''],
        fa_rncFact: [''],
        fa_telClie: [''],
        fa_telClie2: [''],
        fa_dirClie: [''],
        fa_correo: [''],
        fa_codVend: ['', Validators.required],
        fa_nomVend: [''],
        fa_status: [''],
        fa_sector:[''],
        fa_codZona: [''],
        fa_fpago:[''],
        fa_envio:[''],
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
    // const currentControl = this.formularioCotizacion.get('ct_codvend');
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
        console.log('RNC encontrado.');
        nextElement?.focus();  // Pasar el foco al siguiente campo
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
    console.log("editando")
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
}
}
