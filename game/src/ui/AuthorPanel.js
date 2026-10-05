export class AuthorPanel {
  constructor(session) {
    this.session = session;

    this.authorCode =
      "PSYCH-AUTHOR-2026";

    this.panel = null;

    this.createPanel();

    this.hide();
  }

  createPanel() {
    this.panel =
      document.createElement("div");

    this.panel.style.position =
      "fixed";

    this.panel.style.top =
      "20px";

    this.panel.style.right =
      "20px";

    this.panel.style.width =
      "360px";

    this.panel.style.maxHeight =
      "80vh";

    this.panel.style.overflow =
      "auto";

    this.panel.style.padding =
      "20px";

    this.panel.style.background =
      "rgba(10,10,15,0.96)";

    this.panel.style.color =
      "#ffffff";

    this.panel.style.fontFamily =
      "Arial";

    this.panel.style.direction =
      "rtl";

    this.panel.style.zIndex =
      "9999";

    this.panel.style.borderRadius =
      "12px";

    this.panel.style.boxShadow =
      "0 10px 40px rgba(0,0,0,0.5)";

    this.panel.innerHTML = `
      <h2>پنل نویسنده</h2>

      <div id="authorContent">
        <p>در حال بارگذاری...</p>
      </div>

      <button id="closeAuthorPanel">
        بستن
      </button>
    `;

    document.body.appendChild(
      this.panel
    );

    document
      .getElementById(
        "closeAuthorPanel"
      )
      .addEventListener(
        "click",
        () => {
          this.hide();
        }
      );
  }

  open(code) {
    if (
      code !==
      this.authorCode
    ) {
      return false;
    }

    this.updateReport();

    this.show();

    return true;
  }

  updateReport() {
    const report =
      this.session.getReport();

    const analysis =
      report.analysis
        ?.indicators || {};

    const content =
      document.getElementById(
        "authorContent"
      );

    content.innerHTML = `
      <h3>اطلاعات Session</h3>

      <p>
        Player Code:
        ${report.playerCode}
      </p>

      <p>
        Session ID:
        ${report.sessionId}
      </p>

      <hr>

      <h3>شاخص‌های رفتاری</h3>

      <p>
        Exploration:
        ${analysis.exploration || "-"}
      </p>

      <p>
        Risk-taking:
        ${analysis.riskTaking || "-"}
      </p>

      <p>
        Persistence:
        ${analysis.persistence || "-"}
      </p>

      <p>
        Strategy change:
        ${analysis.strategyChange || "-"}
      </p>

      <p>
        Decision latency:
        ${analysis.decisionLatency || "-"}
      </p>

      <p>
        Help seeking:
        ${analysis.helpSeeking || "-"}
      </p>

      <hr>

      <h3>رویدادهای ثبت‌شده</h3>

      <p>
        تعداد رویدادها:
        ${report.events.length}
      </p>
    `;
  }

  show() {
    this.panel.style.display =
      "block";
  }

  hide() {
    this.panel.style.display =
      "none";
  }
}
