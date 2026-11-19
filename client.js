/**
 * dsh-draft-attachments — client half.
 *
 * DSH persists a per-session composer draft as text, references, quotes and a
 * command token. Browser-owned draft attachments (images and files) live only
 * in the Conversation service and are released when the session scope is
 * disposed, so switching sessions drops them while the text survives.
 *
 * This module replaces the optional `conversation.input.attachments` rail and
 * stores the unsent Files in IndexedDB under the session id, then re-adds them
 * through the composer's own intake path when the session comes back. It also
 * keeps the document-level file drop route that the shipped rail provided.
 */
window.__ModuleLoader__.load({
  id: 'dsh-draft-attachments',
  factory(require) {
    const React = require('react')
    const { Fragment, useEffect, useRef, useState } = React
    const h = React.createElement

    /* ------------------------------ storage ------------------------------ */

    const DB_NAME = 'dsh-draft-attachments'
    const STORE = 'drafts'
    const MAX_FILES = 24
    let dbPromise

    function database() {
      if (dbPromise !== undefined) return dbPromise
      dbPromise = new Promise((resolve) => {
        try {
          if (typeof indexedDB === 'undefined') { resolve(null); return }
          const request = indexedDB.open(DB_NAME, 1)
          request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
          }
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => resolve(null)
          request.onblocked = () => resolve(null)
        } catch (_error) {
          resolve(null)
        }
      })
      return dbPromise
    }

    async function writeDraft(sessionId, files, sentIntent) {
      if (sessionId === undefined || sessionId === null || files.length === 0) return
      const db = await database()
      if (db === null) return
      await new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE, 'readwrite')
          tx.objectStore(STORE).put({
            files: files.slice(0, MAX_FILES),
            sentIntent: sentIntent === true,
            updatedAt: Date.now(),
          }, sessionId)
          tx.oncomplete = () => resolve()
          tx.onerror = () => resolve()
          tx.onabort = () => resolve()
        } catch (_error) {
          resolve()
        }
      })
    }

    async function readDraft(sessionId) {
      const empty = { files: [], sentIntent: false }
      if (sessionId === undefined || sessionId === null) return empty
      const db = await database()
      if (db === null) return empty
      return await new Promise((resolve) => {
        try {
          const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(sessionId)
          request.onsuccess = () => {
            const value = request.result
            if (value === null || value === undefined || !Array.isArray(value.files)) { resolve(empty); return }
            resolve({
              files: value.files.filter(file => typeof File !== 'undefined' && file instanceof File),
              sentIntent: value.sentIntent === true,
            })
          }
          request.onerror = () => resolve(empty)
        } catch (_error) {
          resolve(empty)
        }
      })
    }

    async function removeFiles(sessionId) {
      if (sessionId === undefined || sessionId === null) return
      const db = await database()
      if (db === null) return
      await new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE, 'readwrite')
          tx.objectStore(STORE).delete(sessionId)
          tx.oncomplete = () => resolve()
          tx.onerror = () => resolve()
          tx.onabort = () => resolve()
        } catch (_error) {
          resolve()
        }
      })
    }

    /* ------------------------------- styles ------------------------------ */

    const railStyle = {
      display: 'flex',
      alignItems: 'stretch',
      gap: '10px',
      overflowX: 'auto',
      overflowY: 'hidden',
      scrollbarWidth: 'none',
      minWidth: 0,
      padding: '2px 10px 0',
      marginBottom: '-6px',
    }

    const imageWrapStyle = {
      position: 'relative',
      width: '64px',
      height: '64px',
      flex: 'none',
    }

    const thumbStyle = {
      width: '64px',
      height: '64px',
      overflow: 'hidden',
      borderRadius: '10px',
      border: '0.5px solid var(--dsw-alias-border-l2, rgba(127,127,127,.35))',
      background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.12))',
    }

    const removeStyle = {
      position: 'absolute',
      top: '4px',
      right: '4px',
      zIndex: 1,
      display: 'grid',
      placeItems: 'center',
      width: '18px',
      height: '18px',
      padding: 0,
      border: 'none',
      borderRadius: '50%',
      background: 'var(--dsw-alias-bg-overlay, #333)',
      color: 'var(--dsw-alias-label-primary, #fff)',
      fontSize: '13px',
      lineHeight: '1',
      cursor: 'pointer',
      opacity: 0.9,
    }

    const retryStyle = {
      position: 'absolute',
      right: '4px',
      bottom: '4px',
      zIndex: 1,
      display: 'grid',
      placeItems: 'center',
      width: '20px',
      height: '20px',
      padding: 0,
      border: 'none',
      borderRadius: '50%',
      background: 'var(--dsw-alias-state-error-primary, #d33)',
      color: '#fff',
      fontSize: '13px',
      lineHeight: '1',
      cursor: 'pointer',
    }

    const fileStyle = {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: '4px',
      width: '180px',
      height: '64px',
      boxSizing: 'border-box',
      padding: '8px 26px 8px 12px',
      flex: 'none',
      borderRadius: '10px',
      border: '0.5px solid var(--dsw-alias-border-l2, rgba(127,127,127,.35))',
      background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.12))',
    }

    const fileNameStyle = {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      fontSize: '12px',
      color: 'var(--dsw-alias-label-primary, inherit)',
    }

    const metaStyle = {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      fontSize: '11px',
      color: 'var(--dsw-alias-label-secondary, rgba(127,127,127,.9))',
    }

    const overlayStyle = {
      position: 'absolute',
      inset: 0,
      zIndex: 3,
      display: 'grid',
      placeItems: 'center',
      borderRadius: 'inherit',
      background: 'var(--dsw-alias-bg-overlay, rgba(0,0,0,.35))',
      color: 'var(--dsw-alias-label-primary, #fff)',
      fontSize: '13px',
      pointerEvents: 'none',
    }

    /* ----------------------------- component ----------------------------- */

    function sizeText(bytes) {
      if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return ''
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
      return (bytes / 1024 / 1024).toFixed(1) + ' MB'
    }

    function Item({ attachment, upload, onRemove, onRetry, tr }) {
      if (attachment.kind === 'image') {
        const failed = upload !== undefined && upload.status === 'error'
        return h('div', { style: imageWrapStyle },
          h('div', { style: thumbStyle },
            h('img', {
              src: attachment.previewUrl,
              alt: (attachment.file && attachment.file.name) || tr('image.label', 'Image'),
              draggable: false,
              style: { display: 'block', width: '100%', height: '100%', objectFit: 'cover', opacity: failed ? 0.45 : 1 },
            })),
          h('button', {
            type: 'button',
            title: tr('image.remove', 'Remove image'),
            'aria-label': tr('image.remove', 'Remove image'),
            onClick: () => { if (onRemove) onRemove(attachment.id) },
            onMouseDown: event => event.preventDefault(),
            style: removeStyle,
          }, '\u00d7'),
          failed
            ? h('button', {
              type: 'button',
              title: tr('file.retry', 'Retry'),
              'aria-label': tr('file.retry', 'Retry'),
              onClick: () => { if (onRetry) onRetry(attachment.id) },
              onMouseDown: event => event.preventDefault(),
              style: retryStyle,
            }, '\u21bb')
            : null,
        )
      }
      const file = attachment.file
      const status = upload === undefined || upload.status === 'uploading'
        ? tr('file.uploading', 'Uploading')
        : upload.status === 'ready'
          ? ''
          : tr('file.failed', 'Upload failed')
      const meta = [sizeText(file && file.size), status].filter(part => part !== '').join(' \u00b7 ')
      return h('div', { style: fileStyle, title: (file && file.name) || '' },
        h('div', { style: fileNameStyle }, (file && file.name) || tr('file.label', 'File')),
        h('div', { style: metaStyle }, meta),
        h('button', {
          type: 'button',
          title: tr('file.remove', 'Remove'),
          'aria-label': tr('file.remove', 'Remove'),
          onClick: () => { if (onRemove) onRemove(attachment.id) },
          onMouseDown: event => event.preventDefault(),
          style: removeStyle,
        }, '\u00d7'),
        upload !== undefined && upload.status === 'error'
          ? h('button', {
            type: 'button',
            title: tr('file.retry', 'Retry'),
            'aria-label': tr('file.retry', 'Retry'),
            onClick: () => { if (onRetry) onRetry(attachment.id) },
            onMouseDown: event => event.preventDefault(),
            style: retryStyle,
          }, '\u21bb')
          : null,
      )
    }

    function DraftAttachments(props) {
      const sessionId = props.sessionId
      const items = Array.isArray(props.attachments) ? props.attachments : []
      const uploads = props.uploads || {}
      const t = props.t
      const input = props.useInput(selector => selector)
      const phase = input === undefined ? 'plain' : input.phase
      const tr = (key, fallback) => {
        if (typeof t !== 'function') return fallback
        try {
          const value = t(key)
          return value === undefined || value === null || value === key ? fallback : value
        } catch (_error) {
          return fallback
        }
      }

      const sessionRef = useRef(sessionId)
      const itemsRef = useRef(items)
      itemsRef.current = items
      const canAcceptRef = useRef(props.canAcceptDrop)
      canAcceptRef.current = props.canAcceptDrop
      const addFilesRef = useRef(props.onAddFiles)
      addFilesRef.current = props.onAddFiles
      const restorePendingRef = useRef(true)
      const hydratedRef = useRef(false)
      const sentRef = useRef(false)
      const [dragActive, setDragActive] = useState(false)
      const dragDepth = useRef(0)

      // Persist the current rail; an empty rail after hydration means the user
      // sent the message or removed every attachment, so drop the stored draft.
      useEffect(() => {
        if (sessionId === undefined) return
        // A session switch is in flight when the ref still names the previous
        // session: the switch effect below owns saving that outgoing rail.
        if (sessionRef.current !== sessionId) return
        if (items.length === 0) {
          if (!restorePendingRef.current && hydratedRef.current) void removeFiles(sessionId)
          return
        }
        const timer = setTimeout(() => {
          void writeDraft(sessionId, items.map(item => item.file).filter(Boolean), sentRef.current)
        }, 120)
        return () => clearTimeout(timer)
      }, [items, sessionId])

      // Session change: save the outgoing rail under its own session id, then
      // re-add the incoming session's stored files through the composer intake.
      useEffect(() => {
        const previous = sessionRef.current
        if (previous !== undefined && previous !== sessionId && itemsRef.current.length > 0) {
          void writeDraft(previous, itemsRef.current.map(item => item.file).filter(Boolean), sentRef.current)
        }
        sessionRef.current = sessionId
        sentRef.current = false
        if (sessionId === undefined) return
        let cancelled = false
        restorePendingRef.current = true
        hydratedRef.current = false
        ;(async () => {
          const stored = await readDraft(sessionId)
          if (cancelled) return
          if (stored.sentIntent) {
            // The message was already being submitted when this draft was put
            // down; a successful send must not resurrect its attachments.
            await removeFiles(sessionId)
          } else if (stored.files.length > 0) {
            for (let attempt = 0; attempt < 40 && !cancelled; attempt += 1) {
              if (itemsRef.current.length > 0) break
              if (canAcceptRef.current && typeof addFilesRef.current === 'function') {
                addFilesRef.current(stored.files)
                break
              }
              await new Promise(resolve => setTimeout(resolve, 150))
            }
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          if (cancelled) return
          restorePendingRef.current = false
          hydratedRef.current = true
          if (itemsRef.current.length === 0) void removeFiles(sessionId)
        })()
        return () => { cancelled = true }
      }, [sessionId])

      // A submission freezes the composer; mark the stored copy so a session
      // switch during the Host round-trip does not restore a sent message.
      useEffect(() => {
        if (sessionId === undefined) return
        if (phase === 'sending' || phase === 'submitting') {
          if (items.length === 0) return
          sentRef.current = true
          void writeDraft(sessionId, items.map(item => item.file).filter(Boolean), true)
        } else if (phase === 'plain' && sentRef.current) {
          // The submission failed and the draft stayed; keep it restorable.
          sentRef.current = false
          if (items.length > 0) void writeDraft(sessionId, items.map(item => item.file).filter(Boolean), false)
        }
      }, [phase, sessionId, items.length])

      // Last resort for a real unmount (navigation to another panel).
      useEffect(() => {
        return () => {
          const session = sessionRef.current
          if (session !== undefined && itemsRef.current.length > 0) {
            void writeDraft(session, itemsRef.current.map(item => item.file).filter(Boolean), sentRef.current)
          }
        }
      }, [])

      // The shipped rail owned the document-level file drop route; keep it.
      useEffect(() => {
        if (!props.canAcceptDrop) return
        const hasFiles = event => {
          const transfer = event.dataTransfer
          if (transfer === null || transfer === undefined) return false
          if (transfer.types !== undefined && transfer.types !== null) {
            return Array.prototype.indexOf.call(transfer.types, 'Files') !== -1
          }
          return (transfer.files && transfer.files.length) > 0
        }
        const enter = event => {
          if (!hasFiles(event)) return
          dragDepth.current += 1
          setDragActive(true)
        }
        const over = event => {
          if (!hasFiles(event)) return
          event.preventDefault()
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
        }
        const leave = event => {
          if (!hasFiles(event)) return
          dragDepth.current = Math.max(0, dragDepth.current - 1)
          if (dragDepth.current === 0) setDragActive(false)
        }
        const drop = event => {
          if (!hasFiles(event)) return
          event.preventDefault()
          dragDepth.current = 0
          setDragActive(false)
          const files = []
          const transfer = event.dataTransfer
          if (transfer && transfer.files) {
            for (let index = 0; index < transfer.files.length; index += 1) files.push(transfer.files[index])
          }
          if (files.length > 0 && typeof addFilesRef.current === 'function') addFilesRef.current(files)
        }
        document.addEventListener('dragenter', enter)
        document.addEventListener('dragover', over)
        document.addEventListener('dragleave', leave)
        document.addEventListener('drop', drop)
        return () => {
          document.removeEventListener('dragenter', enter)
          document.removeEventListener('dragover', over)
          document.removeEventListener('dragleave', leave)
          document.removeEventListener('drop', drop)
        }
      }, [props.canAcceptDrop])

      if (items.length === 0 && !dragActive) return null

      return h(Fragment, null,
        dragActive ? h('div', { style: overlayStyle, 'data-draft-attachments': 'overlay' }, tr('drop', 'Drop files to attach')) : null,
        items.length > 0
          ? h('div', { style: railStyle, 'data-draft-attachments': 'rail', 'data-draft-attachments-count': String(items.length) }, items.map(item => h(Item, {
            key: item.id,
            attachment: item,
            upload: uploads[item.id],
            onRemove: props.onRemoveAttachment,
            onRetry: props.onRetryFile,
            tr,
          })))
          : null,
      )
    }

    /* ------------------------------ plugin ------------------------------- */

    const EN = {
      'image.label': 'Image',
      'image.remove': 'Remove image',
      'file.label': 'File',
      'file.remove': 'Remove',
      'file.retry': 'Retry',
      'file.uploading': 'Uploading',
      'file.failed': 'Upload failed',
      'drop': 'Drop files to attach',
    }

    const ZH = {
      'image.label': '图片',
      'image.remove': '移除图片',
      'file.label': '文件',
      'file.remove': '移除',
      'file.retry': '重试',
      'file.uploading': '上传中',
      'file.failed': '上传失败',
      'drop': '拖入文件以添加附件',
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.locale.register('draft-attachments', 'en', EN)
        ctx.locale.register('draft-attachments', 'zh', ZH)
        ctx.slots.inject('conversation.input.attachments', () => ctx.slots.register({
          name: 'conversation.input.attachments',
          priority: -100,
          locale: 'draft-attachments',
        }, DraftAttachments))
      },
    }
  },
})
