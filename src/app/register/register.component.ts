import { HttpClient } from '@angular/common/http'
import { Component, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { AuthService } from '../services/auth.service'
import { User } from './user'

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit {
  model: User
  submitted: boolean
  showToast: boolean
  toastError: boolean
  toastMessage: string

  onSubmit() {
    this.submitted = true
    this.authService
      .registerUser({ username: this.model.username, password: this.model.password, bestgirl: this.model.bestgirl })
      .subscribe(res => {
        if (res['success']) {
          this.displayToast('Successfully registered! Logging in...')
          setTimeout(() => {
            this.authService.login(this.model).subscribe(resOne => {
              if (resOne['success']) {
                this.authService.storeUserData(resOne.token, resOne.user)
                this.router.navigate(['/'])
              } else {
                this.displayToast('There was a problem logging you in.', true)
                setTimeout(() => {
                  this.router.navigate(['/login'])
                }, 1000)
              }
            })
          }, 1500)
        } else if (res['message']['code'] && res['message']['code'] === 11000) {
          this.displayToast('That username already exists.', true)
          this.submitted = false
        } else if (res['message'] === 'spaces') {
          this.displayToast('Username cannot contain spaces.', true)
          this.submitted = false
        } else {
          this.displayToast('There was a problem with your registration.', true)
          this.submitted = false
        }
      })
  }
  private displayToast(message: string, error?: boolean) {
    // Display toast in application with message and timeout after 3 sec
    this.showToast = true
    this.toastMessage = message
    if (error) {
      this.toastError = true
    }
    setTimeout(() => {
      this.showToast = false
      this.toastMessage = ''
      this.toastError = false
    }, 3000)
  }

  constructor(private http: HttpClient, private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.model = new User('', '', '')
    this.submitted = false
    this.showToast = false
    this.toastError = false
    this.toastMessage = ''
  }
}
