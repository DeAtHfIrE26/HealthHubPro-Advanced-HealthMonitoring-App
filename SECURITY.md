# Security policy

## What is in this repository

Presentational React components, hooks, formatting helpers and two file
parsers. There is **no server, no database, no authentication and no network
client** here, and no credentials of any kind. The playground runs entirely
in the browser on synthetic data.

That narrows the realistic attack surface to roughly three things:

1. **The parsers.** They read untrusted files — an `export.xml` or a CSV a
   user picked. They run in the browser, never write to disk, and never
   execute anything they read. The Apple Health parser deliberately scans
   with a regex instead of `DOMParser`, which also means it does not resolve
   external entities. A crafted file that causes a crash, a hang, or
   unbounded memory growth is a valid report.
2. **Rendering untrusted strings.** Everything goes through React's escaping;
   there is no `dangerouslySetInnerHTML` anywhere. A way around that is a
   valid report.
3. **Dependencies.** See below.

## Supported versions

The latest release on `main`. This is a showcase library, so there are no
long-term support branches.

## Reporting a vulnerability

**Please do not open a public issue.**

Use GitHub's private reporting:
[Report a vulnerability](https://github.com/DeAtHfIrE26/healthhubpro-showcase/security/advisories/new)

Or email **kashyappatel2673@gmail.com** with `SECURITY` in the subject.

Please include what you can: the version or commit, a reproduction (a file
that triggers it is ideal), and what an attacker gets out of it.

**What to expect:** acknowledgement within 72 hours, an assessment within
seven days, and credit in the release notes unless you would rather not have
it. If a fix takes longer than 30 days you will get an explanation rather
than silence.

## Out of scope

- Findings in the private application this was extracted from. Report those
  to the same address, but they are a different codebase.
- Dependency advisories with no exploitable path through this library —
  please still open a normal issue so the version can be bumped.
- Anything that needs an attacker to already control the page.
