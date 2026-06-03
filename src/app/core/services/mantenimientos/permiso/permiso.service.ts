import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { SupabaseService } from "../../supabase/supabase.service";
import { Permiso } from "src/app/features/private/pages/mantenimientos/pages/configuracion/permiso/modelo";

export interface AccionCatalogoPermiso {
  accion_key: string;
  descripcion: string;
  orden: number;
}

export interface RecursoCatalogoPermiso {
  recurso_key: string;
  modulo_key: string;
  modulo_nombre: string;
  pantalla_nombre: string;
  ruta?: string | null;
  requiere_tenant?: boolean;
}

export interface PermisoMatrizFila {
  codusuario?: number | null;
  recurso_key?: string | null;
  modulo_key?: string | null;
  pantalla_nombre?: string;
  modulo_nombre?: string;
  ruta?: string | null;
  idmodulo?: number | null; // fallback legacy
  cod_empre?: string | null;
  sucursalid?: number | null;
  acciones: Record<string, boolean>;
  modo: "v2" | "legacy";
  legacyIdPermiso?: number | null;
}

@Injectable({
  providedIn: "root"
})
export class ServicioPermiso {
  private permisoV2Enabled: boolean | null = null;

  constructor(private supabase: SupabaseService) {}

  private get db(): any {
    const client = this.supabase.client;
    if (!client) {
      throw new Error("Supabase no está configurado");
    }
    const anyClient = client as any;
    if (typeof anyClient?.schema === "function") {
      try {
        return anyClient.schema(this.supabase.schema);
      } catch {
        return anyClient;
      }
    }
    return anyClient;
  }

  private normalizarPermiso(row: any): any {
    const codusuario = Number(row?.codusuario ?? row?.idusuario ?? 0) || null;
    return {
      ...row,
      idpermiso: row?.idpermiso ?? null,
      codusuario,
      idusuario: codusuario,
      idmodulo: row?.idmodulo ?? null,
      acceso: row?.acceso ?? "N",
      lectura: row?.lectura ?? "N"
    };
  }

  private async isPermisoV2Disponible(): Promise<boolean> {
    if (this.permisoV2Enabled !== null) {
      return this.permisoV2Enabled;
    }
    try {
      const [{ error: errA }, { error: errR }, { error: errU }] = await Promise.all([
        this.db.from("permiso_accion_catalogo").select("accion_key").limit(1),
        this.db.from("permiso_recurso_catalogo").select("recurso_key").limit(1),
        this.db.from("usuario_permiso_accion").select("id").limit(1),
      ]);
      this.permisoV2Enabled = !(errA || errR || errU);
      return this.permisoV2Enabled;
    } catch {
      this.permisoV2Enabled = false;
      return false;
    }
  }

  private aplicarFiltroScope(query: any, codEmpre?: string | null, sucursalid?: number | null): any {
    let q = query;
    const emp = String(codEmpre || "").trim();
    const suc = Number(sucursalid || 0) || null;
    if (emp) {
      q = q.eq("cod_empre", emp);
    } else {
      q = q.is("cod_empre", null);
    }
    if (suc) {
      q = q.eq("sucursalid", suc);
    } else {
      q = q.is("sucursalid", null);
    }
    return q;
  }

  obtenerTodosPermiso(): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from("permiso")
        .select("*")
        .order("idpermiso", { ascending: true });
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        data: rows.map((row: any) => this.normalizarPermiso(row))
      }))
    );
  }

  guardarPermiso(permiso: Partial<Permiso>): Observable<any> {
    const codusuario = Number((permiso as any)?.codusuario ?? (permiso as any)?.idusuario);
    const payload = {
      codusuario: Number.isNaN(codusuario) ? null : codusuario,
      idmodulo: permiso?.idmodulo ?? null,
      acceso: String(permiso?.acceso ?? "N").toUpperCase(),
      lectura: String(permiso?.lectura ?? "N").toUpperCase()
    };

    return from((async () => {
      const { data, error } = await this.db
        .from("permiso")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: this.normalizarPermiso(row)
      }))
    );
  }

  editarPermiso(idpermiso: number, permiso: Partial<Permiso>): Observable<any> {
    const codusuario = Number((permiso as any)?.codusuario ?? (permiso as any)?.idusuario);
    const payload: any = {
      codusuario: Number.isNaN(codusuario) ? undefined : codusuario,
      idmodulo: permiso?.idmodulo ?? undefined,
      acceso: permiso?.acceso ? String(permiso.acceso).toUpperCase() : undefined,
      lectura: permiso?.lectura ? String(permiso.lectura).toUpperCase() : undefined
    };

    Object.keys(payload).forEach((key: string) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    return from((async () => {
      const { data, error } = await this.db
        .from("permiso")
        .update(payload)
        .eq("idpermiso", idpermiso)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: row ? this.normalizarPermiso(row) : null
      }))
    );
  }

  eliminarPermiso(idpermiso: number): Observable<any> {
    return from((async () => {
      const { error } = await this.db
        .from("permiso")
        .delete()
        .eq("idpermiso", idpermiso);
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({
        status: "success",
        code: 200
      }))
    );
  }

  buscarPermiso(idpermiso: number): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from("permiso")
        .select("*")
        .eq("idpermiso", idpermiso)
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: row ? this.normalizarPermiso(row) : null
      }))
    );
  }

  obtenerAccionesCatalogo(): Observable<any> {
    return from((async () => {
      const v2 = await this.isPermisoV2Disponible();
      if (!v2) {
        return [
          { accion_key: "acceso", descripcion: "Acceso", orden: 10 },
          { accion_key: "lectura", descripcion: "Lectura", orden: 20 },
        ];
      }
      const { data, error } = await this.db
        .from("permiso_accion_catalogo")
        .select("accion_key,descripcion,orden")
        .eq("activo", true)
        .order("orden", { ascending: true });
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        data: rows
      }))
    );
  }

  obtenerRecursosCatalogo(): Observable<any> {
    return from((async () => {
      const v2 = await this.isPermisoV2Disponible();
      if (!v2) {
        const { data, error } = await this.db
          .from("modulo")
          .select("idmodulo,descmodulo")
          .order("idmodulo", { ascending: true });
        if (error) throw error;
        return (data || []).map((m: any) => ({
          recurso_key: `legacy.modulo.${m.idmodulo}`,
          modulo_key: "legacy",
          modulo_nombre: "Legacy",
          pantalla_nombre: m.descmodulo,
          idmodulo: m.idmodulo,
          ruta: null,
          requiere_tenant: true
        }));
      }

      const { data, error } = await this.db
        .from("permiso_recurso_catalogo")
        .select("recurso_key,modulo_key,modulo_nombre,pantalla_nombre,ruta,requiere_tenant")
        .eq("activo", true)
        .order("orden", { ascending: true });
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        data: rows
      }))
    );
  }

  obtenerMatrizPermisosUsuario(codusuario: number, codEmpre?: string | null, sucursalid?: number | null): Observable<any> {
    return from((async () => {
      const userId = Number(codusuario || 0);
      if (!userId) return { acciones: [], recursos: [], filas: [], modo: "legacy" as const };

      const v2 = await this.isPermisoV2Disponible();
      if (!v2) {
        const [{ data: modulos, error: errM }, { data: permisos, error: errP }] = await Promise.all([
          this.db.from("modulo").select("idmodulo,descmodulo").order("idmodulo", { ascending: true }),
          this.db.from("permiso").select("*").eq("codusuario", userId).order("idpermiso", { ascending: true })
        ]);
        if (errM) throw errM;
        if (errP) throw errP;
        const mapa = new Map<number, any>();
        (permisos || []).forEach((p: any) => mapa.set(Number(p.idmodulo), p));
        const filas: PermisoMatrizFila[] = (modulos || []).map((m: any) => {
          const p = mapa.get(Number(m.idmodulo));
          return {
            codusuario: userId,
            idmodulo: Number(m.idmodulo),
            pantalla_nombre: m.descmodulo,
            modulo_nombre: "Legacy",
            ruta: null,
            acciones: {
              acceso: String(p?.acceso || "N").toUpperCase() === "S",
              lectura: String(p?.lectura || "N").toUpperCase() === "S",
            },
            modo: "legacy",
            legacyIdPermiso: p?.idpermiso ?? null
          };
        });
        return {
          acciones: [
            { accion_key: "acceso", descripcion: "Acceso", orden: 10 },
            { accion_key: "lectura", descripcion: "Lectura", orden: 20 },
          ],
          recursos: modulos || [],
          filas,
          modo: "legacy" as const
        };
      }

      const [{ data: acciones, error: errA }, { data: recursos, error: errR }] = await Promise.all([
        this.db
          .from("permiso_accion_catalogo")
          .select("accion_key,descripcion,orden")
          .eq("activo", true)
          .order("orden", { ascending: true }),
        this.db
          .from("permiso_recurso_catalogo")
          .select("recurso_key,modulo_key,modulo_nombre,pantalla_nombre,ruta,requiere_tenant")
          .eq("activo", true)
          .order("orden", { ascending: true }),
      ]);
      if (errA) throw errA;
      if (errR) throw errR;

      let q = this.db
        .from("usuario_permiso_accion")
        .select("id,recurso_key,accion_key,permitido,cod_empre,sucursalid,activo,vigencia_desde,vigencia_hasta")
        .eq("codusuario", userId)
        .eq("activo", true);
      q = this.aplicarFiltroScope(q, codEmpre, sucursalid);
      const { data: asignaciones, error: errU } = await q;
      if (errU) throw errU;

      const actionKeys = (acciones || []).map((a: any) => String(a.accion_key));
      const mapa = new Map<string, any>();
      (asignaciones || []).forEach((a: any) => {
        if (!mapa.has(a.recurso_key)) {
          mapa.set(a.recurso_key, {});
        }
        mapa.get(a.recurso_key)[String(a.accion_key)] = !!a.permitido;
      });

      const filas: PermisoMatrizFila[] = (recursos || []).map((r: any) => {
        const base: Record<string, boolean> = {};
        actionKeys.forEach((k: string) => base[k] = false);
        const current = mapa.get(String(r.recurso_key)) || {};
        Object.keys(current).forEach((k: string) => base[k] = !!current[k]);
        return {
          codusuario: userId,
          recurso_key: r.recurso_key,
          modulo_key: r.modulo_key,
          pantalla_nombre: r.pantalla_nombre,
          modulo_nombre: r.modulo_nombre,
          ruta: r.ruta || null,
          cod_empre: String(codEmpre || "").trim() || null,
          sucursalid: Number(sucursalid || 0) || null,
          acciones: base,
          modo: "v2",
        };
      });
      return {
        acciones: acciones || [],
        recursos: recursos || [],
        filas,
        modo: "v2" as const
      };
    })()).pipe(
      map((payload: any) => ({
        status: "success",
        code: 200,
        data: payload
      }))
    );
  }

  obtenerMatrizPermisosTipoUsuario(idtipousuario: number): Observable<any> {
    return from((async () => {
      const tipoId = Number(idtipousuario || 0);
      if (!tipoId) {
        return { acciones: [], recursos: [], filas: [], modo: "tipo" as const };
      }

      const [{ data: modulos, error: errM }, { data: detalles, error: errD }] = await Promise.all([
        this.db
          .from("modulo")
          .select("idmodulo,descmodulo")
          .order("idmodulo", { ascending: true }),
        this.db
          .from("dtipousuario")
          .select("id,idtipousuario,idmodulo,acceso,lectura")
          .eq("idtipousuario", tipoId)
          .order("idmodulo", { ascending: true }),
      ]);
      if (errM) throw errM;
      if (errD) throw errD;

      const modMap = new Map<number, any>();
      (modulos || []).forEach((m: any) => modMap.set(Number(m.idmodulo), m));

      const filas: PermisoMatrizFila[] = (detalles || [])
        .filter((d: any) => String(d?.acceso || "N").toUpperCase() === "S")
        .map((d: any) => {
          const modulo = modMap.get(Number(d.idmodulo)) || {};
          const acceso = String(d?.acceso || "N").toUpperCase() === "S";
          const lectura = String(d?.lectura || "N").toUpperCase() === "S";
          return {
            codusuario: null,
            idmodulo: Number(d.idmodulo),
            pantalla_nombre: modulo?.descmodulo || `Modulo ${d.idmodulo}`,
            modulo_nombre: modulo?.descmodulo || `Modulo ${d.idmodulo}`,
            ruta: null,
            acciones: {
              acceso,
              lectura,
              ver: acceso,
              editar: acceso && !lectura,
              eliminar: acceso && !lectura,
              guardar: acceso && !lectura,
            },
            modo: "legacy",
            legacyIdPermiso: Number(d.id || 0) || null,
          };
        });

      return {
        acciones: [
          { accion_key: "acceso", descripcion: "Acceso", orden: 10 },
          { accion_key: "lectura", descripcion: "Solo consulta", orden: 20 },
        ],
        recursos: modulos || [],
        filas,
        modo: "tipo" as const,
      };
    })()).pipe(
      map((payload: any) => ({
        status: "success",
        code: 200,
        data: payload
      }))
    );
  }

  guardarMatrizPermisosUsuario(
    codusuario: number,
    filas: PermisoMatrizFila[],
    codEmpre?: string | null,
    sucursalid?: number | null
  ): Observable<any> {
    return from((async () => {
      const userId = Number(codusuario || 0);
      if (!userId) throw new Error("Usuario inválido");

      const v2 = await this.isPermisoV2Disponible();
      if (!v2) {
        // Fallback legacy: sincroniza tabla permiso con acceso/lectura.
        const { error: delErr } = await this.db
          .from("permiso")
          .delete()
          .eq("codusuario", userId);
        if (delErr) throw delErr;

        const inserts = (filas || [])
          .filter((f: PermisoMatrizFila) => Number(f.idmodulo || 0) > 0)
          .map((f: PermisoMatrizFila) => ({
            codusuario: userId,
            idmodulo: Number(f.idmodulo),
            acceso: f?.acciones?.["acceso"] ? "S" : "N",
            lectura: f?.acciones?.["lectura"] ? "S" : "N",
          }));

        if (inserts.length) {
          const { error: insErr } = await this.db.from("permiso").insert(inserts);
          if (insErr) throw insErr;
        }
        return { saved: inserts.length, modo: "legacy" };
      }

      let deleteQuery = this.db
        .from("usuario_permiso_accion")
        .delete()
        .eq("codusuario", userId);
      deleteQuery = this.aplicarFiltroScope(deleteQuery, codEmpre, sucursalid);
      const { error: delErr } = await deleteQuery;
      if (delErr) throw delErr;

      const rowsToInsert: any[] = [];
      const emp = String(codEmpre || "").trim() || null;
      const suc = Number(sucursalid || 0) || null;
      (filas || []).forEach((f: PermisoMatrizFila) => {
        const recursoKey = String(f.recurso_key || "").trim();
        if (!recursoKey) return;
        Object.entries(f.acciones || {}).forEach(([accionKey, permitido]) => {
          if (!permitido) return;
          rowsToInsert.push({
            codusuario: userId,
            recurso_key: recursoKey,
            accion_key: accionKey,
            permitido: true,
            cod_empre: emp,
            sucursalid: suc,
            activo: true,
          });
        });
      });

      if (rowsToInsert.length) {
        const { error: insErr } = await this.db.from("usuario_permiso_accion").insert(rowsToInsert);
        if (insErr) throw insErr;
      }
      return { saved: rowsToInsert.length, modo: "v2" };
    })()).pipe(
      map((payload: any) => ({
        status: "success",
        code: 200,
        data: payload
      }))
    );
  }

  obtenerListadoPermisosCrud(): Observable<any> {
    return from((async () => {
      const v2 = await this.isPermisoV2Disponible();
      if (!v2) {
        const { data, error } = await this.db
          .from("permiso")
          .select("*")
          .order("idpermiso", { ascending: true });
        if (error) throw error;
        return { modo: "legacy", rows: (data || []).map((x: any) => this.normalizarPermiso(x)) };
      }

      const [{ data: acciones, error: errA }, { data: recursos, error: errR }, { data: asignaciones, error: errU }] = await Promise.all([
        this.db
          .from("permiso_accion_catalogo")
          .select("accion_key,descripcion,orden")
          .eq("activo", true)
          .order("orden", { ascending: true }),
        this.db
          .from("permiso_recurso_catalogo")
          .select("recurso_key,modulo_nombre,pantalla_nombre")
          .eq("activo", true),
        this.db
          .from("usuario_permiso_accion")
          .select("codusuario,recurso_key,accion_key,permitido,cod_empre,sucursalid,activo")
          .eq("activo", true)
      ]);
      if (errA) throw errA;
      if (errR) throw errR;
      if (errU) throw errU;

      const actionKeys = (acciones || []).map((a: any) => String(a.accion_key));
      const recMap = new Map<string, any>();
      (recursos || []).forEach((r: any) => recMap.set(String(r.recurso_key), r));

      const grouped = new Map<string, any>();
      (asignaciones || []).forEach((a: any) => {
        const user = Number(a.codusuario || 0);
        if (!user) return;
        const recurso = String(a.recurso_key || "").trim();
        if (!recurso) return;
        const emp = String(a.cod_empre || "").trim();
        const suc = Number(a.sucursalid || 0) || 0;
        const key = `${user}__${recurso}__${emp}__${suc}`;
        if (!grouped.has(key)) {
          const r = recMap.get(recurso) || {};
          const accionesBase: Record<string, boolean> = {};
          actionKeys.forEach((k: string) => accionesBase[k] = false);
          grouped.set(key, {
            codusuario: user,
            recurso_key: recurso,
            pantalla_nombre: r?.pantalla_nombre || recurso,
            modulo_nombre: r?.modulo_nombre || "-",
            cod_empre: emp || null,
            sucursalid: suc || null,
            acciones: accionesBase,
            modo: "v2",
          });
        }
        const row = grouped.get(key);
        row.acciones[String(a.accion_key)] = !!a.permitido;
      });

      return { modo: "v2", rows: Array.from(grouped.values()), acciones: acciones || [] };
    })()).pipe(
      map((payload: any) => ({
        status: "success",
        code: 200,
        data: payload
      }))
    );
  }

  guardarRegistroPermisoCrud(payload: any): Observable<any> {
    return from((async () => {
      const v2 = await this.isPermisoV2Disponible();
      if (!v2) {
        const normal = {
          codusuario: Number(payload?.codusuario ?? payload?.idusuario ?? 0) || null,
          idmodulo: Number(payload?.idmodulo || 0) || null,
          acceso: payload?.acciones?.acceso ? "S" : String(payload?.acceso || "N").toUpperCase(),
          lectura: payload?.acciones?.lectura ? "S" : String(payload?.lectura || "N").toUpperCase(),
        };
        if (payload?.idpermiso) {
          const { data, error } = await this.db
            .from("permiso")
            .update(normal)
            .eq("idpermiso", Number(payload.idpermiso))
            .select("*")
            .maybeSingle();
          if (error) throw error;
          return { modo: "legacy", row: data ? this.normalizarPermiso(data) : null };
        }
        const { data, error } = await this.db
          .from("permiso")
          .insert(normal)
          .select("*")
          .single();
        if (error) throw error;
        return { modo: "legacy", row: this.normalizarPermiso(data) };
      }

      const codusuario = Number(payload?.codusuario || 0) || null;
      const recursoKey = String(payload?.recurso_key || "").trim();
      if (!codusuario || !recursoKey) {
        throw new Error("Usuario y recurso son requeridos");
      }
      const codEmpre = String(payload?.cod_empre || "").trim() || null;
      const sucursalid = Number(payload?.sucursalid || 0) || null;

      let del = this.db
        .from("usuario_permiso_accion")
        .delete()
        .eq("codusuario", codusuario)
        .eq("recurso_key", recursoKey);
      del = this.aplicarFiltroScope(del, codEmpre, sucursalid);
      const { error: delErr } = await del;
      if (delErr) throw delErr;

      const acciones = payload?.acciones || {};
      const inserts: any[] = [];
      Object.entries(acciones).forEach(([accionKey, permitido]) => {
        if (!permitido) return;
        inserts.push({
          codusuario,
          recurso_key: recursoKey,
          accion_key: accionKey,
          permitido: true,
          cod_empre: codEmpre,
          sucursalid,
          activo: true,
        });
      });
      if (inserts.length) {
        const { error: insErr } = await this.db.from("usuario_permiso_accion").insert(inserts);
        if (insErr) throw insErr;
      }
      return { modo: "v2", saved: inserts.length };
    })()).pipe(
      map((out: any) => ({ status: "success", code: 200, data: out }))
    );
  }

  eliminarRegistroPermisoCrud(payload: any): Observable<any> {
    return from((async () => {
      const v2 = await this.isPermisoV2Disponible();
      if (!v2) {
        const idpermiso = Number(payload?.idpermiso || 0);
        if (!idpermiso) throw new Error("idpermiso requerido");
        const { error } = await this.db.from("permiso").delete().eq("idpermiso", idpermiso);
        if (error) throw error;
        return { modo: "legacy" };
      }

      const codusuario = Number(payload?.codusuario || 0) || null;
      const recursoKey = String(payload?.recurso_key || "").trim();
      if (!codusuario || !recursoKey) throw new Error("codusuario y recurso_key requeridos");
      const codEmpre = String(payload?.cod_empre || "").trim() || null;
      const sucursalid = Number(payload?.sucursalid || 0) || null;

      let q = this.db
        .from("usuario_permiso_accion")
        .delete()
        .eq("codusuario", codusuario)
        .eq("recurso_key", recursoKey);
      q = this.aplicarFiltroScope(q, codEmpre, sucursalid);
      const { error } = await q;
      if (error) throw error;
      return { modo: "v2" };
    })()).pipe(
      map((out: any) => ({ status: "success", code: 200, data: out }))
    );
  }
}
