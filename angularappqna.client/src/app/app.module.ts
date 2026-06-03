import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { NotificationComponent } from './notifications/notification.component';
import { QuizPageComponent } from './quiz-page/quiz-page.component';

@NgModule({
  declarations: [
    AppComponent,
    QuizPageComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    HttpClientModule,
    AppRoutingModule,
    NotificationComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
