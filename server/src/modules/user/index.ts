/**
 * @author Recipio Team
 * @description User module routes and handlers
 */

import { Elysia, t } from 'elysia';
import { userService } from './service';
import { createUserSchema, updateUserSchema } from './model';

export const userModule = new Elysia({ prefix: '/users' })
  .get(
    '/',
    async ({ set }) => {
      const result = await userService.getAllUsers();
      set.status = 200;
      return result;
    },
    {
      detail: {
        tags: ['user'],
        summary: 'Get all users',
        description: 'Retrieve a list of all users',
      },
    }
  )
  .get(
    '/:id',
    async ({ params: { id }, set }) => {
      const result = await userService.getUserById(id);

      if (!result.success) {
        set.status = 404;
        return result;
      }

      set.status = 200;
      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['user'],
        summary: 'Get user by ID',
        description: 'Retrieve a specific user by their ID',
      },
    }
  )
  .post(
    '/',
    async ({ body, set }) => {
      const result = await userService.createUser(body);

      if (!result.success) {
        set.status = 400;
        return result;
      }

      set.status = 201;
      return result;
    },
    {
      body: createUserSchema,
      detail: {
        tags: ['user'],
        summary: 'Create new user',
        description: 'Create a new user account',
      },
    }
  )
  .put(
    '/:id',
    async ({ params: { id }, body, set }) => {
      const result = await userService.updateUser(id, body);

      if (!result.success) {
        set.status = 404;
        return result;
      }

      set.status = 200;
      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: updateUserSchema,
      detail: {
        tags: ['user'],
        summary: 'Update user',
        description: 'Update an existing user by ID',
      },
    }
  )
  .delete(
    '/:id',
    async ({ params: { id }, set }) => {
      const result = await userService.deleteUser(id);

      if (!result.success) {
        set.status = 404;
        return result;
      }

      set.status = 200;
      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['user'],
        summary: 'Delete user',
        description: 'Delete a user by ID',
      },
    }
  );

