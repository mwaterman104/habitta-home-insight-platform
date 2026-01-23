

# Fix RLS Error on QR Photo Upload

## Problem Identified

The error "new row violates row-level security policy for table 'objects'" occurs because:

1. **Mobile capture page is unauthenticated** - The `/capture-photo` route is public (no auth required by design)
2. **Storage bucket requires auth** - The `home-photos` bucket has an INSERT policy: `auth.uid() = storage.foldername(name)[1]`
3. **No user ID available** - Since `auth.uid()` is null on the mobile page, the upload is blocked

## Solution: Move Upload to Edge Function

Instead of the mobile page uploading directly to storage, it will:
1. Send the image file to the edge function
2. Edge function validates the token
3. Edge function uploads to storage using service role (bypasses RLS)
4. Edge function updates session status and returns success

This is more secure because:
- Token validation and upload are atomic
- No need to add permissive storage policies
- File validation happens server-side

## Technical Changes

### 1. Modify Edge Function: `photo-transfer-session/index.ts`

Update the `upload` action to accept file uploads via FormData:

```typescript
if (action === 'upload' && req.method === 'POST') {
  if (!token) { /* error handling */ }

  // Parse multipart form data
  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  
  if (!file) {
    return new Response(
      JSON.stringify({ error: 'Image file required' }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Validate file
  if (file.size > 10 * 1024 * 1024) { // 10MB
    return new Response(
      JSON.stringify({ error: 'File too large (max 10MB)' }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Verify session is pending (single-use check)
  const { data: session } = await supabaseAdmin
    .from('photo_transfer_sessions')
    .select('id, status, expires_at')
    .eq('session_token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session) {
    return new Response(
      JSON.stringify({ error: 'Session expired or already used' }),
      { status: 409, headers: corsHeaders }
    );
  }

  // Upload to storage using service role (bypasses RLS)
  const ext = file.name.split('.').pop() || 'jpg';
  const storagePath = `transfers/${token}_${Date.now()}.${ext}`;
  
  const { error: uploadError } = await supabaseAdmin.storage
    .from('home-photos')
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type,
    });

  if (uploadError) {
    return new Response(
      JSON.stringify({ error: 'Failed to upload image' }),
      { status: 500, headers: corsHeaders }
    );
  }

  // Get public URL
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('home-photos')
    .getPublicUrl(storagePath);

  // Update session atomically
  await supabaseAdmin
    .from('photo_transfer_sessions')
    .update({ status: 'uploaded', photo_url: publicUrl })
    .eq('id', session.id);

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: corsHeaders }
  );
}
```

### 2. Modify Mobile Page: `MobilePhotoCaptureRoute.tsx`

Update `handleFileChange` to send file to edge function instead of storage:

```typescript
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !token) return;

  // Validate file client-side
  const validationError = validateFile(file);
  if (validationError) {
    setError(validationError);
    setPageState('error');
    return;
  }

  setPreviewUrl(URL.createObjectURL(file));
  setPageState('uploading');

  try {
    // Send file to edge function (which handles storage upload)
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(
      `https://vbcsuoubxyhjhxcgrqco.supabase.co/functions/v1/photo-transfer-session?action=upload&token=${token}`,
      {
        method: 'POST',
        headers: {
          'apikey': 'eyJ...', // anon key
        },
        body: formData, // Send as FormData, not JSON
      }
    );

    const result = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        setPageState('already_used');
        return;
      }
      throw new Error(result.error || 'Upload failed');
    }

    setPageState('success');
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Upload failed');
    setPageState('error');
  }
};
```

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/photo-transfer-session/index.ts` | Accept FormData upload, use service role for storage |
| `src/pages/MobilePhotoCaptureRoute.tsx` | Send file to edge function instead of direct storage upload |

## Flow After Fix

```text
Mobile Phone                    Edge Function                   Storage
     │                               │                              │
     ├── POST /upload?token=xyz ────►│                              │
     │   (FormData with image)       │                              │
     │                               ├── Validate token ───────────►│
     │                               │   (check pending + not expired)
     │                               │                              │
     │                               ├── Upload with service role ─►│
     │                               │   (bypasses RLS)             │
     │                               │                              │
     │                               ├── Update session status      │
     │                               │                              │
     │◄── { success: true } ─────────┤                              │
     │                               │                              │
```

## Security Notes

- Token is still validated before upload
- Single-use enforcement remains (check `status = 'pending'`)
- File size validation happens server-side
- Service role key is never exposed to client
- Storage policies remain strict for direct uploads

