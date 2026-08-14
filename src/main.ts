import { registerLocaleData } from '@angular/common';
import localeHu from '@angular/common/locales/hu';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// A number/date pipe-ok mindenhol 'hu' locale-t kapnak (pl. {{ price | number:'1.0-0':'hu' }}),
// ehhez viszont a locale-adatokat előbb regisztrálni kell, különben a pipe kivétellel elhasal.
registerLocaleData(localeHu);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
