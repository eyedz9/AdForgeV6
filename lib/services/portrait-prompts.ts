/**
 * UGC-style selfie portrait prompts for persona image generation.
 *
 * Each prompt uses a {{PERSONA}} placeholder that gets replaced with
 * a dynamic description built from persona demographics (age, gender,
 * ethnicity). This produces authentic, social-media-style photos
 * instead of generic stock headshots.
 */

// ---------------------------------------------------------------------------
// Persona description builder
// ---------------------------------------------------------------------------

/**
 * Map gender to a natural-language description word.
 */
function getGenderDescription(gender: string): string {
  const g = gender.toLowerCase();
  if (g === "male" || g === "m") return "man";
  if (g === "female" || g === "f") return "woman";
  if (g.includes("non-binary") || g.includes("nonbinary")) return "non-binary person";
  return "person";
}

/**
 * Map ethnicity to a prompt-friendly description.
 */
function getEthnicityDescription(ethnicity?: string): string {
  if (!ethnicity || ethnicity.trim() === "") return "";

  const clean = ethnicity.trim().toLowerCase();

  const ethnicityMap: Record<string, string> = {
    white: "Caucasian",
    caucasian: "Caucasian",
    black: "Black/African-American",
    "african american": "Black/African-American",
    "african-american": "Black/African-American",
    hispanic: "Hispanic/Latino",
    latino: "Hispanic/Latino",
    latina: "Hispanic/Latina",
    asian: "Asian",
    "east asian": "East Asian",
    "south asian": "South Asian",
    "southeast asian": "Southeast Asian",
    "middle eastern": "Middle Eastern",
    indian: "South Asian/Indian",
    "pacific islander": "Pacific Islander",
    "native american": "Native American",
    mixed: "multiracial",
    multiracial: "multiracial",
  };

  return ethnicityMap[clean] || ethnicity;
}

/**
 * Build the {{PERSONA}} replacement string from demographics.
 *
 * Examples:
 *  - "32-year-old Hispanic/Latino man"
 *  - "55-year-old Asian woman with silver-streaked hair"
 *  - "28-year-old person"
 */
export function buildPersonaDescription(
  age: number,
  gender: string,
  ethnicity?: string
): string {
  const genderDesc = getGenderDescription(gender);
  const ethnicityDesc = getEthnicityDescription(ethnicity);

  let desc = `${age}-year-old`;
  if (ethnicityDesc) desc += ` ${ethnicityDesc}`;
  desc += ` ${genderDesc}`;

  return desc;
}

// ---------------------------------------------------------------------------
// The 10 UGC selfie style prompts
// ---------------------------------------------------------------------------

const UGC_SELFIE_PROMPTS: string[] = [
  // 1. Casual Coffee Shop
  `{{PERSONA}} taking a casual selfie at a cozy cafe table. Natural smile, relaxed expression. Wearing cream-colored knit sweater. Soft window light from camera left creating gentle highlights on face. Shallow depth of field with blurred coffee cup and greenery in background. Warm earth tones with subtle amber undertones. Natural skin texture. Shot from slightly above eye level, phone held at arm's length. Authentic social media aesthetic. Exclude: heavy filters, duck lips, harsh shadows, cluttered background, text overlays, watermarks.`,

  // 2. Professional Office
  `{{PERSONA}} taking a polished selfie in modern office environment. Genuine, approachable smile. Wearing crisp light blue button-down shirt. Well-groomed professional appearance. Natural office lighting mixed with soft daylight from large windows behind. Neutral gray and white office backdrop with soft focus. Shot from eye level, slight 3/4 angle. Contemporary corporate LinkedIn-style aesthetic. Cool tones with warm skin. Exclude: messy desk, harsh fluorescent light, stiff pose, dated office decor, text, logos.`,

  // 3. Golden Hour Outdoor
  `{{PERSONA}} capturing golden hour selfie outdoors in urban park setting. Genuine laughing expression with natural teeth showing. Wearing casual athleisure gray hoodie. Warm sunset backlight creating soft rim lighting on hair. Green foliage bokeh in background. Healthy, glowing complexion. Shot from slightly below chin level for flattering angle. Vibrant lifestyle influencer aesthetic. Golden warm color palette. Exclude: gym equipment, earbuds visible, sweaty appearance, harsh midday sun, busy background, text.`,

  // 4. Cozy Home
  `{{PERSONA}} taking authentic selfie from comfortable living room couch. Soft, content smile. Wearing simple heather gray casual top. Warm lamp light creating cozy ambient glow from camera right. Modern minimalist living room with plants and neutral decor softly blurred behind. Approachable weekend aesthetic. Shot at eye level from natural arm distance. Intimate, real-life social media style. Warm neutral tones with soft shadows. Exclude: TV glare, messy room, pets, other people, harsh overhead lighting, text.`,

  // 5. Bright Studio Clean
  `{{PERSONA}} taking bright, clean selfie against pure white background. Fresh smile with eyes engaged. Wearing simple white t-shirt creating tonal harmony. Soft, even studio lighting from multiple diffused sources eliminating shadows. Clear, healthy skin with natural texture. Shot from slightly above, classic selfie angle. Clean, minimalist aesthetic popular on profile photos. High-key lighting with neutral cool undertones. Exclude: harsh shadows, heavy makeup, accessories, colored backgrounds, filters, text, logos.`,

  // 6. Evening City Lights
  `{{PERSONA}} taking nighttime selfie with blurred city lights bokeh behind. Confident half-smile, looking slightly off-camera. Wearing black leather jacket over dark crew neck. Cool blue hour ambient light mixed with warm streetlight glow on face. Urban rooftop or balcony setting suggested by cityscape blur. Slightly moody, editorial feel. Shot from eye level at close range. Contemporary urban lifestyle aesthetic. Rich contrast with deep shadows and highlights. Exclude: harsh flash, red-eye, visible phone, too dark, readable text or signs.`,

  // 7. Beach Vacation
  `{{PERSONA}} taking relaxed beach selfie during late afternoon. Natural, effortless smile with windswept hair. Wearing simple white linen shirt. Soft ocean light with gentle golden undertones. Turquoise water and sandy beach softly blurred in background. Healthy sun-kissed complexion. Slightly squinting from brightness, authentic. Shot from above eye level, arm extended. Vacation lifestyle aesthetic. Warm sandy and aqua color palette. Exclude: sunburns, heavy sunglasses, tourist crowds, visible sunscreen, text, logos.`,

  // 8. Creative Studio
  `{{PERSONA}} taking thoughtful selfie in creative studio space. Subtle knowing smile, intelligent expression. Wearing casual dark navy henley. Natural north-facing window light creating soft, painterly illumination. Art supplies, canvases, and exposed brick softly blurred behind. Distinguished creative professional look. Shot from slight 3/4 angle at eye level. Authentic creative industry aesthetic. Muted earth tones with pops of color in background. Exclude: paint on face, harsh shadows, cluttered chaos, forced artsy pose, text, logos.`,

  // 9. Fitness Fresh
  `{{PERSONA}} taking post-workout selfie in bright gym locker room. Energized, accomplished smile showing vitality. Wearing simple black athletic tank top. Clean overhead gym lighting with additional natural light from high windows. Modern gym facility with clean white tiles and mirrors softly reflected. Light healthy glow suggesting completed workout. Shot from slightly above, typical gym selfie angle. Motivational fitness influencer aesthetic. Neutral cool tones with high energy. Exclude: flexing poses, crowded gym, dirty mirrors, excessive sweat, visible branding, text.`,

  // 10. Bookish Library
  `{{PERSONA}} taking cozy selfie in book-filled home library corner. Warm, curious smile with slight head tilt. Wearing oversized oatmeal cardigan over simple top. Soft reading lamp creating warm directional light from camera left. Wooden bookshelves with leather-bound books in artistic blur behind. Natural, approachable appearance. Shot from slightly below chin for engaging angle. Cottagecore meets academic aesthetic. Rich warm amber and brown tones. Exclude: messy stacks, harsh overhead light, busy patterns, visible phone, overly posed, text.`,
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a UGC-style selfie prompt for persona portrait generation.
 *
 * Randomly selects one of 10 style templates and injects the persona
 * description (age, gender, ethnicity).
 */
export function buildUgcPortraitPrompt(
  age: number,
  gender: string,
  ethnicity?: string
): string {
  const persona = buildPersonaDescription(age, gender, ethnicity);
  const template = UGC_SELFIE_PROMPTS[Math.floor(Math.random() * UGC_SELFIE_PROMPTS.length)];
  return template.replace("{{PERSONA}}", persona);
}

/**
 * Number of available UGC style templates.
 */
export const UGC_STYLE_COUNT = UGC_SELFIE_PROMPTS.length;
