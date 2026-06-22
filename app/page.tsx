"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { runDiff, type DiffResult } from "@/lib/diff";

const BASELINE_KEY = "baseline-menswear.xlsx";

type BaselineInfo = {
  exists: boolean;
  url?: string;
  size?: number;
  uploadedAt?: string;
};

type Phase = "idle" | "fetching-baseline" | "reading-files" | "diffing" | "uploading" | "done" | "error";

export default function HomePage() {
  const router = useRouter();
  const [baseline, setBaseline] = useState<BaselineInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{
    diff: DiffResult;
    xlsxBlob: Blob;
    filename: string;
  } | null>(null);

  const loadBaseline = useCallback(async () => {
    const res = await fetch("/api/baseline");
    if (res.ok) setBaseline(await res.json());
  }, []);

  useEffect(() => {
    loadBaseline();
  }, [loadBaseline]);

  async function handleSignOut() {
    await fetch("/api/signin", { method: "DELETE" });
    router.push("/signin");
    router.refresh();
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  async function handleCompare() {
    if (!file) return;
    setErrorMsg(null);
    setResult(null);

    try {
      setPhase("fetching-baseline");
      setStatusMsg("Fetching baseline file...");
      if (!baseline?.exists || !baseline.url) {
        setPhase("uploading");
        setStatusMsg("No baseline yet — uploading this file as the first baseline...");
        await upload(BASELINE_KEY, file, {
          access: "public",
          handleUploadUrl: "/api/upload-url",
        });
        setPhase("done");
        setStatusMsg("Baseline set. Upload your next CP file to start comparing.");
        await loadBaseline();
        setFile(null);
        return;
      }
      const baselineResp = await fetch(baseline.url);
      if (!baselineResp.ok) throw new Error("Failed to fetch baseline");
      const baselineBuf = await baselineResp.arrayBuffer();

      setPhase("reading-files");
      setStatusMsg("Reading your file...");
      const newBuf = await file.arrayBuffer();

      setPhase("diffing");
      setStatusMsg("Running comparison... this can take 1–3 minutes for large files.");
      await new Promise((r) => setTimeout(r, 50));
      const baselineLabel = `baseline (uploaded ${baseline.uploadedAt ? new Date(baseline.uploadedAt).toLocaleDateString() : "?"})`;
      const { result: diff, outputXlsx } = runDiff(baselineBuf, newBuf, baselineLabel, file.name);

      const xlsxBlob = new Blob([outputXlsx], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const filename = `MDV_CP_ChangeLog_${new Date().toISOString().slice(0, 10)}.xlsx`;

      setPhase("uploading");
      setStatusMsg("Replacing baseline with your file...");
      await upload(BASELINE_KEY, file, {
        access: "public",
        handleUploadUrl: "/api/upload-url",
      });
      await loadBaseline();

      setResult({ diff, xlsxBlob, filename });
      setPhase("done");
      setStatusMsg("");
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message ?? "Something went wrong. Try again.");
      setPhase("error");
    }
  }

  function downloadResult() {
    if (!result) return;
    const url = URL.createObjectURL(result.xlsxBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const busy = phase !== "idle" && phase !== "done" && phase !== "error";

  return (
    <main className="min-h-screen p-6 md:p-10 max-w-4xl mx-auto">
      <header className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">MDV Critical Path Diff</h1>
          <p className="text-stone-500 text-sm mt-1">Menswear</p>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm text-stone-700 hover:text-stone-900 underline"
        >
          Sign out
        </button>
      </header>

      <section className="mb-6 bg-white border border-stone-200 rounded-lg p-5">
        <h2 className="text-sm uppercase tracking-wider text-stone-500 mb-2">Current baseline</h2>
        {baseline === null ? (
          <p className="text-stone-400 text-sm">Loading...</p>
        ) : baseline.exists ? (
          <div className="text-sm">
            <div className="text-stone-900 font-medium">
              Uploaded {baseline.uploadedAt ? new Date(baseline.uploadedAt).toLocaleString() : "?"}
            </div>
            <div className="text-stone-500 mt-0.5">
              Size: {((baseline.size ?? 0) / 1e6).toFixed(1)} MB
            </div>
          </div>
        ) : (
          <p className="text-stone-700 text-sm">
            No baseline yet. The first file you upload will become the baseline.
          </p>
        )}
      </section>

      <section className="mb-6">
        <label
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="block border-2 border-dashed border-stone-300 hover:border-stone-400 rounded-lg p-10 text-center cursor-pointer transition-colors bg-white"
        >
          <input
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div>
              <div className="text-stone-900 font-medium">{file.name}</div>
              <div className="text-stone-500 text-sm mt-1">
                {(file.size / 1e6).toFixed(1)} MB · Click to choose a different file
              </div>
            </div>
          ) : (
            <div>
              <div className="text-stone-700">Drop a CP file here, or click to browse</div>
              <div className="text-stone-400 text-xs mt-1">.xlsx files only</div>
            </div>
          )}
        </label>
      </section>

      {file && baseline?.exists && phase === "idle" && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          <strong>After comparison, this file becomes the new baseline.</strong> Anyone running the
          next comparison will diff against this one. Make sure you're uploading the latest CP, not
          an older copy.
        </div>
      )}

      <button
        onClick={handleCompare}
        disabled={!file || busy}
        className="w-full md:w-auto px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy ? statusMsg || "Working..." : "Compare and update baseline"}
      </button>

      {busy && (
        <div className="mt-4 text-sm text-stone-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
            {statusMsg}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {result && (
        <section className="mt-8 bg-white border border-stone-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-1">
            {result.diff.rows.length} changes detected
          </h2>
          <p className="text-stone-500 text-sm mb-5">
            Old: {result.diff.oldRecordCount} records · New: {result.diff.newRecordCount} records
          </p>

          <table className="w-full text-sm mb-6">
            <tbody>
              {Object.entries(result.diff.countsByType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <tr key={type} className="border-b border-stone-100 last:border-0">
                    <td className="py-2 text-stone-700">{type}</td>
                    <td className="py-2 text-right text-stone-900 font-medium tabular-nums">
                      {count}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {Object.entries(result.diff.aliases).filter(([o, n]) => o !== n).length > 0 && (
            <details className="mb-6 text-sm">
              <summary className="cursor-pointer text-stone-700 hover:text-stone-900">
                Sheet renames auto-detected (
                {Object.entries(result.diff.aliases).filter(([o, n]) => o !== n).length})
              </summary>
              <ul className="mt-3 ml-4 space-y-1 text-stone-600 text-xs">
                {Object.entries(result.diff.aliases)
                  .filter(([o, n]) => o !== n)
                  .map(([o, n]) => (
                    <li key={o}>
                      <code>{o}</code> → <code>{n}</code>
                      {result.diff.reasons[o] && (
                        <span className="text-stone-400"> · {result.diff.reasons[o]}</span>
                      )}
                    </li>
                  ))}
              </ul>
            </details>
          )}

          <button
            onClick={downloadResult}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-md font-medium"
          >
            Download change log (.xlsx)
          </button>

          <p className="text-xs text-stone-400 mt-4">
            Baseline has been replaced with the file you just uploaded. The next comparison will
            diff against it.
          </p>
        </section>
      )}
    </main>
  );
}
