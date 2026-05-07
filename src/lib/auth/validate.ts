export const ALLOWED_DOMAIN = 'nyu.edu';
export const MIN_PASSWORD_LENGTH = 8;

const NETID_PATTERN = /^[a-zA-Z][a-zA-Z0-9]{1,14}$/;

export function isValidNetId(netid: string): boolean {
  return NETID_PATTERN.test(netid.trim());
}

export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export function buildEmail(netid: string): string {
  return `${netid.trim().toLowerCase()}@${ALLOWED_DOMAIN}`;
}

export function isAllowedEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}
