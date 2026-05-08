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
        { key: "firstName", label: "First name", type: "text", required: true, defaultValue: "Anna", placeholder: "First name" },
        { key: "lastName", label: "Last name", type: "text", required: true, defaultValue: "Kovacs", placeholder: "Last name" },
        { key: "mobile", label: "Mobile number", type: "tel", defaultValue: "+36123456789", placeholder: "Mobile number", span: 2 },
        { key: "phone", label: "Phone", type: "tel", defaultValue: "+3615550022", placeholder: "Phone" },
        { key: "fax", label: "Fax", type: "tel", defaultValue: "+3615550099", placeholder: "Fax" },
        { key: "email", label: "Email", type: "email", defaultValue: "anna@example.com", placeholder: "your@email.com", span: 2 },
        { key: "company", label: "Company", type: "text", defaultValue: "Northline Trade", placeholder: "Company" },
        { key: "title", label: "Job title", type: "text", defaultValue: "Sales Director", placeholder: "Your job" },
        { key: "address", label: "Street", type: "text", defaultValue: "12 River Park Road", placeholder: "Street", span: 2 },
        { key: "city", label: "City", type: "text", defaultValue: "Budapest", placeholder: "City" },
        { key: "zip", label: "ZIP", type: "text", defaultValue: "1054", placeholder: "ZIP" },
        { key: "state", label: "State", type: "text", defaultValue: "Budapest", placeholder: "State", span: 2 },
        { key: "country", label: "Country", type: "text", defaultValue: "Hungary", placeholder: "Country", span: 2 },
        { key: "website", label: "Website", type: "url", defaultValue: "https://example.com", placeholder: "www.your-website.com", span: 2 },
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
        {
          key: "ssid",
          label: "Network name (SSID)",
          type: "text",
          required: true,
          defaultValue: "OfficeNet-5G",
          hint: "This becomes the S field in the WiFi QR payload.",
        },
        {
          key: "security",
          label: "Security type",
          type: "select",
          required: true,
          defaultValue: "WPA",
          options: [
            { value: "WPA", label: "WPA / WPA2 / WPA3 Personal" },
            { value: "WEP", label: "WEP" },
            { value: "WPA2-EAP", label: "WPA2-EAP / Enterprise" },
            { value: "nopass", label: "No password" },
          ],
        },
        {
          key: "password",
          label: "Password",
          type: "text",
          defaultValue: "VerySecurePass123",
          hint: "Ignored for open networks. Kept as the P field for WPA or WEP.",
        },
        {
          key: "hidden",
          label: "Hidden network",
          type: "checkbox",
          defaultValue: false,
          hint: "Adds H:true for hidden SSIDs.",
        },
        {
          key: "eap",
          label: "EAP method",
          type: "text",
          defaultValue: "TTLS",
          hint: "Only used for WPA2-EAP enterprise WiFi.",
        },
        {
          key: "identity",
          label: "Identity / username",
          type: "text",
          defaultValue: "warehouse.user",
          hint: "Only used for WPA2-EAP enterprise WiFi.",
        },
        {
          key: "anonymousIdentity",
          label: "Anonymous identity",
          type: "text",
          defaultValue: "",
          hint: "Optional A field for WPA2-EAP enterprise WiFi.",
        },
        {
          key: "phase2",
          label: "Phase 2 method",
          type: "text",
          defaultValue: "MSCHAPV2",
          hint: "Optional PH2 field for WPA2-EAP enterprise WiFi.",
        },
      ],
      validate(values) {
        return validateWifi(values);
      },
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
  const BARCODE_PROTECTED_RATIO = 0.64;
  const DEFAULT_BARCODE_ART_SHAPE_ID = "rooted-tree";
  const BARCODE_ART_PREVIEW_BITS = "101011001011010110010110100101";
  const BARCODE_ART_CATEGORY_LABELS = {
    nature: "Nature",
    sea: "Sea & Fish",
    city: "City & Story",
    product: "Food & Product",
    playful: "Playful",
  };
  const BARCODE_ART_SHAPES = [
    createBarcodeArtShape("rooted-tree", "Rooted Tree", "nature", "Branches above, root-like bars below.", ["tree", "roots", "organic", "eco"], buildRootedTreeProfile, decorateRootedTree),
    createBarcodeArtShape("forest-hills", "Forest Hills", "nature", "Rolling hills with a small treeline story.", ["forest", "hill", "landscape", "trees"], buildForestHillsProfile, decorateForestHills),
    createBarcodeArtShape("umbrella-rain", "Umbrella Rain", "nature", "A clean dome with rain and a curved handle.", ["umbrella", "rain", "weather"], buildUmbrellaRainProfile, decorateUmbrellaRain),
    createBarcodeArtShape("mountain-cabin", "Mountain Cabin", "nature", "Peaks with a tiny cabin tucked into the barcode.", ["mountain", "cabin", "outdoor"], buildMountainCabinProfile, decorateMountainCabin),
    createBarcodeArtShape("meadow-arch", "Meadow Arch", "nature", "Soft arch bars with floral line-work above.", ["meadow", "floral", "garden"], buildMeadowArchProfile, decorateMeadowArch),
    createBarcodeArtShape("tuna-fish", "Tuna Fish", "sea", "Fish body formed by the bars with fin accents.", ["fish", "tuna", "seafood", "ocean"], buildTunaFishProfile, decorateTunaFish),
    createBarcodeArtShape("whale-splash", "Whale Splash", "sea", "A whale curve with a soft splash on top.", ["whale", "splash", "marine"], buildWhaleSplashProfile, decorateWhaleSplash),
    createBarcodeArtShape("fisherman-lake", "Fisherman Lake", "sea", "Wave-shaped bars with a boat and fishing line.", ["fishing", "boat", "lake", "waves"], buildFishermanLakeProfile, decorateFishermanLake),
    createBarcodeArtShape("ocean-swell", "Ocean Swell", "sea", "Sea birds and fish over tall rolling bars.", ["ocean", "swell", "birds", "fish"], buildOceanSwellProfile, decorateOceanSwell),
    createBarcodeArtShape("harbor-birds", "Harbor Birds", "sea", "A calmer horizon with gulls and water marks.", ["harbor", "gulls", "coast"], buildHarborBirdsProfile, decorateHarborBirds),
    createBarcodeArtShape("castle-skyline", "Castle Skyline", "city", "Tall storybook towers above the bars.", ["castle", "skyline", "towers"], buildCastleSkylineProfile, decorateCastleSkyline),
    createBarcodeArtShape("clock-tower", "Clock Tower", "city", "A centered tower silhouette with small wings.", ["clock", "tower", "city"], buildClockTowerProfile, decorateClockTower),
    createBarcodeArtShape("roofline-home", "Roofline Home", "city", "Simple rooftops and a warm neighborhood feel.", ["roof", "home", "house"], buildRooflineHomeProfile, decorateRooflineHome),
    createBarcodeArtShape("cathedral-peak", "Cathedral Peak", "city", "Sharp central peaks for more dramatic packaging.", ["cathedral", "spires", "gothic"], buildCathedralPeakProfile, decorateCathedralPeak),
    createBarcodeArtShape("bridge-rail", "Bridge Rail", "city", "Bold crossbars for a graphic bridge look.", ["bridge", "rail", "graphic"], buildBridgeRailProfile, decorateBridgeRail),
    createBarcodeArtShape("pizza-slice", "Pizza Slice", "product", "A pizza wedge and crust over retail bars.", ["pizza", "food", "slice"], buildPizzaSliceProfile, decoratePizzaSlice),
    createBarcodeArtShape("coffee-steam", "Coffee Steam", "product", "Cup silhouette with soft steam lines.", ["coffee", "cup", "steam"], buildCoffeeSteamProfile, decorateCoffeeSteam),
    createBarcodeArtShape("bottle-neck", "Bottle Neck", "product", "Bottle shoulders and cap in a clean package shape.", ["bottle", "beverage", "drink"], buildBottleNeckProfile, decorateBottleNeck),
    createBarcodeArtShape("headphones-arch", "Headphones Arch", "playful", "Rounded arch with ear-cup accents.", ["headphones", "music", "audio"], buildHeadphonesArchProfile, decorateHeadphonesArch),
    createBarcodeArtShape("clapperboard", "Clapperboard", "playful", "Film-slate top with a sharper barcode rhythm.", ["clapperboard", "film", "cinema"], buildClapperboardProfile, decorateClapperboard),
  ];
  const BARCODE_ART_CATEGORIES = [
    { id: "all", label: "All" },
    ...Object.entries(BARCODE_ART_CATEGORY_LABELS).map(([id, label]) => ({ id, label })),
  ];
  const barcodeArtShapeMap = Object.fromEntries(BARCODE_ART_SHAPES.map((shape) => [shape.id, shape]));
  const BARCODE_GROUPS = [
    { id: "ean-upc", label: "EAN / UPC" },
    { id: "linear", label: "Linear codes" },
    { id: "postal", label: "Postal codes" },
  ];
  const BARCODE_FORMATS = [
    {
      id: "ean13",
      group: "ean-upc",
      label: "EAN-13",
      valueLabel: "EAN-13 digits",
      placeholder: "3812345678908",
      hint: "Use 12 digits to auto-complete, or 13 to validate.",
      description: "Retail-ready EAN-13 with automatic check-digit handling.",
      submitLabel: "Generate EAN 13",
      exampleValue: "3812345678908",
      inputMode: "numeric",
      supportsArt: true,
    },
    {
      id: "ean8",
      group: "ean-upc",
      label: "EAN-8",
      valueLabel: "EAN-8 digits",
      placeholder: "55123457",
      hint: "Use 7 digits to auto-complete, or 8 to validate.",
      description: "Compact retail code for smaller products.",
      submitLabel: "Generate EAN 8",
      exampleValue: "5512345",
      inputMode: "numeric",
      supportsArt: true,
    },
    {
      id: "upca",
      group: "ean-upc",
      label: "UPC-A",
      valueLabel: "UPC-A digits",
      placeholder: "036000291452",
      hint: "Use 11 digits to auto-complete, or 12 to validate.",
      description: "North American retail barcode with outside guard digits.",
      submitLabel: "Generate UPC A",
      exampleValue: "03600029145",
      inputMode: "numeric",
      supportsArt: true,
    },
    {
      id: "code128",
      group: "linear",
      label: "Code 128",
      valueLabel: "Code 128 text",
      placeholder: "ORD-2026-0042",
      hint: "Supports upper/lowercase letters, numbers, spaces, and symbols.",
      description: "Dense general-purpose barcode with automatic Code B and Code C switching.",
      submitLabel: "Generate Code 128",
      exampleValue: "ORD-2026-0042",
      inputMode: "text",
      supportsArt: true,
    },
    {
      id: "code39",
      group: "linear",
      label: "Code 39",
      valueLabel: "Code 39 text",
      placeholder: "LOT-39-204",
      hint: "Uppercase letters, digits, space, and - . $ / + % are supported.",
      description: "Wide-reader-compatible alphanumeric barcode.",
      submitLabel: "Generate Code 39",
      exampleValue: "LOT-39-204",
      inputMode: "text",
      supportsArt: true,
    },
    {
      id: "itf14",
      group: "linear",
      label: "ITF-14",
      valueLabel: "ITF-14 digits",
      placeholder: "15400141288767",
      hint: "Use 13 digits to auto-complete, or 14 to validate.",
      description: "Carton and shipping barcode with Interleaved 2 of 5 encoding.",
      submitLabel: "Generate ITF 14",
      exampleValue: "1540014128876",
      inputMode: "numeric",
      supportsArt: true,
    },
    {
      id: "postnet5",
      group: "postal",
      label: "USPS POSTNET 5",
      valueLabel: "ZIP code",
      placeholder: "90210",
      hint: "Exactly 5 digits. The check digit is added automatically.",
      description: "USPS ZIP barcode for 5-digit postal routing.",
      submitLabel: "Generate POSTNET 5",
      exampleValue: "90210",
      inputMode: "numeric",
      supportsArt: false,
    },
    {
      id: "postnet9",
      group: "postal",
      label: "USPS POSTNET 9",
      valueLabel: "ZIP + 4",
      placeholder: "205001234",
      hint: "Exactly 9 digits. The check digit is added automatically.",
      description: "USPS ZIP+4 barcode for extended routing.",
      submitLabel: "Generate POSTNET 9",
      exampleValue: "205001234",
      inputMode: "numeric",
      supportsArt: false,
    },
    {
      id: "postnet11",
      group: "postal",
      label: "USPS POSTNET 11",
      valueLabel: "Delivery point",
      placeholder: "20500123411",
      hint: "Exactly 11 digits. The check digit is added automatically.",
      description: "USPS delivery-point barcode for mail routing detail.",
      submitLabel: "Generate POSTNET 11",
      exampleValue: "20500123411",
      inputMode: "numeric",
      supportsArt: false,
    },
  ];
  const barcodeGroupMap = Object.fromEntries(BARCODE_GROUPS.map((group) => [group.id, group]));
  const barcodeFormatMap = Object.fromEntries(BARCODE_FORMATS.map((format) => [format.id, format]));
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
    { id: "globe", label: "Globe", note: "Web mark" },
    { id: "scan", label: "Scan", note: "Bigger callout" },
    { id: "focus", label: "Focus", note: "Target" },
    { id: "type", label: "Text", note: "Custom letters" },
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
  const CODE39_CHARACTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. *$/+%";
  const CODE39_PATTERNS = [
    "111221211", "211211112", "112211112", "212211111", "111221112", "211221111", "112221111", "111211212",
    "211211211", "112211211", "211112112", "112112112", "212112111", "111122112", "211122111", "112122111",
    "111112212", "211112211", "112112211", "111122211", "211111122", "112111122", "212111121", "111121122",
    "211121121", "112121121", "111111222", "211111221", "112111221", "111121221", "221111112", "122111112",
    "222111111", "121121112", "221121111", "122121111", "121111212", "221111211", "122111211", "121121211",
    "121212111", "121211121", "121112121", "111212121",
  ];
  const CODE39_PATTERN_MAP = Object.fromEntries(
    CODE39_CHARACTERS.split("").map((character, index) => [character, CODE39_PATTERNS[index]]),
  );
  const ITF_PATTERNS = {
    0: "00110",
    1: "10001",
    2: "01001",
    3: "11000",
    4: "00101",
    5: "10100",
    6: "01100",
    7: "00011",
    8: "10010",
    9: "01010",
  };
  const POSTNET_PATTERNS = {
    0: "11000",
    1: "00011",
    2: "00101",
    3: "00110",
    4: "01001",
    5: "01010",
    6: "01100",
    7: "10001",
    8: "10010",
    9: "10100",
  };
  const CODE128_PATTERNS = [
    "11011001100", "11001101100", "11001100110", "10010011000", "10010001100", "10001001100", "10011001000",
    "10011000100", "10001100100", "11001001000", "11001000100", "11000100100", "10110011100", "10011011100",
    "10011001110", "10111001100", "10011101100", "10011100110", "11001110010", "11001011100", "11001001110",
    "11011100100", "11001110100", "11101101110", "11101001100", "11100101100", "11100100110", "11101100100",
    "11100110100", "11100110010", "11011011000", "11011000110", "11000110110", "10100011000", "10001011000",
    "10001000110", "10110001000", "10001101000", "10001100010", "11010001000", "11000101000", "11000100010",
    "10110111000", "10110001110", "10001101110", "10111011000", "10111000110", "10001110110", "11101110110",
    "11010001110", "11000101110", "11011101000", "11011100010", "11011101110", "11101011000", "11101000110",
    "11100010110", "11101101000", "11101100010", "11100011010", "11101111010", "11001000010", "11110001010",
    "10100110000", "10100001100", "10010110000", "10010000110", "10000101100", "10000100110", "10110010000",
    "10110000100", "10011010000", "10011000010", "10000110100", "10000110010", "11000010010", "11001010000",
    "11110111010", "11000010100", "10001111010", "10100111100", "10010111100", "10010011110", "10111100100",
    "10011110100", "10011110010", "11110100100", "11110010100", "11110010010", "11011011110", "11011110110",
    "11110110110", "10101111000", "10100011110", "10001011110", "10111101000", "10111100010", "11110101000",
    "11110100010", "10111011110", "10111101110", "11101011110", "11110101110", "11010000100", "11010010000",
    "11010011100", "1100011101011",
  ];
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
    barcodeSectionTitle: document.getElementById("barcodeSectionTitle"),
    barcodeSectionNote: document.getElementById("barcodeSectionNote"),
    barcodeFormat: document.getElementById("barcodeFormat"),
    barcodeFormatHint: document.getElementById("barcodeFormatHint"),
    barcodeValueLabel: document.getElementById("barcodeValueLabel"),
    barcodeValueHint: document.getElementById("barcodeValueHint"),
    barcodeDigits: document.getElementById("barcodeDigits"),
    barcodeLabel: document.getElementById("barcodeLabel"),
    barcodeModuleWidth: document.getElementById("barcodeModuleWidth"),
    barcodeHeight: document.getElementById("barcodeHeight"),
    barcodeQuietZone: document.getElementById("barcodeQuietZone"),
    barcodeTextSize: document.getElementById("barcodeTextSize"),
    barcodeFontFamily: document.getElementById("barcodeFontFamily"),
    barcodeFontWeight: document.getElementById("barcodeFontWeight"),
    barcodeSubmitButton: document.getElementById("barcodeSubmitButton"),
    loadInstalledFontsButton: document.getElementById("loadInstalledFontsButton"),
    barcodeFontAccessStatus: document.getElementById("barcodeFontAccessStatus"),
    barcodeArtBlock: document.getElementById("barcodeArtBlock"),
    barcodeArtDetails: document.getElementById("barcodeArtDetails"),
    barcodeArtModeRow: document.getElementById("barcodeArtModeRow"),
    barcodeShapeHeight: document.getElementById("barcodeShapeHeight"),
    barcodeProtectedLaneOutput: document.getElementById("barcodeProtectedLaneOutput"),
    barcodeArtStatus: document.getElementById("barcodeArtStatus"),
      barcodeShapeUpload: document.getElementById("barcodeShapeUpload"),
    clearBarcodeShapeUploadButton: document.getElementById("clearBarcodeShapeUploadButton"),
    barcodeShapeUploadStatus: document.getElementById("barcodeShapeUploadStatus"),
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
    qrFrameTextFields: document.getElementById("qrFrameTextFields"),
    qrLogoGrid: document.getElementById("qrLogoGrid"),
    qrLogoTextFields: document.getElementById("qrLogoTextFields"),
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
  };

  let state = loadState();
  let heroMoodIndex = 0;
  const outputs = {
    barcode: null,
    qr: null,
  };
  const barcodeArtProfileCache = new Map();
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
    renderBarcodeFormatSelectors();
    renderQrTypeSelectors();
    renderQrTypeGrid();
    renderQrDesignControls();
    renderBarcodeArtControls();
    hydrateStaticForms();
    renderQrDynamicFields();
    bindEvents();
    updateModeUI();
    updateBarcodeStatus();
    generateBarcode(false);
    generateQr(false);
    renderCurrentModeOutput();
    primeInstalledFontsIfPossible();
  }

  function bindEvents() {
    refs.barcodeModeButton.addEventListener("click", () => {
      activateMode("barcode", true);
    });

    refs.qrModeButton.addEventListener("click", () => {
      activateMode("qr", true);
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
      refs.barcodeDigits.value = normalizeBarcodeInputValue(getActiveBarcodeFormat(), refs.barcodeDigits.value);
      state.barcode.digits = refs.barcodeDigits.value;
      persistState();
      updateBarcodeStatus();
    });

    refs.barcodeFormat.addEventListener("change", () => {
      state.barcode.format = pickBarcodeFormatId(refs.barcodeFormat.value);
      state.barcode.group = getActiveBarcodeFormat().group;
      applyBarcodeFormatDefaults(true);
    });

    refs.barcodeLabel.addEventListener("input", () => {
      state.barcode.label = refs.barcodeLabel.value;
      persistState();
    });

    refs.barcodeModuleWidth.addEventListener("input", syncBarcodeSettingsFromForm);
    refs.barcodeHeight.addEventListener("input", syncBarcodeSettingsFromForm);
    refs.barcodeQuietZone.addEventListener("input", syncBarcodeSettingsFromForm);
    refs.barcodeTextSize.addEventListener("input", syncBarcodeSettingsFromForm);
    refs.barcodeFontFamily.addEventListener("change", syncBarcodeSettingsFromForm);
    refs.barcodeFontWeight.addEventListener("input", syncBarcodeSettingsFromForm);
    refs.barcodeShapeHeight.addEventListener("input", () => {
      syncBarcodeSettingsFromForm();
      generateBarcode(false);
    });
    refs.loadInstalledFontsButton.addEventListener("click", async (event) => {
      blurTriggerButton(event);
      await loadInstalledBarcodeFonts(true);
    });
    refs.barcodeArtModeRow.addEventListener("click", handleBarcodeArtModeClick);
    refs.barcodeShapeUpload.addEventListener("change", handleBarcodeShapeUpload);
    refs.clearBarcodeShapeUploadButton.addEventListener("click", clearUploadedBarcodeShape);

    refs.barcodeForm.addEventListener("submit", (event) => {
      event.preventDefault();
      generateBarcode(true);
      state.activeMode = "barcode";
      persistState();
      updateModeUI();
      renderCurrentModeOutput();
    });

    refs.barcodeExampleButton.addEventListener("click", () => {
      const preservedFormat = state.barcode.format;
      state.barcode = createDefaultState().barcode;
      state.barcode.format = pickBarcodeFormatId(preservedFormat);
      state.barcode.group = getActiveBarcodeFormat().group;
      state.barcode.digits = getActiveBarcodeFormat().exampleValue;
      hydrateStaticForms();
      updateBarcodeStatus();
      renderBarcodeArtControls();
      generateBarcode(true);
      persistState();
    });

    refs.barcodeResetButton.addEventListener("click", () => {
      const preservedFormat = state.barcode.format;
      state.barcode = createDefaultState().barcode;
      state.barcode.format = pickBarcodeFormatId(preservedFormat);
      state.barcode.group = getActiveBarcodeFormat().group;
      outputs.barcode = null;
      hydrateStaticForms();
      updateBarcodeStatus();
      renderBarcodeArtControls();
      persistState();
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
      state.qr.values[state.qr.type] = clone(getBlankValuesForType(state.qr.type));
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
  }

  function hydrateStaticForms() {
    renderBarcodeFormatSelectors();
    refs.barcodeDigits.value = state.barcode.digits;
    refs.barcodeLabel.value = state.barcode.label;
    refs.barcodeModuleWidth.value = state.barcode.moduleWidth;
    refs.barcodeHeight.value = state.barcode.barHeight;
    refs.barcodeQuietZone.value = state.barcode.quietZone;
    refs.barcodeTextSize.value = state.barcode.textSize;
    ensureBarcodeFontSelection(state.barcode.fontFamily);
    refs.barcodeFontWeight.value = state.barcode.fontWeight;
    refs.barcodeShapeHeight.value = state.barcode.art.shapeHeightPercent;
    refs.barcodeShapeUpload.value = "";
    renderBarcodeFormatMeta();
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
    renderBarcodeArtControls();
  }

  function renderBarcodeFormatSelectors() {
    state.barcode.format = pickBarcodeFormatId(state.barcode.format);
    state.barcode.group = getActiveBarcodeFormat().group;
    refs.barcodeFormat.innerHTML = BARCODE_GROUPS.map((group) => {
      const options = getBarcodeFormatsForGroup(group.id)
        .map((format) => {
          const selected = format.id === state.barcode.format ? "selected" : "";
          return `<option value="${escapeAttribute(format.id)}" ${selected}>${escapeHtml(format.label)}</option>`;
        })
        .join("");
      return `<optgroup label="${escapeAttribute(group.label)}">${options}</optgroup>`;
    }).join("");
  }

  function renderBarcodeFormatMeta() {
    const format = getActiveBarcodeFormat();
    refs.barcodeSectionTitle.textContent = `${format.label} barcode setup`;
    refs.barcodeSectionNote.textContent = format.description;
    refs.barcodeFormatHint.textContent = format.description;
    refs.barcodeValueLabel.textContent = format.valueLabel;
    refs.barcodeValueHint.textContent = format.hint;
    refs.barcodeDigits.placeholder = format.placeholder;
    refs.barcodeDigits.setAttribute("inputmode", format.inputMode === "numeric" ? "numeric" : "text");
    refs.barcodeDigits.setAttribute("maxlength", getBarcodeInputMaxLength(format).toString());
    refs.barcodeDigits.value = normalizeBarcodeInputValue(format, refs.barcodeDigits.value);
    refs.barcodeSubmitButton.textContent = format.submitLabel;
    refs.barcodeArtBlock.classList.toggle("disabled", !format.supportsArt);
  }

  function getBarcodeFormatsForGroup(groupId) {
    return BARCODE_FORMATS.filter((format) => format.group === groupId);
  }

  function pickBarcodeFormatId(formatId) {
    return barcodeFormatMap[formatId] ? formatId : BARCODE_FORMATS[0].id;
  }

  function getActiveBarcodeFormat() {
    return barcodeFormatMap[state.barcode.format] || BARCODE_FORMATS[0];
  }

  function getBarcodeInputMaxLength(format) {
    switch (format.id) {
      case "ean13":
        return 13;
      case "ean8":
        return 8;
      case "upca":
        return 12;
      case "itf14":
        return 14;
      case "postnet5":
        return 5;
      case "postnet9":
        return 9;
      case "postnet11":
        return 11;
      case "code39":
        return 48;
      case "code128":
        return 64;
      default:
        return 80;
    }
  }

  function normalizeBarcodeInputValue(format, value) {
    const maxLength = getBarcodeInputMaxLength(format);
    if (format.inputMode === "numeric") {
      return onlyDigits(value).slice(0, maxLength);
    }
    const trimmed = String(value || "").slice(0, maxLength);
    return format.id === "code39" ? trimmed.toUpperCase() : trimmed;
  }

  function applyBarcodeFormatDefaults(regenerate) {
    const format = getActiveBarcodeFormat();
    state.barcode.group = format.group;
    state.barcode.digits = "";
    refs.barcodeDigits.value = "";
    outputs.barcode = null;
    persistState();
    renderBarcodeFormatSelectors();
    renderBarcodeFormatMeta();
    updateBarcodeStatus();
    renderBarcodeArtControls();
    if (regenerate) {
      if (state.activeMode === "barcode") {
        renderCurrentModeOutput();
      }
    }
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
    renderQrFrameTextFields();
    refs.qrLogoGrid.innerHTML = renderDesignButtonMarkup(QR_LOGO_OPTIONS, state.qr.style.logo, "logo", renderLogoPreview);
    renderQrLogoTextFields();
  }

  function renderQrFrameTextFields() {
    const frame = state.qr.style.frame;
    if (frame === "none") {
      refs.qrFrameTextFields.innerHTML = "";
      return;
    }

    const texts = getQrFrameTexts();
    const showTop = frame === "scan-top-bottom" || frame === "ticket";
    const showBottom = frame === "scan-bottom" || frame === "scan-top-bottom" || frame === "badge";
    const fields = [];

    if (showTop) {
      fields.push(`
        <label class="field">
          <span>Top frame text</span>
          <input
            id="qrFrameTopText"
            name="qrFrameTopText"
            type="text"
            maxlength="42"
            autocomplete="off"
            value="${escapeAttribute(texts.top)}"
            placeholder="OPEN"
            data-qr-frame-text="top"
          >
            <small class="field-hint">Longer text can wrap into two lines. Try OPEN, WIFI, MENU, or INFO.</small>
        </label>
      `);
    }

    if (showBottom) {
      fields.push(`
        <label class="field">
          <span>Bottom frame text</span>
          <input
            id="qrFrameBottomText"
            name="qrFrameBottomText"
            type="text"
            maxlength="42"
            autocomplete="off"
            value="${escapeAttribute(texts.bottom)}"
            placeholder="SCAN ME"
            data-qr-frame-text="bottom"
          >
            <small class="field-hint">Use a clear call to action like SCAN ME, TAP HERE, or CONNECT.</small>
        </label>
      `);
    }

    refs.qrFrameTextFields.innerHTML = fields.join("");
    refs.qrFrameTextFields.querySelectorAll("[data-qr-frame-text]").forEach((input) => {
      input.addEventListener("input", handleQrFrameTextChange);
    });
  }

  function renderQrLogoTextFields() {
    const logo = state.qr.style.logo;
    if (logo !== "type" && logo !== "scan") {
      refs.qrLogoTextFields.innerHTML = "";
      return;
    }

    const isScanLogo = logo === "scan";
    const currentValue = safeTrim(state.qr.style.logoText) || (isScanLogo ? "SCAN ME" : "");
    refs.qrLogoTextFields.innerHTML = `
      <label class="field">
        <span>Center logo text</span>
        <input
          id="qrLogoTypeText"
          name="qrLogoTypeText"
          type="text"
          maxlength="16"
          autocomplete="off"
          value="${escapeAttribute(currentValue)}"
          placeholder="${isScanLogo ? "SCAN ME" : "MENU"}"
          data-qr-logo-text="${escapeAttribute(logo)}"
        >
        <small class="field-hint">${isScanLogo ? "Write your call to action here. Bigger words split into two lines automatically." : "Write up to 16 characters. Longer words split into two lines automatically."}</small>
      </label>
    `;
    refs.qrLogoTextFields.querySelector("[data-qr-logo-text]")?.addEventListener("input", handleQrLogoTextChange);
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

      const fieldClassNames = ["field"];
      if (field.type === "textarea" || type.fields.length === 1 || field.span === 2) {
        fieldClassNames.push("field-span-2");
      }
      if (field.className) {
        fieldClassNames.push(field.className);
      }
      const fieldClass = fieldClassNames.join(" ");

      if (field.type === "textarea") {
        return `
          <label class="${fieldClass}">
            <span>${escapeHtml(field.label)}</span>
            <textarea ${common} placeholder="${escapeHtml(resolveQrFieldPlaceholder(field))}">${escapeHtml(value || "")}</textarea>
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
            placeholder="${escapeHtml(resolveQrFieldPlaceholder(field))}"
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

  function handleQrFrameTextChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const slot = target.getAttribute("data-qr-frame-text");
    if (slot === "top") {
      state.qr.style.frameTopText = target.value.slice(0, 42);
    } else if (slot === "bottom") {
      state.qr.style.frameBottomText = target.value.slice(0, 42);
    } else {
      return;
    }

    persistState();
    generateQr(false);
  }

  function handleQrLogoTextChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.getAttribute("data-qr-logo-text")) {
      return;
    }

    state.qr.style.logoText = target.value.slice(0, 16);
    persistState();
    generateQr(false);
  }

  function getQrFrameTexts() {
    const type = qrTypeMap[state.qr.type] || QR_TYPES[0];
    return {
      top: safeTrim(state.qr.style.frameTopText) || type.short,
      bottom: safeTrim(state.qr.style.frameBottomText) || "SCAN ME",
    };
  }

  function getQrLogoText(type) {
    const custom = safeTrim(state.qr.style.logoText);
    if (custom) {
      return custom;
    }
    if (state.qr.style.logo === "scan") {
      return "SCAN ME";
    }
    return state.qr.style.logo === "type" ? type.short : "";
  }

  function resolveQrFieldPlaceholder(field) {
    if (field.placeholder) {
      return field.placeholder;
    }

    const example = getQrFieldExampleValue(field);
    if (example === undefined || example === null || typeof example === "boolean") {
      return "";
    }

    return String(example);
  }

  function syncBarcodeSettingsFromForm() {
    state.barcode.format = pickBarcodeFormatId(refs.barcodeFormat.value);
    state.barcode.group = getActiveBarcodeFormat().group;
    const format = getActiveBarcodeFormat();
    state.barcode.moduleWidth = clampNumber(refs.barcodeModuleWidth.value, 1, 10, 3);
    state.barcode.barHeight = clampNumber(refs.barcodeHeight.value, 48, 280, 132);
    state.barcode.quietZone = clampNumber(refs.barcodeQuietZone.value, 8, 32, 11);
    state.barcode.textSize = clampNumber(refs.barcodeTextSize.value, 14, 56, 28);
    state.barcode.fontFamily = safeTrim(refs.barcodeFontFamily.value).slice(0, 120) || BARCODE_FONT_FAMILY;
    state.barcode.fontWeight = clampNumber(refs.barcodeFontWeight.value, 400, 800, 400);
    state.barcode.art.shapeHeightPercent = clampNumber(refs.barcodeShapeHeight.value, 18, 46, 36);
    state.barcode.digits = normalizeBarcodeInputValue(format, refs.barcodeDigits.value);
    refs.barcodeModuleWidth.value = state.barcode.moduleWidth;
    refs.barcodeHeight.value = state.barcode.barHeight;
    refs.barcodeQuietZone.value = state.barcode.quietZone;
    refs.barcodeTextSize.value = state.barcode.textSize;
    ensureBarcodeFontSelection(state.barcode.fontFamily);
    refs.barcodeFontWeight.value = state.barcode.fontWeight;
    refs.barcodeShapeHeight.value = state.barcode.art.shapeHeightPercent;
    refs.barcodeDigits.value = state.barcode.digits;
    if (refs.barcodeProtectedLaneOutput) {
      refs.barcodeProtectedLaneOutput.textContent = `${Math.round(BARCODE_PROTECTED_RATIO * 100)}%`;
    }
    persistState();
  }

  function syncQrStyleFromForm() {
    state.qr.style.ecc = refs.qrErrorCorrection.value;
    state.qr.style.shape = pickOptionId(QR_SHAPE_OPTIONS, state.qr.style.shape);
    state.qr.style.corner = pickOptionId(QR_CORNER_OPTIONS, state.qr.style.corner);
    state.qr.style.frame = pickOptionId(QR_FRAME_OPTIONS, state.qr.style.frame);
    state.qr.style.logo = pickOptionId(QR_LOGO_OPTIONS, state.qr.style.logo);
    const topField = refs.qrFrameTextFields.querySelector('[data-qr-frame-text="top"]');
    const bottomField = refs.qrFrameTextFields.querySelector('[data-qr-frame-text="bottom"]');
    const logoField = refs.qrLogoTextFields.querySelector("[data-qr-logo-text]");
    state.qr.style.frameTopText = String(topField ? topField.value : state.qr.style.frameTopText || "").slice(0, 42);
    state.qr.style.frameBottomText = String(bottomField ? bottomField.value : state.qr.style.frameBottomText || "").slice(0, 42);
    state.qr.style.logoText = String(logoField ? logoField.value : state.qr.style.logoText || "").slice(0, 16);
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
    persistState();
  }

  function renderBarcodeArtControls() {
    const format = getActiveBarcodeFormat();
    const mode = pickBarcodeArtMode(state.barcode.art.mode);
    const canUseArt = format.supportsArt;
    state.barcode.art.mode = canUseArt ? mode : "none";
    refs.barcodeArtBlock.setAttribute("data-art-mode", canUseArt ? mode : "none");
    refs.barcodeArtBlock.classList.toggle("disabled", !canUseArt);
    if (!canUseArt) {
      refs.barcodeArtDetails.open = false;
    } else if (state.barcode.art.mode === "upload") {
      refs.barcodeArtDetails.open = true;
    }
    refs.barcodeShapeHeight.value = state.barcode.art.shapeHeightPercent;
    refs.barcodeProtectedLaneOutput.textContent = `${Math.round(BARCODE_PROTECTED_RATIO * 100)}%`;

    refs.barcodeArtModeRow.querySelectorAll("[data-barcode-art-mode]").forEach((button) => {
      const nextMode = button.getAttribute("data-barcode-art-mode");
      button.classList.toggle("active", nextMode === state.barcode.art.mode);
      button.disabled = !canUseArt;
    });
    refs.clearBarcodeShapeUploadButton.disabled = !state.barcode.art.uploadProfile || !canUseArt;
    setBarcodeShapeUploadStatus(
      state.barcode.art.uploadName
        ? `${state.barcode.art.uploadName} is ready for custom SVG art.`
        : "No SVG uploaded yet.",
      state.barcode.art.uploadProfile ? "ready" : "",
    );

    refs.barcodeShapeUpload.disabled = !canUseArt;

    if (!canUseArt) {
      setBarcodeArtStatus(`${format.label} stays clean and standard here. Custom SVG art is available on the supported barcode types in the list above.`, "");
      return;
    }

    if (state.barcode.art.mode === "upload") {
      if (state.barcode.art.uploadProfile) {
        setBarcodeArtStatus(`${state.barcode.art.uploadName} is active. The barcode keeps the lower scan lane clean and uses the SVG silhouette above it.`, "valid");
      } else {
        setBarcodeArtStatus("Upload an SVG silhouette to activate custom barcode art. Until then, the barcode stays clean.", "");
      }
      return;
    }

    setBarcodeArtStatus("Clean barcode mode is active. Switch to SVG art only when you want your own uploaded shape.", "");
  }

  function handleBarcodeArtModeClick(event) {
    if (!getActiveBarcodeFormat().supportsArt) {
      return;
    }
    const button = event.target.closest("[data-barcode-art-mode]");
    if (!button) {
      return;
    }

    const nextMode = pickBarcodeArtMode(button.getAttribute("data-barcode-art-mode"));
    state.barcode.art.mode = nextMode;
    persistState();
    renderBarcodeArtControls();
    generateBarcode(false);
  }

  async function handleBarcodeShapeUpload(event) {
    if (!getActiveBarcodeFormat().supportsArt) {
      return;
    }
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.files || !target.files[0]) {
      return;
    }

    const file = target.files[0];
    setBarcodeShapeUploadStatus(`Reading ${file.name}...`, "");

    try {
      const markup = await file.text();
      const profile = await createBarcodeProfileFromSvg(markup, 240);
      state.barcode.art.uploadName = file.name;
      state.barcode.art.uploadSvg = markup;
      state.barcode.art.uploadProfile = profile;
      state.barcode.art.mode = "upload";
      persistState();
      renderBarcodeArtControls();
      generateBarcode(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The SVG silhouette could not be read.";
      setBarcodeShapeUploadStatus(message, "warn");
      setBarcodeArtStatus(message, "invalid");
    }
  }

  function clearUploadedBarcodeShape() {
    state.barcode.art.uploadName = "";
    state.barcode.art.uploadSvg = "";
    state.barcode.art.uploadProfile = null;
    refs.barcodeShapeUpload.value = "";
    persistState();
    renderBarcodeArtControls();
    generateBarcode(false);
  }

  function pickBarcodeArtMode(mode) {
    return mode === "upload" ? "upload" : "none";
  }

  function setBarcodeArtStatus(message, tone) {
    setStatusStrip(refs.barcodeArtStatus, message, tone);
  }

  function setBarcodeShapeUploadStatus(message, tone) {
    refs.barcodeShapeUploadStatus.textContent = message;
    refs.barcodeShapeUploadStatus.classList.remove("ready", "warn");
    if (tone === "ready" || tone === "warn") {
      refs.barcodeShapeUploadStatus.classList.add(tone);
    }
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
    const format = getActiveBarcodeFormat();
    const analysis = analyzeBarcodeValue(format, refs.barcodeDigits.value);

    if (analysis.empty) {
      setStatusStrip(refs.barcodeStatusStrip, `Waiting for ${format.label} data.`, "neutral");
      refs.barcodeDigits.setCustomValidity("");
      return;
    }

    if (!analysis.valid) {
      setStatusStrip(refs.barcodeStatusStrip, analysis.message, "invalid");
      refs.barcodeDigits.setCustomValidity(analysis.message);
      return;
    }

    refs.barcodeDigits.setCustomValidity("");
    setStatusStrip(refs.barcodeStatusStrip, analysis.statusMessage || `${format.label} is ready.`, "valid");
  }

  function generateBarcode(reportIssues) {
    syncBarcodeSettingsFromForm();
    updateBarcodeStatus();

    const format = getActiveBarcodeFormat();
    const analysis = analyzeBarcodeValue(format, refs.barcodeDigits.value);
    if (!analysis.valid) {
      outputs.barcode = createBarcodeGhostOutput(format, analysis.message);
      if (state.activeMode === "barcode") {
        renderOutput(outputs.barcode);
      }
      if (reportIssues) {
        refs.barcodeDigits.reportValidity();
      }
      return null;
    }

    refs.barcodeDigits.value = analysis.normalized;
    state.barcode.digits = analysis.normalized;
    const artConfig = format.supportsArt ? getActiveBarcodeArtConfig() : {
      enabled: false,
      mode: "none",
      label: "Clean barcode",
      profile: null,
    };

    const svgResult = createBarcodeSvg(format, analysis, {
      moduleWidth: state.barcode.moduleWidth,
      barHeight: state.barcode.barHeight,
      quietZone: state.barcode.quietZone,
      textSize: state.barcode.textSize,
      fontFamily: resolveBarcodeFontFamily(),
      fontWeight: state.barcode.fontWeight,
      artProfile: artConfig.profile,
      artPreset: null,
      artEnabled: artConfig.enabled,
      artLabel: artConfig.label,
      artMode: artConfig.mode,
      protectedRatio: BARCODE_PROTECTED_RATIO,
      shapeHeightPercent: state.barcode.art.shapeHeightPercent,
    });

    outputs.barcode = {
      mode: "barcode",
      badge: artConfig.enabled ? `${format.label} + custom SVG art` : `${format.label} Ready`,
      previewTitle: artConfig.enabled
        ? `${format.label} custom art barcode for ${analysis.normalized}`
        : `${format.label} barcode for ${analysis.normalized}`,
      payload: analysis.normalized,
      svg: svgResult.svg,
      model: svgResult.model,
      width: svgResult.width,
      height: svgResult.height,
      fileBase: slugify(state.barcode.label || `${format.id}-${analysis.normalized}`),
      summaryRows: buildBarcodeSummaryRows(format, analysis, svgResult),
    };

    persistState();

    if (state.activeMode === "barcode") {
      renderOutput(outputs.barcode);
    }

    return outputs.barcode;
  }

  function createBarcodeGhostOutput(format, message) {
    const exampleAnalysis = analyzeBarcodeValue(format, format.exampleValue);
    const safeAnalysis = exampleAnalysis.valid
      ? exampleAnalysis
      : {
          normalized: format.exampleValue,
          checkDigit: "",
          statusMessage: "",
        };

    const svgResult = createBarcodeSvg(format, safeAnalysis, {
      moduleWidth: state.barcode.moduleWidth,
      barHeight: state.barcode.barHeight,
      quietZone: state.barcode.quietZone,
      textSize: state.barcode.textSize,
      fontFamily: resolveBarcodeFontFamily(),
      fontWeight: state.barcode.fontWeight,
      artProfile: null,
      artPreset: null,
      artEnabled: false,
      artLabel: "Clean barcode",
      artMode: "none",
      protectedRatio: BARCODE_PROTECTED_RATIO,
      shapeHeightPercent: state.barcode.art.shapeHeightPercent,
      inkColor: "#d6dbe4",
    });

    return {
      mode: "barcode",
      badge: "Preview",
      previewTitle: `${format.label} barcode preview`,
      payload: message || "Type your barcode digits and the final value will appear here.",
      svg: svgResult.svg,
      model: svgResult.model,
      width: svgResult.width,
      height: svgResult.height,
      fileBase: slugify(`${format.id}-barcode-preview`),
      placeholder: true,
      summaryRows: [
        ["Status", "Soft preview only"],
        ["Type", format.label],
        ["Example", format.exampleValue],
        ["State", message || "Add valid barcode data to activate the final export"],
      ],
    };
  }

  function generateQr(reportIssues) {
    syncQrStyleFromForm();

    const type = qrTypeMap[state.qr.type];
    const values = collectCurrentQrValues();
    state.qr.values[type.id] = values;

    const requiredMessage = validateRequiredQrValues(type, values);
    if (requiredMessage) {
      outputs.qr = createQrGhostOutput(type, values, requiredMessage);
      setStatusStrip(refs.qrStatusStrip, requiredMessage, reportIssues ? "invalid" : "neutral");
      if (state.activeMode === "qr") {
        renderOutput(outputs.qr);
      }
      return null;
    }

    if (reportIssues && !refs.qrForm.reportValidity()) {
      outputs.qr = createQrGhostOutput(type, values, "Please complete the required fields for this QR type.");
      setStatusStrip(refs.qrStatusStrip, "Please complete the required fields for this QR type.", "invalid");
      if (state.activeMode === "qr") {
        renderOutput(outputs.qr);
      }
      return null;
    }

    if (typeof type.validate === "function") {
      const validationMessage = type.validate(values);
      if (validationMessage) {
        outputs.qr = createQrGhostOutput(type, values, validationMessage);
        setStatusStrip(refs.qrStatusStrip, validationMessage, "invalid");
        if (state.activeMode === "qr") {
          renderOutput(outputs.qr);
        }
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
      outputs.qr = createQrGhostOutput(type, values, message);
      setStatusStrip(refs.qrStatusStrip, message, "invalid");
      if (state.activeMode === "qr") {
        renderOutput(outputs.qr);
      }
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
      frameTexts: getQrFrameTexts(),
      logo: state.qr.style.logo,
      logoText: getQrLogoText(type),
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
        ["Exports", "SVG, PDF, PNG"],
      ],
    };
  }

  function createQrGhostOutput(type, values, message) {
    const placeholderPayload = buildQrPreviewPayload(type, values);
    const cellSize = state.qr.style.cellSize;
    const margin = state.qr.style.margin;
    const previewDark = "#d6dbe4";
    const previewCorner = "#d6dbe4";
    const previewBackground = "#ffffff";
    const qr = window.qrcode(0, "M");
    qr.addData(placeholderPayload, "Byte");
    qr.make();

    const model = createQrVectorModel(qr, {
      darkColor: previewDark,
      backgroundColor: previewBackground,
      cornerColor: previewCorner,
      cellSize,
      margin,
      shape: state.qr.style.shape,
      corner: state.qr.style.corner,
      frame: state.qr.style.frame,
      frameTexts: getQrFrameTexts(),
      logo: state.qr.style.logo,
      logoText: getQrLogoText(type),
      typeShort: type.short,
      title: `${type.label} QR preview`,
      description: `${type.label} QR preview`,
    });
    const svg = renderVectorSvg(model, { includeBackground: true });

    return {
      mode: "qr",
      badge: "Preview",
      previewTitle: `${type.label} QR preview`,
      payload: message || "Start typing and the final payload will appear here.",
      svg,
      model,
      width: model.width,
      height: model.height,
      fileBase: slugify(`${type.id}-qr-preview`),
      placeholder: true,
      summaryRows: [
        ["Status", "Soft preview only"],
        ["Type", type.label],
        ["State", message || "Add the required details to activate the final QR"],
        ["Preview colors", "Light gray guide"],
      ],
    };
  }

  function buildQrPreviewPayload(type, values) {
    const fallbackValues = clone(getDefaultValuesForType(type.id));
    const merged = {};
    for (const field of type.fields) {
      const current = values ? values[field.key] : undefined;
      if (field.type === "checkbox") {
        merged[field.key] = typeof current === "boolean" ? current : Boolean(fallbackValues[field.key]);
        continue;
      }

      const normalized = safeTrim(current);
      merged[field.key] = normalized || fallbackValues[field.key];
    }

    try {
      return type.build(merged);
    } catch (_error) {
      return `PREVIEW:${type.id}:${type.short}`;
    }
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
    refs.previewBadge.className = `preview-badge ${output.mode}${output.placeholder ? " preview" : ""}`;
    refs.payloadText.textContent = output.payload;
    refs.previewCanvas.classList.toggle("is-preview", Boolean(output.placeholder));
    refs.payloadText.classList.toggle("placeholder", Boolean(output.placeholder));
    refs.summaryList.classList.toggle("placeholder", Boolean(output.placeholder));
    refs.downloadSvgButton.disabled = Boolean(output.placeholder);
    refs.downloadPdfButton.disabled = Boolean(output.placeholder);
    refs.downloadPngButton.disabled = Boolean(output.placeholder);
    refs.copyPayloadButton.disabled = Boolean(output.placeholder);
    renderSummary(output.summaryRows);
  }

  function renderPreviewPlaceholder() {
    if (state.activeMode === "qr") {
      const type = qrTypeMap[state.qr.type];
      const values = state.qr.values[type.id] || {};
      renderOutput(createQrGhostOutput(type, values, "Add your details to activate the QR."));
      return;
    }

    if (state.activeMode === "barcode") {
      const format = getActiveBarcodeFormat();
      renderOutput(createBarcodeGhostOutput(format, `Add your ${format.label} data to activate the barcode.`));
      return;
    }

    refs.previewCanvas.innerHTML = `
      <div class="preview-placeholder">
        <strong>Nothing generated yet</strong>
        <p>Use one of the generators on the left to create a code.</p>
      </div>
    `;
    refs.previewTitle.textContent = "Generated code will appear here.";
    refs.previewBadge.textContent = "Ready";
    refs.previewBadge.className = "preview-badge";
    refs.previewCanvas.classList.remove("is-preview");
    refs.payloadText.classList.remove("placeholder");
    refs.summaryList.classList.remove("placeholder");
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

    const artisticBarcode = createEAN13Svg("5901234123457", {
      moduleWidth: 3,
      barHeight: 132,
      quietZone: 12,
      artEnabled: true,
      artProfile: Array.from({ length: 220 }, (_value, index) => 0.5 + (Math.sin(index / 15) * 0.25)),
      artPreset: null,
      artLabel: "Custom SVG art",
      protectedRatio: BARCODE_PROTECTED_RATIO,
      shapeHeightPercent: 36,
    });
    results.push({
      name: "Barcode custom art structure",
      pass: artisticBarcode.meta.artEnabled && artisticBarcode.model.rects.length === barcodeSvg.model.rects.length,
      detail: `${artisticBarcode.meta.artLabel}, protected lane ${Math.round(artisticBarcode.meta.protectedRatio * 100)}%.`,
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

  function analyzeBarcodeValue(format, rawValue) {
    switch (format.id) {
      case "ean13":
        return analyzeEAN13(rawValue);
      case "ean8":
        return analyzeEAN8(rawValue);
      case "upca":
        return analyzeUPCA(rawValue);
      case "code128":
        return analyzeCode128(rawValue);
      case "code39":
        return analyzeCode39(rawValue);
      case "itf14":
        return analyzeITF14(rawValue);
      case "postnet5":
        return analyzePostnet(rawValue, 5, "USPS POSTNET 5");
      case "postnet9":
        return analyzePostnet(rawValue, 9, "USPS POSTNET 9");
      case "postnet11":
        return analyzePostnet(rawValue, 11, "USPS POSTNET 11");
      default:
        return analyzeEAN13(rawValue);
    }
  }

  function analyzeEanLike(rawValue, options) {
    const digits = onlyDigits(rawValue || "");
    if (!digits.length) {
      return { empty: true, valid: false, message: `Waiting for ${options.label} digits.` };
    }

    if (digits.length !== options.baseLength && digits.length !== options.fullLength) {
      return {
        empty: false,
        valid: false,
        message: `${options.label} must contain exactly ${options.baseLength} or ${options.fullLength} digits.`,
      };
    }

    const base = digits.slice(0, options.baseLength);
    const checkDigit = computeModulo10CheckDigit(base);
    const normalized = digits.length === options.baseLength ? `${digits}${checkDigit}` : digits;

    if (normalized[options.baseLength] !== checkDigit) {
      return {
        empty: false,
        valid: false,
        message: `Invalid check digit. Expected ${checkDigit} for ${base}.`,
      };
    }

    return {
      empty: false,
      valid: true,
      normalized,
      base,
      checkDigit,
      wasAutoCompleted: digits.length === options.baseLength,
      statusMessage: digits.length === options.baseLength
        ? `Valid ${options.label}. Check digit auto-completed to ${checkDigit}. Final code: ${normalized}`
        : `Valid ${options.label} confirmed. Check digit ${checkDigit} matches.`,
    };
  }

  function analyzeEAN13(rawValue) {
    return analyzeEanLike(rawValue, {
      label: "EAN-13",
      baseLength: 12,
      fullLength: 13,
    });
  }

  function analyzeEAN8(rawValue) {
    return analyzeEanLike(rawValue, {
      label: "EAN-8",
      baseLength: 7,
      fullLength: 8,
    });
  }

  function analyzeUPCA(rawValue) {
    return analyzeEanLike(rawValue, {
      label: "UPC-A",
      baseLength: 11,
      fullLength: 12,
    });
  }

  function analyzeITF14(rawValue) {
    return analyzeEanLike(rawValue, {
      label: "ITF-14",
      baseLength: 13,
      fullLength: 14,
    });
  }

  function analyzeCode39(rawValue) {
    const normalized = safeTrim(rawValue).toUpperCase();
    if (!normalized) {
      return { empty: true, valid: false, message: "Waiting for Code 39 text." };
    }

    if (normalized.length > 48) {
      return {
        empty: false,
        valid: false,
        message: "Code 39 is limited to 48 visible characters here for reliable output size.",
      };
    }

    const invalid = normalized.split("").find((character) => !CODE39_PATTERN_MAP[character] || character === "*");
    if (invalid) {
      return {
        empty: false,
        valid: false,
        message: `Code 39 cannot encode "${invalid}" here. Use uppercase letters, digits, spaces, or - . $ / + %.`,
      };
    }

    return {
      empty: false,
      valid: true,
      normalized,
      statusMessage: "Valid Code 39 data is ready.",
    };
  }

  function analyzeCode128(rawValue) {
    const normalized = safeTrim(rawValue);
    if (!normalized) {
      return { empty: true, valid: false, message: "Waiting for Code 128 text." };
    }

    if (normalized.length > 64) {
      return {
        empty: false,
        valid: false,
        message: "Code 128 is limited to 64 characters here so exports stay practical.",
      };
    }

    const invalid = normalized.split("").find((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code > 126;
    });

    if (invalid) {
      return {
        empty: false,
        valid: false,
        message: "Code 128 here supports standard printable ASCII characters only.",
      };
    }

    return {
      empty: false,
      valid: true,
      normalized,
      statusMessage: "Valid Code 128 data is ready.",
    };
  }

  function analyzePostnet(rawValue, expectedLength, label) {
    const digits = onlyDigits(rawValue || "");
    if (!digits.length) {
      return { empty: true, valid: false, message: `Waiting for ${label} digits.` };
    }

    if (digits.length !== expectedLength) {
      return {
        empty: false,
        valid: false,
        message: `${label} needs exactly ${expectedLength} digits before the automatic check digit.`,
      };
    }

    const checkDigit = computeModulo10CheckDigit(digits);
    return {
      empty: false,
      valid: true,
      normalized: `${digits}${checkDigit}`,
      rawDigits: digits,
      checkDigit,
      statusMessage: `${label} is ready. USPS check digit ${checkDigit} was added automatically.`,
    };
  }

  function computeModulo10CheckDigit(baseDigits) {
    const digits = onlyDigits(baseDigits);
    if (!digits) {
      throw new Error("A numeric barcode check digit needs at least one base digit.");
    }

    let sum = 0;
    let useThree = true;
    for (let index = digits.length - 1; index >= 0; index -= 1) {
      sum += Number(digits[index]) * (useThree ? 3 : 1);
      useThree = !useThree;
    }
    return String((10 - (sum % 10)) % 10);
  }

  function computeEAN13CheckDigit(digits12) {
    const digits = onlyDigits(digits12);
    if (digits.length !== 12) {
      throw new Error("EAN-13 check digit calculation requires exactly 12 digits.");
    }
    return computeModulo10CheckDigit(digits);
  }

  function createBarcodeSvg(format, analysis, options) {
    switch (format.id) {
      case "ean13":
        return createEAN13Svg(analysis.normalized, options);
      case "ean8":
        return createEAN8Svg(analysis.normalized, options);
      case "upca":
        return createUPCASvg(analysis.normalized, options);
      case "code39":
        return createCode39Svg(analysis.normalized, options);
      case "code128":
        return createCode128Svg(analysis.normalized, options);
      case "itf14":
        return createITF14Svg(analysis.normalized, options);
      case "postnet5":
      case "postnet9":
      case "postnet11":
        return createPostnetSvg(analysis, format, options);
      default:
        return createEAN13Svg(analysis.normalized, options);
    }
  }

  function buildBarcodeSummaryRows(format, analysis, svgResult) {
    const rows = [
      ["Type", format.label],
      ["Encoded value", analysis.normalized],
    ];

    if (analysis.checkDigit !== undefined && format.id !== "code39" && format.id !== "code128") {
      rows.push(["Check digit", analysis.checkDigit]);
    }

    if (format.id === "code128") {
      rows.push(["Encoding", svgResult.meta.encoding || "Auto Code B / C"]);
    }

    if (format.id === "code39") {
      rows.push(["Charset", "Uppercase letters, digits, and standard Code 39 symbols"]);
    }

    if (format.id.startsWith("postnet")) {
      rows.push(["Postal digits", analysis.rawDigits]);
    }

    if (format.supportsArt) {
      rows.push(["Barcode art", svgResult.meta.artLabel]);
      rows.push(["Protected lane", `${Math.round(svgResult.meta.protectedRatio * 100)}% standard scan zone`]);
    }

    rows.push(["Pattern width", `${svgResult.width}px`]);
    rows.push(["Digit style", `${state.barcode.textSize}px / ${describeBarcodeFont()} / ${state.barcode.fontWeight}`]);
    rows.push(["Exports", "SVG, PDF, PNG"]);

    if (analysis.wasAutoCompleted) {
      rows.push(["Status", "Auto-completed from base digits"]);
    } else if (analysis.statusMessage) {
      rows.push(["Status", analysis.statusMessage.replace(/^Valid /, "")]);
    }

    return rows;
  }

  function createRetailBarcodeSvg(spec, options) {
    const bitString = spec.bitString;
    const moduleWidth = Number(options.moduleWidth);
    const barHeight = Number(options.barHeight);
    const quietZone = Number(options.quietZone);
    const fontFamily = safeTrim(options.fontFamily) || BARCODE_FONT_FAMILY;
    const fontWeight = clampNumber(options.fontWeight, 400, 800, 400);
    const inkColor = normalizeHexColor(options.inkColor, BARCODE_INK);
    const protectedRatio = clampNumber(options.protectedRatio, 0.5, 0.82, BARCODE_PROTECTED_RATIO);
    const artEnabled = options.artEnabled === true && Array.isArray(options.artProfile) && options.artProfile.length > 1;
    const requestedShapeRatio = clampNumber(options.shapeHeightPercent, 18, 46, 36) / 100;
    const artRatio = artEnabled ? Math.min(requestedShapeRatio, 1 - protectedRatio) : 0;
    const artHeight = artEnabled ? Math.max(moduleWidth * 6, Math.round(barHeight * artRatio)) : 0;
    const scanLaneHeight = artEnabled ? Math.max(moduleWidth * 14, barHeight - artHeight) : barHeight;
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
      const isGuard = (spec.guardRanges || []).some((range) => index >= range.start && index < range.end);
      const profileValue = artEnabled && !isGuard
        ? sampleBarcodeProfile(options.artProfile, index / Math.max(1, bitString.length - 1))
        : 0;
      const artLift = artEnabled && !isGuard ? Math.round(artHeight * profileValue) : artHeight;
      const y = topPadding + Math.max(0, artHeight - artLift);
      const height = (scanLaneHeight + artLift) + (isGuard ? guardExtra : 0);
      rects.push({ x, y, width: moduleWidth, height, fill: inkColor });
    }

    for (const item of spec.textItems) {
      texts.push({
        x: item.xModules * moduleWidth,
        y: textY,
        anchor: item.anchor || "middle",
        size: textSize,
        fill: inkColor,
        fontFamily,
        fontWeight,
        text: item.text,
      });
    }

    const model = {
      width: totalWidth,
      height: totalHeight,
      background: "#ffffff",
      title: spec.title,
      description: spec.description,
      rects,
      paths: [],
      texts,
    };

    if (artEnabled && options.artPreset && typeof options.artPreset.decorate === "function") {
      applyBarcodeArtPreset(model, options.artPreset, {
        barcodeLeft: quietZone * moduleWidth,
        barcodeWidth: bitString.length * moduleWidth,
        topPadding,
        barHeight,
        artHeight,
        scanLaneHeight,
        moduleWidth,
        totalHeight,
      });
    }

    return {
      svg: renderVectorSvg(model, { includeBackground: true }),
      model,
      width: totalWidth,
      height: totalHeight,
      meta: {
        artEnabled,
        artLabel: artEnabled ? (safeTrim(options.artLabel) || "Custom art") : "Clean barcode",
        protectedRatio,
      },
    };
  }

  function createEAN13Svg(digits, options) {
    const startX = Number(options.quietZone);
    const textItems = [
      { xModules: startX - 4.5, text: digits[0] },
      ...digits.slice(1, 7).split("").map((digit, index) => ({
        xModules: startX + 3 + index * 7 + 3.5,
        text: digit,
      })),
      ...digits.slice(7).split("").map((digit, index) => ({
        xModules: startX + 3 + 42 + 5 + index * 7 + 3.5,
        text: digit,
      })),
    ];

    return createRetailBarcodeSvg({
      bitString: buildEAN13BitString(digits),
      guardRanges: [{ start: 0, end: 3 }, { start: 45, end: 50 }, { start: 92, end: 95 }],
      textItems,
      title: options.artEnabled ? `EAN-13 creative barcode ${digits}` : `EAN-13 barcode ${digits}`,
      description: options.artEnabled ? `EAN-13 creative barcode ${digits}` : `EAN-13 barcode ${digits}`,
    }, options);
  }

  function createEAN8Svg(digits, options) {
    const startX = Number(options.quietZone);
    const textItems = [
      ...digits.slice(0, 4).split("").map((digit, index) => ({
        xModules: startX + 3 + index * 7 + 3.5,
        text: digit,
      })),
      ...digits.slice(4).split("").map((digit, index) => ({
        xModules: startX + 3 + 28 + 5 + index * 7 + 3.5,
        text: digit,
      })),
    ];

    return createRetailBarcodeSvg({
      bitString: buildEAN8BitString(digits),
      guardRanges: [{ start: 0, end: 3 }, { start: 31, end: 36 }, { start: 64, end: 67 }],
      textItems,
      title: options.artEnabled ? `EAN-8 creative barcode ${digits}` : `EAN-8 barcode ${digits}`,
      description: options.artEnabled ? `EAN-8 creative barcode ${digits}` : `EAN-8 barcode ${digits}`,
    }, options);
  }

  function createUPCASvg(digits, options) {
    const startX = Number(options.quietZone);
    const textItems = [
      { xModules: startX - 4.5, text: digits[0] },
      ...digits.slice(1, 6).split("").map((digit, index) => ({
        xModules: startX + 3 + 7 + index * 7 + 3.5,
        text: digit,
      })),
      ...digits.slice(6, 11).split("").map((digit, index) => ({
        xModules: startX + 3 + 42 + 5 + index * 7 + 3.5,
        text: digit,
      })),
      { xModules: startX + 95 + 4.5, text: digits[11] },
    ];

    return createRetailBarcodeSvg({
      bitString: buildUPCABitString(digits),
      guardRanges: [{ start: 0, end: 3 }, { start: 45, end: 50 }, { start: 92, end: 95 }],
      textItems,
      title: options.artEnabled ? `UPC-A creative barcode ${digits}` : `UPC-A barcode ${digits}`,
      description: options.artEnabled ? `UPC-A creative barcode ${digits}` : `UPC-A barcode ${digits}`,
    }, options);
  }

  function createSequenceBarcodeSvg(spec, options) {
    const moduleWidth = Number(options.moduleWidth);
    const barHeight = Number(options.barHeight);
    const quietZone = Number(options.quietZone);
    const fontFamily = safeTrim(options.fontFamily) || BARCODE_FONT_FAMILY;
    const fontWeight = clampNumber(options.fontWeight, 400, 800, 400);
    const inkColor = normalizeHexColor(options.inkColor, BARCODE_INK);
    const protectedRatio = clampNumber(options.protectedRatio, 0.5, 0.82, BARCODE_PROTECTED_RATIO);
    const artEnabled = options.artEnabled === true && spec.supportsArt === true && Array.isArray(options.artProfile) && options.artProfile.length > 1;
    const requestedShapeRatio = clampNumber(options.shapeHeightPercent, 18, 46, 36) / 100;
    const artRatio = artEnabled ? Math.min(requestedShapeRatio, 1 - protectedRatio) : 0;
    const artHeight = artEnabled ? Math.max(moduleWidth * 6, Math.round(barHeight * artRatio)) : 0;
    const scanLaneHeight = artEnabled ? Math.max(moduleWidth * 14, barHeight - artHeight) : barHeight;
    const textSize = clampNumber(options.textSize, 14, 56, Math.max(18, moduleWidth * 5.1));
    const topPadding = 18;
    const textGap = Math.max(10, moduleWidth * 3);
    const totalModules = spec.sequence.reduce((sum, segment) => sum + segment.width, 0);
    const totalWidth = (totalModules + quietZone * 2) * moduleWidth;
    const totalHeight = topPadding + barHeight + textGap + textSize + 12;
    const textY = topPadding + barHeight + textGap + textSize * 0.72;
    const rects = [];
    let moduleCursor = 0;

    for (const segment of spec.sequence) {
      if (segment.isBar) {
        const heightRatio = segment.heightRatio || 1;
        const baseHeight = barHeight * heightRatio;
        const canShape = artEnabled && heightRatio === 1 && segment.noArt !== true;
        if (canShape) {
          for (let offset = 0; offset < segment.width; offset += 1) {
            const absoluteIndex = moduleCursor + offset;
            const profileValue = sampleBarcodeProfile(options.artProfile, absoluteIndex / Math.max(1, totalModules - 1));
            const artLift = Math.round(artHeight * profileValue);
            rects.push({
              x: (quietZone + absoluteIndex) * moduleWidth,
              y: topPadding + Math.max(0, artHeight - artLift),
              width: moduleWidth,
              height: scanLaneHeight + artLift,
              fill: inkColor,
            });
          }
        } else {
          rects.push({
            x: (quietZone + moduleCursor) * moduleWidth,
            y: topPadding + (heightRatio < 1 ? (barHeight - baseHeight) : 0),
            width: segment.width * moduleWidth,
            height: heightRatio < 1 ? baseHeight : barHeight,
            fill: inkColor,
          });
        }
      }
      moduleCursor += segment.width;
    }

    const texts = (spec.textItems && spec.textItems.length ? spec.textItems : [
      { x: totalWidth / 2, y: textY, anchor: "middle", text: spec.humanText },
    ]).map((item) => ({
      x: item.x !== undefined ? item.x : (item.xModules * moduleWidth),
      y: item.y !== undefined ? item.y : textY,
      anchor: item.anchor || "middle",
      size: item.size || textSize,
      fill: inkColor,
      fontFamily,
      fontWeight,
      text: item.text,
    }));

    const model = {
      width: totalWidth,
      height: totalHeight,
      background: "#ffffff",
      title: spec.title,
      description: spec.description,
      rects,
      paths: [],
      texts,
    };

    if (artEnabled && options.artPreset && typeof options.artPreset.decorate === "function") {
      applyBarcodeArtPreset(model, options.artPreset, {
        barcodeLeft: quietZone * moduleWidth,
        barcodeWidth: totalModules * moduleWidth,
        topPadding,
        barHeight,
        artHeight,
        scanLaneHeight,
        moduleWidth,
        totalHeight,
      });
    }

    return {
      svg: renderVectorSvg(model, { includeBackground: true }),
      model,
      width: totalWidth,
      height: totalHeight,
      meta: {
        artEnabled,
        artLabel: artEnabled ? (safeTrim(options.artLabel) || "Custom art") : "Clean barcode",
        protectedRatio,
        encoding: spec.encoding || "",
      },
    };
  }

  function createCode39Svg(text, options) {
    return createSequenceBarcodeSvg({
      sequence: buildCode39Sequence(text),
      humanText: text,
      title: options.artEnabled ? `Code 39 creative barcode ${text}` : `Code 39 barcode ${text}`,
      description: options.artEnabled ? `Code 39 creative barcode ${text}` : `Code 39 barcode ${text}`,
      supportsArt: true,
      encoding: "Code 39",
    }, options);
  }

  function createCode128Svg(text, options) {
    const encoded = buildCode128Sequence(text);
    return createSequenceBarcodeSvg({
      sequence: encoded.sequence,
      humanText: text,
      title: options.artEnabled ? `Code 128 creative barcode ${text}` : `Code 128 barcode ${text}`,
      description: options.artEnabled ? `Code 128 creative barcode ${text}` : `Code 128 barcode ${text}`,
      supportsArt: true,
      encoding: encoded.encoding,
    }, options);
  }

  function createITF14Svg(digits, options) {
    return createSequenceBarcodeSvg({
      sequence: buildITF14Sequence(digits),
      humanText: digits,
      title: options.artEnabled ? `ITF-14 creative barcode ${digits}` : `ITF-14 barcode ${digits}`,
      description: options.artEnabled ? `ITF-14 creative barcode ${digits}` : `ITF-14 barcode ${digits}`,
      supportsArt: true,
      encoding: "Interleaved 2 of 5",
    }, options);
  }

  function createPostnetSvg(analysis, format, options) {
    return createSequenceBarcodeSvg({
      sequence: buildPostnetSequence(analysis.normalized),
      humanText: analysis.normalized,
      title: `${format.label} barcode ${analysis.normalized}`,
      description: `${format.label} barcode ${analysis.normalized}`,
      supportsArt: false,
      encoding: "POSTNET",
    }, {
      ...options,
      quietZone: Math.max(8, Number(options.quietZone)),
    });
  }

  function buildCode39Sequence(text) {
    const content = `*${text}*`;
    const sequence = [];

    content.split("").forEach((character, charIndex) => {
      const pattern = CODE39_PATTERN_MAP[character];
      pattern.split("").forEach((width, index) => {
        sequence.push({
          isBar: index % 2 === 0,
          width: Number(width),
        });
      });
      if (charIndex < content.length - 1) {
        sequence.push({ isBar: false, width: 1 });
      }
    });

    return sequence;
  }

  function buildCode128Sequence(text) {
    const values = [];
    let activeSet = shouldCode128StartInC(text) ? "C" : "B";
    values.push(activeSet === "C" ? 105 : 104);

    let index = 0;
    while (index < text.length) {
      if (activeSet === "C") {
        const digitRun = getLeadingDigitRun(text.slice(index));
        if (digitRun.length >= 2) {
          values.push(Number(text.slice(index, index + 2)));
          index += 2;
          continue;
        }

        values.push(100);
        activeSet = "B";
        continue;
      }

      const digitRun = getLeadingDigitRun(text.slice(index));
      const evenDigitRun = digitRun.length - (digitRun.length % 2);
      if (evenDigitRun >= 4) {
        values.push(99);
        activeSet = "C";
        continue;
      }

      values.push(text.charCodeAt(index) - 32);
      index += 1;
    }

    let checksum = values[0];
    for (let valueIndex = 1; valueIndex < values.length; valueIndex += 1) {
      checksum += values[valueIndex] * valueIndex;
    }
    values.push(checksum % 103);
    values.push(106);

    const bitString = values.map((value) => CODE128_PATTERNS[value]).join("");
    return {
      sequence: buildSequenceFromBitString(bitString),
      encoding: values.some((value) => value === 99 || value === 100) ? "Auto Code B / C" : "Code B",
    };
  }

  function shouldCode128StartInC(text) {
    const digitRun = getLeadingDigitRun(text);
    return digitRun.length >= 2 && digitRun.length % 2 === 0 && (digitRun.length === text.length || digitRun.length >= 4);
  }

  function getLeadingDigitRun(value) {
    const match = String(value || "").match(/^\d+/);
    return match ? match[0] : "";
  }

  function buildITF14Sequence(digits) {
    const sequence = [
      { isBar: true, width: 1, noArt: true },
      { isBar: false, width: 1 },
      { isBar: true, width: 1, noArt: true },
      { isBar: false, width: 1 },
    ];

    for (let index = 0; index < digits.length; index += 2) {
      const left = ITF_PATTERNS[digits[index]];
      const right = ITF_PATTERNS[digits[index + 1]];
      for (let pairIndex = 0; pairIndex < 5; pairIndex += 1) {
        sequence.push({
          isBar: true,
          width: left[pairIndex] === "1" ? 3 : 1,
        });
        sequence.push({
          isBar: false,
          width: right[pairIndex] === "1" ? 3 : 1,
        });
      }
    }

    sequence.push({ isBar: true, width: 3, noArt: true });
    sequence.push({ isBar: false, width: 1 });
    sequence.push({ isBar: true, width: 1, noArt: true });
    return sequence;
  }

  function buildPostnetSequence(digits) {
    const sequence = [{ isBar: true, width: 1, heightRatio: 1 }];
    const fullDigits = digits.split("");
    fullDigits.forEach((digit, digitIndex) => {
      sequence.push({ isBar: false, width: 1 });
      POSTNET_PATTERNS[digit].split("").forEach((bit, patternIndex) => {
        sequence.push({
          isBar: true,
          width: 1,
          heightRatio: bit === "1" ? 1 : 0.46,
        });
        if (!(digitIndex === fullDigits.length - 1 && patternIndex === 4)) {
          sequence.push({ isBar: false, width: 1 });
        }
      });
    });
    sequence.push({ isBar: true, width: 1, heightRatio: 1 });
    return sequence;
  }

  function buildSequenceFromBitString(bitString) {
    const sequence = [];
    let current = bitString[0];
    let width = 1;

    for (let index = 1; index < bitString.length; index += 1) {
      if (bitString[index] === current) {
        width += 1;
        continue;
      }

      sequence.push({
        isBar: current === "1",
        width,
      });
      current = bitString[index];
      width = 1;
    }

    sequence.push({
      isBar: current === "1",
      width,
    });
    return sequence;
  }

  function getActiveBarcodeArtConfig() {
    const mode = pickBarcodeArtMode(state.barcode.art.mode);
    if (mode === "upload" && Array.isArray(state.barcode.art.uploadProfile) && state.barcode.art.uploadProfile.length > 1) {
      return {
        enabled: true,
        mode,
        label: state.barcode.art.uploadName || "Custom SVG art",
        profile: state.barcode.art.uploadProfile,
        preset: null,
      };
    }

    return {
      enabled: false,
      mode: "none",
      label: "Clean barcode",
      profile: null,
      preset: null,
    };
  }

  function getBarcodeShapeProfile(shapeLike, sampleCount) {
    if (Array.isArray(shapeLike) && shapeLike.length) {
      return finalizeBarcodeProfile(shapeLike);
    }

    const count = Math.max(16, Number(sampleCount) || 32);
    const cacheKey = `generic:${count}`;
    if (barcodeArtProfileCache.has(cacheKey)) {
      return barcodeArtProfileCache.get(cacheKey);
    }

    const values = [];
    for (let index = 0; index < count; index += 1) {
      const x = count === 1 ? 0.5 : index / (count - 1);
      values.push(clamp01(0.5 + (Math.sin(x * Math.PI * 2.4) * 0.22)));
    }

    const profile = finalizeBarcodeProfile(values);
    barcodeArtProfileCache.set(cacheKey, profile);
    return profile;
  }

  function renderBarcodeShapePreviewSvg(profile, shape) {
    const values = Array.isArray(profile) && profile.length ? profile : getBarcodeShapeProfile(null, 32);
    const model = {
      width: 72,
      height: 72,
      background: "#ffffff",
      title: "Barcode art preview",
      description: "Barcode art preview",
      rects: [],
      roundRects: [],
      circles: [],
      compoundPaths: [],
      paths: [],
      texts: [],
    };
    const left = 9;
    const top = 10;
    const previewWidth = 54;
    const moduleWidth = previewWidth / BARCODE_ART_PREVIEW_BITS.length;
    const artHeight = 18;
    const scanHeight = 24;

    for (let index = 0; index < BARCODE_ART_PREVIEW_BITS.length; index += 1) {
      if (BARCODE_ART_PREVIEW_BITS[index] !== "1") {
        continue;
      }
      const lift = artHeight * sampleBarcodeProfile(values, index / Math.max(1, BARCODE_ART_PREVIEW_BITS.length - 1));
      pushRect(
        model,
        left + index * moduleWidth,
        top + Math.max(0, artHeight - lift),
        moduleWidth,
        scanHeight + lift,
        BARCODE_INK,
      );
    }

    if (shape && typeof shape.decorate === "function") {
      applyBarcodeArtPreset(model, shape, {
        barcodeLeft: left,
        barcodeWidth: previewWidth,
        topPadding: top,
        barHeight: artHeight + scanHeight,
        artHeight,
        scanLaneHeight: scanHeight,
        moduleWidth,
        totalHeight: model.height,
      });
    }

    return renderVectorSvg(model, { includeBackground: true }).replace("<svg ", '<svg class="barcode-shape-preview" ');
  }

  function sampleBarcodeProfile(profile, t) {
    if (!Array.isArray(profile) || !profile.length) {
      return 0;
    }
    const safeT = clamp01(t);
    const scaledIndex = safeT * (profile.length - 1);
    const leftIndex = Math.floor(scaledIndex);
    const rightIndex = Math.min(profile.length - 1, leftIndex + 1);
    const mixAmount = scaledIndex - leftIndex;
    return mix(profile[leftIndex], profile[rightIndex], mixAmount);
  }

  async function createBarcodeProfileFromSvg(svgMarkup, sampleCount) {
    const normalized = safeTrim(svgMarkup);
    if (!/<svg[\s>]/i.test(normalized)) {
      throw new Error("Upload a real SVG silhouette file.");
    }

    const blob = new Blob([normalized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    try {
      const image = await loadImage(url);
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 420;
      tempCanvas.height = 240;
      const tempContext = tempCanvas.getContext("2d");
      if (!tempContext) {
        throw new Error("Canvas could not be initialized for the SVG silhouette.");
      }

      tempContext.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempContext.drawImage(image, 0, 0, tempCanvas.width, tempCanvas.height);
      const bounds = findAlphaBounds(tempContext, tempCanvas.width, tempCanvas.height);
      if (!bounds) {
        throw new Error("The SVG needs visible filled artwork to shape the barcode.");
      }

      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = Math.max(48, Number(sampleCount) || 220);
      finalCanvas.height = 120;
      const finalContext = finalCanvas.getContext("2d");
      if (!finalContext) {
        throw new Error("Canvas could not be initialized for the final silhouette.");
      }

      finalContext.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
      const padding = 8;
      const availableWidth = finalCanvas.width - padding * 2;
      const availableHeight = finalCanvas.height - padding * 2;
      const scale = Math.min(availableWidth / bounds.width, availableHeight / bounds.height);
      const drawWidth = bounds.width * scale;
      const drawHeight = bounds.height * scale;
      const drawX = (finalCanvas.width - drawWidth) / 2;
      const drawY = finalCanvas.height - padding - drawHeight;
      finalContext.drawImage(
        tempCanvas,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
      );

      const imageData = finalContext.getImageData(0, 0, finalCanvas.width, finalCanvas.height).data;
      const values = [];
      for (let x = 0; x < finalCanvas.width; x += 1) {
        let topY = finalCanvas.height;
        for (let y = 0; y < finalCanvas.height; y += 1) {
          const alpha = imageData[(y * finalCanvas.width + x) * 4 + 3];
          if (alpha > 10) {
            topY = y;
            break;
          }
        }
        values.push(topY === finalCanvas.height ? 0 : clamp01((finalCanvas.height - topY) / finalCanvas.height));
      }

      const profile = finalizeBarcodeProfile(values);
      if (!profile.some((value) => value > 0.06)) {
        throw new Error("The SVG silhouette was too empty to shape the barcode.");
      }
      return profile;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("The SVG file could not be decoded."));
      image.src = url;
    });
  }

  function findAlphaBounds(context, width, height) {
    const data = context.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha <= 10) {
          continue;
        }
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < minX || maxY < minY) {
      return null;
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  function finalizeBarcodeProfile(values) {
    let next = Array.isArray(values) ? values.slice() : [];
    for (let pass = 0; pass < 2; pass += 1) {
      next = next.map((value, index) => {
        const left = next[Math.max(0, index - 1)];
        const right = next[Math.min(next.length - 1, index + 1)];
        return clamp01((left + value * 2 + right) / 4);
      });
    }
    return next;
  }

  function mix(left, right, amount) {
    return left + (right - left) * amount;
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function gaussian(x, center, width) {
    const safeWidth = Math.max(0.01, width);
    const distance = (x - center) / safeWidth;
    return Math.exp(-0.5 * distance * distance);
  }

  function archProfile(x, center, halfWidth, exponent) {
    const safeWidth = Math.max(0.02, halfWidth);
    const normalized = Math.abs((x - center) / safeWidth);
    if (normalized >= 1) {
      return 0;
    }
    return Math.pow(1 - normalized, Math.max(0.2, exponent));
  }

  function buildLeafArtProfile(x, variant) {
    const center = 0.5 + variant.shift * 0.5;
    const body = archProfile(x, center, 0.5 * variant.width, 0.55 * variant.sharpen + 0.35);
    const notch = gaussian(x, center, 0.08 * variant.width) * 0.16;
    return 0.12 + body * 0.86 * variant.height - notch + Math.sin((x + variant.shift) * Math.PI * 2.2) * variant.wobble + variant.lift;
  }

  function buildFlowerArtProfile(x, variant, variantIndex) {
    const petals = 4 + (variantIndex % 3);
    const envelope = archProfile(x, 0.5 + variant.shift * 0.4, 0.46 * variant.width, 0.72);
    const wave = Math.pow((Math.cos((x + variant.shift * 0.8) * Math.PI * petals * 2) + 1) / 2, 1.2);
    return 0.18 + envelope * (0.3 + wave * 0.46 * variant.height) + variant.lift;
  }

  function buildTreeArtProfile(x, variant) {
    const canopy = Math.max(
      gaussian(x, 0.28 + variant.shift * 0.6, 0.12 * variant.width),
      gaussian(x, 0.5 + variant.shift * 0.2, 0.18 * variant.width),
      gaussian(x, 0.72 - variant.shift * 0.2, 0.12 * variant.width),
    );
    const crown = gaussian(x, 0.5 + variant.shift * 0.2, 0.08 * variant.width) * 0.22;
    return 0.12 + (canopy * 0.7 + crown) * variant.height + variant.lift;
  }

  function buildMountainArtProfile(x, variant) {
    const peakA = archProfile(x, 0.24 + variant.shift, 0.18 * variant.width, 1.8 * variant.sharpen + 0.4) * 0.68;
    const peakB = archProfile(x, 0.5 + variant.shift * 0.2, 0.26 * variant.width, 1.45 * variant.sharpen + 0.35) * 0.96;
    const peakC = archProfile(x, 0.8 - variant.shift * 0.3, 0.18 * variant.width, 1.9 * variant.sharpen + 0.45) * 0.62;
    return 0.08 + Math.max(peakA, peakB, peakC) * variant.height + variant.lift;
  }

  function buildWaveArtProfile(x, variant) {
    const rolling = 0.24 + (Math.sin((x + 0.06 + variant.shift) * Math.PI * 1.65) + 1) * 0.15;
    const crest = gaussian(x, 0.7 + variant.shift * 0.4, 0.11 * variant.width) * 0.24;
    return (rolling + crest + Math.sin((x + variant.shift) * Math.PI * 4) * variant.wobble + variant.lift) * variant.height;
  }

  function buildCloudArtProfile(x, variant) {
    const cloud = Math.max(
      gaussian(x, 0.2 + variant.shift * 0.4, 0.1 * variant.width) * 0.7,
      gaussian(x, 0.4 + variant.shift * 0.2, 0.14 * variant.width) * 0.95,
      gaussian(x, 0.62 - variant.shift * 0.2, 0.14 * variant.width) * 0.85,
      gaussian(x, 0.8 - variant.shift * 0.3, 0.1 * variant.width) * 0.62,
    );
    return 0.16 + cloud * 0.8 * variant.height + variant.lift;
  }

  function buildCatArtProfile(x, variant) {
    const face = gaussian(x, 0.5 + variant.shift * 0.2, 0.27 * variant.width) * 0.48;
    const earLeft = archProfile(x, 0.28 + variant.shift, 0.12 * variant.width, 2.3 * variant.sharpen + 0.55) * 0.84;
    const earRight = archProfile(x, 0.72 + variant.shift, 0.12 * variant.width, 2.3 * variant.sharpen + 0.55) * 0.84;
    return 0.1 + Math.max(face + 0.08, earLeft, earRight) * variant.height + variant.lift;
  }

  function buildBirdArtProfile(x, variant) {
    const wing = archProfile(x, 0.46 + variant.shift * 0.2, 0.36 * variant.width, 0.72 * variant.sharpen + 0.4) * 0.68;
    const head = gaussian(x, 0.75 + variant.shift * 0.15, 0.11 * variant.width) * 0.42;
    const tail = archProfile(x, 0.16 + variant.shift * 0.6, 0.1 * variant.width, 2.2) * 0.24;
    const beak = archProfile(x, 0.88 + variant.shift * 0.2, 0.07 * variant.width, 2.4) * 0.16;
    return 0.1 + Math.max(wing, head + beak, tail + 0.08) * variant.height + variant.lift;
  }

  function buildFishArtProfile(x, variant) {
    const body = archProfile(x, 0.54 + variant.shift * 0.1, 0.34 * variant.width, 0.76) * 0.7;
    const tail = archProfile(x, 0.14 + variant.shift * 0.7, 0.12 * variant.width, 1.85 * variant.sharpen + 0.55) * 0.54;
    const dorsal = gaussian(x, 0.46 + variant.shift * 0.1, 0.08 * variant.width) * 0.22;
    return 0.1 + Math.max(body + dorsal, tail + 0.1) * variant.height + variant.lift;
  }

  function buildButterflyArtProfile(x, variant) {
    const leftUpper = gaussian(x, 0.25 + variant.shift * 0.4, 0.11 * variant.width) * 0.82;
    const leftLower = gaussian(x, 0.39 + variant.shift * 0.3, 0.08 * variant.width) * 0.46;
    const rightUpper = gaussian(x, 0.75 + variant.shift * 0.4, 0.11 * variant.width) * 0.82;
    const rightLower = gaussian(x, 0.61 + variant.shift * 0.3, 0.08 * variant.width) * 0.46;
    const notch = gaussian(x, 0.5 + variant.shift * 0.2, 0.05) * 0.18;
    return 0.08 + (Math.max(leftUpper, leftLower, rightUpper, rightLower) - notch + 0.12) * variant.height + variant.lift;
  }

  function buildFoxArtProfile(x, variant) {
    const face = archProfile(x, 0.48 + variant.shift * 0.15, 0.28 * variant.width, 0.85 * variant.sharpen + 0.45) * 0.5;
    const earLeft = archProfile(x, 0.26 + variant.shift, 0.13 * variant.width, 2.7 * variant.sharpen + 0.35) * 0.86;
    const earRight = archProfile(x, 0.66 + variant.shift * 0.6, 0.13 * variant.width, 2.7 * variant.sharpen + 0.35) * 0.82;
    const snout = archProfile(x, 0.82 + variant.shift * 0.2, 0.12 * variant.width, 1.5 * variant.sharpen + 0.5) * 0.34;
    return 0.1 + Math.max(face, earLeft, earRight, snout) * variant.height + variant.lift;
  }

  function buildWhaleArtProfile(x, variant) {
    const body = archProfile(x, 0.5 + variant.shift * 0.1, 0.42 * variant.width, 0.74) * 0.66;
    const tail = archProfile(x, 0.12 + variant.shift * 0.5, 0.1 * variant.width, 2.1 * variant.sharpen + 0.45) * 0.32;
    const spout = gaussian(x, 0.7 + variant.shift * 0.08, 0.028 * variant.width) * 0.2;
    const back = gaussian(x, 0.58 + variant.shift * 0.12, 0.14 * variant.width) * 0.18;
    return 0.1 + (Math.max(body + back, tail + 0.08) + spout + variant.lift) * variant.height;
  }

  function buildAppleArtProfile(x, variant) {
    const left = gaussian(x, 0.38 + variant.shift * 0.25, 0.18 * variant.width) * 0.62;
    const right = gaussian(x, 0.62 + variant.shift * 0.25, 0.18 * variant.width) * 0.62;
    const notch = gaussian(x, 0.5 + variant.shift * 0.12, 0.055 * variant.width) * 0.18;
    const stem = gaussian(x, 0.54 + variant.shift * 0.1, 0.03 * variant.width) * 0.18;
    return 0.12 + (Math.max(left, right) + stem - notch + 0.1) * variant.height + variant.lift;
  }

  function buildStrawberryArtProfile(x, variant) {
    const body = archProfile(x, 0.5 + variant.shift * 0.1, 0.4 * variant.width, 0.85 * variant.sharpen + 0.35) * 0.66;
    const shoulders = Math.max(
      gaussian(x, 0.34 + variant.shift * 0.2, 0.11 * variant.width),
      gaussian(x, 0.66 + variant.shift * 0.2, 0.11 * variant.width),
    ) * 0.22;
    const crown = Math.cos((x + variant.shift) * Math.PI * 5) * 0.04;
    return 0.1 + (body + shoulders + crown + variant.lift) * variant.height;
  }

  function buildPearArtProfile(x, variant) {
    const upper = gaussian(x, 0.52 + variant.shift * 0.1, 0.12 * variant.width) * 0.34;
    const lower = gaussian(x, 0.5 + variant.shift * 0.08, 0.24 * variant.width) * 0.62;
    const neck = gaussian(x, 0.52 + variant.shift * 0.08, 0.06 * variant.width) * 0.16;
    return 0.12 + (upper + lower + neck + variant.lift) * variant.height;
  }

  function buildBottleArtProfile(x, variant) {
    const neck = gaussian(x, 0.5 + variant.shift * 0.08, 0.055 * variant.width) * 0.82;
    const shoulders = gaussian(x, 0.5 + variant.shift * 0.05, 0.14 * variant.width) * 0.4;
    const body = gaussian(x, 0.5, 0.22 * variant.width) * 0.16;
    return 0.1 + (neck + shoulders + body + variant.lift) * variant.height;
  }

  function buildHeartArtProfile(x, variant) {
    const left = gaussian(x, 0.34 + variant.shift * 0.15, 0.14 * variant.width) * 0.64;
    const right = gaussian(x, 0.66 + variant.shift * 0.15, 0.14 * variant.width) * 0.64;
    const notch = gaussian(x, 0.5 + variant.shift * 0.08, 0.05 * variant.width) * 0.28;
    const center = gaussian(x, 0.5 + variant.shift * 0.08, 0.2 * variant.width) * 0.18;
    return 0.1 + (Math.max(left, right) + center - notch + variant.lift) * variant.height;
  }

  function buildCrownArtProfile(x, variant) {
    const base = gaussian(x, 0.5 + variant.shift * 0.1, 0.32 * variant.width) * 0.18;
    const peakLeft = archProfile(x, 0.22 + variant.shift * 0.4, 0.12 * variant.width, 2.6 * variant.sharpen + 0.35) * 0.7;
    const peakCenter = archProfile(x, 0.5 + variant.shift * 0.1, 0.16 * variant.width, 2.1 * variant.sharpen + 0.35) * 0.84;
    const peakRight = archProfile(x, 0.78 - variant.shift * 0.15, 0.12 * variant.width, 2.6 * variant.sharpen + 0.35) * 0.7;
    return 0.08 + (base + Math.max(peakLeft, peakCenter, peakRight) + variant.lift) * variant.height;
  }

  function buildGiftArtProfile(x, variant) {
    const box = gaussian(x, 0.5 + variant.shift * 0.08, 0.26 * variant.width) * 0.46;
    const bowLeft = gaussian(x, 0.4 + variant.shift * 0.16, 0.07 * variant.width) * 0.24;
    const bowRight = gaussian(x, 0.6 + variant.shift * 0.16, 0.07 * variant.width) * 0.24;
    const knot = gaussian(x, 0.5 + variant.shift * 0.08, 0.03 * variant.width) * 0.16;
    return 0.12 + (box + bowLeft + bowRight + knot + variant.lift) * variant.height;
  }

  function buildFlameArtProfile(x, variant) {
    const core = archProfile(x, 0.52 + variant.shift * 0.18, 0.18 * variant.width, 1.6 * variant.sharpen + 0.45) * 0.82;
    const left = archProfile(x, 0.34 + variant.shift * 0.24, 0.14 * variant.width, 1.9 * variant.sharpen + 0.4) * 0.38;
    const right = archProfile(x, 0.68 + variant.shift * 0.18, 0.12 * variant.width, 2.1 * variant.sharpen + 0.3) * 0.28;
    return 0.08 + (Math.max(core, left, right) + variant.lift) * variant.height;
  }

  function createBarcodeArtShape(id, label, category, note, tags, profileBuilder, decorate) {
    return {
      id,
      label,
      category,
      categoryLabel: BARCODE_ART_CATEGORY_LABELS[category] || "Scene",
      note,
      tags: Array.isArray(tags) ? tags : [],
      profileBuilder,
      decorate,
    };
  }

  function buildRootedTreeProfile(x) {
    const canopy = Math.max(
      gaussian(x, 0.31, 0.12) * 0.55,
      gaussian(x, 0.5, 0.16) * 0.88,
      gaussian(x, 0.7, 0.12) * 0.58,
    );
    return 0.16 + canopy;
  }

  function buildForestHillsProfile(x) {
    return 0.18 + ((Math.sin(x * Math.PI * 2.3 - 0.6) + 1) * 0.12) + gaussian(x, 0.74, 0.12) * 0.14;
  }

  function buildUmbrellaRainProfile(x) {
    return 0.16 + archProfile(x, 0.5, 0.34, 0.72) * 0.66;
  }

  function buildMountainCabinProfile(x) {
    const peakA = archProfile(x, 0.26, 0.17, 1.9) * 0.58;
    const peakB = archProfile(x, 0.52, 0.24, 1.6) * 0.88;
    const peakC = archProfile(x, 0.8, 0.15, 2.1) * 0.5;
    return 0.12 + Math.max(peakA, peakB, peakC);
  }

  function buildMeadowArchProfile(x) {
    return 0.18 + archProfile(x, 0.5, 0.46, 0.74) * 0.54 + gaussian(x, 0.5, 0.18) * 0.1;
  }

  function buildTunaFishProfile(x) {
    return 0.18 + archProfile(x, 0.52, 0.38, 0.66) * 0.62 + gaussian(x, 0.46, 0.09) * 0.12;
  }

  function buildWhaleSplashProfile(x) {
    return 0.16 + archProfile(x, 0.5, 0.42, 0.7) * 0.56 + gaussian(x, 0.68, 0.08) * 0.14;
  }

  function buildFishermanLakeProfile(x) {
    return 0.18 + ((Math.sin(x * Math.PI * 2.5 + 0.2) + 1) * 0.16);
  }

  function buildOceanSwellProfile(x) {
    return 0.2 + ((Math.sin(x * Math.PI * 2.1 - 0.1) + 1) * 0.18) + gaussian(x, 0.7, 0.12) * 0.08;
  }

  function buildHarborBirdsProfile(x) {
    return 0.16 + ((Math.sin(x * Math.PI * 1.7 + 0.7) + 1) * 0.11) + gaussian(x, 0.28, 0.14) * 0.08;
  }

  function buildCastleSkylineProfile(x) {
    const towerA = archProfile(x, 0.18, 0.08, 2.7) * 0.74;
    const towerB = archProfile(x, 0.38, 0.09, 2.4) * 0.56;
    const towerC = archProfile(x, 0.55, 0.11, 2.8) * 0.86;
    const towerD = archProfile(x, 0.76, 0.08, 2.5) * 0.68;
    return 0.12 + Math.max(towerA, towerB, towerC, towerD);
  }

  function buildClockTowerProfile(x) {
    const center = archProfile(x, 0.5, 0.12, 2.9) * 0.86;
    const wings = Math.max(gaussian(x, 0.28, 0.11), gaussian(x, 0.72, 0.11)) * 0.28;
    return 0.12 + center + wings;
  }

  function buildRooflineHomeProfile(x) {
    const homeA = archProfile(x, 0.32, 0.14, 2.2) * 0.52;
    const homeB = archProfile(x, 0.54, 0.16, 2.1) * 0.72;
    const homeC = archProfile(x, 0.78, 0.12, 2.4) * 0.46;
    return 0.14 + Math.max(homeA, homeB, homeC);
  }

  function buildCathedralPeakProfile(x) {
    const middle = archProfile(x, 0.5, 0.16, 3.2) * 0.94;
    const left = archProfile(x, 0.33, 0.09, 2.7) * 0.48;
    const right = archProfile(x, 0.67, 0.09, 2.7) * 0.48;
    return 0.1 + Math.max(middle, left, right);
  }

  function buildBridgeRailProfile(x) {
    return 0.2 + gaussian(x, 0.5, 0.32) * 0.16;
  }

  function buildPizzaSliceProfile(x) {
    return 0.16 + archProfile(x, 0.56, 0.38, 0.94) * 0.54 + gaussian(x, 0.25, 0.08) * 0.16;
  }

  function buildCoffeeSteamProfile(x) {
    return 0.16 + archProfile(x, 0.5, 0.3, 0.9) * 0.38;
  }

  function buildBottleNeckProfile(x) {
    return 0.14 + gaussian(x, 0.5, 0.06) * 0.74 + gaussian(x, 0.5, 0.16) * 0.24;
  }

  function buildHeadphonesArchProfile(x) {
    return 0.14 + archProfile(x, 0.5, 0.34, 1.02) * 0.58;
  }

  function buildClapperboardProfile(x) {
    return 0.14 + archProfile(x, 0.5, 0.45, 1.08) * 0.24 + (1 - x) * 0.18;
  }

  function applyBarcodeArtPreset(model, preset, layout) {
    if (!preset || typeof preset.decorate !== "function") {
      return;
    }
    preset.decorate(createBarcodeArtSceneContext(model, layout));
  }

  function createBarcodeArtSceneContext(model, layout) {
    const barcodeLeft = Number(layout.barcodeLeft) || 0;
    const barcodeWidth = Math.max(1, Number(layout.barcodeWidth) || 1);
    const topPadding = Number(layout.topPadding) || 0;
    const barHeight = Math.max(1, Number(layout.barHeight) || 1);
    const artHeight = Math.max(0, Number(layout.artHeight) || 0);
    const unit = Math.min(barcodeWidth, barHeight);
    return {
      model,
      ink: BARCODE_INK,
      unit(value) {
        return unit * value;
      },
      x(nx) {
        return barcodeLeft + barcodeWidth * nx;
      },
      y(ny) {
        return topPadding + barHeight * ny;
      },
      move(nx, ny) {
        return { op: "M", x: this.x(nx), y: this.y(ny) };
      },
      line(nx, ny) {
        return { op: "L", x: this.x(nx), y: this.y(ny) };
      },
      curve(x1, y1, x2, y2, x, y) {
        return {
          op: "C",
          x1: this.x(x1),
          y1: this.y(y1),
          x2: this.x(x2),
          y2: this.y(y2),
          x: this.x(x),
          y: this.y(y),
        };
      },
      close() {
        return { op: "Z" };
      },
      addFill(commands) {
        pushPath(model, commands, { fill: BARCODE_INK });
      },
      addStroke(commands, strokeWidth) {
        pushPath(model, commands, {
          stroke: BARCODE_INK,
          strokeWidth,
          lineCap: "round",
          lineJoin: "round",
        });
      },
      addRect(nx, ny, nw, nh) {
        pushRect(model, this.x(nx), this.y(ny), barcodeWidth * nw, barHeight * nh, BARCODE_INK);
      },
      addRoundRect(nx, ny, nw, nh, rr) {
        pushRoundRect(
          model,
          this.x(nx),
          this.y(ny),
          barcodeWidth * nw,
          barHeight * nh,
          Math.min(barcodeWidth * nw, barHeight * nh) * rr,
          BARCODE_INK,
        );
      },
      addCircle(nx, ny, r) {
        pushCircle(model, this.x(nx), this.y(ny), unit * r, BARCODE_INK);
      },
      addBird(nx, ny, span, rise, strokeWidth) {
        this.addStroke([
          this.move(nx - span, ny),
          this.curve(nx - span * 0.58, ny - rise, nx - span * 0.2, ny - rise, nx, ny),
          this.curve(nx + span * 0.2, ny - rise, nx + span * 0.58, ny - rise, nx + span, ny),
        ], strokeWidth);
      },
      addFishMark(nx, ny, scale) {
        this.addFill([
          this.move(nx - scale, ny),
          this.line(nx, ny - scale * 0.44),
          this.line(nx + scale * 0.62, ny),
          this.line(nx, ny + scale * 0.44),
          this.close(),
        ]);
      },
      artHeightRatio() {
        return artHeight / barHeight;
      },
    };
  }

  function decorateRootedTree(ctx) {
    ctx.addStroke([ctx.move(0.5, 0.34), ctx.curve(0.5, 0.24, 0.5, 0.13, 0.5, 0.04)], ctx.unit(0.042));
    ctx.addStroke([ctx.move(0.49, 0.12), ctx.curve(0.44, 0.08, 0.38, 0.05, 0.28, 0.05)], ctx.unit(0.016));
    ctx.addStroke([ctx.move(0.5, 0.1), ctx.curve(0.56, 0.06, 0.65, 0.05, 0.75, 0.09)], ctx.unit(0.016));
    ctx.addStroke([ctx.move(0.44, 0.16), ctx.curve(0.38, 0.11, 0.32, 0.08, 0.22, 0.1)], ctx.unit(0.012));
    ctx.addStroke([ctx.move(0.56, 0.16), ctx.curve(0.63, 0.1, 0.72, 0.1, 0.82, 0.13)], ctx.unit(0.012));
    ctx.addCircle(0.24, 0.08, 0.012);
    ctx.addCircle(0.35, 0.05, 0.01);
    ctx.addCircle(0.67, 0.05, 0.011);
    ctx.addCircle(0.79, 0.11, 0.012);
  }

  function decorateForestHills(ctx) {
    ctx.addBird(0.28, 0.09, 0.035, 0.03, ctx.unit(0.008));
    ctx.addBird(0.77, 0.12, 0.032, 0.028, ctx.unit(0.008));
    ctx.addStroke([ctx.move(0.08, 0.22), ctx.curve(0.22, 0.16, 0.34, 0.18, 0.48, 0.21), ctx.curve(0.62, 0.24, 0.72, 0.19, 0.92, 0.2)], ctx.unit(0.01));
    ctx.addRect(0.2, 0.18, 0.012, 0.08);
    ctx.addRect(0.45, 0.17, 0.012, 0.09);
    ctx.addRect(0.69, 0.18, 0.012, 0.08);
  }

  function decorateUmbrellaRain(ctx) {
    ctx.addFill([ctx.move(0.24, 0.26), ctx.curve(0.32, 0.11, 0.68, 0.11, 0.76, 0.26), ctx.line(0.24, 0.26), ctx.close()]);
    ctx.addStroke([ctx.move(0.5, 0.26), ctx.line(0.5, 0.46), ctx.curve(0.5, 0.54, 0.58, 0.57, 0.63, 0.52)], ctx.unit(0.016));
    [0.32, 0.42, 0.58, 0.68].forEach((x) => {
      ctx.addStroke([ctx.move(x, 0.04), ctx.line(x - 0.01, 0.12)], ctx.unit(0.008));
    });
  }

  function decorateMountainCabin(ctx) {
    ctx.addFill([ctx.move(0.18, 0.24), ctx.line(0.28, 0.08), ctx.line(0.39, 0.24), ctx.close()]);
    ctx.addFill([ctx.move(0.34, 0.3), ctx.line(0.52, 0.04), ctx.line(0.71, 0.3), ctx.close()]);
    ctx.addRoundRect(0.47, 0.33, 0.1, 0.11, 0.12);
    ctx.addFill([ctx.move(0.45, 0.33), ctx.line(0.52, 0.26), ctx.line(0.59, 0.33), ctx.close()]);
  }

  function decorateMeadowArch(ctx) {
    ctx.addStroke([ctx.move(0.18, 0.22), ctx.curve(0.2, 0.12, 0.23, 0.08, 0.24, 0.02)], ctx.unit(0.01));
    ctx.addStroke([ctx.move(0.24, 0.02), ctx.curve(0.22, 0.05, 0.2, 0.08, 0.18, 0.1)], ctx.unit(0.008));
    ctx.addStroke([ctx.move(0.24, 0.02), ctx.curve(0.27, 0.05, 0.29, 0.08, 0.3, 0.1)], ctx.unit(0.008));
    ctx.addStroke([ctx.move(0.77, 0.22), ctx.curve(0.74, 0.12, 0.71, 0.08, 0.7, 0.02)], ctx.unit(0.01));
    ctx.addStroke([ctx.move(0.7, 0.02), ctx.curve(0.68, 0.05, 0.66, 0.08, 0.64, 0.1)], ctx.unit(0.008));
    ctx.addStroke([ctx.move(0.7, 0.02), ctx.curve(0.73, 0.05, 0.75, 0.08, 0.76, 0.1)], ctx.unit(0.008));
  }

  function decorateTunaFish(ctx) {
    ctx.addFill([ctx.move(0.04, 0.42), ctx.curve(0.01, 0.46, 0.01, 0.54, 0.05, 0.58), ctx.line(0.12, 0.5), ctx.close()]);
    ctx.addFill([ctx.move(0.88, 0.42), ctx.line(0.98, 0.34), ctx.line(0.93, 0.5), ctx.line(0.98, 0.66), ctx.line(0.88, 0.58), ctx.close()]);
    ctx.addFill([ctx.move(0.42, 0.18), ctx.line(0.5, 0.04), ctx.line(0.59, 0.18), ctx.close()]);
    ctx.addStroke([ctx.move(0.08, 0.48), ctx.curve(0.11, 0.46, 0.14, 0.46, 0.17, 0.48)], ctx.unit(0.008));
  }

  function decorateWhaleSplash(ctx) {
    ctx.addFill([ctx.move(0.18, 0.28), ctx.curve(0.34, 0.16, 0.62, 0.18, 0.8, 0.26), ctx.line(0.83, 0.21), ctx.line(0.89, 0.3), ctx.line(0.78, 0.34), ctx.curve(0.58, 0.3, 0.34, 0.32, 0.18, 0.28), ctx.close()]);
    ctx.addStroke([ctx.move(0.66, 0.13), ctx.curve(0.67, 0.05, 0.7, 0.02, 0.72, -0.02)], ctx.unit(0.01));
    ctx.addStroke([ctx.move(0.69, 0.13), ctx.curve(0.72, 0.05, 0.75, 0.01, 0.78, -0.01)], ctx.unit(0.008));
  }

  function decorateFishermanLake(ctx) {
    ctx.addFill([ctx.move(0.56, 0.22), ctx.line(0.73, 0.22), ctx.line(0.66, 0.28), ctx.line(0.52, 0.28), ctx.close()]);
    ctx.addStroke([ctx.move(0.63, 0.21), ctx.line(0.63, 0.12), ctx.line(0.66, 0.08)], ctx.unit(0.011));
    ctx.addStroke([ctx.move(0.66, 0.08), ctx.curve(0.73, 0.04, 0.84, 0.03, 0.92, 0.18)], ctx.unit(0.01));
    ctx.addBird(0.22, 0.09, 0.03, 0.025, ctx.unit(0.007));
    ctx.addFishMark(0.42, 0.54, 0.028);
    ctx.addFishMark(0.75, 0.5, 0.026);
  }

  function decorateOceanSwell(ctx) {
    ctx.addBird(0.26, 0.08, 0.034, 0.03, ctx.unit(0.008));
    ctx.addBird(0.7, 0.1, 0.03, 0.024, ctx.unit(0.007));
    ctx.addFishMark(0.3, 0.5, 0.024);
    ctx.addFishMark(0.56, 0.58, 0.028);
    ctx.addFishMark(0.82, 0.48, 0.022);
  }

  function decorateHarborBirds(ctx) {
    ctx.addStroke([ctx.move(0.08, 0.26), ctx.curve(0.24, 0.22, 0.38, 0.21, 0.58, 0.24), ctx.curve(0.72, 0.26, 0.82, 0.24, 0.92, 0.22)], ctx.unit(0.01));
    ctx.addBird(0.38, 0.08, 0.03, 0.026, ctx.unit(0.007));
    ctx.addBird(0.58, 0.11, 0.026, 0.022, ctx.unit(0.007));
    ctx.addBird(0.79, 0.09, 0.03, 0.026, ctx.unit(0.007));
  }

  function decorateCastleSkyline(ctx) {
    ctx.addFill([ctx.move(0.12, 0.28), ctx.line(0.12, 0.14), ctx.line(0.16, 0.14), ctx.line(0.16, 0.06), ctx.line(0.2, 0.14), ctx.line(0.24, 0.06), ctx.line(0.24, 0.14), ctx.line(0.3, 0.14), ctx.line(0.3, 0.24), ctx.line(0.4, 0.24), ctx.line(0.4, 0.08), ctx.line(0.45, 0.08), ctx.line(0.45, 0), ctx.line(0.5, 0.08), ctx.line(0.56, 0.08), ctx.line(0.56, 0.18), ctx.line(0.64, 0.18), ctx.line(0.64, 0.08), ctx.line(0.68, 0.08), ctx.line(0.68, 0.02), ctx.line(0.72, 0.08), ctx.line(0.78, 0.08), ctx.line(0.78, 0.26), ctx.line(0.88, 0.26), ctx.line(0.88, 0.28), ctx.close()]);
  }

  function decorateClockTower(ctx) {
    ctx.addFill([ctx.move(0.4, 0.3), ctx.line(0.44, 0.3), ctx.line(0.44, 0.1), ctx.line(0.5, 0), ctx.line(0.56, 0.1), ctx.line(0.56, 0.3), ctx.line(0.6, 0.3), ctx.line(0.6, 0.34), ctx.line(0.4, 0.34), ctx.close()]);
    ctx.addRect(0.24, 0.26, 0.12, 0.05);
    ctx.addRect(0.64, 0.26, 0.12, 0.05);
  }

  function decorateRooflineHome(ctx) {
    ctx.addFill([ctx.move(0.16, 0.3), ctx.line(0.24, 0.18), ctx.line(0.34, 0.3), ctx.line(0.4, 0.3), ctx.line(0.5, 0.12), ctx.line(0.62, 0.3), ctx.line(0.69, 0.3), ctx.line(0.78, 0.2), ctx.line(0.86, 0.3), ctx.line(0.86, 0.34), ctx.line(0.16, 0.34), ctx.close()]);
  }

  function decorateCathedralPeak(ctx) {
    ctx.addFill([ctx.move(0.28, 0.3), ctx.line(0.34, 0.16), ctx.line(0.39, 0.3), ctx.line(0.45, 0.3), ctx.line(0.5, 0.02), ctx.line(0.55, 0.3), ctx.line(0.61, 0.3), ctx.line(0.66, 0.16), ctx.line(0.72, 0.3), ctx.line(0.72, 0.34), ctx.line(0.28, 0.34), ctx.close()]);
  }

  function decorateBridgeRail(ctx) {
    ctx.addRect(0.02, 0.18, 0.96, 0.06);
    ctx.addFill([ctx.move(0.06, 0.31), ctx.line(0.98, 0.24), ctx.line(0.98, 0.3), ctx.line(0.06, 0.37), ctx.close()]);
  }

  function decoratePizzaSlice(ctx) {
    ctx.addFill([ctx.move(0.28, 0.26), ctx.line(0.72, 0.18), ctx.line(0.56, 0.4), ctx.close()]);
    ctx.addStroke([ctx.move(0.32, 0.24), ctx.curve(0.43, 0.12, 0.6, 0.12, 0.69, 0.19)], ctx.unit(0.015));
    ctx.addCircle(0.47, 0.29, 0.018);
    ctx.addCircle(0.57, 0.25, 0.016);
  }

  function decorateCoffeeSteam(ctx) {
    ctx.addRoundRect(0.34, 0.31, 0.28, 0.12, 0.28);
    ctx.addStroke([ctx.move(0.63, 0.35), ctx.curve(0.68, 0.32, 0.7, 0.39, 0.66, 0.42)], ctx.unit(0.012));
    ctx.addStroke([ctx.move(0.42, 0.24), ctx.curve(0.39, 0.16, 0.47, 0.12, 0.44, 0.03)], ctx.unit(0.01));
    ctx.addStroke([ctx.move(0.5, 0.23), ctx.curve(0.47, 0.14, 0.55, 0.1, 0.52, 0.01)], ctx.unit(0.01));
    ctx.addStroke([ctx.move(0.58, 0.24), ctx.curve(0.55, 0.15, 0.63, 0.11, 0.6, 0.02)], ctx.unit(0.01));
  }

  function decorateBottleNeck(ctx) {
    ctx.addRoundRect(0.43, 0.02, 0.14, 0.1, 0.2);
    ctx.addRoundRect(0.39, 0.11, 0.22, 0.12, 0.18);
  }

  function decorateHeadphonesArch(ctx) {
    ctx.addStroke([ctx.move(0.22, 0.28), ctx.curve(0.28, 0.08, 0.72, 0.08, 0.78, 0.28)], ctx.unit(0.025));
    ctx.addRoundRect(0.16, 0.28, 0.08, 0.18, 0.26);
    ctx.addRoundRect(0.76, 0.28, 0.08, 0.18, 0.26);
  }

  function decorateClapperboard(ctx) {
    ctx.addRect(0.08, 0.26, 0.84, 0.06);
    ctx.addFill([ctx.move(0.08, 0.18), ctx.line(0.86, 0.07), ctx.line(0.9, 0.15), ctx.line(0.12, 0.26), ctx.close()]);
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
      paths: [],
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
      frameTexts: options.frameTexts,
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
      addQrLogo(model, logoBadge, options.logo, options.darkColor, options.backgroundColor, options.logoText || options.typeShort);
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

    for (const path of model.paths || []) {
      svg += `<path d="${escapeAttribute(buildSvgCommandPath(path.commands))}"${path.fill ? ` fill="${escapeAttribute(path.fill)}"` : ' fill="none"'}${path.stroke ? ` stroke="${escapeAttribute(path.stroke)}"` : ""}${path.strokeWidth ? ` stroke-width="${formatNumber(path.strokeWidth)}"` : ""}${path.lineCap ? ` stroke-linecap="${escapeAttribute(path.lineCap)}"` : ""}${path.lineJoin ? ` stroke-linejoin="${escapeAttribute(path.lineJoin)}"` : ""}/>`;
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
    renderQrDesignControls();
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
      const groupClass = group === "logo" ? " design-option-logo" : (group === "frame" ? " design-option-frame" : "");
      return `
        <button class="design-option${groupClass}${activeClass}" type="button" data-design-group="${group}" data-design-value="${option.id}">
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
    const scanLines = wrapLabelText(safeTrim(state.qr.style.logoText) || "SCAN ME", 7, 2);
    const typeLines = wrapLabelText(safeTrim(state.qr.style.logoText) || "TEXT", 5, 2);
    const previewScanText = renderPreviewCenteredTextMarkup(
      scanLines.join(" ").trim() || "SCAN ME",
      16,
      16,
      40,
      color,
      {
        baseFontSize: 12,
        minFontSize: 9.5,
        maxCharsPerLine: 7,
        maxLines: 2,
        minWidth: 24,
        minHeight: 24,
        paddingX: 0,
        paddingY: 0,
        lineGap: 2.5,
      },
    );
    const previewTypeText = renderPreviewCenteredTextMarkup(
      typeLines.join(" ").trim() || "TEXT",
      16,
      16,
      40,
      color,
      {
        baseFontSize: 12,
        minFontSize: 9.5,
        maxCharsPerLine: 6,
        maxLines: 2,
        minWidth: 24,
        minHeight: 24,
        paddingX: 0,
        paddingY: 0,
        lineGap: 2.5,
      },
    );
    const previews = {
      none: `
        <rect x="10" y="10" width="52" height="52" rx="14" fill="${background}" stroke="${color}" stroke-width="4"/>
        <line x1="18" y1="18" x2="54" y2="54" stroke="${color}" stroke-width="5"/>
      `,
      globe: `
        <rect x="12" y="12" width="48" height="48" rx="14" fill="${color}"/>
        <rect x="16" y="16" width="40" height="40" rx="12" fill="${background}"/>
        <circle cx="36" cy="36" r="14.4" fill="none" stroke="${color}" stroke-width="4"/>
        <ellipse cx="36" cy="36" rx="6.8" ry="14.4" fill="none" stroke="${color}" stroke-width="2.8"/>
        <ellipse cx="36" cy="36" rx="12" ry="5.4" fill="none" stroke="${color}" stroke-width="2.8"/>
        <rect x="22.4" y="34.6" width="27.2" height="2.8" rx="1.4" fill="${color}"/>
      `,
      scan: `
        <rect x="12" y="12" width="48" height="48" rx="14" fill="${color}"/>
        <rect x="16" y="16" width="40" height="40" rx="12" fill="${background}"/>
        ${previewScanText}
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
        <rect x="12" y="12" width="48" height="48" rx="14" fill="${color}"/>
        <rect x="16" y="16" width="40" height="40" rx="12" fill="${background}"/>
        ${previewTypeText}
      `,
    };
    return `<svg class="design-preview" viewBox="0 0 72 72" aria-hidden="true">${previews[optionId] || previews.none}</svg>`;
  }

  function validateRequiredQrValues(type, values) {
    const missing = type.fields.find((field) => field.required && !safeTrim(values[field.key]));
    return missing ? `${missing.label} is required for this QR type.` : "";
  }

  function validateWifi(values) {
    const security = safeTrim(values.security) || "WPA";
    if (security !== "nopass" && !safeTrim(values.password)) {
      return "Add the WiFi password for the selected security type.";
    }
    if (security === "WPA2-EAP") {
      if (!safeTrim(values.eap)) {
        return "Add the EAP method for WPA2-EAP WiFi.";
      }
      if (!safeTrim(values.identity)) {
        return "Add the identity / username for WPA2-EAP WiFi.";
      }
    }
    return "";
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

  function normalizeInlineLabel(text, fallback, limit) {
    const normalized = String(text || "").replace(/\s+/g, " ").trim();
    return normalized.slice(0, limit || 42) || fallback;
  }

  function wrapLabelText(text, maxCharsPerLine, maxLines) {
    const normalized = normalizeInlineLabel(text, "", maxCharsPerLine * maxLines);
    if (!normalized) {
      return [];
    }

    const words = normalized.split(" ").filter(Boolean);
    const lines = [];
    let current = "";

    for (const rawWord of words) {
      let word = rawWord;

      while (word.length > maxCharsPerLine) {
        if (current) {
          lines.push(current);
          current = "";
          if (lines.length >= maxLines) {
            return lines.slice(0, maxLines);
          }
        }

        lines.push(word.slice(0, maxCharsPerLine));
        word = word.slice(maxCharsPerLine);
        if (lines.length >= maxLines) {
          return lines.slice(0, maxLines);
        }
      }

      if (!word) {
        continue;
      }

      if (!current) {
        current = word;
        continue;
      }

      const next = `${current} ${word}`;
      if (next.length <= maxCharsPerLine) {
        current = next;
        continue;
      }

      lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) {
        break;
      }
    }

    if (current && lines.length < maxLines) {
      lines.push(current);
    }

    return lines.length ? lines.slice(0, maxLines) : [normalized.slice(0, maxCharsPerLine)];
  }

  function estimateVectorTextWidth(text, fontSize) {
    return String(text || "").length * fontSize * 0.58;
  }

  function createLabelLayout(text, maxWidth, config) {
    const lines = wrapLabelText(text, config.maxCharsPerLine, config.maxLines || 2);
    let fontSize = config.baseFontSize;
    const minFontSize = config.minFontSize || 10;
    const paddingX = config.paddingX || 18;
    const paddingY = config.paddingY || 10;
    const lineGap = config.lineGap || 3;
    let widest = Math.max(...lines.map((line) => estimateVectorTextWidth(line, fontSize)), config.minWidth || 0);

    while (widest > maxWidth - paddingX * 2 && fontSize > minFontSize) {
      fontSize -= 0.5;
      widest = Math.max(...lines.map((line) => estimateVectorTextWidth(line, fontSize)), config.minWidth || 0);
    }

    const lineHeight = fontSize * 1.08;
    const textBlockHeight = lineHeight * lines.length + lineGap * Math.max(0, lines.length - 1);
    const width = Math.min(maxWidth, Math.max(config.minWidth || 116, widest + paddingX * 2));
    const height = Math.max(config.minHeight || 34, textBlockHeight + paddingY * 2);
    const startY = (height - textBlockHeight) / 2 + fontSize * 0.82;
    const lineYs = lines.map((_line, index) => startY + index * (lineHeight + lineGap));
    return { lines, fontSize, width, height, lineYs };
  }

  function drawCenteredLabel(model, centerX, topY, layout, fill) {
    layout.lines.forEach((line, index) => {
      pushText(model, centerX, topY + layout.lineYs[index], line, layout.fontSize, fill, "middle");
    });
  }

  function renderPreviewCenteredTextMarkup(text, x, y, size, fill, config) {
    const layout = createLabelLayout(text, size * 0.96, config);
    const topY = y + (size - layout.height) / 2;
    return layout.lines.map((line, index) => (
      `<text x="${formatNumber(x + size / 2)}" y="${formatNumber(topY + layout.lineYs[index])}" text-anchor="middle" font-size="${formatNumber(layout.fontSize)}" font-family="Arial, Helvetica, sans-serif" font-weight="800" fill="${fill}">${escapeHtml(line)}</text>`
    )).join("");
  }

  function getQrFrameInsets(frame, cellSize) {
    switch (frame) {
      case "scan-bottom":
        return { top: 0, bottom: Math.max(68, cellSize * 8) };
      case "scan-top-bottom":
        return { top: Math.max(62, cellSize * 7.8), bottom: Math.max(68, cellSize * 8) };
      case "ticket":
        return { top: Math.max(60, cellSize * 7.2), bottom: Math.max(34, cellSize * 4.4) };
      case "badge":
        return { top: 0, bottom: Math.max(74, cellSize * 8.5) };
      default:
        return { top: 0, bottom: 0 };
    }
  }

  function createLogoBadge(qrOriginX, qrOriginY, qrSize, cellSize, darkColor, backgroundColor) {
    const size = Math.max(cellSize * 7.2, Math.min(qrSize * 0.28, cellSize * 11.5));
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

    const frameTexts = options.frameTexts || { top: `${options.typeShort} QR`, bottom: "SCAN ME" };
    const maxPillWidth = model.width - options.margin * 0.85;

    if (options.frame === "scan-bottom" || options.frame === "badge") {
      const y = options.qrOriginY + options.qrSize + options.cellSize * 1.35;
      const layout = createLabelLayout(frameTexts.bottom, maxPillWidth, {
        baseFontSize: Math.max(14, options.cellSize * 1.72),
        minFontSize: 11,
        maxCharsPerLine: options.frame === "badge" ? 11 : 14,
        minWidth: Math.max(128, options.qrSize * 0.56),
        minHeight: options.frame === "badge" ? Math.max(48, options.cellSize * 4.7) : Math.max(38, options.cellSize * 3.8),
        paddingX: options.frame === "badge" ? 22 : 18,
        paddingY: options.frame === "badge" ? 12 : 10,
      });
      const pillX = (model.width - layout.width) / 2;
      pushRoundRect(model, pillX, y, layout.width, layout.height, layout.height / 2, options.darkColor);
      drawCenteredLabel(model, model.width / 2, y, layout, "#ffffff");
      return;
    }

    if (options.frame === "scan-top-bottom") {
      const topLayout = createLabelLayout(frameTexts.top, maxPillWidth, {
        baseFontSize: Math.max(13, options.cellSize * 1.58),
        minFontSize: 10.5,
        maxCharsPerLine: 12,
        minWidth: Math.max(118, options.qrSize * 0.5),
        minHeight: Math.max(36, options.cellSize * 3.6),
      });
      const topY = options.cellSize * 0.9;
      const topX = (model.width - topLayout.width) / 2;
      pushRoundRect(model, topX, topY, topLayout.width, topLayout.height, topLayout.height / 2, options.darkColor);
      drawCenteredLabel(model, model.width / 2, topY, topLayout, "#ffffff");
      const bottomY = options.qrOriginY + options.qrSize + options.cellSize * 1.3;
      const bottomLayout = createLabelLayout(frameTexts.bottom, maxPillWidth, {
        baseFontSize: Math.max(14, options.cellSize * 1.66),
        minFontSize: 11,
        maxCharsPerLine: 14,
        minWidth: Math.max(128, options.qrSize * 0.56),
        minHeight: Math.max(38, options.cellSize * 3.8),
      });
      const bottomX = (model.width - bottomLayout.width) / 2;
      pushRoundRect(model, bottomX, bottomY, bottomLayout.width, bottomLayout.height, bottomLayout.height / 2, options.darkColor);
      drawCenteredLabel(model, model.width / 2, bottomY, bottomLayout, "#ffffff");
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
      const topLayout = createLabelLayout(frameTexts.top, maxPillWidth, {
        baseFontSize: Math.max(13, options.cellSize * 1.58),
        minFontSize: 10.5,
        maxCharsPerLine: 12,
        minWidth: Math.max(118, options.qrSize * 0.5),
        minHeight: Math.max(36, options.cellSize * 3.6),
      });
      const topX = (model.width - topLayout.width) / 2;
      pushRoundRect(model, topX, topY, topLayout.width, topLayout.height, topLayout.height / 2, options.darkColor);
      drawCenteredLabel(model, model.width / 2, topY, topLayout, "#ffffff");
    }
  }

  function addQrLogo(model, badge, logo, darkColor, backgroundColor, logoText) {
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
      const outerStroke = Math.max(2.4, innerSize * 0.1);
      const innerStroke = Math.max(1.8, innerSize * 0.07);
      pushCircleStroke(model, centerX, centerY, innerSize * 0.36, darkColor, outerStroke);
      pushEllipseStroke(model, centerX, centerY, innerSize * 0.17, innerSize * 0.36, darkColor, innerStroke);
      pushEllipseStroke(model, centerX, centerY, innerSize * 0.3, innerSize * 0.135, darkColor, innerStroke);
      pushRoundRect(model, centerX - innerSize * 0.34, centerY - innerStroke / 2, innerSize * 0.68, innerStroke, innerStroke / 2, darkColor);
      return;
    }

    if (logo === "scan") {
      const layout = createLabelLayout(logoText, innerSize * 0.96, {
        baseFontSize: Math.max(13.5, innerSize * 0.28),
        minFontSize: 11,
        maxCharsPerLine: 7,
        maxLines: 2,
        minWidth: innerSize * 0.74,
        minHeight: innerSize * 0.62,
        paddingX: 0,
        paddingY: 0,
        lineGap: 2.5,
      });
      drawCenteredLabel(model, centerX, centerY - layout.height / 2, layout, darkColor);
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
      const layout = createLabelLayout(logoText, innerSize * 0.94, {
        baseFontSize: Math.max(13.5, innerSize * 0.27),
        minFontSize: 10.5,
        maxCharsPerLine: 6,
        maxLines: 2,
        minWidth: innerSize * 0.72,
        minHeight: innerSize * 0.6,
        paddingX: 0,
        paddingY: 0,
        lineGap: 2.5,
      });
      drawCenteredLabel(model, centerX, centerY - layout.height / 2, layout, darkColor);
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

  function pushCircleStroke(model, cx, cy, r, stroke, strokeWidth) {
    pushPath(model, buildEllipseCommands(cx, cy, r, r), {
      stroke,
      strokeWidth,
      lineCap: "round",
      lineJoin: "round",
    });
  }

  function pushEllipseStroke(model, cx, cy, rx, ry, stroke, strokeWidth) {
    pushPath(model, buildEllipseCommands(cx, cy, rx, ry), {
      stroke,
      strokeWidth,
      lineCap: "round",
      lineJoin: "round",
    });
  }

  function pushPath(model, commands, style) {
    model.paths.push({
      commands,
      fill: style && style.fill ? style.fill : "",
      stroke: style && style.stroke ? style.stroke : "",
      strokeWidth: style && style.strokeWidth ? style.strokeWidth : 0,
      lineCap: style && style.lineCap ? style.lineCap : "round",
      lineJoin: style && style.lineJoin ? style.lineJoin : "round",
    });
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

  function buildEllipseCommands(cx, cy, rx, ry) {
    const k = 0.5522847498;
    const ox = rx * k;
    const oy = ry * k;
    return [
      { op: "M", x: cx + rx, y: cy },
      { op: "C", x1: cx + rx, y1: cy + oy, x2: cx + ox, y2: cy + ry, x: cx, y: cy + ry },
      { op: "C", x1: cx - ox, y1: cy + ry, x2: cx - rx, y2: cy + oy, x: cx - rx, y: cy },
      { op: "C", x1: cx - rx, y1: cy - oy, x2: cx - ox, y2: cy - ry, x: cx, y: cy - ry },
      { op: "C", x1: cx + ox, y1: cy - ry, x2: cx + rx, y2: cy - oy, x: cx + rx, y: cy },
      { op: "Z" },
    ];
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

  function buildEAN8BitString(digits) {
    let bits = "101";

    for (let index = 0; index < 4; index += 1) {
      bits += EAN13_PATTERNS.L[digits[index]];
    }

    bits += "01010";

    for (let index = 4; index < 8; index += 1) {
      bits += EAN13_PATTERNS.R[digits[index]];
    }

    bits += "101";
    return bits;
  }

  function buildUPCABitString(digits) {
    return buildEAN13BitString(`0${digits}`);
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

  function ensureBarcodeFontSelection(fontFamily) {
    const family = safeTrim(fontFamily) || BARCODE_FONT_FAMILY;
    const existing = Array.from(refs.barcodeFontFamily.options || []).some((option) => option.value === family);
    if (!existing) {
      refs.barcodeFontFamily.insertAdjacentHTML("beforeend", `<option value="${escapeAttribute(family)}">${escapeHtml(family)}</option>`);
    }
    refs.barcodeFontFamily.value = family;
  }

  function applyBarcodeFontSuggestions(fontFamilies) {
    const selectedFamily = safeTrim(state.barcode.fontFamily) || BARCODE_FONT_FAMILY;
    const uniqueFamilies = Array.from(new Set(
      (fontFamilies || [])
        .concat(selectedFamily)
        .map((family) => safeTrim(family))
        .filter(Boolean),
    )).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));

    refs.barcodeFontFamily.innerHTML = uniqueFamilies
      .map((family) => `<option value="${escapeAttribute(family)}">${escapeHtml(family)}</option>`)
      .join("");
    ensureBarcodeFontSelection(selectedFamily);
  }

  function setBarcodeFontAccessStatus(message, tone) {
    refs.barcodeFontAccessStatus.textContent = message;
    refs.barcodeFontAccessStatus.classList.remove("ready", "warn");
    if (tone === "ready" || tone === "warn") {
      refs.barcodeFontAccessStatus.classList.add(tone);
    }
  }

  async function primeInstalledFontsIfPossible() {
    applyBarcodeFontSuggestions(BARCODE_FONT_SUGGESTIONS);
    if (installedFontsLoaded || installedFontsLoading) {
      return;
    }

    if (typeof window.queryLocalFonts !== "function") {
      setBarcodeFontAccessStatus("This browser cannot list installed fonts automatically. The regular font list still works.", "warn");
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
      setBarcodeFontAccessStatus("Font access is blocked in this browser, so the dropdown stays on the regular font list.", "warn");
      return;
    }

    setBarcodeFontAccessStatus("Click \"Load installed fonts\" to replace the list with the fonts installed on this PC.", "");
  }

  async function loadInstalledBarcodeFonts(userRequested) {
    if (installedFontsLoading) {
      return;
    }

    if (typeof window.queryLocalFonts !== "function") {
      setBarcodeFontAccessStatus("This browser cannot list installed fonts automatically. The regular font list still works.", "warn");
      return;
    }

    installedFontsLoading = true;
    const idleLabel = "Load installed fonts";
    refs.loadInstalledFontsButton.disabled = true;
    refs.loadInstalledFontsButton.textContent = "Loading fonts...";
    setBarcodeFontAccessStatus("Reading installed fonts from this PC...", "");

    try {
      const localFonts = await window.queryLocalFonts();
      const families = Array.from(new Set(
        localFonts
          .map((entry) => safeTrim(entry.family))
          .filter(Boolean),
      )).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));

      if (!families.length) {
        setBarcodeFontAccessStatus("No installed font families were returned by this browser.", "warn");
        return;
      }

      applyBarcodeFontSuggestions(families);
      installedFontsLoaded = true;
      setBarcodeFontAccessStatus(`Loaded ${families.length} font families from this PC.`, "ready");
    } catch (error) {
      const errorName = error instanceof Error ? error.name : "";
      if (errorName === "NotAllowedError") {
        setBarcodeFontAccessStatus("Font access was denied. Click again if you want to try the browser permission prompt once more.", "warn");
      } else if (errorName === "SecurityError") {
        setBarcodeFontAccessStatus("This browser blocked local font access for this file. The regular font list stays available.", "warn");
      } else if (userRequested) {
        setBarcodeFontAccessStatus("The browser could not read installed fonts right now. The regular font list stays available.", "warn");
      } else {
        setBarcodeFontAccessStatus("Click \"Load installed fonts\" to try reading the fonts installed on this PC.", "");
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
    if (values.phone) lines.push(`TEL;TYPE=VOICE:${normalizePhone(values.phone)}`);
    if (values.workPhone) lines.push(`TEL;TYPE=WORK:${normalizePhone(values.workPhone)}`);
    if (values.fax) lines.push(`TEL;TYPE=FAX:${normalizePhone(values.fax)}`);
    if (values.email) lines.push(`EMAIL:${safeTrim(values.email)}`);
    if (values.website) lines.push(`URL:${normalizeHttpUrl(values.website)}`);

    const address = [values.address || values.street, values.city, values.state, values.zip, values.country].map((value) => escapeVCard(value || ""));
    if (address.some(Boolean)) {
      lines.push(`ADR;TYPE=WORK:;;${address[0]};${address[1]};${address[2]};${address[3]};${address[4]}`);
    }

    if (extended) {
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

    const security = safeTrim(values.security) || "WPA";
    const hidden = values.hidden === true || values.hidden === "true";
    const segments = [
      `T:${security}`,
      `S:${formatWifiPayloadValue(ssid)}`,
    ];

    if (security !== "nopass") {
      const password = safeTrim(values.password || "");
      if (!password) {
        throw new Error("This WiFi QR needs a password for the selected security type.");
      }
      segments.push(`P:${formatWifiPayloadValue(password)}`);
    }

    if (hidden) {
      segments.push("H:true");
    }

    if (security === "WPA2-EAP") {
      if (values.eap) segments.push(`E:${escapeWifi(values.eap)}`);
      if (values.anonymousIdentity) segments.push(`A:${escapeWifi(values.anonymousIdentity)}`);
      if (values.identity) segments.push(`I:${escapeWifi(values.identity)}`);
      if (values.phase2) segments.push(`PH2:${escapeWifi(values.phase2)}`);
    }

    return `WIFI:${segments.join(";")};;`;
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

    for (const path of model.paths || []) {
      context.beginPath();
      appendCanvasCommandPath(context, path.commands);
      if (path.fill) {
        context.fillStyle = path.fill;
        context.fill();
      }
      if (path.stroke && path.strokeWidth) {
        context.strokeStyle = path.stroke;
        context.lineWidth = path.strokeWidth;
        context.lineCap = path.lineCap || "round";
        context.lineJoin = path.lineJoin || "round";
        context.stroke();
      }
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

    for (const path of model.paths || []) {
      const pdfPath = pdfCommandPath(path.commands, pageHeight);
      const operators = [];
      if (path.fill) {
        operators.push(`${pdfColor(path.fill)} rg`);
      }
      if (path.stroke && path.strokeWidth) {
        operators.push(`${pdfColor(path.stroke)} RG`, `${formatNumber(path.strokeWidth)} w`);
      }
      const paintOperator = path.fill && path.stroke && path.strokeWidth ? "B" : (path.fill ? "f" : "S");
      streamParts.push(`${operators.join(" ")} ${pdfPath} ${paintOperator}`);
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

  function appendCanvasCommandPath(context, commands) {
    for (const command of commands || []) {
      switch (command.op) {
        case "M":
          context.moveTo(command.x, command.y);
          break;
        case "L":
          context.lineTo(command.x, command.y);
          break;
        case "C":
          context.bezierCurveTo(command.x1, command.y1, command.x2, command.y2, command.x, command.y);
          break;
        case "Z":
          context.closePath();
          break;
        default:
          break;
      }
    }
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

  function pdfCommandPath(commands, pageHeight) {
    return (commands || []).map((command) => {
      switch (command.op) {
        case "M":
          return `${formatNumber(command.x)} ${formatNumber(pageHeight - command.y)} m`;
        case "L":
          return `${formatNumber(command.x)} ${formatNumber(pageHeight - command.y)} l`;
        case "C":
          return `${formatNumber(command.x1)} ${formatNumber(pageHeight - command.y1)} ${formatNumber(command.x2)} ${formatNumber(pageHeight - command.y2)} ${formatNumber(command.x)} ${formatNumber(pageHeight - command.y)} c`;
        case "Z":
          return "h";
        default:
          return "";
      }
    }).join(" ");
  }

  function buildSvgCompoundPath(paths) {
    return paths.map((shape) => svgShapePath(shape)).join(" ");
  }

  function buildSvgCommandPath(commands) {
    return (commands || []).map((command) => {
      switch (command.op) {
        case "M":
          return `M ${formatNumber(command.x)} ${formatNumber(command.y)}`;
        case "L":
          return `L ${formatNumber(command.x)} ${formatNumber(command.y)}`;
        case "C":
          return `C ${formatNumber(command.x1)} ${formatNumber(command.y1)} ${formatNumber(command.x2)} ${formatNumber(command.y2)} ${formatNumber(command.x)} ${formatNumber(command.y)}`;
        case "Z":
          return "Z";
        default:
          return "";
      }
    }).join(" ");
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
      qrValues[type.id] = getBlankValuesForType(type.id);
    }

    return {
      activeMode: "qr",
      theme: "light",
      barcode: {
        group: "ean-upc",
        format: "ean13",
        digits: "",
        label: "",
        moduleWidth: 3,
        barHeight: 132,
        quietZone: 11,
        textSize: 28,
        fontFamily: BARCODE_FONT_FAMILY,
        fontWeight: 400,
        art: {
          mode: "none",
          shapeHeightPercent: 36,
          uploadName: "",
          uploadSvg: "",
          uploadProfile: null,
        },
      },
      qr: {
        type: "website",
        style: {
          ecc: "M",
          shape: "square",
          corner: "square",
          frame: "none",
          frameTopText: "",
          frameBottomText: "",
          logo: "none",
          logoText: "",
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
      const initial = getQrFieldExampleValue(field);
      values[field.key] = initial !== undefined ? initial : defaultValueForFieldType(field.type);
    }
    return values;
  }

  function getBlankValuesForType(typeId) {
    const type = qrTypeMap[typeId];
    const values = {};
    for (const field of type.fields) {
      if (field.type === "checkbox") {
        values[field.key] = false;
      } else if (field.type === "select") {
        values[field.key] = field.defaultValue !== undefined
          ? field.defaultValue
          : ((field.options && field.options[0] && field.options[0].value) || "");
      } else {
        values[field.key] = "";
      }
    }
    return values;
  }

  function getQrFieldExampleValue(field) {
    if (typeof field.transformDefault === "function") {
      return field.transformDefault(field.defaultValue);
    }
    return field.defaultValue;
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
      .replace(/"/g, '\\"')
      .replace(/:/g, "\\:");
  }

  function formatWifiPayloadValue(value) {
    const escaped = escapeWifi(value);
    return looksLikeWifiHexLiteral(value) ? `"${escaped}"` : escaped;
  }

  function looksLikeWifiHexLiteral(value) {
    const trimmed = safeTrim(value);
    return /^[0-9A-F]+$/i.test(trimmed) && trimmed.length >= 4;
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

