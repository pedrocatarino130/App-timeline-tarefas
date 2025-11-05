
import React, { useState, useRef, useEffect } from 'react';
import { GeminiMessage } from '../types';
import { askGemini, hasApiKey, setApiKey, clearApiKey } from '../services/geminiService';
import { BotIcon, CloseIcon, SendIcon } from './Icons';

const GeminiChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<GeminiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isKeyConfigured, setIsKeyConfigured] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsKeyConfigured(hasApiKey());
  }, []);

  useEffect(() => {
    if (isOpen) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      setApiKey(apiKeyInput.trim());
      setIsKeyConfigured(true);
      setShowSettings(false);
      setApiKeyInput('');
      setMessages([{ role: 'model', text: 'API key configured successfully! You can now chat with me.' }]);
    }
  };

  const handleClearApiKey = () => {
    clearApiKey();
    setIsKeyConfigured(false);
    setShowSettings(false);
    setMessages([]);
  };

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    if (!isKeyConfigured) {
      setMessages([{ role: 'model', text: 'Please configure your Gemini API key first. Click the ⚙️ icon.' }]);
      return;
    }

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
          <header className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Gemini Assistant</h3>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Settings"
            >
              <span className="text-xl">{isKeyConfigured ? '⚙️' : '⚠️'}</span>
            </button>
          </header>

          <div className="flex-grow p-4 overflow-y-auto">
            {showSettings ? (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">API Key Configuration</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Get your free API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">Google AI Studio</a>
                  </p>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Enter your Gemini API key"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveApiKey}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      disabled={!apiKeyInput.trim()}
                    >
                      Save Key
                    </button>
                    {isKeyConfigured && (
                      <button
                        onClick={handleClearApiKey}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                {isKeyConfigured && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <p className="text-sm text-green-800 dark:text-green-300">✓ API key is configured</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {!isKeyConfigured && messages.length === 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      ⚠️ Please configure your API key by clicking the settings icon above.
                    </p>
                  </div>
                )}
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
            )}
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
