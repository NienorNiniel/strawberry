const { Client } = require("pg");
const crypto = require("crypto");

const DB =
  "postgresql://neondb_owner:npg_v4wD7bNZKhFe@ep-wild-firefly-abuujuq5.eu-west-2.aws.neon.tech/neondb?sslmode=require";

const uid = () => crypto.randomUUID();

// Each entry: { title, url, date, tweets: string[] }
// If tweets.length > 1 it becomes a thread.
const DATA = [
  // ── EUROPE ──────────────────────────────────────────────────────────────
  {
    title: "Germany: Capital Berlin",
    url: "internal://geography/germany-berlin",
    date: "2001-01-01",
    tweets: [
      "Germany's capital is Berlin. Trick: BERlin = BEAr. 'Bär' is German for bear — and a bear has been on Berlin's coat of arms since the 13th century. Picture a bear eating a pretzel at the Brandenburg Gate.",
    ],
  },
  {
    title: "Spain: Capital Madrid",
    url: "internal://geography/spain-madrid",
    date: "2001-01-02",
    tweets: [
      "Spain's capital is Madrid. Trick: spot the word 'madre' (mother) hidden inside it — MADrid. Madrid sits almost exactly at Spain's geographic centre, which is actually why it became the capital in 1561.",
    ],
  },
  {
    title: "Italy: Capital Rome",
    url: "internal://geography/italy-rome",
    date: "2001-01-03",
    tweets: [
      "Italy's capital is Rome — but it wasn't always. Florence and Turin both held the title before Rome was seized in 1870. 'When in Rome' has been a phrase since 390 AD. This is one you know.",
    ],
  },
  {
    title: "Netherlands: Capital Amsterdam",
    url: "internal://geography/netherlands-amsterdam",
    date: "2001-01-04",
    tweets: [
      "The Netherlands' capital is Amsterdam. Trick: AmsterDAM — built on dams. The city was literally constructed on wooden piles over swamp. It has 90 islands, more bridges than Venice, and sinks 1–2 mm per year.",
    ],
  },
  {
    title: "Belgium: Capital Brussels",
    url: "internal://geography/belgium-brussels",
    date: "2001-01-05",
    tweets: [
      "Belgium's capital is Brussels. Trick: Brussels sprouts. The vegetable was cultivated near here in the 13th century and exported via the city. Sprout = Brussels. EU headquarters are also here — double reason to remember it.",
    ],
  },
  {
    title: "Switzerland: Capital Bern",
    url: "internal://geography/switzerland-bern",
    date: "2001-01-06",
    tweets: [
      "Switzerland's capital is Bern — not Zurich. Trick: Bern means 'bear' in old German. The city was allegedly named after the first animal caught in a founding hunt. A live bear has been kept in the city since 1513.",
    ],
  },
  {
    title: "Austria: Capital Vienna",
    url: "internal://geography/austria-vienna",
    date: "2001-01-07",
    tweets: [
      "Austria's capital is Vienna. Trick: you already know it — 'Wiener' is German for 'person from Vienna.' Vienna sausages, wiener schnitzel — all named after this city. You've been saying the capital for years.",
    ],
  },
  {
    title: "Poland: Capital Warsaw",
    url: "internal://geography/poland-warsaw",
    date: "2001-01-08",
    tweets: [
      "Poland's capital is Warsaw. Trick: imagine a WAR with a SAW — Wars-aw. The city was 85% destroyed in WWII. It was rebuilt from scratch using 18th-century paintings as blueprints — that rebuilt city is now a UNESCO World Heritage Site.",
    ],
  },
  {
    title: "Hungary: Capital Budapest",
    url: "internal://geography/hungary-budapest",
    date: "2001-01-09",
    tweets: [
      "Hungary's capital is Budapest. Trick: it's two cities — Buda + Pest. Buda is hilly and historic; Pest is flat and commercial. They only merged in 1873. Picture a BUDget PEST — two problems combined into one city.",
    ],
  },
  {
    title: "Czech Republic: Capital Prague",
    url: "internal://geography/czech-prague",
    date: "2001-01-10",
    tweets: [
      "Czech Republic's capital is Prague (say 'Prahg'). Trick: PRAGUE rhymes with VAGUE — the pronunciation is vaguely how it looks but not quite. The Old Town astronomical clock has been ticking since 1410 and still works.",
    ],
  },
  {
    title: "Greece: Capital Athens",
    url: "internal://geography/greece-athens",
    date: "2001-01-11",
    tweets: [
      "Greece's capital is Athens. Trick: ATHens = ATHletics. Greece invented the Olympics, and Athens hosted the first modern Games in 1896. The Parthenon is 2,500 years old and still standing on the Acropolis above the city.",
    ],
  },
  {
    title: "Sweden: Capital Stockholm",
    url: "internal://geography/sweden-stockholm",
    date: "2001-01-12",
    tweets: [
      "Sweden's capital is Stockholm. Trick: STOCK + HOLM. Legend says the city was founded where a wooden STOCK (log) was floated to choose the site. Stockholm is built across 14 islands connected by 57 bridges.",
    ],
  },
  {
    title: "Denmark: Capital Copenhagen",
    url: "internal://geography/denmark-copenhagen",
    date: "2001-01-13",
    tweets: [
      "Denmark's capital is Copenhagen. Trick: COPE-n-HAVEN — a merchants' HAVEN where traders could COPE with the North Sea. The Danish name Kjøbenhavn literally means 'merchants' harbour.' It's been the capital for 600 years.",
    ],
  },
  {
    title: "Finland: Capital Helsinki",
    url: "internal://geography/finland-helsinki",
    date: "2001-01-14",
    tweets: [
      "Finland's capital is Helsinki. Trick: HELL-SINKY — like hell sinking into frozen ground. With -20°C winters, that earns it. Helsinki is the most northerly capital in the EU and was part of Russia for 108 years before Finnish independence.",
    ],
  },
  {
    title: "Iceland: Capital Reykjavik",
    url: "internal://geography/iceland-reykjavik",
    date: "2001-01-15",
    tweets: [
      "Iceland's capital is Reykjavik — the world's northernmost capital. Trick: REYK = REEK. The name means 'Smoky Bay' — early settlers saw geothermal steam rising from the ground and thought the land was smoking. It still smells of sulphur.",
    ],
  },
  {
    title: "Turkey: Capital Ankara",
    url: "internal://geography/turkey-ankara",
    date: "2001-01-16",
    tweets: [
      "Turkey's capital is Ankara — not Istanbul. Trick: ANKARa = ANCHOR. Istanbul is bigger and more famous, but Atatürk deliberately chose the inland Ankara as capital in 1923 to break with the Ottoman past. Istanbul felt too European.",
    ],
  },
  {
    title: "Portugal: Capital Lisbon",
    url: "internal://geography/portugal-lisbon",
    date: "2001-01-17",
    tweets: [
      "Portugal's capital is Lisbon. Trick: LIS-BON — 'this is bon' (good in French). Or: Lisbon is built on seven hills, like Rome — another good reason both cities are worth remembering. It's the westernmost capital in continental Europe.",
    ],
  },
  {
    title: "Romania: Capital Bucharest",
    url: "internal://geography/romania-bucharest",
    date: "2001-01-18",
    tweets: [
      "Romania's capital is Bucharest. Trick: BOO-ka-REST — like something scary taking a rest. Bucharest was once called 'the Paris of the East' for its architecture. Nicolae Ceaușescu then demolished a quarter of the old city to build a giant palace.",
    ],
  },

  // ── AMERICAS ────────────────────────────────────────────────────────────
  {
    title: "Canada: Capital Ottawa",
    url: "internal://geography/canada-ottawa",
    date: "2001-02-01",
    tweets: [
      "Canada's capital is Ottawa — not Toronto or Montreal. Trick: OTTawa = OTTer — picture an otter paddling down the Ottawa River in a maple-leaf canoe. Queen Victoria chose it in 1857 partly because it was less vulnerable to US invasion than the larger cities.",
    ],
  },
  {
    title: "Brazil: Capital Brasília",
    url: "internal://geography/brazil-brasilia",
    date: "2001-02-02",
    tweets: [
      "Brazil's capital is Brasília — not Rio de Janeiro. Trick: Bra-SIL-ia contains BRAZIL. It was purpose-built from scratch in 1960 and designed from the air to look like an airplane. Rio was the capital for 200 years before. Never assume the big city is the capital.",
    ],
  },
  {
    title: "Argentina: Capital Buenos Aires",
    url: "internal://geography/argentina-buenos-aires",
    date: "2001-02-03",
    tweets: [
      "Argentina's capital is Buenos Aires. Trick: it means 'good airs' or 'fair winds' in Spanish — named by sailors relieved to finally smell land after crossing the Atlantic. It's the largest Spanish-speaking city in the southern hemisphere.",
    ],
  },
  {
    title: "Peru: Capital Lima",
    url: "internal://geography/peru-lima",
    date: "2001-02-04",
    tweets: [
      "Peru's capital is Lima. Trick: LIMA bean. The lima bean is named after the city — it was cultivated in Peru for 9,000 years before Europeans arrived. Lima is now home to over a third of Peru's entire population.",
    ],
  },
  {
    title: "Chile: Capital Santiago",
    url: "internal://geography/chile-santiago",
    date: "2001-02-05",
    tweets: [
      "Chile's capital is Santiago. Trick: SAINT-iago — Santiago is Spanish for Saint James. Chile is the world's longest and thinnest country: 4,300km from top to bottom, average 177km wide. Santiago sits in a valley flanked by the Andes.",
    ],
  },
  {
    title: "Colombia: Capital Bogotá",
    url: "internal://geography/colombia-bogota",
    date: "2001-02-06",
    tweets: [
      "Colombia's capital is Bogotá. Trick: bo-GO-TA — GO TO Bogotá. At 2,640 metres above sea level, it's one of the world's highest capitals. Visitors often need a full day to acclimatise before they can walk up stairs without panting.",
    ],
  },
  {
    title: "Cuba: Capital Havana",
    url: "internal://geography/cuba-havana",
    date: "2001-02-07",
    tweets: [
      "Cuba's capital is Havana. Trick: HAVE-ana cigar. Havana cigars are the world's most famous export. Classic 1950s American cars still cruise the streets because the US trade embargo froze car imports for 60 years.",
    ],
  },
  {
    title: "Mexico: Capital Mexico City",
    url: "internal://geography/mexico-mexico-city",
    date: "2001-02-08",
    tweets: [
      "Mexico's capital is Mexico City — easy, it shares the country's name. Built on top of the Aztec capital Tenochtitlán, which sat on a lake. The city still sinks up to 50cm per year as the old lake bed compresses beneath it.",
    ],
  },
  {
    title: "Bolivia: Two Capitals — Sucre and La Paz",
    url: "internal://geography/bolivia-two-capitals",
    date: "2001-02-09",
    tweets: [
      "Bolivia has TWO capitals: Sucre (constitutional) and La Paz (seat of government). This resulted from a civil war in 1899 that split power between two cities — and Bolivia has never fully resolved it since.",
      "La Paz is the world's highest seat of government at 3,640m above sea level. Foreign diplomats often arrive dizzy and short of breath. The city is so high that bakers must adjust their recipes — bread rises differently at altitude.",
    ],
  },
  {
    title: "Australia: Capital Canberra",
    url: "internal://geography/australia-canberra",
    date: "2001-02-10",
    tweets: [
      "Australia's capital is Canberra — not Sydney. Trick: CAN-BERRA — you CAN BEAR-A the distance. Sydney and Melbourne both wanted to be capital, so in 1908 they built a new city between them as a compromise. It opened in 1927.",
    ],
  },

  // ── AFRICA ──────────────────────────────────────────────────────────────
  {
    title: "Egypt: Capital Cairo",
    url: "internal://geography/egypt-cairo",
    date: "2001-03-01",
    tweets: [
      "Egypt's capital is Cairo — Africa's largest city. Trick: KY-ro sounds like GYRO (the Greek word for 'turn'). Cairo sits at the top of the Nile delta where the river fans out. The Giza Pyramids are visible from Cairo's suburbs.",
    ],
  },
  {
    title: "Nigeria: Capital Abuja",
    url: "internal://geography/nigeria-abuja",
    date: "2001-03-02",
    tweets: [
      "Nigeria's capital is Abuja — not Lagos. Trick: A-BOO-ja — something goes 'BOO.' Lagos was too coastal and chaotic, so Nigeria purpose-built a central neutral capital and moved there in 1991. Lagos is still 10 times bigger. Never assume the biggest city is the capital.",
    ],
  },
  {
    title: "South Africa: Three Capitals",
    url: "internal://geography/south-africa-capitals",
    date: "2001-03-03",
    tweets: [
      "South Africa has THREE capitals: Pretoria (executive), Cape Town (legislative), Bloemfontein (judicial). Trick: Pre-Cape-Bloom — like a flower blooming from a cape near the capital.",
      "South Africa's three-capital arrangement is a legacy of the 1910 Union. The Transvaal, Cape Colony, and Orange Free State each demanded a piece of the capital. The compromise has lasted over 100 years. No one has ever quite agreed on how to fix it.",
    ],
  },
  {
    title: "Kenya: Capital Nairobi",
    url: "internal://geography/kenya-nairobi",
    date: "2001-03-04",
    tweets: [
      "Kenya's capital is Nairobi. Trick: Nai-ROB-i — someone's ROBbing you (unfair, but memorable). The name actually means 'cool waters' in Maasai. Nairobi National Park is the only wildlife reserve located inside a major capital city — lions visible from office buildings.",
    ],
  },
  {
    title: "Morocco: Capital Rabat",
    url: "internal://geography/morocco-rabat",
    date: "2001-03-05",
    tweets: [
      "Morocco's capital is Rabat — not Casablanca. Trick: RABat = RABbit. Picture a rabbit in a fez. Casablanca is 10× bigger and far more famous, but Rabat has been the capital since 1912. The Humphrey Bogart film doesn't help anyone remember this.",
    ],
  },
  {
    title: "Ethiopia: Capital Addis Ababa",
    url: "internal://geography/ethiopia-addis-ababa",
    date: "2001-03-06",
    tweets: [
      "Ethiopia's capital is Addis Ababa. Trick: ADD-is AB-aba — add two abs for your workout. The name means 'new flower' in Amharic. At 2,355m, it's Africa's highest capital and home to the African Union — the continent's UN equivalent.",
    ],
  },
  {
    title: "Tanzania: Capital Dodoma",
    url: "internal://geography/tanzania-dodoma",
    date: "2001-03-07",
    tweets: [
      "Tanzania's capital is Dodoma — not Dar es Salaam. Trick: DO-DO-ma — like a confused dodo. Tanzania officially moved its capital inland in 1974, but the move still isn't fully complete 50 years later. Most embassies stayed in Dar es Salaam.",
    ],
  },
  {
    title: "Ghana: Capital Accra",
    url: "internal://geography/ghana-accra",
    date: "2001-03-08",
    tweets: [
      "Ghana's capital is Accra. Trick: ACCRA sounds like ACRE — a field you'd plant. Ghana was the first sub-Saharan African country to gain independence from Britain in 1957. The Greenwich Meridian (0° longitude) passes directly through Accra.",
    ],
  },
  {
    title: "Senegal: Capital Dakar",
    url: "internal://geography/senegal-dakar",
    date: "2001-03-09",
    tweets: [
      "Senegal's capital is Dakar. Trick: da-CAR — the famous Dakar Rally race was named after this city (it started and ended here until 2007). Dakar sits on the westernmost tip of mainland Africa — the closest point of Africa to South America.",
    ],
  },
  {
    title: "Algeria: Capital Algiers",
    url: "internal://geography/algeria-algiers",
    date: "2001-03-10",
    tweets: [
      "Algeria's capital is Algiers. Trick: ALGERia → ALGERs — the country and its capital share the same root word. Algiers sits on a horseshoe bay on the Mediterranean and has been continuously inhabited since 944 AD.",
    ],
  },

  // ── ASIA ────────────────────────────────────────────────────────────────
  {
    title: "Japan: Capital Tokyo",
    url: "internal://geography/japan-tokyo",
    date: "2001-04-01",
    tweets: [
      "Japan's capital is Tokyo — not Kyoto. Trick: TOKYO and KYOTO share the exact same letters (T, O, K, Y, O) — they're anagrams of each other. Kyoto was Japan's imperial capital for over 1,000 years. Tokyo replaced it in 1869 when the Emperor moved east.",
    ],
  },
  {
    title: "China: Capital Beijing",
    url: "internal://geography/china-beijing",
    date: "2001-04-02",
    tweets: [
      "China's capital is Beijing — not Shanghai. Trick: BEI-JING sounds like a BELL JING-ling. Beijing means 'Northern Capital.' Shanghai (meaning 'above the sea') is richer and bigger, but Beijing has been the political centre for 700 years.",
    ],
  },
  {
    title: "India: Capital New Delhi",
    url: "internal://geography/india-new-delhi",
    date: "2001-04-03",
    tweets: [
      "India's capital is New Delhi — not Mumbai or Kolkata. Trick: NEW DELHI = a new deli sandwich. The British built New Delhi from scratch between 1911 and 1931 to replace Calcutta as the colonial capital. It opened in 1931; India gained independence 16 years later.",
    ],
  },
  {
    title: "South Korea: Capital Seoul",
    url: "internal://geography/south-korea-seoul",
    date: "2001-04-04",
    tweets: [
      "South Korea's capital is Seoul. Trick: SEOUL = SOUL — put your soul into remembering it. Seoul has been the capital for over 600 years since the Joseon Dynasty. Its metro area holds 25 million people — more than half of South Korea's entire population.",
    ],
  },
  {
    title: "Thailand: Capital Bangkok",
    url: "internal://geography/thailand-bangkok",
    date: "2001-04-05",
    tweets: [
      "Thailand's capital is Bangkok — but Thais don't call it that. The official ceremonial name is 168 characters long and holds the Guinness World Record for longest place name on Earth. Locals call it Krung Thep, meaning 'City of Angels.'",
    ],
  },
  {
    title: "Vietnam: Capital Hanoi",
    url: "internal://geography/vietnam-hanoi",
    date: "2001-04-06",
    tweets: [
      "Vietnam's capital is Hanoi — not Ho Chi Minh City (Saigon). Trick: Ha-NOI — a NOIsy city. Hanoi is in the north; Ho Chi Minh City is in the south. Despite losing the Vietnam War, the US-backed south's largest city became Vietnam's commercial centre.",
    ],
  },
  {
    title: "Indonesia: Capital Jakarta (soon: Nusantara)",
    url: "internal://geography/indonesia-jakarta",
    date: "2001-04-07",
    tweets: [
      "Indonesia's capital is Jakarta — but it's being replaced. The government is building 'Nusantara' on Borneo because Jakarta is sinking into the Java Sea (up to 25cm per year) and regularly floods. It may be the first capital city abandoned specifically due to climate change.",
    ],
  },
  {
    title: "Pakistan: Capital Islamabad",
    url: "internal://geography/pakistan-islamabad",
    date: "2001-04-08",
    tweets: [
      "Pakistan's capital is Islamabad — not Karachi or Lahore. Trick: ISLAM-ABAD — the city of Islam. Like Brazil and Australia, Pakistan purpose-built its capital from scratch (completed 1961) to be geographically central. Karachi had been the original capital.",
    ],
  },
  {
    title: "Iran: Capital Tehran",
    url: "internal://geography/iran-tehran",
    date: "2001-04-09",
    tweets: [
      "Iran's capital is Tehran. Trick: Teh-RAN — it RAN to become the capital. Tehran only rose to prominence in 1796 — Isfahan and Tabriz both held the title for centuries before. At 15 million people, Tehran is one of the world's 20 largest cities.",
    ],
  },
  {
    title: "Saudi Arabia: Capital Riyadh",
    url: "internal://geography/saudi-riyadh",
    date: "2001-04-10",
    tweets: [
      "Saudi Arabia's capital is Riyadh. Trick: Ri-YAD — think of a YARD in the desert. The name means 'the gardens' in Arabic — ironic for a desert city, but the area was once an oasis. It grew from 150,000 people in 1960 to over 7 million today.",
    ],
  },
  {
    title: "Kazakhstan: Capital Astana",
    url: "internal://geography/kazakhstan-astana",
    date: "2001-04-11",
    tweets: [
      "Kazakhstan's capital is Astana — and it's been renamed twice. The country moved its capital from Almaty to the new city of Astana in 1997, renamed it Nur-Sultan after the president in 2019, then changed it back to Astana in 2022 after he fell from power.",
    ],
  },
  {
    title: "Myanmar: Capital Naypyidaw",
    url: "internal://geography/myanmar-naypyidaw",
    date: "2001-04-12",
    tweets: [
      "Myanmar's capital is Naypyidaw — almost nobody knows this one. The military junta secretly moved the capital from Yangon in 2005 with almost no public explanation. The purpose-built city has an 8-lane motorway with virtually no traffic and a population of 1 million in a country of 55 million.",
    ],
  },
  {
    title: "Israel and Palestine: Jerusalem",
    url: "internal://geography/israel-jerusalem",
    date: "2001-04-13",
    tweets: [
      "Israel's declared capital is Jerusalem, though most countries don't recognise this — the UK, EU and most of the world keep embassies in Tel Aviv. Jerusalem is simultaneously claimed by Israel and Palestine and contains the holiest sites in Judaism, Christianity, and Islam.",
    ],
  },

  // ── OCEANIA ─────────────────────────────────────────────────────────────
  {
    title: "New Zealand: Capital Wellington",
    url: "internal://geography/new-zealand-wellington",
    date: "2001-05-01",
    tweets: [
      "New Zealand's capital is Wellington — not Auckland. Trick: WELL-ing-TON — a wellington boot on a well. Auckland is larger and more famous but Wellington was chosen in 1865 because it's more central on the North Island. It's also the world's southernmost national capital.",
    ],
  },
  {
    title: "Papua New Guinea: Capital Port Moresby",
    url: "internal://geography/png-port-moresby",
    date: "2001-05-02",
    tweets: [
      "Papua New Guinea's capital is Port Moresby. Trick: MORE-sby — there's always MORE to learn. PNG is one of the world's most linguistically diverse countries: 848 languages are spoken among 10 million people — roughly 12% of all human languages on Earth.",
    ],
  },
  {
    title: "Fiji: Capital Suva",
    url: "internal://geography/fiji-suva",
    date: "2001-05-03",
    tweets: [
      "Fiji's capital is Suva. Trick: SOO-va — like a souvenir from a Pacific island. Suva is one of the Pacific's largest cities, sits on the wetter southeast coast of Viti Levu, and receives 3,000mm of rain per year. Bring a waterproof souvenir.",
    ],
  },
];

async function main() {
  const client = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Create Geography source
  const sourceId = uid();
  await client.query(
    `INSERT INTO "Source" (id, url, name, type, "feedUrl", "iconUrl", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (url) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [
      sourceId,
      "internal://geography",
      "Geography & Capitals",
      "RSS",
      "internal://geography",
      "https://www.google.com/s2/favicons?domain=britannica.com&sz=64",
    ]
  );

  // Re-fetch the real source id in case of conflict
  const { rows: srcRows } = await client.query(
    `SELECT id FROM "Source" WHERE url = 'internal://geography'`
  );
  const realSourceId = srcRows[0].id;

  let articleCount = 0;
  let tweetCount = 0;

  for (const entry of DATA) {
    // Insert article
    const articleId = uid();
    const { rows: artRows } = await client.query(
      `INSERT INTO "Article" (id, "sourceId", url, title, content, "publishedAt", "fetchedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (url) DO NOTHING
       RETURNING id`,
      [
        articleId,
        realSourceId,
        entry.url,
        entry.title,
        "",
        new Date(entry.date),
      ]
    );
    if (artRows.length === 0) {
      console.log(`Skipped (already exists): ${entry.title}`);
      continue;
    }
    const realArticleId = artRows[0].id;
    articleCount++;

    if (entry.tweets.length === 1) {
      // Standalone tweet
      await client.query(
        `INSERT INTO "Tweet" (id, "articleId", content, "threadId", "threadOrder", "createdAt")
         VALUES ($1, $2, $3, NULL, 0, NOW())`,
        [uid(), realArticleId, entry.tweets[0]]
      );
      tweetCount++;
    } else {
      // Thread
      const threadId = uid();
      for (let i = 0; i < entry.tweets.length; i++) {
        await client.query(
          `INSERT INTO "Tweet" (id, "articleId", content, "threadId", "threadOrder", "createdAt")
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [uid(), realArticleId, entry.tweets[i], threadId, i]
        );
        tweetCount++;
      }
    }
  }

  await client.end();
  console.log(`Done! Inserted ${articleCount} articles and ${tweetCount} tweets.`);
}

main().catch(console.error);
