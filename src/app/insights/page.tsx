"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useData } from "@/hooks/use-data";
import { useSettings } from "@/hooks/use-settings";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  aggregateByWeek,
  aggregateByPersonWeek,
  aggregateByClient,
} from "@/lib/data-aggregator";
import { buildSystemPrompt, buildInsightPrompt } from "@/lib/insights-prompt";
import type { ChatMessage } from "@/lib/types";
import { Sparkles, Send, RefreshCw, AlertCircle } from "lucide-react";

export default function InsightsPage() {
  const { tasks, isLoading } = useData();
  const { settings } = useSettings();
  const [insights, setInsights] = useState<string>("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const weeklyTeam = useMemo(() => aggregateByWeek(tasks, settings), [tasks, settings]);
  const weeklyPerson = useMemo(() => aggregateByPersonWeek(tasks, settings), [tasks, settings]);
  const clients = useMemo(() => aggregateByClient(tasks), [tasks]);

  const systemPrompt = useMemo(
    () => buildSystemPrompt(weeklyTeam, weeklyPerson, clients, tasks),
    [weeklyTeam, weeklyPerson, clients, tasks]
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateInsights = async () => {
    setInsightsLoading(true);
    setInsightsError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          messages: [{ role: "user", content: buildInsightPrompt(weeklyTeam, weeklyPerson, clients) }],
        }),
      });
      const data = await res.json();
      if (data.error) {
        setInsightsError(data.error);
      } else {
        setInsights(data.content);
      }
    } catch (e) {
      setInsightsError("Failed to generate insights. Check your API key.");
    }
    setInsightsLoading(false);
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    setChatError("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          messages: newMessages.slice(-10),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setChatError(data.error);
      } else {
        setMessages([...newMessages, { role: "assistant", content: data.content }]);
      }
    } catch {
      setChatError("Failed to send message.");
    }
    setChatLoading(false);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Loading data...</div></div>;
  }

  return (
    <div>
      <Header title="AI Insights" description="AI-powered analysis and recommendations" />

      {/* Auto Insights */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <h2 className="text-sm font-medium">Weekly Insight Report</h2>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={generateInsights}
            disabled={insightsLoading}
          >
            {insightsLoading ? (
              <><RefreshCw className="h-3 w-3 mr-2 animate-spin" />Generating...</>
            ) : (
              <><Sparkles className="h-3 w-3 mr-2" />Generate Insights</>
            )}
          </Button>
        </div>

        {insightsError && (
          <div className="flex items-center gap-2 text-sm text-red-500 mb-4">
            <AlertCircle className="h-4 w-4" />
            {insightsError}
          </div>
        )}

        {insights ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {insights.split("\n").map((line, i) => {
              if (line.startsWith("**") && line.endsWith("**")) {
                return <h3 key={i} className="text-sm font-semibold mt-4 mb-2">{line.replace(/\*\*/g, "")}</h3>;
              }
              if (line.startsWith("- ") || line.startsWith("* ")) {
                return <p key={i} className="text-sm pl-4 mb-1">• {line.slice(2)}</p>;
              }
              if (line.startsWith("#")) {
                return <h3 key={i} className="text-sm font-semibold mt-4 mb-2">{line.replace(/^#+\s*/, "").replace(/\*\*/g, "")}</h3>;
              }
              if (line.trim() === "") return <br key={i} />;
              return <p key={i} className="text-sm mb-1">{line}</p>;
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Click &quot;Generate Insights&quot; to get an AI-powered analysis of your team&apos;s performance.
            Requires ANTHROPIC_API_KEY in .env.local.
          </p>
        )}
      </Card>

      {/* Chat */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <h2 className="text-sm font-medium">Ask AI</h2>
          <Badge variant="secondary" className="text-xs">Claude</Badge>
        </div>

        <div className="border rounded-lg mb-4 h-[400px] overflow-y-auto p-4 space-y-4 bg-muted/20">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              <div className="text-center space-y-2">
                <p>Ask questions about your team&apos;s data</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["Who was most overloaded this month?", "Which client takes the most hours?", "How can we rebalance the workload?"].map((q) => (
                    <button
                      key={q}
                      className="text-xs px-3 py-1.5 rounded-full border hover:bg-accent transition-colors"
                      onClick={() => { setChatInput(q); }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border"
                }`}
              >
                {msg.content.split("\n").map((line, j) => (
                  <p key={j} className={j > 0 ? "mt-1" : ""}>{line}</p>
                ))}
              </div>
            </div>
          ))}

          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-card border rounded-lg px-4 py-2 text-sm">
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}

          {chatError && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="h-4 w-4" />
              {chatError}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="flex gap-2">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask about team utilisation, workload, clients..."
            disabled={chatLoading}
          />
          <Button onClick={sendMessage} disabled={chatLoading || !chatInput.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
