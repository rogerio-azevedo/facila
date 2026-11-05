import "server-only";

import {
  IndicadorFinal,
  type IbsCbsInputNt009,
} from "open-nfse";

type ProfileIbsCbsFields = {
  issqnCst: string;
  cClassTrib: string | null;
  cIndOp: string | null;
  indDest: string | null;
  finNfse: string | null;
  indFinal: string | null;
};

export function buildIbsCbsFromProfileNt009(profile: ProfileIbsCbsFields): IbsCbsInputNt009 {
  return {
    classificacao: {
      CST: profile.issqnCst ?? "000",
      cClassTrib: profile.cClassTrib ?? "000001",
    },
    indFinal: profile.indFinal === "1" ? IndicadorFinal.Sim : IndicadorFinal.Nao,
    cIndOp: profile.cIndOp ?? "050101",
  };
}

export function buildIbsCbsFromProfile(profile: ProfileIbsCbsFields): Record<string, unknown> {
  return {
    finNFSe: "0",
    indFinal: profile.indFinal === "1" ? "1" : "0",
    cIndOp: profile.cIndOp ?? "050101",
    indDest: profile.indDest === "1" ? "1" : "0",
    valores: {
      trib: {
        gIBSCBS: {
          CST: profile.issqnCst ?? "000",
          cClassTrib: profile.cClassTrib ?? "000001",
        },
      },
    },
  };
}
