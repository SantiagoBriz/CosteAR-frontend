import { useRef, useState } from 'react';
import { Paperclip, X, Send, FileText, Mic, Camera } from 'lucide-react';
import { StructureSelectDropdown } from './StructureSelector';
import { cn } from '@/lib/utils';

const MAX_FILE_BYTES = 4.5 * 1024 * 1024;

function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event: any) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.75
          );
        } else {
          resolve(file);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

interface ChatComposerProps {
  text: string;
  setText: (t: string) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  fileError: string | null;
  setFileError: (err: string | null) => void;
  sendError: string | null;
  sending: boolean;
  activeConnectionId: string | null;
  activeStructureId: string | null;
  onSelectStructure: (id: string | null, name: string | null) => void;
  onSend: () => void;
}

export function ChatComposer({
  text,
  setText,
  file,
  setFile,
  fileError,
  setFileError,
  sendError,
  sending,
  activeConnectionId,
  activeStructureId,
  onSelectStructure,
  onSend,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const isSpeechSupported = !!SpeechRecognition;

  const toggleListening = () => {
    if (!isSpeechSupported) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-AR';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }

      if (finalTranscript) {
        const suffix = text.trim() ? ' ' : '';
        setText(text + suffix + finalTranscript);

        // Trigger auto-resize textarea
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
          }
        }, 0);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    let selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.type.startsWith('image/')) {
      try {
        selected = await compressImage(selected);
      } catch (err) {
        console.error('Error compressing image, using original', err);
      }
    }

    if (selected.size > MAX_FILE_BYTES) {
      setFileError('El archivo supera el límite de 4.5 MB');
      return;
    }
    setFile(selected);
  };

  const handleClearFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  return (
    <div className="border-t border-line bg-surface px-4 py-4 sm:px-6 shadow-[0_-4px_16px_rgba(0,0,0,0.02)] shrink-0">
      {file && (
        <div className="mb-2 flex items-center gap-3 rounded-xl border border-granate/20 bg-granate-tenue px-4 py-2.5">
          {file.type.startsWith('image/') ? (
            <img
              src={URL.createObjectURL(file)}
              alt="preview"
              className="size-10 rounded-lg object-cover border border-line"
            />
          ) : (
            <FileText className="size-6 text-granate" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ink">{file.name}</p>
            <p className="text-[10px] text-ink-soft">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            type="button"
            onClick={handleClearFile}
            className="text-ink-soft hover:text-danger transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      {fileError && <p className="mb-2 text-xs text-danger">{fileError}</p>}
      {sendError && <p className="mb-2 text-xs text-danger">{sendError}</p>}

      <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface-alt px-4 py-2 focus-within:border-granate transition-all">
        {/* Attach File */}
        <label className="shrink-0 cursor-pointer flex items-center justify-center size-8 rounded-xl text-ink-soft hover:text-action hover:bg-surface-alt transition-colors" title="Adjuntar archivo o imagen">
          <Paperclip className="size-5" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        {/* Direct Camera Capture */}
        <label className="shrink-0 cursor-pointer flex items-center justify-center size-8 rounded-xl text-ink-soft hover:text-action hover:bg-surface-alt transition-colors" title="Sacar foto directamente">
          <Camera className="size-5" />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        {/* Voice Dictation (Audio mic button) */}
        {isSpeechSupported && (
          <button
            type="button"
            onClick={toggleListening}
            disabled={!activeConnectionId}
            className={cn(
              "shrink-0 flex items-center justify-center size-8 rounded-xl transition-all",
              isListening
                ? "bg-action text-white animate-pulse"
                : "text-ink-soft hover:text-action hover:bg-surface-alt"
            )}
            title={isListening ? "Detener dictado por voz" : "Dictar por voz"}
          >
            <Mic className="size-5" />
          </button>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none bg-transparent text-sm text-ink placeholder:text-ink-soft/45 focus:!outline-none focus-visible:!outline-none focus-visible:!ring-0 max-h-32 min-h-[32px] py-1.5 leading-relaxed"
          placeholder={
            isListening
              ? 'Escuchando... Hablá ahora...'
              : activeConnectionId
                ? 'Escribí una nota o adjuntá facturas/recibos de este producto...'
                : 'Seleccioná una empresa primero'
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={!activeConnectionId || isListening}
          rows={1}
          style={{ height: 'auto' }}
          onInput={(e) => {
            const t = e.currentTarget;
            t.style.height = 'auto';
            t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
          }}
        />

        {/* Audio soundwave visualization helper */}
        {isListening && (
          <div className="flex items-center gap-1.5 px-2 h-8 shrink-0">
            <span className="w-[3px] h-3 bg-action rounded-full animate-pulse" />
            <span className="w-[3px] h-5 bg-action rounded-full animate-pulse delay-75" />
            <span className="w-[3px] h-4 bg-action rounded-full animate-pulse delay-150" />
            <span className="w-[3px] h-2 bg-action rounded-full animate-pulse delay-200" />
          </div>
        )}

        {/* Send */}
        <button
          type="button"
          onClick={onSend}
          disabled={(!text.trim() && !file) || sending || !activeConnectionId}
          className="flex shrink-0 size-8 items-center justify-center rounded-xl bg-action text-white hover:bg-action-soft hover:shadow-md transition-all active:scale-95 disabled:opacity-30 disabled:scale-100"
        >
          {sending ? (
            <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Send className="size-4" />
          )}
        </button>
      </div>

      {/* Selector de Producto rápido */}
      <div className="mt-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
            Asignar a producto:
          </span>
          {activeConnectionId ? (
            <StructureSelectDropdown
              connectionId={activeConnectionId}
              selectedStructureId={activeStructureId}
              onSelect={onSelectStructure}
            />
          ) : (
            <span className="text-[10px] text-danger">Selecciona empresa</span>
          )}
        </div>
        <p className="text-[10px] text-ink-soft/60 hidden sm:block">
          Enter para enviar · Shift+Enter para salto de línea
        </p>
      </div>
    </div>
  );
}
