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

  model:User = new User("", "", "");

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  onSubmit() {
    console.log("Login form submitted");
    this.authService.login(this.model).subscribe(res => {
      console.log(res);
      this.authService.storeUserData(res.token, res.user);
      this.router.navigate(['/'])
    })
  }

  ngOnInit() {
  }

}
