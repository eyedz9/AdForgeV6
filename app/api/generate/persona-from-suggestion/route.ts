/**
 * API Route: Generate Persona from Intelligence Suggestion
 *
 * Takes partial persona data from an intelligence suggestion and
 * uses AI to generate a complete, detailed persona profile.
 * Also automatically generates a persona portrait image.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendMessage } from "@/lib/api/anthropic";
import { normalizePersonaEnums } from "@/lib/api/openrouter";
import { createPersona, updatePersona } from "@/app/actions/personas";
import type { CreatePersonaInput, EducationLevel, MaritalStatus, CompanySize, WorkStyle, FitnessLevel, DietType, ScreenTimeRange, PriceSensitivity, BrandLoyaltyLevel, PurchaseFrequency, ResearchBehavior, PersonalityTrait, DecisionFactor, SocialPlatform, DeviceType, ContentPreference, ShoppingChannel } from "@/lib/validations/persona";
import {
  generateImageWithRetry,
  downloadImage,
  type StylePreset,
} from "@/lib/api/nano-banana";
import { checkQuota, decrementQuota } from "@/lib/services/usage";
import { validateAgainstCensus } from "@/lib/services/census-validator";
import { buildUgcPortraitPrompt } from "@/lib/services/portrait-prompts";

// Suggestion data from PersonaSuggestions component
interface SuggestionInput {
  name: string;
  archetype: string;
  age: number;
  gender: string;
  location: string;
  income: string;
  occupation: string;
  values: string[];
  motivations: string[];
  painPoints: string[];
  aspirations: string[];
  purchaseDrivers: string[];
  preferredChannels: string[];
  decisionStyle: string;
  intelligenceReportId?: string;
  relevanceScore?: number;
}

interface RequestBody {
  brandId: string;
  suggestion: SuggestionInput;
}

// Parse income string to number
function parseIncome(incomeStr: string): number {
  // Remove currency symbols, commas, and spaces
  const cleaned = incomeStr.replace(/[$,\s]/g, "");
  // Extract the first number found
  const match = cleaned.match(/\d+/);
  if (match) {
    return parseInt(match[0], 10) * (incomeStr.toLowerCase().includes("k") ? 1000 : 1);
  }
  return 65000; // Default fallback
}

// Normalize gender to valid enum value
function normalizeGender(gender: string): "Male" | "Female" | "Non-binary" | "Other" {
  const lower = gender.toLowerCase();
  if (lower === "male" || lower === "m") return "Male";
  if (lower === "female" || lower === "f") return "Female";
  if (lower.includes("non-binary") || lower.includes("nonbinary")) return "Non-binary";
  return "Other";
}

// Normalize company size to valid enum value
function normalizeCompanySize(size: string): CompanySize {
  const lower = size.toLowerCase().replace(/[,\s]+/g, " ").trim();
  if (lower.includes("self")) return "Self-employed";
  if (lower.includes("1-10") || lower.includes("1 to 10") || lower.includes("micro")) return "1-10 employees";
  if (lower.includes("11-50") || lower.includes("11 to 50") || lower.includes("small")) return "11-50 employees";
  if (lower.includes("51-200") || lower.includes("51 to 200")) return "51-200 employees";
  if (lower.includes("201-500") || lower.includes("201 to 500") || lower.includes("medium")) return "201-500 employees";
  if (lower.includes("501-1000") || lower.includes("501 to 1000")) return "501-1000 employees";
  if (lower.includes("1001-5000") || lower.includes("1001 to 5000")) return "1001-5000 employees";
  if (lower.includes("5000+") || lower.includes("5001") || lower.includes("10000") || lower.includes("large") || lower.includes("enterprise")) return "5000+ employees";
  // Catch patterns like "1000+" or "1000+ employees"
  const numMatch = lower.match(/(\d+)\+/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 5000) return "5000+ employees";
    if (num >= 1001) return "1001-5000 employees";
    if (num >= 501) return "501-1000 employees";
    if (num >= 201) return "201-500 employees";
    if (num >= 51) return "51-200 employees";
    if (num >= 11) return "11-50 employees";
    return "1-10 employees";
  }
  return "51-200 employees"; // Safe default
}

// Extract city, state, country from location string
function parseLocation(location: string): { city: string; state: string; country: string; location: string } {
  const parts = location.split(",").map((p) => p.trim());
  return {
    location: location,
    city: parts[0] || location,
    state: parts[1] || "",
    country: parts[2] || "USA",
  };
}

/**
 * Generate and upload persona portrait using UGC selfie style
 */
async function generatePersonaPortrait(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  brandId: string,
  age: number,
  gender: string,
  ethnicity?: string
): Promise<{ success: true; photoUrl: string; photoPrompt: string } | { success: false; error: string }> {
  try {
    // Check quota first
    const quotaCheck = await checkQuota(supabase, userId, "images", 1);
    if (!quotaCheck.allowed) {
      return {
        success: false,
        error: quotaCheck.message || "Image generation quota exceeded",
      };
    }

    // Build UGC selfie prompt (randomly selects one of 10 styles)
    const prompt = buildUgcPortraitPrompt(age, gender, ethnicity);

    // Generate portrait image - 1080x1080 (1:1 ratio, ~1k resolution)
    const generationResult = await generateImageWithRetry({
      prompt,
      stylePreset: "authentic-raw" as StylePreset,
      outputFormat: "1080x1080",
      count: 1,
      negativePrompt: "cartoon, illustration, anime, distorted, deformed, ugly, bad anatomy, bad proportions, watermark, text, logo, unrealistic, artificial, plastic skin, multiple people, group photo, heavy filters, duck lips",
    });

    if (!generationResult.success) {
      return {
        success: false,
        error: generationResult.error || "Failed to generate portrait",
      };
    }

    const generatedImage = generationResult.images[0];
    if (!generatedImage) {
      return {
        success: false,
        error: "No image was generated",
      };
    }

    // Download the image
    const downloadResult = await downloadImage(generatedImage.url);
    if (!downloadResult.success) {
      return {
        success: false,
        error: `Failed to download image: ${downloadResult.error}`,
      };
    }

    // Upload to storage
    const timestamp = Date.now();
    const extension = downloadResult.contentType.includes("png") ? "png" : "jpg";
    const filename = `persona-portrait-${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;
    const path = `${userId}/personas/${brandId}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("creatives")
      .upload(path, downloadResult.data, {
        contentType: downloadResult.contentType,
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        error: `Failed to upload image: ${uploadError.message}`,
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("creatives")
      .getPublicUrl(path);

    // Decrement quota
    await decrementQuota(supabase, userId, "images", 1);

    return {
      success: true,
      photoUrl: urlData.publicUrl,
      photoPrompt: prompt,
    };
  } catch (error) {
    console.error("Error generating persona portrait:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body: RequestBody = await request.json();
    const { brandId, suggestion } = body;

    if (!brandId || !suggestion) {
      return NextResponse.json({ error: "Missing brandId or suggestion data" }, { status: 400 });
    }

    // Verify brand exists and user has access
    const { data: brandData, error: brandError } = await supabase
      .from("brands")
      .select("id, name, industry")
      .eq("id", brandId)
      .single();

    if (brandError || !brandData) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const brand = brandData as { id: string; name: string; industry: string | null };

    // Get products for context
    const { data: productsData } = await supabase
      .from("products")
      .select("id, name, product_type, short_description")
      .eq("brand_id", brandId)
      .limit(5);

    const products = (productsData || []) as Array<{ id: string; name: string; product_type: string | null; short_description: string | null }>;

    // Build the AI prompt to generate missing persona fields
    const prompt = `You are generating a detailed consumer persona profile for a marketing platform.

BRAND CONTEXT:
- Brand: ${brand.name}
- Industry: ${brand.industry || "General"}
${products && products.length > 0 ? `- Products: ${products.map((p) => p.name).join(", ")}` : ""}

SUGGESTED PERSONA SEED DATA:
- Name: ${suggestion.name}
- Archetype: ${suggestion.archetype}
- Age: ${suggestion.age}
- Gender: ${suggestion.gender}
- Location: ${suggestion.location}
- Income: ${suggestion.income}
- Occupation: ${suggestion.occupation}
- Values: ${suggestion.values.join(", ")}
- Motivations: ${suggestion.motivations.join(", ")}
- Pain Points: ${suggestion.painPoints.join(", ")}
- Aspirations: ${suggestion.aspirations.join(", ")}
- Purchase Drivers: ${suggestion.purchaseDrivers.join(", ")}
- Preferred Channels: ${suggestion.preferredChannels.join(", ")}
- Decision Style: ${suggestion.decisionStyle}

Generate a COMPLETE, detailed persona profile in JSON format. Fill in ALL missing fields with realistic, specific values that are consistent with the seed data above. The persona should feel like a real person.

IMPORTANT:
- All values must be SPECIFIC (e.g., age: 32, not "25-35")
- Income must be a specific annual number (e.g., 65000)
- Location must include city, state, country
- Arrays must contain the exact number of items specified
- Use the exact enum values listed for each field

Return ONLY valid JSON with this exact structure (no markdown, no explanation):

{
  "backstory": "A 3-4 sentence backstory describing this person's life situation and how they came to need the product/service",
  "quote": "A single sentence quote that captures their key motivation or frustration",
  "dayInLife": "A brief paragraph describing a typical day in their life relevant to the product category",
  "demographics": {
    "age": ${suggestion.age},
    "gender": "${normalizeGender(suggestion.gender)}",
    "location": "${suggestion.location}",
    "city": "${parseLocation(suggestion.location).city}",
    "state": "${parseLocation(suggestion.location).state}",
    "country": "USA",
    "education": "Bachelor's Degree",
    "maritalStatus": "Married",
    "hasChildren": false,
    "numberOfChildren": 0,
    "householdSize": 2,
    "income": ${parseIncome(suggestion.income)},
    "ethnicity": ""
  },
  "professional": {
    "jobTitle": "${suggestion.occupation}",
    "occupation": "${suggestion.occupation}",
    "industry": "Fill in based on occupation",
    "company": "A realistic company name",
    "companySize": "51-200 employees",
    "yearsExperience": 10,
    "workStyle": "Hybrid",
    "careerGoals": ["Goal 1", "Goal 2", "Goal 3"],
    "weeklyWorkHours": 45,
    "commuteMinutes": 25
  },
  "psychographics": {
    "values": ${JSON.stringify(suggestion.values.slice(0, 7))},
    "motivations": ${JSON.stringify(suggestion.motivations.slice(0, 5))},
    "fears": ["Fear 1 based on pain points", "Fear 2", "Fear 3"],
    "aspirations": ${JSON.stringify(suggestion.aspirations.slice(0, 5))},
    "personalityTraits": ["Analytical", "Practical", "Detail-oriented"],
    "attitudes": ["Attitude 1", "Attitude 2"]
  },
  "lifestyle": {
    "hobbies": ["Hobby 1", "Hobby 2", "Hobby 3"],
    "interests": ["Interest 1", "Interest 2", "Interest 3"],
    "activities": ["Activity 1", "Activity 2"],
    "sports": ["Walking", "Swimming"],
    "travel": ["Domestic travel", "Beach vacations"],
    "diet": "No restrictions",
    "fitnessLevel": "Moderately active",
    "wakeTime": "6:30 AM",
    "sleepTime": "10:30 PM"
  },
  "mediaTech": {
    "socialPlatforms": ["Facebook", "Instagram", "LinkedIn"],
    "primaryPlatform": "Facebook",
    "newsSources": ["Local news", "Google News"],
    "podcastsStreaming": ["Netflix", "Spotify"],
    "devices": ["iPhone", "Windows PC", "iPad"],
    "primaryDevice": "iPhone",
    "contentPreferences": ["Short-form video", "Articles/Blogs", "Social media posts"],
    "screenTime": "4-6 hours",
    "influencersFollowed": []
  },
  "buyingBehavior": {
    "shoppingPreferences": ["Online - mobile", "Marketplace (Amazon, eBay)"],
    "primaryChannel": "Online - mobile",
    "priceSensitivity": "Balanced",
    "brandLoyalty": "Moderately loyal",
    "decisionFactors": ["Quality", "Reviews/Ratings", "Price"],
    "purchaseFrequency": "Occasionally (monthly)",
    "preferredChannels": ${JSON.stringify(suggestion.preferredChannels.slice(0, 5))},
    "researchBehavior": "Thorough researcher - extensive comparison",
    "currentBrands": [],
    "averageMonthlySpend": 200,
    "purchaseTriggers": ${JSON.stringify(suggestion.purchaseDrivers.slice(0, 5))}
  }
}

Remember: Return ONLY the JSON object, no other text.`;

    // Generate the persona details using AI
    let aiResponse: string;
    try {
      aiResponse = await sendMessage(prompt, {
        maxTokens: 3000,
        temperature: 0.7,
      });
    } catch (aiError) {
      console.error("AI generation failed:", aiError);
      return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
    }

    // Parse the AI response
    let generatedData: Record<string, unknown>;
    try {
      // Clean the response - remove any markdown formatting
      let cleanedContent = aiResponse.trim();
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      generatedData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse);
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // Build the complete persona input
    // Build persona input with proper type casts for enum fields
    const personaInput = {
      brandId,
      intelligenceReportId: suggestion.intelligenceReportId || null,
      name: suggestion.name,
      backstory: (generatedData.backstory as string) || `${suggestion.name} is a ${suggestion.archetype} who ${suggestion.decisionStyle.toLowerCase()}`,
      quote: (generatedData.quote as string) || suggestion.motivations[0] || "Looking for the right solution.",
      dayInLife: generatedData.dayInLife as string,
      demographics: {
        age: suggestion.age,
        gender: normalizeGender(suggestion.gender),
        location: suggestion.location,
        city: parseLocation(suggestion.location).city,
        state: parseLocation(suggestion.location).state,
        country: "USA",
        education: (((generatedData.demographics as Record<string, unknown>)?.education as string) || "Bachelor's Degree") as EducationLevel,
        maritalStatus: (((generatedData.demographics as Record<string, unknown>)?.maritalStatus as string) || "Married") as MaritalStatus,
        hasChildren: ((generatedData.demographics as Record<string, unknown>)?.hasChildren as boolean) ?? false,
        numberOfChildren: ((generatedData.demographics as Record<string, unknown>)?.numberOfChildren as number) ?? 0,
        householdSize: ((generatedData.demographics as Record<string, unknown>)?.householdSize as number) || 2,
        income: parseIncome(suggestion.income),
        ethnicity: ((generatedData.demographics as Record<string, unknown>)?.ethnicity as string) || "",
      },
      professional: {
        jobTitle: suggestion.occupation,
        occupation: suggestion.occupation,
        industry: ((generatedData.professional as Record<string, unknown>)?.industry as string) || brand.industry || "General",
        company: ((generatedData.professional as Record<string, unknown>)?.company as string) || undefined,
        companySize: normalizeCompanySize(((generatedData.professional as Record<string, unknown>)?.companySize as string) || "51-200 employees"),
        yearsExperience: ((generatedData.professional as Record<string, unknown>)?.yearsExperience as number) || 10,
        workStyle: (((generatedData.professional as Record<string, unknown>)?.workStyle as string) || "Hybrid") as WorkStyle,
        careerGoals: ((generatedData.professional as Record<string, unknown>)?.careerGoals as string[]) || ["Advance in career", "Achieve work-life balance", "Develop new skills"],
        weeklyWorkHours: ((generatedData.professional as Record<string, unknown>)?.weeklyWorkHours as number) || 45,
        commuteMinutes: ((generatedData.professional as Record<string, unknown>)?.commuteMinutes as number) || 25,
      },
      psychographics: {
        values: suggestion.values.slice(0, 7).length >= 3 ? suggestion.values.slice(0, 7) : [...suggestion.values, "Quality", "Value", "Trust"].slice(0, 7),
        motivations: suggestion.motivations.slice(0, 5).length >= 2 ? suggestion.motivations.slice(0, 5) : [...suggestion.motivations, "Improve quality of life"].slice(0, 5),
        fears: ((generatedData.psychographics as Record<string, unknown>)?.fears as string[]) || suggestion.painPoints.slice(0, 5).map((p) => `Fear of ${p.toLowerCase()}`).slice(0, 5),
        aspirations: suggestion.aspirations.slice(0, 5).length >= 2 ? suggestion.aspirations.slice(0, 5) : [...suggestion.aspirations, "Live a fulfilling life"].slice(0, 5),
        personalityTraits: (((generatedData.psychographics as Record<string, unknown>)?.personalityTraits as string[]) || ["Analytical", "Practical", "Detail-oriented"]) as PersonalityTrait[],
        attitudes: ((generatedData.psychographics as Record<string, unknown>)?.attitudes as string[]) || undefined,
      },
      lifestyle: {
        hobbies: ((generatedData.lifestyle as Record<string, unknown>)?.hobbies as string[]) || ["Reading", "Gardening", "Cooking"],
        interests: ((generatedData.lifestyle as Record<string, unknown>)?.interests as string[]) || ["Health", "Family", "Technology"],
        activities: ((generatedData.lifestyle as Record<string, unknown>)?.activities as string[]) || ["Walking", "Shopping"],
        sports: ((generatedData.lifestyle as Record<string, unknown>)?.sports as string[]) || undefined,
        travel: ((generatedData.lifestyle as Record<string, unknown>)?.travel as string[]) || undefined,
        diet: (((generatedData.lifestyle as Record<string, unknown>)?.diet as string) || "No restrictions") as DietType,
        fitnessLevel: (((generatedData.lifestyle as Record<string, unknown>)?.fitnessLevel as string) || "Moderately active") as FitnessLevel,
        wakeTime: ((generatedData.lifestyle as Record<string, unknown>)?.wakeTime as string) || undefined,
        sleepTime: ((generatedData.lifestyle as Record<string, unknown>)?.sleepTime as string) || undefined,
      },
      mediaTech: {
        socialPlatforms: (((generatedData.mediaTech as Record<string, unknown>)?.socialPlatforms as string[]) || ["Facebook", "Instagram"]) as SocialPlatform[],
        primaryPlatform: ((generatedData.mediaTech as Record<string, unknown>)?.primaryPlatform as SocialPlatform) || undefined,
        newsSources: ((generatedData.mediaTech as Record<string, unknown>)?.newsSources as string[]) || ["Google News"],
        podcastsStreaming: ((generatedData.mediaTech as Record<string, unknown>)?.podcastsStreaming as string[]) || undefined,
        devices: (((generatedData.mediaTech as Record<string, unknown>)?.devices as string[]) || ["iPhone", "Windows PC"]) as DeviceType[],
        primaryDevice: ((generatedData.mediaTech as Record<string, unknown>)?.primaryDevice as DeviceType) || undefined,
        contentPreferences: (((generatedData.mediaTech as Record<string, unknown>)?.contentPreferences as string[]) || ["Short-form video", "Articles/Blogs"]) as ContentPreference[],
        screenTime: (((generatedData.mediaTech as Record<string, unknown>)?.screenTime as string) || "4-6 hours") as ScreenTimeRange,
        influencersFollowed: ((generatedData.mediaTech as Record<string, unknown>)?.influencersFollowed as string[]) || undefined,
      },
      buyingBehavior: {
        shoppingPreferences: (((generatedData.buyingBehavior as Record<string, unknown>)?.shoppingPreferences as string[]) || ["Online - mobile"]) as ShoppingChannel[],
        primaryChannel: ((generatedData.buyingBehavior as Record<string, unknown>)?.primaryChannel as ShoppingChannel) || undefined,
        priceSensitivity: (((generatedData.buyingBehavior as Record<string, unknown>)?.priceSensitivity as string) || "Balanced") as PriceSensitivity,
        brandLoyalty: (((generatedData.buyingBehavior as Record<string, unknown>)?.brandLoyalty as string) || "Moderately loyal") as BrandLoyaltyLevel,
        decisionFactors: (((generatedData.buyingBehavior as Record<string, unknown>)?.decisionFactors as string[]) || ["Quality", "Reviews/Ratings", "Price"]) as DecisionFactor[],
        purchaseFrequency: (((generatedData.buyingBehavior as Record<string, unknown>)?.purchaseFrequency as string) || "Occasionally (monthly)") as PurchaseFrequency,
        preferredChannels: suggestion.preferredChannels.slice(0, 5).length > 0 ? suggestion.preferredChannels.slice(0, 5) : undefined,
        researchBehavior: (((generatedData.buyingBehavior as Record<string, unknown>)?.researchBehavior as string) || "Thorough researcher - extensive comparison") as ResearchBehavior,
        currentBrands: ((generatedData.buyingBehavior as Record<string, unknown>)?.currentBrands as string[]) || undefined,
        averageMonthlySpend: ((generatedData.buyingBehavior as Record<string, unknown>)?.averageMonthlySpend as number) || undefined,
        purchaseTriggers: suggestion.purchaseDrivers.slice(0, 5).length > 0 ? suggestion.purchaseDrivers.slice(0, 5) : undefined,
      },
      validationStatus: "pending" as const,
      generationModel: "claude-haiku-4-5",
      generationParams: {
        source: "persona-from-suggestion",
        relevanceScore: suggestion.relevanceScore ?? null,
        archetype: suggestion.archetype,
      },
    } satisfies CreatePersonaInput;

    // Normalize AI-generated enum values to match the Zod schema
    const normalizedInput = {
      ...normalizePersonaEnums(personaInput),
      brandId: personaInput.brandId,
      intelligenceReportId: personaInput.intelligenceReportId,
    } as CreatePersonaInput;

    // Create the persona using the existing action
    const result = await createPersona(normalizedInput);

    if (!result.success) {
      console.error("Failed to create persona:", result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Run census validation in parallel with portrait generation (non-blocking)
    const censusPromise = validateAgainstCensus({
      location: suggestion.location,
      income: parseIncome(suggestion.income),
      age: suggestion.age,
      education: (generatedData.demographics as Record<string, unknown>)?.education as string | undefined,
      householdSize: (generatedData.demographics as Record<string, unknown>)?.householdSize as number | undefined,
    }).catch((err) => {
      console.error("Census validation failed (non-blocking):", err);
      return null;
    });

    // Generate persona portrait image using UGC selfie style
    const ethnicity = (generatedData.demographics as Record<string, unknown>)?.ethnicity as string | undefined;
    console.log("Starting UGC selfie portrait generation for persona:", {
      age: suggestion.age,
      gender: suggestion.gender,
      ethnicity,
    });
    const portraitResult = await generatePersonaPortrait(
      supabase,
      user.id,
      brandId,
      suggestion.age,
      suggestion.gender,
      ethnicity
    );
    console.log("Portrait generation result:", {
      success: portraitResult.success,
      error: !portraitResult.success ? portraitResult.error : undefined,
    });

    // Await census result (should be done by now since portrait takes longer)
    const censusResult = await censusPromise;
    const censusParams = censusResult
      ? { censusValidation: censusResult }
      : {};

    // If portrait was generated, update the persona with the photo URL + census data
    if (portraitResult.success && result.data) {
      const existingParams = (normalizedInput.generationParams ?? {}) as Record<string, unknown>;
      const updateResult = await updatePersona(result.data.id, {
        photoUrl: portraitResult.photoUrl,
        photoPrompt: portraitResult.photoPrompt,
        generationParams: { ...existingParams, ...censusParams },
      });

      if (updateResult.success) {
        return NextResponse.json({
          success: true,
          persona: updateResult.data,
          portraitGenerated: true,
        });
      }
    } else if (censusResult && result.data) {
      // Portrait failed but census succeeded — still save census data
      const existingParams = (normalizedInput.generationParams ?? {}) as Record<string, unknown>;
      await updatePersona(result.data.id, {
        generationParams: { ...existingParams, ...censusParams },
      }).catch((err) => console.error("Failed to save census data:", err));
    }

    // Return persona even if portrait generation failed
    return NextResponse.json({
      success: true,
      persona: result.data,
      portraitGenerated: portraitResult.success,
      portraitError: !portraitResult.success ? portraitResult.error : undefined,
    });
  } catch (error) {
    console.error("Error generating persona from suggestion:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
