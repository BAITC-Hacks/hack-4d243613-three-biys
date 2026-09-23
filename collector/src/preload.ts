// Preload: exposes window.collector to B's renderer (PLAN.md §9). Owner: A.
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  getStatus: () => ipcRenderer.invoke('collector:getStatus'),
  setToggle: (name: 'tracker' | 'meeting', on: boolean) => ipcRenderer.invoke('collector:setToggle', name, on),
  saveSettings: (s: Record<string, unknown>) => ipcRenderer.invoke('collector:saveSettings', s),
  startMeeting: (title: string) => ipcRenderer.invoke('collector:startMeeting', title) as Promise<string>,
  stopMeeting: () => ipcRenderer.invoke('collector:stopMeeting'),
  pushAudioChunk: (bytes: ArrayBuffer, mime?: string) => ipcRenderer.invoke('collector:pushAudioChunk', bytes, mime),
  onStatus: (cb: (status: unknown) => void) => {
    const listener = (_e: unknown, status: unknown) => cb(status);
    ipcRenderer.on('collector:status', listener);
    return () => ipcRenderer.removeListener('collector:status', listener);
  },
  onTranscript: (cb: (payload: { meetingId: string; seq: number; text: string }) => void) => {
    const listener = (_e: unknown, payload: { meetingId: string; seq: number; text: string }) => cb(payload);
    ipcRenderer.on('collector:transcript', listener);
    return () => ipcRenderer.removeListener('collector:transcript', listener);
  },
};

contextBridge.exposeInMainWorld('collector', api);

export type CollectorApi = typeof api;
