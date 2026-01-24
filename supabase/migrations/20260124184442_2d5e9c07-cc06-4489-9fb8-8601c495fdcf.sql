-- Engagement Cadence System Tables
-- Tracks stewardship rhythm: monthly validation, quarterly position, annual brief

-- Home review state (cadence tracking)
CREATE TABLE home_review_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  home_state TEXT NOT NULL DEFAULT 'healthy' CHECK (home_state IN ('healthy', 'monitoring', 'planning')),
  last_monthly_check TIMESTAMPTZ,
  last_quarterly_review TIMESTAMPTZ,
  last_annual_report TIMESTAMPTZ,
  last_optional_advantage TIMESTAMPTZ,
  next_scheduled_review TIMESTAMPTZ,
  confidence_score DECIMAL(4,3) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(home_id)
);

-- Enable RLS
ALTER TABLE home_review_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can access their own homes' review state
CREATE POLICY "Users can view their homes review state"
  ON home_review_state
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM homes 
      WHERE homes.id = home_review_state.home_id 
      AND homes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their homes review state"
  ON home_review_state
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM homes 
      WHERE homes.id = home_review_state.home_id 
      AND homes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their homes review state"
  ON home_review_state
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM homes 
      WHERE homes.id = home_review_state.home_id 
      AND homes.user_id = auth.uid()
    )
  );

-- Home interactions log (for confidence adjustments and cadence responses)
CREATE TABLE home_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('monthly_confirm', 'quarterly_dismissed', 'advantage_dismissed', 'annual_viewed', 'system_replaced', 'renovation', 'insurance_update')),
  response_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE home_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their homes interactions"
  ON home_interactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM homes 
      WHERE homes.id = home_interactions.home_id 
      AND homes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their homes interactions"
  ON home_interactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM homes 
      WHERE homes.id = home_interactions.home_id 
      AND homes.user_id = auth.uid()
    )
  );

-- Add indexes for common queries
CREATE INDEX idx_home_review_state_home_id ON home_review_state(home_id);
CREATE INDEX idx_home_review_state_state ON home_review_state(home_state);
CREATE INDEX idx_home_interactions_home_id ON home_interactions(home_id);
CREATE INDEX idx_home_interactions_type ON home_interactions(interaction_type);
CREATE INDEX idx_home_interactions_created ON home_interactions(created_at DESC);

-- Updated_at trigger for home_review_state
CREATE TRIGGER update_home_review_state_updated_at
  BEFORE UPDATE ON home_review_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();