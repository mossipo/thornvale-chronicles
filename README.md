# Thornvale Chronicles

A solo, text-based fantasy adventure that runs in your web browser, built on the free 5th edition core rules (SRD 5.1). You make a hero, read the story, and pick what to do. The game rolls every die in the open: checks, attacks, saves, initiative, and death saves.

## Play it

**On your computer:** download the project and double-click `index.html`. No server or install is needed.

**On the web with GitHub Pages:**
1. In this repository on github.com, open **Settings**, then **Pages**.
2. Under **Build and deployment**, set **Source** to *Deploy from a branch*.
3. Pick the **main** branch and the **/ (root)** folder, then **Save**.
4. After a minute or two the page shows your web address, usually `https://mossipo.github.io/thornvale-chronicles/`.

Every time you change a file on GitHub, the website updates by itself within a minute or two.

**As one file:** run `python3 tools/build_single.py`. It writes `dist/thornvale-chronicles.html`, a single file you can email or keep offline.

## What is in the game

* **Three chapters of story, all original:**
  * Chapter One: *The Marsh Road* (suggested level 1)
  * Chapter Two: *The Sunken Shrine* (level 2)
  * Chapter Three: *The Saltreach Gaol* (level 3), a heist in a tidal-island prison with three cover identities, a suspicion meter, and an inside man to expose
* **Aldermere, the City of Bridges,** a city hub you can reach from Greywater, Bramblewick, or Captain Doyle's, or choose as your starting point. It has:
  * **Shops** on Market Row: provisions, a smithy, and an apothecary
  * **An inn**, the Lantern and Lark, where you can rest, hear rumors, gamble, and hire help
  * **The Hall of the Open Road**, an adventurers' guild with the **job board**
  * **The Amberglass Collegium** and its **Spell Forge** (see below)
  * **A chapel** for healing and blessings, and the **Wardens' Hall**, which pays bounties on live captives
* **The job board** has 11 one-shot jobs:
  * Rats in the Undercroft, a sewer clean-out
  * The Hedge-Witch's List, gathering herbs
  * Survey the Old Mill Road, scouting for the town council
  * The Eel Knot Ledger, a retrieval with a moral choice
  * The Drowned Chapel, undead
  * Silk for the Weavers, giant spiders
  * The Ogre's Toll, a bounty you can talk your way out of
  * Lights in the Old Observatory, a mage quest
  * The Apprentice's Mistake, a mage quest
  * Hunt the Owlbear
  * The Lady Mayor's Commission, which ties into the main story

  Every job scales to your hero. Fights pick a group of foes for your level (tiers at levels 1, 3, 5, 7 and so on), and level scaling fine-tunes them. Check DCs and pay grow with your level too.
* **On a job:**
  * You can **quit** at any time from the "Anywhere" choices. You get no pay, but there is no penalty.
  * If you **die**, guild runners drag you out. You wake just outside the job area with 1 hit point, minus a tenth of your gold.
  * Every foe you already killed **stays dead** when you go back in. A boss who survived keeps half the wounds you gave it.
* **Standing in Aldermere.** Each job raises your reputation (half as much for repeats), and new standing opens new places:
  * **Known (10):** 1st-level spells at the Spell Forge, and Collegium, Chapel, Weaver, and Warden jobs
  * **Trusted (25):** Lantern Row, with the Night Market and The Quiet Blade (+1 weapons)
  * **Respected (45):** The Gilded Lantern (Ring and Cloak of Protection), empowered spells, and 10% off at every city shop
  * **Renowned (70):** The Royal Armory (+1 armor), the Hall of Champions arena, and the Lady Mayor's commission
  * **Hero of Aldermere (100):** the Key to the City and the Hero's House
* **The Spell Forge.** Design your own spell:
  * a shape: bolt, brand, lance, wave, or mend
  * an element
  * a cantrip or a 1st-level spell, with an optional empowered version
  * a saving throw

  Clerics and wizards learn the spell and cast it like any other. Other classes get it as scrolls: two come with each design, and the scribes sell more. Scrolls use +5 to hit and DC 13, need no slot, and work in any armor. You can hold four designs at a time.
* **Start at any chapter, or in Aldermere,** from the character creation screen. Your hero begins at that chapter's suggested level.
* **Level scaling.** Fights scale to your hero: tougher when you are above a chapter's suggested level, a little weaker when you are below it. Turn it off in the Journal tab.
* **Character creation** with four peoples, four classes, five backgrounds, standard array or 4d6, and your own backstory (type it or load a .txt file).
* **PDF character sheet import** from a *fillable* 5e sheet: name, class and level, ability scores, hit points, XP, gold, weapons, and backstory.
* **Equipment and shops.** Buy, sell, wear, and ready any SRD weapon or armor. If you aren't proficient with a weapon, your proficiency bonus doesn't add to the attack. Untrained armor gives disadvantage on Strength and Dexterity rolls and blocks spellcasting.
* **Companions.** Brindle the mastiff joins you first. You can hire others from the board in Greywater, Bramblewick, or at Captain Doyle's, and meet some on the road:
  * Tess Marrow, a scout who shoots twice a turn and sharpens your Perception
  * Brother Tamsin, an acolyte who heals you when you drop to half your hit points
  * Garrick Stone, a sellsword in mail and shield
  * Ruth Ashdown, a veteran who only works for heroes of level 4 or higher

  One companion travels with you at a time. Anyone else waits in town until you call them back for free.
* **People.** All 21 SRD people templates, from Commoner to Archmage, with their real statistics and actions: spells that call for saving throws, poisoned blades, parries, sneak attacks, reckless rages, magic resistance, and healers who patch up their friends. The game gives them original names and stories, and you meet them on the road: bandits, the bandit captain Mag Rusk, cultists in blank white masks, pilgrims, and hill-clan hunters. These roadside fights are tuned by your level instead of being scaled.
* **Combat** with surprise, stealth ambushes, enemies who flee, "strike to subdue", captives you can question, multiattack monsters, and death saving throws.
* **Random encounters** for every area, plus a **Map** tab of the places you have found.
* **Library:**
  * **Adventures:** load a one-shot from a .txt file (see below).
  * **Bestiary:** add your own monsters by hand, or paste a stat block from your book and the game reads it. You choose which areas they appear in.
  * **People:** every people template with its full statistics, a **practice bout** against any of them (no XP, nobody dies, your hit points come back after), the companions for hire, and the named characters you have met so far.
  * **File format:** the full guide to writing adventures.
* **Solo GM tools:** roll any check, start a fight with any monster, and award gold, XP, damage, or healing.

## Adventures in .txt files

Open **Library**, then **Adventures**, and choose a .txt file.

* A file written in the **adventure format** plays like the built-in chapters, with choices, checks, fights, items, and its own encounter table. See `adventures/FORMAT.txt` for the format and `adventures/the-lantern-in-the-well.txt` for a complete example.
* **Any other text** opens in **reader mode**. The game splits it into sections at the headings and gives you the solo GM tools to run checks and fights as you read.

Your hero carries over into the adventure. When you are done, choose **Leave this adventure** to return to your campaign.

**Keep purchased books private.** This repository is public if GitHub Pages is on. Load adventures you bought through the Library in your browser, and do not commit them here. The `private/` folder is ignored by git, so you can keep your own files there safely.

## Project layout

```
index.html                 the page; loads the scripts below in order
css/style.css              all styling (colors are tokens at the top)
js/rules.js                races, classes, backgrounds, spells, items, weapons, armor, shops
js/monsters.js             monster statistics, the SRD people templates, and companions
story/encounters.js        random encounter tables
story/story.js             chapter names, area names, journal, lore
story/chapter1.js          Chapter One: The Marsh Road
story/chapter2.js          Chapter Two: The Sunken Shrine
story/chapter3.js          Chapter Three: The Saltreach Gaol
story/npcs.js              hiring board, the cast of named characters, roadside people, captives
story/city.js              Aldermere: city scenes, standing (reputation), rumors, the arena
story/jobs.js              the job board, job rules (scaling, quitting, rescue), and all 11 jobs
js/forge.js                the Spell Forge and spell scrolls
js/engine.js               dice, checks, rewards, hazards, outcomes, rests, saving
js/combat.js               turns, attacks, spells, combat actions
js/ui.js                   story log, choices, character sheet, character creation
js/sample-adventure.js     the sample one-shot and format guide shown in the Library
js/library.js              shops, equipment, bestiary, adventure files, GM tools, map, PDF import
js/main.js                 menu buttons, keyboard, start
adventures/                the sample adventure and the format guide as .txt files
tools/build_single.py      bundles everything into one HTML file
```

The scripts are plain JavaScript files, not modules, so the game works when opened straight from your computer.

## Adding to the campaign

Every place in the story is a **scene** in `STORY`. Here is a small one:

```js
Object.assign(STORY, {
  c3_ferry:{
    chapter:3, title:'The Greywater Ferry', area:'wilds', rest:'short',
    text:`Fog lies on the river. The ferryman will not meet your eyes.`,
    options:[
      {label:'Ask about the masked man', check:{skill:'insight', dc:12,
        pass:{text:`He is terrified. "Tonight," he whispers.`, set:{knows_tonight:true}},
        fail:{text:`He shrugs and spits into the water.`}}},
      {label:'Board the ferry', go:'c3_crossing'}
    ]
  }
});
```

To start Chapter Four:
1. Make `story/chapter4.js` and add its `<script>` line to `index.html` after chapter3.
2. Add the name to `CHAPTERS` and its suggested level to `CHAPTER_LEVEL` in `story/story.js`, and its first scene to `CHAPTER_START` in `js/library.js`.
3. Point the "Chapter Four" option in `c3_end` (in `story/chapter3.js`) at your first scene.

`story/chapter3.js` is a good model for a quest with its own rules: it adds its own encounter table, journal entries, lore, an item, and a suspicion meter, all inside the one file.

Choices, encounter results, and check results all use the same small set of keys:

| Key | What it does |
| --- | --- |
| `text` | narration (a string, or a function of `G`) |
| `go` | move to a scene |
| `check` | `{skill, save, ability, dc, adv, pass, fail}`, plus `vsFoes` or `contest` |
| `fight` | `{foes, surprise, ambush, rout, onRout, captive, win, flee, noFlee}` |
| `give` | `{gold, xp, items, heal, insp}` |
| `take` | `{gold, items}` |
| `set` | story flags (`G.flags`) |
| `damage` | `{dice, type, save}` |
| `choices` | a one-time menu, for NPCs |
| `shop` | open a shop from `SHOPS` |
| `ally` | a companion from `ALLIES` joins you (the current one waits in town) |
| `bench` | your companion goes to wait in town |
| `fn` | any custom code |

Options also take `label`, `if` (a condition), and `once`. Encounter table entries take `if` and `once` too. `choices` can be a function of `G` that builds the menu when it opens.

### Writing a new job

`story/jobs.js` has small helpers. A job is `addJob({...})`, an `outsideScene` (where you wake if you fall), and a few `jscene` scenes. A job fight uses tiers and a fight id, so the game can remember kills:

```js
{label:'Fight the rats', tag:'Fight', if:G => !jc('sw1'),
 fight:jf('sw1', {1:['rat','rat'], 3:['rat_swarm','rat'], 5:['rat_swarm','rat_swarm','ghoul']})}
```

Use `jset('key')`, `jon('key')` and `jadd('key', n)` for flags that belong to one run of the job, `JDC(11)` for a DC that grows with level, and `completeJob({goldMult, rep, text})` to finish. Any fight anywhere can use `tiers` too.

### People in fights

Any fight can use a people template and give it a name:

```js
fight:{foes:[{key:'bandit_captain', name:'Mag Rusk', boss:true}, 'bandit', 'bandit'], rout:1, captive:'bandit_talk'}
```

Add `noScale:true` to a fight to skip level scaling. The template keys are `commoner, acolyte, priest, cultist, cult_fanatic, druid, bandit, bandit_captain, thug, guard, clan_warrior, noble, scout, spy, berserker, veteran, knight, gladiator, mage, assassin, archmage`. The top of the people section in `js/monsters.js` explains the extra keys (`actions`, `parry`, `sneak`, `resist`) if you want to build your own.

## House rules for solo play

* **Stubborn Hero:** once per short rest, when you would drop to 0 hit points, you drop to 1 instead.
* **Mage Armor:** wizards keep it up between adventures (AC 13 + Dexterity with no armor).
* **Spell slots** are all treated as 1st level.
* **Companions** recover fully on a short rest and get back up after a fight you win. Their healing spells come back on a long rest.
* **Levels** go up to 20 with the SRD XP table, but class features stop at level 3, so high-tier jobs are tuned a little lighter than the books would make them.
* **Cover.** Every fight has terrain:
  * **Open ground:** no cover for anyone. The arena is always open ground.
  * **Some cover:** half cover, +2 AC and Dexterity saves. This is the default outdoors and in town.
  * **Lots of cover:** three-quarters cover, +5 AC and Dexterity saves. This applies in dungeons, ruins, sewers, the gaol, and the docks.
  * **Full cover** is possible wherever there is any cover.

  Moving into partial cover is free once a turn. Getting behind full cover uses your turn. Behind full cover, no attack, spell, or dart can target you and area spells miss you, but a melee foe can spend its attack coming around it. Attacking from full cover steps you out into partial cover. Thinking foes do the same: archers and casters take partial cover, and badly hurt foes may fall back behind full cover for a turn. A scene can set `cover: 'open'`, `'some'`, or `'lots'`, and so can a fight.
* **Magic Missile.**
  * **Aiming:** you aim three darts by splitting them among your foes however you like.
  * **Damage:** one damage roll of 1d4 + 1 applies to every dart. All the darts strike at once and never miss.
  * **Cover:** half or three-quarters cover does not stop the darts. Full cover does, because you need a line of sight.
  * **What stops them:** a Shield spell (the Mage template casts it as a reaction twice a fight), a deflection charm such as the Brooch of Shielding, or immunity to spells.
  * **Higher slots:** these add darts in the rules, but this game treats every slot as 1st level for now.
* **Shield.** Wizards know Shield. The game casts it as your reaction when it would turn a hit into a miss, or when magic missile darts come at you. You can switch this off in a fight to save your slots.
* **Immune to spells.** Monsters marked this way ignore every spell. That includes custom monsters: tick the box in the Bestiary, or paste a stat block with Limited Magic Immunity.
* **Ghoul paralysis** lasts until you make a DC 10 Constitution save at the start of one of your turns. Elves are immune.
* **People templates** follow the SRD stat blocks. A few things are simplified: spell slots become a limit per fight, area spells hit you and your companion, and support spells like Bless are left out.

## Saves

The game saves in your browser at every new location. **Save** and **Load** are in the header. **Transfer save** gives you a code to move your hero to another browser or device. Your Bestiary is stored in the browser too, and it travels inside save codes.

## Credits and license

Thornvale Chronicles is an original adventure by Barry Mossip, built with Claude.

This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.
