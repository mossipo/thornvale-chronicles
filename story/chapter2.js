/* =====================================================================
   THORNVALE CHRONICLES : chapter2.js
   Chapter Two: The Sunken Shrine. An original adventure.
   ===================================================================== */
'use strict';

const GORRAK = {key:'hobgoblin', name:'Gorrak', hp:16, boss:true};
const BOSS = surprise => G => {
  let gobs = 1 + (G.flags.alarm ? 1 : 0) - (G.flags.wolf_free ? 1 : 0);
  const foes = [GORRAK];
  for (let i = 0; i < Math.max(0, gobs); i++) foes.push('goblin');
  return {foes, surprise: surprise ? 'player' : null, win:'victory', noFlee:true};
};

const CHAPTER_TWO = {
  /* ===================== CHAPTER TWO: THE SUNKEN SHRINE ===================== */
  bramblewick:{
    title:'The Mossy Kettle, Bramblewick', area:'town', rest:'both',
    text:G=>`Rain drums on the shutters of the Mossy Kettle, the only inn in Bramblewick. Elder Hesta Morrow sets a cup of hot cider in front of you and does not touch her own.
      <br><br>"Three nights ago," she says, "goblins came down out of the Thornvale and broke into the old Dawnwarden shrine. They took the Sunstone. Since then the morning mist has not lifted, and the miller's girl, Wren, went out for herbs and has not come home. Bring back the stone, and bring back Wren if you can. The village can pay fifty gold."`,
    back:G=>{
      if (has('sunstone') && !G.flags.stone_returned) return `You walk into Bramblewick as the sun clears the ridge. Behind you, for the first time in three days, the valley mist is lifting. People come out of their doors to stare at the light in your hands.`;
      if (G.flags.chapter_done) return `The Mossy Kettle is loud with people who have reason to be cheerful. Someone has started calling the corner table yours.`;
      return `The common room of the Mossy Kettle is warm and smells of woodsmoke. Elder Hesta watches the door.`;
    },
    options:[
      {label:'Ask Hesta about the shrine', once:'ask_shrine',
       text:`"The Dawnwardens were holy knights, long gone now. They built the shrine over something they meant to keep sealed. The Sunstone sat on its altar for three hundred years, and nobody touched it. Not even thieves."`, set:{lore_shrine:true}},
      {label:'Watch Hesta closely as she talks', once:'insight_hesta', check:{skill:'insight', dc:12,
        pass:{text:`She is afraid, and not of goblins. "Goblins do not steal holy relics," she admits quietly. "They steal chickens. Someone put them up to this."`, set:{knows_buyer:true}},
        fail:{text:`She looks tired and worried. You learn nothing more.`}}},
      {label:'Give Hesta the Sunstone', if:G=>has('sunstone') && !G.flags.stone_returned,
       fn:G=>{ G.flags.stone_returned = true; takeItem('sunstone'); },
       text:G=>G.flags.wren_free
         ? `Hesta takes the Sunstone in both hands and closes her eyes. Across the square the mill door bangs open and Wren comes running, flour and all, her father close behind. Hesta counts fifty gold into your palm. "Bramblewick will not forget this."`
         : `Hesta takes the Sunstone in both hands and closes her eyes. Then she opens them. "And Wren?" she asks. "Did you find her?" She counts fifty gold into your palm anyway, but her hands shake.`,
       give:{gold:50, xp:100}},
      {label:'Tell Hesta and the miller that Wren is safe', if:G=>G.flags.stone_returned && G.flags.wren_free && !G.flags.wren_reported,
       fn:G=>{G.flags.wren_reported = true;},
       text:`The miller wrings your hand until it hurts and insists you take a little purse of coins. Wren just hugs you.`, give:{gold:10}},
      {label:'Show Hesta the sealed letter', if:G=>G.flags.stone_returned && G.flags.wren_free && has('letter') && !G.flags.chapter_done, go:'chapter_end'},
      {label:"Visit Odda's trading post", go:'shop'},
      {label:'Set out up the Thornvale trail', go:'trail'}
    ]
  },

  shop:{
    title:"Odda's Trading Post", area:'town', rest:false,
    text:`Odda Fennick runs the trading post from behind a counter buried in rope, lamp oil, and jars of pickled things. "Potions from the temple in Greywater," she says, tapping a shelf of red vials. "Not cheap, but cheaper than a funeral."`,
    back:`Odda looks up from her ledger. "Back again? Good. Means you're alive."`,
    options:[
      {label:"Browse Odda's wares", tag:'Shop', shop:'odda', text:`"Weapons on the left, armor on the right, potions behind the counter where sticky fingers can't reach them."`},
      {label:'Ask Odda what she has heard', once:'odda_rumor', text:`"Goblins came through here buying rope and lamp oil with real silver. New silver, minted in the north. Goblins don't have that kind of money. Somebody gave it to them."`, set:{knows_buyer:true}},
      {label:'Go back to the inn', go:'bramblewick'}
    ]
  },

  trail:{
    title:'The Thornvale Trail', area:'wilds', rest:'short',
    text:`The trail climbs into dripping pine and bramble. Goblin tracks are easy to find in the mud: small bare feet, and the drag marks of something heavy. After an hour the path narrows between two walls of thorn.`,
    back:G=>G.flags.ambush_done
      ? `The Thornvale trail winds between the thorn walls. Up ahead, the valley rises toward the shrine.`
      : `The trail narrows between thick walls of thorn. The goblin tracks lead on uphill.`,
    options:[
      {label:'Study the goblin tracks', once:'tracks', if:G=>!G.flags.ambush_done, check:{skill:'survival', dc:11,
        pass:{text:`The tracks split ahead. Two sets turn off the trail and stop in the brambles. Someone is waiting for you.`, go:'ambush_spotted'},
        fail:{text:`The rain has turned the tracks to mush. You cannot tell much.`}}},
      {label:'Press on up the trail', if:G=>!G.flags.ambush_done, check:{skill:'perception', dc:12,
        pass:{text:`A flicker of movement in the thorns ahead. You stop just in time.`, go:'ambush_spotted'},
        fail:{text:`A crude arrow hisses past your ear and two goblins leap out of the brambles, shrieking!`, fight:{foes:['goblin','goblin'], win:'trail_after', flee:'bramblewick'}}}},
      {label:'Continue up to the shrine', if:G=>G.flags.ambush_done, go:'shrine_mouth'},
      {label:'Head back to Bramblewick', go:'bramblewick'}
    ]
  },

  ambush_spotted:{
    title:'An Ambush in the Thorns', area:'wilds', rest:false,
    text:`Two goblins crouch in the thorns ahead, short bows across their knees, bickering in whispers about who gets your boots. They have not seen you.`,
    back:`The two goblins are still hidden in the thorns, still bickering.`,
    options:[
      {label:'Creep up and strike first', check:{skill:'stealth', dc:12,
        pass:{text:`You are among them before they look up.`, fight:{foes:['goblin','goblin'], surprise:'player', win:'trail_after', flee:'trail'}},
        fail:{text:`A twig snaps under your foot. Two heads turn.`, fight:{foes:['goblin','goblin'], win:'trail_after', flee:'trail'}}}},
      {label:'Roar a challenge at them', check:{skill:'intimidation', dc:13,
        pass:{text:`The goblins shriek and bolt into the trees, abandoning their packs.`, give:{xp:50}, go:'trail_after'},
        fail:{text:`They laugh at you and nock their arrows.`, fight:{foes:['goblin','goblin'], win:'trail_after', flee:'trail'}}}},
      {label:'Slip around them through the trees', check:{skill:'stealth', dc:10,
        pass:{text:`You leave the goblins to their argument and climb on toward the shrine.`, set:{ambush_done:true}, go:'shrine_mouth'},
        fail:{text:`A goblin spots you. "There! Get it!"`, fight:{foes:['goblin','goblin'], win:'trail_after', flee:'trail'}}}},
      {label:'Draw your weapon and charge', fight:{foes:['goblin','goblin'], win:'trail_after', flee:'trail'}}
    ]
  },

  trail_after:{
    title:'The Goblins\' Hiding Place', area:'wilds', rest:'short',
    onEnter:G=>{ G.flags.ambush_done = true; },
    text:`Where the goblins waited you find a nest of trampled bracken, gnawed bones, and a scrap of hide with a map scratched into it: the shrine, a long hall, three passages, and a crude skull drawn over the eastern stair.`,
    back:`The goblins' hiding place is empty and smells of wet fur.`,
    options:[
      {label:'Take the goblin map', once:'take_map', give:{items:{map:1}}, text:`You roll it up and tuck it away.`},
      {label:"Search the goblins' gear", once:'search_gobs', check:{skill:'investigation', dc:10,
        pass:{text:`Stuffed in a boot: a pouch of coins stamped with an unfamiliar northern crest.`, give:{gold:'2d4'}, set:{knows_buyer:true}},
        fail:{text:`Rags, bones, and a very old sandwich.`}}},
      {label:'Continue up to the shrine', go:'shrine_mouth'},
      {label:'Head back down the trail', go:'trail'}
    ]
  },

  shrine_mouth:{
    title:'The Dawnwarden Arch', area:'wilds', rest:'short',
    text:G=>`At the head of the valley a sun-shaped arch of grey stone frames a stairway sinking into the hill. Weeds choke carvings of armored knights. ` + (G.flags.sentry_done
      ? `The sentry's brazier has burned down to ash.`
      : `Beside a smoky brazier a goblin sentry sits wrapped in a blanket, nodding off.`),
    back:G=>G.flags.sentry_done
      ? `The arch of the Dawnwarden shrine looms over the stair. The brazier is cold.`
      : `The goblin sentry is still dozing by the brazier.`,
    options:[
      {label:'Sneak past the sentry', if:G=>!G.flags.sentry_done, check:{skill:'stealth', dc:11,
        pass:{text:`You ghost past the snoring goblin and down the stairs.`, set:{sentry_done:true}, go:'hall'},
        fail:{text:`The goblin jerks awake and shrieks!`, fight:{foes:['goblin'], win:{set:{sentry_done:true}, go:'hall'}, flee:'trail'}}}},
      {label:'Attack the dozing sentry', if:G=>!G.flags.sentry_done, fight:{foes:['goblin'], surprise:'player', win:{set:{sentry_done:true}, go:'hall'}, flee:'trail'}},
      {label:'Pose as a Redfang messenger', if:G=>!G.flags.sentry_done, check:{skill:'deception', dc:12,
        pass:{text:`"Gorrak wants a report," you growl. The sentry squints, shrugs, and waves you on. "Captain's in the old chapel past the sun-door. Don't wake the wolf."`, set:{sentry_done:true, knows_gorrak:true}, go:'hall'},
        fail:{text:`"You're not Redfang," the goblin says, and grabs his scimitar.`, fight:{foes:['goblin'], win:{set:{sentry_done:true}, go:'hall'}, flee:'trail'}}}},
      {label:'Descend the stairs', if:G=>G.flags.sentry_done, go:'hall'},
      {label:'Head back down the trail', go:'trail'}
    ]
  },

  hall:{
    title:'The Hall of Dawn', area:'dungeon', rest:'short',
    text:`The Hall of Dawn is a long chamber of cracked pillars. Faded murals show knights carrying a blazing stone down into the dark. Goblin trash covers the floor: bones, rags, a broken drum.
      <br><br>Three ways lead on. A gnawed wooden door to the west rattles as something heavy paces behind it. A stair to the east drops into cold, wet air. To the north stands a great bronze door stamped with a sun.`,
    back:`The Hall of Dawn. West, the gnawed door. East, the wet stair. North, the bronze sun-door.`,
    options:[
      {label:'Study the murals', once:'mural_study', check:{skill:['history','religion'], dc:11,
        pass:{text:`The murals tell how the Dawnwardens sealed a darkness beneath the valley with three stones of captured sunrise. Carved under the last panel is a prayer: <em>"Rest, watchers. The dawn still keeps its vigil."</em>`, set:{mural:true, saw_three:true}},
        fail:{text:`Dust and flaking paint. The story is hard to follow.`}}},
      {label:'Search the hall', once:'hall_search', check:{skill:'investigation', dc:12,
        pass:{text:`Under the broken drum: a goblin's hoard of shiny coins.`, give:{gold:'2d6'}},
        fail:{text:`Only bones and rags.`}}},
      {label:'Open the gnawed west door', go:'kennel'},
      {label:'Descend the east stair', go:'crypt_stair'},
      {label:'Approach the bronze sun-door', go:'sundoor'},
      {label:'Climb back to the surface', go:'shrine_mouth'}
    ]
  },

  kennel:{
    title:'The Kennel', area:'dungeon', rest:false,
    text:G=>{
      if (!G.flags.wolf_done) return `A gaunt grey wolf strains against a chain bolted to the wall. It is starved to its ribs, and it snarls at you with more fear than fury. Behind it, a narrow door is scratched with goblin marks.`;
      if (G.flags.wolf_free) return `The empty chain lies on the floor. The narrow door beyond stands waiting.`;
      if (G.flags.wolf_calm) return `The grey wolf lies with its head on its paws, watching you. Its tail moves once when you come in.`;
      return `The wolf lies still. You are sorry it came to that. The narrow door beyond stands waiting.`;
    },
    options:[
      {label:'Toss the wolf a ration', if:G=>!G.flags.wolf_done && has('ration'), take:{items:{ration:1}},
       text:`The wolf tears into the food, then looks at you for a long moment. Its tail moves once.`, set:{wolf_done:true, wolf_calm:true}, give:{xp:50}},
      {label:'Speak softly and soothe it', if:G=>!G.flags.wolf_done, check:{skill:'animal', dc:13,
        pass:{text:`You crouch low and talk to it the way you would a frightened dog. Slowly the snarl fades.`, set:{wolf_done:true, wolf_calm:true}, give:{xp:50}},
        fail:{text:`The wolf lunges, and the old chain snaps!`, fight:{foes:['wolf'], win:{set:{wolf_done:true}, go:'kennel'}, flee:'hall'}}}},
      {label:'Fight the wolf', if:G=>!G.flags.wolf_done, fight:{foes:['wolf'], win:{set:{wolf_done:true}, go:'kennel'}, flee:'hall'}},
      {label:'Unchain the wolf', if:G=>G.flags.wolf_calm && !G.flags.wolf_free,
       text:`You work the bolt loose. The wolf limps past you and slips into the dark toward the north, nose low. It seems to know exactly where the goblins sleep.`, set:{wolf_free:true}},
      {label:'Try the scratched door', if:G=>G.flags.wolf_done, go:'storeroom'},
      {label:'Back to the Hall of Dawn', go:'hall'}
    ]
  },

  storeroom:{
    title:'The Storeroom', area:'dungeon', rest:'short',
    text:G=>G.flags.wren_free
      ? `Crates, sacks of stolen grain, and the empty cage of woven sticks.`
      : `Crates, sacks of stolen grain, and a cage of woven sticks. Inside the cage a young woman with flour-white hands sits up and stares at you. "You're not a goblin," she whispers. "Please tell me you're not a goblin."`,
    options:[
      {label:'Free Wren from the cage', if:G=>!G.flags.wren_free, check:{skill:['sleight','athletics'], dc:10,
        pass:{text:`The lashings give way and Wren tumbles out. "They took me while I was picking feverfew. Their captain is a hobgoblin called Gorrak. He keeps the Sunstone in the old chapel behind the sun-door, and the key is in the crypt, around the neck of the dead knight. The goblins are too scared to go down there."
          <br><br>She presses something into your hand: a tarnished pendant shaped like the sun. "I found this in my cage. It's warm. I think it wants to go with you." Then she slips away up the stairs toward home.`,
          set:{wren_free:true, knows_gorrak:true}, give:{xp:50, items:{pendant:1}}},
        fail:{text:`The lashings are knotted tight and your hands slip. Somewhere in the halls, a goblin shouts at the noise.`, fn:G=>{ G.alert = Math.min(6, G.alert + 1); }}}},
      {label:'Search the crates', once:'crates', check:{skill:'investigation', dc:10,
        pass:{text:`Among the stolen grain: a vial of red liquid and a few coins.`, give:{items:{potion:1}, gold:5}},
        fail:{text:`Grain, grain, and more grain.`}}},
      {label:'Squeeze through the crawlspace', if:G=>G.flags.crawlspace, text:`You find the gap Snik described behind the sacks and wriggle through a tight, dusty tunnel.`, set:{sneak_in:true}, go:'sanctum'},
      {label:'Back to the kennel', go:'kennel'}
    ]
  },

  crypt_stair:{
    title:'The Drowned Stair', area:'crypt', rest:false,
    text:`The east stair drops into black water. The lower steps are flooded waist-deep, and the cold steals your breath. Somewhere below, water drips onto stone with the patience of centuries.`,
    back:`The flooded stair, cold and black.`,
    options:[
      {label:'Look for another way down', once:'stair_look', check:{skill:'investigation', dc:12,
        pass:{text:`A dry ledge runs along the wall, half hidden behind a rotted banner. You edge along it to the bottom.`, set:{ledge:true}, go:'ossuary'},
        fail:{text:`Nothing but water.`}}},
      {label:'Take the hidden ledge down', if:G=>G.flags.ledge, go:'ossuary'},
      {label:'Wade down through the water', if:G=>!G.flags.ledge, check:{skill:'athletics', dc:10,
        pass:{text:`You wade down, gasping, and climb out at the bottom.`, go:'ossuary'},
        fail:{text:`You slip on a mossy step and crack your shin.`, damage:{dice:'1d4', type:'bludgeoning'}, go:'ossuary'}}},
      {label:'Back up to the Hall of Dawn', go:'hall'}
    ]
  },

  ossuary:{
    title:'The Warden\'s Ossuary', area:'crypt', rest:'short',
    text:G=>G.flags.skel_done
      ? `The round vault is still now. Niches of old bones line the walls. The stone sarcophagus of the knight waits in the center.`
      : `A round vault lined with niches of yellowed bones. In the center lies a stone sarcophagus carved with a knight holding up a sun. As your light touches it, one of the skeletons in the niches turns its skull toward you, then climbs out with a dry rattle. A notched sword hangs in its hand.`,
    options:[
      {label:'Speak the prayer from the mural', if:G=>!G.flags.skel_done && G.flags.mural,
       text:`"Rest, watchers. The dawn still keeps its vigil." The skeleton stops. Slowly it lowers its sword, steps back into its niche, and is still.`, set:{skel_done:true}, give:{xp:50}},
      {label:'Command the dead to rest', if:G=>!G.flags.skel_done, check:{skill:'religion', dc:13,
        pass:{text:`You lift your voice in an old prayer for the dead. The skeleton bows its head and settles back into its niche.`, set:{skel_done:true}, give:{xp:50}},
        fail:{text:`The words come out wrong. The skeleton raises its sword.`, fight:{foes:['skeleton'], win:{set:{skel_done:true}, go:'ossuary'}, flee:'crypt_stair'}}}},
      {label:'Fight the skeleton', if:G=>!G.flags.skel_done, fight:{foes:['skeleton'], win:{set:{skel_done:true}, go:'ossuary'}, flee:'crypt_stair'}},
      {label:'Open the sarcophagus', if:G=>G.flags.skel_done && !G.flags.sarco_open, check:{skill:'athletics', dc:11,
        pass:{text:`The lid grinds aside. The knight inside wears corroded mail, and around the bones of the neck hangs a bronze key shaped like a sunburst. Beside the hand lies a sealed vial and a small purse.`,
          set:{sarco_open:true}, give:{items:{sunkey:1, potion:1}, gold:'3d6'}},
        fail:{text:`The lid is heavy. It shifts a finger's width and stops. You can try again.`}}},
      {label:'Back up the stair', go:'crypt_stair'}
    ]
  },

  sundoor:{
    title:'The Sun-Door', area:'dungeon', rest:false,
    text:`The great bronze door is taller than two men. It has no handle, only a keyhole shaped like a sunburst. Goblin claw marks score the metal around it; they could not open it either. A small servant's door beside it has been forced open and barricaded from the far side with planks.`,
    back:`The bronze sun-door and its barricaded servant's door.`,
    options:[
      {label:'Listen at the door', once:'listen', check:{skill:'perception', dc:10,
        pass:{text:`Two voices, one deep and one squeaky. "The masked ones come at new moon. Then we are rich, and this valley can choke on its fog."`, set:{knows_buyer:true, knows_gorrak:true}},
        fail:{text:`Muffled voices. You cannot make out words.`}}},
      {label:'Unlock it with the Sun Key', if:G=>has('sunkey'),
       text:`The key turns with a deep, sweet chime. The bronze door swings inward without a sound.`, set:{quiet_entry:true}, go:'sanctum'},
      {label:'Pick the sun-lock', if:G=>!has('sunkey') && has('tools'), once:'picklock', check:{skill:'sleight', dc:15,
        pass:{text:`The old lock gives with a soft click. The bronze door swings inward.`, set:{quiet_entry:true}, go:'sanctum'},
        fail:{text:`The lock is ancient and strange. Your picks will not move it.`}}},
      {label:'Smash through the barricaded side door', check:{skill:'athletics', dc:14,
        pass:{text:`Planks splinter and you are through, but the crash echoes off every wall.`, set:{alarm:true}, go:'sanctum'},
        fail:{text:`The barricade holds. On the other side, someone shouts for help.`, set:{alarm:true}}}},
      {label:'Back to the Hall of Dawn', go:'hall'}
    ]
  },

  sanctum:{
    title:'The Chapel of First Light', area:'boss', rest:false, links:['victory'],
    text:G=>{
      let t = `The old chapel is lit by a single brilliant light. On a cracked altar sits the Sunstone, a fist-sized crystal glowing like the first minute of morning. Before it stands a hobgoblin in scaled armor with a long sword at his hip: Gorrak, captain of the Redfang goblins.`;
      t += G.flags.alarm ? ` He is ready for you, and so are his goblins.` : ` A goblin crouches beside him, counting stolen coins.`;
      if (G.flags.sneak_in || G.flags.quiet_entry) t += ` Neither of them has noticed you yet.`;
      if (G.flags.wolf_free) t += `<br><br>A grey shape bursts from the shadows: the wolf you freed! It slams into a goblin and drags it shrieking out of the chapel.`;
      return t;
    },
    back:`Gorrak stands before the altar, sword drawn.`,
    options:[
      {label:'Strike from the shadows', if:G=>(G.flags.sneak_in || G.flags.quiet_entry), check:{skill:'stealth', dc:12, adv:G=>!!G.flags.sneak_in,
        pass:{text:`You are on them before anyone can shout.`, fight:BOSS(true)},
        fail:{text:`Gorrak's head snaps around. "Intruder!"`, fight:BOSS(false)}}},
      {label:'Draw your weapon and attack', fight:BOSS(false)},
      {label:'Challenge Gorrak to single combat', check:{skill:'intimidation', dc:13,
        pass:{text:`Gorrak bares his tusks and waves his goblins back. "Fine. Steel to steel."`, fight:{foes:[GORRAK], win:'victory', noFlee:true}},
        fail:{text:`He laughs. "Kill it."`, fight:BOSS(false)}}},
      {label:'Claim the masked buyers sent you', if:G=>G.flags.knows_buyer, check:{skill:'deception', dc:15,
        pass:{text:`Gorrak hesitates. Then he grunts and steps aside. "Tell your masters the price has doubled." You lift the Sunstone from the altar and walk out with your heart pounding.`, set:{tricked_gorrak:true}, give:{xp:200}, go:'victory'},
        fail:{text:`"Liar," he hisses. "The masked ones send no one."`, fight:BOSS(false)}}},
      {label:'Retreat to the Hall of Dawn', go:'hall', text:`You back out of the chapel. Gorrak does not follow. He does not need to.`}
    ]
  },

  victory:{
    title:'The Sunstone', area:'boss', rest:'short',
    onEnter:G=>{
      if (!G.flags.got_stone){ G.flags.got_stone = true; give({items:{sunstone:1, letter:1}}); }
    },
    text:`The Sunstone is warm in your hands, and the chapel fills with gold light. Where it sat on the altar, someone has left a folded letter sealed with black wax, pressed with the shape of a blank, featureless mask.
      <br><br>It reads: <em>"One of three. Bring it to the Greywater ferry by the new moon. The others will follow."</em>`,
    back:`The empty altar. The light of the Sunstone fills the chapel.`,
    options:[
      {label:'Free Wren on your way out', if:G=>!G.flags.wren_free, go:'hall', text:`You cannot leave Wren behind.`},
      {label:'Carry the Sunstone home to Bramblewick', go:'bramblewick'}
    ]
  },

  chapter_end:{
    title:'End of Chapter Two', area:'town', rest:'both',
    onEnter:G=>{ G.flags.chapter_done = true; },
    text:`Hesta reads the letter twice. The color drains from her face.
      <br><br>"Three stones," she whispers. "The Dawnwardens built three shrines across the north. If someone is gathering the stones, then what the knights sealed away is not as sealed as we thought." She folds the letter carefully and looks up at you. "I think I will need you again."
      <br><br><b>Chapter Two: The Sunken Shrine is complete.</b>`,
    options:[
      {label:'Chapter Three: The Saltreach Gaol', tag:'Suggested level 3', go:'c3_briefing',
       text:`"Take the letter to Greywater," Hesta says. "There's a woman there who has spent her whole life catching people who don't want to be caught."`},
      {label:'Keep exploring the Thornvale', go:'trail'},
      {label:'Return to the inn', go:'bramblewick'}
    ]
  }
};
for (const k in CHAPTER_TWO) CHAPTER_TWO[k].chapter = 2;
Object.assign(STORY, CHAPTER_TWO);
