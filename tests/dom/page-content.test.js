import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { expect, it } from 'vitest';

function readPage() {
  return readFileSync(new URL('../../public/index.html', import.meta.url), 'utf8');
}

function pageDocument() {
  return new JSDOM(readPage()).window.document;
}

function pageWithLayoutStyles() {
  const document = pageDocument();
  const style = document.createElement('style');
  style.textContent = readFileSync(new URL('../../public/css/layout.css', import.meta.url), 'utf8');
  document.head.append(style);
  return document;
}

function templateAttributes(document) {
  return [...document.querySelectorAll('*')].flatMap((element) =>
    element.getAttributeNames().filter((name) => name.startsWith('sc-camel')));
}

it('contains no template bindings', () => {
  expect(readPage()).not.toContain('{{');
});

it('contains no sc-camel attributes', () => {
  expect(templateAttributes(pageDocument())).toEqual([]);
});

it.each(['base', 'layout', 'sections', 'form'])('links the %s stylesheet', (name) => {
  const link = pageDocument().querySelector(`link[rel="stylesheet"][href^="css/${name}.css"]`);
  expect(link).not.toBeNull();
  expect(readFileSync(new URL(`../../public/css/${name}.css`, import.meta.url), 'utf8')).not.toBe('');
});

it.each(['programme', 'sponsor', 'partners', 'register'])('contains the %s section', (id) => {
  expect(pageDocument().querySelector(`section#${id}`)).not.toBeNull();
});

it('keeps all styles in external stylesheets', () => {
  expect(pageDocument().querySelector('style, [style], [style-hover]')).toBeNull();
});

it('uses native HTML instead of template elements and runtime scripts', () => {
  expect(pageDocument().querySelector('x-dc, helmet, sc-if, sc-raw-select, script[type="text/x-dc"], script[data-dc-script], script:not([src])')).toBeNull();
});

it('starts with the delegate form and its resolved submit label', () => {
  expect(pageDocument().querySelector('form input[name="audience"]').value).toBe('Delegate');
  expect(pageDocument().querySelector('form button[type="submit"]').textContent).toBe('Register as delegate');
  expect(pageDocument().querySelector('[data-sponsor-fields]').hasAttribute('hidden')).toBe(true);
});

it('points every section link to an existing target', () => {
  const document = pageDocument();
  const targets = [...document.querySelectorAll('a[href^="#"]')];
  expect(targets.every((link) => document.getElementById(link.hash.slice(1)))).toBe(true);
});

it('has one registration anchor containing the form', () => {
  const document = pageDocument();
  expect(document.querySelectorAll('#register')).toHaveLength(1);
  expect(document.querySelector('section#register form')).not.toBeNull();
});

it('offsets the registration anchor below the sticky header', () => {
  const document = pageWithLayoutStyles();
  const section = document.querySelector('#register');
  expect(document.defaultView.getComputedStyle(section).scrollMarginTop).toBe('150px');
});

it('contains no January 2027 dates anywhere in the HTML', () => {
  expect(readPage().includes('January 2027')).toBe(false);
});

it.each(['.hero-section', '#register', 'footer'])('shows the new dates in %s', (selector) => {
  expect(pageDocument().querySelector(selector).textContent).toContain('26–27 February 2027');
});

it('shows the new dates in the dossier When block', () => {
  const blocks = [...pageDocument().querySelectorAll('.hero-grid-3 > div')];
  const when = blocks.find((block) => block.querySelector('.hero-content-11')?.textContent === 'When');
  expect(when?.querySelector('.hero-content-12')?.textContent).toBe('26–27 February 2027');
});

it('removes the pending announcement while preserving the Pune venue', () => {
  const html = readPage();
  expect(html.includes('Exact dates and venue announced shortly')).toBe(false);
  expect(pageDocument().querySelector('.hero-grid-3').textContent).toContain('Pune, Maharashtra, India');
});

it('lists only Synergy Technofin and QuantumLeap as organising partners', () => {
  const document = pageDocument();
  const descriptions = [...document.querySelectorAll('#organisers .organisers-text')];
  const names = descriptions.map((text) => text.parentElement.querySelector('h3').textContent);
  expect(names).toEqual(['Synergy Technofin', 'QuantumLeap (QLBS)']);
  expect(document.querySelector('#organisers').textContent).not.toContain('Map My Crop');
});

it('places the Associate Partner block directly after organising partners', () => {
  const nextBlock = pageDocument().querySelector('#organisers').nextElementSibling;
  expect(nextBlock.id).toBe('associate-partner');
  expect(nextBlock.querySelector('h2')?.textContent).toBe('Associate Partner');
});

it('places the Map My Crop card after the Associate Partner heading', () => {
  const heading = pageDocument().querySelector('#associate-partner h2');
  const card = heading?.nextElementSibling?.querySelector('.organisers-content-2');
  expect(card?.querySelector('h3')?.textContent).toBe('Map My Crop');
  expect(card?.querySelector('p')?.textContent).toContain('satellite AI-driven agriculture technology company');
});

it('credits Synergy Technofin with QuantumLeap in the Convened by line', () => {
  const line = pageDocument().querySelector('.hero-content-13 .hero-content-12').textContent;
  expect(line).toBe('Synergy Technofin, with QuantumLeap');
  expect(line).not.toContain('Map My Crop');
});

it('shows the 2027 copyright year instead of 2026', () => {
  expect(pageDocument().querySelector('footer').textContent).toContain('© 2027');
  expect(readPage().includes('© 2026')).toBe(false);
});

const restoredImages = [
  ['.header-image', 'assets/logo/logo-mark.png'],
  ['.footer-image', 'assets/logo/logo-mark.png'],
  ['.hero-image', 'assets/produce-market.jpg'],
  ['.hero-image-2', 'assets/watermelon-cargo.jpg'],
  ['.objectives-image', 'assets/export-container-ship.jpg'],
  ['.objectives-image-2', 'assets/produce-market.jpg'],
  ['.objectives-image-3', 'assets/fresh-vegetables.jpg'],
  ['.objectives-image-4', 'assets/produce-processing.jpg'],
  ['.objectives-image-5', 'assets/punjab-farmland.jpg'],
  ['.objectives-image-6', 'assets/port-terminal.jpg'],
];

it.each(restoredImages)('loads the final-design photo or logo for %s', (selector, source) => {
  expect(pageDocument().querySelector(selector).getAttribute('src')).toBe(source);
  const bytes = readFileSync(new URL(`../../public/${source}`, import.meta.url));
  const signature = source.endsWith('.jpg') ? [255, 216, 255] : [137, 80, 78];
  expect([...bytes.subarray(0, 3)]).toEqual(signature);
  if (source.endsWith('.jpg')) expect(bytes.length).toBeLessThan(350_000);
});

it('describes the final-design hero and agricultural photos accurately', () => {
  const document = pageDocument();
  expect(document.querySelector('.hero-image').alt).toBe('Crates of grapes, oranges and apples at a produce market');
  expect(document.querySelector('.hero-image-2').alt).toBe('Aerial view of a cargo boat loaded with watermelons');
  expect(document.querySelector('.objectives-image-4').alt).toBe('Quality sorting of produce on a processing line');
});

function mobileDocument() {
  const document = pageDocument();
  const style = document.createElement('style');
  style.textContent = ['layout', 'form'].map(name => readFileSync(new URL(`../../public/css/${name}.css`, import.meta.url), 'utf8')).join('\n');
  document.head.append(style);
  return document;
}

function mobileRules(document, width) {
  return [...document.styleSheets[0].cssRules].flatMap(rule => {
    const maximum = rule.conditionText?.match(/max-width:\s*(\d+)px/);
    return maximum && width <= Number(maximum[1]) ? [...rule.cssRules] : [];
  });
}

function mobileProperty(selector, width, property) {
  const document = mobileDocument();
  const element = document.querySelector(selector);
  const rules = mobileRules(document, width).filter(rule => rule.selectorText && element.matches(rule.selectorText));
  const important = rules.filter(rule => rule.style.getPropertyPriority(property) === 'important');
  return (important.length ? important : rules).map(rule => rule.style.getPropertyValue(property)).filter(Boolean).at(-1);
}

it.each([320, 390, 520, 768, 1024])('keeps navigation available at %ipx', width => {
  expect(mobileProperty('header nav', width, 'display')).toBe('flex');
  expect(mobileProperty('header nav', width, 'overflow-x')).toBe('visible');
  expect(mobileProperty('header nav', width, 'flex-wrap')).toBe('wrap');
});

it.each([320, 390, 520])('stacks registration fields and contains inputs at %ipx', width => {
  expect(mobileProperty('.register-grid', width, 'grid-template-columns')).toBe('minmax(0, 1fr)');
  expect(mobileProperty('.register-input', width, 'min-width')).toBe('0');
  expect(mobileProperty('.register-input', width, 'box-sizing')).toBe('border-box');
});

it.each([320, 390, 520, 768])('contains the logistics caption at %ipx', width => {
  expect(mobileProperty('.hero-content-17', width, 'left')).toBe('32px');
  expect(mobileProperty('.hero-content-17', width, 'right')).toBe('32px');
  expect(mobileProperty('.hero-content-17', width, 'max-width')).toBe('none');
});

it('keeps the expanded mobile header from covering anchor destinations', () => {
  expect(mobileProperty('.header-content', 390, 'position')).toBe('static');
  expect(mobileProperty('#register', 390, 'scroll-margin-top')).toBe('20px');
});

it('keeps the logo and register button compact on narrow phones', () => {
  expect(mobileProperty('.header-image', 320, 'width')).toBe('clamp(128px, 44vw, 168px)');
  expect(mobileProperty('.header-image', 320, 'height')).toBe('auto');
});

it.each([320, 390, 520])('gives the mobile logo priority over contact clutter at %ipx', width => {
  expect(mobileProperty('.header-label', width, 'display')).toBe('none');
  expect(mobileProperty('.header-link-5', width, 'min-height')).toBe('44px');
  expect(mobileProperty('.header-link-3', width, 'border-radius')).toBe('999px');
});

it.each([320, 390, 520])('keeps the mobile hero readable at %ipx', width => {
  expect(mobileProperty('.hero-title', width, 'padding')).toBe('0');
  expect(mobileProperty('.hero-title', width, 'font-size')).toBe('clamp(30px, 8.8vw, 42px)');
  expect(mobileProperty('.hero-text', width, 'font-size')).toBe('16px');
});

it.each([320, 390, 520])('places the logistics caption below its photo at %ipx', width => {
  expect(mobileProperty('.hero-content-17', width, 'position')).toBe('static');
  expect(mobileProperty('.hero-content-17', width, 'margin-top')).toBe('12px');
});

it('keeps mobile-only polish out of the desktop layout', () => {
  expect(mobileRules(mobileDocument(), 1440)).toHaveLength(0);
});

it.each(['.objectives-heading', '.sessions-heading', '.sponsor-heading'])('fits the narrow-phone section title %s', selector => {
  expect(mobileProperty(selector, 320, 'font-size')).toBe('clamp(28px, 8vw, 36px)');
  expect(mobileProperty(selector, 320, 'overflow-wrap')).toBe('anywhere');
});

const eventGalleryImages = [
  ['.gallery-card', 'event-delegates.jpg'],
  ['.gallery-card-2', 'event-inaugural-ceremony.jpg'],
  ['.gallery-card-3', 'event-technical-session.jpg'],
  ['.gallery-card-4', 'event-audience-question.jpg'],
  ['.gallery-card-5', 'event-panel-discussion.jpg'],
  ['.gallery-card-6', 'event-keynote.jpg'],
  ['.gallery-card-7', 'event-keynote-2.jpg'],
];

it.each(eventGalleryImages)('uses a real, lightweight event photo for %s', (selector, file) => {
  expect(pageDocument().querySelector(selector).getAttribute('src')).toBe(`assets/${file}`);
  const bytes = readFileSync(new URL(`../../public/assets/${file}`, import.meta.url));
  expect([...bytes.subarray(0, 3)]).toEqual([255, 216, 255]);
  expect(bytes.length).toBeLessThan(500_000);
});

it.each(eventGalleryImages)('lazy-loads %s with explicit image dimensions', selector => {
  const image = pageDocument().querySelector(selector);
  expect(image.getAttribute('loading')).toBe('lazy');
  expect(image.getAttribute('decoding')).toBe('async');
  expect(image.getAttribute('width')).toBe('1600');
  expect(image.getAttribute('height')).toBe('1066');
});

it('replaces every unresolved gallery image reference', () => {
  const images = [...pageDocument().querySelectorAll('#gallery img')];
  expect(images).toHaveLength(7);
  expect(images.every(image => image.getAttribute('src').startsWith('assets/event-'))).toBe(true);
});

it.each(['partners', 'supporting'])('hides the %s block while preserving its content', id => {
  const section = pageDocument().querySelector(`section#${id}`);
  expect(section.hidden).toBe(true);
  expect(section.querySelector('h2')).not.toBeNull();
  expect(section.querySelector('a[href="#register"]')).not.toBeNull();
});

it('hides navigation links to the temporarily hidden partners block', () => {
  const links = [...pageDocument().querySelectorAll('a[href="#partners"]')];
  expect(links.length).toBeGreaterThan(0);
  expect(links.every(link => link.hidden)).toBe(true);
});

const brochureTiers = [['Platinum', '20.00'], ['Diamond', '15.00'], ['Gold', '10.00'], ['Silver', '5.00']];
const brochureCommonBenefits = [
  'Prominent branding across all event marketing & communication collaterals',
  'Special acknowledgment during Inaugural and Valedictory Ceremonies',
  'Logo placement on Main Stage Backdrop',
  'Branding on event website, delegate kits, lanyards & registration counter',
  'Logo inclusion in all sponsor creatives and official press releases',
  'Logo on knowledge paper', 'Complimentary delegate passes',
];
const brochureKeynote = 'Keynote address during Inaugural or Valedictory Session';
const brochurePanel = 'Participation in one high-level panel discussion';
const brochureModerator = 'Moderator role for one panel discussion';
const brochureCover = 'Back cover page of the official Event Souvenir';

function brochureCard(name) {
  return [...pageDocument().querySelectorAll('#sponsor .sponsor-grid-2 > div')].find(card => card.firstElementChild.textContent === name);
}

function brochureBenefits(name) {
  const stage = name === 'Silver' ? [] : [brochurePanel, brochureModerator];
  const premium = ['Platinum', 'Diamond'].includes(name) ? [brochureKeynote, ...stage, brochureCover] : stage;
  return [`Official designation as ${name} Sponsor`, ...brochureCommonBenefits.slice(0, 2), ...premium, ...brochureCommonBenefits.slice(2)];
}

it.each(brochureTiers)('matches the brochure %s price and benefits', (name, price) => {
  const card = brochureCard(name);
  expect(card.querySelector('.sponsor-content-3').textContent).toBe(`Rs. ${price} Lakhs`);
  expect([...card.querySelectorAll('li')].map(item => item.textContent)).toEqual(brochureBenefits(name));
});

it('keeps the hidden partner prices consistent with the brochure', () => {
  const prices = [...pageDocument().querySelectorAll('#partners .partners-content-2')].map(element => element.textContent);
  expect(prices).toEqual(brochureTiers.map(([, price]) => `Rs. ${price} Lakhs`));
});

it('includes the full brochure overview and Synergy 5F concept', () => {
  const document = pageDocument();
  expect(document.querySelector('#about').textContent).toContain('As global markets place increasing emphasis on food safety, quality assurance, traceability and sustainability');
  expect(document.querySelector('#about').textContent).toContain('The event will facilitate dialogue, knowledge exchange and collaboration');
  expect(document.querySelector('#organisers').textContent).toContain('technical agribusiness advisories');
  expect(document.querySelector('#organisers').textContent).toContain('5F Concept—Farmers, Farms, Farming, Farm Business, and Farm Tech');
});

it.each([['Ms. Vandana Khurana', 'khurana.v@synergytechnofin.com'], ['Mr. Abhishek Kumar', 'abhishek.k@synergytechnofin.com']])('provides the brochure contact %s', (name, email) => {
  const section = pageDocument().querySelector('#register');
  expect(section.textContent).toContain(name);
  expect(section.querySelector(`a[href="mailto:${email}"]`)?.textContent).toBe(email);
});

it('shows the event website from the brochure without replacing the working registration form', () => {
  const section = pageDocument().querySelector('#register');
  expect(section.querySelector('a[href="https://www.agrixportindia.com"]')?.textContent).toBe('www.agrixportindia.com');
  expect(section.querySelector('form')).not.toBeNull();
  expect(section.textContent).not.toContain('registration opens ahead');
});

it('uses the brochure inaugural description and GlobalG.A.P. spelling', () => {
  const programme = pageDocument().querySelector('#programme');
  expect(programme.textContent).toContain("Exploring India's export vision");
  expect(programme.textContent).toContain('GlobalG.A.P. Certification systems');
});

it('does not promise stage or souvenir benefits to every sponsor tier', () => {
  const introduction = pageDocument().querySelector('#sponsor .objectives-text').textContent;
  expect(introduction).not.toContain('each carrying stage presence');
  expect(introduction).toContain('complimentary delegate passes');
});

it('refreshes the About stylesheet so cached layouts cannot collapse its copy', () => {
  const link = pageDocument().querySelector('link[href^="css/sections.css"]');
  expect(link.getAttribute('href')).toBe('css/sections.css?v=40');
});

it('gives the About copy eight desktop grid columns', () => {
  const document = pageDocument();
  const style = document.createElement('style');
  style.textContent = readFileSync(new URL('../../public/css/sections.css', import.meta.url), 'utf8');
  document.head.append(style);
  expect(document.defaultView.getComputedStyle(document.querySelector('.about-copy')).gridColumn).toBe('5 / span 8');
});

const approvedFonts = ['archivo-vietnamese', 'archivo-latin-ext', 'archivo-latin', 'archivo-narrow-vietnamese', 'archivo-narrow-latin-ext', 'archivo-narrow-latin'];

it.each(approvedFonts)('ships the approved %s font as a real WOFF2 asset', name => {
  expect(pageDocument().querySelector('link[href="css/base.css?v=38"]')).not.toBeNull();
  const css = readFileSync(new URL('../../public/css/base.css', import.meta.url), 'utf8');
  expect(css).toContain(`../assets/fonts/${name}.woff2`);
  const font = readFileSync(new URL(`../../public/assets/fonts/${name}.woff2`, import.meta.url));
  expect(font.subarray(0, 4).toString()).toBe('wOF2');
});

it('contains no unresolved font references from the HTML bundle', () => {
  const css = readFileSync(new URL('../../public/css/base.css', import.meta.url), 'utf8');
  const sources = [...css.matchAll(/src: url\("([^" ]+)"\)/g)].map(match => match[1]);
  expect(sources.length).toBeGreaterThan(0);
  expect(sources.every(source => source.startsWith('../assets/fonts/') && source.endsWith('.woff2'))).toBe(true);
});

it('replaces empty speaker portraits with an honest announcement', () => {
  const section = pageDocument().querySelector('#speakers');
  expect(section.querySelector('h2').textContent).toBe('Speakers');
  expect(section.textContent).toContain('Speaker announcements coming soon');
  expect(section.textContent).not.toMatch(/Confirmed|Portrait|Designation, organisation|To be announced/);
  expect(section.querySelectorAll('.speakers-content-2')).toHaveLength(0);
});

it('keeps a clear route from the speaker announcement to registration', () => {
  const link = pageDocument().querySelector('#speakers .speaker-announcement a');
  expect(link?.getAttribute('href')).toBe('#register');
  expect(link?.textContent).toBe('Register your interest');
});

it('refreshes the mobile navigation stylesheet after changing its layout', () => {
  expect(pageDocument().querySelector('link[href="css/layout.css?v=39"]')).not.toBeNull();
});

it.each([320, 390, 768])('keeps the Sponsorship navigation link available at %ipx', width => {
  expect(mobileProperty('header nav a[href="#sponsor"]', width, 'display')).not.toBe('none');
});

it('identifies the event and its date before the hero slogan', () => {
  const hero = pageDocument().querySelector('.hero-content');
  expect(hero.querySelector('.hero-event-name')?.textContent).toBe('AgriXport India 2027');
  expect(hero.querySelector('.hero-event-details')?.textContent).toBe('26–27 February 2027 · Pune, Maharashtra, India');
  expect(hero.querySelector('.hero-event-name').compareDocumentPosition(hero.querySelector('h1')) & 4).toBe(4);
});

it('provides a real downloadable brochure with an explicit PDF label', () => {
  const link = pageDocument().querySelector('.hero-content a[download]');
  expect(link?.getAttribute('href')).toBe('assets/agrixport-india-2027-brochure.pdf');
  expect(link?.textContent).toMatch(/Download brochure.*PDF/);
  expect(readFileSync(new URL('../../public/assets/agrixport-india-2027-brochure.pdf', import.meta.url)).subarray(0, 5).toString()).toBe('%PDF-');
});

it('explains the delegate confirmation and sponsorship follow-up beside the form', () => {
  const guidance = pageDocument().querySelector('#register .registration-guidance');
  expect(guidance?.textContent).toContain('Delegates receive a registration confirmation by email.');
  expect(guidance?.textContent).toContain('Sponsorship enquiries go to the organising team for follow-up.');
  expect(guidance?.querySelector('a')?.getAttribute('href')).toBe('#faq');
});

it('answers common visitor questions with native expandable FAQ items', () => {
  const faq = pageDocument().querySelector('#faq');
  expect(faq?.querySelectorAll('details')).toHaveLength(5);
  expect(faq?.querySelectorAll('details > summary')).toHaveLength(5);
  expect(faq?.textContent).toContain('26–27 February 2027');
  expect(faq?.textContent).toContain('For delegate fees and attendance arrangements, contact the organising team');
});

it('links the FAQ from the footer and offers a contact for questions', () => {
  const document = pageDocument();
  expect(document.querySelector('footer a[href="#faq"]')?.textContent).toBe('FAQs');
  expect(document.querySelector('#faq a[href="mailto:info@synergytechnofin.com"]')).not.toBeNull();
});

it('provides a persistent privacy notice outside the replaceable form', () => {
  const document = pageDocument();
  const notice = document.querySelector('#privacy');
  expect(notice?.closest('form')).toBeNull();
  expect(notice?.querySelector('summary')?.textContent).toBe('Registration privacy notice');
  expect(document.querySelector('footer a[href="#privacy"]')?.textContent).toBe('Privacy');
});

it('explains registration data collection, purposes and service providers', () => {
  const text = pageDocument().querySelector('#privacy')?.textContent || '';
  expect(text).toContain('Synergy Technofin');
  expect(text).toContain('name, designation, organisation, email address and mobile number');
  expect(text).toContain('process registrations, send confirmations and event updates, and respond to sponsorship enquiries');

});

it('provides a contact for corrections, deletion requests and withdrawal of contact consent', () => {
  const notice = pageDocument().querySelector('#privacy');
  expect(notice?.textContent).toContain('request a correction or deletion of your registration details, or withdraw consent to event-related contact');
  expect(notice?.querySelector('a')?.getAttribute('href')).toBe('mailto:info@synergytechnofin.com');
});

it('links privacy immediately before the existing required consent checkbox', () => {
  const document = pageDocument();
  const label = document.querySelector('input[name="consent"]').closest('label');
  expect(label.previousElementSibling?.querySelector('a')?.getAttribute('href')).toBe('#privacy');
  expect(document.querySelector('link[href="css/form.css?v=41"]')).not.toBeNull();
});

it.each(['Vercel', 'Supabase', 'Google Gmail or Resend'])('identifies %s in the privacy notice', provider => {
  expect(pageDocument().querySelector('#privacy')?.textContent).toContain(provider);
});
