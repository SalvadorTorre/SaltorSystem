import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ModeloSuplidorData } from 'src/app/core/services/mantenimientos/suplidor';
import { ServicioSuplidor } from 'src/app/core/services/mantenimientos/suplidor/suplidor.service';
declare var $: any;

@Component({
  selector: 'Suplidor',
  templateUrl: './suplidor.html',
  styleUrls: ['./suplidor.css']
})
export class Suplidor implements OnInit {
  habilitarFormiarioSuplidor: boolean = false;
  tituloModalSuplidor!: string;
  formularioSuplidor!:FormGroup;
  clienteList:ModeloSuplidorData[] = [];
  modoedicionSuplidor:boolean = false;
  suplidorid!:number
  modoconsultaSuplidor:boolean = false;
  suplidorList:ModeloSuplidorData[] = [];
  constructor(private fb:FormBuilder, private servicioSuplidor:ServicioSuplidor)
  {
    this.crearFormularioSuplidor();
  }
  ngOnInit(): void {
    this.buscarTodosSuplidor();
  }

  crearFormularioSuplidor(){
    this.formularioSuplidor = this.fb.group({
      su_rncsupl: [''],
      su_nomSupl: ['', Validators.required],
      su_dirSupl: [''],
      su_telSupl: [''],
      su_contact: [''],
      su_status: [true],
      });
  }
habilitarFormularioSuplidor(){
    this.habilitarFormiarioSuplidor = false;
  }

 nuevoSuplidor(){
  this.modoedicionSuplidor = false;
   this.tituloModalSuplidor = 'Agregando Suplidor';
   $('#modalsuplidor').modal('show');
   this.habilitarFormiarioSuplidor = true;
 }

 cerrarModalSuplidor(){
  this.habilitarFormiarioSuplidor = false;
  this.formularioSuplidor.reset();
  this.modoedicionSuplidor = false;
  this.modoconsultaSuplidor = false;
  $('#modalsuplidor').modal('hide');
  this.crearFormularioSuplidor();

 }
 editarSuplidor(suplidor:ModeloSuplidorData){
  this.suplidorid = suplidor.su_codSupl;
  this.modoedicionSuplidor = true;
  this.formularioSuplidor.patchValue(suplidor);
  this.tituloModalSuplidor = 'Editando Suplidor';
  $('#modalsuplidor').modal('show');
  this.habilitarFormiarioSuplidor = true;
}

buscarTodosSuplidor(){
  this.servicioSuplidor.buscarTodosSuplidor().subscribe(response => {
    console.log(response);
    this.suplidorList = response.data;
  });
}
consultarSuplidor(Suplidor:ModeloSuplidorData){
  this.tituloModalSuplidor = 'Consulta Suplidor';
 this.formularioSuplidor.patchValue(Suplidor);
$('#modalsuplidor').modal('show');
this.habilitarFormiarioSuplidor = true;
this.modoconsultaSuplidor = true;
};

eliminarSuplidor(suplidor:ModeloSuplidorData){
  this.servicioSuplidor.eliminarSuplidor(suplidor.su_codSupl).subscribe(response => {
    alert("Suplidor Eliminado");
    this.buscarTodosSuplidor();
  });
}


guardarSuplidor(){
  console.log(this.formularioSuplidor.value);
  if(this.formularioSuplidor.valid){
    if(this.modoedicionSuplidor){
      this.servicioSuplidor.editarSuplidor(this.suplidorid, this.formularioSuplidor.value).subscribe(response => {
      alert("Suplidor Editado");
      this.buscarTodosSuplidor();
      this.formularioSuplidor.reset();
      this.crearFormularioSuplidor();
      $('#modalsuplidor').modal('hide');
      });
    }else{
      this.servicioSuplidor.guardarSuplidor(this.formularioSuplidor.value).subscribe(response => {
      alert("Suplidor Guardado");
      this.buscarTodosSuplidor();
      this.formularioSuplidor.reset();
      this.crearFormularioSuplidor();
      $('#modalcliente').modal('hide');
      });
    }
    }else{
       alert("Este Suplidor no fue Guardado");
    }
}
}
