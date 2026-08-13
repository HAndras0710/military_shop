import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ShopizerCategory, ShopizerCategoryCreate } from '../models/admin.model';
import { SizeSchemeCode } from '../models/attribute-schemes';

/** Ezzel az előtaggal mentjük a mérettáblázatot a kategória "highlights" mezőjébe. */
const SIZE_SCHEME_PREFIX = 'sizeScheme:';

@Injectable({ providedIn: 'root' })
export class AdminCategoryService {
  private http = inject(HttpClient);

  /** Publikus végpont, nem kell hozzá bejelentkezés */
  getCategories(): Observable<{ categories: ShopizerCategory[] }> {
    return this.http.get<{ categories: ShopizerCategory[] }>(
      `${environment.apiUrl}/v1/category?store=DEFAULT&lang=en&depth=1`
    );
  }

  /** Privát végpont - kell a JWT token (az interceptor automatikusan hozzáfűzi) */
  createCategory(category: ShopizerCategoryCreate): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(
      `${environment.apiUrl}/v1/private/category?store=DEFAULT`,
      category
    );
  }

  /**
   * Meglévő kategória módosítása. FIGYELEM: a Shopizer felülírja a leírásokat,
   * ezért a hívónak a változatlan mezőket (név, friendlyUrl) is át kell adnia.
   */
  updateCategory(id: number, category: ShopizerCategoryCreate): Observable<unknown> {
    return this.http.put(
      `${environment.apiUrl}/v1/private/category/${id}?store=DEFAULT&lang=en`,
      category
    );
  }

  /** Melyik mérettáblázat tartozik a kategóriához? (a highlights mezőből olvasva) */
  static sizeSchemeOf(category: ShopizerCategory | undefined | null): SizeSchemeCode {
    const highlights = category?.description?.highlights ?? '';
    if (!highlights.startsWith(SIZE_SCHEME_PREFIX)) return 'NONE';

    const value = highlights.slice(SIZE_SCHEME_PREFIX.length).trim();
    return value === 'CLOTHING' || value === 'SHOE' ? value : 'NONE';
  }

  /** A highlights mező tartalma egy adott mérettáblázathoz. */
  static encodeSizeScheme(scheme: SizeSchemeCode): string {
    return scheme === 'NONE' ? '' : `${SIZE_SCHEME_PREFIX}${scheme}`;
  }
}
