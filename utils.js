/**
 * BugSlayer - Utils Module
 * Shared utility/helper functions
 */

const Utils = (() => {

  // Generate unique ID
  const generateId = () => {
    return 'bs_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  };

  // Format date to readable string
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date)) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format datetime for input fields
  const toInputDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date)) return '';
    return date.toISOString().split('T')[0];
  };

  // Check if a task is overdue
  const isOverdue = (dueDate, completed) => {
    if (!dueDate || completed) return false;
    return new Date(dueDate) < new Date(new Date().toDateString());
  };

  // Check if a task is due today
  const isDueToday = (dueDate) => {
    if (!dueDate) return false;
    const today = new Date().toDateString();
    return new Date(dueDate).toDateString() === today;
  };

  // Check if a task is due within next N days
  const isDueSoon = (dueDate, days = 3) => {
    if (!dueDate) return false;
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due - now;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= days;
  };

  // Sanitize HTML to prevent XSS
  const sanitize = (str) => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };

  // Truncate text
  const truncate = (str, maxLen = 80) => {
    if (!str) return '';
    return str.length > maxLen ? str.substring(0, maxLen) + '…' : str;
  };

  // Debounce function
  const debounce = (fn, delay = 300) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  // Priority config
  const PRIORITY = {
    critical: { label: 'Critical', icon: '🔴', order: 1, color: 'var(--priority-critical)' },
    high:     { label: 'High',     icon: '🟠', order: 2, color: 'var(--priority-high)' },
    medium:   { label: 'Medium',   icon: '🟡', order: 3, color: 'var(--priority-medium)' },
    low:      { label: 'Low',      icon: '🟢', order: 4, color: 'var(--priority-low)' },
  };

  // Get relative time label
  const getRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr  = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60)  return 'just now';
    if (diffMin < 60)  return `${diffMin}m ago`;
    if (diffHr < 24)   return `${diffHr}h ago`;
    if (diffDay < 7)   return `${diffDay}d ago`;
    return formatDate(dateStr);
  };

  // Export tasks to JSON file
  const exportToJSON = (tasks) => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `bugslayer_tasks_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate stats
  const calcStats = (tasks) => {
    const total     = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active    = total - completed;
    const overdue   = tasks.filter(t => isOverdue(t.dueDate, t.completed)).length;
    const critical  = tasks.filter(t => t.priority === 'critical' && !t.completed).length;
    const percent   = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, active, overdue, critical, percent };
  };

  return {
    generateId,
    formatDate,
    toInputDate,
    isOverdue,
    isDueToday,
    isDueSoon,
    sanitize,
    truncate,
    debounce,
    PRIORITY,
    getRelativeTime,
    exportToJSON,
    calcStats,
  };
})();