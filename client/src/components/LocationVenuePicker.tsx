import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loader2 } from "@/lib/icons";
import { trpc } from "@/lib/trpc";

interface VenueOption {
  key: string;
  displayName: string;
  category: string;
  emoji: string;
  shortDescription: string;
  /** Curated SerpAPI search query — targets the actual performance hall interior, colour images only */
  thumbnailSearchQuery: string;
}

// Mirror of the server-side venue library (display data only — no DNA)
const VENUE_OPTIONS: VenueOption[] = [
  // Recording Studios — queries target the LIVE ROOM / MAIN HALL, not the control room
  {
    key: "air_studios_lyndhurst",
    displayName: "Air Studios, Lyndhurst Hall",
    category: "Recording Studio",
    emoji: "🎼",
    shortDescription: "London · Grand orchestral hall with iconic blue ceiling",
    thumbnailSearchQuery: "Air Studios Lyndhurst Hall London main orchestral hall blue ceiling musicians performing colour",
  },
  {
    key: "abbey_road_studio_one",
    displayName: "Abbey Road, Studio One",
    category: "Recording Studio",
    emoji: "🎵",
    shortDescription: "London · Legendary orchestral studio with parquet floors",
    thumbnailSearchQuery: "Abbey Road Studio One London main hall orchestra recording parquet floor colour interior",
  },
  {
    key: "abbey_road_studio_two",
    displayName: "Abbey Road, Studio Two",
    category: "Recording Studio",
    emoji: "🎸",
    shortDescription: "London · Iconic live room where The Beatles recorded",
    thumbnailSearchQuery: "Abbey Road Studio Two live room Beatles band recording colour interior wide shot",
  },
  {
    key: "electric_lady_studios",
    displayName: "Electric Lady Studios",
    category: "Recording Studio",
    emoji: "⚡",
    shortDescription: "New York · Hendrix's psychedelic underground studio",
    thumbnailSearchQuery: "Electric Lady Studios New York live room interior colour psychedelic mural curved walls musicians",
  },
  {
    key: "capitol_studios_la",
    displayName: "Capitol Studios",
    category: "Recording Studio",
    emoji: "🎺",
    shortDescription: "Los Angeles · Inside the iconic Capitol Records Tower",
    thumbnailSearchQuery: "Capitol Studios Hollywood Studio A live room orchestra colour interior wide angle",
  },
  {
    key: "sunset_sound_la",
    displayName: "Sunset Sound",
    category: "Recording Studio",
    emoji: "🌅",
    shortDescription: "Los Angeles · Where The Doors, Prince & Led Zeppelin recorded",
    thumbnailSearchQuery: "Sunset Sound Recorders Los Angeles live room interior colour band recording wide shot",
  },
  {
    key: "blackbird_studio_nashville",
    displayName: "Blackbird Studio",
    category: "Recording Studio",
    emoji: "🐦",
    shortDescription: "Nashville · World's most extensive vintage gear collection",
    thumbnailSearchQuery: "Blackbird Studio Nashville live room interior colour musicians recording vintage instruments",
  },
  // Concert Halls — queries target the auditorium from the stage perspective
  {
    key: "royal_albert_hall",
    displayName: "Royal Albert Hall",
    category: "Concert Hall",
    emoji: "🏛️",
    shortDescription: "London · Victorian rotunda with crimson tiered seating",
    thumbnailSearchQuery: "Royal Albert Hall London auditorium interior colour stage view red seats Victorian dome full house",
  },
  {
    key: "carnegie_hall",
    displayName: "Carnegie Hall",
    category: "Concert Hall",
    emoji: "🎻",
    shortDescription: "New York · Gilded Beaux-Arts hall with warm amber tones",
    thumbnailSearchQuery: "Carnegie Hall Stern Auditorium interior colour stage view gilded balconies full audience",
  },
  {
    key: "sydney_opera_house",
    displayName: "Sydney Opera House",
    category: "Concert Hall",
    emoji: "🦪",
    shortDescription: "Sydney · Sail-shaped shells with harbour light",
    thumbnailSearchQuery: "Sydney Opera House Concert Hall interior colour stage auditorium wooden ceiling pipe organ audience",
  },
  {
    key: "walt_disney_concert_hall",
    displayName: "Walt Disney Concert Hall",
    category: "Concert Hall",
    emoji: "🏗️",
    shortDescription: "Los Angeles · Frank Gehry's curved blonde wood masterpiece",
    thumbnailSearchQuery: "Walt Disney Concert Hall Los Angeles interior colour auditorium curved wood stage orchestra audience",
  },
  {
    key: "radio_city_music_hall",
    displayName: "Radio City Music Hall",
    category: "Concert Hall",
    emoji: "🎠",
    shortDescription: "New York · Art Deco sunrise ceiling, gold and burgundy",
    thumbnailSearchQuery: "Radio City Music Hall New York interior colour auditorium stage Art Deco gold burgundy full house",
  },
  // Arenas
  {
    key: "msg_sphere_las_vegas",
    displayName: "MSG Sphere",
    category: "Arena",
    emoji: "🌐",
    shortDescription: "Las Vegas · World's largest wraparound LED dome, 17,500 seats",
    thumbnailSearchQuery: "MSG Sphere Las Vegas interior colour wraparound LED screen concert U2 audience stage",
  },
  {
    key: "o2_arena_london",
    displayName: "The O2 Arena",
    category: "Arena",
    emoji: "🎪",
    shortDescription: "London · Massive dome with dramatic stage lighting rigs",
    thumbnailSearchQuery: "O2 Arena London interior colour concert stage crowd lighting rig full arena",
  },
  {
    key: "madison_square_garden",
    displayName: "Madison Square Garden",
    category: "Arena",
    emoji: "🏟️",
    shortDescription: "New York · The World's Most Famous Arena",
    thumbnailSearchQuery: "Madison Square Garden New York interior colour concert stage crowd spotlights full arena",
  },
  {
    key: "wembley_arena",
    displayName: "OVO Arena Wembley",
    category: "Arena",
    emoji: "⭐",
    shortDescription: "London · Iconic curved roof with blue-white spotlights",
    thumbnailSearchQuery: "OVO Arena Wembley London interior colour concert stage crowd curved ceiling full house",
  },
  // Stadiums
  {
    key: "sofi_stadium",
    displayName: "SoFi Stadium",
    category: "Stadium",
    emoji: "🌟",
    shortDescription: "Los Angeles · Futuristic translucent canopy, 70,000 seats",
    thumbnailSearchQuery: "SoFi Stadium Los Angeles interior colour concert stage crowd translucent roof full stadium",
  },
  {
    key: "wembley_stadium",
    displayName: "Wembley Stadium",
    category: "Stadium",
    emoji: "🏟️",
    shortDescription: "London · Iconic arch over a sea of 90,000 fans",
    thumbnailSearchQuery: "Wembley Stadium London interior colour concert stage crowd arch night full stadium",
  },
  {
    key: "estadio_maracana",
    displayName: "Estádio do Maracanã",
    category: "Stadium",
    emoji: "🇧🇷",
    shortDescription: "Rio de Janeiro · Sugarloaf Mountain backdrop, 78,000 fans",
    thumbnailSearchQuery: "Maracanã Stadium Rio de Janeiro interior colour concert stage crowd full stadium",
  },
  {
    key: "metlife_stadium",
    displayName: "MetLife Stadium",
    category: "Stadium",
    emoji: "🗽",
    shortDescription: "New Jersey · NYC skyline, Empire State Building backdrop",
    thumbnailSearchQuery: "MetLife Stadium New Jersey interior colour concert stage crowd night full stadium",
  },
  {
    key: "tokyo_dome",
    displayName: "Tokyo Dome",
    category: "Stadium",
    emoji: "🏯",
    shortDescription: "Tokyo · White inflatable dome, 55,000 passionate fans",
    thumbnailSearchQuery: "Tokyo Dome Japan interior colour concert stage crowd white dome ceiling full stadium",
  },
  {
    key: "stade_de_france",
    displayName: "Stade de France",
    category: "Stadium",
    emoji: "🇫🇷",
    shortDescription: "Paris · Eiffel Tower backdrop, 81,000 capacity",
    thumbnailSearchQuery: "Stade de France Paris interior colour concert stage crowd full stadium night",
  },
  {
    key: "camp_nou",
    displayName: "Camp Nou",
    category: "Stadium",
    emoji: "🔵",
    shortDescription: "Barcelona · Europe's largest stadium, Sagrada Família horizon",
    thumbnailSearchQuery: "Camp Nou Barcelona interior colour concert stage crowd full stadium night",
  },
  {
    key: "rose_bowl",
    displayName: "Rose Bowl",
    category: "Stadium",
    emoji: "🌹",
    shortDescription: "Pasadena · San Gabriel Mountains, golden California light",
    thumbnailSearchQuery: "Rose Bowl Pasadena interior colour concert stage crowd full stadium night",
  },
  // Outdoor
  {
    key: "glastonbury_pyramid",
    displayName: "Glastonbury Pyramid Stage",
    category: "Outdoor",
    emoji: "🌿",
    shortDescription: "Somerset · Golden pyramid at dusk, festival crowd",
    thumbnailSearchQuery: "Glastonbury Festival Pyramid Stage colour crowd sunset Somerset golden hour wide shot",
  },
  {
    key: "coachella_main_stage",
    displayName: "Coachella Main Stage",
    category: "Outdoor",
    emoji: "🌵",
    shortDescription: "Indio · Desert night sky, neon-lit stage canopy",
    thumbnailSearchQuery: "Coachella festival main stage colour night desert crowd California neon lights wide shot",
  },
  {
    key: "red_rocks_amphitheatre",
    displayName: "Red Rocks Amphitheatre",
    category: "Outdoor",
    emoji: "🪨",
    shortDescription: "Colorado · Natural red sandstone rock formations, open sky",
    thumbnailSearchQuery: "Red Rocks Amphitheatre Colorado colour concert stage sandstone rock formations crowd wide shot",
  },
  // TV Studios
  {
    key: "bbc_television_centre",
    displayName: "BBC Television Centre",
    category: "TV Studio",
    emoji: "📺",
    shortDescription: "London · Legendary Top of the Pops broadcast studio",
    thumbnailSearchQuery: "BBC Television Centre London Studio TC1 interior colour broadcast stage audience lighting",
  },
  {
    key: "pinewood_studios",
    displayName: "Pinewood Studios",
    category: "TV Studio",
    emoji: "🎬",
    shortDescription: "Buckinghamshire · Europe's largest film & TV sound stages",
    thumbnailSearchQuery: "Pinewood Studios 007 Stage interior colour film production set lighting wide shot",
  },
  {
    key: "nbc_studios_30_rock",
    displayName: "NBC Studios / 30 Rock",
    category: "TV Studio",
    emoji: "🗽",
    shortDescription: "New York · Art Deco Rockefeller Center, home of SNL",
    thumbnailSearchQuery: "Saturday Night Live SNL Studio 8H NBC 30 Rock interior colour stage audience full wide shot",
  },
  {
    key: "ed_sullivan_theater",
    displayName: "Ed Sullivan Theater",
    category: "TV Studio",
    emoji: "🎙️",
    shortDescription: "New York · Where The Beatles made their US TV debut",
    thumbnailSearchQuery: "Ed Sullivan Theater New York interior colour stage Late Show auditorium seats wide shot",
  },
  // Filming Locations
  {
    key: "county_down_northern_ireland",
    displayName: "County Down, Northern Ireland",
    category: "Filming Location",
    emoji: "🌾",
    shortDescription: "Rihanna's 'We Found Love' · Rolling green Irish countryside",
    thumbnailSearchQuery: "County Down Northern Ireland colour rolling green hills countryside landscape rural golden hour",
  },
  {
    key: "hoxton_street_london",
    displayName: "Hoxton Street, London",
    category: "Filming Location",
    emoji: "🚶",
    shortDescription: "The Verve's 'Bittersweet Symphony' · East London street",
    thumbnailSearchQuery: "Hoxton Street East London colour pedestrians urban street Shoreditch daytime",
  },
  {
    key: "mojave_desert_california",
    displayName: "Mojave Desert, California",
    category: "Filming Location",
    emoji: "🌵",
    shortDescription: "U2 & Lana Del Rey · Joshua trees, vast desert landscape",
    thumbnailSearchQuery: "Mojave Desert Joshua Tree California colour landscape sunset dramatic wide shot",
  },
  {
    key: "seljalandsfoss_iceland",
    displayName: "Seljalandsfoss Waterfall, Iceland",
    category: "Filming Location",
    emoji: "💧",
    shortDescription: "Justin Bieber's 'I'll Show You' · Dramatic 60m waterfall",
    thumbnailSearchQuery: "Seljalandsfoss waterfall Iceland colour dramatic landscape green moss cliff wide shot",
  },
  {
    key: "griffith_park_los_angeles",
    displayName: "Griffith Park, Los Angeles",
    category: "Filming Location",
    emoji: "🎃",
    shortDescription: "Michael Jackson's 'Thriller' · Griffith Observatory backdrop",
    thumbnailSearchQuery: "Griffith Observatory Los Angeles colour night city lights Hollywood Hills wide shot",
  },
  {
    key: "universal_studios_backlot",
    displayName: "Universal Studios Backlot",
    category: "Filming Location",
    emoji: "🎥",
    shortDescription: "Florida · Professional film backlot, Creed's 'My Sacrifice'",
    thumbnailSearchQuery: "Universal Studios Hollywood backlot colour film set street facades production wide shot",
  },
  // Theatres
  {
    key: "palais_garnier",
    displayName: "Palais Garnier Opera House",
    category: "Theatre",
    emoji: "🎭",
    shortDescription: "Paris · Gilded baroque interior with Chagall ceiling",
    thumbnailSearchQuery: "Palais Garnier Paris interior colour auditorium stage gilded baroque balconies Chagall ceiling chandelier full house",
  },
  {
    key: "london_palladium",
    displayName: "London Palladium",
    category: "Theatre",
    emoji: "🎩",
    shortDescription: "London · Art Deco grandeur with gold proscenium arch",
    thumbnailSearchQuery: "London Palladium interior colour auditorium stage red velvet seats gold proscenium arch full house",
  },
  {
    key: "apollo_theater_harlem",
    displayName: "Apollo Theater",
    category: "Theatre",
    emoji: "🎤",
    shortDescription: "Harlem, NYC · Art Deco soul/R&B/jazz institution",
    thumbnailSearchQuery: "Apollo Theater Harlem New York interior colour stage auditorium seats Art Deco full house",
  },
  // Clubs
  {
    key: "ronnie_scotts",
    displayName: "Ronnie Scott's Jazz Club",
    category: "Club",
    emoji: "🎷",
    shortDescription: "London · Intimate jazz club with red velvet and dim spotlights",
    thumbnailSearchQuery: "Ronnie Scott's Jazz Club London interior colour stage performers red velvet dim spotlight audience",
  },
  {
    key: "fabric_london",
    displayName: "Fabric London",
    category: "Club",
    emoji: "🔊",
    shortDescription: "London · Industrial warehouse with pulsing UV lights",
    thumbnailSearchQuery: "Fabric nightclub London interior colour dancefloor crowd UV lights industrial warehouse",
  },
];

export const VENUE_OPTIONS_PUBLIC = VENUE_OPTIONS;

// ─── Category helpers ─────────────────────────────────────────────────────────
const ALL_CATEGORIES = ["All", ...Array.from(new Set(VENUE_OPTIONS.map(v => v.category)))];

// ─── Intersection-observer lazy image hook ────────────────────────────────────
function useLazyVisible(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: "200px" }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

// ─── Single venue card ────────────────────────────────────────────────────────
function VenueCard({
  venue,
  selected,
  onSelect,
}: {
  venue: VenueOption;
  selected: boolean;
  onSelect: (key: string) => void;
}) {
  const [containerRef, visible] = useLazyVisible();
  const { data: imgData, isLoading } = trpc.musicVideo.getVenueThumbnail.useQuery(
    { venueKey: venue.key, searchQuery: venue.thumbnailSearchQuery },
    { enabled: visible, staleTime: 1000 * 60 * 60 * 24, retry: 1 }
  );

  return (
    <div
      ref={containerRef}
      onClick={() => onSelect(selected ? "" : venue.key)}
      className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 group
        ${selected
          ? "border-yellow-400 shadow-lg shadow-yellow-400/20 scale-[1.02]"
          : "border-white/10 hover:border-white/30 hover:scale-[1.01]"
        }`}
      style={{ aspectRatio: "16/9" }}
    >
      {/* Background image */}
      {visible && (
        isLoading ? (
          <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          </div>
        ) : imgData?.thumbnailUrl ? (
          <img
            src={imgData.thumbnailUrl!}
            alt={venue.displayName}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center text-3xl">
            {venue.emoji}
          </div>
        )
      )}
      {!visible && (
        <div className="absolute inset-0 bg-zinc-800" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Selected ring */}
      {selected && (
        <div className="absolute inset-0 ring-2 ring-yellow-400 ring-inset rounded-xl pointer-events-none" />
      )}

      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-white font-semibold text-sm leading-tight">{venue.displayName}</p>
        <p className="text-white/60 text-xs mt-0.5 leading-tight">{venue.shortDescription}</p>
      </div>

      {/* Selected checkmark */}
      {selected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── Selected venue hero banner ───────────────────────────────────────────────
function VenueBannerImage({ venue }: { venue: VenueOption }) {
  const { data: imgData, isLoading } = trpc.musicVideo.getVenueThumbnail.useQuery(
    { venueKey: venue.key, searchQuery: venue.thumbnailSearchQuery },
    { staleTime: 1000 * 60 * 60 * 24, retry: 1 }
  );

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: "21/9" }}>
      {isLoading ? (
        <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      ) : imgData?.thumbnailUrl ? (
        <img
          src={imgData.thumbnailUrl!}
          alt={venue.displayName}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center text-5xl">
          {venue.emoji}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-yellow-400 text-xs font-bold uppercase tracking-widest">WizLocation™ Locked</span>
        </div>
        <h3 className="text-white text-xl font-bold">{venue.displayName}</h3>
        <p className="text-white/70 text-sm mt-1">{venue.shortDescription}</p>
        <p className="text-white/50 text-xs mt-2 italic">
          WizCreate™ will anchor every scene to this venue's architecture, lighting and atmosphere.
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface LocationVenuePickerProps {
  selectedKey: string;
  onSelect: (key: string) => void;
  /** Optional initial key to pre-select on mount */
  initialKey?: string;
}

export function LocationVenuePicker({ selectedKey, onSelect, initialKey }: LocationVenuePickerProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [customText, setCustomText] = useState("");

  // Apply initialKey on mount
  useEffect(() => {
    if (initialKey && !selectedKey) {
      onSelect(initialKey);
    }
  }, [initialKey]);

  const selectedVenue = VENUE_OPTIONS.find(v => v.key === selectedKey);

  const filtered = activeCategory === "All"
    ? VENUE_OPTIONS
    : VENUE_OPTIONS.filter(v => v.category === activeCategory);

  const handleCustomSubmit = useCallback(() => {
    if (customText.trim()) {
      onSelect(`custom:${customText.trim()}`);
    }
  }, [customText, onSelect]);

  const isCustomSelected = selectedKey.startsWith("custom:");

  return (
    <div className="space-y-4">
      {/* Selected venue hero banner */}
      {selectedVenue && (
        <VenueBannerImage venue={selectedVenue} />
      )}

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {ALL_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
              ${activeCategory === cat
                ? "bg-yellow-400 text-black"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Venue grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
        {filtered.map(venue => (
          <VenueCard
            key={venue.key}
            venue={venue}
            selected={selectedKey === venue.key}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Custom venue option */}
      <div className="border border-white/10 rounded-xl p-4 space-y-3">
        <p className="text-white/60 text-xs font-medium uppercase tracking-wider">Custom Location</p>
        <textarea
          value={customText}
          onChange={e => setCustomText(e.target.value)}
          placeholder="Describe your location in detail — e.g. 'A candlelit Gothic cathedral with stone arches, stained glass windows, and warm amber light…'"
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-yellow-400/50 transition-colors"
          rows={3}
        />
        {customText.trim() && (
          <button
            onClick={handleCustomSubmit}
            className={`w-full py-2 rounded-lg text-sm font-medium transition-all
              ${isCustomSelected && selectedKey === `custom:${customText.trim()}`
                ? "bg-yellow-400 text-black"
                : "bg-white/10 text-white hover:bg-white/20"
              }`}
          >
            {isCustomSelected && selectedKey === `custom:${customText.trim()}`
              ? "✓ Custom Location Locked"
              : "Lock This Custom Location"
            }
          </button>
        )}
      </div>

      {/* Clear selection */}
      {selectedKey && (
        <button
          onClick={() => onSelect("")}
          className="text-white/40 text-xs hover:text-white/70 transition-colors"
        >
          × Clear venue selection
        </button>
      )}
    </div>
  );
}
