/* =====================================================================
   THORNVALE CHRONICLES : combat.js
   Initiative, turns, monster attacks, player attacks, spells and actions.
   ===================================================================== */
'use strict';

/* =====================================================================
   COMBAT
   ===================================================================== */
/* ---------- cover and line of sight ----------
   Each fight has terrain: open (no cover), some (half cover), or lots
   (three-quarters cover). Full cover is possible wherever there is any cover.
   Half cover +2 AC and Dexterity saves, three-quarters +5. Full cover: no
   attack, spell, or dart can reach you, but a melee foe can spend its
   attack coming around it. */
const COVER_AC = {half:2, three:5};
const COVER_NAME = {half:'half cover', three:'three-quarters cover', full:'full cover'};
const AREA_COVER = {town:'some', city:'some', wilds:'some', marsh:'some', jobwild:'some', boss:'some', well:'some',
  tower:'lots', dungeon:'lots', crypt:'lots', gaol:'lots', sewer:'lots', ruins:'lots', docks:'lots'};
const TERRAIN_TEXT = {open:'Open ground: there is no cover here for anyone.', some:'There is some cover here: half cover (+2 AC) or full cover.', lots:'There is plenty of cover here: three-quarters cover (+5 AC) or full cover.'};
function terrainOf(cfg){
  const sc = STORY[G.scene];
  return cfg.cover || (sc && sc.cover) || (sc && AREA_COVER[sc.area]) || 'some';
}
const partialCover = (c=G.combat) => c && c.terrain === 'lots' ? 'three' : c && c.terrain === 'some' ? 'half' : null;
const coverAC = k => COVER_AC[k] || 0;
const foeAC = f => f.ac + coverAC(f.st.cover) + (f.st.shieldAC || 0);
const smartFoe = f => (f.m.save.int || 0) >= -1 && !['beast', 'ooze', 'construct'].includes(f.m.type);
const rangedStrike = a => !!(a.missile || a.save) || /bow|crossbow|thrown|javelin|bolt|flame|ray|sling|dart|missile/i.test(a.name);
const foeHasRanged = f => routinesOf(f.m).some(r => (r.strikes || []).some(rangedStrike));
const shieldUses = f => f.m.shieldUses || ((f.m.special || []).includes('shield') ? 2 : 0);
/* Magic Missile makes three darts, plus one for each slot level above 1st.
   This game treats every slot as 1st level, so it is three for now. */
const mmDarts = (sp, slotLevel=1) => (sp.darts || 3) + Math.max(0, slotLevel - 1);
function mmAdjust(uid, d){
  const m = G.combat.mm, used = Object.values(m.alloc).reduce((a, b) => a + b, 0);
  const cur = m.alloc[uid] || 0;
  if (d > 0 && used >= m.darts) return;
  m.alloc[uid] = Math.max(0, cur + d);
  render();
}
function mmRelease(){
  const m = G.combat.mm, used = Object.values(m.alloc).reduce((a, b) => a + b, 0);
  if (used < m.darts) return notice(`Aim all ${m.darts} darts first (${used} aimed).`);
  castSpell(m.id, false, m.scroll, Object.assign({}, m.alloc));
}
/* the hero's Shield spell, cast as a reaction */
function canShield(){
  const c = G.combat;
  return !!(c && !c.reacted && c.autoShield !== false && G.char.slots && G.char.slots.left > 0 && armorTrained() && knownSpells().spells.includes('shield'));
}
function castShield(why){
  const c = G.combat;
  c.reacted = true; c.shieldUp = true; G.char.slots.left--;
  log('good', `<b>Shield!</b> ${why} A shimmering barrier springs up: +5 AC until your next turn (1 slot, ${G.char.slots.left} left).`);
}
/* a foe's Shield spell or deflection, as its reaction */
function foeShield(f, total){
  if (f.st.parried || f.hp <= 0 || f.st.asleep) return false;
  if (shieldUses(f) - ((f.st.used || {}).Shield || 0) <= 0) return false;
  if (total !== null && total >= foeAC(f) + 5) return false;
  f.st.used = f.st.used || {}; f.st.used.Shield = (f.st.used.Shield || 0) + 1;
  f.st.parried = true; f.st.shieldAC = 5;
  log('sys', `${esc(f.name)} snaps up a <b>Shield</b> spell! ${total === null ? 'Your darts burst harmlessly against it.' : '+5 AC turns your hit into a miss.'}`);
  return true;
}
const spellImmune = f => (f.m.special || []).includes('spellimmune');
function stepOutOfCover(){
  const c = G.combat;
  if (c.pcover !== 'full') return;
  c.pcover = partialCover(c);
  log('sys', `You step out from full cover${c.pcover ? ' into ' + COVER_NAME[c.pcover] : ''} to act.`);
}
function takeCover(full){
  const c = G.combat;
  if (full){ c.pcover = 'full'; log('sys', 'You use your turn to get behind full cover. No attack, spell, or dart can reach you there, but melee foes may come around it.'); endAction(); return; }
  c.pcover = partialCover(c); c.movedCover = true;
  log('sys', `You move into ${COVER_NAME[c.pcover]}: +${coverAC(c.pcover)} AC and Dexterity saves. Moving costs you nothing; you can still act.`);
  render();
}
function startCombat(cfg){
  /* tiers: {1:[...], 3:[...], 5:[...]} picks the group for the hero's level */
  if (cfg.tiers){
    const keys = Object.keys(cfg.tiers).map(Number).sort((a, b) => a - b);
    let k = keys[0];
    keys.forEach(x => { if (x <= G.char.level) k = x; });
    cfg = Object.assign({}, cfg, {foes:cfg.tiers[k].slice(), rec:k});
  }
  /* jobs remember the foes you already killed in this fight */
  if (cfg.fid && G.job && (G.job.cleared || {})[cfg.fid]){ log('sys', 'You already cleared this fight.'); resolve(cfg.win || null); return; }
  if (cfg.fid && G.job){
    let dead = (G.job.killed || {})[cfg.fid] || 0;
    if (dead){
      const list = cfg.foes.slice(), before = list.length;
      for (let i = list.length - 1; i >= 0 && dead > 0; i--){ const s = list[i]; if (!(typeof s === 'object' && s.boss)){ list.splice(i, 1); dead--; } }
      for (let i = list.length - 1; i >= 0 && dead > 0; i--){ list.splice(i, 1); dead--; }
      cfg = Object.assign({}, cfg, {foes:list});
      log('sys', `${before - list.length} of these foes already fell on your last attempt. They stay dead.`);
      if (!list.length){ G.job.cleared[cfg.fid] = true; resolve(cfg.win || null); return; }
    }
  }
  const counts = {};
  const foes = cfg.foes.map((f, i) => {
    const spec = typeof f === 'string' ? {key:f} : f;
    let m = MONSTERS[spec.key];
    if (spec.special) m = Object.assign({}, m, {special:[...new Set([...(m.special || []), ...spec.special])]});
    const hp = spec.hp || m.hp;
    const name = spec.name || m.name;
    counts[name] = (counts[name] || 0) + 1;
    return {uid:i, key:spec.key, base:name, name, hp, max:hp, ac:spec.ac || m.ac, m, st:{}, boss:!!spec.boss, xp:spec.xp || m.xp};
  });
  if (cfg.noScale) foes.noScale = true;
  scaleFoes(foes, cfg);
  if (cfg.weaken) foes.forEach(f => { if (f.boss){ f.hp = f.max = Math.max(1, Math.round(f.hp * cfg.weaken)); } });
  const wound = cfg.fid && G.job && G.job.wounds && G.job.wounds[cfg.fid];
  if (wound) foes.forEach(f => { if (f.boss){ f.hp = Math.max(1, Math.round(f.max * (1 - wound))); log('sys', `${esc(f.name)} still carries the wounds you gave it last time.`); } });
  foes.forEach(f => { if (counts[f.base] > 1){ const k = foes.filter(x => x.base === f.base).indexOf(f); f.name = `${f.base} ${'ABCDEF'[k]}`; } });
  G.mode = 'combat'; G.choices = null;
  const c = G.combat = {terrain:terrainOf(cfg), pcover:null, autoShield:G.char.autoShield !== false, foes, cfg, round:1, target:0, phaseIdx:0, order:null, dodge:false, hidden:false, extra:false, bonusUsed:false, sneakUsed:false, surged:false, subdue:false, initial:foes.length, fled:false};
  log('round', `Combat: ${foes.map(f => esc(f.name)).join(', ')}`);
  log('sys', TERRAIN_TEXT[c.terrain]);
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
function scaleFoes(foes, cfg){
  if (G.scaling === false || !G.char || foes.noScale) return;
  const sc = STORY[G.scene];
  if (!sc || sc.module) return;
  const rec = (cfg && cfg.rec) || CHAPTER_LEVEL[sc.chapter];
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
  log('sys', `This fight is tuned for level ${rec}. ${diff > 0 ? 'Your foes are tougher' : 'Your foes are a little weaker'} to match your level ${G.char.level} hero.`);
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
      if (c.prone){ c.prone = false; log('sys', 'You get back on your feet.'); }
      if (c.shieldUp) log('sys', 'Your Shield fades.');
      c.reacted = false; c.shieldUp = false; c.movedCover = false; c.mm = null;
      if (c.paralyzed){
        if (doCheck({save:'con', dc:c.paralyzed})){ c.paralyzed = 0; log('good', 'Feeling floods back into your limbs. You can move again.'); }
        else { log('bad', 'You are still paralyzed and lose your turn.'); allyTurn(); if (!alive().length){ winCombat(); return; } advancePhase(); continue; }
      }
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
    f.st.parried = false; f.st.shieldAC = 0;
    if (f.st.cover === 'full'){ f.st.cover = partialCover(c); log('sys', `${esc(f.name)} comes out from behind full cover${f.st.cover ? ' into ' + COVER_NAME[f.st.cover] : ''}.`); }
    else if (partialCover(c) && smartFoe(f) && !f.st.asleep && !f.st.prone){
      if (!f.boss && f.hp <= f.max / 2 && Math.random() < 0.3){ f.st.cover = 'full'; log('sys', `${esc(f.name)} falls back behind full cover and gives up its attack to stay alive.`); continue; }
      if (!f.st.cover && foeHasRanged(f) && Math.random() < 0.5){ f.st.cover = partialCover(c); log('sys', `${esc(f.name)} slips into ${COVER_NAME[f.st.cover]} (+${coverAC(f.st.cover)} AC).`); }
    }
    if (f.st.prone){ f.st.prone = false; log('sys', `${esc(f.name)} scrambles back to its feet.`); }
    if (f.m.special.includes('nimble') && f.hp <= f.max / 2 && !f.st.hidden && Math.random() < .35){
      f.st.hidden = true; log('sys', `${esc(f.name)} ducks behind cover. Your next attack on it has disadvantage.`); continue;
    }
    enemyAttack(f);
  }
}
/* ---------- how foes act ----------
   A monster's turn is one routine: m.actions (weighted) for people
   templates, or its attack repeated m.multi times for simple monsters. */
function routinesOf(m){
  if (m.actions && m.actions.length) return m.actions;
  const list = m.attacks && m.attacks.length ? m.attacks : [m.attack];
  const times = Math.max(1, m.multi || 1);
  return [{w:1, strikes:Array.from({length:times}, (_, i) => list[i % list.length])}];
}
function pickWeighted(list){
  const tot = list.reduce((s, r) => s + (r.w || 1), 0);
  let x = Math.random() * tot;
  for (const r of list){ x -= (r.w || 1); if (x < 0) return r; }
  return list[list.length - 1];
}
const usesLeft = (f, s) => !s.uses || ((f.st.used || {})[s.name] || 0) < s.uses;
function useUp(f, s){ if (s.uses){ f.st.used = f.st.used || {}; f.st.used[s.name] = (f.st.used[s.name] || 0) + 1; } }
function foeToHeal(){ return alive().filter(o => o.hp <= o.max / 2).sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; }
function enemyAttack(f){
  const all = routinesOf(f.m);
  let ready = all.filter(r => r.heal ? usesLeft(f, r) && !!foeToHeal() : r.strikes.every(s => usesLeft(f, s)));
  if (!ready.length) ready = all.filter(r => !r.heal);
  const r = pickWeighted(ready);
  if (r.heal){
    const t = foeToHeal(); useUp(f, r);
    const dr = rollDice(r.heal), before = t.hp;
    t.hp = Math.min(t.max, t.hp + dr.total);
    log('bad', `${esc(f.name)} casts ${esc(r.name)}${t === f ? '' : ' on ' + esc(t.name)}: ${t === f ? 'it' : esc(t.name)} regains <b>${t.hp - before}</b> hit points (${dr.text}).`);
    return;
  }
  if (f.st.cover && f.st.cover !== 'full' && (r.strikes || []).some(s => !rangedStrike(s))){ f.st.cover = null; log('sys', `${esc(f.name)} leaves cover to close in.`); }
  if (f.m.special.includes('reckless') && !f.st.reckless){ f.st.reckless = true; log('sys', `${esc(f.name)} fights recklessly: its attacks have advantage, and so do yours against it.`); }
  const st = {martialUsed:false, sneakUsed:false};
  for (const s of r.strikes){
    if (G.mode !== 'combat') return;
    if (!usesLeft(f, s)) continue;
    useUp(f, s);
    if (s.missile) enemyMissile(f, s); else if (s.save) enemySaveStrike(f, s); else enemyStrike(f, s, st);
  }
}
/* damage that lands on the hero or the companion */
function hurtPlayer(n, type, why){
  if (RACES[G.char.race].resist && RACES[G.char.race].resist.includes(type)){ n = Math.floor(n / 2); why += ', halved by your resilience'; }
  else if (type === 'force' && has('brooch')){ n = Math.floor(n / 2); why += ', halved by your Brooch of Shielding'; }
  G.char.hp -= n;
  log('bad', `You take <b>${n}</b> ${type} damage (${why}).`);
  if (G.char.hp <= 0 && G.combat && G.combat.cfg.spar){ endSpar(false); return true; }
  if (G.char.hp <= 0 && !stubborn()){ playerDown(G.combat ? G.combat.cfg.flee || G.scene : G.scene); return true; }
  return false;
}
function hurtAlly(n, type, why){
  G.ally.hp = Math.max(0, G.ally.hp - n);
  log('bad', `${esc(G.ally.name)} takes <b>${n}</b> ${type} damage (${why}).`);
  if (G.ally.hp <= 0){ const a = ALLIES[G.ally.key]; log('bad', `<b>${esc(G.ally.name)} goes down!</b> ${cap(pron(a))} will recover after the fight if you win.`); }
}
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
const allySaveRoll = () => d(20) + 1;
/* a spell or effect that calls for a saving throw instead of an attack roll */
/* an enemy's Magic Missile: darts never miss, but cover, Shield, and a Brooch of Shielding stop them */
function enemyMissile(f, s){
  const c = G.combat, n = s.missile, dr = rollDice(s.dmg);
  const youOK = c.pcover !== 'full', allyOK = allyUp();
  if (!youOK && !allyOK){ log('sys', `${esc(f.name)} readies Magic Missile, but has no line of sight to anyone.`); return; }
  let toYou = 0, toAlly = 0;
  for (let i = 0; i < n; i++){ if (youOK && (!allyOK || Math.random() < 0.65)) toYou++; else toAlly++; }
  log('sys', `${esc(f.name)} casts Magic Missile: ${n} glowing darts, ${dr.text} force each. They never miss.`);
  if (toAlly) hurtAlly(toAlly * dr.total, 'force', `${toAlly} dart${toAlly > 1 ? 's' : ''} x ${dr.total}`);
  if (!toYou) return;
  if (has('brooch')){ log('good', `Your Brooch of Shielding drinks in ${toYou} dart${toYou > 1 ? 's' : ''}. No harm done.`); return; }
  if (canShield()){ castShield(`The darts burst against it.`); return; }
  hurtPlayer(toYou * dr.total, 'force', `${toYou} dart${toYou > 1 ? 's' : ''} x ${dr.total}`);
}
function enemySaveStrike(f, s){
  const c = G.combat;
  const area = s.half;
  const dr = rollDice(s.dmg);
  let atAlly = !area && allyUp() && Math.random() < 0.4;
  if (!area && !atAlly && c.pcover === 'full'){
    if (allyUp()) atAlly = true;
    else { log('sys', `${esc(f.name)} has no line of sight to you for ${esc(s.name)}.`); return; }
  }
  log('sys', `${esc(f.name)} casts ${esc(s.name)}${area ? '!' : ' at ' + (atAlly ? esc(G.ally.name) : 'you') + '.'}`);
  const hitsAlly = area ? allyUp() : atAlly;
  const hitsYou = (area || !atAlly) && !(area && c.pcover === 'full');
  if (area && c.pcover === 'full') log('good', `Your full cover shields you completely from the ${esc(s.name)}.`);
  let n = dr.total + Math.max(0, f.bonusDmg || 0);
  if (hitsAlly){
    const sv = allySaveRoll(), ok = sv >= s.dc;
    log('roll', `${esc(G.ally.name)} ${ABIL_NAME[s.save]} save: <b>${sv}</b> vs DC ${s.dc} <em class="${ok ? 'ok' : 'no'}">${ok ? (s.half ? 'Half damage' : 'Dodged') : 'Failed'}</em>`);
    const m = ok ? (s.half ? Math.floor(n / 2) : 0) : n;
    if (m > 0) hurtAlly(m, s.type, `${esc(s.name)} ${dr.text}`);
  }
  if (hitsYou){
    const ok = doCheck({save:s.save, dc:s.dc, bonus:s.save === 'dex' ? coverAC(c.pcover) : 0});
    const m = ok ? (s.half ? Math.floor(n / 2) : 0) : n;
    if (m > 0) hurtPlayer(m, s.type, `${esc(s.name)} ${dr.text}${ok ? ', halved' : ''}`);
    else log('good', `You avoid the ${esc(s.name)}.`);
  }
}
function enemyStrike(f, a, st){
  const c = G.combat;
  if (typeof st !== 'object') st = {martialUsed:!!st, sneakUsed:false};
  const allies = c.foes.some(o => o !== f && o.hp > 0 && !o.st.asleep && !o.st.turned && !o.st.fled);
  let atAlly = allyUp() && Math.random() < 0.4;
  if (!atAlly && c.pcover === 'full'){
    if (!rangedStrike(a)){
      c.pcover = partialCover(c);
      log('sys', `${esc(f.name)} comes around your cover. You no longer have full cover${c.pcover ? `, only ${COVER_NAME[c.pcover]}` : ''}.`);
      return st.martialUsed;
    }
    if (allyUp()) atAlly = true;
    else { log('sys', `${esc(f.name)} has no line of sight to you and holds its ${a.name}.`); return st.martialUsed; }
  }
  let tAC = atAlly ? ALLIES[G.ally.key].ac : ac() + coverAC(c.pcover) + (c.shieldUp ? 5 : 0);
  let adv = false, dis = false;
  if (f.m.special.includes('pack') && (allies || allyUp())) adv = adv || allies;
  if (f.st.hidden){ adv = true; f.st.hidden = false; }
  if (f.st.reckless) adv = true;
  if (f.m.special.includes('assassinate') && c.round === 1) adv = true;
  if (c.prone && !atAlly && !/bow|thrown|bolt|flame/i.test(a.name)) adv = true;
  if (c.paralyzed && !atAlly) adv = true;
  if (c.dodge && !atAlly) dis = true;
  const r = monsterD20(adv, dis);
  const toHit = a.toHit + (f.bonusHit || 0);
  const total = r.nat + toHit;
  let hit = r.nat === 20 || (r.nat !== 1 && total >= tAC);
  if (hit && !atAlly && r.nat !== 20 && total < tAC + 5 && canShield()){ castShield(`The ${esc(a.name)} would have hit you.`); tAC += 5; hit = false; }
  const crit = r.nat === 20 || (hit && f.m.special.includes('assassinate') && c.round === 1 && c.playerSkip && !atAlly);
  log('roll', `${esc(f.name)} ${a.name} at ${atAlly ? esc(G.ally.name) : 'you'}: ${diceHTML(r)} ${sgn(toHit)} = <b>${total}</b> vs AC ${tAC} <em class="${hit ? 'no' : 'ok'}">${crit ? 'Critical hit!' : hit ? 'Hit' : 'Miss'}</em>`);
  if (!hit) return st.martialUsed;
  const dmgExpr = f.m.special.includes('swarm') && f.hp <= f.max / 2 ? String(a.dmg).replace(/^(\d+)d/, (m0, n0) => Math.max(1, Math.floor(n0 / 2)) + 'd') : a.dmg;
  const dr = rollDice(dmgExpr, crit);
  let n = Math.max(1, dr.total + (f.bonusDmg || 0)), extra = f.bonusDmg ? ` ${sgn(f.bonusDmg)} level scaling` : '';
  if (f.m.special.includes('martial') && allies && !st.martialUsed){ const m = rollDice('2d6', crit); n += m.total; extra += ` + Martial Advantage ${m.text}`; st.martialUsed = true; }
  if (f.m.sneak && !st.sneakUsed && r.net !== 'dis' && (r.net === 'adv' || allies)){ const s = rollDice(f.m.sneak, crit); n += s.total; extra += ` + Sneak Attack ${s.text}`; st.sneakUsed = true; }
  const why = `${dr.text}${extra}`;
  if (atAlly){
    hurtAlly(n, a.type, why);
    if (a.rider && !a.rider.save && G.ally.hp > 0){ const rd = rollDice(a.rider.dmg); hurtAlly(rd.total, a.rider.type, rd.text); }
    else if (a.rider && G.ally.hp > 0){
      const rd = rollDice(a.rider.dmg), sv = allySaveRoll(), ok = sv >= a.rider.dc;
      log('roll', `${esc(G.ally.name)} ${ABIL_NAME[a.rider.save]} save: <b>${sv}</b> vs DC ${a.rider.dc} <em class="${ok ? 'ok' : 'no'}">${ok ? 'Half' : 'Failed'}</em>`);
      const m = ok && a.rider.half ? Math.floor(rd.total / 2) : ok ? 0 : rd.total;
      if (m) hurtAlly(m, a.rider.type, rd.text);
    }
    return st.martialUsed;
  }
  if (hurtPlayer(n, a.type, why)) return st.martialUsed;
  if (a.rider && !a.rider.save){ const rd = rollDice(a.rider.dmg); if (hurtPlayer(rd.total, a.rider.type, rd.text)) return st.martialUsed; }
  else if (a.rider){
    const rd = rollDice(a.rider.dmg), ok = doCheck({save:a.rider.save, dc:a.rider.dc});
    const m = ok && a.rider.half ? Math.floor(rd.total / 2) : ok ? 0 : rd.total;
    if (m && hurtPlayer(m, a.rider.type, `${rd.text}${ok ? ', halved' : ''}`)) return st.martialUsed;
  }
  if (a.paralyze && !c.paralyzed){
    if (G.char.race === 'elf') log('sys', 'Your elven blood shrugs off the paralysis.');
    else if (!doCheck({save:'con', dc:a.paralyze.dc})){ c.paralyzed = a.paralyze.dc; log('bad', 'Your muscles lock. You are <b>paralyzed</b>! Attacks against you have advantage. Each turn you try a Constitution save to shake it off.'); }
  }
  if (a.prone && !c.prone){
    if (!doCheck({save:a.prone.save, dc:a.prone.dc})){ c.prone = true; log('bad', 'You are knocked prone! Melee attacks against you have advantage until you stand on your turn.'); }
  }
  return st.martialUsed;
}
/* Parry: some foes add to their AC against one melee hit each round. */
function parries(f, total, crit, melee){
  if (!melee || crit || !f.m.parry || f.st.parried || f.hp <= 0 || f.st.asleep) return false;
  if (total >= f.ac + f.m.parry) return false;
  f.st.parried = true;
  log('sys', `${esc(f.name)} parries! (+${f.m.parry} AC turns the hit into a miss.)`);
  return true;
}
/* a foe's saving throw against your spell */
function foeSave(f, a, spell){
  const mr = spell && f.m.special.includes('magicres');
  const r = monsterD20(mr, false);
  const cv = a === 'dex' ? coverAC(f.st.cover) : 0;
  const total = r.nat + (f.m.save[a] || 0) + (f.bonusHit > 0 ? f.bonusHit : 0) + cv;
  return {total, text:`${diceHTML(r)} ${sgn(f.m.save[a] || 0)}${cv ? ` +${cv} cover` : ''} = <b>${total}</b>${mr ? ' (Magic Resistance)' : ''}`};
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
  else if (f.m.resist && f.m.resist.includes(type)){ n = Math.floor(n / 2); note = ' Resisted, half damage.'; }
  else if (f.m.resistMundane && f.m.resistMundane.includes(type) && !how.magic){ n = Math.floor(n / 2); note = ' Ordinary weapons barely bite: half damage.'; }
  f.hp -= n;
  log('good', `${src}: <b>${n}</b> ${type} damage to ${esc(f.name)}.${note}`);
  if (f.st.asleep && n > 0 && f.hp > 0){ f.st.asleep = false; log('sys', `${esc(f.name)} wakes up!`); }
  if (f.hp <= 0 && n > 0 && f.m.special.includes('fortitude') && type !== 'radiant' && !how.crit){
    const sv = d(20) + (f.m.save.con || 0), dc = 5 + n;
    if (sv >= dc){ f.hp = 1; log('sys', `${esc(f.name)} should have fallen, but it lurches upright with 1 hit point (Undead Fortitude: ${sv} vs DC ${dc}).`); return; }
  }
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
  const a = ALLIES[G.ally.key];
  /* a healer tends the hero first when the hero is badly hurt */
  if (a.heal && (G.ally.heals || 0) > 0 && G.char.hp > 0 && G.char.hp <= G.char.maxHp / 2){
    G.ally.heals--;
    heal(a.heal.dice, `${esc(G.ally.name)} casts ${a.heal.name}`);
    log('sys', `${esc(G.ally.name)} can heal ${G.ally.heals} more time${G.ally.heals === 1 ? '' : 's'} before a long rest.`);
    return;
  }
  const times = Math.max(1, a.multi || 1);
  for (let i = 0; i < times; i++){
    const f = target();
    if (!f) return;
    allyStrike(a, f);
  }
}
function allyStrike(a, f){
  const ranged = /bow|sling|crossbow/i.test(a.attack.name);
  if (f.st.cover === 'full'){
    const other = alive().find(x => x.st.cover !== 'full');
    if (ranged && other) f = other;
    else if (ranged){ log('sys', `${esc(G.ally.name)} has no clear shot and waits.`); return; }
    else { f.st.cover = partialCover(); log('sys', `${esc(G.ally.name)} goes around the cover after ${esc(f.name)}.`); }
  }
  const adv = !!f.st.asleep || !!f.st.prone || !!f.st.marked || !!f.st.reckless;
  const r = monsterD20(adv, false);
  const total = r.nat + a.attack.toHit, crit = r.nat === 20;
  let hit = crit || (r.nat !== 1 && total >= foeAC(f));
  log('roll', `${esc(G.ally.name)} ${a.attack.name} at ${esc(f.name)}: ${diceHTML(r)} ${sgn(a.attack.toHit)} = <b>${total}</b> vs AC ${foeAC(f)} <em class="${hit ? 'ok' : 'no'}">${crit ? 'Critical hit!' : hit ? 'Hit' : 'Miss'}</em>`);
  f.st.marked = false;
  if (hit && parries(f, total, crit, !/bow|sling/i.test(a.attack.name))) hit = false;
  if (!hit) return;
  const dr = rollDice(a.attack.dmg, crit);
  damageFoe(f, dr.total, a.attack.type, `${esc(G.ally.name)} ${dr.text}`);
  if (a.trip && f.hp > 0 && !f.st.prone){
    const sv = d(20) + (f.m.save.str || 0);
    if (sv < a.trip){ f.st.prone = true; log('good', `${esc(f.name)} is knocked prone (Strength save ${sv}). Melee attacks against it have advantage.`); }
  }
}
/* A practice bout: blunted weapons, no XP, and everyone is patched up after. */
function startSpar(key, opt){
  opt = opt || {};
  if (!G.char || G.mode !== 'explore' || !MONSTERS[key]) return false;
  G.choices = null; G.shop = null; G.forge = false;
  log('you', opt.prize ? `Step into the arena against ${esc(opt.name || MONSTERS[key].name)}` : `Practice bout against a ${esc(MONSTERS[key].name.toLowerCase())}`);
  log('sys', `Blunted weapons and a referee. Nobody dies, no XP is earned, and your hit points are restored when the bout ends.${opt.prize ? ` The purse is ${opt.prize} gold.` : ''}`);
  startCombat({foes:[opt.name ? {key, name:opt.name} : key], spar:true, cover:'open', prize:opt.prize || 0, sparHP:G.char.hp, sparAlly:G.ally ? G.ally.hp : null, noScale:true});
  return true;
}
function endSpar(won){
  const cfg = G.combat.cfg;
  G.combat = null; G.mode = 'explore';
  G.char.hp = Math.max(1, cfg.sparHP);
  if (G.ally && cfg.sparAlly != null) G.ally.hp = cfg.sparAlly;
  log('round', won === true ? 'You win the bout' : won === false ? 'You yield' : 'Bout over');
  if (won === true && cfg.prize){ G.char.gold += cfg.prize; G.flags.arena_wins = (G.flags.arena_wins || 0) + 1; log('good', `The crowd roars. You collect the purse: <b>${cfg.prize}</b> gold.`); }
  say(won === true ? 'The referee raises your hand. Not bad at all.' : won === false ? 'The referee steps in before anyone gets hurt. Your opponent offers you a hand up.' : 'You step out of the ring.');
  render(); autosave();
}
/* for jobs: remember how many foes in this fight are dead */
function recordKills(c){
  if (!c || !c.cfg.fid || !G.job) return;
  G.job.killed = G.job.killed || {};
  const n = c.foes.filter(f => f.hp <= 0).length;
  if (n) G.job.killed[c.cfg.fid] = (G.job.killed[c.cfg.fid] || 0) + n;
  /* a boss who survives keeps half the damage you did */
  const boss = c.foes.find(f => f.boss && f.hp > 0);
  if (boss){ G.job.wounds = G.job.wounds || {}; G.job.wounds[c.cfg.fid] = Math.min(0.8, (G.job.wounds[c.cfg.fid] || 0) + (1 - boss.hp / boss.max) / 2); }
}
function winCombat(){
  const c = G.combat;
  if (c.cfg.spar) return endSpar(true);
  if (c.cfg.fid && G.job){ G.job.cleared = G.job.cleared || {}; G.job.cleared[c.cfg.fid] = true; }
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
  if (f.st.cover === 'full'){
    if (!w.melee){ notice(`${f.name} is behind full cover. You have no line of sight for a ranged attack. Pick another target, or close in with a melee weapon.`); return; }
    f.st.cover = partialCover(c);
    log('sys', `You go around the cover to reach ${esc(f.name)}${f.st.cover ? `, which still has ${COVER_NAME[f.st.cover]}` : ''}.`);
  }
  stepOutOfCover();
  const adv = c.hidden || !!f.st.marked || !!f.st.asleep || (w.melee && !!f.st.prone) || !!f.st.reckless;
  const dis = !!f.st.hidden || (!w.melee && !!f.st.prone) || !armorTrained();
  const bonus = atkBonus(w);
  const r = d20test({mod:bonus, adv, dis});
  const nat20 = r.nat >= (hasFeat('improvedCritical') ? 19 : 20);
  let hit = nat20 || (r.nat !== 1 && r.total >= foeAC(f));
  const crit = nat20 || (hit && f.st.asleep && w.melee);
  log('roll', `${w.name} at ${esc(f.name)}: ${diceHTML(r)} ${sgn(bonus)} = <b>${r.total}</b> vs AC ${foeAC(f)}${f.st.cover ? ` (${COVER_NAME[f.st.cover]})` : ''} <em class="${hit ? 'ok' : 'no'}">${crit ? 'Critical hit!' : hit ? 'Hit' : 'Miss'}</em>${r.note}`);
  c.hidden = false; f.st.marked = false; f.st.hidden = false;
  if (hit && !nat20 && foeShield(f, r.total)) hit = false;
  if (hit && parries(f, r.total, crit, w.melee)) hit = false;
  if (hit){
    const dr = rollDice(w.dmg, crit);
    let n = dr.total + wAbil(w) + (w.bonus || 0), txt = `${w.name} ${dr.text} ${sgn(wAbil(w) + (w.bonus || 0))}`;
    if (hasFeat('sneakAttack') && !c.sneakUsed && (r.net === 'adv' || (allyUp() && r.net !== 'dis'))){
      const s = rollDice(sneakDice(), crit); n += s.total; c.sneakUsed = true; txt += ` + Sneak Attack ${s.text}`;
    }
    damageFoe(f, Math.max(1, n), w.type, txt, {melee:w.melee, magic:w.magic, crit});
  }
  endAction();
}
function castSpell(id, onAlly, scroll, alloc){
  const c = G.combat, sp = SPELLS[id];
  const tgt = target();
  if ((sp.kind === 'attack' || sp.kind === 'save') && tgt && tgt.st.cover === 'full'){ notice(`${tgt.name} is behind full cover. You have no line of sight for ${sp.name}. Pick another target.`); return; }
  if (sp.kind === 'missile' && !alloc){
    if (!scroll && (!armorTrained() || G.char.slots.left <= 0)) return;
    c.mm = {id, scroll:scroll || null, darts:mmDarts(sp), alloc:{}};
    const first = alive().find(x => x === tgt && x.st.cover !== 'full') || alive().find(x => x.st.cover !== 'full');
    if (first) c.mm.alloc[first.uid] = c.mm.darts;
    render(); return;
  }
  c.mm = null;
  stepOutOfCover();
  if (scroll){
    if (!has(scroll)) return;
    takeItem(scroll); G._scroll = true;
  } else {
    if (!armorTrained()){ notice("You can't cast spells in armor you aren't trained in."); return; }
    if (sp.level > 0){ if (G.char.slots.left <= 0) return; G.char.slots.left--; }
  }
  const f = target();
  log('sys', scroll ? `You read a scroll of ${sp.name}. The parchment crumbles to ash.` : `You cast ${sp.name}${sp.level ? ' (1 slot)' : ''}.`);
  if ((sp.kind === 'attack' || sp.kind === 'save') && spellImmune(f)){
    log('sys', `The ${sp.name} washes over ${esc(f.name)} and does nothing. It is immune to spells.`);
  } else if (sp.kind === 'attack'){
    const adv = c.hidden || !!f.st.marked || !!f.st.asleep || !!f.st.reckless, dis = !!f.st.hidden || !!f.st.prone;
    const r = d20test({mod:spellAtk(), adv, dis});
    const crit = r.nat === 20;
    let hit = crit || (r.nat !== 1 && r.total >= foeAC(f));
    log('roll', `${sp.name} at ${esc(f.name)}: ${diceHTML(r)} ${sgn(spellAtk())} = <b>${r.total}</b> vs AC ${foeAC(f)}${f.st.cover ? ` (${COVER_NAME[f.st.cover]})` : ''} <em class="${hit ? 'ok' : 'no'}">${crit ? 'Critical hit!' : hit ? 'Hit' : 'Miss'}</em>${r.note}`);
    c.hidden = false; f.st.marked = false; f.st.hidden = false;
    if (hit && !crit && foeShield(f, r.total)) hit = false;
    if (hit){
      const dr = rollDice(sp.dmg, crit);
      damageFoe(f, dr.total, sp.type, `${sp.name} ${dr.text}`, {magic:true});
      if (sp.mark && f.hp > 0){ f.st.marked = true; log('sys', `${esc(f.name)} glows with light. Your next attack on it has advantage.`); }
    }
  } else if (sp.kind === 'save'){
    const sv = foeSave(f, sp.save, true);
    const ok = sv.total >= spellDC();
    log('roll', `${esc(f.name)} ${ABIL_NAME[sp.save]} save: ${sv.text} vs DC ${spellDC()} <em class="${ok ? 'no' : 'ok'}">${ok ? 'Saved' : 'Failed'}</em>`);
    if (!ok){ const dr = rollDice(sp.dmg); damageFoe(f, dr.total, sp.type, `${sp.name} ${dr.text}`, {magic:true}); }
  } else if (sp.kind === 'missile'){
    /* Magic Missile: every dart hits automatically. One damage roll is shared by all
       the darts, and they strike at the same moment. Cover short of full cover
       does not stop them. Full cover, a Shield spell, a deflecting brooch, or
       immunity to spells does. */
    const dr = rollDice(sp.dmg), total = Object.values(alloc).reduce((a, b) => a + b, 0);
    log('roll', `${sp.name}: ${total} dart${total > 1 ? 's' : ''} of force, ${dr.text} each. They never miss.`);
    Object.entries(alloc).forEach(([uid, k]) => {
      const t = c.foes.find(x => String(x.uid) === String(uid));
      if (!t || !k) return;
      const lbl = `${k} dart${k > 1 ? 's' : ''}`, The = k > 1 ? `The ${k} darts` : 'The dart', v = (one, many) => k > 1 ? many : one;
      if (t.hp <= 0 || t.st.fled || t.st.turned){ log('sys', `${The} meant for ${esc(t.name)} ${v('winks', 'wink')} out.`); return; }
      if (t.st.cover === 'full'){ log('sys', `${The} cannot find ${esc(t.name)} behind full cover and ${v('fades', 'fade')} away.`); return; }
      if (spellImmune(t)){ log('sys', `${The} ${v('fizzles', 'fizzle')} against ${esc(t.name)}. It is immune to spells.`); return; }
      if ((t.m.special || []).includes('mmimmune')){ log('sys', `Something on ${esc(t.name)} drinks in ${The.toLowerCase()}. A deflection charm: no effect.`); return; }
      if (foeShield(t, null)) return;
      damageFoe(t, k * dr.total, sp.type, `${sp.name}, ${lbl} x ${dr.total}`, {magic:true});
    });
  } else if (sp.kind === 'sleep'){
    let pool = rollDice(sp.pool);
    log('roll', `Sleep: ${pool.text} = <b>${pool.total}</b> hit points of creatures`);
    let left = pool.total;
    const order = alive().filter(x => !x.st.asleep && x.m.type !== 'undead' && !spellImmune(x) && x.st.cover !== 'full').sort((a, b) => a.hp - b.hp);
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
      if (x.st.cover === 'full'){ log('sys', `${esc(x.name)} is safe behind full cover.`); return; }
      if (spellImmune(x)){ log('sys', `${esc(x.name)} is immune to spells.`); return; }
      const sv = foeSave(x, sp.save, true), ok = sv.total >= spellDC();
      const ev = sp.save === 'dex' && x.m.special.includes('evasion');
      log('roll', `${esc(x.name)} ${ABIL_NAME[sp.save]} save: ${sv.text} vs DC ${spellDC()} <em class="${ok ? 'no' : 'ok'}">${ok ? (ev ? 'Evasion, no damage' : 'Half damage') : (ev ? 'Failed, Evasion halves it' : 'Failed')}</em>`);
      const n = ok ? (ev ? 0 : Math.floor(dr.total / 2)) : (ev ? Math.floor(dr.total / 2) : dr.total);
      if (n > 0) damageFoe(x, n, sp.type, sp.name);
    });
  } else if (sp.kind === 'heal'){
    castHeal(sp, onAlly);
  }
  G._scroll = false;
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
  if (ITEMS[id] && ITEMS[id].use === 'escape'){ takeItem(id); log('sys', 'You smash the smoke pellet. Grey smoke boils up around you.'); fleeAction(true); return; }
  if (ITEMS[id] && ITEMS[id].use === 'scroll'){ castSpell(ITEMS[id].spell, onAlly, id); return; }
  useItem(id, onAlly);
  if (hasFeat('fastHands') && !G.combat.bonusUsed){ G.combat.bonusUsed = true; log('sys', 'Fast Hands: that took only your bonus action.'); render(); return; }
  endAction();
}
function turnUndead(){
  const c = G.combat;
  G.char.uses.turnUndead--;
  log('sys', 'You raise your holy symbol and call on the light.');
  alive().filter(f => f.m.type === 'undead').forEach(f => {
    const sv = foeSave(f, 'wis', true), ok = sv.total >= spellDC();
    log('roll', `${esc(f.name)} Wisdom save: ${sv.text} vs DC ${spellDC()} <em class="${ok ? 'no' : 'ok'}">${ok ? 'Resists' : 'Turned'}</em>`);
    if (!ok){ f.st.turned = true; log('good', `${esc(f.name)} flees from your light.`); }
  });
  endAction();
}
function fleeAction(auto){
  const c = G.combat;
  let ok = auto === true;
  if (!ok){
    const dc = 10 + alive().length;
    const k = bestSkill(['athletics', 'acrobatics']);
    const m = skillMod(k);
    const r = d20test({mod:m});
    ok = r.total >= dc;
    log('roll', `Flee (${SKILLS[k][0]}): ${diceHTML(r)} ${sgn(m)} = <b>${r.total}</b> vs DC ${dc} <em class="${ok ? 'ok' : 'no'}">${ok ? 'Escaped' : 'Cut off'}</em>${r.note}`);
  }
  if (ok && c.cfg.spar){ endSpar(null); return; }
  if (ok){
    const cfg = c.cfg;
    recordKills(c);
    G.combat = null; G.mode = 'explore';
    say('You break away and run.');
    if (cfg.flee) goTo(cfg.flee); else { render(); autosave(); }
    return;
  }
  endAction();
}

/* ---------- saving ---------- */
function snapshot(){ return JSON.stringify({v:G.v, char:G.char, scene:G.scene, flags:G.flags, visits:G.visits, alert:G.alert, ally:G.ally, bench:G.bench, scaling:G.scaling, rep:G.rep, job:G.job, captive:G.captive, module:G.module, bestiary:BESTIARY, log:G.log.slice(-120), mode:'explore'}); }
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

