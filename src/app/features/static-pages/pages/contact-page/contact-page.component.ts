import { Component } from '@angular/core';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  template: `
    <div class="container static-page">
      <h1>Kapcsolat</h1>
      <p>Ez egy demó kapcsolati oldal, valódi űrlapküldés nélkül.</p>
      <ul>
        <li>📍 Cím: Demo utca 1., 1000 Demo Város</li>
        <li>📞 Telefon: +36 1 234 5678</li>
        <li>✉️ E-mail: info&#64;demo-shop.hu</li>
      </ul>
    </div>
  `,
  styles: [`
    .static-page { padding: 1.5rem 0; max-width: 700px; }
    h1 { color: #2d3320; }
    p, li { color: #555; line-height: 1.6; }
    ul { padding-left: 1.2rem; }
  `],
})
export class ContactPageComponent {}
