import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ServicioCliente } from 'src/app/core/services/mantenimientos/clientes/cliente.service';
import { ModeloZona, ModeloZonaData } from 'src/app/core/services/mantenimientos/zonas';
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
  zonasList:ModeloZonaData[] = [];

  constructor(private fb:FormBuilder, private servicioCliente:ServicioCliente, private servicioZona:ServicioZona) {
    this.crearFormularioCliente();
  }
  ngOnInit(): void {
    this.getAllZona();
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

getAllZona(){
  this.servicioZona.obtenerTodasZonas().subscribe(response => {
    console.log(response);
    this.zonasList = response.data;
  });
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
