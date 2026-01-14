
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import * as Lucide from 'lucide-react';
import { db } from './db.ts';
import { AppState, AppView } from './types.ts';

// IMPORTAR COMPONENTES (Assumindo que estão na pasta components)
import Dashboard from './components/Dashboard.tsx';
import ContratosList from './components/ContratosList.tsx';
import MedicoesList from './components/MedicoesList.tsx';
import RuasList from './components/RuasList.tsx';
import TrechosList from './components/TrechosList.tsx';
import FormContrato from './components/FormContrato.tsx';
import FormMedicao from './components/FormMedicao.tsx';
import FormRua from './components/FormRua.tsx';
import FormTrecho from './components/FormTrecho.tsx';
import SyncView from './components/SyncView.tsx';
import MapaVisualizer from './components/MapaVisualizer.tsx';
import RelatoriosView from './components/RelatoriosView.tsx';
import ProfissionaisList from './components/ProfissionaisList.tsx';
import FormProfissional from './components/FormProfissional.tsx';

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
    else if (view === 'RUAS') navigate('MEDICOES', { selectedContratoId: state.selectedContratoId });
    else if (view === 'TRECHOS') navigate('RUAS', { selectedMedicaoId: state.selectedMedicaoId });
    else if (view.startsWith('FORM_')) {
        if (view === 'FORM_CONTRATO') navigate('CONTRATOS');
        else if (view === 'FORM_MEDICAO') navigate('MEDICOES', { selectedContratoId: state.selectedContratoId });
        else if (view === 'FORM_RUA') navigate('RUAS', { selectedMedicaoId: state.selectedMedicaoId });
        else if (view === 'FORM_TRECHO') navigate('TRECHOS', { selectedRuaId: state.selectedRuaId });
        else navigate('DASHBOARD');
    }
    else navigate('DASHBOARD');
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <Lucide.Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-[100] bg-blue-700 text-white p-4 shadow-lg flex justify-between items-center">
        <div className="flex items-center gap-3">
          {state.view !== 'DASHBOARD' && (
            <button onClick={goBack} className="active:scale-90 p-1"><Lucide.ChevronLeft size={28} /></button>
          )}
          <h1 className="font-black text-xl tracking-tighter uppercase">PavInspect</h1>
        </div>
        <div className={`text-[10px] font-black px-3 py-1 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}>
          {isOnline ? 'SINC' : 'OFFLINE'}
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden p-4 pb-28 max-w-2xl mx-auto w-full">
        {state.view === 'DASHBOARD' && <Dashboard onNavigate={navigate} />}
        {state.view === 'CONTRATOS' && <ContratosList onNavigate={navigate} />}
        {state.view === 'MEDICOES' && <MedicoesList contratoId={state.selectedContratoId!} onNavigate={navigate} />}
        {state.view === 'RUAS' && <RuasList medicaoId={state.selectedMedicaoId!} onNavigate={navigate} />}
        {state.view === 'TRECHOS' && <TrechosList ruaId={state.selectedRuaId!} onNavigate={navigate} />}
        
        {state.view === 'FORM_CONTRATO' && <FormContrato onSave={() => navigate('CONTRATOS')} onCancel={goBack} />}
        {state.view === 'FORM_MEDICAO' && <FormMedicao contratoId={state.selectedContratoId!} onSave={() => navigate('MEDICOES', { selectedContratoId: state.selectedContratoId })} onCancel={goBack} />}
        {state.view === 'FORM_RUA' && <FormRua medicaoId={state.selectedMedicaoId!} onSave={() => navigate('RUAS', { selectedMedicaoId: state.selectedMedicaoId })} onCancel={goBack} />}
        {state.view === 'FORM_TRECHO' && <FormTrecho ruaId={state.selectedRuaId!} onSave={() => navigate('TRECHOS', { selectedRuaId: state.selectedRuaId })} onCancel={goBack} />}
        
        {state.view === 'PROFISSIONAIS' && <ProfissionaisList onNavigate={navigate} />}
        {state.view === 'FORM_PROFISSIONAL' && <FormProfissional id={state.editingId} onSave={() => navigate('PROFISSIONAIS')} onCancel={goBack} />}
        {state.view === 'SYNC' && <SyncView />}
        {state.view === 'MAPA_GERAL' && <MapaVisualizer onNavigate={navigate} />}
        {state.view === 'RELATORIOS' && <RelatoriosView />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-2 flex justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-[100]">
        <NavBtn act={state.view==='DASHBOARD'} icon={<Lucide.Home size={22}/>} label="Home" onClick={()=>navigate('DASHBOARD')}/>
        <NavBtn act={['CONTRATOS','MEDICOES','RUAS','TRECHOS'].includes(state.view)} icon={<Lucide.HardHat size={22}/>} label="Obras" onClick={()=>navigate('CONTRATOS')}/>
        <NavBtn act={state.view==='MAPA_GERAL'} icon={<Lucide.MapPin size={22}/>} label="Mapa" onClick={()=>navigate('MAPA_GERAL')}/>
        <NavBtn act={state.view==='SYNC'} icon={<Lucide.Cloud size={22}/>} label="Sinc" onClick={()=>navigate('SYNC')}/>
      </nav>
    </div>
  );
};

const NavBtn = ({ act, icon, label, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${act ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}>
    {icon} <span className="text-[10px] font-black uppercase">{label}</span>
  </button>
);

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
