import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-mainpage',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule],
  templateUrl: './mainpage.component.html',
  styleUrl: './mainpage.component.css'
})
export class MainpageComponent {

  constructor(private http: HttpClient,
    private notificationService: NotificationService) { }

  user: any;
  isAdmin = false;

  activeSection: string = 'theory';
  showEditModal = false;
  adminEditTab: string = 'theory';
  adminPreviewMode = false;
  thematologiaTitle = '';
  thematologies: any[] = [];
  selectedThematologia: any = null;
  selectedTheories: any[] = [];
  editingThematologiaId: number | null = null;
  editingThematologiaTitle = '';
  editingFromDate = '';
  editingToDate = '';
  newTheoryHeader = '';
  newTheoryDetails = '';
  editingTheoryId: number | null = null;
  editingTheoryDetId: number | null = null;
  editingTheoryHeader = '';
  editingTheoryDetails = '';
  openedPreviewThematologiaId: number | null = null;
  previewTheories: any[] = [];
  topics: any[] = [];

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
        }
      });
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

    console.log('Selected theories:', this.selectedTheories);

    console.log('Next DetId:', this.getNextDetId());

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

  toggleAdminPreview() {
    this.adminPreviewMode = !this.adminPreviewMode;

    if (this.adminPreviewMode && this.activeSection !== 'theory' && this.activeSection !== 'quiz') {
      this.activeSection = 'theory';
    }
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

  openEditModal() {
    this.showEditModal = true;
    this.adminEditTab = 'theory';
  }

  closeEditModal() {
    this.showEditModal = false;
  }

  setAdminEditTab(tab: string) {
    this.adminEditTab = tab;
  }

  getStoreName(storeId: number): string {
    switch (storeId) {
      case 1:
        return 'Logistics';
      case 2:
        return 'Office';
      case 3:
        return 'Store';
      default:
        return 'Άγνωστο κατάστημα';
    }
  }
}
