import crypto from 'node:crypto';

const env = (name) => process.env[name] || '';
const base = (platform) => ({
  id: platform,
  clientId: env(`${platform}_CLIENT_ID`) || (platform === 'TIKTOK' ? env('TIKTOK_CLIENT_KEY') : ''),
  clientSecret: env(`${platform}_CLIENT_SECRET`),
});

export function oauthStatus() {
  const publicUrl = env('API_PUBLIC_URL');
  return definitions.map((d) => {
    const c = base(d.id);
    const missing = [!c.clientId && `${d.id === 'TIKTOK' ? 'TIKTOK_CLIENT_KEY' : `${d.id}_CLIENT_ID`}`, !c.clientSecret && `${d.id}_CLIENT_SECRET`, !publicUrl && 'API_PUBLIC_URL'].filter(Boolean);
    return { id: d.id, name: d.name, configured: missing.length === 0, missing, callbackUrl: publicUrl ? `${publicUrl.replace(/\/$/, '')}/api/v1/oauth/${d.id.toLowerCase()}/callback` : null, scopes: d.scopes };
  });
}

const definitions = [
  { id:'INSTAGRAM', name:'Instagram', auth:'https://www.instagram.com/oauth/authorize', token:'https://api.instagram.com/oauth/access_token', scopes:['instagram_business_basic','instagram_business_content_publish'], profile:'https://graph.instagram.com/me?fields=id,username', profileName:'username', profileId:'id' },
  { id:'FACEBOOK', name:'Facebook', auth:()=>`https://www.facebook.com/${env('META_GRAPH_VERSION') || 'v27.0'}/dialog/oauth`, token:()=>`https://graph.facebook.com/${env('META_GRAPH_VERSION') || 'v27.0'}/oauth/access_token`, scopes:['pages_show_list','pages_read_engagement','pages_manage_posts','public_profile'], profile:()=>`https://graph.facebook.com/${env('META_GRAPH_VERSION') || 'v27.0'}/me?fields=id,name`, profileName:'name', profileId:'id' },
  { id:'LINKEDIN', name:'LinkedIn', auth:'https://www.linkedin.com/oauth/v2/authorization', token:'https://www.linkedin.com/oauth/v2/accessToken', scopes:['openid','profile','w_member_social'], profile:'https://api.linkedin.com/v2/userinfo', profileName:'name', profileId:'sub' },
  { id:'TIKTOK', name:'TikTok', auth:'https://www.tiktok.com/v2/auth/authorize/', token:'https://open.tiktokapis.com/v2/oauth/token/', scopes:['user.info.basic','video.list','video.upload','video.publish'], profile:'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username,avatar_url', profileName:'display_name', profileId:'open_id' },
  { id:'YOUTUBE', name:'YouTube', auth:'https://accounts.google.com/o/oauth2/v2/auth', token:'https://oauth2.googleapis.com/token', scopes:['openid','email','profile','https://www.googleapis.com/auth/youtube.readonly','https://www.googleapis.com/auth/youtube.upload'], profile:'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', profileName:'title', profileId:'id' },
  { id:'X', name:'X', auth:'https://twitter.com/i/oauth2/authorize', token:'https://api.x.com/2/oauth2/token', scopes:['users.read','tweet.read','tweet.write','offline.access','media.write'], profile:'https://api.x.com/2/users/me?user.fields=name,username,profile_image_url', profileName:'name', profileId:'id', pkce:true },
  { id:'PINTEREST', name:'Pinterest', auth:'https://www.pinterest.com/oauth/', token:'https://api.pinterest.com/v5/oauth/token', scopes:['user_accounts:read','boards:read','pins:read','pins:write'], profile:'https://api.pinterest.com/v5/user_account', profileName:'username', profileId:'username' },
  { id:'THREADS', name:'Threads', auth:'https://threads.net/oauth/authorize', token:'https://graph.threads.net/oauth/access_token', scopes:['threads_basic','threads_content_publish'], profile:'https://graph.threads.net/v1.0/me?fields=id,username', profileName:'username', profileId:'id' },
];

export function getOAuthDefinition(id) { return definitions.find((d) => d.id === id); }
export function oauthCredentials(id) { return base(id); }
export function callbackUrl(id) { const root=env('API_PUBLIC_URL').replace(/\/$/,''); if(!root) throw new Error('API_PUBLIC_URL is required'); return `${root}/api/v1/oauth/${id.toLowerCase()}/callback`; }
export function pkcePair() { const verifier=crypto.randomBytes(48).toString('base64url'); const challenge=crypto.createHash('sha256').update(verifier).digest('base64url'); return {verifier,challenge}; }

export function authorizationUrl(def, creds, redirectUri, state, verifier) {
  const url = new URL(typeof def.auth === 'function' ? def.auth() : def.auth);
  const p=url.searchParams;
  if(def.id==='TIKTOK') p.set('client_key',creds.clientId); else p.set('client_id',creds.clientId);
  p.set('redirect_uri',redirectUri); p.set('response_type','code'); p.set('state',state);
  p.set('scope', ['PINTEREST','INSTAGRAM','THREADS','TIKTOK'].includes(def.id) ? def.scopes.join(',') : def.scopes.join(' '));
  if(def.id==='YOUTUBE'){p.set('access_type','offline');p.set('include_granted_scopes','true');p.set('prompt','consent');}
  if(def.id==='LINKEDIN') p.set('response_type','code');
  if(def.pkce){p.set('code_challenge',verifier.challenge);p.set('code_challenge_method','S256');}
  return url.toString();
}

async function readJson(response) { const body=await response.json().catch(()=>({})); if(!response.ok || body.error) throw new Error(body.error_description || body.error?.message || body.error || `OAuth provider returned HTTP ${response.status}`); return body; }
async function postForm(url, fields, auth) { const headers={'content-type':'application/x-www-form-urlencoded'}; if(auth) headers.authorization=`Basic ${Buffer.from(`${auth.clientId}:${auth.clientSecret}`).toString('base64')}`; return readJson(await fetch(url,{method:'POST',headers,body:new URLSearchParams(fields)})); }

export async function exchangeAuthorizationCode(def, creds, code, redirectUri, verifier) {
  let token;
  if(def.id==='FACEBOOK'){
    const u=new URL(typeof def.token==='function'?def.token():def.token);u.searchParams.set('client_id',creds.clientId);u.searchParams.set('client_secret',creds.clientSecret);u.searchParams.set('redirect_uri',redirectUri);u.searchParams.set('code',code);token=await readJson(await fetch(u));
  } else if(def.id==='INSTAGRAM'){
    const form=new FormData(); for(const [k,v] of Object.entries({client_id:creds.clientId,client_secret:creds.clientSecret,grant_type:'authorization_code',redirect_uri:redirectUri,code})) form.set(k,v);
    token=await readJson(await fetch(def.token,{method:'POST',body:form}));
    const u=new URL('https://graph.instagram.com/access_token');u.searchParams.set('grant_type','ig_exchange_token');u.searchParams.set('client_secret',creds.clientSecret);u.searchParams.set('access_token',token.access_token);
    try { token=await readJson(await fetch(u)); } catch { /* retain valid short-lived token if long-lived exchange is unavailable */ }
  } else if(def.id==='THREADS'){
    token=await postForm(def.token,{client_id:creds.clientId,client_secret:creds.clientSecret,grant_type:'authorization_code',redirect_uri:redirectUri,code});
    if(token.access_token){const u=new URL('https://graph.threads.net/access_token');u.searchParams.set('grant_type','th_exchange_token');u.searchParams.set('client_secret',creds.clientSecret);u.searchParams.set('access_token',token.access_token);try{token=await readJson(await fetch(u));}catch{}}
  } else if(def.id==='PINTEREST'){
    token=await postForm(def.token,{code,redirect_uri:redirectUri,grant_type:'authorization_code'},creds);
  } else if(def.id==='X'){
    token=await postForm(def.token,{code,grant_type:'authorization_code',client_id:creds.clientId,redirect_uri:redirectUri,code_verifier:verifier},creds);
  } else if(def.id==='TIKTOK'){
    token=await postForm(def.token,{client_key:creds.clientId,client_secret:creds.clientSecret,code,grant_type:'authorization_code',redirect_uri:redirectUri});
  } else {
    token=await postForm(def.token,{grant_type:'authorization_code',code,redirect_uri:redirectUri,client_id:creds.clientId,client_secret:creds.clientSecret});
  }
  return token;
}

export async function fetchProviderProfile(def, accessToken) {
  const response=await fetch(typeof def.profile==='function'?def.profile():def.profile,{headers:{authorization:`Bearer ${accessToken}`}});
  const data=await readJson(response);
  if(def.id==='TIKTOK') return data.data?.user || data.user || {};
  if(def.id==='YOUTUBE') { const channel=data.items?.[0]; if(!channel) throw new Error('No YouTube channel was found for this Google account.'); return {id:channel.id,title:channel.snippet?.title}; }
  if(def.id==='X') return data.data || {};
  return data;
}
