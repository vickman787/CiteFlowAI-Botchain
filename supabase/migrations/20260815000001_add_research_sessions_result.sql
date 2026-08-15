-- research_sessions.result stores the completed research payload
-- ({answer, citationsUsed, purchasedSources}), written by /api/research and
-- read back by /api/research/history. Missing from the original migration
-- files (schema drift — added ad-hoc to the original project's live DB at
-- some point, same class of gap as the source_chunks INSERT policy).
ALTER TABLE public.research_sessions
    ADD COLUMN IF NOT EXISTS result JSONB;
