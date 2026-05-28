import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'warning' | 'error';
export type NotificationPosition = 'top-right' | 'side-right';

export interface AppNotification {
  type: NotificationType;
  message: string;
  position: NotificationPosition;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  notification = signal<AppNotification | null>(null);

  show(
    type: NotificationType,
    message: string,
    position: NotificationPosition = 'top-right'
  ) {
    this.notification.set({ type, message, position });

  }

  success(message: string) {
    this.show('success', message);
  }

  warning(message: string) {
    this.show('warning', message);
  }

  error(message: string) {
    this.show('error', message);
  }
  clear() {
    this.notification.set(null);
  }
}
