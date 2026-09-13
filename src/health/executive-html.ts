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
:root{--bg:#020712;--tx:#e4f8ff;--mut:#7196b6;--pri:#1677ff;--cyan:#2fd8ff;--line:rgba(48,147,220,.26)}
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;font-family:system-ui,Segoe UI,Tahoma,sans-serif;color:var(--tx);background:radial-gradient(circle at 50% 43%,#08203c 0,#020914 44%,#01040a 82%);overflow:hidden;-webkit-tap-highlight-color:transparent}
body:after{content:"";position:fixed;inset:0;z-index:2;pointer-events:none;background:linear-gradient(rgba(30,120,190,.045) 1px,transparent 1px);background-size:100% 4px}
#scene{position:fixed;inset:0;z-index:0}
.top{position:fixed;top:0;left:0;right:0;z-index:5;display:flex;justify-content:space-between;align-items:center;padding:14px 18px}
.brand{display:flex;align-items:center;gap:9px;font-weight:700;font-size:18px;letter-spacing:4px;text-shadow:0 0 16px rgba(47,216,255,.55)}
.brand img{width:32px;height:32px;border-radius:50%;box-shadow:0 0 14px rgba(47,107,255,.7)}
.top .r{display:flex;gap:8px;align-items:center}
.top a{color:var(--mut);text-decoration:none;font-size:13px}
.iconbtn{width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:rgba(18,26,46,.55);color:var(--tx);
 cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)}
.iconbtn svg{width:20px;height:20px}
.state{position:fixed;top:78px;left:0;right:0;text-align:center;z-index:5;color:var(--cyan);font:600 11px ui-monospace,Consolas,monospace;letter-spacing:3px;min-height:22px;text-shadow:0 0 14px rgba(47,216,255,.7)}
.dock{position:fixed;bottom:0;left:0;right:0;z-index:6;display:flex;flex-direction:column;align-items:center;gap:14px;padding:20px}
.wave{display:flex;gap:3px;align-items:center;height:24px}
.wave i{width:3px;background:linear-gradient(180deg,var(--cyan),var(--pri));border-radius:3px;height:4px;transition:height .08s}
.controls{display:flex;align-items:center;gap:20px}
.mic{width:76px;height:76px;border-radius:50%;border:0;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;
 background:radial-gradient(circle at 32% 28%,#4b8bff,#1b4fd6);box-shadow:0 0 30px rgba(47,107,255,.65);transition:transform .1s}
.mic svg{width:30px;height:30px}
.mic:active{transform:scale(.93)}
.mic.live{background:radial-gradient(circle at 32% 28%,#53e6ff,#0757aa);box-shadow:0 0 40px rgba(47,216,255,.75);animation:pulse 1.2s infinite}
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
@media(max-width:700px){.top{padding:12px}.top a{display:none}.state{top:60px}.dock{padding:12px;gap:9px}.controls{gap:13px}.mic{width:64px;height:64px}.round{width:46px;height:46px}.inrow{width:96vw}.brand img{display:none}.brand{font-size:15px}}
@media(prefers-reduced-motion:reduce){.mic.live{animation:none}}
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
  initHead();buildWave();loadHist();
}).catch(function(e){if(e&&e.unauth)document.getElementById("lerr").textContent="رمز غير صحيح";
  document.getElementById("login").classList.remove("hide");});}

/* ===== state machine ===== */
var STATE="idle";
var COLORS={idle:0x168cff,listening:0x55e8ff,thinking:0x4b9cff,speaking:0x2ff0ff,tool:0x78dfff,success:0xb8ffff,error:0x31506d};
var LABELS={idle:"IDLE · VOICE READY",listening:"LISTENING",thinking:"THINKING",speaking:"SPEAKING",tool:"EXECUTING",success:"SUCCESS",error:"CONNECTION PAUSED"};
function setState(s,l){STATE=s;document.getElementById("stateLbl").textContent=(l!==undefined?l:(LABELS[s]||""));}

/* ===== abstract holographic entity: GPU-driven points, no human texture ===== */
var renderer,scene,camera,head,halo,hud,eyes,clock,particleMat;
var amp=0,targetAmp=0,lookX=0,lookY=0,pointerX=0,pointerY=0,reduced=matchMedia("(prefers-reduced-motion: reduce)").matches,slowFrames=0,lastFrame=0;
function fit(){if(!renderer)return;renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;
 camera.position.set(0,0.15,(innerHeight>innerWidth)?4.9:4.0);camera.lookAt(0,0.15,0);camera.updateProjectionMatrix();}
function initHead(){if(typeof THREE==="undefined"||!document.createElement("canvas").getContext("webgl")){document.getElementById("stateLbl").textContent="WEBGL FALLBACK";return;}
 renderer=new THREE.WebGLRenderer({canvas:document.getElementById("scene"),antialias:false,alpha:true,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.35:1.8));scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(46,1,0.1,100);head=new THREE.Group();scene.add(head);
 var mobile=innerWidth<700||/Android|iPhone|iPad/i.test(navigator.userAgent),N=reduced?4200:(mobile?6500:12500),pos=new Float32Array(N*3),seed=new Float32Array(N);
 for(var i=0;i<N;i++){var x,y,z;if(i<N*.75){var ph=Math.acos(1-2*Math.random()),th=Math.random()*6.283,r=.96+Math.random()*.08;x=.92*r*Math.sin(ph)*Math.cos(th);y=1.17*r*Math.cos(ph)+.28;z=.72*r*Math.sin(ph)*Math.sin(th);if(z>0&&y<.08){x*=.83;z+=.07;}}
  else if(i<N*.94){var a=Math.random()*Math.PI;x=Math.cos(a)*(1.05+Math.random()*.85);y=-1.12-Math.sin(a)*(.2+Math.random()*.38);z=(Math.random()-.5)*.72;}
  else{a=Math.random()*6.283;r=1.2+Math.random();x=Math.cos(a)*r;y=.05+Math.sin(a)*r*.74;z=(Math.random()-.5)*1.3;}if(Math.random()<.11){x+=(Math.random()-.5)*.35;y+=(Math.random()-.5)*.25;}pos[i*3]=x;pos[i*3+1]=y;pos[i*3+2]=z;seed[i]=Math.random();}
 var geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(pos,3));geo.setAttribute("aSeed",new THREE.BufferAttribute(seed,1));
 particleMat=new THREE.ShaderMaterial({uniforms:{time:{value:0},audio:{value:0},state:{value:0},pixel:{value:renderer.getPixelRatio()}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:'attribute float aSeed;uniform float time,audio,state,pixel;varying float v;void main(){vec3 p=position;float w=sin(time*(.5+aSeed)+aSeed*35.)*.014;p+=normalize(p+vec3(.001))*(w+audio*.065*sin(time*7.+aSeed*24.));if(state>1.5&&state<3.5&&aSeed>.82){float a=time*.14;mat2 m=mat2(cos(a),-sin(a),sin(a),cos(a));p.xz=m*p.xz;}vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(1.2+aSeed*2.2+audio*2.)*pixel*(4.5/-mv.z);v=aSeed;}',fragmentShader:'varying float v;uniform float state;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;vec3 c=mix(vec3(.04,.42,1.),vec3(.68,.97,1.),v);if(state>5.5)c*=.45;gl_FragColor=vec4(c,smoothstep(.5,0.,d)*(.35+v*.65));}'});head.add(new THREE.Points(geo,particleMat));
 var eg=new THREE.BufferGeometry();eg.setAttribute("position",new THREE.Float32BufferAttribute([-.3,.4,.69,.3,.4,.69],3));eyes=new THREE.Points(eg,new THREE.PointsMaterial({color:0xc8fbff,size:.105,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));head.add(eyes);
 halo=new THREE.Mesh(new THREE.TorusGeometry(1.7,0.02,16,90),new THREE.MeshBasicMaterial({color:0x38bdf8,transparent:true,opacity:.5}));
 halo.position.z=-0.3;head.add(halo);
 var H=110,hpos=new Float32Array(H*3);for(i=0;i<H;i++){a=i/H*6.283;r=1.85+((i%3)*.05);hpos[i*3]=Math.cos(a)*r;hpos[i*3+1]=Math.sin(a)*r;hpos[i*3+2]=0;}
 var pg=new THREE.BufferGeometry();pg.setAttribute("position",new THREE.BufferAttribute(hpos,3));
 hud=new THREE.Points(pg,new THREE.PointsMaterial({color:0xa855f7,size:0.045,transparent:true,opacity:0}));head.add(hud);
 clock=new THREE.Clock();addEventListener("resize",fit);addEventListener("pointermove",function(e){pointerX=(e.clientX/innerWidth-.5)*2;pointerY=(e.clientY/innerHeight-.5)*2},{passive:true});fit();animate();}

function animate(now){requestAnimationFrame(animate);if(!renderer)return;var t=clock.getElapsedTime();
 if(speaking&&spAnalyser){spAnalyser.getByteFrequencyData(spData);var s=0;for(var i=0;i<spData.length;i++)s+=spData[i];targetAmp=Math.min((s/spData.length/255)*2.6,1.3);}
 else if(STATE==="listening"&&micAnalyser){micAnalyser.getByteFrequencyData(micData);var m=0;for(var j=0;j<micData.length;j++)m+=micData[j];targetAmp=Math.min((m/micData.length/255)*2.6,1.3);}
 else if(STATE==="thinking"||STATE==="tool"){targetAmp=0.12+0.08*Math.sin(t*6);}
 else{targetAmp=0;}
 amp+=(targetAmp-amp)*0.2;
 var col=COLORS[STATE]||COLORS.idle,tlx=pointerX||0,tly=pointerY||0;if(STATE==="thinking"||STATE==="tool")tlx+=.12;
 lookX+=(tlx-lookX)*0.06;lookY+=(tly-lookY)*0.06;
 head.position.y=0.03+(reduced?0:0.018*Math.sin(t*.75));head.rotation.y=lookX*.087;head.rotation.x=-lookY*.052;
 particleMat.uniforms.time.value=t;particleMat.uniforms.audio.value=amp;particleMat.uniforms.state.value=STATE==="listening"?1:STATE==="thinking"?2:STATE==="speaking"?3:STATE==="tool"?4:STATE==="success"?5:STATE==="error"?6:0;
 halo.material.color.setHex(col);halo.material.opacity=0.32+amp*0.55;halo.rotation.z+=0.003+amp*0.02;
 hud.material.opacity+=(((STATE==="thinking"||STATE==="tool")?0.9:0)-hud.material.opacity)*0.1;hud.rotation.z-=0.02;
 eyes.material.color.setHex(col);eyes.material.opacity=.65+(STATE==="listening"?.3:0)+amp*.15;eyes.material.size=.095+amp*.06;
 renderer.render(scene,camera);drawWave();if(lastFrame&&now-lastFrame>30)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);if(slowFrames>80&&renderer.getPixelRatio()>1){renderer.setPixelRatio(1);particleMat.uniforms.pixel.value=1;fit();slowFrames=0;}lastFrame=now;}

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
