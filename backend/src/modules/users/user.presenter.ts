export interface PublicUser {
  id: string;
  email: string;
  status: string;
  createdAt: Date;
}

/** Shapes a user for API responses — password hash never leaves the service. */
export const toPublicUser = (user: { id: string; email: string; status: unknown; createdAt: Date }): PublicUser => ({
  id: user.id,
  email: user.email,
  status: String(user.status),
  createdAt: user.createdAt,
});
