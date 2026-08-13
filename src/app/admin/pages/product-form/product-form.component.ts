import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, concat, defer, map, of, switchMap, last } from 'rxjs';
import { AdminProductService } from '../../services/admin-product.service';
import { AdminCategoryService } from '../../services/admin-category.service';
import { AdminOptionService } from '../../services/admin-option.service';
import { ShopizerCategory } from '../../models/admin.model';
import {
  COLORS,
  CONDITIONS,
  OPTION_COLOR,
  OPTION_CONDITION,
  OPTION_SIZE,
  OptionDef,
  OptionValueDef,
  sizeSchemeByCode,
} from '../../models/attribute-schemes';

/** Egy kiválasztott, de még fel nem töltött kép (a preview miatt kell az URL). */
interface ImageDraft {
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss',
})
export class ProductFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private productService = inject(AdminProductService);
  private categoryService = inject(AdminCategoryService);
  private optionService = inject(AdminOptionService);

  readonly colors = COLORS;
  readonly conditions = CONDITIONS;

  categories = signal<ShopizerCategory[]>([]);
  loadingCategories = signal(true);
  saving = signal(false);
  /** Mi történik épp mentés közben (több lépésből áll, ezért mutatjuk) */
  status = signal<string>('');
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  /** A kiválasztott kategória - ebből jön, hogy milyen méreteket ajánlunk fel */
  selectedCategoryId = signal<number | null>(null);

  private selectedCategory = computed(() =>
    this.categories().find((c) => c.id === this.selectedCategoryId())
  );

  /** A kategóriához beállított mérettáblázat (ruha / lábbeli / nincs) */
  sizeScheme = computed(() =>
    sizeSchemeByCode(AdminCategoryService.sizeSchemeOf(this.selectedCategory()))
  );

  availableSizes = computed(() => this.sizeScheme().values);

  selectedSizes = signal<Set<string>>(new Set());
  selectedColors = signal<Set<string>>(new Set());

  images = signal<ImageDraft[]>([]);
  /** Melyik kép legyen a fő kép (ez jelenik meg a listákban) */
  defaultImageIndex = signal(0);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    sku: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    quantity: [1, [Validators.required, Validators.min(0)]],
    categoryId: [null as number | null, Validators.required],
    condition: [''],
    description: [''],
  });

  ngOnInit() {
    this.form.controls.categoryId.valueChanges.subscribe((id) => {
      this.selectedCategoryId.set(id);
      // Kategóriaváltáskor a korábbi méretek már nem biztos, hogy értelmesek
      // (pl. ruhaméretről lábbelire váltás), ezért töröljük őket.
      this.selectedSizes.set(new Set());
    });

    this.categoryService.getCategories().subscribe({
      next: (res) => {
        this.categories.set(res.categories ?? []);
        this.loadingCategories.set(false);
      },
      error: () => {
        this.error.set('Nem sikerült betölteni a kategóriákat. Fut a backend?');
        this.loadingCategories.set(false);
      },
    });
  }

  ngOnDestroy() {
    this.clearImages();
  }

  /* --- méret / szín kijelölés --- */

  toggleSize(code: string) {
    this.selectedSizes.set(toggled(this.selectedSizes(), code));
  }

  toggleColor(code: string) {
    this.selectedColors.set(toggled(this.selectedColors(), code));
  }

  /* --- képek --- */

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const picked = Array.from(input.files ?? []).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    this.images.set([...this.images(), ...picked]);
    // Ürítjük az inputot, hogy ugyanazt a fájlt újra ki lehessen választani.
    input.value = '';
  }

  removeImage(index: number) {
    const images = this.images();
    URL.revokeObjectURL(images[index].previewUrl);
    this.images.set(images.filter((_, i) => i !== index));

    if (this.defaultImageIndex() >= this.images().length) {
      this.defaultImageIndex.set(0);
    }
  }

  setDefaultImage(index: number) {
    this.defaultImageIndex.set(index);
  }

  /* --- mentés --- */

  onSubmit() {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    this.status.set('Termék létrehozása...');

    const value = this.form.getRawValue();

    // Slug-szerű URL generálása a névből, mert a Shopizer megköveteli a friendlyUrl-t
    const friendlyUrl = value.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // ékezetek eltávolítása
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const attributes = this.selectedAttributes();
    let createdId: number | null = null;

    this.productService
      .createProduct({
        sku: value.sku,
        available: true,
        visible: true,
        productShipeable: true,
        price: value.price,
        quantity: value.quantity,
        inventory: {
          sku: value.sku,
          quantity: value.quantity,
          price: { price: value.price, defaultPrice: true, code: 'base' },
        },
        categories: [{ id: value.categoryId! }],
        descriptions: [
          {
            language: 'en',
            name: value.name,
            description: value.description || value.name,
            friendlyUrl,
          },
        ],
      })
      .pipe(
        switchMap((res) => {
          createdId = res.id;
          return this.saveAttributes(res.id, attributes).pipe(
            switchMap(() => this.uploadImages(res.id)),
            map(() => res.id)
          );
        })
      )
      .subscribe({
        next: (id) => {
          this.saving.set(false);
          this.status.set('');
          this.success.set(`✓ A termék létrejött (ID: ${id}).`);
          this.resetForm();
        },
        error: (err) => {
          this.saving.set(false);
          this.status.set('');

          const detail =
            `(${err.status ?? 'ismeretlen hiba'}) ` +
            (err.error?.message ?? 'Nézd meg a Network fület a részletekért.');

          this.error.set(
            createdId === null
              ? `Nem sikerült létrehozni a terméket ${detail}`
              : `A termék létrejött (ID: ${createdId}), de a méretek/színek vagy a képek ` +
                `mentése közben hiba történt ${detail}`
          );
        },
      });
  }

  /** A kijelölésekből összeálló (opció, érték) párok. */
  private selectedAttributes(): { option: OptionDef; value: OptionValueDef }[] {
    const sizes = this.availableSizes()
      .filter((s) => this.selectedSizes().has(s.code))
      .map((value) => ({ option: OPTION_SIZE, value }));

    const colors = COLORS.filter((c) => this.selectedColors().has(c.code)).map((value) => ({
      option: OPTION_COLOR,
      value,
    }));

    const conditionCode = this.form.controls.condition.value;
    const condition = CONDITIONS.filter((c) => c.code === conditionCode).map((value) => ({
      option: OPTION_CONDITION,
      value,
    }));

    return [...sizes, ...colors, ...condition];
  }

  /**
   * Először létrehozza a Shopizerben a hiányzó opciókat/értékeket, majd
   * egyesével hozzárendeli őket a termékhez.
   */
  private saveAttributes(
    productId: number,
    attributes: { option: OptionDef; value: OptionValueDef }[]
  ): Observable<void> {
    if (attributes.length === 0) return of(void 0);

    this.status.set('Méretek / színek előkészítése...');

    const options = dedupeByCode(attributes.map((a) => a.option));
    const values = dedupeByCode(attributes.map((a) => a.value));

    return this.optionService.ensureOptions(options, values).pipe(
      switchMap(() =>
        sequential(
          attributes.map((attribute, index) =>
            defer(() => {
              this.status.set(
                `Tulajdonságok mentése (${index + 1}/${attributes.length})...`
              );
              return this.optionService.addAttribute(
                productId,
                attribute.option.code,
                attribute.value.code,
                index
              );
            })
          )
        )
      )
    );
  }

  private uploadImages(productId: number): Observable<void> {
    const images = this.images();
    if (images.length === 0) return of(void 0);

    const defaultIndex = Math.min(this.defaultImageIndex(), images.length - 1);

    // A Shopizer minden feltöltött képet "fő képnek" jelöl, és a termék fő képe
    // végül a LEGUTOLJÁRA feltöltött lesz. Ezért a kiválasztott fő képet töltjük
    // fel utoljára - viszont order=0-val, hogy a galériában is az legyen elöl.
    const plan = [
      ...images
        .filter((_, index) => index !== defaultIndex)
        .map((image, index) => ({ image, order: index + 1, isDefault: false })),
      { image: images[defaultIndex], order: 0, isDefault: true },
    ];

    return sequential(
      plan.map((step, index) =>
        defer(() => {
          this.status.set(`Képek feltöltése (${index + 1}/${plan.length})...`);
          return this.productService.uploadImage(
            productId,
            step.image.file,
            step.order,
            step.isDefault
          );
        })
      )
    );
  }

  private resetForm() {
    this.form.reset({ price: 0, quantity: 1, categoryId: null, condition: '' });
    this.selectedSizes.set(new Set());
    this.selectedColors.set(new Set());
    this.clearImages();
    this.defaultImageIndex.set(0);
  }

  private clearImages() {
    this.images().forEach((image) => URL.revokeObjectURL(image.previewUrl));
    this.images.set([]);
  }
}

/* --- apró segédfüggvények --- */

function toggled(source: Set<string>, code: string): Set<string> {
  const next = new Set(source);
  if (!next.delete(code)) next.add(code);
  return next;
}

function dedupeByCode<T extends { code: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.code, item])).values()];
}

/** Hívások egymás után (nem párhuzamosan) - a Shopizer így kevésbé akad meg. */
function sequential(calls: Observable<unknown>[]): Observable<void> {
  if (calls.length === 0) return of(void 0);
  return concat(...calls).pipe(
    last(),
    map(() => void 0)
  );
}
