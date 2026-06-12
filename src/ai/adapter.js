/* SignaalBrug v2 — pluggable AiAdapter.
   Default is a deterministic mock: reproducible output, never fails on quota or keys.
   gemini/anthropic are config stubs — in production they call a live model behind
   VITE_AI_PROVIDER + an API key, with the mock as automatic fallback. */

const URGENT_WORDS = [
  ["112", 40], ["emergency", 35], ["afraid", 18], ["unsafe", 25], ["threat", 25], ["violence", 30],
  ["evict", 25], ["leave my room", 25], ["two days", 15], ["tomorrow", 12], ["deadline", 12],
  ["sick", 18], ["medicine", 20], ["pain", 15], ["child", 10], ["children", 10], ["pregnant", 22],
  ["no money", 15], ["homeless", 30], ["police", 15], ["finished", 8], ["urgent", 20],
];

const TAG_WORDS = {
  housing: ["hous", "room", "shelter", "rent", "accommodation", "reception", "homeless", "host family", "evict"],
  legal: ["lawyer", "legal", "permit", "ind", "procedure", "appeal", "contract", "document", "asylum"],
  medical: ["doctor", "medicine", "sick", "health", "gp", "hospital", "pain", "dentist", "pregnant"],
  finance: ["money", "allowance", "benefit", "bank", "debt", "income", "contribution", "toeslag"],
  education: ["school", "study", "language course", "inburgering", "education", "exam", "diploma"],
  safety: ["afraid", "unsafe", "threat", "violence", "police", "112", "emergency"],
  family: ["family", "husband", "wife", "daughter", "son", "reunification", "partner"],
  work: ["work", "job", "employer", "salary", "twv", "payroll"],
  return: ["return", "go back", "voluntary departure"],
};

const PLANS = {
  housing: ["Verify current reception/registration status with the municipality or COA", "Contact the location manager about the housing issue", "Explain rights and realistic options to the requester", "Schedule a follow-up within 48 hours"],
  legal: ["Review documents and deadlines with the requester", "Check the procedure status (IND / municipality)", "Prepare next-step letter or referral to legal aid (Juridisch Loket)", "Confirm the requester understands the next step"],
  medical: ["Assess urgency — if acute, call 112 / GP emergency line now", "Contact the on-site GP or GZA for an earlier appointment", "Arrange interpreter if needed", "Follow up within 24 hours"],
  finance: ["Map income, allowance and deductions with the requester", "Contact the municipality desk about the allowance calculation", "Explain the personal contribution rules", "Set a follow-up to confirm payments arrive"],
  safety: ["Check immediate safety — if in danger, call 112 now", "Inform location management / confidential adviser", "Document the incident factually", "Arrange a safe follow-up moment within 24 hours"],
  family: ["List required identity and family documents", "Check the reunification term (3 months after permit)", "Help draft or submit the application", "Plan document collection with embassy/IOM if needed"],
  general: ["Clarify the question with the requester", "Find the matching RefugeeHelp.nl guidance", "Answer in the requester's language", "Log the outcome and close or escalate"],
};

function translate(text, lang) {
  if (!text || lang === "en" || !lang) return null;
  if (/[؀-ۿ]/.test(text)) {
    return "(Auto-translated from Arabic) The requester describes their situation and asks for help. — demo translation; connect a live AI provider for real output.";
  }
  return "(Auto-translated from " + lang.toUpperCase() + ") " + text;
}

function classify(text) {
  const t = (text || "").toLowerCase();
  const tags = Object.entries(TAG_WORDS)
    .filter(([, words]) => words.some((w) => t.includes(w)))
    .map(([tag]) => tag);
  return tags.length ? tags.slice(0, 3) : ["general"];
}

function scoreUrgency(text, selfReported) {
  const t = (text || "").toLowerCase();
  let score = 8;
  const keywords = [];
  URGENT_WORDS.forEach(([w, pts]) => { if (t.includes(w)) { score += pts; keywords.push(w); } });
  if (selfReported) score += 20;
  score = Math.min(99, score);
  const level = score >= 65 ? "high" : score >= 35 ? "medium" : "low";
  return { level, score, keywords: keywords.slice(0, 4), selfReported: !!selfReported };
}

function draftPlan(kase) {
  const tag = (kase.tags || [])[0] || "general";
  return (PLANS[tag] || PLANS.general).slice();
}

function parseUnstructured(raw) {
  const email = (raw.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [null])[0];
  const phone = (raw.match(/(\+?\d[\d \-()]{7,})/) || [null])[0];
  let name = null;
  const m = raw.match(/(?:my name is|i am|ik ben|from:)\s*([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z.]+)?)/i);
  if (m) name = m[1].replace(/@.*/, "").trim();
  const body = raw.replace(/^(from|subject|to):.*$/gim, "").trim();
  return { name, email, phone, description: body.slice(0, 600) };
}

function draftFaq(query) {
  const q = query.trim().replace(/^\w/, (c) => c.toUpperCase());
  const drafts = {
    "bicycle theft": { q: "My bicycle was stolen — what should I do?", a: "Report the theft to the police online or at a station (you do not need a residence permit to report a crime). Keep the report number for insurance or replacement schemes. Some municipalities and volunteer organisations offer low-cost replacement bikes — ask at your reception location or the VWN consultation point." },
    dentist: { q: "How do I see a dentist, and what is covered?", a: "Asylum seekers are covered via the RMA arrangement for urgent dental care — ask the GZA health centre at your location for a referral. Status holders and people from Ukraine need their own arrangements: basic insurance covers dental for children fully; adults need supplementary insurance or pay themselves. In acute pain, call a dentist directly and mention it is urgent." },
  };
  const hit = Object.keys(drafts).find((k) => query.toLowerCase().includes(k.split(" ")[0]));
  return hit ? drafts[hit] : { q: q + " — what should I know?", a: "Draft answer generated from the knowledge base for “" + query + "”. Review, edit and approve to publish this to the refugee portal. (Mock AI output — connect a live provider for richer drafts.)" };
}

/* Jaccard similarity on word tokens (Latin + Arabic), used for the duplicate check. */
export function similarity(a, b) {
  const tok = (s) => new Set((s || "").toLowerCase().match(/[a-z؀-ۿ]{3,}/g) || []);
  const A = tok(a), B = tok(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((t) => { if (B.has(t)) inter++; });
  return inter / (A.size + B.size - inter);
}

export const mockProvider = { translate, classify, scoreUrgency, draftPlan, parseUnstructured, draftFaq, similarity };

export function aiLabel(provider) {
  if (provider === "gemini") return "Gemini (stub — add VITE_AI key in production)";
  if (provider === "anthropic") return "Anthropic (stub — add VITE_AI key in production)";
  return "Mock AI (deterministic)";
}

/* All providers resolve to the mock in this demo; live providers plug in here. */
export function getAi() {
  return mockProvider;
}
