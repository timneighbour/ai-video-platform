import React, { useState } from "react";
import { Loader2 } from "@/lib/icons";

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
  { key: "air_studios_lyndhurst", displayName: "Air Studios, Lyndhurst Hall", category: "Recording Studio", emoji: "🎼", shortDescription: "London · Grand orchestral hall with soaring arched windows" },
  { key: "abbey_road_studio_one", displayName: "Abbey Road, Studio One", category: "Recording Studio", emoji: "🎵", shortDescription: "London · Legendary orchestral studio with parquet floors" },
  { key: "abbey_road_studio_two", displayName: "Abbey Road, Studio Two", category: "Recording Studio", emoji: "🎸", shortDescription: "London · Iconic live room where The Beatles recorded" },
  { key: "air_studios_montserrat", displayName: "Air Studios, Montserrat", category: "Recording Studio", emoji: "🌴", shortDescription: "Caribbean · Tropical hilltop studio with panoramic views" },
  { key: "electric_lady_studios", displayName: "Electric Lady Studios", category: "Recording Studio", emoji: "⚡", shortDescription: "New York · Hendrix's psychedelic underground studio" },
  // Concert Halls
  { key: "royal_albert_hall", displayName: "Royal Albert Hall", category: "Concert Hall", emoji: "🏛️", shortDescription: "London · Victorian rotunda with crimson tiered seating" },
  { key: "carnegie_hall", displayName: "Carnegie Hall", category: "Concert Hall", emoji: "🎻", shortDescription: "New York · Gilded Beaux-Arts hall with warm amber tones" },
  { key: "sydney_opera_house", displayName: "Sydney Opera House", category: "Concert Hall", emoji: "🦪", shortDescription: "Sydney · Sail-shaped shells with harbour light" },
  // Arenas
  { key: "o2_arena_london", displayName: "The O2 Arena", category: "Arena", emoji: "🎪", shortDescription: "London · Massive dome with dramatic stage lighting rigs" },
  { key: "madison_square_garden", displayName: "Madison Square Garden", category: "Arena", emoji: "🏟️", shortDescription: "New York · The World's Most Famous Arena" },
  { key: "wembley_arena", displayName: "OVO Arena Wembley", category: "Arena", emoji: "⭐", shortDescription: "London · Iconic curved roof with blue-white spotlights" },
  // Stadiums
  { key: "sofi_stadium", displayName: "SoFi Stadium", category: "Stadium", emoji: "🌟", shortDescription: "Los Angeles · Futuristic translucent canopy, 70,000 seats" },
  { key: "wembley_stadium", displayName: "Wembley Stadium", category: "Stadium", emoji: "🏟️", shortDescription: "London · Iconic arch over a sea of 90,000 fans" },
  // Outdoor
  { key: "glastonbury_pyramid", displayName: "Glastonbury Pyramid Stage", category: "Outdoor", emoji: "🌿", shortDescription: "Somerset · Golden pyramid at dusk, festival crowd" },
  { key: "coachella_main_stage", displayName: "Coachella Main Stage", category: "Outdoor", emoji: "🌵", shortDescription: "Indio · Desert night sky, neon-lit stage canopy" },
  // Theatres
  { key: "palais_garnier", displayName: "Palais Garnier Opera House", category: "Theatre", emoji: "🎭", shortDescription: "Paris · Gilded baroque interior with Chagall ceiling" },
  { key: "london_palladium", displayName: "London Palladium", category: "Theatre", emoji: "🎩", shortDescription: "London · Art Deco grandeur with gold proscenium arch" },
  // Clubs
  { key: "ronnie_scotts", displayName: "Ronnie Scott's Jazz Club", category: "Club", emoji: "🎷", shortDescription: "London · Intimate jazz club with red velvet and dim spotlights" },
  { key: "fabric_london", displayName: "Fabric London", category: "Club", emoji: "🔊", shortDescription: "London · Industrial warehouse with pulsing UV lights" },
];

const CATEGORY_ORDER = ["Recording Studio", "Concert Hall", "Arena", "Stadium", "Outdoor", "Theatre", "Club"];

interface Props {
  onSelect: (venueKey: string) => void;
  isPending?: boolean;
}

export function LocationVenuePicker({ onSelect, isPending }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("Recording Studio");

  const categories = CATEGORY_ORDER.filter(cat => VENUE_OPTIONS.some(v => v.category === cat));
  const filteredVenues = VENUE_OPTIONS.filter(v => v.category === activeCategory);

  const handleConfirm = () => {
    if (selectedKey) onSelect(selectedKey);
  };

  return (
    <div>
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setSelectedKey(null); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              activeCategory === cat
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                : "bg-white/5 text-white/40 border border-white/10 hover:text-white/70 hover:bg-white/10"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Venue grid */}
      <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
        {filteredVenues.map(venue => (
          <button
            key={venue.key}
            onClick={() => setSelectedKey(venue.key === selectedKey ? null : venue.key)}
            className={`flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all border ${
              selectedKey === venue.key
                ? "border-amber-500/60 bg-amber-900/25 text-amber-200"
                : "border-white/5 bg-white/3 hover:border-white/20 hover:bg-white/5 text-white/70"
            }`}
          >
            <span className="text-lg leading-none mt-0.5 flex-shrink-0">{venue.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">{venue.displayName}</p>
              <p className="text-[10px] text-white/35 mt-0.5 leading-tight">{venue.shortDescription}</p>
            </div>
            {selectedKey === venue.key && (
              <div className="w-4 h-4 rounded-full bg-amber-500/80 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1.5 5l2.5 2.5 4.5-4.5" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Confirm button */}
      {selectedKey && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-sm font-semibold transition-all disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Lock Location
          </button>
        </div>
      )}
    </div>
  );
}
