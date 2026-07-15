import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * DICTADO POR VOZ — una sola implementación para toda la app.
 *
 * Antes esto estaba copiado y pegado a mano en cuatro lugares (una de las copias ni
 * siquiera se renderizaba), cada uno con sus propios bugs. Los tres que rompían el
 * dictado en la práctica:
 *
 *  1. `continuous = false`: el navegador CORTA el micrófono al primer silencio. El
 *     costista frenaba a pensar y el micrófono se apagaba solo, sin avisar. Acá va en
 *     `true`, y además se REENGANCHA si el navegador lo corta igual (Chrome lo hace
 *     tras un rato largo de silencio, aunque esté en `continuous`).
 *  2. Frases perdidas: una copia hacía `setText(text + nuevo)` leyendo un `text`
 *     congelado en el momento de arrancar, así que la 2ª frase pisaba a la 1ª. Acá el
 *     texto nuevo se ENTREGA (`onText`) y el que llama lo agrega con la forma funcional.
 *  3. Silencio ante el error: si el micrófono estaba bloqueado o no había micrófono, el
 *     botón dejaba de titilar y listo. Nadie te decía nada. Acá cada falla tiene un
 *     mensaje que dice QUÉ pasó y QUÉ hacer.
 *
 * Nota: el reconocimiento lo hace el navegador (Chrome/Edge/Safari), no un servidor
 * nuestro. Por eso no necesita clave de API — pero tampoco entiende bien el vocabulario
 * de costos ("prorrateo", "PPP"). Mejorar eso pide Whisper del lado del servidor, y es
 * un paso aparte.
 */

/** El objeto del navegador. No hay tipos oficiales, por eso se describe lo que se usa. */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: SpeechResultEvent) => void) | null;
}

interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Traduce el código de error del navegador a algo que el costista pueda accionar.
 * `null` = no es un error de verdad (un silencio, o que lo cortamos nosotros).
 */
function mensajeDeError(code: string): string | null {
  switch (code) {
    case 'no-speech':
    case 'aborted':
      return null; // no dijo nada todavía, o lo frenamos nosotros: no es una falla
    case 'not-allowed':
    case 'service-not-allowed':
      return 'El navegador bloqueó el micrófono. Habilitalo desde el candado 🔒 de la barra de direcciones y volvé a intentar.';
    case 'audio-capture':
      return 'No se detectó ningún micrófono conectado.';
    case 'network':
      return 'No se pudo conectar con el servicio de voz del navegador. Revisá tu conexión a internet.';
    default:
      return `No se pudo dictar (${code}). Probá de nuevo, o escribí el texto a mano.`;
  }
}

/** Errores que no tienen vuelta: no sirve reengancharse. */
const FATALES = new Set(['not-allowed', 'service-not-allowed', 'audio-capture']);

export interface Dictation {
  /** El navegador soporta dictado (Chrome, Edge, Safari — Firefox no). */
  supported: boolean;
  listening: boolean;
  /** Qué salió mal, en criollo. `null` si todo bien. */
  error: string | null;
  toggle: () => void;
  stop: () => void;
}

/**
 * @param onText se llama con cada frase TERMINADA que el navegador reconoce.
 *   Agregala con la forma funcional: `onText={(t) => setValor((prev) => prev + ' ' + t)}`.
 */
export function useDictation(onText: (chunk: string) => void): Dictation {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  /** Si el usuario sigue queriendo dictar. Distingue "lo frenó él" de "se cortó solo". */
  const queremosEscucharRef = useRef(false);
  /** Siempre la última versión: evita que el handler quede con un closure viejo. */
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const supported = getSpeechRecognition() !== null;

  const crear = useCallback((): SpeechRecognitionLike | null => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return null;

    const rec = new Ctor();
    rec.lang = 'es-AR';
    rec.continuous = true;
    rec.interimResults = false; // solo nos importa lo que ya quedó firme

    rec.onstart = () => {
      setListening(true);
      setError(null);
    };

    rec.onresult = (e) => {
      let firme = '';
      // Desde `resultIndex`: lo anterior ya se entregó. Leer siempre `results[0]` (lo
      // que hacían tres de las cuatro copias) tiraba a la basura todo lo que venía después.
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]!;
        if (r.isFinal) firme += r[0].transcript;
      }
      const limpio = firme.trim();
      if (limpio) onTextRef.current(limpio);
    };

    rec.onerror = (e) => {
      const msg = mensajeDeError(e.error);
      if (msg) setError(msg);
      if (FATALES.has(e.error)) {
        queremosEscucharRef.current = false; // no insistir: no va a andar
      }
    };

    rec.onend = () => {
      // El navegador corta solo tras un silencio largo. Si el usuario NO apretó "parar",
      // volvemos a engancharnos: es lo que hace que se pueda frenar a pensar.
      if (queremosEscucharRef.current) {
        try {
          rec.start();
          return;
        } catch {
          // Si no se puede reenganchar, se apaga sin drama.
        }
      }
      setListening(false);
    };

    return rec;
  }, []);

  const stop = useCallback(() => {
    queremosEscucharRef.current = false;
    recRef.current?.stop();
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (!supported) {
      setError('Tu navegador no soporta dictado por voz. Usá Chrome, Edge o Safari.');
      return;
    }
    if (queremosEscucharRef.current) {
      stop();
      return;
    }

    const rec = crear();
    if (!rec) return;
    recRef.current = rec;
    queremosEscucharRef.current = true;
    setError(null);

    try {
      rec.start();
    } catch {
      // Doble clic rápido: ya estaba arrancando. No es una falla que le importe a nadie.
      queremosEscucharRef.current = false;
      setListening(false);
    }
  }, [crear, stop, supported]);

  // Si te vas de la pantalla mientras dictás, el micrófono se apaga.
  useEffect(() => {
    return () => {
      queremosEscucharRef.current = false;
      recRef.current?.abort();
    };
  }, []);

  return { supported, listening, error, toggle, stop };
}
