import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { HomeComponent } from './home/home.component';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { SettingsComponent } from './settings/settings.component';
import { GroupComponent } from './group/group.component';
import { TopTensComponent } from './toptens/toptens.component';
import { TimelineComponent } from './timeline/timeline.component';
import { InfolistsComponent } from './infolists/infolists.component';
import { AuthGuard } from './guards/auth.guard';
import { NotAuthGuard } from './guards/notAuth.guard';

const appRoutes: Routes = [
  { path: '', component: HomeComponent, canActivate: [AuthGuard]},
  { path: 'register', component: RegisterComponent, canActivate: [NotAuthGuard]},
  { path: 'login', component: LoginComponent, canActivate: [NotAuthGuard]},
  { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard]},
  { path: 'timeline', component: TimelineComponent, canActivate: [AuthGuard]},
  { path: 'timeline/infolists', component: InfolistsComponent, canActivate: [AuthGuard]},
  { path: 'group', component: GroupComponent, canActivate: [AuthGuard]},
  { path: 'group/toptens', component: TopTensComponent, canActivate: [AuthGuard]}
  // { path: '**', component: PageNotFoundComponent}
]

@NgModule({
  declarations: [],
  imports: [ RouterModule.forRoot(appRoutes)],
  providers: [],
  bootstrap: [],
  exports: [RouterModule]
})
export class AppRoutingModule { }
