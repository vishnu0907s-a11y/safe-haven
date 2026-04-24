import { createWorker } from 'tesseract.js';

// Verhoeff Algorithm for Aadhaar Checksum Validation
const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];
const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

/**
 * Validates 12-digit Aadhaar number using Verhoeff algorithm.
 */
function validateVerhoeff(array: string) {
  let c = 0;
  const invertedArray = array.replace(/\s/g, '').split('').map(Number).reverse();
  for (let i = 0; i < invertedArray.length; i++) {
    c = d[c][p[i % 8][invertedArray[i]]];
  }
  return c === 0;
}

const stateCodes = ["AN", "AP", "AR", "AS", "BR", "CH", "CT", "DN", "DD", "DL", "GA", "GJ", "HR", "HP", "JK", "JH", "KA", "KL", "LA", "LD", "MP", "MH", "MN", "ML", "MZ", "NL", "OR", "PY", "PB", "RJ", "SK", "TN", "TG", "TR", "UP", "UT", "WB"];

export type ValidationResult = {
  isValid: boolean;
  status: 'verified' | 'partial' | 'failed' | 'error';
  message: string;
  extractedText?: string;
};

/**
 * Pre-processes the image using Canvas API to improve OCR accuracy.
 * Handles upscaling, sharpening, and contrast enhancement.
 */
async function preprocessImage(file: File): Promise<{ dataUrl: string, width: number, height: number }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        
        // 1. Smart Upscaling: Ensure minimum width of 400px for OCR accuracy
        let targetWidth = img.width;
        let targetHeight = img.height;
        const minWidth = 400;
        
        if (targetWidth < minWidth) {
          const ratio = minWidth / targetWidth;
          targetWidth = minWidth;
          targetHeight = img.height * ratio;
        }
        
        // Multi-stage scaling for better quality
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        // 2. High Quality Scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // 3. Image Enhancement Filters
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Grayscale + Contrast Boost
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          let gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
          
          // Contrast stretch
          gray = (gray - 128) * 1.2 + 128;
          const val = gray > 255 ? 255 : (gray < 0 ? 0 : gray);
          
          data[i] = data[i + 1] = data[i + 2] = val;
        }
        ctx.putImageData(imageData, 0, 0);
        
        // 4. Simple Sharpening Filter (Convolution)
        const weights = [0, -1, 0, -1, 5, -1, 0, -1, 0];
        const side = Math.round(Math.sqrt(weights.length));
        const halfSide = Math.floor(side / 2);
        const src = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const sw = canvas.width;
        const sh = canvas.height;
        const output = ctx.createImageData(sw, sh);
        const dst = output.data;
        
        for (let y = 0; y < sh; y++) {
          for (let x = 0; x < sw; x++) {
            const sy = y;
            const sx = x;
            const dstOff = (y * sw + x) * 4;
            let r = 0, g = 0, b = 0;
            for (let cy = 0; cy < side; cy++) {
              for (let cx = 0; cx < side; cx++) {
                const scy = sy + cy - halfSide;
                const scx = sx + cx - halfSide;
                if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                  const srcOff = (scy * sw + scx) * 4;
                  const wt = weights[cy * side + cx];
                  r += src[srcOff] * wt;
                  g += src[srcOff + 1] * wt;
                  b += src[srcOff + 2] * wt;
                }
              }
            }
            dst[dstOff] = r;
            dst[dstOff + 1] = g;
            dst[dstOff + 2] = b;
            dst[dstOff + 3] = 255;
          }
        }
        ctx.putImageData(output, 0, 0);

        resolve({ 
          dataUrl: canvas.toDataURL('image/png', 1.0),
          width: canvas.width,
          height: canvas.height
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Validates an uploaded document using smart OCR.
 */
export const validateDocument = async (
  file: File,
  role: string,
  docType: 'aadhaar' | 'license' | 'police_id'
): Promise<ValidationResult & { confidence?: number }> => {
  try {
    // 1. Basic size check
    if (file.size < 2000) { 
      return { isValid: false, status: 'failed', message: 'File too small' };
    }

    // 2. Pre-process Image (Upscale + Sharpen)
    const { dataUrl } = await preprocessImage(file);

    // 3. Perform OCR
    const worker = await createWorker('eng');
    const result = await worker.recognize(dataUrl);
    const { text, confidence } = result.data;
    await worker.terminate();

    const upperText = text.toUpperCase();
    const digitsOnly = text.replace(/[^0-9]/g, '');
    
    // 4. Pattern Detection
    const has12Digits = /\b\d{4}\s?\d{4}\s?\d{4}\b/.test(text.replace(/O/g, '0'));
    const hasKeywords = upperText.includes('NAME') || 
                        upperText.includes('ID') || 
                        upperText.includes('DOB') || 
                        upperText.includes('GOVERNMENT') ||
                        upperText.includes('INDIA');
    
    // 5. Confidence-Based Decision System
    let status: ValidationResult['status'] = 'failed';
    let isValid = false;
    let message = 'Verification failed';

    if (confidence >= 75) {
      if (hasKeywords || text.length > 30) {
        status = 'verified';
        isValid = true;
        message = 'Document automatically verified';
      } else {
        status = 'partial';
        isValid = true;
        message = 'Valid text found, but keywords missing';
      }
    } else if (confidence >= 40) {
      status = 'partial';
      isValid = true;
      message = 'Confidence low, sent for manual review';
    } else {
      // Very low confidence, but check for critical patterns
      if (has12Digits || (hasKeywords && digitsOnly.length >= 8)) {
        status = 'partial';
        isValid = true;
        message = 'Unclear image, but valid patterns detected';
      } else {
        status = 'failed';
        isValid = false;
        message = 'Image too blurry or not a valid document';
      }
    }

    return { 
      isValid, 
      status, 
      message, 
      extractedText: text,
      confidence 
    };
  } catch (error) {
    console.error('Smart OCR Error:', error);
    return { isValid: true, status: 'partial', message: 'Processing error, manual review needed' };
  }
};
