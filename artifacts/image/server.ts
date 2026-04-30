import { createOpenAI } from "@ai-sdk/openai";
import { generateImage } from "ai";
import { createDocumentHandler } from "@/lib/artifacts/server";

const openai = createOpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

export const imageDocumentHandler = createDocumentHandler<"image">({
  kind: "image",
  onCreateDocument: async ({ title, dataStream }) => {
    const { image } = await generateImage({
      model: openai.image("dall-e-3"),
      prompt: title,
      size: "1024x1024",
    });

    const base64 = image.base64;

    dataStream.write({
      type: "data-imageDelta",
      data: base64,
      transient: true,
    });

    return base64;
  },
  onUpdateDocument: async ({ description, dataStream }) => {
    const { image } = await generateImage({
      model: openai.image("dall-e-3"),
      prompt: description,
      size: "1024x1024",
    });

    const base64 = image.base64;

    dataStream.write({
      type: "data-imageDelta",
      data: base64,
      transient: true,
    });

    return base64;
  },
});
