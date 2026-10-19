import jsQR from "jsqr";

export async function decodeQrPayloadFromImageFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not read image.");
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height);
    if (!result?.data?.trim()) {
      throw new Error("No QR code found in this image.");
    }
    return result.data.trim();
  } finally {
    bitmap.close();
  }
}
