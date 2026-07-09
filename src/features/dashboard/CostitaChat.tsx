/**
 * CostitaChat — Chat de IA para el costista.
 *
 * Flujo UX:
 *  1. Botón flotante en el dashboard → abre un panel lateral
 *  2. Pantalla inicial: botones de acciones frecuentes (bot-like quick replies)
 *  3. El costista elige una o escribe libremente
 *  4. La IA interpreta y muestra una tarjeta de acción propuesta
 *  5. Confirmación explícita antes de cualquier cambio en la DB
 */

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  X, Send, ChevronRight, CheckCircle2,
  AlertTriangle, Loader2, Sparkles,
  Check, XIcon, Building2, ClipboardCheck, Zap, User,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ProposedEntry {
  companyId: string;
  companyName: string;
  rawContent: string;
  costSection: string;
  documentType: string;
  estimatedImpact?: string;
}

interface ProposedAlert {
  companyId: string;
  companyName: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface AIResponse {
  reply: string;
  actionType: 'CREATE_ENTRY' | 'CREATE_ALERT' | 'INFO_ONLY';
  proposedEntry?: ProposedEntry;
  proposedAlert?: ProposedAlert;
  confidence: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  aiResponse?: AIResponse;   // Solo en mensajes del asistente
  confirmed?: boolean;       // Si la acción ya fue confirmada/rechazada
}

// ── Opciones precargadas ──────────────────────────────────────────────────────

const QUICK_OPTIONS = [
  {
    id: 'empresa',
    icon: Building2,
    label: '¿Cómo cargo una nueva empresa?',
    sub: 'Gestión y alta de clientes',
    color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  },
  {
    id: 'estructura',
    icon: ClipboardCheck,
    label: '¿Cómo creo una estructura de costos?',
    sub: 'Configurar productos y procesos',
    color: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
  },
  {
    id: 'invitar',
    icon: User,
    label: '¿Cómo invito a un operador?',
    sub: 'Asignar permisos de carga',
    color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  },
  {
    id: 'exportar',
    icon: Zap,
    label: '¿Cómo descargo reportes en Excel?',
    sub: 'Exportar cálculos terminados',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function sectionLabel(section: string) {
  const map: Record<string, string> = {
    MATERIA_PRIMA: 'Materia Prima',
    MANO_DE_OBRA: 'Mano de Obra',
    COSTOS_INDIRECTOS: 'Costos Indirectos',
    VENTAS: 'Ventas',
    DESCONOCIDO: 'Sin clasificar',
  };
  return map[section] ?? section;
}

function severityLabel(s: string) {
  return s === 'HIGH' ? 'Alta' : s === 'MEDIUM' ? 'Media' : 'Baja';
}

function severityColor(s: string) {
  return s === 'HIGH'
    ? 'bg-red-100 text-red-700'
    : s === 'MEDIUM'
    ? 'bg-amber-100 text-amber-700'
    : 'bg-gray-100 text-gray-600';
}

// ── Tipos de empresa (prop) ───────────────────────────────────────────────────

interface Company {
  id: string;
  name: string;
  industry?: string | null;
}

// ── Componente principal ──────────────────────────────────────────────────────

export function CostitaChat({ companies = [] }: { companies?: Company[] }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [showQuick, setShowQuick] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [open, messages]);

  // --- Mutations ---

  const interpretMutation = useMutation({
    mutationFn: async (message: string) => {
      const history = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await api.post<{ data: AIResponse }>('/costista-chat/interpret', {
        message,
        conversationHistory: history,
      });
      return res.data.data;
    },
    onSuccess: (aiResponse, _message) => {
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: aiResponse.reply,
        aiResponse,
        confirmed: aiResponse.actionType === 'INFO_ONLY' ? true : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Ups, hubo un problema. Intentá de nuevo.',
        },
      ]);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async ({
      msgId,
      aiResponse,
    }: {
      msgId: string;
      aiResponse: AIResponse;
    }) => {
      const res = await api.post<{ data: { success: true; id: string } }>(
        '/costista-chat/confirm',
        {
          actionType: aiResponse.actionType,
          proposedEntry: aiResponse.proposedEntry,
          proposedAlert: aiResponse.proposedAlert,
        },
      );
      return { msgId, result: res.data.data };
    },
    onSuccess: ({ msgId }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, confirmed: true } : m)),
      );
      // Mensaje de éxito del sistema
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '✅ Listo, la acción fue registrada correctamente.',
        },
      ]);
    },
    onError: (_err, { msgId }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, confirmed: false } : m)),
      );
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'No se pudo aplicar la acción. Revisá los datos e intentá de nuevo.',
        },
      ]);
    },
  });

  // --- Handlers ---

  function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || interpretMutation.isPending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: msg,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setShowQuick(false);
    interpretMutation.mutate(msg);
  }

  function handleQuick(opt: (typeof QUICK_OPTIONS)[number]) {
    handleSend(opt.label);
  }

  function handleConfirm(msgId: string, aiResponse: AIResponse) {
    confirmMutation.mutate({ msgId, aiResponse });
    // Marcar como procesando
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, confirmed: undefined } : m)),
    );
  }

  function handleReject(msgId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, confirmed: false } : m)),
    );
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Entendido, la acción fue descartada. ¿Necesitás algo más?',
      },
    ]);
  }

  function handleReset() {
    setMessages([]);
    setShowQuick(true);
    setInput('');
  }

  // --- Render ---

  return (
    <>
      {/* ── Botón flotante ────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center gap-2 rounded-full px-4 py-3',
          'bg-gray-900 text-white shadow-xl hover:bg-gray-800 transition-all hover:scale-105',
          'text-[13px] font-semibold',
          open && 'opacity-0 pointer-events-none',
        )}
      >
        <Sparkles className="size-4" />
        Asistente CosteAR
      </button>

      {/* ── Overlay ───────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Panel lateral ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          'fixed bottom-0 right-0 z-50 flex flex-col',
          'w-full lg:w-[420px] h-[85vh] lg:h-[620px] lg:bottom-6 lg:right-6',
          'rounded-t-2xl lg:rounded-2xl bg-white shadow-2xl',
          'transition-all duration-300 ease-out',
          open ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none',
        )}
        style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gray-900">
              <Sparkles className="size-3.5 text-white" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-800">Asistente CosteAR</p>
              <p className="text-[11px] text-gray-400">Guía de uso y soporte</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleReset}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                Nueva consulta
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="flex size-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

            {/* Welcome + quick options */}
            {showQuick && messages.length === 0 && (
              <div>
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-900 mt-0.5">
                    <Sparkles className="size-3 text-white" />
                  </div>
                  <div className="rounded-2xl rounded-tl-none bg-gray-50 px-4 py-3 text-[13px] leading-relaxed text-gray-700">
                    ¡Hola! Soy tu asistente de CosteAR. Podés preguntarme cómo operar el sistema, cómo crear estructuras de costos, invitar operadores o exportar tus reportes a Excel. ¿En qué te puedo ayudar hoy?
                  </div>
                </div>

                {/* Quick option buttons */}
                <div className="grid grid-cols-2 gap-2 pl-10">
                  {QUICK_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleQuick(opt)}
                      className={cn(
                        'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors',
                        opt.color,
                      )}
                    >
                      <opt.icon className="size-3.5" />
                      <p className="text-[12px] font-semibold leading-tight">{opt.label}</p>
                      <p className="text-[10px] opacity-70">{opt.sub}</p>
                    </button>
                  ))}
                </div>

                <p className="mt-3 pl-10 text-[11px] text-gray-400">
                  O escribí libremente ↓
                </p>
              </div>
            )}

            {/* Conversation messages */}
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === 'user' ? (
                  /* User bubble */
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-none bg-gray-900 px-4 py-2.5 text-[13px] text-white">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  /* Assistant bubble */
                  <div className="flex items-start gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-900 mt-0.5">
                      <Sparkles className="size-3 text-white" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="rounded-2xl rounded-tl-none bg-gray-50 px-4 py-3 text-[13px] leading-relaxed text-gray-700">
                        {msg.content}
                      </div>

                      {/* Selector de empresa (cuando la IA no pudo identificarla) */}
                      {msg.aiResponse &&
                        msg.aiResponse.actionType !== 'INFO_ONLY' &&
                        msg.confirmed === undefined &&
                        !interpretMutation.isPending &&
                        needsCompanySelection(msg.aiResponse) &&
                        companies.length > 0 && (
                          <CompanyChips
                            companies={companies}
                            onSelect={(company) => {
                              handleSend(`La empresa es ${company.name}`);
                            }}
                          />
                        )}

                      {/* Tarjeta de acción propuesta (solo cuando ya tiene empresa) */}
                      {msg.aiResponse &&
                        msg.aiResponse.actionType !== 'INFO_ONLY' &&
                        !needsCompanySelection(msg.aiResponse) && (
                          <ActionCard
                            aiResponse={msg.aiResponse}
                            msgId={msg.id}
                            confirmed={msg.confirmed}
                            onConfirm={handleConfirm}
                            onReject={handleReject}
                            isPending={confirmMutation.isPending && confirmMutation.variables?.msgId === msg.id}
                          />
                        )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {interpretMutation.isPending && (
              <div className="flex items-center gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-900">
                  <Sparkles className="size-3 text-white" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-none bg-gray-50 px-4 py-3">
                  <Loader2 className="size-3.5 animate-spin text-gray-400" />
                  <span className="text-[12px] text-gray-400">Analizando...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-gray-400 focus-within:bg-white transition-all">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Escribí tu consulta..."
                className="flex-1 bg-transparent text-[13px] text-gray-800 placeholder-gray-400 outline-none"
                disabled={interpretMutation.isPending}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || interpretMutation.isPending}
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                  input.trim()
                    ? 'bg-gray-900 text-white hover:bg-gray-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed',
                )}
              >
                <Send className="size-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-gray-300">
              Soporte técnico y guía de uso del software CosteAR
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Tarjeta de acción propuesta ────────────────────────────────────────────────

// ── Helpers ───────────────────────────────────────────────────────────────────

/** La IA propone una acción pero no identificó la empresa → hay que pedirla */
function needsCompanySelection(aiResponse: AIResponse): boolean {
  if (aiResponse.actionType === 'CREATE_ENTRY') {
    return !aiResponse.proposedEntry?.companyId;
  }
  if (aiResponse.actionType === 'CREATE_ALERT') {
    return !aiResponse.proposedAlert?.companyId;
  }
  return false;
}

// ── Chips de empresa ──────────────────────────────────────────────────────────

function CompanyChips({
  companies,
  onSelect,
}: {
  companies: Company[];
  onSelect: (company: Company) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        ¿Para qué empresa?
      </p>
      <div className="flex flex-wrap gap-2">
        {companies.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 active:scale-95"
          >
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[9px] font-bold text-gray-600">
              {c.name[0]?.toUpperCase()}
            </span>
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Tarjeta de acción propuesta ────────────────────────────────────────────────

function ActionCard({
  aiResponse,
  msgId,
  confirmed,
  onConfirm,
  onReject,
  isPending,
}: {
  aiResponse: AIResponse;
  msgId: string;
  confirmed?: boolean;
  onConfirm: (msgId: string, aiResponse: AIResponse) => void;
  onReject: (msgId: string) => void;
  isPending: boolean;
}) {
  const isEntry = aiResponse.actionType === 'CREATE_ENTRY';
  const isAlert = aiResponse.actionType === 'CREATE_ALERT';

  if (confirmed === true) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2">
        <CheckCircle2 className="size-3.5 text-emerald-600" />
        <p className="text-[11px] font-medium text-emerald-700">Acción confirmada y registrada</p>
      </div>
    );
  }

  if (confirmed === false) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2">
        <XIcon className="size-3.5 text-gray-400" />
        <p className="text-[11px] text-gray-500">Acción descartada</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white">
      {/* Header de la tarjeta */}
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
        {isEntry ? (
          <ChevronRight className="size-3.5 text-violet-600" />
        ) : (
          <AlertTriangle className="size-3.5 text-amber-600" />
        )}
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
          {isEntry ? 'Acción propuesta: Registrar evento' : 'Acción propuesta: Crear alerta'}
        </p>
        {aiResponse.confidence >= 70 && (
          <span className="ml-auto rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
            {aiResponse.confidence}% confianza
          </span>
        )}
      </div>

      {/* Detalles */}
      <div className="px-3 py-3 space-y-2">
        {isEntry && aiResponse.proposedEntry && (
          <>
            <Row label="Empresa" value={aiResponse.proposedEntry.companyName || 'Sin empresa'} />
            <Row label="Sección" value={sectionLabel(aiResponse.proposedEntry.costSection)} />
            <Row label="Tipo" value={aiResponse.proposedEntry.documentType} />
            {aiResponse.proposedEntry.estimatedImpact && (
              <Row label="Impacto" value={aiResponse.proposedEntry.estimatedImpact} highlight />
            )}
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-gray-400">Descripción</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-gray-700">
                {aiResponse.proposedEntry.rawContent}
              </p>
            </div>
          </>
        )}

        {isAlert && aiResponse.proposedAlert && (
          <>
            <Row label="Empresa" value={aiResponse.proposedAlert.companyName || 'Sin empresa'} />
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-gray-500">Severidad</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', severityColor(aiResponse.proposedAlert.severity))}>
                {severityLabel(aiResponse.proposedAlert.severity)}
              </span>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-gray-400">Mensaje de alerta</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-gray-700">
                {aiResponse.proposedAlert.message}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Botones de confirmación */}
      <div className="flex gap-2 border-t border-gray-100 px-3 py-2.5">
        <button
          onClick={() => onReject(msgId)}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <XIcon className="size-3.5" />
          Descartar
        </button>
        <button
          onClick={() => onConfirm(msgId, aiResponse)}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-900 py-2 text-[12px] font-semibold text-white hover:bg-gray-700 transition-colors"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          Confirmar
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium text-gray-500">{label}</span>
      <span className={cn('text-[12px] font-semibold', highlight ? 'text-violet-700' : 'text-gray-700')}>
        {value}
      </span>
    </div>
  );
}
