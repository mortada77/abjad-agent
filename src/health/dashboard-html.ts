/* eslint-disable */
// Single-file dashboard SPA served at "/". Vanilla JS, no build step.
// Auth: admin token (= PAIRING_TOKEN) stored in localStorage, sent as header.
export const DASHBOARD_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Abjad Agi — لوحة التحكم</title>
<style>
:root{--bg:#0b1220;--card:#161f33;--card2:#1e293b;--line:#293449;--tx:#e5edf7;--mut:#94a3b8;--pri:#7c5cff;--ok:#22c55e;--warn:#f59e0b;--bad:#ef4444}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,Segoe UI,Tahoma,sans-serif;background:var(--bg);color:var(--tx)}
header{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding:14px 18px;background:var(--card);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5}
h1{font-size:18px;margin:0}
.pill{padding:4px 10px;border-radius:999px;font-size:13px;font-weight:600}
.muted{color:var(--mut);font-size:13px}
.wrap{max-width:1100px;margin:0 auto;padding:16px;display:grid;gap:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
button{background:var(--pri);color:#fff;border:0;border-radius:10px;padding:9px 14px;font-size:14px;cursor:pointer;font-family:inherit}
button.sec{background:var(--card2);border:1px solid var(--line)}
button.bad{background:var(--bad)}
button:disabled{opacity:.5;cursor:not-allowed}
input,textarea{background:var(--card2);color:var(--tx);border:1px solid var(--line);border-radius:10px;padding:9px;font-family:inherit;font-size:14px;width:100%}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:right;padding:8px;border-bottom:1px solid var(--line)}
th{color:var(--mut);font-weight:600}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:800px){.grid2{grid-template-columns:1fr}}
.tabs{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap}
.tab{background:var(--card2);border:1px solid var(--line);padding:7px 12px;border-radius:10px;cursor:pointer;font-size:14px}
.tab.on{background:var(--pri);border-color:var(--pri)}
.chat{max-height:340px;overflow:auto;display:flex;flex-direction:column;gap:8px;padding:4px}
.msg{max-width:80%;padding:8px 12px;border-radius:12px;font-size:14px;white-space:pre-wrap;line-height:1.5}
.me{align-self:flex-start;background:#233149}
.them{align-self:flex-end;background:#0f5132}
pre{background:#0a0f1a;border:1px solid var(--line);border-radius:10px;padding:12px;overflow:auto;max-height:420px;font-size:12px;direction:ltr;text-align:left}
.hide{display:none}
img.qr{background:#fff;padding:10px;border-radius:12px}
.switch{display:inline-flex;align-items:center;gap:8px;cursor:pointer}
.dot{width:10px;height:10px;border-radius:50%;display:inline-block}
</style>
</head>
<body>
<div id="login" class="wrap">
  <div class="card">
    <h1>لوحة تحكم Abjad Agi</h1>
    <p class="muted">أدخل رمز الدخول (نفس PAIRING_TOKEN).</p>
    <div class="row">
      <input id="tok" type="password" placeholder="admin token" style="max-width:320px"/>
      <button onclick="doLogin()">دخول</button>
    </div>
    <p id="loginErr" class="muted" style="color:var(--bad)"></p>
  </div>
</div>

<div id="appui" class="hide">
<header>
  <div class="row">
    <h1>🤖 Abjad Agi</h1>
    <span id="waPill" class="pill">—</span>
    <span id="aiPill" class="pill">—</span>
  </div>
  <div class="row">
    <label class="switch"><input type="checkbox" id="glob" onchange="toggleGlobal()"/> الرد التلقائي</label>
    <button class="sec" onclick="refreshAll()">تحديث</button>
    <button class="bad" onclick="resetSession()">إعادة ربط الواتساب</button>
    <button class="sec" onclick="logout()">خروج</button>
  </div>
</header>

<div class="wrap">
  <div class="row muted" id="meta"></div>

  <div id="qrCard" class="card hide" style="text-align:center">
    <h3>ربط الواتساب</h3>
    <div id="qrBox"></div>
    <p class="muted">افتح واتساب على هاتف الرقم ← الأجهزة المرتبطة ← ربط جهاز، وامسح الكود.</p>
  </div>

  <div class="grid2">
    <div class="card">
      <div class="row" style="justify-content:space-between"><h3 style="margin:0">العملاء</h3><span id="cCount" class="muted"></span></div>
      <div style="overflow:auto;max-height:420px">
        <table><thead><tr><th>الاسم/الرقم</th><th>الحالة</th><th></th></tr></thead>
        <tbody id="contacts"></tbody></table>
      </div>
    </div>

    <div class="card">
      <div class="row" style="justify-content:space-between">
        <h3 style="margin:0" id="chatTitle">المحادثة</h3>
        <span id="chatState" class="muted"></span>
      </div>
      <div id="chat" class="chat"></div>
      <div class="row" style="margin-top:10px">
        <input id="reply" placeholder="اكتب رسالة يدوية..." onkeydown="if(event.key==='Enter')sendManual()"/>
        <button onclick="sendManual()" id="sendBtn" disabled>إرسال</button>
      </div>
      <div class="row" style="margin-top:8px">
        <button class="sec" id="pauseBtn" onclick="pauseC()" disabled>إيقاف الرد لهذا العميل</button>
        <button class="sec" id="resumeBtn" onclick="resumeC()" disabled>تفعيل الرد</button>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="tabs">
      <div class="tab on" id="tab-esc" onclick="showTab('esc')">🔔 التصعيدات</div>
      <div class="tab" id="tab-log" onclick="showTab('log')">📜 اللوجات</div>
    </div>
    <div id="pane-esc">
      <table><thead><tr><th>الوقت</th><th>العميل</th><th>الطلب</th><th></th></tr></thead>
      <tbody id="escs"></tbody></table>
    </div>
    <div id="pane-log" class="hide"><button class="sec" onclick="loadLogs()">تحديث اللوجات</button><pre id="logs"></pre></div>
  </div>
</div>
</div>

<script>
var TOKEN = localStorage.getItem("abjad_token") || "";
var curJid = null, curName = null;

function doLogin(){ TOKEN = document.getElementById("tok").value.trim(); localStorage.setItem("abjad_token",TOKEN); boot(); }
function logout(){ localStorage.removeItem("abjad_token"); TOKEN=""; location.reload(); }

function api(path, opts){
  opts = opts || {};
  opts.headers = Object.assign({"x-admin-token":TOKEN,"content-type":"application/json"}, opts.headers||{});
  return fetch("/api"+path, opts).then(function(r){
    if(r.status===401){ throw {unauth:true}; }
    return r.json().catch(function(){return {};});
  });
}
function post(path, body){ return api(path,{method:"POST",body:JSON.stringify(body||{})}); }

function boot(){
  api("/state").then(function(){
    document.getElementById("login").classList.add("hide");
    document.getElementById("appui").classList.remove("hide");
    refreshAll();
    setInterval(refreshState, 5000);
    setInterval(refreshQR, 8000);
  }).catch(function(e){
    if(e && e.unauth){ document.getElementById("loginErr").textContent="رمز غير صحيح"; }
    document.getElementById("login").classList.remove("hide");
  });
}

function pill(el,text,color){ el.textContent=text; el.style.background=color; el.style.color="#fff"; }

function refreshState(){
  api("/state").then(function(s){
    var wa=document.getElementById("waPill");
    var col = s.whatsapp==="connected"?"#22c55e":(s.whatsapp==="waiting_qr"?"#f59e0b":"#ef4444");
    pill(wa,"واتساب: "+s.whatsapp,col);
    pill(document.getElementById("aiPill"), s.aiReady?("AI: "+s.aiProvider+" ✓"):"AI: غير جاهز", s.aiReady?"#3b82f6":"#ef4444");
    document.getElementById("glob").checked = !!s.aiGloballyEnabled;
    var m = "التشغيل: "+fmtUptime(s.uptimeSeconds)+" · عملاء: "+s.contacts+" · رسائل: "+s.messages;
    if(!s.adminConfigured) m += " · ⚠️ ADMIN_NUMBER غير مضبوط (لا تصل إشعارات)";
    if(s.lastDisconnect) m += " · آخر انقطاع: "+s.lastDisconnect;
    document.getElementById("meta").textContent = m;
    document.getElementById("qrCard").classList.toggle("hide", s.whatsapp==="connected");
  }).catch(handleErr);
}
function refreshQR(){
  if(document.getElementById("qrCard").classList.contains("hide")) return;
  api("/qr").then(function(q){
    var box=document.getElementById("qrBox");
    if(q.qr){ box.innerHTML='<img class="qr" src="'+q.qr+'"/>'; }
    else { box.innerHTML='<p class="muted">الحالة: '+q.status+' — انتظر لحظات أو اضغط إعادة ربط.</p>'; }
  }).catch(handleErr);
}
function refreshAll(){ refreshState(); refreshQR(); loadContacts(); loadEscalations(); }

function loadContacts(){
  api("/contacts").then(function(list){
    document.getElementById("cCount").textContent = list.length+" عميل";
    var tb=document.getElementById("contacts"); tb.innerHTML="";
    list.forEach(function(c){
      var tr=document.createElement("tr");
      var nm = c.display_name || c.phone || c.jid;
      var st = c.state==="HUMAN_MODE" ? '<span class="dot" style="background:#f59e0b"></span> يدوي' : '<span class="dot" style="background:#22c55e"></span> تلقائي';
      tr.innerHTML='<td>'+esc(nm)+'<div class="muted">'+esc(c.phone||"")+'</div></td><td>'+st+'</td>';
      var td=document.createElement("td"); var b=document.createElement("button"); b.className="sec"; b.textContent="فتح";
      b.onclick=function(){ openConversation(c.jid, nm, c.state); }; td.appendChild(b); tr.appendChild(td);
      tb.appendChild(tr);
    });
  }).catch(handleErr);
}

function openConversation(jid,name,state){
  curJid=jid; curName=name;
  document.getElementById("chatTitle").textContent="محادثة: "+name;
  document.getElementById("sendBtn").disabled=false;
  document.getElementById("pauseBtn").disabled=false;
  document.getElementById("resumeBtn").disabled=false;
  api("/conversation?jid="+encodeURIComponent(jid)).then(function(msgs){
    var box=document.getElementById("chat"); box.innerHTML="";
    msgs.forEach(function(m){
      var d=document.createElement("div");
      d.className="msg "+(m.role==="assistant"?"them":"me");
      d.textContent=m.content;
      box.appendChild(d);
    });
    box.scrollTop=box.scrollHeight;
  }).catch(handleErr);
}
function sendManual(){
  if(!curJid) return;
  var el=document.getElementById("reply"); var t=el.value.trim(); if(!t) return;
  el.value="";
  post("/send",{jid:curJid,text:t}).then(function(){ openConversation(curJid,curName); loadContacts(); }).catch(handleErr);
}
function pauseC(){ if(curJid) post("/pause",{jid:curJid}).then(loadContacts).catch(handleErr); }
function resumeC(){ if(curJid) post("/resume",{jid:curJid}).then(loadContacts).catch(handleErr); }

function loadEscalations(){
  api("/escalations").then(function(list){
    var tb=document.getElementById("escs"); tb.innerHTML="";
    list.forEach(function(e){
      var tr=document.createElement("tr");
      if(e.handled) tr.style.opacity=".5";
      var who=(e.name||e.phone||e.jid);
      tr.innerHTML='<td class="muted">'+fmtTime(e.created_at)+'</td><td>'+esc(who)+'<div class="muted">'+esc(e.phone||"")+'</div></td><td>'+esc(e.reason)+'<div class="muted">'+esc(e.last_msg||"")+'</div></td>';
      var td=document.createElement("td");
      var b1=document.createElement("button"); b1.className="sec"; b1.textContent="فتح"; b1.onclick=function(){openConversation(e.jid,who);};
      td.appendChild(b1);
      if(!e.handled){ var b2=document.createElement("button"); b2.textContent="تم"; b2.style.marginright="6px"; b2.onclick=function(){post("/escalations/handle",{id:e.id}).then(loadEscalations);}; td.appendChild(b2); }
      tr.appendChild(td); tb.appendChild(tr);
    });
  }).catch(handleErr);
}
function loadLogs(){ fetch("/api/logs",{headers:{"x-admin-token":TOKEN}}).then(function(r){return r.text();}).then(function(t){document.getElementById("logs").textContent=t;document.getElementById("logs").scrollTop=9e9;}).catch(handleErr); }

function toggleGlobal(){ post("/ai-global",{enabled:document.getElementById("glob").checked}).catch(handleErr); }
function resetSession(){ if(confirm("سيتم تسجيل الخروج من واتساب وطلب QR جديد. متأكد؟")) post("/reset-session",{}).then(function(){ alert("جاري إعادة الربط... انتظر ظهور QR."); }).catch(handleErr); }

function showTab(t){
  document.getElementById("tab-esc").classList.toggle("on",t==="esc");
  document.getElementById("tab-log").classList.toggle("on",t==="log");
  document.getElementById("pane-esc").classList.toggle("hide",t!=="esc");
  document.getElementById("pane-log").classList.toggle("hide",t!=="log");
  if(t==="log") loadLogs();
}

function handleErr(e){ if(e&&e.unauth){ logout(); } }
function esc(s){ s=String(s==null?"":s); return s.replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function fmtUptime(s){ s=s||0; var h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h+"س "+m+"د"; }
function fmtTime(ms){ try{return new Date(ms).toLocaleString("ar");}catch(e){return "";} }

if(TOKEN) boot();
</script>
</body>
</html>`;
