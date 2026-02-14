
## Fix: Broken Onboarding Route + Smart Post-Auth Redirect

### Changes

#### 1. `src/pages/AddHomePage.tsx` — Fix broken redirect
Change `navigate('/onboarding/start')` to `navigate('/onboarding')`. This is the primary blocker.

#### 2. `src/pages/OnboardingPersonalization.tsx`, `OnboardingUnknowns.tsx`, `OnboardingSnapshot.tsx` — Fix fallback redirects
Change all three occurrences of `/onboarding/start` to `/onboarding`.

#### 3. `src/pages/AuthPage.tsx` — Smart post-auth redirect

The current `useEffect` blindly sends all authenticated users to `/dashboard`. For brand-new users (no homes), this creates friction since they land on an empty dashboard and must click "Add Your Home."

**The fix**: When `user` becomes truthy, query `homes` table for that user. If `count === 0`, redirect to `/onboarding`. If `count > 0`, redirect to `/dashboard`.

This handles the QA concern about returning users: a user with 3 homes will never see onboarding.

**Double-protection**: `OnboardingFlow` itself (line 172) already redirects users who have homes back to `/dashboard`, so even if the query races, the user won't get stuck.

#### 4. Race condition (edge function vs. dashboard) — Already handled

The `OnboardingFlow` component already has a multi-step flow: address entry, handshake, snapshot reveal, systems step, and a **completion screen** (`OnboardingComplete`). Only when the user clicks "Continue" on the completion screen does it navigate to `/dashboard`. By that point, the `create-home` edge function has long finished (it fires on address selection, which is step 1 of 5). No additional polling needed.

### Technical Details

**AuthPage.tsx redirect logic:**
```text
useEffect:
  if (!user) return
  query homes where user_id = user.id, count only
  if count === 0 -> navigate('/onboarding')
  if count > 0  -> navigate('/dashboard')
```

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/AddHomePage.tsx` | `/onboarding/start` to `/onboarding` |
| `src/pages/OnboardingPersonalization.tsx` | `/onboarding/start` to `/onboarding` |
| `src/pages/OnboardingUnknowns.tsx` | `/onboarding/start` to `/onboarding` |
| `src/pages/OnboardingSnapshot.tsx` | `/onboarding/start` to `/onboarding` |
| `src/pages/AuthPage.tsx` | Smart redirect: check homes count before choosing `/onboarding` vs `/dashboard` |
