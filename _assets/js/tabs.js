/**
 * Tabs — Cascade CMS Knowledge Base
 * Generic tab switching with keyboard navigation.
 * Works for both content tabs and code block language tabs.
 */
(function () {
    'use strict';

    var tabContainers = document.querySelectorAll('.hh-tabs, .hh-code-block');

    tabContainers.forEach(function (container) {
        var tablist = container.querySelector('[role="tablist"], .hh-tabs-list, .hh-code-block-tabs');
        if (!tablist) return;

        var tabs = tablist.querySelectorAll('[role="tab"], .hh-tabs-tab, .hh-code-block-tab');
        if (tabs.length === 0) return;

        // Gather panels
        var panels = [];
        tabs.forEach(function (tab) {
            var panelId = tab.getAttribute('aria-controls');
            var panel = panelId ? document.getElementById(panelId) : null;
            if (!panel) {
                // Find panel by index if no aria-controls
                var index = Array.prototype.indexOf.call(tabs, tab);
                var allPanels = container.querySelectorAll('[role="tabpanel"], .hh-tabs-panel, .hh-code-block-panel');
                panel = allPanels[index] || null;
            }
            panels.push(panel);
        });

        function activateTab(index) {
            tabs.forEach(function (tab, i) {
                var isActive = i === index;
                tab.setAttribute('aria-selected', String(isActive));
                tab.classList.toggle('hh-tabs-tab-active', isActive);
                tab.classList.toggle('hh-code-block-tab-active', isActive);
                tab.setAttribute('tabindex', isActive ? '0' : '-1');

                if (panels[i]) {
                    panels[i].hidden = !isActive;
                    panels[i].classList.toggle('hh-tabs-panel-active', isActive);
                    panels[i].classList.toggle('hh-code-block-panel-active', isActive);
                }
            });
        }

        // Click handler
        tabs.forEach(function (tab, i) {
            tab.addEventListener('click', function () {
                activateTab(i);
            });
        });

        // Keyboard navigation (arrow keys)
        tablist.addEventListener('keydown', function (e) {
            var currentIndex = Array.prototype.indexOf.call(tabs, document.activeElement);
            if (currentIndex === -1) return;

            var newIndex;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                newIndex = (currentIndex + 1) % tabs.length;
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            } else if (e.key === 'Home') {
                e.preventDefault();
                newIndex = 0;
            } else if (e.key === 'End') {
                e.preventDefault();
                newIndex = tabs.length - 1;
            }

            if (newIndex !== undefined) {
                activateTab(newIndex);
                tabs[newIndex].focus();
            }
        });
    });
})();
