
-- ============================================================
-- HOME ASSETS (VIN Layer) — durable identity per physical thing
-- ============================================================
CREATE TABLE public.home_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id uuid NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  category text NOT NULL,              -- appliance | system | structure
  kind text NOT NULL,                  -- washing_machine | hvac | roof | etc.
  manufacturer text,
  model text,
  serial text,
  install_date date,
  removal_date date,
  status text NOT NULL DEFAULT 'active',  -- active | replaced | removed | unknown
  source text NOT NULL,                -- chat | photo | permit | pro | manual
  confidence integer NOT NULL DEFAULT 50, -- 0-100
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_home_assets_home_kind ON public.home_assets (home_id, kind);
CREATE INDEX idx_home_assets_user ON public.home_assets (user_id);

-- Updated_at trigger
CREATE TRIGGER update_home_assets_updated_at
  BEFORE UPDATE ON public.home_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.home_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own home assets"
  ON public.home_assets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create home assets"
  ON public.home_assets FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own home assets"
  ON public.home_assets FOR UPDATE
  USING (user_id = auth.uid());

-- No DELETE policy — assets are never hard-deleted, only status-transitioned

-- Service role bypass for AI-initiated writes
CREATE POLICY "Service role full access to home assets"
  ON public.home_assets FOR ALL
  USING (auth.role() = 'service_role');


-- ============================================================
-- HOME EVENTS (Immutable Ledger) — append-only audit trail
-- ============================================================
CREATE TABLE public.home_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id uuid NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  asset_id uuid REFERENCES public.home_assets(id),
  event_type text NOT NULL,            -- system_discovered | issue_reported | diagnosis | recommendation | repair_completed | maintenance_performed | replacement | user_decision | contractor_referred | status_change
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'info',   -- info | minor | moderate | major
  status text NOT NULL DEFAULT 'open',     -- open | in_progress | resolved | deferred
  cost_estimated jsonb,                    -- {low: 150, high: 400}
  cost_actual numeric,
  source text NOT NULL,                    -- chat | photo | pro | permit | manual
  related_event_id uuid REFERENCES public.home_events(id),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- No updated_at column — events are immutable

-- Indexes
CREATE INDEX idx_home_events_home ON public.home_events (home_id);
CREATE INDEX idx_home_events_asset ON public.home_events (asset_id);
CREATE INDEX idx_home_events_related ON public.home_events (related_event_id);
CREATE INDEX idx_home_events_status ON public.home_events (home_id, status) WHERE status = 'open';

-- RLS — append-only: INSERT + SELECT only, no UPDATE or DELETE
ALTER TABLE public.home_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own home events"
  ON public.home_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert home events"
  ON public.home_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Explicitly: NO UPDATE policy, NO DELETE policy
-- Status changes are new events linked via related_event_id

-- Service role bypass for AI-initiated writes
CREATE POLICY "Service role full access to home events"
  ON public.home_events FOR ALL
  USING (auth.role() = 'service_role');
