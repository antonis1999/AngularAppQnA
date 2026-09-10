import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';

import {
  QuizPreviewAnswer,
  QuizPreviewQuestion,
  QuizProgress,
  QuizProgressAnswer
} from '../interfaces/models';

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

  answers: QuizProgressAnswer[] = [];

  orderingAnswers: QuizPreviewAnswer[] = [];
  draggedOrderingIndex: number | null = null;

  matchingRightAnswers: QuizPreviewAnswer[] = [];
  matchingPairs: { leftAId: number; rightAId: number }[] = [];
  selectedMatchingLeftId: number | null = null;

  categorizationCards: QuizPreviewAnswer[] = [];
  categorizationAssignments: { answerId: number; categoryName: string }[] = [];
  selectedCategorizationCardId: number | null = null;
  draggedCategorizationAnswerId: number | null = null;

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

    const restored =
      this.restoreQuizProgress();

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
        this.questions = (res || []).map(
          question => ({
            ...question,
            QuestionType:
              question.QuestionType ?? 1,
            Answers:
              question.Answers ?? []
          })
        );

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

        this.prepareCurrentQuestion();
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

  startTimer(
    resetTime: boolean = true
  ): void {
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

  selectAnswer(
    answerId: number
  ): void {
    if (
      this.timeLeft <= 0 ||
      this.currentQuestion?.QuestionType === 3 ||
      this.currentQuestion?.QuestionType === 4 ||
      this.currentQuestion?.QuestionType === 5
    ) {
      return;
    }

    this.selectedAnswerId = answerId;
    this.saveQuizProgress();
  }

  onOrderingDragStart(
    index: number,
    event: DragEvent
  ): void {
    if (
      this.timeLeft <= 0 ||
      this.currentQuestion?.QuestionType !== 3
    ) {
      event.preventDefault();
      return;
    }

    this.draggedOrderingIndex = index;

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed =
        'move';

      event.dataTransfer.setData(
        'text/plain',
        String(index)
      );
    }
  }

  onOrderingDragOver(
    event: DragEvent
  ): void {
    if (this.timeLeft <= 0) {
      return;
    }

    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect =
        'move';
    }
  }

  onOrderingDrop(
    targetIndex: number,
    event: DragEvent
  ): void {
    event.preventDefault();

    if (
      this.timeLeft <= 0 ||
      this.currentQuestion?.QuestionType !== 3
    ) {
      return;
    }

    const sourceIndex =
      this.draggedOrderingIndex;

    if (
      sourceIndex === null ||
      sourceIndex === targetIndex
    ) {
      this.draggedOrderingIndex = null;
      return;
    }

    const moved =
      this.orderingAnswers.splice(
        sourceIndex,
        1
      )[0];

    this.orderingAnswers.splice(
      targetIndex,
      0,
      moved
    );

    this.draggedOrderingIndex = null;
    this.saveQuizProgress();
  }

  onOrderingDragEnd(): void {
    this.draggedOrderingIndex = null;
  }

  selectMatchingLeft(
    leftAId: number
  ): void {
    if (
      this.timeLeft <= 0 ||
      this.currentQuestion?.QuestionType !== 4
    ) {
      return;
    }

    this.selectedMatchingLeftId = leftAId;
    this.saveQuizProgress();
  }

  selectMatchingRight(
    rightAId: number
  ): void {
    if (
      this.timeLeft <= 0 ||
      this.currentQuestion?.QuestionType !== 4 ||
      this.selectedMatchingLeftId === null
    ) {
      return;
    }

    const leftAId =
      this.selectedMatchingLeftId;

    this.matchingPairs =
      this.matchingPairs.filter(
        pair =>
          pair.leftAId !== leftAId &&
          pair.rightAId !== rightAId
      );

    this.matchingPairs.push({
      leftAId,
      rightAId
    });

    this.selectedMatchingLeftId = null;
    this.draggedCategorizationAnswerId = null;
    this.selectedCategorizationCardId = null;
    this.saveQuizProgress();
  }

  removeMatchingPair(
    leftAId: number
  ): void {
    if (
      this.timeLeft <= 0 ||
      this.currentQuestion?.QuestionType !== 4
    ) {
      return;
    }

    this.matchingPairs =
      this.matchingPairs.filter(
        pair =>
          pair.leftAId !== leftAId
      );

    if (
      this.selectedMatchingLeftId === leftAId
    ) {
      this.selectedMatchingLeftId = null;
    }

    this.saveQuizProgress();
  }

  getMatchedRightId(
    leftAId: number
  ): number | null {
    return (
      this.matchingPairs.find(
        pair =>
          pair.leftAId === leftAId
      )?.rightAId ?? null
    );
  }

  isMatchingRightUsed(
    rightAId: number
  ): boolean {
    return this.matchingPairs.some(
      pair =>
        pair.rightAId === rightAId
    );
  }

  getMatchedRightText(
    leftAId: number
  ): string {
    const rightAId =
      this.getMatchedRightId(
        leftAId
      );

    if (rightAId === null) {
      return '';
    }

    return (
      this.currentQuestion.Answers.find(
        answer =>
          answer.AId === rightAId
      )?.MatchRight ?? ''
    );
  }

  get categorizationCategories(): string[] {
    const categories =
      this.currentQuestion?.Answers
        ?.map(answer => (answer.CategoryName ?? '').trim())
        .filter(category => category.length > 0) ?? [];

    return Array.from(new Set(categories));
  }

  onCategorizationDragStart(answerId: number, event: DragEvent): void {
    if (this.timeLeft <= 0 || this.currentQuestion?.QuestionType !== 5) {
      event.preventDefault();
      return;
    }

    this.draggedCategorizationAnswerId = answerId;

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(answerId));
    }
  }

  onCategorizationDragEnd(): void {
    this.draggedCategorizationAnswerId = null;
  }

  onCategorizationDragOver(event: DragEvent): void {
    if (this.timeLeft <= 0 || this.currentQuestion?.QuestionType !== 5) {
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onCategorizationDrop(categoryName: string, event: DragEvent): void {
    event.preventDefault();

    if (this.timeLeft <= 0 || this.currentQuestion?.QuestionType !== 5) {
      return;
    }

    if (this.draggedCategorizationAnswerId === null) {
      return;
    }

    this.assignCategorization(this.draggedCategorizationAnswerId, categoryName);
    this.draggedCategorizationAnswerId = null;
  }

  selectCategorizationCard(answerId: number): void {
    if (this.timeLeft <= 0 || this.currentQuestion?.QuestionType !== 5) {
      return;
    }

    this.selectedCategorizationCardId = answerId;
    this.saveQuizProgress();
  }

  selectCategorizationCategory(categoryName: string): void {
    if (
      this.timeLeft <= 0 ||
      this.currentQuestion?.QuestionType !== 5 ||
      this.selectedCategorizationCardId === null
    ) {
      return;
    }

    this.assignCategorization(this.selectedCategorizationCardId, categoryName);
    this.selectedCategorizationCardId = null;
    this.saveQuizProgress();
  }

  private assignCategorization(answerId: number, categoryName: string): void {
    this.categorizationAssignments = this.categorizationAssignments.filter(
      assignment => assignment.answerId !== answerId
    );

    this.categorizationAssignments.push({ answerId, categoryName });
    this.saveQuizProgress();
  }

  getCardsForCategory(categoryName: string): QuizPreviewAnswer[] {
    const ids = new Set(
      this.categorizationAssignments
        .filter(assignment => assignment.categoryName === categoryName)
        .map(assignment => assignment.answerId)
    );

    return this.categorizationCards.filter(card => ids.has(card.AId));
  }

  getUnassignedCategorizationCards(): QuizPreviewAnswer[] {
    const ids = new Set(this.categorizationAssignments.map(a => a.answerId));
    return this.categorizationCards.filter(card => !ids.has(card.AId));
  }

  nextQuestion(): void {
    this.saveCurrentQuestionAnswer(false);

    if (
      this.currentQuestionIndex <
      this.questions.length - 1
    ) {
      this.currentQuestionIndex++;
      this.selectedAnswerId = null;

      this.prepareCurrentQuestion();
      this.startTimer(true);
      return;
    }

    this.showReview = true;
    this.clearTimer();
    this.saveQuizProgress();
  }

  skipQuestion(): void {
    this.saveCurrentQuestionAnswer(true);

    if (
      this.currentQuestionIndex <
      this.questions.length - 1
    ) {
      this.currentQuestionIndex++;
      this.selectedAnswerId = null;

      this.prepareCurrentQuestion();
      this.startTimer(true);
      return;
    }

    this.showReview = true;
    this.clearTimer();
    this.saveQuizProgress();
  }

  private saveCurrentQuestionAnswer(
    skipped: boolean
  ): void {
    this.clearTimer();

    const currentQuestion =
      this.questions[
      this.currentQuestionIndex
      ];

    if (!currentQuestion) {
      return;
    }

    const secondsSpent = Math.min(
      15,
      Math.max(
        0,
        Math.round(
          (
            Date.now() -
            this.questionStartTime
          ) / 1000
        )
      )
    );

    this.questionTimes[
      this.currentQuestionIndex
    ] = secondsSpent;

    if (
      currentQuestion.QuestionType === 3
    ) {
      this.answers[
        this.currentQuestionIndex
      ] = {
        questionId:
          currentQuestion.QId,
        answerId: null,
        orderedAnswerIds:
          skipped
            ? []
            : this.orderingAnswers.map(
              answer => answer.AId
            )
      };
    } else if (
      currentQuestion.QuestionType === 4
    ) {
      this.answers[
        this.currentQuestionIndex
      ] = {
        questionId:
          currentQuestion.QId,
        answerId: null,
        matchingPairs:
          skipped
            ? []
            : this.matchingPairs.map(
              pair => ({ ...pair })
            )
      };
    } else if (
      currentQuestion.QuestionType === 5
    ) {
      this.answers[
        this.currentQuestionIndex
      ] = {
        questionId: currentQuestion.QId,
        answerId: null,
        categorizationAssignments: skipped
          ? []
          : this.categorizationAssignments.map(assignment => ({ ...assignment }))
      };
    } else {
      this.answers[
        this.currentQuestionIndex
      ] = {
        questionId:
          currentQuestion.QId,
        answerId:
          skipped
            ? null
            : this.selectedAnswerId
      };
    }

    this.saveQuizProgress();
  }

  private prepareCurrentQuestion(
    restoredOrderingIds?: number[],
    restoredMatchingPairs?: { leftAId: number; rightAId: number }[],
    restoredMatchingRightIds?: number[],
    restoredSelectedMatchingLeftId?: number | null,
    restoredCategorizationAssignments?: { answerId: number; categoryName: string }[],
    restoredCategorizationCardIds?: number[],
    restoredSelectedCategorizationCardId?: number | null
  ): void {
    const question =
      this.currentQuestion;

    this.draggedOrderingIndex = null;
    this.selectedMatchingLeftId = null;

    if (!question) {
      this.orderingAnswers = [];
      this.matchingRightAnswers = [];
      this.matchingPairs = [];
      this.categorizationCards = [];
      this.categorizationAssignments = [];
      return;
    }

    if (
      question.QuestionType === 3
    ) {
      this.matchingRightAnswers = [];
      this.matchingPairs = [];
      this.categorizationCards = [];
      this.categorizationAssignments = [];

      const savedIds =
        restoredOrderingIds?.length
          ? restoredOrderingIds
          : this.answers[
            this.currentQuestionIndex
          ]?.orderedAnswerIds;

      if (
        savedIds &&
        savedIds.length > 0
      ) {
        const answerMap =
          new Map(
            question.Answers.map(
              answer => [
                answer.AId,
                answer
              ]
            )
          );

        const restoredAnswers =
          savedIds
            .map(id =>
              answerMap.get(id)
            )
            .filter(
              (
                answer
              ): answer is QuizPreviewAnswer =>
                !!answer
            );

        if (
          restoredAnswers.length ===
          question.Answers.length
        ) {
          this.orderingAnswers =
            restoredAnswers;
          return;
        }
      }

      this.orderingAnswers =
        this.shuffleAnswers(
          question.Answers
        );

      return;
    }

    this.orderingAnswers = [];

    if (
      question.QuestionType === 4
    ) {
      const storedPairs =
        restoredMatchingPairs?.length
          ? restoredMatchingPairs
          : this.answers[
            this.currentQuestionIndex
          ]?.matchingPairs ?? [];

      this.matchingPairs =
        storedPairs.filter(pair =>
          question.Answers.some(
            answer =>
              answer.AId === pair.leftAId
          ) &&
          question.Answers.some(
            answer =>
              answer.AId === pair.rightAId
          )
        );

      const rightAnswerMap =
        new Map(
          question.Answers.map(
            answer => [
              answer.AId,
              answer
            ]
          )
        );

      const rightIds =
        restoredMatchingRightIds?.length
          ? restoredMatchingRightIds
          : [];

      const restoredRightAnswers =
        rightIds
          .map(id =>
            rightAnswerMap.get(id)
          )
          .filter(
            (
              answer
            ): answer is QuizPreviewAnswer =>
              !!answer
          );

      this.matchingRightAnswers =
        restoredRightAnswers.length ===
          question.Answers.length
          ? restoredRightAnswers
          : this.shuffleMatchingRightAnswers(
            question.Answers
          );

      this.selectedMatchingLeftId =
        restoredSelectedMatchingLeftId ??
        null;

      return;
    }

    if (question.QuestionType === 5) {
      this.matchingRightAnswers = [];
      this.matchingPairs = [];

      const storedAssignments =
        restoredCategorizationAssignments ??
        this.answers[this.currentQuestionIndex]?.categorizationAssignments ??
        [];

      this.categorizationAssignments = storedAssignments.filter(
        assignment =>
          question.Answers.some(answer => answer.AId === assignment.answerId) &&
          this.categorizationCategories.includes(assignment.categoryName)
      );

      const answerMap = new Map(
        question.Answers.map(answer => [answer.AId, answer])
      );

      const restoredCards = (restoredCategorizationCardIds ?? [])
        .map(id => answerMap.get(id))
        .filter((answer): answer is QuizPreviewAnswer => !!answer);

      this.categorizationCards =
        restoredCards.length === question.Answers.length
          ? restoredCards
          : this.shuffleCategorizationCards(question.Answers);

      this.selectedCategorizationCardId =
        restoredSelectedCategorizationCardId ?? null;

      return;
    }

    this.matchingRightAnswers = [];
    this.matchingPairs = [];
    this.categorizationCards = [];
    this.categorizationAssignments = [];
  }

  private shuffleAnswers(
    answers: QuizPreviewAnswer[]
  ): QuizPreviewAnswer[] {
    const shuffled =
      answers.map(answer => ({
        ...answer
      }));

    for (
      let i =
        shuffled.length - 1;
      i > 0;
      i--
    ) {
      const j =
        Math.floor(
          Math.random() *
          (i + 1)
        );

      [
        shuffled[i],
        shuffled[j]
      ] = [
          shuffled[j],
          shuffled[i]
        ];
    }

    if (
      shuffled.length > 1 &&
      this.areIdsEqual(
        shuffled.map(
          answer => answer.AId
        ),
        this.getCorrectOrderingIdsFromAnswers(
          answers
        )
      )
    ) {
      [
        shuffled[0],
        shuffled[1]
      ] = [
          shuffled[1],
          shuffled[0]
        ];
    }

    return shuffled;
  }

  private shuffleMatchingRightAnswers(
    answers: QuizPreviewAnswer[]
  ): QuizPreviewAnswer[] {
    const shuffled =
      answers.map(answer => ({
        ...answer
      }));

    for (
      let i = shuffled.length - 1;
      i > 0;
      i--
    ) {
      const j =
        Math.floor(
          Math.random() *
          (i + 1)
        );

      [
        shuffled[i],
        shuffled[j]
      ] = [
          shuffled[j],
          shuffled[i]
        ];
    }

    if (
      shuffled.length > 1 &&
      this.areIdsEqual(
        shuffled.map(
          answer => answer.AId
        ),
        [...answers]
          .sort(
            (a, b) =>
              a.AId - b.AId
          )
          .map(
            answer => answer.AId
          )
      )
    ) {
      [
        shuffled[0],
        shuffled[1]
      ] = [
          shuffled[1],
          shuffled[0]
        ];
    }

    return shuffled;
  }

  private shuffleCategorizationCards(
    answers: QuizPreviewAnswer[]
  ): QuizPreviewAnswer[] {
    const shuffled = answers.map(answer => ({ ...answer }));

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  private getCorrectOrderingIds(
    question: QuizPreviewQuestion
  ): number[] {
    return this.getCorrectOrderingIdsFromAnswers(
      question.Answers
    );
  }

  private getCorrectOrderingIdsFromAnswers(
    answers: QuizPreviewAnswer[]
  ): number[] {
    return [...answers]
      .sort(
        (a, b) =>
          a.AId - b.AId
      )
      .map(
        answer => answer.AId
      );
  }

  private areIdsEqual(
    first: number[],
    second: number[]
  ): boolean {
    return (
      first.length ===
      second.length &&
      first.every(
        (value, index) =>
          value === second[index]
      )
    );
  }

  private saveQuizProgress(): void {
    if (
      this.questions.length === 0 ||
      this.quizFinished
    ) {
      return;
    }

    const progress: QuizProgress = {
      thematologiaId:
        this.thematologiaId,

      questions:
        this.questions,

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

      currentOrderingAnswerIds:
        this.currentQuestion
          ?.QuestionType === 3
          ? this.orderingAnswers.map(
            answer => answer.AId
          )
          : [],

      currentMatchingPairs:
        this.currentQuestion
          ?.QuestionType === 4
          ? this.matchingPairs.map(
            pair => ({ ...pair })
          )
          : [],

      currentMatchingRightAnswerIds:
        this.currentQuestion
          ?.QuestionType === 4
          ? this.matchingRightAnswers.map(
            answer => answer.AId
          )
          : [],

      selectedMatchingLeftId:
        this.currentQuestion
          ?.QuestionType === 4
          ? this.selectedMatchingLeftId
          : null,

      currentCategorizationAssignments:
        this.currentQuestion?.QuestionType === 5
          ? this.categorizationAssignments.map(assignment => ({ ...assignment }))
          : [],

      currentCategorizationCardIds:
        this.currentQuestion?.QuestionType === 5
          ? this.categorizationCards.map(answer => answer.AId)
          : [],

      selectedCategorizationCardId:
        this.currentQuestion?.QuestionType === 5
          ? this.selectedCategorizationCardId
          : null,

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

  private restoreQuizProgress():
    boolean {
    const savedData =
      sessionStorage.getItem(
        this.quizStorageKey
      );

    if (!savedData) {
      return false;
    }

    try {
      const progress: QuizProgress =
        JSON.parse(savedData);

      if (
        progress.thematologiaId !==
        this.thematologiaId ||
        !Array.isArray(
          progress.questions
        ) ||
        progress.questions.length === 0
      ) {
        this.clearQuizProgress();
        return false;
      }

      const validIndex =
        progress.currentQuestionIndex >=
        0 &&
        progress.currentQuestionIndex <
        progress.questions.length;

      if (!validIndex) {
        this.clearQuizProgress();
        return false;
      }

      this.questions =
        progress.questions.map(
          question => ({
            ...question,
            QuestionType:
              question.QuestionType ?? 1,
            Answers:
              question.Answers ?? []
          })
        );

      this.currentQuestionIndex =
        progress.currentQuestionIndex;

      this.selectedAnswerId =
        progress.selectedAnswerId ??
        null;

      this.answers =
        progress.answers ?? [];

      this.questionTimes =
        progress.questionTimes ?? [];

      this.quizStartTime =
        progress.quizStartTime ||
        Date.now();

      this.questionStartTime =
        progress.questionStartTime ||
        Date.now();

      this.showReview =
        progress.showReview === true;

      this.quizFinished = false;

      this.prepareCurrentQuestion(
        progress.currentOrderingAnswerIds ?? [],
        progress.currentMatchingPairs ?? [],
        progress.currentMatchingRightAnswerIds ?? [],
        progress.selectedMatchingLeftId ?? null,
        progress.currentCategorizationAssignments ?? [],
        progress.currentCategorizationCardIds ?? [],
        progress.selectedCategorizationCardId ?? null
      );

      const secondsSinceSave =
        Math.floor(
          (
            Date.now() -
            progress.savedAt
          ) / 1000
        );

      this.timeLeft =
        Math.max(
          0,
          (
            progress.timeLeft ??
            15
          ) -
          secondsSinceSave
        );

      if (this.showReview) {
        this.clearTimer();
        this.timeLeft = 0;
      } else if (
        this.timeLeft > 0
      ) {
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
      totalQuestions -
      correctAnswers;

    const totalTimeSeconds =
      Math.round(
        (
          Date.now() -
          this.quizStartTime
        ) / 1000
      );

    const answersDetails =
      this.questions.map(
        (q, index) => {

          if (
            q.QuestionType === 3
          ) {
            const orderedIds =
              this.answers[index]
                ?.orderedAnswerIds ??
              [];

            return {
              DetId: q.DetId,
              QId: q.QId,
              Question:
                q.Question,
              Difficulty:
                q.Difficulty,
              QuestionType:
                q.QuestionType,

              SelectedAId: null,

              SelectedAnswer:
                this.getOrderingTextByIds(
                  q,
                  orderedIds
                ),

              CorrectAId: null,

              CorrectAnswer:
                this.getOrderingTextByIds(
                  q,
                  this.getCorrectOrderingIds(
                    q
                  )
                ),

              IsCorrect:
                this.isQuestionCorrect(
                  q
                ),

              TimeSeconds:
                this.questionTimes[
                index
                ] ?? 0
            };
          }

          if (
            q.QuestionType === 4
          ) {
            const pairs =
              this.answers[index]
                ?.matchingPairs ??
              [];

            return {
              DetId: q.DetId,
              QId: q.QId,
              Question:
                q.Question,
              Difficulty:
                q.Difficulty,
              QuestionType:
                q.QuestionType,

              SelectedAId: null,

              SelectedAnswer:
                this.getMatchingTextByPairs(
                  q,
                  pairs
                ),

              CorrectAId: null,

              CorrectAnswer:
                this.getCorrectMatchingText(
                  q
                ),

              IsCorrect:
                this.isQuestionCorrect(
                  q
                ),

              TimeSeconds:
                this.questionTimes[
                index
                ] ?? 0
            };
          }

          if (q.QuestionType === 5) {
            const assignments = this.answers[index]?.categorizationAssignments ?? [];

            return {
              DetId: q.DetId,
              QId: q.QId,
              Question: q.Question,
              Difficulty: q.Difficulty,
              QuestionType: q.QuestionType,
              SelectedAId: null,
              SelectedAnswer: this.getCategorizationText(q, assignments),
              CorrectAId: null,
              CorrectAnswer: this.getCorrectCategorizationText(q),
              IsCorrect: this.isQuestionCorrect(q),
              TimeSeconds: this.questionTimes[index] ?? 0
            };
          }

          const selectedAId =
            this.answers[index]
              ?.answerId ??
            null;

          const selectedAnswer =
            q.Answers.find(
              a =>
                a.AId ===
                selectedAId
            );

          const correctAnswer =
            q.Answers.find(
              a =>
                a.IsCorrect
            );

          return {
            DetId: q.DetId,
            QId: q.QId,
            Question:
              q.Question,
            Difficulty:
              q.Difficulty,
            QuestionType:
              q.QuestionType,

            SelectedAId:
              selectedAId,

            SelectedAnswer:
              selectedAnswer
                ?.Answer ||
              'Δεν απαντήθηκε',

            CorrectAId:
              correctAnswer
                ?.AId ??
              null,

            CorrectAnswer:
              correctAnswer
                ?.Answer ||
              '',

            IsCorrect:
              selectedAnswer
                ?.IsCorrect ===
              true,

            TimeSeconds:
              this.questionTimes[
              index
              ] ?? 0
          };
        }
      );

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
        JSON.stringify(
          answersDetails
        )
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
    return this.questions.filter(
      (question) =>
        this.isQuestionCorrect(
          question
        )
    ).length;
  }

  getSelectedAnswerText(
    question: QuizPreviewQuestion
  ): string {
    const index =
      this.questions.indexOf(
        question
      );

    if (
      question.QuestionType === 3
    ) {
      const orderedIds =
        this.answers[index]
          ?.orderedAnswerIds ??
        [];

      return this.getOrderingTextByIds(
        question,
        orderedIds
      );
    }

    if (
      question.QuestionType === 4
    ) {
      const pairs =
        this.answers[index]
          ?.matchingPairs ??
        [];

      return this.getMatchingTextByPairs(
        question,
        pairs
      );
    }

    if (question.QuestionType === 5) {
      const assignments = this.answers[index]?.categorizationAssignments ?? [];
      return this.getCategorizationText(question, assignments);
    }

    const answerId =
      this.answers[index]
        ?.answerId;

    const answer =
      question.Answers.find(
        a =>
          a.AId ===
          answerId
      );

    return (
      answer?.Answer ||
      'Δεν απαντήθηκε'
    );
  }

  getCorrectAnswerText(
    question: QuizPreviewQuestion
  ): string {
    if (
      question.QuestionType === 3
    ) {
      return this.getOrderingTextByIds(
        question,
        this.getCorrectOrderingIds(
          question
        )
      );
    }

    if (
      question.QuestionType === 4
    ) {
      return this.getCorrectMatchingText(
        question
      );
    }

    if (question.QuestionType === 5) {
      return this.getCorrectCategorizationText(question);
    }

    const answer =
      question.Answers.find(
        a => a.IsCorrect
      );

    return answer?.Answer || '-';
  }

  private getOrderingTextByIds(
    question: QuizPreviewQuestion,
    ids: number[]
  ): string {
    if (
      !ids ||
      ids.length === 0
    ) {
      return 'Δεν απαντήθηκε';
    }

    const answerMap =
      new Map(
        question.Answers.map(
          answer => [
            answer.AId,
            answer.Answer
          ]
        )
      );

    return ids
      .map(
        (id, index) =>
          `${index + 1}. ${answerMap.get(id) ??
          ''
          }`
      )
      .join(' → ');
  }

  private getMatchingTextByPairs(
    question: QuizPreviewQuestion,
    pairs: { leftAId: number; rightAId: number }[]
  ): string {
    if (
      !pairs ||
      pairs.length === 0
    ) {
      return 'Δεν απαντήθηκε';
    }

    const answerMap =
      new Map(
        question.Answers.map(
          answer => [
            answer.AId,
            answer
          ]
        )
      );

    return [...pairs]
      .sort(
        (a, b) =>
          a.leftAId - b.leftAId
      )
      .map(pair => {
        const left =
          answerMap.get(
            pair.leftAId
          )?.MatchLeft ?? '';

        const right =
          answerMap.get(
            pair.rightAId
          )?.MatchRight ?? '';

        return `${left} → ${right}`;
      })
      .join(' | ');
  }

  private getCorrectMatchingText(
    question: QuizPreviewQuestion
  ): string {
    return [...question.Answers]
      .sort(
        (a, b) =>
          a.AId - b.AId
      )
      .map(answer =>
        `${answer.MatchLeft ?? ''} → ${answer.MatchRight ?? ''}`
      )
      .join(' | ');
  }

  private getCategorizationText(
    question: QuizPreviewQuestion,
    assignments: { answerId: number; categoryName: string }[]
  ): string {
    if (!assignments || assignments.length === 0) {
      return 'Δεν απαντήθηκε';
    }

    const answerMap = new Map(
      question.Answers.map(answer => [answer.AId, answer.Answer])
    );

    return [...assignments]
      .sort((a, b) => a.answerId - b.answerId)
      .map(assignment =>
        `${answerMap.get(assignment.answerId) ?? ''} → ${assignment.categoryName}`
      )
      .join(' | ');
  }

  private getCorrectCategorizationText(
    question: QuizPreviewQuestion
  ): string {
    return [...question.Answers]
      .sort((a, b) => a.AId - b.AId)
      .map(answer => `${answer.Answer} → ${answer.CategoryName ?? ''}`)
      .join(' | ');
  }

  getTheoryDetails(
    question: QuizPreviewQuestion
  ): string {
    return (
      question.Details ||
      ''
    );
  }

  shouldShowDetails(
    question: QuizPreviewQuestion
  ): boolean {
    return (
      !this.isQuestionCorrect(
        question
      ) &&
      this.getTheoryDetails(
        question
      ).trim() !== ''
    );
  }

  isQuestionCorrect(
    question: QuizPreviewQuestion
  ): boolean {
    const index =
      this.questions.indexOf(
        question
      );

    if (
      question.QuestionType === 3
    ) {
      const selectedIds =
        this.answers[index]
          ?.orderedAnswerIds ??
        [];

      const correctIds =
        this.getCorrectOrderingIds(
          question
        );

      return this.areIdsEqual(
        selectedIds,
        correctIds
      );
    }

    if (
      question.QuestionType === 4
    ) {
      const pairs =
        this.answers[index]
          ?.matchingPairs ??
        [];

      if (
        pairs.length !==
        question.Answers.length
      ) {
        return false;
      }

      return pairs.every(
        pair =>
          pair.leftAId ===
          pair.rightAId
      );
    }

    if (question.QuestionType === 5) {
      const assignments = this.answers[index]?.categorizationAssignments ?? [];

      if (assignments.length !== question.Answers.length) {
        return false;
      }

      return question.Answers.every(answer =>
        assignments.some(assignment =>
          assignment.answerId === answer.AId &&
          assignment.categoryName === (answer.CategoryName ?? '').trim()
        )
      );
    }

    const answerId =
      this.answers[index]
        ?.answerId;

    const answer =
      question.Answers.find(
        a =>
          a.AId ===
          answerId
      );

    return (
      answer?.IsCorrect ===
      true
    );
  }

  getCurrentUserEmail(): string {
    const data =
      localStorage.getItem(
        'currentUser'
      );

    if (!data) {
      return '';
    }

    try {
      const user =
        JSON.parse(data);

      return (
        user.Email ||
        user.email ||
        ''
      );
    } catch {
      return '';
    }
  }

  getCurrentUserNickname():
    string {
    const data =
      localStorage.getItem(
        'currentUser'
      );

    if (!data) {
      return 'Χρήστης';
    }

    try {
      const user =
        JSON.parse(data);

      return (
        user.Nickname ||
        user.nickname ||
        'Χρήστης'
      );
    } catch {
      return 'Χρήστης';
    }
  }

  getTotalQuizTimeSeconds():
    number {
    return Math.round(
      (
        Date.now() -
        this.quizStartTime
      ) / 1000
    );
  }

  get currentQuestion():
    QuizPreviewQuestion {
    return this.questions[
      this.currentQuestionIndex
    ];
  }

  get progressPercent():
    number {
    if (
      this.questions.length === 0
    ) {
      return 0;
    }

    return (
      (
        this.currentQuestionIndex +
        1
      ) /
      this.questions.length
    ) * 100;
  }

  get canGoNext(): boolean {
    if (
      !this.currentQuestion ||
      this.timeLeft <= 0
    ) {
      return false;
    }

    if (
      this.currentQuestion
        .QuestionType === 3
    ) {
      return (
        this.orderingAnswers
          .length >= 2
      );
    }

    if (
      this.currentQuestion
        .QuestionType === 4
    ) {
      return (
        this.currentQuestion.Answers.length >= 2 &&
        this.matchingPairs.length ===
        this.currentQuestion.Answers.length
      );
    }

    if (this.currentQuestion.QuestionType === 5) {
      return (
        this.currentQuestion.Answers.length >= 2 &&
        this.categorizationAssignments.length === this.currentQuestion.Answers.length
      );
    }

    return (
      this.selectedAnswerId !==
      null
    );
  }

  GoBack(): void {
    this.clearTimer();
    this.clearQuizProgress();
    this.location.back();
  }
}
