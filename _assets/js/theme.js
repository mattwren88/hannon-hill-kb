/**
 * Theme Toggle — Cascade CMS Knowledge Base
 * Manages light/dark/system theme switching with localStorage persistence.
 */
(function () {
    'use strict';

    var toggle = document.querySelector('.theme-toggle');
    if (!toggle) return;

    var button = toggle.querySelector('.theme-toggle__button');
    var dropdown = toggle.querySelector('.theme-toggle__dropdown');
    var options = toggle.querySelectorAll('.theme-toggle__option');
    var html = document.documentElement;
    var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function getPreference() {
        return localStorage.getItem('theme-preference') || 'system';
    }

    function applyTheme(preference) {
        var theme;
        if (preference === 'system') {
            theme = mediaQuery.matches ? 'dark' : 'light';
            toggle.classList.add('theme-toggle--system');
        } else {
            theme = preference;
            toggle.classList.remove('theme-toggle--system');
        }
        html.setAttribute('data-theme', theme);
        localStorage.setItem('theme-preference', preference);

        // Update active state on options
        options.forEach(function (opt) {
            var isActive = opt.getAttribute('data-theme') === preference;
            opt.classList.toggle('theme-toggle__option--active', isActive);
            var check = opt.querySelector('.theme-toggle__check');
            if (check) {
                check.style.display = isActive ? '' : 'none';
            }
        });
    }

    function toggleDropdown(show) {
        var isOpen = typeof show === 'boolean' ? show : dropdown.hidden;
        dropdown.hidden = !isOpen;
        button.setAttribute('aria-expanded', String(isOpen));
    }

    // Button click
    button.addEventListener('click', function () {
        toggleDropdown();
    });

    // Option clicks
    options.forEach(function (opt) {
        opt.addEventListener('click', function () {
            applyTheme(opt.getAttribute('data-theme'));
            toggleDropdown(false);
        });
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
        if (!toggle.contains(e.target)) {
            toggleDropdown(false);
        }
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !dropdown.hidden) {
            toggleDropdown(false);
            button.focus();
        }
    });

    // Listen for system theme changes
    mediaQuery.addEventListener('change', function () {
        if (getPreference() === 'system') {
            applyTheme('system');
        }
    });

    // Initialize
    applyTheme(getPreference());
})();
