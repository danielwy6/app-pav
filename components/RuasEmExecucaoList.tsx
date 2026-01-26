
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Rua, Trecho, AppView, AppState, Medicao, Contrato } from '../types';
import { 
  Activity, 
  MapPin, 
  ChevronRight, 
  Loader2, 
  Search,
  Clock,
  ArrowRightCircle
} from 'lucide-react';

interface RuasEmExecucaoListProps {
  onNavigate: (view: AppView, params?: Partial<AppState>) => void;
}

const RuasEmExecucaoList: React.FC<RuasEmExecucaoListProps> = ({ onNavigate }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadFrentesAtivas = async () => {
      setLoading(true);
      const [allRuas, allTrechos, allMeds, allContratos] = await Promise.all([
        db.getAll<Rua>('ruas'),
        db.getAll<Trecho>('trechos'),
        db.getAll<Medicao>('medicoes'),
        db.getAll<Contrato>('contratos')
      ]);

      const ruasComTrechosIds = new Set(allTrechos.map(t => t.ruaId));
      
      const frentes = allRuas
        .filter(r => !ruasComTrechosIds.has(r.id))
        .map(r => {
          const med = allMeds.find(m => m.id === r.medicaoId);
          const con = allContratos.find(c => c.id === med?.contratoId);
          return {
            ...r,
            medicaoNumero: med?.numero,
            contratoNumero: con?.numero
          };
        });

      setItems(frentes);
      setLoading(false);
    };
    loadFrentesAtivas();
  }, []);

  const filtered = items.filter(i => 
    i.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.bairro.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-amber-500 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tighter uppercase leading-none mb-1">Frentes de Trabalho</h2>
          <p className="text-amber-100 text-[10px] font-bold uppercase tracking-[0.2em]">Ruas Cadastradas • Aguardando Medição</p>
        </div>
        <Activity size={100} className="absolute -right-4 -bottom-4 opacity-20 rotate-12" />
      </div>

      <div className="relative">
        <input 
          className="w-full p-5 pl-14 bg-white border border-slate-200 rounded-[28px] shadow-sm outline-none font-bold text-slate-700 focus:ring-4 focus:ring-amber-50 transition-all"
          placeholder="PESQUISAR LOGRADOURO..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
      </div>

      <div className="grid gap-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-amber-500" size={40} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mapeando Frentes de Trabalho...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-100 opacity-60">
            <Clock size={48} className="mx-auto mb-4 text-slate-200" />
            <p className="font-black text-xs uppercase tracking-tighter">Nenhuma rua em execução pendente</p>
          </div>
        ) : (
          filtered.map(r => (
            <button 
              key={r.id} 
              onClick={() => onNavigate('TRECHOS', { selectedRuaId: r.id, selectedMedicaoId: r.medicaoId })}
              className="w-full bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between text-left active:scale-[0.98] active:bg-slate-50 transition-all group"
            >
              <div className="flex items-center gap-5">
                <div className="bg-amber-100 text-amber-600 p-4 rounded-[22px] group-hover:scale-110 transition-transform">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg uppercase leading-none mb-1">{r.nome}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">{r.bairro}</p>
                  
                  <div className="flex gap-2">
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase">Contrato {r.contratoNumero}</span>
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase">Medição {r.medicaoNumero}</span>
                  </div>
                </div>
              </div>
              <ArrowRightCircle size={28} className="text-slate-200 group-hover:text-amber-500 transition-colors" />
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default RuasEmExecucaoList;
