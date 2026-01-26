
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
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
  FileJson,
  ArrowUpCircle
} from 'lucide-react';

// Define interface for sync counts to ensure proper type inference
interface SyncCounts {
  contratos: number;
  medicoes: number;
  ruas: number;
  trechos: number;
  profissionais: number;
}

const SyncView: React.FC = () => {
  // Use explicit type for state
  const [counts, setCounts] = useState<SyncCounts>({ contratos: 0, medicoes: 0, ruas: 0, trechos: 0, profissionais: 0 });
  const [syncing, setSyncing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        await db.importAllData(json);
        alert("Dados importados e mesclados com sucesso!");
        loadDirtyCounts();
      } catch (err) {
        alert("Erro ao importar arquivo. Verifique se o arquivo é um backup válido.");
      } finally {
        setProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  // Fixed: Cast Object.values to number[] to avoid 'unknown' type errors during reduction (Fix for line 107)
  const totalDirty = (Object.values(counts) as number[]).reduce((a: number, b: number) => a + b, 0);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Status de Conexão */}
      <div className={`p-8 rounded-[40px] text-white shadow-xl flex flex-col items-center text-center transition-all ${isOnline ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-slate-800'}`}>
        <div className={`p-5 rounded-full mb-4 ${isOnline ? 'bg-white/20' : 'bg-slate-700 animate-pulse'}`}>
            {processing ? <Loader2 className="animate-spin" size={48} /> : <CloudLightning size={48} />}
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight">{isOnline ? 'Nuvem Ativa' : 'Trabalho Offline'}</h2>
        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-2 px-6">
            O GPS continua funcionando. Seus dados estão salvos localmente no aparelho.
        </p>
      </div>

      {/* Seção de Backup e Drive */}
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
                Exporte seus dados regularmente para o seu Google Drive para evitar perdas em caso de problemas com o celular.
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

      {/* Lista de Pendências */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black text-slate-700 text-xs flex items-center gap-2 uppercase tracking-widest">
                <Database size={18} /> Dados para Enviar
            </h3>
            {/* Fixed: totalDirty is now correctly typed as number (Fix for line 173) */}
            {totalDirty > 0 && <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[9px] font-black">{totalDirty} ITENS</span>}
        </div>
        <div className="divide-y divide-slate-50">
            <SyncItem label="Contratos" count={counts.contratos} />
            <SyncItem label="Medições" count={counts.medicoes} />
            <SyncItem label="Ruas/Logradouros" count={counts.ruas} />
            <SyncItem label="Trechos & Fotos" count={counts.trechos} />
        </div>
      </div>

      {/* Fixed: totalDirty is now correctly typed as number (Fix for line 183) */}
      {totalDirty > 0 && isOnline && (
        <button 
          className="w-full py-6 bg-blue-600 text-white font-black rounded-[28px] shadow-xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em]"
        >
          <ArrowUpCircle size={24} /> Sincronizar com Servidor
        </button>
      )}

      {processing && (
        <div className="fixed inset-0 z-[3000] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
           <Loader2 className="animate-spin text-blue-600" size={48} />
           <p className="font-black text-slate-800 uppercase text-xs tracking-widest">Processando Banco de Dados...</p>
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
