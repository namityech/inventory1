import React, { useState, useEffect } from 'react';
import {
  Settings, RotateCcw, Save, ShieldAlert, CheckCircle2,
  Building, DollarSign, Clock, Check
} from 'lucide-react';
import { api } from '../../services/api';
import { AppSettings } from '../../types/inventory';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface SettingsViewProps {
  onRefreshAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRefreshAll }) => {
  const [settings, setSettings] = useState<AppSettings>({
    company_name: 'Apex Medical & Retail Supply',
    currency_symbol: '$',
    fefo_enforced: 'true',
    critical_expiry_days: '7',
    warning_expiry_days: '30',
    upcoming_expiry_days: '60'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    api.getSettings()
      .then(res => setSettings(res.settings))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      await api.resetDemoData();
      setConfirmResetOpen(false);
      onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Failed to reset demo');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-teal-600" />
          <span>System Parameters & Demo Controls</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Customize statutory expiry thresholds, enterprise branding, and reset demonstration datasets
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Settings */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-teal-600" />
            <span>Organization Profile</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company / Facility Name
              </label>
              <input
                type="text"
                value={settings.company_name || ''}
                onChange={e => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={settings.currency_symbol || '$'}
                onChange={e => setSettings({ ...settings, currency_symbol: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Expiry & FEFO Protocol Parameters */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <span>Statutory Expiry Thresholds (Days)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-rose-600 mb-1">
                Critical Alert Threshold (Days)
              </label>
              <input
                type="number"
                min="1"
                value={settings.critical_expiry_days || '7'}
                onChange={e => setSettings({ ...settings, critical_expiry_days: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: 7 days</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-600 mb-1">
                Warning Threshold (Days)
              </label>
              <input
                type="number"
                min="2"
                value={settings.warning_expiry_days || '30'}
                onChange={e => setSettings({ ...settings, warning_expiry_days: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: 30 days</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-sky-600 mb-1">
                Upcoming Threshold (Days)
              </label>
              <input
                type="number"
                min="3"
                value={settings.upcoming_expiry_days || '60'}
                onChange={e => setSettings({ ...settings, upcoming_expiry_days: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: 60 days</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>Configuration saved successfully!</span>
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* Demo Reset Card */}
      <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Demonstration Environment Reset
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Restore the database to the clean initial seed state with realistic multi-batch pharmaceuticals, vaccines, expiry milestones (critical, warning, upcoming, expired), and past disposal records.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-rose-600 hover:text-white bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 border border-rose-200 dark:border-rose-900 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={handleResetDemo}
        title="Reset All Database Records"
        message="This will re-initialize all products, batches, suppliers, notifications, and transactions to the pristine seed state. This cannot be undone."
        confirmLabel="Reset Database"
        isDestructive
        isLoading={resetting}
      />
    </div>
  );
};
