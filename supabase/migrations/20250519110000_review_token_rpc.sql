-- Public review lookup by token (SECURITY DEFINER bypasses RLS for valid tokens only)

CREATE OR REPLACE FUNCTION public.get_review_by_token(p_token text)
RETURNS TABLE (
  token_id uuid,
  project_id uuid,
  token text,
  expires_at timestamptz,
  access_count integer,
  token_created_at timestamptz,
  id uuid,
  user_id uuid,
  title text,
  assets text[],
  status public.project_status,
  client_feedback text,
  approved_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rt.id AS token_id,
    rt.project_id,
    rt.token,
    rt.expires_at,
    rt.access_count,
    rt.created_at AS token_created_at,
    p.id,
    p.user_id,
    p.title,
    p.assets,
    p.status,
    p.client_feedback,
    p.approved_at,
    p.created_at,
    p.updated_at
  FROM public.review_tokens rt
  INNER JOIN public.projects p ON p.id = rt.project_id
  WHERE rt.token = p_token
    AND (rt.expires_at IS NULL OR rt.expires_at > now());
$$;

REVOKE ALL ON FUNCTION public.get_review_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_review_by_token(text) TO service_role;

CREATE OR REPLACE FUNCTION public.bump_review_token_access(p_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.review_tokens
  SET access_count = access_count + 1
  WHERE token = p_token;
$$;

REVOKE ALL ON FUNCTION public.bump_review_token_access(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_review_token_access(text) TO service_role;
