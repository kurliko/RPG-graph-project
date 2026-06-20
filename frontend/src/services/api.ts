import axios from 'axios';
import type { GraphData, Node } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

export const api = {
  getGraph: async (): Promise<GraphData> => {
    const res = await axios.get(`${API_BASE_URL}/graph`);
    return res.data;
  },

  searchNodes: async (query: string): Promise<Node[]> => {
    const res = await axios.get(`${API_BASE_URL}/search`, { params: { q: query } });
    return res.data.nodes;
  },

  expandNode: async (nodeId: string): Promise<GraphData> => {
    const res = await axios.get(`${API_BASE_URL}/nodes/${encodeURIComponent(nodeId)}/expand`);
    return res.data;
  },

  findPath: async (sourceId: string, targetId: string): Promise<GraphData> => {
    const res = await axios.get(`${API_BASE_URL}/path`, { params: { source_id: sourceId, target_id: targetId } });
    return res.data;
  },

  getRecommendations: async (monsterId: string): Promise<Node[]> => {
    const res = await axios.get(`${API_BASE_URL}/recommend/${encodeURIComponent(monsterId)}`);
    return res.data.recommendations;
  },

  getCraftingRecipe: async (itemId: string): Promise<any[]> => {
    const res = await axios.get(`${API_BASE_URL}/crafting/${encodeURIComponent(itemId)}`);
    return res.data.recipe;
  },

  getObtainInfo: async (skillId: string): Promise<any[]> => {
    const res = await axios.get(`${API_BASE_URL}/obtain/${encodeURIComponent(skillId)}`);
    return res.data.sources;
  },

  getMaterialUsages: async (materialId: string): Promise<Node[]> => {
    const res = await axios.get(`${API_BASE_URL}/usages/${encodeURIComponent(materialId)}`);
    return res.data.usages;
  },

  // GM Mode CRUD
  createNode: async (label: string, properties: any): Promise<Node> => {
    const res = await axios.post(`${API_BASE_URL}/nodes`, { label, properties });
    return res.data;
  },

  updateNode: async (nodeId: string, properties: any): Promise<Node> => {
    const res = await axios.put(`${API_BASE_URL}/nodes/${encodeURIComponent(nodeId)}`, { properties });
    return res.data;
  },

  deleteNode: async (nodeId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/nodes/${encodeURIComponent(nodeId)}`);
  },

  createLink: async (sourceId: string, targetId: string, type: string, properties: any = {}): Promise<void> => {
    await axios.post(`${API_BASE_URL}/links`, {
      source_id: sourceId,
      target_id: targetId,
      type,
      properties
    });
  }
};
