---
title: "Tangled knotmirror: SSRF via User-Controlled Knot URL"
description: "Anyone with an account on any AT Protocol server can access HTTP servers on `localhost` of the tangled instance. The root cause is that the knotmirror proxy trusts a user-supplied field (knot) from an AT Protocol record as a literal URL, then makes an outbound HTTP GET to it from the mirror server itself."
image: "images/social-preview/tangled-knotmirror-ssrf.png"
date: 2026-05-17
---

**Status:** Fixed in [v1.14.0-alpha](https://tangled.org/tangled.org/core/tags/v1.14.0-alpha)  
**Fixed by:** [PR #1497](https://tangled.org/tangled.org/core/pulls/1497/round/1)  
**Discovered by:** Anatolij Vasilev ([tolik518](https://tangled.org/tolik518.tngl.sh))  
**Last vulnerable version/state:** v1.13.0-alpha / main@[ba18ec20d332069db4e1c187f28191fb0d9ef2ed](https://tangled.org/tangled.org/core/tree/ba18ec20d332069db4e1c187f28191fb0d9ef2ed)  
**Disclosure status:** Reported to maintainers before publication  
**CVE:** pending / not assigned  

---

## 0. Summary

Anyone with an account on any AT Protocol server can access HTTP servers on `localhost` of the tangled instance.
The root cause is that the knotmirror proxy trusts a user-supplied field (knot) from an AT Protocol record as a literal URL, then makes an outbound HTTP GET to it from the mirror server itself. 

By pointing that field (for example) at `http://127.0.0.1:7200/repos`, the server fetches its own unauthenticated internal admin panel and returns the response to the attacker. That way the attacker can access any internal HTTP services like Admin panels, Grafana dashboards or any other service that is not protected by authentication but only by network isolation.

Confirmed via limited proof-of-concept test against production on 2026-05-08. No destructive actions were performed. Accessed data contained no secrets, no PII and was minimized and not redistributed.

Affected:

- knotmirror proxy fallback path
- user-controlled `record.Knot` values
- localhost HTTP services reachable from the mirror host

**Not** confirmed / **not** part of this finding:

- direct database access
- arbitrary **non**-HTTP protocol interaction
- compromise of user data 

---

## 1. Background / Discovery notes

At work I got the task to audit multiple repositories for security issues. With all the hype around [mythos](https://red.anthropic.com/2026/mythos-preview/) we've decided to do an AI-assisted code review.  
This got me interested to also take a look into some open source repositories! Some days prior I've stumbled upon [tangled](https://tangled.org), an open-source, decentralized git forge built on top of the [AT Protocol](https://atproto.com/) (known for powering Bluesky). So tangled it was the perfect candidate for me to poke a little bit around!


I've started to look into the codebase manually first (I decided against using an agent for now, as I don't have unlimited tokens). When looking into the codebase and learning a little bit about the project, I have made [some](https://tangled.org/tangled.org/core/pulls/1430/round/0) [small](https://tangled.org/tangled.org/core/pulls/1441/round/2) [contributions](https://tangled.org/tangled.org/core/pulls/1432/round/1). 

Due to the decentralized nature it is possible to host your own knot, which is basically a host that handles git-operations. After digging a little bit more into it
I've also found out that it's possible to use `localhost` as a knot. This means that the production tangled server would try to reach its own `localhost`. This could be a potential SSRF condition. Since the infrastructure of the tangled server is somewhat transparent through the monorepo and additionally through the [infra](https://tangled.org/tangled.org/infra/tree/b58686686afc02d84c792915fc98122e5e2b371f)-repo I knew where to look next.

![](/images/blog/tangled-add-your-knot.png)

This is where I got too impatient to continue manually though and I got myself a [Claude Pro](https://claude.ai/upgrade/pro?interval=monthly) license for a month and installed the [claude cli](https://code.claude.com/docs/en/overview). Giving the agent all the information I've had it gave me a possible attack vector with a proof of concept, which I then manually verified and Bingo! I (we?) found a critical vulnerability!

---

## 2. Affected Code

### 1. Proxy URL construction — no validation on `record.Knot`

**`knotmirror/xrpc/proxy.go:117`**
```go
target := fmt.Sprintf("%s/xrpc/%s?%s", knot.baseURL, knotNSID, params.Encode())
```

`knot.baseURL` is taken directly from the AT Protocol repo record's `knot` field:

**`knotmirror/xrpc/proxy.go:78`**
```go
knotURL := record.Knot
if !strings.Contains(record.Knot, "://") {
    // only adds scheme if missing — full URLs pass through unchanged
}
```

If `record.Knot = "http://127.0.0.1:7200/repos?junk="`, the constructed target is:
```
http://127.0.0.1:7200/repos?junk=/xrpc/sh.tangled.repo.branches?repo=did%3Aplc%3A...
```

Go's HTTP client parses this as path `/repos` with query string `junk=...`. The chi router
on the admin panel matches `/repos`, ignoring the unknown `junk` query parameter.

### 2. Unauthenticated admin panel

**`knotmirror/adminpage.go:40-48`**
```go
func (s *AdminServer) Router() http.Handler {
    r := chi.NewRouter()
    r.Get("/repos", s.handleRepos())    // no auth middleware
    r.Get("/hosts", s.handleHosts())    // no auth middleware
    r.Post("/api/triggerRepoResync", s.handleRepoResyncTrigger())   // no auth
    r.Post("/api/cancelRepoResync", s.handleRepoResyncCancel())     // no auth
    return r
}
```

**`knotmirror/knotmirror.go`**
```go
logger.Info("starting admin server", "addr", cfg.AdminListen)
if err := http.ListenAndServe(cfg.AdminListen, adminpage.Router()); err != nil {
    logger.Error("admin server failed", "error", err)
}
```

The admin server binds only to `127.0.0.1` (configured as `adminListenAddr = "127.0.0.1:7200"`
in the NixOS service config), relying on network isolation as its only protection. The proxy
SSRF bypasses this entirely - the mirror machine makes the outbound HTTP request to its own
loopback interface.

---

## 3. Mitigation / Fix

The issue was fixed in [PR #1497](https://tangled.org/tangled.org/core/pulls/1497/round/1) by adding SSRF protection and validating the knotURL.  

```go
func validateKnotURL(raw string) (string, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return "", fmt.Errorf("invalid knot URL: %w", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return "", errors.New("knot URL must use http or https scheme")
	}
	if u.Path != "" && u.Path != "/" {
		return "", fmt.Errorf("knot URL must not contain a path: %q", raw)
	}
	if u.RawQuery != "" || u.Fragment != "" {
		return "", fmt.Errorf("knot URL must not contain query or fragment: %q", raw)
	}
	if u.User != nil {
		return "", fmt.Errorf("knot URL must not contain userinfo: %q", raw)
	}
	// Strip trailing slash for consistent formatting
	return strings.TrimRight(u.String(), "/"), nil
}
```

After the PR was merged a new release [v1.14.0-alpha](https://tangled.org/tangled.org/core/tags/v1.14.0-alpha) was created and deployed.

Here is the last vulnerable state of the repo: [ba18ec20d332069db4e1c187f28191fb0d9ef2ed](https://tangled.org/tangled.org/core/tree/ba18ec20d332069db4e1c187f28191fb0d9ef2ed)

---

## 4. Retest

After `v1.14.0-alpha` was deployed, the original payload no longer returned the internal HTTP/admin panel response. The public endpoint returned only:

```json
{"error":"InternalServerError","message":"failed to list branches"}
```

---

## 5. Timeline

| Date       | Event                                                                                          |
|------------|------------------------------------------------------------------------------------------------|
| 2026-05-08 | Vulnerability discovered during AI assisted code review                                        |
| 2026-05-08 | Limited proof-of-concept confirmed against `mirror.tangled.network`                            |
| 2026-05-08 | Report send to oppi.li                                                                       |
| 2026-05-10 | Report send to security@tangled.org                                                          |
| 2026-05-13 | [PR](https://tangled.org/tangled.org/core/pulls/1497/round/1) was created, merged and deployed |
| 2026-05-18 | Public responsible disclosure                                                                  |
