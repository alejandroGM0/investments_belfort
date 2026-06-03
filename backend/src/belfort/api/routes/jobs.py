from fastapi import APIRouter, HTTPException

from belfort.jobs import queue as q

router = APIRouter()


@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    job = q.get(job_id)
    if job is None:
        raise HTTPException(404, f"Job {job_id} not found")
    return job
