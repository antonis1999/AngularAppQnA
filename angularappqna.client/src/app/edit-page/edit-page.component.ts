import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';

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
  UpdateQuizQuestionRequest,
  QuestionMedia
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

    const width =
      node.style.width ||
      node.getAttribute('width');

    if (width) {

      formats['width'] =
        width.replace('px', '');
    }

    return formats;
  }

  format(name: string, value: unknown): void {

    const node =
      this['domNode'] as HTMLElement;

    if (name === 'width') {

      const width = Number(value);

      if (
        Number.isFinite(width) &&
        width > 0
      ) {

        const roundedWidth =
          Math.round(width);

        node.style.display = 'inline-block';
        node.style.verticalAlign = 'top';
        node.style.maxWidth = '100%';
        node.style.width = `${roundedWidth}px`;
        node.style.height = 'auto';

        node.setAttribute(
          'width',
          String(roundedWidth)
        );

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

    const node =
      super.create(value) as HTMLElement;

    node.setAttribute(
      'src',
      value
    );

    node.setAttribute(
      'controls',
      ''
    );

    node.setAttribute(
      'preload',
      'metadata'
    );

    return node;
  }

  static value(node: HTMLElement): string | null {

    return node.getAttribute('src');
  }
}


class ImageResizeManager {

  private overlay:
    HTMLDivElement | null = null;

  private activeImage:
    HTMLImageElement | null = null;


  private readonly onDocumentMouseDown =
    (event: MouseEvent): void => {

      if (!this.overlay) {
        return;
      }

      const target =
        event.target as Node;

      if (
        this.overlay.contains(target)
      ) {
        return;
      }

      if (
        this.activeImage?.contains(target)
      ) {
        return;
      }

      this.remove();
    };


  constructor() {

    document.addEventListener(
      'mousedown',
      this.onDocumentMouseDown
    );
  }


  show(
    editor: Quill,
    image: HTMLImageElement
  ): void {

    this.remove();

    this.activeImage = image;

    const rect =
      image.getBoundingClientRect();

    const overlay =
      document.createElement('div');

    overlay.className =
      'image-resize-overlay';

    overlay.style.cssText =
      `left:${rect.left + window.scrollX}px;` +
      `top:${rect.top + window.scrollY}px;` +
      `width:${rect.width}px;` +
      `height:${rect.height}px;`;


    [
      'top-left',
      'top-right',
      'bottom-left',
      'bottom-right'
    ].forEach(corner => {

      const handle =
        document.createElement('div');

      handle.className =
        `image-resize-handle ${corner}`;

      handle.addEventListener(
        'mousedown',
        event => {

          event.preventDefault();
          event.stopPropagation();

          this.start(
            editor,
            event,
            image,
            corner
          );
        }
      );

      overlay.appendChild(handle);
    });


    const deleteButton =
      document.createElement('button');

    deleteButton.type =
      'button';

    deleteButton.className =
      'image-delete-button';

    deleteButton.innerHTML =
      '×';

    deleteButton.title =
      'Διαγραφή εικόνας';


    deleteButton.addEventListener(
      'mousedown',
      event => {

        event.preventDefault();
        event.stopPropagation();
      }
    );


    deleteButton.addEventListener(
      'click',
      event => {

        event.preventDefault();
        event.stopPropagation();

        this.deleteImage(
          editor,
          image
        );
      }
    );


    overlay.appendChild(
      deleteButton
    );


    document.body.appendChild(
      overlay
    );

    this.overlay = overlay;
  }


  remove(): void {

    this.overlay?.remove();

    this.overlay = null;
    this.activeImage = null;
  }


  destroy(): void {

    document.removeEventListener(
      'mousedown',
      this.onDocumentMouseDown
    );

    this.remove();
  }


  private deleteImage(
    editor: Quill,
    image: HTMLImageElement
  ): void {

    const blot: any =
      Quill.find(image);

    if (!blot) {
      image.remove();

      editor.update(
        'user'
      );

      this.remove();
      return;
    }

    const index =
      editor.getIndex(blot);

    this.remove();

    editor.deleteText(
      index,
      1,
      'user'
    );

    editor.update(
      'user'
    );
  }


  private start(
    editor: Quill,
    startEvent: MouseEvent,
    image: HTMLImageElement,
    corner: string
  ): void {

    const startX =
      startEvent.clientX;

    const startWidth =
      image.getBoundingClientRect().width;

    const direction =
      corner.includes('left')
        ? -1
        : 1;

    let finalWidth =
      startWidth;


    const onMouseMove =
      (event: MouseEvent) => {

        const width =
          startWidth +
          (
            event.clientX -
            startX
          ) * direction;

        finalWidth =
          Math.round(
            Math.max(
              120,
              Math.min(
                width,
                editor.root.clientWidth
              )
            )
          );

        image.style.width =
          `${finalWidth}px`;

        image.style.height =
          'auto';

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


      const blot: any =
        Quill.find(image);

      if (blot) {

        image.style.width =
          `${finalWidth}px`;

        image.style.height =
          'auto';

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


    document.addEventListener(
      'mousemove',
      onMouseMove
    );

    document.addEventListener(
      'mouseup',
      onMouseUp
    );
  }


  private update(
    image: HTMLImageElement
  ): void {

    if (!this.overlay) {
      return;
    }

    const rect =
      image.getBoundingClientRect();

    Object.assign(
      this.overlay.style,
      {
        left:
          `${rect.left + window.scrollX}px`,

        top:
          `${rect.top + window.scrollY}px`,

        width:
          `${rect.width}px`,

        height:
          `${rect.height}px`
      }
    );
  }
}
class QuillMediaManager {

  private readonly configuredEditors =
    new WeakSet<object>();


  constructor(
    private http: HttpClient,
    private notificationService: NotificationService,
    private getVideoUploadUrl: () => string,
    private getImageUploadUrl: (() => string) | null = null
  ) { }


  setup(editor: Quill): void {

    if (
      this.configuredEditors.has(
        editor as object
      )
    ) {
      return;
    }

    this.configuredEditors.add(
      editor as object
    );


    const clipboard: any =
      editor.clipboard;


    clipboard.addMatcher(
      'img',
      (node: Node) => {

        const image =
          node as HTMLImageElement;

        const src =
          image.getAttribute('src');

        if (!src) {

          return {
            ops: []
          };
        }


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


        if (
          Number.isFinite(width) &&
          width > 0
        ) {

          return {

            ops: [
              {
                insert: {
                  image: src
                },

                attributes: {
                  width:
                    String(
                      Math.round(width)
                    )
                }
              }
            ]
          };
        }


        return {

          ops: [
            {
              insert: {
                image: src
              }
            }
          ]
        };
      }
    );


    clipboard.addMatcher(
      'video',
      (node: Node) => {

        const video =
          node as HTMLVideoElement;

        const src =
          video.getAttribute('src');

        if (!src) {

          return {
            ops: []
          };
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


  openImagePicker(
    editor: Quill,
    onUploaded?: (media: QuestionMedia) => void
  ): void {

    this.pickFile(
      [
        'image/jpeg',
        'image/png',
        'image/webp'
      ],
      file => {

        if (
          !this.validateImage(file)
        ) {
          return;
        }

        if (this.getImageUploadUrl) {

          const index =
            editor.getSelection(true)?.index ??
            Math.max(
              0,
              editor.getLength() - 1
            );

          const formData =
            new FormData();

          formData.append(
            'file',
            file
          );

          this.http.post<{
            imageUrl: string;
            mediaUrl?: string;
            blobName?: string;
            mediaType?: string;
          }>(
            this.getImageUploadUrl(),
            formData
          )
            .subscribe({

              next: response => {

                const imageUrl =
                  response.mediaUrl ||
                  response.imageUrl;

                editor.insertEmbed(
                  index,
                  'image',
                  imageUrl,
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

                onUploaded?.({
                  MediaUrl: imageUrl,
                  BlobName:
                    response.blobName ??
                    null,
                  MediaType: 'image'
                });

                this.notificationService.success(
                  'Η εικόνα ανέβηκε επιτυχώς.'
                );
              },

              error: err => {

                console.error(
                  'Image upload error:',
                  err
                );

                this.notificationService.error(
                  'Σφάλμα κατά το ανέβασμα της εικόνας.'
                );
              }

            });

          return;
        }

        const reader =
          new FileReader();

        reader.onload = () => {

          const range =
            editor.getSelection(true);

          const index =
            range?.index ??
            Math.max(
              0,
              editor.getLength() - 1
            );

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

        reader.onerror = () => {

          this.notificationService.error(
            'Δεν ήταν δυνατή η ανάγνωση της εικόνας.'
          );
        };

        reader.readAsDataURL(file);
      }
    );
  }


  openVideoPicker(
    editor: Quill,
    onUploaded?: (media: QuestionMedia) => void
  ): void {

    this.pickFile(
      [
        'video/mp4',
        'video/webm',
        'video/quicktime'
      ],
      file => {

        const index =
          editor.getSelection(true)?.index ??
          Math.max(
            0,
            editor.getLength() - 1
          );


        const formData =
          new FormData();

        formData.append(
          'file',
          file
        );


        this.http.post<{
          videoUrl: string;
          mediaUrl?: string;
          blobName?: string;
          mediaType?: string;
        }>(
          this.getVideoUploadUrl(),
          formData
        )
          .subscribe({

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


              onUploaded?.({
                MediaUrl:
                  response.mediaUrl ||
                  response.videoUrl,
                BlobName:
                  response.blobName ??
                  null,
                MediaType: 'video'
              });


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


  loadHtml(
    editor: Quill,
    html: string
  ): void {

    const normalizedHtml =
      this.normalizeStoredHtml(
        html
      );


    const clipboard: any =
      editor.clipboard;

    let delta: any;


    try {

      delta =
        clipboard.convert({
          html: normalizedHtml,
          text: ''
        });

    } catch {

      delta =
        clipboard.convert(
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


  getHtml(
    editor: Quill | null,
    fallback: string
  ): string {

    if (!editor) {

      return this.normalizeStoredHtml(
        fallback
      );
    }


    const clone =
      editor.root.cloneNode(
        true
      ) as HTMLElement;


    clone
      .querySelectorAll<HTMLImageElement>(
        'img'
      )
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


        image.style.display =
          'inline-block';

        image.style.verticalAlign =
          'top';

        image.style.maxWidth =
          '100%';

        image.style.height =
          'auto';


        if (
          Number.isFinite(width) &&
          width > 0
        ) {

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


  private validateImage(
    file: File
  ): boolean {

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


    if (
      file.size >
      5 * 1024 * 1024
    ) {

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
      document.createElement(
        'input'
      );


    input.type =
      'file';

    input.accept =
      accept.join(',');

    input.style.display =
      'none';


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
      {
        once: true
      }
    );


    document.body.appendChild(
      input
    );

    input.click();
  }


  private normalizeStoredHtml(
    html: string
  ): string {

    if (!html) {
      return '';
    }


    const wrapper =
      document.createElement(
        'div'
      );

    wrapper.innerHTML =
      html;


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
            element.querySelectorAll<HTMLImageElement>(
              'img'
            )
          );


        if (
          images.length > 0
        ) {

          element.replaceWith(
            ...images
          );

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


Quill.register(
  ResizableImageBlot,
  true
);

Quill.register(
  CustomVideoBlot
);


@Component({
  selector: 'app-edit-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    QuillModule
  ],
  templateUrl:
    './edit-page.component.html',
  styleUrl:
    './edit-page.component.css'
})
export class EditPageComponent
  implements OnInit, OnDestroy {


  thematologiaId = 0;

  adminEditTab = 'theory';

  thematologies:
    Thematologia[] = [];

  selectedThematologia:
    Thematologia | null = null;


  thematologiaTitle = '';


  editingThematologiaId:
    number | null = null;

  editingThematologiaTitle = '';

  editingFromDate = '';

  editingToDate = '';


  selectedTheories:
    QuizTheory[] = [];


  newTheoryHeader = '';

  newTheoryDetails = '';


  editingTheoryId:
    number | null = null;

  editingTheoryDetId:
    number | null = null;

  editingTheoryHeader = '';

  editingTheoryDetails = '';


  selectedQuizTheory:
    QuizTheory | null = null;


  quizQuestions:
    QuizQuestionView[] = [];

  existingQuestions:
    ExistingQuizQuestion[] = [];


  quizQuestionCount = 4;

  totalQuizQuestions = 0;


  editingQuestionDifficulty = 1;

  editingQuestionType = 1;

  editingQuestion:
    ExistingQuizQuestion | null = null;

  editingQuestionText = '';

  editingQuestionAnswers:
    ExistingQuizAnswer[] = [];


  quizDifficultyPercent = 2;

  useQuizDifficulty = false;


  showQuizSuggestionsPopup = false;

  quizSuggestions: any[] = [];

  expandedSuggestionIndex:
    number | null = null;


  private newTheoryQuill:
    Quill | null = null;

  private editingTheoryQuill:
    Quill | null = null;


  private editingQuestionQuill:
    Quill | null = null;


  private quizQuestionEditors =
    new WeakMap<object, Quill>();


  private quizQuestionMedia =
    new WeakMap<object, QuestionMedia[]>();


  private editingQuestionMedia:
    QuestionMedia[] = [];


  private imageResizeManager!:
    ImageResizeManager;


  private mediaManager!:
    QuillMediaManager;


  private quizMediaManager!:
    QuillMediaManager;


  quillModules = {

    toolbar: {

      container: [

        [
          'bold',
          'italic',
          'underline',
          'strike'
        ],

        [
          {
            header: [
              1,
              2,
              3,
              false
            ]
          }
        ],

        [
          {
            list: 'ordered'
          },
          {
            list: 'bullet'
          }
        ],

        [
          {
            align: []
          }
        ],

        [
          {
            color: []
          },
          {
            background: []
          }
        ],

        [
          'link',
          'image',
          'video'
        ],

        [
          'clean'
        ]

      ]
    }
  };


  quizQuillModules = {

    toolbar: {

      container: [

        [
          'bold',
          'italic',
          'underline',
          'strike'
        ],

        [
          {
            header: [
              1,
              2,
              3,
              false
            ]
          }
        ],

        [
          {
            list: 'ordered'
          },
          {
            list: 'bullet'
          }
        ],

        [
          {
            align: []
          }
        ],

        [
          {
            color: []
          },
          {
            background: []
          }
        ],

        [
          'link',
          'image',
          'video'
        ],

        [
          'clean'
        ]

      ]
    }
  };


  @ViewChild('quizExcelInput')
  quizExcelInput!:
    ElementRef<HTMLInputElement>;


  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private notificationService:
      NotificationService,
    private loader: LoaderService
  ) {

    this.imageResizeManager =
      new ImageResizeManager();


    this.mediaManager =
      new QuillMediaManager(

        this.http,

        this.notificationService,

        () =>
          `api/Upload/TheoryVideo` +
          `?thematologiaId=${this.thematologiaId}` +
          `&theoryDetId=${this.editingTheoryDetId ?? this.getNextDetId()}`,

        () =>
          `api/Upload/TheoryImage` +
          `?thematologiaId=${this.thematologiaId}` +
          `&theoryDetId=${this.editingTheoryDetId ?? this.getNextDetId()}`
      );


    this.quizMediaManager =
      new QuillMediaManager(

        this.http,

        this.notificationService,

        () => {

          const theoryDetId =
            this.selectedQuizTheory?.DetId ??
            0;

          return (
            `api/Upload/QuestionVideo` +
            `?thematologiaId=${this.thematologiaId}` +
            `&theoryDetId=${theoryDetId}`
          );
        },

        () => {

          const theoryDetId =
            this.selectedQuizTheory?.DetId ??
            0;

          return (
            `api/Upload/QuestionImage` +
            `?thematologiaId=${this.thematologiaId}` +
            `&theoryDetId=${theoryDetId}`
          );
        }
      );

  }


  ngOnInit(): void {

    this.thematologiaId =
      Number(
        this.route.snapshot.paramMap.get(
          'id'
        )
      );


    this.loadThematologies();

    this.loadQuizQuestionsCount();
  }


  private setupTheoryEditor(
    editor: Quill
  ): void {

    const toolbar: any =
      editor.getModule(
        'toolbar'
      );


    this.mediaManager.setup(
      editor
    );


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


    this.setupImageResize(
      editor
    );
  }


  private setupQuizEditor(
    editor: Quill,
    onMediaUploaded:
      (media: QuestionMedia) => void
  ): void {

    const toolbar: any =
      editor.getModule(
        'toolbar'
      );


    this.quizMediaManager.setup(
      editor
    );


    toolbar?.addHandler(
      'image',
      () =>
        this.quizMediaManager.openImagePicker(
          editor,
          onMediaUploaded
        )
    );


    toolbar?.addHandler(
      'video',
      () =>
        this.quizMediaManager.openVideoPicker(
          editor,
          onMediaUploaded
        )
    );


    this.setupImageResize(
      editor
    );
  }


  private setupImageResize(
    editor: Quill
  ): void {

    editor.root.addEventListener(
      'click',
      event => {

        const target =
          event.target as HTMLElement;


        if (
          target.tagName === 'IMG'
        ) {

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


  onNewTheoryEditorCreated(
    editor: Quill
  ): void {

    this.newTheoryQuill =
      editor;

    this.setupTheoryEditor(
      editor
    );
  }


  onEditingTheoryEditorCreated(
    editor: Quill
  ): void {

    this.editingTheoryQuill =
      editor;

    this.setupTheoryEditor(
      editor
    );


    const html =
      this.editingTheoryDetails;


    setTimeout(() => {

      if (
        this.editingTheoryQuill !==
        editor
      ) {
        return;
      }


      this.mediaManager.loadHtml(
        editor,
        html
      );

    });
  }


  onNewQuestionEditorCreated(
    editor: Quill,
    question: QuizQuestionView
  ): void {

    this.quizQuestionEditors.set(
      question as object,
      editor
    );


    this.setupQuizEditor(
      editor,
      media =>
        this.addQuestionMedia(
          question,
          media
        )
    );


    if (
      question.Question
    ) {

      const html =
        question.Question;


      setTimeout(() => {

        const currentEditor =
          this.quizQuestionEditors.get(
            question as object
          );


        if (
          currentEditor !== editor
        ) {
          return;
        }


        this.quizMediaManager.loadHtml(
          editor,
          html
        );

      });
    }
  }


  onEditingQuestionEditorCreated(
    editor: Quill
  ): void {

    this.editingQuestionQuill =
      editor;


    this.setupQuizEditor(
      editor,
      media =>
        this.addEditingQuestionMedia(
          media
        )
    );


    const html =
      this.editingQuestionText;


    setTimeout(() => {

      if (
        this.editingQuestionQuill !==
        editor
      ) {
        return;
      }


      this.quizMediaManager.loadHtml(
        editor,
        html
      );

    });
  }


  private addQuestionMedia(
    question: QuizQuestionView,
    media: QuestionMedia
  ): void {

    const current =
      this.quizQuestionMedia.get(
        question as object
      ) ??
      [];

    const exists =
      current.some(
        item =>
          (
            item.BlobName &&
            media.BlobName &&
            item.BlobName ===
            media.BlobName
          ) ||
          item.MediaUrl ===
          media.MediaUrl
      );

    if (!exists) {

      current.push(
        media
      );

      this.quizQuestionMedia.set(
        question as object,
        current
      );

      question.Media =
        this.getQuestionMedia(
          question
        );
    }
  }


  private addEditingQuestionMedia(
    media: QuestionMedia
  ): void {

    const exists =
      this.editingQuestionMedia.some(
        item =>
          (
            item.BlobName &&
            media.BlobName &&
            item.BlobName ===
            media.BlobName
          ) ||
          item.MediaUrl ===
          media.MediaUrl
      );

    if (!exists) {

      this.editingQuestionMedia.push(
        media
      );
    }
  }


  private getQuestionMedia(
    question: QuizQuestionView
  ): QuestionMedia[] {

    const uploadedMedia =
      this.quizQuestionMedia.get(
        question as object
      ) ??
      [];


    const combined = [
      ...(question.Media ?? []),
      ...uploadedMedia
    ];


    return combined.filter(
      (media, index, array) =>
        array.findIndex(
          item =>
            (
              item.BlobName &&
              media.BlobName &&
              item.BlobName ===
              media.BlobName
            ) ||
            item.MediaUrl ===
            media.MediaUrl
        ) === index
    );
  }


  private normalizeQuestionMedia(
    media: QuestionMedia[],
    html: string
  ): QuestionMedia[] {

    const currentMedia =
      (media ?? [])
        .filter(item =>
          !!item?.MediaUrl &&
          html.includes(item.MediaUrl)
        )
        .map(item => ({
          MediaUrl: item.MediaUrl,
          BlobName: item.BlobName ?? null,
          MediaType: item.MediaType
        }));


    const wrapper =
      document.createElement('div');

    wrapper.innerHTML =
      html ?? '';


    wrapper
      .querySelectorAll<HTMLImageElement>(
        'img[src]'
      )
      .forEach(image => {

        const src =
          image.getAttribute('src');

        if (
          !src ||
          currentMedia.some(
            item =>
              item.MediaUrl === src
          )
        ) {
          return;
        }

        currentMedia.push({
          MediaUrl: src,
          BlobName: null,
          MediaType: 'image'
        });
      });


    wrapper
      .querySelectorAll<HTMLVideoElement>(
        'video[src]'
      )
      .forEach(video => {

        const src =
          video.getAttribute('src');

        if (
          !src ||
          currentMedia.some(
            item =>
              item.MediaUrl === src
          )
        ) {
          return;
        }

        currentMedia.push({
          MediaUrl: src,
          BlobName: null,
          MediaType: 'video'
        });
      });


    return currentMedia;
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


  private getQuizQuestionHtml(
    question: QuizQuestionView
  ): string {

    const editor =
      this.quizQuestionEditors.get(
        question as object
      ) ??
      null;


    return this.quizMediaManager.getHtml(
      editor,
      question.Question ?? ''
    );
  }


  private getEditingQuestionHtml():
    string {

    return this.quizMediaManager.getHtml(
      this.editingQuestionQuill,
      this.editingQuestionText
    );
  }


  private htmlHasContent(
    html: string
  ): boolean {

    if (!html) {
      return false;
    }


    const wrapper =
      document.createElement(
        'div'
      );

    wrapper.innerHTML =
      html;


    const text =
      wrapper.textContent
        ?.replace(/\u00a0/g, ' ')
        .trim() ??
      '';


    const hasMedia =
      !!wrapper.querySelector(
        'img, video'
      );


    return (
      text.length > 0 ||
      hasMedia
    );
  }


  loadThematologies(): void {

    this.http
      .get<Thematologia[]>(
        'api/Service/GetThematologies'
      )
      .subscribe({

        next: res => {

          this.thematologies =
            res;


          this.selectedThematologia =
            this.thematologies.find(
              x =>
                x.Id ===
                this.thematologiaId
            ) ??
            null;


          if (
            this.selectedThematologia
          ) {

            this.quizQuestionCount =
              this.selectedThematologia
                .QuizQuestionCount ??
              4;


            this.quizDifficultyPercent =
              this.selectedThematologia
                .QuizDifficultyPercent ??
              2;


            this.startEditThematologia(
              this.selectedThematologia
            );
          }
        },


        error: err => {

          console.error(
            'Load thematologies error:',
            err
          );


          this.notificationService.error(
            'Σφάλμα φόρτωσης θεματολογιών'
          );
        }

      });
  }


  loadQuizQuestionsCount(): void {

    this.http
      .get<number>(
        `api/Service/GetQuizQuestionsCount/${this.thematologiaId}`
      )
      .subscribe({

        next: count => {

          this.totalQuizQuestions =
            count;
        },


        error: err => {

          console.error(
            'Load quiz questions count error:',
            err
          );
        }

      });
  }


  loadExistingQuestions(
    theory: QuizTheory
  ): void {

    this.http
      .get<ExistingQuizQuestion[]>(
        `api/Service/GetQuestionsByTheoria/${this.thematologiaId}/${theory.DetId}`
      )
      .subscribe({

        next: res => {

          this.existingQuestions =
            res || [];
        },


        error: err => {

          console.error(
            'Load existing questions error:',
            err
          );


          this.notificationService.error(
            'Σφάλμα φόρτωσης ερωτήσεων'
          );
        }

      });
  }


  setAdminEditTab(
    tab: string
  ): void {

    this.adminEditTab =
      tab;
  }


  selectThematologia(
    item: Thematologia
  ): void {

    this.selectedThematologia =
      item;


    this.http
      .get<QuizTheory[]>(
        `api/Service/GetTheoriaByThematologia?thematologiaId=${item.Id}`
      )
      .subscribe({

        next: res => {

          this.selectedTheories =
            res ??
            [];
        },


        error: err => {

          console.error(
            'Load theories error:',
            err
          );


          this.notificationService.error(
            'Σφάλμα φόρτωσης θεωριών'
          );
        }

      });
  }


  saveThematologia(): void {

    if (
      !this.thematologiaTitle.trim()
    ) {

      this.notificationService.warning(
        'Συμπλήρωσε Header Θεματολογίας'
      );

      return;
    }


    const fromDate =
      new Date();

    const toDate =
      new Date();

    toDate.setMonth(
      toDate.getMonth() + 1
    );


    const body = {

      Title:
        this.thematologiaTitle,

      FromDate:
        fromDate,

      ToDate:
        toDate
    };


    this.http
      .post<ApiResponse>(
        'api/Service/AddThematologia',
        body
      )
      .subscribe({

        next: res => {

          if (
            res.IsSuccess
          ) {

            this.thematologiaTitle =
              '';

            this.loadThematologies();

            this.notificationService.success(
              'Η θεματολογία αποθηκεύτηκε επιτυχώς'
            );

          } else {

            this.notificationService.warning(
              res.Message ||
              'Κάτι πήγε λάθος'
            );
          }
        },


        error: err => {

          console.error(
            'Save thematologia error:',
            err
          );


          this.notificationService.error(
            'Σφάλμα αποθήκευσης θεματολογίας'
          );
        }

      });
  }


  startEditThematologia(
    item: Thematologia
  ): void {

    if (
      this.editingThematologiaId ===
      item.Id
    ) {

      this.editingThematologiaId =
        null;

      this.editingThematologiaTitle =
        '';

      this.editingFromDate =
        '';

      this.editingToDate =
        '';

      return;
    }


    this.editingThematologiaId =
      item.Id;

    this.editingThematologiaTitle =
      item.Title;

    this.editingFromDate =
      item.FromDate
        ? item.FromDate.substring(
          0,
          10
        )
        : '';

    this.editingToDate =
      item.ToDate
        ? item.ToDate.substring(
          0,
          10
        )
        : '';


    this.selectedThematologia =
      item;


    this.selectThematologia(
      item
    );
  }


  updateThematologia(
    item: Thematologia
  ): void {

    if (
      !this.editingThematologiaTitle.trim()
    ) {

      this.notificationService.warning(
        'Συμπλήρωσε Header Θεματολογίας'
      );

      return;
    }


    const body = {

      Id:
        item.Id,

      Title:
        this.editingThematologiaTitle,

      FromDate:
        this.editingFromDate
          ? new Date(
            this.editingFromDate
          )
          : new Date(),

      ToDate:
        this.editingToDate
          ? new Date(
            this.editingToDate
          )
          : new Date(
            2099,
            11,
            31
          )
    };


    this.http
      .post<ApiResponse>(
        'api/Service/UpdateThematologia',
        body
      )
      .subscribe({

        next: res => {

          if (
            res.IsSuccess
          ) {

            this.resetThematologiaEdit();

            this.loadThematologies();

            this.notificationService.success(
              'Η θεματολογία ενημερώθηκε επιτυχώς'
            );

          } else {

            this.notificationService.error(
              res.Message
            );
          }
        },


        error: err => {

          console.error(
            'Update thematologia error:',
            err
          );


          this.notificationService.error(
            'Σφάλμα ενημέρωσης θεματολογίας'
          );
        }

      });
  }


  deleteThematologia(
    item: Thematologia,
    event: MouseEvent
  ): void {

    event.preventDefault();
    event.stopPropagation();


    const confirmed =
      confirm(
        `Να διαγραφεί η θεματολογία "${item.Title}";`
      );


    if (!confirmed) {
      return;
    }


    this.http
      .post<ApiResponse>(
        `api/Service/DeleteThematologia/${item.Id}`,
        {}
      )
      .subscribe({

        next: response => {

          if (
            !response.IsSuccess
          ) {

            this.notificationService.error(
              response.Message ||
              'Η διαγραφή απέτυχε'
            );

            return;
          }


          this.selectedThematologia =
            null;

          this.selectedTheories =
            [];

          this.thematologiaTitle =
            '';


          this.loadThematologies();


          this.notificationService.success(
            'Διαγράφηκε επιτυχώς'
          );


          this.router.navigate(
            [
              '/mainpage'
            ]
          );
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


  private resetThematologiaEdit():
    void {

    this.editingThematologiaId =
      null;

    this.editingThematologiaTitle =
      '';

    this.editingFromDate =
      '';

    this.editingToDate =
      '';

    this.selectedThematologia =
      null;

    this.selectedTheories =
      [];

    this.newTheoryHeader =
      '';

    this.newTheoryDetails =
      '';
  }


  getNextDetId(): number {

    if (
      !this.selectedTheories ||
      this.selectedTheories.length === 0
    ) {

      return 1;
    }


    return (
      Math.max(
        ...this.selectedTheories.map(
          x => x.DetId
        )
      ) +
      1
    );
  }


  addTheoryToSelected(): void {

    if (
      !this.selectedThematologia
    ) {

      this.notificationService.warning(
        'Διάλεξε πρώτα θεματολογία'
      );

      return;
    }


    if (
      !this.newTheoryHeader.trim()
    ) {

      this.notificationService.warning(
        'Συμπλήρωσε τίτλο θεωρίας'
      );

      return;
    }


    const currentDetails =
      this.getTheoryDetailsHtml(
        this.newTheoryQuill,
        this.newTheoryDetails
      );


    const body = {

      Id:
        this.selectedThematologia.Id,

      DetId:
        this.getNextDetId(),

      Header:
        this.newTheoryHeader,

      Details:
        currentDetails
    };


    this.http
      .post<ApiResponse>(
        'api/Service/AddTheoria',
        body
      )
      .subscribe({

        next: res => {

          if (
            res.IsSuccess
          ) {

            this.newTheoryHeader =
              '';

            this.newTheoryDetails =
              '';


            this.newTheoryQuill?.setText(
              ''
            );


            this.selectThematologia(
              this.selectedThematologia!
            );


            this.notificationService.success(
              'Η θεωρία αποθηκεύτηκε επιτυχώς'
            );

          } else {

            this.notificationService.error(
              res.Message
            );
          }
        },


        error: err => {

          console.error(
            'Add theory error:',
            err
          );


          this.notificationService.error(
            'Σφάλμα αποθήκευσης θεωρίας'
          );
        }

      });
  }


  startEditTheory(
    theory: QuizTheory
  ): void {

    if (
      this.editingTheoryId ===
      theory.Id &&
      this.editingTheoryDetId ===
      theory.DetId
    ) {

      this.resetTheoryEdit();

      return;
    }


    this.editingTheoryQuill =
      null;


    this.editingTheoryId =
      theory.Id;

    this.editingTheoryDetId =
      theory.DetId;

    this.editingTheoryHeader =
      theory.Header;

    this.editingTheoryDetails =
      theory.Details;
  }


  updateTheoria(): void {

    if (
      !this.editingTheoryHeader.trim()
    ) {

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

      Id:
        this.editingTheoryId,

      DetId:
        this.editingTheoryDetId,

      Header:
        this.editingTheoryHeader,

      Details:
        currentDetails
    };


    this.http
      .post<ApiResponse>(
        'api/Service/UpdateTheoria',
        body
      )
      .subscribe({

        next: res => {

          if (
            res.IsSuccess
          ) {

            this.notificationService.success(
              'Η θεωρία ενημερώθηκε επιτυχώς'
            );


            this.resetTheoryEdit();


            if (
              this.selectedThematologia
            ) {

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


        error: err => {

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


  deleteTheoria(
    theory: QuizTheory
  ): void {

    if (
      !confirm(
        'Να διαγραφεί αυτή η θεωρία;'
      )
    ) {
      return;
    }


    this.http
      .post<ApiResponse>(
        `api/Service/DeleteTheoria/${theory.Id}/${theory.DetId}`,
        {}
      )
      .subscribe({

        next: res => {

          if (
            res.IsSuccess
          ) {

            this.notificationService.success(
              'Η θεωρία διαγράφηκε επιτυχώς'
            );


            if (
              this.selectedThematologia
            ) {

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


        error: err => {

          console.error(
            'Delete theory error:',
            err
          );


          this.notificationService.error(
            'Σφάλμα διαγραφής θεωρίας'
          );
        }

      });
  }


  private resetTheoryEdit():
    void {

    this.editingTheoryQuill =
      null;

    this.editingTheoryId =
      null;

    this.editingTheoryDetId =
      null;

    this.editingTheoryHeader =
      '';

    this.editingTheoryDetails =
      '';
  }


  selectQuizTheory(
    theory: QuizTheory
  ): void {

    this.selectedQuizTheory =
      theory;


    this.cancelEditExistingQuestion();


    this.loadExistingQuestions(
      theory
    );


    this.resetNewQuizQuestions();
  }


  addQuizQuestion(): void {

    this.quizQuestions.push(
      this.createEmptyQuizQuestion()
    );
  }


  removeQuizQuestion(
    index: number
  ): void {

    this.quizQuestions.splice(
      index,
      1
    );
  }


  addAnswer(
    question: QuizQuestionView
  ): void {

    question.Options.push({

      Answer: '',

      IsCorrect: false,

      MatchLeft: null,

      MatchRight: null,

      CategoryName: null
    });
  }


  removeAnswer(
    question: QuizQuestionView,
    answerIndex: number
  ): void {

    question.Options.splice(
      answerIndex,
      1
    );
  }


  selectCorrectAnswer(
    question: QuizQuestionView,
    selectedAnswer: QuizOption
  ): void {

    question.Options.forEach(
      answer => {

        answer.IsCorrect =
          false;
      }
    );


    selectedAnswer.IsCorrect =
      true;
  }


  onQuestionTypeChange(
    question: QuizQuestionView
  ): void {

    if (
      question.QuestionType === 2
    ) {

      const trueAnswer =
        question.Options.find(
          option =>
            option.Answer
              ?.trim()
              .toLowerCase() ===
            'σωστό'
        );

      const falseAnswer =
        question.Options.find(
          option =>
            option.Answer
              ?.trim()
              .toLowerCase() ===
            'λάθος'
        );

      question.Options = [
        {
          Answer: 'Σωστό',
          IsCorrect:
            trueAnswer?.IsCorrect ??
            false
        },
        {
          Answer: 'Λάθος',
          IsCorrect:
            falseAnswer?.IsCorrect ??
            false
        }
      ];

      return;
    }

    if (
      question.QuestionType === 3
    ) {

      const currentOptions =
        question.Options
          .filter(option =>
            option.Answer !== 'Σωστό' &&
            option.Answer !== 'Λάθος'
          )
          .map(option => ({
            Answer: option.Answer ?? '',
            IsCorrect: false
          }));

      question.Options =
        currentOptions.length >= 2
          ? currentOptions
          : [
            {
              Answer: '',
              IsCorrect: false
            },
            {
              Answer: '',
              IsCorrect: false
            },
            {
              Answer: '',
              IsCorrect: false
            }
          ];

      return;
    }

    if (
      question.QuestionType === 4
    ) {

      const currentOptions =
        question.Options
          .filter(option =>
            option.Answer !== 'Σωστό' &&
            option.Answer !== 'Λάθος'
          )
          .map(option => ({
            Answer: '',
            IsCorrect: false,
            MatchLeft: option.MatchLeft ?? null,
            MatchRight: option.MatchRight ?? null
          }));

      question.Options =
        currentOptions.length >= 2
          ? currentOptions
          : [
            {
              Answer: '',
              IsCorrect: false,
              MatchLeft: null,
              MatchRight: null
            },
            {
              Answer: '',
              IsCorrect: false,
              MatchLeft: null,
              MatchRight: null
            },
            {
              Answer: '',
              IsCorrect: false,
              MatchLeft: null,
              MatchRight: null
            }
          ];

      return;
    }

    if (
      question.QuestionType === 5
    ) {

      const currentOptions =
        question.Options
          .filter(option =>
            option.Answer !== 'Σωστό' &&
            option.Answer !== 'Λάθος'
          )
          .map(option => ({
            Answer: option.Answer ?? '',
            IsCorrect: false,
            MatchLeft: null,
            MatchRight: null,
            CategoryName: option.CategoryName ?? null
          }));

      question.Options =
        currentOptions.length >= 2
          ? currentOptions
          : [
            { Answer: '', IsCorrect: false, MatchLeft: null, MatchRight: null, CategoryName: null },
            { Answer: '', IsCorrect: false, MatchLeft: null, MatchRight: null, CategoryName: null },
            { Answer: '', IsCorrect: false, MatchLeft: null, MatchRight: null, CategoryName: null },
            { Answer: '', IsCorrect: false, MatchLeft: null, MatchRight: null, CategoryName: null }
          ];

      return;
    }

    const wasTrueFalse =
      question.Options.length === 2 &&
      question.Options.some(
        option =>
          option.Answer === 'Σωστό'
      ) &&
      question.Options.some(
        option =>
          option.Answer === 'Λάθος'
      );

    if (
      wasTrueFalse
    ) {

      question.Options = [
        {
          Answer: '',
          IsCorrect: false
        },
        {
          Answer: '',
          IsCorrect: false
        },
        {
          Answer: '',
          IsCorrect: false
        }
      ];
    }
  }


  onEditingQuestionTypeChange():
    void {

    if (
      this.editingQuestionType === 2
    ) {

      const trueAnswer =
        this.editingQuestionAnswers.find(
          answer =>
            answer.Answer
              ?.trim()
              .toLowerCase() ===
            'σωστό'
        );

      const falseAnswer =
        this.editingQuestionAnswers.find(
          answer =>
            answer.Answer
              ?.trim()
              .toLowerCase() ===
            'λάθος'
        );

      this.editingQuestionAnswers = [
        {
          AId:
            trueAnswer?.AId ??
            0,
          Answer:
            'Σωστό',
          IsCorrect:
            trueAnswer?.IsCorrect ??
            false
        },
        {
          AId:
            falseAnswer?.AId ??
            0,
          Answer:
            'Λάθος',
          IsCorrect:
            falseAnswer?.IsCorrect ??
            false
        }
      ];

      return;
    }

    if (
      this.editingQuestionType === 3
    ) {

      const currentAnswers =
        this.editingQuestionAnswers
          .filter(answer =>
            answer.Answer !== 'Σωστό' &&
            answer.Answer !== 'Λάθος'
          )
          .map(answer => ({
            AId: answer.AId ?? 0,
            Answer: answer.Answer ?? '',
            IsCorrect: false
          }));

      this.editingQuestionAnswers =
        currentAnswers.length >= 2
          ? currentAnswers
          : [
            {
              AId: 0,
              Answer: '',
              IsCorrect: false
            },
            {
              AId: 0,
              Answer: '',
              IsCorrect: false
            },
            {
              AId: 0,
              Answer: '',
              IsCorrect: false
            }
          ];

      return;
    }

    if (
      this.editingQuestionType === 4
    ) {

      const currentAnswers =
        this.editingQuestionAnswers
          .filter(answer =>
            answer.Answer !== 'Σωστό' &&
            answer.Answer !== 'Λάθος'
          )
          .map(answer => ({
            AId: answer.AId ?? 0,
            Answer: '',
            IsCorrect: false,
            MatchLeft: answer.MatchLeft ?? null,
            MatchRight: answer.MatchRight ?? null
          }));

      this.editingQuestionAnswers =
        currentAnswers.length >= 2
          ? currentAnswers
          : [
            {
              AId: 0,
              Answer: '',
              IsCorrect: false,
              MatchLeft: null,
              MatchRight: null
            },
            {
              AId: 0,
              Answer: '',
              IsCorrect: false,
              MatchLeft: null,
              MatchRight: null
            },
            {
              AId: 0,
              Answer: '',
              IsCorrect: false,
              MatchLeft: null,
              MatchRight: null
            }
          ];

      return;
    }

    if (
      this.editingQuestionType === 5
    ) {

      const currentAnswers =
        this.editingQuestionAnswers
          .filter(answer =>
            answer.Answer !== 'Σωστό' &&
            answer.Answer !== 'Λάθος'
          )
          .map(answer => ({
            AId: answer.AId ?? 0,
            Answer: answer.Answer ?? '',
            IsCorrect: false,
            MatchLeft: null,
            MatchRight: null,
            CategoryName: answer.CategoryName ?? null
          }));

      this.editingQuestionAnswers =
        currentAnswers.length >= 2
          ? currentAnswers
          : [
            { AId: 0, Answer: '', IsCorrect: false, MatchLeft: null, MatchRight: null, CategoryName: null },
            { AId: 0, Answer: '', IsCorrect: false, MatchLeft: null, MatchRight: null, CategoryName: null },
            { AId: 0, Answer: '', IsCorrect: false, MatchLeft: null, MatchRight: null, CategoryName: null },
            { AId: 0, Answer: '', IsCorrect: false, MatchLeft: null, MatchRight: null, CategoryName: null }
          ];

      return;
    }

    const wasTrueFalse =
      this.editingQuestionAnswers.length === 2 &&
      this.editingQuestionAnswers.some(
        answer =>
          answer.Answer === 'Σωστό'
      ) &&
      this.editingQuestionAnswers.some(
        answer =>
          answer.Answer === 'Λάθος'
      );

    if (
      wasTrueFalse
    ) {

      this.editingQuestionAnswers = [
        {
          AId: 0,
          Answer: '',
          IsCorrect: false
        },
        {
          AId: 0,
          Answer: '',
          IsCorrect: false
        },
        {
          AId: 0,
          Answer: '',
          IsCorrect: false
        }
      ];
    }
  }


  saveQuizQuestions(): void {

    if (
      !this.selectedQuizTheory
    ) {

      this.notificationService.warning(
        'Επέλεξε θεωρία'
      );

      return;
    }


    const validQuestions =
      this.quizQuestions

        .map(question => {

          const questionHtml =
            this.getQuizQuestionHtml(
              question
            );


          return {

            question,

            questionHtml
          };
        })

        .filter(item =>
          this.htmlHasContent(
            item.questionHtml
          )
        )

        .map(item => ({

          questionText:
            item.questionHtml,

          difficulty:
            item.question.Difficulty,

          questionType:
            item.question.QuestionType,

          media:
            this.getQuestionMedia(
              item.question
            ).filter(
              media =>
                item.questionHtml.includes(
                  media.MediaUrl
                )
            ),

          answers:
            item.question.Options

              .filter(answer =>
                item.question.QuestionType === 4
                  ? (
                    (answer.MatchLeft ?? '').trim().length > 0 &&
                    (answer.MatchRight ?? '').trim().length > 0
                  )
                  : item.question.QuestionType === 5
                    ? (
                      answer.Answer?.trim().length > 0 &&
                      (answer.CategoryName ?? '').trim().length > 0
                    )
                    : answer.Answer?.trim().length > 0
              )

              .map(answer => ({

                text:
                  item.question.QuestionType === 4
                    ? ''
                    : answer.Answer.trim(),

                isCorrect:
                  item.question.QuestionType === 3 ||
                    item.question.QuestionType === 4 ||
                    item.question.QuestionType === 5
                    ? false
                    : answer.IsCorrect,

                matchLeft:
                  item.question.QuestionType === 4
                    ? (answer.MatchLeft ?? '').trim()
                    : null,

                matchRight:
                  item.question.QuestionType === 4
                    ? (answer.MatchRight ?? '').trim()
                    : null,

                categoryName:
                  item.question.QuestionType === 5
                    ? (answer.CategoryName ?? '').trim()
                    : null
              }))
        }));


    if (
      validQuestions.length === 0
    ) {

      this.notificationService.warning(
        'Συμπλήρωσε τουλάχιστον μία ερώτηση'
      );

      return;
    }


    for (
      const question
      of validQuestions
    ) {

      if (
        question.questionType === 3
      ) {

        if (
          question.answers.length < 2
        ) {

          this.notificationService.warning(
            'Η ερώτηση Σειρά πρέπει να έχει τουλάχιστον 2 βήματα.'
          );

          return;
        }

        continue;
      }

      if (
        question.questionType === 4
      ) {

        if (
          question.answers.length < 2
        ) {

          this.notificationService.warning(
            'Η ερώτηση Αντιστοίχισης πρέπει να έχει τουλάχιστον 2 ολοκληρωμένα ζευγάρια.'
          );

          return;
        }

        continue;
      }

      if (
        question.questionType === 5
      ) {

        if (
          question.answers.length < 2
        ) {
          this.notificationService.warning(
            'Η ερώτηση Κατηγοριοποίησης πρέπει να έχει τουλάχιστον 2 κάρτες.'
          );
          return;
        }

        const categories = new Set(
          question.answers.map(answer =>
            (answer.categoryName ?? '').trim().toLowerCase()
          )
        );

        if (categories.size < 2) {
          this.notificationService.warning(
            'Η ερώτηση Κατηγοριοποίησης πρέπει να έχει τουλάχιστον 2 διαφορετικές κατηγορίες.'
          );
          return;
        }

        continue;
      }

      if (
        question.answers.length === 0
      ) {

        this.notificationService.warning(
          'Συμπλήρωσε τουλάχιστον μία απάντηση'
        );

        return;
      }

      const hasValidCorrectAnswer =
        question.answers.some(
          answer =>
            answer.isCorrect
        );

      if (
        !hasValidCorrectAnswer
      ) {

        this.notificationService.warning(
          'Επέλεξε έγκυρη σωστή απάντηση'
        );

        return;
      }
    }


    const body = {

      thematologiaId:
        this.thematologiaId,

      theoriaDetId:
        this.selectedQuizTheory.DetId,

      questions:
        validQuestions
    };


    this.http
      .post<ApiResponse>(
        'api/Service/SaveQnA',
        body
      )
      .subscribe({

        next: () => {

          this.notificationService.success(
            'Επιτυχής αποθήκευση'
          );


          this.loadQuizQuestionsCount();


          this.loadExistingQuestions(
            this.selectedQuizTheory!
          );


          this.resetNewQuizQuestions();
        },


        error: err => {

          console.error(
            'Save quiz error:',
            err
          );


          this.notificationService.error(
            'Σφάλμα αποθήκευσης'
          );
        }

      });
  }


  private resetNewQuizQuestions():
    void {

    this.quizQuestionEditors =
      new WeakMap<object, Quill>();


    this.quizQuestionMedia =
      new WeakMap<object, QuestionMedia[]>();


    this.quizQuestions = [

      this.createEmptyQuizQuestion()

    ];
  }


  private createEmptyQuizQuestion():
    QuizQuestionView {

    return {
      Question: '',
      Difficulty: 1,
      QuestionType: 1,
      Media: [],
      Options: [
        {
          Answer: '',
          IsCorrect: false,
          MatchLeft: null,
          MatchRight: null,
          CategoryName: null
        },
        {
          Answer: '',
          IsCorrect: false,
          MatchLeft: null,
          MatchRight: null,
          CategoryName: null
        },
        {
          Answer: '',
          IsCorrect: false,
          MatchLeft: null,
          MatchRight: null,
          CategoryName: null
        }
      ]
    };
  }


  editExistingQuestion(
    question: ExistingQuizQuestion
  ): void {

    this.editingQuestionQuill =
      null;


    this.editingQuestionMedia =
      this.normalizeQuestionMedia(
        question.Media ?? [],
        question.Question
      );


    this.editingQuestion =
      question;


    this.editingQuestionText =
      question.Question;


    this.editingQuestionDifficulty =
      question.Difficulty ??
      1;


    this.editingQuestionType =
      question.QuestionType ??
      1;


    this.editingQuestionAnswers =
      question.Answers.map(
        answer => ({

          AId:
            answer.AId,

          Answer:
            answer.Answer,

          IsCorrect:
            this.editingQuestionType === 3 ||
              this.editingQuestionType === 4 ||
              this.editingQuestionType === 5
              ? false
              : answer.IsCorrect,

          MatchLeft:
            answer.MatchLeft ?? null,

          MatchRight:
            answer.MatchRight ?? null,

          CategoryName:
            answer.CategoryName ?? null
        })
      );
  }


  cancelEditExistingQuestion():
    void {

    this.editingQuestionQuill =
      null;


    this.editingQuestionMedia =
      [];


    this.editingQuestion =
      null;


    this.editingQuestionText =
      '';


    this.editingQuestionAnswers =
      [];


    this.editingQuestionDifficulty =
      1;


    this.editingQuestionType =
      1;
  }


  addExistingAnswer():
    void {

    this.editingQuestionAnswers.push({

      AId: 0,

      Answer: '',

      IsCorrect: false,

      MatchLeft: null,

      MatchRight: null,

      CategoryName: null
    });
  }


  removeExistingAnswer(
    index: number
  ): void {

    this.editingQuestionAnswers.splice(
      index,
      1
    );
  }


  selectCorrectExistingAnswer(
    selectedAnswer:
      ExistingQuizAnswer
  ): void {

    this.editingQuestionAnswers.forEach(
      answer => {

        answer.IsCorrect =
          false;
      }
    );


    selectedAnswer.IsCorrect =
      true;
  }


  updateExistingQuestion():
    void {

    if (
      !this.editingQuestion
    ) {
      return;
    }


    const currentQuestionHtml =
      this.getEditingQuestionHtml();


    if (
      !this.htmlHasContent(
        currentQuestionHtml
      )
    ) {

      this.notificationService.warning(
        'Συμπλήρωσε την ερώτηση'
      );

      return;
    }


    const validAnswers =
      this.editingQuestionAnswers

        .filter(answer =>
          this.editingQuestionType === 4
            ? (
              (answer.MatchLeft ?? '').trim().length > 0 &&
              (answer.MatchRight ?? '').trim().length > 0
            )
            : this.editingQuestionType === 5
              ? (
                answer.Answer?.trim().length > 0 &&
                (answer.CategoryName ?? '').trim().length > 0
              )
              : answer.Answer?.trim().length > 0
        )

        .map(
          answer => ({

            Answer:
              this.editingQuestionType === 4
                ? ''
                : answer.Answer.trim(),

            IsCorrect:
              this.editingQuestionType === 3 ||
                this.editingQuestionType === 4 ||
                this.editingQuestionType === 5
                ? false
                : answer.IsCorrect,

            MatchLeft:
              this.editingQuestionType === 4
                ? (answer.MatchLeft ?? '').trim()
                : null,

            MatchRight:
              this.editingQuestionType === 4
                ? (answer.MatchRight ?? '').trim()
                : null,

            CategoryName:
              this.editingQuestionType === 5
                ? (answer.CategoryName ?? '').trim()
                : null
          })
        );


    if (
      this.editingQuestionType === 2 &&
      (
        validAnswers.length !== 2 ||
        !validAnswers.some(
          answer =>
            answer.Answer === 'Σωστό'
        ) ||
        !validAnswers.some(
          answer =>
            answer.Answer === 'Λάθος'
        )
      )
    ) {

      this.notificationService.warning(
        'Η ερώτηση Σωστό / Λάθος πρέπει να έχει τις απαντήσεις Σωστό και Λάθος.'
      );

      return;
    }


    if (
      this.editingQuestionType === 3 &&
      validAnswers.length < 2
    ) {

      this.notificationService.warning(
        'Η ερώτηση Σειρά πρέπει να έχει τουλάχιστον 2 βήματα.'
      );

      return;
    }


    if (
      this.editingQuestionType === 4 &&
      validAnswers.length < 2
    ) {

      this.notificationService.warning(
        'Η ερώτηση Αντιστοίχισης πρέπει να έχει τουλάχιστον 2 ολοκληρωμένα ζευγάρια.'
      );

      return;
    }


    if (
      this.editingQuestionType === 5
    ) {

      if (validAnswers.length < 2) {
        this.notificationService.warning(
          'Η ερώτηση Κατηγοριοποίησης πρέπει να έχει τουλάχιστον 2 κάρτες.'
        );
        return;
      }

      const categories = new Set(
        validAnswers.map(answer =>
          (answer.CategoryName ?? '').trim().toLowerCase()
        )
      );

      if (categories.size < 2) {
        this.notificationService.warning(
          'Η ερώτηση Κατηγοριοποίησης πρέπει να έχει τουλάχιστον 2 διαφορετικές κατηγορίες.'
        );
        return;
      }
    }

    if (
      validAnswers.length === 0
    ) {

      this.notificationService.warning(
        'Συμπλήρωσε τουλάχιστον μία απάντηση'
      );

      return;
    }


    const hasValidCorrectAnswer =
      validAnswers.some(
        answer =>
          answer.IsCorrect
      );


    if (
      this.editingQuestionType !== 3 &&
      this.editingQuestionType !== 4 &&
      this.editingQuestionType !== 5 &&
      !hasValidCorrectAnswer
    ) {

      this.notificationService.warning(
        'Επέλεξε έγκυρη σωστή απάντηση'
      );

      return;
    }


    const body:
      UpdateQuizQuestionRequest = {

      Id:
        this.editingQuestion.Id,

      DetId:
        this.editingQuestion.DetId,

      QId:
        this.editingQuestion.QId,

      Question:
        currentQuestionHtml,

      Difficulty:
        this.editingQuestionDifficulty,

      QuestionType:
        this.editingQuestionType,

      Answers:
        validAnswers,

      Media:
        this.editingQuestionMedia.filter(
          media =>
            currentQuestionHtml.includes(
              media.MediaUrl
            )
        )
    };


    this.http
      .post<ApiResponse>(
        'api/Service/UpdateQuestion',
        body
      )
      .subscribe({

        next: () => {

          this.notificationService.success(
            'Η ερώτηση ενημερώθηκε'
          );


          if (
            this.selectedQuizTheory
          ) {

            this.loadExistingQuestions(
              this.selectedQuizTheory
            );
          }


          this.cancelEditExistingQuestion();
        },


        error: err => {

          console.error(
            'Update question error:',
            err
          );


          this.notificationService.error(
            'Σφάλμα ενημέρωσης ερώτησης'
          );
        }

      });
  }


  deleteExistingQuestion(
    question:
      ExistingQuizQuestion
  ): void {

    if (
      !confirm(
        'Να διαγραφεί αυτή η ερώτηση;'
      )
    ) {
      return;
    }


    this.http
      .post<ApiResponse>(
        `api/Service/DeleteQuestion/${question.Id}/${question.DetId}/${question.QId}`,
        {}
      )
      .subscribe({

        next: response => {

          if (
            !response.IsSuccess
          ) {

            this.notificationService.error(
              response.Message ||
              'Η διαγραφή απέτυχε'
            );

            return;
          }


          this.notificationService.success(
            'Η ερώτηση διαγράφηκε'
          );


          this.loadQuizQuestionsCount();


          if (
            this.selectedQuizTheory
          ) {

            this.loadExistingQuestions(
              this.selectedQuizTheory
            );
          }
        },


        error: err => {

          console.error(
            'Delete question error:',
            err
          );


          this.notificationService.error(
            'Σφάλμα διαγραφής ερώτησης'
          );
        }

      });
  }


  saveQuizSettings(): void {

    if (
      this.quizQuestionCount <= 0
    ) {

      this.notificationService.warning(
        'Ο αριθμός ερωτήσεων πρέπει να είναι μεγαλύτερος από 0.'
      );

      return;
    }


    if (
      this.quizQuestionCount >
      this.totalQuizQuestions
    ) {

      this.notificationService.warning(
        `Υπάρχουν μόνο ${this.totalQuizQuestions} διαθέσιμες ερωτήσεις.`
      );

      return;
    }


    if (
      this.useQuizDifficulty &&
      ![
        1,
        2,
        3
      ].includes(
        Number(
          this.quizDifficultyPercent
        )
      )
    ) {

      this.notificationService.warning(
        'Επίλεξε έγκυρη δυσκολία quiz.'
      );

      return;
    }


    const body = {

      ThematologiaId:
        this.thematologiaId,

      QuizQuestionCount:
        Number(
          this.quizQuestionCount
        ),

      UseQuizDifficulty:
        this.useQuizDifficulty,

      QuizDifficultyPercent:
        Number(
          this.quizDifficultyPercent
        )
    };


    this.http
      .post<ApiResponse>(
        'api/Service/UpdateQuizSettings',
        body
      )
      .subscribe({

        next: res => {

          if (
            res.IsSuccess
          ) {

            this.notificationService.success(
              res.Message ||
              'Οι ρυθμίσεις quiz αποθηκεύτηκαν.'
            );


            this.loadThematologies();

            this.loadQuizQuestionsCount();

          } else {

            this.notificationService.warning(
              res.Message ||
              'Κάτι πήγε λάθος.'
            );
          }
        },


        error: err => {

          console.error(
            'Save quiz settings error:',
            err
          );


          this.notificationService.error(
            'Σφάλμα αποθήκευσης ρυθμίσεων quiz.'
          );
        }

      });
  }


  downloadQuizExcelTemplate():
    void {

    this.http
      .get(
        'api/Service/DownloadQuizTemplate',
        {
          responseType:
            'blob'
        }
      )
      .subscribe({

        next: blob => {

          const url =
            window.URL.createObjectURL(
              blob
            );


          const a =
            document.createElement(
              'a'
            );


          a.href =
            url;


          a.download =
            'QuizTemplate.xlsx';


          document.body.appendChild(
            a
          );


          a.click();


          document.body.removeChild(
            a
          );


          window.URL.revokeObjectURL(
            url
          );
        },


        error: err => {

          console.error(
            err
          );


          this.notificationService.error(
            'Αποτυχία λήψης προτύπου Excel'
          );
        }

      });
  }


  openQuizExcelImport():
    void {

    this.quizExcelInput
      .nativeElement
      .click();
  }


  onQuizExcelSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;


    if (
      !input.files ||
      input.files.length === 0
    ) {
      return;
    }


    const file =
      input.files[0];


    if (
      !file.name
        .toLowerCase()
        .endsWith(
          '.xlsx'
        )
    ) {

      this.notificationService.warning(
        'Επίλεξε αρχείο Excel (.xlsx)'
      );


      input.value =
        '';


      return;
    }


    const formData =
      new FormData();


    formData.append(
      'file',
      file
    );


    this.loader.show();


    this.http
      .post<ApiResponse>(
        `api/Service/ImportQuizExcel/${this.thematologiaId}`,
        formData
      )
      .subscribe({

        next: res => {

          if (
            res.IsSuccess
          ) {

            this.notificationService.success(
              res.Message ||
              'Το Excel εισήχθη επιτυχώς'
            );


            this.loadThematologies();

            this.loadQuizQuestionsCount();


            if (
              this.selectedQuizTheory
            ) {

              this.loadExistingQuestions(
                this.selectedQuizTheory
              );
            }


            this.loader.hide();

          } else {

            this.loader.hide();


            this.notificationService.warning(
              res.Message ||
              'Το Excel δεν εισήχθη'
            );
          }


          input.value =
            '';
        },


        error: err => {

          this.loader.hide();


          console.error(
            'Import quiz excel error:',
            err
          );


          this.notificationService.error(
            'Σφάλμα εισαγωγής Excel'
          );


          input.value =
            '';
        }

      });
  }


  openQuizSuggestions():
    void {

    this.http
      .get<any>(
        `api/Service/GetQuizSuggestions/${this.thematologiaId}`
      )
      .subscribe({

        next: res => {

          if (
            res.IsSuccess ||
            res.isSuccess
          ) {

            this.quizSuggestions =
              res.Suggestions ||
              res.suggestions ||
              [];


            this.showQuizSuggestionsPopup =
              true;

          } else {

            this.notificationService.warning(
              res.Message ||
              res.message
            );
          }
        },


        error: err => {

          console.error(
            'Quiz suggestions error:',
            err
          );


          this.notificationService.error(
            'Σφάλμα φόρτωσης προτεινόμενων quiz.'
          );
        }

      });
  }


  closeQuizSuggestions():
    void {

    this.showQuizSuggestionsPopup =
      false;
  }


  toggleSuggestionQuestions(
    index: number
  ): void {

    this.expandedSuggestionIndex =
      this.expandedSuggestionIndex ===
        index
        ? null
        : index;
  }


  applyQuizSuggestion(
    suggestion: any
  ): void {

    this.quizQuestionCount =
      suggestion.QuestionCount ||
      suggestion.questionCount;


    this.quizDifficultyPercent =
      suggestion.Difficulty ||
      suggestion.difficulty;


    this.useQuizDifficulty =
      true;


    this.showQuizSuggestionsPopup =
      false;


    this.notificationService.success(
      'Η πρόταση εφαρμόστηκε. Πάτησε αποθήκευση για να αποθηκευτεί.'
    );
  }


  goBack(): void {

    this.router.navigate(
      [
        '/mainpage'
      ]
    );
  }


  ngOnDestroy(): void {

    this.imageResizeManager.destroy();


    this.newTheoryQuill =
      null;


    this.editingTheoryQuill =
      null;


    this.editingQuestionQuill =
      null;


    this.quizQuestionEditors =
      new WeakMap<object, Quill>();


    this.quizQuestionMedia =
      new WeakMap<object, QuestionMedia[]>();


    this.editingQuestionMedia =
      [];
  }
}
