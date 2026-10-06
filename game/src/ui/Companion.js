export class Companion {
  constructor(tracker) {
    this.tracker = tracker;
    this.lastEventCount = 0;
    this.memory = { sawButton:false, pressedButton:false, failed:false, retriedButton:false, searchedDrawer:false, checkedDoorAfterFailure:false, exploredBeforeFailure:false };
    this.voiceEnabled = true;
    this.showText = true;
    this.voiceUnlocked = false;
    this.pendingVoice = null;
    this.voiceMood = "calm";
    this.voiceReady = false;
    this.voiceTested = false;
    this.speechActive = false;
    this.speechSequence = 0;
    this.queuedVoice = null;
    this.lastSpokenMessage = "";
    this.lastSpokenAt = 0;
    this.sayTimers = new Set();
    this.createUI();
    this.installVoiceUnlock();
    this.say("خب... بریم ببینیم راه خروج کجاست.", 900, "calm");
    this.timer = setInterval(() => this.observe(), 350);
  }

  createUI() {
    this.panel = document.createElement("div");
    this.panel.id = "pg-companion";
    this.panel.innerHTML = '<div id="pg-companion-avatar"><span></span></div><div id="pg-companion-body"><div id="pg-companion-name">همراه</div><div id="pg-companion-text"></div></div>';
    Object.assign(this.panel.style,{position:"fixed",left:"50%",bottom:"88px",transform:"translate(-50%,10px)",display:"flex",alignItems:"center",gap:"12px",width:"min(430px,calc(100vw - 28px))",padding:"16px 18px",borderRadius:"14px",background:"rgba(10,12,17,.82)",border:"1px solid rgba(255,255,255,.13)",backdropFilter:"blur(12px)",boxShadow:"0 12px 35px rgba(0,0,0,.35)",direction:"rtl",fontFamily:"Tahoma,Arial,sans-serif",color:"#eee",zIndex:"6000",opacity:"0",transition:"opacity .25s,transform .25s",pointerEvents:"none"});
    document.body.appendChild(this.panel);
    this.text=this.panel.querySelector("#pg-companion-text");
    const style=document.createElement("style");
    style.textContent="@keyframes pgCompanionPulse{0%{transform:scale(.92);filter:brightness(1.4)}100%{transform:scale(1);filter:brightness(1)}}#pg-companion-avatar{width:44px;height:44px;min-width:44px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f2c59b 0 12%,#9a5f4b 14% 28%,#252a34 30% 65%,#101218 66%);border:1px solid rgba(255,255,255,.22);box-shadow:0 0 18px rgba(170,105,85,.35);position:relative}#pg-companion-avatar span{position:absolute;width:7px;height:7px;border-radius:50%;background:#e8c49b;left:11px;top:15px;box-shadow:15px 0 0 #e8c49b}#pg-companion-body{min-width:0;flex:1}#pg-companion-name{font-size:11px;color:#c58d7c;margin-bottom:5px}#pg-companion-text{font-size:16px;line-height:1.9;font-weight:500}";
    document.head.appendChild(style);
  }

  say(message,delay=0,mood="calm") {
    if(delay===0&&this.sayTimers.size){for(const timer of this.sayTimers)clearTimeout(timer);this.sayTimers.clear();}
    const timer=setTimeout(()=>{this.sayTimers.delete(timer);this.text.textContent=message;this.voiceMood=this.normalizeMood(mood,message);this.pendingVoice={message,mood:this.voiceMood};this.speak(message,this.voiceMood);if(!this.showText)return;this.panel.style.opacity="1";this.panel.querySelector("#pg-companion-avatar").style.animation="pgCompanionPulse .9s ease-out";this.panel.style.transform="translate(-50%,0)";clearTimeout(this.hideTimer);this.hideTimer=setTimeout(()=>{this.panel.style.opacity="0";this.panel.style.transform="translate(-50%,10px)";},4800);},delay);this.sayTimers.add(timer);
  }

  installVoiceUnlock(){const unlock=()=>{if(!("speechSynthesis"in window))return;this.voiceUnlocked=true;try{window.speechSynthesis.resume();window.speechSynthesis.cancel();const voices=window.speechSynthesis.getVoices();this.voiceReady=voices.length>0;if(this.pendingVoice)this.speak(this.pendingVoice.message,this.pendingVoice.mood);}catch(error){}window.removeEventListener("pointerdown",unlock);window.removeEventListener("touchstart",unlock);window.removeEventListener("click",unlock);};window.addEventListener("pointerdown",unlock,{passive:true});window.addEventListener("touchstart",unlock,{passive:true});window.addEventListener("click",unlock,{passive:true});if("speechSynthesis"in window){window.speechSynthesis.addEventListener("voiceschanged",()=>{this.voiceReady=window.speechSynthesis.getVoices().length>0;if(this.voiceUnlocked&&this.pendingVoice)this.speak(this.pendingVoice.message,this.pendingVoice.mood);});}}

  normalizeMood(mood,message=""){if(["calm","tense","fear","stress"].includes(mood))return mood;if(/ترس|نترس|صدایی شنیدی|وجود نداره|دست بهش نمی‌زدم/.test(message))return"fear";if(/عجله|دوباره|چرا|مطمئنی|هنوز می‌خوای|انتخاب/.test(message))return"stress";return"calm";}

  speak(message,mood="calm"){
    if(!this.voiceEnabled||!("speechSynthesis"in window))return;
    if(!this.voiceUnlocked){this.pendingVoice={message,mood};return;}
    const now=Date.now();if(message===this.lastSpokenMessage&&now-this.lastSpokenAt<1400)return;
    if(this.speechActive){if(message===this.pendingVoice?.message||message===this.queuedVoice?.message)return;this.queuedVoice={message,mood};return;}
    this.pendingVoice={message,mood};
    try{
      const synth=window.speechSynthesis;synth.cancel();synth.resume();const voices=synth.getVoices();const voice=voices.find(v=>/^fa(-|_)/i.test(v.lang))||voices.find(v=>/^ar(-|_)/i.test(v.lang))||voices.find(v=>/^tr(-|_)/i.test(v.lang))||voices.find(v=>v.default)||voices[0];
      const utterance=new SpeechSynthesisUtterance(message);utterance.lang=voice?.lang||"fa-IR";
      const profile={calm:{rate:.88,pitch:.95,volume:1},tense:{rate:.96,pitch:.82,volume:1},stress:{rate:1.02,pitch:.78,volume:1},fear:{rate:.70,pitch:.62,volume:.92}}[mood]||{rate:.88,pitch:.95,volume:1};
      utterance.rate=profile.rate;utterance.pitch=profile.pitch;utterance.volume=profile.volume;if(voice)utterance.voice=voice;
      this.speechActive=true;const speechSequence=++this.speechSequence;this.lastSpokenMessage=message;this.lastSpokenAt=now;
      utterance.onstart=()=>{this.voiceTested=true;};
      utterance.onend=()=>{this.speechActive=false;if(this.pendingVoice?.message===message)this.pendingVoice=null;const next=this.queuedVoice;this.queuedVoice=null;if(next&&next.message!==message)setTimeout(()=>{if(speechSequence!==this.speechSequence||this.speechActive)return;this.speak(next.message,next.mood);},90);};
      utterance.onerror=(event)=>{this.speechActive=false;console.warn("Companion TTS error:",event.error);this.pendingVoice=null;this.queuedVoice=null;};
      setTimeout(()=>{if(!this.voiceUnlocked||!this.speechActive)return;synth.resume();synth.speak(utterance);},120);
    }catch(error){this.speechActive=false;this.speechSequence++;console.warn("Companion voice unavailable",error);}
  }

  remember(event){switch(event.type){case"RED_BUTTON_FIRST_SEEN":this.memory.sawButton=true;break;case"RED_BUTTON_PRESS":this.memory.pressedButton=true;break;case"FAILURE":this.memory.failed=true;break;case"RETRY_AFTER_FAILURE":this.memory.retriedButton=true;break;case"DRAWER_INSPECTED":this.memory.searchedDrawer=true;break;case"DOOR_BLOCKED":this.memory.checkedDoorAfterFailure=true;break;case"OBJECT_INTERACTION":if(!this.memory.failed)this.memory.exploredBeforeFailure=true;break;}}

  react(event){
    if(event.type==="RED_BUTTON_FIRST_SEEN"&&!this.memory.pressedButton){this.say("اون رو دیدی؟ من جای تو بودم... دست بهش نمی‌زدم.",0,"tense");return;}
    if(event.type==="FAILURE"){this.say(this.memory.sawButton?"خب... همون شد که ازش می‌ترسیدم. آروم باش... یه راه دیگه پیدا کنیم.":"اوه... این یکی خوب پیش نرفت. بیا یه راه دیگه رو امتحان کنیم.",0,this.memory.sawButton?"fear":"tense");return;}
    if(event.type==="RETRY_AFTER_FAILURE"){this.say(this.memory.searchedDrawer?"هنوز سرنخ کشو رو داریم. قبل از دوباره امتحان کردن، بیا همونو دنبال کنیم.":"باز می‌خوای امتحانش کنی؟ من ترجیح می‌دم اول یه دور اطراف رو بگردیم.",0,this.memory.searchedDrawer?"calm":"stress");return;}
    if(event.type==="DRAWER_INSPECTED"){this.say(this.memory.failed?"خوبه... بعد از اون اتفاق، بهتره سرنخ رو دنبال کنیم.":"بالاخره یه سرنخ پیدا شد. شاید همین کلید به کارمون بیاد.",0,"calm");return;}
    if(event.type==="DOOR_BLOCKED")this.say(this.memory.retriedButton?"در هنوز قفله... فکر کنم وقتشه راه قبلی رو بی‌خیال بشیم.":"در قفله. بیا یه کم دقیق‌تر اطراف رو بگردیم.",0,this.memory.retriedButton?"tense":"calm");
  }

  observe(){const events=this.tracker.getEvents();if(events.length<=this.lastEventCount)return;const fresh=events.slice(this.lastEventCount);this.lastEventCount=events.length;for(const event of fresh){this.remember(event);this.react(event);}}

  destroy(){clearInterval(this.timer);clearTimeout(this.hideTimer);for(const timer of this.sayTimers)clearTimeout(timer);this.sayTimers.clear();this.queuedVoice=null;this.pendingVoice=null;this.speechActive=false;this.speechSequence++;if("speechSynthesis"in window)window.speechSynthesis.cancel();this.panel.remove();}
}
