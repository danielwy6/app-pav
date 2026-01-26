
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Contrato, Medicao, Rua, Trecho, Profissional, ServicoComplementar, TipoPavimentacao } from '../types';
import { 
  Download, 
  Loader2, 
  Layers, 
  ArrowLeft, 
  TrendingUp, 
  HardHat, 
  FileArchive, 
  FileText, 
  Image as ImageIcon,
  Filter,
  ChevronRight,
  Printer,
  Wrench
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

const PAVIMENTOS_LABELS: Record<string, string> = {
  'PEDRA_TOSCA': 'Pedra Tosca',
  'INTERTRAVADO_H4': 'Intertravado H4',
  'INTERTRAVADO_H6': 'Intertravado H6',
  'INTERTRAVADO_H8': 'Intertravado H8',
  'INTERTRAVADO_SEXTAVADO_H8': 'Intert. Sextavado H8',
  'CONCRETO': 'Concreto',
  'PARALELEPIPEDO': 'Paralelepípedo',
  'PEDRA_PORTUGUESA': 'Pedra Portuguesa',
};

const RelatoriosView: React.FC = () => {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [ruas, setRuas] = useState<Rua[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  
  const [selContrato, setSelContrato] = useState<string>('TODOS');
  const [selMedicao, setSelMedicao] = useState<string>('TODOS');
  const [selRua, setSelRua] = useState<string>('TODOS');
  const [selProfissional, setSelProfissional] = useState<string>('TODOS');
  const [selPavimentacao, setSelPavimentacao] = useState<string>('TODOS');
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    const [cList, pList, mList, rList] = await Promise.all([
      db.getAll<Contrato>('contratos'),
      db.getAll<Profissional>('profissionais'),
      db.getAll<Medicao>('medicoes'),
      db.getAll<Rua>('ruas')
    ]);
    setContratos(cList);
    setProfissionais(pList.filter(p => p.status === 'Ativo'));
    setMedicoes(mList);
    setRuas(rList);
  };

  const filteredMedicoes = selContrato === 'TODOS' ? medicoes : medicoes.filter(m => m.contratoId === selContrato);
  const filteredRuas = selMedicao === 'TODOS' ? ruas : ruas.filter(r => r.medicaoId === selMedicao);

  const getFilteredData = async () => {
    const allTrechos = await db.getAll<Trecho>('trechos');
    const allRuas = await db.getAll<Rua>('ruas');
    const allMeds = await db.getAll<Medicao>('medicoes');
    const allContratos = await db.getAll<Contrato>('contratos');
    
    let filteredTrechos = allTrechos;
    let filteredRuasBase = allRuas;

    // Filtro por Contrato
    if (selContrato !== 'TODOS') {
      const medsIds = allMeds.filter(m => m.contratoId === selContrato).map(m => m.id);
      filteredRuasBase = allRuas.filter(r => medsIds.includes(r.medicaoId));
      filteredTrechos = filteredTrechos.filter(t => filteredRuasBase.some(fr => fr.id === t.ruaId));
    }
    
    // Filtro por Medição
    if (selMedicao !== 'TODOS') {
      filteredRuasBase = allRuas.filter(r => r.medicaoId === selMedicao);
      filteredTrechos = filteredTrechos.filter(t => filteredRuasBase.some(fr => fr.id === t.ruaId));
    }
    
    // Filtro por Rua
    if (selRua !== 'TODOS') {
      filteredRuasBase = filteredRuasBase.filter(r => r.id === selRua);
      filteredTrechos = filteredTrechos.filter(t => t.ruaId === selRua);
    }
    
    if (selProfissional !== 'TODOS') filteredTrechos = filteredTrechos.filter(t => t.profissionalId === selProfissional);

    if (selPavimentacao !== 'TODOS') {
      if (selPavimentacao === 'INTERTRAVADO') {
        filteredTrechos = filteredTrechos.filter(t => t.tipoPavimentacao.startsWith('INTERTRAVADO'));
      } else {
        filteredTrechos = filteredTrechos.filter(t => t.tipoPavimentacao === selPavimentacao);
      }
    }

    return { 
      trechos: filteredTrechos, 
      contratos: allContratos, 
      medicoes: allMeds, 
      ruas: filteredRuasBase 
    };
  };

  const generatePDF = async (includePhotos: boolean) => {
    setLoading(true);
    setProgress('Construindo boletim técnico colorido...');
    try {
      const { trechos, contratos: cList, medicoes: mList, ruas: rList } = await getFilteredData();
      const doc = new jsPDF();
      let y = 20;

      const MARGIN_X = 15;
      const WIDTH = 180;
      const COL_VAL_X = 155;
      const ROW_H = 7.5;

      const header = () => {
        doc.setFillColor(29, 78, 216); // Blue 700
        doc.rect(0, 0, 210, 35, 'F');
        
        doc.setTextColor(255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("PREFEITURA MUNICIPAL DE HORIZONTE - CE", 105, 12, { align: 'center' });
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("BOLETIM DE MEDIÇÃO TÉCNICA", 105, 20, { align: 'center' });
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 26, { align: 'center' });
        
        y = 45;
        doc.setDrawColor(29, 78, 216);
        doc.setLineWidth(0.5);
        doc.setFillColor(29, 78, 216);
        doc.rect(MARGIN_X, y, WIDTH, 10, 'F');
        doc.setTextColor(255);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("DESCRIÇÃO DOS SERVIÇOS", MARGIN_X + 5, y + 6.5);
        doc.text("TOTAL", WIDTH + MARGIN_X - 5, y + 6.5, { align: 'right' });
        y += 10;
      };

      const drawRow = (text: string, value: string = "", level: number = 0, colors: { bg?: [number, number, number], text?: [number, number, number] } = {}) => {
        if (y > 275) { doc.addPage(); header(); }
        
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.1);
        
        if (colors.bg) {
          doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
          doc.rect(MARGIN_X, y, WIDTH, ROW_H, 'F');
        }
        
        doc.rect(MARGIN_X, y, WIDTH, ROW_H, 'S');
        doc.line(COL_VAL_X, y, COL_VAL_X, y + ROW_H);
        
        doc.setTextColor(colors.text ? colors.text[0] : 40, colors.text ? colors.text[1] : 40, colors.text ? colors.text[2] : 40);
        doc.setFont("helvetica", level < 3 ? "bold" : "normal");
        doc.setFontSize(level === 0 ? 10 : 9);
        
        const indent = level * 6;
        doc.text(text.toUpperCase(), MARGIN_X + 3 + indent, y + 5);
        
        if (value) {
          doc.text(value.toUpperCase(), WIDTH + MARGIN_X - 3, y + 5, { align: 'right' });
        }
        
        y += ROW_H;
      };

      header();

      const grouped: any = {};
      trechos.forEach(t => {
        const rua = rList.find(r => r.id === t.ruaId);
        if (!rua) return; // Fora do filtro

        const med = mList.find(m => m.id === rua?.medicaoId);
        const con = cList.find(c => c.id === med?.contratoId);
        const pro = profissionais.find(p => p.id === t.profissionalId);
        
        const cId = con?.id || 'none';
        const mId = med?.id || 'none';
        const rId = rua?.id || 'none';
        const pId = pro?.id || 'none';
        const pav = t.tipoPavimentacao;
        const int = t.tipoIntervencao;

        if (!grouped[cId]) grouped[cId] = { obj: con, meds: {} };
        if (!grouped[cId].meds[mId]) grouped[cId].meds[mId] = { obj: med, ruas: {} };
        if (!grouped[cId].meds[mId].ruas[rId]) grouped[cId].meds[mId].ruas[rId] = { obj: rua, pros: {} };
        if (!grouped[cId].meds[mId].ruas[rId].pros[pId]) grouped[cId].meds[mId].ruas[rId].pros[pId] = { obj: pro, pavs: {} };
        if (!grouped[cId].meds[mId].ruas[rId].pros[pId].pavs[pav]) grouped[cId].meds[mId].ruas[rId].pros[pId].pavs[pav] = { total: 0, ints: {} };
        if (!grouped[cId].meds[mId].ruas[rId].pros[pId].pavs[pav].ints[int]) grouped[cId].meds[mId].ruas[rId].pros[pId].pavs[pav].ints[int] = { total: 0, trechos: [] };

        grouped[cId].meds[mId].ruas[rId].pros[pId].pavs[pav].ints[int].trechos.push(t);
        grouped[cId].meds[mId].ruas[rId].pros[pId].pavs[pav].ints[int].total += t.area;
        grouped[cId].meds[mId].ruas[rId].pros[pId].pavs[pav].total += t.area;
      });

      for (const cId in grouped) {
        const con = grouped[cId];
        drawRow(`CONTRATO: ${con.obj?.numero || 'N/A'}`, "", 0, { bg: [230, 240, 255], text: [29, 78, 216] });

        for (const mId in con.meds) {
          const med = con.meds[mId];
          drawRow(`MEDIÇÃO: ${med.obj?.numero || 'N/A'}`, "", 1, { bg: [245, 245, 255] });

          for (const rId in med.ruas) {
            const rua = med.ruas[rId];
            drawRow(`LOGRADOURO: ${rua.obj?.nome || 'N/A'}`, "", 2);

            for (const proId in rua.pros) {
              const pro = rua.pros[proId];
              drawRow(`FISCAL: ${pro.obj?.nome || 'N/A'}`, "", 3, { text: [100, 100, 100] });

              for (const pavId in pro.pavs) {
                const pav = pro.pavs[pavId];
                const label = PAVIMENTOS_LABELS[pavId] || pavId;
                const unit = pavId === 'CONCRETO' ? 'M3' : 'M2';
                drawRow(`PAVIMENTO: ${label}`, `${pav.total.toFixed(2)} ${unit}`, 4, { bg: [245, 250, 245], text: [21, 128, 61] });

                for (const intId in pav.ints) {
                  const int = pav.ints[intId];
                  const intLabel = intId === 'NOVA' ? 'PAVIMENTAÇÃO NOVA' : 'PAVIMENTAÇÃO RECUPERADA';
                  drawRow(intLabel, `${int.total.toFixed(2)} ${unit}`, 5);

                  int.trechos.forEach((t: Trecho, idx: number) => {
                    const tUnit = t.espessura ? 'M3' : 'M2';
                    const formula = t.espessura 
                      ? `${t.comprimento.toFixed(2)} X ${t.larguraMedia.toFixed(2)} X ${t.espessura.toFixed(2)}`
                      : `${t.comprimento.toFixed(2)} X ${t.larguraMedia.toFixed(2)}`;
                    
                    drawRow(`TRECHO ${String(idx + 1).padStart(2, '0')} [${formula}]`, `${t.area.toFixed(2)} ${tUnit}`, 6);

                    if (includePhotos && t.fotos && t.fotos.length > 0) {
                      const fotosAntes = t.fotos.filter(f => f.tipo === 'Antes');
                      const fotosDepois = t.fotos.filter(f => f.tipo === 'Depois');

                      // FOTOS ANTES
                      if (fotosAntes.length > 0) {
                        if (y > 230) { doc.addPage(); header(); }
                        drawRow("EVIDÊNCIAS: ESTADO INICIAL (ANTES)", "", 7, { bg: [255, 245, 245], text: [185, 28, 28] });
                        
                        const startPhotoY = y;
                        let xImg = MARGIN_X + 5;
                        fotosAntes.slice(0, 4).forEach(f => {
                          try { doc.addImage(f.base64, 'JPEG', xImg, y + 2, 38, 38); xImg += 42; } catch(e) {}
                        });
                        y += 44;
                        doc.setDrawColor(220, 220, 220);
                        doc.rect(MARGIN_X, startPhotoY, WIDTH, 44, 'S');
                        doc.line(COL_VAL_X, startPhotoY, COL_VAL_X, y);
                      }

                      // FOTOS DEPOIS
                      if (fotosDepois.length > 0) {
                        if (y > 230) { doc.addPage(); header(); }
                        drawRow("EVIDÊNCIAS: ESTADO FINALIZADO (DEPOIS)", "", 7, { bg: [240, 253, 244], text: [22, 101, 52] });
                        
                        const startPhotoY = y;
                        let xImg = MARGIN_X + 5;
                        fotosDepois.slice(0, 4).forEach(f => {
                          try { doc.addImage(f.base64, 'JPEG', xImg, y + 2, 38, 38); xImg += 42; } catch(e) {}
                        });
                        y += 44;
                        doc.setDrawColor(220, 220, 220);
                        doc.rect(MARGIN_X, startPhotoY, WIDTH, 44, 'S');
                        doc.line(COL_VAL_X, startPhotoY, COL_VAL_X, y);
                      }
                    }
                  });
                }
              }
            }
          }
        }
      }

      doc.setDrawColor(29, 78, 216);
      doc.setLineWidth(1);
      doc.line(MARGIN_X, y + 5, MARGIN_X + WIDTH, y + 5);

      doc.save(`BOLETIM_DETALHADO_${new Date().getTime()}.pdf`);
    } catch (e) { console.error(e); alert("Erro ao gerar PDF."); }
    setLoading(false);
  };

  const generateZip = async () => {
    setLoading(true);
    setProgress('Organizando acervo de fotos...');
    try {
      const { trechos, contratos: cList, medicoes: mList, ruas: rList } = await getFilteredData();
      const zip = new JSZip();

      // 1. Processar Fotos dos Logradouros (FOTOS DA RUA)
      rList.forEach(r => {
        if (r.fotos && r.fotos.length > 0) {
          const med = mList.find(m => m.id === r.medicaoId);
          const con = cList.find(c => c.id === med?.contratoId);
          
          // Caminho: Contrato / Medicao / Logradouro / ESTADO_INICIAL_LOGRADOURO
          const path = `${con?.numero || 'Sem_Contrato'}/Med_${med?.numero || 'Sem_Med'}/${r.nome || 'Rua_NI'}/ESTADO_INICIAL_LOGRADOURO`;
          const folder = zip.folder(path);
          
          r.fotos.forEach((f, i) => {
            const data = f.base64.split(',')[1];
            folder?.file(`${f.tipo}_${i+1}.jpg`, data, { base64: true });
          });
        }
      });

      // 2. Processar Fotos dos Trechos
      trechos.forEach(t => {
        const rua = rList.find(r => r.id === t.ruaId);
        if (!rua) return;

        const med = mList.find(m => m.id === rua.medicaoId);
        const con = cList.find(c => c.id === med?.contratoId);
        
        // Caminho: Contrato / Medicao / Logradouro / Trecho_ID
        const path = `${con?.numero || 'Sem_Contrato'}/Med_${med?.numero || 'Sem_Med'}/${rua.nome || 'Rua_NI'}/TRECHO_${t.id.substring(0, 5)}`;
        const folder = zip.folder(path);
        
        t.fotos.forEach((f, i) => {
          const data = f.base64.split(',')[1];
          folder?.file(`${f.tipo}_${i+1}.jpg`, data, { base64: true });
        });
      });

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `ACERVO_FOTOGRAFICO_PAVINSPECT_${new Date().getTime()}.zip`;
      link.click();
    } catch (e) { 
      console.error(e);
      alert("Erro ao gerar ZIP."); 
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tighter uppercase leading-none mb-2">Relatórios Oficiais</h2>
          <p className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em]">Padrão Prefeitura de Horizonte</p>
        </div>
        <Printer size={120} className="absolute -right-5 -bottom-5 opacity-10 rotate-12" />
      </div>

      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-blue-600 text-white rounded-xl"><Filter size={16} /></div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtros Técnicos</h3>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase" value={selContrato} onChange={(e) => setSelContrato(e.target.value)}>
            <option value="TODOS">Todos os Contratos</option>
            {contratos.map(c => <option key={c.id} value={c.id}>Contrato {c.numero}</option>)}
          </select>
          <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase" value={selMedicao} onChange={(e) => setSelMedicao(e.target.value)}>
            <option value="TODOS">Todas as Medições</option>
            {filteredMedicoes.map(m => <option key={m.id} value={m.id}>Medição {m.numero}</option>)}
          </select>
          <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase" value={selPavimentacao} onChange={(e) => setSelPavimentacao(e.target.value)}>
            <option value="TODOS">Tipos de Pavimentação: TODOS</option>
            <option value="PEDRA_TOSCA">Pedra Tosca</option>
            <option value="CONCRETO">Concreto</option>
            <option value="INTERTRAVADO">Intertravado (Geral)</option>
          </select>
          <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase" value={selProfissional} onChange={(e) => setSelProfissional(e.target.value)}>
            <option value="TODOS">Responsável Técnico: TODOS</option>
            {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase" value={selRua} onChange={(e) => setSelRua(e.target.value)}>
            <option value="TODOS">Todos os Logradouros</option>
            {filteredRuas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Geração de Documentos</h3>
        <ReportCard icon={<FileText size={28} />} title="Boletim de Fiscalização (PDF)" desc="Técnico: Visual moderno com hierarquia formal e colorida." color="bg-blue-600" onClick={() => generatePDF(false)} disabled={loading} />
        <ReportCard icon={<ImageIcon size={28} />} title="Boletim com Evidências (PDF)" desc="Dossiê: Produtividade com fotos separadas por Antes/Depois." color="bg-emerald-500" onClick={() => generatePDF(true)} disabled={loading} />
        <ReportCard icon={<FileArchive size={28} />} title="Acervo Fotográfico (ZIP)" desc="Arquivos originais organizados em pastas (Contrato/Medição/Rua)." color="bg-amber-500" onClick={generateZip} disabled={loading} />
      </div>

      {loading && (
        <div className="fixed inset-0 z-[3000] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center p-10 text-center">
          <div className="bg-blue-600 p-6 rounded-[40px] shadow-2xl shadow-blue-200 mb-6"><Loader2 className="animate-spin text-white" size={48} /></div>
          <h4 className="text-xl font-black text-slate-800 uppercase mb-2">Processando Documento</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">{progress || 'Aguarde...'}</p>
        </div>
      )}
    </div>
  );
};

const ReportCard = ({ icon, title, desc, color, onClick, disabled }: { icon: any, title: string, desc: string, color: string, onClick: () => void, disabled: boolean }) => (
  <button onClick={onClick} disabled={disabled} className="w-full bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex items-center gap-5 active:scale-[0.98] transition-all text-left group disabled:opacity-50">
    <div className={`${color} text-white p-5 rounded-3xl shadow-lg group-hover:scale-110 transition-transform`}>{icon}</div>
    <div className="flex-1">
      <h4 className="font-black text-slate-800 text-sm uppercase leading-none mb-1">{title}</h4>
      <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">{desc}</p>
    </div>
    <ChevronRight size={20} className="text-slate-300" />
  </button>
);

export default RelatoriosView;
