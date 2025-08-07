import { Component } from '@angular/core';
import { Routes, RouterModule, RouterOutlet } from '@angular/router';
import { TlSearchComponent } from './tl-search/tl-search.component';
import { LindaSearchComponent } from './linda-search/linda-search.component';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoginComponent, TlSearchComponent, LindaSearchComponent, DashboardComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  
}
