import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginRequest, LoginResponse } from '../interfaces/models';
import { NotificationService } from '../services/notification.service';

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

  constructor(private http: HttpClient, private router: Router, private notificationService: NotificationService) { }

  login() {
    const storeId = this.getStoreId();

    const body: LoginRequest = {
      Email: this.email,
      Pin: this.pin,
      Nickname: this.nickname,
      StoreId: storeId
    };

    this.http.post<LoginResponse>('api/Auth/login', body).subscribe({
      next: (res: any) => {
        console.log('LOGIN RESPONSE:', res);

        const isSuccess = res.isSuccess ?? res.IsSuccess;
        const message = res.message ?? res.Message;
        const user = res.user ?? res.User;

        if (isSuccess && user) {
          localStorage.setItem('currentUser', JSON.stringify(user));

          this.router.navigate(['/mainpage']);
          this.notificationService.success('Επιτυχία Σύνδεσης');
        } else {
          this.notificationService.error(message || 'Αποτυχία σύνδεσης');
        }
      },
      error: (err) => {
        this.notificationService.warning(err.error?.Message || 'Κάτι πήγε στραβά.');
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
      this.notificationService.error('Λάθος PIN διαχειριστή.');
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
    this.notificationService.success('Επιτυχία Σύνδεσης');
    this.router.navigate(['/mainpage']);
  }

  getStoreId(): number {
    if (this.selectedStore === 'store') return 1;
    if (this.selectedStore === 'office') return 2;
    if (this.selectedStore === 'logistics') return 3;
    return 0;
  }
}
