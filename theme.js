(() => {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('theme'); } catch (_) {}
  if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;

  const isDark = () => root.dataset.theme
    ? root.dataset.theme === 'dark'
    : systemTheme.matches;

  function updateToggle() {
    const dark = isDark();
    toggle.textContent = dark ? 'Light' : 'Dark';
    toggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
    toggle.setAttribute('aria-pressed', String(dark));
  }

  toggle.addEventListener('click', () => {
    const theme = isDark() ? 'light' : 'dark';
    root.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch (_) {}
    updateToggle();
  });

  systemTheme.addEventListener('change', () => {
    if (!root.dataset.theme) updateToggle();
  });

  updateToggle();
})();
