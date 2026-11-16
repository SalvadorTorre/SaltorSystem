import { Component } from '@angular/core';
import { NotaCreditoComponent } from '../../../contabilidad/pages/nota-credito/nota-credito';
import { NotaCreditoService } from 'src/app/core/services/contabilidad/nota-credito/nota-credito.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ServicioConfiguracionGlobal } from 'src/app/core/services/mantenimientos/configuracion-global/configuracion-global.service';
import { ServicioItbis } from 'src/app/core/services/mantenimientos/itbis/itbis.service';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';

@Component({
  selector: 'app-nota-credito-consulta-almacen',
  templateUrl: '../../../contabilidad/pages/nota-credito/nota-credito.html',
  styleUrls: ['../../../contabilidad/pages/nota-credito/nota-credito.css'],
})
export class NotaCreditoConsultaAlmacenComponent extends NotaCreditoComponent {
  override soloConsulta = true;

  constructor(
    configuracionGlobal: ServicioConfiguracionGlobal,
    servicioFacturacion: ServicioFacturacion,
    notaCreditoService: NotaCreditoService,
    servicioItbis: ServicioItbis,
    servicioFpago: ServicioFpago,
  ) {
    super(configuracionGlobal, servicioFacturacion, notaCreditoService, servicioItbis, servicioFpago);
  }
}
