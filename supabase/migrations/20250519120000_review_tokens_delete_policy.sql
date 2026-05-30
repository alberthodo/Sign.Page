-- Allow freelancers to replace client links (regenerate flow)

CREATE POLICY "Users can delete tokens for own projects"
  ON public.review_tokens
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = review_tokens.project_id
        AND projects.user_id = auth.uid()
    )
  );
