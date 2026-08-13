import { Routes } from '@angular/router';
import { ProductListComponent } from './features/catalog/pages/product-list/product-list.component';
import { ProductDetailComponent } from './features/catalog/pages/product-detail/product-detail.component';
import { SearchPageComponent } from './features/catalog/pages/search-page/search-page.component';
import { CartPageComponent } from './features/cart/pages/cart-page/cart-page.component';
import { InfoPageComponent } from './features/static-pages/pages/info-page/info-page.component';
import { ContactPageComponent } from './features/static-pages/pages/contact-page/contact-page.component';
import { AdminLoginComponent } from './admin/pages/login/login.component';
import { ProductAdminListComponent } from './admin/pages/product-admin-list/product-admin-list.component';
import { ProductFormComponent } from './admin/pages/product-form/product-form.component';
import { CategoryFormComponent } from './admin/pages/category-form/category-form.component';
import { authGuard } from './admin/services/auth.guard';

export const routes: Routes = [
  { path: '', component: ProductListComponent, title: 'Military Shop Demo - Kezdőlap' },
  { path: 'kategoria/:slug', component: ProductListComponent, title: 'Kategória' },
  { path: 'termek/:id', component: ProductDetailComponent, title: 'Termék' },
  { path: 'kereses', component: SearchPageComponent, title: 'Keresés' },
  { path: 'kosar', component: CartPageComponent, title: 'Kosár' },
  { path: 'informacio', component: InfoPageComponent, title: 'Vásárlói tájékoztató' },
  { path: 'kapcsolat', component: ContactPageComponent, title: 'Kapcsolat' },

  // Admin szekció - valódi Shopizer backendhez kapcsolódik (nem mock adat!)
  { path: 'admin/login', component: AdminLoginComponent, title: 'Admin belépés' },
  {
    path: 'admin/termekek',
    component: ProductAdminListComponent,
    canActivate: [authGuard],
    title: 'Admin - Termékek',
  },
  {
    path: 'admin/termekek/uj',
    component: ProductFormComponent,
    canActivate: [authGuard],
    title: 'Admin - Új termék',
  },
  {
    path: 'admin/kategoriak/uj',
    component: CategoryFormComponent,
    canActivate: [authGuard],
    title: 'Admin - Új kategória',
  },

  { path: '**', redirectTo: '' },
];
