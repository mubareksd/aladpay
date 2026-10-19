/** Verifies CRC-16/CCITT-FALSE against the NBE annexure A sample payload. */
function crc16CcittFalse(data) {
  let crc = 0xffff;
  for (const byte of data) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
      else crc = (crc << 1) & 0xffff;
    }
  }
  return crc;
}

const body =
  "00020101021202164000123456789012041653451234567890121516634512345678901228760032581b314e257f41bfbbdc6384daa31d160108CBETETAA021600001712345678905204599953035865802ET5924TewodrosSpices&Grains6010ADDISABABA62890117234567854321234560211032400000000324Tewodros Spices & Grains051312387654321230712456789098765";
const crc = crc16CcittFalse(new TextEncoder().encode(body + "6304"));
const hex = crc.toString(16).toUpperCase().padStart(4, "0");
if (hex !== "5376") {
  console.error(`CRC mismatch: expected 5376, got ${hex}`);
  process.exit(1);
}
console.log("NBE sample CRC OK:", hex);
