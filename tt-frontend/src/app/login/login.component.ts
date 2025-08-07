import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'login',
  standalone: true,
  imports: [],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
    constructor(private router: Router) {}

    goToLindaSearch() {
      this.router.navigate(['/linda-search']);
    }
}
