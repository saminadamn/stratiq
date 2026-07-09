import type { Request, Response } from 'express';
import { z } from 'zod';
import type { SignupUseCase } from '../../../application/auth/signup.use-case.js';
import type { LoginUseCase } from '../../../application/auth/login.use-case.js';
import type { RefreshSessionUseCase } from '../../../application/auth/refresh-session.use-case.js';
import type { LogoutUseCase } from '../../../application/auth/logout.use-case.js';
import type { GetCurrentUserUseCase } from '../../../application/auth/get-current-user.use-case.js';
import { asyncHandler } from '../utils/async-handler.js';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  name: z.string().min(1),
  organizationName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export interface AuthControllerDeps {
  signup: SignupUseCase;
  login: LoginUseCase;
  refresh: RefreshSessionUseCase;
  logout: LogoutUseCase;
  getCurrentUser: GetCurrentUserUseCase;
}

// A thin translation layer: parse HTTP input, call one use case, shape the HTTP
// response. No business rules live here — they're all in `application/`.
export function createAuthController(deps: AuthControllerDeps) {
  return {
    signup: asyncHandler(async (req: Request, res: Response) => {
      const input = signupSchema.parse(req.body);
      const result = await deps.signup.execute(input);
      res.status(201).json(result);
    }),

    login: asyncHandler(async (req: Request, res: Response) => {
      const input = loginSchema.parse(req.body);
      const result = await deps.login.execute(input);
      res.status(200).json(result);
    }),

    refresh: asyncHandler(async (req: Request, res: Response) => {
      const { refreshToken } = refreshSchema.parse(req.body);
      const tokens = await deps.refresh.execute(refreshToken);
      res.status(200).json(tokens);
    }),

    logout: asyncHandler(async (req: Request, res: Response) => {
      const { refreshToken } = refreshSchema.parse(req.body);
      await deps.logout.execute(refreshToken);
      res.status(204).send();
    }),

    me: asyncHandler(async (req: Request, res: Response) => {
      // req.userId is guaranteed set here — this route is only reachable behind
      // the `authenticate` middleware (see auth.routes.ts).
      const result = await deps.getCurrentUser.execute(req.userId as string);
      if (!result) {
        res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found.' } });
        return;
      }
      res.status(200).json(result);
    }),
  };
}
