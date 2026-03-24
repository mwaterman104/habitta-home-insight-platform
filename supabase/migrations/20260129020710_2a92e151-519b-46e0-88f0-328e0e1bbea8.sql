-- ============================================================
-- PHASE 1: INTERVENTION ARCHITECTURE SCHEMA
-- ============================================================

-- 1.1 Modify homes table: Add per-home intervention threshold
ALTER TABLE homes ADD COLUMN IF NOT EXISTS
  intervention_threshold INTEGER DEFAULT 1000 NOT NULL;

-- 1.2 Modify home_systems table: Add intervention tracking columns
ALTER TABLE home_systems 
  ADD COLUMN IF NOT EXISTS baseline_strength INTEGER CHECK(baseline_strength >= 0 AND baseline_strength <= 100),
  ADD COLUMN IF NOT EXISTS risk_outlook_12mo INTEGER CHECK(risk_outlook_12mo >= 0 AND risk_outlook_12mo <= 100),
  ADD COLUMN IF NOT EXISTS estimated_impact_cost JSONB,
  ADD COLUMN IF NOT EXISTS intervention_score DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS intervention_score_calculated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_state_change VARCHAR(50),
  ADD COLUMN IF NOT EXISTS last_state_change_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_decision_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_decision_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS installation_verified BOOLEAN DEFAULT false;

-- 1.3 Create interventions table (Planning Sessions)
CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID REFERENCES homes(id) ON DELETE CASCADE,
  system_id UUID REFERENCES home_systems(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Trigger information
  trigger_reason VARCHAR(50) NOT NULL CHECK(trigger_reason IN (
    'risk_threshold_crossed',
    'seasonal_risk_event',
    'financial_planning_window',
    'user_initiated',
    'new_evidence_arrived'
  )),
  
  -- Scores at time of trigger
  intervention_score DECIMAL(10,2) NOT NULL,
  intervention_threshold_used INTEGER NOT NULL,
  
  -- Evidence snapshots
  risk_outlook_snapshot INTEGER NOT NULL,
  baseline_strength_snapshot INTEGER NOT NULL,
  comparable_homes_count INTEGER,
  data_sources JSONB,
  
  -- Urgency premium calculation
  urgency_premium_snapshot INTEGER DEFAULT 0,
  urgency_factors_snapshot JSONB,
  
  -- Session state
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  closed_reason VARCHAR(50) CHECK(closed_reason IN (
    'decision_made',
    'user_deferred',
    'closed_without_decision',
    'timed_out'
  )),
  
  -- Rate limiting
  cooldown_until TIMESTAMPTZ,
  
  -- Persisted conversation (CRITICAL: not regenerated)
  messages JSONB NOT NULL DEFAULT '[]',
  message_order TEXT[] NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interventions_active ON interventions(home_id) 
  WHERE closed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_interventions_cooldown ON interventions(system_id, cooldown_until);
CREATE INDEX IF NOT EXISTS idx_interventions_stale ON interventions(last_viewed_at) 
  WHERE closed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_interventions_user ON interventions(user_id);

-- 1.4 Create decision_events table
CREATE TABLE IF NOT EXISTS decision_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID REFERENCES homes(id) ON DELETE CASCADE,
  system_id UUID REFERENCES home_systems(id) ON DELETE CASCADE,
  intervention_id UUID REFERENCES interventions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Decision made
  decision_type VARCHAR(50) NOT NULL CHECK(decision_type IN (
    'replace_now',
    'defer_with_date',
    'schedule_inspection',
    'schedule_maintenance',
    'no_action',
    'get_quotes'
  )),
  
  -- Timeline
  defer_until TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  
  -- Financial snapshot (all assumptions at decision time)
  assumptions_json JSONB NOT NULL,
  
  -- Additional context
  user_notes TEXT,
  contractor_selected_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_events_system ON decision_events(system_id);
CREATE INDEX IF NOT EXISTS idx_decision_events_review ON decision_events(next_review_at)
  WHERE next_review_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decision_events_intervention ON decision_events(intervention_id)
  WHERE intervention_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decision_events_user ON decision_events(user_id);

-- 1.5 Create risk_contexts table
CREATE TABLE IF NOT EXISTS risk_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Location
  state TEXT NOT NULL,
  climate_zone TEXT NOT NULL,
  
  -- Active conditions
  hurricane_season BOOLEAN DEFAULT false,
  freeze_warning BOOLEAN DEFAULT false,
  heat_wave BOOLEAN DEFAULT false,
  
  -- Contractor market
  peak_season_hvac BOOLEAN DEFAULT false,
  peak_season_roofing BOOLEAN DEFAULT false,
  
  -- Temporal
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_contexts_location ON risk_contexts(state, climate_zone);
CREATE INDEX IF NOT EXISTS idx_risk_contexts_active ON risk_contexts(valid_from, valid_until);

-- Enable RLS on new tables
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_contexts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interventions
CREATE POLICY "Users can view their own interventions"
  ON interventions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interventions"
  ON interventions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interventions"
  ON interventions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for decision_events
CREATE POLICY "Users can view their own decision events"
  ON decision_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own decision events"
  ON decision_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for risk_contexts (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view risk contexts"
  ON risk_contexts FOR SELECT
  TO authenticated
  USING (true);

-- Trigger for updated_at on interventions
CREATE OR REPLACE FUNCTION update_interventions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_interventions_updated_at ON interventions;
CREATE TRIGGER trigger_interventions_updated_at
  BEFORE UPDATE ON interventions
  FOR EACH ROW
  EXECUTE FUNCTION update_interventions_updated_at();