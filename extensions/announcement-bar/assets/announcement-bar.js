(function () {
  "use strict";

  var root = document.getElementById("ab-announcement-bar-root");
  if (!root) return;

  var pageType = root.dataset.pageType || "";
  var pageUrl = root.dataset.pageUrl || "";
  var country = root.dataset.country || "";
  var customerTags = root.dataset.customerTags || "";
  var customerSpend = root.dataset.customerSpend || "0";
  var currencySymbol = root.dataset.currency || "$";

  // Position and sticky will be determined at the announcement level from the database settings,
  // but we can fall back to liquid block dataset as a backup.
  var blockPosition = root.dataset.position || "top";
  var blockSticky = root.dataset.sticky === "true";

  function resolvePositionAndSticky(a) {
    var pos = (a.position === "bottom" || blockPosition === "bottom") ? "bottom" : "top";
    var st = (a.sticky === true || blockSticky === true);
    return { position: pos, sticky: st };
  }

  var DISMISS_PREFIX = "ab-dismissed-";

  function isDismissed(id) {
    try {
      return sessionStorage.getItem(DISMISS_PREFIX + id) === "1";
    } catch (e) {
      return false;
    }
  }

  function dismiss(id) {
    try {
      sessionStorage.setItem(DISMISS_PREFIX + id, "1");
    } catch (e) {
      /* ignore */
    }
  }

  function sendClick(id) {
    try {
      var body = new URLSearchParams();
      body.append("intent", "click");
      body.append("id", id);
      fetch("/apps/announcement-bar/bars", {
        method: "POST",
        body: body,
      });
    } catch (e) {}
  }

  function fetchBars() {
    var params = new URLSearchParams({
      page_type: pageType,
      url: pageUrl,
      country: country,
      customer_tags: customerTags,
      customer_spend: customerSpend
    });
    return fetch("/apps/announcement-bar/bars?" + params.toString(), {
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load announcements");
        return res.json();
      })
      .catch(function () {
        return { announcements: [] };
      });
  }


  function fetchCart() {
    return fetch("/cart.js", { headers: { Accept: "application/json" } })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .catch(function () {
        return null;
      });
  }

  function formatMoney(cents, currencySymbol) {
    return currencySymbol + (cents / 100).toFixed(2);
  }

  function getTargetTime(slide) {
    if (slide.countdownType === "session") {
      var key = "ab-session-timer-" + slide.id;
      var stored = sessionStorage.getItem(key);
      if (!stored) {
        var durationMs = (slide.countdownMinutes || 120) * 60 * 1000;
        stored = (Date.now() + durationMs).toString();
        sessionStorage.setItem(key, stored);
      }
      return parseInt(stored, 10);
    } else {
      return slide.countdownEndAt ? new Date(slide.countdownEndAt).getTime() : 0;
    }
  }

  function buildCountdown(container, slide, announcement, messageEl, onExpire) {
    var targetMs = getTargetTime(slide);
    if (!targetMs) return;

    var el = document.createElement("span");
    el.className = "ab-countdown";

    if (announcement.timerFontSize) {
      el.style.fontSize = announcement.timerFontSize + "px";
    }
    if (announcement.timerWidth && announcement.timerWidth !== "auto") {
      var w = announcement.timerWidth.toString();
      el.style.width = w + (isNaN(w) ? "" : "px");
      el.style.justifyContent = "center";
    }
    if (announcement.timerHeight && announcement.timerHeight !== "auto") {
      var h = announcement.timerHeight.toString();
      el.style.height = h + (isNaN(h) ? "" : "px");
      el.style.alignItems = "center";
    }
    if (announcement.timerTextColor) {
      el.style.color = announcement.timerTextColor;
    }
    if (announcement.timerBgColor) {
      el.style.backgroundColor = announcement.timerBgColor;
      el.style.padding = "4px 8px";
      el.style.borderRadius = "4px";
    }

    if (announcement.timerPosition === "left") {
      el.style.order = "-1";
    } else if (announcement.timerPosition === "right") {
      el.style.order = "2";
    } else if (announcement.timerPosition === "left-corner" || announcement.timerPosition === "right-corner") {
      el.classList.add("ab-timer-" + announcement.timerPosition);
    } else {
      el.style.order = "1";
    }

    var inlinePlaceholder = slide.countdownPlaceInText;
    var originalText = slide.text;

    if (!inlinePlaceholder) {
      container.appendChild(el);
    }

    function render() {
      var diff = targetMs - Date.now();
      if (diff <= 0) {
        clearInterval(timer);
        onExpire();
        return;
      }

      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);

      var hideDays = slide.countdownHideDaysIfLessThan24h && d === 0;

      var units = [];
      if (d > 0 && !hideDays) {
        units.push({ value: pad(d), label: slide.countdownLabelsDays || "Days" });
      }
      units.push(
        { value: pad(h), label: slide.countdownLabelsHours || "Hours" },
        { value: pad(m), label: slide.countdownLabelsMins || "Mins" },
        { value: pad(s), label: slide.countdownLabelsSecs || "Secs" }
      );

      if (inlinePlaceholder) {
        var plainString = units
          .map(function (u) {
            return u.value + u.label.charAt(0).toLowerCase();
          })
          .join(" ");
        messageEl.innerHTML = originalText.replace("{countdown}", plainString);
      } else {
        var labelHtml = "";
        if (slide.countdownLabel) {
          labelHtml = '<span class="ab-timer-label">' +
            '<span>' + slide.countdownLabel + '</span>' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>' +
            '</span>';
        }
        var digitsHtml = units
          .map(function (u) {
            return (
              '<span class="ab-unit">' +
              '<span class="ab-unit-value">' + u.value + "</span>" +
              '<span class="ab-unit-label">' + u.label + "</span>" +
              "</span>"
            );
          })
          .join('<span class="ab-colon">:</span>');
        el.innerHTML = labelHtml + '<span class="ab-timer-digits">' + digitsHtml + '</span>';
      }
    }

    function pad(n) {
      return n < 10 ? "0" + n : "" + n;
    }

    render();
    var timer = setInterval(render, 1000);
    return timer;
  }

  function getIconHtml(slide) {
    if (!slide.iconEnabled) return "";
    if (slide.iconType === "badge") {
      return '<span class="ab-badge">' + (slide.iconName || "NEW") + "</span>";
    }
    var emojiMap = {
      gift: "🎁",
      tag: "🏷️",
      bell: "🔔",
      star: "⭐",
      heart: "❤️",
      cart: "🛒",
      coupon: "🎟️",
      sparkles: "✨",
      fire: "🔥",
      megaphone: "📢"
    };
    var emoji = emojiMap[slide.iconName] || "🎁";
    return '<span class="ab-icon">' + emoji + "</span>";
  }

  function buildSlide(slide, announcement, cart, currencySymbol) {
    var slideEl = document.createElement("div");
    slideEl.className = "ab-slide";
    slideEl.dataset.slideId = slide.id;

    var contentWrap = document.createElement("div");
    contentWrap.className = "ab-slide-content";
    contentWrap.style.display = "flex";
    contentWrap.style.alignItems = "center";
    contentWrap.style.justifyContent = "center";
    contentWrap.style.flexWrap = "wrap";
    contentWrap.style.gap = "8px";

    var isSideBySide = announcement.timerPosition === "left" || announcement.timerPosition === "right";

    var textGroup;
    if (isSideBySide) {
      textGroup = document.createElement("div");
      textGroup.className = "ab-text-group";
      textGroup.style.display = "flex";
      textGroup.style.flexDirection = "column";
      textGroup.style.alignItems = "center";
      textGroup.style.justifyContent = "center";
      textGroup.style.textAlign = "center";
      textGroup.style.order = "0";
      textGroup.appendChild(contentWrap);
      slideEl.appendChild(textGroup);
      slideEl.style.gap = "20px";
    } else {
      slideEl.appendChild(contentWrap);
    }

    // Icon/badge
    if (slide.iconEnabled) {
      var iconSpan = document.createElement("span");
      iconSpan.style.order = "0";
      iconSpan.innerHTML = getIconHtml(slide);
      contentWrap.appendChild(iconSpan);
    }

    // Process slide text (handles discount place in text)
    var textToShow = slide.text;
    if (slide.discountCodeEnabled && slide.discountCode && slide.discountPlaceInText) {
      textToShow = textToShow.replace("{discount_code}", slide.discountCode);
    }

    var messageEl = document.createElement("span");
    messageEl.className = "ab-message";
    messageEl.style.order = "0";
    messageEl.innerHTML = textToShow;
    contentWrap.appendChild(messageEl);

    // Subtext
    if (slide.subtext) {
      var subtextEl = document.createElement("span");
      subtextEl.className = "ab-subtext";
      subtextEl.textContent = slide.subtext;
      if (announcement.subtextFontSize) {
        subtextEl.style.fontSize = announcement.subtextFontSize + "px";
      }
      if (announcement.subtextColor) {
        subtextEl.style.color = announcement.subtextColor;
      }
      if (announcement.subtextBold) {
        subtextEl.style.fontWeight = "bold";
      } else {
        subtextEl.style.fontWeight = "normal";
      }
      
      if (isSideBySide) {
        textGroup.appendChild(subtextEl);
      } else {
        slideEl.appendChild(subtextEl);
      }
    }

    // Countdown
    var countdownTimer = null;
    if (slide.countdownEnabled) {
      var cdContainer = isSideBySide ? slideEl : contentWrap;
      countdownTimer = buildCountdown(cdContainer, slide, announcement, messageEl, function () {
        if (slide.countdownExpiredAction === "hide_slide") {
          slideEl.remove();
          if (slideEl.cornerTimerEl) slideEl.cornerTimerEl.remove();
        } else if (slide.countdownExpiredAction === "hide_bar") {
          var bar = slideEl.closest(".ab-bar");
          if (bar) bar.remove();
        } else if (slide.countdownExpiredAction === "show_message") {
          messageEl.innerHTML = slide.countdownExpiredMessage || "";
          var cd = slideEl.querySelector(".ab-countdown");
          if (cd) cd.remove();
          if (slideEl.cornerTimerEl) slideEl.cornerTimerEl.remove();
        }
      });
      slideEl.dataset.countdownTimer = countdownTimer;

      if (announcement.timerPosition === "left-corner" || announcement.timerPosition === "right-corner") {
        var timerEl = contentWrap.querySelector(".ab-countdown");
        if (timerEl) {
          slideEl.cornerTimerEl = timerEl;
          timerEl.style.display = "none";
        }
      }
    }

    // Discount badge (separate)
    if (slide.discountCodeEnabled && slide.discountCode && !slide.discountPlaceInText) {
      var discEl = document.createElement("span");
      discEl.className = "ab-discount-badge";
      discEl.style.order = "0";
      discEl.innerHTML = "🎟️ " + slide.discountCode;
      contentWrap.appendChild(discEl);
    }

    // CTA Link or Button
    if (slide.ctaEnabled && slide.ctaLink) {
      if (slide.ctaType === "button") {
        var btn = document.createElement("a");
        btn.className = "ab-cta";
        btn.href = slide.ctaLink;
        btn.textContent = slide.ctaText || "Click";
        btn.style.textDecoration = "none";
        if (announcement.buttonBgColor) {
          btn.style.background = announcement.buttonBgColor;
        } else {
          btn.style.background = "transparent";
        }
        btn.style.color = announcement.buttonTextColor || "#000000";
        btn.style.padding = "4px 10px";
        btn.style.borderRadius = "4px";
        btn.style.fontSize = (announcement.buttonFontSize || 12) + "px";
        btn.style.marginLeft = "8px";
        btn.style.fontWeight = announcement.buttonBold ? "bold" : "normal";
        btn.style.order = "3";
        btn.addEventListener("click", function () {
          sendClick(announcement.id);
        });
        contentWrap.appendChild(btn);
      } else {
        slideEl.style.cursor = "pointer";
        slideEl.addEventListener("click", function (e) {
          if (!e.target.closest("a") && !e.target.closest(".ab-close")) {
            sendClick(announcement.id);
            window.location.href = slide.ctaLink;
          }
        });
      }
    }

    return slideEl;
  }

  function parseSlides(a) {
    var slides = [];
    try {
      if (a.slidesJson) {
        slides = JSON.parse(a.slidesJson);
      }
    } catch (e) {}

    if (!slides || !slides.length) {
      // Fallback
      slides = [{
        id: "default",
        text: a.message || "",
        subtext: "",
        discountCodeEnabled: false,
        discountCode: "",
        discountPlaceInText: false,
        countdownEnabled: a.countdownEnabled || false,
        countdownType: "date",
        countdownMinutes: 120,
        countdownEndAt: a.countdownEndAt || "",
        countdownExpiredAction: a.countdownExpiredMessage ? "show_message" : "hide_slide",
        countdownExpiredMessage: a.countdownExpiredMessage || "",
        countdownLabelsDays: "Days",
        countdownLabelsHours: "Hours",
        countdownLabelsMins: "Mins",
        countdownLabelsSecs: "Secs",
        countdownHideDaysIfLessThan24h: false,
        countdownPlaceInText: false,
        ctaEnabled: !!(a.linkUrl && a.linkText),
        ctaType: "button",
        ctaText: a.linkText || "Click",
        ctaLink: a.linkUrl || "",
        iconEnabled: false,
        iconType: "icon",
        iconName: "gift"
      }];
    }
    return slides;
  }

  function applyStyles(bar, a) {
    if (!a) return;
    
    // Background style
    if (a.bgStyle === "gradient" && a.bgGradient) {
      bar.style.background = a.bgGradient;
    } else {
      bar.style.setProperty("--ab-bg", a.backgroundColor);
      bar.style.background = a.backgroundColor;
    }
    
    bar.style.setProperty("--ab-fg", a.textColor);
    bar.style.color = a.textColor;

    // Border properties
    if (a.borderRadius) {
      bar.style.borderRadius = a.borderRadius + "px";
    }
    if (a.borderSize) {
      bar.style.borderWidth = a.borderSize + "px";
      bar.style.borderStyle = "solid";
      bar.style.borderColor = a.borderColor || "#000000";
    }

    // Font properties
    if (a.fontFamily && a.fontFamily !== "inherit") {
      bar.style.fontFamily = a.fontFamily;
      
      var fontName = "";
      if (a.fontFamily.indexOf("Inter") !== -1) {
        fontName = "Inter:wght@400;700";
      } else if (a.fontFamily.indexOf("Outfit") !== -1) {
        fontName = "Outfit:wght@400;700";
      } else if (a.fontFamily.indexOf("Roboto Condensed") !== -1) {
        fontName = "Roboto+Condensed:wght@400;700";
      }
      
      if (fontName) {
        var linkId = "ab-font-" + fontName.split(":")[0].toLowerCase().replace(/\+/g, "-");
        if (!document.getElementById(linkId)) {
          var link = document.createElement("link");
          link.id = linkId;
          link.rel = "stylesheet";
          link.href = "https://fonts.googleapis.com/css2?family=" + fontName + "&display=swap";
          document.head.appendChild(link);
        }
      }
    }
    if (a.fontSize) {
      bar.style.fontSize = a.fontSize + "px";
    }
    if (a.fontBold) {
      bar.classList.add("ab-font-bold");
      bar.style.fontWeight = "bold";
    }

    // Spacing (padding & margins)
    if (a.paddingTop !== undefined && a.paddingTop !== null) {
      bar.style.paddingTop = a.paddingTop + "px";
    } else {
      bar.style.paddingTop = "8px"; // default
    }
    if (a.paddingBottom !== undefined && a.paddingBottom !== null) {
      bar.style.paddingBottom = a.paddingBottom + "px";
    } else {
      bar.style.paddingBottom = "8px"; // default
    }
    if (a.marginTop !== undefined && a.marginTop !== null) {
      bar.style.marginTop = a.marginTop + "px";
    }
    if (a.marginBottom !== undefined && a.marginBottom !== null) {
      bar.style.marginBottom = a.marginBottom + "px";
    }

    // Animations
    if (a.bgAnimation && a.bgAnimation !== "none") {
      bar.classList.add("ab-bg-anim-" + a.bgAnimation);
    }
    if (a.textAnimation && a.textAnimation !== "none") {
      bar.classList.add("ab-text-anim-" + a.textAnimation);
    }

    if (a.timerPosition) {
      bar.classList.add("ab-timer-pos-" + a.timerPosition);
    }

    // Custom CSS
    if (a.customCss) {
      var styleTag = document.createElement("style");
      styleTag.innerHTML = ".ab-bar[data-announcement-id='" + a.id + "'] { " + a.customCss + " }";
      document.head.appendChild(styleTag);
      bar.setAttribute("data-announcement-id", a.id);
    }
  }

  function buildStaticBar(a, cart, currencySymbol) {
    var bar = document.createElement("div");
    bar.className = "ab-bar ab-mode-static";
    
    var placement = resolvePositionAndSticky(a);
    bar.dataset.position = placement.position;
    if (placement.sticky) bar.classList.add("ab-sticky");
    if (a.showCloseButton) bar.classList.add("ab-has-close");
    
    applyStyles(bar, a);

    var inner = document.createElement("div");
    inner.className = "ab-inner";

    var slidesContainer = document.createElement("div");
    slidesContainer.className = "ab-slides";
    
    if (a.barType === "html") {
      var htmlWrapper = document.createElement("div");
      htmlWrapper.className = "ab-slide ab-active ab-html-content";
      htmlWrapper.style.width = "100%";
      htmlWrapper.style.display = "block";
      htmlWrapper.innerHTML = a.htmlContent || "";
      slidesContainer.appendChild(htmlWrapper);
    } else {
      var parsed = parseSlides(a);
      var slideEl = buildSlide(parsed[0], a, cart, currencySymbol);
      slideEl.classList.add("ab-active");
      slidesContainer.appendChild(slideEl);
      if (slideEl.cornerTimerEl) {
        slideEl.cornerTimerEl.style.display = "inline-flex";
        inner.appendChild(slideEl.cornerTimerEl);
      }
    }
    inner.appendChild(slidesContainer);

    if (a.showCloseButton) {
      var close = document.createElement("button");
      close.className = "ab-close";
      close.type = "button";
      close.setAttribute("aria-label", "Dismiss");
      close.innerHTML = "&times;";
      close.addEventListener("click", function () {
        dismiss(a.id);
        bar.remove();
      });
      inner.appendChild(close);
    }

    bar.appendChild(inner);
    return bar;
  }

  function buildCarouselBar(a, cart, currencySymbol) {
    var bar = document.createElement("div");
    bar.className = "ab-bar ab-mode-carousel";
    
    var placement = resolvePositionAndSticky(a);
    bar.dataset.position = placement.position;
    if (placement.sticky) bar.classList.add("ab-sticky");
    if (a.showCloseButton) bar.classList.add("ab-has-close");
    
    applyStyles(bar, a);

    var inner = document.createElement("div");
    inner.className = "ab-inner";

    var slidesContainer = document.createElement("div");
    slidesContainer.className = "ab-slides";

    var sliderTrack = document.createElement("div");
    sliderTrack.className = "ab-slider-track";
    slidesContainer.appendChild(sliderTrack);

    var parsed = parseSlides(a);
    var slideElements = [];

    parsed.forEach(function (slide, i) {
      var slideEl = buildSlide(slide, a, cart, currencySymbol);
      if (i === 0) {
        slideEl.classList.add("ab-active");
        if (slideEl.cornerTimerEl) {
          slideEl.cornerTimerEl.style.display = "inline-flex";
        }
      }
      sliderTrack.appendChild(slideEl);
      slideElements.push(slideEl);
    });

    // Add corner timers to inner container
    slideElements.forEach(function (slideEl) {
      if (slideEl.cornerTimerEl) {
        inner.appendChild(slideEl.cornerTimerEl);
      }
    });
    
    // Add navigation arrows if multiple slides
    var showArrows = a.sliderShowArrows !== false;
    var arrowsPos = a.sliderArrowsPosition || "corners";
    if (showArrows) {
      bar.classList.add("ab-arrows-" + arrowsPos);
    }

    if (parsed.length > 1 && showArrows) {
      var prevBtn = document.createElement("button");
      prevBtn.className = "ab-nav-btn ab-prev";
      prevBtn.type = "button";
      prevBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
      inner.appendChild(prevBtn);
      
      inner.appendChild(slidesContainer);
      
      var nextBtn = document.createElement("button");
      nextBtn.className = "ab-nav-btn ab-next";
      nextBtn.type = "button";
      nextBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
      inner.appendChild(nextBtn);

      var index = 0;
      var intervalId = null;

      function showSlide(newIndex) {
        if (slideElements[index].cornerTimerEl) {
          slideElements[index].cornerTimerEl.style.display = "none";
        }
        slideElements[index].classList.remove("ab-active");
        index = (newIndex + parsed.length) % parsed.length;
        slideElements[index].classList.add("ab-active");
        if (slideElements[index].cornerTimerEl) {
          slideElements[index].cornerTimerEl.style.display = "inline-flex";
        }
        sliderTrack.style.transform = "translateX(-" + (index * 100) + "%)";
      }

      function startAutoplay() {
        var duration = (a.slideDuration || 5) * 1000;
        intervalId = setInterval(function () {
          showSlide(index + 1);
        }, duration);
      }

      function stopAutoplay() {
        if (intervalId) clearInterval(intervalId);
      }

      prevBtn.addEventListener("click", function () {
        stopAutoplay();
        showSlide(index - 1);
        startAutoplay();
      });

      nextBtn.addEventListener("click", function () {
        stopAutoplay();
        showSlide(index + 1);
        startAutoplay();
      });

      startAutoplay();
    } else {
      inner.appendChild(slidesContainer);
    }

    if (a.showCloseButton) {
      var close = document.createElement("button");
      close.className = "ab-close";
      close.type = "button";
      close.setAttribute("aria-label", "Dismiss");
      close.innerHTML = "&times;";
      close.addEventListener("click", function () {
        dismiss(a.id);
        bar.remove();
      });
      inner.appendChild(close);
    }

    bar.appendChild(inner);
    return bar;
  }

  function buildScrollBar(a, cart, currencySymbol) {
    var bar = document.createElement("div");
    bar.className = "ab-bar ab-mode-scroll";
    
    var placement = resolvePositionAndSticky(a);
    bar.dataset.position = placement.position;
    if (placement.sticky) bar.classList.add("ab-sticky");
    
    applyStyles(bar, a);

    var inner = document.createElement("div");
    inner.className = "ab-inner";

    var slidesContainer = document.createElement("div");
    slidesContainer.className = "ab-slides";

    var track = document.createElement("div");
    track.className = "ab-marquee-track";

    // Set custom marquee duration if configured
    if (a.slideDuration) {
      track.style.animationDuration = (a.slideDuration * 4) + "s";
    }

    var parsed = parseSlides(a);

    function addItems() {
      parsed.forEach(function (slide) {
        var item = document.createElement("span");
        item.className = "ab-message";
        
        var iconHtml = getIconHtml(slide);
        var textToShow = slide.text;
        if (slide.discountCodeEnabled && slide.discountCode) {
          if (slide.discountPlaceInText) {
            textToShow = textToShow.replace("{discount_code}", slide.discountCode);
          } else {
            textToShow += " [🎟️ " + slide.discountCode + "]";
          }
        }
        item.innerHTML = iconHtml + textToShow;
        track.appendChild(item);
      });
    }
    
    addItems();
    addItems(); // duplicate for seamless scrolling marquee

    slidesContainer.appendChild(track);
    inner.appendChild(slidesContainer);

    if (a.showCloseButton) {
      var close = document.createElement("button");
      close.className = "ab-close";
      close.type = "button";
      close.setAttribute("aria-label", "Dismiss");
      close.innerHTML = "&times;";
      close.addEventListener("click", function () {
        dismiss(a.id);
        bar.remove();
      });
      inner.appendChild(close);
    }

    bar.appendChild(inner);
    return bar;
  }

  Promise.all([fetchBars(), fetchCart()]).then(function (results) {
    var data = results[0];
    var cart = results[1];
    var announcements = (data.announcements || []).filter(function (a) {
      return !isDismissed(a.id);
    });
    if (!announcements.length) return;

    var fragment = document.createDocumentFragment();

    announcements.forEach(function (a) {
      var barType = a.barType || "simple";
      if (barType === "multiple-slides") {
        fragment.appendChild(buildCarouselBar(a, cart, currencySymbol));
      } else if (barType === "running-line") {
        fragment.appendChild(buildScrollBar(a, cart, currencySymbol));
      } else {
        fragment.appendChild(buildStaticBar(a, cart, currencySymbol));
      }
    });

    if (blockPosition === "bottom") {
      root.appendChild(fragment);
    } else {
      root.insertBefore(fragment, root.firstChild);
    }
  });
})();