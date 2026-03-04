// === STATE ===
let followersFile = null;
let followingFile = null;
let resultData = null;
let currentTab = 'mutual';
let userTags = {};
let customTagList = ['Deactivated', 'Spam', 'Bot', 'Brand', 'Close Friend', 'Celebrity'];
let activeFilterTag = null;

// === ELEMENTS ===
const $followersInput = document.getElementById('followersInput');
const $followingInput = document.getElementById('followingInput');
const $dropFollowers = document.getElementById('dropFollowers');
const $dropFollowing = document.getElementById('dropFollowing');
const $analyzeBtn = document.getElementById('analyzeBtn');
const $errorMsg = document.getElementById('errorMsg');
const $results = document.getElementById('results');
const $searchBox = document.getElementById('searchBox');
const $userList = document.getElementById('userList');
const $listFooter = document.getElementById('listFooter');
const $copyBtn = document.getElementById('copyBtn');

// === TAG COLORS ===
const tagColorMap = {
  'Deactivated': { bg: 'rgba(242,92,106,0.15)', text: '#f25c6a', border: 'rgba(242,92,106,0.3)' },
  'Spam':        { bg: 'rgba(245,158,66,0.15)', text: '#f59e42', border: 'rgba(245,158,66,0.3)' },
  'Bot':         { bg: 'rgba(245,158,66,0.15)', text: '#f59e42', border: 'rgba(245,158,66,0.3)' },
  'Brand':       { bg: 'rgba(91,143,249,0.15)', text: '#5b8ff9', border: 'rgba(91,143,249,0.3)' },
  'Close Friend':{ bg: 'rgba(61,214,140,0.15)', text: '#3dd68c', border: 'rgba(61,214,140,0.3)' },
  'Celebrity':   { bg: 'rgba(200,80,242,0.15)', text: '#c850f2', border: 'rgba(200,80,242,0.3)' },
};

const defaultTagColor = { bg: 'rgba(136,136,160,0.15)', text: '#8888a0', border: 'rgba(136,136,160,0.3)' };

function getTagColor(tag) {
  return tagColorMap[tag] || defaultTagColor;
}

// === AVATAR COLORS ===
const avatarColors = [
  ['#c850f2','#1a0a24'], ['#3dd68c','#0a1f14'], ['#f59e42','#241608'],
  ['#5b8ff9','#0a1224'], ['#f25c6a','#240a0c'], ['#e879f9','#1f0a24'],
  ['#38bdf8','#0a1a24'], ['#facc15','#241f08'],
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

// === FILE INPUT HANDLING ===
function setupDropZone(dropEl, inputEl, onFile, fileNameEl) {
  inputEl.addEventListener('change', () => {
    if (inputEl.files[0]) {
      onFile(inputEl.files[0]);
      dropEl.classList.add('has-file');
      fileNameEl.textContent = '✓ ' + inputEl.files[0].name;
      checkReady();
    }
  });

  ['dragenter', 'dragover'].forEach(evt => {
    dropEl.addEventListener(evt, e => { e.preventDefault(); dropEl.classList.add('drag-over'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropEl.addEventListener(evt, e => { e.preventDefault(); dropEl.classList.remove('drag-over'); });
  });

  dropEl.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file) {
      onFile(file);
      dropEl.classList.add('has-file');
      fileNameEl.textContent = '✓ ' + file.name;
      checkReady();
    }
  });
}

setupDropZone($dropFollowers, $followersInput, f => followersFile = f, document.getElementById('followersFileName'));
setupDropZone($dropFollowing, $followingInput, f => followingFile = f, document.getElementById('followingFileName'));

function checkReady() {
  $analyzeBtn.disabled = !(followersFile && followingFile);
}

// === PARSE INSTAGRAM JSON ===
function parseIG(data) {
  const usernames = new Set();

  function walk(node) {
    if (!node || typeof node !== 'object') return;

    if (node.string_list_data && Array.isArray(node.string_list_data)) {
      for (const e of node.string_list_data) {
        if (e.value) usernames.add(e.value);
      }
      if (node.title && typeof node.title === 'string' && node.title.length > 0) {
        usernames.add(node.title);
      }
      return;
    }

    if (typeof node.username === 'string') { usernames.add(node.username); return; }

    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    for (const key of Object.keys(node)) {
      walk(node[key]);
    }
  }

  walk(data);
  return usernames;
}

// === ANALYZE ===
$analyzeBtn.addEventListener('click', async () => {
  $errorMsg.classList.remove('show');
  $analyzeBtn.classList.add('loading');
  $analyzeBtn.disabled = true;

  try {
    const [followersText, followingText] = await Promise.all([
      followersFile.text(),
      followingFile.text()
    ]);

    let followersData, followingData;
    try {
      followersData = JSON.parse(followersText);
      followingData = JSON.parse(followingText);
    } catch {
      throw new Error('Invalid JSON file(s). Make sure you exported in JSON format.');
    }

    const followers = parseIG(followersData);
    const following = parseIG(followingData);

    if (followers.size === 0 && following.size === 0) {
      throw new Error('Could not find any usernames. Make sure these are Instagram data export files.');
    }

    const mutual = [...followers].filter(u => following.has(u)).sort();
    const notFollowingBack = [...following].filter(u => !followers.has(u)).sort();
    const youDontFollow = [...followers].filter(u => !following.has(u)).sort();

    resultData = {
      stats: {
        total_followers: followers.size,
        total_following: following.size,
        mutual: mutual.length,
        not_following_back: notFollowingBack.length,
        you_dont_follow: youDontFollow.length,
      },
      mutual,
      not_following_back: notFollowingBack,
      you_dont_follow: youDontFollow,
    };

    loadFromLocalStorage();
    renderResults();
    autoSave();
  } catch (err) {
    $errorMsg.textContent = err.message || 'Something went wrong.';
    $errorMsg.classList.add('show');
  } finally {
    $analyzeBtn.classList.remove('loading');
    $analyzeBtn.disabled = false;
  }
});

// === RENDER RESULTS ===
function renderResults() {
  const s = resultData.stats;
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card followers">
      <div class="stat-val">${s.total_followers.toLocaleString()}</div>
      <div class="stat-label">Followers</div>
    </div>
    <div class="stat-card following">
      <div class="stat-val">${s.total_following.toLocaleString()}</div>
      <div class="stat-label">Following</div>
    </div>
    <div class="stat-card mutual">
      <div class="stat-val">${s.mutual.toLocaleString()}</div>
      <div class="stat-label">Mutual</div>
    </div>
    <div class="stat-card not-back">
      <div class="stat-val">${s.not_following_back.toLocaleString()}</div>
      <div class="stat-label">Don't Follow Back</div>
    </div>
    <div class="stat-card you-dont">
      <div class="stat-val">${s.you_dont_follow.toLocaleString()}</div>
      <div class="stat-label">You Don't Follow</div>
    </div>
  `;

  document.getElementById('countMutual').textContent = s.mutual;
  document.getElementById('countNotBack').textContent = s.not_following_back;
  document.getElementById('countYouDont').textContent = s.you_dont_follow;

  $results.classList.add('show');
  $results.scrollIntoView({ behavior: 'smooth', block: 'start' });

  currentTab = 'mutual';
  renderTagFilters();
  renderList();
  setActiveTab();
}

// === TAG FILTER BAR ===
function renderTagFilters() {
  const $filterBar = document.getElementById('tagFilterBar');
  if (!$filterBar) return;

  const usedTags = new Set();
  for (const tags of Object.values(userTags)) {
    for (const t of tags) usedTags.add(t);
  }

  if (usedTags.size === 0) {
    $filterBar.innerHTML = '';
    $filterBar.style.display = 'none';
    return;
  }

  $filterBar.style.display = 'flex';
  const allActive = activeFilterTag === null ? 'active' : '';
  let html = `<button class="filter-chip ${allActive}" data-filter="">All</button>`;

  for (const tag of [...usedTags].sort()) {
    const c = getTagColor(tag);
    const active = activeFilterTag === tag ? 'active' : '';
    const count = countTagInCurrentTab(tag);
    html += `<button class="filter-chip ${active}" data-filter="${tag}" style="--chip-bg:${c.bg};--chip-text:${c.text};--chip-border:${c.border}">${tag} <span class="filter-count">${count}</span></button>`;
  }

  $filterBar.innerHTML = html;
}

function countTagInCurrentTab(tag) {
  const list = resultData ? (resultData[currentTab] || []) : [];
  return list.filter(u => (userTags[u] || []).includes(tag)).length;
}

document.addEventListener('click', e => {
  const chip = e.target.closest('.filter-chip');
  if (!chip) return;
  const filter = chip.dataset.filter;
  activeFilterTag = filter || null;
  renderTagFilters();
  renderList();
});

// === RENDER LIST ===
function renderList() {
  const list = resultData[currentTab] || [];
  const query = $searchBox.value.toLowerCase().trim();
  let filtered = query ? list.filter(u => u.toLowerCase().includes(query)) : list;

  if (activeFilterTag) {
    filtered = filtered.filter(u => (userTags[u] || []).includes(activeFilterTag));
  }

  if (filtered.length === 0) {
    $userList.innerHTML = `<div class="empty-state">${query || activeFilterTag ? 'No matching usernames' : 'No users in this category'}</div>`;
    $listFooter.textContent = '';
    return;
  }

  $userList.innerHTML = filtered.map(username => {
    const [bg, fg] = getAvatarColor(username);
    const tags = userTags[username] || [];
    const tagsHtml = tags.map(t => {
      const c = getTagColor(t);
      return `<span class="user-tag" style="background:${c.bg};color:${c.text};border-color:${c.border}">${t}<button class="tag-remove" data-user="${username}" data-tag="${t}">&times;</button></span>`;
    }).join('');

    return `
      <div class="user-item">
        <div class="user-avatar" style="background:${bg};color:${fg}">${username[0]}</div>
        <div class="user-info">
          <span class="user-name">@${username}</span>
          <div class="user-tags-row">${tagsHtml}</div>
        </div>
        <button class="btn-tag" data-user="${username}" title="Add tag">+</button>
        <a class="user-link" href="https://instagram.com/${username}" target="_blank" rel="noopener">Open ↗</a>
      </div>`;
  }).join('');

  $listFooter.textContent = `Showing ${filtered.length} of ${list.length} users`;
}

// === TAG POPUP ===
let activeTagPopup = null;

function closeTagPopup() {
  if (activeTagPopup) {
    activeTagPopup.remove();
    activeTagPopup = null;
  }
}

document.addEventListener('click', e => {
  const tagBtn = e.target.closest('.btn-tag');
  if (tagBtn) {
    e.stopPropagation();
    showTagPopup(tagBtn, tagBtn.dataset.user);
    return;
  }

  const removeBtn = e.target.closest('.tag-remove');
  if (removeBtn) {
    e.stopPropagation();
    removeTag(removeBtn.dataset.user, removeBtn.dataset.tag);
    return;
  }

  if (activeTagPopup && !e.target.closest('.tag-popup')) {
    closeTagPopup();
  }
});

function showTagPopup(anchor, username) {
  closeTagPopup();

  const popup = document.createElement('div');
  popup.className = 'tag-popup';

  const existingTags = userTags[username] || [];

  let optionsHtml = customTagList.map(tag => {
    const isActive = existingTags.includes(tag);
    const c = getTagColor(tag);
    return `<button class="tag-option ${isActive ? 'active' : ''}" data-tag="${tag}" style="--tag-bg:${c.bg};--tag-text:${c.text};--tag-border:${c.border}">
      <span class="tag-check">${isActive ? '✓' : ''}</span>${tag}
    </button>`;
  }).join('');

  popup.innerHTML = `
    <div class="tag-popup-header">Tag @${username}</div>
    <div class="tag-popup-options">${optionsHtml}</div>
    <div class="tag-popup-custom">
      <input type="text" class="tag-custom-input" placeholder="Custom tag…" maxlength="20">
      <button class="tag-custom-add">Add</button>
    </div>
  `;

  const rect = anchor.getBoundingClientRect();
  popup.style.position = 'fixed';
  popup.style.top = (rect.bottom + 6) + 'px';
  popup.style.left = Math.min(rect.left, window.innerWidth - 240) + 'px';
  popup.style.zIndex = '1000';

  document.body.appendChild(popup);
  activeTagPopup = popup;

  popup.querySelectorAll('.tag-option').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggleTag(username, btn.dataset.tag);
      showTagPopup(anchor, username);
    });
  });

  const customInput = popup.querySelector('.tag-custom-input');
  const customAddBtn = popup.querySelector('.tag-custom-add');

  function addCustomTag() {
    const val = customInput.value.trim();
    if (val && !customTagList.includes(val)) {
      customTagList.push(val);
    }
    if (val) {
      addTag(username, val);
      showTagPopup(anchor, username);
    }
  }

  customAddBtn.addEventListener('click', (ev) => { ev.stopPropagation(); addCustomTag(); });
  customInput.addEventListener('keydown', (ev) => {
    ev.stopPropagation();
    if (ev.key === 'Enter') addCustomTag();
  });

  customInput.focus();
}

// === TAG OPERATIONS ===
function addTag(username, tag) {
  if (!userTags[username]) userTags[username] = [];
  if (!userTags[username].includes(tag)) {
    userTags[username].push(tag);
  }
  renderTagFilters();
  renderList();
  autoSave();
}

function removeTag(username, tag) {
  if (!userTags[username]) return;
  userTags[username] = userTags[username].filter(t => t !== tag);
  if (userTags[username].length === 0) delete userTags[username];
  renderTagFilters();
  renderList();
  autoSave();
}

function toggleTag(username, tag) {
  if (!userTags[username]) userTags[username] = [];
  if (userTags[username].includes(tag)) {
    removeTag(username, tag);
  } else {
    addTag(username, tag);
  }
}

// === SAVE / LOAD ===
const STORAGE_KEY = 'ig-follower-checker';

function autoSave() {
  try {
    const saveData = {
      resultData,
      userTags,
      customTagList,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    showSaveIndicator();
  } catch (e) {
    console.warn('Could not auto-save:', e);
  }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.userTags) userTags = saved.userTags;
    if (saved.customTagList) {
      for (const t of saved.customTagList) {
        if (!customTagList.includes(t)) customTagList.push(t);
      }
    }
  } catch (e) {
    console.warn('Could not load saved data:', e);
  }
}

function loadFullFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    if (saved.resultData) {
      resultData = saved.resultData;
      if (saved.userTags) userTags = saved.userTags;
      if (saved.customTagList) customTagList = saved.customTagList;
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function exportData() {
  if (!resultData) return;
  const exportObj = {
    resultData,
    userTags,
    customTagList,
    exportedAt: new Date().toISOString(),
  };
  const jsonStr = JSON.stringify(exportObj, null, 2);
  const defaultName = `ig-checker-save-${new Date().toISOString().slice(0,10)}.json`;

  // Use native Save As dialog if browser supports it
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: defaultName,
        types: [{
          description: 'JSON Save File',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(jsonStr);
      await writable.close();
      return;
    } catch (err) {
      // User cancelled the dialog
      if (err.name === 'AbortError') return;
    }
  }

  // Fallback: auto-download
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  file.text().then(text => {
    try {
      const data = JSON.parse(text);
      if (data.resultData) {
        resultData = data.resultData;
        userTags = data.userTags || {};
        customTagList = data.customTagList || customTagList;
        renderResults();
        autoSave();
        $errorMsg.classList.remove('show');
      } else {
        throw new Error('Invalid save file.');
      }
    } catch (err) {
      $errorMsg.textContent = err.message || 'Could not load save file.';
      $errorMsg.classList.add('show');
    }
  });
}

function showSaveIndicator() {
  const $indicator = document.getElementById('saveIndicator');
  if (!$indicator) return;
  $indicator.classList.add('show');
  clearTimeout($indicator._timeout);
  $indicator._timeout = setTimeout(() => $indicator.classList.remove('show'), 1500);
}

// === SAVE BAR HANDLERS ===
document.addEventListener('click', e => {
  if (e.target.closest('#btnExport')) exportData();
  if (e.target.closest('#btnClearData')) {
    if (confirm('Clear all saved data and tags? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEY);
      userTags = {};
      activeFilterTag = null;
      renderTagFilters();
      renderList();
    }
  }
});

document.addEventListener('change', e => {
  if (e.target.closest('#importInput')) {
    const file = e.target.files[0];
    if (file) importData(file);
    e.target.value = '';
  }
});

// === TABS ===
document.getElementById('tabsBar').addEventListener('click', e => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  currentTab = btn.dataset.tab;
  setActiveTab();
  $searchBox.value = '';
  activeFilterTag = null;
  renderTagFilters();
  renderList();
});

function setActiveTab() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === currentTab);
  });
}

// === SEARCH ===
$searchBox.addEventListener('input', renderList);

// === COPY ===
$copyBtn.addEventListener('click', () => {
  const list = resultData[currentTab] || [];
  navigator.clipboard.writeText(list.join('\n')).then(() => {
    $copyBtn.textContent = 'Copied!';
    setTimeout(() => $copyBtn.textContent = 'Copy List', 1500);
  });
});

// === LOAD PREVIOUS SESSION ===
window.addEventListener('DOMContentLoaded', () => {
  if (loadFullFromLocalStorage()) {
    renderResults();
    const $loadBanner = document.getElementById('loadBanner');
    if ($loadBanner) $loadBanner.classList.add('show');
  }
});
