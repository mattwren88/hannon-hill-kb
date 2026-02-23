/**
 * Heading Anchor Links — Cascade CMS Knowledge Base
 * Appends a clickable link icon to h2/h3 headings that copies the anchor URL.
 * Must load after toc.js so heading IDs are already generated.
 */
(function () {
    'use strict';

    var contentBody = document.querySelector('.content__body');
    if (!contentBody) return;

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var headings = contentBody.querySelectorAll('h2[id], h3[id]');

    function createLinkIcon() {
        var svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('width', '18');
        svg.setAttribute('height', '18');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');

        var path1 = document.createElementNS(SVG_NS, 'path');
        path1.setAttribute('d', 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71');
        var path2 = document.createElementNS(SVG_NS, 'path');
        path2.setAttribute('d', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71');

        svg.appendChild(path1);
        svg.appendChild(path2);
        return svg;
    }

    function showCopied(btn) {
        btn.classList.add('heading-anchor--copied');
        setTimeout(function () {
            btn.classList.remove('heading-anchor--copied');
        }, 1500);
    }

    headings.forEach(function (heading) {
        var btn = document.createElement('a');
        btn.href = '#' + heading.id;
        btn.className = 'heading-anchor';
        btn.setAttribute('aria-label', 'Copy link to ' + heading.textContent.trim());
        btn.appendChild(createLinkIcon());

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            var url = location.origin + location.pathname + '#' + heading.id;

            if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(function () {
                    showCopied(btn);
                });
            } else {
                var tmp = document.createElement('input');
                document.body.appendChild(tmp);
                tmp.value = url;
                tmp.select();
                document.execCommand('copy');
                document.body.removeChild(tmp);
                showCopied(btn);
            }

            history.replaceState(null, '', '#' + heading.id);
        });

        heading.appendChild(btn);
    });
})();
