
import { Contrato, Medicao, Rua, Trecho, Profissional, ServicoComplementar } from './types';

const DB_NAME = 'PavInspectDB_v3';
const DB_VERSION = 1;

class Database {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const stores = ['contratos', 'medicoes', 'ruas', 'trechos', 'profissionais', 'servicos'];
        stores.forEach(s => {
          if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
        });
      };
    });
  }

  private async getStore(name: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    await this.init();
    const tx = this.db!.transaction(name, mode);
    return tx.objectStore(name);
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const store = await this.getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getById<T>(storeName: string, id: string): Promise<T | undefined> {
    const store = await this.getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async save<T>(storeName: string, data: T, markAsSynced = false): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    const enrichedData = {
      ...(data as any),
      isDirty: !markAsSynced,
      updatedAt: new Date().toISOString()
    };
    return new Promise((resolve, reject) => {
      const request = store.put(enrichedData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteRuaCascade(ruaId: string): Promise<void> {
    const trechos = await this.getAll<Trecho>('trechos');
    for (const t of trechos.filter(x => x.ruaId === ruaId)) await this.delete('trechos', t.id);
    const servicos = await this.getAll<ServicoComplementar>('servicos');
    for (const s of servicos.filter(x => x.ruaId === ruaId)) await this.delete('servicos', s.id);
    await this.delete('ruas', ruaId);
  }

  async deleteMedicaoCascade(medicaoId: string): Promise<void> {
    const ruas = await this.getAll<Rua>('ruas');
    for (const r of ruas.filter(x => x.medicaoId === medicaoId)) await this.deleteRuaCascade(r.id);
    await this.delete('medicoes', medicaoId);
  }

  async deleteContratoCascade(contratoId: string): Promise<void> {
    const medicoes = await this.getAll<Medicao>('medicoes');
    for (const m of medicoes.filter(x => x.contratoId === contratoId)) await this.deleteMedicaoCascade(m.id);
    await this.delete('contratos', contratoId);
  }

  async getDirty<T>(storeName: string): Promise<T[]> {
    const items = await this.getAll<any>(storeName);
    return items.filter(i => i.isDirty) as T[];
  }

  async exportAllData(): Promise<string> {
    const stores = ['contratos', 'medicoes', 'ruas', 'trechos', 'profissionais', 'servicos'];
    const exportData: any = {};
    for (const s of stores) exportData[s] = await this.getAll(s);
    return JSON.stringify(exportData);
  }

  async importAllData(json: string): Promise<void> {
    const data = JSON.parse(json);
    const stores = ['contratos', 'medicoes', 'ruas', 'trechos', 'profissionais', 'servicos'];
    for (const s of stores) {
      if (data[s] && Array.isArray(data[s])) {
        const store = await this.getStore(s, 'readwrite');
        for (const item of data[s]) {
          await new Promise<void>((resolve, reject) => {
            // Ao importar, mantemos o ID mas marcamos como dirty para garantir que o novo aparelho tente sincronizar se necessário
            const request = store.put({ ...item, isDirty: item.isDirty ?? true });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      }
    }
  }
}

export const db = new Database();
