import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { QuizAttemptDetail } from '../interfaces/models';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-quiz-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quiz-details.component.html',
  styleUrl: './quiz-details.component.css'
})

export class QuizDetailsComponent {

  thematologiaId = 0;
  nickname = '';
  thematologiaTitle = '';
  attempts: QuizAttemptDetail[] = [];
  loading = false;
  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) { }
  ngOnInit() {
    this.thematologiaId =
      Number(this.route.snapshot.paramMap.get('thematologiaId'));

    this.nickname =
      this.route.snapshot.paramMap.get('nickname') ?? '';

    this.loadQuizDetails();
  }
  formatTime(seconds: number): string {
    if (!seconds) {
      return '00:00';
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }

  formatDate(date: string): string {
    if (!date) {
      return '';
    }

    return new Date(date).toLocaleString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  loadQuizDetails() {
    this.loading = true;

    this.http.get<any>(
      `api/Service/GetUserQuizAttempts/${this.thematologiaId}/${this.nickname}`
    ).subscribe({
      next: (res: any) => {

        console.log("API RESPONSE", res);
        console.log("ATTEMPTS", res.Attempts);
        this.thematologiaTitle = res.ThematologiaTitle ?? '';
        this.attempts = res.Attempts ?? [];

        this.loading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.loading = false;
      }
    });
  }
  goBack() {
    this.router.navigate(['/mainpage'], {
      queryParams: {
        section: 'ranking',
        thematologiaId: this.thematologiaId
      }
    });
  }
}
