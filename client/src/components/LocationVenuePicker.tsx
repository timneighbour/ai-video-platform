import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "@/lib/icons";
import { trpc } from "@/lib/trpc";

interface VenueOption {
  key: string;
  displayName: string;
  category: string;
  emoji: string;
  shortDescription: string;
}

// Mirror of the server-side venue library (display data only — no DNA)
const VENUE_OPTIONS: VenueOption[] = [
  // Recording Studios
  { key: "air_studios_lyndhurst", displayName: "Air Studios, Lyndhurst Hall", category: "Recording Studio", emoji: "🎼", shortDescription: "London · Grand orchestral hall with iconic blue ceiling" },
  { key: "abbey_road_studio_one", displayName: "Abbey Road, Studio One", category: "Recording Studio", emoji: "🎵", shortDescription: "London · Legendary orchestral studio with parquet floors" },
  { key: "abbey_road_studio_two", displayName: "Abbey Road, Studio Two", category: "Recording Studio", emoji: "🎸", shortDescription: "London · Iconic live room where The Beatles recorded" },
  { key: "air_studios_montserrat", displayName: "Air Studios, Montserrat", category: "Recording Studio", emoji: "🌴", shortDescription: "Caribbean · Tropical hilltop studio with panoramic views" },
  { key: "electric_lady_studios", displayName: "Electric Lady Studios", category: "Recording Studio", emoji: "⚡", shortDescription: "New York · Hendrix's psychedelic underground studio" },
  { key: "capitol_studios_la", displayName: "Capitol Studios", category: "Recording Studio", emoji: "🎺", shortDescription: "Los Angeles · Inside the iconic Capitol Records Tower" },
  { key: "sunset_sound_la", displayName: "Sunset Sound", category: "Recording Studio", emoji: "🌅", shortDescription: "Los Angeles · Where The Doors, Prince & Led Zeppelin recorded" },
  { key: "blackbird_studio_nashville", displayName: "Blackbird Studio", category: "Recording Studio", emoji: "🐦", shortDescription: "Nashville · World's most extensive vintage gear collection" },
  { key: "real_world_studios_bath", displayName: "Real World Studios", category: "Recording Studio", emoji: "🌍", shortDescription: "Bath, UK · Peter Gabriel's studio with millpond views" },
  // Concert Halls
  { key: "royal_albert_hall", displayName: "Royal Albert Hall", category: "Concert Hall", emoji: "🏛️", shortDescription: "London · Victorian rotunda with crimson tiered seating" },
  { key: "carnegie_hall", displayName: "Carnegie Hall", category: "Concert Hall", emoji: "🎻", shortDescription: "New York · Gilded Beaux-Arts hall with warm amber tones" },
  { key: "sydney_opera_house", displayName: "Sydney Opera House", category: "Concert Hall", emoji: "🦪", shortDescription: "Sydney · Sail-shaped shells with harbour light" },
  { key: "walt_disney_concert_hall", displayName: "Walt Disney Concert Hall", category: "Concert Hall", emoji: "🏗️", shortDescription: "Los Angeles · Frank Gehry's curved blonde wood masterpiece" },
  { key: "radio_city_music_hall", displayName: "Radio City Music Hall", category: "Concert Hall", emoji: "🎠", shortDescription: "New York · Art Deco sunrise ceiling, gold and burgundy" },
  // Arenas
  { key: "msg_sphere_las_vegas", displayName: "MSG Sphere", category: "Arena", emoji: "🌐", shortDescription: "Las Vegas · World's largest wraparound LED dome, 17,500 seats" },
  { key: "o2_arena_london", displayName: "The O2 Arena", category: "Arena", emoji: "🎪", shortDescription: "London · Massive dome with dramatic stage lighting rigs" },
  { key: "madison_square_garden", displayName: "Madison Square Garden", category: "Arena", emoji: "🏟️", shortDescription: "New York · The World's Most Famous Arena" },
  { key: "wembley_arena", displayName: "OVO Arena Wembley", category: "Arena", emoji: "⭐", shortDescription: "London · Iconic curved roof with blue-white spotlights" },
  // Stadiums
  { key: "sofi_stadium", displayName: "SoFi Stadium", category: "Stadium", emoji: "🌟", shortDescription: "Los Angeles · Futuristic translucent canopy, 70,000 seats" },
  { key: "wembley_stadium", displayName: "Wembley Stadium", category: "Stadium", emoji: "🏟️", shortDescription: "London · Iconic arch over a sea of 90,000 fans" },
  { key: "estadio_maracana", displayName: "Estádio do Maracanã", category: "Stadium", emoji: "🇧🇷", shortDescription: "Rio de Janeiro · Sugarloaf Mountain backdrop, 78,000 fans" },
  { key: "metlife_stadium", displayName: "MetLife Stadium", category: "Stadium", emoji: "🗽", shortDescription: "New Jersey · NYC skyline, Empire State Building backdrop" },
  { key: "tokyo_dome", displayName: "Tokyo Dome", category: "Stadium", emoji: "🏯", shortDescription: "Tokyo · White inflatable dome, 55,000 passionate fans" },
  { key: "stade_de_france", displayName: "Stade de France", category: "Stadium", emoji: "🇫🇷", shortDescription: "Paris · Eiffel Tower backdrop, 81,000 capacity" },
  { key: "camp_nou", displayName: "Camp Nou", category: "Stadium", emoji: "🔵", shortDescription: "Barcelona · Europe's largest stadium, Sagrada Família horizon" },
  { key: "rose_bowl", displayName: "Rose Bowl", category: "Stadium", emoji: "🌹", shortDescription: "Pasadena · San Gabriel Mountains, golden California light" },
  // Outdoor
  { key: "glastonbury_pyramid", displayName: "Glastonbury Pyramid Stage", category: "Outdoor", emoji: "🌿", shortDescription: "Somerset · Golden pyramid at dusk, festival crowd" },
  { key: "coachella_main_stage", displayName: "Coachella Main Stage", category: "Outdoor", emoji: "🌵", shortDescription: "Indio · Desert night sky, neon-lit stage canopy" },
  { key: "red_rocks_amphitheatre", displayName: "Red Rocks Amphitheatre", category: "Outdoor", emoji: "🪨", shortDescription: "Colorado · Natural red sandstone rock formations, open sky" },
  // TV Studios
  { key: "bbc_television_centre", displayName: "BBC Television Centre", category: "TV Studio", emoji: "📺", shortDescription: "London · Legendary Top of the Pops broadcast studio" },
  { key: "pinewood_studios", displayName: "Pinewood Studios", category: "TV Studio", emoji: "🎬", shortDescription: "Buckinghamshire · Europe's largest film & TV sound stages" },
  { key: "nbc_studios_30_rock", displayName: "NBC Studios / 30 Rock", category: "TV Studio", emoji: "🗽", shortDescription: "New York · Art Deco Rockefeller Center, home of SNL" },
  { key: "ed_sullivan_theater", displayName: "Ed Sullivan Theater", category: "TV Studio", emoji: "🎙️", shortDescription: "New York · Where The Beatles made their US TV debut" },
  // Filming Locations
  { key: "county_down_northern_ireland", displayName: "County Down, Northern Ireland", category: "Filming Location", emoji: "🌾", shortDescription: "Rihanna's 'We Found Love' · Rolling green Irish countryside" },
  { key: "hoxton_street_london", displayName: "Hoxton Street, London", category: "Filming Location", emoji: "🚶", shortDescription: "The Verve's 'Bittersweet Symphony' · East London street" },
  { key: "mojave_desert_california", displayName: "Mojave Desert, California", category: "Filming Location", emoji: "🌵", shortDescription: "U2 & Lana Del Rey · Joshua trees, vast desert landscape" },
  { key: "seljalandsfoss_iceland", displayName: "Seljalandsfoss Waterfall, Iceland", category: "Filming Location", emoji: "💧", shortDescription: "Justin Bieber's 'I'll Show You' · Dramatic 60m waterfall" },
  { key: "griffith_park_los_angeles", displayName: "Griffith Park, Los Angeles", category: "Filming Location", emoji: "🎃", shortDescription: "Michael Jackson's 'Thriller' · Griffith Observatory backdrop" },
  { key: "universal_studios_backlot", displayName: "Universal Studios Backlot", category: "Filming Location", emoji: "🎥", shortDescription: "Florida · Professional film backlot, Creed's 'My Sacrifice'" },
  // Theatres
  { key: "palais_garnier", displayName: "Palais Garnier Opera House", category: "Theatre", emoji: "🎭", shortDescription: "Paris · Gilded baroque interior with Chagall ceiling" },
  { key: "london_palladium", displayName: "London Palladium", category: "Theatre", emoji: "🎩", shortDescription: "London · Art Deco grandeur with gold proscenium arch" },
  { key: "apollo_theater_harlem", displayName: "Apollo Theater", category: "Theatre", emoji: "🎤", shortDescription: "Harlem, NYC · Art Deco soul/R&B/jazz institution" },
  // Clubs
  { key: "ronnie_scotts", displayName: "Ronnie Scott's Jazz Club", category: "Club", emoji: "🎷", shortDescription: "London · Intimate jazz club with red velvet and dim spotlights" },
  { key: "fabric_london", displayName: "Fabric London", category: "Club", emoji: "🔊", shortDescription: "London · Industrial warehouse with pulsing UV lights" },
];

const CATEGORY_ORDER = ["Recording Studio", "Concert Hall", "Arena", "Stadium", "Outdoor", "TV Studio", "Filming Location", "Theatre", "Club", "Custom"];

const CATEGORY_LABELS: Record<string, string> = {
  "Recording Studio": "🎙️ Recording Studios",
  "Concert Hall": "🎻 Concert Halls",
  "Arena": "🏟️ Arenas",
  "Stadium": "⚽ Stadiums",
  "Outdoor": "🌿 Outdoor",
  "TV Studio": "📺 TV Studios",
  "Filming Location": "🎬 Filming Locations",
  "Theatre": "🎭 Theatres",
  "Club": "🎵 Clubs",
  "Custom": "✏️ Custom",
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
    { venueKey: venue.key, displayName: venue.displayName },
    {
      enabled: shouldFetch,
      staleTime: 1000 * 60 * 60 * 24, // 24h — thumbnails are stable
      retry: 1,
    }
  );

  const thumbnailUrl = thumbData?.thumbnailUrl ?? null;

  return (
    <button
      ref={ref}
      onClick={onSelect}
      className={`flex items-start gap-0 rounded-lg text-left transition-all border overflow-hidden ${
        isSelected
          ? "border-amber-500/60 bg-amber-900/25 text-amber-200"
          : "border-white/5 bg-white/3 hover:border-white/20 hover:bg-white/5 text-white/70"
      }`}
    >
      {/* Thumbnail */}
      <div className="w-20 h-16 flex-shrink-0 relative overflow-hidden bg-white/5">
        {thumbLoading && shouldFetch && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-3.5 h-3.5 text-white/20 animate-spin" />
          </div>
        )}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={venue.displayName}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : !thumbLoading ? (
          <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-40">
            {venue.emoji}
          </div>
        ) : null}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0 px-3 py-2.5">
        <p className="text-xs font-semibold leading-tight">{venue.displayName}</p>
        <p className="text-[10px] text-white/35 mt-0.5 leading-tight">{venue.shortDescription}</p>
      </div>

      {/* Selected checkmark */}
      {isSelected && (
        <div className="w-4 h-4 rounded-full bg-amber-500/80 flex items-center justify-center flex-shrink-0 mt-2.5 mr-2.5">
          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" />
          </svg>
        </div>
      )}
    </button>
  );
}

/** Full-size banner image for the selected venue — fetches via the same tRPC query */
function VenueBannerImage({ venueKey, displayName }: { venueKey: string; displayName: string }) {
  const { data, isLoading } = trpc.musicVideo.getVenueThumbnail.useQuery(
    { venueKey, displayName },
    { staleTime: 1000 * 60 * 60 * 24, retry: 1 }
  );

  const imageUrl = data?.thumbnailUrl ?? null;

  if (isLoading) {
    return (
      <div className="w-full h-40 flex items-center justify-center bg-white/5 animate-pulse">
        <Loader2 className="w-5 h-5 text-amber-400/40 animate-spin" />
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="w-full h-32 flex items-center justify-center bg-white/5 text-white/20 text-xs">
        No reference image available
      </div>
    );
  }

  return (
    <div className="w-full h-44 relative overflow-hidden">
      <img
        src={imageUrl}
        alt={displayName}
        className="w-full h-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
      />
      {/* Gradient overlay so text below reads cleanly */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      {/* Source badge */}
      {data?.source && (
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/50 text-[9px] text-white/40">
          via Google Images
        </div>
      )}
    </div>
  );
}

interface Props {
  onSelect: (venueKey: string, customDNA?: string) => void;
  isPending?: boolean;
  /** Pre-fill the custom textarea when editing an existing custom lock */
  initialCustomDNA?: string | null;
}

export function LocationVenuePicker({ onSelect, isPending, initialCustomDNA }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("Recording Studio");
  const [customDNA, setCustomDNA] = useState<string>(initialCustomDNA ?? "");

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

  return (
    <div>
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setSelectedKey(null); }}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
              activeCategory === cat
                ? cat === "Custom"
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/50"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                : "bg-white/5 text-white/40 border border-white/10 hover:text-white/70 hover:bg-white/10"
            }`}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Custom venue textarea */}
      {isCustomTab ? (
        <div className="space-y-2">
          <p className="text-xs text-white/50 leading-relaxed">
            Describe any bespoke interior — architecture, lighting, colours, materials, and atmosphere. The AI will anchor every scene to this specific space.
          </p>
          <textarea
            value={customDNA}
            onChange={e => setCustomDNA(e.target.value)}
            placeholder={CUSTOM_PLACEHOLDER}
            rows={8}
            maxLength={2000}
            className="w-full rounded-lg bg-white/5 border border-white/10 text-white/80 text-xs px-3 py-2.5 resize-none focus:outline-none focus:border-violet-500/50 focus:bg-white/8 placeholder:text-white/20 leading-relaxed"
          />
          <div className="flex items-center justify-between">
            <span className={`text-[10px] ${customDNA.length > 1800 ? "text-amber-400" : "text-white/30"}`}>
              {customDNA.length}/2000 characters
            </span>
            {customDNA.trim().length > 0 && customDNA.trim().length < 10 && (
              <span className="text-[10px] text-red-400">Min 10 characters required</span>
            )}
          </div>
        </div>
      ) : (
        /* Venue grid with thumbnails */
        <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto pr-1">
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
      {selectedKey && !isCustomTab && (() => {
        const selected = VENUE_OPTIONS.find(v => v.key === selectedKey);
        if (!selected) return null;
        return (
          <div className="mt-3 rounded-xl overflow-hidden border border-amber-500/30 bg-amber-900/10">
            {/* Full-size reference image */}
            <VenueBannerImage venueKey={selected.key} displayName={selected.displayName} />
            {/* Description */}
            <div className="px-3 py-2.5">
              <p className="text-xs font-semibold text-amber-200 leading-tight">{selected.displayName}</p>
              <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed">{selected.shortDescription}</p>
              <p className="text-[10px] text-amber-400/70 mt-1.5 leading-relaxed">
                ✦ WizCreate™ will anchor every scene to this exact location — architecture, lighting, and atmosphere will be consistent throughout your storyboard.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Confirm button */}
      {canConfirm && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-all disabled:opacity-50 ${
              isCustomTab
                ? "bg-violet-500/20 hover:bg-violet-500/30 border-violet-500/50 text-violet-300"
                : "bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50 text-amber-300"
            }`}
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Lock {isCustomTab ? "Custom Venue" : "Location"}
          </button>
        </div>
      )}
    </div>
  );
}
