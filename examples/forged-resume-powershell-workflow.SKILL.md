---
name: resume-powershell-workflow
description: Resume an interrupted PowerShell workflow by rerunning the pending commands, setting the required browser timeout, and waiting for the spawned job to complete.
whenToUse: When the user says '继续' or 'continue' and the session trace shows pending pwsh tool calls plus a job_output wait step, especially for workflows involving local HTML/CSV files and script execution.
---

1. Treat '继续' as a continuation signal, not a new task.
2. Inspect the session trace to locate the last pwsh command that was issued but not yet confirmed by a job_output result.
3. Re-run that exact pwsh command, preserving file paths and command arguments from the trace.
4. If the command includes Start-Process or Import-Csv, keep those operations intact because they are part of the workflow.
5. Set the environment variable OPENCLI_BROWSER_COMMAND_TIMEOUT="180" before running script-based PowerShell commands.
6. Run any referenced PowerShell script with: pwsh -NoProfile -ExecutionPolicy Bypass -File <script path>
7. Call job_output with the job_id returned by the spawned pwsh process, using timeout_ms=600000 and wait=true so the harness waits for completion.
8. After completion, verify the expected artifacts: the HTML file was opened, the CSV data was imported, and the script finished without errors.
9. If the job fails or times out, report the error clearly and offer to retry with the same command or an adjusted timeout.
