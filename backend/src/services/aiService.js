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
    { term: 'la ensalada', translation: 'salad', hint: 'Dish of mixed cold vegetables' }
  ],
  travel: [
    { term: 'la maleta', translation: 'suitcase', hint: 'Case for carrying clothes when travelling' },
    { term: 'el avión', translation: 'airplane', hint: 'Flying vehicle with wings' },
    { term: 'el tren', translation: 'train', hint: 'Connected railway carriages' },
    { term: 'la playa', translation: 'beach', hint: 'Sandy shore by the ocean' },
    { term: 'el mapa', translation: 'map', hint: 'Visual representation of an area' },
    { term: 'la dirección', translation: 'address/direction', hint: 'Where something is located' }
  ],
  greetings: [
    { term: 'hola', translation: 'hello', hint: 'Common friendly greeting' },
    { term: 'adiós', translation: 'goodbye', hint: 'Parting phrase' },
    { term: 'por favor', translation: 'please', hint: 'Polite request term' },
    { term: 'de nada', translation: 'you are welcome', hint: 'Response to thank you' },
    { term: 'buenos días', translation: 'good morning', hint: 'Greeting in the morning' },
    { term: 'buenas noches', translation: 'good night', hint: 'Greeting in the evening' }
  ],
  animals: [
    { term: 'el perro', translation: 'dog', hint: 'Man\'s best friend' },
    { term: 'el gato', translation: 'cat', hint: 'Small furry whiskers pet' },
    { term: 'el caballo', translation: 'horse', hint: 'Large animal you can ride' },
    { term: 'el pájaro', translation: 'bird', hint: 'Feathered flying animal' },
    { term: 'el pez', translation: 'fish (swimming)', hint: 'Water-dwelling scaly creature' }
  ]
};

/**
 * Dynamic Translation Helper using Google Translate free gtx endpoint.
 */
async function translateText(text, fromLang, toLang) {
  if (fromLang === toLang) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json && json[0] && json[0][0] && json[0][0][0]) {
        return json[0][0][0].trim();
      }
    }
  } catch (e) {
    console.error(`Dynamic translation failed for "${text}":`, e.message);
  }
  return text;
}

/**
 * Generate a vocabulary set from a topic.
 * Returns array of { term, translation, hint }
 */
async function generateFromTopic(topic, sourceLang = 'en', targetLang = 'es') {
  if (OPENAI_API_KEY) {
    try {
      console.log('Calling OpenAI API for topic autofill...');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an educational AI helper. Generate a vocabulary list of exactly 6 words/phrases for the topic "${topic}".
              Source language (students read this): ${sourceLang}
              Target language (students learn this): ${targetLang}
              
              Format the response as a JSON array of objects, each having:
              - "term": the word/phrase in the target language (e.g. "el queso")
              - "translation": the translation in the source language (e.g. "cheese")
              - "hint": a helpful, descriptive clue in the source language.
              
              Return ONLY the raw JSON array. No explanations, no markdown formatting.`
            }
          ],
          temperature: 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        let content = data.choices[0].message.content.trim();
        // Strip markdown backticks if OpenAI outputs them
        if (content.startsWith('```json')) content = content.slice(7);
        if (content.startsWith('```')) content = content.slice(3);
        if (content.endsWith('```')) content = content.slice(0, -3);
        
        return JSON.parse(content.trim());
      } else {
        const errText = await response.text();
        console.error('OpenAI Error response:', errText);
        // Fall through to local generation on error
      }
    } catch (e) {
      console.error('OpenAI API call failed, falling back to local database:', e);
    }
  }

  // Smart Offline Fallback
  console.log('Running smart offline topic generation...');
  const cleanTopic = topic.toLowerCase().trim();
  
  // Try direct lookup of curated local DB first
  for (const key of Object.keys(LOCAL_VOCAB_DB)) {
    if (cleanTopic.includes(key) || key.includes(cleanTopic)) {
      console.log(`Matched curated local database key: "${key}". Translating dynamically...`);
      const curatedWords = LOCAL_VOCAB_DB[key];
      const translatedList = [];
      for (const item of curatedWords) {
        // Translate term from Spanish ('es') to target language if target is not 'es'
        const term = targetLang === 'es' ? item.term : await translateText(item.term, 'es', targetLang);
        // Translate translation from English ('en') to source language if source is not 'en'
        const translation = sourceLang === 'en' ? item.translation : await translateText(item.translation, 'en', sourceLang);
        // Translate hint from English ('en') to source language if source is not 'en'
        const hint = sourceLang === 'en' ? item.hint : await translateText(item.hint, 'en', sourceLang);
        
        translatedList.push({
          term: term.toLowerCase(),
          translation: translation.toLowerCase(),
          hint: hint
        });
      }
      return translatedList;
    }
  }

  // Extensive topic fallback lists
  const TOPIC_WORDS = {
    food: ['bread', 'apple', 'cheese', 'water', 'milk', 'tomato', 'meat', 'fish', 'soup', 'dessert', 'salad', 'chicken', 'rice', 'fruit', 'vegetable'],
    travel: ['airport', 'hotel', 'passport', 'ticket', 'airplane', 'train', 'beach', 'map', 'suitcase', 'station', 'taxi', 'car', 'luggage'],
    greetings: ['hello', 'goodbye', 'please', 'thank you', 'you are welcome', 'good morning', 'good night', 'how are you', 'nice to meet you', 'excuse me'],
    animals: ['dog', 'cat', 'horse', 'bird', 'fish', 'lion', 'elephant', 'tiger', 'monkey', 'rabbit', 'bear', 'mouse', 'sheep', 'cow', 'duck'],
    colors: ['red', 'blue', 'green', 'yellow', 'black', 'white', 'orange', 'purple', 'pink', 'brown', 'gray'],
    family: ['father', 'mother', 'brother', 'sister', 'grandfather', 'grandmother', 'son', 'daughter', 'uncle', 'aunt', 'cousin', 'husband', 'wife'],
    school: ['teacher', 'student', 'book', 'pencil', 'pen', 'desk', 'classroom', 'school', 'paper', 'notebook', 'computer', 'exam', 'lesson'],
    weather: ['sun', 'rain', 'snow', 'wind', 'cloud', 'hot', 'cold', 'warm', 'storm', 'weather', 'summer', 'winter', 'spring', 'autumn'],
    clothing: ['shirt', 'pants', 'shoes', 'socks', 'jacket', 'hat', 'dress', 'skirt', 'coat', 'gloves', 'boots'],
    body: ['head', 'face', 'eye', 'ear', 'nose', 'mouth', 'hair', 'arm', 'hand', 'leg', 'foot', 'heart', 'finger', 'tooth'],
    home: ['house', 'room', 'bed', 'chair', 'table', 'door', 'window', 'kitchen', 'bathroom', 'garden', 'key', 'clock'],
    jobs: ['doctor', 'nurse', 'teacher', 'engineer', 'police officer', 'firefighter', 'chef', 'artist', 'driver', 'pilot', 'writer', 'farmer'],
    nature: ['tree', 'flower', 'grass', 'river', 'lake', 'mountain', 'forest', 'sky', 'star', 'moon', 'sea', 'stone'],
    sports: ['soccer', 'basketball', 'tennis', 'baseball', 'running', 'swimming', 'jump', 'ball', 'game', 'play', 'team'],
    feelings: ['happy', 'sad', 'angry', 'scared', 'tired', 'excited', 'bored', 'surprised', 'love', 'fear', 'joy'],
    music: ['music', 'song', 'sing', 'dance', 'guitar', 'piano', 'violin', 'drum', 'melody', 'rhythm', 'concert', 'band'],
    time: ['time', 'hour', 'minute', 'second', 'day', 'week', 'month', 'year', 'morning', 'afternoon', 'evening', 'night', 'today', 'yesterday', 'tomorrow'],
    numbers: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'hundred', 'thousand'],
    shopping: ['store', 'shop', 'buy', 'sell', 'price', 'money', 'cash', 'credit card', 'market', 'cheap', 'expensive', 'receipt']
  };

  // Find matching key in topic lists
  let matchedKey = null;
  for (const key of Object.keys(TOPIC_WORDS)) {
    if (cleanTopic.includes(key) || key.includes(cleanTopic)) {
      matchedKey = key;
      break;
    }
  }

  // Get raw words
  let rawWords = [];
  if (matchedKey) {
    rawWords = TOPIC_WORDS[matchedKey].slice(0, 6);
  } else {
    // If not matching any topic, use the topic name as the first term, and append some general vocabulary words
    rawWords = [cleanTopic, 'hello', 'friend', 'school', 'happy', 'family'].slice(0, 6);
  }

  // Translate dynamically
  const result = [];
  for (const w of rawWords) {
    try {
      const term = await translateText(w, 'en', targetLang);
      const translation = await translateText(w, 'en', sourceLang);
      const rawHint = `A term related to ${topic}: ${w}`;
      const hint = await translateText(rawHint, 'en', sourceLang);
      
      result.push({
        term: term.toLowerCase(),
        translation: translation.toLowerCase(),
        hint: hint
      });
    } catch (e) {
      result.push({
        term: w,
        translation: w,
        hint: `Word related to ${topic}`
      });
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
      console.log('Calling OpenAI API for text vocabulary extraction...');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an educational AI helper. Scan the following lesson text and extract key vocabulary words/phrases (up to 8) that are in the target language (${targetLang}) and explain them in the source language (${sourceLang}).
              
              Format the response as a JSON array of objects, each having:
              - "term": the word in the target language (${targetLang})
              - "translation": the translation in the source language (${sourceLang})
              - "hint": a descriptive definition or clue in the source language.
              
              Lesson text:
              "${text}"
              
              Return ONLY the raw JSON array. No markdown, no text wrapping.`
            }
          ],
          temperature: 0.5
        })
      });

      if (response.ok) {
        const data = await response.json();
        let content = data.choices[0].message.content.trim();
        if (content.startsWith('```json')) content = content.slice(7);
        if (content.startsWith('```')) content = content.slice(3);
        if (content.endsWith('```')) content = content.slice(0, -3);
        
        return JSON.parse(content.trim());
      }
    } catch (e) {
      console.error('OpenAI API text extraction failed, falling back to local parser:', e);
    }
  }

  // Smart Offline Fallback: Extract terms enclosed in quotation marks, e.g., "term" (translation)
  console.log('Running smart offline text vocabulary extraction...');
  const foundWords = [];
  
  // Pattern matches: "foreign_term" (translation) or "foreign_term" - translation
  // e.g. "el queso" (cheese)
  const pattern = /"([^"]+)"\s*\(([^)]+)\)/g;
  let match;
  let idCounter = 1;

  while ((match = pattern.exec(text)) !== null && foundWords.length < 8) {
    const term = match[1].trim();
    const translation = match[2].trim();
    foundWords.push({
      term,
      translation,
      hint: `Extracted term from the lesson text: "${term}"`
    });
  }

  // If we couldn't parse anything with quotes, do a basic regex split for bracketed items
  if (foundWords.length === 0) {
    const bracketsPattern = /([A-Za-z\u0600-\u06FF\s]+)\s*\(([^)]+)\)/g;
    pattern.lastIndex = 0; // reset
    while ((match = bracketsPattern.exec(text)) !== null && foundWords.length < 5) {
      const term = match[1].trim();
      const translation = match[2].trim();
      // Skip short articles or empty matches
      if (term.length > 2 && translation.length > 2) {
        foundWords.push({
          term,
          translation,
          hint: `Context term: ${term}`
        });
      }
    }
  }

  // Static list if the text had no recognizable vocabulary format
  if (foundWords.length === 0) {
    return [
      { term: 'ejemplo', translation: 'example', hint: 'Something that representative of a group' },
      { term: 'estudiante', translation: 'student', hint: 'A person who is studying' },
      { term: 'lección', translation: 'lesson', hint: 'An amount of teaching given at one time' }
    ];
  }

  return foundWords;
}

module.exports = {
  generateFromTopic,
  extractFromText
};
