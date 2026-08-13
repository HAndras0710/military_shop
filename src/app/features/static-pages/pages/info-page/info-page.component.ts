import { Component } from '@angular/core';

@Component({
  selector: 'app-info-page',
  standalone: true,
  template: `
    <div class="container static-page">
      <h1>Vásárlói tájékoztató</h1>
      <p>
        Ez egy demó oldal, amely azt mutatja be, hogy a routing statikus
        tartalmú oldalakat (pl. ÁSZF, szállítási feltételek) is ki tud
        szolgálni ugyanabban az alkalmazásban, mint a termékkatalógust.
      </p>
      <p>
        Éles projektben ide kerülne pl. a szállítási módok, fizetési
        lehetőségek, elállási jog leírása.
      </p>
    </div>
  `,
  styles: [`
    .static-page { padding: 1.5rem 0; max-width: 700px; }
    h1 { color: #2d3320; }
    p { color: #555; line-height: 1.6; }
  `],
})
export class InfoPageComponent {}
