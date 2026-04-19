/**
 * BugSlayer - UI Module
 * Handles all DOM rendering, modal management, toasts, and UI state
 */

const UI = (() => {

  // --- Init ---
  const init = (state) => {
    populateCategorySelects(state.categories);
    setSortUI(state.settings);
    setSearchUI(state.settings.search || '');
    renderCategories(state.categories, state.settings.activeCategory);
    setActiveFilter(state.settings.activeFilter);
  };

  // --- Render Tasks ---
  const renderTasks = (filteredTasks, allTasks) => {
    const list = document.getElementById('taskList');
    if (!list) return;

    if (filteredTasks.length === 0) {
      list.innerHTML = renderEmptyState();
      return;
    }

    list.innerHTML = filteredTasks.map((task, index) => renderTaskCard(task, index)).join('');

    // Re-attach animations
    requestAnimationFrame(() => {
      list.querySelectorAll('.task-card').forEach((card, i) => {
        card.style.animationDelay = `${i * 40}ms`;
        card.classList.add('card-enter');
      });
    });
  };

  // --- Task Card ---
  const renderTaskCard = (task, index) => {
    const p         = Utils.PRIORITY[task.priority] || Utils.PRIORITY.medium;
    const overdue   = Utils.isOverdue(task.dueDate, task.completed);
    const dueToday  = Utils.isDueToday(task.dueDate);
    const dueSoon   = Utils.isDueSoon(task.dueDate, 3);

    let dueBadge = '';
    if (task.dueDate) {
      let badgeClass = 'badge-due-default';
      let badgeLabel = Utils.formatDate(task.dueDate);
      if (overdue)        { badgeClass = 'badge-overdue'; badgeLabel = '⚠️ Overdue · ' + Utils.formatDate(task.dueDate); }
      else if (dueToday)  { badgeClass = 'badge-today';   badgeLabel = '🔔 Due Today'; }
      else if (dueSoon)   { badgeClass = 'badge-soon';    badgeLabel = '⏳ ' + Utils.formatDate(task.dueDate); }
      dueBadge = `<span class="badge ${badgeClass}">${badgeLabel}</span>`;
    }

    const tags = (task.tags || [])
      .map(tag => `<span class="tag">#${Utils.sanitize(tag)}</span>`)
      .join('');

    const categoryBadge = task.category
      ? `<span class="badge badge-category">${Utils.sanitize(task.category)}</span>`
      : '';

    const completedClass = task.completed ? 'task-completed' : '';
    const overdueClass   = overdue ? 'task-overdue' : '';

    return `
      <div class="task-card ${completedClass} ${overdueClass} priority-border-${task.priority}"
           data-id="${task.id}" draggable="true">
        <div class="task-card-left">
          <button class="btn-complete ${task.completed ? 'is-done' : ''}" title="${task.completed ? 'Mark incomplete' : 'Mark complete'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              ${task.completed
                ? '<polyline points="20 6 9 17 4 12"></polyline>'
                : '<circle cx="12" cy="12" r="10"></circle>'}
            </svg>
          </button>
        </div>

        <div class="task-card-body">
          <div class="task-card-header">
            <span class="priority-icon" title="Priority: ${p.label}">${p.icon}</span>
            <h3 class="task-title">${Utils.sanitize(task.title)}</h3>
            <div class="task-actions">
              <button class="btn-icon btn-edit" title="Edit task">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="btn-icon btn-delete" title="Delete task">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                  <path d="M10 11v6M14 11v6"></path>
                  <path d="M9 6V4h6v2"></path>
                </svg>
              </button>
            </div>
          </div>

          ${task.description
            ? `<p class="task-description">${Utils.sanitize(Utils.truncate(task.description, 120))}</p>`
            : ''}

          <div class="task-meta">
            ${categoryBadge}
            ${dueBadge}
            ${tags ? `<div class="task-tags">${tags}</div>` : ''}
            <span class="task-time" title="${new Date(task.updatedAt || task.createdAt).toLocaleString()}">
              ${task.completed && task.completedAt
                ? '✅ Slayed ' + Utils.getRelativeTime(task.completedAt)
                : '🕐 ' + Utils.getRelativeTime(task.createdAt)}
            </span>
          </div>
        </div>

        <div class="drag-handle" title="Drag to reorder">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <circle cx="9"  cy="5"  r="1.5"/><circle cx="15" cy="5"  r="1.5"/>
            <circle cx="9"  cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9"  cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
          </svg>
        </div>
      </div>
    `;
  };

  // --- Empty State ---
  const renderEmptyState = () => `
    <div class="empty-state">
      <div class="empty-icon">🐛</div>
      <h3>No bugs here!</h3>
      <p>All clear — or try adjusting your filters.</p>
    </div>
  `;

  // --- Stats ---
  const renderStats = (stats) => {
    const el = (id, val) => {
      const node = document.getElementById(id);
      if (node) node.textContent = val;
    };
    el('statTotal',     stats.total);
    el('statActive',    stats.active);
    el('statCompleted', stats.completed);
    el('statOverdue',   stats.overdue);
    el('statCritical',  stats.critical);

    // Progress bar
    const bar = document.getElementById('progressBar');
    const pct = document.getElementById('progressPct');
    if (bar) bar.style.width = stats.percent + '%';
    if (pct) pct.textContent = stats.percent + '%';
  };

  // --- Filter Counts ---
  const renderFilterCounts = (counts) => {
    document.querySelectorAll('[data-filter]').forEach(btn => {
      const key   = btn.dataset.filter;
      const badge = btn.querySelector('.filter-count');
      if (badge && counts[key] !== undefined) {
        badge.textContent = counts[key];
        badge.style.display = counts[key] > 0 ? 'inline-flex' : 'none';
      }
    });
  };

  // --- Categories Sidebar ---
  const renderCategories = (categories, activeCategory) => {
    const list = document.getElementById('categoryList');
    if (!list) return;

    const allActive = activeCategory === 'all' ? 'active' : '';

    list.innerHTML = `
      <li>
        <button class="category-btn ${allActive}" data-cat="all"
          onclick="App.setCategory('all')">
          <span>🗂️ All Categories</span>
        </button>
      </li>
      ${categories.map(cat => `
        <li>
          <button class="category-btn ${activeCategory === cat ? 'active' : ''}" data-cat="${Utils.sanitize(cat)}"
            onclick="App.setCategory('${Utils.sanitize(cat)}')">
            <span>${getCategoryIcon(cat)} ${Utils.sanitize(cat)}</span>
            <button class="btn-remove-cat" onclick="event.stopPropagation(); if(confirm('Remove category?')) App.deleteCategory('${Utils.sanitize(cat)}')" title="Remove">×</button>
          </button>
        </li>
      `).join('')}
    `;
  };

  // --- Category Icons Map ---
  const getCategoryIcon = (cat) => {
    const icons = {
      'Bug Fix':   '🐛',
      'Feature':   '✨',
      'Refactor':  '🔧',
      'Testing':   '🧪',
      'Docs':      '📄',
      'DevOps':    '⚙️',
    };
    return icons[cat] || '📌';
  };

  // --- Active Filter ---
  const setActiveFilter = (filter) => {
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
  };

  // --- Populate Category Selects ---
  const populateCategorySelects = (categories) => {
    ['taskCategory', 'editCategory'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const current = sel.value;
      const opts = ['<option value="">— Select Category —</option>',
        ...categories.map(c => `<option value="${Utils.sanitize(c)}" ${current === c ? 'selected' : ''}>${Utils.sanitize(c)}</option>`)
      ].join('');
      sel.innerHTML = opts;
    });
  };

  // --- Sort UI ---
  const setSortUI = (settings) => {
    const sel = document.getElementById('sortBy');
    if (sel) sel.value = settings.sortBy || 'createdAt';
    const btn = document.getElementById('sortOrder');
    if (btn) btn.textContent = settings.sortOrder === 'asc' ? '↑' : '↓';
  };

  const setSearchUI = (query) => {
    const inp = document.getElementById('searchInput');
    if (inp) inp.value = query || '';
  };

  // --- Modal ---
  const openModal = (task, categories) => {
    const overlay = document.getElementById('modalOverlay');
    if (!overlay) return;

    // Populate edit form
    document.getElementById('editTitle').value       = task.title || '';
    document.getElementById('editDescription').value = task.description || '';
    document.getElementById('editPriority').value    = task.priority || 'medium';
    document.getElementById('editDueDate').value     = Utils.toInputDate(task.dueDate) || '';
    document.getElementById('editTags').value        = (task.tags || []).join(', ');

    // Populate category select
    const sel = document.getElementById('editCategory');
    sel.innerHTML = ['<option value="">— Select Category —</option>',
      ...categories.map(c => `<option value="${Utils.sanitize(c)}" ${task.category === c ? 'selected' : ''}>${Utils.sanitize(c)}</option>`)
    ].join('');
    sel.value = task.category || '';

    overlay.classList.add('open');
    document.getElementById('editTitle')?.focus();
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    document.getElementById('modalOverlay')?.classList.remove('open');
    document.body.style.overflow = '';
  };

  // --- Collapse Add Form ---
  const collapseAddForm = () => {
    const form = document.getElementById('addTaskFormWrap');
    const toggle = document.getElementById('toggleAddForm');
    if (form) form.classList.remove('open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  };

  // --- Toast Notifications ---
  const showToast = (message, type = 'info') => {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => toast.classList.add('toast-show'));

    // Auto-remove
    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  };

  // --- Theme Toggle ---
  const updateThemeToggle = (theme) => {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  };

  return {
    init,
    renderTasks,
    renderStats,
    renderFilterCounts,
    renderCategories,
    setActiveFilter,
    populateCategorySelects,
    openModal,
    closeModal,
    collapseAddForm,
    showToast,
    updateThemeToggle,
  };
})();