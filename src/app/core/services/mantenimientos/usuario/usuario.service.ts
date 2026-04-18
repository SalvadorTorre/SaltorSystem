import { Injectable } from "@angular/core";
import { ModeloUsuario, ModeloUsuarioData } from ".";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable({
  providedIn: "root"
})
export class ServicioUsuario {
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

  private normalizarUsuario(row: any): any {
    if (!row) return row;
    return {
      ...row,
      codUsuario: row.codusuario ?? row.codUsuario ?? null,
      idUsuario: row.idusuario ?? row.idUsuario ?? "",
      claveUsuario: row.claveusuario ?? row.claveUsuario ?? "",
      nombreUsuario: row.nombreusuario ?? row.nombreUsuario ?? "",
      metaVenta: row.metaventa ?? row.metaVenta ?? 0,
      claveCorreo: row.clavecorreo ?? row.claveCorreo ?? "",
      idtipoUsuario: row.idtipousuario ?? row.idtipoUsuario ?? null,
      sucursalid: row.sucursalid ?? null,
      cod_empre: row.cod_empre ?? ""
    };
  }

  private mapearPayloadUsuario(input: any): any {
    return {
      idusuario: input?.idUsuario ?? input?.idusuario ?? null,
      claveusuario: input?.claveUsuario ?? input?.claveusuario ?? null,
      nombreusuario: input?.nombreUsuario ?? input?.nombreusuario ?? null,
      nivel: input?.nivel ?? null,
      metaventa: input?.metaVenta ?? input?.metaventa ?? 0,
      correo: input?.correo ?? null,
      clavecorreo: input?.claveCorreo ?? input?.clavecorreo ?? null,
      sucursalid: input?.sucursalid ?? input?.sucursal ?? null,
      idtipousuario: input?.idtipoUsuario ?? input?.idtipousuario ?? null,
      idpermiso: input?.idpermiso ?? null,
      cod_empre: input?.cod_empre ?? null
    };
  }

  buscarTodosUsuario(pageIndex: number, pageSize: number, codigo?: string, descripcion?: string): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;

    return from((async () => {
      let query = this.db
        .from("usuario")
        .select("*")
        .order("codusuario", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (codigo) {
        const cod = Number(codigo);
        if (!Number.isNaN(cod)) {
          query = query.eq("codusuario", cod);
        }
      }

      if (descripcion) {
        const q = `%${descripcion}%`;
        query = query.or(`idusuario.ilike.${q},nombreusuario.ilike.${q}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        data: rows.map((row: any) => this.normalizarUsuario(row))
      }))
    );
  }

  guardarUsuario(usuario: ModeloUsuarioData): Observable<any> {
    return from((async () => {
      const payload = this.mapearPayloadUsuario(usuario);
      const { data, error } = await this.db
        .from("usuario")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        message: "Usuario creado",
        data: this.normalizarUsuario(row)
      }))
    );
  }

  editarUsuario(codUsuario: number, usuario: ModeloUsuario): Observable<any> {
    return from((async () => {
      const payload = this.mapearPayloadUsuario(usuario);
      const { data, error } = await this.db
        .from("usuario")
        .update(payload)
        .eq("codusuario", codUsuario)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        message: "Usuario actualizado",
        data: row ? this.normalizarUsuario(row) : null
      }))
    );
  }

  eliminarUsuario(codUsuario: number): Observable<any> {
    return from((async () => {
      const { error } = await this.db
        .from("usuario")
        .delete()
        .eq("codusuario", codUsuario);
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({
        status: "success",
        code: 200,
        message: "Usuario eliminado"
      }))
    );
  }

  buscarUsuario(claveUsuario: number): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from("usuario")
        .select("*")
        .eq("codusuario", claveUsuario)
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: row ? this.normalizarUsuario(row) : null
      }))
    );
  }

  buscartodoUsuario(claveUsuario: number): Observable<ModeloUsuario> {
    return this.buscarUsuario(claveUsuario) as Observable<ModeloUsuario>;
  }

  buscarUsuarioPorClave(claveUsuario: string): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from("usuario")
        .select("*")
        .ilike("idusuario", claveUsuario)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: row ? this.normalizarUsuario(row) : null
      }))
    );
  }

  buscarUsuarioPorId(idUsuario: string): Observable<any> {
    return this.buscarUsuarioPorClave(idUsuario).pipe(
      map((res: any) => {
        const row = res?.data;
        return {
          ...res,
          data: row ? [row] : []
        };
      })
    );
  }
}
