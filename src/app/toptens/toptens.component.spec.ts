import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TopTensComponent } from './toptens.component';

describe('TopTensComponent', () => {
  let component: ToptensComponent;
  let fixture: ComponentFixture<ToptensComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TopTensComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TopTensComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
