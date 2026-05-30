"use client";

import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type ProjectFeedbackToolbarProps = {
  feedbackMode: boolean;
  onFeedbackModeChange: (enabled: boolean) => void;
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
  commentCount: number;
};

export function ProjectFeedbackToolbar({
  feedbackMode,
  onFeedbackModeChange,
  panelOpen,
  onPanelOpenChange,
  commentCount,
}: ProjectFeedbackToolbarProps) {
  return (
    <div className="flex min-h-9 flex-wrap items-center justify-end gap-3">
      <Button
        type="button"
        variant={panelOpen ? "secondary" : "outline"}
        size="sm"
        onClick={() => onPanelOpenChange(!panelOpen)}
        className="gap-1.5"
      >
        <MessageSquare className="size-4" />
        Comments
        {commentCount > 0 ? (
          <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs tabular-nums">
            {commentCount}
          </span>
        ) : null}
      </Button>

      <div className="flex items-center gap-2">
        <Label htmlFor="project-feedback-mode-toggle" className="text-[0.8rem] text-muted-foreground">
          Feedback mode
        </Label>
        <Switch
          id="project-feedback-mode-toggle"
          checked={feedbackMode}
          aria-label="Feedback mode"
          onCheckedChange={(next) => {
            onFeedbackModeChange(next);
            onPanelOpenChange(next);
          }}
        />
      </div>
    </div>
  );
}
