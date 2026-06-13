import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import Swal from 'sweetalert2';
import {
  CuentaBancariaData,
  MonedaCuentaBancaria,
  TipoCuentaBancaria,
} from 'src/app/core/services/mantenimientos/cuenta-bancaria';
import { ServicioCuentaBancaria } from 'src/app/core/services/mantenimientos/cuenta-bancaria/cuenta-bancaria.service';

@Component({
  selector: 'app-cuentas-bancarias',
  templateUrl: './cuentas-bancarias.html',
  styleUrls: ['./cuentas-bancarias.css'],
})
export class CuentasBancariasPage implements OnInit {
  @ViewChild('codigoInput') codigoInput?: ElementRef<HTMLInputElement>;

  cuentas: CuentaBancariaData[] = [];
  actual: CuentaBancariaData = this.nuevoRegistro();
  editandoId: number | null = null;
  busqueda = '';
  soloActivas = false;
  cargando = false;
  alcanceSucursal: 'todas' | 'sucursal' = 'todas';

  readonly tipos: TipoCuentaBancaria[] = ['CORRIENTE', 'AHORRO', 'TARJETA', 'OTRA'];
  readonly monedas: MonedaCuentaBancaria[] = ['DOP', 'USD', 'EUR'];

  constructor(private cuentaSrv: ServicioCuentaBancaria) {}

  ngOnInit(): void {
    this.cargarCuentas();
  }

  get totalCuentas(): number {
    return this.cuentas.length;
  }

  get totalActivas(): number {
    return this.cuentas.filter((item) => item.activo !== false).length;
  }

  get cuentaDefault(): CuentaBancariaData | null {
    return this.cuentas.find((item) => item.es_default && item.activo !== false) || null;
  }

  get filtradas(): CuentaBancariaData[] {
    const q = this.normalizar(this.busqueda);
    return this.cuentas.filter((cuenta) => {
      const estadoOk = !this.soloActivas || cuenta.activo !== false;
      const texto = this.normalizar([
        cuenta.codigo,
        cuenta.nombre,
        cuenta.banco,
        cuenta.numero_cuenta,
        cuenta.titular,
        cuenta.moneda,
        cuenta.tipo_cuenta,
      ].join(' '));
      return estadoOk && (!q || texto.includes(q));
    });
  }

  cargarCuentas(): void {
    this.cargando = true;
    this.cuentaSrv.buscarTodos(1, 500).subscribe({
      next: (resp) => {
        this.cuentas = resp.data || [];
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        Swal.fire('Error', this.extraerError(err), 'error');
      },
    });
  }

  guardar(form: NgForm): void {
    if (!form.valid || !this.actual.codigo || !this.actual.nombre || !this.actual.banco || !this.actual.numero_cuenta) {
      Swal.fire('Datos incompletos', 'Completa codigo, alias, banco y numero de cuenta.', 'warning');
      return;
    }

    if (this.alcanceSucursal === 'sucursal' && !Number(this.actual.sucursalid || 0)) {
      Swal.fire('Sucursal requerida', 'Selecciona o escribe el codigo de sucursal para esta cuenta.', 'warning');
      return;
    }

    if (this.alcanceSucursal === 'todas') {
      this.actual.sucursalid = null;
    }

    const request = this.editandoId
      ? this.cuentaSrv.editar(this.editandoId, this.actual)
      : this.cuentaSrv.guardar(this.actual);

    request.subscribe({
      next: () => {
        Swal.fire('Guardado', 'La cuenta bancaria fue guardada correctamente.', 'success');
        this.nuevo(form);
        this.cargarCuentas();
      },
      error: (err) => Swal.fire('Error', this.extraerError(err), 'error'),
    });
  }

  editar(cuenta: CuentaBancariaData): void {
    this.editandoId = cuenta.id ?? null;
    this.actual = {
      ...cuenta,
      activo: cuenta.activo !== false,
      es_default: !!cuenta.es_default,
    };
    this.alcanceSucursal = cuenta.sucursalid ? 'sucursal' : 'todas';
    setTimeout(() => this.codigoInput?.nativeElement?.focus());
  }

  ver(cuenta: CuentaBancariaData): void {
    Swal.fire({
      title: cuenta.nombre,
      html: `
        <div style="text-align:left">
          <p><b>Codigo:</b> ${this.escape(cuenta.codigo)}</p>
          <p><b>Banco:</b> ${this.escape(cuenta.banco)}</p>
          <p><b>Cuenta:</b> ${this.escape(cuenta.numero_cuenta)}</p>
          <p><b>Tipo:</b> ${this.escape(cuenta.tipo_cuenta)}</p>
          <p><b>Moneda:</b> ${this.escape(cuenta.moneda)}</p>
          <p><b>Titular:</b> ${this.escape(cuenta.titular || '-')}</p>
          <p><b>Estado:</b> ${cuenta.activo !== false ? 'Activa' : 'Inactiva'}</p>
        </div>
      `,
      confirmButtonText: 'Aceptar',
    });
  }

  eliminar(cuenta: CuentaBancariaData): void {
    if (!cuenta.id) return;

    Swal.fire({
      title: 'Eliminar cuenta bancaria',
      text: `Desea eliminar ${cuenta.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Si, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.cuentaSrv.eliminar(cuenta.id!).subscribe({
        next: () => this.cargarCuentas(),
        error: (err) => Swal.fire('Error', this.extraerError(err), 'error'),
      });
    });
  }

  nuevo(form?: NgForm): void {
    const registro = this.nuevoRegistro();
    this.editandoId = null;
    this.alcanceSucursal = 'todas';
    this.actual = { ...registro };
    form?.resetForm({ ...registro });
    setTimeout(() => this.codigoInput?.nativeElement?.focus());
  }

  cancelar(form: NgForm): void {
    this.nuevo(form);
  }

  formatearCuenta(cuenta: CuentaBancariaData): string {
    const numero = String(cuenta.numero_cuenta || '').trim();
    if (numero.length <= 4) return numero;
    return `${'*'.repeat(Math.max(numero.length - 4, 0))}${numero.slice(-4)}`;
  }

  alcance(cuenta: CuentaBancariaData): string {
    const empresa = String(cuenta.cod_empre || '').trim();
    const sucursal = cuenta.sucursalid ? `Sucursal ${cuenta.sucursalid}` : 'Todas las sucursales';
    return [empresa, sucursal].filter(Boolean).join(' / ') || 'General';
  }

  onAlcanceSucursalChange(): void {
    if (this.alcanceSucursal === 'todas') {
      this.actual.sucursalid = null;
    }
  }

  private nuevoRegistro(): CuentaBancariaData {
    return {
      codigo: '',
      nombre: '',
      banco: '',
      numero_cuenta: '',
      tipo_cuenta: 'CORRIENTE',
      moneda: 'DOP',
      titular: '',
      cod_empre: '',
      sucursalid: null,
      es_default: false,
      activo: true,
      notas: '',
    };
  }

  private extraerError(err: any): string {
    return String(err?.message || err?.error?.message || err || 'No se pudo completar la operacion.');
  }

  private normalizar(value: any): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private escape(value: any): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
