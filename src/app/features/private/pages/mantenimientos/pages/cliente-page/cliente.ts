import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
declare var $: any;

@Component({
  selector: 'Cliente',
  templateUrl: './cliente.html',
  styleUrls: ['./cliente.css']
})
export class Cliente {
  habilitarBusqueda: boolean = false;
  tituloModalCliente!: string;
  formularioCliente!:FormGroup;

  constructor(private fb:FormBuilder) {
    this.crearFormularioCliente();
  }

  crearFormularioCliente(){
    this.formularioCliente = this.fb.group({
      codigo:["", Validators.required],
      nombre:["", Validators.required],
      rnc:["", ],
      direccion:["", Validators.required],
      sector:["", Validators.required],
    });
  }

  habilitarBuscador(){
    this.habilitarBusqueda = false;
  }

 nuevoCliente(){
   this.tituloModalCliente = 'Agregar Cliente';
   $('#modalcliente').modal('show');
 }

 editarCliente(){
  this.tituloModalCliente = 'Editar Producto';
  $('#modalcliente').modal('show');
}

onSubmitCliente(){
  if(this.formularioCliente.valid){
  console.log(this.formularioCliente.value);
  }else{
    alert("Formulario Cliente");
  }
}
}
