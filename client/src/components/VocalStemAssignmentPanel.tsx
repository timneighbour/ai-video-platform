/**
 * VocalStemAssignmentPanel — WizPerformer multi-vocal stem assignment UI
 *
 * Shows detected vocal stems for a music video job and allows the user to
 * assign each stem to a character. Surfaces a Duet/Ensemble upsell when
 * 2+ stems are detected.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mic2,
  Users,
  CheckCircle2,
  Sparkles,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronDown,
  Loader2,
  Music,
  Star,
} from "lucide-react";
import { toast } from "sonner";

interface VocalStemAssignmentPanelProps {
  jobId: number;
  characters?: Array<{ id: number; name: string }>;
  isLocked?: boolean;
}

const GENDER_COLOURS: Record<string, string> = {
  female: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  male: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  unknown: "bg-white/10 text-white/50 border-white/20",
};

const GENDER_LABELS: Record<string, string> = {
  female: "Female Vocal",
  male: "Male Vocal",
  unknown: "Vocal",
};

function WaveformBars({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="flex items-end gap-[2px] h-5">
      {[3, 6, 4, 8, 5, 7, 3, 6, 4, 8, 5, 7, 3, 6, 4].map((h, i) => (
        <div
          key={i}
          className={`w-[2px] rounded-full transition-all duration-150 ${
            isPlaying ? "bg-purple-400" : "bg-white/20"
          }`}
          style={{
            height: isPlaying ? `${h * 2 + Math.random() * 4}px` : `${h}px`,
            animation: isPlaying ? `pulse ${0.3 + i * 0.05}s ease-in-out infinite alternate` : "none",
          }}
        />
      ))}
    </div>
  );
}

export function VocalStemAssignmentPanel({
  jobId,
  characters = [],
  isLocked = false,
}: VocalStemAssignmentPanelProps) {
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [audioRefs] = useState<Map<number, HTMLAudioElement>>(new Map());

  const { data: stems, refetch, isLoading } = trpc.musicVideo.getVocalStems.useQuery(
    { jobId },
    { refetchOnWindowFocus: false }
  );

  const assignStem = trpc.musicVideo.assignVocalStem.useMutation({
    onSuccess: () => {
      toast.success("Vocal stem assigned — this performer will lip sync to their vocal track");
      refetch();
      setAssigningId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const setLeadStem = trpc.musicVideo.setLeadVocalStem.useMutation({
    onSuccess: () => {
      toast.success("Lead vocal updated — all performance scenes will use this stem for lip sync");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  function togglePlay(stemId: number, stemUrl: string) {
    // Stop any currently playing audio
    if (playingId !== null && playingId !== stemId) {
      const existing = audioRefs.get(playingId);
      if (existing) {
        existing.pause();
        existing.currentTime = 0;
      }
    }

    if (playingId === stemId) {
      const audio = audioRefs.get(stemId);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setPlayingId(null);
    } else {
      let audio = audioRefs.get(stemId);
      if (!audio) {
        audio = new Audio(stemUrl);
        audio.onended = () => setPlayingId(null);
        audioRefs.set(stemId, audio);
      }
      audio.play().catch(() => toast.error("Could not play audio preview"));
      setPlayingId(stemId);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-white/40 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading vocal stems…
      </div>
    );
  }

  if (!stems || stems.length === 0) {
    return null;
  }

  const multiVocal = stems.length > 1;
  const leadStem = stems.find((s) => s.isLeadVocal);

  return (
    <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[rgba(20,10,35,0.98)] to-[rgba(30,14,50,0.98)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
          <Mic2 className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">
              {multiVocal ? "Multi-Vocal Track Detected" : "Vocal Stem Isolated"}
            </h3>
            {multiVocal && (
              <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                <Star className="w-2.5 h-2.5 mr-1" />
                Duet Mode
              </Badge>
            )}
          </div>
          <p className="text-xs text-white/40 mt-0.5">
            {multiVocal
              ? `${stems.length} vocal tracks detected — assign each to a character for perfect per-performer lip sync`
              : "Lead vocals isolated from the full mix — only this track is used for lip sync"}
          </p>
        </div>
      </div>

      {/* Multi-vocal upsell banner */}
      {multiVocal && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/20">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-300">
              World-class multi-character lip sync
            </p>
            <p className="text-xs text-white/50 mt-0.5">
              Each performer gets their own isolated vocal track. Zara lip syncs to Zara's voice.
              Your male vocalist lip syncs to his voice. No other platform does this.
            </p>
          </div>
        </div>
      )}

      {/* Stem cards */}
      <div className="space-y-2">
        {stems.map((stem) => (
          <div
            key={stem.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
              stem.isLeadVocal
                ? "border-purple-500/40 bg-purple-500/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            {/* Play button */}
            <button
              onClick={() => togglePlay(stem.id, stem.stemUrl)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                playingId === stem.id
                  ? "bg-purple-500/30 border border-purple-500/50 text-purple-300"
                  : "bg-white/10 border border-white/20 text-white/50 hover:text-white hover:bg-white/15"
              }`}
              title="Preview vocal stem"
            >
              {playingId === stem.id ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Waveform */}
            <div className="flex-shrink-0">
              <WaveformBars isPlaying={playingId === stem.id} />
            </div>

            {/* Stem info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-white">
                  {stem.voiceLabel || `Stem ${stem.stemIndex + 1}`}
                </span>
                <Badge
                  className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0 border ${
                    GENDER_COLOURS[stem.voiceGender] ?? GENDER_COLOURS.unknown
                  }`}
                >
                  {GENDER_LABELS[stem.voiceGender] ?? "Vocal"}
                </Badge>
                {stem.isLeadVocal && (
                  <Badge className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0 bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Lead
                  </Badge>
                )}
              </div>
              {stem.characterName && (
                <p className="text-[11px] text-white/40 mt-0.5">
                  Assigned to: <span className="text-white/70">{stem.characterName}</span>
                </p>
              )}
            </div>

            {/* Actions */}
            {!isLocked && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {multiVocal && characters.length > 0 && (
                  <div className="relative">
                    <select
                      value={stem.characterName ?? ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          assignStem.mutate({
                            jobId,
                            stemId: stem.id,
                            characterName: e.target.value,
                          });
                        }
                      }}
                      disabled={assignStem.isPending && assigningId === stem.id}
                      className="text-[11px] bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white/70 cursor-pointer hover:bg-white/15 focus:outline-none focus:ring-1 focus:ring-purple-500/50 appearance-none pr-6"
                    >
                      <option value="">Assign to…</option>
                      {characters.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
                  </div>
                )}
                {!stem.isLeadVocal && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setLeadStem.mutate({ jobId, stemId: stem.id })}
                    disabled={setLeadStem.isPending}
                    className="text-[10px] h-6 px-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                    title="Set as lead vocal for lip sync"
                  >
                    Set Lead
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="flex items-start gap-2 pt-1">
        <Music className="w-3.5 h-3.5 text-white/30 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-white/30 leading-relaxed">
          The original full mix is always used as the final audio track. Isolated vocals are only
          used for lip sync accuracy — your listeners hear the complete song.
        </p>
      </div>
    </div>
  );
}
