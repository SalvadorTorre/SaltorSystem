/// <reference lib="deno.ns" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "Content-Disposition",
};
type Filters = { fecha?: string; fechaDesde?: string; fechaHasta?: string; tipoComprobante?: string | number; estadoDgii?: string; empresa?: string; sucursal?: string | number; numeroFactura?: string; encf?: string };
const txt = (v: unknown) => String(v ?? "").trim();
const num = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;
const responseJson = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } });
const validDate = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(txt(v));

function datesFor(f: Filters): string[] {
  if (validDate(f.fecha)) return [txt(f.fecha)];
  if (!validDate(f.fechaDesde) || !validDate(f.fechaHasta)) throw new Error("Debes indicar un rango de fechas valido.");
  const from = new Date(`${f.fechaDesde}T00:00:00Z`);
  const cursor = new Date(`${f.fechaHasta}T00:00:00Z`);
  if (from > cursor) throw new Error("La fecha inicial no puede ser mayor que la final.");
  const dates: string[] = [];
  while (cursor >= from) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (dates.length > 366) throw new Error("El rango maximo es de 366 dias.");
  }
  return dates;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return responseJson(405, { message: "Metodo no permitido." });
  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const schema = Deno.env.get("SUPABASE_DB_SCHEMA") || "myappdb";
    const authorization = req.headers.get("Authorization") || "";
    if (!url || !anonKey || !serviceKey || !authorization.startsWith("Bearer ")) return responseJson(401, { message: "Sesion no valida." });

    const auth = createClient(url, anonKey, { auth: { persistSession: false }, global: { headers: { Authorization: authorization } } });
    const { data: authData, error: authError } = await auth.auth.getUser();
    if (authError || !authData.user) return responseJson(401, { message: "Sesion vencida o no valida." });

    const admin = createClient(url, serviceKey, { auth: { persistSession: false }, db: { schema } });
    const email = txt(authData.user.email).toLowerCase();
    const { data: users, error: userError } = await admin.from("usuario")
      .select("codusuario,idtipousuario,cod_empre,sucursalid,correo,auth_user_id")
      .or(`auth_user_id.eq.${authData.user.id},correo.ilike.${email}`).limit(2);
    if (userError) throw userError;
    const user = (users || []).find((u: any) => txt(u.auth_user_id) === authData.user!.id) || users?.[0];
    if (!user) return responseJson(403, { message: "Usuario no vinculado al sistema." });

    const permissionFilters = (query: any) => query.eq("recurso_key", "contabilidad.reporte_607").eq("accion_key", "exportar").eq("activo", true).eq("permitido", true).limit(1);
    const userPermission = await permissionFilters(admin.from("usuario_permiso_accion").select("permitido").eq("codusuario", user.codusuario));
    if (userPermission.error) throw userPermission.error;
    const typePermission = await permissionFilters(admin.from("tipousuario_permiso_accion").select("permitido").eq("idtipousuario", user.idtipousuario));
    if (typePermission.error) throw typePermission.error;
    const privileged = [1, 2, 9].includes(Number(user.idtipousuario));
    if (!privileged && !userPermission.data?.length && !typePermission.data?.length) return responseJson(403, { message: "No tienes permiso para exportar el Reporte 607." });

    const filters = await req.json().catch(() => ({})) as Filters;
    const dates = datesFor(filters);
    const root = Number(user.idtipousuario) === 1;
    const company = root && txt(filters.empresa) ? txt(filters.empresa) : txt(user.cod_empre);
    const requestedBranch = Number(filters.sucursal);
    let branch: number | null = requestedBranch > 0 ? requestedBranch : null;
    if (!company) return responseJson(422, { message: "No se pudo determinar la empresa." });
    if (branch) {
      const branchCheck = await admin.from("sucursales")
        .select("cod_sucursal,cod_empre")
        .eq("cod_sucursal", branch)
        .eq("cod_empre", company)
        .maybeSingle();
      if (branchCheck.error) throw branchCheck.error;
      if (!branchCheck.data) return responseJson(403, { message: "La sucursal seleccionada no pertenece a la empresa del usuario." });
    }

    const columns = "fa_codfact,fa_ncffact,fa_rncfact,fa_fecncf,fa_valfact,fa_itbifact,fa_subfact,fa_codfpago,estado_dgii,estado_envio_dgii,fec_firma";
    const rows: any[] = [];
    for (const date of dates) {
      for (let offset = 0; ; offset += 500) {
        let query = admin.from("factura").select(columns).eq("fa_codempr", company).eq("fa_fecncf", date)
          .not("estado_envio_dgii", "is", null).neq("estado_envio_dgii", "PENDIENTE")
          .order("fa_fecncf", { ascending: false }).order("fa_ncffact", { ascending: false }).range(offset, offset + 499);
        if (branch) query = query.eq("fa_codsucu", branch);
        if (txt(filters.tipoComprobante)) query = query.eq("fa_tiponcf", Number(filters.tipoComprobante));
        if (txt(filters.estadoDgii)) query = query.ilike("estado_dgii", txt(filters.estadoDgii));
        if (txt(filters.numeroFactura)) query = query.eq("fa_codfact", txt(filters.numeroFactura));
        if (txt(filters.encf)) query = query.eq("fa_ncffact", txt(filters.encf).toUpperCase());
        const result = await query;
        if (result.error) throw result.error;
        rows.push(...(result.data || []));
        if ((result.data || []).length < 500) break;
      }
    }

    const payments = await admin.from("fpago").select("fp_codfpago,fp_descfpago").order("fp_codfpago");
    if (payments.error) throw payments.error;
    const paymentTypes = payments.data || [];
    const descriptions = new Map(paymentTypes.map((p: any) => [txt(p.fp_codfpago), txt(p.fp_descfpago)]));
    const excelRows = rows.map((row) => {
      const status = txt(row.estado_dgii || row.estado_envio_dgii);
      const rejected = /rechaz|error/i.test(status);
      const total = num(row.fa_valfact), itbis = num(row.fa_itbifact), code = txt(row.fa_codfpago);
      const out: Record<string, string | number> = {
        "RNC Receptor": txt(row.fa_rncfact), ENCF: txt(row.fa_ncffact), "Fecha Comprobante": txt(row.fa_fecncf),
        "Fecha Recepcion": txt(row.fec_firma), Estado: status,
        "Forma de Pago": code && descriptions.get(code) ? `${code} - ${descriptions.get(code)}` : code,
        "ITBIS Facturado": rejected ? "" : itbis, "Monto Total": rejected ? "" : total,
      };
      for (const p of paymentTypes) out[txt(p.fp_descfpago) || `Forma ${txt(p.fp_codfpago)}`] = !rejected && code === txt(p.fp_codfpago) ? total : "";
      out["Subtotal"] = rejected ? "" : num(row.fa_subfact || total - itbis);
      return out;
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    worksheet["!autofilter"] = { ref: worksheet["!ref"] || "A1:A1" };
    worksheet["!cols"] = Object.keys(excelRows[0] || { "Reporte 607": "" }).map((h) => ({ wch: Math.min(35, Math.max(12, h.length + 2)) }));
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte 607");
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx", compression: true });
    const period = dates.length === 1 ? dates[0] : `${dates.at(-1)}-${dates[0]}`;
    return new Response(bytes, { headers: { ...corsHeaders,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-607-${period}.xlsx"`, "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[exportar-reporte-607-xlsx]", error);
    return responseJson(500, { message: txt((error as any)?.message) || "No se pudo generar el XLSX." });
  }
});
