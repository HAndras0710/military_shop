import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'shopizer_admin_token';

/**
 * Minden "private" API híváshoz automatikusan hozzáfűzi a Bearer tokent,
 * amit a login után mentettünk. Így a service-eknek (pl. AdminProductService)
 * nem kell manuálisan bajlódniuk a fejléc beállításával.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token && req.url.includes('/private/')) {
    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(cloned);
  }

  return next(req);
};
