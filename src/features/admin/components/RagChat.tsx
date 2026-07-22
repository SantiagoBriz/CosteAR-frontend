import { useState, useRef, useEffect } from 'react';
import { 
  useVaultSessions, 
  useVaultSession, 
  useCreateVaultSessionMutation, 
  useVaultSessionQueryMutation, 
  useTranscribeAudioMutation
} from '../admin-hooks';
import { Button } from '@/components/ui/Button';
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
      alert('Error al crear nueva sesión');
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
        alert('Error al iniciar la sesión');
        return;
      }
    }

    const currentQuestion = question;
    setQuestion(''); // Clear input immediately
    
    try {
      await sendQuery.mutateAsync({ sessionId: sessionIdToUse, question: currentQuestion });
    } catch (err) {
      alert('Error al consultar la bóveda');
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
          alert('Error al transcribir el audio');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      alert('No se pudo acceder al micrófono. Verificá los permisos del navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] max-w-6xl mx-auto bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
      
      {/* SIDEBAR: Sesiones */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <Button onClick={handleNewSessionClick} disabled={createSession.isPending} className="w-full flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingSessions ? (
            <div className="p-4 text-center text-sm text-slate-500">Cargando...</div>
          ) : sessions?.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">No hay chats recientes</div>
          ) : (
            sessions?.map((s: any) => (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 truncate transition-colors ${
                  activeSessionId === s.id ? 'bg-slate-200 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-4 h-4 shrink-0 opacity-50" />
                <span className="truncate">{s.title || 'Nueva conversación'}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        <div className="bg-white border-b border-slate-100 p-4 shrink-0 shadow-sm z-10 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-800">
            Bóveda de Conocimiento (RAG)
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!activeSessionId && !loadingSession && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <HelpCircle className="w-12 h-12 text-slate-200" />
              <p>Seleccioná un chat del historial o iniciá uno nuevo para consultar a la Bóveda.</p>
            </div>
          )}

          {activeSession?.messages?.map((msg: any) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'USER' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'USER' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
              }`}>
                {msg.role === 'USER' ? '👤' : '🧠'}
              </div>
              <div className={`space-y-2 max-w-[75%] ${msg.role === 'USER' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 text-sm whitespace-pre-wrap shadow-sm border ${
                  msg.role === 'USER' 
                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm border-blue-700' 
                    : 'bg-slate-50 text-slate-800 rounded-2xl rounded-tl-sm border-slate-200'
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
                  <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <strong className="flex items-center gap-1 text-slate-600 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Fuentes:
                    </strong>
                    <ul className="list-disc pl-4 space-y-1">
                      {msg.citations.map((cite: string, i: number) => (
                        <li key={i} className="font-mono truncate">{cite}</li>
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
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                🧠
              </div>
              <div className="bg-slate-50 text-slate-500 px-4 py-3 rounded-2xl rounded-tl-sm border border-slate-200 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Buscando en la bóveda...
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT BOX */}
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:ring-2 ring-blue-500 ring-offset-2 transition-all">
            <textarea 
              placeholder="Escribí tu consulta..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 resize-none bg-transparent min-h-[44px] max-h-[120px] p-2 focus:outline-none text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAskClick();
                }
              }}
            />
            
            <div className="flex items-center gap-1 shrink-0 pb-1 pr-1">
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
                  className="w-10 h-10 p-0 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200 flex items-center justify-center"
                  title="Grabar mensaje de voz"
                >
                  {transcribeAudio.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-5 h-5" />}
                </Button>
              )}
              
              <Button 
                onClick={handleAskClick} 
                disabled={sendQuery.isPending || transcribeAudio.isPending || (!question.trim() && !activeSessionId)}
                className="w-10 h-10 p-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center justify-center"
              >
                {sendQuery.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
          <div className="text-center mt-2 text-[10px] text-slate-400">
            Groq Whisper Large V3 - RAG sobre {activeSession?.messages?.length || 0} mensajes
          </div>
        </div>
      </div>
    </div>
  );
}
