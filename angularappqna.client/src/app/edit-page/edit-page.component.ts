import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../services/notification.service';

import {
  ApiResponse,
  Thematologia,
  QuizTheory,
  QuizQuestionView,
  QuizOption,
  ExistingQuizQuestion,
  ExistingQuizAnswer,
  UpdateQuizQuestionRequest
} from '../interfaces/models';

@Component({
  selector: 'app-edit-page',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule],
  templateUrl: './edit-page.component.html',
  styleUrl: './edit-page.component.css'
})
export class EditPageComponent {
  thematologies: Thematologia[] = [];
  selectedThematologia: Thematologia | null = null;
  selectedTheories: QuizTheory[] = [];

  thematologiaId = 0;
  thematologiaTitle = '';

  existingQuestions: ExistingQuizQuestion[] = [];

  editingQuestion: ExistingQuizQuestion | null = null;
  editingQuestionText = '';
  editingQuestionAnswers: ExistingQuizAnswer[] = [];

  editingThematologiaId: number | null = null;
  editingThematologiaTitle = '';
  editingFromDate = '';
  editingToDate = '';

  selectedQuizTheory: QuizTheory | null = null;
  quizQuestions: QuizQuestionView[] = [];

  newTheoryHeader = '';
  newTheoryDetails = '';

  editingTheoryId: number | null = null;
  editingTheoryDetId: number | null = null;
  editingTheoryHeader = '';
  editingTheoryDetails = '';

  adminEditTab = 'theory';

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ header: [1, 2, 3, false] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      [{ color: [] }, { background: [] }],
      ['link'],
      ['clean']
    ]
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    this.thematologiaId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadThematologies();
  }

  loadThematologies() {
    this.http.get<Thematologia[]>('api/Service/GetThematologies')
      .subscribe({
        next: (res) => {
          this.thematologies = res;

          this.selectedThematologia = this.thematologies.find(x =>
            x.Id === this.thematologiaId
          ) ?? null;

          if (this.selectedThematologia) {
            this.selectThematologia(this.selectedThematologia);
          }
        },
        error: (err) => {
          console.error('Load thematologies error:', err);
          this.notificationService.error('Σφάλμα φόρτωσης θεματολογιών');
        }
      });
  }

  selectThematologia(item: Thematologia) {
    this.selectedThematologia = item;

    this.http.get<QuizTheory[]>(
      `api/Service/GetTheoriaByThematologia?thematologiaId=${item.Id}`
    ).subscribe({
      next: (res) => {
        this.selectedTheories = res;
      },
      error: (err) => {
        console.error('Load theories error:', err);
        this.notificationService.error('Σφάλμα φόρτωσης θεωριών');
      }
    });
  }

  selectQuizTheory(theory: QuizTheory) {
    this.selectedQuizTheory = theory;
    this.loadExistingQuestions(theory);

    this.quizQuestions = [
      {
        question: '',
        options: [
          { answer: '', is_correct: false },
          { answer: '', is_correct: false },
          { answer: '', is_correct: false }
        ]
      }
    ];
  }

  loadExistingQuestions(theory: QuizTheory) {
    this.http.get<ExistingQuizQuestion[]>(
      `api/Service/GetQuestionsByTheoria/${this.thematologiaId}/${theory.DetId}`
    ).subscribe({
      next: (res) => {
        this.existingQuestions = res || [];
      },
      error: (err) => {
        console.error('Load existing questions error:', err);
        this.notificationService.error('Σφάλμα φόρτωσης ερωτήσεων');
      }
    });
  }

  addQuizQuestion() {
    this.quizQuestions.push({
      question: '',
      options: [
        { answer: '', is_correct: false },
        { answer: '', is_correct: false },
        { answer: '', is_correct: false }
      ]
    });
  }

  removeQuizQuestion(index: number) {
    this.quizQuestions.splice(index, 1);
  }

  addAnswer(question: QuizQuestionView) {
    question.options.push({
      answer: '',
      is_correct: false
    });
  }

  removeAnswer(question: QuizQuestionView, answerIndex: number) {
    question.options.splice(answerIndex, 1);
  }

  selectCorrectAnswer(question: QuizQuestionView, selectedAnswer: QuizOption) {
    question.options.forEach(a => {
      a.is_correct = false;
    });

    selectedAnswer.is_correct = true;
  }

  saveQuizQuestions() {
    if (!this.selectedQuizTheory) {
      this.notificationService.warning('Επέλεξε θεωρία');
      return;
    }
    const validQuestions = this.quizQuestions
      .filter(q => q.question?.trim().length > 0)
      .map(q => ({
        questionText: q.question.trim(),
        answers: q.options
          .filter(a => a.answer?.trim().length > 0)
          .map(a => ({
            text: a.answer.trim(),
            isCorrect: a.is_correct
          }))
      }));
    for (const q of validQuestions) {
      if (q.answers.length === 0) {
        this.notificationService.warning('Συμπλήρωσε τουλάχιστον μία απάντηση');
        return;
      }
      const hasValidCorrectAnswer = q.answers.some(a => a.isCorrect);

      if (!hasValidCorrectAnswer) {
        this.notificationService.warning('Επέλεξε έγκυρη σωστή απάντηση');
        return;
      }
    }
    const body = {
      thematologiaId: this.thematologiaId,
      theoriaDetId: this.selectedQuizTheory.DetId,
      questions: validQuestions
    };

    this.http.post<ApiResponse>('api/Service/SaveQnA', body)
      .subscribe({
        next: () => {
          this.notificationService.success('Το quiz αποθηκεύτηκε');
          this.loadExistingQuestions(this.selectedQuizTheory!);
        },
        error: (err) => {
          console.error('Save quiz error:', err);
          this.notificationService.error('Σφάλμα αποθήκευσης');
        }
      });
  }
  editExistingQuestion(question: ExistingQuizQuestion) {
    this.editingQuestion = question;
    this.editingQuestionText = question.Question;

    this.editingQuestionAnswers = question.Answers.map(a => ({
      AId: a.AId,
      Answer: a.Answer,
      IsCorrect: a.IsCorrect
    }));
  }

  cancelEditExistingQuestion() {
    this.editingQuestion = null;
    this.editingQuestionText = '';
    this.editingQuestionAnswers = [];
  }

  addExistingAnswer() {
    this.editingQuestionAnswers.push({
      AId: 0,
      Answer: '',
      IsCorrect: false
    });
  }

  removeExistingAnswer(index: number) {
    this.editingQuestionAnswers.splice(index, 1);
  }

  selectCorrectExistingAnswer(selectedAnswer: ExistingQuizAnswer) {
    this.editingQuestionAnswers.forEach(a => {
      a.IsCorrect = false;
    });

    selectedAnswer.IsCorrect = true;
  }

  updateExistingQuestion() {
    if (!this.editingQuestion) {
      return;
    }

    if (!this.editingQuestionText?.trim()) {
      this.notificationService.warning('Συμπλήρωσε την ερώτηση');
      return;
    }

    const validAnswers = this.editingQuestionAnswers
      .filter(a => a.Answer?.trim().length > 0)
      .map(a => ({
        Answer: a.Answer.trim(),
        IsCorrect: a.IsCorrect
      }));

    if (validAnswers.length === 0) {
      this.notificationService.warning('Συμπλήρωσε τουλάχιστον μία απάντηση');
      return;
    }

    const hasValidCorrectAnswer = validAnswers.some(a => a.IsCorrect);

    if (!hasValidCorrectAnswer) {
      this.notificationService.warning('Επέλεξε έγκυρη σωστή απάντηση');
      return;
    }

    const body: UpdateQuizQuestionRequest = {
      Id: this.editingQuestion.Id,
      DetId: this.editingQuestion.DetId,
      QId: this.editingQuestion.QId,
      Question: this.editingQuestionText.trim(),
      Answers: validAnswers
    };

    this.http.post<ApiResponse>('api/Service/UpdateQuestion', body)
      .subscribe({
        next: () => {
          this.notificationService.success('Η ερώτηση ενημερώθηκε');

          if (this.selectedQuizTheory) {
            this.loadExistingQuestions(this.selectedQuizTheory);
          }

          this.cancelEditExistingQuestion();
        },
        error: (err) => {
          console.error('Update question error:', err);
          this.notificationService.error('Σφάλμα ενημέρωσης ερώτησης');
        }
      });
  }

  deleteExistingQuestion(question: ExistingQuizQuestion) {
    if (!confirm('Να διαγραφεί αυτή η ερώτηση;')) {
      return;
    }

    this.http.delete<ApiResponse>(
      `api/Service/DeleteQuestion/${question.Id}/${question.DetId}/${question.QId}`
    ).subscribe({
      next: () => {
        this.notificationService.success('Η ερώτηση διαγράφηκε');

        if (this.selectedQuizTheory) {
          this.loadExistingQuestions(this.selectedQuizTheory);
        }
      },
      error: (err) => {
        console.error('Delete question error:', err);
        this.notificationService.error('Σφάλμα διαγραφής ερώτησης');
      }
    });
  }

  saveThematologia() {
    if (!this.thematologiaTitle.trim()) {
      this.notificationService.warning('Συμπλήρωσε Header Θεματολογίας');
      return;
    }

    const fromDate = new Date();
    const toDate = new Date();
    toDate.setMonth(toDate.getMonth() + 1);

    const body = {
      Title: this.thematologiaTitle,
      FromDate: fromDate,
      ToDate: toDate
    };

    this.http.post<ApiResponse>('api/Service/AddThematologia', body)
      .subscribe({
        next: (res) => {
          if (res.IsSuccess) {
            this.thematologiaTitle = '';
            this.loadThematologies();
            this.notificationService.success('Η θεματολογία αποθηκεύτηκε επιτυχώς');
          } else {
            this.notificationService.warning(res.Message || 'Κάτι πήγε λάθος');
          }
        },
        error: (err) => {
          console.error('Save thematologia error:', err);
          this.notificationService.error('Σφάλμα αποθήκευσης θεματολογίας');
        }
      });
  }

  startEditThematologia(item: Thematologia) {
    if (this.editingThematologiaId === item.Id) {
      this.editingThematologiaId = null;
      this.editingThematologiaTitle = '';
      this.editingFromDate = '';
      this.editingToDate = '';
      this.selectedThematologia = null;
      this.selectedTheories = [];
      this.newTheoryHeader = '';
      this.newTheoryDetails = '';
      return;
    }

    this.editingThematologiaId = item.Id;
    this.editingThematologiaTitle = item.Title;

    this.editingFromDate = item.FromDate ? item.FromDate.substring(0, 10) : '';
    this.editingToDate = item.ToDate ? item.ToDate.substring(0, 10) : '';

    this.selectedThematologia = item;
    this.selectThematologia(item);
  }

  updateThematologia(item: Thematologia) {
    if (!this.editingThematologiaTitle.trim()) {
      this.notificationService.warning('Συμπλήρωσε Header Θεματολογίας');
      return;
    }

    const body = {
      Id: item.Id,
      Title: this.editingThematologiaTitle,
      FromDate: this.editingFromDate ? new Date(this.editingFromDate) : new Date(),
      ToDate: this.editingToDate ? new Date(this.editingToDate) : new Date(2099, 11, 31)
    };

    this.http.post<ApiResponse>('api/Service/UpdateThematologia', body)
      .subscribe({
        next: (res) => {
          if (res.IsSuccess) {
            this.editingThematologiaId = null;
            this.editingThematologiaTitle = '';
            this.editingFromDate = '';
            this.editingToDate = '';
            this.selectedThematologia = null;
            this.selectedTheories = [];
            this.newTheoryHeader = '';
            this.newTheoryDetails = '';
            this.loadThematologies();

            this.notificationService.success('Η θεματολογία ενημερώθηκε επιτυχώς');
          } else {
            this.notificationService.error(res.Message);
          }
        },
        error: (err) => {
          console.error('Update thematologia error:', err);
          this.notificationService.error('Σφάλμα ενημέρωσης θεματολογίας');
        }
      });
  }

  deleteThematologia(item: Thematologia) {
    if (!confirm('Να διαγραφεί αυτή η θεματολογία;')) {
      return;
    }

    this.http.delete<ApiResponse>(`api/Service/DeleteThematologia/${item.Id}`)
      .subscribe({
        next: () => {
          this.selectedThematologia = null;
          this.selectedTheories = [];
          this.thematologiaTitle = '';
          this.loadThematologies();

          this.notificationService.success('Διαγράφηκε Επιτυχώς');
        },
        error: (err) => {
          console.error('Delete thematologia error:', err);
          this.notificationService.error('Σφάλμα διαγραφής θεματολογίας');
        }
      });
  }

  getNextDetId(): number {
    if (!this.selectedTheories || this.selectedTheories.length === 0) {
      return 1;
    }

    return Math.max(...this.selectedTheories.map(x => x.DetId)) + 1;
  }

  addTheoryToSelected() {
    if (!this.selectedThematologia) {
      this.notificationService.warning('Διάλεξε πρώτα θεματολογία');
      return;
    }

    if (!this.newTheoryHeader.trim()) {
      this.notificationService.warning('Συμπλήρωσε τίτλο θεωρίας');
      return;
    }

    const body = {
      Id: this.selectedThematologia.Id,
      DetId: this.getNextDetId(),
      Header: this.newTheoryHeader,
      Details: this.newTheoryDetails
    };

    this.http.post<ApiResponse>('api/Service/AddTheoria', body)
      .subscribe({
        next: (res) => {
          if (res.IsSuccess) {
            this.newTheoryHeader = '';
            this.newTheoryDetails = '';

            this.selectThematologia(this.selectedThematologia!);

            this.notificationService.success('Η θεωρία αποθηκεύτηκε επιτυχώς');
          } else {
            this.notificationService.error(res.Message);
          }
        },
        error: (err) => {
          console.error('Add theory error:', err);
          this.notificationService.error('Σφάλμα αποθήκευσης θεωρίας');
        }
      });
  }

  startEditTheory(theory: QuizTheory) {
    if (
      this.editingTheoryId === theory.Id &&
      this.editingTheoryDetId === theory.DetId
    ) {
      this.editingTheoryId = null;
      this.editingTheoryDetId = null;
      this.editingTheoryHeader = '';
      this.editingTheoryDetails = '';
      return;
    }

    this.editingTheoryId = theory.Id;
    this.editingTheoryDetId = theory.DetId;
    this.editingTheoryHeader = theory.Header;
    this.editingTheoryDetails = theory.Details;
  }

  updateTheoria() {
    if (!this.editingTheoryHeader.trim()) {
      this.notificationService.warning('Συμπλήρωσε τίτλο θεωρίας');
      return;
    }

    const body = {
      Id: this.editingTheoryId,
      DetId: this.editingTheoryDetId,
      Header: this.editingTheoryHeader,
      Details: this.editingTheoryDetails
    };

    this.http.post<ApiResponse>('api/Service/UpdateTheoria', body)
      .subscribe({
        next: (res) => {
          if (res.IsSuccess) {
            this.notificationService.success('Η θεωρία ενημερώθηκε επιτυχώς');

            this.editingTheoryId = null;
            this.editingTheoryDetId = null;
            this.editingTheoryHeader = '';
            this.editingTheoryDetails = '';

            if (this.selectedThematologia) {
              this.selectThematologia(this.selectedThematologia);
            }
          } else {
            this.notificationService.error(res.Message);
          }
        },
        error: (err) => {
          console.error('Update theory error:', err);
          this.notificationService.error('Σφάλμα ενημέρωσης θεωρίας');
        }
      });
  }

  deleteTheoria(theory: QuizTheory) {
    if (!confirm('Να διαγραφεί αυτή η θεωρία;')) {
      return;
    }

    this.http.delete<ApiResponse>(
      `api/Service/DeleteTheoria/${theory.Id}/${theory.DetId}`
    ).subscribe({
      next: (res) => {
        if (res.IsSuccess) {
          this.notificationService.success('Η θεωρία διαγράφηκε επιτυχώς');

          if (this.selectedThematologia) {
            this.selectThematologia(this.selectedThematologia);
          }
        } else {
          this.notificationService.error(res.Message);
        }
      },
      error: (err) => {
        console.error('Delete theory error:', err);
        this.notificationService.error('Σφάλμα διαγραφής θεωρίας');
      }
    });
  }

  setAdminEditTab(tab: string) {
    this.adminEditTab = tab;
  }

  goBack() {
    this.router.navigate(['/mainpage']);
  }
}
