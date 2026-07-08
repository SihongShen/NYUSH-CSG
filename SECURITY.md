# Security Policy

This platform stores real user data (NYU email addresses and anonymous review records). If you discover a security vulnerability, thank you for reporting it responsibly.

## How to Report

**Please do not discuss security vulnerabilities in public issues** (disclosure before a fix puts all users at risk).

Use GitHub's private vulnerability reporting: repository page → **Security** tab → **Report a vulnerability**.
When reporting, please include if possible: reproduction steps, impact scope (what data can be read/modified), and what you believe the root cause is.

## Issue Types We Care About Most

- Anonymity breaks: any way to link an anonymous ID back to a real email/identity
- Unauthorized reads/writes: bypassing RLS to read others' data, or modifying others' reviews/votes
- Auth bypass: any way for non-@nyu.edu accounts to enter the system
- Injection: executing unintended queries through search, forms, or other inputs

## Supported Versions

| Version | Supported |
|---|---|
| 0.1.x (current beta) | ✅ |

## Response Expectations

This is a student-maintained open-source project with no full-time security team — we will do our best to acknowledge reports within 7 days and fix them as quickly as severity warrants. Please do not disclose details before a fix is released.
