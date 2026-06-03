from fastapi import APIRouter, HTTPException, Query

from belfort.jobs import queue as q

router = APIRouter()


@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    job = q.get(job_id)
    if job is None:
        raise HTTPException(404, f"Job {job_id} not found")
    return job


@router.get("/jobs")
async def list_jobs(limit: int = Query(20, ge=1, le=100)):
    """List recent jobs (newest first)."""
    return q.list_recent(limit)
