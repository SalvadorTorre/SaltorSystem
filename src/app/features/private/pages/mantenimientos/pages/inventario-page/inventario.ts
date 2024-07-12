import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ModeloInventarioData } from 'src/app/core/services/mantenimientos/inventario';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
declare var $: any;

@Component({
  selector: 'Inventario',
  templateUrl: './inventario.html',
  styleUrls: ['./inventario.css']
})
export class Inventario implements OnInit {
  habilitarBusqueda: boolean = false;
  tituloModalProducto!: string;
  formularioInventario!:FormGroup;
  invenarioList:ModeloInventarioData[] = [];

  constructor(private fb:FormBuilder, private servicioInventario:ServicioInventario) {
    this.crearFormularioInventario();
  }
  ngOnInit(): void {
    this.obtenerTodosInventario();
    this.formularioInventario.disable();
  }

  crearFormularioInventario(){
    this.formularioInventario = this.fb.group({
      in_codmerc: ["", Validators.required],
      in_desmerc: ["", Validators.required],
      in_grumerc: [null, Validators.required],
      in_tramo: ["", Validators.required],
      in_canmerc: ["", Validators.required],
      in_caninve: ["", Validators.required],
      in_fecinve: [null],
      in_eximini: ["", Validators.required],
      in_cosmerc: [null],
      in_premerc: ["", Validators.required],
      in_precmin: ["", Validators.required],
      in_costpro: ["", Validators.required],
      in_ucosto: ["", Validators.required],
      in_porgana: ["", Validators.required],
      in_peso: ["", Validators.required],
      in_longitud: [null],
      in_unidad: ["", Validators.required],
      in_medida: [null],
      in_longitu: [null],
      in_fecmodif: [null],
      in_amacen: ["", Validators.required],
      in_imagen: ["", Validators.required],
      in_status: ["", Validators.required]
    });
  }

  habilitarBuscador(){
    this.habilitarBusqueda = false;
  }

 nuevoProducto(){
   this.tituloModalProducto = 'Agregar Producto';
   $('#modalProducto').modal('show');
 }

 editarProducto(invetario:ModeloInventarioData){
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

  obtenerTodosInventario(){
    this.servicioInventario.obtenerTodosInventario().subscribe(response =>{
      this.invenarioList = response.data;
    }
    );
  }
}
