/**
 * Accordion — Cascade CMS Knowledge Base
 * Normalize legacy hh-accordion markup to native <details>/<summary>.
 */
(function () {
    'use strict';

    function upgradeAccordion(hh-accordion) {
        if (!hh-accordion || hh-accordion.tagName.toLowerCase() === 'details') {
            return;
        }

        var trigger = null;
        var panel = null;
        for (var i = 0; i < hh-accordion.children.length; i += 1) {
            var child = hh-accordion.children[i];
            if (!trigger && child.classList.contains('hh-accordion-trigger')) {
                trigger = child;
            } else if (!panel && child.classList.contains('hh-accordion-panel')) {
                panel = child;
            }
        }

        if (!trigger || !panel) {
            return;
        }

        var details = document.createElement('details');
        details.className = hh-accordion.className;

        var isOpen =
            trigger.getAttribute('aria-expanded') === 'true' ||
            panel.classList.contains('hh-accordion-panel-open') ||
            !panel.hasAttribute('hidden');

        if (isOpen) {
            details.open = true;
        }

        var summary = document.createElement('summary');
        summary.className = 'hh-accordion-trigger';
        while (trigger.firstChild) {
            summary.appendChild(trigger.firstChild);
        }

        panel.hidden = false;
        panel.classList.remove('hh-accordion-panel-open');

        details.appendChild(summary);
        details.appendChild(panel);
        hh-accordion.replaceWith(details);
    }

    var accordions = document.querySelectorAll('.hh-accordion');
    accordions.forEach(upgradeAccordion);
})();
