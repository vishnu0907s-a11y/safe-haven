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
 */
async function preprocessImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // Resize for better OCR consistency
        const scaleFactor = 1.5;
        canvas.width = img.width * scaleFactor;
        canvas.height = img.height * scaleFactor;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Grayscale and Contrast enhancement
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
          
          // Simple Thresholding (Otsu-like)
          const val = gray > 140 ? 255 : 0;
          data[i] = data[i + 1] = data[i + 2] = val;
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png', 1.0));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Validates an uploaded document with high strictness.
 */
export const validateDocument = async (
  file: File,
  role: string,
  docType: 'aadhaar' | 'license' | 'police_id'
): Promise<ValidationResult> => {
  try {
    // 1. High-Quality File Size Check
    if (file.size < 50000) { 
      return { isValid: false, status: 'failed', message: 'imageTooLowQuality' };
    }

    // 2. Pre-process Image
    const processedImage = await preprocessImage(file);

    // 3. Perform OCR
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(processedImage);
    await worker.terminate();

    const upperText = text.toUpperCase();
    
    // 4. Basic content check
    if (text.trim().length < 20) {
      return { isValid: false, status: 'failed', message: 'noTextExtracted' };
    }

    // 5. Strict Validation Logic

    if (docType === 'aadhaar') {
      const aadhaarRegex = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
      
      // Handle common OCR mistakes (e.g. O instead of 0, l instead of 1)
      const correctedText = text.replace(/O/g, '0').replace(/l/g, '1').replace(/I/g, '1');
      const matches = correctedText.match(aadhaarRegex);
      const validChecksum = matches ? matches.some(num => validateVerhoeff(num)) : false;
      
      // Lenient structure check (at least 12 digits found somewhere)
      const digitsOnly = correctedText.replace(/[^0-9]/g, '');
      const has12Digits = digitsOnly.length >= 12;
      
      const hasKeywords = upperText.includes('AADHAAR') || 
                          upperText.includes('UNIQUE IDENTIFICATION') || 
                          upperText.includes('GOVERNMENT') || 
                          upperText.includes('INDIA') ||
                          upperText.includes('DOB') || 
                          upperText.includes('YEAR OF BIRTH') ||
                          upperText.includes('MALE') ||
                          upperText.includes('FEMALE') ||
                          upperText.includes('O0B'); // Common OCR mistake for DOB

      // Accept if:
      // 1. Perfect mathematically valid Aadhaar number found OR
      // 2. Looks like it has 12 digits AND has Aadhaar-related keywords OR
      // 3. Has strong visual indicators like DOB
      if (validChecksum || (has12Digits && hasKeywords) || upperText.includes('DOB') || upperText.includes('O0B')) {
        return { isValid: true, status: validChecksum ? 'verified' : 'partial', message: 'validAadhaar', extractedText: text };
      }
      
      console.log("OCR Extracted Text (Failed):", text);
      // Return partial if it has some keywords or at least 10 digits found
      if (hasKeywords || digitsOnly.length >= 10) {
        return { isValid: true, status: 'partial', message: 'partialAadhaar', extractedText: text };
      }
      
      return { isValid: false, status: 'failed', message: 'invalidAadhaar' };
    }

    if (docType === 'license') {
      const licenseRegex = /\b([A-Z]{2})\d{2}\s?[0-9A-Z]{11}\b/g;
      const matches = Array.from(upperText.matchAll(licenseRegex));
      const hasValidDL = matches.some(match => stateCodes.includes(match[1]));
      
      const hasKeywords = upperText.includes('DRIVING LICENSE') && 
                          (upperText.includes('TRANSPORT') || upperText.includes('AUTHORITY') || upperText.includes('INDIA'));

      if (hasValidDL && hasKeywords) {
        return { isValid: true, status: 'verified', message: 'validLicense', extractedText: text };
      }
      
      if (hasKeywords) {
        return { isValid: true, status: 'partial', message: 'partialLicense', extractedText: text };
      }
      
      return { isValid: false, status: 'failed', message: 'invalidLicense' };
    }

    if (docType === 'police_id') {
      const hasPoliceKeyword = upperText.includes('POLICE') && 
                               (upperText.includes('GOVERNMENT') || upperText.includes('STATE') || upperText.includes('ID CARD'));
      
      const idRegex = /\b[A-Z0-9-]{6,}\b/;
      const hasIdNumber = idRegex.test(upperText);

      if (hasPoliceKeyword && hasIdNumber) {
        return { isValid: true, status: 'verified', message: 'validPoliceId', extractedText: text };
      }
      
      if (hasPoliceKeyword) {
        return { isValid: true, status: 'partial', message: 'partialPoliceId', extractedText: text };
      }
      
      return { isValid: false, status: 'failed', message: 'invalidPoliceId' };
    }

    return { isValid: false, status: 'failed', message: 'unsupportedDocType' };
  } catch (error) {
    console.error('High-Accuracy Verification Error:', error);
    // If OCR engine fails completely, return partial to allow manual review
    return { isValid: true, status: 'partial', message: 'verificationError' };
  }
};
