/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component, ReactNode, useCallback, useRef } from 'react';
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
  Linkedin,
  MessageCircle,
  Sparkles,
  AlertCircle,
  Loader2,
  HelpCircle,
  Lightbulb,
  Newspaper,
  Laugh,
  BookOpen,
  Megaphone,
  Image as ImageIcon,
  Download,
  Bookmark,
  History,
  LogIn,
  LogOut,
  Trash2,
  Clock,
  RefreshCw,
  Search,
  RotateCcw,
  Palette,
  Upload,
  Building2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GeminiService } from './services/geminiService';
import { auth, db, signInWithGoogle, logout, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';

type Platform = 'Facebook' | 'X' | 'Instagram' | 'LinkedIn' | 'WhatsApp';
type Tab = 'dashboard' | 'ideas' | 'saved' | 'history' | 'settings';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export default function App() {
  return (
    <HausaGenApp />
  );
}

// Utility to generate a smaller thumbnail for Firestore storage
const generateThumbnail = (base64: string, maxWidth = 400): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Use JPEG with 0.6 quality for aggressive compression
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(base64); // Fallback to original if error
    img.src = base64;
  });
};

const HighlineNews = ({ news, isLoading, onRefresh, onSelect }: { news: {title: string, category: string}[], isLoading: boolean, onRefresh: () => void, onSelect: (title: string) => void }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h3 className="font-bold text-sm flex items-center gap-2 text-slate-800">
          <Newspaper className="w-4 h-4 text-red-600" />
          Muhimman Labarai (Highline News)
        </h3>
        <button 
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors disabled:opacity-50"
          title="Sake duba labarai"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-50 animate-pulse rounded-xl border border-slate-100" />
            ))}
          </div>
        ) : news.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {news.map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => onSelect(item.title)}
                className="group p-4 rounded-xl border border-slate-100 bg-white hover:border-red-100 hover:shadow-md transition-all cursor-pointer"
              >
                <span className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 block">{item.category}</span>
                <p className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-red-700 transition-colors">{item.title}</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 italic text-sm">
            Babu labarai a halin yanzu.
          </div>
        )}
      </div>
    </div>
  );
};

interface IdeaCardProps {
  idea: any;
  onSelect: (topic: string) => void;
  key?: React.Key;
}

const IdeaCard = ({ idea, onSelect }: IdeaCardProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 hover:shadow-md transition-all flex flex-col h-full group"
    >
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 uppercase tracking-widest">
          {idea.platform}
        </span>
        <button 
          onClick={() => onSelect(idea.title)}
          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
          title="Yi amfani da wannan shawarar (Use this idea)"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <h4 className="font-bold text-slate-800 mb-2 leading-tight group-hover:text-blue-700 transition-colors">{idea.title}</h4>
      <p className="text-xs text-slate-500 leading-relaxed mb-4 flex-grow">{idea.description}</p>
      <div className="pt-4 border-t border-slate-50 mt-auto">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Lightbulb className="w-3 h-3 text-amber-500" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meyasa wannan? (The Angle)</span>
        </div>
        <p className="text-[11px] text-slate-600 italic leading-relaxed">"{idea.angle}"</p>
      </div>
    </motion.div>
  );
};

const BreakingNewsTicker = ({ news, isLoading, onSelect }: { news: {title: string, category: string}[], isLoading: boolean, onSelect: (title: string) => void }) => {
  return (
    <div className="bg-[#1e1e1e] border-y border-white/5 overflow-hidden h-10 flex items-center">
      <div className="bg-red-600 text-white text-[10px] font-black uppercase px-4 h-full flex items-center flex-shrink-0 z-10 shadow-lg tracking-widest">
        Labarai (Live)
      </div>
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        {isLoading ? (
          <div className="flex items-center gap-2 ml-4 text-slate-400 text-xs italic">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Ana duba sabbin labarai...</span>
          </div>
        ) : (
          <div className="whitespace-nowrap flex items-center animate-marquee">
            {news.length > 0 ? (
              [...news, ...news].map((item, i) => (
                <button 
                  key={i} 
                  onClick={() => onSelect(item.title)}
                  className="inline-flex items-center mx-8 group hover:text-red-400 transition-colors"
                >
                  <span className="text-[10px] font-bold text-red-500 uppercase mr-2 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 group-hover:bg-red-500 group-hover:text-white transition-all">{item.category}</span>
                  <span className="text-xs text-slate-300 font-medium group-hover:text-white">{item.title}</span>
                  <span className="mx-4 text-slate-600">•</span>
                </button>
              ))
            ) : (
              <div className="text-xs text-slate-500 ml-4 italic">Babu sabbin labarai a halin yanzu.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const GenerationProgress = ({ 
  isTextLoading, 
  isImageLoading, 
  includeImage,
}: { 
  isTextLoading: boolean, 
  isImageLoading: boolean, 
  includeImage: boolean,
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
    >
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Tsarin Samarwa (Generation Progress)</h4>
      
      <div className="space-y-3">
        {/* Text Progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg transition-colors ${isTextLoading ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {isTextLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </div>
            <span className={`text-sm font-medium transition-colors ${isTextLoading ? 'text-slate-800' : 'text-slate-500'}`}>Rubutu (Text Content)</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
            {isTextLoading ? 'Ana samarwa...' : 'An kammala'}
          </span>
        </div>

        {/* Image Progress */}
        {includeImage && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg transition-colors ${isImageLoading ? 'bg-blue-100 text-blue-600' : isTextLoading ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-600'}`}>
                {isImageLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (!isTextLoading && !isImageLoading) ? <Check className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
              </div>
              <span className={`text-sm font-medium transition-colors ${isImageLoading ? 'text-slate-800' : (isTextLoading) ? 'text-slate-400' : 'text-slate-500'}`}>Hoto (Image)</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
              {isImageLoading ? 'Ana samarwa...' : (isTextLoading) ? 'Yana jira...' : 'An kammala'}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

function HausaGenApp() {
  // State management
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState<Platform>('Facebook');
  const [tone, setTone] = useState<string>('Professional');
  const [language, setLanguage] = useState(() => localStorage.getItem('default_language') || 'Hausa');
  const [strictMode, setStrictMode] = useState(true);
  const [result, setResult] = useState('');
  const [nativeHashtags, setNativeHashtags] = useState<string[]>([]);
  const [englishHashtags, setEnglishHashtags] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedImageIndices, setSelectedImageIndices] = useState<number[]>([]);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [includeImage, setIncludeImage] = useState(false);
  const [imageCount, setImageCount] = useState(1);
  const [postLength, setPostLength] = useState<'Short' | 'Medium' | 'Long'>('Medium');
  const [imageStyle, setImageStyle] = useState('realistic');
  const [imageAspectRatio, setImageAspectRatio] = useState<"1:1" | "3:4" | "4:3" | "9:16" | "16:9">('1:1');
  const [extraLanguages, setExtraLanguages] = useState<string[]>([]);
  const [translatedPosts, setTranslatedPosts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ideas Content & Search Interests
  const [userInterests, setUserInterests] = useState('');
  const [contentIdeas, setContentIdeas] = useState<any[]>([]);
  const [isIdeasLoading, setIsIdeasLoading] = useState(false);
  
  // Auth & Database State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [historyPosts, setHistoryPosts] = useState<any[]>([]);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  
  // API Key handling
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  
  // Branding State
  const [brandingName, setBrandingName] = useState(() => localStorage.getItem('branding_name') || '');
  const [brandingLogo, setBrandingLogo] = useState(() => localStorage.getItem('branding_logo') || '');
  const [brandingPrimaryColor, setBrandingPrimaryColor] = useState(() => localStorage.getItem('branding_primary_color') || '#2563eb');
  const [brandingSecondaryColor, setBrandingSecondaryColor] = useState(() => localStorage.getItem('branding_secondary_color') || '#1e293b');
  const [showBrandedPreview, setShowBrandedPreview] = useState(false);
  
  // News State
  const [breakingNews, setBreakingNews] = useState<{title: string, category: string}[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  
  // Translation State
  const [translatedResult, setTranslatedResult] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationTarget, setTranslationTarget] = useState<'Hausa' | 'English'>('English');

  // Use platform key by default, fallback to custom key if provided
  const apiKey = customApiKey || process.env.GEMINI_API_KEY || '';

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const fetchNews = useCallback(async () => {
    setIsNewsLoading(true);
    try {
      const gemini = new GeminiService();
      const news = await gemini.getBreakingNews(customApiKey);
      if (news && news.length > 0) {
        setBreakingNews(news);
      }
    } catch (err) {
      console.error("Failed to fetch news:", err);
    } finally {
      setIsNewsLoading(false);
    }
  }, [customApiKey]);

  // News Fetcher
  useEffect(() => {
    fetchNews();
    // Refresh news every 30 minutes
    const interval = setInterval(fetchNews, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  // Saved Posts Listener
  useEffect(() => {
    if (!user) {
      setSavedPosts([]);
      return;
    }

    const q = query(
      collection(db, 'posts'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSavedPosts(posts);
    }, (err) => {
      console.error("Error fetching posts:", err);
      // Don't show error to user immediately to avoid flickering, 
      // but log it for debugging
    });

    return () => unsubscribe();
  }, [user]);

  // History Listener
  useEffect(() => {
    if (!user) {
      setHistoryPosts([]);
      return;
    }

    const q = query(
      collection(db, 'history'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistoryPosts(posts);
    }, (err) => {
      console.error("Error fetching history:", err);
    });

    return () => unsubscribe();
  }, [user]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    if (!apiKey) {
      setError('Don Allah a saka Gemini API Key a cikin Settings. (Please provide a Gemini API Key in Settings.)');
      return;
    }

    setIsLoading(true);
    setIsTextLoading(true);
    setIsImageLoading(false);
    setError(null);
    setResult('');
    setNativeHashtags([]);
    setEnglishHashtags([]);
    setImageUrl(null);
    setImageUrls([]);
    setSelectedImageIndices([]);
    setCurrentCarouselIndex(0);

    try {
      const gemini = new GeminiService();
      const data = await gemini.generatePost(topic, platform, language, tone, postLength, strictMode, customApiKey);
      setResult(data.post);
      setNativeHashtags(data.nativeHashtags);
      setEnglishHashtags(data.englishHashtags);
      setIsTextLoading(false);
      
      let finalImageUrls: string[] = [];
      if (includeImage) {
        setIsImageLoading(true);
        // Generate a dynamic prompt for the image based on the generated text
        const dynamicImagePrompt = await gemini.generateImagePrompt(data.post, customApiKey);
        
        // Generate multiple images if requested
        const imagePromises = Array.from({ length: imageCount }).map(async () => {
          try {
            return await gemini.generateImage(dynamicImagePrompt, imageAspectRatio, imageStyle, customApiKey);
          } catch (err) {
            console.error("Individual image generation failed:", err);
            return null;
          }
        });
        
        const results = await Promise.all(imagePromises);
        finalImageUrls = results.filter((url): url is string => !!url);
        setImageUrls(finalImageUrls);
        setSelectedImageIndices(finalImageUrls.map((_, i) => i));
        if (finalImageUrls.length > 0) {
          setImageUrl(finalImageUrls[0]); // Keep for backward compatibility/single view
        }
        setIsImageLoading(false);
      }

      // Generate extra translations if requested
      const translations: Record<string, string> = {};
      if (extraLanguages.length > 0) {
        await Promise.all(extraLanguages.map(async (lang) => {
          try {
            const translated = await gemini.translateText(data.post, lang, customApiKey);
            translations[lang] = translated;
          } catch (err) {
            console.error(`Translation to ${lang} failed:`, err);
          }
        }));
      }
      setTranslatedPosts(translations);

      // Automatically save to history if user is logged in
      if (user) {
        try {
          // Generate thumbnails for history to stay under 1MB Firestore limit
          const historyThumbnails = await Promise.all(
            finalImageUrls.map(url => generateThumbnail(url, 300))
          );

          const historyData = {
            userId: user.uid,
            topic,
            platform,
            tone,
            language,
            post: data.post,
            translatedPosts: translations,
            nativeHashtags: data.nativeHashtags,
            englishHashtags: data.englishHashtags,
            imageUrl: historyThumbnails.length > 0 ? historyThumbnails[0] : null,
            imageUrls: historyThumbnails,
            createdAt: serverTimestamp()
          };

          // Final safety check for document size
          if (JSON.stringify(historyData).length > 1000000) {
            console.warn("History document still too large, omitting images.");
            historyData.imageUrl = null;
            historyData.imageUrls = [];
          }

          await addDoc(collection(db, 'history'), historyData);
        } catch (err) {
          console.error("Error saving to history:", err);
        }
      }
    } catch (err: any) {
      let errorMessage = err.message || 'An samu matsala. (An error occurred.)';
      
      // If it's a permission error, suggest re-selecting the key
      if (errorMessage.includes("PERMISSION_DENIED") || errorMessage.includes("403") || errorMessage.includes("Requested entity was not found")) {
        if (window.aistudio) {
          errorMessage += " (Zaka iya gwada sake zabar API Key a Settings don sake saita izini.)";
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsTextLoading(false);
      setIsImageLoading(false);
    }
  };

  const handleSavePost = async () => {
    if (!user) {
      setError('Don Allah ka shiga akawunka (Login) don adana rubutu. (Please login to save posts.)');
      return;
    }

    if (!result) return;

    setIsSaving(true);
    try {
      const selectedUrls = imageUrls.filter((_, i) => selectedImageIndices.includes(i));
      
      // Generate thumbnails for saved posts to stay under 1MB Firestore limit
      const savedThumbnails = await Promise.all(
        selectedUrls.map(url => generateThumbnail(url, 500))
      );

      const postData = {
        userId: user.uid,
        topic,
        platform,
        tone,
        language,
        post: result,
        nativeHashtags,
        englishHashtags,
        imageUrl: savedThumbnails.length > 0 ? savedThumbnails[0] : null,
        imageUrls: savedThumbnails,
        createdAt: serverTimestamp()
      };

      // Final safety check for document size
      if (JSON.stringify(postData).length > 1000000) {
        setError('Hoton ya yi girma da yawa don adanawa a rumbun bayanai. (Image is too large to save to database.)');
        setIsSaving(false);
        return;
      }

      await addDoc(collection(db, 'posts'), postData);
      // Success feedback could be added here
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'posts');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleDeleteHistory = async (historyId: string) => {
    try {
      await deleteDoc(doc(db, 'history', historyId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `history/${historyId}`);
    }
  };

  const handleClearHistory = async () => {
    if (!user || historyPosts.length === 0) return;
    if (!confirm('Shin kana da tabbacin kana son goge dukkan tarihin tambayoyinka? (Are you sure you want to clear your entire history?)')) return;
    
    try {
      const batchSize = 500;
      const q = query(collection(db, 'history'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      // Firestore doesn't have a "delete collection" method, so we delete in batches
      // For simplicity in this app, we'll just delete what's in the snapshot
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (err) {
      console.error("Error clearing history:", err);
    }
  };

  const handleReusePost = (post: any) => {
    setTopic(post.topic);
    setPlatform(post.platform);
    setTone(post.tone || 'Professional');
    setLanguage(post.language || 'Hausa');
    setResult(post.post);
    setNativeHashtags(post.nativeHashtags || []);
    setEnglishHashtags(post.englishHashtags || []);
    setImageUrl(post.imageUrl || null);
    setActiveTab('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveApiKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const saveLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('default_language', lang);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setBrandingLogo(base64String);
        localStorage.setItem('branding_logo', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearLogo = () => {
    setBrandingLogo('');
    localStorage.removeItem('branding_logo');
  };

  const saveBranding = (name: string, primary: string, secondary: string) => {
    setBrandingName(name);
    setBrandingPrimaryColor(primary);
    setBrandingSecondaryColor(secondary);
    localStorage.setItem('branding_name', name);
    localStorage.setItem('branding_primary_color', primary);
    localStorage.setItem('branding_secondary_color', secondary);
  };

  const handleTranslate = async (textToTranslate?: string, target?: 'Hausa' | 'English') => {
    const text = textToTranslate || result;
    if (!text) return;
    
    setIsTranslating(true);
    try {
      const gemini = new GeminiService();
      const targetLang = target || (translationTarget === 'English' ? 'English' : 'Hausa');
      const translated = await gemini.translateText(text, targetLang, customApiKey);
      if (textToTranslate) {
        // If translating from a list, we might want to show it differently
        // For now, let's just use the same state or alert it
        setTranslatedResult(translated);
        if (!textToTranslate) setTranslationTarget(targetLang);
      } else {
        setTranslatedResult(translated);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGenerateIdeas = async () => {
    setIsIdeasLoading(true);
    setError(null);
    try {
      const gemini = new GeminiService();
      const ideas = await gemini.generateContentIdeas(userInterests, breakingNews, language, customApiKey);
      setContentIdeas(ideas);
    } catch (err: any) {
      setError(err.message || "An samu matsala wajen samar da shawarwari.");
    } finally {
      setIsIdeasLoading(false);
    }
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
              onClick={() => setActiveTab('ideas')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'ideas' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
            >
              <Lightbulb className="w-5 h-5" />
              <span>Content Ideas</span>
            </button>
            <button 
              onClick={() => setActiveTab('saved')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'saved' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
            >
              <Bookmark className="w-5 h-5" />
              <span>Saved Posts</span>
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
            >
              <Clock className="w-5 h-5" />
              <span>History</span>
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
              {activeTab === 'dashboard' ? 'Babban Shafi (Dashboard)' : 
               activeTab === 'ideas' ? 'Masu Samar da Shawarwari (Ideas Agent)' :
               activeTab === 'saved' ? 'Ajiye Rubutu (Saved Posts)' : 
               activeTab === 'history' ? 'Tarihin Tambayoyi (History)' : 'Saituna (Settings)'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-slate-500">Barka da zuwa</p>
                  <p className="text-sm font-medium text-slate-700">{user.displayName || 'User'}</p>
                </div>
                <button onClick={logout} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 group relative">
                  <LogOut className="w-5 h-5" />
                  <span className="absolute top-full right-0 mt-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">Logout</span>
                </button>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                )}
              </>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
              >
                <LogIn className="w-4 h-4 text-blue-600" />
                <span>Shiga (Login)</span>
              </button>
            )}
          </div>
        </header>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && <BreakingNewsTicker news={breakingNews} isLoading={isNewsLoading} onSelect={(t) => setTopic(t)} />}
          
          <div className="p-6">
            <div className="max-w-5xl mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' ? (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <HighlineNews news={breakingNews} isLoading={isNewsLoading} onRefresh={fetchNews} onSelect={(t) => setTopic(t)} />
                  
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

                        {/* Prompt Templates */}
                        <div className="mt-6 pt-6 border-t border-slate-100">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Samfuran Rubutu (Prompt Templates)
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { id: 'news', label: 'Labarai', icon: Newspaper, prompt: 'Ba da rahoton wani muhimmin labari da ya faru a yau game da...' },
                              { id: 'humor', label: 'Barkwanci', icon: Laugh, prompt: 'Rubuta wani gajeren labari mai ban dariya game da rayuwar yau da kullum a...' },
                              { id: 'edu', label: 'Ilimi', icon: BookOpen, prompt: 'Bayyana yadda mutum zai iya koyon sana\'ar hannu cikin sauki game da...' },
                              { id: 'promo', label: 'Talla', icon: Megaphone, prompt: 'Tallata wani sabon shago ko sana\'a mai sayar da...' },
                            ].map((t) => (
                              <button
                                key={t.id}
                                onClick={() => setTopic(t.prompt)}
                                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50 transition-all group"
                              >
                                <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-blue-100 transition-colors">
                                  <t.icon className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                                </div>
                                <span className="text-xs font-medium text-slate-600 group-hover:text-blue-700">{t.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">
                              Zabi Harshe (Select Language)
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {['Hausa', 'English', 'Yoruba', 'Igbo'].map((l) => (
                                <button
                                  key={l}
                                  onClick={() => saveLanguage(l)}
                                  className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 px-4 rounded-lg border transition-all ${language === l ? 'bg-blue-50 border-blue-600 text-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                  <span className="text-sm font-medium">{l}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">
                              Yanayin Rubutu (Tone)
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {['Professional', 'Casual', 'Humorous', 'Inspirational', 'Urgent'].map((t) => (
                                <button
                                  key={t}
                                  onClick={() => setTone(t)}
                                  className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 px-4 rounded-lg border transition-all ${tone === t ? 'bg-blue-50 border-blue-600 text-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                  <span className="text-sm font-medium">{t}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">
                              Zabi Dandamali (Select Platform)
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {(['Facebook', 'X', 'Instagram', 'LinkedIn', 'WhatsApp'] as Platform[]).map((p) => (
                                <button
                                  key={p}
                                  onClick={() => setPlatform(p)}
                                  className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 px-4 rounded-lg border transition-all ${platform === p ? 'bg-blue-50 border-blue-600 text-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                  {p === 'Facebook' && <Facebook className="w-4 h-4" />}
                                  {p === 'X' && <Twitter className="w-4 h-4" />}
                                  {p === 'Instagram' && <Instagram className="w-4 h-4" />}
                                  {p === 'LinkedIn' && <Linkedin className="w-4 h-4" />}
                                  {p === 'WhatsApp' && <MessageCircle className="w-4 h-4" />}
                                  <span className="text-sm font-medium">{p}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">
                              Tsawon Rubutu (Post Length)
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {(['Short', 'Medium', 'Long'] as const).map((l) => (
                                <button
                                  key={l}
                                  onClick={() => setPostLength(l)}
                                  className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 py-2 px-4 rounded-lg border transition-all ${postLength === l ? 'bg-blue-50 border-blue-600 text-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                  <span className="text-sm font-medium">{l === 'Short' ? 'Gajere' : l === 'Medium' ? 'Matsakaici' : 'Dogo'} ({l})</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">
                              Sake Fassara (Extra Translations)
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {['Yoruba', 'Igbo', 'Pidgin', 'English', 'Hausa'].filter(l => l !== language).map((l) => (
                                <button
                                  key={l}
                                  onClick={() => {
                                    if (extraLanguages.includes(l)) {
                                      setExtraLanguages(extraLanguages.filter(lang => lang !== l));
                                    } else {
                                      setExtraLanguages([...extraLanguages, l]);
                                    }
                                  }}
                                  className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 py-2 px-4 rounded-lg border transition-all ${extraLanguages.includes(l) ? 'bg-amber-50 border-amber-600 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                  <span className="text-sm font-medium">{l}</span>
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
                                <span className="text-sm font-medium text-slate-700">{language} Zalla (Strict {language})</span>
                              </div>
                              <button 
                                onClick={() => setStrictMode(!strictMode)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${strictMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${strictMode ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                            </div>
                          </div>

                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Image Toggle */}
                            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <ImageIcon className="w-4 h-4 text-slate-400" />
                                  <span className="text-sm font-medium text-slate-700">Hada da hoto (Include Image)</span>
                                </div>
                                <button 
                                  onClick={() => setIncludeImage(!includeImage)}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${includeImage ? 'bg-blue-600' : 'bg-slate-300'}`}
                                >
                                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeImage ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                              </div>

                              {includeImage && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="pt-4 border-t border-slate-200 space-y-4 overflow-hidden"
                                >
                                  <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Yawan Hotuna (Number of Images)</p>
                                    <div className="flex gap-2">
                                      {[1, 2, 3, 4].map((num) => (
                                        <button
                                          key={num}
                                          onClick={() => setImageCount(num)}
                                          className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${imageCount === num ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                          {num}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Yanayin Hoto (Style)</p>
                                    <div className="flex flex-wrap gap-2">
                                      {['realistic', 'human made', 'cartoon', 'abstract', 'cinematic', 'minimalist', 'watercolor', 'pixel art', '3D render', 'anime', 'cyberpunk', 'vintage'].map((s) => (
                                        <button
                                          key={s}
                                          onClick={() => setImageStyle(s)}
                                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all capitalize ${imageStyle === s ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}
                                        >
                                          {s}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Girman Hoto (Aspect Ratio)</p>
                                    <div className="flex flex-wrap gap-2">
                                      {['1:1', '16:9', '9:16', '4:3', '3:4'].map((r) => (
                                        <button
                                          key={r}
                                          onClick={() => setImageAspectRatio(r as any)}
                                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${imageAspectRatio === r ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}
                                        >
                                          {r}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </div>

                      <div className="flex gap-3">
                        <button 
                          onClick={handleGenerate}
                          disabled={isLoading || !topic.trim()}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200"
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

                        <button 
                          onClick={handleGenerate}
                          disabled={isLoading || !topic.trim()}
                          title="Sake gwadawa (Retry)"
                          className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 p-4 rounded-xl flex items-center justify-center transition-all border border-slate-200"
                        >
                          <RotateCcw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-50 border border-red-200 p-4 rounded-xl flex flex-col gap-3 text-red-700"
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">{error}</p>
                      </div>
                      {(error.includes("PERMISSION_DENIED") || error.includes("403") || error.includes("API Key")) && (
                        <button 
                          onClick={() => setActiveTab('settings')}
                          className="text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded-lg w-fit transition-colors flex items-center gap-1"
                        >
                          <Settings className="w-3 h-3" />
                          Bude Saituna (Open Settings)
                        </button>
                      )}
                    </motion.div>
                  )}

                  {/* Generation Progress */}
                  {isLoading && (
                    <GenerationProgress 
                      isTextLoading={isTextLoading}
                      isImageLoading={isImageLoading}
                      includeImage={includeImage}
                    />
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
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={handleSavePost}
                            disabled={isSaving}
                            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}
                            {isSaving ? 'Ana adanawa...' : 'Adana (Save)'}
                          </button>
                          <button 
                            onClick={() => handleCopy(result)}
                            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'An kwafa!' : 'Kwafa (Copy)'}
                          </button>
                        </div>
                      </div>
                      <div className="p-8 space-y-8">
                        {/* Branding Toggle */}
                        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Palette className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">Branded Preview</p>
                              <p className="text-xs text-slate-500">Duba yadda rubutunka zai kasance da alamar ka. (Preview with branding.)</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setShowBrandedPreview(!showBrandedPreview)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${showBrandedPreview ? 'bg-blue-600' : 'bg-slate-200'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showBrandedPreview ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>

                        {/* Media Display */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {isImageLoading && !imageUrl && (
                              <div className="aspect-square bg-slate-50 animate-pulse rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-3">
                                <div className="p-3 bg-white rounded-full shadow-sm">
                                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Ana samar da hoto...</span>
                              </div>
                            )}
                          </div>

                          {imageUrls.length > 0 && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                  <ImageIcon className="w-4 h-4 text-blue-600" />
                                  Zabi Hotuna (Select Images)
                                </h4>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => setSelectedImageIndices(imageUrls.map((_, i) => i))}
                                    className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:underline"
                                  >
                                    Zabi Duka (Select All)
                                  </button>
                                  <span className="text-slate-300">|</span>
                                  <button 
                                    onClick={() => setSelectedImageIndices([])}
                                    className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:underline"
                                  >
                                    Cire Duka (Clear All)
                                  </button>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {imageUrls.map((url, idx) => {
                                  const isSelected = selectedImageIndices.includes(idx);
                                  return (
                                    <div 
                                      key={idx} 
                                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${isSelected ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'}`}
                                      onClick={() => {
                                        if (isSelected) {
                                          setSelectedImageIndices(selectedImageIndices.filter(i => i !== idx));
                                        } else {
                                          setSelectedImageIndices([...selectedImageIndices, idx]);
                                        }
                                      }}
                                    >
                                      <img 
                                        src={url} 
                                        alt={`Option ${idx + 1}`} 
                                        className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`}
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className={`absolute inset-0 bg-blue-600/10 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                                      
                                      <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/80 border-slate-300'}`}>
                                        {isSelected && <Check className="w-3 h-3" />}
                                      </div>

                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setImageUrl(url);
                                          setCurrentCarouselIndex(idx);
                                        }}
                                        className="absolute bottom-2 right-2 p-1.5 bg-white/90 backdrop-blur shadow-sm rounded-lg text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-600"
                                        title="Duba sosai (View large)"
                                      >
                                        <Maximize2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Carousel View for Selected/Main Image */}
                              {imageUrl && (
                                <div className="relative aspect-square sm:aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-slate-900 group">
                                  <AnimatePresence mode="wait">
                                    <motion.img 
                                      key={imageUrl}
                                      initial={{ opacity: 0, scale: 1.1 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.9 }}
                                      transition={{ duration: 0.4 }}
                                      src={imageUrl} 
                                      alt="Main preview" 
                                      className="w-full h-full object-contain"
                                      referrerPolicy="no-referrer"
                                    />
                                  </AnimatePresence>
                                  
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                  
                                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-2">
                                      <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/10">
                                        Hoto {currentCarouselIndex + 1} na {imageUrls.length}
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <a 
                                        href={imageUrl} 
                                        download={`hausagen-image-${currentCarouselIndex + 1}.png`}
                                        className="p-2 bg-white text-slate-800 rounded-xl shadow-lg hover:bg-blue-50 transition-colors"
                                      >
                                        <Download className="w-5 h-5" />
                                      </a>
                                    </div>
                                  </div>

                                  {imageUrls.length > 1 && (
                                    <>
                                      <button 
                                        onClick={() => {
                                          const nextIdx = (currentCarouselIndex - 1 + imageUrls.length) % imageUrls.length;
                                          setCurrentCarouselIndex(nextIdx);
                                          setImageUrl(imageUrls[nextIdx]);
                                        }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 backdrop-blur-md text-white rounded-full hover:bg-white/20 transition-colors border border-white/10"
                                      >
                                        <ChevronLeft className="w-6 h-6" />
                                      </button>
                                      <button 
                                        onClick={() => {
                                          const nextIdx = (currentCarouselIndex + 1) % imageUrls.length;
                                          setCurrentCarouselIndex(nextIdx);
                                          setImageUrl(imageUrls[nextIdx]);
                                        }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 backdrop-blur-md text-white rounded-full hover:bg-white/20 transition-colors border border-white/10"
                                      >
                                        <ChevronRight className="w-6 h-6" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {showBrandedPreview ? (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="rounded-2xl overflow-hidden shadow-xl border border-slate-200"
                            style={{ backgroundColor: 'white' }}
                          >
                            <div 
                              className="p-4 flex items-center justify-between"
                              style={{ backgroundColor: brandingPrimaryColor, color: 'white' }}
                            >
                              <div className="flex items-center gap-3">
                                {brandingLogo ? (
                                  <img src={brandingLogo} alt="Logo" className="w-8 h-8 object-contain bg-white rounded-full p-1" />
                                ) : (
                                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                    <Building2 className="w-4 h-4 text-white" />
                                  </div>
                                )}
                                <span className="font-bold text-sm tracking-tight">{brandingName || 'HausaGen AI'}</span>
                              </div>
                              <div className="flex gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                              </div>
                            </div>
                            <div className="p-8 space-y-6">
                              {isTextLoading ? (
                                <div className="space-y-4 animate-pulse">
                                  <div className="h-6 bg-slate-100 rounded w-3/4"></div>
                                  <div className="h-6 bg-slate-100 rounded w-full"></div>
                                  <div className="h-6 bg-slate-100 rounded w-5/6"></div>
                                </div>
                              ) : (
                                <div className="space-y-8">
                                  <p className="text-slate-800 text-xl leading-relaxed font-medium whitespace-pre-wrap">{result}</p>
                                  
                                  {Object.keys(translatedPosts).length > 0 && (
                                    <div className="pt-8 border-t border-slate-100 space-y-6">
                                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Globe className="w-3 h-3" />
                                        Sauran Fassara (Other Translations)
                                      </h4>
                                      <div className="space-y-6">
                                        {Object.entries(translatedPosts).map(([lang, text]: [string, string]) => (
                                          <div key={lang} className="bg-slate-50 rounded-xl p-5 border border-slate-100 group relative">
                                            <div className="flex items-center justify-between mb-3">
                                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-white px-2 py-1 rounded border border-blue-100">
                                                {lang}
                                              </span>
                                              <button 
                                                onClick={() => {
                                                  navigator.clipboard.writeText(text);
                                                  // Optional toast notification would be good here
                                                  alert(`${lang} output has been copied!`);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                              >
                                                <Copy className="w-4 h-4" />
                                              </button>
                                            </div>
                                            <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">{text}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
                                {nativeHashtags.map((tag, i) => (
                                  <span key={i} className="text-sm font-bold" style={{ color: brandingPrimaryColor }}>{tag}</span>
                                ))}
                                {englishHashtags.map((tag, i) => (
                                  <span key={i} className="text-sm font-bold opacity-60" style={{ color: brandingPrimaryColor }}>{tag}</span>
                                ))}
                              </div>
                            </div>
                            <div 
                              className="p-3 text-center text-[10px] font-bold uppercase tracking-[0.2em]"
                              style={{ backgroundColor: brandingSecondaryColor, color: 'white' }}
                            >
                              Generated via HausaGen AI • {platform}
                            </div>
                          </motion.div>
                        ) : (
                          <>
                            {isTextLoading ? (
                              <div className="space-y-4 animate-pulse">
                                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                                <div className="h-4 bg-slate-100 rounded w-full"></div>
                                <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                              </div>
                            ) : (
                              <div className="prose prose-slate max-w-none">
                                <p className="text-lg leading-relaxed text-slate-700 whitespace-pre-wrap">
                                  {result}
                                </p>

                                {Object.keys(translatedPosts).length > 0 && (
                                  <div className="mt-8 pt-8 border-t border-slate-100 space-y-6">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                      <Globe className="w-3 h-3" />
                                      Sauran Fassara (Other Translations)
                                    </h4>
                                    <div className="space-y-4">
                                      {Object.entries(translatedPosts).map(([lang, text]: [string, string]) => (
                                        <div key={lang} className="bg-slate-50 rounded-xl p-5 border border-slate-100 group relative">
                                          <div className="flex items-center justify-between mb-3">
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-white px-2 py-1 rounded border border-blue-100">
                                              {lang}
                                            </span>
                                            <button 
                                              onClick={() => handleCopy(text)}
                                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                              <Copy className="w-4 h-4" />
                                            </button>
                                          </div>
                                          <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">{text}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Translation Section */}
                            <div className="pt-6 border-t border-slate-100">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                  <Globe className="w-4 h-4" />
                                  Fassara (Translation)
                                </h4>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                  <button 
                                    onClick={() => setTranslationTarget('English')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${translationTarget === 'English' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                                  >
                                    English
                                  </button>
                                  <button 
                                    onClick={() => setTranslationTarget('Hausa')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${translationTarget === 'Hausa' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                                  >
                                    Hausa
                                  </button>
                                </div>
                              </div>
                              
                              <div className="flex gap-3">
                                <button 
                                  onClick={handleTranslate}
                                  disabled={isTranslating}
                                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                  {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                  {isTranslating ? 'Ana fassara...' : `Fassara zuwa ${translationTarget}`}
                                </button>
                                {translatedResult && (
                                  <button 
                                    onClick={() => setTranslatedResult('')}
                                    className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                                  >
                                    Boye (Hide)
                                  </button>
                                )}
                              </div>

                              <AnimatePresence>
                                {translatedResult && (
                                  <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl overflow-hidden"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Sakamakon Fassara</span>
                                      <button 
                                        onClick={() => handleCopy(translatedResult)}
                                        className="text-blue-600 hover:text-blue-700"
                                      >
                                        <Copy className="w-4 h-4" />
                                      </button>
                                    </div>
                                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap italic">
                                      {translatedResult}
                                    </p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Hashtags Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                              {/* Native Hashtags */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Hashtags na {language}</h4>
                                  <button 
                                    onClick={() => handleCopy(nativeHashtags.join(' '))}
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <Copy className="w-3 h-3" /> Kwafa duka
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {nativeHashtags.map((tag, idx) => (
                                    <span key={idx} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-sm font-medium border border-slate-200">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* English Hashtags */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">English Hashtags</h4>
                                  <button 
                                    onClick={() => handleCopy(englishHashtags.join(' '))}
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <Copy className="w-3 h-3" /> Copy all
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {englishHashtags.map((tag, idx) => (
                                    <span key={idx} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-sm font-medium border border-slate-200">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ) : activeTab === 'ideas' ? (
                <motion.div 
                  key="ideas"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        Ina kake sha'awa? (Shared Interests)
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="flex gap-4">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="text"
                            value={userInterests}
                            onChange={(e) => setUserInterests(e.target.value)}
                            placeholder="Misali: Kwallon kafa, Siyasa, Kasuwanci..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          />
                        </div>
                        <button 
                          onClick={handleGenerateIdeas}
                          disabled={isIdeasLoading}
                          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                          {isIdeasLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                          <span>Samar da Shawarwari</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-3 italic">
                        Za mu yi amfani da abubuwan da kake sha'awa da ma labaran da ke yawo a halin yanzu don samar maka da sabbin dabarun rubutu.
                      </p>
                    </div>
                  </div>

                  {isIdeasLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-64 bg-slate-50 animate-pulse rounded-2xl border border-slate-100" />
                      ))}
                    </div>
                  ) : contentIdeas.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                      {contentIdeas.map((idea, i) => (
                        <IdeaCard 
                          key={i} 
                          idea={idea} 
                          onSelect={(t) => {
                            setTopic(t);
                            setActiveTab('dashboard');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }} 
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                      <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Lightbulb className="w-8 h-8" />
                      </div>
                      <h3 className="font-bold text-slate-800">Babu Shawarwari Tukunna</h3>
                      <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">Danna maballin "Samar da Shawarwari" don fara samun dabarun rubutu masu daukar hankali.</p>
                    </div>
                  )}
                </motion.div>
              ) : activeTab === 'saved' ? (
                <motion.div 
                  key="saved"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {!user ? (
                    <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600">
                        <LogIn className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">Shiga don ganin rubutunka</h3>
                      <p className="text-slate-500 max-w-sm mx-auto">Kuna bukatar shiga akawunku don ganin duk rubutun da kuka adana a baya.</p>
                      <button 
                        onClick={signInWithGoogle}
                        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                      >
                        Shiga da Google (Login with Google)
                      </button>
                    </div>
                  ) : savedPosts.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <History className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">Babu rubutun da aka adana</h3>
                      <p className="text-slate-500">Ba ku adana kowane rubutu ba tukuna. Fara samar da rubutu yanzu!</p>
                      <button 
                        onClick={() => setActiveTab('dashboard')}
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        Koma Dashboard
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {savedPosts.map((post) => (
                        <motion.div 
                          key={post.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                        >
                          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded uppercase">{post.platform}</span>
                              {post.tone && <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded uppercase">{post.tone}</span>}
                              {post.language && <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded uppercase">{post.language}</span>}
                              <span className="text-xs text-slate-400">{post.createdAt?.toDate().toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleReusePost(post)}
                                className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
                                title="Re-use (Sake amfani)"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setTranslationTarget(post.language === 'English' ? 'Hausa' : 'English');
                                  setResult(post.post);
                                  setActiveTab('dashboard');
                                  setTimeout(() => {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }, 100);
                                }}
                                className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                title="Translate (Fassara)"
                              >
                                <Globe className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleCopy(post.post)}
                                className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                title="Copy"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeletePost(post.id)}
                                className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="p-6 flex flex-col md:flex-row gap-6">
                            {(post.imageUrl || post.imageUrls?.length > 0) && (
                              <div className="w-full md:w-48 h-48 flex-shrink-0 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 relative">
                                {post.imageUrls?.length > 1 ? (
                                  <div className={`grid h-full w-full gap-0.5 ${post.imageUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
                                    {post.imageUrls.slice(0, 4).map((url: string, i: number) => (
                                      <div key={i} className="relative h-full w-full overflow-hidden">
                                        <img 
                                          src={url} 
                                          alt={`Post ${i}`} 
                                          className="w-full h-full object-cover" 
                                          referrerPolicy="no-referrer" 
                                        />
                                        {i === 3 && post.imageUrls.length > 4 && (
                                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[10px] font-bold">
                                            +{post.imageUrls.length - 4}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <img 
                                    src={post.imageUrls?.length === 1 ? post.imageUrls[0] : post.imageUrl} 
                                    alt="Post" 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer" 
                                  />
                                )}
                              </div>
                            )}
                            <div className="flex-1 space-y-4">
                              <p className="text-sm font-semibold text-slate-500 italic">Topic: {post.topic}</p>
                              <p className="text-slate-700 whitespace-pre-wrap line-clamp-4">{post.post}</p>
                              <div className="flex flex-wrap gap-2">
                                {post.nativeHashtags?.map((tag: string, i: number) => (
                                  <span key={i} className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">{tag}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : activeTab === 'history' ? (
                <motion.div 
                  key="history"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Tarihin Tambayoyi (History)</h3>
                      <p className="text-sm text-slate-500">{historyPosts.length} posts found</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text"
                          placeholder="Nemo a tarihi..."
                          value={historySearchTerm}
                          onChange={(e) => setHistorySearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                      </div>
                      {historyPosts.length > 0 && (
                        <button 
                          onClick={handleClearHistory}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Goge Duka</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {historyPosts.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                      <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-slate-400" />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-700 mb-2">Babu Tarihi (No History)</h4>
                      <p className="text-slate-500 mb-6">Ba ka riga ka samar da wani rubutu ba tukuna. (You haven't generated any posts yet.)</p>
                      <button 
                        onClick={() => setActiveTab('dashboard')}
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        Fara Samar da Rubutu
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {historyPosts
                        .filter(post => 
                          post.topic.toLowerCase().includes(historySearchTerm.toLowerCase()) || 
                          post.post.toLowerCase().includes(historySearchTerm.toLowerCase())
                        )
                        .map((post) => (
                        <motion.div 
                          key={post.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                        >
                          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded uppercase">{post.platform}</span>
                              {post.tone && <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded uppercase">{post.tone}</span>}
                              {post.language && <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded uppercase">{post.language}</span>}
                              <span className="text-xs text-slate-400">{post.createdAt?.toDate().toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleReusePost(post)}
                                className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
                                title="Re-use (Sake amfani)"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setTranslationTarget(post.language === 'English' ? 'Hausa' : 'English');
                                  setResult(post.post);
                                  setActiveTab('dashboard');
                                  setTimeout(() => {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }, 100);
                                }}
                                className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                title="Translate (Fassara)"
                              >
                                <Globe className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleCopy(post.post)}
                                className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                title="Copy"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteHistory(post.id)}
                                className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="p-6 flex flex-col md:flex-row gap-6">
                            {(post.imageUrl || post.imageUrls?.length > 0) && (
                              <div className="w-full md:w-48 h-48 flex-shrink-0 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 relative">
                                {post.imageUrls?.length > 1 ? (
                                  <div className={`grid h-full w-full gap-0.5 ${post.imageUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
                                    {post.imageUrls.slice(0, 4).map((url: string, i: number) => (
                                      <div key={i} className="relative h-full w-full overflow-hidden">
                                        <img 
                                          src={url} 
                                          alt={`Post ${i}`} 
                                          className="w-full h-full object-cover" 
                                          referrerPolicy="no-referrer" 
                                        />
                                        {i === 3 && post.imageUrls.length > 4 && (
                                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[10px] font-bold">
                                            +{post.imageUrls.length - 4}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <img 
                                    src={post.imageUrls?.length === 1 ? post.imageUrls[0] : post.imageUrl} 
                                    alt="Post" 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer" 
                                  />
                                )}
                              </div>
                            )}
                            <div className="flex-1 space-y-4">
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Abinda ka tambaya (Topic):</p>
                                <p className="text-sm font-semibold text-slate-700">{post.topic}</p>
                              </div>
                              <p className="text-slate-700 whitespace-pre-wrap line-clamp-4">{post.post}</p>
                              <div className="flex flex-wrap gap-2">
                                {post.nativeHashtags?.map((tag: string, i: number) => (
                                  <span key={i} className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">{tag}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
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
                      <div className="flex gap-2">
                        <input 
                          type="password"
                          value={customApiKey}
                          onChange={(e) => saveApiKey(e.target.value)}
                          placeholder="Saka API Key a nan..."
                          className="flex-1 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700"
                        />
                        {customApiKey && (
                          <button 
                            onClick={() => saveApiKey('')}
                            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                        Idan baka da API Key, za ka iya amfani da wanda tsarin ya samar maka ta atomatik. 
                        (If you don't have an API Key, you can use the one provided by the platform automatically.)
                      </p>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <label className="block text-sm font-medium text-slate-700 mb-4">
                        Harshen Tsoho (Default Language)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['Hausa', 'English', 'Yoruba', 'Igbo'].map((l) => (
                          <button
                            key={l}
                            onClick={() => saveLanguage(l)}
                            className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition-all ${language === l ? 'bg-blue-50 border-blue-600 text-blue-600 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                          >
                            <span className="text-sm font-semibold">{l}</span>
                            {language === l && <Check className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                        Wannan shi ne harshen da za a rika amfani da shi ta atomatik wajen samar da rubutu.
                        (This is the language that will be used by default for generating posts.)
                      </p>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-800">
                        <Palette className="w-5 h-5 text-blue-600" />
                        Saitunan Alama (Branding Settings)
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Sunan Alama (Brand Name)</label>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                              type="text"
                              value={brandingName}
                              onChange={(e) => saveBranding(e.target.value, brandingPrimaryColor, brandingSecondaryColor)}
                              placeholder="Misali: HausaGen Media"
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Logo</label>
                          <div className="flex items-center gap-4">
                            {brandingLogo ? (
                              <div className="relative w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shadow-sm">
                                <img src={brandingLogo} alt="Logo" className="w-full h-full object-contain" />
                                <button 
                                  onClick={clearLogo}
                                  className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg hover:bg-red-600 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group">
                                <Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                                <span className="text-[10px] text-slate-500 mt-1">Upload</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                              </label>
                            )}
                            <div className="flex-1">
                              <p className="text-xs text-slate-500 leading-relaxed">
                                Za a nuna wannan a kan rubutunka idan ka kunna "Branded Preview". 
                                (This will be shown on your post if you enable "Branded Preview".)
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Babban Launi (Primary)</label>
                            <div className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50/50">
                              <input 
                                type="color"
                                value={brandingPrimaryColor}
                                onChange={(e) => saveBranding(brandingName, e.target.value, brandingSecondaryColor)}
                                className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                              />
                              <span className="text-xs font-mono text-slate-500 uppercase">{brandingPrimaryColor}</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Launi na Biyu (Secondary)</label>
                            <div className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50/50">
                              <input 
                                type="color"
                                value={brandingSecondaryColor}
                                onChange={(e) => saveBranding(brandingName, brandingPrimaryColor, e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                              />
                              <span className="text-xs font-mono text-slate-500 uppercase">{brandingSecondaryColor}</span>
                            </div>
                          </div>
                        </div>
                      </div>
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
      </div>

      {/* Footer */}
        <footer className="h-12 bg-white border-t border-slate-200 flex items-center justify-center px-6 text-xs text-slate-400 flex-shrink-0">
          &copy; {new Date().getFullYear()} HausaGen AI - An gina shi da kauna a Arewa.
        </footer>
      </main>
    </div>
  );
}
