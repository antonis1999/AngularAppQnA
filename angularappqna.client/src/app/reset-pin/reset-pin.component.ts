import { CommonModule } from '@angular/common';
import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';
import {
  Component,
  OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router
} from '@angular/router';

interface ResetPinResponse {
  isSuccess?: boolean;
  IsSuccess?: boolean;
  message?: string;
  Message?: string;
}

@Component({
  selector: 'app-reset-pin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './reset-pin.component.html',
  styleUrls: ['./reset-pin.component.css']
})
export class ResetPinComponent implements OnInit {

  token = '';

  newPin = '';
  confirmPin = '';

  isLoading = false;
  isSuccess = false;

  errorMessage = '';
  successMessage = '';

  private readonly apiUrl = 'api/Auth/reset-pin';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.token =
      this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.token) {
      this.errorMessage =
        'Ο σύνδεσμος επαναφοράς PIN δεν είναι έγκυρος.';
    }
  }

  resetPin(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.token) {
      this.errorMessage =
        'Ο σύνδεσμος επαναφοράς PIN δεν είναι έγκυρος.';
      return;
    }

    const newPin = this.newPin.trim();
    const confirmPin = this.confirmPin.trim();

    if (!newPin || !confirmPin) {
      this.errorMessage =
        'Συμπλήρωσε και τα δύο πεδία PIN.';
      return;
    }

    if (newPin.length < 4) {
      this.errorMessage =
        'Το PIN πρέπει να έχει τουλάχιστον 4 χαρακτήρες.';
      return;
    }

    if (newPin !== confirmPin) {
      this.errorMessage =
        'Τα PIN δεν ταιριάζουν.';
      return;
    }

    this.isLoading = true;

    const body = {
      Token: this.token,
      NewPin: newPin,
      ConfirmPin: confirmPin
    };

    this.http
      .post<ResetPinResponse>(
        this.apiUrl,
        body
      )
      .subscribe({
        next: response => {
          this.isLoading = false;

          const isSuccess =
            response.isSuccess ??
            response.IsSuccess ??
            false;

          const message =
            response.message ??
            response.Message ??
            'Το PIN άλλαξε επιτυχώς.';

          if (!isSuccess) {
            this.errorMessage = message;
            return;
          }

          this.isSuccess = true;
          this.successMessage = message;

          this.newPin = '';
          this.confirmPin = '';
        },

        error: (error: HttpErrorResponse) => {
          this.isLoading = false;

          this.errorMessage =
            error.error?.message ??
            error.error?.Message ??
            'Παρουσιάστηκε πρόβλημα κατά την αλλαγή του PIN.';
        }
      });
  }

  goToLogin(): void {
    this.router.navigate(['/']);
  }
}
