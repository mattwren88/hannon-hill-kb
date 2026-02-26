/**
 * Sidebar Navigation — Cascade CMS Knowledge Base
 * Category expand/collapse, active page highlighting, mobile drawer.
 */
(function () {
    'use strict';

    var sidebar = document.querySelector('.sidebar');
    var menuToggle = document.querySelector('.hh-header-menu-toggle');
    var overlay = document.querySelector('.hh-sidebar-overlay');

    if (!sidebar) return;

    function collapsePages(pages) {
        if (!pages) return;
        pages.style.maxHeight = pages.scrollHeight + 'px';
        pages.style.opacity = '1';
        pages.offsetHeight;
        pages.style.maxHeight = '0';
        pages.style.opacity = '0';

        pages.addEventListener('transitionend', function handler(e) {
            if (e.propertyName !== 'max-height') return;
            pages.hidden = true;
            pages.style.maxHeight = '';
            pages.style.opacity = '';
            pages.removeEventListener('transitionend', handler);
        });
    }

    function expandPages(pages) {
        if (!pages) return;
        pages.hidden = false;
        pages.style.maxHeight = '0';
        pages.style.opacity = '0';
        pages.offsetHeight;
        pages.style.maxHeight = pages.scrollHeight + 'px';
        pages.style.opacity = '1';

        pages.addEventListener('transitionend', function handler(e) {
            if (e.propertyName !== 'max-height') return;
            pages.style.maxHeight = '';
            pages.style.opacity = '';
            pages.removeEventListener('transitionend', handler);
        });
    }

    // ── Category Expand/Collapse ──
    var categories = sidebar.querySelectorAll('.hh-sidebar-category');
    categories.forEach(function (hh-btn) {
        hh-btn.addEventListener('click', function () {
            var expanded = hh-btn.getAttribute('aria-expanded') === 'true';
            hh-btn.setAttribute('aria-expanded', String(!expanded));
            var pages = hh-btn.nextElementSibling;
            if (pages) {
                if (expanded) collapsePages(pages);
                else expandPages(pages);
            }
        });
    });

    // ── Active Page Highlighting ──
    var currentPath = window.location.pathname;
    var links = sidebar.querySelectorAll('.hh-sidebar-link');
    links.forEach(function (link) {
        if (link.getAttribute('href') === currentPath || link.href === window.location.href) {
            link.classList.add('hh-sidebar-link-active');
            link.setAttribute('aria-current', 'page');

            // Expand parent category
            var section = link.closest('.hh-sidebar-section');
            if (section) {
                var cat = section.querySelector('.hh-sidebar-category');
                if (cat) {
                    cat.setAttribute('aria-expanded', 'true');
                    var pages = cat.nextElementSibling;
                    if (pages) pages.hidden = false;
                }
            }
        }
    });

    // Ensure expanded groups have natural height after initial paint.
    var pageGroups = sidebar.querySelectorAll('.hh-sidebar-pages');
    pageGroups.forEach(function (pages) {
        if (!pages.hidden) {
            pages.style.maxHeight = '';
            pages.style.opacity = '';
        }
    });

    // ── Mobile Drawer ──
    function openSidebar() {
        sidebar.classList.add('hh-sidebar-open');
        if (overlay) {
            overlay.classList.add('hh-sidebar-overlay-visible');
            overlay.style.display = 'block';
        }
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        trapFocus(sidebar);
    }

    function closeSidebar() {
        sidebar.classList.remove('hh-sidebar-open');
        if (overlay) {
            overlay.classList.remove('hh-sidebar-overlay-visible');
            setTimeout(function () { overlay.style.display = 'none'; }, 250);
        }
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', function () {
            var isOpen = sidebar.classList.contains('hh-sidebar-open');
            isOpen ? closeSidebar() : openSidebar();
        });
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && sidebar.classList.contains('hh-sidebar-open')) {
            closeSidebar();
            if (menuToggle) menuToggle.focus();
        }
    });

    // Simple focus trap
    function trapFocus(container) {
        var focusable = container.querySelectorAll('a[href], button:not([disabled])');
        if (focusable.length > 0) focusable[0].focus();
    }
})();
