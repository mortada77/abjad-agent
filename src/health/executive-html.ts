/* eslint-disable */
// أبجد — Executive AI. Full-screen, voice-first. WebGL audio-reactive orb
// (Three.js) + OpenAI TTS (natural voice, drives head amplitude) + STT (HTTPS).
export const EXECUTIVE_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<title>أبجد</title>
<style>
:root{--bg:#05070f;--tx:#e8eefb;--mut:#8ea3c4;--pri:#2f6bff;--cyan:#38bdf8;--line:#18233c}
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;font-family:system-ui,Segoe UI,Tahoma,sans-serif;color:var(--tx);background:var(--bg);overflow:hidden;-webkit-tap-highlight-color:transparent}
#scene{position:fixed;inset:0;z-index:0}
.top{position:fixed;top:0;left:0;right:0;z-index:5;display:flex;justify-content:space-between;align-items:center;padding:14px 18px}
.brand{display:flex;align-items:center;gap:9px;font-weight:800;font-size:18px}
.brand img{width:32px;height:32px;border-radius:50%;box-shadow:0 0 14px rgba(47,107,255,.7)}
.top .r{display:flex;gap:8px;align-items:center}
.top a{color:var(--mut);text-decoration:none;font-size:13px}
.iconbtn{width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:rgba(18,26,46,.55);color:var(--tx);
 cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)}
.iconbtn svg{width:20px;height:20px}
.state{position:fixed;top:62px;left:0;right:0;text-align:center;z-index:5;color:var(--cyan);font-size:15px;min-height:22px;text-shadow:0 0 12px rgba(56,189,248,.5)}
.dock{position:fixed;bottom:0;left:0;right:0;z-index:6;display:flex;flex-direction:column;align-items:center;gap:14px;padding:20px}
.wave{display:flex;gap:3px;align-items:center;height:24px}
.wave i{width:3px;background:linear-gradient(180deg,var(--cyan),var(--pri));border-radius:3px;height:4px;transition:height .08s}
.controls{display:flex;align-items:center;gap:20px}
.mic{width:76px;height:76px;border-radius:50%;border:0;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;
 background:radial-gradient(circle at 32% 28%,#4b8bff,#1b4fd6);box-shadow:0 0 30px rgba(47,107,255,.65);transition:transform .1s}
.mic svg{width:30px;height:30px}
.mic:active{transform:scale(.93)}
.mic.live{background:radial-gradient(circle at 32% 28%,#ff5a5a,#b91c1c);box-shadow:0 0 34px rgba(239,68,68,.7);animation:pulse 1.2s infinite}
@keyframes pulse{0%,100%{box-shadow:0 0 22px rgba(239,68,68,.5)}50%{box-shadow:0 0 46px rgba(239,68,68,.9)}}
.round{width:52px;height:52px;border-radius:50%;border:1px solid var(--line);background:rgba(18,26,46,.6);color:var(--tx);cursor:pointer;display:flex;align-items:center;justify-content:center}
.round svg{width:22px;height:22px}
.inrow{display:flex;gap:8px;width:min(680px,94vw)}
.inrow input{flex:1;background:rgba(15,22,44,.8);color:var(--tx);border:1px solid var(--line);border-radius:14px;padding:12px 14px;font-family:inherit;font-size:15px}
.inrow button{background:var(--pri);border:0;color:#fff;border-radius:14px;width:52px;display:flex;align-items:center;justify-content:center;cursor:pointer}
.inrow button svg{width:20px;height:20px}
#hist{position:fixed;top:0;right:-360px;width:340px;max-width:88vw;height:100%;z-index:8;background:rgba(8,13,26,.97);border-left:1px solid var(--line);transition:right .25s;padding:16px;overflow:auto;backdrop-filter:blur(8px)}
#hist.open{right:0}
.msg{margin:8px 0;padding:9px 12px;border-radius:12px;font-size:14px;line-height:1.6;white-space:pre-wrap}
.msg.u{background:#123d2b}.msg.a{background:#1b2a4a}
.login{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:var(--bg)}
.card{background:#0f1830;border:1px solid var(--line);border-radius:16px;padding:24px;max-width:360px;width:90%}
.card input{width:100%;padding:10px;margin:10px 0;border-radius:10px;border:1px solid var(--line);background:#152242;color:var(--tx)}
.card button{width:100%;padding:11px;border:0;border-radius:10px;background:var(--pri);color:#fff;cursor:pointer}
.hide{display:none}
</style>
</head>
<body>
<canvas id="scene"></canvas>

<div id="login" class="login"><div class="card">
  <h3>أبجد</h3><p style="color:var(--mut);font-size:13px">أدخل رمز الدخول.</p>
  <input id="tok" type="password" placeholder="admin token"/>
  <button onclick="doLogin()">دخول</button><p id="lerr" style="color:#fca5a5;font-size:13px"></p>
</div></div>

<div id="app" class="hide">
  <div class="top">
    <div class="brand"><img src="/logo" onerror="this.style.display='none'"/><span>أبجد</span></div>
    <div class="r">
      <button class="iconbtn" onclick="toggleHist()" title="السجل">__I_HIST__</button>
      <a href="/">← الداشبورد</a>
    </div>
  </div>

  <div id="stateLbl" class="state">جاهز — احچي معاي</div>

  <div class="dock">
    <div class="wave" id="wave"></div>
    <div class="controls">
      <button class="round" id="muteBtn" onclick="toggleMute()" title="كتم">__I_SPK__</button>
      <button class="mic" id="mic" onclick="toggleMic()">__I_MIC__</button>
      <button class="round" onclick="stopAll()" title="إيقاف">__I_STOP__</button>
    </div>
    <div class="inrow">
      <input id="text" placeholder="أو اكتب هنا..." onkeydown="if(event.key==='Enter')sendText()"/>
      <button onclick="sendText()">__I_SEND__</button>
    </div>
  </div>

  <div id="hist">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <b>سجل المحادثة</b>
      <div style="display:flex;gap:8px">
        <button class="iconbtn" onclick="resetHist()" title="مسح">__I_TRASH__</button>
        <button class="iconbtn" onclick="toggleHist()" title="إغلاق">__I_X__</button>
      </div>
    </div>
    <div id="histBody"></div>
  </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
var TOKEN=localStorage.getItem("abjad_token")||"";
function doLogin(){TOKEN=document.getElementById("tok").value.trim();localStorage.setItem("abjad_token",TOKEN);boot();}
function api(path,opts){opts=opts||{};opts.headers=Object.assign({"x-admin-token":TOKEN,"content-type":"application/json"},opts.headers||{});
return fetch("/api"+path,opts);}
function apiJson(path,opts){return api(path,opts).then(function(r){if(r.status===401)throw{unauth:1};return r.json().catch(function(){return{};});});}

function boot(){apiJson("/state").then(function(){
  document.getElementById("login").classList.add("hide");
  document.getElementById("app").classList.remove("hide");
  initOrb();buildWave();loadHist();
}).catch(function(e){if(e&&e.unauth)document.getElementById("lerr").textContent="رمز غير صحيح";
  document.getElementById("login").classList.remove("hide");});}

/* ===== state machine ===== */
var STATE="idle";
var COLORS={idle:0x2f6bff,listening:0x38bdf8,thinking:0xa855f7,speaking:0x22d3ee,tool:0xf59e0b,error:0xef4444};
var LABELS={idle:"جاهز — احچي معاي",listening:"يستمع...",thinking:"يفكر...",speaking:"",tool:"يراجع البيانات...",error:"صار خطأ"};
function setState(s,l){STATE=s;document.getElementById("stateLbl").textContent=(l!==undefined?l:(LABELS[s]||""));}

/* ===== WebGL orb (responsive, no eyes) ===== */
var renderer,scene,camera,core,shell,inner,glow,halo,clock,amp=0,targetAmp=0;
function fit(){if(!renderer)return;renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;
 camera.position.z=(innerHeight>innerWidth)?8.2:5.4;camera.updateProjectionMatrix();}
function initOrb(){if(typeof THREE==="undefined")return;
 renderer=new THREE.WebGLRenderer({canvas:document.getElementById("scene"),antialias:true,alpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(48,1,0.1,100);
 var l=new THREE.PointLight(0x5b8cff,2,60);l.position.set(4,5,6);scene.add(l);scene.add(new THREE.AmbientLight(0x22406b,1));
 core=new THREE.Group();scene.add(core);
 inner=new THREE.Mesh(new THREE.SphereGeometry(0.62,40,40),new THREE.MeshBasicMaterial({color:COLORS.idle,transparent:true,opacity:.9}));core.add(inner);
 glow=new THREE.Mesh(new THREE.SphereGeometry(1.55,40,40),new THREE.MeshBasicMaterial({color:COLORS.idle,transparent:true,opacity:.10,side:THREE.BackSide}));core.add(glow);
 shell=new THREE.Mesh(new THREE.IcosahedronGeometry(1.15,3),new THREE.MeshBasicMaterial({color:COLORS.cyan,wireframe:true,transparent:true,opacity:.28}));core.add(shell);
 var N=520,pos=new Float32Array(N*3);for(var i=0;i<N;i++){var a=Math.random()*6.283,r=1.9+Math.random()*1.7,y=(Math.random()-.5)*3.4;pos[i*3]=Math.cos(a)*r;pos[i*3+1]=y;pos[i*3+2]=Math.sin(a)*r;}
 var pg=new THREE.BufferGeometry();pg.setAttribute("position",new THREE.BufferAttribute(pos,3));
 halo=new THREE.Points(pg,new THREE.PointsMaterial({color:COLORS.cyan,size:0.028,transparent:true,opacity:.55}));scene.add(halo);
 clock=new THREE.Clock();addEventListener("resize",fit);fit();animate();}
function setCol(c){if(!inner)return;inner.material.color.setHex(c);glow.material.color.setHex(c);shell.material.color.setHex(c);halo.material.color.setHex(c);}
function animate(){requestAnimationFrame(animate);if(!renderer)return;var t=clock.getElapsedTime();
 if(speaking&&spAnalyser){spAnalyser.getByteFrequencyData(spData);var s=0;for(var i=0;i<spData.length;i++)s+=spData[i];targetAmp=Math.min((s/spData.length/255)*2.4,1.3);}
 amp+=(targetAmp-amp)*0.18;setCol(COLORS[STATE]||COLORS.idle);
 var breathe=STATE==="idle"?0.02*Math.sin(t*1.1):0;var sc=1+breathe+amp*0.35;core.scale.set(sc,sc,sc);
 inner.scale.setScalar(1+amp*0.5);inner.material.opacity=.75+amp*.25;
 core.rotation.y+=STATE==="thinking"?0.05:0.005;shell.rotation.y-=0.004;shell.rotation.x=0.12*Math.sin(t*0.4);
 glow.material.opacity=0.08+amp*0.5;halo.rotation.y-=0.0016;halo.material.opacity=0.4+amp*0.4;
 if(STATE==="thinking")targetAmp=0.22+0.14*Math.sin(t*8);
 if(STATE==="listening"&&micAnalyser){micAnalyser.getByteFrequencyData(micData);var m=0;for(var j=0;j<micData.length;j++)m+=micData[j];targetAmp=Math.min((m/micData.length/255)*2.4,1.3);}
 renderer.render(scene,camera);drawWave();}

/* ===== wave ===== */
function buildWave(){var w=document.getElementById("wave");w.innerHTML="";for(var i=0;i<26;i++)w.appendChild(document.createElement("i"));}
function drawWave(){var b=document.getElementById("wave").children;var on=(STATE==="listening"||STATE==="speaking");
 for(var i=0;i<b.length;i++){var h=4+(on?Math.abs(Math.sin(i*0.6+Date.now()/110))*amp*54:0);b[i].style.height=h+"px";}}

/* ===== audio context ===== */
var ac=null;function AC(){if(!ac)ac=new(window.AudioContext||window.webkitAudioContext)();if(ac.state==="suspended")ac.resume();return ac;}

/* ===== mic (STT) — needs HTTPS ===== */
var micStream,micAnalyser,micData,recog=null,listening=false;
async function ensureMic(){if(micAnalyser)return true;try{micStream=await navigator.mediaDevices.getUserMedia({audio:true});
 var c=AC();var src=c.createMediaStreamSource(micStream);micAnalyser=c.createAnalyser();micAnalyser.fftSize=256;src.connect(micAnalyser);micData=new Uint8Array(micAnalyser.frequencyBinCount);
 (function loop(){requestAnimationFrame(loop);if(!micAnalyser)return;micAnalyser.getByteFrequencyData(micData);var s=0;for(var i=0;i<micData.length;i++)s+=micData[i];var v=s/micData.length/255;if(speaking&&v>0.12){stopSpeak();startListen();}})();
 return true;}catch(e){return false;}}
function makeRecog(){var SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return null;var r=new SR();r.lang="ar-SA";r.interimResults=false;r.continuous=false;
 r.onresult=function(e){var tx=e.results[0][0].transcript;stopListen();if(tx&&tx.trim())handleUserInput(tx.trim());};
 r.onerror=function(){stopListen();};r.onend=function(){if(listening){listening=false;document.getElementById("mic").classList.remove("live");if(STATE==="listening")setState("idle");}};return r;}
async function startListen(){var ok=await ensureMic();if(!ok){setState("idle","المايك يحتاج HTTPS — اكتب بدالها");return;}
 if(!recog)recog=makeRecog();if(!recog){setState("idle","المتصفح ما يدعم الصوت — اكتب");return;}
 try{recog.start();listening=true;document.getElementById("mic").classList.add("live");setState("listening");}catch(e){}}
function stopListen(){listening=false;document.getElementById("mic").classList.remove("live");try{recog&&recog.stop();}catch(e){}}
function toggleMic(){AC();if(speaking)stopSpeak();if(listening)stopListen();else startListen();}

/* ===== TTS (OpenAI natural voice; drives head) ===== */
var muted=false,speaking=false,spSrc=null,spAnalyser=null,spData=null;
function speak(text){if(muted||!text){setState("idle");return;}
 fetch("/api/executive/tts",{method:"POST",headers:{"x-admin-token":TOKEN,"content-type":"application/json"},body:JSON.stringify({text:text})})
 .then(function(r){if(!r.ok)throw 0;return r.arrayBuffer();})
 .then(function(ab){var c=AC();c.decodeAudioData(ab,function(buf){stopSpeak();spSrc=c.createBufferSource();spSrc.buffer=buf;
   spAnalyser=c.createAnalyser();spAnalyser.fftSize=256;spData=new Uint8Array(spAnalyser.frequencyBinCount);
   spSrc.connect(spAnalyser);spAnalyser.connect(c.destination);speaking=true;setState("speaking","");
   spSrc.onended=function(){speaking=false;spAnalyser=null;targetAmp=0;setState("idle");};spSrc.start();});})
 .catch(function(){browserSpeak(text);});}
function browserSpeak(text){try{var u=new SpeechSynthesisUtterance(text);u.lang="ar-SA";var vs=speechSynthesis.getVoices();var v=vs.find(function(x){return /ar/i.test(x.lang);});if(v)u.voice=v;
 u.onstart=function(){speaking=true;setState("speaking","");spTimer=setInterval(function(){targetAmp=0.3+Math.random()*0.5;},90);};
 u.onend=function(){speaking=false;clearInterval(spTimer);targetAmp=0;setState("idle");};speechSynthesis.speak(u);}catch(e){setState("idle");}}
var spTimer=null;
function stopSpeak(){speaking=false;clearInterval(spTimer);targetAmp=0;try{spSrc&&spSrc.stop();}catch(e){}spSrc=null;spAnalyser=null;try{speechSynthesis.cancel();}catch(e){}}
function toggleMute(){muted=!muted;document.getElementById("muteBtn").innerHTML=muted?ICON.mute:ICON.spk;if(muted)stopSpeak();}
function stopAll(){stopSpeak();stopListen();setState("idle");}

/* ===== conversation (no on-screen reply text; voice only) ===== */
function sendText(){var el=document.getElementById("text");var t=el.value.trim();if(!t)return;el.value="";AC();handleUserInput(t);}
function handleUserInput(text){addHist("u",text);setState("thinking");
 apiJson("/executive/chat",{method:"POST",body:JSON.stringify({message:text})}).then(function(r){
  if(r.toolHints&&r.toolHints.length)setState("tool",r.toolHints[0]);
  var reply=r.reply||"";addHist("a",reply);speak(reply);
 }).catch(function(e){if(e&&e.unauth){location.reload();return;}setState("error");setTimeout(function(){setState("idle");},1400);});}

/* ===== history ===== */
function toggleHist(){document.getElementById("hist").classList.toggle("open");}
function addHist(role,text){var b=document.getElementById("histBody");var d=document.createElement("div");d.className="msg "+(role==="u"?"u":"a");d.textContent=text;b.appendChild(d);b.scrollTop=b.scrollHeight;}
function loadHist(){apiJson("/executive/history").then(function(list){var b=document.getElementById("histBody");b.innerHTML="";list.forEach(function(m){addHist(m.role==="user"?"u":"a",m.content);});}).catch(function(){});}
function resetHist(){if(confirm("مسح ذاكرة المحادثة؟"))apiJson("/executive/reset",{method:"POST",body:"{}"}).then(function(){document.getElementById("histBody").innerHTML="";});}

/* ===== icons ===== */
var ICON={
 mic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" stroke="none"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M8 21h8"/></svg>',
 stop:'<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/></svg>',
 spk:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path d="M16 8a5 5 0 0 1 0 8M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
 mute:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path d="M17 9l4 6M21 9l-4 6"/></svg>',
 send:'<svg viewBox="0 0 24 24"><path d="M3 11l18-8-8 18-2-7-8-3z" fill="currentColor"/></svg>',
 hist:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
 x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'};

if(window.speechSynthesis){speechSynthesis.onvoiceschanged=function(){};}
if(TOKEN)boot();
</script>
</body>
</html>`
  .replace('__I_MIC__', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" stroke="none"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M8 21h8"/></svg>')
  .replace('__I_STOP__', '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/></svg>')
  .replace('__I_SPK__', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path d="M16 8a5 5 0 0 1 0 8M18.5 5.5a9 9 0 0 1 0 13"/></svg>')
  .replace('__I_SEND__', '<svg viewBox="0 0 24 24"><path d="M3 11l18-8-8 18-2-7-8-3z" fill="currentColor"/></svg>')
  .replace('__I_HIST__', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>')
  .replace('__I_TRASH__', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>')
  .replace('__I_X__', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>');
