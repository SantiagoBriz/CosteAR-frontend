import { useState, useRef, useEffect } from 'react';
import { 
  useVaultSessions, 
  useVaultSession, 
  useCreateVaultSessionMutation, 
  useVaultSessionQueryMutation, 
  useTranscribeAudioMutation
} from '../admin-hooks';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { 
  Loader2, Send, CheckCircle2, AlertCircle, HelpCircle, 
  Mic, Square, Plus, MessageSquare, BookOpen
} from 'lucide-react';

export function RagChat() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Queries
  const { data: sessions, isLoading: loadingSessions } = useVaultSessions();
  const { data: activeSession, isLoading: loadingSession } = useVaultSession(activeSessionId);
  
  // Mutations
  const createSession = useCreateVaultSessionMutation();
  const sendQuery = useVaultSessionQueryMutation();
  const transcribeAudio = useTranscribeAudioMutation();

  // Handle auto-scroll to bottom of messages
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, sendQuery.isPending]);

  const handleNewSessionClick = async () => {
    try {
      const session = await createSession.mutateAsync();
      setActiveSessionId(session.id);
    } catch (err) {
      toast.error('Error al crear nueva sesión');
    }
  };

  const handleAskClick = async () => {
    if (!question.trim()) return;
    
    let sessionIdToUse: string = activeSessionId ?? '';

    // If no session is active, create one first
    if (!sessionIdToUse) {
      try {
        const newSession = await createSession.mutateAsync();
        sessionIdToUse = newSession.id;
        setActiveSessionId(newSession.id);
      } catch (err) {
        toast.error('Error al iniciar la sesión');
        return;
      }
    }

    const currentQuestion = question;
    setQuestion(''); // Clear input immediately
    
    try {
      await sendQuery.mutateAsync({ sessionId: sessionIdToUse, question: currentQuestion });
    } catch (err) {
      toast.error('Error al consultar la bóveda');
      // Put question back if failed
      setQuestion(currentQuestion);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        try {
          const result = await transcribeAudio.mutateAsync(audioBlob);
          if (result && result.text) {
            setQuestion((prev) => prev + (prev ? ' ' : '') + result.text);
          }
        } catch (err) {
          toast.error('Error al transcribir el audio');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo acceder al micrófono. Verificá los permisos del navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] max-w-6xl mx-auto bg-surface shadow-md border border-line rounded-[24px] overflow-hidden">
      
      {/* SIDEBAR: Sesiones */}
      <div className="w-72 bg-surface-alt border-r border-line flex flex-col z-10 relative">
        <div className="p-5 border-b border-line bg-surface">
          <Button 
            onClick={handleNewSessionClick} 
            disabled={createSession.isPending} 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 shadow-sm shadow-indigo-200/50 flex items-center justify-center gap-2 font-bold transition-all hover:scale-[1.02]"
          >
            <Plus className="w-5 h-5" />
            Nuevo Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loadingSessions ? (
            <div className="p-4 text-center text-sm font-medium text-ink-soft animate-pulse">Cargando chats...</div>
          ) : sessions?.length === 0 ? (
            <div className="p-4 text-center text-sm font-medium text-ink-soft">No hay chats recientes</div>
          ) : (
            sessions?.map((s: any) => (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`w-full text-left px-4 py-3 text-[13px] rounded-[14px] flex items-center gap-3 truncate transition-all duration-200 ${
                  activeSessionId === s.id 
                    ? 'bg-white shadow-sm text-indigo-700 font-bold border border-line scale-100' 
                    : 'text-ink-soft hover:bg-black/5 hover:text-ink scale-95'
                }`}
              >
                <MessageSquare className={`w-4 h-4 shrink-0 ${activeSessionId === s.id ? 'text-indigo-500' : 'opacity-50'}`} />
                <span className="truncate">{s.title || 'Nueva conversación'}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col h-full bg-surface relative">
        <div className="bg-surface border-b border-line p-5 shrink-0 z-10 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/50">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-ink tracking-tight">
                Bóveda de Conocimiento (RAG)
              </h3>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
          {!activeSessionId && !loadingSession && (
            <div className="h-full flex flex-col items-center justify-center text-ink-soft space-y-4">
              <div className="p-6 rounded-full bg-surface-alt border border-line">
                <HelpCircle className="w-12 h-12 text-ink-soft/40" />
              </div>
              <p className="font-medium">Seleccioná un chat del historial o iniciá uno nuevo para consultar a la Bóveda.</p>
            </div>
          )}

          {activeSession?.messages?.map((msg: any) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'USER' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
                msg.role === 'USER' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-surface-alt text-ink border-line'
              }`}>
                {msg.role === 'USER' ? '👤' : '🧠'}
              </div>
              <div className={`space-y-2 max-w-[75%] ${msg.role === 'USER' ? 'items-end' : 'items-start'}`}>
                <div className={`px-5 py-3.5 text-[14px] leading-relaxed whitespace-pre-wrap shadow-sm ${
                  msg.role === 'USER' 
                    ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm border border-indigo-700' 
                    : 'bg-white text-ink rounded-2xl rounded-tl-sm border border-line'
                }`}>
                  {msg.content}
                </div>
                
                {msg.role === 'ASSISTANT' && msg.confidence === 'NONE' && (
                  <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200/50">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>No se encontró respuesta exacta en la Bóveda. Esto ha sido reportado al Nightly Pipeline.</div>
                  </div>
                )}

                {msg.role === 'ASSISTANT' && msg.citations && msg.citations.length > 0 && (
                  <div className="text-xs text-ink-soft bg-surface-alt p-3 rounded-xl border border-line shadow-inner">
                    <strong className="flex items-center gap-1.5 text-ink mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Fuentes:
                    </strong>
                    <ul className="list-disc pl-5 space-y-1">
                      {msg.citations.map((cite: string, i: number) => (
                        <li key={i} className="font-mono truncate opacity-80">{cite}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Pending message bubble indicator */}
          {sendQuery.isPending && (
             <div className="flex gap-4">
              <div className="w-9 h-9 rounded-full bg-surface-alt text-ink flex items-center justify-center shrink-0 shadow-sm border border-line">
                🧠
              </div>
              <div className="bg-white text-ink-soft px-5 py-3.5 rounded-2xl rounded-tl-sm border border-line shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> Buscando en la bóveda...
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT BOX */}
        <div className="p-5 bg-surface border-t border-line shrink-0">
          <div className="relative flex items-end gap-2 bg-surface-alt/40 border border-line rounded-[20px] p-2 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-300 transition-all shadow-inner">
            <textarea 
              placeholder="Escribí tu consulta..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 resize-none bg-transparent min-h-[44px] max-h-[120px] p-2.5 text-[14px] text-ink placeholder:text-ink-soft/60 focus:outline-none outline-none border-none ring-0 focus:ring-0 shadow-none !shadow-none !outline-none"
              style={{ boxShadow: 'none' }}
              spellCheck="false"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAskClick();
                }
              }}
            />
            
            <div className="flex items-center gap-1.5 shrink-0 pb-1.5 pr-1.5">
              {isRecording ? (
                <Button 
                  variant="danger"
                  onClick={stopRecording} 
                  className="w-10 h-10 p-0 rounded-full shadow-sm animate-pulse flex items-center justify-center"
                  title="Detener grabación"
                >
                  <Square className="w-4 h-4 fill-current" />
                </Button>
              ) : (
                <Button 
                  variant="ghost"
                  onClick={startRecording} 
                  disabled={transcribeAudio.isPending || sendQuery.isPending}
                  className="w-10 h-10 p-0 rounded-full text-ink-soft hover:text-ink hover:bg-black/5 flex items-center justify-center transition-colors"
                  title="Grabar mensaje de voz"
                >
                  {transcribeAudio.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-5 h-5" />}
                </Button>
              )}
              
              <Button 
                onClick={handleAskClick} 
                disabled={sendQuery.isPending || transcribeAudio.isPending || (!question.trim() && !activeSessionId)}
                className="w-10 h-10 p-0 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 flex items-center justify-center transition-all hover:scale-105"
              >
                {sendQuery.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
              </Button>
            </div>
          </div>
          <div className="text-center mt-3 text-[11px] font-medium text-ink-soft/70">
            Groq Whisper Large V3 - RAG sobre {activeSession?.messages?.length || 0} mensajes
          </div>
        </div>
      </div>
    </div>
  );
}
