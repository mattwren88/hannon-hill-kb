/**
 * Table of Contents — Cascade CMS Knowledge Base
 * Auto-generates TOC from h2/h3, scroll spy via IntersectionObserver.
 */
(function () {
    'use strict';

    var tocNav = document.querySelector('.toc__nav');
    var tocToggle = document.querySelector('.toc-toggle');
    var tocAside = document.querySelector('.toc');
    var contentBody = document.querySelector('.content__body');

    if (!contentBody) return;

    // ── Collect Headings ──
    var headings = contentBody.querySelectorAll('h2, h3');
    if (headings.length === 0) {
        if (tocAside) tocAside.style.display = 'none';
        if (tocToggle) tocToggle.style.display = 'none';
        return;
    }

    // ── Generate IDs ──
    var slugCounts = {};
    headings.forEach(function (heading) {
        if (!heading.id) {
            var slug = heading.textContent
                .trim()
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-');
            if (slugCounts[slug]) {
                slugCounts[slug]++;
                slug = slug + '-' + slugCounts[slug];
            } else {
                slugCounts[slug] = 1;
            }
            heading.id = slug;
        }
    });

    // ── Build TOC List ──
    if (tocNav) {
        var list = document.createElement('ol');
        list.className = 'toc__list';
        list.setAttribute('role', 'list');

        headings.forEach(function (heading) {
            var li = document.createElement('li');
            var link = document.createElement('a');
            link.href = '#' + heading.id;
            link.className = 'toc__link';
            link.textContent = heading.textContent;

            if (heading.tagName === 'H3') {
                link.classList.add('toc__link--h3');
            }

            link.addEventListener('click', function (e) {
                e.preventDefault();
                var target = document.getElementById(heading.id);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    history.replaceState(null, '', '#' + heading.id);
                }
                // Close mobile TOC if open
                if (tocAside && tocAside.classList.contains('toc--mobile-open')) {
                    tocAside.classList.remove('toc--mobile-open');
                }
            });

            li.appendChild(link);
            list.appendChild(li);
        });

        tocNav.appendChild(list);
    }

    // ── Scroll Spy ──
    var tocLinks = tocNav ? tocNav.querySelectorAll('.toc__link') : [];
    var headingMap = {};
    tocLinks.forEach(function (link) {
        var id = link.getAttribute('href').slice(1);
        headingMap[id] = link;
    });

    if ('IntersectionObserver' in window && tocLinks.length > 0) {
        var activeId = null;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    if (activeId && headingMap[activeId]) {
                        headingMap[activeId].classList.remove('toc__link--active');
                    }
                    activeId = entry.target.id;
                    if (headingMap[activeId]) {
                        headingMap[activeId].classList.add('toc__link--active');
                    }
                }
            });
        }, {
            rootMargin: '-' + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) + 20) + 'px 0px -70% 0px',
            threshold: 0
        });

        headings.forEach(function (heading) {
            observer.observe(heading);
        });
    }

    // ── Mobile TOC Toggle ──
    if (tocToggle && tocAside) {
        tocToggle.addEventListener('click', function () {
            var isOpen = tocAside.classList.contains('toc--mobile-open');
            tocAside.classList.toggle('toc--mobile-open');
            tocToggle.setAttribute('aria-expanded', String(!isOpen));
        });

        // Close on outside click
        document.addEventListener('click', function (e) {
            if (!tocToggle.contains(e.target) && !tocAside.contains(e.target)) {
                tocAside.classList.remove('toc--mobile-open');
                tocToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
})();
