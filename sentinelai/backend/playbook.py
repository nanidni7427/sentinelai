"""
playbook.py — AI-powered response playbook generator using Ollama (local LLM).
Falls back to static playbooks if Ollama is unavailable.
"""

import os
import httpx
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

# ---------------------------------------------------------------------------
# Static fallback playbooks
# ---------------------------------------------------------------------------
STATIC_PLAYBOOKS = {
    "brute_force": """**BRUTE FORCE — Response Playbook**

1. **Immediate**: Block source IP at perimeter firewall (rule: deny {src_ip}/32)
2. **Account audit**: Lock targeted accounts; force password reset for affected users
3. **Rate limiting**: Enable login throttling on SSH/RDP (max 5 attempts / 5 min)
4. **Geo-block**: If IP is foreign, consider country-level block
5. **Honeypot**: Route attacker IP to honeypot for threat intelligence collection
6. **Notify**: Alert SOC tier 2 if >50 attempts; escalate to IR team if auth succeeded
7. **Log retention**: Preserve auth logs for 90 days for forensic chain-of-custody""",

    "c2_beaconing": """**C2 BEACONING — Response Playbook**

1. **Isolate**: Immediately quarantine the beaconing host from network (VLAN isolation)
2. **Block C2**: Add C2 IP/domain to DNS sinkhole and firewall deny list
3. **Memory dump**: Capture live memory image before shutdown for malware analysis
4. **IOC extraction**: Identify beacon interval, user-agent, URI patterns for detection rules
5. **Lateral check**: Scan all internal IPs for same beacon pattern (network sweep)
6. **Threat hunt**: Review SIEM for first-seen timestamp; identify patient zero
7. **Eradicate**: Wipe and rebuild host from known-good image; rotate all credentials""",

    "lateral_movement": """**LATERAL MOVEMENT — Response Playbook**

1. **Contain**: Block east-west SMB (port 445) traffic between suspect hosts
2. **Credential reset**: Invalidate all Kerberos tickets (krbtgt reset); force domain-wide password change
3. **PSExec hunt**: Scan for psexec artifacts in %TEMP% and Windows event log 4688/7045
4. **Privilege audit**: Review admin group membership; remove stale privileged accounts
5. **Segmentation**: Apply micro-segmentation between workstation and server VLANs
6. **EDR sweep**: Run EDR query for remote process execution across all endpoints
7. **Forensics**: Preserve VSS snapshots on affected hosts before any remediation""",

    "data_exfiltration": """**DATA EXFILTRATION — Response Playbook**

1. **Kill connection**: Terminate active TCP session; block destination IP/ASN
2. **DLP check**: Query DLP logs to identify file types and content transferred
3. **Classify**: Determine if transferred data included PII, IP, or regulated data (GDPR/HIPAA triggers)
4. **Legal hold**: Place email and file system on litigation hold for the source account
5. **Notify**: If regulated data confirmed — initiate breach notification procedure (72hr GDPR clock)
6. **Source trace**: Identify how attacker reached exfil host; correlate with prior alerts
7. **Revoke**: Suspend source account; rotate API keys and service credentials""",

    "anomaly": """**ML ANOMALY — Response Playbook**

1. **Triage**: Review raw traffic for the flagged source IP in SIEM (last 24 hours)
2. **Baseline check**: Compare current traffic volume/pattern against 30-day baseline
3. **Context gather**: Identify user, device, and application associated with traffic
4. **Threat intel**: Run source/destination IPs through VirusTotal and AbuseIPDB
5. **Tune or escalate**: If benign, add to allowlist and retrain model; if malicious, escalate
6. **Document**: Record anomaly characteristics for future detection rule creation""",

    "false_positive": """**FALSE POSITIVE — No Action Required**

✓ Traffic classified as expected administrative activity.
✓ Source IP and user are in the verified admin allowlist.
✓ Destination is internal — no exfiltration risk.

**Recommended**: Review this alert rule's threshold if false positives are frequent.
Log for audit trail compliance.""",
}


async def generate_playbook(alert: dict) -> str:
    """
    Generate a response playbook for the given alert.
    Tries Ollama first; falls back to static playbook.
    """
    threat_type = alert.get("threat_type", "anomaly")
    src_ip = alert.get("src_ip", "unknown")
    dst_ip = alert.get("dst_ip", "unknown")
    severity = alert.get("severity", "Medium")
    mitre_id = alert.get("mitre_id", "N/A")
    description = alert.get("description", "")

    prompt = f"""You are a senior SOC analyst. Generate a concise incident response playbook for this security alert.

Alert Details:
- Threat Type: {threat_type.replace("_", " ").title()}
- Severity: {severity}
- MITRE ATT&CK: {mitre_id}
- Source IP: {src_ip}
- Destination IP: {dst_ip}
- Description: {description}

Provide a numbered step-by-step response playbook (max 7 steps). Be specific, actionable, and reference the actual IPs where relevant. Use markdown bold for step titles."""

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.3, "num_predict": 400},
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "").strip()
    except Exception:
        # Ollama unavailable — use static playbook
        static = STATIC_PLAYBOOKS.get(threat_type, STATIC_PLAYBOOKS["anomaly"])
        return static.replace("{src_ip}", src_ip)
