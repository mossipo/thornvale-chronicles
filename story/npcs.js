/* =====================================================================
   THORNVALE CHRONICLES : npcs.js
   People of the Thornvale: hired companions, the hiring board, the cast
   of named characters, and roadside encounters with people (bandits,
   cultists, pilgrims, hunters). Statistics come from the SRD 5.1 people
   templates in js/monsters.js. Names and stories are original.
   ===================================================================== */
'use strict';

/* ---------- the hiring board ---------- */
const HIRE_TEXT = {
  tess:`Tess Marrow unstrings her bow, counts your coins twice, and strings it again. "Marsh rates. I find the trail, you find the trouble."`,
  tamsin:`Brother Tamsin drops your coins into the poor box without looking at them and shoulders his satchel of bandages. "I'll walk with you. Try not to need me."`,
  garrick:`Garrick Stone slaps the coins into a pouch, picks up a shield the size of a door, and falls in behind you without a word.`,
  ruth:`Ruth Ashdown looks you over from boots to brow, then nods once. "You'll do. I go first through doors. That's not a suggestion."`
};
const HIRE_PLACE = {
  c1_greywater:`Marta keeps a slate by the yard gate where folk chalk up work wanted.`,
  bramblewick:`A notice board hangs by the Mossy Kettle's door, crowded with lost goats and offers of work.`,
  c3_briefing:`Captain Doyle knows half the hired blades in Greywater by name, and which ones can be trusted.`
};
function allyLine(k){
  const a = ALLIES[k];
  const atk = `${a.attack.name} ${sgn(a.attack.toHit)} (${a.attack.dmg})${a.multi ? ` ${a.multi} times a turn` : ''}`;
  const extra = [a.heal ? `${a.heal.name} ${a.heal.uses} per long rest` : '', a.keen ? 'sharp senses' : ''].filter(Boolean).join(', ');
  return `<b>${esc(a.name)}</b>, ${esc(a.kind)}${a.cost ? ` (${a.cost} gp${a.minLevel ? `, level ${a.minLevel}+` : ''})` : ''}: AC ${a.ac}, HP ${a.hp}, ${atk}${extra ? ', ' + extra : ''}.`;
}
function hireable(G){ return Object.keys(ALLIES).filter(k => !(G.ally && G.ally.key === k) && ((G.bench || {})[k] || ALLIES[k].cost)); }
function hireIntro(G){
  const ks = hireable(G);
  return `${HIRE_PLACE[G.scene] || 'You ask around for hired help.'} One companion can travel with you at a time. Anyone else waits in town until you call them back.
    <br><br>${ks.map(k => (G.bench || {})[k] ? `${allyLine(k)} Waiting for you.` : allyLine(k)).join('<br>')}`;
}
function hire(k){
  const a = ALLIES[k];
  if ((a.minLevel || 1) > G.char.level){ say(`${esc(a.name)} looks you over. "Come back when you're level ${a.minLevel}. I've buried enough beginners."`); return; }
  if (G.char.gold < a.cost){ say(`${esc(a.name)} wants ${a.cost} gold up front. You have ${G.char.gold}.`); return; }
  G.char.gold -= a.cost;
  G.flags['hired_' + k] = true;
  say(HIRE_TEXT[k] || `${esc(a.name)} agrees to travel with you.`);
  joinAlly(k);
}
function hireOptions(G){
  const opts = hireable(G).map(k => {
    const a = ALLIES[k];
    if ((G.bench || {})[k]) return {label:`Call ${a.name} back`, tag:`${a.kind} · free`, fn:() => joinAlly(k)};
    const low = (a.minLevel || 1) > G.char.level;
    return {label:`Hire ${a.name}, ${a.kind}`, tag:low ? `Level ${a.minLevel}+` : `${a.cost} gp`, fn:() => hire(k)};
  });
  if (G.ally) opts.push({label:`Send ${G.ally.name} to wait in town`, tag:'Travel alone', bench:true});
  opts.push({label:'Leave the board', text:'You leave the hiring for another day.'});
  return opts;
}
const HIRE_OPT = {label:'Look for hired help', tag:'Companions', fn:G => { G.flags.hire_seen = true; }, text:hireIntro, choices:hireOptions};
/* add the board to the three town hubs, just above each hub's way out */
[['c1_greywater', G => !!G.flags.set_out], ['bramblewick', null], ['c3_briefing', null]].forEach(([id, cond]) => {
  const sc = STORY[id];
  if (!sc) return;
  const opt = cond ? Object.assign({}, HIRE_OPT, {if:cond}) : HIRE_OPT;
  sc.options.splice(Math.max(0, sc.options.length - 1), 0, opt);
});

/* ---------- captives you can question ---------- */
Object.assign(CAPTIVES, {
  bandit_talk:{name:'bandit', talk:{
    text:`The bandit comes round with a groan and finds the rope. "All right. All right. I've got a family in Rushford. Ask what you like."`,
    choices:[
      {label:'Ask who runs the gang', stay:true, once:'bt_boss', set:{knows_mag:true},
       text:`"Mag Rusk. Used to be a sergeant in the river watch until they threw her out for selling cargo. Three scimitar cuts before you see her move. She only comes down to the road for rich marks."`},
      {label:'Ask where they hide the take', stay:true, once:'bt_cache', check:{skill:['intimidation','persuasion'], dc:12,
        pass:{text:`"Hollow oak by the ford. Under the roots." You find it later: a little oilcloth bundle of coins.`, give:{gold:'2d10'}},
        fail:{text:`"What take? We're poor honest robbers." The bandit grins and says no more.`}}},
      {label:'Ask why a farmer turns robber', stay:true, once:'bt_why',
       text:`The bandit stares at the ground. "Lord's men took the harvest for the tithe. Two years running. You can't feed children on a receipt."`},
      {label:'Hand the bandit over to the watch', give:{xp:25},
       text:`You march your prisoner to the next village with a watch post. The sergeant there knows the face and pays a small bounty in thanks.`, fn:() => give({gold:5})},
      {label:'Cut the rope and let them go', give:{insp:true},
       text:`You cut the rope. The bandit stares at you, then backs away into the trees. "I won't forget this," they call. You believe it.`}
    ]}},
  cultist_talk:{name:'cultist', talk:{
    text:`You pull off the blank white mask. Underneath is a very ordinary face: a chandler's apprentice, maybe, or a clerk. Wax under the fingernails. Terrified.`,
    choices:[
      {label:'Ask who they serve', stay:true, once:'ct_who', set:{cult_lore:true},
       text:`"The Faceless. He has no name. He doesn't need one. He finds the things the old orders buried and he brings them back into the light." The cultist licks dry lips. "The Sunstone was only the first."`},
      {label:'Ask why the masks', stay:true, once:'ct_mask',
       text:`"So we're all the same. No one is better. No one is worse. No one is anyone." The cultist laughs, too high. "It's very restful."`},
      {label:'Ask how they were recruited', stay:true, once:'ct_how', check:{skill:'insight', dc:12,
        pass:{text:`They were lonely, and someone listened. Someone gave them a place to belong, and then gave them a mask. You can see the moment they realize it, and it hurts to watch.`, set:{cult_insight:true}, give:{xp:25}},
        fail:{text:`"I was chosen," they say, and will not look at you.`}}},
      {label:'Urge them to walk away from the cult', check:{skill:'persuasion', dc:13,
        pass:{text:`For a long moment they hold the mask in both hands. Then they drop it in the mud and walk away down the road toward home. They do not look back.`, give:{xp:50, insp:true}},
        fail:{text:`They snatch up the mask and run. Some chains are not broken in one conversation.`}}},
      {label:'Take them to the watch', give:{xp:25}, text:`You hand the cultist over at the nearest watch post. The sergeant turns the white mask over in his hands and frowns. "That's the third one this month."`}
    ]}}
});

/* ---------- roadside people ---------- */
function addEncounter(area, label, o){
  const t = ENCOUNTERS[area], row = t && t.rows.find(r => r.label === label);
  if (row) row.pick.push(o);
}
const BANDIT_FIGHT = G => ({foes:G.char.level >= 3 ? ['bandit','bandit','bandit'] : ['bandit','bandit'], rout:1, captive:'bandit_talk', noScale:true});
const BANDITS = {if:G => G.char.level >= 2,
  text:G => `"Your purse or your blood, friend." ${G.char.level >= 3 ? 'Three' : 'Two'} bandits step out of the trees ahead with scimitars drawn and a crossbow leveled at your chest.`,
  choices:[
    {label:'Pay them off', tag:'10 gp', if:G => G.char.gold >= 10, take:{gold:10}, text:`You toss them the coins. They melt back into the trees, laughing.`},
    {label:'Talk them out of it', check:{skill:['persuasion','intimidation'], dc:13,
      pass:{text:`Something in your voice makes them think twice. "Not worth it," one mutters, and they slip away.`, give:{xp:25}},
      fail:{text:`"Nice try." The crossbow clicks.`, fight:BANDIT_FIGHT}}},
    {label:'Draw your weapon', fight:BANDIT_FIGHT}
  ]};
const MAG_FIGHT = {foes:[{key:'bandit_captain', name:'Mag Rusk', boss:true}, 'bandit', 'bandit'], rout:1, captive:'bandit_talk', noScale:true,
  win:{set:{mag_done:true}, text:`Mag Rusk's purse is heavy, and her map case holds a list of every merchant who paid her not to be robbed.`, give:{gold:'4d10'}}};
const MAG_RUSK = {once:'mag_rusk', if:G => G.char.level >= 4, fn:G => { G.flags.met_mag = true; },
  text:`A tall woman in a faded river watch coat sits on a milestone, cleaning her nails with a dagger. Two of her people hold the road behind her. "Mag Rusk," she says. "You'll have heard of me. Toll's twenty-five gold, or we find out how good you are."`,
  choices:[
    {label:'Pay the toll', tag:'25 gp', if:G => G.char.gold >= 25, take:{gold:25}, text:`Mag bites one coin, pockets the rest, and sketches you a mocking salute. "Pleasure doing business."`},
    {label:'Talk your way past her', check:{skill:'persuasion', dc:15,
      pass:{text:`Mag laughs, really laughs. "I like you. Go on, then. And a word for free: men in white masks have been buying up every old relic in the valley. Bad business. Stay out of it."`, give:{xp:100}, set:{cult_lore:true}},
      fail:{text:`"No," Mag says pleasantly, and stands up.`, fight:MAG_FIGHT}}},
    {label:'Stare her down', check:{skill:'intimidation', dc:16,
      pass:{text:`Mag studies you a long moment, then sheathes the dagger. "Not today." She whistles, and her people fade into the trees.`, give:{xp:100}},
      fail:{text:`Mag grins. "That's the spirit."`, fight:MAG_FIGHT}}},
    {label:'Fight', fight:MAG_FIGHT}
  ]};
const CULT_FIGHT = G => ({foes:G.char.level >= 5 ? [{key:'cult_fanatic', name:'Masked Preacher'}, 'cultist'] : G.char.level >= 3 ? ['cultist', 'cultist', 'cultist'] : ['cultist', 'cultist'],
  rout:1, captive:'cultist_talk', noScale:true});
const BLANK_MASKS = {if:G => !!G.flags.chapter_done,
  text:G => `Figures in grey robes and blank white masks stand in the road, unmoving.${G.char.level >= 5 ? ' One, taller than the rest, holds a book bound in white leather.' : ''} "You took back what was ours to take," says a calm voice behind one of the masks. "The Faceless remembers."`,
  choices:[
    {label:'Try to reason with them', check:{skill:'persuasion', dc:14,
      pass:{text:`The masks turn to one another. Then, without a word, they step off the road and are gone into the fog.`, give:{xp:50}},
      fail:{text:`"There is nothing to discuss." Blades slide out of grey sleeves.`, fight:CULT_FIGHT}}},
    {label:'Fight', fight:CULT_FIGHT}
  ]};
const BERSERKER = {if:G => G.char.level >= 4,
  text:`A huge raider in bloodied hides crashes out of the undergrowth, roaring, a greataxe already swinging. There is no talking to this.`,
  fight:{foes:['berserker'], noScale:true}};
const PILGRIMS = {once:'meet_tamsin', if:G => !G.flags.hired_tamsin && !(G.ally && G.ally.key === 'tamsin'),
  text:`A little band of pilgrims comes up the road singing an old hymn slightly out of tune. A young lay brother in a patched brown habit walks at the back, carrying an old woman's bundle as well as his own. "Brother Tamsin," he says, offering a hand. "We're bound for the shrine at Dawnwatch. You look like someone who gets hurt for a living."`,
  choices:[
    {label:'Ask for a blessing', stay:true, once:'tamsin_bless', give:{insp:true},
     text:`Tamsin lays a hand on your shoulder and prays, simply and without hurry. You walk on lighter.`},
    {label:'Invite him to travel with you', tag:'Free',
     fn:G => { G.flags.hired_tamsin = true; joinAlly('tamsin'); },
     text:`Tamsin hands the old woman's bundle to a sturdier pilgrim and grins. "The shrine has stood three hundred years. It can wait a few more weeks."`},
    {label:'Wish them a safe road', text:`"And you," Tamsin calls. "You know where to find me: wherever someone's bleeding."`}
  ]};
const TESS = {once:'meet_tess', if:G => !G.flags.hired_tess && !(G.ally && G.ally.key === 'tess'),
  text:`A lean woman in a mud-green cloak is crouched over the reeds, reading the bent stalks like a page. She does not look up. "Poacher's snares. Somebody's been taking the herons. You're standing on his trail, by the way."`,
  choices:[
    {label:'Help her follow the trail', check:{skill:['survival','perception'], dc:12,
      pass:{text:`Between the two of you, you find the poacher's camp and a dozen snares. Tess cuts every one. "Tess Marrow," she says at last. "You've got decent eyes. If you ever want a guide, I'll walk with you. No charge for the first stretch."`,
            give:{xp:50}, choices:[
              {label:'Take her up on it', fn:G => { G.flags.hired_tess = true; joinAlly('tess'); }, text:`Tess slings her bow. "Try to keep up."`},
              {label:'Thank her and part ways', text:`"Board by the inn door, if you change your mind," she says. "My rates go up, though."`}]},
      fail:{text:`You lose the trail in the water. Tess sighs and finds it again without you. "Board by the inn door, if you ever want a real guide," she says.`}}},
    {label:'Leave her to it', text:`Tess grunts, already following the trail into the reeds.`}
  ]};
const CLAN_HUNTERS = {once:'clan_hunters',
  text:`Three hunters of the Ashfell clan, the hill people who have lived above the Thornvale longer than any town below, are dressing a deer by the trail. Their leader, a broad woman with grey braids, sizes you up. "Sit. Eat. Or wrestle me for the best cut, if you think you can."`,
  choices:[
    {label:'Wrestle her for the best cut', check:{skill:'athletics', contest:{name:'Hunter Orla', mod:3},
      pass:{text:`You pin her, barely. The whole camp roars with laughter, Orla loudest of all. She gives you the best cut and a twist of dried silverleaf for your wounds.`, give:{xp:25, items:{poultice:1}}},
      fail:{text:`Orla puts you in the dirt in about three heartbeats, then hauls you up and feeds you anyway. "Next year," she says.`}}},
    {label:'Share their fire and listen', text:`The hunters talk of the old days before the towns, of a white-masked stranger who tried to buy their grandmother's carved bones, and of how they sent him down the hill without them.`, set:{cult_lore:true}},
    {label:'Thank them and move on', text:`Orla raises a bloody knife in farewell.`}
  ]};
addEncounter('wilds', 'Hostile', BANDITS);
addEncounter('wilds', 'Hostile', MAG_RUSK);
addEncounter('wilds', 'Hostile', BLANK_MASKS);
addEncounter('wilds', 'Hostile', BERSERKER);
addEncounter('marsh', 'Hostile', BANDITS);
addEncounter('marsh', 'Hostile', BLANK_MASKS);
addEncounter('wilds', 'Stranger', PILGRIMS);
addEncounter('wilds', 'Stranger', CLAN_HUNTERS);
addEncounter('marsh', 'Stranger', TESS);

LORE.push(
  {when:G => G.flags.knows_mag, text:'Mag Rusk, a disgraced river watch sergeant, leads the bandits on the valley roads.'},
  {when:G => G.flags.cult_lore, text:'Cultists in blank white masks serve someone they call the Faceless, who collects relics the old orders sealed away.'}
);

/* ---------- the cast ----------
   Everyone with a name, the template their numbers come from, and when the
   People tab starts showing them (so it never spoils a surprise). */
const NPC_ROSTER = [
  {name:'Marta Quill', role:'Halfling apothecary in Greywater', tpl:'commoner', known:G => !!G.visits.c1_greywater},
  {name:'Brindle', role:'Marta\'s mastiff, your first companion', ally:'brindle', known:G => !!G.flags.set_out || !!(G.ally && G.ally.key === 'brindle')},
  {name:'Jory Quill', role:'Marta\'s grandson, sixteen and sure he can\'t die', tpl:'commoner', known:G => !!G.flags.knows_jory || !!G.flags.jory_free},
  {name:'Skarn Ironjaw', role:'Orc mercenary who held the old toll tower', tpl:'orc', known:G => !!G.flags.knows_skarn || !!G.flags.c1_done},
  {name:'Sister Agathe', role:'Healer of Bramblewick', tpl:'priest', known:G => !!G.flags.delivered},
  {name:'Elder Hesta Morrow', role:'Elder of Bramblewick', tpl:'commoner', known:G => !!G.visits.bramblewick},
  {name:'Odda Fennick', role:'Keeps the trading post in Bramblewick', tpl:'commoner', known:G => !!G.visits.shop},
  {name:'Wren', role:'The miller\'s daughter', tpl:'commoner', known:G => !!G.flags.wren_free},
  {name:'Captain Maren Doyle', role:'Retired captain of the river watch', tpl:'veteran', known:G => !!G.flags.c3_briefed},
  {name:'Governor Ilse Harrow', role:'Runs Saltreach Gaol by the book', tpl:'noble', known:G => !!G.flags.c3_briefed},
  {name:'Silas Crane', role:'Forger, prisoner Number Forty', tpl:'spy', known:G => !!G.flags.c3_briefed},
  {name:'Sergeant Holt', role:'A gaol sergeant with new boots', tpl:'thug', known:G => !!G.flags.c3_suspect_holt || !!G.flags.c3_knows_holt},
  {name:'Aurek Vane', role:'The masked man, a relic collector posing as an archivist', tpl:'mage', known:G => !!G.flags.c3_silas_talked},
  {name:'Tess Marrow', role:'Marsh guide for hire', ally:'tess', known:G => !!G.flags.hire_seen || !!G.flags.once_meet_tess},
  {name:'Brother Tamsin', role:'Lay brother of the Morning Light', ally:'tamsin', known:G => !!G.flags.hire_seen || !!G.flags.once_meet_tamsin},
  {name:'Garrick Stone', role:'Sellsword, former river watchman', ally:'garrick', known:G => !!G.flags.hire_seen},
  {name:'Ruth Ashdown', role:'Retired sergeant, hires out to seasoned heroes', ally:'ruth', known:G => !!G.flags.hire_seen},
  {name:'Mag Rusk', role:'Bandit captain of the valley roads', tpl:'bandit_captain', known:G => !!G.flags.knows_mag || !!G.flags.met_mag},
  {name:'Orla of the Ashfell', role:'Hunter of the hill clans', tpl:'clan_warrior', known:G => !!G.flags.once_clan_hunters}
];
