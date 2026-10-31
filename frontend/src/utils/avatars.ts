import { ImageSourcePropType } from 'react-native';

export type PersonGender = 'mujer' | 'hombre';
export type PersonGenderField = PersonGender | null | undefined;

/** Avatar for a child profile (boy / girl). */
export function getChildAvatarSource(gender?: PersonGenderField): ImageSourcePropType {
  if (gender === 'mujer') {
    return require('../../assets/images/girl.jpg');
  }
  return require('../../assets/images/boy.jpg');
}

/** Avatar for a parent/tutor profile (father / mother). Defaults to father. */
export function getParentAvatarSource(gender?: PersonGenderField): ImageSourcePropType {
  if (gender === 'mujer') {
    return require('../../assets/images/mother.jpg');
  }
  return require('../../assets/images/father.jpg');
}
