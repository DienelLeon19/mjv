import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types/chat';
import { sendChatMessage } from '../services/chat.service';

const welcome: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! Soy SOFÍA 2.0. Consulta la base documental local. Te mostraré las fuentes y señalaré los datos pendientes de verificación. No ingreses datos personales ni credenciales.',
};

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [isLoading, setIsLoading] = useState(false);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setIsLoading(true);
    setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'user', content: trimmed }]);
    try {
      const reply = await sendChatMessage(trimmed, AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]));
      if (!controller.signal.aborted) {
        setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'assistant', content: reply.response, sources: reply.sources }]);
      }
    } catch {
      if (!controller.signal.aborted) {
        setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'assistant', content: 'No pude consultar la base documental local. Comprueba que el backend esté disponible e inténtalo nuevamente.' }]);
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        setIsLoading(false);
      }
    }
  }

  function reset() {
    request.current?.abort();
    request.current = null;
    setIsLoading(false);
    setMessages([welcome]);
  }

  return { messages, isLoading, send, reset };
}

