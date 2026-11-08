import { useState } from 'react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Hero from './components/ui/Hero';
import ServicesGrid from './components/ui/ServicesGrid';
import SofiaChat from './components/sofia/SofiaChat';

export default function App() {
  const [chatState, setChatState] = useState<'closed' | 'minimized' | 'open'>('closed');

  function openChat() {
    setChatState('open');
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <Hero onOpenChat={openChat} />
        <ServicesGrid onOpenChat={openChat} />
      </main>
      <Footer />
      <SofiaChat state={chatState} onStateChange={setChatState} />
    </div>
  );
}


