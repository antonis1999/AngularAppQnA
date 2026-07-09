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
}

export interface QuizQuestionView {
  QId?: number;
  Question: string;
  Options: QuizOption[];
  Difficulty: number;
}

export interface ExistingQuizAnswer {
  AId: number;
  Answer: string;
  IsCorrect: boolean;
}

export interface ExistingQuizQuestion {
  Id: number;
  DetId: number;
  QId: number;
  Question: string;
  Username: string;
  CreateDate: string;
  Difficulty: number;
  Answers: ExistingQuizAnswer[];
}

export interface UpdateQuizAnswerRequest {
  Answer: string;
  IsCorrect: boolean;
}

export interface UpdateQuizQuestionRequest {
  Id: number;
  DetId: number;
  QId: number;
  Question: string;
  Difficulty: number;
  Answers: UpdateQuizAnswerRequest[];
}

export interface QuizPreviewAnswer {
  AId: number;
  Answer: string;
  IsCorrect: boolean;
}

export interface QuizPreviewQuestion {
  Id: number;
  DetId: number;
  QId: number;
  Question: string;
  Answers: QuizPreviewAnswer[];
  Difficulty: number;
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
