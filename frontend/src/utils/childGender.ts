import { Colors } from '../constants/colors';

export type ChildGender = 'mujer' | 'hombre';

/** API may omit gender for children created before this feature. */
export type ChildGenderField = ChildGender | null | undefined;

const FEMALE = Colors.accent;
const MALE = Colors.primary;

export function getChildAvatarColors(gender: ChildGenderField): {
  backgroundColor: string;
  color: string;
} {
  if (gender === 'mujer') {
    return { backgroundColor: FEMALE, color: Colors.white };
  }
  if (gender === 'hombre') {
    return { backgroundColor: MALE, color: Colors.white };
  }
  return { backgroundColor: Colors.primary, color: Colors.white };
}
