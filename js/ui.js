/* =====================================================================
   THORNVALE CHRONICLES : ui.js
   Drawing the screen: the story log, choices, combat panel, character
   sheet tabs, and character creation.
   ===================================================================== */
'use strict';

/* =====================================================================
   5. INTERFACE
   ===================================================================== */
const logEl = $('log');
function appendLog(e){
  const el = document.createElement(e.c === 'scene' ? 'h2' : 'p');
  el.className = e.c;
  el.innerHTML = e.h;
  logEl.appendChild(el);
  logEl.scrollTop = logEl.scrollHeight;
}
function rebuildLog(){ logEl.innerHTML = ''; G.log.forEach(appendLog); }

let noticeTimer = null;
function notice(msg){
  const n = $('notice'); n.textContent = msg;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { n.textContent = ''; }, 3500);
}

function render(){
  const creating = G.mode === 'create';
  $('create').hidden = !creating;
  $('play').hidden = creating;
  if (creating){ renderCreate(); return; }
  const sc = STORY[G.scene];
  if (sc && sc.module) $('chapterLine').textContent = `One-shot · ${G.module ? G.module.title : 'Adventure'}`;
  else if (sc && typeof chapterLabel === 'function' && chapterLabel(sc)) $('chapterLine').textContent = chapterLabel(sc);
  else if (sc){ const n = sc.chapter || 1; $('chapterLine').textContent = `Chapter ${CH_WORD[n] || n} · ${CHAPTERS[n] || ''}${CHAPTER_LEVEL[n] ? ` · Suggested level ${CHAPTER_LEVEL[n]}` : ''}`; }
  if (sc && sc.reader && READER && G.module){
    $('whereName').textContent = READER.sections[G.module.idx] ? READER.sections[G.module.idx].title : G.module.title;
    $('whereArea').textContent = `Section ${G.module.idx + 1} of ${READER.sections.length}`;
  } else {
    $('whereName').textContent = sc ? sc.title : '';
    const areaName = sc ? (AREA_NAME[sc.area] || (ENCOUNTERS[sc.area] ? ENCOUNTERS[sc.area].name : '')) : '';
    const tbl = sc && ENCOUNTERS[sc.area];
    $('whereArea').textContent = areaName + (sc && (sc.city || sc.job) ? ` · Standing: ${repName()}` : '') + (tbl && tbl.alertName ? ` · ${tbl.alertName} ${Math.min(5, G.alert || 0)} of 5` : tbl && tbl.alert && G.alert ? ` · Noise ${G.alert}` : '');
  }
  renderStatus();
  renderChoices();
  renderGM();
  renderSheet();
  renderLibrary();
}

function hpBar(ch){
  const pct = clamp(ch.hp / ch.maxHp * 100, 0, 100);
  return `<div class="bar me${pct <= 35 ? ' low' : ''}"><i style="width:${pct}%"></i></div>`;
}
function renderStatus(){
  const ch = G.char;
  $('status').innerHTML = `
    <div><div style="display:flex;justify-content:space-between"><span>HP</span><b>${ch.hp}/${ch.maxHp}</b></div>${hpBar(ch)}</div>
    <div>AC <b>${ac()}</b></div>
    <div>${ch.slots ? `Slots <b>${ch.slots.left}/${ch.slots.max}</b>` : `Potions <b>${ch.inv.potion || 0}</b>`}</div>
    <div>Gold <b>${ch.gold}</b></div>${G.ally ? `<div>${esc(G.ally.name)} <b>${G.ally.hp}/${G.ally.max}</b></div>` : ''}`;
}

function btn(label, tag, fn, opts={}){
  return {label, tag, fn, ...opts};
}
let keyActions = [];
function renderChoices(){
  const box = $('choices'), cb = $('combat');
  keyActions = [];
  box.innerHTML = ''; cb.innerHTML = '';
  cb.hidden = G.mode !== 'combat';
  if (G.mode === 'combat'){ renderCombat(); return; }
  if (G.mode === 'explore' && G.shop && SHOPS[G.shop]){ renderShop(box); return; }
  if (G.mode === 'explore' && G.forge){ renderForge(box); return; }

  const list = [];
  if (G.mode === 'downed'){
    list.push(btn(`Roll a death saving throw`, `${G.down.s} ok · ${G.down.f} fail`, deathSave, {cls:'danger'}));
  } else if (G.mode === 'dead'){
    list.push(btn('Load your last save', null, () => { const s = readSave(); if (!loadState(s)) notice('No save found.'); }));
    list.push(btn('Create a new hero', null, newHero));
  } else if (G.choices){
    G.choices.filter(optionVisible).forEach(o => list.push(btn(resolveText(o.label), o.tag || (o.check ? tagFor(o.check) : null), () => chooseOption(o))));
  } else {
    const sc = STORY[G.scene];
    if (sc.reader && READER && G.module){
      const i = G.module.idx, secs = READER.sections;
      if (i < secs.length - 1) list.push(btn(`Read on: ${secs[i + 1].title}`, `${i + 2} of ${secs.length}`, () => { log('you', 'Read on'); showSection(i + 1); }));
      if (i > 0) list.push(btn(`Go back: ${secs[i - 1].title}`, null, () => { log('you', 'Go back'); showSection(i - 1); }));
      list.push(btn('Read this section again', null, () => showSection(i)));
    }
    sc.options.filter(optionVisible).forEach(o => list.push(btn(resolveText(o.label), o.tag || (o.check ? tagFor(o.check) : null), () => chooseOption(o))));
    const gen = [];
    if (G.captive && CAPTIVES[G.captive]) gen.push(btn(`Question your captive ${CAPTIVES[G.captive].name}`, 'Captive', () => {
      const id = G.captive; G.captive = null; log('you', `Question the captive ${esc(CAPTIVES[id].name)}`); resolve(CAPTIVES[id].talk);
    }, {general:true}));
    if (ENCOUNTERS[sc.area]) gen.push(btn('Explore the area', 'Random encounter', wander, {general:true}));
    if (G.job && JOBS[G.job.id]) gen.push(btn(`Quit the job: ${JOBS[G.job.id].title}`, 'No pay, no penalty', () => { log('you', 'Quit the job'); quitJob(); }, {general:true}));
    if (sc.rest === 'short' || sc.rest === 'both') gen.push(btn('Take a short rest', `Hit Dice ${G.char.hd.left}/${G.char.hd.max}`, shortRest, {general:true}));
    if (sc.rest === 'both') gen.push(btn('Take a long rest', 'Full recovery', longRest, {general:true}));
    if (!(G.module && G.module.reader)) gen.push(btn(ui.gm ? 'Hide the solo GM tools' : 'Open the solo GM tools', 'Checks, fights, rewards', () => { ui.gm = !ui.gm; render(); }, {general:true}));
    if (G.module) gen.push(btn(G.module.done ? 'Return to your campaign' : 'Leave this adventure', G.module.done ? 'Adventure complete' : 'Back to your campaign', leaveAdventure, {general:true}));
    if (gen.length){ list.push({sep:'Anywhere'}); list.push(...gen); }
  }
  let k = 0;
  list.forEach(o => {
    if (o.sep){ const s = document.createElement('div'); s.className = 'sep'; s.textContent = o.sep; box.appendChild(s); return; }
    k++;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice' + (o.general ? ' general' : '') + (o.cls ? ' ' + o.cls : '');
    b.innerHTML = `<span class="k">${k <= 9 ? k : ''}</span><span class="lbl">${esc(o.label)}</span>${o.tag ? `<span class="tag">${esc(o.tag)}</span>` : ''}`;
    b.addEventListener('click', o.fn);
    box.appendChild(b);
    keyActions.push(b);
  });
  if (G.mode === 'explore' && !G.choices && STORY[G.scene] && STORY[G.scene].reader && READER && READER.sections.length > 2){
    const j = document.createElement('div');
    j.className = 'jump';
    j.innerHTML = `<select id="jumpSel" aria-label="Jump to a section">${READER.sections.map((x, i) => `<option value="${i}" ${i === G.module.idx ? 'selected' : ''}>${i + 1}. ${esc(x.title)}</option>`).join('')}</select><button type="button" class="mini" id="jumpGo">Jump to section</button>`;
    box.appendChild(j);
    $('jumpGo').addEventListener('click', () => { const i = +$('jumpSel').value; log('you', `Turn to ${esc(READER.sections[i].title)}`); showSection(i); });
  }
}
function tagFor(ch){
  const info = checkInfo(ch);
  if (ch.contest) return `${info.tag} contest`;
  if (ch.vsFoes) return `${info.tag} vs Perception ${foesPP(ch.vsFoes)}`;
  return `${info.tag} DC ${typeof ch.dc === 'function' ? ch.dc(G) : ch.dc}`;
}

function renderCombat(){
  const c = G.combat, cb = $('combat'), ch = G.char;
  target();
  const chips = [];
  chips.push(`<span>Round ${c.round} · Your turn</span>`);
  if (c.hidden) chips.push(`<span class="chip on">Hidden</span>`);
  if (c.extra) chips.push(`<span class="chip on">Action Surge</span>`);
  chips.push(`<span class="chip${c.bonusUsed ? '' : ' on'}">Bonus action ${c.bonusUsed ? 'used' : 'ready'}</span>`);
  if (ch.insp) chips.push(`<span class="chip on">Inspired</span>`);
  if (alive().some(f => f.m.type === 'humanoid')) chips.push(`<button type="button" class="mini subdue" id="subdueBtn" aria-pressed="${c.subdue}">Strike to subdue: ${c.subdue ? 'on' : 'off'}</button>`);
  let html = `<div class="turnbar">${chips.join('')}</div><div class="foes">`;
  if (G.ally){
    const pct = clamp(G.ally.hp / G.ally.max * 100, 0, 100);
    html += `<div class="foe ally"><span class="fn">${esc(G.ally.name)} <span>AC ${ALLIES[G.ally.key].ac}</span></span><div class="bar me${pct <= 35 ? ' low' : ''}"><i style="width:${pct}%"></i></div><span class="fn"><span>${G.ally.hp}/${G.ally.max} HP · ${G.ally.hp <= 0 ? 'down' : ALLIES[G.ally.key].heal ? `heals you at half HP (${G.ally.heals || 0} left), otherwise attacks` : `attacks your target${ALLIES[G.ally.key].multi ? ' twice' : ''}`}</span></span></div>`;
  }
  c.foes.forEach((f, i) => {
    const down = f.hp <= 0 || f.st.turned || f.st.fled;
    const sts = [];
    if (f.st.asleep) sts.push('Asleep');
    if (f.st.hidden) sts.push('In cover');
    if (f.st.marked) sts.push('Glowing');
    if (f.st.prone) sts.push('Prone');
    if (f.st.turned || f.st.fled) sts.push('Fled');
    if (f.st.subdued) sts.push('Knocked out');
    else if (f.hp <= 0) sts.push('Defeated');
    html += `<button type="button" class="foe${down ? ' down' : ''}" data-foe="${i}" aria-pressed="${!down && i === c.target}" ${down ? 'disabled' : ''}>
      <span class="fn">${esc(f.name)} <span>AC ${f.ac}</span></span>
      <div class="bar hp"><i style="width:${clamp(f.hp / f.max * 100, 0, 100)}%"></i></div>
      <span class="fn"><span>${f.hp}/${f.max} HP</span></span>
      ${sts.length ? `<div class="sts">${sts.map(s => `<span class="chip">${s}</span>`).join('')}</div>` : ''}
    </button>`;
  });
  html += `</div>`;

  const groups = [];
  const attacks = weapons().map((w, i) => ({label:w.name, sub:`${sgn(atkBonus(w))} to hit · ${w.dmg}${sgn(wAbil(w) + (w.bonus || 0))}${w.prof ? '' : ' · not proficient'}`, fn:() => playerAttack(i)}));
  groups.push(['Attack', attacks]);
  const c2 = cls(), known = knownSpells();
  if (c2.cast){
    const magic = [];
    const blocked = !armorTrained();
    known.cantrips.forEach(id => magic.push({label:SPELLS[id].name, sub:blocked ? 'Blocked by untrained armor' : 'Cantrip · ' + SPELLS[id].desc.split('.')[0], fn:() => castSpell(id), cls:'magic', off:blocked}));
    known.spells.forEach(id => {
      magic.push({label:SPELLS[id].name, sub:blocked ? 'Blocked by untrained armor' : `1 slot (${ch.slots.left} left)`, fn:() => castSpell(id), cls:'magic', off:ch.slots.left <= 0 || blocked});
      if (SPELLS[id].kind === 'heal' && G.ally && G.ally.hp < G.ally.max) magic.push({label:`${SPELLS[id].name} on ${G.ally.name}`, sub:`1 slot · can revive a downed companion`, fn:() => castSpell(id, true), cls:'magic', off:ch.slots.left <= 0 || blocked});
    });
    groups.push(['Spells', magic]);
  }
  const other = [];
  if (hasFeat('secondWind')) other.push({label:'Second Wind', sub:`Bonus · heal 1d10+${ch.level} · ${ch.uses.secondWind || 0} left`, fn:secondWind, cls:'bonus', off:!ch.uses.secondWind || c.bonusUsed || ch.hp >= ch.maxHp});
  if (hasFeat('actionSurge')) other.push({label:'Action Surge', sub:`Free · act twice · ${ch.uses.actionSurge || 0} left`, fn:actionSurge, cls:'bonus', off:!ch.uses.actionSurge || c.surged});
  if (hasFeat('turnUndead')) other.push({label:'Turn Undead', sub:`Undead flee on a failed save · ${ch.uses.turnUndead || 0} left`, fn:turnUndead, off:!ch.uses.turnUndead || !alive().some(f => f.m.type === 'undead')});
  const cunning = hasFeat('cunningAction');
  other.push({label:'Hide', sub:(cunning ? 'Bonus · ' : '') + 'Stealth vs their Perception; next attack has advantage', fn:hideAction, cls:cunning ? 'bonus' : '', off:cunning && c.bonusUsed});
  other.push({label:'Dodge', sub:'Attacks on you have disadvantage', fn:dodgeAction});
  const fast = hasFeat('fastHands');
  Object.keys(ch.inv).filter(id => ITEMS[id] && ITEMS[id].use && ch.inv[id] > 0 && !(ITEMS[id].use === 'escape' && c.cfg.noFlee)).forEach(id => {
    if (ITEMS[id].use === 'scroll'){
      other.push({label:ITEMS[id].name, sub:`Use · ${SPELLS[ITEMS[id].spell] ? SPELLS[ITEMS[id].spell].desc.split('.')[0] : ''} · ${ch.inv[id]} left`, fn:() => itemAction(id), cls:'magic'});
      return;
    }
    other.push({label:ITEMS[id].name, sub:`${fast ? 'Bonus' : 'Use'} · ${ch.inv[id]} left`, fn:() => itemAction(id), cls:fast ? 'bonus' : '', off:fast && c.bonusUsed});
    if (ITEMS[id].use === 'heal' && G.ally && G.ally.hp < G.ally.max) other.push({label:`Give ${G.ally.name} a ${ITEMS[id].name}`, sub:`${fast ? 'Bonus' : 'Use'} · revives ${pron(ALLIES[G.ally.key], 'o')} if down`, fn:() => itemAction(id, true), cls:fast ? 'bonus' : '', off:fast && c.bonusUsed});
  });
  if (!c.cfg.noFlee) other.push({label:'Flee', sub:`Athletics or Acrobatics DC ${10 + alive().length}`, fn:fleeAction});
  groups.push(['Other', other]);

  let k = 0;
  const acts = [];
  groups.forEach(([name, list]) => {
    html += `<div class="agroup"><h4>${name}</h4><div class="actions">`;
    list.forEach(a => {
      k++;
      acts.push(a);
      html += `<button type="button" class="act ${a.cls || ''}" data-act="${acts.length - 1}" ${a.off ? 'disabled' : ''}><span class="k">${k <= 9 ? k : ''}</span><span class="t"><b>${esc(a.label)}</b><small>${esc(a.sub)}</small></span></button>`;
    });
    html += `</div></div>`;
  });
  cb.innerHTML = html;
  cb.querySelectorAll('[data-foe]').forEach(b => b.addEventListener('click', () => { c.target = +b.dataset.foe; render(); }));
  const sb = $('subdueBtn');
  if (sb) sb.addEventListener('click', () => { c.subdue = !c.subdue; log('sys', c.subdue ? 'You will strike to knock out, not kill. Melee blows that drop a humanoid leave it unconscious.' : 'You fight to kill.'); render(); });
  cb.querySelectorAll('[data-act]').forEach(b => { b.addEventListener('click', () => acts[+b.dataset.act].fn()); keyActions.push(b); });
}

/* ---------- sheet ---------- */
function sheetCore(ch, preview){
  const race = RACES[ch.race], c = CLASSES[ch.cls], bg = BACKGROUNDS[ch.bg];
  let h = `<div class="idc"><div class="nm">${esc(ch.name || 'Nameless')}</div><div class="sub">Level ${ch.level} ${esc(ch.raceName || race.name)} ${c.name} · ${bg.name}</div></div>`;
  h += `<div class="hpbox"><div class="top2"><span class="lbl2">Hit points</span><span><b>${ch.hp}</b> / ${ch.maxHp}</span></div>${hpBar(ch)}</div>`;
  h += `<div class="vitals">
    <div class="vbox"><div class="v">${ac(ch)}</div><div class="l">Armor</div></div>
    <div class="vbox"><div class="v">${sgn(am('dex', ch))}</div><div class="l">Init</div></div>
    <div class="vbox"><div class="v">${race.speed}</div><div class="l">Speed</div></div>
    <div class="vbox"><div class="v">${sgn(prof(ch))}</div><div class="l">Prof</div></div></div>`;
  if (!preview){
    const next = XP_NEXT[ch.level];
    h += `<div class="meta"><span>Hit Dice <b>${ch.hd.left}/${ch.hd.max} d${c.hd}</b></span><span>XP <b>${ch.xp}${next ? ' / ' + next : ''}</b></span><span>Inspiration <b>${ch.insp ? 'Yes' : 'No'}</b></span></div>`;
  }
  h += `<div class="abils">` + ABILS.map(a => `<div class="ab" title="${ABIL_NAME[a]}${c.saves.includes(a) ? ', proficient saving throw' : ''}"><span class="sv${c.saves.includes(a) ? ' p' : ''}"></span><div class="l">${a.toUpperCase()}</div><div class="m">${sgn(am(a, ch))}</div><div class="s">${ch.abil[a]}</div></div>`).join('') + `</div>`;
  h += `<div class="sh"><h4>Attacks <span>${esc(armorLabel(ch))}</span></h4>${armorTrained(ch) ? '' : '<p class="warnbox">Untrained armor: disadvantage on Strength and Dexterity rolls, and no spellcasting.</p>'}<table class="tbl">` +
    weapons(ch).map(w => `<tr><td>${w.name}${w.note ? `<br><span style="font-size:12px;color:${w.prof ? 'var(--muted)' : 'var(--blood)'}">${w.note}</span>` : ''}</td><td class="n">${sgn(atkBonus(w, ch))}</td><td class="n">${w.dmg}${sgn(wAbil(w, ch) + (w.bonus || 0))} ${w.type}</td></tr>`).join('') + `</table></div>`;
  if (c.cast){
    const slots = ch.slots;
    h += `<div class="sh"><h4>Spells <span>DC ${spellDC(ch)} · ${sgn(spellAtk(ch))} to hit</span></h4>`;
    h += `<div class="meta" style="margin-bottom:4px"><span>Level 1 slots</span><span class="pips">${Array.from({length:slots.max}, (_, i) => `<i class="pip${i < slots.left ? ' on' : ''}"></i>`).join('')}</span></div>`;
    const kn = knownSpells(ch);
    [...kn.cantrips, ...kn.spells].forEach(id => {
      const sp = SPELLS[id];
      const castBtn = !preview && sp.kind === 'heal' ? `<button type="button" class="mini" data-cast="${id}" ${G.mode !== 'explore' || slots.left <= 0 || ch.hp >= ch.maxHp ? 'disabled' : ''}>Cast</button>` : '';
      h += `<div class="feat"><div class="ft"><span>${sp.name} <span style="font:12px var(--mono);color:var(--muted)">${sp.level ? 'Level 1' : 'Cantrip'}</span></span>${castBtn}</div><p>${sp.desc}</p></div>`;
    });
    h += `</div>`;
  }
  h += `<div class="sh"><h4>Features and traits</h4>`;
  featureList(ch).forEach(k => {
    const f = FEATURES[k];
    let right = '';
    if (f.uses) right = `<span class="pips">${Array.from({length:f.uses}, (_, i) => `<i class="pip${i < (ch.uses[k] || 0) ? ' on' : ''}"></i>`).join('')}</span>`;
    if (!preview && k === 'secondWind') right = `<span class="row" style="gap:8px">${right}<button type="button" class="mini" data-sw="1" ${G.mode !== 'explore' || !ch.uses.secondWind || ch.hp >= ch.maxHp ? 'disabled' : ''}>Use</button></span>`;
    h += `<div class="feat"><div class="ft"><span>${f.name}</span>${right}</div><p>${f.desc}</p></div>`;
  });
  race.traits.forEach(([n, t]) => { h += `<div class="feat"><div class="ft"><span>${n}</span></div><p>${t}</p></div>`; });
  h += `</div>`;
  h += `<div class="sh"><h4>Skills</h4><div class="skills">` + Object.keys(SKILLS).map(k => {
    const p = ch.skills.includes(k), e = ch.expertise.includes(k);
    return `<div class="sk${p ? ' p' : ''}${e ? ' e' : ''}"><span><i class="d"></i>${SKILLS[k][0]}</span><span class="n">${sgn(skillMod(k, ch))}</span></div>`;
  }).join('') + `</div><p class="small">Passive Perception ${10 + skillMod('perception', ch)}</p></div>`;
  return h;
}
function companionHTML(){
  if (!G.ally) return '';
  const a = ALLIES[G.ally.key], hurt = G.ally.hp < G.ally.max, ok = G.mode === 'explore';
  const cure = cls().cast ? knownSpells().spells.find(id => SPELLS[id].kind === 'heal') : null;
  const pct = clamp(G.ally.hp / G.ally.max * 100, 0, 100);
  return `<div class="comp"><div class="ct"><b>${esc(G.ally.name)}</b><span class="lbl2">Companion · ${a.kind}</span></div>
    <div class="hpbox"><div class="top2"><span class="lbl2">Hit points</span><span><b>${G.ally.hp}</b> / ${G.ally.max}</span></div><div class="bar me${pct <= 35 ? ' low' : ''}"><i style="width:${pct}%"></i></div></div>
    <div class="meta"><span>AC <b>${a.ac}</b></span><span>${a.attack.name} <b>${sgn(a.attack.toHit)}</b>, ${a.attack.dmg} ${a.attack.type}${a.multi ? `, ${a.multi} times a turn` : ''}</span>${a.heal ? `<span>${a.heal.name} <b>${G.ally.heals || 0}</b> of ${a.heal.uses}</span>` : ''}</div>
    <p>${a.desc} A short rest restores ${pron(a, 'o')} fully.</p>
    ${a.heal && G.char.hp < G.char.maxHp && (G.ally.heals || 0) > 0 && G.ally.hp > 0 ? `<div class="row"><button type="button" class="mini" data-ally-heal="1" ${ok ? '' : 'disabled'}>Ask ${esc(G.ally.name)} to heal you</button></div>` : ''}
    ${hurt ? `<div class="row">${has('potion') ? `<button type="button" class="mini" data-ally-potion="1" ${ok ? '' : 'disabled'}>Give ${pron(a, 'o')} a potion</button>` : ''}${cure ? `<button type="button" class="mini" data-ally-cure="${cure}" ${ok && G.char.slots.left > 0 ? '' : 'disabled'}>Cast ${SPELLS[cure].name} on ${pron(a, 'o')}</button>` : ''}</div>` : ''}
  </div>`;
}
function renderSheet(){
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === ui.tab)));
  const p = $('pane'), ch = G.char;
  if (ui.tab === 'sheet'){
    p.innerHTML = companionHTML() + sheetCore(ch, false);
    p.querySelectorAll('[data-ally-potion]').forEach(b => b.addEventListener('click', () => { log('you', `Give ${esc(G.ally.name)} a potion`); useItem('potion', true); render(); autosave(); }));
    p.querySelectorAll('[data-ally-cure]').forEach(b => b.addEventListener('click', () => castOutside(b.dataset.allyCure, true)));
    p.querySelectorAll('[data-ally-heal]').forEach(b => b.addEventListener('click', () => {
      const a = ALLIES[G.ally.key]; G.ally.heals--;
      log('you', `Ask ${esc(G.ally.name)} for healing`);
      heal(a.heal.dice, `${esc(G.ally.name)} casts ${a.heal.name}`);
      render(); autosave();
    }));
    p.querySelectorAll('[data-cast]').forEach(b => b.addEventListener('click', () => castOutside(b.dataset.cast)));
    p.querySelectorAll('[data-sw]').forEach(b => b.addEventListener('click', () => { log('you', 'Use Second Wind'); secondWind(); }));
  } else if (ui.tab === 'pack'){
    const e = equipOf(), ok = G.mode === 'explore';
    let h = `<div class="row" style="justify-content:space-between"><div><span class="lbl2">Coin purse</span><div class="gold">${ch.gold} gp</div></div><div style="text-align:right"><span class="lbl2">Armor Class</span><div class="gold" style="color:var(--ink)">${ac()}</div></div></div>`;
    if (!armorTrained()) h += `<p class="warnbox">You are wearing armor you are not trained in: disadvantage on Strength and Dexterity rolls, and you cannot cast spells.</p>`;
    const ids = Object.keys(ch.inv).filter(id => ch.inv[id] > 0 && ITEMS[id]);
    const groups = [
      ['Weapons', ids.filter(id => ITEMS[id].kind === 'weapon'), 'Ready up to three. Ready weapons are your attacks.'],
      ['Armor and shields', ids.filter(id => ITEMS[id].kind === 'armor' || ITEMS[id].kind === 'shield'), ''],
      ['Supplies', ids.filter(id => !ITEMS[id].kind && !ITEMS[id].quest), ''],
      ['Quest items', ids.filter(id => ITEMS[id].quest), '']
    ];
    groups.forEach(([name, list, hint]) => {
      if (!list.length) return;
      h += `<div class="sh"><h4>${name}${hint ? ` <span>${hint}</span>` : ''}</h4>`;
      list.forEach(id => {
        const it = ITEMS[id];
        let chips = '', act = '';
        if (it.kind === 'weapon'){
          const on = e.weapons.includes(id);
          if (on) chips += ' <span class="chip on">Ready</span>';
          if (!profWeapon(id)) chips += ' <span class="chip warn">Not proficient</span>';
          act = `<button type="button" class="mini" data-wpn="${id}" ${ok ? '' : 'disabled'}>${on ? 'Stow' : 'Ready'}</button>`;
        } else if (it.kind === 'armor'){
          const on = e.armor === id;
          if (on) chips += ' <span class="chip on">Worn</span>';
          if (!cls().prof.armor.includes(it.armor)) chips += ' <span class="chip warn">Untrained</span>';
          act = `<button type="button" class="mini" data-arm="${id}" ${ok ? '' : 'disabled'}>${on ? 'Take off' : 'Wear'}</button>`;
        } else if (it.kind === 'shield'){
          const on = shieldOn();
          if (on) chips += ' <span class="chip on">Carried</span>';
          if (!cls().prof.armor.includes('shield')) chips += ' <span class="chip warn">Untrained</span>';
          act = `<button type="button" class="mini" data-shd="1" ${ok ? '' : 'disabled'}>${on ? 'Take off' : 'Strap on'}</button>`;
        } else if (it.use){
          const can = ok && !(it.use === 'heal' && ch.hp >= ch.maxHp) && !(it.use === 'insp' && ch.insp) && it.use !== 'escape' && !(it.use === 'scroll' && !(SPELLS[it.spell] && SPELLS[it.spell].kind === 'heal' && ch.hp < ch.maxHp));
          act = `<button type="button" class="mini" data-use="${id}" ${can ? '' : 'disabled'}>Use</button>`;
        }
        if (it.quest) chips += ' <span class="chip">Quest</span>';
        h += `<div class="item"><div class="it"><b>${esc(it.name)}</b>${ch.inv[id] > 1 ? ` <span style="font:13px var(--mono);color:var(--muted)">x${ch.inv[id]}</span>` : ''}${chips}<p>${esc(it.desc)}</p></div>${act}</div>`;
      });
      h += `</div>`;
    });
    h += `<p class="small">${ok ? 'Change weapons and armor here between fights. Shops buy and sell gear.' : 'You cannot change equipment in the middle of a fight. Use items from your combat actions.'}</p>`;
    p.innerHTML = h;
    p.querySelectorAll('[data-use]').forEach(b => b.addEventListener('click', () => { log('you', `Use ${esc(ITEMS[b.dataset.use].name)}`); useItem(b.dataset.use); render(); autosave(); }));
    p.querySelectorAll('[data-wpn]').forEach(b => b.addEventListener('click', () => toggleWeapon(b.dataset.wpn)));
    p.querySelectorAll('[data-arm]').forEach(b => b.addEventListener('click', () => wearArmor(b.dataset.arm)));
    p.querySelectorAll('[data-shd]').forEach(b => b.addEventListener('click', toggleShield));
  } else if (ui.tab === 'map'){
    renderMapPane(p);
  } else if (ui.tab === 'journal'){
    const st = ch.story || {};
    let h = `<div class="sh"><h4>Your story <button type="button" class="mini" id="stEdit" ${G.mode === 'create' ? 'disabled' : ''}>${ui.editStory ? 'Cancel' : 'Edit'}</button></h4>`;
    h += ui.editStory ? `<div class="fgrid" style="grid-template-columns:1fr">${storyFormHTML(st, 'st')}</div><div class="row" style="margin-top:8px"><button type="button" class="ghost" id="stSave">Save story</button></div>` : storyViewHTML(st);
    h += `</div><div class="sh"><h4>Quests</h4>`;
    JOURNAL.filter(q => q.shown(G)).forEach(q => { const done = q.done(G); h += `<div class="quest${done ? ' done' : ''}"><span class="box"></span><span>${typeof q.text === 'function' ? q.text(G) : q.text}</span></div>`; });
    h += `</div><div class="sh"><h4>Things you have learned</h4>`;
    const lore = LORE.filter(l => l.when(G));
    h += lore.length ? lore.map(l => `<p class="lore">${l.text}</p>`).join('') : `<p class="empty">Nothing yet. Ask questions, read walls, listen at doors.</p>`;
    h += `</div><div class="sh"><h4>Progress</h4><div class="meta"><span>Places visited <b>${Object.keys(G.visits).length}</b></span><span>Noise <b>${G.alert}</b></span><span>Standing in Aldermere <b>${repName()} (${G.rep || 0})</b></span><span>Jobs done <b>${jobsDone()}</b></span></div>
      <label class="ck" style="margin-top:8px"><input type="checkbox" id="scaleToggle" ${G.scaling === false ? '' : 'checked'}> Scale fights to my level</label>
      <p class="small" style="margin:4px 0 0">Each chapter has a suggested level. With scaling on, foes get tougher when you are above it and a little weaker when you are below it.</p></div>`;
    p.innerHTML = h;
    $('stEdit').addEventListener('click', () => { ui.editStory = !ui.editStory; renderSheet(); });
    $('scaleToggle').addEventListener('change', e => { G.scaling = e.target.checked; notice(G.scaling ? 'Fights will scale to your level.' : 'Fights will use their written difficulty.'); autosave(); });
    if (ui.editStory){
      $('stFile').addEventListener('change', async e => {
        const f = e.target.files[0]; e.target.value = '';
        if (!f) return;
        try { $('stText').value = (await readTextFile(f)).slice(0, 20000); notice('Backstory loaded. Press Save story to keep it.'); } catch (err){ notice(err.message); }
      });
      $('stSave').addEventListener('click', () => {
        ch.story = Object.assign(ch.story || {}, {text:$('stText').value.slice(0, 20000)});
        STORY_FIELDS.forEach(([k]) => { ch.story[k] = $('st_' + k).value.slice(0, 200); });
        ui.editStory = false; notice('Story saved.'); renderSheet(); autosave();
      });
    }
  } else {
    let h = `<div class="sh"><h4>Dice tray <span>For your own table rolls</span></h4><div class="dice">` +
      ['d4','d6','d8','d10','d12','d20','2d20 adv','d100'].map(x => `<button type="button" class="die" data-die="${x}">${x === '2d20 adv' ? 'Adv' : x}</button>`).join('') + `</div></div>`;
    h += `<div class="dhist">` + (ui.diceHist.length ? ui.diceHist.map(x => `<div>${x}</div>`).join('') : `<p class="empty">Rolls you make here show up in this list. The game rolls its own dice in the story log.</p>`) + `</div>`;
    p.innerHTML = h;
    p.querySelectorAll('[data-die]').forEach(b => b.addEventListener('click', () => {
      const x = b.dataset.die;
      let line;
      if (x === '2d20 adv'){ const a = d(20), c2 = d(20); line = `Advantage: ${a}, ${c2} → <b>${Math.max(a, c2)}</b>`; }
      else { const s = +x.slice(1); line = `${x} → <b>${d(s)}</b>`; }
      ui.diceHist.unshift(line); ui.diceHist = ui.diceHist.slice(0, 14);
      renderSheet();
    }));
  }
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => { ui.tab = t.dataset.tab; renderSheet(); }));

/* ---------- character creation ---------- */
const C = {name:'', race:'human', cls:'fighter', bg:'soldier', method:'array', pool:[...STANDARD_ARRAY], rolls:null, assign:{}, sel:null,
  story:{text:'', trait:'', ideal:'', bond:'', flaw:''}, fixed:null, imp:null, impReport:'', raceName:null};
function assignByPriority(){
  const sorted = [...C.pool].sort((a, b) => b - a);
  CLASSES[C.cls].priority.forEach((a, i) => C.assign[a] = sorted[i]);
}
function roll4d6(){
  C.rolls = Array.from({length:6}, () => {
    const r = [d(6), d(6), d(6), d(6)].sort((a, b) => b - a);
    return {dice:r, total:r[0] + r[1] + r[2]};
  });
  C.pool = C.rolls.map(r => r.total);
}
function newHero(){
  G = freshGame();
  clearModule();
  if (C.race === 'other') C.race = 'human';
  C.name = pick(NAMES[C.race]);
  C.sel = null; C.fixed = null; C.imp = null; C.impReport = ''; C.raceName = null; C.startCh = 1; C.startLevel = 1;
  C.story = {text:'', trait:'', ideal:'', bond:'', flaw:''};
  assignByPriority();
  logEl.innerHTML = '';
  render();
  fillCreateInputs();
}
function fillCreateInputs(){
  const n = $('heroName'); if (n) n.value = C.name;
  if ($('cStText')) $('cStText').value = C.story.text || '';
  STORY_FIELDS.forEach(([k]) => { if ($('cSt_' + k)) $('cSt_' + k).value = C.story[k] || ''; });
}
function renderCreate(){
  const root = $('create');
  if (!root.dataset.built){
    root.dataset.built = '1';
    root.innerHTML = `
      <div class="steps">
        <p class="intro">Up the Thornvale, the village of Bramblewick is sick, and the medicine is waiting on the docks at Greywater. Make your hero, then take the job. <em>Every roll is real:</em> the game rolls the dice in the open, using the 5th edition core rules.</p>
        <section class="panel step"><h3>Import a character sheet <span class="opt">optional</span></h3>
          <p class="small" style="margin:0 0 10px">Already have a hero? Load a fillable 5e character sheet PDF (the official form, or one you filled in on your computer). Scanned sheets cannot be read. The file stays on your device.</p>
          <div class="row"><label class="ghost filebtn">Choose a PDF<input type="file" id="pdfIn" accept="application/pdf,.pdf" hidden></label><button type="button" class="mini" id="impClear" hidden>Clear the import</button></div>
          <div id="impReport" style="margin-top:10px;display:flex;flex-direction:column;gap:8px"></div>
        </section>
        <section class="panel step"><h3><span class="n">1</span>Name your hero</h3>
          <div class="namerow"><input id="heroName" type="text" maxlength="32" autocomplete="off" aria-label="Hero name"><button type="button" class="ghost" id="nameRoll">Random name</button></div>
        </section>
        <section class="panel step"><h3><span class="n">2</span>Choose a people</h3><div class="cards" id="cRace"></div></section>
        <section class="panel step"><h3><span class="n">3</span>Choose a class</h3><div class="cards" id="cClass"></div></section>
        <section class="panel step"><h3><span class="n">4</span>Choose a background</h3><div class="cards" id="cBg"></div></section>
        <section class="panel step"><h3><span class="n">5</span>Ability scores</h3>
          <div class="row"><div class="seg" id="cMethod"><button type="button" data-m="array">Standard array</button><button type="button" data-m="roll">Roll 4d6, drop lowest</button></div><button type="button" class="ghost" id="cReroll">Roll again</button></div>
          <div class="scores" id="cScores"></div>
          <p class="small" id="cScoreNote">Scores are placed for your class automatically. Click one score and then another to swap them. The gold number is your people's bonus.</p>
        </section>
        <section class="panel step"><h3><span class="n">6</span>Your story <span class="opt">optional</span></h3>
          <div class="fgrid" style="grid-template-columns:1fr">${storyFormHTML(C.story, 'cSt')}</div>
        </section>
      </div>
      <aside class="preview">
        <div class="panel" id="cPreview" style="display:flex;flex-direction:column;gap:14px"></div>
        <div class="panel" style="display:flex;flex-direction:column;gap:8px">
          <span class="lbl2">Where to start</span>
          <div class="seg" id="cStart">${Object.keys(CHAPTER_START).filter(n => /^\d+$/.test(n)).map(n => `<button type="button" data-ch="${n}">Chapter ${CH_WORD[n]}</button>`).join('')}<button type="button" data-ch="city">Aldermere</button></div>
          <p class="small" id="cStartNote" style="margin:0"></p>
        </div>
        <button type="button" class="go" id="cBegin">Begin the adventure</button>
        <button type="button" class="ghost" id="cContinue" hidden>Continue saved adventure</button>
      </aside>`;
    $('heroName').value = C.name;
    $('heroName').addEventListener('input', e => { C.name = e.target.value; renderPreview(); });
    $('nameRoll').addEventListener('click', () => { C.name = pick(NAMES[C.race]); $('heroName').value = C.name; renderPreview(); });
    $('cMethod').addEventListener('click', e => {
      const m = e.target.dataset.m; if (!m) return;
      C.method = m;
      if (m === 'array'){ C.pool = [...STANDARD_ARRAY]; C.rolls = null; } else roll4d6();
      C.sel = null; assignByPriority(); renderCreate();
    });
    $('cReroll').addEventListener('click', () => { roll4d6(); C.sel = null; assignByPriority(); renderCreate(); });
    $('cBegin').addEventListener('click', begin);
    $('cStart').addEventListener('click', e => {
      const raw = e.target.dataset.ch; if (!raw) return;
      const n = raw === 'city' ? 'city' : +raw;
      C.startCh = n; C.startLevel = CHAPTER_LEVEL[n] || 1;
      renderCreate();
    });
    $('cStText').addEventListener('input', e => { C.story.text = e.target.value.slice(0, 20000); });
    STORY_FIELDS.forEach(([k]) => $('cSt_' + k).addEventListener('input', e => { C.story[k] = e.target.value.slice(0, 200); }));
    $('cStFile').addEventListener('change', async e => {
      const f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      try { C.story.text = (await readTextFile(f)).slice(0, 20000); $('cStText').value = C.story.text; notice('Backstory loaded.'); } catch (err){ notice(err.message); }
    });
    $('impClear').addEventListener('click', () => { clearImport(); renderCreate(); fillCreateInputs(); notice('Import cleared.'); });
    $('pdfIn').addEventListener('change', async e => {
      const f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      $('impReport').innerHTML = '<p class="small" style="margin:0">Reading your sheet...</p>';
      try {
        const fields = await readPdfFields(await f.arrayBuffer());
        if (!Object.keys(fields).length){ C.impReport = '<p class="warnbox">This PDF has no fillable fields I can read. It may be scanned or flattened. Please build your hero by hand.</p>'; renderCreate(); return; }
        applyImport(mapSheet(fields));
        renderCreate(); fillCreateInputs();
        notice('Character sheet imported. Check the details below.');
      } catch (err){ C.impReport = `<p class="warnbox">${esc(err.message || 'I could not read that PDF.')}</p>`; renderCreate(); }
    });
    $('cContinue').addEventListener('click', () => { if (!loadState(readSave())) notice('No save found.'); });
  }
  const cards = (obj, key, extra) => Object.entries(obj).filter(([k, v]) => !v.hidden || C[key] === k).map(([k, v]) => `<button type="button" class="card" data-k="${k}" aria-pressed="${C[key] === k}"><b>${k === 'other' && C.raceName ? esc(C.raceName) : v.name}</b>${extra(v) ? `<span class="bn">${extra(v)}</span>` : ''}<p>${v.desc}</p></button>`).join('');
  $('cRace').innerHTML = cards(RACES, 'race', v => Object.entries(v.bonus).map(([a, n]) => `${a.toUpperCase()} +${n}`).join(' '));
  $('cClass').innerHTML = cards(CLASSES, 'cls', v => `Hit die d${v.hd} · ${v.priority[0].toUpperCase()}`);
  $('cBg').innerHTML = cards(BACKGROUNDS, 'bg', v => v.skills.map(s => SKILLS[s][0]).join(', '));
  $('cRace').querySelectorAll('.card').forEach(b => b.addEventListener('click', () => { C.race = b.dataset.k; if (C.race !== 'other') C.raceName = null; renderCreate(); }));
  $('cClass').querySelectorAll('.card').forEach(b => b.addEventListener('click', () => { C.cls = b.dataset.k; C.sel = null; if (!C.fixed) assignByPriority(); renderCreate(); }));
  $('cBg').querySelectorAll('.card').forEach(b => b.addEventListener('click', () => { C.bg = b.dataset.k; renderCreate(); }));
  $('cMethod').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === C.method)));
  $('cReroll').hidden = C.method !== 'roll' || !!C.fixed;
  $('cMethod').hidden = !!C.fixed;
  $('impReport').innerHTML = C.impReport || '';
  $('impClear').hidden = !C.imp && !C.impReport;
  const race = RACES[C.race];
  $('cScoreNote').textContent = C.fixed ? 'These scores came from your character sheet, with your racial bonuses already included. Clear the import to roll new ones.' : "Scores are placed for your class automatically. Click one score and then another to swap them. The gold number is your people's bonus.";
  if (C.fixed){
    $('cScores').innerHTML = ABILS.map(a => `<div class="score"><span class="l">${a.toUpperCase()}</span><span class="v">${C.fixed[a]}</span><span class="r">From sheet</span><span class="m">${sgn(mod(C.fixed[a]))}</span></div>`).join('');
    $('cContinue').hidden = !readSave();
    renderStartPicker();
    renderPreview();
    return;
  }
  $('cScores').innerHTML = ABILS.map(a => {
    const base = C.assign[a], bonus = race.bonus[a] || 0, fin = base + bonus;
    return `<button type="button" class="score${C.sel === a ? ' sel' : ''}" data-a="${a}"><span class="l">${a.toUpperCase()}</span><span class="v">${fin}</span><span class="r">${bonus ? `${base} +${bonus}` : '&nbsp;'}</span><span class="m">${sgn(mod(fin))}</span></button>`;
  }).join('');
  $('cScores').querySelectorAll('.score').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.a;
    if (!C.sel) C.sel = a;
    else if (C.sel === a) C.sel = null;
    else { const t = C.assign[a]; C.assign[a] = C.assign[C.sel]; C.assign[C.sel] = t; C.sel = null; }
    renderCreate();
  }));
  $('cContinue').hidden = !readSave();
  renderStartPicker();
  renderPreview();
}
function renderStartPicker(){
  const n = C.startCh || 1;
  $('cStart').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(String(b.dataset.ch) === String(n))));
  if (n === 'city'){ $('cStartNote').textContent = `Aldermere, the city of bridges. Start in the city with the job board, shops, guilds, and the Spell Forge. Your hero starts at level ${C.imp ? (C.imp.level || 1) : 1}, and every job scales to your level.`; return; }
  $('cStartNote').textContent = `${CHAPTERS[n]}. ${n === 1 ? 'The beginning of the story.' : 'Jump ahead to test or replay it.'} Your hero starts at level ${C.imp ? (C.imp.level || 1) : (CHAPTER_LEVEL[n] || 1)}${C.imp ? ' from your sheet' : ''}, and fights scale to your level.`;
}
function renderPreview(){
  const ch = buildChar(C);
  $('cPreview').innerHTML = sheetCore(ch, true) + `<div class="sh"><h4>Starting pack</h4><p class="small" style="margin:0">${Object.keys(ch.inv).map(id => ITEMS[id].name + (ch.inv[id] > 1 ? ' x' + ch.inv[id] : '')).join(', ')}, and ${ch.gold} gold.</p></div>`;
}
function begin(){
  if (!C.name.trim()) C.name = pick(NAMES[C.race]);
  G = freshGame();
  G.char = migrateChar(buildChar(C));
  G.mode = 'explore';
  logEl.innerHTML = '';
  const ch = C.startCh || 1;
  if (ch === 'city'){
    log('sys', `Aldermere. ${esc(G.char.name)}, level ${G.char.level} ${esc(G.char.raceName || RACES[G.char.race].name)} ${CLASSES[G.char.cls].name}, arrives in the city with a light purse and big plans.`);
    goTo('city_gate'); window.scrollTo(0, 0); return;
  }
  if (ch >= 2){
    joinAlly('brindle');
    G.char.gold += 40 * (ch - 1);
    Object.assign(G.flags, {set_out:true, delivered:true, jory_free:true, c1_done:true, c1_loot:true});
  }
  if (ch >= 3){
    Object.assign(G.flags, {stone_returned:true, wren_free:true, wren_reported:true, chapter_done:true, got_stone:true});
    addItem('letter');
  }
  log('sys', `Chapter ${CH_WORD[ch]}: ${CHAPTERS[ch]}. ${esc(G.char.name)}, level ${G.char.level} ${esc(G.char.raceName || RACES[G.char.race].name)} ${CLASSES[G.char.cls].name}, begins the story here.`);
  goTo(CHAPTER_START[ch]);
  window.scrollTo(0, 0);
}

