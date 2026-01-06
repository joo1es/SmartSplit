import React from 'react';
import { AppSettings } from '../types';
import { Settings2, Zap, Ruler } from 'lucide-react';

interface SettingsPanelProps {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onReRun: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, onReRun }) => {
  
  const update = (key: keyof AppSettings, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center gap-2 text-slate-700 font-semibold border-b border-slate-100 pb-2">
        <Settings2 size={20} />
        <h2>Detection Settings</h2>
      </div>

      {/* Sensitivity */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600 font-medium">Sensitivity</span>
          <span className="text-brand-600 font-bold">{settings.sensitivity}%</span>
        </div>
        <input 
          type="range" 
          min="1" 
          max="100" 
          value={settings.sensitivity} 
          onChange={(e) => update('sensitivity', parseInt(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
        />
        <p className="text-xs text-slate-400">Higher values detect fainter lines.</p>
      </div>

      {/* Min Height */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600 font-medium flex items-center gap-1"><Ruler size={14}/> Min Height</span>
          <span className="text-slate-700">{settings.minSegmentHeight}px</span>
        </div>
        <input 
          type="range" 
          min="10" 
          max="500" 
          step="10"
          value={settings.minSegmentHeight} 
          onChange={(e) => update('minSegmentHeight', parseInt(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
        />
      </div>

      {/* Performance */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-700 flex items-center gap-1"><Zap size={14} className={settings.fastMode ? "text-amber-500" : "text-slate-400"}/> Fast Mode</span>
          <span className="text-xs text-slate-400">Downscale for speed</span>
        </div>
        <button 
          onClick={() => update('fastMode', !settings.fastMode)}
          className={`w-11 h-6 flex items-center rounded-full px-1 transition-colors ${settings.fastMode ? 'bg-brand-500' : 'bg-slate-300'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${settings.fastMode ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      <button 
        onClick={onReRun}
        className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Re-Run Detection
      </button>
    </div>
  );
};
