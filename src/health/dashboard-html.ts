/* eslint-disable */
// Abjad Agi — CRM-style control center. Vanilla JS SPA served at "/".
// Auth: admin token (= PAIRING_TOKEN) in localStorage, sent as x-admin-token.
export const DASHBOARD_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Abjad Agi — مركز التحكم</title>
<style>
:root{--bg:#070c17;--panel:#0f1830;--panel2:#152242;--line:#22304f;--tx:#e8eefb;--mut:#8ea3c4;
--pri:#2f6bff;--pri2:#1b4fd6;--ok:#22c55e;--warn:#f59e0b;--hot:#ff5a5a;--buy:#a855f7;--cyan:#38bdf8}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,Segoe UI,Tahoma,sans-serif;background:
radial-gradient(1200px 500px at 80% -10%,rgba(47,107,255,.18),transparent),var(--bg);color:var(--tx)}
a{color:var(--cyan)}
header{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;
padding:12px 18px;background:rgba(15,24,48,.85);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20}
.brand{display:flex;align-items:center;gap:10px}
.brand .logo,.brand svg{width:40px;height:40px;border-radius:50%}
.brand b{font-size:17px}
.pill{padding:4px 10px;border-radius:999px;font-size:12.5px;font-weight:600;white-space:nowrap}
.muted{color:var(--mut);font-size:13px}
.wrap{max-width:1280px;margin:0 auto;padding:16px;display:grid;gap:16px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:16px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
button{background:var(--pri);color:#fff;border:0;border-radius:10px;padding:9px 13px;font-size:13.5px;cursor:pointer;font-family:inherit}
button.sec{background:var(--panel2);border:1px solid var(--line)}
button.bad{background:#3a1622;border:1px solid #7f1d1d;color:#fecaca}
button.sm{padding:6px 10px;font-size:12.5px}
button:disabled{opacity:.45;cursor:not-allowed}
input,textarea,select{background:var(--panel2);color:var(--tx);border:1px solid var(--line);border-radius:10px;padding:9px;font-family:inherit;font-size:14px;width:100%}
textarea{min-height:120px;resize:vertical;line-height:1.7}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
@media(max-width:760px){.kpis{grid-template-columns:repeat(2,1fr)}}
.kpi{background:linear-gradient(180deg,var(--panel2),var(--panel));border:1px solid var(--line);border-radius:16px;padding:14px}
.kpi .n{font-size:28px;font-weight:800;margin-top:4px}
.kpi .l{color:var(--mut);font-size:13px}
.nav{display:flex;gap:8px;flex-wrap:wrap}
.nav .t{background:var(--panel2);border:1px solid var(--line);padding:8px 14px;border-radius:12px;cursor:pointer;font-size:14px}
.nav .t.on{background:var(--pri);border-color:var(--pri)}
.pipe{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.stage{flex:1;min-width:110px;background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center}
.stage b{display:block;font-size:20px}
.work{display:grid;grid-template-columns:1.1fr 1.4fr 1.1fr;gap:14px}
@media(max-width:1040px){.work{grid-template-columns:1fr}}
.list{display:flex;flex-direction:column;gap:6px;max-height:520px;overflow:auto}
.ct{display:flex;gap:10px;align-items:center;padding:9px;border-radius:12px;cursor:pointer;border:1px solid transparent}
.ct:hover{background:var(--panel2)}
.ct.on{background:var(--panel2);border-color:var(--pri)}
.av{width:38px;height:38px;border-radius:50%;background:var(--pri2);display:flex;align-items:center;justify-content:center;font-weight:700;flex:0 0 auto}
.ct .nm{font-weight:600;font-size:14px}
.ct .lm{color:var(--mut);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}
.tag{font-size:11px;padding:2px 7px;border-radius:999px;white-space:nowrap}
.chat{max-height:430px;overflow:auto;display:flex;flex-direction:column;gap:8px;padding:4px}
.msg{max-width:82%;padding:8px 12px;border-radius:14px;font-size:14px;white-space:pre-wrap;line-height:1.55}
.them{align-self:flex-start;background:#1b2a4a}
.me{align-self:flex-end;background:#123d2b}
.msg .who{font-size:11px;color:var(--mut);margin-bottom:2px}
.iRow{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px dashed var(--line);font-size:13.5px}
.iRow .k{color:var(--mut)}
.meter{height:10px;background:var(--panel2);border-radius:999px;overflow:hidden;border:1px solid var(--line)}
.meter>i{display:block;height:100%;background:linear-gradient(90deg,#ef4444,#f59e0b,#22c55e)}
pre{background:#060b16;border:1px solid var(--line);border-radius:12px;padding:12px;overflow:auto;max-height:460px;font-size:12px;direction:ltr;text-align:left;white-space:pre-wrap}
.hide{display:none}
img.qr{background:#fff;padding:10px;border-radius:12px}
.switch{display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:14px}
h3{margin:0 0 10px}
/* animated background canvas */
#bg{position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;display:block}
/* Abjad blue neon glow across the UI */
header{box-shadow:0 6px 30px rgba(47,107,255,.18)}
.brand b{text-shadow:0 0 14px rgba(56,189,248,.7)}
.brand .logo,.brand svg{box-shadow:0 0 16px rgba(47,107,255,.7);filter:drop-shadow(0 0 8px rgba(56,189,248,.6))}
.card{box-shadow:0 0 0 1px rgba(47,107,255,.06),0 10px 34px rgba(0,0,0,.4)}
.kpi{box-shadow:0 0 22px rgba(47,107,255,.14)}
.kpi .n{text-shadow:0 0 18px rgba(47,107,255,.5)}
button:not(.sec):not(.bad){box-shadow:0 0 16px rgba(47,107,255,.55)}
.t.on,.ct.on{box-shadow:0 0 16px rgba(47,107,255,.5)}
.av{box-shadow:0 0 14px rgba(47,107,255,.6)}
.meter>i{box-shadow:0 0 12px rgba(56,189,248,.6)}
</style>
</head>
<body>
<canvas id="bg"></canvas>

<div id="login" class="wrap">
  <div class="card" style="max-width:420px;margin:60px auto">
    <h3>مركز تحكم Abjad Agi</h3>
    <p class="muted">أدخل رمز الدخول (نفس PAIRING_TOKEN).</p>
    <div class="row"><input id="tok" type="password" placeholder="admin token"/><button onclick="doLogin()">دخول</button></div>
    <p id="loginErr" class="muted" style="color:#fca5a5"></p>
  </div>
</div>

<div id="appui" class="hide">
<header>
  <div class="brand"><span id="brandLogo"></span><b>Abjad Agi</b>
    <span id="waPill" class="pill">—</span>
    <span id="modelPill" class="pill" style="background:#12203c;color:#9fc0ff">—</span>
  </div>
  <div class="row">
    <span id="uptime" class="muted"></span>
    <a href="/executive" style="text-decoration:none"><button>🧠 المساعد المدير</button></a>
    <label class="switch"><input type="checkbox" id="glob" onchange="toggleGlobal()"/> الرد التلقائي</label>
    <button class="sec" onclick="logout()">خروج</button>
  </div>
</header>

<div class="wrap">
  <div class="kpis">
    <div class="kpi"><div class="l">المحادثات اليوم</div><div class="n" id="k_conv">—</div></div>
    <div class="kpi"><div class="l">عملاء جدد</div><div class="n" id="k_new">—</div></div>
    <div class="kpi"><div class="l">فرص بيع 🔥</div><div class="n" id="k_opp">—</div></div>
    <div class="kpi"><div class="l">تحتاج تدخلك</div><div class="n" id="k_need" style="color:#fca5a5">—</div></div>
  </div>

  <div class="nav">
    <div class="t on" id="nav-work" onclick="showView('work')">💬 العمل</div>
    <div class="t" id="nav-ana" onclick="showView('ana')">📊 التحليلات</div>
    <div class="t" id="nav-know" onclick="showView('know')">🧠 تعليمات الوكيل</div>
    <div class="t" id="nav-sys" onclick="showView('sys')">⚙️ النظام</div>
  </div>

  <!-- WORK -->
  <div id="view-work">
    <div class="card" style="margin-bottom:14px">
      <div class="pipe" id="pipe"></div>
    </div>
    <div class="work">
      <!-- customers -->
      <div class="card">
        <div class="row" style="justify-content:space-between"><h3>العملاء</h3><span id="cCount" class="muted"></span></div>
        <input id="search" placeholder="بحث..." oninput="renderContacts()" style="margin-bottom:8px"/>
        <div class="nav" style="margin-bottom:8px">
          <div class="t on sm" data-f="all" onclick="setFilter('all')">الكل</div>
          <div class="t sm" data-f="new" onclick="setFilter('new')">جدد</div>
          <div class="t sm" data-f="hot" onclick="setFilter('hot')">مهتمون</div>
          <div class="t sm" data-f="human" onclick="setFilter('human')">يحتاج تدخلي</div>
          <div class="t sm" data-f="cust" onclick="setFilter('cust')">عملاء</div>
        </div>
        <div class="list" id="contacts"></div>
      </div>
      <!-- conversation -->
      <div class="card">
        <div class="row" style="justify-content:space-between"><h3 id="chatTitle">المحادثة</h3><span id="chatState" class="muted"></span></div>
        <div id="chat" class="chat"><p class="muted">اختر عميل من القائمة.</p></div>
        <div class="row" style="margin-top:10px">
          <input id="reply" placeholder="اكتب رسالة يدوية..." onkeydown="if(event.key==='Enter')sendManual()"/>
          <button id="sendBtn" onclick="sendManual()" disabled>إرسال</button>
        </div>
      </div>
      <!-- intelligence -->
      <div class="card">
        <div class="row" style="justify-content:space-between"><h3>🧠 ذكاء أبجد</h3>
          <button class="sec sm" id="insBtn" onclick="loadInsight(true)" disabled>تحليل</button></div>
        <div id="insight"><p class="muted">افتح عميل واضغط «تحليل» ليلخصه لك الوكيل.</p></div>
        <div id="acts" class="row hide" style="margin-top:10px">
          <button class="sec sm" onclick="doSuggest()">✍️ اقترح رد</button>
          <button class="sec sm" onclick="toHuman()">🟣 حوّل لبشري</button>
          <button class="sec sm" onclick="markStage('trial')">🎯 طلب تجربة</button>
          <button class="sec sm" onclick="markStage('subscribed')">💰 اشترك</button>
        </div>
        <div id="suggestBox" class="hide" style="margin-top:10px">
          <div class="msg them" id="suggestText"></div>
          <button class="sm" onclick="sendSuggested()">أرسل هذا الرد</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ANALYTICS -->
  <div id="view-ana" class="hide">
    <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi"><div class="l">إجمالي العملاء</div><div class="n" id="a_contacts">—</div></div>
      <div class="kpi"><div class="l">حلّها AI وحده</div><div class="n" id="a_ai" style="color:#86efac">—</div></div>
      <div class="kpi"><div class="l">احتاجت تدخلك</div><div class="n" id="a_esc" style="color:#fca5a5">—</div></div>
    </div>
    <div class="card" style="margin-top:14px">
      <div class="row" style="justify-content:space-between"><h3>تحليل الأسئلة والاعتراضات</h3>
        <button class="sec sm" onclick="loadTrends()">حلّل الآن</button></div>
      <pre id="trends" class="muted">اضغط «حلّل الآن» ليحلل الوكيل رسائل العملاء (قد ياخذ ثوانٍ).</pre>
    </div>
  </div>

  <!-- KNOWLEDGE / INSTRUCTIONS -->
  <div id="view-know" class="hide">
    <div class="card">
      <h3>🧠 تعليمات إضافية للوكيل</h3>
      <p class="muted">اكتب أي تعليمات أو معلومات جديدة (أسعار عامة، عروض، سياسات، معلومات منتج...). تُحفظ وتشتغل فوراً بدون إعادة نشر.</p>
      <textarea id="instr" placeholder="مثال: عرض هذا الشهر تجربة مجانية 7 أيام. ساعات العمل 9ص-11م..."></textarea>
      <div class="row" style="margin-top:10px"><button onclick="saveInstr()">حفظ التعليمات</button><span id="instrMsg" class="muted"></span></div>
    </div>
  </div>

  <!-- SYSTEM -->
  <div id="view-sys" class="hide">
    <div class="card">
      <h3>⚙️ النظام</h3>
      <div id="sysState" class="muted"></div>
      <div class="row" style="margin-top:10px">
        <button class="bad" onclick="resetSession()">إعادة ربط الواتساب (QR جديد)</button>
        <button class="sec" onclick="downloadBackup()">⬇️ نسخة احتياطية من قاعدة البيانات</button>
        <button class="sec" onclick="refreshAll()">تحديث</button>
      </div>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>🧠 نموذج الذكاء</h3>
      <p class="muted">اختر المزوّد والنموذج — يتطبّق فوراً على ردود الوكيل بدون إعادة نشر.</p>
      <div class="row">
        <select id="mProvider" onchange="onProviderChange()" style="max-width:170px">
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic (Claude)</option>
        </select>
        <select id="mPreset" onchange="document.getElementById('mModel').value=this.value" style="max-width:200px"></select>
        <input id="mModel" placeholder="اسم النموذج" style="max-width:230px"/>
        <button onclick="saveModel()">حفظ النموذج</button>
      </div>
      <p id="mMsg" class="muted"></p>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>🎙️ صوت المساعد المدير</h3>
      <p class="muted">اختر الصوت وطريقة الكلام (اللهجة). يتطبّق على صفحة المساعد المدير.</p>
      <div class="row">
        <select id="vVoice" style="max-width:180px"></select>
        <button class="sec" onclick="previewVoice()">🔊 استماع</button>
      </div>
      <textarea id="vInstr" style="margin-top:8px;min-height:70px" placeholder="طريقة الكلام (مثال: تحدّث باللهجة العراقية بنبرة ودّية)"></textarea>
      <div class="row" style="margin-top:8px"><button onclick="saveVoice()">حفظ الصوت</button><span id="vMsg" class="muted"></span></div>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>🎨 خلفية الواجهة</h3>
      <p class="muted">اختر نمط الخلفية المتحركة (أو أوقفها لخلفية ثابتة).</p>
      <div class="nav" id="bgOpts"></div>
    </div>
    <div id="qrCard" class="card hide" style="text-align:center;margin-top:14px">
      <h3>ربط الواتساب</h3><div id="qrBox"></div>
      <p class="muted">واتساب ← الأجهزة المرتبطة ← ربط جهاز، وامسح الكود.</p>
    </div>
    <div class="card" style="margin-top:14px">
      <div class="row" style="justify-content:space-between"><h3>📜 اللوجات</h3><button class="sec sm" onclick="loadLogs()">تحديث</button></div>
      <pre id="logs"></pre>
    </div>
  </div>
</div>
</div>

<script>
var TOKEN=localStorage.getItem("abjad_token")||"";
var curJid=null,curName=null,filter="all",allContacts=[],lastSuggest="";
var SVGLOGO='<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="31" fill="#1b4fd6"/><rect x="16" y="18" width="32" height="24" rx="10" fill="#0b1220"/><circle cx="25" cy="30" r="3.4" fill="#38bdf8"/><circle cx="39" cy="30" r="3.4" fill="#38bdf8"/><path d="M25 36 q7 6 14 0" stroke="#38bdf8" stroke-width="2.4" fill="none" stroke-linecap="round"/><rect x="24" y="44" width="16" height="10" rx="3" fill="#2f6bff"/></svg>';

function doLogin(){TOKEN=document.getElementById("tok").value.trim();localStorage.setItem("abjad_token",TOKEN);boot();}
function logout(){localStorage.removeItem("abjad_token");location.reload();}
function api(p,o){o=o||{};o.headers=Object.assign({"x-admin-token":TOKEN,"content-type":"application/json"},o.headers||{});
return fetch("/api"+p,o).then(function(r){if(r.status===401)throw{unauth:1};return r.json().catch(function(){return{};});});}
function post(p,b){return api(p,{method:"POST",body:JSON.stringify(b||{})});}
function esc(s){s=String(s==null?"":s);return s.replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
function handleErr(e){if(e&&e.unauth)logout();}

function mountLogo(){var el=document.getElementById("brandLogo");var img=new Image();
img.onload=function(){img.className="logo";el.innerHTML="";el.appendChild(img);};
img.onerror=function(){el.innerHTML=SVGLOGO;};img.src="/logo";}

function boot(){api("/state").then(function(){
  document.getElementById("login").classList.add("hide");
  document.getElementById("appui").classList.remove("hide");
  mountLogo();refreshAll();
  setInterval(refreshState,5000);setInterval(refreshQR,9000);
}).catch(function(e){if(e&&e.unauth)document.getElementById("loginErr").textContent="رمز غير صحيح";
  document.getElementById("login").classList.remove("hide");});}

function pill(el,t,c){el.textContent=t;el.style.background=c;el.style.color="#fff";}
function fmtU(s){s=s||0;var h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return "يعمل منذ "+h+"س "+m+"د";}
function fmtT(ms){try{return new Date(ms).toLocaleString("ar");}catch(e){return"";}}

function refreshState(){api("/state").then(function(s){
  var c=s.whatsapp==="connected"?"#16a34a":(s.whatsapp==="waiting_qr"?"#d97706":"#dc2626");
  pill(document.getElementById("waPill"),(s.whatsapp==="connected"?"🟢 واتساب متصل":"واتساب: "+s.whatsapp),c);
  document.getElementById("modelPill").textContent="AI: "+(s.aiModel||s.aiProvider)+(s.aiReady?" ✓":" ✗");
  document.getElementById("uptime").textContent=fmtU(s.uptimeSeconds);
  document.getElementById("glob").checked=!!s.aiGloballyEnabled;
  var sys="واتساب: "+s.whatsapp+" · AI: "+(s.aiReady?"جاهز":"غير جاهز")+" ("+(s.aiModel||"")+")";
  if(!s.adminConfigured)sys+=" · ⚠️ ADMIN_NUMBER غير مضبوط";
  if(s.lastDisconnect)sys+=" · آخر انقطاع: "+s.lastDisconnect;
  document.getElementById("sysState").textContent=sys;
  document.getElementById("qrCard").classList.toggle("hide",s.whatsapp==="connected");
}).catch(handleErr);
api("/kpis").then(function(k){document.getElementById("k_conv").textContent=k.conversations;
  document.getElementById("k_new").textContent=k.newCustomers;document.getElementById("k_opp").textContent=k.opportunities;
  document.getElementById("k_need").textContent=k.needsYou;}).catch(function(){});
api("/pipeline").then(renderPipe).catch(function(){});}

function renderPipe(p){var order=[["new","جديد"],["interested","مهتم"],["trial","طلب تجربة"],["negotiation","تفاوض"],["subscribed","اشترك"]];
var h="";order.forEach(function(o,i){h+='<div class="stage"><span class="muted">'+o[1]+'</span><b>'+(p[o[0]]||0)+'</b></div>';
if(i<order.length-1)h+='<span class="muted">→</span>';});document.getElementById("pipe").innerHTML=h;}

function refreshQR(){if(document.getElementById("qrCard").classList.contains("hide"))return;
api("/qr").then(function(q){var b=document.getElementById("qrBox");
b.innerHTML=q.qr?'<img class="qr" src="'+q.qr+'"/>':'<p class="muted">الحالة: '+q.status+'</p>';}).catch(handleErr);}

function refreshAll(){refreshState();loadContacts();}

function loadContacts(){api("/contacts").then(function(l){allContacts=l;renderContacts();}).catch(handleErr);}
function setFilter(f){filter=f;document.querySelectorAll('[data-f]').forEach(function(e){e.classList.toggle("on",e.getAttribute("data-f")===f);});renderContacts();}
function statusTag(c){
  if(c.state==="HUMAN_MODE")return['🟣 بشري','#3b1d5e'];
  if(c.stage==="subscribed")return['💰 عميل','#3b165a'];
  if((c.interest_pct||0)>=70)return['🔥 مهتم','#5a1d1d'];
  if(c.stage==="trial"||c.stage==="negotiation")return['🎯 '+c.stage,'#1d3a5a'];
  return['🟢 AI','#14351f'];}
function matchFilter(c){
  if(filter==="new")return c.stage==="new";
  if(filter==="hot")return (c.interest_pct||0)>=60||["interested","trial","negotiation"].indexOf(c.stage)>=0;
  if(filter==="human")return c.state==="HUMAN_MODE";
  if(filter==="cust")return c.stage==="subscribed";
  return true;}
function renderContacts(){var q=(document.getElementById("search").value||"").toLowerCase();
var box=document.getElementById("contacts");box.innerHTML="";var n=0;
allContacts.forEach(function(c){if(!matchFilter(c))return;
  var nm=c.display_name||c.phone||c.jid;
  if(q&&(nm+" "+(c.phone||"")).toLowerCase().indexOf(q)<0)return;n++;
  var t=statusTag(c);var d=document.createElement("div");d.className="ct"+(c.jid===curJid?" on":"");
  d.onclick=function(){openConv(c.jid,nm);};
  d.innerHTML='<div class="av">'+esc(nm.slice(0,1))+'</div><div style="flex:1;min-width:0">'
    +'<div class="row" style="justify-content:space-between"><span class="nm">'+esc(nm)+'</span><span class="tag" style="background:'+t[1]+'">'+t[0]+'</span></div>'
    +'<div class="lm">'+esc(c.last_message||"")+'</div></div>';
  box.appendChild(d);});
document.getElementById("cCount").textContent=n+" عميل";}

function openConv(jid,name){curJid=jid;curName=name;lastSuggest="";
document.getElementById("chatTitle").textContent=name;
document.getElementById("sendBtn").disabled=false;document.getElementById("insBtn").disabled=false;
document.getElementById("acts").classList.remove("hide");
document.getElementById("suggestBox").classList.add("hide");
document.getElementById("insight").innerHTML='<p class="muted">اضغط «تحليل» ليلخص الوكيل هذا العميل.</p>';
renderContacts();
api("/conversation?jid="+encodeURIComponent(jid)).then(function(ms){var b=document.getElementById("chat");b.innerHTML="";
ms.forEach(function(m){var d=document.createElement("div");d.className="msg "+(m.role==="assistant"?"them":"me");
d.innerHTML=(m.role==="assistant"?'<div class="who">Abjad Agi 🤖</div>':"")+esc(m.content);b.appendChild(d);});
b.scrollTop=b.scrollHeight;}).catch(handleErr);}

function sendManual(){if(!curJid)return;var el=document.getElementById("reply");var t=el.value.trim();if(!t)return;el.value="";
post("/send",{jid:curJid,text:t}).then(function(){openConv(curJid,curName);loadContacts();}).catch(handleErr);}

function loadInsight(refresh){if(!curJid)return;var box=document.getElementById("insight");
box.innerHTML='<p class="muted">🔎 يحلل...</p>';
api("/insight?jid="+encodeURIComponent(curJid)+(refresh?"&refresh=1":"")).then(function(r){
if(!r.insight){box.innerHTML='<p class="muted">ما اكو معلومات كافية بعد.</p>';return;}
var i=r.insight;var p=i.interest_pct||0;
box.innerHTML=
 '<div style="font-size:15px;font-weight:700;margin-bottom:6px">'+esc(i.summary||i.business)+'</div>'
 +'<div class="muted" style="margin-bottom:8px">احتمال البيع</div>'
 +'<div class="meter"><i style="width:'+p+'%"></i></div><div style="text-align:left;font-weight:700">'+p+'% '+(p>=70?"🔥":"")+'</div>'
 +row("النشاط",i.business)+row("المدينة",i.city)+row("المنتج",i.product)+row("الفروع",i.branches)
 +row("النظام الحالي",i.current_system)+row("المشكلة",i.problem)+row("المرحلة",i.stage)
 +'<div style="margin-top:8px;padding:8px;background:var(--panel2);border-radius:10px"><b>الخطوة المقترحة:</b> '+esc(i.next_step||"-")+'</div>';
loadContacts();}).catch(handleErr);
function row(k,v){return '<div class="iRow"><span class="k">'+k+'</span><span>'+esc(v||"غير معروف")+'</span></div>';}}

function doSuggest(){if(!curJid)return;var sb=document.getElementById("suggestBox");sb.classList.remove("hide");
document.getElementById("suggestText").textContent="...";
post("/suggest",{jid:curJid}).then(function(r){lastSuggest=r.text||"";document.getElementById("suggestText").textContent=lastSuggest||"(لا يوجد اقتراح)";}).catch(handleErr);}
function sendSuggested(){if(!curJid||!lastSuggest)return;post("/send",{jid:curJid,text:lastSuggest}).then(function(){document.getElementById("suggestBox").classList.add("hide");openConv(curJid,curName);loadContacts();}).catch(handleErr);}
function toHuman(){if(curJid)post("/pause",{jid:curJid}).then(loadContacts).catch(handleErr);}
function markStage(s){if(curJid)post("/contact/stage",{jid:curJid,stage:s}).then(function(){loadContacts();loadInsight(false);}).catch(handleErr);}

function toggleGlobal(){post("/ai-global",{enabled:document.getElementById("glob").checked}).catch(handleErr);}
function resetSession(){if(confirm("تسجيل خروج من واتساب وطلب QR جديد. متأكد؟"))post("/reset-session",{}).then(function(){alert("جاري إعادة الربط... انتظر ظهور QR بقسم النظام.");}).catch(handleErr);}
function downloadBackup(){window.open("/api/backup?token="+encodeURIComponent(TOKEN),"_blank");}
function loadLogs(){fetch("/api/logs",{headers:{"x-admin-token":TOKEN}}).then(function(r){return r.text();}).then(function(t){var e=document.getElementById("logs");e.textContent=t;e.scrollTop=9e9;}).catch(handleErr);}

function loadAnalytics(){api("/analytics").then(function(a){document.getElementById("a_contacts").textContent=a.totalContacts;
document.getElementById("a_ai").textContent=a.solvedByAi;document.getElementById("a_esc").textContent=a.escalatedContacts;}).catch(handleErr);}
function loadTrends(){document.getElementById("trends").textContent="🔎 يحلل...";
api("/analyze-trends").then(function(r){document.getElementById("trends").textContent=r.text||"-";}).catch(handleErr);}

function loadInstr(){api("/instructions").then(function(r){document.getElementById("instr").value=r.text||"";}).catch(handleErr);}
function saveInstr(){post("/instructions",{text:document.getElementById("instr").value}).then(function(){var m=document.getElementById("instrMsg");m.textContent="✅ تم الحفظ";setTimeout(function(){m.textContent="";},2500);}).catch(handleErr);}

var _presets={};
function loadModel(){api("/model").then(function(r){_presets=r.presets||{};
document.getElementById("mProvider").value=r.provider;fillPresets(r.provider);
document.getElementById("mModel").value=r.model;
document.getElementById("mMsg").textContent=r.ready?("الحالي: "+r.provider+" / "+r.model+" ✓"):("غير جاهز: "+(r.reason||""));}).catch(handleErr);}
function fillPresets(p){var list=_presets[p]||[];var ps=document.getElementById("mPreset");ps.innerHTML="";
list.forEach(function(m){var o=document.createElement("option");o.value=m;o.textContent=m;ps.appendChild(o);});}
function onProviderChange(){var p=document.getElementById("mProvider").value;fillPresets(p);var l=_presets[p]||[];if(l[0])document.getElementById("mModel").value=l[0];}
function saveModel(){post("/model",{provider:document.getElementById("mProvider").value,model:document.getElementById("mModel").value.trim()}).then(function(r){
document.getElementById("mMsg").textContent=r.ready?("✅ تم: "+r.provider+" / "+r.model):("⚠️ محفوظ بس "+(r.reason||"غير جاهز"));refreshState();}).catch(handleErr);}

function loadVoice(){api("/voice").then(function(r){var s=document.getElementById("vVoice");s.innerHTML="";
(r.voices||[]).forEach(function(v){var o=document.createElement("option");o.value=v;o.textContent=v;if(v===r.voice)o.selected=true;s.appendChild(o);});
document.getElementById("vInstr").value=r.instructions||"";}).catch(handleErr);}
function saveVoice(){post("/voice",{voice:document.getElementById("vVoice").value,instructions:document.getElementById("vInstr").value}).then(function(){var m=document.getElementById("vMsg");m.textContent="✅ تم الحفظ";setTimeout(function(){m.textContent="";},2000);}).catch(handleErr);}
function previewVoice(){document.getElementById("vMsg").textContent="⏳ يجهّز الصوت...";
post("/voice",{voice:document.getElementById("vVoice").value,instructions:document.getElementById("vInstr").value}).then(function(){
 return fetch("/api/executive/tts",{method:"POST",headers:{"x-admin-token":TOKEN,"content-type":"application/json"},body:JSON.stringify({text:"هلا بيك، آني أبجد مساعدك الشخصي. شلون أگدر أساعدك اليوم؟"})});})
.then(function(r){if(!r.ok)throw 0;return r.blob();}).then(function(b){document.getElementById("vMsg").textContent="";new Audio(URL.createObjectURL(b)).play();})
.catch(function(){document.getElementById("vMsg").textContent="تعذّر تشغيل الصوت";});}

function showView(v){["work","ana","know","sys"].forEach(function(x){
document.getElementById("view-"+x).classList.toggle("hide",x!==v);
document.getElementById("nav-"+x).classList.toggle("on",x===v);});
if(v==="ana")loadAnalytics();if(v==="know")loadInstr();if(v==="sys"){loadLogs();refreshQR();loadModel();loadVoice();}}

/* ---------- animated background ---------- */
var BGMODES=[["stars","✨ نجوم"],["particles","🔗 جسيمات"],["grid","▦ شبكة"],["waves","〜 أمواج"],["aurora","🌌 شفق"],["off","■ بدون (ثابت)"]];
var bgMode=localStorage.getItem("bg_mode")||"stars",bgC,bgX,bgRAF,bgP=[],bgOff=0,bgW=0,bgH=0;
function bgResize(){if(!bgC)return;bgW=bgC.width=window.innerWidth;bgH=bgC.height=window.innerHeight;}
function renderBgOptions(){var el=document.getElementById("bgOpts");if(!el)return;el.innerHTML="";
BGMODES.forEach(function(m){var b=document.createElement("div");b.className="t sm"+(m[0]===bgMode?" on":"");
b.setAttribute("data-bg",m[0]);b.textContent=m[1];b.onclick=function(){setBg(m[0]);};el.appendChild(b);});}
function stopBg(){if(bgRAF)cancelAnimationFrame(bgRAF);bgRAF=null;if(bgX)bgX.clearRect(0,0,bgW,bgH);}
function setBg(m){bgMode=m;localStorage.setItem("bg_mode",m);stopBg();
document.querySelectorAll("[data-bg]").forEach(function(e){e.classList.toggle("on",e.getAttribute("data-bg")===m);});
if(m==="off"||!bgX)return;seedBg(m);bgLoop();}
function seedBg(m){bgP=[];var n=m==="particles"?70:130;
if(m==="stars"||m==="particles"){for(var i=0;i<n;i++)bgP.push({x:Math.random()*bgW,y:Math.random()*bgH,r:Math.random()*1.6+.4,s:Math.random()*.4+.08,vx:(Math.random()-.5)*.7,vy:(Math.random()-.5)*.7,p:Math.random()*6.28});}}
function bgLoop(){bgRAF=requestAnimationFrame(bgLoop);bgOff++;var x=bgX;if(!x)return;
if(bgMode==="stars"){x.fillStyle="rgba(7,12,23,.35)";x.fillRect(0,0,bgW,bgH);x.shadowColor="#38bdf8";x.shadowBlur=6;
bgP.forEach(function(o){o.y+=o.s;if(o.y>bgH)o.y=0;o.p+=.05;var a=.35+Math.sin(o.p)*.35;x.beginPath();x.arc(o.x,o.y,o.r,0,6.28);x.fillStyle="rgba(56,189,248,"+a+")";x.fill();});x.shadowBlur=0;}
else if(bgMode==="particles"){x.fillStyle="#070c17";x.fillRect(0,0,bgW,bgH);
for(var i=0;i<bgP.length;i++){var o=bgP[i];o.x+=o.vx;o.y+=o.vy;if(o.x<0||o.x>bgW)o.vx*=-1;if(o.y<0||o.y>bgH)o.vy*=-1;
for(var j=i+1;j<bgP.length;j++){var q=bgP[j],dx=o.x-q.x,dy=o.y-q.y,d=dx*dx+dy*dy;if(d<14000){x.strokeStyle="rgba(47,107,255,"+(1-d/14000)*.35+")";x.lineWidth=1;x.beginPath();x.moveTo(o.x,o.y);x.lineTo(q.x,q.y);x.stroke();}}}
x.fillStyle="#38bdf8";bgP.forEach(function(o){x.beginPath();x.arc(o.x,o.y,1.6,0,6.28);x.fill();});}
else if(bgMode==="grid"){x.fillStyle="#070c17";x.fillRect(0,0,bgW,bgH);x.strokeStyle="rgba(47,107,255,.16)";x.lineWidth=1;var g=44,off=bgOff%g;
for(var gx=off;gx<bgW;gx+=g){x.beginPath();x.moveTo(gx,0);x.lineTo(gx,bgH);x.stroke();}
for(var gy=off;gy<bgH;gy+=g){x.beginPath();x.moveTo(0,gy);x.lineTo(bgW,gy);x.stroke();}}
else if(bgMode==="waves"){x.fillStyle="#070c17";x.fillRect(0,0,bgW,bgH);var cols=["rgba(47,107,255,.4)","rgba(56,189,248,.3)","rgba(168,85,247,.22)"];
for(var w=0;w<3;w++){x.beginPath();x.strokeStyle=cols[w];x.lineWidth=2;
for(var px=0;px<=bgW;px+=8){var py=bgH/2+Math.sin((px+bgOff*(1+w))/120)*(60+w*30)+(w-1)*70;if(px===0)x.moveTo(px,py);else x.lineTo(px,py);}x.stroke();}}
else if(bgMode==="aurora"){x.fillStyle="rgba(7,12,23,.5)";x.fillRect(0,0,bgW,bgH);var bl=[["#2f6bff",0],["#38bdf8",2],["#a855f7",4]];
bl.forEach(function(b){var cx=bgW/2+Math.cos(bgOff/200+b[1])*bgW/3,cy=bgH/2+Math.sin(bgOff/180+b[1])*bgH/3;
var gr=x.createRadialGradient(cx,cy,0,cx,cy,320);gr.addColorStop(0,b[0]+"55");gr.addColorStop(1,"rgba(0,0,0,0)");x.fillStyle=gr;x.fillRect(0,0,bgW,bgH);});}}
function bgInit(){bgC=document.getElementById("bg");if(!bgC)return;bgX=bgC.getContext("2d");window.addEventListener("resize",bgResize);bgResize();renderBgOptions();setBg(bgMode);}
bgInit();

if(TOKEN)boot();
</script>
</body>
</html>`;
