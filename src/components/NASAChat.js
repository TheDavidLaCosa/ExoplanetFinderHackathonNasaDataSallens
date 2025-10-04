import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, BarChart3, Database, BookOpen, Rocket } from 'lucide-react';
import ExoplanetPlayground from '../App';
import { chatWithGroq } from '../services/groqService';

const NASAChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [currentView, setCurrentView] = useState('chat'); // 'chat', 'dashboard', 'data', 'nwiki'
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
  if (currentView === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Main Header */}
        <div className="text-white py-6 px-6" style={{background: '#07173F'}}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Left Side - Logo and Title */}
            <div className="flex items-center gap-6">
              <img 
                src="/space-apps-logo-white.png" 
                alt="NASA Space Apps Challenge" 
                className="h-16 w-auto"
              />
              <div>
                <h1 className="text-3xl font-black leading-tight" style={{fontFamily: 'Fira Sans, sans-serif'}}>
                  NASA Exoplanet Neural Network Playground
                </h1>
                <p className="text-lg mt-1" style={{color: '#EAFE07', fontFamily: 'Overpass, sans-serif'}}>
                  Train a neural network to classify exoplanet candidates
                </p>
              </div>
            </div>
            
            {/* Right Side - Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentView('chat')}
                className="text-white px-6 py-3 rounded-lg transition-all font-semibold"
                style={{
                  fontFamily: 'Overpass, sans-serif',
                  fontSize: '16px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#0960E1';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                Chat
              </button>
              <button 
                onClick={() => setCurrentView('dashboard')}
                className="text-white px-6 py-3 rounded-lg transition-all font-semibold"
                style={{
                  fontFamily: 'Overpass, sans-serif',
                  fontSize: '16px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#0960E1';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('data')}
                className="text-white px-6 py-3 rounded-lg transition-all font-semibold"
                style={{
                  fontFamily: 'Overpass, sans-serif',
                  fontSize: '16px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#0960E1';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                Data
              </button>
              <button
                onClick={() => setCurrentView('nwiki')}
                className="text-white px-6 py-3 rounded-lg transition-all font-semibold"
                style={{
                  fontFamily: 'Overpass, sans-serif',
                  fontSize: '16px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#0960E1';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
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
        {/* Main Header */}
        <div className="text-white py-6 px-6" style={{background: '#07173F'}}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Left Side - Logo and Title */}
            <div className="flex items-center gap-6">
              <img 
                src="/space-apps-logo-white.png" 
                alt="NASA Space Apps Challenge" 
                className="h-16 w-auto"
              />
              <div>
                <h1 className="text-3xl font-black leading-tight" style={{fontFamily: 'Fira Sans, sans-serif'}}>
                  NASA Exoplanet Neural Network Playground
                </h1>
                <p className="text-lg mt-1" style={{color: '#EAFE07', fontFamily: 'Overpass, sans-serif'}}>
                  Train a neural network to classify exoplanet candidates
                </p>
              </div>
            </div>
            
            {/* Right Side - Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentView('chat')}
                className="text-white px-6 py-3 rounded-lg transition-all font-semibold"
                style={{
                  fontFamily: 'Overpass, sans-serif',
                  fontSize: '16px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#0960E1';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                Chat
              </button>
              <button 
                onClick={() => setCurrentView('dashboard')}
                className="text-white px-6 py-3 rounded-lg transition-all font-semibold"
                style={{
                  fontFamily: 'Overpass, sans-serif',
                  fontSize: '16px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#0960E1';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('data')}
                className="text-white px-6 py-3 rounded-lg transition-all font-semibold"
                style={{
                  fontFamily: 'Overpass, sans-serif',
                  fontSize: '16px',
                  backgroundColor: '#0960E1'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#0042A6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#0960E1';
                }}
              >
                Data
              </button>
              <button
                onClick={() => setCurrentView('nwiki')}
                className="text-white px-6 py-3 rounded-lg transition-all font-semibold"
                style={{
                  fontFamily: 'Overpass, sans-serif',
                  fontSize: '16px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#0960E1';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
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
        {/* Main Header */}
        <div className="text-white py-6 px-6" style={{background: '#07173F'}}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Left Side - Logo and Title */}
            <div className="flex items-center gap-6">
              <img 
                src="/space-apps-logo-white.png" 
                alt="NASA Space Apps Challenge" 
                className="h-16 w-auto"
              />
              <div>
                <h1 className="text-3xl font-black leading-tight" style={{fontFamily: 'Fira Sans, sans-serif'}}>
                  NASA Exoplanet Neural Network Playground
                </h1>
                <p className="text-lg mt-1" style={{color: '#EAFE07', fontFamily: 'Overpass, sans-serif'}}>
                  Train a neural network to classify exoplanet candidates
                </p>
              </div>
            </div>
            
            {/* Right Side - Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentView('chat')}
                className="text-white px-6 py-3 rounded-lg transition-all font-semibold"
                style={{
                  fontFamily: 'Overpass, sans-serif',
                  fontSize: '16px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#0960E1';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                Chat
              </button>
              <button 
                onClick={() => setCurrentView('dashboard')}
                className="text-white px-6 py-3 rounded-lg transition-all font-semibold"
                style={{
                  fontFamily: 'Overpass, sans-serif',
                  fontSize: '16px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#0960E1';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('data')}
                className="text-white px-6 py-3 rounded-lg transition-all font-semibold"
                style={{
                  fontFamily: 'Overpass, sans-serif',
                  fontSize: '16px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#0960E1';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                Data
              </button>
              <button
                onClick={() => setCurrentView('nwiki')}
                className="text-white px-6 py-3 rounded-lg transition-all font-semibold"
                style={{
                  fontFamily: 'Overpass, sans-serif',
                  fontSize: '16px',
                  backgroundColor: '#0960E1'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#0042A6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#0960E1';
                }}
              >
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
      <div className="min-h-screen" style={{
        backgroundColor: '#07173F'
      }}>
      {messages.length === 0 ? (
        /* Welcome screen - centered layout */
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-screen p-4">
          {/* NASA Space Apps Logo */}
          <div className="text-center mb-12">
            <div className="mb-6 flex justify-center">
              <img 
                src="/space-apps-logo-white.png" 
                alt="NASA Space Apps Challenge" 
                className="h-20 w-auto"
              />
            </div>
            <h1 className="text-5xl font-bold mb-3" style={{fontFamily: 'Fira Sans, sans-serif', color: '#FFFFFF'}}>
              NASA DataPilot
            </h1>
            <p className="text-lg" style={{color: '#FFFFFF', fontFamily: 'Overpass, sans-serif'}}>
              Your AI copilot for NASA data analysis
            </p>
          </div>

          {/* Search Box */}
          <div className="w-full max-w-3xl mb-4">
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..."
                className="w-full text-black placeholder-gray-600 px-6 py-4 pr-14 rounded-xl focus:outline-none transition-colors text-lg"
                style={{
                  backgroundColor: '#FFFFFF',
                  fontFamily: 'Overpass, sans-serif'
                }}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white p-2.5 rounded-lg transition-colors"
                style={{
                  backgroundColor: inputValue.trim() ? '#E43700' : '#07173F'
                }}
                onMouseEnter={(e) => {
                  if (inputValue.trim()) {
                    e.target.style.backgroundColor = '#8E1100';
                  }
                }}
                onMouseLeave={(e) => {
                  if (inputValue.trim()) {
                    e.target.style.backgroundColor = '#E43700';
                  }
                }}
              >
                <Send size={20} />
              </button>
            </div>
          </div>

          {/* Quick prompt suggestions - moved under search bar */}
          <div className="w-full max-w-3xl mb-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputValue(prompt)}
                  className="text-white p-3 rounded-lg text-sm transition-all text-left"
                  style={{
                    backgroundColor: '#0960E1',
                    fontFamily: 'Overpass, sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#0042A6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#0960E1';
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons - horizontally scrolling */}
          <div className="w-full max-w-5xl">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={prompt.action}
                  className="flex items-center gap-3 text-black px-6 py-4 rounded-xl transition-all flex-shrink-0"
                  style={{
                    backgroundColor: '#EAFE07',
                    fontFamily: 'Overpass, sans-serif',
                    minWidth: '260px',
                    maxWidth: '280px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#D4E600';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#EAFE07';
                  }}
                >
                  <div style={{color: '#07173F'}}>{prompt.icon}</div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-bold text-base" style={{fontFamily: 'Fira Sans, sans-serif'}}>{prompt.text}</div>
                    <div className="text-xs leading-tight break-words" style={{color: '#07173F', fontFamily: 'Overpass, sans-serif'}}>{prompt.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Chat view with messages */
        <div className="w-full h-screen flex flex-col">
            {/* Header */}
            <div className="p-4" style={{backgroundColor: '#07173F'}}>
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{backgroundColor: '#0042A6'}}>
                  <img 
                    src="/space-apps-logo-white.png" 
                    alt="NASA Space Apps" 
                    className="h-6 w-auto"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white" style={{fontFamily: 'Fira Sans, sans-serif'}}>NASA DataPilot</h1>
                  <p className="text-xs text-white" style={{color: '#EAFE07', fontFamily: 'Overpass, sans-serif'}}>AI Copilot</p>
                </div>
              </div>
                <button
                  onClick={() => {
                    setMessages([]);
                    setInputValue('');
                  }}
                  className="text-white text-sm px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: '#2E96F5',
                    fontFamily: 'Overpass, sans-serif'
                  }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#0960E1';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#2E96F5';
                }}
              >
                New Chat
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6" style={{backgroundColor: '#07173F'}}>
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl p-4 rounded-2xl text-white`}
                    style={{
                      backgroundColor: message.role === 'user' ? '#E43700' : '#0042A6',
                      fontFamily: 'Overpass, sans-serif'
                    }}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="p-4 rounded-2xl" style={{backgroundColor: '#0042A6'}}>
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{backgroundColor: '#EAFE07'}}></div>
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '0.2s', backgroundColor: '#EAFE07' }}></div>
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '0.4s', backgroundColor: '#EAFE07' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area */}
          <div className="p-4" style={{backgroundColor: '#07173F', borderTop: '2px solid #EAFE07'}}>
            <div className="max-w-4xl mx-auto">
              {/* Action buttons */}
              <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={prompt.action}
                    className="flex items-center gap-2 text-black px-4 py-2 rounded-lg transition-all flex-shrink-0"
                    style={{
                      backgroundColor: '#EAFE07',
                      fontFamily: 'Overpass, sans-serif'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#D4E600';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#EAFE07';
                    }}
                  >
                    <div style={{color: '#07173F'}}>{prompt.icon}</div>
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
                  className="w-full text-black placeholder-gray-600 px-6 py-4 pr-14 rounded-xl focus:outline-none transition-colors"
                  style={{
                    backgroundColor: '#FFFFFF',
                    fontFamily: 'Overpass, sans-serif'
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white p-2.5 rounded-lg transition-colors"
                  style={{
                    backgroundColor: inputValue.trim() ? '#E43700' : '#07173F'
                  }}
                  onMouseEnter={(e) => {
                    if (inputValue.trim()) {
                      e.target.style.backgroundColor = '#8E1100';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (inputValue.trim()) {
                      e.target.style.backgroundColor = '#E43700';
                    }
                  }}
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
      
      {/* Footer with NASA logo */}
      <div className="fixed bottom-4 right-4 opacity-30 hover:opacity-60 transition-opacity">
        <img 
          src="/nasa-small-logo.png" 
          alt="NASA Space Apps" 
          className="h-8 w-auto"
        />
      </div>
    </div>
  );
};

export default NASAChat;

