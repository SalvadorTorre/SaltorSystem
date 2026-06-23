// import { NgModule } from '@angular/core';
// import { BrowserModule } from '@angular/platform-browser';
// import { ServiceWorkerModule } from '@angular/service-worker';
// import { environment } from '../environments/environment';
// import { AppRoutingModule } from './app-routing.module';
// import { AppComponent } from './app.component';
// import { RouterModule } from '@angular/router';
// import { HttpClientModule } from '@angular/common/http';
// @NgModule({
//   declarations: [
//     AppComponent,
//   ],
//   imports: [
//     BrowserModule,

//     AppRoutingModule,
//     HttpClientModule,
//     RouterModule,
//     ServiceWorkerModule.register('ngsw-worker.js', {
//       enabled: environment.production,
//     }),
//   ],
//   providers: [],
//   bootstrap: [AppComponent]
// })
// export class AppModule { }


import { DEFAULT_CURRENCY_CODE, LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEsDo from '@angular/common/locales/es-DO';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';

registerLocaleData(localeEsDo);

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
    }),
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'es-DO' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'DOP' },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
