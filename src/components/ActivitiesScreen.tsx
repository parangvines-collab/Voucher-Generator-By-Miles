import { useState, useEffect } from 'react';
import { ActivityLogger } from '../utils/activityDB';
import { ActivityLog } from '../types';
import { Trash2, ShieldAlert, History, Filter, Search, RotateCcw } from 'lucide-react';
import { supabase } from '../supabaseClient';

export function ActivitiesScreen() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filterType, setFilterType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadActivities = async () => {
    const logs = await ActivityLogger.getActivitiesFromSupabase();
    setActivities(logs);
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const handleClearAll = async () => {
    if (confirm('Are you absolute sure you want to delete all activity logs and records? This action cannot be undone.')) {
      await ActivityLogger.clearActivities();
      ActivityLogger.logActivity('system_cleared', 'Admin cleared all activity logs');
      await loadActivities();
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      // 1. Delete from Supabase base table (if it exists)
      const { error } = await supabase.from('activity_logs').delete().eq('id', id);
      if (error) {
        console.warn('Could not delete log from Supabase:', error.message);
      }
      
      // 2. Fallback to delete from local backup
      const logs = ActivityLogger.getActivities();
      const filtered = logs.filter((l) => l.id !== id);
      localStorage.setItem('voucherActivities', JSON.stringify(filtered));
      
      await loadActivities();
    } catch (e) {
      console.error(e);
    }
  };

  const getLogBadgeColor = (type: string) => {
    switch (type) {
      case 'voucher_generated':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'voucher_exported':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'user_login':
        return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
      case 'user_registered':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'login_failed':
      case 'cash_in_denied':
        return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'password_changed':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'cash_in_requested':
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      case 'cash_in_approved':
        return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      case 'user_deleted':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const filteredLogs = activities
    .filter((log) => {
      if (filterType && log.type !== filterType) return false;
      if (searchTerm) {
        const descMatch = log.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const userMatch = log.user?.toLowerCase().includes(searchTerm.toLowerCase());
        const typeMatch = log.type?.toLowerCase().includes(searchTerm.toLowerCase());
        return descMatch || userMatch || typeMatch;
      }
      return true;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Operation & Activity Log</h2>
            <p className="text-xs text-slate-400">Review system actions, login statistics, and generated tickets</p>
          </div>
        </div>
        <button
          onClick={handleClearAll}
          disabled={activities.length === 0}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-rose-500/10 hover:shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          Clear All Logs
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Filtering & Searching Controls */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by action, user or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-950/50 border border-slate-800/80 rounded-xl pl-8 pr-8 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-all appearance-none"
              >
                <option value="">All Activity Types</option>
                <option value="voucher_generated">Voucher Generated</option>
                <option value="voucher_exported">Voucher Exported</option>
                <option value="user_login">User Login</option>
                <option value="user_registered">User Registered</option>
                <option value="login_failed">Failed Login</option>
                <option value="password_changed">Password Changed</option>
                <option value="cash_in_requested">Cash-In Requested</option>
                <option value="cash_in_approved">Cash-In Approved</option>
                <option value="cash_in_denied">Cash-In Denied</option>
                <option value="user_deleted">User Deleted</option>
              </select>
            </div>

            {(filterType || searchTerm) && (
              <button
                onClick={() => {
                  setFilterType('');
                  setSearchTerm('');
                }}
                className="px-3 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-850 flex items-center gap-1.5 text-xs transition-colors"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="p-4 pl-6">Timestamp / ID</th>
                <th className="p-4">Event Type</th>
                <th className="p-4">User</th>
                <th className="p-4">Description</th>
                <th className="p-4">Details</th>
                <th className="p-4 pr-6 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">
                    <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-25 text-indigo-400" />
                    No match logs found for selected query filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-950/40 transition-colors text-xs">
                    <td className="p-4 pl-6">
                      <span className="block text-slate-300 font-medium">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-600 font-mono">ID: {log.id}</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ${getLogBadgeColor(log.type)}`}>
                        {log.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-100">{log.user}</td>
                    <td className="p-4 max-w-[200px] truncate text-slate-300" title={log.description}>
                      {log.description}
                    </td>
                    <td className="p-4 max-w-[220px]">
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <div className="font-mono text-[10px] text-slate-500 bg-slate-950/40 p-2 rounded border border-slate-850/50 max-h-[100px] overflow-y-auto">
                          {Object.entries(log.details).map(([k, v]) => (
                            <div key={k} className="truncate">
                              <span className="text-indigo-400/80 mr-1">{k}:</span>
                              <span className="text-slate-300">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">-</span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-center">
                      <button
                        onClick={() => handleDeleteItem(log.id)}
                        className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors inline-block"
                        title="Delete record row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
