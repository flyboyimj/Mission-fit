// Scripture for Mission Fit. King James Version (public domain in the US).
// Each verse is tagged with the training moments it fits.

export type VerseTheme =
  | 'strength'   // lifting, power
  | 'endurance'  // running, intervals, steady cardio, long efforts
  | 'fight'      // boxing
  | 'soldier'    // military structure, discipline, circuits
  | 'discipline' // consistency, self-control, training the body
  | 'rest'       // rest days, recovery, sleep
  | 'renewal'    // low energy, setbacks, starting again
  | 'body'       // stewardship of the body
  | 'finish';    // completing the mission

export interface Verse {
  ref: string;
  text: string;
  themes: VerseTheme[];
}

export const VERSES: Verse[] = [
  { ref: 'Isaiah 40:31', themes: ['endurance', 'renewal', 'strength'], text: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.' },
  { ref: 'Isaiah 40:29', themes: ['renewal', 'strength'], text: 'He giveth power to the faint; and to them that have no might he increaseth strength.' },
  { ref: 'Isaiah 41:10', themes: ['strength', 'renewal'], text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.' },
  { ref: 'Philippians 4:13', themes: ['strength'], text: 'I can do all things through Christ which strengtheneth me.' },
  { ref: 'Psalm 18:32', themes: ['strength', 'discipline'], text: 'It is God that girdeth me with strength, and maketh my way perfect.' },
  { ref: 'Psalm 28:7', themes: ['strength'], text: 'The LORD is my strength and my shield; my heart trusted in him, and I am helped.' },
  { ref: 'Psalm 46:1', themes: ['strength', 'renewal'], text: 'God is our refuge and strength, a very present help in trouble.' },
  { ref: 'Psalm 73:26', themes: ['renewal', 'body'], text: 'My flesh and my heart faileth: but God is the strength of my heart, and my portion for ever.' },
  { ref: 'Nehemiah 8:10', themes: ['strength', 'finish'], text: 'The joy of the LORD is your strength.' },
  { ref: 'Ephesians 6:10', themes: ['strength', 'soldier'], text: 'Finally, my brethren, be strong in the Lord, and in the power of his might.' },
  { ref: 'Ephesians 6:11', themes: ['soldier', 'fight'], text: 'Put on the whole armour of God, that ye may be able to stand against the wiles of the devil.' },
  { ref: '2 Corinthians 12:9', themes: ['renewal', 'strength'], text: 'My grace is sufficient for thee: for my strength is made perfect in weakness.' },

  { ref: '1 Corinthians 9:24', themes: ['endurance', 'discipline'], text: 'Know ye not that they which run in a race run all, but one receiveth the prize? So run, that ye may obtain.' },
  { ref: '1 Corinthians 9:25', themes: ['discipline', 'body'], text: 'And every man that striveth for the mastery is temperate in all things. Now they do it to obtain a corruptible crown; but we an incorruptible.' },
  { ref: '1 Corinthians 9:26', themes: ['fight', 'discipline'], text: 'I therefore so run, not as uncertainly; so fight I, not as one that beateth the air.' },
  { ref: '1 Corinthians 9:27', themes: ['discipline', 'body'], text: 'But I keep under my body, and bring it into subjection.' },
  { ref: 'Hebrews 12:1', themes: ['endurance'], text: 'Let us lay aside every weight, and the sin which doth so easily beset us, and let us run with patience the race that is set before us.' },
  { ref: 'Hebrews 12:11', themes: ['discipline', 'endurance'], text: 'Now no chastening for the present seemeth to be joyous, but grievous: nevertheless afterward it yieldeth the peaceable fruit of righteousness unto them which are exercised thereby.' },
  { ref: 'Hebrews 12:12', themes: ['renewal', 'strength'], text: 'Wherefore lift up the hands which hang down, and the feeble knees.' },
  { ref: 'Galatians 6:9', themes: ['endurance', 'finish', 'discipline'], text: 'And let us not be weary in well doing: for in due season we shall reap, if we faint not.' },
  { ref: 'Romans 5:3–4', themes: ['endurance', 'discipline'], text: 'We glory in tribulations also: knowing that tribulation worketh patience; and patience, experience; and experience, hope.' },
  { ref: 'Colossians 3:23', themes: ['discipline', 'strength'], text: 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men.' },
  { ref: 'Ecclesiastes 9:10', themes: ['strength', 'discipline'], text: 'Whatsoever thy hand findeth to do, do it with thy might.' },
  { ref: 'Proverbs 16:3', themes: ['discipline'], text: 'Commit thy works unto the LORD, and thy thoughts shall be established.' },
  { ref: 'Proverbs 24:16', themes: ['renewal', 'endurance'], text: 'For a just man falleth seven times, and riseth up again.' },

  { ref: 'Psalm 144:1', themes: ['fight', 'strength'], text: 'Blessed be the LORD my strength, which teacheth my hands to war, and my fingers to fight.' },
  { ref: 'Psalm 18:34', themes: ['fight', 'strength'], text: 'He teacheth my hands to war, so that a bow of steel is broken by mine arms.' },
  { ref: '2 Timothy 2:3', themes: ['soldier', 'endurance'], text: 'Thou therefore endure hardness, as a good soldier of Jesus Christ.' },
  { ref: '1 Corinthians 16:13', themes: ['soldier', 'strength'], text: 'Watch ye, stand fast in the faith, quit you like men, be strong.' },
  { ref: 'Joshua 1:9', themes: ['soldier', 'strength'], text: 'Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.' },
  { ref: 'Deuteronomy 31:6', themes: ['soldier', 'renewal'], text: 'Be strong and of a good courage, fear not: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee.' },
  { ref: '2 Timothy 4:7', themes: ['finish', 'fight', 'endurance'], text: 'I have fought a good fight, I have finished my course, I have kept the faith.' },

  { ref: '1 Corinthians 6:19–20', themes: ['body'], text: 'Know ye not that your body is the temple of the Holy Ghost which is in you? For ye are bought with a price: therefore glorify God in your body.' },
  { ref: '1 Corinthians 10:31', themes: ['body', 'discipline'], text: 'Whether therefore ye eat, or drink, or whatsoever ye do, do all to the glory of God.' },
  { ref: '1 Timothy 4:8', themes: ['body', 'discipline'], text: 'For bodily exercise profiteth little: but godliness is profitable unto all things, having promise of the life that now is, and of that which is to come.' },

  { ref: 'Matthew 11:28', themes: ['rest'], text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.' },
  { ref: 'Mark 6:31', themes: ['rest'], text: 'Come ye yourselves apart into a desert place, and rest a while.' },
  { ref: 'Exodus 33:14', themes: ['rest'], text: 'My presence shall go with thee, and I will give thee rest.' },
  { ref: 'Psalm 23:2–3', themes: ['rest', 'renewal'], text: 'He maketh me to lie down in green pastures: he leadeth me beside the still waters. He restoreth my soul.' },
  { ref: 'Psalm 4:8', themes: ['rest'], text: 'I will both lay me down in peace, and sleep: for thou, LORD, only makest me dwell in safety.' },
  { ref: 'Psalm 127:2', themes: ['rest'], text: 'For so he giveth his beloved sleep.' },
  { ref: 'Lamentations 3:22–23', themes: ['renewal', 'rest'], text: "It is of the LORD's mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness." },
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Deterministic pick: the same key always shows the same verse (no flicker on re-render). */
export function pickVerse(themes: VerseTheme[], key: string): Verse {
  const pool = VERSES.filter((v) => v.themes.some((t) => themes.includes(t)));
  const list = pool.length ? pool : VERSES;
  return list[hash(key) % list.length];
}

/** Themes that fit a workout style (style names mirror the generator's). */
export function themesForStyle(style: string, opts: { lowReadiness?: boolean } = {}): VerseTheme[] {
  if (opts.lowReadiness) return ['renewal'];
  switch (style) {
    case 'boxing': return ['fight'];
    case 'hiit': case 'steady': return ['endurance'];
    case 'circuit': return ['soldier', 'discipline'];
    case 'recovery': return ['rest', 'renewal'];
    case 'strength': return ['strength', 'discipline'];
    case 'strength-cond': return ['strength', 'endurance'];
    default: return ['strength', 'discipline'];
  }
}
