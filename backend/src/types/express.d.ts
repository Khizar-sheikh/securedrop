import { PublicUser } from '../modules/users/user.presenter';

declare global {
  namespace Express {
    interface Request {
      /** Set by AccessTokenGuard after a verified access token. */
      user?: PublicUser;
    }
  }
}

export {};
