// Email allowlist utility for restricting access to approved users

/**
 * Get the list of allowed email addresses from environment variable
 * Format: comma-separated emails in ALLOWED_EMAILS env var
 * Example: "user1@example.com,user2@example.com,admin@company.com"
 */
export function getAllowedEmails(): string[] {
  const allowedEmailsEnv = process.env.ALLOWED_EMAILS || '';

  if (!allowedEmailsEnv.trim()) {
    return [];
  }

  return allowedEmailsEnv
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

/**
 * Check if an email address is allowed to sign up/sign in
 * @param email - Email address to check (case-insensitive)
 * @returns true if email is on the allowlist, false otherwise
 */
export function isEmailAllowed(email: string): boolean {
  const allowedEmails = getAllowedEmails();

  // SECURITY: If no allowlist is configured, BLOCK all access
  // You must explicitly add emails to ALLOWED_EMAILS to grant access
  if (allowedEmails.length === 0) {
    console.warn('⚠️  ALLOWED_EMAILS is empty - blocking all access. Add emails to .env to grant access.');
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();
  return allowedEmails.includes(normalizedEmail);
}

/**
 * Validates email format using a simple regex
 * @param email - Email to validate
 * @returns true if email format is valid
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
