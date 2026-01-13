
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Contrato, Medicao, Rua, Trecho, Profissional } from '../types';
import { 
  FileText, 
  Download, 
  Loader2, 
  Search, 
  Calendar, 
  ClipboardCheck,
  CheckCircle2,
  FileSearch
} from 'lucide-react';
import { jsPDF } from 'jspdf';

const RelatoriosView: React.FC = () => {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [selectedContrato, setSelectedContrato] = useState<string>('');
  const [selectedMedicao, setSelectedMedicao] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadContratos();
  }, []);

  const loadContratos = async () => {
    const list = await db.getAll<Contrato>('contratos');
    setContratos(list);
  };

  const handleContratoChange = async (id: string) => {
    setSelectedContrato(id);
    setSelectedMedicao('');
    if (id) {
      const allMedicoes = await db.getAll<Medicao>('medicoes');
      setMedicoes(allMedicoes.filter(m => m.contratoId === id));
    } else {
      setMedicoes([]);
    }
  };

  const gerarRelatorioPDF = async () => {
    if (!selectedMedicao) return;
    setLoading(true);

    try {
      const medicao = medicoes.find(m => m.id === selectedMedicao);
      const contrato = contratos.find(c => c.id === selectedContrato);
      const todasRuas = await db.getAll<Rua>('ruas');
      const ruasDaMedicao = todasRuas.filter(r => r.medicaoId === selectedMedicao);
      
      const doc = new jsPDF();
      
      // Cabeçalho Simples (Provisório)
      doc.setFontSize(10);
      doc.text("ESTADO DO CEARÁ", 105, 15, { align: 'center' });
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("PREFEITURA MUNICIPAL DE HORIZONTE", 105, 22, { align: 'center' });
      doc.setFontSize(10);
      doc.text("RELATÓRIO DE FISCALIZAÇÃO E MEDIÇÃO", 105, 28, { align: 'center' });
      
      doc.line(20, 32, 190, 32);

      // Dados do Contrato
      doc.setFontSize(10);
      doc.text(`CONTRATO Nº: ${contrato?.numero || '---'}`, 20, 42);
      doc.text(`MEDIÇÃO Nº: ${medicao?.numero || '---'}`, 20, 48);
      doc.text(`PERÍODO: ${medicao?.periodo || '---'}`, 20, 54);

      // Tabela de Resumo
      let y = 65;
      doc.setFont("helvetica", "bold");
      doc.text("RESUMO POR LOGRADOURO", 20, y);
      y += 8;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      for (const rua of ruasDaMedicao) {
        const trechos = await db.getAll<Trecho>('trechos');
        const trechosDaRua = trechos.filter(t => t.ruaId === rua.id);
        const areaTotal = trechosDaRua.reduce((acc, curr) => acc + curr.area, 0);
        
        doc.text(`${rua.nome.toUpperCase()} (${rua.bairro})`, 25, y);
        doc.text(`${areaTotal.toFixed(2)} m²`, 170, y, { align: 'right' });
        y += 6;

        if (y > 270) {
            doc.addPage();
            y = 20;
        }
      }

      doc.line(20, y + 2, 190, y + 2);
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.text("Assinatura do Fiscal Responsável", 105, y + 30, { align: 'center' });
      doc.line(65, y + 28, 145, y + 28);

      doc.save(`Relatorio_Pavimentacao_${medicao?.numero || '00'}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tighter uppercase leading-none mb-2">Relatórios</h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Gerador de Documentos Oficiais</p>
        </div>
        <FileText size={100} className="absolute -right-5 -bottom-5 opacity-10 rotate-12" />
      </div>

      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
                <FileSearch size={24} />
            </div>
            <div>
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest">Configuração do Relatório</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Selecione os filtros abaixo</p>
            </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contrato</label>
            <select 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              value={selectedContrato}
              onChange={(e) => handleContratoChange(e.target.value)}
            >
              <option value="">Selecione o Contrato...</option>
              {contratos.map(c => <option key={c.id} value={c.id}>Contrato {c.numero}</option>)}
            </select>
          </div>

          {selectedContrato && (
            <div className="space-y-1.5 animate-in slide-in-from-top-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Medição</label>
              <select 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                value={selectedMedicao}
                onChange={(e) => setSelectedMedicao(e.target.value)}
              >
                <option value="">Escolha a Medição...</option>
                {medicoes.map(m => <option key={m.id} value={m.id}>Medição {m.numero} ({m.periodo})</option>)}
              </select>
            </div>
          )}

          <div className="pt-4">
            <button 
              onClick={gerarRelatorioPDF}
              disabled={!selectedMedicao || loading}
              className="w-full py-5 bg-slate-900 text-white font-black rounded-[28px] shadow-xl shadow-slate-200 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
              {loading ? 'Gerando PDF...' : 'Gerar Relatório Oficial'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-[32px] flex gap-4">
         <div className="bg-white p-3 rounded-2xl shadow-sm text-amber-500 h-fit">
            <ClipboardCheck size={24} />
         </div>
         <div>
            <h5 className="font-black text-amber-900 text-xs uppercase mb-1">Dica de Exportação</h5>
            <p className="text-[10px] text-amber-700 font-bold uppercase leading-relaxed opacity-80">
                Para incluir as fotos de evidência, utilize a função de download de fotos (.zip) dentro da lista de ruas.
            </p>
         </div>
      </div>
    </div>
  );
};

export default RelatoriosView;
