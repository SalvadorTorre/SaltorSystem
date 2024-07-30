import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject,debounceTime, distinctUntilChanged, switchMap} from 'rxjs';
import Swal from 'sweetalert2';
import { ServicioEmpresa } from 'src/app/core/services/mantenimientos/empresas/empresas.service';
import { ModeloEmpresaData } from 'src/app/core/services/mantenimientos/empresas';
declare var $: any;


@Component({
  selector: 'Empresas',
  templateUrl: './empresas.html',
  styleUrls: ['./empresas.css']
})
export class Empresas implements OnInit {
  totalItems = 0;
  pageSize = 8;
  currentPage = 1;
  maxPagesToShow = 5;
  txtdescripcion: string = '';
  txtcodigo = '';
  rnc: string = '';
  descripcion: string = '';
  codigo: string = '';
  private descripcionBuscar = new BehaviorSubject<string>('');
  private codigoBuscar = new BehaviorSubject<string>('');
  habilitarFormulario: boolean = false;
  tituloModalEmpresa!: string;
  formularioEmpresa!:FormGroup;
  modoedicionEmpresa:boolean = false;
  empresaid!:number
  modoconsultaEmpresa:boolean = false;
  empresaList:ModeloEmpresaData[] = [];
  selectedEmpresa: any = null;
  constructor(private fb:FormBuilder, private servicioEmpresa:ServicioEmpresa)
    {this.crearFormularioEmpresa();

    this.descripcionBuscar.pipe(
    debounceTime(500),
    distinctUntilChanged(),
    switchMap(nombre => {
      this.descripcion =nombre;
      return this.servicioEmpresa.buscarTodasEmpresa(this.currentPage, this.pageSize, this.descripcion);
    })
  )
  .subscribe(response => {
    this.empresaList = response.data;
    this.totalItems = response.pagination.total;
    this.currentPage = response.pagination.page;
  });
  this.codigoBuscar.pipe(
    debounceTime(500),
    distinctUntilChanged(),
    switchMap(rnc => {
      this.codigo =rnc;
      return this.servicioEmpresa.buscarTodasEmpresa(this.currentPage, this.pageSize, this.descripcion);
    })
  )
  .subscribe(response => {
    this.empresaList = response.data;
    this.totalItems = response.pagination.total;
    this.currentPage = response.pagination.page;
  });

 }


  seleccionarEmpresa(empresas: any)
   { this.selectedEmpresa = Empresas; }
  ngOnInit(): void
  {this.buscarTodasEmpresa(1);  }

  crearFormularioEmpresa(){
    this.formularioEmpresa = this.fb.group({
      rnc_empre: ['', Validators.required],
      nom_empre: ['', Validators.required],
      dir_empre: ['', Validators.required],
      letra_empre: [''],
      orden_compra:[''],
      });

  }habilitarFormularioChofer(){
    this.habilitarFormulario = false;
  }

 nuevaEmpresa(){
  this.modoedicionEmpresa = false;
   this.tituloModalEmpresa = 'Agregando Empresa';
   $('#modalempresa').modal('show');
   this.habilitarFormulario = true;
 }

 cerrarModalEmpresa(){
  this.habilitarFormulario = false;
  this.formularioEmpresa.reset();
  this.modoedicionEmpresa = false;
  this.modoconsultaEmpresa = false;
  $('#modalempresa').modal('hide');
  this.crearFormularioEmpresa();
 }

 editarEmpresa(Empresa:ModeloEmpresaData){
  this.empresaid = Empresa.cod_empre;
  this.modoedicionEmpresa = true;
  this.formularioEmpresa.patchValue(Empresa);
  this.tituloModalEmpresa = 'Editando Empresa';
  $('#modalempresa').modal('show');
  this.habilitarFormulario = true;
}

buscarTodasEmpresa(page:number){
  this.servicioEmpresa.buscarTodasEmpresa(page,this.pageSize).subscribe(response => {
    console.log(response);
    this.empresaList = response.data;
  });
}
consultarEmpresa(Empresa:ModeloEmpresaData){
  this.tituloModalEmpresa = 'Consulta Empresa';
 this.formularioEmpresa.patchValue(Empresa);
$('#modalempresa').modal('show');
this.habilitarFormulario = true;
this.modoconsultaEmpresa = true;
};

eliminarEmpresa(Empresa:number){
  Swal.fire({
  title: '¿Está seguro de eliminar este Empresa?',
  text: "¡No podrá revertir esto!",
  icon: 'warning',
  showCancelButton: true,
  confirmButtonColor: '#3085d6',
  cancelButtonColor: '#d33',
  confirmButtonText: 'Si, eliminar!'
  }).then((result) => {
  if (result.isConfirmed) {
    this.servicioEmpresa.eliminarEmpresa(Empresa).subscribe(response => {
    Swal.fire(
    {
     title: "Excelente!",
     text: "Empresa eliminado correctamente.",
     icon: "success",
     timer: 3000,
     showConfirmButton: false,
    }
    )
    this.buscarTodasEmpresa(this.currentPage);
    });
  }
  })
}

descripcionEntra(event: Event) {
  const inputElement = event.target as HTMLInputElement;
  this.descripcionBuscar.next(inputElement.value.toUpperCase());
}
codigoEntra(event: Event) {
  const inputElement = event.target as HTMLInputElement;
  this.codigoBuscar.next(inputElement.value.toUpperCase());
}
guardarEmpresa(){
console.log(this.formularioEmpresa.value);
if(this.formularioEmpresa.valid){
  if(this.modoedicionEmpresa){
    this.servicioEmpresa.editarEmpresa(this.empresaid, this.formularioEmpresa.value).subscribe(response => {
    Swal.fire({
    title: "Excelente!",
    text: "Chofer Editado correctamente.",
    icon: "success",
    timer: 5000,
    showConfirmButton: false,
    });
    this.buscarTodasEmpresa(1);
    this.formularioEmpresa.reset();
    this.crearFormularioEmpresa();
    $('#modalempresa').modal('hide');
    });
  }
  else{
    this.servicioEmpresa.guardarEmpresa(this.formularioEmpresa.value).subscribe(response => {
    Swal.fire({
    title: "Excelente!",
    text: "Empresa Guardado correctamente.",
    icon: "success",
    timer: 3000,
    showConfirmButton: false,
    });

    this.buscarTodasEmpresa(1);
    this.formularioEmpresa.reset();
    this.crearFormularioEmpresa();
    $('#modalempresa').modal('hide');
    });
  }
  }
  else{
    alert("Este Chofer no fue Guardado");
  }
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
  const descripcion = this.descripcionBuscar.getValue();
  this.servicioEmpresa.buscarTodasEmpresa(this.currentPage, this.pageSize, descripcion)
    .subscribe(response => {
      this.empresaList = response.data;
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
this.buscarTodasEmpresa(1);
}
}





