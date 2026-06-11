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

// Map SpeechRecognition error codes to friendly Dutch messages
function friendlyError(code) {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Geef de microfoon toegang in je browser-instellingen.';
    case 'no-speech':
      return 'Ik hoorde niets — probeer nog eens.';
    case 'audio-capture':
      return 'Geen microfoon gevonden.';
    case 'network':
      return 'Geen internet — spraak werkt online.';
    case 'aborted':
      return '';  // user cancelled, no message
    default:
      return 'Spraak werkte niet — probeer nog eens.';
  }
}

export function useVoice(onResult) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);

  // Keep the latest callback in a ref so the recognition object never needs to be rebuilt
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    setSupported(true);

    // Prime the voice list for speak()
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }

    const recognition = new SR();
    recognition.lang = 'nl-NL';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setError('');
    };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setListening(false);
      onResultRef.current?.(transcript.trim().toLowerCase());
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = (event) => {
      const msg = friendlyError(event.error);
      if (msg) setError(msg);
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.abort(); } catch (_) {}
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const startListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) {
      setError('Spraakherkenning niet beschikbaar in deze browser.');
      return;
    }
    // Toggle off if already listening
    if (listening) {
      try { rec.stop(); } catch (_) {}
      setListening(false);
      return;
    }
    setError('');
    try {
      // On iOS Safari, AudioContext should be resumed inside the user gesture
      // — calling start() directly is fine because the click is the gesture.
      rec.start();
      // setListening(true) is handled in onstart, but set optimistically too
      setListening(true);
    } catch (e) {
      // InvalidStateError fires if recognition is already running — try restarting
      const message = (e && e.message) || '';
      if (/already started|invalidstate/i.test(message)) {
        try {
          rec.stop();
          setTimeout(() => {
            try { rec.start(); setListening(true); } catch (_) {}
          }, 200);
        } catch (_) {}
      } else {
        setError('Kon spraak niet starten. Sta microfoon toe in je browser.');
        setListening(false);
      }
    }
  }, [listening]);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try { rec.stop(); } catch (_) {}
    setListening(false);
  }, []);

  const clearError = useCallback(() => setError(''), []);

  return { listening, supported, error, startListening, stopListening, clearError };
}
