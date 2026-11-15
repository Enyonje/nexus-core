import { prisma } from '../db.js';
import { generate, providerStatus } from './model-gateway.js';
import { agentRegistry } from './registry.js';

const byId=new Map(agentRegistry.map(a=>[a.id,a]));
const baseSystem='You are a senior social media operations professional working inside SocialOps AI. Be specific, useful, original, and commercially practical. Never invent research, performance data, platform capabilities, or brand facts. Clearly label assumptions and unknowns. Respect platform-native formats and avoid deceptive, discriminatory, or unsafe content.';
export async function runAgent({workspaceId,agent,task,context=''}) {
  const definition=byId.get(agent) || agentRegistry.find(a=>a.name.toLowerCase()===String(agent).toLowerCase());
  if(!definition) throw new Error(`Unknown agent. Choose one of: ${agentRegistry.map(a=>a.id).join(', ')}`);
  const brand=await prisma.brandProfile.findUnique({where:{workspaceId}}).catch(()=>null);
  const system=`${baseSystem}\nYour assigned role: ${definition.role}\nBrand voice: ${brand?.voice||'Not provided'}\nTarget audience: ${brand?.audience||'Not provided'}\nBrand guidelines: ${brand?.guidelines||'Not provided'}\nReturn a structured, actionable deliverable with clear headings.`;
  const run=await prisma.agentRun.create({data:{workspaceId,agent:definition.name,task,status:'RUNNING',result:'Agent is executing.'}});
  try {
    const output=await generate({system,prompt:`TASK\n${task}\n\nADDITIONAL CONTEXT\n${context||'None supplied.'}`});
    const result=await prisma.agentRun.update({where:{id:run.id},data:{status:'COMPLETED',result:output.text}});
    return {...result,provider:output.provider,model:output.model,usage:output.usage};
  } catch(e) {
    await prisma.agentRun.update({where:{id:run.id},data:{status:'FAILED',result:e.message}});
    throw e;
  }
}

const workflows={
 'weekly-content':[
  ['research','Research the audience, category, competitor positioning, current content opportunities, and relevant trends for this business. Do not claim live browsing; distinguish hypotheses from known facts.'],
  ['strategy','Create a weekly social strategy from the research: objectives, audience insight, content pillars, channel priorities, and success measures.'],
  ['content','Create a 7-day content plan with platform-native hooks, captions, formats, CTAs, and hashtags where appropriate.'],
  ['creative','Turn the content plan into practical creative briefs, visual direction, short-form video scripts, and shot lists.'],
  ['brand','Audit the complete plan for consistency, clarity, factual claims, brand safety, and platform fit. Return fixes and an approval recommendation.'],
  ['calendar','Convert the approved plan into a day-by-day publishing calendar with platform, format, purpose, and suggested local posting window.']
 ],
 'campaign-launch':[['research','Research the audience, category, competitors, and opportunity for the proposed campaign.'],['campaign','Build the campaign strategy, positioning, offer framing, objectives, phases, and KPIs.'],['content','Write the campaign assets for each requested social platform.'],['creative','Create campaign visual concepts, short video scripts, and production briefs.'],['brand','Review all campaign material for brand fit, factual claims, compliance risks, and clarity.']]
};
export async function runWorkflow({workspaceId,workflow,task,context=''}) {
  const steps=workflows[workflow]; if(!steps) throw new Error(`Unknown workflow. Available: ${Object.keys(workflows).join(', ')}`);
  const outputs=[]; let carry=`Business brief: ${task}\nContext: ${context||'None'}`;
  for(const [agent,instruction] of steps) {
    const result=await runAgent({workspaceId,agent,task:instruction,context:carry});
    outputs.push({agent,result:result.result,runId:result.id}); carry+=`\n\n${agent.toUpperCase()} OUTPUT\n${result.result}`;
  }
  return {workflow,steps:outputs,finalOutput:outputs.map(x=>`## ${x.agent}\n${x.result}`).join('\n\n')};
}
export { providerStatus };
