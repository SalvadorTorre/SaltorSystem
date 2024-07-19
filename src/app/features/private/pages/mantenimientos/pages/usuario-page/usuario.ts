import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
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


    moveFocus(event: KeyboardEvent, nextElement: HTMLInputElement | null): void {
      if (event.key === 'Enter' && nextElement) {
        event.preventDefault(); // Evita el comportamiento predeterminado del Enter
        nextElement.focus(); // Enfoca el siguiente campo
      }
    }


      convertToUpperCase(event: Event): void {
        const input = event.target as HTMLInputElement;
        input.value = input.value.toUpperCase();
      }


 habilitarFormulario: boolean = false;
  tituloModalUsuario!: string;
  formularioUsuario!:FormGroup;
  clienteList:ModeloUsuarioData[] = [];
  modoedicionUsuario:boolean = false;
  usuarioid!:number
  modoconsultaUsuario:boolean = false;
  usuarioList:ModeloUsuarioData[] = [];
  selectedUsuario: any = null;
  descripcion: string = '';
  private buscaXusuario = new BehaviorSubject<string>('');

  
  constructor(private fb:FormBuilder, private servicioUsuario:ServicioUsuario)
  

  {
    this.crearFormularioUsuario();
  }

  seleccionarUsuario(usuario: any) {
    this.selectedUsuario = Usuario;
  }
  ngOnInit(): void {
    this.buscarTodosUsuario();
  }

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

buscarTodosUsuario(){
  this.servicioUsuario.buscarTodosUsuario().subscribe(response => {
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
buscaUsuario(event: Event) {
  const inputElement = event.target as HTMLInputElement;
  this.buscaXusuario.next(inputElement.value.toUpperCase());
}





/*eliminarUsuario(Usuario:ModeloUsuarioData){
  this.servicioUsuario.eliminarUsuario(Usuario.codUsuario).subscribe(response => {
    alert("Usuario Eliminado");
    this.buscarTodosUsuario();
  });
}*/



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
        this.buscarTodosUsuario();
      });
    }
  })
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
      this.buscarTodosUsuario();
      this.formularioUsuario.reset();
      this.crearFormularioUsuario();
      $('#modalusuario').modal('hide');
      });
    }else{
      this.servicioUsuario.guardarUsuario(this.formularioUsuario.value).subscribe(response => {
        Swal.fire({
          title: "Excelente!",
          text: "Usuario Guardado correctamente.",
          icon: "success",
          timer: 3000,
          showConfirmButton: false,
        });

        this.buscarTodosUsuario();
      this.formularioUsuario.reset();
      this.crearFormularioUsuario();
      $('#modalusuario').modal('hide');
      });
    }
    }else{
       alert("Este Usuario no fue Guardado");
    }
}
}

