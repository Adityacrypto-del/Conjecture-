/**
 * Robust Semantic Scholar retrieval: runs several queries, merges and de-dupes
 * results, retries on rate limits, and reports how well-grounded the run is.
 */

export interface RawPaper {
  paperId: string;
  title: string;
  abstract: string | null;
  authors: { name: string }[];
  year: number | null;
  citationCount: number;
  referenceCount: number;
  venue: string;
  openAccessPdf: { url?: string } | null;
  externalIds: { DOI?: string; ArXiv?: string } | null;
}

export interface RetrievalResult {
  papers: RawPaper[];
  retrieved: number;
  withAbstracts: number;
  note?: string;
}

const SEARCH_URL = "https://api.semanticscholar.org/graph/v1/paper/search";
const FIELDS =
  "paperId,title,abstract,authors,year,citationCount,referenceCount,venue,openAccessPdf,externalIds,fieldsOfStudy,tldr";

const MAX_QUERIES = 4;
const PER_QUERY_LIMIT = 8;
const MAX_PAPERS = 16;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url: string, retries = 3): Promise<Response | null> {
  const headers: Record<string, string> = {};
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
    headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers });
      // Rate-limited or transient server error → back off and retry.
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await sleep(800 * Math.pow(2, attempt)); // 0.8s, 1.6s, 3.2s
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < retries) {
        await sleep(800 * Math.pow(2, attempt));
        continue;
      }
      console.error("Semantic Scholar fetch failed:", err);
      return null;
    }
  }
  return null;
}

async function searchOne(query: string): Promise<RawPaper[]> {
  const url = `${SEARCH_URL}?query=${encodeURIComponent(query)}&fields=${FIELDS}&limit=${PER_QUERY_LIMIT}`;
  const res = await fetchWithRetry(url);
  if (!res || !res.ok) return [];
  const data: any = await res.json().catch(() => ({}));
  return Array.isArray(data?.data) ? (data.data as RawPaper[]) : [];
}

/**
 * Searches each keyword separately plus the combined query, then merges unique
 * papers (highest citations first).
 */
export async function searchPapers(
  keywords: string[],
  fallbackQuery: string
): Promise<RetrievalResult> {
  const cleaned = keywords.map((k) => k.trim()).filter(Boolean);
  const queries = (cleaned.length ? cleaned.slice(0, MAX_QUERIES) : [fallbackQuery]).slice();
  // Always include the combined keyword query for broader coverage.
  const combined = cleaned.join(" ");
  if (combined && !queries.includes(combined)) queries.push(combined);

  const results = await Promise.all(queries.map(searchOne));

  const byId = new Map<string, RawPaper>();
  for (const list of results) {
    for (const p of list) {
      if (p?.paperId && !byId.has(p.paperId)) byId.set(p.paperId, p);
    }
  }

  const papers = [...byId.values()]
    .sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
    .slice(0, MAX_PAPERS);

  const withAbstracts = papers.filter((p) => p.abstract && p.abstract.trim().length > 0).length;

  let note: string | undefined;
  if (papers.length === 0) {
    note =
      "No papers were retrieved from Semantic Scholar. The proposal will be weakly grounded — treat citations with caution.";
  } else if (withAbstracts < 3) {
    note = `Only ${withAbstracts} of ${papers.length} retrieved papers have abstracts; grounding is limited.`;
  }

  return { papers, retrieved: papers.length, withAbstracts, note };
}
