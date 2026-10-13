/* =====================================================================
   THORNVALE CHRONICLES : engine.js
   Dice, checks, rewards, hazards, companions, outcomes, random encounters,
   rests and saving. Story files describe what happens; this file makes it happen.
   ===================================================================== */
'use strict';

/* =====================================================================
   4. ENGINE
   ===================================================================== */
const SAVE_KEY = 'thornvale_save_v1';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mod = s => Math.floor((s - 10) / 2);
const sgn = n => (n >= 0 ? '+' : '') + n;
const d = sides => 1 + Math.floor(Math.random() * sides);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function freshGame(){
  return {v:1, char:null, scene:null, flags:{}, visits:{}, alert:0, log:[], mode:'create', combat:null, choices:null, down:null, ally:null, captive:null, shop:null, module:null};
}
let G = freshGame();
const ui = {tab:'sheet', diceHist:[], gm:false, gmFoes:[], editStory:false, lib:'adv', editMonster:null};

/* ---------- character math ---------- */
const cls = (ch=G.char) => CLASSES[ch.cls];
const am = (a, ch=G.char) => mod(ch.abil[a]);
const prof = (ch=G.char) => 2 + Math.floor((ch.level - 1) / 4);
const has = id => !!(G.char && (G.char.inv[id] || 0) > 0);
function skillMod(k, ch=G.char){
  let m = am(SKILLS[k][1], ch);
  if (ch.skills.includes(k)) m += prof(ch);
  if (ch.expertise.includes(k)) m += prof(ch);
  return m;
}
const saveMod = (a, ch=G.char) => am(a, ch) + (cls(ch).saves.includes(a) ? prof(ch) : 0);
/* ---------- equipment ---------- */
function equipOf(ch=G.char){ if (!ch.equip) ch.equip = {armor:null, shield:false, weapons:[]}; return ch.equip; }
const owns = (id, ch=G.char) => (ch.inv[id] || 0) > 0;
function wornArmor(ch=G.char){ const e = equipOf(ch); return e.armor && owns(e.armor, ch) && ITEMS[e.armor] ? ITEMS[e.armor] : null; }
const shieldOn = (ch=G.char) => !!(equipOf(ch).shield && owns('shield', ch));
function profWeapon(id, ch=G.char){ const p = cls(ch).prof.weapons, it = ITEMS[id]; return p.includes(it.cat) || p.includes(id.slice(2)); }
function armorTrained(ch=G.char){
  const a = wornArmor(ch), p = cls(ch).prof.armor;
  if (a && !p.includes(a.armor)) return false;
  if (shieldOn(ch) && !p.includes('shield')) return false;
  return true;
}
const UNARMED = {id:null, name:'Unarmed Strike', abil:'str', dmg:'1', type:'bludgeoning', melee:true, prof:true, bonus:0, props:[], note:''};
function weaponObj(id, ch=G.char){
  const it = ITEMS[id], ranged = it.props.includes('ranged');
  const duel = hasFeat('dueling', ch) && !ranged && !it.props.includes('two');
  const pr = profWeapon(id, ch);
  return {id, name:it.name, abil:it.props.includes('finesse') ? 'finesse' : ranged ? 'dex' : 'str', dmg:it.dmg, type:it.dmgType,
    melee:!ranged, prof:pr, bonus:duel ? 2 : 0, props:it.props,
    note:[duel ? 'Dueling +2 damage' : '', pr ? '' : 'Not proficient'].filter(Boolean).join(' · ')};
}
function weapons(ch=G.char){
  const ws = equipOf(ch).weapons.filter(id => owns(id, ch) && ITEMS[id] && ITEMS[id].kind === 'weapon').map(id => weaponObj(id, ch));
  return ws.length ? ws : [UNARMED];
}
function armorLabel(ch=G.char){
  const a = wornArmor(ch);
  let t = a ? a.name : hasFeat('mageArmor', ch) ? 'Mage Armor' : 'No armor';
  if (shieldOn(ch)) t += ' and shield';
  return t;
}
function ac(ch=G.char){
  const a = wornArmor(ch), dx = am('dex', ch);
  let v = a ? a.base + Math.min(dx, a.dexCap) : hasFeat('mageArmor', ch) ? 13 + dx : 10 + dx;
  if (shieldOn(ch)) v += 2;
  for (const id in ch.inv) if (ch.inv[id] > 0 && ITEMS[id] && ITEMS[id].ac) v += ITEMS[id].ac;
  return v;
}
const wAbil = (w, ch=G.char) => w.abil === 'finesse' ? Math.max(am('str', ch), am('dex', ch)) : am(w.abil, ch);
const atkBonus = (w, ch=G.char) => wAbil(w, ch) + (w.prof === false ? 0 : prof(ch));
function migrateChar(ch){
  if (!ch.equip){
    const c = CLASSES[ch.cls];
    Object.entries(c.gear).forEach(([id, n]) => { ch.inv[id] = (ch.inv[id] || 0) + n; });
    ch.equip = JSON.parse(JSON.stringify(c.equip));
  }
  if (!ch.story) ch.story = {text:'', trait:'', ideal:'', bond:'', flaw:''};
  return ch;
}
const castMod = (ch=G.char) => am(cls(ch).cast, ch);
const spellDC = (ch=G.char) => 8 + prof(ch) + castMod(ch);
const spellAtk = (ch=G.char) => prof(ch) + castMod(ch);
function featureList(ch=G.char){
  const out = ['stubborn'];
  const f = cls(ch).features || {};
  for (let l = 1; l <= ch.level; l++) (f[l] || []).forEach(k => out.push(k));
  return out;
}
const hasFeat = (k, ch=G.char) => featureList(ch).includes(k);
const sneakDice = (ch=G.char) => Math.ceil(ch.level / 2) + 'd6';
function resetUses(ch, kind){ /* kind: 'short' or 'long' */
  featureList(ch).forEach(k => {
    const f = FEATURES[k];
    if (f && f.uses && (kind === 'long' || f.rest === 'short')) ch.uses[k] = f.uses;
  });
}

function buildChar(C){
  const race = RACES[C.race], c = CLASSES[C.cls], bg = BACKGROUNDS[C.bg];
  const abil = {};
  if (C.fixed) ABILS.forEach(a => abil[a] = C.fixed[a]);
  else ABILS.forEach(a => abil[a] = C.assign[a] + (race.bonus[a] || 0));
  const skills = [...new Set([...c.skills, ...(race.skills || [])])];
  bg.skills.forEach(s => {
    if (!skills.includes(s)) skills.push(s);
    else { const alt = FALLBACK_SKILLS.find(x => !skills.includes(x)); if (alt) skills.push(alt); }
  });
  const imp = C.imp || {};
  const level = clamp(parseInt(imp.level, 10) || C.startLevel || 1, 1, 20);
  const perLevel = Math.floor(c.hd / 2) + 1 + mod(abil.con) + (race.hpPerLevel || 0);
  const calcHp = Math.max(1, c.hd + mod(abil.con) + (race.hpPerLevel || 0) + (level - 1) * Math.max(1, perLevel));
  const maxHp = imp.hp > 0 ? imp.hp : calcHp;
  const slotLevel = Math.min(level, 3);
  const ch = {
    name:(C.name || 'Nameless').trim().slice(0, 32), race:C.race, raceName:C.race === 'other' ? (C.raceName || 'Adventurer') : null, cls:C.cls, bg:C.bg,
    level, xp: imp.xp >= 0 && imp.xp !== undefined && imp.xp !== null ? imp.xp : (level > 1 ? (XP_NEXT[level - 1] || 0) : 0),
    abil, skills, expertise:[...c.expertise], maxHp, hp:maxHp,
    hd:{max:level, left:level}, slots: c.slots ? {max:c.slots[slotLevel], left:c.slots[slotLevel]} : null,
    uses:{}, insp:false, gold: imp.gold >= 0 && imp.gold !== undefined && imp.gold !== null ? imp.gold : 30,
    inv:Object.assign({potion:1, ration:3}, c.items, bg.items, c.gear),
    equip:JSON.parse(JSON.stringify(c.equip)),
    story:Object.assign({text:'', trait:'', ideal:'', bond:'', flaw:''}, C.story || {})
  };
  (imp.weapons || []).forEach(id => {
    if (!ITEMS[id]) return;
    ch.inv[id] = (ch.inv[id] || 0) + (ch.inv[id] ? 0 : 1);
    if (!ch.equip.weapons.includes(id)){
      if (ch.equip.weapons.length >= 3) ch.equip.weapons.pop();
      ch.equip.weapons.unshift(id);
    }
  });
  if (imp.notes) ch.story.notes = imp.notes;
  resetUses(ch, 'long');
  return ch;
}

/* ---------- dice ---------- */
function rollDice(expr, crit=false){
  const m = String(expr).replace(/\s/g, '').match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!m){ const n = parseInt(expr, 10) || 0; return {total:n, rolls:[], text:String(n)}; }
  let n = parseInt(m[1] || '1', 10);
  const sides = +m[2], add = m[3] ? parseInt(m[3], 10) : 0;
  if (crit) n *= 2;
  const rolls = [];
  for (let i = 0; i < n; i++) rolls.push(d(sides));
  const total = Math.max(0, rolls.reduce((a, b) => a + b, 0) + add);
  return {total, rolls, text:`${n}d${sides}${add ? sgn(add) : ''} [${rolls.join(', ')}]`};
}

/* A d20 test for the hero. Handles advantage, disadvantage, Inspiration and halfling Lucky. */
function d20test({mod:m=0, adv=false, dis=false}){
  let note = '';
  if (G.char && G.char.insp){ adv = true; G.char.insp = false; note += ' Inspiration spent.'; }
  const one = () => {
    let v = d(20);
    if (v === 1 && G.char && RACES[G.char.race].lucky){ const nv = d(20); note += ` Lucky: 1 rerolled to ${nv}.`; v = nv; }
    return v;
  };
  const a = one();
  let b = null, nat = a, net = null;
  if (adv && !dis) net = 'adv';
  if (dis && !adv) net = 'dis';
  if (adv || dis){ b = one(); nat = net === 'adv' ? Math.max(a, b) : net === 'dis' ? Math.min(a, b) : a; }
  return {nat, a, b, total:nat + m, mod:m, net, note};
}
function monsterD20(adv, dis){
  const a = d(20); let b = null, nat = a, net = null;
  if (adv && !dis) net = 'adv';
  if (dis && !adv) net = 'dis';
  if (adv || dis){ b = d(20); nat = net === 'adv' ? Math.max(a, b) : net === 'dis' ? Math.min(a, b) : a; }
  return {nat, a, b, net};
}
function diceHTML(r){
  if (r.b == null) return `d20 <b>${r.nat}</b>`;
  const keepA = r.a === r.nat;
  const A = keepA ? `<b>${r.a}</b>` : `<s>${r.a}</s>`;
  const B = keepA ? `<s>${r.b}</s>` : `<b>${r.b}</b>`;
  const tag = r.net === 'adv' ? ' adv' : r.net === 'dis' ? ' dis' : '';
  return `d20${tag} (${A}, ${B})`;
}

/* ---------- logging ---------- */
function log(c, h){
  G.log.push({c, h});
  if (G.log.length > 400) G.log.splice(0, G.log.length - 400);
  appendLog({c, h});
}
const say = h => log('text', h);
function resolveText(t){ return typeof t === 'function' ? t(G) : t; }

/* ---------- checks ---------- */
function bestSkill(list){
  let best = list[0];
  list.forEach(k => { if (skillMod(k) > skillMod(best)) best = k; });
  return best;
}
function checkInfo(ch){
  if (ch.skill){
    const list = Array.isArray(ch.skill) ? ch.skill : [ch.skill];
    const k = bestSkill(list);
    return {mod:skillMod(k), label:SKILLS[k][0], tag:list.map(x => SKILLS[x][0]).join(' or ')};
  }
  if (ch.save) return {mod:saveMod(ch.save), label:ABIL_NAME[ch.save] + ' save', tag:ABIL_NAME[ch.save] + ' save'};
  return {mod:am(ch.ability), label:ABIL_NAME[ch.ability], tag:ABIL_NAME[ch.ability]};
}
const foesPP = keys => Math.max(...keys.map(k => MONSTERS[k].pp));
function doCheck(ch){
  const info = checkInfo(ch);
  let adv = typeof ch.adv === 'function' ? ch.adv(G) : !!ch.adv;
  let dis = typeof ch.dis === 'function' ? ch.dis(G) : !!ch.dis;
  let extra = '';
  const skills = ch.skill ? (Array.isArray(ch.skill) ? ch.skill : [ch.skill]) : [];
  const chosen = skills.length ? bestSkill(skills) : null;
  const abilUsed = chosen ? SKILLS[chosen][1] : (ch.save || ch.ability);
  if (!armorTrained() && (abilUsed === 'str' || abilUsed === 'dex')){ dis = true; extra += ' Untrained armor: disadvantage.'; }
  if (chosen === 'stealth' && wornArmor() && wornArmor().stealthDis){ dis = true; extra += ` ${wornArmor().name}: disadvantage on Stealth.`; }
  if (skills.includes('perception') && allyUp() && ALLIES[G.ally.key].keen){ adv = true; extra = ` ${esc(G.ally.name)}'s nose helps.`; }
  const baseDC = typeof ch.dc === 'function' ? ch.dc(G) : ch.dc;
  let dc = baseDC, vs = `DC ${baseDC}`;
  if (ch.vsFoes){ dc = foesPP(ch.vsFoes); vs = `passive Perception ${dc}`; }
  if (ch.contest){ const o = d(20), t = o + ch.contest.mod; dc = t + 1; vs = `${esc(ch.contest.name)}'s d20 ${o} ${sgn(ch.contest.mod)} = <b>${t}</b>`; }
  const r = d20test({mod:info.mod, adv, dis});
  const ok = r.total >= dc;
  log('roll', `${info.label}${ch.contest ? ' contest' : ''}: ${diceHTML(r)} ${sgn(info.mod)} = <b>${r.total}</b> vs ${vs} <em class="${ok ? 'ok' : 'no'}">${ok ? 'Success' : 'Failure'}</em>${r.note}${extra}`);
  return ok;
}

/* ---------- rewards ---------- */
function addItem(id, n=1){ G.char.inv[id] = (G.char.inv[id] || 0) + n; }
function takeItem(id, n=1){ G.char.inv[id] = Math.max(0, (G.char.inv[id] || 0) - n); if (!G.char.inv[id]) delete G.char.inv[id]; }
function heal(expr, why){
  const r = rollDice(expr);
  const before = G.char.hp;
  G.char.hp = Math.min(G.char.maxHp, G.char.hp + r.total);
  log('good', `${why ? why + ': ' : ''}you regain <b>${G.char.hp - before}</b> hit points (${r.text}).`);
}
function give(g){
  if (g.gold){
    const n = typeof g.gold === 'number' ? g.gold : rollDice(g.gold).total;
    G.char.gold += n; log('good', `+${n} gold.`);
  }
  if (g.items) for (const [id, n] of Object.entries(g.items)){
    addItem(id, n); log('good', `Gained: ${ITEMS[id].name}${n > 1 ? ' x' + n : ''}.`);
  }
  if (g.heal) heal(g.heal);
  if (g.insp){ G.char.insp = true; log('good', 'You gain Inspiration. Your next d20 roll has advantage.'); }
  if (g.xp) gainXP(g.xp);
}
function take(t){
  if (t.gold){ G.char.gold = Math.max(0, G.char.gold - t.gold); log('sys', `-${t.gold} gold.`); }
  if (t.items) for (const [id, n] of Object.entries(t.items)) takeItem(id, n);
}
function gainXP(n){
  G.char.xp += n;
  log('good', `+${n} XP.`);
  while (XP_NEXT[G.char.level] && G.char.xp >= XP_NEXT[G.char.level]) levelUp();
}
function levelUp(){
  const ch = G.char, c = cls(ch);
  ch.level++;
  const gain = Math.max(1, Math.floor(c.hd / 2) + 1 + am('con') + (RACES[ch.race].hpPerLevel || 0));
  ch.maxHp += gain; ch.hp += gain;
  ch.hd.max = ch.level; ch.hd.left++;
  if (c.slots && c.slots[ch.level]){
    const diff = c.slots[ch.level] - ch.slots.max;
    ch.slots.max = c.slots[ch.level]; ch.slots.left += Math.max(0, diff);
  }
  const fresh = (c.features[ch.level] || []);
  fresh.forEach(k => { if (FEATURES[k].uses) ch.uses[k] = FEATURES[k].uses; });
  log('level', `Level ${ch.level}!`);
  log('good', `Your hit point maximum rises by ${gain}.` + (fresh.length ? ` New: ${fresh.map(k => FEATURES[k].name).join(', ')}.` : '') + (c.slots && c.slots[ch.level] ? ` Spell slots: ${ch.slots.max}.` : ''));
}

/* ---------- hazards and falling ---------- */
function applyHazard(h){
  let r = rollDice(h.dice);
  let n = r.total;
  if (h.save){
    const ok = doCheck({save:h.save.ability, dc:h.save.dc});
    if (ok) n = h.save.half ? Math.floor(n / 2) : 0;
  }
  if (h.type && RACES[G.char.race].resist && RACES[G.char.race].resist.includes(h.type)){ n = Math.floor(n / 2); log('sys', 'Your dwarven resilience halves the damage.'); }
  if (n <= 0) return false;
  G.char.hp -= n;
  log('bad', `You take <b>${n}</b>${h.type ? ' ' + h.type : ''} damage.`);
  if (G.char.hp <= 0 && !stubborn()){ playerDown(G.scene); return true; }
  return false;
}
function stubborn(){
  if (!G.char.uses.stubborn) return false;
  G.char.uses.stubborn--;
  G.char.hp = 1;
  log('good', '<b>Stubborn Hero:</b> you should have fallen, but you refuse. You stay on your feet with 1 hit point.');
  return true;
}
function playerDown(back){
  G.char.hp = 0;
  G.combat = null; G.choices = null;
  G.mode = 'downed';
  G.down = {s:0, f:0, back: back || G.scene, guarded: allyUp()};
  log('bad', `<b>You fall.</b> The world goes grey and distant. Roll death saving throws: three successes and you live, three failures and you die.`);
  render();
}
function deathSave(){
  const r = d20test({mod:0});
  let line = `Death save: ${diceHTML(r)}`;
  if (r.nat === 20){
    log('roll', line + ` <em class="ok">Natural 20!</em>${r.note}`);
    log('good', 'You gasp awake with 1 hit point!');
    return wake(false);
  }
  if (r.nat === 1){ G.down.f += 2; line += ` <em class="no">Natural 1, two failures</em>`; }
  else if (r.total >= 10){ G.down.s++; line += ` <em class="ok">Success</em>`; }
  else { G.down.f++; line += ` <em class="no">Failure</em>`; }
  log('roll', line + ` (${G.down.s} of 3 successes, ${G.down.f} of 3 failures)${r.note}`);
  if (G.down.f >= 3) return die();
  if (G.down.s >= 3) return wake(true);
  render();
}
function wake(robbed){
  G.char.hp = Math.max(1, G.char.hp);
  if (robbed && G.down.guarded){
    robbed = false;
    log('text', `Darkness. Then a warm, wet tongue on your face. ${esc(G.ally.name)} stood over you until your foes gave up and left. You wake with 1 hit point and every coin still in your purse.`);
  }
  if (G.ally && G.ally.hp <= 0) G.ally.hp = 1;
  if (robbed){
    const lost = Math.floor(G.char.gold / 2);
    G.char.gold -= lost;
    log('text', `Darkness. Then, slowly, cold stone and the taste of blood. You wake with 1 hit point. Whatever attacked you is gone${lost ? `, and so are ${lost} of your gold coins` : ''}.`);
  }
  const back = G.down.back;
  G.down = null; G.mode = 'explore';
  goTo(back, true);
}
function die(){
  G.mode = 'dead';
  log('bad', `<b>${esc(G.char.name)} has died.</b> The Thornvale keeps its secrets a while longer.`);
  render();
}

/* ---------- companions ---------- */
const allyUp = () => !!(G.ally && G.ally.hp > 0);
function joinAlly(key){
  const a = ALLIES[key];
  G.ally = {key, name:a.name, hp:a.hp, max:a.hp};
  log('good', `${esc(a.name)} joins you as a companion.`);
}
function healAlly(expr, why){
  const r = rollDice(expr), before = G.ally.hp;
  G.ally.hp = Math.min(G.ally.max, G.ally.hp + r.total);
  log('good', `${why}: ${esc(G.ally.name)} regains <b>${G.ally.hp - before}</b> hit points (${r.text}).`);
}
function applyLite(o){
  if (o.fn) o.fn(G);
  if (o.text) say(resolveText(o.text));
  if (o.set) Object.assign(G.flags, o.set);
  if (o.give) give(o.give);
}

/* ---------- outcomes ---------- */
function resolve(o){
  if (!o){ render(); return; }
  if (typeof o === 'string'){ goTo(o); return; }
  if (o.fn) o.fn(G);
  if (o.text) say(resolveText(o.text));
  if (o.set) Object.assign(G.flags, o.set);
  if (o.take) take(o.take);
  if (o.give) give(o.give);
  if (o.ally) joinAlly(o.ally);
  if (o.allyLeave && G.ally){ log('sys', `${esc(G.ally.name)} leaves you.`); G.ally = null; }
  if (o.captive && CAPTIVES[o.captive]){ G.captive = o.captive; }
  if (o.damage){ if (applyHazard(o.damage)) return; }
  if (o.check){ const ok = doCheck(o.check); resolve(ok ? o.check.pass : o.check.fail); return; }
  if (o.choices){ G.choices = o.choices; render(); return; }
  if (o.shop && SHOPS[o.shop]){ G.shop = o.shop; render(); return; }
  if (o.fight){ startCombat(typeof o.fight === 'function' ? o.fight(G) : o.fight); return; }
  if (o.go){ goTo(typeof o.go === 'function' ? o.go(G) : o.go); return; }
  render();
}
function chooseOption(opt){
  if (G.mode !== 'explore') return;
  if (opt.once) G.flags['once_' + opt.once] = true;
  if (G.choices && !opt.stay) G.choices = null;
  log('you', esc(opt.label));
  resolve(opt);
}
function optionVisible(o){
  if (o.once && G.flags['once_' + o.once]) return false;
  if (o.if && !o.if(G)) return false;
  return true;
}
function goTo(id, quiet){
  const sc = STORY[id];
  if (!sc){ log('sys', `Missing scene: ${esc(id)}`); render(); return; }
  G.shop = null;
  if (sc.reader){ showSection(G.module ? G.module.idx || 0 : 0); return; }
  G.scene = id; G.choices = null; G.mode = 'explore';
  G.visits[id] = (G.visits[id] || 0) + 1;
  if (sc.onEnter) sc.onEnter(G);
  log('scene', esc(sc.title));
  const first = G.visits[id] === 1 || !sc.back;
  say(resolveText(first ? sc.text : sc.back));
  if (sc.area === 'town') G.alert = 0;
  render();
  autosave();
}

/* ---------- random encounters ---------- */
function wander(){
  const sc = STORY[G.scene], table = ENCOUNTERS[sc.area];
  if (!table) return;
  log('you', 'Explore the area');
  const raw = d(20), shift = table.alert ? G.alert : 0, n = clamp(raw - shift, 1, 20);
  if (table.alert) G.alert = Math.min(6, G.alert + 1);
  const row = table.rows.find(r => n >= r.range[0] && n <= r.range[1]) || {label:'Quiet', pick:[{text:`Nothing stirs.`}]};
  log('roll', `Encounter roll: d20 <b>${raw}</b>${shift ? ` minus ${shift} for ${(table.alertName || 'noise').toLowerCase()}` : ''} = <b>${n}</b> <em class="${row.label === 'Hostile' || row.label === 'Trap' || row.label === 'Hazard' ? 'no' : 'ok'}">${row.label}</em>`);
  const pool = row.pick.filter(o => !o.once || !G.flags['once_' + o.once]);
  if (row.label === 'Hostile') BESTIARY.filter(m => (m.areas || []).includes(sc.area)).forEach(m => pool.push({text:`A ${esc(m.name)} appears!`, fight:{foes:['my_' + m.id]}}));
  const o = pool.length ? pick(pool) : {text:`You search carefully, but find nothing new.`};
  if (o.once) G.flags['once_' + o.once] = true;
  resolve(o);
}

/* ---------- rests ---------- */
function shortRest(){
  const sc = STORY[G.scene], table = ENCOUNTERS[sc.area];
  log('you', 'Take a short rest');
  if (table && table.ambush){
    const r = d(6), risk = 1 + Math.floor(G.alert / 3);
    log('roll', `Rest interruption: d6 <b>${r}</b>, interrupted on ${risk === 1 ? '1' : '1 to ' + risk}`);
    if (r <= risk){ resolve(pick(table.ambush)); return; }
  }
  const ch = G.char;
  say(`You rest for an hour, binding wounds and catching your breath.`);
  let spent = 0;
  while (ch.hp < ch.maxHp && ch.hd.left > 0){
    ch.hd.left--; spent++;
    const r = rollDice('1d' + cls().hd);
    const n = Math.max(1, r.total + am('con'));
    const before = ch.hp;
    ch.hp = Math.min(ch.maxHp, ch.hp + n);
    log('good', `Hit Die ${r.text} ${sgn(am('con'))}: regain <b>${ch.hp - before}</b> hit points.`);
  }
  if (!spent && ch.hp < ch.maxHp) log('sys', 'You have no Hit Dice left to spend. A long rest in town restores them.');
  resetUses(ch, 'short');
  if (G.ally && G.ally.hp < G.ally.max){ G.ally.hp = G.ally.max; log('good', `${esc(G.ally.name)} licks his wounds and is back to full strength.`); }
  if (hasFeat('arcaneRecovery') && ch.uses.arcaneRecovery > 0 && ch.slots && ch.slots.left < ch.slots.max){
    ch.uses.arcaneRecovery--; ch.slots.left++;
    log('good', 'Arcane Recovery: you regain one spell slot.');
  }
  render(); autosave();
}
function longRest(){
  const ch = G.char;
  log('you', 'Take a long rest');
  say(`You sleep in a real bed and wake to the smell of bacon.`);
  ch.hp = ch.maxHp;
  ch.hd.left = Math.min(ch.hd.max, ch.hd.left + Math.max(1, Math.floor(ch.hd.max / 2)));
  if (ch.slots) ch.slots.left = ch.slots.max;
  resetUses(ch, 'long');
  if (G.ally) G.ally.hp = G.ally.max;
  G.alert = 0;
  log('good', 'Hit points, spell slots, and abilities restored.');
  render(); autosave();
}

/* ---------- items outside of combat ---------- */
function useItem(id, onAlly){
  const it = ITEMS[id];
  if (!has(id) || !it.use) return;
  takeItem(id);
  if (it.use === 'heal' && onAlly && G.ally){ healAlly(it.heal, it.name); return; }
  if (it.use === 'heal') heal(it.heal, it.name);
  if (it.use === 'insp'){ G.char.insp = true; log('good', `You light the ${it.name}. You gain Inspiration.`); }
}

