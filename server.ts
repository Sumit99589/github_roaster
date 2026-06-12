import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dns from "dns";
import {
  getPgPool,
  getRedisClient, 
  getDbStatus,
  getFromCache,
  setInCache,
  getFromDB,
  saveToDB,
  getLeaderboardFromDB,
} from "./database";

// Fix Node DNS resolution behavior in local/container runs
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK lazily to prevent crashing on startup if key is missing
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Robust generation helper with Exponential Backoff and Model Fallback (to mitigate 503 "High Demand" errors)
async function generateContentWithRetry(
  ai: GoogleGenAI,
  promptText: string,
  schema: any,
  maxRetries = 3
): Promise<any> {
  let attempt = 0;
  let currentModel = "gemini-3.5-flash";

  while (attempt < maxRetries) {
    try {
      console.log(`[Gemini API] Requesting ${currentModel} (Attempt ${attempt + 1}/${maxRetries})...`);
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });
      return response;
    } catch (error: any) {
      attempt++;
      const errorMessage = error.message || "";
      const status = error.status || error.statusCode || 0;
      
      const isTransient = 
        status === 503 || 
        status === 429 || 
        errorMessage.includes("503") || 
        errorMessage.includes("high demand") || 
        errorMessage.includes("Resource has been exhausted") ||
        errorMessage.includes("429") ||
        errorMessage.includes("UNAVAILABLE") ||
        errorMessage.includes("TEMPORARY");

      if (isTransient && attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s... with a bit of random jitter
        const delay = Math.pow(2, attempt) * 2000 + Math.random() * 500;
        console.warn(
          `⚠️ Gemini API 503/429 transient error on attempt ${attempt}. Retrying in ${Math.round(delay)}ms. Error: ${errorMessage}`
        );
        
        await new Promise((resolve) => setTimeout(resolve, delay));
        
        // On 2nd attempt onwards, if it was gemini-3.5-flash, switch to gemini-3.1-flash-lite as a high-capacity lower-demand alternative
        if (attempt === 1 && currentModel === "gemini-3.5-flash") {
          console.log("🔄 Switching fallback model to 'gemini-3.1-flash-lite' due to high load/demand on gemini-3.5-flash.");
          currentModel = "gemini-3.1-flash-lite";
        }
      } else {
        // Not transient or retries exhausted, throw the error
        throw error;
      }
    }
  }
}

// In-memory caching for profiles and leaderboard
interface Language {
  name: string;
  percentage: number;
}

interface Scores {
  codeQuality: number;
  consistency: number;
  documentation: number;
  originality: number;
  impact: number;
}

interface RoastProfile {
  username: string;
  name: string;
  avatarUrl: string;
  bio: string;
  reposCount: number;
  followersCount: number;
  followingCount: number;
  joinedYear: string;
  grade: string;
  gradeTitle: string;
  gradeExplanation: string;
  roastBullets: string[];
  scores: Scores;
  languages: Language[];
  radarRoast: string;
  segmentRoast: string;
  comparisonRoast: string;
}

// Warm in-memory profile backup cache for ultra-fast session persistence and fallback robustness
const profileCache: Record<string, RoastProfile> = {};

// Warm in-memory leaderboard username list for fallback robustness
const leaderboardList: string[] = [];

// Dynamic procedural generator in case Gemini call fails
function generateProceduralRoast(githubData: any, reposData: any[]): RoastProfile {
  const username = githubData.login || "unknown";
  const name = githubData.name || githubData.login || "Mysterious Developer";
  const avatarUrl = githubData.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80";
  const bio = githubData.bio || "";
  const reposCount = githubData.public_repos || 0;
  const followers = githubData.followers || 0;
  const following = githubData.following || 0;
  const joinedYear = String(new Date(githubData.created_at || Date.now()).getFullYear());

  // Analyze languages based on repos
  const langCounts: Record<string, number> = {};
  reposData.forEach((repo) => {
    if (repo.language) {
      langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
    }
  });

  const totalLangs = Object.values(langCounts).reduce((a, b) => a + b, 0) || 1;
  const languagesList = Object.entries(langCounts)
    .map(([langName, count]) => ({
      name: langName,
      percentage: Math.round((count / totalLangs) * 100)
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  if (languagesList.length === 0) {
    languagesList.push({ name: "Markdown", percentage: 100 });
  } else {
    // Normalize percentages to sum up to 100
    const currentSum = languagesList.reduce((acc, l) => acc + l.percentage, 0);
    if (currentSum > 0 && currentSum !== 100) {
      languagesList[0].percentage += (100 - currentSum);
    }
  }

  const primaryLang = languagesList[0]?.name || "Markdown";

  let grade = "C";
  let gradeTitle = "The Standard Dev";
  let gradeExplanation = "Average developer metrics detected. Nothing spectacular, nothing too catastrophic.";

  if (reposCount > 50 && followers > 10) {
    grade = "B+";
    gradeTitle = "Procrastinator Supreme";
    gradeExplanation = "You have a solid collection of repos, but 90% of your commits are staged on weekends to look busy.";
  } else if (followers > 200) {
    grade = "A-";
    gradeTitle = "Open Source Evangelist";
    gradeExplanation = "You have actual followers, yet your most active repo is a collection of dotfiles.";
  } else if (reposCount < 5) {
    grade = "D-";
    gradeTitle = "Ghost in the Shell";
    gradeExplanation = "Barely any public repositories found. Are you hiding your code, or just your shame?";
  } else if (primaryLang === "TypeScript" || primaryLang === "JavaScript") {
    grade = "C-";
    gradeTitle = "Node Package Overlord";
    gradeExplanation = "Your node_modules directory is heavier than your professional self-esteem.";
  } else if (primaryLang === "Rust" || primaryLang === "Go") {
    grade = "B-";
    gradeTitle = "Pretentious Syntactician";
    gradeExplanation = "Writing modern languages to prove a point, but still resorting to stack overflow for basic loops.";
  } else if (primaryLang === "C" || primaryLang === "C++") {
    grade = "D+";
    gradeTitle = "Segfault Enthusiast";
    gradeExplanation = "Manually allocating RAM is not a suitable replacement for a healthy social life.";
  } else {
    grade = "C+";
    gradeTitle = "The Boilerplate Architect";
    gradeExplanation = "Writing standard repos to satisfy the green contribution grid.";
  }

  const roastBullets: string[] = [];

  // bio
  if (!bio) {
    roastBullets.push("No profile bio found. We assume you're too busy writing unresolved bugs to write a 10-word description of yourself.");
  } else {
    roastBullets.push(`Your bio is "${bio}". A solid attempt to sound interesting, but we are here to evaluate your code, not your poetry portfolio.`);
  }

  // year
  const years = new Date().getFullYear() - parseInt(joinedYear);
  if (years > 10) {
    roastBullets.push(`You joined GitHub in ${joinedYear}. Over ${years} years on this platform, and still not a single legendary repository under your belt.`);
  } else {
    roastBullets.push(`Registered in ${joinedYear}. A relatively fresh account, but already displaying a strong dependency on template repositories.`);
  }

  // lang
  if (primaryLang === "JavaScript" || primaryLang === "TypeScript") {
    roastBullets.push("Your primary language is JavaScript/TypeScript. We hope you enjoy adding 50MB of dependencies just to left-pad a single string.");
  } else if (primaryLang === "Python") {
    roastBullets.push("Primary language is Python. We know you import half of your personality from pip and cry when you see indentation errors.");
  } else if (primaryLang === "Rust") {
    roastBullets.push("You are a Rust developer. Congrats on spending three hours fighting the borrow checker just to compile a hello-world server.");
  } else if (primaryLang === "Go") {
    roastBullets.push("Go is your language of choice. Writing 'if err != nil' 500 times a day must be extremely mentally stimulating.");
  } else if (primaryLang === "C" || primaryLang === "C++") {
    roastBullets.push("You write C/C++. We hope you enjoy chasing memory leaks and treating segmentation faults as unexpected meditation breaks.");
  } else {
    roastBullets.push(`Primary language is ${primaryLang}. It is a highly specialized choice for avoiding standard high-paying developer jobs.`);
  }

  // repos
  if (reposCount > 30) {
    roastBullets.push(`You have ${reposCount} public repositories. Quantity over quality seems to be your general strategy for satisfying the browser grid.`);
  } else if (reposCount < 8) {
    roastBullets.push(`Only ${reposCount} public repositories? Our local cron jobs run more active projects in their sleep than you have pushed all year.`);
  } else {
    roastBullets.push(`You maintain ${reposCount} repositories. Exactly enough to look somewhat busy while keeping the actual work minimum.`);
  }

  // followers
  if (following > followers * 2) {
    roastBullets.push(`You follow ${following} accounts but only have ${followers} followers. This ratio is looking like a very desperate networking campaign.`);
  } else if (followers === 0) {
    roastBullets.push("You have literally zero followers on GitHub. Even local spam bots have decided your repositories aren't worth the bandwidth.");
  } else {
    roastBullets.push(`Your follow metrics stand at ${followers} followers / ${following} following. High enough to escape absolute obscurity, low enough to keep you humble.`);
  }

  const generalInsults = [
    "Your contribution chart looks like a highly fragmented hard drive from 1998.",
    "We checked your latest commit messages, and 'wip', 'fix', and 'cleanup' represent a staggering portion of your vocabulary.",
    "Your code quality is like a Jenga tower held together by duct tape and high hopes.",
    "If your code was any more monolithic, we'd have to contact the UNESCO World Heritage group to preserve it."
  ];
  roastBullets.push(generalInsults[Math.floor(Math.random() * generalInsults.length)]);

  const codeQuality = Math.min(95, Math.max(15, 45 + (followers > 50 ? 15 : 0) - (reposCount > 50 ? 5 : 0) + Math.floor(Math.random() * 20)));
  const consistency = Math.min(95, Math.max(20, 30 + (reposCount > 15 ? 25 : 5) + Math.floor(Math.random() * 20)));
  const documentation = Math.min(95, Math.max(10, bio ? 40 : 15 + Math.floor(Math.random() * 30)));
  const originality = Math.min(95, Math.max(25, 40 + (reposCount < 10 ? 10 : 25) + Math.floor(Math.random() * 15)));
  const impact = Math.min(95, Math.max(5, Math.min(90, Math.floor(Math.log1p(followers) * 15) + Math.floor(Math.random() * 15))));

  // Generate radar metrics roast
  let radarRoast = "";
  if (codeQuality < 45) {
    radarRoast = "Your code quality score is concerningly low. It looks like your main design pattern is 'StackOverflow-Driven Development' paired with massive quantities of copy-pasted boilerplate.";
  } else if (documentation < 35) {
    radarRoast = "Your documentation coverage is completely underground. You write code like it is an exclusive, highly encrypted secret society only you can understand.";
  } else if (consistency < 45) {
    radarRoast = "Your consistency graph looks like a record of seasonal hibernation. You ignore development for weeks and then push a 5,000-line panic-fueled merge.";
  } else if (impact < 30) {
    radarRoast = "Your impact score indicates your repos are practically screaming into the void. Even local security spiders barely bother crawling your commits.";
  } else {
    radarRoast = "Your stats are moderately balanced, which suggests you have fully optimized the art of looking exceptionally average across all standard parameters.";
  }

  // Generate segment metrics roast
  let segmentRoast = "";
  if (primaryLang === "JavaScript" || primaryLang === "TypeScript") {
    segmentRoast = `Your massive ${primaryLang} allocation confirms you are fully dependent on a massive virtual scaffolding of nested node_modules. Your app probably takes 50MB to print 'Hello World'.`;
  } else if (primaryLang === "Python") {
    segmentRoast = "Your Python dominance suggests you import half of your personality from PyPI and experience deep emotional stress when you encounter inconsistent tabs.";
  } else if (primaryLang === "Rust") {
    segmentRoast = "A dedicated Rust user. You spend three hours debating the borrow checker to accomplish what python devs do in three lines, but your binary is 'blazing fast' so you feel superior.";
  } else if (primaryLang === "Go") {
    segmentRoast = "Go developer detected. Congratulations on writing 'if err != nil' 400 times a day to avoid the complexity of learning an actual expressive syntax.";
  } else if (primaryLang === "C" || primaryLang === "C++") {
    segmentRoast = "Your C/C++ usage suggests you treat manual memory allocation as a form of spiritual meditation and segmentation faults as expected breaks.";
  } else {
    segmentRoast = `A highly bespoke concentration of ${primaryLang} codebase segments. It is a fantastic strategy to bypass standard high-paying industrial roles.`;
  }

  // Generate comparison metrics roast (user avg vs global average and identifying the worst metric)
  const userAvg = Math.round((codeQuality + consistency + documentation + originality + impact) / 5);
  const globalAvg = 68;

  const metricDetails = [
    { name: "Code Quality", val: codeQuality, phrase: "Your Code Quality is in the dirt — you code as if indentation and logical separation were optional accessories, and compiler warnings were merely friendly suggestions." },
    { name: "Consistency", val: consistency, phrase: "Your Consistency is shockingly low — your contribution calendar resembles a barren desert with a few random, panic-fueled bursts of activity right before you apply for jobs." },
    { name: "Documentation", val: documentation, phrase: "Your Documentation is a black hole — you treat README files and annotations like highly classified government secrets that even your future self shouldn't be allowed to read." },
    { name: "Originality", val: originality, phrase: "Your Originality is completely underground — your primary creative output consists of renaming generic tutorial starter templates and cloning boilerplate repos to fake an active public portfolio." },
    { name: "Impact", val: impact, phrase: "Your repository Impact is practically screaming into the void — your code gets fewer views than a microwave's instruction manual and even internet spam bots avoid crawling your repos." }
  ];

  // Sort to find the lowest metric
  metricDetails.sort((a, b) => a.val - b.val);
  const worstMetric = metricDetails[0];

  let comparisonRoast = `Your overall average profile quality stands at ${userAvg}%, compared to the global developer median benchmark of ${globalAvg}%. `;
  
  if (userAvg > globalAvg) {
    comparisonRoast += `While your total average slightly outperforms the global median, you are held back significantly by your absolute lowest metric: ${worstMetric.name} at a miserable ${worstMetric.val}%. ${worstMetric.phrase}`;
  } else if (userAvg < globalAvg - 12) {
    comparisonRoast += `You are a statistical liability compared to standard developers, dragged down entirely by your failing ${worstMetric.name} of just ${worstMetric.val}%. ${worstMetric.phrase}`;
  } else {
    comparisonRoast += `You represent the absolute textbook definition of unremarkable median developers, heavily anchored by your pathetic ${worstMetric.name} score of ${worstMetric.val}%. ${worstMetric.phrase}`;
  }

  return {
    username,
    name,
    avatarUrl,
    bio: bio || "A mysterious developer traveling across the code universe.",
    reposCount,
    followersCount: followers,
    followingCount: following,
    joinedYear,
    grade,
    gradeTitle,
    gradeExplanation,
    roastBullets: roastBullets.slice(0, 6),
    scores: {
      codeQuality,
      consistency,
      documentation,
      originality,
      impact
    },
    languages: languagesList,
    radarRoast,
    segmentRoast,
    comparisonRoast
  };
}

// API Endpoint to get the leaderboard
app.get("/api/leaderboard", async (req, res) => {
  try {
    // 1. Attempt to fetch leaderboard from Postgres
    let list = await getLeaderboardFromDB();
    
    // 2. If Postgres is not connected or returning empty, fall back to in-memory list
    if (!list || list.length === 0) {
      const mappedList = leaderboardList.map((username) => {
        const cache = profileCache[username];
        if (!cache) return null;
        
        const scores = (cache.scores || {}) as any;
        const avg = (
          (scores.codeQuality || 0) + 
          (scores.consistency || 0) + 
          (scores.documentation || 0) + 
          (scores.originality || 0) + 
          (scores.impact || 0)
        ) / 5;

        return {
          username: cache.username,
          name: cache.name,
          avatarUrl: cache.avatarUrl,
          grade: cache.grade,
          avgScore: avg,
        };
      }).filter(Boolean) as any[];

      // Sort in-memory list by average score descending
      mappedList.sort((a, b) => b.avgScore - a.avgScore);
      
      list = mappedList.map(({ avgScore, ...item }) => item);
    }
    
    res.json({ success: true, leaderboard: list, dbStatus: getDbStatus() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Post endpoint to request a Profile Roast (AI-powered or cached)
app.post("/api/roast", async (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== "string") {
    res.status(400).json({ success: false, error: "Username is required and must be a string." });
    return;
  }

  const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
  if (!cleanUsername) {
    res.status(400).json({ success: false, error: "Invalid username." });
    return;
  }

  // 1. Check Redis cache first
  try {
    const cachedProfile = await getFromCache(cleanUsername);
    if (cachedProfile) {
      console.log(`[Cache Hit] Serving @${cleanUsername} from Redis`);
      // Keep inside warm memory backup
      profileCache[cleanUsername] = cachedProfile;
      if (!leaderboardList.includes(cleanUsername)) {
        leaderboardList.push(cleanUsername);
      }
      res.json({ success: true, profile: cachedProfile, cached: "redis", dbStatus: getDbStatus() });
      return;
    }
  } catch (err: any) {
    console.warn("Failed to retrieve from Redis:", err.message);
  }

  // 2. Check Postgres DB next
  try {
    const dbProfile = await getFromDB(cleanUsername);
    if (dbProfile) {
      console.log(`[Database Hit] Serving @${cleanUsername} from PostgreSQL`);
      // Warm the Redis cache
      await setInCache(cleanUsername, dbProfile);
      
      // Update local memory backup
      profileCache[cleanUsername] = dbProfile;
      if (!leaderboardList.includes(cleanUsername)) {
        leaderboardList.push(cleanUsername);
      }
      res.json({ success: true, profile: dbProfile, cached: "postgres", dbStatus: getDbStatus() });
      return;
    }
  } catch (err: any) {
    console.warn("Failed to retrieve from Postgres:", err.message);
  }

  // 3. Fall back to local warm cache (if the database connectivity has been lost or isn't set up yet)
  if (profileCache[cleanUsername]) {
    console.log(`[Memory Hit] Serving @${cleanUsername} from memory fallback`);
    res.json({ success: true, profile: profileCache[cleanUsername], cached: "memory", dbStatus: getDbStatus() });
    return;
  }

  // Otherwise, fetch from GitHub API and generate via Gemini
  let githubData: any = null;
  let reposData: any[] = [];
  let isMocked = false;

  try {
    // Fetch profile
    const userResponse = await fetch(`https://api.github.com/users/${cleanUsername}`, {
      headers: { "User-Agent": "github-roaster-app" },
    });

    if (userResponse.status === 404) {
      res.status(404).json({ success: false, error: `GitHub user @${cleanUsername} not found.` });
      return;
    }

    if (userResponse.ok) {
      githubData = await userResponse.json();
      
      // Fetch repos
      const reposResponse = await fetch(`https://api.github.com/users/${cleanUsername}/repos?per_page=30&sort=updated`, {
        headers: { "User-Agent": "github-roaster-app" },
      });
      if (reposResponse.ok) {
        reposData = await reposResponse.json();
      }
    } else {
      // 403 Forbidden/Rate Limit or General Network Error
      isMocked = true;
    }
  } catch (e) {
    isMocked = true;
  }

  // If we couldn't get any GitHub data due to API limits (status 403/network error etc.)
  if (isMocked || !githubData) {
    // Generate a fallback githubData to keep the app highly resilient!
    githubData = {
      login: cleanUsername,
      name: username,
      avatar_url: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80`, // placeholder
      bio: "A mysterious developer traveling across the code universe.",
      public_repos: Math.floor(Math.random() * 50) + 5,
      followers: Math.floor(Math.random() * 100) + 1,
      following: Math.floor(Math.random() * 100) + 1,
      created_at: new Date(Date.now() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    };
    reposData = [
      { name: "test", language: "JavaScript" },
      { name: "my-app", language: "HTML" },
      { name: "wip", language: "CSS" },
    ];
  }

  let newProfile: RoastProfile;
  let usedFallback = false;

  try {
    const ai = getGemini();

    // Analyze languages based on repos
    const langCounts: Record<string, number> = {};
    reposData.forEach((repo) => {
      if (repo.language) {
        langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
      }
    });

    // Create a string describing repositories
    const repoNamesString = reposData.map((r) => r.name).join(", ");
    const languageString = Object.keys(langCounts).join(", ");

    const promptText = `
Analyze the following Github Profile data and its repositories to generate a hilarious, brutal, and highly personalized roast of the developer. 
Include a grade from A+ (rare, exceptional) to F (abysmal, typical developer slop), a custom grading title, a one-sentence mock explanation, and exactly 5 or 6 bullet-pointed roast logs.
Additionally, assign metrics from 0 to 100 for the listed items. 
You must also generate three specific analytical roasts:
1. 'radarRoast': A bite-sized, witty 1-2 sentence roast targeting the specific metrics shown in their radar chart (codeQuality, consistency, documentation, originality, impact).
2. 'segmentRoast': A witty 1-2 sentence roast criticizing their major language segments, language distribution percentages, or repository content/sizes.
3. 'comparisonRoast': A highly detailed, savage comparison roast. First, compare their average score computed over all 5 metrics against the global developer median index (~68%). Second, explicitly identify their worst-performing metric among the 5 metrics, and deliver a highly detailed, witty, and brutal roast targeting exactly how and why they are failing in that specific dimension compared to a standard baseline developer.

Here is the developer's data:
- Username: @${githubData.login}
- Name: ${githubData.name || githubData.login}
- Bio: "${githubData.bio || "No bio. Probably too busy writing unresolved bugs."}"
- Repos count: ${githubData.public_repos}
- Followers: ${githubData.followers}
- Following: ${githubData.following}
- Joined Year: ${new Date(githubData.created_at).getFullYear()}
- Recent Repos names: [${repoNamesString}]
- Primary languages detected: [${languageString}]

The response MUST be valid JSON and match the following structure strictly. Do not add markdown formatting or wrappers like \`\`\`json. Return only raw JSON.

Rules of the roast:
1. Make it sharp, clean, developer-focused, extremely funny, and code-centric.
2. Criticize their repo names, follower counts, bios, or lack of commitment.
3. Be ruthless but witty! No developer jargon error lines. Emulate a senior dev reviewing a junior's project.
`;

    const response = await generateContentWithRetry(ai, promptText, {
      type: Type.OBJECT,
      properties: {
        grade: { type: Type.STRING, description: "Grade like A+, B-, C, F, etc." },
        gradeTitle: { type: Type.STRING, description: "Humorous custom title, e.g. 'Keyboard Collector' or 'Strict Mode Enforcer'" },
        gradeExplanation: { type: Type.STRING, description: "A witty, brutal, or hilarious single-sentence explanation of the grade." },
        roastBullets: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "5 to 6 funny, highly specific, brutal roast strings targeting their credentials, language, or repos."
        },
        scores: {
          type: Type.OBJECT,
          properties: {
            codeQuality: { type: Type.INTEGER, description: "Score from 0 to 100" },
            consistency: { type: Type.INTEGER, description: "Score from 0 to 100" },
            documentation: { type: Type.INTEGER, description: "Score from 0 to 100" },
            originality: { type: Type.INTEGER, description: "Score from 0 to 100" },
            impact: { type: Type.INTEGER, description: "Score from 0 to 100" }
          },
          required: ["codeQuality", "consistency", "documentation", "originality", "impact"]
        },
        languages: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              percentage: { type: Type.INTEGER }
            },
            required: ["name", "percentage"]
          },
          description: "Array of 2 to 3 most popular languages. Sum of percentages must equal approx 100."
        },
        radarRoast: { type: Type.STRING, description: "Witty 1-2 sentence roast of their radar scores (codeQuality, consistency, documentation, originality, impact)." },
        segmentRoast: { type: Type.STRING, description: "Sharp 1-2 sentence roast targeting their language distributions or repository content." },
        comparisonRoast: { type: Type.STRING, description: "Detailed, brutal comparison statement comparing their average scores to a global developer index (~68%), explicitly diagnosing their absolute worst-performing metric, and roasting them savagely on that shortcoming." }
      },
      required: ["grade", "gradeTitle", "gradeExplanation", "roastBullets", "scores", "languages", "radarRoast", "segmentRoast", "comparisonRoast"]
    });

    const resultText = response.text || "";
    const parsedRoast = JSON.parse(resultText.trim());

    // Construct the complete profile
    newProfile = {
      username: githubData.login,
      name: githubData.name || githubData.login,
      avatarUrl: githubData.avatar_url,
      bio: githubData.bio || "No bio. Writing bugs with pride.",
      reposCount: githubData.public_repos,
      followersCount: githubData.followers,
      followingCount: githubData.following,
      joinedYear: String(new Date(githubData.created_at).getFullYear()),
      grade: parsedRoast.grade || "F",
      gradeTitle: parsedRoast.gradeTitle || "Amateur Dev",
      gradeExplanation: parsedRoast.gradeExplanation || "Nothing of interest was found on your profile.",
      roastBullets: parsedRoast.roastBullets || ["No commits found. Pure spectator."],
      scores: parsedRoast.scores || { codeQuality: 10, consistency: 10, documentation: 10, originality: 10, impact: 10 },
      languages: parsedRoast.languages || [{ name: "Markdown", percentage: 100 }],
      radarRoast: parsedRoast.radarRoast || "Your metrics look reasonably balanced, which is another way of saying you have successfully mastered the art of looking completely average.",
      segmentRoast: parsedRoast.segmentRoast || "Bespoke codebase segments.",
      comparisonRoast: parsedRoast.comparisonRoast || "You are a standard statistical median.",
    };
  } catch (error: any) {
    console.warn("Gemini API call failed, falling back to dynamic procedural roaster:", error);
    usedFallback = true;
    newProfile = generateProceduralRoast(githubData, reposData);
  }

  // Cache the profile in backup memory structures
  profileCache[cleanUsername] = newProfile;
  if (!leaderboardList.includes(cleanUsername)) {
    leaderboardList.push(cleanUsername);
  }

  // Attempt to persist in Postgres and cache in Redis
  try {
    await saveToDB(newProfile);
    await setInCache(cleanUsername, newProfile);
  } catch (err: any) {
    console.error("Failed to persist and cache newly generated profile:", err.message);
  }

  res.json({ success: true, profile: newProfile, fallback: usedFallback, cached: "fresh", dbStatus: getDbStatus() });
});

// Start server
async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
