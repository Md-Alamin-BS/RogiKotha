/*
 * RogiKotha — shared exploration dataset.
 *
 * Every record here is fictional and synthetic. No real doctor, facility,
 * patient, BMDC number or document is represented. This file carries content
 * only: all five concepts render the same records so they can be compared
 * fairly. Presentation and behaviour live inside each concept.
 *
 * Product rules encoded here (from the PRD, narrative-first model):
 *   - no numeric rating, no star average, no calculated quality score
 *   - sentiment is Positive / Mixed / Negative, always with counts + denominator
 *   - outcome is Helped / No improvement / Worsened / Uncertain
 *   - missing values are "Not provided" / "No documents", never 0
 *   - treatment dates are public as month/year only
 */
(function (global) {
  'use strict';

  var config = {
    /* Demo value only. The real "Limited data" threshold is a deferred
       product decision, not settled by these explorations. */
    limitedDataThreshold: 5,
    emergency: {
      ambulance: '999',
      healthLine: '16263',
      crisisLine: '09612-119911',
      lastVerified: { en: 'Last verified 21 August 2026', bn: 'সর্বশেষ যাচাই ২১ আগস্ট ২০২৬' }
    }
  };

  /* ---------------------------------------------------------------
   * Interface strings. Bangla and English are peers, not translations
   * of a "real" English UI — both are authored.
   * ------------------------------------------------------------- */
  var strings = {
    'brand.name':            { en: 'RogiKotha', bn: 'রোগীকথা' },
    'brand.tagline':         { en: 'Patient-reported treatment experiences', bn: 'রোগীর বলা চিকিৎসা অভিজ্ঞতা' },

    'demo.banner':           { en: 'Design exploration — fictional records, not a real service', bn: 'ডিজাইন এক্সপ্লোরেশন — কাল্পনিক তথ্য, প্রকৃত সেবা নয়' },

    'nav.discover':          { en: 'Discover', bn: 'খুঁজুন' },
    'nav.results':           { en: 'Results', bn: 'ফলাফল' },
    'nav.profile':           { en: 'Doctors', bn: 'ডাক্তারেরা' },
    'nav.compose':           { en: 'Share your experience', bn: 'অভিজ্ঞতা লিখুন' },

    'a11y.skip':             { en: 'Skip to main content', bn: 'মূল অংশে যান' },
    'a11y.lang':             { en: 'Switch interface language', bn: 'ইন্টারফেসের ভাষা বদলান' },
    'a11y.theme':            { en: 'Switch light or dark mode', bn: 'আলো বা অন্ধকার মোড বদলান' },
    'a11y.motion':           { en: 'Reduce animation', bn: 'অ্যানিমেশন কমান' },
    'a11y.screens':          { en: 'Screens', bn: 'স্ক্রিন' },
    'a11y.close':            { en: 'Close', bn: 'বন্ধ করুন' },
    'a11y.siteSections':     { en: 'Site sections', bn: 'সাইটের অংশ' },
    'a11y.call':             { en: 'Tap to call', bn: 'কল করতে ট্যাপ করুন' },

    'search.label':          { en: 'Search a doctor, condition, symptom, treatment or facility', bn: 'ডাক্তার, রোগ, উপসর্গ, চিকিৎসা বা হাসপাতাল খুঁজুন' },
    'search.placeholder':    { en: 'Try “diabetes”, “ডায়াবেটিস” or “dayabetis”…', bn: 'লিখুন “ডায়াবেটিস”, “diabetes” বা “dayabetis”…' },
    'search.submit':         { en: 'Search', bn: 'খুঁজুন' },
    'search.banglish':       { en: 'Bangla, English and Banglish all work.', bn: 'বাংলা, ইংরেজি ও বাংলিশ — সবই চলবে।' },
    'search.didYouMean':     { en: 'Showing results for', bn: 'ফলাফল দেখানো হচ্ছে' },
    'search.alsoSearched':   { en: 'also matched as', bn: 'এভাবেও মিলেছে' },
    'search.keepOriginal':   { en: 'Search the exact words instead', bn: 'হুবহু আপনার লেখা শব্দ খুঁজুন' },

    'hero.title':            { en: 'Read what patients actually went through.', bn: 'রোগীরা আসলে কী অভিজ্ঞতার মধ্য দিয়ে গেছেন, পড়ুন।' },
    'hero.body':             { en: 'RogiKotha collects first-hand experiences of a single treatment episode — the symptoms, the diagnosis, the medicines, what happened next. Not scores. Not a ranking of doctors. Stories, with their dates and their limits shown honestly.', bn: 'রোগীকথা একটি নির্দিষ্ট চিকিৎসা-পর্বের প্রত্যক্ষ অভিজ্ঞতা জমা রাখে — উপসর্গ, রোগ নির্ণয়, ওষুধ, তারপর কী হলো। কোনো নম্বর নয়। ডাক্তারের কোনো ক্রম নয়। শুধু অভিজ্ঞতা, তারিখসহ, সীমাবদ্ধতাসহ।' },
    'hero.cta':              { en: 'Share your experience', bn: 'অভিজ্ঞতা লিখুন' },
    'hero.browse':           { en: 'Browse experiences', bn: 'অভিজ্ঞতা দেখুন' },

    'how.title':             { en: 'How this works', bn: 'এটি যেভাবে কাজ করে' },
    'how.1.t':               { en: 'One episode, one experience', bn: 'এক পর্ব, এক অভিজ্ঞতা' },
    'how.1.b':               { en: 'Each experience covers a single course of treatment for a single condition — not a verdict on a doctor.', bn: 'প্রতিটি অভিজ্ঞতা একটি রোগের একটি চিকিৎসা-পর্ব নিয়ে — ডাক্তারের বিষয়ে চূড়ান্ত রায় নয়।' },
    'how.2.t':               { en: 'No scores, ever', bn: 'কোনো নম্বর নেই' },
    'how.2.b':               { en: 'We never calculate a quality score or rank doctors best-to-worst. You read the experiences and decide.', bn: 'আমরা কখনো মান-নম্বর হিসাব করি না বা ডাক্তারদের ভালো-মন্দ ক্রমে সাজাই না। আপনি পড়ে সিদ্ধান্ত নেবেন।' },
    'how.3.t':               { en: 'Documents are not validated', bn: 'কাগজপত্র যাচাই করা হয় না' },
    'how.3.b':               { en: 'People may attach reports. We check them for safety and privacy — never for medical correctness.', bn: 'অনেকে রিপোর্ট যুক্ত করেন। আমরা নিরাপত্তা ও গোপনীয়তা দেখি — চিকিৎসাগত সঠিকতা কখনো নয়।' },

    'emergency.title':       { en: 'If this is an emergency, do not wait for an answer here', bn: 'জরুরি অবস্থা হলে এখানে উত্তরের অপেক্ষা করবেন না' },
    'emergency.body':        { en: 'Call 999 for an ambulance or go to the nearest emergency department. For non-emergency health guidance call 16263.', bn: 'অ্যাম্বুলেন্সের জন্য ৯৯৯-এ কল করুন অথবা নিকটতম জরুরি বিভাগে যান। জরুরি নয় এমন স্বাস্থ্য পরামর্শের জন্য ১৬২৬৩।' },
    'emergency.crisis':      { en: 'Mental health crisis support', bn: 'মানসিক স্বাস্থ্য সহায়তা' },

    'emergview.title':       { en: 'Emergency help', bn: 'জরুরি সাহায্য' },
    'emergview.intro':       { en: 'This page lists the national emergency numbers for Bangladesh. Tap to call from a phone, or read them aloud if you need to. These numbers work 24 hours, every day, free from any mobile network.', bn: 'এই পাতায় বাংলাদেশের জাতীয় জরুরি নম্বরগুলো আছে। ফোন থেকে কল করতে ট্যাপ করুন, অথবা প্রয়োজন হলে পড়ে শোনান। যেকোনো মোবাইল নেটওয়ার্ক থেকে ২৪ ঘণ্টা, প্রতিদিন, বিনামূল্যে কাজ করে।' },
    'emergview.ambulance':   { en: 'Ambulance', bn: 'অ্যাম্বুলেন্স' },
    'emergview.healthLine':  { en: 'National health helpline', bn: 'জাতীয় স্বাস্থ্য হেল্পলাইন' },
    'emergview.crisis':      { en: 'Mental health crisis line', bn: 'মানসিক স্বাস্থ্য সহায়তা' },
    'emergview.bmdc':        { en: 'BMDC doctor register check', bn: 'BMDC ডাক্তার নিবন্ধন যাচাই' },
    'emergview.bmdcBody':    { en: 'To verify a doctor\'s registration number, use the official BMDC register. RogiKotha shows the number but does not replace the official check.', bn: 'ডাক্তারের নিবন্ধন নম্বর যাচাই করতে অফিসিয়াল BMDC রেজিস্টার ব্যবহার করুন। রোগীকথা নম্বর দেখায়, কিন্তু অফিসিয়াল যাচাইয়ের বিকল্প নয়।' },
    'emergview.poison':      { en: 'Poison information centre', bn: 'বিষক্রিয়া তথ্য কেন্দ্র' },

    'aboutview.title':       { en: 'About RogiKotha', bn: 'রোগীকথা সম্পর্কে' },
    'aboutview.intro':       { en: 'RogiKotha is a place where patients publish first-hand experiences of doctors, hospitals and clinics in Bangladesh. It is not a medical service, not a directory of paid listings, and not a place to ask for medical advice.', bn: 'রোগীকথা এমন একটি জায়গা যেখানে রোগীরা বাংলাদেশের ডাক্তার, হাসপাতাল ও ক্লিনিক সম্পর্কে নিজের অভিজ্ঞতা প্রকাশ করেন। এটি চিকিৎসা সেবা নয়, পেইড তালিকার ডিরেক্টরি নয়, এবং চিকিৎসা পরামর্শের জায়গা নয়।' },
    'aboutview.modTitle':    { en: 'How experiences are moderated', bn: 'অভিজ্ঞতা কীভাবে মডারেট করা হয়' },
    'aboutview.modBody':     { en: 'Before publication your experience runs through automated checks for duplicates, and for private details, spam and threatening language in the text. Files are scanned for malware and converted to a safe format. None of these judge your story or decide whether your care was good or bad. Nothing is published without your confirmation. After publication, unsafe advice is handled by people — readers report it and a moderator reviews it. Nothing is classified automatically.', bn: 'প্রকাশের আগে আপনার অভিজ্ঞতায় স্বয়ংক্রিয় কিছু যাচাই চলে: একই অভিজ্ঞতা আগে জমা পড়েছে কিনা, এবং লেখায় ব্যক্তিগত তথ্য, স্প্যাম বা হুমকিমূলক ভাষা আছে কিনা। ফাইলগুলো ম্যালওয্য়ারের জন্য স্ক্যান করা হয় এবং নিরাপদ ফরম্যাটে রূপান্তর করা হয়। এগুলোর কোনোটিই আপনার লেখার বিচার করে না, বা আপনার চিকিৎসা ভালো নাকি খারাপ তা ঠিক করে না। আপনার সম্মতি ছাড়া কিছুই প্রকাশ হয় না। প্রকাশের পর অনিরাপদ পরামর্শের বিষয়টি মানুষ দেখে — পাঠকেরা রিপোর্ট করেন এবং একজন মডারেটর পর্যালোচনা করেন। কিছুই স্বয়ংক্রিয়ভাবে চিহ্নিত হয় না।' },
    'aboutview.reviewerTitle': { en: 'What a reviewer label means', bn: 'রিভিউয়ার লেবেলের অর্থ কী' },
    'aboutview.reviewerBody': { en: 'A reviewer label is the label chosen by the person who wrote the experience, for their own experience — for example “Wrong diagnosis” or “Second opinion differed”. It is their claim, not our finding. RogiKotha does not check whether it is medically correct, and no doctor confirms it on our behalf. Labels are always shown as words written by the reviewer.', bn: 'রিভিউয়ার লেবেল হলো যিনি অভিজ্ঞতাটি লিখেছেন, তিনি নিজের অভিজ্ঞতার জন্য যে লেবেল বেছে নিয়েছেন — যেমন “ভুল রোগনির্ণয়” বা “দ্বিতীয় মতামত ভিন্ন ছিল”। এটি তাঁর দাবি, আমাদের সিদ্ধান্ত নয়। রোগীকথা যাচাই করে না এটি চিকিৎসাগতভাবে সঠিক কিনা, এবং আমাদের পক্ষ থেকে কোনো ডাক্তার এটি নিশ্চিত করেন না। লেবেল সবসময় রিভিউয়ারের নিজের কথা হিসেবেই দেখানো হয়।' },
    'aboutview.privacyTitle': { en: 'Privacy and identity', bn: 'গোপনীয়তা ও পরিচয়' },
    'aboutview.privacyBody':  { en: 'You can write under your real name, a pseudonym, or anonymously. You decide which one. If you write under a pseudonym, your real name is never stored with the experience. If you upload documents, you black out private details yourself before publishing and confirm you have done so — RogiKotha does not detect or remove them for you.', bn: 'আপনি আসল নামে, ছদ্মনামে, বা নামহীনভাবে লিখতে পারেন। সিদ্ধান্ত আপনার। ছদ্মনামে লিখলে আপনার আসল নাম অভিজ্ঞতার সাথে সংরক্ষিত হয় না। কাগজপত্র আপলোড করলে প্রকাশের আগে ব্যক্তিগত তথ্য আপনি নিজেই ঢেকে দেন এবং নিশ্চিত করেন যে ঢেকেছেন — রোগীকথা সেগুলো নিজে খুঁজে বের করে বা মুছে দেয় না।' },
    'aboutview.limitsTitle':  { en: 'What this is not', bn: 'এটি যা নয়' },
    'aboutview.limitsBody':   { en: 'RogiKotha does not diagnose, does not verify whether a treatment was correct, and does not decide whether care was negligent. Accounts are patient reports — they tell you what one person experienced, not what will happen to you. If you are deciding what to do about a health problem, talk to a qualified clinician, not to this site.', bn: 'রোগীকথা রোগ নির্ণয় করে না, চিকিৎসা সঠিক হয়েছে কিনা তা যাচাই করে না, এবং অবহেলা হয়েছে কিনা তা নির্ধারণ করে না। অভিজ্ঞতাগুলো রোগীর প্রতিবেদন — একজনের অভিজ্ঞতা বলে, আপনার কী হবে তা নয়। স্বাস্থ্য সমস্যা নিয়ে কী করবেন সেই সিদ্ধান্ত নিতে হলে যোগ্য চিকিৎসকের সাথে কথা বলুন, এই সাইটের সাথে নয়।' },
    'aboutview.contact':      { en: 'Contact and feedback', bn: 'যোগাযোগ ও মতামত' },
    'aboutview.contactBody':  { en: 'Email: hello@rogikotha.example (this is a design exploration — the address is not monitored). For real emergencies, do not use this site.', bn: 'ইমেইল: hello@rogikotha.example (এটি একটি ডিজাইন এক্সপ্লোরেশন — এই ঠিকানা পর্যবেক্ষণ করা হয় না)। প্রকৃত জরুরি অবস্থায় এই সাইট ব্যবহার করবেন না।' },
    'aboutview.lastReviewed': { en: 'Methodology last reviewed 21 August 2026', bn: 'পদ্ধতি সর্বশেষ পর্যালোচিত ২১ আগস্ট ২০২৬' },

    'disclaimer.short':      { en: 'Patient-reported experiences. Not medical advice.', bn: 'রোগীর বলা অভিজ্ঞতা। চিকিৎসা পরামর্শ নয়।' },
    'disclaimer.long':       { en: 'Everything below is written by members of the public about their own or a witnessed experience. RogiKotha does not diagnose, does not verify clinical correctness, and does not decide whether care was negligent. Do not change or delay treatment based on what you read here.', bn: 'নিচের সবকিছু সাধারণ মানুষের লেখা — নিজের বা প্রত্যক্ষ করা অভিজ্ঞতা। রোগীকথা রোগ নির্ণয় করে না, চিকিৎসার সঠিকতা যাচাই করে না, এবং অবহেলা হয়েছে কি না তা নির্ধারণ করে না। এখানে যা পড়ছেন তার ভিত্তিতে চিকিৎসা বদলাবেন বা দেরি করবেন না।' },

    'filter.title':          { en: 'Narrow these results', bn: 'ফলাফল সীমিত করুন' },
    'filter.specialty':      { en: 'Specialty', bn: 'বিশেষত্ব' },
    'filter.condition':      { en: 'Condition', bn: 'রোগ' },
    'filter.location':       { en: 'Location', bn: 'এলাকা' },
    'filter.sentiment':      { en: 'Experience sentiment', bn: 'অভিজ্ঞতার ধরন' },
    'filter.outcome':        { en: 'Reported outcome', bn: 'জানানো ফলাফল' },
    'filter.evidence':       { en: 'Documents', bn: 'কাগজপত্র' },
    'filter.gender':         { en: 'Doctor gender', bn: 'ডাক্তারের লিঙ্গ' },
    'filter.language':       { en: 'Consultation language', bn: 'পরামর্শের ভাষা' },
    'filter.clear':          { en: 'Clear all', bn: 'সব মুছুন' },
    'filter.any':            { en: 'Any', bn: 'যেকোনো' },
    'filter.note':           { en: 'Filtering changes which experiences you see. It never reorders doctors by how positive they are.', bn: 'ফিল্টার বদলায় আপনি কোন অভিজ্ঞতাগুলো দেখবেন। ইতিবাচকতার ভিত্তিতে ডাক্তারদের ক্রম কখনো বদলায় না।' },

    'sort.label':            { en: 'Order', bn: 'ক্রম' },
    'sort.relevance':        { en: 'Relevance', bn: 'প্রাসঙ্গিকতা' },
    'sort.volume':           { en: 'Most experiences', bn: 'সবচেয়ে বেশি অভিজ্ঞতা' },
    'sort.recent':           { en: 'Most recent', bn: 'সবচেয়ে সাম্প্রতিক' },
    'sort.why':              { en: 'Why can’t I sort by best?', bn: 'সেরা অনুযায়ী সাজানো যায় না কেন?' },
    'sort.whyBody':          { en: 'Because RogiKotha does not measure “best”. Ordering by sentiment would turn patient stories into a score, which is exactly what this platform refuses to do.', bn: 'কারণ রোগীকথা “সেরা” মাপে না। ইতিবাচকতা অনুযায়ী সাজালে রোগীর অভিজ্ঞতা একটি নম্বরে পরিণত হতো — যা এই প্ল্যাটফর্ম করে না।' },

    'results.count':         { en: 'doctors match', bn: 'জন ডাক্তার মিলেছে' },
    'results.none':          { en: 'Nothing matched yet', bn: 'এখনো কিছু মেলেনি' },
    'results.noneBody':      { en: 'The directory starts empty and grows only as people write experiences. Try a broader term, or be the first to write about this doctor.', bn: 'তালিকাটি খালি অবস্থায় শুরু হয় এবং মানুষ লিখলেই বাড়ে। আরও সাধারণ শব্দ দিয়ে দেখুন, অথবা এই ডাক্তার সম্পর্কে প্রথম আপনিই লিখুন।' },

    'label.limitedData':     { en: 'Limited data', bn: 'সীমিত তথ্য' },
    'label.limitedDataWhy':  { en: 'Fewer than 5 experiences. Too few to show a pattern — read them individually.', bn: '৫টির কম অভিজ্ঞতা। ধরন বোঝার মতো যথেষ্ট নয় — আলাদা করে পড়ুন।' },
    'label.notVerified':     { en: 'Registration not verified', bn: 'রেজিস্ট্রেশন যাচাই করা হয়নি' },
    'label.notVerifiedWhy':  { en: 'RogiKotha does not yet check BMDC registration. This profile was submitted by the community.', bn: 'রোগীকথা এখনো বিএমডিসি রেজিস্ট্রেশন যাচাই করে না। এই প্রোফাইল সম্প্রদায়ের জমা দেওয়া।' },
    'label.notProvided':     { en: 'Not provided', bn: 'জানানো হয়নি' },
    'label.noDocuments':     { en: 'No documents', bn: 'কোনো কাগজপত্র নেই' },
    'label.reviewerLabel':   { en: 'Reviewer’s label', bn: 'যিনি লিখেছেন, তাঁর দেওয়া তকমা' },
    'label.reviewerLabelWhy':{ en: 'This is the author’s own claim. RogiKotha has not checked it and takes no position on it.', bn: 'এটি লেখকের নিজের দাবি। রোগীকথা এটি যাচাই করেনি এবং এ বিষয়ে কোনো অবস্থান নেয় না।' },
    'label.edited':          { en: 'Edited', bn: 'সম্পাদিত' },
    'label.followUp':        { en: 'Follow-up', bn: 'পরবর্তী অবস্থা' },

    'prov.title':            { en: 'Where this information came from', bn: 'এই তথ্য কোথা থেকে এসেছে' },
    'prov.community':        { en: 'Community submitted', bn: 'সম্প্রদায়ের জমা দেওয়া' },
    'prov.provider':         { en: 'Provider confirmed', bn: 'চিকিৎসকের নিশ্চিত করা' },
    'prov.admin':            { en: 'Admin checked', bn: 'অ্যাডমিন যাচাই করেছে' },

    'evidence.status':       { en: 'Documents attached — not medically validated', bn: 'কাগজপত্র যুক্ত — চিকিৎসাগতভাবে যাচাই করা হয়নি' },
    'evidence.notice':       { en: 'Uploaded by the person who wrote this experience. Privacy has not been independently checked. You are seeing a processed copy; the original is never public.', bn: 'যিনি এই অভিজ্ঞতা লিখেছেন তিনিই আপলোড করেছেন। গোপনীয়তা স্বাধীনভাবে যাচাই করা হয়নি। আপনি একটি প্রক্রিয়াকৃত কপি দেখছেন; মূল ফাইল কখনো প্রকাশ্য নয়।' },
    'evidence.group.reviewed':  { en: 'Reviewed treatment', bn: 'যে চিকিৎসার বিবরণ' },
    'evidence.group.later':     { en: 'Later or alternative treatment', bn: 'পরবর্তী বা বিকল্প চিকিৎসা' },
    'evidence.group.outcome':   { en: 'Outcome / follow-up', bn: 'ফলাফল / পরবর্তী অবস্থা' },
    'evidence.open':         { en: 'Open processed copy', bn: 'প্রক্রিয়াকৃত কপি খুলুন' },

    'sentiment.positive':    { en: 'Positive', bn: 'ইতিবাচক' },
    'sentiment.mixed':       { en: 'Mixed', bn: 'মিশ্র' },
    'sentiment.negative':    { en: 'Negative', bn: 'নেতিবাচক' },
    'sentiment.title':       { en: 'How authors described the episode', bn: 'লেখকেরা পর্বটিকে যেভাবে বর্ণনা করেছেন' },
    'sentiment.of':          { en: 'of', bn: 'এর মধ্যে' },
    'sentiment.accounts':    { en: 'patient experiences', bn: 'জনের অভিজ্ঞতা' },

    'outcome.helped':        { en: 'Helped', bn: 'উপকার হয়েছে' },
    'outcome.none':          { en: 'No improvement', bn: 'উন্নতি হয়নি' },
    'outcome.worse':         { en: 'Worsened', bn: 'অবনতি হয়েছে' },
    'outcome.uncertain':     { en: 'Uncertain', bn: 'নিশ্চিত নয়' },
    'outcome.title':         { en: 'What authors reported afterwards', bn: 'পরে লেখকেরা যা জানিয়েছেন' },
    'outcome.selfReported':  { en: 'Self-reported by the author. Not a clinical measurement.', bn: 'লেখকের নিজের জানানো। কোনো ক্লিনিক্যাল পরিমাপ নয়।' },

    'profile.about':         { en: 'About', bn: 'পরিচিতি' },
    'profile.chambers':      { en: 'Practice locations', bn: 'চেম্বার' },
    'profile.accounts':      { en: 'Patient experiences', bn: 'রোগীর অভিজ্ঞতা' },
    'profile.conditions':    { en: 'Conditions people wrote about', bn: 'যেসব রোগ নিয়ে লেখা হয়েছে' },
    'profile.byCondition':   { en: 'Choose a condition to see only those experiences', bn: 'নির্দিষ্ট রোগের অভিজ্ঞতা দেখতে সেটি বাছুন' },
    'profile.allConditions': { en: 'All conditions', bn: 'সব রোগ' },
    'profile.bmdc':          { en: 'BMDC number', bn: 'বিএমডিসি নম্বর' },
    'profile.specialty':     { en: 'Specialty', bn: 'বিশেষত্ব' },
    'profile.qualifications':{ en: 'Qualifications', bn: 'শিক্ষাগত যোগ্যতা' },
    'profile.languages':     { en: 'Consultation languages', bn: 'পরামর্শের ভাষা' },
    'profile.fee':           { en: 'Consultation fee', bn: 'পরামর্শ ফি' },
    'profile.write':         { en: 'Write about your treatment', bn: 'আপনার চিকিৎসা নিয়ে লিখুন' },
    'profile.facilitySep':   { en: 'Facility service feedback is kept separate and never changes a doctor’s summaries.', bn: 'হাসপাতালের সেবা নিয়ে মতামত আলাদা রাখা হয় এবং তা ডাক্তারের সারাংশ কখনো বদলায় না।' },

    'review.relationship':   { en: 'Written by', bn: 'লিখেছেন' },
    'review.episodeDate':    { en: 'Treatment period', bn: 'চিকিৎসার সময়' },
    'review.readFull':       { en: 'Read in full', bn: 'পুরো অভিজ্ঞতা পড়ুন' },
    'review.tags':           { en: 'Tags', bn: 'ট্যাগ' },
    'review.helpful':        { en: 'Like', bn: 'পছন্দ' },
    'review.notHelpful':     { en: 'Dislike', bn: 'অপছন্দ' },
    'review.reactionNote':   { en: 'Reactions are engagement only. They never affect summaries, ordering or moderation.', bn: 'প্রতিক্রিয়া কেবল সম্পৃক্ততা বোঝায়। এটি সারাংশ, ক্রম বা মডারেশনে কোনো প্রভাব ফেলে না।' },
    'review.report':         { en: 'Report', bn: 'রিপোর্ট' },
    'review.comments':       { en: 'Comments', bn: 'মন্তব্য' },

    'compose.title':         { en: 'Share your experience', bn: 'আপনার অভিজ্ঞতা লিখুন' },
    'compose.intro':         { en: 'One experience describes one course of treatment for one condition. Take as much or as little space as you need.', bn: 'একটি অভিজ্ঞতা একটি রোগের একটি চিকিৎসা-পর্ব নিয়ে। যতটা প্রয়োজন ততটাই লিখুন।' },
    'compose.mode.quick':    { en: 'Short version', bn: 'সংক্ষিপ্ত সংস্করণ' },
    'compose.mode.quickHint':{ en: 'A few sentences. Four fields.', bn: 'কয়েকটি বাক্য। চারটি ঘর।' },
    'compose.mode.detailed': { en: 'Detailed timeline', bn: 'বিস্তারিত সময়রেখা' },
    'compose.mode.detailedHint': { en: 'Symptoms, diagnosis, treatment, what happened next.', bn: 'উপসর্গ, রোগ নির্ণয়, চিকিৎসা, তারপর কী হলো।' },
    'compose.step':          { en: 'Step', bn: 'ধাপ' },
    'compose.of':            { en: 'of', bn: '/' },
    'compose.doctor':        { en: 'Which doctor?', bn: 'কোন ডাক্তার?' },
    'compose.doctorMissing': { en: 'Can’t find them? Add a doctor', bn: 'খুঁজে পাচ্ছেন না? ডাক্তার যোগ করুন' },
    'compose.doctorMissingNote': { en: 'A new profile is checked for duplicates and obvious abuse before it appears. Your draft stays private until then.', bn: 'নতুন প্রোফাইল প্রকাশের আগে ডুপ্লিকেট ও অপব্যবহার যাচাই করা হয়। ততক্ষণ আপনার অভিজ্ঞতা ব্যক্তিগত খসড়া হিসেবে থাকে।' },
    'compose.relationship':  { en: 'Your relationship to the patient', bn: 'রোগীর সঙ্গে আপনার সম্পর্ক' },
    'compose.period':        { en: 'When was the treatment?', bn: 'চিকিৎসা কখন হয়েছিল?' },
    'compose.periodNote':    { en: 'Only the month and year are shown publicly.', bn: 'প্রকাশ্যে শুধু মাস ও বছর দেখানো হয়।' },
    'compose.story':         { en: 'What happened?', bn: 'কী হয়েছিল?' },
    'compose.storyHint':     { en: 'Write in Bangla, English or a mix — whatever you actually think in. Nothing is translated automatically.', bn: 'বাংলা, ইংরেজি বা মিশিয়ে লিখুন — যেভাবে আপনি ভাবেন। কিছুই স্বয়ংক্রিয়ভাবে অনুবাদ হয় না।' },
    'compose.symptoms':      { en: 'Symptoms and why you went', bn: 'উপসর্গ ও কেন গিয়েছিলেন' },
    'compose.diagnosis':     { en: 'What you were told was wrong', bn: 'আপনাকে যা বলা হয়েছিল' },
    'compose.treatment':     { en: 'Treatment, tests and medicines', bn: 'চিকিৎসা, পরীক্ষা ও ওষুধ' },
    'compose.after':         { en: 'What happened afterwards', bn: 'তারপর কী হলো' },
    'compose.tags':          { en: 'Tag the health topic', bn: 'বিষয় ট্যাগ করুন' },
    'compose.tagsRequired':  { en: 'Add at least one tag, or choose “Not sure”.', bn: 'অন্তত একটি ট্যাগ দিন, অথবা “নিশ্চিত নই” বাছুন।' },
    'compose.notSure':       { en: 'Not sure', bn: 'নিশ্চিত নই' },
    'compose.tagGroup.symptom':   { en: 'Symptoms', bn: 'উপসর্গ' },
    'compose.tagGroup.condition': { en: 'Diagnosis / condition', bn: 'রোগ নির্ণয়' },
    'compose.tagGroup.treatment': { en: 'Treatment / procedure', bn: 'চিকিৎসা / প্রক্রিয়া' },
    'compose.tagGroup.medicine':  { en: 'Medicine', bn: 'ওষুধ' },
    'compose.sentiment':     { en: 'Overall, how would you describe it?', bn: 'সব মিলিয়ে আপনি একে কীভাবে বর্ণনা করবেন?' },
    'compose.optional':      { en: 'Optional', bn: 'ঐচ্ছিক' },
    'compose.outcome':       { en: 'How are you now?', bn: 'এখন আপনি কেমন আছেন?' },
    'compose.claims':        { en: 'Do you want to add a label?', bn: 'কোনো তকমা যোগ করতে চান?' },
    'compose.claimsNote':    { en: 'These stay marked as your claim. RogiKotha will never present them as a finding.', bn: 'এগুলো আপনার দাবি হিসেবেই থাকবে। রোগীকথা কখনো একে সিদ্ধান্ত হিসেবে দেখাবে না।' },
    'compose.identity':      { en: 'How should your name appear?', bn: 'আপনার নাম কীভাবে দেখাবে?' },
    'compose.identity.real': { en: 'My real name', bn: 'আমার আসল নাম' },
    'compose.identity.pseudo': { en: 'My username', bn: 'আমার ইউজারনেম' },
    'compose.identity.anon': { en: 'Anonymous', bn: 'নাম প্রকাশ না করে' },
    'compose.identity.anonNote': { en: 'Anonymous hides your name from readers. It is not absolute anonymity — your account and contact details remain private but known to us, and can be required by law.', bn: 'অ্যানোনিমাস পাঠকের কাছ থেকে আপনার নাম আড়াল করে। এটি সম্পূর্ণ পরিচয়হীনতা নয় — আপনার অ্যাকাউন্ট ও যোগাযোগের তথ্য গোপন থাকলেও আমাদের জানা, এবং আইনগতভাবে চাওয়া হতে পারে।' },
    'compose.evidence':      { en: 'Attach documents', bn: 'কাগজপত্র যুক্ত করুন' },
    'compose.evidenceOptional': { en: 'Entirely optional. An experience without documents is just as valid.', bn: 'সম্পূর্ণ ঐচ্ছিক। কাগজপত্র ছাড়া অভিজ্ঞতাও সমান গ্রহণযোগ্য।' },
    'compose.redact':        { en: 'Hide private details before you upload', bn: 'আপলোডের আগে ব্যক্তিগত তথ্য ঢাকুন' },
    'compose.redactBody':    { en: 'Cover the patient name and photo, phone numbers, address, national ID, hospital record numbers, QR codes and signatures. Keep the doctor and facility details visible.', bn: 'রোগীর নাম ও ছবি, ফোন নম্বর, ঠিকানা, জাতীয় পরিচয়পত্র, হাসপাতালের রেকর্ড নম্বর, কিউআর কোড ও স্বাক্ষর ঢেকে দিন। ডাক্তার ও হাসপাতালের তথ্য দেখা যাক।' },
    'compose.redactTool':    { en: 'Draw over anything private', bn: 'ব্যক্তিগত অংশের উপর আঁকুন' },
    'compose.preview':       { en: 'Preview as readers will see it', bn: 'পাঠক যেভাবে দেখবেন' },
    'compose.publish':       { en: 'Publish', bn: 'অভিজ্ঞতা প্রকাশ করুন' },
    'compose.saveDraft':     { en: 'Save draft', bn: 'খসড়া রাখুন' },
    'compose.confirmTitle':  { en: 'Before you publish', bn: 'প্রকাশের আগে' },
    'compose.confirm1':      { en: 'This happened to me, or I witnessed it directly, and it is honest.', bn: 'এটি আমার নিজের বা আমার প্রত্যক্ষ করা অভিজ্ঞতা, এবং এটি সত্য।' },
    'compose.confirm2':      { en: 'I have removed private details about other people from anything I attached.', bn: 'আমি যা যুক্ত করেছি তা থেকে অন্যদের ব্যক্তিগত তথ্য সরিয়েছি।' },
    'compose.confirm3':      { en: 'I understand this is my own telling of what happened, not a medical finding.', bn: 'আমি বুঝি এটি আমার বলা ঘটনা, কোনো চিকিৎসাগত সিদ্ধান্ত নয়।' },
    'compose.age':           { en: 'I am 18 or older', bn: 'আমার বয়স ১৮ বা তার বেশি' },
    'compose.publishedNote': { en: 'Your words publish immediately after automated safety checks. Any documents stay private until they finish processing.', bn: 'স্বয়ংক্রিয় নিরাপত্তা যাচাইয়ের পরপরই আপনার লেখা প্রকাশ হবে। কাগজপত্র প্রক্রিয়াকরণ শেষ না হওয়া পর্যন্ত ব্যক্তিগত থাকবে।' },
    'compose.required':      { en: 'Required', bn: 'আবশ্যক' },
    'compose.back':          { en: 'Back', bn: 'পেছনে' },
    'compose.next':          { en: 'Continue', bn: 'পরবর্তী' },

    'rel.self':              { en: 'The patient', bn: 'রোগী নিজে' },
    'rel.parent':            { en: 'Parent or guardian', bn: 'অভিভাবক' },
    'rel.family':            { en: 'Family or caregiver', bn: 'পরিবার বা সেবাদানকারী' },
    'rel.witness':           { en: 'Treatment witness', bn: 'চিকিৎসার প্রত্যক্ষদর্শী' },

    'claim.wrongDx':         { en: 'Wrong diagnosis', bn: 'ভুল রোগ নির্ণয়' },
    'claim.wrongRx':         { en: 'Wrong treatment', bn: 'ভুল চিকিৎসা' },
    'claim.secondOpinion':   { en: 'Second opinion differed', bn: 'দ্বিতীয় মত ভিন্ন ছিল' },

    'concept.back':          { en: 'All three directions', bn: 'তিনটি ধারা' },

    /* ---- navigation added for the fuller screen set ---- */
    'target.account':        { en: 'Experience', bn: 'অভিজ্ঞতা' },
    'target.comment':        { en: 'Comment', bn: 'মন্তব্য' },
    'target.evidence':       { en: 'Document', bn: 'কাগজপত্র' },
    'target.profile':        { en: 'Profile', bn: 'প্রোফাইল' },

    'nav.account':           { en: 'Experiences', bn: 'অভিজ্ঞতা' },
    'nav.condition':         { en: 'Health topics', bn: 'রোগ ও স্বাস্থ্য' },
    'nav.facility':          { en: 'Facility', bn: 'হাসপাতাল' },
    /* Index pages. Slugs are plural so trimming an id lands on the index. */
    'profile.kicker':        { en: 'Doctor', bn: 'ডাক্তার' },
    'facility.kicker':       { en: 'Hospital or clinic', bn: 'হাসপাতাল বা ক্লিনিক' },
    /* STORY-PROT-001 demo controls. Previously hardcoded English, which
       broke bilingual parity in the one panel that explains the demo. */
    'demo.title':            { en: 'Demo controls', bn: 'ডেমো নিয়ন্ত্রণ' },
    'demo.roleNote':         { en: 'The simulated role changes what the contribution screens tell you. Nothing here signs you in — production would require a confirmed account.', bn: 'সিমুলেটেড ভূমিকা বদলালে অবদানের পর্দাগুলো আপনাকে কী বলে তা বদলায়। এখানে কোনো সাইন-ইন হয় না — প্রকৃত সেবায় নিশ্চিত করা অ্যাকাউন্ট লাগত।' },
    'demo.role.reader':      { en: 'Reader', bn: 'পাঠক' },
    'demo.role.contributor': { en: 'Contributor', bn: 'লেখক' },
    'demo.role.moderator':   { en: 'Moderator', bn: 'মডারেটর' },
    'demo.scheme':           { en: 'Light-mode colour scheme (compare)', bn: 'লাইট মোডের রঙের ধরন (তুলনা)' },
    'demo.scheme.current':   { en: 'Current', bn: 'বর্তমান' },
    'demo.scheme.a':         { en: 'Scheme A', bn: 'ধরন A' },
    'demo.scheme.b':         { en: 'Scheme B', bn: 'ধরন B' },
    'demo.scheme.c':         { en: 'Scheme C', bn: 'ধরন C' },
    'demo.reset':            { en: 'Reset demo', bn: 'ডেমো রিসেট' },
    'demo.close':            { en: 'Close', bn: 'বন্ধ' },
    /* EXPERIENCE.md:115 — the demo must explain simulated sign-in at the
       point of contributing, not only in a hidden drawer. */
    'write.signinTitle':     { en: 'You are reading as a signed-out visitor', bn: 'আপনি সাইন-ইন না করা অবস্থায় পড়ছেন' },
    'write.signinBody':      { en: 'In production you would need a confirmed account and an age confirmation before publishing. In this demo you can fill the form and preview it — nothing is saved or sent. Switch the demo role to Contributor to see it without this notice.', bn: 'প্রকৃত সেবায় প্রকাশের আগে নিশ্চিত করা অ্যাকাউন্ট ও বয়সের নিশ্চিতকরণ লাগত। এই ডেমোতে আপনি ফর্ম পূরণ ও প্রিভিউ দেখতে পারেন — কিছুই সংরক্ষণ বা পাঠানো হয় না। এই নোটিশ ছাড়া দেখতে ডেমো ভূমিকা লেখক-এ বদলান।' },
    'nav.viewDoctor':        { en: 'View doctor', bn: 'ডাক্তার দেখুন' },
    'nav.viewFacility':      { en: 'View hospital', bn: 'হাসপাতাল দেখুন' },
    'index.doctorsNote':     { en: 'Every doctor patients have written about. Listed alphabetically — never ranked, and never scored.', bn: 'রোগীরা যেসব ডাক্তারকে নিয়ে লিখেছেন, সবাই। বর্ণানুক্রমে সাজানো — কোনো ক্রম বা স্কোর নেই।' },
    'index.facilitiesNote':  { en: 'Hospitals, clinics and diagnostic centres people have written about, with their branches.', bn: 'মানুষ যেসব হাসপাতাল, ক্লিনিক ও ডায়াগনস্টিক সেন্টার নিয়ে লিখেছেন, শাখাসহ।' },
    'index.topicsNote':      { en: 'Every health topic in the directory, including those nobody has written about yet.', bn: 'ডিরেক্টরির প্রতিটি বিষয়, যেগুলো নিয়ে এখনো কেউ লেখেননি সেগুলোসহ।' },
    'index.experiencesNote': { en: 'The most recent patient experiences across every doctor and hospital.', bn: 'সব ডাক্তার ও হাসপাতাল মিলিয়ে সাম্প্রতিক রোগীর অভিজ্ঞতা।' },
    'index.emptyTopic':      { en: 'No one has written about this yet.', bn: 'এখনো কেউ এটি নিয়ে লেখেননি।' },
    'index.beFirst':         { en: 'Be the first to write about it', bn: 'প্রথম হয়ে লিখুন' },
    'nav.facilities':        { en: 'Hospitals & clinics', bn: 'হাসপাতাল ও ক্লিনিক' },
    'nav.mine':              { en: 'My writing', bn: 'আমার লেখা' },
    'nav.admin':             { en: 'Moderation', bn: 'মডারেশন' },
    'nav.emergency':         { en: 'Emergency help', bn: 'জরুরি সাহায্য' },
    'nav.about':             { en: 'About & methodology', bn: 'সম্পর্কে ও পদ্ধতি' },

    'discover.browse':       { en: 'Browse by health topic', bn: 'বিষয় অনুযায়ী দেখুন' },
    'discover.browseNote':   { en: 'People usually arrive with a condition in mind, not a doctor’s name.', bn: 'মানুষ সাধারণত ডাক্তারের নাম নয়, রোগ নিয়েই আসেন।' },
    'discover.facilities':   { en: 'Looking for a hospital or diagnostic centre?', bn: 'হাসপাতাল বা ডায়াগনস্টিক সেন্টার খুঁজছেন?' },

    'results.tabDoctors':    { en: 'Doctors', bn: 'ডাক্তার' },
    'results.tabFacilities': { en: 'Facilities', bn: 'হাসপাতাল' },

    /* ---- account detail ---- */
    /* Byline component. The name is rendered at body size in full ink; the
       identity mode is a labelled chip, never colour alone (WCAG 1.4.1). */
    'byline.identity.real':  { en: 'Real name', bn: 'আসল নাম' },
    'byline.identity.pseudo':{ en: 'Username', bn: 'ইউজারনেম' },
    'byline.anonSentence':   { en: 'Written anonymously', bn: 'নাম প্রকাশ না করে লেখা' },
    'byline.otherBy':        { en: 'Other experiences by {name}', bn: '{name}-এর অন্যান্য অভিজ্ঞতা' },
    'byline.published':      { en: 'Published', bn: 'প্রকাশিত' },
    'byline.commentBy':      { en: 'Comment by', bn: 'মন্তব্য করেছেন' },
    'byline.yourIdentity':   { en: 'Published as', bn: 'প্রকাশ হয়েছে' },
    'experience.writtenBy':     { en: 'Written by', bn: 'লিখেছেন' },
    'experience.otherAccounts': { en: 'other experiences by this author', bn: 'এই লেখকের অন্যান্য অভিজ্ঞতা' },
    'experience.identityMode':  { en: 'Shown as', bn: 'যেভাবে দেখানো হচ্ছে' },
    'experience.timeline':      { en: 'How this unfolded', bn: 'যেভাবে ঘটেছে' },
    'experience.episode':       { en: 'Treatment episode', bn: 'চিকিৎসা-পর্ব' },
    'experience.currentStatus': { en: 'Most recent status', bn: 'সর্বশেষ অবস্থা' },
    'experience.currentNote':   { en: 'The newest update is the current one. Older updates stay in place so the story still reads in order.', bn: 'সর্বশেষ আপডেটটিই বর্তমান। পুরোনো আপডেটগুলো থেকে যায়, যাতে ঘটনাক্রম বোঝা যায়।' },
    'experience.laterCare':     { en: 'Care received elsewhere afterwards', bn: 'পরে অন্য জায়গায় নেওয়া চিকিৎসা' },
    'experience.laterCareNote': { en: 'Written by the same author. Naming a later doctor here does not create a review for them and does not change their summaries.', bn: 'একই লেখকের লেখা। এখানে পরবর্তী ডাক্তারের নাম থাকলেই তাঁর জন্য কোনো রিভিউ তৈরি হয় না বা তাঁর সারাংশ বদলায় না।' },
    'experience.discussion':    { en: 'Discussion', bn: 'আলোচনা' },
    'experience.commentBox':    { en: 'Add a comment', bn: 'মন্তব্য যোগ করুন' },
    'experience.commentHint':   { en: 'Be specific about your own experience. This is not the place for medical instructions.', bn: 'নিজের অভিজ্ঞতা স্পষ্টভাবে লিখুন। এখানে চিকিৎসার নির্দেশনা দেওয়ার জায়গা নয়।' },
    'experience.commentPost':   { en: 'Post comment', bn: 'মন্তব্য দিন' },
    'experience.linkWarning':   { en: 'External link — RogiKotha has not checked where this goes.', bn: 'বাইরের লিংক — রোগীকথা এটি কোথায় যায় তা যাচাই করেনি।' },
    'experience.dangerWarning': { en: 'This comment describes changing or stopping treatment. Do not act on it without your own doctor. A moderator has been asked to review it.', bn: 'এই মন্তব্যে চিকিৎসা বদলানো বা বন্ধ করার কথা আছে। নিজের ডাক্তারের পরামর্শ ছাড়া এটি অনুসরণ করবেন না। একজন মডারেটরকে দেখতে বলা হয়েছে।' },
    'experience.providerHere':  { en: 'Claimed this profile', bn: 'এই প্রোফাইলের দাবিদার' },
    'experience.providerNote':  { en: 'A doctor who has claimed their profile takes part like any other member. They get no special reply channel and cannot edit or remove this experience.', bn: 'যে ডাক্তার নিজের প্রোফাইল দাবি করেছেন তিনি অন্য সবার মতোই অংশ নেন। তাঁর জন্য আলাদা উত্তরের ব্যবস্থা নেই, এবং তিনি এই অভিজ্ঞতা সম্পাদনা বা মুছতে পারেন না।' },
    'experience.relatedCond':   { en: 'Other people who wrote about this condition', bn: 'এই রোগ নিয়ে অন্যদের লেখা' },
    'experience.relatedDoc':    { en: 'Other experiences about this doctor', bn: 'এই ডাক্তার সম্পর্কে অন্যান্য অভিজ্ঞতা' },
    'experience.relatedNote':   { en: 'Different people, different episodes. Read a few before drawing any conclusion.', bn: 'ভিন্ন মানুষ, ভিন্ন পর্ব। সিদ্ধান্তে আসার আগে কয়েকটি পড়ুন।' },
    'experience.bookmark':      { en: 'Save', bn: 'সংরক্ষণ' },
    'experience.bookmarked':    { en: 'Saved', bn: 'সংরক্ষিত' },
    /* STORY-COM-001 — one reply level, no threads inside threads. */
    'experience.reply':         { en: 'Reply', bn: 'উত্তর দিন' },
    'experience.replyCancel':   { en: 'Cancel reply', bn: 'উত্তর বাতিল' },
    'experience.replyingTo':    { en: 'Replying to', bn: 'উত্তর দিচ্ছেন' },
    /* FR-COM-003 / STORY-COM-001 — comment edit, delete, tombstone. */
    'experience.editComment':   { en: 'Edit', bn: 'সম্পাদনা' },
    'experience.deleteComment': { en: 'Delete', bn: 'মুছুন' },
    'experience.saveComment':   { en: 'Save changes', bn: 'পরিবর্তন সংরক্ষণ' },
    'experience.cancelEdit':    { en: 'Cancel', bn: 'বাতিল' },
    'experience.edited':        { en: 'edited', bn: 'সম্পাদিত' },
    'experience.commentGone':   { en: 'This comment was deleted by its author.', bn: 'এই মন্তব্যটি লেখক মুছে ফেলেছেন।' },
    'experience.commentGoneWhy':{ en: 'The replies below it are kept, so the conversation still makes sense.', bn: 'এর নিচের উত্তরগুলো রাখা হয়েছে, যাতে আলোচনাটি বোধগম্য থাকে।' },
    'experience.ownComment':    { en: 'Your comment', bn: 'আপনার মন্তব্য' },
    'experience.replyLevel':    { en: 'Replies go one level deep. A reply cannot be replied to.', bn: 'উত্তর এক স্তর পর্যন্ত যায়। উত্তরের উত্তর দেওয়া যায় না।' },
    /* STORY-USER-001 — public profile projection. */
    'person.kicker':         { en: 'Public profile', bn: 'প্রকাশ্য প্রোফাইল' },
    'person.contributions':  { en: 'Public experiences', bn: 'প্রকাশ্য অভিজ্ঞতা' },
    'person.comments':       { en: 'Public comments', bn: 'প্রকাশ্য মন্তব্য' },
    'person.empty':          { en: 'Nothing public yet.', bn: 'এখনো প্রকাশ্য কিছু নেই।' },
    'person.allowlist':      { en: 'What appears here', bn: 'এখানে যা দেখা যায়' },
    'person.allowlistNote':  { en: 'Only experiences published under this name are listed. Anonymous experiences are never linked to a profile, even when the same person wrote them. Drafts, saved items and notifications are private and never appear here.', bn: 'শুধু এই নামে প্রকাশিত অভিজ্ঞতাগুলোই এখানে থাকে। নামহীন অভিজ্ঞতা কখনো কোনো প্রোফাইলের সাথে যুক্ত হয় না, একই ব্যক্তি লিখলেও নয়। খসড়া, সংরক্ষিত জিনিস ও বিজ্ঞপ্তি ব্যক্তিগত — এখানে কখনো দেখা যায় না।' },
    'person.noindex':        { en: 'This page asks search engines not to index it.', bn: 'এই পাতা সার্চ ইঞ্জিনকে ইনডেক্স না করতে বলে।' },
    'person.viewPublic':     { en: 'View your public profile', bn: 'আপনার প্রকাশ্য প্রোফাইল দেখুন' },
    'person.viewOf':         { en: 'View public profile', bn: 'প্রকাশ্য প্রোফাইল দেখুন' },
    'experience.bookmarkNote':  { en: 'Saved items are private to you.', bn: 'সংরক্ষিত জিনিস শুধু আপনিই দেখবেন।' },
    'experience.openEvidence':  { en: 'View processed copy', bn: 'প্রক্রিয়াকৃত কপি দেখুন' },
    'experience.evidenceOnly':  { en: 'You are seeing a processed copy. The original file is never public and is deleted after 90 days.', bn: 'আপনি একটি প্রক্রিয়াকৃত কপি দেখছেন। মূল ফাইল কখনো প্রকাশ্য নয় এবং ৯০ দিন পর মুছে ফেলা হয়।' },

    /* ---- report + appeal ---- */
    'report.title':          { en: 'Report this', bn: 'এটি রিপোর্ট করুন' },
    'report.reason':         { en: 'Why are you reporting it?', bn: 'কেন রিপোর্ট করছেন?' },
    'report.privacy':        { en: 'Shows someone’s private details', bn: 'কারও ব্যক্তিগত তথ্য দেখাচ্ছে' },
    'report.threat':         { en: 'Threat or harassment', bn: 'হুমকি বা হয়রানি' },
    'report.unsafeFile':     { en: 'Unsafe or wrong file', bn: 'অনিরাপদ বা ভুল ফাইল' },
    'report.factual':        { en: 'I disagree with what it says', bn: 'এতে যা বলা হয়েছে আমি একমত নই' },
    'report.factualNote':    { en: 'Disagreement alone does not remove an experience. It normally stays visible while a moderator looks at it.', bn: 'শুধু দ্বিমত থাকলেই অভিজ্ঞতা সরানো হয় না। মডারেটর দেখার সময়ও সাধারণত এটি দৃশ্যমান থাকে।' },
    'report.spam':           { en: 'Spam or duplicate', bn: 'স্প্যাম বা ডুপ্লিকেট' },
    'report.impersonation':  { en: 'Impersonation', bn: 'ছদ্মপরিচয়' },
    'report.dangerous':      { en: 'Dangerous medical instruction', bn: 'বিপজ্জনক চিকিৎসা নির্দেশনা' },
    'report.detail':         { en: 'Anything else we should know?', bn: 'আর কিছু জানানোর আছে?' },
    'report.evidence':       { en: 'Attach something privately', bn: 'ব্যক্তিগতভাবে কিছু যুক্ত করুন' },
    'report.evidenceNote':   { en: 'Only moderators see this. It never becomes public.', bn: 'শুধু মডারেটররা এটি দেখবেন। এটি কখনো প্রকাশ্য হয় না।' },
    'report.identityNote':   { en: 'Your name is never shown to the person you are reporting.', bn: 'যাঁকে রিপোর্ট করছেন তাঁকে আপনার নাম কখনো দেখানো হয় না।' },
    'report.submit':         { en: 'Send report', bn: 'রিপোর্ট পাঠান' },
    'report.sent':           { en: 'Report sent. You will be told the outcome, without private enforcement details.', bn: 'রিপোর্ট পাঠানো হয়েছে। ফলাফল আপনাকে জানানো হবে, তবে ব্যবস্থার ব্যক্তিগত অভিজ্ঞতা ছাড়া।' },

    'appeal.title':          { en: 'A decision was made about your experience', bn: 'আপনার অভিজ্ঞতা নিয়ে একটি সিদ্ধান্ত হয়েছে' },
    'appeal.action':         { en: 'What happened', bn: 'যা হয়েছে' },
    'appeal.policyReason':   { en: 'The rule applied', bn: 'যে নিয়ম প্রয়োগ হয়েছে' },
    'appeal.noReporter':     { en: 'We do not tell you who reported it.', bn: 'কে রিপোর্ট করেছে তা আমরা জানাই না।' },
    'appeal.button':         { en: 'Appeal this decision', bn: 'এই সিদ্ধান্তের বিরুদ্ধে আপিল করুন' },
    'appeal.text':           { en: 'Tell us what we got wrong', bn: 'আমাদের কী ভুল হয়েছে জানান' },
    'appeal.target':         { en: 'Appeals are reviewed fresh, normally within seven business days.', bn: 'আপিল নতুন করে দেখা হয়, সাধারণত সাত কর্মদিবসের মধ্যে।' },
    'appeal.sent':           { en: 'Appeal received. A different reviewer will look at it and write you a new reason.', bn: 'আপিল পাওয়া গেছে। ভিন্ন একজন পর্যালোচক এটি দেখে আপনাকে নতুন কারণ জানাবেন।' },

    /* ---- my contributions ---- */
    'mine.title':            { en: 'My writing', bn: 'আমার লেখা অভিজ্ঞতা' },
    'mine.published':        { en: 'Published', bn: 'প্রকাশিত' },
    'mine.drafts':           { en: 'Drafts', bn: 'খসড়া' },
    'mine.bookmarks':        { en: 'Saved', bn: 'সংরক্ষিত' },
    'mine.notifications':    { en: 'Notifications', bn: 'বিজ্ঞপ্তি' },
    'mine.edit':             { en: 'Edit', bn: 'সম্পাদনা' },
    'mine.addFollowUp':      { en: 'Add an update', bn: 'আপডেট যোগ করুন' },
    'mine.delete':           { en: 'Delete', bn: 'মুছুন' },
    'mine.deleteNote':       { en: 'Deleted experiences leave the summaries immediately. You can restore yours for 30 days.', bn: 'মুছে ফেলা অভিজ্ঞতা সঙ্গে সঙ্গে সারাংশ থেকে সরে যায়। ৩০ দিনের মধ্যে আপনি সেটি ফিরিয়ে আনতে পারবেন।' },
    'mine.draftNote':        { en: 'Drafts are encrypted and are removed after 30 days if you do not finish them.', bn: 'খসড়া এনক্রিপ্টেড থাকে; ৩০ দিনে শেষ না করলে মুছে যায়।' },
    'mine.draftExpires':     { en: 'expires in', bn: 'মেয়াদ শেষ' },
    'mine.days':             { en: 'days', bn: 'দিনে' },
    'mine.bookmarkNote':     { en: 'Only you can see what you saved.', bn: 'আপনি কী সংরক্ষণ করেছেন তা শুধু আপনিই দেখবেন।' },
    'mine.notifNote':        { en: 'Notifications are kept for 90 days.', bn: 'বিজ্ঞপ্তি ৯০ দিন রাখা হয়।' },
    'mine.empty':            { en: 'Nothing here yet.', bn: 'এখানে এখনো কিছু নেই।' },
    'mine.continue':         { en: 'Continue writing', bn: 'লেখা চালিয়ে যান' },
    'mine.deleted':          { en: 'Deleted — removed from the summaries', bn: 'মুছে ফেলা — সারাংশ থেকে সরানো' },
    'mine.restore':          { en: 'Restore', bn: 'ফিরিয়ে আনুন' },

    /* ---- condition page ---- */
    'condition.alsoCalled':  { en: 'Also written as', bn: 'যেভাবেও লেখা হয়' },
    'condition.acrossAll':   { en: 'Across every experience tagged with this condition', bn: 'এই রোগের ট্যাগ থাকা সব অভিজ্ঞতা মিলিয়ে' },
    'condition.medicines':   { en: 'Medicines people mentioned', bn: 'যেসব ওষুধের কথা এসেছে' },
    'condition.treatments':  { en: 'Treatments people mentioned', bn: 'যেসব চিকিৎসার কথা এসেছে' },
    'condition.symptoms':    { en: 'Symptoms people described', bn: 'যেসব উপসর্গের কথা এসেছে' },
    'condition.mentionNote': { en: 'Counted from what authors wrote. This is not a treatment guideline and not a recommendation.', bn: 'লেখকেরা যা লিখেছেন তা থেকে গোনা। এটি চিকিৎসার নির্দেশিকা নয়, কোনো সুপারিশও নয়।' },
    'condition.doctors':     { en: 'Doctors people wrote about', bn: 'যেসব ডাক্তার নিয়ে লেখা হয়েছে' },
    'condition.facilities':  { en: 'Facilities mentioned', bn: 'যেসব হাসপাতালের কথা এসেছে' },
    'condition.accounts':    { en: 'Experiences about this health topic', bn: 'এই রোগ নিয়ে অভিজ্ঞতা' },
    'condition.provisional': { en: 'Submitted wording, not yet mapped', bn: 'জমা দেওয়া শব্দ, এখনো মেলানো হয়নি' },
    'condition.provNote':    { en: 'People write in Bangla, English and Banglish. Wording we have not mapped yet is kept exactly as submitted and stays searchable.', bn: 'মানুষ বাংলা, ইংরেজি ও বাংলিশে লেখেন। যেসব শব্দ এখনো মেলানো হয়নি তা হুবহু রাখা হয় এবং খোঁজা যায়।' },

    'condition.treatedAt':      { en: 'Where this condition is treated', bn: 'এই রোগ যেখানে চিকিৎসা হয়' },
    'condition.treatedAtNote':  { en: 'Districts, areas and hospitals pulled from the experiences above. Where someone actually went, not a directory.', bn: 'উপরের অভিজ্ঞতাগুলো থেকে নেওয়া জেলা, এলাকা ও হাসপাতাল। কেউ প্রকৃতপক্ষে কোথায় গেছেন সেটি — ডিরেক্টরি নয়।' },
    'condition.districts':      { en: 'Districts', bn: 'জেলা' },
    'condition.areas':          { en: 'Areas', bn: 'এলাকা' },
    'condition.hospitals':      { en: 'Hospitals & chambers', bn: 'হাসপাতাল ও চেম্বার' },
    'condition.noGeo':          { en: 'Not enough location data yet — experiences don\'t always name the place.', bn: 'এখনো পর্যাপ্ত অবস্থানের তথ্য নেই — অভিজ্ঞতায় সবসময় জায়গার নাম থাকে না।' },
    'condition.specialtyTag':   { en: 'Usually seen by', bn: 'সাধারণত যাওয়া হয়' },

    /* ---- facilities ---- */
    'facility.type.hospital':   { en: 'Hospital', bn: 'হাসপাতাল' },
    'facility.type.clinic':     { en: 'Clinic', bn: 'ক্লিনিক' },
    'facility.type.diagnostic': { en: 'Diagnostic centre', bn: 'ডায়াগনস্টিক সেন্টার' },
    'facility.branch':       { en: 'Branch', bn: 'শাখা' },
    'facility.parent':       { en: 'Part of', bn: 'যার অংশ' },
    'facility.separation':   { en: 'This page is about the service at this facility only. None of it affects any doctor’s summaries.', bn: 'এই পাতা শুধু এই প্রতিষ্ঠানের সেবা নিয়ে। এর কোনো কিছুই কোনো ডাক্তারের সারাংশে প্রভাব ফেলে না।' },
    'facility.criteria':     { en: 'What visitors described', bn: 'যাঁরা গিয়েছেন তাঁরা যা বলেছেন' },
    'facility.doctorsHere':  { en: 'Doctors who practise here', bn: 'যেসব ডাক্তার এখানে বসেন' },
    'facility.doctorsNote':  { en: 'Listed for convenience only. A facility’s service record says nothing about these doctors.', bn: 'শুধু সুবিধার জন্য তালিকা। প্রতিষ্ঠানের সেবার রেকর্ড এই ডাক্তারদের সম্পর্কে কিছু বলে না।' },
    'facility.accounts':     { en: 'Visits', bn: 'যাওয়ার অভিজ্ঞতা' },
    'facility.write':        { en: 'Describe your visit', bn: 'আপনার অভিজ্ঞতা লিখুন' },

    'crit.staff':            { en: 'Staff behaviour', bn: 'কর্মীদের ব্যবহার' },
    'crit.waiting':          { en: 'Waiting and appointments', bn: 'অপেক্ষা ও সিরিয়াল' },
    'crit.cleanliness':      { en: 'Cleanliness', bn: 'পরিচ্ছন্নতা' },
    'crit.billing':          { en: 'Billing was clear', bn: 'বিল স্পষ্ট ছিল' },
    'crit.reportTime':       { en: 'Reports delivered on time', bn: 'রিপোর্ট সময়মতো পাওয়া' },
    'crit.reportTrust':      { en: 'Reports seemed reliable', bn: 'রিপোর্ট নির্ভরযোগ্য মনে হয়েছে' },
    'crit.reportTrustNote':  { en: 'This is the visitor’s impression only. RogiKotha does not test or validate any laboratory.', bn: 'এটি শুধু ভিজিটরের ধারণা। রোগীকথা কোনো ল্যাব পরীক্ষা বা যাচাই করে না।' },
    'crit.admission':        { en: 'Admission and discharge', bn: 'ভর্তি ও ছাড়পত্র' },
    'crit.recommend':        { en: 'Would go again', bn: 'আবার যাবেন' },
    'crit.overall':          { en: 'Overall visit', bn: 'সব মিলিয়ে' },
    'crit.good':             { en: 'Good', bn: 'ভালো' },
    'crit.mixed':            { en: 'Mixed', bn: 'মিশ্র' },
    'crit.poor':             { en: 'Poor', bn: 'খারাপ' },

    /* ---- compare ---- */
    'compare.title':         { en: 'Side by side', bn: 'পাশাপাশি' },
    'compare.add':           { en: 'Add to compare', bn: 'তুলনায় যোগ করুন' },
    'compare.remove':        { en: 'Remove', bn: 'সরান' },
    'compare.open':          { en: 'Compare', bn: 'তুলনা করুন' },
    'compare.clear':         { en: 'Clear', bn: 'মুছুন' },
    'compare.pinned':        { en: 'pinned', bn: 'যোগ করা' },
    'compare.max':           { en: 'You can compare up to three at a time.', bn: 'একসঙ্গে সর্বোচ্চ তিনজনের তুলনা করা যায়।' },
    'compare.notRanking':    { en: 'This is not a ranking. Nothing here is combined into a score and the order means nothing — the columns simply sit next to each other so you can read them together.', bn: 'এটি কোনো ক্রম নয়। এখানে কিছুই একত্র করে নম্বর বানানো হয় না এবং সাজানোর ক্রমের কোনো মানে নেই — কলামগুলো কেবল পাশাপাশি রাখা, যাতে একসঙ্গে পড়তে পারেন।' },
    'compare.empty':         { en: 'Pin two or three doctors from the results to see them here.', bn: 'ফলাফল থেকে দুই বা তিনজন ডাক্তার যোগ করলে এখানে দেখা যাবে।' },

    /* ---- composer additions ---- */
    'compose.addDoctor':     { en: 'Add a doctor who isn’t listed', bn: 'তালিকায় নেই এমন ডাক্তার যোগ করুন' },
    'compose.addName':       { en: 'Doctor’s full name', bn: 'ডাক্তারের পুরো নাম' },
    'compose.addBmdc':       { en: 'BMDC number, if you have it', bn: 'বিএমডিসি নম্বর, জানা থাকলে' },
    'compose.addSpecialty':  { en: 'Specialty', bn: 'বিশেষত্ব' },
    'compose.addChamber':    { en: 'Where they see patients', bn: 'কোথায় রোগী দেখেন' },
    'compose.addSubmit':     { en: 'Submit for review', bn: 'যাচাইয়ের জন্য পাঠান' },
    'compose.addPending':    { en: 'Submitted. An administrator checks it for duplicates and obvious abuse before it appears. Your experience stays a private draft until then.', bn: 'জমা হয়েছে। প্রকাশের আগে অ্যাডমিন ডুপ্লিকেট ও স্পষ্ট অপব্যবহার যাচাই করবেন। ততক্ষণ আপনার অভিজ্ঞতা ব্যক্তিগত খসড়া থাকবে।' },

    'compose.safety':        { en: 'Automatic checks', bn: 'স্বয়ংক্রিয় যাচাই' },
    'compose.safetyNote':    { en: 'Run before anything is published. These are not judgements about your story.', bn: 'প্রকাশের আগে চালানো হয়। এগুলো আপনার লেখার বিষয়ে কোনো রায় নয়।' },
    'compose.safetyPass':    { en: 'Nothing to fix', bn: 'ঠিক করার কিছু নেই' },
    'compose.safetyPii':     { en: 'This looks like a phone number', bn: 'এটি ফোন নম্বরের মতো মনে হচ্ছে' },
    'compose.safetyPiiFix':  { en: 'Remove it unless it is your own and you meant to share it.', bn: 'আপনার নিজের এবং ইচ্ছা করে দেওয়া না হলে সরিয়ে ফেলুন।' },
    'compose.safetyEmerg':   { en: 'You mentioned something urgent', bn: 'আপনি জরুরি কিছু উল্লেখ করেছেন' },
    'compose.safetyEmergFix':{ en: 'If this is happening now, call 999. You can still publish — this does not block you.', bn: 'এটি এখন ঘটে থাকলে ৯৯৯-এ কল করুন। আপনি প্রকাশ করতে পারবেন — এটি আটকায় না।' },
    'compose.safetyDup':     { en: 'You already wrote about this doctor for this condition', bn: 'এই ডাক্তারের এই রোগ নিয়ে আপনি আগেই লিখেছেন' },
    'compose.safetyDupFix':  { en: 'A second experience is only for a different condition or a different treatment episode. Add an update to the first one instead?', bn: 'দ্বিতীয় অভিজ্ঞতা কেবল ভিন্ন রোগ বা ভিন্ন চিকিৎসা-পর্বের জন্য। বরং আগেরটিতে একটি আপডেট যোগ করবেন?' },
    'compose.fixNow':        { en: 'Fix it', bn: 'ঠিক করুন' },
    'compose.ignore':        { en: 'Leave as it is', bn: 'যেমন আছে থাক' },

    'compose.draftSaved':    { en: 'Draft saved', bn: 'খসড়া সংরক্ষিত' },
    'compose.saveExit':      { en: 'Save and finish later', bn: 'সংরক্ষণ করে পরে শেষ করুন' },

    'ev.state.quarantine':   { en: 'In private quarantine', bn: 'ব্যক্তিগত কোয়ারেন্টাইনে' },
    'ev.state.checking':     { en: 'Checking the file', bn: 'ফাইল যাচাই হচ্ছে' },
    'ev.state.scanning':     { en: 'Scanning for malware', bn: 'ম্যালওয়্যার স্ক্যান হচ্ছে' },
    'ev.state.redact':       { en: 'Waiting for you to hide private details', bn: 'ব্যক্তিগত তথ্য ঢাকার অপেক্ষায়' },
    'ev.state.processing':   { en: 'Making the public copy', bn: 'প্রকাশ্য কপি তৈরি হচ্ছে' },
    'ev.state.ready':        { en: 'Published', bn: 'প্রকাশিত' },
    'ev.state.failed':       { en: 'Could not be published', bn: 'প্রকাশ করা যায়নি' },
    'ev.failNote':           { en: 'Your words stayed published. Only this file was held back.', bn: 'আপনার লেখা প্রকাশিত আছে। শুধু এই ফাইলটি আটকে গেছে।' },
    'ev.replace':            { en: 'Replace', bn: 'বদলান' },
    'ev.remove':             { en: 'Remove', bn: 'সরান' },

    'profile.claimThis':     { en: 'Is this you?', bn: 'এটি কি আপনি?' },
    'profile.claimNote':     { en: 'Doctors can claim their profile and correct the facts. Claiming does not verify BMDC registration and gives no control over what patients wrote.', bn: 'ডাক্তারেরা নিজের প্রোফাইল দাবি করে তথ্য সংশোধন করতে পারেন। দাবি করলে বিএমডিসি রেজিস্ট্রেশন যাচাই হয় না, এবং রোগীদের লেখার উপর কোনো নিয়ন্ত্রণও আসে না।' },
    'profile.filterAccounts':{ en: 'Filter these experiences', bn: 'এই অভিজ্ঞতাগুলো ছাঁকুন' },
    'profile.hasDocuments':  { en: 'Has documents', bn: 'কাগজপত্র আছে' },
    'profile.breakdown':     { en: 'By condition', bn: 'রোগ অনুযায়ী' },
    'profile.facilities':    { en: 'Where they practise', bn: 'যেখানে বসেন' },
    'profile.showing':       { en: 'showing', bn: 'দেখাচ্ছে' },

    /* ---- admin ---- */
    'admin.title':           { en: 'Moderation', bn: 'মডারেশন' },
    'admin.demoNote':        { en: 'Staff-only screens, shown here for design review. Fictional cases.', bn: 'শুধু স্টাফের জন্য স্ক্রিন, ডিজাইন পর্যালোচনার জন্য দেখানো হচ্ছে। কাল্পনিক কেস।' },
    'admin.tab.queue':       { en: 'Report queue', bn: 'রিপোর্ট সারি' },
    'admin.tab.evidence':    { en: 'Evidence quarantine', bn: 'কাগজপত্র কোয়ারেন্টাইন' },
    'admin.tab.providers':   { en: 'Providers & claims', bn: 'ডাক্তার ও দাবি' },
    'admin.critical':        { en: 'Critical', bn: 'জরুরি' },
    'admin.criticalTarget':  { en: 'decided within 24 hours', bn: '২৪ ঘণ্টার মধ্যে সিদ্ধান্ত' },
    'admin.standard':        { en: 'Standard', bn: 'সাধারণ' },
    'admin.standardTarget':  { en: 'decided within 3 business days', bn: '৩ কর্মদিবসের মধ্যে সিদ্ধান্ত' },
    'admin.appeals':         { en: 'Appeals', bn: 'আপিল' },
    'admin.appealTarget':    { en: 'reviewed within 7 business days', bn: '৭ কর্মদিবসের মধ্যে পর্যালোচনা' },
    'admin.age':             { en: 'Waiting', bn: 'অপেক্ষমাণ' },
    'admin.hours':           { en: 'h', bn: 'ঘ' },
    'admin.reports':         { en: 'reports', bn: 'রিপোর্ট' },
    'admin.autoHidden':      { en: 'Hidden automatically', bn: 'স্বয়ংক্রিয়ভাবে লুকানো' },
    'admin.stillVisible':    { en: 'Still public', bn: 'এখনো প্রকাশ্য' },
    'admin.coordinated':     { en: 'Possible coordinated reporting', bn: 'সম্ভাব্য সমন্বিত রিপোর্টিং' },
    'admin.coordinatedNote': { en: 'Several reports arrived together from accounts created within days of each other. Weigh them as one signal, not many.', bn: 'কাছাকাছি সময়ে তৈরি কয়েকটি অ্যাকাউন্ট থেকে একসঙ্গে রিপোর্ট এসেছে। এগুলোকে একটি সংকেত হিসেবে দেখুন, অনেকগুলো নয়।' },
    'admin.threshold':       { en: 'Auto-hide threshold: 5 unique confirmed accounts (configurable)', bn: 'স্বয়ংক্রিয় লুকানোর সীমা: ৫টি আলাদা নিশ্চিত অ্যাকাউন্ট (পরিবর্তনযোগ্য)' },
    'admin.case':            { en: 'Case', bn: 'কেস' },
    'admin.reported':        { en: 'Reported content', bn: 'রিপোর্ট করা কনটেন্ট' },
    'admin.reasonsGiven':    { en: 'Reasons given', bn: 'দেওয়া কারণ' },
    'admin.reporterMasked':  { en: 'Reporter identity — restricted', bn: 'রিপোর্টকারীর পরিচয় — সীমিত' },
    'admin.reporterNote':    { en: 'Not available at your permission level, and never shown to the reported person. Access by the Super Admin is recorded.', bn: 'আপনার অনুমতির স্তরে নেই, এবং যাঁকে রিপোর্ট করা হয়েছে তাঁকে কখনো দেখানো হয় না। সুপার অ্যাডমিনের প্রবেশ রেকর্ড হয়।' },
    'admin.evidenceGated':   { en: 'Original evidence — separate permission', bn: 'মূল কাগজপত্র — আলাদা অনুমতি' },
    'admin.evidenceGateNote':{ en: 'Opening the original is a distinct permission and every access is written to the audit log with your name and reason.', bn: 'মূল ফাইল খোলা আলাদা অনুমতি, এবং প্রতিটি প্রবেশ আপনার নাম ও কারণসহ অডিট লগে লেখা হয়।' },
    'admin.requestAccess':   { en: 'Request access', bn: 'প্রবেশের অনুরোধ' },
    'admin.decision':        { en: 'Decision', bn: 'সিদ্ধান্ত' },
    'admin.act.warn':        { en: 'Warning to author', bn: 'লেখককে সতর্কতা' },
    'admin.act.redact':      { en: 'Ask author to redact', bn: 'লেখককে অংশ ঢাকতে বলুন' },
    'admin.act.removeFile':  { en: 'Remove attachment', bn: 'সংযুক্তি সরান' },
    'admin.act.lock':        { en: 'Lock comments', bn: 'মন্তব্য বন্ধ' },
    'admin.act.hide':        { en: 'Hide temporarily', bn: 'সাময়িক লুকান' },
    'admin.act.remove':      { en: 'Remove', bn: 'সরিয়ে দিন' },
    'admin.act.restrict':    { en: 'Restrict account', bn: 'অ্যাকাউন্ট সীমিত' },
    'admin.act.suspend':     { en: 'Suspend account', bn: 'অ্যাকাউন্ট স্থগিত' },
    'admin.act.ban':         { en: 'Ban account', bn: 'অ্যাকাউন্ট নিষিদ্ধ' },
    'admin.act.none':        { en: 'No action needed', bn: 'কোনো ব্যবস্থা নয়' },
    'admin.proportion':      { en: 'Use the least restrictive action that solves the problem.', bn: 'সমস্যা মেটে এমন সবচেয়ে কম কঠোর ব্যবস্থাই নিন।' },
    'admin.noRewrite':       { en: 'You may redact private identifiers. You may never rewrite the author’s medical story — ask them to change it instead.', bn: 'ব্যক্তিগত শনাক্তকারী তথ্য ঢাকতে পারেন। লেখকের চিকিৎসা-বিবরণ কখনো নিজে বদলাতে পারবেন না — বরং তাঁকে বদলাতে বলুন।' },
    'admin.reasonToAuthor':  { en: 'Reason sent to the author', bn: 'লেখককে পাঠানো কারণ' },
    'admin.auditPreview':    { en: 'This will be written to the audit log', bn: 'এটি অডিট লগে লেখা হবে' },
    'admin.commit':          { en: 'Record decision', bn: 'সিদ্ধান্ত রেকর্ড করুন' },
    'admin.recorded':        { en: 'Decision recorded and the author has been told.', bn: 'সিদ্ধান্ত রেকর্ড হয়েছে এবং লেখককে জানানো হয়েছে।' },

    'admin.pipeline':        { en: 'Processing pipeline', bn: 'প্রক্রিয়াকরণ ধাপ' },
    'admin.pl.received':     { en: 'Received', bn: 'গৃহীত' },
    'admin.pl.validated':    { en: 'Type checked', bn: 'ধরন যাচাই' },
    'admin.pl.scanned':      { en: 'Malware scan', bn: 'ম্যালওয়্যার স্ক্যান' },
    'admin.pl.converted':    { en: 'Sanitised', bn: 'নিরাপদ করা' },
    'admin.pl.rasterised':   { en: 'Rasterised', bn: 'ছবিতে রূপান্তর' },
    'admin.pl.redacted':     { en: 'Redaction flattened', bn: 'ঢাকা অংশ স্থায়ী' },
    'admin.pl.published':    { en: 'Public copy ready', bn: 'প্রকাশ্য কপি প্রস্তুত' },
    'admin.failClosed':      { en: 'Scanner unavailable — failed closed', bn: 'স্ক্যানার পাওয়া যায়নি — আটকে দেওয়া হয়েছে' },
    'admin.failClosedNote':  { en: 'When scanning cannot run, the file is held. It is never published on the assumption that it is probably fine.', bn: 'স্ক্যান করা না গেলে ফাইল আটকে রাখা হয়। “সম্ভবত ঠিক আছে” ধরে নিয়ে কখনো প্রকাশ করা হয় না।' },
    'admin.textStays':       { en: 'The written experience stayed public throughout. Only the file was held.', bn: 'লেখাটি সারাক্ষণ প্রকাশ্য ছিল। শুধু ফাইলটি আটকে ছিল।' },
    'admin.retention':       { en: 'Original deleted after 90 days', bn: 'মূল ফাইল ৯০ দিন পর মুছে যায়' },
    'admin.legalHold':       { en: 'Legal hold', bn: 'আইনি হোল্ড' },
    'admin.legalHoldNote':   { en: 'Retention is suspended and the item is hidden publicly while preserved.', bn: 'মেয়াদ স্থগিত থাকে এবং সংরক্ষিত অবস্থায় জিনিসটি প্রকাশ্যে লুকানো থাকে।' },

    'admin.newProfiles':     { en: 'New profiles', bn: 'নতুন প্রোফাইল' },
    'admin.newProfileNote':  { en: 'Check for duplicates and obvious abuse. This is not registration verification.', bn: 'ডুপ্লিকেট ও স্পষ্ট অপব্যবহার দেখুন। এটি রেজিস্ট্রেশন যাচাই নয়।' },
    'admin.possibleDup':     { en: 'Possible duplicate of', bn: 'সম্ভাব্য ডুপ্লিকেট' },
    'admin.merge':           { en: 'Merge into canonical', bn: 'মূল প্রোফাইলে মিলিয়ে দিন' },
    'admin.mergeNote':       { en: 'Experiences, tags, chambers and claims move across. The old address redirects and the change is audited.', bn: 'অভিজ্ঞতা, ট্যাগ, চেম্বার ও দাবি স্থানান্তর হয়। পুরোনো ঠিকানা রিডাইরেক্ট হয় এবং পরিবর্তন অডিট হয়।' },
    'admin.approve':         { en: 'Approve', bn: 'অনুমোদন' },
    'admin.reject':          { en: 'Reject', bn: 'বাতিল' },
    'admin.done.approved':   { en: 'Approved — written to the audit log', bn: 'অনুমোদিত — অডিট লগে লেখা হয়েছে' },
    'admin.done.rejected':   { en: 'Rejected — written to the audit log', bn: 'বাতিল — অডিট লগে লেখা হয়েছে' },
    'admin.done.merged':     { en: 'Merged — written to the audit log', bn: 'মিলিয়ে দেওয়া হয়েছে — অডিট লগে লেখা হয়েছে' },
    'admin.done.revealed':   { en: 'Revealed — your name and reason are in the audit log', bn: 'প্রকাশ করা হয়েছে — আপনার নাম ও কারণ অডিট লগে আছে' },
    'admin.done.requested':  { en: 'Access requested — logged for approval', bn: 'প্রবেশের অনুরোধ — অনুমোদনের জন্য লগ করা হয়েছে' },
    'admin.done.acked':      { en: 'Acknowledged', bn: 'গৃহীত' },
    'admin.claims':          { en: 'Claim requests', bn: 'দাবির অনুরোধ' },
    'admin.protectedFields': { en: 'Protected field changes', bn: 'সুরক্ষিত তথ্যের পরিবর্তন' },
    'admin.protectedNote':   { en: 'Identity, BMDC number, degrees and specialty need approval. Operational details do not.', bn: 'পরিচয়, বিএমডিসি নম্বর, ডিগ্রি ও বিশেষত্ব অনুমোদন লাগে। কার্যক্রমের তথ্যে লাগে না।' },
    'admin.wasNow':          { en: 'was → now', bn: 'ছিল → এখন' },
    'admin.auditLog':        { en: 'Audit', bn: 'অডিট' },
    'admin.permission':      { en: 'Your permissions', bn: 'আপনার অনুমতি' },
    'admin.permissions':     { en: 'Permissions on this case', bn: 'এই কেসে অনুমতি' },
    'admin.permissionNote':  { en: 'Fields you cannot see are hidden rather than blanked, so it is obvious something exists that you are not cleared for.', bn: 'যেসব তথ্য আপনি দেখতে পারবেন না তা ফাঁকা না রেখে লুকানো হয়, যাতে বোঝা যায় কিছু আছে যার অনুমতি আপনার নেই।' },
    'admin.portal':          { en: 'Staff console', bn: 'কর্মী কনসোল' },
    'admin.staffOnly':       { en: 'Staff only', bn: 'শুধু কর্মীদের জন্য' },
    'admin.staffOnlyNote':   { en: 'This screen is for moderation staff only. Patients and doctors do not see it.', bn: 'এই স্ক্রিন শুধু মডারেশন কর্মীদের জন্য। রোগী বা ডাক্তাররা এটি দেখেন না।' },
    'admin.backToGallery':   { en: 'Back to the prototype gallery', bn: 'প্রোটোটাইপ গ্যালারিতে ফিরুন' },
    'admin.tab.config':      { en: 'Configuration', bn: 'কনফিগারেশন' },
    'admin.tab.notifications': { en: 'Notifications', bn: 'বিজ্ঞপ্তি' },
    'admin.config.title':    { en: 'Versioned runtime configuration', bn: 'সংস্করণযুক্ত রানটাইম কনফিগারেশন' },
    'admin.config.thresholds': { en: 'Reporting thresholds', bn: 'রিপোর্টিং সীমা' },
    'admin.config.retention': { en: 'Retention defaults', bn: 'সংরক্ষণের ডিফল্ট' },
    'admin.config.roles':    { en: 'Role & capability matrix', bn: 'ভূমিকা ও ক্ষমতা ম্যাট্রিক্স' },
    'admin.config.threshold.five': { en: 'Five-account auto-hide threshold', bn: 'পাঁচ-অ্যাকাউন্ট স্বয়ংক্রিয় লুকানোর সীমা' },
    'admin.config.threshold.criticalHours': { en: 'Critical case hours', bn: 'জরুরি কেস ঘণ্টা' },
    'admin.config.threshold.standardDays': { en: 'Standard case days', bn: 'সাধারণ কেস দিন' },
    'admin.config.retention.defaultDays': { en: 'Default retention (days)', bn: 'ডিফল্ট সংরক্ষণ (দিন)' },
    'admin.config.retention.maxDays': { en: 'Maximum retention (days)', bn: 'সর্বোচ্চ সংরক্ষণ (দিন)' },
    'admin.config.role.sa':  { en: 'Super Admin', bn: 'সুপার অ্যাডমিন' },
    'admin.config.role.admin': { en: 'Admin', bn: 'অ্যাডমিন' },
    'admin.config.role.mod': { en: 'Moderator', bn: 'মডারেটর' },
    'admin.config.cap.reports': { en: 'View reports', bn: 'রিপোর্ট দেখুন' },
    'admin.config.cap.actions': { en: 'Take content actions', bn: 'কনটেন্ট পদক্ষেপ নিন' },
    'admin.config.cap.identity': { en: 'Reveal reporter identity', bn: 'রিপোর্টকারীর পরিচয় প্রকাশ' },
    'admin.config.cap.originalEvidence': { en: 'Reveal original evidence', bn: 'মূল কাগজপত্র প্রকাশ' },
    'admin.role.current':    { en: 'Current role', bn: 'বর্তমান ভূমিকা' },
    'admin.role.currentTitle': { en: 'Active role: ', bn: 'সক্রিয় ভূমিকা: ' },
    'admin.role.sa':         { en: 'Super Admin', bn: 'সুপার অ্যাডমিন' },
    'admin.role.admin':      { en: 'Admin', bn: 'অ্যাডমিন' },
    'admin.role.mod':        { en: 'Moderator', bn: 'মডারেটর' },
    'admin.notif.kind.report': { en: 'Report', bn: 'রিপোর্ট' },
    'admin.notif.kind.protected': { en: 'Protected-field change', bn: 'সুরক্ষিত তথ্যের পরিবর্তন' },
    'admin.notif.kind.identity': { en: 'Identity reveal request', bn: 'পরিচয় প্রকাশের অনুরোধ' },
    'admin.bulk.previewAffected': { en: 'Preview affected', bn: 'প্রভাবিত দেখুন' },
    'admin.bulk.affected':   { en: 'affected', bn: 'টি প্রভাবিত' },
    'admin.act.cycleTip':    { en: 'Click to cycle role (Super Admin → Admin → Moderator)', bn: 'ভূমিকা পরিবর্তন করতে ক্লিক করুন (সুপার অ্যাডমিন → অ্যাডমিন → মডারেটর)' },
    'admin.reveal.audited':  { en: 'Reveal (audited)', bn: 'প্রকাশ (অডিটেড)' },
    'admin.timeline.recent': { en: 'Recent actions on this case', bn: 'এই কেসে সাম্প্রতিক পদক্ষেপ' },
    'admin.timeline.timeAgo': { en: 'ago', bn: 'আগে' },
    'admin.bulk.toolbar':    { en: 'Bulk actions', bn: 'গণ পদক্ষেপ' },
    'admin.bulk.select':     { en: 'Select', bn: 'নির্বাচন' },
    'admin.bulk.selectCritical': { en: 'Select all critical', bn: 'সমস্ত জরুরি নির্বাচন' },
    'admin.bulk.preview':    { en: 'Preview affected', bn: 'প্রভাবিত কেস দেখুন' },
    'admin.bulk.confirm':    { en: 'Confirm', bn: 'নিশ্চিত' },
    'admin.bulk.cancel':     { en: 'Cancel', bn: 'বাতিল' },
    'admin.bulk.empty':      { en: 'No cases selected.', bn: 'কোনো কেস নির্বাচিত নয়।' },
    'admin.bulk.done':       { en: 'Bulk action queued (no-op for prototype).', bn: 'গণ পদক্ষেপ সারিতে যুক্ত হয়েছে (প্রোটোটাইপে নো-অপ)।' },
    'admin.notif.title':     { en: 'Notification triage', bn: 'বিজ্ঞপ্তি বাছাই' },
    'admin.notif.kind.newReport': { en: 'New report', bn: 'নতুন রিপোর্ট' },
    'admin.notif.kind.evidence': { en: 'Evidence processed', bn: 'কাগজপত্র প্রক্রিয়াকৃত' },
    'admin.notif.kind.claim': { en: 'Claim submitted', bn: 'দাবি জমা' },
    'admin.notif.kind.protectedChange': { en: 'Protected field change requested', bn: 'সুরক্ষিত তথ্য পরিবর্তনের অনুরোধ' },
    'admin.notif.kind.identityReveal': { en: 'Identity reveal requested', bn: 'পরিচয় প্রকাশের অনুরোধ' },
    'admin.notif.kind.security': { en: 'Security alert', bn: 'নিরাপত্তা সতর্কতা' },
    'admin.notif.action.open': { en: 'Open', bn: 'খুলুন' },
    'admin.notif.action.ack':  { en: 'Acknowledge', bn: 'স্বীকার করুন' },

    // STORY-USER-002: mine-tab preferences / feedback / data-request strings
    'user2.preferences':       { en: 'Preferences', bn: 'পছন্দসমূহ' },
    'user2.preferencesNote':   { en: 'Choose how the app speaks to you. Settings stay on this device.', bn: 'অ্যাপটি আপনার সাথে কীভাবে কথা বলবে তা বেছে নিন। সেটিংস এই ডিভাইসে থাকে।' },
    'user2.lang.en':           { en: 'English', bn: 'ইংরেজি' },
    'user2.lang.bn':           { en: 'বাংলা (Bangla)', bn: 'বাংলা' },
    'user2.feedback':          { en: 'Feedback', bn: 'মতামত' },
    'user2.feedbackNote':      { en: 'Share what worked, what broke, or what you wished the app did. Drafts save as you type.', bn: 'কী ভালো কাজ করেছে, কোথায় সমস্যা হয়েছে, বা আর কী চান — জানান। খসড়া টাইপ করার সময়ই সংরক্ষিত হয়।' },
    'user2.feedbackPh':        { en: 'What did you try? What happened?', bn: 'আপনি কী করতে চেয়েছিলেন? কী ঘটেছে?' },
    'user2.feedbackSend':      { en: 'Save draft', bn: 'খসড়া সংরক্ষণ' },
    'user2.feedbackSent':      { en: 'Draft saved locally.', bn: 'খসড়া স্থানীয়ভাবে সংরক্ষিত।' },
    'user2.data':              { en: 'Your data', bn: 'আপনার তথ্য' },
    'user2.dataNote':          { en: 'Request a copy of what the service knows about you, or ask for your account to be deleted.', bn: 'পরিষেবা আপনার সম্পর্কে যা জানে তার একটি অনুলিপি অনুরোধ করুন, অথবা অ্যাকাউন্ট মুছে ফেলার অনুরোধ করুন।' },
    'user2.dataExport':        { en: 'Request my data export', bn: 'আমার তথ্যের অনুলিপি অনুরোধ' },
    'user2.dataDelete':        { en: 'Request account deletion', bn: 'অ্যাকাউন্ট মুছে ফেলার অনুরোধ' },
    'user2.dataCallout':       { en: 'These requests are processed manually in this prototype. In production they trigger the documented workflow.', bn: 'এই প্রোটোটাইপে অনুরোধগুলি ম্যানুয়ালি প্রক্রিয়া করা হয়। প্রোডাকশনে এগুলি নথিভুক্ত কর্মপ্রবাহ চালু করে।' },
    'user2.dataExportNote':    { en: 'A signed archive will be prepared and a download link sent within 7 days.', bn: 'স্বাক্ষরিত সংরক্ষণাগার তৈরি হয়ে ৭ দিনের মধ্যে ডাউনলোড লিঙ্ক পাঠানো হবে।' },
    'user2.dataDeleteNote':    { en: 'Public contributions remain in their anonymised form; identifiable records are removed within 30 days.', bn: 'প্রকাশ্য অবদানগুলি বেনামী আকারে থাকে; শনাক্তযোগ্য রেকর্ড ৩০ দিনের মধ্যে মুছে ফেলা হয়।' },
  };

  /* ---------------------------------------------------------------
   * Fictional directory
   * ------------------------------------------------------------- */
  var doctors = [
    {
      id: 'd1',
      name: { en: 'Dr. Farhana Rahman', bn: 'ডা. ফারহানা রহমান' },
      specialty: { en: 'Endocrinology', bn: 'এন্ডোক্রিনোলজি' },
      qualifications: { en: 'MBBS, FCPS (Medicine), MD (Endocrinology)', bn: 'এমবিবিএস, এফসিপিএস (মেডিসিন), এমডি (এন্ডোক্রিনোলজি)' },
      bmdc: 'A-41287',
      gender: 'female',
      languages: { en: 'Bangla, English', bn: 'বাংলা, ইংরেজি' },
      fee: { en: '৳1,200', bn: '১,২০০ টাকা' },
      city: { en: 'Dhaka', bn: 'ঢাকা' },
      area: { en: 'Dhanmondi', bn: 'ধানমন্ডি' },
      chambers: [
        { name: { en: 'Shefa General Hospital', bn: 'শেফা জেনারেল হাসপাতাল' }, hours: { en: 'Sat–Wed, 6–9 pm', bn: 'শনি–বুধ, সন্ধ্যা ৬–৯টা' }, provenance: 'provider' },
        { name: { en: 'Dhanmondi Medical Centre', bn: 'ধানমন্ডি মেডিকেল সেন্টার' }, hours: { en: 'Thu, 4–7 pm', bn: 'বৃহস্পতি, বিকাল ৪–৭টা' }, provenance: 'community' }
      ],
      provenance: { name: 'admin', specialty: 'provider', bmdc: 'community', qualifications: 'provider', fee: 'community' },
      claimed: true,
      accent: 210
    },
    {
      id: 'd2',
      name: { en: 'Dr. Imtiaz Kabir', bn: 'ডা. ইমতিয়াজ কবির' },
      specialty: { en: 'Cardiology', bn: 'কার্ডিওলজি' },
      qualifications: { en: 'MBBS, D-Card, MD (Cardiology)', bn: 'এমবিবিএস, ডি-কার্ড, এমডি (কার্ডিওলজি)' },
      bmdc: 'A-38054',
      gender: 'male',
      languages: { en: 'Bangla, English, Chittagonian', bn: 'বাংলা, ইংরেজি, চাটগাঁইয়া' },
      fee: { en: '৳1,500', bn: '১,৫০০ টাকা' },
      city: { en: 'Chattogram', bn: 'চট্টগ্রাম' },
      area: { en: 'Panchlaish', bn: 'পাঁচলাইশ' },
      chambers: [
        { name: { en: 'Bandar Diagnostic Centre', bn: 'বন্দর ডায়াগনস্টিক সেন্টার' }, hours: { en: 'Daily, 5–10 pm', bn: 'প্রতিদিন, সন্ধ্যা ৫–১০টা' }, provenance: 'community' }
      ],
      provenance: { name: 'community', specialty: 'community', bmdc: 'community', qualifications: 'community', fee: 'community' },
      claimed: false,
      accent: 158
    },
    {
      id: 'd3',
      name: { en: 'Dr. Sabina Yeasmin', bn: 'ডা. সাবিনা ইয়াসমিন' },
      specialty: { en: 'Dermatology', bn: 'চর্মরোগ' },
      qualifications: { en: 'MBBS, DDV', bn: 'এমবিবিএস, ডিডিভি' },
      bmdc: 'A-52910',
      gender: 'female',
      languages: { en: 'Bangla', bn: 'বাংলা' },
      fee: { en: '৳900', bn: '৯০০ টাকা' },
      city: { en: 'Dhaka', bn: 'ঢাকা' },
      area: { en: 'Uttara', bn: 'উত্তরা' },
      chambers: [
        { name: { en: 'Uttara Skin Care', bn: 'উত্তরা স্কিন কেয়ার' }, hours: { en: 'Sun–Thu, 5–8 pm', bn: 'রবি–বৃহস্পতি, সন্ধ্যা ৫–৮টা' }, provenance: 'community' }
      ],
      provenance: { name: 'community', specialty: 'community', bmdc: 'community', qualifications: 'community', fee: 'community' },
      claimed: false,
      accent: 288
    },
    {
      id: 'd4',
      name: { en: 'Dr. Mahmudul Hasan', bn: 'ডা. মাহমুদুল হাসান' },
      specialty: { en: 'Orthopaedics', bn: 'অর্থোপেডিকস' },
      qualifications: { en: 'MBBS, MS (Orthopaedics)', bn: 'এমবিবিএস, এমএস (অর্থোপেডিকস)' },
      bmdc: 'A-33471',
      gender: 'male',
      languages: { en: 'Bangla, English', bn: 'বাংলা, ইংরেজি' },
      fee: { en: '৳1,000', bn: '১,০০০ টাকা' },
      city: { en: 'Sylhet', bn: 'সিলেট' },
      area: { en: 'Zindabazar', bn: 'জিন্দাবাজার' },
      chambers: [
        { name: { en: 'Prottasha Clinic', bn: 'প্রত্যাশা ক্লিনিক' }, hours: { en: 'Sat–Thu, 6–9 pm', bn: 'শনি–বৃহস্পতি, সন্ধ্যা ৬–৯টা' }, provenance: 'admin' }
      ],
      provenance: { name: 'admin', specialty: 'admin', bmdc: 'admin', qualifications: 'community', fee: 'community' },
      claimed: true,
      accent: 28
    },
    {
      id: 'd5',
      name: { en: 'Dr. Nusrat Jahan', bn: 'ডা. নুসরাত জাহান' },
      specialty: { en: 'Gastroenterology', bn: 'গ্যাস্ট্রোএন্টেরোলজি' },
      qualifications: { en: 'MBBS, MD (Gastroenterology)', bn: 'এমবিবিএস, এমডি (গ্যাস্ট্রোএন্টেরোলজি)' },
      bmdc: 'A-47612',
      gender: 'female',
      languages: { en: 'Bangla, English', bn: 'বাংলা, ইংরেজি' },
      fee: { en: '৳1,100', bn: '১,১০০ টাকা' },
      city: { en: 'Dhaka', bn: 'ঢাকা' },
      area: { en: 'Mirpur', bn: 'মিরপুর' },
      chambers: [
        { name: { en: 'Mirpur Care Hospital', bn: 'মিরপুর কেয়ার হাসপাতাল' }, hours: { en: 'Sat–Wed, 7–10 pm', bn: 'শনি–বুধ, রাত ৭–১০টা' }, provenance: 'community' }
      ],
      provenance: { name: 'community', specialty: 'provider', bmdc: 'community', qualifications: 'community', fee: 'community' },
      claimed: false,
      accent: 178
    },
    {
      id: 'd6',
      name: { en: 'Dr. Rezaul Karim', bn: 'ডা. রেজাউল করিম' },
      specialty: { en: 'General Medicine', bn: 'জেনারেল মেডিসিন' },
      qualifications: { en: 'MBBS, FCPS (Medicine)', bn: 'এমবিবিএস, এফসিপিএস (মেডিসিন)' },
      bmdc: 'A-29338',
      gender: 'male',
      languages: { en: 'Bangla, English', bn: 'বাংলা, ইংরেজি' },
      fee: { en: '৳800', bn: '৮০০ টাকা' },
      city: { en: 'Khulna', bn: 'খুলনা' },
      area: { en: 'Sonadanga', bn: 'সোনাডাঙ্গা' },
      chambers: [
        { name: { en: 'Sonadanga Medical Hall', bn: 'সোনাডাঙ্গা মেডিকেল হল' }, hours: { en: 'Daily, 6–9 pm', bn: 'প্রতিদিন, সন্ধ্যা ৬–৯টা' }, provenance: 'community' }
      ],
      provenance: { name: 'community', specialty: 'community', bmdc: 'community', qualifications: 'community', fee: 'community' },
      claimed: false,
      accent: 340
    }
  ];

  // STORY-SRCH-003: provisional bilingual taxonomy with aliases incl. Banglish
  var conditions = [
    { id: 'c1', name: { en: 'Type 2 diabetes', bn: 'টাইপ ২ ডায়াবেটিস' }, aliases: ['diabetes', 'ডায়াবেটিস', 'dayabetis', 'sugar', 'চিনি রোগ'] },
    { id: 'c2', name: { en: 'Thyroid (hypothyroidism)', bn: 'থাইরয়েড (হাইপোথাইরয়েড)' }, aliases: ['thyroid', 'থাইরয়েড'] },
    { id: 'c3', name: { en: 'High blood pressure', bn: 'উচ্চ রক্তচাপ' }, aliases: ['hypertension', 'প্রেসার', 'pressure'] },
    { id: 'c4', name: { en: 'Eczema', bn: 'একজিমা' }, aliases: ['eczema', 'একজিমা', 'chulkani'] },
    { id: 'c5', name: { en: 'Frozen shoulder', bn: 'ফ্রোজেন শোল্ডার' }, aliases: ['shoulder pain', 'কাঁধে ব্যথা'] },
    { id: 'c6', name: { en: 'Irritable bowel syndrome', bn: 'আইবিএস' }, aliases: ['ibs', 'পেটের সমস্যা'] },
    { id: 'c7', name: { en: 'Typhoid fever', bn: 'টাইফয়েড জ্বর' }, aliases: ['typhoid', 'টাইফয়েড'] },
    /* Deliberately has no experiences written about it. The Discover tile
       grid filters topics down to those with at least one, so an empty
       topic is invisible there; the #topics index lists it and offers the
       'be the first' path. Without this row that difference is untestable. */
    { id: 'c8', name: { en: 'Gastric ulcer', bn: 'গ্যাস্ট্রিক আলসার' }, aliases: ['ulcer', 'গ্যাস্ট্রিক', 'gastric'] }
  ];

  /* Accounts. `body` fields are written the way people actually write —
     Bangla, English or mixed. They are never machine-translated; the `en`
     and `bn` keys here are two authored variants for the demo only. */
  var reviews = [
    {
      id: 'r1', doctorId: 'd1', conditionId: 'c1', sentiment: 'positive', outcome: 'helped',
      relationship: 'self', identity: 'pseudo', author: { en: 'shirin_88', bn: 'shirin_88' },
      period: { en: 'March 2026', bn: 'মার্চ ২০২৬' }, posted: { en: 'Posted May 2026', bn: 'প্রকাশ মে ২০২৬' },
      detailed: true, evidence: 2, likes: 34, dislikes: 2, comments: 6, claims: [],
      title: { en: 'She actually explained why my sugar was swinging', bn: 'কেন আমার সুগার ওঠানামা করছিল, উনি আসলেই বুঝিয়ে বললেন' },
      body: {
        en: 'I had been on the same two tablets for four years and my readings were all over the place — 6 one morning, 14 the next. Two previous doctors just increased the dose. She spent maybe twenty minutes going through my daily routine and worked out that I was taking the evening tablet after dinner instead of before. She changed the timing, added a long-acting insulin at night, and asked me to write down readings for six weeks.',
        bn: 'চার বছর ধরে একই দুটি ট্যাবলেট খাচ্ছিলাম, কিন্তু রিডিং একেকদিন একেকরকম — এক সকালে ৬, পরদিন ১৪। আগের দুজন ডাক্তার শুধু ডোজ বাড়িয়ে দিয়েছিলেন। উনি প্রায় বিশ মিনিট ধরে আমার রুটিন ধরে ধরে দেখলেন এবং বুঝলেন যে আমি রাতের ট্যাবলেট খাবারের আগে না খেয়ে পরে খাচ্ছি। উনি সময় বদলে দিলেন, রাতে লং-অ্যাক্টিং ইনসুলিন যোগ করলেন, আর ছয় সপ্তাহ রিডিং লিখে রাখতে বললেন।'
      },
      timeline: [
        { k: 'symptoms', en: 'Constant thirst, waking up three times a night, blurry vision for about two months.', bn: 'অনবরত তৃষ্ণা, রাতে তিনবার ঘুম ভাঙা, প্রায় দুই মাস ধরে চোখে ঝাপসা দেখা।' },
        { k: 'diagnosis', en: 'Poorly controlled type 2 diabetes, not a new diagnosis. She said the problem was timing, not the drug.', bn: 'নিয়ন্ত্রণহীন টাইপ ২ ডায়াবেটিস, নতুন কোনো রোগ নয়। উনি বললেন সমস্যা ওষুধে নয়, সময়ে।' },
        { k: 'treatment', en: 'Same tablets, corrected timing. Added long-acting insulin 10 units at night. HbA1c and kidney function tests.', bn: 'একই ট্যাবলেট, সময় ঠিক করা। রাতে ১০ ইউনিট লং-অ্যাক্টিং ইনসুলিন যোগ। HbA1c ও কিডনি ফাংশন পরীক্ষা।' },
        { k: 'after', en: 'After six weeks fasting readings settled between 6 and 8. HbA1c came down from 9.4 to 7.1 at the follow-up.', bn: 'ছয় সপ্তাহ পর খালি পেটে রিডিং ৬ থেকে ৮-এর মধ্যে এলো। ফলো-আপে HbA1c ৯.৪ থেকে ৭.১-এ নামল।' }
      ],
      followUp: { date: { en: 'August 2026', bn: 'আগস্ট ২০২৬' }, en: 'Five months on, still stable. I have not needed to increase the insulin.', bn: 'পাঁচ মাস পরেও স্থিতিশীল। ইনসুলিন বাড়াতে হয়নি।' },
      tags: [
        { g: 'condition', en: 'Type 2 diabetes', bn: 'টাইপ ২ ডায়াবেটিস' },
        { g: 'symptom', en: 'Excessive thirst', bn: 'অতিরিক্ত তৃষ্ণা' },
        { g: 'medicine', en: 'Metformin', bn: 'মেটফরমিন' },
        { g: 'treatment', en: 'Insulin adjustment', bn: 'ইনসুলিন সমন্বয়' }
      ]
    },
    {
      id: 'r2', doctorId: 'd1', conditionId: 'c2', sentiment: 'mixed', outcome: 'uncertain',
      relationship: 'family', identity: 'anon', author: { en: 'Anonymous', bn: 'নাম প্রকাশ না করে' },
      period: { en: 'January 2026', bn: 'জানুয়ারি ২০২৬' }, posted: { en: 'Posted February 2026', bn: 'প্রকাশ ফেব্রুয়ারি ২০২৬' },
      detailed: false, evidence: 0, likes: 11, dislikes: 1, comments: 2, claims: [],
      title: { en: 'Good with the tests, rushed with the questions', bn: 'পরীক্ষার ব্যাপারে ভালো, প্রশ্নের ব্যাপারে তাড়াহুড়ো' },
      body: {
        en: 'Took my mother for thyroid. The test list was thorough and she caught something the local doctor missed. But the chamber was overbooked — we waited two and a half hours and then got about seven minutes. My mother had questions about side effects and did not get to ask them. The medicine seems fine so far but we are not sure yet.',
        bn: 'মাকে থাইরয়েডের জন্য নিয়ে গিয়েছিলাম। পরীক্ষার তালিকা পূর্ণাঙ্গ ছিল এবং স্থানীয় ডাক্তার যা ধরতে পারেননি উনি তা ধরেছেন। কিন্তু চেম্বারে অতিরিক্ত রোগী — আড়াই ঘণ্টা অপেক্ষার পর সাত মিনিট পেয়েছি। মায়ের পার্শ্বপ্রতিক্রিয়া নিয়ে প্রশ্ন ছিল, জিজ্ঞেস করার সুযোগ হয়নি। ওষুধ এখন পর্যন্ত ঠিক আছে মনে হচ্ছে, তবে নিশ্চিত নই।'
      },
      tags: [
        { g: 'condition', en: 'Hypothyroidism', bn: 'হাইপোথাইরয়েড' },
        { g: 'medicine', en: 'Levothyroxine', bn: 'লেভোথাইরক্সিন' }
      ]
    },
    {
      id: 'r3', doctorId: 'd1', conditionId: 'c1', sentiment: 'positive', outcome: 'helped',
      relationship: 'self', identity: 'real', author: { en: 'Kamrul Islam', bn: 'কামরুল ইসলাম' },
      period: { en: 'November 2025', bn: 'নভেম্বর ২০২৫' }, posted: { en: 'Posted December 2025', bn: 'প্রকাশ ডিসেম্বর ২০২৫' },
      detailed: false, evidence: 1, likes: 22, dislikes: 0, comments: 3, claims: [],
      title: { en: 'Did not push unnecessary tests', bn: 'অপ্রয়োজনীয় পরীক্ষা ধরিয়ে দেননি' },
      body: {
        en: 'I came with a folder of tests from another clinic. She read all of them and said I did not need to repeat any. That saved me about 8,000 taka. Diabetes plan was simple and written down in Bangla so my wife could follow it too.',
        bn: 'অন্য একটি ক্লিনিকের পরীক্ষার ফাইল নিয়ে গিয়েছিলাম। উনি সবগুলো পড়ে বললেন কোনোটাই আবার করার দরকার নেই। এতে প্রায় ৮,০০০ টাকা বেঁচে গেল। ডায়াবেটিসের পরিকল্পনা সহজ ছিল এবং বাংলায় লিখে দিয়েছিলেন যাতে আমার স্ত্রীও বুঝতে পারেন।'
      },
      tags: [
        { g: 'condition', en: 'Type 2 diabetes', bn: 'টাইপ ২ ডায়াবেটিস' },
        { g: 'treatment', en: 'Diet plan', bn: 'খাদ্য পরিকল্পনা' }
      ]
    },
    {
      id: 'r4', doctorId: 'd1', conditionId: 'c1', sentiment: 'negative', outcome: 'none',
      relationship: 'self', identity: 'pseudo', author: { en: 'r_ahmed', bn: 'r_ahmed' },
      period: { en: 'June 2026', bn: 'জুন ২০২৬' }, posted: { en: 'Posted July 2026', bn: 'প্রকাশ জুলাই ২০২৬' },
      detailed: false, evidence: 0, likes: 8, dislikes: 14, comments: 11, claims: ['secondOpinion'],
      title: { en: 'Felt dismissed when I raised the side effects', bn: 'পার্শ্বপ্রতিক্রিয়ার কথা বলায় গুরুত্ব পাইনি' },
      body: {
        en: 'The new medicine gave me stomach pain from the first week. When I called the chamber I was told to continue for a month. I did, and it did not settle. I went to another doctor who switched me to a different group of medicine and the pain stopped in four days. My sugar is the same as before, so I cannot say the first plan harmed me, but a month of pain was avoidable.',
        bn: 'নতুন ওষুধে প্রথম সপ্তাহ থেকেই পেটে ব্যথা শুরু হয়। চেম্বারে ফোন করলে বলা হয় এক মাস চালিয়ে যেতে। চালিয়েছি, কমেনি। পরে আরেকজন ডাক্তারের কাছে গেলে উনি অন্য গ্রুপের ওষুধ দেন এবং চার দিনে ব্যথা বন্ধ হয়। সুগার আগের মতোই আছে, তাই প্রথম পরিকল্পনা ক্ষতি করেছে বলব না, কিন্তু এক মাসের ব্যথা এড়ানো যেত।'
      },
      tags: [
        { g: 'condition', en: 'Type 2 diabetes', bn: 'টাইপ ২ ডায়াবেটিস' },
        { g: 'symptom', en: 'Stomach pain', bn: 'পেটে ব্যথা' }
      ]
    },
    {
      id: 'r5', doctorId: 'd1', conditionId: 'c3', sentiment: 'positive', outcome: 'helped',
      relationship: 'parent', identity: 'pseudo', author: { en: 'abba_of_two', bn: 'abba_of_two' },
      period: { en: 'April 2026', bn: 'এপ্রিল ২০২৬' }, posted: { en: 'Posted April 2026', bn: 'প্রকাশ এপ্রিল ২০২৬' },
      detailed: false, evidence: 0, likes: 15, dislikes: 1, comments: 1, claims: [],
      title: { en: 'Careful with dosage for a young patient', bn: 'অল্প বয়সী রোগীর ডোজ নিয়ে সতর্ক ছিলেন' },
      body: {
        en: 'My son is nineteen and was diagnosed with high pressure, which worried us a lot at that age. She started at the lowest dose and asked us to come back in two weeks rather than putting him straight on a full dose.',
        bn: 'আমার ছেলের বয়স উনিশ, উচ্চ রক্তচাপ ধরা পড়ায় আমরা খুব চিন্তিত ছিলাম। উনি সবচেয়ে কম ডোজ দিয়ে শুরু করলেন এবং পুরো ডোজ না দিয়ে দুই সপ্তাহ পর আবার আসতে বললেন।'
      },
      tags: [
        { g: 'condition', en: 'High blood pressure', bn: 'উচ্চ রক্তচাপ' }
      ]
    },
    {
      id: 'r6', doctorId: 'd2', conditionId: 'c3', sentiment: 'mixed', outcome: 'helped',
      relationship: 'self', identity: 'real', author: { en: 'Tanvir Ahmed', bn: 'তানভীর আহমেদ' },
      period: { en: 'February 2026', bn: 'ফেব্রুয়ারি ২০২৬' }, posted: { en: 'Posted March 2026', bn: 'প্রকাশ মার্চ ২০২৬' },
      detailed: true, evidence: 3, likes: 41, dislikes: 3, comments: 9, claims: ['wrongDx'],
      title: { en: 'Treated for pressure, turned out to be something else too', bn: 'প্রেসারের চিকিৎসা হলো, পরে দেখা গেল আরও কিছু আছে' },
      body: {
        en: 'I want to be careful here because I am not a doctor and I may be wrong about what happened.',
        bn: 'এখানে আমি সতর্ক থাকতে চাই, কারণ আমি ডাক্তার নই এবং কী হয়েছে সে বিষয়ে আমি ভুলও হতে পারি।'
      },
      timeline: [
        { k: 'symptoms', en: 'Chest tightness while climbing stairs, more over about three months. Some breathlessness at night.', bn: 'সিঁড়ি বেয়ে উঠতে বুকে চাপ, প্রায় তিন মাসে বেড়েছে। রাতে কিছুটা শ্বাসকষ্ট।' },
        { k: 'diagnosis', en: 'High blood pressure. ECG was done and I was told it was fine.', bn: 'উচ্চ রক্তচাপ। ইসিজি করা হয় এবং বলা হয় ঠিক আছে।' },
        { k: 'treatment', en: 'Two blood pressure medicines and advice to reduce salt. No further imaging at that visit.', bn: 'দুটি রক্তচাপের ওষুধ এবং লবণ কমানোর পরামর্শ। ওই ভিজিটে আর কোনো ইমেজিং হয়নি।' },
        { k: 'after', en: 'Pressure came down within a month, so that part worked. But the chest tightness stayed. Three months later a different hospital did an echo and found a valve problem, which is now being managed. I am recording this as my own experience — I do not know whether it could have been seen earlier.', bn: 'এক মাসের মধ্যে প্রেসার কমে যায়, তাই ওই অংশটা কাজ করেছে। কিন্তু বুকের চাপ থেকে যায়। তিন মাস পর অন্য একটি হাসপাতালে ইকো করে ভাল্‌ভের সমস্যা ধরা পড়ে, যার চিকিৎসা চলছে। আমি এটি আমার নিজের অভিজ্ঞতা হিসেবে লিখছি — আগে ধরা পড়ত কি না আমি জানি না।' }
      ],
      tags: [
        { g: 'condition', en: 'High blood pressure', bn: 'উচ্চ রক্তচাপ' },
        { g: 'symptom', en: 'Chest tightness', bn: 'বুকে চাপ' },
        { g: 'treatment', en: 'Echocardiogram', bn: 'ইকোকার্ডিওগ্রাম' }
      ]
    },
    {
      id: 'r7', doctorId: 'd2', conditionId: 'c3', sentiment: 'positive', outcome: 'helped',
      relationship: 'family', identity: 'pseudo', author: { en: 'ctg_reader', bn: 'ctg_reader' },
      period: { en: 'December 2025', bn: 'ডিসেম্বর ২০২৫' }, posted: { en: 'Posted January 2026', bn: 'প্রকাশ জানুয়ারি ২০২৬' },
      detailed: false, evidence: 0, likes: 19, dislikes: 2, comments: 4, claims: [],
      title: { en: 'Saw my father at 10 pm without extra charge', bn: 'রাত ১০টায় বাবাকে দেখেছেন, বাড়তি টাকা নেননি' },
      body: {
        en: 'We reached the chamber late because of traffic from Agrabad. He was the last one and still checked my father properly instead of hurrying us out.',
        bn: 'আগ্রাবাদ থেকে জ্যামের কারণে চেম্বারে পৌঁছাতে দেরি হয়েছিল। উনি শেষ রোগী হিসেবেও তাড়াহুড়ো না করে বাবাকে ঠিকমতো দেখেছেন।'
      },
      tags: [{ g: 'condition', en: 'High blood pressure', bn: 'উচ্চ রক্তচাপ' }]
    },
    {
      id: 'r8', doctorId: 'd3', conditionId: 'c4', sentiment: 'negative', outcome: 'worse',
      relationship: 'self', identity: 'anon', author: { en: 'Anonymous', bn: 'নাম প্রকাশ না করে' },
      period: { en: 'May 2026', bn: 'মে ২০২৬' }, posted: { en: 'Posted June 2026', bn: 'প্রকাশ জুন ২০২৬' },
      detailed: false, evidence: 1, likes: 27, dislikes: 5, comments: 14, claims: ['wrongRx'],
      title: { en: 'The cream made it spread', bn: 'ক্রিমে জিনিসটা ছড়িয়ে গেল' },
      body: {
        en: 'I was given a strong steroid cream for a patch on my arm without a skin scraping being done first. Within two weeks it had spread to both arms and the skin had thinned. A second dermatologist said it was a fungal infection and steroid was the wrong choice for it. This is my understanding of what I was told — I am putting it here as my own experience, not as a proven fact.',
        bn: 'হাতে একটা দাগের জন্য আগে কোনো স্কিন স্ক্র্যাপিং না করেই একটি স্ট্রং স্টেরয়েড ক্রিম দেওয়া হয়। দুই সপ্তাহের মধ্যে সেটি দুই হাতেই ছড়িয়ে যায় এবং চামড়া পাতলা হয়ে যায়। দ্বিতীয় একজন চর্মরোগ বিশেষজ্ঞ বলেন এটি ছত্রাক সংক্রমণ এবং এর জন্য স্টেরয়েড ভুল ছিল। আমাকে যা বলা হয়েছে এটি তারই আমার বোঝা — নিজের অভিজ্ঞতা হিসেবেই লিখছি, প্রমাণিত সত্য হিসেবে নয়।'
      },
      tags: [
        { g: 'condition', en: 'Fungal skin infection', bn: 'ছত্রাক সংক্রমণ' },
        { g: 'symptom', en: 'Spreading rash', bn: 'ছড়ানো র‍্যাশ' },
        { g: 'medicine', en: 'Topical steroid', bn: 'টপিক্যাল স্টেরয়েড' }
      ]
    },
    {
      id: 'r9', doctorId: 'd4', conditionId: 'c5', sentiment: 'positive', outcome: 'helped',
      relationship: 'self', identity: 'real', author: { en: 'Sultana Begum', bn: 'সুলতানা বেগম' },
      period: { en: 'October 2025', bn: 'অক্টোবর ২০২৫' }, posted: { en: 'Posted January 2026', bn: 'প্রকাশ জানুয়ারি ২০২৬' },
      detailed: false, evidence: 0, likes: 31, dislikes: 1, comments: 5, claims: [],
      title: { en: 'Physiotherapy first, surgery only if needed', bn: 'আগে ফিজিওথেরাপি, দরকার হলে তবেই অস্ত্রোপচার' },
      body: {
        en: 'I could not lift my arm to tie my hair for almost a year. Another clinic had already told me I would need an operation. He said to try twelve weeks of physiotherapy first and showed me the exercises himself. I did not need the operation.',
        bn: 'প্রায় এক বছর চুল বাঁধার জন্য হাত তুলতে পারতাম না। আরেকটি ক্লিনিক আগেই বলেছিল অপারেশন লাগবে। উনি বললেন আগে বারো সপ্তাহ ফিজিওথেরাপি করতে, এবং ব্যায়ামগুলো নিজে দেখিয়ে দিলেন। আমার অপারেশন লাগেনি।'
      },
      tags: [
        { g: 'condition', en: 'Frozen shoulder', bn: 'ফ্রোজেন শোল্ডার' },
        { g: 'treatment', en: 'Physiotherapy', bn: 'ফিজিওথেরাপি' }
      ]
    },
    {
      id: 'r10', doctorId: 'd4', conditionId: 'c5', sentiment: 'mixed', outcome: 'uncertain',
      relationship: 'witness', identity: 'pseudo', author: { en: 'sylhet_nm', bn: 'sylhet_nm' },
      period: { en: 'July 2026', bn: 'জুলাই ২০২৬' }, posted: { en: 'Posted August 2026', bn: 'প্রকাশ আগস্ট ২০২৬' },
      detailed: false, evidence: 0, likes: 6, dislikes: 0, comments: 0, claims: [],
      title: { en: 'Clear advice, but the chamber is chaotic', bn: 'পরামর্শ পরিষ্কার, কিন্তু চেম্বার এলোমেলো' },
      body: {
        en: 'I went with my neighbour and there was no proper serial system. People who came later went in first. The consultation itself was clear and unhurried once we got in.',
        bn: 'প্রতিবেশীর সঙ্গে গিয়েছিলাম, ঠিকমতো সিরিয়াল ব্যবস্থা ছিল না। পরে আসা লোক আগে ঢুকেছে। ভেতরে ঢোকার পর পরামর্শটা অবশ্য পরিষ্কার ও ধীরস্থির ছিল।'
      },
      tags: [{ g: 'condition', en: 'Frozen shoulder', bn: 'ফ্রোজেন শোল্ডার' }]
    },
    {
      id: 'r11', doctorId: 'd5', conditionId: 'c6', sentiment: 'positive', outcome: 'helped',
      relationship: 'self', identity: 'pseudo', author: { en: 'mirpur_11', bn: 'mirpur_11' },
      period: { en: 'June 2026', bn: 'জুন ২০২৬' }, posted: { en: 'Posted July 2026', bn: 'প্রকাশ জুলাই ২০২৬' },
      detailed: false, evidence: 0, likes: 12, dislikes: 0, comments: 2, claims: [],
      title: { en: 'Took the food diary seriously', bn: 'খাবারের ডায়েরিটা গুরুত্ব দিয়ে দেখেছেন' },
      body: {
        en: 'She asked me to keep a food diary for three weeks and actually read it line by line at the next visit. We found two triggers. No expensive endoscopy was pushed.',
        bn: 'উনি তিন সপ্তাহ খাবারের ডায়েরি রাখতে বলেছিলেন এবং পরের ভিজিটে সত্যিই লাইন ধরে ধরে পড়েছেন। দুটি ট্রিগার পাওয়া গেল। দামি এন্ডোস্কোপি চাপিয়ে দেননি।'
      },
      tags: [
        { g: 'condition', en: 'Irritable bowel syndrome', bn: 'আইবিএস' },
        { g: 'treatment', en: 'Elimination diet', bn: 'খাদ্য বাদ দেওয়ার পদ্ধতি' }
      ]
    },
    {
      id: 'r12', doctorId: 'd6', conditionId: 'c7', sentiment: 'mixed', outcome: 'helped',
      relationship: 'parent', identity: 'anon', author: { en: 'Anonymous', bn: 'নাম প্রকাশ না করে' },
      period: { en: 'August 2026', bn: 'আগস্ট ২০২৬' }, posted: { en: 'Posted August 2026', bn: 'প্রকাশ আগস্ট ২০২৬' },
      detailed: false, evidence: 0, likes: 4, dislikes: 0, comments: 1, claims: [],
      title: { en: 'Fever cleared, but we were not told about the injection cost', bn: 'জ্বর সেরেছে, তবে ইনজেকশনের খরচ জানানো হয়নি' },
      body: {
        en: 'My daughter’s typhoid was treated properly and she recovered in about ten days. The billing at the end was almost double what we expected because of injections nobody mentioned beforehand.',
        bn: 'আমার মেয়ের টাইফয়েডের চিকিৎসা ঠিকভাবেই হয়েছে, দশ দিনের মধ্যে সেরে উঠেছে। তবে শেষে বিল প্রায় দ্বিগুণ হয়েছে, কারণ ইনজেকশনের কথা কেউ আগে বলেনি।'
      },
      tags: [
        { g: 'condition', en: 'Typhoid fever', bn: 'টাইফয়েড জ্বর' },
        { g: 'symptom', en: 'Prolonged fever', bn: 'দীর্ঘস্থায়ী জ্বর' }
      ]
    }
  ];

  /* ---------------------------------------------------------------
   * Facilities. Their feedback is a separate world from doctor
   * feedback and must never feed a doctor's summaries — the data is
   * kept in its own collection so that separation is structural.
   * ------------------------------------------------------------- */
  var facilities = [
    {
      id: 'f1', type: 'hospital',
      name: { en: 'Shefa General Hospital', bn: 'শেফা জেনারেল হাসপাতাল' },
      branch: { en: 'Dhanmondi branch', bn: 'ধানমন্ডি শাখা' },
      parent: { en: 'Shefa Health Group', bn: 'শেফা হেলথ গ্রুপ' },
      city: { en: 'Dhaka', bn: 'ঢাকা' }, area: { en: 'Dhanmondi', bn: 'ধানমন্ডি' },
      provenance: { name: 'admin', branch: 'admin', address: 'community' },
      doctors: ['d1'], accent: 205
    },
    {
      id: 'f2', type: 'diagnostic',
      name: { en: 'Bandar Diagnostic Centre', bn: 'বন্দর ডায়াগনস্টিক সেন্টার' },
      branch: null, parent: null,
      city: { en: 'Chattogram', bn: 'চট্টগ্রাম' }, area: { en: 'Panchlaish', bn: 'পাঁচলাইশ' },
      provenance: { name: 'community', branch: 'community', address: 'community' },
      doctors: ['d2'], accent: 162
    },
    {
      id: 'f3', type: 'clinic',
      name: { en: 'Prottasha Clinic', bn: 'প্রত্যাশা ক্লিনিক' },
      branch: null, parent: null,
      city: { en: 'Sylhet', bn: 'সিলেট' }, area: { en: 'Zindabazar', bn: 'জিন্দাবাজার' },
      provenance: { name: 'admin', branch: 'community', address: 'admin' },
      doctors: ['d4'], accent: 32
    },
    {
      id: 'f4', type: 'hospital',
      name: { en: 'Shefa General Hospital', bn: 'শেফা জেনারেল হাসপাতাল' },
      branch: { en: 'Uttara branch', bn: 'উত্তরা শাখা' },
      parent: { en: 'Shefa Health Group', bn: 'শেফা হেলথ গ্রুপ' },
      city: { en: 'Dhaka', bn: 'ঢাকা' }, area: { en: 'Uttara', bn: 'উত্তরা' },
      provenance: { name: 'admin', branch: 'admin', address: 'community' },
      doctors: ['d3'], accent: 268
    },
    {
      id: 'f5', type: 'hospital',
      name: { en: 'Mirpur Care Hospital', bn: 'মিরপুর কেয়ার হাসপাতাল' },
      branch: null, parent: null,
      city: { en: 'Dhaka', bn: 'ঢাকা' }, area: { en: 'Mirpur', bn: 'মিরপুর' },
      provenance: { name: 'community', branch: 'community', address: 'community' },
      doctors: ['d5'], accent: 340
    }
  ];

  var CRITERIA = ['staff', 'waiting', 'cleanliness', 'billing', 'reportTime', 'reportTrust', 'admission', 'recommend', 'overall'];
  var CRIT_VALUES = ['good', 'mixed', 'poor'];

  /* A criterion left out reads "Not provided", never a zero. */
  var facilityReviews = [
    {
      id: 'fr1', facilityId: 'f1', identity: 'pseudo', author: { en: 'shirin_88', bn: 'shirin_88' },
      period: { en: 'March 2026', bn: 'মার্চ ২০২৬' }, posted: { en: 'Posted April 2026', bn: 'প্রকাশ এপ্রিল ২০২৬' },
      likes: 9, dislikes: 1,
      body: { en: 'Reception was calm even at 8 pm and the serial system actually worked. Billing was itemised without me asking. The waiting area on the second floor could be cleaner.', bn: 'রাত ৮টাতেও রিসেপশন শান্ত ছিল এবং সিরিয়াল ব্যবস্থা সত্যিই কাজ করেছে। না চাইতেই বিলের বিস্তারিত দিয়েছে। দোতলার অপেক্ষার জায়গাটা আরও পরিষ্কার হতে পারত।' },
      criteria: { staff: 'good', waiting: 'good', cleanliness: 'mixed', billing: 'good', reportTime: null, reportTrust: null, admission: null, recommend: 'good', overall: 'good' }
    },
    {
      id: 'fr2', facilityId: 'f1', identity: 'anon', author: { en: 'Anonymous', bn: 'নাম প্রকাশ না করে' },
      period: { en: 'January 2026', bn: 'জানুয়ারি ২০২৬' }, posted: { en: 'Posted January 2026', bn: 'প্রকাশ জানুয়ারি ২০২৬' },
      likes: 14, dislikes: 3,
      body: { en: 'Admission took four hours for a patient who was already in pain. Nobody explained what we were waiting for. The nursing staff on the ward were kind once we got there.', bn: 'ইতিমধ্যেই ব্যথায় থাকা একজন রোগীর ভর্তি হতে চার ঘণ্টা লেগেছে। আমরা কীসের জন্য অপেক্ষা করছি কেউ বলেনি। ওয়ার্ডে পৌঁছানোর পর নার্সরা যত্নশীল ছিলেন।' },
      criteria: { staff: 'good', waiting: 'poor', cleanliness: 'good', billing: 'mixed', reportTime: null, reportTrust: null, admission: 'poor', recommend: 'mixed', overall: 'mixed' }
    },
    {
      id: 'fr3', facilityId: 'f1', identity: 'real', author: { en: 'Kamrul Islam', bn: 'কামরুল ইসলাম' },
      period: { en: 'November 2025', bn: 'নভেম্বর ২০২৫' }, posted: { en: 'Posted December 2025', bn: 'প্রকাশ ডিসেম্বর ২০২৫' },
      likes: 6, dislikes: 0,
      body: { en: 'Straightforward visit. Cashier gave a printed breakdown and the figure matched what I was quoted on the phone.', bn: 'সহজ একটি ভিজিট। ক্যাশিয়ার ছাপানো হিসাব দিয়েছেন এবং ফোনে বলা টাকার সঙ্গে মিলেছে।' },
      criteria: { staff: 'good', waiting: 'mixed', cleanliness: 'good', billing: 'good', reportTime: null, reportTrust: null, admission: null, recommend: 'good', overall: 'good' }
    },
    {
      id: 'fr4', facilityId: 'f2', identity: 'real', author: { en: 'Tanvir Ahmed', bn: 'তানভীর আহমেদ' },
      period: { en: 'February 2026', bn: 'ফেব্রুয়ারি ২০২৬' }, posted: { en: 'Posted February 2026', bn: 'প্রকাশ ফেব্রুয়ারি ২০২৬' },
      likes: 21, dislikes: 2,
      body: { en: 'Reports were promised in 24 hours and came in 48, twice. When I took the same test elsewhere later the numbers were noticeably different, which worried me — but I am not qualified to say which one was right.', bn: 'রিপোর্ট ২৪ ঘণ্টায় দেওয়ার কথা বলে দুইবারই ৪৮ ঘণ্টায় দিয়েছে। পরে অন্য জায়গায় একই পরীক্ষা করালে সংখ্যাগুলো লক্ষণীয়ভাবে আলাদা এসেছে, যা আমাকে চিন্তায় ফেলেছে — তবে কোনটি ঠিক তা বলার যোগ্যতা আমার নেই।' },
      criteria: { staff: 'mixed', waiting: 'mixed', cleanliness: 'good', billing: 'good', reportTime: 'poor', reportTrust: 'poor', admission: null, recommend: 'poor', overall: 'poor' }
    },
    {
      id: 'fr5', facilityId: 'f2', identity: 'pseudo', author: { en: 'ctg_reader', bn: 'ctg_reader' },
      period: { en: 'December 2025', bn: 'ডিসেম্বর ২০২৫' }, posted: { en: 'Posted January 2026', bn: 'প্রকাশ জানুয়ারি ২০২৬' },
      likes: 4, dislikes: 1,
      body: { en: 'Cheap, quick, crowded. Got what I paid for.', bn: 'সস্তা, দ্রুত, ভিড়। যা টাকা দিয়েছি তাই পেয়েছি।' },
      criteria: { staff: 'mixed', waiting: 'poor', cleanliness: 'mixed', billing: 'good', reportTime: 'good', reportTrust: 'mixed', admission: null, recommend: 'mixed', overall: 'mixed' }
    },
    {
      id: 'fr6', facilityId: 'f3', identity: 'pseudo', author: { en: 'sylhet_nm', bn: 'sylhet_nm' },
      period: { en: 'July 2026', bn: 'জুলাই ২০২৬' }, posted: { en: 'Posted August 2026', bn: 'প্রকাশ আগস্ট ২০২৬' },
      likes: 7, dislikes: 0,
      body: { en: 'No proper serial system at all. People who came later went in first. Everything else was fine.', bn: 'ঠিকমতো সিরিয়াল ব্যবস্থা নেই। পরে আসা লোক আগে ঢুকেছে। বাকি সব ঠিক ছিল।' },
      criteria: { staff: 'mixed', waiting: 'poor', cleanliness: 'good', billing: 'good', reportTime: null, reportTrust: null, admission: null, recommend: 'mixed', overall: 'mixed' }
    },
    {
      id: 'fr7', facilityId: 'f4', identity: 'anon', author: { en: 'Anonymous', bn: 'নাম প্রকাশ না করে' },
      period: { en: 'May 2026', bn: 'মে ২০২৬' }, posted: { en: 'Posted June 2026', bn: 'প্রকাশ জুন ২০২৬' },
      likes: 3, dislikes: 0,
      body: { en: 'Newer building, much less crowded than the Dhanmondi one. Same group, very different experience.', bn: 'নতুন ভবন, ধানমন্ডিরটার চেয়ে অনেক কম ভিড়। একই গ্রুপ, কিন্তু অভিজ্ঞতা একেবারে আলাদা।' },
      criteria: { staff: 'good', waiting: 'good', cleanliness: 'good', billing: 'mixed', reportTime: null, reportTrust: null, admission: null, recommend: 'good', overall: 'good' }
    },
    {
      id: 'fr8', facilityId: 'f5', identity: 'pseudo', author: { en: 'mirpur_11', bn: 'mirpur_11' },
      period: { en: 'June 2026', bn: 'জুন ২০২৬' }, posted: { en: 'Posted July 2026', bn: 'প্রকাশ জুলাই ২০২৬' },
      likes: 5, dislikes: 0,
      body: { en: 'Small, clean, and the counter staff spoke to my mother directly instead of talking over her.', bn: 'ছোট, পরিচ্ছন্ন, এবং কাউন্টারের কর্মীরা মায়ের মাথার উপর দিয়ে কথা না বলে সরাসরি তাঁর সঙ্গেই কথা বলেছেন।' },
      criteria: { staff: 'good', waiting: 'good', cleanliness: 'good', billing: null, reportTime: null, reportTrust: null, admission: null, recommend: 'good', overall: 'good' }
    }
  ];

  /* ---------------------------------------------------------------
   * Follow-up chains, keyed by account. The newest entry is the
   * current reported status; older ones stay so the story reads in
   * order. Authors cannot promote an older update to "current".
   * ------------------------------------------------------------- */
  var followUps = {
    r1: [
      { date: { en: 'May 2026', bn: 'মে ২০২৬' }, en: 'Six weeks in. Fasting readings are sitting between 6 and 8 most mornings.', bn: 'ছয় সপ্তাহ হলো। বেশিরভাগ সকালে খালি পেটে রিডিং ৬ থেকে ৮-এর মধ্যে থাকছে।' },
      { date: { en: 'August 2026', bn: 'আগস্ট ২০২৬' }, en: 'Five months on, still stable. I have not needed to increase the insulin.', bn: 'পাঁচ মাস পরেও স্থিতিশীল। ইনসুলিন বাড়াতে হয়নি।' }
    ],
    r6: [
      { date: { en: 'May 2026', bn: 'মে ২০২৬' }, en: 'The valve problem is being managed with medication for now. No surgery planned.', bn: 'ভাল্‌ভের সমস্যাটি আপাতত ওষুধ দিয়ে নিয়ন্ত্রণে রাখা হচ্ছে। অস্ত্রোপচারের পরিকল্পনা নেই।' },
      { date: { en: 'August 2026', bn: 'আগস্ট ২০২৬' }, en: 'Adding this because someone asked: my blood pressure is still well controlled on the original two medicines. That part of the treatment worked.', bn: 'একজন জিজ্ঞেস করায় যোগ করছি: প্রথমে দেওয়া দুটি ওষুধেই আমার রক্তচাপ এখনো ভালো নিয়ন্ত্রণে। চিকিৎসার ওই অংশটা কাজ করেছে।' }
    ],
    r8: [
      { date: { en: 'July 2026', bn: 'জুলাই ২০২৬' }, en: 'Skin has settled after six weeks of the antifungal. The thinning on my forearms has not fully gone.', bn: 'ছয় সপ্তাহ অ্যান্টিফাংগাল খাওয়ার পর চামড়া ঠিক হয়েছে। হাতের চামড়া পাতলা হওয়াটা পুরোপুরি যায়নি।' }
    ]
  };

  /* Later or alternative care the author described themselves. Naming a
     provider here never creates a review for them. */
  var laterCare = {
    r6: { provider: { en: 'A cardiology department at another hospital', bn: 'অন্য একটি হাসপাতালের কার্ডিওলজি বিভাগ' },
          en: 'An echocardiogram three months later found a valve problem, which is now being managed.', bn: 'তিন মাস পর ইকোকার্ডিওগ্রামে ভাল্‌ভের সমস্যা ধরা পড়ে, যার চিকিৎসা চলছে।' },
    r8: { provider: { en: 'A second dermatologist', bn: 'দ্বিতীয় একজন চর্মরোগ বিশেষজ্ঞ' },
          en: 'Skin scraping was done and an antifungal was started instead of the steroid cream.', bn: 'স্কিন স্ক্র্যাপিং করা হয় এবং স্টেরয়েড ক্রিমের বদলে অ্যান্টিফাংগাল শুরু হয়।' },
    r4: { provider: { en: 'Another doctor at a different chamber', bn: 'অন্য চেম্বারের আরেকজন ডাক্তার' },
          en: 'Switched to a different group of medicine and the stomach pain stopped in four days.', bn: 'অন্য গ্রুপের ওষুধে বদলানো হয় এবং চার দিনে পেটে ব্যথা বন্ধ হয়।' }
  };

  /* ---------------------------------------------------------------
   * Discussion. Flat replies only in Phase 1. One thread carries a
   * claimed doctor taking part as an ordinary member, one an external
   * link, one a comment that trips the dangerous-instruction warning.
   * ------------------------------------------------------------- */
  var comments = [
    /* The demo user's own comments on r1, so comment edit/delete/tombstone
       (FR-COM-003, STORY-COM-001) is demonstrable on load. k8 has a reply
       (k9), so deleting it must leave a tombstone; k10 has none and is
       removed outright. */
    { id: 'k8', reviewId: 'r1', author: { en: 'shirin_88', bn: 'shirin_88' }, identity: 'pseudo',
      when: { en: 'June 2026', bn: 'জুন ২০২৬' }, likes: 3,
      body: { en: 'To be clear about my own case: the timing change was her suggestion, not mine, and she checked my readings for six weeks before we kept it.', bn: 'নিজের ক্ষেত্রে পরিষ্কার করে বলি: সময় বদলানোর পরামর্শ উনিই দিয়েছিলেন, আমি নই, এবং রাখার আগে ছয় সপ্তাহ আমার রিডিং দেখেছেন।' } },

    { id: 'k9', reviewId: 'r1', parentId: 'k8', author: { en: 'nadia_k', bn: 'nadia_k' }, identity: 'pseudo',
      when: { en: 'June 2026', bn: 'জুন ২০২৬' }, likes: 2,
      body: { en: 'Six weeks of checking is the part my own doctor skipped. Useful to know it can be done properly.', bn: 'ছয় সপ্তাহ ধরে দেখার অংশটাই আমার ডাক্তার বাদ দিয়েছিলেন। এটা ঠিকভাবে করা যায় জেনে ভালো লাগল।' } },

    { id: 'k10', reviewId: 'r1', author: { en: 'shirin_88', bn: 'shirin_88' }, identity: 'pseudo',
      when: { en: 'July 2026', bn: 'জুলাই ২০২৬' }, likes: 0,
      body: { en: 'Adding one thing I forgot: the clinic sent a reminder the day before each follow-up.', bn: 'একটা কথা ভুলে গিয়েছিলাম: প্রতিটি ফলো-আপের আগের দিন ক্লিনিক থেকে মনে করিয়ে দেওয়া হতো।' } },

    { id: 'k1', reviewId: 'r1', author: { en: 'rumana_h', bn: 'rumana_h' }, identity: 'pseudo',
      when: { en: 'May 2026', bn: 'মে ২০২৬' }, likes: 7,
      body: { en: 'The timing thing happened to me too. Nobody had ever asked when I took the tablet, only whether I took it.', bn: 'সময়ের ব্যাপারটা আমার সঙ্গেও হয়েছে। কেউ কখনো জিজ্ঞেস করেনি আমি কখন ট্যাবলেট খাই, শুধু খাই কি না তাই জিজ্ঞেস করেছে।' } },

    { id: 'k2', reviewId: 'r1', author: { en: 'Dr. Farhana Rahman', bn: 'ডা. ফারহানা রহমান' }, identity: 'real',
      providerFor: 'd1', when: { en: 'June 2026', bn: 'জুন ২০২৬' }, likes: 12,
      body: { en: 'Thank you for writing this up so carefully. I would only add for other readers that dose timing is not the answer for everyone — please do not change yours without asking whoever prescribes for you.', bn: 'এত যত্ন নিয়ে লেখার জন্য ধন্যবাদ। অন্য পাঠকদের জন্য শুধু যোগ করব, ডোজের সময় সবার ক্ষেত্রে সমাধান নয় — যিনি আপনাকে ওষুধ দেন তাঁকে জিজ্ঞেস না করে নিজেরটা বদলাবেন না।' } },

    { id: 'k3', reviewId: 'r1', author: { en: 'health_tips_bd', bn: 'health_tips_bd' }, identity: 'pseudo',
      when: { en: 'June 2026', bn: 'জুন ২০২৬' }, likes: 0, dislikes: 9,
      dangerous: true,
      body: { en: 'Anyone with sugar above 10 should just stop the tablets and take this herbal mix for two weeks instead, it cures completely.', bn: 'যাদের সুগার ১০-এর উপরে তারা ট্যাবলেট বন্ধ করে দুই সপ্তাহ এই হারবাল মিশ্রণ খেলেই সম্পূর্ণ সেরে যায়।' } },

    { id: 'k4', reviewId: 'r6', author: { en: 'shafiq_ctg', bn: 'shafiq_ctg' }, identity: 'pseudo',
      when: { en: 'March 2026', bn: 'মার্চ ২০২৬' }, likes: 5,
      link: 'https://example.org/heart-clinic-list',
      body: { en: 'There is a list of places that do echo in Chattogram here — I found it useful when I was looking.', bn: 'চট্টগ্রামে কোথায় ইকো করা হয় তার একটি তালিকা এখানে আছে — খোঁজার সময় আমার কাজে লেগেছিল।' } },

    { id: 'k5', reviewId: 'r6', author: { en: 'Anonymous', bn: 'নাম প্রকাশ না করে' }, identity: 'anon',
      when: { en: 'April 2026', bn: 'এপ্রিল ২০২৬' }, likes: 3,
      mentions: ['shafiq_ctg'],
      body: { en: '@shafiq_ctg thank you. Did they ask for a referral or can you just walk in?', bn: '@shafiq_ctg ধন্যবাদ। রেফারেল লাগে, নাকি সরাসরি যাওয়া যায়?' } },

    { id: 'k6', reviewId: 'r8', author: { en: 'nadia_k', bn: 'nadia_k' }, identity: 'pseudo',
      when: { en: 'June 2026', bn: 'জুন ২০২৬' }, likes: 11,
      body: { en: 'The same thing happened to my sister. Asking for a scraping before any cream is the part I wish we had known.', bn: 'আমার বোনের ক্ষেত্রেও একই ঘটনা হয়েছে। ক্রিম দেওয়ার আগে স্ক্র্যাপিং চাইতে হয় — এটাই আমরা আগে জানতাম না।' } },

    { id: 'k7', reviewId: 'r9', author: { en: 'sylhet_nm', bn: 'sylhet_nm' }, identity: 'pseudo',
      when: { en: 'February 2026', bn: 'ফেব্রুয়ারি ২০২৬' }, likes: 2,
      body: { en: 'Twelve weeks is a long time to keep going with exercises. Did the pain get worse before it got better?', bn: 'বারো সপ্তাহ ব্যায়াম চালিয়ে যাওয়া অনেক সময়। ভালো হওয়ার আগে ব্যথা কি বেড়েছিল?' } }
  ];

  /* ---------------------------------------------------------------
   * Evidence items. The public copy is the only thing a reader can
   * reach; the original is private and deleted on schedule.
   * ------------------------------------------------------------- */
  var evidence = [
    { id: 'e1', reviewId: 'r1', group: 'reviewed', state: 'ready', pages: 2,
      label: { en: 'Prescription, March 2026', bn: 'প্রেসক্রিপশন, মার্চ ২০২৬' } },
    { id: 'e2', reviewId: 'r1', group: 'outcome', state: 'ready', pages: 1,
      label: { en: 'HbA1c result, May 2026', bn: 'HbA1c ফলাফল, মে ২০২৬' } },
    { id: 'e3', reviewId: 'r6', group: 'reviewed', state: 'ready', pages: 1,
      label: { en: 'ECG report, February 2026', bn: 'ইসিজি রিপোর্ট, ফেব্রুয়ারি ২০২৬' } },
    { id: 'e4', reviewId: 'r6', group: 'later', state: 'ready', pages: 2,
      label: { en: 'Echo report from the second hospital', bn: 'দ্বিতীয় হাসপাতালের ইকো রিপোর্ট' } },
    { id: 'e5', reviewId: 'r6', group: 'outcome', state: 'failed', pages: 0,
      label: { en: 'Discharge summary', bn: 'ছাড়পত্রের সারাংশ' },
      failReason: { en: 'The file was password protected, so it could not be checked or converted.', bn: 'ফাইলটি পাসওয়ার্ড দিয়ে সুরক্ষিত ছিল, তাই যাচাই বা রূপান্তর করা যায়নি।' } },
    { id: 'e6', reviewId: 'r8', group: 'reviewed', state: 'ready', pages: 1,
      label: { en: 'Photograph of the prescription', bn: 'প্রেসক্রিপশনের ছবি' } },
    { id: 'e7', reviewId: 'r3', group: 'reviewed', state: 'ready', pages: 1,
      label: { en: 'Earlier test results I brought with me', bn: 'সঙ্গে নিয়ে যাওয়া আগের পরীক্ষার ফল' } }
  ];

  /* ---------------------------------------------------------------
   * The signed-in person, for "My contributions".
   * ------------------------------------------------------------- */
  var user = {
    username: 'shirin_88',
    display: { en: 'Shirin', bn: 'শিরিন' },
    joined: { en: 'Joined November 2025', bn: 'যোগ দিয়েছেন নভেম্বর ২০২৫' },
    published: ['r1'],
    drafts: [
      { id: 'dr1', expiresInDays: 22,
        doctorId: 'd5', conditionId: 'c6',
        title: { en: 'Untitled — started 14 August', bn: 'শিরোনামহীন — শুরু ১৪ আগস্ট' },
        excerpt: { en: 'I kept a food diary for three weeks and she actually read it line by line…', bn: 'তিন সপ্তাহ খাবারের ডায়েরি রেখেছিলাম এবং উনি সত্যিই লাইন ধরে পড়েছেন…' } },
      { id: 'dr2', expiresInDays: 4,
        doctorId: null, conditionId: null,
        title: { en: 'Untitled — waiting for a doctor profile', bn: 'শিরোনামহীন — ডাক্তার প্রোফাইলের অপেক্ষায়' },
        excerpt: { en: 'The doctor I want to write about is still being checked for duplicates.', bn: 'যে ডাক্তারকে নিয়ে লিখতে চাই তাঁর ডুপ্লিকেট যাচাই এখনো চলছে।' },
        blocked: true }
    ],
    bookmarks: ['r6', 'r9'],
    notifications: [
      { id: 'n1', kind: 'evidence', when: { en: '2 days ago', bn: '২ দিন আগে' }, unread: true,
        text: { en: 'Your HbA1c result finished processing and is now attached to your experience.', bn: 'আপনার HbA1c ফলাফলের প্রক্রিয়াকরণ শেষ হয়েছে এবং এটি এখন আপনার অভিজ্ঞতায় যুক্ত।' } },
      { id: 'n2', kind: 'discussion', when: { en: '5 days ago', bn: '৫ দিন আগে' }, unread: true,
        text: { en: 'Dr. Farhana Rahman commented on your experience. Claimed profiles take part like any other member.', bn: 'ডা. ফারহানা রহমান আপনার অভিজ্ঞতায় মন্তব্য করেছেন। দাবিকৃত প্রোফাইল অন্য সবার মতোই অংশ নেয়।' } },
      { id: 'n3', kind: 'moderation', when: { en: '1 week ago', bn: '১ সপ্তাহ আগে' }, unread: false,
        text: { en: 'A comment on your experience was hidden for giving dangerous medical instructions. Your experience was not affected.', bn: 'বিপজ্জনক চিকিৎসা নির্দেশনা দেওয়ার কারণে আপনার অভিজ্ঞতার একটি মন্তব্য লুকানো হয়েছে। আপনার অভিজ্ঞতায় কোনো প্রভাব পড়েনি।' } },
      { id: 'n4', kind: 'security', when: { en: '2 weeks ago', bn: '২ সপ্তাহ আগে' }, unread: false,
        text: { en: 'New sign-in from a device in Dhaka. If this was not you, change your password.', bn: 'ঢাকার একটি ডিভাইস থেকে নতুন সাইন-ইন। এটি আপনি না হলে পাসওয়ার্ড বদলান।' } },
      { id: 'n5', kind: 'draft', when: { en: '3 weeks ago', bn: '৩ সপ্তাহ আগে' }, unread: false,
        text: { en: 'A draft will be removed in 4 days if you do not finish it.', bn: 'একটি খসড়া শেষ না করলে ৪ দিনে মুছে যাবে।' } }
    ]
  };

  /* ---------------------------------------------------------------
   * Moderation. Cases carry only what a moderator is cleared to see;
   * reporter identity and original-evidence access are separate,
   * audited permissions and are represented that way here.
   * ------------------------------------------------------------- */
  var moderation = {
    permissions: { reports: true, contentActions: true, reporterIdentity: false, originalEvidence: false },
    thresholds: {
      fiveAccountHide: 5,
      criticalHours: 24,
      standardDays: 3,
      appealDays: 7,
      retentionDefaultDays: 90,
      retentionMaxDays: 3650
    },
    auditLog: [
      { id: 'a1', case: 'MOD-2041', action: 'warn',     actor: 'moderator:rashid', timeMin: 8,   targetId: 'k3' },
      { id: 'a2', case: 'MOD-2041', action: 'hide',     actor: 'system:auto',    timeMin: 22,  targetId: 'k3' },
      { id: 'a3', case: 'MOD-2041', action: 'record',   actor: 'moderator:rashid',timeMin: 35,  targetId: 'k3' },
      { id: 'a4', case: 'MOD-2038', action: 'hide',     actor: 'system:auto',    timeMin: 65,  targetId: 'e6' },
      { id: 'a5', case: 'MOD-2038', action: 'requestAccess', actor: 'moderator:nadia',timeMin: 80,  targetId: 'e6' },
      { id: 'a6', case: 'MOD-2033', action: 'review',   actor: 'moderator:nadia',timeMin: 120, targetId: 'r8' },
      { id: 'a7', case: 'MOD-2033', action: 'note',     actor: 'moderator:nadia',timeMin: 150, targetId: 'r8' },
      { id: 'a8', case: 'MOD-2029', action: 'review',   actor: 'moderator:rashid',timeMin: 240, targetId: 'd3' },
      { id: 'a9', case: 'MOD-2029', action: 'none',     actor: 'moderator:rashid',timeMin: 280, targetId: 'd3' },
      { id: 'a10', case: 'MOD-2011', action: 'appeal',  actor: 'author:r4',      timeMin: 180, targetId: 'r4' },
      { id: 'a11', case: 'MOD-2011', action: 'freshReview', actor: 'moderator:tabassum',timeMin: 350, targetId: 'r4' },
      { id: 'a12', case: 'MOD-2011', action: 'note',    actor: 'moderator:tabassum',timeMin: 410, targetId: 'r4' },
      { id: 'a13', case: 'MOD-2041', action: 'reopen',  actor: 'moderator:rashid',timeMin: 720, targetId: 'k3' }
    ],
    notifications: [
      { id: 'nA1', kind: 'newReport', when: { en: '12 minutes ago', bn: '১২ মিনিট আগে' },
        target: { en: 'MOD-2041', bn: 'MOD-2041' },
        text: { en: 'New report filed against k3 (dangerous + spam).', bn: 'k3 এর বিরুদ্ধে নতুন রিপোর্ট (বিপজ্জনক + স্প্যাম)।' } },
      { id: 'nA2', kind: 'evidence', when: { en: '42 minutes ago', bn: '৪২ মিনিট আগে' },
        target: { en: 'Q-891', bn: 'Q-891' },
        text: { en: 'Prescription scan finished redacting and is awaiting author confirmation.', bn: 'প্রেসক্রিপশন স্ক্যানের ঢাকা শেষ; লেখকের সম্মতি অপেক্ষমাণ।' } },
      { id: 'nA3', kind: 'claim', when: { en: '1 hour ago', bn: '১ ঘণ্টা আগে' },
        target: { en: 'Dr. Farhana Rahman', bn: 'ডা. ফারহানা রহমান' },
        text: { en: 'A doctor submitted a claim for this profile.', bn: 'এই প্রোফাইলের জন্য একজন ডাক্তার দাবি জমা দিয়েছেন।' } },
      { id: 'nA4', kind: 'protectedChange', when: { en: '3 hours ago', bn: '৩ ঘণ্টা আগে' },
        target: { en: 'Dr. Farhana Rahman', bn: 'ডা. ফারহানা রহমান' },
        text: { en: 'Community edit to specialty is awaiting approval.', bn: 'বিশেষত্বের সম্প্রদায়-সম্পাদনা অনুমোদনের অপেক্ষায়।' } },
      { id: 'nA5', kind: 'identityReveal', when: { en: '5 hours ago', bn: '৫ ঘণ্টা আগে' },
        target: { en: 'MOD-2033', bn: 'MOD-2033' },
        text: { en: 'A Super Admin has been asked to reveal reporter identity for review.', bn: 'পর্যালোচনার জন্য একজন সুপার অ্যাডমিনকে রিপোর্টকারীর পরিচয় প্রকাশ করতে বলা হয়েছে।' } },
      { id: 'nA6', kind: 'security', when: { en: 'yesterday', bn: 'গতকাল' },
        target: { en: 'admin:rashid', bn: 'admin:rashid' },
        text: { en: 'Three bulk actions in five minutes — confirm this was you.', bn: 'পাঁচ মিনিটে তিনটি গণ পদক্ষেপ — এটি আপনিই কিনা নিশ্চিত করুন।' } }
    ],
    cases: [
      { id: 'MOD-2041', lane: 'critical', ageHours: 3, reports: 2, autoHidden: true,
        targetKind: 'comment', targetId: 'k3', reviewId: 'r1',
        reasons: ['dangerous', 'spam'],
        summary: { en: 'Comment tells readers to stop prescribed tablets and use a herbal mix instead.', bn: 'মন্তব্যে পাঠকদের নির্ধারিত ট্যাবলেট বন্ধ করে হারবাল মিশ্রণ খেতে বলা হয়েছে।' },
        note: { en: 'Dangerous instruction. Default policy keeps it visible with a strong warning and priority review; it was hidden here because the experience also matched spam signals.', bn: 'বিপজ্জনক নির্দেশনা। ডিফল্ট নীতিতে এটি কড়া সতর্কতাসহ দৃশ্যমান থাকে ও অগ্রাধিকারে দেখা হয়; এখানে স্প্যামের লক্ষণ মেলায় লুকানো হয়েছে।' } },

      { id: 'MOD-2038', lane: 'critical', ageHours: 9, reports: 1, autoHidden: true,
        targetKind: 'evidence', targetId: 'e6', reviewId: 'r8',
        reasons: ['privacy'],
        summary: { en: 'Uploaded prescription photo appears to show a second patient’s name and phone number in the margin.', bn: 'আপলোড করা প্রেসক্রিপশনের ছবিতে পাশে আরেক রোগীর নাম ও ফোন নম্বর দেখা যাচ্ছে।' },
        note: { en: 'Confirmed personal-data leaks are hidden on first credible report, target under 15 minutes from detection.', bn: 'নিশ্চিত ব্যক্তিগত তথ্য ফাঁস প্রথম বিশ্বাসযোগ্য রিপোর্টেই লুকানো হয়, শনাক্তের ১৫ মিনিটের মধ্যে।' } },

      { id: 'MOD-2033', lane: 'standard', ageHours: 41, reports: 6, autoHidden: false, coordinated: true,
        targetKind: 'account', targetId: 'r8', reviewId: 'r8',
        reasons: ['factual', 'factual', 'impersonation'],
        summary: { en: 'Author says a steroid cream was the wrong choice. Six reports disagree with the experience.', bn: 'লেখক বলছেন স্টেরয়েড ক্রিম ভুল ছিল। ছয়টি রিপোর্ট অভিজ্ঞতাটির সঙ্গে দ্বিমত।' },
        note: { en: 'A factual disagreement is not grounds for removal. It stays public while under review. Five of the six reporting experiences were created in the same week.', bn: 'বিষয়গত দ্বিমত সরানোর কারণ নয়। পর্যালোচনার সময়ও এটি প্রকাশ্য থাকে। ছয়টির মধ্যে পাঁচটি রিপোর্টকারী অ্যাকাউন্ট একই সপ্তাহে তৈরি।' } },

      { id: 'MOD-2029', lane: 'standard', ageHours: 62, reports: 1, autoHidden: false,
        targetKind: 'profile', targetId: 'd3',
        reasons: ['impersonation'],
        summary: { en: 'Report says the listed qualifications do not match the doctor named.', bn: 'রিপোর্টে বলা হয়েছে তালিকাভুক্ত যোগ্যতা উল্লিখিত ডাক্তারের সঙ্গে মেলে না।' },
        note: { en: 'Profile facts are community submitted. Correcting them is a profile action, not a content action.', bn: 'প্রোফাইলের তথ্য সম্প্রদায়ের জমা দেওয়া। এগুলো সংশোধন প্রোফাইল-সংক্রান্ত পদক্ষেপ, কনটেন্ট-সংক্রান্ত নয়।' } },

      { id: 'MOD-2011', lane: 'appeal', ageHours: 96, reports: 0, autoHidden: false,
        targetKind: 'account', targetId: 'r4', reviewId: 'r4',
        reasons: [],
        appealText: { en: 'My experience was hidden for naming a medicine. I only described what I was actually given and what happened to me. I did not tell anyone else what to take.', bn: 'ওষুধের নাম লেখার কারণে আমার অভিজ্ঞতা লুকানো হয়েছে। আমি শুধু আমাকে যা দেওয়া হয়েছিল এবং আমার যা হয়েছে তাই লিখেছি। কাউকে কিছু খেতে বলিনি।' },
        summary: { en: 'Author appeals a temporary hide.', bn: 'লেখক সাময়িক লুকানোর বিরুদ্ধে আপিল করেছেন।' },
        note: { en: 'Appeals get a fresh review by someone who did not take the original decision, and a newly written reason.', bn: 'আপিল নতুন করে দেখেন এমন কেউ যিনি আগের সিদ্ধান্ত নেননি, এবং নতুন করে কারণ লেখা হয়।' } }
    ],

    quarantine: [
      { id: 'Q-882', file: 'IMG_2291.heic', size: '4.1 MB', reviewId: 'r1', stage: 'published',
        stages: { received: 'ok', validated: 'ok', scanned: 'ok', converted: 'ok', rasterised: 'ok', redacted: 'ok', published: 'ok' },
        note: { en: 'Metadata stripped, re-encoded, redaction flattened into the page.', bn: 'মেটাডেটা সরানো, পুনরায় এনকোড করা, ঢাকা অংশ পাতায় স্থায়ী করা হয়েছে।' } },
      { id: 'Q-884', file: 'discharge.docx', size: '820 KB', reviewId: 'r6', stage: 'validated', failed: true,
        stages: { received: 'ok', validated: 'fail', scanned: '-', converted: '-', rasterised: '-', redacted: '-', published: '-' },
        note: { en: 'Password protected. Encrypted documents are rejected because they cannot be scanned or sanitised.', bn: 'পাসওয়ার্ড দিয়ে সুরক্ষিত। এনক্রিপ্টেড নথি স্ক্যান বা নিরাপদ করা যায় না বলে বাতিল।' } },
      { id: 'Q-887', file: 'report_scan.pdf', size: '2.3 MB', reviewId: 'r3', stage: 'scanned', failClosed: true,
        stages: { received: 'ok', validated: 'ok', scanned: 'hold', converted: '-', rasterised: '-', redacted: '-', published: '-' },
        note: { en: 'Scanner was unreachable. Held rather than published — we never assume a file is probably fine.', bn: 'স্ক্যানারে পৌঁছানো যায়নি। প্রকাশ না করে আটকে রাখা হয়েছে — আমরা কখনো ধরে নিই না যে ফাইলটি সম্ভবত ঠিক আছে।' } },
      { id: 'Q-891', file: 'prescription.jpg', size: '1.6 MB', reviewId: 'r8', stage: 'redacted', waiting: true,
        stages: { received: 'ok', validated: 'ok', scanned: 'ok', converted: 'ok', rasterised: 'ok', redacted: 'wait', published: '-' },
        note: { en: 'Author has been asked to cover a second patient’s name before this can become public.', bn: 'প্রকাশের আগে আরেক রোগীর নাম ঢাকতে লেখককে বলা হয়েছে।' } }
    ],

    providers: {
      pending: [
        { id: 'P-140', name: { en: 'Dr. Imtiaz Kabir', bn: 'ডা. ইমতিয়াজ কবির' },
          specialty: { en: 'Cardiology', bn: 'কার্ডিওলজি' }, city: { en: 'Chattogram', bn: 'চট্টগ্রাম' },
          bmdc: 'A-38054', submittedBy: 'community',
          duplicateOf: 'd2',
          note: { en: 'Same BMDC number as an existing profile. Merge rather than approve.', bn: 'বিদ্যমান প্রোফাইলের সঙ্গে একই বিএমডিসি নম্বর। অনুমোদন না করে মিলিয়ে দিন।' } },
        { id: 'P-143', name: { en: 'Dr. Anwara Khatun', bn: 'ডা. আনোয়ারা খাতুন' },
          specialty: { en: 'Paediatrics', bn: 'শিশুরোগ' }, city: { en: 'Rajshahi', bn: 'রাজশাহী' },
          bmdc: 'A-55120', submittedBy: 'community', duplicateOf: null,
          note: { en: 'No duplicate found and nothing abusive in the submission.', bn: 'কোনো ডুপ্লিকেট পাওয়া যায়নি এবং জমায় আপত্তিকর কিছু নেই।' } }
      ],
      claims: [
        { id: 'C-58', doctorId: 'd5', method: { en: 'Verified through the chamber phone number listed publicly', bn: 'প্রকাশ্যে দেওয়া চেম্বারের ফোন নম্বর দিয়ে যাচাই' },
          note: { en: 'Claiming is independent of BMDC verification and grants no control over patient experiences.', bn: 'দাবি করা বিএমডিসি যাচাই থেকে আলাদা এবং রোগীদের অভিজ্ঞতায় কোনো নিয়ন্ত্রণ দেয় না।' } }
      ],
      fieldChanges: [
        { id: 'F-77', doctorId: 'd1', field: { en: 'Specialty', bn: 'বিশেষত্ব' },
          from: { en: 'Endocrinology', bn: 'এন্ডোক্রিনোলজি' },
          to: { en: 'Endocrinology and Diabetology', bn: 'এন্ডোক্রিনোলজি ও ডায়াবেটোলজি' },
          protected: true },
        { id: 'F-78', doctorId: 'd1', field: { en: 'Chamber hours', bn: 'চেম্বারের সময়' },
          from: { en: 'Sat–Wed, 6–9 pm', bn: 'শনি–বুধ, সন্ধ্যা ৬–৯টা' },
          to: { en: 'Sat–Wed, 5–9 pm', bn: 'শনি–বুধ, বিকাল ৫–রাত ৯টা' },
          protected: false }
      ]
    }
  };

  /* ---------------------------------------------------------------
   * Helpers shared by every concept
   * ------------------------------------------------------------- */
  var SENTIMENTS = ['positive', 'mixed', 'negative'];
  var OUTCOMES = ['helped', 'none', 'worse', 'uncertain'];

  function t(key, lang) {
    var s = strings[key];
    if (!s) { return key; }
    return s[lang] || s.en;
  }

  function pick(field, lang) {
    if (field === null || field === undefined) { return ''; }
    if (typeof field === 'string') { return field; }
    return field[lang] || field.en || '';
  }

  function reviewsFor(doctorId, conditionId) {
    return reviews.filter(function (r) {
      if (r.doctorId !== doctorId) { return false; }
      if (conditionId && r.conditionId !== conditionId) { return false; }
      return true;
    });
  }

  /* Distributions always carry the denominator. A percentage without its
     count is exactly the kind of number this product refuses to publish. */
  function distribution(list, keys, prop) {
    var counts = {};
    keys.forEach(function (k) { counts[k] = 0; });
    var total = 0;
    list.forEach(function (r) {
      var v = r[prop];
      if (v && counts.hasOwnProperty(v)) { counts[v] += 1; total += 1; }
    });
    return {
      counts: counts,
      total: total,
      limited: total > 0 && total < config.limitedDataThreshold,
      empty: total === 0,
      pct: function (k) { return total ? Math.round((counts[k] / total) * 100) : 0; }
    };
  }

  function sentimentOf(list) { return distribution(list, SENTIMENTS, 'sentiment'); }
  function outcomeOf(list) { return distribution(list, OUTCOMES, 'outcome'); }

  function conditionsFor(doctorId) {
    var seen = {};
    reviewsFor(doctorId).forEach(function (r) { seen[r.conditionId] = (seen[r.conditionId] || 0) + 1; });
    return Object.keys(seen).map(function (id) {
      return { condition: conditions.filter(function (c) { return c.id === id; })[0], count: seen[id] };
    }).sort(function (a, b) { return b.count - a.count; });
  }

  function evidenceCount(doctorId) {
    return reviewsFor(doctorId).reduce(function (n, r) { return n + (r.evidence || 0); }, 0);
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h;
  }

  /* Deterministic generative avatar. Never a photograph, never a face —
     a stable geometric mark derived from the name, so the same doctor
     always looks the same without inventing a likeness of a real person. */
  function avatar(seedText, hue, size) {
    var h = hash(seedText);
    var s = size || 96;
    var rings = 3 + (h % 3);
    var parts = '';
    for (var i = 0; i < rings; i++) {
      var r = (s / 2) * (1 - i / (rings + 0.6));
      var rot = ((h >> (i * 3)) % 360);
      var dash = 6 + ((h >> (i * 5)) % 22);
      var op = 0.85 - i * 0.18;
      parts += '<circle cx="' + (s / 2) + '" cy="' + (s / 2) + '" r="' + r.toFixed(1) + '"' +
        ' fill="none" stroke="hsl(' + ((hue + i * 24) % 360) + ' 70% 58%)" stroke-opacity="' + op.toFixed(2) + '"' +
        ' stroke-width="' + (2 + (i % 2)) + '" stroke-dasharray="' + dash + ' ' + (dash / 1.7).toFixed(1) + '"' +
        ' transform="rotate(' + rot + ' ' + (s / 2) + ' ' + (s / 2) + ')"/>';
    }
    var dots = 4 + (h % 5);
    for (var j = 0; j < dots; j++) {
      var a = (j / dots) * Math.PI * 2 + (h % 100) / 100;
      var rr = s * 0.30;
      parts += '<circle cx="' + (s / 2 + Math.cos(a) * rr).toFixed(1) + '" cy="' + (s / 2 + Math.sin(a) * rr).toFixed(1) +
        '" r="' + (1.6 + (j % 3) * 0.9).toFixed(1) + '" fill="hsl(' + ((hue + 40) % 360) + ' 80% 66%)"/>';
    }
    return '<svg viewBox="0 0 ' + s + ' ' + s + '" width="100%" height="100%" role="img" aria-hidden="true" focusable="false">' +
      '<circle cx="' + (s / 2) + '" cy="' + (s / 2) + '" r="' + (s / 2 - 1) + '" fill="hsl(' + hue + ' 45% 12% / 0.55)"/>' +
      parts + '</svg>';
  }

  /* Fuzzy / alias / Banglish resolution for the search demo. */
  // STORY-SRCH-001: query normalization resolver for Bengali/English/Banglish
  function resolveQuery(q) {
    var raw = (q || '').trim();
    if (!raw) { return { raw: raw, condition: null, matched: null }; }
    var low = raw.toLowerCase();
    for (var i = 0; i < conditions.length; i++) {
      var c = conditions[i];
      var pool = [c.name.en.toLowerCase(), c.name.bn].concat(c.aliases);
      for (var j = 0; j < pool.length; j++) {
        var cand = String(pool[j]).toLowerCase();
        if (cand.indexOf(low) === 0 || low.indexOf(cand) === 0 || cand === low) {
          return { raw: raw, condition: c, matched: pool[j] };
        }
      }
    }
    return { raw: raw, condition: null, matched: null };
  }

  function search(q, filters) {
    var f = filters || {};
    var resolved = resolveQuery(q);
    var list = doctors.slice();

    if (resolved.condition) {
      list = list.filter(function (d) {
        return reviewsFor(d.id).some(function (r) { return r.conditionId === resolved.condition.id; });
      });
    } else if (q && q.trim()) {
      var low = q.trim().toLowerCase();
      list = list.filter(function (d) {
        return (d.name.en + ' ' + d.name.bn + ' ' + d.specialty.en + ' ' + d.specialty.bn + ' ' + d.city.en + ' ' + d.area.en)
          .toLowerCase().indexOf(low) !== -1;
      });
    }

    if (f.specialty) { list = list.filter(function (d) { return d.specialty.en === f.specialty; }); }
    if (f.city) { list = list.filter(function (d) { return d.city.en === f.city; }); }
    if (f.gender) { list = list.filter(function (d) { return d.gender === f.gender; }); }
    if (f.sentiment) {
      list = list.filter(function (d) {
        return reviewsFor(d.id).some(function (r) { return r.sentiment === f.sentiment; });
      });
    }
    if (f.outcome) {
      list = list.filter(function (d) {
        return reviewsFor(d.id).some(function (r) { return r.outcome === f.outcome; });
      });
    }
    if (f.evidence) { list = list.filter(function (d) { return evidenceCount(d.id) > 0; }); }

    /* Ordering is neutral by construction. There is no branch here that
       looks at sentiment, outcome, likes or evidence — by design. */
    var order = f.sort || 'relevance';
    if (order === 'volume') {
      list.sort(function (a, b) { return reviewsFor(b.id).length - reviewsFor(a.id).length; });
    } else if (order === 'recent') {
      list.sort(function (a, b) {
        var la = reviewsFor(a.id), lb = reviewsFor(b.id);
        return (lb.length ? lb[lb.length - 1].id : '') < (la.length ? la[la.length - 1].id : '') ? -1 : 1;
      });
    }
    return { resolved: resolved, doctors: list };
  }

  /* Bind a language to the DOM: swaps [data-i18n] text and toggles
     [data-en]/[data-bn] content pairs. */
  function applyLang(root, lang) {
    var scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var attr = el.getAttribute('data-i18n-attr');
      var value = t(key, lang);
      if (attr) { el.setAttribute(attr, value); } else { el.textContent = value; }
    });
    scope.querySelectorAll('[data-en][data-bn]').forEach(function (el) {
      el.textContent = lang === 'bn' ? el.getAttribute('data-bn') : el.getAttribute('data-en');
    });
    document.documentElement.setAttribute('lang', lang === 'bn' ? 'bn' : 'en');
    document.documentElement.setAttribute('data-lang', lang);
  }

  /* ---- lookups for the fuller screen set ---- */

  var EVIDENCE_GROUPS = ['reviewed', 'later', 'outcome'];

  function reviewById(id) { return reviews.filter(function (r) { return r.id === id; })[0]; }
  function facilityById(id) { return facilities.filter(function (f) { return f.id === id; })[0]; }

  function facilityReviewsFor(facilityId) {
    return facilityReviews.filter(function (r) { return r.facilityId === facilityId; });
  }

  /* Facility criteria are counted only within facility feedback. There is
     deliberately no path from this function to a doctor's summaries. */
  function criteriaDist(list, key) {
    var counts = { good: 0, mixed: 0, poor: 0 };
    var total = 0;
    list.forEach(function (r) {
      var v = r.criteria && r.criteria[key];
      if (v && counts.hasOwnProperty(v)) { counts[v] += 1; total += 1; }
    });
    return {
      counts: counts, total: total,
      empty: total === 0,
      limited: total > 0 && total < config.limitedDataThreshold,
      pct: function (k) { return total ? Math.round((counts[k] / total) * 100) : 0; }
    };
  }

  function facilitiesForDoctor(doctorId) {
    return facilities.filter(function (f) { return f.doctors.indexOf(doctorId) !== -1; });
  }
  function doctorsForFacility(facilityId) {
    var f = facilityById(facilityId);
    return f ? f.doctors.map(function (id) { return doctorById(id); }).filter(Boolean) : [];
  }
  function branchesOf(facilityId) {
    var f = facilityById(facilityId);
    if (!f || !f.parent) { return []; }
    return facilities.filter(function (o) { return o.parent && o.parent.en === f.parent.en; });
  }

  function commentsFor(reviewId) {
    return comments.filter(function (c) { return c.reviewId === reviewId; });
  }

  function evidenceFor(reviewId, group) {
    return evidence.filter(function (e) {
      return e.reviewId === reviewId && (!group || e.group === group);
    });
  }

  /* Normalises the two shapes: a single legacy follow-up, or a chain. */
  function followUpsFor(reviewId) {
    if (followUps[reviewId]) { return followUps[reviewId]; }
    var r = reviewById(reviewId);
    return (r && r.followUp) ? [r.followUp] : [];
  }

  function laterCareFor(reviewId) { return laterCare[reviewId] || null; }

  function relatedByCondition(conditionId, excludeReviewId) {
    return reviews.filter(function (r) {
      return r.conditionId === conditionId && r.id !== excludeReviewId;
    });
  }

  /* Anonymous experiences are never linked to each other, even though they
     share a stable alias behind the scenes. */
  function accountsByAuthor(review) {
    if (!review || review.identity === 'anon') { return []; }
    return reviews.filter(function (r) {
      return r.id !== review.id && r.identity !== 'anon' && r.author.en === review.author.en;
    });
  }

  function conditionAccounts(conditionId) {
    return reviews.filter(function (r) { return r.conditionId === conditionId; });
  }

  function doctorsForCondition(conditionId) {
    var seen = {};
    conditionAccounts(conditionId).forEach(function (r) { seen[r.doctorId] = (seen[r.doctorId] || 0) + 1; });
    return Object.keys(seen).map(function (id) { return { doctor: doctorById(id), count: seen[id] }; });
  }

  /* Counted from what authors actually wrote. Frequency is not a
     recommendation and is never presented as one. */
  function tagFrequency(conditionId, group) {
    var pool = conditionId ? conditionAccounts(conditionId) : reviews;
    var seen = {};
    pool.forEach(function (r) {
      r.tags.forEach(function (t) {
        if (group && t.g !== group) { return; }
        var key = t.en;
        if (!seen[key]) { seen[key] = { tag: t, count: 0 }; }
        seen[key].count += 1;
      });
    });
    return Object.keys(seen).map(function (k) { return seen[k]; })
      .sort(function (a, b) { return b.count - a.count; });
  }

  function searchFacilities(q, filters) {
    var f = filters || {};
    var list = facilities.slice();
    if (q && q.trim()) {
      var low = q.trim().toLowerCase();
      list = list.filter(function (x) {
        return (x.name.en + ' ' + x.name.bn + ' ' + x.city.en + ' ' + x.area.en).toLowerCase().indexOf(low) !== -1;
      });
    }
    if (f.city) { list = list.filter(function (x) { return x.city.en === f.city; }); }
    if (f.facilityType) { list = list.filter(function (x) { return x.type === f.facilityType; }); }
    if (f.sort === 'volume') {
      list.sort(function (a, b) { return facilityReviewsFor(b.id).length - facilityReviewsFor(a.id).length; });
    }
    return list;
  }

  function doctorById(id) { return doctors.filter(function (d) { return d.id === id; })[0]; }

  global.RK = {
    config: config,
    strings: strings,
    facilities: facilities,
    facilityReviews: facilityReviews,
    comments: comments,
    evidence: evidence,
    followUps: followUps,
    laterCare: laterCare,
    user: user,
    moderation: moderation,
    CRITERIA: CRITERIA,
    CRIT_VALUES: CRIT_VALUES,
    EVIDENCE_GROUPS: EVIDENCE_GROUPS,
    reviewById: reviewById,
    facilityById: facilityById,
    facilityReviewsFor: facilityReviewsFor,
    criteriaDist: criteriaDist,
    facilitiesForDoctor: facilitiesForDoctor,
    doctorsForFacility: doctorsForFacility,
    branchesOf: branchesOf,
    commentsFor: commentsFor,
    evidenceFor: evidenceFor,
    followUpsFor: followUpsFor,
    laterCareFor: laterCareFor,
    relatedByCondition: relatedByCondition,
    accountsByAuthor: accountsByAuthor,
    conditionAccounts: conditionAccounts,
    doctorsForCondition: doctorsForCondition,
    tagFrequency: tagFrequency,
    searchFacilities: searchFacilities,
    doctors: doctors,
    conditions: conditions,
    reviews: reviews,
    SENTIMENTS: SENTIMENTS,
    OUTCOMES: OUTCOMES,
    t: t,
    pick: pick,
    reviewsFor: reviewsFor,
    sentimentOf: sentimentOf,
    outcomeOf: outcomeOf,
    conditionsFor: conditionsFor,
    evidenceCount: evidenceCount,
    conditionById: function (id) { return conditions.filter(function (c) { return c.id === id; })[0]; },
    doctorById: function (id) { return doctors.filter(function (d) { return d.id === id; })[0]; },
    hash: hash,
    avatar: avatar,
    resolveQuery: resolveQuery,
    search: search,
    applyLang: applyLang
  };
})(window);
