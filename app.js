/**
 * BugSlayer - App Module
 * Core application state management and business logic
 */

const App = (() => {
  // --- State ---
  let state = {
    tasks: [],
    categories: [],
    settings: {},
    editingTaskId: null,
    dragSrcIndex: null,
  };

  // --- Init ---
  const init = () => {
    state.tasks      = Storage.getTasks();
    state.categories = Storage.getCategories();
    state.settings   = Storage.getSettings();

    applyTheme(state.settings.theme);
    UI.init(state);
    bindEvents();
    render();

    // Seed demo tasks if empty
    if (state.tasks.length === 0) seedDemoTasks();
  };

  // --- Render ---
  const render = () => {
    const filtered = Filters.apply(state.tasks, {
      filter:    state.settings.activeFilter,
      category:  state.settings.activeCategory,
      search:    state.settings.search || '',
      sortBy:    state.settings.sortBy,
      sortOrder: state.settings.sortOrder,
    });

    const counts = Filters.getCounts(state.tasks);
    const stats  = Utils.calcStats(state.tasks);

    UI.renderTasks(filtered, state.tasks);
    UI.renderStats(stats);
    UI.renderFilterCounts(counts);
    UI.renderCategories(state.categories, state.settings.activeCategory);
    UI.updateThemeToggle(state.settings.theme);
  };

  // --- Task CRUD ---
  const addTask = (taskData) => {
    const task = {
      id:          Utils.generateId(),
      title:       taskData.title.trim(),
      description: taskData.description?.trim() || '',
      priority:    taskData.priority || 'medium',
      category:    taskData.category || '',
      dueDate:     taskData.dueDate || null,
      tags:        parseTags(taskData.tags),
      completed:   false,
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
    };

    state.tasks.unshift(task);
    persist();
    render();
    UI.showToast('Bug logged! 🐛', 'success');
    return task;
  };

  const updateTask = (id, updates) => {
    const idx = state.tasks.findIndex(t => t.id === id);
    if (idx === -1) return;

    state.tasks[idx] = {
      ...state.tasks[idx],
      ...updates,
      tags:      updates.tags !== undefined ? parseTags(updates.tags) : state.tasks[idx].tags,
      updatedAt: new Date().toISOString(),
    };

    persist();
    render();
    UI.showToast('Task updated! ✏️', 'info');
  };

  const deleteTask = (id) => {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    state.tasks = state.tasks.filter(t => t.id !== id);
    persist();
    render();
    UI.showToast('Task squashed! 💥', 'danger');
  };

  const toggleComplete = (id) => {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    task.updatedAt = new Date().toISOString();
    if (task.completed) task.completedAt = new Date().toISOString();
    else delete task.completedAt;

    persist();
    render();

    const msg = task.completed ? 'Bug slayed! 🗡️' : 'Task reopened 🔄';
    UI.showToast(msg, task.completed ? 'success' : 'info');
  };

  const deleteCompleted = () => {
    const count = state.tasks.filter(t => t.completed).length;
    if (count === 0) { UI.showToast('No completed tasks to clear.', 'info'); return; }
    state.tasks = state.tasks.filter(t => !t.completed);
    persist();
    render();
    UI.showToast(`${count} task(s) cleared! 🧹`, 'success');
  };

  const deleteAll = () => {
    state.tasks = [];
    persist();
    render();
    UI.showToast('All tasks cleared! 🗑️', 'danger');
  };

  // --- Category Management ---
  const addCategory = (name) => {
    const trimmed = name.trim();
    if (!trimmed || state.categories.includes(trimmed)) return;
    state.categories.push(trimmed);
    Storage.saveCategories(state.categories);
    render();
  };

  const deleteCategory = (name) => {
    state.categories = state.categories.filter(c => c !== name);
    // Remove category from tasks
    state.tasks = state.tasks.map(t =>
      t.category === name ? { ...t, category: '' } : t
    );
    Storage.saveCategories(state.categories);
    persist();
    render();
    UI.showToast(`Category "${name}" removed.`, 'info');
  };

  // --- Settings ---
  const setFilter = (filter) => {
    state.settings.activeFilter = filter;
    saveSettings();
    render();
  };

  const setCategory = (category) => {
    state.settings.activeCategory = category;
    saveSettings();
    render();
  };

  const setSearch = (query) => {
    state.settings.search = query;
    saveSettings();
    render();
  };

  const setSort = (sortBy, sortOrder) => {
    state.settings.sortBy    = sortBy;
    state.settings.sortOrder = sortOrder;
    saveSettings();
    render();
  };

  const toggleTheme = () => {
    state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
    applyTheme(state.settings.theme);
    saveSettings();
    UI.updateThemeToggle(state.settings.theme);
  };

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  };

  // --- Edit State ---
  const startEdit = (id) => {
    state.editingTaskId = id;
    const task = state.tasks.find(t => t.id === id);
    if (task) UI.openModal(task, state.categories);
  };

  const cancelEdit = () => {
    state.editingTaskId = null;
  };

  // --- Drag & Drop ---
  const setDragSrc = (index) => { state.dragSrcIndex = index; };

  const reorderTasks = (fromIndex, toIndex, filteredIds) => {
    if (fromIndex === toIndex) return;

    // Map filtered indices to actual task IDs
    const fromId = filteredIds[fromIndex];
    const toId   = filteredIds[toIndex];

    const fromIdx = state.tasks.findIndex(t => t.id === fromId);
    const toIdx   = state.tasks.findIndex(t => t.id === toId);

    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = state.tasks.splice(fromIdx, 1);
    state.tasks.splice(toIdx, 0, moved);

    persist();
    render();
  };

  // --- Export ---
  const exportTasks = () => {
    Utils.exportToJSON(state.tasks);
    UI.showToast('Tasks exported! 📦', 'success');
  };

  const importTasks = (jsonStr) => {
    try {
      const imported = JSON.parse(jsonStr);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      // Merge — avoid duplicates by ID
      const existingIds = new Set(state.tasks.map(t => t.id));
      const newTasks = imported.filter(t => !existingIds.has(t.id));
      state.tasks = [...newTasks, ...state.tasks];
      persist();
      render();
      UI.showToast(`${newTasks.length} task(s) imported! 📥`, 'success');
    } catch (e) {
      UI.showToast('Import failed — invalid JSON file.', 'danger');
    }
  };

  // --- Helpers ---
  const parseTags = (tagsInput) => {
    if (!tagsInput) return [];
    if (Array.isArray(tagsInput)) return tagsInput.map(t => t.trim()).filter(Boolean);
    return tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
  };

  const persist = () => {
    Storage.saveTasks(state.tasks);
  };

  const saveSettings = () => {
    Storage.saveSettings(state.settings);
  };

  const getState = () => ({ ...state });

  // --- Seed Demo Tasks ---
  const seedDemoTasks = () => {
    const demos = [
      {
        id: Utils.generateId(), title: 'Fix login page null pointer exception',
        description: 'Users getting 500 error when submitting empty password field. Stack trace in Sentry #4421.',
        priority: 'critical', category: 'Bug Fix',
        dueDate: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
        tags: ['auth', 'backend', 'urgent'], completed: false,
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      },
      {
        id: Utils.generateId(), title: 'Add dark mode to settings panel',
        description: 'Users have requested a dark mode toggle in the user preferences screen.',
        priority: 'high', category: 'Feature',
        dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        tags: ['ui', 'settings', 'design'], completed: false,
        createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
      },
      {
        id: Utils.generateId(), title: 'Write unit tests for payment module',
        description: 'Coverage is at 34%. Need to reach 80% before next release.',
        priority: 'high', category: 'Testing',
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        tags: ['tests', 'payments', 'coverage'], completed: false,
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
      {
        id: Utils.generateId(), title: 'Refactor database query builder',
        description: 'Current implementation has N+1 query issues. Rewrite with eager loading.',
        priority: 'medium', category: 'Refactor',
        dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
        tags: ['db', 'performance'], completed: false,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: Utils.generateId(), title: 'Update API documentation for v2 endpoints',
        description: 'New REST endpoints added in sprint 12 are undocumented. Update Swagger spec.',
        priority: 'medium', category: 'Docs',
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        tags: ['api', 'docs', 'swagger'], completed: false,
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: Utils.generateId(), title: 'Set up CI/CD pipeline for staging environment',
        description: 'GitHub Actions workflow needed for auto-deploy to staging on merge to dev branch.',
        priority: 'low', category: 'DevOps',
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        tags: ['ci/cd', 'github-actions', 'devops'], completed: true,
        completedAt: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    state.tasks = demos;
    persist();
    render();
  };

  // --- Bind Global Events ---
  const bindEvents = () => {
    // Theme toggle
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        setSearch(e.target.value);
      }, 250));
    }

    // Sort controls
    document.getElementById('sortBy')?.addEventListener('change', (e) => {
      setSort(e.target.value, state.settings.sortOrder);
    });
    document.getElementById('sortOrder')?.addEventListener('click', () => {
      const newOrder = state.settings.sortOrder === 'asc' ? 'desc' : 'asc';
      setSort(state.settings.sortBy, newOrder);
      document.getElementById('sortOrder').textContent = newOrder === 'asc' ? '↑' : '↓';
    });

    // Add task form
    document.getElementById('addTaskForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const title = fd.get('title')?.trim();
      if (!title) { UI.showToast('Task title is required!', 'danger'); return; }

      addTask({
        title,
        description: fd.get('description'),
        priority:    fd.get('priority'),
        category:    fd.get('category'),
        dueDate:     fd.get('dueDate'),
        tags:        fd.get('tags'),
      });

      e.target.reset();
      UI.collapseAddForm();
    });

    // Edit modal form
    document.getElementById('editTaskForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!state.editingTaskId) return;
      const fd = new FormData(e.target);
      const title = fd.get('title')?.trim();
      if (!title) { UI.showToast('Task title is required!', 'danger'); return; }

      updateTask(state.editingTaskId, {
        title,
        description: fd.get('description'),
        priority:    fd.get('priority'),
        category:    fd.get('category'),
        dueDate:     fd.get('dueDate'),
        tags:        fd.get('tags'),
      });

      cancelEdit();
      UI.closeModal();
    });

    // Modal close
    document.getElementById('modalClose')?.addEventListener('click', () => {
      cancelEdit();
      UI.closeModal();
    });
    document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) { cancelEdit(); UI.closeModal(); }
    });

    // Filter tabs
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });

    // Export
    document.getElementById('exportBtn')?.addEventListener('click', exportTasks);

    // Import
    document.getElementById('importBtn')?.addEventListener('click', () => {
      document.getElementById('importFile')?.click();
    });
    document.getElementById('importFile')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => importTasks(ev.target.result);
      reader.readAsText(file);
      e.target.value = '';
    });

    // Clear completed
    document.getElementById('clearCompletedBtn')?.addEventListener('click', () => {
      if (confirm('Clear all completed tasks?')) deleteCompleted();
    });

    // Add category
    document.getElementById('addCategoryForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('newCategoryInput');
      addCategory(input.value);
      input.value = '';
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { cancelEdit(); UI.closeModal(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
      }
    });

    // Delegate task events (toggle, edit, delete)
    document.getElementById('taskList')?.addEventListener('click', (e) => {
      const card  = e.target.closest('.task-card');
      if (!card) return;
      const id = card.dataset.id;

      if (e.target.closest('.btn-complete')) toggleComplete(id);
      else if (e.target.closest('.btn-edit'))   startEdit(id);
      else if (e.target.closest('.btn-delete')) {
        if (confirm('Delete this task?')) deleteTask(id);
      }
    });

    // Drag & Drop delegation
    const taskList = document.getElementById('taskList');
    if (taskList) {
      taskList.addEventListener('dragstart', (e) => {
        const card = e.target.closest('.task-card');
        if (!card) return;
        const cards = [...taskList.querySelectorAll('.task-card')];
        setDragSrc(cards.indexOf(card));
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      taskList.addEventListener('dragend', (e) => {
        e.target.closest('.task-card')?.classList.remove('dragging');
        taskList.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
      });

      taskList.addEventListener('dragover', (e) => {
        e.preventDefault();
        const card = e.target.closest('.task-card');
        if (!card) return;
        taskList.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
        card.classList.add('drag-over');
      });

      taskList.addEventListener('drop', (e) => {
        e.preventDefault();
        const card = e.target.closest('.task-card');
        if (!card) return;
        const cards   = [...taskList.querySelectorAll('.task-card')];
        const toIndex = cards.indexOf(card);
        const filteredIds = cards.map(c => c.dataset.id);
        reorderTasks(state.dragSrcIndex, toIndex, filteredIds);
      });
    }
  };

  return { init, getState, addTask, updateTask, deleteTask, toggleComplete, setFilter, setCategory, setSort, setSearch, toggleTheme, deleteCompleted, deleteAll, exportTasks, importTasks, addCategory, deleteCategory };
})();

// Bootstrap
document.addEventListener('DOMContentLoaded', App.init);