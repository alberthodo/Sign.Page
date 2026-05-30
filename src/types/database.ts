export type ProjectStatus =
  | "draft"
  | "active"
  | "approved"
  | "changes_requested";

export type FolderVisibility = "public" | "hidden";

export type OnboardingPlan = "personal" | "pro";

export type OnboardingStatus =
  | "not_started"
  | "plan_selected"
  | "profile_complete"
  | "invites_complete"
  | "payment_complete"
  | "complete";

export type Profile = {
  id: string;
  email: string;
  company_name: string | null;
  display_name: string | null;
  onboarding_plan: OnboardingPlan | null;
  onboarding_status: OnboardingStatus;
  completed_onboarding: boolean;
  team_size: string | null;
  job_title: string | null;
  industry: string | null;
  referral_source: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OnboardingTeamInvite = {
  id: string;
  inviter_id: string;
  email: string;
  created_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  title: string;
  project_type: string | null;
  description: string | null;
  assets: string[];
  status: ProjectStatus;
  client_feedback: string | null;
  approved_at: string | null;
  client_approved_by_name: string | null;
  client_signature: string | null;
  created_at: string;
  updated_at: string;
};

import type { FolderContentBlock } from "@/lib/folder-content";

export type ProjectFolder = {
  id: string;
  project_id: string;
  name: string;
  visibility: FolderVisibility;
  assets: string[];
  content_blocks: FolderContentBlock[];
  status: ProjectStatus;
  client_feedback: string | null;
  approved_at: string | null;
  client_approved_by_name: string | null;
  client_signature: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ReviewToken = {
  id: string;
  project_id: string;
  folder_id: string | null;
  scope?: "project" | "folder" | "selection";
  allowed_folder_ids?: string[] | null;
  token: string;
  expires_at: string | null;
  access_count: number;
  created_at: string;
};

export type ProjectWithToken = Project & {
  review_tokens: Pick<ReviewToken, "token" | "folder_id" | "scope">[] | null;
};

export type ProjectFolderWithToken = ProjectFolder & {
  review_tokens: Pick<ReviewToken, "token">[] | null;
};

export type ProjectWithFolders = ProjectWithToken & {
  project_folders: ProjectFolderWithToken[];
};
