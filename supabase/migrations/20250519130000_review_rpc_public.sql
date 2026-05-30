-- Client review via RPC + anon key (no service_role required on the review page)

GRANT EXECUTE ON FUNCTION public.get_review_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bump_review_token_access(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.approve_review_by_token(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  SELECT rt.project_id INTO v_project_id
  FROM public.review_tokens rt
  INNER JOIN public.projects p ON p.id = rt.project_id
  WHERE rt.token = p_token
    AND (rt.expires_at IS NULL OR rt.expires_at > now())
    AND p.status = 'active';

  IF v_project_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.projects
  SET
    status = 'approved',
    approved_at = now()
  WHERE id = v_project_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_changes_by_token(
  p_token text,
  p_feedback text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_notes text;
BEGIN
  v_notes := trim(p_feedback);

  IF v_notes = '' THEN
    RETURN false;
  END IF;

  SELECT rt.project_id INTO v_project_id
  FROM public.review_tokens rt
  INNER JOIN public.projects p ON p.id = rt.project_id
  WHERE rt.token = p_token
    AND (rt.expires_at IS NULL OR rt.expires_at > now())
    AND p.status = 'active';

  IF v_project_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.projects
  SET
    status = 'changes_requested',
    client_feedback = v_notes
  WHERE id = v_project_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_review_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_changes_by_token(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.approve_review_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_changes_by_token(text, text) TO anon, authenticated, service_role;
