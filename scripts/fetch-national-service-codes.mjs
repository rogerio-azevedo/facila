import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(__dirname, "data", "national-service-codes.json");
const previousPath = outputPath;
const sourceUrl =
  "https://www.gov.br/nfse/pt-br/mei-e-demais-empresas/codigos-de-tributacao-nacional-nbs";

const response = await fetch(sourceUrl);

if (!response.ok) {
  throw new Error(`Gov.br fetch error: ${response.status} ${response.statusText}`);
}

const html = await response.text();
const pattern = /(\d{6})\s*-\s*([^<\n]+)/g;
const byCode = new Map();

for (const match of html.matchAll(pattern)) {
  const code = match[1];
  const description = match[2].replace(/\s+/g, " ").trim().replace(/\.$/, "");
  if (code.length === 6 && description.length > 0) {
    byCode.set(code, description);
  }
}

let previousNbsByCode = new Map();

if (fs.existsSync(previousPath)) {
  const previous = JSON.parse(fs.readFileSync(previousPath, "utf8"));
  previousNbsByCode = new Map(
    previous.filter((item) => item.nbsCode).map((item) => [item.code, item.nbsCode]),
  );
}

function deriveNbsCode(code) {
  const item = code.slice(0, 2);
  const subitem = code.slice(2, 4);

  if (item === "01") {
    return `1.15${subitem}.00.00`;
  }

  return `${parseInt(item, 10)}.${subitem}.00.00`;
}

const items = [...byCode.entries()]
  .map(([code, description]) => ({
    code,
    description,
    nbsCode: previousNbsByCode.get(code) ?? deriveNbsCode(code),
  }))
  .toSorted((a, b) => a.code.localeCompare(b.code));

fs.writeFileSync(outputPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
console.log(`Saved ${items.length} national service codes to ${outputPath}`);
