import "server-only";

import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { NFSe } from "open-nfse";

export interface GenerateDanfseOptions {
  ambiente?: "producao" | "homologacao";
  observacoes?: string;
  logoPath?: string;
}

// Brand Colors & Tokens (Facila Identity)
const BRAND_NAVY = "#003366";
const BRAND_PRIMARY = "#1976d2";
const TEXT_DARK = "#1e293b"; // Slate-800
const TEXT_MUTED = "#64748b"; // Slate-500
const BORDER_LIGHT = "#e2e8f0"; // Slate-200
const BG_CARD = "#f8fafc"; // Slate-50
const BG_HEADER = "#f1f5f9"; // Slate-100
const BADGE_BG = "#ecfdf5"; // Emerald-50
const BADGE_TEXT = "#047857"; // Emerald-700
const BADGE_BORDER = "#a7f3d0"; // Emerald-200

// Helper formatters
function formatChave(chave: string): string {
  return chave.replace(/(\d{4})/g, "$1 ").trim();
}

function formatCnpjCpf(value?: string): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return value;
}

function formatCep(cep?: string): string {
  if (!cep) return "—";
  const digits = cep.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return cep;
}

function formatPhone(phone?: string): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function formatCurrency(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

function formatDate(dateInput?: string | Date): string {
  if (!dateInput) return "—";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleString("pt-BR", {
      timeZone: "America/Cuiaba",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return String(dateInput);
  }
}

function resolveRegimeTributario(opSimpNac?: string, regApTribSN?: string): string {
  if (opSimpNac === "1") return "Regime Normal (Não optante pelo Simples Nacional)";
  if (opSimpNac === "2") return "Simples Nacional - Microempreendedor Individual (MEI)";
  if (opSimpNac === "3") {
    if (regApTribSN === "1") return "Simples Nacional (ME/EPP) - Recolhimento em DAS único";
    if (regApTribSN === "2") return "Simples Nacional (ME/EPP) - ISSQN recolhido por fora";
    return "Optante pelo Simples Nacional (ME/EPP)";
  }
  return "Optante pelo Simples Nacional";
}

/**
 * Modern, executive DANFSe PDF generator following Facila branding and fiscal standards.
 */
export async function generateModernDanfse(
  nfse: NFSe,
  options?: GenerateDanfseOptions,
): Promise<Buffer> {
  const inf = nfse.infNFSe;
  const dps = inf.DPS.infDPS;
  const emit = inf.emit;
  const toma = dps.toma;
  const serv = dps.serv;
  const valores = inf.valores;
  const dpsValores = dps.valores;

  const isHomolog =
    options?.ambiente === "homologacao" ||
    String(dps.tpAmb) === "2" ||
    ("ambGer" in inf && String(inf.ambGer) === "2");

  const urlConsulta = isHomolog
    ? `https://hom.nfse.gov.br/consultapublica/?chave=${inf.chaveAcesso}`
    : `https://www.nfse.gov.br/consultapublica/?chave=${inf.chaveAcesso}`;

  const qrPng = await QRCode.toBuffer(urlConsulta, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
  });

  return new Promise((resolve, reject) => {
    // A4 dimensions: 595.28 x 841.89 points
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 22, bottom: 22, left: 26, right: 26 },
      info: {
        Title: `DANFSe ${inf.nNFSe || "NFS-e"} - ${inf.chaveAcesso}`,
        Author: "Facila ERP",
        Subject: "Documento Auxiliar da NFS-e - Padrão Nacional",
      },
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      const pageWidth = 543; // 595.28 - 26*2
      const startX = 26;
      let currentY = 20;

      // -----------------------------------------------------------------------
      // Top Accent Band (Facila Navy)
      // -----------------------------------------------------------------------
      doc.rect(startX, currentY, pageWidth, 4).fill(BRAND_NAVY);
      currentY += 8;

      // -----------------------------------------------------------------------
      // Header Section (Brand / Title + Fiscal Info Card)
      // -----------------------------------------------------------------------
      const headerBoxHeight = 64;

      doc
        .roundedRect(startX, currentY, pageWidth, headerBoxHeight, 4)
        .fillAndStroke(BG_CARD, BORDER_LIGHT);

      const defaultLogoPath = path.join(process.cwd(), "public", "facila.png");
      const logoToUse =
        options?.logoPath && fs.existsSync(options.logoPath)
          ? options.logoPath
          : fs.existsSync(defaultLogoPath)
            ? defaultLogoPath
            : null;

      let titleX = startX + 12;
      if (logoToUse) {
        try {
          doc.image(logoToUse, startX + 12, currentY + 11, { height: 26 });
          titleX = startX + 115;
        } catch {
          titleX = startX + 12;
        }
      }

      doc
        .fillColor(BRAND_NAVY)
        .font("Helvetica-Bold")
        .fontSize(15)
        .text("DANFS-e", titleX, currentY + 9);

      doc
        .fillColor(TEXT_DARK)
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .text("Documento Auxiliar da Nota Fiscal de Serviço Eletrônica", titleX, currentY + 26);

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica")
        .fontSize(7)
        .text("Padrão Nacional • Ambiente de Dados Nacional (ADN - Receita Federal)", titleX, currentY + 39);

      // Right Column: Number, DPS & Status Badge
      const rightColX = startX + pageWidth - 165;
      const rightColWidth = 155;

      const badgeY = currentY + 8;
      doc
        .roundedRect(rightColX, badgeY, rightColWidth, 18, 4)
        .fillAndStroke(isHomolog ? "#fef3c7" : BADGE_BG, isHomolog ? "#fde68a" : BADGE_BORDER);

      // Draw small solid dot inside badge
      doc
        .circle(rightColX + 14, badgeY + 9, 3)
        .fill(isHomolog ? "#d97706" : BADGE_TEXT);

      doc
        .fillColor(isHomolog ? "#b45309" : BADGE_TEXT)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(
          isHomolog ? "HOMOLOGAÇÃO" : "NFS-e AUTORIZADA",
          rightColX + 22,
          badgeY + 5,
          { width: rightColWidth - 26, align: "left" },
        );

      doc
        .fillColor(BRAND_NAVY)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(`NFS-e Nº ${inf.nNFSe}`, rightColX, currentY + 31, {
          width: rightColWidth,
          align: "right",
        });

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica")
        .fontSize(7.5)
        .text(`DPS Nº ${dps.nDPS} • Série ${dps.serie}`, rightColX, currentY + 46, {
          width: rightColWidth,
          align: "right",
        });

      currentY += headerBoxHeight + 5;

      // -----------------------------------------------------------------------
      // Chave de Acesso Bar (Highlight Strip)
      // -----------------------------------------------------------------------
      const chaveBoxHeight = 30;
      doc
        .roundedRect(startX, currentY, pageWidth, chaveBoxHeight, 4)
        .fillAndStroke(BG_HEADER, BORDER_LIGHT);

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(6)
        .text("CHAVE DE ACESSO PARA CONSULTA DE AUTENTICIDADE", startX + 10, currentY + 4);

      doc
        .fillColor(BRAND_NAVY)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(formatChave(inf.chaveAcesso), startX + 10, currentY + 15);

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica")
        .fontSize(7.5)
        .text(`Protocolo DF-e: ${inf.nDFSe || "—"}`, startX + pageWidth - 140, currentY + 15, {
          width: 130,
          align: "right",
        });

      currentY += chaveBoxHeight + 5;

      // -----------------------------------------------------------------------
      // Prestador de Serviços (Card)
      // -----------------------------------------------------------------------
      const prestadorBoxHeight = 68;
      doc
        .roundedRect(startX, currentY, pageWidth, prestadorBoxHeight, 4)
        .fillAndStroke(BG_CARD, BORDER_LIGHT);

      doc.rect(startX, currentY, pageWidth, 15).fill(BG_HEADER);
      doc
        .fillColor(BRAND_NAVY)
        .font("Helvetica-Bold")
        .fontSize(6.5)
        .text("PRESTADOR DE SERVIÇOS (EMITENTE)", startX + 8, currentY + 3.5);

      const emitCnpj =
        "CNPJ" in emit.identificador
          ? emit.identificador.CNPJ
          : "CPF" in emit.identificador
            ? emit.identificador.CPF
            : "";

      const emitEnd = emit.enderNac;
      const emitLogradouro = `${emitEnd.xLgr}, ${emitEnd.nro}${emitEnd.xCpl ? ` - ${emitEnd.xCpl}` : ""}`;
      const emitBairroMun = `${emitEnd.xBairro} • ${inf.xLocEmi || "Cuiabá"} - ${emitEnd.UF} • CEP: ${formatCep(emitEnd.CEP)}`;

      const emitY = currentY + 18;
      doc
        .fillColor(TEXT_DARK)
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .text(emit.xNome, startX + 8, emitY, { width: 330 });

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(6.5)
        .text("CNPJ / CPF:", startX + 345, emitY);
      doc
        .fillColor(TEXT_DARK)
        .font("Helvetica")
        .fontSize(7.5)
        .text(formatCnpjCpf(emitCnpj), startX + 395, emitY - 1);

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(6.5)
        .text("INSC. MUNICIPAL:", startX + 345, emitY + 10);
      doc
        .fillColor(TEXT_DARK)
        .font("Helvetica")
        .fontSize(7.5)
        .text(emit.IM || "Isento / Não aplicável", startX + 418, emitY + 9);

      doc
        .fillColor(TEXT_DARK)
        .font("Helvetica")
        .fontSize(7)
        .text(emitLogradouro, startX + 8, emitY + 13, { width: 330 });

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica")
        .fontSize(6.5)
        .text(emitBairroMun, startX + 8, emitY + 23, { width: 330 });

      const emitContato = [
        emit.email ? `E-mail: ${emit.email}` : null,
        emit.fone ? `Tel: ${formatPhone(emit.fone)}` : null,
      ]
        .filter(Boolean)
        .join(" • ");

      const regimeDesc = resolveRegimeTributario(
        dps.prest.regTrib.opSimpNac,
        dps.prest.regTrib.regApTribSN,
      );

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica")
        .fontSize(6.5)
        .text(emitContato || "—", startX + 8, emitY + 34, { width: 330 });

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(6)
        .text("REGIME TRIBUTÁRIO:", startX + 345, emitY + 22);
      doc
        .fillColor(TEXT_DARK)
        .font("Helvetica")
        .fontSize(6.5)
        .text(regimeDesc, startX + 345, emitY + 30, { width: 185 });

      currentY += prestadorBoxHeight + 5;

      // -----------------------------------------------------------------------
      // Tomador de Serviços (Card)
      // -----------------------------------------------------------------------
      const tomadorBoxHeight = 60;
      doc
        .roundedRect(startX, currentY, pageWidth, tomadorBoxHeight, 4)
        .fillAndStroke(BG_CARD, BORDER_LIGHT);

      doc.rect(startX, currentY, pageWidth, 15).fill(BG_HEADER);
      doc
        .fillColor(BRAND_NAVY)
        .font("Helvetica-Bold")
        .fontSize(6.5)
        .text("TOMADOR DE SERVIÇOS (DESTINATÁRIO)", startX + 8, currentY + 3.5);

      const tomaY = currentY + 18;

      if (!toma) {
        doc
          .fillColor(TEXT_MUTED)
          .font("Helvetica-Oblique")
          .fontSize(8)
          .text("Tomador não identificado (Consumidor Final).", startX + 8, tomaY + 8);
      } else {
        const tomaCnpjCpf =
          "CNPJ" in toma.identificador
            ? toma.identificador.CNPJ
            : "CPF" in toma.identificador
              ? toma.identificador.CPF
              : "NIF" in toma.identificador
                ? toma.identificador.NIF
                : toma.identificador.cNaoNIF;

        doc
          .fillColor(TEXT_DARK)
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .text(toma.xNome || "Não informado", startX + 8, tomaY, { width: 330 });

        doc
          .fillColor(TEXT_MUTED)
          .font("Helvetica-Bold")
          .fontSize(6.5)
          .text("CNPJ / CPF:", startX + 345, tomaY);
        doc
          .fillColor(TEXT_DARK)
          .font("Helvetica")
          .fontSize(7.5)
          .text(formatCnpjCpf(tomaCnpjCpf), startX + 395, tomaY - 1);

        if (toma.end) {
          const end = toma.end;
          const tomaLogradouro = `${end.xLgr}, ${end.nro}${end.xCpl ? ` - ${end.xCpl}` : ""}`;
          const isNac = "endNac" in end.localidade;
          const tomaCep = isNac ? formatCep(end.localidade.endNac.CEP) : "—";
          const tomaBairro = `${end.xBairro} • CEP: ${tomaCep}`;

          doc
            .fillColor(TEXT_DARK)
            .font("Helvetica")
            .fontSize(7)
            .text(tomaLogradouro, startX + 8, tomaY + 12, { width: 330 });

          doc
            .fillColor(TEXT_MUTED)
            .font("Helvetica")
            .fontSize(6.5)
            .text(tomaBairro, startX + 8, tomaY + 22, { width: 330 });
        }

        const tomaContato = [
          toma.email ? `E-mail: ${toma.email}` : null,
          toma.fone ? `Tel: ${formatPhone(toma.fone)}` : null,
        ]
          .filter(Boolean)
          .join(" • ");

        if (tomaContato) {
          doc
            .fillColor(TEXT_MUTED)
            .font("Helvetica")
            .fontSize(6.5)
            .text(tomaContato, startX + 8, tomaY + 32, { width: 330 });
        }
      }

      currentY += tomadorBoxHeight + 5;

      // -----------------------------------------------------------------------
      // Descrição do Serviço (Card com Altura Dinâmica)
      // -----------------------------------------------------------------------
      doc.font("Helvetica").fontSize(8);
      const descText = serv.cServ.xDescServ;
      const descHeight = Math.min(
        120,
        Math.max(40, doc.heightOfString(descText, { width: pageWidth - 16, lineGap: 2 }) + 8),
      );
      const servBoxHeight = 44 + descHeight;

      doc
        .roundedRect(startX, currentY, pageWidth, servBoxHeight, 4)
        .fillAndStroke(BG_CARD, BORDER_LIGHT);

      doc.rect(startX, currentY, pageWidth, 15).fill(BG_HEADER);
      doc
        .fillColor(BRAND_NAVY)
        .font("Helvetica-Bold")
        .fontSize(6.5)
        .text("DISCRIMINAÇÃO DOS SERVIÇOS PRESTADOS", startX + 8, currentY + 3.5);

      const servY = currentY + 18;
      const colW = (pageWidth - 16) / 4;

      const cTribNac = serv.cServ.cTribNac;
      const cNbs = serv.cServ.cNBS || "—";
      const localIncid = inf.xLocIncid || inf.xLocPrestacao || "Cuiabá - MT";
      const localPrest = inf.xLocPrestacao || inf.xLocIncid || "Cuiabá - MT";

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(5.5)
        .text("TRIB. NACIONAL", startX + 8, servY);
      doc
        .fillColor(TEXT_DARK)
        .font("Helvetica-Bold")
        .fontSize(7)
        .text(cTribNac, startX + 8, servY + 7);

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(5.5)
        .text("CÓDIGO NBS", startX + 8 + colW, servY);
      doc
        .fillColor(TEXT_DARK)
        .font("Helvetica")
        .fontSize(7)
        .text(cNbs, startX + 8 + colW, servY + 7);

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(5.5)
        .text("LOCAL DA PRESTAÇÃO", startX + 8 + colW * 2, servY);
      doc
        .fillColor(TEXT_DARK)
        .font("Helvetica")
        .fontSize(7)
        .text(localPrest, startX + 8 + colW * 2, servY + 7);

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(5.5)
        .text("LOCAL DE INCIDÊNCIA ISS", startX + 8 + colW * 3, servY);
      doc
        .fillColor(TEXT_DARK)
        .font("Helvetica")
        .fontSize(7)
        .text(localIncid, startX + 8 + colW * 3, servY + 7);

      doc
        .moveTo(startX + 8, servY + 19)
        .lineTo(startX + pageWidth - 8, servY + 19)
        .strokeColor(BORDER_LIGHT)
        .lineWidth(0.5)
        .stroke();

      doc
        .fillColor(TEXT_DARK)
        .font("Helvetica")
        .fontSize(8)
        .text(descText, startX + 8, servY + 23, {
          width: pageWidth - 16,
          height: descHeight,
          lineGap: 2,
        });

      currentY += servBoxHeight + 5;

      // -----------------------------------------------------------------------
      // Valores e Tributação (Financial Breakdown Card)
      // -----------------------------------------------------------------------
      const valoresBoxHeight = 78;
      doc
        .roundedRect(startX, currentY, pageWidth, valoresBoxHeight, 4)
        .fillAndStroke(BG_CARD, BORDER_LIGHT);

      doc.rect(startX, currentY, pageWidth, 15).fill(BG_HEADER);
      doc
        .fillColor(BRAND_NAVY)
        .font("Helvetica-Bold")
        .fontSize(6.5)
        .text("VALORES DO SERVIÇO E QUADRO TRIBUTÁRIO", startX + 8, currentY + 3.5);

      const valY = currentY + 18;
      const vServ = dpsValores.vServPrest.vServ;
      const vBc = valores.vBC ?? vServ;
      const pAliq = valores.pAliqAplic ?? dpsValores.trib?.tribMun?.pAliq;
      const vIss = valores.vISSQN;
      const vRet = valores.vTotalRet;
      const vLiq = valores.vLiq ?? vServ;

      const valColW = 90;

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(6)
        .text("VALOR DO SERVIÇO", startX + 8, valY);
      doc
        .fillColor(TEXT_DARK)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(`R$ ${formatCurrency(vServ)}`, startX + 8, valY + 8);

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(6)
        .text("BASE DE CÁLCULO", startX + 8 + valColW, valY);
      doc
        .fillColor(TEXT_DARK)
        .font("Helvetica")
        .fontSize(8)
        .text(`R$ ${formatCurrency(vBc)}`, startX + 8 + valColW, valY + 8);

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(6)
        .text("ALÍQUOTA ISSQN", startX + 8 + valColW * 2, valY);
      doc
        .fillColor(TEXT_DARK)
        .font("Helvetica")
        .fontSize(8)
        .text(pAliq !== undefined ? `${formatCurrency(pAliq)}%` : "Isento / Simples", startX + 8 + valColW * 2, valY + 8);

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(6)
        .text("VALOR DO ISSQN", startX + 8 + valColW * 3, valY);
      doc
        .fillColor(TEXT_DARK)
        .font("Helvetica")
        .fontSize(8)
        .text(vIss !== undefined ? `R$ ${formatCurrency(vIss)}` : "R$ 0,00", startX + 8 + valColW * 3, valY + 8);

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(6)
        .text("RETENÇÕES", startX + 8 + valColW * 4, valY);
      doc
        .fillColor(TEXT_DARK)
        .font("Helvetica")
        .fontSize(8)
        .text(vRet !== undefined ? `R$ ${formatCurrency(vRet)}` : "R$ 0,00", startX + 8 + valColW * 4, valY + 8);

      // Big Liquid Value Highlight Container
      const liquidY = valY + 25;
      doc
        .roundedRect(startX + 8, liquidY, pageWidth - 16, 26, 4)
        .fillAndStroke(BRAND_NAVY, BRAND_NAVY);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text("VALOR LÍQUIDO A PAGAR:", startX + 16, liquidY + 8.5);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(`R$ ${formatCurrency(vLiq)}`, startX + pageWidth - 200, liquidY + 6.5, {
          width: 180,
          align: "right",
        });

      currentY += valoresBoxHeight + 5;

      // -----------------------------------------------------------------------
      // Informações Fiscais / Reforma Tributária & Observações
      // -----------------------------------------------------------------------
      const obsBoxHeight = 48;
      doc
        .roundedRect(startX, currentY, pageWidth, obsBoxHeight, 4)
        .fillAndStroke(BG_CARD, BORDER_LIGHT);

      doc.rect(startX, currentY, pageWidth, 15).fill(BG_HEADER);
      doc
        .fillColor(BRAND_NAVY)
        .font("Helvetica-Bold")
        .fontSize(6.5)
        .text("INFORMAÇÕES FISCAIS COMPLEMENTARES", startX + 8, currentY + 3.5);

      const obsY = currentY + 17;
      const totTrib = dpsValores.trib?.totTrib as Record<string, unknown> | undefined;
      const rawPercent = totTrib?.pTotTribSN ?? totTrib?.pTotTrib;
      const pTotTribSn = typeof rawPercent === "number" ? rawPercent : undefined;
      const tribAproxText =
        pTotTribSn !== undefined
          ? `Tributos Federais, Estaduais e Municipais aproximados (Lei 12.741/2012): ${pTotTribSn}% (R$ ${formatCurrency((vServ * pTotTribSn) / 100)}). `
          : "";

      const fiscalNotes = `${tribAproxText}Documento emitido por ME ou EPP optante pelo Simples Nacional. Não gera direito a crédito fiscal de IPI ou ICMS. ${options?.observacoes || inf.xOutInf || ""}`.trim();

      doc
        .fillColor(TEXT_DARK)
        .font("Helvetica")
        .fontSize(6.5)
        .text(fiscalNotes, startX + 8, obsY, {
          width: pageWidth - 16,
          height: 28,
          lineGap: 1.5,
        });

      currentY += obsBoxHeight + 5;

      // -----------------------------------------------------------------------
      // Autenticidade & QR Code (Validation Footer Card)
      // -----------------------------------------------------------------------
      const qrBoxHeight = 78;
      doc
        .roundedRect(startX, currentY, pageWidth, qrBoxHeight, 4)
        .fillAndStroke(BG_CARD, BORDER_LIGHT);

      const qrSize = 64;
      doc.image(qrPng, startX + 10, currentY + 7, { width: qrSize, height: qrSize });

      const qrTextX = startX + qrSize + 20;
      const qrTextWidth = pageWidth - qrSize - 30;

      doc
        .fillColor(BRAND_NAVY)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("CONSULTA PÚBLICA E VALIDAÇÃO DE AUTENTICIDADE", qrTextX, currentY + 9);

      doc
        .fillColor(TEXT_DARK)
        .font("Helvetica")
        .fontSize(7)
        .text(
          "Aponte a câmera do celular para o QR Code ao lado ou acesse o Portal Nacional da NFS-e para verificar a autenticidade e validade jurídica deste documento fiscal diretamente na base da Receita Federal:",
          qrTextX,
          currentY + 20,
          { width: qrTextWidth, lineGap: 1.5 },
        );

      doc
        .fillColor(BRAND_PRIMARY)
        .font("Helvetica-Bold")
        .fontSize(7)
        .text(urlConsulta, qrTextX, currentY + 41, {
          width: qrTextWidth,
          link: urlConsulta,
          underline: true,
        });

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica")
        .fontSize(6)
        .text(
          `Processado pela Receita Federal em: ${formatDate(inf.dhProc)} • Versão da Aplicação: ${inf.verAplic || "1.0"}`,
          qrTextX,
          currentY + 56,
        );

      currentY += qrBoxHeight + 8;

      // -----------------------------------------------------------------------
      // Footer Credits
      // -----------------------------------------------------------------------
      doc
        .moveTo(startX, currentY)
        .lineTo(startX + pageWidth, currentY)
        .strokeColor(BORDER_LIGHT)
        .lineWidth(0.5)
        .stroke();

      currentY += 4;
      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica")
        .fontSize(6)
        .text(
          "Emitido via Facila ERP (facila.com.br) • Sistema Integrado com o Ambiente de Dados Nacional da NFS-e",
          startX,
          currentY,
          { width: pageWidth, align: "center" },
        );

      doc.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
