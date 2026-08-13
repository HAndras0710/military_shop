import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { CartService } from '../../../cart/services/cart.service';
import { CategorySidebarComponent } from '../../../../shared/components/category-sidebar/category-sidebar.component';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card.component';
import { Product } from '../../../../core/models/product.model';

type SortOption = 'default' | 'price-asc' | 'price-desc';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CategorySidebarComponent, ProductCardComponent],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
})
export class ProductListComponent {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private cartService = inject(CartService);

  categoryName = signal<string>('Összes termék');
  products = signal<Product[]>([]);
  loading = signal(true);
  sortOption = signal<SortOption>('default');

  constructor() {
    // effect: valahányszor a route param (kategória) változik, újratöltjük a listát
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug') ?? undefined;
      this.loadProducts(slug);
    });
  }

  private loadProducts(slug?: string) {
    this.loading.set(true);
    this.productService.getProducts(slug).subscribe(data => {
      this.products.set(data);
      this.loading.set(false);
    });
    if (slug) {
      this.productService.getCategories().subscribe(cats => {
        const found = cats.find(c => c.slug === slug);
        this.categoryName.set(found ? found.name : 'Termékek');
      });
    } else {
      this.categoryName.set('Összes termék');
    }
  }

  sortedProducts() {
    const list = [...this.products()];
    switch (this.sortOption()) {
      case 'price-asc':
        return list.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return list.sort((a, b) => b.price - a.price);
      default:
        return list;
    }
  }

  onSortChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as SortOption;
    this.sortOption.set(value);
  }

  onAddToCart(product: Product) {
    this.cartService.addToCart(product);
  }
}
