import { Component } from '@angular/core';
import { User } from './user'
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { FormControl, Validators } from '@angular/forms'

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

  model:User = new User("", "", "");

  submitted:boolean = false;
  onSubmit() {
    this.submitted = true;
    this.authService.registerUser({ username: this.model.username, password: this.model.password, bestgirl: this.model.bestgirl }).subscribe(res => {
      if (res["success"]) {
        // TODO: Toast here
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      } else {
        console.log(res);
        this.submitted = false;
      }
    })
  }

}
