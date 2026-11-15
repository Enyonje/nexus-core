import { config } from '../config.js';

export function providerStatus() {
  const p = config.provider;
  const key = p === 'anthropic' ? process.env.ANTHROPIC_API_KEY : p === 'gemini' ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
  return { provider:p, model:config.model || defaultModel(p), configured:Boolean(key) };
}
function defaultModel(p) { return p === 'anthropic' ? 'claude-3-7-sonnet-latest' : p === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4.1-mini'; }
export async function generate({system, prompt, temperature=0.5}) {
  const p=config.provider; const model=config.model || defaultModel(p);
  const key=p==='anthropic'?process.env.ANTHROPIC_API_KEY:p==='gemini'?process.env.GEMINI_API_KEY:process.env.OPENAI_API_KEY;
  if (!key) throw new Error(`Missing ${p.toUpperCase()}_API_KEY. Add it to your environment to execute agents.`);
  const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),90000);
  try {
    let url, headers, body;
    if(p==='anthropic') {
      url='https://api.anthropic.com/v1/messages'; headers={'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json'};
      body={model,max_tokens:config.maxTokens,temperature,system,messages:[{role:'user',content:prompt}]};
    } else if(p==='gemini') {
      url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`; headers={'content-type':'application/json'};
      body={systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature,maxOutputTokens:config.maxTokens}};
    } else {
      url='https://api.openai.com/v1/chat/completions'; headers={authorization:`Bearer ${key}`,'content-type':'application/json'};
      body={model,messages:[{role:'system',content:system},{role:'user',content:prompt}],temperature,max_tokens:config.maxTokens};
    }
    const response=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),signal:controller.signal});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.error?.message || data.message || `AI provider request failed (${response.status})`);
    const text=p==='anthropic'?data.content?.filter(x=>x.type==='text').map(x=>x.text).join('\n'):p==='gemini'?data.candidates?.[0]?.content?.parts?.map(x=>x.text).join('\n'):data.choices?.[0]?.message?.content;
    if(!text) throw new Error('The AI provider returned an empty response.');
    return {text,provider:p,model,usage:data.usage||data.usageMetadata||null};
  } finally { clearTimeout(timeout); }
}
