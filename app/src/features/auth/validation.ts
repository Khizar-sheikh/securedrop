const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export const validateEmail = (email: string): string | null => {
  const value = email.trim();
  if (!value) return 'Enter your email address.';
  if (value.length > 254 || !EMAIL_PATTERN.test(value)) return 'Enter a valid email address.';
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) return 'Enter a password.';
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > 200) return 'Password is too long.';
  return null;
};

export const validatePasswordConfirmation = (password: string, confirmation: string): string | null => {
  if (!confirmation) return 'Confirm your password.';
  if (password !== confirmation) return 'Passwords do not match.';
  return null;
};
