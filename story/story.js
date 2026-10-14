/* =====================================================================
   THORNVALE CHRONICLES : story.js
   Shared story data: chapter names, area names, the journal, and lore.
   Each chapter file adds its scenes to STORY.
   ===================================================================== */
'use strict';

const STORY = {};
const CHAPTERS = {1:'The Marsh Road', 2:'The Sunken Shrine', 3:'The Saltreach Gaol', 4:'The Greywater Ferry', 5:'Where the River Ends'};
/* Suggested hero level for each chapter. Fights scale up or down from here. */
const CHAPTER_LEVEL = {1:1, 2:2, 3:3, 4:4, 5:5};
const CH_WORD = ['', 'One', 'Two', 'Three', 'Four', 'Five'];

/* how much cover each area offers in a fight: open, some, or lots (see combat.js) */
const AREA_COVER = {};
const AREA_NAME = {town:'Settlement', wilds:'Wilderness', marsh:'Marsh', tower:'Hollowmere Tower', dungeon:'Shrine Halls', crypt:'Crypt', boss:'Lair'};

/* Quest journal: entries appear when shown() is true and are checked when done() is true */
const JOURNAL = [
  {text:"Deliver Marta's medicine cart to Sister Agathe in Bramblewick.", shown:G=>!!G.flags.set_out, done:G=>!!G.flags.delivered},
  {text:"Find Jory, Marta's grandson.", shown:G=>!!G.flags.knows_jory, done:G=>!!G.flags.jory_free},
  {text:'Find out who is paying the kobolds.', shown:G=>!!(G.flags.knows_trouble || G.flags.knows_skarn), done:G=>!!G.flags.c1_loot},
  {text:'Recover the Sunstone from the Dawnwarden shrine.', shown:G=>!!G.visits.bramblewick, done:G=>has('sunstone') || G.flags.stone_returned},
  {text:"Find Wren, the miller's daughter.", shown:G=>!!G.visits.bramblewick, done:G=>G.flags.wren_free},
  {text:'Learn who paid the goblins to steal the stone.', shown:G=>G.flags.knows_buyer, done:G=>has('letter') || G.flags.chapter_done},
  {text:'Return the Sunstone to Elder Hesta.', shown:G=>has('sunstone') || G.flags.stone_returned, done:G=>G.flags.stone_returned}
];
const LORE = [
  {when:G=>G.flags.knows_skarn, text:'The kobolds of the Hollowmere work for Skarn Ironjaw, an orc mercenary in the old toll tower.'},
  {when:G=>G.flags.password, text:'The tower gate password is "glimmerbright".'},
  {when:G=>G.flags.grate_known, text:'Gran Moss says an underwater grate on the north side of the tower leads into the cellar.'},
  {when:G=>G.flags.skarn_contest, text:'Skarn has never lost an arm-wrestle and will never refuse one.'},
  {when:G=>G.flags.knows_mask, text:'A man in a white, faceless mask is paying to stop every cart bound for the Thornvale.'},
  {when:G=>G.flags.lore_shrine, text:'The Dawnwardens built their shrine over something they meant to keep sealed.'},
  {when:G=>G.flags.knows_gorrak, text:'The goblins answer to a hobgoblin captain named Gorrak.'},
  {when:G=>G.flags.mural, text:'Prayer of the wardens: "Rest, watchers. The dawn still keeps its vigil."'},
  {when:G=>G.flags.saw_three, text:'The Dawnwardens sealed the darkness with three stones of captured sunrise.'},
  {when:G=>G.flags.crawlspace, text:'Snik the kobold says a crawlspace in the storeroom leads behind the chapel altar.'},
  {when:G=>G.flags.knows_buyer, text:'Someone with northern silver paid the goblins.'}
];

const NAMES = {
  human:['Aldric','Mara','Tobin','Elsa','Corwin','Isolde','Gareth','Wynn'],
  dwarf:['Thrain','Brunna','Dolgar','Hilde','Korrin','Vistra','Barek','Eldeth'],
  elf:['Aelar','Sariel','Thalion','Naivara','Ilyana','Faelor','Lia','Theren'],
  halfling:['Pip','Rosie','Merric','Bree','Cade','Lavinia','Milo','Seraphina']
};

