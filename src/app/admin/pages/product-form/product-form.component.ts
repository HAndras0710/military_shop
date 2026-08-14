import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, concat, defer, forkJoin, map, of, switchMap, last } from 'rxjs';
import { AdminProductService } from '../../services/admin-product.service';
import { AdminCategoryService } from '../../services/admin-category.service';
import { AdminOptionService } from '../../services/admin-option.service';
import { ShopizerCategory, ShopizerImage, ShopizerProductAttribute } from '../../models/admin.model';
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

/** Azok az opció-kódok, amiket ez a felület felügyel - csak ezeket bántjuk mentéskor. */
const MANAGED_OPTION_CODES = new Set([
  OPTION_SIZE.code,
  OPTION_COLOR.code,
  OPTION_CONDITION.code,
]);

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss',
})
export class ProductFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(AdminProductService);
  private categoryService = inject(AdminCategoryService);
  private optionService = inject(AdminOptionService);

  readonly colors = COLORS;
  readonly conditions = CONDITIONS;

  /** Ha van :id route param, szerkesztünk egy meglévő terméket, nem újat viszünk fel. */
  editingProductId = signal<number | null>(null);
  isEditMode = computed(() => this.editingProductId() !== null);
  loadingProduct = signal(false);

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

  /** Szerkesztéskor: a termékhez már hozzárendelt attribútumok (attributeId-vel, törléshez kell). */
  private originalAttributes = signal<ShopizerProductAttribute[]>([]);

  /** Szerkesztéskor: a már feltöltött, szerveren lévő képek - itt csak törölni lehet őket. */
  existingImages = signal<ShopizerImage[]>([]);
  removingImageId = signal<number | null>(null);

  images = signal<ImageDraft[]>([]);
  /** Melyik ÚJONNAN feltöltendő kép legyen a fő kép */
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
      // (pl. ruhaméretről lábbelire váltás), ezért töröljük őket. Szerkesztésnél
      // a betöltött méretek utólag, ez után kerülnek vissza (lásd loadProductForEdit).
      this.selectedSizes.set(new Set());
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    const editId = idParam ? Number(idParam) : null;
    this.editingProductId.set(editId);

    this.categoryService.getCategories().subscribe({
      next: (res) => {
        this.categories.set(res.categories ?? []);
        this.loadingCategories.set(false);
        if (editId !== null) {
          this.loadProductForEdit(editId);
        }
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

  private loadProductForEdit(id: number) {
    this.loadingProduct.set(true);

    forkJoin({
      products: this.productService.getProducts(),
      attributes: this.optionService.getAttributes(id),
    }).subscribe({
      next: ({ products, attributes }) => {
        const product = (products.products ?? []).find((p) => p.id === id);
        if (!product) {
          this.error.set('Ez a termék nem található - lehet, hogy közben törölték.');
          this.loadingProduct.set(false);
          return;
        }

        this.originalAttributes.set(attributes);
        this.existingImages.set(product.images ?? []);

        this.form.patchValue({
          name: product.description?.name ?? '',
          sku: product.sku,
          price: product.price ?? 0,
          quantity: product.quantity ?? 0,
          categoryId: product.categories?.[0]?.id ?? null,
          description: product.description?.description ?? '',
          condition:
            attributes.find((a) => a.option.code === OPTION_CONDITION.code)?.optionValue.code ??
            '',
        });
        // Csak most, a kategória beállítása UTÁN állítjuk be a méreteket, mert a
        // categoryId valueChanges feliratkozás fentebb törli a méret-kijelölést.
        this.selectedSizes.set(
          new Set(
            attributes
              .filter((a) => a.option.code === OPTION_SIZE.code)
              .map((a) => a.optionValue.code)
          )
        );
        this.selectedColors.set(
          new Set(
            attributes
              .filter((a) => a.option.code === OPTION_COLOR.code)
              .map((a) => a.optionValue.code)
          )
        );

        // Szerkesztésnél a SKU-t nem engedjük módosítani: a feltöltött képek
        // tárolási útvonala a SKU-hoz kötött, egy SKU-váltás eltörné a linküket.
        this.form.controls.sku.disable();

        this.loadingProduct.set(false);
      },
      error: () => {
        this.error.set('Nem sikerült betölteni a terméket. Fut a backend?');
        this.loadingProduct.set(false);
      },
    });
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

  /** Egy már feltöltött (szerveren lévő) kép azonnali törlése. */
  removeExistingImage(image: ShopizerImage) {
    const productId = this.editingProductId();
    if (productId === null || !confirm('Törlöd ezt a képet?')) return;

    this.removingImageId.set(image.id);
    this.productService.deleteImage(productId, image.id).subscribe({
      next: () => {
        this.existingImages.set(this.existingImages().filter((i) => i.id !== image.id));
        this.removingImageId.set(null);
      },
      error: () => {
        this.removingImageId.set(null);
        this.error.set('Nem sikerült törölni a képet.');
      },
    });
  }

  /* --- mentés --- */

  onSubmit() {
    if (this.form.invalid || this.saving()) return;

    const editId = this.editingProductId();
    if (editId !== null) {
      this.submitEdit(editId);
    } else {
      this.submitCreate();
    }
  }

  private buildDescriptions(name: string, description: string) {
    // Slug-szerű URL generálása a névből, mert a Shopizer megköveteli a friendlyUrl-t
    const friendlyUrl = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // ékezetek eltávolítása
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    return {
      friendlyUrl,
      descriptions: [
        {
          language: 'en',
          name,
          description: description || name,
          friendlyUrl,
        },
      ],
    };
  }

  private submitCreate() {
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    this.status.set('Termék létrehozása...');

    const value = this.form.getRawValue();
    const { descriptions } = this.buildDescriptions(value.name, value.description);
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
        descriptions,
      })
      .pipe(
        switchMap((res) => {
          createdId = res.id;
          return this.saveNewAttributes(res.id, attributes).pipe(
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

  private submitEdit(id: number) {
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    this.status.set('Termék mentése...');

    const value = this.form.getRawValue();
    const { descriptions } = this.buildDescriptions(value.name, value.description);

    this.productService
      .updateProduct(id, {
        id,
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
        descriptions,
      })
      .pipe(
        switchMap(() => this.syncAttributes(id)),
        switchMap(() => this.uploadImages(id))
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.status.set('');
          this.router.navigate(['/admin/termekek']);
        },
        error: (err) => {
          this.saving.set(false);
          this.status.set('');
          this.error.set(
            `Nem sikerült elmenteni a módosításokat (${err.status ?? 'ismeretlen hiba'}). ` +
              (err.error?.message ?? 'Nézd meg a Network fület a részletekért.')
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
   * egyesével hozzárendeli őket a termékhez. (Új termékhez - nincs mivel diffelni.)
   */
  private saveNewAttributes(
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
              this.status.set(`Tulajdonságok mentése (${index + 1}/${attributes.length})...`);
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

  /**
   * Szerkesztésnél: összeveti a jelenlegi kijelölést azzal, ami eredetileg a
   * termékhez tartozott, és csak a különbséget küldi el (törli, ami kikerült,
   * hozzáadja, ami új). A felület nem ismer opció-kódokat kezel (méret/szín/
   * állapot) - minden mást (pl. régi, kézzel felvitt attribútumot) érintetlenül hagy.
   */
  private syncAttributes(productId: number): Observable<void> {
    const desired = this.selectedAttributes();
    const desiredKeys = new Set(desired.map((a) => attributeKey(a.option.code, a.value.code)));

    const managedOriginal = this.originalAttributes().filter((a) =>
      MANAGED_OPTION_CODES.has(a.option.code)
    );
    const originalKeys = new Set(
      managedOriginal.map((a) => attributeKey(a.option.code, a.optionValue.code))
    );

    const toRemove = managedOriginal.filter(
      (a) => !desiredKeys.has(attributeKey(a.option.code, a.optionValue.code))
    );
    const toAdd = desired.filter(
      (a) => !originalKeys.has(attributeKey(a.option.code, a.value.code))
    );

    if (toRemove.length === 0 && toAdd.length === 0) return of(void 0);

    this.status.set('Méretek / színek frissítése...');

    const removeCalls = toRemove.map((a) =>
      defer(() => this.optionService.removeAttribute(productId, a.id))
    );

    const addOptions = dedupeByCode(toAdd.map((a) => a.option));
    const addValues = dedupeByCode(toAdd.map((a) => a.value));

    const addCalls$ = toAdd.length
      ? this.optionService.ensureOptions(addOptions, addValues).pipe(
          switchMap(() =>
            sequential(
              toAdd.map((attribute, index) =>
                defer(() =>
                  this.optionService.addAttribute(
                    productId,
                    attribute.option.code,
                    attribute.value.code,
                    index
                  )
                )
              )
            )
          )
        )
      : of(void 0);

    return sequential(removeCalls).pipe(switchMap(() => addCalls$));
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

function attributeKey(optionCode: string, valueCode: string): string {
  return `${optionCode}:${valueCode}`;
}

/** Hívások egymás után (nem párhuzamosan) - a Shopizer így kevésbé akad meg. */
function sequential(calls: Observable<unknown>[]): Observable<void> {
  if (calls.length === 0) return of(void 0);
  return concat(...calls).pipe(
    last(),
    map(() => void 0)
  );
}
