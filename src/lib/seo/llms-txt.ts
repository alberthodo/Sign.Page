import { getAppName } from "@/lib/app-name";
import { getSiteUrl } from "@/lib/site-url";

function getGithubRepoUrl(): string {
  return (
    process.env.NEXT_PUBLIC_GITHUB_REPO_URL?.trim() ||
    "https://github.com/alberthodo/Sign.Page"
  );
}

export function buildLlmsTxt(): string {
  const appName = getAppName();
  const siteUrl = getSiteUrl();
  const githubUrl = getGithubRepoUrl();
  const selfHostUrl = `${githubUrl}/blob/main/docs/self-host.md`;

  return `# ${appName}

> Milestone sign-off for freelancers — one link per round, approve or request changes, no client account, open source.

## Product
- ${siteUrl}/ — Client approval software for freelancers
- ${siteUrl}/login — Sign in to ${appName} Cloud

## Developers
- ${githubUrl} — Open source repository
- ${selfHostUrl} — Self-host guide

## FAQ
- ${siteUrl}/#faq — Client approval FAQ (no client account, deliverables, vs proofing tools, self-host)
`;
}
