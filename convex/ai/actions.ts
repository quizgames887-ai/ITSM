import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

export const suggestCategory = action({
  args: {
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return { category: "General", confidence: 0.5 };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that categorizes support tickets. Respond with only a single category name that best fits the ticket. Common categories include: Technical, Billing, Account, Feature Request, Bug Report, General.",
            },
            {
              role: "user",
              content: `Title: ${args.title}\n\nDescription: ${args.description}\n\nWhat category should this ticket be? Respond with only the category name.`,
            },
          ],
          max_tokens: 20,
          temperature: 0.3,
        }),
      });

      const data = await response.json();
      const category = data.choices[0]?.message?.content?.trim() || "General";

      return { category, confidence: 0.8 };
    } catch (error) {
      console.error("OpenAI API error:", error);
      return { category: "General", confidence: 0.5 };
    }
  },
});

export const suggestPriority = action({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return { priority: "medium", urgency: "medium", confidence: 0.5 };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that determines ticket priority and urgency. Respond with JSON format: {\"priority\": \"low|medium|high|critical\", \"urgency\": \"low|medium|high\", \"reason\": \"brief explanation\"}",
            },
            {
              role: "user",
              content: `Title: ${args.title}\n\nDescription: ${args.description}\n\nCategory: ${args.category}\n\nDetermine the priority and urgency. Respond with JSON only.`,
            },
          ],
          max_tokens: 100,
          temperature: 0.3,
        }),
      });

      const data = await response.json();
      const content = data.choices[0]?.message?.content?.trim() || "{}";
      
      try {
        const result = JSON.parse(content);
        return {
          priority: result.priority || "medium",
          urgency: result.urgency || "medium",
          reason: result.reason || "",
          confidence: 0.8,
        };
      } catch {
        return { priority: "medium", urgency: "medium", confidence: 0.5 };
      }
    } catch (error) {
      console.error("OpenAI API error:", error);
      return { priority: "medium", urgency: "medium", confidence: 0.5 };
    }
  },
});

interface SuggestedArticle {
  id: string;
  title: string;
  relevance: string;
}

interface KnowledgeBaseSuggestion {
  articles: SuggestedArticle[];
  suggestions: string[];
}

export const suggestKnowledgeBase = action({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args): Promise<KnowledgeBaseSuggestion> => {
    // Get knowledge base articles from the database
    const articles = await ctx.runQuery(api.knowledgeBase.list, {
      category: args.category,
    });

    if (articles.length === 0) {
      return { articles: [], suggestions: [] };
    }

    // Simple keyword matching for now
    // In production, use embeddings for semantic search
    const keywords = `${args.title} ${args.description}`.toLowerCase().split(/\s+/);
    
    interface ArticleWithScore {
      _id: string;
      title: string;
      content: string;
      score: number;
    }
    
    const scoredArticles: ArticleWithScore[] = articles.map((article) => {
      const articleText = `${article.title} ${article.content}`.toLowerCase();
      const score = keywords.reduce((acc: number, keyword: string) => {
        return acc + (articleText.includes(keyword) ? 1 : 0);
      }, 0);
      return { 
        _id: article._id as string, 
        title: article.title, 
        content: article.content, 
        score 
      };
    });

    const topArticles: SuggestedArticle[] = scoredArticles
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((article) => ({
        id: article._id,
        title: article.title,
        relevance: article.score > 0 ? "high" : "medium",
      }));

    return { articles: topArticles, suggestions: [] };
  },
});
