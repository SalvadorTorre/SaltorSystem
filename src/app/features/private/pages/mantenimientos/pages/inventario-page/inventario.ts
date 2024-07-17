import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ModeloInventarioData } from 'src/app/core/services/mantenimientos/inventario';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
declare var $: any;
import Swal from 'sweetalert2';


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
  maxChars: number = 30;
  remainingChars: number = this.maxChars;

  constructor(private fb:FormBuilder, private servicioInventario:ServicioInventario) {
    this.crearFormularioInventario();
  }
  ngOnInit(): void {
    this.obtenerTodosInventario();
    // this.formularioInventario.disable();
    this.formularioInventario.get('in_desmerc')!.valueChanges.subscribe(value => {
      this.updateCharCount();
    });
  }

  updateCharCount() {
    const currentLength = this.formularioInventario.get('in_desmerc')!.value.length;
    this.remainingChars = this.maxChars - currentLength;
  }

  crearFormularioInventario(){
    this.formularioInventario = this.fb.group({
      in_codmerc: [""],
      in_desmerc: [""],
      in_grumerc: [null],
      in_tipoproduct: [""],
      in_canmerc: [""],
      in_caninve: [""],
      in_fecinve: [null],
      in_eximini: [""],
      in_cosmerc: [null],
      in_premerc: [""],
      in_precmin: [""],
      in_costpro: [""],
      in_ucosto: [""],
      in_porgana: [""],
      in_peso: [""],
      in_longitud: [null],
      in_unidad: [""],
      in_medida: [null],
      in_longitu: [null],
      in_fecmodif: [null],
      in_amacen: [""],
      in_imagen: [""],
      in_status: [""],
      in_minvent: [null],
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
  this.formularioInventario.patchValue(invetario);
  $('#modalProducto').modal('show');
}

  onSubmitInventario(){
    if(this.formularioInventario.valid){
    this.servicioInventario.guardarInventario(this.formularioInventario.value).subscribe(response =>{
      Swal.fire({
        title: "Excelente!",
        text: "Despachador guardado correctamente.",
        icon: "success",
        timer: 3000,
        showConfirmButton: false,
      });
      this.formularioInventario.reset();
      $('#modalProducto').modal('hide');
      this.crearFormularioInventario();
    });
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
