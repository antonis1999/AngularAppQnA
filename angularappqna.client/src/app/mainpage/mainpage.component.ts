import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { HttpClient, HttpParams } from '@angular/common/http';
import { NotificationService } from '../services/notification.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Ranking, Thematologia, User } from '../interfaces/models';
import { PresentationComponent } from '../presentation/presentation.component';
import { AuthService } from '../services/auth.service';
import { CalendarService } from '../services/calendar.service';
import { CalendarEvent } from '../interfaces/models';

@Component({
  selector: 'app-mainpage',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule, PresentationComponent],
  templateUrl: './mainpage.component.html',
  styleUrl: './mainpage.component.css'
})
export class MainpageComponent {
  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private notificationService: NotificationService,
    private router: Router,
    private authService: AuthService,
    private calendarService: CalendarService

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
  TitleSearchText = '';
  newPin = '';
  confirmPin = '';
  previewLoading = false;
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

  readonly calendarYear = new Date().getFullYear();


  calendarMonth = new Date().getMonth();
  selectedCalendarDate: Date | null = null;

  calendarEvents: CalendarEvent[] = [];
  calendarLoading = false;
  showCalendarEventModal = false;
  calendarEventTitle = '';
  calendarEventDate = '';
  calendarEventDescription = '';
  calendarEventStartTime = '';
  calendarEventEndTime = '';
  calendarError = '';
  calendarSaving = false;
  deletingCalendarEventId: number | null = null;

  readonly calendarWeekDays = [
    'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'
  ];

  readonly calendarMonthNames = [
    'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος',
    'Απρίλιος', 'Μάιος', 'Ιούνιος',
    'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος',
    'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
  ];

  ngOnInit(): void {
    const data = localStorage.getItem('currentUser');

    if (data) {
      this.user = JSON.parse(data) as User;
      this.isAdmin = this.user.RoleId === 99;
      this.activeSection = this.isAdmin
        ? 'theory'
        : 'presentation';
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

  get calendarDays(): (Date | null)[] {
    const firstDay = new Date(this.calendarYear, this.calendarMonth, 1);
    const daysInMonth = new Date(
      this.calendarYear,
      this.calendarMonth + 1,
      0
    ).getDate();

    const offset = (firstDay.getDay() + 6) % 7;

    const days: (Date | null)[] = Array(offset).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(this.calendarYear, this.calendarMonth, day));
    }

    while (days.length % 7 !== 0) days.push(null);
    return days;
  }

  changeCalendarMonth(direction: number): void {
    const nextMonth = this.calendarMonth + direction;

    if (nextMonth < 0 || nextMonth > 11) {
      return;
    }

    this.calendarMonth = nextMonth;
    this.selectedCalendarDate = null;
  }

  selectCalendarDate(date: Date): void {
    this.selectedCalendarDate = date;
  }

  isCalendarToday(date: Date): boolean {
    const today = new Date();

    return date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
  }

  isCalendarSelected(date: Date): boolean {
    return this.selectedCalendarDate !== null &&
      date.getFullYear() === this.selectedCalendarDate.getFullYear() &&
      date.getMonth() === this.selectedCalendarDate.getMonth() &&
      date.getDate() === this.selectedCalendarDate.getDate();
  }

  loadCalendarEvents(): void {
    this.calendarLoading = true;
    this.calendarError = '';
    this.calendarService.getEvents(this.calendarYear).subscribe({
      next: (events) => {
        this.calendarEvents = (events ?? []).map(event => ({
          ...event,
          id: event.id ?? (event as any).Id,
          title: event.title ?? (event as any).Title,
          description: event.description ?? (event as any).Description ?? null,
          eventDate: event.eventDate ?? (event as any).EventDate,
          startTime: event.startTime ?? (event as any).StartTime ?? null,
          endTime: event.endTime ?? (event as any).EndTime ?? null
        }));
        this.calendarLoading = false;
      },
      error: (error) => {
        console.error('Calendar GetEvents:', error);
        this.calendarError = 'Δεν ήταν δυνατή η φόρτωση των δραστηριοτήτων.';
        this.calendarLoading = false;
      }
    });
  }

  getEventsForDate(date: Date | null): CalendarEvent[] {
    if (!date) return [];
    const key = this.toCalendarDateString(date);
    return this.calendarEvents.filter(event =>
      typeof event.eventDate === 'string' && event.eventDate.substring(0, 10) === key
    );
  }

  formatCalendarTime(time: string | null): string {
    return time ? time.substring(0, 5) : '';
  }

  private toCalendarDateString(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  openCalendarEventModal(date?: Date): void {
    if (!this.isAdmin) return;
    this.calendarEventTitle = '';
    this.calendarEventDescription = '';
    this.calendarEventStartTime = '';
    this.calendarEventEndTime = '';
    this.calendarEventDate = this.toCalendarDateString(
      date ?? this.selectedCalendarDate ?? new Date(this.calendarYear, this.calendarMonth, 1)
    );
    this.showCalendarEventModal = true;
  }

  closeCalendarEventModal(): void {
    if (!this.calendarSaving) this.showCalendarEventModal = false;
  }

  addCalendarEvent(): void {
    if (!this.isAdmin || this.calendarSaving) return;
    const title = this.calendarEventTitle.trim();
    const eventDate = this.calendarEventDate;
    if (!title || !eventDate) {
      this.notificationService.warning('Συμπλήρωσε τίτλο και ημερομηνία.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || Number(eventDate.substring(0, 4)) !== this.calendarYear) {
      this.notificationService.warning(`Επίλεξε ημερομηνία μέσα στο ${this.calendarYear}.`);
      return;
    }
    if (this.calendarEventStartTime && this.calendarEventEndTime && this.calendarEventEndTime <= this.calendarEventStartTime) {
      this.notificationService.warning('Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.');
      return;
    }

    const body = {
      title,
      description: this.calendarEventDescription.trim() || null,
      eventDate: `${eventDate}T00:00:00`,
      startTime: this.calendarEventStartTime ? `${this.calendarEventStartTime}:00` : null,
      endTime: this.calendarEventEndTime ? `${this.calendarEventEndTime}:00` : null
    };

    this.calendarSaving = true;
    this.calendarService.addEvent(body).subscribe({
      next: () => {
        this.calendarSaving = false;
        this.showCalendarEventModal = false;
        this.calendarMonth = Number(eventDate.substring(5, 7)) - 1;
        this.selectedCalendarDate = new Date(`${eventDate}T12:00:00`);
        this.notificationService.success('Η δραστηριότητα αποθηκεύτηκε.');
        this.loadCalendarEvents();
      },
      error: (error) => {
        console.error('Calendar AddEvent:', error);
        this.calendarSaving = false;
        this.notificationService.error(`Αποτυχία αποθήκευσης (${error.status || 'δίκτυο'}).`);
      }
    });
  }

  deleteCalendarEvent(event: CalendarEvent, mouseEvent: MouseEvent): void {
    mouseEvent.stopPropagation();
    if (!this.isAdmin || this.deletingCalendarEventId !== null) return;
    if (!window.confirm(`Να διαγραφεί η δραστηριότητα «${event.title}»;`)) return;

    this.deletingCalendarEventId = event.id;
    this.calendarService.deleteEvent(event.id).subscribe({
      next: () => {
        this.deletingCalendarEventId = null;
        this.notificationService.success('Η δραστηριότητα διαγράφηκε.');
        this.loadCalendarEvents();
      },
      error: (error) => {
        console.error('Calendar DeleteEvent:', error);
        this.deletingCalendarEventId = null;
        this.notificationService.error(`Αποτυχία διαγραφής (${error.status || 'δίκτυο'}).`);
      }
    });
  }

  logout(): void {
    this.authService.logout();
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
      this.previewLoading = false;
      return;
    }

    this.openedPreviewThematologiaId = id;


    this.previewTheories = [];
    this.previewLoading = true;

    this.http
      .get<any[]>(
        `api/Service/GetTheoriaByThematologia?thematologiaId=${id}`
      )
      .subscribe({
        next: (res) => {
          this.previewTheories = res ?? [];
          this.previewLoading = false;
        },
        error: (err) => {
          console.error('Load preview theories error:', err);

          this.previewTheories = [];
          this.previewLoading = false;

          this.notificationService.error(
            'Σφάλμα φόρτωσης θεωριών'
          );
        }
      });
  }

  setSection(section: string) {
    this.activeSection = section;

    if (section === 'ranking') {
      this.loadRanking();
    }

    if (section === 'calendar') {
      this.loadCalendarEvents();
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
  get filteredTopics(): any[] {
    if (!this.TitleSearchText.trim()) {
      return this.topics;
    }

    const search = this.TitleSearchText.toLowerCase().trim();

    return this.topics.filter(topic =>
      (topic.title ?? '').toLowerCase().includes(search)
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
