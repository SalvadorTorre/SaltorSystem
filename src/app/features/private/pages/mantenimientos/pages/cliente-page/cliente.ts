import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ServicioCliente } from 'src/app/core/services/mantenimientos/clientes/cliente.service';
import { ModeloClienteData } from 'src/app/core/services/mantenimientos/clientes';
import {ModeloSectorData } from 'src/app/core/services/mantenimientos/sector';
import { ServicioSector } from 'src/app/core/services/mantenimientos/sector/sector.service';
import { ModeloZonaData } from 'src/app/core/services/mantenimientos/zonas';
import { ServicioZona } from 'src/app/core/services/mantenimientos/zonas/zonas.service';
import { BehaviorSubject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import Swal from 'sweetalert2';
declare var $: any;declare var $: any;
declare var $: any;

@Component({
  selector: 'Cliente',
  templateUrl: './cliente.html',
  styleUrls: ['./cliente.css']
})
export class Cliente implements OnInit {
  habilitarBusqueda: boolean = false;
  tituloModalCliente!: string;
  formularioCliente!:FormGroup;
  clienteList:ModeloClienteData[] = [];
  zonasList:ModeloZonaData[] = [];
  sectorList:ModeloSectorData[] = [];
  modoedicionCliente:boolean = false;
  habilitarFormulario:boolean= false
  modoconsultaCliente:boolean= false
  clienteid!:number
  totalItems = 0;
  pageSize = 8
  currentPage = 1;
  maxPagesToShow = 5;
  txtcodigo: string = '';
  txtdescripcion: string = '';
  codigo: string = '';
  descripcion: string = '';
  selectedCliente: any = null;
  private idBuscar = new BehaviorSubject<string>('');
  private descripcionBuscar = new BehaviorSubject<string>('');




  constructor(private fb:FormBuilder, private servicioCliente:ServicioCliente, private servicioSector:ServicioSector, private servicioZona:ServicioZona)
  {this.crearFormularioCliente();
  this.descripcionBuscar.pipe(
  debounceTime(1000),
  distinctUntilChanged(),
  switchMap(descripcion => {
    this.descripcion = descripcion;
    return this.servicioCliente.buscarTodosCliente(this.currentPage, this.pageSize, this.descripcion);
  })
)
.subscribe(response => {
  this.clienteList = response.data;
  this.totalItems = response.pagination.total;
  this.currentPage = response.pagination.page;
});
this.idBuscar.pipe(
  debounceTime(500),
  distinctUntilChanged(),
  switchMap(codigo => {
    this.codigo = codigo;
    return this.servicioCliente.buscarTodosCliente(this.currentPage, this.pageSize, this.codigo,this.descripcion);
  })
)
.subscribe(response => {
  this.clienteList = response.data;
  this.totalItems = response.pagination.total;
  this.currentPage = response.pagination.page;
});
 }
seleccionarCliente(cliente: any)
 { this.selectedCliente = Cliente; }

 ngOnInit(): void
{this.buscarTodosCliente(1);
this. buscardatosSector();
this.buscartodaZona();
}

crearFormularioCliente(){
  this.formularioCliente = this.fb.group({
    cl_nomClie: ['', Validators.required],
    cl_dirClie: [''],
    cl_codSect: [''],
    cl_codZona: [''],
    cl_telClie: [''],
    cl_tipo: [''],
    cl_status: [true],
    cl_rnc: [''],
    });
}

habilitarBuscador(){
  this.habilitarBusqueda = false;
}

nuevoCliente(){
this.modoedicionCliente = false;
 this.tituloModalCliente = 'Agregando Cliente';
 $('#modalcliente').modal('show');
 this.habilitarFormulario = true;
}

cerrarModalCliente(){
this.habilitarFormulario = false;
this.formularioCliente.reset();
this.modoedicionCliente = false;
this.modoconsultaCliente = false;
$('#modalcliente').modal('hide');
this.crearFormularioCliente();
}

editarCliente(clientes:ModeloClienteData){
this.clienteid = clientes.cl_codClie;
this.modoedicionCliente = true;
this.formularioCliente.patchValue(clientes);
this.tituloModalCliente = 'Editando Cliente';
$('#modalcliente').modal('show');
this.habilitarFormulario = true;
}

buscarTodosCliente(page:number){
this.servicioCliente.buscarTodosCliente(page,this.pageSize).subscribe(response => {
  console.log(response);
  this.
  clienteList = response.data;
});
}
consultarCliente(Cliente:ModeloClienteData){
this.tituloModalCliente = 'Consulta Cliente';
this.formularioCliente.patchValue(Cliente);
$('#modalcliente').modal('show');
this.habilitarFormulario = true;
this.modoconsultaCliente = true;
};


eliminarCliente(Cliente:ModeloClienteData){
Swal.fire({
title: '¿Está seguro de eliminar este Cliente?',
text: "¡No podrá revertir esto!",
icon: 'warning',
showCancelButton: true,
confirmButtonColor: '#3085d6',
cancelButtonColor: '#d33',
confirmButtonText: 'Si, eliminar!'
}).then((result) => {
if (result.isConfirmed) {
  this.servicioCliente.eliminarCliente(Cliente.cl_codClie).subscribe(response => {
  Swal.fire(
  {
   title: "Excelente!",
   text: "Cliente eliminado correctamente.",
   icon: "success",
   timer: 3000,
   showConfirmButton: false,
  }
  )
  this.buscarTodosCliente(this.currentPage);
  });
}
})
}

descripcionEntra(event: Event) {
const inputElement = event.target as HTMLInputElement;
this.descripcionBuscar.next(inputElement.value.toUpperCase());
}
idEntra(event: Event) {
const inputElement = event.target as HTMLInputElement;
this.idBuscar.next(inputElement.value.toUpperCase());
}
guardarCliente(){
console.log(this.formularioCliente.value);
if(this.formularioCliente.valid){
if(this.modoedicionCliente){
  this.servicioCliente.editarCliente(this.clienteid, this.formularioCliente.value).subscribe(response => {
  Swal.fire({
  title: "Excelente!",
  text: "Usuario Editado correctamente.",
  icon: "success",
  timer: 5000,
  showConfirmButton: false,
  });
  this.buscarTodosCliente(1);
  this.formularioCliente.reset();
  this.crearFormularioCliente();
  $('#modalcliente').modal('hide');
  });
}
else{
  this.servicioCliente.guardarCliente(this.formularioCliente.value).subscribe(response => {
  Swal.fire({
  title: "Excelente!",
  text: "Cliente Guardado correctamente.",
  icon: "success",
  timer: 3000,
  showConfirmButton: false,
  });

  this.buscarTodosCliente(1);
  this.formularioCliente.reset();
  this.crearFormularioCliente();
  $('#modalcliente').modal('hide');
  });
}
}
else{
  alert("Este Cliente no fue Guardado");
}
}
  buscarTodoCliente(arg0: number) {
    throw new Error('Method not implemented.');
  }

convertToUpperCase(event: Event): void {
const input = event.target as HTMLInputElement;
input.value = input.value.toUpperCase();
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
const codigo = this.idBuscar.getValue();
const descripcion = this.descripcionBuscar.getValue();
this.servicioCliente.buscarTodosCliente(this.currentPage, this.pageSize, codigo, descripcion)
  .subscribe(response => {
    this.clienteList = response.data;
  this.totalItems = response.pagination.total;
  this.currentPage = page;
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

return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
}

limpiaBusqueda(){
this.txtdescripcion = '';
this.txtcodigo = '';
this.buscarTodosCliente(1);
}

buscartodaZona(){
  this.servicioZona.obtenerTodasZonas().subscribe(response => {
    console.log(response);
    this.zonasList = response.data;
  });
}

  buscardatosSector(){
    this.servicioSector.obtenerTodosSector().subscribe(response => {
      console.log(response);
      this.sectorList = response.data;
    });
  }



}


