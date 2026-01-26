
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { AppView, AppState, Trecho, Rua, Contrato } from '../types';
import { 
  Plus, 
  MapIcon, 
  HardHat, 
  FileBarChart, 
  Clock, 
  CloudLightning, 
  ChevronRight,
  MapPin,
  ClipboardList,
  Activity
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (view: AppView, params?: Partial<AppState>) => void;
}

interface RecentActivity {
  id: string;
  ruaNome: string;
  area: number;
  data: string;
  ruaId: string;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({ contratos: 0, ruasEmExecucao: 0, dirty: 0 });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      const [allContratos, allTrechos, allRuas, dMeds, dRuas, dPros, dCons, dTrechos] = await Promise.all([
        db.getAll<Contrato>('contratos'),
        db.getAll<Trecho>('trechos'),
        db.getAll<Rua>('ruas'),
        db.getDirty('medicoes'),
        db.getDirty('ruas'),
        db.getDirty('profissionais'),
        db.getDirty('contratos'),
        db.getDirty('trechos')
      ]);
      
      // Calcular ruas em execução (sem trechos)
      const ruasComTrechosIds = new Set(allTrechos.map(t => t.ruaId));
      const ruasEmExecucao = allRuas.filter(r => !ruasComTrechosIds.has(r.id)).length;

      setStats({ 
        contratos: allContratos.length, 
        ruasEmExecucao: ruasEmExecucao,
        dirty: dMeds.length + dRuas.length + dPros.length + dCons.length + dTrechos.length
      });

      // Processar atividade recente
      const sortedTrechos = [...allTrechos].sort((a, b) => {
          const dateA = new Date(a.updatedAt || 0).getTime();
          const dateB = new Date(b.updatedAt || 0).getTime();
          return dateB - dateA;
      }).slice(0, 3);

      const activity = sortedTrechos.map(tr => {
          const rua = allRuas.find(ru => ru.id === tr.ruaId);
          return {
              id: tr.id,
              ruaNome: rua?.nome || 'Rua não identificada',
              area: tr.area,
              data: tr.data,
              ruaId: tr.ruaId
          };
      });
      setRecentActivity(activity);
    };
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
            <h2 className="text-2xl font-black mb-1">Olá, Daniel Wyllame!</h2>
            <p className="text-blue-100 text-[10px] font-bold opacity-80 mb-8 uppercase tracking-[0.2em]">Prefeitura de Horizonte • CE</p>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => onNavigate('CONTRATOS')}
                className="bg-white/10 backdrop-blur-xl rounded-[28px] p-6 border border-white/20 text-left active:scale-95 transition-all group"
              >
                  <div className="flex justify-between items-start mb-2">
                    <span className="block text-4xl font-black leading-none">{stats.contratos}</span>
                    <ClipboardList size={20} className="text-blue-200 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest opacity-80 font-black">Contratos Ativos</span>
              </button>
              
              <button 
                onClick={() => onNavigate('RUAS_EM_EXECUCAO')}
                className="bg-amber-500/20 backdrop-blur-xl rounded-[28px] p-6 border border-amber-400/30 text-left active:scale-95 transition-all group"
              >
                  <div className="flex justify-between items-start mb-2">
                    <span className="block text-4xl font-black text-amber-400 leading-none">{stats.ruasEmExecucao}</span>
                    <Activity size={20} className="text-amber-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-amber-400 font-black">Em Execução</span>
              </button>
            </div>
        </div>
        <div className="absolute top-[-20px] right-[-20px] opacity-10">
            <CloudLightning size={160} />
        </div>
      </div>

      {stats.dirty > 0 && (
        <button 
            onClick={() => onNavigate('SYNC')}
            className="w-full bg-white border-2 border-amber-100 p-5 rounded-[28px] flex items-center justify-between shadow-lg shadow-amber-50"
        >
            <div className="flex items-center gap-4">
                <div className="bg-amber-500 text-white p-3 rounded-2xl shadow-lg animate-pulse">
                    <CloudLightning size={20} />
                </div>
                <div className="text-left">
                    <div className="text-xs font-black text-slate-800 uppercase leading-none mb-1">Sincronização Necessária</div>
                    <div className="text-[10px] text-amber-600 font-bold uppercase">{stats.dirty} registros aguardando nuvem</div>
                </div>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
        </button>
      )}

      <div className="grid grid-cols-2 gap-4">
        <QuickAction 
          color="bg-blue-600" 
          icon={<Plus className="text-white" size={24} />} 
          label="Nova Obra" 
          onClick={() => onNavigate('FORM_CONTRATO')} 
          description="Lançar contrato"
        />
        <QuickAction 
          color="bg-emerald-500" 
          icon={<MapIcon className="text-white" size={24} />} 
          label="Mapa Geral" 
          onClick={() => onNavigate('MAPA_GERAL')}
          description="GPS de campo"
        />
        <QuickAction 
          color="bg-amber-500" 
          icon={<HardHat className="text-white" size={24} />} 
          label="Fiscais" 
          onClick={() => onNavigate('PROFISSIONAIS')}
          description="Gestão de equipe"
        />
        <QuickAction 
          color="bg-purple-500" 
          icon={<FileBarChart className="text-white" size={24} />} 
          label="Relatórios" 
          onClick={() => onNavigate('RELATORIOS')}
          description="Boletim oficial"
        />
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest flex items-center gap-2">
              <Clock size={16} className="text-blue-600" /> Atividade Recente
          </h3>
          <button onClick={() => onNavigate('CONTRATOS')} className="text-[9px] font-black text-blue-600 uppercase tracking-widest active:scale-95">Ver Tudo</button>
        </div>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 opacity-40">
              <Clock size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-[9px] font-bold uppercase tracking-widest">Sem lançamentos hoje</p>
            </div>
          ) : (
            recentActivity.map(act => (
              <div 
                key={act.id} 
                onClick={() => onNavigate('TRECHOS', { selectedRuaId: act.ruaId })}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl active:bg-slate-100 transition-colors cursor-pointer border border-transparent active:border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-600 p-2.5 rounded-xl"><MapPin size={16} /></div>
                  <div>
                    <p className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1 truncate max-w-[150px]">{act.ruaNome}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{act.data}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-[12px] font-black text-blue-600">{act.area.toFixed(2)} m²</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const QuickAction: React.FC<{ color: string, icon: React.ReactNode, label: string, description: string, onClick: () => void }> = ({ color, icon, label, description, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-200 flex flex-col gap-3 items-start hover:bg-slate-50 transition-colors text-left group active:scale-95 border-b-4 border-b-slate-100"
  >
    <div className={`${color} p-3 rounded-2xl shadow-lg transition-transform group-hover:rotate-6`}>
      {icon}
    </div>
    <div>
        <h4 className="font-black text-slate-800 text-xs uppercase leading-none mb-1">{label}</h4>
        <p className="text-[9px] text-slate-400 font-bold uppercase leading-tight opacity-70">{description}</p>
    </div>
  </button>
);

export default Dashboard;
