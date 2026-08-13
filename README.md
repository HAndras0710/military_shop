# Military Shop Demo (Angular)

Ez egy **tanulási célú, lokálisan futtatható Angular alkalmazás**, amely a
[military-shop.hu](https://military-shop.hu/) webáruház felépítését imitálja:
kategóriák, termékrács, termékrészletező oldal, kosár, keresés.

**Nincs benne valódi backend, adatbázis vagy fizetés** — minden termékadat
statikus mock adat (`src/app/core/services/mock-data.ts`), amit egy
`ProductService` szolgál ki mesterséges késleltetéssel, mintha hálózati
kérés lenne. Így pontosan úgy viselkedik, mint egy éles app (loading state,
async adatbetöltés), csak backend nélkül.

## Indítás lokálisan

Szükséged lesz [Node.js](https://nodejs.org/) 18+ verzióra.

```bash
# 1. Csomagold ki a zip-et, majd lépj be a mappába
cd military-shop-demo

# 2. Telepítsd a függőségeket
npm install

# 3. Indítsd el a fejlesztői szervert
npm start
```

Ezután nyisd meg a böngészőben: **http://localhost:4200**

## Mit érdemes kipróbálni

- Kattints egy kategóriára a bal oldali menüben → szűrt termékrács
- Kattints egy termékre → részletező oldal, méretválasztóval
- "Kosárba" gomb → figyeld a fejlécben a kosár jelvény számának változását
- Kosár oldal → mennyiség módosítás, törlés, végösszeg újraszámolása
- Fejléc keresőmező → keresés termék név vagy cikkszám alapján

## Projekt felépítés

```
src/app/
├── core/                    # modellek, ProductService, mock adatok
├── shared/components/       # header, footer, category-sidebar, product-card
└── features/
    ├── catalog/             # termékrács, termékrészletező, keresés
    ├── cart/                # signal-alapú CartService + kosár oldal
    └── static-pages/        # információ, kapcsolat
```

## Admin felület (valódi Shopizer backendhez kötve)

A `/admin` útvonal alatt van egy saját, minimális admin felület, ami **közvetlenül
a te futó Shopizer backendedet hívja** (`localhost:8080`) — ez teljesen külön
rendszer a fő katalógustól, ami továbbra is mock adatot használ.

**Előfeltétel:** fusson a Shopizer backend `localhost:8080`-on.

1. `http://localhost:4200/admin/login` — jelentkezz be (alapból `admin@shopizer.com` / `password`
   van kitöltve, ha nálad más, írd át)
2. `http://localhost:4200/admin/termekek` — lista a meglévő termékekről, törlés lehetőséggel
3. `http://localhost:4200/admin/termekek/uj` — új termék felvitele form-ból

**Fontos:** ehhez legalább **egy kategóriának** már léteznie kell a backend-en
(a form onnan tölti be a legördülő listát), különben a form nem enged menteni.
Ha még nincs kategóriád, hozz létre egyet Swaggerből:
```
POST /api/v1/private/category?store=DEFAULT
{
  "code": "kabatok",
  "order": 1,
  "visible": true,
  "descriptions": [
    { "language": "en", "name": "Coats", "friendlyUrl": "coats" }
  ]
}
```

**Backend URL módosítása:** ha a Shopizer nem `localhost:8080`-on fut nálad,
írd át a `src/environments/environment.ts` fájlban az `apiUrl`-t.

## Ha valódi backendhez akarod kötni

A `ProductService` (`src/app/core/services/product.service.ts`) az egyetlen
hely, amit ki kell cserélni: jelenleg `of(mockData).pipe(delay(...))`
formában ad vissza adatot, ezt kell lecserélni `HttpClient` hívásokra,
pl. egy Java/Spring Boot (Shopizer) API felé:

```typescript
getProducts(categorySlug?: string): Observable<Product[]> {
  return this.http.get<Product[]>(`/api/products?category=${categorySlug}`);
}
```

A komponensek (product-list, product-detail, stb.) nem fognak változni,
mert azok csak a service Observable-jét fogyasztják — ez a rétegzett
felépítés (komponens ↔ service ↔ backend) egyik fő előnye.
