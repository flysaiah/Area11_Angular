import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { HomeComponent } from './home/home.component';
const appRoutes: Routes = [
  { path: '', component: HomeComponent}
  // TODO: Add a PageNotFoundComponent
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
