"""Durable single-host queue. SQLite transactions arbitrate worker leases.

Requires a persistent local disk. This is not a distributed cloud queue.
"""
from __future__ import annotations

import json
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path


class QueueFull(Exception):
    pass


class JobQueue:
    def __init__(self, path: Path, capacity: int = 100, per_owner: int = 3):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path, self.capacity, self.per_owner = path, capacity, per_owner
        with self.connect() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.execute("""CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY, owner TEXT NOT NULL, payload TEXT NOT NULL,
                status TEXT NOT NULL, created REAL NOT NULL, available REAL NOT NULL,
                lease REAL NOT NULL DEFAULT 0, token TEXT, attempts INTEGER NOT NULL DEFAULT 0)""")
            db.execute('CREATE INDEX IF NOT EXISTS jobs_pending ON jobs(status, available, created)')

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def submit(self, case_id: str, owner: str, payload: dict):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            pending = db.execute("SELECT owner FROM jobs WHERE status IN ('queued','running')").fetchall()
            if len(pending) >= self.capacity or sum(r['owner'] == owner for r in pending) >= self.per_owner:
                raise QueueFull("The review queue is busy. Please try again shortly.")
            now = time.time()
            db.execute("INSERT INTO jobs (id,owner,payload,status,created,available) VALUES (?,?,?,'queued',?,?)",
                       (case_id, owner, json.dumps(payload), now, now))

    def claim(self):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            now = time.time()
            row = db.execute("""SELECT * FROM jobs WHERE (status='queued' AND available<=?)
                OR (status='running' AND lease<?) ORDER BY created LIMIT 1""", (now, now)).fetchone()
            if row is None:
                return None
            token = uuid.uuid4().hex
            db.execute("UPDATE jobs SET status='running', lease=?, token=?, attempts=attempts+1 WHERE id=?",
                       (now + 120, token, row['id']))
            return {**dict(row), 'payload': json.loads(row['payload']), 'token': token,
                    'attempts': row['attempts'] + 1}

    def renew(self, job):
        with self.connect() as db:
            db.execute("UPDATE jobs SET lease=? WHERE id=? AND token=? AND status='running'",
                       (time.time() + 120, job['id'], job['token']))

    def finish(self, job, *, retry=False):
        with self.connect() as db:
            db.execute("UPDATE jobs SET status=?, available=?, lease=0 WHERE id=? AND token=?",
                       ('queued' if retry else 'complete', time.time() + min(30, 2 ** job['attempts']),
                        job['id'], job['token']))

    def status(self, case_id):
        with self.connect() as db:
            row = db.execute("SELECT status, attempts FROM jobs WHERE id=?", (case_id,)).fetchone()
            return dict(row) if row else None
