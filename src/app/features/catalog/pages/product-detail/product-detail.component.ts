import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ProductService } from '../../../../core/services/product.service';
import { CartService } from '../../../cart/services/cart.service';
import { Product } from '../../../../core/models/product.model';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private cartService = inject(CartService);

  product = signal<Product | undefined>(undefined);
  loading = signal(true);
  selectedSize = signal<string | null>(null);
  quantity = signal(1);
  addedMessage = signal(false);

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loading.set(true);
        this.addedMessage.set(false);
        this.productService.getProductById(id).subscribe(p => {
          this.product.set(p);
          this.selectedSize.set(p?.sizes.length ? p.sizes[0] : null);
          this.quantity.set(1);
          this.loading.set(false);
        });
      }
    });
  }

  selectSize(size: string) {
    this.selectedSize.set(size);
  }

  increaseQty() {
    this.quantity.update(q => q + 1);
  }

  decreaseQty() {
    this.quantity.update(q => Math.max(1, q - 1));
  }

  onAddToCart() {
    const p = this.product();
    if (!p) return;
    this.cartService.addToCart(p, this.selectedSize(), this.quantity());
    this.addedMessage.set(true);
    setTimeout(() => this.addedMessage.set(false), 2500);
  }
}
