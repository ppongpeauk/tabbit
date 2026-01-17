import { t } from 'elysia';

export const createUserSchema = t.Object({
  email: t.String({ format: 'email' }),
  name: t.String({ minLength: 1 }),
});

export const updateUserSchema = t.Partial(
  t.Object({
    email: t.String({ format: 'email' }),
    name: t.String({ minLength: 1 }),
    image: t.Union([t.String(), t.Null()]),
  })
);

export type CreateUserDto = typeof createUserSchema.static;
export type UpdateUserDto = typeof updateUserSchema.static;

export interface User {
  id: string;
  email: string;
  name: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserResponse {
  success: boolean;
  user?: User;
  users?: User[];
  message?: string;
}

