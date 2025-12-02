/**
 * @author Recipio Team
 * @description ElysiaJS plugins and reusable app configurations
 */

import { Elysia } from 'elysia';

/**
 * Base plugin with common configurations
 */
export const basePlugin = new Elysia().derive(() => ({
  // Add common derived properties here
  timestamp: Date.now(),
}));

