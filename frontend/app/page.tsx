"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Zap,
  ArrowRight,
  Workflow,
  Bot,
  Eye,
  Shield,
  Sparkles,
  Play,
  CheckCircle2,
  Code2,
  Database,
  MessageSquare,
  BarChart3,
  Users,
  Clock,
  Zap as ZapIcon,
  ChevronRight,
  Star,
  TrendingUp,
  Puzzle,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const IS_DEV = process.env.NEXT_PUBLIC_DEV_MODE === "true";

// Feature data
const features = [
  {
    icon: Workflow,
    title: "Visual Workflow Builder",
    description:
      "Drag-and-drop interface to design complex workflows with ease. No coding required.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Generation",
    description:
      "Describe your workflow in plain English and let AI create it for you instantly.",
    color: "from-accent-500 to-pink-500",
  },
  {
    icon: Bot,
    title: "Multi-Agent Architecture",
    description:
      "Specialized AI agents for extraction, classification, reasoning, and decision making.",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: Eye,
    title: "Full Observability",
    description:
      "Real-time logs, execution traces, and step-by-step replay of every workflow run.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "JWT authentication, workspace isolation, RBAC, and comprehensive audit trails.",
    color: "from-primary to-secondary-500",
  },
  {
    icon: ZapIcon,
    title: "Scalable Architecture",
    description:
      "Event-driven processing with distributed workers for maximum performance.",
    color: "from-yellow-500 to-orange-500",
  },
];

// Integration data
const integrations = [
  { name: "Slack", icon: MessageSquare, users: "10M+" },
  { name: "OpenAI", icon: Sparkles, users: "100M+" },
  { name: "PostgreSQL", icon: Database, users: "1M+" },
  { name: "GitHub", icon: Code2, users: "100M+" },
  { name: "Salesforce", icon: Users, users: "150K+" },
  { name: "Google", icon: Layers, users: "2B+" },
];

// Testimonial data
const testimonials = [
  {
    name: "Sarah Chen",
    role: "VP of Engineering, TechCorp",
    avatar: "SC",
    content:
      "AutoChain has transformed how we automate our processes. What used to take weeks now takes hours.",
    rating: 5,
  },
  {
    name: "Michael Rodriguez",
    role: "CTO, StartupXYZ",
    avatar: "MR",
    content:
      "The visual builder combined with AI generation is a game-changer. Our team can build complex workflows without engineers.",
    rating: 5,
  },
  {
    name: "Emily Watson",
    role: "Operations Manager, Global Inc",
    avatar: "EW",
    content:
      "The observability features are incredible. We can track every step of our workflows and optimize in real-time.",
    rating: 5,
  },
];

// Stats data
const stats = [
  { value: "10M+", label: "Workflows Executed" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "500+", label: "Pre-built Integrations" },
  { value: "50K+", label: "Active Users" },
];

export default function LandingPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (IS_DEV) {
      localStorage.setItem("token", "dev-demo-token");
      localStorage.setItem(
        "user",
        JSON.stringify({ name: "Dev User", email: "dev@autochain.ai" }),
      );
      document.cookie = `autochain-auth-token=dev-demo-token; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      router.push("/dashboard");
    }
  }, [router]);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="absolute top-0 -left-4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              AutoChain
            </span>
            <Badge variant="secondary" className="ml-2 text-xs">
              v2.0
            </Badge>
          </div>

          <div className="hidden md:flex items-center space-x-6 text-sm">
            <a
              href="#features"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#integrations"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Integrations
            </a>
            <a
              href="#pricing"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </a>
            <a
              href="#docs"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Docs
            </a>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              onClick={() => router.push("/login")}
              className="hidden md:flex"
            >
              Sign In
            </Button>
            <Button onClick={() => router.push("/signup")} className="group">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container px-4 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center space-x-2 rounded-full border bg-muted/50 px-4 py-2 text-sm mb-8"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium">AI-Powered Workflow Automation</span>
            <Badge variant="secondary" className="ml-2">
              New
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
          >
            Build AI Workflows
            <span className="block text-primary">
              Without Writing Code
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Design multi-agent workflows visually, generate them with natural
            language, and monitor with full observability. Transform your
            business processes in minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              onClick={() => router.push("/signup")}
              className="h-12 px-8 text-base group"
            >
              Start Building Free
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="h-12 px-8 text-base"
            >
              <Play className="mr-2 h-4 w-4" />
              Watch Demo
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>No credit card required</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Free forever plan</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>14-day trial</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-5xl mx-auto"
        >
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="container px-4 py-24 bg-muted/30">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-16">
            <Badge className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Everything You Need to Automate
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed for teams who want to move fast and
              scale confidently.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 group">
                  <CardHeader>
                    <div
                      className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                    >
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl mb-2">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Integrations Section */}
      <section id="integrations" className="container px-4 py-24">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <Badge className="mb-4">Integrations</Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Connect Your Entire Stack
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Seamlessly integrate with 500+ apps and services. From CRMs to
            databases, from AI tools to communication platforms.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-5xl mx-auto">
          {integrations.map((integration, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="text-center hover:shadow-lg transition-all duration-300 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
                    <integration.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="font-semibold text-sm">
                    {integration.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {integration.users} users
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Button variant="outline" size="lg" className="group">
            View All Integrations
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="container px-4 py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Three Simple Steps to Automation
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From idea to automation in minutes, not months.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Design Your Workflow",
                description:
                  "Use our visual builder to drag and drop nodes, connect them, and configure each step.",
                icon: Puzzle,
              },
              {
                step: "02",
                title: "Or Let AI Build It",
                description:
                  "Describe what you want in plain English, and our AI will generate the entire workflow for you.",
                icon: Sparkles,
              },
              {
                step: "03",
                title: "Deploy & Monitor",
                description:
                  "Deploy with one click and monitor execution in real-time with comprehensive observability.",
                icon: TrendingUp,
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="text-6xl font-bold text-primary/10 absolute -top-8 -left-4">
                  {item.step}
                </div>
                <Card className="h-full">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl mb-2">{item.title}</CardTitle>
                    <CardDescription className="text-base">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container px-4 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Loved by Teams Worldwide
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of teams who trust AutoChain for their automation
              needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                    <CardDescription className="text-base leading-relaxed">
                      &ldquo;{testimonial.content}&rdquo;
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {testimonial.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm">
                          {testimonial.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {testimonial.role}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container px-4 py-24 bg-muted/30">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Ready to Automate Your Workflows?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start building today with our free plan. No credit card required.
            Upgrade when you&rsquo;re ready to scale.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => router.push("/signup")}
              className="h-12 px-8 text-base group"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="h-12 px-8 text-base"
            >
              <Play className="mr-2 h-4 w-4" />
              Try Demo
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Zap className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold">AutoChain</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                AI-powered workflow automation platform for modern teams.
              </p>
              <div className="flex gap-4">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Code2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Users className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Integrations
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Changelog
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    API Reference
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Community
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <Separator className="my-8" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>© 2025 AutoChain AI</span>
              <Separator orientation="vertical" className="h-4" />
              <a href="#" className="hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy
              </a>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>All systems operational</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <a href="#" className="hover:text-foreground transition-colors">
                Status
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
