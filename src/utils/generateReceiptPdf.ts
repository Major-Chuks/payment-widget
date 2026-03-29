import { jsPDF } from "jspdf";
import { clipAmount, formatAddress } from "@/utils";

interface ReceiptData {
    amount: string;
    network: string;
    tokenSymbol?: string;
    txHash?: string;
    fromAddress?: string;
    toAddress?: string;
    explorerUrl?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS = {
    purple: "#783FE4",
    black: "#111827",
    grey: "#6B7280",
    lightGrey: "#9CA3AF",
    border: "#E5E7EB",
    rowBg: "#F9FAFB",
    green: "#22C55E",
    greenBg: "#DCFCE7",
    white: "#FFFFFF",
};

const PAGE_W = 595.28;   // A4 pt
const PAGE_H = 841.89;
const CARD_W = 420;
const CARD_X = (PAGE_W - CARD_W) / 2;
const CARD_PAD = 32;       // inner horizontal padding
const COL_L = CARD_X + CARD_PAD;
const COL_R = CARD_X + CARD_W - CARD_PAD;
const ROW_H = 36;       // height of each detail row
const ROW_PAD_V = 10;       // vertical text offset inside a row
const BOX_RADIUS = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function toRgb(hex: string): [number, number, number] {
    return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ];
}

function fill(doc: jsPDF, color: string) { doc.setFillColor(...toRgb(color)); }
function draw(doc: jsPDF, color: string) { doc.setDrawColor(...toRgb(color)); }
function text(doc: jsPDF, color: string) { doc.setTextColor(...toRgb(color)); }

function rrect(
    doc: jsPDF,
    x: number, y: number, w: number, h: number,
    r = BOX_RADIUS,
    style: "F" | "S" | "FD" = "FD",
) {
    doc.roundedRect(x, y, w, h, r, r, style);
}

// Draws a label+value row with alternating background, returns next y
function drawRow(
    doc: jsPDF,
    y: number,
    label: string,
    value: string,
    isEven: boolean,
): number {
    const boxW = CARD_W - CARD_PAD * 2;

    // Alternating row background
    fill(doc, isEven ? COLORS.rowBg : COLORS.white);
    draw(doc, COLORS.border);
    doc.setLineWidth(0);
    doc.rect(COL_L, y, boxW, ROW_H, "F");

    const midY = y + ROW_H / 2 + 4;

    // Label
    text(doc, COLORS.grey);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(label, COL_L + 10, midY);

    // Value — wrap if needed
    text(doc, COLORS.black);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const maxValW = (CARD_W - CARD_PAD * 2) / 2 - 10;
    const lines = doc.splitTextToSize(value, maxValW) as string[];
    const lineH = 13;
    const blockH = lines.length * lineH;
    const startY = y + ROW_H / 2 - blockH / 2 + lineH - 1;
    doc.text(lines, COL_R - 10, startY, { align: "right" });

    // Bottom divider
    draw(doc, COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(COL_L, y + ROW_H, COL_L + boxW, y + ROW_H);

    return y + ROW_H;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateReceiptPdf(data: ReceiptData): void {
    const {
        amount,
        network,
        tokenSymbol = "USDC",
        txHash,
        fromAddress,
        toAddress,
        explorerUrl,
    } = data;

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

    // ── Layout pre-calculation ────────────────────────────────────────────────

    const rows = [
        { label: "Amount Paid", value: `${clipAmount(amount)} ${tokenSymbol}` },
        { label: "Network", value: network },
        {
            label: "Date & Time",
            value: `${new Date().toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
            })} ${new Date().toLocaleTimeString("en-US", {
                hour: "2-digit", minute: "2-digit",
            })}`,
        },
        ...(fromAddress ? [{ label: "From", value: fromAddress }] : []),
        ...(toAddress ? [{ label: "To", value: toAddress }] : []),
    ];

    const CIRCLE_R = 28;
    const HEADER_H = CIRCLE_R * 2 + 32 + 24 + 20 + 36 + 52; // circle + title + subtitle + amount + gaps
    const DETAILS_H = rows.length * ROW_H + 2;                // +2 for border
    const TXHASH_H = txHash ? 80 : 0;
    const EXPLORER_H = explorerUrl ? 40 : 0;
    const SECTION_GAP = 20;
    const CARD_H =
        CARD_PAD +            // top padding
        HEADER_H +
        SECTION_GAP +
        DETAILS_H +
        (txHash ? SECTION_GAP + TXHASH_H : 0) +
        (explorerUrl ? SECTION_GAP + EXPLORER_H : 0) +
        CARD_PAD;             // bottom padding

    const cardY = (PAGE_H - CARD_H) / 2;

    // ── Card shell ────────────────────────────────────────────────────────────

    fill(doc, COLORS.white);
    draw(doc, COLORS.border);
    doc.setLineWidth(1);
    rrect(doc, CARD_X, cardY, CARD_W, CARD_H, 16, "FD");

    // ── Check circle ──────────────────────────────────────────────────────────

    const cx = PAGE_W / 2;
    let cy = cardY + CARD_PAD + CIRCLE_R;

    // Outer light green halo
    fill(doc, COLORS.greenBg);
    draw(doc, COLORS.greenBg);
    doc.circle(cx, cy, CIRCLE_R, "FD");

    // Inner solid green circle
    fill(doc, COLORS.green);
    draw(doc, COLORS.green);
    doc.circle(cx, cy, CIRCLE_R * 0.68, "FD");

    // White checkmark
    draw(doc, COLORS.white);
    doc.setLineWidth(2.5);
    doc.line(cx - 8, cy, cx - 2, cy + 7);
    doc.line(cx - 2, cy + 7, cx + 10, cy - 8);

    // ── Title ─────────────────────────────────────────────────────────────────

    let y = cy + CIRCLE_R + 30;

    text(doc, COLORS.black);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Successful", PAGE_W / 2, y, { align: "center" });

    y += 26;
    text(doc, COLORS.grey);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for your purchase!", PAGE_W / 2, y, { align: "center" });

    // ── Amount hero ───────────────────────────────────────────────────────────

    y += 44;
    text(doc, COLORS.black);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text(`${clipAmount(amount)} ${tokenSymbol}`, PAGE_W / 2, y, { align: "center" });

    // ── Details table ─────────────────────────────────────────────────────────

    y += SECTION_GAP + 28;

    const boxW = CARD_W - CARD_PAD * 2;

    // Table border + rounded container
    fill(doc, COLORS.white);
    draw(doc, COLORS.border);
    doc.setLineWidth(0.8);
    rrect(doc, COL_L, y, boxW, DETAILS_H, BOX_RADIUS, "FD");

    // Clip rows to box edges (cosmetic — rows are rectangles)
    rows.forEach((row, i) => {
        y = drawRow(doc, y, row.label, row.value, i % 2 === 0);
    });

    // ── TX Hash box ───────────────────────────────────────────────────────────

    if (txHash) {
        y += SECTION_GAP;

        fill(doc, COLORS.white);
        draw(doc, COLORS.border);
        doc.setLineWidth(0.8);
        rrect(doc, COL_L, y, boxW, TXHASH_H, BOX_RADIUS, "FD");

        text(doc, COLORS.grey);
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "normal");
        doc.text("Transaction Hash", COL_L + 12, y + 18);

        text(doc, COLORS.black);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        const hashLines = doc.splitTextToSize(txHash, boxW - 24) as string[];
        doc.text(hashLines, COL_L + 12, y + 34);

        y += TXHASH_H;
    }

    // ── Explorer link ─────────────────────────────────────────────────────────

    if (explorerUrl && explorerUrl !== "#") {
        y += SECTION_GAP;
        text(doc, COLORS.purple);
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "normal");
        const linkText = "View on Explorer →";
        doc.text(linkText, PAGE_W / 2, y + 14, { align: "center" });

        const linkW = doc.getTextWidth(linkText);
        doc.link(PAGE_W / 2 - linkW / 2, y + 2, linkW, 16, { url: explorerUrl });
    }

    doc.save(`receipt-${Date.now()}.pdf`);
}