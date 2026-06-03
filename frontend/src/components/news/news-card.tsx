import { ExternalLink } from "lucide-react";
import { SentimentChip } from "@/components/news/sentiment-chip";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import type { components } from "@/api/types";

type NewsItem = components["schemas"]["NewsItem"];

interface NewsCardProps {
  item: NewsItem;
}

export function NewsCard({ item }: NewsCardProps) {
  return (
    <Card className="group hover:border-primary/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <SentimentChip tone={item.tone as "positive" | "negative" | "neutral" | "mixed"} />
              <span className="text-xs text-muted-foreground">{item.source}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{timeAgo(item.published_at)}</span>
            </div>
            <p className="font-medium leading-tight">{item.title}</p>
            {item.summary && (
              <p className="text-sm text-muted-foreground line-clamp-2">{item.summary}</p>
            )}
          </div>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
