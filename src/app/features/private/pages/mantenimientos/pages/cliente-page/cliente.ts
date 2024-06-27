import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ServicioCliente } from 'src/app/core/services/mantenimientos/clientes/cliente.service';
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

  constructor(private fb:FormBuilder, private servicioCliente:ServicioCliente) {
    this.crearFormularioCliente();
  }

  crearFormularioCliente(){
    this.formularioCliente = this.fb.group({
      cl_codClie: ['', Validators.required],
      cl_nomClie: ['', Validators.required],
      cl_dirClie: [''], 
      cl_codSect: [''],
      cl_codZona: [''],
      cl_telClie: [''],
      cl_tipo: [''],
      cl_status: [true],
      cl_rnc: ['']
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
  this.servicioCliente.guardarCliente(this.formularioCliente.value).subscribe(response => {
    alert("Cliente guardado correctamente");
  });
  }else{
    alert("Formulario Cliente");
  }
}
}
