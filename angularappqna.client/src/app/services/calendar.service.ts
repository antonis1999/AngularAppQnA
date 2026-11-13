import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CalendarEvent } from '../interfaces/models';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private apiUrl = 'api/calendar';

  constructor(private http: HttpClient) { }

  getEvents(year: number): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(`${this.apiUrl}/GetEvents?year=${year}`);
  }

  addEvent(event: {
    title: string;
    description: string | null;
    eventDate: string;
    startTime: string | null;
    endTime: string | null;
  }): Observable<CalendarEvent> {
    return this.http.post<CalendarEvent>(`${this.apiUrl}/AddEvent`, event);
  }

  deleteEvent(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/DeleteEvent`, id);
  }
}
