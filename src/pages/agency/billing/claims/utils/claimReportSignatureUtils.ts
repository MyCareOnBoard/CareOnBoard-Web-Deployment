import type { ClaimSignaturePayload } from "../data/mockClaimReportData";

const INK_ALPHA_THRESHOLD = 10;
const CROP_PADDING_PX = 8;
const TYPED_SIGNATURE_FONT = '"Brush Script MT", cursive';
const TYPED_SIGNATURE_COLOR = "#4a4a4a";
const TYPED_SIGNATURE_HORIZONTAL_PADDING = 16;

type ContentBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

let typedSignatureFontReady: Promise<void> | null = null;

function ensureTypedSignatureFont(fontSize: number): Promise<void> {
  if (!typedSignatureFontReady) {
    typedSignatureFontReady = document.fonts
      .load(`${fontSize}px ${TYPED_SIGNATURE_FONT}`)
      .then(() => undefined)
      .catch(() => undefined);
  }
  return typedSignatureFontReady;
}

async function renderTypedSignatureToPng(
  text: string,
  maxWidth = 400
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  await ensureTypedSignatureFont(36);

  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");
  if (!measureContext) {
    return "";
  }

  let fontSize = 36;
  measureContext.font = `${fontSize}px ${TYPED_SIGNATURE_FONT}`;

  while (fontSize > 12 && measureContext.measureText(trimmed).width > maxWidth) {
    fontSize -= 1;
    measureContext.font = `${fontSize}px ${TYPED_SIGNATURE_FONT}`;
  }

  const textWidth = measureContext.measureText(trimmed).width;
  const canvasWidth = Math.ceil(textWidth + TYPED_SIGNATURE_HORIZONTAL_PADDING);
  const canvasHeight = Math.ceil(fontSize * 1.2);

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    return "";
  }

  context.font = `${fontSize}px ${TYPED_SIGNATURE_FONT}`;
  context.fillStyle = TYPED_SIGNATURE_COLOR;
  context.textBaseline = "alphabetic";
  context.fillText(trimmed, TYPED_SIGNATURE_HORIZONTAL_PADDING / 2, fontSize);

  return canvas.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function getImageContentBounds(
  imageData: ImageData,
  alphaThreshold = INK_ALPHA_THRESHOLD
): ContentBounds | null {
  const { data, width, height } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha <= alphaThreshold) continue;

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

function cropAndScaleImageDataUrl(
  image: HTMLImageElement,
  maxWidth: number
): string | null {
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = image.width;
  sourceCanvas.height = image.height;

  const sourceContext = sourceCanvas.getContext("2d");
  if (!sourceContext) {
    return null;
  }

  sourceContext.drawImage(image, 0, 0);

  const bounds = getImageContentBounds(
    sourceContext.getImageData(0, 0, image.width, image.height)
  );
  if (!bounds) {
    return null;
  }

  const cropX = Math.max(0, bounds.minX - CROP_PADDING_PX);
  const cropY = Math.max(0, bounds.minY - CROP_PADDING_PX);
  const cropRight = Math.min(image.width - 1, bounds.maxX + CROP_PADDING_PX);
  const cropBottom = Math.min(image.height - 1, bounds.maxY + CROP_PADDING_PX);
  const cropWidth = cropRight - cropX + 1;
  const cropHeight = cropBottom - cropY + 1;

  const scale = cropWidth > maxWidth ? maxWidth / cropWidth : 1;
  const outputWidth = Math.max(1, Math.round(cropWidth * scale));
  const outputHeight = Math.max(1, Math.round(cropHeight * scale));

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;

  const outputContext = outputCanvas.getContext("2d");
  if (!outputContext) {
    return null;
  }

  outputContext.drawImage(
    sourceCanvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return outputCanvas.toDataURL("image/png");
}

export async function normalizeSignaturePayload(
  payload: ClaimSignaturePayload,
  maxWidth = 400
): Promise<ClaimSignaturePayload> {
  if (payload.signatureType === "type") {
    if (payload.signatureData.startsWith("data:image")) {
      return payload;
    }

    const png = await renderTypedSignatureToPng(payload.signatureData, maxWidth);
    if (!png) {
      return payload;
    }

    return {
      signatureType: "type",
      signatureData: png,
    };
  }

  try {
    const image = await loadImage(payload.signatureData);
    const normalizedDataUrl = cropAndScaleImageDataUrl(image, maxWidth);

    if (!normalizedDataUrl) {
      return payload;
    }

    return {
      signatureType: payload.signatureType,
      signatureData: normalizedDataUrl,
    };
  } catch {
    return payload;
  }
}
