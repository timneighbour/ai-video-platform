/**
 * WizPerformerConsentModal
 *
 * Shown before a user uploads a face photo for AI performer generation.
 * Explains what is captured, why, how long it is stored, and provides a
 * delete option. Required for GDPR / privacy compliance.
 *
 * Usage:
 *   const [consentGiven, setConsentGiven] = useState(false);
 *   const [showConsent, setShowConsent] = useState(true);
 *
 *   if (!consentGiven && showConsent) {
 *     return <WizPerformerConsentModal
 *       onAccept={() => { setConsentGiven(true); setShowConsent(false); }}
 *       onDecline={() => setShowConsent(false)}
 *     />;
 *   }
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Camera, Clock, Trash2, Lock, ChevronDown, ChevronUp } from "lucide-react";

interface WizPerformerConsentModalProps {
  /** Called when the user accepts and ticks the checkbox */
  onAccept: () => void;
  /** Called when the user declines or closes the modal */
  onDecline: () => void;
  /** Optional character name for personalised copy */
  characterName?: string;
}

const CONSENT_STORAGE_KEY = "wizperformer_consent_v1";

/** Check if the user has already given consent in this browser session */
export function hasGivenConsent(): boolean {
  try {
    return sessionStorage.getItem(CONSENT_STORAGE_KEY) === "accepted";
  } catch {
    return false;
  }
}

/** Persist consent decision for this session */
export function persistConsent(): void {
  try {
    sessionStorage.setItem(CONSENT_STORAGE_KEY, "accepted");
  } catch {
    // sessionStorage unavailable — proceed without persisting
  }
}

export default function WizPerformerConsentModal({
  onAccept,
  onDecline,
  characterName,
}: WizPerformerConsentModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleAccept = () => {
    if (!agreed) return;
    persistConsent();
    onAccept();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-[#0f0f0f] border border-[--color-gold]/30 rounded-2xl shadow-2xl overflow-hidden">
        {/* Gold top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[--color-gold]/60 via-[--color-gold] to-[--color-gold]/60" />

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[--color-gold]/10 border border-[--color-gold]/30 flex items-center justify-center">
              <Shield className="w-6 h-6 text-[--color-gold]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">
                WizPerformer™ Privacy Notice
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Before you upload{characterName ? ` ${characterName}'s` : " a"} photo, please read how we handle your image data.
              </p>
            </div>
          </div>

          {/* Key points */}
          <div className="space-y-3 mb-5">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <Camera className="w-5 h-5 text-[--color-gold] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">What is captured</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Your uploaded photo is used to generate an AI performer that looks like you. Only the image you upload is processed — no additional biometric data is extracted.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <Lock className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">Why it is captured</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Your photo is used solely to generate AI performer images and videos for your creative project. It is never used for advertising, sold to third parties, or shared outside WIZ AI.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <Clock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">How long it is stored</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Your photo and generated AI images are stored for as long as your account is active. You can delete them at any time from your account settings or by contacting us.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <Trash2 className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">Your right to delete</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  You can remove your photo and all generated AI images at any time. Use the "Remove" button on your character card, or email <span className="text-[--color-gold]">privacy@wiz-ai.io</span> for a full data deletion request.
                </p>
              </div>
            </div>
          </div>

          {/* Expandable full details */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
          >
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showDetails ? "Hide" : "Show"} full privacy details
          </button>

          {showDetails && (
            <div className="mb-5 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400 space-y-2 leading-relaxed">
              <p><strong className="text-zinc-300">Data controller:</strong> WIZ AI Ltd. Contact: privacy@wiz-ai.io</p>
              <p><strong className="text-zinc-300">Legal basis:</strong> Your explicit consent (GDPR Art. 6(1)(a) and Art. 9(2)(a) where applicable).</p>
              <p><strong className="text-zinc-300">Data transfers:</strong> Your image may be processed by our AI generation infrastructure. All processing is governed by data processing agreements that meet GDPR standards.</p>
              <p><strong className="text-zinc-300">Your rights:</strong> You have the right to access, rectify, erase, restrict, or port your data. You may also withdraw consent at any time without affecting the lawfulness of prior processing.</p>
              <p><strong className="text-zinc-300">Full policy:</strong> See our <a href="/privacy" target="_blank" className="text-[--color-gold] hover:underline">Privacy Policy</a> for complete details.</p>
            </div>
          )}

          {/* Consent checkbox */}
          <label className="flex items-start gap-3 cursor-pointer mb-6 group">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(!!v)}
              className="mt-0.5 border-[--color-gold]/50 data-[state=checked]:bg-[--color-gold] data-[state=checked]:border-[--color-gold]"
            />
            <span className="text-sm text-zinc-300 group-hover:text-white transition-colors leading-snug">
              I understand and consent to WIZ AI processing my photo to generate an AI performer for my creative project. I can withdraw this consent and delete my data at any time.
            </span>
          </label>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
              onClick={onDecline}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-[--color-gold] hover:bg-[--color-gold]/90 text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!agreed}
              onClick={handleAccept}
            >
              Continue with Photo Upload
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
