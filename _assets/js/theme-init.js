// Theme Init — INLINE THIS IN <head> to prevent flash of wrong theme.
// Copy the contents of the IIFE into a <script> tag in the HTML <head>.
(function () {
    var pref = localStorage.getItem('theme-preference');
    var theme;
    if (pref === 'dark') {
        theme = 'dark';
    } else if (pref === 'light') {
        theme = 'light';
    } else {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
})();
