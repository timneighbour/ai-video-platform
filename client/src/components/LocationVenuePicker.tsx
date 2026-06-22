import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "@/lib/icons";
import { trpc } from "@/lib/trpc";

interface VenueOption {
  key: string;
  displayName: string;
  category: string;
  emoji: string;
  shortDescription: string;
  /** Curated SerpAPI search query — returns accurate interior/exterior photos */
  thumbnailSearchQuery: string;
}

// Mirror of the server-side venue library (display data only — no DNA)
const VENUE_OPTIONS: VenueOption[] = [
  // Recording Studios
  {
    key: "air_studios_lyndhurst",
    displayName: "Air Studios, Lyndhurst Hall",
    category: "Recording Studio",
    emoji: "🎼",
    shortDescription: "London · Grand orchestral hall with iconic blue ceiling",
    thumbnailSearchQuery: "Air Studios Lyndhurst Hall London recording studio interior blue ceiling orchestra",
  },
  {
    key: "abbey_road_studio_one",
    displayName: "Abbey Road, Studio One",
    category: "Recording Studio",
    emoji: "🎵",
    shortDescription: "London · Legendary orchestral studio with parquet floors",
    thumbnailSearchQuery: "Abbey Road Studios Studio One interior large orchestral recording hall London",
  },
  {
    key: "abbey_road_studio_two",
    displayName: "Abbey Road, Studio Two",
    category: "Recording Studio",
    emoji: "🎸",
    shortDescription: "London · Iconic live room where The Beatles recorded",
    thumbnailSearchQuery: "Abbey Road Studio Two interior live recording room Beatles London control room",
  },

  {
    key: "electric_lady_studios",
    displayName: "Electric Lady Studios",
    category: "Recording Studio",
    emoji: "⚡",
    shortDescription: "New York · Hendrix's psychedelic underground studio",
    thumbnailSearchQuery: "Electric Lady Studios New York interior control room recording studio psychedelic curved walls",
  },
  {
    key: "capitol_studios_la",
    displayName: "Capitol Studios",
    category: "Recording Studio",
    emoji: "🎺",
    shortDescription: "Los Angeles · Inside the iconic Capitol Records Tower",
    thumbnailSearchQuery: "Capitol Studios Los Angeles Studio A interior recording room circular echo chamber",
  },
  {
    key: "sunset_sound_la",
    displayName: "Sunset Sound",
    category: "Recording Studio",
    emoji: "🌅",
    shortDescription: "Los Angeles · Where The Doors, Prince & Led Zeppelin recorded",
    thumbnailSearchQuery: "Sunset Sound Recorders Los Angeles Studio 1 interior control room vintage console",
  },
  {
    key: "blackbird_studio_nashville",
    displayName: "Blackbird Studio",
    category: "Recording Studio",
    emoji: "🐦",
    shortDescription: "Nashville · World's most extensive vintage gear collection",
    thumbnailSearchQuery: "Blackbird Studio Nashville Studio A interior recording room vintage gear microphones",
  },

  // Concert Halls
  {
    key: "royal_albert_hall",
    displayName: "Royal Albert Hall",
    category: "Concert Hall",
    emoji: "🏛️",
    shortDescription: "London · Victorian rotunda with crimson tiered seating",
    thumbnailSearchQuery: "Royal Albert Hall London interior auditorium stage red tiered seats Victorian dome",
  },
  {
    key: "carnegie_hall",
    displayName: "Carnegie Hall",
    category: "Concert Hall",
    emoji: "🎻",
    shortDescription: "New York · Gilded Beaux-Arts hall with warm amber tones",
    thumbnailSearchQuery: "Carnegie Hall Stern Auditorium interior stage seating New York gilded balconies",
  },
  {
    key: "sydney_opera_house",
    displayName: "Sydney Opera House",
    category: "Concert Hall",
    emoji: "🦪",
    shortDescription: "Sydney · Sail-shaped shells with harbour light",
    thumbnailSearchQuery: "Sydney Opera House Concert Hall interior stage auditorium wooden pipe organ seating",
  },
  {
    key: "walt_disney_concert_hall",
    displayName: "Walt Disney Concert Hall",
    category: "Concert Hall",
    emoji: "🏗️",
    shortDescription: "Los Angeles · Frank Gehry's curved blonde wood masterpiece",
    thumbnailSearchQuery: "Walt Disney Concert Hall Los Angeles interior auditorium curved blonde wood pipe organ seating",
  },
  {
    key: "radio_city_music_hall",
    displayName: "Radio City Music Hall",
    category: "Concert Hall",
    emoji: "🎠",
    shortDescription: "New York · Art Deco sunrise ceiling, gold and burgundy",
    thumbnailSearchQuery: "Radio City Music Hall New York interior Art Deco auditorium stage gold burgundy sunrise mural",
  },
  // Arenas
  {
    key: "msg_sphere_las_vegas",
    displayName: "MSG Sphere",
    category: "Arena",
    emoji: "🌐",
    shortDescription: "Las Vegas · World's largest wraparound LED dome, 17,500 seats",
    thumbnailSearchQuery: "MSG Sphere Las Vegas interior wraparound LED screen concert stage audience seats",
  },
  {
    key: "o2_arena_london",
    displayName: "The O2 Arena",
    category: "Arena",
    emoji: "🎪",
    shortDescription: "London · Massive dome with dramatic stage lighting rigs",
    thumbnailSearchQuery: "O2 Arena London interior concert stage crowd lighting rig arena floor",
  },
  {
    key: "madison_square_garden",
    displayName: "Madison Square Garden",
    category: "Arena",
    emoji: "🏟️",
    shortDescription: "New York · The World's Most Famous Arena",
    thumbnailSearchQuery: "Madison Square Garden New York interior arena concert stage crowd spotlights",
  },
  {
    key: "wembley_arena",
    displayName: "OVO Arena Wembley",
    category: "Arena",
    emoji: "⭐",
    shortDescription: "London · Iconic curved roof with blue-white spotlights",
    thumbnailSearchQuery: "OVO Arena Wembley interior concert stage crowd London curved ceiling",
  },
  // Stadiums
  {
    key: "sofi_stadium",
    displayName: "SoFi Stadium",
    category: "Stadium",
    emoji: "🌟",
    shortDescription: "Los Angeles · Futuristic translucent canopy, 70,000 seats",
    thumbnailSearchQuery: "SoFi Stadium Los Angeles interior concert stage crowd translucent roof canopy",
  },
  {
    key: "wembley_stadium",
    displayName: "Wembley Stadium",
    category: "Stadium",
    emoji: "🏟️",
    shortDescription: "London · Iconic arch over a sea of 90,000 fans",
    thumbnailSearchQuery: "Wembley Stadium London interior concert stage crowd arch night floodlights",
  },
  {
    key: "estadio_maracana",
    displayName: "Estádio do Maracanã",
    category: "Stadium",
    emoji: "🇧🇷",
    shortDescription: "Rio de Janeiro · Sugarloaf Mountain backdrop, 78,000 fans",
    thumbnailSearchQuery: "Maracanã Stadium Rio de Janeiro interior concert stage crowd",
  },
  {
    key: "metlife_stadium",
    displayName: "MetLife Stadium",
    category: "Stadium",
    emoji: "🗽",
    shortDescription: "New Jersey · NYC skyline, Empire State Building backdrop",
    thumbnailSearchQuery: "MetLife Stadium New Jersey interior concert stage crowd night",
  },
  {
    key: "tokyo_dome",
    displayName: "Tokyo Dome",
    category: "Stadium",
    emoji: "🏯",
    shortDescription: "Tokyo · White inflatable dome, 55,000 passionate fans",
    thumbnailSearchQuery: "Tokyo Dome Japan interior concert stage crowd white dome ceiling",
  },
  {
    key: "stade_de_france",
    displayName: "Stade de France",
    category: "Stadium",
    emoji: "🇫🇷",
    shortDescription: "Paris · Eiffel Tower backdrop, 81,000 capacity",
    thumbnailSearchQuery: "Stade de France Paris interior concert stage crowd stands",
  },
  {
    key: "camp_nou",
    displayName: "Camp Nou",
    category: "Stadium",
    emoji: "🔵",
    shortDescription: "Barcelona · Europe's largest stadium, Sagrada Família horizon",
    thumbnailSearchQuery: "Camp Nou Barcelona interior concert stage crowd stands night",
  },
  {
    key: "rose_bowl",
    displayName: "Rose Bowl",
    category: "Stadium",
    emoji: "🌹",
    shortDescription: "Pasadena · San Gabriel Mountains, golden California light",
    thumbnailSearchQuery: "Rose Bowl Pasadena interior concert stage crowd stands night",
  },
  // Outdoor
  {
    key: "glastonbury_pyramid",
    displayName: "Glastonbury Pyramid Stage",
    category: "Outdoor",
    emoji: "🌿",
    shortDescription: "Somerset · Golden pyramid at dusk, festival crowd",
    thumbnailSearchQuery: "Glastonbury Festival Pyramid Stage crowd sunset Somerset golden hour",
  },
  {
    key: "coachella_main_stage",
    displayName: "Coachella Main Stage",
    category: "Outdoor",
    emoji: "🌵",
    shortDescription: "Indio · Desert night sky, neon-lit stage canopy",
    thumbnailSearchQuery: "Coachella festival main stage night desert crowd California neon lights",
  },
  {
    key: "red_rocks_amphitheatre",
    displayName: "Red Rocks Amphitheatre",
    category: "Outdoor",
    emoji: "🪨",
    shortDescription: "Colorado · Natural red sandstone rock formations, open sky",
    thumbnailSearchQuery: "Red Rocks Amphitheatre Colorado concert stage sandstone rock formations crowd",
  },
  // TV Studios
  {
    key: "bbc_television_centre",
    displayName: "BBC Television Centre",
    category: "TV Studio",
    emoji: "📺",
    shortDescription: "London · Legendary Top of the Pops broadcast studio",
    thumbnailSearchQuery: "BBC Television Centre London studio TC1 interior broadcast stage audience",
  },
  {
    key: "pinewood_studios",
    displayName: "Pinewood Studios",
    category: "TV Studio",
    emoji: "🎬",
    shortDescription: "Buckinghamshire · Europe's largest film & TV sound stages",
    thumbnailSearchQuery: "Pinewood Studios 007 Stage interior film production sound stage set lighting",
  },
  {
    key: "nbc_studios_30_rock",
    displayName: "NBC Studios / 30 Rock",
    category: "TV Studio",
    emoji: "🗽",
    shortDescription: "New York · Art Deco Rockefeller Center, home of SNL",
    thumbnailSearchQuery: "Saturday Night Live SNL Studio 8H NBC 30 Rock interior stage audience",
  },
  {
    key: "ed_sullivan_theater",
    displayName: "Ed Sullivan Theater",
    category: "TV Studio",
    emoji: "🎙️",
    shortDescription: "New York · Where The Beatles made their US TV debut",
    thumbnailSearchQuery: "Ed Sullivan Theater New York interior stage Late Show Stephen Colbert auditorium",
  },
  // Filming Locations
  {
    key: "county_down_northern_ireland",
    displayName: "County Down, Northern Ireland",
    category: "Filming Location",
    emoji: "🌾",
    shortDescription: "Rihanna's 'We Found Love' · Rolling green Irish countryside",
    thumbnailSearchQuery: "County Down Northern Ireland rolling green hills countryside landscape rural",
  },
  {
    key: "hoxton_street_london",
    displayName: "Hoxton Street, London",
    category: "Filming Location",
    emoji: "🚶",
    shortDescription: "The Verve's 'Bittersweet Symphony' · East London street",
    thumbnailSearchQuery: "Hoxton Street East London pedestrians urban street Shoreditch",
  },
  {
    key: "mojave_desert_california",
    displayName: "Mojave Desert, California",
    category: "Filming Location",
    emoji: "🌵",
    shortDescription: "U2 & Lana Del Rey · Joshua trees, vast desert landscape",
    thumbnailSearchQuery: "Mojave Desert Joshua Tree California landscape sunset dramatic",
  },
  {
    key: "seljalandsfoss_iceland",
    displayName: "Seljalandsfoss Waterfall, Iceland",
    category: "Filming Location",
    emoji: "💧",
    shortDescription: "Justin Bieber's 'I'll Show You' · Dramatic 60m waterfall",
    thumbnailSearchQuery: "Seljalandsfoss waterfall Iceland dramatic landscape green moss cliff",
  },
  {
    key: "griffith_park_los_angeles",
    displayName: "Griffith Park, Los Angeles",
    category: "Filming Location",
    emoji: "🎃",
    shortDescription: "Michael Jackson's 'Thriller' · Griffith Observatory backdrop",
    thumbnailSearchQuery: "Griffith Observatory Los Angeles night city lights Hollywood Hills park",
  },
  {
    key: "universal_studios_backlot",
    displayName: "Universal Studios Backlot",
    category: "Filming Location",
    emoji: "🎥",
    shortDescription: "Florida · Professional film backlot, Creed's 'My Sacrifice'",
    thumbnailSearchQuery: "Universal Studios Hollywood backlot film set street facades production",
  },
  // Theatres
  {
    key: "palais_garnier",
    displayName: "Palais Garnier Opera House",
    category: "Theatre",
    emoji: "🎭",
    shortDescription: "Paris · Gilded baroque interior with Chagall ceiling",
    thumbnailSearchQuery: "Palais Garnier Opera Paris interior auditorium gilded baroque balconies Chagall ceiling chandelier",
  },
  {
    key: "london_palladium",
    displayName: "London Palladium",
    category: "Theatre",
    emoji: "🎩",
    shortDescription: "London · Art Deco grandeur with gold proscenium arch",
    thumbnailSearchQuery: "London Palladium interior auditorium stage red velvet seats gold proscenium arch",
  },
  {
    key: "apollo_theater_harlem",
    displayName: "Apollo Theater",
    category: "Theatre",
    emoji: "🎤",
    shortDescription: "Harlem, NYC · Art Deco soul/R&B/jazz institution",
    thumbnailSearchQuery: "Apollo Theater Harlem New York interior stage auditorium seats Art Deco",
  },
  // Clubs
  {
    key: "ronnie_scotts",
    displayName: "Ronnie Scott's Jazz Club",
    category: "Club",
    emoji: "🎷",
    shortDescription: "London · Intimate jazz club with red velvet and dim spotlights",
    thumbnailSearchQuery: "Ronnie Scott's Jazz Club London interior stage performers red velvet dim spotlight",
  },
  {
    key: "fabric_london",
    displayName: "Fabric London",
    category: "Club",
    emoji: "🔊",
    shortDescription: "London · Industrial warehouse with pulsing UV lights",
    thumbnailSearchQuery: "Fabric nightclub London interior dancefloor crowd UV lights industrial warehouse",
  },
];

export const VENUE_OPTIONS_PUBLIC = VENUE_OPTIONS;

const CATEGORY_ORDER = ["Recording Studio", "Concert Hall", "Arena", "Stadium", "Outdoor", "TV Studio", "Filming Location", "Theatre", "Club", "Custom"];

const CATEGORY_LABELS: Record<string, string> = {
  "Recording Studio": "Studios",
  "Concert Hall": "Concert Halls",
  "Arena": "Arenas",
  "Stadium": "Stadiums",
  "Outdoor": "Outdoor",
  "TV Studio": "TV Studios",
  "Filming Location": "Filming",
  "Theatre": "Theatres",
  "Club": "Clubs",
  "Custom": "Custom",
};

const CUSTOM_PLACEHOLDER = `Describe the interior in detail — architecture, lighting, colours, materials, atmosphere.

Examples:
• "A brutalist 1970s recording studio with exposed concrete walls, a vintage Neve 8078 console, warm tungsten overhead lighting, and acoustic foam panels in dark charcoal. Floor-to-ceiling glass separates the control room from the live room."
• "A candlelit baroque chapel converted into a recording space — stone arches, gilded organ pipes, flickering amber light, wooden pews replaced with microphone stands and cables."`;

/** Single venue card with lazy-loaded SerpAPI thumbnail */
function VenueCard({
  venue,
  isSelected,
  onSelect,
}: {
  venue: VenueOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [shouldFetch, setShouldFetch] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  // Intersection observer — only fetch thumbnail when card scrolls into view
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setShouldFetch(true); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { data: thumbData, isLoading: thumbLoading } = trpc.musicVideo.getVenueThumbnail.useQuery(
    { venueKey: venue.key, searchQuery: venue.thumbnailSearchQuery },
    {
      enabled: shouldFetch,
      staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days — thumbnails are stable
      retry: 1,
    }
  );

  const thumbnailUrl = thumbData?.thumbnailUrl ?? null;

  return (
    <button
      ref={ref}
      onClick={onSelect}
      className={`flex items-start gap-0 rounded-lg text-left transition-all border overflow-hidden group ${
        isSelected
          ? "border-[rgba(184,137,42,0.7)] bg-[rgba(184,137,42,0.08)] text-amber-200 shadow-[0_0_12px_rgba(184,137,42,0.15)]"
          : "border-white/5 bg-white/3 hover:border-[rgba(184,137,42,0.25)] hover:bg-[rgba(184,137,42,0.04)] text-white/70"
      }`}
    >
      {/* Thumbnail */}
      <div className="w-[72px] h-[56px] flex-shrink-0 relative overflow-hidden bg-black/40">
        {thumbLoading && shouldFetch && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-3 h-3 text-white/20 animate-spin" />
          </div>
        )}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={venue.displayName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : !thumbLoading ? (
          <div className="absolute inset-0 flex items-center justify-center text-xl opacity-30">
            {venue.emoji}
          </div>
        ) : null}
        {/* Subtle shimmer overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0 px-3 py-2">
        <p className={`text-[11px] font-semibold leading-tight tracking-wide ${isSelected ? "text-[--color-gold]" : "text-white/80"}`}>{venue.displayName}</p>
        <p className="text-[10px] text-white/30 mt-0.5 leading-tight">{venue.shortDescription}</p>
      </div>

      {/* Selected checkmark */}
      {isSelected && (
        <div className="w-4 h-4 rounded-full bg-[--color-gold] flex items-center justify-center flex-shrink-0 mt-2 mr-2.5 shadow-[0_0_8px_rgba(184,137,42,0.5)]">
          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" />
          </svg>
        </div>
      )}
    </button>
  );
}

/** Full-size banner image for the selected venue */
export function VenueBannerImage({ venueKey, displayName }: { venueKey: string; displayName: string }) {
  // Look up the curated search query for this venue key
  const venue = VENUE_OPTIONS.find(v => v.key === venueKey);
  const searchQuery = venue?.thumbnailSearchQuery ?? displayName;

  const { data, isLoading } = trpc.musicVideo.getVenueThumbnail.useQuery(
    { venueKey, searchQuery },
    { staleTime: 1000 * 60 * 60 * 24 * 7, retry: 1 }
  );

  const imageUrl = data?.thumbnailUrl ?? null;

  if (isLoading) {
    return (
      <div className="w-full h-44 flex items-center justify-center bg-black/40 animate-pulse">
        <Loader2 className="w-5 h-5 text-[--color-gold]/40 animate-spin" />
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="w-full h-32 flex items-center justify-center bg-black/30 text-white/20 text-xs font-mono tracking-widest uppercase">
        No reference image available
      </div>
    );
  }

  return (
    <div className="w-full h-48 relative overflow-hidden">
      <img
        src={imageUrl}
        alt={displayName}
        className="w-full h-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
      />
      {/* Cinematic gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
    </div>
  );
}

interface Props {
  onSelect: (venueKey: string, customDNA?: string) => void;
  isPending?: boolean;
  /** Pre-fill the custom textarea when editing an existing custom lock */
  initialCustomDNA?: string | null;
  /** Pre-select a venue key (e.g. when restoring from state) */
  initialKey?: string | null;
  /** Whether to show the confirm button (default: true) */
  showConfirmButton?: boolean;
  /** Called on every selection change (before confirm) — for draft state */
  onDraftChange?: (venueKey: string | null, customDNA?: string) => void;
}

export function LocationVenuePicker({
  onSelect,
  isPending,
  initialCustomDNA,
  initialKey,
  showConfirmButton = true,
  onDraftChange,
}: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(initialKey ?? null);
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    if (initialKey) {
      const found = VENUE_OPTIONS.find(v => v.key === initialKey);
      return found?.category ?? "Recording Studio";
    }
    return "Recording Studio";
  });
  const [customDNA, setCustomDNA] = useState<string>(initialCustomDNA ?? "");

  // Notify parent of draft changes
  useEffect(() => {
    if (onDraftChange) {
      if (activeCategory === "Custom") {
        onDraftChange(customDNA.trim().length >= 10 ? "custom" : null, customDNA.trim());
      } else {
        onDraftChange(selectedKey);
      }
    }
  }, [selectedKey, customDNA, activeCategory]);

  const categories = CATEGORY_ORDER.filter(cat =>
    cat === "Custom" || VENUE_OPTIONS.some(v => v.category === cat)
  );
  const filteredVenues = VENUE_OPTIONS.filter(v => v.category === activeCategory);
  const isCustomTab = activeCategory === "Custom";

  const canConfirm = isCustomTab
    ? customDNA.trim().length >= 10
    : !!selectedKey;

  const handleConfirm = () => {
    if (isCustomTab && customDNA.trim().length >= 10) {
      onSelect("custom", customDNA.trim());
    } else if (selectedKey) {
      onSelect(selectedKey);
    }
  };

  const selectedVenue = selectedKey ? VENUE_OPTIONS.find(v => v.key === selectedKey) : null;

  return (
    <div className="space-y-3">
      {/* Category tabs — horizontal scroll on mobile */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); if (cat !== activeCategory) setSelectedKey(null); }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-wider uppercase transition-all ${
              activeCategory === cat
                ? cat === "Custom"
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-[0_0_8px_rgba(139,92,246,0.2)]"
                  : "bg-[rgba(184,137,42,0.15)] text-[--color-gold] border border-[rgba(184,137,42,0.4)] shadow-[0_0_8px_rgba(184,137,42,0.15)]"
                : "bg-white/4 text-white/35 border border-white/8 hover:text-white/60 hover:bg-white/8 hover:border-white/15"
            }`}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Custom venue textarea */}
      {isCustomTab ? (
        <div className="space-y-2">
          <p className="text-xs text-white/40 leading-relaxed">
            Describe any bespoke interior — architecture, lighting, colours, materials, and atmosphere. WizCreate™ will anchor every scene to this exact space.
          </p>
          <textarea
            value={customDNA}
            onChange={e => setCustomDNA(e.target.value)}
            placeholder={CUSTOM_PLACEHOLDER}
            rows={8}
            maxLength={2000}
            className="w-full rounded-xl bg-black/30 border border-[rgba(139,92,246,0.2)] text-white/80 text-xs px-3 py-3 resize-none focus:outline-none focus:border-violet-500/50 focus:bg-black/40 placeholder:text-white/15 leading-relaxed font-mono"
          />
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-mono ${customDNA.length > 1800 ? "text-amber-400" : "text-white/25"}`}>
              {customDNA.length}/2000
            </span>
            {customDNA.trim().length > 0 && customDNA.trim().length < 10 && (
              <span className="text-[10px] text-red-400/70">Min 10 characters required</span>
            )}
          </div>
        </div>
      ) : (
        /* Venue grid with thumbnails */
        <div className="grid grid-cols-1 gap-1 max-h-[260px] overflow-y-auto pr-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {filteredVenues.map(venue => (
            <VenueCard
              key={venue.key}
              venue={venue}
              isSelected={selectedKey === venue.key}
              onSelect={() => setSelectedKey(venue.key === selectedKey ? null : venue.key)}
            />
          ))}
        </div>
      )}

      {/* Selected venue preview banner */}
      {selectedVenue && !isCustomTab && (
        <div className="rounded-xl overflow-hidden border border-[rgba(184,137,42,0.3)] bg-[rgba(184,137,42,0.05)] shadow-[0_0_20px_rgba(184,137,42,0.08)]">
          {/* Full-size reference image */}
          <VenueBannerImage venueKey={selectedVenue.key} displayName={selectedVenue.displayName} />
          {/* Description */}
          <div className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-[--color-gold] leading-tight tracking-wide">{selectedVenue.displayName}</p>
                <p className="text-[11px] text-white/45 mt-0.5 leading-relaxed">{selectedVenue.shortDescription}</p>
              </div>
              <div className="flex-shrink-0 mt-0.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-1 rounded-full bg-[rgba(184,137,42,0.15)] text-[--color-gold] border border-[rgba(184,137,42,0.25)]">
                  Selected
                </span>
              </div>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-[rgba(184,137,42,0.1)]">
              <p className="text-[10px] text-[--color-gold]/60 leading-relaxed">
                ✦ WizCreate™ will anchor every scene to this exact location — architecture, lighting, and atmosphere will be consistent throughout your storyboard.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confirm button */}
      {showConfirmButton && canConfirm && (
        <div className="flex justify-end">
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-bold tracking-wide transition-all disabled:opacity-50 ${
              isCustomTab
                ? "bg-violet-500/15 hover:bg-violet-500/25 border-violet-500/40 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                : "bg-[rgba(184,137,42,0.12)] hover:bg-[rgba(184,137,42,0.2)] border-[rgba(184,137,42,0.4)] text-[--color-gold] shadow-[0_0_12px_rgba(184,137,42,0.15)]"
            }`}
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="7" width="10" height="8" rx="1.5" />
                <path d="M5 7V5a3 3 0 0 1 6 0v2" />
              </svg>
            )}
            Lock {isCustomTab ? "Custom Venue" : "Location"}
          </button>
        </div>
      )}
    </div>
  );
}
