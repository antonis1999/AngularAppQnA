
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, Observable, of, switchMap, map, catchError } from 'rxjs';

interface NewsItem {
  Id: number;
  NewsHeader: string;
  NewsDetail: string;
  PhotoData?: string | null;
  PhotoName?: string | null;
  Kategoryid?: number | string | null;
  insertdate?: string | null;
  LinkUrl?: string | null;
  Source: 'Masoutis' | 'MasPortal';
}

interface MasPortalNewsItem {
  Id: number;
  NewsHeader: string;
  NewsHeaderEn?: string | null;
  Kategoryid?: string | null;
  Image?: string | null;
  Image1?: string | null;
  insertdate?: string | null;
}

interface MasPortalNewsResponse {
  Items: MasPortalNewsItem[];
  TotalCount: number;
  Page: number;
  PageSize: number;
  MaxPages: number;
}

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './news.component.html',
  styleUrl: './news.component.css'
})
export class NewsComponent implements OnInit, OnDestroy {

  news: NewsItem[] = [];

  loading = false;
  error = '';

  searchText = '';
  selectedSource = 'all';
  selectedCategory = 'all';

  currentPage = 1;
  readonly pageSize = 6;

  selectedNews: NewsItem | null = null;

  sliderNews: NewsItem[] = [];
  activeSlideIndex = 0;

  private sliderInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadNews();
  }

  ngOnDestroy(): void {
    this.stopSlider();
  }

  loadNews(): void {
    this.loading = true;
    this.error = '';

    this.stopSlider();

    forkJoin({
      masoutis: this.http.get<NewsItem[]>('api/News/GetAllNews')
        .pipe(
          catchError(err => {
            console.error('Masoutis news error:', err);
            return of([] as NewsItem[]);
          })
        ),

      masPortal: this.getAllMasPortalNews()
        .pipe(
          catchError(err => {
            console.error('MasPortal news error:', err);
            return of([] as NewsItem[]);
          })
        )
    }).subscribe({
      next: result => {

        const masoutisNews: NewsItem[] = result.masoutis.map(item => ({
          ...item,
          Source: 'Masoutis' as const
        }));

        this.news = [
          ...masoutisNews,
          ...result.masPortal
        ].sort((a, b) =>
          this.timestamp(b.insertdate) - this.timestamp(a.insertdate)
        );

        this.sliderNews = this.news.slice(0, 6);

        this.activeSlideIndex = 0;
        this.currentPage = 1;

        this.loading = false;

        this.startSlider();

        if (!this.news.length) {
          this.error = 'Δεν ήταν δυνατή η φόρτωση των νέων.';
        }
      },

      error: err => {
        console.error('News loading error:', err);

        this.error = 'Δεν ήταν δυνατή η φόρτωση των νέων.';
        this.loading = false;
      }
    });
  }

  private getAllMasPortalNews(): Observable<NewsItem[]> {

    const pageSize = 50;

    return this.http.get<MasPortalNewsResponse>(
      'api/News/GetMasPortalNews',
      {
        params: {
          page: 1,
          pageSize
        }
      }
    ).pipe(
      switchMap(firstPage => {

        const totalPages = firstPage.MaxPages || 1;

        if (totalPages <= 1) {
          return of(firstPage.Items ?? []);
        }

        const requests: Observable<MasPortalNewsResponse>[] = [];

        for (let page = 2; page <= totalPages; page++) {
          requests.push(
            this.http.get<MasPortalNewsResponse>(
              'api/News/GetMasPortalNews',
              {
                params: {
                  page,
                  pageSize
                }
              }
            )
          );
        }

        return forkJoin(requests).pipe(
          map(pages => [
            ...(firstPage.Items ?? []),
            ...pages.flatMap(page => page.Items ?? [])
          ])
        );
      }),

      map(items => items.map(item => ({
        Id: item.Id,
        NewsHeader: item.NewsHeader ?? '',
        NewsDetail: '',
        PhotoData: this.masPortalImage(item),
        PhotoName: null,
        Kategoryid: item.Kategoryid ?? 'MasPortal',
        insertdate: item.insertdate,
        LinkUrl: null,
        Source: 'MasPortal' as const
      })))
    );
  }

  private masPortalImage(item: MasPortalNewsItem): string | null {

    const image1 = item.Image1?.trim();
    const image = item.Image?.trim();

    if (image1 && !image1.includes('news_nofoto.jpg')) {
      return image1;
    }

    if (image && !image.includes('news_nofoto.jpg')) {
      return image;
    }

    return image1 || image || null;
  }

  private startSlider(): void {
    this.stopSlider();

    if (this.sliderNews.length <= 1) {
      return;
    }

    this.sliderInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  private stopSlider(): void {
    if (this.sliderInterval !== null) {
      clearInterval(this.sliderInterval);
      this.sliderInterval = null;
    }
  }

  pauseSlider(): void {
    this.stopSlider();
  }

  resumeSlider(): void {
    this.startSlider();
  }

  nextSlide(): void {
    if (!this.sliderNews.length) {
      return;
    }

    this.activeSlideIndex =
      (this.activeSlideIndex + 1) % this.sliderNews.length;
  }

  previousSlide(): void {
    if (!this.sliderNews.length) {
      return;
    }

    this.activeSlideIndex =
      (this.activeSlideIndex - 1 + this.sliderNews.length)
      % this.sliderNews.length;
  }

  goToSlide(index: number): void {
    if (index < 0 || index >= this.sliderNews.length) {
      return;
    }

    this.activeSlideIndex = index;
  }

  private timestamp(date?: string | null): number {
    if (!date) {
      return 0;
    }

    const time = new Date(date).getTime();

    return Number.isFinite(time) ? time : 0;
  }

  formatDate(date?: string | null): string {
    if (!date || !this.timestamp(date)) {
      return '';
    }

    return new Date(date).toLocaleDateString('el-GR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  get categories(): number[] {
    return [
      ...new Set(
        this.news
          .filter(item => item.Source === 'Masoutis')
          .map(item => item.Kategoryid)
          .filter((id): id is number => typeof id === 'number')
      )
    ].sort((a, b) => a - b);
  }

  get filteredNews(): NewsItem[] {

    const search = this.searchText
      .trim()
      .toLocaleLowerCase('el-GR');

    return this.news.filter(item => {

      const matchesSource =
        this.selectedSource === 'all' ||
        item.Source === this.selectedSource;

      const matchesCategory =
        this.selectedCategory === 'all' ||
        String(item.Kategoryid) === this.selectedCategory;

      const matchesText =
        !search ||
        `${item.NewsHeader ?? ''} ${this.plainText(item.NewsDetail ?? '')}`
          .toLocaleLowerCase('el-GR')
          .includes(search);

      return matchesSource && matchesCategory && matchesText;
    });
  }

  updateFilters(): void {
    this.currentPage = 1;
  }

  get totalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.filteredNews.length / this.pageSize)
    );
  }

  get pagedNews(): NewsItem[] {
    const start = (this.currentPage - 1) * this.pageSize;

    return this.filteredNews.slice(
      start,
      start + this.pageSize
    );
  }

  get regularNews(): NewsItem[] {
    return this.pagedNews;
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
  }

  sourceLabel(item: NewsItem): string {
    return item.Source === 'MasPortal'
      ? 'MasPortal'
      : 'Masoutis.gr';
  }

  openNews(item: NewsItem): void {
    this.router.navigate(
      ['/news', item.Source, item.Id],
      {
        state: { fromSection: 'news' }
      }
    );
  }

  closeNews(): void {
    this.selectedNews = null;
    this.resumeSlider();
  }

  plainText(html?: string | null): string {
    return (html ?? '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  summary(item: NewsItem, length = 150): string {
    const text = this.plainText(item.NewsDetail);

    return text.length > length
      ? text.slice(0, length).trimEnd() + '…'
      : text;
  }

  imageUrl(item: NewsItem): string | null {

    const value = item.PhotoData?.trim();

    if (!value) {
      return null;
    }

    if (value.startsWith('data:image/')) {
      return value;
    }

    if (/^https:\/\//i.test(value)) {
      return value;
    }

    if (/^[A-Za-z0-9+/=\s]+$/.test(value)) {

      const type =
        item.PhotoName?.toLowerCase().endsWith('.png')
          ? 'image/png'
          : item.PhotoName?.toLowerCase().endsWith('.webp')
            ? 'image/webp'
            : 'image/jpeg';

      return `data:${type};base64,${value.replace(/\s/g, '')}`;
    }

    return null;
  }

  safeLink(item: NewsItem): string | null {

    const value = item.LinkUrl?.trim();

    if (!value) {
      return null;
    }

    try {
      const url = new URL(
        value,
        'https://www.masoutis.gr'
      );

      return ['https:', 'http:'].includes(url.protocol)
        ? url.href
        : null;

    } catch {
      return null;
    }
  }
}
