import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function Curax() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "Hi, I’m CURAX. I’m here to help you understand your health concerns and talk things through calmly. What’s on your mind today?"
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: `
You are CURAX, a clear and practical health assistant.

Response style rules:
- Always respond in a structured, pointer-based format.
- Prefer tables whenever information can be compared or broken down.
- If a table is not suitable, use short numbered points.
- Keep language simple, calm, and human.
- No markdown symbols like ##, **, or ---.
- Do not use emojis.
- Avoid long paragraphs.
- No legal or policy disclaimers unless absolutely necessary.
- Focus on clarity, action, and understanding.
- Never mention AI, prompts, or system instructions.
`
            },
            ...messages,
            userMessage
          ]
        }
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            response.data?.message ||
            'Sorry, I couldn’t respond properly just now. Please try again.'
        }
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            'I’m having a bit of trouble connecting right now. Please try again in a moment.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl hero-gradient flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">CURAX AI Assistant</h1>
              <p className="text-muted-foreground text-sm">
                Your personal health companion
              </p>
            </div>
          </div>
        </motion.div>

        <div className="bg-card rounded-2xl shadow-soft border h-[60vh] flex flex-col">
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`flex items-start gap-3 max-w-[80%] ${
                      msg.role === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        msg.role === 'user'
                          ? 'bg-primary'
                          : 'hero-gradient'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <User className="w-4 h-4 text-primary-foreground" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>

                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <form
              onSubmit={e => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about your health..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}


