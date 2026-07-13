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
  isFirstLogin = false;
  constructor(private http: HttpClient, private router: Router, private notificationService: NotificationService) { }
  login() {

    if (!this.email.trim()) {
      this.notificationService.warning('Συμπλήρωσε το email σου.');
      return;
    }

    if (!this.pin.trim()) {
      this.notificationService.warning('Συμπλήρωσε το PIN σου.');
      return;
    }

    if (this.isFirstLogin) {

      if (!this.nickname.trim()) {
        this.notificationService.warning('Συμπλήρωσε το nickname σου.');  
        return;
      }

      if (!this.selectedStore) {
        this.notificationService.warning('Επίλεξε κατάστημα / γραφεία / logistics.');
        return;
      }
    }
  
    const body: LoginRequest = {
      Email: this.email.trim(),
      Pin: this.pin.trim(),
      Nickname: this.isFirstLogin ? this.nickname.trim() : '',
      StoreId: this.isFirstLogin ? this.getStoreId() : 0,
      IsFirstLogin: this.isFirstLogin
    };

    this.http.post<LoginResponse>('api/Auth/login', body).subscribe({
      next: (res: any) => {

        const isSuccess = res.isSuccess ?? res.IsSuccess;
        const message = res.message ?? res.Message;
        const user = res.user ?? res.User;
        const token = res.token ?? res.Token;

        if (isSuccess && user && token) {
          localStorage.setItem('currentUser', JSON.stringify(user));
          localStorage.setItem('token', token);

          this.notificationService.success('Επιτυχία σύνδεσης');
          this.router.navigate(['/mainpage']);
        }
        else {
          this.notificationService.error(message || 'Λάθος email ή PIN.');
        }
      },
      error: () => {
        this.notificationService.error('Λάθος email ή PIN.');
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
    if (!this.adminPin.trim()) {
      this.notificationService.warning('Συμπλήρωσε το PIN διαχειριστή.');
      return;
    }

    const body: LoginRequest = {
      Email: 'admin@masoutis.gr',
      Pin: this.adminPin.trim(),
      Nickname: 'Admin',
      StoreId: 2
    };

    this.http.post<LoginResponse>('api/Auth/login', body).subscribe({
      next: (res: any) => {
        const isSuccess = res.isSuccess ?? res.IsSuccess;
        const message = res.message ?? res.Message;
        const user = res.user ?? res.User;
        const token = res.token ?? res.Token;

        if (isSuccess && user && token) {
          localStorage.setItem('currentUser', JSON.stringify(user));
          localStorage.setItem('token', token);

          this.closeAdminPopup();
          this.notificationService.success('Επιτυχία Σύνδεσης');
          this.router.navigate(['/mainpage']);
        } else {
          this.notificationService.error(message || 'Λάθος PIN διαχειριστή.');
        }
      },
      error: (err) => {
        console.log(err);
        this.notificationService.error(err.error?.Message || err.error?.message || 'Σφάλμα');
      }
      
    });
  }
  getStoreId(): number {
    if (this.selectedStore === 'store') return 1;
    if (this.selectedStore === 'office') return 2;
    if (this.selectedStore === 'logistics') return 3;
    return 0;
  }
}
