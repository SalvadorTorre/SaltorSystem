import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
declare var $: any;

@Component({
  selector: 'Inventario',
  templateUrl: './inventario.html',
  styleUrls: ['./inventario.css']
})
export class Inventario {
  habilitarBusqueda: boolean = true;
  tituloModalProducto!: string;
  formularioInventario!:FormGroup;

  constructor(private fb:FormBuilder) {
    this.crearFormularioInventario();
  }

  crearFormularioInventario(){
    this.formularioInventario = this.fb.group({
      codigo:["", Validators.required],
      descripcion:["", Validators.required],
      unidad:["", ],
      peso:["", Validators.required],
      longitud:["", Validators.required],
    });
  }

  habilitarBuscador(){
    this.habilitarBusqueda = false;
  }

 nuevoProducto(){
   this.tituloModalProducto = 'Agregar Producto';
   $('#modalProducto').modal('show');
 }

 editarProducto(){
  this.tituloModalProducto = 'Editar Producto';
  $('#modalProducto').modal('show');
}

onSubmitInventario(){
  if(this.formularioInventario.valid){
  console.log(this.formularioInventario.value);
  }else{
    alert("Formulario invalido");
  }
}
}
