import { Component, Inject, OnInit } from '@angular/core'
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material'
import { ActivatedRoute, Params } from '@angular/router'
import { AuthService } from '../services/auth.service'
import { TimelineService } from '../services/timeline.service'
import { Era } from './era'

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.css'],
})
export class TimelineComponent implements OnInit {
  currentUser: string
  isLoading: boolean

  showToast: boolean
  toastMessage: string
  toastError: boolean

  refreshHeader: number

  eraList: Era[]
  editingEra: number // Can only edit one era at a time; this is the index of the one being edited
  editingEraString: string // string version of current era that appears in textarea

  isTimelineOwner: boolean // Only the timeline owner can edit the timeline; group members can observe
  unauthorizedError: boolean // For when someone tries to access someone's timline who isn't a group member

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

  createTimeline() {
    this.timelineService.createTimeline().subscribe(res => {
      if (res['success']) {
        this.eraList = [
          {
            name: 'First Era',
            startDate: 'April 1850',
            entries: ['List your anime here!'],
          },
        ]
        this.displayToast('Successfully created a new timeline!')
      } else {
        this.displayToast('There was a problem', true)
      }
    })
  }

  editEra(index: number) {
    // Replace viewing area with HTML textarea, convert eraList to one string and display
    let res = ''
    for (const entry of this.eraList[index].entries) {
      res += entry + '\n'
    }
    this.editingEraString = res.trim()
    this.editingEra = index
  }

  saveEraChanges(index: number) {
    this.eraList[index].entries = this.editingEraString.split('\n')
    this.timelineService.saveTimeline(this.eraList).subscribe(res => {
      if (res['success']) {
        this.editingEraString = ''
        this.editingEra = -1
        this.displayToast('Successfully saved your changes!')
      } else {
        this.displayToast('There was a problem', true)
      }
    })
  }

  addNewEra(index: number) {
    this.eraList.splice(index + 1, 0, {
      name: 'New Era',
      entries: ['List your anime here!'],
    })
    this.timelineService.saveTimeline(this.eraList).subscribe(res => {
      if (res['success']) {
        this.displayToast('New era added!')
      } else {
        this.displayToast('There was a problem', true)
      }
    })
  }

  deleteEra(index: number) {
    const dialogRef = this.dialog.open(DeleteEraDialogComponent, {
      data: { confirm: true },
    })
    dialogRef.afterClosed().subscribe(result => {
      // If result is defined then they confirmed the deletion
      if (result) {
        this.eraList.splice(index, 1)
        this.timelineService.saveTimeline(this.eraList).subscribe(res => {
          if (res['success']) {
            this.displayToast('Successfully deleted era!')
          } else {
            this.displayToast('There was a problem', true)
          }
        })
      }
    })
  }

  constructor(
    private authService: AuthService,
    private timelineService: TimelineService,
    private dialog: MatDialog,
    private activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.refreshHeader = Math.random()
    this.isTimelineOwner = true
    this.unauthorizedError = false

    this.isLoading = true
    this.eraList = []
    this.editingEra = -1
    this.editingEraString = ''

    // URL parameter lets us know if we're querying our own timeline or a group member's
    this.activatedRoute.queryParams.subscribe((params: Params) => {
      this.isTimelineOwner = true
      this.isLoading = true
      this.eraList = []
      this.editingEra = -1
      this.editingEraString = ''

      let user = ''
      if (params.user) {
        this.isTimelineOwner = false
        user = params.user
      }
      this.authService.getProfile().subscribe(res => {
        if (res['success']) {
          this.currentUser = res['user']['username']
          this.timelineService.fetchTimeline(user).subscribe(resOne => {
            if (resOne['success'] && resOne['timeline']) {
              this.eraList = resOne['timeline']['eras']
            } else if (!resOne['success'] && resOne['message'] === 'Permission denied') {
              this.unauthorizedError = true
            } else if (!resOne['success']) {
              this.displayToast('There was a problem.', true)
            }
            this.isLoading = false
          })
        } else {
          // If there was a problem we need to have them log in again
          this.authService.logout()
        }
      })
    })
  }
}
@Component({
  selector: 'app-delete-era',
  templateUrl: './delete-era.html',
})
export class DeleteEraDialogComponent {
  constructor(public dialogRef: MatDialogRef<DeleteEraDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {}
  onNoClick(): void {
    this.dialogRef.close()
  }
}
