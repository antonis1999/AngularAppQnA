import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  email = '';
  pin = '';
  nickname = '';

  selectedStore: string = '';
  showHelpPopup = false;
  showAdminPopup = false;
  adminPin = '';

  constructor(private http: HttpClient, private router: Router) { }

  login() {
    const storeId = this.getStoreId();

    const body = {
      email: this.email,
      pin: this.pin,
      nickname: this.nickname,
      storeId: storeId
    };

    this.http.post<any>('api/Auth/login', body).subscribe({
      next: (res) => {
        console.log(res);

        if (res.success) {
          localStorage.setItem('currentUser', JSON.stringify(res.user));
          this.router.navigate(['/mainpage']);
        } else {
          alert(res.message);
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Κάτι πήγε στραβά.');
      }
    });
  }

  openAdminPopup() {
    this.adminPin = '';
    this.showAdminPopup = true;
  }

  closeAdminPopup() {
    this.showAdminPopup = false;
    this.adminPin = '';
  }

  adminLogin() {

    if (this.adminPin !== '1234') {
      alert('Λάθος PIN διαχειριστή.');
      return;
    }

    const adminUser = {
      id: 999,
      email: 'admin@masoutis.gr',
      nickname: 'Admin',
      storeId: 2,
      roleId: 99
    };

    localStorage.setItem(
      'currentUser',
      JSON.stringify(adminUser)
    );

    this.closeAdminPopup();

    this.router.navigate(['/mainpage']);
  }

  getStoreId(): number {
    if (this.selectedStore === 'store') return 1;
    if (this.selectedStore === 'office') return 2;
    if (this.selectedStore === 'logistics') return 3;
    return 0;
  }
}
