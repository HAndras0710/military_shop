import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { CartService } from '../../../cart/services/cart.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card.component';
import { Product } from '../../../../core/models/product.model';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [ProductCardComponent],
  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.scss',
})
export class SearchPageComponent {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private cartService = inject(CartService);

  query = signal('');
  results = signal<Product[]>([]);
  loading = signal(true);

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      const q = params.get('q') ?? '';
      this.query.set(q);
      this.loading.set(true);
      this.productService.searchProducts(q).subscribe(data => {
        this.results.set(data);
        this.loading.set(false);
      });
    });
  }

  onAddToCart(product: Product) {
    this.cartService.addToCart(product);
  }
}
