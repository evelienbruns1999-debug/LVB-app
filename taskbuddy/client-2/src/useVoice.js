import { useState, useEffect, useRef, useCallback } from 'react';

function normalizeSpeechText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/([.!?])(?!\s|$)/g, '$1 ')
    .replace(/:/g, ', ')
    .replace(/\s*-\s*/g, ', ')
    .replace(/\(/g, ', ')
    .replace(/\)/g, '')
    .replace(/\bok[eé]\b/gi, 'oké')
    .replace(/\bsuper\b/gi, 'heel goed')
    .trim();
}

function pickBestDutchVoice(voices) {
  const dutchVoices = voices.filter((voice) =>
    voice.lang === 'nl-NL' || voice.lang === 'nl-BE' || voice.lang?.startsWith('nl')
  );

  if (!dutchVoices.length) return null;

  const preferredNames = ['claire', 'femke', 'anna', 'lotte', 'eva', 'dutch', 'nederland', 'xander'];

  return (
    dutchVoices.find((voice) =>
      preferredNames.some((name) => voice.name.toLowerCase().includes(name))
    ) ||
    dutchVoices.find((voice) => voice.localService) ||
    dutchVoices[0]
  );
}

export function speak(text, opts = {}) {
  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const cleanedText = normalizeSpeechText(text);
  const utterance = new SpeechSynthesisUtterance(cleanedText);
  const isQuestion = cleanedText.endsWith('?');
  const isShortPrompt = cleanedText.length < 40;
  const isCelebration = /goed gedaan|fantastisch|geweldig|heel goed|klaar/i.test(cleanedText);
  const isInstruction = /stap|doe|pak|zet|ga|open|kies|tik|druk/i.test(cleanedText);

  utterance.lang = 'nl-NL';
  utterance.rate = opts.rate ?? (isInstruction ? 0.78 : isShortPrompt ? 0.83 : 0.8);
  utterance.pitch = opts.pitch ?? (isCelebration ? 0.96 : isQuestion ? 0.97 : 0.91);
  utterance.volume = opts.volume ?? 1;

  const voices = window.speechSynthesis.getVoices();
  const nlVoice = pickBestDutchVoice(voices);
  if (nlVoice) utterance.voice = nlVoice;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
}

export function useVoice(onResult) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    setSupported(true);

    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }

    const recognition = new SR();
    recognition.lang = 'nl-NL';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      onResult?.(event.results[0][0].transcript.trim().toLowerCase());
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    ref.current = recognition;

    return () => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
    };
  }, [onResult]);

  const startListening = useCallback(() => {
    if (ref.current && !listening) {
      try {
        ref.current.start();
        setListening(true);
      } catch (_) {}
    }
  }, [listening]);

  return { listening, supported, startListening };
}
