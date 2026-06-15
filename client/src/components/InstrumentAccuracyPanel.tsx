import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music2, Guitar, Drum, Mic2, Piano, Wind, CheckCircle2, Lock, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";

interface InstrumentAccuracyPanelProps {
  jobId: number;
  isLocked?: boolean;
}

const INSTRUMENT_ICONS: Record<string, React.ReactNode> = {
  "Lead Vocalist": <Mic2 className="w-4 h-4" />,
  "Lead Singer": <Mic2 className="w-4 h-4" />,
  "Vocalist": <Mic2 className="w-4 h-4" />,
  "Guitarist": <Guitar className="w-4 h-4" />,
  "Lead Guitarist": <Guitar className="w-4 h-4" />,
  "Rhythm Guitarist": <Guitar className="w-4 h-4" />,
  "Bassist": <Guitar className="w-4 h-4" />,
  "Bass Guitarist": <Guitar className="w-4 h-4" />,
  "Drummer": <Drum className="w-4 h-4" />,
  "Pianist": <Piano className="w-4 h-4" />,
  "Keyboardist": <Piano className="w-4 h-4" />,
  "Violinist": <Music2 className="w-4 h-4" />,
  "Saxophonist": <Wind className="w-4 h-4" />,
  "Trumpeter": <Wind className="w-4 h-4" />,
};

const ROLE_SUGGESTIONS = [
  "Lead Vocalist",
  "Lead Guitarist",
  "Rhythm Guitarist",
  "Bassist",
  "Drummer",
  "Pianist",
  "Keyboardist",
  "Violinist",
  "Saxophonist",
  "Trumpeter",
  "Backing Vocalist",
  "Performer",
];

const ROLE_COLOURS: Record<string, string> = {
  "Lead Vocalist": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "Lead Singer": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "Vocalist": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "Guitarist": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Lead Guitarist": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Rhythm Guitarist": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Bassist": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Bass Guitarist": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Drummer": "bg-red-500/20 text-red-300 border-red-500/30",
  "Pianist": "bg-green-500/20 text-green-300 border-green-500/30",
  "Keyboardist": "bg-green-500/20 text-green-300 border-green-500/30",
  "Violinist": "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "Saxophonist": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Trumpeter": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
};

export function InstrumentAccuracyPanel({ jobId, isLocked }: InstrumentAccuracyPanelProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data, refetch, isLoading } = trpc.musicVideo.getInstrumentAssignments.useQuery(
    { jobId },
    { refetchOnWindowFocus: false }
  );

  const updateRole = trpc.musicVideo.updateCharacterInstrument.useMutation({
    onSuccess: () => {
      toast.success("Performance role updated — scenes will reflect this instrument");
      refetch();
      setEditingId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return null;
  if (!data || data.assignments.length === 0) return null;

  const locked = isLocked || data.isLocked;

  const handleEdit = (characterId: number, currentRole: string) => {
    if (locked) return;
    setEditingId(characterId);
    setEditValue(currentRole);
    setShowSuggestions(false);
  };

  const handleSave = (characterId: number) => {
    if (!editValue.trim()) return;
    updateRole.mutate({ jobId, characterId, performanceRole: editValue.trim() });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
    setShowSuggestions(false);
  };

  const filteredSuggestions = ROLE_SUGGESTIONS.filter(
    r => r.toLowerCase().includes(editValue.toLowerCase()) && r !== editValue
  );

  return (
    <Card className="border-amber-500/20 bg-amber-950/10 mb-4">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-amber-300 flex items-center gap-2">
          <Music2 className="w-4 h-4" />
          Instrument Accuracy
          {locked && (
            <Badge variant="outline" className="ml-auto text-xs border-amber-500/30 text-amber-400 gap-1">
              <Lock className="w-3 h-3" /> Locked
            </Badge>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Each character's instrument is injected into every scene prompt for accurate performance rendering.
          {!locked && " Confirm or correct roles before rendering."}
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.assignments.map((assignment) => {
            const roleColour = ROLE_COLOURS[assignment.performanceRole] ?? "bg-muted-foreground/20/20 text-foreground/80 border-border/50/30";
            const icon = INSTRUMENT_ICONS[assignment.performanceRole] ?? <Music2 className="w-4 h-4" />;
            const isEditing = editingId === assignment.characterId;

            return (
              <div
                key={assignment.characterId}
                className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/3 px-3 py-2"
              >
                {/* Slot index badge */}
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {assignment.slotIndex + 1}
                </div>

                {/* Name */}
                <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
                  {assignment.characterName}
                </span>

                {/* Role badge or edit input */}
                {isEditing ? (
                  <div className="relative flex items-center gap-1">
                    <div className="relative">
                      <Input
                        value={editValue}
                        onChange={(e) => { setEditValue(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        className="h-7 text-xs w-36 pr-1"
                        placeholder="e.g. Lead Guitarist"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSave(assignment.characterId);
                          if (e.key === "Escape") handleCancel();
                        }}
                      />
                      {showSuggestions && filteredSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 z-50 mt-1 w-44 rounded-md border border-border bg-popover shadow-lg">
                          {filteredSuggestions.slice(0, 6).map((s) => (
                            <button
                              key={s}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground"
                              onMouseDown={() => { setEditValue(s); setShowSuggestions(false); }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-green-400 hover:text-green-300"
                      onClick={() => handleSave(assignment.characterId)}
                      disabled={updateRole.isPending}
                    >
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={handleCancel}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={`text-xs gap-1 border ${roleColour}`}
                    >
                      {icon}
                      {assignment.performanceRole}
                    </Badge>
                    {!locked && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100"
                        onClick={() => handleEdit(assignment.characterId, assignment.performanceRole)}
                        title="Edit performance role"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                    {locked && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Instrument analysis summary */}
        {data.instrumentAnalysis && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-xs text-muted-foreground">
              <span className="text-amber-400 font-medium">Detected: </span>
              {(data.instrumentAnalysis.instruments as Array<{ label: string }>)
                ?.map((i: { label: string }) => i.label)
                .join(", ") || "Analysing…"}
              {data.instrumentAnalysis.tempo && (
                <span className="ml-2 text-muted-foreground/70">· {data.instrumentAnalysis.tempo} BPM</span>
              )}
              {data.instrumentAnalysis.energyLevel && (
                <span className="ml-2 text-muted-foreground/70">· {data.instrumentAnalysis.energyLevel} energy</span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
