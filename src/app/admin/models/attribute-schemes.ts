// A méret / szín / állapot választékok EGYETLEN forrása.
// Ha új méretet vagy színt akarsz felvenni, itt írd át - a Shopizer oldalán
// az opciók és opció-értékek automatikusan létrejönnek első használatkor
// (lásd AdminOptionService.ensureOptions).

export interface OptionValueDef {
  /** A Shopizer "product option value" kódja - egyedi, nem változtatható utólag */
  code: string;
  /** Ami a felületen látszik */
  label: string;
  /** Csak színeknél: a kis színes pötty a checkboxok mellett */
  hex?: string;
}

export interface OptionDef {
  code: string;
  label: string;
}

/** A három opció, amit a Shopizerben létrehozunk (a termékek ezekre hivatkoznak). */
export const OPTION_SIZE: OptionDef = { code: 'SIZE', label: 'Méret' };
export const OPTION_COLOR: OptionDef = { code: 'COLOR', label: 'Szín' };
export const OPTION_CONDITION: OptionDef = { code: 'CONDITION', label: 'Állapot' };

export type SizeSchemeCode = 'NONE' | 'CLOTHING' | 'SHOE';

export interface SizeScheme {
  code: SizeSchemeCode;
  label: string;
  values: OptionValueDef[];
}

const clothingSizes: OptionValueDef[] = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  '3XL',
].map((s) => ({ code: `SIZE_${s}`, label: s }));

const shoeSizes: OptionValueDef[] = Array.from({ length: 13 }, (_, i) => 36 + i).map(
  (n) => ({ code: `SIZE_${n}`, label: String(n) })
);

export const SIZE_SCHEMES: SizeScheme[] = [
  { code: 'NONE', label: 'Nincs méret (pl. kiegészítők)', values: [] },
  { code: 'CLOTHING', label: 'Ruhaméret (XS - 3XL)', values: clothingSizes },
  { code: 'SHOE', label: 'Lábbeli méret (36 - 48)', values: shoeSizes },
];

export function sizeSchemeByCode(code: SizeSchemeCode | null | undefined): SizeScheme {
  return SIZE_SCHEMES.find((s) => s.code === code) ?? SIZE_SCHEMES[0];
}

export const COLORS: OptionValueDef[] = [
  { code: 'COLOR_BLACK', label: 'Fekete', hex: '#1c1c1c' },
  { code: 'COLOR_OLIVE', label: 'Olívzöld', hex: '#5a6136' },
  { code: 'COLOR_KHAKI', label: 'Khaki', hex: '#9b8c63' },
  { code: 'COLOR_SAND', label: 'Homok', hex: '#c9b790' },
  { code: 'COLOR_BROWN', label: 'Barna', hex: '#6b4a2f' },
  { code: 'COLOR_GREY', label: 'Szürke', hex: '#8a8a8a' },
  { code: 'COLOR_NAVY', label: 'Sötétkék', hex: '#2b3a55' },
  { code: 'COLOR_WOODLAND', label: 'Terepmintás (woodland)', hex: '#4b5320' },
  { code: 'COLOR_DIGITAL', label: 'Terepmintás (digitál)', hex: '#7d8471' },
  { code: 'COLOR_WHITE', label: 'Fehér', hex: '#f2f2f2' },
];

export const CONDITIONS: OptionValueDef[] = [
  { code: 'CONDITION_NEW', label: 'Új' },
  { code: 'CONDITION_ASNEW', label: 'Újszerű' },
  { code: 'CONDITION_USED', label: 'Használt' },
];
