import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, BarChart3, Database, BookOpen, Rocket, FileSpreadsheet } from 'lucide-react';
import ExoplanetPlayground from '../App';
import DataAnalyzer from './DataAnalyzer';
import { chatWithGroq } from '../services/groqService';

const NASAChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [currentView, setCurrentView] = useState('chat'); // 'chat', 'dashboard', 'data', 'nwiki', 'analyzer'
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const suggestedPrompts = [
    {
      icon: <FileSpreadsheet size={20} />,
      text: "Analyze Data",
      description: "Upload and analyze your own datasets",
      action: () => setCurrentView('analyzer')
    },
    {
      icon: <BarChart3 size={20} />,
      text: "Open Dashboard",
      description: "Train neural networks on exoplanet data",
      action: () => setCurrentView('dashboard')
    },
    {
      icon: <Database size={20} />,
      text: "Browse Data",
      description: "Explore NASA's exoplanet datasets",
      action: () => setCurrentView('data')
    },
    {
      icon: <BookOpen size={20} />,
      text: "NWiki",
      description: "Learn about exoplanets and detection methods",
      action: () => setCurrentView('nwiki')
    }
  ];

  const quickPrompts = [
    "What is an exoplanet?",
    "How does the transit method work?",
    "Tell me about Kepler-452b",
    "What datasets are available?",
    "How do I train a neural network?",
    "What is TESS mission?"
  ];

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    try {
      // Use Groq API for real AI response
      const conversationHistory = [...messages, userMessage].map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const aiContent = await chatWithGroq(conversationHistory);
      
      const aiResponse = {
        role: 'assistant',
        content: aiContent,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Fallback to local response if Groq fails
      const aiResponse = {
        role: 'assistant',
        content: generateResponse(currentInput),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const generateResponse = (query) => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('exoplanet') && lowerQuery.includes('what')) {
      return "An exoplanet is a planet that orbits a star outside our solar system. Scientists have discovered over 5,500 confirmed exoplanets using methods like the transit method (watching for dimming of stars) and radial velocity (detecting stellar wobbles). Our dashboard lets you explore real NASA data from missions like Kepler and TESS!";
    } else if (lowerQuery.includes('transit') || lowerQuery.includes('method')) {
      return "The transit method detects exoplanets by measuring the slight dimming of a star's light when a planet passes in front of it. This is like watching a fly cross in front of a headlight - tiny but detectable! The Kepler and TESS missions use this method. You can see real transit data in our Dashboard.";
    } else if (lowerQuery.includes('kepler-452')) {
      return "Kepler-452b is often called 'Earth's cousin'! Discovered in 2015, it orbits a Sun-like star in the habitable zone with an orbital period of 385 days. It's about 60% larger than Earth. You can find this and other Kepler discoveries in our Data section!";
    } else if (lowerQuery.includes('dataset') || lowerQuery.includes('data')) {
      return "We have access to NASA's Exoplanet Archive with several datasets:\n\n🔭 Kepler Mission: ~2,700 confirmed exoplanets\n🛰️ TESS Survey: ~400 discoveries\n🪐 All Confirmed: 5,500+ exoplanets\n📡 Radial Velocity: ~900 planets\n🌌 Microlensing: ~200 detections\n\nClick 'Browse Data' below to explore!";
    } else if (lowerQuery.includes('train') || lowerQuery.includes('neural network')) {
      return "Training a neural network on exoplanet data:\n\n1. Select a dataset (Kepler, TESS, etc.)\n2. Choose features (orbital period, transit depth, etc.)\n3. Configure your network architecture\n4. Adjust hyperparameters (learning rate, batch size)\n5. Hit Play and watch it learn!\n\nOur Dashboard makes it interactive and visual. Want to try it?";
    } else if (lowerQuery.includes('tess')) {
      return "TESS (Transiting Exoplanet Survey Satellite) launched in 2018 and surveys nearly the entire sky for exoplanets around nearby bright stars. Unlike Kepler which stared at one region, TESS observes different parts of the sky every 27 days. It's discovered hundreds of new worlds! Check out TESS data in our Dashboard.";
    } else {
      return "That's an interesting question about exoplanets! I can help you with:\n\n• Understanding exoplanet detection methods\n• Exploring NASA datasets (Kepler, TESS)\n• Training neural networks on real data\n• Learning about specific exoplanets\n\nTry the Dashboard to interact with real NASA data, or ask me anything specific!";
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render different views
  if (currentView === 'analyzer') {
    return <DataAnalyzer />;
  }

  if (currentView === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-blue-900 to-purple-900 text-white p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView('chat')}
                className="flex items-center gap-2 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors"
              >
                <Rocket size={24} />
                <span className="font-bold text-xl">NASA DataPilot</span>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentView('chat')}
                className="px-4 py-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                Chat
              </button>
              <button className="px-4 py-2 bg-white/20 rounded-lg">
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('data')}
                className="px-4 py-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                Data
              </button>
              <button
                onClick={() => setCurrentView('nwiki')}
                className="px-4 py-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                NWiki
              </button>
            </div>
          </div>
        </div>
        <ExoplanetPlayground />
      </div>
    );
  }

  if (currentView === 'data') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-blue-900 to-purple-900 text-white p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView('chat')}
                className="flex items-center gap-2 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors"
              >
                <Rocket size={24} />
                <span className="font-bold text-xl">NASA DataPilot</span>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentView('chat')}
                className="px-4 py-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                Chat
              </button>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="px-4 py-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                Dashboard
              </button>
              <button className="px-4 py-2 bg-white/20 rounded-lg">
                Data
              </button>
              <button
                onClick={() => setCurrentView('nwiki')}
                className="px-4 py-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                NWiki
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6">NASA Exoplanet Datasets</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Kepler Mission', count: '2,700+', icon: '🔭', description: 'Transit photometry data from Kepler Space Telescope' },
              { name: 'TESS Survey', count: '400+', icon: '🛰️', description: 'All-sky transit survey from TESS satellite' },
              { name: 'All Confirmed', count: '5,500+', icon: '🪐', description: 'Complete confirmed exoplanet catalog' },
              { name: 'Radial Velocity', count: '900+', icon: '📡', description: 'Doppler spectroscopy detections' },
              { name: 'Microlensing', count: '200+', icon: '🌌', description: 'Gravitational lensing discoveries' },
              { name: 'Direct Imaging', count: '50+', icon: '📸', description: 'Directly photographed exoplanets' }
            ].map((dataset, idx) => (
              <div key={idx} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-3">{dataset.icon}</div>
                <h3 className="text-xl font-bold mb-2">{dataset.name}</h3>
                <div className="text-3xl font-bold text-blue-600 mb-2">{dataset.count}</div>
                <p className="text-gray-600 text-sm">{dataset.description}</p>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors"
                >
                  Explore Dataset
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'nwiki') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-blue-900 to-purple-900 text-white p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView('chat')}
                className="flex items-center gap-2 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors"
              >
                <Rocket size={24} />
                <span className="font-bold text-xl">NASA DataPilot</span>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentView('chat')}
                className="px-4 py-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                Chat
              </button>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="px-4 py-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('data')}
                className="px-4 py-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                Data
              </button>
              <button className="px-4 py-2 bg-white/20 rounded-lg">
                NWiki
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6">NWiki - NASA Knowledge Base</h1>
          <div className="space-y-6">
            {[
              {
                title: 'What is an Exoplanet?',
                content: 'An exoplanet is a planet that orbits a star outside our solar system. Since 1992, scientists have discovered over 5,500 confirmed exoplanets using various detection methods.'
              },
              {
                title: 'Detection Methods',
                content: 'Transit Method: Detecting planets by measuring the dimming of starlight when a planet passes in front. Radial Velocity: Detecting the wobble of stars caused by orbiting planets. Direct Imaging: Taking actual photos of exoplanets. Microlensing: Using gravitational lensing effects.'
              },
              {
                title: 'The Kepler Mission',
                content: 'Launched in 2009, the Kepler Space Telescope discovered over 2,700 confirmed exoplanets by staring at 150,000 stars in a single patch of sky. It revolutionized our understanding of planetary systems.'
              },
              {
                title: 'TESS Mission',
                content: 'The Transiting Exoplanet Survey Satellite (TESS) launched in 2018 surveys nearly the entire sky for exoplanets around nearby bright stars, making follow-up observations easier.'
              },
              {
                title: 'Habitable Zone',
                content: 'The habitable zone (or "Goldilocks zone") is the region around a star where conditions might be right for liquid water to exist on a planet\'s surface - a key ingredient for life as we know it.'
              },
              {
                title: 'Neural Networks for Exoplanets',
                content: 'Machine learning helps analyze massive datasets to identify exoplanet candidates that humans might miss. Our dashboard lets you train neural networks on real NASA data!'
              }
            ].map((article, idx) => (
              <div key={idx} className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold mb-3 text-blue-900">{article.title}</h2>
                <p className="text-gray-700 leading-relaxed">{article.content}</p>
                <button
                  onClick={() => {
                    setInputValue(`Tell me more about ${article.title.toLowerCase()}`);
                    setCurrentView('chat');
                  }}
                  className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Ask AI about this →
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main chat view
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {messages.length === 0 ? (
        /* Welcome screen - centered layout */
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-screen">
          {/* Logo and Title */}
          <div className="text-center mb-12">
            <div className="mb-6 flex justify-center">
              <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border-2 border-white/20">
                <Rocket size={48} className="text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-white mb-3">
              NASA DataPilot
            </h1>
            <p className="text-lg text-gray-400">
              Your AI copilot for NASA data analysis
            </p>
          </div>

          {/* Search Box */}
          <div className="w-full max-w-3xl mb-8">
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..."
                className="w-full bg-zinc-900 text-white placeholder-gray-500 px-6 py-4 pr-14 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-700 transition-colors text-lg"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-teal-600 hover:bg-teal-700 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white p-2.5 rounded-lg transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </div>

          {/* Action buttons - horizontally scrolling */}
          <div className="w-full max-w-4xl mb-8">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={prompt.action}
                  className="flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-3 rounded-xl transition-all border border-zinc-800 flex-shrink-0"
                >
                  <div className="text-teal-500">{prompt.icon}</div>
                  <div className="text-left">
                    <div className="font-medium text-sm">{prompt.text}</div>
                    <div className="text-xs text-gray-500">{prompt.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick prompt suggestions */}
          <div className="w-full max-w-3xl">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputValue(prompt)}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white p-3 rounded-lg text-sm transition-all border border-zinc-800 text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Chat view with messages */
        <div className="w-full h-screen flex flex-col">
          {/* Header */}
          <div className="bg-zinc-900 border-b border-zinc-800 p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Rocket size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">NASA DataPilot</h1>
                  <p className="text-xs text-gray-400">AI Copilot</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMessages([]);
                  setInputValue('');
                }}
                className="text-gray-400 hover:text-white text-sm"
              >
                New Chat
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 bg-black">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl p-4 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-teal-600 text-white'
                        : 'bg-zinc-900 text-white border border-zinc-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area */}
          <div className="bg-black border-t border-zinc-800 p-4">
            <div className="max-w-4xl mx-auto">
              {/* Action buttons */}
              <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={prompt.action}
                    className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg transition-all border border-zinc-800 flex-shrink-0"
                  >
                    <div className="text-teal-500">{prompt.icon}</div>
                    <span className="text-sm font-medium">{prompt.text}</span>
                  </button>
                ))}
              </div>

              {/* Input box */}
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question..."
                  className="w-full bg-zinc-900 text-white placeholder-gray-500 px-6 py-4 pr-14 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-700 transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-teal-600 hover:bg-teal-700 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white p-2.5 rounded-lg transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default NASAChat;

