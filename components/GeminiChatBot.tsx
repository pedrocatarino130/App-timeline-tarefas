
import React, { useState, useRef, useEffect } from 'react';
import { GeminiMessage } from '../types';
import { askGemini } from '../services/geminiService';
import { BotIcon, CloseIcon, SendIcon } from './Icons';

const GeminiChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<GeminiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage: GeminiMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const responseText = await askGemini(input);
    
    const modelMessage: GeminiMessage = { role: 'model', text: responseText };
    setMessages(prev => [...prev, modelMessage]);
    setIsLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-30 w-16 h-16 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-transform transform hover:scale-110"
        aria-label="Open Gemini Chat"
      >
        {isOpen ? <CloseIcon className="w-8 h-8"/> : <BotIcon className="w-8 h-8" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-4 z-30 w-full max-w-sm h-[60vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
          <header className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">Gemini Assistant</h3>
          </header>
          
          <div className="flex-grow p-4 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                 <div className="flex justify-start">
                    <div className="max-w-[80%] p-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask anything..."
                className="flex-grow p-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
              />
              <button onClick={handleSend} disabled={isLoading} className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-blue-300">
                <SendIcon className="w-6 h-6"/>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GeminiChatBot;
