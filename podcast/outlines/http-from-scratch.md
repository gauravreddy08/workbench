# Outline: http-from-scratch

Source: src/lessons/http-from-scratch.mdx. Curriculum: "HTTP from scratch." What is HTTP really,
under the frameworks?

## The one big idea

HTTP is a few lines of plain text written into a pipe that has no idea where messages begin or end.
So almost everything in HTTP, and most HTTP bugs, comes down to one question: where does this
thing end? The blank line ends the headers; the length (or size-labelled pieces) ends the body.
Keep-alive, framework layering and the newer versions all follow from that.

## Opening scene

The interviewer asks in passing: could you spin up an API in Python without a framework? He's
shipped a dozen FastAPI services; the honest answer in the moment is "I'd pip install fastapi".

## Wrong mental model B voices

- A request arrives as some kind of object; FastAPI is "the server".
- The pipe delivers messages (one read equals one request).
- Later: HTTP/2 must mean a different meaning of requests.

## Story beats

1. Interview question; what actually arrives? Bytes in a pipe; TCP keeps order but knows nothing
   about messages.
2. Origin: Berners-Lee at CERN; the first version was a single line, GET and a path; no status, no
   headers, no "not found". Everything since was added because the web outgrew that line.
3. Shape of a request: first line, labelled lines, the blank line (the most important line), body.
4. Where does the body end? It counts. Lie about the count: hang, or leftovers glue onto the next
   request (my server read a garbage method and answered confidently). Same disagreement between a
   proxy and a server is request smuggling.
5. Don't know the length yet (an LLM)? Send pieces each labelled with its size; a zero-size piece
   ends it. That's what streaming tokens ride on.
6. Status families: first digit says whose problem it is; client errors aren't worth retrying,
   server errors might be. Gateway errors come from the proxy, not your app's logs.
7. Keep-alive: reuse the pipe; your server must loop and keep leftover bytes. Silent client freezes
   a one-at-a-time server; threads or asyncio fix it. Break: ran out of ports from fresh connections.
8. What a framework adds: uvicorn owns the socket and the text; ASGI is the narrow handoff; FastAPI
   adds routing, validation, docs. None of that is HTTP. Measured: each layer costs a little, noise
   next to an LLM call. HTTP/2 and three: same meaning, new packaging.

## Numbers worth saying

- nineteen ninety-one (the one-line protocol)
- "a few times faster" for reusing a connection on localhost, far more over a network

## Left to the written lesson

The full status code table, method safety table, header details (Cache-Control, ETag, CORS),
hex chunk sizes, the server's behaviour spec, every task and command, all benchmark numbers, the
ab/HTTP one point oh keep-alive surprise, Slowloris, HPACK and QUIC details, WSGI.
