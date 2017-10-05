import { Component } from '@angular/core';
import { User } from './user'
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  // TODO: Tons of validation

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  model:User = new User("isaiah", "testpass");

  submitted:boolean = false;
  onSubmit() {
    this.submitted = true;
    this.authService.registerUser({ username: this.model.username, password: this.model.password }).subscribe(res => {
      console.log(res);
      this.router.navigate(['/login']);
    })
  }

}
