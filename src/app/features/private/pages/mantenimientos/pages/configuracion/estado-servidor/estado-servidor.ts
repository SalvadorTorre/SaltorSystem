import { Component, OnDestroy, OnInit } from '@angular/core';
import { SupabaseService } from 'src/app/core/services/supabase/supabase.service';

interface ServerMetricas {
  server_name?: string | null;
  captured_at?: string | null;
  uptime_seconds?: number | null;
  cpu_percent?: number | null;
  load1?: number | null;
  load5?: number | null;
  load15?: number | null;
  memory_total_mb?: number | null;
  memory_used_mb?: number | null;
  memory_available_mb?: number | null;
  memory_percent?: number | null;
  swap_total_mb?: number | null;
  swap_used_mb?: number | null;
  disk_path?: string | null;
  disk_total_gb?: number | null;
  disk_used_gb?: number | null;
  disk_available_gb?: number | null;
  disk_percent?: number | null;
  temperature_c?: number | null;
  docker_running?: number | null;
  docker_total?: number | null;
  tailscale_ip?: string | null;
  supabase_services?: Array<{
    name?: string;
    status?: string;
    running?: boolean;
  }> | null;
}

@Component({
  selector: 'app-estado-servidor',
  templateUrl: './estado-servidor.html',
  styleUrls: ['./estado-servidor.css'],
})
export class EstadoServidorPage implements OnInit, OnDestroy {
  metricas: ServerMetricas | null = null;
  cargando = false;
  error = '';
  actualizado = '';

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly supabase: SupabaseService) {}

  ngOnInit(): void {
    void this.cargarMetricas();
    this.timer = setInterval(() => void this.cargarMetricas(false), 5000);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async cargarMetricas(showLoading = true): Promise<void> {
    const client = this.supabase.client as any;
    if (!client) {
      this.error = 'Supabase no esta configurado.';
      return;
    }

    this.cargando = showLoading;
    this.error = '';

    try {
      const { data, error } = await client
        .schema(this.supabase.schema)
        .from('server_metricas')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;
      this.metricas = data || null;
      this.actualizado = this.formatFecha(this.metricas?.captured_at);
    } catch (error: any) {
      this.error = String(
        error?.message || error || 'No se pudo leer el estado del servidor.',
      );
    } finally {
      this.cargando = false;
    }
  }

  get estaEnLinea(): boolean {
    if (!this.metricas?.captured_at) return false;
    const date = new Date(this.metricas.captured_at);
    if (Number.isNaN(date.getTime())) return false;
    return Date.now() - date.getTime() <= 30000;
  }

  get servicios(): any[] {
    return Array.isArray(this.metricas?.supabase_services)
      ? this.metricas!.supabase_services!
      : [];
  }

  percent(value?: number | null): number {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }

  formatNumero(value?: number | null, decimals = 1): string {
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return n.toLocaleString('es-DO', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  formatMemoria(value?: number | null): string {
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    if (n >= 1024) return `${this.formatNumero(n / 1024, 2)} GB`;
    return `${this.formatNumero(n, 0)} MB`;
  }

  formatDisco(value?: number | null): string {
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return `${this.formatNumero(n, 2)} GB`;
  }

  formatUptime(seconds?: number | null): string {
    const total = Number(seconds || 0);
    if (!Number.isFinite(total) || total <= 0) return '-';
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }

  barraClase(value?: number | null): string {
    const n = this.percent(value);
    if (n >= 90) return 'danger';
    if (n >= 75) return 'warning';
    return 'ok';
  }

  private formatFecha(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
