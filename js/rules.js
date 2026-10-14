/* =====================================================================
   THORNVALE CHRONICLES : rules.js
   Races, classes, backgrounds, features, spells, items, weapons, armor and
   shops. Everything here is data from the SRD 5.1 core rules, plus a few
   original items. Add a weapon to WEAPON_LIST or an item to ITEMS.
   ===================================================================== */
'use strict';

/* =====================================================================
   1. RULES DATA (SRD 5.1)
   ===================================================================== */
const ABILS = ['str','dex','con','int','wis','cha'];
const ABIL_NAME = {str:'Strength',dex:'Dexterity',con:'Constitution',int:'Intelligence',wis:'Wisdom',cha:'Charisma'};
const SKILLS = {
  acrobatics:['Acrobatics','dex'], animal:['Animal Handling','wis'], arcana:['Arcana','int'],
  athletics:['Athletics','str'], deception:['Deception','cha'], history:['History','int'],
  insight:['Insight','wis'], intimidation:['Intimidation','cha'], investigation:['Investigation','int'],
  medicine:['Medicine','wis'], nature:['Nature','int'], perception:['Perception','wis'],
  performance:['Performance','cha'], persuasion:['Persuasion','cha'], religion:['Religion','int'],
  sleight:['Sleight of Hand','dex'], stealth:['Stealth','dex'], survival:['Survival','wis']
};
const FALLBACK_SKILLS = ['perception','persuasion','athletics','insight','survival','history','nature'];
/* XP needed to reach the NEXT level, indexed by current level */
const XP_NEXT = {1:300, 2:900, 3:2700, 4:6500, 5:14000, 6:23000, 7:34000, 8:48000, 9:64000, 10:85000, 11:100000, 12:120000, 13:140000, 14:165000, 15:195000, 16:225000, 17:265000, 18:305000, 19:355000};
const STANDARD_ARRAY = [15,14,13,12,10,8];

const RACES = {
  human:   {name:'Human', bonus:{str:1,dex:1,con:1,int:1,wis:1,cha:1}, speed:30,
            traits:[['Versatile','+1 to every ability score.']],
            desc:'Ambitious and adaptable. A little better at everything.'},
  dwarf:   {name:'Hill Dwarf', bonus:{con:2,wis:1}, speed:25, hpPerLevel:1, resist:['poison'],
            traits:[['Darkvision','You see in dim light within 60 feet as if it were bright.'],['Dwarven Resilience','Resistance to poison damage.'],['Dwarven Toughness','+1 hit point per level.']],
            desc:'Stout, stubborn, and very hard to knock down.'},
  elf:     {name:'High Elf', bonus:{dex:2,int:1}, speed:30, skills:['perception'],
            traits:[['Darkvision','You see in dim light within 60 feet as if it were bright.'],['Keen Senses','Proficient in Perception.'],['Fey Ancestry','Advantage against being charmed; magic cannot put you to sleep.']],
            desc:'Graceful and keen-eyed, with old magic in the blood.'},
  halfling:{name:'Lightfoot Halfling', bonus:{dex:2,cha:1}, speed:25, lucky:true,
            traits:[['Lucky','When you roll a natural 1 on a d20, reroll it.'],['Brave','Advantage against being frightened.'],['Naturally Stealthy','You can hide behind creatures larger than you.']],
            desc:'Small, quick, cheerful, and annoyingly lucky.'},
  other:   {name:'Other People', bonus:{}, speed:30, hidden:true, traits:[],
            desc:'Any people from your own books. Used when you import a sheet or set your own scores.'}
};

const BACKGROUNDS = {
  acolyte: {name:'Acolyte',  skills:['insight','religion'],      items:{prayerbook:1}, desc:'You served at a temple and know the old prayers.'},
  soldier: {name:'Soldier',  skills:['athletics','intimidation'], items:{dice:1},       desc:'You marched in a militia and know how to hold a line.'},
  criminal:{name:'Criminal', skills:['deception','stealth'],      items:{crowbar:1},    desc:'You have a past you do not talk about, and quiet feet.'},
  sage:    {name:'Sage',     skills:['arcana','history'],         items:{ink:1},        desc:'You spent years among books and old maps.'},
  folk:    {name:'Folk Hero',skills:['animal','survival'],        items:{shovel:1},     desc:'You stood up for your village once. They remember.'}
};

const CLASSES = {
  fighter:{
    name:'Fighter', hd:10, priority:['str','con','dex','wis','cha','int'], saves:['str','con'],
    skills:['athletics','perception'], expertise:[],
    prof:{armor:['light','medium','heavy','shield'], weapons:['simple','martial']},
    gear:{a_chainmail:1, shield:1, w_longsword:1, w_handaxe:1},
    equip:{armor:'a_chainmail', shield:true, weapons:['w_longsword','w_handaxe']},
    slots:null, features:{1:['secondWind','dueling'], 2:['actionSurge'], 3:['improvedCritical'], 5:['extraAttack']},
    items:{rope:1, torch:3},
    desc:'A trained warrior in heavy armor. Hits hard, takes hits, catches a second wind.'
  },
  rogue:{
    name:'Rogue', hd:8, priority:['dex','con','wis','int','cha','str'], saves:['dex','int'],
    skills:['stealth','sleight','acrobatics','perception'], expertise:['stealth','sleight'],
    prof:{armor:['light'], weapons:['simple','handcrossbow','longsword','rapier','shortsword']},
    gear:{a_leather:1, w_shortsword:1, w_shortbow:1, w_dagger:1},
    equip:{armor:'a_leather', shield:false, weapons:['w_shortsword','w_shortbow']},
    slots:null, features:{1:['sneakAttack','expertise'], 2:['cunningAction'], 3:['fastHands']},
    items:{tools:1, torch:2},
    desc:'Quiet, quick, and precise. Hides, then strikes for extra Sneak Attack damage.'
  },
  cleric:{
    name:'Cleric', hd:8, priority:['wis','con','str','dex','cha','int'], saves:['wis','cha'],
    skills:['medicine','insight'], expertise:[],
    prof:{armor:['light','medium','heavy','shield'], weapons:['simple']},
    gear:{a_chainmail:1, shield:1, w_mace:1},
    equip:{armor:'a_chainmail', shield:true, weapons:['w_mace']},
    cast:'wis', cantrips:['sacredFlame'], spells:['cureWounds','guidingBolt'],
    slots:{1:2, 2:3, 3:4, 4:5, 5:6, 6:7, 7:8, 8:9, 9:10, 10:11}, features:{1:['discipleOfLife'], 2:['turnUndead'], 5:['potentCantrips']},
    items:{symbol:1},
    desc:'A servant of the light, armored and devout. Heals, smites with radiant fire.'
  },
  wizard:{
    name:'Wizard', hd:6, priority:['int','con','dex','wis','cha','str'], saves:['int','wis'],
    skills:['arcana','investigation'], expertise:[],
    prof:{armor:[], weapons:['dagger','dart','sling','quarterstaff','lcrossbow']},
    gear:{w_dagger:1, w_quarterstaff:1},
    equip:{armor:null, shield:false, weapons:['w_dagger','w_quarterstaff']},
    cast:'int', cantrips:['fireBolt'], spells:['magicMissile','sleep','burningHands','shield'],
    slots:{1:2, 2:3, 3:4, 4:5, 5:6, 6:7, 7:8, 8:9, 9:10, 10:11}, features:{1:['arcaneRecovery','mageArmor'], 2:[], 5:['potentCantrips']},
    items:{spellbook:1},
    desc:'A scholar of the arcane. Fragile, but Sleep and Magic Missile end fights fast.'
  }
};

const FEATURES = {
  stubborn:     {name:'Stubborn Hero', uses:1, rest:'short', desc:'Solo rule. Once per short rest, when you would drop to 0 hit points, you drop to 1 instead.'},
  secondWind:   {name:'Second Wind', uses:1, rest:'short', desc:'Bonus action: regain 1d10 + your level in hit points.'},
  dueling:      {name:'Fighting Style: Dueling', desc:'+2 damage with a one-handed melee weapon.'},
  actionSurge:  {name:'Action Surge', uses:1, rest:'short', desc:'Take one extra action on your turn.'},
  sneakAttack:  {name:'Sneak Attack', desc:'Once per turn, deal extra 1d6 damage (more at higher levels) when you hit with advantage.'},
  expertise:    {name:'Expertise', desc:'Double proficiency bonus in Stealth and Sleight of Hand.'},
  cunningAction:{name:'Cunning Action', desc:'Hide as a bonus action, so you can still attack on the same turn.'},
  discipleOfLife:{name:'Disciple of Life', desc:'Healing spells restore an extra 2 + spell level hit points.'},
  turnUndead:   {name:'Turn Undead', uses:1, rest:'short', desc:'Action: each undead foe makes a Wisdom save or flees from you.'},
  improvedCritical:{name:'Improved Critical', desc:'Your weapon attacks score a critical hit on a roll of 19 or 20.'},
  fastHands:    {name:'Fast Hands', desc:'Use an item, such as a potion, as a bonus action.'},
  mageArmor:    {name:'Mage Armor', desc:'House rule: you keep Mage Armor up between adventures. With no armor on, your AC is 13 + your Dexterity modifier.'},
  extraAttack:  {name:'Extra Attack', desc:'You attack twice, instead of once, when you take the Attack action on your turn.'},
  potentCantrips:{name:'Stronger Cantrips', desc:'At 5th level your cantrips deal an extra damage die (two dice instead of one), as cantrips do in the core rules.'},
  arcaneRecovery:{name:'Arcane Recovery', uses:1, rest:'long', desc:'Once a day, during a short rest, recover one expended spell slot.'}
};

const SPELLS = {
  fireBolt:    {name:'Fire Bolt', level:0, kind:'attack', dmg:'1d10', type:'fire', desc:'Ranged spell attack. 1d10 fire damage.'},
  sacredFlame: {name:'Sacred Flame', level:0, kind:'save', save:'dex', dmg:'1d8', type:'radiant', desc:'Target makes a Dexterity save or takes 1d8 radiant damage.'},
  guidingBolt: {name:'Guiding Bolt', level:1, kind:'attack', dmg:'4d6', type:'radiant', mark:true, desc:'Ranged spell attack. 4d6 radiant, and your next attack on the target has advantage.'},
  cureWounds:  {name:'Cure Wounds', level:1, kind:'heal', heal:'1d8', desc:'Touch: regain 1d8 + your Wisdom modifier hit points.'},
  magicMissile:{name:'Magic Missile', level:1, kind:'missile', darts:3, dmg:'1d4+1', type:'force', desc:'Three glowing darts of force. Aim them at one foe or split them among several. Each dart hits automatically for 1d4 + 1 force (one roll for all the darts). Cover does not stop them, but full cover, a Shield spell, a deflecting charm, or immunity to spells does.'},
  shield:      {name:'Shield', level:1, kind:'reaction', desc:'Reaction: when an attack would hit you, or magic missile targets you, +5 AC until the start of your next turn and the darts do nothing. The game casts it for you when it would turn a hit into a miss (switch this off in a fight).'},
  sleep:       {name:'Sleep', level:1, kind:'sleep', pool:'5d8', desc:'Roll 5d8. Creatures fall asleep, weakest first, until the total runs out. Undead are immune.'},
  burningHands:{name:'Burning Hands', level:1, kind:'aoe', save:'dex', dmg:'3d6', type:'fire', desc:'Every foe makes a Dexterity save. 3d6 fire, half on a success.'}
};

const ITEMS = {
  potion:   {name:'Potion of Healing', use:'heal', heal:'2d4+2', cost:25, desc:'Regain 2d4 + 2 hit points. Takes your action in a fight.'},
  poultice: {name:'Silverleaf Poultice', use:'heal', heal:'1d4+1', cost:5, desc:'Regain 1d4 + 1 hit points.'},
  candle:   {name:'Sunwax Candle', use:'insp', cost:15, desc:'Light it to gain Inspiration (advantage on your next d20 roll).'},
  ration:   {name:'Rations', cost:1, desc:'Dried meat, hard bread, and cheese. Some animals like them too.'},
  rope:     {name:'Hempen Rope (50 ft)', cost:1, desc:'Strong and useful.'},
  torch:    {name:'Torch', cost:1, desc:'Burns for an hour.'},
  tools:    {name:"Thieves' Tools", cost:25, desc:'Picks and files for locks.'},
  symbol:   {name:'Holy Symbol', desc:'A sun disk on a leather cord.'},
  spellbook:{name:'Spellbook', desc:'Your spells, written in your own careful hand.'},
  prayerbook:{name:'Prayer Book', desc:'Worn at the corners from use.'},
  dice:     {name:'Bone Dice', desc:'A soldier never travels without them.'},
  crowbar:  {name:'Crowbar', cost:2, desc:'For doors that disagree with you.'},
  ink:      {name:'Ink and Quill', desc:'For notes, maps, and letters home.'},
  shovel:   {name:'Shovel', desc:'A reminder of honest work.'},
  pendant:  {name:"Warden's Pendant", ac:1, desc:'A tarnished sun pendant, warm to the touch. +1 to your Armor Class.'},
  cap:      {name:"Jory's Cap", quest:true, desc:'A green felt cap with a jay feather in the band. Brindle keeps sniffing it.'},
  orders:   {name:'Masked Orders', quest:true, desc:'Cream vellum, black wax, a blank mask. "Stop every cart bound for the Thornvale until the new moon."'},
  tincture: {name:'Ten Bottles of Tincture', quest:true, desc:'Feverwort tincture from an earlier stolen cart. Sister Agathe will want these.'},
  map:      {name:'Goblin Map', quest:true, desc:'A scrap of hide showing the shrine, a hall, and three passages. A skull is drawn over the east stair.'},
  sunkey:   {name:'Sun Key', quest:true, desc:'A bronze key shaped like a sunburst.'},
  sunstone: {name:'The Sunstone', quest:true, desc:'A fist-sized crystal that glows like the first minute of morning.'},
  letter:   {name:'Sealed Letter', quest:true, desc:'Black wax stamped with a blank mask. "One of three. Bring it to the Greywater ferry by the new moon."'}
};

/* Weapons and armor from SRD 5.1. Each becomes an item: w_<id> or a_<id>.
   [id, name, simple or martial, damage, damage type, properties, cost in gp] */
const WEAPON_LIST = [
  ['club','Club','simple','1d4','bludgeoning','light',1],
  ['dagger','Dagger','simple','1d4','piercing','finesse light thrown',2],
  ['handaxe','Handaxe','simple','1d6','slashing','light thrown',5],
  ['javelin','Javelin','simple','1d6','piercing','thrown',1],
  ['mace','Mace','simple','1d6','bludgeoning','',5],
  ['quarterstaff','Quarterstaff','simple','1d6','bludgeoning','',1],
  ['spear','Spear','simple','1d6','piercing','thrown',1],
  ['lcrossbow','Light Crossbow','simple','1d8','piercing','ranged two',25],
  ['shortbow','Shortbow','simple','1d6','piercing','ranged two',25],
  ['sling','Sling','simple','1d4','bludgeoning','ranged',1],
  ['battleaxe','Battleaxe','martial','1d8','slashing','',10],
  ['greataxe','Greataxe','martial','1d12','slashing','heavy two',30],
  ['greatsword','Greatsword','martial','2d6','slashing','heavy two',50],
  ['longsword','Longsword','martial','1d8','slashing','',15],
  ['maul','Maul','martial','2d6','bludgeoning','heavy two',10],
  ['morningstar','Morningstar','martial','1d8','piercing','',15],
  ['rapier','Rapier','martial','1d8','piercing','finesse',25],
  ['scimitar','Scimitar','martial','1d6','slashing','finesse light',25],
  ['shortsword','Shortsword','martial','1d6','piercing','finesse light',10],
  ['warhammer','Warhammer','martial','1d8','bludgeoning','',15],
  ['longbow','Longbow','martial','1d8','piercing','ranged heavy two',50]
];
/* [id, name, light/medium/heavy, base AC, max Dex bonus, Stealth disadvantage, cost in gp] */
const ARMOR_LIST = [
  ['padded','Padded Armor','light',11,99,true,5],
  ['leather','Leather Armor','light',11,99,false,10],
  ['studded','Studded Leather','light',12,99,false,45],
  ['hide','Hide Armor','medium',12,2,false,10],
  ['chainshirt','Chain Shirt','medium',13,2,false,50],
  ['scale','Scale Mail','medium',14,2,true,50],
  ['breastplate','Breastplate','medium',14,2,false,400],
  ['chainmail','Chain Mail','heavy',16,0,true,75],
  ['splint','Splint Armor','heavy',17,0,true,200],
  ['plate','Plate Armor','heavy',18,0,true,1500]
];
const PROP_NAME = {finesse:'Finesse', light:'Light', thrown:'Thrown', two:'Two-handed', heavy:'Heavy'};
WEAPON_LIST.forEach(([id, name, cat, dmg, dmgType, props, cost]) => {
  const p = props ? props.split(' ') : [];
  const tags = p.filter(x => PROP_NAME[x]).map(x => PROP_NAME[x]);
  ITEMS['w_' + id] = {name, kind:'weapon', cat, dmg, dmgType, props:p, cost,
    desc:`${cat === 'simple' ? 'Simple' : 'Martial'} ${p.includes('ranged') ? 'ranged' : 'melee'} weapon. ${dmg} ${dmgType}.${tags.length ? ' ' + tags.join(', ') + '.' : ''}`};
});
ARMOR_LIST.forEach(([id, name, kind, base, dexCap, stealthDis, cost]) => {
  ITEMS['a_' + id] = {name, kind:'armor', armor:kind, base, dexCap, stealthDis, cost,
    desc:`${kind[0].toUpperCase() + kind.slice(1)} armor. AC ${base}${dexCap >= 99 ? ' + Dex' : dexCap > 0 ? ' + Dex (max ' + dexCap + ')' : ''}.${stealthDis ? ' Disadvantage on Stealth.' : ''}`};
});
ITEMS.shield = {name:'Shield', kind:'shield', cost:10, desc:'+2 to your AC while you carry it. Needs a free hand.'};

/* Shops. stock lists item ids; prices can override an item's cost. */
const SHOPS = {
  marta:{name:'The Quill and Mortar', blurb:'Remedies, mostly. Marta keeps a few plain weapons for travellers who forgot theirs.',
         stock:['potion','poultice','candle','ration','rope','torch','w_dagger','w_quarterstaff','w_sling','w_club']},
  odda: {name:"Odda's Trading Post", blurb:'If it is for sale anywhere in the Thornvale, Odda has it or can get it by Thursday.',
         stock:['potion','candle','ration','rope','torch','tools','crowbar','shield',
                ...WEAPON_LIST.map(w => 'w_' + w[0]), 'a_padded','a_leather','a_studded','a_hide','a_chainshirt','a_scale','a_chainmail','a_breastplate']},
  pell: {name:"Pell Haverford's Handcart", blurb:'"Everything a traveller needs, and several things they do not."',
         stock:['potion','ration','rope','torch','w_dagger','w_spear','w_shortbow','a_leather'], prices:{potion:20}}
};
const DMG_TYPES = ['acid','bludgeoning','cold','fire','force','lightning','necrotic','piercing','poison','psychic','radiant','slashing','thunder'];


/* =====================================================================
   ALDERMERE: city goods, magic items, and the city's shops.
   plus: a magic weapon or armor bonus (+1 to hit and damage, or +1 AC).
   save: bonus to every saving throw. spell: bonus to spell attacks and DC.
   magic:true items count as magical for monsters that shrug off mundane blows.
   ===================================================================== */
Object.assign(ITEMS, {
  potion_greater:{name:'Potion of Greater Healing', use:'heal', heal:'4d4+4', cost:100, desc:'Regain 4d4 + 4 hit points.'},
  smoke:     {name:'Smoke Pellet', use:'escape', cost:30, desc:'Smash it in a fight to vanish in a cloud of smoke. You escape automatically, unless the fight cannot be fled.'},
  ring_prot: {name:'Ring of Protection', magic:true, ac:1, save:1, cost:350, desc:'A plain silver band that hums faintly. +1 to your AC and to every saving throw.'},
  cloak_prot:{name:'Cloak of Protection', magic:true, ac:1, save:1, cost:400, desc:'Grey wool that turns aside blows. +1 to your AC and to every saving throw.'},
  starglass: {name:'Starglass Lens', magic:true, spell:1, cost:250, desc:'A monocle of smoky crystal from the old observatory. +1 to your spell attacks and spell save DC.'},
  brooch:    {name:'Brooch of Shielding', magic:true, cost:450, desc:'A silver brooch shaped like a small shield. You take half damage from force, and magic missile darts do nothing to you.'},
  wardstone: {name:'Wardstone of Aldermere', magic:true, save:1, cost:200, desc:'A river pebble carved with the city seal and blessed by the Collegium. +1 to every saving throw.'},
  citykey:   {name:'Key to the City', quest:true, desc:'A heavy brass key on a blue ribbon. The Hero\'s House on Lantern Square is yours.'}
});
/* +1 weapons (m_<id>) and +1 armor (ma_<id>) */
WEAPON_LIST.forEach(([id]) => {
  const b = ITEMS['w_' + id];
  ITEMS['m_' + id] = Object.assign({}, b, {name:'+1 ' + b.name, plus:1, magic:true, cost:300 + b.cost * 2,
    desc:b.desc + ' Magic: +1 to attack and damage rolls.'});
});
ARMOR_LIST.forEach(([id]) => {
  const b = ITEMS['a_' + id];
  ITEMS['ma_' + id] = Object.assign({}, b, {name:'+1 ' + b.name, plus:1, magic:true, cost:600 + b.cost,
    desc:b.desc.replace(/AC (\d+)/, (m, n) => 'AC ' + (+n + 1)) + ' Magic: +1 AC.'});
});
Object.assign(SHOPS, {
  hobb:{city:true, name:"Hobb's Provisions", blurb:'Rope, lamps, rations, and a cat asleep on the scales. Hobb weighs everything twice.',
        stock:['potion','poultice','candle','ration','rope','torch','tools','crowbar']},
  ironwright:{city:true, name:'Ironwright Smithy', blurb:'The ring of hammers never stops on Anvil Lane. Every blade here is honest steel.',
        stock:['shield', ...WEAPON_LIST.map(w => 'w_' + w[0]), ...ARMOR_LIST.map(a => 'a_' + a[0])]},
  greenbottle:{city:true, name:'The Green Bottle', blurb:'An apothecary that smells of mint and something you would rather not ask about.',
        stock:['potion','poultice','candle','potion_greater'], prices:{potion:22}},
  nightmarket:{city:true, name:'The Night Market on Lantern Row', blurb:'Lanterns on strings, whispered prices, and goods that do not ask where you got your gold.',
        stock:['smoke','potion_greater','tools','candle','wardstone']},
  quietblade:{city:true, name:'The Quiet Blade', blurb:'A narrow shop with no sign. The swordsmith speaks in a whisper and her blades sing.',
        stock:WEAPON_LIST.map(w => 'm_' + w[0])},
  gilded:{city:true, name:'The Gilded Lantern', blurb:'A curio shop for people with titles. Every item sits on velvet under glass.',
        stock:['ring_prot','cloak_prot','brooch','potion_greater','wardstone']},
  royalarmory:{city:true, name:'The Royal Armory', blurb:'The city\'s own armorers, who only sell to those Aldermere trusts with its life.',
        stock:['a_plate', ...ARMOR_LIST.map(a => 'ma_' + a[0])]}
});
