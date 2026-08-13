import { Injectable, signal, computed } from '@angular/core';
import { Product } from '../../../core/models/product.model';

export interface CartItem {
  product: Product;
  size: string | null;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  // privát, írható signal - csak a service módosíthatja közvetlenül
  private items = signal<CartItem[]>([]);

  // publikus, csak olvasható verzió - a komponensek ezt olvassák ki
  readonly cartItems = this.items.asReadonly();

  // "computed" - automatikusan újraszámolódik, ha items változik
  readonly totalPrice = computed(() =>
    this.items().reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  );

  readonly itemCount = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  addToCart(product: Product, size: string | null = null, quantity: number = 1) {
    this.items.update(current => {
      const existing = current.find(
        i => i.product.id === product.id && i.size === size
      );
      if (existing) {
        return current.map(i =>
          i.product.id === product.id && i.size === size
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...current, { product, size, quantity }];
    });
  }

  removeFromCart(productId: string, size: string | null) {
    this.items.update(current =>
      current.filter(i => !(i.product.id === productId && i.size === size))
    );
  }

  updateQuantity(productId: string, size: string | null, quantity: number) {
    if (quantity < 1) {
      this.removeFromCart(productId, size);
      return;
    }
    this.items.update(current =>
      current.map(i =>
        i.product.id === productId && i.size === size ? { ...i, quantity } : i
      )
    );
  }

  clearCart() {
    this.items.set([]);
  }
}
