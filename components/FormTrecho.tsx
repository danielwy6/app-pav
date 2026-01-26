
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { Trecho, Profissional, Rua, FotoEvidencia, ServicoComplementar, TipoServico } from '../types';
import L from 'leaflet';
import { 
  Camera, 
  MapPin, 
  Loader2, 
  Save, 
  X, 
  Map as MapIcon, 
  Satellite, 
  Ruler, 
  UserPlus, 
  Check,
  Trash2,
  Wrench,
  PlusCircle,
  RotateCcw
} from 'lucide-react';

interface FormTrechoProps {
  ruaId: string;
  id?: string;
  onSave: () => void;
  onCancel: () => void;
}

const FormTrecho: React.FC<FormTrechoProps> = ({ ruaId, id, onSave, onCancel }) => {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [rua, setRua] = useState<Rua | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  
  const [showNewProForm, setShowNewProForm] = useState(false);
  const [newProNome, setNewProNome] = useState('');
  const [savingPro, setSavingPro] = useState(false);
  
  const [fotosAntes, setFotosAntes] = useState<FotoEvidencia[]>([]);
  const [fotosDepois, setFotosDepois] = useState<FotoEvidencia[]>([]);
  
  // Serviços Adicionais
  const [servicosAdicionais, setServicosAdicionais] = useState<{tipo: TipoServico, quantidade: number}[]>([]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerInstance = useRef<L.Marker | null>(null);
  
  const fileInputAntesRef = useRef<HTMLInputElement>(null);
  const fileInputDepoisRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Trecho>>({
    ruaId, comprimento: 0, larguraMedia: 0, area: 0, profissionalId: '', latitude: -4.1017, longitude: -38.4897, observacoes: ''
  });

  const currentArea = (Number(formData.comprimento || 0) * Number(formData.larguraMedia || 0));

  useEffect(() => {
    loadInitialData();
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [id, ruaId]);

  const loadInitialData = async () => {
    const [proList, ruaData] = await Promise.all([
      db.getAll<Profissional>('profissionais'),
      db.getById<Rua>('ruas', ruaId)
    ]);
    setProfissionais(proList.filter(p => p.status === 'Ativo'));
    if (ruaData) setRua(ruaData);

    if (id) {
      const existing = await db.getById<Trecho>('trechos', id);
      if (existing) {
        setFormData(existing);
        setFotosAntes(existing.fotos?.filter(f => f.tipo === 'Antes') || []);
        setFotosDepois(existing.fotos?.filter(f => f.tipo === 'Depois') || []);
        
        // Carregar serviços vinculados a este trecho
        const allServicos = await db.getAll<ServicoComplementar>('servicos');
        const trechoServicos = allServicos.filter(s => s.trechoId === id);
        setServicosAdicionais(trechoServicos.map(s => ({ tipo: s.tipo, quantidade: s.quantidade })));
        
        initMap(existing.latitude, existing.longitude);
      }
    } else {
      navigator.geolocation.getCurrentPosition(
          (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
              initMap(lat, lng);
          },
          () => { initMap(-4.1017, -38.4897); },
          { enableHighAccuracy: true }
      );
    }
  };

  const handleQuickSavePro = async () => {
    if (!newProNome.trim()) return;
    setSavingPro(true);
    try {
      const newPro: Profissional = {
        id: crypto.randomUUID(),
        nome: newProNome.toUpperCase(),
        status: 'Ativo',
        isDirty: true
      };
      await db.save('profissionais', newPro);
      const updatedList = await db.getAll<Profissional>('profissionais');
      setProfissionais(updatedList.filter(p => p.status === 'Ativo'));
      setFormData(prev => ({ ...prev, profissionalId: newPro.id }));
      setNewProNome('');
      setShowNewProForm(false);
    } catch (err) {
      alert("Erro ao salvar profissional.");
    } finally {
      setSavingPro(false);
    }
  };

  const initMap = (lat: number, lng: number) => {
    if (!mapContainerRef.current || mapInstance.current) return;
    mapInstance.current = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView([lat, lng], 19);
    updateTileLayer();
    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #2563eb; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    markerInstance.current = L.marker([lat, lng], { icon: customIcon, draggable: true }).addTo(mapInstance.current);
    markerInstance.current.on('dragend', (e: any) => {
      const { lat, lng } = e.target.getLatLng();
      setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
    });
  };

  const updateTileLayer = () => {
    if (!mapInstance.current) return;
    mapInstance.current.eachLayer((layer) => { if (layer instanceof L.TileLayer) mapInstance.current?.removeLayer(layer); });
    if (mapType === 'street') { L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapInstance.current); }
    else { L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(mapInstance.current); }
  };

  useEffect(() => { updateTileLayer(); }, [mapType]);

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'Antes' | 'Depois') => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const novaFoto: FotoEvidencia = {
          id: crypto.randomUUID(), base64: reader.result as string, tipo: tipo, data: new Date().toLocaleDateString('pt-BR'), hora: new Date().toLocaleTimeString('pt-BR')
        };
        if (tipo === 'Antes') setFotosAntes(prev => [...prev, novaFoto]);
        else setFotosDepois(prev => [...prev, novaFoto]);
      };
      reader.readAsDataURL(file);
    });
  };

  const addServico = (tipo: TipoServico) => {
    setServicosAdicionais(prev => [...prev, { tipo, quantidade: 0 }]);
  };

  const updateServicoQtd = (index: number, qtd: number) => {
    const newServs = [...servicosAdicionais];
    newServs[index].quantidade = qtd;
    setServicosAdicionais(newServs);
  };

  const removeServico = (index: number) => {
    setServicosAdicionais(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.profissionalId) return alert("Selecione o profissional.");
    setLoading(true);
    try {
      const trechoId = id || crypto.randomUUID();
      const trecho: Trecho = {
        id: trechoId,
        ruaId: formData.ruaId!,
        latitude: formData.latitude!,
        longitude: formData.longitude!,
        data: formData.data || new Date().toLocaleDateString('pt-BR'),
        hora: formData.hora || new Date().toLocaleTimeString('pt-BR'),
        comprimento: Number(formData.comprimento),
        larguraMedia: Number(formData.larguraMedia),
        area: currentArea,
        fotos: [...fotosAntes, ...fotosDepois],
        profissionalId: formData.profissionalId!,
        observacoes: formData.observacoes,
        isDirty: true
      };
      await db.save('trechos', trecho);

      // Salvar serviços complementares vinculados
      // Primeiro, se for edição, removemos os serviços antigos deste trecho
      if (id) {
        const allServs = await db.getAll<ServicoComplementar>('servicos');
        const toDelete = allServs.filter(s => s.trechoId === id);
        for (const s of toDelete) await db.delete('servicos', s.id);
      }

      for (const s of servicosAdicionais) {
        if (s.quantidade > 0) {
          const servico: ServicoComplementar = {
            id: crypto.randomUUID(),
            ruaId: formData.ruaId!,
            trechoId: trechoId,
            tipo: s.tipo,
            quantidade: s.quantidade,
            data: trecho.data,
            hora: trecho.hora,
            isDirty: true
          };
          await db.save('servicos', servico);
        }
      }

      onSave();
    } catch (err) { alert("Erro ao salvar."); } finally { setLoading(false); }
  };

  return (
    <div className="pb-16 space-y-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden relative">
        <div ref={mapContainerRef} className="h-64 w-full bg-slate-100 z-0"></div>
        <button type="button" onClick={() => setMapType(mapType === 'street' ? 'satellite' : 'street')} className="absolute top-4 right-4 z-[1000] bg-white/90 p-3 rounded-2xl shadow-lg border border-slate-200">
          {mapType === 'street' ? <Satellite size={20} /> : <MapIcon size={20} />}
        </button>
      </div>

      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase opacity-50 mb-1">Área Calculada</p>
          <h2 className="text-4xl font-black">{currentArea.toFixed(2)} m²</h2>
        </div>
        <div className="bg-blue-600 p-4 rounded-2xl shadow-lg">
          <Ruler size={28} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Comp. (m)</label>
            <input type="number" step="0.01" className="w-full p-4 bg-slate-50 border rounded-xl font-black text-xl outline-none" value={formData.comprimento || ''} onChange={e => setFormData(prev => ({ ...prev, comprimento: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Larg. (m)</label>
            <input type="number" step="0.01" className="w-full p-4 bg-slate-50 border rounded-xl font-black text-xl outline-none" value={formData.larguraMedia || ''} onChange={e => setFormData(prev => ({ ...prev, larguraMedia: Number(e.target.value) }))} />
          </div>
        </div>

        {/* SEÇÃO SERVIÇOS ADICIONAIS */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Wrench size={16} className="text-blue-600" /> Serviços Adicionais (Meio-fio)
                </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => addServico('RETIRADA_MEIO_FIO')} className="p-3 bg-amber-50 text-amber-600 rounded-xl font-bold text-[9px] uppercase flex items-center justify-center gap-2 border border-amber-100">
                    <RotateCcw size={14} /> Retirada
                </button>
                <button type="button" onClick={() => addServico('ASSENTAMENTO_MEIO_FIO')} className="p-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-[9px] uppercase flex items-center justify-center gap-2 border border-blue-100">
                    <PlusCircle size={14} /> Assentamento
                </button>
            </div>

            {servicosAdicionais.length > 0 && (
                <div className="space-y-3 pt-2">
                    {servicosAdicionais.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <div className={`p-2 rounded-lg ${s.tipo === 'RETIRADA_MEIO_FIO' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                {s.tipo === 'RETIRADA_MEIO_FIO' ? <RotateCcw size={16} /> : <PlusCircle size={16} />}
                            </div>
                            <div className="flex-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">
                                    {s.tipo === 'RETIRADA_MEIO_FIO' ? 'Retirada (m)' : 'Assentamento (m)'}
                                </p>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    className="w-full bg-transparent font-black text-slate-800 outline-none"
                                    placeholder="0.00"
                                    value={s.quantidade || ''}
                                    onChange={(e) => updateServicoQtd(idx, Number(e.target.value))}
                                />
                            </div>
                            <button type="button" onClick={() => removeServico(idx)} className="p-2 text-slate-300 hover:text-red-500">
                                <X size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SEÇÃO ANTES */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase flex justify-between tracking-widest">
                  ESTADO ANTES 
                  <span className={`px-2 rounded-full ${fotosAntes.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                    {fotosAntes.length} FOTO(S)
                  </span>
                </label>
                
                <button type="button" onClick={() => fileInputAntesRef.current?.click()} className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-3 border-2 border-dashed border-slate-200 active:scale-95 active:bg-slate-200 transition-all">
                  <Camera size={18} /> Adicionar Antes
                </button>
                <input type="file" ref={fileInputAntesRef} className="hidden" accept="image/*" capture="environment" multiple onChange={(e) => handleAddPhoto(e, 'Antes')} />
                
                {fotosAntes.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {fotosAntes.map(f => (
                      <div key={f.id} className="relative aspect-square rounded-xl overflow-hidden shadow-sm border border-slate-100 group">
                        <img src={f.base64} className="w-full h-full object-cover" alt="Antes" />
                        <button 
                          type="button" 
                          onClick={() => setFotosAntes(prev => prev.filter(x => x.id !== f.id))}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg opacity-90 active:scale-90"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* SEÇÃO DEPOIS */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase flex justify-between tracking-widest">
                  ESTADO DEPOIS 
                  <span className={`px-2 rounded-full ${fotosDepois.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {fotosDepois.length} FOTO(S)
                  </span>
                </label>

                <button type="button" onClick={() => fileInputDepoisRef.current?.click()} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-3 shadow-lg shadow-blue-100 active:scale-95 active:bg-blue-700 transition-all">
                  <Camera size={18} /> Adicionar Depois
                </button>
                <input type="file" ref={fileInputDepoisRef} className="hidden" accept="image/*" capture="environment" multiple onChange={(e) => handleAddPhoto(e, 'Depois')} />
                
                {fotosDepois.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {fotosDepois.map(f => (
                      <div key={f.id} className="relative aspect-square rounded-xl overflow-hidden shadow-sm border border-slate-100 group">
                        <img src={f.base64} className="w-full h-full object-cover" alt="Depois" />
                        <button 
                          type="button" 
                          onClick={() => setFotosDepois(prev => prev.filter(x => x.id !== f.id))}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg opacity-90 active:scale-90"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
            </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-200 space-y-4 shadow-sm">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações Técnicas</label>
            <textarea 
              className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold text-slate-700 h-32 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" 
              placeholder="Descreva detalhes da execução..."
              value={formData.observacoes}
              onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))}
            />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end ml-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Profissional Responsável</label>
            <button 
              type="button" 
              onClick={() => setShowNewProForm(!showNewProForm)}
              className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest active:scale-90"
            >
              <UserPlus size={14} /> Novo Profissional
            </button>
          </div>

          {showNewProForm && (
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-2 animate-in fade-in slide-in-from-top-2">
              <input 
                className="flex-1 p-3 bg-white border border-blue-200 rounded-xl font-bold uppercase text-xs outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="NOME DO PROFISSIONAL"
                value={newProNome}
                onChange={e => setNewProNome(e.target.value)}
              />
              <button 
                type="button"
                onClick={handleQuickSavePro}
                disabled={savingPro || !newProNome}
                className="bg-blue-600 text-white p-3 rounded-xl shadow-lg active:scale-90 transition-all disabled:opacity-50"
              >
                {savingPro ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
              </button>
            </div>
          )}

          <select required className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" value={formData.profissionalId} onChange={e => setFormData(prev => ({ ...prev, profissionalId: e.target.value }))}>
            <option value="">Selecione o Profissional...</option>
            {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>

        <div className="flex gap-4">
          <button type="button" onClick={onCancel} className="flex-1 py-5 bg-white text-slate-500 font-bold rounded-2xl border active:bg-slate-50 transition-colors uppercase text-xs tracking-widest">Cancelar</button>
          <button type="submit" disabled={loading} className="flex-[1.8] py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 flex items-center justify-center gap-2 active:scale-95 active:bg-blue-700 transition-all disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} SALVAR TRECHO
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormTrecho;
