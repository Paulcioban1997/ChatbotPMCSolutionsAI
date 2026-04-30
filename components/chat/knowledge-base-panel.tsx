"use client";

import { FileTextIcon, Loader2Icon, TrashIcon, UploadIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

type KbDocument = {
  fileName: string;
  blobUrl: string;
  createdAt: string;
  chunks: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function KnowledgeBasePanel() {
  const { data, isLoading } = useSWR<{ documents: KbDocument[] }>(
    "/api/documents",
    fetcher
  );
  const [uploading, setUploading] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.name.match(/\.(txt|md)$/i)) {
      toast.error("Seuls les fichiers .txt et .md sont acceptés");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Fichier trop lourd (max 4 Mo)");
      return;
    }

    setUploading(true);
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(
          `"${json.fileName}" chargé (${json.chunks} segments indexés)`
        );
        mutate("/api/documents");
      } else {
        toast.error(json.error ?? "Erreur lors de l'upload");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }, []);

  const handleDelete = useCallback(async (fileName: string) => {
    setDeletingFile(fileName);
    try {
      const res = await fetch(
        `/api/documents?fileName=${encodeURIComponent(fileName)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success(`"${fileName}" supprimé`);
        mutate("/api/documents");
      } else {
        const json = await res.json();
        toast.error(json.error ?? "Erreur suppression");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setDeletingFile(null);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  const documents = data?.documents ?? [];

  return (
    <div className="flex flex-col gap-2 px-2 py-2">
      {/* Upload zone */}
      <button
        className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-sidebar-border bg-sidebar-accent/20 px-3 py-4 text-center cursor-pointer hover:bg-sidebar-accent/40 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        type="button"
      >
        {uploading ? (
          <Loader2Icon className="size-5 animate-spin text-sidebar-foreground/50" />
        ) : (
          <UploadIcon className="size-5 text-sidebar-foreground/40" />
        )}
        <p className="text-[11px] text-sidebar-foreground/50 leading-tight">
          {uploading
            ? "Chargement en cours…"
            : "Dépose un .txt ou .md ici, ou clique pour choisir"}
        </p>
        <input
          accept=".txt,.md,text/plain,text/markdown"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleUpload(file);
            }
          }}
          ref={inputRef}
          type="file"
        />
      </button>

      {/* Document list */}
      {isLoading ? (
        <p className="text-[11px] text-sidebar-foreground/40 px-1">
          Chargement…
        </p>
      ) : documents.length === 0 ? (
        <p className="text-[11px] text-sidebar-foreground/30 px-1 italic">
          Aucun document chargé
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {documents.map((doc) => (
            <li
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent/30 group"
              key={doc.fileName}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <FileTextIcon className="size-3.5 shrink-0 text-sidebar-foreground/40" />
                <span
                  className="text-[11px] text-sidebar-foreground/70 truncate max-w-[140px]"
                  title={doc.fileName}
                >
                  {doc.fileName}
                </span>
                <span className="text-[10px] text-sidebar-foreground/30 shrink-0">
                  {doc.chunks}seg
                </span>
              </div>
              <button
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-sidebar-foreground/40 hover:text-destructive"
                disabled={deletingFile === doc.fileName}
                onClick={() => handleDelete(doc.fileName)}
                type="button"
              >
                {deletingFile === doc.fileName ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <TrashIcon className="size-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
