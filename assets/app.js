(function () {
  "use strict";

  var bundle = window.__MARY_SESSION_LOGS_BUNDLE__ || {
    generatedAtKst: "",
    repoLabel: "birddogmary24-bit/privateagent001",
    pagesUrl: "https://birddogmary24-bit.github.io/privateagent001-logs/",
    categories: [],
    logs: []
  };

  var logs = Array.isArray(bundle.logs) ? bundle.logs : [];
  var logsBySlug = {};
  logs.forEach(function (item, idx) {
    logsBySlug[item.slug] = { log: item, index: idx };
  });

  var state = {
    theme: loadTheme(),
    selectedDate: "all",
    selectedCategory: "all",
    query: ""
  };

  function loadTheme() {
    try {
      var saved = window.localStorage.getItem("mary_session_logs_theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch (_e) {}
    return "light";
  }

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    var btn = document.getElementById("theme-toggle-btn");
    if (btn) {
      btn.textContent = theme === "light" ? "다크 모드" : "라이트 모드";
    }
    try {
      window.localStorage.setItem("mary_session_logs_theme", theme);
    } catch (_e) {}
  }

  function escapeHtml(str) {
    return String(str === null || str === undefined ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeHref(rawUrl) {
    var trimmed = String(rawUrl || "").trim();
    if (!trimmed) return "#";

    var mdMatch = trimmed.match(/(?:\.\/|docs\/session_logs\/)?([0-9]{4}-[0-9]{2}-[0-9]{2}_[A-Za-z0-9_.-]+)\.md$/);
    if (mdMatch && logsBySlug[mdMatch[1]]) {
      return "#log/" + encodeURIComponent(mdMatch[1]);
    }
    if (trimmed.indexOf("#") === 0) return trimmed;

    try {
      var parsed = new URL(trimmed);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
    } catch (_e) {}
    return "#";
  }

  function renderInline(text) {
    var codeTokens = [];
    var escaped = escapeHtml(text);

    escaped = escaped.replace(/`([^`\n]+)`/g, function (_m, code) {
      var token = "@@CODE" + codeTokens.length + "@@";
      codeTokens.push("<code>" + code + "</code>");
      return token;
    });

    escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_m, label, url) {
      var safe = sanitizeHref(url);
      if (safe.indexOf("#log/") === 0) {
        return '<a href="' + escapeHtml(safe) + '">' + label + "</a>";
      }
      if (safe === "#") {
        return '<span class="pill pill-muted">' + label + "</span>";
      }
      return '<a href="' + escapeHtml(safe) + '" target="_blank" rel="noopener noreferrer">' + label + "</a>";
    });

    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    escaped = escaped.replace(/(^|[^\*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");

    codeTokens.forEach(function (html, i) {
      escaped = escaped.replace("@@CODE" + i + "@@", html);
    });
    return escaped;
  }

  function isTableRow(line) {
    var t = line.trim();
    return t.indexOf("|") === 0 && t.indexOf("|", 1) > 0;
  }

  function isTableDivider(line) {
    return /^\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(line.trim());
  }

  function splitTableCells(line) {
    var trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    return trimmed.split("|").map(function (c) { return c.trim(); });
  }

  function isListLine(line) {
    return /^\s*(?:[-*+]|\d+\.)\s+/.test(line);
  }

  function renderList(lines, startIdx) {
    var baseIndent = lines[startIdx].match(/^\s*/)[0].length;
    var firstOrdered = /^\s*\d+\.\s+/.test(lines[startIdx]);
    var tag = firstOrdered ? "ol" : "ul";
    var html = "<" + tag + ">";
    var i = startIdx;

    while (i < lines.length) {
      var line = lines[i];
      if (line.trim() === "") {
        if (i + 1 < lines.length && isListLine(lines[i + 1])) {
          i++;
          continue;
        }
        break;
      }
      if (!isListLine(line)) break;

      var indent = line.match(/^\s*/)[0].length;
      if (indent < baseIndent) break;

      if (indent > baseIndent) {
        var sub = renderList(lines, i);
        if (html.slice(-5) === "</li>") {
          html = html.slice(0, -5) + sub.html + "</li>";
        } else {
          html += sub.html;
        }
        i = sub.nextIdx;
        continue;
      }

      var ordered = /^\s*\d+\.\s+/.test(line);
      if (ordered !== firstOrdered) break;

      var content = line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, "");
      html += "<li>" + renderInline(content) + "</li>";
      i++;
    }

    html += "</" + tag + ">";
    return { html: html, nextIdx: i };
  }

  function renderMarkdown(md) {
    var lines = String(md || "").replace(/\r\n/g, "\n").split("\n");
    var html = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];
      var trimmed = line.trim();

      if (!trimmed) {
        i++;
        continue;
      }

      if (trimmed.indexOf("```") === 0) {
        var codeLines = [];
        i++;
        while (i < lines.length && lines[i].trim().indexOf("```") !== 0) {
          codeLines.push(lines[i]);
          i++;
        }
        i++;
        var codeId = "code-" + html.length;
        html.push(
          '<div class="code-block-wrap">' +
            '<button type="button" class="btn code-copy-btn" data-copy-code="' + codeId + '">복사</button>' +
            '<pre><code id="' + codeId + '">' + escapeHtml(codeLines.join("\n")) + "</code></pre>" +
          "</div>"
        );
        continue;
      }

      if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
        html.push("<hr />");
        i++;
        continue;
      }

      var hMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (hMatch) {
        var level = hMatch[1].length === 1 ? 2 : hMatch[1].length;
        html.push("<h" + level + ">" + renderInline(hMatch[2]) + "</h" + level + ">");
        i++;
        continue;
      }

      if (trimmed.indexOf(">") === 0) {
        var quoteLines = [];
        while (i < lines.length && lines[i].trim().indexOf(">") === 0) {
          quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
          i++;
        }
        var paragraphs = quoteLines
          .join("\n")
          .split(/\n\s*\n/)
          .map(function (p) { return "<p>" + renderInline(p.trim()) + "</p>"; })
          .join("");
        html.push("<blockquote>" + paragraphs + "</blockquote>");
        continue;
      }

      if (isTableRow(trimmed) && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
        var headers = splitTableCells(trimmed);
        i += 2;
        var rows = [];
        while (i < lines.length && isTableRow(lines[i])) {
          rows.push(splitTableCells(lines[i]));
          i++;
        }
        var tableHtml = '<div class="table-scroll"><table><thead><tr>';
        headers.forEach(function (h) { tableHtml += "<th>" + renderInline(h) + "</th>"; });
        tableHtml += "</tr></thead><tbody>";
        rows.forEach(function (r) {
          tableHtml += "<tr>";
          headers.forEach(function (_h, idx) {
            tableHtml += "<td>" + renderInline(r[idx] || "") + "</td>";
          });
          tableHtml += "</tr>";
        });
        tableHtml += "</tbody></table></div>";
        html.push(tableHtml);
        continue;
      }

      if (isListLine(line)) {
        var listRes = renderList(lines, i);
        html.push(listRes.html);
        i = listRes.nextIdx;
        continue;
      }

      var paraLines = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        lines[i].trim().indexOf("```") !== 0 &&
        !/^(#{1,4})\s+/.test(lines[i].trim()) &&
        lines[i].trim().indexOf(">") !== 0 &&
        !isListLine(lines[i]) &&
        !/^---+$/.test(lines[i].trim()) &&
        !isTableRow(lines[i])
      ) {
        paraLines.push(lines[i].trim());
        i++;
      }
      html.push("<p>" + renderInline(paraLines.join(" ")) + "</p>");
    }

    return html.join("\n");
  }

  function highlightMatch(text, query) {
    var safeText = escapeHtml(text);
    if (!query) return safeText;
    var q = query.trim();
    if (!q) return safeText;
    var escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return safeText.replace(new RegExp("(" + escapedQ + ")", "gi"), "<mark>$1</mark>");
  }

  function findSnippet(log, query) {
    var q = (query || "").trim().toLowerCase();
    if (!q) return "";
    var haystack = log.body || "";
    var idx = haystack.toLowerCase().indexOf(q);
    if (idx < 0) return "";
    var start = Math.max(0, idx - 48);
    var end = Math.min(haystack.length, idx + q.length + 72);
    var slice = haystack.slice(start, end).replace(/\s+/g, " ").trim();
    return (start > 0 ? "..." : "") + slice + (end < haystack.length ? "..." : "");
  }

  function getRoute() {
    var hash = window.location.hash || "#overview";
    if (hash.indexOf("#log/") === 0) {
      var slug = decodeURIComponent(hash.slice(5));
      if (logsBySlug[slug]) return { view: "detail", slug: slug };
    }
    return { view: "overview", slug: null };
  }

  function getFilteredLogs() {
    var q = state.query.trim().toLowerCase();
    return logs.filter(function (log) {
      if (state.selectedDate !== "all" && log.date !== state.selectedDate) return false;
      if (state.selectedCategory !== "all" && log.categories.indexOf(state.selectedCategory) < 0) {
        return false;
      }
      if (q && log.searchText.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  function renderSidebar(activeSlug) {
    var homeBtn = document.getElementById("sidebar-home-btn");
    if (homeBtn) {
      if (!activeSlug) homeBtn.classList.add("active");
      else homeBtn.classList.remove("active");
    }

    var groups = [];
    var byDate = {};
    logs.forEach(function (log) {
      if (!byDate[log.date]) {
        byDate[log.date] = [];
        groups.push(log.date);
      }
      byDate[log.date].push(log);
    });

    var navHtml = groups
      .map(function (date) {
        var itemsHtml = byDate[date]
          .map(function (item) {
            var isActive = item.slug === activeSlug;
            return (
              '<a href="#log/' + encodeURIComponent(item.slug) + '" class="sidebar-item' +
              (isActive ? " active" : "") + '"' +
              (isActive ? ' aria-current="page"' : "") + ">" +
              '<span class="sidebar-item-title">' + escapeHtml(item.title) + "</span>" +
              "</a>"
            );
          })
          .join("");
        return (
          '<div class="sidebar-group">' +
            '<div class="sidebar-group-header">' +
              "<span>" + escapeHtml(date) + "</span>" +
              "<span>" + byDate[date].length + "건</span>" +
            "</div>" +
            itemsHtml +
          "</div>"
        );
      })
      .join("");

    var navEl = document.getElementById("sidebar-nav");
    if (navEl) {
      navEl.innerHTML = navHtml;
      var activeEl = navEl.querySelector(".sidebar-item.active");
      if (activeEl && activeEl.scrollIntoView) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }

    var footerEl = document.getElementById("sidebar-footer");
    if (footerEl) {
      footerEl.innerHTML =
        "<strong>Zero-PII Verified</strong>" +
        "<span>원본 저장소: Private 유지</span>" +
        (bundle.generatedAtKst ? "<span>빌드: " + escapeHtml(bundle.generatedAtKst) + "</span>" : "");
    }
  }

  function renderOverview() {
    var dateCounts = {};
    var categoryCounts = {};
    var uniquePrs = {};

    logs.forEach(function (log) {
      dateCounts[log.date] = (dateCounts[log.date] || 0) + 1;
      log.categories.forEach(function (cat) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
      log.prBadges.forEach(function (pr) {
        if (/PR\s*#\d+/.test(pr)) uniquePrs[pr] = true;
      });
    });

    var dates = Object.keys(dateCounts);
    var categoryOrder = (bundle.categories || []).length ? bundle.categories : Object.keys(categoryCounts);
    var latestLog = logs[0] || null;
    var filtered = getFilteredLogs();

    var dateChips =
      '<button type="button" class="chip-btn' + (state.selectedDate === "all" ? " active" : "") + '" data-date="all">' +
        "전체 (" + logs.length + ")" +
      "</button>" +
      dates
        .map(function (d) {
          return (
            '<button type="button" class="chip-btn' + (state.selectedDate === d ? " active" : "") + '" data-date="' + escapeHtml(d) + '">' +
              escapeHtml(d) + " (" + dateCounts[d] + ")" +
            "</button>"
          );
        })
        .join("");

    var catChips =
      '<button type="button" class="chip-btn' + (state.selectedCategory === "all" ? " active" : "") + '" data-category="all">' +
        "전체" +
      "</button>" +
      categoryOrder
        .filter(function (c) { return (categoryCounts[c] || 0) > 0; })
        .map(function (c) {
          return (
            '<button type="button" class="chip-btn' + (state.selectedCategory === c ? " active" : "") + '" data-category="' + escapeHtml(c) + '">' +
              escapeHtml(c) + " (" + categoryCounts[c] + ")" +
            "</button>"
          );
        })
        .join("");

    var groupedDates = [];
    var groupedMap = {};
    filtered.forEach(function (log) {
      if (!groupedMap[log.date]) {
        groupedMap[log.date] = [];
        groupedDates.push(log.date);
      }
      groupedMap[log.date].push(log);
    });

    var timelineHtml = "";
    if (filtered.length === 0) {
      timelineHtml =
        '<div class="empty-card">' +
          "<p>조건에 맞는 세션 로그가 없습니다.</p>" +
          '<button type="button" class="btn btn-primary" id="empty-reset-btn">필터 및 검색 초기화</button>' +
        "</div>";
    } else {
      timelineHtml = groupedDates
        .map(function (date) {
          var cards = groupedMap[date]
            .map(function (log) {
              var prHtml = log.prBadges
                .map(function (pr) { return '<span class="pill pill-accent">' + escapeHtml(pr) + "</span>"; })
                .join("");
              var catHtml = log.categories
                .slice(0, 3)
                .map(function (cat) { return '<span class="pill pill-muted">' + escapeHtml(cat) + "</span>"; })
                .join("");
              var snippet = state.query ? findSnippet(log, state.query) : "";
              return (
                '<a href="#log/' + encodeURIComponent(log.slug) + '" class="log-card">' +
                  '<div class="log-card-top">' +
                    '<div class="badge-group">' +
                      '<span class="pill pill-emerald">' + escapeHtml(log.date) + "</span>" +
                      prHtml +
                    "</div>" +
                    '<div class="badge-group">' + catHtml + "</div>" +
                  "</div>" +
                  '<h3 class="log-card-title">' + highlightMatch(log.title, state.query) + "</h3>" +
                  '<p class="log-card-summary">' + highlightMatch(log.summary, state.query) + "</p>" +
                  (snippet ? '<div class="log-card-match">본문 일치: ' + highlightMatch(snippet, state.query) + "</div>" : "") +
                "</a>"
              );
            })
            .join("");
          return (
            '<section class="date-section">' +
              '<div class="date-section-header">' +
                '<div class="date-section-title">📅 ' + escapeHtml(date) + "</div>" +
                '<span class="pill pill-muted">' + groupedMap[date].length + "건</span>" +
              "</div>" +
              '<div class="log-list">' + cards + "</div>" +
            "</section>"
          );
        })
        .join("");
    }

    var isFiltered = state.selectedDate !== "all" || state.selectedCategory !== "all" || state.query.trim() !== "";

    var html =
      '<section class="hero-card">' +
        "<div>" +
          '<div class="hero-eyebrow">privateagent001 · Session Logs Archive</div>' +
          '<h1 class="hero-title">mary 개발 세션 로그 웹사이트</h1>' +
          '<p class="hero-desc">프라이빗 금융 투자 에이전트 mary의 설계 결정, 아키텍처 개편, 버그 수정 및 배포 검증 기록을 일자별로 탐색하고 전체 검색할 수 있습니다.</p>' +
        "</div>" +
        '<div class="hero-actions">' +
          (latestLog
            ? '<a href="#log/' + encodeURIComponent(latestLog.slug) + '" class="btn btn-primary">최신 세션 로그 보기</a>'
            : "") +
        "</div>" +
      "</section>" +
      '<section class="kpi-grid">' +
        '<div class="kpi-card"><div class="kpi-label">전체 세션 로그</div><div class="kpi-value">' + logs.length + '건</div><div class="kpi-sub">docs/session_logs SSOT</div></div>' +
        '<div class="kpi-card"><div class="kpi-label">기록 일수</div><div class="kpi-value">' + dates.length + '일</div><div class="kpi-sub">2026-11-01 ~ ' + escapeHtml(dates[0] || "-") + "</div></div>" +
        '<div class="kpi-card"><div class="kpi-label">연결된 PR</div><div class="kpi-value">' + Object.keys(uniquePrs).length + '건</div><div class="kpi-sub">PR --rebase 병합 기반</div></div>' +
        '<div class="kpi-card"><div class="kpi-label">최신 업데이트</div><div class="kpi-value">' + escapeHtml(dates[0] || "-") + '</div><div class="kpi-sub">' + escapeHtml(bundle.generatedAtKst || "KST") + "</div></div>" +
      "</section>" +
      '<section class="filter-panel">' +
        '<div class="filter-row"><span class="filter-label">일자 필터</span>' + dateChips + "</div>" +
        '<div class="filter-row"><span class="filter-label">주제 필터</span>' + catChips + "</div>" +
        (isFiltered
          ? '<div class="filter-status"><span>검색·필터 결과: <strong>' + filtered.length + '</strong> / ' + logs.length + '건</span><button type="button" class="btn" id="reset-filters-btn">필터 초기화</button></div>'
          : "") +
      "</section>" +
      timelineHtml;

    var mainEl = document.getElementById("main-view");
    mainEl.innerHTML = html;

    mainEl.querySelectorAll("[data-date]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.selectedDate = btn.getAttribute("data-date") || "all";
        render();
      });
    });

    mainEl.querySelectorAll("[data-category]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.selectedCategory = btn.getAttribute("data-category") || "all";
        render();
      });
    });

    var resetBtn = document.getElementById("reset-filters-btn") || document.getElementById("empty-reset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        state.selectedDate = "all";
        state.selectedCategory = "all";
        state.query = "";
        var searchInput = document.getElementById("global-search-input");
        if (searchInput) searchInput.value = "";
        updateSearchClear();
        render();
      });
    }
  }

  function renderDetail(slug) {
    var entry = logsBySlug[slug];
    if (!entry) {
      renderOverview();
      return;
    }

    var log = entry.log;
    var idx = entry.index;
    var newerLog = idx > 0 ? logs[idx - 1] : null;
    var olderLog = idx + 1 < logs.length ? logs[idx + 1] : null;

    var prHtml = log.prBadges
      .map(function (pr) { return '<span class="pill pill-accent">' + escapeHtml(pr) + "</span>"; })
      .join("");
    var catHtml = log.categories
      .map(function (cat) { return '<span class="pill pill-indigo">' + escapeHtml(cat) + "</span>"; })
      .join("");

    var pagerHtml = '<div class="pager-grid">';
    if (newerLog) {
      pagerHtml +=
        '<a href="#log/' + encodeURIComponent(newerLog.slug) + '" class="pager-card">' +
          '<div class="pager-dir">← 다음(최신) 세션 로그 · ' + escapeHtml(newerLog.date) + "</div>" +
          '<div class="pager-title">' + escapeHtml(newerLog.title) + "</div>" +
        "</a>";
    } else {
      pagerHtml += "<div></div>";
    }
    if (olderLog) {
      pagerHtml +=
        '<a href="#log/' + encodeURIComponent(olderLog.slug) + '" class="pager-card right">' +
          '<div class="pager-dir">이전 세션 로그 · ' + escapeHtml(olderLog.date) + " →</div>" +
          '<div class="pager-title">' + escapeHtml(olderLog.title) + "</div>" +
        "</a>";
    } else {
      pagerHtml += "<div></div>";
    }
    pagerHtml += "</div>";

    var mainEl = document.getElementById("main-view");
    mainEl.innerHTML =
      '<div class="detail-toolbar">' +
        '<div class="breadcrumbs">' +
          '<a href="#overview">전체 타임라인</a>' +
          "<span>/</span>" +
          "<span>" + escapeHtml(log.date) + "</span>" +
          "<span>/</span>" +
          "<span>" + escapeHtml(log.filename) + "</span>" +
        "</div>" +
        '<div class="detail-actions">' +
          '<button type="button" class="btn" id="copy-page-link-btn">🔗 링크 복사</button>' +
          '<a href="#overview" class="btn">← 목록으로</a>' +
        "</div>" +
      "</div>" +
      '<header class="detail-header-card">' +
        '<div class="badge-group">' +
          '<span class="pill pill-emerald">' + escapeHtml(log.date) + "</span>" +
          prHtml +
          catHtml +
        "</div>" +
        '<h1 class="detail-title">' + escapeHtml(log.title) + "</h1>" +
        '<div class="detail-filename">docs/session_logs/' + escapeHtml(log.filename) + "</div>" +
      "</header>" +
      '<article class="md-body">' + renderMarkdown(log.body) + "</article>" +
      pagerHtml;

    var copyLinkBtn = document.getElementById("copy-page-link-btn");
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener("click", function () {
        var shareUrl = window.location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl).then(function () {
            copyLinkBtn.textContent = "✓ 복사됨!";
            window.setTimeout(function () {
              copyLinkBtn.textContent = "🔗 링크 복사";
            }, 1800);
          });
        }
      });
    }

    mainEl.querySelectorAll("[data-copy-code]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = document.getElementById(btn.getAttribute("data-copy-code"));
        if (target && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(target.textContent || "").then(function () {
            btn.textContent = "복사됨";
            window.setTimeout(function () { btn.textContent = "복사"; }, 1500);
          });
        }
      });
    });

    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function renderGlobalDropdown() {
    var dropdown = document.getElementById("global-search-dropdown");
    if (!dropdown) return;
    var q = state.query.trim().toLowerCase();
    var route = getRoute();

    if (!q || route.view === "overview") {
      dropdown.classList.add("hidden");
      dropdown.innerHTML = "";
      return;
    }

    var hits = logs
      .filter(function (log) { return log.searchText.toLowerCase().indexOf(q) >= 0; })
      .slice(0, 8);

    if (hits.length === 0) {
      dropdown.innerHTML = '<div class="search-hit"><div class="search-hit-snippet">일치하는 세션 로그가 없습니다.</div></div>';
      dropdown.classList.remove("hidden");
      return;
    }

    dropdown.innerHTML = hits
      .map(function (log) {
        var snippet = findSnippet(log, q) || log.summary;
        return (
          '<a href="#log/' + encodeURIComponent(log.slug) + '" class="search-hit">' +
            '<div class="search-hit-meta">' +
              "<span>" + escapeHtml(log.date) + "</span>" +
              (log.prBadges[0] ? "<span>· " + escapeHtml(log.prBadges[0]) + "</span>" : "") +
            "</div>" +
            '<div class="search-hit-title">' + highlightMatch(log.title, state.query) + "</div>" +
            '<div class="search-hit-snippet">' + highlightMatch(snippet, state.query) + "</div>" +
          "</a>"
        );
      })
      .join("");
    dropdown.classList.remove("hidden");
  }

  function updateSearchClear() {
    var clearBtn = document.getElementById("search-clear-btn");
    if (!clearBtn) return;
    if (state.query) clearBtn.classList.remove("hidden");
    else clearBtn.classList.add("hidden");
  }

  function closeMobileSidebar() {
    var sidebar = document.getElementById("sidebar");
    var backdrop = document.getElementById("sidebar-backdrop");
    if (sidebar) sidebar.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
  }

  function render() {
    var route = getRoute();
    renderSidebar(route.slug);
    if (route.view === "detail" && route.slug) {
      renderDetail(route.slug);
    } else {
      renderOverview();
    }
    renderGlobalDropdown();
  }

  function init() {
    applyTheme(state.theme);

    var countPill = document.getElementById("total-count-pill");
    if (countPill) countPill.textContent = logs.length + "건 · GitHub Pages";

    var buildPill = document.getElementById("build-time-pill");
    if (buildPill && bundle.generatedAtKst) {
      buildPill.textContent = bundle.generatedAtKst;
    }

    var themeBtn = document.getElementById("theme-toggle-btn");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        applyTheme(state.theme === "light" ? "dark" : "light");
      });
    }

    var searchInput = document.getElementById("global-search-input");
    var searchClear = document.getElementById("search-clear-btn");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        state.query = searchInput.value;
        updateSearchClear();
        if (getRoute().view === "overview") renderOverview();
        else renderGlobalDropdown();
      });
      searchInput.addEventListener("focus", renderGlobalDropdown);
    }

    if (searchClear) {
      searchClear.addEventListener("click", function () {
        state.query = "";
        if (searchInput) searchInput.value = "";
        updateSearchClear();
        renderGlobalDropdown();
        if (getRoute().view === "overview") renderOverview();
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== searchInput) {
        var tag = (document.activeElement && document.activeElement.tagName) || "";
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          if (searchInput) searchInput.focus();
        }
      } else if (e.key === "Escape") {
        var dd = document.getElementById("global-search-dropdown");
        if (dd) dd.classList.add("hidden");
        closeMobileSidebar();
      }
    });

    document.addEventListener("click", function (e) {
      var dd = document.getElementById("global-search-dropdown");
      if (dd && !dd.contains(e.target) && e.target !== searchInput) {
        dd.classList.add("hidden");
      }
    });

    var menuBtn = document.getElementById("mobile-menu-btn");
    var backdrop = document.getElementById("sidebar-backdrop");
    var sidebar = document.getElementById("sidebar");
    if (menuBtn && sidebar && backdrop) {
      menuBtn.addEventListener("click", function () {
        sidebar.classList.toggle("open");
        backdrop.classList.toggle("open");
      });
      backdrop.addEventListener("click", closeMobileSidebar);
      sidebar.addEventListener("click", function (e) {
        if (e.target.closest("a")) closeMobileSidebar();
      });
    }

    window.addEventListener("hashchange", function () {
      var dd = document.getElementById("global-search-dropdown");
      if (dd) dd.classList.add("hidden");
      closeMobileSidebar();
      render();
    });

    render();
  }

  init();
})();
