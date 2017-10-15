import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { HttpModule } from '@angular/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material';
import { MatButtonModule, MatInputModule, MatDialogModule, MatListModule, MatCardModule, MatChipsModule, MatMenuModule, MatSelectModule, MatTabsModule } from '@angular/material';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent, LinkAnimeDialog, FinalistCommentsDialog} from './home/home.component';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { AuthService } from './services/auth.service';
import { AnimeService } from './services/anime.service';
import { UserService } from './services/user.service';
import { GroupService } from './services/group.service';
import { AuthGuard } from './guards/auth.guard';
import { NotAuthGuard } from './guards/notAuth.guard';
import { SettingsComponent } from './settings/settings.component';
import { GroupComponent } from './group/group.component';
import { HeaderComponent } from './header/header.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    LinkAnimeDialog,
    FinalistCommentsDialog,
    RegisterComponent,
    LoginComponent,
    SettingsComponent,
    GroupComponent,
    HeaderComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatInputModule,
    MatDialogModule,
    FormsModule,
    MatListModule,
    MatCardModule,
    MatChipsModule,
    AppRoutingModule,
    HttpModule,
    MatFormFieldModule,
    MatMenuModule,
    MatSelectModule,
    MatTabsModule
  ],
  providers: [AuthService, AnimeService, UserService, GroupService, AuthGuard, NotAuthGuard],
  bootstrap: [AppComponent],
  entryComponents: [LinkAnimeDialog, FinalistCommentsDialog]
})
export class AppModule { }
