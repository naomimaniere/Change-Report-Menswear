import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import { isAuthed } from "@/lib/auth";

const BASELINE_KEY = "baseline-menswear.xlsx";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { blobs } = await list({ prefix: BASELINE_KEY });
    const blob = blobs.find((b) => b.pathname === BASELINE_KEY);
    if (!blob) return NextResponse.json({ exists: false });
    return NextResponse.json({
      exists: true,
      url: blob.url,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
