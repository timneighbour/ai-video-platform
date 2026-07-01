/**
 * GuideMeSongBuilder — Step-by-step song creation wizard for WizAudio.
 * Walks the user through 7 simple questions (voice or type), then assembles
 * a direction prompt and generates full lyrics in one go.
 */
import { useState, useRef } from "react";
import { ChevronRight, ChevronLeft, Mic, Loader2, Sparkles, X, CheckCircle2 } from "lucide-react";
import { VoicePromptButton } from "@/components/VoicePromptButton";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface SongBuilderResult {
  directionPrompt: string;
  lyrics: string;
}

interface GuideMeSongBuilderProps {
  onComplete: (result: SongBuilderResult) => void;
  onClose: () => void;
  selectedGenre?: string;
  selectedMood?: string;
}

interface Question {
  id: string;
  label: string;
  placeholder: string;
  hint: string;
  example: string;
  required: boolean;
}

const QUESTIONS: Question[] = [
  {
    id: "topic",
    label: "What is the song about?",
    placeholder: "e.g. A love story, a birthday tribute, overcoming hard times…",
    hint: "Describe the main theme, story, or person the song is about.",
    example: "It's about my mum's 70th birthday — she loves dancing and has always been the heart of our family.",
    required: true,
  },
  {
    id: "mood",
    label: "What mood or feeling should it have?",
    placeholder: "e.g. Joyful and uplifting, emotional and heartfelt, fun and playful…",
    hint: "How do you want listeners to feel when they hear it?",
    example: "Warm, celebratory, and a little bit tearful — like a toast at a party.",
    required: true,
  },
  {
    id: "genre",
    label: "What style or genre fits best?",
    placeholder: "e.g. Pop, R&B, Country, Dance, Ballad, Christmas, Gospel…",
    hint: "Don't worry if you're not sure — just describe the vibe.",
    example: "Something like a classic pop ballad, maybe a bit like Adele or Celine Dion.",
    required: false,
  },
  {
    id: "audience",
    label: "Who is this song for?",
    placeholder: "e.g. My mum, my best friend, my partner, everyone at the wedding…",
    hint: "Who will hear it? Is it a personal gift or for a wider audience?",
    example: "It's a surprise for my dad's retirement party — all his colleagues will be there.",
    required: false,
  },
  {
    id: "details",
    label: "Any specific details, names, or memories to include?",
    placeholder: "e.g. Her name is Sarah, she loves roses, we met in Paris in 2005…",
    hint: "Personal details make the song feel unique and special.",
    example: "His name is Dave, he worked at the factory for 35 years, loves fishing and Man United.",
    required: false,
  },
  {
    id: "tempo",
    label: "Should it be fast, slow, or somewhere in between?",
    placeholder: "e.g. Slow and gentle, medium tempo, upbeat and danceable…",
    hint: "Think about whether people will be dancing, sitting quietly, or singing along.",
    example: "Medium tempo — something people can sway to but not too slow.",
    required: false,
  },
  {
    id: "extra",
    label: "Anything else you'd like to add?",
    placeholder: "e.g. A specific phrase you want in the chorus, an instrument, a language…",
    hint: "Any final wishes — a line you love, a language, an instrument, or a special request.",
    example: "I'd love the chorus to include the phrase 'you are my sunshine' and have a piano intro.",
    required: false,
  },
];

export default function GuideMeSongBuilder({
  onComplete,
  onClose,
  selectedGenre,
  selectedMood,
}: GuideMeSongBuilderProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (selectedGenre) init["genre"] = selectedGenre;
    if (selectedMood) init["mood"] = selectedMood;
    return init;
  });
  const [showExample, setShowExample] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);

  const buildSongMutation = trpc.suno.buildGuidedSong.useMutation({
    onSuccess: (data) => {
      setIsBuilding(false);
      onComplete({ directionPrompt: data.directionPrompt, lyrics: data.lyrics });
      toast.success("Song brief ready! Direction and lyrics have been filled in.");
    },
    onError: (err) => {
      setIsBuilding(false);
      toast.error(err.message || "Something went wrong. Please try again.");
    },
  });

  const currentQ = QUESTIONS[step];
  const currentAnswer = answers[currentQ.id] ?? "";
  const isLast = step === QUESTIONS.length - 1;
  const canProceed = !currentQ.required || currentAnswer.trim().length > 0;
  const answeredCount = QUESTIONS.filter(q => (answers[q.id] ?? "").trim().length > 0).length;

  function handleNext() {
    if (isLast) {
      handleBuild();
    } else {
      setStep(s => s + 1);
      setShowExample(false);
    }
  }

  function handleBack() {
    if (step > 0) {
      setStep(s => s - 1);
      setShowExample(false);
    }
  }

  function handleSkip() {
    if (!isLast) {
      setStep(s => s + 1);
      setShowExample(false);
    }
  }

  function handleBuild() {
    setIsBuilding(true);
    buildSongMutation.mutate({ answers });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl border border-[--color-gold]/20 overflow-hidden shadow-2xl" style={{ background: "#0a0a0e" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8" style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(0,0,0,0) 100%)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)" }}>
              <Sparkles className="w-3.5 h-3.5 text-[--color-gold]" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">Guide Me</p>
              <p className="text-[10px] text-white/35">Song Builder — answer a few questions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-white/30 hover:text-white/70 hover:bg-white/8 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-white/40">
              Question {step + 1} of {QUESTIONS.length}
            </span>
            <span className="text-[10px] font-semibold" style={{ color: "#c9a84c" }}>
              {QUESTIONS.length - step - 1 === 0 ? "Last question!" : `${QUESTIONS.length - step - 1} question${QUESTIONS.length - step - 1 === 1 ? "" : "s"} remaining`}
            </span>
          </div>
          {/* Track */}
          <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{
                width: `${((step + 1) / QUESTIONS.length) * 100}%`,
                background: "linear-gradient(90deg, #c9a84c, #f0d080)",
                boxShadow: "0 0 8px rgba(201,168,76,0.5)",
              }}
            />
          </div>
          {/* Dot indicators */}
          <div className="flex items-center justify-between mt-2">
            {QUESTIONS.map((q, i) => (
              <div
                key={q.id}
                className="rounded-full transition-all duration-300 flex-1 mx-0.5"
                style={{
                  height: 3,
                  background: i < step
                    ? "rgba(201,168,76,0.8)"
                    : i === step
                    ? "#c9a84c"
                    : "rgba(255,255,255,0.1)",
                  boxShadow: i === step ? "0 0 4px rgba(201,168,76,0.6)" : "none",
                }}
              />
            ))}
          </div>
        </div>

        {/* Question body */}
        {!isBuilding ? (
          <div className="px-5 pb-5 pt-3 flex flex-col gap-4">
            <div>
              <h2 className="text-[17px] font-bold text-white leading-snug mb-1">{currentQ.label}</h2>
              <p className="text-[11px] text-white/35 leading-relaxed">{currentQ.hint}</p>
            </div>

            {/* Answer input */}
            <div className="relative">
              <textarea
                value={currentAnswer}
                onChange={(e) => setAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
                rows={4}
                className="w-full rounded-xl px-4 py-3 text-[13px] leading-[1.65] text-[#f5f0e8] placeholder:text-white/18 placeholder:italic resize-none focus:outline-none border transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: currentAnswer.trim() ? "1px solid rgba(201,168,76,0.35)" : "1px solid rgba(255,255,255,0.08)",
                  fontFamily: "'Courier Prime', monospace",
                  caretColor: "#c9a84c",
                }}
                placeholder={currentQ.placeholder}
                autoFocus
              />
              {currentAnswer.trim().length > 0 && (
                <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-[--color-gold]/60" />
              )}
            </div>

            {/* Voice input */}
            <div className="flex items-center gap-2">
              <VoicePromptButton
                toolContext="song lyrics writing"
                onPromptReady={(refined) => setAnswers(prev => ({ ...prev, [currentQ.id]: refined }))}
              />
              <span className="text-[10px] text-white/25 italic">or speak your answer</span>
            </div>

            {/* Example toggle */}
            <button
              onClick={() => setShowExample(v => !v)}
              className="text-[10px] text-[--color-gold]/40 hover:text-[--color-gold]/70 transition-colors text-left w-fit"
            >
              {showExample ? "▾ Hide example" : "▸ Show me an example"}
            </button>
            {showExample && (
              <div
                className="rounded-lg px-3.5 py-2.5 text-[11px] text-white/45 leading-relaxed italic border border-white/6 cursor-pointer hover:border-[--color-gold]/20 transition-all"
                style={{ background: "rgba(255,255,255,0.03)" }}
                onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: currentQ.example }))}
              >
                <span className="text-[--color-gold]/50 not-italic font-semibold">Example</span> (click to use): "{currentQ.example}"
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleBack}
                disabled={step === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] text-white/35 hover:text-white/65 disabled:opacity-0 transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <div className="flex items-center gap-2">
                {!currentQ.required && !isLast && (
                  <button
                    onClick={handleSkip}
                    className="px-3 py-2 rounded-lg text-[11px] text-white/28 hover:text-white/50 transition-all border border-white/6 hover:border-white/14"
                  >
                    Skip
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-[13px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: canProceed ? "linear-gradient(135deg, #c9a84c, #a07830)" : "rgba(255,255,255,0.06)",
                    color: canProceed ? "#0a0a0e" : "rgba(255,255,255,0.3)",
                    boxShadow: canProceed ? "0 4px 20px rgba(201,168,76,0.3)" : "none",
                  }}
                >
                  {isLast ? (
                    <><Sparkles className="w-3.5 h-3.5" /> Build My Song</>
                  ) : (
                    <>Next <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Building state */
          <div className="px-5 py-12 flex flex-col items-center gap-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)" }}>
                <Sparkles className="w-7 h-7 text-[--color-gold] animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-[15px] font-bold text-white mb-1">Writing your song…</p>
              <p className="text-[11px] text-white/35">Crafting your direction and generating lyrics from your answers</p>
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[--color-gold]"
                  style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
