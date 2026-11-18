
import { db } from "../db/db.js";

// Multi-provider AI gateway. Configure AI_PROVIDER=auto or a preferred provider.
// Supported native providers: OpenAI, Gemini, Anthropic. OpenAI-compatible:
// Groq, OpenRouter, DeepSeek, Mistral, Together and custom compatible endpoints.
const PROVIDERS = {
  openai: { key: "OPENAI_API_KEY", url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" },
  gemini: { key: "GEMINI_API_KEY", model: "gemini-2.5-flash" },
  anthropic: { key: "ANTHROPIC_API_KEY", url: "https://api.anthropic.com/v1/messages", model: "claude-3-5-haiku-latest" },
  groq: { key: "GROQ_API_KEY", url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile" },
  openrouter: { key: "OPENROUTER_API_KEY", url: "https://openrouter.ai/api/v1/chat/completions", model: "openai/gpt-4o-mini" },
  deepseek: { key: "DEEPSEEK_API_KEY", url: "https://api.deepseek.com/chat/completions", model: "deepseek-chat" },
  mistral: { key: "MISTRAL_API_KEY", url: "https://api.mistral.ai/v1/chat/completions", model: "mistral-small-latest" },
  together: { key: "TOGETHER_API_KEY", url: "https://api.together.xyz/v1/chat/completions", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo" }
};
const cleanKey = (value) => String(value || "").trim().replace(/^['\"]|['\"]$/g, "");
function configuredProviders() {
  const requested = String(process.env.AI_PROVIDER || "auto").toLowerCase().split(/[;,\s]+/).filter(Boolean);
  const order = requested.includes("auto") || !requested.length
    ? ["gemini", "openai", "anthropic", "groq", "openrouter", "deepseek", "mistral", "together"]
    : requested;
  return [...new Set(order)].filter(name => PROVIDERS[name] && cleanKey(process.env[PROVIDERS[name].key]));
}
function providerModel(name) {
  const specific = process.env[`${name.toUpperCase()}_MODEL`];
  const preference = String(process.env.AI_PROVIDER || "auto").toLowerCase().trim();
  return specific || (preference === name ? process.env.SALES_AGENT_MODEL : "") || PROVIDERS[name].model;
}
function extractJSON(text) {
  const raw = String(text || "").trim();
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(cleaned); } catch {
    const first = cleaned.indexOf("{"); const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(cleaned.slice(first, last + 1));
    throw new Error("AI provider returned invalid JSON");
  }
}
async function callOpenAICompatible(name, system, input) {
  const cfg = PROVIDERS[name];
  const base = name === "openai" ? (process.env.OPENAI_BASE_URL || cfg.url) :
    name === "groq" ? (process.env.GROQ_BASE_URL || cfg.url) :
    name === "openrouter" ? (process.env.OPENROUTER_BASE_URL || cfg.url) :
    name === "deepseek" ? (process.env.DEEPSEEK_BASE_URL || cfg.url) :
    name === "mistral" ? (process.env.MISTRAL_BASE_URL || cfg.url) :
    name === "together" ? (process.env.TOGETHER_BASE_URL || cfg.url) :
    (process.env.AI_COMPATIBLE_BASE_URL || cfg.url);
  const model = providerModel(name);
  const response = await fetch(base, { method: "POST", headers: { Authorization: `Bearer ${cleanKey(process.env[cfg.key])}`, "Content-Type": "application/json", ...(name === "openrouter" ? { "HTTP-Referer": process.env.APP_URL || "https://nexusthecore.com", "X-Title": "Nexus Core Sales Agents" } : {}) }, body: JSON.stringify({ model, temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify(input) }] }), signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${name} returned HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${name} returned an empty response`);
  return extractJSON(content);
}
async function callGemini(system, input) {
  const model = providerModel("gemini");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(cleanKey(process.env.GEMINI_API_KEY))}`;
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: JSON.stringify(input) }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } }), signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`gemini returned HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("");
  if (!content) throw new Error("gemini returned an empty response");
  return extractJSON(content);
}
async function callAnthropic(system, input) {
  const model = providerModel("anthropic");
  const response = await fetch(PROVIDERS.anthropic.url, { method: "POST", headers: { "x-api-key": cleanKey(process.env.ANTHROPIC_API_KEY), "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model, max_tokens: 4096, temperature: 0.2, system: `${system}\nReturn only valid JSON.`, messages: [{ role: "user", content: JSON.stringify(input) }] }), signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`anthropic returned HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const data = await response.json();
  const content = data.content?.filter(x => x.type === "text").map(x => x.text).join("");
  if (!content) throw new Error("anthropic returned an empty response");
  return extractJSON(content);
}
export async function generateSalesAIJSON(system, input) {
  const providers = configuredProviders();
  if (!providers.length) throw new Error("No AI provider key configured. Set one or more of GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, DEEPSEEK_API_KEY, MISTRAL_API_KEY or TOGETHER_API_KEY.");
  const errors = [];
  for (const name of providers) {
    try {
      const result = name === "gemini" ? await callGemini(system, input) : name === "anthropic" ? await callAnthropic(system, input) : await callOpenAICompatible(name, system, input);
      return result;
    } catch (error) {
      errors.push(`${name}: ${String(error.message || error).slice(0, 220)}`);
      // Try the next configured provider for transient, quota, model and auth errors.
    }
  }
  throw new Error(`All configured AI providers failed. ${errors.join(" | ")}`);
}
const askAI = generateSalesAIJSON;

async function record(runId, agent, eventType, message, payload = {}) {
  await db.query(
    `INSERT INTO sales_agent_events (run_id,agent,event_type,message,payload) VALUES ($1,$2,$3,$4,$5::jsonb)`,
    [runId, agent, eventType, message, JSON.stringify(payload)]
  );
}
async function updateRun(runId, patch) {
  const fields = Object.keys(patch);
  const values = Object.values(patch);
  const sets = fields.map((k, i) => `${k}=$${i + 2}`).join(",");
  await db.query(`UPDATE sales_agent_runs SET ${sets} WHERE id=$1`, [runId, ...values]);
}
async function searchWeb(query, limit = 10) {
  const key = String(process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY || "").trim().replace(/^['\"]|['\"]$/g, "");
  if (!key) throw new Error("SerpApi is not configured. Set SERPAPI_API_KEY on the Nexus Core API service.");
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(limit));
  url.searchParams.set("api_key", key);
  const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const reason = String(data.error || `HTTP ${response.status}`).slice(0, 240);
    if (response.status === 401 || response.status === 403) throw new Error(`SerpApi authentication rejected the key (${reason}). Check SERPAPI_API_KEY in Render.`);
    if (response.status === 429) throw new Error(`SerpApi rate limit or search quota reached (${reason}).`);
    throw new Error(`SerpApi search failed (${response.status}): ${reason}`);
  }
  return (data.organic_results || []).map(x => ({ title: x.title, url: x.link, snippet: x.snippet }));
}
// All agent AI requests use the multi-provider gateway declared above.
const parseDomain = (url) => { try { return new URL(url).hostname.replace(/^www\./,""); } catch { return ""; } };

export async function executeSalesWorkflow(runId, input) {
  const result = { market_research:[], prospects:[], agents:[], warnings:[] };
  await updateRun(runId,{status:"running",started_at:new Date()});
  try {
    // 1. Research agent
    await record(runId,"Market Research Agent","started","Researching target market and buyer signals.");
    const queries = [
      `${input.market} companies ${input.geography || ""} ${input.ideal_customer || ""}`,
      `${input.market} businesses expanding hiring funding ${input.geography || ""}`,
      `${input.market} companies problems software services procurement ${input.geography || ""}`
    ];
    const research = (await Promise.all(queries.map(q=>searchWeb(q,8)))).flat();
    const uniqueResearch = [...new Map(research.filter(x=>x.url).map(x=>[x.url,x])).values()].slice(0,24);
    result.market_research=uniqueResearch;
    result.agents.push("Market Research Agent");
    await record(runId,"Market Research Agent","completed",`Collected ${uniqueResearch.length} source results.`,{sources:uniqueResearch.length});

    // 2. Discovery and 3. Enrichment agent
    await record(runId,"Lead Discovery Agent","started","Identifying real organizations from research sources.");
    const discovery = await askAI(
      "You are a B2B prospect research analyst. Use ONLY supplied search results. Return JSON {prospects:[{company,website,description,industry,source_url,buying_signals,contact_role}]} . Do not invent people, emails, phone numbers, or facts. Include only identifiable organizations with a valid source URL.",
      {market:input.market,geography:input.geography,ideal_customer:input.ideal_customer,results:uniqueResearch}
    );
    const prospects=(discovery.prospects||[]).filter(p=>p.company && (p.website||p.source_url)).slice(0,input.max_leads);
    result.agents.push("Lead Discovery Agent","Lead Enrichment Agent");
    await record(runId,"Lead Discovery Agent","completed",`Identified ${prospects.length} candidate organizations.`);
    await record(runId,"Lead Enrichment Agent","started","Enriching prospects from available public evidence.");
    const enriched = await askAI(
      "You enrich B2B company prospects. Return JSON {prospects:[{company,website,description,industry,source_url,buying_signals,contact_role,company_size,fit_summary}]} . Never fabricate email addresses, phone numbers, named decision makers, or company size. Use null when unknown. Preserve source URLs.",
      {market:input.market,geography:input.geography,prospects}
    );
    result.agents.push("Lead Enrichment Agent");

    // 4. Qualification agent
    await record(runId,"Lead Qualification Agent","started","Scoring prospects against the requested ideal customer profile.");
    const qualified = await askAI(
      "Score each company from 0 to 100 for fit to the supplied B2B ICP. Evidence-based only. Return JSON {prospects:[{company,website,description,industry,source_url,buying_signals,contact_role,company_size,fit_summary,score,qualification_reason,next_action,is_enterprise}]} . Do not create personal contact data. score integer.",
      {market:input.market,ideal_customer:input.ideal_customer,geography:input.geography,prospects:enriched.prospects||prospects}
    );
    result.agents.push("Lead Qualification Agent");
    const saved=[];
    for (const p of (qualified.prospects||[]).slice(0,input.max_leads)) {
      if (!p.company) continue;
      const website=p.website || null, sourceUrl=p.source_url || null;
      const existing=await db.query(`SELECT id FROM sales_leads WHERE LOWER(COALESCE(company,''))=LOWER($1) LIMIT 1`,[p.company]);
      let lead;
      const score=Math.max(0,Math.min(100,Number(p.score)||0));
      const qualifiedStage=score>=65?"qualified":"new";
      if (existing.rowCount) {
        const r=await db.query(`UPDATE sales_leads SET website=COALESCE($2,website),source_url=COALESCE($3,source_url),research=$4::jsonb,qualification_score=$5,qualification_reason=$6,next_action=$7,stage=CASE WHEN $5>=65 AND stage='new' THEN 'qualified' ELSE stage END,updated_at=NOW() WHERE id=$1 RETURNING *`,
          [existing.rows[0].id,website,sourceUrl,JSON.stringify(p),score,p.qualification_reason||p.fit_summary||null,p.next_action||"Review prospect"]);
        lead=r.rows[0];
      } else {
        const r=await db.query(`INSERT INTO sales_leads(name,company,source,stage,is_enterprise,website,source_url,research,qualification_score,qualification_reason,next_action,notes)
          VALUES($1,$1,'AI Market Research',$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10) RETURNING *`,
          [p.company,qualifiedStage,Boolean(p.is_enterprise),website,sourceUrl,JSON.stringify(p),score,p.qualification_reason||p.fit_summary||null,p.next_action||"Review prospect",p.description||null]);
        lead=r.rows[0];
      }
      saved.push(lead);
      await db.query(`INSERT INTO sales_activities(lead_id,activity_type,title,details) VALUES($1,'note',$2,$3)`,
        [lead.id, "Autonomous AI research completed", `Qualification score: ${lead.qualification_score}. Source: ${sourceUrl || "not supplied"}`]);
    }
    result.prospects=saved;
    await record(runId,"Lead Qualification Agent","completed",`Saved or updated ${saved.length} qualified prospect records.`,{leadIds:saved.map(x=>x.id)});

    // 5. Intelligence and 6. Outreach content generation (drafts only)
    await record(runId,"Sales Intelligence Agent","started","Preparing segment insights and recommended next actions.");
    const intel=await askAI("Analyze this prospect set. Return JSON {segment_summary,common_pain_points,priority_actions:[string],campaign_angle}. Do not assert facts not supported by supplied prospect data.",{market:input.market,prospects:saved.map(x=>({company:x.company,score:x.qualification_score,research:x.research}))});
    result.sales_intelligence=intel;
    result.agents.push("Sales Intelligence Agent");
    await record(runId,"Sales Intelligence Agent","completed","Sales intelligence report generated.",intel);
    await record(runId,"Outreach Agent","started","Drafting personalized outreach; no messages will be sent automatically.");
    const drafts=await askAI("Create a concise first-touch B2B email draft for each prospect. Return JSON {drafts:[{company,subject,body,personalization_evidence,approval_required:true}]}. Never claim a relationship or fact not in supplied evidence. These are drafts only; do not send.",{market:input.market,product_context:input.objective,prospects:saved.map(x=>({company:x.company,website:x.website,industry:x.research?.industry,signals:x.research?.buying_signals,fit:x.qualification_reason}))});
    result.outreach_drafts=drafts.drafts||[];
    for (const d of result.outreach_drafts) {
      const lead=saved.find(x=>String(x.company||"").toLowerCase()===String(d.company||"").toLowerCase());
      if (!lead) continue;
      await db.query(`INSERT INTO sales_outreach_drafts(lead_id,subject,body,personalization_evidence,status)
        VALUES($1,$2,$3,$4,'pending')`,[lead.id,String(d.subject||"Nexus Core introduction").slice(0,500),String(d.body||"").slice(0,12000),String(d.personalization_evidence||"").slice(0,2000)]);
    }
    result.agents.push("Outreach Agent");
    await record(runId,"Outreach Agent","completed",`Prepared ${result.outreach_drafts.length} outreach drafts. None sent.`,{draftCount:result.outreach_drafts.length});

    // 7. Follow-up and 8. Opportunity agents produce recommendations, not fabricated actions
    const follow=await askAI("Return JSON {follow_up_plan:[{company,when,action,reason}]}. Give practical follow-up steps. Do not schedule or send anything.",{prospects:saved.map(x=>({company:x.company,score:x.qualification_score,next_action:x.next_action}))});
    result.follow_up_plan=follow.follow_up_plan||[];
    for (const f of result.follow_up_plan) {
      const lead=saved.find(x=>String(x.company||"").toLowerCase()===String(f.company||"").toLowerCase());
      if (!lead) continue;
      const days=Math.max(1,Math.min(30,Number(f.days_from_now)||3));
      await db.query(`INSERT INTO sales_followups(lead_id,title,details,due_at,status,source_run_id)
        VALUES($1,$2,$3,NOW()+($4 * INTERVAL '1 day'),'pending',$5)`,
        [lead.id,String(f.action||"Review prospect and follow up").slice(0,500),String(f.reason||f.when||"").slice(0,2000),days,runId]);
    }
    result.agents.push("Follow-up Agent");
    const opp=await askAI("Return JSON {opportunity_recommendations:[{company,stage_recommendation,estimated_value_guidance,reason}]}. Do not invent monetary values; use null where unknown.",{prospects:saved.map(x=>({company:x.company,score:x.qualification_score,enterprise:x.is_enterprise,reason:x.qualification_reason}))});
    result.opportunity_recommendations=opp.opportunity_recommendations||[];
    result.agents.push("Opportunity Management Agent");
    await record(runId,"Follow-up Agent","completed",`Created ${result.follow_up_plan.length} follow-up recommendations.`);
    await record(runId,"Opportunity Management Agent","completed",`Created ${result.opportunity_recommendations.length} opportunity recommendations.`);
    await updateRun(runId,{status:"completed",result:JSON.stringify(result),finished_at:new Date()});
    return result;
  } catch(err) {
    result.warnings.push(err.message);
    await record(runId,"Sales Workflow","failed",err.message);
    await updateRun(runId,{status:result.prospects.length?"partial":"failed",result:JSON.stringify(result),error:err.message,finished_at:new Date()});
    throw err;
  }
}
