/* =====================================================================
   THORNVALE CHRONICLES : city.js
   Aldermere, the City of Bridges. An original city hub with shops, an inn,
   guilds, a temple, the Spell Forge, and a reputation that unlocks special
   shops and places. The job board lives in story/jobs.js.
   ===================================================================== */
'use strict';

/* ---------- standing (reputation) in Aldermere ---------- */
const REP_TIERS = [[0, 'Stranger'], [10, 'Known'], [25, 'Trusted'], [45, 'Respected'], [70, 'Renowned'], [100, 'Hero of Aldermere']];
const REP_UNLOCKS = {
  10:'1st-level spells at the Spell Forge, and jobs for the Collegium, the Chapel, the Weavers, and the Wardens',
  25:'Lantern Row, with the Night Market and The Quiet Blade (magic weapons), and harder hunting and arcane jobs',
  45:'The Gilded Lantern (magic curios), empowered spells at the Spell Forge, and 10% off in every city shop',
  70:'The Royal Armory (magic armor), the Hall of Champions arena, and the Lady Mayor\'s commission',
  100:'the Key to the City and the Hero\'s House on Lantern Square'
};
const repAtLeast = n => (G.rep || 0) >= n;
function repName(r){
  if (r === undefined) r = G.rep || 0;
  let t = REP_TIERS[0][1];
  REP_TIERS.forEach(([n, name]) => { if (r >= n) t = name; });
  return t;
}
function nextTier(){ return REP_TIERS.find(([n]) => n > (G.rep || 0)); }
function gainRep(n){
  if (!n) return;
  const before = G.rep || 0;
  G.rep = before + n;
  log('good', `Your standing in Aldermere rises by ${n} to ${G.rep} (${repName()}).`);
  REP_TIERS.forEach(([t, name]) => {
    if (t > 0 && before < t && G.rep >= t){
      log('level', `Standing: ${name}`);
      log('good', `Now open to you in Aldermere: ${REP_UNLOCKS[t]}.`);
      if (t === 100) addItem('citykey');
    }
  });
}
function chapterLabel(sc){
  if (sc.city) return `Aldermere · City of Bridges · Standing: ${repName()}`;
  if (sc.job && typeof JOBS !== 'undefined' && JOBS[sc.job]) return `Job · ${JOBS[sc.job].title} · Scaled to your level`;
  return '';
}
function standingText(){
  const nt = nextTier();
  return `Your standing in Aldermere is <b>${repName()}</b> (${G.rep || 0}).${nt ? ` At ${nt[0]} you will be ${nt[1]}, which opens ${REP_UNLOCKS[nt[0]]}.` : ' There is no higher honor the city can give.'}`;
}
AREA_NAME.city = 'Aldermere';

/* ---------- rumors at the inn ---------- */
const RUMORS = [
  `"The sewer warden pays for rat work. Honest coin, if you don't mind the smell."`,
  `"Something rings the bell in the Drowned Chapel at night. Nobody's pulled that rope in forty years."`,
  `"Lights in the old observatory again. The Collegium says it's nothing. The Collegium is lying."`,
  `"Mag Rusk was a river watch sergeant once. Now she robs the roads. Funny how that goes."`,
  `"Men in white masks were asking about the Lantern of Aldermere. The real one, in the vault."`,
  `"The swordsmith on Lantern Row only sells to people the city trusts. Do some good and she'll find you."`,
  `"Ogre on the Kingsbridge road charging a toll. The Wardens want him gone, one way or another."`,
  `"The Weavers pay double for golden spider silk. Double. Mind the mother, though."`,
  `"Granny Wick needs herbs from the water meadows. Easy work, if you don't mind frogs."`
];

/* ---------- city streets: random encounters ---------- */
ENCOUNTERS.city = {
  name:'Aldermere', alert:false,
  rows:[
    {range:[1,3], label:'Hostile', pick:[
      {text:`A hand brushes your purse. You turn to find a cutpurse and two friends who would rather fight than run.`,
       fight:{tiers:{1:[{key:'bandit', name:'Cutpurse'}], 3:[{key:'thug', name:'Alley Tough'}, {key:'bandit', name:'Cutpurse'}], 5:[{key:'spy', name:'Knife-for-Hire'}, {key:'thug', name:'Alley Tough'}]}, rout:1, captive:'bandit_talk'}}
    ]},
    {range:[4,6], label:'Trouble', pick:[
      {text:`A brewer's dray loses a wheel on the steep street and barrels of ale come thundering down at you.`, check:{save:'dex', dc:12,
        pass:{text:`You leap onto a doorstep as the barrels roar past. A carter claps you on the back.`},
        fail:{text:`A barrel clips your legs and knocks you flat.`, damage:{dice:'1d6', type:'bludgeoning'}}}},
      {text:`Two apprentices from rival guilds are about to come to blows in the middle of the bridge.`, check:{skill:['persuasion','intimidation'], dc:12,
        pass:{text:`You talk them down. A passing Warden nods at you, and someone remembers your face kindly.`, fn:G => gainRep(1)},
        fail:{text:`They ignore you and start throwing punches. The Wardens break it up, glaring at everyone, you included.`}}}
    ]},
    {range:[7,13], label:'Quiet', pick:[
      {text:`Lamplighters move along the bridges, and one by one the lanterns of Aldermere bloom over the dark water.`},
      {text:`A fishwife sings at her stall. The whole street seems to know the chorus.`},
      {text:`Collegium students argue about stars on the steps of a bookshop, loudly and happily.`},
      {text:`Barges slide under the bridges, low in the water with timber and grain.`}
    ]},
    {range:[14,17], label:'Find', pick:[
      {text:`A coin purse lies in the gutter. No name, no owner in sight.`, give:{gold:'2d6'}},
      {text:`A grateful baker presses a warm loaf into your hands for helping chase off a stray dog. There's a coin baked into it for luck.`, give:{gold:1, items:{ration:1}}}
    ]},
    {range:[18,19], label:'Stranger', pick:[
      {text:`A blind busker plays a hymn you half remember from childhood. When you drop a coin, she smiles. "Go with God, friend."`, give:{insp:true}},
      {text:`A street preacher stands on a crate by the fountain, reading from the Psalms in a big plain voice. A few people stop to listen. You find you have stopped too.`, give:{insp:true}}
    ]},
    {range:[20,20], label:'Blessing', pick:[
      {text:`The bells of the Chapel of the Morning Light ring out over the river, and for a moment the whole city seems to hold its breath and listen.`, give:{insp:true}}
    ]}
  ]
};

/* the arena's champions: [template, name, prize] */
const ARENA = [['veteran', 'Corporal Brannock Dunn', 60], ['berserker', 'Hulda Bloodmane', 80], ['knight', 'Ser Aldous Grey', 120], ['gladiator', 'Varro the Unbroken', 250]];

Object.assign(STORY, {
  city_gate:{
    chapter:'city', city:true, title:'The Bridge Gate, Aldermere', short:'Bridge Gate', area:'city', rest:false,
    text:`The river road ends at a gatehouse of pale stone, and beyond it Aldermere climbs its seven islands: a city of bridges, bell towers, and more lanterns than stars. Barges crowd the water below. The gate warden glances at your gear, then at your face. "Work's posted at the Hall of the Open Road," she says. "Trouble's posted everywhere else. Welcome to Aldermere."`,
    back:`The Bridge Gate. Carts rumble through in both directions, and the river smells of tar and rain.`,
    options:[
      {label:'Cross the Bridge of Lanterns into the city', go:'city_square'},
      {label:G => `Take the river road back to ${STORY[G.flags.city_from] ? STORY[G.flags.city_from].short || STORY[G.flags.city_from].title : 'Greywater'}`, if:G => !!G.flags.city_from && !G.job, go:G => G.flags.city_from},
      {label:'Take the river road to Greywater and the Thornvale', tag:'Campaign', if:G => !G.flags.city_from && !G.job, go:'c1_greywater',
       text:`Two days down the river road, the market town of Greywater sits at the edge of the Hollowmere marsh.`}
    ]
  },
  city_square:{
    chapter:'city', city:true, title:'Lantern Square', short:'Lantern Square', area:'city', rest:'short',
    text:`Lantern Square sits at the heart of Aldermere where four bridges meet: a fountain, a hundred stalls, and a great iron lantern on a pillar that the city says has never once gone out. Every guild hall in the city faces this square.`,
    back:G => repAtLeast(70) ? `People in Lantern Square nod to you as you pass. A child points you out to her mother.` : `Lantern Square, busy and loud. The great iron lantern burns on its pillar.`,
    options:[
      {label:'Read the standing notices by the fountain', tag:'Standing', stay:true, text:G => standingText()},
      {label:'The Hall of the Open Road (job board)', tag:'Jobs', go:'city_guild'},
      {label:'Market Row', tag:'Shops', go:'city_market'},
      {label:'The Lantern and Lark (inn)', tag:'Rest', go:'city_inn'},
      {label:'The Amberglass Collegium (Spell Forge)', tag:'Magic', go:'city_collegium'},
      {label:'The Chapel of the Morning Light', go:'city_temple'},
      {label:"The Wardens' Hall", go:'city_wardens'},
      {label:'Lantern Row', tag:'Trusted', if:G => repAtLeast(25), go:'city_lanternrow'},
      {label:'The Gilded Lantern', tag:'Respected', if:G => repAtLeast(45), shop:'gilded',
       text:`A doorman in blue bows you through. Inside, everything glitters under glass.`},
      {label:'The Royal Armory', tag:'Renowned', if:G => repAtLeast(70), shop:'royalarmory',
       text:`The armorer-royal looks you up and down. "We've heard of you. What do you need?"`},
      {label:'The Hall of Champions', tag:'Arena', if:G => repAtLeast(70), go:'city_arena'},
      {label:"The Hero's House", tag:'Your home', if:G => repAtLeast(100), go:'city_house'},
      {label:'The Bridge Gate', go:'city_gate'}
    ]
  },
  city_market:{
    chapter:'city', city:true, title:'Market Row', short:'Market Row', area:'city', rest:false,
    text:`Market Row runs the length of Cooper's Island: awnings, shouting, and the smell of fried fish and hot iron.`,
    options:[
      {label:"Hobb's Provisions", tag:'Shop', shop:'hobb', text:`A cat on the scales opens one eye. Hobb opens neither.`},
      {label:'Ironwright Smithy', tag:'Shop', shop:'ironwright', text:`"Steel's steel," says the smith. "Mine's better."`},
      {label:'The Green Bottle', tag:'Shop', shop:'greenbottle', text:`The apothecary peers at you over half-moon spectacles. "Bleeding, or about to be?"`},
      {label:'Back to Lantern Square', go:'city_square'}
    ]
  },
  city_inn:{
    chapter:'city', city:true, title:'The Lantern and Lark', short:'The Lantern and Lark', area:'town', rest:'both',
    text:`The Lantern and Lark leans over the river on old oak stilts. The beds are clean, the stew is hot, and the landlord, a cheerful one-eyed man named Tobias Fenn, remembers everybody's name.`,
    back:`The common room of the Lantern and Lark is warm and crowded. Tobias waves a ladle at you.`,
    options:[
      {label:'Listen to the gossip', stay:true, text:G => pick(RUMORS)},
      {label:'Play knucklebones with the bargemen', tag:'Bet 5 gp', stay:true, if:G => G.char.gold >= 5, check:{skill:['sleight','insight'], contest:{name:'Bargeman', mod:2},
        pass:{text:`The bones fall your way. The bargemen groan and pay up.`, give:{gold:5}},
        fail:{text:`The bargeman grins, scoops up the pot, and buys you a drink with it.`, take:{gold:5}}}},
      {label:'Back to Lantern Square', go:'city_square'}
    ]
  },
  city_guild:{
    chapter:'city', city:true, title:'The Hall of the Open Road', short:'Hall of the Open Road', area:'city', rest:false,
    text:`The adventurers' guild hall is a converted grain exchange with a painted map of the river on the ceiling. A great oak board covers one whole wall, pinned with jobs. Guildmistress Della Thorne, broad and grey and missing two fingers, looks up from her ledger. "New face. Pick a job off the board, do it well, and the city will learn your name."`,
    back:G => G.job ? `Della glances up. "You've still got a job on, I hear. ${esc(JOBS[G.job.id].title)}."` : `The Hall of the Open Road smells of ink, leather, and boot polish. Della Thorne nods at the board.`,
    options:[
      {label:'Read the job board', tag:'Jobs', text:G => jobBoardIntro(G), choices:G => jobBoard(G)},
      {label:'Head back to your job', if:G => !!G.job, go:G => JOBS[G.job.id].outside},
      {label:'Ask Della how the city sees you', stay:true, text:G => `Della taps her ledger. "${G.rep ? `You've done ${jobsDone()} job${jobsDone() === 1 ? '' : 's'} for us.` : 'Nobody knows you yet.'}" ${standingText()}`},
      {label:'Ask Della about the guild', once:'ask_della',
       text:`"Anyone can take work off the board. Sewer jobs, scouting, bounties, Collegium errands. Every job scales to the one doing it, so don't worry about being too green. Do the work and the city notices. Quit if you must; no shame. And if you fall on a job, the guild sends people to drag you out. That's what your dues are for."`},
      {label:'Back to Lantern Square', go:'city_square'}
    ]
  },
  city_collegium:{
    chapter:'city', city:true, title:'The Amberglass Collegium', short:'Amberglass Collegium', area:'city', rest:false,
    text:`The Amberglass Collegium is a tower of honey-colored glass and old stone, full of students who run everywhere. Magister Corvin Ashe, thin, ink-stained, and kind, keeps the Spell Forge: a long table of brass rings and chalk where new spells are shaped. "Any fool can learn a spell," he says. "Designing one is a different thing. Shall we?"`,
    back:`Students hurry past with armfuls of books. Magister Ashe waves you toward the Spell Forge.`,
    options:[
      {label:'Use the Spell Forge', tag:'Craft spells', fn:G => { G.forge = true; },
       text:G => `Magister Ashe clears the forge table. ${repAtLeast(10) ? '' : '"Cantrips for now. When the city knows your name, the library will open to you, and 1st-level designs with it."'}`},
      {label:'Ask about the Spell Forge', once:'ask_forge',
       text:`"Pick a shape: a bolt, a brand that marks its target, a lance that tests one foe, a wave that washes over many, or a mending. Pick an element. Pick how strong. If you have the gift, you learn it. If you don't, our scribes put it on scrolls anyone can read. The Collegium charges for the chalk, the brass, and my time."`},
      {label:'Ask about the Collegium\'s troubles', once:'ask_collegium',
       text:`Ashe lowers his voice. "Lights in the old observatory on the hill. And the sealed wing has been… restless. If the guild sends you, I'll be grateful."`},
      {label:'Back to Lantern Square', go:'city_square'}
    ]
  },
  city_temple:{
    chapter:'city', city:true, title:'The Chapel of the Morning Light', short:'Chapel of the Morning Light', area:'town', rest:false,
    text:`The Chapel of the Morning Light is plain whitewashed stone with one great east window. Mother Rowan, small and fierce, runs it, along with the soup kitchen behind it. Brother Tamsin's order is the same, though he would say he's "only a lay brother, Mother."`,
    back:`Morning light, or lamplight, falls through the east window across the plain wooden benches.`,
    options:[
      {label:'Ask the sisters to tend your wounds', tag:'5 gp donation', if:G => G.char.hp < G.char.maxHp && G.char.gold >= 5, take:{gold:5},
       fn:G => { G.char.hp = G.char.maxHp; if (G.ally) G.ally.hp = G.ally.max; },
       text:`The sisters clean and bind your wounds with quick, practiced hands. You leave whole.`},
      {label:'Kneel for a blessing', tag:'5 gp donation', if:G => !G.char.insp && G.char.gold >= 5, take:{gold:5}, give:{insp:true},
       text:`Mother Rowan lays her hand on your head and prays the old blessing over you: "The Lord bless thee, and keep thee." You stand up steadier.`},
      {label:'Ask Mother Rowan about the Drowned Chapel', once:'ask_drowned', set:{knows_drowned:true},
       text:`"Our old chapel on the salt marsh. It flooded forty years ago and we buried the dead there in a hurry. Too much of a hurry. If its bell is ringing, something down there is not resting. Ring it yourself, from the tower, with a true prayer. It was made to call the faithful, and it still remembers how."`},
      {label:'Help in the soup kitchen for an evening', once:'soup_kitchen', give:{xp:25}, fn:G => gainRep(2),
       text:`You ladle soup until your arm aches and hear a hundred stories. Mother Rowan says nothing, but she watches you go with approval.`},
      {label:'Back to Lantern Square', go:'city_square'}
    ]
  },
  city_wardens:{
    chapter:'city', city:true, title:"The Wardens' Hall", short:"Wardens' Hall", area:'city', rest:false,
    text:`The Wardens keep the peace in Aldermere from a squat hall full of maps, keys, and tired people. Warden-Captain Hal Brenner has a broken nose and a careful way of speaking. "Bring us your prisoners alive and I'll pay a bounty on every one. Dead ones I pay nothing for and ask a lot of questions."`,
    options:[
      {label:'Hand over your captive for the bounty', if:G => !!G.captive, fn:G => { const lv = G.char.level; G.captive = null; give({gold:8 * lv}); gainRep(1); },
       text:`Brenner's people take your prisoner down to the cells. "Good work. Alive is always good work."`},
      {label:'Read the wanted posters', stay:true,
       text:`Wanted: the ogre on the Kingsbridge road (see the guild board). Wanted: the leaders of the Eel Knot smuggling gang. Wanted for questioning: anyone in a blank white mask. Reward for information on the Faceless.`},
      {label:'Ask Brenner about the Blank Masks', once:'ask_brenner', set:{cult_lore:true},
       text:`"Started a year back. Quiet people, ordinary people, who go out at night in white masks. They call their master the Faceless. Last month they tried the Collegium vault. If they try again, I want someone good there."`},
      {label:'Back to Lantern Square', go:'city_square'}
    ]
  },
  city_lanternrow:{
    chapter:'city', city:true, title:'Lantern Row', short:'Lantern Row', area:'city', rest:false,
    text:`Lantern Row is a crooked lane of tall houses on the oldest island, hung with paper lanterns. By day it is quiet. By night it is the best market in the city, if you know where to knock. Someone has decided you know.`,
    options:[
      {label:'The Night Market', tag:'Shop', shop:'nightmarket', text:`A woman in a fox mask sweeps a hand over her table. "For friends of the city, fair prices. Mostly."`},
      {label:'The Quiet Blade', tag:'Magic weapons', shop:'quietblade', text:`The swordsmith speaks barely above a whisper. "Each blade has a name. Treat it well."`},
      {label:'Back to Lantern Square', go:'city_square'}
    ]
  },
  city_arena:{
    chapter:'city', city:true, title:'The Hall of Champions', short:'Hall of Champions', area:'city', rest:'short',
    text:`The Hall of Champions is a sand ring under a vaulted roof, ringed with benches and bookmakers. Bouts are fought with blunted steel and a referee's whistle, and the crowd is as loud as any battle. "We know your name," says the herald. "Want to see if they'll chant it?"`,
    options:[
      ...ARENA.map(([key, name, prize]) => ({label:`Fight ${name} (${MONSTERS[key].name})`, tag:`Purse ${prize} gp`, fn:G => startSpar(key, {name, prize})})),
      {label:'Back to Lantern Square', go:'city_square'}
    ]
  },
  city_house:{
    chapter:'city', city:true, title:"The Hero's House", short:"Hero's House", area:'town', rest:'both',
    text:G => `A narrow tall house on Lantern Square, given to you by the city with the Key to the City. There is a fire laid, a bed made, and a wall for trophies. ${jobsDone() ? `So far it holds mementos of ${jobsDone()} job${jobsDone() === 1 ? '' : 's'} for Aldermere.` : ''}`,
    options:[
      {label:'Back to Lantern Square', go:'city_square'}
    ]
  }
});

/* ---------- the river road to Aldermere from the campaign hubs ---------- */
['c1_greywater', 'bramblewick', 'c3_briefing'].forEach(id => {
  const sc = STORY[id];
  if (!sc) return;
  sc.options.splice(Math.max(0, sc.options.length - 1), 0, {label:'Take the river road to Aldermere', tag:'City', fn:G => { G.flags.city_from = id; },
    text:`The river road winds north beside the water for two days, past mills and ferries, until the bell towers of Aldermere rise out of the mist.`, go:'city_gate'});
});
/* the hiring board works at the Lantern and Lark too */
HIRE_PLACE.city_inn = `Tobias keeps a slate behind the bar of folk looking for work, and vouches for most of them.`;
STORY.city_inn.options.splice(STORY.city_inn.options.length - 1, 0, HIRE_OPT);

JOURNAL.push({text:G => G.job && JOBS[G.job.id] ? `Job: ${JOBS[G.job.id].title}. ${JOBS[G.job.id].goal}` : '', shown:G => !!G.job, done:() => false});
