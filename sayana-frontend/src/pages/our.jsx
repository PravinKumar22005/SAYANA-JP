import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- 1. Fixed Icons: Wrapped adjacent paths in React Fragments <>...</> ---
const icons = {
  arrowLeft: (<path d="M15 19l-7-7 7-7" />),
  // FIX: Wrapped the two path elements in a Fragment (<> ... </>)
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

// --- 2. Consolidated API Helpers ---
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

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  let data = null;
  try { data = await res.json(); } catch(e) { /* ignore */ }
  if (!res.ok) {
    const err = new Error(data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

// --- 3. Components (Using the "connected" versions) ---

// Shared Glass Card for consistent UI
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

// Chat Component
const ChatInterface = ({ onBack }) => {
  const [chatView, setChatView] = useState('list');
  const [friendsList, setFriendsList] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [activePartner, setActivePartner] = useState(null);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (chatView === 'list') {
      fetchFriends();
      fetchFriendRequests();
    }
  }, [chatView]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activePartner]);

  const fetchFriends = async () => {
    setLoadingFriends(true);
    setError(null);
    try {
      const data = await fetchJson(`${API_BASE}/api/friends/list`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setFriendsList(data || []);
    } catch (err) {
      console.error('fetchFriends', err);
      setError(err.message || 'Failed to load friends');
    } finally {
      setLoadingFriends(false);
    }
  };

  const fetchFriendRequests = async () => {
    setLoadingRequests(true);
    try {
      const data = await fetchJson(`${API_BASE}/api/friends/requests`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setFriendRequests(data || []);
    } catch (err) {
      console.error('fetchFriendRequests', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const openConversation = async (friend) => {
    setActivePartner(friend);
    setChatView('conversation');
    try {
      const data = await fetchJson(`${API_BASE}/api/messages/${friend._id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setMessages(prev => ({ ...prev, [friend._id]: data || [] }));
    } catch (err) {
      console.error('openConversation', err);
      setMessages(prev => ({ ...prev, [friend._id]: [] }));
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activePartner) return;
    const payload = { to: activePartner._id, message: newMessage };
    try {
      const data = await fetchJson(`${API_BASE}/api/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload)
      });
      setMessages(prev => ({
        ...prev,
        [activePartner._id]: [...(prev[activePartner._id] || []), data]
      }));
      setNewMessage('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('handleSendMessage', err);
      alert(err.message || 'Failed to send message');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await fetchJson(`${API_BASE}/api/friends/accept-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ requestId })
      });
      fetchFriends();
      fetchFriendRequests();
    } catch (err) {
      console.error('acceptRequest', err);
      alert(err.message || 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await fetchJson(`${API_BASE}/api/friends/reject-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ requestId })
      });
      fetchFriendRequests();
    } catch (err) {
      console.error('rejectRequest', err);
      alert(err.message || 'Failed to reject request');
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
                <div className="p-4 text-center">Loading friends...</div>
              ) : (
                friendsList.map(friend => (
                  <GlassCard key={friend._id} className="p-4 flex items-center hover:bg-white/10 transition-colors cursor-pointer" onClick={() => openConversation(friend)}> 
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-lg font-bold">
                      {friend.name?.[0] || '?'}
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="font-semibold">{friend.name}</h3>
                      <p className="text-sm text-white/50">{(messages[friend._id] || []).length > 0 ? messages[friend._id][messages[friend._id].length-1].message : 'No messages yet'}</p>
                    </div>
                  </GlassCard>
                ))
              )}

              <div className="mt-6">
                <h4 className="text-sm text-white/70 mb-2">Friend Requests</h4>
                {loadingRequests ? <div>Loading...</div> : (
                  friendRequests.length === 0 ? <div className="text-sm text-white/50">No requests</div> : (
                    friendRequests.map(req => (
                      <div key={req._id} className="p-3 bg-white/5 rounded-md flex items-center justify-between mb-2">
                        <div>{req.from?.name || 'Unknown'}</div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAcceptRequest(req._id)} className="px-3 py-1 bg-green-600 rounded">Accept</button>
                          <button onClick={() => handleRejectRequest(req._id)} className="px-3 py-1 bg-red-600 rounded">Reject</button>
                        </div>
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
                {(messages[activePartner?._id] || []).map((msg) => (
                  <div key={msg._id || msg.id} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-5 py-3 rounded-2xl backdrop-blur-sm ${
                      msg.from === 'me' 
                      ? 'bg-purple-600/90 text-white rounded-br-sm' 
                      : 'bg-white/10 border border-white/5 text-white/90 rounded-bl-sm'
                    }`}>
                      {msg.message || msg.text}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 bg-black/20 border-t border-white/10 flex gap-3">
                <Input 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..." 
                />
                <button onClick={handleSendMessage} className="p-3 bg-purple-600 rounded-xl hover:bg-purple-500 transition-colors">
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

// News Component
const NewsInterface = ({ onBack }) => {
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson(`${API_BASE}/api/ai/news`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (data?.news) {
        const items = data.news.split(/\d+\.\s+/).filter(Boolean).map((text, i) => {
          const [titleLine, ...rest] = text.split('\n');
          return {
            id: `ai-${i}`,
            title: titleLine?.trim() || `News ${i+1}`,
            snippet: rest.join('\n').trim(),
            source: 'AI Generated'
          };
        });
        setNewsItems(items);
      } else if (Array.isArray(data)) {
        setNewsItems(data);
      } else {
        setError('Invalid news response');
      }
    } catch (err) {
      console.error('fetchNews', err);
      setError(err.message || 'Failed to fetch news');
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
        {loading && <div className="text-center py-8">Loading...</div>}
        {error && <div className="text-center text-red-400 py-8">{error}</div>}
        {!loading && !error && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {newsItems.map(item => (
              <GlassCard key={item.id} className="flex flex-col overflow-hidden group cursor-pointer hover:border-purple-500/50 transition-all">
                <div className="h-40 bg-gradient-to-br from-purple-900/50 to-blue-900/50 flex items-center justify-center">
                  <Icon path={icons.news} className="w-12 h-12 text-white/20 group-hover:text-white/60 transition-colors" />
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-semibold mb-2 leading-tight">{item.title}</h3>
                  <p className="text-sm text-white/60 mb-4 flex-1">{item.snippet}</p>
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

// Chatbot Component
const ChatbotInterface = ({ onBack }) => {
  const [messages, setMessages] = useState([
    { id: 'init', role: 'assistant', text: 'Hi! I am Sayana Bot. Ask me anything about our service.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const data = await fetchJson(`${API_BASE}/api/ai/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ message: userMsg.text })
      });
      const reply = data?.reply || data?.response || 'Sorry, no reply.';
      setMessages(prev => [...prev, { id: Date.now()+1, role: 'assistant', text: reply }]);
    } catch (err) {
      console.error('chatbot send', err);
      setMessages(prev => [...prev, { id: Date.now()+2, role: 'assistant', text: 'Error: failed to get response.' }]);
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
        <h2 className="text-xl font-bold tracking-wide">Chatbot</h2>
      </div>
      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
        {messages.map(m => (
          <div key={m.id} className={`p-3 rounded-md max-w-xs ${m.role === 'user' ? 'bg-purple-700 self-end' : 'bg-white/10 self-start'}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-white/10 flex items-center gap-3">
        <Input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask Sayana Bot..." />
        <button onClick={send} disabled={loading} className="px-4 py-2 bg-purple-600 rounded-md flex items-center justify-center">
             {loading ? '...' : <Icon path={icons.send} className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

// Settings Component
const SettingsInterface = ({ onBack }) => {
  const [profile, setProfile] = useState({ username: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await fetchJson(`${API_BASE}/api/settings/profile`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setProfile({ username: data.username || '', email: data.email || '' });
    } catch (err) {
      console.error('fetchProfile', err);
      setMessage('Failed to load profile');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, []);

  const changeUsername = async () => {
    const newName = prompt('New username', profile.username);
    if (!newName) return;
    try {
      await fetchJson(`${API_BASE}/api/settings/username`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ username: newName })
      });
      setProfile(p => ({ ...p, username: newName }));
      setMessage('Username updated');
    } catch (err) {
      console.error('changeUsername', err);
      setMessage('Failed to update username');
    }
  };

  const changePassword = async () => {
    const newPass = prompt('New password');
    if (!newPass) return;
    try {
      await fetchJson(`${API_BASE}/api/settings/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ password: newPass })
      });
      setMessage('Password updated');
    } catch (err) {
      console.error('changePassword', err);
      setMessage('Failed to update password');
    }
  };

  const deleteAccount = async () => {
    if (!confirm('Delete your account? This cannot be undone.')) return;
    try {
      await fetchJson(`${API_BASE}/api/settings/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      localStorage.removeItem('token');
      window.location.href = '/auth';
    } catch (err) {
      console.error('deleteAccount', err);
      setMessage('Failed to delete account');
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
      <div className="flex-1 p-6 space-y-6">
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-2">Account</h3>
          {loading ? <div className="text-sm text-white/60">Loading...</div> : (
            <>
              <div className="text-sm text-white/60 mb-4">Username: {profile.username}</div>
              <div className="text-sm text-white/60 mb-4">Email: {profile.email}</div>
              <div className="flex gap-3">
                <button onClick={changeUsername} className="px-4 py-2 bg-white/10 rounded-md hover:bg-white/20 transition">Change Username</button>
                <button onClick={changePassword} className="px-4 py-2 bg-white/10 rounded-md hover:bg-white/20 transition">Change Password</button>
              </div>
            </>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-2">Danger Zone</h3>
          <div className="flex gap-3">
            <button onClick={deleteAccount} className="px-4 py-2 bg-red-700 rounded-md hover:bg-red-600 transition flex items-center"><Icon path={icons.trash} className="w-4 h-4 mr-2"/> Delete Account</button>
            <button onClick={logout} className="px-4 py-2 bg-white/10 rounded-md hover:bg-white/20 transition flex items-center"><Icon path={icons.logOut} className="w-4 h-4 mr-2"/> Log Out</button>
          </div>
        </GlassCard>

        {message && <div className="text-sm text-green-400 mt-4">{message}</div>}
      </div>
    </div>
  );
};

// --- Main App ---
export default function App() {
  const [activePage, setActivePage] = useState('camera');
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [caption, setCaption] = useState('');
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

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

  const handleEndCall = () => setCallStatus('Call Ended');

  return (
    <div className="relative w-full h-screen bg-[#040307] text-white overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-purple-900/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,_#1d1431_0%,_transparent_65%)]" />
      </div>

      <div className="relative z-10 flex w-full h-full">
        <div className="flex-1 relative flex flex-col">
          <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-30 pointer-events-none">
            <div className="pointer-events-auto">
              <h1 className="text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-white">SAYANA</h1>
            </div>
            {activePage === 'camera' && (
              <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 pointer-events-auto">
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
                   {/* Remote Video (Simulated) */}
                   <video ref={remoteVideoRef} autoPlay muted playsInline className="w-full h-full object-cover opacity-80" />
                   <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
                   
                   {/* Local PIP */}
                   <div className="absolute top-24 right-6 w-32 h-48 sm:w-48 sm:h-72 bg-black/50 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/20 shadow-2xl z-20">
                      <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`} />
                      {isVideoOff && <div className="w-full h-full flex items-center justify-center text-white/50"><Icon path={icons.videoOff} className="w-8 h-8" /></div>}
                   </div>

                   <div className="absolute bottom-32 left-0 w-full text-center px-4 z-20">
                       <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-block max-w-2xl bg-black/40 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full">
                           <p className="text-lg sm:text-xl font-medium text-white/90">{caption || "Listening..."}</p>
                       </motion.div>
                   </div>

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
                <motion.div key="chat" className="w-full h-full pt-20 bg-black/40 backdrop-blur-xl" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 25 }}>
                  <ChatInterface onBack={() => setActivePage('camera')} />
                </motion.div>
              )}

              {activePage === 'news' && (
                <motion.div key="news" className="w-full h-full pt-20 bg-black/40 backdrop-blur-xl" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 25 }}>
                  <NewsInterface onBack={() => setActivePage('camera')} />
                </motion.div>
              )}

              {activePage === 'chatbot' && (
                <motion.div key="chatbot" className="w-full h-full pt-20 bg-black/40 backdrop-blur-xl" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 25 }}>
                  <ChatbotInterface onBack={() => setActivePage('camera')} />
                </motion.div>
              )}

              {activePage === 'settings' && (
                <motion.div key="settings" className="w-full h-full pt-20 bg-black/40 backdrop-blur-xl" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 25 }}>
                  <SettingsInterface onBack={() => setActivePage('camera')} />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>

        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-4">
          {[
            { id: 'camera', icon: icons.video, label: 'Call' },
            { id: 'chat', icon: icons.chat, label: 'Chat' },
            { id: 'news', icon: icons.news, label: 'News' },
            { id: 'chatbot', icon: icons.robot, label: 'AI' },
            { id: 'settings', icon: icons.settings, label: 'Settings' },
          ].map(item => (
            <div key={item.id} className="relative group flex items-center justify-end">
                <span className="absolute right-14 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold uppercase tracking-wider text-purple-300 bg-black/60 backdrop-blur px-2 py-1 rounded mr-2 pointer-events-none whitespace-nowrap">
                  {item.label}
                </span>
              <button onClick={() => setActivePage(item.id)} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 backdrop-blur-md border ${activePage === item.id ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(147,51,234,0.6)] scale-110' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/30'}`}>
                <Icon path={item.icon} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}