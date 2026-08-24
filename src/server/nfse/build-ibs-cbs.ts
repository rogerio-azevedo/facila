import "server-only";

import {
  FinalidadeNFSe,
  IndicadorDestinatario,
  IndicadorFinal,
  type RtcInfoIbsCbs,
} from "open-nfse";

type ProfileIbsCbsFields = {
  issqnCst: string;
  cClassTrib: string | null;
  cIndOp: string | null;
  indDest: string | null;
  finNfse: string | null;
  indFinal: string | null;
};

export function buildIbsCbsFromProfile(profile: ProfileIbsCbsFields): RtcInfoIbsCbs {
  return {
    finNFSe: FinalidadeNFSe.Regular,
    indFinal: profile.indFinal === "1" ? IndicadorFinal.Sim : IndicadorFinal.Nao,
    cIndOp: profile.cIndOp ?? "050101",
    indDest:
      profile.indDest === "1"
        ? IndicadorDestinatario.DestinatarioDistinto
        : IndicadorDestinatario.TomadorEhDestinatario,
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
