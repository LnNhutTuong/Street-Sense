(() => {
  "use strict";

  // Public ThingSpeak channel. No Write API Key is used or exposed here.
  const CHANNEL_ID = "3536040";
  const API_BASE = `https://api.thingspeak.com/channels/${CHANNEL_ID}`;
  const DEFAULT_RESULTS = 50;
  const REFRESH_INTERVAL_MS = 20000; // Keep above the common 15-second free-channel limit.

  const $ = (id) => document.getElementById(id);
  let refreshTimer = null;
  let isLoading = false;
  let charts = {};

  const numberOrNull = (value) => {
    if (value === null || value === undefined || String(value).trim() === "")
      return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  function formatNumber(value, digits = 1) {
    return value === null
      ? "--"
      : Number(value).toLocaleString("vi-VN", {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        });
  }

  function formatTimestamp(raw) {
    if (!raw) return "--";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  }

  function shortTime(raw) {
    if (!raw) return "--";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  function field(feed, number) {
    return numberOrNull(feed[`field${number}`]);
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function setDevice(id, isOn) {
    const element = $(id);
    if (!element) return;
    element.textContent = isOn ? "ĐANG BẬT" : "ĐANG TẮT";
    element.classList.toggle("on", isOn);
    element.classList.toggle("off", !isOn);
  }

  function setConnection(connected, message) {
    const dot = $("connectionDot");
    dot.style.background = connected ? "#3bd6a1" : "#ff6d7d";
    dot.style.boxShadow = connected
      ? "0 0 0 5px #3bd6a118"
      : "0 0 0 5px #ff6d7d18";
    setText("connectionText", message);
    setText("sideConnection", connected ? "Đã kết nối" : "Mất kết nối");
    const sideDot = document.querySelector(".pulse-dot");
    sideDot.style.background = connected ? "#3bd6a1" : "#ff6d7d";
    sideDot.style.boxShadow = connected
      ? "0 0 0 5px #3bd6a118"
      : "0 0 0 5px #ff6d7d18";
  }

  function fogLabel(level) {
    if (level === null) return "Không có dữ liệu";
    if (level >= 1.5) return "CAO";
    if (level >= 0.5) return "TRUNG BÌNH";
    return "THẤP";
  }

  function updateFog(level) {
    const label = fogLabel(level);
    const banner = $("fogBanner");
    banner.classList.remove("level-high", "level-medium", "level-low");
    if (level !== null && level >= 1.5) {
      banner.classList.add("level-high");
      $("fogDot").style.background = "#ff6d7d";
      $("fogDot").style.boxShadow = "0 0 0 5px #ff6d7d18";
      setText("fogHint", "Mức cảnh báo cao");
      setText("fogBannerDesc", "Độ ẩm và nhiệt độ đạt ngưỡng sương mù cao.");
    } else if (level !== null && level >= 0.5) {
      banner.classList.add("level-medium");
      $("fogDot").style.background = "#ffbd61";
      $("fogDot").style.boxShadow = "0 0 0 5px #ffbd6118";
      setText("fogHint", "Mức cảnh báo trung bình");
      setText(
        "fogBannerDesc",
        "Điều kiện cảm biến đạt ngưỡng sương mù trung bình.",
      );
    } else {
      banner.classList.add("level-low");
      $("fogDot").style.background = "#3bd6a1";
      $("fogDot").style.boxShadow = "0 0 0 5px #3bd6a118";
      setText(
        "fogHint",
        level === null ? "Chưa có dữ liệu cảm biến" : "Mức cảnh báo thấp",
      );
      setText(
        "fogBannerDesc",
        level === null
          ? "Chưa nhận được mức sương mù."
          : "Chưa đạt ngưỡng cảnh báo sương mù.",
      );
    }
    setText("fogLevel", label);
    setText(
      "fogBannerText",
      label === "Không có dữ liệu"
        ? "Đang chờ dữ liệu"
        : `Sương mù ${label.toLowerCase()}`,
    );
  }

  function updateDashboard(feed, feeds) {
    const temperature = field(feed, 2);
    const humidity = field(feed, 3);
    const ldr = field(feed, 1);
    const fog = field(feed, 4);
    const darkValue = field(feed, 5);
    const yellowCountRaw = field(feed, 6);
    const blueState = field(feed, 7);
    const redState = field(feed, 8);

    setText("temperature", formatNumber(temperature, 1));
    setText("humidity", formatNumber(humidity, 0));
    setText(
      "ldr",
      ldr === null ? "--" : Math.round(ldr).toLocaleString("vi-VN"),
    );
    setText(
      "temperatureHint",
      temperature === null
        ? "Chưa có dữ liệu"
        : temperature <= 25
          ? "Nhiệt độ tương đối thấp"
          : "Nhiệt độ môi trường",
    );
    setText(
      "humidityHint",
      humidity === null
        ? "Chưa có dữ liệu"
        : humidity >= 80
          ? "Độ ẩm cao"
          : "Độ ẩm không khí",
    );
    setText(
      "lightHint",
      ldr === null
        ? "Chưa có dữ liệu"
        : ldr > 2000
          ? "LDR trên ngưỡng tối (2000)"
          : "LDR dưới ngưỡng tối (2000)",
    );
    updateFog(fog);

    const isDark = darkValue !== null && darkValue >= 0.5;
    const count =
      yellowCountRaw === null
        ? 0
        : Math.max(0, Math.min(3, Math.round(yellowCountRaw)));
    setText("yellowCount", `${count} / 3`);
    $("yellowProgress").style.width = `${(count / 3) * 100}%`;
    setDevice("yellow1State", count >= 1);
    setDevice("yellow2State", count >= 2);
    setDevice("yellow3State", count >= 3);
    setText(
      "skyState",
      darkValue === null
        ? "Chưa có dữ liệu ánh sáng"
        : isDark
          ? "Trời tối"
          : "Trời sáng",
    );
    setText("darkPill", darkValue === null ? "--" : isDark ? "TỐI" : "SÁNG");
    $("darkPill").classList.toggle("dark", isDark);
    setDevice("blueState", blueState !== null && blueState >= 0.5);
    setDevice("redState", redState !== null && redState >= 0.5);

    setText("lastUpdated", formatTimestamp(feed.created_at));
    setText("dataTimestamp", `Thời gian: ${formatTimestamp(feed.created_at)}`);
    setText("entryId", `Entry: ${feed.entry_id ?? "--"}`);
    setText("recordCount", `${feeds.length} bản ghi`);
    renderTable(feeds.slice(-8).reverse());
    renderCharts(feeds);
  }

  function renderTable(feeds) {
    const tbody = $("recentRows");
    if (!feeds.length) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="empty-cell">Chưa có bản ghi nào trong kênh.</td></tr>';
      return;
    }
    tbody.innerHTML = feeds
      .map((feed) => {
        const fog = field(feed, 4);
        const fogClass =
          fog === null
            ? ""
            : fog >= 1.5
              ? "high"
              : fog >= 0.5
                ? "medium"
                : "low";
        const dark = field(feed, 5);
        const count = field(feed, 6);
        return `<tr>
        <td>${escapeHTML(shortTime(feed.created_at))}</td>
        <td>${escapeHTML(formatNumber(field(feed, 2), 1))} °C</td>
        <td>${escapeHTML(formatNumber(field(feed, 3), 0))} %</td>
        <td>${field(feed, 1) === null ? "--" : Math.round(field(feed, 1))}</td>
        <td><span class="table-tag ${fogClass}">${escapeHTML(fogLabel(fog))}</span></td>
        <td>${dark === null ? "--" : dark >= 0.5 ? "Tối" : "Sáng"}</td>
        <td>${count === null ? "--" : `${Math.round(count)} / 3`}</td>
      </tr>`;
      })
      .join("");
  }

  function escapeHTML(value) {
    return String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  }

  function chartOptions(yTitle, beginAtZero = false, stepSize = undefined) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#18263b",
          borderColor: "#344967",
          borderWidth: 1,
          titleColor: "#eaf1ff",
          bodyColor: "#bdcbe0",
          padding: 12,
          titleFont: { size: 13 },
          bodyFont: { size: 13 },
          displayColors: false,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: "#2a3950" },
          ticks: {
            color: "#7f90aa",
            maxTicksLimit: 6,
            maxRotation: 0,
            font: { size: 12 },
          },
        },
        y: {
          beginAtZero,
          ...(stepSize ? { ticks: { stepSize } } : {}),
          grid: { color: "#223149" },
          border: { display: false },
          ticks: { color: "#7f90aa", font: { size: 12 } },
          title: { display: false, text: yTitle, color: "#7f90aa" },
        },
      },
    };
  }

  function makeChart(
    id,
    label,
    labels,
    data,
    color,
    fill,
    yTitle,
    beginAtZero = false,
    stepSize,
  ) {
    const canvas = $(id);
    if (charts[id]) {
      charts[id].data.labels = labels;
      charts[id].data.datasets[0].data = data;
      charts[id].update("none");
      return;
    }
    charts[id] = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label,
            data,
            borderColor: color,
            backgroundColor: fill,
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: data.length > 25 ? 0 : 2,
            pointHoverRadius: 4,
            pointBackgroundColor: color,
            spanGaps: true,
          },
        ],
      },
      options: chartOptions(yTitle, beginAtZero, stepSize),
    });
  }

  function renderCharts(feeds) {
    const labels = feeds.map((feed) => shortTime(feed.created_at));
    makeChart(
      "temperatureChart",
      "Nhiệt độ (°C)",
      labels,
      feeds.map((feed) => field(feed, 2)),
      "#ffb35c",
      "rgba(255,179,92,.10)",
      "°C",
    );
    makeChart(
      "humidityChart",
      "Độ ẩm (%)",
      labels,
      feeds.map((feed) => field(feed, 3)),
      "#67b8ff",
      "rgba(103,184,255,.10)",
      "%",
      true,
    );
    makeChart(
      "ldrChart",
      "LDR (ADC)",
      labels,
      feeds.map((feed) => field(feed, 1)),
      "#a99bff",
      "rgba(169,155,255,.10)",
      "ADC",
      true,
    );
    makeChart(
      "fogChart",
      "Mức sương mù",
      labels,
      feeds.map((feed) => field(feed, 4)),
      "#3bd6a1",
      "rgba(59,214,161,.10)",
      "Mức",
      true,
      1,
    );
  }

  async function loadData({ manual = false } = {}) {
    if (isLoading) return;
    isLoading = true;
    $("refreshBtn").classList.add("loading");
    try {
      const count = Number($("sampleCount").value) || DEFAULT_RESULTS;
      const url = `${API_BASE}/feeds.json?results=${count}&_=${Date.now()}`;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload.feeds) || payload.feeds.length === 0) {
        throw new Error("Kênh chưa có dữ liệu. Hãy kiểm tra ThingSpeak.");
      }
      const validFeeds = payload.feeds.filter((feed) => feed.created_at);
      if (!validFeeds.length) throw new Error("Không tìm thấy bản ghi hợp lệ.");
      const latest = validFeeds[validFeeds.length - 1];
      updateDashboard(latest, validFeeds);
      setConnection(true, "Đã kết nối ThingSpeak · dữ liệu tải thành công");
      if (manual) showToast("Đã cập nhật dữ liệu mới nhất.");
    } catch (error) {
      console.error("ThingSpeak fetch error:", error);
      setConnection(false, `Không tải được dữ liệu: ${error.message}`);
      setText("lastUpdated", "Không thể cập nhật");
      if (manual)
        showToast(
          "Không tải được dữ liệu. Kiểm tra kết nối mạng và Channel ID.",
        );
      if (
        !$("recentRows").querySelector("tr") ||
        $("recentRows").textContent.includes("Đang tải")
      ) {
        $("recentRows").innerHTML =
          `<tr><td colspan="7" class="empty-cell error-message">Không tải được dữ liệu. Kiểm tra kết nối và quyền Public của kênh.</td></tr>`;
      }
    } finally {
      isLoading = false;
      $("refreshBtn").classList.remove("loading");
    }
  }

  let toastTimer;
  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  $("refreshBtn").addEventListener("click", () => loadData({ manual: true }));
  $("sampleCount").addEventListener("change", () => loadData({ manual: true }));
  $("copyChannel").addEventListener("click", async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(CHANNEL_ID);
      } else {
        const field = document.createElement("textarea");
        field.value = CHANNEL_ID;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.append(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        if (!copied) throw new Error("Clipboard access is unavailable");
      }
      showToast("Đã sao chép Channel ID.");
    } catch {
      showToast(`Không thể sao chép. Channel ID: ${CHANNEL_ID}`);
    }
  });

  const navigationLinks = Array.from(
    document.querySelectorAll(".side-navigation .nav-item"),
  );
  const navigationSections = navigationLinks
    .map((link) => document.querySelector(link.hash))
    .filter(Boolean);

  function setActiveNavigation(sectionId) {
    navigationLinks.forEach((link) => {
      const isActive = link.hash === `#${sectionId}`;
      link.classList.toggle("active", isActive);
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  let clickedSectionId = null; // mục người dùng vừa bấm
  let scrollIdleTimer = null;

  function isAtPageBottom() {
    return (
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 4
    );
  }

  function syncNavigationWithScroll() {
    let currentSection = navigationSections[0];
    navigationSections.forEach((section) => {
      if (section.getBoundingClientRect().top <= 170) currentSection = section;
    });

    // Nếu trang đã cuộn hết cỡ mà mục vừa bấm không thể lên tới đỉnh,
    // vẫn giữ mục đó là active (tránh bị nhảy về mục trước).
    if (clickedSectionId && isAtPageBottom()) {
      const clicked = document.getElementById(clickedSectionId);
      if (clicked && clicked.getBoundingClientRect().top < window.innerHeight) {
        currentSection = clicked;
      }
    }
    if (currentSection) setActiveNavigation(currentSection.id);
  }

  navigationLinks.forEach((link) => {
    link.addEventListener("click", () => {
      clickedSectionId = link.hash.slice(1);
      setActiveNavigation(clickedSectionId); // đổi active ngay khi bấm
    });
  });

  // Trong lúc cuộn mượt sau khi bấm, không để scroll ghi đè active.
  // Khi dừng cuộn ~150ms thì mới đồng bộ lại theo vị trí thật.
  window.addEventListener(
    "scroll",
    () => {
      if (!clickedSectionId) return syncNavigationWithScroll();
      clearTimeout(scrollIdleTimer);
      scrollIdleTimer = setTimeout(() => {
        syncNavigationWithScroll();
        clickedSectionId = null;
      }, 150);
    },
    { passive: true },
  );

  // Back/Forward hoặc dán link có #hash
  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (navigationSections.some((section) => section.id === id)) {
      setActiveNavigation(id);
    }
  });
  syncNavigationWithScroll();

  loadData();
  refreshTimer = setInterval(() => loadData(), REFRESH_INTERVAL_MS);
  window.addEventListener("beforeunload", () => {
    if (refreshTimer) clearInterval(refreshTimer);
    Object.values(charts).forEach((chart) => chart.destroy());
  });
})();
