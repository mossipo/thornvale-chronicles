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
* **Start at any chapter** from the character creation screen. Your hero begins at that chapter's suggested level.
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

### People in fights

Any fight can use a people template and give it a name:

```js
fight:{foes:[{key:'bandit_captain', name:'Mag Rusk', boss:true}, 'bandit', 'bandit'], rout:1, captive:'bandit_talk'}
```

Add `noScale:true` to a fight to skip level scaling. The template keys are `commoner, acolyte, priest, cultist, cult_fanatic, druid, bandit, bandit_captain, thug, guard, clan_warrior, noble, scout, spy, berserker, veteran, knight, gladiator, mage, assassin, archmage`. The top of the people section in `js/monsters.js` explains the extra keys (`actions`, `parry`, `sneak`, `resist`) if you want to build your own.

## House rules for solo play

* **Stubborn Hero:** once per short rest, when you would drop to 0 hit points, you drop to 1 instead.
* **Mage Armor:** wizards keep it up between adventures (AC 13 + Dexterity with no armor).
* **Levels:** characters advance to any level, but class features are built in up to level 3. Spell slots are all treated as 1st level.
* **Companions** recover fully on a short rest and get back up after a fight you win. Their healing spells come back on a long rest.
* **People templates** follow the SRD stat blocks. A few things are simplified: spell slots become a limit per fight, area spells hit you and your companion, and support spells like Bless are left out.

## Saves

The game saves in your browser at every new location. **Save** and **Load** are in the header. **Transfer save** gives you a code to move your hero to another browser or device. Your Bestiary is stored in the browser too, and it travels inside save codes.

## Credits and license

Thornvale Chronicles is an original adventure by Barry Mossip, built with Claude.

This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.
