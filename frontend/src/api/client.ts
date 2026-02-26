import axios from 'axios';
import type { SkinScore, SkinDetail, AnalysisStats } from '../types';

const api = axios.create({ baseURL: '/api', timeout: 30000 });

export async function fetchSkins(): Promise<{ data: SkinScore[]; lastUpdated: string }> {
  const res = await api.get('/skins');
  return res.data;
}

export async function fetchSkinDetail(id: string): Promise<SkinDetail> {
  const res = await api.get(`/skins/${id}`);
  return res.data;
}

export async function fetchAlerts(threshold = 70): Promise<{ data: SkinScore[]; count: number }> {
  const res = await api.get('/analysis/alerts', { params: { threshold } });
  return res.data;
}

export async function fetchStats(): Promise<AnalysisStats> {
  const res = await api.get('/analysis/stats');
  return res.data;
}

export async function addSkinToMonitor(name: string): Promise<{ id: string; message: string }> {
  const res = await api.post('/skins/monitor', { name });
  return res.data;
}

export async function removeSkinFromMonitor(id: string): Promise<void> {
  await api.delete(`/skins/${id}/monitor`);
}

export async function triggerAnalysis(id: string): Promise<unknown> {
  const res = await api.post(`/skins/${id}/analyze`);
  return res.data;
}

export async function triggerFullPipeline(): Promise<void> {
  await api.post('/analysis/run');
}

export async function searchSkins(q: string): Promise<Array<{ name: string; imageUrl: string }>> {
  const res = await api.get('/skins/search', { params: { q } });
  return res.data.data ?? [];
}

export async function checkHealth(): Promise<boolean> {
  try {
    await api.get('/health');
    return true;
  } catch {
    return false;
  }
}
