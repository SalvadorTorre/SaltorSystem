import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject,debounceTime, distinctUntilChanged, switchMap} from 'rxjs';
import { ModeloRncData } from 'src/app/core/services/mantenimientos/rnc';
import { ServicioRnc } from 'src/app/core/services/mantenimientos/rnc/rnc.service';
declare var $: any;
import Swal from 'sweetalert2';

@Component({
  selector: 'Rnc',
  templateUrl: './rnc.html',
  styleUrls: ['./rnc.css']
})
export class Rnc implements OnInit {
  totalItems = 0;
  pageSize = 8;
  currentPage = 1;
  maxPagesToShow = 5;
  txtdescripcion: string = '';
  txtcodigo: string = '';
  idrnc: string = '';
  descripcion: string = '';
  private idBuscar = new BehaviorSubject<string>('');
  private descripcionBuscar = new BehaviorSubject<string>('');

  habilitarFormulario: boolean = false;
  tituloModalrnc!: string;
  formulariornc!: FormGroup;
  clienteList: ModeloRncData[] = [];
  modoedicionRnc: boolean = false;
  rncid!: number;
  modoconsultaRnc: boolean = false;
  rncList: ModeloRncData[] = [];
  selectedrnc: any = null;

  constructor(private fb: FormBuilder, private servicioRnc: ServicioRnc) {

  }

  ngOnInit(): void {
    // Implementation of ngOnInit method
  }
}
