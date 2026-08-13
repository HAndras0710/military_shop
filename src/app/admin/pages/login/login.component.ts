import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class AdminLoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    username: ['admin@shopizer.com', Validators.required],
    password: ['password', Validators.required],
  });

  onSubmit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    const { username, password } = this.form.getRawValue();
    this.authService.login(username, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/admin/termekek']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err.status === 401 || err.status === 403
            ? 'Hibás felhasználónév vagy jelszó.'
            : `Nem sikerült kapcsolódni a backendhez (${err.status ?? 'ismeretlen hiba'}). Fut a Shopizer localhost:8080-on?`
        );
      },
    });
  }
}
