/**
 * CinematicIntroSequence V4 — True Cinematic VIDEO Experience
 *
 * A full-screen video player that plays a composed cinematic intro
 * with 6 AI-generated scenes, synced CSS text overlays, spatial audio
 * engine, and a gated "Enter Experience" CTA at the end.
 *
 * VIDEO: 19.5s composed from 6 clips with crossfade transitions
 * AUDIO: Web Audio API spatial engine (bass rumble → tension → impact → reverb)
 * TEXT:  CSS-animated overlays synced to video currentTime
 * CTA:   "Enter Experience →" button appears on final frame
 */
import { useRef, useState, useEffect, useCallback } from "react";

const INTRO_VIDEO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/intro-final_51bdd324.mp4";

const WIZVID_LOGO =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-transparent_fcdb69d6.png";

/* ── timing map (seconds) ── */
const T = {
  SCENE1_END: 3.5,        // cinematic open
  SCENE2_START: 3.5,      // music video
  SCENE2_END: 6.5,
  SCENE3_START: 6.5,      // cinematic film
  SCENE3_END: 9.5,
  SCENE4_START: 9.5,      // creator content
  SCENE4_END: 12.5,
  SCENE5_START: 12.5,     // animation
  SCENE5_END: 15.5,
  SCENE6_START: 15.5,     // logo reveal
  LOGO_SHOW: 16.0,
  USP_SHOW: 17.0,
  CTA_SHOW: 18.0,
  VIDEO_END: 19.5,
};

/* ── genre labels with timing ── */
const GENRE_LABELS = [
  { text: "Music Videos", start: 3.8, end: 6.2, x: "20%", y: "75%", color: "#f59e0b" },
  { text: "Cinematic Films", start: 6.8, end: 9.2, x: "50%", y: "80%", color: "#06b6d4" },
  { text: "Creator Videos", start: 9.8, end: 12.2, x: "75%", y: "75%", color: "#a78bfa" },
  { text: "Animation Videos", start: 12.8, end: 15.2, x: "50%", y: "78%", color: "#34d399" },
];

interface Props {
  onComplete: () => void;
}

export default function CinematicIntroSequence({ onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const [currentTime, setCurrentTime] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [showUSP, setShowUSP] = useState(false);
  const [impactFired, setImpactFired] = useState(false);

  /* ── spatial audio engine ── */
  const startAudio = useCallback(() => {
    if (audioStarted || audioCtxRef.current) return;
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      setAudioStarted(true);

      // unmute video
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.volume = 0; // video has no audio track, keep at 0
      }

      const now = ctx.currentTime;

      // 1. Deep bass rumble (0–16s)
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = "sine";
      bassOsc.frequency.setValueAtTime(28, now);
      bassOsc.frequency.linearRampToValueAtTime(45, now + 16);
      bassGain.gain.setValueAtTime(0, now);
      bassGain.gain.linearRampToValueAtTime(0.25, now + 2);
      bassGain.gain.setValueAtTime(0.25, now + 14);
      bassGain.gain.linearRampToValueAtTime(0.4, now + 15.5);
      bassGain.gain.linearRampToValueAtTime(0, now + 17);
      bassOsc.connect(bassGain).connect(ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 17);

      // 2. Rising cinematic tension (3–16s) — detuned saw through bandpass
      const tensionOsc = ctx.createOscillator();
      const tensionGain = ctx.createGain();
      const bandpass = ctx.createBiquadFilter();
      tensionOsc.type = "sawtooth";
      tensionOsc.frequency.setValueAtTime(55, now + 3);
      tensionOsc.frequency.linearRampToValueAtTime(110, now + 15);
      tensionOsc.detune.setValueAtTime(-15, now + 3);
      bandpass.type = "bandpass";
      bandpass.frequency.setValueAtTime(200, now + 3);
      bandpass.frequency.exponentialRampToValueAtTime(3000, now + 15);
      bandpass.Q.setValueAtTime(2, now + 3);
      tensionGain.gain.setValueAtTime(0, now + 3);
      tensionGain.gain.linearRampToValueAtTime(0.08, now + 6);
      tensionGain.gain.linearRampToValueAtTime(0.15, now + 14);
      tensionGain.gain.linearRampToValueAtTime(0, now + 16.5);
      tensionOsc.connect(bandpass).connect(tensionGain).connect(ctx.destination);
      tensionOsc.start(now + 3);
      tensionOsc.stop(now + 17);

      // 3. Atmospheric pad (6–18s) — warm Am chord
      [220, 261.63, 329.63].forEach((freq) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + 6);
        g.gain.setValueAtTime(0, now + 6);
        g.gain.linearRampToValueAtTime(0.04, now + 9);
        g.gain.setValueAtTime(0.04, now + 16);
        g.gain.linearRampToValueAtTime(0, now + 19);
        osc.connect(g).connect(ctx.destination);
        osc.start(now + 6);
        osc.stop(now + 20);
      });

      // 4. Impact hit at logo reveal (~16s)
      setTimeout(() => {
        if (!audioCtxRef.current) return;
        const c = audioCtxRef.current;
        const t = c.currentTime;

        // Sub drop
        const subOsc = c.createOscillator();
        const subGain = c.createGain();
        subOsc.type = "sine";
        subOsc.frequency.setValueAtTime(80, t);
        subOsc.frequency.exponentialRampToValueAtTime(25, t + 1.5);
        subGain.gain.setValueAtTime(0.5, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 2);
        subOsc.connect(subGain).connect(c.destination);
        subOsc.start(t);
        subOsc.stop(t + 2);

        // Noise burst
        const bufferSize = c.sampleRate * 0.3;
        const noiseBuffer = c.createBuffer(2, bufferSize, c.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const data = noiseBuffer.getChannelData(ch);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
          }
        }
        const noiseSource = c.createBufferSource();
        const noiseGain = c.createGain();
        const noiseLPF = c.createBiquadFilter();
        noiseSource.buffer = noiseBuffer;
        noiseLPF.type = "lowpass";
        noiseLPF.frequency.setValueAtTime(2000, t);
        noiseLPF.frequency.exponentialRampToValueAtTime(200, t + 0.5);
        noiseGain.gain.setValueAtTime(0.35, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        noiseSource.connect(noiseLPF).connect(noiseGain).connect(c.destination);
        noiseSource.start(t);

        // Boom body
        const boomOsc = c.createOscillator();
        const boomGain = c.createGain();
        boomOsc.type = "triangle";
        boomOsc.frequency.setValueAtTime(120, t);
        boomOsc.frequency.exponentialRampToValueAtTime(40, t + 0.8);
        boomGain.gain.setValueAtTime(0.4, t);
        boomGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        boomOsc.connect(boomGain).connect(c.destination);
        boomOsc.start(t);
        boomOsc.stop(t + 1.5);

        setImpactFired(true);
      }, 16000);

      // 5. Reverb tail (16–20s) — convolver with synthetic IR
      const irLength = ctx.sampleRate * 3;
      const irBuffer = ctx.createBuffer(2, irLength, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = irBuffer.getChannelData(ch);
        for (let i = 0; i < irLength; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (irLength * 0.25));
        }
      }
      const convolver = ctx.createConvolver();
      convolver.buffer = irBuffer;
      const reverbGain = ctx.createGain();
      reverbGain.gain.setValueAtTime(0.12, now);
      // Route tension through reverb
      tensionGain.connect(convolver);
      convolver.connect(reverbGain).connect(ctx.destination);
    } catch {
      // Audio not available — continue silently
    }
  }, [audioStarted]);

  /* ── video time sync loop ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncLoop = () => {
      const t = video.currentTime;
      setCurrentTime(t);

      if (t >= T.LOGO_SHOW && !showLogo) setShowLogo(true);
      if (t >= T.USP_SHOW && !showUSP) setShowUSP(true);
      if (t >= T.CTA_SHOW && !showCTA) setShowCTA(true);

      if (!video.paused && !video.ended) {
        rafRef.current = requestAnimationFrame(syncLoop);
      }
    };

    video.addEventListener("play", () => {
      rafRef.current = requestAnimationFrame(syncLoop);
    });
    video.addEventListener("timeupdate", () => {
      setCurrentTime(video.currentTime);
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [showLogo, showUSP, showCTA]);

  /* ── pause video at end for CTA hold ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleEnd = () => {
      setShowCTA(true);
      setShowLogo(true);
      setShowUSP(true);
    };
    video.addEventListener("ended", handleEnd);
    return () => video.removeEventListener("ended", handleEnd);
  }, []);

  /* ── handle user interaction to start audio ── */
  const handleInteraction = useCallback(() => {
    if (!audioStarted) {
      startAudio();
    }
  }, [audioStarted, startAudio]);

  /* ── skip / enter ── */
  const handleSkip = useCallback(() => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    cancelAnimationFrame(rafRef.current);
    onComplete();
  }, [onComplete]);

  const handleEnter = useCallback(() => {
    handleSkip();
  }, [handleSkip]);

  /* ── keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSkip();
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleInteraction();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSkip, handleInteraction]);

  /* ── genre label visibility helper ── */
  const isVisible = (start: number, end: number) => {
    return currentTime >= start && currentTime <= end;
  };
  const labelOpacity = (start: number, end: number) => {
    if (currentTime < start) return 0;
    if (currentTime < start + 0.4) return (currentTime - start) / 0.4;
    if (currentTime > end - 0.4) return Math.max(0, (end - currentTime) / 0.4);
    return 1;
  };

  const videoEnded = currentTime >= T.VIDEO_END - 0.5 || showCTA;

  return (
    <div
      ref={containerRef}
      onClick={handleInteraction}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#000",
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      {/* ── VIDEO ELEMENT ── */}
      <video
        ref={videoRef}
        src={INTRO_VIDEO_URL}
        autoPlay
        muted
        playsInline
        preload="auto"
        onCanPlay={() => setVideoReady(true)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: videoReady ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      />

      {/* ── LOADING STATE ── */}
      {!videoReady && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: "3px solid rgba(255,255,255,0.15)",
              borderTopColor: "#a78bfa",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
        </div>
      )}

      {/* ── GENRE TEXT OVERLAYS ── */}
      {GENRE_LABELS.map((label) => (
        <div
          key={label.text}
          style={{
            position: "absolute",
            left: label.x,
            top: label.y,
            transform: `translate(-50%, -50%) translateY(${isVisible(label.start, label.end) ? "0px" : "20px"})`,
            opacity: labelOpacity(label.start, label.end),
            transition: "opacity 0.4s ease, transform 0.4s ease",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <span
            style={{
              fontSize: "clamp(1.5rem, 3.5vw, 3.5rem)",
              fontWeight: 700,
              color: "#fff",
              textShadow: `0 0 30px ${label.color}, 0 0 60px ${label.color}80, 0 2px 8px rgba(0,0,0,0.8)`,
              letterSpacing: "0.08em",
              fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
              textTransform: "uppercase",
            }}
          >
            {label.text}
          </span>
        </div>
      ))}

      {/* ── IMPACT FLASH ── */}
      {impactFired && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at center, rgba(167,139,250,0.4) 0%, transparent 70%)",
            opacity: 0,
            animation: "impactFlash 0.8s ease-out forwards",
            pointerEvents: "none",
            zIndex: 11,
          }}
        />
      )}

      {/* ── LOGO + USP + CTA (final frame) ── */}
      {showLogo && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            pointerEvents: videoEnded ? "auto" : "none",
          }}
        >
          {/* Dark overlay for readability on final frame */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: videoEnded
                ? "radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.9) 100%)"
                : "transparent",
              transition: "background 1s ease",
            }}
          />

          {/* Logo */}
          <img
            src={WIZVID_LOGO}
            alt="WizVid"
            style={{
              width: "clamp(200px, 30vw, 450px)",
              height: "auto",
              position: "relative",
              zIndex: 1,
              opacity: showLogo ? 1 : 0,
              transform: `scale(${showLogo ? 1 : 0.8})`,
              transition: "opacity 0.8s ease, transform 0.8s ease",
              filter: "drop-shadow(0 0 40px rgba(167,139,250,0.6)) drop-shadow(0 0 80px rgba(167,139,250,0.3))",
              animation: showLogo ? "logoGlowPulse 3s ease-in-out infinite" : "none",
            }}
          />

          {/* Tagline */}
          <p
            style={{
              position: "relative",
              zIndex: 1,
              fontSize: "clamp(1rem, 2vw, 1.5rem)",
              color: "rgba(255,255,255,0.85)",
              marginTop: "1rem",
              letterSpacing: "0.15em",
              fontWeight: 300,
              textTransform: "uppercase",
              opacity: showUSP ? 1 : 0,
              transform: `translateY(${showUSP ? "0" : "10px"})`,
              transition: "opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s",
              textShadow: "0 2px 10px rgba(0,0,0,0.8)",
            }}
          >
            Cinematic AI Video Creation
          </p>

          {/* USP */}
          <p
            style={{
              position: "relative",
              zIndex: 1,
              fontSize: "clamp(0.75rem, 1.2vw, 1rem)",
              color: "rgba(167,139,250,0.9)",
              marginTop: "0.5rem",
              letterSpacing: "0.1em",
              fontWeight: 400,
              opacity: showUSP ? 1 : 0,
              transform: `translateY(${showUSP ? "0" : "10px"})`,
              transition: "opacity 0.6s ease 0.6s, transform 0.6s ease 0.6s",
              textShadow: "0 0 20px rgba(167,139,250,0.4)",
            }}
          >
            Powered by WizSound™ &middot; Cinematic Spatial Audio
          </p>

          {/* CTA Button */}
          {videoEnded && (
            <button
              onClick={handleEnter}
              style={{
                position: "relative",
                zIndex: 1,
                marginTop: "2.5rem",
                padding: "1rem 3rem",
                fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
                fontWeight: 600,
                color: "#fff",
                background: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #7c3aed 100%)",
                backgroundSize: "200% 200%",
                border: "1px solid rgba(167,139,250,0.4)",
                borderRadius: "9999px",
                cursor: "pointer",
                letterSpacing: "0.05em",
                boxShadow: "0 0 30px rgba(124,58,237,0.4), 0 0 60px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                opacity: showCTA ? 1 : 0,
                transform: `translateY(${showCTA ? "0" : "20px"})`,
                transition: "opacity 0.6s ease, transform 0.6s ease, box-shadow 0.3s ease",
                animation: showCTA ? "ctaShimmer 3s ease-in-out infinite, ctaPulse 2s ease-in-out infinite" : "none",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.boxShadow =
                  "0 0 50px rgba(124,58,237,0.6), 0 0 100px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.2)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.boxShadow =
                  "0 0 30px rgba(124,58,237,0.4), 0 0 60px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.15)";
              }}
            >
              Enter Experience →
            </button>
          )}
        </div>
      )}

      {/* ── SKIP BUTTON ── */}
      {!videoEnded && (
        <button
          onClick={handleSkip}
          style={{
            position: "absolute",
            top: "1.5rem",
            right: "1.5rem",
            zIndex: 30,
            padding: "0.5rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "rgba(255,255,255,0.7)",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "9999px",
            cursor: "pointer",
            backdropFilter: "blur(8px)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.color = "#fff";
            (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.15)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
            (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
          }}
        >
          Skip →
        </button>
      )}

      {/* ── CLICK TO UNMUTE HINT ── */}
      {!audioStarted && videoReady && (
        <div
          style={{
            position: "absolute",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1.25rem",
            background: "rgba(0,0,0,0.6)",
            borderRadius: "9999px",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(8px)",
            animation: "fadeInUp 0.6s ease forwards",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
          <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", letterSpacing: "0.03em" }}>
            Click anywhere for immersive audio
          </span>
        </div>
      )}

      {/* ── PROGRESS BAR ── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 3,
          width: `${Math.min(100, (currentTime / T.VIDEO_END) * 100)}%`,
          background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
          zIndex: 25,
          transition: "width 0.1s linear",
          boxShadow: "0 0 10px rgba(124,58,237,0.5)",
        }}
      />

      {/* ── KEYFRAME ANIMATIONS ── */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes impactFlash {
          0% { opacity: 0; }
          15% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes logoGlowPulse {
          0%, 100% { filter: drop-shadow(0 0 40px rgba(167,139,250,0.6)) drop-shadow(0 0 80px rgba(167,139,250,0.3)); }
          50% { filter: drop-shadow(0 0 60px rgba(167,139,250,0.8)) drop-shadow(0 0 100px rgba(167,139,250,0.5)); }
        }
        @keyframes ctaShimmer {
          0% { background-position: 200% 200%; }
          100% { background-position: -200% -200%; }
        }
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 0 30px rgba(124,58,237,0.4), 0 0 60px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.15); }
          50% { box-shadow: 0 0 40px rgba(124,58,237,0.5), 0 0 80px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.2); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
