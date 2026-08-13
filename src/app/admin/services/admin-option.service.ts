import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, concat, forkJoin, of } from 'rxjs';
import { catchError, last, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ShopizerAttributeCreate,
  ShopizerOptionListResponse,
  ShopizerOptionValueListResponse,
} from '../models/admin.model';
import { OptionDef, OptionValueDef } from '../models/attribute-schemes';

/**
 * A méret / szín / állapot kezelése Shopizer oldalon két lépés:
 *   1. létezzen az OPCIÓ (pl. "SIZE") és az OPCIÓ-ÉRTÉK (pl. "SIZE_42"),
 *   2. a termékhez hozzá kell rendelni egy attribútumot, ami a kettőre hivatkozik.
 *
 * A felhasználónak ebből semmit nem kell tudnia: az 1. lépést ez a service
 * automatikusan elvégzi, amikor először választ ki egy adott méretet/színt.
 */
@Injectable({ providedIn: 'root' })
export class AdminOptionService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/private/product`;
  private storeParams = 'store=DEFAULT&lang=en';

  /** Amit a backend-en már láttunk - így nem kérdezzük le újra minden mentésnél. */
  private knownOptionCodes: Set<string> | null = null;
  private knownValueCodes: Set<string> | null = null;

  /**
   * Létrehozza a még nem létező opciókat és opció-értékeket.
   * Idempotens: ha már mind megvan, egyetlen írás sem történik.
   */
  ensureOptions(options: OptionDef[], values: OptionValueDef[]): Observable<void> {
    return this.loadKnownCodes().pipe(
      switchMap(() => {
        const missingOptions = options.filter((o) => !this.knownOptionCodes!.has(o.code));
        const missingValues = values.filter((v) => !this.knownValueCodes!.has(v.code));

        const calls: Observable<unknown>[] = [
          ...missingOptions.map((o) => this.createOption(o)),
          ...missingValues.map((v) => this.createOptionValue(v)),
        ];

        if (calls.length === 0) return of(void 0);
        // Sorban, nem párhuzamosan: a Shopizer így megbízhatóbban kezeli az írásokat.
        return concat(...calls).pipe(last(), map(() => void 0));
      })
    );
  }

  /** Opció hozzárendelése egy már létező termékhez (kód alapján, ID nélkül is működik). */
  addAttribute(
    productId: number,
    optionCode: string,
    optionValueCode: string,
    sortOrder = 0
  ): Observable<{ id: number }> {
    const body: ShopizerAttributeCreate = {
      option: { code: optionCode },
      optionValue: { code: optionValueCode },
      sortOrder,
      attributeDefault: false,
      attributeDisplayOnly: false,
    };
    return this.http.post<{ id: number }>(
      `${this.base}/${productId}/attribute?${this.storeParams}`,
      body
    );
  }

  private loadKnownCodes(): Observable<void> {
    if (this.knownOptionCodes && this.knownValueCodes) return of(void 0);

    return forkJoin({
      options: this.http.get<ShopizerOptionListResponse>(
        `${this.base}/options?${this.storeParams}&page=0&count=500`
      ),
      values: this.http.get<ShopizerOptionValueListResponse>(
        `${this.base}/options/values?${this.storeParams}&page=0&count=500`
      ),
    }).pipe(
      tap(({ options, values }) => {
        this.knownOptionCodes = new Set((options.options ?? []).map((o) => o.code));
        this.knownValueCodes = new Set((values.optionValues ?? []).map((v) => v.code));
      }),
      map(() => void 0)
    );
  }

  private createOption(option: OptionDef): Observable<unknown> {
    return this.http
      .post(`${this.base}/option?${this.storeParams}`, {
        code: option.code,
        type: 'select',
        order: 0,
        readOnly: false,
        descriptions: [{ language: 'en', name: option.label }],
      })
      .pipe(
        tap(() => this.knownOptionCodes?.add(option.code)),
        // Ha közben más (pl. másik böngészőfül) már létrehozta, az nem hiba nekünk.
        catchError(() => {
          this.knownOptionCodes?.add(option.code);
          return of(null);
        })
      );
  }

  private createOptionValue(value: OptionValueDef): Observable<unknown> {
    return this.http
      .post(`${this.base}/option/value?${this.storeParams}`, {
        code: value.code,
        order: 0,
        descriptions: [{ language: 'en', name: value.label }],
      })
      .pipe(
        tap(() => this.knownValueCodes?.add(value.code)),
        catchError(() => {
          this.knownValueCodes?.add(value.code);
          return of(null);
        })
      );
  }
}
