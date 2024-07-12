import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ModeloUsuarioData } from 'src/app/core/services/mantenimientos/usuario';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
declare var $: any;

@Component({
  selector: 'Usuario',
  templateUrl: './usuario.html',
  styleUrls: ['./usuario.css']
})
export class Usuario implements OnInit {
  habilitarFormiarioUsuario: boolean = false;
  tituloModalUsuario!: string;
  formularioUsuario!:FormGroup;
  clienteList:ModeloUsuarioData[] = [];
  modoedicionUsuario:boolean = false;
  usuarioid!:number
  modoconsultaUsuario:boolean = false;
  usuarioList:ModeloUsuarioData[] = [];
  selectedUsuario: any = null;
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
        claveUsuario: ['12345678',Validators.required],
        nombreUsuario: ['',Validators.required],
        nivel: [''],
        nivel2: [''],
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
        credito: [false],
        vendedor: [false],
        metaVenta: [''],
        correo: [''],
        claveCorreo: [''],
        despacho: [true],
   
      });
  }
habilitarFormularioUsuario(){
    this.habilitarFormiarioUsuario = false;
  }

 nuevoUsuario(){
  this.modoedicionUsuario = false;
   this.tituloModalUsuario = 'Agregando Usuario';
   $('#modalusuario').modal('show');
   this.habilitarFormiarioUsuario = true;
 }

 cerrarModalUsuario(){
  this.habilitarFormiarioUsuario = false;
  this.formularioUsuario.reset();
  this.modoedicionUsuario = false;
  this.modoconsultaUsuario = false;
  $('#modalusuario').modal('hide');
  this.crearFormularioUsuario();

 }
 editarUsuario(Usuario:ModeloUsuarioData){
  this.usuarioid = usuario.su_codSupl;
  this.modoedicionUsuario = true;
  this.formularioUsuario.patchValue(Usuario);
  this.tituloModalUsuario = 'Editando Usuario';
  $('#modalusuario').modal('show');
  this.habilitarFormiarioUsuario = true;
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
this.habilitarFormiarioUsuario = true;
this.modoconsultaUsuario = true;
};

eliminarUsuario(Usuario:ModeloUsuarioData){
  this.servicioUsuario.eliminarUsuario(Usuario.su_codSupl).subscribe(response => {
    alert("Usuario Eliminado");
    this.buscarTodosUsuario();
  });
}


guardarUsuario(){
  console.log(this.formularioUsuario.value);
  if(this.formularioUsuario.valid){
    if(this.modoedicionUsuario){
      this.servicioUsuario.editarUsuario(this.usuarioid, this.formularioUsuario.value).subscribe(response => {
      alert("Usuario Editado");
      this.buscarTodosUsuario();
      this.formularioUsuario.reset();
      this.crearFormularioUsuario();
      $('#modalusuario').modal('hide');
      });
    }else{
      this.servicioUsuario.guardarUsuario(this.formularioUsuario.value).subscribe(response => {
      alert("Usuario Guardado");
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

