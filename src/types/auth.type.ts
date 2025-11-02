export interface LoginInput {
  username: string;
  password: string;
}

export interface JwtPayload {
  sub: string; // username
}
