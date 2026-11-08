import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageSquare, Minus, Send, X } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { chatTopics } from '../../services/chat.service';

type ChatState = 'closed' | 'minimized' | 'open';

interface SofiaChatProps {
  state: ChatState;
  onStateChange: (state: ChatState) => void;
}

export default function SofiaChat({ state, onStateChange }: SofiaChatProps) {
  const [input, setInput] = useState('');
  const launcher = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const history = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  const { messages, isLoading, send, reset } = useChat();

  useEffect(() => {
    if (state === 'open') {
      panel.current?.focus();
    } else if (restoreFocus.current) {
      launcher.current?.focus();
      restoreFocus.current = false;
    }
  }, [state]);

  useEffect(() => {
    const container = history.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, state]);

  function hide(next: 'closed' | 'minimized') {
    if (next === 'closed') {
      reset();
      setInput('');
    }
    restoreFocus.current = true;
    onStateChange(next);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim() || isLoading) return;
    send(input);
    setInput('');
  }

  if (state !== 'open') {
    return (
      <button
        ref={launcher}
        type="button"
        aria-expanded={false}
        onClick={() => onStateChange('open')}
        className="fixed right-4 bottom-4 z-50 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-white shadow-lg ring-1 ring-white/60 hover:bg-primary-dark sm:right-6 sm:bottom-6"
      >
        <MessageSquare size={19} aria-hidden="true" />
        {state === 'minimized' ? 'Reanudar SOFÍA 2.0' : 'Chatea con SOFÍA 2.0'}
      </button>
    );
  }

  return (
    <section
      ref={panel}
      tabIndex={-1}
      aria-labelledby="sofia-chat-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          hide('minimized');
        }
      }}
      className="fixed inset-x-3 bottom-3 z-50 flex h-[min(34rem,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-2xl border border-gray-border bg-white shadow-2xl focus:outline-none sm:right-6 sm:bottom-6 sm:left-auto sm:w-96 sm:h-[min(34rem,calc(100dvh-3rem))]"
    >
      <header className="flex items-center gap-3 bg-primary-dark px-3 py-3 text-white sm:px-4">
        <span className="rounded-full bg-white/15 p-2"><img src="/assets/sofia-chat.svg" width={24} height={24} alt="" className="sofia-avatar" /></span>
        <div className="min-w-0 flex-1">
          <h2 id="sofia-chat-title" className="font-bold">SOFÍA 2.0</h2>
          <p className="text-xs text-blue-100">Demostración interactiva</p>
        </div>
        <button type="button" aria-label="Minimizar chat" onClick={() => hide('minimized')} className="grid size-10 place-items-center rounded-full hover:bg-white/15">
          <Minus size={19} aria-hidden="true" />
        </button>
        <button type="button" aria-label="Cerrar chat" onClick={() => hide('closed')} className="grid size-10 place-items-center rounded-full hover:bg-white/15">
          <X size={19} aria-hidden="true" />
        </button>
      </header>
      <div ref={history} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gray-light p-4">
        <div role="log" aria-label="Conversación con SOFÍA 2.0" className="flex flex-col gap-3">
          {messages.map((message) => (
            <div key={message.id} className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed wrap-anywhere ${message.role === 'user' ? 'self-end rounded-br-sm bg-primary text-white' : 'self-start rounded-bl-sm border border-gray-border bg-white text-slate-800'}`}>
              <span className="sr-only">{message.role === 'user' ? 'Tú: ' : 'SOFÍA 2.0: '}</span>
              <p className="whitespace-pre-line">{message.content}</p>
              {message.sources?.map(source => (
                <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="mt-3 block border-t border-gray-border pt-2 text-xs text-primary underline underline-offset-2">
                  {source.title} · {source.id}<br />
                  Fuente oficial · {new URL(source.url).hostname}<br />
                  {source.origin === 'suggested' ? 'Enlace sugerido · contenido sin verificar' :
                    source.consultedAt ? 'Consulta web ' + new Date(source.consultedAt).toLocaleString('es-PE', { timeZone: 'America/Lima' }) :
                    'Verificación documental ' + (source.verifiedAt ?? 'pendiente')}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p role="status" className="px-3 text-xs text-primary-dark">{isLoading ? "Consultando documentos locales…" : ""}</p>
      <div role="group" aria-label="Temas sugeridos" className="flex flex-wrap gap-2 border-t border-gray-border px-3 pt-3">
        {chatTopics.map(({ label }) => (
          <button key={label} type="button" disabled={isLoading} onClick={() => send(label)} className="rounded-full border border-primary/25 px-3 py-1.5 text-xs font-semibold text-primary-dark hover:bg-blue-50">
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
        <input
          aria-label="Tu consulta"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={500}
          placeholder="Escribe tu consulta…"
          className="min-w-0 flex-1 rounded-full border border-gray-border bg-gray-light px-4 py-2 text-base text-slate-900"
        />
        <button type="submit" aria-label="Enviar mensaje" disabled={!input.trim() || isLoading} className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-white hover:bg-primary-dark disabled:opacity-45">
          <Send size={17} aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}




