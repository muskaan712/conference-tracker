/**
 * Maps a conference title/acronym as it appears in an external feed (AI
 * Deadlines, CCF Deadlines, or any other third-party source) to this
 * project's own `seriesId` (the filename under `src/data/conferences/`,
 * e.g. "ecmlpkdd"). External feeds are inconsistent about casing, hyphens,
 * and which of several interchangeable names they use for the same series
 * — this table is the single place that inconsistency gets resolved, so
 * adapters never have to guess or fuzzy-match.
 *
 * Deliberately conservative: an unmapped title resolves to `undefined`
 * (the candidate is dropped, never guessed) rather than being matched to
 * the "closest" series.
 */
const SERIES_ALIASES: Record<string, string> = {
  aaai: "aaai",
  acl: "acl",
  aistats: "aistats",
  cikm: "cikm",
  coling: "coling",
  colm: "colm",
  cvpr: "cvpr",
  eacl: "eacl",
  eccv: "eccv",
  // ECML PKDD is published under several spellings/casings across feeds.
  ecmlpkdd: "ecmlpkdd",
  "ecml pkdd": "ecmlpkdd",
  "ecml/pkdd": "ecmlpkdd",
  ecml: "ecmlpkdd",
  pkdd: "ecmlpkdd",
  emnlp: "emnlp",
  iccv: "iccv",
  iclr: "iclr",
  icml: "icml",
  ijcai: "ijcai",
  // IJCAI has run jointly with ECAI in some cycles.
  "ijcai-ecai": "ijcai",
  "ijcai ecai": "ijcai",
  kdd: "kdd",
  miccai: "miccai",
  mlsys: "mlsys",
  naacl: "naacl",
  neurips: "neurips",
  nips: "neurips", // legacy acronym still used by some older feed entries
  recsys: "recsys",
  "rec-sys": "recsys",
  sigir: "sigir",
  uai: "uai",
  wsdm: "wsdm",
  www: "www",
  "the web conference": "www",
  "web conference": "www",
  thewebconf: "www",

  // Series not yet tracked locally, or only added in this expansion pass —
  // present here so the adapter's alias coverage doesn't silently regress
  // if/when a local data file for one of these is added.
  ecir: "ecir",
  midl: "midl",
  doceng: "doceng",
  dsaa: "dsaa",
  icaif: "icaif",
  bigdata: "ieee-bigdata",
  "ieee bigdata": "ieee-bigdata",
  "ieee big data": "ieee-bigdata",
  esann: "esann",
  icdm: "icdm",
  sdm: "sdm",
  wmt: "wmt",
  ijcnn: "ijcnn",
  wacv: "wacv",
  ecir2: "ecir",
};

/** Normalises a title for lookup: lowercase, collapse whitespace, strip trailing edition-year noise. */
function normalise(title: string): string {
  return title
    .toLowerCase()
    .replace(/[‘’']/g, "")
    .replace(/\d{2,4}$/g, "") // trailing "2027" / "27" year suffixes some feeds append to the id/title
    .replace(/[^a-z\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves an external feed's conference title/acronym to this project's
 * `seriesId`, or `undefined` if there's no known mapping — callers must
 * drop the candidate rather than guess.
 */
export function resolveSeriesIdFromTitle(title: string): string | undefined {
  const key = normalise(title);
  if (SERIES_ALIASES[key]) return SERIES_ALIASES[key];
  // Also try the raw (un-year-stripped) lowercase form, since some titles
  // are legitimately short enough that trailing-digit stripping isn't safe
  // (e.g. an id like "aaai" has no digits to begin with, this is a no-op
  // there, but this second pass protects acronyms that end in a digit that
  // is NOT a year, however rare).
  const rawKey = title.toLowerCase().trim();
  return SERIES_ALIASES[rawKey];
}
