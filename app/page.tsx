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
  const [dragActive, setDragActive] = useState(false);

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
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  async function handleCompare() {
    if (!file) return;
    setErrorMsg(null);
    setResult(null);

    try {
      setPhase("fetching-baseline");
      setStatusMsg("Fetching the current baseline…");
      if (!baseline?.exists || !baseline.url) {
        setPhase("uploading");
        setStatusMsg("No baseline yet — saving this file as the first baseline…");
        await upload(BASELINE_KEY, file, {
          access: "public",
          handleUploadUrl: "/api/upload-url",
        });
        setPhase("done");
        setStatusMsg("Baseline set. Next upload will produce a comparison.");
        await loadBaseline();
        setFile(null);
        return;
      }
      const baselineResp = await fetch(baseline.url);
      if (!baselineResp.ok) throw new Error("Failed to fetch baseline");
      const baselineBuf = await baselineResp.arrayBuffer();

      setPhase("reading-files");
      setStatusMsg("Reading your file…");
      const newBuf = await file.arrayBuffer();

      setPhase("diffing");
      setStatusMsg("Running comparison — this typically takes one to three minutes.");
      await new Promise((r) => setTimeout(r, 50));
      const baselineLabel = `baseline (uploaded ${baseline.uploadedAt ? new Date(baseline.uploadedAt).toLocaleDateString() : "?"})`;
      const { result: diff, outputXlsx } = runDiff(baselineBuf, newBuf, baselineLabel, file.name);

      const xlsxBlob = new Blob([outputXlsx], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const filename = `MDV_CP_ChangeLog_${new Date().toISOString().slice(0, 10)}.xlsx`;

      setPhase("uploading");
      setStatusMsg("Replacing the baseline with your file…");
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
    <main className="min-h-screen bg-mdv-cream">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-20">
        {/* Header */}
        <header className="flex justify-between items-start mb-16">
          <div>
            <p className="mdv-eyebrow mb-3">Manière de Voir</p>
            <h1 className="mdv-display text-4xl md:text-5xl text-mdv-charcoal mb-2">
              Critical Path Diff
            </h1>
            <p className="text-sm text-mdv-mute">Menswear</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs uppercase tracking-widest text-mdv-mute hover:text-mdv-charcoal transition-colors"
          >
            Sign out
          </button>
        </header>

        {/* Baseline card */}
        <section className="mdv-card p-8 mb-8">
          <p className="mdv-eyebrow mb-4">Current baseline</p>
          {baseline === null ? (
            <p className="text-sm text-mdv-mute">Loading…</p>
          ) : baseline.exists ? (
            <div>
              <p className="text-mdv-charcoal text-lg">
                Uploaded {baseline.uploadedAt ? new Date(baseline.uploadedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—"}
              </p>
              <p className="text-sm text-mdv-mute mt-1">
                {((baseline.size ?? 0) / 1e6).toFixed(1)} MB
              </p>
            </div>
          ) : (
            <p className="text-mdv-charcoal">
              No baseline yet. The first file you upload will become the baseline.
            </p>
          )}
        </section>

        {/* Dropzone */}
        <section className="mb-8">
          <p className="mdv-eyebrow mb-4">New file</p>
          <label
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            className={`block rounded-sm cursor-pointer transition-all duration-200 ${
              dragActive
                ? "bg-mdv-hover border-mdv-charcoal"
                : "bg-mdv-paper border-mdv-line hover:border-mdv-charcoal"
            } border p-12 text-center`}
          >
            <input
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div>
                <p className="text-mdv-charcoal text-base">{file.name}</p>
                <p className="text-xs text-mdv-mute mt-2 uppercase tracking-wider">
                  {(file.size / 1e6).toFixed(1)} MB · Click to replace
                </p>
              </div>
            ) : (
              <div>
                <p className="text-mdv-charcoal">Drop a CP file here, or click to browse</p>
                <p className="text-xs text-mdv-mute mt-2 uppercase tracking-wider">
                  .xlsx files only
                </p>
              </div>
            )}
          </label>
        </section>

        {/* Warning */}
        {file && baseline?.exists && phase === "idle" && (
          <div className="border border-mdv-charcoal bg-mdv-paper p-5 mb-8">
            <p className="mdv-eyebrow mb-2">Heads up</p>
            <p className="text-sm text-mdv-charcoal leading-relaxed">
              After comparison, this file becomes the new baseline. Anyone running the next
              comparison will diff against it. Confirm this is the latest CP before proceeding.
            </p>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleCompare}
          disabled={!file || busy}
          className="mdv-btn-primary px-10 py-4 w-full md:w-auto"
        >
          {busy ? statusMsg || "Working…" : "Compare & update baseline"}
        </button>

        {/* Progress */}
        {busy && (
          <div className="mt-6 flex items-center gap-3 text-sm text-mdv-mute">
            <div className="w-3 h-3 border border-mdv-mute border-t-mdv-charcoal rounded-full animate-spin" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="mt-6 p-5 bg-red-50 border border-red-200 text-sm text-red-900 rounded-sm">
            <p className="uppercase tracking-widest text-xs mb-1">Error</p>
            {errorMsg}
          </div>
        )}

        {/* Results */}
        {result && (
          <section className="mt-16">
            <div className="mdv-divider mb-10" />
            <p className="mdv-eyebrow mb-3">Result</p>
            <h2 className="mdv-display text-3xl md:text-4xl text-mdv-charcoal mb-2">
              {result.diff.rows.length} changes detected
            </h2>
            <p className="text-sm text-mdv-mute mb-10">
              Baseline · {result.diff.oldRecordCount} records &nbsp;·&nbsp;
              New file · {result.diff.newRecordCount} records
            </p>

            <div className="mdv-card p-8 mb-8">
              <p className="mdv-eyebrow mb-5">Breakdown</p>
              <table className="w-full">
                <tbody>
                  {Object.entries(result.diff.countsByType)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <tr key={type} className="border-b border-mdv-line last:border-0">
                        <td className="py-3 text-mdv-charcoal">{type}</td>
                        <td className="py-3 text-right text-mdv-charcoal font-medium tabular-nums">
                          {count}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {Object.entries(result.diff.aliases).filter(([o, n]) => o !== n).length > 0 && (
              <details className="mdv-card p-6 mb-8 text-sm">
                <summary className="cursor-pointer text-mdv-charcoal hover:text-mdv-graphite uppercase tracking-widest text-xs">
                  Sheet renames auto-detected (
                  {Object.entries(result.diff.aliases).filter(([o, n]) => o !== n).length})
                </summary>
                <ul className="mt-4 space-y-2 text-mdv-mute text-xs">
                  {Object.entries(result.diff.aliases)
                    .filter(([o, n]) => o !== n)
                    .map(([o, n]) => (
                      <li key={o}>
                        <code className="text-mdv-charcoal">{o}</code> → <code className="text-mdv-charcoal">{n}</code>
                        {result.diff.reasons[o] && (
                          <span className="text-mdv-mute"> · {result.diff.reasons[o]}</span>
                        )}
                      </li>
                    ))}
                </ul>
              </details>
            )}

            <button
              onClick={downloadResult}
              className="mdv-btn-primary px-10 py-4"
            >
              Download change log (.xlsx)
            </button>

            <p className="text-xs text-mdv-mute mt-6 leading-relaxed">
              The baseline has been replaced with the file you just uploaded. The next comparison will diff against it.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
