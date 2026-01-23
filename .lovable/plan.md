

# QR Code Photo Upload for Desktop Users - Refined Implementation

## Overview

Enable desktop users to scan a QR code with their phone to capture photos of appliances/systems, with the image automatically appearing in their desktop session. This bridges the "phone has a camera, desktop has the workflow" gap.

## User Flow Summary

```text
Desktop Flow:
1. User clicks "Take photo" in TeachHabittaModal
2. System detects desktop → shows QR code with countdown timer
3. User scans QR with phone → opens minimal capture page
4. Photo uploads → desktop receives notification via polling
5. Modal proceeds to AI analysis

Mobile Flow (unchanged):
- Uses existing camera capture with capture="environment"
```

---

## Technical Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│  DESKTOP BROWSER                                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  TeachHabittaModal (capture step)                       │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │  QRPhotoSession Component                        │   │    │
│  │  │  - Creates session ONLY when rendered            │   │    │
│  │  │  - Shows QR code + countdown (10 min)            │   │    │
│  │  │  - Polls every 2s for photo upload               │   │    │
│  │  │  - Destroys session on unmount/modal close       │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Scan QR → /capture-photo?token=xyz123
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  MOBILE BROWSER (unauthenticated page)                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  MobilePhotoCaptureRoute                                │    │
│  │  - Validates session token exists + not expired        │    │
│  │  - Simple camera UI (no navigation chrome)             │    │
│  │  - Validates file: max 10MB, image/* only              │    │
│  │  - Uploads to Supabase Storage                         │    │
│  │  - Updates session status → 'uploaded'                 │    │
│  │  - Shows "Photo sent! Return to desktop."              │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Desktop polls every 2s
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Desktop detects status='uploaded'                              │
│  - Passes storage URL to analyze-device-photo                   │
│  - Continues normal TeachHabittaModal flow                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6 Locked Guardrails (From QA Review)

| # | Guardrail | Implementation |
|---|-----------|----------------|
| 1 | Session created only when QR is rendered, destroyed on modal close | `QRPhotoSession` creates session in `useEffect` on mount, calls cleanup on unmount. `TeachHabittaModal` resets session ref when `open` becomes `false`. |
| 2 | Single-use session — first upload wins, then invalidated | Edge function checks `status = 'pending'` before accepting upload. Updates to `'uploaded'` atomically. Rejects subsequent uploads with 409. |
| 3 | Explicit timeout UX (countdown + regenerate) | Display `"Expires in X:XX"` countdown. On expiry: show `"QR expired"` message + `"Generate new code"` button. |
| 4 | Polling chosen over realtime for v1 (simpler, reliable) | Poll `/photo-transfer-session?action=status&token=...` every 2 seconds. Stop polling when `status = 'uploaded'` or `'expired'`. |
| 5 | Desktop passes storage URL to analysis server-side, not client blob fetch | When photo received, pass `photoUrl` to `analyzePhoto()` hook. Modify edge function to accept URL in addition to file upload. |
| 6 | Image size/type validation + cleanup policy | Mobile page validates: max 10MB, `image/*` only. Cleanup: uploaded photos persist (user may want later). Add TTL policy to bucket (future). |

---

## Database Schema

### New Table: `photo_transfer_sessions`

```sql
CREATE TABLE public.photo_transfer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  home_id UUID REFERENCES public.homes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'expired')),
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes')
);

-- RLS: Users can only see their own sessions
ALTER TABLE public.photo_transfer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions" ON public.photo_transfer_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Public can update if they have the token (for mobile upload)
CREATE POLICY "Anyone with token can upload" ON public.photo_transfer_sessions
  FOR UPDATE USING (session_token = current_setting('request.headers')::json->>'x-session-token');

-- Index for token lookups
CREATE INDEX idx_photo_transfer_sessions_token ON public.photo_transfer_sessions(session_token);

-- Auto-cleanup function (runs on cron or manually)
CREATE OR REPLACE FUNCTION cleanup_expired_photo_sessions()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.photo_transfer_sessions
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$;
```

---

## New Dependencies

```bash
npm install react-qr-code
```

Already installed: `@types/leaflet`, `react-leaflet` (from map work)

---

## Files to Create

### 1. `src/components/QRPhotoSession.tsx`

QR code display component with countdown and polling.

Key responsibilities:
- Create session on mount (API call to edge function)
- Generate QR code pointing to `/capture-photo?token=SESSION_TOKEN`
- Display countdown timer (`Expires in 9:32`)
- Poll session status every 2 seconds
- On `status='uploaded'`: call `onPhotoReceived(url)`
- On expiry: show `"QR expired"` + `"Generate new code"` button
- Cleanup session on unmount

```typescript
interface QRPhotoSessionProps {
  homeId: string;
  onPhotoReceived: (photoUrl: string) => void;
  onCancel: () => void;
  onFallbackUpload: () => void; // "I'll upload manually"
}
```

### 2. `src/pages/MobilePhotoCaptureRoute.tsx`

Minimal public page for phone photo capture.

Route: `/capture-photo?token=xyz123`

Key responsibilities:
- Validate token on mount (check session exists + not expired)
- Show simple camera/upload UI (no navigation, no auth)
- Validate file: max 10MB, image types only
- Upload to `home-photos` bucket (path: `transfers/{token}/{filename}`)
- Update session: `status='uploaded'`, `photo_url=...`
- Show confirmation: `"Photo sent! You can return to your computer."`
- Handle errors gracefully (expired, already uploaded, etc.)

### 3. `supabase/functions/photo-transfer-session/index.ts`

Edge function for session management.

Actions:
- `POST ?action=create` — Create new session (requires auth)
- `GET ?action=status&token=...` — Check session status (public)
- `POST ?action=upload&token=...` — Mark as uploaded + set URL (public)

Security:
- `create` requires valid JWT
- `status` and `upload` validate token exists
- `upload` atomically checks `status='pending'` before updating

---

## Files to Modify

### 1. `src/components/TeachHabittaModal.tsx`

Modify `renderCaptureStep()` to detect desktop vs mobile:

```typescript
const renderCaptureStep = () => {
  const isMobile = useIsMobile();
  
  // Desktop: Show QR code flow
  if (!isMobile) {
    return (
      <QRPhotoSession
        homeId={homeId}
        onPhotoReceived={async (photoUrl) => {
          // Pass URL to analyzePhoto (server-side fetch)
          await handleRemotePhotoUpload(photoUrl);
        }}
        onCancel={() => onOpenChange(false)}
        onFallbackUpload={() => fileInputRef.current?.click()}
      />
    );
  }
  
  // Mobile: Keep existing camera flow
  return (/* current implementation */);
};
```

Add new handler for remote photo:

```typescript
const handleRemotePhotoUpload = async (photoUrl: string) => {
  setStep('analyzing');
  setError(null);
  setIsProcessing(true);

  try {
    // Pass URL to analyze function (server fetches image)
    const result = await analyzePhoto(null, photoUrl);
    // ... rest of existing analysis handling
  } catch (err) {
    // ... error handling
  }
};
```

Add session cleanup to modal close effect:

```typescript
// In useEffect that handles modal close
useEffect(() => {
  if (!open) {
    // Existing state resets...
    setPhotoSessionToken(null); // Clear any active session
  }
}, [open]);
```

### 2. `src/hooks/useHomeSystems.ts`

Extend `analyzePhoto` to accept URL:

```typescript
const analyzePhoto = async (photo: File | null, photoUrl?: string): Promise<AnalysisResponse> => {
  const formData = new FormData();
  
  if (photo) {
    formData.append('image', photo);
  } else if (photoUrl) {
    formData.append('image_url', photoUrl);
  }
  
  // ... rest of existing implementation
};
```

### 3. `supabase/functions/analyze-device-photo/index.ts`

Add support for `image_url` parameter:

```typescript
// Check for URL-based image (from QR transfer)
const imageUrl = formData.get('image_url') as string | null;

let base64Image: string;

if (imageUrl) {
  // Fetch image from Supabase Storage
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) throw new Error('Failed to fetch transferred image');
  const imageBytes = await imageResponse.arrayBuffer();
  base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBytes)));
} else if (imageFile) {
  // Existing file handling
  const imageBytes = await imageFile.arrayBuffer();
  base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBytes)));
} else {
  throw new Error('No image provided');
}
```

### 4. `src/pages/AppRoutes.tsx`

Add public route for mobile capture:

```typescript
// Add import
import MobilePhotoCaptureRoute from "./MobilePhotoCaptureRoute";

// Add route OUTSIDE of ProtectedRoute (public access)
<Route path="/capture-photo" element={<MobilePhotoCaptureRoute />} />
```

---

## Component Flow Diagram

```text
TeachHabittaModal
  │
  ├─ Mobile? ─────────────────────────────────────────┐
  │     YES                                           │
  │     └─ renderCaptureStep() [existing]             │
  │           │                                       │
  │           └─ Camera input → handlePhotoCapture()  │
  │                                                   │
  └─ Desktop? ────────────────────────────────────────┤
        YES                                           │
        └─ <QRPhotoSession />                         │
              │                                       │
              ├─ onMount: POST /photo-transfer-session?action=create
              │      └─ Receives session_token        │
              │                                       │
              ├─ Renders: QR code + countdown         │
              │                                       │
              ├─ Polling loop (2s interval):          │
              │     GET /photo-transfer-session?action=status&token=...
              │                                       │
              ├─ status='uploaded':                   │
              │     └─ onPhotoReceived(photo_url)     │
              │           └─ handleRemotePhotoUpload()│
              │                 └─ setStep('analyzing')
              │                       └─ [continues normal flow]
              │                                       │
              └─ Timeout/expired:                     │
                    └─ Show "QR expired" + regenerate │
                                                      │
Mobile Phone ─────────────────────────────────────────┘
  │
  └─ Scans QR → /capture-photo?token=xyz123
        │
        └─ <MobilePhotoCaptureRoute />
              │
              ├─ Validate token (exists + not expired)
              │
              ├─ Capture/upload photo
              │     └─ Validate: ≤10MB, image/* only
              │     └─ Upload to storage
              │
              ├─ POST /photo-transfer-session?action=upload&token=...
              │     └─ Sets status='uploaded', photo_url=...
              │
              └─ Show "Photo sent!"
```

---

## Security Considerations

| Risk | Mitigation |
|------|------------|
| Token guessing | 32-character hex token (128 bits entropy) |
| Token reuse | Single-use: `status` changes to `'uploaded'` atomically |
| Expired tokens | Hard fail with clear message: `"This link has expired."` |
| Large uploads | Client-side validation (10MB), server rejection |
| Invalid file types | Client validates `image/*`, server double-checks |
| Session hijacking | Session tied to `user_id`, only that user's desktop can receive |

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/components/QRPhotoSession.tsx` | Create | QR display + polling |
| `src/pages/MobilePhotoCaptureRoute.tsx` | Create | Phone capture page |
| `supabase/functions/photo-transfer-session/index.ts` | Create | Session CRUD |
| `supabase/migrations/XXXX_photo_transfer_sessions.sql` | Create | Database table |
| `src/components/TeachHabittaModal.tsx` | Modify | Desktop detection + QR flow |
| `src/hooks/useHomeSystems.ts` | Modify | Accept URL for analysis |
| `supabase/functions/analyze-device-photo/index.ts` | Modify | Fetch from URL |
| `src/pages/AppRoutes.tsx` | Modify | Add `/capture-photo` route |
| `package.json` | Modify | Add `react-qr-code` |

---

## Testing Plan

1. **Desktop flow**: Open TeachHabittaModal on desktop → verify QR appears with countdown
2. **Mobile scan**: Scan QR on phone → verify capture page loads
3. **Photo transfer**: Upload photo on phone → verify desktop receives within 4 seconds
4. **Single-use**: Try uploading second photo → verify rejection (409)
5. **Expiry**: Wait 10 minutes → verify "QR expired" message + regenerate works
6. **Fallback**: Click "I'll upload manually" → verify file picker opens
7. **Modal close**: Close modal mid-flow → verify session cleaned up

