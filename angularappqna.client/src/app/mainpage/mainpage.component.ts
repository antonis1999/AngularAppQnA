import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../services/notification.service';
import { Router } from '@angular/router';
import { Thematologia } from '../interfaces/models';

@Component({
  selector: 'app-mainpage',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule],
  templateUrl: './mainpage.component.html',
  styleUrl: './mainpage.component.css'
})
export class MainpageComponent {

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  logout() {
    localStorage.removeItem('currentUser');
    window.location.href = '/';
  }
  user: any;
  isAdmin = false;

  activeSection = 'theory';

  thematologiaTitle = '';

  thematologies: Thematologia[] = [];

  selectedQuizThematologiaId = 0;

  openedPreviewThematologiaId: number | null = null;
  previewTheories: any[] = [];

  topics: any[] = [];

  showUserPreviewModal = false;

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

  ngOnInit() {
    const data = localStorage.getItem('currentUser');

    console.log('CURRENT USER:', this.user);

   

    if (data) {
      this.user = JSON.parse(data);
      this.isAdmin = this.user.roleId === 99;
    }

    this.loadThematologies();
  }

  loadThematologies() {
    this.http.get<any[]>('api/Service/GetThematologies')
      .subscribe({
        next: (res) => {
          this.thematologies = res;

          this.topics = res.map(x => ({
            id: x.id ?? x.Id,
            title: x.title ?? x.Title,
            content: ''
          }));
        },
        error: (err) => {
          console.error('Load thematologies error:', err);
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
            this.notificationService.warning('Κάτι πήγε λάθος');
          }
        },
        error: (err) => {
          console.error('Save thematologia error:', err);
          this.notificationService.error('Σφάλμα αποθήκευσης θεματολογίας');
        }
      });
  }

  openUserPreviewModal() {
    this.showUserPreviewModal = true;
  }

  closeUserPreviewModal() {
    this.showUserPreviewModal = false;
  }

  togglePreviewThematologia(topic: any) {
    const id = topic.id ?? topic.Id;

    if (this.openedPreviewThematologiaId === id) {
      this.openedPreviewThematologiaId = null;
      this.previewTheories = [];
      return;
    }

    this.openedPreviewThematologiaId = id;

    this.http.get<any[]>(`api/Service/GetTheoriaByThematologia?thematologiaId=${id}`)
      .subscribe({
        next: (res) => {
          this.previewTheories = res;
        },
        error: (err) => {
          console.error('Load preview theories error:', err);
          this.notificationService.error('Σφάλμα φόρτωσης θεωριών');
        }
      });
  }

  setSection(section: string) {
    this.activeSection = section;
  }

  openEditPage(topic: any) {

    if (!this.isAdmin) {
      this.togglePreviewThematologia(topic);
      return;
    }

    const id = topic.id ?? topic.Id;

    this.router.navigate(['/edit', id]);
  }

  get selectedQuizThematologiaTitle(): string {

    const selected = this.thematologies.find(
      t => t.Id === this.selectedQuizThematologiaId
    );

    return selected?.Title ?? 'Καμία επιλογή';
  }

  startQuiz() {

    if (!this.selectedQuizThematologiaId) {
      alert('Επιλέξτε θεματολογία');
      return;
    }

    this.router.navigate([
      '/quiz-page',
      this.selectedQuizThematologiaId
    ]);
  }
 
  getStoreName(storeId: number): string {

    switch (storeId) {
      case 1:
        return 'Κατάστημα';

      case 2:
        return 'Κεντρικά Γραφεία';

      case 3:
        return 'Logistics';

      default:
        return 'Άγνωστο κατάστημα';
    }
  }
  
}
