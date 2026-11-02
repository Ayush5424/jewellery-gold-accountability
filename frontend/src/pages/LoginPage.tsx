import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, KeyRound, User, ArrowRight, Lock, Building2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide both username and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userVal: string, passVal: string) => {
    setUsername(userVal);
    setPassword(passVal);
    setLoading(true);
    setError(null);
    try {
      await login(userVal, passVal);
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100 selection:bg-amber-500 selection:text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-lg bg-amber-600 text-slate-950 font-bold text-xl mb-3 shadow-md shadow-amber-900/40">
          CJ
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Coimbatore Fine Jewellery
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Fine Gold Accountability & Loss Detection System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900 py-8 px-6 sm:px-10 shadow-xl border border-slate-800 rounded-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-md text-xs text-rose-300 flex items-start gap-2">
                <Shield className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter system username"
                  autoComplete="username"
                  className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-750 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter access password"
                  autoComplete="current-password"
                  className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-750 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-amber-500 transition-colors disabled:opacity-50"
            >
              {loading ? (
                'Authenticating...'
              ) : (
                <>
                  <span>Sign In to System</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Role Switcher */}
          <div className="pt-4 border-t border-slate-800">
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Quick Role Sign-In (Evaluation Profiles)
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('finance_head', 'finance123')}
                className="w-full px-3 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded text-left transition-colors flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-medium text-slate-200">Finance Head</p>
                  <p className="text-[11px] text-slate-500 font-mono">finance_head • Full Reconciliation & Alerts</p>
                </div>
                <span className="text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800/60 px-1.5 py-0.5 rounded">
                  Audit Access
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('issue_clerk', 'clerk123')}
                className="w-full px-3 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded text-left transition-colors flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-medium text-slate-200">Issue Clerk</p>
                  <p className="text-[11px] text-slate-500 font-mono">issue_clerk • Gold Issue, Receipt & AI Parser</p>
                </div>
                <span className="text-[10px] font-mono bg-sky-950 text-sky-300 border border-sky-800/60 px-1.5 py-0.5 rounded">
                  Operations
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('murugesan', 'karigar123')}
                className="w-full px-3 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded text-left transition-colors flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-medium text-slate-200">Master Karigar (Murugesan S)</p>
                  <p className="text-[11px] text-slate-500 font-mono">murugesan • View Own Ledger & Slips</p>
                </div>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                  Isolated
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          <span>Coimbatore Manufacturing Workshop & 5 Retail Showrooms Network</span>
        </div>
      </div>
    </div>
  );
};
