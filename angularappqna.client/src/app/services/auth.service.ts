import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private router: Router
  ) { }

  isAuthenticated(): boolean {

    const token = localStorage.getItem('token');
    const user = localStorage.getItem('currentUser');

    if (!token || !user) {
      return false;
    }

    try {

      const payload = JSON.parse(
        atob(
          token.split('.')[1]
            .replace(/-/g, '+')
            .replace(/_/g, '/')
        )
      );

      if (
        typeof payload.exp !== 'number' ||
        payload.exp * 1000 <= Date.now()
      ) {
        this.clearSession();
        return false;
      }

      return true;

    } catch {
      this.clearSession();
      return false;
    }
  }

  getCurrentUser(): any | null {

    if (!this.isAuthenticated()) {
      return null;
    }

    try {
      return JSON.parse(
        localStorage.getItem('currentUser')!
      );
    } catch {
      this.clearSession();
      return null;
    }
  }

  private clearSession(): void {

    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');

  }

  logout(): void {

    this.clearSession();

    this.router.navigate(['/home']);

  }
}
