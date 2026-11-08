export interface ChatSource {
  id: string;
  title: string;
  url: string;
  verifiedAt?: string;
  consultedAt?: string;
  origin?: 'local' | 'official_web' | 'suggested';
}

export interface ChatResponse {
  response: string;
  status: 'documented' | 'pending' | 'not_found' | 'official';
  sources: ChatSource[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
}


