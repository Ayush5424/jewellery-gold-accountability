import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  BookOpen,
  AlertTriangle,
  FileSpreadsheet,
  LogOut,
  Sparkles,
  ShieldCheck,
  Building2,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, logout, hasRole } = useAuth();

  const isKarigar = user?.role === 'ROLE_KARIGAR';

  const navItems = [
    {
      id: 'dashboard',
      label: isKarigar ? 'Artisan Dashboard' : hasRole('ROLE_FINANCE_HEAD') ? 'Finance Dashboard' : 'Operations Dashboard',
      icon: LayoutDashboard,
      visible: true,
    },
    {
      id: 'ai-extract',
      label: 'AI Slip Scanner',
      icon: Sparkles,
      visible: hasRole('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD'),
    },
    {
      id: 'issue',
      label: 'Issue Gold',
      icon: ArrowUpRight,
      visible: hasRole('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD'),
    },
    {
      id: 'receive',
      label: 'Receive Gold',
      icon: ArrowDownLeft,
      visible: hasRole('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD'),
    },
    {
      id: 'karigars',
      label: 'Karigar Master',
      icon: Users,
      visible: hasRole('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD'),
    },
    {
      id: 'ledger',
      label: isKarigar ? 'My Ledger Slips' : 'Karigar Ledger',
      icon: BookOpen,
      visible: true,
    },
    {
      id: 'alerts',
      label: 'Loss Alerts',
      icon: AlertTriangle,
      visible: hasRole('ROLE_FINANCE_HEAD'),
    },
    {
      id: 'stock',
      label: 'Stock Statement',
      icon: FileSpreadsheet,
      visible: hasRole('ROLE_FINANCE_HEAD'),
    },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ROLE_FINANCE_HEAD':
        return 'Finance Head (Audit Access)';
      case 'ROLE_ISSUE_CLERK':
        return 'Issue Clerk (Operations)';
      case 'ROLE_KARIGAR':
        return 'Master Karigar (Isolated Account)';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800 antialiased font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 text-white shrink-0 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center h-14">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 bg-amber-600 rounded flex items-center justify-center font-bold text-slate-950 text-sm tracking-wider">
              CJ
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-slate-100">
                Coimbatore Jewellery
              </span>
              <span className="ml-2 text-xs text-slate-400 font-mono hidden sm:inline">
                Fine Gold Accountability System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="font-medium text-slate-200">{user.fullName}</p>
                  <p className="text-slate-400 text-[11px] font-mono">{getRoleBadge(user.role)}</p>
                </div>
                <div className="h-6 w-px bg-slate-700 hidden sm:block" />
                <button
                  onClick={logout}
                  className="px-2.5 py-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors border border-slate-700/60"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto border-t border-slate-800 scrollbar-none">
          {navItems.filter(item => item.visible).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-amber-500 text-amber-400 bg-slate-850/50'
                    : 'border-transparent text-slate-300 hover:text-slate-100 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-12">
        {children}
      </main>

      {/* Minimal Enterprise Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 px-6 text-xs text-slate-500 flex justify-between items-center">
        <span>Coimbatore Central Workshop Hub • 5 Showrooms Retail Network</span>
        <span className="font-mono text-[11px]">Authoritative Ledger v1.0.0 • Strict BigDecimal Accounting</span>
      </footer>
    </div>
  );
};
