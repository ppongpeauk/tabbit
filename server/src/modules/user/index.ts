/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description User management routes
 */

import { Elysia, t } from "elysia";
import { userService } from "./service";
import { createUserSchema, updateUserSchema } from "./model";
import { HTTP_STATUS } from "../../utils/constants";
import { handleServiceResult } from "../../utils/route-helpers";

export const userModule = new Elysia({ prefix: "/users" })
  .get(
    "/",
    async ({ set }) => {
      const result = await userService.getAllUsers();
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.OK
      );
      set.status = status;
      return response;
    },
    {
      detail: {
        tags: ["user"],
        summary: "Get all users",
        description: "Retrieve a list of all users",
      },
    }
  )
  .get(
    "/:id",
    async ({ params: { id }, set }) => {
      const result = await userService.getUserById(id);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.OK,
        HTTP_STATUS.NOT_FOUND
      );
      set.status = status;
      return response;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["user"],
        summary: "Get user by ID",
        description: "Retrieve a specific user by their ID",
      },
    }
  )
  .post(
    "/",
    async ({ body, set }) => {
      const result = await userService.createUser(body);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.CREATED
      );
      set.status = status;
      return response;
    },
    {
      body: createUserSchema,
      detail: {
        tags: ["user"],
        summary: "Create new user",
        description: "Create a new user account",
      },
    }
  )
  .put(
    "/:id",
    async ({ params: { id }, body, set }) => {
      const result = await userService.updateUser(id, body);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.OK,
        HTTP_STATUS.NOT_FOUND
      );
      set.status = status;
      return response;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: updateUserSchema,
      detail: {
        tags: ["user"],
        summary: "Update user",
        description: "Update an existing user by ID",
      },
    }
  )
  .delete(
    "/:id",
    async ({ params: { id }, set }) => {
      const result = await userService.deleteUser(id);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.OK,
        HTTP_STATUS.NOT_FOUND
      );
      set.status = status;
      return response;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["user"],
        summary: "Delete user",
        description: "Delete a user by ID",
      },
    }
  );
