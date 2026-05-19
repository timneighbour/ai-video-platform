import 'dotenv/config';

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, '');
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

const res = await fetch(`${FORGE_URL}/v1/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${FORGE_KEY}`,
  },
  body: JSON.stringify({
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'file_url',
            file_url: {
              url: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/zuxBNfJavvAcvKRy.mp3',
              mime_type: 'audio/mpeg',
            },
          },
          {
            type: 'text',
            text: `Analyse this song carefully and provide:
1. INSTRUMENTATION: List every instrument you can hear (be specific - e.g. "grand piano", "string quartet", "acoustic guitar", "orchestral strings", "brass section", etc.)
2. SONG STRUCTURE: Break the song into sections with approximate timestamps (e.g. intro 0-8s, verse 1 8-24s, chorus 24-40s, etc.)
3. MOOD/TEMPO: Describe the overall feel, tempo, energy level
4. VOCAL STYLE: Describe the lead vocal (gender, style, range)
5. KEY LYRICAL PHRASES: Note any lyrics you can make out

Be precise about instrumentation - this will be used to direct a music video and we must ONLY show instruments that are actually in the track.`,
          },
        ],
      },
    ],
  }),
});

if (!res.ok) {
  const text = await res.text();
  console.error('Error:', res.status, text.slice(0, 500));
  process.exit(1);
}

const data = await res.json();
console.log(data.choices?.[0]?.message?.content ?? JSON.stringify(data, null, 2));
