import { Component, OnInit } from '@angular/core';
import { User } from '../register/user';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {

  model: User;
  showToast: boolean;
  toastMessage: string;
  toastError: boolean;
  submitted: boolean;

  private displayToast(message: string, error?: boolean) {
    // Display toast in application with message and timeout after 3 sec
    this.showToast = true;
    this.toastMessage = message;
    if (error) {
      this.toastError = true;
    }
    setTimeout(() => {
      this.showToast = false;
      this.toastMessage = "";
      this.toastError = false;
    }, 3000);
  }

  onSubmit() {
    this.authService.login(this.model).subscribe(res => {
      this.submitted = true;
      if (res.success) {
        this.authService.storeUserData(res.token, res.user);
        this.router.navigate(['/']);
      } else if (res.message == "Username not found." || res.message == "Incorrect password.") {
        this.displayToast(res.message, true);
        this.submitted = false;
      } else {
        this.displayToast("There was a problem.", true);
        this.submitted = false;
        console.log(res.message);
      }
    })
  }

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.submitted = false;
    this.model = new User("","","","");
    this.showToast = false;
    this.toastError = false;
    this.toastMessage = "";
  }

}
