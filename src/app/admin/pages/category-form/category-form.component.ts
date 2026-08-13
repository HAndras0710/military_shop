import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminCategoryService } from '../../services/admin-category.service';
import { ShopizerCategory } from '../../models/admin.model';
import { SIZE_SCHEMES, SizeSchemeCode, sizeSchemeByCode } from '../../models/attribute-schemes';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.scss',
})
export class CategoryFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private categoryService = inject(AdminCategoryService);

  readonly sizeSchemes = SIZE_SCHEMES;

  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  categories = signal<ShopizerCategory[]>([]);
  loadingCategories = signal(true);
  /** Melyik meglévő kategóriát mentjük épp (ID), hogy csak az a sor legyen letiltva */
  savingCategoryId = signal<number | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    sizeScheme: ['NONE' as SizeSchemeCode],
  });

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.loadingCategories.set(true);
    this.categoryService.getCategories().subscribe({
      next: (res) => {
        this.categories.set(res.categories ?? []);
        this.loadingCategories.set(false);
      },
      error: () => {
        this.loadingCategories.set(false);
        this.error.set('Nem sikerült betölteni a meglévő kategóriákat. Fut a backend?');
      },
    });
  }

  /** A táblázatban a jelenlegi mérettáblázat kiválasztásához */
  schemeOf(category: ShopizerCategory): SizeSchemeCode {
    return AdminCategoryService.sizeSchemeOf(category);
  }

  schemeLabel(code: SizeSchemeCode): string {
    return sizeSchemeByCode(code).label;
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    const { name, sizeScheme } = this.form.getRawValue();

    // A "code" és a "friendlyUrl" a névből generálódik automatikusan,
    // hogy neked csak egy mezőt kelljen kitöltened.
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // ékezetek eltávolítása
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Egyedi code-ot generálunk (időbélyeggel), hogy elkerüljük a korábban
    // látott "Duplicate entry" hibát, ha véletlenül kétszer küldenéd el.
    const uniqueCode = `${slug}-${Date.now().toString(36)}`;

    this.categoryService
      .createCategory({
        code: uniqueCode,
        order: 1,
        visible: true,
        descriptions: [
          {
            language: 'en',
            name,
            friendlyUrl: slug,
            highlights: AdminCategoryService.encodeSizeScheme(sizeScheme),
          },
        ],
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.success.set(
            `✓ "${name}" kategória létrejött (ID: ${res.id}), mérettáblázat: ${this.schemeLabel(sizeScheme)}.`
          );
          this.form.reset({ name: '', sizeScheme: 'NONE' });
          this.loadCategories();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(
            `Nem sikerült létrehozni a kategóriát (${err.status ?? 'ismeretlen hiba'}). ` +
            (err.error?.message ?? 'Nézd meg a Network fület a részletekért.')
          );
        },
      });
  }

  /** Meglévő kategória mérettáblázatának átállítása */
  onSchemeChange(category: ShopizerCategory, event: Event) {
    const scheme = (event.target as HTMLSelectElement).value as SizeSchemeCode;

    this.savingCategoryId.set(category.id);
    this.error.set(null);
    this.success.set(null);

    // A PUT felülírja a leírásokat, ezért a meglévő mezőket is visszaküldjük.
    const description = category.description;

    this.categoryService
      .updateCategory(category.id, {
        code: category.code,
        sortOrder: category.sortOrder ?? 0,
        visible: category.visible,
        descriptions: [
          {
            language: description?.language ?? 'en',
            name: description?.name ?? category.code,
            description: description?.description ?? null,
            friendlyUrl: description?.friendlyUrl ?? null,
            title: description?.title ?? null,
            metaDescription: description?.metaDescription ?? null,
            highlights: AdminCategoryService.encodeSizeScheme(scheme),
          },
        ],
      })
      .subscribe({
        next: () => {
          this.savingCategoryId.set(null);
          this.success.set(
            `✓ "${description?.name ?? category.code}" mérettáblázata: ${this.schemeLabel(scheme)}.`
          );
          this.loadCategories();
        },
        error: (err) => {
          this.savingCategoryId.set(null);
          this.error.set(
            `Nem sikerült módosítani a kategóriát (${err.status ?? 'ismeretlen hiba'}). ` +
            (err.error?.message ?? 'Nézd meg a Network fület a részletekért.')
          );
          this.loadCategories(); // vissza a tényleges állapotra
        },
      });
  }
}
