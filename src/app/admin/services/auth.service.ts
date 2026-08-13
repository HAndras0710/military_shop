import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'shopizer_admin_token';

interface LoginResponse {
  // A Shopizer login válasz mezőneve verziónként eltérhet - mindkettőt kezeljük.
  token?: string;
  accessToken?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // signal, hogy a UI (pl. fejléc) reaktívan tudja mutatni a bejelentkezett állapotot
  isLoggedIn = signal<boolean>(!!this.getToken());

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/v1/private/login`, {
        username,
        password,
      })
      .pipe(
        tap((response) => {
          const token = response.token ?? response.accessToken;
          if (token) {
            localStorage.setItem(TOKEN_KEY, token);
            this.isLoggedIn.set(true);
          }
        })
      );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    this.isLoggedIn.set(false);
    this.router.navigate(['/admin/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
}
