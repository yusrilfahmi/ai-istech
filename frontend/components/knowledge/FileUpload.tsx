'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';

interface FileUploadProps {
  onUpload: (file: File, metadata: Record<string, string>) => Promise<void>;
  accept?: string;
  type: 'sop' | 'ml_dataset';
  loading?: boolean;
}

export default function FileUpload({ onUpload, accept = '.pdf,.csv,.xlsx,.xls,.doc,.docx,.txt', type, loading }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [machineType, setMachineType] = useState('');
  const [version, setVersion] = useState('1.0');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      if (!title) {
        setTitle(e.dataTransfer.files[0].name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      if (!title) {
        setTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    await onUpload(file, {
      title,
      description,
      category,
      machine_type: machineType,
      version,
    });

    // Reset
    setFile(null);
    setTitle('');
    setDescription('');
    setCategory('');
    setMachineType('');
    setVersion('1.0');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-2xl border" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
      <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
        {type === 'sop' ? 'Upload SOP Document' : 'Upload Dataset File'}
      </h3>

      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'hover:border-zinc-400'
        }`}
        style={{ borderColor: isDragging ? 'var(--accent)' : 'var(--border)' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          id="knowledge-file-input"
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-1"
            style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          {file ? (
            <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          ) : (
            <>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Click or drag & drop file to upload
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {type === 'sop' ? 'PDF, DOCX, TXT supported' : 'CSV, XLSX, XLS supported'} (Max 50MB)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Metadata Fields */}
      {file && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
              Title / Name *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
              style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
              Machine Type / Model
            </label>
            <input
              type="text"
              value={machineType}
              onChange={(e) => setMachineType(e.target.value)}
              placeholder="e.g. Compressor E_AC01"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
              style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Maintenance, Safety, Operations"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
              style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
              Version
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
              style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Detailed description of document content..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border resize-none"
              style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>
        </div>
      )}

      {/* Action Button */}
      {file && (
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 flex items-center gap-2"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {loading && <div className="spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }} />}
            Upload to Draft
          </button>
        </div>
      )}
    </form>
  );
}
