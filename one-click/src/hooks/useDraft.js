// src/hooks/useDraft.js — localStorage draft persistence utilities
const PFX = 'draft:';

export const readDraft  = (key) => {
  try { const s = localStorage.getItem(PFX + key); return s ? JSON.parse(s) : null; }
  catch { return null; }
};

export const saveDraft  = (key, data) => {
  try { localStorage.setItem(PFX + key, JSON.stringify(data)); } catch {}
};

export const clearDraft = (key) => {
  try { localStorage.removeItem(PFX + key); } catch {}
};
