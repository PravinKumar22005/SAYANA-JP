import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SignTranslatorPanel from '../components/SignTranslatorPanel';

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
                t.type === 'error'
                  ? 'bg-red-900/80 border-red-500/50 text-white'
                  : t.type === 'success'
                  ? 'bg-green-900/80 border-green-500/50 text-white'
                  : 'bg-gray-900/80 border-white/20 text-white'
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

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/auth';
    throw new Error('Session expired');
  }

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    /* ignore empty responses */
  }

  if (!res.ok) {
    throw new Error(data?.message || `Error ${res.status}: ${res.statusText}`);
  }
  return data;
}

// --- 2. Icons & UI Components ---

const icons = {
  arrowLeft: <path d="M15 19l-7-7 7-7" />,
  send: (
    <>
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20 1-7 7-13z" />
    </>
  ),
  news: <circle cx="12" cy="12" r="10" />,
  robot: <rect x="6" y="6" width="12" height="12" rx="2" />,
  mic: <path d="M12 1v11" />,
  micOff: <path d="M3 3l18 18" />,
  video: <rect x="3" y="6" width="18" height="12" rx="2" />,
  videoOff: <path d="M3 3l18 18" />,
  phoneOff: <path d="M2 2l20 20" />,
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  settings: <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />,
  logOut: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />,
  trash: <path d="M3 6h18" />
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
    className={`w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all ${
      props.className || ''
    }`}
  />
);

const GlassCard = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl ${className}`}
  >
    {children}
  </div>
);

const GlassButton = ({ children, onClick, active, className = '' }) => (
  <button
    onClick={onClick}
    className={`relative p-3 rounded-xl transition-all duration-300 ease-out border ${
      active
        ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]'
        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20'
    } ${className}`}
  >
    {children}
  </button>
);

// --- 3. Feature Components ---

// Instagram-ish Messages UI
const ChatInterface = ({ onBack, currentUser, onFriendRequestsChange }) => {
  const { addToast } = useToast();
  const [chatView, setChatView] = useState('list'); // mobile: 'list' | 'conversation'
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
      onFriendRequestsChange?.(Array.isArray(list) ? list.length : 0);
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

  const searchUsers = async () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const data = await apiCall(`/api/friends/users/search?query=${encodeURIComponent(q)}`);
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      await apiCall('/api/friends/send-request', { method: 'POST', body: { to: userId } });
      addToast('Friend request sent', 'success');
      setSearchResults((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, _requested: true } : u))
      );
      fetchSentFriendRequests();
      fetchFriendRequests();
    } catch (err) {
      addToast(err.message || 'Failed to send request', 'error');
      fetchSentFriendRequests();
      fetchFriendRequests();
      fetchFriends();
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await apiCall('/api/friends/accept-request', { method: 'POST', body: { requestId } });
      setFriendRequests((prev) => {
        const updated = prev.filter((r) => r._id !== requestId);
        onFriendRequestsChange?.(updated.length);
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
      setFriendRequests((prev) => {
        const updated = prev.filter((r) => r._id !== requestId);
        onFriendRequestsChange?.(updated.length);
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
      setMessages((prev) => ({ ...prev, [friend._id]: data || [] }));
    } catch (err) {
      addToast('Could not load messages', 'error');
      setMessages((prev) => ({ ...prev, [friend._id]: [] }));
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activePartner) return;

    const tempId = Date.now();
    const tempMsg = {
      _id: tempId,
      from: currentUser?._id,
      message: newMessage,
      createdAt: new Date()
    };

    setMessages((prev) => ({
      ...prev,
      [activePartner._id]: [...(prev[activePartner._id] || []), tempMsg]
    }));
    setNewMessage('');

    try {
      await apiCall('/api/messages/send', {
        method: 'POST',
        body: { to: activePartner._id, message: tempMsg.message }
      });
    } catch {
      addToast('Failed to send message', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full text-white">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-3">
          <button
            onClick={chatView === 'conversation' ? () => setChatView('list') : onBack}
            className="p-2 hover:bg-white/10 rounded-full md:hidden"
          >
            <Icon path={icons.arrowLeft} className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold tracking-wide">Messages</h2>
            <p className="text-xs text-white/50 hidden md:block">
              Chat with your friends in SAYANA
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-black/30 backdrop-blur-xl">
        {/* Left: Conversations + Requests */}
        <div
          className={`${
            chatView === 'conversation' ? 'hidden' : 'flex'
          } md:flex md:w-80 flex-col border-r border-white/10 bg-black/40`}
        >
          <div className="p-4 border-b border-white/10">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email"
              className="text-sm"
            />
            <button
              onClick={searchUsers}
              className="mt-2 w-full text-sm px-3 py-2 bg-white/10 rounded-lg hover:bg-white/15 transition"
            >
              Search
            </button>
            {searchLoading && (
              <div className="mt-2 text-xs text-white/50">Searching...</div>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="px-4 py-3 border-b border-white/10 space-y-2 max-h-48 overflow-y-auto">
              {searchResults.map((u) => {
                const isFriend = friendsList.some((f) => f._id === u._id);
                const incoming = friendRequests.some((r) => r.from?._id === u._id);
                const outgoing = sentRequests.some((r) => r.to?._id === u._id);
                const status = isFriend
                  ? 'friend'
                  : incoming
                  ? 'incoming'
                  : outgoing
                  ? 'outgoing'
                  : null;
                return (
                  <div
                    key={u._id}
                    className="flex items-center justify-between bg-white/5 rounded-xl p-2"
                  >
                    <div>
                      <div className="text-sm font-semibold">{u.name}</div>
                      <div className="text-[11px] text-white/50">{u.email}</div>
                    </div>
                    {status === 'friend' && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-green-300 border border-white/10">
                        Friend
                      </span>
                    )}
                    {status === 'incoming' && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-yellow-900/40 text-yellow-200 border border-yellow-800/40">
                        Incoming
                      </span>
                    )}
                    {status === 'outgoing' && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-white/60 border border-white/10">
                        Pending
                      </span>
                    )}
                    {!status && (
                      <button
                        onClick={() => sendFriendRequest(u._id)}
                        className="px-2 py-1 rounded text-[11px] bg-purple-600/80 hover:bg-purple-600"
                      >
                        Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <div className="px-4 pt-4 pb-2 text-xs uppercase tracking-wider text-white/50 font-semibold">
              Chats
            </div>
            {loadingFriends ? (
              <div className="p-4 text-center text-white/50 text-sm">Loading friends...</div>
            ) : friendsList.length === 0 ? (
              <div className="p-4 text-center text-white/50 text-sm">
                No friends yet. Add some!
              </div>
            ) : (
              <div className="px-2 space-y-1">
                {friendsList.map((friend) => (
                  <button
                    key={friend._id}
                    onClick={() => openConversation(friend)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/10 transition ${
                      activePartner?._id === friend._id ? 'bg-white/10' : ''
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-sm font-semibold uppercase">
                      {friend.name?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{friend.name}</div>
                      <div className="text-xs text-white/50 truncate">
                        {(messages[friend._id] || []).length > 0
                          ? messages[friend._id][messages[friend._id].length - 1].message
                          : 'Start a conversation'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Friend Requests */}
            <div className="mt-4 border-t border-white/10 pt-3 px-4 pb-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs text-white/70 uppercase tracking-wider font-bold">
                  Friend Requests
                </h4>
                {friendRequests.length > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-500/90 text-white uppercase tracking-wide">
                    {friendRequests.length} New
                  </span>
                )}
              </div>
              {loadingRequests ? (
                <div className="text-xs text-white/50">Loading...</div>
              ) : friendRequests.length === 0 ? (
                <div className="text-xs text-white/50 italic">No pending requests</div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {friendRequests.map((req) => (
                    <div
                      key={req._id}
                      className="p-2 bg-white/5 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {req.from?.name || 'Unknown'}
                        </div>
                        <div className="text-[11px] text-white/50">
                          {req.from?.email || ''}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAcceptRequest(req._id)}
                          className="px-2 py-1 bg-green-600/80 hover:bg-green-600 rounded text-[11px] transition"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req._id)}
                          className="px-2 py-1 bg-red-600/80 hover:bg-red-600 rounded text-[11px] transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sent Requests */}
            <div className="border-t border-white/10 pt-3 px-4 pb-4">
              <h4 className="text-xs text-white/70 mb-2 uppercase tracking-wider font-bold">
                Sent Requests
              </h4>
              {loadingSent ? (
                <div className="text-xs text-white/50">Loading...</div>
              ) : sentRequests.length === 0 ? (
                <div className="text-xs text-white/50 italic">No sent requests</div>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {sentRequests.map((req) => (
                    <div
                      key={req._id}
                      className="p-2 bg-white/5 rounded-xl flex items-center justify-between"
                    >
                      <div className="text-sm font-medium">{req.to?.name || 'Unknown'}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/60 border border-white/10">
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Conversation */}
        <div
          className={`${
            chatView === 'conversation' ? 'flex' : 'hidden'
          } md:flex flex-1 flex-col bg-black/60`}
        >
          {!activePartner ? (
            <div className="flex-1 flex items-center justify-center text-white/40 text-sm">
              Select a chat on the left to start messaging.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/50">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-sm font-semibold uppercase">
                  {activePartner.name?.[0] || '?'}
                </div>
                <div>
                  <div className="text-sm font-semibold">{activePartner.name}</div>
                  <div className="text-[11px] text-white/50 truncate max-w-[180px]">
                    {activePartner.email}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(messages[activePartner._id] || []).map((msg) => {
                  const isMe = msg.from === 'me' || msg.from === currentUser?._id;
                  return (
                    <div
                      key={msg._id || msg.id || Math.random()}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-md ${
                          isMe
                            ? 'bg-purple-600 text-white rounded-br-sm'
                            : 'bg-white/10 border border-white/5 text-white/90 rounded-bl-sm'
                        }`}
                      >
                        {msg.message || msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t border-white/10 bg-black/50 flex items-center gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  className="p-3 bg-purple-600 rounded-xl hover:bg-purple-500 transition-colors shadow-lg shadow-purple-900/20"
                >
                  <Icon path={icons.send} className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const NewsInterface = ({ onBack }) => {
  const { addToast } = useToast();
  const [newsItems, setNewsItems] = useState([]);
  const [highlightItems, setHighlightItems] = useState([]);
  const [summary, setSummary] = useState('');
  const [meta, setMeta] = useState({ generatedAt: '', model: '' });
  const [loading, setLoading] = useState(true);

  const parseLegacyNews = (text) => {
    if (!text || typeof text !== 'string') return [];
    return text
      .split(/\d+\.\s+/)
      .filter(Boolean)
      .map((entry, index) => {
        const [titleLine, ...rest] = entry.split('\n');
        return {
          id: `legacy-${index}`,
          title: titleLine?.trim() || `News Update ${index + 1}`,
          snippet: rest.join('\n').trim(),
          source: 'AI Digest',
          topic: 'Highlights'
        };
      });
  };

  const formatTimestamp = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (value) => {
    if (!value) return 'Just now';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const openArticle = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const fetchNews = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/api/ai/news');
      let items = [];

      if (Array.isArray(data?.items)) {
        items = data.items;
      } else if (Array.isArray(data)) {
        items = data;
      } else if (typeof data?.news === 'string') {
        items = parseLegacyNews(data.news);
      }

      const highlights = Array.isArray(data?.signHighlights)
        ? data.signHighlights
        : items.filter((entry) => entry.priority);

      let general = Array.isArray(data?.generalItems)
        ? data.generalItems
        : items.filter((entry) => !entry.priority);

      if (!general.length && items.length && !highlights.length) {
        general = items;
      }

      const extractedSummary = typeof data?.summary === 'string' ? data.summary.trim() : '';
      const fallbackSummary = items.length
        ? items
            .slice(0, Math.min(items.length, 4))
            .map((item, idx) => `${idx + 1}. ${item.title}`)
            .join('\n')
        : '';

      setSummary(extractedSummary || fallbackSummary);
      setMeta({
        generatedAt: data?.generatedAt || '',
        model: data?.model || ''
      });
      setHighlightItems(highlights);
      setNewsItems(general);
    } catch (error) {
      console.error(error);
      addToast('Failed to load news', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const summaryPoints = summary
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col h-full text-white">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full mr-3"
          >
            <Icon path={icons.arrowLeft} className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold tracking-wide">Latest News</h2>
            <p className="text-xs text-white/50">Curated highlights across world & tech</p>
          </div>
        </div>
        <button
          onClick={fetchNews}
          disabled={loading}
          className="px-3 py-2 text-xs font-semibold rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {summaryPoints.length > 0 && (
          <GlassCard className="p-5 border-white/15">
            <div className="flex items-center gap-2 mb-3">
              <Icon path={icons.news} className="w-5 h-5 text-purple-300" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-purple-200">
                Daily Brief
              </h3>
            </div>
            <ul className="space-y-2 text-sm text-white/80">
              {summaryPoints.map((point, idx) => (
                <li key={`${point}-${idx}`} className="flex gap-2">
                  <span className="text-purple-300 font-semibold">{idx + 1}.</span>
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-[11px] uppercase tracking-wider text-white/40 flex flex-wrap gap-4">
              {meta.model && <span>Model: {meta.model}</span>}
              {meta.generatedAt && <span>Updated {formatTimestamp(meta.generatedAt)}</span>}
            </div>
          </GlassCard>
        )}

        {highlightItems.length > 0 && !loading && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-teal-200">
                Sign Language Highlights
              </h3>
              <span className="text-[11px] text-white/40">Spotlighting ISL stories first</span>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {highlightItems.map((item) => (
                <GlassCard
                  key={item.id}
                  className="flex flex-col overflow-hidden border-teal-400/30 bg-gradient-to-br from-emerald-900/20 to-blue-900/10"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => openArticle(item.url)}
                    onKeyDown={(evt) => {
                      if (evt.key === 'Enter' || evt.key === ' ') {
                        evt.preventDefault();
                        openArticle(item.url);
                      }
                    }}
                    className="h-full flex flex-col p-5 cursor-pointer"
                  >
                    <div className="text-[11px] uppercase tracking-wider text-teal-200 flex items-center justify-between">
                      <span>{item.topic || 'Sign Story'}</span>
                      <span>{formatDate(item.publishedAt)}</span>
                    </div>
                    <h3 className="text-base font-semibold mt-3 mb-2 leading-tight text-emerald-100">
                      {item.title}
                    </h3>
                    <p className="text-xs text-white/80 flex-1 leading-relaxed line-clamp-5">
                      {item.snippet}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-[11px] text-emerald-200">
                      <span className="font-semibold">{item.source}</span>
                      {item.url && (
                        <span className="inline-flex items-center gap-1 text-white/70">
                          Read
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M7 17 17 7" />
                            <path d="M8 7h9v9" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-white/5 rounded-2xl" />
            ))}
          </div>
        )}

        {!loading && newsItems.length === 0 && highlightItems.length === 0 && (
          <div className="text-center text-white/50">No news available at the moment.</div>
        )}

        {!loading && newsItems.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {newsItems.map((item) => (
              <GlassCard
                key={item.id}
                className="flex flex-col overflow-hidden group hover:border-purple-500/40 transition-all h-full"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openArticle(item.url)}
                  onKeyDown={(evt) => {
                    if (evt.key === 'Enter' || evt.key === ' ') {
                      evt.preventDefault();
                      openArticle(item.url);
                    }
                  }}
                  className="h-full flex flex-col text-left cursor-pointer focus:outline-none p-5"
                >
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-purple-300">
                    <span>{item.topic || 'Headline'}</span>
                    <span>{formatDate(item.publishedAt)}</span>
                  </div>
                  <h3 className="text-base font-semibold mt-3 mb-2 leading-tight text-purple-100">
                    {item.title}
                  </h3>
                  <p className="text-xs text-white/70 flex-1 leading-relaxed line-clamp-5">
                    {item.snippet}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-[11px] text-purple-200">
                    <span className="font-semibold">{item.source}</span>
                    {item.url && (
                      <span className="inline-flex items-center gap-1 text-white/70">
                        Read
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M7 17 17 7" />
                          <path d="M8 7h9v9" />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ChatGPT-ish Assistant UI
const ChatbotInterface = ({ onBack }) => {
  const { addToast } = useToast();
  const [messages, setMessages] = useState([
    {
      id: 'init',
      role: 'assistant',
      text: 'Hi! I am Sayana Bot. Ask me anything about our service or sign-language communication.'
    }
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
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await apiCall('/api/ai/chatbot', {
        method: 'POST',
        body: { message: userMsg.text }
      });
      const reply = data?.reply || data?.response || 'I am processing your request...';
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', text: reply }
      ]);
    } catch {
      addToast('Bot failed to respond', 'error');
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: 'assistant',
          text: 'Sorry, I am having trouble connecting right now.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full text-white bg-gradient-to-b from-black/60 via-black/80 to-black">
      <div className="flex items-center p-4 border-b border-white/10 bg-black/60">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/10 rounded-full mr-3"
        >
          <Icon path={icons.arrowLeft} className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-semibold tracking-wide">AI Assistant</h2>
          <p className="text-xs text-white/50">Chat with Sayana Bot</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-purple-600 text-white rounded-br-md'
                    : 'bg-white/5 text-gray-100 rounded-bl-md border border-white/10'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="p-3 bg-white/5 rounded-2xl rounded-bl-md flex gap-1 items-center">
                <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce delay-75" />
                <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce delay-150" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/80">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something about SAYANA..."
            onKeyPress={(e) => e.key === 'Enter' && !loading && send()}
            className="text-sm"
          />
          <button
            onClick={send}
            disabled={loading}
            className="px-4 py-3 bg-purple-600 rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-purple-500 transition shadow-lg shadow-purple-900/40"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Icon path={icons.send} className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingsInterface = ({ onBack, currentUser, refreshUser }) => {
  const { addToast } = useToast();

  const changeUsername = async () => {
    const newName = prompt(
      'Enter new username:',
      currentUser?.username || currentUser?.name
    );
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
    } catch {
      addToast('Failed to delete account', 'error');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    window.location.href = '/auth';
  };

  return (
    <div className="flex flex-col h-full text-white">
      <div className="flex items-center p-4 border-b border-white/10 bg-black/40">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/10 rounded-full mr-3"
        >
          <Icon path={icons.arrowLeft} className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-semibold tracking-wide">Settings</h2>
          <p className="text-xs text-white/50">Manage your SAYANA account</p>
        </div>
      </div>
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 border-b border-white/10 pb-2">
            Profile
          </h3>
          <div className="grid gap-5">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/40 mb-1">
                Display Name
              </label>
              <div className="flex justify-between items-center">
                <span className="text-lg">
                  {currentUser?.name || currentUser?.username || 'Loading...'}
                </span>
                <button
                  onClick={changeUsername}
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                >
                  Edit
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/40 mb-1">
                Email Address
              </label>
              <div className="flex justify-between items-center">
                <span className="text-lg text-white/80">
                  {currentUser?.email || 'Loading...'}
                </span>
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={changePassword}
                className="text-sm bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition"
              >
                Change Password
              </button>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-red-500/20">
          <h3 className="text-lg font-semibold mb-4 text-red-400">Danger Zone</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={logout}
              className="px-4 py-3 bg-white/5 rounded-xl hover:bg-white/10 transition flex items-center justify-center flex-1"
            >
              <Icon path={icons.logOut} className="w-4 h-4 mr-2" /> Log Out
            </button>
            <button
              onClick={deleteAccount}
              className="px-4 py-3 bg-red-900/50 text-red-200 border border-red-800/50 rounded-xl hover:bg-red-900/80 transition flex items-center justify-center flex-1"
            >
              <Icon path={icons.trash} className="w-4 h-4 mr-2" /> Delete Account
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
  const [activePage, setActivePage] = useState('translator'); // 'translator' | 'camera' | 'chat' | 'news' | 'chatbot' | 'settings'
  const [currentUser, setCurrentUser] = useState(null);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [caption, setCaption] = useState('');
  const [sentenceHistoryState, setSentenceHistoryState] = useState([]);
  const [pendingFriendCount, setPendingFriendCount] = useState(0);
  const [signWords, setSignWords] = useState([]);
  const [lastSignLabel, setLastSignLabel] = useState(null);
  const [lastSignTime, setLastSignTime] = useState(0);

  const localVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectingRef = useRef(false);
  const pendingResetRef = useRef(false);

  const refreshUser = async () => {
    try {
      const data = await apiCall('/api/settings/profile');
      const user = data?.user || data;
      if (!user?._id && user?.id) user._id = user.id;
      setCurrentUser(user);
    } catch (err) {
      try {
        const who = await apiCall('/api/debug/whoami');
        const user = { _id: who.id, name: who.name, email: who.email };
        setCurrentUser(user);
      } catch (e) {
        console.error('Auth check failed', err);
      }
    }
  };

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

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      refreshPendingFriends();
    }, 60000);

    const onVisibility = () => {
      if (!document.hidden) refreshPendingFriends();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const startLocalStream = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        addToast('Camera not supported in this browser', 'error');
        return;
      }

      if (streamRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      streamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      addToast('Unable to access camera. Please allow camera permission.', 'error');
    }
  };

  const stopLocalStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (activePage === 'camera' && !isVideoOff) {
      startLocalStream();
    } else {
      stopLocalStream();
    }

    return () => {
      stopLocalStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, isVideoOff]);

  // Sign-detect loop
  useEffect(() => {
    if (activePage !== 'camera') return;

    const intervalMs = 1500;
    let stoppedDueToQuota = false;

    const tick = async () => {
      if (stoppedDueToQuota) return;

      if (isVideoOff) return;
      if (!localVideoRef.current || !canvasRef.current) return;
      if (!streamRef.current) return;
      if (detectingRef.current) return;

      detectingRef.current = true;
      try {
        const video = localVideoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!video.videoWidth || !video.videoHeight) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = dataUrl.split(',')[1];

        const shouldReset = pendingResetRef.current;
        const requestBody = shouldReset ? { image: base64, reset: true } : { image: base64 };

        const res = await apiCall('/api/ai/sign-detect', {
          method: 'POST',
          body: requestBody,
        });

        if (shouldReset) {
          pendingResetRef.current = false;
        }

        const resolvedSentence =
          typeof res?.sentence === 'string' ? res.sentence.trim() : '';
        const resolvedSentenceHistory = Array.isArray(res?.sentenceHistory)
          ? res.sentenceHistory
          : [];
        const cleanedHistory = resolvedSentenceHistory
          .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
          .filter(Boolean);
        setSentenceHistoryState(cleanedHistory);
        const historySentence = resolvedSentenceHistory.length
          ? String(resolvedSentenceHistory[resolvedSentenceHistory.length - 1] || '').trim()
          : '';
        const bestSentence = resolvedSentence || historySentence;

        const stableToken =
          typeof res?.stableToken === 'string' ? res.stableToken.trim() : '';
        const fallbackLatest =
          typeof res?.latestLabel === 'string' ? res.latestLabel.trim() : '';
        const fallbackLabel = typeof res?.label === 'string' ? res.label.trim() : '';
        const resolvedLabel = stableToken || fallbackLatest || fallbackLabel || '';
        const resolvedConfidence = stableToken
          ? typeof res?.confidence === 'number'
            ? res.confidence
            : typeof res?.latestConfidence === 'number'
            ? res.latestConfidence
            : 0
          : typeof res?.latestConfidence === 'number'
          ? res.latestConfidence
          : typeof res?.confidence === 'number'
          ? res.confidence
          : 0;
        const resolvedRaw =
          (typeof res?.latestRaw === 'string' && res.latestRaw.trim()) ||
          (typeof res?.raw === 'string' && res.raw.trim()) ||
          '';

        if (resolvedLabel) {
          const now = Date.now();

          if (resolvedConfidence < 0.5) {
            if (!signWords.length) {
              setCaption('Listening for conversation...');
            }
            return;
          }

          const MIN_GAP_MS = 1500;
          const normalizedLabel = resolvedLabel.toLowerCase();
          if (normalizedLabel === lastSignLabel && now - lastSignTime < MIN_GAP_MS) {
            return;
          }

          setLastSignLabel(normalizedLabel);
          setLastSignTime(now);

          setSignWords((prev) => {
            if (prev[prev.length - 1] === resolvedLabel) return prev;
            const next = [...prev, resolvedLabel];
            if (!bestSentence) {
              const sentence = next.join(' ');
              setCaption(sentence);
            }
            return next;
          });

          if (bestSentence) {
            setCaption(bestSentence);
          }
        } else if (bestSentence) {
          setCaption(bestSentence);
        } else if (resolvedRaw) {
          if (!signWords.length) {
            setCaption(resolvedRaw);
          }
        } else {
          if (!signWords.length) {
            setCaption('Listening for conversation...');
          }
        }
      } catch (err) {
        console.error('Sign detect error:', err);

        if (err?.message?.includes('429')) {
          stoppedDueToQuota = true;
          setCaption(
            'Sign detection paused due to AI usage limits. Please try again later.'
          );
          addToast(
            'Sign detection limit reached for now. Try again later.',
            'info'
          );
        }
      } finally {
        detectingRef.current = false;
      }
    };

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [
    activePage,
    isVideoOff,
    addToast,
    signWords.length,
    lastSignLabel,
    lastSignTime
  ]);

  const resetTranscript = () => {
    setSignWords([]);
    setLastSignLabel(null);
    setCaption('Listening for conversation...');
    setSentenceHistoryState([]);
    pendingResetRef.current = true;
  };

  const transcriptText = sentenceHistoryState.length
    ? sentenceHistoryState.join('\n')
    : caption || 'Listening for conversation...';
  const transcriptActive = sentenceHistoryState.length > 0 || signWords.length > 0;

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
          <header className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-30 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-white">
                SAYANA
              </h1>
            </div>
          </header>

          <main className="w-full h-full relative pt-12">
            <AnimatePresence mode="wait">
              {activePage === 'translator' && (
                <motion.div
                  key="translator"
                  className="w-full h-full overflow-y-auto px-4 sm:px-8 py-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4 }}
                >
                  <SignTranslatorPanel apiBase={API_BASE} />
                </motion.div>
              )}
              {/* Sign Studio */}
              {activePage === 'camera' && (
                <motion.div
                  key="camera"
                  className="w-full h-full flex items-center justify-center relative"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="w-full h-full bg-black flex items-center justify-center">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className={`w-full h-full object-cover ${
                        isVideoOff ? 'opacity-0' : 'opacity-100'
                      } transition-opacity duration-300`}
                    />
                    {(!streamRef.current || isVideoOff) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 text-white/60 bg-black/60 backdrop-blur-sm">
                        <p className="text-lg font-semibold mb-2">
                          Camera is off
                        </p>
                        <p className="text-sm text-white/50 mb-4 max-w-md">
                          Turn on your camera to start live sign detection.
                        </p>
                      </div>
                    )}
                  </div>

                  <canvas ref={canvasRef} className="hidden" />

                  {/* Captions */}
                  <div className="absolute bottom-28 left-0 w-full text-center px-4 z-20">
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="inline-block max-w-2xl bg-black/70 backdrop-blur-md border border-white/10 px-6 py-4 rounded-3xl shadow-xl"
                    >
                      {transcriptActive && (
                        <div className="flex items-center justify-between mb-1 text-[11px] text-white/60">
                          <span>Live sign transcript</span>
                          <button
                            onClick={resetTranscript}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                      <p className="text-lg sm:text-xl font-medium text-white/90 whitespace-pre-line">
                        {transcriptText}
                      </p>
                    </motion.div>
                  </div>

                  {/* Controls */}
                  <div className="absolute bottom-6 left-0 w-full flex justify-center gap-4 z-30">
                    <GlassButton
                      onClick={() => setIsVideoOff((v) => !v)}
                      active={!isVideoOff}
                      className="!rounded-full w-14 h-14 flex items-center justify-center"
                    >
                      <Icon
                        path={isVideoOff ? icons.videoOff : icons.video}
                        className="w-6 h-6"
                      />
                    </GlassButton>

                    <div className="px-4 py-2 rounded-full bg-black/70 border border-white/15 text-xs flex items-center gap-2 backdrop-blur-md">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="uppercase tracking-wider font-semibold text-white/70">
                        {isVideoOff
                          ? 'Detection paused'
                          : 'Detecting signs...'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activePage === 'chat' && (
                <motion.div
                  key="chat"
                  className="w-full h-full bg-black/40 backdrop-blur-xl"
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                >
                  <ChatInterface
                    onBack={() => setActivePage('camera')}
                    currentUser={currentUser}
                    onFriendRequestsChange={setPendingFriendCount}
                  />
                </motion.div>
              )}

              {activePage === 'news' && (
                <motion.div
                  key="news"
                  className="w-full h-full bg-black/40 backdrop-blur-xl"
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                >
                  <NewsInterface onBack={() => setActivePage('camera')} />
                </motion.div>
              )}

              {activePage === 'chatbot' && (
                <motion.div
                  key="chatbot"
                  className="w-full h-full bg-black/40 backdrop-blur-xl"
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                >
                  <ChatbotInterface onBack={() => setActivePage('camera')} />
                </motion.div>
              )}

              {activePage === 'settings' && (
                <motion.div
                  key="settings"
                  className="w-full h-full bg-black/40 backdrop-blur-xl"
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                >
                  <SettingsInterface
                    onBack={() => setActivePage('camera')}
                    currentUser={currentUser}
                    refreshUser={refreshUser}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* Sidebar Nav */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-5">
          {[
            { id: 'translator', icon: icons.mic, label: 'Voice to Sign' },
            { id: 'camera', icon: icons.video, label: 'Sign Studio' },
            { id: 'chat', icon: icons.chat, label: 'Messages' },
            { id: 'news', icon: icons.news, label: 'News Feed' },
            { id: 'chatbot', icon: icons.robot, label: 'AI Assistant' },
            { id: 'settings', icon: icons.settings, label: 'Preferences' }
          ].map((item) => (
            <div
              key={item.id}
              className="relative group flex items-center justify-end"
            >
              <span className="absolute right-14 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0 text-xs font-bold uppercase tracking-wider text-purple-200 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg mr-2 pointer-events-none whitespace-nowrap border border-white/10 shadow-xl">
                {item.label}
              </span>
              <button
                onClick={() => setActivePage(item.id)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 backdrop-blur-md border ${
                  activePage === item.id
                    ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_20px_rgba(147,51,234,0.6)] scale-110'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/30'
                }`}
              >
                <Icon path={item.icon} />
              </button>

              {/* Badge on Messages */}
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
