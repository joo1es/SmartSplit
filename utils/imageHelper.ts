import { AppSettings, ProcessedImage, ImageSegment } from '../types';

// Helper to create a unique ID
export const uuid = () => Math.random().toString(36).substring(2, 9);

/**
 * Loads an image file into an HTMLImageElement
 */
export const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * The core algorithm to detect split points based on row variance/difference.
 */
export const detectSplitPoints = (
  img: HTMLImageElement,
  settings: AppSettings
): number[] => {
  const { width, height } = img;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) return [];

  // 1. Optimization: Resize logic
  // If fastMode is on, we analyze a smaller version of the image to save CPU cycles.
  // We strictly reduce width to a manageable size (e.g., 200px) but keep aspect ratio.
  const analyzeWidth = settings.fastMode ? 200 : width;
  const scaleFactor = width / analyzeWidth;
  const analyzeHeight = Math.floor(height / scaleFactor);

  canvas.width = analyzeWidth;
  canvas.height = analyzeHeight;

  // Draw image to canvas (potentially downscaled)
  ctx.drawImage(img, 0, 0, analyzeWidth, analyzeHeight);

  const imageData = ctx.getImageData(0, 0, analyzeWidth, analyzeHeight);
  const data = imageData.data;

  const rowScores: number[] = [];
  
  // 2. Algorithm: Row-to-Row Difference (Gradient)
  // We calculate the sum of absolute differences between pixel(x, y) and pixel(x, y-1).
  // A high difference indicates a horizontal line or a sharp content break.
  
  for (let y = 1; y < analyzeHeight; y++) {
    let rowDiffSum = 0;
    
    // Stride optimization: Don't check every single pixel x, checking every 2nd or 4th is enough for textures
    const xStep = 2; 

    for (let x = 0; x < analyzeWidth; x += xStep) {
      const i = (y * analyzeWidth + x) * 4;
      const prevI = ((y - 1) * analyzeWidth + x) * 4;

      // Simple RGB Euclidean distance or Manhattan distance
      const rDiff = Math.abs(data[i] - data[prevI]);
      const gDiff = Math.abs(data[i + 1] - data[prevI + 1]);
      const bDiff = Math.abs(data[i + 2] - data[prevI + 2]);

      rowDiffSum += (rDiff + gDiff + bDiff);
    }
    
    // Normalize by width
    rowScores.push(rowDiffSum / (analyzeWidth / xStep));
  }

  // 3. Thresholding based on Sensitivity
  // Sensitivity 0-100. 
  // High Sensitivity = Low Threshold (detects more cuts).
  // Low Sensitivity = High Threshold (detects only obvious cuts).
  
  // Calculate average score to establish a baseline
  const avgScore = rowScores.reduce((a, b) => a + b, 0) / rowScores.length;
  
  // Invert sensitivity: 100 -> low multiplier, 0 -> high multiplier
  // Base threshold is related to the average "noise" of the image.
  const sensitivityFactor = (101 - settings.sensitivity) / 20; // 0.05 to 5.0
  const threshold = avgScore * (1 + sensitivityFactor); 

  const foundPoints: number[] = [];
  let lastCutY = 0;

  // Minimum distance between cuts (scaled)
  const minDist = settings.minSegmentHeight / scaleFactor;

  for (let y = 0; y < rowScores.length; y++) {
    if (rowScores[y] > threshold) {
      // Valid cut candidate
      if (y - lastCutY > minDist) {
        foundPoints.push(Math.floor(y * scaleFactor));
        lastCutY = y;
        
        // Skip ahead to avoid double-cutting on thick lines
        y += Math.floor(10 / scaleFactor); 
      }
    }
  }

  return foundPoints;
};

/**
 * Slice the original image into blobs based on cut points.
 * @param gap - Total pixels to discard around each split point
 */
export const sliceImage = async (
  img: HTMLImageElement,
  splitPoints: number[],
  gap: number = 0
): Promise<ImageSegment[]> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return [];

  canvas.width = img.width;
  
  // Sort points
  const sortedPoints = [...splitPoints].sort((a, b) => a - b);
  const segments: ImageSegment[] = [];

  const halfGap = gap / 2;
  let currentY = 0;

  for (let i = 0; i <= sortedPoints.length; i++) {
    const isLast = i === sortedPoints.length;
    
    // The central point of the cut (or bottom of image)
    const cutY = isLast ? img.height : sortedPoints[i];
    
    // Calculate the slice boundaries
    // If it's the last segment, it goes to the bottom of the image (no gap at bottom)
    // Otherwise, it stops halfGap before the cutY
    const endY = isLast ? img.height : Math.floor(cutY - halfGap);
    
    // The height of this slice
    const h = endY - currentY;
    
    if (h > 0) {
      canvas.height = h;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw slice
      // We draw from source Y = currentY
      ctx.drawImage(img, 0, -currentY, img.width, img.height);

      const blob = await new Promise<Blob | null>((resolve) => 
        canvas.toBlob(resolve, 'image/jpeg', 0.95)
      );

      if (blob) {
        segments.push({
          id: uuid(),
          blob,
          url: URL.createObjectURL(blob),
          height: h,
          selected: true,
        });
      }
    }

    // Advance currentY for the next segment
    // Skip the gap area: start the next segment at cutY + halfGap
    if (!isLast) {
      currentY = Math.floor(cutY + halfGap);
    }
  }

  return segments;
};
