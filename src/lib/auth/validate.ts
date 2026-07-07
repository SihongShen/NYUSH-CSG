export const ALLOWED_DOMAIN = 'nyu.edu';

export function isAllowedEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}
