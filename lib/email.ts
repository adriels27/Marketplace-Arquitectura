const ALLOWED_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
]);

export function isAllowedAccountEmail(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const [localPart, domain, ...extraParts] = normalizedEmail.split("@");
  if (!localPart || !domain || extraParts.length > 0) return false;

  return ALLOWED_EMAIL_DOMAINS.has(domain);
}
