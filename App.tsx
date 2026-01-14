
import React, { useState, useEffect } from 'https://esm.sh/react@19.0.0';
import * as Lucide from 'https://esm.sh/lucide-react@0.460.0';
import { db } from './db.ts';
import { AppState, AppView } from './types.ts';

// Components
import Dashboard from './components/Dashboard.tsx';
import ContratosList from './components/ContratosList.tsx';
import MedicoesList from './components/MedicoesList.tsx';
import RuasList from './components/RuasList.tsx';
import TrechosList from './components/TrechosList.tsx';
import ServicosList from './components/ServicosList.tsx';
import ProfissionaisList from './components/ProfissionaisList.tsx';
import FormContrato from './components/FormContrato.tsx';
import FormMedicao from './components/FormMedicao.tsx';
import FormRua from './components/FormRua.tsx';
import FormTrecho from './components/FormTrecho.tsx';
import FormServico from './components/FormServico.tsx';
import FormProfissional from './components/FormProfissional.tsx';
import MapaVisualizer from './components/MapaVisualizer.tsx';
import RelatoriosView from './components/RelatoriosView.tsx';
import SyncView from './components/SyncView.tsx';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({ view: 'DASHBOARD' });
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    db.init().then(() => setLoading(false));
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const navigate = (view: AppView, params: Partial<AppState> = {}) => {
    setState(prev => ({ ...prev, ...params, view }));
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    const { view } = state;
    if (view === 'MEDICOES') navigate('CONTRATOS');
    else if (view === 'RUAS') navigate('MEDICOES', { selectedMedicaoId: state.selectedMedicaoId });
    else if (view === 'TRECHOS' || view === 'SERVICOS') navigate('RUAS', { selectedRuaId: state.selectedRuaId });
    else navigate('DASHBOARD');
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-50 bg-blue-700 text-white px-4 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          {state.view !== 'DASHBOARD' && (
            <button onClick={goBack} className="p-1"><Lucide.ArrowLeft size={24} /></button>
          )}
          <h1 className="text-lg font-black tracking-tighter uppercase">PavInspect</h1>
        </div>
        <div className={`text-[10px] font-bold px-2 py-1 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </div>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pb-24">
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

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-2 flex justify-around shadow-2xl z-50">
        <NavBtn act={state.view==='DASHBOARD'} icon={<Lucide.LayoutDashboard size={20}/>} lab="Início" onClick={()=>navigate('DASHBOARD')}/>
        <NavBtn act={state.view==='CONTRATOS'} icon={<Lucide.ClipboardList size={20}/>} lab="Obras" onClick={()=>navigate('CONTRATOS')}/>
        <NavBtn act={state.view==='MAPA_GERAL'} icon={<Lucide.MapPin size={20}/>} lab="Mapa" onClick={()=>navigate('MAPA_GERAL')}/>
        <NavBtn act={state.view==='SYNC'} icon={<Lucide.Cloud size={20}/>} lab="Sinc" onClick={()=>navigate('SYNC')}/>
      </nav>
    </div>
  );
};

const NavBtn = ({act, icon, lab, onClick}: any) => (
  <button onClick={onClick} className={`flex flex-col items-center p-2 rounded-xl ${act ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}>
    {icon} <span className="text-[10px] font-bold mt-1 uppercase">{lab}</span>
  </button>
);

export default App;
