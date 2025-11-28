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
import { ModeloDespachadorData } from 'src/app/core/services/mantenimientos/despachadores';
import { ServicioDespachador } from 'src/app/core/services/mantenimientos/despachadores/despachador.service';


@Component({
  selector: 'Despachadores',
  templateUrl: './despachadores.html',
  styleUrls: ['./despachadores.css']
})
export class Despachadores implements OnInit {
  habilitarBusqueda: boolean = false;
  tituloModalDespachador!: string;
  formularioDespachador!:FormGroup;
  despachadoresList:ModeloDespachadorData[] = [];
  modoedicionDespachador:boolean = false;
  habilitarFormiarioDespachador:boolean= false
  modoconsultaDespachador:boolean= false
  choferesId!:number
  constructor(private fb:FormBuilder,  private despachadoresService:ServicioDespachador)
  {
    this.crearFormularioDespachador();
  }
  ngOnInit(): void {
    this.obtenerDespachadores();
  }

  crearFormularioDespachador(){
    this.formularioDespachador = this.fb.group({
      nomDesp: ['', Validators.required],
      tipoDesp: [true, Validators.required],
      statusDespachadores: [true, Validators.required],
      cedDesp: ['', Validators.required],
      });
  }

  habilitarBuscador(){
    this.habilitarBusqueda = false;
  }

 nuevoDespachador(){
  this.modoedicionDespachador = false;
   this.tituloModalDespachador = 'Agregar Despachador';
   $('#modaldespachador').modal('show');
   this.habilitarBusqueda = true;
 }

 editarDespachador(despachador:ModeloDespachadorData){
  this.choferesId = despachador.CodDesp;
  this.modoedicionDespachador = true;
  this.formularioDespachador.patchValue(despachador);
  this.tituloModalDespachador = 'Editar Despachador';
  $('#modaldespachador').modal('show');
  this.habilitarBusqueda = true;
}

obtenerDespachadores(){
  this.despachadoresService.obtenerDespachadores().subscribe(response => {
    console.log(response);
    this.despachadoresList = response.data;
  });
}

consultarDespachador(chofer:ModeloChoferData){
  this.tituloModalDespachador = 'Consultar Despachador';
 this.formularioDespachador.patchValue(chofer);
$('#modaldespachador').modal('show');
this.habilitarFormiarioDespachador = true;
this.modoconsultaDespachador = true;
this.habilitarBusqueda = true;

};

cerrarModalDespachador(){
  this.habilitarFormiarioDespachador = false;
  this.formularioDespachador.reset();
  this.modoedicionDespachador = false;
  this.modoconsultaDespachador = false;
  $('#modaldespachador').modal('hide');
  this.crearFormularioDespachador();
};

guardarDespachador(){
  console.log(this.formularioDespachador.value);
  if(this.formularioDespachador.valid){
     if(this.modoedicionDespachador){
      this.despachadoresService.editarDespachador(this.choferesId, this.formularioDespachador.value).subscribe(response => {
        Swal.fire({
          title: "Excelente!",
          text: "Despachador editado correctamente.",
          icon: "success",
          timer: 3000,
          showConfirmButton: false,
        });
        this.obtenerDespachadores();
        this.formularioDespachador.reset();
        this.crearFormularioDespachador();
        $('#modaldespachador').modal('hide');
      });
    }else{
      this.despachadoresService.guardarDespachador(this.formularioDespachador.value).subscribe(response => {
        Swal.fire({
          title: "Excelente!",
          text: "Despachador guardado correctamente.",
          icon: "success",
          timer: 3000,
          showConfirmButton: false,
        });
        this.obtenerDespachadores();
        this.formularioDespachador.reset();
        this.crearFormularioDespachador();
        $('#modaldespachador').modal('hide');
      });
    }
      }else{
    alert("Formulario Despachador Incompleto");

  }

}

eliminarDespachador(choferId:number){
  Swal.fire({
    title: '¿Está seguro de eliminar el despachador?',
    text: "¡No podrá revertir esto!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Si, eliminar!'
  }).then((result) => {
    if (result.isConfirmed) {
      this.despachadoresService.eliminarDespachador(choferId).subscribe(response => {
        Swal.fire(
          {
            title: "Excelente!",
            text: "Despachador eliminado correctamente.",
            icon: "success",
            timer: 3000,
            showConfirmButton: false,
          }
        )
        this.obtenerDespachadores();
      });
    }
  })
}

}
