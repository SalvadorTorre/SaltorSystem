import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ModeloSector } from 'src/app/core/services/mantenimientos/sector';
import { ServicioSector } from 'src/app/core/services/mantenimientos/sector/sector.service';
declare var $: any;

@Component({
  selector: 'Sector',
  templateUrl: './sector.html',
  styleUrls: ['./sector.css']
})
export class Sector implements OnInit {
  habilitarBusqueda: boolean = false;
  tituloModalSector!: string;
  formularioSector!:FormGroup;
  sectorList:ModeloSector[] = [];
  sectordescripcion:string = '';
  sectorcodigo:any;

  constructor(private fb:FormBuilder,  private servicioSector:ServicioSector) {
    this.crearFormularioSector();
  }
  ngOnInit(): void {
    this.getAllSector();
  }

  crearFormularioSector(){
    this.formularioSector = this.fb.group({
      se_dessect: ['', Validators.required],

    });
  }

  habilitarBuscador(){
    this.habilitarBusqueda = false;
  }

 nuevoSector(){
   this.tituloModalSector = 'Agregar Sector';
   $('#modalsecto').modal('show');
 }

 editarSector(sector:ModeloSector){
  this.sectorcodigo = sector.se_codSect;
  this.sectordescripcion = sector.se_desSect;

}

getAllSector(){
  this.servicioSector.obtenerTodasSector().subscribe(response => {
    console.log(response);
    this.sectorList = response.data;
  });
}

gualdarSector(){
  if(this.sectordescripcion!= ''){
  this.servicioSector.guardarSector({se_desset: this.sectordescripcion.toUpperCase()}).subscribe(response => {
    alert("Sector guardado correctamente");
    this.getAllSector();
    this.sectordescripcion = '';
    this.sectorcodigo = '';
  });
  }else{
    alert("Formulario Sector");
  }
}
}
