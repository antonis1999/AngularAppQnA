import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../services/notification.service';
import { LoaderService } from '../services/loader.service';

import {
  ApiResponse,
  Thematologia,
  QuizTheory,
  QuizQuestionView,
  QuizOption,
  ExistingQuizQuestion,
  ExistingQuizAnswer,
  UpdateQuizQuestionRequest
} from '../interfaces/models';

import Quill from 'quill';

const BlockEmbed: any = Quill.import('blots/block/embed');
const BaseImageBlot: any = Quill.import('formats/image');
class ResizableImageBlot extends BaseImageBlot {
  static blotName = 'image';

  static create(value: string): HTMLElement {
    const node = super.create(value) as HTMLElement;
    node.style.display = 'inline-block';
    node.style.verticalAlign = 'top';
    node.style.maxWidth = '100%';
    node.style.height = 'auto';
    return node;
  }

  static formats(node: HTMLElement): Record<string, string> {
    const formats = super.formats(node) ?? {};
    const width = node.style.width || node.getAttribute('width');

    if (width) {
      formats['width'] = width.replace('px', '');
    }

    return formats;
  }

  format(name: string, value: unknown): void {
    const node = this['domNode'] as HTMLElement;

    if (name === 'width') {
      const width = Number(value);

      if (Number.isFinite(width) && width > 0) {
        const roundedWidth = Math.round(width);

        node.style.display = 'inline-block';
        node.style.verticalAlign = 'top';
        node.style.maxWidth = '100%';
        node.style.width = `${roundedWidth}px`;
        node.style.height = 'auto';
        node.setAttribute('width', String(roundedWidth));
      } else {
        node.style.removeProperty('width');
        node.removeAttribute('width');
      }

      return;
    }

    super.format(name, value);
  }
}

class CustomVideoBlot extends BlockEmbed {
  static blotName = 'customVideo';
  static tagName = 'video';

  static create(value: string): HTMLElement {
    const node = super.create(value) as HTMLElement;
    node.setAttribute('src', value);
    node.setAttribute('controls', '');
    node.setAttribute('preload', 'metadata');
    return node;
  }

  static value(node: HTMLElement): string | null {
    return node.getAttribute('src');
  }
}

class ImageResizeManager {
  private overlay: HTMLDivElement | null = null;
  private activeImage: HTMLImageElement | null = null;

  private readonly onDocumentMouseDown = (event: MouseEvent): void => {
    if (!this.overlay) return;

    const target = event.target as Node;
    if (this.overlay.contains(target)) return;
    if (this.activeImage?.contains(target)) return;

    this.remove();
  };

  constructor() {
    document.addEventListener(
      'mousedown',
      this.onDocumentMouseDown
    );
  }

  show(editor: Quill, image: HTMLImageElement): void {
    this.remove();
    this.activeImage = image;

    const rect = image.getBoundingClientRect();
    const overlay = document.createElement('div');

    overlay.className = 'image-resize-overlay';
    overlay.style.cssText =
      `left:${rect.left + window.scrollX}px;top:${rect.top + window.scrollY}px;width:${rect.width}px;height:${rect.height}px;`;

    ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(corner => {
      const handle = document.createElement('div');
      handle.className = `image-resize-handle ${corner}`;
      handle.addEventListener('mousedown', event => {
        event.preventDefault();
        event.stopPropagation();
        this.start(editor, event, image, corner);
      });
      overlay.appendChild(handle);
    });

    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  remove(): void {
    this.overlay?.remove();
    this.overlay = null;
    this.activeImage = null;
  }

  destroy(): void {
    document.removeEventListener('mousedown', this.onDocumentMouseDown);
    this.remove();
  }

  private start(
    editor: Quill,
    startEvent: MouseEvent,
    image: HTMLImageElement,
    corner: string
  ): void {
    const startX = startEvent.clientX;
    const startWidth = image.getBoundingClientRect().width;
    const direction = corner.includes('left') ? -1 : 1;
    let finalWidth = startWidth;

    const onMouseMove = (event: MouseEvent) => {
      const width = startWidth + (event.clientX - startX) * direction;
      finalWidth = Math.round(Math.max(120, Math.min(width, editor.root.clientWidth)));

      image.style.width = `${finalWidth}px`;
      image.style.height = 'auto';
      this.update(image);
    };

    const onMouseUp = () => {
      document.removeEventListener(
        'mousemove',
        onMouseMove
      );

      document.removeEventListener(
        'mouseup',
        onMouseUp
      );

      const blot: any = Quill.find(image);

      if (blot) {
        image.style.width = `${finalWidth}px`;
        image.style.height = 'auto';
        image.setAttribute(
          'width',
          String(finalWidth)
        );

        blot.format(
          'width',
          finalWidth
        );
      }

      this.remove();
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  private update(image: HTMLImageElement): void {
    if (!this.overlay) return;

    const rect = image.getBoundingClientRect();

    Object.assign(this.overlay.style, {
      left: `${rect.left + window.scrollX}px`,
      top: `${rect.top + window.scrollY}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    });
  }
}

class QuillMediaManager {
  private readonly configuredEditors = new WeakSet<object>();

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService,
    private getThematologiaId: () => number,
    private getTheoryDetId: () => number
  ) { }

  setup(editor: Quill): void {
    if (this.configuredEditors.has(editor as object)) return;
    this.configuredEditors.add(editor as object);

    const clipboard: any = editor.clipboard;

    clipboard.addMatcher(
      'img',
      (node: Node) => {
        const image = node as HTMLImageElement;
        const src = image.getAttribute('src');

        if (!src) {
          return { ops: [] };
        }

        const rawWidth =
          image.style.width ||
          image.getAttribute('width') ||
          '';

        const width = Number(
          rawWidth.replace('px', '').trim()
        );

        if (Number.isFinite(width) && width > 0) {
          return {
            ops: [
              {
                insert: { image: src },
                attributes: {
                  width: String(Math.round(width))
                }
              }
            ]
          };
        }

        return {
          ops: [
            {
              insert: { image: src }
            }
          ]
        };
      }
    );

    clipboard.addMatcher(
      'video',
      (node: Node) => {
        const video = node as HTMLVideoElement;
        const src = video.getAttribute('src');

        if (!src) {
          return { ops: [] };
        }

        return {
          ops: [
            {
              insert: {
                customVideo: src
              }
            }
          ]
        };
      }
    );
  }

  openImagePicker(editor: Quill): void {
    this.pickFile(
      ['image/jpeg', 'image/png', 'image/webp'],
      file => {
        if (!this.validateImage(file)) return;

        const reader = new FileReader();

        reader.onload = () => {
          const range = editor.getSelection(true);

          const index =
            range?.index ??
            Math.max(0, editor.getLength() - 1);

          editor.insertEmbed(
            index,
            'image',
            reader.result as string,
            'user'
          );

          editor.formatText(
            index,
            1,
            'width',
            500,
            'user'
          );

          editor.setSelection(
            index + 1,
            0,
            'silent'
          );
        };

        reader.onerror = () =>
          this.notificationService.error(
            'Δεν ήταν δυνατή η ανάγνωση της εικόνας.'
          );

        reader.readAsDataURL(file);
      }
    );
  }

  openVideoPicker(editor: Quill): void {
    this.pickFile(
      ['video/mp4', 'video/webm', 'video/quicktime'],
      file => {
        const index =
          editor.getSelection(true)?.index ??
          Math.max(0, editor.getLength() - 1);

        const formData = new FormData();
        formData.append('file', file);

        this.http.post<{ videoUrl: string }>(
          `api/Upload/TheoryVideo?thematologiaId=${this.getThematologiaId()}&theoryDetId=${this.getTheoryDetId()}`,
          formData
        ).subscribe({
          next: response => {
            editor.insertEmbed(
              index,
              'customVideo',
              response.videoUrl,
              'user'
            );

            editor.insertText(
              index + 1,
              '',
              'user'
            );

            editor.setSelection(
              index + 2,
              0,
              'silent'
            );

            this.notificationService.success(
              'Το video ανέβηκε επιτυχώς.'
            );
          },
          error: err => {
            console.error(
              'Video upload error:',
              err
            );

            this.notificationService.error(
              'Σφάλμα κατά το ανέβασμα του video.'
            );
          }
        });
      }
    );
  }

  loadHtml(editor: Quill, html: string): void {
    const normalizedHtml = this.normalizeStoredHtml(html);
    const clipboard: any = editor.clipboard;

    let delta: any;

    try {
      delta = clipboard.convert({
        html: normalizedHtml,
        text: ''
      });
    } catch {
      delta = clipboard.convert(
        normalizedHtml
      );
    }

    editor.setContents(
      delta,
      'silent'
    );

    editor.setSelection(
      0,
      0,
      'silent'
    );
  }

  getHtml(editor: Quill | null, fallback: string): string {
    if (!editor) {
      return this.normalizeStoredHtml(fallback);
    }

    const clone =
      editor.root.cloneNode(true) as HTMLElement;

    clone
      .querySelectorAll<HTMLImageElement>('img')
      .forEach(image => {
        const rawWidth =
          image.style.width ||
          image.getAttribute('width') ||
          '';

        const width =
          Number(
            rawWidth
              .replace('px', '')
              .trim()
          );

        image.style.display = 'inline-block';
        image.style.verticalAlign = 'top';
        image.style.maxWidth = '100%';
        image.style.height = 'auto';

        if (Number.isFinite(width) && width > 0) {
          const roundedWidth =
            Math.round(width);

          image.style.width =
            `${roundedWidth}px`;

          image.setAttribute(
            'width',
            String(roundedWidth)
          );
        }
      });

    return clone.innerHTML;
  }

  private validateImage(file: File): boolean {
    if (
      ![
        'image/jpeg',
        'image/png',
        'image/webp'
      ].includes(file.type)
    ) {
      this.notificationService.warning(
        'Επιτρέπονται μόνο εικόνες JPG, PNG και WebP.'
      );
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.notificationService.warning(
        'Η εικόνα δεν μπορεί να ξεπερνά τα 5 MB.'
      );
      return false;
    }

    return true;
  }

  private pickFile(
    accept: string[],
    onSelect: (file: File) => void
  ): void {
    const input =
      document.createElement('input');

    input.type = 'file';
    input.accept = accept.join(',');
    input.style.display = 'none';

    input.addEventListener(
      'change',
      () => {
        const file =
          input.files?.[0];

        input.remove();

        if (file) {
          onSelect(file);
        }
      },
      { once: true }
    );

    document.body.appendChild(input);
    input.click();
  }

  private normalizeStoredHtml(html: string): string {
    if (!html) return '';

    const wrapper =
      document.createElement('div');

    wrapper.innerHTML = html;

    const nestedEditor =
      wrapper.querySelector(
        '.ql-editor'
      ) as HTMLElement | null;

    if (nestedEditor) {
      wrapper.innerHTML =
        nestedEditor.innerHTML;
    }

    wrapper
      .querySelectorAll(
        '.ql-toolbar, .ql-container'
      )
      .forEach(element => {
        if (
          element.classList.contains(
            'ql-container'
          )
        ) {
          const editor =
            element.querySelector(
              '.ql-editor'
            ) as HTMLElement | null;

          if (editor) {
            element.replaceWith(
              ...Array.from(
                editor.childNodes
              )
            );
          } else {
            element.remove();
          }
        } else {
          element.remove();
        }
      });

    wrapper
      .querySelectorAll(
        '.two-images-layout, .image-layout-popup'
      )
      .forEach(element => {
        const images =
          Array.from(
            element.querySelectorAll<HTMLImageElement>('img')
          );

        if (images.length > 0) {
          element.replaceWith(...images);
        } else {
          element.remove();
        }
      });

    wrapper
      .querySelectorAll(
        '[data-editor-only="true"]'
      )
      .forEach(
        node => node.remove()
      );

    return wrapper.innerHTML;
  }
}



Quill.register(ResizableImageBlot, true);
Quill.register(CustomVideoBlot);

@Component({
  selector: 'app-edit-page',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule],
  templateUrl: './edit-page.component.html',
  styleUrl: './edit-page.component.css'
})
export class EditPageComponent implements OnInit, OnDestroy {

  thematologiaId = 0;
  adminEditTab = 'theory';
  thematologies: Thematologia[] = [];
  selectedThematologia: Thematologia | null = null;

  thematologiaTitle = '';

  editingThematologiaId: number | null = null;
  editingThematologiaTitle = '';
  editingFromDate = '';
  editingToDate = '';
  selectedTheories: QuizTheory[] = [];

  newTheoryHeader = '';
  newTheoryDetails = '';

  editingTheoryId: number | null = null;
  editingTheoryDetId: number | null = null;
  editingTheoryHeader = '';
  editingTheoryDetails = '';
  selectedQuizTheory: QuizTheory | null = null;

  quizQuestions: QuizQuestionView[] = [];
  existingQuestions: ExistingQuizQuestion[] = [];

  quizQuestionCount = 4;
  totalQuizQuestions = 0;
  editingQuestionDifficulty = 1;
  editingQuestion: ExistingQuizQuestion | null = null;
  editingQuestionText = '';
  editingQuestionAnswers: ExistingQuizAnswer[] = [];
  quizDifficultyPercent = 2;
  useQuizDifficulty = false;
  showQuizSuggestionsPopup = false;
  quizSuggestions: any[] = [];
  expandedSuggestionIndex: number | null = null;

  private newTheoryQuill: Quill | null = null;
  private editingTheoryQuill: Quill | null = null;
  private imageResizeManager!: ImageResizeManager;
  private mediaManager!: QuillMediaManager;

  quillModules = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ header: [1, 2, 3, false] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        [{ color: [] }, { background: [] }],
        ['link', 'image', 'video'],
        ['clean']
      ]
    }
  };

  @ViewChild('quizExcelInput')
  quizExcelInput!: ElementRef<HTMLInputElement>;
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private notificationService: NotificationService,
    private loader: LoaderService
  ) {
    this.imageResizeManager = new ImageResizeManager();

    this.mediaManager = new QuillMediaManager(
      this.http,
      this.notificationService,
      () => this.thematologiaId,
      () => this.editingTheoryDetId ?? this.getNextDetId()
    );
  }

  ngOnInit(): void {
    this.thematologiaId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadThematologies();
    this.loadQuizQuestionsCount();
  }

  private setupEditor(editor: Quill): void {
    const toolbar: any =
      editor.getModule('toolbar');

    this.mediaManager.setup(editor);

    toolbar?.addHandler(
      'image',
      () =>
        this.mediaManager.openImagePicker(
          editor
        )
    );

    toolbar?.addHandler(
      'video',
      () =>
        this.mediaManager.openVideoPicker(
          editor
        )
    );

    editor.root.addEventListener(
      'click',
      event => {
        const target =
          event.target as HTMLElement;

        if (target.tagName === 'IMG') {
          this.imageResizeManager.show(
            editor,
            target as HTMLImageElement
          );
          return;
        }

        this.imageResizeManager.remove();
      }
    );
  }

  onNewTheoryEditorCreated(editor: Quill): void {
    this.newTheoryQuill = editor;
    this.setupEditor(editor);
  }

  onEditingTheoryEditorCreated(editor: Quill): void {
    this.editingTheoryQuill = editor;
    this.setupEditor(editor);

    const html =
      this.editingTheoryDetails;

    setTimeout(() => {
      if (
        this.editingTheoryQuill !== editor
      ) {
        return;
      }

      this.mediaManager.loadHtml(
        editor,
        html
      );
    });
  }

  private getTheoryDetailsHtml(
    editor: Quill | null,
    fallback: string
  ): string {
    return this.mediaManager.getHtml(
      editor,
      fallback
    );
  }

  loadThematologies(): void {
    this.http.get<Thematologia[]>('api/Service/GetThematologies')
      .subscribe({
        next: (res) => {
          this.thematologies = res;

          this.selectedThematologia = this.thematologies.find(x =>
            x.Id === this.thematologiaId
          ) ?? null;

          if (this.selectedThematologia) {
            this.quizQuestionCount =
              this.selectedThematologia.QuizQuestionCount ??
              4;

            this.quizDifficultyPercent =
              this.selectedThematologia.QuizDifficultyPercent ??
              2;

            this.startEditThematologia(this.selectedThematologia);
          }
        },
        error: (err) => {
          console.error('Load thematologies error:', err);
          this.notificationService.error('Σφάλμα φόρτωσης θεματολογιών');
        }
      });
  }

  loadQuizQuestionsCount(): void {
    this.http.get<number>(
      `api/Service/GetQuizQuestionsCount/${this.thematologiaId}`
    )
      .subscribe({
        next: (count) => {
          this.totalQuizQuestions = count;
        },
        error: (err) => {
          console.error('Load quiz questions count error:', err);
        }
      });
  }

  loadExistingQuestions(theory: QuizTheory): void {
    this.http.get<ExistingQuizQuestion[]>(
      `api/Service/GetQuestionsByTheoria/${this.thematologiaId}/${theory.DetId}`
    )
      .subscribe({
        next: (res) => {
          this.existingQuestions = res || [];
        },
        error: (err) => {
          console.error('Load existing questions error:', err);
          this.notificationService.error('Σφάλμα φόρτωσης ερωτήσεων');
        }
      });
  }

  setAdminEditTab(tab: string): void {
    this.adminEditTab = tab;
  }

  selectThematologia(item: Thematologia): void {
    this.selectedThematologia = item;

    this.http.get<QuizTheory[]>(
      `api/Service/GetTheoriaByThematologia?thematologiaId=${item.Id}`
    )
      .subscribe({
        next: (res) => {
          this.selectedTheories = res ?? [];
        },
        error: (err) => {
          console.error('Load theories error:', err);
          this.notificationService.error('Σφάλμα φόρτωσης θεωριών');
        }
      });
  }

  saveThematologia(): void {
    if (!this.thematologiaTitle.trim()) {
      this.notificationService.warning('Συμπλήρωσε Header Θεματολογίας');
      return;
    }

    const fromDate = new Date();
    const toDate = new Date();
    toDate.setMonth(toDate.getMonth() + 1);

    const body = {
      Title: this.thematologiaTitle,
      FromDate: fromDate,
      ToDate: toDate
    };

    this.http.post<ApiResponse>('api/Service/AddThematologia', body)
      .subscribe({
        next: (res) => {
          if (res.IsSuccess) {
            this.thematologiaTitle = '';
            this.loadThematologies();
            this.notificationService.success('Η θεματολογία αποθηκεύτηκε επιτυχώς');
          } else {
            this.notificationService.warning(res.Message || 'Κάτι πήγε λάθος');
          }
        },
        error: (err) => {
          console.error('Save thematologia error:', err);
          this.notificationService.error('Σφάλμα αποθήκευσης θεματολογίας');
        }
      });
  }

  startEditThematologia(item: Thematologia): void {
    if (this.editingThematologiaId === item.Id) {
      this.editingThematologiaId = null;
      this.editingThematologiaTitle = '';
      this.editingFromDate = '';
      this.editingToDate = '';
      return;
    }

    this.editingThematologiaId = item.Id;
    this.editingThematologiaTitle = item.Title;
    this.editingFromDate = item.FromDate ? item.FromDate.substring(0, 10) : '';
    this.editingToDate = item.ToDate ? item.ToDate.substring(0, 10) : '';

    this.selectedThematologia = item;
    this.selectThematologia(item);
  }

  updateThematologia(item: Thematologia): void {
    if (!this.editingThematologiaTitle.trim()) {
      this.notificationService.warning('Συμπλήρωσε Header Θεματολογίας');
      return;
    }

    const body = {
      Id: item.Id,
      Title: this.editingThematologiaTitle,
      FromDate: this.editingFromDate ? new Date(this.editingFromDate) : new Date(),
      ToDate: this.editingToDate ? new Date(this.editingToDate) : new Date(2099, 11, 31)
    };

    this.http.post<ApiResponse>('api/Service/UpdateThematologia', body)
      .subscribe({
        next: (res) => {
          if (res.IsSuccess) {
            this.resetThematologiaEdit();
            this.loadThematologies();
            this.notificationService.success('Η θεματολογία ενημερώθηκε επιτυχώς');
          } else {
            this.notificationService.error(res.Message);
          }
        },
        error: (err) => {
          console.error('Update thematologia error:', err);
          this.notificationService.error('Σφάλμα ενημέρωσης θεματολογίας');
        }
      });
  }

  deleteThematologia(
    item: Thematologia,
    event: MouseEvent
  ): void {
    event.preventDefault();
    event.stopPropagation();

    const confirmed = confirm(
      `Να διαγραφεί η θεματολογία "${item.Title}";`
    );

    if (!confirmed) {
      return;
    }

    this.http.post<ApiResponse>(
      `api/Service/DeleteThematologia/${item.Id}`,
      {}
    )
      .subscribe({
        next: response => {
          if (!response.IsSuccess) {
            this.notificationService.error(
              response.Message || 'Η διαγραφή απέτυχε'
            );
            return;
          }

          this.selectedThematologia = null;
          this.selectedTheories = [];
          this.thematologiaTitle = '';

          this.loadThematologies();
          this.notificationService.success(
            'Διαγράφηκε επιτυχώς'
          );
          this.router.navigate(['/mainpage']);
        },
        error: err => {
          console.error(
            'Delete thematologia error:',
            err
          );

          this.notificationService.error(
            'Σφάλμα διαγραφής θεματολογίας'
          );
        }
      });
  }

  private resetThematologiaEdit(): void {
    this.editingThematologiaId = null;
    this.editingThematologiaTitle = '';
    this.editingFromDate = '';
    this.editingToDate = '';
    this.selectedThematologia = null;
    this.selectedTheories = [];
    this.newTheoryHeader = '';
    this.newTheoryDetails = '';
  }

  getNextDetId(): number {
    if (!this.selectedTheories || this.selectedTheories.length === 0) {
      return 1;
    }

    return Math.max(...this.selectedTheories.map(x => x.DetId)) + 1;
  }

  addTheoryToSelected(): void {
    if (!this.selectedThematologia) {
      this.notificationService.warning('Διάλεξε πρώτα θεματολογία');
      return;
    }

    if (!this.newTheoryHeader.trim()) {
      this.notificationService.warning('Συμπλήρωσε τίτλο θεωρίας');
      return;
    }
    const currentDetails =
      this.getTheoryDetailsHtml(
        this.newTheoryQuill,
        this.newTheoryDetails
      );

    const body = {
      Id: this.selectedThematologia.Id,
      DetId: this.getNextDetId(),
      Header: this.newTheoryHeader,
      Details: currentDetails
    };

    this.http.post<ApiResponse>('api/Service/AddTheoria', body)
      .subscribe({
        next: (res) => {
          if (res.IsSuccess) {
            this.newTheoryHeader = '';
            this.newTheoryDetails = '';

            this.selectThematologia(this.selectedThematologia!);
            this.notificationService.success('Η θεωρία αποθηκεύτηκε επιτυχώς');
          } else {
            this.notificationService.error(res.Message);
          }
        },
        error: (err) => {
          console.error('Add theory error:', err);
          this.notificationService.error('Σφάλμα αποθήκευσης θεωρίας');
        }
      });
  }

  startEditTheory(theory: QuizTheory): void {
    if (
      this.editingTheoryId === theory.Id &&
      this.editingTheoryDetId === theory.DetId
    ) {
      this.resetTheoryEdit();
      return;
    }

    this.editingTheoryQuill = null;

    this.editingTheoryId = theory.Id;
    this.editingTheoryDetId = theory.DetId;
    this.editingTheoryHeader = theory.Header;
    this.editingTheoryDetails = theory.Details;
  }

  updateTheoria(): void {
    if (!this.editingTheoryHeader.trim()) {
      this.notificationService.warning(
        'Συμπλήρωσε τίτλο θεωρίας'
      );
      return;
    }

    const currentDetails =
      this.getTheoryDetailsHtml(
        this.editingTheoryQuill,
        this.editingTheoryDetails
      );

    const body = {
      Id: this.editingTheoryId,
      DetId: this.editingTheoryDetId,
      Header: this.editingTheoryHeader,
      Details: currentDetails
    };

    this.http.post<ApiResponse>(
      'api/Service/UpdateTheoria',
      body
    ).subscribe({
      next: (res) => {
        if (res.IsSuccess) {

          this.notificationService.success(
            'Η θεωρία ενημερώθηκε επιτυχώς'
          );

          this.resetTheoryEdit();

          if (this.selectedThematologia) {
            this.selectThematologia(
              this.selectedThematologia
            );
          }

        } else {

          this.notificationService.error(
            res.Message
          );
        }
      },

      error: (err) => {
        console.error(
          'Update theory error:',
          err
        );

        this.notificationService.error(
          'Σφάλμα ενημέρωσης θεωρίας'
        );
      }
    });
  }

  deleteTheoria(theory: QuizTheory): void {
    if (!confirm('Να διαγραφεί αυτή η θεωρία;')) {
      return;
    }

    this.http.post<ApiResponse>(
      `api/Service/DeleteTheoria/${theory.Id}/${theory.DetId}`,
      {}
    )
      .subscribe({
        next: (res) => {
          if (res.IsSuccess) {
            this.notificationService.success('Η θεωρία διαγράφηκε επιτυχώς');

            if (this.selectedThematologia) {
              this.selectThematologia(this.selectedThematologia);
            }
          } else {
            this.notificationService.error(res.Message);
          }
        },
        error: (err) => {
          console.error('Delete theory error:', err);
          this.notificationService.error('Σφάλμα διαγραφής θεωρίας');
        }
      });
  }

  private resetTheoryEdit(): void {

    this.editingTheoryQuill = null;
    this.editingTheoryId = null;
    this.editingTheoryDetId = null;
    this.editingTheoryHeader = '';
    this.editingTheoryDetails = '';
  }

  selectQuizTheory(theory: QuizTheory): void {
    this.selectedQuizTheory = theory;
    this.loadExistingQuestions(theory);
    this.resetNewQuizQuestions();
  }

  addQuizQuestion(): void {
    this.quizQuestions.push(this.createEmptyQuizQuestion());
  }

  removeQuizQuestion(index: number): void {
    this.quizQuestions.splice(index, 1);
  }

  addAnswer(question: QuizQuestionView): void {
    question.Options.push({
      Answer: '',
      IsCorrect: false
    });
  }

  removeAnswer(question: QuizQuestionView, answerIndex: number): void {
    question.Options.splice(answerIndex, 1);
  }

  selectCorrectAnswer(question: QuizQuestionView, selectedAnswer: QuizOption): void {
    question.Options.forEach(a => {
      a.IsCorrect = false;
    });

    selectedAnswer.IsCorrect = true;
  }

  saveQuizQuestions(): void {
    if (!this.selectedQuizTheory) {
      this.notificationService.warning('Επέλεξε θεωρία');
      return;
    }

    const validQuestions = this.quizQuestions
      .filter(q => q.Question?.trim().length > 0)
      .map(q => ({
        questionText: q.Question.trim(),
        difficulty: q.Difficulty,
        answers: q.Options
          .filter(a => a.Answer?.trim().length > 0)
          .map(a => ({
            text: a.Answer.trim(),
            isCorrect: a.IsCorrect
          }))
      }));

    if (validQuestions.length === 0) {
      this.notificationService.warning('Συμπλήρωσε τουλάχιστον μία ερώτηση');
      return;
    }

    for (const q of validQuestions) {
      if (q.answers.length === 0) {
        this.notificationService.warning('Συμπλήρωσε τουλάχιστον μία απάντηση');
        return;
      }

      const hasValidCorrectAnswer = q.answers.some(a => a.isCorrect);

      if (!hasValidCorrectAnswer) {
        this.notificationService.warning('Επέλεξε έγκυρη σωστή απάντηση');
        return;
      }
    }

    const body = {
      thematologiaId: this.thematologiaId,
      theoriaDetId: this.selectedQuizTheory.DetId,
      questions: validQuestions
    };

    this.http.post<ApiResponse>('api/Service/SaveQnA', body)
      .subscribe({
        next: () => {
          this.notificationService.success('Επιτυχής αποθήκευση');

          this.loadQuizQuestionsCount();
          this.loadExistingQuestions(this.selectedQuizTheory!);
          this.resetNewQuizQuestions();
        },
        error: (err) => {
          console.error('Save quiz error:', err);
          this.notificationService.error('Σφάλμα αποθήκευσης');
        }
      });
  }

  private resetNewQuizQuestions(): void {
    this.quizQuestions = [
      this.createEmptyQuizQuestion()
    ];
  }
  private createEmptyQuizQuestion(): QuizQuestionView {
    return {
      Question: '',
      Difficulty: 1,
      Options: [
        { Answer: '', IsCorrect: false },
        { Answer: '', IsCorrect: false },
        { Answer: '', IsCorrect: false }
      ]
    };
  }
  editExistingQuestion(question: ExistingQuizQuestion): void {
    this.editingQuestion = question;
    this.editingQuestionText = question.Question;
    this.editingQuestionDifficulty = question.Difficulty ?? 1;
    this.editingQuestionAnswers = question.Answers.map(a => ({
      AId: a.AId,
      Answer: a.Answer,
      IsCorrect: a.IsCorrect
    }));
  }

  cancelEditExistingQuestion(): void {
    this.editingQuestion = null;
    this.editingQuestionText = '';
    this.editingQuestionAnswers = [];
    this.editingQuestionDifficulty = 1;
  }

  addExistingAnswer(): void {
    this.editingQuestionAnswers.push({
      AId: 0,
      Answer: '',
      IsCorrect: false
    });
  }

  removeExistingAnswer(index: number): void {
    this.editingQuestionAnswers.splice(index, 1);
  }

  selectCorrectExistingAnswer(selectedAnswer: ExistingQuizAnswer): void {
    this.editingQuestionAnswers.forEach(a => {
      a.IsCorrect = false;
    });

    selectedAnswer.IsCorrect = true;
  }

  updateExistingQuestion(): void {
    if (!this.editingQuestion) {
      return;
    }

    if (!this.editingQuestionText?.trim()) {
      this.notificationService.warning('Συμπλήρωσε την ερώτηση');
      return;
    }

    const validAnswers = this.editingQuestionAnswers
      .filter(a => a.Answer?.trim().length > 0)
      .map(a => ({
        Answer: a.Answer.trim(),
        IsCorrect: a.IsCorrect
      }));

    if (validAnswers.length === 0) {
      this.notificationService.warning('Συμπλήρωσε τουλάχιστον μία απάντηση');
      return;
    }

    const hasValidCorrectAnswer = validAnswers.some(a => a.IsCorrect);

    if (!hasValidCorrectAnswer) {
      this.notificationService.warning('Επέλεξε έγκυρη σωστή απάντηση');
      return;
    }
    const body: UpdateQuizQuestionRequest = {
      Id: this.editingQuestion.Id,
      DetId: this.editingQuestion.DetId,
      QId: this.editingQuestion.QId,
      Question: this.editingQuestionText.trim(),
      Difficulty: this.editingQuestionDifficulty,
      Answers: validAnswers
    };

    this.http.post<ApiResponse>('api/Service/UpdateQuestion', body)
      .subscribe({
        next: () => {
          this.notificationService.success('Η ερώτηση ενημερώθηκε');

          if (this.selectedQuizTheory) {
            this.loadExistingQuestions(this.selectedQuizTheory);
          }

          this.cancelEditExistingQuestion();
        },
        error: (err) => {
          console.error('Update question error:', err);
          this.notificationService.error('Σφάλμα ενημέρωσης ερώτησης');
        }
      });
  }

  deleteExistingQuestion(question: ExistingQuizQuestion): void {
    if (!confirm('Να διαγραφεί αυτή η ερώτηση;')) {
      return;
    }

    this.http.post<ApiResponse>(
      `api/Service/DeleteQuestion/${question.Id}/${question.DetId}/${question.QId}`,
      {}
    )
      .subscribe({
        next: (response) => {
          if (!response.IsSuccess) {
            this.notificationService.error(
              response.Message || 'Η διαγραφή απέτυχε'
            );
            return;
          }

          this.notificationService.success('Η ερώτηση διαγράφηκε');

          this.loadQuizQuestionsCount();

          if (this.selectedQuizTheory) {
            this.loadExistingQuestions(this.selectedQuizTheory);
          }
        },
        error: (err) => {
          console.error('Delete question error:', err);
          this.notificationService.error('Σφάλμα διαγραφής ερώτησης');
        }
      });
  }
  saveQuizSettings(): void {
    if (this.quizQuestionCount <= 0) {
      this.notificationService.warning('Ο αριθμός ερωτήσεων πρέπει να είναι μεγαλύτερος από 0.');
      return;
    }

    if (this.quizQuestionCount > this.totalQuizQuestions) {
      this.notificationService.warning(`Υπάρχουν μόνο ${this.totalQuizQuestions} διαθέσιμες ερωτήσεις.`);
      return;
    }

    if (this.useQuizDifficulty && ![1, 2, 3].includes(Number(this.quizDifficultyPercent))) {
      this.notificationService.warning('Επίλεξε έγκυρη δυσκολία quiz.');
      return;
    }

    const body = {
      ThematologiaId: this.thematologiaId,
      QuizQuestionCount: Number(this.quizQuestionCount),
      UseQuizDifficulty: this.useQuizDifficulty,
      QuizDifficultyPercent: Number(this.quizDifficultyPercent)
    };

    this.http.post<ApiResponse>('api/Service/UpdateQuizSettings', body)
      .subscribe({
        next: (res) => {
          if (res.IsSuccess) {
            this.notificationService.success(res.Message || 'Οι ρυθμίσεις quiz αποθηκεύτηκαν.');
            this.loadThematologies();
            this.loadQuizQuestionsCount();
          } else {
            this.notificationService.warning(res.Message || 'Κάτι πήγε λάθος.');
          }
        },
        error: (err) => {
          console.error('Save quiz settings error:', err);
          this.notificationService.error('Σφάλμα αποθήκευσης ρυθμίσεων quiz.');
        }
      });
  }
  downloadQuizExcelTemplate(): void {

    this.http.get(
      'api/Service/DownloadQuizTemplate',
      {
        responseType: 'blob'
      }
    ).subscribe({

      next: (blob) => {

        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'QuizTemplate.xlsx';

        document.body.appendChild(a);

        a.click();

        document.body.removeChild(a);

        window.URL.revokeObjectURL(url);
      },

      error: (err) => {

        console.error(err);

        this.notificationService.error(
          'Αποτυχία λήψης προτύπου Excel'
        );

      }

    });

  }

  openQuizExcelImport(): void {

    this.quizExcelInput.nativeElement.click();

  }

  onQuizExcelSelected(event: Event): void {

    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.notificationService.warning('Επίλεξε αρχείο Excel (.xlsx)');
      input.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    this.loader.show();
    this.http.post<ApiResponse>(
      `api/Service/ImportQuizExcel/${this.thematologiaId}`,
      formData
    ).subscribe({
      next: (res) => {
        if (res.IsSuccess) {
          this.notificationService.success(res.Message || 'Το Excel εισήχθη επιτυχώς');

          this.loadThematologies();
          this.loadQuizQuestionsCount();

          if (this.selectedQuizTheory) {
            this.loadExistingQuestions(this.selectedQuizTheory);
          }

          this.loader.hide();
        } else {
          this.loader.hide();
          this.notificationService.warning(res.Message || 'Το Excel δεν εισήχθη');
        }

        input.value = '';
      },
      error: (err) => {
        this.loader.hide();
        console.error('Import quiz excel error:', err);
        this.notificationService.error('Σφάλμα εισαγωγής Excel');
        input.value = '';

      }
    });
  }

  openQuizSuggestions(): void {
    this.http.get<any>(
      `api/Service/GetQuizSuggestions/${this.thematologiaId}`
    ).subscribe({
      next: (res) => {
        if (res.IsSuccess || res.isSuccess) {
          this.quizSuggestions = res.Suggestions || res.suggestions || [];
          this.showQuizSuggestionsPopup = true;
        } else {
          this.notificationService.warning(res.Message || res.message);
        }
      },
      error: (err) => {
        console.error('Quiz suggestions error:', err);
        this.notificationService.error('Σφάλμα φόρτωσης προτεινόμενων quiz.');
      }
    });
  }

  closeQuizSuggestions(): void {
    this.showQuizSuggestionsPopup = false;
  }
  toggleSuggestionQuestions(index: number): void {
    this.expandedSuggestionIndex =
      this.expandedSuggestionIndex === index ? null : index;
  }

  applyQuizSuggestion(s: any): void {
    this.quizQuestionCount = s.QuestionCount || s.questionCount;
    this.quizDifficultyPercent = s.Difficulty || s.difficulty;
    this.useQuizDifficulty = true;

    this.showQuizSuggestionsPopup = false;

    this.notificationService.success('Η πρόταση εφαρμόστηκε. Πάτησε αποθήκευση για να αποθηκευτεί.');
  }
  goBack(): void {
    this.router.navigate(['/mainpage']);
  }

  ngOnDestroy(): void {
    this.imageResizeManager.destroy();
    this.newTheoryQuill = null;
    this.editingTheoryQuill = null;
  }
}
