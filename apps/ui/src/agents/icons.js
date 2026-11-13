// Icons an agent manifest may reference by name. Add an import here to allow another lucide icon.
import { Bot, ShieldCheck, Lock, Workflow, Layers, Cpu, Zap, Terminal, Search, Receipt, Globe, LineChart } from "lucide-react";

export const AGENT_ICONS = { Bot, ShieldCheck, Lock, Workflow, Layers, Cpu, Zap, Terminal, Search, Receipt, Globe, LineChart };
export const iconFor = (name) => AGENT_ICONS[name] || Bot;
