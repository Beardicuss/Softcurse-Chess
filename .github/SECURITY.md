# Security Policy

The Softcurse Lab team takes the security of `Softcurse's Chess` extremely seriously. While this project fundamentally operates as a client-side WebGL instance without heavy server-side dependency chains, isolating execution dependencies to avoid malicious overrides remains a top priority.

## Supported Versions

Only the major versions listed below are actively maintained for critical security patching:

| Version | Supported          |
| ------- | ------------------ |
| v1.6.x  | ✅                  |
| v1.5.x  | ❌                  |
| < v1.5  | ❌                  |

## Reporting a Vulnerability

**DO NOT** open a public issue on GitHub to report a suspected security vulnerability. Public disclosure before a patch exists can put our community at risk.

If you believe you have found a security vulnerability, please immediately report it directly to our maintainers at:
**info@softcurselab.com**

Please include the following information in your report:
* A detailed description of the suspected vulnerability.
* Clear, step-by-step instructions to reproduce the issue.
* An assessment of the potential impact (e.g., prototype pollution via AI LocalStorage mapping).
* Proof-of-concept (PoC) code, logs, or screenshots to accelerate validation.

## Response Timeline

We commit to the following handling SLA metrics:
* **Acknowledgement**: Within 48 hours.
* **Initial Assessment**: Complete validation within 7 days.
* **Patch or Mitigation**: Deployed securely within 90 days of confirmation.
* **Public Disclosure**: Coordinated immediately following the patch release.

## Security Advisories

All verified vulnerabilities and corresponding mitigations will be publicly cataloged utilizing [GitHub Security Advisories](https://github.com/Beardicuss/Softcurse-Chess/security/advisories) natively. 

## Out of Scope

The following matters are strictly considered outside the bounds of this security policy and do not qualify as vulnerabilities:
- Social engineering (e.g., phishing).
- Resource exhaustion/Denial of Service (DoS) attacking free-tier client-side WebGL constraints.
- Theoretical issues lacking realistic exploitation pathways or PoCs.
- Bugs present only in EOL (End-of-Life) releases.

## Bug Bounty

At this time, Softcurse Lab does **not** operate a paid bug bounty program. We are incredibly grateful to researchers who help secure this open-source project and will provide formal credit inside our release advisories.

## Security Best Practices for Contributors

* **Dependency Pinning**: Ensure any newly introduced `npm` packages are strictly pinned inside `package-lock.json`.
* **No Secrets**: Never commit `.env` configurations, personal tokens, or API credentials to the repository.
* **PR Sanitization**: Aggressively verify that any test snapshots or telemetry mockups do not contain real user credentials before initiating a pull request.
