(() => {
  const translations = window.taitaPageContent || {};
  const toggle = document.getElementById('langToggle');
  const langEn = document.getElementById('langEn');
  const langZh = document.getElementById('langZh');

  function applyLanguage(language) {
    const selected = translations[language] ? language : 'zh';
    const copy = translations[selected];
    document.documentElement.lang = selected === 'zh' ? 'zh-Hant' : 'en';
    document.title = copy.pageTitle;
    document.querySelector('meta[name="description"]').content = copy.description;
    document.querySelector('meta[property="og:title"]').content = copy.pageTitle;
    document.querySelector('meta[property="og:description"]').content = copy.description;

    document.querySelectorAll('[data-i18n]').forEach(element => {
      const value = copy[element.dataset.i18n];
      if (value !== undefined) element.innerHTML = value;
    });

    document.querySelectorAll('[data-i18n-aria]').forEach(element => {
      const value = copy[element.dataset.i18nAria];
      if (value !== undefined) element.setAttribute('aria-label', value);
    });

    const isChinese = selected === 'zh';
    langZh.classList.toggle('active', isChinese);
    langEn.classList.toggle('active', !isChinese);
    toggle.setAttribute('aria-pressed', String(isChinese));
    toggle.setAttribute('aria-label', isChinese ? 'Switch to English' : '切換為繁體中文');
    try { localStorage.setItem('taita-language', selected); } catch (error) { /* storage may be unavailable */ }
  }

  let savedLanguage = null;
  try { savedLanguage = localStorage.getItem('taita-language'); } catch (error) { /* storage may be unavailable */ }
  const browserLanguage = navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  applyLanguage(savedLanguage || browserLanguage);

  toggle.addEventListener('click', () => {
    applyLanguage(document.documentElement.lang === 'zh-Hant' ? 'en' : 'zh');
  });
})();
