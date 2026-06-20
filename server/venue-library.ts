/**
 * Venue Library — Location Lock System
 *
 * Each entry defines a real-world venue with:
 *   - key: unique identifier used in DB (venueLockedKey)
 *   - displayName: human-readable name shown in UI
 *   - category: type of venue for filtering
 *   - interiorDNA: detailed visual description injected into every scene prompt
 *     when this venue is locked. Written to be AI-image-generation friendly.
 *   - venueType: maps to VENUE_DNA key in fal-image-gen.ts for BFL fallback path
 */

export interface VenueEntry {
  key: string;
  displayName: string;
  category: "recording_studio" | "concert_hall" | "arena" | "stadium" | "theatre" | "outdoor" | "club";
  emoji: string;
  interiorDNA: string;
  venueType: string; // maps to VENUE_DNA key
  /** Optional real reference photo URL — passed to image generation as visual background anchor */
  referenceImageUrl?: string;
}

export const VENUE_LIBRARY: VenueEntry[] = [
  // ── Recording Studios ────────────────────────────────────────────────────
  {
    key: "air_studios_lyndhurst",
    displayName: "Air Studios, Lyndhurst Hall — London",
    category: "recording_studio",
    emoji: "🎼",
    venueType: "concert_hall",
    referenceImageUrl: "/manus-storage/air-studios-lyndhurst-hall_c3992593.jpg",
    interiorDNA: `LOCATION LOCK — AIR STUDIOS, LYNDHURST HALL, LONDON. This is a converted Victorian Gothic church. MANDATORY ARCHITECTURAL ELEMENTS that MUST appear in EVERY scene: (1) Large suspended hexagonal wooden acoustic canopy with geometric triangular lattice of dark warm mahogany beams hanging centrally from ceiling — this is the most distinctive element. (2) Fan-vaulted Gothic ceiling painted pale periwinkle blue/lavender between white plaster fan-vault ribs. (3) Multiple tall Gothic-arched windows with decorative tracery in two tiers, letting in cool blue-white diffused daylight through frosted/leaded glass. (4) Continuous curved wooden balcony/gallery at mid-height with warm honey/oak wood panelling and ornate carved decorative arches. (5) Classical pipe organ in dark mahogany housing with silver-grey metal pipes at far end. (6) Warm honey-brown herringbone parquet floor, highly polished. LIGHTING: warm golden/amber tungsten spotlights contrasting with cool blue-white window light. ATMOSPHERE: full symphony orchestra in traditional formation, music stands, conductor's podium, Steinway concert grand piano in black lacquer. NO chandeliers. NO tiered audience seating. NO dark ceiling. Ceiling is ALWAYS pale blue/lavender.`,
  },
  {
    key: "abbey_road_studio_one",
    displayName: "Abbey Road, Studio One — London",
    category: "recording_studio",
    emoji: "🎵",
    venueType: "concert_hall",
    interiorDNA: `LOCATION LOCK — ABBEY ROAD STUDIO ONE, LONDON. The world's largest purpose-built recording studio. MANDATORY ARCHITECTURAL ELEMENTS: (1) Vast rectangular hall with high flat ceiling, approximately 9 metres high, with acoustic diffuser panels. (2) Pale cream/off-white walls with vertical wooden acoustic baffles and fabric-covered absorption panels. (3) Sprung maple hardwood floor in warm honey-brown. (4) Overhead lighting rig with warm tungsten floods and directional spots creating pools of golden light. (5) Large orchestral recording space with moveable acoustic screens and baffles in natural wood. (6) Grand piano (Steinway Model D, black lacquer) positioned stage-left. (7) Professional microphone forest — tall boom stands with vintage ribbon and condenser mics. ATMOSPHERE: intimate yet grand, warm amber lighting, professional orchestral recording session feel. NO windows visible. NO audience seating. Walls are cream/off-white with wood panelling.`,
  },
  {
    key: "abbey_road_studio_two",
    displayName: "Abbey Road, Studio Two — London",
    category: "recording_studio",
    emoji: "🎸",
    venueType: "recording_studio",
    interiorDNA: `LOCATION LOCK — ABBEY ROAD STUDIO TWO, LONDON. The legendary studio where The Beatles recorded. MANDATORY ARCHITECTURAL ELEMENTS: (1) Medium-sized rectangular room with parquet hardwood floor in warm honey-brown. (2) Cream/off-white walls with vintage acoustic tiles and wooden baffles. (3) Low ceiling with acoustic treatment panels. (4) Warm amber/tungsten overhead lighting creating intimate atmosphere. (5) Vintage equipment visible: amplifiers, drum kit, microphone stands. (6) Control room window with large glass panel visible at one end. (7) Iconic green-painted acoustic screens/baffles on wheels. ATMOSPHERE: intimate, warm, historic recording session feel. Slightly smaller and more intimate than Studio One.`,
  },
  {
    key: "air_studios_montserrat",
    displayName: "Air Studios, Montserrat — Caribbean",
    category: "recording_studio",
    emoji: "🌴",
    venueType: "recording_studio",
    interiorDNA: `LOCATION LOCK — AIR STUDIOS MONTSERRAT, CARIBBEAN. Iconic island recording studio in a converted plantation house. MANDATORY ARCHITECTURAL ELEMENTS: (1) Tropical colonial architecture with thick stone walls and high ceilings. (2) Large open windows and doors letting in tropical light and ocean breeze. (3) Lush tropical vegetation visible through windows — palm trees, volcanic hillside. (4) Warm terracotta/stone floor tiles. (5) Ceiling fans and natural ventilation. (6) Vintage recording equipment mixed with tropical décor. (7) Warm golden Caribbean sunlight filtering through louvred shutters. ATMOSPHERE: relaxed tropical luxury, warm golden light, lush green vegetation outside, intimate creative space. Ocean and volcanic landscape visible through windows.`,
  },
  {
    key: "electric_lady_studios",
    displayName: "Electric Lady Studios — New York City",
    category: "recording_studio",
    emoji: "⚡",
    venueType: "recording_studio",
    interiorDNA: `LOCATION LOCK — ELECTRIC LADY STUDIOS, GREENWICH VILLAGE, NEW YORK CITY. Jimi Hendrix's legendary studio. MANDATORY ARCHITECTURAL ELEMENTS: (1) Distinctive curved organic architecture with rounded walls and ceilings — no sharp corners. (2) Psychedelic mural artwork on curved walls in vibrant colours. (3) Warm amber and purple mood lighting with vintage Edison bulbs. (4) Curved control room window with vintage mixing console visible. (5) Plush carpet in deep burgundy/purple. (6) Vintage outboard gear and equipment racks. (7) Intimate, underground feel with low ceilings and curved surfaces. ATMOSPHERE: legendary rock/soul recording vibe, warm amber light, psychedelic art, intimate underground studio.`,
  },

  // ── Concert Halls ────────────────────────────────────────────────────────
  {
    key: "royal_albert_hall",
    displayName: "Royal Albert Hall — London",
    category: "concert_hall",
    emoji: "🏛️",
    venueType: "concert_hall",
    interiorDNA: `LOCATION LOCK — ROYAL ALBERT HALL, LONDON. Victorian circular concert hall. MANDATORY ARCHITECTURAL ELEMENTS: (1) Vast circular auditorium with red-upholstered tiered seating rising in concentric rings. (2) Iconic mushroom-shaped acoustic diffuser discs (GRP saucers) suspended from the domed ceiling. (3) Ornate Victorian terracotta exterior visible in establishing shots. (4) Grand organ with gilded pipes at the rear of the stage. (5) Warm amber/gold lighting from chandeliers and stage lighting. (6) Red velvet seats and boxes with ornate gilt railings. (7) Circular promenade floor (the Arena) at ground level. ATMOSPHERE: grand Victorian splendour, warm golden light, red and gold colour palette, full house audience.`,
  },
  {
    key: "carnegie_hall",
    displayName: "Carnegie Hall — New York City",
    category: "concert_hall",
    emoji: "🎻",
    venueType: "concert_hall",
    interiorDNA: `LOCATION LOCK — CARNEGIE HALL, MAIN AUDITORIUM (STERN AUDITORIUM), NEW YORK CITY. MANDATORY ARCHITECTURAL ELEMENTS: (1) Horseshoe-shaped auditorium with multiple tiers of balconies in ivory/cream with ornate gilt plasterwork. (2) Rich red/burgundy upholstered seats. (3) Warm golden chandeliers providing soft amber light. (4) Proscenium arch stage with dark wood floor. (5) Ornate plasterwork ceiling with central chandelier. (6) Intimate acoustic perfection — the hall feels both grand and warm. ATMOSPHERE: world-class classical concert hall, warm golden amber light, cream and gold colour palette, full audience.`,
  },
  {
    key: "sydney_opera_house",
    displayName: "Sydney Opera House — Sydney",
    category: "concert_hall",
    emoji: "🦪",
    venueType: "concert_hall",
    interiorDNA: `LOCATION LOCK — SYDNEY OPERA HOUSE CONCERT HALL, SYDNEY, AUSTRALIA. MANDATORY ARCHITECTURAL ELEMENTS: (1) Distinctive curved wooden ceiling panels in warm brushbox timber creating acoustic canopy. (2) Pale birch/blonde wood walls and ceiling. (3) Warm amber stage lighting against the pale wood interior. (4) Grand pipe organ (the largest mechanical tracker-action organ in the world) with 10,154 pipes visible at rear. (5) Tiered seating in warm red/burgundy. (6) Iconic sail-shaped exterior shell visible in establishing wide shots. ATMOSPHERE: warm blonde timber interior, amber stage lighting, world-famous acoustic hall.`,
  },

  // ── Arenas ───────────────────────────────────────────────────────────────
  {
    key: "o2_arena_london",
    displayName: "The O2 Arena — London",
    category: "arena",
    emoji: "🎪",
    venueType: "live_arena",
    interiorDNA: `LOCATION LOCK — THE O2 ARENA, LONDON. Massive indoor arena inside the iconic dome. MANDATORY ARCHITECTURAL ELEMENTS: (1) Enormous circular arena with capacity for 20,000+ fans. (2) Massive LED video wall backdrop behind the stage. (3) Dramatic overhead lighting rig with moving lights, lasers, and follow spots. (4) Sold-out crowd visible in all directions — floor, lower tier, upper tier. (5) Distinctive dome ceiling visible above the lighting rig. (6) Stage with elaborate production design, speaker stacks, and monitor wedges. ATMOSPHERE: massive sold-out arena concert, dramatic lighting, enormous crowd energy.`,
  },
  {
    key: "madison_square_garden",
    displayName: "Madison Square Garden — New York City",
    category: "arena",
    emoji: "🏟️",
    venueType: "live_arena",
    interiorDNA: `LOCATION LOCK — MADISON SQUARE GARDEN, NEW YORK CITY. The world's most famous arena. MANDATORY ARCHITECTURAL ELEMENTS: (1) Circular arena with distinctive concentric ring architecture. (2) Massive overhead scoreboard/video display hanging from the ceiling. (3) Sold-out crowd of 20,000 in the round. (4) Dramatic overhead lighting rig with moving lights. (5) Circular stage or thrust stage configuration. (6) Iconic MSG branding and red/blue colour scheme. ATMOSPHERE: legendary NYC arena concert, electric atmosphere, massive crowd.`,
  },
  {
    key: "wembley_arena",
    displayName: "OVO Arena Wembley — London",
    category: "arena",
    emoji: "⭐",
    venueType: "live_arena",
    interiorDNA: `LOCATION LOCK — OVO ARENA WEMBLEY (WEMBLEY ARENA), LONDON. Iconic indoor arena. MANDATORY ARCHITECTURAL ELEMENTS: (1) Large rectangular arena with capacity for 12,500. (2) Distinctive curved roof structure. (3) Sold-out crowd on floor and tiered seating. (4) Large LED video screens flanking the stage. (5) Professional concert lighting rig with moving heads and lasers. (6) Stage with full production design. ATMOSPHERE: sold-out London arena concert, energetic crowd, dramatic stage lighting.`,
  },

  // ── Stadiums ─────────────────────────────────────────────────────────────
  {
    key: "sofi_stadium",
    displayName: "SoFi Stadium — Los Angeles",
    category: "stadium",
    emoji: "🌟",
    venueType: "live_arena",
    interiorDNA: `LOCATION LOCK — SOFI STADIUM, INGLEWOOD, LOS ANGELES. Ultra-modern NFL stadium and concert venue. MANDATORY ARCHITECTURAL ELEMENTS: (1) Futuristic translucent ETFE roof canopy allowing natural light — distinctive oval shape. (2) Massive 70,000+ capacity stadium bowl with tiered seating. (3) Enormous 4K LED video halo display (the "Oculus") hanging above the field — the world's largest indoor video board. (4) Sleek modern architecture with white/silver structural elements. (5) Sold-out crowd filling every tier. (6) Stage on the field with massive production design. (7) LA skyline visible through the open sides. ATMOSPHERE: world-class stadium concert, futuristic modern venue, massive scale, LA sunshine.`,
  },
  {
    key: "wembley_stadium",
    displayName: "Wembley Stadium — London",
    category: "stadium",
    emoji: "🏟️",
    venueType: "live_arena",
    interiorDNA: `LOCATION LOCK — WEMBLEY STADIUM, LONDON. England's national stadium. MANDATORY ARCHITECTURAL ELEMENTS: (1) Iconic 133-metre arch spanning the entire stadium — visible in every wide shot. (2) 90,000 capacity bowl with tiered seating. (3) Retractable roof partially covering upper tiers. (4) Massive LED screens at each end. (5) Sold-out crowd in white/red/blue. (6) Stage on the pitch with massive production design. (7) London skyline visible. ATMOSPHERE: iconic stadium concert, the arch is always visible, massive crowd, dramatic scale.`,
  },
  {
    key: "glastonbury_pyramid",
    displayName: "Glastonbury, Pyramid Stage — Somerset",
    category: "outdoor",
    emoji: "🌿",
    venueType: "outdoor_festival",
    interiorDNA: `LOCATION LOCK — GLASTONBURY FESTIVAL PYRAMID STAGE, WORTHY FARM, SOMERSET. The world's most iconic festival stage. MANDATORY ARCHITECTURAL ELEMENTS: (1) Distinctive silver pyramid-shaped stage structure with the iconic star on top. (2) Vast open-air crowd of 100,000+ stretching to the horizon. (3) Rolling Somerset countryside and hills in the background. (4) Golden hour or sunset light casting warm amber glow. (5) Festival flags, banners, and tents visible in the crowd. (6) Muddy grass field. (7) Dramatic sky — often golden sunset or dramatic clouds. ATMOSPHERE: legendary outdoor festival, golden hour light, massive crowd, iconic pyramid structure always visible.`,
  },
  {
    key: "coachella_main_stage",
    displayName: "Coachella, Main Stage — Indio, California",
    category: "outdoor",
    emoji: "🌵",
    venueType: "outdoor_festival",
    interiorDNA: `LOCATION LOCK — COACHELLA VALLEY MUSIC AND ARTS FESTIVAL, MAIN STAGE, INDIO, CALIFORNIA. MANDATORY ARCHITECTURAL ELEMENTS: (1) Massive modern stage structure with large LED video walls. (2) Vast desert landscape backdrop — Coachella Valley mountains and palm trees. (3) Clear blue California sky or dramatic sunset. (4) Large crowd on the polo grounds. (5) Distinctive festival production with elaborate lighting rig. (6) Warm California desert light — golden and dry. ATMOSPHERE: iconic California desert festival, warm golden light, mountain backdrop, massive production.`,
  },

  // ── Theatres ─────────────────────────────────────────────────────────────
  {
    key: "palladium_london",
    displayName: "London Palladium — London",
    category: "theatre",
    emoji: "🎭",
    venueType: "concert_hall",
    interiorDNA: `LOCATION LOCK — LONDON PALLADIUM, ARGYLL STREET, LONDON. Iconic West End theatre. MANDATORY ARCHITECTURAL ELEMENTS: (1) Ornate Edwardian interior with red velvet seats and gilt plasterwork. (2) Horseshoe-shaped auditorium with circle and upper circle. (3) Proscenium arch stage with red velvet curtain. (4) Warm amber chandelier lighting. (5) Ornate ceiling with painted panels. (6) Capacity of 2,286 — intimate yet grand. ATMOSPHERE: classic West End theatre glamour, warm amber light, red and gold colour palette.`,
  },
  {
    key: "apollo_theater_harlem",
    displayName: "Apollo Theater — Harlem, New York City",
    category: "theatre",
    emoji: "🎤",
    venueType: "concert_hall",
    interiorDNA: `LOCATION LOCK — APOLLO THEATER, 125TH STREET, HARLEM, NEW YORK CITY. Legendary venue of African American music. MANDATORY ARCHITECTURAL ELEMENTS: (1) Art Deco interior with warm amber/gold lighting. (2) Proscenium stage with the famous "Tree of Hope" stump. (3) Tiered seating with balcony. (4) Ornate plasterwork ceiling. (5) Warm intimate atmosphere with 1,500 capacity. (6) Historic marquee sign visible in establishing shots. ATMOSPHERE: legendary intimate music venue, warm amber light, Art Deco elegance, historic soul/R&B/jazz atmosphere.`,
  },
];

/**
 * Get a venue entry by its key.
 */
export function getVenueByKey(key: string): VenueEntry | undefined {
  return VENUE_LIBRARY.find(v => v.key === key);
}

/**
 * Get all venues grouped by category.
 */
export function getVenuesByCategory(): Record<string, VenueEntry[]> {
  const grouped: Record<string, VenueEntry[]> = {};
  for (const venue of VENUE_LIBRARY) {
    if (!grouped[venue.category]) grouped[venue.category] = [];
    grouped[venue.category].push(venue);
  }
  return grouped;
}

/**
 * Get the interior DNA string for a locked venue key.
 * Returns undefined if the key is not found.
 */
export function getVenueInteriorDNA(venueLockedKey: string | null | undefined): string | undefined {
  if (!venueLockedKey) return undefined;
  return getVenueByKey(venueLockedKey)?.interiorDNA;
}

/**
 * Get the venueType (maps to VENUE_DNA key in fal-image-gen.ts) for a locked venue key.
 */
export function getVenueType(venueLockedKey: string | null | undefined): string {
  if (!venueLockedKey) return "concert_hall";
  return getVenueByKey(venueLockedKey)?.venueType ?? "concert_hall";
}
