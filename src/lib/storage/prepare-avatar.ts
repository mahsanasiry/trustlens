import { avatarEdge } from './avatar';

function encode(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function drawSquare(
  bitmap: ImageBitmap,
  edge: number,
  background: string | null,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = edge;
  canvas.height = edge;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available.');

  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, edge, edge);
  }
  // A centred square: avatars are shown round, so the edges are not needed.
  const side = Math.min(bitmap.width, bitmap.height);
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    edge,
    edge,
  );
  return canvas;
}

// Crops to a square and scales down, so a multi-megabyte photo becomes a file of
// a few dozen kilobytes. WebP keeps transparency; browsers that cannot write it
// get a JPEG on white instead.
export async function prepareAvatar(file: File): Promise<File> {
  // "from-image" applies the camera's rotation, so portrait photos stay upright.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const edge = Math.min(avatarEdge, bitmap.width, bitmap.height);

    const webp = await encode(drawSquare(bitmap, edge, null), 'image/webp', 0.88);
    if (webp?.type === 'image/webp')
      return new File([webp], 'avatar.webp', { type: 'image/webp' });

    const jpeg = await encode(drawSquare(bitmap, edge, '#ffffff'), 'image/jpeg', 0.9);
    if (jpeg?.type === 'image/jpeg')
      return new File([jpeg], 'avatar.jpg', { type: 'image/jpeg' });

    throw new Error('The picture could not be encoded.');
  } finally {
    bitmap.close();
  }
}
