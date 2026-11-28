-- Nkabom Ghana — Supabase PostgreSQL Schema, Storage Buckets & RLS Policies
-- Run this entire script once in the Supabase Dashboard -> SQL Editor.

-- 1. Core tables
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL DEFAULT 'supabase_auth',
  terms_accepted_at TIMESTAMPTZ NOT NULL,
  terms_version TEXT NOT NULL,
  trial_claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workers (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('Personal', 'Business')),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  area TEXT NOT NULL,
  phone TEXT NOT NULL,
  years INTEGER NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  availability TEXT NOT NULL DEFAULT 'available',
  availability_note TEXT NOT NULL DEFAULT '',
  availability_updated_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  rate_note TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  photo_path TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'suspended')),
  tint INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent column upgrades for existing Supabase deployments
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS availability_note TEXT NOT NULL DEFAULT '';
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS availability_updated_at TIMESTAMPTZ;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feedback_invites (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  worker_id TEXT NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.feedback (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  invite_id TEXT UNIQUE NOT NULL REFERENCES public.feedback_invites(id) ON DELETE CASCADE,
  blaze INTEGER NOT NULL DEFAULT 0,
  rating INTEGER,
  testimonial TEXT,
  client_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'removed')),
  ip_hash TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  worker_id TEXT PRIMARY KEY REFERENCES public.workers(id) ON DELETE CASCADE,
  trial_ends_at TIMESTAMPTZ NOT NULL,
  paid_until TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  amount_pesewas INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  paystack_reference TEXT UNIQUE NOT NULL,
  channel TEXT NOT NULL DEFAULT 'mobile_money',
  status TEXT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  raw_event TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trial_phone_claims (
  normalized_phone TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  reporter_contact TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL,
  type TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bookmarks (
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  worker_id TEXT NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, worker_id)
);

CREATE TABLE IF NOT EXISTS public.worker_events (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'wa_click')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  doc_ref TEXT NOT NULL DEFAULT '',
  doc_path TEXT,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.client_passes (
  code TEXT PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  recovery_pin_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_pass_searches (
  id TEXT PRIMARY KEY,
  pass_code TEXT NOT NULL REFERENCES public.client_passes(code) ON DELETE CASCADE,
  query TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_pass_bookmarks (
  pass_code TEXT NOT NULL REFERENCES public.client_passes(code) ON DELETE CASCADE,
  worker_id TEXT NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pass_code, worker_id)
);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_workers_status ON public.workers(status);
CREATE INDEX IF NOT EXISTS idx_workers_user_id ON public.workers(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_workers_slug ON public.workers(slug);
CREATE INDEX IF NOT EXISTS idx_portfolio_worker ON public.portfolio_items(worker_id);
CREATE INDEX IF NOT EXISTS idx_feedback_worker_status ON public.feedback(worker_id, status);
CREATE INDEX IF NOT EXISTS idx_invites_worker ON public.feedback_invites(worker_id);
CREATE INDEX IF NOT EXISTS idx_payments_worker ON public.payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_events_lookup ON public.worker_events(worker_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON public.verification_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_verifications_worker ON public.verification_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_client_pass_searches_pass ON public.client_pass_searches(pass_code, searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_pass_bookmarks_pass ON public.client_pass_bookmarks(pass_code, created_at DESC);

-- 3. Row Level Security (RLS)
-- Nkabom routes all API calls through our Express backend using SUPABASE_SERVICE_ROLE_KEY.
-- Enabling RLS with no permissive anon/authenticated policies blocks all direct public Data API access.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_phone_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_pass_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_pass_bookmarks ENABLE ROW LEVEL SECURITY;

-- 4. Storage buckets (public media + private ID verification docs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('nkabom-media', 'nkabom-media', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('nkabom-verifications', 'nkabom-verifications', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Allow public read-only delivery ONLY for nkabom-media (profile & portfolio images).
-- Verification documents in nkabom-verifications stay strictly private and are streamed only to authenticated admins.
DROP POLICY IF EXISTS "Public read nkabom-media" ON storage.objects;
CREATE POLICY "Public read nkabom-media"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'nkabom-media');
