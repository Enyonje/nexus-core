
import { db } from "../db/db.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

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
async function askAI(system, input) {
  if (!process.env.OPENAI_API_KEY) throw new Error("AI processing needs OPENAI_API_KEY configured on the API service.");
  const r = await fetch(OPENAI_URL, {
    method:"POST", headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:process.env.SALES_AGENT_MODEL || "gpt-4o-mini",temperature:0.2,
      response_format:{type:"json_object"},messages:[{role:"system",content:system},{role:"user",content:JSON.stringify(input)}]})
  });
  if (!r.ok) throw new Error(`AI provider failed (${r.status}): ${(await r.text()).slice(0,400)}`);
  const data=await r.json();
  return JSON.parse(data.choices?.[0]?.message?.content || "{}");
}
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
      if (existing.rowCount) {
        const r=await db.query(`UPDATE sales_leads SET website=COALESCE($2,website),source_url=COALESCE($3,source_url),research=$4::jsonb,qualification_score=$5,qualification_reason=$6,next_action=$7,updated_at=NOW() WHERE id=$1 RETURNING *`,
          [existing.rows[0].id,website,sourceUrl,JSON.stringify(p),Math.max(0,Math.min(100,Number(p.score)||0)),p.qualification_reason||p.fit_summary||null,p.next_action||"Review prospect"]);
        lead=r.rows[0];
      } else {
        const r=await db.query(`INSERT INTO sales_leads(name,company,source,stage,is_enterprise,website,source_url,research,qualification_score,qualification_reason,next_action,notes)
          VALUES($1,$1,'AI Market Research','new',$2,$3,$4,$5::jsonb,$6,$7,$8,$9) RETURNING *`,
          [p.company,Boolean(p.is_enterprise),website,sourceUrl,JSON.stringify(p),Math.max(0,Math.min(100,Number(p.score)||0)),p.qualification_reason||p.fit_summary||null,p.next_action||"Review prospect",p.description||null]);
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
    result.agents.push("Outreach Agent");
    await record(runId,"Outreach Agent","completed",`Prepared ${result.outreach_drafts.length} outreach drafts. None sent.`,{draftCount:result.outreach_drafts.length});

    // 7. Follow-up and 8. Opportunity agents produce recommendations, not fabricated actions
    const follow=await askAI("Return JSON {follow_up_plan:[{company,when,action,reason}]}. Give practical follow-up steps. Do not schedule or send anything.",{prospects:saved.map(x=>({company:x.company,score:x.qualification_score,next_action:x.next_action}))});
    result.follow_up_plan=follow.follow_up_plan||[];
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
