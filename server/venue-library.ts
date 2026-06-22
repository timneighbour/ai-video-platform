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
  category: "recording_studio" | "concert_hall" | "arena" | "stadium" | "theatre" | "outdoor" | "club" | "tv_studio" | "filming_location";
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

  {
    key: "capitol_studios_la",
    displayName: "Capitol Studios — Los Angeles",
    category: "recording_studio",
    emoji: "🎺",
    venueType: "recording_studio",
    interiorDNA: `LOCATION LOCK — CAPITOL STUDIOS, INSIDE THE CAPITOL RECORDS TOWER, HOLLYWOOD, LOS ANGELES. MANDATORY ARCHITECTURAL ELEMENTS: (1) Circular studio rooms reflecting the iconic cylindrical tower architecture above. (2) Warm amber/gold studio lighting with vintage Edison bulbs and soft overhead floods. (3) Famous underground echo chambers — long reverberant concrete tunnels visible through glass. (4) Vintage mixing console and outboard gear from the 1950s-60s era. (5) Acoustic panels in warm wood and fabric. (6) Intimate studio atmosphere with low ceilings. (7) Hollywood glamour aesthetic — warm gold and cream tones. ATMOSPHERE: legendary Hollywood recording studio, warm golden light, vintage glamour, intimate creative space.`,
  },
  {
    key: "sunset_sound_la",
    displayName: "Sunset Sound — Los Angeles",
    category: "recording_studio",
    emoji: "🌅",
    venueType: "recording_studio",
    interiorDNA: `LOCATION LOCK — SUNSET SOUND RECORDERS, WEST HOLLYWOOD, LOS ANGELES. Where The Doors, Prince, and Led Zeppelin recorded. MANDATORY ARCHITECTURAL ELEMENTS: (1) Warm, intimate studio rooms with low ceilings and vintage acoustic treatment. (2) Rich wood panelling in warm walnut and mahogany tones. (3) Vintage mixing console (SSL or Neve) in the control room visible through large glass window. (4) Warm amber/orange studio lighting creating a cosy, creative atmosphere. (5) Vintage outboard gear stacked in racks. (6) Plush carpet in deep burgundy or brown. (7) Intimate, slightly psychedelic 1960s-70s rock studio vibe. ATMOSPHERE: legendary West Hollywood rock studio, warm amber light, vintage equipment, intimate creative space.`,
  },
  {
    key: "blackbird_studio_nashville",
    displayName: "Blackbird Studio — Nashville",
    category: "recording_studio",
    emoji: "🐦",
    venueType: "recording_studio",
    interiorDNA: `LOCATION LOCK — BLACKBIRD STUDIO, NASHVILLE, TENNESSEE. Home to one of the world's most extensive vintage gear collections. MANDATORY ARCHITECTURAL ELEMENTS: (1) Large, well-appointed studio rooms with high ceilings and warm wood acoustic treatment. (2) Extensive vintage microphone collection visible on stands — Neumann U47s, RCA ribbons, vintage condensers. (3) Warm honey-brown hardwood floors. (4) Vintage amplifiers and instruments displayed throughout. (5) Warm amber/gold studio lighting. (6) Nashville country/Americana aesthetic mixed with world-class modern production. (7) Vintage gear racks and outboard equipment. ATMOSPHERE: world-class Nashville studio, warm amber light, vintage gear everywhere, professional creative space.`,
  },
  {
    key: "real_world_studios_bath",
    displayName: "Real World Studios — Bath, UK",
    category: "recording_studio",
    emoji: "🌍",
    venueType: "recording_studio",
    interiorDNA: `LOCATION LOCK — REAL WORLD STUDIOS, BOX, NEAR BATH, WILTSHIRE, UK. Founded by Peter Gabriel. MANDATORY ARCHITECTURAL ELEMENTS: (1) Stunning rural English countryside setting — rolling green hills and woodland visible through large windows. (2) The iconic "Big Room" with floor-to-ceiling glass walls overlooking a millpond and watermill. (3) Natural stone and wood architecture blending with the rural landscape. (4) Warm natural daylight flooding through large windows. (5) Organic, natural materials — stone floors, exposed wooden beams. (6) World music instruments and artefacts from global cultures. (7) Millpond and watermill visible outside. ATMOSPHERE: stunning rural English studio, natural light, countryside views, organic world-music creative space.`,
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

  {
    key: "walt_disney_concert_hall",
    displayName: "Walt Disney Concert Hall — Los Angeles",
    category: "concert_hall",
    emoji: "🏗️",
    venueType: "concert_hall",
    interiorDNA: `LOCATION LOCK — WALT DISNEY CONCERT HALL, DOWNTOWN LOS ANGELES. Frank Gehry's architectural masterpiece. MANDATORY ARCHITECTURAL ELEMENTS: (1) Extraordinary curved wooden ceiling panels in warm Douglas fir — the iconic "French fry" or "french toast" acoustic panels creating a flowing organic canopy. (2) Warm honey-blonde Douglas fir wood covering every surface — walls, ceiling, stage surround. (3) Vineyard-style seating with audience surrounding the stage on all sides. (4) Dramatic curved balconies in warm wood. (5) Organ pipes in a sculptural arrangement nicknamed "French fries" — pale blonde wood pipes in organic curved formation. (6) Warm amber stage lighting against the blonde wood. ATMOSPHERE: world-class modern concert hall, warm honey-blonde wood everywhere, organic curved architecture, intimate vineyard seating.`,
  },
  {
    key: "red_rocks_amphitheatre",
    displayName: "Red Rocks Amphitheatre — Morrison, Colorado",
    category: "outdoor",
    emoji: "🪨",
    venueType: "outdoor_festival",
    interiorDNA: `LOCATION LOCK — RED ROCKS AMPHITHEATRE, MORRISON, COLORADO. The world's only naturally occurring, acoustically perfect outdoor amphitheatre. MANDATORY ARCHITECTURAL ELEMENTS: (1) Towering red sandstone rock formations flanking both sides of the stage — Ship Rock (north) and Creation Rock (south), each approximately 70 metres tall. (2) Red and orange layered sandstone rock faces with dramatic geological striations. (3) Open-air seating carved into the natural rock hillside — 9,525 capacity. (4) Stage nestled between the two massive red rock formations. (5) Dramatic Colorado sky — deep blue, golden sunset, or dramatic storm clouds. (6) Rocky Mountain landscape and Denver city lights visible in the distance at night. (7) Warm red/amber/orange colour palette from the sandstone. ATMOSPHERE: iconic natural rock amphitheatre, towering red sandstone formations always flanking the stage, dramatic Colorado sky, legendary outdoor concert setting.`,
  },
  {
    key: "radio_city_music_hall",
    displayName: "Radio City Music Hall — New York City",
    category: "theatre",
    emoji: "🎠",
    venueType: "concert_hall",
    interiorDNA: `LOCATION LOCK — RADIO CITY MUSIC HALL, ROCKEFELLER CENTER, NEW YORK CITY. The "Showplace of the Nation." MANDATORY ARCHITECTURAL ELEMENTS: (1) Grand Art Deco interior — the largest indoor theatre in the world at time of opening. (2) Iconic sunburst ceiling with concentric arches in warm gold and amber — the famous "sunrise" mural. (3) Rich burgundy/red upholstered seats in sweeping curved rows. (4) Ornate gold Art Deco detailing on walls, columns, and balcony railings. (5) Massive proscenium stage with the famous Great Stage and hydraulic lifts. (6) Warm golden Art Deco lighting. (7) Capacity 5,960 with three tiers of balconies. ATMOSPHERE: iconic Art Deco grandeur, warm gold and burgundy palette, the sunrise ceiling always visible, legendary NYC showplace.`,
  },

  // ── Arenas ───────────────────────────────────────────────────────────────
  {
    key: "msg_sphere_las_vegas",
    displayName: "MSG Sphere — Las Vegas",
    category: "arena",
    emoji: "🌐",
    venueType: "arena",
    interiorDNA: `LOCATION LOCK — MSG SPHERE, LAS VEGAS STRIP, NEVADA. The world's largest spherical structure and most technologically advanced entertainment venue. MANDATORY ARCHITECTURAL ELEMENTS: (1) The world's largest and highest-resolution LED screen — a fully wraparound 160,000 sq ft interior LED surface covering the entire ceiling and walls in an immersive dome. (2) The screen can display any environment imaginable — from outer space to underwater to abstract digital art — completely surrounding the performer and audience. (3) Futuristic spherical architecture with no visible structural supports — pure immersive visual environment. (4) Seating for 17,500 with every seat facing the central stage. (5) The stage is a small island surrounded by the overwhelming wraparound LED display. (6) Dramatic, otherworldly atmosphere — the LED content defines the entire visual environment. ATMOSPHERE: the most futuristic and immersive concert venue on Earth, wraparound LED dome displaying any visual world, Las Vegas Strip visible in exterior shots, mind-bending scale and technology.`,
  },
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

  // ── TV Studios & Broadcast Locations ────────────────────────────────────
  {
    key: "bbc_television_centre",
    displayName: "BBC Television Centre — London",
    category: "tv_studio",
    emoji: "📺",
    venueType: "recording_studio",
    interiorDNA: `LOCATION LOCK — BBC TELEVISION CENTRE, WOOD LANE, SHEPHERD'S BUSH, LONDON. The iconic former BBC broadcasting hub. MANDATORY ARCHITECTURAL ELEMENTS: (1) The famous circular doughnut-shaped building with the central courtyard featuring the Helios sculpture. (2) Vintage broadcast studio interiors with high ceilings and professional TV lighting rigs. (3) Warm tungsten studio lighting creating the classic BBC broadcast look. (4) Iconic Top of the Pops studio feel — performance stage with audience, colourful lighting, vintage broadcast cameras. (5) BBC branding and signage. (6) 1960s-70s modernist architecture with clean lines. ATMOSPHERE: iconic British broadcasting heritage, warm studio lighting, legendary Top of the Pops performance vibe.`,
  },
  {
    key: "pinewood_studios",
    displayName: "Pinewood Studios — Buckinghamshire, UK",
    category: "tv_studio",
    emoji: "🎬",
    venueType: "recording_studio",
    interiorDNA: `LOCATION LOCK — PINEWOOD STUDIOS, IVER HEATH, BUCKINGHAMSHIRE, UK. World-class film and TV production facility. MANDATORY ARCHITECTURAL ELEMENTS: (1) Massive sound stages with very high ceilings — the largest stages in Europe. (2) Professional film/TV lighting rig overhead — HMI fresnels, LED panels, tungsten floods. (3) Clean, professional studio environment with polished concrete or hardwood floors. (4) Film production equipment visible — cameras, dollies, lighting stands. (5) Neutral grey/white studio walls allowing any set to be built. (6) The iconic Pinewood exterior — English country house architecture. ATMOSPHERE: world-class professional film studio, dramatic production lighting, large-scale cinematic environment.`,
  },
  {
    key: "nbc_studios_30_rock",
    displayName: "NBC Studios / 30 Rock — New York City",
    category: "tv_studio",
    emoji: "🗽",
    venueType: "recording_studio",
    interiorDNA: `LOCATION LOCK — NBC STUDIOS, 30 ROCKEFELLER PLAZA, MIDTOWN MANHATTAN, NEW YORK CITY. Home of Saturday Night Live. MANDATORY ARCHITECTURAL ELEMENTS: (1) The iconic Art Deco Rockefeller Center exterior — 30 Rock tower in warm limestone. (2) Studio 8H interior — the SNL stage with its distinctive proscenium and audience seating. (3) Warm broadcast studio lighting with professional TV rig. (4) Art Deco lobby with murals and gold detailing. (5) Manhattan skyline visible from upper floors. (6) NBC peacock logo and branding. ATMOSPHERE: iconic American broadcast institution, Art Deco grandeur, warm studio lighting, Manhattan prestige.`,
  },
  {
    key: "ed_sullivan_theater",
    displayName: "Ed Sullivan Theater — New York City",
    category: "tv_studio",
    emoji: "🎙️",
    venueType: "concert_hall",
    interiorDNA: `LOCATION LOCK — ED SULLIVAN THEATER (LATE SHOW STUDIO), BROADWAY, NEW YORK CITY. Where The Beatles made their US TV debut. MANDATORY ARCHITECTURAL ELEMENTS: (1) Classic Broadway theatre interior converted for TV broadcast. (2) Warm amber stage lighting with professional broadcast rig. (3) Tiered audience seating facing the performance stage. (4) Late Show with Stephen Colbert set design — desk, backdrop, NYC skyline graphic. (5) Historic theatre architecture with ornate plasterwork. (6) Broadway street visible through entrance. ATMOSPHERE: legendary American TV institution, warm broadcast lighting, historic Broadway theatre, iconic performance space.`,
  },

  // ── Iconic Music Video Filming Locations ─────────────────────────────────
  {
    key: "county_down_northern_ireland",
    displayName: "County Down — Northern Ireland",
    category: "filming_location",
    emoji: "🌾",
    venueType: "outdoor_festival",
    interiorDNA: `LOCATION LOCK — COUNTY DOWN, NORTHERN IRELAND. Filming location for Rihanna's "We Found Love." MANDATORY VISUAL ELEMENTS: (1) Rolling green Irish countryside with lush emerald fields. (2) Dramatic overcast sky with heavy grey clouds and shafts of golden light breaking through. (3) Rural farm setting — stone walls, hay bales, rustic barns. (4) Wildflower meadows and overgrown grass. (5) Moody, atmospheric Irish light — cool blue-grey with warm golden breaks. (6) Distant hills and hedgerows. ATMOSPHERE: moody, romantic Irish countryside, dramatic overcast sky, lush green fields, raw natural beauty.`,
  },
  {
    key: "hoxton_street_london",
    displayName: "Hoxton Street — London",
    category: "filming_location",
    emoji: "🚶",
    venueType: "outdoor_festival",
    interiorDNA: `LOCATION LOCK — HOXTON STREET, SHOREDITCH, EAST LONDON. Setting for The Verve's iconic Bittersweet Symphony. MANDATORY VISUAL ELEMENTS: (1) Busy East London street with pedestrians and shopfronts. (2) Victorian/Edwardian terraced buildings with brick facades. (3) Busy pavement with people walking — the iconic walking-through-crowds shot. (4) Overcast London sky — cool grey-white light. (5) East London street furniture — bus stops, bollards, shopfronts. (6) Gritty urban British street atmosphere. ATMOSPHERE: gritty East London street, overcast British sky, busy urban pavement, iconic Britpop music video setting.`,
  },
  {
    key: "mojave_desert_california",
    displayName: "Mojave Desert — California",
    category: "filming_location",
    emoji: "🌵",
    venueType: "outdoor_festival",
    interiorDNA: `LOCATION LOCK — MOJAVE DESERT, CALIFORNIA. Featured in U2 and Lana Del Rey music videos. MANDATORY VISUAL ELEMENTS: (1) Vast, flat desert landscape stretching to the horizon. (2) Joshua trees — distinctive spiky silhouettes against the sky. (3) Dramatic desert sky — deep blue, golden sunset, or dramatic clouds. (4) Warm golden/amber desert light. (5) Cracked dry earth and sand. (6) Distant mountains on the horizon. (7) Sparse desert vegetation. ATMOSPHERE: iconic California desert, warm golden light, Joshua trees, vast open landscape, cinematic American West.`,
  },
  {
    key: "seljalandsfoss_iceland",
    displayName: "Seljalandsfoss Waterfall — Iceland",
    category: "filming_location",
    emoji: "💧",
    venueType: "outdoor_festival",
    interiorDNA: `LOCATION LOCK — SELJALANDSFOSS WATERFALL, SOUTH ICELAND. Backdrop for Justin Bieber's "I'll Show You." MANDATORY VISUAL ELEMENTS: (1) Dramatic 60-metre waterfall cascading from a basalt cliff — the defining element. (2) Lush green moss covering the surrounding rocks and cliff face. (3) Dramatic Icelandic sky — moody grey clouds or ethereal golden hour light. (4) Mist and spray from the waterfall creating atmospheric haze. (5) The path behind the waterfall — walkable cave behind the falls. (6) Vast Icelandic landscape — flat green plains and distant mountains. ATMOSPHERE: dramatic Icelandic waterfall, moody ethereal light, mist and spray, raw natural power.`,
  },
  {
    key: "griffith_park_los_angeles",
    displayName: "Griffith Park — Los Angeles",
    category: "filming_location",
    emoji: "🎃",
    venueType: "outdoor_festival",
    interiorDNA: `LOCATION LOCK — GRIFFITH PARK, LOS ANGELES. Primary setting for Michael Jackson's Thriller. MANDATORY VISUAL ELEMENTS: (1) Griffith Observatory visible on the hilltop — Art Deco white building with copper domes. (2) Hollywood Hills and LA cityscape in the background. (3) Dramatic night setting with moonlight and atmospheric fog/mist. (4) Winding park roads and pathways. (5) Dark, moody lighting — perfect for horror/thriller aesthetics. (6) LA city lights twinkling in the valley below. ATMOSPHERE: iconic LA park, Griffith Observatory always visible, dramatic night atmosphere, Hollywood Hills backdrop.`,
  },
  {
    key: "universal_studios_backlot",
    displayName: "Universal Studios Backlot — Florida",
    category: "filming_location",
    emoji: "🎥",
    venueType: "recording_studio",
    interiorDNA: `LOCATION LOCK — UNIVERSAL STUDIOS BACKLOT, ORLANDO, FLORIDA. Location for Creed's My Sacrifice. MANDATORY VISUAL ELEMENTS: (1) Professional film studio backlot with various street sets and facades. (2) Large sound stages with high ceilings visible in background. (3) Film production equipment — cameras, lighting rigs, cranes. (4) Various set pieces — period streets, urban environments, architectural facades. (5) Warm Florida sunlight. (6) Professional film production atmosphere. ATMOSPHERE: professional Hollywood-style film backlot, warm Florida light, cinematic production environment.`,
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
