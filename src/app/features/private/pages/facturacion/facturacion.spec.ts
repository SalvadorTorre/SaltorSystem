import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Facturacion } from './facturacion';
import { FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ServicioCliente } from 'src/app/core/services/mantenimientos/clientes/cliente.service';
import { HttpInvokeService } from 'src/app/core/services/http-invoke.service';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
import { ServicioRnc } from 'src/app/core/services/mantenimientos/rnc/rnc.service';
import { ServicioSector } from 'src/app/core/services/mantenimientos/sector/sector.service';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';
import { ServicioNcf } from 'src/app/core/services/mantenimientos/ncf/ncf.service';

// Mock jQuery
declare var $: any;

describe('Facturacion Component', () => {
  let component: Facturacion;
  let fixture: ComponentFixture<Facturacion>;
  let mockServicioFacturacion: any;
  let mockServicioUsuario: any;

  beforeEach(async () => {
    // Mock services
    mockServicioFacturacion = {
      buscarTodasFacturacion: jasmine.createSpy('buscarTodasFacturacion').and.returnValue(of({ data: [] })),
      buscarFacturacion: jasmine.createSpy('buscarFacturacion').and.returnValue(of({ data: [] })),
      guardarFacturacion: jasmine.createSpy('guardarFacturacion').and.returnValue(of({})),
      buscarFacturaDetalle: jasmine.createSpy('buscarFacturaDetalle').and.returnValue(of({ data: [] }))
    };

    mockServicioUsuario = {
      buscarUsuarioPorClave: jasmine.createSpy('buscarUsuarioPorClave').and.returnValue(of({ data: [{ idUsuario: 'TEST USER' }] }))
    };

    const mockOtherServices = {
      obtenerTodosFpago: jasmine.createSpy('obtenerTodosFpago').and.returnValue(of({ data: [] })),
      buscarTodosNcf: jasmine.createSpy('buscarTodosNcf').and.returnValue(of({ data: [] })),
      GetRequest: jasmine.createSpy('GetRequest').and.returnValue(of({ data: [] })),
      buscarSector: jasmine.createSpy('buscarSector').and.returnValue(of({ data: [] }))
    };

    await TestBed.configureTestingModule({
      declarations: [ Facturacion ],
      imports: [ ReactiveFormsModule, FormsModule ],
      providers: [
        FormBuilder,
        { provide: ServicioFacturacion, useValue: mockServicioFacturacion },
        { provide: ServicioUsuario, useValue: mockServicioUsuario },
        { provide: ServicioCliente, useValue: mockOtherServices },
        { provide: HttpInvokeService, useValue: mockOtherServices },
        { provide: ServicioInventario, useValue: mockOtherServices },
        { provide: ServicioRnc, useValue: mockOtherServices },
        { provide: ServicioSector, useValue: mockOtherServices },
        { provide: ServicioFpago, useValue: mockOtherServices },
        { provide: ServicioNcf, useValue: mockOtherServices }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Facturacion);
    component = fixture.componentInstance;
    
    // Mock global $
    (window as any).$ = jasmine.createSpy('$').and.returnValue({
      modal: jasmine.createSpy('modal'),
      focus: jasmine.createSpy('focus'),
      select: jasmine.createSpy('select'),
      val: jasmine.createSpy('val')
    });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate totals correctly', () => {
    component.items = [
      { total: 100, cantidad: 1, precio: 100, producto: {} as any, costo: 50, fecfactActual: new Date() },
      { total: 200, cantidad: 2, precio: 100, producto: {} as any, costo: 50, fecfactActual: new Date() }
    ];
    // Total = 300
    // ITBIS = 300 * 0.18 = 54
    // Subtotal = 300 - 54 = 246
    
    component.actualizarTotales();
    
    expect(component.totalGral).toBe(300);
    expect(component.totalItbis).toBeCloseTo(54);
    expect(component.subTotal).toBeCloseTo(246);
  });

  it('should open modal when abrirModalDetalle is called', () => {
    component.abrirModalDetalle();
    expect((window as any).$).toHaveBeenCalledWith('#modalDetalleFactura');
  });

  it('should call abrirModalDetalle when buscarUsuario finds a user', () => {
    spyOn(component, 'abrirModalDetalle');
    component.formularioFacturacion.controls['fa_codVend'].setValue('123');
    
    const event = new Event('keydown');
    spyOn(event, 'preventDefault');
    
    component.buscarUsuario(event, null);
    
    expect(mockServicioUsuario.buscarUsuarioPorClave).toHaveBeenCalledWith('123');
    expect(component.abrirModalDetalle).toHaveBeenCalled();
  });
});
