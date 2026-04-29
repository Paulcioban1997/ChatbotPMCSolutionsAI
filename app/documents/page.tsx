"use client";

import { useState } from "react";

export default function DocumentsPage() {
  const [status, setStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      return;
    }

    setStatus("uploading");
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Upload failed.");
        return;
      }

      setStatus("success");
      setMessage(
        `"${data.fileName}" uploaded and split into ${data.chunks} chunks. The AI can now search it.`
      );
      form.reset();
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error
          ? err.message
          : "Upload failed — make sure you are logged in."
      );
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Upload a document</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Upload a <strong>.txt</strong> or <strong>.md</strong> file (max 4
            MB). The AI will be able to search it during chat.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            accept=".txt,.md,text/plain,text/markdown"
            className="block w-full text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-900"
            name="file"
            required
            type="file"
          />
          <button
            className="w-full py-2 px-4 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium disabled:opacity-50"
            disabled={status === "uploading"}
            type="submit"
          >
            {status === "uploading" ? "Uploading…" : "Upload"}
          </button>
        </form>

        {message && (
          <p
            className={`text-sm rounded-lg p-3 ${
              status === "success"
                ? "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                : "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            {message}
          </p>
        )}

        <p className="text-xs text-zinc-400">
          After uploading, go back to chat and ask the AI a question about the
          document.
        </p>
      </div>
    </div>
  );
}
