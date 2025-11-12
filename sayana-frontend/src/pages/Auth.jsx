import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// CSS injected once to avoid re-inserting <style> on every render (prevents blinking)
const AUTH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Open+Sans:wght@400;800&display=swap');

:root { --coilSize: 14px; --delayCount: 40ms; --scaleMe: 1; --scaleFlip: 1; --posFlip: 0; }
.font-cinzel { font-family: 'Cinzel', serif; }
.koi-container { font-family: "Open Sans", sans-serif; background-color: lightblue; overflow: hidden; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; }
.fish { position: absolute; top: -35%; left: 0; width: 100%; height: 100%; filter: drop-shadow(calc(var(--coilSize) * 4) calc(var(--coilSize) / 3) 5px rgba(0,0,0,0.3)); }
.fish .koiCoil { position: absolute; width: var(--coilSize); height: var(--coilSize); background-color: orangered; border-radius: 50%; top: 50%; left: 50%; margin-left: calc(var(--coilSize) / -2); margin-top: calc(var(--coilSize) / -2); transform: scale(var(--scaleMe), var(--scaleMe)); filter: contrast(200%); offset-path: path("M11.7692 229.5C14.552 200.052 7.51901 171.858 -42.8757 170.644C-105.869 169.128 -131.294 76.612 -101.695 51.5872C-72.0955 26.5625 -24.6607 -50.7867 70.5883 51.5872C165.837 153.961 27.7073 131.211 33.0199 183.157C38.3326 235.102 90.3211 195.669 139.274 223.727C188.226 251.785 207.959 299.56 139.274 316.243C70.5883 332.926 41.3685 398.9 81.9726 419.754C122.577 440.608 222 478.524 222 419.754C222 372.738 222 242.432 222 183.157C219.091 129.948 175.78 30.8091 25.8099 59.9288C-161.652 96.3284 -30.3529 119.837 25.8099 141.07C81.9726 162.303 171.529 204.769 126.751 260.506C81.9726 316.243 101.326 362.501 139.274 373.496C177.222 384.492 170.012 464.495 70.5883 462.979C-28.835 461.462 -42.8757 393.015 -42.8757 373.496C-42.8757 238.288 11.7692 293 11.7692 240.506C11.7692 208.05 11.7692 237.336 11.7692 229.5Z"); animation: fishAnim 20000ms linear infinite; }
.fish:nth-of-type(2) { transform-origin: top center; transform: scale(-1, 1); }
.fish:nth-of-type(2) .koiCoil { background-color: white; }
.fish .koiCoil:nth-of-type(15), .fish .koiCoil:nth-of-type(14) { background-color: orangered; }
.fish:nth-of-type(2) .koiCoil:nth-of-type(15), .fish:nth-of-type(2) .koiCoil:nth-of-type(14) { background-color: white; }
.fish .koiCoil:nth-of-type(15)::after { content: ":"; position: absolute; color: black; font-weight: 800; text-align: center; line-height: 60%; font-size: calc(var(--coilSize) * 1.2); }
.fish .koiCoil:nth-of-type(1)::before { content: ""; position: absolute; width: 100%; height: 50%; top: 25%; left: -100%; border-radius: var(--coilSize); background-color: white; transform-origin: center right; animation: backFlip 200ms ease-in-out alternate infinite; }
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
.fish .koiCoil:nth-of-type(12)::before, .fish .koiCoil:nth-of-type(12)::after { content: ""; position: absolute; width: 100%; height: 20%; top: -10%; left: -100%; border-radius: var(--coilSize); background-color: white; transform-origin: center right; animation: sideFlip 500ms ease-in-out alternate infinite; }
.fish .koiCoil:nth-of-type(12)::after { --scaleFlip: -1; --posFlip: calc(var(--coilSize) * -1); }
.seaLevel { font-family: "Open Sans", sans-serif; background-color: lightblue; overflow: hidden; position: absolute; width: 100%; height: 100%; top: 0; left: 0; opacity: 0.4; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fadeIn 0.5s ease-out forwards; position: absolute; top: 0; left: 0; z-index: 10; }
@keyframes fishAnim { 0% { offset-distance: 0%; } 100% { offset-distance: 100%; } }
@keyframes backFlip { 0% { transform: rotate(45deg); } 100% { transform: rotate(-45deg); } }
@keyframes sideFlip { 0% { transform: scale(1, var(--scaleFlip)) translateY(var(--posFlip))rotate(80deg); } 100% { transform: scale(1, var(--scaleFlip)) translateY(var(--posFlip))rotate(20deg); } }
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

  return (
    <div className="flex items-center justify-center w-full h-full animate-fade-in">
      <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-white/60 shadow-xl shadow-green-300/20 backdrop-blur-lg w-full max-w-md mx-4">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">{isLogin ? 'Welcome Back!' : 'Create Account'}</h2>
        {error && <div className="text-red-600 mb-3">{error}</div>}

        <form onSubmit={handleAuthSubmit} className="w-full">
          {!isLogin && (
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2 text-left" htmlFor="username">Username</label>
              <input
                id="username"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400"
                type="text"
                placeholder="Choose a username"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2 text-left" htmlFor="email">Email</label>
            <input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400"
              type="email"
              placeholder="your@email.com"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2 text-left" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 pr-10"
                type={showPassword ? 'text' : 'password'}
                placeholder="******************"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600 hover:text-gray-800"
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
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-all duration-200 active:scale-[0.98]"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </div>

          <div className="flex items-center justify-center mb-2">
            <button
              className="w-full bg-white hover:bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-lg border border-gray-300 focus:outline-none focus:shadow-outline transition-all duration-200 flex items-center justify-center space-x-2 active:scale-[0.98]"
              type="button"
              onClick={() => alert('Google login flow not configured')}
            >
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C39.901,36.566,44,34,44,28C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.06,4.71C13.866,16.634,18.525,14,24,14c4.635,0,8.828,2.062,11.94,5.338l5.66-5.66C37.228,8.966,31.05,6,24,6C14.322,6,6.223,11.583,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.94l-6.06,4.71C9.932,39.578,16.441,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C39.901,36.566,44,34,44,28C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
              <span>Login with Google</span>
            </button>
          </div>

          <p className="text-gray-700 text-sm mt-6">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              className="font-bold text-blue-500 hover:text-blue-800 ml-2"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </form>
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

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

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
      <h1 className="absolute top-4 left-4 text-5xl font-bold text-orange-900 opacity-75 tracking-tight font-cinzel" style={{ zIndex: 5 }}>
        SAYANA
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
