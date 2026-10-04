export class Companion {
  constructor(tracker) {
    this.tracker = tracker;
    this.lastEventCount = 0;
    this.lastMessageAt = 0;
    this.buttonWarned = false;
    this.failureCommented = false;
    this.drawerCommented = false;
    this.createUI();
    this.say("خب... فکر کنم باید راه خروج رو پیدا کنیم.", 1600);
    this.timer = setInterval(() => this.observe(), 400);
  }

  createUI() {
    this.panel = document.createElement("div");
    this.panel.id = "pg-companion";
    this.panel.innerHTML = '<div id="pg-companion-name">همراه</div><div id="pg-companion-text"></div>';
    Object.assign(this.panel.style, {
      position:"fixed", left:"20px", bottom:"62px", width:"min(380px,calc(100vw - 40px))",
      padding:"14px 16px", borderRadius:"14px", background:"rgba(10,12,17,.78)",
      border:"1px solid rgba(255,255,255,.13)", backdropFilter:"blur(12px)",
      boxShadow:"0 12px 35px rgba(0,0,0,.35)", direction:"rtl",
      fontFamily:"Tahoma,Arial,sans-serif", color:"#eee", zIndex:"6000",
      opacity:"0", transform:"translateY(10px)", transition:"opacity .25s,transform .25s",
      pointerEvents:"none"
    });
    document.body.appendChild(this.panel);
    this.text = this.panel.querySelector("#pg-companion-text");
    const style = document.createElement("style");
    style.textContent = "#pg-companion-name{font-size:11px;color:#c58d7c;margin-bottom:5px}#pg-companion-text{font-size:14px;line-height:1.8}";
    document.head.appendChild(style);
  }

  say(message, delay = 0) {
    setTimeout(() => {
      this.text.textContent = message;
      this.panel.style.opacity = "1";
      this.panel.style.transform = "translateY(0)";
      clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => {
        this.panel.style.opacity = "0";
        this.panel.style.transform = "translateY(10px)";
      }, 5000);
    }, delay);
  }

  observe() {
    const events = this.tracker.getEvents();
    if (events.length <= this.lastEventCount) return;
    const fresh = events.slice(this.lastEventCount);
    this.lastEventCount = events.length;

    for (const e of fresh) {
      if (e.type === "RED_BUTTON_FIRST_SEEN" && !this.buttonWarned) {
        this.buttonWarned = true;
        this.say("اون رو دیدی؟ من جای تو بودم، دست بهش نمی‌زدم. 😏");
      }
      if (e.type === "FAILURE" && !this.failureCommented) {
        this.failureCommented = true;
        this.say("گفتم که... 😐 حالا باید یه راه دیگه پیدا کنیم.");
      }
      if (e.type === "RETRY_AFTER_FAILURE") {
        this.say("دوباره؟ خب... این بار خودت می‌دونی. 😶");
      }
      if (e.type === "DRAWER_INSPECTED" && !this.drawerCommented) {
        this.drawerCommented = true;
        this.say("بالاخره یه سرنخ پیدا کردیم. شاید کلید به کارمون بیاد.");
      }
      if (e.type === "DOOR_BLOCKED") {
        this.say("در قفل شده. بهتره اطراف رو دقیق‌تر بگردیم.");
      }
    }
  }

  destroy() {
    clearInterval(this.timer);
    clearTimeout(this.hideTimer);
    this.panel.remove();
  }
}
