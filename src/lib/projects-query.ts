/** Shared Supabase select for owner project views */
export const PROJECT_WITH_TOKEN_SELECT = `
  id,
  user_id,
  title,
  project_type,
  description,
  assets,
  status,
  client_feedback,
  approved_at,
  created_at,
  updated_at,
  review_tokens ( token, folder_id, scope )
` as const;

export const PROJECT_FOLDER_SELECT = `
  id,
  project_id,
  name,
  visibility,
  assets,
  content_blocks,
  status,
  client_feedback,
  approved_at,
  sort_order,
  created_at,
  updated_at,
  review_tokens ( token )
` as const;

export const PROJECT_WITH_FOLDERS_SELECT = `
  ${PROJECT_WITH_TOKEN_SELECT},
  project_folders (
    ${PROJECT_FOLDER_SELECT}
  )
` as const;
