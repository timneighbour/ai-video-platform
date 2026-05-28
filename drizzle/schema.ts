import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, longtext, json, bigint, tinyint } from "drizzle-orm/mysql-core";

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
  isFoundingCreator: boolean("isFoundingCreator").default(false).notNull(),
  foundingCreatorGrantedAt: timestamp("foundingCreatorGrantedAt"),
  /** Marketing opt-out — set when user clicks unsubscribe link in campaign emails */
  marketingOptOut: boolean("marketingOptOut").default(false).notNull(),
  marketingOptOutAt: timestamp("marketingOptOutAt"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Subscription plans table
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  plan: mysqlEnum("plan", ["starter", "basic", "pro", "business", "creator", "studio"]).notNull(),
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
  // Separate buckets: monthly credits (renew each cycle) and top-up credits (never expire while subscribed)
  monthlyCredits: int("monthlyCredits").default(0).notNull(),
  topupCredits: int("topupCredits").default(0).notNull(),
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

// Top-up purchases audit table — one row per successful Stripe checkout
export const topupPurchases = mysqlTable("topupPurchases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  packKey: varchar("packKey", { length: 64 }).notNull(),       // e.g. "quick_boost"
  packName: varchar("packName", { length: 128 }).notNull(),    // e.g. "Quick Boost"
  creditsAdded: int("creditsAdded").notNull(),                 // e.g. 3
  amountPaid: int("amountPaid").notNull(),                     // in pence, e.g. 1200
  currency: varchar("currency", { length: 8 }).default("gbp").notNull(),
  stripeSessionId: varchar("stripeSessionId", { length: 255 }).notNull().unique(), // idempotency key
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TopupPurchase = typeof topupPurchases.$inferSelect;
export type InsertTopupPurchase = typeof topupPurchases.$inferInsert;

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
  status: mysqlEnum("status", ["draft", "storyboard_ready", "rendering", "assembling", "completed", "failed", "paused", "cancelled"]).default("draft").notNull(),
  totalScenes: int("totalScenes").default(0).notNull(),
  completedScenes: int("completedScenes").default(0).notNull(),
  finalVideoUrl: varchar("finalVideoUrl", { length: 1024 }),
  finalVideoKey: varchar("finalVideoKey", { length: 512 }),
  creditCost: int("creditCost").default(0).notNull(),
  characterRoster: text("characterRoster"), // JSON array of all characters (locked + AI-invented) with fixed descriptions
  sceneSetting: text("sceneSetting"), // User-chosen visual environment — TEXT (no length limit) so users can paste full descriptions
  performanceShotRatio: int("performanceShotRatio").default(80), // 0-100: % of scenes that should be character performance shots (default 80% for vocal-led tracks)
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
  // --- Realistic Music Performance System ------------------------------------
  // JSON: InstrumentAnalysis { instruments: InstrumentTrack[], tempo: number, timeSignature: string, key: string, analysedAt: string }
  instrumentAnalysis: longtext("instrumentAnalysis"),
  // --- Public Watch Page ---
  isPublic: boolean("isPublic").default(false).notNull(), // Whether this video is publicly shareable/indexable
  shareSlug: varchar("shareSlug", { length: 64 }), // Unique slug for public watch page e.g. "abc123xyz"
  thumbnailUrl: varchar("thumbnailUrl", { length: 1024 }), // First scene image used as video thumbnail
  errorMessage: text("errorMessage"),
  aspectRatio: varchar("aspectRatio", { length: 8 }).default("16:9").notNull(), // Export format: "16:9" | "9:16" | "1:1"
  contextAssetUrls: text("contextAssetUrls"), // JSON: Array<{url: string, mimeType: string, type: 'image'|'video'}> — user-uploaded visual references for storyboard generation
  artistType: mysqlEnum("artistType", ["band", "solo_artist", "animated_characters", "solo_animated"]).default("solo_artist"), // Artist type selection from step 1
  storyboardLockedAt: timestamp("storyboardLockedAt"), // Set when render starts — storyboard is frozen from this point
  previewCreditsUsed: int("previewCreditsUsed").default(0).notNull(), // Credits charged for scene preview regenerations (first full set per job is free)
  // --- Quality Guarantee System -------------------------------------------
  // Users may preview the completed video before downloading.
  // Free re-renders are available BEFORE download. Once downloaded, no refunds.
  qualityStatus: mysqlEnum("qualityStatus", ["pending", "previewing", "approved", "rerender_requested", "rerendering"]).default("pending").notNull(),
  downloadedAt: timestamp("downloadedAt"), // Set when user confirms download — locks out free re-renders
  reRenderCount: int("reRenderCount").default(0).notNull(), // Number of free re-renders used
  reRenderReason: text("reRenderReason"), // User's stated reason for re-render (last one)
  reRenderRequestedAt: timestamp("reRenderRequestedAt"), // When last re-render was requested
  // --- Cost Protection Fields -------------------------------------------
  providerSpendUsd: decimal("providerSpendUsd", { precision: 8, scale: 4 }).notNull().default("0"), // Total provider API cost for this job
  wastedSpendUsd: decimal("wastedSpendUsd", { precision: 8, scale: 4 }).notNull().default("0"),   // Provider cost from failed/timed-out scenes
  maxSpendLimitUsd: decimal("maxSpendLimitUsd", { precision: 6, scale: 2 }).notNull().default("25.00"), // Hard spend cap (default $25 — covers up to ~39 scenes at Atlas Cloud rates)
  probePassed: boolean("probePassed"),                          // null = not probed yet, false = probe in progress, true = probe approved by owner
  probeSceneId: int("probeSceneId"),                             // Which scene was used for the single-scene QA probe
  probeVideoUrl: varchar("probeVideoUrl", { length: 1024 }),     // Completed probe clip URL for owner review
  probeApprovedAt: timestamp("probeApprovedAt"),                 // When owner approved the probe — gates full render release
  finalVideoProduced: boolean("finalVideoProduced").notNull().default(false), // true only when final video URL is set
  // --- Provider Fallback System -------------------------------------------
  // When Atlas Cloud fails repeatedly on a job, the system auto-escalates to WaveSpeed.
  // atlasFailureCount: incremented each time an Atlas scene times out or fails on this job.
  // fallbackProvider: when set to 'wavespeed', all pending scenes skip Atlas entirely.
  atlasFailureCount: int("atlasFailureCount").notNull().default(0), // Atlas timeout/failure count for this job
  fallbackProvider: varchar("fallbackProvider", { length: 32 }), // null = normal routing | 'wavespeed' = skip Atlas
  // --- Vocal Isolation (Demucs) -------------------------------------------
  // Demucs-isolated lead vocals — used exclusively for SyncLabs lip sync input.
  // The final assembled video always uses the original full mix (audioUrl) for the viewer.
  // vocalsStatus: pending = not yet isolated | processing = Demucs running | done = ready | failed = isolation failed
  vocalsUrl: varchar("vocalsUrl", { length: 1024 }),          // S3 URL of Demucs-isolated lead vocals
  vocalsKey: varchar("vocalsKey", { length: 512 }),           // S3 key for isolated vocals file
  vocalsStatus: varchar("vocalsStatus", { length: 32 }).default("pending"), // pending | processing | done | failed
  songBpm: int("songBpm"),                                    // Detected BPM (used to generate tempo-matched instrument motion prompts)
  // --- Sync Labs Lip Sync Tracking -------------------------------------------
  syncLabsJobId: varchar("syncLabsJobId", { length: 128 }), // Sync Labs job ID — used to resume polling after server restart
  assemblyStartedAt: timestamp("assemblyStartedAt"),         // When assembly began — used to detect truly stuck jobs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MusicVideoJob = typeof musicVideoJobs.$inferSelect;
export type InsertMusicVideoJob = typeof musicVideoJobs.$inferInsert;

// --- Vocal Stems Table (per-vocalist isolated audio for lip sync) -----------
// Each row is one isolated vocal stem produced by Demucs + speaker diarisation.
// For solo tracks: one row (isLeadVocal=true).
// For duets/groups: one row per vocalist, each assigned to a character.
export const musicVideoVocalStems = mysqlTable("musicVideoVocalStems", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),                           // references musicVideoJobs.id
  stemIndex: int("stemIndex").notNull().default(0),        // 0 = first stem, 1 = second, etc.
  stemUrl: varchar("stemUrl", { length: 1024 }).notNull(), // S3 URL of isolated vocal stem
  stemKey: varchar("stemKey", { length: 512 }).notNull(),  // S3 key
  characterId: int("characterId"),                         // references videoCharacters.id (null until assigned)
  characterName: varchar("characterName", { length: 255 }), // denormalised for quick lookup
  voiceGender: mysqlEnum("voiceGender", ["male", "female", "unknown"]).default("unknown"),
  voiceLabel: varchar("voiceLabel", { length: 128 }),      // e.g. "Lead Vocal", "Male Vocalist", "Harmony"
  isLeadVocal: boolean("isLeadVocal").default(false).notNull(), // Primary lip sync stem
  diarisationStatus: varchar("diarisationStatus", { length: 32 }).default("done"), // done | processing | failed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MusicVideoVocalStem = typeof musicVideoVocalStems.$inferSelect;
export type InsertMusicVideoVocalStem = typeof musicVideoVocalStems.$inferInsert;

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
  lipSync: boolean("lipSync").default(false).notNull(), // Per-scene lip sync control — false by default; set true only for close-up character scenes (seedance-2.0)
  lipSyncStyle: mysqlEnum("lipSyncStyle", ["natural", "expressive", "subtle", "dramatic", "anime"]).default("natural").notNull(), // Lip sync animation style
  userEditedPrompt: boolean("userEditedPrompt").default(false).notNull(), // true when the user has manually edited this scene's prompt
  focusCharacter: varchar("focusCharacter", { length: 128 }), // Placeholder: character to apply lip sync to (future feature)
  camera: json("camera"),                                     // Placeholder: { shotType, angle, focus } for future camera direction
  // --- Re-render Tracking (Option A Policy) --------------------------------
  reRenderCount: int("reRenderCount").default(0).notNull(),   // Total re-renders for this scene
  freeReRenderUsed: boolean("freeReRenderUsed").default(false).notNull(), // True after first free re-render is used
  lastReRenderAt: timestamp("lastReRenderAt"),                // When last re-render was requested
  cameraDirection: varchar("cameraDirection", { length: 64 }), // User-chosen camera: close_up | medium | wide | over_shoulder | tracking
  // --- Cost Protection Fields -------------------------------------------
  providerSpendUsd: decimal("providerSpendUsd", { precision: 6, scale: 4 }).notNull().default("0"), // Provider cost for this scene
  retryCount: int("retryCount").notNull().default(0), // Number of times this scene has been retried
  providerUsed: varchar("providerUsed", { length: 64 }), // Which provider generated this scene
  // --- Per-scene Lip Sync (Sync Labs applied to each scene individually for preview) ---
  lipSyncVideoUrl: varchar("lipSyncVideoUrl", { length: 1024 }), // Sync Labs output URL for this scene's lip-synced preview
  lipSyncVideoKey: varchar("lipSyncVideoKey", { length: 512 }), // S3 key for the lip-synced preview video
  lipSyncTaskId: varchar("lipSyncTaskId", { length: 255 }), // Sync Labs job ID for polling
  lipSyncStatus: mysqlEnum("lipSyncStatus", ["pending", "processing", "done", "error"]).default("pending").notNull(), // Per-scene lip sync status
  // --- Scene Type (Cinematic vs Performance Mode) ---
  sceneType: mysqlEnum("sceneType", ["cinematic", "performance"]).default("cinematic").notNull(), // cinematic = wide/atmospheric (WaveSpeed only); performance = close-up hero shot (Hedra lip sync)
  // --- Hedra Performance Mode Lip Sync ---
  hedraVideoUrl: varchar("hedraVideoUrl", { length: 1024 }), // Hedra Avatar output URL for Performance Mode scenes
  hedraVideoKey: varchar("hedraVideoKey", { length: 512 }), // S3 key for Hedra output video
  hedraGenerationId: varchar("hedraGenerationId", { length: 255 }), // Hedra generation ID for polling
  hedraStatus: mysqlEnum("hedraStatus", ["pending", "processing", "done", "error"]).default("pending").notNull(), // Hedra generation status
  heroImageUrl: varchar("heroImageUrl", { length: 1024 }), // Portrait image URL used as Hedra input (extracted hero frame)
  heroImageKey: varchar("heroImageKey", { length: 512 }), // S3 key for the hero portrait image
  // --- Per-scene isolated vocals (Demucs output, trimmed to scene window) ---
  sceneAudioUrl: varchar("sceneAudioUrl", { length: 1024 }), // S3 URL of isolated vocals for this scene (used by Hedra + assembly audio sync)
  sceneAudioKey: varchar("sceneAudioKey", { length: 512 }), // S3 key for the isolated vocals
  // --- Scene Approval (user explicitly locks in a scene before full render) ---
  isApproved: boolean("isApproved").default(false).notNull(), // true when user has approved this scene for final render
  approvedAt: timestamp("approvedAt"),                        // When the user approved this scene
  // --- Stage 4: Cinematic Compositing (WIZ AI 5-Stage Pipeline) ---------------
  // compositeStatus: tracks Stage 3+4 compositing progress
  //   pending    = waiting for lipSyncStatus=done before compositing can start
  //   processing = compositing job running (ffmpeg chromakey + overlay)
  //   done       = composited clip ready in compositeVideoUrl
  //   error      = compositing failed (will retry)
  //   skipped    = cinematic scene (no compositing needed, Seedance clip used directly)
  compositeStatus: mysqlEnum("compositeStatus", ["pending", "processing", "done", "error", "skipped"]).default("pending").notNull(),
  compositeVideoUrl: varchar("compositeVideoUrl", { length: 1024 }), // Final composited clip URL (Zara on concert hall background)
  compositeVideoKey: varchar("compositeVideoKey", { length: 512 }), // S3 key for composited clip
  compositeAttempts: int("compositeAttempts").notNull().default(0), // Number of compositing attempts
  compositeJobId: varchar("compositeJobId", { length: 255 }), // Orchestration server jobId (for async composite tracking)
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
  // Body build hint — injected into portrait and scene prompts so AI matches the user's physique
  bodyBuild: mysqlEnum("bodyBuild", ["slim", "lean", "average", "athletic", "stocky", "muscular"]).default("average"),
  normalisedAt: timestamp("normalisedAt"),  // When normaliseCharacter() last ran
  voiceProfile: longtext("voiceProfile"),    // Placeholder: future lip sync voice matching data (JSON)
  isRealPerson: boolean("isRealPerson").default(false), // true = uploaded photo, false = AI-generated
  characterMode: mysqlEnum("characterMode", ["photo", "ai_generated"]).default("photo"), // Source type
  // MuseTalk lip-sync face video
  faceVideoUrl: varchar("faceVideoUrl", { length: 1024 }), // S3 URL of face video for MuseTalk lip-sync
  faceVideoKey: varchar("faceVideoKey", { length: 512 }), // S3 key for face video
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
  /** Target duration in seconds requested by user (null = no limit) */
  targetDuration: int("targetDuration"),
  /** Generation provider: suno (default), elevenlabs_sfx (≤30s exact), elevenlabs_music (30s–5min) */
  provider: mysqlEnum("provider", ["suno", "elevenlabs_sfx", "elevenlabs_music"]).default("suno"),
  /** Generation mode chosen by user */
  generationMode: mysqlEnum("generationMode", ["score", "song", "suno", "cover", "extend"]).default("suno"),
  /** URL of the user's uploaded track (used for cover/extend modes) */
  uploadedTrackUrl: text("uploadedTrackUrl"),
  /** Two tracks are returned per task - stored as JSON array */
  tracks: longtext("tracks"), // JSON: Array<{ audioUrl, imageUrl, title, tags, duration }>
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// --- Render Jobs (Pay-to-Render Model) -----------------------------------------
// Tracks each render request: quality tier, audio tier, payment status, download URL.
// Free creation → pay to render. Subscription plans include N renders/month.
export const renderJobs = mysqlTable("renderJobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  // Source job reference (music video job, etc.)
  sourceJobId: int("sourceJobId"), // references musicVideoJobs.id or other job tables
  sourceJobType: mysqlEnum("sourceJobType", ["music_video", "text_to_video", "kids_video", "wizpilot"]).notNull().default("music_video"),

  // Quality tier
  quality: mysqlEnum("quality", ["standard", "hd", "4k"]).notNull().default("standard"),
  // Audio tier
  audioTier: mysqlEnum("audioTier", ["standard", "enhanced", "cinematic"]).notNull().default("standard"),

  // Pricing (in pence, GBP)
  basePrice: int("basePrice").notNull().default(0), // e.g. 200 = £2.00
  audioAddon: int("audioAddon").notNull().default(0), // e.g. 100 = £1.00
  totalPrice: int("totalPrice").notNull().default(0), // basePrice + audioAddon

  // Payment
  paymentStatus: mysqlEnum("paymentStatus", ["free", "pending", "paid", "failed", "subscription"]).notNull().default("pending"),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeSessionId: varchar("stripeSessionId", { length: 255 }),

  // Render output
  renderStatus: mysqlEnum("renderStatus", ["queued", "processing", "completed", "failed"]).notNull().default("queued"),
  downloadUrl: varchar("downloadUrl", { length: 1024 }),
  downloadKey: varchar("downloadKey", { length: 512 }),
  expiresAt: timestamp("expiresAt"), // Download link expiry

  // Subscription render tracking
  usedSubscriptionRender: boolean("usedSubscriptionRender").default(false).notNull(),

  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RenderJob = typeof renderJobs.$inferSelect;
export type InsertRenderJob = typeof renderJobs.$inferInsert;

// --- Subscription Render Allowances -------------------------------------------
// Tracks monthly render quota per subscription plan.
// Reset each billing cycle. Starter=5, Creator=15, Studio=40.
export const subscriptionRenderAllowances = mysqlTable("subscriptionRenderAllowances", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  subscriptionId: int("subscriptionId").notNull(), // references subscriptions.id
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  totalAllowed: int("totalAllowed").notNull(), // 5 | 15 | 40
  used: int("used").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SubscriptionRenderAllowance = typeof subscriptionRenderAllowances.$inferSelect;
export type InsertSubscriptionRenderAllowance = typeof subscriptionRenderAllowances.$inferInsert;

// --- Render Bundles (Pay-per-render packs) ------------------------------------
// Purchased packs of render credits: 6, 15, or 40 renders.
export const renderBundles = mysqlTable("renderBundles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bundleSize: int("bundleSize").notNull(), // 6 | 15 | 40
  remaining: int("remaining").notNull(), // renders left in this bundle
  stripeSessionId: varchar("stripeSessionId", { length: 255 }),
  purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"), // Optional expiry
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RenderBundle = typeof renderBundles.$inferSelect;
export type InsertRenderBundle = typeof renderBundles.$inferInsert;

// --- Re-engagement Reminders ------------------------------------------------
// Tracks which reminder emails have been sent for incomplete render jobs,
// preventing duplicate sends and allowing per-user suppression.
export const reEngagementReminders = mysqlTable("reEngagementReminders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // The job that triggered this reminder (music video, text-to-video, etc.)
  jobId: int("jobId").notNull(),
  jobType: mysqlEnum("reEngJobType", ["music_video", "text_to_video", "kids_video", "wizpilot"]).notNull().default("music_video"),
  // Which reminder in the sequence (1 = 24h, 2 = 3-day)
  reminderNumber: int("reminderNumber").notNull(), // 1 or 2
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  channel: mysqlEnum("reEngChannel", ["in_app", "email", "owner_notify"]).notNull().default("in_app"),
});

export type ReEngagementReminder = typeof reEngagementReminders.$inferSelect;
export type InsertReEngagementReminder = typeof reEngagementReminders.$inferInsert;

// --- In-app Notifications ---------------------------------------------------
// Lightweight notification inbox for each user (re-engagement, system alerts, etc.)
export const inAppNotifications = mysqlTable("inAppNotifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("notifType", ["reminder", "system", "promo"]).notNull().default("reminder"),
  // Link to navigate to when notification is clicked
  actionUrl: varchar("actionUrl", { length: 512 }),
  actionLabel: varchar("actionLabel", { length: 64 }),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InAppNotification = typeof inAppNotifications.$inferSelect;
export type InsertInAppNotification = typeof inAppNotifications.$inferInsert;

// ── Kids Video Jobs ─────────────────────────────────────────────────────────
// Standalone kids animated video creation flow (separate from music video)
export const kidsVideoJobs = mysqlTable("kidsVideoJobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  // Story input
  storyPrompt: text("storyPrompt").notNull(),
  animationStyle: mysqlEnum("animationStyle", ["pixar3d", "disney", "anime", "cartoon", "storybook", "claymation", "ghibli", "pixar_movie", "manga", "retro80s", "watercolor"]).notNull().default("pixar3d"),
  videoLength: mysqlEnum("videoLength", ["5s", "10s", "15s", "30s", "60s"]).notNull().default("15s"),
  screenFormat: mysqlEnum("screenFormat", ["16:9", "9:16", "1:1"]).notNull().default("16:9"),

  // Reference images (uploaded or AI-generated)
  referenceImageUrls: longtext("referenceImageUrls"), // JSON: string[]
  // Character lock system: JSON array of { name, species, colour, features, outfit, photoUrl?, lockedPrompt }
  characterLockData: longtext("characterLockData"),
  // Audio upload (optional: kids songs, narration, voice recordings)
  audioUrl: varchar("audioUrl", { length: 1024 }),
  audioKey: varchar("audioKey", { length: 512 }),
  audioMimeType: varchar("audioMimeType", { length: 64 }),
  // Isolated vocals (Demucs separation) for lip sync
  vocalsUrl: varchar("kidsVocalsUrl", { length: 1024 }),
  vocalsKey: varchar("kidsVocalsKey", { length: 512 }),
  // Lip sync toggle (per-job)
  enableLipSync: boolean("kidsEnableLipSync").default(false).notNull(),
  // Detected BPM (used to generate tempo-matched motion prompts)
  songBpm: int("kidsSongBpm"),

  // Storyboard (free)
  storyboardStatus: mysqlEnum("kidsStoryboardStatus", ["pending", "generating", "ready", "failed"]).default("pending").notNull(),
  storyboardFrames: longtext("storyboardFrames"), // JSON: Array<{sceneIndex, sceneLabel, imageUrl, description}>
  storyboardGeneratedAt: timestamp("storyboardGeneratedAt"),

  // Render (paid)
  renderStatus: mysqlEnum("kidsRenderStatus", ["not_started", "queued", "processing", "completed", "failed"]).default("not_started").notNull(),
  videoUrl: varchar("videoUrl", { length: 1024 }),
  videoKey: varchar("videoKey", { length: 512 }),
  creditsCharged: int("creditsCharged").default(0).notNull(),

  // Stripe checkout for paid render
  stripeSessionId: varchar("stripeSessionId", { length: 255 }),
  paymentStatus: mysqlEnum("kidsPaymentStatus", ["free", "pending", "paid", "failed"]).default("free").notNull(),

  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type KidsVideoJob = typeof kidsVideoJobs.$inferSelect;
export type InsertKidsVideoJob = typeof kidsVideoJobs.$inferInsert;

export type KidsAnimationStyle = "pixar3d" | "disney" | "anime" | "cartoon" | "storybook" | "claymation" | "ghibli" | "pixar_movie" | "manga" | "retro80s" | "watercolor";
export type KidsVideoLength = "5s" | "10s" | "15s" | "30s" | "60s";
export type KidsScreenFormat = "16:9" | "9:16" | "1:1";

export interface KidsStoryboardFrame {
  sceneIndex: number;
  sceneLabel: string;
  imageUrl: string;
  description: string;
}

// ── Blog Posts ────────────────────────────────────────────────────────────────
export const blogPosts = mysqlTable("blogPosts", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 512 }).notNull(),
  excerpt: text("excerpt"),
  content: longtext("content").notNull(),
  coverImage: varchar("coverImage", { length: 1024 }),
  author: varchar("author", { length: 255 }).default("WIZ AI Team").notNull(),
  status: mysqlEnum("status", ["draft", "published"]).default("draft").notNull(),
  tags: text("tags"), // JSON-encoded string array
  metaTitle: varchar("metaTitle", { length: 512 }),
  metaDescription: text("metaDescription"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

// ── Creator Network ───────────────────────────────────────────────────────────
export const creators = mysqlTable("creators", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // nullable — admin can seed creators without a user account
  name: varchar("name", { length: 255 }).notNull(),
  creatorType: mysqlEnum("creatorType", [
    "music_artist",
    "youtuber",
    "animator",
    "kids_creator",
    "content_creator",
  ]).notNull().default("content_creator"),
  bio: text("bio"),
  videoUrl: varchar("videoUrl", { length: 1024 }),
  thumbnailUrl: varchar("thumbnailUrl", { length: 1024 }),
  youtubeUrl: varchar("youtubeUrl", { length: 512 }),
  instagramUrl: varchar("instagramUrl", { length: 512 }),
  tiktokUrl: varchar("tiktokUrl", { length: 512 }),
  websiteUrl: varchar("websiteUrl", { length: 512 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  isTrending: boolean("isTrending").default(false).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Creator = typeof creators.$inferSelect;
export type InsertCreator = typeof creators.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// WizSync™ — Voice to Character Assignment System
// ─────────────────────────────────────────────────────────────────────────────

/** Top-level WizSync analysis job (one per audio track) */
export const wizSyncJobs = mysqlTable("wizSyncJobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  audioUrl: varchar("audioUrl", { length: 1024 }).notNull(),
  audioName: varchar("audioName", { length: 255 }),
  audioDuration: decimal("audioDuration", { precision: 10, scale: 3 }),
  status: mysqlEnum("wizSyncStatus", ["pending", "analysing", "ready", "error"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  assemblyAiTranscriptId: varchar("assemblyAiTranscriptId", { length: 255 }),
  demucsRequestId: varchar("demucsRequestId", { length: 255 }),
  stems: json("stems"),
  speakerCount: int("speakerCount"),
  utterances: json("utterances"),
  musicVideoJobId: int("musicVideoJobId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WizSyncJob = typeof wizSyncJobs.$inferSelect;
export type InsertWizSyncJob = typeof wizSyncJobs.$inferInsert;

/** Individual speaker detected in the audio */
export const wizSyncSpeakers = mysqlTable("wizSyncSpeakers", {
  id: int("id").autoincrement().primaryKey(),
  wizSyncJobId: int("wizSyncJobId").notNull(),
  speakerLabel: varchar("speakerLabel", { length: 8 }).notNull(),
  inferredGender: mysqlEnum("wizSyncGender", ["male", "female", "unknown"]).default("unknown").notNull(),
  assignedCharacterId: int("assignedCharacterId"),
  isManualOverride: boolean("isManualOverride").default(false).notNull(),
  displayName: varchar("displayName", { length: 128 }),
  totalDuration: decimal("totalDuration", { precision: 10, scale: 3 }),
  instrumentRole: varchar("instrumentRole", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WizSyncSpeaker = typeof wizSyncSpeakers.$inferSelect;
export type InsertWizSyncSpeaker = typeof wizSyncSpeakers.$inferInsert;

/** Timestamped audio segment for a speaker */
export const wizSyncSegments = mysqlTable("wizSyncSegments", {
  id: int("id").autoincrement().primaryKey(),
  wizSyncJobId: int("wizSyncJobId").notNull(),
  wizSyncSpeakerId: int("wizSyncSpeakerId").notNull(),
  startMs: int("startMs").notNull(),
  endMs: int("endMs").notNull(),
  text: text("text"),
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  clipUrl: varchar("clipUrl", { length: 1024 }),
  hedraGenerationId: varchar("hedraGenerationId", { length: 255 }),
  lipSyncVideoUrl: varchar("lipSyncVideoUrl", { length: 1024 }),
  lipSyncStatus: mysqlEnum("wizSyncLipStatus", ["pending", "processing", "done", "error"]).default("pending").notNull(),
  /** Free 5-second preview clip — generated before full lip-sync render, costs 0 credits */
  previewVideoUrl: varchar("previewVideoUrl", { length: 1024 }),
  previewStatus: mysqlEnum("wizSyncPreviewStatus", ["idle", "generating", "ready", "error"]).default("idle").notNull(),
  previewAtlasJobId: varchar("previewAtlasJobId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WizSyncSegment = typeof wizSyncSegments.$inferSelect;
export type InsertWizSyncSegment = typeof wizSyncSegments.$inferInsert;

// --- WizScore Jobs (Video → AI Analysis → Matched Soundtrack) -------------------
// User uploads a video; AI analyses mood/pacing/energy/duration and auto-generates
// a Suno music prompt, then produces a synced soundtrack that ends on the final frame.
export const wizScoreJobs = mysqlTable("wizScoreJobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** S3 key of the uploaded video */
  videoKey: varchar("videoKey", { length: 512 }).notNull(),
  /** Public CDN URL of the uploaded video */
  videoUrl: varchar("videoUrl", { length: 1024 }).notNull(),
  /** Duration of the video in seconds (extracted by AI analysis) */
  videoDuration: int("videoDuration"),
  /** AI-generated analysis: mood, pacing, energy, genre suggestion */
  analysis: text("analysis"), // JSON: { mood, pacing, energy, genre, sunoPrompt, sunoStyle }
  /** Auto-generated Suno prompt derived from the video analysis */
  sunoPrompt: text("sunoPrompt"),
  /** Suno music task ID (references suno_music_tasks.id) */
  sunoTaskId: int("sunoTaskId"),
  /** Final synced audio URL (trimmed to video duration) */
  audioUrl: varchar("audioUrl", { length: 1024 }),
  status: mysqlEnum("wizScoreStatus", ["pending", "analyzing", "generating", "trimming", "complete", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type WizScoreJob = typeof wizScoreJobs.$inferSelect;
export type InsertWizScoreJob = typeof wizScoreJobs.$inferInsert;

// --- WizImage — AI Image Creator (Grok Imagine) --------------------------------
export const wizImages = mysqlTable("wizImages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** User's original prompt */
  prompt: text("prompt").notNull(),
  /** Style applied (e.g. "photorealistic", "cinematic", "anime", "oil-painting") */
  style: varchar("style", { length: 64 }),
  /** Aspect ratio used (e.g. "1:1", "16:9", "9:16") */
  aspectRatio: varchar("aspectRatio", { length: 16 }),
  /** S3/CDN URL of the generated image */
  imageUrl: varchar("imageUrl", { length: 1024 }).notNull(),
  /** S3 key for the image */
  imageKey: varchar("imageKey", { length: 512 }),
  /** Grok-revised prompt (if returned) */
  revisedPrompt: text("revisedPrompt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WizImage = typeof wizImages.$inferSelect;
export type InsertWizImage = typeof wizImages.$inferInsert;

// --- WizShorts — Short-Form Video Creator (Grok Imagine Video) -----------------
export const wizShortsJobs = mysqlTable("wizShortsJobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** User's topic, script, or description */
  topic: text("topic").notNull(),
  /** Platform target: youtube_shorts | tiktok | reels */
  platform: mysqlEnum("platform", ["youtube_shorts", "tiktok", "reels"]).default("youtube_shorts").notNull(),
  /** Total target duration in seconds (15-60) */
  targetDuration: int("targetDuration").default(30).notNull(),
  /** Visual style: cinematic | anime | realistic | cartoon */
  visualStyle: varchar("visualStyle", { length: 64 }),
  /** Optional music track URL (user-uploaded or from WizSound) */
  musicUrl: varchar("musicUrl", { length: 1024 }),
  /** Number of scenes (auto-calculated from targetDuration) */
  sceneCount: int("sceneCount"),
  /** Credit cost for this job */
  creditCost: int("creditCost").default(0).notNull(),
  /** Final assembled video URL */
  videoUrl: varchar("videoUrl", { length: 1024 }),
  /** S3 key for the final video */
  videoKey: varchar("videoKey", { length: 512 }),
  status: mysqlEnum("wizShortsStatus", ["pending", "generating_scenes", "rendering", "assembling", "complete", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  /** Character Lock: FK to characters table (nullable — no lock if null) */
  characterId: int("characterId"),
  /** Whether to enforce character lock for this job */
  characterLockEnabled: boolean("characterLockEnabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type WizShortsJob = typeof wizShortsJobs.$inferSelect;
export type InsertWizShortsJob = typeof wizShortsJobs.$inferInsert;

export const wizShortsScenes = mysqlTable("wizShortsScenes", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  /** Scene order index (0-based) */
  sceneIndex: int("sceneIndex").notNull(),
  /** AI-generated scene description / video prompt */
  prompt: text("prompt").notNull(),
  /** Duration of this scene in seconds */
  duration: int("duration").default(5).notNull(),
  /** Optional caption text to overlay on this scene */
  caption: text("caption"),
  /** Grok Imagine request_id (prefixed with "grok:") */
  taskId: varchar("taskId", { length: 255 }),
  /** S3/CDN URL of the generated scene video */
  videoUrl: varchar("videoUrl", { length: 1024 }),
  /** S3 key for the scene video */
  videoKey: varchar("videoKey", { length: 512 }),
  status: mysqlEnum("wizShortSceneStatus", ["pending", "generating", "completed", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  /** Character Lock: preview image generated via Flux PuLID for face-consistent storyboard */
  previewImageUrl: varchar("previewImageUrl", { length: 1024 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type WizShortsScene = typeof wizShortsScenes.$inferSelect;
export type InsertWizShortsScene = typeof wizShortsScenes.$inferInsert;

// ── Analytics Tables ──────────────────────────────────────────────────────────

export const analyticsSessions = mysqlTable("analyticsSessions", {
  id: varchar("id", { length: 36 }).primaryKey(), // UUID
  visitorId: varchar("visitorId", { length: 64 }).notNull(), // fingerprint hash
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  duration: int("duration").default(0), // seconds
  pageCount: int("pageCount").default(1),
  entryPage: varchar("entryPage", { length: 512 }),
  exitPage: varchar("exitPage", { length: 512 }),
  referrer: varchar("referrer", { length: 1024 }),
  utmSource: varchar("utmSource", { length: 255 }),
  utmMedium: varchar("utmMedium", { length: 255 }),
  utmCampaign: varchar("utmCampaign", { length: 255 }),
  country: varchar("country", { length: 64 }),
  city: varchar("city", { length: 128 }),
  device: varchar("device", { length: 32 }), // desktop | mobile | tablet
  browser: varchar("browser", { length: 64 }),
  os: varchar("os", { length: 64 }),
  screenWidth: int("screenWidth"),
  bounced: boolean("bounced").default(true),
  converted: boolean("converted").default(false), // completed a render/purchase
});
export type AnalyticsSession = typeof analyticsSessions.$inferSelect;

export const analyticsPageViews = mysqlTable("analyticsPageViews", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 36 }).notNull(),
  visitorId: varchar("visitorId", { length: 64 }).notNull(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  path: varchar("path", { length: 512 }).notNull(),
  title: varchar("title", { length: 512 }),
  referrer: varchar("referrer", { length: 1024 }),
  timeOnPage: int("timeOnPage").default(0), // seconds
  scrollDepth: int("scrollDepth").default(0), // 0-100 percent
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AnalyticsPageView = typeof analyticsPageViews.$inferSelect;

export const analyticsEvents = mysqlTable("analyticsEvents", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 36 }).notNull(),
  visitorId: varchar("visitorId", { length: 64 }).notNull(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  event: varchar("event", { length: 128 }).notNull(), // e.g. "cta_click", "signup", "render_started"
  category: varchar("category", { length: 64 }), // e.g. "conversion", "engagement"
  label: varchar("label", { length: 255 }),
  value: varchar("value", { length: 255 }),
  path: varchar("path", { length: 512 }),
  meta: json("meta"), // arbitrary extra data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

// ── PROVIDER JOB TRACKING (Spend Protection Item 6) ──────────────────────────
// Every provider submission is logged here for idempotency, spend tracking, and audit.
export const providerJobLogs = mysqlTable("providerJobLogs", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  sceneId: int("sceneId").notNull(),
  provider: varchar("provider", { length: 64 }).notNull(),
  providerJobId: varchar("providerJobId", { length: 512 }),
  idempotencyKey: varchar("idempotencyKey", { length: 256 }).notNull(),
  status: mysqlEnum("pjlStatus", ["submitted", "completed", "failed", "cancelled"]).default("submitted").notNull(),
  attemptNumber: int("attemptNumber").default(1).notNull(),
  estimatedCostUsd: decimal("estimatedCostUsd", { precision: 10, scale: 4 }).default("0.0000"),
  actualCostUsd: decimal("actualCostUsd", { precision: 10, scale: 4 }),
  submissionReason: varchar("submissionReason", { length: 255 }),
  errorMessage: text("errorMessage"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  failedAt: timestamp("failedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProviderJobLog = typeof providerJobLogs.$inferSelect;
export type InsertProviderJobLog = typeof providerJobLogs.$inferInsert;

// ── WIZPERFORMER CONSENT LOGGING (GDPR Art. 9 explicit consent) ──────────────
// Logs each explicit consent given before uploading a performer photo.
export const wizPerformerConsents = mysqlTable("wizPerformerConsents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  characterId: int("characterId"),
  policyVersion: varchar("policyVersion", { length: 32 }).notNull().default("2026-04-21"),
  consentedAt: timestamp("consentedAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: varchar("userAgent", { length: 512 }),
  consentHasRight: boolean("consentHasRight").notNull().default(false),
  consentAgeVerified: boolean("consentAgeVerified").notNull().default(false),
  consentAiProcessing: boolean("consentAiProcessing").notNull().default(false),
  consentPrivacyPolicy: boolean("consentPrivacyPolicy").notNull().default(false),
  withdrawnAt: timestamp("withdrawnAt"),
});
export type WizPerformerConsent = typeof wizPerformerConsents.$inferSelect;
export type InsertWizPerformerConsent = typeof wizPerformerConsents.$inferInsert;

// ── DATA DELETION / EXPORT REQUESTS ──────────────────────────────────────────
export const dataRequests = mysqlTable("dataRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("dataRequestType", ["deletion", "export"]).notNull(),
  status: mysqlEnum("dataRequestStatus", ["pending", "processing", "completed", "rejected"]).default("pending").notNull(),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  notes: text("notes"),
});
export type DataRequest = typeof dataRequests.$inferSelect;
export type InsertDataRequest = typeof dataRequests.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// WizAdora™ — Internal API Foundation (Phase 1)
// Private internal API layer. Not publicly exposed.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Internal API keys for WizAdora.
 * Only wiz_test_sk_ keys for now. wiz_live_sk_ reserved for future production.
 * No public user-generated keys yet — admin-only.
 */
export const wizadoraApiKeys = mysqlTable("wizadora_api_keys", {
  id: int("id").primaryKey().autoincrement(),
  keyHash: varchar("key_hash", { length: 64 }).notNull().unique(),
  keyPrefix: varchar("key_prefix", { length: 20 }).notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  ownerId: int("owner_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isAdmin: boolean("is_admin").notNull().default(false),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  revokedAt: timestamp("revoked_at"),
});
export type WizadoraApiKey = typeof wizadoraApiKeys.$inferSelect;
export type InsertWizadoraApiKey = typeof wizadoraApiKeys.$inferInsert;

/**
 * WizAdora job model — full lifecycle.
 * queued → processing → completed | failed | cancelled
 */
export const wizadoraJobs = mysqlTable("wizadora_jobs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("user_id").notNull(),
  apiKeyId: int("api_key_id"),
  prompt: text("prompt").notNull(),
  negativePrompt: text("negative_prompt"),
  duration: int("duration").notNull().default(5),
  resolution: varchar("resolution", { length: 20 }).notNull().default("720p"),
  aspectRatio: varchar("aspect_ratio", { length: 10 }).notNull().default("16:9"),
  style: varchar("style", { length: 50 }).notNull().default("cinematic"),
  motionIntensity: varchar("motion_intensity", { length: 20 }).default("medium"),
  provider: varchar("provider", { length: 50 }).notNull().default("atlas_cloud"),
  providerJobId: varchar("provider_job_id", { length: 200 }),
  idempotencyKey: varchar("idempotency_key", { length: 200 }).unique(),
  status: mysqlEnum("wizadora_job_status", ["queued", "processing", "completed", "failed", "cancelled"]).notNull().default("queued"),
  progress: int("progress").notNull().default(0),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 4 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 4 }),
  creditsReserved: int("credits_reserved").notNull().default(0),
  creditsCharged: int("credits_charged").notNull().default(0),
  outputVideoUrl: text("output_video_url"),
  thumbnailUrl: text("thumbnail_url"),
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),
  moderationBlocked: boolean("moderation_blocked").notNull().default(false),
  moderationReason: varchar("moderation_reason", { length: 200 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  failedAt: timestamp("failed_at"),
  cancelledAt: timestamp("cancelled_at"),
});
export type WizadoraJob = typeof wizadoraJobs.$inferSelect;
export type InsertWizadoraJob = typeof wizadoraJobs.$inferInsert;

/**
 * Provider submission log — every Atlas Cloud call logged here, never deleted.
 */
export const wizadoraProviderLogs = mysqlTable("wizadora_provider_logs", {
  id: int("id").primaryKey().autoincrement(),
  jobId: varchar("job_id", { length: 36 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  providerJobId: varchar("provider_job_id", { length: 200 }),
  requestPayloadHash: varchar("request_payload_hash", { length: 64 }),
  idempotencyKey: varchar("idempotency_key", { length: 200 }),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 4 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 4 }),
  status: mysqlEnum("wizadora_provider_status", ["submitted", "completed", "failed", "cancelled"]).notNull().default("submitted"),
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  failedAt: timestamp("failed_at"),
});
export type WizadoraProviderLog = typeof wizadoraProviderLogs.$inferSelect;
export type InsertWizadoraProviderLog = typeof wizadoraProviderLogs.$inferInsert;

/**
 * Idempotency key store — prevents duplicate jobs from same client key.
 */
export const wizadoraIdempotencyKeys = mysqlTable("wizadora_idempotency_keys", {
  id: int("id").primaryKey().autoincrement(),
  idempotencyKey: varchar("idempotency_key", { length: 200 }).notNull().unique(),
  userId: int("user_id").notNull(),
  jobId: varchar("job_id", { length: 36 }).notNull(),
  requestHash: varchar("request_hash", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});
export type WizadoraIdempotencyKey = typeof wizadoraIdempotencyKeys.$inferSelect;
export type InsertWizadoraIdempotencyKey = typeof wizadoraIdempotencyKeys.$inferInsert;

/**
 * Webhook delivery log — HMAC-SHA256 signed, replay protection.
 */
export const wizadoraWebhookLogs = mysqlTable("wizadora_webhook_logs", {
  id: int("id").primaryKey().autoincrement(),
  jobId: varchar("job_id", { length: 36 }).notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  endpointUrl: text("endpoint_url"),
  payloadHash: varchar("payload_hash", { length: 64 }),
  signature: varchar("signature", { length: 128 }),
  deliveryStatus: mysqlEnum("wizadora_webhook_status", ["pending", "delivered", "failed", "skipped"]).notNull().default("pending"),
  attemptCount: int("attempt_count").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  nextRetryAt: timestamp("next_retry_at"),
  responseCode: int("response_code"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at"),
});
export type WizadoraWebhookLog = typeof wizadoraWebhookLogs.$inferSelect;
export type InsertWizadoraWebhookLog = typeof wizadoraWebhookLogs.$inferInsert;

/**
 * Spend cap configuration per user — checked before every provider submission.
 */
export const wizadoraSpendCaps = mysqlTable("wizadora_spend_caps", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull().unique(),
  perJobCapGbp: decimal("per_job_cap_gbp", { precision: 10, scale: 4 }).notNull().default("2.00"),
  dailyCapGbp: decimal("daily_cap_gbp", { precision: 10, scale: 4 }).notNull().default("20.00"),
  monthlyCapGbp: decimal("monthly_cap_gbp", { precision: 10, scale: 4 }).notNull().default("100.00"),
  accountCapGbp: decimal("account_cap_gbp", { precision: 10, scale: 4 }).notNull().default("500.00"),
  dailySpentGbp: decimal("daily_spent_gbp", { precision: 10, scale: 4 }).notNull().default("0.00"),
  monthlySpentGbp: decimal("monthly_spent_gbp", { precision: 10, scale: 4 }).notNull().default("0.00"),
  totalSpentGbp: decimal("total_spent_gbp", { precision: 10, scale: 4 }).notNull().default("0.00"),
  dailyResetAt: timestamp("daily_reset_at"),
  monthlyResetAt: timestamp("monthly_reset_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});
export type WizadoraSpendCap = typeof wizadoraSpendCaps.$inferSelect;
export type InsertWizadoraSpendCap = typeof wizadoraSpendCaps.$inferInsert;

/**
 * A/B experiment assignments — stores which variant each user was assigned to.
 * Keyed on (userId, experimentId) so one row per user per experiment.
 * Anonymous users are stored with userId = NULL and identified by anonId.
 */
export const experimentAssignments = mysqlTable("experiment_assignments", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId"),                                                     // NULL for anonymous
  anonId: varchar("anonId", { length: 64 }),                                // localStorage anon ID
  experimentId: varchar("experimentId", { length: 64 }).notNull(),
  variant: varchar("variant", { length: 32 }).notNull(),                    // control | variant_b | variant_c
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
export type ExperimentAssignment = typeof experimentAssignments.$inferSelect;
export type InsertExperimentAssignment = typeof experimentAssignments.$inferInsert;

// ── Broadcast Emails ─────────────────────────────────────────────────────────
/**
 * Tracks every mailshot sent by the admin via the broadcast email tool.
 * Each row represents one send campaign.
 */
export const broadcastEmails = mysqlTable("broadcast_emails", {
  id: int("id").primaryKey().autoincrement(),
  subject: varchar("subject", { length: 500 }).notNull(),
  bodyHtml: longtext("bodyHtml").notNull(),
  recipientCount: int("recipientCount").default(0).notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  sentBy: int("sentBy"), // userId of the admin who sent it
});
export type BroadcastEmail = typeof broadcastEmails.$inferSelect;
export type InsertBroadcastEmail = typeof broadcastEmails.$inferInsert;

// ── Credit Disputes ───────────────────────────────────────────────────────────
/**
 * Tracks user-submitted credit dispute requests.
 * Admin reviews each dispute and decides how many credits to refund.
 * No automatic refunds — admin approval required for every credit return.
 */
export const creditDisputes = mysqlTable("creditDisputes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  jobId: int("jobId"), // Optional: the musicVideoJob or project ID being disputed
  jobType: varchar("jobType", { length: 32 }), // "music_video" | "short" | "lipsync" | "image" | "other"
  creditsCharged: int("creditsCharged").notNull(), // How many credits were charged for this job
  creditsRequested: int("creditsRequested"), // How many credits the user is requesting back (optional)
  reason: text("reason").notNull(), // User's explanation of the issue
  status: mysqlEnum("status", ["pending", "approved", "partial", "rejected"]).default("pending").notNull(),
  adminNote: text("adminNote"), // Admin's internal note when resolving
  creditsRefunded: int("creditsRefunded").default(0).notNull(), // Actual credits refunded by admin
  resolvedBy: int("resolvedBy"), // userId of the admin who resolved it
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CreditDispute = typeof creditDisputes.$inferSelect;
export type InsertCreditDispute = typeof creditDisputes.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Character Library — saved characters reusable across all products
// ─────────────────────────────────────────────────────────────────────────────
export const savedCharacters = mysqlTable("savedCharacters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Display name for the character (e.g. "Freddy the Schnauzer") */
  name: varchar("name", { length: 255 }).notNull(),
  /** Full description used for AI generation (traits, costume, colours, etc.) */
  description: text("description"),
  /** Voice/lip-sync type for WizSync™ */
  gender: mysqlEnum("gender", ["male", "female", "neutral"]).default("neutral").notNull(),
  /** Animation style slug (e.g. "pixar3d", "ghibli", "anime") */
  animStyle: varchar("animStyle", { length: 64 }),
  /** S3 URL of the original uploaded reference photo */
  photoUrl: text("photoUrl"),
  /** S3 URL of the AI-generated style preview image */
  previewUrl: text("previewUrl"),
  /** Comma-separated tags for search/filter (e.g. "animal,dog,pixar") */
  tags: varchar("tags", { length: 500 }),
  /** How many times this character has been used across projects */
  useCount: int("useCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SavedCharacter = typeof savedCharacters.$inferSelect;
export type InsertSavedCharacter = typeof savedCharacters.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// CREATIVE STUDIOS SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

export const creativeProfiles = mysqlTable("creativeProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("other"),
  bio: text("bio"),
  avatarUrl: varchar("avatarUrl", { length: 500 }),
  colorTheme: varchar("colorTheme", { length: 20 }).notNull().default("#b8892a"),
  isDefault: tinyint("isDefault").notNull().default(0),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type CreativeProfile = typeof creativeProfiles.$inferSelect;
export type InsertCreativeProfile = typeof creativeProfiles.$inferInsert;

export const creatorProjects = mysqlTable("creatorProjects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  profileId: int("profileId"),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull().default("other"),
  status: varchar("status", { length: 30 }).notNull().default("complete"),
  outputUrl: varchar("outputUrl", { length: 1000 }),
  thumbnailUrl: varchar("thumbnailUrl", { length: 1000 }),
  source: varchar("source", { length: 50 }).default("manual"),
  jobRef: varchar("jobRef", { length: 255 }),
  durationSeconds: int("durationSeconds"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type CreatorProject = typeof creatorProjects.$inferSelect;
export type InsertCreatorProject = typeof creatorProjects.$inferInsert;

export const socialConnections = mysqlTable("socialConnections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: varchar("platform", { length: 30 }).notNull(),
  platformUserId: varchar("platformUserId", { length: 255 }),
  platformUsername: varchar("platformUsername", { length: 255 }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: bigint("tokenExpiresAt", { mode: "number" }),
  isActive: tinyint("isActive").notNull().default(1),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type SocialConnection = typeof socialConnections.$inferSelect;

export const socialPublishLogs = mysqlTable("socialPublishLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  platform: varchar("platform", { length: 30 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  platformPostId: varchar("platformPostId", { length: 255 }),
  platformPostUrl: varchar("platformPostUrl", { length: 1000 }),
  errorMessage: text("errorMessage"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type SocialPublishLog = typeof socialPublishLogs.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// WIZAVISION — Streaming & Discovery Platform
// ─────────────────────────────────────────────────────────────────────────────

export const wizavisionVideos = mysqlTable("wizavisionVideos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  videoUrl: varchar("videoUrl", { length: 1000 }).notNull(),
  thumbnailUrl: varchar("thumbnailUrl", { length: 1000 }),
  duration: int("duration"),
  mainCategory: varchar("mainCategory", { length: 100 }).notNull().default("music_video"),
  subCategory: varchar("subCategory", { length: 100 }),
  genre: varchar("genre", { length: 100 }),
  visualStyle: varchar("visualStyle", { length: 100 }),
  mood: varchar("mood", { length: 100 }),
  tags: text("tags"),
  creatorName: varchar("creatorName", { length: 255 }),
  creatorUsername: varchar("creatorUsername", { length: 100 }),
  creatorAvatarUrl: varchar("creatorAvatarUrl", { length: 1000 }),
  isPublic: tinyint("isPublic").notNull().default(1),
  isFeatured: tinyint("isFeatured").notNull().default(0),
  isStaffPick: tinyint("isStaffPick").notNull().default(0),
  isKidsSafe: tinyint("isKidsSafe").notNull().default(0),
  isOriginal: tinyint("isOriginal").notNull().default(0),
  viewCount: int("viewCount").notNull().default(0),
  likeCount: int("likeCount").notNull().default(0),
  sourceType: varchar("sourceType", { length: 50 }).default("user_upload"),
  projectId: int("projectId"),
  metaTitle: varchar("metaTitle", { length: 255 }),
  metaDescription: varchar("metaDescription", { length: 500 }),
  publishedAt: bigint("publishedAt", { mode: "number" }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type WizavisionVideo = typeof wizavisionVideos.$inferSelect;
export type InsertWizavisionVideo = typeof wizavisionVideos.$inferInsert;

export const wizavisionCreatorChannels = mysqlTable("wizavisionCreatorChannels", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  displayName: varchar("displayName", { length: 255 }).notNull(),
  bio: text("bio"),
  avatarUrl: varchar("avatarUrl", { length: 1000 }),
  bannerUrl: varchar("bannerUrl", { length: 1000 }),
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  youtubeUrl: varchar("youtubeUrl", { length: 500 }),
  tiktokUrl: varchar("tiktokUrl", { length: 500 }),
  instagramUrl: varchar("instagramUrl", { length: 500 }),
  followerCount: int("followerCount").notNull().default(0),
  videoCount: int("videoCount").notNull().default(0),
  isVerified: tinyint("isVerified").notNull().default(0),
  isFeatured: tinyint("isFeatured").notNull().default(0),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type WizavisionCreatorChannel = typeof wizavisionCreatorChannels.$inferSelect;
export type InsertWizavisionCreatorChannel = typeof wizavisionCreatorChannels.$inferInsert;

// ─── Saved Storyboards ────────────────────────────────────────────────────────
export const savedStoryboards = mysqlTable("savedStoryboards", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  brief: text("brief").notNull(),
  lyrics: text("lyrics"),
  animStyle: varchar("animStyle", { length: 100 }),
  sceneCount: int("sceneCount").notNull().default(8),
  scenes: text("scenes").notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type SavedStoryboard = typeof savedStoryboards.$inferSelect;
export type InsertSavedStoryboard = typeof savedStoryboards.$inferInsert;


// ─── Character-Scene Junction Table ──────────────────────────────────────────
// Maps which characters appear in each music video scene, with ordering and
// primary character designation. This replaces the JSON characterAssignments
// column in musicVideoScenes for richer per-scene character management.
export const characterScenes = mysqlTable("characterScenes", {
  id: int("id").autoincrement().primaryKey(),
  sceneId: int("sceneId").notNull(),       // FK → musicVideoScenes.id
  characterId: int("characterId").notNull(), // FK → videoCharacters.id
  isPrimary: boolean("isPrimary").notNull().default(false), // true = focus character for this scene
  positionOrder: int("positionOrder").notNull().default(0), // 0 = first/leftmost character
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CharacterScene = typeof characterScenes.$inferSelect;
export type InsertCharacterScene = typeof characterScenes.$inferInsert;

// ─── Provider Health & Cost Protection ───────────────────────────────────────
// Tracks per-provider reliability metrics to enable automatic routing,
// demotion, and spend guards. Updated after every scene completes or fails.
export const providerHealth = mysqlTable("providerHealth", {
  id: int("id").autoincrement().primaryKey(),
  provider: varchar("provider", { length: 64 }).notNull().unique(),
  successCount: int("successCount").notNull().default(0),
  failureCount: int("failureCount").notNull().default(0),
  consecutiveFailures: int("consecutiveFailures").notNull().default(0),
  totalSpendUsd: decimal("totalSpendUsd", { precision: 10, scale: 4 }).notNull().default("0"),
  wastedSpendUsd: decimal("wastedSpendUsd", { precision: 10, scale: 4 }).notNull().default("0"),
  avgRenderTimeMs: int("avgRenderTimeMs").notNull().default(0),
  isHealthy: boolean("isHealthy").notNull().default(true),
  mode: mysqlEnum("providerMode", ["full", "probe-only", "disabled"]).notNull().default("full"),
  lastFailureAt: timestamp("lastFailureAt"),
  lastSuccessAt: timestamp("lastSuccessAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProviderHealth = typeof providerHealth.$inferSelect;
export type InsertProviderHealth = typeof providerHealth.$inferInsert;

// Logs every individual scene generation attempt with cost and outcome.
export const providerSpendEvents = mysqlTable("providerSpendEvents", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  sceneId: int("sceneId"),
  provider: varchar("provider", { length: 64 }).notNull(),
  costUsd: decimal("costUsd", { precision: 8, scale: 4 }).notNull().default("0"),
  status: mysqlEnum("spendEventStatus", ["success", "failure", "timeout", "probe_success", "probe_failure"]).notNull(),
  renderTimeMs: int("renderTimeMs"),
  isProbe: boolean("isProbe").notNull().default(false),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProviderSpendEvent = typeof providerSpendEvents.$inferSelect;
export type InsertProviderSpendEvent = typeof providerSpendEvents.$inferInsert;

// ── Scene Action History Log ──────────────────────────────────────────────────
// Records every user-initiated retry or cancel action on a music video scene.
// Used to populate the Scene History section on the user dashboard.
export const sceneActionLogs = mysqlTable("sceneActionLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  jobId: int("jobId").notNull(),
  sceneId: int("sceneId").notNull(),
  action: mysqlEnum("salAction", ["retry", "cancel"]).notNull(),
  sceneIndex: int("sceneIndex").notNull().default(0),
  jobTitle: varchar("jobTitle", { length: 255 }),
  errorMessageBefore: text("errorMessageBefore"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SceneActionLog = typeof sceneActionLogs.$inferSelect;
export type InsertSceneActionLog = typeof sceneActionLogs.$inferInsert;

// ── Phase 2: Production Pipeline Hardening ────────────────────────────────────

/**
 * renderAttempts — Immutable audit trail for every assembled final video.
 *
 * Every call to assembleMusicVideo() writes one row here with a UUID-keyed
 * S3 path, SHA256 hash, file size, measured duration, and validation result.
 * Re-renders always produce a new row — previous rows are never updated.
 */
export const renderAttempts = mysqlTable("renderAttempts", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  attemptNumber: int("attemptNumber").notNull().default(1),
  finalVideoUrl: varchar("finalVideoUrl", { length: 1024 }),
  finalVideoKey: varchar("finalVideoKey", { length: 512 }),
  sha256: varchar("sha256", { length: 64 }),
  fileSizeBytes: bigint("fileSizeBytes", { mode: "number" }),
  durationSeconds: decimal("durationSeconds", { precision: 8, scale: 3 }),
  sceneCount: int("sceneCount").notNull().default(0),
  validationStatus: mysqlEnum("renderValidationStatus", [
    "pending", "passed", "failed", "skipped",
  ]).notNull().default("pending"),
  validationError: text("validationError"),
  validationErrorCode: varchar("validationErrorCode", { length: 64 }),
  assembledAt: timestamp("assembledAt").defaultNow().notNull(),
});
export type RenderAttempt = typeof renderAttempts.$inferSelect;
export type InsertRenderAttempt = typeof renderAttempts.$inferInsert;

/**
 * validationRuns — Results of the automated daily Golden Validation pipeline.
 *
 * Each row represents one end-to-end automated render of the Golden Validation
 * fixture. Used to detect regressions before real users are affected.
 */
export const validationRuns = mysqlTable("validationRuns", {
  id: int("id").autoincrement().primaryKey(),
  runAt: timestamp("runAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  status: mysqlEnum("validationRunStatus", [
    "running", "passed", "failed", "timeout",
  ]).notNull().default("running"),
  jobId: int("jobId"),
  finalVideoUrl: varchar("finalVideoUrl", { length: 1024 }),
  sha256: varchar("sha256", { length: 64 }),
  durationSeconds: decimal("durationSeconds", { precision: 8, scale: 3 }),
  expectedDurationSeconds: decimal("expectedDurationSeconds", { precision: 8, scale: 3 }),
  sceneCount: int("sceneCount").default(0),
  expectedSceneCount: int("expectedSceneCount").default(0),
  errorMessage: text("errorMessage"),
  durationMs: int("durationMs"),
});
export type ValidationRun = typeof validationRuns.$inferSelect;
export type InsertValidationRun = typeof validationRuns.$inferInsert;
