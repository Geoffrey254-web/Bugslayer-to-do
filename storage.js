/**
 * BugSlayer - Storage Module
 * Handles all localStorage operations for persistent data
 */

const Storage = (() => {
  const KEYS = {
    TASKS: 'bugslayer_tasks',
    SETTINGS: 'bugslayer_settings',
    CATEGORIES: 'bugslayer_categories',
  };

  // --- Tasks ---
  const getTasks = () => {
    try {
      const data = localStorage.getItem(KEYS.TASKS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading tasks:', e);
      return [];
    }
  };

  const saveTasks = (tasks) => {
    try {
      localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
      return true;
    } catch (e) {
      console.error('Error saving tasks:', e);
      return false;
    }
  };

  // --- Settings ---
  const getSettings = () => {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      return data
        ? JSON.parse(data)
        : {
            theme: 'dark',
            sortBy: 'createdAt',
            sortOrder: 'desc',
            activeFilter: 'all',
            activeCategory: 'all',
          };
    } catch (e) {
      console.error('Error reading settings:', e);
      return {
        theme: 'dark',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        activeFilter: 'all',
        activeCategory: 'all',
      };
    }
  };

  const saveSettings = (settings) => {
    try {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
      return true;
    } catch (e) {
      console.error('Error saving settings:', e);
      return false;
    }
  };

  // --- Categories ---
  const getCategories = () => {
    try {
      const data = localStorage.getItem(KEYS.CATEGORIES);
      return data
        ? JSON.parse(data)
        : ['Bug Fix', 'Feature', 'Refactor', 'Testing', 'Docs', 'DevOps'];
    } catch (e) {
      return ['Bug Fix', 'Feature', 'Refactor', 'Testing', 'Docs', 'DevOps'];
    }
  };

  const saveCategories = (categories) => {
    try {
      localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
      return true;
    } catch (e) {
      console.error('Error saving categories:', e);
      return false;
    }
  };

  // --- Clear all ---
  const clearAll = () => {
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  };

  return {
    getTasks,
    saveTasks,
    getSettings,
    saveSettings,
    getCategories,
    saveCategories,
    clearAll,
  };
})();