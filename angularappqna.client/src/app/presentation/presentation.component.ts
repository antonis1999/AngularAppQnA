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

  selectedImageUrl: string | null = null;

  private timerInterval:
    ReturnType<typeof setInterval> | null = null;

  private playingVideos =
    new Set<HTMLVideoElement>();

  private readonly onVideoPlay =
    (event: Event): void => {
      const video =
        event.target as HTMLVideoElement;

      if (!this.isPresentationVideo(video)) {
        return;
      }

      this.playingVideos.add(video);
    };

  private readonly onVideoPause =
    (event: Event): void => {
      const video =
        event.target as HTMLVideoElement;

      if (!this.isPresentationVideo(video)) {
        return;
      }

      this.playingVideos.delete(video);
    };

  private readonly onVideoEnded =
    (event: Event): void => {
      const video =
        event.target as HTMLVideoElement;

      if (!this.isPresentationVideo(video)) {
        return;
      }

      this.playingVideos.delete(video);
    };

  constructor(
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadThematologies();

    document.addEventListener(
      'play',
      this.onVideoPlay,
      true
    );

    document.addEventListener(
      'pause',
      this.onVideoPause,
      true
    );

    document.addEventListener(
      'ended',
      this.onVideoEnded,
      true
    );
  }

  ngOnDestroy(): void {
    this.clearSlideTimer();
    this.stopCurrentVideos();

    document.removeEventListener(
      'play',
      this.onVideoPlay,
      true
    );

    document.removeEventListener(
      'pause',
      this.onVideoPause,
      true
    );

    document.removeEventListener(
      'ended',
      this.onVideoEnded,
      true
    );
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
      console.warn(
        'Δεν έχει επιλεγεί θεματολογία.'
      );
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
          this.selectedImageUrl = null;

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
    this.playingVideos.clear();

    this.timerInterval = setInterval(
      () => {
        if (
          this.isTimerPaused ||
          this.playingVideos.size > 0
        ) {
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

  private isPresentationVideo(
    video: HTMLVideoElement
  ): boolean {
    const viewer =
      this.presentationViewer
        ?.nativeElement;

    return !!viewer &&
      viewer.contains(video);
  }

  private stopCurrentVideos(): void {
    const viewer =
      this.presentationViewer
        ?.nativeElement;

    if (!viewer) {
      this.playingVideos.clear();
      return;
    }

    const videos =
      viewer.querySelectorAll<HTMLVideoElement>(
        'video'
      );

    videos.forEach(video => {
      if (!video.paused) {
        video.pause();
      }
    });

    this.playingVideos.clear();
  }

  onTheoryContentClick(
    event: MouseEvent
  ): void {
    const target =
      event.target as HTMLElement;

    if (
      target.tagName.toLowerCase() !== 'img'
    ) {
      return;
    }

    const image =
      target as HTMLImageElement;

    if (!image.src) {
      return;
    }

    this.openImageModal(image.src);
  }

  openImageModal(
    imageUrl: string
  ): void {
    this.selectedImageUrl = imageUrl;
    this.isTimerPaused = true;
  }

  closeImageModal(): void {
    this.selectedImageUrl = null;
  }

  nextSlide(): void {
    this.closeImageModal();

    if (
      this.currentSlideIndex >=
      this.totalSlides - 1
    ) {
      return;
    }

    this.stopCurrentVideos();

    this.currentSlideIndex++;
    this.resetSlideTimer();

    this.isTimerPaused =
      this.currentSlideIndex ===
      this.totalSlides - 1;
  }

  previousSlide(): void {
    this.closeImageModal();

    if (this.currentSlideIndex <= 0) {
      return;
    }

    this.stopCurrentVideos();

    this.currentSlideIndex--;
    this.isTimerPaused = false;
    this.resetSlideTimer();
  }

  goToSlide(index: number): void {
    this.closeImageModal();

    if (
      index < 0 ||
      index >= this.totalSlides
    ) {
      return;
    }

    this.stopCurrentVideos();

    this.currentSlideIndex = index;

    this.isTimerPaused =
      index === this.totalSlides - 1;

    this.resetSlideTimer();
  }

  restartPresentation(): void {
    this.closeImageModal();
    this.stopCurrentVideos();

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
    this.closeImageModal();
    this.stopCurrentVideos();
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

    this.playingVideos.clear();
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

    if (this.selectedImageUrl) {
      if (event.key === 'Escape') {
        this.closeImageModal();
      }

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

