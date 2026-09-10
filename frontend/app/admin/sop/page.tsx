'use client';

import { useEffect, useState, useCallback } from 'react';
import FileUpload from '@/components/knowledge/FileUpload';
import KnowledgeTable from '@/components/knowledge/KnowledgeTable';
import { knowledgeApi } from '@/lib/api';
import type { KnowledgeFile } from '@/types';

export default function SOPManagementPage() {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await knowledgeApi.list('sop');
      setFiles((res.data as KnowledgeFile[]) || []);
    } catch (err) {
      console.error('Failed to load SOP files:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (file: File, meta: Record<string, string>) => {
    try {
      setUploading(true);
      setMsg(null);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('knowledge_type', 'sop');
      Object.entries(meta).forEach(([k, v]) => fd.append(k, v));

      await knowledgeApi.upload(fd);
      setMsg({ type: 'success', text: 'SOP berhasil diunggah dan langsung diteruskan ke webhook n8n!' });
      await fetchFiles();
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await knowledgeApi.delete(id);
      setMsg({ type: 'success', text: 'SOP berhasil dihapus dan webhook delete telah dipanggil.' });
      await fetchFiles();
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Deletion failed' });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          SOP Document Management
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Upload dokumen SOP (PDF / Word / TXT). File otomatis diberi nama unik dan langsung dikirimkan ke webhook n8n.
        </p>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-sm ${
            msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Upload Box */}
      <FileUpload onUpload={handleUpload} type="sop" loading={uploading} accept=".pdf,.doc,.docx,.txt" />

      {/* Document List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Daftar Dokumen SOP ({files.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : (
          <KnowledgeTable
            files={files}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
