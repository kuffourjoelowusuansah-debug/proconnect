import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const loaders = require('../loaders.js');

test('splash steps return a non-empty anticipation progression', () => {
  const steps = loaders.getSplashSteps();
  assert.ok(Array.isArray(steps) && steps.length >= 2);
  assert.ok(steps[0].toLowerCase().includes('nkabom'));
});

test('directory loader distinguishes general directory vs active search query', () => {
  const dir = loaders.getDirectoryLoaderCopy({});
  assert.equal(dir.isSearch, false);
  assert.equal(dir.headline, 'Loading Nkabom directory');
  assert.ok(dir.steps.length >= 2);

  const search = loaders.getDirectoryLoaderCopy({ query: 'Plumber', location: 'Kumasi', verifiedOnly: true });
  assert.equal(search.isSearch, true);
  assert.ok(search.headline.includes('Plumber'));
  assert.ok(search.headline.includes('Kumasi'));
  assert.ok(search.querySummary.includes('Verified ID'));
  assert.ok(search.steps[0].includes('Kumasi'));

  const catSearch = loaders.getDirectoryLoaderCopy({ category: 'Electrical' });
  assert.equal(catSearch.isSearch, true);
  assert.ok(catSearch.headline.includes('Electrical'));

  const paged = loaders.getDirectoryLoaderCopy({ page: 2 });
  assert.equal(paged.isSearch, false);
  assert.ok(paged.headline.includes('page 2'));
});

test('search pulse summary builds concise single-line context', () => {
  assert.ok(loaders.getSearchPulseCopy({ query: 'Solar', location: 'Accra' }).includes('“Solar”'));
  assert.ok(loaders.getSearchPulseCopy({ category: 'Painting', minRating: 4.8 }).includes('4.8+ stars'));
  assert.equal(loaders.getSearchPulseCopy({}), 'Refreshing all available professionals…');
});

test('dashboard, account, auth, profile, review, and save loaders provide progressive steps', () => {
  const dashExisting = loaders.getDashboardLoaderCopy(true);
  assert.ok(dashExisting.headline.includes('dashboard'));
  assert.ok(dashExisting.steps.length >= 2);

  const dashNew = loaders.getDashboardLoaderCopy(false);
  assert.ok(dashNew.headline.includes('dashboard'));

  const acct = loaders.getAccountLoaderCopy();
  assert.ok(acct.headline.toLowerCase().includes('account'));

  const signupWorker = loaders.getAuthLoaderCopy('signup', true);
  assert.equal(signupWorker.headline, 'Creating your Nkabom account');
  assert.ok(signupWorker.steps.some((s: string) => s.toLowerCase().includes('dashboard')));

  const signupCustomer = loaders.getAuthLoaderCopy('signup', false);
  assert.ok(signupCustomer.steps.some((s: string) => s.toLowerCase().includes('directory')));

  const login = loaders.getAuthLoaderCopy('login', false);
  assert.equal(login.headline, 'Signing you in');

  const forgot = loaders.getAuthLoaderCopy('forgot', false);
  assert.equal(forgot.headline, 'Sending reset link');

  const reset = loaders.getAuthLoaderCopy('reset', false);
  assert.equal(reset.headline, 'Updating your password');

  const prof = loaders.getProfileLoaderCopy();
  assert.equal(prof.headline, 'Loading professional profile');

  const rev = loaders.getReviewLoaderCopy();
  assert.equal(rev.headline, 'Loading feedback invitation');

  const saveNew = loaders.getProfileSaveLoaderCopy(true);
  assert.ok(saveNew.headline.includes('Publishing'));
  assert.ok(saveNew.steps.some((s: string) => s.includes('30-day')));
});
