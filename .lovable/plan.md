
# Cinematic Background Video for Landing Page

## Overview

Add an immersive, premium video background to the hero section that evokes "home as sanctuary" while maintaining perfect text readability and brand alignment.

---

## Video Strategy (Based on Your Feedback)

### Approach: Cinemagraph-Style "Living Gradient"

Rather than a full-motion video, we'll use footage with **minimal, hypnotic movement**:
- Morning light slowly shifting across a surface
- Soft curtains barely moving
- Steam rising from a coffee cup (if visible)
- Rain gently streaking a window

This creates the "alive" feeling without distraction.

### Video Source

We'll use a high-quality stock video URL from Pexels. For immediate implementation, I'll use:

**Primary:** Warm morning light through sheer curtains (abstract, textural)
- POV/first-person perspective
- Slow, barely-perceptible motion
- Golden hour color grading that complements the cream/green palette

The URL will be configurable for easy swapping if you find better footage or commission custom.

---

## Implementation

### New Component: `VideoBackground.tsx`

```text
src/components/
  VideoBackground.tsx  <- New reusable component
```

**Features:**
- Full-bleed video with `object-cover` scaling
- Muted, autoplay, loop (seamless)
- Brand-aligned overlay gradient (primary green → cream)
- Graceful fallback to animated gradient
- `prefers-reduced-motion` support
- Slow connection detection (`navigator.connection`)
- Mobile: poster image only (no video on < 768px)

### Component Structure

```text
┌─────────────────────────────────────────────────────────┐
│ <VideoBackground>                                       │
│   ├─ <video> (absolute, z-0)                            │
│   │    ├─ poster="first-frame.jpg" (loading state)      │
│   │    ├─ <source type="video/mp4">                     │
│   │    └─ <source type="video/webm">                    │
│   ├─ <div> Overlay gradient (z-10)                      │
│   │    └─ from-primary/50 via-background/40 to-background│
│   └─ {children} Content (z-20)                          │
│        └─ text-shadow for extra safety                  │
└─────────────────────────────────────────────────────────┘
```

### Integration in LandingPage

Wrap the hero section content with VideoBackground:

**Current (lines 79-114):**
```jsx
<section className="relative pt-24 pb-20 ...">
  <div className="absolute inset-0 bg-gradient-to-b ..." />
  {/* Content */}
</section>
```

**After:**
```jsx
<VideoBackground 
  videoUrl="https://videos.pexels.com/..."
  posterUrl="/hero-poster.jpg"
  overlayClassName="from-primary/50 via-background/40 to-background"
>
  <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
    {/* Same hero content, now with text-shadow */}
  </section>
</VideoBackground>
```

---

## Technical Details

### Video Requirements

| Property | Value |
|----------|-------|
| Format | MP4 (H.264) primary, WebM fallback |
| Resolution | 1920x1080 (scales responsively) |
| Duration | 20-40 seconds (seamless loop) |
| Target size | < 5MB |
| Audio | None (muted attribute) |
| Loop point | Imperceptible transition |

### Performance & Accessibility

1. **Reduced Motion**: If `prefers-reduced-motion: reduce`, show static poster with subtle CSS gradient animation instead

2. **Slow Connection Detection**:
```typescript
const connection = (navigator as any).connection;
const isSlow = connection?.effectiveType === '2g' || 
               connection?.effectiveType === 'slow-2g';
if (isSlow) return <GradientFallback />;
```

3. **Mobile Strategy**: No video on screens < 768px - use poster image with animated gradient overlay

4. **Text Readability Safety Net**:
```css
.hero-text {
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
```

### Brand-Aligned Overlay

The overlay gradient will use Habitta's colors:
- Top: `primary/50` (deep green, 50% opacity)
- Middle: `background/40` (cream, 40% opacity) 
- Bottom: `background` (solid cream, seamless transition to next section)

This ensures the video enhances rather than fights the brand.

### Fallback Behavior

If video fails to load or is disabled:
```text
┌─────────────────────────────────────────────┐
│  Animated gradient background               │
│  (subtle shift between primary/accent)      │
│  + Floating soft glow effects               │
└─────────────────────────────────────────────┘
```

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `src/components/VideoBackground.tsx` | Reusable video background with fallback |

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/LandingPage.tsx` | Wrap hero with VideoBackground, add text-shadow utility |
| `src/index.css` | Add `.hero-text-shadow` utility class |

---

## Video Candidates (Pexels - Free, No Attribution)

1. **Warm Light Through Curtains** 
   - Abstract, textural
   - Golden tones complement brand
   - Minimal motion

2. **Rain on Glass (Interior POV)**
   - Cozy, contemplative mood
   - Perfect loop potential
   - Universal "home" feeling

3. **Morning Kitchen Scene (Soft Focus)**
   - Steam, light play
   - Warm and inviting
   - Avoids "stock family" problem

The component will accept a `videoUrl` prop so you can easily swap videos without code changes.

---

## Result

The landing page hero will transform from a static gradient to an immersive "living" background that:

- Evokes feelings of home comfort and sanctuary
- Uses barely-perceptible motion (cinemagraph style)
- Maintains perfect text contrast with overlay + shadow
- Degrades gracefully on slow connections and mobile
- Respects accessibility preferences
- Aligns with Habitta's calm, intelligent brand voice

The video will feel like a "breathing" background rather than competing for attention.
