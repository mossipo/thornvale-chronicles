/* =====================================================================
   THORNVALE CHRONICLES : chapter3.js
   Chapter Three: The Saltreach Gaol. An original heist.
   The hero slips into a tidal-island prison under a false identity to
   learn the masked man's name from an old forger. Suspicion uses G.alert
   (0 to 5); at 5 the alarm bell rings and every gaol scene offers only
   the run for the gate.
   ===================================================================== */
'use strict';

/* ---------- suspicion helpers ---------- */
const SUS_DC = G => 10 + 2 * Math.min(5, G.alert || 0);
const sus = n => G => {
  G.alert = clamp((G.alert || 0) + n, 0, 6);
  log(n > 0 ? 'bad' : 'good', `Suspicion ${n > 0 ? 'rises' : 'falls'} to <b>${Math.min(5, G.alert)} of 5</b>.`);
};
const COVER = G => G.flags.c3_chaplain ? 'chaplain' : G.flags.c3_lamp ? 'lamplighter' : G.flags.c3_laundry || G.flags.c3_smock ? 'laundry hand' : 'stranger';
const LOCKDOWN_OPT = {label:'The alarm bell is ringing! Get to the gate', tag:'Suspicion 5', if:G => (G.alert || 0) >= 5, go:'c3_lockdown'};
const gaol = opts => [LOCKDOWN_OPT, ...opts.map(o => Object.assign({}, o, {if: o.if ? (G => (G.alert || 0) < 5 && o.if(G)) : (G => (G.alert || 0) < 5)}))];

/* Weapons go in the gate box and come back on the way out. */
function stashWeapons(G, keepLight){
  const e = equipOf();
  G.flags.c3_stash = e.weapons.slice();
  const light = keepLight ? e.weapons.concat(Object.keys(G.char.inv)).find(id => ITEMS[id] && ITEMS[id].kind === 'weapon' && ITEMS[id].props.includes('light') && owns(id)) : null;
  e.weapons = light ? [light] : [];
  log('sys', light ? `Your ${esc(ITEMS[light].name)} stays hidden on you. The rest goes in the box.` : 'Your weapons go in the gate box. Until you get them back, you fight with your fists (and any spells you know).');
}
function returnWeapons(G){
  if (!G.flags.c3_stash) return;
  const e = equipOf();
  e.weapons = [...new Set([...e.weapons, ...G.flags.c3_stash])].filter(id => owns(id)).slice(0, 3);
  delete G.flags.c3_stash;
  log('good', 'You collect your weapons from the gate box.');
}

/* ---------- random encounters inside the gaol ---------- */
ENCOUNTERS.gaol = {
  name:'Saltreach Gaol', alert:true, alertName:'Suspicion',
  rows:[
    {range:[1,4], label:'Hostile', pick:[
      {text:`Rats as big as cats pour out of a flooded drain, squealing.`, fight:{foes:['rat','rat']}}
    ]},
    {range:[5,9], label:'Patrol', pick:[
      {text:G => `Two guards on their rounds stop in front of you. "You, ${COVER(G)}. Where are you meant to be?"`,
       check:{skill:['deception','persuasion'], dc:SUS_DC, adv:G => !!G.flags.c3_chaplain,
        pass:{text:`Your answer is dull enough to be believed. They move on.`},
        fail:{text:`They exchange a look and one of them writes something down.`, fn:sus(1)}}},
      {text:`A guard on the wall walk calls down. "Oi! That's not your post!"`,
       check:{skill:'stealth', dc:SUS_DC,
        pass:{text:`You step behind a water barrel and the guard loses interest.`},
        fail:{text:`He blows a short whistle and points you out to another guard.`, fn:sus(1)}}}
    ]},
    {range:[10,14], label:'Quiet', pick:[
      {text:`Gulls scream over the wall. Somewhere a prisoner is singing a sea shanty, badly.`},
      {text:`The smell of wet stone, lye soap, and fish stew fills the yard.`},
      {text:`Waves boom against the rock beneath your feet. The tide is coming in.`}
    ]},
    {range:[15,17], label:'Find', pick:[
      {text:`A coin purse someone dropped behind a rain barrel.`, give:{gold:'2d6'}},
      {once:'gaol_tea', text:`A forgotten mug of hot willow tea sits on a windowsill. You drink it. You feel better.`, give:{heal:'1d6'}}
    ]},
    {range:[18,19], label:'Stranger', pick:[
      {once:'mags', text:`An old trustee prisoner named Mags, mopping the steps, mutters without looking up: "Sergeant Holt's been taking silver from strangers. Watch him."`, set:{c3_suspect_holt:true}}
    ]},
    {range:[20,20], label:'Lucky', pick:[
      {text:`A shift bell rings and every guard in sight turns to the gate to change watch. Nobody is looking at you.`, fn:sus(-1)}
    ]}
  ],
  ambush:[{text:`A guard finds you resting where you should not be.`, fn:sus(1)}]
};
AREA_NAME.gaol = 'Saltreach Gaol';

ITEMS.holt_letter = {name:"Holt's Letter", quest:true, desc:'Black wax, a blank mask, and the words "If Forty talks, he drowns. The tide does the rest."'};

const HOLT = {key:'thug', name:'Sergeant Holt', hp:32, boss:true};

JOURNAL.push(
  {text:'Get into the Saltreach Gaol under a false identity.', shown:G => !!G.flags.c3_briefed, done:G => !!G.flags.c3_inside || !!G.flags.c3_done},
  {text:'Find out why Silas Crane is afraid to talk.', shown:G => !!G.flags.c3_silas_afraid, done:G => !!G.flags.c3_holt_done},
  {text:'Learn the masked man\'s name from Silas Crane.', shown:G => !!G.flags.c3_briefed, done:G => !!G.flags.c3_silas_talked},
  {text:'Get off the island before the tide turns.', shown:G => !!G.flags.c3_silas_talked, done:G => !!G.flags.c3_done}
);
LORE.push(
  {when:G => G.flags.c3_knows_tide, text:'Prisoners in the Tide Cells are moved up to the yard at high tide.'},
  {when:G => G.flags.c3_suspect_holt, text:'Sergeant Holt has been spending silver he should not have.'},
  {when:G => G.flags.c3_proof, text:'Holt is the masked man\'s informer inside Saltreach Gaol.'},
  {when:G => G.flags.c3_silas_talked, text:'The masked man is Aurek Vane, a relic collector posing as a temple archivist. He waits at the Greywater ferry house at the new moon.'}
);

Object.assign(STORY, {
  /* ===================== CHAPTER THREE: THE SALTREACH GAOL ===================== */
  c3_briefing:{
    chapter:3, title:'Captain Doyle\'s House, Greywater', short:'Captain Doyle', area:'town', rest:'both',
    onEnter:G => { G.flags.c3_briefed = true; },
    text:`Hesta sends you back down the valley to Greywater, to a narrow house on Rope Street with a brass knocker shaped like a fish. Captain Maren Doyle, grey-haired and one-armed, once commanded the river watch. She reads Hesta's note, then the masked man's letter, and swears softly.
      <br><br>"I know that seal," she says. "Twelve years ago I arrested a forger called Silas Crane. He made seals and papers for anyone who paid, and once he bragged he'd made one for a man with no face. He's in the Saltreach Gaol now, out on the tide island. If anyone alive can name your masked man, it's Silas."
      <br><br>"The gaol doesn't let strangers in. But it does need a chaplain, a lamplighter, and laundry hands, and I know who is meant to be on tomorrow's barge."`,
    back:G => G.flags.c3_cover ? `Captain Doyle's front room smells of pipe smoke and tar. Your disguise is folded on the table.` : `Captain Doyle's front room smells of pipe smoke and tar. Tide tables cover one wall.`,
    options:[
      {label:'Ask about Silas Crane', once:'c3_ask_silas', set:{c3_knows_tide:true},
       text:`"Old now. Clever hands, frightened eyes. He's never told the gaol a thing. They keep him in the Tide Cells, the low ones that flood at high water. Twice a day the guards move those prisoners up out of the water. That's your best chance to talk."`},
      {label:'Ask about the gaol', once:'c3_ask_gaol', set:{c3_knows_insider:true},
       text:`"An old lighthouse fort on a rock in the estuary. At low tide a stone causeway runs out to it. At high tide it's an island. Governor Ilse Harrow runs it by the book, and the guards are honest folk, mostly." She taps the black seal. "Mostly. If someone paid Skarn, someone may be paying a guard."`},
      {label:'Ask what she wants out of this', once:'c3_ask_pay',
       text:`"I put Silas in there. I always knew he was holding something back. Find out what, and I'll pay you a hundred gold and buy the first round."`},
      {label:'Go in as the chaplain', if:G => !G.flags.c3_cover, set:{c3_cover:true, c3_chaplain:true},
       text:`Maren hands you a grey robe with a sun stitched over the heart. "The chaplain of the Morning Light visits every week. Prisoners can ask to see you, and the guards leave a chaplain be. Don't preach too long."`},
      {label:'Go in as the lamplighter', if:G => !G.flags.c3_cover, set:{c3_cover:true, c3_lamp:true},
       text:`A leather apron, a tin of lamp oil, and a ring of brass keys. "The lamplighter climbs the tower and goes where he likes. Nobody watches a lamplighter."`},
      {label:'Go in as a laundry hand', if:G => !G.flags.c3_cover, set:{c3_cover:true, c3_laundry:true},
       text:`A canvas smock and a pair of red, raw hands to match. "Laundry hands carry baskets between the cells and the wash house. Nobody looks at laundry hands at all."`},
      {label:'Take the tide barge out to Saltreach', if:G => !!G.flags.c3_cover, go:'c3_gate',
       text:`The barge leaves at first light, riding the falling tide out across the estuary.`}
    ]
  },

  c3_gate:{
    chapter:3, title:'The Saltreach Causeway', short:'Causeway Gate', area:'wilds', rest:false,
    text:`The barge grounds on shingle as the water drains away, and you walk the last stretch along a slick stone causeway. Saltreach Gaol squats on its rock ahead: a ring of grey wall around an old lighthouse, its great lamp dark by day. At the gate, two guards in oilskins check names against a list while a third holds out a wooden box. "Weapons in the box. You get them back on the way out."`,
    back:G => G.flags.c3_inside ? `The gaol gate. The guards in oilskins watch the causeway and the rising water.` : `The gaol gate. The guards in oilskins wait with their list and their box.`,
    options:gaol([
      {label:'Hide a small blade in your clothes first', if:G => !G.flags.c3_inside, once:'c3_hide_blade', check:{skill:'sleight', dc:13,
        pass:{text:`You tuck it away where a quick search won't find it.`, set:{c3_hidden_blade:true}},
        fail:{text:`The guard's hand finds it. He drops it in the box with a long look at you.`, fn:sus(1)}}},
      {label:'Hand over your weapons and give your cover name', if:G => !G.flags.c3_inside, check:{skill:['deception','persuasion'], dc:11, adv:G => !!G.flags.c3_chaplain,
        pass:{text:G => `The guard finds your borrowed name on the list${G.flags.c3_chaplain ? ' and touches his cap to your robe' : ''}. "In you go."`, fn:G => stashWeapons(G, !!G.flags.c3_hidden_blade), set:{c3_inside:true}, go:'c3_yard'},
        fail:{text:`The guard frowns at the list, then at you. "Wasn't expecting a new face." He lets you in, but he'll remember you.`, fn:G => { stashWeapons(G, !!G.flags.c3_hidden_blade); sus(1)(G); }, set:{c3_inside:true}, go:'c3_yard'}}},
      {label:'Go into the gaol', if:G => !!G.flags.c3_inside, go:'c3_yard'},
      {label:'Collect your weapons and leave for now', if:G => !!G.flags.c3_inside && !G.flags.c3_silas_talked,
       fn:G => { returnWeapons(G); delete G.flags.c3_inside; delete G.flags.c3_hidden_blade; }, text:`You ride the barge back to Greywater. You can try again tomorrow.`, go:'c3_briefing'},
      {label:'Collect your weapons and walk out', if:G => !!G.flags.c3_silas_talked,
       fn:returnWeapons, text:`The guard hands back your gear without a glance. Behind you, the sea is already sliding over the far end of the causeway.`, go:'c3_escape'},
      {label:'Ride the barge back to Greywater', if:G => !G.flags.c3_inside, go:'c3_briefing'}
    ])
  },

  c3_yard:{
    chapter:3, title:'The Gaol Yard', short:'Gaol Yard', area:'gaol', rest:false,
    text:G => `Inside the wall, the old fort is all wet stone and gull cries. The lighthouse rises from the middle of the yard. Around it stand a squat chapel, a steaming wash house, the guard office with its shutters closed, and an iron grate over steps that lead down to the Tide Cells. Guards walk the wall in pairs. ` +
      (G.flags.c3_chaplain ? `A passing guard touches his cap to your robe.` : G.flags.c3_lamp ? `Nobody gives your apron a second look.` : `Nobody looks at you at all.`),
    back:`The gaol yard: chapel, wash house, guard office, lighthouse, and the grate over the Tide Cells.`,
    options:gaol([
      {label:'Go into the chapel', go:'c3_chapel'},
      {label:'Go into the wash house', go:'c3_wash'},
      {label:'Try the guard office', go:'c3_office'},
      {label:'Go to the lighthouse door', go:'c3_tower'},
      {label:'Go down to the Tide Cells', go:'c3_cells'},
      {label:'Go back to the gate', go:'c3_gate'}
    ])
  },

  c3_chapel:{
    chapter:3, title:'The Chapel of the Morning Light', short:'Chapel', area:'gaol', rest:'short',
    text:G => `A plain stone room with six benches and a round window of yellow glass. It is warmer than the yard. ` +
      (G.flags.c3_chaplain ? `The guard at the door tells you prisoners may ask for the chaplain until the bell.` : `It is empty and quiet, and nobody comes here unless they have to.`),
    back:`The chapel, quiet and yellow-lit.`,
    options:gaol([
      {label:'Ask for Number Forty, Silas Crane', if:G => !!G.flags.c3_chaplain && !G.flags.c3_met_silas && !G.flags.c3_holt_done, set:{c3_met_silas:true, c3_saw_holt:true},
       text:`A broad sergeant with a silver ring in one ear brings in an old man in grey, his hands chained. "Silas Crane. Number Forty," the sergeant says, and stays by the door. Silas looks at the sun on your robe, then at the sergeant, and says nothing at all. The sergeant's name tag reads HOLT.`},
      {label:'Watch Silas closely', if:G => !!G.flags.c3_met_silas && !G.flags.c3_silas_afraid, once:'c3_read_silas', check:{skill:'insight', dc:12,
        pass:{text:`His eyes go to the sergeant again and again. He isn't being stubborn. He's terrified of that man.`, set:{c3_silas_afraid:true, c3_suspect_holt:true}},
        fail:{text:`He's an old man who doesn't want to talk. That's all you can tell.`}}},
      {label:'Ask the sergeant for a private word with the prisoner', if:G => !!G.flags.c3_met_silas && !G.flags.c3_holt_done, once:'c3_private', check:{skill:'persuasion', dc:SUS_DC, adv:G => !!G.flags.c3_chaplain,
        pass:{text:`Holt shrugs and steps outside, leaving the door open a crack. Silas leans in. "Not here. Holt is the masked man's ear in this place. If I talk, I drown in my cell one night and nobody asks why. Prove what he is and get him gone, and I'll tell you everything."`, set:{c3_silas_afraid:true, c3_knows_holt:true, c3_suspect_holt:true}},
        fail:{text:`"Rules," Holt says, and doesn't move. Silas is led back down.`, fn:sus(1)}}},
      {label:'Kneel and pray for a moment', once:'c3_pray', give:{insp:true},
       text:`You kneel. The noise of gulls and guards fades. When you stand, your hands are steady.`},
      {label:'Go back to the yard', go:'c3_yard'}
    ])
  },

  c3_wash:{
    chapter:3, title:'The Wash House', short:'Wash House', area:'gaol', rest:false,
    text:G => `Steam rolls off great copper tubs. Two washerwomen with forearms like hams are wringing out prison greys. ` +
      (G.flags.c3_laundry || G.flags.c3_smock ? `The wash mistress shoves a basket at you. "Cells. Now."` : `They glance at you and go back to work.`),
    back:`The wash house, all steam and lye.`,
    options:gaol([
      {label:'Carry a basket of clean greys down to the Tide Cells', if:G => !!(G.flags.c3_laundry || G.flags.c3_smock), set:{c3_basket:true}, go:'c3_cells',
       text:`You heft the basket onto your hip and head for the grate. A guard lifts it for you without a word.`},
      {label:'Borrow a spare smock from the hook', if:G => !G.flags.c3_laundry && !G.flags.c3_smock, once:'c3_take_smock', check:{skill:'sleight', dc:11,
        pass:{text:`You shrug it on over your clothes. Now you are a laundry hand too.`, set:{c3_smock:true}},
        fail:{text:`"That's mine," one washerwoman says flatly. You hang it back up.`, fn:sus(1)}}},
      {label:'Listen to the washerwomen gossip', once:'c3_gossip', set:{c3_suspect_holt:true},
       text:`"Sergeant Holt's been spending silver again," one says. "New boots. A ring. On a sergeant's pay?" The other snorts. "Same every time. Fat purse after every visitor nobody's allowed to see."`},
      {label:'Go back to the yard', go:'c3_yard'}
    ])
  },

  c3_office:{
    chapter:3, title:'The Guard Office', short:'Guard Office', area:'gaol', rest:false,
    text:G => G.flags.c3_proof ? `The guard office. The clerk is still dozing over his ledger.` : `A cramped office of pegs, ledgers and wet oilskins. A clerk dozes at the desk over the duty roster. Behind him, a row of lockers stands against the wall, each marked with a name.`,
    options:gaol([
      {label:'Read the duty roster over the clerk\'s shoulder', once:'c3_roster', set:{c3_suspect_holt:true},
       text:`One name is on the Tide Cells every high tide for a month, and nobody else's: Sergeant Holt.`},
      {label:'Use the lamplighter\'s keys on the back door and search Holt\'s locker', if:G => !!G.flags.c3_lamp && !G.flags.c3_proof, set:{c3_proof:true}, give:{items:{holt_letter:1}},
       text:`One of the brass keys fits. Inside Holt's locker, under a spare shirt, is a tin box: twenty silver coins fresh from a northern mint, and a folded note sealed with black wax and a blank mask. <em>"If Forty talks, he drowns. The tide does the rest."</em>`},
      {label:'Ease past the clerk and search Holt\'s locker', if:G => !G.flags.c3_proof, check:{skill:['sleight','stealth'], dc:SUS_DC,
        pass:{text:`The clerk snores on. Inside Holt's locker, under a spare shirt, is a tin box: twenty silver coins fresh from a northern mint, and a folded note sealed with black wax and a blank mask. <em>"If Forty talks, he drowns. The tide does the rest."</em>`, set:{c3_proof:true}, give:{items:{holt_letter:1}}},
        fail:{text:`The clerk snaps awake. "Help you?" You mumble something and back out.`, fn:sus(1)}}},
      {label:'Go back to the yard', go:'c3_yard'}
    ])
  },

  c3_tower:{
    chapter:3, title:'The Lighthouse', short:'Lighthouse', area:'gaol', rest:false,
    text:G => G.flags.c3_lamp
      ? `Your brass key turns in the lighthouse door. A spiral stair climbs to the lamp room, where a great iron lantern waits beside a wall of glass. From up here you can see the whole gaol, the causeway, and the grey tide creeping in.`
      : `The lighthouse door is iron and locked. Above it, a gull watches you with great contempt.`,
    options:gaol([
      {label:'Light the great lamp early', if:G => !!G.flags.c3_lamp, once:'c3_lamp_lit', fn:sus(-2),
       text:`The wick catches with a roar and the lamp blazes out over the water. Every guard in the yard stops to stare up and argue about the hour. For a while, nobody is watching anyone.`},
      {label:'Study the yard from the top of the tower', if:G => !!G.flags.c3_lamp, once:'c3_tower_watch', set:{c3_suspect_holt:true},
       text:`From up here you watch Sergeant Holt cross to the water gate, take a small purse from a fisherman, and look around before he tucks it away.`},
      {label:'Pick the tower lock', if:G => !G.flags.c3_lamp && has('tools'), once:'c3_tower_pick', check:{skill:'sleight', dc:15,
        pass:{text:`The old lock gives. You climb to the lamp room and get a good look at the whole gaol before slipping back down.`, set:{c3_suspect_holt:true}},
        fail:{text:`The lock won't budge, and a guard on the wall is starting to stare.`, fn:sus(1)}}},
      {label:'Go back to the yard', go:'c3_yard'}
    ])
  },

  c3_cells:{
    chapter:3, title:'The Tide Cells', short:'Tide Cells', area:'gaol', rest:false,
    text:G => `Wet steps lead down into a long vault cut from the rock. Weed hangs from the ceiling. The cells along one wall are already ankle-deep in seawater; when the tide comes in, they will be full. In the last cell, an old man sits on a stone shelf with his knees drawn up: Silas Crane.` +
      (G.flags.c3_holt_done ? ` The guard at the far end is a young woman you haven't seen before. She is not watching you.` : ` Sergeant Holt leans against the far wall, a silver ring in one ear, cleaning his nails with a knife.`),
    back:G => G.flags.c3_holt_done ? `The Tide Cells. The water is rising. Silas waits.` : `The Tide Cells. The water is rising, and Sergeant Holt is watching.`,
    options:gaol([
      {label:'Whisper to Silas through the bars', if:G => !G.flags.c3_holt_done && !G.flags.c3_silas_afraid, once:'c3_whisper',
       check:{skill:['stealth','deception'], dc:SUS_DC, adv:G => !!G.flags.c3_basket,
        pass:{text:`You crouch by his bars while handing in clean greys. Silas barely moves his lips. "Holt is the masked man's ear here. If I talk, I drown in this cell one night and nobody asks why. Prove what he is and get him gone, and I'll tell you everything."`, set:{c3_silas_afraid:true, c3_knows_holt:true, c3_suspect_holt:true}},
        fail:{text:`"Laundry doesn't talk to prisoners," Holt says, pushing off the wall. You leave.`, fn:sus(1)}}},
      {label:'Show Holt the letter, somewhere quiet', if:G => !!G.flags.c3_proof && !G.flags.c3_holt_done, go:'c3_holt',
       text:`"A word, Sergeant," you say. "In the storeroom." Something in your voice makes him follow.`},
      {label:'Talk to Silas now that Holt is gone', if:G => !!G.flags.c3_holt_done && !G.flags.c3_silas_talked, go:'c3_silas'},
      {label:'Go back up to the yard', go:'c3_yard'}
    ])
  },

  c3_holt:{
    chapter:3, title:'The Storeroom', short:'Storeroom', area:'boss', rest:false,
    text:`Among barrels of salt fish, you hold up the note with its black seal. Holt's face goes still. His hand drifts toward the cudgel at his belt.
      <br><br>"You don't know what he is," he says quietly. "None of you do."`,
    back:`Sergeant Holt stands among the salt barrels, very still.`,
    options:[
      {label:'Take the letter to Governor Harrow', check:{skill:'persuasion', dc:13, adv:G => has('holt_letter'),
        pass:{text:G => `Governor Ilse Harrow reads the note twice, then calls for two guards. Holt doesn't fight. As they lead him away he looks back at you. "You'll wish you'd let it drown," he says. The governor gives you one long, thoughtful look, and does not ask what a ${COVER(G)} was doing in her storeroom.`,
          set:{c3_holt_done:true, c3_governor:true}, fn:G => { G.alert = Math.max(0, (G.alert || 0) - 2); }, give:{xp:150}, go:'c3_cells'},
        fail:{text:`"A note with no name on it proves nothing," the governor says coldly, "and forgery is something this gaol knows a great deal about." She sends you out. Holt smiles.`, fn:sus(2), go:'c3_yard'}}},
      {label:'Tell him to run while he still can', check:{skill:'intimidation', dc:14,
        pass:{text:`Holt goes grey. "He'll kill me." "Then run," you say. Within the hour, Sergeant Holt has taken a fishing boat and is gone over the water.`, set:{c3_holt_done:true}, give:{xp:150}, go:'c3_cells'},
        fail:{text:`Holt laughs, short and ugly, and pulls his cudgel. "Nobody leaves this storeroom."`,
          fight:{foes:[HOLT], noFlee:true, win:{text:`Holt slumps against the salt barrels. When the guards find him with the masked man's silver in his pocket, nobody asks many questions.`, set:{c3_holt_done:true}, go:'c3_cells'}}}}},
      {label:'Settle it here and now', fight:{foes:[HOLT], noFlee:true, win:{text:`Holt slumps against the salt barrels. When the guards find him with the masked man's silver in his pocket, nobody asks many questions.`, set:{c3_holt_done:true}, go:'c3_cells'}},
       text:`Holt swings first.`}
    ]
  },

  c3_silas:{
    chapter:3, title:'Silas Crane', short:'Silas Crane', area:'gaol', rest:false,
    onEnter:G => { if (!G.flags.c3_silas_talked){ G.flags.c3_silas_talked = true; give({xp:200}); } },
    text:`Silas grips the bars. The water is at his shins now. "Holt's gone? Then listen, because I'll say this once.
      <br><br>"I made that seal for a man called Aurek Vane. Tall, soft-spoken, smells of candle wax. He collects relics from the old north, and he told me he was looking for 'three suns.' He paid me to make him papers as a temple archivist, so he could walk into any shrine he liked." Silas swallows. "I made them good. If he's using them now, he'll be at the old ferry house in Greywater on the night of the new moon. He likes ferry houses. Nobody asks questions of a man waiting for a boat."`,
    back:`Silas sits on his stone shelf, the tide rising around him.`,
    options:gaol([
      {label:'Ask if there is anything he wants', once:'c3_ask_silas_want', set:{c3_nell:true},
       text:`"My granddaughter, Nell. She works the rope walk in Greywater. Tell her I'm sorry. That's all. Tell her I'm sorry."`},
      {label:'Promise to speak for him at his next hearing', once:'c3_promise', set:{c3_promise:true},
       text:`Silas looks at you for a long time. "Nobody has ever spoken for me," he says.`},
      {label:'Go, before the tide turns', go:'c3_gate', text:`The water is climbing the cell walls. You have to go now.`}
    ])
  },

  c3_lockdown:{
    chapter:3, title:'The Alarm Bell', short:'Alarm Bell', area:'boss', rest:false,
    text:`The bell in the lighthouse starts to clang. Doors slam all over the gaol. "Lock it down! Nobody leaves!" Two guards plant themselves between you and the gate. They are honest guards doing their jobs. You might want to strike to subdue.`,
    options:[
      {label:'Talk your way past them', check:{skill:['deception','persuasion'], dc:16, adv:G => !!(G.flags.c3_chaplain || G.flags.c3_governor),
        pass:{text:`"There's a fire in the wash house!" you shout, pointing. The guards run the wrong way. The bell keeps ringing, but nobody is between you and the gate.`, fn:G => { G.alert = 3; }, go:'c3_gate'},
        fail:{text:`"Nice try." They lower their spears.`, fight:{foes:['guard','guard'], flee:'c3_yard', win:{text:`You leave the guards groaning but alive. In the confusion of the bell, nobody stops you.`, fn:G => { G.alert = 3; }, go:'c3_gate'}}}}},
      {label:'Push past them', fight:{foes:['guard','guard'], flee:'c3_yard', win:{text:`You leave the guards groaning but alive. In the confusion of the bell, nobody stops you.`, fn:G => { G.alert = 3; }, go:'c3_gate'}}},
      {label:'Jump from the wall into the sea', if:G => !!G.flags.c3_silas_talked, check:{save:'con', dc:12,
        pass:{text:`You hit the cold water hard and swim for the causeway.`, fn:returnWeapons, go:'c3_escape'},
        fail:{text:`The cold knocks the breath out of you, but you make it to the causeway.`, damage:{dice:'2d6', type:'cold'}, fn:returnWeapons, go:'c3_escape'}}}
    ]
  },

  c3_escape:{
    chapter:3, title:'The Turning Tide', short:'Turning Tide', area:'wilds', rest:false,
    text:`The tide is turning. Water is already sliding across the far end of the causeway, and the barge has gone. Greywater's lights flicker on the far shore.`,
    options:[
      {label:'Run the causeway before it floods', check:{skill:['athletics','acrobatics'], dc:12,
        pass:{text:`You splash through ankle-deep water and reach the shore as the sea closes behind you.`, go:'c3_end'},
        fail:{text:`A wave knocks you flat and you swim the last stretch, coughing.`, damage:{dice:'1d6', type:'bludgeoning'}, go:'c3_end'}}},
      {label:'Ride home on the laundry barge', if:G => !!(G.flags.c3_laundry || G.flags.c3_smock), go:'c3_end',
       text:`You climb aboard among the baskets. Nobody counts laundry hands.`},
      {label:'Signal Captain Doyle\'s boat with a lantern', if:G => !!G.flags.c3_lamp, go:'c3_end',
       text:`You swing your lamp three times. A rowboat slips out of the dusk. Maren is at the oars.`}
    ]
  },

  c3_end:{
    chapter:3, title:'End of Chapter Three', short:'Chapter End', area:'town', rest:'both',
    onEnter:G => {
      returnWeapons(G);
      if (!G.flags.c3_done){ G.flags.c3_done = true; give({gold:100, xp:200}); }
    },
    text:`Back in her front room, Captain Doyle pours two cups of something strong. "Aurek Vane," she says, turning the name over. "A collector. A man who wants three suns." She pushes a purse of a hundred gold across the table. "The new moon is in six days. Whatever he is, he'll be at the ferry house. And so will we."
      <br><br><b>Chapter Three: The Saltreach Gaol is complete.</b>`,
    options:[
      {label:'Find Nell at the rope walk', if:G => !!G.flags.c3_nell, once:'c3_nell_visit', give:{insp:true, xp:50},
       text:`Nell Crane is twelve, sharp-eyed, and covered in hemp dust. When you tell her what her grandfather said, she is quiet for a long time. Then she says, "Tell him I'll write." You leave lighter than you came.`},
      {label:'Chapter Four: The Greywater Ferry', tag:'Coming soon',
       text:`This chapter has not been written yet. Builders: add story/chapter4.js and point this option at its first scene.`},
      {label:'Ride back up to Bramblewick', go:'bramblewick'}
    ]
  }
});
