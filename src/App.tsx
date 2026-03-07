/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  Send, 
  Copy, 
  Check, 
  Menu, 
  X, 
  Globe, 
  Facebook, 
  Instagram, 
  Twitter,
  Sparkles,
  AlertCircle,
  Loader2,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GeminiService } from './services/geminiService';

type Platform = 'Facebook' | 'X' | 'Instagram';

export default function App() {
  // State management
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState<Platform>('Facebook');
  const [strictHausa, setStrictHausa] = useState(true);
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // API Key handling
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  
  // Use platform key by default, fallback to custom key if provided
  const apiKey = customApiKey || process.env.GEMINI_API_KEY || '';

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    if (!apiKey) {
      setError('Don Allah a saka Gemini API Key a cikin Settings. (Please provide a Gemini API Key in Settings.)');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult('');

    try {
      const gemini = new GeminiService(apiKey);
      const generatedText = await gemini.generatePost(topic, platform, strictHausa);
      setResult(generatedText);
    } catch (err: any) {
      setError(err.message || 'An samu matsala. (An error occurred.)');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveApiKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  return (
    <div className="flex h-screen bg-[#f0f2f5] font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-[#1e1e1e] text-white flex-shrink-0 overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Globe className="w-6 h-6" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">HausaGen</h1>
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
          </nav>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-bottom border-slate-200 h-16 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="font-semibold text-lg text-slate-800">
              {activeTab === 'dashboard' ? 'Babban Shafi (Dashboard)' : 'Saituna (Settings)'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-500">Barka da zuwa</p>
              <p className="text-sm font-medium text-slate-700">Hausa Manager</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              HM
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' ? (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Input Card */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        Samar da Sabon Rubutu (Create New Post)
                      </h3>
                    </div>
                    <div className="p-6 space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-slate-700">
                            Mene ne taken rubutunka? (What is your topic?)
                          </label>
                          <div className="group relative">
                            <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
                            <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                              <p className="font-semibold mb-1">Yadda ake rubuta taken da ya dace:</p>
                              <ul className="list-disc pl-4 space-y-1">
                                <li>Ka kasance takaitacce (Be concise)</li>
                                <li>Saka takamaiman bayani (Be specific)</li>
                                <li>Fadi yanayin da kake so (Mention the tone)</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        <textarea 
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          placeholder="Misali: Muhimmancin karatun boko ga matasa..."
                          className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-slate-700"
                        />
                        
                        {/* Example Prompts */}
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" />
                            Misalan Taken Rubutu (Example Topics)
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              'Muhimmancin karatun boko ga matasa',
                              'Yadda za a kiyaye lafiyar jiki a lokacin sanyi',
                              'Hanyoyin samun nasara a kasuwanci',
                              'Nishadi: Wasan kwallon kafa na yau'
                            ].map((ex) => (
                              <button
                                key={ex}
                                onClick={() => setTopic(ex)}
                                className="text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200 transition-all"
                              >
                                {ex}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-3">
                            Zabi Dandamali (Select Platform)
                          </label>
                          <div className="flex gap-2">
                            {(['Facebook', 'X', 'Instagram'] as Platform[]).map((p) => (
                              <button
                                key={p}
                                onClick={() => setPlatform(p)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border transition-all ${platform === p ? 'bg-blue-50 border-blue-600 text-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                              >
                                {p === 'Facebook' && <Facebook className="w-4 h-4" />}
                                {p === 'X' && <Twitter className="w-4 h-4" />}
                                {p === 'Instagram' && <Instagram className="w-4 h-4" />}
                                <span className="text-sm font-medium">{p}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-3">
                            Yanayin Harshe (Language Mode)
                          </label>
                          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-slate-400" />
                              <span className="text-sm font-medium text-slate-700">Hausa Zalla (Strict Hausa)</span>
                            </div>
                            <button 
                              onClick={() => setStrictHausa(!strictHausa)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${strictHausa ? 'bg-blue-600' : 'bg-slate-300'}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${strictHausa ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={handleGenerate}
                        disabled={isLoading || !topic.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Ana samarwa... (Generating...)</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            <span>Samar da Rubutu (Generate Post)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 text-red-700"
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{error}</p>
                    </motion.div>
                  )}

                  {/* Results Section */}
                  {result && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                    >
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-semibold text-slate-800">Sakamako (Result)</h3>
                        <button 
                          onClick={handleCopy}
                          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'An kwafa!' : 'Kwafa (Copy)'}
                        </button>
                      </div>
                      <div className="p-8">
                        <div className="prose prose-slate max-w-none">
                          <p className="text-lg leading-relaxed text-slate-700 whitespace-pre-wrap">
                            {result}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="settings"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-semibold">Saitunan Gemini API (Gemini API Settings)</h3>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Gemini API Key
                      </label>
                      <input 
                        type="password"
                        value={customApiKey}
                        onChange={(e) => saveApiKey(e.target.value)}
                        placeholder="Saka API Key a nan..."
                        className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700"
                      />
                      <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                        Idan baka da API Key, za ka iya amfani da wanda tsarin ya samar maka ta atomatik. 
                        (If you don't have an API Key, you can use the one provided by the platform automatically.)
                      </p>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <h4 className="text-sm font-semibold text-slate-800 mb-4">Game da HausaGen (About HausaGen)</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Wannan manhaja ce da aka gina ta musamman don taimaka wa masu amfani da kafafen sada zumunta 
                        wajen samar da rubutu mai inganci a harshen Hausa. Muna amfani da fasahar Gemini AI wajen 
                        tabbatar da cewa rubutun ya dace da al'adar Arewa.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <footer className="h-12 bg-white border-t border-slate-200 flex items-center justify-center px-6 text-xs text-slate-400 flex-shrink-0">
          &copy; {new Date().getFullYear()} HausaGen AI - An gina shi da kauna a Arewa.
        </footer>
      </main>
    </div>
  );
}
