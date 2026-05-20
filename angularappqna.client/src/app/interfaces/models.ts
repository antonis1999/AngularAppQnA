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
