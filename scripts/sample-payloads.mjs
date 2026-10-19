import { buildPayload, BANKS, verifyPayloadCrc } from "../src/lib/ethiopian-bank-qr.ts";

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
  console.log("IPS CRC", verifyPayloadCrc(ips));
  console.log("IPS", ips);
  console.log("legacy", legacy);
}

const cbe = BANKS.find((b) => b.bic === "CBEBETAA");
const cbePayload = await buildPayload({
  bank: cbe,
  account: "251938158214",
  name: "elias weldu rezakum",
  city: "ADDIS ABABA",
  remark: "description",
  encoding: "ips",
});
console.log("\nCBE Birr CRC", verifyPayloadCrc(cbePayload));

const yaya = BANKS.find((b) => b.bic === "YAYAETAA");
const yayaPayload = await buildPayload({
  bank: yaya,
  account: "0949909116",
  name: "Mengstab Ketemaw Abitew",
  city: "Woreda 06, Bole, Addis Ababa",
  amount: "10.24",
  yayaUsername: "mengstabkete",
  merchantGuid: "b34762cf0348408bb8710c043a463f29",
  yayaRequestId: "687945bda-5a57-4543-9057-d7d461626a88",
  yayaReferenceToken: "8863D452AA03",
  encoding: "ips",
});
console.log("Yaya CRC", verifyPayloadCrc(yayaPayload));
console.log("Yaya", yayaPayload);
