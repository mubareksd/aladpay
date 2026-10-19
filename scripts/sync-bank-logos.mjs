/**
 * Copies bank logos into public/banks/{bic}.png
 *
 * Sources (community-maintained, verify with each bank before commercial use):
 * - FaydaLink: https://github.com/motiabebe/FaydaLink (src/img/logos/banks/)
 * - EthiopianLogos (MIT): https://github.com/Chapa-Et/ethiopianlogos
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "banks");
const faydaDir = path.join(root, ".tmp-faydalink", "src", "img", "logos", "banks");
const ethiopianDir = path.join(root, ".tmp-ethiopianlogos", "logos");

/** @type {Record<string, { fayda?: string, ethiopian?: { dir: string, file: string } }>} */
const SOURCES = {
  SSHCETAA: { fayda: "siket.png" },
  RMSIETAA: { fayda: "rammis.png" },
  SDMAETAA: { fayda: "sidama.png" },
  OSCOETAA: { fayda: "omo.png" },
  GDAAETAA: { fayda: "gadaa.png" },
  AMHRETAA: { fayda: "amhara.png", ethiopian: { dir: "amhara_bank", file: "amhara_bank.png" } },
  TSCPETAA: { fayda: "tsehay.png" },
  TSDYETAA: { fayda: "tsedey.png" },
  SINQETAA: { fayda: "siinqee.png" },
  AHUUETAA: { fayda: "ahadu.png" },
  HIJRETAA: { fayda: "hijra.png" },
  GOBTETAA: { fayda: "goh.png" },
  SBEEETAA: { fayda: "shabelle.png" },
  ZAMZETAA: { fayda: "zamzam.png" },
  DEGAETAA: { fayda: "global.png" },
  ENATETAA: { fayda: "enat.png" },
  ABSCETAA: { fayda: "addis.png" },
  ABAYETAA: { fayda: "abay.png" },
  BERHETAA: { fayda: "berhan.png" },
  BUNAETAA: { fayda: "bunna.png" },
  ZEMEETAA: { fayda: "zemen.png", ethiopian: { dir: "zemen_bank", file: "zemen_bank.png" } },
  ORIRETAA: { fayda: "oromia.png", ethiopian: { dir: "oromia_international_bank", file: "oromia_international_bank.png" } },
  LIBSETAA: { fayda: "anbesa.png" },
  CBORETAA: {
    fayda: "coop.png",
    ethiopian: { dir: "cooperative_bank_of_oromia", file: "Cooperative_Bank_of_Oromia.png" },
  },
  NIBIETAA: { fayda: "nib.png" },
  UNTDETAA: { fayda: "hibret.png", ethiopian: { dir: "hibret_bank", file: "hibret_bank.png" } },
  WEGAETAA: { fayda: "wegagen.png" },
  ABYSETAA: { fayda: "abyssinia.png", ethiopian: { dir: "bank_of_abyssinia", file: "bank_of_abyssinia.png" } },
  DASHETAA: { fayda: "dashen.png", ethiopian: { dir: "dashen_bank", file: "dashen_bank.png" } },
  AWINETAA: { fayda: "awash.png", ethiopian: { dir: "awash_international_bank", file: "awash_international_bank.png" } },
  CBETETAA: {
    fayda: "cbe.png",
    ethiopian: { dir: "commercial_bank_of_ethiopia", file: "commercial_bank_of_ethiopia.png" },
  },
  DEETETAA: { fayda: "dbe.png" },
};

function resolveSource(bic, source) {
  if (source.fayda) {
    const p = path.join(faydaDir, source.fayda);
    if (fs.existsSync(p)) return p;
  }
  if (source.ethiopian) {
    const p = path.join(ethiopianDir, source.ethiopian.dir, source.ethiopian.file);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function makeFallbackSvg(bic, name) {
  const initials =
    name
      .split(/\s+/)
      .filter((w) => w.length > 2 && !/^(bank|s\.c\.?|of|the|int\.?)$/i.test(w))
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || bic.slice(0, 2);
  const hue = [...bic].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="hsl(${hue} 45% 42%)"/>
  <text x="64" y="72" text-anchor="middle" font-family="system-ui,sans-serif" font-size="40" font-weight="700" fill="white">${initials}</text>
</svg>`;
}

const banks = JSON.parse(
  fs.readFileSync(path.join(root, "src", "data", "bank-logo-sources.json"), "utf8"),
);

fs.mkdirSync(outDir, { recursive: true });

/** @type {Record<string, string>} */
const manifest = {};
let copied = 0;
let fallback = 0;

for (const { bic, name } of banks) {
  const source = SOURCES[bic];
  const src = source ? resolveSource(bic, source) : null;
  const destPng = path.join(outDir, `${bic}.png`);

  if (src) {
    fs.copyFileSync(src, destPng);
    manifest[bic] = `/banks/${bic}.png`;
    copied++;
  } else {
    const destSvg = path.join(outDir, `${bic}.svg`);
    fs.writeFileSync(destSvg, makeFallbackSvg(bic, name));
    manifest[bic] = `/banks/${bic}.svg`;
    fallback++;
    console.warn(`No logo file for ${bic}, wrote fallback SVG`);
  }
}

fs.writeFileSync(
  path.join(root, "src", "data", "bank-logos.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);

console.log(`Synced ${copied} logos, ${fallback} fallbacks -> public/banks/`);
