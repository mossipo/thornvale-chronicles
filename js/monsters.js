/* =====================================================================
   THORNVALE CHRONICLES : monsters.js
   Monster statistics (SRD 5.1) and companions. Copy an entry to add a
   monster. Monsters you add in the game's Bestiary are stored in the browser.
   ===================================================================== */
'use strict';

/* Monsters use SRD 5.1 statistics. special: nimble, pack, martial, undead */
const MONSTERS = {
  goblin:   {name:'Goblin', ac:15, hp:7, xp:50, pp:9, init:2, type:'humanoid', special:['nimble'],
             save:{str:-1,dex:2,con:0,int:0,wis:-1,cha:-1}, attack:{name:'Scimitar', toHit:4, dmg:'1d6+2', type:'slashing'}},
  wolf:     {name:'Wolf', ac:13, hp:11, xp:50, pp:13, init:2, type:'beast', special:['pack'],
             save:{str:1,dex:2,con:1,int:-4,wis:1,cha:-2}, attack:{name:'Bite', toHit:4, dmg:'2d4+2', type:'piercing'}},
  skeleton: {name:'Skeleton', ac:13, hp:13, xp:50, pp:9, init:2, type:'undead', special:['undead'], vuln:['bludgeoning'], immune:['poison'],
             save:{str:0,dex:2,con:2,int:-2,wis:-1,cha:-3}, attack:{name:'Shortsword', toHit:4, dmg:'1d6+2', type:'piercing'}},
  rat:      {name:'Giant Rat', ac:12, hp:7, xp:25, pp:10, init:2, type:'beast', special:['pack'],
             save:{str:-2,dex:2,con:0,int:-4,wis:0,cha:-3}, attack:{name:'Bite', toHit:4, dmg:'1d4+2', type:'piercing'}},
  kobold:   {name:'Kobold', ac:12, hp:5, xp:25, pp:8, init:2, type:'humanoid', special:['pack'],
             save:{str:-2,dex:2,con:-1,int:-1,wis:-2,cha:-1}, attack:{name:'Dagger', toHit:4, dmg:'1d4+2', type:'piercing'}},
  stirge:   {name:'Stirge', ac:14, hp:2, xp:25, pp:9, init:3, type:'beast', special:[],
             save:{str:-3,dex:3,con:0,int:-4,wis:-1,cha:-2}, attack:{name:'Blood Drain', toHit:5, dmg:'1d4+3', type:'piercing'}},
  hobgoblin:{name:'Hobgoblin', ac:18, hp:11, xp:100, pp:10, init:1, type:'humanoid', special:['martial'],
             save:{str:1,dex:1,con:1,int:0,wis:0,cha:-1}, attack:{name:'Longsword', toHit:3, dmg:'1d8+1', type:'slashing'}},
  wkobold:  {name:'Winged Kobold', ac:13, hp:7, xp:50, pp:8, init:3, type:'humanoid', special:['pack'],
             save:{str:-2,dex:3,con:-1,int:-1,wis:-2,cha:-1}, attack:{name:'Dropped Rock', toHit:5, dmg:'1d6+3', type:'bludgeoning'}},
  weasel:   {name:'Giant Weasel', ac:13, hp:9, xp:25, pp:13, init:3, type:'beast', special:[],
             save:{str:0,dex:3,con:0,int:-3,wis:1,cha:-3}, attack:{name:'Bite', toHit:5, dmg:'1d4+3', type:'piercing'}},
  frog:     {name:'Giant Frog', ac:11, hp:18, xp:50, pp:12, init:1, type:'beast', special:[],
             save:{str:1,dex:1,con:0,int:-4,wis:-1,cha:-4}, attack:{name:'Bite', toHit:3, dmg:'1d6+1', type:'piercing'}},
  orc:      {name:'Orc', ac:13, hp:15, xp:100, pp:10, init:1, type:'humanoid', special:[],
             save:{str:3,dex:1,con:3,int:-2,wis:0,cha:0}, attack:{name:'Greataxe', toHit:5, dmg:'1d12+3', type:'slashing'}},
  /* guard and thug are with the other people templates below */
};

/* Companions who fight beside the hero. They act right after you each round. */
const ALLIES = {
  brindle:{name:'Brindle', kind:'Mastiff', ac:12, hp:5, keen:true, trip:11,
           attack:{name:'Bite', toHit:3, dmg:'1d6+1', type:'piercing'},
           desc:"Marta's mastiff: brown, enormous, and devoted. His bite can knock a foe prone (Strength save DC 11). His nose gives you advantage on Perception checks and +5 passive Perception."}
};

/* =====================================================================
   PEOPLE: SRD 5.1 NPC templates (Appendix B), with original descriptions.
   Use them for anyone the hero might fight: name a foe in a fight with
   {key:'bandit_captain', name:'Mag Rusk'} to give a template a face.

   Extra keys the combat engine understands:
     actions  weighted routines, one picked each turn:
              [{w:3, strikes:[...]}, {w:1, strikes:[...]}]
              a strike is an attack roll {name, toHit, dmg, type, rider}
              or a save {name, save:'dex', dc, dmg, type, half}
              uses:N limits a strike (spell slots) per fight
              {w, heal:'1d8+2', uses:3, name} heals a hurt friend instead
     parry    adds N to AC against one melee hit each round
     sneak    extra dice once per turn with advantage or a friend nearby
     resist   damage types halved
     special  reckless, assassinate, magicres, evasion, brave, nimble, pack
   ===================================================================== */
const _S = (name, toHit, dmg, type, extra) => Object.assign({name, toHit, dmg, type}, extra || {});
const _V = (name, save, dc, dmg, type, half, extra) => Object.assign({name, save, dc, dmg, type, half:!!half}, extra || {});
const _POISON = {save:'con', dc:15, dmg:'7d6', type:'poison', half:true};

Object.assign(MONSTERS, {
  commoner:{name:'Commoner', npc:true, cr:'0', ac:10, hp:4, xp:10, pp:10, init:0, type:'humanoid', special:[],
    save:{str:0,dex:0,con:0,int:0,wis:0,cha:0},
    actions:[{w:1, strikes:[_S('Club', 2, '1d4', 'bludgeoning')]}],
    desc:`Farmers, ferry hands, millers, pilgrims, and the people who sell you cider. Most will run before they fight, and nobody should blame them.`},
  acolyte:{name:'Acolyte', npc:true, cr:'1/4', ac:10, hp:9, xp:50, pp:12, init:0, type:'humanoid', special:[],
    save:{str:0,dex:0,con:0,int:0,wis:2,cha:0},
    actions:[
      {w:1, strikes:[_S('Club', 2, '1d4', 'bludgeoning')]},
      {w:2, strikes:[_V('Sacred Flame', 'dex', 12, '1d8', 'radiant', false)]},
      {w:2, heal:'1d8+2', uses:3, name:'Cure Wounds'}],
    desc:`A junior servant of a shrine or chapel. Acolytes sweep floors, light candles, keep the records, and know a few prayers that actually work. Spells: Sacred Flame, Cure Wounds (3 per day).`},
  priest:{name:'Priest', npc:true, cr:'2', ac:13, hp:27, xp:450, pp:13, init:0, type:'humanoid', special:[],
    save:{str:0,dex:0,con:1,int:1,wis:3,cha:1},
    actions:[
      {w:1, strikes:[_S('Mace', 2, '1d6', 'bludgeoning')]},
      {w:2, strikes:[_V('Sacred Flame', 'dex', 13, '2d8', 'radiant', false)]},
      {w:1, strikes:[_S('Guiding Bolt', 5, '4d6', 'radiant', {uses:2, spell:true})]},
      {w:1, strikes:[_V('Spirit Guardians', 'wis', 13, '3d8', 'radiant', true, {uses:2})]},
      {w:2, heal:'1d8+3', uses:3, name:'Cure Wounds'}],
    desc:`The shepherd of a congregation: preacher, counselor, and keeper of a shrine. A faithful priest is the first one a village sends for. A false one can lead a whole valley astray. Spells: Sacred Flame, Guiding Bolt, Spirit Guardians, Cure Wounds.`},
  cultist:{name:'Cultist', npc:true, cr:'1/8', ac:12, hp:9, xp:25, pp:10, init:1, type:'humanoid', special:['brave'],
    save:{str:0,dex:1,con:0,int:0,wis:0,cha:0},
    actions:[{w:1, strikes:[_S('Scimitar', 3, '1d6+1', 'slashing')]}],
    desc:`Someone who has sworn themselves to a dark master in secret. Most keep an ordinary trade by day. Dark Devotion: hard to charm or frighten.`},
  cult_fanatic:{name:'Cult Fanatic', npc:true, cr:'2', ac:13, hp:33, xp:450, pp:11, init:2, type:'humanoid', special:['brave'],
    save:{str:0,dex:2,con:1,int:0,wis:1,cha:2},
    actions:[
      {w:2, strikes:[_S('Dagger', 4, '1d4+2', 'piercing'), _S('Dagger', 4, '1d4+2', 'piercing')]},
      {w:1, strikes:[_S('Inflict Wounds', 3, '3d10', 'necrotic', {uses:4, spell:true})]},
      {w:1, strikes:[_V('Sacred Flame', 'dex', 11, '1d8', 'radiant', false)]}],
    desc:`A cult's preacher and enforcer, the one who recruits the lonely and the angry. Spells: Inflict Wounds, Sacred Flame. Dark Devotion: hard to charm or frighten.`},
  druid:{name:'Druid', npc:true, cr:'2', ac:11, hp:27, xp:450, pp:14, init:1, type:'humanoid', special:[],
    save:{str:0,dex:1,con:1,int:1,wis:2,cha:0},
    actions:[
      {w:2, strikes:[_S('Quarterstaff (Shillelagh)', 4, '1d8+2', 'bludgeoning')]},
      {w:2, strikes:[_S('Produce Flame', 4, '1d8', 'fire', {spell:true})]},
      {w:1, strikes:[_V('Thunderwave', 'con', 12, '2d8', 'thunder', true, {uses:4})]}],
    desc:`A keeper of wild places who speaks with birds and listens to weather. Druids care for the land first and people second. Spells: Shillelagh, Produce Flame, Thunderwave.`},
  bandit:{name:'Bandit', npc:true, cr:'1/8', ac:12, hp:11, xp:25, pp:10, init:1, type:'humanoid', special:[],
    save:{str:0,dex:1,con:1,int:0,wis:0,cha:0},
    actions:[
      {w:2, strikes:[_S('Scimitar', 3, '1d6+1', 'slashing')]},
      {w:1, strikes:[_S('Light Crossbow', 3, '1d8+1', 'piercing')]}],
    desc:`A road robber. Some were born to it. More were farmers once, until a bad harvest or a cruel lord pushed them into the trees.`},
  bandit_captain:{name:'Bandit Captain', npc:true, cr:'2', ac:15, hp:65, xp:450, pp:10, init:3, type:'humanoid', special:[], parry:2,
    save:{str:4,dex:5,con:2,int:2,wis:2,cha:2},
    actions:[
      {w:3, strikes:[_S('Scimitar', 5, '1d6+3', 'slashing'), _S('Scimitar', 5, '1d6+3', 'slashing'), _S('Dagger', 5, '1d4+3', 'piercing')]},
      {w:1, strikes:[_S('Thrown Dagger', 5, '1d4+3', 'piercing'), _S('Thrown Dagger', 5, '1d4+3', 'piercing')]}],
    desc:`The sharpest blade and quickest tongue in a gang of robbers, and the reason the rest of them stay in line. Parry: +2 AC against one melee hit each round.`},
  thug:{name:'Thug', npc:true, cr:'1/2', ac:11, hp:32, xp:100, pp:10, init:0, type:'humanoid', special:['pack'],
    save:{str:2,dex:0,con:2,int:0,wis:0,cha:0},
    attack:{name:'Mace', toHit:4, dmg:'1d6+2', type:'bludgeoning'},
    actions:[
      {w:3, strikes:[_S('Mace', 4, '1d6+2', 'bludgeoning'), _S('Mace', 4, '1d6+2', 'bludgeoning')]},
      {w:1, strikes:[_S('Heavy Crossbow', 2, '1d10', 'piercing')]}],
    desc:`Hired muscle. Thugs collect debts, guard doors, and break things for whoever pays. Pack Tactics: advantage when a friend is beside them.`},
  guard:{name:'Guard', npc:true, cr:'1/8', ac:16, hp:11, xp:25, pp:12, init:1, type:'humanoid', special:[],
    save:{str:1,dex:1,con:1,int:0,wis:0,cha:0},
    attack:{name:'Spear', toHit:3, dmg:'1d6+1', type:'piercing'},
    actions:[{w:1, strikes:[_S('Spear', 3, '1d6+1', 'piercing')]}],
    desc:`A watchman, gate warden, or caravan guard in mail and a shield. Most are honest folk doing a cold job for modest pay.`},
  clan_warrior:{name:'Clan Warrior', npc:true, cr:'1/8', ac:12, hp:11, xp:25, pp:10, init:0, type:'humanoid', special:['pack'],
    save:{str:1,dex:0,con:1,int:-1,wis:0,cha:-1},
    actions:[{w:1, strikes:[_S('Spear', 3, '1d8+1', 'piercing')]}],
    desc:`A hunter and defender of a hill clan or river people far from any town, loyal to kin and to the elders. Pack Tactics: advantage when a friend is beside them.`},
  noble:{name:'Noble', npc:true, cr:'1/8', ac:15, hp:9, xp:25, pp:12, init:1, type:'humanoid', special:[], parry:2,
    save:{str:0,dex:1,con:0,int:1,wis:2,cha:3},
    actions:[{w:1, strikes:[_S('Rapier', 3, '1d8+1', 'piercing')]}],
    desc:`A landholder, magistrate, or merchant prince with fencing lessons and expensive armor. Their real weapons are money and friends. Parry: +2 AC against one melee hit each round.`},
  scout:{name:'Scout', npc:true, cr:'1/2', ac:13, hp:16, xp:100, pp:15, init:2, type:'humanoid', special:[],
    save:{str:0,dex:2,con:1,int:0,wis:1,cha:0},
    actions:[
      {w:2, strikes:[_S('Longbow', 4, '1d8+2', 'piercing'), _S('Longbow', 4, '1d8+2', 'piercing')]},
      {w:1, strikes:[_S('Shortsword', 4, '1d6+2', 'piercing'), _S('Shortsword', 4, '1d6+2', 'piercing')]}],
    desc:`A tracker, guide, or bounty hunter who reads mud like a book. Keen Hearing and Sight.`},
  spy:{name:'Spy', npc:true, cr:'1', ac:12, hp:27, xp:200, pp:16, init:2, type:'humanoid', special:['nimble'], sneak:'2d6',
    save:{str:0,dex:2,con:0,int:1,wis:2,cha:3},
    actions:[
      {w:2, strikes:[_S('Shortsword', 4, '1d6+2', 'piercing'), _S('Shortsword', 4, '1d6+2', 'piercing')]},
      {w:1, strikes:[_S('Hand Crossbow', 4, '1d6+2', 'piercing')]}],
    desc:`An informant who trades in secrets: a clerk who reads other people's letters, a servant who listens at doors. Cunning Action, and Sneak Attack (2d6).`},
  berserker:{name:'Berserker', npc:true, cr:'2', ac:13, hp:67, xp:450, pp:10, init:1, type:'humanoid', special:['reckless'],
    save:{str:3,dex:1,con:3,int:-1,wis:0,cha:-1},
    actions:[{w:1, strikes:[_S('Greataxe', 5, '1d12+3', 'slashing')]}],
    desc:`A raider who fights in a howling rage. Reckless: it swings with advantage, but your attacks against it have advantage too.`},
  veteran:{name:'Veteran', npc:true, cr:'3', ac:17, hp:58, xp:700, pp:12, init:1, type:'humanoid', special:[],
    save:{str:3,dex:1,con:2,int:0,wis:0,cha:0},
    actions:[
      {w:3, strikes:[_S('Longsword', 5, '1d8+3', 'slashing'), _S('Longsword', 5, '1d8+3', 'slashing'), _S('Shortsword', 5, '1d6+3', 'piercing')]},
      {w:1, strikes:[_S('Heavy Crossbow', 3, '1d10+1', 'piercing')]}],
    desc:`A soldier who survived long enough to get good at it: a retired sergeant, a sellsword, a river watch captain. Steady, patient, and hard to rattle.`},
  knight:{name:'Knight', npc:true, cr:'3', ac:18, hp:52, xp:700, pp:10, init:0, type:'humanoid', special:['brave'], parry:2,
    save:{str:3,dex:0,con:4,int:0,wis:2,cha:2},
    actions:[
      {w:3, strikes:[_S('Greatsword', 5, '2d6+3', 'slashing'), _S('Greatsword', 5, '2d6+3', 'slashing')]},
      {w:1, strikes:[_S('Heavy Crossbow', 2, '1d10', 'piercing')]}],
    desc:`A warrior bound by oath to a lord, an order, or a cause, in plate from head to heel. Brave. Parry: +2 AC against one melee hit each round.`},
  gladiator:{name:'Gladiator', npc:true, cr:'5', ac:16, hp:112, xp:1800, pp:11, init:2, type:'humanoid', special:['brave'], parry:3,
    save:{str:7,dex:5,con:6,int:0,wis:1,cha:2},
    actions:[
      {w:3, strikes:[_S('Spear', 7, '2d6+4', 'piercing'), _S('Spear', 7, '2d6+4', 'piercing'),
                     _S('Shield Bash', 7, '2d4+4', 'bludgeoning', {prone:{save:'str', dc:15}})]},
      {w:1, strikes:[_S('Thrown Spear', 7, '1d6+4', 'piercing'), _S('Thrown Spear', 7, '1d6+4', 'piercing')]}],
    desc:`A pit fighter and crowd favorite who has won a hundred bouts. Brute strength, a heavy shield, and no fear at all. Parry: +3 AC against one melee hit each round.`},
  mage:{name:'Mage', npc:true, cr:'6', ac:15, hp:40, xp:2300, pp:11, init:2, type:'humanoid', special:[],
    save:{str:-1,dex:2,con:0,int:6,wis:4,cha:0},
    actions:[
      {w:3, strikes:[_S('Fire Bolt', 6, '2d10', 'fire', {spell:true})]},
      {w:1, strikes:[{name:'Magic Missile', missile:3, dmg:'1d4+1', type:'force', uses:2}]},
      {w:1, strikes:[_V('Fireball', 'dex', 14, '8d6', 'fire', true, {uses:3})]},
      {w:1, strikes:[_S('Dagger', 5, '1d4+2', 'piercing')]}],
    shieldUses:2,
    desc:`A trained wizard who has spent years over books and failed experiments. Mage Armor is already up. Spells: Fire Bolt, Magic Missile, Fireball, and Shield (as a reaction, twice a fight).`},
  assassin:{name:'Assassin', npc:true, cr:'8', ac:15, hp:78, xp:3900, pp:13, init:3, type:'humanoid', special:['assassinate','evasion'], sneak:'4d6', resist:['poison'],
    save:{str:0,dex:6,con:2,int:4,wis:0,cha:0},
    actions:[
      {w:3, strikes:[_S('Shortsword', 6, '1d6+3', 'piercing', {rider:_POISON}), _S('Shortsword', 6, '1d6+3', 'piercing', {rider:_POISON})]},
      {w:1, strikes:[_S('Light Crossbow', 6, '1d8+3', 'piercing', {rider:_POISON})]}],
    desc:`A killer for hire with poisoned blades. Assassinate: advantage in the first round. Evasion. Sneak Attack (4d6). Poisoned hits force a DC 15 Constitution save.`},
  archmage:{name:'Archmage', npc:true, cr:'12', ac:15, hp:99, xp:8400, pp:12, init:2, type:'humanoid', special:['magicres'],
    resist:['bludgeoning','piercing','slashing'],
    save:{str:0,dex:2,con:1,int:9,wis:6,cha:3},
    actions:[
      {w:3, strikes:[_S('Fire Bolt', 9, '4d10', 'fire', {spell:true})]},
      {w:1, strikes:[_S('Shocking Grasp', 9, '4d8', 'lightning', {spell:true})]},
      {w:1, strikes:[{name:'Magic Missile', missile:3, dmg:'1d4+1', type:'force', uses:4}]},
      {w:1, strikes:[_V('Lightning Bolt', 'dex', 17, '8d6', 'lightning', true, {uses:3})]},
      {w:1, strikes:[_V('Cone of Cold', 'con', 17, '8d8', 'cold', true, {uses:3})]}],
    desc:`One of the greatest spellcasters alive. Magic Resistance, and Stoneskin is already up (half damage from weapons). Spells: Fire Bolt, Shocking Grasp, Lightning Bolt, Cone of Cold.`}
});
/* every template keeps a plain attack for older code that reads m.attack */
Object.values(MONSTERS).forEach(m => {
  if (!m.attack && m.actions){
    const s = m.actions.flatMap(a => a.strikes || []).find(x => x.toHit != null) || {name:'Strike', toHit:0, dmg:'1d4', type:'bludgeoning'};
    m.attack = {name:s.name, toHit:s.toHit, dmg:s.dmg, type:s.type};
  }
});
const NPC_KEYS = Object.keys(MONSTERS).filter(k => MONSTERS[k].npc).sort((a, b) => MONSTERS[a].xp - MONSTERS[b].xp);

/* companions you can hire */
Object.assign(ALLIES, {
  tess:{name:'Tess Marrow', kind:'Scout', pr:'she', ac:13, hp:16, keen:true, multi:2, cost:25,
        attack:{name:'Longbow', toHit:4, dmg:'1d8+2', type:'piercing'},
        rest:'restrings her bow and is ready again', guard:'a hand shaking your shoulder and a waterskin at your lips',
        desc:"A marsh guide from Greywater who has tracked poachers, lost children, and one escaped bear. She shoots twice a turn and her sharp eyes give you advantage on Perception checks."},
  tamsin:{name:'Brother Tamsin', kind:'Acolyte', pr:'he', ac:10, hp:9, cost:10, heal:{name:'Cure Wounds', dice:'1d8+2', uses:3},
        attack:{name:'Club', toHit:2, dmg:'1d4', type:'bludgeoning'},
        rest:'says a quiet prayer and gets his breath back', guard:'someone praying over you, very softly',
        desc:"A young lay brother of the Morning Light, walking the valley roads with a satchel of bandages. No fighter, but when you drop to half your hit points he casts Cure Wounds on you (3 times per long rest). He can also heal you between fights."},
  garrick:{name:'Garrick Stone', kind:'Sellsword', pr:'he', ac:16, hp:11, cost:15,
        attack:{name:'Spear', toHit:3, dmg:'1d6+1', type:'piercing'},
        rest:'oils his mail and is back on his feet', guard:'a big shape standing over you with a shield raised',
        desc:"A former river watchman with mail, a shield, and a spear. Not brilliant, not fast, but very hard to get past."},
  ruth:{name:'Ruth Ashdown', kind:'Veteran', pr:'she', ac:17, hp:58, cost:120, minLevel:4, multi:2,
        attack:{name:'Longsword', toHit:5, dmg:'1d8+3', type:'slashing'},
        rest:'sharpens her sword and stretches out the old injuries', guard:'a gruff voice telling you to get up, soldier',
        desc:"A retired sergeant of the river watch who still trains every morning. Two longsword strikes a turn. She only works for heroes of level 4 or higher: \"I've buried enough beginners.\""}
});
Object.assign(ALLIES.brindle, {pr:'he', rest:'licks his wounds and is back to full strength', guard:'a warm, wet tongue on your face'});
/* he, him, his, or she, her, her */
function pron(a, form){
  const p = (a && a.pr) || 'he';
  const T = {he:{s:'he', o:'him', p:'his'}, she:{s:'she', o:'her', p:'her'}, they:{s:'they', o:'them', p:'their'}};
  return (T[p] || T.he)[form || 's'];
}

/* =====================================================================
   MORE SRD 5.1 MONSTERS, for the Aldermere jobs.
   resistMundane: these damage types are halved unless the blow is magical
   (a magic weapon or a spell). fortitude: Undead Fortitude. swarm: its
   attack drops to half dice at half hit points. A strike's rider with no
   save always deals its damage; paralyze:{dc} can paralyze you.
   ===================================================================== */
Object.assign(MONSTERS, {
  zombie:{name:'Zombie', ac:8, hp:22, xp:50, pp:8, init:-2, type:'undead', special:['undead','fortitude'], immune:['poison'],
    save:{str:1,dex:-2,con:3,int:-4,wis:0,cha:-3}, attack:{name:'Slam', toHit:3, dmg:'1d6+1', type:'bludgeoning'}},
  ghoul:{name:'Ghoul', ac:12, hp:22, xp:200, pp:10, init:2, type:'undead', special:['undead'], immune:['poison'],
    save:{str:1,dex:2,con:0,int:-2,wis:0,cha:-2}, attack:{name:'Claws', toHit:4, dmg:'2d4+2', type:'slashing'},
    actions:[{w:1, strikes:[{name:'Bite', toHit:2, dmg:'2d6+2', type:'piercing'}]},
             {w:2, strikes:[{name:'Claws', toHit:4, dmg:'2d4+2', type:'slashing', paralyze:{dc:10}}]}]},
  rat_swarm:{name:'Swarm of Rats', ac:10, hp:24, xp:50, pp:10, init:0, type:'beast', special:['swarm'], resist:['bludgeoning','piercing','slashing'],
    save:{str:-1,dex:0,con:-1,int:-4,wis:0,cha:-4}, attack:{name:'Bites', toHit:2, dmg:'2d6', type:'piercing'}},
  gray_ooze:{name:'Gray Ooze', ac:8, hp:22, xp:100, pp:8, init:-2, type:'ooze', special:[], resist:['acid','cold','fire'],
    save:{str:1,dex:-2,con:3,int:-5,wis:-2,cha:-4}, attack:{name:'Pseudopod', toHit:3, dmg:'1d6+1', type:'bludgeoning'},
    actions:[{w:1, strikes:[{name:'Pseudopod', toHit:3, dmg:'1d6+1', type:'bludgeoning', rider:{dmg:'2d6', type:'acid'}}]}]},
  /* an original weaker variant for low-level sewer jobs */
  ooze_small:{name:'Lesser Gray Ooze', ac:8, hp:12, xp:50, pp:8, init:-2, type:'ooze', special:[], resist:['acid','cold','fire'],
    save:{str:1,dex:-2,con:2,int:-5,wis:-2,cha:-4}, attack:{name:'Pseudopod', toHit:3, dmg:'1d4+1', type:'bludgeoning'},
    actions:[{w:1, strikes:[{name:'Pseudopod', toHit:3, dmg:'1d4+1', type:'bludgeoning', rider:{dmg:'1d6', type:'acid'}}]}]},
  crocodile:{name:'Crocodile', ac:12, hp:19, xp:100, pp:10, init:0, type:'beast', special:[],
    save:{str:2,dex:0,con:1,int:-4,wis:0,cha:-3}, attack:{name:'Bite', toHit:4, dmg:'1d10+2', type:'piercing'}},
  giant_spider:{name:'Giant Spider', ac:14, hp:26, xp:200, pp:10, init:3, type:'beast', special:[],
    save:{str:2,dex:3,con:1,int:-4,wis:0,cha:-3}, attack:{name:'Bite', toHit:5, dmg:'1d8+3', type:'piercing'},
    actions:[{w:1, strikes:[{name:'Bite', toHit:5, dmg:'1d8+3', type:'piercing', rider:{save:'con', dc:11, dmg:'2d8', type:'poison', half:true}}]}]},
  bugbear:{name:'Bugbear', ac:16, hp:27, xp:200, pp:10, init:2, type:'humanoid', special:[],
    save:{str:2,dex:2,con:1,int:-1,wis:0,cha:-1}, attack:{name:'Morningstar', toHit:4, dmg:'2d8+2', type:'piercing'},
    actions:[{w:3, strikes:[{name:'Morningstar', toHit:4, dmg:'2d8+2', type:'piercing'}]}, {w:1, strikes:[{name:'Thrown Javelin', toHit:4, dmg:'1d6+2', type:'piercing'}]}]},
  gnoll:{name:'Gnoll', ac:15, hp:22, xp:100, pp:10, init:1, type:'humanoid', special:[],
    save:{str:2,dex:1,con:0,int:-2,wis:0,cha:-2}, attack:{name:'Spear', toHit:4, dmg:'1d6+2', type:'piercing'},
    actions:[{w:2, strikes:[{name:'Spear', toHit:4, dmg:'1d6+2', type:'piercing'}]}, {w:1, strikes:[{name:'Bite', toHit:4, dmg:'1d4+2', type:'piercing'}]}, {w:1, strikes:[{name:'Longbow', toHit:3, dmg:'1d8+1', type:'piercing'}]}]},
  ogre:{name:'Ogre', ac:11, hp:59, xp:450, pp:8, init:-1, type:'giant', special:[],
    save:{str:4,dex:-1,con:3,int:-3,wis:-2,cha:-2}, attack:{name:'Greatclub', toHit:6, dmg:'2d8+4', type:'bludgeoning'},
    actions:[{w:4, strikes:[{name:'Greatclub', toHit:6, dmg:'2d8+4', type:'bludgeoning'}]}, {w:1, strikes:[{name:'Thrown Javelin', toHit:6, dmg:'2d6+4', type:'piercing'}]}]},
  dire_wolf:{name:'Dire Wolf', ac:14, hp:37, xp:200, pp:13, init:2, type:'beast', special:['pack'],
    save:{str:3,dex:2,con:2,int:-4,wis:1,cha:-2}, attack:{name:'Bite', toHit:5, dmg:'2d6+3', type:'piercing'},
    actions:[{w:1, strikes:[{name:'Bite', toHit:5, dmg:'2d6+3', type:'piercing', prone:{save:'str', dc:13}}]}]},
  wight:{name:'Wight', ac:14, hp:45, xp:700, pp:13, init:2, type:'undead', special:['undead'], immune:['poison'],
    resist:['necrotic'], resistMundane:['bludgeoning','piercing','slashing'],
    save:{str:2,dex:2,con:3,int:0,wis:1,cha:2}, attack:{name:'Longsword', toHit:4, dmg:'1d8+2', type:'slashing'},
    actions:[{w:2, strikes:[{name:'Longsword', toHit:4, dmg:'1d8+2', type:'slashing'}, {name:'Longsword', toHit:4, dmg:'1d8+2', type:'slashing'}]},
             {w:1, strikes:[{name:'Life Drain', toHit:4, dmg:'1d6+2', type:'necrotic'}, {name:'Longsword', toHit:4, dmg:'1d8+2', type:'slashing'}]}]},
  specter:{name:'Specter', ac:12, hp:22, xp:200, pp:10, init:2, type:'undead', special:['undead'], immune:['necrotic','poison'],
    resist:['acid','cold','fire','lightning','thunder'], resistMundane:['bludgeoning','piercing','slashing'],
    save:{str:-5,dex:2,con:0,int:0,wis:0,cha:0}, attack:{name:'Life Drain', toHit:4, dmg:'3d6', type:'necrotic'}},
  shadow:{name:'Shadow', ac:12, hp:16, xp:100, pp:10, init:2, type:'undead', special:['undead'], immune:['necrotic','poison'], vuln:['radiant'],
    resist:['acid','cold','fire','lightning','thunder'], resistMundane:['bludgeoning','piercing','slashing'],
    save:{str:-2,dex:2,con:1,int:-2,wis:0,cha:-1}, attack:{name:'Strength Drain', toHit:4, dmg:'2d6+2', type:'necrotic'}},
  animated_armor:{name:'Animated Armor', ac:18, hp:33, xp:200, pp:6, init:0, type:'construct', special:[], immune:['poison','psychic'],
    save:{str:2,dex:0,con:1,int:-5,wis:-4,cha:-5}, attack:{name:'Slam', toHit:4, dmg:'1d6+2', type:'bludgeoning'}, multi:2},
  flying_sword:{name:'Flying Sword', ac:17, hp:17, xp:50, pp:7, init:2, type:'construct', special:[], immune:['poison','psychic'],
    save:{str:1,dex:4,con:0,int:-5,wis:-3,cha:-5}, attack:{name:'Longsword', toHit:3, dmg:'1d8+1', type:'slashing'}},
  owlbear:{name:'Owlbear', ac:13, hp:59, xp:700, pp:13, init:1, type:'monstrosity', special:[],
    save:{str:5,dex:1,con:3,int:-4,wis:1,cha:-2}, attack:{name:'Beak', toHit:7, dmg:'1d10+5', type:'piercing'},
    attacks:[{name:'Beak', toHit:7, dmg:'1d10+5', type:'piercing'}, {name:'Claws', toHit:7, dmg:'2d8+5', type:'slashing'}], multi:2}
});
/* the archmage's Stoneskin only stops ordinary weapons */
MONSTERS.archmage.resistMundane = MONSTERS.archmage.resist; delete MONSTERS.archmage.resist;
