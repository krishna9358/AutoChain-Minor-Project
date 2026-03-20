import {
  Zap,
  Play,
  Globe,
  Mail,
  Database,
  GitFork,
  GitBranch,
  RefreshCw,
  Repeat,
  Brain,
  FileText,
  Clock,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Archive,
  Send,
  MessageSquare,
  Shield,
  Timer,
  RotateCcw,
  Activity,
  Pause,
  Workflow,
  Github,
  Calendar,
  Video,
  Table2,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  // Exact matches for backend catalog icon names
  Play,
  Zap,
  Globe,
  Mail,
  Database,
  GitFork,
  GitBranch,
  RefreshCw,
  Repeat,
  Brain,
  FileText,
  Clock,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Archive,
  Send,
  MessageSquare,
  Shield,
  Timer,
  RotateCcw,
  Activity,
  Pause,
  Workflow,
  Github,
  Calendar,
  Video,
  Table2,
};

const ICON_ALIASES: Record<string, string> = {
  play: "Play",
  zap: "Zap",
  globe: "Globe",
  mail: "Mail",
  database: "Database",
  gitfork: "GitFork",
  gitbranch: "GitBranch",
  refreshcw: "RefreshCw",
  repeat: "Repeat",
  brain: "Brain",
  filetext: "FileText",
  clock: "Clock",
  shieldalert: "ShieldAlert",
  alerttriangle: "AlertTriangle",
  alertcircle: "AlertCircle",
  checkcircle2: "CheckCircle2",
  usercheck: "UserCheck",
  archive: "Archive",
  send: "Send",
  messagesquare: "MessageSquare",
  shield: "Shield",
  timer: "Timer",
  rotateccw: "RotateCcw",
  activity: "Activity",
  pause: "Pause",
  workflow: "Workflow",
  github: "Github",
  calendar: "Calendar",
  video: "Video",
  table2: "Table2",
};

/**
 * Resolve a backend icon name (string) to a Lucide React component.
 * Accepts exact PascalCase names ("Brain"), lowercase ("brain"),
 * or returns a fallback icon.
 */
export function resolveIcon(name: string | undefined | null): LucideIcon {
  if (!name) return Zap;

  if (ICON_MAP[name]) return ICON_MAP[name];

  const canonical = ICON_ALIASES[name.toLowerCase().replace(/[-_ ]/g, "")];
  if (canonical && ICON_MAP[canonical]) return ICON_MAP[canonical];

  return Zap;
}

/**
 * Color palette keyed by backend component category.
 */
export const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  input: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  integration: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  ai: { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  logic: { color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  control: { color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  output: { color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  core: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()]?.color ?? "#6b7280";
}
