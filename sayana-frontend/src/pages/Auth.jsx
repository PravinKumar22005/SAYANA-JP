import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// CSS injected once to avoid re-inserting <style> on every render (prevents blinking)
const AUTH_CSS = `
/* Use the same core font & color theme as the main app */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');

:root { --coilSize: 14px; --delayCount: 40ms; --scaleMe: 1; --scaleFlip: 1; --posFlip: 0; }
.font-inter { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; }
.koi-container { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; background: linear-gradient(180deg, #040307 0%, #070012 100%); color: #fff; overflow: hidden; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; }
.fish { position: absolute; top: -35%; left: 0; width: 100%; height: 100%; filter: drop-shadow(calc(var(--coilSize) * 4) calc(var(--coilSize) / 3) 5px rgba(0,0,0,0.3)); }
.fish .koiCoil { position: absolute; width: var(--coilSize); height: var(--coilSize); background-color: #ff7a9a; border-radius: 50%; top: 50%; left: 50%; margin-left: calc(var(--coilSize) / -2); margin-top: calc(var(--coilSize) / -2); transform: scale(var(--scaleMe), var(--scaleMe)); filter: contrast(140%); offset-path: path("M11.7692 229.5C14.552 200.052 7.51901 171.858 -42.8757 170.644C-105.869 169.128 -131.294 76.612 -101.695 51.5872C-72.0955 26.5625 -24.6607 -50.7867 70.5883 51.5872C165.837 153.961 27.7073 131.211 33.0199 183.157C38.3326 235.102 90.3211 195.669 139.274 223.727C188.226 251.785 207.959 299.56 139.274 316.243C70.5883 332.926 41.3685 398.9 81.9726 419.754C122.577 440.608 222 478.524 222 419.754C222 372.738 222 242.432 222 183.157C219.091 129.948 175.78 30.8091 25.8099 59.9288C-161.652 96.3284 -30.3529 119.837 25.8099 141.07C81.9726 162.303 171.529 204.769 126.751 260.506C81.9726 316.243 101.326 362.501 139.274 373.496C177.222 384.492 170.012 464.495 70.5883 462.979C-28.835 461.462 -42.8757 393.015 -42.8757 373.496C-42.8757 238.288 11.7692 293 11.7692 240.506C11.7692 208.05 11.7692 237.336 11.7692 229.5Z"); animation: fishAnim 20000ms linear infinite; }
.fish:nth-of-type(2) { transform-origin: top center; transform: scale(-1, 1); }
.fish:nth-of-type(2) .koiCoil { background-color: #fff; }
.fish .koiCoil:nth-of-type(15), .fish .koiCoil:nth-of-type(14) { background-color: #ff7a9a; }
.fish:nth-of-type(2) .koiCoil:nth-of-type(15), .fish:nth-of-type(2) .koiCoil:nth-of-type(14) { background-color: #fff; }
.fish .koiCoil:nth-of-type(15)::after { content: ":"; position: absolute; color: #111; font-weight: 800; text-align: center; line-height: 60%; font-size: calc(var(--coilSize) * 1.2); }
.fish .koiCoil:nth-of-type(1)::before { content: ""; position: absolute; width: 100%; height: 50%; top: 25%; left: -100%; border-radius: var(--coilSize); background-color: #fff; transform-origin: center right; animation: backFlip 200ms ease-in-out alternate infinite; }
.fish .koiCoil:nth-of-type(14) { --scaleMe: 1.2; animation-delay: calc(var(--delayCount) * 1); }
.fish .koiCoil:nth-of-type(13) { --scaleMe: 1.35; animation-delay: calc(var(--delayCount) * 2); }
.fish .koiCoil:nth-of-type(12) { --scaleMe: 1.55; animation-delay: calc(var(--delayCount) * 3); }
.fish .koiCoil:nth-of-type(11) { --scaleMe: 1.75; animation-delay: calc(var(--delayCount) * 4); }
.fish .koiCoil:nth-of-type(10) { --scaleMe: 1.9; animation-delay: calc(var(--delayCount) * 5); }
.fish .koiCoil:nth-of-type(9) { --scaleMe: 2; animation-delay: calc(var(--delayCount) * 6); }
.fish .koiCoil:nth-of-type(8) { --scaleMe: 2; animation-delay: calc(var(--delayCount) * 7); }
.fish .koiCoil:nth-of-type(7) { --scaleMe: 2; animation-delay: calc(var(--delayCount) * 8); }
.fish .koiCoil:nth-of-type(6) { --scaleMe: 1.9; animation-delay: calc(var(--delayCount) * 9); }
.fish .koiCoil:nth-of-type(5) { --scaleMe: 1.75; animation-delay: calc(var(--delayCount) * 10); }
.fish .koiCoil:nth-of-type(4) { --scaleMe: 1.55; animation-delay: calc(var(--delayCount) * 11); }
.fish .koiCoil:nth-of-type(3) { --scaleMe: 1.35; animation-delay: calc(var(--delayCount) * 12); }
.fish .koiCoil:nth-of-type(2) { --scaleMe: 1.2; animation-delay: calc(var(--delayCount) * 13); }
.fish .koiCoil:nth-of-type(1) { animation-delay: calc(var(--delayCount) * 14); }
.fish .koiCoil:nth-of-type(12)::before, .fish .koiCoil:nth-of-type(12)::after { content: ""; position: absolute; width: 100%; height: 20%; top: -10%; left: -100%; border-radius: var(--coilSize); background-color: #fff; transform-origin: center right; animation: sideFlip 500ms ease-in-out alternate infinite; }
.fish .koiCoil:nth-of-type(12)::after { --scaleFlip: -1; --posFlip: calc(var(--coilSize) * -1); }
.seaLevel { background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.0)); position: absolute; width: 100%; height: 100%; top: 0; left: 0; opacity: 0.18; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fadeIn 0.5s ease-out forwards; position: absolute; top: 0; left: 0; z-index: 10; }
@keyframes fishAnim { 0% { offset-distance: 0%; } 100% { offset-distance: 100%; } }
@keyframes backFlip { 0% { transform: rotate(45deg); } 100% { transform: rotate(-45deg); } }
@keyframes sideFlip { 0% { transform: scale(1, var(--scaleFlip)) translateY(var(--posFlip))rotate(80deg); } 100% { transform: scale(1, var(--scaleFlip)) translateY(var(--posFlip))rotate(20deg); } }
 
/* Form theming to match App.jsx - glass / mirror look + water hover ripple */
.auth-wrapper {
  position: relative;
  display: inline-block;
  padding: 28px; /* more space for the outer water effect */
}

.auth-card {
  position: relative;
  overflow: hidden;
  background: rgba(255,255,255,0.06); /* slightly lighter translucent mirror */
  border: 1px solid rgba(255,255,255,0.16);
  backdrop-filter: blur(10px) saturate(125%);
  -webkit-backdrop-filter: blur(10px) saturate(125%);
  color: #fff;
  transition: transform 240ms ease, box-shadow 240ms ease;
  transform: translateZ(0);
  box-shadow: 0 8px 28px rgba(2,6,23,0.45);
  border-radius: 18px;
}

/* subtle water-like sheen / ripple layer */
.auth-card::before {
  content: "";
  position: absolute;
  inset: -40% -40% -40% -40%;
  background: radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06), transparent 8%),
              radial-gradient(circle at 80% 70%, rgba(255,255,255,0.04), transparent 10%);
  opacity: 0.5;
  pointer-events: none;
  mix-blend-mode: overlay;
  transform: translate3d(0,0,0);
  transition: opacity 400ms ease, transform 600ms ease;
}

/* moving ripple animation — only plays while hover */
.auth-card::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02), transparent 30%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 360ms ease;
}

.auth-card:hover {
  transform: translateY(-8px) scale(1.01);
  box-shadow: 0 18px 40px rgba(2,6,23,0.65);
}
.auth-card:hover::before {
  animation: waterDrift 2200ms linear infinite;
  opacity: 0.85;
}
.auth-card:hover::after {
  opacity: 1;
}

/* Outer wrapper water effect (visible outside the card) */
.auth-wrapper::before {
  content: "";
  position: absolute;
  inset: -60%;
  /* follow-cursor radial at CSS vars --mx / --my, layered for a wake-like look */
  background:
    radial-gradient(circle at var(--mx,30%) var(--my,30%), rgba(255,255,255,0.12) 0%, rgba(124,58,237,0.14) 8%, rgba(124,58,237,0.08) 14%, transparent 28%),
    radial-gradient(circle at calc(var(--mx,30%) + 8%) calc(var(--my,30%) + 6%), rgba(255,255,255,0.06) 0%, rgba(124,58,237,0.06) 10%, transparent 24%);
  opacity: var(--mopacity, 0);
  pointer-events: none;
  transition: opacity 180ms linear, transform 420ms ease;
  filter: blur(10px) saturate(140%);
  mix-blend-mode: screen;
  transform-origin: center;
}
.auth-wrapper:hover::before {
  animation: waterDrift 2200ms linear infinite;
  transform: translateY(-6px) rotate(1deg) scale(var(--mscale,1.02));
}

@keyframes waterDrift {
  0% { background-position: 0% 0%, 100% 100%; transform: rotate(0deg); }
  50% { background-position: 10% 20%, 90% 80%; transform: rotate(2deg); }
  100% { background-position: 0% 0%, 100% 100%; transform: rotate(0deg); }
}

.auth-input {
  background: rgba(255,255,255,0.03);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.08);
  transition: box-shadow 180ms ease, border-color 180ms ease;
}
.auth-input:focus { box-shadow: 0 6px 18px rgba(124,58,237,0.12); border-color: rgba(124,58,237,0.8); }

.auth-primary {
  background-color: #7c3aed; /* purple-600 */
  color: #fff;
  border: 1px solid rgba(124,58,237,0.12);
  transition: transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}
.auth-primary:hover { background-color: #6d28d9; transform: translateY(-2px); box-shadow: 0 8px 30px rgba(109,40,217,0.18); }
.auth-link { color: #c4b5fd; }

/* small concentric ripple that sits inside the card and follows the cursor (subtle) */
.auth-card::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.06) 0%, rgba(124,58,237,0.06) 12%, transparent 30%);
  opacity: calc(var(--mopacity, 0) * 0.9);
  pointer-events: none;
  transition: opacity 220ms linear, transform 420ms ease;
  transform: scale(var(--mscale,1));
  filter: blur(6px);
}
`;

const Fish = () => (
  <div className="fish" aria-hidden>
    {Array.from({ length: 15 }).map((_, i) => (
      <div key={i} className="koiCoil" />
    ))}
  </div>
);

const LoginSignupForm = ({
  isLogin,
  setIsLogin,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  error,
  loading,
  handleAuthSubmit,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const wrapperRef = useRef(null);
  const rippleTimerRef = useRef(null);

  const handleMouseMove = (e) => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    el.style.setProperty('--mx', `${x}%`);
    el.style.setProperty('--my', `${y}%`);
    // make the wake lighter and visible
    el.style.setProperty('--mopacity', '0.85');
    // briefly scale the outer wake to simulate a passing boat ripple
    el.style.setProperty('--mscale', '1.06');
    if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current);
    rippleTimerRef.current = setTimeout(() => {
      const el2 = wrapperRef.current;
      if (!el2) return;
      el2.style.setProperty('--mscale', '1');
    }, 380);
  };

  const handleMouseLeave = () => {
    const el = wrapperRef.current;
    if (!el) return;
    el.style.setProperty('--mopacity', '0');
    el.style.setProperty('--mscale', '1');
    if (rippleTimerRef.current) {
      clearTimeout(rippleTimerRef.current);
      rippleTimerRef.current = null;
    }
  };

  return (
    <div className="flex items-center justify-center w-full h-full animate-fade-in">
      <div className="auth-wrapper" ref={wrapperRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <div className="flex flex-col items-center text-center p-8 rounded-3xl auth-card shadow-xl backdrop-blur-lg w-full max-w-md mx-4">
        <h2 className="text-3xl font-bold text-white mb-6">{isLogin ? 'Welcome Back!' : 'Create Account'}</h2>
        {error && <div className="text-red-400 mb-3">{error}</div>}

        <form onSubmit={handleAuthSubmit} className="w-full">
          {!isLogin && (
            <div className="mb-4">
              <label className="block text-white text-sm font-semibold mb-2 text-left" htmlFor="username">Username</label>
              <input
                id="username"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 auth-input"
                type="text"
                placeholder="Choose a username"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-white text-sm font-semibold mb-2 text-left" htmlFor="email">Email</label>
            <input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded-lg w-full py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 auth-input"
              type="email"
              placeholder="your@email.com"
            />
          </div>

          <div className="mb-6">
            <label className="block text-white text-sm font-semibold mb-2 text-left" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 auth-input pr-10"
                type={showPassword ? 'text' : 'password'}
                placeholder="******************"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-200 hover:text-white"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a10.07 10.07 0 0 1 2.06-3.06M2 12s3-7 10-7c2.18 0 4.2.7 5.94 1.94M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="m1 1 22 22"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <button
              className="w-full auth-primary font-bold py-3 px-4 rounded-lg focus:outline-none transition-all duration-200 active:scale-[0.98]"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </div>

          <div className="flex items-center justify-center mb-2">
            <button
              className="w-full bg-transparent hover:bg-white/5 text-white font-bold py-3 px-4 rounded-lg border border-white/10 focus:outline-none transition-all duration-200 flex items-center justify-center space-x-2 active:scale-[0.98]"
              type="button"
              onClick={() => alert('Google login flow not configured')}
            >
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C39.901,36.566,44,34,44,28C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.06,4.71C13.866,16.634,18.525,14,24,14c4.635,0,8.828,2.062,11.94,5.338l5.66-5.66C37.228,8.966,31.05,6,24,6C14.322,6,6.223,11.583,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.94l-6.06,4.71C9.932,39.578,16.441,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C39.901,36.566,44,34,44,28C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
              <span>Login with Google</span>
            </button>
          </div>

          <p className="text-white text-sm mt-6">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              className="font-bold auth-link ml-2"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </form>
        </div>
      </div>
    </div>
  );
};

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    // inject styles once
    if (!document.getElementById('sayana-auth-styles')) {
      const s = document.createElement('style');
      s.id = 'sayana-auth-styles';
      s.innerHTML = AUTH_CSS;
      document.head.appendChild(s);
    }
  }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const url = isLogin ? `${API_BASE}/api/auth/login` : `${API_BASE}/api/auth/register`;
      const payload = isLogin ? { email, password } : { name, email, password };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');

      if (data.token) localStorage.setItem('token', data.token);
      navigate('/');
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="koi-container">
      <h1 className="absolute top-4 left-4 flex items-center text-5xl font-bold text-white opacity-95 tracking-tight font-inter" style={{ zIndex: 5 }}>
                <img src="https://agno.blob.core.windows.net/dream-images/Image%20of.png" alt="SAYANA logo" className="w-10 h-10 mr-3 rounded-md object-contain" />
                <span>SAYANA</span>
              </h1>

      <Fish />
      <Fish />
      <div className="seaLevel" />

      <LoginSignupForm
        isLogin={isLogin}
        setIsLogin={setIsLogin}
        name={name}
        setName={setName}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        error={error}
        loading={loading}
        handleAuthSubmit={handleAuthSubmit}
      />
    </div>
  );
}
