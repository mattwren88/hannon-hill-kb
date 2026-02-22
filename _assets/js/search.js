/**
 * Search Overlay — Cascade CMS Knowledge Base
 * Cmd+K / Ctrl+K search with Lunr.js integration.
 * Uses safe DOM methods — no innerHTML with user-derived content.
 */
(function () {
    'use strict';

    var overlay = document.querySelector('.search-overlay');
    var triggers = document.querySelectorAll('.header__search-trigger');
    if (!overlay) return;

    var input = overlay.querySelector('.search-overlay__input');
    var results = overlay.querySelector('.search-overlay__results');
    var backdrop = overlay.querySelector('.search-overlay__backdrop');
    var liveRegion = overlay.querySelector('.search-overlay__live');

    var searchIndex = null;
    var searchData = null;
    var highlightedIndex = -1;
    var debounceTimer = null;
    var isLoading = false;

    // ── Helpers ──
    function clearElement(el) {
        while (el.firstChild) el.removeChild(el.firstChild);
    }

    function createMessage(text, className) {
        var div = document.createElement('div');
        div.className = className;
        div.textContent = text;
        return div;
    }

    function highlightTextNode(text, query) {
        var frag = document.createDocumentFragment();
        var words = query.split(/\s+/).filter(Boolean);
        if (words.length === 0) {
            frag.appendChild(document.createTextNode(text));
            return frag;
        }
        var escaped = words.map(function (w) {
            return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        });
        var regex = new RegExp('(' + escaped.join('|') + ')', 'gi');
        var parts = text.split(regex);
        parts.forEach(function (part) {
            if (regex.test(part)) {
                var mark = document.createElement('mark');
                mark.textContent = part;
                frag.appendChild(mark);
            } else {
                frag.appendChild(document.createTextNode(part));
            }
            // Reset regex lastIndex since we use global flag
            regex.lastIndex = 0;
        });
        return frag;
    }

    function getExcerptParts(body, query) {
        if (!body) return null;
        var words = query.split(/\s+/).filter(Boolean);
        var lowerBody = body.toLowerCase();
        var pos = -1;
        for (var i = 0; i < words.length; i++) {
            pos = lowerBody.indexOf(words[i].toLowerCase());
            if (pos !== -1) break;
        }
        if (pos === -1) pos = 0;
        var start = Math.max(0, pos - 40);
        var end = Math.min(body.length, pos + 100);
        return {
            prefix: start > 0 ? '...' : '',
            text: body.slice(start, end),
            suffix: end < body.length ? '...' : ''
        };
    }

    // ── Open / Close ──
    function openSearch() {
        overlay.hidden = false;
        document.body.style.overflow = 'hidden';
        input.value = '';
        clearElement(results);
        results.appendChild(createMessage('Start typing to search...', 'search-overlay__empty'));
        highlightedIndex = -1;

        requestAnimationFrame(function () {
            input.focus();
        });

        loadIndex();
    }

    function closeSearch() {
        overlay.hidden = true;
        document.body.style.overflow = '';
    }

    // ── Keyboard Shortcut ──
    document.addEventListener('keydown', function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            if (overlay.hidden) {
                openSearch();
            } else {
                closeSearch();
            }
        }

        if (e.key === 'Escape' && !overlay.hidden) {
            closeSearch();
        }
    });

    triggers.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            openSearch();
        });
    });

    if (backdrop) {
        backdrop.addEventListener('click', closeSearch);
    }

    // ── Load Search Index ──
    function loadIndex() {
        if (searchIndex || isLoading) return;
        isLoading = true;

        clearElement(results);
        results.appendChild(createMessage('Loading search index...', 'search-overlay__loading'));

        var indexUrl = overlay.getAttribute('data-search-index') || 'search-index.json';
        fetch(indexUrl)
            .then(function (res) { return res.json(); })
            .then(function (data) {
                searchData = data;
                searchIndex = lunr(function () {
                    this.ref('id');
                    this.field('title', { boost: 10 });
                    this.field('category', { boost: 2 });
                    this.field('body');

                    data.forEach(function (doc) {
                        this.add(doc);
                    }, this);
                });
                isLoading = false;
                clearElement(results);
                results.appendChild(createMessage('Start typing to search...', 'search-overlay__empty'));
                if (liveRegion) liveRegion.textContent = '';

                if (input.value.trim()) {
                    performSearch(input.value.trim());
                }
            })
            .catch(function () {
                isLoading = false;
                clearElement(results);
                results.appendChild(createMessage('Could not load search index.', 'search-overlay__empty'));
            });
    }

    // ── Search ──
    function performSearch(query) {
        if (!searchIndex || !query) {
            clearElement(results);
            results.appendChild(createMessage('Start typing to search...', 'search-overlay__empty'));
            highlightedIndex = -1;
            return;
        }

        var matches;
        try {
            matches = searchIndex.search(query + '~1');
        } catch (e) {
            try {
                matches = searchIndex.search(query);
            } catch (e2) {
                matches = [];
            }
        }

        clearElement(results);

        if (matches.length === 0) {
            results.appendChild(createMessage('No results found for \u201c' + query + '\u201d', 'search-overlay__empty'));
            if (liveRegion) liveRegion.textContent = 'No results found';
            highlightedIndex = -1;
            return;
        }

        var shown = matches.slice(0, 10);
        shown.forEach(function (match, i) {
            var doc = searchData.find(function (d) { return d.id === match.ref; });
            if (!doc) return;

            var link = document.createElement('a');
            link.href = doc.url;
            link.className = 'search-result' + (i === 0 ? ' search-result--highlighted' : '');
            link.setAttribute('data-index', String(i));

            var title = document.createElement('span');
            title.className = 'search-result__title';
            title.appendChild(highlightTextNode(doc.title, query));

            var category = document.createElement('span');
            category.className = 'search-result__category';
            category.textContent = doc.category;

            link.appendChild(title);
            link.appendChild(category);

            var excerptParts = getExcerptParts(doc.body, query);
            if (excerptParts) {
                var excerpt = document.createElement('span');
                excerpt.className = 'search-result__excerpt';
                if (excerptParts.prefix) {
                    excerpt.appendChild(document.createTextNode(excerptParts.prefix));
                }
                excerpt.appendChild(highlightTextNode(excerptParts.text, query));
                if (excerptParts.suffix) {
                    excerpt.appendChild(document.createTextNode(excerptParts.suffix));
                }
                link.appendChild(excerpt);
            }

            results.appendChild(link);
        });

        if (liveRegion) liveRegion.textContent = shown.length + ' result' + (shown.length === 1 ? '' : 's') + ' found';
        highlightedIndex = 0;
    }

    // ── Input Handler ──
    input.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            performSearch(input.value.trim());
        }, 200);
    });

    // ── Keyboard Navigation ──
    overlay.addEventListener('keydown', function (e) {
        var items = results.querySelectorAll('.search-result');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
            updateHighlight(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlightedIndex = Math.max(highlightedIndex - 1, 0);
            updateHighlight(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && items[highlightedIndex]) {
                items[highlightedIndex].click();
            }
        }
    });

    function updateHighlight(items) {
        items.forEach(function (item, i) {
            item.classList.toggle('search-result--highlighted', i === highlightedIndex);
        });
        if (items[highlightedIndex]) {
            items[highlightedIndex].scrollIntoView({ block: 'nearest' });
        }
    }
})();
