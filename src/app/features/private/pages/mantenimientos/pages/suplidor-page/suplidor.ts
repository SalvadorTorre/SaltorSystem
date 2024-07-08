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
      su_nomSupl: ['', Validators.required],
      su_rncsupl: [''],
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
   this.tituloModalSuplidor = 'Agregar Suplidor';
   $('#modalcliente').modal('show');
   this.habilitarFormiarioSuplidor = true;
 }

 editarSuplidor(suplidor:ModeloSuplidorData){
  this.suplidorid = suplidor.su_codSupl;
  this.modoedicionSuplidor = true;
  this.formularioSuplidor.patchValue(suplidor);
  this.tituloModalSuplidor = 'Editar Suplidor';
  $('#modalcliente').modal('show');
  this.habilitarFormiarioSuplidor = true;
}

buscarTodosSuplidor(){
  this.servicioSuplidor.buscarTodosSuplidor().subscribe(response => {
    console.log(response);
    this.suplidorList = response.data;
  });
}

guardarSuplidor(){
  console.log(this.formularioSuplidor.value);
  if(this.formularioSuplidor.valid){
     if(this.modoedicionSuplidor){
      this.servicioSuplidor.editarSuplidor(this.suplidorid, this.formularioSuplidor.value).subscribe(response => {
        alert("Suplidor editado correctamente");
        this.buscarTodosSuplidor();
        this.formularioSuplidor.reset();
        this.crearFormularioSuplidor();
        $('#modalcliente').modal('hide');
      });
    }else{
      this.servicioSuplidor.guardarSuplidor(this.formularioSuplidor.value).subscribe(response => {
        alert("Cliente guardado correctamente");
        this.buscarTodosSuplidor();
        this.formularioSuplidor.reset();
        this.crearFormularioSuplidor();
        $('#modalcliente').modal('hide');
      });
    }
      }else{
    alert("Formulario Cliente");

  }

}
}
