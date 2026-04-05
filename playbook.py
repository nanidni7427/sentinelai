import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def generate_playbook(incident: dict) -> str:
    threat      = incident.get("threat_type", "unknown").replace("_", " ").title()
    severity    = incident.get("severity", "Unknown")
    src_ip      = incident.get("src_ip", "N/A")
    dst_ip      = incident.get("dst_ip", "N/A")
    mitre_id    = incident.get("mitre_id", "N/A")
    mitre_tactic = incident.get("mitre_tactic", "N/A")
    explanation = incident.get("explanation", "No details")
    correlated  = incident.get("correlated", False)
    layer       = incident.get("layer", "network")

    prompt = f"""You are a senior SOC analyst.
Incident detected:
- Threat: {threat}
- Severity: {severity}
- Source IP: {src_ip}
- Destination IP: {dst_ip}
- Layer: {layer}
- MITRE: {mitre_id} ({mitre_tactic})
- Cross-layer correlated: {correlated}
- Details: {explanation}

Write a 5-step incident response playbook.
Format: STEP N — TITLE: action
Cover: containment, investigation, eradication, recovery, prevention.
Be specific to this incident. Max 2-3 sentences per step."""

    try:
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text
    except Exception as e:
        return f"Playbook error: {e}\nManual response required for {threat} from {src_ip}."