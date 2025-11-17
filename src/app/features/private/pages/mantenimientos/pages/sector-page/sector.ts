import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServicioSector } from 'src/app/core/services/mantenimientos/sector/sector.service';
import { ServicioZona } from 'src/app/core/services/mantenimientos/zonas/zonas.service';
import { ModeloSectorData } from 'src/app/core/services/mantenimientos/sector';
import { ModeloZonaData } from 'src/app/core/services/mantenimientos/zonas';
declare var $: any;
import Swal from 'sweetalert2';

@Component({
  selector: 'Sector',
  templateUrl: './sector.html',
  styleUrls: ['./sector.css']
})
export class Sector implements OnInit {
  habilitarFormiarioSector: boolean = false;
  tituloModalSector!: string;
  formularioSector!: FormGroup;

  sectorList: ModeloSectorData[] = [];
  zonasList: ModeloZonaData[] = [];

  modoedicionSector: boolean = false;
  modoconsultaSector: boolean = false;
  sectorid!: number;
  selectedSector: any = null;

  
  pageSize = 8;
  currentPage = 1;
  txtdescripcion: string = '';

  constructor(
    private fb: FormBuilder,
    private servicioSector: ServicioSector,
    private servicioZona: ServicioZona,
  ) {
    this.crearFormularioSector();
  }

  ngOnInit(): void {
    this.buscarTodosSector(1);
    this.servicioZona.obtenerTodasZonas().subscribe(resp => {
      this.zonasList = resp.data;
    });
  }

  crearFormularioSector() {
    this.formularioSector = this.fb.group({
      se_desSect: ['', Validators.required],
      se_codZona: [null, Validators.required],
    });
  }

  nuevoSector() {
    this.modoedicionSector = false;
    this.tituloModalSector = 'Agregando Sector';
    $('#modalsector').modal('show');
    this.habilitarFormiarioSector = true;
    this.formularioSector.enable({ emitEvent: false });
    this.formularioSector.reset({ se_desSect: '', se_codZona: null });
  }

  cerrarModalSector() {
    this.habilitarFormiarioSector = false;
    this.formularioSector.reset();
    this.modoedicionSector = false;
    this.modoconsultaSector = false;
    $('#modalsector').modal('hide');
    this.crearFormularioSector();
  }

  seleccionarSector(sector: any) {
    this.selectedSector = sector;
  }

  editarSector(sector: ModeloSectorData) {
    this.sectorid = sector.se_codSect;
    this.modoedicionSector = true;
    this.formularioSector.enable({ emitEvent: false });
    this.formularioSector.patchValue(sector);
    this.tituloModalSector = 'Editando Sector';
    $('#modalsector').modal('show');
    this.habilitarFormiarioSector = true;
  }

  consultarSector(sector: ModeloSectorData) {
    this.tituloModalSector = 'Consulta Sector';
    this.formularioSector.patchValue(sector);
    $('#modalsector').modal('show');
    this.habilitarFormiarioSector = true;
    this.modoconsultaSector = true;
    this.formularioSector.disable({ emitEvent: false });
  }

  eliminarSector(se_codSect: number) {
    this.servicioSector.eliminarSector(se_codSect).subscribe(response => {
      Swal.fire({
        title: 'Excelente!',
        text: 'Sector Eliminado correctamente.',
        icon: 'success',
        timer: 3000,
        showConfirmButton: false,
      });
      this.buscarTodosSector(this.currentPage);
    });
  }

  guardarSector() {
    if (this.formularioSector.valid) {
      const raw = this.formularioSector.value as any;
      const payload = {
        se_desSect: String(raw.se_desSect || '').toUpperCase(),
        se_codZona: Number(raw.se_codZona),
      };

      if (this.modoedicionSector) {
        this.servicioSector.editarSector(this.sectorid, payload as any).subscribe(response => {
          Swal.fire({
            title: 'Excelente!',
            text: 'Sector Guardado correctamente.',
            icon: 'success',
            timer: 3000,
            showConfirmButton: false,
          });
          this.buscarTodosSector(1);
          this.formularioSector.reset();
          this.crearFormularioSector();
          $('#modalsector').modal('hide');
        });
      } else {
        this.servicioSector.guardarSector(payload as any).subscribe(response => {
          Swal.fire({
            title: 'Excelente!',
            text: 'Sector Guardado correctamente.',
            icon: 'success',
            timer: 3000,
            showConfirmButton: false,
          });
          this.buscarTodosSector(1);
          this.formularioSector.reset();
          this.crearFormularioSector();
          $('#modalsector').modal('hide');
        });
      }
    } else {
      alert('Este Sector no fue Guardado');
    }
  }

  buscarTodosSector(page: number) {
    this.servicioSector.buscarTodosSector(page, this.pageSize, this.txtdescripcion).subscribe(response => {
      this.sectorList = response.data;
      // opcional: si el backend devuelve totalItems
      if (response.totalItems) {
        // @ts-ignore
        this.totalItems = response.totalItems;
      }
    });
  }
}