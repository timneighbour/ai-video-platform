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
  transcriptionSegments: longtext("transcriptionSegments"), // JSON: Array<{start: number, end: number, text: string}> from Whisper
  transcriptionStatus: varchar("transcriptionStatus", { length: 32 }).default("pending"), // pending | processing | done | failed
  characterImageUrl: varchar("characterImageUrl", { length: 1024 }), // Optional character/face photo for AI to use
  characterImageKey: varchar("characterImageKey", { length: 512 }), // S3 key for character image
  enableLipSync: boolean("enableLipSync").default(false), // Whether to apply lip sync to character scenes
  // --- Kids Video Mode --------------------------------------------------
  isKidsVideo: boolean("isKidsVideo").default(false).notNull(), // Enable Kids Video Mode
  kidsTargetAge: varchar("kidsTargetAge", { length: 32 }), // e.g., "3-5", "5-8", "8-12"
  kidsEducationalTheme: varchar("kidsEducationalTheme", { length: 128 }), // e.g., "counting", "colours", "animals", "letters", "friendship", "feelings", "routines", "adventure", "music_and_movement"
  kidsEnableSingalong: boolean("kidsEnableSingalong").default(true).notNull(), // Singalong captions in Kids Mode
  kidsFriendlyIntensity: mysqlEnum("kidsFriendlyIntensity", ["soft", "moderate", "vibrant"]).default("vibrant").notNull(), // Visual intensity level for kids
  // --- Captions & Lyrics ------------------------------------------------
  lyrics: longtext("lyrics"), // Full lyrics text (JSON array of {line, startTime, endTime})
  lyricsStatus: varchar("lyricsStatus", { length: 32 }).default("pending"), // pending | extracted | edited | approved
  captionsEnabled: boolean("captionsEnabled").default(true).notNull(), // Whether to include captions in final render
  captionStyle: varchar("captionStyle", { length: 32 }).default("bottom"), // bottom | top | custom
  captionBackground: varchar("captionBackground", { length: 32 }).default("soft_shadow"), // none | soft_shadow | solid_box
  captionFontSize: int("captionFontSize").default(24).notNull(), // Font size in pixels
  captionFontStyle: varchar("captionFontStyle", { length: 32 }).default("sans-serif"), // sans-serif | serif | monospace
  captionTextColour: varchar("captionTextColour", { length: 7 }).default("#FFFFFF"), // Hex colour code
  captionHighlightColour: varchar("captionHighlightColour", { length: 7 }).default("#FFD700"), // Hex colour for karaoke highlight
  captionKaraokeMode: boolean("captionKaraokeMode").default(false).notNull(), // Word-by-word highlight mode
  captionSafeArea: varchar("captionSafeArea", { length: 32 }).default("bottom_center"), // bottom_center | top_center | custom
  status: mysqlEnum("status", ["draft", "storyboard_ready", "rendering", "assembling", "completed", "failed"]).default("draft").notNull(),
  totalScenes: int("totalScenes").default(0).notNull(),
  completedScenes: int("completedScenes").default(0).notNull(),
  finalVideoUrl: varchar("finalVideoUrl", { length: 1024 }),
  finalVideoKey: varchar("finalVideoKey", { length: 512 }),
  creditCost: int("creditCost").default(0).notNull(),
  characterRoster: text("characterRoster"), // JSON array of all characters (locked + AI-invented) with fixed descriptions
  sceneSetting: varchar("sceneSetting", { length: 512 }), // User-chosen visual environment e.g. "concert venue", "desert", "rooftop"
  characterLockEnabled: boolean("characterLockEnabled").default(true).notNull(), // Whether to enforce face consistency validation across scenes
  // --- Style Lock -------------------------------------------------------
  lockedStyle: text("lockedStyle"), // JSON: { descriptor: string, lighting: string, colourPalette: string, cameraAngle: string, mood: string, rawPromptSuffix: string }
  likedSceneId: int("likedSceneId"), // sceneId that triggered the style lock
  likedSceneImageUrl: varchar("likedSceneImageUrl", { length: 1024 }), // image URL used for style extraction
  lyricsApproved: boolean("lyricsApproved").default(false).notNull(), // User has approved lyrics before render
  // --- Strict Mode & Debugging -------
  enforceStrictMode: boolean("enforceStrictMode").default(true).notNull(), // Full character+outfit+props constraints
  promptSnapshot: longtext("promptSnapshot"), // Last full prompt sent to image gen (debugging)
  negativePromptSnapshot: longtext("negativePromptSnapshot"), // Last full negative prompt (debugging)
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MusicVideoJob = typeof musicVideoJobs.$inferSelect;
export type InsertMusicVideoJob = typeof musicVideoJobs.$inferInsert;

// --- Kids Video Mode & Captions Types --------------------------------------
export type KidsEducationalTheme = "counting" | "colours" | "animals" | "letters" | "friendship" | "feelings" | "routines" | "adventure" | "music_and_movement";
export type KidsFriendlyIntensity = "soft" | "moderate" | "vibrant";
export type CaptionStyle = "bottom" | "top" | "custom";
export type CaptionBackground = "none" | "soft_shadow" | "solid_box";
export type CaptionFontStyle = "sans-serif" | "serif" | "monospace";
export type CaptionSafeArea = "bottom_center" | "top_center" | "custom";

export interface LyricsLine {
  line: string;
  startTime: number; // milliseconds
  endTime: number; // milliseconds
}

export interface CaptionConfig {
  enabled: boolean;
  style: CaptionStyle;
  background: CaptionBackground;
  fontSize: number;
  fontStyle: CaptionFontStyle;
  textColour: string;
  highlightColour: string;
  karaokeMode: boolean;
  safeArea: CaptionSafeArea;
}

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
  characterAssignments: text("characterAssignments"), // JSON array of character names assigned to this scene e.g. ["Singer","Drummer"]
  strictCharacterCount: int("strictCharacterCount").default(3), // Exact number of people required in this scene
  // --- Face Lock Validation ------------------------------------------------
  faceValidationStatus: mysqlEnum("faceValidationStatus", ["pending", "matched", "warning", "regenerated", "skipped"]).default("pending"), // Per-scene face validation result
  faceValidationScores: text("faceValidationScores"), // JSON: { characterName: confidenceScore } per assigned character
  faceValidationAttempts: int("faceValidationAttempts").default(0), // Number of regeneration attempts due to face mismatch
  modelAssignment: mysqlEnum("modelAssignment", ["seedance-2.0", "hailuo-minimax"]).default("seedance-2.0").notNull(), // WaveSpeed model: seedance-2.0 for character-heavy, hailuo-minimax for wide/atmospheric
  lipSync: boolean("lipSync").default(true).notNull(), // Per-scene lip sync control
  lipSyncStyle: mysqlEnum("lipSyncStyle", ["natural", "expressive", "subtle", "dramatic", "anime"]).default("natural").notNull(), // Lip sync animation style
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MusicVideoScene = typeof musicVideoScenes.$inferSelect;
export type InsertMusicVideoScene = typeof musicVideoScenes.$inferInsert;

export type ModelAssignment = "seedance-2.0" | "hailuo-minimax";

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
// Video Characters table - up to 4 characters per job, each with a name and lip sync option
export const videoCharacters = mysqlTable("videoCharacters", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(), // references musicVideoJobs.id
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull().default("Character"),
  role: varchar("role", { length: 255 }), // e.g. "Lead Singer", "Dancer"
  enableLipSync: boolean("enableLipSync").default(false),
  slotIndex: int("slotIndex").notNull().default(0), // 0-3 for up to 4 characters
  // Character Lock - once locked, appearance is enforced across all scenes
  lockedDescription: text("lockedDescription"), // Full visual brief: clothing, hair, colours, accessories, etc.
  isLocked: boolean("isLocked").default(false), // When true, brief is enforced in every scene prompt
   lockedAt: timestamp("lockedAt"), // When the lock was applied
  previewImageUrl: varchar("previewImageUrl", { length: 1024 }), // AI-generated test image for user approval before storyboard
  previewApproved: boolean("previewApproved").default(false), // User approved the character likeness
  // --- Face Lock System ----------------------------------------------------
  faceEmbedding: longtext("faceEmbedding"), // JSON: face embedding vector extracted from reference photo (for similarity comparison)
  referencePhotoBase64: longtext("referencePhotoBase64"), // Cached base64 of primary reference photo (avoids re-fetching from S3)
  lockedSeed: int("lockedSeed"), // Fixed seed used for generation to maintain consistency
  faceValidationThreshold: int("faceValidationThreshold").default(75), // Minimum Face++ confidence score (0-100) to pass validation
  // --- Master Character Identity (Identity Anchor System) -------------------------------
  masterPortraitUrl: varchar("masterPortraitUrl", { length: 1024 }), // Locked portrait generated from reference photo - used as face anchor in every scene
  masterSeed: int("masterSeed"), // Seed used when generating the master portrait - injected into all scene calls for determinism
  characterPrompt: text("characterPrompt"), // Locked identity prompt: "male, short dark hair, beard, leather jacket" - NEVER changes per scene
  masterPortraitGeneratedAt: timestamp("masterPortraitGeneratedAt"), // When the master portrait was last generated
  // --- Character Visual Details (OVERRIDE block in prompt) -----------------
  // JSON: { instrument: string, outfit: string, props: string, position: string }
  // These OVERRIDE any scene assumptions - injected as a hard constraint block.
  characterVisualDetails: longtext("characterVisualDetails"),
  // Hard constraints that must never be violated (e.g. "MUST be behind drum kit", "NEVER holding guitar")
  characterConstraints: longtext("characterConstraints"),
  // Default physical state when not overridden by scene (e.g. "Standing at mic, centre stage")
  characterDefaultState: text("characterDefaultState"),
  // --- Unified Character Identity Fields (normalised for ALL characters) ----
  // Set by normaliseCharacter() - used in EVERY scene generation regardless of photo/AI source.
  // JSON columns store structured data for reliable prompt injection.
  lockedOutfit: longtext("lockedOutfit"),   // JSON: { jacket, shirt, trousers, shoes, accessories }
  lockedProps: longtext("lockedProps"),     // JSON: { instrument, mic, other }
  lockedRole: text("lockedRole"),           // e.g. "Lead Singer and Guitarist"
  lockedRules: longtext("lockedRules"),     // JSON: strict behavioural rules (NEVER wears X, ALWAYS holds Y)
  normalisedAt: timestamp("normalisedAt"),  // When normaliseCharacter() last ran
  isRealPerson: boolean("isRealPerson").default(false), // true = uploaded photo, false = AI-generated
  characterMode: mysqlEnum("characterMode", ["photo", "ai_generated"]).default("photo"), // Source type
  // Whether this character is the primary focus (primary) or background (secondary)
  rolePriority: mysqlEnum("rolePriority", ["primary", "secondary"]).default("primary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type VideoCharacter = typeof videoCharacters.$inferSelect;
export type InsertVideoCharacter = typeof videoCharacters.$inferInsert;

// Video Character Photos table - multiple reference photos per character
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

// -- AI Video Enhancement Studio (Phase 1 MVP) --------------------------------------
// Enhancement Jobs table - tracks video enhancement requests
export const enhancementJobs = mysqlTable("enhancementJobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  
  // Input video
  inputVideoUrl: varchar("inputVideoUrl", { length: 1024 }).notNull(),
  inputVideoKey: varchar("inputVideoKey", { length: 512 }).notNull(),
  inputVideoDuration: int("inputVideoDuration").notNull(), // seconds
  inputVideoSize: int("inputVideoSize").notNull(), // bytes
  
  // User selections
  style: varchar("style", { length: 64 }).notNull(), // cinematic | emotional | upbeat | documentary | kids
  musicEnabled: boolean("musicEnabled").default(true).notNull(),
  captionsEnabled: boolean("captionsEnabled").default(true).notNull(),
  
  // Video analysis results
  analysisStatus: mysqlEnum("analysisStatus", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  analysisData: longtext("analysisData"), // JSON: {speech_segments, scene_cuts, mood_tags, confidence}
  speechSegments: longtext("speechSegments"), // JSON array of {start, end, confidence}
  sceneSegments: longtext("sceneSegments"), // JSON array of {start, end, type}
  detectedMood: varchar("detectedMood", { length: 128 }), // auto-detected mood
  
  // Music generation
  musicGenerationStatus: mysqlEnum("musicGenerationStatus", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  musicUrl: varchar("musicUrl", { length: 1024 }), // Generated music file
  musicKey: varchar("musicKey", { length: 512 }), // S3 key
  sunoTaskId: varchar("sunoTaskId", { length: 255 }), // Suno API task ID
  
  // Captions
  captionSegments: longtext("captionSegments"), // JSON array of {start, end, text}
  
  // Final export
  renderStatus: mysqlEnum("renderStatus", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  outputUrl16x9: varchar("outputUrl16x9", { length: 1024 }), // 16:9 @ 1080p
  outputKey16x9: varchar("outputKey16x9", { length: 512 }),
  outputUrl9x16: varchar("outputUrl9x16", { length: 1024 }), // 9:16 @ 1080p
  outputKey9x16: varchar("outputKey9x16", { length: 512 }),
  
  // Metadata
  creditCost: int("creditCost").default(1).notNull(), // 1 credit per video
  errorMessage: text("errorMessage"),
  status: mysqlEnum("enhancementStatus", ["draft", "analyzing", "generating", "rendering", "completed", "failed"]).default("draft").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EnhancementJob = typeof enhancementJobs.$inferSelect;
export type InsertEnhancementJob = typeof enhancementJobs.$inferInsert;

// -- Showcase Items -------------------------------------------------------------
// Pre-generated demo videos shown in the "See what creators are making" gallery.
// Managed by admins; served publicly on the homepage.
export const showcaseItems = mysqlTable("showcaseItems", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 64 }).notNull(), // e.g. "Kids YouTube"
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  posterUrl: varchar("posterUrl", { length: 1024 }).notNull(), // CDN URL for thumbnail
  videoUrl: varchar("videoUrl", { length: 1024 }), // CDN URL for MP4 (optional - poster shown if null)
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ShowcaseItem = typeof showcaseItems.$inferSelect;
export type InsertShowcaseItem = typeof showcaseItems.$inferInsert;

// --- Suno Music Generation --------------------------------------------------

// --- WaveSpeed Model Assignment ------------------------------------------------
// Enum for WaveSpeed model selection per scene
export type WaveSpeedModelType = "seedance-2.0" | "hailuo-minimax";

export const sunoMusicTasks = mysqlTable("suno_music_tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  taskId: varchar("taskId", { length: 128 }).notNull(),
  title: varchar("title", { length: 120 }),
  prompt: text("prompt"),
  style: varchar("style", { length: 200 }),
  instrumental: boolean("instrumental").default(false),
  status: mysqlEnum("status", ["pending", "processing", "complete", "failed"]).default("pending"),
  /** Two tracks are returned per task - stored as JSON array */
  tracks: longtext("tracks"), // JSON: Array<{ audioUrl, imageUrl, title, tags, duration }>
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
