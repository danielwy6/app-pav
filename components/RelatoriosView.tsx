
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Contrato, Medicao, Rua, Trecho, Profissional, ServicoComplementar } from '../types';
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

type ReportType = 'FOTOS_ZIP' | 'PRODUTIVIDADE_PDF' | 'COMPLETO_PDF';

const RelatoriosView: React.FC = () => {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [ruas, setRuas] = useState<Rua[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  
  const [selContrato, setSelContrato] = useState<string>('TODOS');
  const [selMedicao, setSelMedicao] = useState<string>('TODOS');
  const [selRua, setSelRua] = useState<string>('TODOS');
  const [selProfissional, setSelProfissional] = useState<string>('TODOS');
  
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
    const allServicos = await db.getAll<ServicoComplementar>('servicos');
    const allRuas = await db.getAll<Rua>('ruas');
    const allMeds = await db.getAll<Medicao>('medicoes');
    const allContratos = await db.getAll<Contrato>('contratos');

    let filteredTrechos = allTrechos;

    if (selContrato !== 'TODOS') {
      const medsIds = allMeds.filter(m => m.contratoId === selContrato).map(m => m.id);
      const ruasIds = allRuas.filter(r => medsIds.includes(r.medicaoId)).map(r => r.id);
      filteredTrechos = filteredTrechos.filter(t => ruasIds.includes(t.ruaId));
    }
    if (selMedicao !== 'TODOS') {
      const ruasIds = allRuas.filter(r => r.medicaoId === selMedicao).map(r => r.id);
      filteredTrechos = filteredTrechos.filter(t => ruasIds.includes(t.ruaId));
    }
    if (selRua !== 'TODOS') {
      filteredTrechos = filteredTrechos.filter(t => t.ruaId === selRua);
    }
    if (selProfissional !== 'TODOS') {
      filteredTrechos = filteredTrechos.filter(t => t.profissionalId === selProfissional);
    }

    // Filtrar serviços também
    const trechosIds = filteredTrechos.map(t => t.id);
    const filteredServicos = allServicos.filter(s => s.trechoId && trechosIds.includes(s.trechoId));

    return { trechos: filteredTrechos, contratos: allContratos, medicoes: allMeds, ruas: allRuas, servicos: filteredServicos };
  };

  const generateZip = async () => {
    setLoading(true);
    setProgress('Organizando pastas e fotos...');
    try {
      const { trechos, contratos: cList, medicoes: mList, ruas: rList } = await getFilteredData();
      const zip = new JSZip();

      for (const t of trechos) {
        const rua = rList.find(r => r.id === t.ruaId);
        const med = mList.find(m => m.id === rua?.medicaoId);
        const con = cList.find(c => c.id === med?.contratoId);

        const path = `${con?.numero || 'Sem_Contrato'}/Med_${med?.numero || 'Sem_Medicao'}/${rua?.nome || 'Rua_N_I'}/Trecho_${t.id.substring(0, 5)}`;
        
        const trechoFolder = zip.folder(path);
        const antesFolder = trechoFolder?.folder("Antes");
        const depoisFolder = trechoFolder?.folder("Depois");

        t.fotos.forEach((f, i) => {
          const folder = f.tipo === 'Antes' ? antesFolder : depoisFolder;
          const data = f.base64.split(',')[1];
          folder?.file(`foto_${i+1}.jpg`, data, { base64: true });
        });
      }

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `RELATORIO_FOTOS_PAVINSPECT_${new Date().getTime()}.zip`;
      link.click();
    } catch (e) { alert("Erro ao gerar ZIP"); }
    setLoading(false);
  };

  const generatePDF = async (includePhotos: boolean) => {
    setLoading(true);
    setProgress(includePhotos ? 'Gerando PDF com fotos...' : 'Gerando produtividade técnica...');
    try {
      const { trechos, contratos: cList, medicoes: mList, ruas: rList, servicos: sList } = await getFilteredData();
      const doc = new jsPDF();
      let y = 20;

      const header = () => {
        doc.setFontSize(10); doc.setTextColor(100);
        doc.text("PREFEITURA MUNICIPAL DE HORIZONTE - CE", 105, 15, { align: 'center' });
        doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
        doc.text("RELATÓRIO TÉCNICO DE FISCALIZAÇÃO", 105, 23, { align: 'center' });
        doc.setDrawColor(200); doc.setLineWidth(0.2); doc.line(20, 28, 190, 28);
        y = 38;
      };

      header();

      const groupedData: any = {};
      trechos.forEach(t => {
        const rua = rList.find(r => r.id === t.ruaId);
        const med = mList.find(m => m.id === rua?.medicaoId);
        const con = cList.find(c => c.id === med?.contratoId);
        const pro = profissionais.find(p => p.id === t.profissionalId);
        const trechoServicos = sList.filter(s => s.trechoId === t.id);

        const conKey = con?.id || 'none';
        const medKey = med?.id || 'none';
        const ruaKey = rua?.id || 'none';
        const proKey = pro?.id || 'none';

        if (!groupedData[conKey]) groupedData[conKey] = { obj: con, meds: {}, total: 0 };
        if (!groupedData[conKey].meds[medKey]) groupedData[conKey].meds[medKey] = { obj: med, ruas: {}, total: 0 };
        if (!groupedData[conKey].meds[medKey].ruas[ruaKey]) groupedData[conKey].meds[medKey].ruas[ruaKey] = { obj: rua, pros: {}, total: 0 };
        if (!groupedData[conKey].meds[medKey].ruas[ruaKey].pros[proKey]) groupedData[conKey].meds[medKey].ruas[ruaKey].pros[proKey] = { obj: pro, trechos: [], total: 0, totalRet: 0, totalAss: 0 };
        
        groupedData[conKey].meds[medKey].ruas[ruaKey].pros[proKey].trechos.push({ ...t, servicos: trechoServicos });
        
        // Somar serviços do fiscal na rua
        trechoServicos.forEach(s => {
            if (s.tipo === 'RETIRADA_MEIO_FIO') groupedData[conKey].meds[medKey].ruas[ruaKey].pros[proKey].totalRet += s.quantidade;
            else groupedData[conKey].meds[medKey].ruas[ruaKey].pros[proKey].totalAss += s.quantidade;
        });

        groupedData[conKey].meds[medKey].ruas[ruaKey].pros[proKey].total += t.area;
        groupedData[conKey].meds[medKey].ruas[ruaKey].total += t.area;
        groupedData[conKey].meds[medKey].total += t.area;
        groupedData[conKey].total += t.area;
      });

      for (const cId in groupedData) {
        const con = groupedData[cId];
        doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.8); doc.line(20, y-6, 190, y-6);
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(37, 99, 235);
        doc.text(`CONTRATO: ${con.obj?.numero || 'N/A'}`, 20, y);
        doc.text(`TOTAL CONTRATO: ${con.total.toFixed(2)} m²`, 190, y, { align: 'right' });
        y += 12;

        for (const mId in con.meds) {
          const med = con.meds[mId];
          doc.setDrawColor(180); doc.setLineWidth(0.4); doc.line(25, y-6, 190, y-6);
          doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(80);
          doc.text(`MEDIÇÃO: ${med.obj?.numero || 'N/A'} (${med.obj?.periodo || 'N/A'})`, 25, y);
          doc.text(`Subtotal Med.: ${med.total.toFixed(2)} m²`, 190, y, { align: 'right' });
          y += 10;

          for (const rId in med.ruas) {
            const rua = med.ruas[rId];
            const tipoDesc = rua.obj?.tipoIntervencao === 'NOVA' ? '[PAVIMENTAÇÃO NOVA]' : '[RECUPERAÇÃO]';
            
            doc.setDrawColor(220); doc.setLineWidth(0.2); doc.line(30, y-5, 190, y-5);
            doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
            doc.text(`LOGRADOURO: ${rua.obj?.nome || 'N/A'} ${tipoDesc}`, 30, y);
            y += 8;

            for (const pId in rua.pros) {
              const pro = rua.pros[pId];
              doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(60, 60, 60);
              doc.text(`FISCAL: ${pro.obj?.nome || 'NÃO INFORMADO'}`, 35, y);
              y += 5;

              for (const t of pro.trechos) {
                if (y > 270) { doc.addPage(); header(); }
                doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100);
                doc.text(`   - Trecho ${t.comprimento}m x ${t.larguraMedia}m = ${t.area.toFixed(2)} m² (Data: ${t.data})`, 38, y);
                y += 4;

                // Listar serviços do trecho
                if (t.servicos && t.servicos.length > 0) {
                    doc.setFont("helvetica", "italic"); doc.setFontSize(7);
                    t.servicos.forEach((s: any) => {
                        const sLabel = s.tipo === 'RETIRADA_MEIO_FIO' ? 'Retirada Meio-fio' : 'Assentamento Meio-fio';
                        doc.text(`     [Serviço] ${sLabel}: ${s.quantidade.toFixed(2)} metros`, 42, y);
                        y += 4;
                    });
                    doc.setFont("helvetica", "normal");
                } else {
                    y += 1;
                }

                if (includePhotos && t.fotos && t.fotos.length > 0) {
                  y += 2;
                  let xImg = 45;
                  for (const f of t.fotos.slice(0, 4)) {
                    try {
                      doc.addImage(f.base64, 'JPEG', xImg, y, 32, 32);
                      doc.setFontSize(6); doc.text(f.tipo, xImg, y + 35);
                      xImg += 36;
                    } catch(e) {}
                  }
                  y += 42;
                  if (y > 270) { doc.addPage(); header(); }
                }
              }
              // Subtotal do Profissional
              doc.setFontSize(8); doc.setFont("helvetica", "bolditalic"); doc.setTextColor(120);
              let servsInfo = '';
              if (pro.totalRet > 0) servsInfo += ` | Retirada: ${pro.totalRet.toFixed(2)}m`;
              if (pro.totalAss > 0) servsInfo += ` | Assentamento: ${pro.totalAss.toFixed(2)}m`;
              
              doc.text(`Subtotal do Fiscal: ${pro.total.toFixed(2)} m²${servsInfo}`, 190, y, { align: 'right' });
              y += 8;
              if (y > 270) { doc.addPage(); header(); }
            }
            // Total do Logradouro
            doc.setDrawColor(240); doc.line(30, y-4, 190, y-4);
            doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
            doc.text(`TOTAL LOGRADOURO: ${rua.total.toFixed(2)} m²`, 190, y, { align: 'right' });
            y += 12;
            if (y > 270) { doc.addPage(); header(); }
          }
        }
      }

      doc.save(`RELATORIO_TECNICO_${new Date().getTime()}.pdf`);
    } catch (e) { console.error(e); alert("Erro ao gerar PDF"); }
    setLoading(false);
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tighter uppercase leading-none mb-2">Central de Relatórios</h2>
          <p className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em]">Horizonte • Fiscalização Técnica</p>
        </div>
        <Printer size={120} className="absolute -right-5 -bottom-5 opacity-10 rotate-12" />
      </div>

      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-blue-600 text-white rounded-xl"><Filter size={16} /></div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtros de Pesquisa</h3>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <select 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase"
            value={selContrato}
            onChange={(e) => { setSelContrato(e.target.value); setSelMedicao('TODOS'); setSelRua('TODOS'); }}
          >
            <option value="TODOS">Todos os Contratos</option>
            {contratos.map(c => <option key={c.id} value={c.id}>Contrato {c.numero}</option>)}
          </select>

          <select 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase"
            value={selMedicao}
            onChange={(e) => { setSelMedicao(e.target.value); setSelRua('TODOS'); }}
          >
            <option value="TODOS">Todas as Medições</option>
            {filteredMedicoes.map(m => <option key={m.id} value={m.id}>Medição {m.numero} ({m.periodo})</option>)}
          </select>

          <select 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase"
            value={selRua}
            onChange={(e) => setSelRua(e.target.value)}
          >
            <option value="TODOS">Todas as Ruas</option>
            {filteredRuas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>

          <select 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase"
            value={selProfissional}
            onChange={(e) => setSelProfissional(e.target.value)}
          >
            <option value="TODOS">Todos os Fiscais</option>
            {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Escolha o Tipo de Arquivo</h3>
        
        <ReportCard 
          icon={<FileArchive size={28} />}
          title="Acervo Fotográfico (ZIP)"
          desc="Organiza fotos em subpastas hierárquicas."
          color="bg-amber-500"
          onClick={generateZip}
          disabled={loading}
        />

        <ReportCard 
          icon={<FileText size={28} />}
          title="Produtividade (PDF)"
          desc="Técnico: Agrupamento por fiscal, subtotais e identificação da intervenção."
          color="bg-blue-600"
          onClick={() => generatePDF(false)}
          disabled={loading}
        />

        <ReportCard 
          icon={<ImageIcon size={28} />}
          title="Relatório Completo (PDF + Fotos)"
          desc="Dossiê: Produtividade com fotos de antes e depois por trecho."
          color="bg-emerald-500"
          onClick={() => generatePDF(true)}
          disabled={loading}
        />
      </div>

      {loading && (
        <div className="fixed inset-0 z-[3000] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center p-10 text-center">
          <div className="bg-blue-600 p-6 rounded-[40px] shadow-2xl shadow-blue-200 mb-6">
            <Loader2 className="animate-spin text-white" size={48} />
          </div>
          <h4 className="text-xl font-black text-slate-800 uppercase mb-2">Processando Dados</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
            {progress || 'Aguarde enquanto preparamos seu arquivo técnico...'}
          </p>
        </div>
      )}
    </div>
  );
};

const ReportCard = ({ icon, title, desc, color, onClick, disabled }: { icon: any, title: string, desc: string, color: string, onClick: () => void, disabled: boolean }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className="w-full bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex items-center gap-5 active:scale-[0.98] transition-all text-left group disabled:opacity-50"
  >
    <div className={`${color} text-white p-5 rounded-3xl shadow-lg shadow-slate-100 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <div className="flex-1">
      <h4 className="font-black text-slate-800 text-sm uppercase leading-none mb-1">{title}</h4>
      <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">{desc}</p>
    </div>
    <ChevronRight size={20} className="text-slate-300" />
  </button>
);

export default RelatoriosView;
