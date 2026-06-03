import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { QuizPreviewQuestion, QuizPreviewAnswer} from '../interfaces/models';
import { HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-quiz-page',
  standalone: false,
  templateUrl: './quiz-page.component.html',
  styleUrl: './quiz-page.component.css'
})
export class QuizPageComponent implements OnInit, OnDestroy {

  thematologiaId = 0;

  questions: QuizPreviewQuestion[] = [];
  currentQuestionIndex = 0;
  selectedAnswerId: number | null = null;

  timeLeft = 15;
  timer: any;

  score = 0;
  quizFinished = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.thematologiaId = Number(
      this.route.snapshot.paramMap.get('id')
    );
    this.loadQuestions();
    this.startTimer();
  }

  ngOnDestroy() {
    this.clearTimer();
  }

  startTimer() {
    this.clearTimer();

    this.timeLeft = 15;

    this.timer = setInterval(() => {
      this.timeLeft--;

      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.clearTimer();

        this.selectedAnswerId = null;
      }
    }, 1000);
  }

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  loadQuestions() {

    this.http.get<QuizPreviewQuestion[]>(
      `api/Service/GetRandomQuizQuestions/${this.thematologiaId}`
    )
      .subscribe({

        next: (res) => {

          this.questions = res || [];

          if (this.questions.length > 0) {
            this.startTimer();
          }

        },

        error: (err) => {

          console.error(err);

        }

      });

  }
  selectAnswer(answerId: number) {
    if (this.timeLeft <= 0) {
      return;
    }

    this.selectedAnswerId = answerId;
  }

  nextQuestion() {
    this.clearTimer();

    const currentQuestion = this.questions[this.currentQuestionIndex];

    if (currentQuestion && this.selectedAnswerId !== null) {
      const selectedAnswer = currentQuestion.Answers.find(
        (a: QuizPreviewAnswer) => a.AId === this.selectedAnswerId
      );

      if (selectedAnswer?.IsCorrect) {
        this.score++;
      }
    }

    this.selectedAnswerId = null;

    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.startTimer();
    } else {
      this.quizFinished = true;
    }
  }

  get currentQuestion() {
    return this.questions[this.currentQuestionIndex];
  }

  get progressPercent() {
    if (this.questions.length === 0) {
      return 0;
    }

    return ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
  }
}
