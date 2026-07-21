import { CommonModule } from '@angular/common';
import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoaderService } from '../services/loader.service';
import {
  LoginRequest,
  LoginResponse
} from '../interfaces/models';

import {
  NotificationService
} from '../services/notification.service';

interface ForgotPinResponse {
  isSuccess?: boolean;
  IsSuccess?: boolean;

  message?: string;
  Message?: string;

  resetLink?: string;
  ResetLink?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {

  email = '';
  pin = '';
  nickname = '';

  selectedStore = '';
  isFirstLogin = false;

  showHelpPopup = false;

  showAdminPopup = false;
  adminPin = '';

  showForgotPinPopup = false;
  forgotPinEmail = '';
  forgotPinErrorMessage = '';
  forgotPinSuccessMessage = '';
  isSendingForgotPin = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private notificationService: NotificationService,
    private loader: LoaderService
  ) { }

  login(): void {
    if (!this.email.trim()) {
      this.notificationService.warning(
        'Συμπλήρωσε το email σου.'
      );
      return;
    }

    if (!this.pin.trim()) {
      this.notificationService.warning(
        'Συμπλήρωσε το PIN σου.'
      );
      return;
    }

    if (this.isFirstLogin) {
      if (!this.nickname.trim()) {
        this.notificationService.warning(
          'Συμπλήρωσε το nickname σου.'
        );
        return;
      }

      if (!this.selectedStore) {
        this.notificationService.warning(
          'Επίλεξε κατάστημα / γραφεία / logistics.'
        );
        return;
      }
    }

    const body: LoginRequest = {
      Email: this.email.trim(),
      Pin: this.pin.trim(),
      Nickname: this.isFirstLogin
        ? this.nickname.trim()
        : '',
      StoreId: this.isFirstLogin
        ? this.getStoreId()
        : 0,
      IsFirstLogin: this.isFirstLogin
    };
    this.loader.show();
    this.http
      .post<LoginResponse>('api/Auth/login', body)
      .subscribe({
        next: (response: any) => {
          const isSuccess =
            response.isSuccess ??
            response.IsSuccess;

          const message =
            response.message ??
            response.Message;

          const user =
            response.user ??
            response.User;

          const token =
            response.token ??
            response.Token;

          if (isSuccess && user && token) {
            localStorage.setItem(
              'currentUser',
              JSON.stringify(user)
            );

            localStorage.setItem(
              'token',
              token
            );
            this.loader.hide();
            this.notificationService.success(
              'Επιτυχία σύνδεσης'
            );

            this.router.navigate([
              '/mainpage'
            ]);

            return;
          }
          this.loader.hide();
          this.notificationService.error(
            message || 'Λάθος email ή PIN.'
          );
        },

        error: (error: HttpErrorResponse) => {
          this.loader.hide();
          const message =
            error.error?.message ??
            error.error?.Message ??
            'Λάθος email ή PIN.';

          this.notificationService.error(
            message
          );
        }
      });
  }

  openForgotPinPopup(): void {
    this.forgotPinEmail =
      this.email.trim();

    this.forgotPinErrorMessage = '';
    this.forgotPinSuccessMessage = '';
    this.isSendingForgotPin = false;
    this.showForgotPinPopup = true;
  }

  closeForgotPinPopup(): void {
    if (this.isSendingForgotPin) {
      return;
    }

    this.showForgotPinPopup = false;
    this.forgotPinEmail = '';
    this.forgotPinErrorMessage = '';
    this.forgotPinSuccessMessage = '';
  }

  sendForgotPinEmail(): void {
    this.forgotPinErrorMessage = '';
    this.forgotPinSuccessMessage = '';

    const normalizedEmail =
      this.forgotPinEmail
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      this.forgotPinErrorMessage =
        'Συμπλήρωσε το εταιρικό email σου.';
      return;
    }

    if (!this.isValidEmail(normalizedEmail)) {
      this.forgotPinErrorMessage =
        'Συμπλήρωσε ένα έγκυρο email.';
      return;
    }

    this.isSendingForgotPin = true;

    const body = {
      Email: normalizedEmail
    };

    this.http
      .post<ForgotPinResponse>(
        'api/Auth/forgot-pin',
        body
      )
      .subscribe({
        next: (response: ForgotPinResponse) => {
          this.isSendingForgotPin = false;

          const isSuccess =
            response.isSuccess ??
            response.IsSuccess ??
            false;

          const message =
            response.message ??
            response.Message ??
            'Δημιουργήθηκε σύνδεσμος επαναφοράς PIN.';

          if (!isSuccess) {
            this.forgotPinErrorMessage =
              message;
            return;
          }

          this.forgotPinSuccessMessage =
            message;

          const resetLink =
            response.resetLink ??
            response.ResetLink;

          if (resetLink) {
            console.log(
              'Reset PIN link:',
              resetLink
            );
          }

          this.notificationService.success(
            message
          );
        },

        error: (error: HttpErrorResponse) => {
          this.isSendingForgotPin = false;

          this.forgotPinErrorMessage =
            error.error?.message ??
            error.error?.Message ??
            'Δεν ήταν δυνατή η αποστολή του συνδέσμου επαναφοράς.';
        }
      });
  }

  openAdminPopup(): void {
    this.adminPin = '';
    this.showAdminPopup = true;
  }

  closeAdminPopup(): void {
    this.showAdminPopup = false;
    this.adminPin = '';
  }

  adminLogin(): void {
    if (!this.adminPin.trim()) {
      this.notificationService.warning(
        'Συμπλήρωσε το PIN διαχειριστή.'
      );
      return;
    }

    const body: LoginRequest = {
      Email: 'admin@masoutis.gr',
      Pin: this.adminPin.trim(),
      Nickname: 'Admin',
      StoreId: 2,
      IsFirstLogin: false
    };
    this.loader.show();
    this.http
      .post<LoginResponse>(
        'api/Auth/login',
        body
      )
      .subscribe({
        next: (response: any) => {
          const isSuccess =
            response.isSuccess ??
            response.IsSuccess;

          const message =
            response.message ??
            response.Message;

          const user =
            response.user ??
            response.User;

          const token =
            response.token ??
            response.Token;

          if (isSuccess && user && token) {
            localStorage.setItem(
              'currentUser',
              JSON.stringify(user)
            );

            localStorage.setItem(
              'token',
              token
            );
            this.loader.hide();
            this.closeAdminPopup();

            this.notificationService.success(
              'Επιτυχία σύνδεσης'
            );

            this.router.navigate([
              '/mainpage'
            ]);

            return;
          }

          this.notificationService.error(
            message ||
            'Λάθος PIN διαχειριστή.'
          );
        },

        error: (error: HttpErrorResponse) => {
          this.loader.hide();
          const message =
            error.error?.message ??
            error.error?.Message ??
            'Σφάλμα κατά τη σύνδεση διαχειριστή.';

          this.notificationService.error(
            message
          );
        }
      });
  }

  getStoreId(): number {
    switch (this.selectedStore) {
      case 'store':
        return 1;

      case 'office':
        return 2;

      case 'logistics':
        return 3;

      default:
        return 0;
    }
  }

  private isValidEmail(
    email: string
  ): boolean {
    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(email);
  }
}
