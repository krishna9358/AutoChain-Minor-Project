"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { GoogleLogo, GitHubLogo, SlackLogo, PostgreSQLLogo } from "@/components/workflow/icons/ServiceLogos";
import { Mail, Globe, Plug, ChevronRight, Info, Circle } from "lucide-react";

interface Integration {
  name: string;
  description: string;
  icon: React.ElementType;
  status: string;
  href?: string;
  disabled?: boolean;
}

const integrations: Integration[] = [
  {
    name: "Google",
    description: "Calendar, Meet, Docs, Sheets",
    icon: GoogleLogo,
    status: "OAuth",
    href: "/dashboard/integrations/google",
  },
  {
    name: "GitHub",
    description: "Repos, issues, pull requests",
    icon: GitHubLogo,
    status: "Personal Access Token",
    href: "/dashboard/integrations/github",
  },
  {
    name: "Slack",
    description: "Messages, channels, notifications",
    icon: SlackLogo,
    status: "Webhook / Bot Token",
    href: "/dashboard/integrations/slack",
  },
  {
    name: "Database",
    description: "PostgreSQL, MySQL, MongoDB",
    icon: PostgreSQLLogo,
    status: "Connection String",
    href: "/dashboard/integrations/database",
  },
  {
    name: "Email",
    description: "SMTP, SendGrid, Mailgun",
    icon: Mail,
    status: "Coming soon",
    disabled: true,
  },
  {
    name: "HTTP / API",
    description: "REST APIs, webhooks",
    icon: Globe,
    status: "Coming soon",
    disabled: true,
  },
];

const activeIntegrations = integrations.filter((i) => !i.disabled);
const comingSoonIntegrations = integrations.filter((i) => i.disabled);

export default function IntegrationsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-6xl mx-auto">
      {/* Header section */}
      <div
        className="relative overflow-hidden rounded-3xl border p-10 mb-10 bg-gradient-to-br"
        style={{
          background: "linear-gradient(to bottom right, color-mix(in srgb, var(--primary) 8%, transparent), color-mix(in srgb, var(--primary) 2%, transparent))",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-1/4 -translate-y-1/4">
           <Plug className="w-64 h-64 text-primary" />
        </div>
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-5">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
            >
              <Plug
                className="h-7 w-7"
                style={{ color: "hsl(var(--primary))" }}
              />
            </div>
            <div>
              <h1
                className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500"
              >
                Integrations
              </h1>
              <p
                className="mt-1.5 text-sm font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                Connect external services to power your workflows
              </p>
            </div>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border shadow-sm"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <Circle
              className="h-2 w-2 fill-current"
              style={{ color: "color-mix(in srgb, var(--primary) 80%, seagreen)" }}
            />
            {activeIntegrations.length} active
          </span>
        </div>
      </div>

      {/* Connected Services */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 px-1">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "color-mix(in srgb, var(--primary) 80%, seagreen)" }}
          />
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Connected Services
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeIntegrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <button
                key={integration.name}
                type="button"
                onClick={() => {
                  if (integration.href) router.push(integration.href);
                }}
                className="group relative flex items-center gap-5 rounded-2xl border p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "hsl(var(--primary))";
                  el.style.boxShadow =
                    "0 0 0 1px var(--primary), 0 4px 24px color-mix(in srgb, var(--primary) 10%, transparent)";
                  el.style.backgroundColor = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "var(--border-subtle)";
                  el.style.boxShadow = "none";
                  el.style.backgroundColor = "var(--bg-card)";
                }}
              >
                {/* Icon pill */}
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/5 to-transparent transition-transform duration-300 group-hover:scale-110 shadow-sm"
                  style={{
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <Icon className="h-6 w-6" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className="text-base font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {integration.name}
                    </p>
                  </div>
                  <p
                    className="mt-0.5 text-sm truncate"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {integration.description}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2.5">
                    <span
                      className="inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: "hsl(var(--accent))",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {integration.status}
                    </span>
                    <span className="flex items-center gap-1">
                      <Circle
                        className="h-1.5 w-1.5 fill-current"
                        style={{
                          color: "color-mix(in srgb, var(--primary) 80%, seagreen)",
                        }}
                      />
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Ready
                      </span>
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight
                  className="h-4 w-4 shrink-0 transition-all duration-200 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
                  style={{ color: "hsl(var(--primary))" }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Coming Soon */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4 px-1">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--border-medium)" }}
          />
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Coming Soon
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {comingSoonIntegrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <div
                key={integration.name}
                className="relative flex items-center gap-5 rounded-xl border p-6 select-none"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                  opacity: 0.5,
                  cursor: "not-allowed",
                }}
              >
                {/* Coming Soon badge overlay */}
                <span
                  className="absolute top-3 right-3 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: "var(--border-subtle)",
                    color: "var(--text-muted)",
                  }}
                >
                  Coming Soon
                </span>

                {/* Icon pill */}
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: "hsl(var(--accent))",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{ color: "var(--text-muted)" }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-base font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {integration.name}
                  </p>
                  <p
                    className="mt-0.5 text-sm truncate"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {integration.description}
                  </p>
                  <div className="mt-2.5">
                    <span
                      className="inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: "var(--border-subtle)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {integration.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom help section */}
      <div
        className="flex items-center gap-3 rounded-xl border px-5 py-4"
        style={{
          backgroundColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <Info
          className="h-4 w-4 shrink-0"
          style={{ color: "var(--text-muted)" }}
        />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Need a different integration? Use{" "}
          <span
            className="font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            HTTP / API
          </span>{" "}
          nodes for custom REST endpoints.
        </p>
      </div>
    </div>
  );
}
