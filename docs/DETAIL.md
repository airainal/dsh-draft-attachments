# Draft attachments

When you attach an image or a file to a message and then switch to another
session before sending, DSH keeps the typed text but loses the attachments. The
draft snapshot stored in the browser only carries text, reference chips, quotes
and a command token, while attachments live in the Conversation service and are
released when the session scope is disposed.

This plugin adds a persistent per-session attachment store:

1. The composer's `conversation.input.attachments` rail is replaced by a rail
   that renders the same draft (image thumbnails, file cards, upload state and
   retry) and observes the browser-owned `File` objects.
2. Whenever the rail changes, the files are written to IndexedDB under the
   current session id.
3. When the rail becomes empty, the stored copy is deleted, so a sent message
   leaves nothing behind.
4. Opening a session restores its stored files through the composer's own
   `onAddFiles` intake, so image limits, uploads and submission remain the
   shipped behavior.
5. The document-level file drop route is kept.

## What it does not do

- It does not modify the Host session log, message history or the text draft
  mechanism.
- It does not reuse old Host upload receipts: restored files are uploaded again.
- It does not restore attachments for a session after the browser's site data
  is cleared.

## Verify

1. Open a session, type text and attach an image (and a file).
2. Switch to another session, then switch back.
3. The text and both attachments should be back. Send the message; the stored
   copy should disappear and stay gone after another session round trip.
