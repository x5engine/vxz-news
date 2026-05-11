import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Activity,
  Globe as GlobeIcon,
  Layers,
  Search,
  ChevronRight,
  Database,
  Radio,
  ExternalLink,
  Info,
  MapPin,
  RefreshCw,
  AlertTriangle,
  List,
  Map,
  Terminal as TerminalIcon,
  X,
  LogIn,
  Bookmark,
  BookmarkPlus,
  Tv,
  Film,
  ArrowLeft,
  MessageSquare,
  Send,
  Maximize2,
  Minimize2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobeView } from './components/GlobeView';
import { useNewsStream } from './hooks/useNewsStream';
import { MediaRecon } from './components/MediaRecon';
import { LinkPreview } from './components/LinkPreview';
import { useBrowserDiscovery } from './hooks/useBrowserDiscovery';
import { useMarketTicker } from './hooks/useMarketTicker';
import { audio } from './services/audio';
import { useAuth } from './hooks/useAuth';
import VXZLogo from './components/VXZLogo';
import { SourceAlignmentMap } from './components/SourceAlignmentMap';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './services/firebase';

// --- Components ---

const TruthCircle = ({ score }: { score: number }) => {
  const color = score >= 90 ? 'var(--accent-green)' : score >= 60 ? 'var(--accent-amber)' : 'var(--accent-red)';
  const glow = score >= 90 ? 'var(--glow-green)' : score >= 60 ? 'var(--glow-amber)' : 'var(--glow-red)';
  
  return (
    <div className="truth-circle-container" style={{ position: 'relative', width: '40px', height: '40px', flexShrink: 0 }}>
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border-strong)" strokeWidth="2" />
        <motion.circle 
          cx="20" cy="20" r="16" 
          fill="none" 
          stroke={color} 
          strokeWidth="3"
          strokeDasharray="100.5"
          initial={{ strokeDashoffset: 100.5 }}
          animate={{ strokeDashoffset: 100.5 - (100.5 * score) / 100 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(${glow})` }}
        />
      </svg>
      <div className="mono" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '9px', fontWeight: 'bold', color: color }}>
        {score}%
      </div>
    </div>
  );
};

const SidebarIcon = ({ icon: Icon, active = false, onClick, color }: { icon: any, active?: boolean, onClick?: () => void, color?: string }) => (
  <div 
    className={`sidebar-icon ${active ? 'active' : ''}`} 
    onMouseEnter={() => audio.playHover()}
    onClick={() => {
      audio.playClick();
      if (onClick) onClick();
    }}
    style={{
      padding: '12px',
      cursor: 'pointer',
      color: color ? color : (active ? 'var(--text-primary)' : 'var(--text-tertiary)'),
      transition: 'all 0.2s ease',
      borderLeft: active ? `2px solid ${color ? color : 'var(--accent-blue)'}` : '2px solid transparent',
      background: active ? (color ? `${color}15` : 'rgba(0, 122, 255, 0.05)') : 'transparent'
    }}
  >
    <Icon size={20} />
  </div>
);

const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return 'LIVE';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'tv' | 'terminal' | 'bookmarks'>('dashboard');
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [isIntelMaximized, setIsIntelMaximized] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);
  const [tvActiveVideo, setTvActiveVideo] = useState<string | null>(null); // State for YouTube-style Watch Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [tvSortOrder, setTvSortOrder] = useState<'latest' | 'score'>('latest');
  
  const { user, loginWithGoogle, loginWithEmail, registerWithEmail, logout } = useAuth();
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Layout toggles
  const [showFeed, setShowFeed] = useState(true);
  const [showMap, setShowMap] = useState(true);

  // Terminal state
  const [commandInput, setCommandInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const terminalWelcomeDone = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const { news: liveNews, loading, breakingNews, dismissBreaking, loadMore, isLoadingMore } = useNewsStream();
  const discovered = useBrowserDiscovery(true);
  const markets = useMarketTicker();

  // Infinite Scroll Observer Ref
  const feedScrollContainerRef = useRef<HTMLElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // If the feed container isn't ready or we are still doing the initial load, don't observe yet.
    if (!feedScrollContainerRef.current || !observerTarget.current || loading) return;

    const observer = new IntersectionObserver(
      entries => {
        // Only trigger loadMore if the target is actually intersecting AND we aren't currently loading more.
        if (entries[0].isIntersecting && !loading && !isLoadingMore) {
          loadMore();
        }
      },
      {
        root: feedScrollContainerRef.current, // Constrain observer to the scrolling section itself
        rootMargin: '0px 0px 40% 0px', // Trigger exactly when 40% from the bottom
        threshold: 0.1
      }
    );

    observer.observe(observerTarget.current);

    return () => observer.disconnect();
  }, [loadMore, loading, isLoadingMore, activeView]); // Re-bind observer if view or loading state changes

  // TV Comments State (Mocked for UI)
  const [commentInput, setCommentInput] = useState('');
  const [comments, setComments] = useState<{user: string, text: string, time: string}[]>([
    { user: 'Anon_77', text: 'Confirmed via local sources.', time: '2m ago' }
  ]);

  // Terminal Typewriter Effect
  useEffect(() => {
    if (activeView === 'terminal' && !terminalWelcomeDone.current) {
      terminalWelcomeDone.current = true;
      const welcomeSequence = [
        '[ INITIALIZING VXZ_SYSTEM_CORE... ]',
        'Authentication sequence complete. Welcome, Operator.',
        'Geospatial uplinks are live. Hunter Array is at 100% capacity.',
        'SECURITY NOTICE: System modifications (PURGE, CONFIG) have been locked down.',
        'You have read-only directive authority. Type "help" to view commands.'
      ];
      
      let i = 0;
      const interval = setInterval(() => {
        if (i < welcomeSequence.length) {
          setTerminalLogs(prev => [...prev, welcomeSequence[i]]);
          audio.playHover();
          i++;
        } else {
          clearInterval(interval);
        }
      }, 400);
    }
  }, [activeView]);

  // Durable Notification Logic
  const [notifiedId, setNotifiedId] = useState<string | null>(null);
  useEffect(() => {
    if (breakingNews) {
      const notifiedKey = `vxz_notified_${breakingNews.id}`;
      const alreadyNotified = localStorage.getItem(notifiedKey);

      if (!alreadyNotified) {
        audio.playAlert();
        localStorage.setItem(notifiedKey, 'true');

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("VXZ BREAKING INTEL", {
            body: breakingNews.title,
            icon: '/favicon.ico'
          });
        }
      }
    }
  }, [breakingNews]);

  // Load Bookmarks
  useEffect(() => {
    const saved = localStorage.getItem('vxz_bookmarks');
    if (saved) setBookmarks(new Set(JSON.parse(saved)));
  }, [user]);

  const toggleBookmark = (id: string) => {
    audio.playClick();
    const newBookmarks = new Set(bookmarks);
    if (newBookmarks.has(id)) newBookmarks.delete(id);
    else newBookmarks.add(id);
    setBookmarks(newBookmarks);
    localStorage.setItem('vxz_bookmarks', JSON.stringify([...newBookmarks]));
  };

  // Scroll to bottom of terminal
  useEffect(() => {
    if (logsEndRef.current && activeView === 'terminal') {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs, activeView]);

  // Log discovery to terminal
  useEffect(() => {
    if (discovered.length > 0) {
      const timeId = new Date().toISOString().substring(11,19);
      setTerminalLogs(prev => [...prev, `[${timeId}] [BROWSER_DISCOVERY] Intercepted unvetted wire threads.`]);
    }
  }, [discovered]);

  const handleAppInteraction = () => {
    audio.init();
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'CONFIRMED') return 'var(--accent-green)';
    if (status === 'ASSESSED') return 'var(--accent-amber)';
    return 'var(--accent-red)';
  };

  const globeData = liveNews.map(n => ({
    lat: n.lat,
    lng: n.lng,
    size: n.truthScore / 100,
    color: getStatusColor(n.status),
    label: n.id,
    title: n.title
  }));

  const activeNewsData = liveNews.find(n => n.id === activeItem);
  
  const filteredNews = liveNews.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.summary.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesCategory = true;
    if (activeCategory === 'BREAKING') {
      matchesCategory = n.truthScore >= 80;
    } else if (activeCategory) {
      matchesCategory = n.category === activeCategory;
    }
    
    return matchesSearch && matchesCategory;
  });

  // Extract unique categories for the matrix
  const categories = Array.from(new Set(liveNews.map(n => n.category))).filter(Boolean) as string[];

  let feedWidth = '0%';
  let mapWidth = '0%';
  let intelWidth = activeItem ? '25%' : '0%';

  if (activeItem) {
    if (isIntelMaximized) {
      feedWidth = '0%'; mapWidth = '0%'; intelWidth = '100%';
    } else {
      if (showFeed && showMap) { feedWidth = '20%'; mapWidth = '55%'; }
      else if (showFeed && !showMap) { feedWidth = '75%'; mapWidth = '0%'; }
      else if (!showFeed && showMap) { feedWidth = '0%'; mapWidth = '75%'; }
      else { intelWidth = '100%'; }
    }
  } else {
    if (showFeed && showMap) { feedWidth = '30%'; mapWidth = '70%'; }
    else if (showFeed && !showMap) { feedWidth = '100%'; mapWidth = '0%'; }
    else if (!showFeed && showMap) { feedWidth = '0%'; mapWidth = '100%'; }
  }

  // --- Dispatch System Command (Harmless Only) ---
  const dispatchCommand = async (command: string, payload: any = {}) => {
    const timeId = new Date().toISOString().substring(11,19);
    setTerminalLogs(prev => [...prev, `[${timeId}] > DISPATCHING_SYS: ${command}`]);
    
    try {
      await addDoc(collection(db, 'vxz_sys_requests'), {
        timestamp: serverTimestamp(),
        type: 'DIRECTIVE',
        command,
        payload,
        status: 'PENDING'
      });
      setTerminalLogs(prev => [...prev, `[${timeId}] [SUCCESS] Diagnostic transmitted securely.`]);
    } catch (e: any) {
      setTerminalLogs(prev => [...prev, `[${timeId}] [ERROR] Transmission failed: ${e.message}`]);
    }
  };

  const handleTerminalSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && commandInput.trim()) {
      const cmd = commandInput.trim();
      setCommandInput('');
      setTerminalLogs(prev => [...prev, `operator@vxz-sys:~$ ${cmd}`]);
      audio.playClick();

      const parts = cmd.toLowerCase().split(' ');
      const baseCmd = parts[0];

      switch(baseCmd) {
        case 'help':
          setTerminalLogs(prev => [...prev, 
            'AVAILABLE DIRECTIVES:', 
            '  readup  - Raw text intelligence stream', 
            '  ping    - Ping the backend Hunter Array status', 
            '  clear   - Clear terminal screen', 
            '  matrix  - System visual override',
            '',
            'SECURITY WARNING: Destructive commands (purge, config) are disabled in this environment.'
          ]);
          break;
        case 'readup':
          const textNews = liveNews.slice(0, 5).map(n => `[TRUTH_${n.truthScore}%] ${n.title}`).join('\n');
          setTerminalLogs(prev => [...prev, '--- LATEST INTEL STREAM ---', ...textNews.split('\n')]);
          break;
        case 'ping':
          dispatchCommand('PING_SERVER');
          break;
        case 'purge':
        case 'config':
        case 'force_scrape':
          setTerminalLogs(prev => [...prev, '[DENIED] Command requires elevated backend privileges. This frontend terminal is restricted.']);
          break;
        case 'clear':
          setTerminalLogs([]);
          break;
        case 'matrix':
          audio.playDataStream();
          setTerminalLogs(prev => [...prev, 'SYS_OVERRIDE_ACTIVE', '010101010101']);
          break;
        default:
          setTerminalLogs(prev => [...prev, `vxz: ${baseCmd}: directive not found. Type 'help'.`]);
      }
    }
  };

  const handleAddComment = () => {
    if (!commentInput.trim()) return;
    setComments(prev => [...prev, { user: user?.displayName || 'Agent', text: commentInput, time: 'Just now' }]);
    setCommentInput('');
    audio.playClick();
  };

  // TV mode filter & sorting: Show ALL news items, prioritize those with video
  // Using new bot schema: check type === 'source_video' or 'ai_generated'
  const tvItems = liveNews.map(n => {
    const hasVideo = n.media && n.media.some(m =>
      m.type === 'source_video' || m.type === 'ai_generated'
    );
    return { ...n, hasVideo };
  }).sort((a, b) => {
    if (tvSortOrder === 'score') return b.truthScore - a.truthScore;
    // Sort by timestamp (most recent first)
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() || -1;
  });
  const activeTvData = tvActiveVideo ? tvItems.find(n => n.id === tvActiveVideo) : null;

  return (
    <div className="app-container" onClick={handleAppInteraction} style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <div className="scanlines" />

      {/* --- Sidebar --- */}
      <nav className="glass" style={{ width: '64px', flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', py: '20px', borderRight: '1px solid var(--border-strong)', zIndex: 10 }}>
        <div style={{ margin: '20px 0 40px 0' }}>
          <VXZLogo size={32} />
        </div>
        <SidebarIcon icon={Radio} active={activeView === 'dashboard'} onClick={() => { setActiveView('dashboard'); setTvActiveVideo(null); }} />
        <SidebarIcon icon={Tv} active={activeView === 'tv'} color="var(--accent-red)" onClick={() => { setActiveView('tv'); setTvActiveVideo(null); }} />
        <SidebarIcon icon={TerminalIcon} active={activeView === 'terminal'} color="var(--accent-green)" onClick={() => { setActiveView('terminal'); setTvActiveVideo(null); }} />
        <SidebarIcon icon={Database} active={activeView === 'bookmarks'} color="var(--accent-amber)" onClick={() => { setActiveView('bookmarks'); setTvActiveVideo(null); }} />
        <SidebarIcon icon={Layers} />
        <div style={{ marginTop: 'auto', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {user ? (
            <div onClick={logout} style={{ cursor: 'pointer', opacity: 0.8 }} title={`Logged in as ${user.displayName || user.email}. Click to logout.`}>
              {user.photoURL ? (
                <img src={user.photoURL} alt="User" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--accent-blue)' }} />
              ) : (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {user.email ? user.email[0].toUpperCase() : 'U'}
                </div>
              )}
            </div>
          ) : (
            <SidebarIcon icon={LogIn} onClick={() => setShowAuthModal(true)} />
          )}
        </div>
      </nav>

      {/* --- Main Content --- */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
        
        {/* CNN Style Top Ticker */}
        <div className="ticker-wrap glass mono" style={{ height: '32px', flexShrink: 0, zIndex: 20 }}>
          <div className="ticker-content" style={{ display: 'flex', alignItems: 'center', gap: '40px', paddingLeft: '100vw' }}>
            {markets.map(m => (
              <div key={m.symbol} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>{m.symbol}</span>
                <span style={{ color: 'var(--text-primary)' }}>{m.price}</span>
                <span style={{ color: m.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {m.change >= 0 ? '▲' : '▼'} {Math.abs(m.change).toFixed(2)}%
                </span>
              </div>
            ))}
            <div style={{ width: '40px' }} />
            {liveNews.slice(0, 5).map(n => (
              <div key={`ticker-${n.id}`} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px' }}>
                <span style={{ color: 'var(--accent-red)' }}>[LIVE]</span>
                <span style={{ color: 'white' }}>{n.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Header */}
        <header className="glass" style={{ height: '64px', flexShrink: 0, display: 'flex', alignItems: 'center', px: '24px', borderBottom: '1px solid var(--border-strong)', justifyContent: 'space-between', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <VXZLogo size={24} glow={false} />
            <h1 style={{ fontSize: '18px', fontWeight: 700, marginLeft: '4px' }}>VXZ<span style={{ color: 'var(--accent-blue)' }}>.NEWS</span></h1>
            <div className="mono" style={{ fontSize: '12px', color: 'var(--text-tertiary)', borderLeft: '1px solid var(--border-strong)', paddingLeft: '12px', marginLeft: '12px' }}>
              INTEL-STRAT ENGINE v0.1.0
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {activeView === 'dashboard' && (
              <div style={{ display: 'flex', gap: '8px', borderRight: '1px solid var(--border-strong)', paddingRight: '16px' }}>
                <button onClick={() => { audio.playClick(); setShowFeed(!showFeed); }} style={{ background: showFeed ? 'var(--accent-blue)' : 'transparent', color: showFeed ? 'white' : 'var(--text-tertiary)', border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <List size={14} />
                </button>
                <button onClick={() => { audio.playClick(); setShowMap(!showMap); }} style={{ background: showMap ? 'var(--accent-blue)' : 'transparent', color: showMap ? 'white' : 'var(--text-tertiary)', border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Map size={14} />
                </button>
              </div>
            )}

            <div className="mono" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>DATALINK:</span>
              {loading ? (
                <span style={{ color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '4px' }} className="glow-text-amber">
                  <RefreshCw size={12} className="spin" /> SYNCING
                </span>
              ) : (
                <span style={{ color: 'var(--accent-green)' }} className="glow-text-green">ONLINE</span>
              )}
            </div>
          </div>
        </header>

        {/* Content Area - Responsive Flex Layout */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          
          {/* --- DASHBOARD VIEW --- */}
          {activeView === 'dashboard' && (
            <>
              {/* Column 1: Live Feed */}
              <motion.section 
                ref={feedScrollContainerRef}
                initial={false}
                animate={{ width: feedWidth, opacity: showFeed ? 1 : 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="glass" 
                style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: showFeed ? '16px' : '0px', borderRight: showFeed ? '1px solid var(--border-strong)' : 'none', zIndex: 5, whiteSpace: 'nowrap' }}
              >
                {showFeed && (
                  <>
                    {discovered.length > 0 && (
                      <div className="mono" style={{ background: 'rgba(0, 122, 255, 0.1)', border: '1px solid var(--accent-blue)', padding: '8px', borderRadius: '4px', fontSize: '9px', color: 'var(--accent-blue)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={10} className="spin" /> NEW_DATA_FOUND_IN_BROWSER_WIRE
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h2 className="mono" style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginRight: '16px' }}>
                        <Activity size={14} /> LIVE_FEED
                      </h2>
                      
                      {/* Category Filter Matrix - Moved to header row */}
                      <div className="hide-scrollbar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                        <button 
                          onClick={() => { audio.playClick(); setActiveCategory(null); }}
                          className="mono"
                          style={{ padding: '2px 8px', borderRadius: '12px', border: activeCategory === null ? '1px solid var(--accent-blue)' : '1px solid var(--border-strong)', background: activeCategory === null ? 'rgba(0, 122, 255, 0.1)' : 'transparent', color: activeCategory === null ? 'var(--accent-blue)' : 'var(--text-tertiary)', fontSize: '9px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          ALL_INTEL
                        </button>
                        <button 
                          onClick={() => { audio.playClick(); setActiveCategory('BREAKING'); }}
                          className="mono"
                          style={{ padding: '2px 8px', borderRadius: '12px', border: activeCategory === 'BREAKING' ? '1px solid var(--accent-red)' : '1px solid var(--border-strong)', background: activeCategory === 'BREAKING' ? 'rgba(255, 59, 48, 0.1)' : 'transparent', color: activeCategory === 'BREAKING' ? 'var(--accent-red)' : 'var(--text-tertiary)', fontSize: '9px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 'bold' }}
                        >
                          BREAKING_ONLY
                        </button>
                        {categories.length > 0 && categories.map(cat => (
                          <button 
                            key={cat}
                            onClick={() => { audio.playClick(); setActiveCategory(cat); }}
                            className="mono"
                            style={{ padding: '2px 8px', borderRadius: '12px', border: activeCategory === cat ? '1px solid var(--accent-blue)' : '1px solid var(--border-strong)', background: activeCategory === cat ? 'rgba(0, 122, 255, 0.1)' : 'transparent', color: activeCategory === cat ? 'var(--accent-blue)' : 'var(--text-tertiary)', fontSize: '9px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            {cat.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-strong)', borderRadius: '6px', padding: '8px 12px', marginBottom: '8px' }}>
                      <Search size={14} color="var(--text-tertiary)" style={{ marginRight: '8px' }} />
                      <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="FILTER FEED..." className="mono" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '11px', outline: 'none', width: '100%' }} />
                    </div>

                    {filteredNews.length === 0 ? (
                      <div className="mono" style={{ color: 'var(--text-tertiary)', fontSize: '10px', textAlign: 'center', marginTop: '20px', whiteSpace: 'normal' }}>[ NO_MATCHING_INTEL_FOUND ]</div>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {filteredNews.map((news) => {
                          const isBreaking = news.truthScore >= 80;
                          const isBookmarked = bookmarks.has(news.id);
                          return (
                            <motion.div 
                              layout
                              key={news.id} 
                              initial={{ opacity: 0, x: -20, scale: 0.95 }} 
                              animate={{ opacity: 1, x: 0, scale: 1 }} 
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              onMouseEnter={() => audio.playHover()} 
                              onClick={() => { audio.playClick(); setActiveItem(news.id); }} 
                              className="glass" 
                              style={{ padding: '12px', borderRadius: '6px', cursor: 'pointer', border: activeItem === news.id ? '1px solid var(--accent-blue)' : (isBreaking ? '1px solid var(--accent-red)' : '1px solid var(--border-subtle)'), background: isBreaking ? 'rgba(255, 59, 48, 0.03)' : 'rgba(255, 255, 255, 0.01)', display: 'flex', gap: '12px', whiteSpace: 'normal', boxShadow: isBreaking ? '0 0 15px rgba(255, 59, 48, 0.1)' : 'none', position: 'relative' }}
                            >
                              <TruthCircle score={news.truthScore} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <span className="mono" style={{ fontSize: '8px', padding: '2px 4px', borderRadius: '2px', background: `${getStatusColor(news.status)}15`, color: getStatusColor(news.status), border: `1px solid ${getStatusColor(news.status)}44` }}>{news.status}</span>
                                    {isBreaking && <span className="mono glow-text-red" style={{ fontSize: '8px', color: 'var(--accent-red)', fontWeight: 'bold', background: 'rgba(255, 59, 48, 0.1)', padding: '2px 4px', borderRadius: '2px' }}>[ BREAKING ]</span>}
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <div onClick={(e) => { e.stopPropagation(); toggleBookmark(news.id); }} style={{ color: isBookmarked ? 'var(--accent-amber)' : 'var(--text-tertiary)' }}>{isBookmarked ? <Bookmark size={12} fill="var(--accent-amber)" /> : <BookmarkPlus size={12} />}</div>
                                    <div className="mono" style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>{news.timestamp}</div>
                                  </div>
                                </div>
                                <h3 style={{ fontSize: '12px', lineHeight: 1.3, marginBottom: '6px', color: isBreaking ? 'white' : 'var(--text-primary)', fontWeight: isBreaking ? 600 : 400 }}>{news.title}</h3>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                                  <div className="mono" style={{ fontSize: '9px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}><GlobeIcon size={9} /> {news.sourceCount} SRC</div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                    {/* Infinite Scroll Trigger */}
                    {filteredNews.length >= 20 && (
                      <div ref={observerTarget} style={{ height: '40px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isLoadingMore && <RefreshCw size={14} className="spin" color="var(--text-tertiary)" />}
                      </div>
                    )}
                  </>
                )}
              </motion.section>

              {/* Column 2: The Global Eye */}
              <motion.section initial={false} animate={{ width: mapWidth, opacity: showMap ? 1 : 0 }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} style={{ position: 'relative', background: 'radial-gradient(circle at center, #111114 0%, #050506 100%)', display: showMap ? 'block' : 'none' }} onClick={() => { audio.playClick(); setActiveItem(null); }}>
                {showMap && (
                  <>
                    <GlobeView data={globeData} onPointClick={(point) => { audio.playClick(); setActiveItem(point.label); }} activeItemId={activeItem} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
                    <div className="glass mono" style={{ position: 'absolute', top: '24px', left: '24px', padding: '8px 16px', borderRadius: '4px', fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'none' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-red)', boxShadow: 'var(--glow-red)' }} /> GEO-SPATIAL_TRACKER_ACTIVE
                    </div>
                    {!activeItem && <div className="mono" style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', color: 'var(--text-tertiary)', fontSize: '10px', pointerEvents: 'none', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px' }}>[ SELECT_EVENT_ON_MAP_OR_FEED ]</div>}
                  </>
                )}
              </motion.section>

              {/* Column 3: Intel Deep Dive */}
              <AnimatePresence>
                {activeItem && activeNewsData && (
                  <motion.aside initial={{ width: '0%', opacity: 0 }} animate={{ width: intelWidth, opacity: 1 }} exit={{ width: '0%', opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="glass" style={{ borderLeft: '1px solid var(--border-strong)', display: 'flex', flexDirection: 'column', zIndex: 5, overflow: 'hidden', position: isIntelMaximized ? 'absolute' : 'relative', inset: isIntelMaximized ? 0 : 'auto', background: isIntelMaximized ? 'var(--bg-secondary)' : 'auto' }}>
                    <div style={{ width: '100%', minWidth: '300px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ padding: '20px', borderBottom: '1px solid var(--border-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="mono" style={{ fontSize: '12px' }}>INTELLIGENCE_DEEP_DIVE</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button onClick={() => { audio.playClick(); setIsIntelMaximized(!isIntelMaximized); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isIntelMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                          </button>
                          <button onClick={() => { audio.playClick(); setActiveItem(null); setIsIntelMaximized(false); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={18} /></button>
                        </div>
                      </div>
                      <div style={{ flex: 1, overflowY: 'auto', padding: isIntelMaximized ? '40px 20%' : '20px' }}>
                        <h3 style={{ fontSize: isIntelMaximized ? '24px' : '16px', marginBottom: '12px', lineHeight: 1.4 }}>{activeNewsData.title}</h3>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
                          <div className="mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={10} /> {activeNewsData.lat.toFixed(2)}, {activeNewsData.lng.toFixed(2)}</div>
                          <div onClick={() => toggleBookmark(activeNewsData.id)} style={{ cursor: 'pointer', color: bookmarks.has(activeNewsData.id) ? 'var(--accent-amber)' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px' }}>{bookmarks.has(activeNewsData.id) ? <Bookmark size={14} fill="var(--accent-amber)" /> : <BookmarkPlus size={14} />}<span className="mono" style={{ fontSize: '10px' }}>{bookmarks.has(activeNewsData.id) ? 'SAVED' : 'SAVE_INTEL'}</span></div>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: isIntelMaximized ? '15px' : '13px', lineHeight: 1.6, marginBottom: '24px' }}>{activeNewsData.summary}</p>
                        
                        {activeNewsData.sourceLinks && activeNewsData.sourceLinks.length > 0 && <LinkPreview url={activeNewsData.sourceLinks[0].url} />}
                        
                        <MediaRecon 
                          key={activeNewsData.id} 
                          query={activeNewsData.title} 
                          backendMedia={activeNewsData.media} 
                          sourceUrl={activeNewsData.sourceLinks?.[0]?.url}
                        />
                        
                        {activeNewsData.sourceLinks && activeNewsData.sourceLinks.length > 0 && (
                          <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <h4 className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Database size={12} /> PRIMARY_SOURCES
                              </h4>
                              <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-blue)', background: 'rgba(0, 122, 255, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                TOTAL: {activeNewsData.sourceCount}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {activeNewsData.sourceLinks.map((link, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                                  <a href={link.url} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); audio.playClick(); setIframeUrl(link.url); setIframeError(false); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '4px', textDecoration: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    <span className="mono" style={{ fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{link.source}</span>
                                    <ExternalLink size={12} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
                                  </a>
                                  <a href={link.url} target="_blank" rel="noreferrer" onClick={() => audio.playClick()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 12px', background: 'rgba(0, 122, 255, 0.1)', border: '1px solid var(--accent-blue)', borderRadius: '4px', textDecoration: 'none', color: 'var(--accent-blue)', cursor: 'pointer' }} title="Open in new tab">
                                    <ExternalLink size={12} />
                                  </a>
                                </div>
                              ))}
                            </div>
                            {activeNewsData.sourceCount > activeNewsData.sourceLinks.length && (
                              <div className="mono" style={{ fontSize: '9px', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '8px' }}>
                                + {activeNewsData.sourceCount - activeNewsData.sourceLinks.length} MORE SOURCES IN ACH MATRIX
                              </div>
                            )}
                          </div>
                        )}
                        <div style={{ display: 'none' }}>
                          <SourceAlignmentMap sources={activeNewsData.sourceStack} />
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                          <h4 className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>ACH_MATRIX (GATE 3)</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '11px', padding: '10px', background: 'rgba(255, 149, 0, 0.05)', borderLeft: '2px solid var(--accent-amber)' }}><div className="mono" style={{ color: 'var(--accent-amber)', marginBottom: '4px' }}>H1_REPORTED</div><p style={{ color: 'var(--text-secondary)' }}>Awaiting full corroboration from independent T1 sources.</p></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>
            </>
          )}

          {/* --- LIVE TV VIEW (YouTube Style) --- */}
          {activeView === 'tv' && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {!tvActiveVideo ? (
                // TV Grid View
                <div className="glass" style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-strong)', paddingBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ background: 'var(--accent-red)', width: '12px', height: '12px', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                      <h2 className="mono" style={{ fontSize: '18px', color: 'white' }}>LIVE BROADCAST INTERCEPTS</h2>
                    </div>
                    <div className="mono" style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
                       <span style={{ color: 'var(--text-tertiary)' }}>SORT:</span>
                       <button onClick={() => { audio.playClick(); setTvSortOrder('latest'); }} style={{ background: tvSortOrder === 'latest' ? 'rgba(0, 122, 255, 0.1)' : 'transparent', color: tvSortOrder === 'latest' ? 'var(--accent-blue)' : 'var(--text-tertiary)', border: tvSortOrder === 'latest' ? '1px solid var(--accent-blue)' : '1px solid var(--border-strong)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>LATEST</button>
                       <button onClick={() => { audio.playClick(); setTvSortOrder('score'); }} style={{ background: tvSortOrder === 'score' ? 'rgba(0, 122, 255, 0.1)' : 'transparent', color: tvSortOrder === 'score' ? 'var(--accent-blue)' : 'var(--text-tertiary)', border: tvSortOrder === 'score' ? '1px solid var(--accent-blue)' : '1px solid var(--border-strong)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>INTEGRITY_SCORE</button>
                    </div>
                  </div>
                  {tvItems.length === 0 ? (
                    <div className="glass" style={{ padding: '60px 40px', textAlign: 'center', maxWidth: '600px', margin: '40px auto', border: '1px dashed var(--accent-red)' }}>
                      <Film size={64} color="var(--accent-red)" style={{ opacity: 0.3, marginBottom: '24px', display: 'inline-block' }} />
                      <h3 className="mono" style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--accent-red)' }}>
                        [ BROADCAST_MEDIA_INDEXING_IN_PROGRESS ]
                      </h3>
                      <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', lineHeight: 1.6 }}>
                        The Hunter Array is currently extracting video intelligence from source articles.
                        Check back in 12 hours for the latest verified broadcast intercepts.
                      </p>
                      <div className="mono" style={{ marginTop: '24px', fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <RefreshCw size={12} className="spin" /> SCRAPING_ENGINE_ACTIVE
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                      {tvItems.map(news => {
                        // Use new bot schema: prioritize primary video, then any video, then images
                        const primaryMedia = news.media?.find(m => m.primary === true) || news.media?.find(m => m.type === 'source_video' || m.type === 'ai_generated') || news.media?.[0];
                        const hasPlayableVideo = primaryMedia?.type === 'source_video' || primaryMedia?.type === 'ai_generated';
                        const ytId = primaryMedia?.format === 'youtube' ? getYoutubeId(primaryMedia.media) || getYoutubeId(primaryMedia.url) : null;

                        return (
                          <motion.div key={news.id} whileHover={{ y: -5, borderColor: hasPlayableVideo ? 'var(--accent-red)' : 'var(--accent-amber)' }} onMouseEnter={() => audio.playHover()} onClick={() => { audio.playClick(); setTvActiveVideo(news.id); }} className="glass" style={{ borderRadius: '8px', overflow: 'hidden', border: `1px solid ${hasPlayableVideo ? 'var(--border-strong)' : 'var(--border-subtle)'}`, cursor: 'pointer', transition: 'border-color 0.2s ease', opacity: hasPlayableVideo ? 1 : 0.7 }}>
                            <div style={{ aspectRatio: '16/9', background: '#000', position: 'relative' }}>
                              {/* Use bot-provided thumbnail or fallback to YouTube API */}
                              {primaryMedia?.thumbnail ? (
                                <img src={primaryMedia.thumbnail} alt="Thumbnail" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/050506/34c759?text=SIGNAL_ENCRYPTED'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : ytId ? (
                                <img src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`} alt="Thumbnail" onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : primaryMedia?.format === 'mp4' || primaryMedia?.format === 'webm' ? (
                                <video src={primaryMedia.media} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : primaryMedia?.media ? (
                                <img src={primaryMedia.media} alt="" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/050506/34c759?text=SIGNAL_ENCRYPTED'; }} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: hasPlayableVideo ? 'none' : 'brightness(0.5)' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #050506 0%, #111114 100%)' }}>
                                  <AlertTriangle size={48} color="var(--accent-amber)" style={{ opacity: 0.3 }} />
                                </div>
                              )}

                              {/* Video Source Badge - Enhanced with format info */}
                              {hasPlayableVideo && (
                                <span className="mono" style={{ position: 'absolute', top: '8px', left: '8px', background: primaryMedia?.type === 'ai_generated' ? 'rgba(0,122,255,0.9)' : 'rgba(255,0,0,0.9)', padding: '4px 8px', borderRadius: '4px', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                                  {primaryMedia?.type === 'ai_generated' ? <Sparkles size={10} /> : <Tv size={10} />}
                                  {primaryMedia?.type === 'ai_generated' ? ' AI_GENERATED' : primaryMedia?.format === 'youtube' ? ' YOUTUBE' : ' VIDEO'}
                                </span>
                              )}

                              {/* No Video Badge */}
                              {!hasPlayableVideo && (
                                <span className="mono" style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(255,149,0,0.9)', padding: '4px 8px', borderRadius: '4px', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                                  <Info size={10} /> TEXT_ONLY
                                </span>
                              )}

                              {/* Duration Overlay - Now using bot-provided duration */}
                              {primaryMedia?.duration && (
                                <div className="mono" style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.9)', padding: '4px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold' }}>
                                  {formatDuration(primaryMedia.duration)}
                                </div>
                              )}

                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hasPlayableVideo ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.5)' }}>
                                {hasPlayableVideo ? (
                                  <Tv size={32} color="rgba(255,255,255,0.4)" style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))' }} />
                                ) : (
                                  <Info size={32} color="rgba(255,149,0,0.5)" style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))' }} />
                                )}
                              </div>
                            </div>
                            <div style={{ padding: '16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}><span className="mono" style={{ fontSize: '10px', color: hasPlayableVideo ? 'var(--accent-red)' : 'var(--accent-amber)' }}>{news.timestamp}</span><span className="mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>T_SCORE: {news.truthScore}%</span></div><h3 style={{ fontSize: '14px', lineHeight: 1.4, color: 'white', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{news.title}</h3></div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                // TV Watch View (YouTube Style)
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--bg-primary)' }}>
                   <div style={{ flex: 3, padding: '24px', overflowY: 'auto', display: 'block' }}>
                      <button onClick={() => { audio.playClick(); setTvActiveVideo(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', marginBottom: '24px' }} className="mono hover-white">
                        <ArrowLeft size={16} /> BACK_TO_NETWORK
                      </button>
                      
                      <div className="glass" style={{ aspectRatio: '16/9', width: '100%', background: '#000', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--accent-red)', marginBottom: '24px' }}>
                        {activeTvData && activeTvData.media && activeTvData.media.length > 0 ? (() => {
                          // Use new bot schema: prioritize primary, then any video
                          const primaryMedia = activeTvData.media.find(m => m.primary === true) || activeTvData.media.find(m => m.type === 'source_video' || m.type === 'ai_generated') || activeTvData.media[0];

                          // AI-generated content badge overlay
                          const isAiGenerated = primaryMedia.type === 'ai_generated';

                          if (primaryMedia.format === 'youtube') {
                            const ytId = getYoutubeId(primaryMedia.media) || getYoutubeId(primaryMedia.url);
                            if (ytId) {
                              return <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>;
                            }
                          } else if (primaryMedia.format === 'mp4' || primaryMedia.format === 'webm') {
                            return <video src={primaryMedia.media} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
                          } else if (primaryMedia.type === 'source_image' && primaryMedia.media) {
                            return (
                              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                <img src={primaryMedia.media} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(0.7)' }} />
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
                                  <AlertTriangle size={48} color="var(--accent-amber)" style={{ marginBottom: '16px' }} />
                                  <span className="mono" style={{ fontSize: '14px', color: 'var(--accent-amber)' }}>VIDEO_NOT_AVAILABLE</span>
                                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px' }}>Static media only - Check sources below</span>
                                </div>
                              </div>
                            );
                          } else {
                            return <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-tertiary)' }} className="mono"><AlertTriangle size={48} color="var(--accent-amber)" style={{ marginBottom: '16px', opacity: 0.5 }} /><span>[ SIGNAL_ENCRYPTED ]</span></div>;
                          }
                        })() : (
                           <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-tertiary)' }} className="mono"><AlertTriangle size={48} color="var(--accent-red)" style={{ marginBottom: '16px', opacity: 0.5 }} /><span>[ MEDIA_NOT_FOUND ]</span><span style={{ fontSize: '11px', marginTop: '8px', opacity: 0.7 }}>Text-based intelligence only</span></div>
                        )}
                      </div>

                      <div>
                         <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                           <span className="mono" style={{ padding: '4px 8px', background: 'rgba(255, 59, 48, 0.1)', color: 'var(--accent-red)', borderRadius: '4px', fontSize: '10px', border: '1px solid var(--accent-red)' }}>LIVE_BROADCAST</span>
                           <span className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{activeTvData?.timestamp}</span>
                         </div>
                         <h1 style={{ fontSize: '24px', color: 'white', marginBottom: '16px', lineHeight: 1.3 }}>{activeTvData?.title}</h1>
                         
                         <div className="glass" style={{ padding: '20px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                           <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>{activeTvData?.summary}</p>
                           
                           {/* Source Links inside Description area */}
                           {activeTvData?.sourceLinks && activeTvData.sourceLinks.length > 0 && (
                              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginTop: '8px' }}>
                                <h4 className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Database size={12} /> PRIMARY_SOURCES
                                </h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                  {activeTvData.sourceLinks.map((link, idx) => (
                                    <a key={idx} href={link.url} target="_blank" rel="noreferrer" onClick={() => audio.playClick()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(0, 122, 255, 0.1)', border: '1px solid var(--accent-blue)', borderRadius: '4px', textDecoration: 'none', color: 'var(--text-secondary)' }}>
                                      <span className="mono" style={{ fontSize: '10px', color: 'var(--accent-blue)' }}>{link.source}</span>
                                      <ExternalLink size={10} color="var(--accent-blue)" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                           )}
                         </div>
                      </div>

                      {/* Comments Section Moved to Bottom Left */}
                      <div style={{ marginTop: '24px' }}>
                        <h3 className="mono" style={{ fontSize: '16px', color: 'white', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={18} /> FIELD_REPORTS ({comments.length})</h3>
                        
                        {/* Auth Prompt / Input */}
                        <div style={{ marginBottom: '32px' }}>
                          {user ? (
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                              <img src={user.photoURL || ''} alt="User" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--accent-blue)' }} />
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <textarea value={commentInput} onChange={e => setCommentInput(e.target.value)} placeholder="Add a field report..." style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', padding: '12px', borderRadius: '6px', color: 'white', outline: 'none', fontSize: '14px', resize: 'vertical', minHeight: '80px' }} />
                                <button onClick={handleAddComment} style={{ alignSelf: 'flex-end', background: 'var(--accent-blue)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>TRANSMIT</button>
                              </div>
                            </div>
                          ) : (
                            <div className="glass" style={{ padding: '24px', textAlign: 'center', borderRadius: '8px', border: '1px dashed var(--accent-blue)' }}>
                              <div className="mono" style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>AUTHENTICATION_REQUIRED_FOR_TRANSMISSION</div>
                              <button onClick={() => { audio.playClick(); setShowAuthModal(true); }} style={{ background: 'var(--accent-blue)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto', fontWeight: 'bold' }}>
                                <LogIn size={16} /> LOGIN TO TRANSMIT
                              </button>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          {comments.map((c, i) => (
                            <div key={i} style={{ display: 'flex', gap: '16px' }}>
                               <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', fontWeight: 'bold', flexShrink: 0 }}>{c.user[0]}</div>
                               <div>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                                   <span className="mono" style={{ fontSize: '13px', color: 'white', fontWeight: 'bold' }}>{c.user}</span>
                                   <span className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{c.time}</span>
                                 </div>
                                 <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.text}</p>
                               </div>
                            </div>
                          ))}
                        </div>
                      </div>
                   </div>

                   <div className="glass" style={{ flex: 1, minWidth: '350px', borderLeft: '1px solid var(--border-strong)', padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Related Broadcasts (Right Sidebar) */}
                      <div>
                        <h3 className="mono" style={{ fontSize: '14px', color: 'white', marginBottom: '20px' }}>RELATED_INTERCEPTS</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {tvItems.filter(n => n.id !== tvActiveVideo).slice(0, 8).map(news => {
                             // Use new bot schema for thumbnails
                             const primaryMedia = news.media?.find(m => m.primary === true) || news.media?.[0];
                             const thumbnail = primaryMedia?.thumbnail || (primaryMedia?.format === 'youtube' ? `https://img.youtube.com/vi/${getYoutubeId(primaryMedia.media) || getYoutubeId(primaryMedia.url)}/mqdefault.jpg` : primaryMedia?.media);

                             return (
                               <div key={news.id} onClick={() => { audio.playClick(); setTvActiveVideo(news.id); }} style={{ display: 'flex', gap: '12px', cursor: 'pointer' }} className="hover-highlight">
                                 <div style={{ width: '160px', aspectRatio: '16/9', background: '#000', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-subtle)', position: 'relative' }}>
                                    <img src={thumbnail} alt="" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/160x90/050506/34c759?text=SIGNAL_LOST'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    {primaryMedia?.duration && (
                                      <div className="mono" style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.9)', padding: '2px 6px', borderRadius: '2px', fontSize: '9px', fontWeight: 'bold' }}>
                                        {formatDuration(primaryMedia.duration)}
                                      </div>
                                    )}
                                 </div>
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                   <h4 style={{ fontSize: '13px', color: 'white', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>{news.title}</h4>
                                   <span className="mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{news.timestamp}</span>
                                 </div>
                               </div>
                             );
                          })}
                        </div>
                      </div>
                   </div>
                </div>
              )}
            </motion.section>
          )}

          {/* --- BOOKMARKS VIEW --- */}
          {activeView === 'bookmarks' && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass" style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-strong)', paddingBottom: '16px' }}>
                <Bookmark size={24} color="var(--accent-amber)" />
                <h2 className="mono" style={{ fontSize: '18px', color: 'white' }}>SAVED_INTELLIGENCE_VAULT</h2>
              </div>
              
              {bookmarks.size === 0 ? (
                <div className="mono" style={{ color: 'var(--text-tertiary)', fontSize: '12px', textAlign: 'center', marginTop: '40px' }}>
                  [ VAULT_EMPTY. SAVED ITEMS APPEAR HERE. ]
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '16px' }}>
                  {liveNews.filter(n => bookmarks.has(n.id)).map(news => (
                    <motion.div key={news.id} whileHover={{ y: -5, borderColor: 'var(--accent-amber)' }} className="glass" style={{ padding: '16px', borderRadius: '8px', border: '1px solid var(--border-strong)', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer' }} onClick={() => { setActiveView('dashboard'); setActiveItem(news.id); }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                         <span className="mono" style={{ fontSize: '10px', color: 'var(--accent-blue)' }}>{news.timestamp}</span>
                         <div onClick={(e) => { e.stopPropagation(); toggleBookmark(news.id); }} style={{ color: 'var(--accent-amber)' }}><Bookmark size={14} fill="var(--accent-amber)" /></div>
                       </div>
                       <h3 style={{ fontSize: '15px', color: 'white', lineHeight: 1.4 }}>{news.title}</h3>
                       <p style={{ fontSize: '13px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{news.summary}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.section>
          )}

          {/* --- TERMINAL VIEW --- */}
          {activeView === 'terminal' && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass" style={{ flex: 1, padding: '24px', overflowY: 'hidden', display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(5, 5, 6, 0.95)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-strong)', paddingBottom: '16px' }}><TerminalIcon size={18} color="var(--accent-green)" /><h2 className="mono" style={{ fontSize: '16px', color: 'var(--accent-green)' }}>VXZ_SECURE_TERMINAL</h2></div>
              <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>{terminalLogs.map((log, i) => (<div key={i} className="mono" style={{ fontSize: '12px', color: (log && typeof log === 'string' && log.includes('ERROR')) ? 'var(--accent-red)' : (log && typeof log === 'string' && log.includes('SUCCESS')) ? 'var(--accent-blue)' : (log && typeof log === 'string' && (log.includes('WARNING') || log.includes('DENIED'))) ? 'var(--accent-amber)' : 'var(--accent-green)', whiteSpace: 'pre-wrap' }}>{log || ''}</div>))}<div ref={logsEndRef} /></div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '16px', borderTop: '1px solid var(--border-strong)', paddingTop: '16px' }}><span className="mono" style={{ color: 'var(--accent-green)', marginRight: '12px', fontSize: '12px' }}>operator@vxz-sys:~$</span><input type="text" value={commandInput} onChange={e => setCommandInput(e.target.value)} onKeyDown={handleTerminalSubmit} autoFocus style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--accent-green)', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '12px' }} /></div>
            </motion.section>
          )}

        </div>
      </main>

      {/* --- Iframe Modal --- */}
      <AnimatePresence>
        {iframeUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIframeUrl(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999999,
              background: 'rgba(5, 5, 6, 0.9)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '8px',
                border: '1px solid var(--accent-blue)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-strong)', background: 'rgba(0, 122, 255, 0.1)' }}>
                <div className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GlobeIcon size={14} /> {iframeUrl}
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <a href={iframeUrl} target="_blank" rel="noreferrer" className="mono hover-white" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--accent-blue)', textDecoration: 'none' }}>
                     OPEN IN NEW TAB <ExternalLink size={12} />
                  </a>
                  <button onClick={() => setIframeUrl(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <X size={18} />
                  </button>
                </div>
              </div>
              
              <div style={{ flex: 1, background: '#fff', position: 'relative' }}>
                {!iframeError ? (
                  <iframe
                    src={iframeUrl}
                    title="Source Article"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    onError={() => setIframeError(true)}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '40px', textAlign: 'center' }}>
                    <AlertTriangle size={64} color="var(--accent-amber)" style={{ marginBottom: '24px', opacity: 0.5 }} />
                    <h3 className="mono" style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--accent-amber)' }}>
                      [ IFRAME_BLOCKED_BY_SOURCE ]
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px', maxWidth: '500px' }}>
                      This source has security policies that prevent embedding. Click below to open the article in a new tab.
                    </p>
                    <a
                      href={iframeUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => audio.playClick()}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'var(--accent-blue)', color: 'white', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}
                    >
                      <ExternalLink size={18} />
                      OPEN_SOURCE_ARTICLE
                    </a>
                    <div className="mono" style={{ marginTop: '32px', fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                      <div>Domain: {iframeUrl ? new URL(iframeUrl).hostname : 'Unknown'}</div>
                      <div style={{ opacity: 0.7 }}>X-Frame-Options: DENY or SAMEORIGIN</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Auth Modal --- */}
      <AnimatePresence>
        {showAuthModal && !user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAuthModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999999,
              background: 'rgba(5, 5, 6, 0.9)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass"
              style={{
                width: '360px',
                padding: '32px',
                borderRadius: '8px',
                border: '1px solid var(--accent-blue)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                position: 'relative'
              }}
            >
              <button 
                onClick={() => setShowAuthModal(false)}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
              
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <VXZLogo size={48} glow />
                <h2 className="mono" style={{ marginTop: '16px', fontSize: '16px', color: 'white' }}>
                  {authMode === 'login' ? 'OPERATOR LOGIN' : 'OPERATOR REGISTRATION'}
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input 
                  type="email" 
                  placeholder="Email Address"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-strong)', padding: '12px', borderRadius: '4px', color: 'white', outline: 'none' }}
                />
                <input 
                  type="password" 
                  placeholder="Passkey"
                  value={authPass}
                  onChange={e => setAuthPass(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-strong)', padding: '12px', borderRadius: '4px', color: 'white', outline: 'none' }}
                />
                <button 
                  onClick={async () => {
                    audio.playClick();
                    try {
                      if (authMode === 'login') await loginWithEmail(authEmail, authPass);
                      else await registerWithEmail(authEmail, authPass);
                      setShowAuthModal(false);
                    } catch (e) {
                      alert("Authentication failed. Check credentials.");
                    }
                  }}
                  style={{ background: 'var(--accent-blue)', color: 'white', border: 'none', padding: '12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {authMode === 'login' ? 'SECURE_LOGIN' : 'INITIALIZE_ACCOUNT'}
                </button>
              </div>

              <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                OR CONNECT WITH SECURE PROVIDER
              </div>

              <button 
                onClick={async () => {
                  audio.playClick();
                  await loginWithGoogle();
                  setShowAuthModal(false);
                }}
                style={{ background: 'white', color: 'black', border: 'none', padding: '12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                GOOGLE_UPLINK
              </button>

              <div 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                style={{ textAlign: 'center', fontSize: '11px', color: 'var(--accent-blue)', cursor: 'pointer', marginTop: '8px' }}
              >
                {authMode === 'login' ? "NO CLEARANCE? REGISTER HERE" : "ALREADY CLEARED? LOGIN HERE"}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;