import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { HttpModule } from '@angular/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material';
import { MdButtonModule, MatInputModule, MatDialogModule, MatListModule, MatCardModule, MatChipsModule } from '@angular/material';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent, LinkAnimeDialog, FinalistCommentsDialog} from './home/home.component';
import { HomeModule } from './home/home.module';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { AuthService } from './services/auth.service';
import { AnimeService } from './services/anime.service';
import { AuthGuard } from './guards/auth.guard';
import { NotAuthGuard } from './guards/notAuth.guard';

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
    HttpModule,
    MatFormFieldModule
  ],
  providers: [AuthService, AnimeService, AuthGuard, NotAuthGuard],
  bootstrap: [AppComponent],
  entryComponents: [LinkAnimeDialog, FinalistCommentsDialog]
})
export class AppModule { }
