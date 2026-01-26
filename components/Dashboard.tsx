
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { AppView, AppState, Trecho, Rua } from '../types';
import { 
  Plus, 
  MapIcon, 
  HardHat, 
  FileBarChart, 
  Clock, 
  CloudLightning, 
  ChevronRight,
  MapPin
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
  const [stats, setStats] = useState({ contratos: 0, trechos: 0, areaTotal: 0, dirty: 0 });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      const [c, t, m, r, p, cd, td, todasRuas] = await Promise.all([
        db.getAll('contratos'),
        db.getAll<Trecho>('trechos'),
        db.getDirty('medicoes'),
        db.getDirty('ruas'),
        db.getDirty('profissionais'),
        db.getDirty('contratos'),
        db.getDirty('trechos'),
        db.getAll<Rua>('ruas')
      ]);
      
      const area = t.reduce((acc, curr) => acc + (curr.area || 0), 0);
      setStats({ 
        contratos: c.length, 
        trechos: t.length, 
        areaTotal: area,
        dirty: m.length + r.length + p.length + cd.length + td.length
      });

      // Processar atividade recente
      const sortedTrechos = [...t].sort((a, b) => {
          const dateA = new Date(a.updatedAt || 0).getTime();
          const dateB = new Date(b.updatedAt || 0).getTime();
          return dateB - dateA;
      }).slice(0, 3);

      const activity = sortedTrechos.map(tr => {
          const rua = todasRuas.find(ru => ru.id === tr.ruaId);
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
    loadStats();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
            <h2 className="text-2xl font-black mb-1">Olá, Daniel Wyllame!</h2>
            <p className="text-blue-100 text-xs font-bold opacity-80 mb-6 uppercase tracking-wider">Prefeitura de Horizonte</p>
            
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => onNavigate('CONTRATOS')}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-left active:scale-95 transition-all"
              >
                  <span className="block text-2xl font-black">{stats.contratos}</span>
                  <span className="text-[10px] uppercase tracking-wider opacity-80 font-bold">Obras</span>
              </button>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                  <span className="block text-2xl font-black">{stats.trechos}</span>
                  <span className="text-[10px] uppercase tracking-wider opacity-80 font-bold">Trechos</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                  <span className="block text-2xl font-black">{stats.areaTotal.toFixed(0)}</span>
                  <span className="text-[10px] uppercase tracking-wider opacity-80 font-bold">m² Total</span>
              </div>
            </div>
        </div>
        <div className="absolute top-[-20px] right-[-20px] opacity-10">
            <CloudLightning size={120} />
        </div>
      </div>

      {stats.dirty > 0 && (
        <button 
            onClick={() => onNavigate('SYNC')}
            className="w-full bg-amber-50 border border-amber-200 p-5 rounded-[28px] flex items-center justify-between animate-pulse"
        >
            <div className="flex items-center gap-4">
                <div className="bg-amber-500 text-white p-3 rounded-2xl shadow-lg">
                    <CloudLightning size={20} />
                </div>
                <div className="text-left">
                    <div className="text-xs font-black text-amber-900 uppercase leading-none mb-1">Sincronização Pendente</div>
                    <div className="text-[10px] text-amber-600 font-bold uppercase">{stats.dirty} itens aguardando envio</div>
                </div>
            </div>
            <ChevronRight size={18} className="text-amber-300" />
        </button>
      )}

      <div className="grid grid-cols-2 gap-4">
        <QuickAction 
          color="bg-blue-600" 
          icon={<Plus className="text-white" size={24} />} 
          label="Nova Obra" 
          onClick={() => onNavigate('FORM_CONTRATO')} 
          description="Cadastrar contrato"
        />
        <QuickAction 
          color="bg-emerald-500" 
          icon={<MapIcon className="text-white" size={24} />} 
          label="Mapa de Campo" 
          onClick={() => onNavigate('MAPA_GERAL')}
          description="Ver pontos GPS"
        />
        <QuickAction 
          color="bg-amber-500" 
          icon={<HardHat className="text-white" size={24} />} 
          label="Equipe Técnica" 
          onClick={() => onNavigate('PROFISSIONAIS')}
          description="Gestão de fiscais"
        />
        <QuickAction 
          color="bg-purple-500" 
          icon={<FileBarChart className="text-white" size={24} />} 
          label="Relatórios" 
          onClick={() => onNavigate('RELATORIOS')}
          description="Gerar PDF oficial"
        />
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-6">
        <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
            <Clock size={16} className="text-blue-600" /> Atividade Recente
        </h3>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-[10px] text-slate-400 text-center py-6 font-bold uppercase italic tracking-tighter">Nenhum registro recente nas últimas 24h.</p>
          ) : (
            recentActivity.map(act => (
              <div 
                key={act.id} 
                onClick={() => onNavigate('TRECHOS', { selectedRuaId: act.ruaId })}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl active:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-600 p-2 rounded-lg"><MapPin size={16} /></div>
                  <div>
                    <p className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1 truncate max-w-[150px]">{act.ruaNome}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{act.data}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-[11px] font-black text-blue-600">{act.area.toFixed(2)} m²</p>
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
    className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-200 flex flex-col gap-3 items-start hover:bg-slate-50 transition-colors text-left group active:scale-95"
  >
    <div className={`${color} p-3 rounded-2xl shadow-lg transition-transform`}>
      {icon}
    </div>
    <div>
        <h4 className="font-black text-slate-800 text-xs uppercase leading-none mb-1">{label}</h4>
        <p className="text-[9px] text-slate-400 font-bold uppercase leading-tight opacity-70">{description}</p>
    </div>
  </button>
);

export default Dashboard;
