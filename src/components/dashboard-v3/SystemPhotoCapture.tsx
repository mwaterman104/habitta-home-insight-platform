/**
 * SystemPhotoCapture - Cross-platform photo capture dialog for system verification.
 *
 * Desktop: QR code (phone capture) + fallback desktop upload
 * Mobile: Native camera or gallery picker
 *
 * On upload, opens chat with autoSendMessage so the AI can analyze the photo.
 */

import { useState, useRef } from "react";
import { Camera, Upload, QrCode, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useChatContext } from "@/contexts/ChatContext";
import { QRPhotoSession } from "@/components/QRPhotoSession";

interface SystemPhotoCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeId: string;
  systemLabel: string;
  systemKey: string;
}

export function SystemPhotoCapture({
  open,
  onOpenChange,
  homeId,
  systemLabel,
  systemKey,
}: SystemPhotoCaptureProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { openChat } = useChatContext();
  const [isUploading, setIsUploading] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) return "Photo is too large. Maximum size is 10MB.";
    if (!file.type.startsWith("image/")) return "Please select an image file.";
    return null;
  };

  const uploadAndNotify = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast({ title: "Invalid file", description: validationError, variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const session = await supabase.auth.getSession();
      const userId = session.data.session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop() || "jpg";
      const storagePath = `chat-uploads/${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("home-photos")
        .upload(storagePath, file, { cacheControl: "3600", contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("home-photos")
        .getPublicUrl(storagePath);

      toast({ title: "Photo received", description: "Analyzing your photo..." });

      onOpenChange(false);
      openChat({
        type: "system",
        systemKey,
        trigger: "verify_photo",
        autoSendMessage: `I just uploaded a photo of my ${systemLabel}. Here is the URL: ${publicUrl} — Please analyze it to verify the installation details.`,
      });
    } catch (err) {
      console.error("[SystemPhotoCapture] Upload error:", err);
      toast({ title: "Upload failed", description: "Could not upload photo. Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadAndNotify(file);
    e.target.value = "";
  };

  const handleQRPhotoReceived = (photoUrl: string) => {
    toast({ title: "Photo received", description: "Analyzing your photo..." });
    onOpenChange(false);
    openChat({
      type: "system",
      systemKey,
      trigger: "verify_photo",
      autoSendMessage: `I just uploaded a photo of my ${systemLabel}. Here is the URL: ${photoUrl} — Please analyze it to verify the installation details.`,
    });
  };

  // Mobile view
  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Verify {systemLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <Button
              className="w-full justify-start gap-3 h-12"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              Take Photo
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-5 w-5" />
              Choose from Gallery
            </Button>
          </div>

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop view
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Capture {systemLabel} Photo
          </DialogTitle>
        </DialogHeader>
        {open && (
          <QRPhotoSession
            homeId={homeId}
            onPhotoReceived={handleQRPhotoReceived}
            onCancel={() => onOpenChange(false)}
            onFallbackUpload={() => {
              fileInputRef.current?.click();
            }}
          />
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </DialogContent>
    </Dialog>
  );
}
