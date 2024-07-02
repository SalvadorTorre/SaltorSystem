import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ModeloZonaData } from 'src/app/core/services/mantenimientos/zonas';
import { ServicioZona } from 'src/app/core/services/mantenimientos/zonas/zonas.service';
declare var $: any;

@Component({
  selector: 'Zona',
  templateUrl: './zona.html',
  styleUrls: ['./zona.css']
})
export class Zona implements OnInit {
  habilitarBusqueda: boolean = false;
  tituloModalZona!: string;
  formularioZona!:FormGroup;
  zonasList:ModeloZonaData[] = [];
  zonadescripcion:string = '';
  zonacodigo:any;

  constructor(private fb:FormBuilder,  private servicioZona:ServicioZona) {
    this.crearFormularioZona();
  }
  ngOnInit(): void {
    this.getAllZona();
  }

  crearFormularioZona(){
    this.formularioZona = this.fb.group({
      zo_descrip: ['', Validators.required],

    });
  }

  habilitarBuscador(){
    this.habilitarBusqueda = false;
  }

 nuevoZona(){
   this.tituloModalZona = 'Agregar Cliente';
   $('#modalcliente').modal('show');
 }

 editarZona(zona:ModeloZonaData){
  this.zonacodigo = zona.zo_codZona;
  this.zonadescripcion = zona.zo_descrip;

}

getAllZona(){
  this.servicioZona.obtenerTodasZonas().subscribe(response => {
    console.log(response);
    this.zonasList = response.data;
  });
}

gualdarZona(){
  if(this.zonadescripcion!= ''){
  this.servicioZona.guardarZona({zo_descrip: this.zonadescripcion.toUpperCase()}).subscribe(response => {
    alert("Zona guardado correctamente");
    this.getAllZona();
    this.zonadescripcion = '';
    this.zonacodigo = '';
  });
  }else{
    alert("Formulario Zona");
  }
}
}
