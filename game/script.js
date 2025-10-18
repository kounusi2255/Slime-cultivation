/* compact, self-contained game logic
   - single click per tap (no auto-repeat)
   - shop, settings (BGM/volume/UI size/manual save/reset)
   - rank display, MAX button
   - responsive safe (DOMContentLoaded registration)
*/

document.addEventListener('DOMContentLoaded', () => {
  // -- state
  const stateKey = 'slime_compact_v1';
  const backupKey = 'slime_compact_backup_v1';
  let state = {
    level:1, exp:0, need:10, coins:0, perClick:1, idleRate:0
  };

  // -- DOM refs
  const id = (s)=>document.getElementById(s);
  const slimeBtn = id('slimeBtn');
  const clickBtn = id('clickBtn');
  const maxBtn = id('maxBtn');
  const manualSaveBtn = id('manualSaveBtn');
  const manualSaveInModal = id('manualSaveInModal');
  const resetBtn = id('resetBtn');
  const settingBtn = id('settingBtn');
  const settings = id('settings');
  const closeSettings = id('closeSettings');
  const bgmToggle = id('bgmToggle');
  const volumeRange = id('volumeRange');
  const uiSize = id('uiSize');
  const saveStatus = id('saveStatus');

  // stat elements
  const levelEl = id('level'), expEl = id('exp'), needEl = id('need'), coinsEl = id('coins'),
        perClickEl = id('perClick'), idleRateEl = id('idleRate'), rankEl = id('rank'), expBar = id('expBar'),
        shopEl = id('shop'), floatArea = id('floatArea');

  // sound & bgm
  let volume = parseFloat(volumeRange.value || 0.5);
  let bgmOn = bgmToggle.checked;
  let bgm = null;

  function initBGM(){
    try{
      bgm = new Audio('https://files.catbox.moe/z5us97.mp3'); // short loop (fallback)
      bgm.loop = true; bgm.volume = volume;
      if(bgmOn) bgm.play().catch(()=>{});
    }catch(e){ console.warn('BGM init failed', e); }
  }

  function playSfx(url){
    if(volume <= 0) return;
    const a = new Audio(url);
    a.volume = volume;
    a.play().catch(()=>{});
  }

  // rank calc
  function getRank(level){
    if(level < 5) return '初心者';
    if(level < 10) return '見習い';
    if(level < 20) return '中級者';
    if(level < 35) return '上級者';
    return 'マスター';
  }

  // UI update
  function updateUI(){
    levelEl.textContent = state.level;
    expEl.textContent = state.exp;
    needEl.textContent = state.need;
    coinsEl.textContent = state.coins;
    perClickEl.textContent = state.perClick;
    idleRateEl.textContent = state.idleRate;
    rankEl.textContent = getRank(state.level);
    const pct = Math.min(100, Math.floor((state.exp / (state.need||1)) * 100));
    expBar.style.width = pct + '%';
  }

  // pop floating text
  function floatText(text, color = '#ff66a3'){
    const el = document.createElement('div');
    el.textContent = text;
    el.style.padding = '4px 8px';
    el.style.borderRadius = '8px';
    el.style.background = 'rgba(255,230,245,0.95)';
    el.style.color = color;
    el.style.fontWeight = '700';
    el.style.position = 'relative';
    el.style.transform = 'translateY(0)';
    el.style.animation = 'floatUp 900ms ease-out forwards';
    floatArea.appendChild(el);
    setTimeout(()=> el.remove(), 900);
  }

  // animate slime (small pop)
  function animateSlime(){
    slimeBtn.style.transform = 'scale(0.96)';
    setTimeout(()=> slimeBtn.style.transform = '', 100);
  }

  // click handling (single)
  function onClick(){
    state.exp += state.perClick;
    state.coins += state.perClick; // gain coins per click
    playSfx('https://actions.google.com/sounds/v1/cartoon/pop.ogg');
    animateSlime();
    floatText('+' + state.perClick + ' EXP');
    checkLevelUp();
    updateUI();
  }

  // level up check
  function checkLevelUp(){
    while(state.exp >= state.need){
      state.exp -= state.need;
      state.level++;
      state.perClick += 1;
      state.idleRate += 1;
      state.need = Math.floor(10 * Math.pow(1.35, state.level - 1));
      floatText('Lv ' + state.level + ' UP!', '#ff8fb0');
      playSfx('https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg');
    }
  }

  // MAX button: spend coins to grant EXP up to as much as possible using need as cost unit
  function onMax(){
    let bought = 0;
    // We'll treat each 'need' as the EXP chunk required for next level; user spends coins equal to 'need' to instantly fill EXP and level up
    while(state.coins >= state.need){
      // spend coins equal to current need, grant that much EXP
      state.coins -= state.need;
      state.exp += state.need;
      checkLevelUp();
      bought++;
      // safety break
      if(bought > 1000) break;
    }
    if(bought > 0) floatText(`一括強化 x${bought}`);
    else floatText('コイン不足');
    updateUI();
  }

  // SHOP
  const shopItems = [
    { id:'s_click1', name:'クリック力 +1', cost: 10, effect:()=> state.perClick += 1, desc:'クリックで得るEXPを増やす' },
    { id:'s_idle1', name:'放置収入 +1/s', cost: 30, effect:()=> state.idleRate += 1, desc:'毎秒コインが増える' },
    { id:'s_mult',  name:'報酬ブースト', cost: 100, effect:()=>{ state.perClick = Math.floor(state.perClick * 1.4); state.idleRate = Math.floor(state.idleRate * 1.4); }, desc:'全体的に強化' }
  ];

  function renderShop(){
    shopEl.innerHTML = '<div class="shop-title">ショップ</div>';
    const list = document.createElement('div');
    list.className = 'shop-list';
    shopItems.forEach(item=>{
      const row = document.createElement('div');
      row.className = 'shop-item';
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = `<div style="font-weight:700">${item.name}</div><div style="font-size:0.85rem;color:#666">${item.desc}</div>`;
      const btn = document.createElement('button');
      btn.textContent = `${item.cost} C`;
      btn.addEventListener('click', ()=>{
        if(state.coins >= item.cost){
          state.coins -= item.cost;
          item.effect();
          floatText('購入: ' + item.name, '#66a3ff');
          playSfx('https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg');
          updateUI(); saveAuto(); // quick save when buying
        } else {
          floatText('コイン不足', '#999');
        }
      });
      row.appendChild(meta);
      row.appendChild(btn);
      list.appendChild(row);
    });
    shopEl.appendChild(list);
  }

  // SAVE & LOAD
  function saveAuto(){
    try {
      localStorage.setItem(stateKey, JSON.stringify(state));
      saveStatus.textContent = 'セーブ済み: ' + new Date().toLocaleTimeString();
      // also keep a lightweight backup copy (manual backup when requested also)
      localStorage.setItem(backupKey, JSON.stringify(state));
    } catch(e){ console.warn('save failed', e); }
  }
  function manualBackup(){
    try{
      localStorage.setItem(backupKey, JSON.stringify(state));
      alert('仮セーブ（バックアップ）しました');
    }catch(e){ alert('バックアップ失敗'); }
  }
  function load(){
    try{
      const raw = localStorage.getItem(stateKey);
      if(raw){
        const obj = JSON.parse(raw);
        Object.assign(state, obj);
      }
    }catch(e){ console.warn('load failed', e); }
    updateUI();
  }
  function resetAll(){
    if(!confirm('本当にデータを完全にリセットしますか？')) return;
    localStorage.removeItem(stateKey); localStorage.removeItem(backupKey);
    state = { level:1, exp:0, need:10, coins:0, perClick:1, idleRate:0 };
    updateUI(); floatText('リセットしました', '#ff6666');
  }

  // SETTINGS open/close
  function openSettings(){
    settings.classList.remove('hidden'); settings.setAttribute('aria-hidden','false');
  }
  function closeSettingsFn(){
    settings.classList.add('hidden'); settings.setAttribute('aria-hidden','true');
  }

  // event bindings
  slimeBtn.addEventListener('click', onClick);
  clickBtn.addEventListener('click', onClick);
  maxBtn.addEventListener('click', onMax);
  settingBtn.addEventListener('click', openSettings);
  closeSettings.addEventListener('click', closeSettingsFn);
  // close by background click
  settings.addEventListener('click', (e)=>{ if(e.target === settings) closeSettingsFn(); });

  manualSaveBtn && manualSaveBtn.addEventListener('click', manualBackup);
  manualSaveInModal && manualSaveInModal.addEventListener('click', manualBackup);
  resetBtn && resetBtn.addEventListener('click', resetAll);

  // settings controls
  bgmToggle.addEventListener('change', (e)=>{
    bgmOn = e.target.checked;
    if(bgmOn){ bgm && bgm.play().catch(()=>{}); } else { bgm && bgm.pause(); }
  });
  volumeRange.addEventListener('input', (e)=>{
    volume = parseFloat(e.target.value);
    if(bgm) bgm.volume = volume;
  });
  uiSize.addEventListener('change', (e)=>{
    document.documentElement.classList.toggle('large-ui', e.target.value === 'large');
  });

  // idle income per second
  setInterval(()=>{
    if(state.idleRate > 0){
      state.coins += state.idleRate;
      updateUI();
    }
  }, 1000);

  // autosave every 15s
  setInterval(saveAuto, 15000);

  // initial
  initBGM();
  renderShop();
  load();
  updateUI();

  // expose some for debugging (optional)
  window.slimeState = state;
  window.saveNow = saveAuto;
});

/* small animation keyframes injected once */
(function(){
  const s = document.createElement('style');
  s.textContent = `
  @keyframes floatUp { 0% { opacity:1; transform: translateY(0);} 100% { opacity:0; transform: translateY(-28px);} }
  `;
  document.head.appendChild(s);
})();
