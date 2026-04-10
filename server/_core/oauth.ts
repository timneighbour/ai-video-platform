import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { notifyOwner } from "./notification";
import { FREE_TRIAL_CREDITS } from "../products";
import { ENV } from "./env";
import { addCredits, getUserCredits } from "../credit-service";

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
            title: "New WizVid Sign-Up",
            content: `New user signed up: ${userInfo.name || "Unknown"} (${userInfo.email || "no email"}) — ${FREE_TRIAL_CREDITS} trial credits granted.`,
          }).catch(() => {}); // Non-blocking
        }
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
