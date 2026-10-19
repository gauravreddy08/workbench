# Outline: ssh-and-tailscale

Source: src/lessons/ssh-and-tailscale.mdx. Curriculum: "Your home server, explained." What actually
happens when I SSH into my home server over Tailscale?

## The one big idea

Two different jobs are stacked up. SSH makes a connection trustworthy: a fresh shared secret, the
server proving it's your server, you proving you're you. Tailscale makes the connection possible
at all: your home router drops anything it didn't ask for, so Tailscale gets both sides to call out
to each other at the same moment, using a phone book that only ever holds public keys. Neither
needs the other, and each layer protects something different.

## Opening scene

He typed ssh to his home server from a café and it worked. Two moments he can't explain: the "are
you sure you want to continue connecting" prompt he said yes to, and how a packet got into a house
whose router is built to keep it out, without him opening anything.

## Wrong mental model B voices

- "Typing yes is a formality" / "the changed host key warning means I'm hacked".
- "Tailscale is a VPN server my traffic goes through, so Tailscale can read it."
- "Just forward the port on the router."

## Story beats

1. The café, the yes prompt, the house built to keep packets out. Three old ideas stacked.
2. Origin: a password sniffer at a Finnish university in nineteen ninety-five; Ylönen writes Secure
   Shell, gets port twenty-two between FTP and telnet. Twenty years later: encryption solved,
   reachability not. WireGuard; Tailscale founded to make every device reach every other directly.
3. A program waiting by the door (sshd). The handshake: same paint trick as HTTPS, fresh each time;
   the server signs to prove identity; trust on first use is what "yes" meant. The scary warning:
   innocent reasons (reinstall) versus the bad one; check the fingerprint at the server.
4. Keys not passwords: nothing to guess, server never sees the secret, signature tied to this
   session, one line per laptop to revoke. Agent forwarding risk in a sentence.
5. One connection, many pipes: the forward that makes Jupyter on the Spark show up on the laptop
   while staying invisible to every network.
6. Why the café can't see your house: one public address, the router keeps notes of what went out,
   anything without a note is dropped. Accidentally great security. Port forwarding opens it to
   every bot, including pre-login bugs like regreSSHion.
7. WireGuard: whole packets encrypted inside small UDP packets, silent to strangers, a virtual
   network card so sshd needed no changes. Tailscale: phone book (control server with public keys
   only) plus the hole punch (both call out at once; the other's packet looks like a reply).
8. When punching fails: relay servers forward still-encrypted packets; every connection starts on
   the relay and upgrades. What Tailscale can and can't see. Encrypted twice, and why that's fine.

## Numbers worth saying

- nineteen ninety-five, port twenty-two

## Left to the written lesson

Exact config files and settings table, drop-in ordering, ufw and fail2ban rules, CGNAT address
ranges, STUN naming detail, hard NAT netcheck field, packet length arithmetic, SSH connect timings,
MagicDNS, ACLs, Tailscale SSH, key expiry, all tasks and Break It steps.
