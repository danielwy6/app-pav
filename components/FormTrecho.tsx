
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { Trecho, Profissional, Rua, FotoEvidencia } from '../types';
import L from 'leaflet';
import { Camera, MapPin, Loader2, Save, X, Info, Map as MapIcon, Satellite, ArrowRight, Ruler, Plus, UserPlus } from 'lucide-react';

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
  
  // Estado para o mini-formulário de novo profissional
  const [showNewProForm, setShowNewProForm] = useState(false);
  const [newProData, setNewProData] = useState({ nome: '', apelido: '', telefone: '' });
  const [savingPro, setSavingPro] = useState(false);
  
  // Fotos separadas
  const [fotosAntes, setFotosAntes] = useState<FotoEvidencia[]>([]);
  const [fotosDepois, setFotosDepois] = useState<FotoEvidencia[]>([]);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerInstance = useRef<L.Marker | null>(null);
  
  const fileInputAntesRef = useRef<HTMLInputElement>(null);
  const fileInputDepoisRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Trecho>>({
    ruaId, comprimento: 0, larguraMedia: 0, area: 0, profissionalId: '', latitude: -5.79448, longitude: -35.211,
  });

  // Cálculo de área em tempo real
  const currentArea = (Number(formData.comprimento || 0) * Number(formData.larguraMedia || 0));

  useEffect(() => {
    loadInitialData();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
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
        if (!mapInstance.current) initMap(existing.latitude, existing.longitude);
      }
    } else {
      navigator.geolocation.getCurrentPosition(
          (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              setFormData(prev => ({ 
                ...prev, 
                latitude: lat, 
                longitude: lng, 
                data: new Date().toLocaleDateString('pt-BR'), 
                hora: new Date().toLocaleTimeString('pt-BR') 
              }));
              if (!mapInstance.current) initMap(lat, lng);
          },
          () => { if (!mapInstance.current) initMap(-5.79448, -35.211); },
          { enableHighAccuracy: true }
      );
    }
  };

  const initMap = (lat: number, lng: number) => {
    if (!mapContainerRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([lat, lng], 19);

    updateTileLayer();

    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #2563eb; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    markerInstance.current = L.marker([lat, lng], { 
      icon: customIcon,
      draggable: true 
    }).addTo(mapInstance.current);

    markerInstance.current.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
    });
  };

  const updateTileLayer = () => {
    if (!mapInstance.current) return;
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) mapInstance.current?.removeLayer(layer);
    });
    if (mapType === 'street') {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapInstance.current);
    } else {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(mapInstance.current);
    }
  };

  useEffect(() => {
    updateTileLayer();
  }, [mapType]);

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'Antes' | 'Depois') => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const novaFoto: FotoEvidencia = {
          id: crypto.randomUUID(), 
          base64: reader.result as string, 
          tipo: tipo, 
          data: new Date().toLocaleDateString('pt-BR'), 
          hora: new Date().toLocaleTimeString('pt-BR')
        };
        if (tipo === 'Antes') setFotosAntes(prev => [...prev, novaFoto]);
        else setFotosDepois(prev => [...prev, novaFoto]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveNewProfissional = async () => {
    if (!newProData.nome) return alert("Informe o nome do profissional.");
    setSavingPro(true);
    try {
      const pro: Profissional = {
        id: crypto.randomUUID(),
        nome: newProData.nome,
        apelido: newProData.apelido,
        telefone: newProData.telefone,
        status: 'Ativo',
        isDirty: true
      };
      await db.save('profissionais', pro);
      
      const updatedList = await db.getAll<Profissional>('profissionais');
      setProfissionais(updatedList.filter(p => p.status === 'Ativo'));
      setFormData(prev => ({ ...prev, profissionalId: pro.id }));
      
      setNewProData({ nome: '', apelido: '', telefone: '' });
      setShowNewProForm(false);
    } catch (err) {
      alert("Erro ao cadastrar profissional.");
    } finally {
      setSavingPro(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.profissionalId) return alert("Selecione o profissional responsável.");
    
    setLoading(true);
    try {
      const todosOsTrechos: FotoEvidencia[] = [...fotosAntes, ...fotosDepois];
      const trecho: Trecho = {
        id: id || crypto.randomUUID(),
        ruaId: formData.ruaId!,
        latitude: formData.latitude!,
        longitude: formData.longitude!,
        data: formData.data || new Date().toLocaleDateString('pt-BR'),
        hora: formData.hora || new Date().toLocaleTimeString('pt-BR'),
        comprimento: Number(formData.comprimento),
        larguraMedia: Number(formData.larguraMedia),
        area: currentArea,
        fotos: todosOsTrechos,
        profissionalId: formData.profissionalId!,
        isDirty: true
      };
      await db.save('trechos', trecho);
      onSave();
    } catch (err) { alert("Erro ao salvar."); } finally { setLoading(false); }
  };

  return (
    <div className="pb-16 space-y-6">
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden relative">
        <div ref={mapContainerRef} className="h-64 w-full bg-slate-100 z-0"></div>
        <button 
          type="button"
          onClick={() => setMapType(mapType === 'street' ? 'satellite' : 'street')} 
          className="absolute top-4 right-4 z-[1000] bg-white/90 p-3 rounded-2xl shadow-lg border border-slate-200"
        >
          {mapType === 'street' ? <Satellite size={20} /> : <MapIcon size={20} />}
        </button>
        <div className="p-4 bg-blue-50 flex items-center gap-2 border-t border-blue-100">
           <Info size={14} className="text-blue-500" />
           <p className="text-[10px] text-blue-700 font-bold uppercase tracking-tight">Pressione e arraste o ponto azul</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Cálculo de Área</p>
          <h2 className="text-4xl font-black">{currentArea.toFixed(2)} m²</h2>
        </div>
        <div className="bg-blue-600 p-4 rounded-2xl shadow-lg">
          <Ruler size={28} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Comprimento (m)</label>
            <input 
              type="number" 
              step="0.01" 
              className="w-full p-4 bg-slate-50 border rounded-xl font-black text-xl outline-none focus:ring-2 focus:ring-blue-500" 
              value={formData.comprimento || ''} 
              onChange={e => setFormData(prev => ({ ...prev, comprimento: Number(e.target.value) }))} 
              placeholder="0.00" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Largura Média (m)</label>
            <input 
              type="number" 
              step="0.01" 
              className="w-full p-4 bg-slate-50 border rounded-xl font-black text-xl outline-none focus:ring-2 focus:ring-blue-500" 
              value={formData.larguraMedia || ''} 
              onChange={e => setFormData(prev => ({ ...prev, larguraMedia: Number(e.target.value) }))} 
              placeholder="0.00" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-tight flex justify-between">
                    Evidência ANTES
                    <span className="text-blue-500">{fotosAntes.length}</span>
                </label>
                <button 
                    type="button" 
                    onClick={() => fileInputAntesRef.current?.click()} 
                    className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 border-2 border-dashed border-slate-300 active:scale-95 transition-all"
                >
                    <Camera size={18} className="text-blue-600" /> Capturar Foto (ANTES)
                </button>
                <input type="file" ref={fileInputAntesRef} className="hidden" accept="image/*" capture="environment" multiple onChange={(e) => handleAddPhoto(e, 'Antes')} />
                
                {fotosAntes.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                    {fotosAntes.map((f) => (
                        <div key={f.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                            <img src={f.base64} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setFotosAntes(p => p.filter(x => x.id !== f.id))} className="absolute top-0.5 right-0.5 bg-red-500 text-white p-1 rounded-md"><X size={10} /></button>
                        </div>
                    ))}
                    </div>
                )}
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-tight flex justify-between">
                    Evidência DEPOIS
                    <span className="text-emerald-500">{fotosDepois.length}</span>
                </label>
                <button 
                    type="button" 
                    onClick={() => fileInputDepoisRef.current?.click()} 
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                >
                    <Camera size={18} className="text-blue-200" /> Capturar Foto (DEPOIS)
                </button>
                <input type="file" ref={fileInputDepoisRef} className="hidden" accept="image/*" capture="environment" multiple onChange={(e) => handleAddPhoto(e, 'Depois')} />
                
                {fotosDepois.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                    {fotosDepois.map((f) => (
                        <div key={f.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                            <img src={f.base64} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setFotosDepois(p => p.filter(x => x.id !== f.id))} className="absolute top-0.5 right-0.5 bg-red-500 text-white p-1 rounded-md"><X size={10} /></button>
                        </div>
                    ))}
                    </div>
                )}
            </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
             <label className="block text-xs font-bold text-slate-500 uppercase">Profissional Responsável</label>
             <button 
                type="button"
                onClick={() => setShowNewProForm(!showNewProForm)}
                className="text-xs font-black text-blue-600 uppercase flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full"
             >
                {showNewProForm ? <X size={14} /> : <UserPlus size={14} />}
                {showNewProForm ? 'Cancelar' : 'Novo Profissional'}
             </button>
          </div>

          {!showNewProForm ? (
            <select 
              required
              className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" 
              value={formData.profissionalId} 
              onChange={e => setFormData(prev => ({ ...prev, profissionalId: e.target.value }))}
            >
              <option value="">Selecione o Profissional...</option>
              {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome} {p.apelido ? `(${p.apelido})` : ''}</option>)}
            </select>
          ) : (
            <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100 space-y-4 animate-in slide-in-from-top-2">
               <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <input 
                      className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none text-sm font-bold" 
                      placeholder="Nome Completo"
                      value={newProData.nome}
                      onChange={e => setNewProData(p => ({ ...p, nome: e.target.value }))}
                    />
                  </div>
                  <div>
                    <input 
                      className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none text-[10px] font-bold" 
                      placeholder="Apelido"
                      value={newProData.apelido}
                      onChange={e => setNewProData(p => ({ ...p, apelido: e.target.value }))}
                    />
                  </div>
                  <div>
                    <input 
                      className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none text-[10px] font-bold" 
                      placeholder="Telefone"
                      value={newProData.telefone}
                      onChange={e => setNewProData(p => ({ ...p, telefone: e.target.value }))}
                    />
                  </div>
               </div>
               <button 
                type="button"
                onClick={handleSaveNewProfissional}
                disabled={savingPro}
                className="w-full py-3 bg-blue-600 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-md flex items-center justify-center gap-2"
               >
                 {savingPro ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                 Cadastrar e Selecionar
               </button>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button type="button" onClick={onCancel} className="flex-1 py-5 bg-white text-slate-500 font-bold rounded-2xl border">Cancelar</button>
          <button type="submit" disabled={loading} className="flex-[1.8] py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
            {loading ? <Loader2 className="animate-spin" /> : <Save />} SALVAR MEDIÇÃO
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormTrecho;
