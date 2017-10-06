import { Component, OnInit } from '@angular/core';
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
export class RegisterComponent implements OnInit {

  model: User;
  submitted: boolean
  showToast: boolean;
  toastMessage: string;

  onSubmit() {
    this.submitted = true;
    this.authService.registerUser({ username: this.model.username, password: this.model.password, bestgirl: this.model.bestgirl }).subscribe(res => {
      if (res["success"]) {
        this.displayToast("Successfully registered!")
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      } else {
        if (res["message"]["code"] == 11000) {
          this.displayToast("That username already exists");
        }
        this.submitted = false;
      }
    })
  }
  private displayToast(message: string) {
    // Display toast in application with message and timeout after 3 sec
    this.showToast = true;
    this.toastMessage = message;
    setTimeout(() => {
      this.showToast = false;
      this.toastMessage = "";
    }, 3000);
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.model = new User("","","");
    this.submitted = false;
    this.showToast = false;
    this.toastMessage = "";
  }

}
