// POST /api/job-application/cv-upload — issues a short-lived client-upload
// token so an applicant's CV uploads straight from the browser to a PRIVATE
// Vercel Blob. The file never passes through this function, which sidesteps
// the ~4.5 MB serverless body limit. The token is constrained to PDF/Word and
// <= 5 MB, so the store rejects anything else at the source. The resulting
// blob URL travels back to /api/job-application as `cvUrl`; HQ mints a signed
// download URL on demand (the blob stays private).

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { CV_CONTENT_TYPES, CV_MAX_BYTES } from "@/lib/job-application";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  if (!env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "uploads_unavailable" }, { status: 503 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      token: env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async () => ({
        access: "private",
        addRandomSuffix: true,
        allowedContentTypes: [...CV_CONTENT_TYPES],
        maximumSizeInBytes: CV_MAX_BYTES,
      }),
      // The client reads the uploaded URL from the upload() result, so we do
      // not depend on this callback (it does not fire on localhost anyway).
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "upload_failed" },
      { status: 400 },
    );
  }
}
