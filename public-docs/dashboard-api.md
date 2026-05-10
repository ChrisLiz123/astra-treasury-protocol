# Dashboard and API

The dashboard runs locally on the server and is usually accessed through an SSH tunnel.

## Pages

```text
/
 /paper
 /queue
 /execution-queue
 /signals
 /history
 /public-docs
```

## API endpoints

```text
/api/status
/api/health
/api/treasury
/api/policy
/api/signal
/api/signal-history
/api/recent-execution
/api/action-history
/api/paper/status
/api/paper/approval-queue
/api/execution-queue
```

## Local access

```bash
ssh -L 8787:127.0.0.1:8787 root@YOUR_SERVER_IP
```

Then open:

```text
http://127.0.0.1:8787
```
