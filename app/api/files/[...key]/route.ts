import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const BUCKET_NAME = "invoicecoid";

function getS3Client() {
  return new S3Client({
    region: "auto",
    endpoint: "https://975b389dad8338cdb5331ade0328da79.r2.cloudflarestorage.com",
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: { key: string[] } }
) {
  try {
    if (!params.key || params.key.length === 0) {
      return new Response("Missing file key", { status: 400 });
    }

    // Join all parts of catch-all parameter to get the full R2 Key
    const key = params.key.map(k => decodeURIComponent(k)).join("/");

    const s3 = getS3Client();
    const s3Response = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );

    const body = s3Response.Body;
    if (!body) {
      return new Response("File not found", { status: 404 });
    }

    // Convert readable stream to Response stream
    const stream = body.transformToWebStream();

    return new Response(stream, {
      headers: {
        "Content-Type": s3Response.ContentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error fetching file from R2:", error);
    return new Response("File not found", { status: 404 });
  }
}
