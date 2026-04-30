import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { notifyOwner } from "./notification";
import { FREE_TRIAL_CREDITS } from "../products";
import { ENV } from "./env";
import { addCredits, getUserCredits } from "../credit-service";
import { emailNewSignup } from "../email";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      const isOwner = userInfo.openId === ENV.ownerOpenId;

      // Check if this is a new user (no credits record yet)
      const existingUser = await db.getUserByOpenId(userInfo.openId);
      const isNewUser = !existingUser;

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const savedUser = await db.getUserByOpenId(userInfo.openId);

      if (savedUser) {
        if (isOwner) {
          // Owner: ensure they always have a large credit balance for testing
          const currentBalance = await getUserCredits(savedUser.id);
          const OWNER_MIN_CREDITS = 999999;
          if (currentBalance < OWNER_MIN_CREDITS) {
            const topUp = OWNER_MIN_CREDITS - currentBalance;
            await addCredits(
              savedUser.id,
              topUp,
              "subscription_grant",
              "Owner account: unlimited test credits"
            );
          }
        } else if (isNewUser) {
          // Regular new user: grant free trial credits
          await db.addCredits(
            savedUser.id,
            FREE_TRIAL_CREDITS,
            "subscription_grant",
            `Welcome gift: ${FREE_TRIAL_CREDITS} free trial credits`
          );
          // Notify owner of new sign-up
          await notifyOwner({
            title: "New WIZ AI Sign-Up",
            content: `New user signed up: ${userInfo.name || "Unknown"} (${userInfo.email || "no email"}) — ${FREE_TRIAL_CREDITS} trial credits granted.`,
          }).catch(() => {}); // Non-blocking
          // Email notification to tim@wiz-ai.io
          await emailNewSignup({
            name: userInfo.name || "Unknown",
            email: userInfo.email || "",
            id: savedUser.id,
            createdAt: new Date(),
          }).catch(() => {});
        }
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Extract post-login returnPath from state if present.
      // State may be a JSON payload { redirectUri, returnPath } or a legacy base64 string.
      // New users (first sign-up) are always sent to /onboarding regardless of returnPath,
      // unless the returnPath is a specific studio/product page (not just "/" or "/dashboard").
      let postLoginPath = "/";
      try {
        const decoded = Buffer.from(state, "base64").toString("utf8");
        const parsed = JSON.parse(decoded);
        if (parsed.returnPath && typeof parsed.returnPath === "string" && parsed.returnPath.startsWith("/")) {
          postLoginPath = parsed.returnPath;
        }
      } catch {
        // Legacy state format — just redirect to home
      }
      // New users: redirect to /onboarding unless they were heading to a specific studio/product
      if (isNewUser && (postLoginPath === "/" || postLoginPath === "/dashboard")) {
        postLoginPath = "/onboarding";
      }
      res.redirect(302, postLoginPath);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
