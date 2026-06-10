import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../services/notification.service';
import { Router } from '@angular/router';
import { Ranking, Thematologia } from '../interfaces/models';
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
  selectedRankingThematologiaId = 0;

  openedPreviewThematologiaId: number | null = null;
  previewTheories: any[] = [];

  topics: any[] = [];

  rankings: Ranking[] = [];
  rankingLoading = false;
  rankingSearch = '';
  rankingDate = '';
  showOnlyBestPerUser = false;

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

    if (data) {
      this.user = JSON.parse(data);
      console.log('CURRENT USER:', this.user);

      this.isAdmin =
        this.user.roleId === 99 ||
        this.user.RoleId === 99;
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

    if (section === 'ranking') {
      this.loadRanking();
    }

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
      this.notificationService.warning('Επέλεξε Θεματολογία');
      return;
    }

    this.router.navigate([
      '/quiz-page',
      this.selectedQuizThematologiaId
    ]);
    this.notificationService.success('Το QUIZ ξεκίνησε')
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

  loadRanking() {
    if (!this.selectedRankingThematologiaId) {
      this.rankings = [];
      return;
    }

    this.rankingLoading = true;

    this.http.get<Ranking[]>(
      `api/Service/GetRanking/${this.selectedRankingThematologiaId}`
    )
      .subscribe({
        next: (res) => {
          this.rankings = res;
          this.rankingLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.rankingLoading = false;
          this.notificationService.error('Σφάλμα φόρτωσης κατάταξης');
        }
      });
  }
  get filteredRankings(): Ranking[] {
    let result = [...this.rankings];

    if (this.rankingSearch.trim()) {
      const search = this.rankingSearch.toLowerCase().trim();

      result = result.filter(x =>
        x.Nickname.toLowerCase().includes(search)
      );
    }

    if (this.rankingDate) {
      result = result.filter(x =>
        x.CreateDate?.substring(0, 10) === this.rankingDate
      );
    }

    if (this.showOnlyBestPerUser) {
      const bestMap = new Map<string, Ranking>();

      result.forEach(item => {
        const key = item.Nickname || 'Χρήστης';
        const existing = bestMap.get(key);

        if (
          !existing ||
          item.CorrectAnswers > existing.CorrectAnswers ||
          (
            item.CorrectAnswers === existing.CorrectAnswers &&
            item.Percentage > existing.Percentage
          ) ||
          (
            item.CorrectAnswers === existing.CorrectAnswers &&
            item.Percentage === existing.Percentage &&
            item.TotalSeconds < existing.TotalSeconds
          )
        ) {
          bestMap.set(key, item);
        }
      });

      result = Array.from(bestMap.values());
    }

    return result.sort((a, b) =>
      b.CorrectAnswers - a.CorrectAnswers ||
      b.Percentage - a.Percentage ||
      a.TotalSeconds - b.TotalSeconds
    );
  }
  clearRankingFilters(): void {

    this.showOnlyBestPerUser = false;
    this.rankingSearch = '';
    this.rankingDate = '';

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
