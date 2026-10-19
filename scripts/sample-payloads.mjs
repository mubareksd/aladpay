import { buildPayload, BANKS, crc16CcittFalse } from "../src/lib/ethiopian-bank-qr.ts";

function verifyCrc(payload) {
  const crcTag = payload.slice(-8, -4);
  if (crcTag !== "6304") throw new Error("missing CRC tag");
  const body = payload.slice(0, -4);
  const expected = payload.slice(-4);
  const calc = crc16CcittFalse(new TextEncoder().encode(body))
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return { ok: expected === calc, expected, calc };
}

const cases = [
  ["ABYSETAA", "146105677"],
  ["DASHETAA", "2912870039711"],
  ["AWINETAA", "014251309710700"],
];

for (const [bic, account] of cases) {
  const bank = BANKS.find((b) => b.bic === bic);
  const ips = await buildPayload({
    bank,
    account,
    name: "TEST MERCHANT",
    encoding: "ips",
  });
  const legacy = await buildPayload({
    bank,
    account,
    name: "TEST MERCHANT",
    encoding: "legacy",
  });
  console.log(`\n${bank.name} (${account})`);
  console.log("IPS CRC", verifyCrc(ips));
  console.log("IPS", ips);
  console.log("legacy", legacy);
}
