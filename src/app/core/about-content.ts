/** The About Us page, as edited in Configuration → About us page and stored by the API as one document. */
export interface AboutContent {
  title: string;
  motto: string;
  /** Small line under the motto, e.g. recognition and founding date. */
  tagline: string;
  intro: string;
  timeline: { year: string; text: string }[];
  /** Body text: a blank line starts a new paragraph, lines starting with "- " are bullet points. */
  sections: { heading: string; body: string }[];
  address: string;
  email: string;
  instagram: string;
}

/** A piece of section text: a paragraph, or a run of bullet points. */
export type AboutBlock = { kind: 'p'; text: string } | { kind: 'ul'; items: string[] };

/** Shown until staff save their own version (and whenever the server can't be reached). */
export const DEFAULT_ABOUT: AboutContent = {
  title: 'राहुल सार्वजनिक वाचनालय, शिंदेवाडी',
  motto: '"वाचाल तर वाचाल"',
  tagline: "शासनमान्य इतर 'ब' वर्ग वाचनालय · स्थापना २८ ऑक्टोबर १९९४",
  intro: 'शिंदेवाडी (ता. माढा, जि. सोलापूर) या छोट्या गावात वाचन संस्कृती रुजवण्यासाठी ग्रंथमित्र कांतीलाल दत्तू साळुंके '
    + 'यांनी गावातील सहकाऱ्यांच्या मदतीने हे वाचनालय सुरू केले. एका छोट्या व्यापारी गाळ्यात सुरू झालेले हे वाचनालय '
    + 'आज गावाचे ज्ञानकेंद्र बनले आहे. गावातील तिसरी पिढी आज इथे वाचन करत आहे.',
  timeline: [
    { year: '१९९४', text: 'वाचनालयाची स्थापना' },
    { year: '१९९५–९६', text: "'ड' वर्ग शासनमान्यता" },
    { year: '२००२–०३', text: "'क' वर्ग शासनमान्यता" },
    { year: '२००५', text: 'आमदार बबनराव शिंदे यांच्या स्थानिक विकास निधीतून नवीन इमारत' },
    { year: '२००६–०७', text: "'ब' वर्ग शासनमान्यता" },
    { year: '२०२०', text: 'रौप्य महोत्सव – २५ वर्षांची वाटचाल' },
  ],
  sections: [
    {
      heading: 'वाचनालयात काय आहे',
      body: [
        '- सुमारे १०,४०० ग्रंथांचा संग्रह',
        '- दररोज ८ दैनिके आणि २६ नियतकालिके',
        '- स्वतंत्र महिला व बाल विभाग आणि संदर्भ विभाग',
        '- १९९५ पासूनच्या ५२ कात्रण वह्या',
        '- दुर्मिळ ठेवा: तळहातापेक्षा लहान कुराण शरीफची प्रत आणि १७१५ सालचे पर्शियन भाषेतील वाल्मिकी रामायणाचे तीन खंड',
        '- झेरॉक्स सुविधा आणि सुसज्ज इमारत',
      ].join('\n'),
    },
    {
      heading: 'आमचे उपक्रम',
      body: 'ग्रंथप्रदर्शन, व्याख्याने, जादूचे प्रयोग, गुणवंत विद्यार्थ्यांचा सत्कार, महिला दिन, वाचन प्रेरणा दिन आणि शाळा दत्तक '
        + 'योजना असे उपक्रम दरवर्षी राबवले जातात. २०१५ पासून वाचनालय विविध क्षेत्रांतील मान्यवरांना "कर्मवीर आमदार '
        + 'बबनराव शिंदे राज्यस्तरीय प्रेरणा पुरस्कार" प्रदान करते.',
    },
    {
      heading: 'सन्मान',
      body: [
        "- आदर्श वाचनालय पुरस्कार – १९९८ ('ड' वर्ग) आणि २०११ ('ब' वर्ग)",
        '- राज्यस्तरीय प्रतिभा-संग्राम पंढरी गौरव पुरस्कार – २०१८',
        '- संस्थापक अध्यक्षांना महाराष्ट्र शासनाचा राज्यस्तरीय ग्रंथमित्र पुरस्कार (२०१७–१८)',
      ].join('\n'),
    },
  ],
  address: 'राहुल सार्वजनिक वाचनालय\nमु. शिंदेवाडी, पो. सापटणे (भो), ता. माढा,\nजि. सोलापूर – ४१३ २०८',
  email: 'rahul.library@gmail.com',
  instagram: 'https://www.instagram.com/rahul_public_library',
};

/** Saved content with any missing field taken from the default, so a partial document still shows a full page. */
export function withDefaults(saved: Partial<AboutContent> | null | undefined): AboutContent {
  return { ...DEFAULT_ABOUT, ...(saved ?? {}) };
}

/** Splits section text into paragraphs (at blank lines) and bullet lists (lines starting with "- "). */
export function aboutBlocks(body: string): AboutBlock[] {
  const result: AboutBlock[] = [];
  let paragraph: string[] = [];
  const endParagraph = () => {
    if (paragraph.length) {
      result.push({ kind: 'p', text: paragraph.join(' ') });
      paragraph = [];
    }
  };
  for (const raw of (body ?? '').split('\n')) {
    const line = raw.trim();
    const bullet = /^[-•]\s+(.*)$/.exec(line);
    if (bullet) {
      endParagraph();
      const last = result[result.length - 1];
      if (last?.kind === 'ul') {
        last.items.push(bullet[1]);
      } else {
        result.push({ kind: 'ul', items: [bullet[1]] });
      }
    } else if (line) {
      paragraph.push(line);
    } else {
      endParagraph();
    }
  }
  endParagraph();
  return result;
}

/** "rahul_public_library" from an Instagram profile link. */
export function instagramHandle(url: string): string {
  return url.replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop() || url;
}
