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
  showUploadOptions: boolean;

  refreshHeader: number;

  showToast: boolean;
  toastMessage: string;
  toastError: boolean;

  currentUser: string;
  userAvatar: string

  avatarUpload: Array<File> = [];

  upload() {
    let formData : any = new FormData();
    for(var i = 0; i < this.avatarUpload.length; i++) {
      formData.append("uploadAvatar", this.avatarUpload[i], "area11-user-avatar");
    }
    this.userService.uploadUserAvatar(formData).subscribe((res) => {
      if (res["success"]) {
        this.displayToast("Profile avatar changed successfully!");
        this.avatarUpload = [];
        this.refresh();
      } else if (res["message"] == "Token") {
        this.displayToast("Your session has expired. Please refresh and log back in.", true);
      } else {
        this.displayToast("There was a problem changing your profile avatar.", true);
      }
    });
  }

  fileChangeEvent(fileInput: any){
    this.avatarUpload = <Array<File>> fileInput.target.files;
  }

  toggleUploadOptions() {
    this.showUploadOptions = !this.showUploadOptions;
  }

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
      data: {confirm: true}
    });

    dialogRef.afterClosed().subscribe(result => {
      // If result is defined then they confirmed the deletion
      if (result) {
        this.userService.deleteAccount(this.currentUser).subscribe((res) => {
          if (res["success"]) {
            this.displayToast("Account successfully deleted.");
            setTimeout(() => {
              this.authService.logout();
            }, 1500);
          } else if (res["message"] == "Token") {
            this.displayToast("Your session has expired. Please refresh and log back in.", true);
          } else {
            this.displayToast("There was a problem deleting your account.", true);
            console.log(res);
          }
        });
      }
    });
  }

  saveChanges() {
    this.userService.saveUserChanges(this.model).subscribe((res) => {
      if (res["success"]) {
        this.displayToast("Your settings have been saved!");
        this.refresh();
      } else if (res["message"] == "Token") {
        this.displayToast("Your session has expired. Please refresh and log back in.", true);
      } else {
        this.displayToast("There was a problem saving your settings.");
      }
    })
  }

  logout() {
    this.authService.logout();
  }

  refresh() {
    this.refreshHeader = Math.random();

    this.showUploadOptions = false;
    this.userAvatar = "";   // Reset this so we force HTML to refresh avatar
    this.authService.getProfile().subscribe((res) => {
      if (res["success"]) {
        this.currentUser = res["user"]["username"];
        // Use random number to force refresh of image after new upload
        this.userAvatar = "/" + res["user"]["_id"] + "?xxx=" + Math.random();
        this.userService.getUserInfo().subscribe((res) => {
          if (res["success"]) {
            this.model["bestgirl"] = res["user"]["bestgirl"];
            if (res["user"]["autoTimelineAdd"]) {
              this.model["autoTimelineAdd"] = res["user"]["autoTimelineAdd"];
            }
          } else {
            this.displayToast("There was a problem loading your settings.", true)
          }
        });
      } else {
        // If there was a problem we need to have them log in again
        console.log(res["message"]);
        this.authService.logout();
      }
    });
  }

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private dialog: MatDialog,
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
