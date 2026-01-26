
export interface SyncMetadata {
  isDirty?: boolean;
  lastSyncedAt?: string;
  updatedAt?: string;
}

export interface FotoEvidencia {
  id: string;
  base64: string;
  tipo: 'Antes' | 'Durante' | 'Depois' | 'Geral';
  data: string;
  hora: string;
}

export interface Profissional extends SyncMetadata {
  id: string;
  nome: string;
  apelido?: string;
  telefone?: string;
  status: 'Ativo' | 'Inativo';
}

export interface Contrato extends SyncMetadata {
  id: string;
  numero: string;
}

export interface Medicao extends SyncMetadata {
  id: string;
  contratoId: string;
  numero: string;
  periodo: string;
  observacoes?: string;
}

export type TipoIntervencao = 'NOVA' | 'RECUPERACAO';

export interface Rua extends SyncMetadata {
  id: string;
  medicaoId: string;
  nome: string;
  bairro: string;
  municipio: string;
  latitude?: number;
  longitude?: number;
  fotos?: FotoEvidencia[];
  tipoIntervencao: TipoIntervencao;
}

export type TipoServico = 'RETIRADA_MEIO_FIO' | 'ASSENTAMENTO_MEIO_FIO';

export interface ServicoComplementar extends SyncMetadata {
  id: string;
  ruaId: string;
  trechoId?: string; // Vínculo com o trecho
  tipo: TipoServico;
  quantidade: number;
  data: string;
  hora: string;
  observacoes?: string;
}

export interface Trecho extends SyncMetadata {
  id: string;
  ruaId: string;
  latitude: number;
  longitude: number;
  data: string;
  hora: string;
  comprimento: number;
  larguraMedia: number;
  area: number;
  fotos: FotoEvidencia[];
  profissionalId: string;
  observacoes?: string;
}

export type AppView = 
  | 'DASHBOARD'
  | 'CONTRATOS'
  | 'MEDICOES'
  | 'RUAS'
  | 'TRECHOS'
  | 'SERVICOS'
  | 'PROFISSIONAIS'
  | 'MAPA_GERAL'
  | 'RELATORIOS'
  | 'SYNC'
  | 'FORM_CONTRATO'
  | 'FORM_MEDICAO'
  | 'FORM_RUA'
  | 'FORM_TRECHO'
  | 'FORM_SERVICO'
  | 'FORM_PROFISSIONAL';

export interface AppState {
  view: AppView;
  selectedContratoId?: string;
  selectedMedicaoId?: string;
  selectedRuaId?: string;
  selectedTrechoId?: string;
  editingId?: string;
}
