import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Camera, Upload, CheckCircle2, AlertCircle, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * MobilePhotoCaptureRoute - Minimal public page for phone photo capture
 * 
 * Route: /capture-photo?token=xyz123
 * 
 * Features:
 * - No authentication required (token provides access)
 * - Simple camera/upload UI (no navigation chrome)
 * - Validates file: max 10MB, image/* only
 * - Uploads to Supabase Storage
 * - Updates session status via edge function
 * 
 * Guardrails:
 * - Validates token before allowing upload
 * - Single-use: server rejects if already uploaded
 * - Shows clear error states
 */

type PageState = 'validating' | 'ready' | 'uploading' | 'success' | 'error' | 'expired' | 'already_used';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export default function MobilePhotoCaptureRoute() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [pageState, setPageState] = useState<PageState>('validating');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setPageState('error');
        setError('No session token provided');
        return;
      }

      try {
        const response = await fetch(
          `https://vbcsuoubxyhjhxcgrqco.supabase.co/functions/v1/photo-transfer-session?action=status&token=${token}`,
          {
            method: 'GET',
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiY3N1b3VieHloamh4Y2dycWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MTQ1MTAsImV4cCI6MjA2NzQ5MDUxMH0.cJbuzANuv6IVQHPAl6UvLJ8SYMw4zFlrE1R2xq9yyjs',
            },
          }
        );

        const result = await response.json();

        if (!response.ok || result.status === 'expired') {
          setPageState('expired');
          return;
        }

        if (result.status === 'uploaded') {
          setPageState('already_used');
          return;
        }

        setPageState('ready');
      } catch (err) {
        console.error('Token validation error:', err);
        setPageState('error');
        setError('Failed to validate session');
      }
    };

    validateToken();
  }, [token]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Validate file
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return 'Photo is too large. Maximum size is 10MB.';
    }
    // Be lenient with MIME types on mobile (especially for HEIC)
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file.';
    }
    return null;
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setPageState('error');
      return;
    }

    // Show preview
    setPreviewUrl(URL.createObjectURL(file));
    setPageState('uploading');
    setError(null);

    try {
      // Generate unique filename
      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `${token}_${Date.now()}.${ext}`;
      const storagePath = `transfers/${filename}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('home-photos')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload photo');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('home-photos')
        .getPublicUrl(storagePath);

      // Update session status
      const response = await fetch(
        `https://vbcsuoubxyhjhxcgrqco.supabase.co/functions/v1/photo-transfer-session?action=upload&token=${token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiY3N1b3VieHloamh4Y2dycWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MTQ1MTAsImV4cCI6MjA2NzQ5MDUxMH0.cJbuzANuv6IVQHPAl6UvLJ8SYMw4zFlrE1R2xq9yyjs',
          },
          body: JSON.stringify({ photo_url: publicUrl }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setPageState('already_used');
          return;
        }
        throw new Error(result.error || 'Failed to complete transfer');
      }

      setPageState('success');
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
      setPageState('error');
    }

    // Reset input
    e.target.value = '';
  };

  // Render validating state
  if (pageState === 'validating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Validating session...</p>
        </div>
      </div>
    );
  }

  // Render expired state
  if (pageState === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Link Expired</h1>
          <p className="text-muted-foreground">
            This QR code has expired. Return to your computer and generate a new one.
          </p>
        </div>
      </div>
    );
  }

  // Render already used state
  if (pageState === 'already_used') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold">Already Uploaded</h1>
          <p className="text-muted-foreground">
            A photo was already uploaded for this session. Check your computer to continue.
          </p>
        </div>
      </div>
    );
  }

  // Render success state
  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold">Photo Sent!</h1>
          <p className="text-muted-foreground">
            Your photo is being analyzed. You can return to your computer now.
          </p>
          <div className="pt-4">
            <Smartphone className="h-5 w-5 mx-auto text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (pageState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Something Went Wrong</h1>
          <p className="text-muted-foreground">
            {error || 'An unexpected error occurred. Please try again.'}
          </p>
          <Button onClick={() => setPageState('ready')} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Render uploading state
  if (pageState === 'uploading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-sm w-full">
          {previewUrl && (
            <div className="relative aspect-video rounded-xl overflow-hidden bg-muted mb-6">
              <img 
                src={previewUrl} 
                alt="Uploading" 
                className="w-full h-full object-cover opacity-75"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
              </div>
            </div>
          )}
          <p className="text-muted-foreground">Uploading photo...</p>
        </div>
      </div>
    );
  }

  // Render ready state (main capture UI)
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 text-center border-b">
        <h1 className="text-lg font-semibold">Capture Photo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Take a photo of your appliance or system
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          {/* Camera button */}
          <Button
            size="lg"
            className="w-full h-20 text-lg gap-3"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-6 w-6" />
            Take Photo
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Upload button */}
          <Button
            variant="outline"
            size="lg"
            className="w-full h-14 gap-3"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-5 w-5" />
            Choose from Gallery
          </Button>
        </div>

        {/* Helper text */}
        <p className="text-xs text-muted-foreground text-center mt-8 max-w-xs">
          Tip: Get a clear shot of the label or nameplate showing the brand and model number.
        </p>
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
}
