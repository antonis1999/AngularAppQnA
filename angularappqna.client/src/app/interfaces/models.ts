export interface LoginRequest {
  Email?: string;
  Pin?: string;
  Nickname?: string;
  StoreId?: number;
  IsFirstLogin?: boolean;
}

export interface LoginResponse {
  IsSuccess: boolean;
  Message: string;
  IsNewUser: boolean;
  Token: string;
  User: User;
}

export interface User {
  Id: number;
  Email: string;
  PasswordSha256?: string;
  Nickname?: string;
  StoreId?: number;
  RoleId: number;
  IsActive: boolean;
  CreatedAt: Date;
}

export interface ApiResponse {
  IsSuccess: boolean;
  Message: string;
}

export interface Thematologia {
  Id: number;
  Title: string;
  FromDate: string;
  ToDate: string;
  QuizQuestionCount?: number;
  QuizDifficultyPercent?: number;
}

export interface QuizTheory {
  Id: number;
  DetId: number;
  Header: string;
  Details: string;
  Username: string;
  CreateDate: Date;
}

export interface QuizOption {
  Answer: string;
  IsCorrect: boolean;
  MatchLeft?: string | null;
  MatchRight?: string | null;
  CategoryName?: string | null;
}

export interface QuestionMedia {
  MediaUrl: string;
  BlobName?: string | null;
  MediaType: 'image' | 'video';
}

export interface QuizQuestionView {
  QId?: number;
  Question: string;
  Options: QuizOption[];
  Difficulty: number;
  QuestionType: number;
  Media: QuestionMedia[];
}

export interface ExistingQuizAnswer {
  AId: number;
  Answer: string;
  IsCorrect: boolean;
  MatchLeft?: string | null;
  MatchRight?: string | null;
  CategoryName?: string | null;
}

export interface ExistingQuizQuestion {
  Id: number;
  DetId: number;
  QId: number;
  Question: string;
  Username: string;
  CreateDate: string;
  Difficulty: number;
  QuestionType: number;
  Answers: ExistingQuizAnswer[];
  Media: QuestionMedia[];
}

export interface UpdateQuizAnswerRequest {
  Answer: string;
  IsCorrect: boolean;
  MatchLeft?: string | null;
  MatchRight?: string | null;
  CategoryName?: string | null;
}

export interface UpdateQuizQuestionRequest {
  Id: number;
  DetId: number;
  QId: number;
  Question: string;
  Difficulty: number;
  QuestionType: number;
  Answers: UpdateQuizAnswerRequest[];
  Media: QuestionMedia[];
}

export interface QuizPreviewAnswer {
  AId: number;
  Answer: string;
  IsCorrect: boolean;
  MatchLeft?: string | null;
  MatchRight?: string | null;
  CategoryName?: string | null;
}

export interface QuizPreviewQuestion {
  Id: number;
  DetId: number;
  QId: number;
  Question: string;
  Answers: QuizPreviewAnswer[];
  Difficulty: number;
  QuestionType: number;
  Details?: string;
}

export interface Ranking {
  Nickname: string;
  CorrectAnswers: number;
  TotalQuestions: number;
  Percentage: number;
  TotalSeconds: number;
  CreateDate: string;
  Points?: number;
}

export interface QuizAttemptDetail {
  Nickname: string;
  CorrectAnswers: number;
  TotalQuestions: number;
  Points: number;
  QuizDifficulty: number;
  QuizDifficultyLabel: string;
  Percentage: number;
  TotalTimeSeconds: number;
  CreateDate: string;
}

export interface UploadEditorImageResponse {
  IsSuccess?: boolean;
  Message?: string;
  ImageUrl?: string;
  BlobName?: string;
}

export interface MatchingPairProgress {
  leftAId: number;
  rightAId: number;
}

export interface CategorizationAssignmentProgress {
  answerId: number;
  categoryName: string;
}

export interface QuizProgressAnswer {
  questionId: number;
  answerId: number | null;
  orderedAnswerIds?: number[];
  matchingPairs?: MatchingPairProgress[];
  categorizationAssignments?: CategorizationAssignmentProgress[];
}

export interface QuizProgress {
  thematologiaId: number;
  questions: QuizPreviewQuestion[];
  currentQuestionIndex: number;
  selectedAnswerId: number | null;
  answers: QuizProgressAnswer[];
  questionTimes: number[];
  timeLeft: number;
  quizStartTime: number;
  questionStartTime: number;
  showReview: boolean;
  currentOrderingAnswerIds?: number[];
  currentMatchingPairs?: MatchingPairProgress[];
  currentMatchingRightAnswerIds?: number[];
  selectedMatchingLeftId?: number | null;
  currentCategorizationAssignments?: CategorizationAssignmentProgress[];
  currentCategorizationCardIds?: number[];
  selectedCategorizationCardId?: number | null;
  savedAt: number;
}
