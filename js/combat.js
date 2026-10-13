/* =====================================================================
   THORNVALE CHRONICLES : combat.js
   Initiative, turns, monster attacks, player attacks, spells and actions.
   ===================================================================== */
'use strict';

/* =====================================================================
   COMBAT
   ===================================================================== */
function startCombat(cfg){
  const counts = {};
  const foes = cfg.foes.map((f, i) => {
    const spec = typeof f === 'string' ? {key:f} : f;
    const m = MONSTERS[spec.key];
    const hp = spec.hp || m.hp;
    const name = spec.name || m.name;
    counts[name] = (counts[name] || 0) + 1;
    return {uid:i, key:spec.key, base:name, name, hp, max:hp, ac:spec.ac || m.ac, m, st:{}, boss:!!spec.boss, xp:spec.xp || m.xp};
  });
  scaleFoes(foes);
  foes.forEach(f => { if (counts[f.base] > 1){ const k = foes.filter(x => x.base === f.base).indexOf(f); f.name = `${f.base} ${'ABCDEF'[k]}`; } });
  G.mode = 'combat'; G.choices = null;
  const c = G.combat = {foes, cfg, round:1, target:0, phaseIdx:0, order:null, dodge:false, hidden:false, extra:false, bonusUsed:false, sneakUsed:false, surged:false, subdue:false, initial:foes.length, fled:false};
  log('round', `Combat: ${foes.map(f => esc(f.name)).join(', ')}`);
  const pi = d20test({mod:am('dex')});
  const fmod = Math.max(...foes.map(f => f.m.init));
  const fi = d(20) + fmod;
  log('roll', `Initiative: you ${diceHTML(pi)} ${sgn(am('dex'))} = <b>${pi.total}</b>, foes <b>${fi}</b>${pi.note}`);
  let playerFirst = pi.total >= fi;
  let surprise = cfg.surprise || null;
  if (cfg.ambush && !surprise){
    const keen = allyUp() && ALLIES[G.ally.key].keen ? 5 : 0;
    const pp = 10 + skillMod('perception') + keen;
    const sr = d(20), st = sr + cfg.ambush.stealth;
    const caught = st > pp;
    log('roll', `Hidden foes' Stealth: d20 <b>${sr}</b> ${sgn(cfg.ambush.stealth)} = <b>${st}</b> vs your passive Perception ${pp}${keen ? ` (with ${esc(G.ally.name)}'s nose)` : ''} <em class="${caught ? 'no' : 'ok'}">${caught ? 'They catch you off guard' : 'You spot them in time'}</em>`);
    if (caught) surprise = 'enemy';
  }
  if (surprise === 'player'){ playerFirst = true; c.foesSkip = true; log('good', 'Your foes are surprised and lose their first turn!'); }
  if (surprise === 'enemy'){ playerFirst = false; c.playerSkip = true; log('bad', 'You are surprised and lose your first turn!'); }
  c.order = playerFirst ? ['player', 'foes'] : ['foes', 'player'];
  runCombat();
}
/* Fights scale to the hero. Each level above a chapter's suggested level makes
   foes tougher; each level below makes them a little weaker. */
function scaleFoes(foes){
  if (G.scaling === false || !G.char) return;
  const sc = STORY[G.scene];
  if (!sc || sc.module) return;
  const rec = CHAPTER_LEVEL[sc.chapter];
  if (!rec) return;
  const diff = clamp(G.char.level - rec, -2, 8);
  if (!diff) return;
  const mult = diff > 0 ? 1 + 0.3 * diff : Math.max(0.5, 1 + 0.2 * diff);
  foes.forEach(f => {
    f.hp = f.max = Math.max(1, Math.round(f.hp * mult));
    f.bonusHit = diff > 0 ? Math.floor(diff / 2) : -1;
    f.bonusDmg = diff > 0 ? diff : Math.ceil(diff / 2);
    if (diff >= 3) f.ac += Math.floor(diff / 3);
    f.xp = Math.max(1, Math.round(f.xp * mult));
  });
  log('sys', `Fights here are tuned for level ${rec}. ${diff > 0 ? 'Your foes are tougher' : 'Your foes are a little weaker'} to match your level ${G.char.level} hero.`);
}
function alive(c=G.combat){ return c.foes.filter(f => f.hp > 0 && !f.st.turned && !f.st.fled); }
function advancePhase(){
  const c = G.combat;
  c.phaseIdx++;
  if (c.phaseIdx > 1){ c.phaseIdx = 0; c.round++; log('round', `Round ${c.round}`); }
}
function runCombat(){
  let guard = 0;
  while (G.mode === 'combat' && guard++ < 20){
    const c = G.combat, who = c.order[c.phaseIdx];
    if (who === 'player'){
      if (c.round === 1 && c.playerSkip){ advancePhase(); continue; }
      c.dodge = false; c.bonusUsed = false; c.sneakUsed = false; c.extra = false; c.surged = false;
      render();
      return;
    }
    if (c.round === 1 && c.foesSkip) log('sys', 'Your foes are still scrambling.');
    else enemyPhase();
    if (G.mode !== 'combat') return;
    advancePhase();
  }
}
function enemyPhase(){
  const c = G.combat;
  if (c.cfg.rout != null){
    const up = alive();
    if (up.length && up.length <= c.cfg.rout && up.length < c.initial){
      up.forEach(f => { if (!f.boss && !f.st.asleep){ f.st.fled = true; c.fled = true; log('sys', `${esc(f.name)} breaks and runs!`); } });
      if (!alive().length){ winCombat(); return; }
    }
  }
  for (const f of c.foes){
    if (G.mode !== 'combat') return;
    if (f.hp <= 0 || f.st.turned || f.st.fled) continue;
    if (f.st.asleep){ log('sys', `${esc(f.name)} snores.`); continue; }
    if (f.st.prone){ f.st.prone = false; log('sys', `${esc(f.name)} scrambles back to its feet.`); }
    if (f.m.special.includes('nimble') && f.hp <= f.max / 2 && !f.st.hidden && Math.random() < .35){
      f.st.hidden = true; log('sys', `${esc(f.name)} ducks behind cover. Your next attack on it has disadvantage.`); continue;
    }
    enemyAttack(f);
  }
}
function enemyAttack(f){
  const list = f.m.attacks && f.m.attacks.length ? f.m.attacks : [f.m.attack];
  const times = Math.max(1, f.m.multi || 1);
  let martialUsed = false;
  for (let i = 0; i < times; i++){
    if (G.mode !== 'combat') return;
    martialUsed = enemyStrike(f, list[i % list.length], martialUsed);
  }
}
function enemyStrike(f, a, martialUsed){
  const c = G.combat;
  const allies = c.foes.some(o => o !== f && o.hp > 0 && !o.st.asleep && !o.st.turned && !o.st.fled);
  const atAlly = allyUp() && Math.random() < 0.4;
  const tAC = atAlly ? ALLIES[G.ally.key].ac : ac();
  let adv = false, dis = false;
  if (f.m.special.includes('pack') && (allies || allyUp())) adv = adv || allies;
  if (f.st.hidden){ adv = true; f.st.hidden = false; }
  if (c.dodge && !atAlly) dis = true;
  const r = monsterD20(adv, dis);
  const toHit = a.toHit + (f.bonusHit || 0);
  const total = r.nat + toHit, crit = r.nat === 20;
  const hit = crit || (r.nat !== 1 && total >= tAC);
  log('roll', `${esc(f.name)} ${a.name} at ${atAlly ? esc(G.ally.name) : 'you'}: ${diceHTML(r)} ${sgn(toHit)} = <b>${total}</b> vs AC ${tAC} <em class="${hit ? 'no' : 'ok'}">${crit ? 'Critical hit!' : hit ? 'Hit' : 'Miss'}</em>`);
  if (!hit) return martialUsed;
  const dr = rollDice(a.dmg, crit);
  let n = Math.max(1, dr.total + (f.bonusDmg || 0)), extra = f.bonusDmg ? ` ${sgn(f.bonusDmg)} level scaling` : '';
  if (f.m.special.includes('martial') && allies && !martialUsed){ const m = rollDice('2d6', crit); n += m.total; extra = ` + Martial Advantage ${m.text}`; martialUsed = true; }
  if (atAlly){
    G.ally.hp = Math.max(0, G.ally.hp - n);
    log('bad', `${esc(G.ally.name)} takes <b>${n}</b> ${a.type} damage (${dr.text}${extra}).`);
    if (G.ally.hp <= 0) log('bad', `<b>${esc(G.ally.name)} goes down!</b> He will recover after the fight if you win.`);
    return martialUsed;
  }
  if (RACES[G.char.race].resist && RACES[G.char.race].resist.includes(a.type)) n = Math.floor(n / 2);
  G.char.hp -= n;
  log('bad', `You take <b>${n}</b> ${a.type} damage (${dr.text}${extra}).`);
  if (G.char.hp <= 0 && !stubborn()) playerDown(c.cfg.flee || G.scene);
  return martialUsed;
}
function target(){
  const c = G.combat;
  let f = c.foes[c.target];
  if (!f || f.hp <= 0 || f.st.turned || f.st.fled){ f = alive()[0]; if (f) c.target = c.foes.indexOf(f); }
  return f;
}
function damageFoe(f, n, type, src, how={}){
  let note = '';
  if (f.m.vuln && f.m.vuln.includes(type)){ n *= 2; note = ' Vulnerable!'; }
  if (f.m.immune && f.m.immune.includes(type)){ n = 0; note = ' Immune.'; }
  f.hp -= n;
  log('good', `${src}: <b>${n}</b> ${type} damage to ${esc(f.name)}.${note}`);
  if (f.st.asleep && n > 0 && f.hp > 0){ f.st.asleep = false; log('sys', `${esc(f.name)} wakes up!`); }
  if (f.hp <= 0){
    f.hp = 0;
    if (how.melee && G.combat && G.combat.subdue && f.m.type === 'humanoid'){ f.st.subdued = true; log('good', `<b>${esc(f.name)} is knocked out cold.</b>`); }
    else log('good', `<b>${esc(f.name)} is defeated.</b>`);
  }
}
function endAction(){
  const c = G.combat;
  if (!alive().length) return winCombat();
  if (c.extra){ c.extra = false; log('sys', 'Action Surge: you may act again.'); render(); return; }
  allyTurn();
  if (!alive().length) return winCombat();
  advancePhase();
  runCombat();
}
function allyTurn(){
  if (!allyUp() || !G.combat) return;
  const a = ALLIES[G.ally.key], f = target();
  if (!f) return;
  const adv = !!f.st.asleep || !!f.st.prone || !!f.st.marked;
  const r = monsterD20(adv, false);
  const total = r.nat + a.attack.toHit, crit = r.nat === 20, hit = crit || (r.nat !== 1 && total >= f.ac);
  log('roll', `${esc(G.ally.name)} ${a.attack.name} at ${esc(f.name)}: ${diceHTML(r)} ${sgn(a.attack.toHit)} = <b>${total}</b> vs AC ${f.ac} <em class="${hit ? 'ok' : 'no'}">${crit ? 'Critical hit!' : hit ? 'Hit' : 'Miss'}</em>`);
  f.st.marked = false;
  if (!hit) return;
  const dr = rollDice(a.attack.dmg, crit);
  damageFoe(f, dr.total, a.attack.type, `${esc(G.ally.name)} ${dr.text}`);
  if (a.trip && f.hp > 0 && !f.st.prone){
    const sv = d(20) + (f.m.save.str || 0);
    if (sv < a.trip){ f.st.prone = true; log('good', `${esc(f.name)} is knocked prone (Strength save ${sv}). Melee attacks against it have advantage.`); }
  }
}
function winCombat(){
  const c = G.combat;
  const xp = c.foes.reduce((s, f) => s + f.xp, 0);
  log('round', 'Victory');
  G.combat = null; G.mode = 'explore';
  if (G.ally && G.ally.hp <= 0){ G.ally.hp = 1; log('sys', `${esc(G.ally.name)} staggers back up, battered but alive.`); }
  if (c.fled && c.cfg.onRout) applyLite(c.cfg.onRout);
  const caught = c.foes.filter(f => f.st.subdued);
  if (caught.length){
    if (c.cfg.captive && CAPTIVES[c.cfg.captive]){ G.captive = c.cfg.captive; log('sys', `You tie up the unconscious ${esc(caught[0].base.toLowerCase())} to question when it wakes.`); }
    else log('sys', `The ${esc(caught[0].base.toLowerCase())} you knocked out comes to and scrambles away.`);
  }
  gainXP(xp);
  if (c.cfg.win) resolve(c.cfg.win);
  else { render(); autosave(); }
}

/* player actions */
function playerAttack(i){
  const c = G.combat, w = weapons()[i], f = target();
  if (!f || !w) return;
  const adv = c.hidden || !!f.st.marked || !!f.st.asleep || (w.melee && !!f.st.prone);
  const dis = !!f.st.hidden || (!w.melee && !!f.st.prone) || !armorTrained();
  const bonus = atkBonus(w);
  const r = d20test({mod:bonus, adv, dis});
  const nat20 = r.nat >= (hasFeat('improvedCritical') ? 19 : 20);
  const hit = nat20 || (r.nat !== 1 && r.total >= f.ac);
  const crit = nat20 || (hit && f.st.asleep && w.melee);
  log('roll', `${w.name} at ${esc(f.name)}: ${diceHTML(r)} ${sgn(bonus)} = <b>${r.total}</b> vs AC ${f.ac} <em class="${hit ? 'ok' : 'no'}">${crit ? 'Critical hit!' : hit ? 'Hit' : 'Miss'}</em>${r.note}`);
  c.hidden = false; f.st.marked = false; f.st.hidden = false;
  if (hit){
    const dr = rollDice(w.dmg, crit);
    let n = dr.total + wAbil(w) + (w.bonus || 0), txt = `${w.name} ${dr.text} ${sgn(wAbil(w) + (w.bonus || 0))}`;
    if (hasFeat('sneakAttack') && !c.sneakUsed && (r.net === 'adv' || (allyUp() && r.net !== 'dis'))){
      const s = rollDice(sneakDice(), crit); n += s.total; c.sneakUsed = true; txt += ` + Sneak Attack ${s.text}`;
    }
    damageFoe(f, Math.max(1, n), w.type, txt, {melee:w.melee});
  }
  endAction();
}
function castSpell(id, onAlly){
  const c = G.combat, sp = SPELLS[id];
  if (!armorTrained()){ notice("You can't cast spells in armor you aren't trained in."); return; }
  if (sp.level > 0){ if (G.char.slots.left <= 0) return; G.char.slots.left--; }
  const f = target();
  log('sys', `You cast ${sp.name}${sp.level ? ' (1 slot)' : ''}.`);
  if (sp.kind === 'attack'){
    const adv = c.hidden || !!f.st.marked || !!f.st.asleep, dis = !!f.st.hidden || !!f.st.prone;
    const r = d20test({mod:spellAtk(), adv, dis});
    const crit = r.nat === 20, hit = crit || (r.nat !== 1 && r.total >= f.ac);
    log('roll', `${sp.name} at ${esc(f.name)}: ${diceHTML(r)} ${sgn(spellAtk())} = <b>${r.total}</b> vs AC ${f.ac} <em class="${hit ? 'ok' : 'no'}">${crit ? 'Critical hit!' : hit ? 'Hit' : 'Miss'}</em>${r.note}`);
    c.hidden = false; f.st.marked = false; f.st.hidden = false;
    if (hit){
      const dr = rollDice(sp.dmg, crit);
      damageFoe(f, dr.total, sp.type, `${sp.name} ${dr.text}`);
      if (sp.mark && f.hp > 0){ f.st.marked = true; log('sys', `${esc(f.name)} glows with light. Your next attack on it has advantage.`); }
    }
  } else if (sp.kind === 'save'){
    const sv = d(20) + (f.m.save[sp.save] || 0);
    const ok = sv >= spellDC();
    log('roll', `${esc(f.name)} ${ABIL_NAME[sp.save]} save: <b>${sv}</b> vs DC ${spellDC()} <em class="${ok ? 'no' : 'ok'}">${ok ? 'Saved' : 'Failed'}</em>`);
    if (!ok){ const dr = rollDice(sp.dmg); damageFoe(f, dr.total, sp.type, `${sp.name} ${dr.text}`); }
  } else if (sp.kind === 'missile'){
    for (let i = 0; i < sp.darts; i++){
      const t = c.foes[c.target] && c.foes[c.target].hp > 0 ? c.foes[c.target] : target();
      if (!t) break;
      const dr = rollDice(sp.dmg);
      damageFoe(t, dr.total, sp.type, `Dart ${i + 1} ${dr.text}`);
    }
  } else if (sp.kind === 'sleep'){
    let pool = rollDice(sp.pool);
    log('roll', `Sleep: ${pool.text} = <b>${pool.total}</b> hit points of creatures`);
    let left = pool.total;
    const order = alive().filter(x => !x.st.asleep && x.m.type !== 'undead').sort((a, b) => a.hp - b.hp);
    for (const x of order){
      if (x.hp > left) break;
      left -= x.hp; x.st.asleep = true;
      log('good', `${esc(x.name)} collapses, fast asleep.`);
    }
    if (left === pool.total) log('sys', 'Nothing falls asleep.');
  } else if (sp.kind === 'aoe'){
    const dr = rollDice(sp.dmg);
    log('roll', `${sp.name}: ${dr.text} = <b>${dr.total}</b>`);
    alive().forEach(x => {
      const sv = d(20) + (x.m.save[sp.save] || 0), ok = sv >= spellDC();
      log('roll', `${esc(x.name)} ${ABIL_NAME[sp.save]} save: <b>${sv}</b> vs DC ${spellDC()} <em class="${ok ? 'no' : 'ok'}">${ok ? 'Half damage' : 'Failed'}</em>`);
      damageFoe(x, ok ? Math.floor(dr.total / 2) : dr.total, sp.type, sp.name);
    });
  } else if (sp.kind === 'heal'){
    castHeal(sp, onAlly);
  }
  endAction();
}
function castHeal(sp, onAlly){
  const bonus = castMod() + (hasFeat('discipleOfLife') ? 2 + sp.level : 0);
  if (onAlly && G.ally) healAlly(`${sp.heal}${sgn(bonus)}`, sp.name);
  else heal(`${sp.heal}${sgn(bonus)}`, sp.name);
}
function castOutside(id, onAlly){
  const sp = SPELLS[id];
  if (!armorTrained()){ notice("You can't cast spells in armor you aren't trained in."); return; }
  if (G.mode !== 'explore' || sp.kind !== 'heal' || !G.char.slots || G.char.slots.left <= 0) return;
  G.char.slots.left--;
  log('you', `Cast ${sp.name}${onAlly && G.ally ? ' on ' + esc(G.ally.name) : ''}`);
  castHeal(sp, onAlly);
  render(); autosave();
}
function secondWind(){
  const c = G.combat;
  if (!G.char.uses.secondWind) return;
  G.char.uses.secondWind--;
  heal(`1d10+${G.char.level}`, 'Second Wind');
  if (c) { c.bonusUsed = true; render(); } else { render(); autosave(); }
}
function actionSurge(){
  const c = G.combat;
  if (!G.char.uses.actionSurge || c.surged) return;
  G.char.uses.actionSurge--; c.extra = true; c.surged = true;
  log('good', 'Action Surge! You will act twice this turn.');
  render();
}
function hideAction(){
  const c = G.combat;
  const bonusHide = hasFeat('cunningAction');
  const pp = Math.max(...alive().filter(f => !f.st.asleep).map(f => f.m.pp), 0);
  const m = skillMod('stealth');
  const r = d20test({mod:m, dis:!!(wornArmor() && wornArmor().stealthDis) || !armorTrained()});
  const ok = r.total >= pp;
  log('roll', `Hide: ${diceHTML(r)} ${sgn(m)} = <b>${r.total}</b> vs passive Perception ${pp} <em class="${ok ? 'ok' : 'no'}">${ok ? 'Hidden' : 'Spotted'}</em>${r.note}`);
  if (ok){ c.hidden = true; log('sys', 'Your next attack has advantage.'); }
  if (bonusHide){ c.bonusUsed = true; render(); } else endAction();
}
function dodgeAction(){ G.combat.dodge = true; log('sys', 'You take the Dodge action. Attacks against you have disadvantage until your next turn.'); endAction(); }
function itemAction(id, onAlly){
  useItem(id, onAlly);
  if (hasFeat('fastHands') && !G.combat.bonusUsed){ G.combat.bonusUsed = true; log('sys', 'Fast Hands: that took only your bonus action.'); render(); return; }
  endAction();
}
function turnUndead(){
  const c = G.combat;
  G.char.uses.turnUndead--;
  log('sys', 'You raise your holy symbol and call on the light.');
  alive().filter(f => f.m.type === 'undead').forEach(f => {
    const sv = d(20) + (f.m.save.wis || 0), ok = sv >= spellDC();
    log('roll', `${esc(f.name)} Wisdom save: <b>${sv}</b> vs DC ${spellDC()} <em class="${ok ? 'no' : 'ok'}">${ok ? 'Resists' : 'Turned'}</em>`);
    if (!ok){ f.st.turned = true; log('good', `${esc(f.name)} flees from your light.`); }
  });
  endAction();
}
function fleeAction(){
  const c = G.combat;
  const dc = 10 + alive().length;
  const k = bestSkill(['athletics', 'acrobatics']);
  const m = skillMod(k);
  const r = d20test({mod:m});
  const ok = r.total >= dc;
  log('roll', `Flee (${SKILLS[k][0]}): ${diceHTML(r)} ${sgn(m)} = <b>${r.total}</b> vs DC ${dc} <em class="${ok ? 'ok' : 'no'}">${ok ? 'Escaped' : 'Cut off'}</em>${r.note}`);
  if (ok){
    const cfg = c.cfg;
    G.combat = null; G.mode = 'explore';
    say('You break away and run.');
    if (cfg.flee) goTo(cfg.flee); else { render(); autosave(); }
    return;
  }
  endAction();
}

/* ---------- saving ---------- */
function snapshot(){ return JSON.stringify({v:G.v, char:G.char, scene:G.scene, flags:G.flags, visits:G.visits, alert:G.alert, ally:G.ally, captive:G.captive, module:G.module, bestiary:BESTIARY, log:G.log.slice(-120), mode:'explore'}); }
function writeSave(){ try { localStorage.setItem(SAVE_KEY, snapshot()); return true; } catch (e){ return false; } }
function autosave(){ if (G.mode === 'explore' && G.char) writeSave(); }
function readSave(){ try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e){ return null; } }
function loadState(data){
  if (!data || !data.char) return false;
  if (Array.isArray(data.bestiary)) mergeBestiary(data.bestiary);
  if (data.module && !restoreModule(data.module)) data.module = null;
  if (!STORY[data.scene]) return false;
  G = Object.assign(freshGame(), data, {mode:'explore', combat:null, choices:null, down:null, shop:null});
  migrateChar(G.char);
  rebuildLog(); render();
  return true;
}
function encodeSave(){ return btoa(unescape(encodeURIComponent(snapshot()))); }
function decodeSave(s){ try { return JSON.parse(decodeURIComponent(escape(atob(s.trim())))); } catch (e){ return null; } }

