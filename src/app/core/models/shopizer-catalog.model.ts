// A Shopizer PUBLIKUS (nem admin) katalógus-végpontjainak valós válasz-alakja.
// Csak azokat a mezőket soroljuk fel, amiket ténylegesen használunk.

export interface ShopizerReadableDescription {
  name: string;
  friendlyUrl?: string;
  description?: string;
}

export interface ShopizerReadableCategory {
  id: number;
  visible?: boolean;
  description?: ShopizerReadableDescription;
}

export interface ShopizerReadableOptionValue {
  code: string;
  name?: string | null;
  description?: { name?: string };
}

export interface ShopizerReadableOption {
  code: string;
  optionValues?: ShopizerReadableOptionValue[];
}

export interface ShopizerReadableImage {
  imageUrl?: string;
  defaultImage?: boolean;
}

export interface ShopizerReadableProduct {
  id: number;
  sku: string;
  /** Sima szám (pl. 12000.0), nem objektum. */
  price?: number;
  description?: ShopizerReadableDescription;
  categories?: ShopizerReadableCategory[];
  options?: ShopizerReadableOption[];
  image?: ShopizerReadableImage;
}

export interface ShopizerCategoryListResponse {
  categories: ShopizerReadableCategory[];
}

export interface ShopizerProductListResponse {
  products: ShopizerReadableProduct[];
}
