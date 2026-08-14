import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ShopizerImage,
  ShopizerProduct,
  ShopizerProductCreate,
  ShopizerProductUpdate,
} from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class AdminProductService {
  private http = inject(HttpClient);

  getProducts(): Observable<{ products: ShopizerProduct[] }> {
    return this.http.get<{ products: ShopizerProduct[] }>(
      `${environment.apiUrl}/v1/products?store=DEFAULT&lang=en`
    );
  }

  createProduct(product: ShopizerProductCreate): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(
      `${environment.apiUrl}/v1/private/product?store=DEFAULT`,
      product
    );
  }

  /**
   * FIGYELEM: ez felülírja a termék alapadatait (név, ár, készlet, kategória, leírás),
   * de a méret/szín/állapot attribútumokat és a képeket NEM érinti, ha kihagyod őket -
   * azokat külön végponton kell kezelni (lásd AdminOptionService).
   */
  updateProduct(id: number, product: ShopizerProductUpdate): Observable<void> {
    return this.http.put<void>(
      `${environment.apiUrl}/v1/private/product/${id}?store=DEFAULT&lang=en`,
      product
    );
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/v1/private/product/${id}?store=DEFAULT`
    );
  }

  /**
   * Egy kép feltöltése egy MÁR LÉTEZŐ termékhez (ezért kell előbb a createProduct).
   * A Shopizer multipart/form-data-t vár "file" néven; a Content-Type fejlécet
   * szándékosan nem állítjuk be, azt a böngésző teszi hozzá a boundary-val együtt.
   */
  uploadImage(
    productId: number,
    file: File,
    order: number,
    defaultImage: boolean
  ): Observable<void> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<void>(
      `${environment.apiUrl}/v1/private/product/${productId}/image` +
        `?store=DEFAULT&lang=en&order=${order}&defaultImage=${defaultImage}`,
      formData
    );
  }

  getImages(productId: number): Observable<ShopizerImage[]> {
    return this.http.get<ShopizerImage[]>(
      `${environment.apiUrl}/v1/product/${productId}/images?store=DEFAULT&lang=en`
    );
  }

  deleteImage(productId: number, imageId: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/v1/private/product/${productId}/image/${imageId}?store=DEFAULT`
    );
  }
}
