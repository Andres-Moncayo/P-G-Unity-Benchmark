"""Seed script: inserts realistic competitor analyzed_posts for Unreal Engine and Godot.

Run from the project root:
    python scripts/seed_competitor_posts.py

The script is idempotent — it skips insertion if competitor posts already exist.
Platform values match the DB convention: "Unreal Engine", "Godot".
"""
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Mirrors core/database.py: POSTGRES_URL overrides DATABASE_URL if set
DB_URL = os.getenv("POSTGRES_URL") or os.getenv("DATABASE_URL")
if not DB_URL:
    print("ERROR: neither POSTGRES_URL nor DATABASE_URL is set in environment.")
    sys.exit(1)

engine = create_engine(DB_URL)
Session = sessionmaker(bind=engine)

POSTS = [
    # ── Unreal Engine — high alert ──────────────────────────────────────────
    {
        "title": "Epic Games announces free Unreal Engine 5.4 for all developers",
        "summary": "Epic Games removes royalty fees for games earning under $1M, making UE5 fully free for indie studios. This directly threatens Unity's indie and mobile market.",
        "url": "https://www.unrealengine.com/en-US/blog/ue54-launch",
        "date_post": "2025-03-15",
        "platform": "Unreal Engine",
        "sentimental": "positive",
        "bug": None,
        "performance": "high",
        "churn_risk": "true",
        "churn_percentage": 28,
        "promotor": 85,
        "detractor": 5,
        "alert_type": "high",
        "financial_data": None,
    },
    {
        "title": "Unreal Engine 5 Nanite system outperforms Unity HDRP in AAA benchmarks",
        "summary": "Independent benchmark tests show UE5 Nanite virtualised geometry delivers 40% higher polygon throughput than Unity HDRP, causing several AAA studios to reconsider engine choice.",
        "url": "https://www.gamedeveloper.com/ue5-nanite-benchmark",
        "date_post": "2025-04-02",
        "platform": "Unreal Engine",
        "sentimental": "negative",
        "bug": None,
        "performance": "high",
        "churn_risk": "true",
        "churn_percentage": 35,
        "promotor": 72,
        "detractor": 18,
        "alert_type": "high",
        "financial_data": None,
    },
    {
        "title": "Epic Games acquires Fab marketplace, expanding UE5 asset ecosystem",
        "summary": "Epic's acquisition of the Fab marketplace consolidates asset sales and threatens Unity Asset Store's revenue base, pulling creators and buyers to the Unreal ecosystem.",
        "url": "https://www.epicgames.com/site/en-US/news/fab-acquisition",
        "date_post": "2025-02-20",
        "platform": "Unreal Engine",
        "sentimental": "negative",
        "bug": None,
        "performance": None,
        "churn_risk": "true",
        "churn_percentage": 22,
        "promotor": 60,
        "detractor": 25,
        "alert_type": "high",
        "financial_data": None,
    },
    {
        "title": "UE5 mobile rendering enters Unity's core market with 30% GPU efficiency gain",
        "summary": "Epic releases mobile-optimised rendering path reducing GPU overdraw by 30% on iOS/Android, entering Unity's strongest market segment for the first time with competitive performance.",
        "url": "https://forums.unrealengine.com/t/ue5-mobile-5-4-1",
        "date_post": "2025-05-01",
        "platform": "Unreal Engine",
        "sentimental": "positive",
        "bug": None,
        "performance": "high",
        "churn_risk": "true",
        "churn_percentage": 18,
        "promotor": 68,
        "detractor": 12,
        "alert_type": "high",
        "financial_data": None,
    },
    # ── Unreal Engine — middle alert ─────────────────────────────────────────
    {
        "title": "Epic Games partners with Samsung for exclusive UE5 mobile optimizations",
        "summary": "Samsung partnership gives UE5 access to hardware-level GPU profiling tools on Galaxy devices, strengthening Unreal's position in the mobile gaming segment.",
        "url": "https://news.samsung.com/epic-ue5-partnership",
        "date_post": "2025-01-18",
        "platform": "Unreal Engine",
        "sentimental": "positive",
        "bug": None,
        "performance": "high",
        "churn_risk": None,
        "churn_percentage": None,
        "promotor": 55,
        "detractor": 8,
        "alert_type": "middle",
        "financial_data": None,
    },
    {
        "title": "UE5 Blueprint system criticized for runtime performance in large projects",
        "summary": "Community discussions highlight Blueprint VM overhead causing 15-20% CPU spikes in open-world UE5 games, with developers recommending C++ migration for performance-critical code.",
        "url": "https://reddit.com/r/unrealengine/blueprint-performance",
        "date_post": "2025-03-28",
        "platform": "Unreal Engine",
        "sentimental": "negative",
        "bug": "performance",
        "performance": "low",
        "churn_risk": None,
        "churn_percentage": None,
        "promotor": 20,
        "detractor": 45,
        "alert_type": "middle",
        "financial_data": None,
    },
    {
        "title": "Epic Games launches Unreal Fellowship education program targeting universities",
        "summary": "The Unreal Fellowship initiative targets 50 universities globally with free UE5 licences and curriculum materials, directly competing with Unity for the education market segment.",
        "url": "https://www.unrealengine.com/en-US/education/fellowship",
        "date_post": "2025-04-10",
        "platform": "Unreal Engine",
        "sentimental": "positive",
        "bug": None,
        "performance": None,
        "churn_risk": None,
        "churn_percentage": None,
        "promotor": 62,
        "detractor": 10,
        "alert_type": "middle",
        "financial_data": None,
    },
    {
        "title": "Fortnite revenue decline raises questions about Epic's UE5 investment capacity",
        "summary": "Fortnite's year-over-year revenue dropped 18%, raising analyst concerns about Epic's ability to maintain the high R&D pace required to keep UE5 competitive long-term.",
        "url": "https://www.gamesindustry.biz/epic-revenue-analysis-2025",
        "date_post": "2025-02-05",
        "platform": "Unreal Engine",
        "sentimental": "negative",
        "bug": None,
        "performance": None,
        "churn_risk": None,
        "churn_percentage": None,
        "promotor": 15,
        "detractor": 40,
        "alert_type": "middle",
        "financial_data": {
            "quarter": "Q4 2024",
            "company": "Epic Games",
            "revenue_usd_millions": 1820.0,
            "source_type": "earnings_report",
        },
    },
    # ── Godot — high alert ───────────────────────────────────────────────────
    {
        "title": "Godot 4.3 hits 1 million downloads in first week — fastest adoption ever",
        "summary": "Godot 4.3 release achieved 1M downloads within 7 days, driven by Unity's runtime fee controversy. The free, open-source engine is now the top choice for indie developers migrating from Unity.",
        "url": "https://godotengine.org/article/godot-4-3-release",
        "date_post": "2025-03-10",
        "platform": "Godot",
        "sentimental": "positive",
        "bug": None,
        "performance": None,
        "churn_risk": "true",
        "churn_percentage": 40,
        "promotor": 90,
        "detractor": 3,
        "alert_type": "high",
        "financial_data": None,
    },
    {
        "title": "Godot Foundation receives $1.2M donation accelerating 2D and mobile roadmap",
        "summary": "A large donation funds a dedicated 2D renderer team for Godot, threatening Unity's dominance in 2D mobile and indie games — the segments where Unity generates most indie revenue.",
        "url": "https://godotengine.org/article/foundation-donation-2025",
        "date_post": "2025-01-25",
        "platform": "Godot",
        "sentimental": "positive",
        "bug": None,
        "performance": None,
        "churn_risk": "true",
        "churn_percentage": 32,
        "promotor": 88,
        "detractor": 4,
        "alert_type": "high",
        "financial_data": None,
    },
    {
        "title": "120+ indie studios publicly announce migration from Unity to Godot",
        "summary": "A coordinated group of 120+ indie studios announced public migration from Unity to Godot, citing Unity's unpredictable pricing as the primary reason. Reddit thread went viral with 45K upvotes.",
        "url": "https://reddit.com/r/godot/unity-migration-thread",
        "date_post": "2025-02-14",
        "platform": "Godot",
        "sentimental": "negative",
        "bug": None,
        "performance": None,
        "churn_risk": "true",
        "churn_percentage": 50,
        "promotor": 78,
        "detractor": 8,
        "alert_type": "high",
        "financial_data": None,
    },
    # ── Godot — middle alert ─────────────────────────────────────────────────
    {
        "title": "Godot 4.3 introduces C# hot-reload — major indie productivity boost",
        "summary": "Godot 4.3 ships a stable C# hot-reload system, eliminating one of Unity's last remaining advantages for C# developers. Early adopters report a 30% faster iteration cycle.",
        "url": "https://godotengine.org/article/gdextension-csharp-hotreload",
        "date_post": "2025-03-22",
        "platform": "Godot",
        "sentimental": "positive",
        "bug": None,
        "performance": "high",
        "churn_risk": "true",
        "churn_percentage": 20,
        "promotor": 75,
        "detractor": 7,
        "alert_type": "middle",
        "financial_data": None,
    },
    {
        "title": "Godot 3D rendering criticized for lack of real-time GI compared to Unity HDRP",
        "summary": "Community feedback highlights Godot 4's absence of hardware-accelerated real-time global illumination, keeping it uncompetitive for 3D AAA titles and high-fidelity simulations.",
        "url": "https://github.com/godotengine/godot/issues/gi-roadmap",
        "date_post": "2025-04-05",
        "platform": "Godot",
        "sentimental": "negative",
        "bug": "rendering",
        "performance": "low",
        "churn_risk": None,
        "churn_percentage": None,
        "promotor": 18,
        "detractor": 38,
        "alert_type": "middle",
        "financial_data": None,
    },
    {
        "title": "Godot mobile export templates cut APK size by 40% in new 4.3 release",
        "summary": "New mobile export templates reduce APK size by 40% and improve frame stability on mid-range Android devices, making Godot a viable alternative for mobile-first indie studios.",
        "url": "https://godotengine.org/article/mobile-export-4-3",
        "date_post": "2025-04-18",
        "platform": "Godot",
        "sentimental": "positive",
        "bug": None,
        "performance": "high",
        "churn_risk": None,
        "churn_percentage": None,
        "promotor": 70,
        "detractor": 9,
        "alert_type": "middle",
        "financial_data": None,
    },
]


def seed():
    from app.modules.ia_posts.models import AnalyzedPost

    with Session() as session:
        existing = (
            session.query(AnalyzedPost)
            .filter(
                AnalyzedPost.platform.in_(["Unreal Engine", "Godot"]),
                AnalyzedPost.alert_type.in_(["high", "middle"]),
            )
            .count()
        )
        if existing > 0:
            print(f"Competitor high/middle posts already exist ({existing} rows). Skipping seed.")
            return

        now = datetime.utcnow()
        records = []
        for i, post in enumerate(POSTS):
            records.append(
                AnalyzedPost(
                    title=post["title"],
                    summary=post["summary"],
                    url=post["url"],
                    date_post=post["date_post"],
                    platform=post["platform"],
                    sentimental=post["sentimental"],
                    bug=post["bug"],
                    performance=post["performance"],
                    churn_risk=post["churn_risk"],
                    churn_percentage=post["churn_percentage"],
                    promotor=post["promotor"],
                    detractor=post["detractor"],
                    alert_type=post["alert_type"],
                    financial_data=post["financial_data"],
                    created_at=now - timedelta(days=i * 3),
                )
            )

        session.add_all(records)
        session.commit()
        print(f"Seeded {len(records)} competitor posts into analyzed_posts.")


if __name__ == "__main__":
    seed()
