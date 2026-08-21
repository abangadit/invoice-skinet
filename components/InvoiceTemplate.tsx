import React from "react";
import { LogoIcon } from "./Logo";
import { CheckCircle2, FileText, CheckCircle } from "lucide-react";

export interface InvoiceItem {
  id?: string;
  name: string;
  description?: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
}

export interface InvoiceDetail {
  invoice_number: string;
  status: string;
  currency: string;
  subtotal: number;
  discount_amount: number;
  taxes_amount: number;
  shipping_amount: number;
  shipping_label?: string;
  total_amount: number;
  paid_amount?: number;
  remaining_amount?: number;
  pph23_amount?: number;
  taxes_snapshot?: Array<{ name: string; rate?: number; amount: number }> | any;
  adjustments?: Array<{ name: string; value: number }> | null;
  payment_instructions?: string | null;
  notes?: string | null;
  signature_text?: string | null;
  signature_url?: string | null;
  stamp_paid?: boolean;
  show_qris?: boolean;
  issue_date: string;
  due_date?: string | null;
  type?: string | null;
}

export interface BusinessDetail {
  name: string;
  address?: string | null;
  logo_url?: string | null;
  qris_url?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
}

export interface CustomerDetail {
  name: string;
  address?: string | null;
}

interface InvoiceTemplateProps {
  templateId: string;
  templateColor: string;
  invoice: InvoiceDetail;
  items: InvoiceItem[];
  business: BusinessDetail;
  customer: CustomerDetail;
  locale: "id" | "en";
}

export default function InvoiceTemplate({
  templateId,
  templateColor = "#004de6",
  invoice,
  items,
  business,
  customer,
  locale = "id",
}: InvoiceTemplateProps) {
  const isPaid = invoice.status === "paid";

  const t = (key: string) => {
    const dict: Record<string, Record<string, string>> = {
      id: {
        billTo: "Ditagihkan Kepada:",
        billFrom: "Dari:",
        date: "Tanggal:",
        dueDate: "Jatuh Tempo:",
        currency: "Mata Uang:",
        subtotal: "Subtotal",
        discount: "Diskon",
        tax: "PPN (11%)",
        total: "Total Tagihan",
        paymentInstructions: "Instruksi Pembayaran:",
        notes: "Catatan:",
        signatureTitle: "Hormat Kami,",
        itemDesc: "Deskripsi Item",
        qty: "Jumlah",
        price: "Harga Satuan",
        subtotalCol: "Subtotal",
        paidLabel: "Lunas",
        phone: "Telp",
        paidAmount: "Jumlah Terbayar",
        remainingAmount: "Sisa Tagihan",
      },
      en: {
        billTo: "Billed To:",
        billFrom: "From:",
        date: "Date:",
        dueDate: "Due Date:",
        currency: "Currency:",
        subtotal: "Subtotal",
        discount: "Discount",
        tax: "Tax (11%)",
        total: "Total Amount",
        paymentInstructions: "Payment Instructions:",
        notes: "Notes:",
        signatureTitle: "Authorized Signature,",
        itemDesc: "Item Description",
        qty: "Qty",
        price: "Unit Price",
        subtotalCol: "Subtotal",
        paidLabel: "Paid",
        phone: "Phone",
        paidAmount: "Amount Paid",
        remainingAmount: "Remaining Balance",
      },
    };
    return dict[locale]?.[key] || dict["id"][key] || key;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: invoice.currency || "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const renderTaxRows = (className: string = "flex justify-between text-slate-500", valClassName?: string) => {
    if (invoice.taxes_snapshot && Array.isArray(invoice.taxes_snapshot) && invoice.taxes_snapshot.length > 0) {
      return invoice.taxes_snapshot.map((tax: any, idx: number) => {
        const taxLabel = tax.name || (tax.rate ? `PPN (${tax.rate}%)` : t("tax"));
        const taxAmount = Number(tax.amount || 0);
        if (taxAmount <= 0) return null;
        return (
          <div key={idx} className={className}>
            <span>{taxLabel}</span>
            <span className={valClassName}>{formatCurrency(taxAmount)}</span>
          </div>
        );
      });
    }

    if (invoice.taxes_amount > 0) {
      return (
        <div className={className}>
          <span>{t("tax")}</span>
          <span className={valClassName}>{formatCurrency(invoice.taxes_amount)}</span>
        </div>
      );
    }
    return null;
  };

  const renderPPh23Row = (className: string = "flex justify-between text-slate-500 font-medium", valClassName: string = "text-rose-600 font-medium") => {
    if (invoice.pph23_amount !== undefined && invoice.pph23_amount > 0) {
      return (
        <div className={className}>
          <span>PPh 23 (2%)</span>
          <span className={valClassName}>-{formatCurrency(invoice.pph23_amount)}</span>
        </div>
      );
    }
    return null;
  };

  const renderAdjustmentRows = (className: string = "flex justify-between text-slate-500", valClassName?: string) => {
    if (!invoice.adjustments || !Array.isArray(invoice.adjustments) || invoice.adjustments.length === 0) {
      return null;
    }
    return invoice.adjustments.map((adj, idx) => {
      const isNegative = adj.value < 0;
      return (
        <div key={idx} className={className}>
          <span>{adj.name}</span>
          <span className={isNegative ? "text-rose-600 font-medium" : valClassName}>
            {isNegative ? `-${formatCurrency(Math.abs(adj.value))}` : `+${formatCurrency(adj.value)}`}
          </span>
        </div>
      );
    });
  };

  const stampPaid = invoice.stamp_paid || isPaid;

  // Paid Stamp is now replaced by watermark in the center
  const PaidStamp = () => null;

  // Unpaid/Paid Watermark
  const UnpaidWatermark = () => {
    if (invoice.type === "quotation") return null;

    if (stampPaid) {
      return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0 opacity-[0.05] print:opacity-[0.05]">
          <span className="text-[70px] md:text-[100px] font-black tracking-widest uppercase -rotate-[35deg] text-emerald-600 border-8 border-emerald-600/30 px-6 py-3 rounded-3xl">
            {locale === "en" ? "PAID" : "LUNAS"}
          </span>
        </div>
      );
    }

    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0 opacity-[0.05] print:opacity-[0.05]">
        <span className="text-[70px] md:text-[100px] font-black tracking-widest uppercase -rotate-[35deg] text-rose-600 border-8 border-rose-600/30 px-6 py-3 rounded-3xl">
          {locale === "en" ? "UNPAID" : "BELUM LUNAS"}
        </span>
      </div>
    );
  };

  // QRIS Payment Block
  const QrisPaymentBlock = () =>
    invoice.show_qris && business.qris_url ? (
      <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col items-center justify-center text-center max-w-[180px] shrink-0 no-print-break">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">QRIS Payment</span>
        <img
          src={business.qris_url}
          alt="QRIS QR Code"
          className="w-28 h-28 object-contain bg-white border border-slate-200 p-1 rounded-xl shadow-xs"
        />
        <span className="text-[8px] font-bold text-slate-500 mt-1.5">Scan to Pay / Pindai</span>
      </div>
    ) : null;

  // Business contact information joined block
  const renderBusinessContactInfo = (colorClass: string = "text-slate-400") => {
    const details = [
      business.phone && `${t("phone")}: ${business.phone}`,
      business.email && `Email: ${business.email}`,
      business.website && `Web: ${business.website}`,
    ].filter(Boolean);

    if (details.length === 0) return null;
    return (
      <p className={`text-[9px] mt-1.5 font-medium leading-none ${colorClass}`}>
        {details.join("  |  ")}
      </p>
    );
  };

  // Get dynamic header title based on type (Invoice / Quotation)
  const getHeaderTitle = (defaultTitle: string) => {
    if (invoice.type === "quotation") {
      return locale === "en" ? "QUOTATION" : "PENAWARAN";
    }
    return defaultTitle;
  };

  const templateHtml = (() => {
    switch (templateId) {
    // ==========================================
    // 1. STANDARD: MODERN
    // ==========================================
    case "modern":
    default:
      return (
        <div className="space-y-6 relative">
          <PaidStamp />
          <UnpaidWatermark />

          {/* Header */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-3">
              {business.logo_url && (
                <img
                  src={business.logo_url}
                  alt="Logo"
                  className="w-12 h-12 object-contain bg-white border border-slate-200 rounded-lg p-1"
                />
              )}
              <div>
                <h4 className="text-xl font-extrabold tracking-tight" style={{ color: templateColor }}>
                  {business.name || "Nama Bisnis"}
                </h4>
                <p className="text-[10px] text-slate-500 whitespace-pre-line mt-1 max-w-[280px]">
                  {business.address || "Alamat Bisnis"}
                </p>
                {renderBusinessContactInfo()}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-black uppercase text-slate-400 tracking-wide">{getHeaderTitle("Invoice")}</h2>
              <p className="text-xs font-mono font-bold text-slate-700 mt-1">
                {invoice.invoice_number || "INV-XXXX"}
              </p>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {t("billTo")}
              </span>
              <p className="font-bold text-slate-800 mt-1">{customer.name || "Nama Pelanggan"}</p>
              <p className="text-slate-500 text-[10px] mt-0.5 whitespace-pre-line leading-relaxed">
                {customer.address || "Alamat Pelanggan"}
              </p>
            </div>
            <div className="text-right space-y-1">
              <p>
                <span className="text-slate-400">{t("date")}</span>{" "}
                <span className="font-semibold">{invoice.issue_date}</span>
              </p>
              {invoice.due_date && (
                <p>
                  <span className="text-slate-400">{t("dueDate")}</span>{" "}
                  <span className="font-semibold text-slate-900">{invoice.due_date}</span>
                </p>
              )}
              <p>
                <span className="text-slate-400">{t("currency")}</span>{" "}
                <span className="font-bold uppercase">{invoice.currency}</span>
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="w-full overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs text-left min-w-[500px] sm:min-w-0">
              <thead>
                <tr className="text-white" style={{ backgroundColor: templateColor }}>
                  <th className="p-2.5 rounded-l-md">{t("itemDesc")}</th>
                  <th className="p-2.5 text-center">{t("qty")}</th>
                  <th className="p-2.5 text-right">{t("price")}</th>
                  <th className="p-2.5 text-right rounded-r-md">{t("subtotalCol")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-2">
                      <p className="font-bold text-slate-800">{item.name || "Nama Item"}</p>
                      {item.description && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center font-semibold text-slate-700">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-600">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-slate-800">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="flex justify-end pt-4">
            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>{t("subtotal")}</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>{t("discount")}</span>
                  <span>-{formatCurrency(invoice.discount_amount)}</span>
                </div>
              )}
              {renderTaxRows("flex justify-between text-slate-500")}
              {renderPPh23Row("flex justify-between text-slate-500")}
              {invoice.shipping_amount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>{invoice.shipping_label || "Shipping"}</span>
                  <span>{formatCurrency(invoice.shipping_amount)}</span>
                </div>
              )}
              {renderAdjustmentRows("flex justify-between text-slate-500")}
              <div
                className="flex justify-between font-extrabold text-sm border-t border-slate-100 pt-2"
                style={{ color: templateColor }}
              >
                <span>{t("total")}</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
              {invoice.paid_amount !== undefined && invoice.paid_amount > 0 && (
                <>
                  <div className="flex justify-between text-slate-500 font-medium pt-1.5">
                    <span>{t("paidAmount")}</span>
                    <span className="text-emerald-600 font-bold">-{formatCurrency(invoice.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm border-t border-slate-100 pt-1.5 text-rose-600">
                    <span>{t("remainingAmount")}</span>
                    <span>{formatCurrency(invoice.remaining_amount ?? (invoice.total_amount - invoice.paid_amount))}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footers */}
          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row justify-between items-center sm:items-end text-[10px] text-slate-400 gap-6">
            <div className="flex gap-4 items-start">
              <div>
                {invoice.payment_instructions && (
                  <div className="mb-2">
                    <p className="font-bold text-slate-600 mb-1">{t("paymentInstructions")}</p>
                    <p className="whitespace-pre-line leading-relaxed max-w-[280px]">
                      {invoice.payment_instructions}
                    </p>
                  </div>
                )}
                {invoice.notes && (
                  <div>
                    <p className="font-bold text-slate-600 mb-1">{t("notes")}</p>
                    <p className="whitespace-pre-line leading-relaxed max-w-[280px]">{invoice.notes}</p>
                  </div>
                )}
              </div>
              <QrisPaymentBlock />
            </div>
            <div className="text-center font-bold shrink-0">
              <p className="mb-4">{t("signatureTitle")}</p>
              {invoice.signature_url && (
                <img
                  src={invoice.signature_url}
                  alt="Signature"
                  className="h-12 object-contain mx-auto mb-2"
                />
              )}
              <p className="text-slate-700 border-t border-slate-200 pt-1 w-28 mx-auto">
                {invoice.signature_text || ""}
              </p>
            </div>
          </div>
        </div>
      );

    // ==========================================
    // 2. STANDARD: CLASSIC
    // ==========================================
    case "classic":
      return (
        <div className="space-y-6 relative font-serif">
          <PaidStamp />
          <UnpaidWatermark />

          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold uppercase tracking-wide text-slate-800">
              {getHeaderTitle("Faktur / Invoice")}
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              No: {invoice.invoice_number || "INV-XXXX"}
            </p>
          </div>

          <hr className="border-double border-t-4 border-slate-300" />

          <div className="grid grid-cols-2 gap-6 text-xs">
            <div className="flex items-start gap-2">
              {business.logo_url && (
                <img
                  src={business.logo_url}
                  alt="Logo"
                  className="w-10 h-10 object-contain bg-white border rounded"
                />
              )}
              <div>
                <p className="font-bold uppercase text-slate-400 tracking-wider">
                  {t("billFrom")}
                </p>
                <p className="font-bold text-slate-900 mt-1">{business.name}</p>
                <p className="text-slate-500 whitespace-pre-line mt-1">{business.address}</p>
                {renderBusinessContactInfo("text-slate-400 font-mono")}
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold uppercase text-slate-400 tracking-wider">
                {t("billTo")}
              </p>
              <p className="font-bold text-slate-950 mt-1">{customer.name || "Nama Pelanggan"}</p>
              <p className="text-slate-500 whitespace-pre-line mt-1">{customer.address}</p>
            </div>
          </div>

           <div className="w-full overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs border-collapse min-w-[500px] sm:min-w-0">
              <thead>
                <tr className="border-y border-slate-300 text-slate-700 font-bold">
                  <th className="py-2 text-left">{t("itemDesc")}</th>
                  <th className="py-2 text-center">{t("qty")}</th>
                  <th className="py-2 text-right">{t("price")}</th>
                  <th className="py-2 text-right">{t("subtotalCol")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {items.map((item, idx) => (
                  <tr key={idx} className="text-slate-800">
                    <td className="py-2.5">
                      <span className="font-semibold">{item.name || "Nama Item"}</span>
                      {item.description && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.description}</p>
                      )}
                    </td>
                    <td className="py-2.5 text-center font-mono">{item.quantity}</td>
                    <td className="py-2.5 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                    <td className="py-2.5 text-right font-bold font-mono">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-4">
            <div className="w-64 space-y-2 text-xs border-t border-slate-300 pt-2 font-mono">
              <div className="flex justify-between">
                <span>{t("subtotal")}</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span>{t("discount")}</span>
                  <span>-{formatCurrency(invoice.discount_amount)}</span>
                </div>
              )}
              {renderTaxRows("flex justify-between")}
              {renderPPh23Row("flex justify-between")}
              {invoice.shipping_amount > 0 && (
                <div className="flex justify-between">
                  <span>{invoice.shipping_label || "Shipping"}</span>
                  <span>{formatCurrency(invoice.shipping_amount)}</span>
                </div>
              )}
              {renderAdjustmentRows("flex justify-between")}
              <div className="flex justify-between font-extrabold text-sm border-t border-slate-300 pt-2 text-slate-900">
                <span>{t("total")}</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
              {invoice.paid_amount !== undefined && invoice.paid_amount > 0 && (
                <>
                  <div className="flex justify-between text-slate-500 pt-1.5">
                    <span>{t("paidAmount")}</span>
                    <span className="text-emerald-600">-{formatCurrency(invoice.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm border-t border-slate-300 pt-1.5 text-rose-600">
                    <span>{t("remainingAmount")}</span>
                    <span>{formatCurrency(invoice.remaining_amount ?? (invoice.total_amount - invoice.paid_amount))}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 flex justify-between items-end text-[10px] text-slate-500">
            <div className="flex gap-4 items-start">
              <div>
                {invoice.payment_instructions && (
                  <div className="mb-2">
                    <p className="font-bold text-slate-700 mb-1">{t("paymentInstructions")}</p>
                    <p className="whitespace-pre-line leading-relaxed max-w-[280px]">
                      {invoice.payment_instructions}
                    </p>
                  </div>
                )}
                {invoice.notes && (
                  <div>
                    <p className="font-bold text-slate-700 mb-1">{t("notes")}</p>
                    <p className="whitespace-pre-line leading-relaxed max-w-[280px]">{invoice.notes}</p>
                  </div>
                )}
              </div>
              <QrisPaymentBlock />
            </div>
            <div className="text-center font-bold shrink-0">
              <p className="mb-4">{t("signatureTitle")}</p>
              {invoice.signature_url && (
                <img
                  src={invoice.signature_url}
                  alt="Signature"
                  className="h-10 object-contain mx-auto mb-2"
                />
              )}
              <p className="text-slate-800 border-t border-slate-300 pt-1 w-28 mx-auto">
                {invoice.signature_text || ""}
              </p>
            </div>
          </div>
        </div>
      );

    // ==========================================
    // 3. STANDARD: MINIMAL
    // ==========================================
    case "minimal":
      return (
        <div className="space-y-6 text-xs text-slate-900 tracking-tight relative font-sans">
          <PaidStamp />
          <UnpaidWatermark />

          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {business.logo_url && (
                <img src={business.logo_url} alt="Logo" className="w-8 h-8 object-contain" />
              )}
              <div>
                <h3 className="font-black text-base uppercase">{business.name}</h3>
                <p className="text-slate-500 mt-0.5 whitespace-pre-line leading-normal">{business.address}</p>
                {renderBusinessContactInfo()}
              </div>
            </div>
            <div className="text-right">
              <h4 className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">{getHeaderTitle("Faktur")}</h4>
              <p className="font-mono mt-0.5 font-bold">{invoice.invoice_number}</p>
            </div>
          </div>

          <div className="h-[1px] bg-slate-200" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold text-slate-400">{t("billTo")}</p>
              <p className="font-bold mt-1 text-slate-800">{customer.name || "Nama Pelanggan"}</p>
              <p className="text-slate-500 mt-0.5 whitespace-pre-line">{customer.address}</p>
            </div>
            <div className="text-right">
              <p>
                <span className="text-slate-400">{t("date")}</span> {invoice.issue_date}
              </p>
              {invoice.due_date && (
                <p className="mt-1">
                  <span className="text-slate-400">{t("dueDate")}</span> {invoice.due_date}
                </p>
              )}
            </div>
          </div>

          <div className="h-[1px] bg-slate-200" />

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-800">{item.name || "Nama Item"}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {item.quantity} {item.unit} x {formatCurrency(item.unit_price)}
                  </p>
                </div>
                <span className="font-bold font-mono text-slate-800">
                  {formatCurrency(item.subtotal)}
                </span>
              </div>
            ))}
          </div>

          <div className="h-[1px] bg-slate-200" />

          <div className="flex justify-end pt-2">
            <div className="w-56 space-y-1.5 font-mono text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>{t("subtotal")}</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span>{t("discount")}</span>
                  <span>-{formatCurrency(invoice.discount_amount)}</span>
                </div>
              )}
              {renderTaxRows("flex justify-between")}
              {renderPPh23Row("flex justify-between")}
              {invoice.shipping_amount > 0 && (
                <div className="flex justify-between">
                  <span>{invoice.shipping_label || "Shipping"}</span>
                  <span>{formatCurrency(invoice.shipping_amount)}</span>
                </div>
              )}
              {renderAdjustmentRows("flex justify-between")}
              <div className="flex justify-between font-bold text-xs pt-1.5 text-black border-t border-slate-900">
                <span>{t("total")}</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
              {invoice.paid_amount !== undefined && invoice.paid_amount > 0 && (
                <>
                  <div className="flex justify-between text-slate-500 pt-1.5">
                    <span>{t("paidAmount")}</span>
                    <span className="text-emerald-600">-{formatCurrency(invoice.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs pt-1.5 text-rose-600 border-t border-slate-900">
                    <span>{t("remainingAmount")}</span>
                    <span>{formatCurrency(invoice.remaining_amount ?? (invoice.total_amount - invoice.paid_amount))}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 flex justify-between items-end text-[10px] text-slate-400">
            <div className="flex gap-4 items-start">
              <div>
                {invoice.payment_instructions && (
                  <div className="mb-2">
                    <p className="font-bold text-slate-600 mb-1">{t("paymentInstructions")}</p>
                    <p className="whitespace-pre-line leading-relaxed max-w-[280px]">
                      {invoice.payment_instructions}
                    </p>
                  </div>
                )}
                {invoice.notes && (
                  <div>
                    <p className="font-bold text-slate-600 mb-1">{t("notes")}</p>
                    <p className="whitespace-pre-line leading-relaxed max-w-[280px]">{invoice.notes}</p>
                  </div>
                )}
              </div>
              <QrisPaymentBlock />
            </div>
            <div className="text-center font-bold shrink-0">
              <p className="mb-4">{t("signatureTitle")}</p>
              {invoice.signature_url && (
                <img
                  src={invoice.signature_url}
                  alt="Signature"
                  className="h-10 object-contain mx-auto mb-2"
                />
              )}
              <p className="text-slate-800 border-t border-slate-200 pt-1 w-24 mx-auto font-bold">
                {invoice.signature_text || ""}
              </p>
            </div>
          </div>
        </div>
      );

    // ==========================================
    // 4. PREMIUM: ELEGANT SIDEBAR (premium_elegant)
    // ==========================================
    case "premium_elegant":
      return (
        <div className="relative pl-6 space-y-6 font-sans text-slate-800 bg-white" style={{ borderLeft: `8px solid ${templateColor}` }}>
          <PaidStamp />
          <UnpaidWatermark />

          {/* Premium Header */}
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-2">
              {business.logo_url && (
                <img src={business.logo_url} alt="Logo" className="w-16 h-16 object-contain bg-slate-50 rounded-xl p-1.5 border border-slate-100" />
              )}
              <div>
                <h3 className="text-xl font-extrabold tracking-tight" style={{ color: templateColor }}>{business.name}</h3>
                <p className="text-[10px] text-slate-500 whitespace-pre-line mt-1 max-w-sm font-light leading-relaxed">{business.address}</p>
                {renderBusinessContactInfo()}
              </div>
            </div>
            <div className="text-right space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">{getHeaderTitle("TAX INVOICE")}</span>
              <h1 className="text-2xl font-black font-mono tracking-tight" style={{ color: templateColor }}>#{invoice.invoice_number || "INV-XXXX"}</h1>
              <div className="inline-flex gap-2 text-[10px] bg-slate-50 px-2 py-1 rounded-md border border-slate-100 text-slate-500">
                <span>{t("date")} <strong>{invoice.issue_date}</strong></span>
                {invoice.due_date && <span>| {t("dueDate")} <strong>{invoice.due_date}</strong></span>}
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-slate-100" />

          {/* Client Details Card */}
          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/80 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">{t("billTo")}</span>
              <p className="font-black text-slate-800 text-sm mt-1.5">{customer.name || "Nama Pelanggan"}</p>
              <p className="text-slate-500 text-[10px] mt-1 whitespace-pre-line leading-relaxed">{customer.address}</p>
            </div>
            <div className="text-right flex flex-col justify-between">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">METRIC DETAILS</span>
              <div className="mt-2 space-y-1 text-[10px] text-slate-500 font-medium">
                <p>{t("currency")} <strong className="text-slate-800 uppercase">{invoice.currency}</strong></p>
                <p>{t("status") || "Status"}: <strong className="text-slate-800 uppercase">{invoice.status}</strong></p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="w-full overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs text-left min-w-[500px] sm:min-w-0">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-400 font-extrabold text-[9px] uppercase tracking-wider">
                  <th className="py-3 px-1">{t("itemDesc")}</th>
                  <th className="py-3 px-1 text-center">{t("qty")}</th>
                  <th className="py-3 px-1 text-right">{t("price")}</th>
                  <th className="py-3 px-1 text-right">{t("subtotalCol")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40 transition">
                    <td className="py-3 px-1">
                      <p className="font-extrabold text-slate-800 text-sm">{item.name || "Nama Item"}</p>
                      {item.description && <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{item.description}</p>}
                    </td>
                    <td className="py-3 px-1 text-center font-bold text-slate-600">{item.quantity} {item.unit}</td>
                    <td className="py-3 px-1 text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 px-1 text-right font-black text-slate-900">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Elegant Summary Block */}
          <div className="flex flex-col sm:flex-row justify-between items-start pt-4 border-t border-slate-100 gap-6">
            <div className="text-[10px] text-slate-400 leading-relaxed max-w-full sm:max-w-sm space-y-3 flex flex-col sm:flex-row gap-4 items-start">
              <div>
                {invoice.payment_instructions && (
                  <div>
                    <span className="font-bold text-slate-500 block uppercase tracking-wider mb-1">{t("paymentInstructions")}</span>
                    <p className="whitespace-pre-line font-medium">{invoice.payment_instructions}</p>
                  </div>
                )}
              </div>
              <QrisPaymentBlock />
            </div>

            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>{t("subtotal")}</span>
                <span className="font-bold">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>{t("discount")}</span>
                  <span className="font-bold text-rose-600">-{formatCurrency(invoice.discount_amount)}</span>
                </div>
              )}
              {renderTaxRows("flex justify-between text-slate-500", "font-bold")}
              {renderPPh23Row("flex justify-between text-slate-500", "font-bold text-rose-600")}
              {invoice.shipping_amount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>{invoice.shipping_label || "Shipping"}</span>
                  <span className="font-bold">{formatCurrency(invoice.shipping_amount)}</span>
                </div>
              )}
              {renderAdjustmentRows("flex justify-between text-slate-500", "font-bold")}
              <div className="flex justify-between font-black text-base border-t border-slate-200 pt-2.5" style={{ color: templateColor }}>
                <span>{t("total")}</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
              {invoice.paid_amount !== undefined && invoice.paid_amount > 0 && (
                <>
                  <div className="flex justify-between text-slate-500 font-medium pt-1.5">
                    <span>{t("paidAmount")}</span>
                    <span className="text-emerald-600 font-bold">-{formatCurrency(invoice.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between font-black text-base border-t border-slate-200 pt-2.5 text-rose-600">
                    <span>{t("remainingAmount")}</span>
                    <span>{formatCurrency(invoice.remaining_amount ?? (invoice.total_amount - invoice.paid_amount))}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Signature and notes */}
          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row justify-between items-center sm:items-end text-[10px] text-slate-400 gap-6">
            <div>
              {invoice.notes && (
                <div>
                  <span className="font-bold text-slate-500 block uppercase tracking-wider mb-1">{t("notes")}</span>
                  <p className="whitespace-pre-line leading-relaxed max-w-xs">{invoice.notes}</p>
                </div>
              )}
            </div>
            <div className="text-center font-bold shrink-0">
              <p className="mb-3 italic font-medium">{t("signatureTitle")}</p>
              {invoice.signature_url && (
                <img src={invoice.signature_url} alt="Signature" className="h-10 object-contain mx-auto mb-1.5" />
              )}
              <p className="text-slate-800 border-t border-slate-200 pt-1.5 w-28 mx-auto font-black uppercase tracking-wider">{invoice.signature_text || ""}</p>
            </div>
          </div>
        </div>
      );

    // ==========================================
    // 5. PREMIUM: BOLD STARTUP (premium_bold)
    // ==========================================
    case "premium_bold":
      return (
        <div className="relative space-y-6 font-sans text-slate-800 bg-white rounded-2xl overflow-hidden border border-slate-200">
          <PaidStamp />
          <UnpaidWatermark />

          {/* Full-width Accent Color Header */}
          <div className="p-6 text-white flex justify-between items-start gap-4" style={{ backgroundColor: templateColor }}>
            <div className="space-y-3">
              {business.logo_url && (
                <img src={business.logo_url} alt="Logo" className="w-14 h-14 object-contain bg-white rounded-xl p-1.5" />
              )}
              <div>
                <h2 className="text-2xl font-black tracking-tight leading-none">{business.name}</h2>
                <p className="text-[10px] text-white/80 whitespace-pre-line mt-1.5 max-w-sm font-medium">{business.address}</p>
                {renderBusinessContactInfo("text-white/70")}
              </div>
            </div>
            <div className="text-right space-y-2">
              <h1 className="text-3xl font-black tracking-widest uppercase opacity-90">{getHeaderTitle("INVOICE")}</h1>
              <p className="text-sm font-mono font-bold bg-white/10 px-3 py-1 rounded-lg inline-block">#{invoice.invoice_number || "INV-XXXX"}</p>
            </div>
          </div>

          <div className="px-6 space-y-6">
            {/* Details Split */}
            <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-100 pb-5">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{t("billTo")}</span>
                <p className="font-extrabold text-slate-800 text-sm mt-1">{customer.name || "Nama Pelanggan"}</p>
                <p className="text-slate-500 text-[10px] mt-0.5 whitespace-pre-line leading-relaxed">{customer.address}</p>
              </div>
              <div className="text-right space-y-1 font-medium text-slate-500">
                <p>{t("date")} <strong className="text-slate-800">{invoice.issue_date}</strong></p>
                {invoice.due_date && <p>{t("dueDate")} <strong className="text-slate-800">{invoice.due_date}</strong></p>}
                <p>{t("currency")} <strong className="text-slate-800 uppercase">{invoice.currency}</strong></p>
              </div>
            </div>

            {/* Table */}
            <div className="w-full overflow-x-auto scrollbar-thin">
              <table className="w-full text-xs text-left min-w-[500px] sm:min-w-0">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[9px] tracking-wider rounded-lg">
                    <th className="py-2.5 px-3 rounded-l-lg">{t("itemDesc")}</th>
                    <th className="py-2.5 px-3 text-center">{t("qty")}</th>
                    <th className="py-2.5 px-3 text-right">{t("price")}</th>
                    <th className="py-2.5 px-3 text-right rounded-r-lg">{t("subtotalCol")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-3">
                        <p className="font-extrabold text-slate-800 text-sm">{item.name || "Nama Item"}</p>
                        {item.description && <p className="text-[10px] text-slate-400 mt-0.5">{item.description}</p>}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-600">{item.quantity} {item.unit}</td>
                      <td className="py-3.5 px-3 text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                      <td className="py-3.5 px-3 text-right font-extrabold text-slate-900">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-4 text-[10px] text-slate-400 flex gap-4 items-start justify-between">
                <div>
                  {invoice.payment_instructions && (
                    <div>
                      <span className="font-bold text-slate-600 block uppercase tracking-wider mb-1">{t("paymentInstructions")}</span>
                      <p className="whitespace-pre-line leading-relaxed font-medium">{invoice.payment_instructions}</p>
                    </div>
                  )}
                  {invoice.notes && (
                    <div className="mt-4">
                      <span className="font-bold text-slate-600 block uppercase tracking-wider mb-1">{t("notes")}</span>
                      <p className="whitespace-pre-line leading-relaxed">{invoice.notes}</p>
                    </div>
                  )}
                </div>
                <QrisPaymentBlock />
              </div>

              <div className="w-full space-y-2 text-xs md:pl-12">
                <div className="flex justify-between text-slate-500">
                  <span>{t("subtotal")}</span>
                  <span className="font-bold">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>{t("discount")}</span>
                    <span className="font-bold text-rose-600">-{formatCurrency(invoice.discount_amount)}</span>
                  </div>
                )}
                {renderTaxRows("flex justify-between text-slate-500", "font-bold")}
                {renderPPh23Row("flex justify-between text-slate-500", "font-bold text-rose-600")}
                {invoice.shipping_amount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>{invoice.shipping_label || "Shipping"}</span>
                    <span className="font-bold">{formatCurrency(invoice.shipping_amount)}</span>
                  </div>
                )}
                {renderAdjustmentRows("flex justify-between text-slate-500", "font-bold")}
                <div className="flex justify-between font-black text-base border-t-2 border-slate-200 pt-2.5" style={{ color: templateColor }}>
                  <span>{t("total")}</span>
                  <span>{formatCurrency(invoice.total_amount)}</span>
                </div>
                {invoice.paid_amount !== undefined && invoice.paid_amount > 0 && (
                  <>
                    <div className="flex justify-between text-slate-500 font-medium pt-1.5">
                      <span>{t("paidAmount")}</span>
                      <span className="text-emerald-600 font-bold">-{formatCurrency(invoice.paid_amount)}</span>
                    </div>
                    <div className="flex justify-between font-black text-base border-t border-slate-200 pt-2.5 text-rose-600">
                      <span>{t("remainingAmount")}</span>
                      <span>{formatCurrency(invoice.remaining_amount ?? (invoice.total_amount - invoice.paid_amount))}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Signature row */}
            <div className="border-t border-slate-100 py-6 flex justify-end">
              <div className="text-center font-bold w-36">
                <p className="mb-3 text-[10px] text-slate-400">{t("signatureTitle")}</p>
                {invoice.signature_url && (
                  <img src={invoice.signature_url} alt="Signature" className="h-10 object-contain mx-auto mb-1.5" />
                )}
                <p className="text-slate-800 border-t border-slate-200 pt-1.5 text-xs font-black uppercase tracking-wider">{invoice.signature_text || ""}</p>
              </div>
            </div>
          </div>
        </div>
      );

    // ==========================================
    // 6. PREMIUM: COMPACT 2-COLUMN (premium_compact)
    // ==========================================
    case "premium_compact":
      return (
        <div className="relative space-y-6 font-sans text-slate-800 bg-white p-2">
          <PaidStamp />
          <UnpaidWatermark />

          {/* Grid Layout: Header & Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start border-b border-slate-200 pb-5">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                {business.logo_url && (
                  <img src={business.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded-lg border border-slate-100 p-0.5" />
                )}
                <h2 className="text-lg font-black tracking-tight" style={{ color: templateColor }}>{business.name}</h2>
              </div>
              <p className="text-[10px] text-slate-500 whitespace-pre-line leading-relaxed max-w-sm">{business.address}</p>
              {renderBusinessContactInfo()}
            </div>
            <div className="text-left md:text-right space-y-1">
              <h1 className="text-xl font-black uppercase tracking-wider text-slate-400">{getHeaderTitle("FAKTUR TAGIHAN")}</h1>
              <p className="text-xs font-mono font-bold text-slate-800">No. {invoice.invoice_number || "INV-XXXX"}</p>
              <div className="text-[10px] text-slate-500 space-y-0.5 pt-1">
                <p>{t("date")} <strong>{invoice.issue_date}</strong></p>
                {invoice.due_date && <p>{t("dueDate")} <strong>{invoice.due_date}</strong></p>}
              </div>
            </div>
          </div>

          {/* Split Panel Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left side: Bill info & Payment instructions */}
            <div className="space-y-4 md:border-r md:border-slate-100 md:pr-6">
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">{t("billTo")}</span>
                <p className="font-extrabold text-slate-800 text-sm mt-1">{customer.name || "Nama Pelanggan"}</p>
                <p className="text-slate-500 text-[10px] mt-1 whitespace-pre-line leading-relaxed">{customer.address}</p>
              </div>

              {invoice.payment_instructions && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">{t("paymentInstructions")}</span>
                  <p className="text-[10px] text-slate-500 whitespace-pre-line leading-relaxed mt-1 font-medium">{invoice.payment_instructions}</p>
                </div>
              )}

              {invoice.notes && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">{t("notes")}</span>
                  <p className="text-[10px] text-slate-500 whitespace-pre-line leading-relaxed mt-1">{invoice.notes}</p>
                </div>
              )}

              {invoice.show_qris && business.qris_url && (
                <div className="pt-3 border-t border-slate-100 flex justify-center md:justify-start">
                  <QrisPaymentBlock />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 text-center md:text-left">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">{t("signatureTitle")}</span>
                {invoice.signature_url && (
                  <img src={invoice.signature_url} alt="Signature" className="h-10 object-contain mx-auto md:mx-0 mb-1" />
                )}
                <p className="text-slate-800 border-t border-slate-150 pt-1.5 text-[11px] font-black uppercase tracking-wider inline-block min-w-[100px]">{invoice.signature_text || ""}</p>
              </div>
            </div>

            {/* Right side: Items table and Totals */}
            <div className="md:col-span-2 space-y-4">
              <div className="w-full overflow-x-auto scrollbar-thin">
                <table className="w-full text-[11px] text-left min-w-[400px] sm:min-w-0">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wide">
                      <th className="py-2">{t("itemDesc")}</th>
                      <th className="py-2 text-center">{t("qty")}</th>
                      <th className="py-2 text-right">{t("subtotalCol")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5">
                          <p className="font-bold text-slate-800">{item.name || "Nama Item"}</p>
                          {item.description && <p className="text-[9px] text-slate-400 mt-0.5">{item.description}</p>}
                        </td>
                        <td className="py-2.5 text-center font-semibold text-slate-600">{item.quantity} {item.unit}</td>
                        <td className="py-2.5 text-right font-bold text-slate-900">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-150/70 space-y-2 text-[11px] font-medium text-slate-500">
                <div className="flex justify-between">
                  <span>{t("subtotal")}</span>
                  <span className="font-bold text-slate-800">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between">
                    <span>{t("discount")}</span>
                    <span className="font-bold text-rose-600">-{formatCurrency(invoice.discount_amount)}</span>
                  </div>
                )}
                {renderTaxRows("flex justify-between", "font-bold text-slate-800")}
                {renderPPh23Row("flex justify-between", "font-bold text-rose-600")}
                {invoice.shipping_amount > 0 && (
                  <div className="flex justify-between">
                    <span>{invoice.shipping_label || "Shipping"}</span>
                    <span className="font-bold text-slate-800">{formatCurrency(invoice.shipping_amount)}</span>
                  </div>
                )}
                {renderAdjustmentRows("flex justify-between", "font-bold text-slate-800")}
                <div className="flex justify-between font-black text-sm border-t border-slate-200 pt-2.5" style={{ color: templateColor }}>
                  <span>{t("total")}</span>
                  <span>{formatCurrency(invoice.total_amount)}</span>
                </div>
                {invoice.paid_amount !== undefined && invoice.paid_amount > 0 && (
                  <>
                    <div className="flex justify-between text-slate-500 font-medium pt-1.5">
                      <span>{t("paidAmount")}</span>
                      <span className="text-emerald-600 font-bold">-{formatCurrency(invoice.paid_amount)}</span>
                    </div>
                    <div className="flex justify-between font-black text-sm border-t border-slate-200 pt-2.5 text-rose-600">
                      <span>{t("remainingAmount")}</span>
                      <span>{formatCurrency(invoice.remaining_amount ?? (invoice.total_amount - invoice.paid_amount))}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      );

    // ==========================================
    // 7. PREMIUM: CREATIVE SPLIT (premium_creative)
    // ==========================================
    case "premium_creative":
      return (
        <div className="relative space-y-6 font-sans text-slate-800 bg-white p-2">
          <PaidStamp />
          <UnpaidWatermark />

          {/* Creative Layout Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-100 pb-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md rotate-3 transition hover:rotate-0" style={{ backgroundColor: templateColor }}>
                {business.logo_url ? (
                  <img src={business.logo_url} alt="Logo" className="w-full h-full object-contain rounded-2xl p-1 bg-white" />
                ) : (
                  business.name ? business.name.charAt(0).toUpperCase() : "B"
                )}
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight" style={{ color: templateColor }}>{business.name}</h2>
                <p className="text-[10px] text-slate-400 mt-1 whitespace-pre-line leading-relaxed max-w-xs">{business.address}</p>
                {renderBusinessContactInfo()}
              </div>
            </div>
            
            <div className="text-left sm:text-right space-y-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 min-w-[200px]">
              <span className="px-2 py-0.5 text-[8px] font-extrabold text-white rounded-md uppercase tracking-wider inline-block" style={{ backgroundColor: templateColor }}>{getHeaderTitle("INVOICE BILL")}</span>
              <p className="text-xs font-mono font-bold text-slate-700 mt-1.5">{invoice.invoice_number || "INV-XXXX"}</p>
              <div className="text-[10px] text-slate-400 space-y-0.5 pt-1 leading-normal">
                <p>{t("date")} <strong className="text-slate-600">{invoice.issue_date}</strong></p>
                {invoice.due_date && <p>{t("dueDate")} <strong className="text-slate-600">{invoice.due_date}</strong></p>}
              </div>
            </div>
          </div>

          {/* Bill To Grid */}
          <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50/30 rounded-2xl p-4 border border-dashed border-slate-200">
            <div>
              <span className="text-[9px] font-extrabold tracking-widest uppercase text-slate-400 block">{t("billTo")}</span>
              <p className="font-extrabold text-slate-800 text-sm mt-1">{customer.name || "Nama Pelanggan"}</p>
              <p className="text-slate-500 text-[10px] mt-0.5 whitespace-pre-line leading-relaxed">{customer.address}</p>
            </div>
            <div className="text-right space-y-1 flex flex-col justify-end text-[10px] text-slate-400">
              <p>{t("currency")} <span className="font-bold text-slate-700 uppercase">{invoice.currency}</span></p>
            </div>
          </div>

          {/* Table */}
          <div className="w-full overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs text-left min-w-[500px] sm:min-w-0">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-400 font-extrabold text-[9px] uppercase tracking-wider">
                  <th className="py-2.5 px-1">{t("itemDesc")}</th>
                  <th className="py-2.5 px-1 text-center">{t("qty")}</th>
                  <th className="py-2.5 px-1 text-right">{t("price")}</th>
                  <th className="py-2.5 px-1 text-right">{t("subtotalCol")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-1">
                      <p className="font-bold text-slate-800 text-sm">{item.name || "Nama Item"}</p>
                      {item.description && <p className="text-[10px] text-slate-400 mt-0.5">{item.description}</p>}
                    </td>
                    <td className="py-3 px-1 text-center font-bold text-slate-500">{item.quantity} {item.unit}</td>
                    <td className="py-3 px-1 text-right text-slate-500">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 px-1 text-right font-black text-slate-800">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals split */}
          <div className="flex flex-col sm:flex-row justify-between items-start pt-4 border-t border-slate-100 gap-6">
            <div className="text-[10px] text-slate-400 leading-relaxed max-w-full sm:max-w-sm space-y-3 flex flex-col sm:flex-row gap-4 items-start">
              <div>
                {invoice.payment_instructions && (
                  <div>
                    <span className="font-bold text-slate-500 block uppercase tracking-wider mb-1">{t("paymentInstructions")}</span>
                    <p className="whitespace-pre-line leading-relaxed font-medium">{invoice.payment_instructions}</p>
                  </div>
                )}
              </div>
              <QrisPaymentBlock />
            </div>

            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>{t("subtotal")}</span>
                <span className="font-bold">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>{t("discount")}</span>
                  <span className="font-bold text-rose-600">-{formatCurrency(invoice.discount_amount)}</span>
                </div>
              )}
              {renderTaxRows("flex justify-between text-slate-500", "font-bold")}
              {renderPPh23Row("flex justify-between text-slate-500", "font-bold text-rose-600")}
              {invoice.shipping_amount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>{invoice.shipping_label || "Shipping"}</span>
                  <span className="font-bold">{formatCurrency(invoice.shipping_amount)}</span>
                </div>
              )}
              {renderAdjustmentRows("flex justify-between text-slate-500", "font-bold")}
              <div className="flex justify-between font-black text-base border-t border-slate-200 pt-2.5" style={{ color: templateColor }}>
                <span>{t("total")}</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
              {invoice.paid_amount !== undefined && invoice.paid_amount > 0 && (
                <>
                  <div className="flex justify-between text-slate-500 font-medium pt-1.5">
                    <span>{t("paidAmount")}</span>
                    <span className="text-emerald-600 font-bold">-{formatCurrency(invoice.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between font-black text-base border-t border-slate-200 pt-2.5 text-rose-600">
                    <span>{t("remainingAmount")}</span>
                    <span>{formatCurrency(invoice.remaining_amount ?? (invoice.total_amount - invoice.paid_amount))}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes & signature */}
          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row justify-between items-center sm:items-end text-[10px] text-slate-400 gap-6">
            <div>
              {invoice.notes && (
                <div>
                  <span className="font-bold text-slate-500 block uppercase tracking-wider mb-1">{t("notes")}</span>
                  <p className="whitespace-pre-line leading-relaxed max-w-xs">{invoice.notes}</p>
                </div>
              )}
            </div>
            <div className="text-center font-bold shrink-0">
              <p className="mb-4 italic text-[10px] text-slate-400">{t("signatureTitle")}</p>
              {invoice.signature_url && (
                <img src={invoice.signature_url} alt="Signature" className="h-10 object-contain mx-auto mb-1.5" />
              )}
              <p className="text-slate-800 border-t border-slate-200 pt-1.5 w-28 mx-auto font-black uppercase tracking-wider">{invoice.signature_text || ""}</p>
            </div>
          </div>
        </div>
      );

    // ==========================================
    // 8. PREMIUM: LUXURY GOLD/MINIMAL (premium_luxury)
    // ==========================================
    case "premium_luxury":
      return (
        <div className="relative space-y-6 font-sans text-slate-800 bg-white p-2">
          <PaidStamp />
          <UnpaidWatermark />

          {/* Double Gold/Color Thin Divider Top */}
          <div className="h-[2px] w-full" style={{ backgroundColor: templateColor }} />
          <div className="h-[1px] w-full mt-1 bg-slate-200" />

          {/* Luxury Header */}
          <div className="flex justify-between items-start gap-6 pt-3">
            <div className="space-y-3">
              {business.logo_url && (
                <img src={business.logo_url} alt="Logo" className="w-12 h-12 object-contain grayscale opacity-80" />
              )}
              <div>
                <h2 className="text-lg font-bold tracking-widest uppercase text-slate-900 leading-none">{business.name}</h2>
                <p className="text-[9px] text-slate-400 whitespace-pre-line mt-1.5 max-w-sm tracking-wide leading-relaxed">{business.address}</p>
                {renderBusinessContactInfo("text-slate-400 tracking-wider")}
              </div>
            </div>
            
            <div className="text-right space-y-1">
              <h1 className="text-2xl font-light tracking-widest text-slate-900 uppercase">{getHeaderTitle("FAKTUR")}</h1>
              <p className="text-xs font-mono font-bold text-slate-700 tracking-wider">#{invoice.invoice_number || "INV-XXXX"}</p>
              <div className="text-[9px] text-slate-400 space-y-0.5 pt-1 uppercase tracking-widest font-medium">
                <p>{t("date")} <strong>{invoice.issue_date}</strong></p>
                {invoice.due_date && <p>{t("dueDate")} <strong>{invoice.due_date}</strong></p>}
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-slate-200" />

          {/* Details split */}
          <div className="grid grid-cols-2 gap-4 text-xs font-medium">
            <div>
              <span className="text-[9px] font-bold tracking-widest uppercase text-slate-400 block">{t("billTo")}</span>
              <p className="font-bold text-slate-900 text-sm mt-1.5 tracking-wider">{customer.name || "Nama Pelanggan"}</p>
              <p className="text-slate-500 text-[10px] mt-1 whitespace-pre-line leading-relaxed tracking-wide">{customer.address}</p>
            </div>
            <div className="text-right flex flex-col justify-end text-[9px] text-slate-400 uppercase tracking-widest">
              <p>{t("currency")} <strong className="text-slate-900 font-bold">{invoice.currency}</strong></p>
            </div>
          </div>

          {/* Thin Lines Minimalist Table */}
          <div className="w-full overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs text-left border-collapse min-w-[500px] sm:min-w-0">
              <thead>
                <tr className="border-b border-slate-300 text-slate-400 font-bold text-[9px] uppercase tracking-widest">
                  <th className="py-2.5 px-1">{t("itemDesc")}</th>
                  <th className="py-2.5 px-1 text-center">{t("qty")}</th>
                  <th className="py-2.5 px-1 text-right">{t("price")}</th>
                  <th className="py-2.5 px-1 text-right">{t("subtotalCol")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30">
                    <td className="py-3 px-1">
                      <p className="font-bold text-slate-900 tracking-wide">{item.name || "Nama Item"}</p>
                      {item.description && <p className="text-[10px] text-slate-400 mt-0.5 tracking-normal leading-relaxed">{item.description}</p>}
                    </td>
                    <td className="py-3 px-1 text-center font-medium text-slate-500">{item.quantity} {item.unit}</td>
                    <td className="py-3 px-1 text-right text-slate-500 font-mono">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 px-1 text-right font-bold text-slate-900 font-mono">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary thin double line */}
          <div className="flex flex-col sm:flex-row justify-between items-start pt-4 border-t border-slate-200 gap-6">
            <div className="text-[9px] text-slate-400 leading-relaxed max-w-full sm:max-w-sm space-y-3 uppercase tracking-widest flex flex-col sm:flex-row gap-4 items-start">
              <div>
                {invoice.payment_instructions && (
                  <div>
                    <span className="font-bold text-slate-500 block mb-1">{t("paymentInstructions")}</span>
                    <p className="whitespace-pre-line font-medium leading-relaxed tracking-wider">{invoice.payment_instructions}</p>
                  </div>
                )}
              </div>
              <QrisPaymentBlock />
            </div>

            <div className="w-full sm:w-64 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-500">
                <span>{t("subtotal")}</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>{t("discount")}</span>
                  <span className="text-rose-600">-{formatCurrency(invoice.discount_amount)}</span>
                </div>
              )}
              {renderTaxRows("flex justify-between text-slate-500")}
              {renderPPh23Row("flex justify-between text-slate-500")}
              {invoice.shipping_amount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>{invoice.shipping_label || "Shipping"}</span>
                  <span>{formatCurrency(invoice.shipping_amount)}</span>
                </div>
              )}
              {renderAdjustmentRows("flex justify-between text-slate-500")}
              
              {/* Luxury Double Divider for Total */}
              <div className="h-[1px] w-full bg-slate-300 my-1" />
              <div className="flex justify-between font-black text-sm text-slate-900 pt-1">
                <span>{t("total")}</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
              <div className="h-[1px] w-full bg-slate-300" />
              {invoice.paid_amount !== undefined && invoice.paid_amount > 0 && (
                <>
                  <div className="flex justify-between text-slate-500 font-medium pt-1.5 uppercase tracking-widest text-[9px]">
                    <span>{t("paidAmount")}</span>
                    <span className="text-emerald-600 font-bold">-{formatCurrency(invoice.paid_amount)}</span>
                  </div>
                  <div className="h-[1px] w-full bg-slate-300 my-1" />
                  <div className="flex justify-between font-black text-sm text-rose-600 pt-1">
                    <span>{t("remainingAmount")}</span>
                    <span>{formatCurrency(invoice.remaining_amount ?? (invoice.total_amount - invoice.paid_amount))}</span>
                  </div>
                  <div className="h-[1px] w-full bg-slate-300" />
                </>
              )}
            </div>
          </div>

          {/* Luxury Signature Area */}
          <div className="pt-4 flex justify-between items-end text-[10px] text-slate-400">
            <div>
              {invoice.notes && (
                <div>
                  <span className="font-bold text-slate-500 block uppercase tracking-wider mb-1">{t("notes")}</span>
                  <p className="whitespace-pre-line leading-relaxed max-w-xs">{invoice.notes}</p>
                </div>
              )}
            </div>
            <div className="text-center shrink-0">
              <p className="mb-4 italic text-[9px] text-slate-400 uppercase tracking-widest">{t("signatureTitle")}</p>
              {invoice.signature_url && (
                <img src={invoice.signature_url} alt="Signature" className="h-10 object-contain mx-auto mb-1.5" />
              )}
              <p className="text-slate-900 border-t border-slate-200 pt-1.5 w-28 mx-auto font-bold uppercase tracking-wider text-[9px]">{invoice.signature_text || ""}</p>
            </div>
          </div>
        </div>
      );
  }
  })();

  return (
    <div className="relative flex flex-col justify-between h-full">
      <div className="flex-1">
        {templateHtml}
      </div>
      {/* Permanent Brand watermark */}
      <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col items-center justify-center gap-1 text-center select-none no-print-break">
        <div className="flex items-center gap-1.5 opacity-80">
          <LogoIcon className="w-4 h-4" />
          <span className="text-xs font-bold text-slate-800 tracking-tight">
            invoice<span className="text-blue-600">.co.id</span>
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">
          Business in our hands
        </span>
      </div>
    </div>
  );
}
