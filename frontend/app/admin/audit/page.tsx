'use client';

import { useEffect, useState, useCallback } from 'react';
import { userApi } from '@/lib/api';
import type { AuditLog } from '@/types';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity_type = entityFilter;

      const res = await userApi.auditLogs(params);
      setLogs((res.data as AuditLog[]) || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'UPLOAD':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'ACTIVATE':
      case 'CONFIRM':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'ARCHIVE':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'DELETE':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Audit Logs
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Historical record of Admin and Master operations (knowledge uploads, confirmations, status changes, and deletions).
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 rounded-2xl border items-center" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
            Filter by Action
          </label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm border outline-none"
            style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
            <option value="">All Actions</option>
            <option value="UPLOAD">UPLOAD</option>
            <option value="ACTIVATE">ACTIVATE</option>
            <option value="ARCHIVE">ARCHIVE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
            Filter by Entity
          </label>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm border outline-none"
            style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
            <option value="">All Entities</option>
            <option value="knowledge_file">knowledge_file</option>
            <option value="ml_dataset">ml_dataset</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            No audit records matching your filter.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Entity</th>
                <th className="px-5 py-3.5">Changes (Old / New)</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs font-mono" style={{ borderColor: 'var(--border)' }}>
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 font-sans">
                    <div className="font-medium" style={{ color: 'var(--foreground)' }}>
                      {log.user_name || 'System'}
                    </div>
                    <div className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                      {log.user_email || ''}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3.5" style={{ color: 'var(--foreground)' }}>
                    <div>{log.entity_type}</div>
                    {log.entity_id && (
                      <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
                        {log.entity_id.substring(0, 8)}...
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 max-w-xs truncate" style={{ color: 'var(--muted)' }}>
                    {log.new_data ? JSON.stringify(log.new_data) : log.old_data ? JSON.stringify(log.old_data) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
