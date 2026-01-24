import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Upload, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionSheet } from "@/components/mobile/ActionSheet";
import { useHomeSystems, HomeSystem, SystemCatalog } from "@/hooks/useHomeSystems";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { QRPhotoSession } from "@/components/QRPhotoSession";

/**
 * TeachHabittaModal - Collaborative AI-led flow for adding systems
 * 
 * 5 Guardrails (Locked):
 * 1. High confidence requires user confirmation OR strong visual certainty (≥0.75)
 * 2. Explicit "AI unsure" branch (visual_certainty < 0.30)
 * 3. User confirmation raises confidence but is not immutable
 * 4. Z-index hierarchy: FAB at z-30, modals at z-50
 * 5. Modal state is ephemeral (resets on close)
 */

type ModalStep = 
  | 'capture'        // Initial: take/upload photo
  | 'analyzing'      // Loading: "Looking closely..."
  | 'interpretation' // AI result: "This looks like a Roof"
  | 'correction'     // User editing: system type, brand, year
  | 'success';       // Done: "Added. I'll start tracking this."

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
  // New fields from enhanced edge function
  visual_certainty?: number;
  is_uncertain?: boolean;
  habitta_message?: string;
  habitta_detail?: string;
  confidence_state?: 'high' | 'estimated' | 'needs_confirmation';
}

interface TeachHabittaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeId: string;
  onSystemAdded?: (system: HomeSystem) => void;
}

// System type display names - includes structural systems AND appliances
const SYSTEM_DISPLAY_NAMES: Record<string, string> = {
  // Structural systems (Tier 0)
  hvac: 'HVAC',
  water_heater: 'Water Heater',
  roof: 'Roof',
  electrical: 'Electrical Panel',
  plumbing: 'Plumbing',
  windows: 'Windows',
  // Critical appliances (Tier 1)
  refrigerator: 'Refrigerator',
  oven_range: 'Oven/Range',
  dishwasher: 'Dishwasher',
  washer: 'Washing Machine',
  dryer: 'Dryer',
  // Contextual appliances (Tier 2)
  microwave: 'Microwave',
  garbage_disposal: 'Garbage Disposal',
  wine_cooler: 'Wine Cooler',
};

// Quick-select system types - ordered by tier (structural first, then appliances)
const QUICK_SYSTEM_TYPES = [
  // Structural
  'hvac',
  'water_heater',
  'roof',
  'electrical',
  'plumbing',
  // Critical Appliances (Tier 1)
  'refrigerator',
  'oven_range',
  'dishwasher',
  'washer',
  'dryer',
  // Contextual (Tier 2)
  'microwave',
];

// Tier 2 appliances for messaging
const TIER_2_APPLIANCES = ['microwave', 'garbage_disposal', 'wine_cooler'];

// Age ranges (value = midpoint used for modeling)
const AGE_RANGES = [
  { value: 2, label: 'Less than 5 years' },
  { value: 7, label: '5–10 years' },
  { value: 12, label: '10–15 years' },
  { value: 17, label: '15+ years' },
  { value: null, label: 'Not sure' },
];

export function TeachHabittaModal({
  open,
  onOpenChange,
  homeId,
  onSystemAdded,
}: TeachHabittaModalProps) {
  // Step state machine
  const [step, setStep] = useState<ModalStep>('capture');
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Correction form state
  const [selectedSystemType, setSelectedSystemType] = useState<string>('');
  const [brandInput, setBrandInput] = useState('');
  const [modelInput, setModelInput] = useState('');
  const [selectedAgeRange, setSelectedAgeRange] = useState<number | null | undefined>(undefined);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const { addSystem, analyzePhoto, catalog } = useHomeSystems(homeId);

  // Guardrail 5: Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep('capture');
      setCapturedPhoto(null);
      setPreviewUrl(null);
      setAnalysis(null);
      setError(null);
      setSelectedSystemType('');
      setBrandInput('');
      setModelInput('');
      setSelectedAgeRange(undefined);
    }
  }, [open]);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Compute visual certainty client-side if not provided by server
  const computeVisualCertainty = (scores: AnalysisResult['confidence_scores']): number => {
    return (
      (scores.brand ?? 0) * 0.25 +
      (scores.model ?? 0) * 0.25 +
      (scores.system_type ?? 0) * 0.35 +
      (scores.serial ? 0.15 : 0)
    );
  };

  const handlePhotoCapture = async (file: File) => {
    setCapturedPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStep('analyzing');
    setError(null);
    setIsProcessing(true);

    try {
      const result = await analyzePhoto(file);
      processAnalysisResult(result);
    } catch (err) {
      console.error('Photo analysis error:', err);
      setError("I'm not totally sure what this is yet — can you help me out?");
      setStep('correction');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle remote photo from QR code transfer (Guardrail 5: passes URL to server)
  const handleRemotePhotoUpload = async (photoUrl: string) => {
    setPreviewUrl(photoUrl);
    setStep('analyzing');
    setError(null);
    setIsProcessing(true);

    try {
      const result = await analyzePhoto(null, photoUrl);
      processAnalysisResult(result);
    } catch (err) {
      console.error('Remote photo analysis error:', err);
      setError("I'm not totally sure what this is yet — can you help me out?");
      setStep('correction');
    } finally {
      setIsProcessing(false);
    }
  };

  // Shared logic to process analysis result
  const processAnalysisResult = (result: any) => {
    if (result.success && result.analysis) {
      const analysisData = result.analysis as AnalysisResult;
      
      // Compute visual certainty if not provided
      if (analysisData.visual_certainty === undefined) {
        analysisData.visual_certainty = computeVisualCertainty(analysisData.confidence_scores);
      }
      
      // Determine if uncertain (Guardrail 2)
      if (analysisData.is_uncertain === undefined) {
        analysisData.is_uncertain = analysisData.visual_certainty < 0.30 || !analysisData.system_type;
      }
      
      // Generate Habitta message if not provided
      if (!analysisData.habitta_message) {
        if (analysisData.is_uncertain) {
          analysisData.habitta_message = "I'm not totally sure what this is yet.";
        } else {
          const systemName = SYSTEM_DISPLAY_NAMES[analysisData.system_type || ''] || 'system';
          analysisData.habitta_message = `This looks like a ${systemName}.`;
          
          if (analysisData.manufacture_year) {
            analysisData.habitta_detail = `Likely installed around ${analysisData.manufacture_year}.`;
          } else if (analysisData.brand) {
            analysisData.habitta_detail = `${analysisData.brand} brand detected.`;
          }
        }
      }
      
      setAnalysis(analysisData);
      
      // Guardrail 2: If uncertain, go straight to correction
      if (analysisData.is_uncertain) {
        // Pre-fill any partial data
        if (analysisData.system_type) {
          setSelectedSystemType(analysisData.system_type);
        }
        if (analysisData.brand) {
          setBrandInput(analysisData.brand);
        }
        if (analysisData.model) {
          setModelInput(analysisData.model);
        }
        // Map manufacture_year to age range if available
        if (analysisData.manufacture_year) {
          const age = new Date().getFullYear() - analysisData.manufacture_year;
          if (age < 5) setSelectedAgeRange(2);
          else if (age < 10) setSelectedAgeRange(7);
          else if (age < 15) setSelectedAgeRange(12);
          else setSelectedAgeRange(17);
        }
        setStep('correction');
      } else {
        setStep('interpretation');
      }
    } else {
      throw new Error(result.error || 'Failed to analyze photo');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoCapture(file);
    }
    // Reset input
    e.target.value = '';
  };

  const handleConfirmInterpretation = async () => {
    if (!analysis) return;
    
    setIsProcessing(true);
    try {
      // Guardrail 3: Set install_source to 'owner_reported' on confirmation
      const systemData: Partial<HomeSystem> = {
        system_key: analysis.system_type || 'unknown',
        brand: analysis.brand,
        model: analysis.model,
        serial: analysis.serial,
        manufacture_year: analysis.manufacture_year,
        capacity_rating: analysis.capacity_rating,
        fuel_type: analysis.fuel_type,
        confidence_scores: analysis.confidence_scores,
        data_sources: ['vision', 'owner_confirmed'],
        source: {
          method: 'vision',
          confirmed_at: new Date().toISOString(),
          install_source: 'owner_reported', // Guardrail 3
        },
      };
      
      const result = await addSystem(systemData);
      if (result) {
        onSystemAdded?.(result as HomeSystem);
        setStep('success');
      }
    } catch (err) {
      console.error('Error saving system:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNotQuite = () => {
    // Pre-fill with analysis data
    if (analysis) {
      if (analysis.system_type) {
        setSelectedSystemType(analysis.system_type);
      }
      if (analysis.brand) {
        setBrandInput(analysis.brand);
      }
      if (analysis.model) {
        setModelInput(analysis.model);
      }
      // Map manufacture_year to age range
      if (analysis.manufacture_year) {
        const age = new Date().getFullYear() - analysis.manufacture_year;
        if (age < 5) setSelectedAgeRange(2);
        else if (age < 10) setSelectedAgeRange(7);
        else if (age < 15) setSelectedAgeRange(12);
        else setSelectedAgeRange(17);
      }
    }
    setStep('correction');
  };

  const handleSaveCorrection = async () => {
    if (!selectedSystemType) {
      setError('Please select a system type');
      return;
    }
    
    setIsProcessing(true);
    try {
      // Calculate manufacture year from age range (midpoint)
      const manufactureYear = selectedAgeRange !== null && selectedAgeRange !== undefined
        ? new Date().getFullYear() - selectedAgeRange
        : undefined;
      
      // Confidence boost logic (Guardrail 3)
      let boostedConfidence = 0.30; // base heuristic
      if (selectedSystemType) boostedConfidence += 0.25;
      if (brandInput) boostedConfidence += 0.15;
      if (selectedAgeRange !== null && selectedAgeRange !== undefined) boostedConfidence += 0.15;
      boostedConfidence = Math.min(boostedConfidence, 0.9);
      
      const systemData: Partial<HomeSystem> = {
        system_key: selectedSystemType,
        brand: brandInput || undefined,
        model: modelInput || undefined,
        serial: analysis?.serial,
        manufacture_year: manufactureYear,
        capacity_rating: analysis?.capacity_rating,
        fuel_type: analysis?.fuel_type,
        confidence_scores: {
          ...analysis?.confidence_scores,
          overall: boostedConfidence,
        },
        data_sources: ['vision', 'owner_corrected'],
        source: {
          method: 'vision',
          corrected_at: new Date().toISOString(),
          install_source: 'owner_reported',
          boosted_confidence: boostedConfidence,
        },
      };
      
      const result = await addSystem(systemData);
      if (result) {
        onSystemAdded?.(result as HomeSystem);
        setStep('success');
      }
    } catch (err) {
      console.error('Error saving system:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipDetails = async () => {
    if (!selectedSystemType && !analysis?.system_type) {
      setError('Please at least select a system type');
      return;
    }
    
    setIsProcessing(true);
    try {
      // Calculate manufacture year from age range if provided
      const manufactureYear = selectedAgeRange !== null && selectedAgeRange !== undefined
        ? new Date().getFullYear() - selectedAgeRange
        : analysis?.manufacture_year;
      
      const systemData: Partial<HomeSystem> = {
        system_key: selectedSystemType || analysis?.system_type || 'unknown',
        brand: brandInput || analysis?.brand,
        model: modelInput || analysis?.model,
        serial: analysis?.serial,
        manufacture_year: manufactureYear,
        data_sources: ['vision'],
        source: {
          method: 'vision',
          skipped_details: true,
          install_source: 'heuristic',
        },
      };
      
      const result = await addSystem(systemData);
      if (result) {
        onSystemAdded?.(result as HomeSystem);
        setStep('success');
      }
    } catch (err) {
      console.error('Error saving system:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if on desktop for QR code flow
  const isMobile = useIsMobile();

  const renderCaptureStep = () => {
    // Desktop: Show QR code flow
    if (!isMobile) {
      return (
        <div className="space-y-6">
          <QRPhotoSession
            homeId={homeId}
            onPhotoReceived={handleRemotePhotoUpload}
            onCancel={() => onOpenChange(false)}
            onFallbackUpload={() => fileInputRef.current?.click()}
          />
          
          {/* Hidden file input for fallback upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      );
    }

    // Mobile: Show camera/upload options
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Take a photo or upload an image of a system or appliance you want Habitta to track.
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-6 w-6" />
            <span className="text-sm">Take photo</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-6 w-6" />
            <span className="text-sm">Upload</span>
          </Button>
        </div>
        
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
          >
            Cancel
          </Button>
        </div>
        
        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  };

  const renderAnalyzingStep = () => (
    <div className="py-8 text-center">
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground">Looking closely...</p>
    </div>
  );

  const renderInterpretationStep = () => (
    <div className="space-y-6">
      {/* Photo preview */}
      {previewUrl && (
        <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
          <img 
            src={previewUrl} 
            alt="Captured device" 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Habitta's interpretation */}
      <div className="space-y-2">
        <p className="text-base font-medium">
          {analysis?.habitta_message}
        </p>
        {analysis?.habitta_detail && (
          <p className="text-sm text-muted-foreground">
            {analysis.habitta_detail}
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-3">
          Does this look right?
        </p>
      </div>
      
      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleNotQuite}
          disabled={isProcessing}
        >
          Not quite
        </Button>
        <Button
          className="flex-1"
          onClick={handleConfirmInterpretation}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Yes, that's right"
          )}
        </Button>
      </div>
    </div>
  );

  const renderCorrectionStep = () => (
    <div className="space-y-5">
      {/* Habitta's encouraging message */}
      <div className="text-center">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm font-medium">
          Just help me get closer.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Rough answers are totally fine.
        </p>
      </div>
      
      {/* System type pills */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">What kind of system is this?</Label>
        <div className="flex flex-wrap gap-2">
          {QUICK_SYSTEM_TYPES.map((type) => (
            <Button
              key={type}
              variant={selectedSystemType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSystemType(type)}
              className="text-xs"
            >
              {SYSTEM_DISPLAY_NAMES[type] || type}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Brand input (optional) */}
      <div className="space-y-1.5">
        <Label htmlFor="brand" className="text-xs text-muted-foreground">
          Brand (optional)
        </Label>
        <Input
          id="brand"
          value={brandInput}
          onChange={(e) => setBrandInput(e.target.value)}
          placeholder="e.g. LG, Whirlpool"
          className="h-9"
        />
      </div>
      
      {/* Age range picker (replaces exact year input) */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">About how old is it? (optional)</Label>
        <div className="flex flex-wrap gap-2">
          {AGE_RANGES.map((range) => (
            <Button
              key={range.label}
              variant={selectedAgeRange === range.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedAgeRange(range.value)}
              className="text-xs"
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
      
      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="ghost"
          className="text-muted-foreground"
          onClick={handleSkipDetails}
          disabled={isProcessing}
        >
          Skip details
        </Button>
        <Button
          className="flex-1"
          onClick={handleSaveCorrection}
          disabled={isProcessing || !selectedSystemType}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </div>
  );

  const renderSuccessStep = () => {
    // Tier-specific messaging (Guardrail: Tier 2 gets disclaimer)
    const isTier2 = TIER_2_APPLIANCES.includes(selectedSystemType || analysis?.system_type || '');
    const successMessage = isTier2
      ? "I'll keep an eye on this, but it won't affect your home's outlook."
      : "I'll start tracking this and include it in your home's outlook.";
    
    return (
      <div className="py-6 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-medium">Added.</p>
          <p className="text-sm text-muted-foreground">
            {successMessage}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            You can update this anytime.
          </p>
        </div>
        <Button onClick={() => onOpenChange(false)} className="mt-4">
          Done
        </Button>
      </div>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 'capture':
        return renderCaptureStep();
      case 'analyzing':
        return renderAnalyzingStep();
      case 'interpretation':
        return renderInterpretationStep();
      case 'correction':
        return renderCorrectionStep();
      case 'success':
        return renderSuccessStep();
    }
  };

  return (
    <ActionSheet
      open={open}
      onOpenChange={onOpenChange}
      title={step === 'capture' ? "Teach Habitta something new" : undefined}
    >
      {renderStep()}
    </ActionSheet>
  );
}
