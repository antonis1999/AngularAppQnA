import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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
export class EditPageComponent implements OnInit {

  thematologiaId = 0;
  adminEditTab = 'theory';
  thematologies: Thematologia[] = [];
  selectedThematologia: Thematologia | null = null;

  thematologiaTitle = '';

  editingThematologiaId: number | null = null;
  editingThematologiaTitle = '';
  editingFromDate = '';
  editingToDate = '';
  selectedTheories: QuizTheory[] = [];

  newTheoryHeader = '';
  newTheoryDetails = '';

  editingTheoryId: number | null = null;
  editingTheoryDetId: number | null = null;
  editingTheoryHeader = '';
  editingTheoryDetails = '';
  selectedQuizTheory: QuizTheory | null = null;

  quizQuestions: QuizQuestionView[] = [];
  existingQuestions: ExistingQuizQuestion[] = [];

  quizQuestionCount = 4;
  totalQuizQuestions = 0;

  editingQuestion: ExistingQuizQuestion | null = null;
  editingQuestionText = '';
  editingQuestionAnswers: ExistingQuizAnswer[] = [];
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
  @ViewChild('quizExcelInput')
  quizExcelInput!: ElementRef<HTMLInputElement>;
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private notificationService: NotificationService
  ) { }
  ngOnInit(): void {
    this.thematologiaId = Number(this.route.snapshot.paramMap.get('id'));

    this.loadThematologies();
    this.loadQuizQuestionsCount();
  }

  loadThematologies(): void {
    this.http.get<Thematologia[]>('api/Service/GetThematologies')
      .subscribe({
        next: (res) => {
          this.thematologies = res;

          this.selectedThematologia = this.thematologies.find(x =>
            x.Id === this.thematologiaId
          ) ?? null;

          if (this.selectedThematologia) {
            this.quizQuestionCount =
              this.selectedThematologia.QuizQuestionCount ||
              this.selectedThematologia.quizQuestionCount ||
              4;

            this.selectThematologia(this.selectedThematologia);
          }
        },
        error: (err) => {
          console.error('Load thematologies error:', err);
          this.notificationService.error('Σφάλμα φόρτωσης θεματολογιών');
        }
      });
  }

  loadQuizQuestionsCount(): void {
    this.http.get<number>(
      `api/Service/GetQuizQuestionsCount/${this.thematologiaId}`
    )
      .subscribe({
        next: (count) => {
          this.totalQuizQuestions = count;
        },
        error: (err) => {
          console.error('Load quiz questions count error:', err);
        }
      });
  }

  loadExistingQuestions(theory: QuizTheory): void {
    this.http.get<ExistingQuizQuestion[]>(
      `api/Service/GetQuestionsByTheoria/${this.thematologiaId}/${theory.DetId}`
    )
      .subscribe({
        next: (res) => {
          this.existingQuestions = res || [];
        },
        error: (err) => {
          console.error('Load existing questions error:', err);
          this.notificationService.error('Σφάλμα φόρτωσης ερωτήσεων');
        }
      });
  }

  setAdminEditTab(tab: string): void {
    this.adminEditTab = tab;
  }

  selectThematologia(item: Thematologia): void {
    this.selectedThematologia = item;

    this.http.get<QuizTheory[]>(
      `api/Service/GetTheoriaByThematologia?thematologiaId=${item.Id}`
    )
      .subscribe({
        next: (res) => {
          this.selectedTheories = res;
        },
        error: (err) => {
          console.error('Load theories error:', err);
          this.notificationService.error('Σφάλμα φόρτωσης θεωριών');
        }
      });
  }

  saveThematologia(): void {
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

  startEditThematologia(item: Thematologia): void {
    if (this.editingThematologiaId === item.Id) {
      this.resetThematologiaEdit();
      return;
    }

    this.editingThematologiaId = item.Id;
    this.editingThematologiaTitle = item.Title;
    this.editingFromDate = item.FromDate ? item.FromDate.substring(0, 10) : '';
    this.editingToDate = item.ToDate ? item.ToDate.substring(0, 10) : '';

    this.selectedThematologia = item;
    this.selectThematologia(item);
  }

  updateThematologia(item: Thematologia): void {
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
            this.resetThematologiaEdit();
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

  deleteThematologia(item: Thematologia): void {
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

  private resetThematologiaEdit(): void {
    this.editingThematologiaId = null;
    this.editingThematologiaTitle = '';
    this.editingFromDate = '';
    this.editingToDate = '';
    this.selectedThematologia = null;
    this.selectedTheories = [];
    this.newTheoryHeader = '';
    this.newTheoryDetails = '';
  }

  getNextDetId(): number {
    if (!this.selectedTheories || this.selectedTheories.length === 0) {
      return 1;
    }

    return Math.max(...this.selectedTheories.map(x => x.DetId)) + 1;
  }

  addTheoryToSelected(): void {
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

  startEditTheory(theory: QuizTheory): void {
    if (
      this.editingTheoryId === theory.Id &&
      this.editingTheoryDetId === theory.DetId
    ) {
      this.resetTheoryEdit();
      return;
    }

    this.editingTheoryId = theory.Id;
    this.editingTheoryDetId = theory.DetId;
    this.editingTheoryHeader = theory.Header;
    this.editingTheoryDetails = theory.Details;
  }

  updateTheoria(): void {
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

            this.resetTheoryEdit();

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

  deleteTheoria(theory: QuizTheory): void {
    if (!confirm('Να διαγραφεί αυτή η θεωρία;')) {
      return;
    }

    this.http.delete<ApiResponse>(
      `api/Service/DeleteTheoria/${theory.Id}/${theory.DetId}`
    )
      .subscribe({
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

  private resetTheoryEdit(): void {
    this.editingTheoryId = null;
    this.editingTheoryDetId = null;
    this.editingTheoryHeader = '';
    this.editingTheoryDetails = '';
  }

  saveQuizQuestionCount(): void {
    if (this.quizQuestionCount <= 0) {
      this.notificationService.warning('Ο αριθμός ερωτήσεων πρέπει να είναι μεγαλύτερος από 0.');
      return;
    }

    if (this.quizQuestionCount > this.totalQuizQuestions) {
      this.notificationService.warning(
        `Υπάρχουν μόνο ${this.totalQuizQuestions} διαθέσιμες ερωτήσεις`
      );
      return;
    }

    const body = {
      ThematologiaId: this.thematologiaId,
      QuizQuestionCount: this.quizQuestionCount
    };

    this.http.post<ApiResponse>('api/Service/UpdateQuizQuestionCount', body)
      .subscribe({
        next: () => {
          this.notificationService.success('Η ρύθμιση αποθηκεύτηκε.');
        },
        error: (err) => {
          console.error('Save quiz question count error:', err);
          this.notificationService.error('Σφάλμα αποθήκευσης ρύθμισης.');
        }
      });
  }

  selectQuizTheory(theory: QuizTheory): void {
    this.selectedQuizTheory = theory;
    this.loadExistingQuestions(theory);
    this.resetNewQuizQuestions();
  }

  addQuizQuestion(): void {
    this.quizQuestions.push(this.createEmptyQuizQuestion());
  }

  removeQuizQuestion(index: number): void {
    this.quizQuestions.splice(index, 1);
  }

  addAnswer(question: QuizQuestionView): void {
    question.options.push({
      answer: '',
      is_correct: false
    });
  }

  removeAnswer(question: QuizQuestionView, answerIndex: number): void {
    question.options.splice(answerIndex, 1);
  }

  selectCorrectAnswer(question: QuizQuestionView, selectedAnswer: QuizOption): void {
    question.options.forEach(a => {
      a.is_correct = false;
    });

    selectedAnswer.is_correct = true;
  }

  saveQuizQuestions(): void {
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

    if (validQuestions.length === 0) {
      this.notificationService.warning('Συμπλήρωσε τουλάχιστον μία ερώτηση');
      return;
    }

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
          this.notificationService.success('Επιτυχής αποθήκευση');

          this.loadQuizQuestionsCount();
          this.loadExistingQuestions(this.selectedQuizTheory!);
          this.resetNewQuizQuestions();
        },
        error: (err) => {
          console.error('Save quiz error:', err);
          this.notificationService.error('Σφάλμα αποθήκευσης');
        }
      });
  }

  private resetNewQuizQuestions(): void {
    this.quizQuestions = [
      this.createEmptyQuizQuestion()
    ];
  }

  private createEmptyQuizQuestion(): QuizQuestionView {
    return {
      question: '',
      options: [
        { answer: '', is_correct: false },
        { answer: '', is_correct: false },
        { answer: '', is_correct: false }
      ]
    };
  }
  editExistingQuestion(question: ExistingQuizQuestion): void {
    this.editingQuestion = question;
    this.editingQuestionText = question.Question;

    this.editingQuestionAnswers = question.Answers.map(a => ({
      AId: a.AId,
      Answer: a.Answer,
      IsCorrect: a.IsCorrect
    }));
  }

  cancelEditExistingQuestion(): void {
    this.editingQuestion = null;
    this.editingQuestionText = '';
    this.editingQuestionAnswers = [];
  }

  addExistingAnswer(): void {
    this.editingQuestionAnswers.push({
      AId: 0,
      Answer: '',
      IsCorrect: false
    });
  }

  removeExistingAnswer(index: number): void {
    this.editingQuestionAnswers.splice(index, 1);
  }

  selectCorrectExistingAnswer(selectedAnswer: ExistingQuizAnswer): void {
    this.editingQuestionAnswers.forEach(a => {
      a.IsCorrect = false;
    });

    selectedAnswer.IsCorrect = true;
  }

  updateExistingQuestion(): void {
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

  deleteExistingQuestion(question: ExistingQuizQuestion): void {
    if (!confirm('Να διαγραφεί αυτή η ερώτηση;')) {
      return;
    }

    this.http.delete<ApiResponse>(
      `api/Service/DeleteQuestion/${question.Id}/${question.DetId}/${question.QId}`
    )
      .subscribe({
        next: () => {
          this.notificationService.success('Η ερώτηση διαγράφηκε');

          this.loadQuizQuestionsCount();

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
  downloadQuizExcelTemplate(): void {

    this.http.get(
      'api/Service/DownloadQuizTemplate',
      {
        responseType: 'blob'
      }
    ).subscribe({

      next: (blob) => {

        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'QuizTemplate.xlsx';

        document.body.appendChild(a);

        a.click();

        document.body.removeChild(a);

        window.URL.revokeObjectURL(url);
      },

      error: (err) => {

        console.error(err);

        this.notificationService.error(
          'Αποτυχία λήψης προτύπου Excel'
        );

      }

    });

  }

  openQuizExcelImport(): void {

    this.quizExcelInput.nativeElement.click();

  }

  onQuizExcelSelected(event: Event): void {

    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.notificationService.warning('Επίλεξε αρχείο Excel (.xlsx)');
      input.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<ApiResponse>(
      `api/Service/ImportQuizExcel/${this.thematologiaId}`,
      formData
    ).subscribe({
      next: (res) => {
        if (res.IsSuccess) {
          this.notificationService.success(res.Message || 'Το Excel εισήχθη επιτυχώς');

          this.loadThematologies();
          this.loadQuizQuestionsCount();

          if (this.selectedQuizTheory) {
            this.loadExistingQuestions(this.selectedQuizTheory);
          }
        } else {
          this.notificationService.warning(res.Message || 'Το Excel δεν εισήχθη');
        }

        input.value = '';
      },
      error: (err) => {
        console.error('Import quiz excel error:', err);
        this.notificationService.error('Σφάλμα εισαγωγής Excel');
        input.value = '';
      }
    });
  }
  goBack(): void {
    this.router.navigate(['/mainpage']);
  }
}
