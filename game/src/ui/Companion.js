export class Companion {
  constructor(tracker, audioManager = null) {
    this.tracker = tracker;
    this.audioManager = audioManager;
    this.lastEventCount = 0;
    this.memory = { sawButton:false, pressedButton:false, failed:false, retriedButton:false, searchedDrawer:false, checkedDoorAfterFailure:false, exploredBeforeFailure:false };
    this.voiceEnabled = true;
    this.showText = true;
    this.voiceUnlocked = false;
    this.pendingVoice = null;
    this.voiceMood = "calm";
    this.voiceReady = false;
    this.speechActive = false;
    this.speechSequence = 0;
    this.queuedVoice = null;
    this.lastSpokenMessage = "";
    this.lastSpokenAt = 0;
    this.sayTimers = new Set();
    this.reactionCooldownMs = 5200;
    this.lastReactionAt = 0;
    this.reactionCounts = {};
    this.createUI();
    this.installVoiceUnlock();
    this.say("خب... بریم ببینیم راه خروج کجاست.", 900, "calm", "intro.mp3");
    this.timer = setInterval(() => this.observe(), 350);
  }

  createUI() {
    this.panel = document.createElement("div");
    this.panel.id = "pg-companion";
    this.panel.innerHTML = '<div id="pg-companion-avatar"><span></span></div><div id="pg-companion-body"><div id="pg-companion-name">همراه</div><div id="pg-companion-text"></div></div>';
    Object.assign(this.panel.style,{position:"fixed",left:"50%",bottom:"88px",transform:"translate(-50%,10px)",display:"flex",alignItems:"center",gap:"13px",width:"min(500px,calc(100vw - 24px))",padding:"17px 20px",borderRadius:"18px",background:"linear-gradient(135deg,rgba(18,22,31,.96),rgba(10,13,19,.93))",border:"1px solid rgba(255,214,145,.32)",backdropFilter:"blur(14px)",boxShadow:"0 14px 42px rgba(0,0,0,.42),0 0 24px rgba(255,190,100,.08)",direction:"rtl",fontFamily:"Tahoma,Arial,sans-serif",color:"#fff",zIndex:"6000",opacity:"0",transition:"opacity .25s,transform .25s",pointerEvents:"none"});
    document.body.appendChild(this.panel);
    this.text=this.panel.querySelector("#pg-companion-text");
    const style=document.createElement("style");
    style.textContent="@keyframes pgCompanionPulse{0%{transform:scale(.92);filter:brightness(1.5)}100%{transform:scale(1);filter:brightness(1)}}@keyframes pgCompanionGlow{0%,100%{box-shadow:0 0 18px rgba(255,190,100,.25)}50%{box-shadow:0 0 28px rgba(255,210,130,.55)}}#pg-companion-avatar{width:48px;height:48px;min-width:48px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffe0b2 0 12%,#b87352 14% 28%,#303846 30% 65%,#11151d 66%);border:1px solid rgba(255,224,170,.48);box-shadow:0 0 20px rgba(255,190,100,.3);position:relative;animation:pgCompanionGlow 2.4s ease-in-out infinite}#pg-companion-avatar span{position:absolute;width:7px;height:7px;border-radius:50%;background:#fff0cf;left:12px;top:16px;box-shadow:17px 0 0 #fff0cf}#pg-companion-body{min-width:0;flex:1}#pg-companion-name{font-size:12px;font-weight:700;letter-spacing:.2px;color:#ffd58f;margin-bottom:6px;text-shadow:0 1px 8px rgba(255,190,100,.22)}#pg-companion-text{font-size:18px;line-height:1.95;font-weight:600;color:#fff4df;text-shadow:0 1px 10px rgba(0,0,0,.55)}@media(max-width:700px){#pg-companion{bottom:68px!important;padding:13px 14px!important;width:calc(100vw - 18px)!important;gap:10px!important}#pg-companion-avatar{width:42px;height:42px;min-width:42px}#pg-companion-name{font-size:11px}#pg-companion-text{font-size:16px;line-height:1.85}}";
    document.head.appendChild(style);
  }

  voiceFileFor(message) {
    const files = {
      "خب... بریم ببینیم راه خروج کجاست.":"intro.mp3",
      "کلید رو پیدا کردی. حالا می‌تونی مسیر خروج رو امتحان کنی.":"room_key_found.mp3",
      "این در هنوز باز نمی‌شه. اول باید کلید همین اتاق رو پیدا کنی.":"exit_blocked.mp3",
      "بالاخره یه سرنخ پیدا شد. شاید همین کلید به کارمون بیاد.":"calm_hint.mp3",
      "خوبه... بعد از اون اتفاق، بهتره سرنخ رو دنبال کنیم.":"calm_hint.mp3",
      "باز می‌خوای امتحانش کنی؟ من ترجیح می‌دم اول یه دور اطراف رو بگردیم.":"stress_hint.mp3"
    };
    return files[message] || null;
  }

  say(message,delay=0,mood="calm",voiceFile=null) {
    const resolvedVoiceFile=voiceFile||this.voiceFileFor(message);
    const timer=setTimeout(()=>{this.sayTimers.delete(timer);this.text.textContent=message;this.voiceMood=this.normalizeMood(mood,message);this.pendingVoice={message,mood:this.voiceMood,voiceFile:resolvedVoiceFile};this.speak(message,this.voiceMood,false,resolvedVoiceFile);if(!this.showText)return;this.panel.style.opacity="1";this.panel.querySelector("#pg-companion-avatar").style.animation="pgCompanionPulse .9s ease-out";this.panel.style.transform="translate(-50%,0)";clearTimeout(this.hideTimer);this.hideTimer=setTimeout(()=>{this.panel.style.opacity="0";this.panel.style.transform="translate(-50%,10px)";},5200);},delay);this.sayTimers.add(timer);
  }

  installVoiceUnlock(){
    const unlock=()=>{
      if(!("speechSynthesis"in window))return;
      this.voiceUnlocked=true;
      try{
        const synth=window.speechSynthesis;
        synth.cancel();
        synth.resume();
        this.voiceReady=synth.getVoices().length>0;
        if(this.pendingVoice)this.speak(this.pendingVoice.message,this.pendingVoice.mood,true,this.pendingVoice.voiceFile);else this.speak("صدای همراه فعال شد.", "calm", true);
      }catch(error){console.warn("Companion voice unlock failed",error);}
    };
    ["pointerdown","touchstart","click","keydown"].forEach(type=>window.addEventListener(type,unlock,{passive:true}));
    if("speechSynthesis"in window){
      window.speechSynthesis.addEventListener("voiceschanged",()=>{
        this.voiceReady=window.speechSynthesis.getVoices().length>0;
        if(this.voiceUnlocked&&this.pendingVoice&&!this.speechActive)this.speak(this.pendingVoice.message,this.pendingVoice.mood,true,this.pendingVoice.voiceFile);
      });
    }
  }

  normalizeMood(mood,message=""){if(["calm","tense","fear","stress"].includes(mood))return mood;if(/ترس|نترس|صدایی شنیدی|وجود نداره|دست بهش نمی‌زدم/.test(message))return"fear";if(/عجله|دوباره|چرا|مطمئنی|هنوز می‌خوای|انتخاب/.test(message))return"stress";return"calm";}

  pickVoice(){
    if(!("speechSynthesis"in window))return null;
    const voices=window.speechSynthesis.getVoices();
    return voices.find(v=>/^fa(-|_)/i.test(v.lang))||voices.find(v=>/^tr(-|_)/i.test(v.lang))||voices.find(v=>/^ar(-|_)/i.test(v.lang))||voices.find(v=>/persian|farsi|iran|turkish/i.test(v.name))||voices.find(v=>v.default)||voices[0]||null;
  }

  speak(message,mood="calm",force=false,voiceFile=null){
    if(!this.voiceEnabled)return;
    if(voiceFile && this.audioManager){
      const audio=this.audioManager.playCompanionVoice(voiceFile, mood==="fear" ? 0.9 : 0.95);
      if(audio){
        this.speechActive=true;
        this.lastSpokenMessage=message;
        this.lastSpokenAt=Date.now();
        const fallback=()=>{this.speechActive=false;this.speak(message,mood,true,null);};
        audio.onended=()=>{this.speechActive=false;if(this.pendingVoice?.message===message)this.pendingVoice=null;};
        audio.onerror=fallback;
        return;
      }
    }
    if(!("speechSynthesis"in window))return;
    if(!this.voiceUnlocked){this.pendingVoice={message,mood,voiceFile};return;}
    const now=Date.now();
    if(!force&&message===this.lastSpokenMessage&&now-this.lastSpokenAt<1400)return;
    const synth=window.speechSynthesis;
    if(this.speechActive){this.queuedVoice={message,mood,voiceFile};return;}
    this.pendingVoice={message,mood,voiceFile};
    try{
      synth.cancel();
      synth.resume();
      const voice=this.pickVoice();
      const utterance=new SpeechSynthesisUtterance(message);
      utterance.lang=voice?.lang||"fa-IR";
      utterance.voice=voice||null;
      const profile={calm:{rate:.88,pitch:.90,volume:1},tense:{rate:.96,pitch:.78,volume:1},stress:{rate:1.02,pitch:.74,volume:1},fear:{rate:.72,pitch:.68,volume:.95}}[mood]||{rate:.88,pitch:.90,volume:1};
      Object.assign(utterance,profile);
      this.speechActive=true;
      this.lastSpokenMessage=message;
      this.lastSpokenAt=now;
      const seq=++this.speechSequence;
      utterance.onstart=()=>{this.voiceReady=true;};
      utterance.onend=()=>{this.speechActive=false;if(this.pendingVoice?.message===message)this.pendingVoice=null;const next=this.queuedVoice;this.queuedVoice=null;if(next&&seq===this.speechSequence)setTimeout(()=>this.speak(next.message,next.mood,false,next.voiceFile),80);};
      utterance.onerror=(event)=>{this.speechActive=false;this.pendingVoice=null;this.queuedVoice=null;console.warn("Companion TTS error:",event.error);};
      if(this.voiceUnlocked&&seq===this.speechSequence){
        synth.resume();
        synth.speak(utterance);
        // بعضی مرورگرهای موبایل اگر در لحظه‌ی اول صدا را شروع نکنند،
        // با یک تلاش کوتاه دوباره فعال می‌شوند.
        setTimeout(()=>{
          if(!this.speechActive && this.voiceUnlocked && this.pendingVoice?.message===message){
            try{ synth.resume(); synth.speak(utterance); }catch(_){}
          }
        },220);
      }
    }catch(error){this.speechActive=false;console.warn("Companion voice unavailable",error);}
  }

  remember(event){switch(event.type){case"RED_BUTTON_FIRST_SEEN":this.memory.sawButton=true;break;case"RED_BUTTON_PRESS":this.memory.pressedButton=true;break;case"FAILURE":this.memory.failed=true;break;case"RETRY_AFTER_FAILURE":this.memory.retriedButton=true;break;case"DRAWER_INSPECTED":this.memory.searchedDrawer=true;break;case"DOOR_BLOCKED":this.memory.checkedDoorAfterFailure=true;break;case"OBJECT_INTERACTION":if(!this.memory.failed)this.memory.exploredBeforeFailure=true;break;}}
  react(event){
    const type=event.type;
    this.reactionCounts[type]=(this.reactionCounts[type]||0)+1;
    const now=Date.now();
    const important=new Set(["FAILURE","RED_BUTTON_FIRST_SEEN","DOOR_BLOCKED","ROOM_06_RECORDING_CHECKED","ROOM_07_COMPANION_PROMPT","ROOM_EXIT_BLOCKED_BY_KEY","KEY_CLUE_INSPECTED","KEY_FOUND"]);
    if(!important.has(type)&&now-this.lastReactionAt<this.reactionCooldownMs)return;
    const say=(message,mood="calm",voiceFile=null)=>{this.lastReactionAt=Date.now();this.say(message,0,mood,voiceFile);};

    if(type==="RED_BUTTON_FIRST_SEEN"&&!this.memory.pressedButton){say("اون رو دیدی؟ من جای تو بودم... اول یه دور اطرافش رو نگاه می‌کردم.","tense");return;}
    if(type==="FAILURE"){say(this.memory.sawButton?"خب... همون شد که ازش می‌ترسیدم. آروم باش؛ هنوز راه داریم.":"اوه... این یکی خوب پیش نرفت. عجله نکن، یه راه دیگه پیدا کنیم.",this.memory.sawButton?"fear":"tense");return;}
    if(type==="RETRY_AFTER_FAILURE"){say(this.memory.searchedDrawer?"هنوز سرنخ کشو رو داریم. قبل از تکرار، همونو دنبال کنیم.":"دوباره می‌خوای امتحانش کنی؟ این بار قبلش یه لحظه صبر کن.","stress");return;}
    if(type==="DRAWER_INSPECTED"){say(this.memory.failed?"خوبه... بعد از اون اتفاق، دنبال سرنخ رفتی.":"بالاخره یه سرنخ پیدا شد. شاید همین به کارمون بیاد.");return;}
    if(type==="DOOR_BLOCKED"){say(this.memory.retriedButton?"در هنوز قفله... شاید بهتره مسیر قبلی رو رها کنیم.":"در قفله. اطراف رو دقیق‌تر ببین.","tense");return;}
    if(type==="ROOM_04_MOVEMENT"&&this.reactionCounts[type]===3){say("داری مسیر رو دوباره امتحان می‌کنی... این بار ببین چیزی عوض شده یا نه.","calm");return;}
    if(type==="ROOM_05_MIRROR_INSPECTED"&&event.count>=2){say("دوباره همون رو نگاه کردی. مطمئنی این بار دنبال چیز تازه‌ای هستی؟","tense");return;}
    if(type==="ROOM_06_RECORDING_CHECKED"&&event.switchCount>=2){say("صدای قبلی رو عوض کردی... انگار هنوز مطمئن نیستی کدومش قابل اعتماده.","stress");return;}
    if(type==="ROOM_07_COMPANION_PROMPT"){say("لازم نیست به انتخاب من تکیه کنی. این یکی رو خودت تصمیم بگیر.","calm");return;}
    if(type==="KEY_CLUE_INSPECTED"&&event.clueNumber===1){say("نشونه رو دیدی. لازم نیست فوراً جوابش رو بدونی؛ اطرافش رو هم بررسی کن.","calm","calm_hint.mp3");return;}
    if(type==="ROOM_EXIT_BLOCKED_BY_KEY"){say("در باز نمی‌شه. یعنی هنوز یه چیز مهم این اطراف جا مونده.","tense","exit_blocked.mp3");return;}
    if(type==="KEY_FOUND"){say("خوبه... کلید رو پیدا کردی. حالا می‌تونیم جلو بریم.","calm","room_key_found.mp3");return;}
    if(type==="ROOM_KEY_PLACED"&&event.roomId==="ROOM_02"){say("قبل از انتخاب مسیر، یه چیز مهم اینجاست که باید خودت پیداش کنی.","calm");}
  }
  observe(){const events=this.tracker.getEvents();if(events.length<=this.lastEventCount)return;const fresh=events.slice(this.lastEventCount);this.lastEventCount=events.length;for(const event of fresh){this.remember(event);this.react(event);}}
  destroy(){clearInterval(this.timer);clearTimeout(this.hideTimer);for(const timer of this.sayTimers)clearTimeout(timer);this.sayTimers.clear();this.queuedVoice=null;this.pendingVoice=null;this.speechActive=false;this.speechSequence++;if("speechSynthesis"in window)window.speechSynthesis.cancel();this.panel.remove();}
}