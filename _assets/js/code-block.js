/**
 * Code Block — Cascade CMS Knowledge Base
 * Copy-to-clipboard functionality.
 */
(function () {
    'use strict';

    function countLinesFromCode(codeEl) {
        if (!codeEl) return 1;
        var raw = codeEl.textContent || '';
        var normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        if (normalized.endsWith('\n')) normalized = normalized.slice(0, -1);
        if (normalized.length === 0) return 1;
        return normalized.split('\n').length;
    }

    function decorateCodeBlocks() {
        var pres = document.querySelectorAll('.code-block__pre');

        pres.forEach(function (pre) {
            if (pre.parentElement && pre.parentElement.classList.contains('code-block__body')) {
                return;
            }

            var codeEl = pre.querySelector('code');
            var lineCount = countLinesFromCode(codeEl);

            var body = document.createElement('div');
            body.className = 'code-block__body';

            var gutter = document.createElement('div');
            gutter.className = 'code-block__gutter';
            gutter.setAttribute('aria-hidden', 'true');

            for (var i = 1; i <= lineCount; i += 1) {
                var n = document.createElement('span');
                n.className = 'code-block__line-number';
                n.textContent = String(i);
                gutter.appendChild(n);
            }

            pre.parentNode.insertBefore(body, pre);
            body.appendChild(gutter);
            body.appendChild(pre);

        });
    }

    var copyButtons = document.querySelectorAll('.code-block__copy');

    function createCopyIcon() {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');

        var rect1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect1.setAttribute('x', '9');
        rect1.setAttribute('y', '9');
        rect1.setAttribute('width', '13');
        rect1.setAttribute('height', '13');
        rect1.setAttribute('rx', '2');
        rect1.setAttribute('ry', '2');

        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1');

        svg.appendChild(rect1);
        svg.appendChild(path);
        return svg;
    }

    function createCheckIcon() {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');

        var polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', '20 6 9 17 4 12');

        svg.appendChild(polyline);
        return svg;
    }

    decorateCodeBlocks();

    copyButtons.forEach(function (btn) {
        // Store original children
        var originalChildren = Array.prototype.slice.call(btn.childNodes).map(function (n) { return n.cloneNode(true); });

        btn.addEventListener('click', function () {
            var block = btn.closest('.code-block');
            var activePanel = block.querySelector('.code-block__panel--active') || block;
            var codeEl = activePanel.querySelector('code');

            if (!codeEl) return;

            var text = codeEl.textContent;

            navigator.clipboard.writeText(text).then(function () {
                showCopied();
            }).catch(function () {
                // Fallback for older browsers
                var textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                try { document.execCommand('copy'); showCopied(); } catch (e) { /* silent */ }
                document.body.removeChild(textarea);
            });

            function showCopied() {
                btn.classList.add('code-block__copy--copied');

                // Replace content with check icon + "Copied!"
                while (btn.firstChild) btn.removeChild(btn.firstChild);
                btn.appendChild(createCheckIcon());
                var span = document.createElement('span');
                span.textContent = 'Copied!';
                btn.appendChild(span);

                setTimeout(function () {
                    while (btn.firstChild) btn.removeChild(btn.firstChild);
                    originalChildren.forEach(function (child) {
                        btn.appendChild(child.cloneNode(true));
                    });
                    btn.classList.remove('code-block__copy--copied');
                }, 2000);
            }
        });
    });
})();
