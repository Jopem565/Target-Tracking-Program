import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TlSearchComponent } from './tl-search.component';

describe('TlSearchComponent', () => {
  let component: TlSearchComponent;
  let fixture: ComponentFixture<TlSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TlSearchComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TlSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
