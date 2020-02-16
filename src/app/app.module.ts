import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material';
import { MatButtonModule, MatInputModule, MatDialogModule, MatListModule, MatCardModule, MatChipsModule, MatMenuModule, MatSelectModule, MatTabsModule , MatAutocompleteModule, MatCheckboxModule, MatProgressBarModule, MatRadioModule, MatNativeDateModule } from '@angular/material';
import { ColorPickerModule } from 'ngx-color-picker';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTooltipModule } from '@angular/material/tooltip';

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
import { TimelineService } from './services/timeline.service';
import { InfolistService } from './services/infolist.service';
import { AuthGuard } from './guards/auth.guard';
import { NotAuthGuard } from './guards/notAuth.guard';
import { SettingsComponent } from './settings/settings.component';
import { GroupComponent, ImportAnimeDialog } from './group/group.component';
import { HeaderComponent } from './header/header.component';
import { TopTensComponent } from './toptens/toptens.component';
import { TimelineComponent, DeleteEraDialog } from './timeline/timeline.component';
import { InfolistsComponent, RenameInfolistDialog } from './infolists/infolists.component';
import { BracketProcessComponent } from './bracket-process/bracket-process.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    LinkAnimeDialog,
    FinalistCommentsDialog,
    ConfirmDialog,
    DeleteEraDialog,
    RenameInfolistDialog,
    RegisterComponent,
    LoginComponent,
    SettingsComponent,
    GroupComponent,
    ImportAnimeDialog,
    HeaderComponent,
    TopTensComponent,
    TimelineComponent,
    InfolistsComponent,
    BracketProcessComponent
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
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule
  ],
  providers: [AuthService, AnimeService, UserService, GroupService, TopTensService, TimelineService, InfolistService, AuthGuard, NotAuthGuard],
  bootstrap: [AppComponent],
  entryComponents: [LinkAnimeDialog, FinalistCommentsDialog, ConfirmDialog, ImportAnimeDialog, DeleteEraDialog, RenameInfolistDialog]
})
export class AppModule { }
