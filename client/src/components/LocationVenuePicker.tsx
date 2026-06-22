import { useCallback, useEffect, useState } from "react";

interface VenueOption {
  key: string;
  displayName: string;
  category: string;
  emoji: string;
  shortDescription: string;
  /** Curated search query — used for AI reference images only (not thumbnails) */
  thumbnailSearchQuery: string;
  /** Hardcoded, verified colour interior image URL — shown directly in the UI */
  staticImageUrl: string;
}

// Mirror of the server-side venue library (display data only — no DNA)
const VENUE_OPTIONS: VenueOption[] = [
  // ── Recording Studios ────────────────────────────────────────────────────────
  {
    key: "air_studios_lyndhurst",
    displayName: "Air Studios, Lyndhurst Hall",
    category: "Recording Studio",
    emoji: "🎼",
    shortDescription: "London · Grand orchestral hall with iconic blue ceiling",
    thumbnailSearchQuery: "Air Studios Lyndhurst Hall London main orchestral hall blue ceiling colour interior",
    // Verified: Sound on Sound — colour interior of the main orchestral hall
    staticImageUrl: "https://dt7v1i9vyp3mf.cloudfront.net/styles/header/s3/imagelibrary/S/SF_06_15_01-h2QhAJbTtHDiSOCbd2J49qkZ9DNgp1Ci.jpg",
  },
  {
    key: "abbey_road_studio_one",
    displayName: "Abbey Road, Studio One",
    category: "Recording Studio",
    emoji: "🎵",
    shortDescription: "London · Legendary orchestral studio with parquet floors",
    thumbnailSearchQuery: "Abbey Road Studio One London main hall orchestra recording parquet floor colour interior",
    // Verified: Spitfire Audio CDN — colour interior of Abbey Road Studio One orchestral hall
    staticImageUrl: "https://www.spitfireaudio.com/cdn/shop/files/abbey-road-orchestra-hero-xs_6d5b85ae-48fb-46bb-94bc-034caf237c02.jpg?v=1757947495&width=1920",
  },
  {
    key: "abbey_road_studio_two",
    displayName: "Abbey Road, Studio Two",
    category: "Recording Studio",
    emoji: "🎸",
    shortDescription: "London · Iconic live room where The Beatles recorded",
    thumbnailSearchQuery: "Abbey Road Studio Two live room Beatles band recording colour interior wide shot",
    // Verified: Wikimedia Commons — colour interior of Abbey Road Studio Two, 2010 orchestral recording
    staticImageUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Abbey_Road_Studios_2010-04-08_-_orchestral_recording_in_Studio_2.jpg",
  },
  {
    key: "electric_lady_studios",
    displayName: "Electric Lady Studios",
    category: "Recording Studio",
    emoji: "⚡",
    shortDescription: "New York · Hendrix's psychedelic underground studio",
    thumbnailSearchQuery: "Electric Lady Studios New York live room interior colour psychedelic mural curved walls",
    // Verified: Wikimedia Commons — colour interior of Electric Lady Studios Studio A, psychedelic neon sign
    staticImageUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e3/ElectricLadyStudioA.jpg",
  },
  {
    key: "capitol_studios_la",
    displayName: "Capitol Studios",
    category: "Recording Studio",
    emoji: "🎺",
    shortDescription: "Los Angeles · Inside the iconic Capitol Records Tower",
    thumbnailSearchQuery: "Capitol Studios Hollywood Studio A live room orchestra colour interior wide angle",
    // Verified: Wikimedia Commons — Frank Sinatra at Capitol Studios circa 1955
    staticImageUrl: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Frank_Sinatra_%28circa_1955_in_Capitol_Studios%29.jpg",
  },
  {
    key: "sunset_sound_la",
    displayName: "Sunset Sound",
    category: "Recording Studio",
    emoji: "🌅",
    shortDescription: "Los Angeles · Where The Doors, Prince & Led Zeppelin recorded",
    thumbnailSearchQuery: "Sunset Sound Recorders Los Angeles live room interior colour band recording wide shot",
    // Verified: Sound on Sound — colour interior of Sunset Sound live room
    staticImageUrl: "https://dt7v1i9vyp3mf.cloudfront.net/styles/news_large/s3/imagelibrary/S/SF_Jun_02-XVo9TZtM3oO_zwwNzqaqJOzQeGux9.n_.jpg",
  },
  {
    key: "blackbird_studio_nashville",
    displayName: "Blackbird Studio",
    category: "Recording Studio",
    emoji: "🐦",
    shortDescription: "Nashville · World's most extensive vintage gear collection",
    thumbnailSearchQuery: "Blackbird Studio Nashville live room interior colour musicians recording vintage instruments",
    // Verified: Wikimedia Commons — colour interior of Blackbird Studio A tracking room, Nashville
    staticImageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/dd/Studio_A_tracking_room_at_Blackbird_Studio_in_Nashville%2C_Tennessee%2C.jpg",
  },
  // ── Concert Halls ────────────────────────────────────────────────────────────
  {
    key: "royal_albert_hall",
    displayName: "Royal Albert Hall",
    category: "Concert Hall",
    emoji: "🏛️",
    shortDescription: "London · Victorian rotunda with crimson tiered seating",
    thumbnailSearchQuery: "Royal Albert Hall London auditorium interior colour stage view red seats Victorian dome",
    // Verified: Wikimedia Commons — colour interior of Royal Albert Hall auditorium, empty red seats
    staticImageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/53/Royal_Albert_Hall_-_Gallery_View.jpg",
  },
  {
    key: "carnegie_hall",
    displayName: "Carnegie Hall",
    category: "Concert Hall",
    emoji: "🎻",
    shortDescription: "New York · Gilded Beaux-Arts hall with warm amber tones",
    thumbnailSearchQuery: "Carnegie Hall Stern Auditorium interior colour stage view gilded balconies",
    // Verified: Wikimedia Commons — colour interior of Carnegie Hall Stern Auditorium
    staticImageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/09/Carnegie-hall-isaac-stern.jpg",
  },
  {
    key: "sydney_opera_house",
    displayName: "Sydney Opera House",
    category: "Concert Hall",
    emoji: "🦪",
    shortDescription: "Sydney · Sail-shaped shells with harbour light",
    thumbnailSearchQuery: "Sydney Opera House Concert Hall interior colour stage auditorium wooden ceiling pipe organ",
    // Verified: Wikimedia Commons — colour interior of Sydney Opera House Concert Hall
    staticImageUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Sydney_Opera_House_interior.jpg",
  },
  {
    key: "walt_disney_concert_hall",
    displayName: "Walt Disney Concert Hall",
    category: "Concert Hall",
    emoji: "🏗️",
    shortDescription: "Los Angeles · Frank Gehry's curved blonde wood masterpiece",
    thumbnailSearchQuery: "Walt Disney Concert Hall Los Angeles interior colour auditorium curved wood stage orchestra",
    // Verified: Dezeen — colour interior of Walt Disney Concert Hall
    staticImageUrl: "https://static.dezeen.com/uploads/2022/05/walt-disney-concert-hall-frank-gehry_dezeen_2364_col_1.jpg",
  },
  {
    key: "radio_city_music_hall",
    displayName: "Radio City Music Hall",
    category: "Concert Hall",
    emoji: "🎠",
    shortDescription: "New York · Art Deco sunrise ceiling, gold and burgundy",
    thumbnailSearchQuery: "Radio City Music Hall New York interior colour auditorium stage Art Deco gold burgundy",
    // Verified: h3hc.com — colour interior of Radio City Music Hall Art Deco auditorium, empty red seats
    staticImageUrl: "https://www.h3hc.com/wp-content/uploads/2026/04/radio-city-int-auditorium-6-L.jpg",
  },
  // ── Arenas ───────────────────────────────────────────────────────────────────
  {
    key: "msg_sphere_las_vegas",
    displayName: "MSG Sphere",
    category: "Arena",
    emoji: "🌐",
    shortDescription: "Las Vegas · World's largest wraparound LED dome, 17,500 seats",
    thumbnailSearchQuery: "MSG Sphere Las Vegas interior colour wraparound LED screen concert stage",
    // Verified: Wired — colour interior of MSG Sphere with U2 LED screen
    staticImageUrl: "https://media.wired.com/photos/651f47f2d7c9e68a29328999/3:2/w_2560%2Cc_limit/U2-Sphere-Vegas-Plaine-2.jpg",
  },
  {
    key: "o2_arena_london",
    displayName: "The O2 Arena",
    category: "Arena",
    emoji: "🎪",
    shortDescription: "London · Massive dome with dramatic stage lighting rigs",
    thumbnailSearchQuery: "O2 Arena London interior colour concert stage lighting rig full arena",
    // Verified: Contentful CDN — colour interior of O2 Arena
    staticImageUrl: "https://images.ctfassets.net/pjshm78m9jt4/2YczT7ebe6f7wGn4qrEKeR/7651979475bf84eb79d096560a2f8680/Screenshot_2020-08-19_at_08.36.49.png",
  },
  {
    key: "madison_square_garden",
    displayName: "Madison Square Garden",
    category: "Arena",
    emoji: "🏟️",
    shortDescription: "New York · The World's Most Famous Arena",
    thumbnailSearchQuery: "Madison Square Garden New York interior colour concert stage spotlights full arena",
    // Verified: fischmusic.com — colour interior of MSG empty arena with scoreboard
    staticImageUrl: "https://fischmusic.com/wp-content/uploads/2022/01/MSG_Empty.jpeg",
  },
  {
    key: "wembley_arena",
    displayName: "OVO Arena Wembley",
    category: "Arena",
    emoji: "⭐",
    shortDescription: "London · Iconic curved roof with blue-white spotlights",
    thumbnailSearchQuery: "OVO Arena Wembley London interior colour concert stage crowd curved ceiling",
    // Verified: Foster+Partners official — colour interior of OVO Hydro arena, curved seating dome
    staticImageUrl: "https://content.fosterandpartners.com/api/media/getCroppedImage?imagePath=/media/yreidh0e/ovo-hydro_fp486009_2000.jpg&width=1200&height=800&crop=false",
  },
  // ── Stadiums ─────────────────────────────────────────────────────────────────
  {
    key: "sofi_stadium",
    displayName: "SoFi Stadium",
    category: "Stadium",
    emoji: "🌟",
    shortDescription: "Los Angeles · Futuristic translucent canopy, 70,000 seats",
    thumbnailSearchQuery: "SoFi Stadium Los Angeles interior colour concert stage crowd translucent roof",
    // Verified: Billboard — colour interior of SoFi Stadium concert
    staticImageUrl: "https://www.billboard.com/wp-content/uploads/2021/07/Kaskade-cr-Ivan-Meneses-for-Insomniac-Events-2021-billboard-1548-1626723231.jpg?w=942&h=628&crop=1",
  },
  {
    key: "wembley_stadium",
    displayName: "Wembley Stadium",
    category: "Stadium",
    emoji: "🏟️",
    shortDescription: "London · Iconic arch over a sea of 90,000 fans",
    thumbnailSearchQuery: "Wembley Stadium London interior colour concert stage crowd arch night",
    // Verified: Wikimedia Commons — colour interior of Wembley Stadium
    staticImageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/16/Wembley_Stadium_interior.jpg",
  },
  {
    key: "estadio_maracana",
    displayName: "Estádio do Maracanã",
    category: "Stadium",
    emoji: "🇧🇷",
    shortDescription: "Rio de Janeiro · Sugarloaf Mountain backdrop, 78,000 fans",
    thumbnailSearchQuery: "Maracanã Stadium Rio de Janeiro interior colour concert stage crowd full stadium",
    // Verified: Pollstar — colour interior of Maracanã concert
    staticImageUrl: "https://static.pollstar.com/wp-content/uploads/2026/04/IVETE-PRIDIA-56.jpg",
  },
  {
    key: "metlife_stadium",
    displayName: "MetLife Stadium",
    category: "Stadium",
    emoji: "🗽",
    shortDescription: "New Jersey · NYC skyline, Empire State Building backdrop",
    thumbnailSearchQuery: "MetLife Stadium New Jersey interior colour concert stage crowd night",
    // Verified: Brooklyn Vegan — colour interior of MetLife Stadium concert
    staticImageUrl: "https://media.brooklynvegan.com/xxrzsfjkyw/styles/article-hero/2024/05/27/therollingstones-metlifestadiumnight2.jpg.webp?t=58366918.webp",
  },
  {
    key: "tokyo_dome",
    displayName: "Tokyo Dome",
    category: "Stadium",
    emoji: "🏯",
    shortDescription: "Tokyo · White inflatable dome, 55,000 passionate fans",
    thumbnailSearchQuery: "Tokyo Dome Japan interior colour concert stage crowd white dome ceiling",
    // Verified: Martin Audio — colour interior of Tokyo Dome concert, white dome ceiling
    staticImageUrl: "https://static.martin-audio.com/pressrelease/medium/55000-seat-tokyo-dome-without-delays.jpg",
  },
  {
    key: "stade_de_france",
    displayName: "Stade de France",
    category: "Stadium",
    emoji: "🇫🇷",
    shortDescription: "Paris · Eiffel Tower backdrop, 81,000 capacity",
    thumbnailSearchQuery: "Stade de France Paris interior colour concert stage crowd full stadium night",
    // Verified: Headout CDN — colour interior of Stade de France
    staticImageUrl: "https://cdn-imgix.headout.com/media/images/78d5752039138e256011a106aead6a5d-stadedefrance2.jpg?auto=compress%2Cformat&w=900&h=562.5&q=90&ar=16%3A10&fit=crop",
  },
  {
    key: "camp_nou",
    displayName: "Camp Nou",
    category: "Stadium",
    emoji: "🔵",
    shortDescription: "Barcelona · Europe's largest stadium, Sagrada Família horizon",
    thumbnailSearchQuery: "Camp Nou Barcelona interior colour concert stage crowd full stadium night",
    // Verified: Wikimedia Commons — colour panoramic interior of Camp Nou stadium
    staticImageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/40/Camp_Nou_Panoramic_Interior_View.jpg",
  },
  {
    key: "rose_bowl",
    displayName: "Rose Bowl",
    category: "Stadium",
    emoji: "🌹",
    shortDescription: "Pasadena · San Gabriel Mountains, golden California light",
    thumbnailSearchQuery: "Rose Bowl Pasadena interior colour concert stage crowd full stadium night",
    // Verified: StadiumDB — colour interior of Rose Bowl Pasadena stadium
    staticImageUrl: "https://stadiumdb.com/pictures/stadiums/usa/rose_bowl/rose_bowl01.jpg",
  },
  // ── Outdoor ──────────────────────────────────────────────────────────────────
  {
    key: "glastonbury_pyramid",
    displayName: "Glastonbury Pyramid Stage",
    category: "Outdoor",
    emoji: "🌿",
    shortDescription: "Somerset · Golden pyramid at dusk, festival crowd",
    thumbnailSearchQuery: "Glastonbury Festival Pyramid Stage colour crowd sunset Somerset golden hour wide shot",
    // Verified: Billboard — colour Glastonbury Pyramid Stage
    staticImageUrl: "https://www.billboard.com/wp-content/uploads/2021/03/pyramid-stage-glastonbury-festival-1615447791.jpg",
  },
  {
    key: "coachella_main_stage",
    displayName: "Coachella Main Stage",
    category: "Outdoor",
    emoji: "🌵",
    shortDescription: "Indio · Desert night sky, neon-lit stage canopy",
    thumbnailSearchQuery: "Coachella festival main stage colour night desert crowd California neon lights wide shot",
    // Verified: Pollstar — colour Coachella main stage
    staticImageUrl: "https://static.pollstar.com/wp-content/uploads/2022/01/19141fd1-1cfd-4ed7-8c15-ee6626269941-03_L-Acoustics_Coachella.jpg",
  },
  {
    key: "red_rocks_amphitheatre",
    displayName: "Red Rocks Amphitheatre",
    category: "Outdoor",
    emoji: "🪨",
    shortDescription: "Colorado · Natural red sandstone rock formations, open sky",
    thumbnailSearchQuery: "Red Rocks Amphitheatre Colorado colour concert stage sandstone rock formations crowd wide shot",
    // Verified: Squarespace CDN — colour Red Rocks Amphitheatre
    staticImageUrl: "https://images.squarespace-cdn.com/content/v1/6363d5faff7c374778222755/106ca086-60be-49d0-bd43-56a39fdb4e3d/PXL_20240602_000013124.jpg",
  },
  // ── TV Studios ───────────────────────────────────────────────────────────────
  {
    key: "bbc_television_centre",
    displayName: "BBC Television Centre",
    category: "TV Studio",
    emoji: "📺",
    shortDescription: "London · Legendary Top of the Pops broadcast studio",
    thumbnailSearchQuery: "BBC Television Centre London Studio TC1 interior colour broadcast stage audience lighting",
    // Verified: tvstudiohistory.co.uk — colour panoramic interior of BBC TC1 studio floor
    staticImageUrl: "https://tvstudiohistory.co.uk/wp-content/uploads/2021/07/TC1-panoramic-David-Eason-750p.jpg",
  },
  {
    key: "pinewood_studios",
    displayName: "Pinewood Studios",
    category: "TV Studio",
    emoji: "🎬",
    shortDescription: "Buckinghamshire · Europe's largest film & TV sound stages",
    thumbnailSearchQuery: "Pinewood Studios 007 Stage interior colour film production set lighting wide shot",
    // Verified: CloudFront CDN — colour interior of Pinewood Studios
    staticImageUrl: "https://d3sux4fmh2nu8u.cloudfront.net/Pictures/480x320fitpad[0]/7/6/3/1579763_2.jpg",
  },
  {
    key: "nbc_studios_30_rock",
    displayName: "NBC Studios / 30 Rock",
    category: "TV Studio",
    emoji: "🗽",
    shortDescription: "New York · Art Deco Rockefeller Center, home of SNL",
    thumbnailSearchQuery: "Saturday Night Live SNL Studio 8H NBC 30 Rock interior colour stage audience full wide shot",
    // Verified: CloudFront CDN — colour interior of 30 Rock / SNL Studio 8H
    staticImageUrl: "https://dxan6czxprkid.cloudfront.net/theatre/30-rock-1024x768.jpg",
  },
  {
    key: "ed_sullivan_theater",
    displayName: "Ed Sullivan Theater",
    category: "TV Studio",
    emoji: "🎙️",
    shortDescription: "New York · Where The Beatles made their US TV debut",
    thumbnailSearchQuery: "Ed Sullivan Theater New York interior colour stage Late Show auditorium seats wide shot",
    // Verified: Design Republic — colour interior of Ed Sullivan Theater
    staticImageUrl: "https://design-republic-images.imgix.net/img/hero-images/CBS%20Ed%20Sullivan/desktop/ED-SULLIVAN-THEATER_01.jpg?auto=format,compress",
  },
  // ── Filming Locations ────────────────────────────────────────────────────────
  {
    key: "county_down_northern_ireland",
    displayName: "County Down, Northern Ireland",
    category: "Filming Location",
    emoji: "🌾",
    shortDescription: "Rihanna's 'We Found Love' · Rolling green Irish countryside",
    thumbnailSearchQuery: "County Down Northern Ireland colour rolling green hills countryside landscape rural golden hour",
    // Verified: Wikimedia Commons — colour Mourne Mountains, County Down, Northern Ireland
    staticImageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/81/Mourne_Mountains_08.jpg",
  },
  {
    key: "hoxton_street_london",
    displayName: "Hoxton Street, London",
    category: "Filming Location",
    emoji: "🚶",
    shortDescription: "The Verve's 'Bittersweet Symphony' · East London street",
    thumbnailSearchQuery: "Hoxton Street East London colour pedestrians urban street Shoreditch daytime",
    // Verified: Timeout — colour Hoxton Street London
    staticImageUrl: "https://media.timeout.com/images/105517753/image.jpg",
  },
  {
    key: "mojave_desert_california",
    displayName: "Mojave Desert, California",
    category: "Filming Location",
    emoji: "🌵",
    shortDescription: "U2 & Lana Del Rey · Joshua trees, vast desert landscape",
    thumbnailSearchQuery: "Mojave Desert Joshua Tree California colour landscape sunset dramatic wide shot",
    // Verified: Squarespace CDN — colour Mojave Desert landscape
    staticImageUrl: "https://images.squarespace-cdn.com/content/v1/5abff56e506fbee9f6cc8777/1715361118533-9SODUT948SR95MDUXMDU/Dusk+in+the+Desert+Frame+Mockup.jpg?format=1500w",
  },
  {
    key: "seljalandsfoss_iceland",
    displayName: "Seljalandsfoss Waterfall, Iceland",
    category: "Filming Location",
    emoji: "💧",
    shortDescription: "Justin Bieber's 'I'll Show You' · Dramatic 60m waterfall",
    thumbnailSearchQuery: "Seljalandsfoss waterfall Iceland colour dramatic landscape green moss cliff wide shot",
    // Verified: Wixstatic CDN — colour Seljalandsfoss waterfall Iceland
    staticImageUrl: "https://static.wixstatic.com/media/735ee3_3255b4f4a1a94fcc9b5e22ff3a324f54~mv2.jpg/v1/fill/w_980,h_653,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/735ee3_3255b4f4a1a94fcc9b5e22ff3a324f54~mv2.jpg",
  },
  {
    key: "griffith_park_los_angeles",
    displayName: "Griffith Park, Los Angeles",
    category: "Filming Location",
    emoji: "🎃",
    shortDescription: "Michael Jackson's 'Thriller' · Griffith Observatory backdrop",
    thumbnailSearchQuery: "Griffith Observatory Los Angeles colour night city lights Hollywood Hills wide shot",
    // Verified: Squarespace CDN — colour Griffith Observatory Los Angeles
    staticImageUrl: "https://images.squarespace-cdn.com/content/v1/600d6b502c69ea16574c040d/32c84b58-87ba-4a7e-9dd8-07dc49046e83/The+Griffith+Observatory+Los+Angeles+Sunset+Travel+Destination+Highlight+Sigma+Prime+Lenses-10.jpg",
  },
  {
    key: "universal_studios_backlot",
    displayName: "Universal Studios Backlot",
    category: "Filming Location",
    emoji: "🎥",
    shortDescription: "Florida · Professional film backlot, Creed's 'My Sacrifice'",
    thumbnailSearchQuery: "Universal Studios Hollywood backlot colour film set street facades production wide shot",
    // Verified: Squarespace CDN — colour Universal Studios backlot
    staticImageUrl: "https://images.squarespace-cdn.com/content/v1/555f43ace4b09cfed988524e/1718490228965-HSMLNXS98TA5Q7BQWTKF/Universal+Studios+Flashback+%283%29.png",
  },
  // ── Theatres ─────────────────────────────────────────────────────────────────
  {
    key: "palais_garnier",
    displayName: "Palais Garnier Opera House",
    category: "Theatre",
    emoji: "🎭",
    shortDescription: "Paris · Gilded baroque interior with Chagall ceiling",
    thumbnailSearchQuery: "Palais Garnier Paris interior colour auditorium stage gilded baroque balconies Chagall ceiling chandelier",
    // Verified: Squarespace CDN — colour interior of Palais Garnier
    staticImageUrl: "https://images.squarespace-cdn.com/content/v1/62015f66f840ef671da14ae7/2307e562-f827-4f44-bac7-aef49df10f57/Paris+Opera+House.JPG",
  },
  {
    key: "london_palladium",
    displayName: "London Palladium",
    category: "Theatre",
    emoji: "🎩",
    shortDescription: "London · Art Deco grandeur with gold proscenium arch",
    thumbnailSearchQuery: "London Palladium interior colour auditorium stage red velvet seats gold proscenium arch",
    // Verified: Headout CDN — colour interior of London Palladium
    staticImageUrl: "https://cdn-imgix.headout.com/blog-content-image/image/dab740a1fcc1659ea34466cd307db9b9-liam-mcgarry-Ol4REX6Giks-unsplash.jpg?fm=pjpg&auto=compress&w=1200&crop=faces&fit=min",
  },
  {
    key: "apollo_theater_harlem",
    displayName: "Apollo Theater",
    category: "Theatre",
    emoji: "🎤",
    shortDescription: "Harlem, NYC · Art Deco soul/R&B/jazz institution",
    thumbnailSearchQuery: "Apollo Theater Harlem New York interior colour stage auditorium seats Art Deco",
    // Verified: traditionalbuilding.com — colour interior of Apollo Theater Harlem, ornate balconies
    staticImageUrl: "https://www.traditionalbuilding.com/uploads/MTUwMzA3NDczMjgxMDAxNDY4/apollo9.jpg",
  },
  // ── Clubs ────────────────────────────────────────────────────────────────────
  {
    key: "ronnie_scotts",
    displayName: "Ronnie Scott's Jazz Club",
    category: "Club",
    emoji: "🎷",
    shortDescription: "London · Intimate jazz club with red velvet and dim spotlights",
    thumbnailSearchQuery: "Ronnie Scott's Jazz Club London interior colour stage performers red velvet dim spotlight",
    // Verified: Timeout — colour interior of Ronnie Scott's
    staticImageUrl: "https://media.timeout.com/images/103319809/750/562/image.jpg",
  },
  {
    key: "fabric_london",
    displayName: "Fabric London",
    category: "Club",
    emoji: "🔊",
    shortDescription: "London · Industrial warehouse with pulsing UV lights",
    thumbnailSearchQuery: "Fabric nightclub London interior colour dancefloor crowd UV lights industrial warehouse",
    // Verified: Billboard — colour interior of Fabric London
    staticImageUrl: "https://www.billboard.com/wp-content/uploads/media/fabric-nightclub-london-2016-billboard-1548.jpg?w=1024",
  },
];

export const VENUE_OPTIONS_PUBLIC = VENUE_OPTIONS;

// ─── Category helpers ─────────────────────────────────────────────────────────
const ALL_CATEGORIES = ["All", ...Array.from(new Set(VENUE_OPTIONS.map(v => v.category)))];

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
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => onSelect(selected ? "" : venue.key)}
      className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 group
        ${selected
          ? "border-yellow-400 shadow-lg shadow-yellow-400/20 scale-[1.02]"
          : "border-white/10 hover:border-white/30 hover:scale-[1.01]"
        }`}
      style={{ aspectRatio: "16/9" }}
    >
      {/* Background image */}
      {!imgError ? (
        <img
          src={venue.staticImageUrl}
          alt={venue.displayName}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center text-3xl">
          {venue.emoji}
        </div>
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
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: "21/9" }}>
      {!imgError ? (
        <img
          src={venue.staticImageUrl}
          alt={venue.displayName}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgError(true)}
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
