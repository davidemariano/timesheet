import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupFiltersComponent } from './group-filters.component';

describe('GroupFiltersComponent', () => {
  let component: GroupFiltersComponent;
  let fixture: ComponentFixture<GroupFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupFiltersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
