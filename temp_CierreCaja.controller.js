import { PrismaClient } from "@prisma/client";
import { response } from "../utils/response.js";
import { serializeBigInt } from "../utils/jsonBigInt.js";

const prisma = new PrismaClient();

export const createCierreCaja = async (req, res) => {
  try {
    const data = req.body;

    const dataToSave = {
      feccierre: data.feccierre ? new Date(data.feccierre) : undefined,
      factfin: data.factfin,
      factini: data.factini,
      cajera: data.cajera,
      totalcierre: data.montocierre !== undefined ? data.montocierre : data.totalcierre,
      tefectivo: data.efectivo !== undefined ? data.efectivo : data.tefectivo,
      ttarjeta: data.tarjeta !== undefined ? data.tarjeta : data.ttarjeta,
      tdeposito: data.deposito !== undefined ? data.deposito : data.tdeposito,
      tcheque: data.cheque !== undefined ? data.cheque : data.tcheque,
      nota: data.nota,
    };

    const newCierre = await prisma.cierrecaja.create({
      data: dataToSave,
    });

    // Actualizar facturas con fa_fpago = 'P' a fa_cierre = 'C'
    if (data.factfin) {
      try {
        const updateResult = await prisma.factura.updateMany({
          where: {
            fa_fpago: 'P',
            fa_codFact: { lte: data.factfin },
            fa_cierre: { not: 'C' }
          },
          data: {
            fa_cierre: 'C'
          }
        });
        console.log(`Facturas actualizadas con cierre 'C': ${updateResult.count}`);
      } catch (err) {
        console.error("Error actualizando facturas:", err);
      }
    }

    response.success(
      res,
      201,
      "Cierre de caja creado exitosamente",
      serializeBigInt(newCierre)
    );
  } catch (error) {
    console.error("Error creando cierre de caja:", error);
    response.error(res, 500, "Error interno del servidor", error);
  }
};

export const getCierreCajas = async (req, res) => {
  try {
    const cierres = await prisma.cierrecaja.findMany({
      orderBy: { idcierre: "desc" },
    });

    response.success(
      res,
      200,
      "Cierres de caja obtenidos exitosamente",
      serializeBigInt(cierres)
    );
  } catch (error) {
    console.error("Error obteniendo cierres de caja:", error);
    response.error(res, 500, "Error interno del servidor", error);
  }
};

export const getCierreCajaById = async (req, res) => {
  try {
    const { id } = req.params;
    const cierre = await prisma.cierrecaja.findUnique({
      where: { idcierre: parseInt(id) },
    });

    if (!cierre) {
      return response.notFound(res, "Cierre de caja no encontrado");
    }

    response.success(
      res,
      200,
      "Cierre de caja obtenido exitosamente",
      serializeBigInt(cierre)
    );
  } catch (error) {
    console.error("Error obteniendo cierre de caja por ID:", error);
    response.error(res, 500, "Error interno del servidor", error);
  }
};

export const updateCierreCaja = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (data.feccierre) {
      data.feccierre = new Date(data.feccierre);
    }

    const dataToUpdate = {
      ...data,
      totalcierre: data.montocierre !== undefined ? data.montocierre : data.totalcierre,
      tefectivo: data.efectivo !== undefined ? data.efectivo : data.tefectivo,
      ttarjeta: data.tarjeta !== undefined ? data.tarjeta : data.ttarjeta,
      tdeposito: data.deposito !== undefined ? data.deposito : data.tdeposito,
      tcheque: data.cheque !== undefined ? data.cheque : data.tcheque,
    };
    
    const safeDataToUpdate = {};
    if (data.feccierre) safeDataToUpdate.feccierre = new Date(data.feccierre);
    if (data.factfin !== undefined) safeDataToUpdate.factfin = data.factfin;
    if (data.factini !== undefined) safeDataToUpdate.factini = data.factini;
    if (data.cajera !== undefined) safeDataToUpdate.cajera = data.cajera;
    if (data.nota !== undefined) safeDataToUpdate.nota = data.nota;
    
    if (data.montocierre !== undefined) safeDataToUpdate.totalcierre = data.montocierre;
    else if (data.totalcierre !== undefined) safeDataToUpdate.totalcierre = data.totalcierre;

    if (data.efectivo !== undefined) safeDataToUpdate.tefectivo = data.efectivo;
    else if (data.tefectivo !== undefined) safeDataToUpdate.tefectivo = data.tefectivo;

    if (data.tarjeta !== undefined) safeDataToUpdate.ttarjeta = data.tarjeta;
    else if (data.ttarjeta !== undefined) safeDataToUpdate.ttarjeta = data.ttarjeta;

    if (data.deposito !== undefined) safeDataToUpdate.tdeposito = data.deposito;
    else if (data.tdeposito !== undefined) safeDataToUpdate.tdeposito = data.tdeposito;

    if (data.cheque !== undefined) safeDataToUpdate.tcheque = data.cheque;
    else if (data.tcheque !== undefined) safeDataToUpdate.tcheque = data.tcheque;


    const updatedCierre = await prisma.cierrecaja.update({
      where: { idcierre: parseInt(id) },
      data: safeDataToUpdate,
    });

    response.success(
      res,
      200,
      "Cierre de caja actualizado exitosamente",
      serializeBigInt(updatedCierre)
    );
  } catch (error) {
    console.error("Error actualizando cierre de caja:", error);
    response.error(res, 500, "Error interno del servidor", error);
  }
};

export const deleteCierreCaja = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.cierrecaja.delete({
      where: { idcierre: parseInt(id) },
    });

    response.success(res, 200, "Cierre de caja eliminado exitosamente");
  } catch (error) {
    console.error("Error eliminando cierre de caja:", error);
    response.error(res, 500, "Error interno del servidor", error);
  }
};
