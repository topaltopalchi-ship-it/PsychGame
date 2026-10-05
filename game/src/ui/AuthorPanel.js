import { SpecialistPanel } from "./SpecialistPanel.js";

export class AuthorPanel {
  constructor(session) {
    this.session = session;
    this.authorCode = "PSYCH-AUTHOR-2026";
    this.panel = null;
    this.specialistPanel = new SpecialistPanel(session);
    this.createPanel();
    this.hide();
  }

  createPanel() {
    this.panel = document.createElement("div");
    Object.assign(this.panel.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      width: "360px",
      maxHeight: "80vh",
      overflow: "auto",
      padding: "20px",
      background: "rgba(10,10,15,0.96)",
      color: "#ffffff",
      fontFamily: "Arial",
      direction: "rtl",
      zIndex: "9999",
      borderRadius: "12px",
      boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
    });
    this.panel.innerHTML = `<h2>پنل نویسنده</h2><p>دسترسی متخصص فعال است.</p><button id="openSpecialistPanel">باز کردن پنل متخصص</button> <button id="closeAuthorPanel">بستن</button>`;
    document.body.appendChild(this.panel);
    this.panel.querySelector("#closeAuthorPanel").addEventListener("click", () => this.hide());
    this.panel.querySelector("#openSpecialistPanel").addEventListener("click", () => {
      this.specialistPanel.open();
      this.hide();
    });
  }

  open(code) {
    if (code !== this.authorCode) return false;
    this.show();
    return true;
  }

  show() { this.panel.style.display = "block"; }
  hide() { this.panel.style.display = "none"; }
}
