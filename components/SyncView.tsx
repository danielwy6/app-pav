
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { 
  CloudLightning, 
  RefreshCcw, 
  CheckCircle, 
  AlertCircle, 
  Database, 
  Clock, 
  Server,
  Loader2,
  CheckCircle2,
  ArrowUpCircle,
  Download,
  Upload,
  ShieldCheck,
  FileWarning
} from 'lucide-react';

const SyncView: React.FC = () => {
  const [counts, setCounts] = useState({ contratos: 0, medicoes: 0, ruas: 0, trechos: 0, profissionais: 0 });
  const [syncing, setSyncing] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [log, setLog] = useState<string[]>([]);
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

  const addLog = (msg: string) => {
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const runSync = async () => {
    if (!navigator.onLine) {
      alert("Aparelho offline. Conecte-se à internet para sincronizar.");
      return;
    }

    setSyncing(true);
    setLog([]);
    addLog("Iniciando sincronização técnica...");

    try {
      // Simulação de sincronização com o servidor
      const stores = ['profissionais', 'contratos', 'medicoes', 'ruas', 'trechos'];
      for (const s of stores) {
        const items = await db.getDirty<any>(s);
        if (items.length > 0) {
          addLog(`Enviando ${items.length} itens de ${s}...`);
          await new Promise(r => setTimeout(r, 1000));
          for (const item of items) await db.save(s, item, true);
        }
      }

      addLog("Sincronização concluída com sucesso!");
      await loadDirtyCounts();
    } catch (err) {
      addLog("ERRO: Falha na comunicação.");
    } finally {
      setSyncing(false);
    }
  };

  const handleExportBackup = async () => {
    setBackingUp(true);
    try {
      const data = await db.exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `PAVINSPECT_BACKUP_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addLog("Arquivo de backup gerado com sucesso.");
    } catch (err) {
      alert("Erro ao gerar backup.");
    } finally {
      setBackingUp(false);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Isso irá mesclar os dados do arquivo com o seu banco atual. Deseja continuar?")) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        await db.importAllData(json);
        alert("Backup restaurado com sucesso!");
        loadDirtyCounts();
        addLog("Dados importados do arquivo de backup.");
      } catch (err) {
        alert("Erro ao importar arquivo. Verifique se o formato é válido.");
      }
    };
    reader.readAsText(file);
  };

  const totalDirty = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 pb-20">
      <div className={`p-6 rounded-3xl text-white shadow-xl flex flex-col items-center text-center transition-all ${isOnline ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-slate-700'}`}>
        <div className={`p-4 rounded-full mb-4 ${isOnline ? 'bg-white/20' : 'bg-slate-600 animate-pulse'}`}>
            {syncing ? <Loader2 className="animate-spin" size={48} /> : <CloudLightning size={48} />}
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight">{isOnline ? 'Nuvem Conectada' : 'Modo Offline'}</h2>
        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-2">
            Prefeitura de Horizonte - Sistema de Fiscalização
        </p>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black text-slate-700 text-xs flex items-center gap-2 uppercase tracking-widest">
                <ShieldCheck size={16} className="text-blue-600" /> Segurança de Dados
            </h3>
        </div>
        <div className="p-6 space-y-4">
            <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">
              Para evitar perda de fotos e medições em caso de perda do celular, gere um arquivo de backup e salve-o fora do aparelho (E-mail ou Drive).
            </p>
            <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleExportBackup}
                  disabled={backingUp}
                  className="flex flex-col items-center justify-center gap-2 p-5 bg-blue-50 text-blue-700 rounded-3xl border border-blue-100 active:scale-95 transition-all"
                >
                  {backingUp ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                  <span className="text-[10px] font-black uppercase tracking-widest">Gerar Backup</span>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 p-5 bg-slate-50 text-slate-600 rounded-3xl border border-slate-100 active:scale-95 transition-all"
                >
                  <Upload size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Restaurar</span>
                </button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportBackup} />
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-100">
            <h3 className="font-black text-slate-700 text-xs flex items-center gap-2 uppercase tracking-widest">
                <Database size={16} /> Pendências de Envio
            </h3>
        </div>
        <div className="divide-y divide-slate-50">
            <DirtyItem label="Contratos" count={counts.contratos} />
            <DirtyItem label="Medições" count={counts.medicoes} />
            <DirtyItem label="Ruas/Logradouros" count={counts.ruas} />
            <DirtyItem label="Trechos & Fotos" count={counts.trechos} />
        </div>
      </div>

      <button 
        onClick={runSync}
        disabled={syncing || (!isOnline && totalDirty > 0)}
        className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em]"
      >
        {syncing ? <Loader2 className="animate-spin" size={24} /> : <ArrowUpCircle size={24} />}
        {syncing ? 'Sincronizando...' : totalDirty > 0 ? 'Sincronizar Agora' : 'Dados Atualizados'}
      </button>

      {log.length > 0 && (
        <div className="bg-slate-900 rounded-[24px] p-5 font-mono text-[9px] text-emerald-400 h-32 overflow-y-auto space-y-1 shadow-inner border border-slate-800">
            {log.map((entry, i) => <div key={i} className="opacity-80">{entry}</div>)}
        </div>
      )}
    </div>
  );
};

const DirtyItem: React.FC<{ label: string, count: number }> = ({ label, count }) => (
  <div className="p-5 flex justify-between items-center">
    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{label}</span>
    {count > 0 ? (
        <div className="flex items-center gap-2">
            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[9px] font-black uppercase">{count} pendente</span>
            <AlertCircle size={14} className="text-amber-500" />
        </div>
    ) : (
        <CheckCircle2 size={18} className="text-emerald-500" />
    )}
  </div>
);

export default SyncView;
