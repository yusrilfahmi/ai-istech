'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { knowledgeApi, userApi } from '@/lib/api';
import type { KnowledgeFile, AuditLog } from '@/types';

export default function AdminDashboardPage() {
  const [knowledge, setKnowledge] = useState<KnowledgeFile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [kRes, aRes] = await Promise.all([
          knowledgeApi.list(),
          userApi.auditLogs({ limit: '5' }),
        ]);
        setKnowledge((kRes.data as KnowledgeFile[]) || []);
        setAuditLogs((aRes.data as AuditLog[]) || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalSOP = knowledge.filter((k) => k.knowledge_type === 'sop').length;
  const activeSOP = knowledge.filter((k) => k.knowledge_type === 'sop' && k.status === 'active').length;
  const draftFiles = knowledge.filter((k) => k.status === 'draft').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Knowledge & Management Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Manage documents, datasets, AI knowledge base, and access control.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
          <div className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--muted)' }}>
            Active Knowledge Files
          </div>
          <div className="text-3xl font-bold mt-2 text-emerald-400">
            {activeSOP}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            Available to AI chatbot
          </div>
        </div>

        <div className="p-5 rounded-2xl border" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
          <div className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--muted)' }}>
            Pending Drafts
          </div>
          <div className="text-3xl font-bold mt-2 text-amber-400">
            {draftFiles}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            Require confirmation before activation
          </div>
        </div>

        <div className="p-5 rounded-2xl border" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
          <div className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--muted)' }}>
            Total Documents
          </div>
          <div className="text-3xl font-bold mt-2" style={{ color: 'var(--accent)' }}>
            {totalSOP}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            SOPs in database
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/sop"
          className="p-6 rounded-2xl border flex items-center justify-between hover:border-indigo-500 transition-all group"
          style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}
        >
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
              SOP Management
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              Upload new standard operating procedures, preview drafts, and manage statuses.
            </p>
          </div>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:translate-x-1 transition-transform">
            →
          </div>
        </Link>

        <Link
          href="/admin/datasets"
          className="p-6 rounded-2xl border flex items-center justify-between hover:border-indigo-500 transition-all group"
          style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}
        >
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
              ML Datasets
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              Organize CSV and tabular machine learning datasets for analytics.
            </p>
          </div>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:translate-x-1 transition-transform">
            →
          </div>
        </Link>
      </div>

      {/* Recent Audit Activity */}
      <div className="p-6 rounded-2xl border" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
            Recent Audit Activities
          </h3>
          <Link href="/admin/audit" className="text-xs text-indigo-400 hover:underline">
            View All Logs →
          </Link>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs py-4" style={{ color: 'var(--muted)' }}>
            No audit logs recorded yet.
          </p>
        ) : (
          <div className="divide-y text-xs" style={{ borderColor: 'var(--border)' }}>
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-indigo-400 mr-2 uppercase tracking-wide">
                    {log.action}
                  </span>
                  <span style={{ color: 'var(--foreground)' }}>
                    {log.entity_type}
                  </span>
                  <span className="ml-2" style={{ color: 'var(--muted)' }}>
                    by {log.user_name || 'System'}
                  </span>
                </div>
                <div style={{ color: 'var(--muted)' }}>
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
