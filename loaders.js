((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.NKABOM_LOADERS = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const clean = (v) => String(v || '').trim();

  const LOADER_DURATIONS = {
    appOpenMs: 2600,
    authTransitionMs: 900,
    directoryTransitionMs: 780,
  };

  function getLoaderDurations() {
    return { ...LOADER_DURATIONS };
  }

  function getSplashSteps() {
    return [
      'Warming up Nkabom…',
      'Checking verified local professionals…',
      'Preparing direct WhatsApp briefs…',
      'Ready in Accra, Kumasi & nationwide',
    ];
  }

  function getTransitionLoaderCopy(kind = 'directory', opts = {}) {
    if (kind === 'signin' || kind === 'signup') {
      const target = opts.isWorker ? 'Pro Studio' : 'your Nkabom space';
      return {
        headline: kind === 'signup' ? 'Account ready!' : 'Welcome back!',
        durationMs: LOADER_DURATIONS.authTransitionMs,
        steps: [
          kind === 'signup' ? 'Activating your session…' : 'Verifying your session…',
          `Opening ${target}…`,
        ],
      };
    }

    const q = clean(opts.query);
    const loc = clean(opts.location);
    const cat = clean(opts.category);
    const focus = q ? `“${q}”` : cat ? cat : 'local pros';
    const place = loc ? ` in ${loc}` : '';
    return {
      headline: 'Opening Directory',
      durationMs: LOADER_DURATIONS.directoryTransitionMs,
      steps: [
        `Gathering ${focus}${place}…`,
        'Loading verified IDs, Blazes & WhatsApp links…',
      ],
    };
  }

  function normalizeClientPassId(raw) {
    const str = clean(raw).toUpperCase();
    if (/^USER\d{4}$/.test(str)) return str;
    const digits = Math.floor(1000 + Math.random() * 9000);
    return `USER${digits}`;
  }

  function addSearchHistoryEntry(list, entry = {}, maxItems = 15) {
    const query = clean(entry.query).slice(0, 80);
    const location = clean(entry.location).slice(0, 80);
    const category = clean(entry.category).slice(0, 50);
    if (!query && !location && !category) {
      return Array.isArray(list) ? list.slice(0, maxItems) : [];
    }
    const key = `${query.toLowerCase()}|${location.toLowerCase()}|${category.toLowerCase()}`;
    const existing = Array.isArray(list) ? list : [];
    const nextItem = {
      id: clean(entry.id) || `sh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      query,
      location,
      category,
      searchedAt: clean(entry.searchedAt) || new Date().toISOString(),
    };
    const filtered = existing.filter((item) => {
      if (!item || typeof item !== 'object') return false;
      const k = `${clean(item.query).toLowerCase()}|${clean(item.location).toLowerCase()}|${clean(item.category).toLowerCase()}`;
      return k !== key;
    });
    return [nextItem, ...filtered].slice(0, maxItems);
  }

  function getDirectoryLoaderCopy(opts = {}) {
    const query = clean(opts.query);
    const location = clean(opts.location);
    const category = clean(opts.category);
    const verifiedOnly = Boolean(opts.verifiedOnly);
    const minRating = Number(opts.minRating) || 0;
    const page = Math.max(1, Number(opts.page) || 1);
    const isSearch = Boolean(query || location || category || verifiedOnly || minRating > 0);

    if (page > 1 && !isSearch) {
      return {
        isSearch: false,
        headline: `Loading page ${page} of the directory`,
        querySummary: 'More verified professionals',
        steps: [
          'Fetching the next set of local experts…',
          'Loading portfolios, ratings & WhatsApp links…',
        ],
      };
    }

    if (isSearch) {
      const subject = query
        ? `“${query}”`
        : category
          ? category
          : 'trusted pros';
      const place = location ? ` in ${location}` : ' across Ghana';
      const filters = [];
      if (category && query) filters.push(category);
      if (verifiedOnly) filters.push('Verified ID');
      if (minRating > 0) filters.push(`${minRating}+ rating`);

      return {
        isSearch: true,
        headline: query
          ? `Searching for ${subject}${location ? ` in ${location}` : ''}`
          : category
            ? `Finding ${category} specialists${location ? ` in ${location}` : ''}`
            : `Searching professionals${place}`,
        querySummary: [subject + place, ...filters].join(' · '),
        steps: [
          `Scanning directory for ${subject}${place}…`,
          'Checking Verified IDs, Blazes & client reviews…',
          'Ranking active pros ready on WhatsApp…',
        ],
      };
    }

    return {
      isSearch: false,
      headline: 'Loading Nkabom directory',
      querySummary: 'Accra · Kumasi · Takoradi · Nationwide',
      steps: [
        'Gathering live professionals near you…',
        'Loading portfolios, ratings & Blazes…',
        'Preparing direct WhatsApp introductions…',
      ],
    };
  }

  function getSearchPulseCopy(opts = {}) {
    const query = clean(opts.query);
    const location = clean(opts.location);
    const category = clean(opts.category);
    const parts = [];
    if (query) parts.push(`“${query}”`);
    else if (category) parts.push(category);
    if (location) parts.push(`in ${location}`);
    if (opts.verifiedOnly) parts.push('Verified ID');
    if (Number(opts.minRating) > 0) parts.push(`${opts.minRating}+ stars`);
    if (!parts.length) return 'Refreshing all available professionals…';
    return `Searching directory for ${parts.join(' · ')}…`;
  }

  function getDashboardLoaderCopy(hasProfile = false) {
    if (hasProfile) {
      return {
        headline: 'Loading your Pro Studio',
        steps: [
          'Syncing your public profile & portfolio photos…',
          'Checking your 30-day trial & billing status…',
          'Preparing your live customer preview…',
        ],
      };
    }
    return {
      headline: 'Preparing your Pro Studio',
      steps: [
        'Setting up your public profile builder…',
        'Loading 30-day free trial details…',
        'Preparing your live customer preview…',
      ],
    };
  }

  function getAccountLoaderCopy() {
    return {
      headline: 'Loading your Account Hub',
      steps: [
        'Syncing Client Pass & Pro Studio modes…',
        'Checking search history, saved pros & settings…',
      ],
    };
  }

  function getAuthLoaderCopy(mode = 'login', isWorkerFlow = false) {
    if (mode === 'signup') {
      return {
        headline: 'Creating your Nkabom account',
        steps: isWorkerFlow
          ? [
              'Saving your Pro Studio details…',
              'Securing your private session…',
              'Opening your worker dashboard…',
            ]
          : [
              'Saving your account details…',
              'Securing your private session…',
              'Loading your Nkabom directory…',
            ],
      };
    }
    if (mode === 'forgot') {
      return {
        headline: 'Sending reset link',
        steps: [
          'Checking your account email…',
          'Preparing a secure password reset link…',
        ],
      };
    }
    if (mode === 'reset') {
      return {
        headline: 'Updating your password',
        steps: [
          'Saving your new password securely…',
          'Preparing your sign-in screen…',
        ],
      };
    }
    return {
      headline: 'Signing you in',
      steps: [
        'Verifying your credentials…',
        isWorkerFlow ? 'Opening your Pro Studio…' : 'Loading your Nkabom workspace…',
      ],
    };
  }

  function getProfileLoaderCopy() {
    return {
      headline: 'Loading professional profile',
      steps: [
        'Fetching bio, service area & portfolio…',
        'Loading verified client reviews & Blazes…',
      ],
    };
  }

  function getReviewLoaderCopy() {
    return {
      headline: 'Loading feedback invitation',
      steps: [
        'Checking your one-time invite link…',
        'Preparing professional details…',
      ],
    };
  }

  function getProfileSaveLoaderCopy(isNew = false) {
    if (isNew) {
      return {
        headline: 'Publishing your Nkabom profile',
        steps: [
          'Saving your trade details & WhatsApp link…',
          'Activating your 30-day free trial…',
          'Adding you to live directory search…',
        ],
      };
    }
    return {
      headline: 'Saving profile updates',
      steps: [
        'Updating your public listing…',
        'Refreshing live directory search…',
      ],
    };
  }

  return {
    getLoaderDurations,
    getSplashSteps,
    getTransitionLoaderCopy,
    normalizeClientPassId,
    addSearchHistoryEntry,
    getDirectoryLoaderCopy,
    getSearchPulseCopy,
    getDashboardLoaderCopy,
    getAccountLoaderCopy,
    getAuthLoaderCopy,
    getProfileLoaderCopy,
    getReviewLoaderCopy,
    getProfileSaveLoaderCopy,
  };
});
