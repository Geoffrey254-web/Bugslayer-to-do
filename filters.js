/**
 * BugSlayer - Filters Module
 * Handles all filtering, searching, and sorting of tasks
 */

const Filters = (() => {

  // Apply all active filters + search + sort to the task list
  const apply = (tasks, { filter, category, search, sortBy, sortOrder }) => {
    let result = [...tasks];

    // --- Status Filter ---
    switch (filter) {
      case 'active':
        result = result.filter(t => !t.completed);
        break;
      case 'completed':
        result = result.filter(t => t.completed);
        break;
      case 'overdue':
        result = result.filter(t => Utils.isOverdue(t.dueDate, t.completed));
        break;
      case 'today':
        result = result.filter(t => Utils.isDueToday(t.dueDate) && !t.completed);
        break;
      case 'critical':
        result = result.filter(t => t.priority === 'critical' && !t.completed);
        break;
      case 'all':
      default:
        break;
    }

    // --- Category Filter ---
    if (category && category !== 'all') {
      result = result.filter(t => t.category === category);
    }

    // --- Search Filter ---
    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    }

    // --- Sort ---
    result = sort(result, sortBy, sortOrder);

    return result;
  };

  // Sort tasks
  const sort = (tasks, sortBy = 'createdAt', sortOrder = 'desc') => {
    return [...tasks].sort((a, b) => {
      let valA, valB;

      switch (sortBy) {
        case 'priority':
          valA = Utils.PRIORITY[a.priority]?.order ?? 99;
          valB = Utils.PRIORITY[b.priority]?.order ?? 99;
          break;
        case 'dueDate':
          valA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          valB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          break;
        case 'title':
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case 'updatedAt':
          valA = new Date(a.updatedAt || a.createdAt).getTime();
          valB = new Date(b.updatedAt || b.createdAt).getTime();
          break;
        case 'createdAt':
        default:
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;

      // Secondary: completed tasks sink to bottom
      if (a.completed !== b.completed) return a.completed ? 1 : -1;

      return 0;
    });
  };

  // Get count per filter tab
  const getCounts = (tasks) => {
    return {
      all:       tasks.length,
      active:    tasks.filter(t => !t.completed).length,
      completed: tasks.filter(t => t.completed).length,
      overdue:   tasks.filter(t => Utils.isOverdue(t.dueDate, t.completed)).length,
      today:     tasks.filter(t => Utils.isDueToday(t.dueDate) && !t.completed).length,
      critical:  tasks.filter(t => t.priority === 'critical' && !t.completed).length,
    };
  };

  return { apply, sort, getCounts };
})();