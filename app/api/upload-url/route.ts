import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";

const BASELINE_KEY = "baseline-menswear.xlsx";

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (pathname !== BASELINE_KEY) {
          throw new Error("Unexpected upload path");
        }
        return {
          allowedContentTypes: [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/octet-stream",
          ],
          addRandomSuffix: false,
          allowOverwrite: true,
          maximumSizeInBytes: 500 * 1024 * 1024,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("Baseline updated:", blob.url);
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
