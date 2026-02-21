/**
 * Accordion — Cascade CMS Knowledge Base
 * Normalize legacy accordion markup to native <details>/<summary>.
 */
(function () {
    'use strict';

    function upgradeAccordion(accordion) {
        if (!accordion || accordion.tagName.toLowerCase() === 'details') {
            return;
        }

        var trigger = null;
        var panel = null;
        for (var i = 0; i < accordion.children.length; i += 1) {
            var child = accordion.children[i];
            if (!trigger && child.classList.contains('accordion__trigger')) {
                trigger = child;
            } else if (!panel && child.classList.contains('accordion__panel')) {
                panel = child;
            }
        }

        if (!trigger || !panel) {
            return;
        }

        var details = document.createElement('details');
        details.className = accordion.className;

        var isOpen =
            trigger.getAttribute('aria-expanded') === 'true' ||
            panel.classList.contains('accordion__panel--open') ||
            !panel.hasAttribute('hidden');

        if (isOpen) {
            details.open = true;
        }

        var summary = document.createElement('summary');
        summary.className = 'accordion__trigger';
        while (trigger.firstChild) {
            summary.appendChild(trigger.firstChild);
        }

        panel.hidden = false;
        panel.classList.remove('accordion__panel--open');

        details.appendChild(summary);
        details.appendChild(panel);
        accordion.replaceWith(details);
    }

    var accordions = document.querySelectorAll('.accordion');
    accordions.forEach(upgradeAccordion);
})();
