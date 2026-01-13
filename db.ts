
import { Contrato, Medicao, Rua, Trecho, Profissional, ServicoComplementar } from './types';

const DB_NAME = 'PavInspectDB';
const DB_VERSION = 2;

class Database {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('contratos')) db.createObjectStore('contratos', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('medicoes')) db.createObjectStore('medicoes', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('ruas')) db.createObjectStore('ruas', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('trechos')) db.createObjectStore('trechos', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('profissionais')) db.createObjectStore('profissionais', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('servicos')) db.createObjectStore('servicos', { keyPath: 'id' });
      };
    });
  }

  private async getStore(name: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    if (!this.db) await this.init();
    return this.db!.transaction(name, mode).objectStore(name);
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const store = await this.getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getDirty<T>(storeName: string): Promise<T[]> {
    const all = await this.getAll<T>(storeName);
    return (all as any).filter((item: any) => item.isDirty === true);
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
      ...data,
      isDirty: !markAsSynced,
      updatedAt: new Date().toISOString(),
      ...(markAsSynced ? { lastSyncedAt: new Date().toISOString() } : {})
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

  // Métodos de Backup
  async exportAllData(): Promise<string> {
    const stores = ['contratos', 'medicoes', 'ruas', 'trechos', 'profissionais', 'servicos'];
    const backup: Record<string, any[]> = {};
    for (const s of stores) {
      backup[s] = await this.getAll(s);
    }
    return JSON.stringify(backup);
  }

  async importAllData(jsonStr: string): Promise<void> {
    const backup = JSON.parse(jsonStr);
    for (const storeName in backup) {
      const items = backup[storeName];
      for (const item of items) {
        await this.save(storeName, item, true); // Importa como já sincronizado para manter os dados
      }
    }
  }
}

export const db = new Database();
