import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { InfolistsComponent } from './infolists.component'

describe('InfolistsComponent', () => {
  let component: InfolistsComponent
  let fixture: ComponentFixture<InfolistsComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [InfolistsComponent],
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(InfolistsComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
