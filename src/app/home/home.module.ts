import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { HomeComponent, LinkAnimeDialog, FinalistCommentsDialog } from './home.component';

@NgModule({
  declarations: [
    HomeComponent,
    LinkAnimeDialog,
    FinalistCommentsDialog
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [HomeComponent]
})
export class HomeModule { }
