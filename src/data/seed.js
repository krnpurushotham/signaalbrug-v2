/* SignaalBrug v2 — deterministic seed dataset.
   All timestamps are generated relative to seed time so the demo always looks fresh.
   makeSeed() returns a brand-new object every call — safe to mutate in the store. */

export function makeSeed() {
  const now = Date.now();
  const H = 3600e3, D = 24 * H;
  const ago = (ms) => new Date(now - ms).toISOString();
  const tl = (arr) => arr.map(([event, actor, msAgo]) => ({ event, actor, at: ago(msAgo) }));

  const volunteers = [
    { id: "v1", name: "Fatima B.", initials: "FB", color: "oklch(0.55 0.12 150)", role: "volunteer", skills: ["legal", "housing"], languages: ["ar", "en", "nl"], available: true },
    { id: "v2", name: "Daan V.", initials: "DV", color: "oklch(0.55 0.11 240)", role: "volunteer", skills: ["finance", "education"], languages: ["nl", "en"], available: true },
    { id: "v3", name: "Olena K.", initials: "OK", color: "oklch(0.55 0.12 70)", role: "volunteer", skills: ["housing", "education"], languages: ["uk", "ru", "en"], available: true },
    { id: "v4", name: "Samir H.", initials: "SH", color: "oklch(0.55 0.11 300)", role: "volunteer", skills: ["medical", "safety"], languages: ["ar", "fa", "en"], available: true },
    { id: "v5", name: "Lotte P.", initials: "LP", color: "oklch(0.55 0.10 195)", role: "volunteer", skills: ["safety", "legal"], languages: ["nl", "en", "de"], available: false },
    { id: "v6", name: "Yusuf A.", initials: "YA", color: "oklch(0.50 0.13 25)", role: "volunteer", skills: ["return", "legal"], languages: ["ar", "tr", "en"], available: true },
    { id: "a1", name: "Mark J.", initials: "MJ", color: "oklch(0.40 0.06 235)", role: "admin", skills: ["legal"], languages: ["en", "nl"], available: true },
  ];

  const cases = [
    {
      id: "c1041", code: "RQ-1041", channel: "web", status: "pending",
      requester: { name: "Ahmad Said", contactMethod: "phone", phone: "+31 6 1111 2222", municipality: "Ter Apel", consent: true },
      language: "ar", situation: "asylum_seeker",
      originalText: "أنا في مركز الاستقبال منذ ٣ أشهر. قيل لي أمس أنه يجب أن أغادر غرفتي خلال يومين ولا أعرف إلى أين أذهب. لدي أطفال وأشعر بخوف شديد.",
      translatedText: "I have been in the reception centre for 3 months. Yesterday I was told I must leave my room within two days and I don't know where to go. I have children and I am very afraid.",
      tags: ["housing", "safety"],
      urgency: { level: "high", score: 86, keywords: ["leave my room", "two days", "afraid"], selfReported: true },
      assignedTo: null, assignment: null, duplicateOf: null,
      resolution: { plan: null, statement: null, encrypted: false },
      timeline: tl([["Case created via web form", "Requester", 2 * H], ["AI triage: translated, tagged housing + safety, urgency High", "AiAdapter (mock)", 2 * H]]),
      timestamps: { created: ago(2 * H), assigned: null, resolved: null }, category: "housing",
    },
    {
      id: "c1042", code: "RQ-1042", channel: "callback", status: "pending",
      requester: { name: "Olha Marchenko", contactMethod: "phone", phone: "+31 6 2345 6789", consent: true },
      language: "en", situation: "ukraine",
      originalText: "Please call me back about my housing registration. Mornings are best.",
      translatedText: null, callback: { window: "Weekdays 09:00–12:00" },
      tags: ["housing"], urgency: { level: "medium", score: 41, keywords: ["housing"] },
      assignedTo: null, assignment: null, duplicateOf: "c1038",
      resolution: { plan: null, statement: null, encrypted: false },
      timeline: tl([["Callback request received", "Requester", 5 * H], ["Possible duplicate of RQ-1038 detected (same phone number)", "Intake pipeline", 5 * H]]),
      timestamps: { created: ago(5 * H), assigned: null, resolved: null }, category: "housing",
    },
    {
      id: "c1039", code: "RQ-1039", channel: "appointment", status: "pending",
      requester: { name: "Tesfay G.", contactMethod: "email", email: "tesfay.g@example.org", municipality: "Utrecht", consent: true },
      language: "en", situation: "status_holder",
      originalText: "I would like help understanding my civic integration (inburgering) obligations and the exam deadlines.",
      translatedText: null, appointment: { topic: "Civic integration", date: "Tomorrow", slot: "10:30" },
      tags: ["education"], urgency: { level: "low", score: 18, keywords: [] },
      assignedTo: null, assignment: null, duplicateOf: null,
      resolution: { plan: null, statement: null, encrypted: false },
      timeline: tl([["Appointment requested — digital consultation (video call)", "Requester", 9 * H]]),
      timestamps: { created: ago(9 * H), assigned: null, resolved: null }, category: "education",
    },
    {
      id: "c1036", code: "RQ-1036", channel: "email", status: "pending",
      requester: { name: "Mariam Q.", contactMethod: "email", email: "mariam.q@example.org", consent: true },
      language: "en", situation: "asylum_seeker",
      originalText: "From: mariam.q@example.org — Subject: family reunification. Dear VWN, my husband and daughter are still in Jordan. I received my interview date but I do not understand which documents I must collect for family reunification. Can someone help me prepare?",
      translatedText: null,
      tags: ["family", "legal"], urgency: { level: "medium", score: 47, keywords: ["interview date", "documents"] },
      assignedTo: null, assignment: null, duplicateOf: null,
      resolution: { plan: null, statement: null, encrypted: false },
      timeline: tl([["Email parsed by AiAdapter and logged by staff", "Mark J.", 26 * H]]),
      timestamps: { created: ago(26 * H), assigned: null, resolved: null }, category: "family",
    },
    {
      id: "c1043", code: "RQ-1043", channel: "walkin", status: "pending",
      requester: { name: "Petro D.", contactMethod: "in_person", municipality: "Amsterdam", consent: true },
      language: "en", situation: "ukraine",
      originalText: "Visited the consultation point: started a job last month and does not understand the personal contribution now deducted from the living allowance.",
      translatedText: null,
      tags: ["finance"], urgency: { level: "low", score: 22, keywords: [] },
      assignedTo: null, assignment: null, duplicateOf: null,
      resolution: { plan: null, statement: null, encrypted: false },
      timeline: tl([["Walk-in logged at Den Haag consultation point", "Lotte P.", 3 * H]]),
      timestamps: { created: ago(3 * H), assigned: null, resolved: null }, category: "finance",
    },
    {
      id: "c1038", code: "RQ-1038", channel: "web", status: "in_progress",
      requester: { name: "Olha Marchenko", contactMethod: "phone", phone: "+31 6 2345 6789", municipality: "Rotterdam", consent: true },
      language: "en", situation: "ukraine",
      originalText: "We arrived two weeks ago and are staying with a host family via RefugeeHomeNL. The municipality says our registration is incomplete and we cannot receive the living allowance yet.",
      translatedText: null,
      tags: ["housing", "finance"], urgency: { level: "medium", score: 52, keywords: ["registration", "allowance"] },
      assignedTo: "v3",
      assignment: { score: { skill: 3, language: 2, load: -1, total: 4 }, by: "Mark J.", at: ago(20 * H) },
      duplicateOf: null,
      resolution: { plan: null, statement: null, encrypted: false },
      timeline: tl([["Case created via web form", "Requester", 30 * H], ["Assigned to Olena K. — Housing, Ukrainian", "Mark J.", 20 * H], ["Status → In progress", "Olena K.", 18 * H]]),
      timestamps: { created: ago(30 * H), assigned: ago(20 * H), resolved: null }, category: "housing",
    },
    {
      id: "c1037", code: "RQ-1037", channel: "voice", status: "in_progress",
      requester: { name: "Reza N.", contactMethod: "phone", phone: "+31 6 8765 4321", consent: true },
      language: "fa", situation: "asylum_seeker",
      originalText: "(Voice note, 0:42) — transcribed from Farsi.",
      translatedText: "My medicine for my heart is finished and the GP at the centre is only available next week. What should I do if I feel unwell before then?",
      tags: ["medical"], urgency: { level: "high", score: 78, keywords: ["medicine", "finished", "unwell"] },
      assignedTo: "v4",
      assignment: { score: { skill: 3, language: 2, load: 0, total: 5 }, by: "Mark J.", at: ago(40 * H) },
      duplicateOf: null, audioUrl: "demo",
      resolution: { plan: null, statement: null, encrypted: false },
      timeline: tl([["Voice note received and transcribed", "AiAdapter (mock)", 44 * H], ["Assigned to Samir H. — Medical, Arabic/Farsi", "Mark J.", 40 * H], ["Status → In progress", "Samir H.", 38 * H]]),
      timestamps: { created: ago(44 * H), assigned: ago(40 * H), resolved: null }, category: "health",
    },
    {
      id: "c1040", code: "RQ-1040", channel: "walkin", status: "in_progress",
      requester: { name: "Amanuel T.", contactMethod: "in_person", municipality: "Eindhoven", consent: true },
      language: "en", situation: "status_holder",
      originalText: "Walk-in: received a housing offer from the municipality but the rent contract has clauses he does not understand. Wants a legal check before signing on Friday.",
      translatedText: null,
      tags: ["housing", "legal"], urgency: { level: "medium", score: 55, keywords: ["contract", "Friday"] },
      assignedTo: "v1",
      assignment: { score: { skill: 6, language: 2, load: -1, total: 7 }, by: "Mark J.", at: ago(7 * H) },
      duplicateOf: null,
      resolution: { plan: null, statement: null, encrypted: false },
      timeline: tl([["Walk-in logged", "Fatima B.", 8 * H], ["Assigned to Fatima B. — Legal + Housing", "Mark J.", 7 * H], ["Status → In progress", "Fatima B.", 6 * H]]),
      timestamps: { created: ago(8 * H), assigned: ago(7 * H), resolved: null }, category: "housing", unread: true,
    },
    {
      id: "c1034", code: "RQ-1034", channel: "web", status: "resolved",
      requester: { name: "Hanna S.", contactMethod: "email", email: "hanna.s@example.org", consent: true },
      language: "en", situation: "ukraine",
      originalText: "How long is my temporary protection valid and do I need to renew anything myself?",
      translatedText: null,
      tags: ["legal"], urgency: { level: "low", score: 12, keywords: [] },
      assignedTo: "v3",
      assignment: { score: { skill: 0, language: 2, load: 0, total: 2 }, by: "Mark J.", at: ago(3 * D) },
      duplicateOf: null,
      resolution: { plan: ["Explain Temporary Protection Directive duration (protection until at least 4 March 2027)", "Confirm registration status with municipality", "Share TPD explainer video"], statement: "Explained TPD validity; no action needed from requester. Sent explainer video link.", encrypted: true, tokenHint: "K7" },
      timeline: tl([["Case created via web form", "Requester", 4 * D], ["Assigned to Olena K.", "Mark J.", 3 * D], ["Resolved — explanation delivered", "Olena K.", 2 * D]]),
      timestamps: { created: ago(4 * D), assigned: ago(3 * D), resolved: ago(2 * D) }, category: "procedure",
    },
    {
      id: "c1035", code: "RQ-1035", channel: "walkin", status: "resolved",
      requester: { name: "Bilal R.", contactMethod: "in_person", municipality: "Budel", consent: true },
      language: "en", situation: "asylum_seeker",
      originalText: "Asked whether he is allowed to work while his asylum application is pending and how to get a BSN for payroll.",
      translatedText: null,
      tags: ["work"], urgency: { level: "low", score: 15, keywords: [] },
      assignedTo: "v2",
      assignment: { score: { skill: 0, language: 2, load: -1, total: 1 }, by: "Mark J.", at: ago(5 * D) },
      duplicateOf: null,
      resolution: { plan: ["Explain work conditions during the asylum procedure", "Help request BSN via municipality", "Connect with COA job desk"], statement: "Confirmed work is allowed under conditions after 6 months; BSN steps shared in writing.", encrypted: false },
      timeline: tl([["Walk-in logged", "Daan V.", 6 * D], ["Assigned to Daan V.", "Mark J.", 5 * D], ["Resolved", "Daan V.", 4 * D]]),
      timestamps: { created: ago(6 * D), assigned: ago(5 * D), resolved: ago(4 * D) }, category: "work",
    },
  ];

  const faq = [
    // ——— Fled from Ukraine ———
    { id: "f1", category: "housing", situations: ["ukraine"], resourceIds: [], translations: { en: { q: "What housing options do I have as someone who fled Ukraine?", a: "You can stay in a municipal reception location, with a host family arranged through RefugeeHomeNL, or rent privately while keeping your rights under the Temporary Protection Directive. Register your address with the municipality in all cases — your living allowance depends on it." } } },
    { id: "f2", category: "procedure", situations: ["ukraine"], resourceIds: ["r3"], translations: { en: { q: "How long does my temporary protection last?", a: "The EU Temporary Protection Directive currently protects people who fled Ukraine until at least 4 March 2027. You do not need to apply for asylum to keep this protection; keep your municipal registration up to date." } } },
    { id: "f3", category: "finance", situations: ["ukraine"], resourceIds: [], translations: { en: { q: "What is the living allowance, and what changes when I start working?", a: "Adults in municipal reception receive a monthly living allowance for food and personal expenses. When you have income from work, a personal contribution is deducted — report your income to the municipality to avoid repayments later." } } },
    { id: "f4", category: "documents", situations: ["ukraine"], resourceIds: [], translations: { en: { q: "What should I arrange first after arriving in the Netherlands?", a: "Register with the municipality where you are staying (BRP registration). You will receive a BSN (citizen service number), which you need for work, healthcare, a bank account and the living allowance." } } },
    // ——— Asylum seeker ———
    { id: "f5", category: "procedure", situations: ["asylum_seeker"], resourceIds: ["r1"], translations: { en: { q: "How does the asylum procedure work?", a: "You apply for asylum at the application centre in Ter Apel (or via the border procedure if you arrived by air or sea). After registration and identification, the IND examines your case in interviews. VluchtelingenWerk can explain each step and prepare you for interviews." } } },
    { id: "f6", category: "procedure", situations: ["asylum_seeker"], resourceIds: [], translations: { en: { q: "How long will I wait for the IND decision?", a: "Waiting times vary by case type and are currently long for many profiles. The IND must inform you about your decision period; if it is extended you receive a letter. Ask a VWN volunteer to check the status with you." } } },
    { id: "f7", category: "housing", situations: ["asylum_seeker"], resourceIds: [], translations: { en: { q: "What is life in a COA reception centre like?", a: "COA provides a place to sleep, meals or a cooking allowance, and access to basic healthcare while you wait. House rules apply per location, and you must report your presence regularly. Moving between locations happens via COA, not on your own initiative." } } },
    { id: "f8", category: "family", situations: ["asylum_seeker"], resourceIds: [], translations: { en: { q: "Can my family come to the Netherlands (family reunification)?", a: "If you receive an asylum permit you can apply for family reunification for your spouse/partner and minor children — applicants now submit the application themselves within 3 months of the permit. Start collecting identity and family documents early." } } },
    { id: "f9", category: "work", situations: ["asylum_seeker"], resourceIds: ["r5"], translations: { en: { q: "Am I allowed to work while I wait?", a: "Yes, under conditions: your asylum application must be pending for at least 6 months, and your employer needs a work permit (TWV) for you. You also need a BSN. The COA job desk and VWN can help you with the steps." } } },
    { id: "f10", category: "procedure", situations: ["asylum_seeker", "status_holder"], resourceIds: ["r2"], translations: { en: { q: "How do I book a digital consultation with VluchtelingenWerk?", a: "VWN offers digital consultation hours as a video call via Teams. Pick a topic and time slot through the appointment page; you will receive a link to join. Support is shifting online now that VWN is no longer present at every reception location." } } },
    // ——— Status holder ———
    { id: "f11", category: "housing", situations: ["status_holder"], resourceIds: [], translations: { en: { q: "How do I get housing as a status holder?", a: "After you receive your residence permit, a municipality is assigned to house you. The municipality makes you one suitable housing offer — refusing it can affect your benefits and reception. VWN can check the offer and contract with you." } } },
    { id: "f12", category: "education", situations: ["status_holder"], resourceIds: ["r4"], translations: { en: { q: "What is civic integration (inburgering) and what are my deadlines?", a: "Status holders must complete civic integration: learning Dutch and passing exams within the statutory term (usually 3 years). The municipality draws up a personal plan (PIP) with you. Missing deadlines can lead to fines, so start early." } } },
    { id: "f13", category: "finance", situations: ["status_holder"], resourceIds: [], translations: { en: { q: "How do I arrange DigiD, benefits and a bank account?", a: "With your BSN you can request a DigiD, which you need for almost all government services, allowances (toeslagen) and health insurance. Open a bank account as soon as possible; the municipality or VWN can help with the first applications." } } },
    { id: "f14", category: "work", situations: ["status_holder"], resourceIds: [], translations: { en: { q: "Can I work or study with my residence permit?", a: "Yes — status holders are free to work without a separate work permit and can enrol in education. Diploma recognition (IDW) helps you use qualifications from your home country. The municipality can support with job coaching." } } },
    // ——— Helping someone ———
    { id: "f15", category: "housing", situations: ["helper"], resourceIds: ["r6"], translations: { en: { q: "I want to host a refugee at home — how does that work?", a: "Hosting people who fled Ukraine is arranged via RefugeeHomeNL (a Red Cross / Takecarebnb partnership) with screening and guidance. For asylum seekers in the COA process, private hosting is generally not possible — point them to official reception instead." } } },
    { id: "f16", category: "documents", situations: ["helper"], resourceIds: [], translations: { en: { q: "Where do I find reliable official information to share?", a: "RefugeeHelp.nl is the central information platform, with content per situation in 13 languages. For procedures use IND.nl, for reception COA.nl, and for legal aid the Juridisch Loket. Avoid forwarding unverified social media messages." } } },
    { id: "f17", category: "procedure", situations: ["helper"], resourceIds: [], translations: { en: { q: "When should I refer someone to VluchtelingenWerk?", a: "Refer when a question is personal or legal: procedure steps, family reunification, documents, or conflicts about reception or allowances. General orientation questions are usually answered on RefugeeHelp.nl. In emergencies, always call 112 first." } } },
  ];

  const resources = [
    { id: "r1", type: "video", url: "https://www.refugeehelp.nl/get-help/category/asylum", titles: { en: "The asylum procedure, explained (video)" }, category: "procedure", situations: ["asylum_seeker"] },
    { id: "r2", type: "video", url: "https://www.refugeehelp.nl/", titles: { en: "How to book a VWN digital consultation via Teams (video)" }, category: "procedure", situations: ["asylum_seeker", "status_holder"] },
    { id: "r3", type: "video", url: "https://www.refugeehelp.nl/", titles: { en: "Temporary protection for people from Ukraine (video)" }, category: "procedure", situations: ["ukraine"] },
    { id: "r4", type: "video", url: "https://www.refugeehelp.nl/", titles: { en: "Civic integration (inburgering): your first steps (video)" }, category: "education", situations: ["status_holder"] },
    { id: "r5", type: "video", url: "https://www.refugeehelp.nl/", titles: { en: "Working while your asylum case is pending (video)" }, category: "work", situations: ["asylum_seeker"] },
    { id: "r6", type: "video", url: "https://www.refugeehelp.nl/", titles: { en: "Hosting a refugee at home: what to expect (video)" }, category: "housing", situations: ["helper"] },
  ];

  const locations = [
    { id: "l1", name: "Application centre Ter Apel", type: "application_centre", lat: 52.8767, lng: 7.0589, situations: ["asylum_seeker"], requests: 34, note: "National centre where the asylum procedure starts." },
    { id: "l2", name: "COA reception centre Budel", type: "reception", lat: 51.27, lng: 5.575, situations: ["asylum_seeker"], requests: 12, note: "Sample COA reception location." },
    { id: "l3", name: "COA reception centre Utrecht", type: "reception", lat: 52.0907, lng: 5.1214, situations: ["asylum_seeker"], requests: 9, note: "Sample COA reception location." },
    { id: "l4", name: "Municipal reception Amsterdam (Ukraine)", type: "municipal", lat: 52.3702, lng: 4.8952, situations: ["ukraine"], requests: 17, note: "Sample municipal reception for people who fled Ukraine." },
    { id: "l5", name: "Municipal reception Rotterdam (Ukraine)", type: "municipal", lat: 51.9244, lng: 4.4777, situations: ["ukraine"], requests: 14, note: "Sample municipal reception for people who fled Ukraine." },
    { id: "l6", name: "VWN consultation point Den Haag", type: "vwn_consultation", lat: 52.0705, lng: 4.3007, situations: ["asylum_seeker", "ukraine", "status_holder", "helper"], requests: 21, note: "Walk-in and digital consultation hours." },
    { id: "l7", name: "VWN consultation point Eindhoven", type: "vwn_consultation", lat: 51.4416, lng: 5.4697, situations: ["asylum_seeker", "ukraine", "status_holder", "helper"], requests: 8, note: "Walk-in and digital consultation hours." },
    { id: "l8", name: "RefugeeHomeNL info point Groningen", type: "municipal", lat: 53.2194, lng: 6.5665, situations: ["ukraine", "helper"], requests: 6, note: "Host-family matching and information." },
  ];

  const searchLog = [
    { id: "s1", query: "bicycle theft", language: "en", situation: "asylum_seeker", hits: 0, ts: ago(2 * D) },
    { id: "s2", query: "bicycle theft", language: "en", situation: "ukraine", hits: 0, ts: ago(1.5 * D) },
    { id: "s3", query: "bicycle stolen what to do", language: "en", situation: "asylum_seeker", hits: 0, ts: ago(1 * D) },
    { id: "s4", query: "dentist", language: "en", situation: "asylum_seeker", hits: 0, ts: ago(3 * D) },
    { id: "s5", query: "dentist pain", language: "en", situation: "ukraine", hits: 0, ts: ago(2.2 * D) },
    { id: "s6", query: "housing", language: "en", situation: "ukraine", hits: 2, ts: ago(6 * H) },
    { id: "s7", query: "work permit", language: "en", situation: "asylum_seeker", hits: 2, ts: ago(8 * H) },
  ];

  const insights = [
    { id: "i1", type: "zero_result", payload: { query: "bicycle theft", count: 3, situations: ["asylum_seeker", "ukraine"] }, status: "open" },
    { id: "i2", type: "zero_result", payload: { query: "dentist", count: 2, situations: ["asylum_seeker", "ukraine"] }, status: "open" },
    { id: "i3", type: "category_gap", payload: { category: "health", note: "12% of cases are health-related but only 0 FAQ entries cover health." }, status: "open" },
  ];

  // 30 days of synthetic intake volume per channel
  const volume30 = Array.from({ length: 30 }, (_, i) => {
    const day = 29 - i;
    const wave = Math.sin(i / 4.4) * 2.2 + Math.sin(i / 9) * 1.6;
    const r = (n) => Math.max(0, Math.round(n));
    return {
      date: new Date(now - day * D).toISOString().slice(0, 10),
      web: r(5 + wave + (i % 7 === 3 ? 3 : 0)),
      walkin: r(3.5 + wave * 0.6),
      email: r(2.2 + Math.cos(i / 5) * 1.2),
      callback: r(1.8 + Math.sin(i / 3.1)),
      appointment: r(2.4 + Math.cos(i / 6.2) * 1.4),
      voice: r(1.1 + Math.sin(i / 5.5) * 0.9),
    };
  });

  return {
    volunteers, cases, faq, resources, locations, searchLog, insights, volume30,
    counters: { totalCases: 132, resolvedCases: 117 },
    nextCode: 1044,
  };
}
