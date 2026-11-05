import { LanguageProvider } from './context/LanguageContext';
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { KarigarMasterPage } from './pages/KarigarMasterPage';
import { IssueGoldPage } from './pages/IssueGoldPage';
import { ReceiveGoldPage } from './pages/ReceiveGoldPage';
import { KarigarLedgerPage } from './pages/KarigarLedgerPage';
import { LossAlertsPage } from './pages/LossAlertsPage';
import { StockStatementPage } from './pages/StockStatementPage';
import { AiSlipExtractionPage } from './pages/AiSlipExtractionPage';
import { RefreshCw } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedKarigarId, setSelectedKarigarId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
        <span className="text-xs font-mono tracking-wider">Verifying Gold Accountability Session...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  const handleSelectKarigar = (id: number) => {
    setSelectedKarigarId(id);
    setActiveTab('ledger');
  };

  const handleNavigateToLedger = (_jobId?: number) => {
    setActiveTab('ledger');
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'ai-extract':
        if (!hasRole('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD')) {
          return <DashboardPage onNavigate={handleNavigate} />;
        }
        return <AiSlipExtractionPage onNavigateToLedger={handleNavigateToLedger} />;
      case 'karigars':
        if (!hasRole('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD')) {
          return <DashboardPage onNavigate={handleNavigate} />;
        }
        return <KarigarMasterPage onSelectKarigar={handleSelectKarigar} />;
      case 'issue':
        if (!hasRole('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD')) {
          return <DashboardPage onNavigate={handleNavigate} />;
        }
        return <IssueGoldPage onNavigateToLedger={handleNavigateToLedger} />;
      case 'receive':
        if (!hasRole('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD')) {
          return <DashboardPage onNavigate={handleNavigate} />;
        }
        return <ReceiveGoldPage onNavigateToLedger={handleNavigateToLedger} />;
      case 'ledger':
        return <KarigarLedgerPage initialKarigarId={user.role === 'ROLE_KARIGAR' ? (user.karigarId || undefined) : (selectedKarigarId || undefined)} />;
      case 'alerts':
        if (!hasRole('ROLE_FINANCE_HEAD')) {
          return <DashboardPage onNavigate={handleNavigate} />;
        }
        return <LossAlertsPage />;
      case 'stock':
        if (!hasRole('ROLE_FINANCE_HEAD')) {
          return <DashboardPage onNavigate={handleNavigate} />;
        }
        return <StockStatementPage />;
      default:
        return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderActiveScreen()}
    </Layout>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;
