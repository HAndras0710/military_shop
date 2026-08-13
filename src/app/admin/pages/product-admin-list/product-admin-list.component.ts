import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminProductService } from '../../services/admin-product.service';
import { AuthService } from '../../services/auth.service';
import { ShopizerProduct } from '../../models/admin.model';
import { OPTION_COLOR, OPTION_CONDITION, OPTION_SIZE } from '../../models/attribute-schemes';

/** A saját opcióink szép magyar neve (a backendben tárolt név helyett). */
const OPTION_LABELS: Record<string, string> = {
  [OPTION_SIZE.code]: OPTION_SIZE.label,
  [OPTION_COLOR.code]: OPTION_COLOR.label,
  [OPTION_CONDITION.code]: OPTION_CONDITION.label,
};

@Component({
  selector: 'app-product-admin-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-admin-list.component.html',
  styleUrl: './product-admin-list.component.scss',
})
export class ProductAdminListComponent implements OnInit {
  private productService = inject(AdminProductService);
  authService = inject(AuthService);

  products = signal<ShopizerProduct[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.productService.getProducts().subscribe({
      next: (res) => {
        this.products.set(res.products ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Nem sikerült betölteni a termékeket.');
        this.loading.set(false);
      },
    });
  }

  /** Pl. "Méret: M, L | Szín: Fekete" - a termékhez rendelt opciókból */
  optionSummary(product: ShopizerProduct): string {
    return (product.options ?? [])
      .map((option) => {
        const label = OPTION_LABELS[option.code] ?? option.name ?? option.code;
        const values = (option.optionValues ?? [])
          .map((value) => value.description?.name ?? value.name ?? value.code)
          .join(', ');
        return `${label}: ${values}`;
      })
      .join(' | ');
  }

  onDelete(id: number) {
    if (!confirm('Biztosan törlöd ezt a terméket?')) return;
    this.productService.deleteProduct(id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Nem sikerült törölni a terméket.'),
    });
  }
}
