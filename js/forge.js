/* =====================================================================
   THORNVALE CHRONICLES : forge.js
   The Spell Forge at the Amberglass Collegium in Aldermere. Design your own
   spell from a shape, an element, a power level and a saving throw.
   Spellcasters learn it. Anyone can buy scrolls of it.
   Custom spells live on the character (ch.custom) and travel in saves.
   ===================================================================== */
'use strict';

const FORGE_SHAPES = {
  bolt: {name:'Bolt', kind:'attack', levels:[0, 1], dice:{0:'1d10', 1:'3d8'}, emp:{0:'2d10', 1:'4d8'},
         about:'A spell attack against one foe.'},
  brand:{name:'Brand', kind:'attack', levels:[1], mark:true, dice:{1:'2d8'}, emp:{1:'3d8'},
         about:'A spell attack against one foe. On a hit it glows, and your next attack on it has advantage.'},
  lance:{name:'Lance', kind:'save', levels:[0, 1], dice:{0:'1d8', 1:'3d8'}, emp:{0:'2d8', 1:'4d8'},
         about:'One foe makes a saving throw or takes the damage.'},
  wave: {name:'Wave', kind:'aoe', levels:[0, 1], dice:{0:'1d4', 1:'3d6'}, emp:{0:'1d8', 1:'4d6'},
         about:'Every foe makes a saving throw, taking half damage on a success.'},
  mend: {name:'Mend', kind:'heal', levels:[1], heal:{1:'1d8'}, emp:{1:'2d8'},
         about:'Healing for you or your companion, plus your spellcasting modifier.'}
};
const FORGE_ELEMENTS = ['fire','cold','lightning','thunder','acid','poison','radiant','necrotic','force','psychic'];
const FORGE_SAVES = ['dex','con','wis'];
const FORGE_COST = {0:60, 1:120, emp:100};
const SCROLL_COST = {0:15, 1:40};
const MAX_CUSTOM = 4;

/* add a character's custom spells (and their scrolls) to SPELLS and ITEMS */
function registerCustomSpells(ch){
  (ch.custom || []).forEach(s => {
    SPELLS[s.id] = s;
    ITEMS['sc_' + s.id] = {name:`Scroll of ${s.name}`, use:'scroll', spell:s.id, cost:SCROLL_COST[s.level] * 2,
      desc:`Read it to cast ${s.name}: ${s.desc} Scrolls use spell attack +5 and save DC 13, need no spell slot, and work in any armor.`};
  });
}
function knownSpells(ch=G.char){
  const c = cls(ch);
  const mine = c.cast ? (ch.custom || []).filter(s => s.learned) : [];
  return {cantrips:[...(c.cantrips || []), ...mine.filter(s => s.level === 0).map(s => s.id)],
          spells:[...(c.spells || []), ...mine.filter(s => s.level > 0).map(s => s.id)]};
}
function forgeSpec(f){
  const sh = FORGE_SHAPES[f.shape];
  const lvl = sh.levels.includes(f.level) ? f.level : sh.levels[0];
  const dice = (f.emp ? sh.emp : (sh.dice || sh.heal))[lvl];
  const sp = {name:(f.name || '').trim().slice(0, 30) || 'Unnamed Spell', level:lvl, kind:sh.kind, custom:true, emp:!!f.emp};
  if (sh.kind === 'heal'){ sp.heal = dice; sp.desc = `Heal ${dice} + your spellcasting modifier.`; }
  else {
    sp.dmg = dice; sp.type = f.element;
    if (sh.kind === 'save' || sh.kind === 'aoe') sp.save = f.save;
    if (sh.mark) sp.mark = true;
    sp.desc = sh.kind === 'attack' ? `Ranged spell attack. ${dice} ${f.element}${sh.mark ? ', and your next attack on the target has advantage' : ''}.`
      : sh.kind === 'save' ? `One foe makes a ${ABIL_NAME[f.save]} save or takes ${dice} ${f.element}.`
      : `Every foe makes a ${ABIL_NAME[f.save]} save. ${dice} ${f.element}, half on a success.`;
  }
  sp.desc += ` ${lvl ? '1st level' : 'Cantrip'}${f.emp ? ', empowered' : ''}. Forged at the Amberglass Collegium.`;
  return sp;
}
const forgeCost = f => FORGE_COST[FORGE_SHAPES[f.shape].levels.includes(f.level) ? f.level : FORGE_SHAPES[f.shape].levels[0]] + (f.emp ? FORGE_COST.emp : 0);
const forgeLevelOK = lvl => lvl === 0 || repAtLeast(10);

function forgeSpell(){
  const f = ui.forgeDraft, ch = G.char, sp = forgeSpec(f), cost = forgeCost(f);
  ch.custom = ch.custom || [];
  if (sp.level > 0 && !repAtLeast(10)) return notice('First-level designs need the Collegium library. Reach Known standing in Aldermere.');
  if (f.emp && !repAtLeast(45)) return notice('Empowered designs need the Collegium sanctum. Reach Respected standing in Aldermere.');
  if (ch.custom.filter(s => !s.forgotten).length >= MAX_CUSTOM) return notice(`You can hold ${MAX_CUSTOM} designs at a time. Forget one first.`);
  if (ch.gold < cost) return notice(`That design costs ${cost} gold. You have ${ch.gold}.`);
  ch.gold -= cost;
  sp.id = 'cs_' + Date.now().toString(36) + Math.floor(Math.random() * 1000);
  sp.learned = !!cls().cast;
  ch.custom.push(sp);
  registerCustomSpells(ch);
  addItem('sc_' + sp.id, 2);
  log('you', `Forge a spell: ${esc(sp.name)}`);
  say(`Magister Ashe watches over your shoulder as the sigils settle into place on the forge table. ${sp.learned ? `<b>${esc(sp.name)}</b> is yours now: you can cast it like any spell you know.` : `You cannot cast spells yourself, so the Collegium scribes ink your design onto scrolls. You take two scrolls of <b>${esc(sp.name)}</b>.`}`);
  log('good', `${esc(sp.name)}: ${esc(sp.desc)}`);
  ui.forgeDraft = Object.assign({}, f, {name:''});
  render(); autosave();
}
function forgetSpell(id){
  const ch = G.char;
  const s = (ch.custom || []).find(x => x.id === id);
  if (s){ s.forgotten = true; s.learned = false; }
  log('sys', 'You let the design fade from your notes. Any scrolls you still carry keep working.');
  render(); autosave();
}
function buyScroll(id){
  const s = SPELLS[id], cost = SCROLL_COST[s.level];
  if (G.char.gold < cost) return notice(`A scroll costs ${cost} gold.`);
  G.char.gold -= cost; addItem('sc_' + id);
  log('good', `The scribes copy a scroll of ${esc(s.name)} for ${cost} gp.`);
  render(); autosave();
}
function renderForge(box){
  const ch = G.char;
  const f = ui.forgeDraft = ui.forgeDraft || {name:'', shape:'bolt', level:0, element:'fire', save:'dex', emp:false};
  const sh = FORGE_SHAPES[f.shape];
  if (!sh.levels.includes(f.level)) f.level = sh.levels[0];
  const sp = forgeSpec(f), cost = forgeCost(f), caster = !!cls().cast;
  const needsSave = sh.kind === 'save' || sh.kind === 'aoe';
  const lockLvl = !repAtLeast(10), lockEmp = !repAtLeast(45);
  const opt = (v, t, sel, dis) => `<option value="${v}" ${String(v) === String(sel) ? 'selected' : ''} ${dis ? 'disabled' : ''}>${t}</option>`;
  let h = `<div class="shop"><div class="shophead"><div><span class="lbl2">Amberglass Collegium</span><b>The Spell Forge</b></div><span class="gold">${ch.gold} gp</span></div>
    <p class="small" style="margin:0">${caster ? 'Design a spell and learn it. Cantrips are free to cast; 1st-level spells use a spell slot.' : 'You are no spellcaster, but the scribes can ink your design onto scrolls. Each design comes with two scrolls, and you can buy more here.'} You can hold ${MAX_CUSTOM} designs.</p>
    <div class="fgrid">
      <label class="fld">Spell name<input id="fgName" maxlength="30" placeholder="Ember Lance" value="${esc(f.name)}"></label>
      <label class="fld">Shape<select id="fgShape">${Object.entries(FORGE_SHAPES).map(([k, s]) => opt(k, s.name, f.shape)).join('')}</select></label>
      <label class="fld">Power<select id="fgLevel">${sh.levels.map(l => opt(l, l ? `1st level${lockLvl ? ' (Known standing)' : ''}` : 'Cantrip', f.level, l > 0 && lockLvl)).join('')}</select></label>
      ${sh.kind === 'heal' ? '' : `<label class="fld">Element<select id="fgEl">${FORGE_ELEMENTS.map(e => opt(e, e[0].toUpperCase() + e.slice(1), f.element)).join('')}</select></label>`}
      ${needsSave ? `<label class="fld">Saving throw<select id="fgSave">${FORGE_SAVES.map(a => opt(a, ABIL_NAME[a], f.save)).join('')}</select></label>` : ''}
    </div>
    <label class="ck"><input type="checkbox" id="fgEmp" ${f.emp ? 'checked' : ''} ${lockEmp ? 'disabled' : ''}> Empowered: one more damage die (+${FORGE_COST.emp} gp)${lockEmp ? '. Needs Respected standing.' : ''}</label>
    <div class="item"><div class="it"><b>${esc(sp.name)}</b> <span class="chip">${sp.level ? '1st level' : 'Cantrip'}</span><p>${esc(sh.about)} ${esc(sp.desc)}</p></div>
      <button type="button" class="mini" id="fgMake" ${ch.gold >= cost && (ch.custom || []).filter(s => !s.forgotten).length < MAX_CUSTOM ? '' : 'disabled'}>Forge · ${cost} gp</button></div>`;
  const mine = (ch.custom || []).filter(s => !s.forgotten);
  h += `<h4 class="shoph">Your designs <span>${mine.length} of ${MAX_CUSTOM}</span></h4><div class="shoplist">`;
  h += mine.length ? mine.map(s => `<div class="sitem"><div class="it"><b>${esc(s.name)}</b> <span class="chip">${s.learned ? 'Known' : 'Scrolls'}</span> ${has('sc_' + s.id) ? `<span class="chip">${ch.inv['sc_' + s.id]} scroll${ch.inv['sc_' + s.id] > 1 ? 's' : ''}</span>` : ''}<p>${esc(s.desc)}</p></div>
      <div class="row" style="flex-wrap:nowrap"><button type="button" class="mini" data-scroll="${s.id}" ${ch.gold >= SCROLL_COST[s.level] ? '' : 'disabled'}>Scroll · ${SCROLL_COST[s.level]} gp</button><button type="button" class="mini" data-forget="${s.id}">${ui.forgetPick === s.id ? 'Confirm' : 'Forget'}</button></div></div>`).join('')
    : '<p class="empty">No designs yet.</p>';
  h += `</div></div>`;
  box.innerHTML = h;
  const upd = (k, v) => { f[k] = v; renderForge(box); };
  $('fgName').addEventListener('input', e => { f.name = e.target.value; const b = box.querySelector('.item .it b'); if (b) b.textContent = forgeSpec(f).name; });
  $('fgShape').addEventListener('change', e => upd('shape', e.target.value));
  $('fgLevel').addEventListener('change', e => upd('level', +e.target.value));
  if ($('fgEl')) $('fgEl').addEventListener('change', e => upd('element', e.target.value));
  if ($('fgSave')) $('fgSave').addEventListener('change', e => upd('save', e.target.value));
  $('fgEmp').addEventListener('change', e => upd('emp', e.target.checked));
  $('fgMake').addEventListener('click', forgeSpell);
  box.querySelectorAll('[data-scroll]').forEach(b => b.addEventListener('click', () => buyScroll(b.dataset.scroll)));
  box.querySelectorAll('[data-forget]').forEach(b => b.addEventListener('click', () => {
    if (ui.forgetPick === b.dataset.forget){ ui.forgetPick = null; forgetSpell(b.dataset.forget); } else { ui.forgetPick = b.dataset.forget; renderForge(box); }
  }));
  const leave = document.createElement('button');
  leave.type = 'button'; leave.className = 'choice';
  leave.innerHTML = `<span class="k">1</span><span class="lbl">Step away from the forge</span>`;
  leave.addEventListener('click', () => { G.forge = false; log('you', 'Leave the Spell Forge'); render(); autosave(); });
  box.appendChild(leave);
  keyActions.push(leave);
}
