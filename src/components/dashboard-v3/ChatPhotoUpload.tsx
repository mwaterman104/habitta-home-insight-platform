import { useState, useRef } from "react";
import { Camera, Upload, X, QrCode, Loader2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { QRPhotoSession } from "@/components/QRPhotoSession";

interface ChatPhotoUploadProps {
  homeId: string;
  onPhotoReady: (photoUrl: string) => void;
  disabled?: boolean;
}

/**
 * ChatPhotoUpload - Photo upload button for ChatDock
 * 
 * Behavior:
 * - Mobile: Direct camera/gallery picker
 * - Desktop: QR code modal for phone capture
 * 
 * Doctrine: Photo upload is framed as "improving accuracy" not a task
 */
export function ChatPhotoUpload({ homeId, onPhotoReady, disabled }: ChatPhotoUploadProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const [showQRModal, setShowQRModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showMobileOptions, setShowMobileOptions] = useState(false);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate file
  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return 'Photo is too large. Maximum size is 10MB.';
    }
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file.';
    }
    return null;
  };

  // Handle mobile file selection
  const handleMobileFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: "Invalid file",
        description: validationError,
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setShowMobileOptions(false);

    try {
      // Upload to storage
      const { supabase } = await import('@/integrations/supabase/client');
      const session = await supabase.auth.getSession();
      const userId = session.data.session?.user?.id;
      
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const ext = file.name.split('.').pop() || 'jpg';
      const storagePath = `chat-uploads/${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('home-photos')
        .upload(storagePath, file, {
          cacheControl: '3600',
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('home-photos')
        .getPublicUrl(storagePath);

      toast({
        title: "Photo received",
        description: "Analyzing your photo...",
      });

      onPhotoReady(publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        title: "Upload failed",
        description: "Could not upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Handle QR photo received
  // CRITICAL FIX: Call callback BEFORE closing modal to prevent unmount race condition
  const handleQRPhotoReceived = async (photoUrl: string) => {
    console.log('[ChatPhotoUpload] Photo received via QR, triggering analysis:', photoUrl.substring(0, 50));
    
    // Show toast immediately (user feedback)
    toast({
      title: "Photo received",
      description: "Analyzing your photo...",
    });
    
    // CRITICAL: Call the callback BEFORE closing modal
    // This ensures the async chain starts before component unmounts
    onPhotoReady(photoUrl);
    
    // Then close modal (after callback initiated)
    setShowQRModal(false);
  };

  // Handle fallback upload (desktop user wants to upload directly)
  const handleFallbackUpload = () => {
    setShowQRModal(false);
    fileInputRef.current?.click();
  };

  // Desktop file upload (fallback)
  const handleDesktopFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: "Invalid file",
        description: validationError,
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    setIsUploading(true);

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const session = await supabase.auth.getSession();
      const userId = session.data.session?.user?.id;
      
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const ext = file.name.split('.').pop() || 'jpg';
      const storagePath = `chat-uploads/${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('home-photos')
        .upload(storagePath, file, {
          cacheControl: '3600',
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('home-photos')
        .getPublicUrl(storagePath);

      toast({
        title: "Photo received",
        description: "Analyzing your photo...",
      });

      onPhotoReady(publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        title: "Upload failed",
        description: "Could not upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Handle button click
  const handleClick = () => {
    if (isUploading || disabled) return;

    if (isMobile) {
      setShowMobileOptions(true);
    } else {
      setShowQRModal(true);
    }
  };

  return (
    <>
      {/* Main button - camera icon */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={disabled || isUploading}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        title="Add photo"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
      </Button>

      {/* Mobile options dialog */}
      <Dialog open={showMobileOptions} onOpenChange={setShowMobileOptions}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <Button
              className="w-full justify-start gap-3 h-12"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-5 w-5" />
              Take Photo
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-5 w-5" />
              Choose from Gallery
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Desktop QR code dialog */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Capture with Phone
            </DialogTitle>
          </DialogHeader>
          {showQRModal && (
            <QRPhotoSession
              homeId={homeId}
              onPhotoReceived={handleQRPhotoReceived}
              onCancel={() => setShowQRModal(false)}
              onFallbackUpload={handleFallbackUpload}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleMobileFile}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={isMobile ? handleMobileFile : handleDesktopFile}
      />
    </>
  );
}
