import { Component, OnInit } from '@angular/core';
import { User } from '../register/user';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  model: User;
  showToast: boolean;
  toastMessage: string;
  submitted: boolean;

  private displayToast(message: string) {
    // Display toast in application with message and timeout after 3 sec
    this.showToast = true;
    this.toastMessage = message;
    setTimeout(() => {
      this.showToast = false;
      this.toastMessage = "";
    }, 3000);
  }

  onSubmit() {
    this.authService.login(this.model).subscribe(res => {
      this.submitted = true;
      if (res["success"]) {
        this.authService.storeUserData(res.token, res.user);
        this.router.navigate(['/'])
      } else if (res["message"] == "Username not found" || res["message"] == "Incorrect password") {
        this.displayToast(res["message"]);
      } else {
        this.displayToast("There was a problem.");
        this.submitted = false;
        console.log(res["message"]);
      }
    })
  }

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.submitted = false;
    this.model = new User("","","");
    this.showToast = false;
    this.toastMessage = "";
  }

}
