import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-category-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './category-sidebar.component.html',
  styleUrl: './category-sidebar.component.scss',
})
export class CategorySidebarComponent {
  private productService = inject(ProductService);

  // toSignal: Observable -> signal, hogy a template @if/@for szintaxist tudjon
  // egységesen használni, RxJS async pipe nélkül
  categories = toSignal(this.productService.getCategories(), { initialValue: [] });
}
