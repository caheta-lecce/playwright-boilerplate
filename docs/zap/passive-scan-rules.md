# ZAP passive-scan rules

This document describes every passive-scan rule pinned in [zap-baseline.json](./zap-baseline.json). It applies to ZAP `2.17.0`, Passive Scanner `0.6.0`, and Passive Scan Rules `76.0.0`.

Passive scanning observes proxied HTTP/WebSocket traffic; it does not send attack payloads or change requests. The baseline enables every listed rule with ZAP's `DEFAULT` alert threshold. An alert is evidence to review in the specific response, not proof of a vulnerability.

| ID    | Rule                                                                    | What it examines                                                                                          |
| ----- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 10003 | Vulnerable JS Library (Powered by Retire.js)                            | JavaScript libraries and versions known to have published vulnerabilities.                                |
| 10111 | Authentication Request Identified                                       | Requests that appear to submit authentication credentials, to help identify login traffic.                |
| 10112 | Session Management Response Identified                                  | Responses that appear to establish or change session state, such as cookies or tokens.                    |
| 10113 | Verification Request Identified                                         | Requests that appear to verify whether an authenticated session is valid.                                 |
| 10020 | Anti-clickjacking Header                                                | `X-Frame-Options` and CSP `frame-ancestors` protections against framing.                                  |
| 90022 | Application Error Disclosure                                            | HTTP error responses and known server error strings that may expose implementation details.               |
| 10044 | Big Redirect Detected (Potential Sensitive Information Leak)            | Redirect responses with an unexpectedly large body or multiple links.                                     |
| 10015 | Re-examine Cache-control Directives                                     | Cache headers that might allow sensitive content to be stored or reused.                                  |
| 90011 | Charset Mismatch                                                        | Differences between declared and detected response character encodings.                                   |
| 10038 | Content Security Policy (CSP) Header Not Set                            | HTML responses without a Content-Security-Policy header.                                                  |
| 10055 | CSP                                                                     | CSP directives that are missing, malformed, weak, or conflict with one another.                           |
| 10019 | Content-Type Header Missing                                             | Responses that omit the `Content-Type` header.                                                            |
| 10010 | Cookie No HttpOnly Flag                                                 | Cookies without `HttpOnly`, which browser scripts could read.                                             |
| 90033 | Loosely Scoped Cookie                                                   | Cookie domain or path scopes that are broader than necessary.                                             |
| 10054 | Cookie without SameSite Attribute                                       | Cookies that omit the `SameSite` attribute.                                                               |
| 10011 | Cookie Without Secure Flag                                              | Cookies sent without the `Secure` attribute.                                                              |
| 10098 | Cross-Domain Misconfiguration                                           | Overly permissive cross-origin policy headers, including CORS.                                            |
| 10017 | Cross-Domain JavaScript Source File Inclusion                           | HTML scripts loaded from a different domain without an integrity signal or trusted-domain match.          |
| 10202 | Absence of Anti-CSRF Tokens                                             | State-changing HTML forms that do not contain a recognised anti-CSRF token.                               |
| 10033 | Directory Browsing                                                      | Response signatures that suggest a server directory listing is exposed.                                   |
| 10097 | Hash Disclosure                                                         | Text responses containing values that resemble password hashes.                                           |
| 10034 | Heartbleed OpenSSL Vulnerability (Indicative)                           | Response headers that indicate an OpenSSL version potentially affected by Heartbleed.                     |
| 10009 | In Page Banner Information Leak                                         | HTML banners that reveal server, framework, or environment information.                                   |
| 2     | Private IP Disclosure                                                   | Private or internal IP addresses disclosed in a response.                                                 |
| 3     | Session ID in URL Rewrite                                               | Session identifiers included in URLs, which can leak through logs, history, or referrers.                 |
| 10023 | Information Disclosure - Debug Error Messages                           | Debug exceptions, stack traces, or diagnostic error messages in responses.                                |
| 10024 | Information Disclosure - Sensitive Information in URL                   | Sensitive-looking values included in URLs.                                                                |
| 10025 | Information Disclosure - Sensitive Information in HTTP Referrer Header  | Sensitive-looking values exposed through a request's `Referer` header.                                    |
| 10027 | Information Disclosure - Suspicious Comments                            | HTML or JavaScript comments that look like credentials, TODOs, or implementation details.                 |
| 10105 | Weak Authentication Method                                              | Authentication exchanges that use weak or insecure HTTP authentication mechanisms.                        |
| 10041 | HTTP to HTTPS Insecure Transition in Form Post                          | Forms served over HTTP that submit data to HTTPS, exposing the form before submission.                    |
| 10042 | HTTPS to HTTP Insecure Transition in Form Post                          | HTTPS forms that submit to HTTP, exposing submitted data in transit.                                      |
| 90001 | Insecure JSF ViewState                                                  | JavaServer Faces ViewState values that appear unprotected or unsafe.                                      |
| 90002 | Java Serialization Object                                               | Serialized Java object data in traffic, which may merit deserialization-risk review.                      |
| 10108 | Reverse Tabnabbing                                                      | Links using `target=_blank` without safe `rel` protections.                                               |
| 10040 | Secure Pages Include Mixed Content                                      | HTTPS pages that load subresources over HTTP.                                                             |
| 10109 | Modern Web Application                                                  | Indicators of a single-page or JavaScript-heavy application; informational only.                          |
| 10062 | PII Disclosure                                                          | Values that resemble personally identifiable information, including payment-card numbers.                 |
| 10115 | Script Served From Malicious Domain (polyfill)                          | Scripts loaded from domains associated with the malicious polyfill supply-chain incident.                 |
| 10050 | Retrieved from Cache                                                    | Responses apparently served from an intermediary or browser cache.                                        |
| 10036 | HTTP Server Response Header                                             | `Server` header values that disclose web-server technology.                                               |
| 10035 | Strict-Transport-Security Header                                        | Missing, malformed, or weak HTTP Strict Transport Security settings.                                      |
| 90003 | Sub Resource Integrity Attribute Missing                                | Cross-origin scripts or styles that lack an `integrity` attribute.                                        |
| 10096 | Timestamp Disclosure                                                    | Timestamps in responses that may expose internal timing or data details.                                  |
| 10030 | User Controllable Charset                                               | User-controlled character-set values that can affect browser interpretation.                              |
| 10029 | Cookie Poisoning                                                        | Cookie values or scopes that could allow an attacker to influence another user's cookie state.            |
| 10031 | User Controllable HTML Element Attribute (Potential XSS)                | Reflected input that reaches an HTML attribute and could become client-side script execution.             |
| 10043 | User Controllable JavaScript Event (XSS)                                | Reflected input reaching a JavaScript event handler; requires manual exploitability review.               |
| 10028 | Off-site Redirect                                                       | User-controlled values that appear to redirect the browser to another site.                               |
| 10057 | Username Hash Found                                                     | Hashes of configured usernames found in responses, which can indicate possible IDOR exposure.             |
| 10032 | Viewstate                                                               | ASP.NET ViewState data that may be unsigned, unencrypted, or otherwise weakly protected.                  |
| 10061 | X-AspNet-Version Response Header                                        | `X-AspNet-Version` headers that disclose the ASP.NET version.                                             |
| 10039 | X-Backend-Server Header Information Leak                                | `X-Backend-Server` headers that disclose internal routing or infrastructure.                              |
| 10052 | X-ChromeLogger-Data (XCOLD) Header Information Leak                     | `X-ChromeLogger-Data` headers that may contain debug information.                                         |
| 10021 | X-Content-Type-Options Header Missing                                   | Responses without `X-Content-Type-Options: nosniff`.                                                      |
| 10056 | X-Debug-Token Information Leak                                          | Symfony profiler token headers that can expose debugging endpoints.                                       |
| 10037 | Server Leaks Information via X-Powered-By HTTP Response Header Field(s) | `X-Powered-By` headers that disclose application technology.                                              |
| 10116 | ZAP is Out of Date                                                      | The running ZAP version is behind the current release; an environment hygiene alert.                      |
| 10049 | Content Cacheability                                                    | Cacheability signals for content that might need a more restrictive policy.                               |
| 10110 | Dangerous JS Functions                                                  | Use of JavaScript APIs commonly associated with DOM XSS or unsafe dynamic execution.                      |
| 10063 | Permissions Policy Header Not Set                                       | Pages without a `Permissions-Policy` header limiting browser features.                                    |
| 10026 | HTTP Parameter Override                                                 | Conflicting parameter values across URL, body, cookie, or headers that servers may interpret differently. |
| 90004 | Insufficient Site Isolation Against Spectre Vulnerability               | Cross-origin isolation headers relevant to browser Spectre mitigations.                                   |
| 10099 | Source Code Disclosure                                                  | Response content that resembles source code, configuration, or unintended development artifacts.          |
| 50001 | Script Passive Scan Rules                                               | Custom ZAP passive-scan scripts; the stock installation has no finding unless a script is configured.     |
| 90030 | WSDL File Detection                                                     | Publicly reachable WSDL documents that disclose SOAP service interfaces.                                  |
| 50003 | Stats Passive Scan Rule                                                 | Passive-scan execution statistics; informational telemetry, not a vulnerability rule.                     |

## Maintaining the baseline

`npm run zap:baseline` checks that the running ZAP core, the `pscan` and `pscanrules` add-ons, and the rule ID set match the lock file. It then enforces the configured enabled state and alert threshold. When changing the baseline, update this document in the same change and record the reason in the pull request.

For rule-specific behaviour and threshold differences, consult the official ZAP Passive Scan Rules documentation: <https://www.zaproxy.org/docs/desktop/addons/passive-scan-rules/>.
