import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject,debounceTime, distinctUntilChanged, switchMap} from 'rxjs';
import { ModeloUsuarioData } from 'src/app/core/services/mantenimientos/usuario';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
declare var $: any;
import Swal from 'sweetalert2';

@Component({
  selector: 'Usuario',
  templateUrl: './usuario.html',
  styleUrls: ['./usuario.css']
})
export class Usuario implements OnInit {
  totalItems = 0;
  pageSize = 8
  currentPage = 1;
  maxPagesToShow = 5;
  txtdescripcion: string = '';
  txtcodigo: string = '';
  idUsuario: string = '';
  descripcion: string = '';
  private idBuscar = new BehaviorSubject<string>('');
  private descripcionBuscar = new BehaviorSubject<string>('');

 

 habilitarFormulario: boolean = false;
  tituloModalUsuario!: string;
  formularioUsuario!:FormGroup;
  clienteList:ModeloUsuarioData[] = [];
  modoedicionUsuario:boolean = false;
  usuarioid!:number
  modoconsultaUsuario:boolean = false;
  usuarioList:ModeloUsuarioData[] = [];
  selectedUsuario: any = null;
  constructor(private fb:FormBuilder, private servicioUsuario:ServicioUsuario)
    {this.crearFormularioUsuario();
  this.descripcionBuscar.pipe(
    debounceTime(1000),
    distinctUntilChanged(),
    switchMap(descripcion => {
      this.descripcion = descripcion;
      return this.servicioUsuario.buscarTodosUsuario(this.currentPage, this.pageSize,this.idUsuario, this.descripcion);
    })
  )
  .subscribe(response => {
    this.usuarioList = response.data;
    this.totalItems = response.pagination.total;
    this.currentPage = response.pagination.page;
  });

  this.idBuscar.pipe(
    debounceTime(500),
    distinctUntilChanged(),
    switchMap(idusuario => {
      this.idUsuario = idusuario;
      return this.servicioUsuario.buscarTodosUsuario(this.currentPage, this.pageSize, this.idUsuario,this.descripcion);
    })
  )
  .subscribe(response => {
    this.usuarioList = response.data;
    this.totalItems = response.pagination.total;
    this.currentPage = response.pagination.page;
  });
}

  seleccionarUsuario(usuario: any)
   { this.selectedUsuario = Usuario; }
  ngOnInit(): void
  {this.buscarTodosUsuario(1);  }


  crearFormularioUsuario(){
    this.formularioUsuario = this.fb.group({
         idUsuario: ['', Validators.required],
        claveUsuario: ['1234',Validators.required],
        nombreUsuario: ['',Validators.required],
        nivel: [''],
        facturacion: [false],
        factLectura: [false],
        compra:[false],
        compLectura:  [false],
        reporte: [false],
        repLectura:[false],
        mantenimiento: [false],
        mantLectura: [false],
        caja: [false],
        caja_Lectura: [false],
        almacen:  [false],
        almLectura: [false],
        contabilidad: [false],
        contLectura: [false],
        mercadeo: [false],
        usuario: [false],
        vendedor: [false],
        correo: [''],
        despacho: [false],

      });
  }
habilitarFormularioUsuario(){
    this.habilitarFormulario = false;
  }

 nuevoUsuario(){
  this.modoedicionUsuario = false;
   this.tituloModalUsuario = 'Agregando Usuario';
   $('#modalusuario').modal('show');
   this.habilitarFormulario = true;
 }

 cerrarModalUsuario(){
  this.habilitarFormulario = false;
  this.formularioUsuario.reset();
  this.modoedicionUsuario = false;
  this.modoconsultaUsuario = false;
  $('#modalusuario').modal('hide');
  this.crearFormularioUsuario();
 }

 editarUsuario(usuario:ModeloUsuarioData){
  this.usuarioid = usuario.codUsuario;
  this.modoedicionUsuario = true;
  this.formularioUsuario.patchValue(usuario);
  this.tituloModalUsuario = 'Editando Usuario';
  $('#modalusuario').modal('show');
  this.habilitarFormulario = true;
}

buscarTodosUsuario(page:number){
  this.servicioUsuario.buscarTodosUsuario(page,this.pageSize).subscribe(response => {
    console.log(response);
    this.usuarioList = response.data;
  });
}
consultarUsuario(Usuario:ModeloUsuarioData){
  this.tituloModalUsuario = 'Consulta Usuario';
 this.formularioUsuario.patchValue(Usuario);
$('#modalusuario').modal('show');
this.habilitarFormulario = true;
this.modoconsultaUsuario = true;
};


eliminarUsuario(Usuario:ModeloUsuarioData){
  Swal.fire({
  title: '¿Está seguro de eliminar este Usuario?',
  text: "¡No podrá revertir esto!",
  icon: 'warning',
  showCancelButton: true,
  confirmButtonColor: '#3085d6',
  cancelButtonColor: '#d33',
  confirmButtonText: 'Si, eliminar!'
  }).then((result) => {
  if (result.isConfirmed) {
    this.servicioUsuario.eliminarUsuario(Usuario.codUsuario).subscribe(response => {
    Swal.fire(
    {
     title: "Excelente!",
     text: "Usuario eliminado correctamente.",
     icon: "success",
     timer: 3000,
     showConfirmButton: false,
    }
    )
    this.buscarTodosUsuario(this.currentPage);
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
guardarUsuario(){
console.log(this.formularioUsuario.value);
if(this.formularioUsuario.valid){
  if(this.modoedicionUsuario){
    this.servicioUsuario.editarUsuario(this.usuarioid, this.formularioUsuario.value).subscribe(response => {
    Swal.fire({
    title: "Excelente!",
    text: "Usuario Editado correctamente.",
    icon: "success",
    timer: 5000,
    showConfirmButton: false,
    });
    this.buscarTodosUsuario(1);
    this.formularioUsuario.reset();
    this.crearFormularioUsuario();
    $('#modalusuario').modal('hide');
    });
  }
  else{
    this.servicioUsuario.guardarUsuario(this.formularioUsuario.value).subscribe(response => {
    Swal.fire({
    title: "Excelente!",
    text: "Usuario Guardado correctamente.",
    icon: "success",
    timer: 3000,
    showConfirmButton: false,
    });

    this.buscarTodosUsuario(1);
    this.formularioUsuario.reset();
    this.crearFormularioUsuario();
    $('#modalusuario').modal('hide');
    });
  }
  }
  else{
    alert("Este Usuario no fue Guardado");
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
  const codigo = this.idBuscar.getValue();
  const descripcion = this.descripcionBuscar.getValue();
  this.servicioUsuario.buscarTodosUsuario(this.currentPage, this.pageSize, codigo, descripcion)
    .subscribe(response => {
      this.usuarioList = response.data;
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
this.buscarTodosUsuario(1);
}
}

