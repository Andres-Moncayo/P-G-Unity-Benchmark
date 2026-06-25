"""Globant Studio mapping for Service Draft (Layer 2).

Centralized rules — extend here instead of scattering hardcodes.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class StudioMatch:
    studio_name: str
    studio_focus: str
    rationale: str


# Ordered: first match wins (more specific patterns first).
_STUDIO_RULES: list[tuple[tuple[str, ...], StudioMatch]] = [
    (
        ("ai", "ml", "machine learning", "inference", "llm"),
        StudioMatch(
            studio_name="AI Studio",
            studio_focus="ML pipelines, inference optimization, and AI-assisted tooling",
            rationale="Signals reference AI/ML workloads or intelligent automation gaps.",
        ),
    ),
    (
        ("cloud", "build", "ci/cd", "deploy", "devops", "pipeline"),
        StudioMatch(
            studio_name="Cloud Ops Studio",
            studio_focus="Cloud build, CI/CD reliability, and release infrastructure",
            rationale="Issue pattern aligns with cloud delivery and operational scale.",
        ),
    ),
    (
        ("rendering", "graphics", "shader", "urp", "hdrp", "dx12", "d3d", "vulkan"),
        StudioMatch(
            studio_name="Game Engineering Studio",
            studio_focus="Rendering pipelines, GPU stability, and engine performance",
            rationale="Technical friction maps to real-time rendering and graphics stacks.",
        ),
    ),
    (
        ("mobile", "android", "ios", "device"),
        StudioMatch(
            studio_name="Mobile Engineering Studio",
            studio_focus="Mobile performance, platform permissions, and device compatibility",
            rationale="Affected platforms and device reach indicate mobile engineering scope.",
        ),
    ),
    (
        ("network", "multiplayer", "netcode", "latency"),
        StudioMatch(
            studio_name="Connected Experiences Studio",
            studio_focus="Networking, multiplayer stability, and live service reliability",
            rationale="Connectivity and session stability are the dominant risk vectors.",
        ),
    ),
    (
        ("finance", "pricing", "runtime fee", "subscription", "churn"),
        StudioMatch(
            studio_name="Customer Success & Monetization Studio",
            studio_focus="Pricing strategy, retention programs, and enterprise success",
            rationale="Business category and churn signals require monetization-focused response.",
        ),
    ),
    (
        ("security", "permission", "privacy", "compliance"),
        StudioMatch(
            studio_name="Platform Security Studio",
            studio_focus="Security hardening, compliance, and permission models",
            rationale="Risk is concentrated in security posture and regulatory exposure.",
        ),
    ),
]

_DEFAULT_STUDIO = StudioMatch(
    studio_name="Game Engineering Studio",
    studio_focus="Cross-functional game engineering and platform stabilization",
    rationale="Default mapping for product/technical issues without a narrower studio match.",
)


def _blob(*parts: str | None) -> str:
    return " ".join(p for p in parts if p).lower()


def resolve_globant_studio(
    *,
    bug_category: str | None,
    business_category: str | None,
    alert_type: str | None,
    title: str | None,
    summary: str | None,
) -> StudioMatch:
    text = _blob(bug_category, business_category, alert_type, title, summary)
    for keywords, studio in _STUDIO_RULES:
        if any(kw in text for kw in keywords):
            return studio
    if business_category == "finance":
        return _STUDIO_RULES[5][1]
    if business_category == "ecosystem":
        return StudioMatch(
            studio_name="Ecosystem Partnerships Studio",
            studio_focus="Partner integrations, marketplace, and third-party SDK alignment",
            rationale="Ecosystem category indicates partner/SDK coordination needs.",
        )
    return _DEFAULT_STUDIO
