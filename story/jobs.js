/* =====================================================================
   THORNVALE CHRONICLES : jobs.js
   The job board at the Hall of the Open Road in Aldermere. Every job is a
   short one-shot storyline that scales to the hero:
   * fights use tiers, {1:[...], 3:[...], 5:[...]}: the group for the
     highest tier at or below your level, then fine-tuned by level scaling
   * check DCs and pay grow with your level
   * you can quit a job any time (no pay, no penalty)
   * if you die on a job you are dragged out and wake just outside, and
     every foe you already killed stays dead when you go back in
   ===================================================================== */
'use strict';

/* ---------- helpers for writing jobs ---------- */
const jc = fid => !!(G.job && G.job.cleared && G.job.cleared[fid]);             // fight cleared?
const jon = k => G => !!(G.job && G.job.f && G.job.f[k]);                        // job flag set?
const joff = k => G => !(G.job && G.job.f && G.job.f[k]);
const jset = (...ks) => G => { if (G.job) ks.forEach(k => { G.job.f[k] = true; }); };
const jadd = (k, n) => G => { if (G.job) G.job.f[k] = (G.job.f[k] || 0) + n; };
const jnum = k => (G.job && G.job.f && G.job.f[k]) || 0;
const JDC = base => G => base + Math.floor((G.char.level - 1) / 2);               // DCs grow with level
/* a job fight: tiers of foes, a fight id for remembering kills, and extras */
const jf = (fid, tiers, more) => G => Object.assign({tiers, fid, flee:G.job && JOBS[G.job.id] ? JOBS[G.job.id].outside : G.scene},
  typeof more === 'function' ? more(G) : (more || {}));
const jclear = fid => G => { if (G.job){ G.job.cleared[fid] = true; } };

/* ---------- the jobs ---------- */
const JOBS = {};
function addJob(j){ JOBS[j.id] = j; }

function jobsDone(){ return Object.keys(JOBS).reduce((s, id) => s + (G.flags['jobdone_' + id] || 0), 0); }
function jobStatus(j){
  if (j.minRep && !repAtLeast(j.minRep)) return {lock:`Needs ${repName(j.minRep)} standing`};
  if (j.minLevel && G.char.level < j.minLevel) return {lock:`Level ${j.minLevel}+`};
  const done = G.flags['jobdone_' + j.id] || 0;
  if (done && !j.repeat) return {lock:'Done'};
  return {ok:true, done};
}
function jobPitch(j){
  const lv = G.char.level, done = G.flags['jobdone_' + j.id] || 0;
  return `<b>${esc(j.title)}</b>, for ${esc(j.sponsor)}. ${j.blurb}<br><br>Pay: about <b>${j.pay * lv} gold</b> and ${j.xp * lv} XP at your level. Standing: +${done ? Math.ceil(j.rep / 2) : j.rep}${done ? ' (you have done this one before)' : ''}.${j.reward && !done ? ` Bonus: ${ITEMS[j.reward].name}.` : ''}`;
}
function jobBoardIntro(G){
  if (G.job) return `Your name is already chalked next to <b>${esc(JOBS[G.job.id].title)}</b>. Della won't give you a second job until you finish or quit that one.`;
  return `The board is crowded with notices. Della's chalk marks show which ones are open to someone of your standing (${repName()}).`;
}
function jobBoard(G){
  if (G.job) return [
    {label:`Head back to the job: ${JOBS[G.job.id].title}`, go:JOBS[G.job.id].outside},
    {label:'Quit the job', tag:'No pay, no penalty', fn:() => quitJob()},
    {label:'Step away from the board', text:'You leave the board for now.'}
  ];
  const opts = Object.values(JOBS).map(j => {
    const st = jobStatus(j);
    if (st.lock) return {label:j.title, tag:st.lock, stay:true,
      text:st.lock === 'Done' ? `Della has already crossed this one off. "That one's finished, thanks to you."` : `${j.blurb} <em>${st.lock}.</em>`};
    return {label:j.title, tag:`${j.kind} · ${j.sponsor}${st.done ? ' · Again' : ''}`, text:() => jobPitch(j),
      choices:[
        {label:'Take the job', fn:() => startJob(j.id)},
        {label:'Look at the other jobs', choices:jobBoard},
        {label:'Step away from the board', text:'You leave the board for now.'}
      ]};
  });
  opts.push({label:'Step away from the board', text:'You leave the board for now.'});
  return opts;
}
function startJob(id){
  const j = JOBS[id];
  G.job = {id, f:{}, killed:{}, cleared:{}, deaths:0};
  log('round', `New job: ${esc(j.title)}`);
  say(j.accept);
  if (j.gift) give({items:j.gift});
  goTo(j.outside);
}
function quitJob(){
  if (!G.job) return;
  const j = JOBS[G.job.id];
  G.job = null;
  say(`You give up on <b>${esc(j.title)}</b> and walk back to the Hall of the Open Road. Della wipes your name off the board without a word of blame. "Some jobs aren't worth dying for. It'll be there if you want it again."`);
  goTo('city_guild');
}
function completeJob(opts){
  opts = opts || {};
  if (!G.job) return;
  const j = JOBS[G.job.id], lv = G.char.level, times = G.flags['jobdone_' + j.id] || 0;
  const gold = Math.round(j.pay * lv * (opts.goldMult || 1)) + (opts.gold || 0);
  const xp = j.xp * lv;
  const rep = (times ? Math.ceil(j.rep / 2) : j.rep) + (opts.rep || 0);
  G.flags['jobdone_' + j.id] = times + 1;
  G.job = null;
  goTo('city_guild', true);
  log('round', `Job complete: ${esc(j.title)}`);
  say(opts.text || j.done);
  const items = {};
  if (j.reward && !times) items[j.reward] = 1;
  give({gold, xp, items});
  gainRep(rep);
  render(); autosave();
}
/* dying on a job: the guild drags you out */
function jobRescue(){
  const j = JOBS[G.job.id];
  G.job.deaths = (G.job.deaths || 0) + 1;
  G.down = null; G.combat = null; G.mode = 'explore';
  G.char.hp = 1;
  if (G.ally && G.ally.hp <= 0) G.ally.hp = 1;
  const lost = Math.floor(G.char.gold / 10);
  G.char.gold -= lost;
  log('bad', '<b>You should have died.</b>');
  say(`${j.rescue || 'Guild runners find you and drag you clear.'} You wake just outside with 1 hit point${lost ? `, ${lost} gold lighter after paying the runners` : ''}. The foes you killed are still dead. The job is still yours, if you want to go back in.`);
  goTo(j.outside, true);
}
/* the scene just outside each job */
function outsideScene(id, def){
  const j = JOBS[id];
  STORY[j.outside] = Object.assign({chapter:'job_' + id, job:id, area:'town', rest:'short'}, def, {
    options:[
      ...(def.options || []),
      {label:'Return to Aldermere (the job stays yours)', go:'city_square'}
    ]
  });
}
const jscene = (id, sid, def) => { STORY[sid] = Object.assign({chapter:'job_' + id, job:id, rest:false}, def); };
const DONE_OPT = (label, opts) => ({label, tag:'Finish the job', fn:G => completeJob(typeof opts === 'function' ? opts(G) : opts)});

/* =====================================================================
   1. RATS IN THE UNDERCROFT (clean-up)
   ===================================================================== */
addJob({id:'sewer', title:'Rats in the Undercroft', kind:'Clean-up', sponsor:'City Works', rep:5, pay:12, xp:50, repeat:true,
  outside:'j_sewer_out', goal:'Clear the rats out of the Undercroft sewers and find out what is drawing them.',
  blurb:`Something is breeding rats in the old Undercroft sewers faster than the rat-catchers can kill them. Clear the tunnels and find the cause.`,
  accept:`Della hands you a brass token stamped with a rat. "Show that to Gaffer Penn at the Sluice Gate. Hold your nose."`,
  done:`Gaffer Penn sends word that the rats are thinning already. Della counts out your pay. "Not glamorous. Necessary. The city notices necessary."`,
  rescue:`Gaffer Penn and two rat-catchers haul you up the ladder by your belt.`});
outsideScene('sewer', {
  title:'The Sluice Gate', short:'Sluice Gate',
  text:`Gaffer Penn, the sewer warden, is a small bent man with a lantern and a terrier. "Down the ladder, follow the squeaking. They come from the old cistern and further. Don't touch the grey slime. Ever."`,
  back:`The Sluice Gate. Penn's terrier growls down the ladder.`,
  options:[{label:'Climb down into the Undercroft', go:'j_sewer_1'}]
});
jscene('sewer', 'j_sewer_1', {
  title:'The Undercroft Tunnels', area:'sewer',
  text:`Brick tunnels, knee-deep in black water. Your light catches a hundred small eyes, and then the squeaking stops all at once.`,
  back:G => jc('sw1') ? `The tunnel is quiet now, apart from the drip of water.` : `The tunnels squirm with rats.`,
  options:[
    {label:'Fight the rats', tag:'Fight', if:G => !jc('sw1'),
     fight:jf('sw1', {1:['rat','rat'], 3:['rat_swarm','rat','rat'], 5:['rat_swarm','rat_swarm','ghoul']}, {rout:1})},
    {label:'Search the side passage', if:joff('sw_search'), check:{skill:['investigation','perception'], dc:JDC(11),
      pass:{text:`Behind a loose grate: an old smuggler's tin with coins inside.`, fn:jset('sw_search'), give:{gold:'2d6'}},
      fail:{text:`Just slime and bones.`, fn:jset('sw_search')}}},
    {label:'Follow the squeaking deeper', if:G => jc('sw1'), go:'j_sewer_2'},
    {label:'Climb back to the Sluice Gate', go:'j_sewer_out'}
  ]
});
jscene('sewer', 'j_sewer_2', {
  title:'The Flooded Cistern', area:'sewer',
  text:`A vaulted cistern, flooded to the waist. A narrow ledge runs round the wall. On the far side, a pale grey sheen moves on the water that is not the water.`,
  back:G => jc('sw2') ? `The cistern is still. Only ripples.` : `The grey sheen drifts on the water.`,
  options:[
    {label:'Edge along the narrow ledge', if:joff('crossed'), check:{skill:'acrobatics', dc:JDC(11),
      pass:{text:`You make it round without a splash.`, fn:jset('crossed')},
      fail:{text:`You slip and go in up to your neck. Something stings.`, fn:jset('crossed'), damage:{dice:'1d6', type:'acid'}}}},
    {label:'Wade straight across', if:joff('crossed'), check:{skill:'athletics', dc:JDC(10),
      pass:{text:`You force your way through the cold water.`, fn:jset('crossed')},
      fail:{text:`The current drags you under for a moment and slams you into the wall.`, fn:jset('crossed'), damage:{dice:'1d6', type:'bludgeoning'}}}},
    {label:'Burn or fight the grey ooze', tag:'Fight', if:G => !jc('sw2') && jon('crossed')(G),
     fight:jf('sw2', {1:['ooze_small'], 3:['gray_ooze','ooze_small'], 5:['gray_ooze','gray_ooze','rat_swarm']})},
    {label:'Push on toward the nest', if:G => jc('sw2'), go:'j_sewer_3'},
    {label:'Go back up the tunnels', go:'j_sewer_1'}
  ]
});
jscene('sewer', 'j_sewer_3', {
  title:'The Nest', area:'sewer',
  text:`A collapsed grain chute from the city granary pours spilled wheat into a great chamber. The rats have built a mound of it, and on top of the mound sits something much bigger than a rat.`,
  back:G => jc('sw3') ? `The nest is broken. Spilled grain everywhere.` : `The mound of grain heaves with life.`,
  options:[
    {label:'Smoke them out with a torch', if:G => has('torch') && joff('smoked')(G) && !jc('sw3'), check:{skill:['survival','nature'], dc:JDC(12),
      pass:{text:`You wedge burning rags into the chute. Rats pour out choking, and the big one blunders right at you, blinded.`, fn:G => { takeItem('torch'); jset('smoked')(G); }},
      fail:{text:`The smoke blows back in your face. They know you are here now.`, fn:G => { takeItem('torch'); jset('smoked_fail')(G); }}}},
    {label:'Attack the nest', tag:'Boss', if:G => !jc('sw3'),
     fight:jf('sw3', {1:[{key:'rat', name:'The Rat Mother', hp:16, xp:75, boss:true}], 3:[{key:'crocodile', name:'Old Snapper', hp:30, boss:true}, 'rat_swarm'], 5:[{key:'ghoul', name:'The Gnawing King', hp:40, boss:true}, 'rat_swarm', 'rat_swarm'], 7:[{key:'ghoul', name:'The Gnawing King', hp:60, boss:true}, 'ghoul', 'rat_swarm', 'rat_swarm']},
       G => ({surprise:jon('smoked')(G) ? 'player' : null, win:{text:`The nest is finished. You shovel spilled grain away from the broken chute so the city can seal it.`}}))},
    DONE_OPT('Climb out and report the broken grain chute', null)
  ].map(o => o.tag === 'Finish the job' ? Object.assign(o, {if:G => jc('sw3')}) : o)
});

/* =====================================================================
   2. THE HEDGE-WITCH'S LIST (gathering)
   ===================================================================== */
addJob({id:'herbs', title:"The Hedge-Witch's List", kind:'Gathering', sponsor:'Granny Wick, herbalist', rep:4, pay:10, xp:40, repeat:true,
  outside:'j_herbs_out', goal:'Gather moonwort, bog myrtle, and a heron feather from the water meadows.',
  blurb:`Granny Wick needs moonwort, bog myrtle, and a grey heron's feather from the water meadows south of the city. Frogs, mud, and worse.`,
  accept:`"Granny Wick? She delivered half this city," Della says. "Including me. Don't let her down."`,
  done:`Granny Wick sniffs every herb, holds the feather up to the light, and pronounces it "adequate", which Della says is the highest praise she has ever given anyone.`,
  rescue:`A pair of eel-fishers spot you face down in the reeds and drag you to the lane.`});
outsideScene('herbs', {
  title:'Willowbank Lane', short:'Willowbank Lane',
  text:`At the end of Willowbank Lane, a tiny old woman in three shawls hands you a basket. "Moonwort grows on the dry hummocks. Myrtle in the wet. Feathers on Heronry Island. Don't kill the herons, I'll know."`,
  options:[{label:'Walk out into the water meadows', go:'j_herbs_1'}]
});
const HERBS_HAVE = G => ['moonwort', 'myrtle', 'feather'].filter(k => jon(k)(G)).length;
jscene('herbs', 'j_herbs_1', {
  title:'The Water Meadows', area:'jobwild',
  text:G => `Mist on flat green water, tussocks, and a thousand frogs singing. You have ${HERBS_HAVE(G)} of 3 things on Granny's list.`,
  options:[
    {label:'Search the hummocks for moonwort', if:joff('moonwort'), check:{skill:['nature','survival'], dc:JDC(10),
      pass:{text:`Silver-backed leaves shaped like little moons. You cut a good bunch.`, fn:jset('moonwort')},
      fail:{text:`You grab a handful of something silvery. Nettles. Your hands burn.`, damage:{dice:'1d4', type:'poison'}}}},
    {label:'Wade into the reeds for bog myrtle', if:joff('myrtle'), check:{skill:['nature','athletics'], dc:JDC(11),
      pass:{text:`You find the myrtle by its sharp sweet smell, and something big in the water finds you.`, fight:jf('hb1', {1:['frog'], 3:['frog','frog'], 5:['crocodile','frog','frog']}, {win:{fn:jset('myrtle'), text:`You pick the myrtle in peace.`}})},
      fail:{text:`The mud takes one of your boots and nearly your dignity. You find no myrtle.`}}},
    {label:'Pole a punt out to Heronry Island', if:joff('feather'), go:'j_herbs_2'},
    DONE_OPT("Take the basket back to Granny Wick", null)
  ].map(o => o.tag === 'Finish the job' ? Object.assign(o, {if:G => HERBS_HAVE(G) === 3}) : o)
});
jscene('herbs', 'j_herbs_2', {
  title:'Heronry Island', area:'jobwild',
  text:`Grey herons stand in the shallows like old men in coats. Their nests crown the willows. Something long and scaled lies very still on the mud bank.`,
  options:[
    {label:'Creep up quietly and find a fallen feather', if:joff('feather'), check:{skill:['stealth','animal'], dc:JDC(11),
      pass:{text:`You slip between the herons and find a long grey feather on the moss. Not one bird stirs.`, fn:jset('feather')},
      fail:{text:`The herons explode into the air, honking, and the scaled thing on the bank opens one yellow eye.`,
            fight:jf('hb2', {1:[{key:'frog', name:'Bad-Tempered Bullfrog'}], 3:['crocodile','crocodile'], 5:[{key:'crocodile', name:'Old Grandmother Croc', hp:60, boss:true}, 'crocodile']},
              {win:{fn:jset('feather'), text:`When the herons settle again, there are feathers everywhere. You take the best one.`}})}}},
    {label:'Pole back to the meadows', go:'j_herbs_1'}
  ]
});

/* =====================================================================
   3. SURVEY THE OLD MILL ROAD (scouting)
   ===================================================================== */
addJob({id:'scout', title:'Survey the Old Mill Road', kind:'Scouting', sponsor:'the Town Council', rep:6, pay:14, xp:60, repeat:true,
  outside:'j_scout_out', goal:'Survey the Old Mill Road. Every finding you report earns more pay.',
  blurb:`The council wants to reopen the Old Mill Road to the west. They need a survey: the ridge, the ford, the burned mill, and whatever has moved in. More findings, more pay.`,
  accept:`Della hands you a leather map case and a stick of charcoal. "Mark everything. Councilors love marks."`,
  done:`The council clerk unrolls your map, counts your marks, and pays by the mark. Della looks pleased. "They'll send road crews by spring."`,
  rescue:`A council road crew finds you in a ditch and carts you back to the milestone.`});
outsideScene('scout', {
  title:'The Mill Road Milestone', short:'Mill Road Milestone',
  text:G => `A mossy milestone marks where the old road leaves the river. Beyond it, the road is mostly grass. Survey findings so far: ${jnum('pts')}.`,
  options:[{label:'Head west along the old road', go:'j_scout_1'}]
});
const SCOUT_OK = G => jnum('pts') >= 2;
jscene('scout', 'j_scout_1', {
  title:'Cobble Ridge', area:'jobwild',
  text:G => `A ridge of old cobbles and gorse overlooks the valley. Survey findings so far: ${jnum('pts')}.`,
  options:[
    {label:'Map the valley from the high rock', if:joff('ridge'), check:{skill:['survival','perception'], dc:JDC(11),
      pass:{text:`From the rock you can see the whole road: the ford, the mill, and fresh smoke rising beyond it. You mark it all.`, fn:G => { jset('ridge')(G); jadd('pts', 1)(G); }},
      fail:{text:`Mist rolls in and hides everything. You sketch what you can.`, fn:jset('ridge')}}},
    {label:'Inspect the old watchtower', if:joff('tower'), check:{skill:['investigation','history'], dc:JDC(12),
      pass:{text:`The tower is sound. A little mortar and it could be a toll post again. You note it carefully.`, fn:G => { jset('tower')(G); jadd('pts', 1)(G); }, give:{gold:'1d6'}},
      fail:{text:`Crumbling stone. You cannot tell whether it is worth saving.`, fn:jset('tower')}}},
    {label:'Go on to the ford', go:'j_scout_2'}
  ]
});
jscene('scout', 'j_scout_2', {
  title:'Ashford Crossing', area:'jobwild',
  text:`The ford is shallow and wide, churned with prints. Big ones.`,
  back:G => jc('sc2') ? `The ford runs clear. The wolves will not be back.` : `The churned mud of the ford.`,
  options:[
    {label:'Read the tracks', if:joff('tracks'), check:{skill:['survival','nature'], dc:JDC(12),
      pass:{text:`Wolves, a pack of them, and they came this way less than an hour ago. They are watching the ford from the alders. You mark the den and get ready.`, fn:G => { jset('tracks', 'warned')(G); jadd('pts', 1)(G); }},
      fail:{text:`A mess of prints. Dogs? Bears? Something.`, fn:jset('tracks')}}},
    {label:'Cross the ford', tag:'Fight', if:G => !jc('sc2'),
     fight:jf('sc2', {1:['wolf'], 3:['wolf','wolf'], 5:['dire_wolf','wolf'], 7:['dire_wolf','dire_wolf','wolf']},
       G => jon('warned')(G) ? {surprise:'player', rout:1} : {ambush:{stealth:3}, rout:1})},
    {label:'Go on to the burned mill', if:G => jc('sc2'), go:'j_scout_3'},
    {label:'Back to the ridge', go:'j_scout_1'}
  ]
});
jscene('scout', 'j_scout_3', {
  title:'The Burned Mill', area:'jobwild',
  text:`A blackened millhouse with a broken wheel. Someone is camping in the ruin: a cookfire, a picket line, voices.`,
  back:G => jc('sc3') ? `The mill camp is empty and cold.` : `Smoke rises from the camp in the ruined mill.`,
  options:[
    {label:'Watch the camp from cover and count them', if:G => joff('counted')(G) && !jc('sc3'), check:{skill:'stealth', dc:JDC(12),
      pass:{text:`You lie in the nettles for an hour. You count every one of them, their weapons, and where they keep the horses. That is worth two marks on any map.`, fn:G => { jset('counted')(G); jadd('pts', 2)(G); }},
      fail:{text:`A twig snaps. Shouts. They are coming out to look.`, fn:jset('counted'),
            fight:jf('sc3', {1:['bandit',{key:'bandit', name:'Camp Boss', hp:16, boss:true}], 3:['gnoll','bandit'], 5:[{key:'bandit_captain', name:'Red Jessa', boss:true}, 'bandit'], 7:[{key:'bandit_captain', name:'Red Jessa', boss:true}, 'gnoll', 'gnoll']},
              {rout:1, captive:'bandit_talk', win:{fn:jadd('pts', 2), text:`The camp is yours. You mark the mill as clear on the map.`}})}}},
    {label:'Drive them out of the mill', tag:'Fight', if:G => !jc('sc3'),
     fight:jf('sc3', {1:['bandit',{key:'bandit', name:'Camp Boss', hp:16, boss:true}], 3:['gnoll','bandit'], 5:[{key:'bandit_captain', name:'Red Jessa', boss:true}, 'bandit'], 7:[{key:'bandit_captain', name:'Red Jessa', boss:true}, 'gnoll', 'gnoll']},
       {rout:1, captive:'bandit_talk', win:{fn:jadd('pts', 2), text:`The camp is yours. You mark the mill as clear on the map.`}})},
    {label:'Go back to the ford', go:'j_scout_2'},
    {label:'Take your survey back to Aldermere', tag:'Finish the job', if:SCOUT_OK,
     fn:G => completeJob({goldMult:0.5 + jnum('pts') * 0.2, text:`The clerk counts ${jnum('pts')} findings on your map and pays by the mark.`})}
  ]
});

/* =====================================================================
   4. THE EEL KNOT LEDGER (retrieval)
   ===================================================================== */
addJob({id:'ledger', title:'The Eel Knot Ledger', kind:'Retrieval', sponsor:'Brannoch Trading House', rep:6, pay:15, xp:60,
  outside:'j_ledger_out', goal:'Get the Brannoch ledger back from the Eel Knot smugglers at Warehouse Nine.',
  blurb:`The Eel Knot smugglers stole a ledger from the Brannoch Trading House and are holding it in Warehouse Nine. Get it back. How is up to you.`,
  accept:`"Mira Brannoch will meet you on Wharf Street," Della says. "She'll pretend the ledger is boring. It isn't."`,
  done:`Mira Brannoch takes the ledger, flips through it, and relaxes. Della pays you from the trading house's purse.`,
  rescue:`Dockhands find you floating face up under the pier and fish you out with a boathook.`});
outsideScene('ledger', {
  title:'Wharf Street', short:'Wharf Street',
  text:`Mira Brannoch, sharp and neat in a grey coat, walks you down Wharf Street. "Warehouse Nine. The Eel Knot run it. Their boss is Fen Garrow. The ledger is a record of our shipments. Just shipments. Please don't read it."`,
  options:[{label:'Walk down to Warehouse Row', go:'j_ledger_1'}]
});
const FEN = {1:[{key:'bandit', name:'Fen Garrow', hp:20, boss:true}, 'bandit'], 3:[{key:'spy', name:'Fen Garrow', boss:true}], 5:[{key:'bandit_captain', name:'Fen Garrow', boss:true}, 'bandit'], 7:[{key:'bandit_captain', name:'Fen Garrow', boss:true}, 'thug', 'spy']};
jscene('ledger', 'j_ledger_1', {
  title:'Warehouse Row', area:'docks',
  text:`A row of tarred warehouses on stilts over the water. Number Nine has two guards at the door and a loading hatch on the river side.`,
  back:G => jc('lg1') ? `The front door of Number Nine hangs open.` : `Two Eel Knot guards lounge by the door of Number Nine.`,
  options:[
    {label:'Bribe a dockhand to show you the back way', tag:'5 gp', if:G => G.char.gold >= 5 && joff('inside')(G), take:{gold:5}, fn:jset('inside'),
     text:`The dockhand pockets your coin and shows you a plank walk under the warehouse to the loading hatch.`, go:'j_ledger_2'},
    {label:'Swim round to the loading hatch', if:joff('inside'), check:{skill:['athletics','stealth'], dc:JDC(12),
      pass:{text:`Cold, filthy water. But nobody sees you haul yourself up through the hatch.`, fn:jset('inside', 'sneaked'), go:'j_ledger_2'},
      fail:{text:`A guard spots you splashing. "Oi!"`, fight:jf('lg1', {1:['bandit','bandit'], 3:['thug','bandit'], 5:['thug','spy'], 7:['thug','thug','spy']}, {rout:1, captive:'bandit_talk', win:{fn:jset('inside')}})}}},
    {label:'Walk up to the front door', tag:'Fight', if:G => !jc('lg1') && joff('inside')(G),
     fight:jf('lg1', {1:['bandit','bandit'], 3:['thug','bandit'], 5:['thug','spy'], 7:['thug','thug','spy']}, {rout:1, captive:'bandit_talk', win:{fn:jset('inside')}})},
    {label:'Go inside Warehouse Nine', if:jon('inside'), go:'j_ledger_2'}
  ]
});
jscene('ledger', 'j_ledger_2', {
  title:'Warehouse Nine', area:'docks',
  text:G => jon('sneaked')(G) ? `You crouch in the dark between crates. Below, a lean man with an eel tattooed round his neck is reading a red leather ledger by lamplight: Fen Garrow.` : `Crates to the rafters. A lean man with an eel tattooed round his neck looks up from a red leather ledger. "Brannoch sent you? Brannoch should have sent more of you."`,
  back:G => jon('ledger')(G) ? `Warehouse Nine, quiet now.` : `Fen Garrow and his ledger, in the lamplight.`,
  options:[
    {label:'Lift the ledger while Fen is distracted', if:G => jon('sneaked')(G) && joff('ledger')(G) && joff('tried_lift')(G), check:{skill:'sleight', dc:JDC(13),
      pass:{text:`A rat knocks over a lantern on the far side. Fen turns. When he turns back, the ledger is gone and so are you.`, fn:jset('ledger')},
      fail:{text:`Fen's hand closes on your wrist. "No."`, fn:jset('tried_lift')}}},
    {label:'Talk Fen into handing it over', if:G => joff('ledger')(G) && joff('tried_talk')(G), check:{skill:['persuasion','deception'], dc:JDC(13),
      pass:{text:`You convince Fen that the Wardens are an hour behind you and the ledger will hang him. He tosses it at you and goes out the hatch. "Tell Brannoch we're even."`, fn:jset('ledger')},
      fail:{text:`Fen laughs. "Nice story." He draws a knife.`, fn:jset('tried_talk')}}},
    {label:'Take the ledger by force', tag:'Boss', if:G => joff('ledger')(G) && !jc('lg2'),
     fight:jf('lg2', FEN, G => ({surprise:jon('sneaked')(G) ? 'player' : null, rout:1, captive:'bandit_talk', win:{fn:jset('ledger'), text:`The red ledger lies on the floor where Fen dropped it.`}}))},
    {label:'Read the ledger before you hand it back', if:G => jon('ledger')(G) && joff('read')(G), check:{skill:['investigation','insight'], dc:JDC(12),
      pass:{text:`Not shipments. Bribes. Brannoch has been paying a harbor inspector to look the other way at their own smuggling. The Eel Knot stole it for blackmail.`, fn:jset('read', 'knows')},
      fail:{text:`Columns of numbers. You can't make sense of them.`, fn:jset('read')}}},
    {label:'Return the ledger to Mira Brannoch', tag:'Finish the job', if:jon('ledger'), fn:G => completeJob()},
    {label:'Give the ledger to the Wardens instead', tag:'Finish the job', if:jon('knows'),
     fn:G => completeJob({goldMult:0.5, rep:4, text:`Warden-Captain Brenner reads the ledger twice and whistles. A harbor inspector is arrested by nightfall. Brannoch pays nothing, but the city remembers who did the right thing.`})}
  ]
});

/* =====================================================================
   5. THE DROWNED CHAPEL (undead)
   ===================================================================== */
addJob({id:'chapel', title:'The Drowned Chapel', kind:'Undead', sponsor:'the Chapel of the Morning Light', rep:8, pay:16, xp:70, minRep:10,
  outside:'j_chapel_out', goal:'Lay the dead of the Drowned Chapel to rest.',
  blurb:`The bell of the old chapel on the salt marsh rings at night, and the dead buried there are walking. Mother Rowan wants them laid to rest.`,
  accept:`"Mother Rowan asked for you by name," Della says, surprised. "She sent this along." It is a healing draught from the Chapel's own stores.`, gift:{potion:1},
  done:`Mother Rowan says a prayer for the dead of the old chapel, and another for you. Della pays you from the Chapel's purse, and adds a little of her own.`,
  rescue:`Two sisters of the Morning Light, wading out with lanterns, find you on the causeway and carry you back between them.`});
outsideScene('chapel', {
  title:'The Saltmarsh Causeway', short:'Saltmarsh Causeway',
  text:`The old chapel stands half-sunk in the salt marsh at the end of a crumbling causeway, its bell tower leaning like a tired man. As the sun sets, the bell rings once, by itself.`,
  options:[{label:'Walk out to the chapel', go:'j_chapel_1'}]
});
jscene('chapel', 'j_chapel_1', {
  title:'The Nave', area:'ruins',
  text:`Seawater covers the floor. The pews float. Shapes are standing up out of the water, and they are not breathing.`,
  back:G => jc('ch1') ? `The nave is still. The dead lie quiet in the water.` : `The dead stand waiting in the flooded nave.`,
  options:[
    {label:'Fight the dead', tag:'Fight', if:G => !jc('ch1'),
     fight:jf('ch1', {1:['skeleton'], 3:['zombie','skeleton'], 5:['ghoul','zombie','zombie'], 7:['ghoul','ghoul','zombie','zombie']})},
    {label:'Read the inscription over the altar', if:joff('bell'), check:{skill:['religion','history'], dc:JDC(11),
      pass:{text:`"Let the bell that called the living call the dead home." The bell was blessed. Ring it from the tower with a true prayer, and the dead below will weaken.`, fn:jset('bell')},
      fail:{text:`The letters are worn smooth by salt.`, fn:jset('bell_tried')}}},
    {label:'Climb the bell tower', if:G => jc('ch1'), go:'j_chapel_2'},
    {label:'Go down to the crypt', if:G => jc('ch1'), go:'j_chapel_3'}
  ]
});
jscene('chapel', 'j_chapel_2', {
  title:'The Bell Tower', area:'ruins',
  text:`Rotten stairs spiral up into the dark. The great bronze bell hangs above, green with age.`,
  options:[
    {label:'Climb to the bell', if:joff('top'), check:{skill:'athletics', dc:JDC(11),
      pass:{text:`You reach the top. Wind off the sea, and the whole marsh below.`, fn:jset('top')},
      fail:{text:`A stair gives way and you fall a floor before you catch a beam.`, fn:jset('top'), damage:{dice:'1d6', type:'bludgeoning'}}}},
    {label:'Pray and ring the bell', if:G => jon('top')(G) && jon('bell')(G) && joff('rung')(G), fn:jset('rung'), give:{insp:true},
     text:`You pray and pull the rope. The bell's voice rolls out over the marsh, deep and clean, and from the crypt below comes a long, hollow wail.`},
    {label:'Ring the bell anyway', if:G => jon('top')(G) && !jon('bell')(G) && joff('rung')(G), fn:jset('rung_noise'),
     text:`The bell clangs. Nothing much happens, except your ears ring.`},
    {label:'Go back down to the nave', go:'j_chapel_1'}
  ]
});
jscene('chapel', 'j_chapel_3', {
  title:'The Crypt', area:'ruins',
  text:G => `Stone shelves of the dead, half underwater. At the end, in rotted vestments, stands the old deacon who drowned with his chapel.${jon('rung')(G) ? ' He is bent and shaking. The bell has hurt him.' : ''}`,
  back:G => jc('ch3') ? `The crypt is quiet. You have laid them to rest.` : `The drowned deacon waits.`,
  options:[
    {label:'Face the drowned deacon', tag:'Boss', if:G => !jc('ch3'),
     fight:jf('ch3', {1:[{key:'skeleton', name:'Deacon Bones', hp:20, boss:true}], 3:[{key:'ghoul', name:'The Drowned Deacon', hp:30, boss:true}, 'zombie'], 5:[{key:'wight', name:'The Drowned Deacon', boss:true}], 7:[{key:'wight', name:'The Drowned Deacon', boss:true}, 'ghoul']},
       G => ({weaken:jon('rung')(G) ? 0.6 : null, noFlee:false, win:{text:`The deacon crumbles. You straighten the bones on their shelves and say the old words of committal over them.`}}))},
    DONE_OPT('Walk back to Aldermere with the news', null),
    {label:'Go back up to the nave', go:'j_chapel_1'}
  ].map(o => o.tag === 'Finish the job' ? Object.assign(o, {if:G => jc('ch3')}) : o)
});

/* =====================================================================
   6. SILK FOR THE WEAVERS (hunting)
   ===================================================================== */
addJob({id:'silk', title:'Silk for the Weavers', kind:'Hunting', sponsor:"the Weavers' Guild", rep:7, pay:16, xp:70, minRep:10, minLevel:3, repeat:true,
  outside:'j_silk_out', goal:'Bring back golden spider silk from the Thornwood hollow.',
  blurb:`Giant spiders spin golden silk in a hollow of the Thornwood, and the Weavers' Guild pays well for it. The spiders do not want to sell.`,
  accept:`"Bring as much as you can carry," Della says. "The Weavers pay by the skein."`,
  done:`The Weavers' factor weighs your silk and pays by the skein. Della grins. "Every lady at the Lady Mayor's ball is going to be wearing your spider."`,
  rescue:`A charcoal burner finds you wrapped in silk at the edge of the wood and cuts you free.`});
outsideScene('silk', {
  title:'Thornwood Edge', short:'Thornwood Edge',
  text:G => `The Thornwood is dark even at noon. Golden threads glint between the trees. Skeins of silk so far: ${jnum('silk')}.`,
  options:[{label:'Go into the hollow', go:'j_silk_1'}]
});
jscene('silk', 'j_silk_1', {
  title:'The Webbed Hollow', area:'jobwild',
  text:G => `Webs as big as sails, glowing gold where the light hits them. Something heavy shifts in the canopy. Skeins so far: ${jnum('silk')}.`,
  back:G => `The webbed hollow. Skeins so far: ${jnum('silk')}.`,
  options:[
    {label:'Cut silk from the outer webs', if:G => jnum('silk') < 3 && joff('cut_fail')(G), check:{skill:['sleight','acrobatics'], dc:JDC(12),
      pass:{text:`You wind a skein of golden silk onto your arm without a single thread twitching.`, fn:jadd('silk', 1)},
      fail:{text:`The web shivers. Every thread in the hollow shivers. They are coming.`, fn:jset('cut_fail'),
            fight:jf('sk1', {3:['giant_spider'], 5:['giant_spider','giant_spider'], 7:['giant_spider','giant_spider','giant_spider']}, {win:{fn:G => { jadd('silk', 1)(G); G.job.f.cut_fail = false; }, text:`With the hunters dead, you cut silk freely.`}})}}},
    {label:'Go deeper, toward the brood chamber', go:'j_silk_2'},
    {label:'Take your silk back to the Weavers', tag:'Finish the job', if:G => jnum('silk') >= 1,
     fn:G => completeJob({goldMult:0.5 + jnum('silk') * 0.25 + (jc('sk2') ? 0.5 : 0), text:`You bring back ${jnum('silk')} skein${jnum('silk') === 1 ? '' : 's'}${jc('sk2') ? ' and the Broodmother\'s golden heart-thread' : ''}.`})}
  ]
});
jscene('silk', 'j_silk_2', {
  title:'The Brood Chamber', area:'jobwild',
  text:`A cave mouth wrapped in silk. Inside, hundreds of egg sacs, and above them, something the size of a cart, very still, watching you with eight eyes.`,
  back:G => jc('sk2') ? `The brood chamber is quiet. The golden heart-thread is yours.` : `The Broodmother waits above her eggs.`,
  options:[
    {label:'Burn the egg sacs with a torch', if:G => has('torch') && joff('burned')(G) && !jc('sk2'), fn:G => { takeItem('torch'); jset('burned')(G); },
     text:`The egg sacs go up like dry paper. The Broodmother shrieks and drops, frantic and careless.`},
    {label:'Fight the Broodmother', tag:'Boss', if:G => !jc('sk2'),
     fight:jf('sk2', {3:[{key:'giant_spider', name:'The Broodmother', hp:40, boss:true}], 5:[{key:'giant_spider', name:'The Broodmother', hp:52, boss:true}, 'giant_spider'], 7:[{key:'giant_spider', name:'The Broodmother', hp:70, boss:true}, 'giant_spider', 'giant_spider']},
       G => ({weaken:jon('burned')(G) ? 0.7 : null, win:{fn:jadd('silk', 2), text:`In the back of the chamber hangs the heart-thread, a rope of pure gold silk. You coil it up.`}}))},
    {label:'Back to the hollow', go:'j_silk_1'}
  ]
});

/* =====================================================================
   7. THE OGRE'S TOLL (bounty)
   ===================================================================== */
addJob({id:'ogre', title:"The Ogre's Toll", kind:'Bounty', sponsor:'the Wardens', rep:8, pay:20, xp:80, minRep:10, minLevel:4,
  outside:'j_ogre_out', goal:'Get the ogre off the Kingsbridge road, one way or another.',
  blurb:`An ogre named Grumbald has taken the old stone bridge on the Kingsbridge road and charges a toll in sheep. The Wardens want him gone, one way or another.`,
  accept:`"One way or another," Della repeats. "The Wardens aren't fussy. I might be."`,
  done:`Warden-Captain Brenner marks the Kingsbridge road open on his map and pays the bounty.`,
  rescue:`A shepherd and his very large dog drag you off the road while Grumbald is busy counting sheep.`});
outsideScene('ogre', {
  title:'The Kingsbridge Road', short:'Kingsbridge Road',
  text:`The Kingsbridge road is empty of carts. A sign nailed to a tree reads, in huge letters: TOLL. 1 SHEP.`,
  options:[{label:'Walk on to the bridge', go:'j_ogre_1'}]
});
const OGRE_DONE = G => jc('og1') || jon('talked')(G);
jscene('ogre', 'j_ogre_1', {
  title:'The Old Stone Bridge', area:'jobwild',
  text:G => OGRE_DONE(G) ? `The bridge is clear.` : `An ogre sits on the parapet of the old stone bridge, gnawing a mutton leg. He is enormous, and his club is a whole young tree. "Toll," he says. "One sheep. You got sheep?"`,
  options:[
    {label:'Tell him the quarry at Redstone pays in food for strong backs', if:G => !OGRE_DONE(G) && joff('tried_talk')(G), check:{skill:'persuasion', dc:JDC(13),
      pass:{text:`Grumbald thinks about it so hard you can hear it. "Food every day? No fighting?" He picks up his club, pats your head, and stomps off toward the hills. Brenner will be amazed.`, fn:jset('talked', 'peace')},
      fail:{text:`"You lie," Grumbald decides. "Toll is sheep. Or you."`, fn:jset('tried_talk')}}},
    {label:'Trick him: "A whole flock is coming, from the other side"', if:G => !OGRE_DONE(G) && joff('tried_trick')(G), check:{skill:'deception', dc:JDC(13),
      pass:{text:`Grumbald lumbers off down the far road looking for his flock. By the time he works it out, the Wardens will have a barricade up.`, fn:jset('talked')},
      fail:{text:`Grumbald squints at the empty road, then at you. "No sheep." He stands up.`, fn:jset('tried_trick')}}},
    {label:'Fight Grumbald', tag:'Boss', if:G => !OGRE_DONE(G),
     fight:jf('og1', {4:[{key:'ogre', name:'Grumbald', hp:45, boss:true}], 6:[{key:'ogre', name:'Grumbald', boss:true}, 'gnoll'], 8:[{key:'ogre', name:'Grumbald', boss:true}, 'ogre']},
       {win:{text:`Grumbald falls across the bridge like a toppled wall.`}})},
    {label:'Search the camp under the bridge', if:G => OGRE_DONE(G) && joff('looted')(G), fn:jset('looted'), give:{gold:'4d6', items:{potion:1}},
     text:`Sheep bones, a cart wheel, a very nice hat, and a sack of coins Grumbald has been collecting from travelers too scared to argue.`},
    {label:'Report to the Wardens', tag:'Finish the job', if:OGRE_DONE,
     fn:G => completeJob(jon('peace')(G) ? {rep:3, text:`Brenner hears that you talked an ogre into honest work and laughs until he has to sit down. "Put that in the city records."`} : null)}
  ]
});

/* =====================================================================
   8. LIGHTS IN THE OLD OBSERVATORY (arcane)
   ===================================================================== */
addJob({id:'tower', title:'Lights in the Old Observatory', kind:'Arcane', sponsor:'the Amberglass Collegium', rep:9, pay:18, xp:80, minRep:10, minLevel:2,
  reward:'starglass',
  outside:'j_tower_out', goal:'Find what is making the lights in the old observatory, and stop it.',
  blurb:`Lights burn in the abandoned Collegium observatory on Starfall Hill, though no one has lived there in a generation. Magister Ashe wants to know why, quietly.`,
  accept:`"Ashe asked for discretion," Della says. "Which means it's worse than he's saying."`,
  done:`Magister Ashe listens to your report with his eyes closed, then thanks you very formally. Della pays you from the Collegium's purse.`,
  rescue:`Two Collegium students, sent to check on you, find you on the hill and haul you out by your boots.`});
outsideScene('tower', {
  title:'Starfall Hill', short:'Starfall Hill',
  text:`The observatory dome sits on a bald hill above the city, cracked like an eggshell. Pale light moves behind its windows.`,
  options:[{label:'Climb the hill and go in', go:'j_tower_1'}]
});
jscene('tower', 'j_tower_1', {
  title:'The Rotunda', area:'ruins',
  text:`A round hall of brass instruments and dust. The suits of armor along the walls turn their empty helms to follow you, and swords lift off their racks by themselves.`,
  back:G => jc('tw1') ? `The guardians stand still now.` : `The guardians are waiting.`,
  options:[
    {label:'Speak the old Collegium watchword', if:G => !jc('tw1') && joff('tried_word')(G), check:{skill:'arcana', dc:JDC(12),
      pass:{text:`You trace a Collegium sigil in the air and speak the watchword Ashe would know. The guardians lower their blades and go still.`, fn:jclear('tw1'), give:{xp:50}},
      fail:{text:`Wrong word. The swords come at you.`, fn:jset('tried_word')}}},
    {label:'Fight the guardians', tag:'Fight', if:G => !jc('tw1'),
     fight:jf('tw1', {2:['flying_sword'], 4:['animated_armor'], 6:['animated_armor','flying_sword','flying_sword'], 8:['animated_armor','animated_armor','flying_sword']})},
    {label:'Climb the orrery stair', if:G => jc('tw1'), go:'j_tower_2'}
  ]
});
jscene('tower', 'j_tower_2', {
  title:'The Orrery Stair', area:'ruins',
  text:`A spiral stair winds around a great brass orrery of the heavens. The door above is sealed, and its lock is the orrery itself: the planets must be set right.`,
  options:[
    {label:'Set the orrery to tonight\'s sky', if:joff('open'), check:{skill:['arcana','investigation'], dc:JDC(13),
      pass:{text:`The last planet clicks into place. Far above, a door swings open.`, fn:jset('open')},
      fail:{text:`Wrong. Lightning crackles down the brass arms.`, damage:{dice:'2d6', type:'lightning', save:{ability:'dex', dc:12, half:true}}}}},
    {label:'Go up to the star chamber', if:jon('open'), go:'j_tower_3'},
    {label:'Back down to the rotunda', go:'j_tower_1'}
  ]
});
jscene('tower', 'j_tower_3', {
  title:'The Star Chamber', area:'ruins',
  text:G => `Under the cracked dome, the great telescope points at nothing. In its lens hangs a shape made of darkness and stolen starlight, feeding.${jon('focused')(G) ? ' It writhes in the beam of moonlight you turned on it.' : ''}`,
  back:G => jc('tw3') ? `The star chamber is dark and ordinary now. The lens is clear.` : `The shade hangs in the lens, feeding.`,
  options:[
    {label:'Turn the great lens to focus moonlight on it', if:G => joff('focused')(G) && !jc('tw3'), check:{skill:['athletics','arcana'], dc:JDC(13),
      pass:{text:`The great lens grinds round. A blade of moonlight falls across the shade, and it screams.`, fn:jset('focused')},
      fail:{text:`The lens is rusted stiff.`, fn:jset('focus_tried')}}},
    {label:'Fight the shade', tag:'Boss', if:G => !jc('tw3'),
     fight:jf('tw3', {2:[{key:'shadow', name:'Starveil Shade', hp:24, boss:true}], 4:[{key:'specter', name:'Starveil Shade', hp:28, boss:true}, 'shadow'], 6:[{key:'specter', name:'Starveil Shade', hp:45, boss:true}, 'shadow', 'shadow'], 8:[{key:'specter', name:'Starveil Shade', hp:60, boss:true}, 'specter', 'shadow', 'shadow']},
       G => ({weaken:jon('focused')(G) ? 0.6 : null, win:{text:`The shade unravels into nothing. Where it hung, the great lens has turned a smoky, starry grey. You pry a small piece of it free.`}}))},
    DONE_OPT('Take the news to Magister Ashe', null)
  ].map(o => o.tag === 'Finish the job' ? Object.assign(o, {if:G => jc('tw3')}) : o)
});

/* =====================================================================
   9. THE APPRENTICE'S MISTAKE (arcane)
   ===================================================================== */
addJob({id:'apprentice', title:"The Apprentice's Mistake", kind:'Arcane', sponsor:'the Amberglass Collegium', rep:10, pay:22, xp:90, minRep:25, minLevel:3,
  outside:'j_app_out', goal:'Save the apprentice Kell from whatever he summoned in the sealed wing.',
  blurb:`A Collegium apprentice named Kell broke into the sealed wing to try a summoning from a forbidden book. Something answered. Ashe wants Kell back alive if possible.`,
  accept:`"Alive if possible," Della says. "Ashe said that twice."`,
  done:`Magister Ashe pays you himself. "The sealed wing is sealed again. Properly, this time."`,
  rescue:`Magister Ashe himself drags you out of the sealed wing and slams the door.`});
outsideScene('apprentice', {
  title:'The Sealed Wing Door', short:'Sealed Wing',
  text:`A door of black oak in the oldest part of the Collegium, chained, with the chains hanging broken. Cold air breathes out under it.`,
  options:[{label:'Go into the sealed wing', go:'j_app_1'}]
});
jscene('apprentice', 'j_app_1', {
  title:'The Old Library', area:'ruins',
  text:`Shelves of chained books. Some of the chains are rattling. The suits of armor that guard the stacks have come alive, and they are not taking orders from anyone.`,
  back:G => jc('ap1') ? `The library is quiet. Dust settles.` : `The guardians stalk the stacks.`,
  options:[
    {label:'Fight the guardians', tag:'Fight', if:G => !jc('ap1'),
     fight:jf('ap1', {3:['flying_sword','flying_sword'], 5:['animated_armor','flying_sword','flying_sword'], 7:['animated_armor','animated_armor','flying_sword','flying_sword']})},
    {label:"Find Kell's notes", if:joff('notes'), check:{skill:['investigation','arcana'], dc:JDC(12),
      pass:{text:`On a reading desk, in a frightened hand: "It wants a body. It promised to teach me. I think I made a mistake. The circle can be broken from outside if you know the binding word: ASHE." Kell named his teacher as the key.`, fn:jset('notes')},
      fail:{text:`Loose pages everywhere, none of them his.`}}},
    {label:'Go on to the summoning room', if:G => jc('ap1'), go:'j_app_2'}
  ]
});
jscene('apprentice', 'j_app_2', {
  title:'The Summoning Circle', area:'ruins',
  text:`A round room, its floor scorched with a circle of chalk and silver. In the middle stands a young man with a book. His eyes are full of shadow, and his voice is not his own. "Another body," it says. "How kind."`,
  back:G => jc('ap2') || jc('ap2b') ? `The circle is broken. The room is just a room.` : `The thing wearing Kell waits in the circle.`,
  options:[
    {label:"Break the circle with Kell's binding word", if:G => jon('notes')(G) && !jc('ap2') && !jc('ap2b') && joff('tried_break')(G), check:{skill:'arcana', dc:JDC(14),
      pass:{text:`You speak the word and scuff the silver line. The shadow tears out of Kell, screaming, and he collapses. The thing pulls its servants out of the dark to fight you.`, fn:jset('saved'),
            fight:jf('ap2b', {3:['shadow'], 5:['specter','shadow'], 7:['specter','specter','shadow']}, {win:{text:`The last shade fades. Kell is breathing.`}})},
      fail:{text:`The word catches in your throat. The thing in Kell laughs.`, fn:jset('tried_break')}}},
    {label:'Call out to Kell, the boy inside', if:G => jon('notes')(G) && !jc('ap2') && !jc('ap2b') && joff('tried_call')(G), check:{skill:'persuasion', dc:JDC(14),
      pass:{text:`"Kell. Ashe sent me. He wants you home." The shadow flickers. For a moment the boy fights back, and the thing is weaker for it.`, fn:jset('reached')},
      fail:{text:`Nothing of Kell answers.`, fn:jset('tried_call')}}},
    {label:'Fight the thing wearing Kell (strike to subdue to spare him)', tag:'Boss', if:G => !jc('ap2') && !jc('ap2b'),
     fight:jf('ap2', {3:[{key:'acolyte', name:'Kell (possessed)', hp:24, boss:true}, 'shadow'], 5:[{key:'cult_fanatic', name:'Kell (possessed)', hp:45, boss:true}, 'shadow'], 7:[{key:'cult_fanatic', name:'Kell (possessed)', hp:60, boss:true}, 'shadow', 'shadow'], 11:[{key:'mage', name:'Kell (possessed)', boss:true}, 'specter']},
       G => ({weaken:jon('reached')(G) ? 0.6 : null, captive:'kell', win:{text:`The shadow tears out of Kell and shreds into nothing. Whether he lives depends on how you fought.`}}))},
    DONE_OPT('Carry Kell back to Magister Ashe', G => (G.captive === 'kell' ? (G.captive = null, jset('saved')(G)) : 0, jon('saved')(G)) ? {rep:3, text:`Kell wakes in the Collegium infirmary and asks for Ashe. Ashe holds his hand and says nothing for a very long time. Then he looks at you. "Thank you."`} : null)
  ].map(o => o.tag === 'Finish the job' ? Object.assign(o, {if:G => jc('ap2') || jc('ap2b')}) : o)
});

/* =====================================================================
   10. HUNT THE OWLBEAR (hunting)
   ===================================================================== */
addJob({id:'owlbear', title:'Hunt the Owlbear', kind:'Hunting', sponsor:'Farmer Tull', rep:10, pay:22, xp:90, minRep:25, minLevel:5,
  outside:'j_owl_out', goal:'Track down the owlbear raiding Tull\'s farm.',
  blurb:`Something is tearing apart cattle on the Tull farm east of the city. The prints are part bear, part bird. Farmer Tull wants it dealt with.`,
  accept:`"Owlbear," Della says. "Don't hug it."`,
  done:`Farmer Tull pays in coin and a smoked ham. Della takes the ham.`,
  rescue:`Farmer Tull and his sons find you in the orchard and cart you home in a wheelbarrow.`});
outsideScene('owlbear', {
  title:"Tull's Orchard", short:"Tull's Orchard",
  text:`Broken fences, a gutted cow, and claw marks on an apple tree higher than your head. Farmer Tull stands with a pitchfork and no intention of using it.`,
  options:[{label:'Follow the trail into the woods', go:'j_owl_1'}]
});
jscene('owlbear', 'j_owl_1', {
  title:'The Claw-Marked Woods', area:'jobwild',
  text:G => `Oak and bramble. Feathers caught on thorns, and gouges in the bark. ${jnum('trail') >= 2 ? 'You have found the den.' : `Trail found: ${jnum('trail')} of 2.`}`,
  options:[
    {label:'Track the beast', if:G => jnum('trail') < 2, check:{skill:['survival','nature'], dc:JDC(13),
      pass:{text:`Broken branches, a tuft of feathers, a print in the mud. You are on it.`, fn:jadd('trail', 1)},
      fail:{text:`You lose the trail, and something else finds you: wolves, drawn by the blood.`,
            fight:jf('ow1', {5:['wolf','wolf','wolf'], 7:['dire_wolf','dire_wolf'], 9:['dire_wolf','dire_wolf','dire_wolf']}, {rout:1})}}},
    {label:'Go to the den', if:G => jnum('trail') >= 2, go:'j_owl_2'}
  ]
});
jscene('owlbear', 'j_owl_2', {
  title:'The Den', area:'jobwild',
  text:`A cave under the roots of a fallen oak, ringed with bones. A smell like a wet barn. From inside comes a sound like an owl hooting, if the owl was the size of a horse.`,
  back:G => jc('ow2') ? `The den is silent.` : `Hooting from the den.`,
  options:[
    {label:'Bait a trap with your rations', if:G => has('ration') && joff('baited')(G) && !jc('ow2'), check:{skill:['survival','nature'], dc:JDC(13),
      pass:{text:`You lay the rations out downwind of a good ambush spot. When it comes out to feed, you will be ready.`, fn:G => { takeItem('ration'); jset('baited')(G); }},
      fail:{text:`It smells you instead of the bait.`, fn:G => { takeItem('ration'); jset('bait_fail')(G); }}}},
    {label:'Fight the owlbear', tag:'Boss', if:G => !jc('ow2'),
     fight:jf('ow2', {5:[{key:'owlbear', hp:45, boss:true}], 7:[{key:'owlbear', boss:true}], 9:[{key:'owlbear', name:'Old Hookbeak', hp:85, boss:true}, 'owlbear']},
       G => ({surprise:jon('baited')(G) ? 'player' : null, win:{text:`The owlbear falls. Inside the den, two fluffy cubs blink at you.`}}))},
    {label:'Take the cubs to the Collegium menagerie', if:G => jc('ow2') && joff('cubs')(G), fn:jset('cubs'),
     text:`You bundle the hooting cubs into a sack. They bite. You decide they are worth it.`},
    {label:'Report to Farmer Tull', tag:'Finish the job', if:G => jc('ow2'),
     fn:G => completeJob(jon('cubs')(G) ? {rep:2, gold:20, text:`The Collegium's keeper of beasts nearly weeps over the cubs and pays you a finder's fee. Farmer Tull is just glad.`} : null)}
  ]
});

/* =====================================================================
   11. THE LADY MAYOR'S COMMISSION (story)
   ===================================================================== */
addJob({id:'mayor', title:"The Lady Mayor's Commission", kind:'Story', sponsor:'Lady Mayor Corinne Hale', rep:20, pay:40, xp:150, minRep:70, minLevel:4,
  reward:'wardstone',
  outside:'j_may_out', goal:'Stop the Blank Masks from stealing the Lantern of Aldermere.',
  blurb:`The Blank Masks plan to steal the Lantern of Aldermere, the city's founding relic, from the Collegium vault tonight. The Lady Mayor wants the one person the whole city trusts standing in their way.`,
  accept:`Della doesn't joke this time. "The Lady Mayor asked for you herself. Go."`,
  done:`The Lady Mayor thanks you before the whole council. The Lantern of Aldermere burns safe in its vault, and the city knows your name.`,
  rescue:`Wardens burst into the vault stair and carry you out under a shield wall.`});
outsideScene('mayor', {
  title:'The Amberglass Vault Door', short:'Vault Door',
  text:`Beneath the Collegium, a stair of black stone leads down to the vault. Two Wardens lie unconscious at the top. Far below, someone is singing a hymn, slightly wrong.`,
  options:[{label:'Go down the vault stair', go:'j_may_1'}]
});
jscene('mayor', 'j_may_1', {
  title:'The Vault Antechamber', area:'ruins',
  text:`A vaulted room of old stone. Figures in grey robes and blank white masks are chiselling at the vault door. They turn as one.`,
  back:G => jc('my1') ? `The antechamber is littered with white masks.` : `The Blank Masks guard the vault door.`,
  options:[
    {label:'Fight the Blank Masks', tag:'Fight', if:G => !jc('my1'),
     fight:jf('my1', {4:['cultist','cultist','cultist','cultist'], 6:[{key:'cult_fanatic', name:'Masked Preacher'}, 'cultist', 'cultist'], 8:[{key:'cult_fanatic', name:'Masked Preacher'}, {key:'cult_fanatic', name:'Masked Preacher'}]},
       {captive:'cultist_talk'})},
    {label:'Go through into the vault', if:G => jc('my1'), go:'j_may_2'}
  ]
});
jscene('mayor', 'j_may_2', {
  title:'The Lantern Vault', area:'ruins',
  text:`A round vault. On a plinth burns the Lantern of Aldermere, a plain iron lamp that has never gone out. The shadows around it are too deep.`,
  back:G => jc('my2') ? `The Lantern burns on, safe.` : `Someone is hiding in the deep shadows by the Lantern.`,
  options:[
    {label:'Search the shadows before you step in', if:G => joff('spotted')(G) && !jc('my2'), check:{skill:'perception', dc:JDC(14),
      pass:{text:`There: a figure in grey, flat against the wall, a blade in each hand. The Grey Hand, the Faceless's own killer. You see them before they see you.`, fn:jset('spotted')},
      fail:{text:`Nothing. Then something.`, fn:jset('spot_fail')}}},
    {label:'Confront the Grey Hand', tag:'Boss', if:G => !jc('my2'),
     fight:jf('my2', {4:[{key:'spy', name:'The Grey Hand', hp:40, boss:true}, 'cultist', 'cultist'], 6:[{key:'spy', name:'The Grey Hand', hp:60, boss:true}, 'cult_fanatic'], 8:[{key:'spy', name:'The Grey Hand', hp:70, boss:true}, 'cult_fanatic', 'cultist'], 11:[{key:'assassin', name:'The Grey Hand', boss:true}, 'cult_fanatic']},
       G => ({surprise:jon('spotted')(G) ? 'player' : null, win:{set:{faceless_lantern:true, cult_lore:true},
         text:`On the Grey Hand you find a letter sealed with a blank mask: "The Sunstone was the first. The Lantern is the second. The third waits where the river ends." The Faceless is collecting the old lights of the world.`}}))},
    DONE_OPT('Report to the Lady Mayor', null)
  ].map(o => o.tag === 'Finish the job' ? Object.assign(o, {if:G => jc('my2')}) : o)
});
CAPTIVES.kell = {name:'apprentice', talk:{text:`Kell opens his eyes. They are his own again, wet and frightened. "Is it gone? I'm sorry. I'm so sorry."`,
  choices:[{label:'Help Kell to his feet', fn:jset('saved'), text:`He leans on you, shaking. "Take me to Ashe. Please."`}]}};
LORE.push({when:G => G.flags.faceless_lantern, text:'The Faceless is collecting the old lights of the world: the Sunstone first, the Lantern of Aldermere second, and a third "where the river ends."'});

/* ---------- random encounters inside job areas (scaled by tier) ---------- */
ENCOUNTERS.sewer = {name:'The Undercroft', alert:true,
  rows:[
    {range:[1,6], label:'Hostile', pick:[
      {text:`Rats boil out of a drain.`, fight:{tiers:{1:['rat','rat'], 3:['rat_swarm'], 5:['rat_swarm','rat_swarm']}}},
      {text:`A grey sheen slides down the wall toward you.`, fight:{tiers:{1:['ooze_small'], 3:['gray_ooze'], 5:['gray_ooze','gray_ooze']}}}
    ]},
    {range:[7,9], label:'Hazard', pick:[
      {text:`The floor gives way into a sump of foul water.`, check:{save:'con', dc:11, pass:{text:`You hold your breath and climb out.`}, fail:{text:`You swallow some. Your stomach heaves.`, damage:{dice:'1d6', type:'poison'}}}}
    ]},
    {range:[10,16], label:'Quiet', pick:[{text:`Dripping. Echoes. A far-off splash.`}, {text:`Your light catches old Collegium sigils scratched into the bricks.`}]},
    {range:[17,20], label:'Find', pick:[{text:`A rat-catcher's lost pouch, still holding a few coins.`, give:{gold:'1d10'}}, {text:`A sealed bottle bobbing in the water: somebody's healing draught.`, give:{items:{potion:1}}}]}
  ]};
ENCOUNTERS.jobwild = {name:'The Wilds', alert:false,
  rows:[
    {range:[1,5], label:'Hostile', pick:[
      {text:`Wolves lope out of the trees.`, fight:{tiers:{1:['wolf'], 3:['wolf','wolf'], 5:['dire_wolf','wolf']}}},
      {text:`A gnoll hunting party, laughing that awful laugh.`, fight:{tiers:{1:[{key:'gnoll', hp:12}], 3:['gnoll'], 5:['gnoll','gnoll'], 7:['gnoll','gnoll','gnoll']}, rout:1}}
    ]},
    {range:[6,8], label:'Hazard', pick:[
      {text:`A rotten log bridge over a stream.`, check:{skill:'acrobatics', dc:11, pass:{text:`You cross lightly.`}, fail:{text:`It snaps. You land hard in the stream.`, damage:{dice:'1d6', type:'bludgeoning'}}}}
    ]},
    {range:[9,15], label:'Quiet', pick:[{text:`Birdsong and wind in the grass.`}, {text:`A hawk circles high overhead.`}]},
    {range:[16,18], label:'Find', pick:[{text:`Silverleaf by a spring.`, give:{items:{poultice:1}}}, {text:`An abandoned camp with a few coins under a stone.`, give:{gold:'2d6'}}]},
    {range:[19,20], label:'Blessing', pick:[{text:`Sunlight breaks through the clouds and warms your face.`, give:{insp:true}}]}
  ]};
ENCOUNTERS.ruins = {name:'Old Ruins', alert:true,
  rows:[
    {range:[1,6], label:'Hostile', pick:[
      {text:`Bones knit together and stand up.`, fight:{tiers:{1:['zombie'], 3:['skeleton','zombie'], 5:['ghoul','zombie']}}},
      {text:`A shadow peels itself off the wall.`, fight:{tiers:{1:[{key:'shadow', hp:10}], 3:['shadow'], 5:['shadow','shadow']}}}
    ]},
    {range:[7,9], label:'Trap', pick:[
      {text:`A pressure plate clicks under your boot.`, check:{save:'dex', dc:12, pass:{text:`You jump clear as darts hiss past.`}, fail:{text:`Darts sting your legs.`, damage:{dice:'2d4', type:'piercing'}}}}
    ]},
    {range:[10,16], label:'Quiet', pick:[{text:`Dust drifts in a shaft of light.`}, {text:`Somewhere, water drips onto stone.`}]},
    {range:[17,20], label:'Find', pick:[{text:`A forgotten offering bowl with old coins in it.`, give:{gold:'2d8'}}, {text:`A stub of a sunwax candle on an old altar.`, give:{items:{candle:1}}}]}
  ]};
ENCOUNTERS.docks = {name:'The Docks', alert:true,
  rows:[
    {range:[1,6], label:'Hostile', pick:[
      {text:`Eel Knot heavies step out from behind the crates.`, fight:{tiers:{1:['bandit'], 3:['thug','bandit'], 5:['thug','thug']}, rout:1, captive:'bandit_talk'}}
    ]},
    {range:[7,9], label:'Hazard', pick:[
      {text:`A cargo net swings loose from a crane.`, check:{save:'dex', dc:12, pass:{text:`You duck.`}, fail:{text:`It knocks you flat.`, damage:{dice:'1d6', type:'bludgeoning'}}}}
    ]},
    {range:[10,17], label:'Quiet', pick:[{text:`Gulls fight over fish heads.`}, {text:`A barge creaks against the pilings.`}]},
    {range:[18,20], label:'Find', pick:[{text:`A smuggler's stash in a loose plank.`, give:{gold:'2d10'}}]}
  ]};
Object.assign(AREA_NAME, {sewer:'The Undercroft', jobwild:'The Wilds', ruins:'Old Ruins', docks:'The Docks'});
