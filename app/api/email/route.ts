import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || process.env.RESEND_API || "re_dummy_key");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      to, 
      customerName, 
      invoiceNumber, 
      amountStr, 
      publicLink, 
      businessName,
      language,
      isQuotation
    } = body;
    
    if (!to || !invoiceNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const isEn = language === "en";
    
    const subject = isQuotation
      ? (isEn 
          ? `New Quotation ${invoiceNumber} from ${businessName}` 
          : `Penawaran Baru ${invoiceNumber} dari ${businessName}`)
      : (isEn 
          ? `New Invoice ${invoiceNumber} from ${businessName}` 
          : `Invoice Baru ${invoiceNumber} dari ${businessName}`);

    const title = isQuotation
      ? (isEn 
          ? `New Quotation from ${businessName}` 
          : `Penawaran Baru dari ${businessName}`)
      : (isEn 
          ? `New Invoice from ${businessName}` 
          : `Invoice Baru dari ${businessName}`);

    const salutation = isEn 
      ? `Hello <strong>${customerName}</strong>,` 
      : `Halo <strong>${customerName}</strong>,`;

    const bodyText = isQuotation
      ? (isEn 
          ? `You have received a new price quotation <strong>${invoiceNumber}</strong> amounting to <strong>${amountStr}</strong>.` 
          : `Anda menerima penawaran harga baru dengan nomor <strong>${invoiceNumber}</strong> sebesar <strong>${amountStr}</strong>.`)
      : (isEn 
          ? `You have received a new bill <strong>${invoiceNumber}</strong> amounting to <strong>${amountStr}</strong>.` 
          : `Anda menerima tagihan baru dengan nomor <strong>${invoiceNumber}</strong> sebesar <strong>${amountStr}</strong>.`);

    const buttonText = isQuotation
      ? (isEn 
          ? `View Quotation` 
          : `Lihat Penawaran`)
      : (isEn 
          ? `View & Pay Invoice` 
          : `Lihat & Bayar Invoice`);

    const footerText = isEn 
      ? `This secure link will be active for 3 days. Thank you for your business.` 
      : `Tautan aman ini akan aktif selama 3 hari. Terima kasih atas kerja sama Anda.`;

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #334155; border: 1px solid #f1f5f9; border-radius: 16px;">
        <h2 style="color: #004de6; margin-bottom: 20px; font-size: 20px; font-weight: bold; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;">${title}</h2>
        <p style="font-size: 14px; line-height: 1.6;">${salutation}</p>
        <p style="font-size: 14px; line-height: 1.6;">${bodyText}</p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="${publicLink}" style="background-color: #004de6; color: white; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 13px; shadow: 0 4px 6px rgba(0,77,230,0.15);">${buttonText}</a>
        </div>
        <p style="font-size: 11px; color: #64748b; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 16px; line-height: 1.5;">
          ${footerText}<br/>
          <strong>${businessName}</strong>
        </p>
      </div>
    `;

    // Attempt to send email
    const data = await resend.emails.send({
      from: "Invoice.co.id <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: emailHtml,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error sending email via Resend:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
