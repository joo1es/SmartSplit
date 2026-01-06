export interface ProcessedImage {
  id: string;
  file: File;
  originalUrl: string;
  width: number;
  height: number;
  splitPoints: number[]; // Y-coordinates of cut lines
  segments: ImageSegment[]; // The resulting blobs
  status: 'idle' | 'analyzing' | 'done' | 'error';
}

export interface ImageSegment {
  id: string;
  blob: Blob;
  url: string;
  height: number;
  selected: boolean;
}

export interface AppSettings {
  sensitivity: number; // 1-100
  fastMode: boolean; // Downscale for calculation
  minSegmentHeight: number; // Minimum pixel height to consider a valid segment
  splitGap: number; // Height of pixels to discard at split point (padding)
}
