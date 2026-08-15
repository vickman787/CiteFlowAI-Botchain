-- source_chunks had RLS enabled with only a SELECT policy, so every chunk
-- insert from the registration pipeline (using the regular RLS-scoped
-- client, not the admin client) was silently denied by Postgres's
-- default-deny — sources registered successfully with zero retrievable
-- content. Ownership is already verified in application code
-- (resolveOwningIdentity) before this point, same trust model as the
-- existing "Users can insert sources" policy on public.sources.
CREATE POLICY "Users can insert source chunks"
    ON public.source_chunks
    FOR INSERT
    WITH CHECK (true);
