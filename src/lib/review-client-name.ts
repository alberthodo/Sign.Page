const STORAGE_PREFIX = "signoff-review-client-name:";

export function getStoredClientName(token: string): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${token}`) ?? "";
  } catch {
    return "";
  }
}

export function setStoredClientName(token: string, name: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = name.trim();
    if (!trimmed) {
      localStorage.removeItem(`${STORAGE_PREFIX}${token}`);
      return;
    }
    localStorage.setItem(`${STORAGE_PREFIX}${token}`, trimmed);
  } catch {
    // ignore quota / private mode
  }
}
