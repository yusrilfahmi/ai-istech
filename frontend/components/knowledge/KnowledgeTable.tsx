'use client';

import { useState } from 'react';
import type { KnowledgeFile } from '@/types';

interface KnowledgeTableProps {
  files: KnowledgeFile[];
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export default function KnowledgeTable({
  files,
  onDelete,
}: KnowledgeTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (files.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl border" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Belum ada dokumen SOP yang diunggah.
        </p>
      </div>
    );
  }

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs uppercase" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
            <tr>
              <th className="px-5 py-3.5">Dokumen & Judul</th>
              <th className="px-5 py-3.5">Nama Unik (Webhook ID)</th>
              <th className="px-5 py-3.5">Mesin / Kategori</th>
              <th className="px-5 py-3.5">Tipe & Ukuran</th>
              <th className="px-5 py-3.5">Diunggah</th>
              <th className="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {files.map((file) => (
              <tr key={file.id} className="hover:bg-white/[0.02]">
                <td className="px-5 py-4">
                  <div className="font-medium" style={{ color: 'var(--foreground)' }}>
                    {file.sop_title || file.original_name}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>
                    {file.original_name} {file.sop_version && `(v${file.sop_version})`}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="font-mono text-xs px-2.5 py-1 rounded select-all bg-black/20 text-indigo-300 border border-indigo-500/20">
                    {file.file_name}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div style={{ color: 'var(--foreground)' }}>
                    {file.sop_machine_type || '-'}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>
                    {file.sop_category || '-'}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="uppercase text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--border)' }}>
                    {file.file_type}
                  </span>
                  <span className="ml-2 text-xs" style={{ color: 'var(--muted)' }}>
                    {file.file_size ? `${(Number(file.file_size) / 1024).toFixed(1)} KB` : '-'}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs" style={{ color: 'var(--muted)' }}>
                  <div>{new Date(file.created_at).toLocaleDateString()}</div>
                  <div>oleh {file.uploaded_by_name || 'Admin'}</div>
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    onClick={() => setDeleteTarget(file)}
                    className="p-2 rounded-lg cursor-pointer text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Buang / Hapus Data"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal Popup */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="w-full max-w-md rounded-2xl p-6 border shadow-2xl space-y-4"
            style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                  Konfirmasi Buang File SOP
                </h3>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Tindakan ini akan memanggil webhook penghapusan data.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border space-y-2 text-xs" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
              <div>
                <span className="font-semibold text-muted">Judul: </span>
                <span className="text-foreground font-medium">{deleteTarget.sop_title || deleteTarget.original_name}</span>
              </div>
              <div>
                <span className="font-semibold text-muted">Nama Unik (Webhook ID): </span>
                <div className="font-mono text-indigo-400 break-all select-all mt-0.5">{deleteTarget.file_name}</div>
              </div>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
              Apakah Anda yakin ingin membuang file ini? Server akan mengirim permintaan hapus ke Webhook sesuai nama unik di atas.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-medium border hover:bg-white/[0.05] cursor-pointer"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-red-500 hover:bg-red-600 text-white cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting && <div className="spinner" style={{ width: 12, height: 12, borderTopColor: '#fff' }} />}
                Ya, Buang Data
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
