/* Embed on any site or app:
   <script src="https://YOUR-APP/chat-widget.js" data-key="WIDGET_KEY" data-api="https://YOUR-API" defer></script> */
(() => {
    const s = document.currentScript;
    const base = `${(s.dataset.api || "").replace(/\/$/, "")}/api/v1/supportops/chat/widget/${s.dataset.key}`;
    const LS = `so_chat_${s.dataset.key}`;
    let conv = JSON.parse(localStorage.getItem(LS) || "null");
    let es;

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>
      *{box-sizing:border-box;font-family:system-ui,sans-serif}
      #b{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;border:0;background:#2563eb;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 8px 24px #0004}
      #p{position:fixed;right:20px;bottom:88px;width:340px;max-width:calc(100vw - 40px);height:460px;display:flex;flex-direction:column;background:#fff;border-radius:16px;box-shadow:0 12px 40px #0005;overflow:hidden}
      #p[hidden]{display:none}
      header{background:#0f172a;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;font-weight:600}
      header span{cursor:pointer}
      #m{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f8fafc}
      .g{max-width:80%;padding:8px 12px;border-radius:14px;font-size:14px;line-height:1.35;white-space:pre-wrap;word-break:break-word}
      .v{align-self:flex-end;background:#2563eb;color:#fff}
      .a{align-self:flex-start;background:#e2e8f0;color:#0f172a}
      form{display:flex;gap:8px;padding:10px;border-top:1px solid #e2e8f0}
      input{flex:1;padding:10px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px}
      form button{border:0;background:#2563eb;color:#fff;border-radius:10px;padding:0 14px;cursor:pointer}
    </style>
    <button id="b" aria-label="Open chat">💬</button>
    <div id="p" hidden><header>Chat with us <span id="x">×</span></header><div id="m"></div>
    <form id="f"><input id="i" placeholder="Type a message…" maxlength="2000" autocomplete="off"><button>Send</button></form></div>`;

    const $ = (id) => root.getElementById(id);
    const post = async (path, body) => {
        const r = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(r.status);
        return r.json();
    };
    const seen = new Set();
    const add = (m) => {
        if (seen.has(m.id)) return;
        seen.add(m.id);
        const d = document.createElement("div");
        d.className = `g ${m.sender === "visitor" ? "v" : "a"}`;
        d.textContent = m.body;
        $("m").appendChild(d);
        $("m").scrollTop = 1e9;
    };
    const connect = () => {
        if (es || !conv) return;
        es = new EventSource(`${base}/${conv.id}/stream?secret=${conv.secret}`);
        es.onmessage = (e) => { const ev = JSON.parse(e.data); if (ev.type === "message") add(ev.message); };
    };
    const history = async () => {
        const r = await fetch(`${base}/${conv.id}/messages?secret=${conv.secret}`);
        if (r.ok) (await r.json()).forEach(add);
    };

    $("b").onclick = async () => {
        $("p").hidden = !$("p").hidden;
        if (!$("p").hidden && conv && !es) { await history(); connect(); }
    };
    $("x").onclick = () => { $("p").hidden = true; };
    $("f").onsubmit = async (e) => {
        e.preventDefault();
        const body = $("i").value.trim();
        if (!body) return;
        $("i").value = "";
        try {
            if (!conv) {
                const r = await post("/start", { message: body });
                conv = { id: r.conversationId, secret: r.secret };
                localStorage.setItem(LS, JSON.stringify(conv));
                await history();
                connect();
            } else {
                await post(`/${conv.id}/messages`, { secret: conv.secret, body });
            }
        } catch { add({ id: `e${Date.now()}`, sender: "agent", body: "Message not sent. Please try again." }); }
    };
})();
