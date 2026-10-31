export type MissionCategory = 'facil' | 'rapida' | 'especial';

export type ExpressMissionTemplate = {
  id: string;
  title: string;
  description: string;
  category: MissionCategory;
  amount: number;
  xp: number;
  minutes: number;
};

export const EXPRESS_MISSIONS: ExpressMissionTemplate[] = [
  {
    id: 'shoes',
    title: 'Ordenar zapatos',
    description: 'Junta todos los zapatos y déjalos en su lugar en 3 minutos.',
    category: 'rapida',
    amount: 0.25,
    xp: 50,
    minutes: 3,
  },
  {
    id: 'thanks',
    title: 'Nota de agradecimiento',
    description: 'Escribe o di algo amable a alguien de la familia.',
    category: 'especial',
    amount: 0.5,
    xp: 80,
    minutes: 5,
  },
  {
    id: 'read',
    title: 'Lectura relámpago',
    description: 'Lee 5 minutos en voz alta o en silencio.',
    category: 'facil',
    amount: 0.4,
    xp: 60,
    minutes: 5,
  },
  {
    id: 'table',
    title: 'Mesa lista',
    description: 'Pon o recoge la mesa en un solo round.',
    category: 'rapida',
    amount: 0.35,
    xp: 50,
    minutes: 4,
  },
  {
    id: 'water',
    title: 'Hidratación',
    description: 'Llena tu vaso y bebe agua ahora mismo.',
    category: 'facil',
    amount: 0.2,
    xp: 30,
    minutes: 1,
  },
  {
    id: 'toys',
    title: 'Juguetes a casa',
    description: 'Guarda 10 cosas que estén fuera de lugar.',
    category: 'rapida',
    amount: 0.45,
    xp: 70,
    minutes: 6,
  },
];

export const CATEGORY_META: Record<
  MissionCategory,
  { label: string; color: string; bg: string }
> = {
  facil: { label: 'Fácil', color: '#0B7A4B', bg: '#D8F8E8' },
  rapida: { label: 'Rápida', color: '#8A5A00', bg: '#FFE9A8' },
  especial: { label: 'Especial', color: '#B0103A', bg: '#FFD6DE' },
};
