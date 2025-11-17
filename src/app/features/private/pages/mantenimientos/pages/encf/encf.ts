import { Component, OnInit } from '@angular/core';
import { Encf, EncfModel } from './encf-modelo';
import { ServicioEncf } from 'src/app/core/services/mantenimientos/encf/encf.service';
import { ServicioTiponcf, TiponcfData } from 'src/app/core/services/mantenimientos/tiponcf/tiponcf.service';
import { ServicioEmpresa } from 'src/app/core/services/mantenimientos/empresas/empresas.service';
import { EmpresaModelData } from 'src/app/core/services/mantenimientos/empresas';

@Component({
  selector: 'app-encf',
  templateUrl: './encf.html',
  styleUrls: ['./encf.css']
})
export class EncfComponent implements OnInit {
  encf: Encf = new EncfModel();
  listaEncf: Encf[] = [];
  editIndex: number = -1;
  page = 1;
  limit = 10;
  tiposNcf: TiponcfData[] = [];
  empresas: EmpresaModelData[] = [];

  constructor(
    private servicioEncf: ServicioEncf,
    private servicioTiponcf: ServicioTiponcf,
    private servicioEmpresa: ServicioEmpresa,
  ) {}

  ngOnInit(): void {
    this.cargarEncf();
    this.cargarTiposNcf();
    this.cargarEmpresas();
  }

  cargarEncf(): void {
    this.servicioEncf.listarEncf(this.page, this.limit).subscribe((resp) => {
      // El controlador obtenerEncf devuelve {status, code, message, data, pagination}
      // pero otros endpoints pueden devolver arrays simples. Adaptamos ambos casos.
      const data = Array.isArray(resp) ? resp : resp?.data;
      this.listaEncf = (data ?? []) as Encf[];
    });
  }

  cargarTiposNcf(): void {
    this.servicioTiponcf.obtenerTodos().subscribe((lista) => {
      this.tiposNcf = lista ?? [];
    });
  }

  cargarEmpresas(): void {
    // Cargamos las empresas para el selector de empresa
    this.servicioEmpresa.buscarTodasEmpresa(1, 100).subscribe((resp) => {
      this.empresas = resp?.data ?? [];
    });
  }

  tipoDescripcion(code?: string): string {
    if (!code) { return ''; }
    const t = this.tiposNcf.find(x => x.tipo === code);
    return t?.desNcf ?? code;
  }

  guardarEncf() {
    if (!this.encf.codempr || !this.encf.tipoencf || !this.encf.fechaencf) {
      alert('Debe completar los campos requeridos: Empresa, Tipo y Fecha.');
      return;
    }

    const payload = {
      codempr: this.encf.codempr,
      cantencf: this.encf.cantencf,
      countencf: this.encf.countencf,
      alertaencf: this.encf.alertaencf,
      fechaencf: this.encf.fechaencf,
      hastaencf: this.encf.hastaencf,
      tipoencf: this.encf.tipoencf,
      desdeencf: this.encf.desdeencf,
    } as any;
    // El backend crea y devuelve el registro creado
    this.servicioEncf.crearEncf(payload).subscribe(() => {
      this.limpiarFormulario();
      this.cargarEncf();
    });
  }

  limpiarFormulario() {
    this.encf = new EncfModel();
    this.editIndex = -1;
  }

  editar(item: Encf) {
    const idx = this.listaEncf.findIndex(n => n === item);
    this.editIndex = idx;
    this.encf = { ...item };
  }

  eliminar(item: Encf) {
    if (!item?.id) { return; }
    if (confirm('¿Seguro que desea eliminar este registro?')) {
      this.servicioEncf.eliminarEncf(item.id).subscribe(() => {
        this.limpiarFormulario();
        this.cargarEncf();
      });
    }
  }
}