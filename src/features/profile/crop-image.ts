export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', () => reject(new Error('No se pudo leer la imagen')));
    img.src = url;
  });
}

/**
 * Recorta la imagen al área indicada (en píxeles) y la devuelve como un cuadrado
 * JPEG en base64 (sin el prefijo data:), listo para subir a Cloudinary.
 */
export async function getCroppedImage(
  imageSrc: string,
  area: Area,
  size = 512,
): Promise<{ imageData: string; mimeType: string }> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');

  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size, size);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  const base64 = dataUrl.split(',')[1] ?? '';
  return { imageData: base64, mimeType: 'image/jpeg' };
}
