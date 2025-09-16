import { useState, useRef } from "react";
import { Camera, Upload, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionSheet, ActionItem } from "./ActionSheet";
import { useToast } from "@/hooks/use-toast";

interface MobilePhotoCaptureProps {
  onPhotoCapture?: (file: File) => void;
  onPhotoSelect?: (file: File) => void;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
}

export const MobilePhotoCapture = ({
  onPhotoCapture,
  onPhotoSelect,
  maxFileSize = 5,
  acceptedTypes = ["image/jpeg", "image/png", "image/webp"],
}: MobilePhotoCaptureProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    if (!acceptedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid image file (JPEG, PNG, or WebP).",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > maxFileSize * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Please select an image smaller than ${maxFileSize}MB.`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
    setIsOpen(false);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
    setIsOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isCamera: boolean) => {
    const file = e.target.files?.[0];
    if (!file || !validateFile(file)) return;

    setIsProcessing(true);

    try {
      // Create preview
      const imageUrl = URL.createObjectURL(file);
      setCapturedImage(imageUrl);

      // Call appropriate callback
      if (isCamera) {
        onPhotoCapture?.(file);
      } else {
        onPhotoSelect?.(file);
      }

      toast({
        title: "Photo ready",
        description: isCamera ? "Photo captured successfully" : "Photo selected successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      // Reset file inputs
      e.target.value = "";
    }
  };

  const clearImage = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
      setCapturedImage(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Captured image preview */}
        {capturedImage && (
          <div className="relative">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-48 object-cover rounded-lg border"
            />
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={clearImage}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded-full p-2">
              <Check className="h-4 w-4 text-accent" />
            </div>
          </div>
        )}

        {/* Capture button */}
        <Button
          onClick={() => setIsOpen(true)}
          disabled={isProcessing}
          className="w-full touch-friendly"
          variant={capturedImage ? "outline" : "default"}
        >
          <Camera className="h-4 w-4 mr-2" />
          {capturedImage ? "Retake Photo" : "Take Photo"}
        </Button>
      </div>

      {/* Action Sheet */}
      <ActionSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Add Photo"
        description="Choose how you'd like to add a photo"
      >
        <div className="space-y-2">
          <ActionItem
            icon={<Camera className="h-5 w-5" />}
            label="Take Photo"
            description="Use camera to take a new photo"
            onClick={handleCameraCapture}
          />
          <ActionItem
            icon={<Upload className="h-5 w-5" />}
            label="Choose from Gallery"
            description="Select an existing photo"
            onClick={handleFileSelect}
          />
        </div>
      </ActionSheet>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileChange(e, true)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        className="hidden"
        onChange={(e) => handleFileChange(e, false)}
      />
    </>
  );
};