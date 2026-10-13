/* =====================================================================
   THORNVALE CHRONICLES : encounters.js
   Random encounter tables. Each area has rows covering a d20 range. One
   outcome is picked at random from the row that is rolled.
   ===================================================================== */
'use strict';

/* ---------- random encounter tables ----------
   alert:true means each search makes noise, and noise is subtracted
   from the roll, so low (dangerous) results get more likely.
   ===================================================================== */
const ENCOUNTERS = {
  wilds:{
    name:'Wilderness', alert:false,
    rows:[
      {range:[1,5], label:'Hostile', pick:[
        {text:`A goblin scout bursts out of the ferns, every bit as surprised as you are.`, fight:{foes:['goblin']}},
        {text:`Two giant rats, fat on goblin scraps, come squealing out of a hollow log.`, fight:{foes:['rat','rat']}},
        {text:`A whine like a mosquito the size of your fist. Stirges!`, fight:{foes:['stirge','stirge']}}
      ]},
      {range:[6,8], label:'Hazard', pick:[
        {text:`Your boot catches a snare hidden under wet leaves.`, check:{save:'dex', dc:11,
          pass:{text:`You twist free before the thorny noose bites.`},
          fail:{text:`The noose snaps tight and rakes your leg with thorns.`, damage:{dice:'1d6', type:'piercing'}}}},
        {text:`The trail crumbles at the lip of a ravine.`, check:{skill:['athletics','acrobatics'], dc:10,
          pass:{text:`You scramble back to solid ground.`},
          fail:{text:`You slide down the muddy bank and climb back up, bruised.`, damage:{dice:'1d4', type:'bludgeoning'}}}}
      ]},
      {range:[9,14], label:'Quiet', pick:[
        {text:`Rain drips from every pine needle. Somewhere an owl calls, and somewhere further off, something answers.`},
        {text:`You pass a ring of pale mushrooms and decide not to step inside it.`},
        {text:`A doe watches you from the mist, then is gone without a sound.`},
        {text:`Wind moans through the thorns. Nothing else stirs.`}
      ]},
      {range:[15,17], label:'Find', pick:[
        {text:`Something glints in a rain-filled hoofprint: a few lost coins.`, give:{gold:'1d6'}},
        {text:`A patch of silverleaf grows beside the creek.`, check:{skill:['nature','medicine'], dc:10,
          pass:{text:`You crush the leaves into a healing poultice and wrap it for later.`, give:{items:{poultice:1}}},
          fail:{text:`In this light you cannot tell silverleaf from nettle. You leave it.`}}},
        {once:'wilds_cache', text:`Under a cairn of stones you find an old adventurer's cache wrapped in oilcloth.`, give:{items:{potion:1}, gold:'2d6'}}
      ]},
      {range:[18,19], label:'Stranger', pick:[
        {text:`A tinker with a squeaking handcart tips his hat. "Pell Haverford, at your service. Potions, rations, and good advice. Two of those cost money."`,
         choices:[
          {label:'Look over his wares', tag:'Shop', shop:'pell', text:`"Potions are cheaper than in town. Don't ask why."`},
          {label:'Ask for advice', text:`"Goblins hate bright light and loud voices. Hobgoblins do not hate either. Watch out for the big one."`},
          {label:'Wave him on his way', text:`Pell rattles off down the trail, whistling a hymn badly.`}
        ]},
        {once:'shepherd', text:`An old shepherd is calling for a lost goat somewhere in the brambles. He looks exhausted.`,
         choices:[
          {label:'Help track the goat', check:{skill:'survival', dc:12,
            pass:{text:`You find the goat wedged in a thicket and carry it back. The shepherd laughs, blesses you, and presses coins into your hand.`, give:{gold:5, xp:25, insp:true}},
            fail:{text:`The trail goes cold. The shepherd thanks you for trying and keeps calling.`}}},
          {label:'Wish him luck and move on', text:`"God keep you on the road," he calls after you.`}
        ]}
      ]},
      {range:[20,20], label:'Blessing', pick:[
        {text:`The clouds part for a moment and a shaft of sunlight falls across the trail. For a heartbeat the whole valley shines. You feel steadier.`, give:{insp:true}}
      ]}
    ],
    ambush:[{text:`Your rest is broken by a goblin scout creeping toward your pack.`, fight:{foes:['goblin']}}]
  },

  marsh:{
    name:'Marsh', alert:false,
    rows:[
      {range:[1,5], label:'Hostile', pick:[
        {text:`The reeds part and a giant frog the size of a pony lunges at you, mouth wide.`, fight:{foes:['frog']}},
        {text:`A thin whine over the water. Stirges rise out of the cattails.`, fight:{foes:['stirge','stirge']}},
        {text:`Two kobolds poling a raft through the reeds spot you and shriek.`, fight:{foes:['kobold','kobold'], rout:1, captive:'c1_kobold',
          onRout:{text:`One kobold leaps overboard and swims hard for the tower.`, set:{alarm:true}}}}
      ]},
      {range:[6,8], label:'Hazard', pick:[
        {text:`The ground turns to sucking black mud under your boots.`, check:{skill:'athletics', dc:11,
          pass:{text:`You haul yourself free.`},
          fail:{text:`You flounder, wrench your knee, and finally drag yourself out.`, damage:{dice:'1d4', type:'bludgeoning'}}}},
        {text:`After a deep crossing, fat black leeches cling to your legs.`, check:{save:'con', dc:10,
          pass:{text:`You scrape them off before they do much harm.`},
          fail:{text:`You feel weak and dizzy by the time you have pulled them all off.`, damage:{dice:'1d4', type:'piercing'}}}}
      ]},
      {range:[9,14], label:'Quiet', pick:[
        {text:`Mist hangs on the black water. A heron lifts off without a sound.`},
        {text:`The frogs go silent all at once as you pass, then start up again behind you.`},
        {text:G=>G.ally ? `${G.ally.name} stops, sniffs the wind, growls once, and decides it is nothing.` : `Something large slips into the water nearby and does not come up again.`},
        {text:`Somewhere far off a tiny bell tinkles, then stops.`}
      ]},
      {range:[15,17], label:'Find', pick:[
        {text:`A drowned purse is caught in the roots of a dead tree.`, give:{gold:'1d8'}},
        {text:`Silverleaf grows thick on a hummock of dry ground.`, check:{skill:['nature','medicine'], dc:10,
          pass:{text:`You crush the leaves into a healing poultice.`, give:{items:{poultice:1}}},
          fail:{text:`It might be silverleaf. It might be hemlock. You leave it.`}}},
        {once:'marsh_cache', text:`A fisherman's lockbox is wedged in the reeds, its owner long gone.`, give:{items:{potion:1}, gold:'2d4'}}
      ]},
      {range:[18,19], label:'Stranger', pick:[
        {once:'gran_moss', text:`An old woman in waders is pulling eel traps from the water. "Gran Moss," she says, without looking up. "You're going to the tower. Everybody with that face is going to the tower."`,
         choices:[
          {label:'Ask about the tower', stay:true, once:'moss_tower', text:`"Old toll tower from when this was a road and not a bog. There's an iron grate on the north side, under the water, into the cellar. The kobolds never guard it. They can't swim against the current. You might."`, set:{grate_known:true}},
          {label:'Buy a smoked eel', tag:'1 gp', stay:true, if:G=>G.char.gold>=1, take:{gold:1}, give:{items:{ration:1}}, text:`It tastes exactly like it smells. It counts as a ration.`},
          {label:'Thank her and move on', text:`"Mind the leeches," she calls after you.`}
        ]}
      ]},
      {range:[20,20], label:'Blessing', pick:[
        {text:`For one moment the mist thins and sunlight lays a gold road across the water. You feel steadier.`, give:{insp:true}}
      ]}
    ],
    ambush:[{text:`A giant frog heaves itself out of the water and into your camp.`, fight:{foes:['frog']}}]
  },

  tower:{
    name:'Hollowmere Tower', alert:true,
    rows:[
      {range:[1,5], label:'Hostile', pick:[
        {text:`Two kobolds round the corner carrying a stolen ham between them. They drop it and draw their daggers.`, fight:{foes:['kobold','kobold'], rout:1, captive:'c1_kobold',
          onRout:{text:`One kobold flees up the stair screeching for Skarn.`, set:{alarm:true}}}},
        {text:`A giant weasel has slipped its pen and is hunting through the tower.`, fight:{foes:['weasel']}},
        {text:`A winged kobold drops from the rafters with a rock in its claws.`, fight:{foes:['wkobold']}}
      ]},
      {range:[6,8], label:'Trap', pick:[
        {text:`A board shifts under your foot.`, check:{skill:'perception', dc:12,
          pass:{text:`You spot the kobold trap, a bucket of rusty nails rigged overhead, and step around it.`, give:{xp:10}},
          fail:{text:`Something creaks above you.`, check:{save:'dex', dc:11,
            pass:{text:`You leap clear as a bucket of nails crashes down.`},
            fail:{text:`A bucket of rusty nails lands squarely on you.`, damage:{dice:'1d6', type:'piercing'}}}}}},
        {text:`A clay jar balanced on a doorframe tips and shatters. Hornets!`, check:{save:'con', dc:11,
          pass:{text:`You swat your way through with only a few stings.`},
          fail:{text:`The angry swarm stings you a dozen times before you get clear.`, damage:{dice:'1d6', type:'poison'}}}}
      ]},
      {range:[9,13], label:'Quiet', pick:[
        {text:`Kobold snoring drifts from somewhere overhead.`},
        {text:`Someone has painted a crude yellow eye on the wall, and under it, a much better painting of a fish.`},
        {text:`Water drips through the old roof into a row of stolen pots, each with a different note.`}
      ]},
      {range:[14,16], label:'Find', pick:[
        {text:`A kobold's hoard of shinies is tucked under a loose step.`, give:{gold:'2d6'}},
        {once:'tower_potion', text:`A traveler's satchel, stolen from some cart, still holds a sealed red vial.`, give:{items:{potion:1}}}
      ]},
      {range:[17,18], label:'Stranger', pick:[
        {once:'small_kobold', text:`A very small kobold in a very large helmet rounds the corner, sees you, and freezes. Its lip trembles.`,
         choices:[
          {label:'Kneel down and let it go', text:`It stares at you, then digs in its pouch and presses a sticky coin into your hand. "Skarn never says no to arm-wrestle," it whispers. "Never ever. Even when he should." Then it bolts.`, give:{gold:1}, set:{skarn_contest:true}},
          {label:'Shoo it away', text:`It flees, helmet clanking.`}
        ]}
      ]},
      {range:[19,20], label:'Blessing', pick:[
        {text:`Through a crack in the wall you glimpse the evening star, clear above the mist. It feels like a promise.`, give:{insp:true}}
      ]}
    ],
    ambush:[{text:`Kobolds find you resting and attack with a shriek.`, fight:{foes:['kobold','kobold'], rout:1, captive:'c1_kobold'}}]
  },

  dungeon:{
    name:'Shrine Halls', alert:true,
    rows:[
      {range:[1,5], label:'Hostile', pick:[
        {text:`A goblin on patrol rounds the corner with a torch and a rusty blade.`, fight:{foes:['goblin']}},
        {text:`Two kobolds picking through goblin garbage hiss and draw their daggers.`, fight:{foes:['kobold','kobold']}},
        {text:`Giant rats pour out of a crack in the wall.`, fight:{foes:['rat','rat']}}
      ]},
      {range:[6,8], label:'Trap', pick:[
        {text:`A flagstone shifts under your foot.`, check:{skill:'perception', dc:13,
          pass:{text:`You spot the tripwire and the dart holes in the wall, and step over it.`, give:{xp:10}},
          fail:{text:`Click.`, check:{save:'dex', dc:12,
            pass:{text:`You throw yourself flat as darts rattle overhead.`},
            fail:{text:`A dart sinks into your arm.`, damage:{dice:'1d6', type:'piercing'}}}}}},
        {text:`Dust trickles from a cracked ceiling stone.`, check:{save:'dex', dc:11,
          pass:{text:`You dive clear as the stone crashes down.`},
          fail:{text:`Falling rubble clips your shoulder.`, damage:{dice:'1d8', type:'bludgeoning'}}}}
      ]},
      {range:[9,13], label:'Quiet', pick:[
        {text:`Water drips. Something skitters away just past the edge of your light.`},
        {text:`Goblin graffiti covers one wall: a crowned hobgoblin, and a much smaller goblin hiding behind him.`},
        {text:`A cold draft carries the smell of wet stone and old smoke.`},
        {text:`Somewhere far off a drum thumps three times, then stops.`}
      ]},
      {range:[14,16], label:'Find', pick:[
        {text:`A goblin's stash of shiny things is tucked behind a loose stone.`, give:{gold:'2d4'}},
        {once:'dungeon_potion', text:`A dead adventurer's satchel lies half buried in rubble. One vial inside is unbroken.`, give:{items:{potion:1}}},
        {once:'candle', text:`On a forgotten shelf sits a candle of golden wax stamped with a sun.`, give:{items:{candle:1}}}
      ]},
      {range:[17,18], label:'Stranger', pick:[
        {once:'snik', text:`A kobold is pinned under a fallen beam, squeaking pitifully. "Help Snik! Snik is very helpful! Snik knows secrets!"`,
         choices:[
          {label:'Lift the beam off him', check:{skill:'athletics', dc:10,
            pass:{text:`You heave the beam aside. Snik scrambles up and bows until his snout touches the floor. "Snik pays debts! The storeroom past the wolf has a crawlspace. It comes out behind the altar where Gorrak sleeps!" Then he is gone.`, set:{crawlspace:true}, give:{xp:25}},
            fail:{text:`The beam will not budge. Snik wriggles free on his own anyway, bites your boot for good measure, and runs.`, damage:{dice:'1', type:'piercing'}}}},
          {label:'Threaten him for his secrets', check:{skill:'intimidation', dc:10,
            pass:{text:`"Crawlspace! In the storeroom past the wolf! It comes out behind the altar! Please do not step on Snik!"`, set:{crawlspace:true}},
            fail:{text:`Snik bites your hand, wriggles free, and vanishes into a crack in the wall.`, damage:{dice:'1', type:'piercing'}}}},
          {label:'Leave him', text:`"Snik remembers!" he wails after you.`}
        ]},
        {text:`A faded mural fragment glows faintly where your light touches it: a knight kneeling, three bright stones above her head.`, set:{saw_three:true}}
      ]},
      {range:[19,20], label:'Blessing', pick:[
        {text:`Somewhere in the stone a faint chime sounds, like a bell far away at morning. Your fear eases.`, give:{insp:true}}
      ]}
    ],
    ambush:[{text:`Torchlight and goblin voices! A patrol stumbles on your resting place.`, fight:{foes:['goblin','kobold']}}]
  },

  crypt:{
    name:'Crypt', alert:true,
    rows:[
      {range:[1,6], label:'Hostile', pick:[
        {text:`Bones knit together in a wall niche, and a skeleton steps out to meet you.`, fight:{foes:['skeleton']}},
        {text:`Giant rats nesting in an open grave rush you.`, fight:{foes:['rat','rat']}}
      ]},
      {range:[7,9], label:'Hazard', pick:[
        {text:`A breath of cold rises from a grave shaft, the kind of cold that steals the warmth from your bones.`, check:{save:'con', dc:11,
          pass:{text:`You grit your teeth until it passes.`},
          fail:{text:`Your fingers go numb and your chest aches.`, damage:{dice:'1d6', type:'cold'}}}}
      ]},
      {range:[10,15], label:'Quiet', pick:[
        {text:`The niches stare at you with empty sockets. None of them move. Probably.`},
        {text:`Your breath fogs. The silence here feels old, like the bottom of a well.`},
        {text:`A carved knight's face, worn almost smooth, gazes upward as if waiting for the sky.`}
      ]},
      {range:[16,18], label:'Find', pick:[
        {text:`Grave offerings: tarnished silver coins left for the dead long ago.`, give:{gold:'2d6'}},
        {once:'crypt_potion', text:`A sealed vial rests in a niche beside a small stone sun.`, give:{items:{potion:1}}}
      ]},
      {range:[19,20], label:'Blessing', pick:[
        {text:`A prayer is carved into the wall: "The dawn keeps its vigil." Reading it, you feel calm.`, give:{insp:true}}
      ]}
    ],
    ambush:[{text:`A dry rattle wakes you. A skeleton is standing over you.`, fight:{foes:['skeleton']}}]
  }
};

