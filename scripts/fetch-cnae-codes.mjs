import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(__dirname, "data", "cnae-codes.json");
const apiUrl = "https://servicodados.ibge.gov.br/api/v2/cnae/subclasses";

const response = await fetch(apiUrl);

if (!response.ok) {
  throw new Error(`IBGE API error: ${response.status} ${response.statusText}`);
}

const data = await response.json();

const items = data
  .map((item) => ({
    code: String(item.id).replace(/\D/g, ""),
    description: String(item.descricao ?? "").trim(),
  }))
  .filter((item) => item.code.length === 7 && item.description.length > 0)
  .toSorted((a, b) => a.code.localeCompare(b.code));

fs.writeFileSync(outputPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
console.log(`Saved ${items.length} CNAE subclasses to ${outputPath}`);
