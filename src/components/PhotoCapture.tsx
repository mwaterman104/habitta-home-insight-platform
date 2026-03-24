import React, { useRef, useState } from 'react';
import { Camera, Upload, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface PhotoCaptureProps {
  onPhotoCapture: (photo: File) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function PhotoCapture({ onPhotoCapture, onCancel, isProcessing }: PhotoCaptureProps) {
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Prefer back camera
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setShowCamera(true);
      }
    } catch (error) {
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access or use file upload instead.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'device-photo.jpg', { type: 'image/jpeg' });
            setCapturedPhoto(file);
            setPreviewUrl(URL.createObjectURL(blob));
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setCapturedPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onPhotoCapture(capturedPhoto);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Add System Photo</h3>
        <p className="text-sm text-muted-foreground">
          Take a photo of the rating plate or device label for best results
        </p>

        {showCamera && (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg bg-muted"
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              <Button onClick={capturePhoto} size="lg" className="rounded-full">
                <Camera className="h-6 w-6" />
              </Button>
              <Button onClick={stopCamera} variant="outline" size="lg" className="rounded-full">
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>
        )}

        {previewUrl && (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Captured device"
              className="w-full rounded-lg border"
            />
            <div className="absolute top-2 right-2 bg-background/80 rounded-full p-1">
              <Button
                onClick={handleRetake}
                variant="ghost"
                size="sm"
                className="rounded-full h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {!showCamera && !previewUrl && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={startCamera}
              variant="outline"
              className="h-24 flex-col gap-2"
            >
              <Camera className="h-8 w-8" />
              <span>Take Photo</span>
            </Button>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="h-24 flex-col gap-2"
            >
              <Upload className="h-8 w-8" />
              <span>Upload Photo</span>
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        {capturedPhoto && (
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Analyze Photo'}
            </Button>
            <Button onClick={onCancel} variant="outline">
              Cancel
            </Button>
          </div>
        )}

        {!capturedPhoto && (
          <Button onClick={onCancel} variant="outline" className="w-full">
            Skip Photo & Enter Manually
          </Button>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </Card>
  );
}