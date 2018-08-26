import { NgModule } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { HttpModule } from '@angular/http'
import {
  MatAutocompleteModule,
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatChipsModule,
  MatDialogModule,
  MatFormFieldModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatProgressBarModule,
  MatRadioModule,
  MatSelectModule,
  MatTabsModule,
} from '@angular/material'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { ColorPickerModule } from 'ngx-color-picker'
import { AppRoutingModule } from './app-routing.module'
import { AppComponent, ConfirmDialogComponent } from './app.component'
import { GroupComponent, ImportAnimeDialogComponent } from './group/group.component'
import { AuthGuard } from './guards/auth.guard'
import { NotAuthGuard } from './guards/notAuth.guard'
import { HeaderComponent } from './header/header.component'
import { FinalistCommentsDialogComponent, HomeComponent, LinkAnimeDialogComponent } from './home/home.component'
import { InfolistsComponent } from './infolists/infolists.component'
import { LoginComponent } from './login/login.component'
import { RegisterComponent } from './register/register.component'
import { AnimeService } from './services/anime.service'
import { AuthService } from './services/auth.service'
import { GroupService } from './services/group.service'
import { InfolistService } from './services/infolist.service'
import { TimelineService } from './services/timeline.service'
import { TopTensService } from './services/toptens.service'
import { UserService } from './services/user.service'
import { DeleteAccountDialogComponent, SettingsComponent } from './settings/settings.component'
import { DeleteEraDialogComponent, TimelineComponent } from './timeline/timeline.component'
import { TopTensComponent } from './toptens/toptens.component'

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    LinkAnimeDialogComponent,
    FinalistCommentsDialogComponent,
    DeleteAccountDialogComponent,
    ConfirmDialogComponent,
    DeleteEraDialogComponent,
    RegisterComponent,
    LoginComponent,
    SettingsComponent,
    GroupComponent,
    ImportAnimeDialogComponent,
    HeaderComponent,
    TopTensComponent,
    TimelineComponent,
    InfolistsComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatButtonModule,
    HttpModule,
    MatInputModule,
    MatDialogModule,
    FormsModule,
    MatListModule,
    MatCardModule,
    MatChipsModule,
    AppRoutingModule,
    MatFormFieldModule,
    MatMenuModule,
    MatSelectModule,
    MatTabsModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatProgressBarModule,
    ColorPickerModule,
    MatRadioModule,
  ],
  providers: [
    AuthService,
    AnimeService,
    UserService,
    GroupService,
    TopTensService,
    TimelineService,
    InfolistService,
    AuthGuard,
    NotAuthGuard,
  ],
  bootstrap: [AppComponent],
  entryComponents: [
    LinkAnimeDialogComponent,
    FinalistCommentsDialogComponent,
    DeleteAccountDialogComponent,
    ConfirmDialogComponent,
    ImportAnimeDialogComponent,
    DeleteEraDialogComponent,
  ],
})
export class AppModule {}
