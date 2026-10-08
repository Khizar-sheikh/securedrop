export interface PublicUser {
  id: string;
  email: string;
  status: string;
  createdAt: string;
}

export interface SessionPayload {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: PublicUser | null;
}
