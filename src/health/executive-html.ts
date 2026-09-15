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
.wave{display:flex;gap:3px;align-items:center;height:24px;opacity:0;transition:opacity .2s}
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
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
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
var renderer,scene,camera,head,halo,hud,eyes,clock,particleMat,particleCloud,avatarRoot,morphMeshes=[];
var amp=0,targetAmp=0,lookX=0,lookY=0,pointerX=0,pointerY=0,reduced=matchMedia("(prefers-reduced-motion: reduce)").matches,slowFrames=0,lastFrame=0;
function fit(){if(!renderer)return;renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;
 camera.position.set(0,0.15,(innerHeight>innerWidth)?4.9:4.0);camera.lookAt(0,0.15,0);camera.updateProjectionMatrix();}
function initHead(){if(typeof THREE==="undefined"||!document.createElement("canvas").getContext("webgl")){document.getElementById("stateLbl").textContent="WEBGL FALLBACK";return;}
 renderer=new THREE.WebGLRenderer({canvas:document.getElementById("scene"),antialias:false,alpha:true,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.35:1.8));scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(46,1,0.1,100);head=new THREE.Group();scene.add(head);
 var mobile=innerWidth<700||/Android|iPhone|iPad/i.test(navigator.userAgent),N=reduced?4200:(mobile?6800:12800),pos=new Float32Array(N*3),seed=new Float32Array(N),depth=new Float32Array(N),part=new Float32Array(N);
 for(var i=0;i<N;i++){var x,y,z,r,a;if(i<N*.72){
   /* Sculpted head surface: cranium, temples, jaw and chin with real front/back depth. */
   y=-.86+Math.random()*2.38;var yn=(y-.25)/1.19;var cross=Math.sqrt(Math.max(0,1-yn*yn));var jaw=y<.1?(.62+(y+.86)*.34):1;var width=.93*cross*jaw;var th=Math.random()*6.283;x=width*Math.cos(th);z=.78*cross*Math.sin(th);if(z>0){z*=.9;if(y<-.28)z-=.08;if(y>.18&&y<.52&&Math.abs(x)>.16&&Math.abs(x)<.58)z-=.11*(1-Math.abs(Math.abs(x)-.36)/.22);}if(y<-.55)x*=.72+(y+.86)*.75;if(y<-.68)z+=.07;part[i]=0;
   if(y<-.55){var chin=.08+(y+.86)/.31*.92;x*=Math.max(.08,chin);z*=.72+.28*Math.max(0,chin);}
  }else if(i<N*.91){
   /* Neck and shoulder mantle, joined to the head instead of a flat cloud. */
   var u=Math.random(),side=Math.random()<.5?-1:1;x=side*(.28+Math.pow(u,.72)*1.55);y=-.78-Math.pow(u,.62)*.73-(Math.random()-.5)*.12;z=(Math.random()-.5)*(.62+.2*u);if(u<.2)x*=.7;part[i]=1;
  }else{a=Math.random()*6.283;r=1.15+Math.random()*1.05;x=Math.cos(a)*r;y=.08+Math.sin(a)*r*.76;z=(Math.random()-.5)*1.45;part[i]=2;}
  if(part[i]===2||Math.random()<.075){x+=(Math.random()-.5)*.26;y+=(Math.random()-.5)*.2;}pos[i*3]=x;pos[i*3+1]=y;pos[i*3+2]=z;seed[i]=Math.random();depth[i]=Math.max(.05,Math.min(1,(z+.82)/1.64));}
 var geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(pos,3));geo.setAttribute("aSeed",new THREE.BufferAttribute(seed,1));geo.setAttribute("aDepth",new THREE.BufferAttribute(depth,1));
 geo.setAttribute("aPart",new THREE.BufferAttribute(part,1));
 particleMat=new THREE.ShaderMaterial({uniforms:{time:{value:0},audio:{value:0},state:{value:0},pixel:{value:renderer.getPixelRatio()}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:'attribute float aSeed,aDepth,aPart;uniform float time,audio,state,pixel;varying float v,vDepth;void main(){vec3 p=position;float w=sin(time*(.45+aSeed)+aSeed*35.)*.012;float voice=audio*(aPart<.5&&p.y<-.15?.09:.045);p+=normalize(p+vec3(.001))*(w+voice*sin(time*8.+aSeed*24.));if(state>1.5&&state<4.5&&aPart>1.5){float a=time*.16;mat2 m=mat2(cos(a),-sin(a),sin(a),cos(a));p.xz=m*p.xz;}vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(.82+aSeed*1.85+audio*1.45)*pixel*(4.5/-mv.z);v=aSeed;vDepth=aDepth;}',fragmentShader:'varying float v,vDepth;uniform float state;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;vec3 c=mix(vec3(.018,.24,.72),vec3(.7,.97,1.),v*.55+vDepth*.45);if(state>5.5)c*=.45;float alpha=smoothstep(.5,0.,d)*(.13+v*.43+vDepth*.38);gl_FragColor=vec4(c,alpha);}'});particleCloud=new THREE.Points(geo,particleMat);head.add(particleCloud);
 /* Soft particle eyes: short luminous arcs, never square points or human eyeballs. */
 eyes=new THREE.Group();for(var side=-1;side<=1;side+=2){var ep=[];for(var e=0;e<16;e++){var ex=(e/15-.5)*.3;ep.push(new THREE.Vector3(side*.31+ex,.36-Math.abs(ex)*.2,.695+Math.cos(ex*8)*.012));}var eg=new THREE.BufferGeometry().setFromPoints(ep);eyes.add(new THREE.Points(eg,new THREE.PointsMaterial({color:0xbdf8ff,size:.055,transparent:true,opacity:.78,blending:THREE.AdditiveBlending,depthWrite:false})));}head.add(eyes);
 halo=new THREE.Group();halo.position.z=-.38;head.add(halo);
 function arc(radius,start,length,z,opacity){var pts=[];for(var q=0;q<=72;q++){var aa=start+length*q/72;pts.push(new THREE.Vector3(Math.cos(aa)*radius,Math.sin(aa)*radius*.92,z));}var ag=new THREE.BufferGeometry().setFromPoints(pts);var am=new THREE.LineBasicMaterial({color:0x38bdf8,transparent:true,opacity:opacity,blending:THREE.AdditiveBlending,depthWrite:false});halo.add(new THREE.Line(ag,am));}
 arc(1.72,-2.78,1.16,0,.52);arc(1.72,-.18,1.02,0,.52);arc(1.91,-2.18,.72,-.02,.2);arc(1.91,.78,.68,-.02,.2);
 hud=new THREE.Group();head.add(hud);
 scene.add(new THREE.HemisphereLight(0x80dfff,0x020614,1.25));var key=new THREE.DirectionalLight(0x9eeaff,2.2);key.position.set(2.5,3,4);scene.add(key);var rim=new THREE.PointLight(0x086cff,2.8,12);rim.position.set(-3,.5,-1);scene.add(rim);
 loadAvatar();clock=new THREE.Clock();addEventListener("resize",fit);addEventListener("pointermove",function(e){pointerX=(e.clientX/innerWidth-.5)*2;pointerY=(e.clientY/innerHeight-.5)*2},{passive:true});fit();animate();}

function disposeParticles(){if(!particleCloud)return;head.remove(particleCloud);particleCloud.geometry.dispose();particleCloud.material.dispose();particleCloud=null;eyes.visible=false;}
function registerMorphs(root){morphMeshes=[];root.traverse(function(o){if(o.isMesh){o.castShadow=false;o.receiveShadow=false;if(o.morphTargetDictionary&&o.morphTargetInfluences)morphMeshes.push(o);if(o.material){o.material.transparent=true;o.material.needsUpdate=true;}}});}
function loadAvatar(){if(!THREE.GLTFLoader)return;new THREE.GLTFLoader().load('/executive-avatar.glb',function(g){disposeParticles();avatarRoot=g.scene;avatarRoot.scale.setScalar(1.35);avatarRoot.position.y=-1.15;head.add(avatarRoot);registerMorphs(avatarRoot);},undefined,function(){/* Keep the premium particle entity until a branded GLB is supplied. */});}
function driveMorphs(level){for(var i=0;i<morphMeshes.length;i++){var mesh=morphMeshes[i],dict=mesh.morphTargetDictionary,inf=mesh.morphTargetInfluences;Object.keys(dict).forEach(function(name){var low=name.toLowerCase();if(/jawopen|mouthopen|viseme_aa|viseme_oh/.test(low))inf[dict[name]]+=(level-inf[dict[name]])*.32;else if(/blink/.test(low)){var blink=Math.pow(Math.max(0,Math.sin(clock.elapsedTime*.72-1.2)),28);inf[dict[name]]+=(blink-inf[dict[name]])*.3;}});}}

function animate(now){requestAnimationFrame(animate);if(!renderer)return;var t=clock.getElapsedTime();
 if(speaking&&spAnalyser){spAnalyser.getByteFrequencyData(spData);var s=0;for(var i=0;i<spData.length;i++)s+=spData[i];targetAmp=Math.min((s/spData.length/255)*2.6,1.3);}
 else if(STATE==="listening"&&micAnalyser){micAnalyser.getByteFrequencyData(micData);var m=0;for(var j=0;j<micData.length;j++)m+=micData[j];targetAmp=Math.min((m/micData.length/255)*2.6,1.3);}
 else if(STATE==="thinking"||STATE==="tool"){targetAmp=0.12+0.08*Math.sin(t*6);}
 else{targetAmp=0;}
 amp+=(targetAmp-amp)*0.2;
 var col=COLORS[STATE]||COLORS.idle,tlx=pointerX||0,tly=pointerY||0;if(STATE==="thinking"||STATE==="tool")tlx+=.12;
 lookX+=(tlx-lookX)*0.06;lookY+=(tly-lookY)*0.06;
 head.position.y=0.03+(reduced?0:0.018*Math.sin(t*.75));head.rotation.y=lookX*.087+(reduced?0:Math.sin(t*.28)*.018);head.rotation.x=-lookY*.052;
 particleMat.uniforms.time.value=t;particleMat.uniforms.audio.value=amp;particleMat.uniforms.state.value=STATE==="listening"?1:STATE==="thinking"?2:STATE==="speaking"?3:STATE==="tool"?4:STATE==="success"?5:STATE==="error"?6:0;
 if(avatarRoot){avatarRoot.rotation.y=(reduced?0:Math.sin(t*.32)*.025);driveMorphs(STATE==="speaking"?Math.min(1,amp*1.35):0);}
 halo.children.forEach(function(line,k){line.material.color.setHex(col);line.material.opacity=(k<2?.34:.13)+amp*(k<2?.3:.14);});halo.rotation.z+=0.0007+amp*0.004;
 eyes.children.forEach(function(eye){eye.material.opacity=.55+(STATE==="listening"?.35:0)+amp*.28;eye.material.size=.05+amp*.035;});
 renderer.render(scene,camera);drawWave();if(lastFrame&&now-lastFrame>30)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);if(slowFrames>80&&renderer.getPixelRatio()>1){renderer.setPixelRatio(1);particleMat.uniforms.pixel.value=1;fit();slowFrames=0;}lastFrame=now;}

/* ===== wave ===== */
function buildWave(){var w=document.getElementById("wave");w.innerHTML="";for(var i=0;i<26;i++)w.appendChild(document.createElement("i"));}
function drawWave(){var b=document.getElementById("wave").children;var on=(STATE==="listening"||STATE==="speaking");
 document.getElementById("wave").style.opacity=on?"1":"0";
 for(var i=0;i<b.length;i++){var h=4+(on?Math.abs(Math.sin(i*0.6+Date.now()/110))*amp*54:0);b[i].style.height=h+"px";}}

/* ===== audio context ===== */
var ac=null;function AC(){if(!ac)ac=new(window.AudioContext||window.webkitAudioContext)();if(ac.state==="suspended")ac.resume();return ac;}

/* ===== mic (STT) — needs HTTPS ===== */
var micStream,micAnalyser,micData,recog=null,listening=false;
async function ensureMic(){if(micAnalyser)return true;try{micStream=await navigator.mediaDevices.getUserMedia({audio:true});
 var c=AC();var src=c.createMediaStreamSource(micStream);micAnalyser=c.createAnalyser();micAnalyser.fftSize=256;src.connect(micAnalyser);micData=new Uint8Array(micAnalyser.frequencyBinCount);
 (function loop(){requestAnimationFrame(loop);if(!micAnalyser)return;micAnalyser.getByteFrequencyData(micData);var s=0;for(var i=0;i<micData.length;i++)s+=micData[i];var v=s/micData.length/255;if(speaking&&v>0.12){stopSpeak();startListen();}})();
 return true;}catch(e){return false;}}
function makeRecog(){var SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return null;var r=new SR();r.lang="ar-IQ";r.interimResults=false;r.continuous=false;
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
