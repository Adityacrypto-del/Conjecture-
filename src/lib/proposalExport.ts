import type { GlobalState } from "./types";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";

/**
 * Shared proposal export.
 *
 * The proposal is flattened ONCE into an ordered list of semantic blocks, then
 * rendered to two targets:
 *   - PDF  — a print-styled HTML document rendered in a hidden iframe; the user
 *            saves it as PDF via the browser print dialog (selectable text, no
 *            rasterization).
 *   - DOCX — a real Word document built with the `docx` library.
 *
 * Keeping a single block model guarantees the two formats never drift apart.
 */

type Block =
  | { type: "title"; text: string }
  | { type: "meta"; lines: string[] }
  | { type: "h1"; text: string } // numbered section heading
  | { type: "h2"; text: string } // sub-heading
  | { type: "p"; text: string }
  | { type: "label"; label: string; text: string } // "Label: value" run
  | { type: "list"; items: string[] }
  | { type: "refs"; items: string[] };

const SECTION_TITLES: Record<string, string> = {
  "1_introduction": "1. Introduction",
  "2_literature_review": "2. Literature Review",
  "3_hypotheses": "3. Hypotheses",
  "4_methodology": "4. Methodology",
  "5_ethical_considerations": "5. Ethical Considerations",
  "6_timeline_and_budget": "6. Timeline & Budget",
  "7_expected_outcomes": "7. Expected Outcomes",
  "8_limitations": "8. Limitations",
  "9_future_directions": "9. Future Directions",
  "10_references": "10. References",
};

function clean(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  return String(v);
}

/** Flatten the proposal + supporting metadata into ordered blocks. */
function flattenProposal(state: GlobalState): Block[] {
  const prop = state.proposal;
  const blocks: Block[] = [];

  blocks.push({ type: "title", text: clean(prop.title) || "Research Proposal" });

  // Metadata / provenance line — makes the export feel authoritative.
  const meta: string[] = [];
  if (state.research_question) meta.push(`Research question: ${clean(state.research_question)}`);
  meta.push(`Generated: ${new Date(state.timestamp || Date.now()).toLocaleString()}`);
  if (state.grounding) {
    meta.push(
      `Grounding: ${state.grounding.papers_with_abstracts}/${state.grounding.papers_retrieved} retrieved papers had abstracts`
    );
  }
  if (state.verification?.enabled) {
    meta.push(
      `Verification trust score: ${state.verification.score}% (${state.verification.verified}/${state.verification.total_claims} claims supported)`
    );
  }
  blocks.push({ type: "meta", lines: meta });

  // Abstract
  if (prop.abstract) {
    blocks.push({ type: "h1", text: "Abstract" });
    blocks.push({ type: "p", text: clean(prop.abstract) });
  }

  const sections = prop.sections || ({} as GlobalState["proposal"]["sections"]);

  for (const [key, raw] of Object.entries(sections)) {
    const heading = SECTION_TITLES[key] || key.replace(/^\d+_/, "").replace(/_/g, " ");
    blocks.push({ type: "h1", text: heading });
    const section: any = raw;

    if (section == null) continue;

    if (typeof section === "string") {
      blocks.push({ type: "p", text: clean(section) });
      continue;
    }

    // 1. Introduction
    if (key === "1_introduction") {
      if (section.background) {
        blocks.push({ type: "h2", text: "Background" });
        blocks.push({ type: "p", text: clean(section.background) });
      }
      if (section.problem_statement) {
        blocks.push({ type: "h2", text: "Problem Statement" });
        blocks.push({ type: "p", text: clean(section.problem_statement) });
      }
      if (section.research_question) {
        blocks.push({ type: "h2", text: "Research Question" });
        blocks.push({ type: "p", text: clean(section.research_question) });
      }
      if (section.significance) {
        blocks.push({ type: "h2", text: "Significance" });
        blocks.push({ type: "p", text: clean(section.significance) });
      }
      continue;
    }

    // 2. Literature Review
    if (key === "2_literature_review") {
      if (section.content) blocks.push({ type: "p", text: clean(section.content) });
      if (Array.isArray(section.citations) && section.citations.length) {
        blocks.push({ type: "h2", text: "In-text Citations" });
        blocks.push({ type: "list", items: section.citations.map(clean) });
      }
      continue;
    }

    // 3. Hypotheses
    if (key === "3_hypotheses") {
      for (const [hKey, hVal] of Object.entries<any>(section)) {
        if (!hVal) continue;
        const label = hKey.replace("hypothesis_", "H");
        blocks.push({ type: "h2", text: `${clean(hVal.title)} (${label})` });
        if (hVal.statement) blocks.push({ type: "label", label: "Statement", text: clean(hVal.statement) });
        if (hVal.null_hyp) blocks.push({ type: "label", label: "Null Hypothesis (H₀)", text: clean(hVal.null_hyp) });
        if (hVal.alt_hyp) blocks.push({ type: "label", label: "Alternative Hypothesis (H₁)", text: clean(hVal.alt_hyp) });
      }
      continue;
    }

    // 4. Methodology
    if (key === "4_methodology") {
      if (section.overview) blocks.push({ type: "p", text: clean(section.overview) });
      const exp = section.primary_experiment;
      if (exp && typeof exp === "object") {
        blocks.push({ type: "h2", text: "Primary Experiment" });
        if (exp.study_design) blocks.push({ type: "label", label: "Design", text: clean(exp.study_design) });
        if (exp.design_justification) blocks.push({ type: "label", label: "Justification", text: clean(exp.design_justification) });
        const sample = exp.participants_or_subjects?.sample_size;
        if (sample) blocks.push({ type: "label", label: "Sample Size", text: clean(sample) });
      }
      continue;
    }

    // 10. References
    if (key === "10_references") {
      const refs = Array.isArray(section) ? section : [];
      if (refs.length) blocks.push({ type: "refs", items: refs.map(clean) });
      continue;
    }

    // Fallback: unknown object shape — render key/value pairs readably.
    for (const [k, v] of Object.entries(section)) {
      if (v == null || (Array.isArray(v) && v.length === 0)) continue;
      const labelText = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      if (typeof v === "string") {
        blocks.push({ type: "label", label: labelText, text: clean(v) });
      } else if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
        blocks.push({ type: "h2", text: labelText });
        blocks.push({ type: "list", items: v.map(clean) });
      }
    }
  }

  return blocks;
}

function fileSlug(title: string): string {
  return (title || "research_proposal").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "research_proposal";
}

/* ─────────────────────────── PDF (print) ─────────────────────────── */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function blocksToHtml(blocks: Block[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "title":
        parts.push(`<h1 class="doc-title">${escapeHtml(b.text)}</h1>`);
        break;
      case "meta":
        parts.push(
          `<div class="meta">${b.lines.map((l) => `<div>${escapeHtml(l)}</div>`).join("")}</div>`
        );
        break;
      case "h1":
        parts.push(`<h2 class="sec">${escapeHtml(b.text)}</h2>`);
        break;
      case "h2":
        parts.push(`<h3 class="sub">${escapeHtml(b.text)}</h3>`);
        break;
      case "p":
        parts.push(`<p>${escapeHtml(b.text)}</p>`);
        break;
      case "label":
        parts.push(`<p><span class="lbl">${escapeHtml(b.label)}:</span> ${escapeHtml(b.text)}</p>`);
        break;
      case "list":
        parts.push(`<ul>${b.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`);
        break;
      case "refs":
        parts.push(`<ol class="refs">${b.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ol>`);
        break;
    }
  }
  return parts.join("\n");
}

const PRINT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: #111; line-height: 1.55;
         max-width: 720px; margin: 0 auto; padding: 48px 40px; font-size: 12pt; }
  .doc-title { font-size: 22pt; line-height: 1.25; margin: 0 0 12px; text-align: center; font-weight: 700; }
  .meta { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #555;
          border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px 0;
          margin: 0 0 28px; text-align: center; }
  .meta div { margin: 2px 0; }
  h2.sec { font-size: 15pt; margin: 28px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #222;
           page-break-after: avoid; }
  h3.sub { font-size: 12.5pt; margin: 18px 0 4px; color: #222; page-break-after: avoid; }
  p { margin: 0 0 11px; text-align: justify; }
  .lbl { font-weight: 700; }
  ul, ol { margin: 0 0 12px; padding-left: 24px; }
  li { margin: 0 0 5px; }
  ol.refs li { margin: 0 0 8px; font-size: 10.5pt; }
  @media print { body { padding: 0; max-width: none; } @page { margin: 20mm; } }
`;

/** Render the proposal to a hidden iframe and open the browser print dialog. */
export function exportProposalPdf(state: GlobalState): void {
  const blocks = flattenProposal(state);
  const title = clean(state.proposal.title) || "Research Proposal";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
    title
  )}</title><style>${PRINT_CSS}</style></head><body>${blocksToHtml(blocks)}</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow!;
  const cleanup = () => {
    // Delay removal so the print dialog can read the document first.
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1000);
  };
  win.addEventListener("afterprint", cleanup);

  // Give the iframe a tick to lay out before printing.
  setTimeout(() => {
    win.focus();
    win.print();
    // Fallback cleanup in case afterprint never fires (some browsers).
    setTimeout(cleanup, 60000);
  }, 150);
}

/* ─────────────────────────── DOCX ─────────────────────────── */

function blocksToDocxParagraphs(blocks: Block[]): Paragraph[] {
  const paras: Paragraph[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "title":
        paras.push(
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [new TextRun({ text: b.text, bold: true })],
          })
        );
        break;
      case "meta":
        for (const line of b.lines) {
          paras.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 40 },
              children: [new TextRun({ text: line, italics: true, size: 18, color: "555555" })],
            })
          );
        }
        paras.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
        break;
      case "h1":
        paras.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 260, after: 100 },
            children: [new TextRun({ text: b.text, bold: true })],
          })
        );
        break;
      case "h2":
        paras.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 160, after: 60 },
            children: [new TextRun({ text: b.text, bold: true })],
          })
        );
        break;
      case "p":
        paras.push(
          new Paragraph({
            spacing: { after: 120 },
            alignment: AlignmentType.JUSTIFIED,
            children: [new TextRun({ text: b.text })],
          })
        );
        break;
      case "label":
        paras.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: `${b.label}: `, bold: true }),
              new TextRun({ text: b.text }),
            ],
          })
        );
        break;
      case "list":
        for (const item of b.items) {
          paras.push(
            new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [new TextRun({ text: item })] })
          );
        }
        break;
      case "refs":
        b.items.forEach((item, i) => {
          paras.push(
            new Paragraph({
              spacing: { after: 80 },
              children: [new TextRun({ text: `${i + 1}. ${item}` })],
            })
          );
        });
        break;
    }
  }
  return paras;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Build and download a real .docx of the proposal. */
export async function exportProposalDocx(state: GlobalState): Promise<void> {
  const blocks = flattenProposal(state);
  const doc = new Document({
    creator: "Conjecture",
    title: clean(state.proposal.title) || "Research Proposal",
    description: "AI-generated research proposal",
    sections: [{ children: blocksToDocxParagraphs(blocks) }],
  });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${fileSlug(clean(state.proposal.title))}_proposal.docx`);
}
