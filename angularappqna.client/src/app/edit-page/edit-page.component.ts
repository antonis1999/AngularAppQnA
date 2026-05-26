import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-edit-page',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule],
  templateUrl: './edit-page.component.html',
  styleUrl: './edit-page.component.css'
})

export class EditPageComponent {
  thematologies: any[] = [];
  selectedThematologia: any = null;
  selectedTheories: any[] = [];
  thematologiaId: number = 0;

  thematologiaTitle = '';

  editingThematologiaId: number | null = null;
  editingThematologiaTitle = '';
  editingFromDate = '';
  editingToDate = '';
  selectedQuizTheory: any = null;
  quizQuestions: any[] = [];
  newTheoryHeader = '';
  newTheoryDetails = '';

  editingTheoryId: number | null = null;
  editingTheoryDetId: number | null = null;
  editingTheoryHeader = '';
  editingTheoryDetails = '';
  adminEditTab: string = 'theory';

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
    this.thematologiaId =
      Number(this.route.snapshot.paramMap.get('id'));

    this.loadThematologies();
  }
  loadThematologies() {
    this.http.get<any[]>('api/Service/GetThematologies')
      .subscribe({
        next: (res) => {
          this.thematologies = res;

          this.selectedThematologia = this.thematologies.find(x =>
            (x.id ?? x.Id) === this.thematologiaId
          );

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

  selectThematologia(item: any) {
    this.selectedThematologia = item;

    const id = item.id ?? item.Id;

    this.http.get<any[]>(`api/Service/GetTheoriaByThematologia?thematologiaId=${id}`)
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

    this.http.post<any>('api/Service/AddThematologia', body)
      .subscribe({
        next: (res) => {
          if (res.isSuccess || res.IsSuccess) {
            this.thematologiaTitle = '';
            this.loadThematologies();
            this.notificationService.success('Η θεματολογία αποθηκεύτηκε επιτυχώς');
          } else {
            this.notificationService.warning('Κατι πήγε λάθος');
          }
        },
        error: (err) => {
          console.error('Save thematologia error:', err);
          this.notificationService.error('Σφάλμα αποθήκευσης θεματολογίας');
        }
      });
  }

  startEditThematologia(item: any) {
    const itemId = item.id ?? item.Id;

    if (this.editingThematologiaId === itemId) {
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

    this.editingThematologiaId = itemId;
    this.editingThematologiaTitle = item.title ?? item.Title;

    const from = item.fromDate ?? item.FromDate;
    const to = item.toDate ?? item.ToDate;

    this.editingFromDate = from ? from.substring(0, 10) : '';
    this.editingToDate = to ? to.substring(0, 10) : '';

    this.selectedThematologia = item;
    this.selectThematologia(item);
  }

  updateThematologia(item: any) {
    if (!this.editingThematologiaTitle.trim()) {
      this.notificationService.warning('Συμπλήρωσε Header Θεματολογίας');
      return;
    }

    const body = {
      Id: item.id ?? item.Id,
      Title: this.editingThematologiaTitle,
      FromDate: this.editingFromDate ? new Date(this.editingFromDate) : new Date(),
      ToDate: this.editingToDate ? new Date(this.editingToDate) : new Date(2099, 11, 31)
    };

    this.http.post<any>('api/Service/UpdateThematologia', body)
      .subscribe({
        next: (res) => {
          if (res.isSuccess || res.IsSuccess) {
            this.editingThematologiaId = null;
            this.editingThematologiaTitle = '';
            this.editingFromDate = '';
            this.editingToDate = '';
            this.selectedThematologia = null;
            this.selectedTheories = [];
            this.newTheoryHeader = '';
            this.newTheoryDetails = '';
            this.loadThematologies();

            this.notificationService.success(res.message || res.Message);
          } else {
            this.notificationService.error(res.message || res.Message);
          }
        }
      });
  }

  deleteThematologia(item: any) {
    const id = item.id ?? item.Id;

    if (!confirm('Να διαγραφεί αυτή η θεματολογία;')) {
      return;
    }

    this.http.delete<any>(`api/Service/DeleteThematologia/${id}`)
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

  selectQuizTheory(theory: any) {
    this.selectedQuizTheory = theory;

    this.quizQuestions = [
      {
        questionText: '',
        answers: [
          { text: '', isCorrect: false }
        ]
      }
    ];
  }

  addQuizQuestion() {
    this.quizQuestions.push({
      questionText: '',
      answers: [
        { text: '', isCorrect: false }
      ]
    });
  }

  removeQuizQuestion(index: number) {
    this.quizQuestions.splice(index, 1);
  }

  addAnswer(question: any) {
    question.answers.push({
      text: '',
      isCorrect: false
    });
  }

  removeAnswer(question: any, answerIndex: number) {
    question.answers.splice(answerIndex, 1);
  }

  selectCorrectAnswer(question: any, selectedAnswer: any) {
    question.answers.forEach((a: any) => {
      a.isCorrect = false;
    });

    selectedAnswer.isCorrect = true;
  }

  saveQuizQuestions() {
    if (!this.selectedQuizTheory) {
      this.notificationService.warning('Επιλέξτε πρώτα θεωρία');
      return;
    }

    console.log('Quiz questions:', {
      thematologiaId: this.thematologiaId,
      theoryDetId: this.selectedQuizTheory.detId ?? this.selectedQuizTheory.DetId,
      questions: this.quizQuestions
    });

    this.notificationService.success('Οι ερωτήσεις είναι έτοιμες προσωρινά');
  }

  getNextDetId(): number {
    if (!this.selectedTheories || this.selectedTheories.length === 0) {
      return 1;
    }

    return Math.max(
      ...this.selectedTheories.map((x: any) => x.detId ?? x.DetId)
    ) + 1;
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

    const thematologiaId =
      this.selectedThematologia.id ??
      this.selectedThematologia.Id;

    const body = {
      Id: thematologiaId,
      DetId: this.getNextDetId(),
      Header: this.newTheoryHeader,
      Details: this.newTheoryDetails
    };

    this.http.post<any>('api/Service/AddTheoria', body)
      .subscribe({
        next: (res) => {
          if (res.isSuccess || res.IsSuccess) {
            this.newTheoryHeader = '';
            this.newTheoryDetails = '';

            this.selectThematologia(this.selectedThematologia);

            this.notificationService.success('Η θεωρία αποθηκεύτηκε επιτυχώς');
          } else {
            this.notificationService.error(res.message || res.Message);
          }
        },
        error: (err) => {
          console.error('Add theory error:', err);
          this.notificationService.error('Σφάλμα αποθήκευσης θεωρίας');
        }
      });
  }

  startEditTheory(theory: any) {
    const id = theory.id ?? theory.Id;
    const detId = theory.detId ?? theory.DetId;

    if (this.editingTheoryId === id && this.editingTheoryDetId === detId) {
      this.editingTheoryId = null;
      this.editingTheoryDetId = null;
      this.editingTheoryHeader = '';
      this.editingTheoryDetails = '';
      return;
    }

    this.editingTheoryId = id;
    this.editingTheoryDetId = detId;
    this.editingTheoryHeader = theory.header ?? theory.Header;
    this.editingTheoryDetails = theory.details ?? theory.Details;
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

    this.http.post<any>('api/Service/UpdateTheoria', body)
      .subscribe({
        next: (res) => {
          if (res.isSuccess || res.IsSuccess) {
            this.notificationService.success('Η θεωρία ενημερώθηκε επιτυχώς');

            this.editingTheoryId = null;
            this.editingTheoryDetId = null;
            this.editingTheoryHeader = '';
            this.editingTheoryDetails = '';

            this.selectThematologia(this.selectedThematologia);
          } else {
            this.notificationService.error(res.message || res.Message);
          }
        },
        error: (err) => {
          console.error('Update theory error:', err);
          this.notificationService.error('Σφάλμα ενημέρωσης θεωρίας');
        }
      });
  }

  deleteTheoria(theory: any) {
    const id = theory.id ?? theory.Id;
    const detId = theory.detId ?? theory.DetId;

    if (!confirm('Να διαγραφεί αυτή η θεωρία;')) {
      return;
    }

    this.http.delete<any>(`api/Service/DeleteTheoria/${id}/${detId}`)
      .subscribe({
        next: (res) => {
          if (res.isSuccess || res.IsSuccess) {
            this.notificationService.success('Η θεωρία διαγράφηκε επιτυχώς');

            if (this.selectedThematologia) {
              this.selectThematologia(this.selectedThematologia);
            }
          } else {
            this.notificationService.error(res.message || res.Message);
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
