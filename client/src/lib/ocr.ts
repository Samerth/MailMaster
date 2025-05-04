import Tesseract from 'tesseract.js';

export interface OCRResult {
  trackingNumber?: string;
  carrier?: string;
  recipient?: string;
  success: boolean;
  error?: string;
  text: string;
}

/**
 * Extract tracking information from image using OCR
 */
export async function extractTrackingInfo(imageFile: File): Promise<OCRResult> {
  try {
    const result = await Tesseract.recognize(
      imageFile,
      'eng',
      { 
        logger: m => console.log(m)
      }
    );
    
    const text = result.data.text;
    
    // Extract tracking number using regex patterns for common carriers
    const trackingData = extractDataFromText(text);
    
    return {
      ...trackingData,
      success: true,
      text
    };
  } catch (error) {
    console.error('OCR Error:', error);
    return {
      success: false,
      error: 'Failed to process image',
      text: ''
    };
  }
}

/**
 * Extract structured data from OCR text
 */
function extractDataFromText(text: string): { trackingNumber?: string, carrier?: string, recipient?: string } {
  const result: { trackingNumber?: string, carrier?: string, recipient?: string } = {};
  
  // Identify carrier
  const carrierPatterns = {
    ups: /\b(ups|united parcel service)\b/i,
    fedex: /\b(fedex|federal express)\b/i,
    usps: /\b(usps|united states postal service|postal service)\b/i,
    dhl: /\b(dhl)\b/i,
    amazon: /\b(amazon|amzn)\b/i
  };
  
  for (const [carrier, pattern] of Object.entries(carrierPatterns)) {
    if (pattern.test(text)) {
      result.carrier = carrier;
      break;
    }
  }
  
  // Extract tracking numbers based on carrier formats
  const trackingPatterns = {
    // UPS: 1Z9999999999999999
    ups: /\b(1Z ?[0-9A-Z]{3} ?[0-9A-Z]{3} ?[0-9A-Z]{2} ?[0-9A-Z]{4} ?[0-9A-Z]{3} ?[0-9A-Z]|T\d{3} ?\d{4} ?\d{3})\b/i,
    
    // FedEx: 9999 9999 9999, 999999999999
    fedex: /\b(\d{4} ?\d{4} ?\d{4}|\d{12,14})\b/,
    
    // USPS: 9400 1000 0000 0000 0000 00, 9205 5000 0000 0000 0000 00
    usps: /\b(9[0-9]{15,21}|9[0-9]{3} ?[0-9]{4} ?[0-9]{4} ?[0-9]{4} ?[0-9]{4} ?[0-9]{2})\b/,
    
    // DHL: 9999 9999 999
    dhl: /\b(\d{4} ?\d{4} ?\d{3})\b/,
    
    // Generic
    generic: /\b([A-Z0-9]{10,30})\b/i
  };
  
  // Try carrier-specific pattern first if identified
  if (result.carrier && trackingPatterns[result.carrier as keyof typeof trackingPatterns]) {
    const match = text.match(trackingPatterns[result.carrier as keyof typeof trackingPatterns]);
    if (match) {
      result.trackingNumber = match[0].replace(/\s+/g, '');
    }
  }
  
  // If no tracking number found yet, try generic patterns
  if (!result.trackingNumber) {
    for (const pattern of Object.values(trackingPatterns)) {
      const match = text.match(pattern);
      if (match) {
        result.trackingNumber = match[0].replace(/\s+/g, '');
        break;
      }
    }
  }
  
  // Try to extract recipient name (common formats like "To: John Smith" or "Recipient: John Smith")
  const recipientMatch = text.match(/(?:to|recipient|deliver to|attention):\s*([A-Za-z\s]{2,40})/i);
  if (recipientMatch && recipientMatch[1]) {
    result.recipient = recipientMatch[1].trim();
  }
  
  return result;
}
