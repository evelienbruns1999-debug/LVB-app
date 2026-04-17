import { useState, useEffect, useRef, useCallback } from 'react';

export function speak(text, opts = {}) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'nl-NL'; u.rate = opts.rate || 0.88; u.pitch = opts.pitch || 1.05; u.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const nl = voices.find(v => v.lang === 'nl-NL' || v.lang === 'nl-BE' || v.lang.startsWith('nl'));
  if (nl) u.voice = nl;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() { window.speechSynthesis?.cancel(); }

export function useVoice(onResult) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const r = new SR();
    r.lang = 'nl-NL'; r.continuous = false; r.interimResults = false;
    r.onresult = e => { onResult?.(e.results[0][0].transcript.trim().toLowerCase()); setListening(false); };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    ref.current = r;
  }, [onResult]);

  const startListening = useCallback(() => {
    if (ref.current && !listening) { try { ref.current.start(); setListening(true); } catch (_) {} }
  }, [listening]);

  return { listening, supported, startListening };
}
