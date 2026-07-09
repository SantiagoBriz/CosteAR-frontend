import { useState } from 'react';
import { Mic, MicOff, Sparkles } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AiSuggesterSectionProps {
  companyName: string;
}

export function AiSuggesterSection({ companyName }: AiSuggesterSectionProps) {
  const [promptText, setPromptText] = useState('');
  const [suggs, setSuggs] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz.');
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'es-AR';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setPromptText((prev) => prev + (prev ? ' ' : '') + transcript);
    };

    rec.start();
    setRecognition(rec);
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
    setListening(false);
  };

  const handleSuggest = async () => {
    if (!promptText.trim()) return;
    setLoading(true);
    setSuggs(null);
    try {
      const res = await api.post<{ data: { reply: string } }>('/costista-chat/interpret', {
        message: `Dada la siguiente descripción de mi cliente "${companyName}", sugerí detalladamente cómo estructurar su costeo en CosteAR. Incluí sugerencias específicas para Materia Prima (valuación PPP, lote óptimo, etc.), Mano de Obra (cargas sociales, ITCS, incentivos) y Costos Indirectos (prorrateo dual fijo/variable por centro productivo/servicio): ${promptText}`,
      });
      setSuggs(res.data.data.reply);
    } catch {
      alert('No se pudo obtener sugerencias. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader
        title="Asistente de Configuración Inicial"
        description="Describí el proceso de la empresa o dictalo por voz para recibir recomendaciones de modelado de costos en base a la cátedra de la UNT."
      />
      <CardBody className="space-y-4">
        <div className="flex gap-2">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Ej: Es una panificadora familiar. Compran harina, levadura y grasa. Tienen 3 empleados en amasado y horneado, y el alquiler del local se distribuye entre producción y ventas..."
            className="flex-1 min-h-[80px] rounded-xl border border-line bg-surface p-3 text-sm text-ink placeholder-idle focus:border-granate focus:outline-none"
          />
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl border transition-all",
              listening
                ? "bg-danger/10 text-danger border-danger/20 animate-pulse"
                : "bg-zinc-50 text-ink-soft border-line hover:bg-granate-tenue hover:text-granate"
            )}
            title={listening ? "Detener dictado" : "Dictar por voz"}
          >
            {listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSuggest}
            loading={loading}
            disabled={!promptText.trim()}
            className="flex items-center gap-2"
          >
            <Sparkles className="size-4" />
            Analizar y Sugerir
          </Button>
        </div>

        {suggs && (
          <div className="rounded-2xl border border-line bg-surface p-4 animate-rise text-ink text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
            <div className="flex items-center gap-2 font-bold text-ink mb-2">
              <Sparkles className="size-4 text-granate" />
              Sugerencia de Configuración
            </div>
            {suggs}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
