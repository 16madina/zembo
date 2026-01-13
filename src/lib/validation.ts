// List of disposable/temporary email domains to block
const DISPOSABLE_EMAIL_DOMAINS = [
  // Popular disposable email services
  "tempmail.com", "temp-mail.org", "tempmail.net", "tempmail.io",
  "guerrillamail.com", "guerrillamail.org", "guerrillamail.net", "guerrillamail.biz", "guerrillamailblock.com",
  "yopmail.com", "yopmail.fr", "yopmail.net",
  "10minutemail.com", "10minutemail.net", "10minutemail.org", "10minemail.com",
  "mailinator.com", "mailinator.net", "mailinator.org", "mailinator2.com",
  "throwawaymail.com", "throwaway.email",
  "dispostable.com", "disposableemailaddresses.com", "disposable-email.ml",
  "trashmail.com", "trashmail.net", "trashmail.org", "trash-mail.com",
  "getairmail.com", "getnada.com", "nada.email",
  "fakeinbox.com", "fakemailgenerator.com",
  "sharklasers.com", "spam4.me", "spamgourmet.com",
  "emailondeck.com", "emailfake.com",
  "mohmal.com", "mohmal.im",
  "maildrop.cc", "mailnesia.com",
  "tempr.email", "tempinbox.com", "temp.email",
  "burnermail.io", "burnerfm.com",
  "mintemail.com", "mintmail.org",
  "discard.email", "discardmail.com",
  "spambox.us", "mytrashmail.com",
  "incognitomail.com", "incognitomail.org",
  "jetable.org", "jetable.net",
  "anonymbox.com", "anon-mail.de",
  "crazymailing.com", "crazy-mail.net",
  "dropmail.me", "einrot.com",
  "fakemailgenerator.net", "fastacura.com",
  "filzmail.com", "flyspam.com",
  "guerilla-mail.net", "haltospam.com",
  "hatespam.org", "hidemail.de",
  "hotpop.com", "hulapla.de",
  "ieh-mail.de", "imails.info",
  "inboxalias.com", "insorg-mail.info",
  "ipoo.org", "irish2me.com",
  "jetable.com", "kasmail.com",
  "kaspop.com", "killmail.com",
  "klassmaster.com", "klassmaster.net",
  "klzlv.com", "kook.ml",
  "kurzepost.de", "lifebyfood.com",
  "link2mail.net", "litedrop.com",
  "lol.ovpn.to", "lortemail.dk",
  "lovemeleaveme.com", "lr7.us",
  "maileater.com", "mailexpire.com",
  "mailfreeonline.com", "mailin8r.com",
  "mailmate.com", "mailmoat.com",
  "mailnull.com", "mailslite.com",
  "mailzilla.com", "mailzilla.org",
  "mega.zik.dj", "meltmail.com",
  "mierdamail.com", "mintemail.com",
  "mjukgansen.nu", "moakt.com",
  "monumentmail.com", "msgos.com",
  "mt2009.com", "mt2014.com",
  "mynetstore.de", "mytempemail.com",
  "nobulk.com", "noclickemail.com",
  "nogmailspam.info", "nomail.xl.cx",
  "nomail2me.com", "nomorespamemails.com",
  "notmailinator.com", "nowmymail.com",
  "nurfuerspam.de", "nus.edu.sg",
  "objectmail.com", "obobbo.com",
  "one-time.email", "oneoffemail.com",
  "onewaymail.com", "online.ms",
  "oopi.org", "ordinaryamerican.net",
  "owlpic.com", "pjjkp.com",
  "plexolan.de", "poofy.org",
  "pookmail.com", "privacy.net",
  "privatdemail.net", "proxymail.eu",
  "prtnx.com", "putthisinyourspamdatabase.com",
  "qq.com", "quickinbox.com",
  "rcpt.at", "reallymymail.com",
  "recode.me", "recursor.net",
  "regbypass.com", "regbypass.comsafe-mail.net",
  "rejectmail.com", "rhyta.com",
  "rklips.com", "rmqkr.net",
  "royal.net", "rppkn.com",
  "rtrtr.com", "s0ny.net",
  "safe-mail.net", "safersignup.de",
  "safetymail.info", "safetypost.de",
  "sandelf.de", "saynotospams.com",
  "selfdestructingmail.com", "sendspamhere.com",
  "shiftmail.com", "sify.com",
  "sinnlos-mail.de", "siteposter.net",
  "skeefmail.com", "slaskpost.se",
  "slopsbox.com", "slowfoodfoothills.xyz",
  "smashmail.de", "smellfear.com",
  "snakemail.com", "sneakemail.com",
  "snkmail.com", "sofimail.com",
  "sofort-mail.de", "softpls.asia",
  "sogetthis.com", "sohu.com",
  "soodonims.com", "spam.la",
  "spamavert.com", "spambob.com",
  "spambob.net", "spambob.org",
  "spambog.com", "spambog.de",
  "spambog.net", "spambog.ru",
  "spambox.info", "spambox.irishspringrealty.com",
  "spambox.org", "spambox.us",
  "spamcannon.com", "spamcannon.net",
  "spamcero.com", "spamcon.org",
  "spamcorptastic.com", "spamcowboy.com",
  "spamcowboy.net", "spamcowboy.org",
  "spamday.com", "spameater.com",
  "spameater.org", "spamex.com",
  "spamfighter.cf", "spamfighter.ga",
  "spamfighter.gq", "spamfighter.ml",
  "spamfighter.tk", "spamfree24.com",
  "spamfree24.de", "spamfree24.eu",
  "spamfree24.info", "spamfree24.net",
  "spamfree24.org", "spamgoes.in",
  "spaml.com", "spaml.de",
  "spammotel.com", "spamobox.com",
  "spamoff.de", "spamslicer.com",
  "spamspot.com", "spamthis.co.uk",
  "spamtroll.net", "speed.1s.fr",
  "spoofmail.de", "squizzy.de",
  "ssoia.com", "startkeys.com",
  "stexsy.com", "stinkefinger.net",
  "stop-my-spam.cf", "stop-my-spam.ga",
  "stop-my-spam.ml", "stop-my-spam.tk",
  "streetwisemail.com", "stuffmail.de",
  "supergreatmail.com", "supermailer.jp",
  "suremail.info", "svk.jp",
  "sweetxxx.de", "tafmail.com",
  "teewars.org", "teleworm.com",
  "teleworm.us", "tempail.com",
  "tempalias.com", "tempe-mail.com",
  "tempemail.biz", "tempemail.co.za",
  "tempinbox.co.uk", "tempmaildemo.com",
  "tempmailer.com", "tempmailer.de",
  "tempomail.fr", "temporarily.de",
  "temporarioemail.com.br", "temporaryemail.net",
  "temporaryemail.us", "temporaryforwarding.com",
  "temporaryinbox.com", "temporarymailaddress.com",
  "thanksnospam.info", "thankyou2010.com",
  "thecloudindex.com", "thisisnotmyrealemail.com",
  "throwam.com", "throwawaymailbox.net",
  "tilien.com", "tittbit.in",
  "tmailinator.com", "toiea.com",
  "tokenmail.de", "toomail.biz",
  "tradermail.info", "trash2009.com",
  "trash2010.com", "trash2011.com",
  "trashbox.eu", "trashdevil.com",
  "trashdevil.de", "trashemail.de",
  "trashmail.at", "trashmail.de",
  "trashmail.me", "trashmail.ws",
  "trashmailer.com", "trashymail.com",
  "trashymail.net", "trbvm.com",
  "trickmail.net", "trix.email",
  "trialmail.de", "tverya.com",
  "twinmail.de", "tyldd.com",
  "uggsrock.com", "upliftnow.com",
  "uplipht.com", "uroid.com",
  "us.af", "valemail.net",
  "venompen.com", "veryrealemail.com",
  "viditag.com", "viewcastmedia.com",
  "viewcastmedia.net", "viewcastmedia.org",
  "viralplays.com", "vkcode.ru",
  "wazabi.club", "webm4il.info",
  "webuser.in", "wee.my",
  "weg-werf-email.de", "wegwerf-email-addressen.de",
  "wegwerf-emails.de", "wegwerfadresse.de",
  "wegwerfemail.com", "wegwerfemail.de",
  "wegwerfmail.de", "wegwerfmail.info",
  "wegwerfmail.net", "wegwerfmail.org",
  "wetrainbayarea.com", "wetrainbayarea.org",
  "wh4f.org", "whatpaas.com",
  "whopy.com", "whtjddn.33mail.com",
  "whyspam.me", "willhackforfood.biz",
  "willselfdestruct.com", "winemaven.info",
  "wolfsmail.tk", "writeme.us",
  "wronghead.com", "wuzup.net",
  "wuzupmail.net", "wwwnew.eu",
  "x.ip6.li", "xagloo.co",
  "xagloo.com", "xemaps.com",
  "xents.com", "xmaily.com",
  "xoxy.net", "yep.it",
  "yogamaven.com", "yuurok.com",
  "za.com", "zehnminuten.de",
  "zehnminutenmail.de", "zippymail.info",
  "zoaxe.com", "zoemail.net",
  "zoemail.org", "zomg.info",
  "zxcv.com", "zxcvbnm.com",
  "zzz.com",
];

// Common fake/test name patterns to block
const FAKE_NAME_PATTERNS = [
  /^test$/i,
  /^testing$/i,
  /^user$/i,
  /^admin$/i,
  /^guest$/i,
  /^demo$/i,
  /^azerty$/i,
  /^qwerty$/i,
  /^asdf$/i,
  /^azer$/i,
  /^qsdf$/i,
  /^wxcv$/i,
  /^zxcv$/i,
  /^abcd$/i,
  /^1234$/i,
  /^aaaa+$/i,
  /^bbbb+$/i,
  /^xxxx+$/i,
  /^yyyy+$/i,
  /^zzzz+$/i,
  /^null$/i,
  /^undefined$/i,
  /^none$/i,
  /^fake$/i,
  /^false$/i,
  /^temp$/i,
  /^blabla$/i,
  /^blah$/i,
  /^foo$/i,
  /^bar$/i,
  /^baz$/i,
  /^exemple$/i,
  /^example$/i,
  /^sample$/i,
  /^toto$/i,
  /^tutu$/i,
  /^titi$/i,
  /^tata$/i,
  /^truc$/i,
  /^machin$/i,
  /^bidule$/i,
  /^coucou$/i,
  /^haha$/i,
  /^lol$/i,
  /^xxx$/i,
  /^yyy$/i,
  /^zzz$/i,
  /^aaa$/i,
  /^bbb$/i,
  /^ccc$/i,
];

export interface NameValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface EmailValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * Validates a name (first name or last name)
 * - Minimum 2 characters
 * - Maximum 50 characters
 * - No numbers
 * - Only letters, spaces, hyphens, and apostrophes allowed
 * - Must start with a capital letter (auto-corrected)
 * - No consecutive same characters (more than 2)
 * - Not a common fake/test pattern
 */
export function validateName(name: string): NameValidationResult {
  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { isValid: false, error: "Le nom doit contenir au moins 2 caractères" };
  }

  if (trimmed.length > 50) {
    return { isValid: false, error: "Le nom ne peut pas dépasser 50 caractères" };
  }

  // Check for numbers
  if (/\d/.test(trimmed)) {
    return { isValid: false, error: "Le nom ne peut pas contenir de chiffres" };
  }

  // Check for allowed characters only (letters, spaces, hyphens, apostrophes, accents)
  if (!/^[a-zA-ZàâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇœŒæÆ\s\-']+$/.test(trimmed)) {
    return { isValid: false, error: "Le nom ne peut contenir que des lettres" };
  }

  // Check for more than 2 consecutive same characters
  if (/(.)\1{2,}/i.test(trimmed)) {
    return { isValid: false, error: "Le nom ne peut pas contenir plus de 2 lettres identiques consécutives" };
  }

  // Check against fake name patterns
  for (const pattern of FAKE_NAME_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isValid: false, error: "Veuillez entrer votre vrai nom" };
    }
  }

  return { isValid: true, error: null };
}

/**
 * Formats a name with proper capitalization
 * - First letter uppercase
 * - Rest lowercase
 * - Handles compound names (Jean-Pierre, Mary-Jane)
 * - Handles names with apostrophes (O'Brien, D'Angelo)
 */
export function formatName(name: string): string {
  const trimmed = name.trim().toLowerCase();
  
  // Handle compound names with hyphens and apostrophes
  return trimmed
    .split(/(-|')/)
    .map((part, index, arr) => {
      // Keep separators as-is
      if (part === '-' || part === "'") return part;
      // Capitalize first letter of each part
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

/**
 * Validates an email address
 * - Basic format validation
 * - Checks against disposable email domains
 */
export function validateEmail(email: string): EmailValidationResult {
  const trimmed = email.trim().toLowerCase();

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: "Format d'email invalide" };
  }

  // Extract domain
  const domain = trimmed.split("@")[1];
  
  if (!domain) {
    return { isValid: false, error: "Format d'email invalide" };
  }

  // Check against disposable email domains
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return { isValid: false, error: "Les emails temporaires ne sont pas autorisés" };
  }

  // Check for common disposable email patterns in domain
  const disposablePatterns = [
    /temp/i, /throw/i, /trash/i, /spam/i, /fake/i, /disposable/i,
    /minute/i, /guerrilla/i, /mailinator/i
  ];
  
  for (const pattern of disposablePatterns) {
    if (pattern.test(domain)) {
      return { isValid: false, error: "Les emails temporaires ne sont pas autorisés" };
    }
  }

  return { isValid: true, error: null };
}

/**
 * Combined validation for the full onboarding form name step
 */
export function validateFullName(firstName: string, lastName: string): {
  firstName: NameValidationResult;
  lastName: NameValidationResult;
  isValid: boolean;
} {
  const firstNameResult = validateName(firstName);
  const lastNameResult = validateName(lastName);
  
  return {
    firstName: firstNameResult,
    lastName: lastNameResult,
    isValid: firstNameResult.isValid && lastNameResult.isValid,
  };
}

/**
 * Sanitizes a message by removing phone numbers and email addresses
 * to prevent users from sharing contact info before matching
 */
export function sanitizeContactInfo(message: string): string {
  if (!message) return "";
  
  let sanitized = message;
  
  // Remove phone numbers (various formats)
  // International formats: +33, +1, etc.
  sanitized = sanitized.replace(/\+?\d{1,4}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g, "[numéro masqué]");
  
  // French phone numbers: 06, 07, 01, etc.
  sanitized = sanitized.replace(/(?:0|\+33|0033)[\s.-]?[1-9](?:[\s.-]?\d{2}){4}/g, "[numéro masqué]");
  
  // General patterns with digits grouped (6+ consecutive digits)
  sanitized = sanitized.replace(/\d[\d\s.-]{5,}\d/g, "[numéro masqué]");
  
  // Remove email addresses
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email masqué]");
  
  // Remove URLs
  sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, "[lien masqué]");
  sanitized = sanitized.replace(/www\.[^\s]+/g, "[lien masqué]");
  
  // Remove social media handles (Instagram, Snapchat, etc.)
  sanitized = sanitized.replace(/@[a-zA-Z0-9._]{3,}/g, "[pseudo masqué]");
  
  // Remove "insta:", "snap:", "whatsapp:", etc.
  sanitized = sanitized.replace(/(?:insta(?:gram)?|snap(?:chat)?|whatsapp|telegram|tiktok|facebook|fb|twitter|discord)[\s:]*[a-zA-Z0-9._@-]+/gi, "[contact masqué]");
  
  return sanitized.trim();
}
