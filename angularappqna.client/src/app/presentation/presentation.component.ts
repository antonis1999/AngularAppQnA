import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-presentation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './presentation.component.html',
  styleUrl: './presentation.component.css'
})
export class PresentationComponent
  implements OnInit, OnDestroy {

  @ViewChild('presentationViewer')
  presentationViewer?: ElementRef<HTMLElement>;

  thematologies: any[] = [];
  theories: any[] = [];

  selectedThematologiaId: number = 0;
  selectedThematologiaTitle: string = '';

  isPresentationStarted: boolean = false;
  currentSlideIndex: number = 0;

  slideDuration: number = 30;
  remainingSeconds: number = 30;
  isTimerPaused: boolean = false;

  private timerInterval:
    ReturnType<typeof setInterval> | null = null;

  constructor(
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadThematologies();
  }

  ngOnDestroy(): void {
    this.clearSlideTimer();
  }

  get totalSlides(): number {
    return this.theories.length + 2;
  }

  get slideItems(): number[] {
    return Array.from(
      { length: this.totalSlides },
      (_, index) => index
    );
  }

  get presentationProgress(): number {
    if (this.totalSlides === 0) {
      return 0;
    }

    return (
      ((this.currentSlideIndex + 1) /
        this.totalSlides) *
      100
    );
  }

  get timerCircleOffset(): number {
    const circumference = 106.81;

    if (this.slideDuration <= 0) {
      return circumference;
    }

    const progress =
      this.remainingSeconds /
      this.slideDuration;

    return circumference * (1 - progress);
  }

  loadThematologies(): void {
    this.http
      .get<any[]>(
        '/api/Service/GetThematologies'
      )
      .subscribe({
        next: result => {
          this.thematologies = result ?? [];
        },
        error: error => {
          console.error(
            'Αποτυχία φόρτωσης θεματολογιών:',
            error
          );
        }
      });
  }

  startPresentation(): void {
    if (!this.selectedThematologiaId) {
      console.warn('Δεν έχει επιλεγεί θεματολογία.');
      return;
    }

    const selectedThematologia =
      this.thematologies.find(
        item =>
          Number(item.Id) ===
          Number(this.selectedThematologiaId)
      );

    this.selectedThematologiaTitle =
      selectedThematologia?.Title ?? '';

    console.log(
      'Έναρξη παρουσίασης:',
      this.selectedThematologiaId,
      this.selectedThematologiaTitle
    );

    this.loadTheories();
  }

  loadTheories(): void {
    this.http
      .get<any[]>(
        `/api/Service/GetTheoriaByThematologia?thematologiaId=${this.selectedThematologiaId}`
      )
      .subscribe({
        next: result => {
          this.theories = result ?? [];
          this.currentSlideIndex = 0;
          this.isPresentationStarted = true;

          setTimeout(() => {
            this.startSlideTimer();
          }, 0);
        },
        error: error => {
          console.error(
            'Αποτυχία φόρτωσης θεωριών:',
            error
          );
        }
      });
  }
  startSlideTimer(): void {
    this.clearSlideTimer();

    this.remainingSeconds =
      this.slideDuration;

    this.isTimerPaused = false;

    this.timerInterval = setInterval(
      () => {
        if (this.isTimerPaused) {
          return;
        }

        this.remainingSeconds--;

        if (this.remainingSeconds <= 0) {
          if (
            this.currentSlideIndex <
            this.totalSlides - 1
          ) {
            this.nextSlide();
          } else {
            this.clearSlideTimer();
          }
        }
      },
      1000
    );
  }

  toggleTimer(): void {
    this.isTimerPaused =
      !this.isTimerPaused;
  }

  private resetSlideTimer(): void {
    this.remainingSeconds =
      this.slideDuration;
  }

  private clearSlideTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  nextSlide(): void {
    if (
      this.currentSlideIndex >=
      this.totalSlides - 1
    ) {
      return;
    }

    this.currentSlideIndex++;
    this.resetSlideTimer();

    if (
      this.currentSlideIndex ===
      this.totalSlides - 1
    ) {
      this.isTimerPaused = true;
    }
  }

  previousSlide(): void {
    if (this.currentSlideIndex <= 0) {
      return;
    }

    this.currentSlideIndex--;
    this.isTimerPaused = false;
    this.resetSlideTimer();
  }

  goToSlide(index: number): void {
    if (
      index < 0 ||
      index >= this.totalSlides
    ) {
      return;
    }

    this.currentSlideIndex = index;

    this.isTimerPaused =
      index === this.totalSlides - 1;

    this.resetSlideTimer();
  }

  restartPresentation(): void {
    this.currentSlideIndex = 0;
    this.startSlideTimer();
  }

  async enterFullscreen(): Promise<void> {
    const element =
      this.presentationViewer
        ?.nativeElement;

    if (
      !element ||
      document.fullscreenElement
    ) {
      return;
    }

    try {
      await element.requestFullscreen();
    } catch (error) {
      console.warn(
        'Δεν ήταν δυνατή η αυτόματη πλήρης οθόνη:',
        error
      );
    }
  }

  async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      const element =
        this.presentationViewer
          ?.nativeElement;

      if (element) {
        await element.requestFullscreen();
      }
    } catch (error) {
      console.error(
        'Αποτυχία αλλαγής πλήρους οθόνης:',
        error
      );
    }
  }

  async closePresentation(): Promise<void> {
    this.clearSlideTimer();

    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        console.warn(
          'Αποτυχία εξόδου από πλήρη οθόνη:',
          error
        );
      }
    }

    this.isPresentationStarted = false;
    this.currentSlideIndex = 0;
    this.remainingSeconds =
      this.slideDuration;
    this.isTimerPaused = false;
  }

  @HostListener(
    'window:keydown',
    ['$event']
  )
  handleKeyboard(
    event: KeyboardEvent
  ): void {
    if (!this.isPresentationStarted) {
      return;
    }

    switch (event.key) {
      case 'ArrowRight':
        this.nextSlide();
        break;

      case 'ArrowLeft':
        this.previousSlide();
        break;

      case 'Escape':
        this.isTimerPaused = true;
        break;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      this.toggleTimer();
    }
  }

  @HostListener(
    'document:fullscreenchange'
  )
  handleFullscreenChange(): void {
    if (
      this.isPresentationStarted &&
      !document.fullscreenElement
    ) {
      this.isTimerPaused = true;
    }
  }
}
