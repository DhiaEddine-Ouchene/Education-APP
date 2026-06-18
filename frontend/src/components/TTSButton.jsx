import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

/**
 * Text-to-Speech component utilizing the browser's native window.speechSynthesis.
 * Avoids heavy backend TTS services while maintaining support for multiple languages including Arabic, Spanish, English.
 */
export default function TTSButton({ text, lang }) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Stop reading if component unmounts
  useEffect(() => {
    return () => {
      if (isPlaying) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlaying]);

  const handleSpeak = (e) => {
    e.stopPropagation(); // Avoid card-flip action in parent elements

    if (!('speechSynthesis' in window)) {
      console.warn('Text-to-speech is not supported by your browser.');
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // Cancel any current utterance
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Normalize language tags to BCP-47 format
    let bcp47 = lang || 'es';
    if (bcp47 === 'es') bcp47 = 'es-ES';
    else if (bcp47 === 'ar') bcp47 = 'ar-SA';
    else if (bcp47 === 'en') bcp47 = 'en-US';
    else if (bcp47 === 'fr') bcp47 = 'fr-FR';
    else if (bcp47 === 'de') bcp47 = 'de-DE';
    else if (bcp47 === 'it') bcp47 = 'it-IT';

    utterance.lang = bcp47;
    
    // Check reading voice
    const voices = window.speechSynthesis.getVoices();
    const voiceMatch = voices.find(v => v.lang.startsWith(lang) || v.lang === bcp47);
    if (voiceMatch) {
      utterance.voice = voiceMatch;
    }

    // Adjust rate for vocabulary learning purposes (slightly slower and clearer)
    utterance.rate = 0.85;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <button 
      type="button"
      onClick={handleSpeak}
      className={`tts-button ${isPlaying ? 'active' : ''}`}
      title="Listen pronunciation"
    >
      {isPlaying ? <VolumeX size={16} /> : <Volume2 size={16} />}
    </button>
  );
}
