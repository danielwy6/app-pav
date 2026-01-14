
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Contrato, Medicao, Rua, Trecho, Profissional, ServicoComplementar } from '../types';
import { 
  FileText, 
  Download, 
  Loader2, 
  Users, 
  Calendar, 
  ClipboardCheck,
  FileSearch,
  FileArchive,
  HardHat,
  Ruler,
  Layers,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  MapPin,
  Wrench,
  RotateCcw,
  PlusCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

interface StreetGroup {
  rua: Rua;
  trechos: Trecho[];
  servicos: ServicoComplementar[];
  subtotalArea: number;
  subtotalMeioFio: number;
}

interface ReportData {
  contrato?: Contrato;
  medicao?: Medicao;
  profissionais: {
    profissional: Profissional;
    streets: StreetGroup[];
    totalArea: number;
    totalMeioFio: number;
  }[];
  totalGeralArea: number;
  totalGeralMeioFio: number;
}

const RelatoriosView: React.FC = () => {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  
  const [selectedContrato, setSelectedContrato] = useState<string>('');
  const [selectedMedicao, setSelectedMedicao] = useState<string>('');
  const [selectedProfissional, setSelectedProfissional] = useState<string>('TODOS');
  
  const [loading, setLoading] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const [cList, pList] = await Promise.all([
      db.getAll<Contrato>('contratos'),
      db.getAll<Profissional>('profissionais')
    ]);
    setContratos(cList);
    setProfissionais(pList.filter(p => p.status === 'Ativo'));
  };

  const handleContratoChange = async (id: string) => {
    setSelectedContrato(id);
    setSelectedMedicao('');
    setReportData(null);
    if (id) {
      const allMedicoes = await db.getAll<Medicao>('medicoes');
      setMedicoes(allMedicoes.filter(m => m.contratoId === id));
    } else {
      setMedicoes([]);
    }
  };

  const gerarPreviewProdutividade = async () => {
    if (!selectedMedicao) return;
    setLoading(true);

    try {
      const medicao = medicoes.find(m => m.id === selectedMedicao);
      const contrato = contratos.find(c => c.id === selectedContrato);
      const todasRuas = await db.getAll<Rua>('ruas');
      const ruasDaMedicao = todasRuas.filter(r => r.medicaoId === selectedMedicao);
      const todosTrechos = await db.getAll<Trecho>('trechos');
      const todosServicos = await db.getAll<ServicoComplementar>('servicos');
      
      const prosToProcess = selectedProfissional === 'TODOS' 
        ? profissionais 
        : profissionais.filter(p => p.id === selectedProfissional);

      const reportProfissionais = prosToProcess.map(pro => {
        // Para cada profissional, agrupar por rua
        const proStreets: StreetGroup[] = ruasDaMedicao.map(rua => {
          const trechosDaRua = todosTrechos.filter(t => t.ruaId === rua.id && t.profissionalId === pro.id);
          const servicosDaRua = todosServicos.filter(s => s.ruaId === rua.id); // Servicos por rua (atribuido ao prof da rua)
          
          const subtotalArea = trechosDaRua.reduce((acc, t) => acc + t.area, 0);
          const subtotalMeioFio = servicosDaRua.reduce((acc, s) => acc + s.quantidade, 0);

          return {
            rua,
            trechos: trechosDaRua,
            servicos: servicosDaRua,
            subtotalArea,
            subtotalMeioFio
          };
        }).filter(sg => sg.trechos.length > 0 || sg.servicos.length > 0);

        const totalArea = proStreets.reduce((acc, sg) => acc + sg.subtotalArea, 0);
        const totalMeioFio = proStreets.reduce((acc, sg) => acc + sg.subtotalMeioFio, 0);

        return {
          profissional: pro,
          streets: proStreets,
          totalArea,
          totalMeioFio
        };
      }).filter(rp => rp.streets.length > 0);

      setReportData({
        contrato,
        medicao,
        profissionais: reportProfissionais,
        totalGeralArea: reportProfissionais.reduce((acc, p) => acc + p.totalArea, 0),
        totalGeralMeioFio: reportProfissionais.reduce((acc, p) => acc + p.totalMeioFio, 0)
      });
    } catch (err) {
      console.error(err);
      alert("Erro ao processar produtividade.");
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!reportData) return;
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(10);
    doc.text("ESTADO DO CEARÁ", 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("PREFEITURA MUNICIPAL DE HORIZONTE", 105, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.text("RELATÓRIO DETALHADO DE PRODUTIVIDADE", 105, 28, { align: 'center' });
    doc.line(20, 32, 190, 32);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`CONTRATO: ${reportData.contrato?.numero || '---'}`, 20, 42);
    doc.text(`MEDIÇÃO: ${reportData.medicao?.numero || '---'}`, 20, 47);
    doc.text(`PERÍODO: ${reportData.medicao?.periodo || '---'}`, 20, 52);

    let y = 65;
    
    reportData.profissionais.forEach(rp => {
      // Nome do Profissional
      doc.setFont("helvetica", "bold");
      doc.setFillColor(37, 99, 235); // Blue 600
      doc.setTextColor(255, 255, 255);
      doc.rect(20, y-5, 170, 8, 'F');
      doc.text(`PROFISSIONAL: ${rp.profissional.nome.toUpperCase()}`, 22, y);
      y += 10;
      doc.setTextColor(0, 0, 0);

      rp.streets.forEach(sg => {
        // Nome da Rua e Tipo
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`LOGRADOURO: ${sg.rua.nome.toUpperCase()} (${sg.rua.tipoIntervencao === 'NOVA' ? 'RUA NOVA' : 'RECUPERAÇÃO'})`, 22, y);
        y += 6;

        // Trechos
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        sg.trechos.forEach((t, i) => {
          doc.text(`Trecho ${i+1}: ${t.comprimento.toFixed(2)}m x ${t.larguraMedia.toFixed(2)}m = ${t.area.toFixed(2)} m² (${t.data})`, 25, y);
          y += 5;
          if (y > 275) { doc.addPage(); y = 20; }
        });

        // Servicos Complementares
        if (sg.servicos.length > 0) {
          doc.setFont("helvetica", "italic");
          sg.servicos.forEach(s => {
            const tipoStr = s.tipo === 'RETIRADA_MEIO_FIO' ? 'Retirada Meio-Fio' : 'Assentamento Meio-Fio';
            doc.text(`- ${tipoStr}: ${s.quantidade.toFixed(2)} m (${s.data})`, 25, y);
            y += 5;
            if (y > 275) { doc.addPage(); y = 20; }
          });
        }

        doc.setFont("helvetica", "bold");
        doc.text(`Subtotal Rua: ${sg.subtotalArea.toFixed(2)} m²`, 190, y, { align: 'right' });
        y += 10;
        if (y > 275) { doc.addPage(); y = 20; }
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`TOTAL PROFISSIONAL: ${rp.totalArea.toFixed(2)} m²`, 190, y, { align: 'right' });
      y += 15;
      if (y > 270) { doc.addPage(); y = 20; }
    });

    // Rodapé de Total Geral
    doc.line(20, y, 190, y);
    y += 8;
    doc.setFontSize(12);
    doc.text(`TOTAL GERAL DA MEDIÇÃO: ${reportData.totalGeralArea.toFixed(2)} m²`, 190, y, { align: 'right' });

    doc.save(`RELATORIO_PRODUCAO_HORIZONTE_MED_${reportData.medicao?.numero}.pdf`);
  };

  const downloadFotosZip = async () => {
    if (!selectedMedicao) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      const medicao = medicoes.find(m => m.id === selectedMedicao);
      const todasRuas = await db.getAll<Rua>('ruas');
      const ruasDaMedicao = todasRuas.filter(r => r.medicaoId === selectedMedicao);
      const todosTrechos = await db.getAll<Trecho>('trechos');

      const rootFolder = zip.folder(`FOTOS_MEDICAO_${medicao?.numero}_${medicao?.periodo.replace(/\//g, '-')}`);

      for (const rua of ruasDaMedicao) {
        const ruaFolder = rootFolder?.folder(rua.nome.replace(/\s+/g, '_'));
        
        if (rua.fotos && rua.fotos.length > 0) {
          const antesFolder = ruaFolder?.folder("ESTADO_INICIAL");
          rua.fotos.forEach((f, i) => {
            antesFolder?.file(`FOTO_ANTES_${i+1}.jpg`, f.base64.split(',')[1], { base64: true });
          });
        }

        const trechosRua = todosTrechos.filter(t => t.ruaId === rua.id);
        if (trechosRua.length > 0) {
          const execFolder = ruaFolder?.folder("EXECUCAO");
          trechosRua.forEach((t, ti) => {
            t.fotos.forEach((f, fi) => {
              execFolder?.file(`TRECHO_${ti+1}_${f.tipo}_${fi+1}.jpg`, f.base64.split(',')[1], { base64: true });
            });
          });
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MIDIA_PAVINSPECT_MED_${medicao?.numero}.zip`;
      link.click();
    } catch (err) {
      alert("Erro ao gerar ZIP de fotos.");
    } finally {
      setZipping(false);
    }
  };

  if (reportData) {
    return (
      <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between">
           <button 
            onClick={() => setReportData(null)}
            className="p-3 bg-white rounded-2xl shadow-sm text-slate-500 active:scale-95"
           >
              <ArrowLeft size={24} />
           </button>
           <h2 className="font-black text-slate-800 uppercase tracking-tighter text-xl">Detalhamento de Produção</h2>
           <div className="w-10"></div>
        </div>

        <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
           <div className="relative z-10 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold uppercase opacity-50 tracking-widest mb-1">Total Geral Medido</p>
                <h3 className="text-4xl font-black tracking-tighter">{reportData.totalGeralArea.toFixed(2)} m²</h3>
              </div>
              <TrendingUp size={48} className="opacity-20" />
           </div>
           <div className="absolute top-[-30px] right-[-30px] opacity-10">
              <Layers size={140} />
           </div>
        </div>

        <div className="space-y-6">
          {reportData.profissionais.map((rp, idx) => (
            <div key={idx} className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                 <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg">
                    <HardHat size={18} />
                 </div>
                 <div>
                    <h4 className="font-black text-slate-800 text-sm uppercase leading-none">{rp.profissional.nome}</h4>
                    <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest">Total: {rp.totalArea.toFixed(2)} m²</p>
                 </div>
              </div>

              {rp.streets.map((sg, sIdx) => (
                <div key={sIdx} className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${sg.rua.tipoIntervencao === 'NOVA' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                         {sg.rua.tipoIntervencao === 'NOVA' ? <PlusCircle size={18} /> : <RotateCcw size={18} />}
                      </div>
                      <div>
                         <h5 className="font-black text-slate-800 text-xs uppercase">{sg.rua.nome}</h5>
                         <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                           {sg.rua.tipoIntervencao === 'NOVA' ? 'Pavimentação Nova' : 'Recuperação'}
                         </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-black text-slate-700">{sg.subtotalArea.toFixed(2)} m²</p>
                    </div>
                  </div>
                  
                  <div className="p-5 space-y-4">
                     {/* Detalhes dos Trechos */}
                     <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Trechos Medidos</p>
                        {sg.trechos.map((t, ti) => (
                          <div key={ti} className="flex justify-between items-center text-[10px] bg-slate-50/50 p-2 rounded-lg">
                             <div className="flex items-center gap-2 font-bold text-slate-600">
                                <Ruler size={12} className="text-slate-300" />
                                <span>{t.comprimento.toFixed(2)}m x {t.larguraMedia.toFixed(2)}m</span>
                             </div>
                             <span className="font-black text-blue-600">{t.area.toFixed(2)} m²</span>
                          </div>
                        ))}
                     </div>

                     {/* Outros Serviços */}
                     {sg.servicos.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-50">
                           <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Serviços Complementares</p>
                           {sg.servicos.map((s, si) => (
                              <div key={si} className="flex justify-between items-center text-[10px] bg-amber-50/50 p-2 rounded-lg">
                                 <div className="flex items-center gap-2 font-bold text-amber-700">
                                    <Wrench size={12} className="opacity-50" />
                                    <span>{s.tipo === 'RETIRADA_MEIO_FIO' ? 'Retirada' : 'Assentamento'} Meio-fio</span>
                                 </div>
                                 <span className="font-black text-amber-600">{s.quantidade.toFixed(2)} m</span>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 pt-4">
          <button 
            onClick={exportPDF}
            className="w-full py-6 bg-blue-600 text-white font-black rounded-[28px] shadow-xl shadow-blue-100 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em] active:scale-95 transition-all"
          >
            <Download size={20} /> Baixar Relatório (PDF)
          </button>
          <button 
            onClick={() => setReportData(null)}
            className="w-full py-6 bg-white text-slate-500 font-black rounded-[28px] border border-slate-200 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em] active:bg-slate-50"
          >
            Refazer Filtros
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tighter uppercase leading-none mb-2">Relatórios</h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 italic">Daniel Wyllame - Fiscalização Técnica</p>
        </div>
        <Layers size={120} className="absolute -right-5 -bottom-5 opacity-10 rotate-12" />
      </div>

      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                <FileSearch size={24} />
            </div>
            <div>
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest">Filtros de Produtividade</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Configure para exportar os dados</p>
            </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contrato</label>
            <select 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={selectedContrato}
              onChange={(e) => handleContratoChange(e.target.value)}
            >
              <option value="">Selecione o Contrato...</option>
              {contratos.map(c => <option key={c.id} value={c.id}>Contrato {c.numero}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Medição</label>
                <select 
                    disabled={!selectedContrato}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-30"
                    value={selectedMedicao}
                    onChange={(e) => setSelectedMedicao(e.target.value)}
                >
                    <option value="">Selecione...</option>
                    {medicoes.map(m => <option key={m.id} value={m.id}>Med. {m.numero}</option>)}
                </select>
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Equipe/Profissional</label>
                <select 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={selectedProfissional}
                    onChange={(e) => setSelectedProfissional(e.target.value)}
                >
                    <option value="TODOS">Toda a Equipe</option>
                    {profissionais.map(p => <option key={p.id} value={p.id}>{p.apelido || p.nome}</option>)}
                </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button 
          onClick={gerarPreviewProdutividade}
          disabled={!selectedMedicao || loading}
          className="w-full py-6 bg-blue-600 text-white font-black rounded-[28px] shadow-xl shadow-blue-100 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em] active:scale-95 transition-all disabled:opacity-30"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <TrendingUp size={20} />}
          {loading ? 'Calculando Detalhes...' : 'Visualizar Detalhamento Técnico'}
        </button>

        <button 
          onClick={downloadFotosZip}
          disabled={!selectedMedicao || zipping}
          className="w-full py-6 bg-emerald-600 text-white font-black rounded-[28px] shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em] active:scale-95 transition-all disabled:opacity-30"
        >
          {zipping ? <Loader2 className="animate-spin" size={20} /> : <FileArchive size={20} />}
          {zipping ? 'Compactando Fotos...' : 'Baixar Fotos da Medição (ZIP)'}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-[32px] flex gap-4">
         <div className="bg-white p-3 rounded-2xl shadow-sm text-amber-500 h-fit">
            <ClipboardCheck size={24} />
         </div>
         <div>
            <h5 className="font-black text-amber-900 text-xs uppercase mb-1">Fiscalização Horizonte</h5>
            <p className="text-[10px] text-amber-700 font-bold uppercase leading-relaxed opacity-80">
                O relatório detalhado inclui a distinção entre rua nova e recuperação, além de listar cada trecho individual com suas dimensões medidas.
            </p>
         </div>
      </div>
    </div>
  );
};

export default RelatoriosView;
