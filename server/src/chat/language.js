// Guess the language of a chat message, so the model gets an explicit instruction instead of being left to
// "mirror" it: lighter models tend to answer Hinglish in English.

const HINGLISH = new Set((
  'hai hain hoon ho hota hoti hoga kya kyun kyu kaun kaise kab kahan kidhar mujhe mera meri mere humein hamein tum tumhe aap aapko ' +
  'yaar bhai batao bata bataiye bataao dekhna dekho dekhne dikhao dikha achha acha accha achhi achi achhe kuch koi nahi nhi kal aaj ' +
  'wala wali wale mein mai main par pe se ko ka ke ki liye lagta lagti chahiye chahta chahti thoda thodi bahut mast badiya sahi karo kar ' +
  'sakta sakte sakti layak abhi phir toh bas sirf bilkul zyada jyada jaisa jaise aisa aisi kitna kitni suno batana'
).split(' '));
// Words that also exist in English or are too short to be a signal on their own.
const AMBIGUOUS = new Set(['main', 'par', 'se', 'ko', 'ka', 'ke', 'ki', 'ho', 'mai', 'pe', 'bas', 'kar', 'sahi', 'tum', 'bhai']);

/** @returns {'hi' | 'hinglish' | 'en'} */
export function detectLang(message) {
  if (/[\u0900-\u097F]/.test(message)) return 'hi';
  const words = message.toLowerCase().match(/[a-z]+/g) || [];
  const strong = words.filter((w) => HINGLISH.has(w) && !AMBIGUOUS.has(w)).length;
  const weak = words.filter((w) => AMBIGUOUS.has(w) && HINGLISH.has(w)).length;
  return strong >= 1 || weak >= 3 ? 'hinglish' : 'en';
}
