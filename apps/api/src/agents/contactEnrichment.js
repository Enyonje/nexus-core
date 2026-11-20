import { lookup as dnsLookup, resolveMx } from "node:dns/promises";
import { Agent } from "undici";
import { isIP } from "node:net";

const TIMEOUT_MS = 8000;
const MAX_BYTES = 1024 * 1024;
const MAX_PAGES = 5;

export function isPublicIP(ip) {
  if (isIP(ip) === 4) {
    const p = ip.split(".").map(Number);
    const [a, b] = p;

    return !(
      a === 0 || a === 10 || a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0)
    );
  }

  if (isIP(ip) === 6) {
    const value = ip.toLowerCase();

    return !(
      value === "::" ||
      value === "::1" ||
      value.startsWith("fc") ||
      value.startsWith("fd") ||
      value.startsWith("fe8") ||
      value.startsWith("fe9") ||
      value.startsWith("fea") ||
      value.startsWith("feb") ||
      value.startsWith("ff") ||
      value.startsWith("::ffff:")
    );
  }

  return false;
}

export async function validatePublicUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid website URL");
  }

  if (!["https:", "http:"].includes(url.protocol)) {
    throw new Error("Unsupported website protocol");
  }

  if (
    url.username || url.password ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".localhost") ||
    url.hostname.endsWith(".local")
  ) {
    throw new Error("Private or unsupported website");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");

  if (isIP(host)) {
    if (!isPublicIP(host)) throw new Error("Private IP blocked");
  } else {
    const addresses = await dnsLookup(host, { all: true, verbatim: true });

    if (!addresses.length || addresses.some(x => !isPublicIP(x.address))) {
      throw new Error("Website resolves to a private or restricted IP");
    }
  }

  return url;
}

function createSafeDispatcher() {
  return new Agent({
    connect: {
      lookup(hostname, options, callback) {
        dnsLookup(hostname, { all: true, verbatim: true })
          .then(addresses => {
            if (
              !addresses.length ||
              addresses.some(item => !isPublicIP(item.address))
            ) {
              callback(new Error("Blocked private or restricted destination"));
              return;
            }

            const family = options?.family || 0;
            const selected = addresses.filter(
              item => !family || item.family === family
            );

            if (!selected.length) {
              callback(new Error("No permitted IP address available"));
              return;
            }

            if (options?.all) {
              callback(null, selected);
            } else {
              callback(null, selected[0].address, selected[0].family);
            }
          })
          .catch(callback);
      }
    }
  });
}

async function fetchPublicPage(value) {
  let url = value;

  for (let redirect = 0; redirect <= 3; redirect++) {
    url = (await validatePublicUrl(url)).href;

    const dispatcher = createSafeDispatcher();

    try {
      const response = await fetch(url, {
        dispatcher,
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "User-Agent": "NexusCore-CompanyResearch/1.0",
          "Accept": "text/html,application/xhtml+xml"
        }
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        await response.body?.cancel();

        if (!location || redirect === 3) return null;

        url = new URL(location, url).href;
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();
        return null;
      }

      const type = response.headers.get("content-type") || "";
      if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) {
        await response.body?.cancel();
        return null;
      }

      const length = Number(response.headers.get("content-length") || 0);
      if (length > MAX_BYTES) {
        await response.body?.cancel();
        return null;
      }

      const reader = response.body?.getReader();
      if (!reader) return null;

      const chunks = [];
      let size = 0;

      try {
        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;

          size += chunk.length;

          if (size > MAX_BYTES) {
            await reader.cancel();
            return null;
          }

          chunks.push(chunk);
        }
      } finally {
        reader.releaseLock();
      }

      return {
        url: response.url || url,
        html: Buffer.concat(chunks).toString("utf8")
      };
    } finally {
      await dispatcher.close().catch(() => {});
    }
  }

  return null;
}

function decodeHtml(value) {
  return value
    .replace(/&commat;|&#64;|&#x40;/gi, "@")
    .replace(/&period;|&#46;|&#x2e;/gi, ".")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ");
}


export function cleanHtml(html) {
  let text = html;

  for (const tag of ["script", "style", "noscript", "svg"]) {
    while (true) {
      const lower = text.toLowerCase();
      const a = lower.indexOf("<" + tag);
      if (a < 0) break;
      const b = lower.indexOf("</" + tag + ">", a);
      if (b < 0) break;
      text = text.slice(0, a) + " " + text.slice(b + tag.length + 3);
    }
  }

  return decodeHtml(text.split("<").map((part, i) =>
    i === 0 ? part : part.slice(part.indexOf(">") + 1)
  ).join(" ")).replaceAll("<!--", " ");
}

export function validEmail(value) {
  if (!value || value.length > 254) return false;
  const parts = value.split("@");
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (!local || local.length > 64 || !domain.includes(".")) return false;

  const labels = domain.split(".");
  if (labels.some(x => !x || x.length > 63 || x.startsWith("-") || x.endsWith("-"))) return false;

  return !/\s/.test(value);
}

export function extractEmails(html) {
  const found = new Set();
  const lower = html.toLowerCase();

  let position = 0;
  while ((position = lower.indexOf("mailto:", position)) >= 0) {
    const start = position + 7;
    let end = start;

    while (end < html.length && !["'", '"', "?", "#", " ", ">"].includes(html[end])) end++;

    const email = decodeHtml(html.slice(start, end)).trim().toLowerCase();
    if (validEmail(email)) found.add(email);
    position = end;
  }

  const text = cleanHtml(html);
  for (const token of text.split(/\s+/)) {
    const email = token.replace(/^[.,;:([{<]+|[.,;:)\]}>]+$/g, "").toLowerCase();
    if (validEmail(email)) found.add(email);
  }

  return [...found].filter(email =>
    !["example.com", "email.com", "yourdomain.com", "domain.com"].some(x => email.endsWith("@" + x)) &&
    ![".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".css", ".js"].some(x => email.endsWith(x))
  );
}

export function discoverContactLinks(html, baseUrl) {
  const links = [];
  let position = 0;

  while ((position = html.toLowerCase().indexOf("<a", position)) >= 0) {
    const endTag = html.indexOf(">", position);
    if (endTag < 0) break;

    const close = html.toLowerCase().indexOf("</a>", endTag);
    const anchor = html.slice(position, endTag + 1);
    const label = close >= 0 ? html.slice(endTag + 1, close) : "";
    const candidate = (anchor + " " + label).toLowerCase();

    if (["contact", "about", "team", "company", "support", "reach", "imprint"].some(x => candidate.includes(x))) {
      const hrefPosition = anchor.toLowerCase().indexOf("href");
      if (hrefPosition >= 0) {
        const equals = anchor.indexOf("=", hrefPosition);
        if (equals >= 0) {
          const quote = anchor[equals + 1];
          if (quote === '"' || quote === "'") {
            const finish = anchor.indexOf(quote, equals + 2);
            if (finish > equals) {
              try {
                const url = new URL(decodeHtml(anchor.slice(equals + 2, finish)), baseUrl);
                const base = new URL(baseUrl);

                if (url.hostname === base.hostname && ["http:", "https:"].includes(url.protocol)) {
                  url.hash = "";
                  links.push(url.href);
                }
              } catch {}
            }
          }
        }
      }
    }

    position = endTag + 1;
  }

  return [...new Set(links)];
}

async function checkMx(email) {
  const domain = email.split("@").pop();

  try {
    const records = await resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

export async function enrichCompanyContact(website) {
  const result = {
    email: null,
    email_source_url: null,
    email_source_type: null,
    email_syntax_valid: false,
    domain_mx_found: false,
    mailbox_deliverability: "unknown",
    contact_status: "email_missing",
    pages_checked: [],
    checked_at: new Date().toISOString()
  };

  if (!website) return result;

  let homepage;

  try {
    homepage = await validatePublicUrl(website);
  } catch {
    result.contact_status = "website_unavailable";
    return result;
  }

  const pages = [homepage.href];
  const visited = new Set();
  const candidates = [];

  while (pages.length && visited.size < MAX_PAGES) {
    const current = pages.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    try {
      const page = await fetchPublicPage(current);
      if (!page) continue;

      result.pages_checked.push(page.url);

      for (const email of extractEmails(page.html)) {
        candidates.push({
          email,
          source: page.url,
          domainMatch: email.endsWith(`@${homepage.hostname.replace(/^www\./, "")}`)
        });
      }

      if (visited.size === 1) {
        pages.push(...discoverContactLinks(page.html, page.url));
      }
    } catch (error) {
      console.warn("[ContactEnrichment] Page skipped:", String(error.message || error).slice(0, 180));
    }
  }

  const unique = [...new Map(candidates.map(x => [x.email, x])).values()]
    .sort((a, b) => Number(b.domainMatch) - Number(a.domainMatch));

  if (!unique.length) return result;

  const selected = unique[0];

  result.email = selected.email;
  result.email_source_url = selected.source;
  result.email_source_type = "public_company_website";
  result.email_syntax_valid = true;
  result.domain_mx_found = await checkMx(selected.email);
  result.contact_status = result.domain_mx_found
    ? "public_email_mx_found"
    : "public_email_mx_not_found";

  return result;
}
