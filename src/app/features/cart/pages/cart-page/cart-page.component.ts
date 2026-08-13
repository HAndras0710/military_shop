import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.scss',
})
export class CartPageComponent {
  private cartService = inject(CartService);

  items = this.cartService.cartItems;
  totalPrice = this.cartService.totalPrice;

  updateQuantity(productId: string, size: string | null, quantity: number) {
    this.cartService.updateQuantity(productId, size, quantity);
  }

  removeItem(productId: string, size: string | null) {
    this.cartService.removeFromCart(productId, size);
  }

  clearCart() {
    this.cartService.clearCart();
  }
}
