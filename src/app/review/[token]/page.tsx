import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectLiveRefresh } from "@/components/project-live-refresh";
import { ReviewWorkspace } from "@/components/review-workspace";
import { privateAppRouteMetadata } from "@/lib/seo/app-routes";
import { getReviewByToken, isReviewOpenForActions, normalizeReviewToken } from "@/lib/review";

export const metadata: Metadata = privateAppRouteMetadata;

export const dynamic = "force-dynamic";

type ReviewPageProps = {
  params: Promise<{ token: string }>;
};

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { token: rawToken } = await params;
  const token = normalizeReviewToken(rawToken);
  const review = await getReviewByToken(token, { recordAccess: true });

  if (!review) {
    notFound();
  }

  const { project, subject, scope, folders } = review;
  const isProjectScope = scope === "project";
  const folderScopeName =
    scope === "folder" ? (subject.folderName ?? folders[0]?.name) : null;

  return (
    <div className="min-h-screen bg-background">
      <ProjectLiveRefresh
        projectId={project.id}
        enabled={isReviewOpenForActions(review)}
      />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <ReviewWorkspace token={token} review={review} isProjectScope={isProjectScope} />
      </main>
    </div>
  );
}
