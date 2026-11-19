# Changelog

## 1.0.0

- Persist unsent composer images and files per session in IndexedDB.
- Restore them through the composer's own intake when the session is reopened.
- Drop the stored copy when the rail is emptied by sending or removing.
- Mark the stored copy while a submission is in flight so a session switch
  during the Host round-trip does not resurrect a sent draft.
