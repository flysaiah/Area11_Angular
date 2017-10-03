import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { HomeComponent, LinkAnimeDialog } from './home.component';

@NgModule({
  declarations: [
    HomeComponent,
    LinkAnimeDialog
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [HomeComponent]
})
export class HomeModule { }
