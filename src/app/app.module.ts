import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { HttpModule } from '@angular/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material';
import { MatButtonModule, MatInputModule, MatDialogModule, MatListModule, MatCardModule, MatChipsModule, MatMenuModule, MatSelectModule, MatTabsModule , MatAutocompleteModule, MatCheckboxModule, MatProgressBarModule } from '@angular/material';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent, ConfirmDialog } from './app.component';
import { HomeComponent, LinkAnimeDialog, FinalistCommentsDialog} from './home/home.component';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { AuthService } from './services/auth.service';
import { AnimeService } from './services/anime.service';
import { UserService } from './services/user.service';
import { GroupService } from './services/group.service';
import { TopTensService } from './services/toptens.service';
import { AuthGuard } from './guards/auth.guard';
import { NotAuthGuard } from './guards/notAuth.guard';
import { SettingsComponent, DeleteAccountDialog } from './settings/settings.component';
import { GroupComponent, ImportAnimeDialog } from './group/group.component';
import { HeaderComponent } from './header/header.component';
import { TopTensComponent } from './toptens/toptens.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    LinkAnimeDialog,
    FinalistCommentsDialog,
    DeleteAccountDialog,
    ConfirmDialog,
    RegisterComponent,
    LoginComponent,
    SettingsComponent,
    GroupComponent,
    ImportAnimeDialog,
    HeaderComponent,
    TopTensComponent
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
    MatTabsModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatProgressBarModule
  ],
  providers: [AuthService, AnimeService, UserService, GroupService, TopTensService, AuthGuard, NotAuthGuard],
  bootstrap: [AppComponent],
  entryComponents: [LinkAnimeDialog, FinalistCommentsDialog, DeleteAccountDialog, ConfirmDialog, ImportAnimeDialog]
})
export class AppModule { }
