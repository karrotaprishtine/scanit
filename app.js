(function () {
  "use strict";

  const STORAGE_KEY = "barcode-qr-studio-state-v1";

  const EAN13_PARITY = [
    "LLLLLL",
    "LLGLGG",
    "LLGGLG",
    "LLGGGL",
    "LGLLGG",
    "LGGLLG",
    "LGGGLL",
    "LGLGLG",
    "LGLGGL",
    "LGGLGL",
  ];

  const EAN13_PATTERNS = {
    L: {
      0: "0001101",
      1: "0011001",
      2: "0010011",
      3: "0111101",
      4: "0100011",
      5: "0110001",
      6: "0101111",
      7: "0111011",
      8: "0110111",
      9: "0001011",
    },
    G: {
      0: "0100111",
      1: "0110011",
      2: "0011011",
      3: "0100001",
      4: "0011101",
      5: "0111001",
      6: "0000101",
      7: "0010001",
      8: "0001001",
      9: "0010111",
    },
    R: {
      0: "1110010",
      1: "1100110",
      2: "1101100",
      3: "1000010",
      4: "1011100",
      5: "1001110",
      6: "1010000",
      7: "1000100",
      8: "1001000",
      9: "1110100",
    },
  };

  const QR_TYPES = [
    {
      id: "website",
      label: "Website",
      short: "WEB",
      description: "Link to any page on the web.",
      fields: [
        {
          key: "url",
          label: "Website URL",
          type: "url",
          required: true,
          placeholder: "https://example.com",
          hint: "A direct website link opens fastest on a phone.",
          defaultValue: "https://example.com",
        },
      ],
      build(values) {
        return normalizeHttpUrl(values.url);
      },
    },
    {
      id: "vcard",
      label: "vCard",
      short: "VC",
      description: "Share contact details.",
      fields: [
        { key: "firstName", label: "First name", type: "text", required: true, defaultValue: "Anna" },
        { key: "lastName", label: "Last name", type: "text", required: true, defaultValue: "Kovacs" },
        { key: "mobile", label: "Mobile number", type: "tel", defaultValue: "+36123456789" },
        { key: "email", label: "Email", type: "email", defaultValue: "anna@example.com" },
        { key: "company", label: "Company", type: "text", defaultValue: "Northline Trade" },
        { key: "title", label: "Job title", type: "text", defaultValue: "Sales Director" },
        { key: "website", label: "Website", type: "url", defaultValue: "https://example.com" },
      ],
      build(values) {
        return buildVCard(values, false);
      },
    },
    {
      id: "email",
      label: "Email",
      short: "MAIL",
      description: "Prepare an email with subject and body.",
      fields: [
        { key: "email", label: "Email address", type: "email", required: true, defaultValue: "hello@example.com" },
        { key: "subject", label: "Subject", type: "text", defaultValue: "Information request" },
        {
          key: "body",
          label: "Message body",
          type: "textarea",
          defaultValue: "Hello,%0D%0AI would like more information.",
          transformDefault: decodeURIComponent,
        },
      ],
      build(values) {
        return buildMailto(values);
      },
    },
    {
      id: "sms",
      label: "SMS",
      short: "SMS",
      description: "Open a text message with a recipient.",
      fields: [
        { key: "phone", label: "Phone number", type: "tel", required: true, defaultValue: "+36123456789" },
        { key: "message", label: "Message", type: "textarea", defaultValue: "Hello, I would like to place an order." },
      ],
      build(values) {
        return buildSms(values);
      },
    },
    {
      id: "text",
      label: "Text",
      short: "TXT",
      description: "Display a short message.",
      fields: [
        {
          key: "message",
          label: "Text message",
          type: "textarea",
          required: true,
          defaultValue: "Warehouse intake completed for shipment 2026-04-29.",
        },
      ],
      build(values) {
        return normalizeLineEndings(values.message).trim();
      },
    },
    {
      id: "wifi",
      label: "WiFi",
      short: "WIFI",
      description: "Connect a device to a WiFi network.",
      fields: [
        { key: "ssid", label: "Network name (SSID)", type: "text", required: true, defaultValue: "OfficeNet-5G" },
        {
          key: "security",
          label: "Security type",
          type: "select",
          required: true,
          defaultValue: "WPA",
          options: [
            { value: "WPA", label: "WPA / WPA2 / WPA3" },
            { value: "WEP", label: "WEP" },
            { value: "nopass", label: "No password" },
          ],
        },
        { key: "password", label: "Password", type: "text", defaultValue: "VerySecurePass123" },
        { key: "hidden", label: "Hidden network", type: "checkbox", defaultValue: false },
      ],
      build(values) {
        return buildWifi(values);
      },
    },
    {
      id: "vcardPlus",
      label: "vCard Plus",
      short: "VC+",
      description: "Extended contact details for richer business cards.",
      fields: [
        { key: "firstName", label: "First name", type: "text", required: true, defaultValue: "Peter" },
        { key: "lastName", label: "Last name", type: "text", required: true, defaultValue: "Nagy" },
        { key: "company", label: "Company", type: "text", defaultValue: "Danube Logistics" },
        { key: "title", label: "Title", type: "text", defaultValue: "Operations Manager" },
        { key: "mobile", label: "Mobile number", type: "tel", defaultValue: "+36201234567" },
        { key: "workPhone", label: "Work phone", type: "tel", defaultValue: "+3615550000" },
        { key: "email", label: "Email", type: "email", defaultValue: "peter.nagy@example.com" },
        { key: "website", label: "Website", type: "url", defaultValue: "https://example.com" },
        { key: "address", label: "Street address", type: "text", defaultValue: "12 River Park Road" },
        { key: "city", label: "City", type: "text", defaultValue: "Budapest" },
        { key: "zip", label: "ZIP / postal code", type: "text", defaultValue: "1054" },
        { key: "country", label: "Country", type: "text", defaultValue: "Hungary" },
        { key: "birthday", label: "Birthday", type: "date", defaultValue: "1988-09-21" },
        { key: "notes", label: "Notes", type: "textarea", defaultValue: "Available Monday to Friday, 08:00-18:00." },
      ],
      build(values) {
        return buildVCard(values, true);
      },
    },
    {
      id: "pdf",
      label: "PDF",
      short: "PDF",
      description: "Link directly to a PDF file.",
      fields: [
        {
          key: "url",
          label: "PDF URL",
          type: "url",
          required: true,
          defaultValue: "https://example.com/catalogue.pdf",
        },
      ],
      build(values) {
        return normalizeHttpUrl(values.url);
      },
    },
    {
      id: "socialMedia",
      label: "Social Media",
      short: "SOC",
      description: "Share a compact list of social links.",
      fields: [
        { key: "website", label: "Website", type: "url", defaultValue: "https://example.com" },
        { key: "instagram", label: "Instagram", type: "url", defaultValue: "https://instagram.com/example" },
        { key: "facebook", label: "Facebook", type: "url", defaultValue: "https://facebook.com/example" },
        { key: "x", label: "X / Twitter", type: "url", defaultValue: "https://x.com/example" },
        { key: "linkedin", label: "LinkedIn", type: "url", defaultValue: "https://linkedin.com/company/example" },
        { key: "youtube", label: "YouTube", type: "url", defaultValue: "https://youtube.com/@example" },
        { key: "tiktok", label: "TikTok", type: "url", defaultValue: "https://tiktok.com/@example" },
      ],
      validate(values) {
        return atLeastOneFilled(values, ["website", "instagram", "facebook", "x", "linkedin", "youtube", "tiktok"], "Add at least one social link.");
      },
      build(values) {
        return buildLabeledLinks("SOCIAL MEDIA", [
          ["Website", values.website],
          ["Instagram", values.instagram],
          ["Facebook", values.facebook],
          ["X", values.x],
          ["LinkedIn", values.linkedin],
          ["YouTube", values.youtube],
          ["TikTok", values.tiktok],
        ]);
      },
    },
    {
      id: "instagram",
      label: "Instagram",
      short: "IG",
      description: "Open an Instagram profile or business page.",
      fields: [
        { key: "handle", label: "Instagram handle", type: "text", required: true, defaultValue: "@example" },
      ],
      build(values) {
        return buildInstagramUrl(values.handle);
      },
    },
    {
      id: "images",
      label: "Images",
      short: "IMG",
      description: "Share one or more image links.",
      fields: [
        {
          key: "urls",
          label: "Image URLs",
          type: "textarea",
          required: true,
          hint: "One URL per line.",
          defaultValue: "https://example.com/image-01.jpg\nhttps://example.com/image-02.jpg",
        },
      ],
      build(values) {
        return buildMediaList("IMAGES", values.urls);
      },
    },
    {
      id: "app",
      label: "App",
      short: "APP",
      description: "Share links to your app stores and app site.",
      fields: [
        { key: "name", label: "App name", type: "text", required: true, defaultValue: "Warehouse Tracker" },
        { key: "website", label: "Website", type: "url", defaultValue: "https://example.com/app" },
        { key: "iosUrl", label: "iOS App Store URL", type: "url", defaultValue: "https://apps.apple.com/app/id123456789" },
        { key: "androidUrl", label: "Android Play Store URL", type: "url", defaultValue: "https://play.google.com/store/apps/details?id=com.example.app" },
      ],
      validate(values) {
        return atLeastOneFilled(values, ["website", "iosUrl", "androidUrl"], "Add at least one app link.");
      },
      build(values) {
        return buildAppLinks(values);
      },
    },
    {
      id: "businessPage",
      label: "Business Page",
      short: "BIZ",
      description: "Provide company information in one scan.",
      fields: [
        { key: "name", label: "Business name", type: "text", required: true, defaultValue: "Northline Trade Ltd." },
        { key: "website", label: "Website", type: "url", defaultValue: "https://example.com" },
        { key: "phone", label: "Phone", type: "tel", defaultValue: "+3615550000" },
        { key: "email", label: "Email", type: "email", defaultValue: "info@example.com" },
        { key: "address", label: "Address", type: "text", defaultValue: "1054 Budapest, River Park Road 12" },
        { key: "hours", label: "Opening hours", type: "text", defaultValue: "Mon-Fri 08:00-18:00" },
        { key: "notes", label: "Notes", type: "textarea", defaultValue: "Call before arrival for loading slot confirmation." },
      ],
      build(values) {
        return buildBusinessCard(values);
      },
    },
    {
      id: "video",
      label: "Video",
      short: "VID",
      description: "Share one or more video links.",
      fields: [
        {
          key: "urls",
          label: "Video URLs",
          type: "textarea",
          required: true,
          hint: "One URL per line.",
          defaultValue: "https://example.com/video-intro\nhttps://youtube.com/watch?v=dQw4w9WgXcQ",
        },
      ],
      build(values) {
        return buildMediaList("VIDEO", values.urls);
      },
    },
    {
      id: "event",
      label: "Event",
      short: "EVT",
      description: "Create a calendar-style QR for an event.",
      fields: [
        { key: "title", label: "Event title", type: "text", required: true, defaultValue: "Supplier Meeting" },
        { key: "location", label: "Location", type: "text", required: true, defaultValue: "Budapest HQ - Room 4" },
        { key: "start", label: "Start", type: "datetime-local", required: true, defaultValue: "2026-05-14T09:00" },
        { key: "end", label: "End", type: "datetime-local", defaultValue: "2026-05-14T10:30" },
        { key: "description", label: "Description", type: "textarea", defaultValue: "Quarterly operations review and loading forecast." },
        { key: "organizerEmail", label: "Organizer email", type: "email", defaultValue: "events@example.com" },
        { key: "url", label: "Reference URL", type: "url", defaultValue: "https://example.com/events/q2-review" },
      ],
      build(values) {
        return buildCalendarEvent(values);
      },
    },
    {
      id: "barcode2d",
      label: "2D Barcode",
      short: "GS1",
      description: "Create a GS1 Digital Link QR with GTIN and optional traceability fields.",
      fields: [
        { key: "resolverUrl", label: "Resolver URL", type: "url", defaultValue: "https://id.gs1.org" },
        { key: "gtin", label: "GTIN (13 or 14 digits)", type: "text", required: true, defaultValue: "09506000134352" },
        { key: "batch", label: "Batch / lot (AI 10)", type: "text", defaultValue: "BATCH-24A" },
        { key: "serial", label: "Serial (AI 21)", type: "text", defaultValue: "SN-7742" },
        { key: "expiry", label: "Expiry date", type: "date", defaultValue: "2027-02-15" },
      ],
      build(values) {
        return buildGs1DigitalLink(values);
      },
    },
    {
      id: "facebook",
      label: "Facebook",
      short: "FB",
      description: "Link to a Facebook page.",
      fields: [
        { key: "url", label: "Facebook URL", type: "url", required: true, defaultValue: "https://facebook.com/example" },
      ],
      build(values) {
        return normalizeHttpUrl(values.url);
      },
    },
    {
      id: "mp3",
      label: "MP3",
      short: "MP3",
      description: "Link to an audio file.",
      fields: [
        { key: "url", label: "MP3 URL", type: "url", required: true, defaultValue: "https://example.com/audio/intro.mp3" },
      ],
      build(values) {
        return normalizeHttpUrl(values.url);
      },
    },
    {
      id: "coupons",
      label: "Coupons",
      short: "OFF",
      description: "Share a coupon, code, and landing link.",
      fields: [
        { key: "businessName", label: "Business name", type: "text", defaultValue: "Northline Trade" },
        { key: "offerTitle", label: "Offer title", type: "text", required: true, defaultValue: "Spring discount" },
        { key: "couponCode", label: "Coupon code", type: "text", defaultValue: "SPRING15" },
        { key: "discount", label: "Discount", type: "text", defaultValue: "15% off" },
        { key: "validUntil", label: "Valid until", type: "date", defaultValue: "2026-06-30" },
        { key: "url", label: "Landing URL", type: "url", defaultValue: "https://example.com/coupons/spring15" },
      ],
      build(values) {
        return buildCouponPayload(values);
      },
    },
    {
      id: "feedback",
      label: "Feedback",
      short: "FBK",
      description: "Collect written feedback through a link or contact route.",
      fields: [
        { key: "businessName", label: "Business name", type: "text", defaultValue: "Northline Trade" },
        { key: "url", label: "Feedback form URL", type: "url", required: true, defaultValue: "https://example.com/feedback" },
        { key: "prompt", label: "Prompt text", type: "textarea", defaultValue: "Tell us what worked well and what we should improve." },
        { key: "email", label: "Fallback email", type: "email", defaultValue: "feedback@example.com" },
      ],
      build(values) {
        return buildFeedbackPayload(values);
      },
    },
    {
      id: "rating",
      label: "Rating",
      short: "RATE",
      description: "Ask customers to leave a rating or review.",
      fields: [
        { key: "businessName", label: "Business name", type: "text", defaultValue: "Northline Trade" },
        { key: "url", label: "Rating URL", type: "url", required: true, defaultValue: "https://example.com/review" },
        { key: "platform", label: "Platform", type: "text", defaultValue: "Google Reviews" },
        { key: "message", label: "Message", type: "textarea", defaultValue: "If we helped you today, please leave a quick rating." },
      ],
      build(values) {
        return buildRatingPayload(values);
      },
    },
  ];

  const qrTypeMap = Object.fromEntries(QR_TYPES.map((type) => [type.id, type]));
  const BARCODE_FONT_FAMILY = "Arial";
  const BARCODE_INK = "#111111";
  const BARCODE_FONT_SUGGESTIONS = [
    "OCR B Std",
    "OCR-B",
    "Arial",
    "Helvetica",
    "Trebuchet MS",
    "Tahoma",
    "Verdana",
    "Segoe UI",
    "Calibri",
    "Cambria",
    "Georgia",
    "Times New Roman",
    "Courier New",
    "Consolas",
    "Franklin Gothic Medium",
    "Palatino Linotype",
    "Century Gothic",
    "Lucida Sans Unicode",
  ];
  const WEB_FONT_MANIFEST_PATH = "./fonts/manifest.json";
  const QR_QUICK_PICKS = ["website", "vcard", "email", "sms", "wifi", "instagram"];
  const QR_SHAPE_OPTIONS = [
    { id: "square", label: "Square", note: "Classic" },
    { id: "rounded", label: "Rounded", note: "Soft edges" },
    { id: "dots", label: "Dots", note: "Dot matrix" },
    { id: "soft", label: "Soft block", note: "Modern" },
  ];
  const QR_CORNER_OPTIONS = [
    { id: "square", label: "Square", note: "Standard eye" },
    { id: "rounded", label: "Rounded", note: "Soft eye" },
    { id: "circle", label: "Circle", note: "Circular eye" },
    { id: "soft", label: "Soft square", note: "Rounded ring" },
  ];
  const QR_FRAME_OPTIONS = [
    { id: "none", label: "None", note: "No frame" },
    { id: "scan-bottom", label: "Bottom tag", note: "Scan me" },
    { id: "scan-top-bottom", label: "Top + bottom", note: "Labeled" },
    { id: "ticket", label: "Ticket", note: "Boxed" },
    { id: "badge", label: "Badge", note: "Pill style" },
  ];
  const QR_LOGO_OPTIONS = [
    { id: "none", label: "None", note: "Maximum scan area" },
    { id: "globe", label: "Globe", note: "Web" },
    { id: "scan", label: "Scan", note: "Center mark" },
    { id: "focus", label: "Focus", note: "Target" },
    { id: "type", label: "Type", note: "Template code" },
  ];
  const QR_FINDER_ZONES = [
    { row: 0, column: 0 },
    { row: 0, column: -1 },
    { row: -1, column: 0 },
  ];
  const qrShapeOptionMap = mapOptionsById(QR_SHAPE_OPTIONS);
  const qrCornerOptionMap = mapOptionsById(QR_CORNER_OPTIONS);
  const qrFrameOptionMap = mapOptionsById(QR_FRAME_OPTIONS);
  const qrLogoOptionMap = mapOptionsById(QR_LOGO_OPTIONS);
  const HERO_MOODS = [
    {
      label: "Scan mood",
      title: "Tap it. Scan it. Smile a little.",
      description: "Make QR codes first, keep barcodes ready, and export clean files without the noise.",
    },
    {
      label: "Happy pixels",
      title: "Tiny squares, big magic.",
      description: "Drop in a link, WiFi, contact card, or text and let the code do the talking.",
    },
    {
      label: "Camera bait",
      title: "Point here for good energy.",
      description: "Quick QR work up front, clean EAN-13 beside it, and smooth exports when you are done.",
    },
    {
      label: "Code confetti",
      title: "One clean scan at a time.",
      description: "Build it fast, style it softly, and keep the page fresh every time you open it.",
    },
    {
      label: "Fresh square club",
      title: "Scan now, stress less.",
      description: "Open straight into QR mode and keep barcode tools one click away whenever you need them.",
    },
  ];

  const refs = {
    heroBarcodeButton: document.getElementById("heroBarcodeButton"),
    heroQrButton: document.getElementById("heroQrButton"),
    heroShuffleButton: document.getElementById("heroShuffleButton"),
    heroLabel: document.getElementById("heroLabel"),
    heroTitle: document.getElementById("heroTitle"),
    heroDescription: document.getElementById("heroDescription"),
    themeToggleButton: document.getElementById("themeToggleButton"),
    themeToggleLabel: document.getElementById("themeToggleLabel"),
    barcodePanel: document.getElementById("barcodePanel"),
    qrPanel: document.getElementById("qrPanel"),
    barcodeModeButton: document.getElementById("barcodeModeButton"),
    qrModeButton: document.getElementById("qrModeButton"),
    barcodeForm: document.getElementById("barcodeForm"),
    qrForm: document.getElementById("qrForm"),
    barcodeDigits: document.getElementById("barcodeDigits"),
    barcodeLabel: document.getElementById("barcodeLabel"),
    barcodeModuleWidth: document.getElementById("barcodeModuleWidth"),
    barcodeHeight: document.getElementById("barcodeHeight"),
    barcodeQuietZone: document.getElementById("barcodeQuietZone"),
    barcodeTextSize: document.getElementById("barcodeTextSize"),
    barcodeFontFamily: document.getElementById("barcodeFontFamily"),
    barcodeFontFamilyList: document.getElementById("barcodeFontFamilyList"),
    barcodeFontWeight: document.getElementById("barcodeFontWeight"),
    loadInstalledFontsButton: document.getElementById("loadInstalledFontsButton"),
    barcodeFontAccessStatus: document.getElementById("barcodeFontAccessStatus"),
    barcodeStatusStrip: document.getElementById("barcodeStatusStrip"),
    barcodeExampleButton: document.getElementById("barcodeExampleButton"),
    barcodeResetButton: document.getElementById("barcodeResetButton"),
    qrTypeSelect: document.getElementById("qrTypeSelect"),
    qrQuickPicks: document.getElementById("qrQuickPicks"),
    qrTypeGrid: document.getElementById("qrTypeGrid"),
    qrFormTitle: document.getElementById("qrFormTitle"),
    qrFormDescription: document.getElementById("qrFormDescription"),
    qrDynamicFields: document.getElementById("qrDynamicFields"),
    qrStatusStrip: document.getElementById("qrStatusStrip"),
    qrShapeGrid: document.getElementById("qrShapeGrid"),
    qrCornerGrid: document.getElementById("qrCornerGrid"),
    qrFrameGrid: document.getElementById("qrFrameGrid"),
    qrLogoGrid: document.getElementById("qrLogoGrid"),
    qrCornerColorMode: document.getElementById("qrCornerColorMode"),
    qrCornerColor: document.getElementById("qrCornerColor"),
    qrBackgroundColor: document.getElementById("qrBackgroundColor"),
    qrErrorCorrection: document.getElementById("qrErrorCorrection"),
    qrCellSize: document.getElementById("qrCellSize"),
    qrMargin: document.getElementById("qrMargin"),
    qrDarkColor: document.getElementById("qrDarkColor"),
    qrExampleButton: document.getElementById("qrExampleButton"),
    qrResetButton: document.getElementById("qrResetButton"),
    previewCanvas: document.getElementById("previewCanvas"),
    previewTitle: document.getElementById("previewTitle"),
    previewBadge: document.getElementById("previewBadge"),
    downloadSvgButton: document.getElementById("downloadSvgButton"),
    downloadPdfButton: document.getElementById("downloadPdfButton"),
    downloadPngButton: document.getElementById("downloadPngButton"),
    copyPayloadButton: document.getElementById("copyPayloadButton"),
    payloadText: document.getElementById("payloadText"),
    summaryList: document.getElementById("summaryList"),
    runSelfCheckButton: document.getElementById("runSelfCheckButton"),
    selfCheckStatus: document.getElementById("selfCheckStatus"),
  };

  let state = loadState();
  let heroMoodIndex = 0;
  const outputs = {
    barcode: null,
    qr: null,
  };
  let packagedFontFamilies = [];
  let installedFontFamilies = [];
  let installedFontsLoaded = false;
  let installedFontsLoading = false;

  init();

  function init() {
    if (typeof window.qrcode !== "function") {
      renderFatalError("The offline QR engine could not be loaded. Keep the HTML file and the vendor folder together.");
      return;
    }

    initializeHeroMood();
    applyTheme();
    renderQrTypeSelectors();
    renderQrTypeGrid();
    renderQrDesignControls();
    hydrateStaticForms();
    renderQrDynamicFields();
    bindEvents();
    updateModeUI();
    updateBarcodeStatus();
    updateSelfCheckAvailability();
    generateBarcode(false);
    generateQr(false);
    renderCurrentModeOutput();
    primeBarcodeFontSources();
  }

  function bindEvents() {
    refs.barcodeModeButton.addEventListener("click", () => {
      activateMode("barcode");
    });

    refs.qrModeButton.addEventListener("click", () => {
      activateMode("qr");
    });

    refs.heroBarcodeButton.addEventListener("click", (event) => {
      blurTriggerButton(event);
      activateMode("barcode", true);
    });

    refs.heroQrButton.addEventListener("click", (event) => {
      blurTriggerButton(event);
      activateMode("qr", true);
    });

    refs.heroShuffleButton.addEventListener("click", () => {
      cycleHeroMood();
    });

    refs.themeToggleButton.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      persistState();
      applyTheme();
    });

    refs.barcodeDigits.addEventListener("input", () => {
      refs.barcodeDigits.value = onlyDigits(refs.barcodeDigits.value).slice(0, 13);
      state.barcode.digits = refs.barcodeDigits.value;
      persistState();
      updateBarcodeStatus();
    });

    refs.barcodeLabel.addEventListener("input", () => {
      state.barcode.label = refs.barcodeLabel.value;
      persistState();
    });

    refs.barcodeModuleWidth.addEventListener("input", syncBarcodeSettingsFromForm);
    refs.barcodeHeight.addEventListener("input", syncBarcodeSettingsFromForm);
    refs.barcodeQuietZone.addEventListener("input", syncBarcodeSettingsFromForm);
    refs.barcodeTextSize.addEventListener("input", syncBarcodeSettingsFromForm);
    refs.barcodeFontFamily.addEventListener("input", syncBarcodeSettingsFromForm);
    refs.barcodeFontWeight.addEventListener("input", syncBarcodeSettingsFromForm);
    refs.loadInstalledFontsButton.addEventListener("click", async (event) => {
      blurTriggerButton(event);
      await loadInstalledBarcodeFonts(true);
    });

    refs.barcodeForm.addEventListener("submit", (event) => {
      event.preventDefault();
      generateBarcode(true);
      state.activeMode = "barcode";
      persistState();
      updateModeUI();
      renderCurrentModeOutput();
    });

    refs.barcodeExampleButton.addEventListener("click", () => {
      state.barcode = createDefaultState().barcode;
      hydrateStaticForms();
      updateBarcodeStatus();
      generateBarcode(true);
      persistState();
    });

    refs.barcodeResetButton.addEventListener("click", () => {
      state.barcode = createDefaultState().barcode;
      hydrateStaticForms();
      updateBarcodeStatus();
      persistState();
      generateBarcode(false);
      if (state.activeMode === "barcode") {
        renderCurrentModeOutput();
      }
    });

    refs.qrTypeSelect.addEventListener("change", () => {
      selectQrType(refs.qrTypeSelect.value);
    });

    refs.qrQuickPicks.addEventListener("click", (event) => {
      const button = event.target.closest("[data-qr-type]");
      if (!button) {
        return;
      }
      selectQrType(button.dataset.qrType);
    });

    refs.qrTypeGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-qr-type]");
      if (!button) {
        return;
      }
      selectQrType(button.dataset.qrType);
    });

    refs.qrDynamicFields.addEventListener("input", handleDynamicQrFieldChange);
    refs.qrDynamicFields.addEventListener("change", handleDynamicQrFieldChange);

    refs.qrShapeGrid.addEventListener("click", (event) => {
      handleDesignOptionClick(event, "shape", qrShapeOptionMap);
    });
    refs.qrCornerGrid.addEventListener("click", (event) => {
      handleDesignOptionClick(event, "corner", qrCornerOptionMap);
    });
    refs.qrFrameGrid.addEventListener("click", (event) => {
      handleDesignOptionClick(event, "frame", qrFrameOptionMap);
    });
    refs.qrLogoGrid.addEventListener("click", (event) => {
      handleDesignOptionClick(event, "logo", qrLogoOptionMap);
    });

    refs.qrCornerColorMode.addEventListener("input", handleQrStyleInput);
    refs.qrCornerColor.addEventListener("input", handleQrStyleInput);
    refs.qrBackgroundColor.addEventListener("input", handleQrStyleInput);
    refs.qrErrorCorrection.addEventListener("input", handleQrStyleInput);
    refs.qrCellSize.addEventListener("input", handleQrStyleInput);
    refs.qrMargin.addEventListener("input", handleQrStyleInput);
    refs.qrDarkColor.addEventListener("input", handleQrStyleInput);

    refs.qrForm.addEventListener("submit", (event) => {
      event.preventDefault();
      generateQr(true);
      state.activeMode = "qr";
      persistState();
      updateModeUI();
      renderCurrentModeOutput();
    });

    refs.qrExampleButton.addEventListener("click", () => {
      state.qr.values[state.qr.type] = clone(getDefaultValuesForType(state.qr.type));
      state.qr.style = clone(createDefaultState().qr.style);
      hydrateStaticForms();
      renderQrDynamicFields();
      persistState();
      generateQr(true);
    });

    refs.qrResetButton.addEventListener("click", () => {
      state.qr.values[state.qr.type] = clone(getDefaultValuesForType(state.qr.type));
      state.qr.style = clone(createDefaultState().qr.style);
      hydrateStaticForms();
      renderQrDynamicFields();
      persistState();
      generateQr(false);
      if (state.activeMode === "qr") {
        renderCurrentModeOutput();
      }
    });

    refs.downloadSvgButton.addEventListener("click", () => {
      if (outputs[state.activeMode]) {
        downloadSvg(outputs[state.activeMode]);
      }
    });

    refs.downloadPdfButton.addEventListener("click", () => {
      if (outputs[state.activeMode]) {
        downloadPdf(outputs[state.activeMode]);
      }
    });

    refs.downloadPngButton.addEventListener("click", async () => {
      if (outputs[state.activeMode]) {
        await downloadPng(outputs[state.activeMode]);
      }
    });

    refs.copyPayloadButton.addEventListener("click", async () => {
      if (!outputs[state.activeMode]) {
        return;
      }

      const ok = await copyText(outputs[state.activeMode].payload);
      if (ok) {
        refs.copyPayloadButton.textContent = "Copied";
        window.setTimeout(() => {
          refs.copyPayloadButton.textContent = "Copy payload";
        }, 1200);
      }
    });

    refs.runSelfCheckButton.addEventListener("click", runSelfCheck);
  }

  function hydrateStaticForms() {
    refs.barcodeDigits.value = state.barcode.digits;
    refs.barcodeLabel.value = state.barcode.label;
    refs.barcodeModuleWidth.value = state.barcode.moduleWidth;
    refs.barcodeHeight.value = state.barcode.barHeight;
    refs.barcodeQuietZone.value = state.barcode.quietZone;
    refs.barcodeTextSize.value = state.barcode.textSize;
    refs.barcodeFontFamily.value = state.barcode.fontFamily;
    refs.barcodeFontWeight.value = state.barcode.fontWeight;
    refs.qrTypeSelect.value = state.qr.type;
    refs.qrCornerColorMode.value = state.qr.style.cornerColorMode;
    refs.qrCornerColor.value = state.qr.style.cornerColor;
    refs.qrBackgroundColor.value = state.qr.style.backgroundColor;
    refs.qrErrorCorrection.value = state.qr.style.ecc;
    refs.qrCellSize.value = state.qr.style.cellSize;
    refs.qrMargin.value = state.qr.style.margin;
    refs.qrDarkColor.value = state.qr.style.darkColor;
    updateCornerColorControl();
    renderQrTypeSelectors();
    renderQrTypeGrid();
    renderQrDesignControls();
  }

  function renderQrTypeSelectors() {
    refs.qrTypeSelect.innerHTML = QR_TYPES.map((type) => {
      const selected = type.id === state.qr.type ? "selected" : "";
      return `<option value="${escapeHtml(type.id)}" ${selected}>${escapeHtml(type.label)}</option>`;
    }).join("");

    refs.qrQuickPicks.innerHTML = QR_QUICK_PICKS
      .map((typeId) => qrTypeMap[typeId])
      .filter(Boolean)
      .map((type) => {
        const activeClass = type.id === state.qr.type ? " active" : "";
        return `
          <button class="quick-pick-pill${activeClass}" type="button" data-qr-type="${type.id}">
            <span class="quick-pick-pill-code">${escapeHtml(type.short)}</span>
            <span>${escapeHtml(type.label)}</span>
          </button>
        `;
      }).join("");
  }

  function renderQrTypeGrid() {
    refs.qrTypeGrid.innerHTML = QR_TYPES.map((type) => {
      const activeClass = type.id === state.qr.type ? " active" : "";
      return `
        <button class="qr-type-card${activeClass}" type="button" data-qr-type="${type.id}" role="listitem">
          <span class="qr-type-icon" aria-hidden="true">${escapeHtml(type.short)}</span>
          <strong>${escapeHtml(type.label)}</strong>
          <p>${escapeHtml(type.description)}</p>
        </button>
      `;
    }).join("");
  }

  function renderQrDesignControls() {
    refs.qrShapeGrid.innerHTML = renderDesignButtonMarkup(QR_SHAPE_OPTIONS, state.qr.style.shape, "shape", renderShapePreview);
    refs.qrCornerGrid.innerHTML = renderDesignButtonMarkup(QR_CORNER_OPTIONS, state.qr.style.corner, "corner", renderCornerPreview);
    refs.qrFrameGrid.innerHTML = renderDesignButtonMarkup(QR_FRAME_OPTIONS, state.qr.style.frame, "frame", renderFramePreview);
    refs.qrLogoGrid.innerHTML = renderDesignButtonMarkup(QR_LOGO_OPTIONS, state.qr.style.logo, "logo", renderLogoPreview);
  }

  function renderQrDynamicFields() {
    const type = qrTypeMap[state.qr.type];
    refs.qrFormTitle.textContent = `${type.label} QR setup`;
    refs.qrFormDescription.textContent = type.description;

    const values = state.qr.values[type.id];

    refs.qrDynamicFields.innerHTML = type.fields.map((field) => {
      const value = values[field.key];
      const required = field.required ? "required" : "";
      const hint = field.hint ? `<small class="field-hint">${escapeHtml(field.hint)}</small>` : "";
      const name = `qr-${type.id}-${field.key}`;
      const common = `id="${name}" name="${field.key}" data-qr-field="${field.key}" ${required}`;

      const fieldClass = field.type === "textarea" || type.fields.length === 1 ? "field field-span-2" : "field";

      if (field.type === "textarea") {
        return `
          <label class="${fieldClass}">
            <span>${escapeHtml(field.label)}</span>
            <textarea ${common} placeholder="${escapeHtml(field.placeholder || "")}">${escapeHtml(value || "")}</textarea>
            ${hint}
          </label>
        `;
      }

      if (field.type === "select") {
        const options = field.options.map((option) => {
          const selected = option.value === value ? "selected" : "";
          return `<option value="${escapeHtml(option.value)}" ${selected}>${escapeHtml(option.label)}</option>`;
        }).join("");
        return `
          <label class="${fieldClass}">
            <span>${escapeHtml(field.label)}</span>
            <select ${common}>${options}</select>
            ${hint}
          </label>
        `;
      }

      if (field.type === "checkbox") {
        return `
          <label class="${fieldClass}">
            <span>${escapeHtml(field.label)}</span>
            <select ${common}>
              <option value="false" ${value ? "" : "selected"}>No</option>
              <option value="true" ${value ? "selected" : ""}>Yes</option>
            </select>
            ${hint || '<small class="field-hint">Use "Yes" only for hidden SSIDs.</small>'}
          </label>
        `;
      }

      const inputType = field.type === "url" ? "text" : (field.type || "text");
      const inputMode = field.type === "url" ? 'inputmode="url" spellcheck="false"' : "";
      return `
        <label class="${fieldClass}">
          <span>${escapeHtml(field.label)}</span>
          <input
            ${common}
            type="${escapeHtml(inputType)}"
            value="${escapeHtml(value || "")}"
            placeholder="${escapeHtml(field.placeholder || "")}"
            autocomplete="off"
            ${inputMode}
          >
          ${hint}
        </label>
      `;
    }).join("");
  }

  function handleDynamicQrFieldChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches("[data-qr-field]")) {
      return;
    }

    const key = target.getAttribute("data-qr-field");
    const typeId = state.qr.type;
    if (!key) {
      return;
    }

    state.qr.values[typeId][key] = readFieldValue(target);
    persistState();
    generateQr(false);
  }

  function syncBarcodeSettingsFromForm() {
    state.barcode.moduleWidth = clampNumber(refs.barcodeModuleWidth.value, 1, 10, 3);
    state.barcode.barHeight = clampNumber(refs.barcodeHeight.value, 60, 280, 132);
    state.barcode.quietZone = clampNumber(refs.barcodeQuietZone.value, 8, 32, 11);
    state.barcode.textSize = clampNumber(refs.barcodeTextSize.value, 14, 56, 28);
    state.barcode.fontFamily = safeTrim(refs.barcodeFontFamily.value).slice(0, 120) || BARCODE_FONT_FAMILY;
    state.barcode.fontWeight = clampNumber(refs.barcodeFontWeight.value, 400, 800, 400);
    refs.barcodeModuleWidth.value = state.barcode.moduleWidth;
    refs.barcodeHeight.value = state.barcode.barHeight;
    refs.barcodeQuietZone.value = state.barcode.quietZone;
    refs.barcodeTextSize.value = state.barcode.textSize;
    refs.barcodeFontFamily.value = state.barcode.fontFamily;
    refs.barcodeFontWeight.value = state.barcode.fontWeight;
    persistState();
  }

  function syncQrStyleFromForm() {
    state.qr.style.ecc = refs.qrErrorCorrection.value;
    state.qr.style.shape = pickOptionId(QR_SHAPE_OPTIONS, state.qr.style.shape);
    state.qr.style.corner = pickOptionId(QR_CORNER_OPTIONS, state.qr.style.corner);
    state.qr.style.frame = pickOptionId(QR_FRAME_OPTIONS, state.qr.style.frame);
    state.qr.style.logo = pickOptionId(QR_LOGO_OPTIONS, state.qr.style.logo);
    state.qr.style.cornerColorMode = refs.qrCornerColorMode.value === "custom" ? "custom" : "main";
    state.qr.style.cornerColor = normalizeHexColor(refs.qrCornerColor.value, "#14213d");
    state.qr.style.backgroundColor = normalizeHexColor(refs.qrBackgroundColor.value, "#ffffff");
    state.qr.style.cellSize = clampNumber(refs.qrCellSize.value, 3, 16, 8);
    state.qr.style.margin = clampNumber(refs.qrMargin.value, 4, 64, 24);
    state.qr.style.darkColor = normalizeHexColor(refs.qrDarkColor.value, "#14213d");
    refs.qrCellSize.value = state.qr.style.cellSize;
    refs.qrMargin.value = state.qr.style.margin;
    refs.qrCornerColor.value = state.qr.style.cornerColor;
    refs.qrBackgroundColor.value = state.qr.style.backgroundColor;
    refs.qrDarkColor.value = state.qr.style.darkColor;
    updateCornerColorControl();
    renderQrDesignControls();
    persistState();
  }

  function updateModeUI() {
    const isBarcode = state.activeMode === "barcode";
    refs.barcodePanel.classList.toggle("active", isBarcode);
    refs.qrPanel.classList.toggle("active", !isBarcode);
    refs.barcodeModeButton.classList.toggle("active", isBarcode);
    refs.qrModeButton.classList.toggle("active", !isBarcode);
  }

  function activateMode(mode, scrollIntoView) {
    state.activeMode = mode === "qr" ? "qr" : "barcode";
    persistState();
    updateModeUI();
    renderCurrentModeOutput();
    if (state.activeMode === "barcode") {
      primeInstalledFontsIfPossible();
    }
    if (scrollIntoView) {
      document.querySelector(".workspace")?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }

  function applyTheme() {
    const theme = state.theme === "dark" ? "dark" : "light";
    document.body.setAttribute("data-theme", theme);
    refs.themeToggleButton.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    refs.themeToggleLabel.textContent = theme === "dark" ? "Light mode" : "Dark mode";
  }

  function initializeHeroMood() {
    heroMoodIndex = Math.floor(Math.random() * HERO_MOODS.length);
    applyHeroMood();
  }

  function cycleHeroMood() {
    if (HERO_MOODS.length < 2) {
      applyHeroMood();
      return;
    }

    const nextIndex = heroMoodIndex + 1 + Math.floor(Math.random() * (HERO_MOODS.length - 1));
    heroMoodIndex = nextIndex % HERO_MOODS.length;
    applyHeroMood();
  }

  function blurTriggerButton(event) {
    if (event && event.currentTarget instanceof HTMLElement) {
      event.currentTarget.blur();
    }
  }

  function applyHeroMood() {
    const mood = HERO_MOODS[heroMoodIndex] || HERO_MOODS[0];
    refs.heroLabel.textContent = mood.label;
    refs.heroTitle.textContent = mood.title;
    refs.heroDescription.textContent = mood.description;
  }

  function updateBarcodeStatus() {
    const analysis = analyzeEAN13(refs.barcodeDigits.value);

    if (analysis.empty) {
      setStatusStrip(refs.barcodeStatusStrip, "Waiting for digits.", "neutral");
      refs.barcodeDigits.setCustomValidity("");
      return;
    }

    if (!analysis.valid) {
      setStatusStrip(refs.barcodeStatusStrip, analysis.message, "invalid");
      refs.barcodeDigits.setCustomValidity(analysis.message);
      return;
    }

    refs.barcodeDigits.setCustomValidity("");
    if (analysis.wasAutoCompleted) {
      setStatusStrip(refs.barcodeStatusStrip, `Valid EAN-13. Check digit auto-completed to ${analysis.checkDigit}. Final code: ${analysis.normalized}`, "valid");
      return;
    }

    setStatusStrip(refs.barcodeStatusStrip, `Valid EAN-13 confirmed. Check digit ${analysis.checkDigit} matches.`, "valid");
  }

  function generateBarcode(reportIssues) {
    syncBarcodeSettingsFromForm();
    updateBarcodeStatus();

    const analysis = analyzeEAN13(refs.barcodeDigits.value);
    if (!analysis.valid) {
      if (reportIssues) {
        refs.barcodeDigits.reportValidity();
      }
      return null;
    }

    refs.barcodeDigits.value = analysis.normalized;
    state.barcode.digits = analysis.normalized;

    const svgResult = createEAN13Svg(analysis.normalized, {
      moduleWidth: state.barcode.moduleWidth,
      barHeight: state.barcode.barHeight,
      quietZone: state.barcode.quietZone,
      textSize: state.barcode.textSize,
      fontFamily: resolveBarcodeFontFamily(),
      fontWeight: state.barcode.fontWeight,
    });

    outputs.barcode = {
      mode: "barcode",
      badge: "EAN-13 Ready",
      previewTitle: `EAN-13 barcode for ${analysis.normalized}`,
      payload: analysis.normalized,
      svg: svgResult.svg,
      model: svgResult.model,
      width: svgResult.width,
      height: svgResult.height,
      fileBase: slugify(state.barcode.label || `ean13-${analysis.normalized}`),
      summaryRows: [
        ["Type", "EAN-13"],
        ["Digits", analysis.normalized],
        ["Check digit", analysis.checkDigit],
        ["Pattern width", `${svgResult.width}px`],
        ["Digit style", `${state.barcode.textSize}px / ${describeBarcodeFont()} / ${state.barcode.fontWeight}`],
        ["Exports", "SVG vector, PDF vector, PNG transparent"],
        ["Status", analysis.wasAutoCompleted ? "Auto-completed from 12 digits" : "Validated from 13 digits"],
      ],
    };

    persistState();

    if (state.activeMode === "barcode") {
      renderOutput(outputs.barcode);
    }

    return outputs.barcode;
  }

  function generateQr(reportIssues) {
    syncQrStyleFromForm();

    const type = qrTypeMap[state.qr.type];
    const values = collectCurrentQrValues();
    state.qr.values[type.id] = values;

    const requiredMessage = validateRequiredQrValues(type, values);
    if (requiredMessage) {
      setStatusStrip(refs.qrStatusStrip, requiredMessage, reportIssues ? "invalid" : "neutral");
      return null;
    }

    if (reportIssues && !refs.qrForm.reportValidity()) {
      setStatusStrip(refs.qrStatusStrip, "Please complete the required fields for this QR type.", "invalid");
      return null;
    }

    if (typeof type.validate === "function") {
      const validationMessage = type.validate(values);
      if (validationMessage) {
        setStatusStrip(refs.qrStatusStrip, validationMessage, "invalid");
        return null;
      }
    }

    try {
      const payload = type.build(values);
      const output = createQrOutput(type, payload);
      outputs.qr = output;
      setStatusStrip(refs.qrStatusStrip, `${type.label} QR is ready.`, "valid");
      persistState();

      if (state.activeMode === "qr") {
        renderOutput(output);
      }

      return output;
    } catch (error) {
      const message = error instanceof Error ? error.message : "The QR code could not be generated.";
      setStatusStrip(refs.qrStatusStrip, message, "invalid");
      return null;
    }
  }

  function createQrOutput(type, payload) {
    const cellSize = state.qr.style.cellSize;
    const margin = state.qr.style.margin;
    const effectiveEcc = resolveQrErrorCorrection();
    const qr = window.qrcode(0, effectiveEcc);
    qr.addData(payload, "Byte");
    qr.make();

    const model = createQrVectorModel(qr, {
      darkColor: state.qr.style.darkColor,
      backgroundColor: state.qr.style.backgroundColor,
      cornerColor: state.qr.style.cornerColorMode === "custom" ? state.qr.style.cornerColor : state.qr.style.darkColor,
      cellSize,
      margin,
      shape: state.qr.style.shape,
      corner: state.qr.style.corner,
      frame: state.qr.style.frame,
      logo: state.qr.style.logo,
      typeShort: type.short,
      title: `${type.label} QR`,
      description: `${type.label} QR code`,
    });
    const svg = renderVectorSvg(model, { includeBackground: true });

    const moduleCount = qr.getModuleCount();

    return {
      mode: "qr",
      badge: `${type.label} Ready`,
      previewTitle: `${type.label} QR code`,
      payload,
      svg,
      model,
      width: model.width,
      height: model.height,
      fileBase: slugify(`${type.id}-qr-code`),
      summaryRows: [
        ["Type", type.label],
        ["Error correction", effectiveEcc === state.qr.style.ecc ? effectiveEcc : `${effectiveEcc} (raised for logo safety)`],
        ["Payload length", `${payload.length} characters`],
        ["Matrix size", `${moduleCount} Ã— ${moduleCount}`],
        ["Design", `${findOptionLabel(QR_SHAPE_OPTIONS, state.qr.style.shape)} / ${findOptionLabel(QR_CORNER_OPTIONS, state.qr.style.corner)}`],
        ["Output size", `${model.width}px Ã— ${model.height}px`],
        ["Exports", "SVG vector, PDF vector, PNG transparent"],
      ],
    };
  }

  function renderCurrentModeOutput() {
    const output = outputs[state.activeMode];
    if (output) {
      renderOutput(output);
      return;
    }

    renderPreviewPlaceholder();
  }

  function renderOutput(output) {
    refs.previewCanvas.innerHTML = output.svg;
    refs.previewTitle.textContent = output.previewTitle;
    refs.previewBadge.textContent = output.badge;
    refs.previewBadge.className = `preview-badge ${output.mode}`;
    refs.payloadText.textContent = output.payload;
    refs.downloadSvgButton.disabled = false;
    refs.downloadPdfButton.disabled = false;
    refs.downloadPngButton.disabled = false;
    refs.copyPayloadButton.disabled = false;
    renderSummary(output.summaryRows);
  }

  function renderPreviewPlaceholder() {
    refs.previewCanvas.innerHTML = `
      <div class="preview-placeholder">
        <strong>Nothing generated yet</strong>
        <p>Use one of the generators on the left to create a code.</p>
      </div>
    `;
    refs.previewTitle.textContent = "Generated code will appear here.";
    refs.previewBadge.textContent = "Ready";
    refs.previewBadge.className = "preview-badge";
    refs.payloadText.textContent = "No payload yet.";
    refs.downloadSvgButton.disabled = true;
    refs.downloadPdfButton.disabled = true;
    refs.downloadPngButton.disabled = true;
    refs.copyPayloadButton.disabled = true;
    renderSummary([["Status", "Waiting for your first code"]]);
  }

  function renderSummary(rows) {
    refs.summaryList.innerHTML = rows.map(([label, value]) => `
      <div class="summary-row">
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(String(value))}</dd>
      </div>
    `).join("");
  }

  function renderFatalError(message) {
    refs.previewCanvas.innerHTML = `
      <div class="preview-placeholder">
        <strong>Setup problem</strong>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
    refs.previewTitle.textContent = "App could not start correctly.";
    refs.previewBadge.textContent = "Error";
    refs.previewBadge.className = "preview-badge";
    refs.payloadText.textContent = message;
    renderSummary([["Status", "Startup error"]]);
    refs.downloadSvgButton.disabled = true;
    refs.downloadPdfButton.disabled = true;
    refs.downloadPngButton.disabled = true;
    refs.copyPayloadButton.disabled = true;
  }

  function updateSelfCheckAvailability() {
    if (!("BarcodeDetector" in window)) {
      refs.selfCheckStatus.textContent = "BarcodeDetector is not available in this browser, but the validation suite can still run structural checks for EAN-13 and all QR templates.";
      refs.runSelfCheckButton.disabled = false;
      return;
    }

    refs.selfCheckStatus.textContent = "Validation is available. The suite will run structural checks and local scan checks for EAN-13 and all QR templates.";
    refs.runSelfCheckButton.disabled = false;
  }

  async function runSelfCheck() {
    refs.runSelfCheckButton.disabled = true;
    refs.selfCheckStatus.className = "self-check-status";
    refs.selfCheckStatus.textContent = "Running local scan checks...";

    const results = [];
    const barcodeDetectorAvailable = "BarcodeDetector" in window;

    try {
      results.push(...runStructuralChecks());

      if (barcodeDetectorAvailable) {
        const barcodeSample = createEAN13Svg("5901234123457", {
          moduleWidth: 4,
          barHeight: 140,
          quietZone: 14,
        });
        const decodedBarcode = await detectFromSvg(barcodeSample.svg, barcodeSample.width, barcodeSample.height, "ean_13");
        results.push({
          name: "EAN-13 scan",
          pass: decodedBarcode === "5901234123457",
          detail: decodedBarcode || "No barcode detected",
        });

        for (const type of QR_TYPES) {
          const sampleValues = clone(getDefaultValuesForType(type.id));
          const payload = type.build(sampleValues);
          const sampleOutput = createQrOutput(type, payload);
          const decodedQr = await detectFromSvg(sampleOutput.svg, sampleOutput.width, sampleOutput.height, "qr_code");
          const pass = normalizeLineEndings(decodedQr) === normalizeLineEndings(payload);
          results.push({
            name: `${type.label} QR scan`,
            pass,
            detail: pass ? "Decoded correctly" : (decodedQr ? "Decoded content mismatch" : "No QR detected"),
          });
        }
      } else {
        results.push({
          name: "Scanner API",
          pass: true,
          detail: "BarcodeDetector is unavailable here, so scan checks were skipped after structural validation.",
        });
      }

      const failed = results.filter((item) => !item.pass);
      refs.selfCheckStatus.className = `self-check-status ${failed.length ? "fail" : "pass"}`;
      refs.selfCheckStatus.innerHTML = [
        failed.length ? `Validation finished with ${failed.length} issue(s).` : "Validation passed for EAN-13 and all QR templates.",
        ...results.map((item) => `${item.pass ? "PASS" : "FAIL"} - ${escapeHtml(item.name)}: ${escapeHtml(item.detail)}`),
      ].join("<br>");
    } catch (error) {
      refs.selfCheckStatus.className = "self-check-status fail";
      refs.selfCheckStatus.textContent = error instanceof Error ? error.message : "Validation failed unexpectedly.";
    } finally {
      refs.runSelfCheckButton.disabled = false;
    }
  }

  function runStructuralChecks() {
    const results = [];

    const checksumVectors = [
      ["400638133393", "1"],
      ["590123412345", "7"],
      ["501234567890", "0"],
    ];
    const checksumPass = checksumVectors.every(([base, expected]) => computeEAN13CheckDigit(base) === expected);
    results.push({
      name: "Checksum logic",
      pass: checksumPass,
      detail: "Known EAN-13 vectors checked.",
    });

    const autoCompleted = analyzeEAN13("590123412345");
    results.push({
      name: "EAN-13 auto-complete",
      pass: autoCompleted.valid && autoCompleted.normalized === "5901234123457" && autoCompleted.wasAutoCompleted,
      detail: autoCompleted.valid ? autoCompleted.normalized : autoCompleted.message,
    });

    const barcodeSvg = createEAN13Svg("5901234123457", {
      moduleWidth: 3,
      barHeight: 120,
      quietZone: 12,
    });
    results.push({
      name: "EAN-13 SVG output",
      pass: /<svg[\s\S]*<rect/.test(barcodeSvg.svg) && barcodeSvg.width > 0 && barcodeSvg.height > 0 && buildEAN13BitString("5901234123457").length === 95,
      detail: `${barcodeSvg.width}px wide, ${barcodeSvg.height}px tall.`,
    });

    const wifiPayload = buildWifi(getDefaultValuesForType("wifi"));
    results.push({
      name: "WiFi payload format",
      pass: /^WIFI:T:WPA;S:.*;P:.*;;$/.test(wifiPayload),
      detail: wifiPayload,
    });

    const gs1Payload = buildGs1DigitalLink(getDefaultValuesForType("barcode2d"));
    results.push({
      name: "GS1 Digital Link payload",
      pass: /^https:\/\/id\.gs1\.org\/01\/\d{14}/.test(gs1Payload),
      detail: gs1Payload,
    });

    for (const type of QR_TYPES) {
      const sampleValues = clone(getDefaultValuesForType(type.id));
      const payload = type.build(sampleValues);
      const sampleOutput = createQrOutput(type, payload);
      results.push({
        name: `${type.label} QR structure`,
        pass: Boolean(payload) && sampleOutput.svg.includes("<svg") && sampleOutput.width > 0 && sampleOutput.height > 0,
        detail: `${payload.length} chars, ${sampleOutput.width}px output.`,
      });
    }

    return results;
  }

  async function detectFromSvg(svgText, width, height, format) {
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width);
    canvas.height = Math.ceil(height);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas could not be initialized for validation.");
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if (typeof bitmap.close === "function") {
      bitmap.close();
    }

    const detector = new window.BarcodeDetector({ formats: [format] });
    const results = await detector.detect(canvas);
    return results[0] && typeof results[0].rawValue === "string" ? results[0].rawValue : "";
  }

  function collectCurrentQrValues() {
    const typeId = state.qr.type;
    const values = clone(state.qr.values[typeId]);
    refs.qrDynamicFields.querySelectorAll("[data-qr-field]").forEach((field) => {
      if (!(field instanceof HTMLElement)) {
        return;
      }
      const key = field.getAttribute("data-qr-field");
      if (!key) {
        return;
      }
      values[key] = readFieldValue(field);
    });
    return values;
  }

  function analyzeEAN13(rawValue) {
    const digits = onlyDigits(rawValue || "");
    if (!digits.length) {
      return { empty: true, valid: false, message: "Waiting for digits." };
    }

    if (digits.length !== 12 && digits.length !== 13) {
      return {
        empty: false,
        valid: false,
        message: "EAN-13 must contain exactly 12 or 13 digits.",
      };
    }

    if (!/^\d+$/.test(digits)) {
      return {
        empty: false,
        valid: false,
        message: "EAN-13 accepts digits only.",
      };
    }

    const base = digits.slice(0, 12);
    const checkDigit = computeEAN13CheckDigit(base);
    const normalized = digits.length === 12 ? `${digits}${checkDigit}` : digits;

    if (normalized[12] !== checkDigit) {
      return {
        empty: false,
        valid: false,
        message: `Invalid check digit. Expected ${checkDigit} for ${base}.`,
      };
    }

    return {
      empty: false,
      valid: true,
      wasAutoCompleted: digits.length === 12,
      normalized,
      checkDigit,
    };
  }

  function computeEAN13CheckDigit(digits12) {
    const digits = onlyDigits(digits12);
    if (digits.length !== 12) {
      throw new Error("EAN-13 check digit calculation requires exactly 12 digits.");
    }

    let sum = 0;
    for (let index = 0; index < digits.length; index += 1) {
      const value = Number(digits[index]);
      sum += value * (index % 2 === 0 ? 1 : 3);
    }

    return String((10 - (sum % 10)) % 10);
  }

  function createEAN13Svg(digits, options) {
    const bitString = buildEAN13BitString(digits);
    const moduleWidth = Number(options.moduleWidth);
    const barHeight = Number(options.barHeight);
    const quietZone = Number(options.quietZone);
    const fontFamily = safeTrim(options.fontFamily) || BARCODE_FONT_FAMILY;
    const fontWeight = clampNumber(options.fontWeight, 400, 800, 400);
    const guardExtra = Math.max(12, moduleWidth * 4);
    const textSize = clampNumber(options.textSize, 14, 56, Math.max(18, moduleWidth * 5.6));
    const topPadding = 18;
    const totalWidth = (bitString.length + quietZone * 2) * moduleWidth;
    const totalHeight = topPadding + barHeight + guardExtra + textSize + 12;
    const textY = topPadding + barHeight + guardExtra + textSize * 0.72;
    const rects = [];
    const texts = [];

    for (let index = 0; index < bitString.length; index += 1) {
      if (bitString[index] !== "1") {
        continue;
      }
      const x = (quietZone + index) * moduleWidth;
      const isGuard = index < 3 || (index >= 45 && index < 50) || index >= 92;
      const height = barHeight + (isGuard ? guardExtra : 0);
      rects.push({
        x,
        y: topPadding,
        width: moduleWidth,
        height,
        fill: BARCODE_INK,
      });
    }

    const startX = quietZone;
    texts.push({
      x: (startX - 4.5) * moduleWidth,
      y: textY,
      anchor: "middle",
      size: textSize,
      fill: BARCODE_INK,
      fontFamily,
      fontWeight,
      text: digits[0],
    });

    for (let index = 1; index <= 6; index += 1) {
      const center = (startX + 3 + (index - 1) * 7 + 3.5) * moduleWidth;
      texts.push({
        x: center,
        y: textY,
        anchor: "middle",
        size: textSize,
        fill: BARCODE_INK,
        fontFamily,
        fontWeight,
        text: digits[index],
      });
    }

    for (let index = 7; index <= 12; index += 1) {
      const center = (startX + 3 + 42 + 5 + (index - 7) * 7 + 3.5) * moduleWidth;
      texts.push({
        x: center,
        y: textY,
        anchor: "middle",
        size: textSize,
        fill: BARCODE_INK,
        fontFamily,
        fontWeight,
        text: digits[index],
      });
    }

    const model = {
      width: totalWidth,
      height: totalHeight,
      background: "#ffffff",
      title: `EAN-13 barcode ${digits}`,
      description: `EAN-13 barcode ${digits}`,
      rects,
      texts,
    };

    return {
      svg: renderVectorSvg(model, { includeBackground: true }),
      model,
      width: totalWidth,
      height: totalHeight,
    };
  }

  function createQrVectorModel(qr, options) {
    const moduleCount = qr.getModuleCount();
    const qrSize = moduleCount * options.cellSize;
    const frameInsets = getQrFrameInsets(options.frame, options.cellSize);
    const width = qrSize + options.margin * 2;
    const height = qrSize + options.margin * 2 + frameInsets.top + frameInsets.bottom;
    const qrOriginX = options.margin;
    const qrOriginY = options.margin + frameInsets.top;
    const model = {
      width,
      height,
      background: options.backgroundColor,
      title: options.title,
      description: options.description,
      rects: [],
      roundRects: [],
      circles: [],
      compoundPaths: [],
      texts: [],
    };

    addQrFrame(model, {
      frame: options.frame,
      qrOriginX,
      qrOriginY,
      qrSize,
      cellSize: options.cellSize,
      margin: options.margin,
      darkColor: options.darkColor,
      backgroundColor: options.backgroundColor,
      typeShort: options.typeShort,
    });

    const logoBadge = options.logo === "none"
      ? null
      : createLogoBadge(qrOriginX, qrOriginY, qrSize, options.cellSize, options.darkColor, options.backgroundColor);

    for (let row = 0; row < moduleCount; row += 1) {
      for (let column = 0; column < moduleCount; column += 1) {
        if (!qr.isDark(row, column) || isFinderCell(row, column, moduleCount)) {
          continue;
        }

        const x = qrOriginX + column * options.cellSize;
        const y = qrOriginY + row * options.cellSize;
        if (logoBadge && moduleIntersectsBadge(x, y, options.cellSize, logoBadge)) {
          continue;
        }

        addModuleShape(model, x, y, options.cellSize, options.darkColor, options.shape);
      }
    }

    for (const origin of getFinderOrigins(moduleCount)) {
      addFinderPattern(
        model,
        qrOriginX + origin.column * options.cellSize,
        qrOriginY + origin.row * options.cellSize,
        options.cellSize,
        options.corner,
        options.cornerColor,
        options.backgroundColor,
      );
    }

    if (logoBadge) {
      addQrLogo(model, logoBadge, options.logo, options.darkColor, options.backgroundColor, options.typeShort);
    }

    return model;
  }

  function renderVectorSvg(model, renderOptions) {
    const includeBackground = !renderOptions || renderOptions.includeBackground !== false;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${formatNumber(model.width)} ${formatNumber(model.height)}" width="${formatNumber(model.width)}" height="${formatNumber(model.height)}" role="img" aria-label="${escapeAttribute(model.description || model.title || "Code")}">`;

    if (model.title) {
      svg += `<title>${escapeHtml(model.title)}</title>`;
    }
    if (model.description) {
      svg += `<desc>${escapeHtml(model.description)}</desc>`;
    }
    if (includeBackground && model.background) {
      svg += `<rect width="100%" height="100%" fill="${escapeAttribute(model.background)}"/>`;
    }

    for (const rect of model.rects) {
      svg += `<rect x="${formatNumber(rect.x)}" y="${formatNumber(rect.y)}" width="${formatNumber(rect.width)}" height="${formatNumber(rect.height)}" fill="${escapeAttribute(rect.fill)}" shape-rendering="crispEdges"/>`;
    }

    for (const roundRect of model.roundRects || []) {
      svg += `<rect x="${formatNumber(roundRect.x)}" y="${formatNumber(roundRect.y)}" width="${formatNumber(roundRect.width)}" height="${formatNumber(roundRect.height)}" rx="${formatNumber(roundRect.radius)}" ry="${formatNumber(roundRect.radius)}" fill="${escapeAttribute(roundRect.fill)}"/>`;
    }

    for (const circle of model.circles || []) {
      svg += `<circle cx="${formatNumber(circle.cx)}" cy="${formatNumber(circle.cy)}" r="${formatNumber(circle.r)}" fill="${escapeAttribute(circle.fill)}"/>`;
    }

    for (const compoundPath of model.compoundPaths || []) {
      svg += `<path d="${escapeAttribute(buildSvgCompoundPath(compoundPath.paths))}" fill="${escapeAttribute(compoundPath.fill)}" fill-rule="evenodd"/>`;
    }

    for (const textItem of model.texts) {
      svg += `<text x="${formatNumber(textItem.x)}" y="${formatNumber(textItem.y)}" text-anchor="${escapeAttribute(textItem.anchor || "start")}" font-size="${formatNumber(textItem.size)}" font-family="${escapeAttribute(textItem.fontFamily || "Helvetica")}" font-weight="${escapeAttribute(textItem.fontWeight || "700")}" fill="${escapeAttribute(textItem.fill || "#000000")}">${escapeHtml(textItem.text)}</text>`;
    }

    svg += "</svg>";
    return svg;
  }

  function mapOptionsById(options) {
    return Object.fromEntries(options.map((option) => [option.id, option]));
  }

  function pickOptionId(options, value) {
    return options.some((option) => option.id === value) ? value : options[0].id;
  }

  function findOptionLabel(options, value) {
    const match = options.find((option) => option.id === value);
    return match ? match.label : options[0].label;
  }

  function normalizeHexColor(value, fallback) {
    const trimmed = safeTrim(value || "");
    return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed : fallback;
  }

  function handleQrStyleInput() {
    syncQrStyleFromForm();
    generateQr(false);
  }

  function selectQrType(nextType) {
    if (!qrTypeMap[nextType]) {
      return;
    }

    state.qr.type = nextType;
    persistState();
    renderQrTypeSelectors();
    renderQrTypeGrid();
    renderQrDynamicFields();
    setStatusStrip(refs.qrStatusStrip, `Fill the ${qrTypeMap[nextType].label} details. The app normalizes web links automatically.`, "neutral");
    generateQr(false);
  }

  function handleDesignOptionClick(event, key, optionMap) {
    const button = event.target.closest("[data-design-value]");
    if (!button) {
      return;
    }

    const nextValue = button.getAttribute("data-design-value");
    if (!nextValue || !optionMap[nextValue]) {
      return;
    }

    state.qr.style[key] = nextValue;
    persistState();
    renderQrDesignControls();
    generateQr(false);
  }

  function updateCornerColorControl() {
    refs.qrCornerColor.disabled = state.qr.style.cornerColorMode !== "custom";
  }

  function renderDesignButtonMarkup(options, activeId, group, previewRenderer) {
    return options.map((option) => {
      const activeClass = option.id === activeId ? " active" : "";
      return `
        <button class="design-option${activeClass}" type="button" data-design-group="${group}" data-design-value="${option.id}">
          ${previewRenderer(option.id)}
          <span class="design-option-label">${escapeHtml(option.label)}</span>
          <span class="design-option-note">${escapeHtml(option.note || "")}</span>
        </button>
      `;
    }).join("");
  }

  function renderShapePreview(optionId) {
    const color = escapeAttribute(state.qr.style.darkColor);
    const moduleMarkup = {
      square: `
        <rect x="10" y="10" width="14" height="14" fill="${color}"/>
        <rect x="28" y="10" width="14" height="14" fill="${color}"/>
        <rect x="46" y="10" width="14" height="14" fill="${color}"/>
        <rect x="10" y="28" width="14" height="14" fill="${color}"/>
        <rect x="46" y="28" width="14" height="14" fill="${color}"/>
        <rect x="10" y="46" width="14" height="14" fill="${color}"/>
        <rect x="28" y="46" width="14" height="14" fill="${color}"/>
        <rect x="46" y="46" width="14" height="14" fill="${color}"/>
      `,
      rounded: `
        <rect x="10" y="10" width="14" height="14" rx="4" fill="${color}"/>
        <rect x="28" y="10" width="14" height="14" rx="4" fill="${color}"/>
        <rect x="46" y="10" width="14" height="14" rx="4" fill="${color}"/>
        <rect x="10" y="28" width="14" height="14" rx="4" fill="${color}"/>
        <rect x="46" y="28" width="14" height="14" rx="4" fill="${color}"/>
        <rect x="10" y="46" width="14" height="14" rx="4" fill="${color}"/>
        <rect x="28" y="46" width="14" height="14" rx="4" fill="${color}"/>
        <rect x="46" y="46" width="14" height="14" rx="4" fill="${color}"/>
      `,
      dots: `
        <circle cx="17" cy="17" r="6" fill="${color}"/>
        <circle cx="35" cy="17" r="6" fill="${color}"/>
        <circle cx="53" cy="17" r="6" fill="${color}"/>
        <circle cx="17" cy="35" r="6" fill="${color}"/>
        <circle cx="53" cy="35" r="6" fill="${color}"/>
        <circle cx="17" cy="53" r="6" fill="${color}"/>
        <circle cx="35" cy="53" r="6" fill="${color}"/>
        <circle cx="53" cy="53" r="6" fill="${color}"/>
      `,
      soft: `
        <rect x="10" y="10" width="14" height="14" rx="6" fill="${color}"/>
        <rect x="28" y="10" width="14" height="14" rx="6" fill="${color}"/>
        <rect x="46" y="10" width="14" height="14" rx="6" fill="${color}"/>
        <rect x="10" y="28" width="14" height="14" rx="6" fill="${color}"/>
        <rect x="46" y="28" width="14" height="14" rx="6" fill="${color}"/>
        <rect x="10" y="46" width="14" height="14" rx="6" fill="${color}"/>
        <rect x="28" y="46" width="14" height="14" rx="6" fill="${color}"/>
        <rect x="46" y="46" width="14" height="14" rx="6" fill="${color}"/>
      `,
    };

    return `<svg class="design-preview" viewBox="0 0 72 72" aria-hidden="true">${moduleMarkup[optionId] || moduleMarkup.square}</svg>`;
  }

  function renderCornerPreview(optionId) {
    const color = escapeAttribute(state.qr.style.cornerColorMode === "custom" ? state.qr.style.cornerColor : state.qr.style.darkColor);
    const background = escapeAttribute(state.qr.style.backgroundColor);
    const previews = {
      square: `
        <rect x="8" y="8" width="56" height="56" fill="${color}"/>
        <rect x="16" y="16" width="40" height="40" fill="${background}"/>
        <rect x="24" y="24" width="24" height="24" fill="${color}"/>
      `,
      rounded: `
        <rect x="8" y="8" width="56" height="56" rx="12" fill="${color}"/>
        <rect x="16" y="16" width="40" height="40" rx="10" fill="${background}"/>
        <rect x="24" y="24" width="24" height="24" rx="8" fill="${color}"/>
      `,
      circle: `
        <circle cx="36" cy="36" r="28" fill="${color}"/>
        <circle cx="36" cy="36" r="20" fill="${background}"/>
        <circle cx="36" cy="36" r="12" fill="${color}"/>
      `,
      soft: `
        <rect x="8" y="8" width="56" height="56" rx="18" fill="${color}"/>
        <rect x="16" y="16" width="40" height="40" rx="16" fill="${background}"/>
        <rect x="24" y="24" width="24" height="24" rx="10" fill="${color}"/>
      `,
    };
    return `<svg class="design-preview" viewBox="0 0 72 72" aria-hidden="true">${previews[optionId] || previews.square}</svg>`;
  }

  function renderFramePreview(optionId) {
    const color = escapeAttribute(state.qr.style.darkColor);
    const background = escapeAttribute(state.qr.style.backgroundColor);
    const previews = {
      none: `<rect x="10" y="10" width="52" height="52" rx="10" fill="${background}" stroke="${color}" stroke-width="6"/>`,
      "scan-bottom": `
        <rect x="16" y="8" width="40" height="40" rx="8" fill="${background}" stroke="${color}" stroke-width="4"/>
        <rect x="14" y="52" width="44" height="12" rx="6" fill="${color}"/>
      `,
      "scan-top-bottom": `
        <rect x="14" y="8" width="44" height="10" rx="5" fill="${color}"/>
        <rect x="16" y="22" width="40" height="26" rx="8" fill="${background}" stroke="${color}" stroke-width="4"/>
        <rect x="14" y="52" width="44" height="10" rx="5" fill="${color}"/>
      `,
      ticket: `
        <rect x="8" y="10" width="56" height="52" rx="14" fill="${color}"/>
        <rect x="12" y="14" width="48" height="44" rx="12" fill="${background}"/>
        <rect x="20" y="18" width="32" height="8" rx="4" fill="${color}"/>
      `,
      badge: `
        <rect x="16" y="8" width="40" height="40" rx="8" fill="${background}" stroke="${color}" stroke-width="4"/>
        <rect x="10" y="48" width="52" height="16" rx="8" fill="${color}"/>
      `,
    };
    return `<svg class="design-preview" viewBox="0 0 72 72" aria-hidden="true">${previews[optionId] || previews.none}</svg>`;
  }

  function renderLogoPreview(optionId) {
    const color = escapeAttribute(state.qr.style.darkColor);
    const background = escapeAttribute(state.qr.style.backgroundColor);
    const previews = {
      none: `
        <rect x="10" y="10" width="52" height="52" rx="14" fill="${background}" stroke="${color}" stroke-width="4"/>
        <line x1="18" y1="18" x2="54" y2="54" stroke="${color}" stroke-width="5"/>
      `,
      globe: `
        <circle cx="36" cy="36" r="20" fill="${color}"/>
        <circle cx="36" cy="36" r="14" fill="${background}"/>
        <rect x="34" y="18" width="4" height="36" rx="2" fill="${color}"/>
        <rect x="18" y="34" width="36" height="4" rx="2" fill="${color}"/>
      `,
      scan: `
        <rect x="14" y="14" width="44" height="44" rx="12" fill="${color}"/>
        <rect x="18" y="18" width="36" height="36" rx="10" fill="${background}"/>
        <text x="36" y="40" text-anchor="middle" font-size="10" font-weight="700" fill="${color}">SCAN</text>
      `,
      focus: `
        <rect x="18" y="18" width="8" height="24" rx="3" fill="${color}"/>
        <rect x="18" y="18" width="24" height="8" rx="3" fill="${color}"/>
        <rect x="46" y="18" width="8" height="24" rx="3" fill="${color}"/>
        <rect x="30" y="18" width="24" height="8" rx="3" fill="${color}"/>
        <rect x="18" y="30" width="8" height="24" rx="3" fill="${color}"/>
        <rect x="18" y="46" width="24" height="8" rx="3" fill="${color}"/>
        <rect x="46" y="30" width="8" height="24" rx="3" fill="${color}"/>
        <rect x="30" y="46" width="24" height="8" rx="3" fill="${color}"/>
      `,
      type: `
        <rect x="14" y="14" width="44" height="44" rx="12" fill="${color}"/>
        <rect x="18" y="18" width="36" height="36" rx="10" fill="${background}"/>
        <text x="36" y="42" text-anchor="middle" font-size="14" font-weight="700" fill="${color}">QR</text>
      `,
    };
    return `<svg class="design-preview" viewBox="0 0 72 72" aria-hidden="true">${previews[optionId] || previews.none}</svg>`;
  }

  function validateRequiredQrValues(type, values) {
    const missing = type.fields.find((field) => field.required && !safeTrim(values[field.key]));
    return missing ? `${missing.label} is required for this QR type.` : "";
  }

  function resolveQrErrorCorrection() {
    return state.qr.style.logo !== "none" && state.qr.style.ecc !== "H" ? "H" : state.qr.style.ecc;
  }

  function getFinderOrigins(moduleCount) {
    return QR_FINDER_ZONES.map((zone) => ({
      row: zone.row < 0 ? moduleCount - 7 : zone.row,
      column: zone.column < 0 ? moduleCount - 7 : zone.column,
    }));
  }

  function isFinderCell(row, column, moduleCount) {
    return getFinderOrigins(moduleCount).some((origin) =>
      row >= origin.row && row < origin.row + 7 && column >= origin.column && column < origin.column + 7);
  }

  function getQrFrameInsets(frame, cellSize) {
    switch (frame) {
      case "scan-bottom":
        return { top: 0, bottom: Math.max(42, cellSize * 5.5) };
      case "scan-top-bottom":
        return { top: Math.max(38, cellSize * 5), bottom: Math.max(42, cellSize * 5.5) };
      case "ticket":
        return { top: Math.max(34, cellSize * 4.5), bottom: Math.max(24, cellSize * 3.5) };
      case "badge":
        return { top: 0, bottom: Math.max(50, cellSize * 6) };
      default:
        return { top: 0, bottom: 0 };
    }
  }

  function createLogoBadge(qrOriginX, qrOriginY, qrSize, cellSize, darkColor, backgroundColor) {
    const size = Math.max(cellSize * 6, Math.min(qrSize * 0.22, cellSize * 10));
    const border = Math.max(2, size * 0.08);
    return {
      x: qrOriginX + (qrSize - size) / 2,
      y: qrOriginY + (qrSize - size) / 2,
      size,
      radius: size * 0.24,
      border,
      darkColor,
      backgroundColor,
    };
  }

  function moduleIntersectsBadge(x, y, size, badge) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const bleed = badge.border + size * 0.35;
    return centerX >= badge.x - bleed
      && centerX <= badge.x + badge.size + bleed
      && centerY >= badge.y - bleed
      && centerY <= badge.y + badge.size + bleed;
  }

  function addModuleShape(model, x, y, size, fill, shape) {
    switch (shape) {
      case "rounded":
        pushRoundRect(model, x, y, size, size, size * 0.24, fill);
        return;
      case "dots":
        pushCircle(model, x + size / 2, y + size / 2, size * 0.32, fill);
        return;
      case "soft":
        pushRoundRect(model, x, y, size, size, size * 0.38, fill);
        return;
      default:
        pushRect(model, x, y, size, size, fill);
    }
  }

  function addFinderPattern(model, x, y, cellSize, style, fill, background) {
    const outerSize = cellSize * 7;
    const middleSize = cellSize * 5;
    const innerSize = cellSize * 3;
    if (style === "circle") {
      const center = x + outerSize / 2;
      pushCompoundPath(model, [
        { type: "circle", cx: center, cy: y + outerSize / 2, r: outerSize / 2 },
        { type: "circle", cx: center, cy: y + outerSize / 2, r: middleSize / 2 },
      ], fill);
      pushCircle(model, center, y + outerSize / 2, innerSize / 2, fill);
      return;
    }

    const radius = style === "soft" ? cellSize * 1.4 : (style === "rounded" ? cellSize * 0.9 : 0);
    pushCompoundPath(model, [
      { type: "roundRect", x, y, width: outerSize, height: outerSize, radius },
      {
        type: "roundRect",
        x: x + cellSize,
        y: y + cellSize,
        width: middleSize,
        height: middleSize,
        radius: Math.max(0, radius - cellSize * 0.2),
      },
    ], fill);
    pushRoundRect(model, x + cellSize * 2, y + cellSize * 2, innerSize, innerSize, Math.max(0, radius - cellSize * 0.45), fill);
  }

  function addQrFrame(model, options) {
    if (options.frame === "none") {
      return;
    }

    const pillWidth = Math.min(model.width - options.margin * 1.3, Math.max(112, options.qrSize * 0.54));
    const pillHeight = Math.max(30, options.cellSize * 3.1);
    const pillX = (model.width - pillWidth) / 2;

    if (options.frame === "scan-bottom" || options.frame === "badge") {
      const fill = options.darkColor;
      const y = options.qrOriginY + options.qrSize + options.cellSize * 1.35;
      const height = options.frame === "badge" ? pillHeight + options.cellSize * 0.5 : pillHeight;
      pushRoundRect(model, pillX, y, pillWidth, height, height / 2, fill);
      pushText(model, model.width / 2, y + height * 0.66, "SCAN ME", Math.max(13, height * 0.34), "#ffffff", "middle");
      return;
    }

    if (options.frame === "scan-top-bottom") {
      const topY = options.cellSize * 0.9;
      pushRoundRect(model, pillX, topY, pillWidth, pillHeight, pillHeight / 2, options.darkColor);
      pushText(model, model.width / 2, topY + pillHeight * 0.66, `${options.typeShort} QR`, Math.max(12, pillHeight * 0.34), "#ffffff", "middle");
      const bottomY = options.qrOriginY + options.qrSize + options.cellSize * 1.3;
      pushRoundRect(model, pillX, bottomY, pillWidth, pillHeight, pillHeight / 2, options.darkColor);
      pushText(model, model.width / 2, bottomY + pillHeight * 0.66, "SCAN ME", Math.max(12, pillHeight * 0.34), "#ffffff", "middle");
      return;
    }

    if (options.frame === "ticket") {
      const outerX = Math.max(8, options.margin * 0.35);
      const outerY = Math.max(8, options.cellSize * 0.6);
      const outerWidth = model.width - outerX * 2;
      const outerHeight = model.height - outerY - Math.max(8, options.margin * 0.35);
      pushCompoundPath(model, [
        {
          type: "roundRect",
          x: outerX,
          y: outerY,
          width: outerWidth,
          height: outerHeight,
          radius: Math.max(18, options.cellSize * 1.6),
        },
        {
          type: "roundRect",
          x: outerX + 4,
          y: outerY + 4,
          width: outerWidth - 8,
          height: outerHeight - 8,
          radius: Math.max(16, options.cellSize * 1.35),
        },
      ], options.darkColor);
      const topY = options.cellSize * 0.95;
      pushRoundRect(model, pillX, topY, pillWidth, pillHeight, pillHeight / 2, options.darkColor);
      pushText(model, model.width / 2, topY + pillHeight * 0.66, `${options.typeShort} QR`, Math.max(12, pillHeight * 0.34), "#ffffff", "middle");
    }
  }

  function addQrLogo(model, badge, logo, darkColor, backgroundColor, typeShort) {
    pushCompoundPath(model, [
      {
        type: "roundRect",
        x: badge.x,
        y: badge.y,
        width: badge.size,
        height: badge.size,
        radius: badge.radius,
      },
      {
        type: "roundRect",
        x: badge.x + badge.border,
        y: badge.y + badge.border,
        width: badge.size - badge.border * 2,
        height: badge.size - badge.border * 2,
        radius: Math.max(6, badge.radius - badge.border),
      },
    ], darkColor);

    const centerX = badge.x + badge.size / 2;
    const centerY = badge.y + badge.size / 2;
    const innerSize = badge.size - badge.border * 2;
    if (logo === "globe") {
      pushCompoundPath(model, [
        { type: "circle", cx: centerX, cy: centerY, r: innerSize * 0.19 },
        { type: "circle", cx: centerX, cy: centerY, r: innerSize * 0.14 },
      ], darkColor);
      pushRoundRect(model, centerX - innerSize * 0.03, centerY - innerSize * 0.19, innerSize * 0.06, innerSize * 0.38, innerSize * 0.03, darkColor);
      pushRoundRect(model, centerX - innerSize * 0.19, centerY - innerSize * 0.03, innerSize * 0.38, innerSize * 0.06, innerSize * 0.03, darkColor);
      return;
    }

    if (logo === "scan") {
      pushText(model, centerX, centerY + innerSize * 0.07, "SCAN", Math.max(10, innerSize * 0.18), darkColor, "middle");
      pushText(model, centerX, centerY + innerSize * 0.25, "ME", Math.max(10, innerSize * 0.18), darkColor, "middle");
      return;
    }

    if (logo === "focus") {
      const arm = innerSize * 0.13;
      const span = innerSize * 0.34;
      pushRoundRect(model, centerX - span, centerY - span, arm, span, arm / 2, darkColor);
      pushRoundRect(model, centerX - span, centerY - span, span, arm, arm / 2, darkColor);
      pushRoundRect(model, centerX + span - arm, centerY - span, arm, span, arm / 2, darkColor);
      pushRoundRect(model, centerX, centerY - span, span, arm, arm / 2, darkColor);
      pushRoundRect(model, centerX - span, centerY, arm, span, arm / 2, darkColor);
      pushRoundRect(model, centerX - span, centerY + span - arm, span, arm, arm / 2, darkColor);
      pushRoundRect(model, centerX + span - arm, centerY, arm, span, arm / 2, darkColor);
      pushRoundRect(model, centerX, centerY + span - arm, span, arm, arm / 2, darkColor);
      return;
    }

    if (logo === "type") {
      pushText(model, centerX, centerY + innerSize * 0.08, typeShort, Math.max(14, innerSize * 0.26), darkColor, "middle");
    }
  }

  function pushRect(model, x, y, width, height, fill) {
    model.rects.push({ x, y, width, height, fill });
  }

  function pushRoundRect(model, x, y, width, height, radius, fill) {
    if (radius <= 0) {
      pushRect(model, x, y, width, height, fill);
      return;
    }
    model.roundRects.push({ x, y, width, height, radius, fill });
  }

  function pushCircle(model, cx, cy, r, fill) {
    model.circles.push({ cx, cy, r, fill });
  }

  function pushCompoundPath(model, paths, fill) {
    model.compoundPaths.push({ paths, fill });
  }

  function pushText(model, x, y, text, size, fill, anchor) {
    model.texts.push({
      x,
      y,
      text,
      size,
      fill,
      anchor: anchor || "start",
      fontFamily: BARCODE_FONT_FAMILY,
      fontWeight: "700",
    });
  }

  function buildEAN13BitString(digits) {
    const parityPattern = EAN13_PARITY[Number(digits[0])];
    let bits = "101";

    for (let index = 1; index <= 6; index += 1) {
      const encoding = parityPattern[index - 1];
      bits += EAN13_PATTERNS[encoding][digits[index]];
    }

    bits += "01010";

    for (let index = 7; index <= 12; index += 1) {
      bits += EAN13_PATTERNS.R[digits[index]];
    }

    bits += "101";
    return bits;
  }

  function recolorQrSvg(svg, darkColor) {
    return svg
      .replace('fill="white"', 'fill="#ffffff"')
      .replace('fill="black"', `fill="${escapeAttribute(darkColor)}"`);
  }

  function resolveBarcodeFontFamily() {
    return safeTrim(state.barcode.fontFamily) || BARCODE_FONT_FAMILY;
  }

  function describeBarcodeFont() {
    return safeTrim(state.barcode.fontFamily) || "Arial";
  }

  function applyBarcodeFontSuggestions(fontFamilies) {
    const uniqueFamilies = Array.from(new Set(
      (fontFamilies || [])
        .map((family) => safeTrim(family))
        .filter(Boolean),
    )).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));

    refs.barcodeFontFamilyList.innerHTML = uniqueFamilies
      .map((family) => `<option value="${escapeAttribute(family)}"></option>`)
      .join("");
  }

  function refreshBarcodeFontSuggestions() {
    applyBarcodeFontSuggestions([
      ...BARCODE_FONT_SUGGESTIONS,
      ...packagedFontFamilies,
      ...installedFontFamilies,
    ]);
  }

  function setBarcodeFontAccessStatus(message, tone) {
    refs.barcodeFontAccessStatus.textContent = message;
    refs.barcodeFontAccessStatus.classList.remove("ready", "warn");
    if (tone === "ready" || tone === "warn") {
      refs.barcodeFontAccessStatus.classList.add(tone);
    }
  }

  async function primeBarcodeFontSources() {
    refreshBarcodeFontSuggestions();
    await loadPackagedBarcodeFonts();
    await primeInstalledFontsIfPossible();
  }

  async function loadPackagedBarcodeFonts() {
    if (!window.fetch || window.location.protocol === "file:") {
      setBarcodeFontAccessStatus("Fonts from the web folder work after you put this site online. The button can still try this PC font list.", "");
      return;
    }

    try {
      const response = await fetch(WEB_FONT_MANIFEST_PATH, { cache: "no-store" });
      if (!response.ok) {
        setBarcodeFontAccessStatus("No folder fonts loaded yet. Add .ttf or .otf files to /fonts and list them in manifest.json.", "");
        return;
      }

      const manifest = await response.json();
      const entries = Array.isArray(manifest.fonts)
        ? manifest.fonts.map(normalizePackagedFontEntry).filter(Boolean)
        : [];

      if (!entries.length) {
        setBarcodeFontAccessStatus("Folder fonts are ready to use. Add .ttf or .otf files in /fonts and list them in manifest.json.", "");
        return;
      }

      installPackagedFontFaces(entries);
      packagedFontFamilies = entries.map((entry) => entry.family);
      refreshBarcodeFontSuggestions();
      setBarcodeFontAccessStatus(`Loaded ${packagedFontFamilies.length} folder font${packagedFontFamilies.length === 1 ? "" : "s"}. Use the button if you also want fonts from this PC.`, "ready");
    } catch (error) {
      setBarcodeFontAccessStatus("The site could not read /fonts/manifest.json right now. The current PC font button still works where the browser allows it.", "warn");
    }
  }

  function normalizePackagedFontEntry(entry) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const family = safeTrim(entry.family);
    const file = safeTrim(entry.file);
    if (!family || !file) {
      return null;
    }

    return {
      family,
      file,
      weight: clampNumber(entry.weight, 100, 900, 400),
      style: safeTrim(entry.style).toLowerCase() === "italic" ? "italic" : "normal",
    };
  }

  function getFontFormat(fileName) {
    const lower = safeTrim(fileName).toLowerCase();
    if (lower.endsWith(".woff2")) return "woff2";
    if (lower.endsWith(".woff")) return "woff";
    if (lower.endsWith(".otf")) return "opentype";
    return "truetype";
  }

  function installPackagedFontFaces(entries) {
    const existing = document.getElementById("packagedBarcodeFontsStyle");
    if (existing) {
      existing.remove();
    }

    const style = document.createElement("style");
    style.id = "packagedBarcodeFontsStyle";
    style.textContent = entries.map((entry) => {
      const encodedFile = entry.file
        .split("/")
        .map((part) => encodeURIComponent(part))
        .join("/");
      return `
@font-face {
  font-family: "${entry.family.replace(/"/g, '\\"')}";
  src: url("./fonts/${encodedFile}") format("${getFontFormat(entry.file)}");
  font-weight: ${entry.weight};
  font-style: ${entry.style};
  font-display: swap;
}
      `.trim();
    }).join("\n\n");
    document.head.appendChild(style);
  }

  async function primeInstalledFontsIfPossible() {
    if (installedFontsLoaded || installedFontsLoading) {
      return;
    }

    if (typeof window.queryLocalFonts !== "function") {
      if (!packagedFontFamilies.length) {
        setBarcodeFontAccessStatus("This browser cannot list installed fonts automatically. You can still type any font name or use folder fonts online.", "warn");
      }
      return;
    }

    let permissionState = "";
    try {
      if (navigator.permissions && typeof navigator.permissions.query === "function") {
        const permission = await navigator.permissions.query({ name: "local-fonts" });
        permissionState = permission && typeof permission.state === "string" ? permission.state : "";
      }
    } catch (error) {
      permissionState = "";
    }

    if (permissionState === "granted") {
      await loadInstalledBarcodeFonts(false);
      return;
    }

    if (permissionState === "denied") {
      setBarcodeFontAccessStatus(packagedFontFamilies.length
        ? "Folder fonts are ready. This browser blocked installed-font access for this PC."
        : "Font access is blocked in this browser, so type the font name manually or use folder fonts online.", "warn");
      return;
    }

    if (!packagedFontFamilies.length) {
      setBarcodeFontAccessStatus("Folder fonts load from /fonts online. Click the button to list the fonts installed on this PC too.", "");
    }
  }

  async function loadInstalledBarcodeFonts(userRequested) {
    if (installedFontsLoading) {
      return;
    }

    if (typeof window.queryLocalFonts !== "function") {
      setBarcodeFontAccessStatus("This browser cannot list installed fonts automatically. You can still type any font name.", "warn");
      return;
    }

    installedFontsLoading = true;
    const idleLabel = "Load this PC fonts";
    refs.loadInstalledFontsButton.disabled = true;
    refs.loadInstalledFontsButton.textContent = "Loading fonts...";
    setBarcodeFontAccessStatus("Reading installed fonts from this PC...", "");

    try {
      const localFonts = await window.queryLocalFonts();
      installedFontFamilies = Array.from(new Set(
        localFonts
          .map((entry) => safeTrim(entry.family))
          .filter(Boolean),
      )).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));

      if (!installedFontFamilies.length) {
        setBarcodeFontAccessStatus("No installed font families were returned by this browser.", "warn");
        return;
      }

      refreshBarcodeFontSuggestions();
      installedFontsLoaded = true;
      setBarcodeFontAccessStatus(`Loaded ${installedFontFamilies.length} font families from this PC.${packagedFontFamilies.length ? ` Folder fonts loaded too: ${packagedFontFamilies.length}.` : ""}`, "ready");
    } catch (error) {
      const errorName = error instanceof Error ? error.name : "";
      if (errorName === "NotAllowedError") {
        setBarcodeFontAccessStatus(packagedFontFamilies.length
          ? "Installed-font access was denied. Your folder fonts still work."
          : "Font access was denied. Click again if you want to try the browser permission prompt once more.", "warn");
      } else if (errorName === "SecurityError") {
        setBarcodeFontAccessStatus(packagedFontFamilies.length
          ? "Installed-font access was blocked, but your folder fonts still work."
          : "This browser blocked local font access. You can still type the font name manually or use folder fonts online.", "warn");
      } else if (userRequested) {
        setBarcodeFontAccessStatus(packagedFontFamilies.length
          ? "The browser could not read this PC font list right now, but your folder fonts still work."
          : "The browser could not read installed fonts right now. You can still type the font name manually.", "warn");
      } else {
        setBarcodeFontAccessStatus("Click \"Load this PC fonts\" to try reading the fonts installed on this PC.", "");
      }
    } finally {
      installedFontsLoading = false;
      refs.loadInstalledFontsButton.disabled = false;
      refs.loadInstalledFontsButton.textContent = idleLabel;
    }
  }

  function pickPdfBaseFont(fontFamily, fontWeight) {
    const family = safeTrim(fontFamily).toLowerCase();
    const bold = Number(fontWeight) >= 600;

    if (family.includes("courier") || family.includes("consolas")) {
      return bold ? "Courier-Bold" : "Courier";
    }

    if (
      family.includes("times")
      || family.includes("georgia")
      || family.includes("cambria")
      || family.includes("palatino")
    ) {
      return bold ? "Times-Bold" : "Times-Roman";
    }

    return bold ? "Helvetica-Bold" : "Helvetica";
  }

  function buildVCard(values, extended) {
    const firstName = safeTrim(values.firstName);
    const lastName = safeTrim(values.lastName);
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (!fullName) {
      throw new Error("A vCard needs at least a first or last name.");
    }

    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${escapeVCard(lastName)};${escapeVCard(firstName)};;;`,
      `FN:${escapeVCard(fullName)}`,
    ];

    if (values.company) lines.push(`ORG:${escapeVCard(values.company)}`);
    if (values.title) lines.push(`TITLE:${escapeVCard(values.title)}`);
    if (values.mobile) lines.push(`TEL;TYPE=CELL:${normalizePhone(values.mobile)}`);
    if (values.workPhone) lines.push(`TEL;TYPE=WORK:${normalizePhone(values.workPhone)}`);
    if (values.email) lines.push(`EMAIL:${safeTrim(values.email)}`);
    if (values.website) lines.push(`URL:${normalizeHttpUrl(values.website)}`);

    if (extended) {
      const address = [values.address, values.city, values.zip, values.country].map(escapeVCard);
      if (address.some(Boolean)) {
        lines.push(`ADR;TYPE=WORK:;;${address[0]};${address[1]};;${address[2]};${address[3]}`);
      }
      if (values.birthday) lines.push(`BDAY:${values.birthday}`);
      if (values.notes) lines.push(`NOTE:${escapeVCard(values.notes)}`);
    }

    lines.push("END:VCARD");
    return lines.join("\n");
  }

  function buildMailto(values) {
    const email = safeTrim(values.email);
    if (!email) {
      throw new Error("An email QR needs an email address.");
    }

    const params = new URLSearchParams();
    if (values.subject) params.set("subject", values.subject);
    if (values.body) params.set("body", values.body);
    const query = params.toString();
    return `mailto:${email}${query ? `?${query}` : ""}`;
  }

  function buildSms(values) {
    const phone = normalizePhone(values.phone);
    if (!phone) {
      throw new Error("An SMS QR needs a phone number.");
    }
    return `SMSTO:${phone}:${safeTrim(values.message)}`;
  }

  function buildWifi(values) {
    const ssid = safeTrim(values.ssid);
    if (!ssid) {
      throw new Error("A WiFi QR needs an SSID.");
    }

    const security = values.security || "WPA";
    const hidden = values.hidden === true || values.hidden === "true";
    const password = security === "nopass" ? "" : escapeWifi(values.password || "");
    return `WIFI:T:${security};S:${escapeWifi(ssid)};${password ? `P:${password};` : ""}${hidden ? "H:true;" : ""};`;
  }

  function buildLabeledLinks(title, entries) {
    const lines = entries
      .filter(([, value]) => safeTrim(value))
      .map(([label, value]) => `${label}: ${normalizeHttpUrl(value)}`);

    if (!lines.length) {
      throw new Error("At least one link is required.");
    }

    if (lines.length === 1) {
      return lines[0].split(": ").slice(1).join(": ");
    }

    return [title, ...lines].join("\n");
  }

  function buildInstagramUrl(handle) {
    const raw = safeTrim(handle).replace(/^@/, "");
    if (!raw) {
      throw new Error("An Instagram QR needs a handle.");
    }
    return `https://instagram.com/${encodeURIComponent(raw)}`;
  }

  function buildMediaList(title, rawLines) {
    const items = splitLines(rawLines).map(normalizeHttpUrl).filter(Boolean);
    if (!items.length) {
      throw new Error(`At least one ${title.toLowerCase()} link is required.`);
    }
    return items.length === 1 ? items[0] : [title, ...items].join("\n");
  }

  function buildAppLinks(values) {
    const lines = [`APP: ${safeTrim(values.name) || "App"}`];
    if (values.website) lines.push(`Website: ${normalizeHttpUrl(values.website)}`);
    if (values.iosUrl) lines.push(`iOS: ${normalizeHttpUrl(values.iosUrl)}`);
    if (values.androidUrl) lines.push(`Android: ${normalizeHttpUrl(values.androidUrl)}`);
    return lines.join("\n");
  }

  function buildBusinessCard(values) {
    const lines = [`BUSINESS: ${safeTrim(values.name)}`];
    if (values.website) lines.push(`Website: ${normalizeHttpUrl(values.website)}`);
    if (values.phone) lines.push(`Phone: ${normalizePhone(values.phone)}`);
    if (values.email) lines.push(`Email: ${safeTrim(values.email)}`);
    if (values.address) lines.push(`Address: ${safeTrim(values.address)}`);
    if (values.hours) lines.push(`Hours: ${safeTrim(values.hours)}`);
    if (values.notes) lines.push(`Notes: ${normalizeLineEndings(values.notes).trim()}`);
    return lines.join("\n");
  }

  function buildCalendarEvent(values) {
    const title = safeTrim(values.title);
    const location = safeTrim(values.location);
    const start = formatDateTimeForIcs(values.start);
    const end = formatDateTimeForIcs(values.end);
    if (!title || !location || !start) {
      throw new Error("Event QR needs a title, location, and start time.");
    }

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Barcode QR Studio//EN",
      "BEGIN:VEVENT",
      `SUMMARY:${escapeIcs(values.title)}`,
      `DTSTART:${start}`,
      `LOCATION:${escapeIcs(values.location)}`,
    ];
    if (end) lines.push(`DTEND:${end}`);
    if (values.description) lines.push(`DESCRIPTION:${escapeIcs(values.description)}`);
    if (values.organizerEmail) lines.push(`ORGANIZER:mailto:${safeTrim(values.organizerEmail)}`);
    if (values.url) lines.push(`URL:${normalizeHttpUrl(values.url)}`);
    lines.push("END:VEVENT", "END:VCALENDAR");
    return lines.join("\n");
  }

  function buildGs1DigitalLink(values) {
    const base = normalizeHttpUrl(values.resolverUrl || "https://id.gs1.org").replace(/\/+$/, "");
    const gtinDigits = onlyDigits(values.gtin || "");
    if (gtinDigits.length !== 13 && gtinDigits.length !== 14) {
      throw new Error("GS1 Digital Link needs a 13 or 14 digit GTIN.");
    }

    const gtin14 = gtinDigits.length === 13 ? `0${gtinDigits}` : gtinDigits;
    const params = new URLSearchParams();
    if (values.batch) params.set("10", safeTrim(values.batch));
    if (values.serial) params.set("21", safeTrim(values.serial));
    if (values.expiry) params.set("17", formatDateForGs1(values.expiry));
    const query = params.toString();
    return `${base}/01/${gtin14}${query ? `?${query}` : ""}`;
  }

  function buildCouponPayload(values) {
    const lines = [];
    if (values.businessName) lines.push(`BUSINESS: ${safeTrim(values.businessName)}`);
    lines.push(`COUPON: ${safeTrim(values.offerTitle)}`);
    if (values.discount) lines.push(`DISCOUNT: ${safeTrim(values.discount)}`);
    if (values.couponCode) lines.push(`CODE: ${safeTrim(values.couponCode)}`);
    if (values.validUntil) lines.push(`VALID UNTIL: ${values.validUntil}`);
    if (values.url) lines.push(`LINK: ${normalizeHttpUrl(values.url)}`);
    return lines.join("\n");
  }

  function buildFeedbackPayload(values) {
    const lines = [];
    if (values.businessName) lines.push(`FEEDBACK FOR: ${safeTrim(values.businessName)}`);
    lines.push(`FORM: ${normalizeHttpUrl(values.url)}`);
    if (values.prompt) lines.push(`PROMPT: ${normalizeLineEndings(values.prompt).trim()}`);
    if (values.email) lines.push(`EMAIL: ${safeTrim(values.email)}`);
    return lines.join("\n");
  }

  function buildRatingPayload(values) {
    const lines = [];
    if (values.businessName) lines.push(`RATE: ${safeTrim(values.businessName)}`);
    if (values.platform) lines.push(`PLATFORM: ${safeTrim(values.platform)}`);
    lines.push(`LINK: ${normalizeHttpUrl(values.url)}`);
    if (values.message) lines.push(`MESSAGE: ${normalizeLineEndings(values.message).trim()}`);
    return lines.join("\n");
  }

  async function downloadSvg(output) {
    const svgText = output.mode === "qr"
      ? renderVectorSvg(output.model, { includeBackground: false })
      : output.svg;
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    triggerDownload(URL.createObjectURL(blob), `${output.fileBase}.svg`);
  }

  function downloadPdf(output) {
    const pdfString = createVectorPdf(output.model, {
      includeBackground: output.mode !== "qr",
    });
    const blob = new Blob([pdfString], { type: "application/pdf" });
    triggerDownload(URL.createObjectURL(blob), `${output.fileBase}.pdf`);
  }

  async function downloadPng(output) {
    const canvas = renderModelToCanvas(output.model, {
      includeBackground: false,
      scale: 3,
    });
    canvas.toBlob((pngBlob) => {
      if (!pngBlob) {
        return;
      }
      triggerDownload(URL.createObjectURL(pngBlob), `${output.fileBase}.png`);
    }, "image/png");
  }

  function renderModelToCanvas(model, renderOptions) {
    const scale = renderOptions && renderOptions.scale ? renderOptions.scale : 1;
    const includeBackground = !renderOptions || renderOptions.includeBackground !== false;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(model.width * scale);
    canvas.height = Math.ceil(model.height * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas could not be initialized.");
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.scale(scale, scale);
    context.imageSmoothingEnabled = false;

    if (includeBackground && model.background) {
      context.fillStyle = model.background;
      context.fillRect(0, 0, model.width, model.height);
    }

    for (const rect of model.rects) {
      context.fillStyle = rect.fill;
      context.fillRect(rect.x, rect.y, rect.width, rect.height);
    }

    for (const roundRect of model.roundRects || []) {
      context.fillStyle = roundRect.fill;
      fillCanvasRoundRect(context, roundRect.x, roundRect.y, roundRect.width, roundRect.height, roundRect.radius);
    }

    for (const circle of model.circles || []) {
      context.fillStyle = circle.fill;
      context.beginPath();
      context.arc(circle.cx, circle.cy, circle.r, 0, Math.PI * 2);
      context.fill();
    }

    for (const compoundPath of model.compoundPaths || []) {
      context.fillStyle = compoundPath.fill;
      context.beginPath();
      for (const shape of compoundPath.paths) {
        appendCanvasShapePath(context, shape);
      }
      context.fill("evenodd");
    }

    for (const textItem of model.texts) {
      context.fillStyle = textItem.fill || "#000000";
      context.font = `${textItem.fontWeight || 700} ${formatNumber(textItem.size)}px ${textItem.fontFamily || "Arial"}`;
      context.textAlign = textItem.anchor === "middle" ? "center" : (textItem.anchor === "end" ? "right" : "left");
      context.textBaseline = "alphabetic";
      context.fillText(textItem.text, textItem.x, textItem.y);
    }

    return canvas;
  }

  function createVectorPdf(model, pdfOptions) {
    const pageWidth = Math.max(1, Number(model.width));
    const pageHeight = Math.max(1, Number(model.height));
    const streamParts = [];
    const includeBackground = !pdfOptions || pdfOptions.includeBackground !== false;
    const fontResources = [];
    const fontMap = new Map();

    if (includeBackground && model.background) {
      streamParts.push(`${pdfColor(model.background)} rg 0 0 ${formatNumber(pageWidth)} ${formatNumber(pageHeight)} re f`);
    }

    for (const rect of model.rects) {
      const y = pageHeight - rect.y - rect.height;
      streamParts.push(`${pdfColor(rect.fill)} rg ${formatNumber(rect.x)} ${formatNumber(y)} ${formatNumber(rect.width)} ${formatNumber(rect.height)} re f`);
    }

    for (const roundRect of model.roundRects || []) {
      const y = pageHeight - roundRect.y - roundRect.height;
      streamParts.push(`${pdfColor(roundRect.fill)} rg ${pdfRoundRectPath(roundRect.x, y, roundRect.width, roundRect.height, roundRect.radius)} f`);
    }

    for (const circle of model.circles || []) {
      const cy = pageHeight - circle.cy;
      streamParts.push(`${pdfColor(circle.fill)} rg ${pdfCirclePath(circle.cx, cy, circle.r)} f`);
    }

    for (const compoundPath of model.compoundPaths || []) {
      const path = compoundPath.paths
        .map((shape) => pdfShapePath(shape, pageHeight))
        .join(" ");
      streamParts.push(`${pdfColor(compoundPath.fill)} rg ${path} f*`);
    }

    for (const textItem of model.texts) {
      const baseFont = pickPdfBaseFont(textItem.fontFamily, textItem.fontWeight);
      if (!fontMap.has(baseFont)) {
        const resourceName = `F${fontResources.length + 1}`;
        fontMap.set(baseFont, resourceName);
        fontResources.push({ baseFont, resourceName });
      }

      const fontSize = Number(textItem.size) || 12;
      const estimatedWidth = estimatePdfTextWidth(textItem.text, fontSize);
      let x = Number(textItem.x) || 0;
      if (textItem.anchor === "middle") {
        x -= estimatedWidth / 2;
      } else if (textItem.anchor === "end") {
        x -= estimatedWidth;
      }
      const baselineY = pageHeight - (Number(textItem.y) || 0);
      const resourceName = fontMap.get(baseFont) || "F1";
      streamParts.push(`BT /${resourceName} ${formatNumber(fontSize)} Tf ${pdfColor(textItem.fill || "#000000")} rg ${formatNumber(x)} ${formatNumber(baselineY)} Td (${escapePdfText(textItem.text)}) Tj ET`);
    }

    const contentStream = `${streamParts.join("\n")}\n`;
    const fontDictionary = fontResources
      .map((entry, index) => `/${entry.resourceName} ${index + 5} 0 R`)
      .join(" ");
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${formatNumber(pageWidth)} ${formatNumber(pageHeight)}] /Contents 4 0 R /Resources << /Font << ${fontDictionary} >> >> >>`,
      `<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`,
      ...fontResources.map((entry) => `<< /Type /Font /Subtype /Type1 /BaseFont /${entry.baseFont} >>`),
    ];

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    for (let index = 0; index < objects.length; index += 1) {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
    }

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let index = 1; index < offsets.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return pdf;
  }

  function fillCanvasRoundRect(context, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
    context.fill();
  }

  function appendCanvasShapePath(context, shape) {
    if (shape.type === "circle") {
      context.moveTo(shape.cx + shape.r, shape.cy);
      context.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
      return;
    }

    appendCanvasRoundRectPath(
      context,
      shape.x,
      shape.y,
      shape.width,
      shape.height,
      shape.radius || 0,
    );
  }

  function appendCanvasRoundRectPath(context, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    if (r === 0) {
      context.rect(x, y, width, height);
      return;
    }

    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }

  function pdfRoundRectPath(x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    if (!r) {
      return `${formatNumber(x)} ${formatNumber(y)} ${formatNumber(width)} ${formatNumber(height)} re`;
    }

    const k = 0.5522847498;
    const right = x + width;
    const top = y + height;
    const c = r * k;
    return [
      `${formatNumber(x + r)} ${formatNumber(y)} m`,
      `${formatNumber(right - r)} ${formatNumber(y)} l`,
      `${formatNumber(right - r + c)} ${formatNumber(y)} ${formatNumber(right)} ${formatNumber(y + r - c)} ${formatNumber(right)} ${formatNumber(y + r)} c`,
      `${formatNumber(right)} ${formatNumber(top - r)} l`,
      `${formatNumber(right)} ${formatNumber(top - r + c)} ${formatNumber(right - r + c)} ${formatNumber(top)} ${formatNumber(right - r)} ${formatNumber(top)} c`,
      `${formatNumber(x + r)} ${formatNumber(top)} l`,
      `${formatNumber(x + r - c)} ${formatNumber(top)} ${formatNumber(x)} ${formatNumber(top - r + c)} ${formatNumber(x)} ${formatNumber(top - r)} c`,
      `${formatNumber(x)} ${formatNumber(y + r)} l`,
      `${formatNumber(x)} ${formatNumber(y + r - c)} ${formatNumber(x + r - c)} ${formatNumber(y)} ${formatNumber(x + r)} ${formatNumber(y)} c`,
      "h",
    ].join(" ");
  }

  function pdfCirclePath(cx, cy, radius) {
    const k = 0.5522847498;
    const c = radius * k;
    return [
      `${formatNumber(cx + radius)} ${formatNumber(cy)} m`,
      `${formatNumber(cx + radius)} ${formatNumber(cy + c)} ${formatNumber(cx + c)} ${formatNumber(cy + radius)} ${formatNumber(cx)} ${formatNumber(cy + radius)} c`,
      `${formatNumber(cx - c)} ${formatNumber(cy + radius)} ${formatNumber(cx - radius)} ${formatNumber(cy + c)} ${formatNumber(cx - radius)} ${formatNumber(cy)} c`,
      `${formatNumber(cx - radius)} ${formatNumber(cy - c)} ${formatNumber(cx - c)} ${formatNumber(cy - radius)} ${formatNumber(cx)} ${formatNumber(cy - radius)} c`,
      `${formatNumber(cx + c)} ${formatNumber(cy - radius)} ${formatNumber(cx + radius)} ${formatNumber(cy - c)} ${formatNumber(cx + radius)} ${formatNumber(cy)} c`,
      "h",
    ].join(" ");
  }

  function pdfShapePath(shape, pageHeight) {
    if (shape.type === "circle") {
      return pdfCirclePath(shape.cx, pageHeight - shape.cy, shape.r);
    }

    return pdfRoundRectPath(
      shape.x,
      pageHeight - shape.y - shape.height,
      shape.width,
      shape.height,
      shape.radius || 0,
    );
  }

  function buildSvgCompoundPath(paths) {
    return paths.map((shape) => svgShapePath(shape)).join(" ");
  }

  function svgShapePath(shape) {
    if (shape.type === "circle") {
      return svgCirclePath(shape.cx, shape.cy, shape.r);
    }

    return svgRoundRectPath(shape.x, shape.y, shape.width, shape.height, shape.radius || 0);
  }

  function svgRoundRectPath(x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    if (r === 0) {
      return `M ${formatNumber(x)} ${formatNumber(y)} H ${formatNumber(x + width)} V ${formatNumber(y + height)} H ${formatNumber(x)} Z`;
    }

    return [
      `M ${formatNumber(x + r)} ${formatNumber(y)}`,
      `H ${formatNumber(x + width - r)}`,
      `A ${formatNumber(r)} ${formatNumber(r)} 0 0 1 ${formatNumber(x + width)} ${formatNumber(y + r)}`,
      `V ${formatNumber(y + height - r)}`,
      `A ${formatNumber(r)} ${formatNumber(r)} 0 0 1 ${formatNumber(x + width - r)} ${formatNumber(y + height)}`,
      `H ${formatNumber(x + r)}`,
      `A ${formatNumber(r)} ${formatNumber(r)} 0 0 1 ${formatNumber(x)} ${formatNumber(y + height - r)}`,
      `V ${formatNumber(y + r)}`,
      `A ${formatNumber(r)} ${formatNumber(r)} 0 0 1 ${formatNumber(x + r)} ${formatNumber(y)}`,
      "Z",
    ].join(" ");
  }

  function svgCirclePath(cx, cy, radius) {
    return [
      `M ${formatNumber(cx + radius)} ${formatNumber(cy)}`,
      `A ${formatNumber(radius)} ${formatNumber(radius)} 0 1 0 ${formatNumber(cx - radius)} ${formatNumber(cy)}`,
      `A ${formatNumber(radius)} ${formatNumber(radius)} 0 1 0 ${formatNumber(cx + radius)} ${formatNumber(cy)}`,
      "Z",
    ].join(" ");
  }

  function pdfColor(hexColor) {
    const color = hexToRgbNormalized(hexColor);
    return `${formatNumber(color.r)} ${formatNumber(color.g)} ${formatNumber(color.b)}`;
  }

  function hexToRgbNormalized(hexColor) {
    const value = safeTrim(hexColor || "").replace("#", "");
    const normalized = value.length === 3
      ? value.split("").map((part) => part + part).join("")
      : value;

    if (!/^[0-9a-f]{6}$/i.test(normalized)) {
      return { r: 0, g: 0, b: 0 };
    }

    return {
      r: parseInt(normalized.slice(0, 2), 16) / 255,
      g: parseInt(normalized.slice(2, 4), 16) / 255,
      b: parseInt(normalized.slice(4, 6), 16) / 255,
    };
  }

  function estimatePdfTextWidth(text, fontSize) {
    return String(text || "").length * fontSize * 0.56;
  }

  function escapePdfText(text) {
    return String(text || "")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  }

  function triggerDownload(url, fileName) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      return true;
    } finally {
      document.body.removeChild(textarea);
    }
  }

  function setStatusStrip(element, message, kind) {
    element.textContent = message;
    element.classList.remove("valid", "invalid");
    if (kind === "valid") element.classList.add("valid");
    if (kind === "invalid") element.classList.add("invalid");
  }

  function loadState() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (_error) {
      // Start fresh even when storage is unavailable.
    }
    return createDefaultState();
  }

  function persistState() {
    // Session state stays in memory only. Every new open starts fresh.
  }

  function createDefaultState() {
    const qrValues = {};
    for (const type of QR_TYPES) {
      qrValues[type.id] = getDefaultValuesForType(type.id);
    }

    return {
      activeMode: "qr",
      theme: "light",
      barcode: {
        digits: "3812345678908",
        label: "barcode-item",
        moduleWidth: 3,
        barHeight: 132,
        quietZone: 11,
        textSize: 28,
        fontFamily: BARCODE_FONT_FAMILY,
        fontWeight: 400,
      },
      qr: {
        type: "website",
        style: {
          ecc: "M",
          shape: "square",
          corner: "square",
          frame: "none",
          logo: "none",
          cornerColorMode: "main",
          cornerColor: "#14213d",
          backgroundColor: "#ffffff",
          cellSize: 8,
          margin: 24,
          darkColor: "#14213d",
        },
        values: qrValues,
      },
    };
  }

  function getDefaultValuesForType(typeId) {
    const type = qrTypeMap[typeId];
    const values = {};
    for (const field of type.fields) {
      const initial = typeof field.transformDefault === "function"
        ? field.transformDefault(field.defaultValue)
        : field.defaultValue;
      values[field.key] = initial !== undefined ? initial : defaultValueForFieldType(field.type);
    }
    return values;
  }

  function defaultValueForFieldType(type) {
    return type === "checkbox" ? false : "";
  }

  function readFieldValue(element) {
    if (element instanceof HTMLSelectElement) {
      if (element.getAttribute("data-qr-field")) {
        const fieldDefinition = qrTypeMap[state.qr.type].fields.find((field) => field.key === element.getAttribute("data-qr-field"));
        if (fieldDefinition && fieldDefinition.type === "checkbox") {
          return element.value === "true";
        }
      }
      return element.value;
    }

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element.value;
    }

    return "";
  }

  function atLeastOneFilled(values, keys, message) {
    return keys.some((key) => safeTrim(values[key])) ? "" : message;
  }

  function normalizeHttpUrl(value) {
    const trimmed = safeTrim(value);
    if (!trimmed) {
      return "";
    }

    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    let parsed;
    try {
      parsed = new URL(candidate);
    } catch (_error) {
      throw new Error("Enter a valid web address.");
    }

    if (!/^https?:$/i.test(parsed.protocol) || !parsed.hostname) {
      throw new Error("Use a full website address such as https://example.com.");
    }

    return parsed.toString();
  }

  function normalizePhone(value) {
    return safeTrim(value).replace(/[^\d+]/g, "");
  }

  function formatDateTimeForIcs(value) {
    const trimmed = safeTrim(value);
    if (!trimmed) {
      return "";
    }

    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!match) {
      return "";
    }

    return `${match[1]}${match[2]}${match[3]}T${match[4]}${match[5]}00`;
  }

  function formatDateForGs1(value) {
    const trimmed = safeTrim(value);
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return "";
    }
    return `${match[1].slice(2)}${match[2]}${match[3]}`;
  }

  function escapeVCard(value) {
    return normalizeLineEndings(value)
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  }

  function escapeIcs(value) {
    return normalizeLineEndings(value)
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function escapeWifi(value) {
    return safeTrim(value)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/:/g, "\\:");
  }

  function splitLines(value) {
    return normalizeLineEndings(value)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function normalizeLineEndings(value) {
    return String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function safeTrim(value) {
    return String(value || "").trim();
  }

  function clampNumber(value, min, max, fallback) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, numeric));
  }

  function slugify(value) {
    return safeTrim(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "generated-code";
  }

  function formatNumber(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return "0";
    }
    return numeric.toFixed(3).replace(/\.?0+$/, "");
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return String(value).replace(/"/g, "&quot;");
  }
})();

