import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const apkUrl = "http://157.20.95.8/skinet.apk";
    const response = await fetch(apkUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Gagal mengunduh APK dari storage server" }, { status: response.status });
    }

    const headers = new Headers();
    headers.set("Content-Type", "application/vnd.android.package-archive");
    headers.set("Content-Disposition", 'attachment; filename="skinet.apk"');

    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("Error downloading APK:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
