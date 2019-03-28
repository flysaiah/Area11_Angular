import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BracketProcessComponent } from './bracket-process.component';

describe('BracketProcessComponent', () => {
  let component: BracketProcessComponent;
  let fixture: ComponentFixture<BracketProcessComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BracketProcessComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BracketProcessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
