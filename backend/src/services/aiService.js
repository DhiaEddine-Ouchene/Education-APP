// Node native fetch is available in Node 18+
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Local fallback dictionary for offline mode
const LOCAL_VOCAB_DB = {
  food: [
    { term: 'el tomate', translation: 'tomato', hint: 'Red juicy fruit used in salads' },
    { term: 'la carne', translation: 'meat', hint: 'Animal flesh used as food' },
    { term: 'el pescado', translation: 'fish', hint: 'Seafood animal with gills' },
    { term: 'la sopa', translation: 'soup', hint: 'Liquid hot food dish' },
    { term: 'el postre', translation: 'dessert', hint: 'Sweet course eaten at the end of a meal' },
    { term: 'la ensalada', translation: 'salad', hint: 'Dish of mixed cold vegetables' },
  ],
  travel: [
    { term: 'la maleta', translation: 'suitcase', hint: 'Case for carrying clothes when travelling' },
    { term: 'el avion', translation: 'airplane', hint: 'Flying vehicle with wings' },
    { term: 'el tren', translation: 'train', hint: 'Connected railway carriages' },
    { term: 'la playa', translation: 'beach', hint: 'Sandy shore by the ocean' },
    { term: 'el mapa', translation: 'map', hint: 'Visual representation of an area' },
    { term: 'la direccion', translation: 'address/direction', hint: 'Where something is located' },
  ],
  greetings: [
    { term: 'hola', translation: 'hello', hint: 'Common friendly greeting' },
    { term: 'adios', translation: 'goodbye', hint: 'Parting phrase' },
    { term: 'por favor', translation: 'please', hint: 'Polite request term' },
    { term: 'de nada', translation: 'you are welcome', hint: 'Response to thank you' },
    { term: 'buenos dias', translation: 'good morning', hint: 'Greeting in the morning' },
    { term: 'buenas noches', translation: 'good night', hint: 'Greeting in the evening' },
  ],
  animals: [
    { term: 'el perro', translation: 'dog', hint: 'Best friend of humans' },
    { term: 'el gato', translation: 'cat', hint: 'Small furry whiskered pet' },
    { term: 'el caballo', translation: 'horse', hint: 'Large animal you can ride' },
    { term: 'el pajaro', translation: 'bird', hint: 'Feathered flying animal' },
    { term: 'el pez', translation: 'fish (swimming)', hint: 'Water-dwelling scaly creature' },
  ],
};

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had', 'her', 'was', 'one', 'our',
  'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who',
  'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'with', 'this', 'that', 'they', 'from',
  'have', 'were', 'your', 'what', 'when', 'will', 'there', 'their', 'about', 'would', 'which', 'these',
  'such', 'then', 'than', 'them', 'into', 'some', 'more', 'most', 'over', 'also', 'just', 'like', 'very',
]);

/**
 * Dynamic translation helper using the free Google Translate gtx endpoint.
 */
async function translateText(text, fromLang, toLang) {
  if (!text || fromLang === toLang) return text;
  try {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' +
      encodeURIComponent(fromLang) +
      '&tl=' +
      encodeURIComponent(toLang) +
      '&dt=t&q=' +
      encodeURIComponent(text);
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json && json[0] && json[0][0] && json[0][0][0]) {
        return json[0][0][0].trim();
      }
    }
  } catch (e) {
    console.error('Dynamic translation failed for "' + text + '":', e.message);
  }
  return text;
}

async function callOpenAi(systemPrompt, temperature) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + OPENAI_API_KEY,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error('OpenAI error: ' + errText);
  }
  const data = await response.json();
  let content = data.choices[0].message.content.trim();
  if (content.startsWith('```json')) content = content.slice(7);
  if (content.startsWith('```')) content = content.slice(3);
  if (content.endsWith('```')) content = content.slice(0, -3);
  return JSON.parse(content.trim());
}

/**
 * Generate a vocabulary set from a topic.
 * Returns array of { term, translation, hint }
 */
async function generateFromTopic(topic, sourceLang = 'en', targetLang = 'es') {
  if (OPENAI_API_KEY) {
    try {
      const prompt =
        'You are an educational AI helper. Generate a vocabulary list of exactly 6 words/phrases for the topic "' +
        topic +
        '". Source language (students read this): ' +
        sourceLang +
        '. Target language (students learn this): ' +
        targetLang +
        '. Format the response as a JSON array of objects, each having: "term" (the word/phrase in the target language), "translation" (the translation in the source language), and "hint" (a helpful descriptive clue in the source language). Return ONLY the raw JSON array. No explanations, no markdown.';
      return await callOpenAi(prompt, 0.7);
    } catch (e) {
      console.error('OpenAI topic autofill failed, using offline generator:', e.message);
    }
  }

  console.log('Running smart offline topic generation...');
  const cleanTopic = topic.toLowerCase().trim();

  // Curated local DB first.
  for (const key of Object.keys(LOCAL_VOCAB_DB)) {
    if (cleanTopic.includes(key) || key.includes(cleanTopic)) {
      const curatedWords = LOCAL_VOCAB_DB[key];
      const translatedList = [];
      for (const item of curatedWords) {
        const term = targetLang === 'es' ? item.term : await translateText(item.term, 'es', targetLang);
        const translation = sourceLang === 'en' ? item.translation : await translateText(item.translation, 'en', sourceLang);
        const hint = sourceLang === 'en' ? item.hint : await translateText(item.hint, 'en', sourceLang);
        translatedList.push({ term: term, translation: translation, hint: hint });
      }
      return translatedList;
    }
  }

  const TOPIC_WORDS = {
    food: ['bread', 'apple', 'cheese', 'water', 'milk', 'tomato'],
    travel: ['airport', 'hotel', 'passport', 'ticket', 'airplane', 'train'],
    greetings: ['hello', 'goodbye', 'please', 'thank you', 'good morning', 'good night'],
    animals: ['dog', 'cat', 'horse', 'bird', 'fish', 'lion'],
    colors: ['red', 'blue', 'green', 'yellow', 'black', 'white'],
    family: ['father', 'mother', 'brother', 'sister', 'son', 'daughter'],
    school: ['teacher', 'student', 'book', 'pencil', 'desk', 'classroom'],
    weather: ['sun', 'rain', 'snow', 'wind', 'cloud', 'storm'],
    clothing: ['shirt', 'pants', 'shoes', 'jacket', 'hat', 'dress'],
    body: ['head', 'face', 'eye', 'hand', 'leg', 'foot'],
    home: ['house', 'room', 'bed', 'chair', 'table', 'door'],
    jobs: ['doctor', 'nurse', 'teacher', 'engineer', 'chef', 'driver'],
    nature: ['tree', 'flower', 'river', 'mountain', 'sky', 'sea'],
    sports: ['soccer', 'basketball', 'tennis', 'running', 'swimming', 'team'],
    feelings: ['happy', 'sad', 'angry', 'tired', 'excited', 'love'],
    numbers: ['one', 'two', 'three', 'four', 'five', 'six'],
  };

  let matchedKey = null;
  for (const key of Object.keys(TOPIC_WORDS)) {
    if (cleanTopic.includes(key) || key.includes(cleanTopic)) {
      matchedKey = key;
      break;
    }
  }

  const rawWords = matchedKey
    ? TOPIC_WORDS[matchedKey].slice(0, 6)
    : [cleanTopic, 'hello', 'friend', 'school', 'happy', 'family'].slice(0, 6);

  const result = [];
  for (const w of rawWords) {
    try {
      const term = await translateText(w, 'en', targetLang);
      const translation = sourceLang === 'en' ? w : await translateText(w, 'en', sourceLang);
      result.push({ term: term, translation: translation, hint: 'A word related to ' + topic + ': ' + translation });
    } catch (e) {
      result.push({ term: w, translation: w, hint: 'Word related to ' + topic });
    }
  }
  return result;
}

/**
 * Extract vocabulary words from course content.
 * Returns array of { term, translation, hint }
 */
async function extractFromText(text, sourceLang = 'en', targetLang = 'es') {
  if (OPENAI_API_KEY) {
    try {
      const prompt =
        'You are an educational AI helper. Scan the following lesson text and extract up to 8 of the most important and most frequently repeated vocabulary words/phrases. For each, give "term" in the target language (' +
        targetLang +
        '), "translation" in the source language (' +
        sourceLang +
        '), and a short "hint" in the source language. Lesson text: "' +
        text +
        '". Return ONLY the raw JSON array. No markdown.';
      return await callOpenAi(prompt, 0.5);
    } catch (e) {
      console.error('OpenAI extraction failed, using offline parser:', e.message);
    }
  }

  console.log('Running smart offline text vocabulary extraction...');
  const foundWords = [];

  // 1) Best signal: terms written as "foreign term" (translation)
  const pattern = /"([^"]+)"\s*\(([^)]+)\)/g;
  let match;
  while ((match = pattern.exec(text)) !== null && foundWords.length < 8) {
    foundWords.push({
      term: match[1].trim(),
      translation: match[2].trim(),
      hint: 'Extracted from the lesson: "' + match[1].trim() + '"',
    });
  }
  if (foundWords.length > 0) return foundWords;

  // 2) Otherwise rank words by how often they repeat (most important first).
  const tokens = (text.toLowerCase().match(/[a-z\u00c0-\u024f]{4,}/g) || []);
  const freq = {};
  for (const tk of tokens) {
    if (STOP_WORDS.has(tk)) continue;
    freq[tk] = (freq[tk] || 0) + 1;
  }
  const ranked = Object.keys(freq)
    .sort((a, b) => (freq[b] !== freq[a] ? freq[b] - freq[a] : b.length - a.length))
    .slice(0, 8);

  if (ranked.length > 0) {
    const out = [];
    for (const w of ranked) {
      const term = await translateText(w, sourceLang, targetLang);
      const times = freq[w] > 1 ? ' (repeated ' + freq[w] + ' times)' : '';
      out.push({ term: term, translation: w, hint: 'Key word from the lesson' + times });
    }
    return out;
  }

  // 3) Last resort static list.
  return [
    { term: 'ejemplo', translation: 'example', hint: 'Something representative of a group' },
    { term: 'estudiante', translation: 'student', hint: 'A person who is studying' },
    { term: 'leccion', translation: 'lesson', hint: 'An amount of teaching given at one time' },
  ];
}

module.exports = {
  generateFromTopic,
  extractFromText,
};
