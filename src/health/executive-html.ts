/* eslint-disable */
// Executive AI — full-screen, voice-first immersive assistant.
// WebGL audio-reactive head (Three.js) + Web Speech STT/TTS + text fallback.
// Served at /executive from our own origin (no CSP restrictions).
export const EXECUTIVE_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>المساعد المدير — Abjad Agi</title>
<style>
:root{--bg:#05070f;--tx:#e8eefb;--mut:#8ea3c4;--pri:#2f6bff;--cyan:#38bdf8;--purple:#a855f7;--line:#1b2740}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;font-family:system-ui,Segoe UI,Tahoma,sans-serif;color:var(--tx);background:var(--bg);overflow:hidden}
#scene{position:fixed;inset:0;z-index:0}
.top{position:fixed;top:0;left:0;right:0;z-index:5;display:flex;justify-content:space-between;align-items:center;padding:14px 20px}
.brand{display:flex;align-items:center;gap:10px;font-weight:700}
.brand .logo{width:34px;height:34px;border-radius:50%;box-shadow:0 0 14px rgba(47,107,255,.7)}
.chip{font-size:12.5px;color:var(--mut);background:rgba(20,30,55,.6);border:1px solid var(--line);padding:5px 10px;border-radius:999px;backdrop-filter:blur(6px)}
.top a{color:var(--mut);text-decoration:none;font-size:13px}
.state{position:fixed;top:64px;left:0;right:0;text-align:center;z-index:5;color:var(--cyan);font-size:15px;letter-spacing:.5px;min-height:22px;text-shadow:0 0 12px rgba(56,189,248,.5)}
.center{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:1;pointer-events:none}
.reply{position:fixed;left:50%;transform:translateX(-50%);bottom:180px;z-index:5;max-width:min(760px,90vw);
 background:rgba(10,16,32,.72);border:1px solid var(--line);border-radius:16px;padding:14px 18px;font-size:16px;line-height:1.7;
 backdrop-filter:blur(8px);text-align:center;max-height:34vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.5)}
.reply.hide{display:none}
.dock{position:fixed;bottom:0;left:0;right:0;z-index:6;display:flex;flex-direction:column;align-items:center;gap:12px;padding:22px}
.wave{display:flex;gap:3px;align-items:flex-end;height:26px}
.wave i{width:3px;background:linear-gradient(180deg,var(--cyan),var(--pri));border-radius:3px;height:6px;transition:height .08s}
.controls{display:flex;align-items:center;gap:16px}
.mic{width:78px;height:78px;border-radius:50%;border:0;cursor:pointer;color:#fff;font-size:28px;
 background:radial-gradient(circle at 30% 30%,#3b82f6,#1b4fd6);box-shadow:0 0 30px rgba(47,107,255,.7);transition:transform .1s}
.mic:active{transform:scale(.94)}
.mic.live{background:radial-gradient(circle at 30% 30%,#ef4444,#b91c1c);box-shadow:0 0 34px rgba(239,68,68,.7);animation:pulse 1.2s infinite}
@keyframes pulse{0%,100%{box-shadow:0 0 24px rgba(239,68,68,.5)}50%{box-shadow:0 0 44px rgba(239,68,68,.9)}}
.rbtn{width:48px;height:48px;border-radius:50%;border:1px solid var(--line);background:rgba(20,30,55,.6);color:var(--tx);cursor:pointer;font-size:18px}
.inrow{display:flex;gap:8px;width:min(680px,92vw)}
.inrow input{flex:1;background:rgba(15,22,44,.8);color:var(--tx);border:1px solid var(--line);border-radius:12px;padding:12px;font-family:inherit;font-size:15px}
.inrow button{background:var(--pri);border:0;color:#fff;border-radius:12px;padding:0 16px;cursor:pointer;font-size:16px}
#hist{position:fixed;top:0;right:-380px;width:360px;height:100%;z-index:8;background:rgba(8,13,26,.96);border-left:1px solid var(--line);
 transition:right .25s;padding:16px;overflow:auto;backdrop-filter:blur(8px)}
#hist.open{right:0}
#hist h3{margin:0 0 12px}
.msg{margin:8px 0;padding:9px 12px;border-radius:12px;font-size:14px;line-height:1.6;white-space:pre-wrap}
.msg.u{background:#123d2b}.msg.a{background:#1b2a4a}
.login{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:var(--bg)}
.card{background:#0f1830;border:1px solid var(--line);border-radius:16px;padding:26px;max-width:380px;width:90%}
.card input{width:100%;padding:10px;margin:10px 0;border-radius:10px;border:1px solid var(--line);background:#152242;color:var(--tx)}
.card button{width:100%;padding:11px;border:0;border-radius:10px;background:var(--pri);color:#fff;cursor:pointer}
.hide{display:none}
</style>
</head>
<body>
<canvas id="scene"></canvas>

<div id="login" class="login">
  <div class="card">
    <h3>المساعد المدير</h3>
    <p style="color:var(--mut);font-size:13px">أدخل رمز الدخول (نفس PAIRING_TOKEN).</p>
    <input id="tok" type="password" placeholder="admin token"/>
    <button onclick="doLogin()">دخول</button>
    <p id="lerr" style="color:#fca5a5;font-size:13px"></p>
  </div>
</div>

<div id="app" class="hide">
  <div class="top">
    <div class="brand"><img class="logo" src="/logo" onerror="this.style.display='none'"/><span>المساعد المدير</span></div>
    <div style="display:flex;gap:10px;align-items:center">
      <span id="waChip" class="chip">—</span>
      <span id="aiChip" class="chip">—</span>
      <button class="rbtn" onclick="toggleHist()" title="السجل">🕘</button>
      <a href="/">← الداشبورد</a>
    </div>
  </div>

  <div id="stateLbl" class="state">اضغط المايك وحچي معاي 🎙️</div>

  <div id="reply" class="reply hide"></div>

  <div class="dock">
    <div class="wave" id="wave"></div>
    <div class="controls">
      <button class="rbtn" id="muteBtn" onclick="toggleMute()" title="كتم الصوت">🔊</button>
      <button class="mic" id="mic" onclick="toggleMic()">🎙️</button>
      <button class="rbtn" onclick="stopAll()" title="إيقاف">⏹️</button>
    </div>
    <div class="inrow">
      <input id="text" placeholder="أو اكتب هنا..." onkeydown="if(event.key==='Enter')sendText()"/>
      <button onclick="sendText()">➤</button>
    </div>
  </div>

  <div id="hist">
    <h3>سجل المحادثة</h3>
    <div class="controls" style="margin-bottom:10px">
      <button class="rbtn" onclick="resetHist()" title="مسح">🗑️</button>
      <button class="rbtn" onclick="toggleHist()" title="إغلاق">✕</button>
    </div>
    <div id="histBody"></div>
  </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
var TOKEN=localStorage.getItem("abjad_token")||"";
function doLogin(){TOKEN=document.getElementById("tok").value.trim();localStorage.setItem("abjad_token",TOKEN);boot();}
function api(path,opts){opts=opts||{};opts.headers=Object.assign({"x-admin-token":TOKEN,"content-type":"application/json"},opts.headers||{});
return fetch("/api"+path,opts).then(function(r){if(r.status===401)throw{unauth:1};return r.json().catch(function(){return{};});});}

function boot(){api("/state").then(function(s){
  document.getElementById("login").classList.add("hide");
  document.getElementById("app").classList.remove("hide");
  document.getElementById("waChip").textContent=(s.whatsapp==="connected"?"🟢 واتساب":"واتساب: "+s.whatsapp);
  document.getElementById("aiChip").textContent="AI: "+(s.aiModel||s.aiProvider);
  initHead();buildWave();loadHist();initMicMeter();
}).catch(function(e){if(e&&e.unauth)document.getElementById("lerr").textContent="رمز غير صحيح";
  document.getElementById("login").classList.remove("hide");});}

/* ================= STATE MACHINE ================= */
var STATE="idle";
var COLORS={idle:0x2f6bff,listening:0x38bdf8,thinking:0xa855f7,speaking:0x22d3ee,tool:0xf59e0b,error:0xef4444};
var LABELS={idle:"جاهز — اضغط المايك 🎙️",listening:"يستمع...",thinking:"يفكر...",speaking:"يتحدث...",tool:"يراجع البيانات...",error:"صار خطأ"};
function setState(s,customLabel){STATE=s;document.getElementById("stateLbl").textContent=customLabel||LABELS[s]||"";}

/* ================= WEBGL HEAD ================= */
var renderer,scene,camera,core,wire,glow,eyeL,eyeR,ring,clock,amp=0,targetAmp=0;
function initHead(){
  if(typeof THREE==="undefined"){return;}
  var cv=document.getElementById("scene");
  renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(innerWidth,innerHeight);
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,100);camera.position.z=5;
  scene.add(new THREE.AmbientLight(0x223355,1.2));
  var p=new THREE.PointLight(0x3b82f6,2,50);p.position.set(4,4,6);scene.add(p);
  core=new THREE.Group();scene.add(core);
  var geo=new THREE.IcosahedronGeometry(1.5,1);
  glow=new THREE.Mesh(geo.clone(),new THREE.MeshBasicMaterial({color:COLORS.idle,transparent:true,opacity:0.10}));
  glow.scale.set(1.35,1.35,1.35);core.add(glow);
  var inner=new THREE.Mesh(new THREE.IcosahedronGeometry(1.15,2),new THREE.MeshStandardMaterial({color:0x0a1224,metalness:.7,roughness:.3,emissive:0x0a1a33,emissiveIntensity:.4}));
  core.add(inner);
  wire=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:COLORS.idle,wireframe:true,transparent:true,opacity:.55}));
  core.add(wire);
  var eg=new THREE.SphereGeometry(0.12,16,16);
  var em=new THREE.MeshBasicMaterial({color:0x9fe8ff});
  eyeL=new THREE.Mesh(eg,em.clone());eyeR=new THREE.Mesh(eg,em.clone());
  eyeL.position.set(-0.42,0.18,1.12);eyeR.position.set(0.42,0.18,1.12);core.add(eyeL);core.add(eyeR);
  // particle ring
  var N=600,pos=new Float32Array(N*3);
  for(var i=0;i<N;i++){var a=Math.random()*Math.PI*2,r=2.4+Math.random()*1.6;pos[i*3]=Math.cos(a)*r;pos[i*3+1]=(Math.random()-.5)*2.4;pos[i*3+2]=Math.sin(a)*r;}
  var pg=new THREE.BufferGeometry();pg.setAttribute("position",new THREE.BufferAttribute(pos,3));
  ring=new THREE.Points(pg,new THREE.PointsMaterial({color:COLORS.cyan,size:0.03,transparent:true,opacity:.6}));scene.add(ring);
  clock=new THREE.Clock();
  addEventListener("resize",function(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
  animate();
}
function setHeadColor(c){if(!wire)return;wire.material.color.setHex(c);glow.material.color.setHex(c);}
function animate(){requestAnimationFrame(animate);if(!renderer)return;
  var t=clock.getElapsedTime();
  amp+=(targetAmp-amp)*0.15;
  var col=COLORS[STATE]||COLORS.idle;setHeadColor(col);
  var breathe=STATE==="idle"?0.03*Math.sin(t*1.2):0;
  var sc=1+breathe+amp*0.5;core.scale.set(sc,sc,sc);
  core.rotation.y+=STATE==="thinking"?0.05:0.006;
  core.rotation.x=0.1*Math.sin(t*0.4);
  glow.material.opacity=0.08+amp*0.5+(STATE==="speaking"?0.12:0);
  var eb=0.6+amp*2+(STATE==="listening"?0.5:0)+0.2*Math.sin(t*3);
  eyeL.material.color.setRGB(0.6*eb,0.9*eb,eb);eyeR.material.color.copy(eyeL.material.color);
  ring.rotation.y-=0.0018;ring.material.color.setHex(col);ring.material.opacity=0.4+amp*0.4;
  if(STATE==="thinking"){targetAmp=0.25+0.15*Math.sin(t*8);}
  renderer.render(scene,camera);
  updateWave(amp);
}

/* ================= WAVE ================= */
function buildWave(){var w=document.getElementById("wave");w.innerHTML="";for(var i=0;i<28;i++)w.appendChild(document.createElement("i"));}
function updateWave(a){var bars=document.getElementById("wave").children;for(var i=0;i<bars.length;i++){
  var base=(STATE==="listening"||STATE==="speaking")?a:0.02;var h=6+Math.abs(Math.sin(i*0.6+Date.now()/120))*base*60;bars[i].style.height=h+"px";}}

/* ================= MIC METER (listening amplitude) ================= */
var micStream,micAnalyser,micData,vadOn=false;
function initMicMeter(){/* lazy: created on first listen */}
async function ensureMic(){if(micAnalyser)return true;
  try{micStream=await navigator.mediaDevices.getUserMedia({audio:true});
    var ac=new (window.AudioContext||window.webkitAudioContext)();var src=ac.createMediaStreamSource(micStream);
    micAnalyser=ac.createAnalyser();micAnalyser.fftSize=256;src.connect(micAnalyser);micData=new Uint8Array(micAnalyser.frequencyBinCount);
    (function loop(){requestAnimationFrame(loop);if(!micAnalyser)return;micAnalyser.getByteFrequencyData(micData);
      var sum=0;for(var i=0;i<micData.length;i++)sum+=micData[i];var v=sum/micData.length/255;
      if(STATE==="listening")targetAmp=Math.min(v*2.2,1.2);
      // barge-in: if AI is speaking and user talks loudly, stop TTS and listen
      if(STATE==="speaking"&&v>0.10){stopSpeak();startListen();}
    })();
    return true;}catch(e){return false;}}

/* ================= SPEECH RECOGNITION (STT) ================= */
var recog=null,listening=false;
function makeRecog(){var SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return null;
  var r=new SR();r.lang="ar-SA";r.interimResults=false;r.maxAlternatives=1;r.continuous=false;
  r.onresult=function(e){var t=e.results[0][0].transcript;stopListen();if(t&&t.trim())handleUserInput(t.trim());};
  r.onerror=function(){stopListen();};
  r.onend=function(){if(listening){listening=false;document.getElementById("mic").classList.remove("live");if(STATE==="listening")setState("idle");}};
  return r;}
async function startListen(){await ensureMic();if(!recog)recog=makeRecog();
  if(!recog){setState("idle","المتصفح ما يدعم التعرف الصوتي — اكتب بدالها");return;}
  try{recog.start();listening=true;document.getElementById("mic").classList.add("live");setState("listening");}catch(e){}}
function stopListen(){listening=false;document.getElementById("mic").classList.remove("live");try{recog&&recog.stop();}catch(e){}}
function toggleMic(){if(STATE==="speaking")stopSpeak();if(listening)stopListen();else startListen();}

/* ================= TTS ================= */
var muted=false,speaking=false,ttsTimer=null;
function pickVoice(){var vs=speechSynthesis.getVoices();return vs.find(function(v){return /ar/i.test(v.lang);})||null;}
function speak(text){if(muted||!text){setState("idle");return;}
  try{speechSynthesis.cancel();}catch(e){}
  var u=new SpeechSynthesisUtterance(text);var v=pickVoice();if(v)u.voice=v;u.lang="ar-SA";u.rate=1.02;u.pitch=1;
  u.onstart=function(){speaking=true;setState("speaking");ttsTimer=setInterval(function(){targetAmp=0.3+Math.random()*0.5;},90);};
  u.onend=function(){speaking=false;clearInterval(ttsTimer);targetAmp=0;setState("idle");};
  speechSynthesis.speak(u);}
function stopSpeak(){speaking=false;clearInterval(ttsTimer);targetAmp=0;try{speechSynthesis.cancel();}catch(e){}}
function toggleMute(){muted=!muted;document.getElementById("muteBtn").textContent=muted?"🔇":"🔊";if(muted)stopSpeak();}
function stopAll(){stopSpeak();stopListen();setState("idle");}

/* ================= CONVERSATION ================= */
function showReply(t){var el=document.getElementById("reply");el.textContent=t;el.classList.remove("hide");}
function sendText(){var el=document.getElementById("text");var t=el.value.trim();if(!t)return;el.value="";handleUserInput(t);}
function handleUserInput(text){addHist("u",text);setState("thinking");showReply("…");
  api("/executive/chat",{method:"POST",body:JSON.stringify({message:text})}).then(function(r){
    if(r.toolHints&&r.toolHints.length){setState("tool",r.toolHints[0]);}
    var reply=r.reply||"ما وصلني رد.";addHist("a",reply);showReply(reply);speak(reply);
    if(!speaking&&muted)setState("idle");
  }).catch(function(e){if(e&&e.unauth){location.reload();return;}setState("error");showReply("صار خطأ بالاتصال.");setTimeout(function(){setState("idle");},1500);});}

/* ================= HISTORY ================= */
function toggleHist(){document.getElementById("hist").classList.toggle("open");}
function addHist(role,text){var b=document.getElementById("histBody");var d=document.createElement("div");d.className="msg "+(role==="u"?"u":"a");d.textContent=text;b.appendChild(d);b.scrollTop=b.scrollHeight;}
function loadHist(){api("/executive/history").then(function(list){var b=document.getElementById("histBody");b.innerHTML="";
  list.forEach(function(m){addHist(m.role==="user"?"u":"a",m.content);});}).catch(function(){});}
function resetHist(){if(confirm("مسح ذاكرة المحادثة؟"))api("/executive/reset",{method:"POST",body:"{}"}).then(function(){document.getElementById("histBody").innerHTML="";});}

if(window.speechSynthesis){speechSynthesis.onvoiceschanged=function(){};}
if(TOKEN)boot();
</script>
</body>
</html>`;
