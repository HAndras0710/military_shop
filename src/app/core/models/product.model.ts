export interface Category {
  slug: string;
  name: string;
}

export interface Product {
  /** A Shopizer termék friendlyUrl-je (slug) - ez azonosítja a terméket a boltban. */
  id: string;
  code: string;         // pl. ÚJ6538 - cikkszám, ahogy az eredeti oldalon is
  name: string;
  price: number;        // Ft
  category: string;     // Category.slug
  description: string;
  /** Szabad szöveg (pl. "Új", "Újszerű", "Használt") - az admin oldalon beállított állapot */
  condition: string;
  sizes: string[];
  colors: string[];
  /** A termék fő képe. Üres, ha még nincs kép feltöltve hozzá. */
  imageUrl: string;
}
