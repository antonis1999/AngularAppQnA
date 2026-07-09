import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { HttpClient, HttpParams } from '@angular/common/http';
import { NotificationService } from '../services/notification.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Ranking, Thematologia, User } from '../interfaces/models';

@Component({
  selector: 'app-mainpage',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule],
  templateUrl: './mainpage.component.html',
  styleUrl: './mainpage.component.css'
})
export class MainpageComponent {

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  user: User | null = null;
  users: User[] = [];

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
  selectedRankingDifficulty: number | null = null;

  showUserDetailsPopup = false;
  selectedUserId: number | null = null;
  userSearchText = '';
  newPin = '';
  confirmPin = '';

  showPointsPopover = false;
  showAddUser = false;
  newUserEmail = '';

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

  ngOnInit(): void {
    const data = localStorage.getItem('currentUser');

    if (data) {
      this.user = JSON.parse(data) as User;
      this.isAdmin = this.user.RoleId === 99;

      if (this.isAdmin) {
        this.loadUsers();
      }
    }

    this.loadThematologies();

    this.route.queryParams.subscribe(params => {
      if (params['section'] === 'ranking') {
        this.activeSection = 'ranking';
        this.selectedRankingThematologiaId = Number(params['thematologiaId']);
        this.loadRanking();
      }
    });
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    window.location.href = '/';
  }

  loadUsers(): void {
    this.http.get<User[]>('api/Auth/GetUsers')
      .subscribe({
        next: (res) => {
          this.users = res;
        },
        error: (err) => {
          console.error('Load users error:', err);
        }
      });
  }

  loadThematologies(): void {
    this.http.get<Thematologia[]>('api/Service/GetThematologies')
      .subscribe({
        next: (res) => {
          const availableThematologies = this.isAdmin
            ? res
            : res.filter(x => !this.isExpiredThematologia({
              toDate: x.ToDate
            }));

          this.thematologies = availableThematologies;

          this.topics = availableThematologies.map(x => ({
            id: x.Id,
            title: x.Title,
            content: '',
            fromDate: x.FromDate,
            toDate: x.ToDate
          }));
        },
        error: (err) => {
          console.error('Load thematologies error:', err);
        }
      });
  }

  isExpiredThematologia(topic: any): boolean {
    if (!topic.toDate) {
      return false;
    }

    const expireDate = new Date(topic.toDate);
    expireDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return expireDate < today;
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

    this.http.post<any>('api/Service/AddThematologia', body)
      .subscribe({
        next: (res) => {
          if (res.IsSuccess) {
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

  togglePreviewThematologia(topic: any): void {
    const id = topic.id;

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

  setSection(section: string): void {
    this.activeSection = section;

    if (section === 'ranking') {
      this.loadRanking();
    }
  }

  openEditPage(topic: any): void {
    if (!this.isAdmin) {
      this.togglePreviewThematologia(topic);
      return;
    }

    this.router.navigate(['/edit', topic.id]);
  }

  get selectedQuizThematologiaTitle(): string {
    const selected = this.thematologies.find(
      t => t.Id === this.selectedQuizThematologiaId
    );

    return selected?.Title ?? 'Καμία επιλογή';
  }

  startQuiz(): void {
    if (!this.selectedQuizThematologiaId) {
      this.notificationService.warning('Επέλεξε Θεματολογία');
      return;
    }

    this.router.navigate(['/quiz-page', this.selectedQuizThematologiaId])
      .then(() => {
        this.notificationService.success('Το QUIZ ξεκίνησε');
      });
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

  loadRanking(): void {
    if (!this.selectedRankingThematologiaId) {
      this.rankings = [];
      return;
    }

    this.rankingLoading = true;

    let params = new HttpParams();

    if (this.selectedRankingDifficulty !== null) {
      params = params.set('quizDifficulty', this.selectedRankingDifficulty);
    }

    this.http.get<Ranking[]>(
      `api/Service/GetRanking/${this.selectedRankingThematologiaId}`,
      { params }
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

  openQuizDetails(r: Ranking): void {
    if (!this.selectedRankingThematologiaId || !r.Nickname) {
      return;
    }

    this.router.navigate([
      '/quiz-details',
      this.selectedRankingThematologiaId,
      r.Nickname
    ]);
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

  openUserDetailsPopup(): void {
    this.showUserDetailsPopup = true;

    if (this.users.length === 0) {
      this.loadUsers();
    }
  }

  closeUserDetailsPopup(): void {
    this.showUserDetailsPopup = false;
    this.selectedUserId = null;
    this.userSearchText = '';
  }

  onPickerUserChange(): void {
    this.userSearchText = '';
    this.newPin = '';
    this.confirmPin = '';
  }

  get filteredUsers(): User[] {
    if (!this.userSearchText.trim()) {
      return [];
    }

    const search = this.userSearchText.toLowerCase().trim();

    return this.users.filter(u =>
      (u.Nickname ?? '').toLowerCase().includes(search) ||
      (u.Email ?? '').toLowerCase().includes(search)
    );
  }

  get selectedPopupUser(): User | null {
    if (!this.selectedUserId) {
      return null;
    }

    return this.users.find(u => u.Id === this.selectedUserId) ?? null;
  }

  selectUserFromPopup(user: User): void {
    this.selectedUserId = user.Id;
    this.userSearchText = '';
    this.newPin = '';
    this.confirmPin = '';
  }

  changeUserPin(): void {
    const userId = this.isAdmin
      ? this.selectedUserId
      : this.user?.Id;

    if (!userId) {
      this.notificationService.warning('Δεν επιλέχθηκε χρήστης.');
      return;
    }

    if (this.newPin !== this.confirmPin) {
      this.notificationService.warning('Τα PIN δεν ταιριάζουν.');
      return;
    }

    if (this.newPin.length < 4) {
      this.notificationService.warning(
        'Το PIN πρέπει να αποτελείται από τουλάχιστον 4 χαρακτήρες.'
      );
      return;
    }

    const body = {
      userId: userId,
      pin: this.newPin
    };

    this.http.post('api/Auth/ChangeUserPin', body)
      .subscribe({
        next: () => {
          this.notificationService.success('Το PIN άλλαξε επιτυχώς.');
          this.newPin = '';
          this.confirmPin = '';
        },
        error: () => {
          this.notificationService.error('Σφάλμα αλλαγής PIN.');
        }
      });
  }

  togglePointsPopover(event: MouseEvent): void {
    event.stopPropagation();
    this.showPointsPopover = !this.showPointsPopover;
  }

  openAddUserForm(): void {
    this.showAddUser = !this.showAddUser;
  }

  saveNewUser(): void {
    if (!this.newUserEmail.trim()) {
      this.notificationService.warning('Συμπληρώστε email.');
      return;
    }

    this.http.post<any>('api/Service/AddUser', {
      Email: this.newUserEmail
    })
      .subscribe({
        next: (res) => {
          if (res.IsSuccess) {
            this.notificationService.success(res.Message);
            this.newUserEmail = '';
            this.showAddUser = false;
            this.loadUsers();
          } else {
            this.notificationService.warning(res.Message);
          }
        },
        error: (err) => {
          console.error(err);
          this.notificationService.error('Σφάλμα δημιουργίας χρήστη.');
        }
      });
  }

  cancelAddUser(): void {
    this.newUserEmail = '';
    this.showAddUser = false;
  }

  toggleUserActive(user: User): void {

    if (!user || user.RoleId === 99) {
      return;
    }
    const isActive = !user.IsActive;

    this.http.post<any>('api/Service/ChangeUserStatus', {
      UserId: user.Id,
      IsActive: isActive
    })
      .subscribe({
        next: (res) => {
          if (!res.IsSuccess) {
            this.notificationService.warning(res.Message);
            return;
          }

          user.IsActive = isActive;

          this.notificationService.success(res.Message);
        },
        error: () => {
          this.notificationService.error('Σφάλμα αλλαγής κατάστασης.');
        }
      });
  }

  importUsersExcel(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<any>('api/Service/ImportUsersExcel', formData)
      .subscribe({
        next: (res) => {
          if (res.IsSuccess) {
            this.notificationService.success(res.Message);
            this.loadUsers();
          } else {
            this.notificationService.warning(res.Message);
          }
        },
        error: () => {
          this.notificationService.error('Σφάλμα εισαγωγής Excel.');
        }
      });
  }

  downloadUsersExcelTemplate(): void {
    this.http.get('api/Service/DownloadUsersExcelTemplate', {
      responseType: 'blob'
    })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);

          const a = document.createElement('a');
          a.href = url;
          a.download = 'UsersImportTemplate.xlsx';
          a.click();

          window.URL.revokeObjectURL(url);
        },
        error: () => {
          this.notificationService.error('Σφάλμα λήψης Excel.');
        }
      });
  }

  getStoreName(storeId: number | undefined): string {
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
