import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mainpage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mainpage.component.html',
  styleUrl: './mainpage.component.css'
})
export class MainpageComponent {

  user: any;

  isAdmin = false;

  activeSection: string = 'theory';

  showEditModal = false;
  adminEditTab: string = 'theory';

  theoryTitle = '';
  theoryDescription = '';

  topics = [
    {
      title: '',
      content: ''
    }
  ];



  ngOnInit() {
    const data = localStorage.getItem('currentUser');

    if (data) {
      this.user = JSON.parse(data);
      this.isAdmin = this.user.roleId === 99;
    }
  }
  formatText(command: string) {
    document.execCommand(command, false);
  }

  addTopic() {
    this.topics.push({
      title: '',
      content: ''
    });
  }

  removeTopic(index: number) {
    this.topics.splice(index, 1);
  }

  updateTopicContent(event: any, index: number) {
    this.topics[index].content = event.target.innerHTML;
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

  saveTheory() {
    console.log('Theory title:', this.theoryTitle);

    this.closeEditModal();
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
