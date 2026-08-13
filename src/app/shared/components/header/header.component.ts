import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CartService } from '../../../features/cart/services/cart.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private cartService = inject(CartService);
  private router = inject(Router);

  itemCount = this.cartService.itemCount;
  searchQuery = '';

  onSearch() {
    const q = this.searchQuery.trim();
    if (q) {
      this.router.navigate(['/kereses'], { queryParams: { q } });
    }
  }
}
