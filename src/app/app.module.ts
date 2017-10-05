import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { HttpModule } from '@angular/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { MdButtonModule, MatInputModule, MatDialogModule, MatListModule, MatCardModule, MatChipsModule } from '@angular/material';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent, LinkAnimeDialog, FinalistCommentsDialog} from './home/home.component';
import { HomeModule } from './home/home.module';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { AuthService } from './services/auth.service';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    LinkAnimeDialog,
    FinalistCommentsDialog,
    RegisterComponent,
    LoginComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MdButtonModule,
    MatInputModule,
    MatDialogModule,
    FormsModule,
    MatListModule,
    MatCardModule,
    MatChipsModule,
    AppRoutingModule,
    HttpModule
  ],
  providers: [AuthService],
  bootstrap: [AppComponent],
  entryComponents: [LinkAnimeDialog, FinalistCommentsDialog]
})
export class AppModule { }
