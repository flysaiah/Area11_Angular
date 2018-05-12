import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { MatDialogRef, MatDialog, MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'app-infolists',
  templateUrl: './infolists.component.html',
  styleUrls: ['./infolists.component.css']
})
export class InfolistsComponent implements OnInit {

  currentUser: string;
  refreshHeader: number;
  isLoading: boolean;

  showToast: boolean;
  toastMessage: string;
  toastError: boolean;

  allInfolists: Object[];
  selectedInfolists: Object[];

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

  testt() {
    console.log("Testing");
    console.log(this.selectedInfolists);
  }

  refresh() {
    console.log("Refreshing");
    this.allInfolists = [{"name": "Test1"}, {"name": "Test2"}, {"name": "Test3"}];

    this.isLoading = false;
  }

  constructor(
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.isLoading = true;
    this.allInfolists = [];
    this.selectedInfolists = [];

    this.authService.getProfile().subscribe((res) => {
      if (res["success"]) {
        this.currentUser = res["user"]["username"];
        this.refresh();
      } else {
        // If there was a problem we need to have them log in again
        console.log(res["message"]);
        this.authService.logout();
      }
    });
  }

}
