/** Minimum length for parent/tutor account passwords (register, reset, change). */
export const MIN_PASSWORD_LENGTH = 8;

export function passwordMeetsPolicy(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (password.length >= 12) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9ÁÉÍÓÚáéíóúÑñ]/.test(password)) score += 1;
  const clamped = Math.min(3, score) as 0 | 1 | 2 | 3;
  const label = clamped <= 1 ? 'Débil' : clamped === 2 ? 'Bien' : 'Fuerte';
  return { score: clamped, label };
}
