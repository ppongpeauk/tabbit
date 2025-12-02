/**
 * @author Recipio Team
 * @description Authentication data models and validation schemas
 */

import { t } from 'elysia';

export const loginSchema = t.Object({
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 8 }),
});

export const registerSchema = t.Object({
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 8 }),
  name: t.String({ minLength: 1 }),
});

export type LoginDto = typeof loginSchema.static;
export type RegisterDto = typeof registerSchema.static;

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  message?: string;
}

