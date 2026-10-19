// Explainer pictures for lessons. Built from HTML + CSS (not image files) so every label
// follows the current language, wraps on small screens and respects dark mode.
// Each figure is referenced from data/map.json by a step's "figure" key.

export function figure(id, { u, money, num, esc }) {
  const L = (k, v) => esc(u(k, v));
  const make = FIGS[id];
  return make ? `<figure class="fig fig-${id}" aria-hidden="true">${make(L, money, num)}</figure>` : "";
}

const FIGS = {
  // Buy → bank pays → you repay; then the two outcomes.
  flow: (L, money) => `
    <div class="f-row">
      <div class="f-box"><span class="f-ico">🛒</span><b>${L("f_you_buy")}</b><span class="f-amt">${money(5000)}</span></div>
      <span class="f-arrow">→</span>
      <div class="f-box"><span class="f-ico">🏦</span><b>${L("f_bank_pays")}</b></div>
      <span class="f-arrow">→</span>
      <div class="f-box"><span class="f-ico">📅</span><b>${L("f_you_repay")}</b></div>
    </div>
    <div class="f-outcomes">
      <div class="f-ok">✅ ${L("f_full_ok")}</div>
      <div class="f-bad">❌ ${L("f_late_bad")}</div>
    </div>`,

  // Limit vs salary vs truly free money, drawn to scale.
  limitbars: (L, money) => {
    const bar = (label, v, cls, note = "") => `
      <div class="f-bar-row"><div class="f-bar-label">${label}</div>
        <div class="f-bar-track"><div class="f-bar ${cls}" style="width:${(v / 100000) * 100}%"><span>${money(v)}</span></div></div>
        ${note ? `<div class="f-bar-note">👉 ${note}</div>` : ""}</div>`;
    return bar(L("f_limit"), 100000, "dashed") + bar(L("f_salary"), 45000, "mid") + bar(L("f_free"), 12000, "good", L("f_free_note"));
  },

  // One card month as three coloured blocks.
  calendar: (L) => `
    <div class="f-cal">
      <div class="f-cal-seg buy" style="flex:30"><span class="f-ico">🛍️</span>${L("f_buy_days")}</div>
      <div class="f-cal-seg pay" style="flex:20"><span class="f-ico">✅</span>${L("f_pay_days")}</div>
      <div class="f-cal-seg late" style="flex:10"><span class="f-ico">⚠️</span>${L("f_interest_days")}</div>
    </div>
    <div class="f-cal-marks"><span style="left:50%">📄 ${L("bill_made")}</span><span style="left:83.3%">⏰ ${L("last_day")}</span></div>`,

  // A mock statement with the two amounts called out.
  bill: (L, money) => `
    <div class="f-bill">
      <div class="f-bill-head">💳 ${L("f_bill_head")}</div>
      <div class="f-bill-row good"><span>${L("f_bill_full")}</span><b>${money(50000)}</b><em>✅ ${L("f_pay_this")}</em></div>
      <div class="f-bill-row bad"><span>${L("f_bill_min")}</span><b>${money(2500)}</b><em>❌ ${L("f_trap")}</em></div>
      <div class="f-bill-row"><span>${L("f_bill_due")}</span><b>${L("f_bill_due_v")}</b></div>
    </div>`,

  // Bank money and card spending as mirror images.
  mirror: (L, money) => `
    <div class="f-row f-mirror">
      <div class="f-box"><span class="f-ico">🏦</span><b>${L("f_bank")}</b><span class="f-amt">${money(12000)}</span></div>
      <div class="f-eq"><span>=</span>${L("f_same")}</div>
      <div class="f-box"><span class="f-ico">💳</span><b>${L("f_card")}</b><span class="f-amt">${L("f_up_to", { x: money(12000) })}</span></div>
    </div>`,

  // Four doors, each leading to interest.
  doors: (L) => `
    <div class="f-grid4">
      ${[["🏧", "f_door_atm"], ["🧾", "f_door_emi"], ["🔁", "f_door_move"], ["⬇️", "f_door_min"]]
        .map(([i, k]) => `<div class="f-door"><span class="f-ico">${i}</span><b>${L(k)}</b><span class="f-tag-bad">❌ ${L("f_door_note")}</span></div>`).join("")}
    </div>`,

  // Savings jars filling step by step.
  jar: (L) => `
    <div class="f-row f-jars">
      ${[[25, "f_jar_1"], [50, "f_jar_2"], [100, "f_jar_3"]].map(([p, k]) => `
        <div class="f-jar-wrap"><div class="f-jar"><div class="f-jar-fill" style="height:${p}%"></div></div><b>${L(k)}</b></div>`).join("")}
    </div>`,

  // Moving income date vs fixed due date.
  rhythm: (L) => `
    <div class="f-row">
      <div class="f-box warn"><span class="f-ico">💰</span><b>${L("f_income")}</b><span>${L("f_income_v")}</span></div>
      <span class="f-arrow">≠</span>
      <div class="f-box"><span class="f-ico">📌</span><b>${L("f_due_fixed")}</b><span>${L("f_due_fixed_v")}</span></div>
    </div>`,

  // The limit jumps; the salary doesn't.
  limitup: (L, money) => {
    const row = (label, limit) => `
      <div class="f-bar-row"><div class="f-bar-label">${label}</div>
        <div class="f-bar-track"><div class="f-bar dashed" style="width:${(limit / 200000) * 100}%"><span>${money(limit)}</span></div></div>
        <div class="f-bar-track"><div class="f-bar good" style="width:${(45000 / 200000) * 100}%"><span>${money(45000)}</span></div></div></div>`;
    return `${row(L("f_before"), 50000)}${row(L("f_after"), 200000)}
      <div class="f-legend"><span><i class="sw-dash"></i>${L("f_limit")}</span><span><i class="sw-good"></i>${L("f_same_salary")}</span></div>`;
  },

  // Saving month by month, then buying outright.
  savefirst: (L, money, num) => `
    <div class="f-months">
      ${[1, 2, 3, 4, 5, 6].map((m) => `<div class="f-month"><span class="f-ico">🫙</span>${L("f_month_n", { n: num(m) })}</div>`).join("")}
      <span class="f-arrow">→</span>
      <div class="f-month big"><span class="f-ico">📱</span>${money(36000)}</div>
    </div>
    <div class="f-outcomes"><div class="f-ok">✅ ${L("f_save_month", { x: money(6000) })}. ${L("f_buy_cash")}</div></div>`,

  // A foreign card terminal asking which currency.
  dcc: (L) => `
    <div class="f-terminal">
      <div class="f-term-head">🏧 ${L("f_machine")}</div>
      <div class="f-term-q">${L("f_machine_q")}</div>
      <div class="f-term-btns">
        <div class="f-term-btn good">AED<small>✅ ${L("f_local")}</small></div>
        <div class="f-term-btn bad">BDT<small>❌ ${L("f_taka")}</small></div>
      </div>
    </div>`,

  // 1% points vs 25% interest, to scale.
  points: (L, money) => `
    <div class="f-bar-row"><div class="f-bar-label">🎁 ${L("f_points")}</div>
      <div class="f-bar-track"><div class="f-bar good" style="width:4%"></div><span class="f-bar-out">${money(100)}</span></div></div>
    <div class="f-bar-row"><div class="f-bar-label">⚠️ ${L("f_interest_year")}</div>
      <div class="f-bar-track"><div class="f-bar bad" style="width:100%"><span>${money(2500)}</span></div></div></div>`,

  // Debt getting smaller each month.
  stairs: (L, money, num) => `
    <div class="f-stairs">
      ${[40000, 30000, 20000, 10000, 0].map((v, i) => `
        <div class="f-step"><div class="f-step-bar ${v ? "" : "zero"}" style="height:${v ? (v / 40000) * 100 : 6}%"></div>
        <b>${v ? money(v) : `🎉 ${L("f_free_debt")}`}</b><span>${L("f_month_n", { n: num(i + 1) })}</span></div>`).join("")}
    </div>`,

  // Three interest-free alternatives.
  options: (L) => `
    <div class="f-grid3">
      <div class="f-door good"><span class="f-ico">💳</span><b>${L("f_opt_debit_t")}</b><span>${L("f_opt_debit")}</span><span class="f-tag-good">✅ ${L("f_no_interest")}</span></div>
      <div class="f-door good"><span class="f-ico">📲</span><b>${L("f_opt_prepaid_t")}</b><span>${L("f_opt_prepaid")}</span><span class="f-tag-good">✅ ${L("f_no_interest")}</span></div>
      <div class="f-door"><span class="f-ico">🕌</span><b>${L("f_opt_islamic")}</b><span>${L("f_opt_islamic_d")}</span></div>
    </div>`,
};
