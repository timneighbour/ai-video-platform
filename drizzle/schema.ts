import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, longtext } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Subscription plans table
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  plan: mysqlEnum("plan", ["starter", "pro", "business"]).notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }).unique(),
  status: mysqlEnum("status", ["active", "canceled", "past_due", "unpaid"]).default("active").notNull(),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  canceledAt: timestamp("canceledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// Credits table (tracks credit balance per user)
export const credits = mysqlTable("credits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  balance: int("balance").default(0).notNull(),
  totalEarned: int("totalEarned").default(0).notNull(),
  totalSpent: int("totalSpent").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Credit = typeof credits.$inferSelect;
export type InsertCredit = typeof credits.$inferInsert;

// Credit transactions table (audit trail)
export const creditTransactions = mysqlTable("creditTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),
  type: mysqlEnum("type", ["subscription_grant", "purchase", "usage", "refund", "deduction"]).notNull(),
  description: text("description"),
  projectId: int("projectId"),
  relatedTransactionId: varchar("relatedTransactionId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;

// Projects table (generated videos/outputs)
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  toolType: mysqlEnum("toolType", ["text_to_video", "lip_sync", "video_to_video", "voiceover", "musetalk_lip_sync", "seedance_t2v", "seedance_i2v"]).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  taskId: varchar("taskId", { length: 255 }).notNull(),
  apiProvider: varchar("apiProvider", { length: 64 }).notNull(),
  inputData: longtext("inputData"),
  outputUrl: varchar("outputUrl", { length: 1024 }),
  creditCost: int("creditCost").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// Music Video Jobs table
export const musicVideoJobs = mysqlTable("musicVideoJobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  audioUrl: varchar("audioUrl", { length: 1024 }).notNull(),
  audioKey: varchar("audioKey", { length: 512 }).notNull(),
  audioDuration: int("audioDuration").notNull(),
  themePrompt: text("themePrompt").notNull(),
  genre: varchar("genre", { length: 128 }),
  mood: varchar("mood", { length: 128 }),
  transcription: text("transcription"), // Full Whisper transcription text
  transcriptionStatus: varchar("transcriptionStatus", { length: 32 }).default("pending"), // pending | processing | done | failed
  characterImageUrl: varchar("characterImageUrl", { length: 1024 }), // Optional character/face photo for AI to use
  characterImageKey: varchar("characterImageKey", { length: 512 }), // S3 key for character image
  enableLipSync: boolean("enableLipSync").default(false), // Whether to apply lip sync to character scenes
  status: mysqlEnum("mvJobStatus", ["draft", "storyboard_ready", "rendering", "assembling", "completed", "failed"]).default("draft").notNull(),
  totalScenes: int("totalScenes").default(0).notNull(),
  completedScenes: int("completedScenes").default(0).notNull(),
  finalVideoUrl: varchar("finalVideoUrl", { length: 1024 }),
  finalVideoKey: varchar("finalVideoKey", { length: 512 }),
  creditCost: int("creditCost").default(0).notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MusicVideoJob = typeof musicVideoJobs.$inferSelect;
export type InsertMusicVideoJob = typeof musicVideoJobs.$inferInsert;

// Music Video Scenes table
export const musicVideoScenes = mysqlTable("musicVideoScenes", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  sceneIndex: int("sceneIndex").notNull(),
  startTime: int("startTime").notNull(),
  duration: int("duration").notNull(),
  prompt: text("prompt").notNull(),
  lyrics: text("lyrics"), // Transcribed lyrics for this scene's time window
  visualStyle: varchar("visualStyle", { length: 255 }),
  status: mysqlEnum("mvSceneStatus", ["pending", "generating", "completed", "failed"]).default("pending").notNull(),
  taskId: varchar("taskId", { length: 255 }),
  videoUrl: varchar("videoUrl", { length: 1024 }),
  videoKey: varchar("videoKey", { length: 512 }),
  errorMessage: text("errorMessage"),
  previewImageUrl: varchar("previewImageUrl", { length: 1024 }), // AI-generated storyboard preview image
  previewImageKey: varchar("previewImageKey", { length: 512 }),
  lipSync: boolean("lipSync").default(true).notNull(), // Per-scene lip sync control
  lipSyncStyle: mysqlEnum("lipSyncStyle", ["natural", "expressive", "subtle", "dramatic", "anime"]).default("natural").notNull(), // Lip sync animation style
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MusicVideoScene = typeof musicVideoScenes.$inferSelect;
export type InsertMusicVideoScene = typeof musicVideoScenes.$inferInsert;

// API Keys table (for Business plan users)
export const apiKeys = mysqlTable("apiKeys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;
// Video Characters table — up to 4 characters per job, each with a name and lip sync option
export const videoCharacters = mysqlTable("videoCharacters", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(), // references musicVideoJobs.id
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull().default("Character"),
  role: varchar("role", { length: 255 }), // e.g. "Lead Singer", "Dancer"
  enableLipSync: boolean("enableLipSync").default(false),
  slotIndex: int("slotIndex").notNull().default(0), // 0-3 for up to 4 characters
  // Character Lock — once locked, appearance is enforced across all scenes
  lockedDescription: text("lockedDescription"), // Full visual brief: clothing, hair, colours, accessories, etc.
  isLocked: boolean("isLocked").default(false), // When true, brief is enforced in every scene prompt
  lockedAt: timestamp("lockedAt"), // When the lock was applied
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type VideoCharacter = typeof videoCharacters.$inferSelect;
export type InsertVideoCharacter = typeof videoCharacters.$inferInsert;

// Video Character Photos table — multiple reference photos per character
export const videoCharacterPhotos = mysqlTable("videoCharacterPhotos", {
  id: int("id").autoincrement().primaryKey(),
  characterId: int("characterId").notNull(), // references videoCharacters.id
  jobId: int("jobId").notNull(), // denormalised for easier queries
  userId: int("userId").notNull(),
  photoUrl: varchar("photoUrl", { length: 1024 }).notNull(),
  photoKey: varchar("photoKey", { length: 512 }).notNull(),
  isPrimary: boolean("isPrimary").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VideoCharacterPhoto = typeof videoCharacterPhotos.$inferSelect;
export type InsertVideoCharacterPhoto = typeof videoCharacterPhotos.$inferInsert;

// ── Showcase Items ─────────────────────────────────────────────────────────────
// Pre-generated demo videos shown in the "See what creators are making" gallery.
// Managed by admins; served publicly on the homepage.
export const showcaseItems = mysqlTable("showcaseItems", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 64 }).notNull(), // e.g. "Kids YouTube"
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  posterUrl: varchar("posterUrl", { length: 1024 }).notNull(), // CDN URL for thumbnail
  videoUrl: varchar("videoUrl", { length: 1024 }), // CDN URL for MP4 (optional — poster shown if null)
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ShowcaseItem = typeof showcaseItems.$inferSelect;
export type InsertShowcaseItem = typeof showcaseItems.$inferInsert;

// ─── Suno Music Generation ──────────────────────────────────────────────────

export const sunoMusicTasks = mysqlTable("suno_music_tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  taskId: varchar("taskId", { length: 128 }).notNull(),
  title: varchar("title", { length: 120 }),
  prompt: text("prompt"),
  style: varchar("style", { length: 200 }),
  instrumental: boolean("instrumental").default(false),
  status: mysqlEnum("status", ["pending", "processing", "complete", "failed"]).default("pending"),
  /** Two tracks are returned per task — stored as JSON array */
  tracks: longtext("tracks"), // JSON: Array<{ audioUrl, imageUrl, title, tags, duration }>
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
