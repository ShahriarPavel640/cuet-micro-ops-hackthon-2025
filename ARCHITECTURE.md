sequenceDiagram
    participant U as User (Frontend)
    participant A as API Service
    participant Q as Redis Queue (BullMQ)
    participant W as Worker Service
    participant S3 as Object Storage

    Note over U, A: Phase 1: Initiation
    U->>A: POST /download/start (Request File)
    A->>Q: Add Job {id: 123, type: "report"}
    A->>U: HTTP 202 Accepted { jobId: "123" }

    Note over U, A: Phase 2: Polling & Processing
    par Async Processing
        W->>Q: Process Job 123
        W->>W: Generate File (10s - 120s)
        W->>S3: Upload File
        W->>Q: Update Job Status: "COMPLETED" + S3_URL
    and Client Polling
        loop Every 3 seconds
            U->>A: GET /download/status/123
            alt Job Pending/Processing
                A->>U: { status: "processing", progress: 50% }
            else Job Completed
                A->>U: { status: "completed", downloadUrl: "https://s3..." }
            end
        end
    end

    Note over U, S3: Phase 3: Direct Download
    U->>S3: GET /signed-url-path (Download File)