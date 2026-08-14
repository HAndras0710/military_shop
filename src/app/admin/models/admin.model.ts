// Ezek a Shopizer VALÓDI API struktúráját tükrözik (nem a mi mock modelljeinket).
// A mezőnevek a helyi backend (sm-shop) modelljeivel lettek ellenőrizve,
// ha másik Shopizer verzióra váltasz, itt kell igazítani.

/** Egy kategória/termék leírás - a Shopizerben nyelvenként egy darab. */
export interface ShopizerDescription {
  language: string;
  name: string;
  description?: string | null;
  friendlyUrl?: string | null;
  /**
   * Ide mentjük a kategória mérettáblázatát "sizeScheme:SHOE" formában.
   * Miért pont ide? A Shopizer kategóriának nincs saját "egyéb adat" mezője,
   * a highlights viszont oda-vissza működik (mentés + visszaolvasás) és
   * a bolti felületen nem használjuk semmire.
   */
  highlights?: string | null;
  keyWords?: string | null;
  metaDescription?: string | null;
  title?: string | null;
}

export interface ShopizerCategory {
  id: number;
  code: string;
  visible: boolean;
  depth: number;
  sortOrder?: number;
  description?: ShopizerDescription;
}

export interface ShopizerCategoryCreate {
  code: string;
  sortOrder?: number;
  order?: number;
  visible: boolean;
  descriptions: ShopizerDescription[];
}

/**
 * Termék létrehozás payload.
 * FIGYELEM: a Shopizer ezen a verzión "descriptions" tömböt vár (nem egy objektumot),
 * az ár sima szám a "price" mezőben, és kötelező az "inventory" blokk is,
 * különben "product must have at least one availability" hibát dob.
 */
export interface ShopizerProductCreate {
  sku: string;
  available: boolean;
  visible: boolean;
  productShipeable: boolean;
  price: number;
  quantity: number;
  inventory: {
    sku: string;
    quantity: number;
    price: { price: number; defaultPrice: boolean; code: string };
  };
  categories: { id: number }[];
  descriptions: ShopizerDescription[];
}

export interface ShopizerImage {
  id: number;
  imageName?: string;
  imageUrl?: string;
  defaultImage?: boolean;
  order?: number;
}

export interface ShopizerProduct {
  id: number;
  sku: string;
  available?: boolean;
  visible?: boolean;
  productShipeable?: boolean;
  /** Sima szám, pl. 12000.0 - nem objektum! */
  price?: number;
  /** Formázott ár, pl. "12 000,00 EUR" - a bolt pénznem-beállítása szerint */
  originalPrice?: string;
  quantity?: number;
  description?: ShopizerDescription;
  categories?: { id: number }[];
  image?: ShopizerImage;
  images?: ShopizerImage[];
  options?: ReadableProductOption[];
}

/** Ugyanaz, mint a létrehozás payloadja, csak az "id" is kötelező - ezt várja a PUT. */
export interface ShopizerProductUpdate extends ShopizerProductCreate {
  id: number;
}

/* --- Opciók (méret / szín / állapot) --- */

export interface ShopizerOptionCreate {
  code: string;
  type: string; // "select"
  order: number;
  readOnly: boolean;
  descriptions: { language: string; name: string }[];
}

export interface ShopizerOptionValueCreate {
  code: string;
  order: number;
  descriptions: { language: string; name: string }[];
}

export interface ReadableProductOptionValue {
  id: number;
  code: string;
  /** A Shopizer itt gyakran null-t ad, a megjelenítendő név a description.name-ben van */
  name?: string | null;
  description?: { name?: string };
}

export interface ReadableProductOption {
  id: number;
  code: string;
  name?: string;
  optionValues?: ReadableProductOptionValue[];
}

export interface ShopizerOptionListResponse {
  options: { id: number; code: string }[];
}

export interface ShopizerOptionValueListResponse {
  optionValues: { id: number; code: string }[];
}

/** Opció hozzárendelése egy termékhez - kód alapján is működik, ID nélkül. */
export interface ShopizerAttributeCreate {
  option: { code: string };
  optionValue: { code: string };
  sortOrder: number;
  attributeDefault: boolean;
  attributeDisplayOnly: boolean;
}

/** Egy termékhez már hozzárendelt attribútum - ez kell a törléshez (attributeId). */
export interface ShopizerProductAttribute {
  id: number;
  option: { code: string };
  optionValue: { code: string };
}

export interface ShopizerAttributeListResponse {
  attributes: ShopizerProductAttribute[];
}
