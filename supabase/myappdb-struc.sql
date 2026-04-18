/*
 Navicat Premium Dump SQL

 Source Server         : supabase-new
 Source Server Type    : PostgreSQL
 Source Server Version : 170006 (170006)
 Source Host           : aws-1-us-east-1.pooler.supabase.com:5432
 Source Catalog        : postgres
 Source Schema         : myappdb

 Target Server Type    : PostgreSQL
 Target Server Version : 170006 (170006)
 File Encoding         : 65001

 Date: 17/04/2026 12:11:36
*/


-- ----------------------------
-- Sequence structure for choferes_codchofer_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."choferes_codchofer_seq";
CREATE SEQUENCE "myappdb"."choferes_codchofer_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."choferes_codchofer_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for cierrecaja_idcierre_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."cierrecaja_idcierre_seq";
CREATE SEQUENCE "myappdb"."cierrecaja_idcierre_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."cierrecaja_idcierre_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for clientes_cl_codclie_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."clientes_cl_codclie_seq";
CREATE SEQUENCE "myappdb"."clientes_cl_codclie_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."clientes_cl_codclie_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for contfactura_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."contfactura_id_seq";
CREATE SEQUENCE "myappdb"."contfactura_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."contfactura_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for despachadores_coddesp_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."despachadores_coddesp_seq";
CREATE SEQUENCE "myappdb"."despachadores_coddesp_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."despachadores_coddesp_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for detcotizacion_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."detcotizacion_id_seq";
CREATE SEQUENCE "myappdb"."detcotizacion_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."detcotizacion_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for detfactura_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."detfactura_id_seq";
CREATE SEQUENCE "myappdb"."detfactura_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."detfactura_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for detventainterna_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."detventainterna_id_seq";
CREATE SEQUENCE "myappdb"."detventainterna_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."detventainterna_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for devolucion_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."devolucion_id_seq";
CREATE SEQUENCE "myappdb"."devolucion_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."devolucion_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for dtipousuario_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."dtipousuario_id_seq";
CREATE SEQUENCE "myappdb"."dtipousuario_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."dtipousuario_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for encf_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."encf_id_seq";
CREATE SEQUENCE "myappdb"."encf_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."encf_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for fentrega_idfentrega_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."fentrega_idfentrega_seq";
CREATE SEQUENCE "myappdb"."fentrega_idfentrega_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."fentrega_idfentrega_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for fpago_fp_codfpago_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."fpago_fp_codfpago_seq";
CREATE SEQUENCE "myappdb"."fpago_fp_codfpago_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."fpago_fp_codfpago_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for inventario_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."inventario_id_seq";
CREATE SEQUENCE "myappdb"."inventario_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."inventario_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for modulo_idmodulo_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."modulo_idmodulo_seq";
CREATE SEQUENCE "myappdb"."modulo_idmodulo_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."modulo_idmodulo_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for permiso_idpermiso_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."permiso_idpermiso_seq";
CREATE SEQUENCE "myappdb"."permiso_idpermiso_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."permiso_idpermiso_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for productos2_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."productos2_id_seq";
CREATE SEQUENCE "myappdb"."productos2_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."productos2_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for recibo_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."recibo_id_seq";
CREATE SEQUENCE "myappdb"."recibo_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."recibo_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for rnc_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."rnc_id_seq";
CREATE SEQUENCE "myappdb"."rnc_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."rnc_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for salida_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."salida_id_seq";
CREATE SEQUENCE "myappdb"."salida_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."salida_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sector_se_codsect_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."sector_se_codsect_seq";
CREATE SEQUENCE "myappdb"."sector_se_codsect_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."sector_se_codsect_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sucursales_cod_sucursal_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."sucursales_cod_sucursal_seq";
CREATE SEQUENCE "myappdb"."sucursales_cod_sucursal_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."sucursales_cod_sucursal_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for suplidor_su_codsupl_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."suplidor_su_codsupl_seq";
CREATE SEQUENCE "myappdb"."suplidor_su_codsupl_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."suplidor_su_codsupl_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for tiponcf_idncf_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."tiponcf_idncf_seq";
CREATE SEQUENCE "myappdb"."tiponcf_idncf_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."tiponcf_idncf_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for tipousuario_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."tipousuario_id_seq";
CREATE SEQUENCE "myappdb"."tipousuario_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."tipousuario_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for usuario_codusuario_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."usuario_codusuario_seq";
CREATE SEQUENCE "myappdb"."usuario_codusuario_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."usuario_codusuario_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for zona_zo_codzona_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "myappdb"."zona_zo_codzona_seq";
CREATE SEQUENCE "myappdb"."zona_zo_codzona_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "myappdb"."zona_zo_codzona_seq" OWNER TO "postgres";

-- ----------------------------
-- Table structure for choferes
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."choferes";
CREATE TABLE "myappdb"."choferes" (
  "id" int4 NOT NULL,
  "codchofer" int4 NOT NULL DEFAULT nextval('"myappdb".choferes_codchofer_seq'::regclass),
  "nomchofer" varchar(30) COLLATE "pg_catalog"."default",
  "cedchofer" char(11) COLLATE "pg_catalog"."default",
  "statuschofer" bool
)
;
ALTER TABLE "myappdb"."choferes" OWNER TO "postgres";

-- ----------------------------
-- Table structure for cierrecaja
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."cierrecaja";
CREATE TABLE "myappdb"."cierrecaja" (
  "idcierre" int4 NOT NULL DEFAULT nextval('"myappdb".cierrecaja_idcierre_seq'::regclass),
  "feccierre" date,
  "tefectivo" numeric(12,2),
  "ttarjeta" numeric(12,2),
  "tdeposito" numeric(12,2),
  "totalcierre" numeric(12,2),
  "tcheque" numeric(12,2),
  "factini" varchar(255) COLLATE "pg_catalog"."default",
  "factfin" varchar(255) COLLATE "pg_catalog"."default",
  "cajera" varchar(255) COLLATE "pg_catalog"."default",
  "nota" varchar(255) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."cierrecaja" OWNER TO "postgres";

-- ----------------------------
-- Table structure for clientes
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."clientes";
CREATE TABLE "myappdb"."clientes" (
  "cl_codclie" int4 NOT NULL DEFAULT nextval('"myappdb".clientes_cl_codclie_seq'::regclass),
  "cl_nomclie" varchar(35) COLLATE "pg_catalog"."default" NOT NULL,
  "cl_dirclie" varchar(40) COLLATE "pg_catalog"."default" NOT NULL,
  "cl_codsect" int4,
  "cl_codzona" int4,
  "cl_telclie" varchar(20) COLLATE "pg_catalog"."default",
  "cl_tipo" varchar(50) COLLATE "pg_catalog"."default",
  "cl_status" bool,
  "cl_rnc" int4,
  "cl_codsucursal" varchar(10) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."clientes" OWNER TO "postgres";

-- ----------------------------
-- Table structure for contfactura
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."contfactura";
CREATE TABLE "myappdb"."contfactura" (
  "id" int4 NOT NULL DEFAULT nextval('"myappdb".contfactura_id_seq'::regclass),
  "idsucursal" int4,
  "ano" int4,
  "contador" int4,
  "contsalida" int4,
  "contentrada" int4,
  "contvinterna" int4
)
;
ALTER TABLE "myappdb"."contfactura" OWNER TO "postgres";

-- ----------------------------
-- Table structure for cotizacion
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."cotizacion";
CREATE TABLE "myappdb"."cotizacion" (
  "ct_codcoti" char(10) COLLATE "pg_catalog"."default" NOT NULL,
  "ct_feccoti" date,
  "ct_valcoti" numeric(9,2),
  "ct_itbis" numeric(9,2),
  "ct_codclie" int4,
  "ct_nomclie" varchar(50) COLLATE "pg_catalog"."default",
  "ct_rnc" char(11) COLLATE "pg_catalog"."default",
  "ct_telclie" char(17) COLLATE "pg_catalog"."default",
  "ct_dirclie" char(50) COLLATE "pg_catalog"."default",
  "ct_correo" char(50) COLLATE "pg_catalog"."default",
  "ct_codvend" char(5) COLLATE "pg_catalog"."default",
  "ct_nomvend" char(15) COLLATE "pg_catalog"."default",
  "ct_nota" text COLLATE "pg_catalog"."default",
  "ct_status" char(4) COLLATE "pg_catalog"."default",
  "ct_codempr" varchar(6) COLLATE "pg_catalog"."default",
  "ct_cod_sucu" int4
)
;
ALTER TABLE "myappdb"."cotizacion" OWNER TO "postgres";

-- ----------------------------
-- Table structure for cotizacioncounter
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."cotizacioncounter";
CREATE TABLE "myappdb"."cotizacioncounter" (
  "year" int4 NOT NULL,
  "last_number" int4 NOT NULL
)
;
ALTER TABLE "myappdb"."cotizacioncounter" OWNER TO "postgres";

-- ----------------------------
-- Table structure for ctr_factura
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."ctr_factura";
CREATE TABLE "myappdb"."ctr_factura" (
  "year" numeric(10,0) NOT NULL,
  "last_number" numeric(10,0),
  "control" numeric(10,0),
  "ncfvalorf" varchar(255) COLLATE "pg_catalog"."default",
  "fecvalorf" date,
  "cantncfvalorf" numeric(10,0),
  "ctrvalorf" numeric(10,0),
  "ncfconsumo" varchar(255) COLLATE "pg_catalog"."default",
  "cantconsumo" numeric(10,0),
  "ctrconsumo" numeric(10,0),
  "ncfespecial" varchar(255) COLLATE "pg_catalog"."default",
  "fecespecial" date,
  "cantespecial" numeric(10,0),
  "ctrespecial" numeric(10,0),
  "ncfguberna" varchar(255) COLLATE "pg_catalog"."default",
  "fecguberna" date,
  "cantguberna" numeric(10,0),
  "ctrguberna" numeric(10,0),
  "ctr_ini" numeric(10,0),
  "ctr_fin" numeric(10,0),
  "ctr_f" numeric(10,0),
  "ctr_t" numeric(10,0)
)
;
ALTER TABLE "myappdb"."ctr_factura" OWNER TO "postgres";
COMMENT ON COLUMN "myappdb"."ctr_factura"."year" IS 'Año de Facturacion';
COMMENT ON COLUMN "myappdb"."ctr_factura"."last_number" IS 'No. de Factura';
COMMENT ON COLUMN "myappdb"."ctr_factura"."control" IS 'Control para el manejos de general numero de factura';
COMMENT ON COLUMN "myappdb"."ctr_factura"."ncfvalorf" IS 'No. de comprovante con valor fiscal';
COMMENT ON COLUMN "myappdb"."ctr_factura"."fecvalorf" IS 'Fecha Valida de los comprovante de valor Fiscal';
COMMENT ON COLUMN "myappdb"."ctr_factura"."cantncfvalorf" IS 'Cantidad de comprovante o el ultimo comprovante asignado con valor fiscal';
COMMENT ON COLUMN "myappdb"."ctr_factura"."ctrvalorf" IS 'Seccuencia o control de los comprovante de valor fiscal';
COMMENT ON COLUMN "myappdb"."ctr_factura"."ncfconsumo" IS 'No. de comprovante de consumo';
COMMENT ON COLUMN "myappdb"."ctr_factura"."cantconsumo" IS 'Cantidad de comprovante o el ultimo comprovante asignado de consumo';
COMMENT ON COLUMN "myappdb"."ctr_factura"."ctrconsumo" IS 'Seccuencia o control de los comprovante de consumidor final';
COMMENT ON COLUMN "myappdb"."ctr_factura"."ncfespecial" IS 'No. de comprovante de regimen especial';
COMMENT ON COLUMN "myappdb"."ctr_factura"."fecespecial" IS 'Fecha Valida de los comprovante de regimen especial';
COMMENT ON COLUMN "myappdb"."ctr_factura"."cantespecial" IS 'Cantidad de comprovante o el ultimo comprovante asignado de regimen especial';
COMMENT ON COLUMN "myappdb"."ctr_factura"."ctrespecial" IS 'Seccuencia o control de los comprovante de regimen especial';
COMMENT ON COLUMN "myappdb"."ctr_factura"."ncfguberna" IS 'gubernamentales';
COMMENT ON COLUMN "myappdb"."ctr_factura"."fecguberna" IS 'Fecha Valida de los comprovante de gubernamentales';
COMMENT ON COLUMN "myappdb"."ctr_factura"."cantguberna" IS 'Cantidad de comprovante o el ultimo comprovante asignado gubernamelates';
COMMENT ON COLUMN "myappdb"."ctr_factura"."ctrguberna" IS 'Seccuencia o control de los comprovante gubernamentales';

-- ----------------------------
-- Table structure for despachadores
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."despachadores";
CREATE TABLE "myappdb"."despachadores" (
  "coddesp" int4 NOT NULL DEFAULT nextval('"myappdb".despachadores_coddesp_seq'::regclass),
  "nomdesp" varchar(30) COLLATE "pg_catalog"."default" NOT NULL,
  "tipodesp" char(2) COLLATE "pg_catalog"."default" NOT NULL,
  "statusdespachadores" bool,
  "ceddesp" varchar(11) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "myappdb"."despachadores" OWNER TO "postgres";

-- ----------------------------
-- Table structure for detcotizacion
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."detcotizacion";
CREATE TABLE "myappdb"."detcotizacion" (
  "id" int4 NOT NULL DEFAULT nextval('"myappdb".detcotizacion_id_seq'::regclass),
  "dc_codcoti" varchar(10) COLLATE "pg_catalog"."default" NOT NULL,
  "dc_codmerc" varchar(15) COLLATE "pg_catalog"."default" NOT NULL,
  "dc_descrip" varchar(40) COLLATE "pg_catalog"."default",
  "dc_canmerc" numeric(10,2),
  "dc_premerc" numeric(9,2),
  "dc_valmerc" numeric(10,2),
  "dc_unidad" varchar(10) COLLATE "pg_catalog"."default",
  "dc_costmer" numeric(10,2),
  "dc_codclie" int4,
  "dc_item" int4,
  "dc_status" varchar(4) COLLATE "pg_catalog"."default",
  "dc_codempr" varchar(6) COLLATE "pg_catalog"."default",
  "dc_codsucu" int4
)
;
ALTER TABLE "myappdb"."detcotizacion" OWNER TO "postgres";

-- ----------------------------
-- Table structure for detentradamerc
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."detentradamerc";
CREATE TABLE "myappdb"."detentradamerc" (
  "de_codentr" varchar(12) COLLATE "pg_catalog"."default" NOT NULL,
  "de_codmerc" varchar(15) COLLATE "pg_catalog"."default" NOT NULL,
  "de_desmerc" varchar(30) COLLATE "pg_catalog"."default",
  "de_canentr" numeric(8,2),
  "de_premerc" numeric(9,2),
  "de_valentr" numeric(10,2),
  "de_unidad" varchar(10) COLLATE "pg_catalog"."default",
  "de_cosmerc" numeric(10,2),
  "de_codsupl" numeric(7,0),
  "de_fecentr" date,
  "de_codempr" varchar(6) COLLATE "pg_catalog"."default",
  "de_codsucu" int4,
  "de_tipo" varchar(10) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."detentradamerc" OWNER TO "postgres";

-- ----------------------------
-- Table structure for detfactura
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."detfactura";
CREATE TABLE "myappdb"."detfactura" (
  "id" int4 NOT NULL DEFAULT nextval('"myappdb".detfactura_id_seq'::regclass),
  "df_codfact" varchar(12) COLLATE "pg_catalog"."default" NOT NULL,
  "df_fecfact" date,
  "df_codmerc" varchar(15) COLLATE "pg_catalog"."default" NOT NULL,
  "df_tipomerc" varchar(1) COLLATE "pg_catalog"."default",
  "df_codgrupo" varchar(10) COLLATE "pg_catalog"."default",
  "df_desmerc" varchar(30) COLLATE "pg_catalog"."default",
  "df_canmerc" numeric(10,2),
  "df_premerc" numeric(10,2),
  "df_valmerc" numeric(12,2),
  "df_unidad" varchar(8) COLLATE "pg_catalog"."default",
  "df_cosmerc" numeric(10,2),
  "df_codclie" numeric(5,0),
  "df_imp" varchar(1) COLLATE "pg_catalog"."default",
  "df_status" varchar(3) COLLATE "pg_catalog"."default",
  "enviado" numeric(1,0),
  "reimpresa" numeric(1,0),
  "df_nomclie" varchar(10) COLLATE "pg_catalog"."default",
  "df_codepr" varchar(6) COLLATE "pg_catalog"."default",
  "df_codsucu" varchar(10) COLLATE "pg_catalog"."default",
  "df_pendiente" char(1) COLLATE "pg_catalog"."default",
  "df_canpend" numeric(10,2)
)
;
ALTER TABLE "myappdb"."detfactura" OWNER TO "postgres";

-- ----------------------------
-- Table structure for detsalida
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."detsalida";
CREATE TABLE "myappdb"."detsalida" (
  "idsalida" int4 NOT NULL,
  "idsucursal" int4,
  "codsalida" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "codfact" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "fecfact" date,
  "nomclie" varchar(255) COLLATE "pg_catalog"."default",
  "valfact" numeric(10,2),
  "codchofer" numeric(10,0),
  "nomchofer" varchar(255) COLLATE "pg_catalog"."default",
  "valabono" numeric(10,2),
  "devolucion" char(1) COLLATE "pg_catalog"."default",
  "valdevolucion" numeric(10,2),
  "entregada" char(1) COLLATE "pg_catalog"."default",
  "pagado" char(1) COLLATE "pg_catalog"."default",
  "status" char(1) COLLATE "pg_catalog"."default",
  "imp" char(1) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."detsalida" OWNER TO "postgres";

-- ----------------------------
-- Table structure for detventainterna
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."detventainterna";
CREATE TABLE "myappdb"."detventainterna" (
  "id" int4 NOT NULL DEFAULT nextval('"myappdb".detventainterna_id_seq'::regclass),
  "df_codfact" varchar(12) COLLATE "pg_catalog"."default" NOT NULL,
  "df_fecfact" date,
  "df_codmerc" varchar(15) COLLATE "pg_catalog"."default" NOT NULL,
  "df_tipomerc" varchar(1) COLLATE "pg_catalog"."default",
  "df_codgrupo" varchar(10) COLLATE "pg_catalog"."default",
  "df_desmerc" varchar(30) COLLATE "pg_catalog"."default",
  "df_canmerc" numeric(10,2) NOT NULL,
  "df_premerc" numeric(10,2) NOT NULL,
  "df_valmerc" numeric(12,2),
  "df_unidad" varchar(8) COLLATE "pg_catalog"."default",
  "df_cosmerc" numeric(10,2),
  "df_codclie" numeric(5,0),
  "df_status" varchar(3) COLLATE "pg_catalog"."default",
  "df_nomclie" varchar(10) COLLATE "pg_catalog"."default",
  "df_codempr" varchar(6) COLLATE "pg_catalog"."default",
  "df_codsucu" int4,
  "df_tipo" varchar(10) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."detventainterna" OWNER TO "postgres";

-- ----------------------------
-- Table structure for devolucion
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."devolucion";
CREATE TABLE "myappdb"."devolucion" (
  "id" int4 NOT NULL DEFAULT nextval('"myappdb".devolucion_id_seq'::regclass),
  "fecha" timestamptz(6),
  "codentrada" varchar(255) COLLATE "pg_catalog"."default",
  "codsalida" varchar(255) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."devolucion" OWNER TO "postgres";

-- ----------------------------
-- Table structure for dtipousuario
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."dtipousuario";
CREATE TABLE "myappdb"."dtipousuario" (
  "id" int4 NOT NULL DEFAULT nextval('"myappdb".dtipousuario_id_seq'::regclass),
  "idtipousuario" int4,
  "idmodulo" int4,
  "lectura" varchar(1) COLLATE "pg_catalog"."default",
  "acceso" varchar(1) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."dtipousuario" OWNER TO "postgres";

-- ----------------------------
-- Table structure for empresas
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."empresas";
CREATE TABLE "myappdb"."empresas" (
  "cod_empre" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "nom_empre" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "dir_empre" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "tel_empre" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "rnc_empre" varchar(13) COLLATE "pg_catalog"."default" NOT NULL,
  "letra_empre" varchar(3) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."empresas" OWNER TO "postgres";

-- ----------------------------
-- Table structure for encf
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."encf";
CREATE TABLE "myappdb"."encf" (
  "id" int4 NOT NULL DEFAULT nextval('"myappdb".encf_id_seq'::regclass),
  "cantencf" numeric(10,0),
  "countencf" numeric(10,0),
  "alertaencf" numeric(10,0),
  "codempr" varchar(6) COLLATE "pg_catalog"."default",
  "desdeencf" numeric(10,0),
  "fechaencf" date,
  "hastaencf" numeric(10,0),
  "tipoencf" varchar(4) COLLATE "pg_catalog"."default",
  "tipo" int4
)
;
ALTER TABLE "myappdb"."encf" OWNER TO "postgres";

-- ----------------------------
-- Table structure for entradamerc
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."entradamerc";
CREATE TABLE "myappdb"."entradamerc" (
  "me_codentr" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "me_fecentr" date,
  "me_valentr" numeric(10,2),
  "me_codsupl" varchar(6) COLLATE "pg_catalog"."default",
  "me_nomsupl" varchar(255) COLLATE "pg_catalog"."default",
  "me_facsupl" varchar(30) COLLATE "pg_catalog"."default",
  "me_fecsupl" date,
  "me_status" varchar(4) COLLATE "pg_catalog"."default",
  "me_codvend" varchar(5) COLLATE "pg_catalog"."default",
  "me_nomvend" varchar(15) COLLATE "pg_catalog"."default",
  "imgfactura" text COLLATE "pg_catalog"."default",
  "nota" text COLLATE "pg_catalog"."default",
  "vendedor" varchar(25) COLLATE "pg_catalog"."default",
  "despachado" varchar(25) COLLATE "pg_catalog"."default",
  "chofer" varchar(25) COLLATE "pg_catalog"."default",
  "me_rncsupl" int4,
  "me_codempr" varchar(6) COLLATE "pg_catalog"."default",
  "me_codsucu" int4,
  "me_tipo" varchar(10) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."entradamerc" OWNER TO "postgres";

-- ----------------------------
-- Table structure for entradamerccounter
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."entradamerccounter";
CREATE TABLE "myappdb"."entradamerccounter" (
  "year" int4 NOT NULL,
  "last_number" int4 NOT NULL
)
;
ALTER TABLE "myappdb"."entradamerccounter" OWNER TO "postgres";

-- ----------------------------
-- Table structure for factura
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."factura";
CREATE TABLE "myappdb"."factura" (
  "fa_codfact" varchar(12) COLLATE "pg_catalog"."default" NOT NULL,
  "fa_ncffact" varchar(19) COLLATE "pg_catalog"."default",
  "fa_rncfact" varchar(13) COLLATE "pg_catalog"."default",
  "fa_fecncf" date,
  "fa_tiponcf" int4,
  "fa_fecfact" date,
  "fa_fechora" timestamptz(6),
  "fa_valfact" numeric(12,2),
  "fa_itbifact" numeric(12,2),
  "fa_subfact" numeric(12,2),
  "fa_desfact" numeric(10,2),
  "fa_cosfact" numeric(12,2),
  "fa_abofact" numeric(12,2),
  "fa_expfact" date,
  "fa_codclie" int4,
  "fa_nomclie" varchar(39) COLLATE "pg_catalog"."default",
  "fa_telclie" varchar(26) COLLATE "pg_catalog"."default",
  "fa_dirclie" varchar(40) COLLATE "pg_catalog"."default",
  "fa_contacto" varchar(30) COLLATE "pg_catalog"."default",
  "fa_codzona" int4,
  "fa_deszona" varchar(25) COLLATE "pg_catalog"."default",
  "fa_codsect" int4,
  "fa_sector" varchar(35) COLLATE "pg_catalog"."default",
  "fa_codvend" varchar(10) COLLATE "pg_catalog"."default",
  "fa_nomvend" varchar(15) COLLATE "pg_catalog"."default",
  "fa_notafact" text COLLATE "pg_catalog"."default",
  "fa_usuario" varchar(30) COLLATE "pg_catalog"."default",
  "fa_envio" int4,
  "fa_fpago" varchar(20) COLLATE "pg_catalog"."default",
  "fa_codfpago" int4,
  "fa_status" varchar(3) COLLATE "pg_catalog"."default",
  "fa_tipofact" int4,
  "fa_imp" varchar(1) COLLATE "pg_catalog"."default",
  "fa_tipornc" int4,
  "fa_fecha" varchar(8) COLLATE "pg_catalog"."default",
  "fa_codsucu" int4,
  "fa_fehora" timestamptz(6),
  "fa_correo" varchar(30) COLLATE "pg_catalog"."default",
  "fa_codempr" varchar(6) COLLATE "pg_catalog"."default",
  "fa_impresa" char(1) COLLATE "pg_catalog"."default",
  "fa_reimpresa" char(1) COLLATE "pg_catalog"."default",
  "fa_entrega" char(1) COLLATE "pg_catalog"."default",
  "fa_impalmaf" char(1) COLLATE "pg_catalog"."default",
  "fa_impalmap" char(1) COLLATE "pg_catalog"."default",
  "fa_facturada" char(1) COLLATE "pg_catalog"."default",
  "fa_pendiente" char(1) COLLATE "pg_catalog"."default",
  "fa_despacho" char(1) COLLATE "pg_catalog"."default",
  "estado_dgii" varchar(255) COLLATE "pg_catalog"."default",
  "codseguridad" varchar(255) COLLATE "pg_catalog"."default",
  "qr_link" varchar(255) COLLATE "pg_catalog"."default",
  "fec_firma" varchar(255) COLLATE "pg_catalog"."default",
  "ecf" text COLLATE "pg_catalog"."default",
  "rfce" text COLLATE "pg_catalog"."default",
  "estado_envio_dgii" varchar(50) COLLATE "pg_catalog"."default",
  "fa_cierre" char(1) COLLATE "pg_catalog"."default",
  "fa_salida" char(1) COLLATE "pg_catalog"."default",
  "idsalida" varchar(255) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."factura" OWNER TO "postgres";

-- ----------------------------
-- Table structure for fentrega
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."fentrega";
CREATE TABLE "myappdb"."fentrega" (
  "idfentrega" int4 NOT NULL DEFAULT nextval('"myappdb".fentrega_idfentrega_seq'::regclass),
  "desentrega" varchar(20) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "myappdb"."fentrega" OWNER TO "postgres";

-- ----------------------------
-- Table structure for fpago
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."fpago";
CREATE TABLE "myappdb"."fpago" (
  "fp_codfpago" int4 NOT NULL DEFAULT nextval('"myappdb".fpago_fp_codfpago_seq'::regclass),
  "fp_descfpago" varchar(30) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "myappdb"."fpago" OWNER TO "postgres";

-- ----------------------------
-- Table structure for grupomerc
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."grupomerc";
CREATE TABLE "myappdb"."grupomerc" (
  "codgrupo" varchar(3) COLLATE "pg_catalog"."default" NOT NULL,
  "descgrupo" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "tipomerc" char(1) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "myappdb"."grupomerc" OWNER TO "postgres";

-- ----------------------------
-- Table structure for inventario
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."inventario";
CREATE TABLE "myappdb"."inventario" (
  "id" int4 NOT NULL DEFAULT nextval('"myappdb".inventario_id_seq'::regclass),
  "inv_codsucu" int4 NOT NULL,
  "inv_codprod" varchar(20) COLLATE "pg_catalog"."default" NOT NULL,
  "inv_desprod" varchar(40) COLLATE "pg_catalog"."default",
  "inv_cosprod" numeric(12,2),
  "inv_preprod" numeric(12,2),
  "inv_existencia" numeric(10,2),
  "inv_fechamov" timestamptz(6)
)
;
ALTER TABLE "myappdb"."inventario" OWNER TO "postgres";

-- ----------------------------
-- Table structure for modulo
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."modulo";
CREATE TABLE "myappdb"."modulo" (
  "idmodulo" int4 NOT NULL DEFAULT nextval('"myappdb".modulo_idmodulo_seq'::regclass),
  "descmodulo" varchar(30) COLLATE "pg_catalog"."default",
  "scceso" varchar(1) COLLATE "pg_catalog"."default",
  "lectura" varchar(1) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."modulo" OWNER TO "postgres";

-- ----------------------------
-- Table structure for permiso
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."permiso";
CREATE TABLE "myappdb"."permiso" (
  "idpermiso" int4 NOT NULL DEFAULT nextval('"myappdb".permiso_idpermiso_seq'::regclass),
  "codusuario" int4,
  "idmodulo" int4,
  "acceso" varchar(1) COLLATE "pg_catalog"."default",
  "lectura" varchar(1) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."permiso" OWNER TO "postgres";

-- ----------------------------
-- Table structure for productos2
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."productos2";
CREATE TABLE "myappdb"."productos2" (
  "id" int4 NOT NULL DEFAULT nextval('"myappdb".productos2_id_seq'::regclass),
  "in_codmerc" varchar(15) COLLATE "pg_catalog"."default",
  "in_categor" varchar(4) COLLATE "pg_catalog"."default",
  "in_tramo" varchar(8) COLLATE "pg_catalog"."default",
  "in_desmerc" varchar(30) COLLATE "pg_catalog"."default",
  "in_canmerc" float8,
  "in_caninve" float8,
  "in_fecinve" date,
  "in_eximini" float8,
  "in_minvent" float8,
  "in_costmer" float8,
  "in_precmin" float8,
  "in_premerc" float8,
  "in_costpro" float8,
  "in_ucosto" float8,
  "in_porgana" float8,
  "in_peso" float8,
  "media" varchar(1) COLLATE "pg_catalog"."default",
  "in_longitu" float8,
  "in_unidad" varchar(8) COLLATE "pg_catalog"."default",
  "in_fecmodi" date,
  "in_almacen" varchar(10) COLLATE "pg_catalog"."default",
  "imagen" text COLLATE "pg_catalog"."default",
  "in_exento" bool,
  "contror" bool,
  "atualisar" bool,
  "suma" float8,
  "existencia" float8,
  "salida" float8,
  "status" varchar(1) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."productos2" OWNER TO "postgres";

-- ----------------------------
-- Table structure for recibo
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."recibo";
CREATE TABLE "myappdb"."recibo" (
  "id" int4 NOT NULL DEFAULT nextval('"myappdb".recibo_id_seq'::regclass),
  "fecha" timestamptz(6),
  "cantidad" numeric(12,2),
  "nombre" varchar(255) COLLATE "pg_catalog"."default",
  "concepto" varchar(255) COLLATE "pg_catalog"."default",
  "fpago" int4
)
;
ALTER TABLE "myappdb"."recibo" OWNER TO "postgres";

-- ----------------------------
-- Table structure for rnc
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."rnc";
CREATE TABLE "myappdb"."rnc" (
  "id" int4 NOT NULL DEFAULT nextval('"myappdb".rnc_id_seq'::regclass),
  "rnc" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "rason" varchar(255) COLLATE "pg_catalog"."default",
  "status" varchar(255) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."rnc" OWNER TO "postgres";

-- ----------------------------
-- Table structure for salida
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."salida";
CREATE TABLE "myappdb"."salida" (
  "id" int4 NOT NULL DEFAULT nextval('"myappdb".salida_id_seq'::regclass),
  "idsucursal" int4,
  "codsalida" varchar(255) COLLATE "pg_catalog"."default",
  "fecsalida" date,
  "horasalida" timestamptz(6),
  "canfact" int4,
  "valfact" numeric(10,2),
  "valpagado" numeric(10,2),
  "valdevolucion" numeric(10,2),
  "codchofer" int4,
  "nomchofer" varchar(255) COLLATE "pg_catalog"."default",
  "cedchofer" varchar(255) COLLATE "pg_catalog"."default",
  "status" varchar(255) COLLATE "pg_catalog"."default",
  "envia" varchar(255) COLLATE "pg_catalog"."default",
  "idusuario" int4
)
;
ALTER TABLE "myappdb"."salida" OWNER TO "postgres";

-- ----------------------------
-- Table structure for sector
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."sector";
CREATE TABLE "myappdb"."sector" (
  "se_codsect" int4 NOT NULL DEFAULT nextval('"myappdb".sector_se_codsect_seq'::regclass),
  "se_dessect" varchar(30) COLLATE "pg_catalog"."default" NOT NULL,
  "se_codzona" int4,
  "idsucursal" int4
)
;
ALTER TABLE "myappdb"."sector" OWNER TO "postgres";

-- ----------------------------
-- Table structure for sucursales
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."sucursales";
CREATE TABLE "myappdb"."sucursales" (
  "cod_sucursal" int4 NOT NULL DEFAULT nextval('"myappdb".sucursales_cod_sucursal_seq'::regclass),
  "nom_sucursal" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "zona" varchar(255) COLLATE "pg_catalog"."default",
  "cod_empre" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "dir_sucursal" varchar(255) COLLATE "pg_catalog"."default",
  "tel_sucursal" varchar(255) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."sucursales" OWNER TO "postgres";

-- ----------------------------
-- Table structure for suplidor
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."suplidor";
CREATE TABLE "myappdb"."suplidor" (
  "su_codsupl" int4 NOT NULL DEFAULT nextval('"myappdb".suplidor_su_codsupl_seq'::regclass),
  "su_nomsupl" varchar(35) COLLATE "pg_catalog"."default" NOT NULL,
  "su_rncsupl" varchar(15) COLLATE "pg_catalog"."default",
  "su_dirsupl" varchar(50) COLLATE "pg_catalog"."default",
  "su_telsupl" varchar(26) COLLATE "pg_catalog"."default",
  "su_contact" varchar(30) COLLATE "pg_catalog"."default",
  "su_status" bool
)
;
ALTER TABLE "myappdb"."suplidor" OWNER TO "postgres";

-- ----------------------------
-- Table structure for tiponcf
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."tiponcf";
CREATE TABLE "myappdb"."tiponcf" (
  "idncf" int4 NOT NULL DEFAULT nextval('"myappdb".tiponcf_idncf_seq'::regclass),
  "desncf" varchar(40) COLLATE "pg_catalog"."default" NOT NULL,
  "tipo" varchar(4) COLLATE "pg_catalog"."default" NOT NULL,
  "codigo" varchar(4) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."tiponcf" OWNER TO "postgres";

-- ----------------------------
-- Table structure for tipousuario
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."tipousuario";
CREATE TABLE "myappdb"."tipousuario" (
  "id" int4 NOT NULL DEFAULT nextval('"myappdb".tipousuario_id_seq'::regclass),
  "descripcion" varchar(30) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."tipousuario" OWNER TO "postgres";

-- ----------------------------
-- Table structure for usuario
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."usuario";
CREATE TABLE "myappdb"."usuario" (
  "codusuario" int4 NOT NULL DEFAULT nextval('"myappdb".usuario_codusuario_seq'::regclass),
  "idusuario" varchar(10) COLLATE "pg_catalog"."default",
  "claveusuario" varchar(255) COLLATE "pg_catalog"."default",
  "nombreusuario" varchar(100) COLLATE "pg_catalog"."default",
  "nivel" int4,
  "metaventa" numeric(5,2),
  "correo" varchar(40) COLLATE "pg_catalog"."default",
  "clavecorreo" varchar(15) COLLATE "pg_catalog"."default",
  "sucursalid" int4,
  "idtipousuario" int4,
  "idpermiso" int4,
  "cod_empre" varchar(30) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."usuario" OWNER TO "postgres";

-- ----------------------------
-- Table structure for ventainterna
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."ventainterna";
CREATE TABLE "myappdb"."ventainterna" (
  "fa_codfact" varchar(12) COLLATE "pg_catalog"."default" NOT NULL,
  "fa_fecfact" date,
  "fa_valfact" numeric(12,2),
  "fa_itbifact" numeric(12,2),
  "fa_subfact" numeric(12,2),
  "fa_cosfact" numeric(12,2),
  "fa_codclie" int4,
  "fa_nomclie" varchar(39) COLLATE "pg_catalog"."default",
  "fa_telclie" varchar(12) COLLATE "pg_catalog"."default",
  "fa_dirclie" varchar(40) COLLATE "pg_catalog"."default",
  "fa_codvend" varchar(10) COLLATE "pg_catalog"."default",
  "fa_nomvend" varchar(15) COLLATE "pg_catalog"."default",
  "fa_usuario" varchar(30) COLLATE "pg_catalog"."default",
  "fa_status" varchar(4) COLLATE "pg_catalog"."default",
  "fa_solicitud" varchar(12) COLLATE "pg_catalog"."default",
  "fa_codempr" varchar(6) COLLATE "pg_catalog"."default",
  "fa_codsucu" int4,
  "fa_tipo" varchar(10) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "myappdb"."ventainterna" OWNER TO "postgres";

-- ----------------------------
-- Table structure for ventainternacounter
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."ventainternacounter";
CREATE TABLE "myappdb"."ventainternacounter" (
  "year" int4 NOT NULL,
  "last_number" int4 NOT NULL
)
;
ALTER TABLE "myappdb"."ventainternacounter" OWNER TO "postgres";

-- ----------------------------
-- Table structure for zona
-- ----------------------------
DROP TABLE IF EXISTS "myappdb"."zona";
CREATE TABLE "myappdb"."zona" (
  "zo_codzona" int4 NOT NULL DEFAULT nextval('"myappdb".zona_zo_codzona_seq'::regclass),
  "zo_descrip" varchar(30) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "myappdb"."zona" OWNER TO "postgres";

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."choferes_codchofer_seq"
OWNED BY "myappdb"."choferes"."codchofer";
SELECT setval('"myappdb"."choferes_codchofer_seq"', 6, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."cierrecaja_idcierre_seq"
OWNED BY "myappdb"."cierrecaja"."idcierre";
SELECT setval('"myappdb"."cierrecaja_idcierre_seq"', 3, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."clientes_cl_codclie_seq"
OWNED BY "myappdb"."clientes"."cl_codclie";
SELECT setval('"myappdb"."clientes_cl_codclie_seq"', 17, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."contfactura_id_seq"
OWNED BY "myappdb"."contfactura"."id";
SELECT setval('"myappdb"."contfactura_id_seq"', 19, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."despachadores_coddesp_seq"
OWNED BY "myappdb"."despachadores"."coddesp";
SELECT setval('"myappdb"."despachadores_coddesp_seq"', 3, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."detcotizacion_id_seq"
OWNED BY "myappdb"."detcotizacion"."id";
SELECT setval('"myappdb"."detcotizacion_id_seq"', 1, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."detfactura_id_seq"
OWNED BY "myappdb"."detfactura"."id";
SELECT setval('"myappdb"."detfactura_id_seq"', 170, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."detventainterna_id_seq"
OWNED BY "myappdb"."detventainterna"."id";
SELECT setval('"myappdb"."detventainterna_id_seq"', 46, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."devolucion_id_seq"
OWNED BY "myappdb"."devolucion"."id";
SELECT setval('"myappdb"."devolucion_id_seq"', 1, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."dtipousuario_id_seq"
OWNED BY "myappdb"."dtipousuario"."id";
SELECT setval('"myappdb"."dtipousuario_id_seq"', 6, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."encf_id_seq"
OWNED BY "myappdb"."encf"."id";
SELECT setval('"myappdb"."encf_id_seq"', 11, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."fentrega_idfentrega_seq"
OWNED BY "myappdb"."fentrega"."idfentrega";
SELECT setval('"myappdb"."fentrega_idfentrega_seq"', 2, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."fpago_fp_codfpago_seq"
OWNED BY "myappdb"."fpago"."fp_codfpago";
SELECT setval('"myappdb"."fpago_fp_codfpago_seq"', 5, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."inventario_id_seq"
OWNED BY "myappdb"."inventario"."id";
SELECT setval('"myappdb"."inventario_id_seq"', 27, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."modulo_idmodulo_seq"
OWNED BY "myappdb"."modulo"."idmodulo";
SELECT setval('"myappdb"."modulo_idmodulo_seq"', 3, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."permiso_idpermiso_seq"
OWNED BY "myappdb"."permiso"."idpermiso";
SELECT setval('"myappdb"."permiso_idpermiso_seq"', 12, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."productos2_id_seq"
OWNED BY "myappdb"."productos2"."id";
SELECT setval('"myappdb"."productos2_id_seq"', 3263, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."recibo_id_seq"
OWNED BY "myappdb"."recibo"."id";
SELECT setval('"myappdb"."recibo_id_seq"', 4, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."rnc_id_seq"
OWNED BY "myappdb"."rnc"."id";
SELECT setval('"myappdb"."rnc_id_seq"', 764716, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."salida_id_seq"
OWNED BY "myappdb"."salida"."id";
SELECT setval('"myappdb"."salida_id_seq"', 61, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."sector_se_codsect_seq"
OWNED BY "myappdb"."sector"."se_codsect";
SELECT setval('"myappdb"."sector_se_codsect_seq"', 15, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."sucursales_cod_sucursal_seq"
OWNED BY "myappdb"."sucursales"."cod_sucursal";
SELECT setval('"myappdb"."sucursales_cod_sucursal_seq"', 22, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."suplidor_su_codsupl_seq"
OWNED BY "myappdb"."suplidor"."su_codsupl";
SELECT setval('"myappdb"."suplidor_su_codsupl_seq"', 13, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."tiponcf_idncf_seq"
OWNED BY "myappdb"."tiponcf"."idncf";
SELECT setval('"myappdb"."tiponcf_idncf_seq"', 15, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."tipousuario_id_seq"
OWNED BY "myappdb"."tipousuario"."id";
SELECT setval('"myappdb"."tipousuario_id_seq"', 5, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."usuario_codusuario_seq"
OWNED BY "myappdb"."usuario"."codusuario";
SELECT setval('"myappdb"."usuario_codusuario_seq"', 19, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "myappdb"."zona_zo_codzona_seq"
OWNED BY "myappdb"."zona"."zo_codzona";
SELECT setval('"myappdb"."zona_zo_codzona_seq"', 7, true);

-- ----------------------------
-- Primary Key structure for table choferes
-- ----------------------------
ALTER TABLE "myappdb"."choferes" ADD CONSTRAINT "idx_30141_primary" PRIMARY KEY ("codchofer", "id");

-- ----------------------------
-- Primary Key structure for table cierrecaja
-- ----------------------------
ALTER TABLE "myappdb"."cierrecaja" ADD CONSTRAINT "idx_30146_primary" PRIMARY KEY ("idcierre");

-- ----------------------------
-- Indexes structure for table clientes
-- ----------------------------
CREATE INDEX "idx_30153_fk_clientes_sector" ON "myappdb"."clientes" USING btree (
  "cl_codsect" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_30153_fk_clientes_zona" ON "myappdb"."clientes" USING btree (
  "cl_codzona" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table clientes
-- ----------------------------
ALTER TABLE "myappdb"."clientes" ADD CONSTRAINT "idx_30153_primary" PRIMARY KEY ("cl_codclie");

-- ----------------------------
-- Indexes structure for table contfactura
-- ----------------------------
CREATE INDEX "idx_30158_contfactura_idsucursal_fkey" ON "myappdb"."contfactura" USING btree (
  "idsucursal" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table contfactura
-- ----------------------------
ALTER TABLE "myappdb"."contfactura" ADD CONSTRAINT "idx_30158_primary" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table cotizacion
-- ----------------------------
ALTER TABLE "myappdb"."cotizacion" ADD CONSTRAINT "idx_30162_primary" PRIMARY KEY ("ct_codcoti");

-- ----------------------------
-- Primary Key structure for table cotizacioncounter
-- ----------------------------
ALTER TABLE "myappdb"."cotizacioncounter" ADD CONSTRAINT "idx_30127_primary" PRIMARY KEY ("year");

-- ----------------------------
-- Primary Key structure for table ctr_factura
-- ----------------------------
ALTER TABLE "myappdb"."ctr_factura" ADD CONSTRAINT "idx_30167_primary" PRIMARY KEY ("year");

-- ----------------------------
-- Primary Key structure for table despachadores
-- ----------------------------
ALTER TABLE "myappdb"."despachadores" ADD CONSTRAINT "idx_30173_primary" PRIMARY KEY ("coddesp");

-- ----------------------------
-- Indexes structure for table detcotizacion
-- ----------------------------
CREATE INDEX "idx_30178_detcotizacion_ibfk_1" ON "myappdb"."detcotizacion" USING btree (
  "dc_codcoti" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table detcotizacion
-- ----------------------------
ALTER TABLE "myappdb"."detcotizacion" ADD CONSTRAINT "idx_30178_primary" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table detentradamerc
-- ----------------------------
ALTER TABLE "myappdb"."detentradamerc" ADD CONSTRAINT "idx_30182_primary" PRIMARY KEY ("de_codentr", "de_codmerc");

-- ----------------------------
-- Indexes structure for table detfactura
-- ----------------------------
CREATE INDEX "idx_30131_detfactura_ibfk_1" ON "myappdb"."detfactura" USING btree (
  "df_codfact" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table detfactura
-- ----------------------------
ALTER TABLE "myappdb"."detfactura" ADD CONSTRAINT "idx_30131_primary" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table detsalida
-- ----------------------------
ALTER TABLE "myappdb"."detsalida" ADD CONSTRAINT "idx_30185_primary" PRIMARY KEY ("codsalida", "codfact");

-- ----------------------------
-- Primary Key structure for table detventainterna
-- ----------------------------
ALTER TABLE "myappdb"."detventainterna" ADD CONSTRAINT "idx_30191_primary" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table devolucion
-- ----------------------------
ALTER TABLE "myappdb"."devolucion" ADD CONSTRAINT "idx_30196_primary" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table dtipousuario
-- ----------------------------
CREATE INDEX "idx_30203_dtipousuario_idmodulo_fkey" ON "myappdb"."dtipousuario" USING btree (
  "idmodulo" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_30203_dtipousuario_idtipousuario_fkey" ON "myappdb"."dtipousuario" USING btree (
  "idtipousuario" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table dtipousuario
-- ----------------------------
ALTER TABLE "myappdb"."dtipousuario" ADD CONSTRAINT "idx_30203_primary" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table empresas
-- ----------------------------
CREATE INDEX "idx_30207_cod_empre" ON "myappdb"."empresas" USING btree (
  "cod_empre" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_30207_cod_empre_2" ON "myappdb"."empresas" USING btree (
  "cod_empre" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_30207_cod_empre_3" ON "myappdb"."empresas" USING btree (
  "cod_empre" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table empresas
-- ----------------------------
ALTER TABLE "myappdb"."empresas" ADD CONSTRAINT "idx_30207_primary" PRIMARY KEY ("cod_empre");

-- ----------------------------
-- Indexes structure for table encf
-- ----------------------------
CREATE INDEX "idx_30213_encf_codempr_fkey" ON "myappdb"."encf" USING btree (
  "codempr" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table encf
-- ----------------------------
ALTER TABLE "myappdb"."encf" ADD CONSTRAINT "idx_30213_primary" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table entradamerc
-- ----------------------------
ALTER TABLE "myappdb"."entradamerc" ADD CONSTRAINT "idx_30217_primary" PRIMARY KEY ("me_codentr");

-- ----------------------------
-- Primary Key structure for table entradamerccounter
-- ----------------------------
ALTER TABLE "myappdb"."entradamerccounter" ADD CONSTRAINT "idx_30222_primary" PRIMARY KEY ("year");

-- ----------------------------
-- Indexes structure for table factura
-- ----------------------------
CREATE INDEX "idx_30225_factura_fa_codfpago_fkey" ON "myappdb"."factura" USING btree (
  "fa_codfpago" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_30225_factura_fa_envio_fkey" ON "myappdb"."factura" USING btree (
  "fa_envio" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table factura
-- ----------------------------
ALTER TABLE "myappdb"."factura" ADD CONSTRAINT "idx_30225_primary" PRIMARY KEY ("fa_codfact");

-- ----------------------------
-- Primary Key structure for table fentrega
-- ----------------------------
ALTER TABLE "myappdb"."fentrega" ADD CONSTRAINT "idx_30231_primary" PRIMARY KEY ("idfentrega");

-- ----------------------------
-- Primary Key structure for table fpago
-- ----------------------------
ALTER TABLE "myappdb"."fpago" ADD CONSTRAINT "idx_30236_primary" PRIMARY KEY ("fp_codfpago");

-- ----------------------------
-- Primary Key structure for table grupomerc
-- ----------------------------
ALTER TABLE "myappdb"."grupomerc" ADD CONSTRAINT "idx_30240_primary" PRIMARY KEY ("codgrupo");

-- ----------------------------
-- Indexes structure for table inventario
-- ----------------------------
CREATE UNIQUE INDEX "idx_30244_sucursal_producto" ON "myappdb"."inventario" USING btree (
  "inv_codsucu" "pg_catalog"."int4_ops" ASC NULLS LAST,
  "inv_codprod" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table inventario
-- ----------------------------
ALTER TABLE "myappdb"."inventario" ADD CONSTRAINT "idx_30244_primary" PRIMARY KEY ("id", "inv_codsucu", "inv_codprod");

-- ----------------------------
-- Indexes structure for table modulo
-- ----------------------------
CREATE INDEX "idx_30249_idmodulo" ON "myappdb"."modulo" USING btree (
  "idmodulo" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table modulo
-- ----------------------------
ALTER TABLE "myappdb"."modulo" ADD CONSTRAINT "idx_30249_primary" PRIMARY KEY ("idmodulo");

-- ----------------------------
-- Indexes structure for table permiso
-- ----------------------------
CREATE INDEX "idx_30254_permiso_codusuario_fkey" ON "myappdb"."permiso" USING btree (
  "codusuario" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_30254_permiso_idmodulo_fkey" ON "myappdb"."permiso" USING btree (
  "idmodulo" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table permiso
-- ----------------------------
ALTER TABLE "myappdb"."permiso" ADD CONSTRAINT "idx_30254_primary" PRIMARY KEY ("idpermiso");

-- ----------------------------
-- Primary Key structure for table productos2
-- ----------------------------
ALTER TABLE "myappdb"."productos2" ADD CONSTRAINT "idx_30259_primary" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table recibo
-- ----------------------------
ALTER TABLE "myappdb"."recibo" ADD CONSTRAINT "idx_30266_primary" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table rnc
-- ----------------------------
CREATE UNIQUE INDEX "idx_30273_rnc" ON "myappdb"."rnc" USING btree (
  "rnc" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table rnc
-- ----------------------------
ALTER TABLE "myappdb"."rnc" ADD CONSTRAINT "idx_30273_primary" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table salida
-- ----------------------------
ALTER TABLE "myappdb"."salida" ADD CONSTRAINT "idx_30280_primary" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table sector
-- ----------------------------
CREATE INDEX "idx_30287_se_codzona" ON "myappdb"."sector" USING btree (
  "se_codzona" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_30287_sector_idsucursal_fkey" ON "myappdb"."sector" USING btree (
  "idsucursal" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sector
-- ----------------------------
ALTER TABLE "myappdb"."sector" ADD CONSTRAINT "idx_30287_primary" PRIMARY KEY ("se_codsect");

-- ----------------------------
-- Indexes structure for table sucursales
-- ----------------------------
CREATE INDEX "idx_30292_cod_empre" ON "myappdb"."sucursales" USING btree (
  "cod_empre" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sucursales
-- ----------------------------
ALTER TABLE "myappdb"."sucursales" ADD CONSTRAINT "idx_30292_primary" PRIMARY KEY ("cod_sucursal");

-- ----------------------------
-- Indexes structure for table suplidor
-- ----------------------------
CREATE UNIQUE INDEX "idx_30299_su_rncsupl" ON "myappdb"."suplidor" USING btree (
  "su_rncsupl" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table suplidor
-- ----------------------------
ALTER TABLE "myappdb"."suplidor" ADD CONSTRAINT "idx_30299_primary" PRIMARY KEY ("su_codsupl");

-- ----------------------------
-- Indexes structure for table tiponcf
-- ----------------------------
CREATE UNIQUE INDEX "idx_30304_uk_tiponcf" ON "myappdb"."tiponcf" USING btree (
  "tipo" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "codigo" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table tiponcf
-- ----------------------------
ALTER TABLE "myappdb"."tiponcf" ADD CONSTRAINT "idx_30304_primary" PRIMARY KEY ("idncf");

-- ----------------------------
-- Primary Key structure for table tipousuario
-- ----------------------------
ALTER TABLE "myappdb"."tipousuario" ADD CONSTRAINT "idx_30309_primary" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table usuario
-- ----------------------------
CREATE UNIQUE INDEX "idx_30136_claveusuario" ON "myappdb"."usuario" USING btree (
  "claveusuario" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_30136_usuario_cod_empre_fkey" ON "myappdb"."usuario" USING btree (
  "cod_empre" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_30136_usuario_idtipousuario_fkey" ON "myappdb"."usuario" USING btree (
  "idtipousuario" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_30136_usuario_sucursalid_fkey" ON "myappdb"."usuario" USING btree (
  "sucursalid" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table usuario
-- ----------------------------
ALTER TABLE "myappdb"."usuario" ADD CONSTRAINT "idx_30136_primary" PRIMARY KEY ("codusuario");

-- ----------------------------
-- Primary Key structure for table ventainterna
-- ----------------------------
ALTER TABLE "myappdb"."ventainterna" ADD CONSTRAINT "idx_30313_primary" PRIMARY KEY ("fa_codfact");

-- ----------------------------
-- Primary Key structure for table ventainternacounter
-- ----------------------------
ALTER TABLE "myappdb"."ventainternacounter" ADD CONSTRAINT "idx_30316_primary" PRIMARY KEY ("year");

-- ----------------------------
-- Indexes structure for table zona
-- ----------------------------
CREATE INDEX "idx_30320_zo_codzona" ON "myappdb"."zona" USING btree (
  "zo_codzona" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_30320_zo_codzona_2" ON "myappdb"."zona" USING btree (
  "zo_codzona" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_30320_zo_codzona_3" ON "myappdb"."zona" USING btree (
  "zo_codzona" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_30320_zo_codzona_4" ON "myappdb"."zona" USING btree (
  "zo_codzona" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_30320_zo_codzona_5" ON "myappdb"."zona" USING btree (
  "zo_codzona" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_30320_zo_codzona_6" ON "myappdb"."zona" USING btree (
  "zo_codzona" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_30320_zo_codzona_7" ON "myappdb"."zona" USING btree (
  "zo_codzona" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_30320_zo_codzona_8" ON "myappdb"."zona" USING btree (
  "zo_codzona" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table zona
-- ----------------------------
ALTER TABLE "myappdb"."zona" ADD CONSTRAINT "idx_30320_primary" PRIMARY KEY ("zo_codzona");

-- ----------------------------
-- Foreign Keys structure for table clientes
-- ----------------------------
ALTER TABLE "myappdb"."clientes" ADD CONSTRAINT "fk_clientes_sector" FOREIGN KEY ("cl_codsect") REFERENCES "myappdb"."sector" ("se_codsect") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "myappdb"."clientes" ADD CONSTRAINT "fk_clientes_zona" FOREIGN KEY ("cl_codzona") REFERENCES "myappdb"."zona" ("zo_codzona") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- ----------------------------
-- Foreign Keys structure for table contfactura
-- ----------------------------
ALTER TABLE "myappdb"."contfactura" ADD CONSTRAINT "contfactura_idsucursal_fkey" FOREIGN KEY ("idsucursal") REFERENCES "myappdb"."sucursales" ("cod_sucursal") ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table detcotizacion
-- ----------------------------
ALTER TABLE "myappdb"."detcotizacion" ADD CONSTRAINT "detcotizacion_ibfk_1" FOREIGN KEY ("dc_codcoti") REFERENCES "myappdb"."cotizacion" ("ct_codcoti") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- ----------------------------
-- Foreign Keys structure for table detentradamerc
-- ----------------------------
ALTER TABLE "myappdb"."detentradamerc" ADD CONSTRAINT "detentradamerc_ibfk_1" FOREIGN KEY ("de_codentr") REFERENCES "myappdb"."entradamerc" ("me_codentr") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- ----------------------------
-- Foreign Keys structure for table detfactura
-- ----------------------------
ALTER TABLE "myappdb"."detfactura" ADD CONSTRAINT "detfactura_ibfk_1" FOREIGN KEY ("df_codfact") REFERENCES "myappdb"."factura" ("fa_codfact") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- ----------------------------
-- Foreign Keys structure for table dtipousuario
-- ----------------------------
ALTER TABLE "myappdb"."dtipousuario" ADD CONSTRAINT "dtipousuario_idmodulo_fkey" FOREIGN KEY ("idmodulo") REFERENCES "myappdb"."modulo" ("idmodulo") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "myappdb"."dtipousuario" ADD CONSTRAINT "dtipousuario_idtipousuario_fkey" FOREIGN KEY ("idtipousuario") REFERENCES "myappdb"."tipousuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table encf
-- ----------------------------
ALTER TABLE "myappdb"."encf" ADD CONSTRAINT "encf_codempr_fkey" FOREIGN KEY ("codempr") REFERENCES "myappdb"."empresas" ("cod_empre") ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table factura
-- ----------------------------
ALTER TABLE "myappdb"."factura" ADD CONSTRAINT "factura_fa_codfpago_fkey" FOREIGN KEY ("fa_codfpago") REFERENCES "myappdb"."fpago" ("fp_codfpago") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "myappdb"."factura" ADD CONSTRAINT "factura_fa_envio_fkey" FOREIGN KEY ("fa_envio") REFERENCES "myappdb"."fentrega" ("idfentrega") ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table permiso
-- ----------------------------
ALTER TABLE "myappdb"."permiso" ADD CONSTRAINT "permiso_codusuario_fkey" FOREIGN KEY ("codusuario") REFERENCES "myappdb"."usuario" ("codusuario") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "myappdb"."permiso" ADD CONSTRAINT "permiso_idmodulo_fkey" FOREIGN KEY ("idmodulo") REFERENCES "myappdb"."modulo" ("idmodulo") ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table sector
-- ----------------------------
ALTER TABLE "myappdb"."sector" ADD CONSTRAINT "sector_ibfk_1" FOREIGN KEY ("se_codzona") REFERENCES "myappdb"."zona" ("zo_codzona") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "myappdb"."sector" ADD CONSTRAINT "sector_idsucursal_fkey" FOREIGN KEY ("idsucursal") REFERENCES "myappdb"."sucursales" ("cod_sucursal") ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table sucursales
-- ----------------------------
ALTER TABLE "myappdb"."sucursales" ADD CONSTRAINT "sucursales_cod_empre_fkey" FOREIGN KEY ("cod_empre") REFERENCES "myappdb"."empresas" ("cod_empre") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table usuario
-- ----------------------------
ALTER TABLE "myappdb"."usuario" ADD CONSTRAINT "usuario_cod_empre_fkey" FOREIGN KEY ("cod_empre") REFERENCES "myappdb"."empresas" ("cod_empre") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "myappdb"."usuario" ADD CONSTRAINT "usuario_idtipousuario_fkey" FOREIGN KEY ("idtipousuario") REFERENCES "myappdb"."tipousuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "myappdb"."usuario" ADD CONSTRAINT "usuario_sucursalid_fkey" FOREIGN KEY ("sucursalid") REFERENCES "myappdb"."sucursales" ("cod_sucursal") ON DELETE SET NULL ON UPDATE CASCADE;
