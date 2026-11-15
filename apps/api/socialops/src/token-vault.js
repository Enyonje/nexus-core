import crypto from "node:crypto";
function key(){const k=Buffer.from(process.env.TOKEN_ENCRYPTION_KEY||"","base64");if(k.length!==32)throw Error("TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key");return k;}
export function encryptToken(value){const iv=crypto.randomBytes(12),c=crypto.createCipheriv("aes-256-gcm",key(),iv),data=Buffer.concat([c.update(value,"utf8"),c.final()]);return [iv,c.getAuthTag(),data].map(x=>x.toString("base64")).join(".");}
export function decryptToken(value){const [iv,tag,data]=value.split(".").map(x=>Buffer.from(x,"base64")),d=crypto.createDecipheriv("aes-256-gcm",key(),iv);d.setAuthTag(tag);return Buffer.concat([d.update(data),d.final()]).toString("utf8");}
