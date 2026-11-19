# Draft attachments

DSH stores a per-session composer draft as text, reference chips, quotes and a
command token. Images and files you attach before sending are browser-owned
draft attachments; they are released when the session scope is disposed. The
visible result is that switching to another session and back restores what you
typed but drops the attachments.

This plugin keeps unsent attachments with the session:

- Replaces the optional composer attachment rail so it can observe the
  browser-owned `File` objects.
- Stores them in IndexedDB keyed by the current session id, and removes the
  stored copy when the rail becomes empty (message sent, or every attachment
  removed).
- Re-adds the stored files through the composer's own intake path when the
  session is opened again, so limits, uploads and submit behavior stay the
  shipped code path.
- Keeps the document-level file drop route.

Scope: it restores files that were still in the composer when you left the
session. It does not change the Host session log, already-sent messages, or the
text-draft behavior. Very large drafts are capped at 24 files per session.

## Install

Install this directory as a local bundle from **Plugins → Add plugin**, or let
an agent run `plugin_manager install_bundle` with this directory.

## Limitations

- Attachments are stored per browser origin in IndexedDB; clearing site data
  removes them.
- Re-opening a session re-uploads restored files, because the Host upload
  receipts of the old draft are not reused.
