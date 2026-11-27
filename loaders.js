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

  function getSplashSteps() {
    return [
      'Warming up Nkabom…',
      'Checking verified local professionals…',
      'Ready in Accra, Kumasi & nationwide',
    ];
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
        headline: 'Loading your worker dashboard',
        steps: [
          'Syncing your public profile & portfolio photos…',
          'Checking your 30-day trial & billing status…',
          'Preparing your live customer preview…',
        ],
      };
    }
    return {
      headline: 'Preparing your worker dashboard',
      steps: [
        'Setting up your public profile builder…',
        'Loading 30-day free trial details…',
        'Preparing your live customer preview…',
      ],
    };
  }

  function getAccountLoaderCopy() {
    return {
      headline: 'Loading account & settings',
      steps: [
        'Syncing your personal details & plan status…',
        'Checking security & privacy preferences…',
      ],
    };
  }

  function getAuthLoaderCopy(mode = 'login', isWorkerFlow = false) {
    if (mode === 'signup') {
      return {
        headline: 'Creating your Nkabom account',
        steps: isWorkerFlow
          ? [
              'Saving your account details…',
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
        isWorkerFlow ? 'Opening your worker dashboard…' : 'Loading your Nkabom workspace…',
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
    getSplashSteps,
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
