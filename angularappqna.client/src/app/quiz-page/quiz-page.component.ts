import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';

import { QuizPreviewQuestion, QuizProgress } from '../interfaces/models';

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

  answers: {
    questionId: number;
    answerId: number | null;
  }[] = [];

  timeLeft = 15;
  timer: ReturnType<typeof setInterval> | null = null;

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
    this.thematologiaId = Number(
      this.route.snapshot.paramMap.get('id')
    );
    const restored = this.restoreQuizProgress();

    if (!restored) {
      this.loadQuestions();
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private get quizStorageKey(): string {
    return `quiz-progress-${this.thematologiaId}`;
  }

  loadQuestions(): void {
    this.http.get<QuizPreviewQuestion[]>(
      `api/Service/GetRandomQuizQuestions/${this.thematologiaId}`
    ).subscribe({
      next: (res) => {
        this.questions = res || [];

        if (this.questions.length === 0) {
          return;
        }

        this.currentQuestionIndex = 0;
        this.selectedAnswerId = null;

        this.showReview = false;
        this.quizFinished = false;

        this.answers = [];
        this.questionTimes = [];

        this.quizStartTime = Date.now();

        this.startTimer(true);
      },
      error: (err) => {
        console.error(
          'Load quiz questions error:',
          err
        );
      }
    });
  }
  startTimer(resetTime: boolean = true): void {
    this.clearTimer();

    if (resetTime) {
      this.timeLeft = 15;
      this.questionStartTime = Date.now();
    }

    this.saveQuizProgress();

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.selectedAnswerId = null;
      this.saveQuizProgress();
      return;
    }

    this.timer = setInterval(() => {
      this.timeLeft--;

      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.selectedAnswerId = null;

        this.clearTimer();
      }

      this.saveQuizProgress();
    }, 1000);
  }

  clearTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  selectAnswer(answerId: number): void {
    if (this.timeLeft <= 0) {
      return;
    }

    this.selectedAnswerId = answerId;

    this.saveQuizProgress();
  }

  nextQuestion(): void {
    this.saveCurrentQuestionAnswer();

    if (
      this.currentQuestionIndex <
      this.questions.length - 1
    ) {
      this.currentQuestionIndex++;
      this.selectedAnswerId = null;

      this.startTimer(true);
      return;
    }

    this.showReview = true;
    this.clearTimer();
    this.saveQuizProgress();
  }

  skipQuestion(): void {
    this.selectedAnswerId = null;
    this.nextQuestion();
  }

  private saveCurrentQuestionAnswer(): void {
    this.clearTimer();

    const currentQuestion =
      this.questions[this.currentQuestionIndex];

    if (!currentQuestion) {
      return;
    }
    const secondsSpent = Math.min(
      15,
      Math.max(
        0,
        Math.round(
          (Date.now() - this.questionStartTime) / 1000
        )
      )
    );

    this.questionTimes[this.currentQuestionIndex] =
      secondsSpent;

    this.answers[this.currentQuestionIndex] = {
      questionId: currentQuestion.QId,
      answerId: this.selectedAnswerId
    };

    this.saveQuizProgress();
  }

  private saveQuizProgress(): void {
    if (
      this.questions.length === 0 ||
      this.quizFinished
    ) {
      return;
    }

    const progress: QuizProgress = {
      thematologiaId: this.thematologiaId,

      questions: this.questions,

      currentQuestionIndex:
        this.currentQuestionIndex,

      selectedAnswerId:
        this.selectedAnswerId,

      answers:
        this.answers,

      questionTimes:
        this.questionTimes,

      timeLeft:
        this.timeLeft,

      quizStartTime:
        this.quizStartTime,

      questionStartTime:
        this.questionStartTime,

      showReview:
        this.showReview,

      savedAt:
        Date.now()
    };

    try {
      sessionStorage.setItem(
        this.quizStorageKey,
        JSON.stringify(progress)
      );
    } catch (error) {
      console.error(
        'Save quiz progress error:',
        error
      );
    }
  }

  private restoreQuizProgress(): boolean {
    const savedData = sessionStorage.getItem(
      this.quizStorageKey
    );

    if (!savedData) {
      return false;
    }

    try {
      const progress: QuizProgress =
        JSON.parse(savedData);

      if (
        progress.thematologiaId !== this.thematologiaId ||
        !Array.isArray(progress.questions) ||
        progress.questions.length === 0
      ) {
        this.clearQuizProgress();
        return false;
      }

      const validIndex =
        progress.currentQuestionIndex >= 0 &&
        progress.currentQuestionIndex <
        progress.questions.length;

      if (!validIndex) {
        this.clearQuizProgress();
        return false;
      }

      this.questions =
        progress.questions;

      this.currentQuestionIndex =
        progress.currentQuestionIndex;

      this.selectedAnswerId =
        progress.selectedAnswerId ?? null;

      this.answers =
        progress.answers ?? [];

      this.questionTimes =
        progress.questionTimes ?? [];

      this.quizStartTime =
        progress.quizStartTime || Date.now();

      this.questionStartTime =
        progress.questionStartTime || Date.now();

      this.showReview =
        progress.showReview === true;

      this.quizFinished = false;

      const secondsSinceSave = Math.floor(
        (Date.now() - progress.savedAt) / 1000
      );

      this.timeLeft = Math.max(
        0,
        (progress.timeLeft ?? 15) -
        secondsSinceSave
      );

      if (this.showReview) {
        this.clearTimer();
        this.timeLeft = 0;
      } else if (this.timeLeft > 0) {

        this.startTimer(false);
      } else {
        this.timeLeft = 0;
        this.selectedAnswerId = null;
        this.clearTimer();
        this.saveQuizProgress();
      }

      return true;
    } catch (error) {
      console.error(
        'Restore quiz progress error:',
        error
      );

      this.clearQuizProgress();
      return false;
    }
  }

  private clearQuizProgress(): void {
    sessionStorage.removeItem(
      this.quizStorageKey
    );
  }

  submitAnswers(): void {
    this.clearTimer();

    const totalQuestions =
      this.questions.length;

    this.score =
      this.getCorrectAnswersCount();

    const correctAnswers =
      this.score;

    const wrongAnswers =
      totalQuestions - correctAnswers;

    const totalTimeSeconds = Math.round(
      (Date.now() - this.quizStartTime) / 1000
    );

    const answersDetails =
      this.questions.map((q, index) => {
        const selectedAId =
          this.answers[index]?.answerId ?? null;

        const selectedAnswer =
          q.Answers.find(
            a => a.AId === selectedAId
          );

        const correctAnswer =
          q.Answers.find(
            a => a.IsCorrect
          );

        return {
          DetId: q.DetId,
          QId: q.QId,
          Question: q.Question,
          Difficulty: q.Difficulty,

          SelectedAId: selectedAId,

          SelectedAnswer:
            selectedAnswer?.Answer ||
            'Δεν απαντήθηκε',

          CorrectAId:
            correctAnswer?.AId ?? null,

          CorrectAnswer:
            correctAnswer?.Answer || '',

          IsCorrect:
            selectedAnswer?.IsCorrect === true,

          TimeSeconds:
            this.questionTimes[index] ?? 0
        };
      });

    const body = {
      ThematologiaId:
        this.thematologiaId,

      UserEmail:
        this.getCurrentUserEmail(),

      Nickname:
        this.getCurrentUserNickname(),

      TotalQuestions:
        totalQuestions,

      CorrectAnswers:
        correctAnswers,

      WrongAnswers:
        wrongAnswers,

      TotalTimeSeconds:
        totalTimeSeconds,

      AnswersJson:
        JSON.stringify(answersDetails)
    };

    this.http.post(
      'api/Service/SaveQuizResult',
      body
    ).subscribe({
      next: () => {
        this.quizFinished = true;
        this.showReview = false;
        this.clearQuizProgress();
      },
      error: (err) => {
        console.error(
          'Save quiz result error:',
          err
        );

        this.quizFinished = true;
        this.showReview = false;

      }
    });
  }

  getCorrectAnswersCount(): number {
    return this.questions.filter((q, index) => {
      const answerId =
        this.answers[index]?.answerId;

      const selectedAnswer =
        q.Answers.find(
          a => a.AId === answerId
        );

      return selectedAnswer?.IsCorrect === true;
    }).length;
  }

  getSelectedAnswerText(
    question: QuizPreviewQuestion
  ): string {
    const index =
      this.questions.indexOf(question);

    const answerId =
      this.answers[index]?.answerId;

    const answer =
      question.Answers.find(
        a => a.AId === answerId
      );

    return answer?.Answer || 'Δεν απαντήθηκε';
  }

  getCorrectAnswerText(
    question: QuizPreviewQuestion
  ): string {
    const answer =
      question.Answers.find(
        a => a.IsCorrect
      );

    return answer?.Answer || '-';
  }

  getTheoryDetails(
    question: QuizPreviewQuestion
  ): string {
    return question.Details || '';
  }

  shouldShowDetails(
    question: QuizPreviewQuestion
  ): boolean {
    return (
      !this.isQuestionCorrect(question) &&
      this.getTheoryDetails(question).trim() !== ''
    );
  }

  isQuestionCorrect(
    question: QuizPreviewQuestion
  ): boolean {
    const index =
      this.questions.indexOf(question);

    const answerId =
      this.answers[index]?.answerId;

    const answer =
      question.Answers.find(
        a => a.AId === answerId
      );

    return answer?.IsCorrect === true;
  }

  getCurrentUserEmail(): string {
    const data =
      localStorage.getItem('currentUser');

    if (!data) {
      return '';
    }

    try {
      const user = JSON.parse(data);

      return user.Email || user.email || '';
    } catch {
      return '';
    }
  }

  getCurrentUserNickname(): string {
    const data =
      localStorage.getItem('currentUser');

    if (!data) {
      return 'Χρήστης';
    }

    try {
      const user = JSON.parse(data);

      return (
        user.Nickname ||
        user.nickname ||
        'Χρήστης'
      );
    } catch {
      return 'Χρήστης';
    }
  }

  getTotalQuizTimeSeconds(): number {
    return Math.round(
      (Date.now() - this.quizStartTime) / 1000
    );
  }

  get currentQuestion(): QuizPreviewQuestion {
    return this.questions[
      this.currentQuestionIndex
    ];
  }

  get progressPercent(): number {
    if (this.questions.length === 0) {
      return 0;
    }

    return (
      (
        this.currentQuestionIndex + 1
      ) /
      this.questions.length
    ) * 100;
  }

  GoBack(): void {
    this.clearTimer();

    this.clearQuizProgress();

    this.location.back();
  }
}
