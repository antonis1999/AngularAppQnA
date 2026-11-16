import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';


@Component({
  selector: 'app-news-details',
  standalone: false,
  templateUrl: './news-details.component.html',
  styleUrl: './news-details.component.css'
})
export class NewsDetailsComponent implements OnInit {

  news: any = null;

  source: string = '';
  newsId: number = 0;

  loading: boolean = true;
  error: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private sanitizer: DomSanitizer
   
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {

      this.source = params.get('source') ?? '';
      this.newsId = Number(params.get('id'));

      this.loadNews();
    });
  }

  isYouTubeVideo(url: string): boolean {
    try {
      const parsed = new URL(url);
      return [
        'youtube.com',
        'www.youtube.com',
        'youtube-nocookie.com',
        'www.youtube-nocookie.com',
        'youtu.be',
        'www.youtu.be'
      ].includes(parsed.hostname.toLowerCase());
    } catch {
      return false;
    }
  }

  getYouTubeEmbedUrl(url: string): SafeResourceUrl | null {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      if (!this.isYouTubeVideo(url)) {
        return null;
      }

      let videoId = '';

      if (hostname === 'youtu.be' || hostname === 'www.youtu.be') {
        videoId = parsed.pathname.split('/')[1] ?? '';
      } else if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v') ?? '';
      } else if (parsed.pathname.startsWith('/embed/') ||
        parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/')[2] ?? '';
      }

      if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return null;
      }

      return this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube-nocookie.com/embed/${videoId}`
      );
    } catch {
      return null;
    }
  }

  loadNews(): void {

    this.loading = true;
    this.error = '';
    this.news = null;

    if (!Number.isInteger(this.newsId) || this.newsId <= 0) {
      this.error = 'Μη έγκυρο ID είδησης.';
      this.loading = false;
      return;
    }

    let url = '';

    if (this.source.toLowerCase() === 'masoutis') {
      url = `/api/News/GetItemNews?id=${this.newsId}`;
    }
    else if (this.source.toLowerCase() === 'masportal') {
      url = `/api/News/GetMasPortalNewsById?id=${this.newsId}`;
    }
    else {
      this.error = 'Μη έγκυρη πηγή είδησης.';
      this.loading = false;
      return;
    }

    this.http.get<any>(url).subscribe({
      next: (response) => {

        if (this.source.toLowerCase() === 'masportal') {
          this.news = response.news?.[0] ?? null;

          if (this.news) {
            this.news.NewsDetails = response.newsDetails ?? [];
          }
        }
        else {
          this.news = response;
        }

        if (!this.news) {
          this.error = 'Η είδηση δεν βρέθηκε.';
        }

        this.loading = false;
      },
      error: () => {
        this.error = 'Αποτυχία φόρτωσης της είδησης.';
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/mainpage'], {
      queryParams: { section: 'news' }
    });
  }
}
