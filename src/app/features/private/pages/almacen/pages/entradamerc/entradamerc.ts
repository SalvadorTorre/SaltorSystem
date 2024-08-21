// import { Component, OnInit, ɵNG_COMP_DEF } from '@angular/core';
// //import { NgxMaskModule } from 'ngx-mask';
// import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
// import { BehaviorSubject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
// import Swal from 'sweetalert2';
// import { ServicioEntradamerc } from 'src/app/core/services/almacen/entradamerc/entradamerc.service';
// import { EntradamercModelData, detEntradamercData } from 'src/app/core/services/almacen/entradamerc';
// import { ServiciodetEntradamerc } from 'src/app/core/services/almacen/detentradamerc/detentradamerc.service';
// import { HttpInvokeService } from 'src/app/core/services/http-invoke.service';
// declare var $: any;


// @Component({
//   selector: 'entradamerc',
//   templateUrl: './entradamerc.html',
//   styleUrls: ['./entradamerc.css']
// })
// export class Entradamerc implements OnInit {
//   totalItems = 0;
//   pageSize = 8;
//   currentPage = 1;
//   maxPagesToShow = 5;
//   txtdescripcion: string = '';
//   txtcodigo = '';
//   txtfecha: string = '';
//   descripcion: string = '';
//   codigo: string = '';
//   fecha: string = '';
//   private descripcionBuscar = new BehaviorSubject<string>('');
//   private codigoBuscar = new BehaviorSubject<string>('');
//   private fechaBuscar = new BehaviorSubject<string>('');
//   habilitarFormulario: boolean = false;
//   tituloModalEntradamerc!: string;
//   formularioEntradamerc!: FormGroup;
//   formulariodetEntradamerc!: FormGroup;
//   modoedicionEntradamerc: boolean = false;
//   entradamerc!: string
//   modoconsultaEntradamerc: boolean = false;
//   entradamercList: EntradamercModelData[] = [];
//   detEntradamercList: detEntradamercData[] = [];
//   selectedEntradamerc: any = null;
//   items: { codigo: string; descripcion: string; cantidad: number; precio: number; total: number; }[] = [];
//   totalGral:number = 0;

//   constructor(
//     private fb: FormBuilder,
//     private servicioEntradamerc: ServicioEntradamerc,
//     private serviciodetEntradamerc: ServiciodetEntradamerc,
//     private http:HttpInvokeService
//   ) {
//     this.crearFormularioEntradamerc();
//     // this.descripcionBuscar.pipe(
//     //   debounceTime(500),
//     //   distinctUntilChanged(),
//     //   switchMap(nombre => {
//     //     this.descripcion = nombre;
//     //     return this.servicioEntradamerc.buscarTodasEntradamerc(this.currentPage, this.pageSize, this.descripcion);
//     //   })
//     // )
//     //   .subscribe(response => {
//     //     this.EntradamercList = response.data;
//     //     this.totalItems = response.pagination.total;
//     //     this.currentPage = response.pagination.page;
//     //   });
//     // this.codigoBuscar.pipe(
//     //   debounceTime(500),
//     //   distinctUntilChanged(),
//     //   switchMap(rnc => {
//     //     this.codigo = rnc;
//     //     return this.servicioEntradamerc.buscarTodasEntradamerc(this.currentPage, this.pageSize, this.descripcion);
//     //   })
//     // )
//     //   .subscribe(response => {
//     //     this.EntradamercList = response.data;
//     //     this.totalItems = response.pagination.total;
//     //     this.currentPage = response.pagination.page;
//     //   });

//   }

//   agregarEntradamerc() {
//     this.formularioEntradamerc.disable();

//   }

//   crearformulariodetEntradamerc() {
//     this.formulariodetEntradamerc = this.fb.group({

//       dc_codcoti: ['', Validators.required],
//       dc_codmerc: ['',],
//       dc_descrip: ['',],
//       dc_canmerc: ['',],
//       dc_premerc: ['',],
//       dc_valmerc: ['',],
//       dc_unidad: ['',],
//       dc_costmer: ['',],
//       dc_codclie: ['',],
//       dc_status: ['',],


//     });
//   }

//   buscarNombre = new FormControl();
//   //resultadoNombre:ModeloClienteData[ ] = [] ;

//   seleccionarEntradamerc(Entradamerc: any) { this.selectedEntradamerc = Entradamerc; }
//   ngOnInit(): void {
//     this.buscarTodasEntradamerc(1);



//     this.buscarNombre.valueChanges.pipe(
//       debounceTime(500),
//       distinctUntilChanged(),
//       tap(() => {
//         this.resultadoNombre = [];
//       }),
//       filter((query: string) => query !== ''),
//       switchMap((query: string) => this.http.GetRequest<ModeloCliente>(`/cliente-nombre/${query}`))
//     ).subscribe((results: ModeloCliente) => {
//       console.log(results.data);
//       if (results) {
//         if (Array.isArray(results.data)) {
//           this.resultadoNombre = results.data;
//         }
//       } else {
//         this.resultadoNombre = [];
//       }

//     });
//    }

//   crearFormularioEntradamerc() {
//     const fechaActual = new Date();
//     const fechaActualStr = this.formatofecha(fechaActual);
//     this.formularioEntradamerc = this.fb.group({
//       ct_codcoti: [''],
//       ct_feccoti: [fechaActualStr],
//       ct_valcoti: [''],
//       ct_itbis: [''],
//       ct_codclie: [''],
//       ct_nomclie: [''],
//       ct_rnc: [''],
//       ct_telclie: ['',Validators.pattern(/^\(\d{3}\) \d{3}-\d{4}$/)],
//       ct_dirclie: [''],
//       ct_correo: [''],
//       ct_codvend: [''],
//       ct_nomvend: [''],
//       ct_status: [''],

//     });
//   }

//   habilitarFormularioEmpresa() {
//     this.habilitarFormulario = false;
//   }

//   nuevaEntradamerc() {
//     this.modoedicionEntradamerc = false;
//     this.tituloModalEntradamerc = 'Nueva Entradamerc';
//     $('#modalEntradamerc').modal('show');
//     this.habilitarFormulario = true;
//   }

//   cerrarModalEntradamerc() {
//     this.habilitarFormulario = false;
//     this.formularioEntradamerc.reset();
//     this.modoedicionEntradamerc = false;
//     this.modoconsultaEntradamerc = false;
//     $('#modalEntradamerc').modal('hide');
//     this.crearFormularioEntradamerc();
//     this.EntradamercList = []
//   }


//   editardetEntradamerc(detEntradamerc: detEntradamercData) {
//     this.Entradamercid = detEntradamerc.dc_codcoti;
//     this.formularioEntradamerc.patchValue(detEntradamerc);

//   }
//   editarEntradamerc() {
//    /* this.Entradamercid = Entradamerc.ct_codcoti;
//     this.modoedicionEntradamerc = true;
//     this.formularioEntradamerc.patchValue(Entradamerc);
//     this.tituloModalEntradamerc = 'Editando Entradamerc';
//     $('#modalEntradamerc').modal('show');
//     this.habilitarFormulario = true;
//     this.detEntradamercList = Entradamerc.detEntradamerc*/
//   }

//   buscarTodasEntradamerc(page: number) {
//     this.servicioEntradamerc.buscarTodasEntradamerc(page, this.pageSize).subscribe(response => {
//       console.log(response);
//       this.EntradamercList = response.data;
//     });
//   }
//   consultarEntradamerc(Entradamerc: EntradamercModelData) {
//     this.tituloModalEntradamerc = 'Consulta Entradamerc';
//     this.formularioEntradamerc.patchValue(Entradamerc);
//     $('#modalempresa').modal('show');
//     this.habilitarFormulario = true;
//     this.modoconsultaEntradamerc = true;
//     this.formularioEntradamerc.disable();
//     this.detEntradamercList = Entradamerc.detEntradamerc
//   };

//   consultarSucursal(Entradamerc: EntradamercModelData) {
//     this.tituloModalEntradamerc = 'Consulta Entradamerc';
//     this.formularioEntradamerc.patchValue(Entradamerc);

//     this.habilitarFormulario = true;
//     this.modoconsultaEntradamerc = true;
//     this.detEntradamercList = Entradamerc.detEntradamerc
//   };

//   eliminarEntradamerc(EntradamercEmpresa: string) {
//     Swal.fire({
//       title: '¿Está seguro de eliminar este Entradamerc?',
//       text: "¡No podrá revertir esto!",
//       icon: 'warning',
//       showCancelButton: true,
//       confirmButtonColor: '#3085d6',
//       cancelButtonColor: '#d33',
//       confirmButtonText: 'Si, eliminar!'
//     }).then((result) => {
//       if (result.isConfirmed) {
//         this.servicioEntradamerc.eliminarEntradamerc(this.Entradamercid).subscribe(response => {
//           Swal.fire(
//             {
//               title: "Excelente!",
//               text: "Empresa eliminado correctamente.",
//               icon: "success",
//               timer: 2000,
//               showConfirmButton: false,
//             }
//           )
//           this.buscarTodasEntradamerc(this.currentPage);
//         });
//       }
//     })
//   }

//   descripcionEntra(event: Event) {
//     const inputElement = event.target as HTMLInputElement;
//     this.descripcionBuscar.next(inputElement.value.toUpperCase());
//   }

//   codigoEntra(event: Event) {
//     const inputElement = event.target as HTMLInputElement;
//     this.codigoBuscar.next(inputElement.value.toUpperCase());
//   }
//   fechaEntra(event: Event) {
//     const inputElement = event.target as HTMLInputElement;
//     this.codigoBuscar.next(inputElement.value.toUpperCase());
//   }

//   guardarEntradamerc() {

//     this.formularioEntradamerc.get('ct_valcoti')?.patchValue(this.totalGral);

//     const payload = {
//       Entradamerc: this.formularioEntradamerc.value,
//       detalle: this.items,
//       idEntradamerc: this.formularioEntradamerc.get('ct_codcoti')?.value,
//     };

//     console.log(payload);
//     // if (this.formularioEntradamerc.valid) {
//     //   if (this.modoedicionEntradamerc) {
//     //     this.servicioEntradamerc.editarEntradamerc(this.Entradamercid, this.formularioEntradamerc.value).subscribe(response => {
//     //       Swal.fire({
//     //         title: "Excelente!",
//     //         text: "Entradamerc Editada correctamente.",
//     //         icon: "success",
//     //         timer: 5000,
//     //         showConfirmButton: false,
//     //       });
//     //       this.buscarTodasEntradamerc(1);
//     //       this.formularioEntradamerc.reset();
//     //       this.crearFormularioEntradamerc();
//     //       $('#modalEntradamerc').modal('hide');
//     //     });
//     //   }
//     //   else {
//     //     this.servicioEntradamerc.guardarEntradamerc(this.formularioEntradamerc.value).subscribe(response => {
//     //       Swal.fire
//     //         ({
//     //           title: "Entradamerc Guardada correctamente",
//     //           text: "Desea Crear una Sucursal",
//     //           icon: 'warning',
//     //           timer: 5000,
//     //           showConfirmButton: false,
//     //         });
//     //       this.buscarTodasEntradamerc(1);
//     //       this.formularioEntradamerc.reset();
//     //       this.crearFormularioEntradamerc();
//     //       this.formularioEntradamerc.enable();
//     //       $('#modalEntradamerc').modal('hide');
//     //     })

//     //   }
//     // }
//     // else {
//     //   alert("Esta Empresa no fue Guardado");
//     // }
//   }

//   convertToUpperCase(event: Event): void {
//     const input = event.target as HTMLInputElement;
//     input.value = input.value.toUpperCase();
//   }
//   moveFocus(event: KeyboardEvent, nextElement: HTMLInputElement | null): void {
//     if (event.key === 'Enter' && nextElement) {
//       event.preventDefault(); // Evita el comportamiento predeterminado del Enter
//       nextElement.focus(); // Enfoca el siguiente campo
//     }
//   }

//   changePage(page: number) {
//     this.currentPage = page;
//     // Trigger a new search with the current codigo and descripcion
//     const descripcion = this.descripcionBuscar.getValue();
//     this.servicioEntradamerc.buscarTodasEntradamerc(this.currentPage, this.pageSize)
//       .subscribe(response => {
//         this.EntradamercList = response.data;
//         this.totalItems = response.pagination.total;
//         this.currentPage = page;
//       });
//   }


//   get totalPages() {
//     // Asegúrate de que totalItems sea un número antes de calcular el total de páginas
//     return Math.ceil(this.totalItems / this.pageSize);
//   }

//   get pages(): number[] {
//     const totalPages = this.totalPages;
//     const currentPage = this.currentPage;
//     const maxPagesToShow = this.maxPagesToShow;

//     if (totalPages <= maxPagesToShow) {
//       return Array.from({ length: totalPages }, (_, i) => i + 1);
//     }

//     const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
//     const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

//     return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
//   }
//   limpiaBusqueda() {
//     this.txtdescripcion = '';
//     this.txtcodigo = '';
//     this.txtfecha = '';
//     this.buscarTodasEntradamerc(1);
//   }

//   // Array para almacenar los datos de la tabla


//   // Función para agregar un nuevo item a la tabla
//   agregaItem(codigo: string, descripcion: string, cantidad: number, precio: number) {
//     const total = cantidad * precio;
//     this.totalGral += total;
//     this.items.push({ codigo, descripcion, cantidad, precio, total });
//   }

//   // (Opcional) Función para eliminar un ítem de la tabla
//   borarItem(item: { codigo: string; descripcion: string; cantidad: number; precio: number; total: number; }) {
//     const index = this.items.indexOf(item);
//     if (index > -1) {
//       this.items.splice(index, 1);
//     }
//   }


//   buscarPorCodigo(codigo: string) {

//   }

//   buscarClienteporNombre(){
//     this.servicioCliente.buscarporNombre(this.formularioEntradamerc.get("ct_nomclie")!.value).subscribe(response => {
//       console.log(response);
//     });
//   }


//   formatofecha(date: Date): string {
//     const year = date.getFullYear();
//     const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Los meses son 0-indexados, se agrega 1 y se llena con ceros
//     const day = date.getDate().toString().padStart(2, '0'); // Se llena con ceros si es necesario
//     return `${ day}/${month}/${year}`;
//   }

//   cargarDatosCliente(cliente:ModeloClienteData){
//     console.log(cliente);
//     this.resultadoNombre = [];
//     this.buscarNombre.reset();
//     this.formularioEntradamerc.patchValue({
//       ct_codclie: cliente.cl_codClie,
//       ct_nomclie: cliente.cl_nomClie,
//       ct_rnc: cliente.cl_rnc,
//       ct_telclie: cliente.cl_telClie,
//       ct_dirclie: cliente.cl_dirClie,
//     });
//   }

// }


