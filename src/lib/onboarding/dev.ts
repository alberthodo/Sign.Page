/**
 * When true in development, visiting /onboarding/getting-started clears
 * completed_onboarding so you can run the flow again. Set
 * SIGNOFF_ONBOARDING_ALWAYS_NEW=false to hide the dev banner only.
 *
 * Defaults to true in development.
 */
export function isOnboardingDevForceNewUser(): boolean {
  const explicit = process.env.SIGNOFF_ONBOARDING_ALWAYS_NEW?.trim().toLowerCase();
  if (explicit === "false") return false;
  if (explicit === "true") return true;
  return process.env.NODE_ENV === "development";
}
