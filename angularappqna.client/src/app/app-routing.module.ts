import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { MainpageComponent } from './mainpage/mainpage.component';
import { EditPageComponent } from './edit-page/edit-page.component';
import { QuizPageComponent } from './quiz-page/quiz-page.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'mainpage', component: MainpageComponent },
  { path: 'edit/:id', component: EditPageComponent },
  { path: 'quiz-page/:id', component: QuizPageComponent},
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
