import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ServicioCliente } from 'src/app/core/services/mantenimientos/clientes/cliente.service';
import { ModeloClienteData } from 'src/app/core/services/mantenimientos/clientes';
declare var $: any;

@Component({
  selector: 'Cliente',
  templateUrl: './cliente.html',
  styleUrls: ['./cliente.css']
})
export class Cliente implements OnInit {
  habilitarBusqueda: boolean = false;
  tituloModalCliente!: string;
  formularioCliente!:FormGroup;
  clienteList:ModeloClienteData[] = [];

  constructor(private fb:FormBuilder, private servicioCliente:ServicioCliente)
  {
    this.crearFormularioCliente();
  }
  ngOnInit(): void {
    this.obtenerTodosCliente();
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
      cl_rnc: [''],
    });
  }

  habilitarBuscador(){
    this.habilitarBusqueda = false;
  }

 nuevoCliente(){
   this.tituloModalCliente = 'Agregar Cliente';
   $('#modalcliente').modal('show');
   this.habilitarBusqueda = true;
 }

 editarCliente(){
  this.tituloModalCliente = 'Editar Producto';
  $('#modalcliente').modal('show');
}

obtenerTodosCliente(){
  this.servicioCliente.obtenerTodosCliente().subscribe(response => {
    console.log(response);
    this.clienteList = response.data;
  });
}

guardarCliente(){
  if(this.formularioCliente.valid){

  this.servicioCliente.guardarCliente(this.formularioCliente.value).subscribe(response => {
    alert("Cliente guardado correctamente");
  });
  }else{
    alert("Formulario Cliente");
  }
}
}
