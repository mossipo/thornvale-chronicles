/* =====================================================================
   THORNVALE CHRONICLES : library.js
   Equipment actions, shops, your bestiary, the stat block reader,
   adventure files, reader mode, solo GM tools, the map, backstory, and
   PDF character sheet import.
   ===================================================================== */
'use strict';

/* =====================================================================
   6. LIBRARY: equipment actions, shops, your bestiary, adventure files,
      solo GM tools, the map, backstory, and PDF character sheets
   ===================================================================== */

/* ---------- equipment actions ---------- */
function toggleWeapon(id){
  if (G.mode !== 'explore') return;
  const e = equipOf();
  if (e.weapons.includes(id)){ e.weapons = e.weapons.filter(x => x !== id); log('sys', `You stow your ${esc(ITEMS[id].name)}.`); }
  else {
    if (ITEMS[id].props.includes('two') && shieldOn()){ notice(`The ${ITEMS[id].name} needs two hands. Take off your shield first.`); return; }
    if (e.weapons.length >= 3){ notice('You can keep three weapons ready. Stow one first.'); return; }
    e.weapons.push(id);
    log('sys', `You ready your ${esc(ITEMS[id].name)}.${profWeapon(id) ? '' : ' You are not proficient with it, so your proficiency bonus will not add to your attacks.'}`);
  }
  render(); autosave();
}
function wearArmor(id){
  if (G.mode !== 'explore') return;
  const e = equipOf();
  if (e.armor === id){ e.armor = null; log('sys', `You take off your ${esc(ITEMS[id].name)}.`); }
  else {
    const a = ITEMS[id];
    e.armor = id;
    log('sys', `You put on your ${esc(a.name)}.${cls().prof.armor.includes(a.armor) ? '' : ` You are not trained in ${a.armor} armor: disadvantage on Strength and Dexterity rolls, and no spellcasting while you wear it.`}`);
  }
  render(); autosave();
}
function toggleShield(){
  if (G.mode !== 'explore') return;
  const e = equipOf();
  if (e.shield){ e.shield = false; log('sys', 'You sling your shield across your back.'); }
  else {
    const two = e.weapons.find(id => ITEMS[id] && ITEMS[id].props && ITEMS[id].props.includes('two'));
    if (two){ notice(`Stow your ${ITEMS[two].name} first. It needs two hands.`); return; }
    e.shield = true;
    log('sys', `You strap on your shield.${cls().prof.armor.includes('shield') ? '' : ' You are not trained with shields: disadvantage on Strength and Dexterity rolls, and no spellcasting.'}`);
  }
  render(); autosave();
}

/* ---------- shops ---------- */
const priceOf = (shop, id) => { const o = (SHOPS[shop].prices || {})[id]; return Math.max(1, Math.round(o !== undefined ? o : (ITEMS[id].cost || 1))); };
const sellPrice = id => Math.floor((ITEMS[id].cost || 0) / 2);
function shopNote(id){
  const it = ITEMS[id];
  if (it.kind === 'weapon' && !profWeapon(id)) return 'You are not proficient with this.';
  if (it.kind === 'armor' && !cls().prof.armor.includes(it.armor)) return 'You are not trained in this armor.';
  if (it.kind === 'shield' && !cls().prof.armor.includes('shield')) return 'You are not trained with shields.';
  return '';
}
function buy(id){
  const pr = priceOf(G.shop, id);
  if (G.char.gold < pr) return;
  G.char.gold -= pr; addItem(id);
  log('good', `Bought: ${esc(ITEMS[id].name)} for ${pr} gp.${ITEMS[id].kind ? ' Ready it or put it on from your Pack tab.' : ''}`);
  render(); autosave();
}
function sell(id){
  const pr = sellPrice(id);
  if (!owns(id)) return;
  takeItem(id); G.char.gold += pr;
  const e = equipOf();
  if (!owns(id)){ e.weapons = e.weapons.filter(x => x !== id); if (e.armor === id) e.armor = null; if (id === 'shield') e.shield = false; }
  log('sys', `Sold: ${esc(ITEMS[id].name)} for ${pr} gp.`);
  render(); autosave();
}
function renderShop(box){
  const s = SHOPS[G.shop], ch = G.char;
  let h = `<div class="shop"><div class="shophead"><div><span class="lbl2">Shop</span><b>${esc(s.name)}</b></div><span class="gold">${ch.gold} gp</span></div><p class="small" style="margin:0">${esc(s.blurb)}</p>`;
  const groups = [['Supplies', id => !ITEMS[id].kind], ['Weapons', id => ITEMS[id].kind === 'weapon'], ['Armor and shields', id => ITEMS[id].kind === 'armor' || ITEMS[id].kind === 'shield']];
  groups.forEach(([name, test]) => {
    const ids = s.stock.filter(id => ITEMS[id] && test(id));
    if (!ids.length) return;
    h += `<h4 class="shoph">${name}</h4><div class="shoplist">`;
    ids.forEach(id => {
      const it = ITEMS[id], pr = priceOf(G.shop, id), note = shopNote(id);
      h += `<div class="sitem"><div class="it"><b>${esc(it.name)}</b>${owns(id) ? ` <span class="chip">Have ${ch.inv[id]}</span>` : ''}<p>${esc(it.desc)}${note ? ` <span class="warn">${note}</span>` : ''}</p></div><button type="button" class="mini" data-buy="${id}" ${ch.gold >= pr ? '' : 'disabled'}>Buy · ${pr} gp</button></div>`;
    });
    h += `</div>`;
  });
  const sellable = Object.keys(ch.inv).filter(id => ITEMS[id] && !ITEMS[id].quest && ch.inv[id] > 0 && sellPrice(id) > 0);
  if (sellable.length){
    h += `<h4 class="shoph">Sell from your pack</h4><div class="shoplist">` + sellable.map(id => `<div class="sitem"><div class="it"><b>${esc(ITEMS[id].name)}</b> <span class="chip">x${ch.inv[id]}</span></div><button type="button" class="mini" data-sell="${id}">Sell · ${sellPrice(id)} gp</button></div>`).join('') + `</div>`;
  }
  h += `</div>`;
  box.innerHTML = h;
  box.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => buy(b.dataset.buy)));
  box.querySelectorAll('[data-sell]').forEach(b => b.addEventListener('click', () => sell(b.dataset.sell)));
  const leave = document.createElement('button');
  leave.type = 'button'; leave.className = 'choice';
  leave.innerHTML = `<span class="k">1</span><span class="lbl">Leave the shop</span>`;
  leave.addEventListener('click', () => { G.shop = null; log('you', 'Leave the shop'); render(); autosave(); });
  box.appendChild(leave);
  keyActions.push(leave);
}

/* ---------- your bestiary ---------- */
const BESTIARY_KEY = 'thornvale_bestiary_v1';
const AREA_TAGS = ['wilds', 'marsh', 'dungeon', 'crypt', 'tower'];
let BESTIARY = [];
const slug = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'creature';
const DICE_RE = /^(\d*d\d+([+-]\d+)?|\d+)$/i;
function normMonster(m){
  const atks = (m.attacks || []).filter(a => a && a.dmg && DICE_RE.test(String(a.dmg).replace(/\s+/g, '')))
    .map(a => ({name:a.name || 'Attack', toHit:parseInt(a.toHit, 10) || 0, dmg:String(a.dmg).replace(/\s+/g, ''), type:(a.type || 'bludgeoning').toLowerCase()}));
  if (!atks.length) atks.push({name:'Strike', toHit:3, dmg:'1d6+1', type:'bludgeoning'});
  const type = (m.type || 'monstrosity').toLowerCase();
  const special = [...new Set([...(m.special || []), ...(type === 'undead' ? ['undead'] : [])])];
  return {name:m.name || 'Creature', ac:parseInt(m.ac, 10) || 10, hp:Math.max(1, parseInt(m.hp, 10) || 1), xp:parseInt(m.xp, 10) || 0,
    pp:parseInt(m.pp, 10) || 10, init:parseInt(m.init, 10) || 0, type, special,
    save:Object.assign({str:0, dex:0, con:0, int:0, wis:0, cha:0}, m.save || {}),
    attacks:atks, attack:atks[0], multi:Math.max(1, parseInt(m.multi, 10) || 1),
    vuln:m.vuln || [], immune:m.immune || [], custom:true};
}
function registerCustom(m){ MONSTERS['my_' + m.id] = normMonster(m); }
function loadBestiary(){
  try { BESTIARY = JSON.parse(localStorage.getItem(BESTIARY_KEY) || '[]'); } catch (e){ BESTIARY = []; }
  if (!Array.isArray(BESTIARY)) BESTIARY = [];
  BESTIARY.forEach(registerCustom);
}
function saveBestiary(){ try { localStorage.setItem(BESTIARY_KEY, JSON.stringify(BESTIARY)); } catch (e){} }
function mergeBestiary(list){
  let added = 0;
  list.forEach(m => {
    if (!m || !m.name) return;
    m.id = m.id || slug(m.name);
    const i = BESTIARY.findIndex(x => x.id === m.id);
    if (i >= 0) BESTIARY[i] = m; else { BESTIARY.push(m); added++; }
    registerCustom(m);
  });
  saveBestiary();
  return added;
}

/* Reads a monster stat block pasted from a book (2014 or 2024 layout). */
function parseStatBlock(txt){
  const t = String(txt).replace(/[\u2212\u2013\u2014]/g, '-').replace(/\r/g, '');
  const lines = t.split('\n').map(x => x.trim()).filter(Boolean);
  const g = re => { const x = t.match(re); return x ? x[1] : null; };
  const m = {name:(lines[0] || 'Creature').replace(/\s+/g, ' ').slice(0, 40), attacks:[], special:[], save:{}, vuln:[], immune:[]};
  const tl = t.match(/\b(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+([A-Za-z]+)/);
  if (tl) m.type = tl[2].toLowerCase();
  m.ac = parseInt(g(/Armor Class\s+(\d+)/i) || g(/\bAC\s+(\d+)/) || '10', 10);
  m.hp = parseInt(g(/Hit Points\s+(\d+)/i) || g(/\bHP\s+(\d+)/) || '1', 10);
  const scores = [...t.matchAll(/\b(\d{1,2})\s*\(\s*([+-]\s*\d+)\s*\)/g)].map(x => parseInt(x[2].replace(/\s/g, ''), 10));
  if (scores.length >= 6){ ABILS.forEach((a, i) => { m.save[a] = scores[i]; }); m.init = scores[1]; }
  [...t.matchAll(/\b(Str|Dex|Con|Int|Wis|Cha)\s+(\d{1,2})\s+([+-]\d+)\s+([+-]\d+)/gi)].forEach(x => {
    const a = x[1].toLowerCase(); m.save[a] = parseInt(x[4], 10); if (a === 'dex') m.init = parseInt(x[3], 10);
  });
  const sv = g(/Saving Throws\s+([^\n]+)/i);
  if (sv) [...sv.matchAll(/\b(Str|Dex|Con|Int|Wis|Cha)\w*\s*([+-]\d+)/gi)].forEach(x => { m.save[x[1].toLowerCase()] = parseInt(x[2], 10); });
  m.pp = parseInt(g(/passive Perception\s+(\d+)/i) || '10', 10);
  const xp = g(/\(\s*([\d,]+)\s*XP/i);
  m.xp = xp ? parseInt(xp.replace(/,/g, ''), 10) : 0;
  const atkRe = /(?:^|\n)\s*([A-Z][^.\n]{0,40}?)\.\s*(?:Melee or Ranged|Melee|Ranged)\s+(?:Weapon\s+|Spell\s+)?Attack(?:\s+Roll)?:\s*([+-]\d+)[\s\S]{0,220}?Hit:\s*\d+\s*\(([^)]+)\)\s*([A-Za-z]+)\s+damage/g;
  for (const x of t.matchAll(atkRe)) m.attacks.push({name:x[1].replace(/\s*\([^)]*\)\s*$/, '').trim(), toHit:parseInt(x[2], 10), dmg:x[3].replace(/\s+/g, ''), type:x[4].toLowerCase()});
  const mu = t.match(/Multiattack\.[\s\S]{0,80}?\b(two|three|four|2|3|4)\b/i);
  if (mu) m.multi = ({two:2, three:3, four:4})[mu[1].toLowerCase()] || parseInt(mu[1], 10);
  if (/Pack Tactics/i.test(t)) m.special.push('pack');
  if (/Nimble Escape/i.test(t)) m.special.push('nimble');
  if (/Martial Advantage/i.test(t)) m.special.push('martial');
  const vul = g(/Vulnerabilities\s+([^\n]+)/i);
  if (vul) m.vuln = DMG_TYPES.filter(x => vul.toLowerCase().includes(x));
  const imm = g(/Damage Immunities\s+([^\n]+)/i) || g(/(?:^|\n)\s*Immunities\s+([^\n]+)/i);
  if (imm) m.immune = DMG_TYPES.filter(x => imm.split(';')[0].toLowerCase().includes(x));
  return m;
}

/* ---------- adventure files ---------- */
const MOD_EFFECTS = new Set(['text','go','gold','xp','item','take','pay','heal','insp','set','unset','damage','fight','surprise','ambush','win','flee','noflee','rout','shop','end']);
const BARE_EFFECTS = new Set(['insp', 'noflee', 'end']);
const SKILL_BY_NAME = {};
Object.entries(SKILLS).forEach(([k, [n]]) => { SKILL_BY_NAME[k] = k; SKILL_BY_NAME[n.toLowerCase()] = k; });
const ABIL_BY_NAME = {};
ABILS.forEach(a => { ABIL_BY_NAME[a] = a; ABIL_BY_NAME[ABIL_NAME[a].toLowerCase()] = a; });
let MOD = null, READER = null;

function clearModule(){
  for (const k of Object.keys(STORY)) if (k.startsWith('m:')) delete STORY[k];
  for (const k of Object.keys(MONSTERS)) if (k.startsWith('mod_')) delete MONSTERS[k];
  for (const k of Object.keys(ITEMS)) if (k.startsWith('mi_')) delete ITEMS[k];
  for (const k of Object.keys(ENCOUNTERS)) if (k.startsWith('mt_')) delete ENCOUNTERS[k];
  MOD = null; READER = null;
}
function parseModule(raw){
  const lines = String(raw).replace(/\r\n?/g, '\n').split('\n');
  const mod = {title:'', start:null, author:'', scenes:{}, monsters:{}, items:{}, tables:{}, order:[], errors:[]};
  const blocks = [];
  let block = null;
  lines.forEach((t, i) => {
    const m = t.match(/^\s*==\s*(SCENE|MONSTER|ITEM|TABLE)\s*:\s*([A-Za-z0-9_-]+)\s*$/i);
    if (m){ block = {kind:m[1].toUpperCase(), id:m[2].toLowerCase(), lines:[], at:i + 1}; blocks.push(block); return; }
    if (block){ block.lines.push({n:i + 1, t}); return; }
    const h = t.match(/^\s*(TITLE|START|AUTHOR)\s*:\s*(.*)$/i);
    if (h){ const k = h[1].toLowerCase(), v = h[2].trim(); if (k === 'title') mod.title = v; else if (k === 'start') mod.start = v.toLowerCase(); else mod.author = v; }
  });
  if (!blocks.some(b => b.kind === 'SCENE')) return null;
  blocks.forEach(b => {
    if (b.kind === 'MONSTER') parseMonsterBlock(b, mod);
    else if (b.kind === 'ITEM') parseItemBlock(b, mod);
    else if (b.kind === 'TABLE') mod.tables[b.id] = b;
    else { mod.scenes[b.id] = b; mod.order.push(b.id); }
  });
  if (!mod.start) mod.start = mod.order[0];
  if (!mod.scenes[mod.start]) mod.errors.push(`START is "${mod.start}", but there is no "== SCENE: ${mod.start}".`);
  return mod;
}
function parseAttackLine(v){
  const x = v.match(/^(.+?)\s+([+-]\d+)\s+(\d*d\d+(?:\s*[+-]\s*\d+)?|\d+)\s+([a-z]+)\s*$/i);
  return x ? {name:x[1].trim(), toHit:parseInt(x[2], 10), dmg:x[3].replace(/\s+/g, ''), type:x[4].toLowerCase()} : null;
}
function parseMonsterBlock(b, mod){
  const kv = {}, attacks = [];
  let stat = null;
  b.lines.forEach(({n, t}) => {
    if (stat){ stat.push(t); return; }
    const m = t.match(/^\s*([a-z]+)\s*:\s*(.*)$/i);
    if (!m) return;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'statblock'){ stat = v ? [v] : []; return; }
    if (k === 'attack'){
      const a = parseAttackLine(v);
      if (a) attacks.push(a); else mod.errors.push(`Line ${n}: I could not read the attack "${v}". Write it like: attack: Bite +5 1d6+3 piercing`);
    } else kv[k] = v;
  });
  const m = stat ? parseStatBlock(stat.join('\n')) : {name:b.id, attacks:[], special:[], save:{}};
  if (kv.name) m.name = kv.name;
  ['ac', 'hp', 'xp', 'pp', 'init', 'multi'].forEach(k => { if (kv[k] !== undefined) m[k] = parseInt(kv[k], 10); });
  if (kv.type) m.type = kv.type.toLowerCase();
  if (kv.special) m.special = kv.special.toLowerCase().split(/[\s,]+/).filter(Boolean);
  if (kv.saves) [...kv.saves.matchAll(/\b(str|dex|con|int|wis|cha)\s*([+-]\d+)/gi)].forEach(x => { m.save[x[1].toLowerCase()] = parseInt(x[2], 10); });
  if (kv.vuln) m.vuln = DMG_TYPES.filter(x => kv.vuln.toLowerCase().includes(x));
  if (kv.immune) m.immune = DMG_TYPES.filter(x => kv.immune.toLowerCase().includes(x));
  if (attacks.length) m.attacks = attacks;
  if (!m.attacks || !m.attacks.length) mod.errors.push(`Monster "${b.id}" (line ${b.at}) has no attacks I can read. Add a line like: attack: Bite +5 1d6+3 piercing`);
  mod.monsters[b.id] = m;
}
function parseItemBlock(b, mod){
  const kv = {};
  b.lines.forEach(({t}) => { const m = t.match(/^\s*([a-z]+)\s*:\s*(.*)$/i); if (m) kv[m[1].toLowerCase()] = m[2].trim(); });
  const it = {name:kv.name || b.id, desc:kv.desc || '', cost:parseInt(kv.cost, 10) || 0};
  if (kv.heal){ it.use = 'heal'; it.heal = kv.heal.replace(/\s+/g, ''); }
  if (/^(yes|true)$/i.test(kv.insp || '')) it.use = 'insp';
  if (kv.ac) it.ac = parseInt(kv.ac, 10) || 0;
  if (/^(yes|true)$/i.test(kv.quest || '')) it.quest = true;
  mod.items[b.id] = it;
}
function buildModule(mod){
  const err = msg => mod.errors.push(msg);
  const sceneId = id => mod.scenes[id] ? 'm:' + id : null;
  const monsterKey = name => {
    const n = String(name).toLowerCase().trim();
    if (mod.monsters[n]) return 'mod_' + n;
    if (MONSTERS[n]) return n;
    if (MONSTERS['my_' + slug(n)]) return 'my_' + slug(n);
    return Object.keys(MONSTERS).find(k => MONSTERS[k].name.toLowerCase() === n) || null;
  };
  const itemKey = name => {
    const n = String(name).toLowerCase().trim();
    if (mod.items[n]) return 'mi_' + n;
    if (ITEMS[n]) return n;
    if (ITEMS['w_' + n]) return 'w_' + n;
    if (ITEMS['a_' + n]) return 'a_' + n;
    return Object.keys(ITEMS).find(k => ITEMS[k].name.toLowerCase() === n) || null;
  };
  const flag = f => 'm.' + f.trim().toLowerCase();
  Object.entries(mod.monsters).forEach(([id, m]) => { MONSTERS['mod_' + id] = normMonster(m); });
  Object.entries(mod.items).forEach(([id, it]) => { ITEMS['mi_' + id] = it; });

  function parseCond(v, where){
    const tests = v.split(',').map(x => x.trim()).filter(Boolean).map(p0 => {
      let p = p0, neg = false, m, t;
      if (p.startsWith('!')){ neg = true; p = p.slice(1).trim(); }
      if ((m = p.match(/^has\s+(.+)$/i))){
        const k = itemKey(m[1]);
        if (!k) err(`${where}: unknown item "${m[1]}" in if:.`);
        t = () => !!k && has(k);
      } else if ((m = p.match(/^(gold|level|hp)\s*(>=|<=|>|<|=)\s*(\d+)$/i))){
        const what = m[1].toLowerCase(), op = m[2], n = +m[3];
        t = G => { const x = what === 'gold' ? G.char.gold : what === 'level' ? G.char.level : G.char.hp; return op === '>=' ? x >= n : op === '<=' ? x <= n : op === '>' ? x > n : op === '<' ? x < n : x === n; };
      } else { const f = flag(p); t = G => !!G.flags[f]; }
      return neg ? (G => !t(G)) : t;
    });
    return G => tests.every(t => t(G));
  }
  function skillList(txt, where){
    const list = txt.split(/\s+or\s+/).map(x => SKILL_BY_NAME[x.trim()]).filter(Boolean);
    if (!list.length){ err(`${where}: unknown skill "${txt}".`); return 'athletics'; }
    return list.length === 1 ? list[0] : list;
  }
  function parseCheck(v, where){
    const s0 = v.trim().toLowerCase();
    let m;
    if ((m = s0.match(/^save\s+(\w+)\s+(\d+)$/))){ const a = ABIL_BY_NAME[m[1]]; if (!a) err(`${where}: unknown ability "${m[1]}".`); return {save:a || 'dex', dc:+m[2]}; }
    if ((m = s0.match(/^(.+?)\s+vs\s+(.+)$/))){
      const foes = m[2].split(/\s*,\s*|\s+and\s+/).map(monsterKey).filter(Boolean);
      if (!foes.length) err(`${where}: unknown monster in "${v}".`);
      return {skill:skillList(m[1], where), vsFoes:foes.length ? foes : ['goblin']};
    }
    if ((m = s0.match(/^(.+?)\s+contest\s+([+-]?\d+)$/))) return {skill:skillList(m[1], where), contest:{name:'Your opponent', mod:+m[2]}};
    if ((m = s0.match(/^(.+?)\s+(\d+)$/))){
      const name = m[1].trim();
      if (ABIL_BY_NAME[name]) return {ability:ABIL_BY_NAME[name], dc:+m[2]};
      return {skill:skillList(name, where), dc:+m[2]};
    }
    err(`${where}: I could not read the check "${v}". Try "stealth 12", "save dex 12", "stealth vs goblin" or "athletics contest 5".`);
    return {ability:'str', dc:10};
  }
  function addEffect(o, k, v, where, ctx){
    let m;
    switch (k){
      case 'text': o.text = (o.text ? o.text + ' ' : '') + esc(v); break;
      case 'go': { const id = sceneId(v.toLowerCase()); if (!id) err(`${where}: there is no scene "${v}".`); else o.go = id; break; }
      case 'gold': o.give = Object.assign(o.give || {}, {gold:/d/i.test(v) ? v.replace(/\s+/g, '') : (parseInt(v, 10) || 0)}); break;
      case 'xp': o.give = Object.assign(o.give || {}, {xp:parseInt(v, 10) || 0}); break;
      case 'heal': o.give = Object.assign(o.give || {}, {heal:v.replace(/\s+/g, '')}); break;
      case 'insp': o.give = Object.assign(o.give || {}, {insp:true}); break;
      case 'item': case 'take': {
        m = v.match(/^(.+?)(?:\s+x(\d+))?$/i);
        const key = m && itemKey(m[1]);
        if (!key){ err(`${where}: unknown item "${v}".`); break; }
        const bag = k === 'item' ? (o.give = o.give || {}) : (o.take = o.take || {});
        bag.items = Object.assign(bag.items || {}, {[key]:parseInt(m[2] || '1', 10)});
        break;
      }
      case 'pay': o.take = Object.assign(o.take || {}, {gold:parseInt(v, 10) || 0}); break;
      case 'set': o.set = Object.assign(o.set || {}, Object.fromEntries(v.split(',').filter(x => x.trim()).map(f => [flag(f), true]))); break;
      case 'unset': { const fl = v.split(',').filter(x => x.trim()).map(flag), prev = o.fn; o.fn = G => { if (prev) prev(G); fl.forEach(f => delete G.flags[f]); }; break; }
      case 'damage': {
        m = v.match(/^(\d*d\d+(?:\s*[+-]\s*\d+)?|\d+)\s*([a-z]*)\s*(?:save\s+(\w+)\s+(\d+)\s*(half)?)?$/i);
        if (!m){ err(`${where}: I could not read the damage "${v}". Try "1d6 piercing" or "2d6 fire save dex 12 half".`); break; }
        o.damage = {dice:m[1].replace(/\s+/g, ''), type:(m[2] || '').toLowerCase()};
        if (m[3]) o.damage.save = {ability:ABIL_BY_NAME[m[3].toLowerCase()] || 'dex', dc:+m[4], half:!!m[5]};
        break;
      }
      case 'fight': {
        const foes = [];
        v.split(',').forEach(part => {
          const x = part.trim().match(/^(.+?)(?:\s+x(\d+))?$/i);
          if (!x) return;
          const key = monsterKey(x[1]);
          if (!key){ err(`${where}: unknown monster "${x[1]}".`); return; }
          for (let i = 0; i < Math.min(8, parseInt(x[2] || '1', 10)); i++) foes.push(key);
        });
        if (foes.length) ctx.fight = Object.assign(ctx.fight || {}, {foes});
        break;
      }
      case 'surprise': ctx.fight = Object.assign(ctx.fight || {}, {surprise:/^(enemy|you|hero)/i.test(v) ? 'enemy' : 'player'}); break;
      case 'ambush': ctx.fight = Object.assign(ctx.fight || {}, {ambush:{stealth:parseInt(v, 10) || 0}}); break;
      case 'rout': ctx.fight = Object.assign(ctx.fight || {}, {rout:parseInt(v, 10) || 1}); break;
      case 'noflee': ctx.fight = Object.assign(ctx.fight || {}, {noFlee:true}); break;
      case 'flee': { const id = sceneId(v.toLowerCase()); if (!id) err(`${where}: there is no scene "${v}".`); else ctx.fight = Object.assign(ctx.fight || {}, {flee:id}); break; }
      case 'win': ctx.fight = Object.assign(ctx.fight || {}, {win:outcomeLine(v, where)}); break;
      case 'shop': if (SHOPS[v.toLowerCase()]) o.shop = v.toLowerCase(); else err(`${where}: unknown shop "${v}". Shops: ${Object.keys(SHOPS).join(', ')}.`); break;
      case 'end': { const prev = o.fn; o.fn = G => { if (prev) prev(G); if (G.module) G.module.done = true; log('level', 'Adventure complete'); }; break; }
    }
  }
  function finishFight(o, ctx, where){
    if (!ctx.fight) return;
    if (!ctx.fight.foes){ err(`${where}: has fight settings (win, flee, surprise) but no "fight:" line.`); return; }
    o.fight = ctx.fight;
    if (o.go){ if (!o.fight.win) o.fight.win = o.go; delete o.go; }
  }
  function outcomeLine(v, where){
    const o = {}, ctx = {};
    v.split(/\s*;\s*/).filter(x => x.trim()).forEach(seg => {
      const s1 = seg.trim(), kv = s1.match(/^([a-z]+)\s*:\s*(.*)$/i);
      if (kv && MOD_EFFECTS.has(kv[1].toLowerCase())) addEffect(o, kv[1].toLowerCase(), kv[2].trim(), where, ctx);
      else if (BARE_EFFECTS.has(s1.toLowerCase())) addEffect(o, s1.toLowerCase(), '', where, ctx);
      else if (!/\s/.test(s1) && sceneId(s1.toLowerCase())) o.go = sceneId(s1.toLowerCase());
      else addEffect(o, 'text', s1, where, ctx);
    });
    finishFight(o, ctx, where);
    return o;
  }
  function buildOption(op, sid, idx){
    const where = `Line ${op.n} (${op.label})`;
    const o = {label:op.label}, ctx = {};
    let check = null, pass = null, fail = null;
    op.keys.forEach(({k, v, n}) => {
      const w = `Line ${n}`;
      if (k === 'if') o.if = parseCond(v, w);
      else if (k === 'once') o.once = `m.${sid}.${idx}`;
      else if (k === 'check') check = parseCheck(v, w);
      else if (k === 'pass') pass = outcomeLine(v, w);
      else if (k === 'fail') fail = outcomeLine(v, w);
      else if (k === 'tag') o.tag = v;
      else if (MOD_EFFECTS.has(k)) addEffect(o, k, v, w, ctx);
      else err(`${w}: unknown key "${k}". See the File format tab for the keys you can use.`);
    });
    finishFight(o, ctx, where);
    if (check) o.check = Object.assign(check, {pass:pass || {}, fail:fail || {}});
    else if (pass || fail) err(`${where}: has pass: or fail: but no check:.`);
    return o;
  }

  Object.entries(mod.tables).forEach(([id, b]) => {
    const rows = [];
    b.lines.forEach(({n, t}) => {
      if (!t.trim()) return;
      const parts = t.split('|').map(x => x.trim());
      const r = parts[0].match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!r){ err(`Line ${n}: table rows look like "1-5 | Hostile | text | fight: goblin".`); return; }
      const line = [parts[2] ? 'text: ' + parts[2] : '', parts.slice(3).join(' ; ')].filter(Boolean).join(' ; ');
      rows.push({range:[+r[1], +(r[2] || r[1])], label:parts[1] || 'Event', pick:[outcomeLine(line || 'text: Nothing happens.', `Line ${n}`)]});
    });
    ENCOUNTERS['mt_' + id] = {name:id.replace(/_/g, ' '), alert:false, rows};
  });

  Object.values(mod.scenes).forEach(b => {
    const sc = {module:true, chapter:'m', options:[]}, raw = {};
    const paras = [], opts = [];
    let para = [], opt = null;
    const flush = () => { if (para.length){ paras.push(para.join(' ')); para = []; } };
    b.lines.forEach(({n, t}) => {
      if (/^\s*\*\s+/.test(t)){ flush(); opt = {label:t.replace(/^\s*\*\s+/, '').trim(), n, keys:[]}; opts.push(opt); return; }
      if (opt){
        if (!t.trim()) return;
        const kv = t.match(/^\s*([a-z]+)\s*(?::\s*(.*))?$/i);
        if (kv) opt.keys.push({k:kv[1].toLowerCase(), v:(kv[2] || '').trim(), n});
        else err(`Line ${n}: inside the choice "${opt.label}", lines should look like "key: value".`);
        return;
      }
      const kv = t.match(/^\s*(title|back|area|rest|short)\s*:\s*(.*)$/i);
      if (kv){ raw[kv[1].toLowerCase()] = kv[2].trim(); return; }
      if (!t.trim()){ flush(); return; }
      para.push(t.trim());
    });
    flush();
    sc.title = raw.title || b.id;
    if (raw.short) sc.short = raw.short;
    sc.text = paras.map(esc).join('<br><br>') || '&nbsp;';
    if (raw.back) sc.back = esc(raw.back);
    const area = (raw.area || 'none').toLowerCase();
    sc.area = ['wilds', 'marsh', 'dungeon', 'crypt', 'tower', 'town'].includes(area) ? area : mod.tables[area] ? 'mt_' + area : 'none';
    if (area !== 'none' && sc.area === 'none') err(`Scene "${b.id}": unknown area "${area}". Use wilds, marsh, dungeon, crypt, tower, town, none, or the id of a TABLE.`);
    const rest = (raw.rest || 'none').toLowerCase();
    sc.rest = rest === 'short' ? 'short' : (rest === 'long' || rest === 'both') ? 'both' : false;
    sc.options = opts.map((op, idx) => buildOption(op, b.id, idx));
    if (!sc.options.length) err(`Scene "${b.id}" (line ${b.at}) has no choices. Add at least one line starting with "* ".`);
    STORY['m:' + b.id] = sc;
  });
  return mod;
}

/* Plain text without scenes: split into readable sections. */
function paragraphsHTML(text){
  return String(text).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => {
    const lines = p.split('\n').map(x => x.trim());
    const listy = lines.some(l => /^([-*•]|\d+[.)])\s+/.test(l));
    return esc(lines.join(listy ? '\n' : ' ')).replace(/\n/g, '<br>');
  }).join('<br><br>');
}
function splitSections(raw){
  const lines = String(raw).replace(/\r\n?/g, '\n').split('\n');
  const isHead = (t, prev) => {
    const x = t.trim();
    if (!x) return false;
    if (/^#{1,6}\s+\S/.test(x)) return true;
    if (prev.trim() !== '') return false;
    if (x.length < 3 || x.length > 60) return false;
    if (/[.,;:!?"'”)]$/.test(x)) return false;
    if (!/^[A-Z0-9]/.test(x)) return false;
    return x.split(/\s+/).length <= 9;
  };
  const secs = [];
  let cur = {title:'Opening', body:[]};
  lines.forEach((t, i) => {
    if (isHead(t, i ? lines[i - 1] : '')){ secs.push(cur); cur = {title:t.trim().replace(/^#+\s*/, ''), body:[]}; }
    else cur.body.push(t);
  });
  secs.push(cur);
  let out = [], pending = [];
  secs.forEach(s => {
    if (!s.body.join('').trim()){ if (s.title !== 'Opening') pending.push(s.title); return; }
    if (pending.length){ s.title = [...pending, s.title].join(' · '); pending = []; }
    out.push(s);
  });
  if (out.length < 2){
    out = [];
    let buf = [], size = 0;
    String(raw).replace(/\r\n?/g, '\n').split(/\n\s*\n/).forEach(p => {
      buf.push(p); size += p.length;
      if (size > 1200){ out.push({title:`Page ${out.length + 1}`, body:buf.join('\n\n').split('\n')}); buf = []; size = 0; }
    });
    if (buf.join('').trim()) out.push({title:`Page ${out.length + 1}`, body:buf.join('\n\n').split('\n')});
  }
  return out.map(s => ({title:s.title.slice(0, 80), html:paragraphsHTML(s.body.join('\n'))}));
}
const READER_SCENE = () => ({module:true, reader:true, chapter:'m', title:'', area:'none', rest:'both', options:[], text:''});
const titleFromFile = name => (name || 'Adventure').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim() || 'Adventure';

function startAdventure(raw, fileName){
  if (!G.char || G.mode === 'create') return {error:'Make your hero first, then load an adventure.'};
  if (G.mode !== 'explore') return {error:'Finish what you are doing first. You can load an adventure when you are not in a fight.'};
  if (!String(raw).trim()) return {error:'That file is empty.'};
  const from = G.module ? G.module.from : G.scene;
  const parsed = parseModule(raw);
  Object.keys(G.flags).forEach(k => { if (k.startsWith('m.') || k.startsWith('once_m.')) delete G.flags[k]; });
  Object.keys(G.visits).forEach(k => { if (k.startsWith('m:')) delete G.visits[k]; });
  clearModule();
  if (parsed){
    buildModule(parsed);
    if (parsed.errors.length){ clearModule(); G.module = null; return {errors:parsed.errors}; }
    MOD = parsed;
    G.module = {title:parsed.title || titleFromFile(fileName), raw, from, reader:false, done:false, start:parsed.start};
    log('level', esc(G.module.title));
    goTo('m:' + parsed.start);
    return {ok:true};
  }
  READER = {sections:splitSections(raw)};
  STORY['m:reader'] = READER_SCENE();
  G.module = {title:titleFromFile(fileName), raw, from, reader:true, idx:0, done:false};
  log('level', esc(G.module.title));
  log('sys', `Reader mode: ${READER.sections.length} sections. Use the solo GM tools below to roll checks and run fights as you read.`);
  showSection(0);
  return {ok:true, reader:true, count:READER.sections.length};
}
function restoreModule(m){
  try {
    clearModule();
    if (m.reader){ READER = {sections:splitSections(m.raw)}; STORY['m:reader'] = READER_SCENE(); return true; }
    const parsed = parseModule(m.raw);
    if (!parsed) return false;
    buildModule(parsed);
    if (parsed.errors.length){ clearModule(); return false; }
    MOD = parsed;
    return true;
  } catch (e){ return false; }
}
function leaveAdventure(){
  if (G.mode !== 'explore') return;
  const from = G.module && G.module.from;
  const back = from && STORY[from] && !STORY[from].module ? from : 'c1_greywater';
  log('sys', `You set ${esc(G.module ? G.module.title : 'the adventure')} aside and return to your campaign.`);
  G.module = null; ui.gm = false; ui.gmFoes = [];
  clearModule();
  goTo(back);
}
function showSection(i){
  if (!READER || !G.module) return;
  const secs = READER.sections;
  i = clamp(i, 0, secs.length - 1);
  G.module.idx = i; G.scene = 'm:reader'; G.mode = 'explore'; G.choices = null; G.shop = null;
  G.visits['m:reader'] = 1;
  log('scene', esc(secs[i].title));
  log('text', secs[i].html || '&nbsp;');
  render(); autosave();
}

/* ---------- solo GM tools ---------- */
function monsterOptionsHTML(sel){
  const groups = [['This adventure', k => k.startsWith('mod_')], ['Your bestiary', k => k.startsWith('my_')], ['Core monsters', k => !k.startsWith('mod_') && !k.startsWith('my_')]];
  return groups.map(([label, test]) => {
    const ks = Object.keys(MONSTERS).filter(test).sort((a, b) => MONSTERS[a].name.localeCompare(MONSTERS[b].name));
    return ks.length ? `<optgroup label="${label}">${ks.map(k => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(MONSTERS[k].name)} (AC ${MONSTERS[k].ac}, HP ${MONSTERS[k].hp})</option>`).join('')}</optgroup>` : '';
  }).join('');
}
function checkOptionsHTML(sel){
  const o = (v, t) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${t}</option>`;
  return `<optgroup label="Skills">${Object.entries(SKILLS).map(([k, [n]]) => o('sk:' + k, n)).join('')}</optgroup>` +
    `<optgroup label="Abilities">${ABILS.map(a => o('ab:' + a, ABIL_NAME[a])).join('')}</optgroup>` +
    `<optgroup label="Saving throws">${ABILS.map(a => o('sv:' + a, ABIL_NAME[a] + ' save')).join('')}</optgroup>`;
}
function renderGM(){
  const box = $('gm');
  const show = !!G.char && G.mode === 'explore' && !G.shop && (ui.gm || !!(G.module && G.module.reader));
  box.hidden = !show;
  if (!show){ box.innerHTML = ''; return; }
  const foes = ui.gmFoes;
  box.innerHTML = `<div class="gmhead"><b>Solo GM tools</b><span class="small" style="margin:0">Roll what the adventure asks for.</span>${G.module && G.module.reader ? '' : '<button type="button" class="mini" id="gmHide">Hide</button>'}</div>
    <div class="gmrow"><span class="lbl2">Check or saving throw</span>
      <div class="row"><select id="gmSkill" aria-label="Check">${checkOptionsHTML(ui.gmSkill || 'sk:perception')}</select>
      <label class="fl">DC <input id="gmDC" type="number" min="1" max="40" value="${ui.gmDC || 12}"></label>
      <select id="gmAdv" aria-label="Advantage"><option value="">Normal roll</option><option value="adv" ${ui.gmAdv === 'adv' ? 'selected' : ''}>Advantage</option><option value="dis" ${ui.gmAdv === 'dis' ? 'selected' : ''}>Disadvantage</option></select>
      <button type="button" class="mini" id="gmRoll">Roll</button></div></div>
    <div class="gmrow"><span class="lbl2">Start a fight</span>
      <div class="row"><select id="gmMon" aria-label="Monster">${monsterOptionsHTML(ui.gmMon)}</select>
      <label class="fl">How many <input id="gmCount" type="number" min="1" max="8" value="1"></label>
      <button type="button" class="mini" id="gmAdd">Add</button></div>
      <div class="row">${foes.length ? foes.map(k => `<span class="chip">${esc(MONSTERS[k] ? MONSTERS[k].name : k)}</span>`).join('') : '<span class="small" style="margin:0">No monsters added yet.</span>'}</div>
      <div class="row"><select id="gmSurp" aria-label="Surprise"><option value="">No surprise</option><option value="player">They are surprised</option><option value="enemy">You are surprised</option></select>
      <button type="button" class="mini" id="gmFight" ${foes.length ? '' : 'disabled'}>Start the fight</button><button type="button" class="mini" id="gmClear" ${foes.length ? '' : 'disabled'}>Clear</button></div></div>
    <div class="gmrow"><span class="lbl2">Rewards, damage and healing</span>
      <div class="row"><label class="fl">Gold <input id="gmGold" type="number" value="0"></label><label class="fl">XP <input id="gmXP" type="number" min="0" value="0"></label><button type="button" class="mini" id="gmGive">Apply</button></div>
      <div class="row"><label class="fl">Amount <input id="gmHP" type="text" value="1d6" size="6"></label><button type="button" class="mini" id="gmDmg">Take damage</button><button type="button" class="mini" id="gmHeal">Heal</button></div></div>`;
  const hide = $('gmHide'); if (hide) hide.addEventListener('click', () => { ui.gm = false; render(); });
  $('gmSkill').addEventListener('change', e => { ui.gmSkill = e.target.value; });
  $('gmAdv').addEventListener('change', e => { ui.gmAdv = e.target.value; });
  $('gmMon').addEventListener('change', e => { ui.gmMon = e.target.value; });
  $('gmRoll').addEventListener('click', () => {
    const [kind, key] = $('gmSkill').value.split(':');
    const dc = clamp(parseInt($('gmDC').value, 10) || 10, 1, 40); ui.gmDC = dc;
    const chk = kind === 'sk' ? {skill:key} : kind === 'ab' ? {ability:key} : {save:key};
    chk.dc = dc; chk.adv = $('gmAdv').value === 'adv'; chk.dis = $('gmAdv').value === 'dis';
    log('you', 'Roll a check for the adventure');
    doCheck(chk); render(); autosave();
  });
  $('gmAdd').addEventListener('click', () => {
    const k = $('gmMon').value, n = clamp(parseInt($('gmCount').value, 10) || 1, 1, 8);
    ui.gmMon = k;
    for (let i = 0; i < n && ui.gmFoes.length < 8; i++) ui.gmFoes.push(k);
    renderGM();
  });
  $('gmClear').addEventListener('click', () => { ui.gmFoes = []; renderGM(); });
  $('gmFight').addEventListener('click', () => {
    const foesNow = ui.gmFoes.filter(k => MONSTERS[k]);
    if (!foesNow.length) return;
    ui.gmFoes = [];
    log('you', 'Start a fight');
    startCombat({foes:foesNow, surprise:$('gmSurp').value || null});
  });
  $('gmGive').addEventListener('click', () => {
    const gold = parseInt($('gmGold').value, 10) || 0, xp = Math.max(0, parseInt($('gmXP').value, 10) || 0);
    if (gold > 0) give({gold});
    if (gold < 0){ G.char.gold = Math.max(0, G.char.gold + gold); log('sys', `${gold} gold.`); }
    if (xp > 0) gainXP(xp);
    render(); autosave();
  });
  const hpExpr = () => { const v = $('gmHP').value.replace(/\s+/g, ''); if (!DICE_RE.test(v)){ notice('Use a number or dice, like 7 or 2d6+1.'); return null; } return v; };
  $('gmDmg').addEventListener('click', () => { const v = hpExpr(); if (!v) return; log('you', `Take ${esc(v)} damage`); if (!applyHazard({dice:v, type:''})){ render(); autosave(); } });
  $('gmHeal').addEventListener('click', () => { const v = hpExpr(); if (!v) return; heal(v, 'Healing'); render(); autosave(); });
}

/* ---------- map ---------- */
const CHAPTER_START = {1:'c1_greywater', 2:'bramblewick'};
function sceneLinks(id){
  const sc = STORY[id], out = new Set();
  if (!sc) return [];
  const walk = o => {
    if (!o) return;
    if (typeof o === 'string'){ if (STORY[o]) out.add(o); return; }
    if (Array.isArray(o)){ o.forEach(walk); return; }
    if (typeof o !== 'object') return;
    if (o.go) walk(o.go);
    if (o.check){ walk(o.check.pass); walk(o.check.fail); }
    if (o.fight && typeof o.fight === 'object'){ walk(o.fight.win); walk(o.fight.flee); }
    if (o.choices) walk(o.choices);
  };
  (sc.options || []).forEach(walk);
  (sc.links || []).forEach(x => { if (STORY[x]) out.add(x); });
  out.delete(id);
  return [...out];
}
function shortTitle(s){
  const t = (s.short || s.title || '').replace(/^The /, '').replace(/,.*$/, '');
  return t.length > 15 ? t.slice(0, 14) + '…' : t;
}
function renderMapPane(p){
  const sc = STORY[G.scene];
  if (G.module && G.module.reader && READER){
    const secs = READER.sections;
    p.innerHTML = `<div class="sh"><h4>${esc(G.module.title)} <span>${secs.length} sections</span></h4><div class="toc">` +
      secs.map((s2, i) => `<button type="button" class="tocrow${i === G.module.idx ? ' here' : ''}" data-sec="${i}" ${G.mode === 'explore' ? '' : 'disabled'}><span class="n">${i + 1}</span><span>${esc(s2.title)}</span></button>`).join('') + `</div></div>`;
    p.querySelectorAll('[data-sec]').forEach(b => b.addEventListener('click', () => { log('you', `Turn to ${esc(READER.sections[+b.dataset.sec].title)}`); showSection(+b.dataset.sec); }));
    return;
  }
  if (!sc){ p.innerHTML = '<p class="empty">No map yet.</p>'; return; }
  const inGroup = id => STORY[id] && (sc.module ? !!STORY[id].module : (!STORY[id].module && STORY[id].chapter === sc.chapter));
  const start = sc.module ? 'm:' + (G.module ? G.module.start : '') : (CHAPTER_START[sc.chapter] || G.scene);
  const depth = {}, order = [], q = [start];
  depth[start] = 0;
  while (q.length){
    const id = q.shift();
    if (!STORY[id]) continue;
    order.push(id);
    sceneLinks(id).filter(inGroup).forEach(n => { if (depth[n] === undefined){ depth[n] = depth[id] + 1; q.push(n); } });
  }
  if (depth[G.scene] === undefined){ depth[G.scene] = Math.max(0, ...Object.values(depth)) + 1; order.push(G.scene); }
  const seen = id => !!G.visits[id];
  const shown = order.filter(id => seen(id) || order.some(v => seen(v) && sceneLinks(v).includes(id)));
  const rows = {};
  shown.forEach(id => { (rows[depth[id]] = rows[depth[id]] || []).push(id); });
  const rowKeys = Object.keys(rows).map(Number).sort((a, b) => a - b);
  const W = 104, H = 34, GX = 10, GY = 30;
  const cols = Math.max(1, ...rowKeys.map(r => rows[r].length));
  const width = cols * W + (cols - 1) * GX + 16, height = rowKeys.length * H + Math.max(0, rowKeys.length - 1) * GY + 30;
  const pos = {};
  rowKeys.forEach((r, ri) => {
    const ids = rows[r], rowW = ids.length * W + (ids.length - 1) * GX, x0 = (width - rowW) / 2;
    ids.forEach((id, ci) => { pos[id] = {x:x0 + ci * (W + GX), y:8 + ri * (H + GY)}; });
  });
  let edges = '', nodes = '';
  const done = new Set();
  shown.forEach(a => sceneLinks(a).forEach(b => {
    if (!pos[b] || !pos[a]) return;
    const key = [a, b].sort().join('|');
    if (done.has(key)) return;
    done.add(key);
    const A = pos[a], B = pos[b], ax = A.x + W / 2, bx = B.x + W / 2;
    if (A.y === B.y){ edges += `<path d="M${ax} ${A.y + H} Q${(ax + bx) / 2} ${A.y + H + 22} ${bx} ${B.y + H}" class="me"/>`; return; }
    const ay = A.y < B.y ? A.y + H : A.y, by = A.y < B.y ? B.y : B.y + H;
    edges += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" class="me"/>`;
  }));
  shown.forEach(id => {
    const P = pos[id], s2 = STORY[id], here = id === G.scene, v = seen(id);
    nodes += `<g class="mn${here ? ' here' : ''}${v ? '' : ' fog'}"><title>${esc(v ? s2.title : 'A place you have not been yet')}</title><rect x="${P.x}" y="${P.y}" width="${W}" height="${H}" rx="5"/><text x="${P.x + W / 2}" y="${P.y + H / 2 + 4}" text-anchor="middle">${esc(v ? shortTitle(s2) : 'Unexplored')}</text></g>`;
  });
  const head = sc.module ? esc(G.module ? G.module.title : 'Adventure') : `Chapter ${CH_WORD[sc.chapter] || sc.chapter}: ${esc(CHAPTERS[sc.chapter] || '')}`;
  p.innerHTML = `<div class="sh"><h4>${head} <span>${shown.filter(seen).length} places found</span></h4>
    <div class="mapbox"><svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Map of the places you have found">${edges}${nodes}</svg></div>
    <div class="legend"><span><i class="lg here"></i>You are here</span><span><i class="lg"></i>Visited</span><span><i class="lg fog"></i>Unexplored</span></div>
    <p class="small">Lines show the ways you know between places. Generated maps for random encounter areas are planned for a later version.</p></div>`;
}

/* ---------- backstory ---------- */
const STORY_FIELDS = [['trait', 'Personality trait'], ['ideal', 'Ideal'], ['bond', 'Bond'], ['flaw', 'Flaw']];
function storyViewHTML(st){
  const traits = STORY_FIELDS.filter(([k]) => st[k]).map(([k, n]) => `<div class="trait"><span class="lbl2">${n}</span><p>${esc(st[k])}</p></div>`).join('');
  return (st.text ? `<div class="storytext">${paragraphsHTML(st.text)}</div>` : '<p class="empty">No backstory yet. Press Edit to write one or load a .txt file.</p>') + traits +
    (st.notes ? `<div class="trait"><span class="lbl2">From your imported sheet</span><p>${paragraphsHTML(st.notes)}</p></div>` : '');
}
function storyFormHTML(st, prefix){
  return `<textarea id="${prefix}Text" rows="6" placeholder="Where did your hero come from? What do they want? Who do they miss?">${esc(st.text || '')}</textarea>
    <div class="row"><label class="ghost filebtn">Load from a .txt file<input type="file" id="${prefix}File" accept=".txt,text/plain" hidden></label></div>
    <div class="fgrid">${STORY_FIELDS.map(([k, n]) => `<label class="fld">${n}<input id="${prefix}_${k}" type="text" maxlength="200" value="${esc(st[k] || '')}"></label>`).join('')}</div>`;
}
function readTextFile(file){
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ''));
    r.onerror = () => rej(new Error('Could not read that file.'));
    r.readAsText(file);
  });
}

/* ---------- PDF character sheets ---------- */
const PDFJS_VER = '3.11.174';
function loadPdfJs(){
  return new Promise((res, rej) => {
    if (window.pdfjsLib) return res(window.pdfjsLib);
    const s = document.createElement('script');
    s.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VER}/pdf.min.js`;
    s.onload = () => {
      const lib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
      if (!lib) return rej(new Error('The PDF reader did not load.'));
      lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VER}/pdf.worker.min.js`;
      window.pdfjsLib = lib;
      res(lib);
    };
    s.onerror = () => rej(new Error('Could not load the PDF reader. Check your internet connection and try again.'));
    document.head.appendChild(s);
  });
}
async function readPdfFields(buf){
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({data:new Uint8Array(buf)}).promise;
  const out = {};
  try {
    const fo = await doc.getFieldObjects();
    if (fo) for (const [name, arr] of Object.entries(fo)){
      for (const f of arr){
        let v = f.value;
        if (v === undefined || v === null) continue;
        v = String(v);
        if (v && v !== 'Off'){ out[name] = v; break; }
      }
    }
  } catch (e){}
  if (!Object.keys(out).length){
    for (let i = 1; i <= doc.numPages; i++){
      const page = await doc.getPage(i);
      (await page.getAnnotations()).forEach(a => {
        if (a.fieldName && a.fieldValue !== undefined && a.fieldValue !== null && a.fieldValue !== '' && a.fieldValue !== 'Off') out[a.fieldName] = String(a.fieldValue);
      });
    }
  }
  return out;
}
const CLASS_GUESS = {fighter:'fighter', barbarian:'fighter', paladin:'fighter', ranger:'fighter', monk:'rogue', rogue:'rogue', bard:'rogue',
  cleric:'cleric', druid:'cleric', wizard:'wizard', sorcerer:'wizard', warlock:'wizard', artificer:'wizard'};
/* Field names follow the official fillable 5e character sheet. */
function mapSheet(fields){
  const norm = {};
  for (const [k, v] of Object.entries(fields)) norm[k.replace(/[^a-z0-9]/gi, '').toLowerCase()] = String(v).trim();
  const get = (...keys) => { for (const k of keys) if (norm[k]) return norm[k]; return ''; };
  const r = {got:[], checks:[], story:{}};
  r.name = get('charactername', 'charactername2', 'name');
  if (r.name) r.got.push('name');
  const cl = get('classlevel', 'class', 'classandlevel').toLowerCase();
  if (cl){
    const found = Object.keys(CLASS_GUESS).find(k => cl.includes(k));
    const nums = (cl.match(/\d+/g) || []).map(Number);
    r.level = clamp(nums.reduce((a, b) => a + b, 0) || 1, 1, 20);
    r.got.push(`level ${r.level}`);
    if (found){
      r.cls = CLASS_GUESS[found];
      if (CLASS_GUESS[found] !== found) r.checks.push(`Your sheet says ${found[0].toUpperCase() + found.slice(1)}. This game has Fighter, Rogue, Cleric and Wizard so far, so you will play as a ${CLASSES[r.cls].name}. Change the class below if another fits better.`);
      else r.got.push(CLASSES[r.cls].name);
    } else r.checks.push(`I could not match the class "${cl}". Pick the closest class below.`);
    if (/[\/,&]|\band\b/.test(cl) && nums.length > 1) r.checks.push('Multiclass characters are played as their first class.');
  }
  const race = get('race', 'species').toLowerCase();
  if (race){
    if (race.includes('half-elf') || race.includes('halfelf')) { r.race = 'other'; r.raceName = get('race', 'species'); }
    else if (race.includes('dwarf')) r.race = 'dwarf';
    else if (race.includes('elf')) r.race = 'elf';
    else if (race.includes('halfling')) r.race = 'halfling';
    else if (race.includes('human')) r.race = 'human';
    else { r.race = 'other'; r.raceName = get('race', 'species'); }
    r.got.push(r.race === 'other' ? r.raceName : RACES[r.race].name);
    if (r.race === 'other') r.checks.push(`${r.raceName} is not built into this game yet. Your ability scores carry over, but special traits from your book are not applied automatically.`);
  }
  const bg = get('background').toLowerCase();
  if (bg){
    const hit = Object.keys(BACKGROUNDS).find(k => bg.includes(BACKGROUNDS[k].name.toLowerCase()));
    if (hit){ r.bg = hit; r.got.push(BACKGROUNDS[hit].name); }
    else r.checks.push(`The background "${get('background')}" is not built in. Pick the closest one below for your skills.`);
  }
  const abil = {};
  const keys = {str:['str', 'strength', 'strscore'], dex:['dex', 'dexterity', 'dexscore'], con:['con', 'constitution', 'conscore'], int:['int', 'intelligence', 'intscore'], wis:['wis', 'wisdom', 'wisscore'], cha:['cha', 'charisma', 'chascore']};
  ABILS.forEach(a => { const v = parseInt(get(...keys[a]), 10); if (v >= 1 && v <= 30) abil[a] = v; });
  if (Object.keys(abil).length === 6){ r.abil = abil; r.got.push('ability scores'); }
  else r.checks.push('I could not read all six ability scores, so the game will use the scores below.');
  const hp = parseInt(get('hpmax', 'maxhp', 'hitpointmaximum'), 10);
  if (hp > 0){ r.hp = hp; r.got.push(`${hp} hit points`); }
  const xp = parseInt(get('xp', 'experiencepoints', 'experience').replace(/[^0-9]/g, ''), 10);
  if (xp >= 0){ r.xp = xp; r.got.push(`${xp} XP`); }
  const gp = parseInt(get('gp', 'gold').replace(/[^0-9]/g, ''), 10);
  if (gp >= 0){ r.gold = gp; r.got.push(`${gp} gold`); }
  const st = {text:get('backstory', 'characterbackstory'), trait:get('personalitytraits', 'personalitytrait'), ideal:get('ideals', 'ideal'), bond:get('bonds', 'bond'), flaw:get('flaws', 'flaw')};
  Object.entries(st).forEach(([k, v]) => { if (v) r.story[k] = v; });
  if (Object.keys(r.story).length) r.got.push('backstory and traits');
  const notes = [['Equipment', get('equipment')], ['Features and traits', get('featuresandtraits', 'features', 'feattraits')], ['Proficiencies and languages', get('proficiencieslang', 'otherproficiencieslanguages')]]
    .filter(([, v]) => v).map(([n, v]) => `${n}: ${v}`).join('\n\n');
  if (notes) r.notes = notes;
  r.weapons = [];
  ['wpnname', 'wpnname2', 'wpnname3', 'weapon1', 'weapon2', 'weapon3'].forEach(k => {
    const w = get(k).toLowerCase();
    if (!w) return;
    const hit = WEAPON_LIST.find(x => w.includes(x[1].toLowerCase()));
    if (hit && !r.weapons.includes('w_' + hit[0])) r.weapons.push('w_' + hit[0]);
  });
  if (r.weapons.length) r.got.push(r.weapons.map(id => ITEMS[id].name).join(', '));
  r.checks.push('Skill proficiencies come from your class and background in this game, not from the checkboxes on your sheet.');
  return r;
}
function applyImport(r){
  if (r.name) C.name = r.name.slice(0, 32);
  if (r.cls) C.cls = r.cls;
  if (r.race){ C.race = r.race; C.raceName = r.raceName || null; }
  if (r.bg) C.bg = r.bg;
  C.fixed = r.abil || null;
  if (!C.fixed) assignByPriority();
  C.imp = {level:r.level || 1, hp:r.hp || 0, xp:r.xp, gold:r.gold, weapons:r.weapons || [], notes:r.notes || ''};
  C.story = Object.assign({text:'', trait:'', ideal:'', bond:'', flaw:''}, C.story, r.story);
  C.impReport = `<div class="impok"><span class="lbl2">Imported</span><p>${r.got.length ? esc(r.got.join(', ')) : 'Nothing I could use.'}</p></div>` +
    (r.checks.length ? `<div class="impcheck"><span class="lbl2">Please check</span><ul>${r.checks.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>` : '');
}
function clearImport(){ C.fixed = null; C.imp = null; C.impReport = ''; C.raceName = null; if (C.race === 'other') C.race = 'human'; assignByPriority(); }

/* ---------- library panel ---------- */
function openLibrary(tab){
  if (tab) ui.lib = tab;
  $('library').hidden = false; $('transfer').hidden = true; $('confirmNew').hidden = true;
  renderLibrary();
  if ($('library').scrollIntoView) $('library').scrollIntoView({block:'start'});
}
function renderLibrary(){
  if ($('library').hidden) return;
  document.querySelectorAll('#libTabs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lt === ui.lib)));
  const body = $('libBody');
  if (ui.lib === 'adv') renderLibAdventures(body);
  else if (ui.lib === 'best') renderLibBestiary(body);
  else {
    body.innerHTML = `<p class="small" style="margin:0">Write adventures in any text editor and save them as .txt. This is the full list of what the game understands.</p>
      <div class="row"><button type="button" class="mini" id="guideCopy">Copy this guide</button><button type="button" class="mini" id="sampleCopy">Copy the sample adventure</button></div>
      <pre class="guide" id="guideText">${esc(MODULE_GUIDE)}</pre>`;
    const copy = (txt, done) => { try { navigator.clipboard.writeText(txt).then(() => notice(done), () => notice('Copying is blocked here. Select the text and copy it with your keyboard.')); } catch (e){ notice('Copying is blocked here. Select the text and copy it with your keyboard.'); } };
    $('guideCopy').addEventListener('click', () => copy(MODULE_GUIDE, 'Guide copied.'));
    $('sampleCopy').addEventListener('click', () => copy(SAMPLE_MODULE, 'Sample adventure copied. Paste it into a text editor and save it as a .txt file.'));
  }
}
function renderLibAdventures(body){
  const ready = !!G.char && G.mode !== 'create';
  body.innerHTML = `
    ${G.module ? `<div class="nowplaying"><div><span class="lbl2">Now playing</span><b>${esc(G.module.title)}</b><span class="small" style="margin:0">${G.module.reader ? 'Reader mode with solo GM tools' : 'Interactive adventure'}${G.module.done ? ' · complete' : ''}</span></div><button type="button" class="mini" id="libLeave" ${G.mode === 'explore' ? '' : 'disabled'}>Leave and return to your campaign</button></div>` : ''}
    <p class="small" style="margin:0">Load a one-shot as a .txt file. If it is written in the adventure format (see the File format tab), it plays like the built-in chapters. Any other text opens in <b>reader mode</b>: the game splits it into sections you can page through, with solo GM tools for checks, fights and rewards. Your hero comes along, and your files stay in this browser.</p>
    ${ready ? '' : '<p class="warnbox">Make your hero first, then come back here to load an adventure.</p>'}
    <div class="row"><label class="ghost filebtn${ready ? '' : ' off'}">Choose a .txt file<input type="file" id="modFile" accept=".txt,text/plain" hidden ${ready ? '' : 'disabled'}></label>
      <button type="button" class="ghost" id="modSample" ${ready ? '' : 'disabled'}>Play the sample one-shot</button></div>
    <textarea id="modPaste" rows="5" placeholder="Or paste adventure text here"></textarea>
    <div class="row"><button type="button" class="mini" id="modPasteGo" ${ready ? '' : 'disabled'}>Load the pasted text</button></div>
    <div id="modMsg">${ui.modMsg || ''}</div>`;
  const run = (txt, name) => {
    const res = startAdventure(txt, name);
    if (res.ok){ ui.modMsg = ''; $('library').hidden = true; notice(res.reader ? `Opened in reader mode: ${res.count} sections.` : 'Adventure loaded.'); window.scrollTo(0, 0); return; }
    ui.modMsg = res.errors
      ? `<div class="impcheck"><span class="lbl2">This adventure has ${res.errors.length} problem${res.errors.length > 1 ? 's' : ''} to fix</span><ul>${res.errors.slice(0, 25).map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>`
      : `<p class="warnbox">${esc(res.error)}</p>`;
    renderLibrary();
  };
  const leave = $('libLeave'); if (leave) leave.addEventListener('click', () => { leaveAdventure(); renderLibrary(); });
  $('modFile').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try { run(await readTextFile(f), f.name); } catch (err){ ui.modMsg = `<p class="warnbox">${esc(err.message)}</p>`; renderLibrary(); }
  });
  $('modSample').addEventListener('click', () => run(SAMPLE_MODULE, 'The Lantern in the Well'));
  $('modPasteGo').addEventListener('click', () => run($('modPaste').value, 'Pasted adventure'));
}
const blankMonster = () => ({name:'', type:'monstrosity', ac:12, hp:10, xp:50, pp:10, init:0, multi:1, save:{}, attacks:[], special:[], areas:[], vuln:[], immune:[]});
function renderLibBestiary(body){
  const m = ui.monsterDraft || blankMonster();
  const v = x => esc(x === undefined || x === null ? '' : x);
  const atk = i => m.attacks[i] || {};
  body.innerHTML = `
    <div class="bgrid">
      <div class="bcol">
        <h4 class="lh">Your monsters <span>${BESTIARY.length}</span></h4>
        ${BESTIARY.length ? BESTIARY.map(b => { const n = normMonster(b); return `<div class="item"><div class="it"><b>${esc(n.name)}</b> <span class="chip">${esc(n.type)}</span><p>AC ${n.ac}, HP ${n.hp}, ${n.xp} XP. ${n.attacks.map(a => `${esc(a.name)} ${sgn(a.toHit)} ${esc(a.dmg)} ${esc(a.type)}`).join('; ')}${n.multi > 1 ? `, ${n.multi} attacks a turn` : ''}.${(b.areas || []).length ? ` Appears in: ${b.areas.join(', ')}.` : ''}</p></div><div class="row" style="flex-wrap:nowrap"><button type="button" class="mini" data-edit="${b.id}">Edit</button><button type="button" class="mini" data-del="${b.id}">${ui.delMonster === b.id ? 'Confirm' : 'Delete'}</button></div></div>`; }).join('')
          : '<p class="empty">No monsters yet. Add one with the form, or paste a stat block from your book.</p>'}
        <h4 class="lh" style="margin-top:14px">Move your bestiary</h4>
        <p class="small" style="margin:0">Copy this code to back up your monsters or move them to another browser. Paste a code and press Import to add monsters.</p>
        <textarea id="bmCode" rows="3" spellcheck="false">${BESTIARY.length ? esc(JSON.stringify(BESTIARY)) : ''}</textarea>
        <div class="row"><button type="button" class="mini" id="bmCopy">Copy code</button><button type="button" class="mini" id="bmImport">Import code</button></div>
      </div>
      <div class="bcol">
        <h4 class="lh">${ui.editMonster ? 'Edit monster' : 'Add a monster'}</h4>
        <label class="fld">Paste a stat block to fill the form
          <textarea id="bmStat" rows="4" placeholder="Paste the whole stat block: name, Armor Class, Hit Points, ability scores, Challenge, and Actions."></textarea></label>
        <div class="row"><button type="button" class="mini" id="bmRead">Read stat block</button></div>
        <div class="fgrid">
          <label class="fld">Name<input id="bmName" value="${v(m.name)}"></label>
          <label class="fld">Type<input id="bmType" value="${v(m.type)}" placeholder="beast, undead, humanoid"></label>
          <label class="fld">Armor Class<input id="bmAC" type="number" value="${v(m.ac)}"></label>
          <label class="fld">Hit points<input id="bmHP" type="number" value="${v(m.hp)}"></label>
          <label class="fld">XP<input id="bmXP" type="number" value="${v(m.xp)}"></label>
          <label class="fld">Passive Perception<input id="bmPP" type="number" value="${v(m.pp)}"></label>
          <label class="fld">Dexterity modifier<input id="bmInit" type="number" value="${v(m.init)}"></label>
          <label class="fld">Attacks per turn<input id="bmMulti" type="number" min="1" max="4" value="${v(m.multi || 1)}"></label>
        </div>
        <span class="lbl2">Saving throw modifiers</span>
        <div class="fgrid six">${ABILS.map(a => `<label class="fld">${a.toUpperCase()}<input id="bmS_${a}" type="number" value="${v((m.save || {})[a] || 0)}"></label>`).join('')}</div>
        <span class="lbl2">Attacks</span>
        ${[0, 1, 2].map(i => `<div class="fgrid atk"><input id="bmA${i}n" placeholder="Name" value="${v(atk(i).name)}" aria-label="Attack ${i + 1} name"><input id="bmA${i}h" placeholder="+4" value="${atk(i).toHit !== undefined ? v(sgn(atk(i).toHit)) : ''}" aria-label="Attack ${i + 1} to hit"><input id="bmA${i}d" placeholder="1d6+2" value="${v(atk(i).dmg)}" aria-label="Attack ${i + 1} damage"><input id="bmA${i}t" placeholder="slashing" value="${v(atk(i).type)}" aria-label="Attack ${i + 1} damage type"></div>`).join('')}
        <span class="lbl2">Special traits</span>
        <div class="row">${[['pack', 'Pack Tactics'], ['nimble', 'Nimble Escape'], ['martial', 'Martial Advantage']].map(([k, n]) => `<label class="ck"><input type="checkbox" id="bmSp_${k}" ${(m.special || []).includes(k) ? 'checked' : ''}> ${n}</label>`).join('')}</div>
        <div class="fgrid"><label class="fld">Vulnerable to<input id="bmVuln" value="${v((m.vuln || []).join(', '))}" placeholder="radiant"></label><label class="fld">Immune to<input id="bmImm" value="${v((m.immune || []).join(', '))}" placeholder="poison"></label></div>
        <span class="lbl2">Shows up in random encounters</span>
        <div class="row">${AREA_TAGS.map(a => `<label class="ck"><input type="checkbox" id="bmAr_${a}" ${(m.areas || []).includes(a) ? 'checked' : ''}> ${AREA_NAME[a]}</label>`).join('')}</div>
        <div class="row"><button type="button" class="ghost" id="bmSave">${ui.editMonster ? 'Save changes' : 'Add to bestiary'}</button><button type="button" class="mini" id="bmNew">${ui.editMonster ? 'Cancel' : 'Clear form'}</button></div>
        <div id="bmMsg"></div>
      </div>
    </div>`;
  body.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
    const src = BESTIARY.find(x => x.id === b.dataset.edit); if (!src) return;
    ui.editMonster = src.id; ui.monsterDraft = JSON.parse(JSON.stringify(src)); renderLibrary();
  }));
  body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.del;
    if (ui.delMonster !== id){ ui.delMonster = id; renderLibrary(); return; }
    BESTIARY = BESTIARY.filter(x => x.id !== id); delete MONSTERS['my_' + id]; saveBestiary(); ui.delMonster = null;
    if (ui.editMonster === id){ ui.editMonster = null; ui.monsterDraft = null; }
    notice('Monster deleted.'); renderLibrary();
  }));
  $('bmRead').addEventListener('click', () => {
    const t = $('bmStat').value;
    if (!t.trim()){ notice('Paste a stat block first.'); return; }
    const p = parseStatBlock(t);
    p.areas = (ui.monsterDraft && ui.monsterDraft.areas) || [];
    ui.monsterDraft = Object.assign(blankMonster(), p);
    renderLibrary();
    $('bmMsg').innerHTML = `<p class="small">Read ${p.attacks.length} attack${p.attacks.length === 1 ? '' : 's'}${p.attacks.length ? '' : '. Add attacks by hand below'}. Check the numbers, then press ${ui.editMonster ? 'Save changes' : 'Add to bestiary'}.</p>`;
  });
  $('bmNew').addEventListener('click', () => { ui.editMonster = null; ui.monsterDraft = null; renderLibrary(); });
  $('bmSave').addEventListener('click', () => {
    const val = id => ($(id) ? $(id).value.trim() : '');
    const m2 = {name:val('bmName'), type:val('bmType') || 'monstrosity', ac:+val('bmAC') || 10, hp:+val('bmHP') || 1, xp:+val('bmXP') || 0, pp:+val('bmPP') || 10, init:+val('bmInit') || 0, multi:clamp(+val('bmMulti') || 1, 1, 4), save:{}, attacks:[], special:[], areas:[]};
    if (!m2.name){ notice('Give your monster a name.'); return; }
    ABILS.forEach(a => { m2.save[a] = parseInt(val('bmS_' + a), 10) || 0; });
    for (let i = 0; i < 3; i++){
      const n = val(`bmA${i}n`), dmg = val(`bmA${i}d`).replace(/\s+/g, '');
      if (!n && !dmg) continue;
      if (!DICE_RE.test(dmg)){ notice(`Attack ${i + 1}: write damage as dice, like 1d6+2.`); return; }
      m2.attacks.push({name:n || 'Attack', toHit:parseInt(val(`bmA${i}h`), 10) || 0, dmg, type:(val(`bmA${i}t`) || 'bludgeoning').toLowerCase()});
    }
    if (!m2.attacks.length){ notice('Add at least one attack.'); return; }
    ['pack', 'nimble', 'martial'].forEach(k => { if ($('bmSp_' + k).checked) m2.special.push(k); });
    AREA_TAGS.forEach(a => { if ($('bmAr_' + a).checked) m2.areas.push(a); });
    m2.vuln = DMG_TYPES.filter(x => val('bmVuln').toLowerCase().includes(x));
    m2.immune = DMG_TYPES.filter(x => val('bmImm').toLowerCase().includes(x));
    if (ui.editMonster){ m2.id = ui.editMonster; BESTIARY = BESTIARY.map(x => x.id === m2.id ? m2 : x); }
    else {
      let id = slug(m2.name), n = 2;
      while (BESTIARY.some(x => x.id === id)) id = slug(m2.name) + '_' + n++;
      m2.id = id; BESTIARY.push(m2);
    }
    registerCustom(m2); saveBestiary();
    notice(`${m2.name} saved to your bestiary.`);
    ui.editMonster = null; ui.monsterDraft = null; renderLibrary();
  });
  $('bmCopy').addEventListener('click', () => {
    const t = $('bmCode');
    if (!t.value){ notice('Your bestiary is empty.'); return; }
    try { navigator.clipboard.writeText(t.value).then(() => notice('Bestiary code copied.'), () => { t.select(); notice('Code selected. Copy it with your keyboard.'); }); } catch (e){ t.select(); }
  });
  $('bmImport').addEventListener('click', () => {
    let list = null;
    try { list = JSON.parse($('bmCode').value); } catch (e){}
    if (!Array.isArray(list)){ notice('That code did not work. Check that you copied all of it.'); return; }
    const n = mergeBestiary(list);
    notice(`Imported. ${n} new monster${n === 1 ? '' : 's'}.`); renderLibrary();
  });
}

