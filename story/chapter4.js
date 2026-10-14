/* =====================================================================
   THORNVALE CHRONICLES : chapter4.js
   Chapter Four: The Greywater Ferry. An original investigation.
   Five days until the new moon, when Aurek Vane comes to the Greywater
   ferry house. Three leads, and not enough days to chase them all:
   * the Wailing House: a ghost whose holy staff was stolen
   * the Gallery: Greywater's rogues, banding together for Vane
   * the Jester: a killer who murders a noble every five days
   Most problems can be solved by talking, sneaking, tricking or fighting.
   Choices have consequences here and in Chapter Five.
   ===================================================================== */
'use strict';

/* ---------- helpers shared by Chapters Four and Five ---------- */
const withAlly = k => G => !!(G.ally && G.ally.key === k && G.ally.hp > 0);
const allyName = G => G.ally ? esc(G.ally.name) : '';
/* crime and the watch. heat_<place> runs 0 to 5. */
const crime = (place, n, why) => G => {
  const k = 'heat_' + place;
  G.flags[k] = clamp((G.flags[k] || 0) + n, 0, 5);
  log('bad', `${why || ''} The watch will hear about this. <b>Wanted ${G.flags[k]} of 5.</b>`);
};
const heat = (G, place) => G.flags['heat_' + place] || 0;
/* knocked out: weapons taken, wake somewhere else */
const knockOut = (dest, text) => ({text, fn:G => { stashWeapons(G, false); G.flags.ko_from = G.scene; log('bad', '<b>You are knocked out.</b>'); }, go:dest});

/* ---------- the five-day clock ---------- */
const c4day = G => G.flags.c4_day || 1;
function passDay(G, why){
  const d = c4day(G) + 1;
  G.flags.c4_day = Math.min(5, d);
  log('round', `Day ${G.flags.c4_day} of 5`);
  if (why) log('sys', why);
  if (d === 3 && !G.flags.faceless_lantern && !G.flags.c4_lantern_gone){
    G.flags.c4_lantern_gone = true;
    log('bad', 'News from upriver: the Lantern of Aldermere has been stolen from the Collegium vault. The thieves wore blank white masks.');
  }
  if (d === 4 && !G.flags.c4_gallery && !G.flags.c4_sunstone_gone){
    G.flags.c4_sunstone_gone = true;
    log('bad', 'A rider from Bramblewick: someone climbed into the old shrine last night and took the Sunstone. They left a painted tile behind.');
  }
  if (d >= 5) log('sys', '<b>Tonight is the new moon.</b>');
}
const passDayFn = why => G => passDay(G, why);
CHAPTER_LABEL_FN[4] = sc => `Chapter Four · The Greywater Ferry · Day ${c4day(G)} of 5${c4day(G) >= 5 ? ' · New moon tonight' : ''}`;

/* ---------- people who can travel with you ---------- */
Object.assign(ALLIES, {
  maren:{name:'Captain Maren Doyle', kind:'Retired Watch Captain', pr:'she', ac:15, hp:38,
    attack:{name:'Longsword', toHit:5, dmg:'1d8+3', type:'slashing'},
    rest:'rubs the stump of her arm and says nothing about it', guard:'a familiar gravelly voice barking at the crowd to give you air',
    desc:'Grey, one-armed, and forty years a river watch officer. The Greywater Watch still salutes her. With her beside you, watchmen give you the benefit of the doubt.'},
  silas:{name:'Silas Crane', kind:'Forger', pr:'he', ac:12, hp:22, keen:true,
    attack:{name:'Hidden Blade', toHit:4, dmg:'1d4+2', type:'piercing'},
    rest:'mutters about his knees and is ready again', guard:'a thin old hand patting your cheek and a very worried voice',
    desc:'Old, frightened, and very clever. Released into your custody after Holt was exposed. He knows every thief in Greywater and can spot a forged seal across a room. Sharp eyes: advantage on your Perception checks.'},
  wick:{name:'Wick', kind:'Thief', pr:'she', ac:13, hp:18, keen:true, multi:2,
    attack:{name:'Knife', toHit:4, dmg:'1d4+2', type:'piercing'},
    rest:'counts her fingers to check they are all still there', guard:'quick fingers working at your bonds and a whisper: "Up. Now. Quietly."',
    desc:'Seventeen, quick, and sorry. She stole the Dawnwarden Staff to pay her mother\'s debts to the Gallery. Two quick knife strikes a turn, and sharp eyes: advantage on your Perception checks.'}
});
ITEMS.dawnstaff = {name:'The Dawnwarden Staff', quest:true, desc:'White ash shod in bronze, with a cradle of bronze rays at the top. It can lift one of the old lights from its seat, or set it back.'};
ITEMS.aldreth_ring = {name:"Aldreth's Ring", quest:true, magic:true, save:1, desc:'A plain bronze ring stamped with a sunrise. Sister Aldreth gave it to you on a promise. +1 to saving throws, and she can find you through it.'};
ITEMS.jest_card = {name:"The Jester's Cards", quest:true, desc:'Hand-painted playing cards, each a grinning jester. Numbered One to Four, one for each dead noble. Card Five is missing.'};
ITEMS.gallery_tile = {name:'Painted Tile', quest:true, desc:'A small clay tile painted with a gold picture frame. Gallery members carry them.'};
ITEMS.vane_letter = {name:"Vane's Letter to Ivy", quest:true, desc:'"Bring the staff and the stone to the ferry house at the new moon. Every one of you will have a new face and a new name. The Faceless keeps his word." Sealed with a blank mask.'};

JOURNAL.push(
  {text:'Find out what Aurek Vane is bringing to the ferry house, and who is carrying it.', shown:G => !!G.flags.c4_begun, done:G => !!G.flags.c4_done},
  {text:'Answer the wailing ghost of the house on Gallows Hill.', shown:G => !!G.flags.c4_heard_wail, done:G => !!G.flags.c4_aldreth},
  {text:'Deal with the Gallery, Greywater\'s new gang.', shown:G => !!G.flags.c4_begun, done:G => !!G.flags.c4_gallery},
  {text:'Stop the jester before he kills again on the new moon.', shown:G => !!G.flags.c4_knows_jester, done:G => !!G.flags.c4_jester},
  {text:'Recover the Dawnwarden Staff.', shown:G => !!G.flags.c4_knows_staff, done:G => has('dawnstaff')},
  {text:'Be at the ferry house when the new moon rises.', shown:G => !!G.flags.c4_begun, done:G => !!G.flags.c4_done}
);
LORE.push(
  {when:G => G.flags.c4_knows_staff, text:'The Dawnwarden Staff can lift one of the three old lights from its seat, or set it back. Vane needs it.'},
  {when:G => G.flags.c4_hollow, text:'Under the river\'s end lies the Hollow, a darkness that offers every soul a new face. The Dawnwardens sealed it with three lights.'},
  {when:G => G.flags.c4_cards, text:'The jester kills a noble every five days. The fifth card is meant for the new moon.'},
  {when:G => G.flags.c4_victims, text:'Every murdered noble sat on the River Council, which keeps the old charters of Saltmouth at the river\'s end.'},
  {when:G => G.flags.c4_knows_cellar, text:'Old Tam says the ferry house has a hidden boat cellar under the floor.'},
  {when:G => G.flags.c4_vane_met, text:'Aurek Vane lost his wife and son to the river. He believes the Hollow will give everyone a new face, and no more grief.'}
);

/* the watch: patrols stop you when you are wanted */
const watchCheck = G => heat(G, 'gw') >= 2 && Math.random() < 0.2 + 0.15 * heat(G, 'gw');
const guarded = G => (id => { if (G.flags.c4_patrol_skip){ G.flags.c4_patrol_skip = false; return null; } if (watchCheck(G)){ G.flags.c4_dest = id; return 'c4_patrol'; } return null; });
const c4intercept = (G, id) => { if (G.flags.c4_patrol_skip){ G.flags.c4_patrol_skip = false; return null; } if (watchCheck(G)){ G.flags.c4_dest = id; return 'c4_patrol'; } return null; };

/* the unexpected helper when you are held captive */
function c4Helper(G){
  if (has('aldreth_ring')) return 'aldreth';
  if (G.flags.c4_wick === 'friend' || G.flags.c4_wick_kind) return 'wick';
  if (G.ally) return 'ally';
  return null;
}
const HELP_TEXT = {
  aldreth:G => `The bronze ring on your finger grows warm. Then cold. A grey shape steps out of the wall: Sister Aldreth, flickering like a candle. "You kept your word to me, so I keep mine." She touches the chains and the old iron simply gives up. "The way out is to your left. Go with God."`,
  wick:G => `A scrape at the grate. A thin face, a lock pick, and a whisper. "It's me. Wick. You were kind to me, and nobody's kind to me." The lock clicks. "I'll get your gear. Follow the cold air, it goes to the river."`,
  ally:G => `Paws, or boots, or both: ${allyName(G)} has tracked you here. ${G.ally.key === 'brindle' ? 'Brindle takes the guard\'s leg in his jaws, and the guard drops the keys.' : `${allyName(G)} knocks the guard flat and throws you the keys.`}`
};

/* ---------- random encounters in Greywater ---------- */
ENCOUNTERS.greywater = {name:'Greywater Streets', alert:false,
  rows:[
    {range:[1,4], label:'Hostile', pick:[
      {if:G => !!G.flags.c4_begun, text:`Three figures in grey robes step out of an alley, blank white masks catching the lamplight. "The Faceless sends his regards."`,
       fight:{tiers:{4:['cultist','cultist','cultist'], 6:[{key:'cult_fanatic', name:'Masked Preacher'}, 'cultist', 'cultist']}, rout:1, captive:'cultist_talk'}},
      {text:`A dockside brawl spills into the street, and somebody decides you started it.`,
       fight:{tiers:{4:['thug','bandit'], 6:['thug','thug']}, rout:1, captive:'bandit_talk', win:{fn:crime('gw', 1, 'You win the brawl, but the street saw.')}}}
    ]},
    {range:[5,8], label:'Trouble', pick:[
      {text:`A small hand slips toward your purse.`, check:{skill:'perception', dc:13,
        pass:{text:`You catch the wrist: a girl of about ten with a painted tile on a string around her neck. "The Gallery looks after us," she says, and wriggles free. "Nobody else does."`, set:{c4_gallery_kids:true}},
        fail:{text:`Your purse is lighter. You never even saw who.`, take:{gold:'2d6'}}}},
      {if:G => heat(G, 'gw') >= 1, text:`A watchman peers at you a little too long, then hurries off toward the Watch House.`, fn:G => { G.flags.heat_gw = Math.min(5, heat(G, 'gw') + 1); log('bad', `Wanted ${heat(G, 'gw')} of 5.`); }},
      {if:G => !!G.flags.c4_begun && !G.flags.c4_gallery, text:`Someone has been following you since the market.`, check:{skill:['stealth','perception'], dc:13,
        pass:{text:`You double back and lose your shadow in the fish stalls. A Gallery lookout, by the painted tile on her hat.`},
        fail:{text:`You never shake them. Whoever runs the Gallery now knows your face.`, set:{c4_spotted:true}}}}
    ]},
    {range:[9,15], label:'Quiet', pick:[
      {text:`Fog off the river. Somewhere a bell buoy clangs.`},
      {text:`A street crier calls the news: another lord dead, a jester's card in his hand. People cross the street to avoid the troupe's bright wagons.`},
      {text:`Watchmen nail up a notice: "Curfew at the new moon. By order of Sergeant Brask."`}
    ]},
    {range:[16,19], label:'Find', pick:[
      {text:`A coin purse floats in a horse trough.`, give:{gold:'2d6'}},
      {text:`A fishwife presses a hot pie into your hands. "You're the one who brought Jory home. Marta's boy. Go on, eat."`, give:{items:{ration:1}, insp:true}}
    ]},
    {range:[20,20], label:'Blessing', pick:[{text:`The fog lifts for a moment, and the river runs gold in the sun.`, give:{insp:true}}]}
  ]};
AREA_NAME.greywater = 'Greywater';
AREA_COVER.greywater = 'some'; AREA_COVER.gallery = 'lots'; AREA_COVER.hill = 'some'; AREA_COVER.ferry = 'some';

/* ---------- monsters for this chapter ---------- */
MONSTERS.vane = {name:'Aurek Vane', ac:15, hp:52, xp:1100, pp:12, init:2, type:'humanoid', special:[], shieldUses:2,
  save:{str:-1,dex:2,con:1,int:6,wis:4,cha:2}, attack:{name:'Shadow Bolt', toHit:6, dmg:'2d8', type:'necrotic'},
  actions:[{w:3, strikes:[{name:'Shadow Bolt', toHit:6, dmg:'2d8', type:'necrotic', spell:true}]},
           {w:1, strikes:[{name:'Magic Missile', missile:3, dmg:'1d4+1', type:'force', uses:2}]},
           {w:1, strikes:[{name:'Grasp of the Hollow', save:'wis', dc:14, dmg:'3d6', type:'psychic', half:true, uses:2}]}],
  desc:'A scholar in an archivist\'s grey coat whose face is hidden by a blank white mask. Original villain.'};
MONSTERS.ghost_shade = {name:"Aldreth's Shade", ac:12, hp:30, xp:450, pp:11, init:2, type:'undead', special:['undead'], immune:['necrotic','poison'],
  resist:['acid','cold','fire','lightning','thunder'], resistMundane:['bludgeoning','piercing','slashing'],
  save:{str:-2,dex:2,con:0,int:0,wis:1,cha:3}, attack:{name:'Withering Touch', toHit:5, dmg:'3d6+2', type:'necrotic'},
  desc:'The wrathful ghost of a Dawnwarden sister.'};

Object.assign(STORY, {
  /* ===================== CHAPTER FOUR: THE GREYWATER FERRY ===================== */
  c4_start:{
    chapter:4, title:'Captain Doyle\'s House, Greywater', short:'Captain Doyle', area:'town', rest:'both',
    onEnter:G => { G.flags.c4_begun = true; if (!G.flags.c4_day) G.flags.c4_day = 1; },
    text:G => `Rain on the windows of the narrow house on Rope Street. Captain Maren Doyle has pinned a map of Greywater to the wall and stuck it full of pins.
      <br><br>"Five nights to the new moon," she says. "Then Aurek Vane comes to the ferry house. If we just sit there waiting, he'll smell it. We need to know what he's coming for, and who's bringing it to him." She taps three pins in turn. "And Greywater's gone strange this month. Three things. I don't believe in coincidence."${G.flags.c3_holt_done && G.flags.c3_silas_talked ? `<br><br>In the corner, wrapped in a blanket, sits Silas Crane. "They let me out," he says, as if he still can't believe it. "Into your custody, apparently. Lord help you."` : ''}`,
    back:`Captain Doyle's front room. The map on the wall has more pins in it every time you come back.`,
    options:[
      {label:'Ask about the house on Gallows Hill', once:'c4_ask_house', set:{c4_heard_wail:true},
       text:`"Millbrook, half a day upriver. A house appeared on Gallows Hill a week ago. Stone, old, mossy. It wasn't there before. Something inside wails all night about a thief. The villagers won't go near it."`},
      {label:'Ask about the Gallery', once:'c4_ask_gallery',
       text:`"Every thief, beggar and smuggler in Greywater, under one roof, in the old fish market. They call themselves the Gallery. They've stopped fighting each other, which frightens me more than anything. Sergeant Brask wants to burn them out. Brask is not a subtle man."`},
      {label:'Ask about the murdered nobles', once:'c4_ask_murders', set:{c4_knows_jester:true},
       text:`"Four lords and ladies dead in twenty days, one every five days. Poison, and each with a painted jester card in their hand. The Merry Lanterns troupe is in town with a jester who's very popular. That's not evidence. That's a feeling."<br><br>She looks at the calendar. "Five days from the last one is the new moon."`},
      {label:'Ask what Vane could want in Greywater', once:'c4_ask_why',
       text:`"The Sunstone was the first of three old lights, your Hesta told us. Silas says Vane wants all three. Greywater has none. But Greywater has the ferry, and the ferry goes to the river's end."`},
      {label:'Ask Silas what he knows', if:G => !!G.flags.c3_holt_done && !!G.flags.c3_silas_talked, once:'c4_ask_silas', set:{c4_silas_ivy:true},
       text:`"The Gallery is Ivy Corrow's doing. She bought seals from me for years. Paints like an angel, steals like a magpie. If Vane has promised her something, it's something she wants badly. Everyone wants something badly."`},
      {label:'Ask Captain Doyle to come with you', tag:'Companion', if:G => !withAlly('maren')(G) && !G.flags.c4_maren_asked, set:{c4_maren_asked:true},
       fn:G => joinAlly('maren'),
       text:`Maren pulls on her old watch coat one-handed. "I was hoping you'd ask. The watch still listens to me. Mostly."`},
      {label:'Take Silas Crane along', tag:'Companion', if:G => !!G.flags.c3_holt_done && !!G.flags.c3_silas_talked && !withAlly('silas')(G) && !G.flags.c4_silas_asked, set:{c4_silas_asked:true},
       fn:G => joinAlly('silas'),
       text:`Silas sighs. "Prison was quieter." But he finds his hat.`},
      {label:'Go out into Greywater', go:'c4_cross'}
    ]
  },
  c4_cross:{
    chapter:4, title:'Greywater Market Cross', short:'Market Cross', area:'greywater', rest:'short', intercept:c4intercept,
    text:`Greywater's market cross: a stone pillar where four muddy streets meet, crowded with fish stalls, rope sellers, and gossip. The Watch House squats on one corner. Down by the river, the old fish market sits shuttered and silent. On the green, the bright wagons of the Merry Lanterns troupe are drawn up in a ring.`,
    back:G => `The market cross. ${c4day(G) >= 5 ? 'The light is going. Tonight is the new moon.' : `Day ${c4day(G)} of 5. People talk about the murders in low voices.`}`,
    options:[
      {label:'The Watch House', go:'c4_watch'},
      {label:'The old fish market (the Gallery)', if:G => !G.flags.c4_gallery, go:'c4_fish_front'},
      {label:'Penrose House, where the last lord died', if:G => !!G.flags.c4_knows_jester, go:'c4_penrose'},
      {label:'The Merry Lanterns on the green', if:G => !!G.flags.c4_knows_jester && !G.flags.c4_jester, go:'c4_green'},
      {label:'Take the river path to Millbrook and Gallows Hill', tag:'Takes a day', if:G => !G.flags.c4_aldreth && c4day(G) < 5, go:'c4_mill'},
      {label:'Look over the ferry house by daylight', if:G => c4day(G) < 5, go:'c4_ferry_day'},
      {label:'Pick a pocket in the market crowd', tag:'Crime', if:G => c4day(G) < 5, check:{skill:'sleight', dc:14,
        pass:{text:`A merchant's purse slides into your sleeve. Nobody notices.`, give:{gold:'3d6'}},
        fail:{text:`"Thief!" A hand grabs your arm. You twist free and run, but people saw your face.`, fn:crime('gw', 2, 'Caught red-handed.')}}},
      {label:"Marta's shop, the Quill and Mortar", go:'c1_greywater'},
      {label:"Back to Captain Doyle's house", go:'c4_start'},
      {label:'Wait for the new moon', tag:G => `Skips ${5 - c4day(G)} day${5 - c4day(G) === 1 ? '' : 's'}`, if:G => c4day(G) < 5,
       fn:G => { while (c4day(G) < 5) passDay(G); }, text:`You let the days go by.`},
      {label:'Go to the ferry house: the new moon is rising', tag:'Finale', if:G => c4day(G) >= 5 && !G.flags.c4_done, go:'c4_night'}
    ]
  },

  /* ---------- the watch ---------- */
  c4_watch:{
    chapter:4, title:'The Greywater Watch House', short:'Watch House', area:'town', rest:false,
    text:`A squat stone building with barred windows and a smell of wet wool. Sergeant Odo Brask is built like a barrel and has a voice like one being rolled downhill. "Doyle's friend. Hm. If you're here about the Gallery, I've got twenty men and a lot of lamp oil, and I'm waiting for an excuse."`,
    back:`The Watch House. Brask glowers over a stack of reports.`,
    options:[
      {label:'Ask Brask about the Gallery', stay:true, once:'c4_brask_gallery',
       text:`"Rats in a barrel. Thieves, beggars, smugglers, and kids. Ivy Corrow tells them they're an art collection. I say they're a fire hazard." He leans in. "Help me raid it and I'll owe you."`},
      {label:'Ask Brask about the murders', stay:true, once:'c4_brask_murders',
       text:`"Poison, every one. I've arrested two cooks and a wine merchant. Wasn't them. The jester's got an alibi every time: he's onstage when they die." Brask scowls. "Poison doesn't need you there when it works."`},
      {label:'Ask Brask to grant the Gallery amnesty', tag:'Ivy\'s terms', if:G => !!G.flags.c4_ivy_terms && !G.flags.c4_amnesty, check:{skill:'persuasion', dc:15, adv:G => withAlly('maren')(G),
        pass:{text:`Brask chews his moustache for a long, painful minute. "If they give back what they stole and stay off the docks, I'll stop the sweeps. One season. Then we see." He signs the paper. "Doyle better be right about you."`, set:{c4_amnesty:true}},
        fail:{text:`"Amnesty? For Ivy Corrow? I'd sooner pardon the river for drowning people." Maybe someone he respects could change his mind.`}}},
      {label:'Ask Captain Doyle to lean on Brask', if:G => !!G.flags.c4_ivy_terms && !G.flags.c4_amnesty && !withAlly('maren')(G) && !G.flags.c4_doyle_lean, set:{c4_doyle_lean:true},
       text:`You fetch Doyle. She and Brask shout at each other for a quarter of an hour behind a closed door. When she comes out, she hands you a signed paper. "One season's amnesty. He'll hate me till spring."`, fn:G => { G.flags.c4_amnesty = true; }},
      {label:'Tell Brask to raid the Gallery tonight, with you', tag:'Fight', if:G => !G.flags.c4_gallery, go:'c4_raid'},
      {label:'Bring Brask the evidence against the jester', tag:'No fight', if:G => !!G.flags.c4_proof_jester && !G.flags.c4_jester,
       set:{c4_jester:'caught'}, give:{xp:300},
       text:`Brask reads the poisoner's recipe, the wine merchant's receipt, and the fifth card with Lady Fell's name on the back. He goes very quiet. Then he takes six men to the green. The jester is in irons before supper, still smiling. "Wasn't me," he says. "It was the Faceless. Ask him."`},
      {label:'Pay off what you owe the watch', tag:G => `${heat(G, 'gw') * 15} gp`, if:G => heat(G, 'gw') > 0 && G.char.gold >= heat(G, 'gw') * 15,
       fn:G => { G.char.gold -= heat(G, 'gw') * 15; G.flags.heat_gw = 0; }, text:`Brask counts the fine twice. "We're square. Don't make me regret it."`},
      {label:'Turn yourself in', if:G => heat(G, 'gw') > 0, go:'c4_cells', text:`Brask raises an eyebrow and opens a cell door.`},
      {label:'Back to the market cross', go:'c4_cross'}
    ]
  },
  c4_patrol:{
    chapter:4, title:'Stopped by the Watch', short:'Watch Patrol', area:'town', rest:false,
    text:G => `"You. Stop right there." Three watchmen in wet oilskins block the street, clubs out. ${heat(G, 'gw') >= 4 ? 'One of them has your face on a handbill.' : 'One of them is checking a list.'}`,
    options:[
      {label:'Let Captain Doyle handle it', if:withAlly('maren'), fn:G => { G.flags.heat_gw = Math.max(0, heat(G, 'gw') - 2); G.flags.c4_patrol_skip = true; },
       text:`Maren steps forward. "Lads." They straighten up like boys caught smoking. "This one's with me." They let you pass, and the list goes back into a pocket.`, go:G => G.flags.c4_dest || 'c4_cross'},
      {label:'Talk your way out', check:{skill:['persuasion','deception'], dc:G => 10 + 2 * heat(G, 'gw'),
        pass:{text:`It was a misunderstanding, you were never there, and anyway you're Captain Doyle's friend. They let you go with a warning.`, fn:G => { G.flags.heat_gw = Math.max(0, heat(G, 'gw') - 1); G.flags.c4_patrol_skip = true; }, go:G => G.flags.c4_dest || 'c4_cross'},
        fail:{text:`"Save it for Brask." They close in.`, go:'c4_cells'}}},
      {label:'Pay the fine on the spot', tag:G => `${heat(G, 'gw') * 10} gp`, if:G => G.char.gold >= heat(G, 'gw') * 10,
       fn:G => { G.char.gold -= heat(G, 'gw') * 10; G.flags.heat_gw = 0; G.flags.c4_patrol_skip = true; },
       text:`The coins vanish into a watchman's glove. "Fine paid. Mind yourself."`, go:G => G.flags.c4_dest || 'c4_cross'},
      {label:'Come quietly', go:'c4_cells', text:`You hold out your wrists.`},
      {label:'Run for it', check:{skill:['athletics','acrobatics'], dc:G => 12 + heat(G, 'gw'),
        pass:{text:`Over a fish barrow, through a laundry, across a roof. You lose them.`, fn:G => { G.flags.heat_gw = Math.min(5, heat(G, 'gw') + 1); G.flags.c4_patrol_skip = true; }, go:G => G.flags.c4_dest || 'c4_cross'},
        fail:{text:`A club catches the back of your knees. You go down in the mud.`, go:'c4_cells'}}},
      {label:'Fight them', tag:'Outlaw',
       fight:{foes:['guard','guard',{key:'guard', name:'Watch Corporal', hp:20}], flee:'c4_cross',
         win:{fn:G => { G.flags.heat_gw = 5; G.flags.c4_outlaw = true; }, text:`The watchmen lie groaning in the street. You have just become an outlaw in Greywater. Doyle will hear of it.`, go:'c4_cross'}}}
    ]
  },
  c4_cells:{
    chapter:4, title:'The Watch House Cells', short:'Cells', area:'town', rest:false,
    onEnter:G => { stashWeapons(G, false); },
    text:`Straw, a bucket, and a barred window too small for a cat. In the next cell, an old man in a ferryman's coat is snoring off a bottle.`,
    back:`The cell. The straw has not improved.`,
    options:[
      {label:'Talk to the old ferryman', once:'c4_tam_cell', set:{c4_knows_cellar:true, c4_met_tam:true},
       text:`He wakes with a snort. "Tam. Ferryman. Forty years. Fella paid me silver to stay drunk in here till after the new moon, so I wouldn't be at my own ferry house." He taps his nose. "He don't know about the boat cellar, though. Trapdoor under the rug by the stove. You could hide a cow down there."`},
      {label:'Wait for morning', tag:'Takes a day',
       fn:G => { passDay(G, 'A night in the cells.'); G.flags.heat_gw = G.flags.c4_outlaw ? 3 : 0; returnWeapons(G); },
       text:G => G.flags.c4_outlaw ? `In the morning Doyle comes, grim-faced, and talks to Brask for an hour. You are let out "pending inquiry." Doyle doesn't speak to you on the way out.` : `In the morning a yawning watchman unlocks the door. "Fine's waived. Captain Doyle vouched for you. Again."`, go:'c4_cross'},
      {label:'Bribe the jailer', tag:'30 gp', if:G => G.char.gold >= 30, take:{gold:30},
       fn:G => { G.flags.heat_gw = Math.max(0, heat(G, 'gw') - 1); returnWeapons(G); },
       text:`The jailer finds he has left the door unlocked. Also your weapons are on the table. What a coincidence.`, go:'c4_cross'},
      {label:'Pick the lock with a bent spoon', tag:'Crime', check:{skill:'sleight', dc:15,
        pass:{text:`Click. You take your weapons from the rack and slip out the yard door.`, fn:G => { returnWeapons(G); crime('gw', 1, 'Escaping custody.')(G); G.flags.c4_patrol_skip = true; }, go:'c4_cross'},
        fail:{text:`The spoon snaps. The jailer laughs at you.`}}}
    ]
  },
  c4_raid:{
    chapter:4, title:'Raid on the Fish Market', short:'The Raid', area:'gallery', rest:false,
    text:`Brask's watchmen hit the fish market doors with a ram at midnight, and the Gallery fights back with knives, bottles and fury. In the smoke you see children running. In the middle of it all, Ivy Corrow stands on a crate with a rapier in one hand and a paintbrush behind her ear.`,
    options:[
      {label:'Get the children out first', once:'c4_raid_kids', check:{skill:['athletics','persuasion'], dc:13,
        pass:{text:`You herd a dozen children out the back into the arms of a startled fishwife. One of them is a skinny girl of seventeen who looks back at you: Wick.`, set:{c4_wick_kind:true}, give:{xp:100}},
        fail:{text:`The smoke is too thick. You get some of them out. Not all.`, set:{c4_raid_bad:true}}}},
      {label:'Go for Ivy Corrow', tag:'Boss',
       fight:{foes:[{key:'bandit_captain', name:'Ivy Corrow', hp:40, boss:true}, {key:'bandit', name:'Bones Hallam', hp:16}], weaken:0.8, captive:'bandit_talk', flee:'c4_cross',
         win:{set:{c4_gallery:'broken', c4_knows_staff:true}, give:{items:{dawnstaff:1, vane_letter:1}}, fn:G => { passDay(G, 'The raid takes all night.'); if (G.flags.c4_sunstone_gone) G.flags.c4_sunstone_back = true; },
              text:G => `Brask's men drag Ivy away in chains. In her strongroom you find a bronze-shod staff wrapped in sailcloth, and a letter sealed with a blank mask.${G.flags.c4_raid_bad ? ' Brask counts the bodies. Some are small. He does not look at you.' : ''}`, go:'c4_cross'}}}
    ]
  },

  /* ---------- the Wailing House (Thief) ---------- */
  c4_mill:{
    chapter:4, title:'Millbrook, under Gallows Hill', short:'Millbrook', area:'hill', rest:'short',
    onEnter:G => { G.flags.c4_heard_wail = true; },
    text:`Millbrook is six houses, a mill, and a lot of locked doors. On the bare hill above it stands a stone house that looks four hundred years old and a week new. From inside comes a long, thin wail. "Thief. Thief. Thief."`,
    back:`Millbrook. The wailing on the hill rises and falls.`,
    options:[
      {label:'Talk to the miller\'s widow, Hennick', once:'c4_hennick', set:{c4_knows_aldreth:true},
       text:`Old Hennick doesn't open her door more than a crack. "My gran said a holy sister was buried on that hill, long ago, before Millbrook. A Dawnwarden. They said if her rest was ever broken, her house would come back to look for whoever broke it." She shudders. "A girl came through last week, quick and pale, with a long bundle. She was running."`},
      {label:'Climb Gallows Hill to the house', go:'c4_wail_hall'},
      {label:'Head back to Greywater', tag:'Takes a day', fn:passDayFn('A day on the river path.'), go:'c4_cross'}
    ]
  },
  c4_wail_hall:{
    chapter:4, title:'The Wailing House', short:'Wailing House', area:'crypt', rest:false,
    text:G => G.flags.c4_aldreth === 'promised' ? `The house is quiet now. Sunlight comes through the dusty windows, and somewhere a sparrow is nesting.` : `Inside, dust and candle stubs and a cold that gets into your teeth. A woman made of grey light stands at the top of the cellar stair in a Dawnwarden's tabard, and her face is all grief. "THIEF," she screams, and every window shatters. Then she sees you properly. "You are not her. Who are you?"`,
    back:G => G.flags.c4_aldreth ? `The Wailing House is silent.` : `The ghost of the Dawnwarden sister drifts at the top of the cellar stair, watching you.`,
    options:[
      {label:'Kneel and pray for her rest', if:G => !G.flags.c4_aldreth && !G.flags.c4_ghost_calm, check:{skill:['religion','persuasion'], dc:13, adv:G => withAlly('tamsin')(G),
        pass:{text:`You pray the old prayer for the departed. The wailing stops. The ghost kneels opposite you, a woman of maybe thirty with a soldier's hands. "I am Aldreth, sister of the Dawn. Three hundred years I have kept that staff. Now it is gone, and I cannot rest until it is home."`, set:{c4_ghost_calm:true, c4_knows_aldreth:true}},
        fail:{text:`The ghost howls and the cold bites. You lose your nerve and your breath.`, damage:{dice:'2d6', type:'necrotic', save:{ability:'wis', dc:13, half:true}}}}},
      {label:'Hold up your holy symbol and command her to speak', if:G => !G.flags.c4_aldreth && !G.flags.c4_ghost_calm && (has('symbol') || G.char.cls === 'cleric'), set:{c4_ghost_calm:true, c4_knows_aldreth:true},
       text:`The sun on your symbol flares. The ghost flinches, then looks at it with longing. "A sister of the light. Or a brother. Then hear me. I am Aldreth, and my staff is stolen."`},
      {label:'Ask Aldreth what was stolen', if:G => !!G.flags.c4_ghost_calm && !G.flags.c4_ask_staff, set:{c4_ask_staff:true, c4_knows_staff:true}, stay:true,
       text:`"The Dawnwarden Staff. With it we carried the three lights to their seats, and set them there to hold the Hollow shut. It can lift a light from its seat, or set one back. In the wrong hands, it is a key to the worst door in the world."`},
      {label:'Ask about the Hollow', if:G => !!G.flags.c4_ask_staff && !G.flags.c4_hollow, set:{c4_hollow:true}, stay:true,
       text:`"Under the river's end there is a place where the world is thin. Something waits there that speaks very kindly. It offers every soul a new face: no grief, no guilt, no name. Those who take its offer become nothing at all. We sealed it with three lights: the Sunstone, the Lantern, and the Tidelamp of Saltmouth."`},
      {label:'Ask about the thief', if:G => !!G.flags.c4_ghost_calm && !G.flags.c4_ask_thief, set:{c4_ask_thief:true}, stay:true,
       text:`"A girl. Quick hands, frightened eyes. She cut herself on my stair and wept while she did it. She carried a little painted tile with a golden frame on it." Aldreth looks at you. "She did not want to do it. Someone made her."`},
      {label:'Promise to bring the staff home', if:G => !!G.flags.c4_ask_staff && !G.flags.c4_aldreth,
       set:{c4_aldreth:'promised'}, give:{items:{aldreth_ring:1}, xp:200},
       text:`Aldreth draws a bronze ring from her own ghostly finger, and it is solid when it falls into your palm. "A promise for a promise. Wear it, and I will know where you are. If you are ever in the dark and need me, I will come." The house sighs, and for the first time in three hundred years it is only a house.`},
      {label:'Draw your weapon and banish the ghost', tag:'Fight', if:G => !G.flags.c4_aldreth,
       fight:{foes:[{key:'ghost_shade', name:"Aldreth's Shade", boss:true}], flee:'c4_mill',
         win:{set:{c4_aldreth:'banished'}, text:`The ghost comes apart like smoke in the wind with one last wail. The house is silent. You have a feeling you have made an enemy of something holy, and lost a friend you never met.`}}},
      {label:'Go down to the basement tomb', go:'c4_wail_tomb'},
      {label:'Leave the house', go:'c4_mill'}
    ]
  },
  c4_wail_tomb:{
    chapter:4, title:"Aldreth's Tomb", short:'Basement Tomb', area:'crypt', rest:false,
    text:`A low vault under the house. A stone coffin, a sunburst carved on the lid, and an empty bronze cradle on the wall where a staff once hung. The floor is tiled with faded sunrises. There are drops of old blood on the stair, and footprints in the dust that weave strangely, as if the thief knew where not to step.`,
    back:`The tomb. The empty bronze cradle on the wall.`,
    options:[
      {label:'Search the floor for traps', if:G => !G.flags.c4_tomb_found && !G.flags.c4_tomb_safe, check:{skill:['investigation','perception'], dc:14,
        pass:{text:`There: every third sunrise tile has a hairline crack around it. Pressure plates. The thief stepped only on the plain tiles.`, set:{c4_tomb_found:true}},
        fail:{text:`Old tiles, old dust. Nothing you can see.`, set:{c4_tomb_looked:true}}}},
      {label:'Follow the thief\'s footprints exactly', if:G => !G.flags.c4_tomb_safe, check:{skill:['survival','acrobatics'], dc:G => G.flags.c4_tomb_found ? 10 : 13,
        pass:{text:`Step, step, long step. You reach the coffin without a sound.`, set:{c4_tomb_safe:true}},
        fail:{text:`Your heel comes down on a sunrise tile. Light blazes up from the floor.`, set:{c4_tomb_safe:true}, damage:{dice:'3d8', type:'radiant', save:{ability:'dex', dc:13, half:true}}}}},
      {label:'Jam the plates with your dagger and walk across', if:G => !!G.flags.c4_tomb_found && !G.flags.c4_tomb_safe && (has('tools') || has('w_dagger')), check:{skill:'sleight', dc:12,
        pass:{text:`You wedge each plate. Not one fires.`, set:{c4_tomb_safe:true}, give:{xp:50}},
        fail:{text:`The blade slips. Light blazes up.`, set:{c4_tomb_safe:true}, damage:{dice:'3d8', type:'radiant', save:{ability:'dex', dc:13, half:true}}}}},
      {label:'Search around the coffin', if:G => !!G.flags.c4_tomb_safe && !G.flags.c4_tomb_searched, set:{c4_tomb_searched:true, c4_knows_tile:true},
       give:{items:{gallery_tile:1}}, text:`Wedged between the coffin and the wall: a little clay tile painted with a golden picture frame, dropped in a hurry. Every Gallery member in Greywater carries one.`},
      {label:'Climb back up', go:'c4_wail_hall'}
    ]
  },

  /* ---------- the Gallery (Gallery of Rogues) ---------- */
  c4_fish_front:{
    chapter:4, title:'The Old Fish Market', short:'Fish Market', area:'greywater', rest:false, intercept:c4intercept,
    text:G => `A great shuttered hall on stilts over the river, its boards silver with age. A boy with a painted tile on a string lounges by the side door, watching the street.${G.flags.c4_spotted ? ' He watches you in particular.' : ''} On the river side, a loading door hangs just above the water.`,
    back:`The old fish market. The lookout boy is still there.`,
    options:[
      {label:'Show the lookout your painted tile', if:G => has('gallery_tile'), check:{skill:'deception', dc:G => G.flags.c4_spotted ? 14 : 10,
        pass:{text:`He looks at the tile, then at you. "New, are you? Mind the third stair." He lets you in.`, set:{c4_in_gallery:true}, go:'c4_gallery_hall'},
        fail:{text:`"That's Wick's tile. Where'd you get Wick's tile?" He whistles, and the door slams.`, set:{c4_spotted:true}}}},
      {label:'Let Silas talk to the lookout', if:withAlly('silas'), set:{c4_in_gallery:true},
       text:`Silas takes off his hat. The boy's eyes go wide. "Old Crane! They said you were dead." "Nearly, lad. Tell Ivy an old friend is calling." The door opens.`, go:'c4_gallery_hall'},
      {label:'Talk your way in as a recruit', if:G => !has('gallery_tile') && !withAlly('silas')(G), check:{skill:['deception','persuasion'], dc:G => G.flags.c4_spotted ? 17 : 15,
        pass:{text:`You tell a good story about a debt and a sheriff. The boy believes you. "Mind the third stair."`, set:{c4_in_gallery:true}, go:'c4_gallery_hall'},
        fail:{text:`"Don't know you." The door shuts. Behind it, someone laughs.`, set:{c4_spotted:true}}}},
      {label:'Climb in through the river door', tag:'Sneak', go:'c4_gallery_cellar'},
      {label:'Back to the market cross', go:'c4_cross'}
    ]
  },
  c4_gallery_cellar:{
    chapter:4, title:'Under the Fish Market', short:'Fish Market Cellar', area:'gallery', rest:false,
    text:`You haul yourself up through the river door into a low, dark cellar that smells of brine and old fish. Crates. A stair going up. A faint sweetness in the air, like rotten flowers.`,
    back:`The cellar under the fish market, sweet-smelling and dark.`,
    options:[
      {label:'Check the stair before you climb', if:G => !G.flags.c4_gas_found && !G.flags.c4_gas_safe, check:{skill:['perception','investigation'], dc:15,
        pass:{text:`A clay jar wedged under the third stair, with a thread tied to a stopper. Step there and it breaks. The sweet smell is poppy-gas: enough to drop a horse.`, set:{c4_gas_found:true}},
        fail:{text:`It looks like an ordinary stair.`, set:{c4_gas_looked:true}}}},
      {label:'Cut the thread and lift the jar out', if:G => !!G.flags.c4_gas_found && !G.flags.c4_gas_safe, check:{skill:'sleight', dc:12,
        pass:{text:`Slowly. Slowly. The jar comes free, stopper still in. You set it aside. That might come in useful.`, set:{c4_gas_safe:true, c4_gas_jar:true}, give:{xp:50}},
        fail:{text:`The stopper pops.`, ...knockOut('c4_held', `Sweet grey vapor rolls over you. The cellar tilts, and the floor comes up to meet you.`)}}},
      {label:'Climb the stair', if:G => !G.flags.c4_gas_safe && !G.flags.c4_gas_found,
       check:{save:'con', dc:13,
         pass:{text:`A jar cracks under your foot and sweet grey vapor puffs up. You hold your breath and stagger up the stairs, eyes streaming, still on your feet.`, set:{c4_gas_safe:true, c4_in_gallery:true}, go:'c4_gallery_hall'},
         fail:knockOut('c4_held', `A jar cracks under the third stair. Sweet grey vapor rolls up around you. You take one breath too many, and the world goes soft and dark.`)}},
      {label:'Climb the stair, stepping over the third step', if:G => !!G.flags.c4_gas_found || !!G.flags.c4_gas_safe, set:{c4_in_gallery:true}, go:'c4_gallery_hall',
       text:`You come up through a trapdoor behind a curtain. Nobody saw you arrive.`},
      {label:'Drop back into the river', go:'c4_fish_front'}
    ]
  },
  c4_gallery_hall:{
    chapter:4, title:'The Gallery', short:'The Gallery', area:'gallery', rest:false,
    text:G => `The old fish hall has been turned into something strange and beautiful: dozens of portraits hang on the walls, each of a thief, beggar or smuggler, painted with care and dignity, like lords and ladies. Forty people eat, play dice, mend clothes. Children run between the tables.
      <br><br>At the far end, on a fish-scale throne, sits a woman with grey-streaked red hair and paint on her fingers: Ivy Corrow. "Visitors," she says. "How lovely. Nobody visits us except the watch, and they never stay for dinner."${G.flags.c4_sunstone_gone ? ' On a table behind her, under a cloth, something glows like a sunrise.' : ''}`,
    back:G => G.flags.c4_gallery ? `The Gallery is quiet now.` : `The Gallery: portraits, dice, children, and Ivy Corrow on her throne.`,
    options:[
      {label:'Ask Ivy why she paints them all', if:G => !G.flags.c4_gallery, stay:true, once:'c4_ivy_why',
       text:`"Because nobody else will. Every person in this room was a nobody to Greywater. Here, they hang on the wall." She smiles. "And because a man in a white mask has promised them all new faces. New names. No debts, no warrants, no past. A clean start. Wouldn't you take it?"`},
      {label:'Tell Ivy what the Hollow really offers', if:G => !G.flags.c4_gallery && !!G.flags.c4_hollow && !G.flags.c4_ivy_doubt, check:{skill:['persuasion','insight'], dc:14, adv:G => has('aldreth_ring'),
        pass:{text:`You tell her: no new face, just no face. Not a fresh start; an ending. Ivy looks at her portraits for a long time. "He said they'd still be themselves," she says quietly. "Just free." Her hand is shaking.`, set:{c4_ivy_doubt:true}},
        fail:{text:`"Pretty story," Ivy says. "Ghost stories always are."`, set:{c4_ivy_scorn:true}}}},
      {label:'Hold up Aldreth\'s ring: let the dead speak', if:G => !G.flags.c4_gallery && !!G.flags.c4_ivy_scorn && !G.flags.c4_ivy_doubt && has('aldreth_ring'), set:{c4_ivy_doubt:true},
       text:`The ring grows cold in your hand, and for a moment every candle in the hall gutters and turns pale gold. A woman's voice, from nowhere: "Nothing. He offers them nothing." Children scream. Ivy goes white. "All right," she whispers. "All right. I believe you."`},
      {label:'Ask Ivy for terms', if:G => !G.flags.c4_gallery && !!G.flags.c4_ivy_doubt && !G.flags.c4_ivy_terms, set:{c4_ivy_terms:true}, stay:true,
       text:`"If I cross the Faceless, I need somewhere for these people to stand. Get Brask to stop the sweeps and grant amnesty: one season, no arrests for old crimes. Do that, and I'll give back what we stole and turn every eye in Greywater against Vane."`},
      {label:'Give Ivy the signed amnesty', tag:'Peace', if:G => !G.flags.c4_gallery && !!G.flags.c4_amnesty,
       set:{c4_gallery:'turned', c4_knows_staff:true}, give:{items:{dawnstaff:1, vane_letter:1}, xp:400},
       fn:G => { passDay(G, 'Ivy spends the day calling in her people.'); if (G.flags.c4_sunstone_gone){ G.flags.c4_sunstone_back = true; log('good', 'Ivy hands back the Sunstone too, wrapped in a painted cloth. "Take it home to Bramblewick."'); } },
       text:`Ivy reads the paper twice, then stands on her throne. "Listen! We're done with masks." She brings out a long bundle in sailcloth: a staff of white ash shod in bronze. "Vane's boatmen are Gallery men. They'll be ours on the night. And here's his letter." The hall cheers, a little uncertainly.`},
      {label:'Look for the girl with the cut hand', if:G => !!G.flags.c4_ask_thief && !G.flags.c4_wick, go:'c4_wick'},
      {label:'Slip away to find Ivy\'s strongroom', tag:'Sneak', if:G => !G.flags.c4_gallery && !G.flags.c4_vault_done, check:{skill:'stealth', dc:G => G.flags.c4_spotted ? 16 : 13,
        pass:{text:`While Ivy holds court, you drift behind a curtain and down a short passage to an iron-banded door.`, go:'c4_gallery_vault'},
        fail:{text:`A big man with a broken nose steps in front of you. "Lost?" Ivy watches you over her wine. "Our guest wants a tour, Bones. Give them one."`, set:{c4_spotted:true}}}},
      {label:'Draw steel on Ivy Corrow', tag:'Boss', if:G => !G.flags.c4_gallery,
       fight:{foes:[{key:'bandit_captain', name:'Ivy Corrow', hp:40, boss:true}, {key:'bandit', name:'Bones Hallam', hp:16}], rout:1, captive:'bandit_talk', flee:'c4_fish_front',
         win:{set:{c4_gallery:'broken', c4_knows_staff:true}, give:{items:{dawnstaff:1, vane_letter:1}}, fn:G => { passDay(G, 'Clearing out the Gallery takes the rest of the day.'); crime('gw', 1, 'A bloody fight in the fish market.')(G); if (G.flags.c4_sunstone_gone) G.flags.c4_sunstone_back = true; },
           text:`The Gallery scatters into the rain. Ivy is gone out the river door, bleeding. In her strongroom you find the staff in sailcloth, a letter sealed with a blank mask, and everything else she stole.`}}},
      {label:'Leave the Gallery', go:'c4_fish_front'}
    ]
  },
  c4_wick:{
    chapter:4, title:'The Girl with the Cut Hand', short:'Wick', area:'gallery', rest:false,
    text:`You find her mending a sock by the stove: seventeen, pale, a bandage around one palm. She sees you looking at the bandage and goes still. "You've been to the house on the hill," she says. It isn't a question.`,
    options:[
      {label:'Ask her gently why she took the staff', stay:true, once:'c4_wick_why', set:{c4_wick_talked:true},
       text:`"Ivy holds my mum's debts. Forty gold. The Faceless wanted the staff, and Ivy said that would clear it." She stares at the sock. "The ghost cried. I didn't know ghosts could cry."`},
      {label:'Pay her mother\'s debt', tag:'40 gp', if:G => !!G.flags.c4_wick_talked && G.char.gold >= 40 && !G.flags.c4_wick, take:{gold:40},
       set:{c4_wick:'friend', c4_wick_kind:true}, give:{xp:100},
       text:`She stares at the coins as if they might bite. Then she puts them in her shirt and grips your hand hard. "I owe you. Wick pays her debts." She looks at the door. "The staff's in Ivy's strongroom. The lock sticks if you lift it while you turn."`},
      {label:'Promise to protect her from Ivy', if:G => !!G.flags.c4_wick_talked && !G.flags.c4_wick, check:{skill:'persuasion', dc:13,
        pass:{text:`"Nobody's ever promised me anything and meant it." She looks at you a long time. "All right. The staff's in Ivy's strongroom. Lift the lock while you turn it."`, set:{c4_wick:'friend', c4_wick_kind:true, c4_vault_tip:true}},
        fail:{text:`"Everyone says that." She goes back to her sock.`, set:{c4_wick_kind:true}}}},
      {label:'Ask Wick to come with you', tag:'Companion', if:G => G.flags.c4_wick === 'friend' && !withAlly('wick')(G), fn:G => joinAlly('wick'),
       text:`She grabs a knife and her coat. "Better than mending socks."`},
      {label:'Threaten to hand her to the watch', if:G => !G.flags.c4_wick, check:{skill:'intimidation', dc:11,
        pass:{text:`She tells you everything: strongroom, lock, Vane's boatmen, the ferry. Then she runs, and you know she'll never trust anyone again.`, set:{c4_wick:'scared', c4_vault_tip:true}},
        fail:{text:`"Go on, then." She doesn't even look up.`}}},
      {label:'Back to the hall', go:'c4_gallery_hall'}
    ]
  },
  c4_gallery_vault:{
    chapter:4, title:"Ivy's Strongroom", short:'Strongroom', area:'gallery', rest:false,
    text:`An old ice room behind an iron-banded door. The lock is new and good. Somewhere behind you, the Gallery is laughing at something.`,
    options:[
      {label:'Pick the lock', if:G => !G.flags.c4_vault_done, check:{skill:'sleight', dc:G => G.flags.c4_vault_tip ? 11 : 15, adv:G => has('tools'),
        pass:{text:`Lift and turn. The lock gives. inside, on a rack of stolen silver: a staff of white ash shod in bronze, wrapped in sailcloth, and a letter sealed with a blank mask.`, set:{c4_vault_done:true, c4_knows_staff:true}, give:{items:{dawnstaff:1, vane_letter:1}, xp:200},
          fn:G => { if (G.flags.c4_sunstone_gone){ G.flags.c4_sunstone_back = true; log('good', 'And on the shelf, glowing under a cloth: the Sunstone. You take it too.'); } }},
        fail:{text:`A needle jumps out of the keyhole into your thumb. The lock stays shut.`, damage:{dice:'2d4', type:'poison', save:{ability:'con', dc:12, half:true}}}}},
      {label:'Slip out of the Gallery with the staff', if:G => !!G.flags.c4_vault_done,
       fn:G => { G.flags.c4_gallery = 'robbed'; passDay(G, 'You lie low until dark.'); }, set:{c4_spotted:true},
       text:`You walk out through the hall with a long bundle under your arm and your heart in your mouth. Nobody stops you. By the time Ivy checks her strongroom, you are long gone. She will be very angry, and the Gallery will still be Vane's on the night.`, go:'c4_cross'},
      {label:'Go back to the hall', go:'c4_gallery_hall'}
    ]
  },
  c4_held:{
    chapter:4, title:'In the Dark', short:'Held Captive', area:'gallery', rest:false,
    text:G => `You wake in the dark with a mouthful of brine and a headache like a kicked door. Iron cuffs, a chain to a ring in the wall. Your weapons are gone. By the smell, you're still under the fish market, deeper than before: an old smuggler's hold below the waterline. A lantern, a stool, and a bored Gallery guard picking his teeth.${c4Helper(G) ? '' : ' Nobody is coming for you.'}`,
    back:`The smuggler's hold. Chains, brine, and the guard on his stool.`,
    options:[
      {label:'Slip your hand out of the cuff', if:G => !G.flags.c4_free, check:{skill:['sleight','acrobatics'], dc:14,
        pass:{text:`You fold your thumb and pull until the skin tears. The cuff slides off. The guard is still picking his teeth.`, set:{c4_free:true}},
        fail:{text:`The cuff bites. The guard laughs. "Comfy?"`, damage:{dice:'1d4', type:'slashing'}}}},
      {label:'Wrench the ring out of the wall', if:G => !G.flags.c4_free, check:{skill:'athletics', dc:16,
        pass:{text:`The old mortar is soaked with seawater. With a crack, the ring comes out of the wall in your fist.`, set:{c4_free:true}},
        fail:{text:`The ring doesn't budge. Your shoulders scream.`}}},
      {label:'Talk to the guard', if:G => !G.flags.c4_free, check:{skill:['persuasion','deception'], dc:14,
        pass:{text:`His name is Dob, he hates the cold, and he is very interested in the five gold you swear is sewn into your boot. While he looks, you get your arm round his neck.`, set:{c4_free:true}},
        fail:{text:`"Ivy said you'd talk. Ivy said don't listen." He puts cotton in his ears.`}}},
      {label:'Wait in the dark', if:G => !G.flags.c4_free && !G.flags.c4_helped, fn:G => { const h = c4Helper(G); if (h){ G.flags.c4_helped = h; G.flags.c4_free = true; say(HELP_TEXT[h](G)); } else say(`You wait. The tide comes up to your ankles. Nobody comes. If you're getting out of here, you'll have to do it yourself.`); }},
      {label:'Overpower the guard', if:G => !!G.flags.c4_free && !G.flags.c4_guard_down,
       fight:{foes:[{key:'thug', name:'Dob the Guard', hp:20}], cover:'lots', win:{set:{c4_guard_down:true}, text:`Dob goes down. He has your weapons' rack key on his belt.`}}},
      {label:'Creep past the guard', if:G => !!G.flags.c4_free && !G.flags.c4_guard_down, check:{skill:'stealth', dc:13,
        pass:{text:`You ease past him in the dark. He never looks up.`, set:{c4_guard_down:true}},
        fail:{text:`Your chain clinks. Dob jumps up.`, fight:{foes:[{key:'thug', name:'Dob the Guard', hp:20}], win:{set:{c4_guard_down:true}}}}}},
      {label:'Find your way out', if:G => !!G.flags.c4_guard_down || G.flags.c4_helped === 'aldreth' || G.flags.c4_helped === 'wick' || G.flags.c4_helped === 'ally', go:'c4_held_tunnel'}
    ]
  },
  c4_held_tunnel:{
    chapter:4, title:'The Smugglers\' Tunnel', short:'Smugglers\' Tunnel', area:'gallery', rest:false,
    text:`A low brick tunnel, ankle-deep in water. It forks three ways. Somewhere ahead is the river; somewhere behind is the Gallery. Your gear is on a shelf in a side niche, wrapped in a sack.`,
    options:[
      {label:'Grab your gear', if:G => !!G.flags.c3_stash, fn:G => returnWeapons(G), text:`Your weapons, a little damp. You feel like yourself again.`},
      {label:'Follow the cold air to the river', check:{skill:['survival','perception'], dc:12,
        pass:{text:`The left fork. Cold air, then starlight, then the river. You come out under a jetty a quarter mile downstream, soaked and free.`,
              fn:G => { returnWeapons(G); passDay(G, 'You lost a night in the dark.'); G.flags.c4_free = false; G.flags.c4_guard_down = false; G.flags.c4_helped = false; }, go:'c4_cross'},
        fail:{text:`The right fork. A dead end and a rat the size of a cat. You turn back, cold and slower.`, damage:{dice:'1d4', type:'cold'}}}}
    ]
  },

  /* ---------- the Jester (A Killing Joke) ---------- */
  c4_penrose:{
    chapter:4, title:'Penrose House', short:'Penrose House', area:'town', rest:false, intercept:c4intercept,
    text:`A fine house gone silent. Black ribbons on the door. The steward, a grey man named Fallon, lets you in when you mention Captain Doyle. "His lordship died at his own table," he says. "Laughing. He was laughing at something the jester said the night before."`,
    back:`Penrose House. Black ribbons on the door.`,
    options:[
      {label:'Examine the dining room', if:G => !G.flags.c4_clue_wine, check:{skill:['medicine','investigation'], dc:12,
        pass:{text:`The wine dregs smell faintly of almonds and river weed: nightcap, a slow poison from the salt marshes. It takes three or four hours to work. Whoever gave it to him was nowhere near when he died.`, set:{c4_clue_wine:true}},
        fail:{text:`Spilled wine, a knocked-over chair. You can't make sense of it.`}}},
      {label:'Ask the servants about the night before', if:G => !G.flags.c4_clue_show, check:{skill:['insight','persuasion'], dc:12,
        pass:{text:`The cook remembers: the Merry Lanterns played here the evening before he died. The jester, Pennywhistle, did his trick with the wine cup, pouring it from one cup into another and back. "His lordship laughed so hard," she says, and starts to cry.`, set:{c4_clue_show:true}},
        fail:{text:`Nobody wants to talk to a stranger. Fallon apologizes for them.`}}},
      {label:'Read his lordship\'s letters', if:G => !G.flags.c4_victims, check:{skill:'investigation', dc:13, adv:G => withAlly('silas')(G),
        pass:{text:`Penrose sat on the River Council, the old body that keeps the charters of Saltmouth at the river's end. So did every other murdered noble. A letter from a "Brother Archivist" asks to see the Saltmouth charters, politely. Penrose refused. He was dead five days later.`, set:{c4_victims:true}},
        fail:{text:`Bills, love letters, and complaints about drains.`}}},
      {label:'Look at the card in his hand', if:G => !G.flags.c4_cards, set:{c4_cards:true}, give:{items:{jest_card:1}},
       text:`Fallon brings it: a painted jester, grinning, with the number Four in the corner. "There were three others. The watch kept them. Your Captain Doyle got them back for you." Five days from now is the new moon. The fifth card has not been found.`},
      {label:'Ask who else sits on the River Council', if:G => !!G.flags.c4_victims && !G.flags.c4_next, set:{c4_next:true},
       text:`"Only one left in Greywater," Fallon says. "Lady Marisol Fell. She's giving her harvest masque at Fell Hall on the new moon. Everyone will be there. The Merry Lanterns are performing."`},
      {label:'Back to the market cross', go:'c4_cross'}
    ]
  },
  c4_green:{
    chapter:4, title:'The Merry Lanterns', short:'The Troupe', area:'greywater', rest:false,
    text:`Bright wagons in a ring on the green, a striped tent, and a juggler practicing in the rain. The jester sits on a wagon step painting his face: thin, quick, in a suit of green and gold diamonds, with a pair of tiny bells on his cap. "Pennywhistle, at your service," he says, and bows so low his bells touch the mud. "Do you like jokes? Everyone likes jokes."`,
    back:`The troupe's wagons on the green. Pennywhistle waves to you.`,
    options:[
      {label:'Ask Pennywhistle for a joke', stay:true, once:'c4_pw_joke',
       text:`"What's the difference between a lord and a fish? You only have to gut the fish." He laughs very hard. His eyes don't.`},
      {label:'Watch his hands while he talks', if:G => !G.flags.c4_clue_hands, check:{skill:['insight','perception'], dc:14, adv:G => !!G.flags.c4_clue_show,
        pass:{text:`He's never still: rings, coins, a cup trick. And on his left hand, a ring with a hollow bezel, the kind made to carry a pinch of powder. When he sees you notice, he smiles wider.`, set:{c4_clue_hands:true}},
        fail:{text:`Just a performer with quick hands.`}}},
      {label:'Search his wagon while he performs', tag:'Crime', if:G => !G.flags.c4_proof_jester, check:{skill:['stealth','sleight'], dc:14,
        pass:{text:`Under a false floor: a jar of nightcap, a recipe in a neat hand, a receipt from a wine merchant, and a painted card numbered Five with "Lady M. Fell" written on the back.`, set:{c4_proof_jester:true}, give:{xp:150}},
        fail:{text:`The juggler catches you halfway in the window. "Thief! Watch!"`, fn:crime('gw', 2, 'Caught breaking into a wagon.')}}},
      {label:'Accuse him in front of the troupe', if:G => !G.flags.c4_jester && ((G.flags.c4_clue_wine ? 1 : 0) + (G.flags.c4_clue_show ? 1 : 0) + (G.flags.c4_clue_hands ? 1 : 0) + (G.flags.c4_victims ? 1 : 0)) >= 3,
       check:{skill:['persuasion','intimidation'], dc:13,
        pass:{text:`Slow poison, the cup trick, the hollow ring, the River Council. You lay it all out in front of his own troupe. The juggler drops her clubs. The ringmaster calls for the watch. Pennywhistle looks around for friends and finds none. "Well," he says. "That's the joke on me." He goes quietly.`, set:{c4_jester:'caught'}, give:{xp:300}},
        fail:{text:`"Lies and fancy," Pennywhistle says. The troupe crowds around him. Then he is gone, bells and all, through the back of the tent.`, set:{c4_jester_warned:true}}}},
      {label:'Confront Pennywhistle with steel', tag:'Fight', if:G => !G.flags.c4_jester && (!!G.flags.c4_clue_hands || !!G.flags.c4_proof_jester),
       fight:{foes:[{key:'spy', name:'Pennywhistle', hp:40, boss:true, escapeAt:0.25, escapeText:'<b>Pennywhistle throws a smoke ball, somersaults over a wagon, and is gone.</b> He will strike at the masque.'}], captive:'jester_talk',
         win:{text:G => G.flags.c4_jester ? '' : `The troupe stares at you.`, fn:G => { if (!G.flags.c4_jester) G.flags.c4_jester_warned = true; }}}},
      {label:'Back to the market cross', go:'c4_cross'}
    ]
  },

  /* ---------- the ferry house ---------- */
  c4_ferry_day:{
    chapter:4, title:'The Greywater Ferry House', short:'Ferry House', area:'ferry', rest:false,
    text:`A long timber house on a stone jetty at the end of Ferry Lane, with a cable running out across the grey river to the far bank. The ferry raft is drawn up. The house is empty: the ferryman, Old Tam, is nowhere to be seen.`,
    back:`The ferry house, quiet by day.`,
    options:[
      {label:'Look for the boat cellar Tam mentioned', if:G => !!G.flags.c4_knows_cellar && !G.flags.c4_cellar_ready, set:{c4_cellar_ready:true},
       text:`Under the rug by the stove: a trapdoor, and a dry cellar big enough to hide in, with a little hatch out to the jetty. On the new moon you can wait here, right under Vane's feet.`},
      {label:'Search the house for a hiding place', if:G => !G.flags.c4_knows_cellar && !G.flags.c4_cellar_ready, check:{skill:['investigation','perception'], dc:15,
        pass:{text:`A rug that doesn't lie flat. Under it, a trapdoor to a dry boat cellar. A perfect hiding place.`, set:{c4_cellar_ready:true, c4_knows_cellar:true}},
        fail:{text:`Nets, oars, a stove. Nothing useful.`}}},
      {label:'Rig the jetty to collapse', tag:'Trap', if:G => !G.flags.c4_jetty_trap && has('rope'), check:{skill:['athletics','survival'], dc:13,
        pass:{text:`You saw through two of the old jetty posts and tie them off with rope to a cleat inside the boathouse. One good pull, and anyone on the end of the jetty goes into the river.`, set:{c4_jetty_trap:true}, take:{items:{rope:1}}},
        fail:{text:`A post groans and nearly goes now. You'll need to start again.`}}},
      {label:'Back to the market cross', go:'c4_cross'}
    ]
  },
  c4_night:{
    chapter:4, title:'The Ferry House at the New Moon', short:'The New Moon', area:'ferry', rest:false,
    onEnter:G => { if (!G.flags.c4_jester) G.flags.c4_jester_free = true; },
    text:G => `No moon. Fog on the river. ${G.flags.c4_jester ? '' : 'Somewhere across town, music plays at Fell Hall. The masque has begun, and the jester is performing. '}At the end of Ferry Lane, the ferry house is dark.${G.flags.c4_jester ? '' : '<br><br>You can only be in one place tonight.'}`,
    options:[
      {label:'Go to Fell Hall to stop the jester', if:G => !G.flags.c4_jester, go:'c4_masque'},
      {label:'Hide in the boat cellar', if:G => !!G.flags.c4_cellar_ready, set:{c4_hidden:true}, go:'c4_vane',
       text:`You ease the trapdoor down over your head and wait in the dark, listening to the river.`},
      {label:'Hide in the reeds by the jetty', if:G => !G.flags.c4_cellar_ready, check:{skill:'stealth', dc:13,
        pass:{text:`Cold water to the knees, reeds to the eyes. You see everything.`, set:{c4_hidden:true}, go:'c4_vane'},
        fail:{text:`You settle into the reeds, but a heron explodes into the air beside you. If anyone was watching, they know.`, go:'c4_vane'}}},
      {label:'Walk straight in and wait for him', go:'c4_vane', text:`You light the lamp and sit by the stove. Let him find you.`}
    ]
  },
  c4_masque:{
    chapter:4, title:'The Masque at Fell Hall', short:'Fell Hall', area:'town', rest:false,
    text:`Candles, masks, music, and two hundred guests. Lady Marisol Fell, silver-haired and laughing, holds court by the fire. Across the room, Pennywhistle is pouring wine from cup to cup to cup, and the guests are applauding.`,
    options:[
      {label:'Knock the cup from Lady Fell\'s hand', check:{skill:['acrobatics','athletics'], dc:12,
        pass:{text:`You vault a table and slap the cup away just as it touches her lips. Wine splashes the hearth, and the fire flares green. The room goes silent. Pennywhistle sighs. "Spoilsport."`, set:{c4_fell_saved:true}, give:{xp:200},
              fight:{foes:[{key:'spy', name:'Pennywhistle', hp:40, boss:true}], captive:'jester_talk', win:{set:{c4_jester:'caught'}, go:'c4_masque_after'}}},
        fail:{text:`You're too slow. Lady Fell drinks, and smiles at you, and doesn't know yet. Pennywhistle bows to her and slips toward the door.`, set:{c4_fell_poisoned:true},
              fight:{foes:[{key:'spy', name:'Pennywhistle', hp:40, boss:true}], captive:'jester_talk', win:{set:{c4_jester:'caught'}, go:'c4_masque_after'}}}}},
      {label:'Shout a warning to the whole room', check:{skill:['persuasion','intimidation'], dc:13,
        pass:{text:`"POISON! Don't drink!" Two hundred cups stop at two hundred lips. Lady Fell's guards seize the jester before he reaches the door.`, set:{c4_fell_saved:true, c4_jester:'caught'}, give:{xp:200}, go:'c4_masque_after'},
        fail:{text:`Nobody believes the stranger in muddy boots. Lady Fell drinks.`, set:{c4_fell_poisoned:true}, go:'c4_masque_after'}}}
    ]
  },
  c4_masque_after:{
    chapter:4, title:'After the Masque', short:'After the Masque', area:'town', rest:false,
    text:G => G.flags.c4_fell_poisoned && !G.flags.c4_fell_cured ? `Lady Fell sits by the fire, very pale. "Nightcap," a physician says. "Three hours, maybe four."` : `Lady Fell takes both your hands. "I owe you my life. Fell Hall remembers its friends."`,
    options:[
      {label:'Treat the poison', if:G => !!G.flags.c4_fell_poisoned && !G.flags.c4_fell_cured && !G.flags.c4_fell_dead, check:{skill:'medicine', dc:14, adv:G => withAlly('tamsin')(G),
        pass:{text:`Salt, charcoal, and a long hard night. By dawn she is weak but alive.`, set:{c4_fell_cured:true, c4_fell_saved:true}},
        fail:{text:`You do everything you know. It isn't enough. Lady Fell dies before dawn, holding your hand.`, set:{c4_fell_dead:true}}}},
      {label:'Give Lady Fell a healing potion', if:G => !!G.flags.c4_fell_poisoned && !G.flags.c4_fell_cured && !G.flags.c4_fell_dead && (has('potion') || has('potion_greater')),
       fn:G => takeItem(has('potion') ? 'potion' : 'potion_greater'), set:{c4_fell_cured:true, c4_fell_saved:true},
       text:`The potion burns the poison out of her. She coughs, and sits up, and asks for more wine. Not that wine.`},
      {label:'Run for the ferry house: maybe it isn\'t too late', fn:G => { G.flags.c4_missed_vane = true; }, go:'c4_end',
       text:`You run all the way to Ferry Lane. The ferry house is empty, the jetty wet with many footprints, and far out on the dark river a barge is drifting downstream without a light.`}
    ]
  },
  c4_vane:{
    chapter:4, title:'Aurek Vane', short:'Vane', area:'ferry', rest:false,
    text:G => {
      const gal = G.flags.c4_gallery === 'turned';
      return `At midnight a barge slides out of the fog with no light. Six figures in grey robes and blank masks step onto the jetty, and behind them, a slim man in an archivist's coat whose white mask has no features at all. Aurek Vane. He looks around the empty ferry house. "Ivy is late," he says, very softly. "Ivy is never late."${gal ? `<br><br>The bargemen tie up. One of them catches your eye and taps a painted tile on his hat. The Gallery is here, and it's yours.` : ''}${G.flags.c4_hidden ? '' : `<br><br>He turns, slowly, toward where you are. "Ah. Someone else came instead."`}`;
    },
    options:[
      {label:'Step out and speak to him', set:{c4_vane_met:true}, go:'c4_vane_talk'},
      {label:'Pull the rope and drop the jetty into the river', tag:'Trap', if:G => !!G.flags.c4_jetty_trap && !G.flags.c4_jetty_sprung, set:{c4_jetty_sprung:true},
       text:`You haul on the rope. The posts give with a crack, and half the masked figures go into the black river with a splash. Vane stands on the last good plank, perfectly still. "Clever," he says.`},
      {label:'Ambush them', tag:'Fight', go:'c4_vane_fight', set:{c4_ambush:true}}
    ]
  },
  c4_vane_talk:{
    chapter:4, title:'The Faceless', short:'The Faceless', area:'ferry', rest:false,
    text:G => `Vane doesn't draw back. He looks at you for a long moment, and then he sits on a coil of rope and folds his hands. "I wondered who kept finding my threads. Hesta's helper. Doyle's friend." His voice is gentle, tired, educated. "You think I'm a monster. Ask me anything. I don't mind."`,
    options:[
      {label:'"What is the Hollow?"', stay:true, once:'c4_v_hollow', set:{c4_hollow:true},
       text:`"Peace. Every grief you carry, every name the world has called you, every face that frightens a child in the dark. Gone. The Hollow takes it all and leaves you light as air." He touches his blank mask. "I've seen it. Through the cracks. It's beautiful."`},
      {label:'"Why are you doing this?"', stay:true, once:'c4_v_why', set:{c4_vane_why:true},
       text:`A long silence. "Eleven years ago my wife and my son went down with the Saltmouth ferry. I was standing on the shore. I have had eleven years to hear them call me." His voice doesn't change at all. "The Hollow doesn't hurt. Nothing in the Hollow hurts."`},
      {label:'"The Dawnwardens say it takes your soul, not your grief."', if:G => !!G.flags.c4_hollow, check:{skill:['persuasion','insight'], dc:16, adv:G => has('aldreth_ring'),
        pass:{text:`"The Dawnwardens were jailers." But his hands tighten, and for the first time his voice shakes. "If it took them," he says, very quietly, "if it would take them away from me too…" He stops. Something has cracked. You don't know if it will hold.`, set:{c4_vane_shaken:true}, give:{xp:200}},
        fail:{text:`"You've been listening to ghosts. Ghosts are the last people who'd know."`}}},
      {label:'"Who are your three lights?"', stay:true, once:'c4_v_lights',
       text:G => `"The Sunstone, the Lantern, and the Tidelamp at Saltmouth. ${G.flags.c4_sunstone_gone && !G.flags.c4_sunstone_back ? 'The Sunstone is already mine.' : 'The Sunstone has been… difficult.'} ${G.flags.c4_lantern_gone ? 'The Lantern came to me last week.' : 'Aldermere guards its Lantern too well.'} And the Tidelamp will come to me at the end of the river, where everything comes."`},
      {label:'Show him the staff: he will not have it', if:G => has('dawnstaff'),
       text:`Vane's head turns toward the long bundle under your arm. For the first time, something like anger shows in the way he stands. "That is not yours." He rises.`, go:'c4_vane_fight'},
      {label:'Let him go, and follow the barge', check:{skill:['stealth','survival'], dc:14, adv:G => withAlly('tess')(G) || G.flags.c4_gallery === 'turned',
        pass:{text:`You let him leave. Then you follow the dark barge downriver along the towpath all night, and by dawn you know exactly where it's going: Saltmouth, at the river's end. You also know where he moored, and how many he has.`, set:{c4_followed:true, c4_vane_free:true}, give:{xp:200}, go:'c4_end'},
        fail:{text:`The fog swallows the barge within a mile. He's gone.`, set:{c4_vane_free:true}, go:'c4_end'}}},
      {label:'Seize him', tag:'Fight', go:'c4_vane_fight'}
    ]
  },
  c4_vane_fight:{
    chapter:4, title:'Fight on the Jetty', short:'Fight on the Jetty', area:'ferry', rest:false,
    text:G => `Steel and shadow on the jetty in the dark.${G.flags.c4_gallery === 'turned' ? ' The Gallery bargemen drop their poles and go for the masked men with boathooks.' : ''}`,
    options:[
      {label:'Fight!', tag:'Boss',
       fight:G => {
         const foes = [{key:'vane', name:'Aurek Vane', boss:true, escapeAt:0.8, escapeText:'<b>Vane tears off a strip of darkness like a cloak and steps into it.</b> The shadows close. When they open, he is standing on the drifting barge, far out on the river. "At the end of the river, then," he calls. "Bring the staff. Everyone does, in the end."'}];
         let n = 4;
         if (G.flags.c4_jetty_sprung) n -= 2;
         if (G.flags.c4_gallery === 'turned') n -= 1;
         const fanatic = G.flags.c4_gallery !== 'turned' && !G.flags.c4_jetty_sprung;
         if (G.flags.c4_jester_free && !G.flags.c4_jester) foes.push({key:'spy', name:'Pennywhistle', hp:30});
         for (let i = 0; i < Math.max(1, n); i++) foes.push(i === 0 && fanatic ? {key:'cult_fanatic', name:'Masked Preacher', hp:24} : 'cultist');
         return {foes, surprise:G.flags.c4_ambush && G.flags.c4_hidden ? 'player' : null, cover:'some', captive:'cultist_talk', flee:'c4_end', rout:1,
           win:{set:{c4_vane_free:true, c4_fought_vane:true}, go:'c4_end'}};
       }}
    ]
  },
  c4_end:{
    chapter:4, title:'End of Chapter Four', short:'Chapter End', area:'town', rest:'both',
    onEnter:G => {
      returnWeapons(G);
      if (!G.flags.c4_jester && !G.flags.c4_fell_saved) G.flags.c4_fell_dead = true;
      if (G.flags.c4_fell_poisoned && !G.flags.c4_fell_cured) G.flags.c4_fell_dead = true;
      G.flags.c4_vane_free = true;
      if (!G.flags.c4_done){ G.flags.c4_done = true; give({gold:120, xp:500}); }
    },
    text:G => {
      const lines = [];
      lines.push(has('dawnstaff') ? 'The Dawnwarden Staff is in your hands. Vane cannot set the lights without it.' : 'Vane has the Dawnwarden Staff.');
      if (G.flags.c4_sunstone_gone) lines.push(G.flags.c4_sunstone_back ? 'The Sunstone is going home to Bramblewick.' : 'Vane has the Sunstone.');
      lines.push(G.flags.c4_lantern_gone ? 'Vane has the Lantern of Aldermere.' : 'The Lantern of Aldermere is safe.');
      lines.push(G.flags.c4_fell_dead ? 'Lady Marisol Fell is dead, the fifth card in her hand.' : 'Lady Marisol Fell is alive.');
      if (G.flags.c4_gallery === 'turned') lines.push('The Gallery has turned against the Faceless.');
      if (G.flags.c4_gallery === 'broken') lines.push('The Gallery is broken, and Ivy Corrow is in chains or in hiding.');
      if (G.flags.c4_outlaw) lines.push('You are an outlaw in Greywater.');
      if (G.flags.c4_aldreth === 'promised') lines.push('Sister Aldreth\'s ring is on your finger.');
      if (G.flags.c4_aldreth === 'banished') lines.push('The Wailing House is empty, and Aldreth is gone.');
      return `Grey dawn in Captain Doyle's front room. Doyle pins the last piece of the map: a little town where the river meets the sea. "Saltmouth," she says. "Everything goes downriver in the end."<br><br>${lines.join(' ')}<br><br><b>Chapter Four: The Greywater Ferry is complete.</b>`;
    },
    options:[
      {label:'Return the Sunstone to Hesta in Bramblewick', if:G => !!G.flags.c4_sunstone_back && !G.flags.c4_sunstone_home, set:{c4_sunstone_home:true}, give:{xp:100, insp:true},
       text:`A rider takes it up the valley with your letter. Hesta writes back in two days: the mist has lifted again. "Bramblewick owes you twice now."`},
      {label:'Bring the staff home to Aldreth', if:G => G.flags.c4_aldreth === 'promised' && has('dawnstaff') && !G.flags.c4_staff_shown, set:{c4_staff_shown:true},
       text:`You climb Gallows Hill with the staff. Aldreth appears in the doorway and smiles for the first time. "Not yet," she says. "You'll need it at the river's end. Carry it there for me, and set it back where it belongs." The ring on your finger warms.`},
      {label:'Chapter Five: Where the River Ends', tag:'Suggested level 5', go:'c5_start'},
      {label:'Take the river road to Aldermere', tag:'City', fn:G => { G.flags.city_from = 'c4_end'; }, go:'city_gate'}
    ]
  }
});

/* the jester as a captive */
CAPTIVES.jester_talk = {name:'jester', talk:{
  text:`Pennywhistle sits in the mud with his bells crushed, still smiling. "Ask, then. I love an audience."`,
  choices:[
    {label:'Ask who paid him', stay:true, once:'pw_who', set:{c4_victims:true},
     text:`"The Faceless. Forty gold a noble. Every lord on the River Council, so nobody would be left who remembers what's under Saltmouth." He giggles. "I don't even know what's under Saltmouth. I just like the work."`},
    {label:'Ask about the fifth card', stay:true, once:'pw_card',
     text:`He produces it from nowhere, like a magic trick. "Lady Fell. Tonight. Or it would have been." He frowns at the card as if it disappointed him.`},
    {label:'Hand him to the watch', fn:G => { G.flags.c4_jester = 'caught'; }, give:{xp:100},
     text:`Brask's men take him away in irons. He waves to the crowd.`}
  ]}};


/* hiring board at the market cross, and the city road */
HIRE_PLACE.c4_cross = `A board outside the Watch House is pinned with notices from folk looking for work.`;
STORY.c4_cross.options.splice(STORY.c4_cross.options.length - 2, 0, HIRE_OPT,
  {label:'Take the river road to Aldermere', tag:'City', if:G => c4day(G) < 5, fn:G => { G.flags.city_from = 'c4_cross'; }, go:'city_gate'});
