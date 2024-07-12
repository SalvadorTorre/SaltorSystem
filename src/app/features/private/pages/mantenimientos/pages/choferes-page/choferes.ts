import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ServicioCliente } from 'src/app/core/services/mantenimientos/clientes/cliente.service';
import { ModeloClienteData } from 'src/app/core/services/mantenimientos/clientes';
import { ModeloZonaData } from 'src/app/core/services/mantenimientos/zonas';
import { ServicioZona } from 'src/app/core/services/mantenimientos/zonas/zonas.service';
import { ServicioChofer } from 'src/app/core/services/mantenimientos/choferes/choferes.service';
import { ModeloChoferData } from 'src/app/core/services/mantenimientos/choferes';
declare var $: any;
import Swal from 'sweetalert2';


@Component({
  selector: 'Choferes',
  templateUrl: './choferes.html',
  styleUrls: ['./choferes.css']
})
export class Choferes implements OnInit {
  habilitarBusqueda: boolean = false;
  tituloModalChofer!: string;
  formularioChofer!:FormGroup;
  choferesList:ModeloChoferData[] = [];
  zonasList:ModeloZonaData[] = [];
  modoedicionChofer:boolean = false;
  habilitarFormiarioChofer:boolean= false
  modoconsultaChofer:boolean= false
  choferesId!:number
  constructor(private fb:FormBuilder,  private choferesService:ServicioChofer)
  {
    this.crearFormularioChofer();
  }
  ngOnInit(): void {
    this.obtenerChoferes();
  }

  crearFormularioChofer(){
    this.formularioChofer = this.fb.group({
      cedChofer: ['', Validators.required],
      nomChofer: ['', Validators.required],
      statusChofer: [true, Validators.required],
      });
  }

  habilitarBuscador(){
    this.habilitarBusqueda = false;
  }

 nuevoChofer(){
  this.modoedicionChofer = false;
   this.tituloModalChofer = 'Agregar Chofer';
   $('#modalchofer').modal('show');
   this.habilitarBusqueda = true;
 }

 editarChofer(chofer:ModeloChoferData){
  this.choferesId = chofer.codChofer;
  this.modoedicionChofer = true;
  this.formularioChofer.patchValue(chofer);
  this.tituloModalChofer = 'Editar Chofer';
  $('#modalchofer').modal('show');
  this.habilitarBusqueda = true;
}

obtenerChoferes(){
  this.choferesService.obtenerChoferes().subscribe(response => {
    console.log(response);
    this.choferesList = response.data;
  });
}

consultarChofer(chofer:ModeloChoferData){
  this.tituloModalChofer = 'Consultar Chofer';
 this.formularioChofer.patchValue(chofer);
$('#modalchofer').modal('show');
this.habilitarFormiarioChofer = true;
this.modoconsultaChofer = true;
this.habilitarBusqueda = true;

};

cerrarModalChofer(){
  this.habilitarFormiarioChofer = false;
  this.formularioChofer.reset();
  this.modoedicionChofer = false;
  this.modoconsultaChofer = false;
  $('#modalchofer').modal('hide');
  this.crearFormularioChofer();
};

guardarChofer(){
  console.log(this.formularioChofer.value);
  if(this.formularioChofer.valid){
     if(this.modoedicionChofer){
      this.choferesService.editarChofer(this.choferesId, this.formularioChofer.value).subscribe(response => {
        Swal.fire({
          title: "Excelente!",
          text: "Chofer editado correctamente.",
          icon: "success",
          timer: 3000,
          showConfirmButton: false,
        });
        this.obtenerChoferes();
        this.formularioChofer.reset();
        this.crearFormularioChofer();
        $('#modalchofer').modal('hide');
      });
    }else{
      this.choferesService.guardarChofer(this.formularioChofer.value).subscribe(response => {
        Swal.fire({
          title: "Excelente!",
          text: "Chofer guardado correctamente.",
          icon: "success",
          timer: 3000,
          showConfirmButton: false,
        });
        this.obtenerChoferes();
        this.formularioChofer.reset();
        this.crearFormularioChofer();
        $('#modalchofer').modal('hide');
      });
    }
      }else{
    alert("Formulario Cliente");

  }

}

eliminarChofer(choferId:number){
  Swal.fire({
    title: '¿Está seguro de eliminar el chofer?',
    text: "¡No podrá revertir esto!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Si, eliminar!'
  }).then((result) => {
    if (result.isConfirmed) {
      this.choferesService.eliminarChoferes(choferId).subscribe(response => {
        Swal.fire(
          {
            title: "Excelente!",
            text: "Chofer eliminado correctamente.",
            icon: "success",
            timer: 3000,
            showConfirmButton: false,
          }
        )
        this.obtenerChoferes();
      });
    }
  })
}

}
