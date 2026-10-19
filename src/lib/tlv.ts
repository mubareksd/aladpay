export function tlv(tag: string, value: string): string {
  if (tag.length !== 2 || !/^\d{2}$/.test(tag)) {
    throw new Error(`Invalid TLV tag: ${JSON.stringify(tag)}`);
  }
  const length = value.length;
  if (length > 999) {
    throw new Error(`Value for tag ${tag} is too long (${length} characters)`);
  }
  if (length > 99) {
    if (tag !== "62") {
      throw new Error(`Value for tag ${tag} is too long (${length} characters)`);
    }
    return `${tag}${length.toString().padStart(3, "0")}${value}`;
  }
  return `${tag}${length.toString().padStart(2, "0")}${value}`;
}

/** Yaya app QRs often declare tag 62 length as 12 while including the full block (lenient readers). */
export function tlvTag62YayaAppCompat(inner: string): string {
  return `6212${inner}`;
}

export function wrapTag62(
  inner: string,
  options?: { yayaAppCompat?: boolean },
): string {
  if (options?.yayaAppCompat) return tlvTag62YayaAppCompat(inner);
  return tlv("62", inner);
}

export function crc16CcittFalse(data: Uint8Array): number {
  let crc = 0xffff;
  for (const byte of data) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc;
}
