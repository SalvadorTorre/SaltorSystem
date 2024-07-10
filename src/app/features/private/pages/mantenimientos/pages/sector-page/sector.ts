import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ModeloSectorData } from 'src/app/core/services/mantenimientos/sector';
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
  sectorList:ModeloSectorData[] = [];
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
      zo_descrip: ['', Validators.required],

    });
  }

  habilitarBuscador(){
    this.habilitarBusqueda = false;
  }

 nuevoSector(){
   this.tituloModalSector = 'Agregar Sector';
   $('#modalsector').modal('show');
 }

 editarSector(sector:ModeloSectorData){
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
  this.servicioSector.guardarSector({se_dessect: this.sectordescripcion.toUpperCase()}).subscribe(response => {
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
