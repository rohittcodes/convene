import { createDataStreamResponse, DataStreamWriter, Message, streamText } from 'ai';
import { errorSerializer, withInterruptions } from '@auth0/ai-vercel/interrupts';

type CreateAgentStreamOptions = {
  model: any;
  system: string;
  messages: Message[];
  tools: Record<string, any>;
  maxSteps: number;
  sendReasoning: boolean;
  onCompleteText?: (text: string) => Promise<void> | void;
  onComplete?: (text: string, metadata?: any) => Promise<void> | void;
};

export function createAgentStreamResponse({
  model,
  system,
  messages,
  tools,
  maxSteps,
  sendReasoning,
  onCompleteText,
  onComplete,
}: CreateAgentStreamOptions) {
  return createDataStreamResponse({
    execute: withInterruptions(
      async (dataStream: DataStreamWriter) => {
        const result = streamText({
          model,
          system,
          messages,
          maxSteps,
          tools,
        });

        result.mergeIntoDataStream(dataStream, {
          sendReasoning,
        });

        if (onCompleteText || onComplete) {
          let finalText = '';
          for await (const chunk of result.textStream) {
            finalText += chunk;
          }
          if (onCompleteText) {
            await onCompleteText(finalText);
          }
          if (onComplete) {
            await onComplete(finalText);
          }
        }
      },
      {
        messages,
        tools,
      },
    ),
    onError: errorSerializer((err: any) => {
      return `An error occurred! ${err.message}`;
    }),
  });
}

// Vercel AI tends to get stuck when there are incomplete tool calls in messages
export const sanitizeMessages = (messages: Message[]) => {
  return messages.filter(
    (message) => !(message.role === 'assistant' && (message as any).parts && (message as any).parts.length > 0 && message.content === ''),
  );
};


