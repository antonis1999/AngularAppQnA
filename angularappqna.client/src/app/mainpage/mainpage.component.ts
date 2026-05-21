import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-mainpage',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule],
  templateUrl: './mainpage.component.html',
  styleUrl: './mainpage.component.css'
})
export class MainpageComponent {

  constructor(private http: HttpClient) { }

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

  newTheoryHeader = '';
  newTheoryDetails = '';

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
      alert('Συμπλήρωσε Header Θεματολογίας');
      return;
    }

    if (this.selectedThematologia) {
      this.updateThematologia();
      return;
    }

    const body = {
      Title: this.thematologiaTitle,
      FromDate: new Date(),
      ToDate: new Date(2099, 11, 31)
    };

    this.http.post<any>('api/Service/AddThematologia', body)
      .subscribe({
        next: (res) => {
          if (res.isSuccess || res.IsSuccess) {
            this.selectedThematologia = null;
            this.selectedTheories = [];
            this.thematologiaTitle = '';
            this.newTheoryHeader = '';
            this.newTheoryDetails = '';
            this.loadThematologies();
          } else {
            alert(res.message || res.Message);
          }
        },
        error: (err) => {
          console.error('Save thematologia error:', err);
          alert('Σφάλμα αποθήκευσης θεματολογίας');
        }
      });
  }

  startEditThematologia(item: any) {
    const currentId = this.selectedThematologia?.id ?? this.selectedThematologia?.Id;
    const itemId = item.id ?? item.Id;

    if (currentId === itemId) {
      this.selectedThematologia = null;
      this.selectedTheories = [];
      this.thematologiaTitle = '';
      this.newTheoryHeader = '';
      this.newTheoryDetails = '';
      return;
    }

    this.selectedThematologia = item;
    this.thematologiaTitle = item.title ?? item.Title;
    this.selectThematologia(item);
  }

  updateThematologia() {
    const body = { 
      Id: this.selectedThematologia.id ?? this.selectedThematologia.Id,
      Title: this.thematologiaTitle,
      FromDate: this.selectedThematologia.fromDate ?? this.selectedThematologia.FromDate ?? new Date(),
      ToDate: this.selectedThematologia.toDate ?? this.selectedThematologia.ToDate ?? new Date(2099, 11, 31)
    };

    this.http.post<any>('api/Service/UpdateThematologia', body)
      .subscribe({
        next: (res) => {
          if (res.isSuccess || res.IsSuccess) {
            this.thematologiaTitle = '';
            this.selectedThematologia = null;
            this.loadThematologies();
          } else {
            alert(res.message || res.Message);
          }
        },
        error: (err) => {
          console.error('Update thematologia error:', err);
          alert('Σφάλμα ενημέρωσης θεματολογίας');
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
        },
        error: (err) => {
          console.error('Delete thematologia error:', err);
          alert('Σφάλμα διαγραφής θεματολογίας');
        }
      });
  }

  selectThematologia(item: any) {
    this.selectedThematologia = item;

    const id = item.id ?? item.Id;

    this.http.get<any[]>(`api/Service/GetTheoriesByThematologia/${id}`)
      .subscribe({
        next: (res) => {
          this.selectedTheories = res;
        },
        error: (err) => {
          console.error('Load theories error:', err);
        }
      });
  }

  addTheoryToSelected() {
    if (!this.selectedThematologia) {
      alert('Διάλεξε πρώτα θεματολογία');
      return;
    }

    if (!this.newTheoryHeader.trim()) {
      alert('Συμπλήρωσε τίτλο θεωρίας');
      return;
    }

    const body = {
      DetId: this.selectedThematologia.id ?? this.selectedThematologia.Id,
      Header: this.newTheoryHeader,
      Details: this.newTheoryDetails
    };

    this.http.post<any>('api/Service/AddTheory', body)
      .subscribe({
        next: (res) => {
          if (res.isSuccess || res.IsSuccess) {
            this.newTheoryHeader = '';
            this.newTheoryDetails = '';
            this.selectThematologia(this.selectedThematologia);
          } else {
            alert(res.message || res.Message);
          }
        },
        error: (err) => {
          console.error('Add theory error:', err);
          alert('Σφάλμα αποθήκευσης θεωρίας');
        }
      });
  }

  deleteTheory(theory: any) {
    const id = theory.id ?? theory.Id;

    if (!confirm('Να διαγραφεί αυτή η θεωρία;')) {
      return;
    }

    this.http.delete<any>(`api/Service/DeleteTheory/${id}`)
      .subscribe({
        next: () => {
          this.selectThematologia(this.selectedThematologia);
        },
        error: (err) => {
          console.error('Delete theory error:', err);
          alert('Σφάλμα διαγραφής θεωρίας');
        }
      });
  }

  toggleAdminPreview() {
    this.adminPreviewMode = !this.adminPreviewMode;

    if (this.adminPreviewMode && this.activeSection !== 'theory' && this.activeSection !== 'quiz') {
      this.activeSection = 'theory';
    }
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
