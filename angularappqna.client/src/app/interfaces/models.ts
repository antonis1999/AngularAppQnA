export interface LoginRequest {
  Email?: string;
  Pin?: string;
  Nickname?: string;
  StoreId?: number;
}

export interface LoginResponse {
  IsSuccess: boolean;
  Message: string;
  IsNewUser: boolean;
  User: User;
}

export interface User {
  Id: number;
  Email: string;
  PasswordSha256?: string;
  Nickname: string;
  StoreId: number;
  RoleId: number;
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
  quizQuestionCount?: number;
  QuizDifficultyPercent?: number;
  quizDifficultyPercent?: number;
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
  answer: string;
  is_correct: boolean;
}

export interface QuizQuestionView {
  QId?: number;
  question: string;
  options: QuizOption[];
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
}
export interface Ranking {
  Nickname: string;
  CorrectAnswers: number;
  TotalQuestions: number;
  Percentage: number;
  TotalSeconds: number;
  CreateDate: string;
  Points?: number;
  points?: number;
}
export interface QuizAttemptDetail {
  Nickname: string;
  CorrectAnswers: number;
  TotalQuestions: number;
  Percentage: number;
  TotalTimeSeconds: number;
  CreateDate: string;
}
