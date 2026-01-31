
# Landing Page Copy Rewrite — Home Intelligence Doctrine

## Overview
Complete rewrite of `src/pages/LandingPage.tsx` to align with the new mission and copy doctrine. The page shifts from task-management/DIY framing to calm, confident home intelligence positioning.

---

## Section-by-Section Changes

### 1. Hero Section

| Element | Current Copy | New Copy |
|---------|--------------|----------|
| **Headline** | "Your Home. Smarter." | "Your home, understood." |
| **Subheadline** | "Habitta helps you understand, maintain, and improve your home — from looking to living." | "Habitta continuously evaluates your home's condition, risk, and future costs — so you can make smart decisions before things break." |
| **Primary CTA** | "Join the Waitlist" | "Join Early Access" |
| **Secondary CTA** | "Preview the App" | "Preview the App" (unchanged) |

---

### 2. Preview Section ("What Habitta Does")

| Element | Current Copy | New Copy |
|---------|--------------|----------|
| **Headline** | "A complete picture of your home's health." | "A complete picture of your home's health." (unchanged) |
| **Intro** | "Everything you need to care for your home, powered by intelligent insights." | "Habitta builds and maintains a living model of your home — combining system lifespans, regional stress, usage patterns, and financial impact." |

**Capability Cards (Rewritten):**

| Current | New |
|---------|-----|
| **Predictive Insights**: "Know when to repair or replace major systems before they fail." | **Predictive Insight**: "See which systems are approaching risk windows — and what that realistically means for cost and timing." |
| **Smart Maintenance**: "Get proactive tasks and seasonal recommendations tailored to your home." | **Deliberate Maintenance**: "Maintenance isn't about doing more. It's about doing the right things at the right time." |
| **DIY + Pros**: "Guided help for every home project — or connect with local professionals." | **Guided Execution**: "When action is needed, Habitta connects insight to clear next steps — DIY or professional." |
| **Financial Forecasts**: "Plan future costs with confidence using AI-powered predictions." | **Capital Awareness**: "Understand how repairs, upgrades, and timing affect the long-term value of your home." |

---

### 3. New Philosophy Section (Insert After Preview)

This is a **new section** that establishes Habitta's core value proposition.

**Headline:** "Not a to-do list. A second brain."

**Body:**
> Most homeowners don't want another app to manage.  
> They want confidence that someone is paying attention.
>
> Habitta doesn't ask you to check in daily.  
> It quietly watches, evaluates, and surfaces what matters — when it matters.

---

### 4. "Why Habitta" Section → "Who It's For"

| Element | Current Copy | New Copy |
|---------|--------------|----------|
| **Headline** | "Built for every homeowner." | "Built for real homeowners." |
| **Intro** | "From first-time buyers to seasoned owners, Habitta makes home care simple." | "From first-time buyers to seasoned owners, Habitta adapts to where you are — not where a checklist thinks you should be." |

**Feature Cards → Ownership Stage Cards:**

Replace the 4 generic feature cards with 3 ownership-stage cards:

| Card | Title | Description |
|------|-------|-------------|
| 1 | **Early Ownership** | "Establish a clear baseline and eliminate unknowns." |
| 2 | **Mid-Lifecycle** | "Anticipate major systems before surprises hit." |
| 3 | **Long-Term Ownership** | "Plan upgrades, exits, and capital investments with clarity." |

---

### 5. New Features Section (Insert After "Who It's For")

Reframed features that explain *why* they exist:

| Feature | Title | Description |
|---------|-------|-------------|
| 1 | **Prevent Surprises** | "Habitta flags risk before it becomes emergency." |
| 2 | **Track What Matters** | "Not everything. Only what changes decisions." |
| 3 | **Plan with Confidence** | "Step-by-step guidance when action is justified — not before." |
| 4 | **Organized History** | "A clean, reliable record of your home over time." |

---

### 6. Waitlist Section

| Element | Current Copy | New Copy |
|---------|--------------|----------|
| **Headline** | "Get early access." | "Early access to home intelligence." |
| **Body** | "Join the waitlist to be the first to experience the Habitta app." | "We're rolling Habitta out carefully. Join the waitlist to be among the first homeowners with a clear picture of what lies ahead." |

---

## Icon Updates

To align with the new framing, update icons:

| Section | Current Icon | New Icon |
|---------|--------------|----------|
| Predictive Insight | Brain | Eye |
| Deliberate Maintenance | Wrench | Clock |
| Guided Execution | Hammer | ArrowRight |
| Capital Awareness | DollarSign | TrendingUp |
| Early Ownership | - | Home |
| Mid-Lifecycle | - | Activity |
| Long-Term Ownership | - | Target |

---

## Structural Changes

The page will have this new flow:

```text
1. Header (unchanged)
2. Hero (updated copy)
3. Preview/Capabilities (updated copy + icons)
4. Philosophy (NEW section)
5. Who It's For (replaces "Why Habitta", 3 ownership cards)
6. Features (NEW section, 4 reframed cards)
7. Waitlist (updated copy)
8. Footer (unchanged)
```

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/pages/LandingPage.tsx` | Complete copy rewrite, add 2 new sections, restructure existing sections, update icon imports |

### Copy Governance Rules Applied
- No "manage your home," "stay on top of," "never forget," "all-in-one"
- No "AI-powered" without context
- No exclamation points or emoji
- Calm, declarative sentences
- Stewardship language over tool language
