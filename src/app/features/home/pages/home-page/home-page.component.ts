import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { ProductService } from '../../../../core/services/product.service';
import { Category } from '../../../../core/models/product.model';

interface HeroSlide {
  /** melyik szín-sémát használja a háttér (lásd .hero__slide--n a scss-ben) */
  theme: 1 | 2 | 3;
  title: string;
  subtitle: string;
  ctaLabel: string;
  /** ha üres, a "Összes termék" oldalra visz a CTA gomb */
  ctaCategorySlug?: string;
}

/**
 * A promó-sáv (akciók, újdonságok) tartalma - egyelőre kézzel írva itt.
 * Miért nem admin felületről szerkeszthető? A Shopizer ezen verziójának
 * Content Box (CMS doboz) API-ja csak létrehozásra használható megbízhatóan,
 * módosításra/törlésre nem (a backend nem ad vissza valódi azonosítót) -
 * emiatt maradt ez egyelőre kód-szintű beállítás. Ha bővíteni/cserélni
 * akarod, itt kell módosítani (vagy szólj, és átírom).
 */
const HERO_SLIDES: HeroSlide[] = [
  {
    theme: 1,
    title: 'Új beszállítás érkezett',
    subtitle: 'Friss készlet minden kategóriában - nézz körül, amíg tart!',
    ctaLabel: 'Új termékek',
  },
  {
    theme: 2,
    title: 'Akciós bakancsok',
    subtitle: 'Válogass a bakancsok és lábbelik kínálatából kedvező áron.',
    ctaLabel: 'Bakancsok megtekintése',
    ctaCategorySlug: 'bakancsok',
  },
  {
    theme: 3,
    title: 'Terepszínű kabátok, dzsekik',
    subtitle: 'Kabátok és felsőruházat minden évszakra.',
    ctaLabel: 'Kabátok megtekintése',
    ctaCategorySlug: 'coats',
  },
];

const AUTOPLAY_INTERVAL_MS = 6000;

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  private productService = inject(ProductService);
  private destroyRef = inject(DestroyRef);

  readonly slides = HERO_SLIDES;
  activeSlideIndex = signal(0);

  categories = signal<Category[]>([]);
  loadingCategories = signal(true);

  constructor() {
    this.productService.getCategories().subscribe((cats) => {
      this.categories.set(cats);
      this.loadingCategories.set(false);
    });

    interval(AUTOPLAY_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.next());
  }

  next() {
    this.activeSlideIndex.update((i) => (i + 1) % this.slides.length);
  }

  prev() {
    this.activeSlideIndex.update((i) => (i - 1 + this.slides.length) % this.slides.length);
  }

  goTo(index: number) {
    this.activeSlideIndex.set(index);
  }
}
