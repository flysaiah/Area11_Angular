import { Component, OnInit, Inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { MatDialogRef, MatDialog, MAT_DIALOG_DATA } from '@angular/material';
import { User } from '../register/user';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {

  model: User = new User("","","");

  showToast: boolean;
  toastMessage: string;
  toastError: boolean;

  currentUser: string;

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

  deleteAccount() {
    // Open dialog
    let dialogRef = this.dialog.open(DeleteAccountDialog, {
      width: '515px',
      data: {confirm: true}
    });

    dialogRef.afterClosed().subscribe(result => {
      // If result is defined then they confirmed the deletion
      if (result) {
        this.userService.deleteAccount().subscribe((res) => {
          if (res["success"]) {
            this.displayToast("Account successfully deleted.");
            setTimeout(() => {
              this.authService.logout();
            }, 1500);
          } else {
            this.displayToast("There was a problem deleting your account.", true);
            console.log(res);
          }
        })
      }
    });
  }

  saveChanges() {
    this.userService.saveUserChanges(this.model).subscribe((res) => {
      if (res["success"]) {
        this.displayToast("Your settings have been saved!");
        this.refresh();
      } else {
        this.displayToast("There was a problem saving your settings.");
      }
    })
  }

  logout() {
    this.authService.logout();
  }

  loadDefaultImage(target) {
    // if avatar image doesn't load, we load our default
    target.src = "http://s3.amazonaws.com/37assets/svn/765-default-avatar.png";
  }

  refresh() {
    this.authService.getProfile().subscribe((res) => {
      if (res["success"]) {
        this.currentUser = res["user"]["username"];
        this.userService.getUserInfo().subscribe((res) => {
          if (res["success"]) {
            this.model["bestgirl"] = res["user"]["bestgirl"];
            this.model["avatar"] = res["user"]["avatar"];
          } else {
            this.displayToast("There was a problem loading your settings.", true)
          }
        })
      } else {
        // If there was a problem we need to have them log in again
        this.authService.logout();
        console.log(res["message"]);
      }
    });
  }

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    this.refresh();
  };
}
@Component({
  selector: 'delete-account',
  templateUrl: './delete-account.html'
})
export class DeleteAccountDialog {
  constructor(
    public dialogRef: MatDialogRef<DeleteAccountDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
  onNoClick(): void {
    this.dialogRef.close();
  }
}
