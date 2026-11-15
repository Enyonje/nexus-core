export const providers = ["INSTAGRAM","FACEBOOK","LINKEDIN","TIKTOK","YOUTUBE","X","PINTEREST","THREADS"].map(id=>({id,name:id[0]+id.slice(1).toLowerCase(),ready:false,capabilities:["account_catalogue"]}));
export function getProvider(id){return providers.find(p=>p.id===id)||null;}
