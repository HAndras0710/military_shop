import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Product, Category } from '../models/product.model';
import {
  ShopizerCategoryListResponse,
  ShopizerProductListResponse,
  ShopizerReadableProduct,
} from '../models/shopizer-catalog.model';

/**
 * A méret / szín / állapot opciók kódjai - ugyanazok, amiket az admin oldal
 * hoz létre (lásd admin/models/attribute-schemes.ts). Itt csak olvassuk őket,
 * ezért nem importáljuk az admin modult, hogy a bolti kód ne függjön tőle.
 */
const OPTION_CODE_SIZE = 'SIZE';
const OPTION_CODE_COLOR = 'COLOR';
const OPTION_CODE_CONDITION = 'CONDITION';

/**
 * A bolti oldal ezt a service-t hívja a Shopizer PUBLIKUS katalógus-végpontjain
 * keresztül (bejelentkezés nélkül elérhetők) - ugyanazt az adatot látja, amit
 * az admin felületen felviszünk.
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1`;

  getCategories(): Observable<Category[]> {
    return this.http
      .get<ShopizerCategoryListResponse>(`${this.base}/category?store=DEFAULT&lang=en&depth=1`)
      .pipe(
        map((res) =>
          (res.categories ?? [])
            .filter((c) => c.visible !== false && c.description?.friendlyUrl)
            .map((c) => ({
              slug: c.description!.friendlyUrl!,
              name: c.description!.name ?? c.description!.friendlyUrl!,
            }))
        ),
        catchError(() => of([]))
      );
  }

  getProducts(categorySlug?: string): Observable<Product[]> {
    const slugParam = categorySlug ? `&slug=${encodeURIComponent(categorySlug)}` : '';
    return this.http
      .get<ShopizerProductListResponse>(
        `${this.base}/products?store=DEFAULT&lang=en${slugParam}`
      )
      .pipe(
        map((res) => (res.products ?? []).map(mapProduct).filter((p): p is Product => !!p)),
        catchError(() => of([]))
      );
  }

  /** @param slug a termék friendlyUrl-je (ez a Product.id-ban tárolt érték) */
  getProductById(slug: string): Observable<Product | undefined> {
    return this.http
      .get<ShopizerReadableProduct>(`${this.base}/product/${encodeURIComponent(slug)}?lang=en`)
      .pipe(
        map((raw) => mapProduct(raw) ?? undefined),
        catchError(() => of(undefined))
      );
  }

  searchProducts(query: string): Observable<Product[]> {
    if (!query.trim()) return of([]);
    return this.http
      .get<ShopizerProductListResponse>(
        `${this.base}/products?store=DEFAULT&lang=en&name=${encodeURIComponent(query)}`
      )
      .pipe(
        map((res) => (res.products ?? []).map(mapProduct).filter((p): p is Product => !!p)),
        catchError(() => of([]))
      );
  }
}

/** Egy Shopizer opcióhoz tartozó értékek szöveges neve, megjelenítésre kész sorrendben. */
function optionValueNames(product: ShopizerReadableProduct, optionCode: string): string[] {
  const option = (product.options ?? []).find((o) => o.code === optionCode);
  return (option?.optionValues ?? []).map(
    (v) => v.description?.name ?? v.name ?? v.code
  );
}

/** A termék képei, fő kép elöl, utána feltöltési sorrendben. */
function imageUrls(raw: ShopizerReadableProduct): string[] {
  const images = [...(raw.images ?? [])].sort((a, b) => {
    if (!!a.defaultImage !== !!b.defaultImage) return a.defaultImage ? -1 : 1;
    return (a.order ?? 0) - (b.order ?? 0);
  });
  return images.map((i) => i.imageUrl).filter((url): url is string => !!url);
}

function mapProduct(raw: ShopizerReadableProduct): Product | null {
  // A friendlyUrl-t használjuk azonosítóként (id helyett), mert a Shopizer
  // GET /product/{id} végpontja ezen a backend-verzión hibázik - a
  // friendlyUrl alapú lekérés viszont megbízhatóan működik.
  const slug = raw.description?.friendlyUrl;
  if (!slug) return null;

  const images = imageUrls(raw);

  return {
    id: slug,
    code: raw.sku,
    name: raw.description?.name ?? raw.sku,
    price: raw.price ?? 0,
    category: raw.categories?.[0]?.description?.friendlyUrl ?? '',
    description: raw.description?.description ?? '',
    condition: optionValueNames(raw, OPTION_CODE_CONDITION)[0] ?? '',
    sizes: optionValueNames(raw, OPTION_CODE_SIZE),
    colors: optionValueNames(raw, OPTION_CODE_COLOR),
    imageUrl: raw.image?.imageUrl ?? images[0] ?? '',
    images,
  };
}
