
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { Contrato, Medicao } from '../types';
import { 
  CloudLightning, 
  Download, 
  Upload, 
  Share2, 
  ShieldCheck, 
  Database, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowUpCircle,
  PartyPopper,
  X,
  Edit2,
  Copy
} from 'lucide-react';

interface SyncCounts {
  contratos: number;
  medicoes: number;
  ruas: number;
  trechos: number;
  profissionais: number;
}

interface Conflict {
  type: 'CONTRATO';
  importedItem: any;
  localItem: any;
  newName: string;
}

const SyncView: React.FC = () => {
  const [counts, setCounts] = useState<SyncCounts>({ contratos: 0, medicoes: 0, ruas: 0, trechos: 0, profissionais: 0 });
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [pendingImportData, setPendingImportData] = useState<any>(null);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    loadDirtyCounts();
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const loadDirtyCounts = async () => {
    const [c, m, r, t, p] = await Promise.all([
      db.getDirty('contratos'),
      db.getDirty('medicoes'),
      db.getDirty('ruas'),
      db.getDirty('trechos'),
      db.getDirty('profissionais'),
    ]);
    setCounts({
      contratos: c.length,
      medicoes: m.length,
      ruas: r.length,
      trechos: t.length,
      profissionais: p.length
    });
  };

  const handleExportBackup = async (share = false) => {
    setProcessing(true);
    try {
      const data = await db.exportAllData();
      const date = new Date().toISOString().split('T')[0];
      const fileName = `PAVINSPECT_BACKUP_${date}.json`;
      
      if (share && navigator.share) {
        const file = new File([data], fileName, { type: 'application/json' });
        await navigator.share({
          files: [file],
          title: 'Backup PavInspect',
          text: 'Arquivo de exportação de dados de fiscalização.'
        });
      } else {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao processar backup.");
    } finally {
      setProcessing(false);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setProcessing(true);
        const json = event.target?.result as string;
        const data = JSON.parse(json);
        
        // Identificar conflitos de número de contrato
        const localContratos = await db.getAll<Contrato>('contratos');
        const foundConflicts: Conflict[] = [];

        if (data.contratos && Array.isArray(data.contratos)) {
          for (const impC of data.contratos) {
            const local = localContratos.find(lc => lc.numero.trim().toUpperCase() === impC.numero.trim().toUpperCase());
            // Se o número existe e IDs são diferentes, há conflito de numeração
            if (local && local.id !== impC.id) {
              foundConflicts.push({
                type: 'CONTRATO',
                importedItem: impC,
                localItem: local,
                newName: impC.numero + ' (IMPORTADO)'
              });
            }
          }
        }

        if (foundConflicts.length > 0) {
          setConflicts(foundConflicts);
          setPendingImportData(data);
          setProcessing(false);
        } else {
          await db.importAllData(json);
          setProcessing(false);
          setShowSuccess(true);
          loadDirtyCounts();
        }
      } catch (err) {
        setProcessing(false);
        alert("Erro ao importar arquivo. Verifique se o arquivo é um backup válido.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resolveConflict = async (resolution: 'REPLACE' | 'RENAME', index: number) => {
    if (!pendingImportData) return;
    
    const conflict = conflicts[index];
    const newPendingData = { ...pendingImportData };
    const newConflicts = [...conflicts];

    if (resolution === 'RENAME') {
      // Verifica se o novo nome inserido também já existe localmente
      const localContratos = await db.getAll<Contrato>('contratos');
      const duplicado = localContratos.find(c => c.numero.trim().toUpperCase() === conflict.newName.trim().toUpperCase());
      
      if (duplicado) {
        alert("⚠️ O novo nome inserido também já existe localmente. Por favor, escolha outro.");
        return;
      }

      // Altera o número do contrato que está vindo no JSON
      const targetId = conflict.importedItem.id;
      newPendingData.contratos = newPendingData.contratos.map((c: any) => 
        c.id === targetId ? { ...c, numero: conflict.newName.toUpperCase() } : c
      );
    } 
    else if (resolution === 'REPLACE') {
       // Se for REPLACE, apaga o local e seus filhos para garantir que os dados importados assumam a posição
       if (conflict.localItem.id !== conflict.importedItem.id) {
          await db.deleteContratoCascade(conflict.localItem.id);
       }
    }

    newConflicts.splice(index, 1);
    setConflicts(newConflicts);
    setPendingImportData(newPendingData);

    // Se resolveu todos os conflitos, finaliza a importação dos dados modificados
    if (newConflicts.length === 0) {
      setProcessing(true);
      await db.importAllData(JSON.stringify(newPendingData));
      setProcessing(false);
      setShowSuccess(true);
      setPendingImportData(null);
      loadDirtyCounts();
    }
  };

  const updateConflictNewName = (index: number, val: string) => {
    const newConflicts = [...conflicts];
    newConflicts[index].newName = val;
    setConflicts(newConflicts);
  };

  const totalDirty = (Object.values(counts) as number[]).reduce((a: number, b: number) => a + b, 0);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className={`p-8 rounded-[40px] text-white shadow-xl flex flex-col items-center text-center transition-all ${isOnline ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-slate-800'}`}>
        <div className={`p-5 rounded-full mb-4 ${isOnline ? 'bg-white/20' : 'bg-slate-700 animate-pulse'}`}>
            {processing ? <Loader2 className="animate-spin" size={48} /> : <CloudLightning size={48} />}
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight">{isOnline ? 'Nuvem Ativa' : 'Trabalho Offline'}</h2>
        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-2 px-6">
            O GPS continua funcionando. Seus dados estão salvos localmente no aparelho.
        </p>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-700 text-xs flex items-center gap-2 uppercase tracking-widest">
                <ShieldCheck size={18} className="text-blue-600" /> Segurança & Backup
            </h3>
        </div>
        <div className="p-6 space-y-6">
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
              <AlertCircle className="text-blue-600 shrink-0" size={18} />
              <p className="text-[10px] text-blue-800 font-bold uppercase leading-relaxed">
                Importe backups apenas de fontes confiáveis. O sistema impedirá duplicidade de numeração.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => handleExportBackup(true)}
                  disabled={processing}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all"
                >
                  <Share2 size={18} /> Salvar no Drive / Compartilhar
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleExportBackup(false)}
                    disabled={processing}
                    className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:bg-slate-200"
                  >
                    <Download size={16} /> Baixar Local
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processing}
                    className="py-4 bg-emerald-50 text-emerald-700 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border border-emerald-100 active:bg-emerald-100"
                  >
                    <Upload size={16} /> Importar Dados
                  </button>
                </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportBackup} />
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black text-slate-700 text-xs flex items-center gap-2 uppercase tracking-widest">
                <Database size={18} /> Dados Pendentes
            </h3>
        </div>
        <div className="divide-y divide-slate-50">
            <SyncItem label="Contratos" count={counts.contratos} />
            <SyncItem label="Medições" count={counts.medicoes} />
            <SyncItem label="Ruas/Logradouros" count={counts.ruas} />
            <SyncItem label="Trechos & Fotos" count={counts.trechos} />
        </div>
      </div>

      {/* MODAL DE RESOLUÇÃO DE CONFLITOS */}
      {conflicts.length > 0 && (
        <div className="fixed inset-0 z-[5000] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-500">
             <div className="p-8 border-b border-slate-100 bg-amber-50">
                <div className="bg-amber-500 text-white p-4 rounded-3xl w-fit mb-4 shadow-lg">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Conflito de Número</h3>
                <p className="text-[10px] text-amber-700 font-black uppercase tracking-widest mt-1">Detectamos um contrato com número já existente</p>
             </div>
             
             <div className="p-8 overflow-y-auto space-y-8">
                {conflicts.map((c, i) => (
                   <div key={i} className={`space-y-6 ${i > 0 ? 'pt-8 border-t border-slate-100' : ''}`}>
                      <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-200">
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Conflito Atual</p>
                         <h4 className="text-xl font-black text-slate-800 uppercase">Nº {c.importedItem.numero}</h4>
                         <p className="text-[10px] text-slate-400 mt-1 font-bold">Este número já está em uso na base local. O que deseja fazer com o contrato importado?</p>
                      </div>

                      <div className="space-y-4">
                        {/* Opção RENAME */}
                        <div className="p-6 rounded-[32px] border-2 border-blue-100 bg-blue-50/30 space-y-4">
                           <div className="flex items-center gap-3">
                              <Edit2 size={18} className="text-blue-600" />
                              <span className="text-xs font-black text-blue-800 uppercase tracking-widest">Opção A: Renomear Importado</span>
                           </div>
                           <p className="text-[9px] text-slate-500 font-bold leading-relaxed uppercase">Insira um novo número para o contrato que está sendo importado agora:</p>
                           <input 
                              className="w-full p-4 bg-white border border-blue-200 rounded-2xl font-black uppercase text-sm outline-none focus:ring-4 focus:ring-blue-100"
                              value={c.newName}
                              onChange={(e) => updateConflictNewName(i, e.target.value)}
                              placeholder="NOVO NÚMERO..."
                           />
                           <button 
                              onClick={() => resolveConflict('RENAME', i)}
                              className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-all uppercase text-[10px] tracking-widest"
                           >
                              Confirmar Novo Número
                           </button>
                        </div>

                        {/* Opção REPLACE */}
                        <div className="p-6 rounded-[32px] border border-red-100 bg-red-50/30 space-y-4">
                           <div className="flex items-center gap-3">
                              <Copy size={18} className="text-red-600" />
                              <span className="text-xs font-black text-red-800 uppercase tracking-widest">Opção B: Substituir Existente</span>
                           </div>
                           <p className="text-[9px] text-red-400 font-bold leading-relaxed uppercase">
                              ⚠️ PERIGO: O contrato "{c.localItem.numero}" que já está no celular será APAGADO junto com suas medições e fotos para dar lugar ao novo.
                           </p>
                           <button 
                              onClick={() => resolveConflict('REPLACE', i)}
                              className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-100 active:scale-95 transition-all uppercase text-[10px] tracking-widest"
                           >
                              Substituir Dados Locais
                           </button>
                        </div>
                      </div>
                   </div>
                ))}
             </div>
             
             <div className="p-6 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => { setConflicts([]); setPendingImportData(null); }}
                  className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                >
                  <X size={16} /> Cancelar Toda Importação
                </button>
             </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-[4000] bg-blue-900/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
           <div className="bg-white p-8 rounded-[50px] shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full animate-in zoom-in duration-300">
              <div className="bg-emerald-500 text-white p-6 rounded-[30px] shadow-xl shadow-emerald-200">
                <PartyPopper size={48} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Importação Concluída</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 px-4 leading-relaxed">Os dados do backup foram integrados ao seu aparelho com sucesso!</p>
              </div>
              <button 
                onClick={() => setShowSuccess(false)}
                className="w-full py-5 bg-blue-600 text-white font-black rounded-[24px] shadow-lg shadow-blue-100 uppercase text-xs tracking-widest active:scale-95 transition-all"
              >
                Entendido, obrigado!
              </button>
           </div>
        </div>
      )}

      {processing && (
        <div className="fixed inset-0 z-[3000] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
           <Loader2 className="animate-spin text-blue-600" size={48} />
           <p className="font-black text-slate-800 uppercase text-xs tracking-widest">Analisando Banco de Dados...</p>
        </div>
      )}
    </div>
  );
};

const SyncItem = ({ label, count }: { label: string; count: number }) => (
  <div className="p-6 flex justify-between items-center">
    <span className="text-xs font-bold text-slate-600 uppercase">{label}</span>
    {count > 0 ? (
        <div className="flex items-center gap-2">
            <span className="text-amber-600 text-[10px] font-black uppercase tracking-tighter">Aguardando Envio</span>
            <AlertCircle size={16} className="text-amber-500" />
        </div>
    ) : (
        <CheckCircle2 size={20} className="text-emerald-500" />
    )}
  </div>
);

export default SyncView;
