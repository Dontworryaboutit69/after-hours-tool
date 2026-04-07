-- Coverage Checks: one row per business submission
CREATE TABLE IF NOT EXISTS coverage_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Business info (from GBP)
  phone_number TEXT NOT NULL,
  business_name TEXT,
  industry TEXT,
  google_place_id TEXT,
  google_business_data JSONB,

  -- User inputs
  contact_name TEXT,
  contact_phone TEXT,
  email TEXT NOT NULL,
  avg_customer_value NUMERIC,
  has_answering_service BOOLEAN DEFAULT FALSE,
  answering_service_cost NUMERIC,

  -- Check status
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | in_progress | completed | failed

  -- Aggregate results (computed after all calls done)
  calls_answered INTEGER DEFAULT 0,
  calls_total INTEGER DEFAULT 5,
  overall_grade TEXT,
  review_complaints JSONB,
  revenue_impact JSONB,
  ai_analysis TEXT,

  -- Report
  report_sent_at TIMESTAMPTZ,
  report_viewed_at TIMESTAMPTZ,
  converted BOOLEAN DEFAULT FALSE,

  -- Tracking
  ip_address TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Individual call records (5 per check)
CREATE TABLE IF NOT EXISTS coverage_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID NOT NULL REFERENCES coverage_checks(id) ON DELETE CASCADE,

  call_number INTEGER NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  call_type TEXT NOT NULL,  -- immediate | after_hours | before_hours | business_hours_mid | business_hours_afternoon

  -- Twilio data
  twilio_call_sid TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled | in_progress | completed | failed
  answered_by TEXT,
  call_duration INTEGER,
  ring_duration INTEGER,
  raw_twilio_data JSONB,

  fired_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coverage_checks_email ON coverage_checks (email);
CREATE INDEX IF NOT EXISTS idx_coverage_checks_phone ON coverage_checks (phone_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coverage_checks_created ON coverage_checks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coverage_checks_status ON coverage_checks (status) WHERE status IN ('pending', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_coverage_calls_scheduled ON coverage_calls (status, scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_coverage_calls_check ON coverage_calls (check_id);
CREATE INDEX IF NOT EXISTS idx_coverage_calls_sid ON coverage_calls (twilio_call_sid) WHERE twilio_call_sid IS NOT NULL;
