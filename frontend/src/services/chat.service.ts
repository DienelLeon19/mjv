import type { ChatResponse } from '../types/chat';

export const chatTopics = [{ label: 'RUC' }, { label: 'Tasa IGV' }, { label: 'Envío factura electrónica' }];

export async function sendChatMessage(message: string, signal: AbortSignal): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
    signal,
  });
  if (!response.ok) throw new Error('No se pudo consultar la base local');
  return response.json();
}

