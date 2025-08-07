import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LindaSearchComponent } from './linda-search.component';

describe('LindaSearchComponent', () => {
  let component: LindaSearchComponent;
  let fixture: ComponentFixture<LindaSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LindaSearchComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LindaSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
