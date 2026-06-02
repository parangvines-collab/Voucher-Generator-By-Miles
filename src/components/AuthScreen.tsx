import React, { useState } from 'react';
import { KeyRound, UserPlus, LogIn, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { ActivityLogger } from '../utils/activityDB';
import { supabase } from '../supabaseClient';

interface AuthScreenProps {
  onLoginSuccess: (username: string) => void;
}

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimUser = username.trim();
    if (!trimUser || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    // Bypass Supabase Auth for local admin master credentials
    if (trimUser === 'admin') {
      let storedAdminPass = 'Anonymous#8856';
      try {
        const { data } = await supabase.from('global_settings').select('value').eq('key', 'admin_password').single();
        if (data && data.value) {
          storedAdminPass = data.value;
        }
      } catch (e) {}

      if (password === storedAdminPass) {
        sessionStorage.setItem('authenticated', 'true');
        sessionStorage.setItem('username', 'admin');
        ActivityLogger.logActivity('user_login', 'Admin logged in', { username: 'admin' });
        setSuccessMsg('Login successful! Redirecting...');
        window.history.replaceState({}, '', '/');
        setTimeout(() => {
          onLoginSuccess('admin');
        }, 800);
        return;
      } else {
        setErrorMsg('Invalid admin password.');
        return;
      }
    }

    // Map input to email format for Supabase Auth consistency
    const email = trimUser.includes('@') ? trimUser : `${trimUser}@example.com`;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Auto-heal profiles if missing in public profiles list
      if (data && data.user) {
        try {
          const { data: prof, error: errProf } = await supabase.from('profiles').select('id').eq('username', trimUser);
          if (errProf || !prof || prof.length === 0) {
            await supabase.from('profiles').upsert([{
              id: data.user.id,
              username: trimUser,
              balance: 0,
              expiration: null
            }]);
          }
        } catch (profileErr) {
          console.warn('Auto-healing profile error:', profileErr);
        }
      }

      sessionStorage.setItem('authenticated', 'true');
      sessionStorage.setItem('username', trimUser);
      ActivityLogger.logActivity('user_login', 'User logged in (Supabase)', { username: trimUser });
      setSuccessMsg('Login successful! Redirecting...');
      
      // Redirect to Home "/"
      window.history.replaceState({}, '', '/');

      setTimeout(() => {
        onLoginSuccess(trimUser);
      }, 800);
    } catch (err: any) {
      ActivityLogger.logActivity('login_failed', 'Failed login attempt via Supabase', { username: trimUser, error: err.message });
      setErrorMsg(err.message || 'Invalid username/email or password.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimUser = username.trim();
    if (!trimUser || !password || !confirmPassword) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (trimUser.length < 3) {
      setErrorMsg('Username must be at least 3 characters.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (trimUser.toLowerCase() === 'admin') {
      setErrorMsg('Username "admin" is reserved.');
      return;
    }

    // Map input to email format for Supabase Auth consistency
    const email = trimUser.includes('@') ? trimUser : `${trimUser}@example.com`;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Create a profile entry in the profiles table for custom fields (balance, etc.)
      if (data && data.user) {
        try {
          await supabase.from('profiles').upsert([{
            id: data.user.id,
            username: trimUser,
            balance: 0,
            expiration: null
          }]);
        } catch (profileErr) {
          console.warn('Error creating profile entry on self-registration:', profileErr);
        }
      }

      ActivityLogger.logActivity('user_registered', 'New user registered via Supabase', { username: trimUser });
      setSuccessMsg('Account created successfully! Redirecting...');
      
      sessionStorage.setItem('authenticated', 'true');
      sessionStorage.setItem('username', trimUser);
      window.history.replaceState({}, '', '/');

      setTimeout(() => {
        onLoginSuccess(trimUser);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please choose another username/email or password.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden animate-fade-in">
        {/* Decorative ambient spots */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-500/20 mb-3 shadow-lg shadow-blue-500/5">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            MikroTik
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isRegistering ? 'Create your operator account' : 'Voucher Generator'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 animate-fade-in">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 animate-fade-in">
            {successMsg}
          </div>
        )}

        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              placeholder="miles@example.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-4 pr-10 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isRegistering && (
            <div className="animate-fade-in">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 text-sm"
          >
            {isRegistering ? (
              <>
                <UserPlus className="w-4 h-4" />
                Register Now
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800/80 text-center text-sm">
          {isRegistering ? (
            <p className="text-slate-400">
              Already have an operator account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setErrorMsg('');
                }}
                className="text-blue-400 hover:text-blue-300 font-medium hover:underline focus:outline-none bg-transparent border-none cursor-pointer"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p className="text-slate-400">
              Need a new account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setErrorMsg('');
                }}
                className="text-blue-400 hover:text-blue-300 font-medium hover:underline focus:outline-none bg-transparent border-none cursor-pointer"
              >
                Register Here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
