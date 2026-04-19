import { useState, useEffect, useRef, useCallback } from 'react';

function normalizeSpeechText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/([.!?])(?!\s|$)/g, '$1 ')
    .replace(/:/g, ', ')
    .replace(/\b\d+\b/g, (match) => `${match}`)
    .trim();
}

function pickBestDutchVoice(voices) {
  const dutchVoices = voices.filter((v) =>
    v.lang === 'nl-NL' || v.lang === 'nl-BE' || v.lang?.startsWith('nl')
  );

  if (!dutchVoices.length) return null;

  const preferredNames = ['xander', 'claire', 'femke', 'dutch', 'nederland'];

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

  const cleaned = normalizeSpeechText(text);
  const u = new SpeechSynthesisUtterance(cleaned);
  const isQuestion = cleaned.endsWith('?');
  const isShortPrompt = cleaned.length < 40;

  u.lang = 'nl-NL';
  u.rate = opts.rate ?? (isShortPrompt ? 0.92 : 0.86);
  u.pitch = opts.pitch ?? (isQuestion ? 1.03 : 0.98);
  u.volume = opts.volume ?? 1;

  const voices = window.speechSynthesis.getVoices();
  const nl = pickBestDutchVoice(voices);
  if (nl) u.voice = nl;

  window.speechSynthesis.speak(u);
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

    window.speechSynthesis?.getVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }

    const r = new SR();
    r.lang = 'nl-NL';
    r.continuous = false;
    r.interimResults = false;
    r.onresult = e => {
      onResult?.(e.results[0][0].transcript.trim().toLowerCase());
      setListening(false);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    ref.current = r;

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
