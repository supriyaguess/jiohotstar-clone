import { BOT_NAME } from './persona.js';

// Greetings, thanks, goodbyes and "who are you" need no model at all. Answering them locally is instant, costs
// no Gemini quota, and keeps "hello" from waiting on a slow or exhausted model.

const REPLIES = {
  greet: {
    en: `Hi! I'm ${BOT_NAME}, your movie and show buddy. Ask me for a recommendation, details about a title, or today's matches.`,
    hinglish: `Namaste! Main ${BOT_NAME} hoon, aapka movie aur show buddy. Mujhse recommendation, kisi title ki details ya aaj ke matches pooch sakte ho.`,
    hi: `नमस्ते! मैं ${BOT_NAME} हूँ, आपका फ़िल्म और शो का साथी। मुझसे सिफ़ारिश, किसी फ़िल्म की जानकारी या आज के मैच पूछिए।`,
  },
  thanks: {
    en: "You're welcome! Want another recommendation?",
    hinglish: 'Koi baat nahi! Ek aur recommendation chahiye?',
    hi: 'कोई बात नहीं! एक और सिफ़ारिश चाहिए?',
  },
  bye: {
    en: 'Bye! Come back whenever you want something to watch.',
    hinglish: 'Bye! Jab bhi kuch dekhna ho, wapas aa jana.',
    hi: 'अलविदा! जब भी कुछ देखना हो, वापस आइएगा।',
  },
  about: {
    en: `I'm ${BOT_NAME}. I can suggest movies and series, tell you about a title, show what's on your list, and share today's sports fixtures. Just ask!`,
    hinglish: `Main ${BOT_NAME} hoon. Main movies aur series suggest kar sakta hoon, kisi title ke baare mein bata sakta hoon, tumhari list dikha sakta hoon aur aaj ke sports matches bata sakta hoon. Bas pooch lo!`,
    hi: `मैं ${BOT_NAME} हूँ। मैं फ़िल्में और सीरीज़ सुझा सकता हूँ, किसी टाइटल की जानकारी दे सकता हूँ, आपकी लिस्ट दिखा सकता हूँ और आज के खेल के मैच बता सकता हूँ। बस पूछिए!`,
  },
};

const NAME = '(?: (?:filmy|there|bro|yaar|bhai|dost|ji))?';
const PATTERNS = {
  greet: new RegExp(`^(?:h+i+|hello+|hey+|heya|hola|yo|namaste|namaskar|good (?:morning|afternoon|evening)|kaise ho|kaise hain aap|kya haal(?: hai| hain)?|how are you|whats up|sup|नमस्ते|हेलो|हाय|प्रणाम)${NAME}$`, 'u'),
  thanks: new RegExp(`^(?:thanks(?: a lot)?|thank you(?: so much)?|thankyou|thx|ty|shukriya|bahut shukriya|dhanyavad|dhanyawad|धन्यवाद|शुक्रिया)${NAME}$`, 'u'),
  bye: new RegExp(`^(?:bye(?: bye)?|goodbye|good night|see you|ok bye|alvida|tata|अलविदा)${NAME}$`, 'u'),
  about: /^(?:who are you|what are you|what can you do|what do you do|your name|help|tum kaun ho|aap kaun ho|tum kya kar sakte ho|aap kya kar sakte hain|tera naam kya hai|aapka naam kya hai|तुम कौन हो|आप कौन हैं)$/u,
};

/** @returns {string | null} a ready answer, or null when the message needs the model */
export function smallTalk(message, lang = 'en') {
  const normal = message.toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!normal || normal.split(' ').length > 6) return null;
  for (const [kind, pattern] of Object.entries(PATTERNS)) {
    if (pattern.test(normal)) return REPLIES[kind][lang] ?? REPLIES[kind].en;
  }
  return null;
}
