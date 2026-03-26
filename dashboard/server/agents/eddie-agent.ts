// ── Eddie Agent – Main Orchestrator ──
// Receives high-level commands, uses Anthropic tool calling to break them into sub-agent tasks,
// updates agent states as work progresses, and returns results.

import Anthropic from "@anthropic-ai/sdk";
import { updateAgent, addActivity, resetAllAgents } from "./agent-state.js";

// ── Tool definitions (Anthropic native format) ──

const TOOLS: Anthropic.Tool[] = [
  {
    name: "run_research",
    description:
      "Run a competitor / market research job. Scout will search the web and compile findings.",
    input_schema: {
      type: "object" as const,
      properties: {
        niche: { type: "string", description: "The niche or market to research" },
        competitors: {
          type: "array",
          items: { type: "string" },
          description: "List of competitor names to investigate",
        },
      },
      required: ["niche"],
    },
  },
  {
    name: "create_content",
    description:
      "Create a content draft for the calendar. Pixel (Copywriter) will write it.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Post title / headline" },
        body: { type: "string", description: "Full post body text" },
        platform: {
          type: "string",
          description: "Target platform: LinkedIn, X, etc.",
        },
        scheduledDate: {
          type: "string",
          description: "Scheduled date in YYYY-MM-DD format",
        },
      },
      required: ["title", "body", "platform"],
    },
  },
  {
    name: "search_web",
    description:
      "Search the web for information. Scout will perform the search and return results.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "analyze_data",
    description:
      "Analyze marketing data and metrics. Analyst will crunch the numbers.",
    input_schema: {
      type: "object" as const,
      properties: {
        dataType: {
          type: "string",
          description: "Type of data: prospects, content, campaigns, kpis",
        },
        query: {
          type: "string",
          description: "What to analyze or question to answer",
        },
      },
      required: ["dataType", "query"],
    },
  },
  {
    name: "update_agent_status",
    description:
      "Update the visual status of an agent in the office display.",
    input_schema: {
      type: "object" as const,
      properties: {
        agentName: {
          type: "string",
          description: "Agent id: eddie, scout, copywriter, analyst, scheduler",
        },
        status: {
          type: "string",
          enum: ["idle", "working", "break"],
          description: "New status",
        },
        currentTask: {
          type: "string",
          description: "Description of what the agent is doing",
        },
      },
      required: ["agentName", "status"],
    },
  },
  {
    name: "schedule_post",
    description:
      "Schedule a content post for publishing. Link (Scheduler) handles the queue.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Publish date YYYY-MM-DD" },
        platform: { type: "string", description: "Platform name" },
        postTitle: { type: "string", description: "Title or summary of post" },
      },
      required: ["date", "platform", "postTitle"],
    },
  },
];

const SYSTEM_PROMPT = `You are Eddie, the AI Strategy Lead of a marketing agent squad.

You coordinate a team of sub-agents:
- **Scout** (id: scout) - Research Agent. Use run_research or search_web to dispatch work to Scout.
- **Pixel** (id: copywriter) - Content Creator. Use create_content to have Pixel draft posts.
- **Analyst** (id: analyst) - Data Analyst. Use analyze_data to have Analyst crunch numbers.
- **Link** (id: scheduler) - Publishing Agent. Use schedule_post to have Link schedule things.

IMPORTANT workflow rules:
1. When you start working on a command, call update_agent_status to set YOUR status (eddie) to "working".
2. Before dispatching to a sub-agent, call update_agent_status to set THEIR status to "working" with a description of the task.
3. After a sub-agent finishes, call update_agent_status to set them back to "idle".
4. When everything is done, set yourself (eddie) back to "idle".
5. Break complex commands into multiple sub-agent tasks.
6. Always respond in Spanish (argentino informal - vos, tenés, etc).
7. Give a final summary of what was accomplished.

Company context is configured via environment variables and the database. Check campaigns and prospects data to understand the user's business context.`;

// ── Agent-to-ID mapping ──
const AGENT_MAP: Record<string, string> = {
  eddie: "eddie",
  scout: "scout",
  copywriter: "copywriter",
  pixel: "copywriter",
  analyst: "analyst",
  scheduler: "scheduler",
  link: "scheduler",
};

// ── Tool execution ──

interface ToolResult {
  agentId: string | null;
  result: string;
}

function executeToolCall(name: string, input: Record<string, unknown>): ToolResult {
  switch (name) {
    case "run_research": {
      const agentId = "scout";
      updateAgent(agentId, {
        status: "working",
        currentTask: `Researching: ${input.niche}${input.competitors ? ` (${(input.competitors as string[]).join(", ")})` : ""}`,
      });
      // Simulate research results
      const competitors = (input.competitors as string[]) || [];
      const findings = competitors.length > 0
        ? competitors.map((c) => `- ${c}: Found market presence, pricing strategy, and content approach.`).join("\n")
        : `- General market analysis for "${input.niche}" completed.`;

      const result = JSON.stringify({
        success: true,
        niche: input.niche,
        competitors: competitors,
        findings,
        summary: `Research on ${input.niche} completed. ${competitors.length || "Several"} competitors analyzed.`,
        recommendedActions: [
          "Create differentiated content highlighting unique value props",
          "Monitor competitor social media for engagement patterns",
          "Identify gaps in competitor offerings",
        ],
      });

      addActivity("Scout", "research", `Investigated ${input.niche}`);
      // Don't set idle here — Eddie will via update_agent_status
      return { agentId, result };
    }

    case "create_content": {
      const agentId = "copywriter";
      updateAgent(agentId, {
        status: "working",
        currentTask: `Writing: ${input.title}`,
      });

      const result = JSON.stringify({
        success: true,
        draft: {
          title: input.title,
          body: input.body,
          platform: input.platform,
          scheduledDate: input.scheduledDate || null,
          wordCount: String(input.body || "").split(/\s+/).length,
        },
        note: "Draft created and added to content calendar.",
      });

      addActivity("Pixel", "content", `Created draft: ${input.title}`);
      return { agentId, result };
    }

    case "search_web": {
      const agentId = "scout";
      updateAgent(agentId, {
        status: "working",
        currentTask: `Searching: ${input.query}`,
      });

      const result = JSON.stringify({
        success: true,
        query: input.query,
        results: [
          {
            title: `Top results for "${input.query}"`,
            snippet: "Found relevant information across multiple sources about this topic.",
            url: "https://example.com/result-1",
          },
          {
            title: `Industry insights: ${input.query}`,
            snippet: "Market analysis and trends related to the search query.",
            url: "https://example.com/result-2",
          },
        ],
        summary: `Web search for "${input.query}" returned relevant findings.`,
      });

      addActivity("Scout", "search", `Searched: ${input.query}`);
      return { agentId, result };
    }

    case "analyze_data": {
      const agentId = "analyst";
      updateAgent(agentId, {
        status: "working",
        currentTask: `Analyzing: ${input.dataType} - ${input.query}`,
      });

      const result = JSON.stringify({
        success: true,
        dataType: input.dataType,
        analysis: {
          query: input.query,
          insights: [
            "Engagement rates trending upward over last 30 days",
            "LinkedIn content outperforms X by 3x in lead generation",
            "Peak engagement hours: 9-11 AM and 2-4 PM (Argentina time)",
          ],
          recommendation: "Focus content creation on LinkedIn during peak hours for maximum impact.",
        },
      });

      addActivity("Analyst", "analysis", `Analyzed ${input.dataType}: ${input.query}`);
      return { agentId, result };
    }

    case "update_agent_status": {
      const rawName = String(input.agentName || "").toLowerCase();
      const agentId = AGENT_MAP[rawName] || rawName;
      const status = input.status as "idle" | "working" | "break";
      const currentTask = String(input.currentTask || "");

      updateAgent(agentId, { status, currentTask });

      return {
        agentId,
        result: JSON.stringify({ success: true, agent: agentId, status, currentTask }),
      };
    }

    case "schedule_post": {
      const agentId = "scheduler";
      updateAgent(agentId, {
        status: "working",
        currentTask: `Scheduling: ${input.postTitle} for ${input.date}`,
      });

      const result = JSON.stringify({
        success: true,
        scheduled: {
          date: input.date,
          platform: input.platform,
          postTitle: input.postTitle,
        },
        note: "Post added to publishing queue.",
      });

      addActivity("Link", "schedule", `Scheduled "${input.postTitle}" for ${input.date}`);
      return { agentId, result };
    }

    default:
      return { agentId: null, result: JSON.stringify({ error: `Unknown tool: ${name}` }) };
  }
}

// ── Main execution: run a command through Eddie ──

export interface CommandProgress {
  type: "tool_dispatch" | "agent_update" | "text_chunk" | "done" | "error";
  agent?: string;
  tool?: string;
  content?: string;
}

export async function runEddieCommand(
  command: string,
  onProgress: (event: CommandProgress) => void
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    updateAgent("eddie", { status: "working", currentTask: "Processing command (no API key)" });
    await delay(500);
    updateAgent("eddie", { status: "idle", currentTask: "" });
    const msg = "No tengo API key configurada. El sistema de agentes funciona para state management, pero necesito ANTHROPIC_API_KEY para procesar comandos con AI.";
    onProgress({ type: "text_chunk", content: msg });
    onProgress({ type: "done" });
    return msg;
  }

  const client = new Anthropic({ apiKey });
  const model = "claude-sonnet-4-20250514";

  // Set Eddie to working
  updateAgent("eddie", { status: "working", currentTask: `Processing: ${command.slice(0, 60)}` });
  addActivity("Eddie", "command", `Received: ${command.slice(0, 80)}`);

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: command },
  ];

  let fullResponse = "";
  let iterations = 0;
  const maxIterations = 12;

  try {
    while (iterations++ < maxIterations) {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });

      // Check for tool use blocks
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      // If there are tool calls, execute them
      if (toolUseBlocks.length > 0) {
        // Add assistant message to conversation
        messages.push({ role: "assistant", content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const tu of toolUseBlocks) {
          const args = (tu.input as Record<string, unknown>) || {};

          onProgress({
            type: "tool_dispatch",
            tool: tu.name,
            agent: AGENT_MAP[String(args.agentName || "").toLowerCase()] || undefined,
          });

          const { result } = executeToolCall(tu.name, args);
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: result,
          });

          // Small delay to make the animation visible
          await delay(300);
        }

        messages.push({ role: "user", content: toolResults });
        continue;
      }

      // No more tools — extract text response
      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === "text"
      );

      for (const tb of textBlocks) {
        const text = tb.text;
        if (text) {
          fullResponse += text;
          // Send in chunks for streaming feel
          const words = text.split(/(\s+)/);
          let chunk = "";
          for (const word of words) {
            chunk += word;
            if (chunk.length > 30) {
              onProgress({ type: "text_chunk", content: chunk });
              chunk = "";
            }
          }
          if (chunk) {
            onProgress({ type: "text_chunk", content: chunk });
          }
        }
      }

      break; // Done
    }
  } catch (e: any) {
    const errorMsg = `Error: ${e.message}`;
    onProgress({ type: "error", content: errorMsg });
    fullResponse = errorMsg;
  }

  // Reset all agents to idle
  resetAllAgents();
  onProgress({ type: "done" });

  return fullResponse;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
