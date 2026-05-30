import { randomBytes } from "crypto";

export function generateReviewToken(): string {
  return `tok_${randomBytes(32).toString("base64url")}`;
}
