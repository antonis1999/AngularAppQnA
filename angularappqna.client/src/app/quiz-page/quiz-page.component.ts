import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { QuizPreviewQuestion } from '../interfaces/models';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';

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

  showReview = false;
  quizFinished = false;

  answers: { questionId: number; answerId: number | null }[] = [];

  timeLeft = 15;
  timer: any;

  score = 0;
  quizStartTime = 0;
  questionStartTime = 0;
  questionTimes: number[] = [];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private location: Location
  ) { }

  ngOnInit(): void {
    this.quizStartTime = Date.now();

    this.thematologiaId = Number(
      this.route.snapshot.paramMap.get('id')
    );

    this.loadQuestions();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  loadQuestions(): void {
    this.http.get<QuizPreviewQuestion[]>(
      `api/Service/GetRandomQuizQuestions/${this.thematologiaId}`
    ).subscribe({
      next: (res) => {
        this.questions = res || [];

        if (this.questions.length > 0) {
          this.currentQuestionIndex = 0;
          this.selectedAnswerId = null;
          this.quizStartTime = Date.now();
          this.answers = [];
          this.questionTimes = [];

          setTimeout(() => {
            this.startTimer();
          }, 0);
        }
      },
      error: (err) => {
        console.error('Load quiz questions error:', err);
      }
    });
  }

  startTimer(): void {
    this.questionStartTime = Date.now();

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

  clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  selectAnswer(answerId: number): void {
    if (this.timeLeft <= 0) {
      return;
    }

    this.selectedAnswerId = answerId;
  }

  nextQuestion(): void {
    this.saveCurrentQuestionAnswer();

    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.selectedAnswerId = null;
      this.startTimer();
    } else {
      this.showReview = true;
    }
  }

  skipQuestion(): void {
    this.selectedAnswerId = null;
    this.nextQuestion();
  }

  private saveCurrentQuestionAnswer(): void {
    this.clearTimer();

    const currentQuestion = this.questions[this.currentQuestionIndex];

    const secondsSpent = Math.round(
      (Date.now() - this.questionStartTime) / 1000
    );

    this.questionTimes[this.currentQuestionIndex] = secondsSpent;

    if (currentQuestion) {
      this.answers[this.currentQuestionIndex] = {
        questionId: currentQuestion.QId,
        answerId: this.selectedAnswerId
      };
    }
  }

  submitAnswers(): void {
    this.clearTimer();

    const totalQuestions = this.questions.length;

    this.score = this.getCorrectAnswersCount();

    const correctAnswers = this.score;
    const wrongAnswers = totalQuestions - correctAnswers;

    const totalTimeSeconds = Math.round(
      (Date.now() - this.quizStartTime) / 1000
    );

    const answersDetails = this.questions.map((q, index) => {
      const selectedAId = this.answers[index]?.answerId ?? null;

      const selectedAnswer = q.Answers.find(a => a.AId === selectedAId);
      const correctAnswer = q.Answers.find(a => a.IsCorrect);

      return {
        DetId: q.DetId,
        QId: q.QId,
        Question: q.Question,
        Difficulty: q.Difficulty,

        SelectedAId: selectedAId,
        SelectedAnswer: selectedAnswer?.Answer || 'Δεν απαντήθηκε',

        CorrectAId: correctAnswer?.AId ?? null,
        CorrectAnswer: correctAnswer?.Answer || '',

        IsCorrect: selectedAnswer?.IsCorrect === true,

        TimeSeconds: this.questionTimes[index] ?? 0
      };
    });

    const body = {
      ThematologiaId: this.thematologiaId,
      UserEmail: this.getCurrentUserEmail(),
      Nickname: this.getCurrentUserNickname(),

      TotalQuestions: totalQuestions,
      CorrectAnswers: correctAnswers,
      WrongAnswers: wrongAnswers,
      TotalTimeSeconds: totalTimeSeconds,

      AnswersJson: JSON.stringify(answersDetails)
    };

    this.http.post('api/Service/SaveQuizResult', body)
      .subscribe({
        next: () => {
          this.quizFinished = true;
          this.showReview = false;
        },
        error: (err) => {
          console.error('Save quiz result error:', err);
          this.quizFinished = true;
          this.showReview = false;
        }
      });
  }

  getCorrectAnswersCount(): number {
    return this.questions.filter((q, index) => {
      const answerId = this.answers[index]?.answerId;

      const selectedAnswer = q.Answers.find(
        a => a.AId === answerId
      );

      return selectedAnswer?.IsCorrect === true;
    }).length;
  }

  getSelectedAnswerText(question: QuizPreviewQuestion): string {
    const index = this.questions.indexOf(question);
    const answerId = this.answers[index]?.answerId;

    const answer = question.Answers.find(a => a.AId === answerId);

    return answer?.Answer || 'Δεν απαντήθηκε';
  }

  getCorrectAnswerText(question: QuizPreviewQuestion): string {
    const answer = question.Answers.find(a => a.IsCorrect);
    return answer?.Answer || '-';
  }

  getTheoryDetails(question: QuizPreviewQuestion): string {
    return question.Details || '';
  }

  shouldShowDetails(question: QuizPreviewQuestion): boolean {
    return !this.isQuestionCorrect(question) &&
      this.getTheoryDetails(question).trim() !== '';
  }

  isQuestionCorrect(question: QuizPreviewQuestion): boolean {
    const index = this.questions.indexOf(question);
    const answerId = this.answers[index]?.answerId;

    const answer = question.Answers.find(a => a.AId === answerId);

    return answer?.IsCorrect === true;
  }

  getCurrentUserEmail(): string {
    const data = localStorage.getItem('currentUser');

    if (!data) {
      return '';
    }

    const user = JSON.parse(data);

    return user.Email || user.email || '';
  }

  getCurrentUserNickname(): string {
    const data = localStorage.getItem('currentUser');

    if (!data) {
      return 'Χρήστης';
    }

    const user = JSON.parse(data);

    return user.Nickname || user.nickname || 'Χρήστης';
  }

  getTotalQuizTimeSeconds(): number {
    return Math.round(
      (Date.now() - this.quizStartTime) / 1000
    );
  }

  get currentQuestion(): QuizPreviewQuestion {
    return this.questions[this.currentQuestionIndex];
  }

  get progressPercent(): number {
    if (this.questions.length === 0) {
      return 0;
    }

    return ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
  }

  GoBack(): void {
    this.location.back();
  }
}
