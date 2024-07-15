import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ServicioCliente } from 'src/app/core/services/mantenimientos/clientes/cliente.service';
import { ModeloClienteData } from 'src/app/core/services/mantenimientos/clientes';
import { ModeloZonaData } from 'src/app/core/services/mantenimientos/zonas';
import { ServicioZona } from 'src/app/core/services/mantenimientos/zonas/zonas.service';
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
  zonasList:ModeloZonaData[] = [];
  modoedicionChofer:boolean = false;
  habilitarFormularioCliente:boolean= false
  modoconsultaCliente:boolean= false
  clienteid!:number
  constructor(private fb:FormBuilder, private servicioCliente:ServicioCliente, private servicioZona:ServicioZona)
  {
    this.crearFormularioCliente();
  }
  ngOnInit(): void {
    this.buscartadaZona();
    this.obtenerTodosCliente();
  }

  crearFormularioCliente(){
    this.formularioCliente = this.fb.group({
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
  this.modoedicionChofer = false;
   this.tituloModalCliente = 'Agregar Cliente';
   $('#modalcliente').modal('show');
   this.habilitarBusqueda = true;
 }

 editarCliente(cliente:ModeloClienteData){
  this.clienteid = cliente.cl_codClie;
  this.modoedicionChofer = true;
  this.formularioCliente.patchValue(cliente);
  this.tituloModalCliente = 'Editar Cliente';
  $('#modalcliente').modal('show');
  this.habilitarBusqueda = true;
}

obtenerTodosCliente(){
  this.servicioCliente.obtenerTodosCliente().subscribe(response => {
    console.log(response);
    this.clienteList = response.data;
  });
}

consultarCliente(Cliente:ModeloClienteData){
  this.tituloModalCliente = 'Consultar Cliente';
 this.formularioCliente.patchValue(Cliente);
$('#modalcliente').modal('show');
this.habilitarFormularioCliente = true;
this.modoconsultaCliente = true;
this.habilitarBusqueda = true;

};

cerrarModalCliente(){
  this.habilitarFormularioCliente = false;
  this.formularioCliente.reset();
  this.modoedicionChofer = false;
  this.modoconsultaCliente = false;
  $('#modalclienter').modal('hide');
  this.crearFormularioCliente();
};

guardarCliente(){
  console.log(this.formularioCliente.value);
  if(this.formularioCliente.valid){
     if(this.modoedicionChofer){
      this.servicioCliente.editarCliente(this.clienteid, this.formularioCliente.value).subscribe(response => {
        alert("Cliente editado correctamente");
        this.obtenerTodosCliente();
        this.formularioCliente.reset();
        this.crearFormularioCliente();
        $('#modalcliente').modal('hide');
      });
    }else{
      this.servicioCliente.guardarCliente(this.formularioCliente.value).subscribe(response => {
        alert("Cliente guardado correctamente");
        this.obtenerTodosCliente();
        this.formularioCliente.reset();
        this.crearFormularioCliente();
        $('#modalcliente').modal('hide');
      });
    }
      }else{
    alert("Formulario Cliente");

  }

}
buscartadaZona(){
  this.servicioZona.obtenerTodasZonas().subscribe(response => {
    console.log(response);
    this.zonasList = response.data;
  });
}
}
