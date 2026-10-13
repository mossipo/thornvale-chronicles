/* =====================================================================
   THORNVALE CHRONICLES : main.js
   Menu buttons, keyboard shortcuts, and starting the game. Loaded last.
   ===================================================================== */
'use strict';

/* ---------- top menu ---------- */
$('btnSave').addEventListener('click', () => {
  if (G.mode !== 'explore' || !G.char){ notice(G.mode === 'combat' ? "You can't save in the middle of a fight." : 'Nothing to save yet.'); return; }
  notice(writeSave() ? 'Game saved.' : 'Saving is blocked in this browser. Use Transfer save to keep a code.');
});
$('btnLibrary').addEventListener('click', () => { if ($('library').hidden) openLibrary(); else $('library').hidden = true; });
$('libClose').addEventListener('click', () => { $('library').hidden = true; });
document.querySelectorAll('#libTabs button').forEach(b => b.addEventListener('click', () => { ui.lib = b.dataset.lt; renderLibrary(); }));
$('btnLoad').addEventListener('click', () => { if (loadState(readSave())) notice('Save loaded.'); else notice('No save found.'); });
$('btnNew').addEventListener('click', () => { $('confirmNew').hidden = false; $('transfer').hidden = true; });
$('newNo').addEventListener('click', () => { $('confirmNew').hidden = true; });
$('newYes').addEventListener('click', () => { $('confirmNew').hidden = true; newHero(); });
$('btnTransfer').addEventListener('click', () => {
  $('transfer').hidden = false; $('confirmNew').hidden = true;
  $('transferText').value = G.char && G.mode === 'explore' ? encodeSave() : '';
});
$('trClose').addEventListener('click', () => { $('transfer').hidden = true; });
$('trCopy').addEventListener('click', () => {
  const t = $('transferText');
  if (!t.value){ notice('Start an adventure first, or leave combat, to get a code.'); return; }
  const fallback = () => { t.focus(); t.select(); notice('Code selected. Copy it with your keyboard.'); };
  try { navigator.clipboard.writeText(t.value).then(() => notice('Save code copied.'), fallback); } catch (e){ fallback(); }
});
$('trImport').addEventListener('click', () => {
  const data = decodeSave($('transferText').value);
  if (loadState(data)){ writeSave(); $('transfer').hidden = true; notice('Hero imported.'); }
  else notice('That code did not work. Check that you copied all of it.');
});

/* ---------- keyboard ---------- */
document.addEventListener('keydown', e => {
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 9 && keyActions[n - 1] && !keyActions[n - 1].disabled){ e.preventDefault(); keyActions[n - 1].click(); }
});

/* ---------- start ---------- */
loadBestiary();
newHero();
