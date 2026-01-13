
import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Map as MapIcon, 
  Users, 
  Plus, 
  ChevronRight, 
  ArrowLeft, 
  LayoutDashboard,
  ClipboardList,
  MapPin,
  Camera,
  Trash2,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Navigation,
  CloudLightning,
  Cloud
} from 'lucide-react';
import { db } from './db';
import { 
  AppView, 
  AppState, 
  Contrato, 
  Medicao, 
  Rua, 
  Trecho, 
  Profissional 
} from './types';

// Components
import Dashboard from './components/Dashboard';
import ContratosList from './components/ContratosList';
import MedicoesList from './components/MedicoesList';
import RuasList from './components/RuasList';
import TrechosList from './components/TrechosList';
import ServicosList from './components/ServicosList';
import ProfissionaisList from './components/ProfissionaisList';
import FormContrato from './components/FormContrato';
import FormMedicao from './components/FormMedicao';
import FormRua from './components/FormRua';
import FormTrecho from './components/FormTrecho';
import FormServico from './components/FormServico';
import FormProfissional from './components/FormProfissional';
import MapaVisualizer from './components/MapaVisualizer';
import RelatoriosView from './components/RelatoriosView';
import SyncView from './components/SyncView';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({ view: 'DASHBOARD' });
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Network listener
  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  // Initial load
  useEffect(() => {
    const initialize = async () => {
      try {
        await db.init();
      } catch (err) {
        console.error("Failed to init DB", err);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  const navigate = (view: AppView, params: Partial<AppState> = {}) => {
    setState(prev => ({ ...prev, ...params, view }));
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    const { view } = state;
    if (view === 'MEDICOES') navigate('CONTRATOS');
    else if (view === 'RUAS') navigate('MEDICOES', { selectedMedicaoId: state.selectedMedicaoId });
    else if (view === 'TRECHOS') navigate('RUAS', { selectedRuaId: state.selectedRuaId });
    else if (view === 'SERVICOS') navigate('RUAS', { selectedRuaId: state.selectedRuaId });
    else if (view.startsWith('FORM_')) {
        if (view === 'FORM_CONTRATO') navigate('CONTRATOS');
        if (view === 'FORM_MEDICAO') navigate('MEDICOES');
        if (view === 'FORM_RUA') navigate('RUAS');
        if (view === 'FORM_TRECHO') navigate('TRECHOS');
        if (view === 'FORM_SERVICO') navigate('SERVICOS');
        if (view === 'FORM_PROFISSIONAL') navigate('PROFISSIONAIS');
    }
    else navigate('DASHBOARD');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-blue-600 text-white flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent border-white"></div>
        <p className="font-medium animate-pulse">Carregando PavInspect...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-blue-700 text-white px-4 py-3 flex items-center justify-between shadow-md print:hidden">
        <div className="flex items-center gap-3">
          {state.view !== 'DASHBOARD' && (
            <button onClick={goBack} className="p-1 -ml-1">
              <ArrowLeft size={24} />
            </button>
          )}
          <h1 className="text-lg font-bold tracking-tight">
            {state.view === 'DASHBOARD' && 'PavInspect'}
            {state.view === 'CONTRATOS' && 'Contratos'}
            {state.view === 'MEDICOES' && 'Medições'}
            {state.view === 'RUAS' && 'Ruas'}
            {state.view === 'TRECHOS' && 'Trechos de Obra'}
            {state.view === 'SERVICOS' && 'Serviços de Meio-Fio'}
            {state.view === 'PROFISSIONAIS' && 'Profissionais'}
            {state.view === 'MAPA_GERAL' && 'Mapa de Campo'}
            {state.view === 'RELATORIOS' && 'Relatórios'}
            {state.view === 'SYNC' && 'Sincronização'}
            {state.view === 'FORM_CONTRATO' && (state.editingId ? 'Editar Contrato' : 'Novo Contrato')}
            {state.view === 'FORM_TRECHO' && (state.editingId ? 'Editar Trecho' : 'Novo Trecho')}
            {state.view === 'FORM_SERVICO' && (state.editingId ? 'Editar Serviço' : 'Novo Serviço')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-1 rounded border flex items-center gap-1 ${isOnline ? 'bg-emerald-800 border-emerald-600' : 'bg-blue-800 border-blue-600'}`}>
                {isOnline ? <Cloud size={10} /> : <CloudLightning size={10} />}
                {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 max-w-4xl mx-auto w-full">
        {state.view === 'DASHBOARD' && <Dashboard onNavigate={navigate} />}
        {state.view === 'CONTRATOS' && <ContratosList onNavigate={navigate} />}
        {state.view === 'MEDICOES' && <MedicoesList contratoId={state.selectedContratoId!} onNavigate={navigate} />}
        {state.view === 'RUAS' && <RuasList medicaoId={state.selectedMedicaoId!} onNavigate={navigate} />}
        {state.view === 'TRECHOS' && <TrechosList ruaId={state.selectedRuaId!} onNavigate={navigate} />}
        {state.view === 'SERVICOS' && <ServicosList ruaId={state.selectedRuaId!} onNavigate={navigate} />}
        {state.view === 'PROFISSIONAIS' && <ProfissionaisList onNavigate={navigate} />}
        {state.view === 'MAPA_GERAL' && <MapaVisualizer ruaId={state.selectedRuaId} onNavigate={navigate} />}
        {state.view === 'RELATORIOS' && <RelatoriosView />}
        {state.view === 'SYNC' && <SyncView />}
        
        {state.view === 'FORM_CONTRATO' && <FormContrato id={state.editingId} onSave={() => navigate('CONTRATOS')} onCancel={goBack} />}
        {state.view === 'FORM_MEDICAO' && <FormMedicao contratoId={state.selectedContratoId!} id={state.editingId} onSave={() => navigate('MEDICOES')} onCancel={goBack} />}
        {state.view === 'FORM_RUA' && <FormRua medicaoId={state.selectedMedicaoId!} id={state.editingId} onSave={() => navigate('RUAS')} onCancel={goBack} />}
        {state.view === 'FORM_TRECHO' && <FormTrecho ruaId={state.selectedRuaId!} id={state.editingId} onSave={() => navigate('TRECHOS')} onCancel={goBack} />}
        {state.view === 'FORM_SERVICO' && <FormServico ruaId={state.selectedRuaId!} id={state.editingId} onSave={() => navigate('SERVICOS')} onCancel={goBack} />}
        {state.view === 'FORM_PROFISSIONAL' && <FormProfissional id={state.editingId} onSave={() => navigate('PROFISSIONAIS')} onCancel={goBack} />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around py-2 px-1 z-50 print:hidden">
        <NavButton active={state.view === 'DASHBOARD'} icon={<LayoutDashboard size={22} />} label="Home" onClick={() => navigate('DASHBOARD')} />
        <NavButton active={state.view === 'CONTRATOS'} icon={<ClipboardList size={22} />} label="Obras" onClick={() => navigate('CONTRATOS')} />
        <NavButton active={state.view === 'SYNC'} icon={<CloudLightning size={22} />} label="Sync" onClick={() => navigate('SYNC')} />
        <NavButton active={state.view === 'PROFISSIONAIS'} icon={<Users size={22} />} label="Equipe" onClick={() => navigate('PROFISSIONAIS')} />
        <NavButton active={state.view === 'RELATORIOS'} icon={<FileText size={22} />} label="Relatórios" onClick={() => navigate('RELATORIOS')} />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean, icon: React.ReactNode, label: string, onClick: () => void }> = ({ active, icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${active ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default App;
