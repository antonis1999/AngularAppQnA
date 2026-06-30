import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css']
})
export class NotificationComponent {
  timeoutId: any;
  remainingTime = 1600;
  startTime = 0;

  constructor(public notificationService: NotificationService) {
    effect(() => {
      const notification = this.notificationService.notification();

      if (notification) {
        this.remainingTime = 1600;
        this.startTimer();
      }
    });
  }

  startTimer() {
    clearTimeout(this.timeoutId);

    this.startTime = Date.now();

    this.timeoutId = setTimeout(() => {
      this.closeNotification();
    }, this.remainingTime);
  }

  pauseTimer() {
    clearTimeout(this.timeoutId);

    const elapsed = Date.now() - this.startTime;
    this.remainingTime = Math.max(0, this.remainingTime - elapsed);

    this.timeoutId = null;
  }

  resumeTimer() {
    if (this.remainingTime <= 0) {
      this.closeNotification();
      return;
    }

    this.startTimer();
  }

  closeNotification() {
    clearTimeout(this.timeoutId);
    this.notificationService.clear();
  }
}
