def generate_playbook(alert):
    return f"""
1. Investigate IP {alert['src_ip']}
2. Block suspicious login attempts
3. Reset credentials
"""