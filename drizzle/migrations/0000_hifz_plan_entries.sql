CREATE TABLE public.hifz_plan_entries (
 user_id uuid NOT NULL,
 id uuid NOT NULL,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hifz_plan_entries TO authenticated;
GRANT ALL ON public.hifz_plan_entries TO service_role;
ALTER TABLE public.hifz_plan_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own memorization program" ON public.hifz_plan_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);