/* =====================================================================
   THORNVALE CHRONICLES : monsters.js
   Monster statistics (SRD 5.1) and companions. Copy an entry to add a
   monster. Monsters you add in the game's Bestiary are stored in the browser.
   ===================================================================== */
'use strict';

/* Monsters use SRD 5.1 statistics. special: nimble, pack, martial, undead */
const MONSTERS = {
  goblin:   {name:'Goblin', ac:15, hp:7, xp:50, pp:9, init:2, type:'humanoid', special:['nimble'],
             save:{str:-1,dex:2,con:0,int:0,wis:-1,cha:-1}, attack:{name:'Scimitar', toHit:4, dmg:'1d6+2', type:'slashing'}},
  wolf:     {name:'Wolf', ac:13, hp:11, xp:50, pp:13, init:2, type:'beast', special:['pack'],
             save:{str:1,dex:2,con:1,int:-4,wis:1,cha:-2}, attack:{name:'Bite', toHit:4, dmg:'2d4+2', type:'piercing'}},
  skeleton: {name:'Skeleton', ac:13, hp:13, xp:50, pp:9, init:2, type:'undead', special:['undead'], vuln:['bludgeoning'], immune:['poison'],
             save:{str:0,dex:2,con:2,int:-2,wis:-1,cha:-3}, attack:{name:'Shortsword', toHit:4, dmg:'1d6+2', type:'piercing'}},
  rat:      {name:'Giant Rat', ac:12, hp:7, xp:25, pp:10, init:2, type:'beast', special:['pack'],
             save:{str:-2,dex:2,con:0,int:-4,wis:0,cha:-3}, attack:{name:'Bite', toHit:4, dmg:'1d4+2', type:'piercing'}},
  kobold:   {name:'Kobold', ac:12, hp:5, xp:25, pp:8, init:2, type:'humanoid', special:['pack'],
             save:{str:-2,dex:2,con:-1,int:-1,wis:-2,cha:-1}, attack:{name:'Dagger', toHit:4, dmg:'1d4+2', type:'piercing'}},
  stirge:   {name:'Stirge', ac:14, hp:2, xp:25, pp:9, init:3, type:'beast', special:[],
             save:{str:-3,dex:3,con:0,int:-4,wis:-1,cha:-2}, attack:{name:'Blood Drain', toHit:5, dmg:'1d4+3', type:'piercing'}},
  hobgoblin:{name:'Hobgoblin', ac:18, hp:11, xp:100, pp:10, init:1, type:'humanoid', special:['martial'],
             save:{str:1,dex:1,con:1,int:0,wis:0,cha:-1}, attack:{name:'Longsword', toHit:3, dmg:'1d8+1', type:'slashing'}},
  wkobold:  {name:'Winged Kobold', ac:13, hp:7, xp:50, pp:8, init:3, type:'humanoid', special:['pack'],
             save:{str:-2,dex:3,con:-1,int:-1,wis:-2,cha:-1}, attack:{name:'Dropped Rock', toHit:5, dmg:'1d6+3', type:'bludgeoning'}},
  weasel:   {name:'Giant Weasel', ac:13, hp:9, xp:25, pp:13, init:3, type:'beast', special:[],
             save:{str:0,dex:3,con:0,int:-3,wis:1,cha:-3}, attack:{name:'Bite', toHit:5, dmg:'1d4+3', type:'piercing'}},
  frog:     {name:'Giant Frog', ac:11, hp:18, xp:50, pp:12, init:1, type:'beast', special:[],
             save:{str:1,dex:1,con:0,int:-4,wis:-1,cha:-4}, attack:{name:'Bite', toHit:3, dmg:'1d6+1', type:'piercing'}},
  orc:      {name:'Orc', ac:13, hp:15, xp:100, pp:10, init:1, type:'humanoid', special:[],
             save:{str:3,dex:1,con:3,int:-2,wis:0,cha:0}, attack:{name:'Greataxe', toHit:5, dmg:'1d12+3', type:'slashing'}},
  guard:    {name:'Guard', ac:16, hp:11, xp:25, pp:12, init:1, type:'humanoid', special:[],
             save:{str:1,dex:1,con:1,int:0,wis:0,cha:0}, attack:{name:'Spear', toHit:3, dmg:'1d6+1', type:'piercing'}},
  thug:     {name:'Thug', ac:11, hp:32, xp:100, pp:10, init:0, type:'humanoid', special:['pack'], multi:2,
             save:{str:2,dex:0,con:2,int:0,wis:0,cha:0}, attack:{name:'Mace', toHit:4, dmg:'1d6+2', type:'bludgeoning'}}
};

/* Companions who fight beside the hero. They act right after you each round. */
const ALLIES = {
  brindle:{name:'Brindle', kind:'Mastiff', ac:12, hp:5, keen:true, trip:11,
           attack:{name:'Bite', toHit:3, dmg:'1d6+1', type:'piercing'},
           desc:"Marta's mastiff: brown, enormous, and devoted. His bite can knock a foe prone (Strength save DC 11). His nose gives you advantage on Perception checks and +5 passive Perception."}
};
