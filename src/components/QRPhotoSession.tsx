import { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "react-qr-code";
import { Loader2, RefreshCw, Upload, QrCode, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * QRPhotoSession - Desktop QR code display for phone photo transfer
 * 
 * Guardrails:
 * 1. Session created only when rendered (not on modal open)
 * 2. Session destroyed on unmount/modal close
 * 3. Explicit timeout UX with countdown + regenerate option
 * 4. Polling every 2s (simpler than realtime for v1)
 * 5. Single-use session (first upload wins)
 */

interface QRPhotoSessionProps {
  homeId: string;
  onPhotoReceived: (photoUrl: string) => void;
  onCancel: () => void;
  onFallbackUpload: () => void;
}

type SessionState = 'creating' | 'active' | 'expired' | 'received' | 'error';

export function QRPhotoSession({
  homeId,
  onPhotoReceived,
  onCancel,
  onFallbackUpload,
}: QRPhotoSessionProps) {
  const [sessionState, setSessionState] = useState<SessionState>('creating');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(600); // 10 minutes in seconds
  const [error, setError] = useState<string | null>(null);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Generate capture URL for the QR code
  const captureUrl = sessionToken 
    ? `${window.location.origin}/capture-photo?token=${sessionToken}`
    : null;

  // Create a new session
  const createSession = useCallback(async () => {
    setSessionState('creating');
    setError(null);

    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `https://vbcsuoubxyhjhxcgrqco.supabase.co/functions/v1/photo-transfer-session?action=create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiY3N1b3VieHloamh4Y2dycWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MTQ1MTAsImV4cCI6MjA2NzQ5MDUxMH0.cJbuzANuv6IVQHPAl6UvLJ8SYMw4zFlrE1R2xq9yyjs',
          },
          body: JSON.stringify({ home_id: homeId }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create session');
      }

      setSessionToken(result.session_token);
      setExpiresAt(new Date(result.expires_at));
      setTimeRemaining(Math.floor((new Date(result.expires_at).getTime() - Date.now()) / 1000));
      setSessionState('active');
      
      console.log('QR session created:', result.session_token.substring(0, 8) + '...');
    } catch (err) {
      console.error('Failed to create QR session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create session');
      setSessionState('error');
    }
  }, [homeId]);

  // Poll for status updates
  const pollStatus = useCallback(async () => {
    if (!sessionToken || sessionState !== 'active') return;

    try {
      const response = await fetch(
        `https://vbcsuoubxyhjhxcgrqco.supabase.co/functions/v1/photo-transfer-session?action=status&token=${sessionToken}`,
        {
          method: 'GET',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiY3N1b3VieHloamh4Y2dycWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MTQ1MTAsImV4cCI6MjA2NzQ5MDUxMH0.cJbuzANuv6IVQHPAl6UvLJ8SYMw4zFlrE1R2xq9yyjs',
          },
        }
      );

      const result = await response.json();

      if (result.status === 'uploaded' && result.photo_url) {
        console.log('Photo received via QR transfer!');
        setSessionState('received');
        // Stop polling
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        // Notify parent
        onPhotoReceived(result.photo_url);
      } else if (result.status === 'expired') {
        setSessionState('expired');
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch (err) {
      console.error('Poll status error:', err);
      // Don't fail on polling errors, just log
    }
  }, [sessionToken, sessionState, onPhotoReceived]);

  // Create session on mount
  useEffect(() => {
    createSession();
  }, [createSession]);

  // Start polling when session is active
  useEffect(() => {
    if (sessionState === 'active' && sessionToken) {
      // Poll every 2 seconds
      pollingRef.current = setInterval(pollStatus, 2000);
      
      // Initial poll
      pollStatus();
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [sessionState, sessionToken, pollStatus]);

  // Countdown timer
  useEffect(() => {
    if (sessionState === 'active' && expiresAt) {
      countdownRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining <= 0) {
          setSessionState('expired');
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
        }
      }, 1000);
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [sessionState, expiresAt]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Format time remaining as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render creating state
  if (sessionState === 'creating') {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
          <QrCode className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Generating QR code...</p>
      </div>
    );
  }

  // Render error state
  if (sessionState === 'error') {
    return (
      <div className="py-6 text-center space-y-4">
        <p className="text-sm text-destructive">{error || 'Something went wrong'}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={createSession}>Try Again</Button>
        </div>
      </div>
    );
  }

  // Render expired state
  if (sessionState === 'expired') {
    return (
      <div className="py-6 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Clock className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-base font-medium">QR code expired</p>
          <p className="text-sm text-muted-foreground mt-1">
            Generate a new code to continue
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onFallbackUpload}>
            <Upload className="h-4 w-4 mr-2" />
            Upload manually
          </Button>
          <Button onClick={createSession}>
            <RefreshCw className="h-4 w-4 mr-2" />
            New code
          </Button>
        </div>
      </div>
    );
  }

  // Render active state with QR code
  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Scan this code with your phone to capture a photo
        </p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <div className="bg-white p-4 rounded-xl shadow-sm">
          {captureUrl && (
            <QRCode
              value={captureUrl}
              size={180}
              level="M"
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            />
          )}
        </div>
      </div>

      {/* Countdown timer */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={`text-sm font-mono ${timeRemaining < 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
            Expires in {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      {/* Waiting indicator */}
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Waiting for photo...</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center pt-2">
        <Button variant="ghost" onClick={onCancel} className="text-muted-foreground">
          Cancel
        </Button>
        <Button variant="outline" onClick={onFallbackUpload}>
          <Upload className="h-4 w-4 mr-2" />
          Upload manually
        </Button>
      </div>
    </div>
  );
}
