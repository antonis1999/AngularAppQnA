export interface Models {
}

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

export interface QuizTheory {
  id: number;
  DetId: number;
  Header: string;
  Details: string;
  Username: string;
  CreateDate: Date;
}

export interface QuizQuestion {
  Id: number;
  DetId: number;
  QuestionText: string;
  Username: string;
  CreateDate: Date;
}
export interface QuizOption {
  answer: string;
  is_correct: boolean;
}

export interface QuizQuestionView {
  Qid?: number;
  question: string;
  options: QuizOption[];
}

export interface QuizTheoryView {
  theory_detId: number;
  theory_descr: string;
  question: QuizQuestionView[];
}
