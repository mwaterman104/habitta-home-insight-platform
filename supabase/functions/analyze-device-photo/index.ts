import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Brand recognition patterns
const BRAND_PATTERNS = {
  'whirlpool': /whirlpool/i,
  'ge': /\b(ge|general electric)\b/i,
  'frigidaire': /frigidaire/i,
  'samsung': /samsung/i,
  'lg': /\blg\b/i,
  'maytag': /maytag/i,
  'kitchenaid': /kitchenaid/i,
  'bosch': /bosch/i,
  'rheem': /rheem/i,
  'carrier': /carrier/i,
  'trane': /trane/i,
  'lennox': /lennox/i,
  'goodman': /goodman/i,
  'york': /york/i,
  'ruud': /ruud/i,
  'hayward': /hayward/i,
  'pentair': /pentair/i,
  'jandy': /jandy/i,
};

// Model number patterns
const MODEL_PATTERNS = [
  /model[:\s]*([A-Z0-9\-\.]+)/i,
  /mod[:\s]*([A-Z0-9\-\.]+)/i,
  /^([A-Z]{2,}\d{3,}[A-Z0-9\-]*)$/i,
  /\b([A-Z]\d{2,}[A-Z0-9\-]*)\b/i,
];

// Serial number patterns
const SERIAL_PATTERNS = [
  /serial[:\s]*([A-Z0-9]+)/i,
  /ser[:\s]*([A-Z0-9]+)/i,
  /s\/n[:\s]*([A-Z0-9]+)/i,
  /\b(\d{4}[A-Z]\d{6,})\b/i, // Common format: 2023A123456
  /\b([A-Z]{2}\d{8,})\b/i,    // Format: AB12345678
];

// System type display names
const SYSTEM_DISPLAY_NAMES: Record<string, string> = {
  hvac: 'HVAC',
  water_heater: 'Water Heater',
  appliance: 'Appliance',
  pool_equipment: 'Pool Equipment',
  electrical: 'Electrical Panel',
};

// Confidence state type
type ConfidenceState = 'high' | 'estimated' | 'needs_confirmation';

interface AnalysisResult {
  brand?: string;
  model?: string;
  serial?: string;
  system_type?: string;
  manufacture_year?: number;
  capacity_rating?: string;
  fuel_type?: string;
  confidence_scores: {
    brand?: number;
    model?: number;
    serial?: number;
    system_type?: number;
  };
  raw_ocr_text: string;
  // New fields for Habitta messaging
  visual_certainty: number;
  is_uncertain: boolean;
  habitta_message: string;
  habitta_detail?: string;
  confidence_state: ConfidenceState;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting device photo analysis...');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const formData = await req.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      throw new Error('No image file provided');
    }

    // Convert image to base64 for Google Vision API
    const imageBytes = await imageFile.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBytes)));

    console.log('Calling Google Vision API for OCR...');
    const visionResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${Deno.env.get('GOOGLE_VISION_API_KEY')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              { type: 'TEXT_DETECTION' }
            ]
          }
        ]
      })
    });

    if (!visionResponse.ok) {
      throw new Error(`Google Vision API error: ${visionResponse.statusText}`);
    }

    const visionData = await visionResponse.json();
    const textAnnotations = visionData.responses[0]?.textAnnotations;

    if (!textAnnotations || textAnnotations.length === 0) {
      throw new Error('No text detected in image');
    }

    const fullText = textAnnotations[0].description;
    console.log('OCR extracted text:', fullText);

    // Analyze extracted text
    const analysis = analyzeDeviceText(fullText);

    console.log('Analysis result:', analysis);

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error analyzing device photo:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to analyze device photo' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function analyzeDeviceText(text: string): AnalysisResult {
  const result: AnalysisResult = {
    confidence_scores: {},
    raw_ocr_text: text,
    visual_certainty: 0,
    is_uncertain: true,
    habitta_message: "I'm not totally sure what this is yet.",
    confidence_state: 'needs_confirmation',
  };

  // Extract brand
  for (const [brand, pattern] of Object.entries(BRAND_PATTERNS)) {
    if (pattern.test(text)) {
      result.brand = brand.charAt(0).toUpperCase() + brand.slice(1);
      result.confidence_scores.brand = 0.85;
      break;
    }
  }

  // Extract model number
  for (const pattern of MODEL_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].length >= 4) {
      result.model = match[1].toUpperCase();
      result.confidence_scores.model = 0.75;
      break;
    }
  }

  // Extract serial number
  for (const pattern of SERIAL_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].length >= 6) {
      result.serial = match[1].toUpperCase();
      result.confidence_scores.serial = 0.70;
      break;
    }
  }

  // Detect system type based on keywords
  const systemTypeKeywords = {
    'hvac': ['heat pump', 'air conditioner', 'furnace', 'hvac', 'compressor', 'condenser', 'evaporator'],
    'water_heater': ['water heater', 'hot water', 'tank', 'gallon', 'gal', 'thermostat'],
    'appliance': ['refrigerator', 'dishwasher', 'washer', 'dryer', 'oven', 'range', 'microwave'],
    'pool_equipment': ['pool', 'pump', 'filter', 'heater', 'chlorinator', 'spa'],
    'electrical': ['breaker', 'panel', 'electrical', 'voltage', 'amp', 'circuit'],
  };

  for (const [type, keywords] of Object.entries(systemTypeKeywords)) {
    if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
      result.system_type = type;
      result.confidence_scores.system_type = 0.65;
      break;
    }
  }

  // Extract capacity ratings
  const capacityPatterns = [
    /(\d+(?:\.\d+)?)\s*btu/i,
    /(\d+(?:\.\d+)?)\s*ton/i,
    /(\d+)\s*gal/i,
    /(\d+)\s*kw/i,
    /(\d+)\s*amp/i,
  ];

  for (const pattern of capacityPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.capacity_rating = match[0];
      break;
    }
  }

  // Detect fuel type
  if (/gas|natural gas|propane|lng/i.test(text)) {
    result.fuel_type = 'gas';
  } else if (/electric|electrical|120v|240v|volt/i.test(text)) {
    result.fuel_type = 'electric';
  } else if (/heat pump/i.test(text)) {
    result.fuel_type = 'heat_pump';
  }

  // Attempt to extract manufacture year from serial
  if (result.serial && result.brand) {
    const year = extractManufactureYear(result.serial, result.brand.toLowerCase());
    if (year) {
      result.manufacture_year = year;
    }
  }

  // =========================================================================
  // NEW: Compute visual certainty and Habitta messaging
  // =========================================================================
  
  // Calculate visual certainty (composite of all signals)
  result.visual_certainty = (
    (result.confidence_scores.brand ?? 0) * 0.25 +
    (result.confidence_scores.model ?? 0) * 0.25 +
    (result.confidence_scores.system_type ?? 0) * 0.35 +
    (result.confidence_scores.serial ? 0.15 : 0)
  );
  
  // Guardrail 2: Determine if uncertain (visual_certainty < 0.30 OR no system_type)
  result.is_uncertain = result.visual_certainty < 0.30 || !result.system_type;
  
  // Determine confidence state (Guardrail 1: high requires ≥0.75 for vision-only)
  if (result.visual_certainty >= 0.75) {
    result.confidence_state = 'high';
  } else if (result.visual_certainty >= 0.40) {
    result.confidence_state = 'estimated';
  } else {
    result.confidence_state = 'needs_confirmation';
  }
  
  // Generate Habitta-style messaging
  if (result.is_uncertain) {
    result.habitta_message = "I'm not totally sure what this is yet.";
    result.habitta_detail = undefined;
  } else {
    const systemName = SYSTEM_DISPLAY_NAMES[result.system_type || ''] || 'system';
    result.habitta_message = `This looks like a ${systemName}.`;
    
    // Add detail if we have supporting info
    if (result.manufacture_year) {
      result.habitta_detail = `Likely installed around ${result.manufacture_year}.`;
    } else if (result.brand) {
      result.habitta_detail = `${result.brand} brand detected.`;
    }
  }

  return result;
}

function extractManufactureYear(serial: string, brand: string): number | undefined {
  const currentYear = new Date().getFullYear();
  
  // Common patterns for different brands
  switch (brand) {
    case 'rheem':
    case 'ruud':
      // Rheem/Ruud format: First 4 digits are week/year (MMYY)
      if (serial.length >= 4) {
        const yearDigits = serial.substring(2, 4);
        let year = 2000 + parseInt(yearDigits);
        if (year > currentYear) year -= 100; // Handle 1900s
        if (year >= 1970 && year <= currentYear) return year;
      }
      break;
      
    case 'carrier':
    case 'trane':
      // Carrier/Trane format: Position 4-5 are year
      if (serial.length >= 5) {
        const yearDigits = serial.substring(3, 5);
        let year = 2000 + parseInt(yearDigits);
        if (year > currentYear) year -= 100;
        if (year >= 1970 && year <= currentYear) return year;
      }
      break;
      
    case 'goodman':
      // Goodman format: Position 3-4 are year
      if (serial.length >= 4) {
        const yearDigits = serial.substring(2, 4);
        let year = 2000 + parseInt(yearDigits);
        if (year > currentYear) year -= 100;
        if (year >= 1970 && year <= currentYear) return year;
      }
      break;
      
    default:
      // Generic pattern: Look for 4-digit years
      const yearMatch = serial.match(/20\d{2}|19\d{2}/);
      if (yearMatch) {
        const year = parseInt(yearMatch[0]);
        if (year >= 1970 && year <= currentYear) return year;
      }
  }
  
  return undefined;
}