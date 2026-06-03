"""Reddit collector via PRAW."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from belfort import config
from belfort.sentiment.models import Mention
from belfort.sentiment.symbols import SymbolConfig


def _reddit_available() -> bool:
    return bool(config.REDDIT_CLIENT_ID and config.REDDIT_CLIENT_SECRET and config.REDDIT_USER_AGENT)


def _get_reddit():
    import praw

    return praw.Reddit(
        client_id=config.REDDIT_CLIENT_ID,
        client_secret=config.REDDIT_CLIENT_SECRET,
        user_agent=config.REDDIT_USER_AGENT,
    )


def collect_reddit(cfg: SymbolConfig, max_age_hours: int = 168) -> list[Mention]:
    if not _reddit_available():
        return []

    cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
    mentions: list[Mention] = []
    reddit = _get_reddit()
    seen_ids: set[str] = set()

    def add_post(submission) -> None:
        if submission.id in seen_ids:
            return
        created = datetime.fromtimestamp(submission.created_utc, tz=timezone.utc)
        if created < cutoff:
            return
        text = f"{submission.title}"
        if getattr(submission, "selftext", None):
            text += f" {submission.selftext}"
        if len(text.strip()) < 10:
            return
        seen_ids.add(submission.id)
        mentions.append(Mention(text=text[:2000], created_at=created, source="reddit"))

    for sub_name in cfg.subreddits:
        try:
            sub = reddit.subreddit(sub_name)
            for submission in sub.hot(limit=config.REDDIT_POST_LIMIT):
                add_post(submission)
        except Exception:
            continue

    for kw in cfg.keywords:
        try:
            for submission in reddit.subreddit("CryptoCurrency").search(
                kw, sort="new", time_filter="week", limit=config.REDDIT_POST_LIMIT
            ):
                add_post(submission)
        except Exception:
            continue

    return mentions
