/* =====================================================================
   THORNVALE CHRONICLES : chapter5.js
   Chapter Five: Where the River Ends. The finale of the first saga.
   Saltmouth, at the mouth of the river, has been cut off. A lord sells
   prisoners to the Faceless, a hunted knight frees them, an ogre holds the
   town hostage, and under the lighthouse cliff the Drowned Door is
   cracking open. What you did in Chapter Four decides how strong Aurek
   Vane is, who stands with you, and which doors are open to you.
   ===================================================================== */
'use strict';

CHAPTER_LABEL_FN[5] = sc => `Chapter Five · Where the River Ends · Suggested level 5`;

/* how many of the three lights Vane holds, and whether he has the staff */
function vaneLights(G){
  let n = 0;
  if (G.flags.c4_sunstone_gone && !G.flags.c4_sunstone_back) n++;
  if (G.flags.c4_lantern_gone) n++;
  if (!G.flags.c5_tidelamp_safe) n++;
  return n;
}
const vaneHasStaff = G => !has('dawnstaff');

Object.assign(ALLIES, {
  elias:{name:'Ser Elias Brand', kind:'Paladin of Freedom', pr:'he', ac:18, hp:45, heal:{name:'Lay on Hands', dice:'2d8+5', uses:1},
    attack:{name:'Longsword', toHit:5, dmg:'1d8+3', type:'slashing'},
    rest:'kneels and prays, and gets up steady', guard:'a gauntleted hand on your chest and a voice saying "Not today. Not while I stand here."',
    desc:'A knight who broke his oath to Lord Ashby to keep a better one. Plate armor, a longsword, and Lay on Hands: once per long rest, when you drop to half your hit points, he heals you for 2d8 + 5.'},
  grallow:{name:'Grallow', kind:'Ogre', pr:'he', ac:11, hp:59,
    attack:{name:'Greatclub', toHit:6, dmg:'2d8+4', type:'bludgeoning'},
    rest:'eats something you would rather not look at', guard:'an enormous shadow and a smell of wet dog',
    desc:'A huge, sad-eyed ogre who says the goblins forced him to frighten Saltmouth. He hits very, very hard.'}
});
ITEMS.tidelamp = {name:'The Tidelamp', quest:true, desc:'A heavy lamp of green sea-glass and brass that burns with a cold, steady light. The third of the old lights.'};
ITEMS.ashby_letter = {name:"Ashby's Letter", quest:true, desc:'"Forty more strong backs by the dark of the moon. The Faceless thanks you, my lord, and remembers his friends." Sealed with a blank mask.'};
ITEMS.fell_writ = {name:"Lady Fell's Writ", quest:true, desc:'A writ of the River Council, signed and sealed by Lady Marisol Fell: the bearer acts with the Council\'s authority on the lower river.'};
ITEMS.grallow_ledger = {name:"Grallow's Ledger", quest:true, desc:'A neat ledger in a careful, very large hand: tolls collected, goblins paid, and a line at the bottom: "Lamp to the masked man. Town to me."'};

JOURNAL.push(
  {text:'Get through to Saltmouth.', shown:G => !!G.flags.c5_begun, done:G => !!G.visits.c5_town},
  {text:'Take care of the rogue warrior raiding Lord Ashby\'s camps.', shown:G => !!G.flags.c5_contract, done:G => !!G.flags.c5_elias},
  {text:'Free Saltmouth from the ogre.', shown:G => !!G.visits.c5_gate, done:G => !!G.flags.c5_grallow},
  {text:'Keep the Tidelamp out of Vane\'s hands.', shown:G => !!G.visits.c5_town, done:G => !!G.flags.c5_tidelamp_safe || !!G.flags.c5_done},
  {text:'Find the Drowned Door.', shown:G => !!G.visits.c5_town, done:G => !!G.flags.c5_knows_door},
  {text:'Stop Aurek Vane.', shown:G => !!G.flags.c5_begun, done:G => !!G.flags.c5_done}
);
LORE.push(
  {when:G => G.flags.c5_ashby_lies, text:'Lord Ashby is lying about Saltmouth. He is afraid of someone.'},
  {when:G => G.flags.c5_elias_truth, text:'Ashby sells prisoners to the Faceless to dig under the Saltmouth lighthouse.'},
  {when:G => G.flags.c5_grallow_lies, text:'Grallow is no simple ogre. He keeps accounts, and he made a deal with Vane: the lamp for Vane, the town for Grallow.'},
  {when:G => G.flags.c5_knows_door, text:'The Drowned Door lies in the sea caves under the lighthouse cliff.'}
);

/* Saltmouth's watch, and Ashby's soldiers */
const smIntercept = (G, id) => {
  if (G.flags.c5_sm_skip){ G.flags.c5_sm_skip = false; return null; }
  if (heat(G, 'sm') >= 2 && Math.random() < 0.25 + 0.15 * heat(G, 'sm')){ G.flags.c5_dest = id; return 'c5_militia'; }
  return null;
};
function c5Helper(G){
  if (has('aldreth_ring')) return 'aldreth';
  if (G.flags.c4_wick === 'friend') return 'wick';
  if (G.flags.c5_elias === 'ally' && !withAlly('elias')(G)) return 'elias';
  return 'gull';
}
const C5_HELP = {
  aldreth:`The ring on your finger blazes with cold gold light, and Aldreth stands in the water beside you, dry as a summer field. "This is my place," she says. "I knew these caves when they were a chapel. Follow my light." She walks through the rock, and where she walks, you find a way.`,
  wick:`"Psst." A lantern bobs toward you over the rocks, and Wick's grinning face behind it. "Followed you all the way downriver. You still owe me a pie." She has a rope, a crowbar, and a very good sense of direction.`,
  elias:`Torchlight, and a rope snaking down. Ser Elias Brand leans over a ledge above you. "My people saw you fall. Grab on." Two freed laborers haul you up hand over hand.`,
  gull:`A small boat noses out of the dark, rowed by a tiny old woman in a coat of gull feathers. "Mother Gull," she says. "Forty years I've fished these caves. Get in, and don't touch the eels." She rows you through passages you would never have found.`
};

/* ---------- random encounters ---------- */
ENCOUNTERS.lowriver = {name:'The Lower River', alert:false,
  rows:[
    {range:[1,5], label:'Hostile', pick:[
      {text:`Goblins on fat river ponies come whooping out of the reeds.`, fight:{tiers:{5:['goblin','goblin','goblin','goblin'], 7:['hobgoblin','goblin','goblin','goblin']}, rout:2}},
      {if:G => heat(G, 'ash') >= 2, text:`A patrol of Ashby's soldiers rides up. "That's the one. Take them."`, fight:{tiers:{5:['guard','guard','guard'], 7:['guard','guard',{key:'veteran', name:'Ashby Sergeant'}]}, rout:1}}
    ]},
    {range:[6,8], label:'Hazard', pick:[
      {text:`The tide is coming in fast across the salt flats.`, check:{skill:['survival','athletics'], dc:13, pass:{text:`You read the channels and reach high ground.`}, fail:{text:`Cold water to the waist, then the chest. You struggle out, half-drowned.`, damage:{dice:'2d6', type:'cold'}}}}
    ]},
    {range:[9,15], label:'Quiet', pick:[{text:`Gulls wheel over the mudflats. The sea smells close.`}, {text:`A chain gang shuffles past on the far bank, guarded by soldiers in Ashby's green. Nobody looks up.`, set:{c5_saw_gang:true}}]},
    {range:[16,19], label:'Find', pick:[{text:`A broken shackle in the mud, and a few coins someone dropped running.`, give:{gold:'2d8'}}]},
    {range:[20,20], label:'Blessing', pick:[{text:`Far off, a lighthouse flashes green across the water. Somebody is still keeping the light.`, give:{insp:true}}]}
  ]};
AREA_NAME.lowriver = 'The Lower River'; AREA_NAME.saltmouth = 'Saltmouth'; AREA_NAME.seacave = 'Sea Caves';
AREA_COVER.lowriver = 'some'; AREA_COVER.saltmouth = 'some'; AREA_COVER.seacave = 'lots'; AREA_COVER.warren = 'lots';
ENCOUNTERS.saltmouth = {name:'Saltmouth', alert:false,
  rows:[
    {range:[1,3], label:'Hostile', pick:[{text:`Goblins have slipped over the seawall to loot.`, fight:{tiers:{5:['goblin','goblin','goblin'], 7:['hobgoblin','goblin','goblin']}, rout:1}}]},
    {range:[4,14], label:'Quiet', pick:[{text:`Fishing boats sit idle at their moorings. Nobody has dared put out for weeks.`}, {text:`A child draws an ogre in chalk on the harbor wall, then a hero hitting it.`}]},
    {range:[15,19], label:'Find', pick:[{text:`A fisherman presses a smoked herring and a coin on you. "For luck. We need it."`, give:{gold:1, items:{ration:1}}}]},
    {range:[20,20], label:'Blessing', pick:[{text:`The lighthouse flashes green over the harbor, steady as a heartbeat.`, give:{insp:true}}]}
  ]};

/* an original shadow-thing that leaks from the cracked door */
MONSTERS.hollow_shade = {name:'Shade of the Hollow', ac:12, hp:12, xp:100, pp:10, init:2, type:'undead', special:['undead'], immune:['necrotic','poison'], vuln:['radiant'],
  save:{str:-2,dex:2,con:1,int:-2,wis:0,cha:-1}, attack:{name:'Hollow Touch', toHit:4, dmg:'2d6+2', type:'necrotic'},
  desc:'A shape of darkness that whispers your own name back to you.'};
MONSTERS.vane_final = Object.assign({}, MONSTERS.vane, {name:'Aurek Vane, Hollow-Touched', hp:40, xp:1800, shieldUses:1,
  actions:[{w:3, strikes:[{name:'Shadow Bolt', toHit:6, dmg:'2d8', type:'necrotic', spell:true}]},
           {w:1, strikes:[{name:'Magic Missile', missile:3, dmg:'1d4+1', type:'force', uses:2}]},
           {w:1, strikes:[{name:'Grasp of the Hollow', save:'wis', dc:13, dmg:'3d6', type:'psychic', half:true, uses:1}]}]});

Object.assign(STORY, {
  /* ===================== CHAPTER FIVE: WHERE THE RIVER ENDS ===================== */
  c5_start:{
    chapter:5, title:'The Lower River Road', short:'Lower River Road', area:'lowriver', rest:'short',
    onEnter:G => {
      G.flags.c5_begun = true;
      if (G.flags.c4_fell_saved && !G.flags.c5_writ){ G.flags.c5_writ = true; addItem('fell_writ'); log('good', 'A rider catches you on the road with a sealed packet from Lady Fell: a writ of the River Council in your name.'); }
      if (G.flags.c4_outlaw && G.flags.heat_sm === undefined){ G.flags.heat_sm = 2; G.flags.heat_ash = 1; }
    },
    text:G => `Three days downriver, the land flattens into salt marsh and the river spreads wide and brown toward the sea. Ahead, where the road meets the coast, green banners hang over a muddy camp and a barricade across the road. Beyond it, on the cliffs, you can just see the Saltmouth lighthouse.
      <br><br>${vaneHasStaff(G) ? 'Somewhere ahead, Vane carries the Dawnwarden Staff.' : 'The Dawnwarden Staff is heavy across your back.'} ${vaneLights(G) >= 2 ? 'He holds more of the old lights than you would like.' : 'He holds few of the lights. He will be desperate.'}${G.flags.c4_followed ? '<br><br>You know where Vane moored his barge: a cove below the lighthouse, reached by a path through the salt marsh.' : ''}`,
    back:`The lower river road. Ashby's barricade blocks the way to Saltmouth.`,
    options:[
      {label:'Ride up to Lord Ashby\'s camp', go:'c5_ashby'},
      {label:'Take the marsh path Vane used, around the barricade', tag:'You followed him', if:G => !!G.flags.c4_followed, set:{c5_knows_door:true, c5_road_open:true},
       text:`You lead the way through the reeds in the dark, the same path the barge crew took. By dawn you are on the Saltmouth road behind Ashby's lines, and you have seen where the masked men go: into a cleft in the cliff below the lighthouse.`, go:'c5_gate'},
      {label:'Try to slip around the barricade through the marsh', if:G => !G.flags.c4_followed && !G.flags.c5_road_open, check:{skill:['stealth','survival'], dc:14, adv:G => withAlly('tess')(G) || withAlly('brindle')(G),
        pass:{text:`Mud, reeds, and one very cold channel. You come out on the coast road behind Ashby's lines.`, set:{c5_road_open:true}, go:'c5_gate'},
        fail:{text:`A sentry's horn blows. Soldiers come splashing. You fall back to the road, and now Ashby's men know your face.`, fn:crime('ash', 1, 'Caught sneaking past the barricade.')}}}
    ]
  },
  c5_ashby:{
    chapter:5, title:"Lord Ashby's Camp", short:'Ashby\'s Camp', area:'lowriver', rest:false,
    intercept:(G, id) => heat(G, 'ash') >= 3 && !G.flags.c5_ashby_done ? 'c5_checkpoint' : null,
    text:G => `Tents in rows, cook fires, soldiers in green. Behind the tents, a line of ragged men sits in the mud with chains on their ankles. Lord Harlan Ashby receives you under an awning: fifty, handsome, perfumed, with a smile that stops well short of his eyes.
      <br><br>"An adventurer! Excellent. Saltmouth is in the grip of a monster, and I am holding the road to keep the panic from spreading. Meanwhile, some rogue knight has raided three of my labor camps and freed my workers. A hundred and fifty gold for his head. Will you take my coin?"`,
    back:G => G.flags.c5_ashby_done ? `The camp is quiet. ${G.flags.c5_ashby_done === 'arrested' ? 'Ashby\'s banners are coming down.' : 'Ashby watches you from his awning.'}` : `Lord Ashby's camp. Soldiers, mud, and the chained men behind the tents.`,
    options:[
      {label:'Take Ashby\'s contract', if:G => !G.flags.c5_contract && !G.flags.c5_ashby_done, set:{c5_contract:true},
       text:`"Splendid." He slides a map across the table. "Fenwood, north of the road. My men can never find him. You will."`},
      {label:'Ask about the chained men', if:G => !G.flags.c5_ashby_done, stay:true, once:'c5_ask_chains',
       text:`"Debtors and vagrants, working off their sentences. Road repairs." He smiles. "Saltmouth will need a good road when this is over."`},
      {label:'Ask why the road to Saltmouth is closed', if:G => !G.flags.c5_ashby_done, stay:true, once:'c5_ask_road',
       text:`"An ogre has taken the town hostage. Goblins too. I am containing the danger. No one goes in, no one comes out, for their own safety."`},
      {label:'Study Ashby while he talks', if:G => !G.flags.c5_ashby_lies && !G.flags.c5_ashby_done, check:{skill:'insight', dc:14, adv:G => withAlly('maren')(G),
        pass:{text:`He's lying about the chained men, and about the road. And under the perfume he's frightened. He keeps glancing at a locked chest in his tent, the way a man glances at a sleeping dog.`, set:{c5_ashby_lies:true}},
        fail:{text:`A charming lord with a difficult job.`}}},
      {label:'Silas: "That seal on his desk."', if:G => withAlly('silas')(G) && !G.flags.c5_ashby_lies, set:{c5_ashby_lies:true, c5_seal_seen:true},
       text:`Silas leans close. "The letter on his desk. Black wax, blank mask. I'd know that seal anywhere. I carved the first one."`},
      {label:'Search Ashby\'s tent while he inspects the camp', tag:'Crime', if:G => !!G.flags.c5_ashby_lies && !has('ashby_letter') && !G.flags.c5_ashby_done,
       check:{skill:['stealth','sleight'], dc:15, adv:G => !!G.flags.c5_seal_seen,
        pass:{text:`In the locked chest, under his shirts: a letter sealed with a blank mask. "Forty more strong backs by the dark of the moon."`, give:{items:{ashby_letter:1}, xp:150}},
        fail:{text:`A soldier walks in on you with your hand in the chest. You talk fast and leave faster, but Ashby will hear of it.`, fn:crime('ash', 2, 'Caught in Lord Ashby\'s tent.')}}},
      {label:'Present Lady Fell\'s writ: open the road to Saltmouth', tag:'River Council', if:G => has('fell_writ') && !G.flags.c5_road_open,
       set:{c5_road_open:true},
       text:`Ashby reads the writ, and his smile goes stiff. "The River Council. Of course." He snaps his fingers. "Let them through." He watches you go like a man adding up a bill.`},
      {label:'Expose Ashby before his own soldiers', tag:'No fight', if:G => has('ashby_letter') && !G.flags.c5_ashby_done,
       check:{skill:['persuasion','intimidation'], dc:G => 16 - (has('fell_writ') ? 3 : 0) - (G.flags.c5_elias === 'ally' ? 3 : 0),
        pass:{text:`You read the letter aloud, loud enough for the whole camp. "Strong backs. Sold to the Faceless." Ashby's captain, a hard-faced woman named Corra Venn, takes the letter, reads it twice, and turns to her lord. "Sir. You'll come with me." The chains come off the laborers by nightfall, and Venn's soldiers fall in behind you. "Saltmouth, then. We owe it that."`,
              set:{c5_ashby_done:'arrested', c5_soldiers:true, c5_road_open:true}, give:{xp:400}},
        fail:{text:`"Forgeries! Seize them!" Ashby shrieks. His soldiers hesitate, and in the hesitation you get away. But now you are hunted in the lower river.`, fn:crime('ash', 3, 'Ashby has declared you an outlaw.')}}},
      {label:'Report that the rogue knight is dealt with', if:G => !!G.flags.c5_contract && !!G.flags.c5_elias && G.flags.c5_elias !== 'ally' && !G.flags.c5_paid,
       fn:G => { G.flags.c5_paid = true; G.flags.c5_road_open = true; give({gold:150}); },
       text:G => G.flags.c5_elias === 'dead' ? `Ashby looks at the knight's sword and claps his hands. "Splendid!" He pays in new silver. Within the hour his soldiers ride north to round up the freed workers.` : G.flags.c5_elias === 'captured' ? `Ashby's soldiers drag Ser Elias away in chains. Ashby pays in new silver and opens the road.` : `You hand over the knight's sword and lie well. Ashby pays in new silver and opens the road. Somewhere in Fenwood, Ser Elias is already moving his people.`},
      {label:'Go into Fenwood to find the rogue knight', if:G => !G.flags.c5_elias, go:'c5_fenwood'},
      {label:'Ride on to Saltmouth', if:G => !!G.flags.c5_road_open, go:'c5_gate'},
      {label:'Leave the camp', go:'c5_start'}
    ]
  },
  c5_checkpoint:{
    chapter:5, title:'Ashby\'s Checkpoint', short:'Checkpoint', area:'lowriver', rest:false,
    text:`Soldiers in green with crossbows block the road. "Halt! By order of Lord Ashby, you're under arrest."`,
    options:[
      {label:'Bluff: you\'re on the River Council\'s business', check:{skill:'deception', dc:14, adv:G => has('fell_writ'),
        pass:{text:`They look at each other, then at the seal you flash. They step aside.`, fn:G => { G.flags.heat_ash = 2; }, go:'c5_start'},
        fail:{text:`"Nice try." Crossbows come up.`, fight:{foes:['guard','guard','guard'], rout:1, flee:'c5_start', win:{go:'c5_start'}}}}},
      {label:'Pay them to look the other way', tag:'30 gp', if:G => G.char.gold >= 30, take:{gold:30}, fn:G => { G.flags.heat_ash = 2; }, text:`Thirty gold buys a great deal of looking the other way.`, go:'c5_start'},
      {label:'Fight through', tag:'Fight', fight:{foes:['guard','guard','guard'], rout:1, flee:'c5_start', win:{fn:crime('ash', 1, 'More dead soldiers in green.'), go:'c5_start'}}},
      {label:'Back off', go:'c5_start'}
    ]
  },

  /* ---------- The Contract: the Paladin of Freedom ---------- */
  c5_fenwood:{
    chapter:5, title:'Fenwood', short:'Fenwood', area:'lowriver', rest:'short',
    text:`Wet alder and old oaks, half-drowned at every high tide. Somewhere in here is a man three companies of soldiers can't catch.`,
    back:G => `Fenwood. ${jnumC5(G) >= 2 ? 'You know where the knight\'s camp is.' : `You have found ${jnumC5(G)} of 2 signs of the raider.`}`,
    options:[
      {label:'Track the raider', if:G => jnumC5(G) < 2, check:{skill:['survival','perception'], dc:14, adv:G => withAlly('tess')(G) || withAlly('brindle')(G),
        pass:{text:`A bootprint in the moss. Broken chains hidden under a log. Whoever he is, he's careful, and he's leading a lot of tired people.`, fn:G => { G.flags.c5_trail = (G.flags.c5_trail || 0) + 1; }},
        fail:{text:`Your foot goes into a loop of rope, and the world flips upside down.`, set:{c5_snared:true}, go:'c5_snare'}}},
      {label:'Watch for traps as you go', if:G => !G.flags.c5_snares_seen, check:{skill:['perception','investigation'], dc:13,
        pass:{text:`Snares. Dozens, skillfully set, and every one of them made to catch, not kill. Whoever set them doesn't want to hurt anyone. You step around them and follow the line they guard.`, set:{c5_snares_seen:true}, fn:G => { G.flags.c5_trail = (G.flags.c5_trail || 0) + 1; }},
        fail:{text:`Just trees, as far as you can tell.`}}},
      {label:'Go to the knight\'s camp', if:G => jnumC5(G) >= 2, go:'c5_elias_camp'},
      {label:'Back to the road', go:'c5_ashby'}
    ]
  },
  c5_snare:{
    chapter:5, title:'Hanging in a Snare', short:'Snare', area:'lowriver', rest:false,
    text:`You hang upside down from an oak by one ankle, swinging gently, with all the blood in your head.`,
    options:[
      {label:'Cut yourself free', check:{skill:['athletics','acrobatics','sleight'], dc:12,
        pass:{text:`You curl up, cut the rope, and land on your back in the moss. Nothing broken.`, fn:G => { G.flags.c5_trail = (G.flags.c5_trail || 0) + 1; }, go:'c5_fenwood'},
        fail:{text:`You twist and swing. The rope holds.`}}},
      {label:'Hang there and wait', text:`After an hour, a tall man in battered plate steps out of the trees and looks up at you. "Ashby's? No. Ashby's men don't swear like that." He cuts you down, and keeps his sword drawn. "Come on, then. Let's talk."`, set:{c5_trail:2, c5_caught_by_elias:true}, go:'c5_elias_camp'}
    ]
  },
  c5_elias_camp:{
    chapter:5, title:"The Knight's Camp", short:"Elias's Camp", area:'lowriver', rest:'short',
    text:G => `A hidden island in the fen, ringed with reeds. Thirty thin, ragged people sit around a smokeless fire, some still with shackle scars on their ankles. A tall man in battered plate stands to meet you, the sunburst of a holy order scratched off his breastplate and a broken chain painted in its place.
      <br><br>"Ser Elias Brand," he says. "Once of Lord Ashby's household. Now of no household at all. You've come for my head, or you've come for the truth. Which?"`,
    back:G => G.flags.c5_elias === 'ally' ? `The freed laborers' camp. People nod to you now.` : `Ser Elias's hidden camp.`,
    options:[
      {label:'Ask why he raids Ashby\'s camps', stay:true, once:'c5_e_why', set:{c5_elias_truth:true, c5_knows_door:true},
       text:`"Ashby takes debtors and drifters and sells them to the masked man by the wagonload. They dig in the sea caves under Saltmouth lighthouse, at a great door of black stone, day and night, until they drop. I swore an oath to protect the helpless. I swore one to Ashby too. I kept the better one."`},
      {label:'Ask about Saltmouth', stay:true, once:'c5_e_town',
       text:`"The ogre came three weeks ago with the goblins. Odd. Ogres don't usually bring friends, and goblins don't usually follow anyone bigger than themselves for long. Something's wrong with that ogre."`},
      {label:'Listen to the freed laborers', stay:true, once:'c5_e_laborers', check:{skill:['insight','persuasion'], dc:11,
        pass:{text:`An old fisherman named Jonah shows you his hands, raw to the bone. "The masked men sing while we dig. And the door... sometimes it whispers our names. It offered me my wife back. I almost said yes."`, set:{c5_jonah:true}},
        fail:{text:`They are too tired and frightened to talk to a stranger.`}}},
      {label:'Ask Ser Elias to join you against the Faceless', tag:'Companion', if:G => !G.flags.c5_elias, set:{c5_elias:'ally'}, fn:G => joinAlly('elias'), give:{xp:300},
       text:`Elias looks at his people, and then at you. "Jonah can lead them to the hill farms. They'll be safe." He sheathes his sword. "I'll come. A free man chooses his fights, and this is mine."`},
      {label:'Ask Elias for his sword, to fool Ashby', if:G => !G.flags.c5_elias && !!G.flags.c5_contract, check:{skill:'persuasion', dc:12,
        pass:{text:`He laughs, short and surprised, and unbuckles it. "Tell him I went into the sea. It's half true: I'm going to Saltmouth." The sword is plain and good. "I'll find you there."`, set:{c5_elias:'tricked'}, give:{xp:200}},
        fail:{text:`"My sword is the one thing I still own." He won't part with it.`}}},
      {label:'Take him in for Ashby\'s gold', tag:'Fight', if:G => !G.flags.c5_elias,
       fight:{foes:[{key:'knight', name:'Ser Elias Brand', boss:true}], captive:'elias_talk', flee:'c5_fenwood',
         win:{fn:G => { if (!G.flags.c5_elias) G.flags.c5_elias = G.captive === 'elias_talk' ? 'captured' : 'dead'; },
              text:G => G.captive === 'elias_talk' ? `Elias lies in the mud, beaten but breathing. His people scatter into the fen.` : `Ser Elias Brand is dead. His people scatter into the fen, and you hear them weeping long after.`}}},
      {label:'Back to Fenwood', go:'c5_fenwood'}
    ]
  },

  /* ---------- Saltmouth: the Ogre and the Goblins ---------- */
  c5_gate:{
    chapter:5, title:'The Saltmouth Gate', short:'Saltmouth Gate', area:'lowriver', rest:false,
    text:G => G.flags.c5_grallow ? `The Saltmouth gate stands open. People are coming and going for the first time in weeks.` :
      `Saltmouth's palisade of tarred logs runs from cliff to harbor. On top of the gatehouse sits an ogre, enormous and patient, with a club like a ship's mast across his knees. Goblins perch on the wall around him like gulls. "Nobody out," the ogre booms. "Nobody in. Not till town gives Grallow the shiny lamp from the tall tower. And all its silver. And twelve fat sheep. Every day."`,
    options:[
      {label:'Talk to the ogre', if:G => !G.flags.c5_grallow, stay:true, once:'c5_g_gate',
       text:`"Grallow not want to do this," the ogre says, quieter, looking at the goblins out of the corner of his eye. "But Grallow must." Then louder: "GO AWAY."`},
      {label:'Climb the seawall where the goblins aren\'t looking', if:G => !G.flags.c5_grallow, check:{skill:['athletics','stealth'], dc:13,
        pass:{text:`Wet rocks, a slimy ladder, and a drop onto a fish-drying rack. You're in Saltmouth.`, go:'c5_town'},
        fail:{text:`A goblin spots you and screeches. Arrows rattle off the rocks. You slide back down, scraped and bruised.`, damage:{dice:'2d6', type:'piercing'}}}},
      {label:'Tell Grallow you\'ve come to fetch the lamp for him', if:G => !G.flags.c5_grallow, check:{skill:'deception', dc:12,
        pass:{text:`The ogre considers. "Clever little thing. Go, then. Bring the lamp. Grallow waits."`, set:{c5_gate_bluff:true}, go:'c5_town'},
        fail:{text:`"Grallow not stupid." He says it with a strange little smile.`, set:{c5_grallow_odd:true}}}},
      {label:'Attack the gate', tag:'Fight', if:G => !G.flags.c5_grallow,
       fight:{foes:[{key:'ogre', name:'Grallow', boss:true, escapeAt:0.5, escapeText:'<b>Grallow bellows, drops off the wall, and lumbers away into the woods.</b> The goblins scatter after him.'}, 'goblin', 'goblin', 'goblin'], rout:2, flee:'c5_start',
         win:{set:{c5_gate_won:true}, text:`The gate is yours. The townsfolk open it, cheering, but the ogre is still out there in the woods.`, go:'c5_town'}}},
      {label:'Enter Saltmouth', if:G => !!G.flags.c5_grallow, go:'c5_town'},
      {label:'Head into the woods to find the ogre\'s cave', if:G => !G.flags.c5_grallow, go:'c5_cave'},
      {label:'Back up the road', go:'c5_start'}
    ]
  },
  c5_town:{
    chapter:5, title:'Saltmouth Harbor', short:'Saltmouth', area:'saltmouth', rest:'both', intercept:smIntercept,
    onEnter:G => { if (G.flags.c5_soldiers && !G.flags.c5_soldiers_seen){ G.flags.c5_soldiers_seen = true; log('good', 'Captain Venn\'s soldiers march in behind you and take up posts on the harbor wall.'); } },
    text:`Saltmouth huddles around a little stone harbor: fishing boats, a chapel, a tavern called the Gull and Anchor, and a crowd of frightened people. Above it all, on the cliff, the old lighthouse turns its slow green beam out over the sea. A sturdy woman with a harpoon on her shoulder pushes through the crowd. "Wenna Coyle, harbormaster. If you've come to help, you're the first."`,
    back:G => `Saltmouth harbor. ${G.flags.c5_grallow ? 'People are mending nets and almost smiling.' : 'People talk in low voices about the ogre.'}`,
    options:[
      {label:'Ask Wenna what happened here', stay:true, once:'c5_w_story', set:{c5_knows_ansel:true},
       text:`"The ogre came three weeks ago, and the goblins with him. Nobody leaves. Then Lord Ashby closed the road from the other side, so nobody comes in either. And the new curate, Brother Ansel, arrived just before all of it." She frowns. "He's been very kind. Very helpful. He keeps asking about the lamp."`},
      {label:'Ask Wenna about the lighthouse', stay:true, once:'c5_w_light',
       text:`"Old Pellam keeps it. Keeps it lit with the Tidelamp, same as his family's done for three hundred years. He won't give it up for the ogre or the king or God himself."`},
      {label:'Ask Wenna about the sea caves', stay:true, once:'c5_w_caves', set:{c5_knows_door:true},
       text:`"Under the lighthouse cliff there's a cleft you can only reach at low tide. My granny called it the Chapel of the Drowned. Strange lights down there lately, and singing." She spits. "We don't go there."`},
      {label:'The lighthouse', go:'c5_lighthouse'},
      {label:'The chapel', go:'c5_chapel'},
      {label:'The woods behind the town, where the ogre lairs', if:G => !G.flags.c5_grallow, go:'c5_cave'},
      {label:'The cleft under the lighthouse cliff: the Drowned Door', tag:'Finale', if:G => !!G.flags.c5_knows_door, go:'c5_door_approach'},
      {label:'Steal food from the fish market', tag:'Crime', check:{skill:'sleight', dc:12,
        pass:{text:`A smoked fish and a loaf. You feel bad about it later.`, give:{items:{ration:2}}},
        fail:{text:`"Thief! In times like these!" Wenna's people look at you very differently now.`, fn:crime('sm', 2, 'Stealing from a starving town.')}}},
      {label:'Back to the gate', go:'c5_gate'}
    ]
  },
  c5_militia:{
    chapter:5, title:'Saltmouth Militia', short:'Militia', area:'saltmouth', rest:false,
    text:G => `Wenna Coyle and four fishermen with gaff hooks block your way. ${G.flags.c4_outlaw ? 'One of them holds a handbill from Greywater with your face on it.' : '"We don\'t take kindly to thieves. Not now."'}`,
    options:[
      {label:'Apologize and make it right', check:{skill:'persuasion', dc:G => 10 + 2 * heat(G, 'sm'), adv:G => withAlly('elias')(G) || has('fell_writ'),
        pass:{text:`You talk, and they listen, and in the end Wenna lowers her harpoon. "Help us and we'll forget it."`, fn:G => { G.flags.heat_sm = 0; G.flags.c5_sm_skip = true; }, go:G => G.flags.c5_dest || 'c5_town'},
        fail:{text:`"Out. And stay out of my harbor." They march you to the gate.`, fn:G => { G.flags.c5_sm_skip = true; }, go:'c5_gate'}}},
      {label:'Pay for what was taken, and more', tag:G => `${heat(G, 'sm') * 15} gp`, if:G => G.char.gold >= heat(G, 'sm') * 15,
       fn:G => { G.char.gold -= heat(G, 'sm') * 15; G.flags.heat_sm = 0; G.flags.c5_sm_skip = true; }, text:`Wenna takes the coin for the town chest. "All right. All right."`, go:G => G.flags.c5_dest || 'c5_town'},
      {label:'Push past them', check:{skill:['athletics','intimidation'], dc:13,
        pass:{text:`They let you through. They don't like it.`, fn:G => { G.flags.c5_sm_skip = true; G.flags.heat_sm = Math.min(5, heat(G, 'sm') + 1); }, go:G => G.flags.c5_dest || 'c5_town'},
        fail:{text:`Four gaff hooks are very persuasive. You end up outside the gate.`, go:'c5_gate'}}}
    ]
  },
  c5_lighthouse:{
    chapter:5, title:'The Saltmouth Lighthouse', short:'Lighthouse', area:'saltmouth', rest:false,
    text:G => G.flags.c5_tidelamp_lost ? `The lighthouse is dark. Pellam sits at the top of the stairs with a bandaged head. "They took it," he says. "Masked men. In the night."` :
      `A tall white tower of old stone. At the top, in a cage of brass, burns a lamp of green sea-glass that throws its light thirty miles out to sea: the Tidelamp. The keeper, Pellam, is ninety if he's a day and stands in front of it with a boat hook. "If the ogre sent you, you can go back down those stairs on your head."`,
    options:[
      {label:'Tell Pellam about Vane and the Hollow', if:G => !G.flags.c5_tidelamp_safe && !G.flags.c5_tidelamp_lost, check:{skill:'persuasion', dc:G => 15 - (has('dawnstaff') ? 4 : 0) - (has('aldreth_ring') ? 2 : 0), adv:G => withAlly('elias')(G),
        pass:{text:G => `${has('dawnstaff') ? 'Pellam sees the staff across your back and his boat hook drops. "A warden\'s staff. My family has waited three hundred years for someone to come with that." ' : ''}He opens the brass cage with shaking hands. "Take it, then. Keep it from him. I'll light the old oil lamp. Ships will manage."`,
              set:{c5_tidelamp_safe:true}, give:{items:{tidelamp:1}, xp:300}},
        fail:{text:`"Everyone wants my lamp this month," Pellam says. "Everyone has a story."`, set:{c5_pellam_no:true}}}},
      {label:'Lift the lamp from its seat with the Dawnwarden Staff', if:G => has('dawnstaff') && !G.flags.c5_tidelamp_safe && !G.flags.c5_tidelamp_lost && !!G.flags.c5_pellam_no, check:{skill:['religion','arcana'], dc:12,
        pass:{text:`You touch the bronze rays of the staff to the lamp, and the green light flows into the staff's cradle like water. The tower goes dark. Pellam stares. "You're a warden," he whispers, and doesn't try to stop you.`, set:{c5_tidelamp_safe:true}, give:{items:{tidelamp:1}, xp:200}},
        fail:{text:`The light flares and you stagger back, blinded.`, damage:{dice:'2d6', type:'radiant'}}}},
      {label:'Guard the lamp tonight', if:G => !G.flags.c5_tidelamp_safe && !G.flags.c5_tidelamp_lost && !G.flags.c5_guarded,
       set:{c5_guarded:true},
       text:`You sit up with Pellam. At midnight, footsteps on the stair: three figures in grey with blank masks, and a voice you recognize from the chapel. Brother Ansel.`,
       fight:{foes:[{key:'cult_fanatic', name:'Brother Ansel', boss:true}, 'cultist', 'cultist'], cover:'lots', rout:1, captive:'ansel_talk',
         win:{set:{c5_ansel_done:true, c5_knows_door:true}, text:`Pellam looks at the bodies, then at you. "All right. All right. Take the lamp, before anyone else tries." He opens the cage.`, give:{items:{tidelamp:1}}, fn:G => { G.flags.c5_tidelamp_safe = true; }}}},
      {label:'Back down to the harbor', go:'c5_town'}
    ]
  },
  c5_chapel:{
    chapter:5, title:'Saltmouth Chapel', short:'Chapel', area:'saltmouth', rest:false,
    text:G => G.flags.c5_ansel_done ? `The little chapel is empty. Someone has scrubbed the floor where Brother Ansel fell.` : `A low stone chapel full of fishermen's votive boats. Brother Ansel, young and gentle, is handing out bread. "Friend! Come in out of the wind. Saltmouth needs all the friends it can get."`,
    options:[
      {label:'Talk with Brother Ansel', if:G => !G.flags.c5_ansel_done, stay:true, once:'c5_ansel_chat',
       text:`He asks a great many kind questions. Where you came from. Who you serve. Whether you've seen the lighthouse up close. Whether you happened to bring anything from upriver.`},
      {label:'Watch him closely', if:G => !G.flags.c5_ansel_done && !G.flags.c5_ansel_known, check:{skill:'insight', dc:14, adv:G => withAlly('silas')(G),
        pass:{text:`His hands are soft, but there's chalk under his nails, and the faint line of a mask strap across his cheekbones. When you mention Vane's name, he doesn't blink, which is its own kind of blink.`, set:{c5_ansel_known:true}},
        fail:{text:`A kind young priest, a long way from home.`}}},
      {label:'Search his quarters while he hands out bread', tag:'Crime', if:G => !G.flags.c5_ansel_done && !G.flags.c5_ansel_proof, check:{skill:['stealth','investigation'], dc:13,
        pass:{text:`Under his cot: a blank white mask, a chalk map of the sea caves with a door drawn at the bottom, and a list of the lighthouse watch hours.`, set:{c5_ansel_proof:true, c5_knows_door:true, c5_ansel_known:true}, give:{xp:150}},
        fail:{text:`A sacristan catches you rifling a priest's cot. Word gets around a small town fast.`, fn:crime('sm', 1, 'Caught in the chapel quarters.')}}},
      {label:'Expose Ansel to Wenna and the town', tag:'No fight', if:G => !!G.flags.c5_ansel_proof && !G.flags.c5_ansel_done,
       set:{c5_ansel_done:true}, give:{xp:250},
       text:`Wenna looks at the mask and the map, then at Ansel, and her face goes like the sea in winter. Ansel runs for the door, and runs straight into a dozen fishermen. He tells them everything, quickly, including the night of the low tide: tomorrow.`},
      {label:'Follow Ansel when he slips out at dusk', if:G => !!G.flags.c5_ansel_known && !G.flags.c5_ansel_done && !G.flags.c5_followed_ansel, check:{skill:'stealth', dc:14,
        pass:{text:`He goes down the cliff path at low tide to a cleft in the rock, where torchlight flickers and men in masks sing. You've found the Drowned Door.`, set:{c5_followed_ansel:true, c5_knows_door:true}, give:{xp:150}},
        fail:{text:`He looks back once, and smiles, and you know you've lost him.`}}},
      {label:'Confront Ansel', tag:'Fight', if:G => !!G.flags.c5_ansel_known && !G.flags.c5_ansel_done,
       fight:{foes:[{key:'cult_fanatic', name:'Brother Ansel', boss:true}], captive:'ansel_talk', win:{set:{c5_ansel_done:true}}}},
      {label:'Back to the harbor', go:'c5_town'}
    ]
  },
  c5_cave:{
    chapter:5, title:"Grallow's Cave", short:"Ogre's Cave", area:'lowriver', rest:false,
    text:G => G.flags.c5_grallow ? `Grallow's cave is empty and cold.` :
      `A cave in a mossy bluff, smelling of smoke and wet dog. The ogre sits by a fire, enormous and alone, and when he sees you he doesn't reach for his club. He just looks sad. "You come to kill Grallow? Grallow not blame you." He sighs. "Goblins have Grallow's little sister, Mossy. They say they hurt Mossy if Grallow not scare the town. Grallow not want to scare anyone."`,
    options:[
      {label:'"Tell me about Mossy."', if:G => !G.flags.c5_grallow, stay:true, once:'c5_g_mossy',
       text:`"Little. Pretty. Sings." Grallow wipes his nose. "Goblins keep her in their hole, in the cliffs past the town. Grallow too big to go in. You little. You go in, Grallow help."`},
      {label:'Watch him while he talks', if:G => !G.flags.c5_grallow && !G.flags.c5_grallow_lies, check:{skill:'insight', dc:16, adv:G => !!G.flags.c5_grallow_odd,
        pass:{text:`His words are slow, but his eyes aren't. They flick to your weapons, your purse, the cave mouth, quick and clever. He's choosing his words like a man playing a stupid ogre in a play.`, set:{c5_grallow_lies:true}},
        fail:{text:`A big, sad, simple creature.`}}},
      {label:'Look around the cave', if:G => !G.flags.c5_grallow && !has('grallow_ledger'), check:{skill:['investigation','perception'], dc:14, adv:G => withAlly('silas')(G),
        pass:{text:`Behind a rock, under a bearskin: a ledger in a careful, enormous hand. Tolls collected. Goblins paid. And at the bottom, "Lamp to the masked man. Town to me." Mossy isn't mentioned once. There is no Mossy.`, set:{c5_grallow_lies:true}, give:{items:{grallow_ledger:1}, xp:200}},
        fail:{text:`Bones, furs, a lot of fish heads.`}}},
      {label:'Agree to rescue Mossy with Grallow\'s help', tag:'Companion', if:G => !G.flags.c5_grallow && !G.flags.c5_grallow_with,
       fn:G => { G.flags.c5_prev_ally = G.ally ? G.ally.key : null; G.flags.c5_grallow_with = true; joinAlly('grallow'); },
       text:`Grallow claps his hands, which sounds like a tree falling. "Friend!" He picks up his club. "We go now. Grallow show the way."`, go:'c5_warren'},
      {label:'Throw the ledger at his feet', if:G => !G.flags.c5_grallow && has('grallow_ledger') && !G.flags.c5_g_unmasked, set:{c5_g_unmasked:true},
       text:`Grallow looks at the ledger for a long moment. Then he sits up straighter, and when he speaks, the slow voice is gone. "Well. That's a shame. I was enjoying being sad." He folds his hands. "Vane promised me this coast once the Hollow is open. What are you going to offer me?"`},
      {label:'"Vane will drown this whole coast. There\'ll be nothing left to rule."', if:G => !!G.flags.c5_g_unmasked && !G.flags.c5_grallow, check:{skill:'persuasion', dc:G => 16 - (has('fell_writ') ? 3 : 0) - (G.flags.c5_jonah ? 2 : 0),
        pass:{text:G => `Grallow drums his enormous fingers. "You've seen the door. I believe you." He stands. ${has('fell_writ') ? '"And a River Council toll post on the coast road, you say, with my name on it? Legal. Respectable. I could get used to respectable." ' : '"There are better coasts." '}He whistles, and somewhere in the cliffs, goblins start packing. "Tell Saltmouth I was never here."`,
              set:{c5_grallow:'bargained'}, give:{xp:500}},
        fail:{text:`"No. I think I'll take my chances with the masked man." He reaches for his club.`, set:{c5_g_fight:true}}}},
      {label:'Silas forges a letter from Vane, sending Grallow away', if:G => withAlly('silas')(G) && !G.flags.c5_grallow && (!!G.flags.c5_g_unmasked || !!G.flags.c5_grallow_lies),
       set:{c5_grallow:'tricked'}, give:{xp:400},
       text:`Silas works by firelight for an hour with a stolen goose quill and a seal he carves from a turnip. "My masterpiece," he says. Grallow reads the "new orders" from Vane, grunts, gathers his goblins, and marches north to wait at a ford fifty miles away for a lamp that will never come.`},
      {label:'Fight Grallow in his cave', tag:'Boss', if:G => !G.flags.c5_grallow,
       fight:G => ({foes:[{key:'ogre', name:'Grallow', boss:true}, 'goblin', 'goblin'], weaken:G.flags.c5_g_unmasked ? null : 0.9, surprise:G.flags.c5_g_unmasked ? null : 'player', flee:'c5_gate',
         win:{set:{c5_grallow:'dead'}, text:`Grallow falls across his own fire. The goblins flee. Saltmouth is free.`, go:'c5_gate'}})},
      {label:'Back to the gate', go:'c5_gate'}
    ]
  },
  c5_warren:{
    chapter:5, title:'The Goblin Warren', short:'Goblin Warren', area:'warren', rest:false,
    text:G => `A crack in the sea cliffs, widened by goblin picks, with bones on stakes outside. Inside, tunnels slope down toward the sound of the sea. ${withAlly('grallow')(G) ? 'Grallow squeezes in behind you, stooping. "Mossy is deep," he rumbles.' : ''}`,
    back:G => G.flags.c5_warren_done ? `The warren is empty and quiet.` : `The goblin warren.`,
    options:[
      {label:'Check the tunnel ahead for traps', if:G => !G.flags.c5_pit_found && !G.flags.c5_pit_passed, check:{skill:['perception','investigation'], dc:14,
        pass:{text:`The floor ahead is too smooth: a pit, covered with hide and gravel. You edge round it.`, set:{c5_pit_found:true, c5_pit_passed:true}},
        fail:{text:`Looks like a tunnel.`, set:{c5_pit_unknown:true}}}},
      {label:'Press on into the warren', if:G => !G.flags.c5_pit_passed,
       check:{save:'dex', dc:13,
         pass:{text:`The floor drops away under your front foot. You throw yourself backward and catch the edge. A pit, deep enough that you can't hear the bottom. You climb round it.`, set:{c5_pit_passed:true}},
         fail:knockOut('c5_seacave', `The floor gives way. You fall a long way, hit rock, hit water, and the dark closes over your head.`)}},
      {label:'Go down to the goblin chief\'s hall', if:G => !!G.flags.c5_pit_passed && !G.flags.c5_warren_done, go:'c5_warren_hall'},
      {label:'Leave the warren', go:'c5_gate'}
    ]
  },
  c5_warren_hall:{
    chapter:5, title:'The Goblin Hall', short:'Goblin Hall', area:'warren', rest:false,
    text:G => `A sea cave lit by stinking fish-oil lamps. A hobgoblin in a stolen admiral's coat, Snagtooth, lounges on a throne of crates with a dozen goblins around him. In a cage in the corner are four children from Saltmouth, and no little ogre sister at all.${withAlly('grallow')(G) ? ' Snagtooth sees Grallow and grins. Grallow grins back.' : ''}`,
    options:[
      {label:'Turn the goblins against Grallow', tag:'Trick', if:G => withAlly('grallow')(G) && !!G.flags.c5_grallow_lies, check:{skill:'deception', dc:14, adv:G => has('grallow_ledger'),
        pass:{fn:G => { G.ally = null; }, text:`"Read this, Snagtooth. 'Town to me.' Not to you. He's selling you out to the masked man the moment the lamp is his." Snagtooth reads, slowly, and his grin vanishes. "GET HIM!" Every goblin in the hall hurls itself at the ogre. Grallow roars and swings. When it's over, you only have to finish what's left.`, set:{c5_turned_goblins:true},
              fight:{foes:[{key:'ogre', name:'Grallow', boss:true, hp:22}, {key:'hobgoblin', name:'Snagtooth', hp:6}], fn:null, win:{set:{c5_grallow:'dead', c5_warren_done:true}, go:'c5_warren_free'}}},
        fail:{text:`Snagtooth laughs. "He told us you'd try that." Grallow's club comes up.`, fn:G => { G.flags.c5_betray_now = true; }}}},
      {label:'Strike Grallow before he strikes you', tag:'Boss', if:G => withAlly('grallow')(G) && !!G.flags.c5_grallow_lies,
       fn:G => { const hp = G.ally.hp; G.ally = null; G.flags.c5_gr_hp = hp; },
       text:`You move first. Grallow's slow, stupid face falls away into something sharp and furious. "Clever little thing!"`,
       fight:G => ({foes:[{key:'ogre', name:'Grallow', boss:true}, {key:'hobgoblin', name:'Snagtooth', boss:true}, 'goblin', 'goblin'], surprise:'player', rout:2,
         win:{set:{c5_grallow:'dead', c5_warren_done:true}, go:'c5_warren_free'}})},
      {label:'Attack Snagtooth with Grallow beside you', tag:'Boss', if:G => withAlly('grallow')(G) && !G.flags.c5_grallow_lies,
       fight:{foes:[{key:'hobgoblin', name:'Snagtooth', boss:true}, 'goblin', 'goblin', 'goblin'], rout:2,
         betray:{ally:'grallow', round:2, spec:{key:'ogre', name:'Grallow', boss:true}, text:'<b>Grallow turns, slow and smiling, and brings his club down on you instead.</b> "Sorry, little friend. Business." The sad, stupid voice is gone.', fn:G => { G.flags.c5_betrayed = true; }},
         win:{set:{c5_grallow:'dead', c5_warren_done:true}, go:'c5_warren_free'}}},
      {label:'Fight your way to the cage', tag:'Boss', if:G => !withAlly('grallow')(G),
       fight:{foes:[{key:'hobgoblin', name:'Snagtooth', boss:true}, 'goblin', 'goblin', 'goblin'], rout:2, win:{set:{c5_warren_done:true}, go:'c5_warren_free'}}},
      {label:'Sneak to the cage and open it', if:G => !withAlly('grallow')(G), check:{skill:['stealth','sleight'], dc:15,
        pass:{text:`You slip along the wall in the stink and the dark, lift the cage pin, and lead four silent children out by the hand. The goblins don't notice until you're gone.`, set:{c5_children:true, c5_warren_done:true}, give:{xp:300}, go:'c5_warren_free'},
        fail:{text:`A child sneezes. Every goblin turns.`, fight:{foes:[{key:'hobgoblin', name:'Snagtooth', boss:true}, 'goblin', 'goblin', 'goblin'], rout:2, win:{set:{c5_warren_done:true}, go:'c5_warren_free'}}}}}
    ]
  },
  c5_warren_free:{
    chapter:5, title:'Out of the Warren', short:'Out of the Warren', area:'warren', rest:'short',
    onEnter:G => {
      if (!G.flags.c5_children){ G.flags.c5_children = true; }
      if (G.flags.c5_prev_ally && !G.ally){ joinAlly(G.flags.c5_prev_ally); G.flags.c5_prev_ally = null; }
      if (!G.flags.c5_grallow) G.flags.c5_grallow = 'fled';
    },
    text:G => `The children run ahead of you down the cliff path, shrieking, into Saltmouth. Mothers come running. ${G.flags.c5_betrayed ? 'Grallow lies dead in the warren behind you. You were his "little friend" right up until you weren\'t.' : G.flags.c5_grallow === 'dead' ? 'The ogre is dead.' : 'The goblins are scattered.'} Wenna Coyle grips your hand. "Saltmouth won't forget this."`,
    options:[{label:'Down to the harbor', go:'c5_town', give:{xp:200}}]
  },
  c5_seacave:{
    chapter:5, title:'The Sea Caves', short:'Sea Caves', area:'seacave', rest:false,
    onEnter:G => {
      G.flags.c5_fell_pit = true;
      if (G.ally && G.ally.key === 'grallow'){
        G.ally = null; G.flags.c5_grallow_with = false;
        if (G.flags.c5_prev_ally){ joinAlly(G.flags.c5_prev_ally); G.flags.c5_prev_ally = null; }
      }
    },
    text:G => `You wake on a shelf of wet rock in the dark, the sea sucking and booming somewhere below. Your weapons are gone, lost in the fall. The water is rising: the tide is coming in.${G.flags.c5_seen_glow ? '' : ' Far off, through the rock, you can hear singing.'}`,
    back:`The sea caves. The tide is rising.`,
    options:[
      {label:'Climb toward the sound of the waves', if:G => !G.flags.c5_cave_out, check:{skill:['athletics','survival'], dc:14,
        pass:{text:`Hand over hand up a crack in the rock, toward a draught of sea air.`, set:{c5_cave_out:true}},
        fail:{text:`A wave slams you off the rock and back into the water.`, damage:{dice:'2d6', type:'bludgeoning'}}}},
      {label:'Follow the singing', if:G => !G.flags.c5_side_passage, check:{skill:['stealth','perception'], dc:13,
        pass:{text:`Through a crack no wider than your shoulders, you look down into a vast chapel cave: a black stone door carved with three sunbursts, masked figures singing, and laborers digging. You've found the back way to the Drowned Door. They don't know it exists.`, set:{c5_side_passage:true, c5_knows_door:true, c5_seen_glow:true}, give:{xp:200}},
        fail:{text:`The passage pinches shut. You back out, scraped.`}}},
      {label:'Shout for help', if:G => !G.flags.c5_cave_out && !G.flags.c5_cave_helped, fn:G => { const h = c5Helper(G); G.flags.c5_cave_helped = h; G.flags.c5_cave_out = true; say(C5_HELP[h]); }},
      {label:'Find your gear on the tideline and get out', if:G => !!G.flags.c5_cave_out,
       fn:G => { returnWeapons(G); G.flags.c5_cave_out = false; G.flags.c5_cave_helped = false; },
       text:`Your weapons are wedged in the rocks where the sea left them. You come out on the beach below Saltmouth at dawn, wet, battered, and alive.`, go:'c5_town'}
    ]
  },

  /* ---------- the finale ---------- */
  c5_door_approach:{
    chapter:5, title:'The Cleft below the Lighthouse', short:'The Cleft', area:'seacave', rest:'short',
    text:G => `At low tide, the cleft opens like a mouth in the cliff. Torchlight inside. Singing. ${G.flags.c5_soldiers ? 'Captain Venn\'s soldiers fan out along the beach behind you, crossbows ready.' : ''}${G.flags.c5_elias === 'tricked' && !withAlly('elias')(G) ? ' A tall figure in battered plate steps out of the rocks: Ser Elias, with a dozen freed laborers armed with picks. "I said I\'d find you."' : ''}`,
    options:[
      {label:'Go in by the back passage you found', if:G => !!G.flags.c5_side_passage, set:{c5_flank:true}, go:'c5_door',
       text:`You squeeze through the crack you found in the sea caves and drop silently onto a ledge above the Drowned Door.`},
      {label:'Walk in through the front', go:'c5_door'}
    ]
  },
  c5_door:{
    chapter:5, title:'The Drowned Door', short:'The Drowned Door', area:'seacave', rest:false,
    onEnter:G => { G.flags.c5_at_door = true; },
    text:G => {
      const n = vaneLights(G), staff = vaneHasStaff(G);
      const glow = n === 0 ? 'Its three seats are empty and dark.' : n === 1 ? 'One of its three seats burns with stolen light.' : n === 2 ? 'Two of its three seats burn with stolen light.' : 'All three of its seats blaze with stolen light, and the door is cracked open a hand\'s width. Through the crack comes a voice that sounds like everyone you have ever lost.';
      return `A cave as big as a cathedral, its walls carved by hands three hundred years dead into pillars and saints. At the far end stands the Drowned Door: black stone, three sunbursts carved above it. ${glow}
        <br><br>Before it, in his archivist's coat and his blank mask, stands Aurek Vane, ${staff ? 'the Dawnwarden Staff in his hands' : 'his empty hands spread toward the door'}. Masked figures sing around him.${G.flags.c5_flank ? ' None of them has seen you yet.' : ' He turns as you come in. "You came," he says. "Everyone does, in the end."'}`;
    },
    options:[
      {label:'Let Aldreth speak to him', tag:'Her ring', if:G => has('aldreth_ring') && !G.flags.c5_aldreth_spoke, set:{c5_aldreth_spoke:true},
       text:`You lift your hand, and the bronze ring blazes. Sister Aldreth steps out of the light, armored and shining, between Vane and the door. She doesn't look at the masked men. She looks only at him. "Aurek. The voice behind that door is not your wife. It is not your son. It learned their names from your grief, the way it learned mine." She points at the crack. "Listen to it. Really listen."<br><br>Vane listens. In the silence, the voice behind the door says his son's name again, wrong, in a voice that is nobody's at all. Vane's hands begin to shake.`},
      {label:'Talk him down', check:{skill:'persuasion', dc:G => {
          let dc = 20;
          if (G.flags.c4_vane_shaken) dc -= 2;
          if (G.flags.c4_vane_why) dc -= 1;
          if (G.flags.c5_aldreth_spoke) dc -= 5;
          if (!vaneHasStaff(G)) dc -= 2;
          if (vaneLights(G) === 0) dc -= 2;
          if (G.flags.c5_jonah) dc -= 1;
          return Math.max(10, dc);
        },
        pass:{text:`"Your boy would be twenty now," you say. "Would he want you to stop hearing him? Or would he want you to remember him?" A long silence. Then Vane reaches up and unties his mask. Underneath is just a tired man of fifty, weeping. "I'm so tired," he says. The masked singers look at each other, and one by one they take off their masks too, and drop them in the sea.`,
              set:{c5_vane:'redeemed'}, give:{xp:1000}, go:'c5_seal'},
        fail:{text:`"You don't understand," Vane says, almost kindly. "Nobody who hasn't heard it understands." He raises his hand, and the shadows come.`, go:'c5_battle'}}},
      {label:'Seize the lights and reseal the door with the staff', tag:'Staff', if:G => has('dawnstaff'), go:'c5_seal_attempt'},
      {label:'Attack while they sing', tag:'Fight', if:G => !!G.flags.c5_flank, set:{c5_surprise:true}, go:'c5_battle'},
      {label:'Fight', tag:'Boss', go:'c5_battle'}
    ]
  },
  c5_seal_attempt:{
    chapter:5, title:'The Three Seats', short:'The Three Seats', area:'seacave', rest:false,
    text:G => `You run for the door with the Dawnwarden Staff blazing in your hands. ${G.ally ? `${allyName(G)} holds off the masked singers behind you.` : 'The masked singers come at you.'} ${vaneLights(G) ? 'You need to lift the stolen lights out of the seats and set the Dawnwardens\' seal back in their place.' : 'The seats are empty. You need to set the true lights in them.'}`,
    options:[
      {label:'Set the seal', check:{skill:['religion','arcana'], dc:G => 13 + vaneLights(G), adv:G => has('aldreth_ring') || withAlly('elias')(G),
        pass:{text:G => `The staff knows the way, as if Aldreth's hands were on yours. ${has('tidelamp') ? 'You set the Tidelamp in the third seat, and green light floods the cave. ' : ''}Light runs along the carvings above the door like fire along a fuse, and the crack slams shut with a sound like the sea closing over a stone. Behind the door, something screams. Vane falls to his knees, and the shadows around him flicker and thin.`,
              set:{c5_sealed:true}, give:{xp:500}, go:'c5_battle'},
        fail:{text:`The staff burns your hands and the light gutters. Vane laughs. "It doesn't like you."`, damage:{dice:'2d8', type:'radiant'}, go:'c5_battle'}}}
    ]
  },
  c5_battle:{
    chapter:5, title:'Before the Drowned Door', short:'The Battle', area:'seacave', rest:false,
    text:G => `${G.flags.c5_sealed ? 'The door is sealed. Vane is shaking, weakened, but not done.' : 'The light from the door pulses, and shadows peel off the walls like smoke.'}${G.flags.c5_soldiers ? ' Captain Venn\'s crossbows hammer into the masked men on the stair.' : ''}${G.flags.c5_elias === 'tricked' ? ' Ser Elias and his laborers charge the singers with picks and fury.' : ''}${G.flags.c4_gallery === 'turned' ? ' Three Gallery thieves you never saw coming cut the cultists\' boats loose.' : ''}`,
    options:[
      {label:'Fight Aurek Vane', tag:'Final battle', if:G => G.flags.c5_vane !== 'redeemed',
       fight:G => {
         const lights = G.flags.c5_sealed ? 0 : vaneLights(G);
         const foes = [{key:'vane_final', name:'Aurek Vane', boss:true, hp:40 + lights * 6}];
         for (let i = 0; i < lights; i++) foes.push('hollow_shade');
         let cultists = 2;
         if (G.flags.c5_soldiers) cultists--;
         if (G.flags.c5_elias === 'tricked') cultists--;
         if (G.flags.c4_gallery === 'turned') cultists--;
         if (G.flags.c5_ansel_done) cultists--;
         for (let i = 0; i < cultists; i++) foes.push(i === 0 && !G.flags.c5_ansel_done ? {key:'cultist', name:'Brother Ansel', hp:12} : 'cultist');
         const betray = withAlly('grallow')(G) ? {ally:'grallow', round:2, spec:{key:'ogre', name:'Grallow', boss:true},
           text:'<b>Grallow laughs, a sharp, clever laugh, and steps over to stand beside Vane.</b> "The lamp for him, the coast for me. Nothing personal, little friend."', fn:G => { G.flags.c5_betrayed = true; }} : null;
         return {foes, betray, noFlee:true, surprise:G.flags.c5_surprise ? 'player' : null, weaken:G.flags.c5_sealed ? 0.7 : null, cover:'lots',
           win:{set:{c5_vane:'defeated'}, go:'c5_seal'}};
       }},
      {label:'Finish it', if:G => G.flags.c5_vane === 'redeemed', go:'c5_seal'}
    ]
  },
  c5_seal:{
    chapter:5, title:'The Lights Come Home', short:'The Lights Come Home', area:'seacave', rest:false,
    text:G => G.flags.c5_sealed ? `The Drowned Door is dark and silent, sealed with the Dawnwardens' light. The cave is only a cave.` : `The cave is quiet. The door still pulses faintly, whispering.`,
    options:[
      {label:'Reseal the door with the staff', if:G => !G.flags.c5_sealed && (has('dawnstaff') || G.flags.c5_vane === 'redeemed' || G.flags.c5_vane === 'defeated'),
       set:{c5_sealed:true}, give:{xp:300},
       fn:G => { if (!has('dawnstaff')){ addItem('dawnstaff'); log('good', 'You take the Dawnwarden Staff from where Vane dropped it.'); } },
       text:`With no one to stop you, there is no hurry. You lift the stolen lights from their seats one by one with the staff, and set the Dawnwardens' seal, and the door goes dark and quiet and is only stone.`},
      {label:'Walk out into the morning', if:G => !!G.flags.c5_sealed, go:'c5_end'}
    ]
  },
  c5_end:{
    chapter:5, title:'Where the River Ends', short:'The End', area:'saltmouth', rest:'both',
    onEnter:G => { if (!G.flags.c5_done){ G.flags.c5_done = true; give({gold:250, xp:1500}); } },
    text:G => {
      const L = [];
      L.push(G.flags.c5_vane === 'redeemed' ? 'Aurek Vane, unmasked, rides back upriver in chains of his own choosing. At his trial he asks to be sent to the Saltreach Gaol, and to share a cell with an old forger who will teach him to make honest seals. Nobody quite knows what to make of that.' : 'Aurek Vane is dead at the foot of the door he tried to open. In his coat you find a little painting of a woman and a boy on a ferry.');
      L.push(G.flags.c5_elias === 'ally' || G.flags.c5_elias === 'tricked' ? 'Ser Elias Brand founds a free hold in the Fenwood, where no one wears chains.' : G.flags.c5_elias === 'dead' ? 'In Fenwood, the freed laborers bury Ser Elias under an oak. They do not invite you.' : '');
      L.push(G.flags.c5_ashby_done === 'arrested' ? 'Lord Ashby stands trial before the River Council.' : 'Lord Ashby keeps his lands and his smile, and the River Council quietly watches him.');
      if (G.flags.c5_grallow === 'bargained') L.push('A very large, very polite toll keeper now runs a River Council post on the coast road. Travelers say he keeps excellent accounts.');
      if (G.flags.c5_children) L.push('Four Saltmouth children grow up telling the story of the hero who opened their cage.');
      if (has('tidelamp')) L.push('The Tidelamp goes back into the lighthouse, and Pellam keeps it lit until he dies at a hundred and three.');
      L.push(G.flags.c4_fell_dead ? 'The River Council meets with one empty chair, for Lady Fell.' : 'Lady Marisol Fell gives a feast in your honor and makes you sit next to her.');
      L.push(has('aldreth_ring') ? 'On Gallows Hill, the Wailing House is gone. In its place is a patch of wildflowers, and sometimes, at dawn, a woman in a tabard who waves.' : '');
      return `Morning comes up over the sea at Saltmouth, gold and green. The lighthouse flashes. Down on the harbor, the fishing boats are putting out for the first time in a month.
        <br><br>${L.filter(Boolean).join(' ')}
        <br><br><b>Chapter Five: Where the River Ends is complete. The first saga of the Thornvale Chronicles is over.</b> Your hero's story goes on: Aldermere's job board, your Bestiary, and any adventure file you load are all waiting.`;
    },
    options:[
      {label:'Take the river road to Aldermere', tag:'City', fn:G => { G.flags.city_from = 'c5_end'; }, go:'city_gate'},
      {label:'Go back upriver to Bramblewick', go:'bramblewick'}
    ]
  }
});
function jnumC5(G){ return G.flags.c5_trail || 0; }

Object.assign(CAPTIVES, {
  elias_talk:{name:'knight', talk:{
    text:`Ser Elias sits up, bloody, and looks at you without fear. "Well. You've got me. Now what?"`,
    choices:[
      {label:'Ask him why', stay:true, once:'el_why', set:{c5_elias_truth:true, c5_knows_door:true},
       text:`"Ashby sells men to the Faceless to dig at a door under Saltmouth. I freed them. Hang me if you like. The door won't care."`},
      {label:'Let him go, and give him back his sword', set:{c5_elias:'tricked'}, give:{xp:200},
       text:`He looks at you a long time. "I'll be at Saltmouth," he says, and limps into the fen.`},
      {label:'Take him to Ashby in chains', set:{c5_elias:'captured'},
       text:`Ashby's soldiers drag him away. You never see him again.`}
    ]}},
  ansel_talk:{name:'curate', talk:{
    text:`Brother Ansel wakes and sees you, and starts to laugh, then to cry. "He said it wouldn't hurt."`,
    choices:[
      {label:'Ask where the door is', stay:true, once:'an_door', set:{c5_knows_door:true},
       text:`"The cleft under the lighthouse. At low tide. Tomorrow night, when the tide is lowest, he opens it."`},
      {label:'Hand him to Wenna', set:{c5_ansel_done:true}, text:`Wenna locks him in the net loft. He doesn't fight.`}
    ]}}
});

HIRE_PLACE.c5_town = `Wenna keeps a list of fisherfolk and travelers stranded in Saltmouth who can swing a weapon.`;
STORY.c5_town.options.splice(STORY.c5_town.options.length - 1, 0, HIRE_OPT);

NPC_ROSTER.push(
  {name:'Sergeant Odo Brask', role:'Greywater Watch sergeant, not a subtle man', tpl:'veteran', known:G => !!G.visits.c4_watch},
  {name:'Sister Aldreth', role:'Ghost of a Dawnwarden, keeper of the staff', tpl:'ghost_shade', known:G => !!G.flags.c4_knows_aldreth},
  {name:'Ivy Corrow', role:'Painter and queen of the Gallery', tpl:'bandit_captain', known:G => !!G.visits.c4_gallery_hall},
  {name:'Wick', role:'The thief who stole the Dawnwarden Staff', ally:'wick', known:G => !!G.visits.c4_wick},
  {name:'Pennywhistle', role:'Jester of the Merry Lanterns', tpl:'spy', known:G => !!G.visits.c4_green},
  {name:'Old Tam', role:'Greywater ferryman, paid to stay drunk', tpl:'commoner', known:G => !!G.flags.c4_met_tam},
  {name:'Lady Marisol Fell', role:'Last of the River Council in Greywater', tpl:'noble', known:G => !!G.flags.c4_next},
  {name:'Aurek Vane', role:'The Faceless', tpl:'vane', known:G => !!G.flags.c4_vane_met},
  {name:'Lord Harlan Ashby', role:'Lord of the lower river', tpl:'noble', known:G => !!G.visits.c5_ashby},
  {name:'Ser Elias Brand', role:'Paladin of Freedom', ally:'elias', known:G => !!G.visits.c5_elias_camp},
  {name:'Grallow', role:'The ogre at the Saltmouth gate', tpl:'ogre', known:G => !!G.visits.c5_gate},
  {name:'Wenna Coyle', role:'Harbormaster of Saltmouth', tpl:'veteran', known:G => !!G.visits.c5_town},
  {name:'Pellam', role:'Keeper of the Saltmouth lighthouse', tpl:'commoner', known:G => !!G.visits.c5_lighthouse},
  {name:'Brother Ansel', role:'The new curate of Saltmouth', tpl:'cult_fanatic', known:G => !!G.visits.c5_chapel}
);
