/* =====================================================================
   THORNVALE CHRONICLES : chapter1.js
   Chapter One: The Marsh Road. An original adventure.
   ===================================================================== */
'use strict';

const SKARN = {key:'orc', name:'Skarn Ironjaw', hp:20, xp:200, boss:true};

/* Captives you can question after knocking them out (or catching them). */
const NIB_TALK = {
  text:`Nib straightens his goggles with as much dignity as he can manage.`,
  choices:[
    {label:'Ask about Skarn', stay:true, once:'nib_skarn', text:`"Big Skarn is an orc. A mercenary. Strong as an ox and twice as proud. He has never once lost an arm-wrestle, and he will never refuse one. Never! It is a sickness with him."`, set:{skarn_contest:true, knows_skarn:true}},
    {label:'Ask about the boy', stay:true, once:'nib_boy', text:`"Cellar. The jailer is Grub. She keeps the key on a string around her neck and feeds the boy fish heads. Do not tell Grub that Nib told you."`, set:{knows_jory:true}},
    {label:'Ask who pays Skarn', stay:true, once:'nib_mask', text:`Nib shudders. "A man in a white mask. No face. Smells like candle wax. He comes at night and pays in new silver, and Skarn gets very polite."`, set:{knows_mask:true}},
    {label:'Tie Nib up and leave him', text:`Nib sits obediently among the grain sacks. "Nib will wait here. Nib is very good at waiting."`}
  ]
};
const CAPTIVES = {
  c1_kobold:{name:'kobold', talk:{
    text:G=>`The kobold wakes tied up with its own belt. It glares at you${G.ally ? `, then at ${G.ally.name},` : ''} and decides to be helpful.`,
    choices:[
      {label:'Ask who they work for', stay:true, once:'cap_boss', text:`"Skarn! Big Skarn Ironjaw, in the old toll tower in the marsh. Skarn pays in fish and shinies."`, set:{knows_skarn:true}},
      {label:'Ask about the boy on the pony', stay:true, once:'cap_boy', text:`"Boy is in the tower cellar. Skarn says keep him safe for the masked man. Masked man pays more than fish."`, set:{knows_jory:true, knows_mask:true}},
      {label:'Demand the password for the tower gate', stay:true, once:'cap_pass', check:{skill:['intimidation','persuasion'], dc:10,
        pass:{text:`"Glimmerbright! The word is glimmerbright! Please do not eat me."`, set:{password:true}},
        fail:{text:`The kobold squeezes its eyes shut and hums loudly until you give up.`}}},
      {label:'Let it go', text:`You cut it loose. It runs off into the reeds, away from the tower.`}
    ]}},
  c1_nib:{name:'tinkerer', talk:NIB_TALK}
};

const KOBOLD_AMBUSH = extra => Object.assign({
  foes:['kobold','kobold','kobold'], rout:1, captive:'c1_kobold', win:'c1_willow_after', flee:'c1_road',
  onRout:{text:`The last kobold dives into the reeds and splashes off toward the heart of the marsh. Someone is about to get a warning.`, set:{alarm:true}}
}, extra);
const GATE_FIGHT = surprise => G => ({foes:['kobold','kobold'], surprise: surprise ? 'player' : null, rout:1, captive:'c1_kobold',
  onRout:{text:`The last guard bolts inside, shrieking for Skarn.`, set:{alarm:true}},
  win:{set:{gate_done:true}, go:'c1_courtyard'}, flee:'c1_marsh'});
const JAILER_FIGHT = surprise => ({foes:['kobold','weasel'], surprise: surprise ? 'player' : null, captive:'c1_kobold',
  win:{set:{jailer_done:true}, go:'c1_cells'}, flee:'c1_courtyard'});
const STAIR_FIGHT = {foes:['wkobold','wkobold'], win:{set:{stair_done:true}, go:'c1_top'}, flee:'c1_courtyard'};
const SKARN_FIGHT = surprise => G => {
  const foes = [SKARN];
  if (G.flags.alarm) foes.push('kobold');
  if (G.flags.grub_up) foes.push('kobold');
  return {foes, surprise: surprise ? 'player' : null, win:'c1_victory', noFlee:true};
};

Object.assign(STORY, {
  /* ===================== CHAPTER ONE: THE MARSH ROAD ===================== */
  c1_greywater:{
    chapter:1, title:'The Quill and Mortar, Greywater', area:'town', rest:'both',
    text:`Greywater smells of river mud and woodsmoke. In the yard behind her apothecary, the Quill and Mortar, Marta Quill, a grey-haired halfling with ink on her fingers, is lashing the last crate onto a mule cart.
      <br><br>"Feverwort tincture," she says. "Forty bottles. Bramblewick, up in the Thornvale, has a fever running through it, and their healer is down to boiling willow bark. My grandson Jory rode ahead yesterday to tell them it's coming." She thumps the enormous brown mastiff sprawled under the cart. "Brindle goes with you. He's better company than most people. Get this cart to Sister Agathe in Bramblewick and there's twenty-five gold in it for you."`,
    back:`The Quill and Mortar smells of drying herbs. Marta is grinding something bitter at the counter.`,
    options:[
      {label:'Ask Marta about the road', once:'ask_road', text:`"Marsh Road, then up into the hills. Kobolds have been bold this month, robbing carts in broad daylight. Kobolds don't usually have the nerve. Somebody has been feeding them courage. Or silver."`, set:{knows_trouble:true}},
      {label:'Ask about Jory', once:'ask_jory', text:`"Sixteen and sure he can't die. Took my old pony, Turnip. He'll be at Sister Agathe's with his feet up, if he has any sense. He usually doesn't."`},
      {label:"Browse Marta's shelves", tag:'Shop', shop:'marta', text:`"Potions I brewed myself. They taste like pennies. They work."`},
      {label:'Set out with the cart', if:G=>!G.flags.set_out, set:{set_out:true}, ally:'brindle',
       text:`Brindle heaves himself up, shakes a pint of drool across the yard, and plants himself at your side. Marta waves you off from the gate.`, go:'c1_road'},
      {label:'Head back out on the Marsh Road', if:G=>G.flags.set_out, go:'c1_road'}
    ]
  },

  c1_road:{
    chapter:1, title:'The Marsh Road', area:'wilds', rest:'short',
    text:`The road runs north out of Greywater along the edge of the Hollowmere, a wide grey marsh of reeds and slow water. The cart creaks. Brindle trots ahead, nose down, tail high. By midday the road narrows between banks of willow, and the reeds on either side grow taller than your head.`,
    back:G=>G.flags.willow_done
      ? `The Marsh Road runs north toward the hills. The fallen willow lies just ahead.`
      : `The Marsh Road, hemmed in by tall reeds.`,
    options:[
      {label:'Walk ahead of the cart and scout', if:G=>!G.flags.willow_done, once:'scout', check:{skill:'perception', dc:12,
        pass:{text:`Brindle stiffens and growls low at the reeds. Around the next bend a fresh-cut willow lies across the road, and three small scaly shapes are crouched in the reeds beside it.`, set:{scouted:true}, go:'c1_willow'},
        fail:{text:`Nothing but reeds and frogs, as far as you can tell.`}}},
      {label:'Drive on', if:G=>!G.flags.willow_done, go:'c1_willow'},
      {label:'Go to the fallen willow', if:G=>G.flags.willow_done, go:'c1_willow_after'},
      {label:'Drive on north to Bramblewick', if:G=>G.flags.willow_done && (G.flags.jory_free || G.flags.road_clear), go:'c1_arrive'},
      {label:'Return to Greywater', go:'c1_greywater'}
    ]
  },

  c1_willow:{
    chapter:1, title:'The Fallen Willow', area:'wilds', rest:false,
    text:G=>G.flags.scouted
      ? `A great willow has been chopped down across the road, its stump still weeping sap. Three kobolds crouch in the reeds beside it, slings in their claws, whispering. They have not seen you.`
      : `Around the bend a great willow lies across the road. It did not fall. The stump is fresh and covered in small, busy axe marks. The mule stamps and refuses to go any closer.`,
    back:G=>G.flags.scouted ? `The kobolds are still crouched in the reeds by the fallen willow.` : `The fallen willow blocks the road. The reeds rustle.`,
    options:[
      {label:'Creep up and strike first', if:G=>G.flags.scouted, check:{skill:'stealth', vsFoes:['kobold'],
        pass:{text:`You are among them before they look up.`, fight:KOBOLD_AMBUSH({surprise:'player'})},
        fail:{text:`A kobold's head snaps around. "Big one! Get it!"`, fight:KOBOLD_AMBUSH({})}}},
      {label:'Stand up and roar at them', if:G=>G.flags.scouted, check:{skill:'intimidation', dc:13,
        pass:{text:`Two kobolds shriek and scatter into the marsh. The third freezes, drops its sling, and sits down in the mud with its claws over its eyes. You tie it up.`, set:{alarm:true}, captive:'c1_kobold', give:{xp:75}, go:'c1_willow_after'},
        fail:{text:`They squeal, but they reach for their slings instead of running.`, fight:KOBOLD_AMBUSH({})}}},
      {label:'Climb down and start clearing the tree', if:G=>!G.flags.scouted, fight:KOBOLD_AMBUSH({ambush:{stealth:4}}), text:`You set your shoulder to the trunk. Something in the reeds snickers.`},
      {label:'Stop and study the reeds', if:G=>!G.flags.scouted, once:'study_reeds', check:{skill:'perception', dc:13,
        pass:{text:`There: a tail, a glint of scale, a sling being loaded. Three kobolds are hiding in the reeds beside the tree.`, set:{scouted:true}},
        fail:{text:`While you are squinting at the wrong clump of reeds, the kobolds leap out!`, fight:KOBOLD_AMBUSH({ambush:{stealth:4}})}}},
      {label:'Turn the cart around', go:'c1_road'}
    ]
  },

  c1_willow_after:{
    chapter:1, title:"The Kobolds' Roadblock", area:'wilds', rest:'short',
    onEnter:G=>{ G.flags.willow_done = true; },
    text:`With the kobolds dealt with, you find what they were guarding: a trampled nest in the reeds, a pile of stolen turnips, and a green felt cap with a jay feather in the band. Brindle snuffles the cap and whines. Small clawed tracks and the hoofprints of a pony lead off the road and into the marsh.`,
    back:`The willow lies across the road. The tracks lead off into the marsh.`,
    options:[
      {label:'Pick up the green cap', once:'take_cap', give:{items:{cap:1}}, set:{knows_jory:true}, text:`Jory's cap. Marta said he took her pony. The tracks say the pony did not go willingly.`},
      {label:'Haul the willow off the road', if:G=>!G.flags.road_clear, check:{skill:'athletics', dc:12,
        pass:{text:`You and the mule drag the trunk aside. The road north is open.`, set:{road_clear:true}, give:{xp:25}},
        fail:{text:`It will not budge. Maybe with more rest, or more help.`}}},
      {label:'Hide the cart and follow the tracks into the marsh', go:'c1_marsh',
       text:`You pull the cart in under the willow branches, hobble the mule, and follow the tracks. Brindle leads, nose to the mud.`},
      {label:'Back to the road', go:'c1_road'}
    ]
  },

  c1_marsh:{
    chapter:1, title:'The Hollowmere', area:'marsh', rest:'short',
    text:`The tracks wind through the marsh along half-sunk logs and tussocks of grass. Mist lies low on the black water. After an hour you see it: a square stone tower on an island in the reeds, an old toll tower from the days when this was a trade road. A narrow causeway leads to its gate. Smoke rises from the top.`,
    back:`The Hollowmere spreads around you, reeds and black water. The old toll tower rises out of the mist.`,
    options:[
      {label:'Follow the kobold path to the causeway', if:G=>!G.flags.path_walked, check:{skill:'perception', dc:13,
        pass:{text:`Strung across the path at ankle height is a fishing line hung with a hundred tiny bells. You step over it.`, set:{path_walked:true}, go:'c1_causeway'},
        fail:{text:`Your boot catches a fishing line, and a hundred tiny bells jangle across the water. So much for surprise.`, set:{path_walked:true, alarm:true}, go:'c1_causeway'}}},
      {label:'Take the long way around through the reeds', if:G=>!G.flags.path_walked, check:{skill:'survival', dc:12,
        pass:{text:`You find a route through the reeds that no kobold would ever think to trap.`, set:{path_walked:true}, go:'c1_causeway'},
        fail:{text:`The long way is very long and very wet, and it ends with you waist-deep in sucking mud.`, set:{path_walked:true}, damage:{dice:'1d4', type:'bludgeoning'}, go:'c1_causeway'}}},
      {label:'Go to the causeway', if:G=>G.flags.path_walked, go:'c1_causeway'},
      {label:'Head back to the road', go:'c1_willow_after'}
    ]
  },

  c1_causeway:{
    chapter:1, title:'Hollowmere Tower', area:'marsh', rest:false,
    text:G=>`A narrow stone causeway leads over the water to the tower. Its gate is a rotten door patched with stolen planks and painted with a crude yellow eye. ` + (G.flags.gate_done
      ? `The gate hangs open.`
      : G.flags.alarm
        ? `Two kobold guards stand at the gate with spears, wide awake and staring into the mist.`
        : `Two kobold guards sit by the gate, arguing over a game of knucklebones.`),
    options:[
      {label:'Walk up and speak the password', if:G=>G.flags.password && !G.flags.gate_done,
       text:`"Glimmerbright," you growl. The guards squint at you, at Brindle, and at each other. Then they shrug and haul the gate open. "New hire. Big Skarn is upstairs. Don't feed the weasels."`, set:{gate_done:true}, go:'c1_courtyard'},
      {label:'Slip along the reeds to a gap in the wall', if:G=>!G.flags.gate_done, check:{skill:'stealth', vsFoes:['kobold'],
        pass:{text:`You wade along the foot of the wall until you find a place where the stones have fallen, and slip through into the yard.`, go:'c1_courtyard'},
        fail:{text:`A guard spots the ripples. "Intruder!"`, fight:GATE_FIGHT(false)}}},
      {label:'Rush the gate guards', if:G=>!G.flags.gate_done, fight:G=>GATE_FIGHT(!G.flags.alarm)(G),
       text:G=>G.flags.alarm ? `They see you coming.` : `They are so deep in their argument that you are on them before they look up.`},
      {label:'Swim around to the back of the tower', if:G=>!G.flags.jory_free, check:{skill:'athletics', dc:12, adv:G=>!!G.flags.grate_known,
        pass:{text:`You slip into the cold water and swim around the island. On the north side, half under the surface, an iron grate leads into the cellar. Its bars are rusted thin, and you twist two of them free.`, set:{via_grate:true}, go:'c1_cells'},
        fail:{text:`The current drags you into the reeds, and you scramble out scraped and shivering.`, damage:{dice:'1d4', type:'bludgeoning'}}}},
      {label:'Walk through the open gate', if:G=>G.flags.gate_done, go:'c1_courtyard'},
      {label:'Back into the marsh', go:'c1_marsh'}
    ]
  },

  c1_courtyard:{
    chapter:1, title:'The Tower Yard', area:'tower', rest:false,
    text:`Inside the walls is a muddy yard littered with fish bones and stolen barrels. A cookfire smolders. In a pen of lashed poles, two giant weasels, each as long as a man and twice as mean, snap at each other. A storehouse door stands to the west, steps lead down into a cellar, and an archway opens onto the tower's spiral stair.`,
    back:G=>`The muddy tower yard. ` + (G.flags.weasels_done ? `The weasel pen is quiet.` : `The giant weasels pace their pen and watch you.`),
    options:[
      {label:'Toss the weasels a ration', if:G=>!G.flags.weasels_done && has('ration'), take:{items:{ration:1}}, set:{weasels_done:true}, give:{xp:50},
       text:`The weasels fall on the food and fight over it. When it is gone they curl up, full and sleepy, and ignore you.`},
      {label:'Calm the weasels', if:G=>!G.flags.weasels_done, check:{skill:'animal', dc:13,
        pass:{text:`You hum low and steady until the weasels lie down, eyes half closed.`, set:{weasels_done:true}, give:{xp:50}},
        fail:{text:`The weasels screech and hurl themselves at the poles until the pen gives way. Every kobold in the tower heard that.`, set:{alarm:true}, fight:{foes:['weasel','weasel'], win:{set:{weasels_done:true}, go:'c1_courtyard'}, flee:'c1_causeway'}}}},
      {label:'Search the yard', once:'yard_search', check:{skill:'investigation', dc:12,
        pass:{text:`Under a barrel lid: a kobold's secret stash of shiny things.`, give:{gold:'2d6'}},
        fail:{text:`Fish bones. More fish bones.`}}},
      {label:'Enter the storehouse', go:'c1_storehouse'},
      {label:'Go down to the cellar', go:'c1_cells'},
      {label:'Climb the spiral stair', go:'c1_stair'},
      {label:'Leave by the gate', go:'c1_causeway'}
    ]
  },

  c1_storehouse:{
    chapter:1, title:'The Storehouse', area:'tower', rest:'short',
    text:G=>G.flags.nib_done
      ? `Stolen cargo is stacked to the rafters. Nib's workbench is quiet.`
      : `Stolen cargo is stacked to the rafters: grain sacks, bolts of cloth, a crate of pickled eggs, and a crate stamped QUILL AND MORTAR. At a workbench, a kobold in enormous goggles is building something out of springs and a mousetrap, muttering to himself. He has not noticed you.`,
    options:[
      {label:'Sneak up and grab the tinkerer', if:G=>!G.flags.nib_done, check:{skill:'stealth', vsFoes:['kobold'],
        pass:{text:`You pluck the kobold off his stool by the collar. "Nib surrenders! Nib is a craftsman, not a fighter!"`, set:{nib_done:true}, give:{xp:25}, choices:NIB_TALK.choices},
        fail:{text:`The kobold squeals and snatches up a hammer.`, fight:{foes:[{key:'kobold', name:'Nib'}], captive:'c1_nib', win:{set:{nib_done:true}, go:'c1_storehouse'}, flee:'c1_courtyard'}}}},
      {label:'Attack the tinkerer', if:G=>!G.flags.nib_done, fight:{foes:[{key:'kobold', name:'Nib'}], captive:'c1_nib', win:{set:{nib_done:true}, go:'c1_storehouse'}, flee:'c1_courtyard'}},
      {label:'Open the Quill and Mortar crate', once:'qm_crate', give:{items:{tincture:1}}, set:{extra_medicine:true},
       text:`Packed in straw: ten more bottles of feverwort tincture, stolen from an earlier cart of Marta's. Bramblewick needs these too.`},
      {label:'Search the stolen cargo', once:'cargo_search', check:{skill:'investigation', dc:11,
        pass:{text:`In a merchant's strongbox: a red vial and a few coins.`, give:{items:{potion:1}, gold:5}},
        fail:{text:`Cloth, grain, and a great many pickled eggs.`}}},
      {label:'Back to the yard', go:'c1_courtyard'}
    ]
  },

  c1_cells:{
    chapter:1, title:'The Tower Cellar', area:'tower', rest:false,
    text:G=>{
      if (!G.flags.jailer_done) return (G.flags.via_grate
        ? `You squeeze through the rusted grate and drop into knee-deep water in a dark cellar. `
        : `The steps end in a damp cellar with a few inches of water on the floor. `) +
        `A lantern hangs from a hook. Three cells line the far wall. In one, a lanky boy in a muddy green coat sits on an upturned bucket. Between you and him, a broad kobold with a ring of keys on a string around her neck is feeding fish heads to a giant weasel on a leash.`;
      if (!G.flags.jory_free) return `The jailer is gone. In the cell, the boy in the green coat is on his feet, gripping the bars. "Are you from Gran? Please say you're from Gran."`;
      return `The cellar is empty except for an upturned bucket and a lot of cold water.`;
    },
    options:[
      {label:'Come out of the dark behind them', if:G=>!G.flags.jailer_done && G.flags.via_grate, fight:JAILER_FIGHT(true), text:`They never hear you coming.`},
      {label:'Fight the jailer', if:G=>!G.flags.jailer_done && !G.flags.via_grate, fight:JAILER_FIGHT(false)},
      {label:'Tell her Skarn wants her upstairs', if:G=>!G.flags.jailer_done, check:{skill:'deception', dc:13, adv:G=>!!G.flags.password,
        pass:{text:`The jailer grumbles, hangs her keys on a hook so she will not lose them, and drags the weasel up the steps. "Always Grub. Grub do this. Grub do that."`, set:{jailer_done:true, grub_up:true}},
        fail:{text:`"Skarn never wants Grub," she says, and lets go of the leash.`, fight:JAILER_FIGHT(false)}}},
      {label:'Unlock the cell', if:G=>G.flags.jailer_done && !G.flags.jory_free, set:{jory_free:true, knows_mask:true}, give:{xp:50},
       text:G=>`You unlock the cell and Jory nearly knocks you over. ${G.ally ? `${G.ally.name} nearly knocks Jory over in turn. ` : ''}"They took Turnip! And they took Gran's letter for Sister Agathe. The orc, Skarn, has it upstairs with a pile of other papers. A man in a mask came here two nights ago. No face at all, just a white mask. He paid Skarn to stop every cart going up to the Thornvale."
         <br><br>Jory squares his thin shoulders. "Turnip is tied up behind the tower. I'm taking Turnip, and I'll wait for you at the cart."`},
      {label:'Climb the steps to the yard', go:'c1_courtyard'},
      {label:'Swim back out through the grate', if:G=>G.flags.via_grate, go:'c1_causeway'}
    ]
  },

  c1_stair:{
    chapter:1, title:'The Spiral Stair', area:'tower', rest:false,
    text:G=>G.flags.stair_done
      ? `The stair climbs the inside of the tower wall. The rafters are quiet now.`
      : `A stair spirals up the inside of the tower wall, open to the middle. High in the dark rafters something rustles, and a pebble skitters down past your ear. Winged kobolds are roosting up there with an armload of rocks.`,
    options:[
      {label:'Creep up the stair', if:G=>!G.flags.stair_done, check:{skill:'stealth', vsFoes:['wkobold'],
        pass:{text:`You keep to the wall, one step at a time. The winged kobolds doze on.`, set:{stair_done:true}, go:'c1_top'},
        fail:{text:`A rock whistles past your head. "Up! Up! Drop on it!"`, fight:STAIR_FIGHT}}},
      {label:'Throw a handful of coins into the yard', tag:'5 gp', if:G=>!G.flags.stair_done && G.char.gold>=5, take:{gold:5}, set:{stair_done:true}, give:{xp:50},
       text:`You fling the coins down into the yard. Both winged kobolds dive after the glitter, squabbling, and you climb past.`},
      {label:'Charge up the stair', if:G=>!G.flags.stair_done, fight:STAIR_FIGHT},
      {label:'Climb to the top of the tower', if:G=>G.flags.stair_done, go:'c1_top'},
      {label:'Back down to the yard', go:'c1_courtyard'}
    ]
  },

  c1_top:{
    chapter:1, title:'The Top of the Tower', area:'boss', rest:false, links:['c1_victory'],
    text:G=>`The top floor is open to the sky where the roof has fallen in. Under the rest of it, at a table buried in stolen papers, sits an orc as big as a door, drinking cider from the cask. His jaw is bound with iron bands, and a greataxe leans against his chair. Skarn Ironjaw looks up and grins.` +
      (G.flags.alarm ? ` His kobolds crowd around him with spears ready. He has been waiting for you.` : ` "Huh," he says. "Nobody told me we had guests."`) +
      (G.flags.grub_up ? ` The jailer, Grub, is here too, complaining loudly.` : ''),
    back:`Skarn Ironjaw waits by his table with his greataxe in hand.`,
    options:[
      {label:'Strike before he can stand', if:G=>!G.flags.alarm, check:{skill:'stealth', vsFoes:['orc'],
        pass:{text:`You cross the floor before the cider cup reaches the table.`, fight:SKARN_FIGHT(true)},
        fail:{text:`Skarn kicks the table over and comes up swinging.`, fight:SKARN_FIGHT(false)}}},
      {label:'Challenge him to an arm-wrestle', if:G=>G.flags.skarn_contest, once:'armwrestle',
       text:`"Arm-wrestle," you say, and slap your elbow down on the table. Skarn's eyes light up. "If Skarn wins, you work for Skarn. If you win, Skarn walks." The papers go flying. You lock hands.`,
       check:{skill:'athletics', contest:{name:'Skarn', mod:5},
        pass:{text:`The table groans. Skarn's arm shakes, and shakes, and slams down. He stares at his hand for a long moment. Then he laughs until the rafters rattle. "Fair is fair. Skarn keeps his word." He shoulders his axe, kicks over the cask, and stomps down the stair bellowing at the kobolds to go home.`, set:{skarn_beaten:true}, give:{xp:250}, go:'c1_victory'},
        fail:{text:`Your knuckles hit the wood. "Ha! Now you work for Skarn," he says. You decline. He sighs and picks up his axe. "Then we do it the hard way."`, fight:SKARN_FIGHT(false)}}},
      {label:'Warn him the masked man will betray him', if:G=>G.flags.knows_mask, once:'warn_skarn', check:{skill:'persuasion', dc:15,
        pass:{text:`"He pays you to starve a valley," you say, "and when it is done he will want no witnesses. Who is easier to get rid of than a mercenary?" Skarn chews on that for a long time. "Skarn is a sellsword," he says at last, "not a fool." He takes his axe and his cask and leaves.`, set:{skarn_beaten:true}, give:{xp:250}, go:'c1_victory'},
        fail:{text:`"The masked man pays better than you," Skarn says, and stands.`, fight:SKARN_FIGHT(false)}}},
      {label:'Draw your weapon and fight', fight:SKARN_FIGHT(false)},
      {label:'Back away down the stair', go:'c1_stair', text:`"Run along," Skarn calls after you. "Skarn will be here."`}
    ]
  },

  c1_victory:{
    chapter:1, title:"Skarn's Table", area:'boss', rest:'short',
    onEnter:G=>{ if (!G.flags.c1_loot){ G.flags.c1_loot = true; give({items:{orders:1, potion:1}, gold:'4d6'}); } },
    text:`Skarn's table is covered in stolen papers: bills of sale, a map of every road into the Thornvale with carts marked in red ink, and Marta's letter to Sister Agathe, unopened. Under the cider cask is a strongbox of coins.
      <br><br>One paper is different: heavy cream vellum sealed with black wax, pressed with a blank, featureless mask. <em>"Stop every cart bound for the Thornvale until the new moon. The valley must be desperate enough to open the shrine to us."</em>`,
    back:`Skarn's table, and his scattered papers.`,
    options:[
      {label:'Go down and free Jory', if:G=>!G.flags.jory_free, go:'c1_cells'},
      {label:'Head back to the cart and drive on to Bramblewick', if:G=>G.flags.jory_free, set:{road_clear:true},
       text:`You find Jory waiting at the cart on Turnip, grinning. Between the mule, the pony, and Brindle pulling on a rope, the willow comes off the road at last. You roll north as the light fades.`, go:'c1_arrive'}
    ]
  },

  c1_arrive:{
    chapter:1, title:'Sister Agathe\'s House of Healing', area:'town', rest:'both',
    text:G=>G.flags.jory_free
      ? `By dusk the cart rattles into Bramblewick. The mist lies thick in the lanes, and every chimney is smoking. Sister Agathe, a tall woman with her sleeves rolled to the elbow, meets you at the door of her house of healing and nearly weeps at the sight of the crates. "Forty bottles. The Lord be thanked. That is every child in this village through the week."`
      : `By dusk the cart rattles into Bramblewick. Sister Agathe meets you at the door of her house of healing and nearly weeps at the sight of the crates. Then she looks past you. "Where is Jory? He was meant to be here yesterday."`,
    back:`Sister Agathe's house of healing smells of feverwort and clean linen.`,
    options:[
      {label:'Hand over the medicine', if:G=>!G.flags.delivered, set:{delivered:true}, give:{gold:25, xp:100},
       fn:G=>{ if (G.flags.extra_medicine){ takeItem('tincture'); give({gold:10}); say(`When you add the ten stolen bottles from the tower, Agathe presses an extra ten gold on you and will not hear a word against it.`); } },
       text:`Agathe counts out Marta's twenty-five gold herself, then lays her hand on your head and blesses you before you can object.`},
      {label:'Go back to the marsh for Jory', if:G=>!G.flags.jory_free, go:'c1_road', text:`Agathe presses your hand. "Bring him back."`},
      {label:'Show Agathe the masked orders', if:G=>has('orders') && G.flags.delivered && G.flags.jory_free, go:'c1_end'},
      {label:'Go back to the tower and deal with Skarn', if:G=>!has('orders') && G.flags.delivered && G.flags.jory_free, go:'c1_road', text:`Jory is safe, but whoever is paying the kobolds is still out there. Skarn will know.`}
    ]
  },

  c1_end:{
    chapter:1, title:'End of Chapter One', area:'town', rest:'both',
    onEnter:G=>{ G.flags.c1_done = true; },
    text:G=>`Agathe reads the orders twice by candlelight. "The shrine," she says quietly. "The Dawnwarden shrine, up the valley. Something happened there three nights ago, and the mist came down the same night. The fever came with it." She folds the letter. "Elder Hesta will want to see this. She'll be at the Mossy Kettle."
      <br><br>In the morning Jory rides home to Greywater on Turnip. ${G.ally ? `${G.ally.name} refuses to go with him. Jory laughs. "Gran always said he'd pick his own person. Looks like he has."` : ''}
      <br><br><b>Chapter One: The Marsh Road is complete.</b>`,
    options:[
      {label:'Chapter Two: The Sunken Shrine', tag:'Begin', go:'bramblewick'}
    ]
  }
});
