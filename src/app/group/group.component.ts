import { Component, Inject, OnInit } from '@angular/core'
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material'
import { ConfirmDialogComponent } from '../app.component'
import { AuthService } from '../services/auth.service'
import { GroupService } from '../services/group.service'
import { UserService } from '../services/user.service'
import { Group } from './group'

@Component({
  selector: 'app-group',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.css'],
})
export class GroupComponent implements OnInit {
  showToast: boolean
  toastMessage: string
  toastError: boolean

  refreshHeader: number
  isLoading: boolean

  newGroupName: string
  groupAvatarUpload: Array<File> = []
  showUploadOptions: boolean
  joinGroupName: string
  currentGroup: Group
  currentGroupAvatar: string
  changesModel: Group
  // Use these arrays so we can iterate through isPending=true vs isPending=false easier in the HTML
  currentGroupMembersCol1: {
    id: string
    username: string
    avatar: string
    bestgirl: string
    isPending: boolean
    currentlyWatching?: string
  }[]
  currentGroupMembersCol2: {
    id: string
    username: string
    avatar: string
    bestgirl: string
    isPending: boolean
    currentlyWatching?: string
  }[]
  pendingGroupRequests: { id: string; username: string; avatar: string; bestgirl: string; isPending: boolean }[]
  pendingUserRequestsCol1: { id: string; username: string; avatar: string; bestgirl: string; isPending: boolean }[]
  pendingUserRequestsCol2: { id: string; username: string; avatar: string; bestgirl: string; isPending: boolean }[]

  currentUser: string

  createGroup() {
    this.groupService.createGroup(this.newGroupName).subscribe(res => {
      if (res['success']) {
        this.displayToast('Group successfully created!')
        this.refresh()
      } else if (res['message']['code'] === 11000) {
        this.displayToast('A group with that name already exists.', true)
      } else if (res['message'] === 'No group found' || res['message'] === 'Invalid group membership') {
        this.displayToast('There is a problem with your group membership.', true)
      } else if (res['message'] === 'Token') {
        this.displayToast('Your session has expired. Please refresh and log back in.', true)
      } else {
        this.displayToast('There was a problem creating the group', true)
      }
    })
  }

  leaveGroup() {
    this.groupService.leaveGroup(this.currentGroup['name']).subscribe(res => {
      if (res['success']) {
        this.displayToast('You have successfully left the group!')
      } else if (res['message'] === 'Token') {
        this.displayToast('Your session has expired. Please refresh and log back in.', true)
      } else {
        this.displayToast('There was a problem removing you from the group.', true)
      }
      this.refresh()
    })
  }

  fileChangeEvent(fileInput: any) {
    this.groupAvatarUpload = <Array<File>>fileInput.target.files
  }

  upload() {
    // For group avatar
    const formData: any = new FormData()
    for (let i = 0; i < this.groupAvatarUpload.length; i++) {
      formData.append('uploadAvatar', this.groupAvatarUpload[i], this.currentGroup['name'].split(' ').join('-'))
    }
    this.userService.uploadUserAvatar(formData).subscribe(res => {
      if (res['success']) {
        this.displayToast('Group avatar changed successfully!')
        this.groupAvatarUpload = []
        this.refresh()
      } else if (res['message'] === 'Token') {
        this.displayToast('Your session has expired. Please refresh and log back in.', true)
      } else {
        this.displayToast('There was a problem changing your group avatar.', true)
      }
    })
  }

  acceptUserRequest(pendingUser: { id: string; username: string }) {
    // Change isPending status of user
    this.groupService.acceptUserRequest(this.currentGroup['name'], pendingUser.id).subscribe(res => {
      if (res['success']) {
        this.displayToast(pendingUser.username + ' successfully added to group!')
        this.refresh()
      } else if (res['message'] === 'Already in group') {
        this.displayToast(pendingUser.username + ' has already been accepted.', true)
        this.refresh()
      } else if (res['message'] === 'In different group') {
        this.displayToast(pendingUser.username + ' is a member of a different group.', true)
        this.refresh()
      } else if (res['message'] === 'No group found' || res['message'] === 'Invalid group membership') {
        this.displayToast('There is a problem with your group membership.', true)
      } else if (res['message'] === 'Token') {
        this.displayToast('Your session has expired. Please refresh and log back in.', true)
      } else {
        this.displayToast('There was a problem accepting the request.s')
      }
    })
  }
  rejectUserRequest(pendingUser: { id: string; username: string }) {
    // Change isPending status of user
    this.groupService.rejectUserRequest(this.currentGroup['name'], pendingUser.id).subscribe(res => {
      if (res['success']) {
        this.displayToast('You have rejected ' + pendingUser.username + ' from your group.')
        this.refresh()
      } else if (res['message'] === 'Already in group') {
        this.displayToast(pendingUser.username + ' has already been accepted', true)
        this.refresh()
      } else if (res['message'] === 'No group found' || res['message'] === 'Invalid group membership') {
        this.displayToast('There is a problem with your group membership.', true)
      } else if (res['message'] === 'Token') {
        this.displayToast('Your session has expired. Please refresh and log back in.', true)
      } else {
        this.displayToast('There was a problem accepting the request', true)
      }
    })
  }

  joinGroupRequest() {
    // Send a request to join group; adds user as a member with isPending=true
    this.groupService.joinGroupRequest(this.joinGroupName).subscribe(res => {
      if (res['success']) {
        this.displayToast('Your request has been sent!')
      } else if (res['message'] === 'Already requested') {
        this.displayToast('You have already requested membership to this group.', true)
      } else if (res['message'] === 'No group found') {
        // prettier-ignore
        this.displayToast('That group doesn\'t exist', true)
      } else if (res['message'] === 'No group found' || res['message'] === 'Invalid group membership') {
        this.displayToast('There is a problem with your group membership.', true)
      } else if (res['message'] === 'Token') {
        this.displayToast('Your session has expired. Please refresh and log back in.', true)
      } else {
        this.displayToast('There was a problem with sending your request.', true)
      }
    })
  }

  disbandGroup() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { doIt: true },
    })

    dialogRef.afterClosed().subscribe(result => {
      // Result is the index of the anime they chose to link, if they chose to link one
      if (result) {
        this.groupService.disbandGroup(this.currentGroup['name']).subscribe(res => {
          if (!res['success'] && res['message'] === 'Token') {
            this.displayToast('Your session has expired. Please refresh and log back in.', true)
          } else if (!res['success']) {
            this.displayToast('There was a problem deleting the account.', true)
          }
          this.refresh()
        })
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

  importAnime(username: string, userID: string) {
    this.groupService.fetchImportableAnime(userID, username, this.currentUser, this.currentGroup['name']).subscribe(res => {
      if (res['success']) {
        // Add attributes for checkbox
        const importableAnime = res['importableAnime']
        for (const anime of importableAnime) {
          anime['selected'] = false
        }

        if (!importableAnime.length) {
          // prettier-ignore
          this.displayToast(username + ' doesn\'t have any anime you can import!', true)
        } else {
          const dialogRef = this.dialog.open(ImportAnimeDialogComponent, {
            data: { importableAnime: importableAnime, importAll: 'Import All' },
          })
          dialogRef.afterClosed().subscribe(result => {
            // Result is the index of the anime they chose to link, if they chose to link one
            if (result) {
              if (result === 'Import All') {
                // Adds all MAL-linked anime from one user's catalog to this user's catalog (in 'Considering' category)
                // that don't already exist in the latter
                this.groupService.importCatalog(userID, username, this.currentUser, this.currentGroup['name']).subscribe(resOne => {
                  if (resOne['success']) {
                    if (resOne['message'] !== 0) {
                      // prettier-ignore
                      this.displayToast('You have successfully imported ' + resOne['message'] + ' anime from ' + username + '\s catalog!\'')
                    } else {
                      // prettier-ignore
                      this.displayToast(username + ' doesn\'t have any anime you can import!', true)
                    }
                  } else if (resOne['message'] === 'Nothing to import') {
                    this.displayToast('This user has nothing in their catalog.', true)
                  } else if (resOne['message'] === 'No group found' || resOne['message'] === 'Invalid group membership') {
                    this.displayToast('There is a problem with your group membership.', true)
                  } else if (resOne['message'] === 'Token') {
                    this.displayToast('Your session has expired. Please refresh and log back in.', true)
                  } else {
                    // prettier-ignore
                    this.displayToast('Something went wrong while importing ' + username + '\'s catalog.', true)
                  }
                })
              } else {
                // User has individually selected anime to import
                const selectedAnime = []
                for (const anime of result) {
                  if (anime['selected']) {
                    selectedAnime.push(anime)
                  }
                }
                if (!selectedAnime.length) {
                  // prettier-ignore
                  this.displayToast('You haven\'t selected any anime to import!', true)
                } else {
                  this.groupService.importAnime(this.currentGroup['name'], selectedAnime).subscribe(resOne => {
                    if (resOne['success']) {
                      this.displayToast(
                        // prettier-ignore
                        'You have successfully imported ' + selectedAnime.length + ' anime from ' + username + '\'s catalog!\'',
                      )
                    } else if (resOne['message'] === 'No group found' || resOne['message'] === 'Invalid group membership') {
                      this.displayToast('There is a problem with your group membership.', true)
                    } else if (resOne['message'] === 'Token') {
                      this.displayToast('Your session has expired. Please refresh and log back in.', true)
                    } else {
                      this.displayToast('Something went wrong while importing the selected anime.', true)
                    }
                  })
                }
              }
            }
          })
        }
      } else if (res['message'] === 'Nothing to import') {
        // prettier-ignore
        this.displayToast(username + ' doesn\'t have any anime you can import!', true)
      } else if (res['message'] === 'No group found' || res['message'] === 'Invalid group membership') {
        this.displayToast('There is a problem with your group membership.', true)
      } else if (res['message'] === 'Token') {
        this.displayToast('Your session has expired. Please refresh and log back in.', true)
      } else {
        // prettier-ignore
        this.displayToast('Something went wrong while importing ' + username + '\'s catalog.', true)
      }
    })
  }

  generateUserRequests() {
    // Filters members by whether they're actually members or are pending (have requested membership)
    for (const member of this.currentGroup['members']) {
      if (member['isPending']) {
        this.pendingUserRequestsCol1.push(member)
      } else {
        this.currentGroupMembersCol1.push(member)
      }
    }
    // Split into two arrays so we can have 2 columns
    if (this.pendingUserRequestsCol1.length > 1) {
      let midIndex = this.pendingUserRequestsCol1.length / 2
      if (this.pendingUserRequestsCol1.length % 2 === 1) {
        midIndex = Math.floor(midIndex) + 1
      }
      this.pendingUserRequestsCol2 = this.pendingUserRequestsCol1
      this.pendingUserRequestsCol1 = this.pendingUserRequestsCol2.splice(0, midIndex)
    }
    if (this.currentGroupMembersCol1.length > 1) {
      let midIndex = this.currentGroupMembersCol1.length / 2
      if (this.currentGroupMembersCol1.length % 2 === 1) {
        midIndex = Math.floor(midIndex) + 1
      }
      this.currentGroupMembersCol2 = this.currentGroupMembersCol1
      this.currentGroupMembersCol1 = this.currentGroupMembersCol2.splice(0, midIndex)
    }
  }

  saveChanges() {
    // If group name was changed, a little more work has to be done on the backend
    this.groupService.saveChanges(this.currentGroup['name'], this.changesModel).subscribe(res => {
      if (res['success']) {
        this.displayToast('Your changes have been saved successfully!')
        setTimeout(() => {
          this.refresh()
        }, 1500)
      } else if (res['message'] === 'No group found' || res['message'] === 'Invalid group membership') {
        this.displayToast('There is a problem with your group membership.', true)
      } else if (res['message'] === 'Token') {
        this.displayToast('Your session has expired. Please refresh and log back in.', true)
      } else {
        this.displayToast('There was a problem saving your changes.', true)
      }
    })
  }

  toggleUploadOptions() {
    this.showUploadOptions = !this.showUploadOptions
  }

  getCurrentAnime(resData: Object) {
    // Update group info with the anime currently being watched by each member
    for (const member of this.currentGroupMembersCol1) {
      member.currentlyWatching = resData[member.username]
    }

    for (const member of this.currentGroupMembersCol2) {
      member.currentlyWatching = resData[member.username]
    }
  }

  refresh() {
    this.refreshHeader = Math.random()

    this.newGroupName = ''
    this.changesModel = new Group('', [])
    this.joinGroupName = ''
    this.showUploadOptions = false
    this.currentGroup = new Group('', [])
    this.currentGroupAvatar = ''
    this.currentGroupMembersCol1 = []
    this.currentGroupMembersCol2 = []
    this.pendingGroupRequests = []
    this.pendingUserRequestsCol1 = []
    this.pendingUserRequestsCol2 = []
    this.authService.getProfile().subscribe(res => {
      if (res['success']) {
        this.currentUser = res['user']['username']
        this.userService.getUserInfo().subscribe(resOne => {
          if (resOne['success']) {
            if (resOne['user']['group']) {
              this.groupService.getGroupInfo(resOne['user']['group']).subscribe(resTwo => {
                if (resTwo['success']) {
                  this.currentGroup = resTwo['group']
                  this.changesModel = JSON.parse(JSON.stringify(this.currentGroup))
                  // Force refresh of image
                  this.currentGroupAvatar = '/' + resTwo['group']['name'].split(' ').join('-') + '?xxx=' + Math.random()
                  this.generateUserRequests()
                  this.getCurrentAnime(resTwo['currentlyWatching'])
                  this.isLoading = false
                } else {
                  if (resTwo['message'] === 'No group found') {
                    this.displayToast('Your group was disbanded', true)
                    this.isLoading = false
                  } else if (resTwo['message'] === 'No group found' || resTwo['message'] === 'Invalid group membership') {
                    this.displayToast('There is a problem with your group membership.', true)
                    this.isLoading = false
                  } else {
                    this.displayToast('There was a problem loading your group information.', true)
                    this.isLoading = false
                  }
                }
              })
            } else {
              this.isLoading = false
            }
          } else {
            this.displayToast('There was a problem loading your profile.', true)
            this.isLoading = false
          }
        })
      } else {
        // If there was a problem we need to have them log in again
        this.authService.logout()
      }
    })
  }

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private groupService: GroupService,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    this.isLoading = true
    this.refresh()
  }
}

@Component({
  selector: 'app-import-anime',
  templateUrl: './import-anime.html',
  styleUrls: ['./import-anime.css'],
})
export class ImportAnimeDialogComponent {
  constructor(public dialogRef: MatDialogRef<ImportAnimeDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {}
  onNoClick(): void {
    this.dialogRef.close()
  }
}
