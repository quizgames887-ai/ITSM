/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_actions from "../ai/actions.js";
import type * as analytics from "../analytics.js";
import type * as announcements from "../announcements.js";
import type * as assignmentRules from "../assignmentRules.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as comments from "../comments.js";
import type * as cron from "../cron.js";
import type * as email from "../email.js";
import type * as events from "../events.js";
import type * as forms from "../forms.js";
import type * as knowledgeBase from "../knowledgeBase.js";
import type * as notifications from "../notifications.js";
import type * as security from "../security.js";
import type * as serviceCatalog from "../serviceCatalog.js";
import type * as sla from "../sla.js";
import type * as suggestions from "../suggestions.js";
import type * as teams from "../teams.js";
import type * as tickets from "../tickets.js";
import type * as todos from "../todos.js";
import type * as translations from "../translations.js";
import type * as users from "../users.js";
import type * as votes from "../votes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/actions": typeof ai_actions;
  analytics: typeof analytics;
  announcements: typeof announcements;
  assignmentRules: typeof assignmentRules;
  audit: typeof audit;
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  comments: typeof comments;
  cron: typeof cron;
  email: typeof email;
  events: typeof events;
  forms: typeof forms;
  knowledgeBase: typeof knowledgeBase;
  notifications: typeof notifications;
  security: typeof security;
  serviceCatalog: typeof serviceCatalog;
  sla: typeof sla;
  suggestions: typeof suggestions;
  teams: typeof teams;
  tickets: typeof tickets;
  todos: typeof todos;
  translations: typeof translations;
  users: typeof users;
  votes: typeof votes;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
