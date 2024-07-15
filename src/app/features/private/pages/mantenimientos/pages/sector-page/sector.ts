import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ModeloSector, ModeloSectorData } from 'src/app/core/services/mantenimientos/sector';
import { ServicioSector } from 'src/app/core/services/mantenimientos/sector/sector.service';
import { ModeloZonaData } from 'src/app/core/services/mantenimientos/zonas';
import { ServicioZona } from 'src/app/core/services/mantenimientos/zonas/zonas.service';
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
  sectorList:ModeloSectorData[] = [];
  zonaList:ModeloZonaData[] = [];
  sectordescripcion:string = '';
  sectorcodigo:any;
  sectorzona:any;
  modoedicionSector:boolean = false;
  modoconsultaSector:boolean = false;
  constructor(private fb:FormBuilder,  private servicioSector:ServicioSector,private servicioZona:ServicioZona) {
    this.crearFormularioSector();
  }
  ngOnInit(): void {
    this.getAllSector();
    this.buscartadaZona();
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

 editarSector(sector:ModeloSectorData){
  this.sectorcodigo = sector.se_codSect;
  this.sectordescripcion = sector.se_desSect;
  this.sectorzona = sector.se_codZona;
 }

getAllSector(){
  this.servicioSector.obtenerTodasSector().subscribe(response => {
    console.log(response);
    this.sectorList = response.data;
  });
}

buscartadaZona(){
  this.servicioZona.obtenerTodasZonas().subscribe(response => {
    console.log(response);
    this.zonaList = response.data;
  });
}
gualdarSector(){
  if(this.sectordescripcion!= ''){
      var data = {
      se_desSect: this.sectordescripcion.toUpperCase(),
      se_codZona: this.sectorzona
      }
      this.servicioSector.guardarSector(data).subscribe(response => {
      alert("Sector guardado correctamente");
      this.getAllSector();
      this.sectordescripcion = '';
       this.sectorcodigo = '';
       this.sectorzona = '';
       this.formularioSector.reset();
       this.buscartadaZona();
  });

}else{
    alert("Formulario Sector");}
}
}
