// Port of app.js's titleForView() (concept-04b, lines ~318-349) and
// admin/app.js's equivalent per-tab titles. Static branches only — a
// dynamic detail page (doctor name, condition name, case code, …) is
// filled in by the task that owns that page's real data, marked
// `// TODO(T-xxx)` at the call site.
export type Translate = (key: string) => string;

export type ViewName =
  | 'discover'
  | 'results'
  | 'doctors'
  | 'profile'
  | 'facilities'
  | 'facility'
  | 'topics'
  | 'condition'
  | 'experiences'
  | 'account'
  | 'compose'
  | 'mine'
  | 'security'
  | 'saved'
  | 'notifications'
  | 'person'
  | 'emergency'
  | 'about'
  | 'register'
  | 'signin'
  | 'verify'
  | 'reset'
  // ASSUMPTION(T-008): `terms`/`privacy` are new routes (03-routes-and-contracts.md
  // §1) that did not exist in the prototype's titleForView switch and have
  // no dedicated i18n title key yet — see ISS list in the T-008 hand-off.
  | 'terms'
  | 'privacy'
  | 'queue'
  | 'evidence'
  | 'providers'
  | 'config'
  | 'admin-notifications'
  | 'admin-signin'
  | 'admin-approve'
  | 'admin-security';

export function titleForView(view: ViewName, t: Translate): string {
  switch (view) {
    case 'discover':
      return '';
    case 'results':
      return t('nav.results');
    case 'doctors':
    case 'profile':
      return t('nav.profile');
    case 'facilities':
    case 'facility':
      return t('nav.facilities');
    case 'topics':
    case 'condition':
      return t('nav.condition');
    case 'experiences':
    case 'account':
      return t('nav.account');
    case 'compose':
      return t('nav.compose');
    case 'mine':
      return t('nav.mine');
    case 'security':
      return t('auth.security.title');
    case 'saved':
      return t('mine.bookmarks');
    case 'notifications':
      return t('mine.notifications');
    case 'person':
      return t('person.kicker');
    case 'emergency':
      return t('nav.emergency');
    case 'about':
    case 'terms':
    case 'privacy':
      return t('nav.about');
    case 'register':
      return t('auth.register.title');
    case 'signin':
      return t('auth.signIn.title');
    case 'verify':
      return t('auth.verify.title');
    case 'reset':
      return t('auth.reset.title');
    case 'queue':
      return t('admin.tab.queue');
    case 'evidence':
      return t('admin.tab.evidence');
    case 'providers':
      return t('admin.tab.providers');
    case 'config':
      return t('admin.tab.config');
    case 'admin-notifications':
      return t('admin.tab.notifications');
    case 'admin-signin':
      return t('staff.signIn.title');
    case 'admin-approve':
      return t('staff.device.title');
    case 'admin-security':
      return t('staff.security.title');
    default:
      return '';
  }
}

// Port of app.js's setTitle(): the browser-tab / <title> title, as opposed
// to the in-page h1.display (which callers build from a nav.*/admin.tab.*
// key directly, per task step 14).
export function documentTitle(view: ViewName, t: Translate): string {
  const raw = titleForView(view, t);
  return raw ? `${raw} — ${t('brand.name')}` : `${t('brand.name')} — ${t('brand.tagline')}`;
}
