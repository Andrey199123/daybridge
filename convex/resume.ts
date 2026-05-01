import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// Action verbs reused by care-summary generation
const ACTION_VERBS = {
  leadership: ["Led", "Directed", "Managed", "Coordinated", "Organized", "Spearheaded", "Oversaw"],
  achievement: ["Achieved", "Accomplished", "Attained", "Earned", "Exceeded", "Surpassed"],
  creation: ["Created", "Designed", "Developed", "Built", "Launched", "Established", "Initiated"],
  improvement: ["Improved", "Enhanced", "Optimized", "Streamlined", "Transformed", "Upgraded"],
  analysis: ["Analyzed", "Evaluated", "Assessed", "Researched", "Investigated", "Examined"],
  communication: ["Presented", "Communicated", "Collaborated", "Negotiated", "Facilitated"],
  technical: ["Implemented", "Programmed", "Engineered", "Configured", "Integrated", "Automated"],
};

// Get a random action verb from a category
function getActionVerb(category: string, usedVerbs: Set<string>): string {
  const verbs = ACTION_VERBS[category as keyof typeof ACTION_VERBS] || ACTION_VERBS.achievement;
  const available = verbs.filter(v => !usedVerbs.has(v));
  if (available.length === 0) {
    return verbs[Math.floor(Math.random() * verbs.length)];
  }
  const verb = available[Math.floor(Math.random() * available.length)];
  usedVerbs.add(verb);
  return verb;
}

// Generate a professional bullet point from a goal/experience
function generateBullet(
  title: string, 
  description: string, 
  category: string,
  usedVerbs: Set<string>
): string {
  const verbCategory = 
    category === "academic" ? "analysis" :
    category === "career" ? "achievement" :
    category === "creative" ? "creation" :
    category === "entrepreneurial" ? "leadership" :
    "improvement";
  
  const verb = getActionVerb(verbCategory, usedVerbs);
  
  // Clean up the title/description for bullet format
  const cleanTitle = title.replace(/^(Learn|Build|Create|Start|Complete|Finish)\s+/i, "");
  
  return `${verb} ${cleanTitle.charAt(0).toLowerCase()}${cleanTitle.slice(1)}`;
}

// Get all resume data for the current user
export const getResumeData = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get user profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) return null;

    // Get completed goals
    const completedGoals = await ctx.db
      .query("goals")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "completed"))
      .collect();

    // Get experiences log
    const experiences = await ctx.db
      .query("experiencesLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get skills log
    const skillsLog = await ctx.db
      .query("skillsLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get completed mini-arcs
    const completedMiniArcs = await ctx.db
      .query("userMiniArcs")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "completed"))
      .collect();

    // Get mini-arc templates for completed arcs
    const miniArcDetails = await Promise.all(
      completedMiniArcs.map(async (arc) => {
        const template = await ctx.db.get(arc.templateId);
        return template ? { ...arc, template } : null;
      })
    );

    // Aggregate unique skills
    const uniqueSkills = [...new Set([
      ...(profile.skills || []),
      ...skillsLog.map(s => s.skill),
    ])];

    return {
      profile: {
        name: profile.name,
        grade: profile.grade,
        schoolName: profile.schoolName,
        schoolCity: profile.schoolCity,
        schoolState: profile.schoolState,
        city: profile.city,
        state: profile.state,
        interests: profile.interests,
        awards: profile.awards || [],
        programs: profile.programs || [],
      },
      completedGoals,
      experiences,
      miniArcs: miniArcDetails.filter(Boolean),
      skills: uniqueSkills,
    };
  },
});

// Get resume data for AI generation
export const getResumeDataForGeneration = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const authUser = await ctx.db.get(userId);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) return null;

    const completedGoals = await ctx.db
      .query("goals")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "completed"))
      .collect();

    const experiences = await ctx.db
      .query("experiencesLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const skillsLog = await ctx.db
      .query("skillsLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const completedMiniArcs = await ctx.db
      .query("userMiniArcs")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "completed"))
      .collect();

    const miniArcDetails = await Promise.all(
      completedMiniArcs.map(async (arc) => {
        const template = await ctx.db.get(arc.templateId);
        return template ? { ...arc, template } : null;
      })
    );

    const uniqueSkills = [...new Set([
      ...(profile.skills || []),
      ...skillsLog.map(s => s.skill),
    ])];

    return {
      profile: {
        name: profile.name,
        email: authUser?.email,
        grade: profile.grade,
        schoolName: profile.schoolName,
        schoolCity: profile.schoolCity,
        schoolState: profile.schoolState,
        city: profile.city,
        state: profile.state,
        awards: profile.awards || [],
        programs: profile.programs || [],
      },
      completedGoals,
      experiences,
      miniArcs: miniArcDetails.filter(Boolean),
      skills: uniqueSkills,
    };
  },
});

// Fallback basic generation without AI
export const generateResumeBasic = query({
  args: {
    intent: v.string(),
    template: v.string(),
    includeEmail: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) return null;

    const authUser = await ctx.db.get(userId);
    const completedGoals = await ctx.db
      .query("goals")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "completed"))
      .collect();

    const experiences = await ctx.db
      .query("experiencesLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const skillsLog = await ctx.db
      .query("skillsLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const completedMiniArcs = await ctx.db
      .query("userMiniArcs")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "completed"))
      .collect();

    const miniArcDetails = await Promise.all(
      completedMiniArcs.map(async (arc) => {
        const template = await ctx.db.get(arc.templateId);
        return template ? { ...arc, template } : null;
      })
    );

    const usedVerbs = new Set<string>();

    const header = {
      name: profile.name,
      email: args.includeEmail ? authUser?.email : undefined,
      location: profile.city && profile.state ? `${profile.city}, ${profile.state}` : undefined,
      school: profile.schoolName,
      grade: typeof profile.grade === 'string' ? profile.grade : undefined,
    };

    const education = profile.schoolName ? [{
      school: profile.schoolName,
      location: profile.schoolCity && profile.schoolState 
        ? `${profile.schoolCity}, ${profile.schoolState}` 
        : undefined,
      grade: typeof profile.grade === 'string' ? profile.grade : undefined,
    }] : [];

    const experienceItems = [];
    for (const goal of completedGoals.slice(0, 5)) {
      const bullets: string[] = [];
      if (goal.completionDetails?.result) {
        bullets.push(`${getActionVerb("achievement", usedVerbs)} ${goal.completionDetails.result}`);
      } else {
        bullets.push(generateBullet(goal.title, goal.description, goal.category, usedVerbs));
      }
      if (goal.completionDetails?.whatWentWell) {
        bullets.push(goal.completionDetails.whatWentWell);
      }
      if (goal.completionDetails?.skillsGained && goal.completionDetails.skillsGained.length > 0) {
        bullets.push(`Developed proficiency in ${goal.completionDetails.skillsGained.slice(0, 3).join(", ")}`);
      }
      experienceItems.push({
        title: goal.title,
        description: goal.description,
        date: goal.completedAt 
          ? new Date(goal.completedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : undefined,
        bullets,
      });
    }

    const allSkills = [...new Set([
      ...(profile.skills || []),
      ...skillsLog.map(s => s.skill),
      ...miniArcDetails.filter(Boolean).flatMap(a => a?.template?.skills || []),
    ])];

    const achievements = (profile.awards || []).map(award => ({
      title: award.title,
      issuer: award.issuer || award.organization,
      date: award.monthYear,
    }));

    const activities = (profile.programs || []).map(program => ({
      title: program.title,
      role: program.role,
      description: program.description,
    }));

    let sections: any = {
      header,
      education,
      experience: experienceItems,
      skills: allSkills.slice(0, 15),
      achievements: achievements.slice(0, 5),
      activities: activities.slice(0, 5),
    };

    return {
      intent: args.intent,
      template: args.template,
      sections,
      generatedAt: Date.now(),
    };
  },
});

// Get cached resume or return null
export const getCachedResume = query({
  args: {
    intent: v.string(),
    template: v.string(),
    includeEmail: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const cached = await ctx.db
      .query("generatedResumesCache")
      .withIndex("by_user_intent_template", (q) => 
        q.eq("userId", userId)
         .eq("intent", args.intent)
         .eq("template", args.template)
         .eq("includeEmail", args.includeEmail)
      )
      .first();

    if (!cached) return null;

    return {
      intent: cached.intent,
      template: cached.template,
      sections: cached.sections,
      generatedAt: cached.generatedAt,
    };
  },
});

// Save generated resume to cache
export const saveCachedResume = mutation({
  args: {
    intent: v.string(),
    template: v.string(),
    includeEmail: v.boolean(),
    sections: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if cache exists
    const existing = await ctx.db
      .query("generatedResumesCache")
      .withIndex("by_user_intent_template", (q) => 
        q.eq("userId", userId)
         .eq("intent", args.intent)
         .eq("template", args.template)
         .eq("includeEmail", args.includeEmail)
      )
      .first();

    if (existing) {
      // Update existing cache
      await ctx.db.patch(existing._id, {
        sections: args.sections,
        generatedAt: Date.now(),
      });
    } else {
      // Create new cache entry
      await ctx.db.insert("generatedResumesCache", {
        userId,
        intent: args.intent,
        template: args.template,
        includeEmail: args.includeEmail,
        sections: args.sections,
        generatedAt: Date.now(),
      });
    }
  },
});

// Generate resume content with professional wording using AI
export const generateResume = action({
  args: {
    intent: v.string(), // "internship" | "college" | "summer_program" | "general"
    template: v.string(), // "professional" | "minimalist" | "creative"
    includeEmail: v.optional(v.boolean()),
    programs: v.optional(v.array(v.object({
      title: v.string(),
      organization: v.string(),
      role: v.optional(v.string()),
      monthYear: v.string(),
      description: v.optional(v.string()),
    }))),
    awards: v.optional(v.array(v.object({
      title: v.string(),
      issuer: v.string(),
      monthYear: v.string(),
      description: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args): Promise<{
    intent: string;
    template: string;
    sections: any;
    generatedAt: number;
  } | null> => {
    // Get resume data using the query
    const resumeData = await ctx.runQuery(api.resume.getResumeDataForGeneration, {});
    if (!resumeData) return null;

    // Merge provided programs and awards with profile data
    const allPrograms = [...(resumeData.profile.programs || []), ...(args.programs || [])];
    const allAwards = [...(resumeData.profile.awards || []), ...(args.awards || [])];

    // Build the AI prompt based on the care-summary purpose.
    const intentPrompts = {
      internship: `You are creating a CARE HANDOFF SUMMARY. Focus on:
- Daily routines that matter most
- Current support context and helper responsibilities
- Specific completed care plans and next-step patterns
- Concise, practical language a caregiver can use quickly`,
      
      college: `You are creating an APPOINTMENT SUMMARY. Focus on:
- Visit prep, follow-up notes, paperwork, rides, and questions to remember
- Concrete routines or care plans connected to appointments
- Helpful context for a provider, caregiver, or family member
- No diagnosis, treatment, or medical advice`,
      
      summer_program: `You are creating a FAMILY UPDATE. Focus on:
- What has been completed recently
- What is going well
- Where help may be useful
- Warm, clear language for family members or trusted helpers`,
      
      general: `You are creating a GENERAL CARE SUMMARY. Focus on:
- Well-rounded support context
- Completed care plans, routines, strengths, and preferences
- Clear sections that are easy to scan
- Respectful wording that preserves independence`
    };

    const prompt = `${intentPrompts[args.intent as keyof typeof intentPrompts]}

USER DATA:
Name: ${resumeData.profile.name}
Daily rhythm: ${resumeData.profile.grade || 'Not specified'}
Community/support setting: ${resumeData.profile.schoolName || 'Not specified'}
Location: ${resumeData.profile.city && resumeData.profile.state ? `${resumeData.profile.city}, ${resumeData.profile.state}` : 'Not specified'}

COMPLETED CARE PLANS (${resumeData.completedGoals.length}):
${resumeData.completedGoals.map((g: any) => `- ${g.title} (${g.category}): ${g.description}
  ${g.completionDetails?.result ? `Result: ${g.completionDetails.result}` : ''}
  ${g.completionDetails?.skillsGained?.length ? `Skills: ${g.completionDetails.skillsGained.join(', ')}` : ''}`).join('\n')}

SUPPORT EXPERIENCES (${resumeData.experiences.length}):
${resumeData.experiences.map((e: any) => `- ${e.title} (${e.category}): ${e.description}
  Skills: ${e.skills.join(', ')}`).join('\n')}

QUICK ROUTINES COMPLETED (${resumeData.miniArcs.length}):
${resumeData.miniArcs.map((m: any) => `- ${m.template?.title}: ${m.template?.deliverable}
  Skills: ${m.template?.skills?.join(', ') || 'None'}`).join('\n')}

STRENGTHS: ${resumeData.skills.join(', ')}

RECOGNITIONS OR NOTES: ${allAwards.map((a: any) => `${a.title} - ${a.issuer || a.organization}`).join(', ') || 'None'}

PROGRAMS/HELPFUL CONTACTS: ${allPrograms.map((p: any) => `${p.title} (${p.role || 'Participant'})`).join(', ') || 'None'}

CRITICAL INSTRUCTIONS - DO NOT HALLUCINATE:
1. ONLY use information explicitly provided in the USER DATA above
2. DO NOT invent, assume, or fabricate ANY experiences, achievements, or details
3. If there is insufficient data for a section, leave it empty or minimal
4. DO NOT add generic placeholder experiences or skills not mentioned
5. DO NOT make up dates, organizations, or accomplishments
6. ONLY rephrase and professionally format what is actually provided
7. If a user has limited data, that's okay - keep the summary honest and concise
8. Better to have a shorter, truthful summary than a longer fabricated one
9. Do not provide medical advice, diagnosis, treatment instructions, or medication changes

Generate a care summary in JSON format using this existing schema. Return ONLY valid JSON, no markdown or explanations:
{
  "header": {
    "name": "string",
    "email": "${args.includeEmail ? resumeData.profile.email || '' : ''}",
    "location": "string or undefined",
    "school": "community/support setting or undefined",
    "grade": "daily rhythm or undefined"
  },
  "education": [{"school": "daily context item", "location": "location/context", "grade": "daily rhythm"}],
  "experience": [{"title": "care plan or routine title", "description": "string", "date": "string", "bullets": ["practical support bullet"]}],
  "skills": ["strength or preference"],
  "achievements": [{"title": "recognition or note", "issuer": "source/context", "date": "string"}],
  "activities": [{"title": "program, helper, or contact", "role": "role", "description": "string"}]
}

FORMATTING RULES:
- For ${args.intent}, emphasize the appropriate sections
- Use plain, respectful wording appropriate for older adults and care circles
- Make bullet points concise and practical (1-2 lines each)
- Include 2-4 bullets per care plan or routine (ONLY if there's enough real information)
- Tailor the language and emphasis to the ${args.intent} purpose
- If a section has no real data, return an empty array []
- Return ONLY the JSON object, no other text

REMEMBER: Accuracy and honesty are more important than length. Only include what the user has actually done.`;

    try {
      const apiKey = process.env.COHERE_API_KEY;
      if (!apiKey) {
        throw new Error("COHERE_API_KEY not configured");
      }

      const response = await fetch('https://api.cohere.com/v2/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'command-a-03-2025',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 4096,
        })
      });

      if (!response.ok) {
        throw new Error(`Cohere API error: ${response.status}`);
      }

      const data = await response.json();
      let generatedText = data.message?.content?.[0]?.text;
      
      if (!generatedText) {
        throw new Error("No response from AI");
      }

      // Clean up the response - remove markdown code blocks if present
      generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Replace undefined literals with null before parsing
      generatedText = generatedText.replace(/:\s*undefined\b/g, ': null');
      
      const sections = JSON.parse(generatedText);
      
      // Clean up null values - remove them from optional fields
      const cleanSections = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(cleanSections);
        }
        if (obj && typeof obj === 'object') {
          const cleaned: any = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value !== null && value !== undefined) {
              cleaned[key] = cleanSections(value);
            }
          }
          return cleaned;
        }
        return obj;
      };
      
      const cleanedSections = cleanSections(sections);

      // Save to cache
      await ctx.runMutation(api.resume.saveCachedResume, {
        intent: args.intent,
        template: args.template,
        includeEmail: args.includeEmail || false,
        sections: cleanedSections,
      });

      return {
        intent: args.intent,
        template: args.template,
        sections: cleanedSections,
        generatedAt: Date.now(),
      };
    } catch (error: any) {
      console.error("Error generating resume with AI:", error);
      // Fallback to basic generation if AI fails
      return await ctx.runQuery(api.resume.generateResumeBasic, {
        intent: args.intent,
        template: args.template,
        includeEmail: args.includeEmail,
      });
    }
  },
});

// Save a resume
export const saveResume = mutation({
  args: {
    name: v.string(),
    intent: v.string(),
    template: v.string(),
    sections: v.object({
      header: v.object({
        name: v.string(),
        email: v.optional(v.string()),
        location: v.optional(v.string()),
        school: v.optional(v.string()),
        grade: v.optional(v.string()),
      }),
      summary: v.optional(v.string()),
      education: v.optional(v.array(v.object({
        school: v.string(),
        location: v.optional(v.string()),
        grade: v.optional(v.string()),
        gpa: v.optional(v.string()),
      }))),
      experience: v.array(v.object({
        title: v.string(),
        description: v.string(),
        date: v.optional(v.string()),
        bullets: v.array(v.string()),
      })),
      skills: v.array(v.string()),
      achievements: v.optional(v.array(v.object({
        title: v.string(),
        issuer: v.optional(v.string()),
        date: v.optional(v.string()),
      }))),
      activities: v.optional(v.array(v.object({
        title: v.string(),
        role: v.optional(v.string()),
        description: v.optional(v.string()),
      }))),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("savedResumes", {
      userId,
      name: args.name,
      intent: args.intent,
      template: args.template,
      sections: args.sections,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get saved resumes
export const getSavedResumes = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("savedResumes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Update a saved resume
export const updateResume = mutation({
  args: {
    resumeId: v.id("savedResumes"),
    name: v.optional(v.string()),
    sections: v.optional(v.object({
      header: v.object({
        name: v.string(),
        email: v.optional(v.string()),
        location: v.optional(v.string()),
        school: v.optional(v.string()),
        grade: v.optional(v.string()),
      }),
      summary: v.optional(v.string()),
      education: v.optional(v.array(v.object({
        school: v.string(),
        location: v.optional(v.string()),
        grade: v.optional(v.string()),
        gpa: v.optional(v.string()),
      }))),
      experience: v.array(v.object({
        title: v.string(),
        description: v.string(),
        date: v.optional(v.string()),
        bullets: v.array(v.string()),
      })),
      skills: v.array(v.string()),
      achievements: v.optional(v.array(v.object({
        title: v.string(),
        issuer: v.optional(v.string()),
        date: v.optional(v.string()),
      }))),
      activities: v.optional(v.array(v.object({
        title: v.string(),
        role: v.optional(v.string()),
        description: v.optional(v.string()),
      }))),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const resume = await ctx.db.get(args.resumeId);
    if (!resume || resume.userId !== userId) {
      throw new Error("Resume not found");
    }

    return await ctx.db.patch(args.resumeId, {
      ...(args.name && { name: args.name }),
      ...(args.sections && { sections: args.sections }),
      updatedAt: Date.now(),
    });
  },
});

// Delete a saved resume
export const deleteResume = mutation({
  args: {
    resumeId: v.id("savedResumes"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const resume = await ctx.db.get(args.resumeId);
    if (!resume || resume.userId !== userId) {
      throw new Error("Resume not found");
    }

    await ctx.db.delete(args.resumeId);
  },
});
