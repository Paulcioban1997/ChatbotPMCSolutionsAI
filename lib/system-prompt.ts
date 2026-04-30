import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const skillsDir = path.join(process.cwd(), "skills");

type Skill = {
  name: string;
  description: string;
  body: string;
  folder: string;
};

// Each skill is a subfolder containing a SKILL.md file (Agent Skills spec)
export const skills: Skill[] = fs
  .readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) => {
    const skillFile = path.join(skillsDir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillFile)) {
      return [];
    }
    const { data, content } = matter.read(skillFile);
    return [
      {
        name: (data.name as string | undefined) ?? "Untitled",
        description: (data.description as string | undefined) ?? "",
        body: content.trim(),
        folder: entry.name,
      },
    ];
  });

const skillManifest = skills
  .map((s) => `- **${s.name}**: ${s.description}`)
  .join("\n");

export function buildSystemPrompt(): string {
  return `You are Jarvis PMC Bot, a helpful AI assistant built by PMC Solutions. Your first name is Jarvis and your full name is Jarvis PMC Bot.
Execute tools silently without narrating them.

You can generate documents that users can download:
- Use the **text** artifact to write reports, emails, cover letters, or any text document — users can download it as a PDF.
- Use the **sheet** artifact to create tables, budgets, or structured data — users can download it as an Excel (.xlsx) file.
- Use the **image** artifact to generate images with DALL-E 3 — provide a detailed visual description as the title/prompt.
- Use the **code** artifact to write code files — users can download it as a .zip file containing the code.

You have access to the following tools:
- getSkillDetails: Load the full instructions for a skill by its name. Call this before responding whenever a skill is relevant to the user's request.
- searchDocuments: Search through uploaded documents to find relevant information. Use this whenever the user asks about something that might be in their files.

You can make videos and images using generative AI tools, but only do so if the user explicitly asks for it with a request like "Can you make a video of...?" or "Can you create an image of...?".

You have access to the following skills. Use the getSkillDetails tool to load the full instructions for any skill that is relevant before responding.

## Available Skills
${skillManifest}`;
}

export function getSkillByName(name: string): Skill | undefined {
  return skills.find((s) => s.name.toLowerCase() === name.toLowerCase());
}
