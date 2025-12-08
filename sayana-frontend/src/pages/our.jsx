import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext();
const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const addToast = (msg, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };
  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`pointer-events-auto px-4 py-3 rounded-xl shadow-xl border backdrop-blur-md text-sm font-medium ${
                t.type === 'error' ? 'bg-red-900/80 border-red-500/50 text-white' :
                t.type === 'success' ? 'bg-green-900/80 border-green-500/50 text-white' :
                'bg-gray-900/80 border-white/20 text-white'
              }`}
            >
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
const useToast = () => useContext(ToastContext);

// API Helpers
const rawBase = import.meta.env.VITE_API_BASE || '';
const resolveApiBase = (candidate) => {
  const v = (candidate || '').trim();
  if (!v) return window?.location?.origin || 'http://localhost:5000';
  const withoutProto = v.replace(/^https?:\/\//i, '');
  if (!withoutProto) return window?.location?.origin || 'http://localhost:5000';
  if (!/^https?:\/\//i.test(v)) return window?.location?.origin || 'http://localhost:5000';
  return v.replace(/\/+$/, '');
};
const API_BASE = resolveApiBase(rawBase);

const getToken = () => localStorage.getItem('token');

// Centralized Fetch Wrapper
async function apiCall(endpoint, { method = 'GET', body = null } = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(url, opts);
  } catch (e) {
    throw new Error('Network error. Please check your connection.');
  }

  // Handle 401 Unauthorized globally
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/auth'; // Simple redirect
    throw new Error('Session expired');
  }

  let data = null;
  try { data = await res.json(); } catch (e) { /* ignore empty responses */ }

  if (!res.ok) {
    throw new Error(data?.message || `Error ${res.status}: ${res.statusText}`);
  }
  return data;
}

// --- 2. Icons & UI Components ---

const icons = {
  arrowLeft: (<path d="M15 19l-7-7 7-7" />),
  send: (<><path d="M22 2L11 13" /><path d="M22 2l-7 20 1-7 7-13z" /></>),
  news: (<circle cx="12" cy="12" r="10" />),
  robot: (<rect x="6" y="6" width="12" height="12" rx="2" />),
  mic: (<path d="M12 1v11" />),
  micOff: (<path d="M3 3l18 18" />),
  video: (<rect x="3" y="6" width="18" height="12" rx="2" />),
  videoOff: (<path d="M3 3l18 18" />),
  phoneOff: (<path d="M2 2l20 20" />),
  chat: (<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />),
  settings: (<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />),
  logOut: (<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />),
  trash: (<path d="M3 6h18" />)
};

const Icon = ({ path, className = 'w-5 h-5', onClick }) => (
  <svg 
    onClick={onClick}
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    {path}
  </svg>
);

const Input = (props) => (
  <input
    {...props}
    className={`w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all ${props.className || ''}`}
  />
);

const GlassCard = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl ${className}`}>
    {children}
  </div>
);

const GlassButton = ({ children, onClick, active, className = "" }) => (
  <button
    onClick={onClick}
    className={`relative p-3 rounded-xl transition-all duration-300 ease-out border
      ${active 
        ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]' 
        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20'
      } ${className}`}
  >
    {children}
  </button>
);

// --- 3. Feature Components ---

// 🆕 added onFriendRequestsChange prop
const ChatInterface = ({ onBack, currentUser, onFriendRequestsChange }) => {
  const { addToast } = useToast();
  const [chatView, setChatView] = useState('list');
  const [friendsList, setFriendsList] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [activePartner, setActivePartner] = useState(null);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingSent, setLoadingSent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (chatView === 'list') {
      fetchFriends();
      fetchFriendRequests();
      fetchSentFriendRequests();
    }
  }, [chatView]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activePartner]);

  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const data = await apiCall('/api/friends/list');
      setFriendsList(data || []);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoadingFriends(false);
    }
  };

  const fetchFriendRequests = async () => {
    setLoadingRequests(true);
    try {
      const data = await apiCall('/api/friends/requests');
      const list = data || [];
      setFriendRequests(list);
      onFriendRequestsChange?.(Array.isArray(list) ? list.length : 0); // 🆕 sync count up
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchSentFriendRequests = async () => {
    setLoadingSent(true);
    try {
      const data = await apiCall('/api/friends/requests/sent');
      setSentRequests(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSent(false);
    }
  };

  // Search users by name/email and send request
  const searchUsers = async () => {
    const q = searchQuery.trim();
    if (!q) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const data = await apiCall(`/api/friends/users/search?query=${encodeURIComponent(q)}`);
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      await apiCall('/api/friends/send-request', { method: 'POST', body: { to: userId } });
      addToast('Friend request sent', 'success');
      setSearchResults(prev => prev.map(u => u._id === userId ? { ...u, _requested: true } : u));
      // Refresh outgoing/incoming lists so UI reflects new state
      fetchSentFriendRequests();
      fetchFriendRequests();
    } catch (err) {
      addToast(err.message || 'Failed to send request', 'error');
      // If backend says already sent or already friends, sync lists to reflect current status
      fetchSentFriendRequests();
      fetchFriendRequests();
      fetchFriends();
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await apiCall('/api/friends/accept-request', { method: 'POST', body: { requestId } });
      setFriendRequests(prev => {
        const updated = prev.filter(r => r._id !== requestId);
        onFriendRequestsChange?.(updated.length); // 🆕 update badge count
        return updated;
      });
      await fetchFriends();
      addToast('Friend request accepted', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to accept request', 'error');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await apiCall('/api/friends/reject-request', { method: 'POST', body: { requestId } });
      setFriendRequests(prev => {
        const updated = prev.filter(r => r._id !== requestId);
        onFriendRequestsChange?.(updated.length); // 🆕 update badge count
        return updated;
      });
      addToast('Friend request rejected', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to reject request', 'error');
    }
  };

  const openConversation = async (friend) => {
    setActivePartner(friend);
    setChatView('conversation');
    try {
      const data = await apiCall(`/api/messages/${friend._id}`);
      setMessages(prev => ({ ...prev, [friend._id]: data || [] }));
    } catch (err) {
      addToast('Could not load messages', 'error');
      setMessages(prev => ({ ...prev, [friend._id]: [] }));
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activePartner) return;
    
    // Optimistic Update
    const tempId = Date.now();
    const tempMsg = { _id: tempId, from: currentUser?._id, message: newMessage, createdAt: new Date() };
    
    setMessages(prev => ({
      ...prev,
      [activePartner._id]: [...(prev[activePartner._id] || []), tempMsg]
    }));
    setNewMessage('');

    try {
      const data = await apiCall('/api/messages/send', {
        method: 'POST',
        body: { to: activePartner._id, message: tempMsg.message }
      });
      // Assume success; could reconcile with server response if needed
    } catch (err) {
      addToast('Failed to send message', 'error');
      // Rollback would go here
    }
  };

  return (
    <div className="flex flex-col h-full text-white">
      <div className="flex items-center p-6 border-b border-white/10 bg-black/20">
        <button onClick={chatView === 'conversation' ? () => setChatView('list') : onBack} className="p-2 hover:bg-white/10 rounded-full mr-4">
          <Icon path={icons.arrowLeft} className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold tracking-wide">
          {chatView === 'conversation' ? activePartner?.name : 'Messages'}
        </h2>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {chatView === 'list' ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-y-auto p-4 space-y-3"
            >
              {loadingFriends ? (
                <div className="p-4 text-center text-white/50">Loading friends...</div>
              ) : (
                friendsList.length === 0 ? <div className="p-4 text-center text-white/50">No friends yet. Add some!</div> :
                friendsList.map(friend => (
                  <GlassCard key={friend._id} className="p-4 flex items-center hover:bg-white/10 transition-colors cursor-pointer" onClick={() => openConversation(friend)}> 
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-lg font-bold uppercase">
                      {friend.name?.[0] || '?'}
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="font-semibold">{friend.name}</h3>
                      <p className="text-sm text-white/50 truncate">
                        {(messages[friend._id] || []).length > 0 
                          ? messages[friend._id][messages[friend._id].length-1].message 
                          : 'Start a conversation'}
                      </p>
                    </div>
                  </GlassCard>
                ))
              )}

              {/* Friend Search */}
              <div className="mt-6 border-t border-white/10 pt-4">
                <h4 className="text-sm text-white/70 mb-3 uppercase tracking-wider font-bold">Add Friends</h4>
                <div className="flex gap-3 mb-3">
                  <Input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search by name or email" />
                  <button onClick={searchUsers} className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition">Search</button>
                </div>
                {searchLoading && <div className="text-sm text-white/50">Searching...</div>}
                {!searchLoading && searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map(u => {
                      const isFriend = friendsList.some(f => f._id === u._id);
                      const incoming = friendRequests.some(r => r.from?._id === u._id);
                      const outgoing = sentRequests.some(r => r.to?._id === u._id);
                      const status = isFriend ? 'friend' : incoming ? 'incoming' : outgoing ? 'outgoing' : null;
                      return (
                        <div key={u._id} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                          <div>
                            <div className="font-semibold">{u.name}</div>
                            <div className="text-xs text-white/50">{u.email}</div>
                          </div>
                          {status === 'friend' && <span className="px-3 py-1 rounded text-xs bg-white/10 text-green-300 border border-white/10">Friend</span>}
                          {status === 'incoming' && <span className="px-3 py-1 rounded text-xs bg-yellow-900/40 text-yellow-200 border border-yellow-800/40">Incoming request</span>}
                          {status === 'outgoing' && <span className="px-3 py-1 rounded text-xs bg-white/10 text-white/60 border border-white/10">Pending</span>}
                          {!status && (
                            <button onClick={() => sendFriendRequest(u._id)} className="px-3 py-1 rounded text-sm bg-purple-600/80 hover:bg-purple-600">Send Request</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                {/* 🆕 Add "X New" pill */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm text-white/70 uppercase tracking-wider font-bold">Friend Requests</h4>
                  {friendRequests.length > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-500/90 text-white uppercase tracking-wide">
                      {friendRequests.length} New
                    </span>
                  )}
                </div>
                {loadingRequests ? <div className="text-sm text-white/50">Loading...</div> : (
                  friendRequests.length === 0 ? <div className="text-sm text-white/50 italic">No pending requests</div> : (
                    friendRequests.map(req => (
                      <div key={req._id} className="p-3 bg-white/5 rounded-xl flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium">{req.from?.name || 'Unknown'}</div>
                          <div className="text-xs text-white/50">{req.from?.email}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAcceptRequest(req._id)} className="px-3 py-1 bg-green-600/80 hover:bg-green-600 rounded text-sm transition">Accept</button>
                          <button onClick={() => handleRejectRequest(req._id)} className="px-3 py-1 bg-red-600/80 hover:bg-red-600 rounded text-sm transition">Reject</button>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                <h4 className="text-sm text-white/70 mb-3 uppercase tracking-wider font-bold">Sent Requests</h4>
                {loadingSent ? <div className="text-sm text-white/50">Loading...</div> : (
                  sentRequests.length === 0 ? <div className="text-sm text-white/50 italic">No sent requests</div> : (
                    sentRequests.map(req => (
                      <div key={req._id} className="p-3 bg-white/5 rounded-xl flex items-center justify-between mb-2">
                        <div className="font-medium">{req.to?.name || 'Unknown'}</div>
                        <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/60 border border-white/10">Pending</span>
                      </div>
                    ))
                  )
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="conversation"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full flex flex-col"
            >
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(messages[activePartner?._id] || []).map((msg) => {
                  // LOGIC FIX: Check against currentUser._id
                  const isMe = msg.from === 'me' || msg.from === currentUser?._id;
                  
                  return (
                    <div key={msg._id || msg.id || Math.random()} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-5 py-3 rounded-2xl backdrop-blur-sm shadow-md ${
                        isMe
                        ? 'bg-purple-600 text-white rounded-br-sm' 
                        : 'bg-white/10 border border-white/5 text-white/90 rounded-bl-sm'
                      }`}>
                        {msg.message || msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 bg-black/20 border-t border-white/10 flex gap-3">
                <Input 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..." 
                  autoFocus
                />
                <button onClick={handleSendMessage} className="p-3 bg-purple-600 rounded-xl hover:bg-purple-500 transition-colors shadow-lg shadow-purple-900/20">
                  <Icon path={icons.send} className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const NewsInterface = ({ onBack }) => {
  const { addToast } = useToast();
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/api/ai/news');
      
      let items = [];
      if (data?.news && typeof data.news === 'string') {
        // Robust parsing for AI numbered lists
        items = data.news.split(/\d+\.\s+/).filter(Boolean).map((text, i) => {
          const [titleLine, ...rest] = text.split('\n');
          return {
            id: `ai-${i}`,
            title: titleLine?.trim() || `News Update ${i+1}`,
            snippet: rest.join('\n').trim(),
            source: 'AI Curated'
          };
        });
      } else if (Array.isArray(data)) {
        items = data;
      }
      
      setNewsItems(items);
    } catch (err) {
      addToast('Failed to load news', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNews(); }, []);

  return (
    <div className="flex flex-col h-full text-white">
      <div className="flex items-center p-6 border-b border-white/10 bg-black/20">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full mr-4">
          <Icon path={icons.arrowLeft} className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold tracking-wide">Latest News</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-pulse">
             {[1,2,3].map(i => <div key={i} className="h-48 bg-white/5 rounded-2xl"></div>)}
          </div>
        )}
        {!loading && newsItems.length === 0 && <div className="text-center text-white/50">No news available at the moment.</div>}
        
        {!loading && newsItems.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {newsItems.map(item => (
              <GlassCard key={item.id} className="flex flex-col overflow-hidden group cursor-pointer hover:border-purple-500/50 transition-all h-full">
                <div className="h-32 bg-gradient-to-br from-purple-900/40 to-blue-900/40 flex items-center justify-center">
                  <Icon path={icons.news} className="w-10 h-10 text-white/20 group-hover:text-white/60 transition-colors" />
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-semibold mb-2 leading-tight text-purple-100">{item.title}</h3>
                  <p className="text-sm text-white/60 mb-4 flex-1 line-clamp-4">{item.snippet}</p>
                  <span className="text-xs text-purple-400 font-medium uppercase tracking-wider">{item.source}</span>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ChatbotInterface = ({ onBack }) => {
  const { addToast } = useToast();
  const [messages, setMessages] = useState([
    { id: 'init', role: 'assistant', text: 'Hi! I am Sayana Bot. Ask me anything about our service.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await apiCall('/api/ai/chatbot', {
        method: 'POST',
        body: { message: userMsg.text }
      });
      const reply = data?.reply || data?.response || 'I am processing your request...';
      setMessages(prev => [...prev, { id: Date.now()+1, role: 'assistant', text: reply }]);
    } catch (err) {
      addToast('Bot failed to respond', 'error');
      setMessages(prev => [...prev, { id: Date.now()+2, role: 'assistant', text: 'Sorry, I am having trouble connecting right now.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full text-white">
      <div className="flex items-center p-6 border-b border-white/10 bg-black/20">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full mr-4">
          <Icon path={icons.arrowLeft} className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold tracking-wide">AI Assistant</h2>
      </div>
      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
        {messages.map(m => (
          <div key={m.id} className={`p-4 rounded-2xl max-w-[85%] ${m.role === 'user' ? 'bg-purple-700 text-white self-end rounded-br-none' : 'bg-white/10 text-gray-100 self-start rounded-bl-none'}`}>
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="p-4 bg-white/10 rounded-2xl rounded-bl-none self-start flex gap-1 items-center">
            <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce delay-75"></span>
            <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce delay-150"></span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>
      <div className="p-4 border-t border-white/10 flex items-center gap-3 bg-black/20">
        <Input 
          value={input} 
          onChange={e=>setInput(e.target.value)} 
          placeholder="Ask something..." 
          onKeyPress={(e) => e.key === 'Enter' && !loading && send()}
        />
        <button onClick={send} disabled={loading} className="px-4 py-3 bg-purple-600 rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-purple-500 transition">
             {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Icon path={icons.send} className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

const SettingsInterface = ({ onBack, currentUser, refreshUser }) => {
  const { addToast } = useToast();
  
  const changeUsername = async () => {
    const newName = prompt('Enter new username:', currentUser?.username || currentUser?.name);
    if (!newName) return;
    try {
      await apiCall('/api/settings/username', {
        method: 'PUT',
        body: { name: newName } 
      });
      addToast('Username updated successfully', 'success');
      refreshUser();
    } catch (err) {
      addToast(err.message || 'Failed to update username', 'error');
    }
  };

  const changePassword = async () => {
    const oldPassword = prompt('Enter current password:');
    if (!oldPassword) return;
    const newPassword = prompt('Enter new password:');
    if (!newPassword) return;

    try {
      await apiCall('/api/settings/password', {
        method: 'PUT',
        body: { oldPassword, newPassword }
      });
      addToast('Password updated successfully', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update password', 'error');
    }
  };

  const deleteAccount = async () => {
    if (!confirm('Are you absolutely sure? This cannot be undone.')) return;
    try {
      await apiCall('/api/settings/account', { method: 'DELETE' });
      localStorage.removeItem('token');
      window.location.href = '/auth';
    } catch (err) {
      addToast('Failed to delete account', 'error');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    window.location.href = '/auth';
  };

  return (
    <div className="flex flex-col h-full text-white">
      <div className="flex items-center p-6 border-b border-white/10 bg-black/20">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full mr-4">
          <Icon path={icons.arrowLeft} className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold tracking-wide">Settings</h2>
      </div>
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-6 border-b border-white/10 pb-2">Profile</h3>
          <div className="grid gap-6">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/40 mb-1">Display Name</label>
              <div className="flex justify-between items-center">
                <span className="text-lg">{currentUser?.name || currentUser?.username || 'Loading...'}</span>
                <button onClick={changeUsername} className="text-purple-400 hover:text-purple-300 text-sm font-medium">Edit</button>
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/40 mb-1">Email Address</label>
              <div className="flex justify-between items-center">
                <span className="text-lg text-white/80">{currentUser?.email || 'Loading...'}</span>
              </div>
            </div>
            <div className="pt-2">
               <button onClick={changePassword} className="text-sm bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition">Change Password</button>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-red-500/20">
          <h3 className="text-lg font-semibold mb-4 text-red-400">Danger Zone</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={logout} className="px-4 py-3 bg-white/5 rounded-xl hover:bg-white/10 transition flex items-center justify-center flex-1">
              <Icon path={icons.logOut} className="w-4 h-4 mr-2"/> Log Out
            </button>
            <button onClick={deleteAccount} className="px-4 py-3 bg-red-900/50 text-red-200 border border-red-800/50 rounded-xl hover:bg-red-900/80 transition flex items-center justify-center flex-1">
              <Icon path={icons.trash} className="w-4 h-4 mr-2"/> Delete Account
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

// --- Main App ---

function AppContent() {
  const { addToast } = useToast();
  const [activePage, setActivePage] = useState('camera');
  const [currentUser, setCurrentUser] = useState(null);
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [caption, setCaption] = useState('');
  const [pendingFriendCount, setPendingFriendCount] = useState(0); // 🆕 badge count
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Fetch Current User on Mount
  const refreshUser = async () => {
    try {
      const data = await apiCall('/api/settings/profile'); // Or /api/auth/me depending on backend
      const user = data?.user || data;
      if (!user?._id && user?.id) user._id = user.id; // normalize id
      setCurrentUser(user);
    } catch (err) {
      // Fallback: try debug whoami to at least get minimal identity
      try {
        const who = await apiCall('/api/debug/whoami');
        const user = { _id: who.id, name: who.name, email: who.email };
        setCurrentUser(user);
      } catch (e) {
        console.error('Auth check failed', err);
      }
    }
  };

  // 🆕 Get pending friend requests count (for initial badge + polling)
  const refreshPendingFriends = async () => {
    try {
      const data = await apiCall('/api/friends/requests');
      setPendingFriendCount(Array.isArray(data) ? data.length : 0);
    } catch (err) {
      console.error('Failed to fetch pending friend requests', err);
    }
  };

  useEffect(() => {
    refreshUser();
    refreshPendingFriends();

    // Optional: live-ish updates like Instagram
    const interval = setInterval(refreshPendingFriends, 20000); // every 20 seconds
    return () => clearInterval(interval);
  }, []);

  // Simulation of Call Timer
  useEffect(() => {
    const timer = setTimeout(() => setCallStatus('00:00'), 2000);
    const interval = setInterval(() => {
      if (callStatus !== 'Connecting...' && callStatus !== 'Call Ended') {
        const [m, s] = callStatus.split(':').map(Number);
        let ns = (s || 0) + 1;
        let nm = m || 0;
        if (ns > 59) { ns = 0; nm++; }
        setCallStatus(`${nm < 10 ? '0'+nm : nm}:${ns < 10 ? '0'+ns : ns}`);
      }
    }, 1000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [callStatus]);

  const handleEndCall = () => {
    setCallStatus('Call Ended');
    addToast('Call ended', 'info');
    setTimeout(() => {
       setCallStatus('00:00'); 
    }, 2000);
  };

  return (
    <div className="relative w-full h-screen bg-[#040307] text-white overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-purple-900/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,_#1d1431_0%,_transparent_65%)]" />
      </div>

      <div className="relative z-10 flex w-full h-full">
        <div className="flex-1 relative flex flex-col">
          {/* Header */}
          <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-30 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-white">SAYANA</h1>
            </div>
            {activePage === 'camera' && (
              <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 pointer-events-auto shadow-lg">
                <span className="text-sm font-mono text-purple-300 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${callStatus === 'Call Ended' ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></span>
                  {callStatus}
                </span>
              </div>
            )}
          </header>

          <main className="w-full h-full relative">
            <AnimatePresence mode="wait">
              {activePage === 'camera' && (
                <motion.div key="camera" className="w-full h-full flex items-center justify-center relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                   {/* Simulated Remote Video */}
                   <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                      <video ref={remoteVideoRef} autoPlay muted playsInline className="w-full h-full object-cover opacity-80" />
                      {!remoteVideoRef.current?.srcObject && <div className="absolute text-white/20 text-6xl font-bold uppercase tracking-widest">Waiting for Video...</div>}
                   </div>
                   
                   <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
                   
                   {/* Local PIP */}
                   <div className="absolute top-24 right-6 w-32 h-48 sm:w-48 sm:h-72 bg-black/50 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/20 shadow-2xl z-20">
                      <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`} />
                      {isVideoOff && <div className="w-full h-full flex items-center justify-center text-white/50"><Icon path={icons.videoOff} className="w-8 h-8" /></div>}
                   </div>

                   {/* Captions */}
                   <div className="absolute bottom-32 left-0 w-full text-center px-4 z-20">
                       <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-block max-w-2xl bg-black/60 backdrop-blur-md border border-white/10 px-6 py-4 rounded-3xl">
                           <p className="text-lg sm:text-xl font-medium text-white/90">{caption || "Listening for conversation..."}</p>
                       </motion.div>
                   </div>

                  {/* Controls */}
                  <div className="absolute bottom-8 left-0 w-full flex justify-center gap-6 z-30">
                    <GlassButton onClick={() => setIsMuted(!isMuted)} active={!isMuted} className="!rounded-full w-14 h-14 flex items-center justify-center">
                        <Icon path={isMuted ? icons.micOff : icons.mic} className="w-6 h-6" />
                    </GlassButton>
                    <GlassButton onClick={() => setIsVideoOff(!isVideoOff)} active={!isVideoOff} className="!rounded-full w-14 h-14 flex items-center justify-center">
                        <Icon path={isVideoOff ? icons.videoOff : icons.video} className="w-6 h-6" />
                    </GlassButton>
                    <button onClick={handleEndCall} className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-all hover:scale-105">
                        <Icon path={icons.phoneOff} className="w-8 h-8" />
                    </button>
                  </div>
                </motion.div>
              )}

              {activePage === 'chat' && (
                <motion.div key="chat" className="w-full h-full pt-20 bg-black/40 backdrop-blur-xl" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }}>
                  <ChatInterface
                    onBack={() => setActivePage('camera')}
                    currentUser={currentUser}
                    onFriendRequestsChange={setPendingFriendCount} // 🆕 keep badge in sync
                  />
                </motion.div>
              )}

              {activePage === 'news' && (
                <motion.div key="news" className="w-full h-full pt-20 bg-black/40 backdrop-blur-xl" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }}>
                  <NewsInterface onBack={() => setActivePage('camera')} />
                </motion.div>
              )}

              {activePage === 'chatbot' && (
                <motion.div key="chatbot" className="w-full h-full pt-20 bg-black/40 backdrop-blur-xl" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }}>
                  <ChatbotInterface onBack={() => setActivePage('camera')} />
                </motion.div>
              )}

              {activePage === 'settings' && (
                <motion.div key="settings" className="w-full h-full pt-20 bg-black/40 backdrop-blur-xl" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }}>
                  <SettingsInterface onBack={() => setActivePage('camera')} currentUser={currentUser} refreshUser={refreshUser} />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* Sidebar Nav */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-5">
          {[
            { id: 'camera', icon: icons.video, label: 'Video Call' },
            { id: 'chat', icon: icons.chat, label: 'Messages' },
            { id: 'news', icon: icons.news, label: 'News Feed' },
            { id: 'chatbot', icon: icons.robot, label: 'AI Assistant' },
            { id: 'settings', icon: icons.settings, label: 'Preferences' },
          ].map(item => (
            <div key={item.id} className="relative group flex items-center justify-end">
                <span className="absolute right-14 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0 text-xs font-bold uppercase tracking-wider text-purple-200 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg mr-2 pointer-events-none whitespace-nowrap border border-white/10 shadow-xl">
                  {item.label}
                </span>
              <button
                onClick={() => setActivePage(item.id)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 backdrop-blur-md border ${
                  activePage === item.id ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_20px_rgba(147,51,234,0.6)] scale-110' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/30'
                }`}
              >
                <Icon path={item.icon} />
              </button>

              {/* 🆕 Red ping badge on Messages */}
              {item.id === 'chat' && pendingFriendCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg border border-black/50">
                  {pendingFriendCount > 9 ? '9+' : pendingFriendCount}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
