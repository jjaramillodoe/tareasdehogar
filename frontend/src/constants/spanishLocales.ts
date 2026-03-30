/**
 * Países y territorios de habla hispana habituales + moneda local (ISO 4217).
 * El usuario puede cambiar la moneda manualmente si convive con otra (p. ej. USD en frontera).
 */
export type SpanishSpeakingCountry = {
  code: string;
  name: string;
  currency: string;
};

export const SPANISH_SPEAKING_COUNTRIES: SpanishSpeakingCountry[] = [
  { code: 'AR', name: 'Argentina', currency: 'ARS' },
  { code: 'BO', name: 'Bolivia', currency: 'BOB' },
  { code: 'CL', name: 'Chile', currency: 'CLP' },
  { code: 'CO', name: 'Colombia', currency: 'COP' },
  { code: 'CR', name: 'Costa Rica', currency: 'CRC' },
  { code: 'CU', name: 'Cuba', currency: 'CUP' },
  { code: 'EC', name: 'Ecuador', currency: 'USD' },
  { code: 'ES', name: 'España', currency: 'EUR' },
  { code: 'US', name: 'Estados Unidos', currency: 'USD' },
  { code: 'GQ', name: 'Guinea Ecuatorial', currency: 'XAF' },
  { code: 'GT', name: 'Guatemala', currency: 'GTQ' },
  { code: 'HN', name: 'Honduras', currency: 'HNL' },
  { code: 'MX', name: 'México', currency: 'MXN' },
  { code: 'NI', name: 'Nicaragua', currency: 'NIO' },
  { code: 'PA', name: 'Panamá', currency: 'USD' },
  { code: 'PY', name: 'Paraguay', currency: 'PYG' },
  { code: 'PE', name: 'Perú', currency: 'PEN' },
  { code: 'PR', name: 'Puerto Rico', currency: 'USD' },
  { code: 'DO', name: 'República Dominicana', currency: 'DOP' },
  { code: 'SV', name: 'El Salvador', currency: 'USD' },
  { code: 'UY', name: 'Uruguay', currency: 'UYU' },
  { code: 'VE', name: 'Venezuela', currency: 'VES' },
].sort((a, b) => a.name.localeCompare(b.name, 'es'));

/** Monedas únicas ofrecidas en el selector (orden alfabético). */
export const SPANISH_LOCALE_CURRENCIES: string[] = Array.from(
  new Set(SPANISH_SPEAKING_COUNTRIES.map((c) => c.currency))
).sort();

export function defaultCurrencyForCountry(countryCode: string): string {
  return (
    SPANISH_SPEAKING_COUNTRIES.find((c) => c.code === countryCode)?.currency ?? 'USD'
  );
}

export function countryLabel(countryCode: string | null | undefined): string {
  if (!countryCode) return '';
  const c = SPANISH_SPEAKING_COUNTRIES.find((x) => x.code === countryCode);
  return c ? c.name : countryCode;
}
